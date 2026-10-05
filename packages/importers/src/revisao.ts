import type { Cursada, Matriz } from '@akademos/core';
import { corresponder, type Correspondencia } from './correspondencia';
import type { CursadaBruta } from './tipos';

export type MotivoRevisao =
  'sem-equivalente' | 'tentativa-anterior' | 'situacao-desconhecida' | 'por-nome';

export interface LinhaRevisao {
  id: string;
  bruta: CursadaBruta;
  correspondencia: Correspondencia;
  /** `null` = reconhecida sem dúvida. */
  revisar: MotivoRevisao | null;
}

export interface Decisao {
  acao: 'importar' | 'ignorar';
  /** Disciplina da matriz escolhida na revisão (sobrepõe a correspondência). */
  disciplinaCodigo?: string;
}

/** Monta a tela de revisão: o que foi reconhecido e o que pede confirmação. */
export function montarRevisao(brutas: readonly CursadaBruta[], matriz: Matriz): LinhaRevisao[] {
  const linhas = brutas.map((bruta, i) => ({
    id: `${i}:${bruta.semestre}:${bruta.codigo}`,
    bruta,
    correspondencia: corresponder(bruta, matriz),
    revisar: null as MotivoRevisao | null,
  }));
  for (const l of linhas) {
    const codigo = l.correspondencia.disciplina?.codigo;
    if (!codigo) l.revisar = 'sem-equivalente';
    else if (!l.bruta.situacao) l.revisar = 'situacao-desconhecida';
    else if (
      // Reprovação seguida de nova tentativa: confirmar que é para registrar as duas.
      l.bruta.situacao === 'reprovada' &&
      linhas.some(
        (o) =>
          o !== l &&
          o.correspondencia.disciplina?.codigo === codigo &&
          o.bruta.semestre > l.bruta.semestre,
      )
    )
      l.revisar = 'tentativa-anterior';
    else if (l.correspondencia.por === 'nome') l.revisar = 'por-nome';
  }
  return linhas;
}

/** Decisão padrão: importar o que tem equivalente; ignorar o resto. */
export function decisaoPadrao(l: LinhaRevisao): Decisao {
  return l.correspondencia.disciplina && l.bruta.situacao
    ? { acao: 'importar' }
    : { acao: 'ignorar' };
}

/** Converte as linhas aprovadas na revisão em cursadas do aluno. */
export function cursadasDaRevisao(
  linhas: readonly LinhaRevisao[],
  decisoes: Readonly<Record<string, Decisao>>,
  alunoId: string,
): Cursada[] {
  const out: Cursada[] = [];
  for (const l of linhas) {
    const d = decisoes[l.id] ?? decisaoPadrao(l);
    if (d.acao !== 'importar') continue;
    const codigo = d.disciplinaCodigo ?? l.correspondencia.disciplina?.codigo;
    if (!codigo) continue;
    out.push({
      id: `imp-${l.bruta.semestre.replace('/', '-')}-${codigo}`,
      alunoId,
      disciplinaCodigo: codigo,
      semestre: l.bruta.semestre,
      nota: l.bruta.nota,
      frequencia: l.bruta.frequencia,
      situacao: l.bruta.situacao ?? 'aprovada',
    });
  }
  return out;
}

/**
 * Junta cursadas importadas às existentes: mesma disciplina no mesmo semestre
 * atualiza a linha que já havia (preserva o id, para a sincronização).
 */
export function mesclarCursadas(
  existentes: readonly Cursada[],
  novas: readonly Cursada[],
): Cursada[] {
  return novas.map((n) => {
    const igual = existentes.find(
      (e) => e.disciplinaCodigo === n.disciplinaCodigo && e.semestre === n.semestre,
    );
    return igual ? { ...n, id: igual.id } : n;
  });
}
