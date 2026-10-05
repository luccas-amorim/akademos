/**
 * Formato dos arquivos do registro. Fonte única: daqui saem os tipos TS e os
 * JSON Schemas em `registry/schema/` (para editores e validação em CI).
 */
import { z } from 'zod';

const semestre = z.string().regex(/^\d{4}\/[12]$/, 'use AAAA/N, ex.: 2027/1');
const hora = z.string().regex(/^\d{2}:\d{2}$/, 'use HH:MM');
const codigo = z
  .string()
  .regex(/^[A-Z0-9][A-Z0-9._-]*$/, 'código em maiúsculas, sem espaços (ex.: EX101)');

export const DiaSchema = z.enum(['seg', 'ter', 'qua', 'qui', 'sex', 'sab']);

export const InstituicaoSchema = z
  .object({
    sigla: z.string().min(2).max(12),
    nome: z.string().min(3),
    sistema: z.enum(['sigaa', 'jupiter', 'outro']),
    escala: z.string().describe('id da escala em escala.yaml'),
    creditos_max_semestre: z.number().int().positive(),
    grade: z.object({
      dias: z.array(DiaSchema).min(1),
      faixas: z.array(z.object({ inicio: hora, fim: hora })).min(1),
    }),
    ficticia: z
      .boolean()
      .optional()
      .describe('dados de demonstração, sem relação com instituição real'),
  })
  .strict();

export const EscalaSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    min: z.number(),
    max: z.number(),
    aprovacao: z.number(),
    frequencia_minima: z.number().min(0).max(1),
  })
  .strict()
  .refine((e) => e.min < e.max && e.aprovacao >= e.min && e.aprovacao <= e.max, {
    message: 'precisa valer min < max e min ≤ aprovacao ≤ max',
  });

export const EscalasSchema = z.object({ escalas: z.array(EscalaSchema).min(1) }).strict();

export const DisciplinaSchema = z
  .object({
    codigo,
    nome: z.string().min(2),
    creditos: z.number().int().positive(),
    carga_horaria: z.number().int().positive().optional(),
    semestre: z.number().int().positive().describe('semestre sugerido na matriz'),
    area: z.string().min(2),
    tipo: z.enum(['obrigatoria', 'eletiva', 'optativa']).default('obrigatoria'),
    oferta: z.enum(['impar', 'par', 'ambos']).default('ambos'),
    requer: z.array(codigo).default([]).describe('pré-requisitos'),
    correquisitos: z.array(codigo).default([]),
    codigos_alternativos: z.array(z.string()).default([]),
  })
  .strict();

export const MatrizSchema = z
  .object({
    curso: z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      nome: z.string(),
      grau: z.enum(['bacharelado', 'licenciatura', 'tecnologo', 'outro']),
    }),
    ano: z.number().int().min(1950).max(2100),
    versao: z.string().describe('versão do pacote; mude ao corrigir dados'),
    creditos_total: z.number().int().positive(),
    horas_por_credito: z.number().positive().default(15),
    vigente_desde: semestre.optional(),
    disciplinas: z.array(DisciplinaSchema).min(1),
  })
  .strict();

/** Modelo de leitura do PDF de histórico (uma expressão por linha de disciplina). */
export const ModeloHistoricoSchema = z
  .object({
    sistema: z.string(),
    descricao: z.string().optional(),
    linha: z
      .string()
      .describe('regex com grupos nomeados: semestre, codigo, nome, nota, frequencia, situacao'),
    situacoes: z.record(
      z.string(),
      z.enum(['aprovada', 'reprovada', 'cursando', 'trancada', 'aproveitada']),
    ),
    separador_decimal: z.enum([',', '.']).default(','),
  })
  .strict();

export type InstituicaoYaml = z.infer<typeof InstituicaoSchema>;
export type EscalaYaml = z.infer<typeof EscalaSchema>;
export type MatrizYaml = z.infer<typeof MatrizSchema>;
export type DisciplinaYaml = z.infer<typeof DisciplinaSchema>;
export type ModeloHistoricoYaml = z.infer<typeof ModeloHistoricoSchema>;

export const SCHEMAS = {
  instituicao: InstituicaoSchema,
  escala: EscalasSchema,
  matriz: MatrizSchema,
  'historico-pdf': ModeloHistoricoSchema,
} as const;
