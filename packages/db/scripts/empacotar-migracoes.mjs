// Empacota as migrações SQL geradas pelo drizzle-kit num módulo TS, para que
// navegador, Tauri e Expo as apliquem sem acesso ao sistema de arquivos.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pasta = new URL('../drizzle/', import.meta.url);
const arquivos = readdirSync(pasta)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const migracoes = arquivos.map((f) => ({
  id: f.replace(/\.sql$/, ''),
  sql: readFileSync(join(pasta.pathname.replace(/^\/([A-Za-z]:)/, '$1'), f), 'utf8'),
}));

const saida =
  '// Gerado por scripts/empacotar-migracoes.mjs — não edite à mão.\n' +
  `export const MIGRACOES: ReadonlyArray<{ id: string; sql: string }> = ${JSON.stringify(migracoes, null, 2)};\n`;

writeFileSync(new URL('../src/migracoes.generated.ts', import.meta.url), saida);
console.info(`${migracoes.length} migração(ões) empacotada(s).`);
