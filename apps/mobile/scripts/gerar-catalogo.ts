/**
 * Gera src/dados/catalogo.generated.json a partir do registro (o Metro não lê
 * YAML). Inclui os agregados de demonstração das instituições fictícias.
 * Uso: pnpm --filter @akademos/mobile catalogo
 */
import { montarPacotes } from '@akademos/registry';
import { lerInstituicoes } from '@akademos/registry/node';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const entradas = lerInstituicoes().flatMap((arq) => montarPacotes(arq).entradas);
const pastaDemo = new URL('../../web/src/dados/demo/', import.meta.url);
const demonstracao = readdirSync(pastaDemo)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, pastaDemo), 'utf8')) as unknown);

writeFileSync(
  new URL('../src/dados/catalogo.generated.json', import.meta.url),
  JSON.stringify({ entradas, demonstracao }, null, 1) + '\n',
);
console.info(`${entradas.length} matriz(es) no catálogo do app móvel.`);
