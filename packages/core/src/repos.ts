import type {
  Aluno,
  Cursada,
  Curso,
  EntradaDiario,
  Escala,
  Instituicao,
  Marco,
  Matriz,
  Objetivo,
  Oferta,
  Plano,
} from './tipos';

/**
 * Repositórios que o domínio recebe por injeção (regra 4 do CLAUDE.md).
 * Implementados em `packages/db` sobre SQLite; em testes, em memória.
 */
export interface Colecao<T extends { id: string }> {
  listar(): Promise<T[]>;
  obter(id: string): Promise<T | null>;
  salvar(item: T): Promise<void>;
  apagar(id: string): Promise<void>;
}

/** Pacote de uma instituição como vem do registro. */
export interface PacoteInstituicao {
  instituicao: Instituicao;
  escala: Escala;
  curso: Curso;
  matriz: Matriz;
}

export interface Repositorios {
  /** Registro instalado no aparelho. */
  registro: {
    instalar(pacote: PacoteInstituicao): Promise<void>;
    obter(matrizId: string): Promise<PacoteInstituicao | null>;
  };
  alunos: Colecao<Aluno>;
  cursadas: Colecao<Cursada>;
  ofertas: Colecao<Oferta>;
  planos: Colecao<Plano>;
  objetivos: Colecao<Objetivo>;
  marcos: Colecao<Marco>;
  diario: Colecao<EntradaDiario>;
  /**
   * Executa as escritas como uma unidade. Use os repositórios recebidos em `tx`:
   * os de fora esperam a transação terminar.
   */
  transacao<R>(fn: (tx: RepositoriosTx) => Promise<R>): Promise<R>;
}

export type RepositoriosTx = Omit<Repositorios, 'transacao'>;

/** Tudo o que as telas precisam, carregado de uma vez (o volume é pequeno). */
export interface DadosLocais extends PacoteInstituicao {
  aluno: Aluno;
  cursadas: Cursada[];
  ofertas: Oferta[];
  planos: Plano[];
  objetivos: Objetivo[];
  marcos: Marco[];
  diario: EntradaDiario[];
}

export async function carregarDados(repos: Repositorios): Promise<DadosLocais | null> {
  const [aluno] = await repos.alunos.listar();
  if (!aluno) return null;
  const pacote = await repos.registro.obter(aluno.matrizId);
  if (!pacote) return null;
  const [cursadas, ofertas, planos, objetivos, marcos, diario] = await Promise.all([
    repos.cursadas.listar(),
    repos.ofertas.listar(),
    repos.planos.listar(),
    repos.objetivos.listar(),
    repos.marcos.listar(),
    repos.diario.listar(),
  ]);
  return {
    ...pacote,
    aluno,
    cursadas: cursadas.filter((c) => c.alunoId === aluno.id),
    ofertas,
    planos: planos.filter((p) => p.alunoId === aluno.id),
    objetivos: objetivos.filter((o) => o.alunoId === aluno.id),
    marcos: marcos.filter((m) => m.alunoId === aluno.id),
    diario: diario.filter((d) => d.alunoId === aluno.id),
  };
}
