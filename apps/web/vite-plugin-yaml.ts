import type { Plugin } from 'vite';
import { parse } from 'yaml';

/** Importa arquivos .yaml como módulos JSON (usado para o registro). */
export function yaml(): Plugin {
  return {
    name: 'akademos-yaml',
    transform(codigo, id) {
      if (!id.endsWith('.yaml')) return null;
      return { code: `export default ${JSON.stringify(parse(codigo))};`, map: null };
    },
  };
}
