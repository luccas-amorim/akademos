import type {
  Aluno,
  Cursada,
  Marco,
  Objetivo,
  Oferta,
  PacoteInstituicao,
  Plano,
} from '@akademos/core';
import { MATRIZ_DA_ANA, semearAna } from '@akademos/db/seed';
import { mesclarCursadas } from '@akademos/importers';
import { entradaDaMatriz } from './catalogo';
import { store } from './store';

const novoId = () => crypto.randomUUID();

/** Carrega a aluna fictícia Ana (UFX) para explorar o Akademos. */
export async function carregarExemplo(): Promise<void> {
  const entrada = entradaDaMatriz(MATRIZ_DA_ANA);
  if (!entrada) throw new Error('A matriz de exemplo não está no catálogo.');
  await store.escrever((repos) => semearAna(repos, entrada.pacote));
}

export interface DadosDoCurso {
  pacote: PacoteInstituicao;
  nome: string;
  ingresso: string;
  matricula: string | null;
}

/** Instala a matriz escolhida e cria (ou atualiza) o perfil do aluno. */
export async function definirCurso(d: DadosDoCurso, existente: Aluno | null): Promise<void> {
  await store.escrever(async (repos) => {
    await repos.registro.instalar(d.pacote);
    await repos.alunos.salvar({
      id: existente?.id ?? novoId(),
      nome: d.nome.trim(),
      matricula: d.matricula?.trim() || null,
      cursoId: d.pacote.curso.id,
      matrizId: d.pacote.matriz.id,
      ingresso: d.ingresso,
    });
  });
}

/** Grava cursadas importadas, atualizando as que já existiam no mesmo semestre. */
export async function importarCursadas(
  novas: Cursada[],
  existentes: readonly Cursada[],
): Promise<number> {
  const mescladas = mesclarCursadas(existentes, novas);
  await store.escrever((repos) =>
    repos.transacao(async (tx) => {
      for (const c of mescladas) await tx.cursadas.salvar(c);
    }),
  );
  return mescladas.length;
}

export async function apagarCursada(id: string): Promise<void> {
  await store.escrever((repos) => repos.cursadas.apagar(id));
}

/** Grava as turmas escolhidas para um semestre (um plano por semestre). */
export async function salvarPlano(
  alunoId: string,
  semestre: string,
  turmas: string[],
  existente: Plano | undefined,
): Promise<void> {
  await store.escrever((repos) =>
    repos.planos.salvar({
      id: existente?.id ?? novoId(),
      alunoId,
      semestre,
      turmas,
      criadoEm: existente?.criadoEm ?? new Date().toISOString(),
    }),
  );
}

/** Turma lançada à mão (quando não há conector para a instituição). */
export async function salvarOferta(oferta: Omit<Oferta, 'id'> & { id?: string }): Promise<string> {
  const id = oferta.id ?? novoId();
  await store.escrever((repos) => repos.ofertas.salvar({ ...oferta, id }));
  return id;
}

export async function apagarOferta(id: string): Promise<void> {
  await store.escrever((repos) => repos.ofertas.apagar(id));
}

/* ——— Carreira ——— */

export async function salvarObjetivo(o: Omit<Objetivo, 'id'> & { id?: string }): Promise<void> {
  await store.escrever((repos) => repos.objetivos.salvar({ ...o, id: o.id ?? novoId() }));
}

/** Um só objetivo principal por aluno. */
export async function tornarPrincipal(objetivos: readonly Objetivo[], id: string): Promise<void> {
  await store.escrever((repos) =>
    repos.transacao(async (tx) => {
      for (const o of objetivos) await tx.objetivos.salvar({ ...o, principal: o.id === id });
    }),
  );
}

export async function apagarObjetivo(id: string): Promise<void> {
  await store.escrever((repos) => repos.objetivos.apagar(id));
}

export async function salvarMarco(m: Omit<Marco, 'id'> & { id?: string }): Promise<void> {
  await store.escrever((repos) => repos.marcos.salvar({ ...m, id: m.id ?? novoId() }));
}

export async function apagarMarco(id: string): Promise<void> {
  await store.escrever((repos) => repos.marcos.apagar(id));
}

export async function registrarNoDiario(
  alunoId: string,
  texto: string,
  data = new Date(),
): Promise<void> {
  await store.escrever((repos) =>
    repos.diario.salvar({
      id: novoId(),
      alunoId,
      data: data.toISOString().slice(0, 10),
      texto: texto.trim(),
      humor: null,
    }),
  );
}

export async function apagarDoDiario(id: string): Promise<void> {
  await store.escrever((repos) => repos.diario.apagar(id));
}
