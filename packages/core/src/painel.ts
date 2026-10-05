/**
 * Retrato calculado do percurso: tudo o que as telas (web e celular) mostram,
 * derivado dos dados locais de uma vez.
 */
import { aderenciaAoObjetivo, type Aderencia } from './carreira';
import {
  gerarInsights,
  prepararContexto,
  preverNota,
  type ContextoInsights,
  type EstatisticasComunidade,
  type PrevisaoNota,
} from './insights';
import {
  integralizacao,
  mediaPonderada,
  mediaPorArea,
  mediaPorSemestre,
  progressoPorArea,
  type Integralizacao,
  type ProgressoArea,
  type SituacaoEfetiva,
} from './percurso';
import {
  caminhoCritico,
  diasLivres,
  horasSemanais,
  preverFormatura,
  type Previsao,
} from './planner/planejador';
import type { DadosLocais } from './repos';
import { deslocarSemestre, ordinalDoSemestre, semestreDaData, type Semestre } from './semestre';
import type { Insight, Oferta } from './tipos';

/** Tudo o que as telas calculam a partir dos dados locais, de uma vez. */
export interface Analise {
  dados: DadosLocais;
  agora: Date;
  semestreAtual: Semestre;
  proximoSemestre: Semestre;
  ordinalAtual: number;
  ctx: ContextoInsights;
  situacoes: Map<string, SituacaoEfetiva>;
  integralizacao: Integralizacao;
  media: number | null;
  notasLancadas: number;
  mediasSemestre: Array<{ semestre: Semestre; media: number }>;
  mediasArea: Array<{ area: string; media: number }>;
  progressoArea: ProgressoArea[];
  /** Previsão com o plano do próximo semestre (se houver). */
  formatura: Previsao;
  caminhoCritico: string[];
  turmasAtuais: Oferta[];
  horasSemanaAtual: number;
  diasLivresAtuais: string[];
  insights: Insight[];
  previsoes: Map<string, PrevisaoNota>;
  comunidade: EstatisticasComunidade | null;
  aderencia: Aderencia | null;
}

export function analisar(
  dados: DadosLocais,
  agora: Date,
  comunidade: EstatisticasComunidade | null = null,
): Analise {
  const semestreAtual = semestreDaData(agora);
  const proximoSemestre = deslocarSemestre(semestreAtual, 1);
  const ctx = prepararContexto({
    instituicao: dados.instituicao,
    escala: dados.escala,
    matriz: dados.matriz,
    aluno: dados.aluno,
    cursadas: dados.cursadas,
    ofertas: dados.ofertas,
    planos: dados.planos,
    objetivos: dados.objetivos,
    semestreAtual,
    agora,
    comunidade,
  });
  const planoProximo = dados.planos.find((p) => p.semestre === proximoSemestre);
  const fixos = planoProximo
    ? {
        [proximoSemestre]: dados.ofertas
          .filter((o) => planoProximo.turmas.includes(o.id))
          .map((o) => o.disciplinaCodigo),
      }
    : undefined;
  const planoAtual = dados.planos.find((p) => p.semestre === semestreAtual);
  const turmasAtuais = planoAtual
    ? dados.ofertas.filter((o) => planoAtual.turmas.includes(o.id))
    : [];
  const cursando = dados.cursadas.filter(
    (c) => c.situacao === 'cursando' && c.semestre === semestreAtual,
  );
  const principal = dados.objetivos.find((o) => o.principal);

  return {
    dados,
    agora,
    semestreAtual,
    proximoSemestre,
    ordinalAtual: ordinalDoSemestre(dados.aluno.ingresso, semestreAtual),
    ctx,
    situacoes: ctx.situacoes,
    integralizacao: integralizacao(dados.matriz, dados.cursadas),
    media: mediaPonderada(dados.matriz, dados.cursadas),
    notasLancadas: dados.cursadas.filter((c) => c.nota !== null).length,
    mediasSemestre: mediaPorSemestre(dados.matriz, dados.cursadas),
    mediasArea: mediaPorArea(dados.matriz, dados.cursadas),
    progressoArea: progressoPorArea(dados.matriz, dados.cursadas),
    formatura: preverFormatura({
      matriz: dados.matriz,
      cursadas: dados.cursadas,
      semestreAtual,
      limiteCreditos: dados.instituicao.creditosMaxSemestre,
      ...(fixos ? { fixos } : {}),
    }),
    caminhoCritico: caminhoCritico(dados.matriz, dados.cursadas),
    turmasAtuais,
    horasSemanaAtual: horasSemanais(turmasAtuais, dados.instituicao.grade.faixas),
    diasLivresAtuais: diasLivres(turmasAtuais, dados.instituicao.grade.dias),
    insights: gerarInsights(ctx),
    previsoes: new Map(
      cursando.flatMap((c) => {
        const p = preverNota(c.disciplinaCodigo, ctx);
        return p ? [[c.disciplinaCodigo, p] as const] : [];
      }),
    ),
    comunidade,
    aderencia: principal ? aderenciaAoObjetivo(principal, ctx.situacoes) : null,
  };
}
