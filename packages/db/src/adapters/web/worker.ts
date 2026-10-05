/// <reference lib="webworker" />
/**
 * Worker que hospeda o SQLite (wa-sqlite). Preferência de armazenamento:
 *  1. OPFS com AccessHandlePoolVFS: síncrono, rápido e sem exigir COOP/COEP
 *     (o GitHub Pages não permite configurar esses cabeçalhos);
 *  2. IndexedDB com IDBBatchAtomicVFS, para navegadores sem OPFS em workers;
 *  3. memória, como último recurso (ex.: janela privada sem armazenamento).
 */
import * as SQLite from 'wa-sqlite';
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import wasmUrl from 'wa-sqlite/dist/wa-sqlite.wasm?url';
import wasmAsyncUrl from 'wa-sqlite/dist/wa-sqlite-async.wasm?url';
import type { Armazenamento, Pedido, Resposta } from './protocolo';

declare const self: DedicatedWorkerGlobalScope;

type Api = ReturnType<typeof SQLite.Factory>;
let sqlite3: Api | null = null;
let db: number | null = null;

class ErroOutraAba extends Error {
  readonly codigo = 'outra-aba' as const;
}

function temOpfsSincrono(): boolean {
  return (
    typeof navigator.storage?.getDirectory === 'function' &&
    typeof FileSystemFileHandle !== 'undefined' &&
    'createSyncAccessHandle' in FileSystemFileHandle.prototype
  );
}

async function abrirOpfs(nome: string): Promise<boolean> {
  if (!temOpfsSincrono()) return false;
  const { AccessHandlePoolVFS } = await import('wa-sqlite/src/examples/AccessHandlePoolVFS.js');
  const api = SQLite.Factory(await SQLiteESMFactory({ locateFile: () => wasmUrl }));
  const vfs = new AccessHandlePoolVFS(`/akademos-${nome}`);
  try {
    await vfs.isReady;
  } catch (e) {
    // createSyncAccessHandle falha quando outra aba já tem o arquivo aberto.
    throw new ErroOutraAba('O Akademos já está aberto em outra aba deste navegador.', {
      cause: e,
    });
  }
  api.vfs_register(vfs as never, true);
  sqlite3 = api;
  db = await api.open_v2(`${nome}.db`);
  return true;
}

async function abrirIndexedDb(nome: string): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  const { IDBBatchAtomicVFS } = await import('wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
  const api = SQLite.Factory(await SQLiteAsyncESMFactory({ locateFile: () => wasmAsyncUrl }));
  api.vfs_register(new IDBBatchAtomicVFS(`akademos-${nome}`) as never, true);
  sqlite3 = api;
  db = await api.open_v2(`${nome}.db`);
  return true;
}

async function abrirMemoria(): Promise<void> {
  sqlite3 = SQLite.Factory(await SQLiteESMFactory({ locateFile: () => wasmUrl }));
  db = await sqlite3.open_v2(':memory:');
}

async function abrir(nome: string): Promise<Armazenamento> {
  if (await abrirOpfs(nome)) return 'opfs';
  try {
    if (await abrirIndexedDb(nome)) return 'indexeddb';
  } catch (e) {
    console.warn('IndexedDB indisponível; usando memória.', e);
  }
  await abrirMemoria();
  return 'memoria';
}

function conexao(): { api: Api; db: number } {
  if (!sqlite3 || db === null) throw new Error('Banco não foi aberto.');
  return { api: sqlite3, db };
}

function normalizar(v: unknown): SQLiteCompatibleType {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'bigint') return v;
  if (v instanceof Uint8Array) return v;
  return JSON.stringify(v);
}

async function query(sql: string, params: unknown[]): Promise<unknown[][]> {
  const { api, db } = conexao();
  const linhas: unknown[][] = [];
  for await (const stmt of api.statements(db, sql)) {
    if (params.length) api.bind_collection(stmt, params.map(normalizar));
    while ((await api.step(stmt)) === SQLite.SQLITE_ROW) linhas.push(api.row(stmt));
  }
  return linhas;
}

async function tratar(p: Pedido): Promise<Resposta> {
  switch (p.tipo) {
    case 'abrir':
      return { id: p.id, ok: true, armazenamento: await abrir(p.nome) };
    case 'exec': {
      const { api, db } = conexao();
      await api.exec(db, p.sql);
      return { id: p.id, ok: true };
    }
    case 'query':
      return { id: p.id, ok: true, linhas: await query(p.sql, p.params) };
    case 'fechar':
      if (sqlite3 && db !== null) await sqlite3.close(db);
      db = null;
      return { id: p.id, ok: true };
  }
}

// Um pedido por vez, na ordem de chegada.
let fila = Promise.resolve();
self.onmessage = (ev: MessageEvent<Pedido>) => {
  const p = ev.data;
  fila = fila.then(async () => {
    try {
      self.postMessage(await tratar(p));
    } catch (e) {
      const resposta: Resposta = {
        id: p.id,
        ok: false,
        erro: e instanceof Error ? e.message : String(e),
        ...(e instanceof ErroOutraAba ? { codigo: e.codigo } : {}),
      };
      self.postMessage(resposta);
    }
  });
};
