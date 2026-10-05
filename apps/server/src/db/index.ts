import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import * as schema from './schema';

export type BancoServidor = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface ConexaoBanco {
  db: BancoServidor;
  fechar(): Promise<void>;
}

/** Acha a pasta drizzle/ subindo a partir deste módulo (src/ ou dist/). */
function pastaDeMigracoes(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const candidata = join(dir, 'drizzle');
    if (existsSync(join(candidata, 'meta'))) return candidata;
    dir = dirname(dir);
  }
  throw new Error('Pasta de migrações drizzle/ não encontrada');
}

/**
 * Abre o banco e aplica as migrações.
 * - `postgres://…` → Postgres (produção, Docker Compose);
 * - `pglite:memoria` ou `pglite:./caminho` → PGlite embutido (testes, desenvolvimento).
 */
export async function abrirBancoServidor(url: string): Promise<ConexaoBanco> {
  const migrationsFolder = process.env.AKADEMOS_MIGRACOES ?? pastaDeMigracoes();
  if (url.startsWith('pglite:')) {
    const caminho = url.slice('pglite:'.length);
    if (caminho !== 'memoria') mkdirSync(caminho, { recursive: true });
    const cliente = new PGlite(caminho === 'memoria' ? undefined : caminho);
    const db = drizzlePglite(cliente, { schema });
    await migratePglite(db, { migrationsFolder });
    return { db: db as unknown as BancoServidor, fechar: () => cliente.close() };
  }
  const cliente = postgres(url, { max: 10 });
  const db = drizzlePostgres(cliente, { schema });
  await migratePostgres(db, { migrationsFolder });
  return { db: db as unknown as BancoServidor, fechar: () => cliente.end() };
}
