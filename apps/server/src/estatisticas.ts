/**
 * Agregados anônimos publicados em /stats (docs/ARCHITECTURE.md › Privacidade).
 *
 * - k-anonimato: nenhuma célula com menos de `k` contribuições é publicada.
 * - Privacidade diferencial: médias, taxas e coeficientes recebem ruído de
 *   Laplace com escala sensibilidade/ε; contagens são arredondadas para baixo
 *   à dezena. ε é documentado no README do servidor.
 */
import type { EstatisticasComunidade } from '@akademos/core';

export interface OpcoesAgregacao {
  k: number;
  epsilon: number;
  /** Nota de aprovação na escala 0–10. */
  aprovacao10: number;
  /** Fonte de aleatoriedade em [0, 1) (injetável para testes). */
  aleatorio?: () => number;
}

type Notas = Record<string, number>;

function laplace(escala: number, aleatorio: () => number): number {
  const u = aleatorio() - 0.5;
  return -escala * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

const arred = (x: number, casas = 2) => Math.round(x * 10 ** casas) / 10 ** casas;
const limitar = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const dezena = (n: number) => Math.floor(n / 10) * 10;

function mediaDesvio(xs: number[]) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, xs.length - 1);
  return { media: m, desvio: Math.sqrt(v) };
}

export function agregar(
  matrizId: string,
  contribuicoes: readonly Notas[],
  o: OpcoesAgregacao,
): EstatisticasComunidade {
  const rnd = o.aleatorio ?? Math.random;
  const disciplinas = [...new Set(contribuicoes.flatMap((c) => Object.keys(c)))].sort();
  const saida: EstatisticasComunidade = {
    matrizId,
    geradoEm: new Date().toISOString(),
    k: o.k,
    disciplinas: {},
    correlacoes: [],
    condicionais: [],
  };

  for (const d of disciplinas) {
    const xs = contribuicoes.map((c) => c[d]).filter((x): x is number => x !== undefined);
    if (xs.length < o.k) continue;
    const { media, desvio } = mediaDesvio(xs);
    const reprov = xs.filter((x) => x < o.aprovacao10).length / xs.length;
    saida.disciplinas[d] = {
      n: dezena(xs.length),
      media: arred(limitar(media + laplace(10 / xs.length / o.epsilon, rnd), 0, 10), 1),
      desvio: arred(desvio, 2),
      reprovacao: arred(limitar(reprov + laplace(1 / xs.length / o.epsilon, rnd), 0, 1), 2),
    };
  }

  for (const de of disciplinas) {
    for (const para of disciplinas) {
      if (de === para) continue;
      const pares = contribuicoes
        .filter((c) => c[de] !== undefined && c[para] !== undefined)
        .map((c) => [c[de]!, c[para]!] as const);
      if (pares.length < o.k) continue;
      const x = mediaDesvio(pares.map((p) => p[0]));
      const y = mediaDesvio(pares.map((p) => p[1]));
      if (x.desvio === 0 || y.desvio === 0) continue;
      const cov =
        pares.reduce((s, [a, b]) => s + (a - x.media) * (b - y.media), 0) / (pares.length - 1);
      const r = limitar(
        cov / (x.desvio * y.desvio) + laplace(2 / pares.length / o.epsilon, rnd),
        -1,
        1,
      );
      const inclinacao = cov / x.desvio ** 2;
      const intercepto = y.media - inclinacao * x.media;
      const residuo = Math.sqrt(
        pares.reduce((s, [a, b]) => s + (b - (intercepto + inclinacao * a)) ** 2, 0) /
          Math.max(1, pares.length - 2),
      );
      // Só publica pares com algum poder preditivo e no sentido do percurso.
      if (Math.abs(r) < 0.3) continue;
      saida.correlacoes.push({
        de,
        para,
        r: arred(r),
        n: dezena(pares.length),
        inclinacao: arred(inclinacao, 3),
        intercepto: arred(intercepto, 3),
        residuo: arred(residuo, 2),
      });
      // Reprovação condicional: quem teve nota baixa em `de`.
      const limiar = o.aprovacao10 + 0.5;
      const baixos = pares.filter(([a]) => a < limiar);
      if (baixos.length >= o.k) {
        const taxa = baixos.filter(([, b]) => b < o.aprovacao10).length / baixos.length;
        saida.condicionais.push({
          disciplina: para,
          dado: de,
          abaixoDe: limiar,
          reprovacao: arred(limitar(taxa + laplace(1 / baixos.length / o.epsilon, rnd), 0, 1)),
          n: dezena(baixos.length),
        });
      }
    }
  }
  return saida;
}

/** Arredonda a nota a 0,5 antes de guardar: reduz o poder de reidentificação. */
export function generalizarNota(nota10: number): number {
  return Math.round(limitar(nota10, 0, 10) * 2) / 2;
}
