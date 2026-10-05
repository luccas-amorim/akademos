import { normalizarNota } from './formato';
import { compararSemestres } from './semestre';
import type { Cursada, Escala, Matriz } from './tipos';

/**
 * O que um aluno envia à comunidade, se consentir: a última nota de cada
 * disciplina cursada (aprovada ou reprovada), na escala 0–10 e arredondada a
 * 0,5. Sem nome, matrícula, conta, semestre nem frequência.
 */
export function contribuicaoAnonima(
  matriz: Matriz,
  cursadas: readonly Cursada[],
  escala: Escala,
): Record<string, number> {
  const daMatriz = new Set(matriz.disciplinas.map((d) => d.codigo));
  const ultimas = new Map<string, Cursada>();
  for (const c of [...cursadas].sort((a, b) => compararSemestres(a.semestre, b.semestre))) {
    if (c.nota === null || !daMatriz.has(c.disciplinaCodigo)) continue;
    if (c.situacao !== 'aprovada' && c.situacao !== 'reprovada') continue;
    ultimas.set(c.disciplinaCodigo, c);
  }
  const saida: Record<string, number> = {};
  for (const [codigo, c] of ultimas) {
    const n10 = Math.max(0, Math.min(10, normalizarNota(c.nota!, escala)));
    saida[codigo] = Math.round(n10 * 2) / 2;
  }
  return saida;
}
