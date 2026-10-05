/** Semestre letivo no formato `AAAA/N` (ex.: `2027/1`). */
export type Semestre = string;

export interface SemestreParts {
  ano: number;
  periodo: 1 | 2;
}

const FORMATO = /^(\d{4})\/([12])$/;

export function parseSemestre(semestre: Semestre): SemestreParts {
  const m = FORMATO.exec(semestre);
  if (!m) throw new Error(`Semestre inválido: "${semestre}" (use AAAA/N, ex.: 2027/1)`);
  return { ano: Number(m[1]), periodo: Number(m[2]) as 1 | 2 };
}

export function ehSemestreValido(semestre: string): boolean {
  return FORMATO.test(semestre);
}

/** Índice absoluto, útil para aritmética: 2027/1 → 4054. */
function indice(semestre: Semestre): number {
  const { ano, periodo } = parseSemestre(semestre);
  return ano * 2 + (periodo - 1);
}

function deIndice(i: number): Semestre {
  return `${Math.floor(i / 2)}/${(i % 2) + 1}`;
}

export function compararSemestres(a: Semestre, b: Semestre): number {
  return indice(a) - indice(b);
}

export function deslocarSemestre(semestre: Semestre, n: number): Semestre {
  return deIndice(indice(semestre) + n);
}

/** Posição do semestre no curso, contando o de ingresso como 1. */
export function ordinalDoSemestre(ingresso: Semestre, semestre: Semestre): number {
  return indice(semestre) - indice(ingresso) + 1;
}

export function semestreDoOrdinal(ingresso: Semestre, ordinal: number): Semestre {
  return deslocarSemestre(ingresso, ordinal - 1);
}

export function intervaloDeSemestres(de: Semestre, ate: Semestre): Semestre[] {
  const out: Semestre[] = [];
  for (let i = indice(de); i <= indice(ate); i++) out.push(deIndice(i));
  return out;
}

export function ehSemestreImpar(semestre: Semestre): boolean {
  return parseSemestre(semestre).periodo === 1;
}
