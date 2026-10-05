import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { yaml } from './vite-plugin-yaml';

// No GitHub Pages o app vive em /akademos/; localmente, na raiz.
const base = process.env.AKADEMOS_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    lingui({
      // As mensagens-fonte já estão em pt-BR: mantê-las no bundle evita que a
      // UI dependa de um catálogo extraído para exibir texto.
      macroTransform: { macro: { descriptorFields: 'message' } },
    }),
    yaml(),
  ],
  // O wa-sqlite carrega o próprio .wasm; o pré-empacotamento quebraria o caminho.
  optimizeDeps: { exclude: ['wa-sqlite'] },
  worker: { format: 'es' },
  server: { port: 5173, fs: { allow: ['../..'] } },
});
