import { describe, expect, it } from 'vitest';
import { GrafoDePrerequisitos } from './grafo';

const arestas = [
  { disciplinaCodigo: 'B', requerCodigo: 'A' },
  { disciplinaCodigo: 'C', requerCodigo: 'B' },
  { disciplinaCodigo: 'D', requerCodigo: 'A' },
];

describe('GrafoDePrerequisitos', () => {
  const g = new GrafoDePrerequisitos(['A', 'B', 'C', 'D', 'E'], arestas);

  it('lista o que cada disciplina exige e destrava', () => {
    expect(g.requisitos('C')).toEqual(['B']);
    expect(g.destrava('A').sort()).toEqual(['B', 'D']);
    expect(g.requisitos('E')).toEqual([]);
  });

  it('calcula requisitos e dependentes transitivos', () => {
    expect([...g.ancestrais('C')].sort()).toEqual(['A', 'B']);
    expect([...g.descendentes('A')].sort()).toEqual(['B', 'C', 'D']);
  });

  it('ordena topologicamente', () => {
    const ordem = g.ordemTopologica();
    expect(ordem.indexOf('A')).toBeLessThan(ordem.indexOf('B'));
    expect(ordem.indexOf('B')).toBeLessThan(ordem.indexOf('C'));
    expect(ordem).toHaveLength(5);
  });

  it('mede a cadeia mais longa que parte de cada disciplina', () => {
    expect(g.profundidade('A')).toBe(3); // A → B → C
    expect(g.profundidade('D')).toBe(1);
  });

  it('detecta ciclos e arestas para disciplinas inexistentes', () => {
    const ciclico = new GrafoDePrerequisitos(
      ['A', 'B'],
      [
        { disciplinaCodigo: 'A', requerCodigo: 'B' },
        { disciplinaCodigo: 'B', requerCodigo: 'A' },
      ],
    );
    expect(ciclico.ciclo()).toEqual(expect.arrayContaining(['A', 'B']));
    expect(() => ciclico.ordemTopologica()).toThrow(/ciclo/i);
    expect(g.ciclo()).toBeNull();
    const solto = new GrafoDePrerequisitos(['A'], [{ disciplinaCodigo: 'A', requerCodigo: 'Z' }]);
    expect(solto.inexistentes()).toEqual([{ disciplinaCodigo: 'A', requerCodigo: 'Z' }]);
  });
});
