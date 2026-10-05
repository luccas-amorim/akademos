import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
  ],
  server: { port: 5173 },
});
