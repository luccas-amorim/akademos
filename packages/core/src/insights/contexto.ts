import { notaDaDisciplina, situacoesEfetivas, type SituacaoEfetiva } from '../percurso';
import { deslocarSemestre, ordinalDoSemestre, type Semestre } from '../semestre';
import type {
  Aluno,
  Cursada,
  Disciplina,
  Escala,
  Instituicao,
  Matriz,
  Objetivo,
  Oferta,
  Plano,
} from '../tipos';
import { normalizarNota } from '../formato';

/**
 * Agregados anônimos publicados pelo servidor (/stats), sempre na escala 0–10.
 * Só chegam células com pelo menos `k` históricos.
 */
export interface EstatisticasComunidade {
  matrizId: string;
  geradoEm: string;
  /** k-anonimato aplicado na publicação. */
  k: number;
  /** Dados de demonstração (instituições fictícias), não de pessoas reais. */
  demonstracao?: boolean;
  disciplinas: Record<string, { n: number; media: number; desvio: number; reprovacao: number }>;
  /** Regressão linear simples: nota em `para` prevista pela nota em `de`. */
  correlacoes: Array<{
    de: string;
    para: string;
    r: number;
    n: number;
    inclinacao: number;
    intercepto: number;
    /** Desvio-padrão dos resíduos. */
    residuo: number;
  }>;
  /** Taxa de reprovação em `disciplina` entre quem teve nota < `abaixoDe` em `dado`. */
  condicionais: Array<{
    disciplina: string;
    dado: string;
    abaixoDe: number;
    reprovacao: number;
    n: number;
  }>;
}

export interface EntradaInsights {
  instituicao: Instituicao;
  escala: Escala;
  matriz: Matriz;
  aluno: Aluno;
  cursadas: readonly Cursada[];
  ofertas: readonly Oferta[];
  planos: readonly Plano[];
  objetivos: readonly Objetivo[];
  semestreAtual: Semestre;
  agora: Date;
  comunidade?: EstatisticasComunidade | null;
  /** Faixa de prioridade de matrícula (1 = maior). */
  faixaPrioridade?: number;
}

/** Entrada enriquecida com o que todas as regras usam. */
export interface ContextoInsights extends EntradaInsights {
  ordinalAtual: number;
  proximoSemestre: Semestre;
  situacoes: Map<string, SituacaoEfetiva>;
  disciplina: (codigo: string) => Disciplina | undefined;
  nome: (codigo: string) => string;
  /** Nota mais recente, normalizada para 0–10. */
  nota10: (codigo: string) => number | null;
  aprovacao10: number;
  ofertasProximas: Oferta[];
  planoProximo: Oferta[];
  /** Pode ser cursada no próximo semestre (requisitos ok e não feita). */
  elegivel: (codigo: string) => boolean;
  comunidadeValida: EstatisticasComunidade | null;
}

export function prepararContexto(e: EntradaInsights): ContextoInsights {
  const ordinalAtual = ordinalDoSemestre(e.aluno.ingresso, e.semestreAtual);
  const situacoes = situacoesEfetivas(e.matriz, e.cursadas, ordinalAtual);
  const porCodigo = new Map(e.matriz.disciplinas.map((d) => [d.codigo, d]));
  const proximoSemestre = deslocarSemestre(e.semestreAtual, 1);
  const ofertasProximas = e.ofertas.filter((o) => o.semestre === proximoSemestre);
  const plano = e.planos.find((p) => p.semestre === proximoSemestre);
  const planoProximo = plano ? ofertasProximas.filter((o) => plano.turmas.includes(o.id)) : [];
  const comunidadeValida =
    e.comunidade && e.comunidade.matrizId === e.matriz.id ? e.comunidade : null;
  return {
    ...e,
    ordinalAtual,
    proximoSemestre,
    situacoes,
    disciplina: (c) => porCodigo.get(c),
    nome: (c) => porCodigo.get(c)?.nome ?? c,
    nota10: (c) => {
      const n = notaDaDisciplina(c, e.cursadas);
      return n === null ? null : normalizarNota(n, e.escala);
    },
    aprovacao10: normalizarNota(e.escala.aprovacao, e.escala),
    ofertasProximas,
    planoProximo,
    elegivel: (c) => {
      const s = situacoes.get(c);
      return s === 'lib' || s === 'pend';
    },
    comunidadeValida,
  };
}
