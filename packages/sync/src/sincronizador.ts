import { cifrar, decifrar, deBase64, paraBase64 } from './cripto';

/** Uma escrita numa célula (mesmo formato de `@akademos/db`). */
export interface OpSync {
  hlc: string;
  tabela: string;
  linhaId: string;
  coluna: string;
  valor: unknown;
}

/** O que o sincronizador precisa do banco local (implementado em `@akademos/db`). */
export interface LogLocal {
  locaisDesde(cursor: string | null): Promise<OpSync[]>;
  aplicarRemotas(ops: readonly OpSync[]): Promise<number>;
  lerMeta(chave: string): Promise<string | null>;
  gravarMeta(chave: string, valor: string): Promise<void>;
}

/** O que o sincronizador precisa do relay (implementado em `ClienteRelay`). */
export interface Relay {
  push(dispositivo: string, blobs: string[]): Promise<number>;
  pull(
    desde: number,
    dispositivo: string,
  ): Promise<{
    blobs: Array<{ id: number; conteudo: string }>;
    cursor: number;
    temMais: boolean;
  }>;
}

export interface ResultadoSync {
  enviadas: number;
  recebidas: number;
  quando: string;
}

const OPS_POR_LOTE = 500;
const META_CURSOR_REMOTO = 'sync:cursor-remoto';
const META_CURSOR_LOCAL = 'sync:cursor-local';
const VERSAO_LOTE = 1;

interface Lote {
  v: number;
  ops: OpSync[];
}

export async function cifrarLote(chave: Uint8Array, ops: OpSync[]): Promise<string> {
  const json = JSON.stringify({ v: VERSAO_LOTE, ops } satisfies Lote);
  return paraBase64(await cifrar(chave, new TextEncoder().encode(json)));
}

export async function decifrarLote(chave: Uint8Array, blob: string): Promise<OpSync[]> {
  const json = new TextDecoder().decode(await decifrar(chave, await deBase64(blob)));
  const lote = JSON.parse(json) as Lote;
  if (lote.v !== VERSAO_LOTE) throw new Error(`Versão de lote desconhecida: ${lote.v}`);
  return lote.ops;
}

/**
 * Uma rodada de sincronização: primeiro recebe (para o relógio local avançar),
 * depois envia o que ainda não foi enviado. Idempotente: repetir não duplica
 * nada, porque ops são identificadas por (tabela, linha, coluna, hlc).
 */
export async function sincronizar(
  log: LogLocal,
  relay: Relay,
  chave: Uint8Array,
  dispositivo: string,
  agora: () => Date = () => new Date(),
): Promise<ResultadoSync> {
  let recebidas = 0;
  let cursor = Number((await log.lerMeta(META_CURSOR_REMOTO)) ?? 0);
  for (;;) {
    const r = await relay.pull(cursor, dispositivo);
    for (const b of r.blobs) {
      const ops = await decifrarLote(chave, b.conteudo);
      recebidas += ops.length;
      await log.aplicarRemotas(ops);
    }
    cursor = r.cursor;
    await log.gravarMeta(META_CURSOR_REMOTO, String(cursor));
    if (!r.temMais) break;
  }

  const desde = await log.lerMeta(META_CURSOR_LOCAL);
  const pendentes = await log.locaisDesde(desde);
  for (let i = 0; i < pendentes.length; i += OPS_POR_LOTE) {
    const lote = pendentes.slice(i, i + OPS_POR_LOTE);
    await relay.push(dispositivo, [await cifrarLote(chave, lote)]);
    // Avança o cursor lote a lote: uma falha no meio não reenvia o que já foi.
    await log.gravarMeta(META_CURSOR_LOCAL, lote.at(-1)!.hlc);
  }

  const quando = agora().toISOString();
  await log.gravarMeta('sync:ultima', quando);
  return { enviadas: pendentes.length, recebidas, quando };
}
