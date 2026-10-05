import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
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
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Akademos',
        short_name: 'Akademos',
        description:
          'Seu percurso acadêmico, do primeiro semestre à formatura. Local primeiro, código aberto.',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#1e3a8a',
        background_color: '#f6f5f1',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Offline completo: código, wasm do SQLite, worker do pdf.js e fontes latinas.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,wasm,mjs}'],
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // O wa-sqlite carrega o próprio .wasm; o pré-empacotamento quebraria o caminho.
  optimizeDeps: { exclude: ['wa-sqlite'] },
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true },
  server: { port: 5173, fs: { allow: ['../..'] } },
});
