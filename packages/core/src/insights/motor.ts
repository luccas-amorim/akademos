import type { Insight, Severidade } from '../tipos';
import { prepararContexto, type EntradaInsights } from './contexto';
import { REGRAS, type Regra } from './regras';

const ORDEM_SEVERIDADE: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 };

/** Roda todas as regras e ordena: mais severo primeiro, mantendo a ordem das regras. */
export function gerarInsights(entrada: EntradaInsights, regras: Regra[] = REGRAS): Insight[] {
  const ctx = prepararContexto(entrada);
  const todos = regras.flatMap((r, i) => r(ctx).map((ins) => ({ ins, i })));
  return todos
    .sort(
      (a, b) =>
        ORDEM_SEVERIDADE[a.ins.severidade] - ORDEM_SEVERIDADE[b.ins.severidade] || a.i - b.i,
    )
    .map(({ ins }) => ins)
    .filter((ins) => {
      if (!ins.motivo.trim()) throw new Error(`Insight ${ins.id} sem motivo`);
      return true;
    });
}
