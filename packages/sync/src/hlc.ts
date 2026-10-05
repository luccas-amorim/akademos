/**
 * Relógio lógico híbrido (Kulkarni et al., 2014). Cada escrita local recebe um
 * carimbo único e monotônico; ao receber ops remotas o relógio avança para não
 * gerar carimbos "do passado". Formato textual ordenável:
 *
 *   000001791163440:0000a:no
 *   └ ms (15 dígitos) └ contador base 36 └ id do aparelho
 */
export interface PartesHlc {
  ms: number;
  contador: number;
  no: string;
}

const SEP = ':';

export function formatarHlc({ ms, contador, no }: PartesHlc): string {
  return `${String(ms).padStart(15, '0')}${SEP}${contador.toString(36).padStart(5, '0')}${SEP}${no}`;
}

export function parseHlc(hlc: string): PartesHlc {
  const [ms, contador, no] = hlc.split(SEP);
  if (ms === undefined || contador === undefined || !no) throw new Error(`HLC inválido: ${hlc}`);
  return { ms: Number(ms), contador: parseInt(contador, 36), no };
}

export function compararHlc(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export class Hlc {
  #ms = 0;
  #contador = 0;

  constructor(
    readonly no: string,
    private readonly agora: () => number = Date.now,
  ) {
    if (!no || no.includes(SEP)) throw new Error(`Id de nó inválido para HLC: "${no}"`);
  }

  /** Carimbo para uma escrita local. */
  tick(): string {
    const fisico = this.agora();
    if (fisico > this.#ms) {
      this.#ms = fisico;
      this.#contador = 0;
    } else {
      this.#contador++;
    }
    return formatarHlc({ ms: this.#ms, contador: this.#contador, no: this.no });
  }

  /** Incorpora um carimbo recebido de outro aparelho. */
  receber(remoto: string): void {
    const r = parseHlc(remoto);
    const fisico = this.agora();
    const ms = Math.max(this.#ms, r.ms, fisico);
    if (ms === this.#ms && ms === r.ms) this.#contador = Math.max(this.#contador, r.contador) + 1;
    else if (ms === this.#ms) this.#contador++;
    else if (ms === r.ms) this.#contador = r.contador + 1;
    else this.#contador = 0;
    this.#ms = ms;
  }
}
