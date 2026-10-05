import type { EstatisticasComunidade, PacoteInstituicao } from '@akademos/core';
import catalogo from './catalogo.generated.json';

interface Entrada {
  pacote: PacoteInstituicao;
  ficticia: boolean;
}

/** Catálogo embutido (gerado do registro por scripts/gerar-catalogo.ts). */
export const CATALOGO = catalogo.entradas as unknown as Entrada[];

const DEMONSTRACAO = catalogo.demonstracao as unknown as EstatisticasComunidade[];

export function entradaDaMatriz(matrizId: string): Entrada | undefined {
  return CATALOGO.find((e) => e.pacote.matriz.id === matrizId);
}

export function estatisticasDemo(matrizId: string): EstatisticasComunidade | null {
  return DEMONSTRACAO.find((e) => e.matrizId === matrizId) ?? null;
}
