// GitHub Pages não sabe de rotas do lado do cliente: servir o index.html como
// 404.html faz /akademos/percurso abrir o app em vez de uma página de erro.
import { copyFileSync } from 'node:fs';

copyFileSync(
  new URL('../dist/index.html', import.meta.url),
  new URL('../dist/404.html', import.meta.url),
);
console.info('dist/404.html criado');
