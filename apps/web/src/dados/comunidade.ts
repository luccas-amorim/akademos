import type { EstatisticasComunidade } from '@akademos/core';
import demoUfx from './demo/ufx-eng-computacao-2019.json';

/**
 * Agregados da comunidade disponíveis offline. Para instituições fictícias o
 * app traz dados de demonstração; para as reais, os agregados vêm do servidor
 * (/stats) e ficam em cache local (ver sincronizacao/estatisticas.ts).
 */
const DEMONSTRACAO: Record<string, EstatisticasComunidade> = {
  [demoUfx.matrizId]: demoUfx as EstatisticasComunidade,
};

let cache: Record<string, EstatisticasComunidade> = {};

export function registrarEstatisticas(e: EstatisticasComunidade): void {
  cache = { ...cache, [e.matrizId]: e };
}

export function estatisticasDaMatriz(matrizId: string): EstatisticasComunidade | null {
  return cache[matrizId] ?? DEMONSTRACAO[matrizId] ?? null;
}
