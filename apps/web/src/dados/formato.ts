import { formatarIntervalo, formatarNota, type Intervalo } from '@akademos/core';
import { useCallback, useMemo } from 'react';
import { useOcultarNotas } from './preferencias';

/** Formatação de notas que respeita o modo "Ocultar notas". */
export function useFormatoNota() {
  const [ocultar] = useOcultarNotas();
  const nota = useCallback((n: number | null) => formatarNota(n, { ocultar }), [ocultar]);
  const intervalo = useCallback((i: Intervalo) => formatarIntervalo(i, { ocultar }), [ocultar]);
  return useMemo(() => ({ ocultar, nota, intervalo }), [ocultar, nota, intervalo]);
}
