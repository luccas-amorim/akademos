/** Gera registry/schema/*.schema.json a partir dos schemas Zod. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { RAIZ_REGISTRO } from '../node';
import { SCHEMAS } from '../schema';

const destino = join(RAIZ_REGISTRO, 'schema');
mkdirSync(destino, { recursive: true });
for (const [nome, schema] of Object.entries(SCHEMAS)) {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  writeFileSync(join(destino, `${nome}.schema.json`), JSON.stringify(json, null, 2) + '\n');
  console.info(`schema/${nome}.schema.json`);
}
