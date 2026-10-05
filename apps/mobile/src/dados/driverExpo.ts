import type { SqlDriver } from '@akademos/db';
import { openDatabaseAsync, type SQLiteBindValue } from 'expo-sqlite';

/**
 * SQLite nativo do celular (expo-sqlite), no mesmo contrato dos outros
 * adaptadores. Conexão única: as transações de packages/db funcionam como no
 * navegador. (Fica no app para que packages/db não dependa de React Native.)
 */
export async function criarDriverExpo(nome = 'akademos.db'): Promise<SqlDriver> {
  const db = await openDatabaseAsync(nome);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const normalizar = (v: unknown): SQLiteBindValue => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number' || typeof v === 'string' || v instanceof Uint8Array) return v;
    return JSON.stringify(v);
  };
  return {
    exec: (sql) => db.execAsync(sql),
    async query(sql, params) {
      const stmt = await db.prepareAsync(sql);
      try {
        const r = await stmt.executeForRawResultAsync<Record<string, unknown>>(
          params.map(normalizar),
        );
        return (await r.getAllAsync()) as unknown[][];
      } finally {
        await stmt.finalizeAsync();
      }
    },
    close: () => db.closeAsync(),
  };
}
