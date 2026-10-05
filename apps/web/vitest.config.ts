import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), lingui({ macroTransform: { macro: { descriptorFields: 'message' } } })],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    passWithNoTests: true,
  },
});
