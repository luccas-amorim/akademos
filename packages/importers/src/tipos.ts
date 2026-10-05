import type { SituacaoCursada } from '@akademos/core';

/** Uma linha de histórico como veio da fonte (PDF, conector), antes de casar com a matriz. */
export interface CursadaBruta {
  /** `AAAA/N`. */
  semestre: string;
  codigo: string;
  nome: string;
  /** Na escala da instituição, já convertida para número. */
  nota: number | null;
  /** 0–1. */
  frequencia: number | null;
  /** Texto original da situação (ex.: "APR"). */
  situacaoOriginal: string;
  /** Situação normalizada; `null` se o modelo não conhece o rótulo. */
  situacao: SituacaoCursada | null;
  /** Texto bruto da linha, para auditoria na tela de revisão. */
  linha?: string;
}

/** Modelo de leitura do histórico (registry/instituicoes/<sigla>/historico-pdf.yaml). */
export interface ModeloHistorico {
  sistema: string;
  linha: string;
  situacoes: Record<string, SituacaoCursada>;
  separador_decimal: ',' | '.';
}
