/**
 * Seed de desenvolvimento: a aluna fictícia Ana Ribeiro, de Engenharia de
 * Computação na UFX (dados do protótipo em design/Akademos.dc.html).
 * Nada aqui corresponde a pessoa ou instituição real.
 */
import type {
  Cursada,
  Dia,
  EntradaDiario,
  Marco,
  Objetivo,
  Oferta,
  PacoteInstituicao,
  Plano,
  Repositorios,
} from '@akademos/core';

export const ANA_ID = 'ana';
export const MATRIZ_DA_ANA = 'ufx/eng-computacao/2019';

const SEMESTRES = ['2024/2', '2025/1', '2025/2', '2026/1', '2026/2'] as const;

/** [código, semestre ordinal, nota] das disciplinas aprovadas. */
const APROVADAS: Array<[string, number, number]> = [
  ['EX101', 1, 7.8],
  ['EX102', 1, 9.1],
  ['EX103', 1, 8.0],
  ['EX104', 1, 9.5],
  ['EX201', 2, 6.4],
  ['EX202', 2, 8.7],
  ['EX203', 2, 7.2],
  ['EX204', 2, 6.9],
  ['EX301', 3, 6.1],
  ['EX302', 3, 7.5],
  ['EX303', 3, 9.0],
  ['EX304', 3, 6.2],
  ['EX305', 3, 8.1],
  ['EX401', 4, 8.8],
  ['EX402', 4, 7.4],
  ['EX403', 4, 6.8],
];

const CURSANDO = ['EX501', 'EX502', 'EX503', 'EX504'];

function cursadas(): Cursada[] {
  const aprovadas = APROVADAS.map(([codigo, ordinal, nota], i) => ({
    id: `ana-c${String(i + 1).padStart(2, '0')}`,
    alunoId: ANA_ID,
    disciplinaCodigo: codigo,
    semestre: SEMESTRES[ordinal - 1]!,
    nota,
    frequencia: 0.86 + ((i * 7) % 13) / 100,
    situacao: 'aprovada' as const,
  }));
  const atuais = CURSANDO.map((codigo, i) => ({
    id: `ana-c${String(APROVADAS.length + i + 1).padStart(2, '0')}`,
    alunoId: ANA_ID,
    disciplinaCodigo: codigo,
    semestre: '2026/2',
    nota: null,
    frequencia: null,
    situacao: 'cursando' as const,
  }));
  return [...aprovadas, ...atuais];
}

type TurmaSeed = [
  disciplina: string,
  turma: string,
  titulo: string | null,
  professor: string,
  local: string,
  horarios: Array<[Dia, number]>,
  vagas: number,
  interessados: number,
];

const TURMAS_2026_2: TurmaSeed[] = [
  [
    'EX501',
    'T01',
    null,
    'Prof. Sérgio Alves',
    'sala 201',
    [
      ['seg', 0],
      ['qua', 0],
    ],
    50,
    41,
  ],
  [
    'EX502',
    'T01',
    null,
    'Profa. Marta Leal',
    'Lab 2',
    [
      ['ter', 1],
      ['qui', 1],
    ],
    45,
    39,
  ],
  [
    'EX503',
    'T01',
    null,
    'Prof. Rui Campos',
    'sala 305',
    [
      ['ter', 2],
      ['ter', 3],
    ],
    50,
    44,
  ],
  [
    'EX504',
    'T01',
    null,
    'Profa. Inês Duarte',
    'sala 110',
    [
      ['qui', 2],
      ['sex', 2],
    ],
    60,
    52,
  ],
];

const TURMAS_2027_1: TurmaSeed[] = [
  [
    'EX404',
    'T01',
    null,
    'Profa. Helena Lima',
    'sala 204',
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
    null,
    'Prof. Davi Rocha',
    'sala 110',
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
    null,
    'Prof. Ícaro Mendes',
    'Lab 3',
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
    null,
    'Profa. Lúcia Prado',
    'Lab 1',
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
    null,
    'Prof. Otávio Reis',
    'sala 302',
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
    null,
    'Profa. Rita Souza',
    'Lab 2',
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
    null,
    'Prof. Davi Rocha',
    'sala 204',
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
    'Bioinformática',
    'Prof. Caio Nunes',
    'sala 108',
    [
      ['qui', 3],
      ['sex', 2],
    ],
    30,
    24,
  ],
  ['EX704', 'T02', 'Visão Computacional', 'Profa. Bia Torres', 'Lab 3', [['qui', 3]], 30, 41],
  ['EX802', 'T01', null, 'Prof. André Matos', 'auditório', [['sex', 0]], 80, 40],
];

export const idDaOferta = (semestre: string, disciplina: string, turma: string) =>
  `${semestre.replace('/', '-')}-${disciplina}-${turma}`;

function ofertas(semestre: string, turmas: TurmaSeed[], atualizadaEm: string): Oferta[] {
  return turmas.map(
    ([disciplina, turma, titulo, professor, local, horarios, vagas, interessados]) => ({
      id: idDaOferta(semestre, disciplina, turma),
      semestre,
      disciplinaCodigo: disciplina,
      turma,
      titulo,
      professor,
      local,
      vagas,
      interessados,
      horarios: horarios.map(([dia, slot]) => ({ dia, slot })),
      atualizadaEm,
    }),
  );
}

function objetivos(): Objetivo[] {
  return [
    {
      id: 'ana-obj-1',
      alunoId: ANA_ID,
      titulo: 'Ciência de dados em saúde',
      principal: true,
      competencias: [
        { nome: 'Estatística e probabilidade', disciplinas: ['EX302', 'EX504'] },
        { nome: 'Programação e dados', disciplinas: ['EX102', 'EX202', 'EX401'] },
        {
          nome: 'Aprendizado de máquina',
          disciplinas: ['EX601', 'EX701'],
          atividades: [{ titulo: 'Curso livre de introdução a ML', feito: true }],
        },
        {
          nome: 'Bioestatística e saúde',
          disciplinas: ['EX504', 'EX704'],
          atividades: [{ titulo: 'Publicação na iniciação científica', feito: false }],
        },
        {
          nome: 'Ética e regulação de dados',
          disciplinas: ['EX802'],
          atividades: [{ titulo: 'Estudo de LGPD na iniciação científica', feito: true }],
        },
        {
          nome: 'Comunicação científica',
          disciplinas: ['EX801'],
          atividades: [
            { titulo: 'Iniciação científica', feito: true },
            { titulo: 'Apresentação no congresso de IC', feito: false },
          ],
        },
      ],
    },
    {
      id: 'ana-obj-2',
      alunoId: ANA_ID,
      titulo: 'Engenharia de software',
      principal: false,
      competencias: [
        { nome: 'Programação', disciplinas: ['EX102', 'EX202', 'EX303'] },
        { nome: 'Processos e arquitetura', disciplinas: ['EX503', 'EX603', 'EX702'] },
      ],
    },
  ];
}

const marcos = (): Marco[] =>
  [
    ['2026/2', 'Iniciação científica', 'Em andamento · laboratório de dados em saúde', false],
    ['2027/1', 'Inteligência Artificial e Bioinformática', 'No plano de 2027/1', false],
    ['2027/2', 'Estágio supervisionado', 'Meta: equipe de dados de um hospital', false],
    [
      '2028/1',
      'TCC e formatura',
      'Tema provisório: triagem clínica com aprendizado de máquina',
      false,
    ],
  ].map(([semestre, titulo, descricao, feito], i) => ({
    id: `ana-marco-${i + 1}`,
    alunoId: ANA_ID,
    semestre: semestre as string,
    titulo: titulo as string,
    descricao: descricao as string,
    feito: feito as boolean,
  }));

const diario = (): EntradaDiario[] =>
  [
    ['2026-03-12', 'Entrei na iniciação científica de dados em saúde. É isso que quero seguir.', 5],
    ['2025-08-20', 'Gostei mais de Probabilidade do que esperava. Talvez dados.', 4],
    ['2025-03-10', 'Quero trabalhar com desenvolvimento de jogos.', 3],
  ].map(([data, texto, humor], i) => ({
    id: `ana-diario-${i + 1}`,
    alunoId: ANA_ID,
    data: data as string,
    texto: texto as string,
    humor: humor as number,
  }));

export interface OpcoesSeed {
  /** Momento de referência para "lido do SIGAA há 3 h". */
  agora?: Date;
}

/** Instala o pacote da UFX e grava todos os dados da Ana numa transação. */
export async function semearAna(
  repos: Repositorios,
  pacote: PacoteInstituicao,
  { agora = new Date() }: OpcoesSeed = {},
): Promise<void> {
  if (pacote.matriz.id !== MATRIZ_DA_ANA) {
    throw new Error(`O seed da Ana usa a matriz ${MATRIZ_DA_ANA}, não ${pacote.matriz.id}`);
  }
  const leitura = new Date(agora.getTime() - 3 * 3600_000).toISOString();
  const atuais = ofertas('2026/2', TURMAS_2026_2, leitura);
  const proximas = ofertas('2027/1', TURMAS_2027_1, leitura);
  const planos: Plano[] = [
    {
      id: 'ana-plano-2026-2',
      alunoId: ANA_ID,
      semestre: '2026/2',
      turmas: atuais.map((o) => o.id),
      criadoEm: '2026-07-20T12:00:00.000Z',
    },
    {
      id: 'ana-plano-2027-1',
      alunoId: ANA_ID,
      semestre: '2027/1',
      turmas: [
        idDaOferta('2027/1', 'EX404', 'T01'),
        idDaOferta('2027/1', 'EX601', 'T02'),
        idDaOferta('2027/1', 'EX602', 'T01'),
        idDaOferta('2027/1', 'EX704', 'T01'),
      ],
      criadoEm: agora.toISOString(),
    },
  ];

  await repos.registro.instalar(pacote);
  await repos.transacao(async (tx) => {
    await tx.alunos.salvar({
      id: ANA_ID,
      nome: 'Ana Ribeiro',
      matricula: '20242001017',
      cursoId: pacote.curso.id,
      matrizId: pacote.matriz.id,
      ingresso: '2024/2',
    });
    for (const c of cursadas()) await tx.cursadas.salvar(c);
    for (const o of [...atuais, ...proximas]) await tx.ofertas.salvar(o);
    for (const p of planos) await tx.planos.salvar(p);
    for (const o of objetivos()) await tx.objetivos.salvar(o);
    for (const m of marcos()) await tx.marcos.salvar(m);
    for (const d of diario()) await tx.diario.salvar(d);
  });
}
