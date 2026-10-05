import type { Escala, Intervalo } from './tipos';

/** Marcador usado no modo "Ocultar notas" (docs/DESIGN.md › Interações). */
export const NOTA_OCULTA = '•,•';

export interface OpcoesNota {
  ocultar?: boolean;
  casas?: number;
}

/** 7.8 → "7,8"; `null` → "—"; com `ocultar`, "•,•". */
export function formatarNota(
  nota: number | null,
  { ocultar = false, casas = 1 }: OpcoesNota = {},
): string {
  if (nota === null || !Number.isFinite(nota)) return '—';
  if (ocultar) return NOTA_OCULTA;
  return nota.toFixed(casas).replace('.', ',');
}

/** Previsões são sempre faixas: "5,8–6,9". */
export function formatarIntervalo(i: Intervalo, opcoes: OpcoesNota = {}): string {
  if (opcoes.ocultar) return `${NOTA_OCULTA} – ${NOTA_OCULTA}`;
  return `${formatarNota(i.min, opcoes)}–${formatarNota(i.max, opcoes)}`;
}

/** Converte da escala da instituição para 0–10 (usado só pelo motor de insights). */
export function normalizarNota(nota: number, escala: Escala): number {
  return ((nota - escala.min) / (escala.max - escala.min)) * 10;
}

export function desnormalizarNota(nota10: number, escala: Escala): number {
  return escala.min + (nota10 / 10) * (escala.max - escala.min);
}

/** 1240 → "1.240". */
export function formatarInteiro(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}
