import type { Dia, Horario } from '@akademos/core';

/**
 * Horários do SIGAA vêm codificados: "24M12" = segunda e quarta (2 e 4), turno
 * da manhã (M), períodos 1 e 2. Um código pode ter vários blocos: "3T34 5T12".
 */
const DIAS: Record<string, Dia> = {
  '2': 'seg',
  '3': 'ter',
  '4': 'qua',
  '5': 'qui',
  '6': 'sex',
  '7': 'sab',
};

/** Correspondência entre (turno, períodos) do SIGAA e as faixas da grade da instituição. */
export interface FaixaSigaa {
  turno: 'M' | 'T' | 'N';
  periodos: number[];
  slot: number;
}

/** Grade comum: aulas de 2 períodos (08–10, 10–12, 14–16, 16–18, 19–21). */
export const MAPA_PADRAO: FaixaSigaa[] = [
  { turno: 'M', periodos: [1, 2], slot: 0 },
  { turno: 'M', periodos: [3, 4], slot: 1 },
  { turno: 'T', periodos: [1, 2], slot: 2 },
  { turno: 'T', periodos: [3, 4], slot: 3 },
  { turno: 'N', periodos: [1, 2], slot: 4 },
];

export function lerHorarioSigaa(
  codigo: string,
  mapa: readonly FaixaSigaa[] = MAPA_PADRAO,
): Horario[] {
  const saida: Horario[] = [];
  for (const bloco of codigo.toUpperCase().match(/[2-7]+[MTN][1-6]+/g) ?? []) {
    const m = /^([2-7]+)([MTN])([1-6]+)$/.exec(bloco);
    if (!m) continue;
    const [, dias, turno, periodos] = m as unknown as [string, string, 'M' | 'T' | 'N', string];
    const ps = [...periodos].map(Number);
    const slots = mapa
      .filter((f) => f.turno === turno && f.periodos.some((p) => ps.includes(p)))
      .map((f) => f.slot);
    for (const d of dias) {
      const dia = DIAS[d];
      if (!dia) continue;
      for (const slot of slots) {
        if (!saida.some((h) => h.dia === dia && h.slot === slot)) saida.push({ dia, slot });
      }
    }
  }
  return saida;
}
