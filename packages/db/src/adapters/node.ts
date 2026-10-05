import { DatabaseSync } from 'node:sqlite';
import type { SqlDriver } from '../driver';

/**
 * Driver sobre `node:sqlite` (embutido no Node ≥ 22). Usado em testes, scripts
 * e no seed de desenvolvimento.
 */
export function criarDriverNode(caminho = ':memory:'): SqlDriver {
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA foreign_keys = ON');
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async query(sql, params) {
      const stmt = db.prepare(sql);
      if (stmt.columns().length === 0) {
        stmt.run(...(params as never[]));
        return [];
      }
      stmt.setReturnArrays(true);
      return stmt.all(...(params as never[])) as unknown as unknown[][];
    },
    async close() {
      db.close();
    },
  };
}
