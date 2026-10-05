import type { Disciplina, Matriz } from '@akademos/core';
import type { CursadaBruta } from './tipos';

/** Remove acentos, caixa e pontuação: "Cálculo  III" → "calculo iii". */
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigramas(texto: string): Set<string> {
  const s = `  ${normalizarNome(texto)} `;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

/** Similaridade de trigramas (coeficiente de Jaccard), 0–1, como no pg_trgm. */
export function similaridade(a: string, b: string): number {
  const ta = trigramas(a);
  const tb = trigramas(b);
  if (!ta.size || !tb.size) return 0;
  let comum = 0;
  for (const t of ta) if (tb.has(t)) comum++;
  return comum / (ta.size + tb.size - comum);
}

export const LIMIAR_SIMILARIDADE = 0.8;

export interface Correspondencia {
  disciplina: Disciplina | null;
  por: 'codigo' | 'alternativo' | 'nome' | null;
  similaridade: number;
  /** Melhor candidata por nome, mesmo abaixo do limiar (sugestão na revisão). */
  sugestao: Disciplina | null;
}

/**
 * Casa uma linha do histórico com a matriz: pelo código, por um código
 * alternativo do registro e, se falhar, por nome (trigramas ≥ 0,8).
 */
export function corresponder(
  bruta: Pick<CursadaBruta, 'codigo' | 'nome'>,
  matriz: Matriz,
): Correspondencia {
  const codigo = bruta.codigo.toUpperCase();
  const direta = matriz.disciplinas.find((d) => d.codigo.toUpperCase() === codigo);
  if (direta) return { disciplina: direta, por: 'codigo', similaridade: 1, sugestao: null };
  const alt = matriz.disciplinas.find((d) =>
    d.codigosAlternativos.some((c) => c.toUpperCase() === codigo),
  );
  if (alt) return { disciplina: alt, por: 'alternativo', similaridade: 1, sugestao: null };

  let melhor: Disciplina | null = null;
  let nota = 0;
  for (const d of matriz.disciplinas) {
    const s = similaridade(bruta.nome, d.nome);
    if (s > nota) {
      nota = s;
      melhor = d;
    }
  }
  if (melhor && nota >= LIMIAR_SIMILARIDADE) {
    return { disciplina: melhor, por: 'nome', similaridade: nota, sugestao: null };
  }
  return { disciplina: null, por: null, similaridade: nota, sugestao: nota >= 0.2 ? melhor : null };
}
