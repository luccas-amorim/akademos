import { compararSemestres, type Semestre } from './semestre';
import type { Cursada, Disciplina, Matriz } from './tipos';

/**
 * Situação efetiva de uma disciplina (docs/ARCHITECTURE.md):
 * `ok` aprovada · `cur` cursando · `lib` liberada · `blq` bloqueada ·
 * `pend` atrasada (semestre sugerido já passou e ainda não foi cursada).
 */
export type SituacaoEfetiva = 'ok' | 'cur' | 'lib' | 'blq' | 'pend';

const CUMPRIDA = new Set<Cursada['situacao']>(['aprovada', 'aproveitada']);

/** Cursadas de uma disciplina, da mais antiga para a mais recente. */
function historicoDe(codigo: string, cursadas: readonly Cursada[]): Cursada[] {
  return cursadas
    .filter((c) => c.disciplinaCodigo === codigo)
    .sort((a, b) => compararSemestres(a.semestre, b.semestre));
}

/** Situação "bruta" pelo histórico, sem olhar requisitos. */
function estadoNoHistorico(codigo: string, cursadas: readonly Cursada[]): 'ok' | 'cur' | null {
  const h = historicoDe(codigo, cursadas);
  if (h.some((c) => CUMPRIDA.has(c.situacao))) return 'ok';
  if (h.at(-1)?.situacao === 'cursando') return 'cur';
  return null;
}

export function situacaoEfetiva(
  disciplina: Disciplina,
  matriz: Matriz,
  cursadas: readonly Cursada[],
  ordinalAtual: number,
): SituacaoEfetiva {
  const estado = estadoNoHistorico(disciplina.codigo, cursadas);
  if (estado) return estado;
  const requisitos = matriz.prerequisitos.filter(
    (p) => p.disciplinaCodigo === disciplina.codigo && p.tipo === 'pre',
  );
  // Para planejar o próximo semestre, o que está em curso conta como cumprido.
  const cumpridos = requisitos.every((p) => estadoNoHistorico(p.requerCodigo, cursadas) !== null);
  if (!cumpridos) return 'blq';
  return disciplina.semestreSugerido < ordinalAtual ? 'pend' : 'lib';
}

export function situacoesEfetivas(
  matriz: Matriz,
  cursadas: readonly Cursada[],
  ordinalAtual: number,
): Map<string, SituacaoEfetiva> {
  return new Map(
    matriz.disciplinas.map((d) => [d.codigo, situacaoEfetiva(d, matriz, cursadas, ordinalAtual)]),
  );
}

/** Nota da cursada mais recente que tem nota (ou `null`). */
export function notaDaDisciplina(codigo: string, cursadas: readonly Cursada[]): number | null {
  const comNota = historicoDe(codigo, cursadas).filter((c) => c.nota !== null);
  return comNota.at(-1)?.nota ?? null;
}

export interface Integralizacao {
  creditosCumpridos: number;
  creditosCursando: number;
  creditosTotal: number;
  /** 0–100, arredondado. */
  percentual: number;
  disciplinasAprovadas: number;
}

export function integralizacao(matriz: Matriz, cursadas: readonly Cursada[]): Integralizacao {
  let cumpridos = 0;
  let cursando = 0;
  let aprovadas = 0;
  for (const d of matriz.disciplinas) {
    const e = estadoNoHistorico(d.codigo, cursadas);
    if (e === 'ok') {
      cumpridos += d.creditos;
      aprovadas++;
    } else if (e === 'cur') cursando += d.creditos;
  }
  return {
    creditosCumpridos: cumpridos,
    creditosCursando: cursando,
    creditosTotal: matriz.creditosTotal,
    percentual: matriz.creditosTotal ? Math.round((cumpridos / matriz.creditosTotal) * 100) : 0,
    disciplinasAprovadas: aprovadas,
  };
}

/** Cursadas que entram na média: com nota, aprovadas ou reprovadas. */
function contaNaMedia(c: Cursada): c is Cursada & { nota: number } {
  return c.nota !== null && (c.situacao === 'aprovada' || c.situacao === 'reprovada');
}

/** Média ponderada pelos créditos, na escala da instituição. */
export function mediaPonderada(matriz: Matriz, cursadas: readonly Cursada[]): number | null {
  const creditos = new Map(matriz.disciplinas.map((d) => [d.codigo, d.creditos]));
  let soma = 0;
  let peso = 0;
  for (const c of cursadas) {
    if (!contaNaMedia(c)) continue;
    const cr = creditos.get(c.disciplinaCodigo);
    if (!cr) continue;
    soma += c.nota * cr;
    peso += cr;
  }
  return peso ? soma / peso : null;
}

export function mediaPorSemestre(
  matriz: Matriz,
  cursadas: readonly Cursada[],
): Array<{ semestre: Semestre; media: number }> {
  const semestres = [...new Set(cursadas.filter(contaNaMedia).map((c) => c.semestre))].sort(
    compararSemestres,
  );
  return semestres.map((semestre) => ({
    semestre,
    media: mediaPonderada(
      matriz,
      cursadas.filter((c) => c.semestre === semestre),
    )!,
  }));
}

/** Áreas na ordem em que aparecem na matriz. */
export function areasDaMatriz(matriz: Matriz): string[] {
  return [...new Set(matriz.disciplinas.map((d) => d.area))];
}

export function mediaPorArea(
  matriz: Matriz,
  cursadas: readonly Cursada[],
): Array<{ area: string; media: number }> {
  return areasDaMatriz(matriz).flatMap((area) => {
    const codigos = new Set(matriz.disciplinas.filter((d) => d.area === area).map((d) => d.codigo));
    const media = mediaPonderada(
      matriz,
      cursadas.filter((c) => codigos.has(c.disciplinaCodigo)),
    );
    return media === null ? [] : [{ area, media }];
  });
}

export interface ProgressoArea {
  area: string;
  creditosCumpridos: number;
  creditosTotal: number;
}

export function progressoPorArea(matriz: Matriz, cursadas: readonly Cursada[]): ProgressoArea[] {
  return areasDaMatriz(matriz).map((area) => {
    const ds = matriz.disciplinas.filter((d) => d.area === area);
    return {
      area,
      creditosTotal: ds.reduce((s, d) => s + d.creditos, 0),
      creditosCumpridos: ds
        .filter((d) => estadoNoHistorico(d.codigo, cursadas) === 'ok')
        .reduce((s, d) => s + d.creditos, 0),
    };
  });
}
