import type { Cursada } from './tipos';

export interface NotaNova {
  cursadaId: string;
  disciplinaCodigo: string;
  nota: number;
}

/**
 * Notas que apareceram entre dois retratos (ex.: antes e depois de uma
 * sincronização ou de um conector): cursada que não tinha nota e passou a ter.
 */
export function detectarNotasNovas(
  antes: readonly Cursada[],
  depois: readonly Cursada[],
): NotaNova[] {
  const anteriores = new Map(antes.map((c) => [c.id, c]));
  return depois.flatMap((c) => {
    const a = anteriores.get(c.id);
    if (c.nota === null || (a && a.nota !== null)) return [];
    return [{ cursadaId: c.id, disciplinaCodigo: c.disciplinaCodigo, nota: c.nota }];
  });
}
