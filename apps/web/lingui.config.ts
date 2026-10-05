import { defineConfig } from '@lingui/cli';

export default defineConfig({
  sourceLocale: 'pt-BR',
  locales: ['pt-BR'],
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}/messages',
      include: ['<rootDir>/src'],
    },
  ],
});
