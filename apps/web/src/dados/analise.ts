import { analisar, type Analise } from '@akademos/core';
import { useMemo } from 'react';
import { estatisticasDaMatriz } from './comunidade';
import { useDados } from './store';

export type { Analise } from '@akademos/core';

/** Análise memorizada: recalcula só quando os dados mudam. */
export function useAnalise(): Analise {
  const dados = useDados();
  return useMemo(() => analisar(dados, new Date(), estatisticasDaMatriz(dados.matriz.id)), [dados]);
}
