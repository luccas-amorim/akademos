/**
 * Fixture de testes: matriz fictícia da UFX e o histórico da aluna Ana
 * (mesmos dados de design/Akademos.dc.html e do seed em packages/db).
 */
import type {
  Aluno,
  Cursada,
  Disciplina,
  Escala,
  Instituicao,
  Matriz,
  Oferta,
  Periodicidade,
} from '../tipos';

type Linha = [
  codigo: string,
  nome: string,
  sem: number,
  cr: number,
  area: string,
  requer: string[],
];

const D: Linha[] = [
  ['EX101', 'Cálculo I', 1, 4, 'Matemática', []],
  ['EX102', 'Algoritmos e Programação', 1, 4, 'Computação', []],
  ['EX103', 'Geometria Analítica', 1, 4, 'Matemática', []],
  ['EX104', 'Introdução à Engenharia', 1, 2, 'Formação geral', []],
  ['EX201', 'Cálculo II', 2, 4, 'Matemática', ['EX101']],
  ['EX202', 'Estruturas de Dados', 2, 4, 'Computação', ['EX102']],
  ['EX203', 'Álgebra Linear', 2, 4, 'Matemática', ['EX103']],
  ['EX204', 'Física I', 2, 4, 'Física', ['EX101']],
  ['EX301', 'Cálculo III', 3, 4, 'Matemática', ['EX201']],
  ['EX302', 'Probabilidade', 3, 4, 'Matemática', ['EX201']],
  ['EX303', 'Programação Orientada a Objetos', 3, 4, 'Computação', ['EX202']],
  ['EX304', 'Física II', 3, 4, 'Física', ['EX204']],
  ['EX305', 'Circuitos Digitais', 3, 4, 'Eletrônica', []],
  ['EX401', 'Banco de Dados', 4, 4, 'Computação', ['EX202']],
  ['EX402', 'Arquitetura de Computadores', 4, 4, 'Eletrônica', ['EX305']],
  ['EX403', 'Cálculo Numérico', 4, 4, 'Matemática', ['EX201', 'EX203']],
  ['EX404', 'Sinais e Sistemas', 4, 4, 'Eletrônica', ['EX301']],
  ['EX501', 'Sistemas Operacionais', 5, 4, 'Computação', ['EX402']],
  ['EX502', 'Redes de Computadores', 5, 4, 'Computação', ['EX202']],
  ['EX503', 'Engenharia de Software', 5, 4, 'Computação', ['EX303']],
  ['EX504', 'Estatística Aplicada', 5, 4, 'Matemática', ['EX302']],
  ['EX601', 'Inteligência Artificial', 6, 4, 'Computação', ['EX302', 'EX202']],
  ['EX602', 'Compiladores', 6, 4, 'Computação', ['EX202']],
  ['EX603', 'Sistemas Distribuídos', 6, 4, 'Computação', ['EX501', 'EX502']],
  ['EX604', 'Teoria de Controle', 6, 4, 'Eletrônica', ['EX404']],
  ['EX701', 'Aprendizado de Máquina', 7, 4, 'Computação', ['EX601', 'EX504']],
  ['EX702', 'Projeto Integrador', 7, 4, 'Formação geral', ['EX503']],
  ['EX703', 'Estágio Supervisionado', 7, 8, 'Formação geral', []],
  ['EX704', 'Eletiva I', 7, 4, 'Eletiva', []],
  ['EX801', 'Trabalho de Conclusão', 8, 4, 'Formação geral', ['EX702']],
  ['EX802', 'Ética e Sociedade', 8, 2, 'Formação geral', []],
  ['EX803', 'Eletiva II', 8, 4, 'Eletiva', []],
];

const PERIODICIDADE: Record<string, Periodicidade> = { EX404: 'impar' };

export const MATRIZ_ID = 'ufx/eng-computacao/2019';

export const disciplinas: Disciplina[] = D.map(([codigo, nome, sem, cr, area]) => ({
  codigo,
  matrizId: MATRIZ_ID,
  nome,
  creditos: cr,
  cargaHoraria: cr * 15,
  semestreSugerido: sem,
  area,
  tipo: area === 'Eletiva' ? 'eletiva' : 'obrigatoria',
  periodicidade: PERIODICIDADE[codigo] ?? 'ambos',
  codigosAlternativos: [],
}));

export const matriz: Matriz = {
  id: MATRIZ_ID,
  cursoId: 'ufx/eng-computacao',
  ano: 2019,
  creditosTotal: 128,
  versaoRegistro: '1.0.0',
  disciplinas,
  prerequisitos: D.flatMap(([codigo, , , , , requer]) =>
    requer.map((r) => ({ disciplinaCodigo: codigo, requerCodigo: r, tipo: 'pre' as const })),
  ),
};

export const escala: Escala = {
  id: 'ufx-0-10',
  nome: '0 a 10',
  min: 0,
  max: 10,
  aprovacao: 6,
  frequenciaMinima: 0.75,
};

export const instituicao: Instituicao = {
  id: 'ufx',
  sigla: 'UFX',
  nome: 'Universidade Federal de Exemplo',
  escalaId: escala.id,
  sistema: 'sigaa',
  creditosMaxSemestre: 24,
  grade: {
    dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
    faixas: [
      { inicio: '08:00', fim: '10:00' },
      { inicio: '10:00', fim: '12:00' },
      { inicio: '14:00', fim: '16:00' },
      { inicio: '16:00', fim: '18:00' },
      { inicio: '19:00', fim: '21:00' },
    ],
  },
};

export const aluno: Aluno = {
  id: 'ana',
  nome: 'Ana Ribeiro',
  matricula: null,
  cursoId: 'ufx/eng-computacao',
  matrizId: MATRIZ_ID,
  ingresso: '2024/2',
};

const SEMS = ['2024/2', '2025/1', '2025/2', '2026/1', '2026/2'];
const NOTAS: Record<string, number> = {
  EX101: 7.8,
  EX102: 9.1,
  EX103: 8.0,
  EX104: 9.5,
  EX201: 6.4,
  EX202: 8.7,
  EX203: 7.2,
  EX204: 6.9,
  EX301: 6.1,
  EX302: 7.5,
  EX303: 9.0,
  EX304: 6.2,
  EX305: 8.1,
  EX401: 8.8,
  EX402: 7.4,
  EX403: 6.8,
};

export const cursadas: Cursada[] = [
  ...Object.entries(NOTAS).map(([codigo, nota], i) => ({
    id: `c${i}`,
    alunoId: 'ana',
    disciplinaCodigo: codigo,
    semestre: SEMS[Number(codigo[2]) - 1]!,
    nota,
    frequencia: 0.9,
    situacao: 'aprovada' as const,
  })),
  ...['EX501', 'EX502', 'EX503', 'EX504'].map((codigo, i) => ({
    id: `k${i}`,
    alunoId: 'ana',
    disciplinaCodigo: codigo,
    semestre: '2026/2',
    nota: null,
    frequencia: null,
    situacao: 'cursando' as const,
  })),
];

type T = [
  cod: string,
  turma: string,
  horarios: Array<[Oferta['horarios'][number]['dia'], number]>,
  vagas: number,
  int: number,
  titulo?: string,
];
const TURMAS: T[] = [
  [
    'EX404',
    'T01',
    [
      ['seg', 0],
      ['qua', 0],
    ],
    45,
    52,
  ],
  [
    'EX404',
    'T02',
    [
      ['ter', 4],
      ['qui', 4],
    ],
    30,
    18,
  ],
  [
    'EX601',
    'T01',
    [
      ['ter', 2],
      ['qui', 2],
    ],
    60,
    94,
  ],
  [
    'EX601',
    'T02',
    [
      ['seg', 3],
      ['qua', 3],
    ],
    40,
    31,
  ],
  [
    'EX602',
    'T01',
    [
      ['ter', 1],
      ['sex', 1],
    ],
    50,
    22,
  ],
  [
    'EX603',
    'T01',
    [
      ['seg', 3],
      ['qua', 3],
    ],
    40,
    35,
  ],
  [
    'EX604',
    'T01',
    [
      ['ter', 0],
      ['qui', 0],
    ],
    40,
    12,
  ],
  [
    'EX704',
    'T01',
    [
      ['qui', 3],
      ['sex', 2],
    ],
    30,
    24,
    'Bioinformática',
  ],
  ['EX704', 'T02', [['qui', 3]], 30, 41, 'Visão Computacional'],
  ['EX802', 'T01', [['sex', 0]], 80, 40],
];

export const ofertas2027: Oferta[] = TURMAS.map(
  ([cod, turma, horarios, vagas, interessados, titulo]) => ({
    id: `2027-1-${cod}-${turma}`,
    semestre: '2027/1',
    disciplinaCodigo: cod,
    turma,
    titulo: titulo ?? null,
    professor: null,
    local: null,
    vagas,
    interessados,
    horarios: horarios.map(([dia, slot]) => ({ dia, slot })),
    atualizadaEm: null,
  }),
);

/** Plano do protótipo: S&S T01, IA T02, Compiladores, Bioinformática. */
export const planoPrototipo = [
  '2027-1-EX404-T01',
  '2027-1-EX601-T02',
  '2027-1-EX602-T01',
  '2027-1-EX704-T01',
];
