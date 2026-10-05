import sodium from 'libsodium-wrappers-sumo';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  cifrar,
  conferirVerificador,
  criarVerificador,
  decifrar,
  derivarChave,
  fraseValida,
  gerarFrase,
  gerarSal,
  normalizarFrase,
  type ParametrosDerivacao,
} from './cripto';
import { decifrarLote, sincronizar, type LogLocal, type OpSync, type Relay } from './sincronizador';

let rapido: ParametrosDerivacao;
beforeAll(async () => {
  await sodium.ready;
  // Parâmetros mínimos só nos testes; o app usa o perfil interativo (64 MiB).
  rapido = {
    opslimit: sodium.crypto_pwhash_OPSLIMIT_MIN,
    memlimit: sodium.crypto_pwhash_MEMLIMIT_MIN,
  };
});

describe('frase de recuperação', () => {
  it('tem 12 palavras da lista em português e é validada', () => {
    const f = gerarFrase();
    expect(f.split(' ')).toHaveLength(12);
    expect(fraseValida(f)).toBe(true);
    expect(fraseValida(`  ${f.toUpperCase()}  `)).toBe(true);
    expect(fraseValida(f.split(' ').reverse().join(' '))).toBe(false);
    expect(fraseValida('uma frase qualquer')).toBe(false);
  });

  it('normaliza espaços e caixa', () => {
    expect(normalizarFrase('  Abacate   ABRIR ')).toBe('abacate abrir');
  });
});

describe('cifra', () => {
  it('a mesma frase e sal dão a mesma chave; outra frase não', async () => {
    const f = gerarFrase();
    const sal = await gerarSal();
    const k1 = await derivarChave(f, sal, rapido);
    const k2 = await derivarChave(f, sal, rapido);
    const k3 = await derivarChave(gerarFrase(), sal, rapido);
    expect(k1).toEqual(k2);
    expect(k1).not.toEqual(k3);
    expect(k1).toHaveLength(32);
  });

  it('cifra e decifra; recusa chave errada e conteúdo adulterado', async () => {
    const sal = await gerarSal();
    const k = await derivarChave(gerarFrase(), sal, rapido);
    const outra = await derivarChave(gerarFrase(), sal, rapido);
    const texto = new TextEncoder().encode('nota 7,8 em Cálculo I');
    const pacote = await cifrar(k, texto);
    expect(new TextDecoder().decode(await decifrar(k, pacote))).toBe('nota 7,8 em Cálculo I');
    await expect(decifrar(outra, pacote)).rejects.toThrow();
    const adulterado = pacote.slice();
    adulterado[adulterado.length - 1]! ^= 1;
    await expect(decifrar(k, adulterado)).rejects.toThrow();
    // Nonce aleatório: cifrar duas vezes não repete o texto cifrado.
    expect(await cifrar(k, texto)).not.toEqual(pacote);
  });

  it('o verificador confirma a frase sem revelar nada', async () => {
    const f = gerarFrase();
    const sal = await gerarSal();
    const k = await derivarChave(f, sal, rapido);
    const v = await criarVerificador(k);
    expect(await conferirVerificador(k, v)).toBe(true);
    expect(await conferirVerificador(await derivarChave(gerarFrase(), sal, rapido), v)).toBe(false);
  });
});

/** Banco de mentira e relay em memória para testar o protocolo. */
function logEmMemoria(locais: OpSync[]): LogLocal & { recebidas: OpSync[] } {
  const meta = new Map<string, string>();
  const recebidas: OpSync[] = [];
  return {
    recebidas,
    async locaisDesde(c) {
      return locais.filter((o) => !c || o.hlc > c);
    },
    async aplicarRemotas(ops) {
      recebidas.push(...ops);
      return ops.length;
    },
    async lerMeta(k) {
      return meta.get(k) ?? null;
    },
    async gravarMeta(k, v) {
      meta.set(k, v);
    },
  };
}

function relayEmMemoria(): Relay & {
  blobs: Array<{ id: number; dispositivo: string; conteudo: string }>;
} {
  const blobs: Array<{ id: number; dispositivo: string; conteudo: string }> = [];
  return {
    blobs,
    async push(dispositivo, novos) {
      for (const conteudo of novos) blobs.push({ id: blobs.length + 1, dispositivo, conteudo });
      return blobs.length;
    },
    async pull(desde, dispositivo) {
      return {
        blobs: blobs.filter((b) => b.id > desde && b.dispositivo !== dispositivo),
        cursor: blobs.length,
        temMais: false,
      };
    },
  };
}

const op = (hlc: string, valor: unknown): OpSync => ({
  hlc,
  tabela: 'cursada',
  linhaId: 'c1',
  coluna: 'nota',
  valor,
});

describe('sincronizar', () => {
  it('envia só o que falta, cifrado, e recebe o do outro aparelho', async () => {
    const k = await derivarChave(gerarFrase(), await gerarSal(), rapido);
    const relay = relayEmMemoria();
    const a = logEmMemoria([op('0001', 7), op('0002', 8)]);
    const b = logEmMemoria([op('0003', 9)]);

    expect(await sincronizar(a, relay, k, 'a')).toMatchObject({ enviadas: 2, recebidas: 0 });
    expect(relay.blobs[0]!.conteudo).not.toContain('cursada'); // opaco para o servidor
    expect(await decifrarLote(k, relay.blobs[0]!.conteudo)).toHaveLength(2);

    expect(await sincronizar(b, relay, k, 'b')).toMatchObject({ enviadas: 1, recebidas: 2 });
    expect(await sincronizar(a, relay, k, 'a')).toMatchObject({ enviadas: 0, recebidas: 1 });
    expect(a.recebidas.map((o) => o.valor)).toEqual([9]);
    // Repetir não reenvia nem rerecebe.
    expect(await sincronizar(a, relay, k, 'a')).toMatchObject({ enviadas: 0, recebidas: 0 });
  });

  it('quebra envios grandes em vários lotes', async () => {
    const k = await derivarChave(gerarFrase(), await gerarSal(), rapido);
    const relay = relayEmMemoria();
    const muitos = Array.from({ length: 1201 }, (_, i) => op(String(i).padStart(6, '0'), i));
    await sincronizar(logEmMemoria(muitos), relay, k, 'a');
    expect(relay.blobs).toHaveLength(3);
  });
});
