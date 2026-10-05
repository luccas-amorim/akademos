import type { Aluno, Cursada, PacoteInstituicao } from '@akademos/core';
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
