import { deslocarSemestre, type Semestre } from '../semestre';
import type { Cursada, Dia, Instituicao, Matriz, Oferta } from '../tipos';
import {
  chanceDeVaga,
  conflitosDaGrade,
  diasLivres,
  horasSemanais,
  preverFormatura,
  type Conflito,
} from './planejador';

export interface EntradaPlano {
  matriz: Matriz;
  instituicao: Instituicao;
  cursadas: readonly Cursada[];
  semestreAtual: Semestre;
  /** Turmas do plano (já filtradas para o próximo semestre). */
  turmas: readonly Oferta[];
  faixaPrioridade?: number;
}

export interface ResumoPlano {
  semestre: Semestre;
  creditos: number;
  horas: number;
  conflitos: Conflito[];
  diasLivres: Dia[];
  /** Menor chance de vaga entre as turmas do plano (100 se vazio). */
  menorChance: number;
  /** Formatura se o plano for cumprido. */
  formatura: Semestre | null;
  /** Melhor formatura possível (planejador livre no próximo semestre). */
  formaturaIdeal: Semestre | null;
}

export function resumirPlano(e: EntradaPlano): ResumoPlano {
  const semestre = deslocarSemestre(e.semestreAtual, 1);
  const codigos = [...new Set(e.turmas.map((t) => t.disciplinaCodigo))];
  const creditos = codigos.reduce(
    (s, c) => s + (e.matriz.disciplinas.find((d) => d.codigo === c)?.creditos ?? 0),
    0,
  );
  const base = {
    matriz: e.matriz,
    cursadas: e.cursadas,
    semestreAtual: e.semestreAtual,
    limiteCreditos: e.instituicao.creditosMaxSemestre,
  };
  return {
    semestre,
    creditos,
    horas: horasSemanais(e.turmas, e.instituicao.grade.faixas),
    conflitos: conflitosDaGrade(e.turmas),
    diasLivres: diasLivres(e.turmas, e.instituicao.grade.dias),
    menorChance: Math.min(100, ...e.turmas.map((t) => chanceDeVaga(t, e.faixaPrioridade))),
    formatura: preverFormatura({ ...base, fixos: { [semestre]: codigos } }).formatura,
    formaturaIdeal: preverFormatura(base).formatura,
  };
}
