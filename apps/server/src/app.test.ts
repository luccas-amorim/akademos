import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from './app';
import { criarAuth } from './auth';
import { abrirBancoServidor, type ConexaoBanco } from './db';
import { lerEnv } from './env';

const env = lerEnv({ DATABASE_URL: 'pglite:memoria', COTA_SYNC: '2000' });
let conexao: ConexaoBanco;
let app: ReturnType<typeof criarApp>;

beforeAll(async () => {
  conexao = await abrirBancoServidor(env.DATABASE_URL);
  app = criarApp({ db: conexao.db, auth: criarAuth(conexao.db, env), env, silencioso: true });
}, 60_000);

afterAll(() => conexao.fechar());

const json = (corpo: unknown, token?: string): RequestInit => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: 'http://localhost:5173',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(corpo),
});

async function criarConta(email: string): Promise<string> {
  const r = await app.request(
    '/api/auth/sign-up/email',
    json({ email, password: 'senha-forte-123', name: 'Teste' }),
  );
  expect(r.status).toBe(200);
  const token = r.headers.get('set-auth-token');
  expect(token).toBeTruthy();
  return token!;
}

const b64 = (s: string) => Buffer.from(s).toString('base64');

describe('API', () => {
  it('responde à verificação de saúde', async () => {
    expect(await (await app.request('/saude')).json()).toEqual({ ok: true });
  });

  it('exige sessão nas rotas de sincronização', async () => {
    expect((await app.request('/sync/pull')).status).toBe(401);
  });

  it('guarda e devolve blobs opacos por conta, com cursor', async () => {
    const token = await criarConta('ana@exemplo.com');
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const p1 = await app.request(
      '/sync/push',
      json({ dispositivo: 'aparelho-a', blobs: [b64('um'), b64('dois')] }, token),
    );
    expect(p1.status).toBe(201);
    const p2 = await app.request(
      '/sync/push',
      json({ dispositivo: 'aparelho-b', blobs: [b64('tres')] }, token),
    );
    const { cursor } = (await p2.json()) as { cursor: number };

    const tudo = (await (await app.request('/sync/pull?desde=0', auth)).json()) as {
      blobs: Array<{ id: number; conteudo: string }>;
      cursor: number;
    };
    expect(tudo.blobs.map((b) => Buffer.from(b.conteudo, 'base64').toString())).toEqual([
      'um',
      'dois',
      'tres',
    ]);
    expect(tudo.cursor).toBe(cursor);

    // O aparelho A não precisa reler o que enviou, mas o cursor avança.
    const deA = (await (
      await app.request('/sync/pull?desde=0&dispositivo=aparelho-a', auth)
    ).json()) as {
      blobs: Array<{ conteudo: string }>;
      cursor: number;
    };
    expect(deA.blobs.map((b) => Buffer.from(b.conteudo, 'base64').toString())).toEqual(['tres']);
    expect(deA.cursor).toBe(cursor);

    const nada = (await (await app.request(`/sync/pull?desde=${cursor}`, auth)).json()) as {
      blobs: unknown[];
    };
    expect(nada.blobs).toEqual([]);
  });

  it('isola as contas', async () => {
    const t1 = await criarConta('bia@exemplo.com');
    const t2 = await criarConta('caio@exemplo.com');
    await app.request(
      '/sync/push',
      json({ dispositivo: 'x-1234', blobs: [b64('segredo da bia')] }, t1),
    );
    const r = (await (
      await app.request('/sync/pull', { headers: { Authorization: `Bearer ${t2}` } })
    ).json()) as {
      blobs: unknown[];
    };
    expect(r.blobs).toEqual([]);
  });

  it('respeita a cota e recusa conteúdo que não é base64', async () => {
    const token = await criarConta('duda@exemplo.com');
    const grande = Buffer.alloc(3000, 1).toString('base64');
    expect(
      (await app.request('/sync/push', json({ dispositivo: 'x-1234', blobs: [grande] }, token)))
        .status,
    ).toBe(413);
    expect(
      (
        await app.request(
          '/sync/push',
          json({ dispositivo: 'x-1234', blobs: ['não é base64!'] }, token),
        )
      ).status,
    ).toBe(400);
  });

  it('registra a chave uma vez e apaga a conta em cascata', async () => {
    const token = await criarConta('eva@exemplo.com');
    const put = (corpo: unknown) =>
      app.request('/sync/chave', { ...json(corpo, token), method: 'PUT' });
    expect((await put({ sal: b64('sal-sal-sal-sal!'), verificador: b64('v') })).status).toBe(201);
    expect((await put({ sal: b64('outro'), verificador: b64('w') })).status).toBe(409);
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    expect(await (await app.request('/sync/chave', auth)).json()).toEqual({
      sal: b64('sal-sal-sal-sal!'),
      verificador: b64('v'),
    });

    const del = await app.request('/conta', { method: 'DELETE', ...auth });
    expect(del.status).toBe(204);
    expect((await app.request('/sync/chave', auth)).status).toBe(401);
  });

  it('serve o espelho do registro', async () => {
    const r = (await (await app.request('/registry')).json()) as {
      matrizes: Array<{ id: string }>;
    };
    expect(r.matrizes.map((m) => m.id)).toContain('ufx/eng-computacao/2019');
  });
});

describe('estatísticas da comunidade', () => {
  const contribuir = (
    i: number,
    notas: Record<string, number>,
    segredo = `segredo-${i}-0123456789`,
  ) =>
    app.request(
      '/stats/contribuicao',
      json({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        segredo,
        matrizId: 'ufx/eng-computacao/2019',
        notas,
      }),
    );

  it('não publica nada abaixo de k = 10', async () => {
    for (let i = 0; i < 9; i++) await contribuir(i, { EX301: 5 + i * 0.4, EX404: 4.5 + i * 0.45 });
    const r = (await (await app.request('/stats/ufx/eng-computacao/2019')).json()) as {
      disciplinas: Record<string, unknown>;
      correlacoes: unknown[];
    };
    expect(r.disciplinas).toEqual({});
    expect(r.correlacoes).toEqual([]);
  });

  it('só o dono do segredo substitui ou apaga a contribuição', async () => {
    expect((await contribuir(0, { EX301: 9 }, 'outro-segredo-qualquer-123')).status).toBe(403);
    const apagar = await app.request('/stats/contribuicao/00000000-0000-4000-8000-000000000000', {
      method: 'DELETE',
      headers: { 'x-segredo': 'errado-errado-errado' },
    });
    expect(apagar.status).toBe(403);
  });

  it('recusa matriz fora do registro', async () => {
    const r = await app.request(
      '/stats/contribuicao',
      json({
        id: crypto.randomUUID(),
        segredo: 'x'.repeat(20),
        matrizId: 'xyz/abc/2020',
        notas: { EX1: 5 },
      }),
    );
    expect(r.status).toBe(400);
  });
});
