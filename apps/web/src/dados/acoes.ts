import { MATRIZ_DA_ANA, semearAna } from '@akademos/db/seed';
import { entradaDaMatriz } from './catalogo';
import { store } from './store';

/** Carrega a aluna fictícia Ana (UFX) para explorar o Akademos. */
export async function carregarExemplo(): Promise<void> {
  const entrada = entradaDaMatriz(MATRIZ_DA_ANA);
  if (!entrada) throw new Error('A matriz de exemplo não está no catálogo.');
  await store.escrever((repos) => semearAna(repos, entrada.pacote));
}
