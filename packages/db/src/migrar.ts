import type { SqlDriver } from './driver';
import { MIGRACOES } from './migracoes.generated';

const SEPARADOR = '--> statement-breakpoint';

/**
 * Aplica as migrações pendentes, em ordem, cada uma numa transação.
 * Registra o que já rodou em `_migracoes`.
 */
export async function migrar(
  driver: SqlDriver,
  migracoes: ReadonlyArray<{ id: string; sql: string }> = MIGRACOES,
): Promise<string[]> {
  await driver.exec(
    'CREATE TABLE IF NOT EXISTS _migracoes (id TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)',
  );
  const feitas = new Set(
    (await driver.query('SELECT id FROM _migracoes', [])).map((linha) => String(linha[0])),
  );
  const aplicadas: string[] = [];
  for (const m of migracoes) {
    if (feitas.has(m.id)) continue;
    await driver.exec('BEGIN');
    try {
      for (const instrucao of m.sql.split(SEPARADOR)) {
        if (instrucao.trim()) await driver.exec(instrucao);
      }
      await driver.query('INSERT INTO _migracoes (id, aplicada_em) VALUES (?, ?)', [
        m.id,
        new Date().toISOString(),
      ]);
      await driver.exec('COMMIT');
      aplicadas.push(m.id);
    } catch (erro) {
      await driver.exec('ROLLBACK');
      throw new Error(`Falha ao aplicar a migração ${m.id}`, { cause: erro });
    }
  }
  return aplicadas;
}
