import type { Semestre } from './semestre';

/* ——— Instituição e matriz (vêm do registro) ——— */

export type SistemaAcademico = 'sigaa' | 'jupiter' | 'outro';

export interface Instituicao {
  id: string;
  sigla: string;
  nome: string;
  escalaId: string;
  sistema: SistemaAcademico;
  /** Limite de créditos por semestre usado pelo planejador. */
  creditosMaxSemestre: number;
  /** Grade semanal: dias e faixas de horário. */
  grade: GradeSemanal;
}

export interface FaixaHoraria {
  inicio: string;
  fim: string;
}

export interface GradeSemanal {
  dias: Dia[];
  faixas: FaixaHoraria[];
}

export type Dia = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';

export interface Escala {
  id: string;
  nome: string;
  min: number;
  max: number;
  /** Nota mínima de aprovação, na escala da instituição. */
  aprovacao: number;
  /** Frequência mínima (0–1). */
  frequenciaMinima: number;
}

export type Grau = 'bacharelado' | 'licenciatura' | 'tecnologo' | 'outro';

export interface Curso {
  id: string;
  instituicaoId: string;
  nome: string;
  grau: Grau;
}

export type TipoDisciplina = 'obrigatoria' | 'eletiva' | 'optativa';

/** Em que períodos a disciplina costuma ser ofertada. */
export type Periodicidade = 'impar' | 'par' | 'ambos';

export interface Disciplina {
  codigo: string;
  matrizId: string;
  nome: string;
  creditos: number;
  cargaHoraria: number;
  /** Ordinal do semestre sugerido na matriz (1 = primeiro). */
  semestreSugerido: number;
  area: string;
  tipo: TipoDisciplina;
  periodicidade: Periodicidade;
  /** Códigos equivalentes em históricos e sistemas (ex.: `MAT0101`). */
  codigosAlternativos: string[];
}

export type TipoPrerequisito = 'pre' | 'co';

export interface Prerequisito {
  disciplinaCodigo: string;
  requerCodigo: string;
  tipo: TipoPrerequisito;
}

export interface Matriz {
  id: string;
  cursoId: string;
  ano: number;
  creditosTotal: number;
  versaoRegistro: string;
  disciplinas: Disciplina[];
  prerequisitos: Prerequisito[];
}

/* ——— Dados do aluno (locais) ——— */

export interface Aluno {
  id: string;
  nome: string;
  matricula: string | null;
  cursoId: string;
  matrizId: string;
  ingresso: Semestre;
}

export type SituacaoCursada = 'aprovada' | 'reprovada' | 'cursando' | 'trancada' | 'aproveitada';

export interface Cursada {
  id: string;
  alunoId: string;
  disciplinaCodigo: string;
  semestre: Semestre;
  /** Na escala da instituição; `null` enquanto não há nota. */
  nota: number | null;
  /** 0–1. */
  frequencia: number | null;
  situacao: SituacaoCursada;
}

export interface Horario {
  dia: Dia;
  /** Índice da faixa em `GradeSemanal.faixas`. */
  slot: number;
}

export interface Oferta {
  id: string;
  semestre: Semestre;
  disciplinaCodigo: string;
  turma: string;
  /** Nome exibido no lugar da disciplina (eletivas com tema). */
  titulo: string | null;
  professor: string | null;
  local: string | null;
  vagas: number;
  interessados: number;
  horarios: Horario[];
  /** Quando a oferta foi lida do sistema da universidade (ISO 8601). */
  atualizadaEm: string | null;
}

export interface Plano {
  id: string;
  alunoId: string;
  semestre: Semestre;
  /** Ids de `Oferta`. */
  turmas: string[];
  criadoEm: string;
}

export interface Competencia {
  nome: string;
  disciplinas: string[];
  /** Atividades fora da matriz (iniciação científica, cursos). */
  atividades?: Array<{ titulo: string; feito: boolean }>;
}

export interface Objetivo {
  id: string;
  alunoId: string;
  titulo: string;
  principal: boolean;
  competencias: Competencia[];
}

export interface Marco {
  id: string;
  alunoId: string;
  semestre: Semestre;
  titulo: string;
  descricao: string | null;
  feito: boolean;
}

export interface EntradaDiario {
  id: string;
  alunoId: string;
  /** ISO 8601 (data). */
  data: string;
  texto: string;
  /** 1–5, opcional. */
  humor: number | null;
}

/* ——— Insights ——— */

export type TipoInsight = 'risco' | 'lotacao' | 'correlacao' | 'carga' | 'carreira';
export type Severidade = 'alta' | 'media' | 'baixa';
export type FonteInsight = 'pessoal' | 'comunidade' | 'regra';

export type DestinoInsight = 'planejar' | 'percurso' | 'desempenho' | 'carreira' | 'insights';

export interface Insight {
  id: string;
  tipo: TipoInsight;
  /** Rótulo curto exibido acima do título (ex.: "Formatura", "Risco"). */
  rotulo: string;
  /** Código da disciplina, id da turma ou do objetivo a que se refere. */
  alvo: string;
  severidade: Severidade;
  titulo: string;
  texto: string;
  /** Por que o insight existe: dado de origem, legível. Nunca vazio. */
  motivo: string;
  fonte: FonteInsight;
  acao: { rotulo: string; destino: DestinoInsight } | null;
}

/** Intervalo de valores — previsões nunca são pontuais. */
export interface Intervalo {
  min: number;
  max: number;
}
