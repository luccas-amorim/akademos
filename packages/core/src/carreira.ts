import type { SituacaoEfetiva } from './percurso';
import type { Competencia, Objetivo } from './tipos';

/** Quanto cada estado conta para uma competência. */
const PESO: Partial<Record<SituacaoEfetiva, number>> = { ok: 1, cur: 0.6 };

export interface CoberturaCompetencia {
  nome: string;
  /** 0–100. */
  percentual: number;
  cumpridas: string[];
  emCurso: string[];
  faltando: string[];
  atividadesFeitas: string[];
  atividadesPendentes: string[];
}

export function coberturaDaCompetencia(
  c: Competencia,
  situacoes: ReadonlyMap<string, SituacaoEfetiva>,
): CoberturaCompetencia {
  const atividades = c.atividades ?? [];
  const itens = c.disciplinas.length + atividades.length;
  let pontos = 0;
  const cumpridas: string[] = [];
  const emCurso: string[] = [];
  const faltando: string[] = [];
  for (const codigo of c.disciplinas) {
    const s = situacoes.get(codigo);
    pontos += (s && PESO[s]) ?? 0;
    if (s === 'ok') cumpridas.push(codigo);
    else if (s === 'cur') emCurso.push(codigo);
    else faltando.push(codigo);
  }
  for (const a of atividades) if (a.feito) pontos += 1;
  return {
    nome: c.nome,
    percentual: itens ? Math.round((pontos / itens) * 100) : 0,
    cumpridas,
    emCurso,
    faltando,
    atividadesFeitas: atividades.filter((a) => a.feito).map((a) => a.titulo),
    atividadesPendentes: atividades.filter((a) => !a.feito).map((a) => a.titulo),
  };
}

export interface Aderencia {
  /** 0–100: média das competências. */
  percentual: number;
  competencias: CoberturaCompetencia[];
}

export function aderenciaAoObjetivo(
  objetivo: Objetivo,
  situacoes: ReadonlyMap<string, SituacaoEfetiva>,
): Aderencia {
  const competencias = objetivo.competencias.map((c) => coberturaDaCompetencia(c, situacoes));
  const percentual = competencias.length
    ? Math.round(competencias.reduce((s, c) => s + c.percentual, 0) / competencias.length)
    : 0;
  return { percentual, competencias };
}
