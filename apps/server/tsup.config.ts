import { defineConfig } from 'tsup';

// Os pacotes do monorepo são TypeScript sem build próprio: entram no bundle.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@akademos\//],
});
