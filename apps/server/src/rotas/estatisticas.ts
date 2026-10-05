import { montarPacotes } from '@akademos/registry';
import { lerInstituicoes } from '@akademos/registry/node';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { BancoServidor } from '../db';
import { contribuicao } from '../db/schema';
import { agregar, generalizarNota } from '../estatisticas';

const Contribuicao = z.object({
  id: z.string().uuid(),
  segredo: z.string().min(16).max(128),
  matrizId: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+\/\d{4}$/),
  notas: z
    .record(z.string().regex(/^[A-Z0-9][A-Z0-9._-]*$/), z.number().min(0).max(10))
    .refine(
      (n) => Object.keys(n).length > 0 && Object.keys(n).length <= 300,
      'entre 1 e 300 notas',
    ),
});

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function confere(segredo: string, esperado: string): boolean {
  const a = Buffer.from(hash(segredo));
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Nota de aprovação de cada matriz, normalizada para 0–10, a partir do registro. */
function aprovacoesDoRegistro(): Map<string, number> {
  const m = new Map<string, number>();
  for (const arq of lerInstituicoes()) {
    for (const { pacote } of montarPacotes(arq).entradas) {
      const e = pacote.escala;
      m.set(pacote.matriz.id, ((e.aprovacao - e.min) / (e.max - e.min)) * 10);
    }
  }
  return m;
}

/**
 * Comunidade (opt-in): recebe contribuições sem vínculo com conta e publica
 * só agregados com k ≥ k mínimo. Sem autenticação de propósito: a
 * contribuição não deve ser ligável a uma pessoa.
 */
export function rotasEstatisticas(
  db: BancoServidor,
  opcoes: { k: number; epsilon: number; aleatorio?: () => number },
) {
  const aprovacoes = aprovacoesDoRegistro();
  const cache = new Map<string, { em: number; corpo: unknown }>();
  const app = new Hono();

  app.post('/contribuicao', async (c) => {
    const r = Contribuicao.safeParse(await c.req.json().catch(() => null));
    if (!r.success) return c.json({ erro: 'corpo-invalido', detalhes: r.error.issues }, 400);
    const { id, segredo, matrizId, notas } = r.data;
    if (!aprovacoes.has(matrizId)) return c.json({ erro: 'matriz-desconhecida' }, 400);
    const [existente] = await db.select().from(contribuicao).where(eq(contribuicao.id, id));
    if (existente && !confere(segredo, existente.segredoHash))
      return c.json({ erro: 'segredo-invalido' }, 403);
    const generalizadas = Object.fromEntries(
      Object.entries(notas).map(([k, v]) => [k, generalizarNota(v)]),
    );
    const valores = { matrizId, notas: generalizadas, updatedAt: new Date() };
    await db
      .insert(contribuicao)
      .values({ id, segredoHash: hash(segredo), ...valores })
      .onConflictDoUpdate({ target: contribuicao.id, set: valores });
    cache.delete(matrizId);
    return c.json({ ok: true }, existente ? 200 : 201);
  });

  app.delete('/contribuicao/:id', async (c) => {
    const segredo = c.req.header('x-segredo') ?? '';
    const [existente] = await db
      .select()
      .from(contribuicao)
      .where(eq(contribuicao.id, c.req.param('id')));
    if (!existente) return c.body(null, 204);
    if (!confere(segredo, existente.segredoHash)) return c.json({ erro: 'segredo-invalido' }, 403);
    await db.delete(contribuicao).where(eq(contribuicao.id, existente.id));
    cache.delete(existente.matrizId);
    return c.body(null, 204);
  });

  app.get('/:sigla/:curso/:ano', async (c) => {
    const matrizId = `${c.req.param('sigla')}/${c.req.param('curso')}/${c.req.param('ano')}`;
    const aprovacao10 = aprovacoes.get(matrizId);
    if (aprovacao10 === undefined) return c.json({ erro: 'matriz-desconhecida' }, 404);
    // Recalcula no máximo a cada 10 min: o ruído não deve ser reamostrado a cada
    // pedido (médias repetidas anulariam a privacidade diferencial).
    const guardado = cache.get(matrizId);
    if (guardado && Date.now() - guardado.em < 10 * 60_000) return c.json(guardado.corpo);
    const linhas = await db
      .select({ notas: contribuicao.notas })
      .from(contribuicao)
      .where(eq(contribuicao.matrizId, matrizId));
    const corpo = agregar(
      matrizId,
      linhas.map((l) => l.notas),
      {
        k: opcoes.k,
        epsilon: opcoes.epsilon,
        aprovacao10,
        ...(opcoes.aleatorio ? { aleatorio: opcoes.aleatorio } : {}),
      },
    );
    cache.set(matrizId, { em: Date.now(), corpo });
    c.header('Cache-Control', 'public, max-age=600');
    return c.json(corpo);
  });

  return app;
}
