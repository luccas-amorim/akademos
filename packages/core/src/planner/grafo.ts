/** Aresta "disciplina exige requisito". */
export interface Aresta {
  disciplinaCodigo: string;
  requerCodigo: string;
}

/**
 * Grafo dirigido acíclico de pré-requisitos. Correquisitos não entram: não
 * impõem ordem entre semestres.
 */
export class GrafoDePrerequisitos {
  readonly #exige = new Map<string, string[]>();
  readonly #destrava = new Map<string, string[]>();
  readonly #inexistentes: Aresta[] = [];
  readonly #profundidade = new Map<string, number>();

  constructor(
    readonly codigos: readonly string[],
    arestas: readonly Aresta[],
  ) {
    for (const c of codigos) {
      this.#exige.set(c, []);
      this.#destrava.set(c, []);
    }
    for (const a of arestas) {
      if (!this.#exige.has(a.disciplinaCodigo) || !this.#exige.has(a.requerCodigo)) {
        this.#inexistentes.push({
          disciplinaCodigo: a.disciplinaCodigo,
          requerCodigo: a.requerCodigo,
        });
        continue;
      }
      this.#exige.get(a.disciplinaCodigo)!.push(a.requerCodigo);
      this.#destrava.get(a.requerCodigo)!.push(a.disciplinaCodigo);
    }
  }

  requisitos(codigo: string): string[] {
    return this.#exige.get(codigo) ?? [];
  }

  destrava(codigo: string): string[] {
    return this.#destrava.get(codigo) ?? [];
  }

  inexistentes(): Aresta[] {
    return [...this.#inexistentes];
  }

  #alcance(inicio: string, vizinhos: (c: string) => string[]): Set<string> {
    const vistos = new Set<string>();
    const pilha = [...vizinhos(inicio)];
    while (pilha.length) {
      const c = pilha.pop()!;
      if (vistos.has(c)) continue;
      vistos.add(c);
      pilha.push(...vizinhos(c));
    }
    return vistos;
  }

  /** Tudo o que precisa vir antes (requisitos dos requisitos…). */
  ancestrais(codigo: string): Set<string> {
    return this.#alcance(codigo, (c) => this.requisitos(c));
  }

  /** Tudo o que depende desta disciplina, direta ou indiretamente. */
  descendentes(codigo: string): Set<string> {
    return this.#alcance(codigo, (c) => this.destrava(c));
  }

  /** Um ciclo, se existir (lista de códigos), ou `null`. */
  ciclo(): string[] | null {
    const estado = new Map<string, 'visitando' | 'feito'>();
    const caminho: string[] = [];
    const visitar = (c: string): string[] | null => {
      estado.set(c, 'visitando');
      caminho.push(c);
      for (const r of this.requisitos(c)) {
        if (estado.get(r) === 'visitando') return caminho.slice(caminho.indexOf(r));
        if (!estado.has(r)) {
          const achado = visitar(r);
          if (achado) return achado;
        }
      }
      caminho.pop();
      estado.set(c, 'feito');
      return null;
    };
    for (const c of this.codigos) {
      if (!estado.has(c)) {
        const achado = visitar(c);
        if (achado) return achado;
      }
    }
    return null;
  }

  /** Requisitos antes de quem os exige (algoritmo de Kahn). */
  ordemTopologica(): string[] {
    const grau = new Map(this.codigos.map((c) => [c, this.requisitos(c).length]));
    const fila = this.codigos.filter((c) => grau.get(c) === 0);
    const ordem: string[] = [];
    while (fila.length) {
      const c = fila.shift()!;
      ordem.push(c);
      for (const d of this.destrava(c)) {
        const g = grau.get(d)! - 1;
        grau.set(d, g);
        if (g === 0) fila.push(d);
      }
    }
    if (ordem.length !== this.codigos.length) {
      throw new Error(`A matriz tem um ciclo de pré-requisitos: ${this.ciclo()?.join(' → ')}`);
    }
    return ordem;
  }

  /** Número de semestres da cadeia mais longa que começa nesta disciplina. */
  profundidade(codigo: string): number {
    const memo = this.#profundidade.get(codigo);
    if (memo !== undefined) return memo;
    const p = 1 + Math.max(0, ...this.destrava(codigo).map((d) => this.profundidade(d)));
    this.#profundidade.set(codigo, p);
    return p;
  }
}
