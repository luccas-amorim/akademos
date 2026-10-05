/**
 * Esquema SQLite local (docs/ARCHITECTURE.md › Modelo de dados).
 * Nomes de tabelas e colunas herdados do site original; não renomeie sem migração.
 *
 * Tabelas do aluno têm `id` texto (UUID) e `apagado` para que exclusões viajem
 * pela sincronização como uma escrita comum (LWW por célula).
 */
import type {
  Competencia,
  Dia,
  FaixaHoraria,
  Grau,
  Horario,
  Periodicidade,
  SistemaAcademico,
  SituacaoCursada,
  TipoDisciplina,
  TipoPrerequisito,
} from '@akademos/core';
import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const apagado = () => integer('apagado', { mode: 'boolean' }).notNull().default(false);

/* ——— Registro instalado ——— */

export const escala = sqliteTable('escala', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  min: real('min').notNull(),
  max: real('max').notNull(),
  aprovacao: real('aprovacao').notNull(),
  frequenciaMinima: real('frequencia_minima').notNull(),
});

export const instituicao = sqliteTable('instituicao', {
  id: text('id').primaryKey(),
  sigla: text('sigla').notNull(),
  nome: text('nome').notNull(),
  escalaId: text('escala_id')
    .notNull()
    .references(() => escala.id),
  sistema: text('sistema').$type<SistemaAcademico>().notNull(),
  creditosMaxSemestre: integer('creditos_max_semestre').notNull(),
  gradeDias: text('grade_dias', { mode: 'json' }).$type<Dia[]>().notNull(),
  gradeFaixas: text('grade_faixas', { mode: 'json' }).$type<FaixaHoraria[]>().notNull(),
});

export const curso = sqliteTable('curso', {
  id: text('id').primaryKey(),
  instituicaoId: text('instituicao_id')
    .notNull()
    .references(() => instituicao.id),
  nome: text('nome').notNull(),
  grau: text('grau').$type<Grau>().notNull(),
});

export const matriz = sqliteTable('matriz', {
  id: text('id').primaryKey(),
  cursoId: text('curso_id')
    .notNull()
    .references(() => curso.id),
  ano: integer('ano').notNull(),
  creditosTotal: integer('creditos_total').notNull(),
  versaoRegistro: text('versao_registro').notNull(),
});

export const disciplina = sqliteTable(
  'disciplina',
  {
    codigo: text('codigo').notNull(),
    matrizId: text('matriz_id')
      .notNull()
      .references(() => matriz.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    creditos: integer('creditos').notNull(),
    cargaHoraria: integer('carga_horaria').notNull(),
    semestreSugerido: integer('semestre_sugerido').notNull(),
    area: text('area').notNull(),
    tipo: text('tipo').$type<TipoDisciplina>().notNull(),
    periodicidade: text('periodicidade').$type<Periodicidade>().notNull().default('ambos'),
    codigosAlternativos: text('codigos_alternativos', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
  },
  (t) => [primaryKey({ columns: [t.matrizId, t.codigo] })],
);

export const prerequisito = sqliteTable(
  'prerequisito',
  {
    matrizId: text('matriz_id')
      .notNull()
      .references(() => matriz.id, { onDelete: 'cascade' }),
    disciplinaCodigo: text('disciplina_codigo').notNull(),
    requerCodigo: text('requer_codigo').notNull(),
    tipo: text('tipo').$type<TipoPrerequisito>().notNull().default('pre'),
  },
  (t) => [primaryKey({ columns: [t.matrizId, t.disciplinaCodigo, t.requerCodigo] })],
);

/* ——— Dados do aluno (sincronizáveis) ——— */

export const aluno = sqliteTable('aluno', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  matricula: text('matricula'),
  cursoId: text('curso_id').notNull(),
  matrizId: text('matriz_id').notNull(),
  ingresso: text('ingresso').notNull(),
  apagado: apagado(),
});

export const cursada = sqliteTable(
  'cursada',
  {
    id: text('id').primaryKey(),
    alunoId: text('aluno_id').notNull(),
    disciplinaCodigo: text('disciplina_codigo').notNull(),
    semestre: text('semestre').notNull(),
    nota: real('nota'),
    frequencia: real('frequencia'),
    situacao: text('situacao').$type<SituacaoCursada>().notNull(),
    apagado: apagado(),
  },
  (t) => [index('cursada_aluno_idx').on(t.alunoId)],
);

export const oferta = sqliteTable(
  'oferta',
  {
    id: text('id').primaryKey(),
    semestre: text('semestre').notNull(),
    disciplinaCodigo: text('disciplina_codigo').notNull(),
    turma: text('turma').notNull(),
    titulo: text('titulo'),
    professor: text('professor'),
    local: text('local'),
    vagas: integer('vagas').notNull(),
    interessados: integer('interessados').notNull(),
    horarios: text('horarios', { mode: 'json' }).$type<Horario[]>().notNull(),
    atualizadaEm: text('atualizada_em'),
    apagado: apagado(),
  },
  (t) => [index('oferta_semestre_idx').on(t.semestre)],
);

export const plano = sqliteTable('plano', {
  id: text('id').primaryKey(),
  alunoId: text('aluno_id').notNull(),
  semestre: text('semestre').notNull(),
  turmas: text('turmas', { mode: 'json' }).$type<string[]>().notNull(),
  criadoEm: text('criado_em').notNull(),
  apagado: apagado(),
});

export const objetivo = sqliteTable('objetivo', {
  id: text('id').primaryKey(),
  alunoId: text('aluno_id').notNull(),
  titulo: text('titulo').notNull(),
  principal: integer('principal', { mode: 'boolean' }).notNull(),
  competencias: text('competencias', { mode: 'json' }).$type<Competencia[]>().notNull(),
  apagado: apagado(),
});

export const marco = sqliteTable('marco', {
  id: text('id').primaryKey(),
  alunoId: text('aluno_id').notNull(),
  semestre: text('semestre').notNull(),
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  feito: integer('feito', { mode: 'boolean' }).notNull(),
  apagado: apagado(),
});

export const diario = sqliteTable('diario', {
  id: text('id').primaryKey(),
  alunoId: text('aluno_id').notNull(),
  data: text('data').notNull(),
  texto: text('texto').notNull(),
  humor: integer('humor'),
  apagado: apagado(),
});

export const insightCache = sqliteTable('insight_cache', {
  id: text('id').primaryKey(),
  tipo: text('tipo').notNull(),
  alvo: text('alvo').notNull(),
  severidade: text('severidade').notNull(),
  texto: text('texto').notNull(),
  motivo: text('motivo').notNull(),
  fonte: text('fonte').notNull(),
  calculadoEm: text('calculado_em').notNull(),
});

/* ——— Sincronização ——— */

/**
 * Log de operações: cada escrita local vira uma op por coluna alterada.
 * `origem` = 'local' (ainda não enviada ou já enviada) ou 'remota'.
 */
export const ops = sqliteTable(
  '_ops',
  {
    hlc: text('hlc').notNull(),
    tabela: text('tabela').notNull(),
    linhaId: text('linha_id').notNull(),
    coluna: text('coluna').notNull(),
    /** Valor serializado em JSON. */
    valor: text('valor').notNull(),
    origem: text('origem').$type<'local' | 'remota'>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tabela, t.linhaId, t.coluna, t.hlc] }),
    index('ops_hlc_idx').on(t.hlc),
  ],
);

/** Pares chave–valor do aparelho (cursor de sincronização, nó do HLC). */
export const meta = sqliteTable('_meta', {
  chave: text('chave').primaryKey(),
  valor: text('valor').notNull(),
});

/** Tabelas do aluno que participam da sincronização. */
export const TABELAS_SINCRONIZADAS = {
  aluno,
  cursada,
  oferta,
  plano,
  objetivo,
  marco,
  diario,
} as const;

export type TabelaSincronizada = keyof typeof TABELAS_SINCRONIZADAS;
