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

/** "agora", "há 12 min", "há 3 h", "há 2 dias". */
export function tempoDecorrido(desde: Date, agora: Date): string {
  const min = Math.max(0, Math.round((agora.getTime() - desde.getTime()) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}
