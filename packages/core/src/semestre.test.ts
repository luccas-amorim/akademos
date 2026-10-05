import { describe, expect, it } from 'vitest';
import {
  compararSemestres,
  deslocarSemestre,
  ehSemestreImpar,
  intervaloDeSemestres,
  ordinalDoSemestre,
  parseSemestre,
  semestreDaData,
  semestreDoOrdinal,
} from './semestre';

describe('parseSemestre', () => {
  it('lê o formato AAAA/N', () => {
    expect(parseSemestre('2027/1')).toEqual({ ano: 2027, periodo: 1 });
    expect(parseSemestre('2026/2')).toEqual({ ano: 2026, periodo: 2 });
  });

  it('rejeita formatos inválidos', () => {
    expect(() => parseSemestre('2027-1')).toThrow();
    expect(() => parseSemestre('2027/3')).toThrow();
    expect(() => parseSemestre('27/1')).toThrow();
  });
});

describe('aritmética de semestres', () => {
  it('compara cronologicamente', () => {
    expect(compararSemestres('2026/2', '2027/1')).toBeLessThan(0);
    expect(compararSemestres('2027/1', '2026/2')).toBeGreaterThan(0);
    expect(compararSemestres('2027/1', '2027/1')).toBe(0);
    expect(['2027/1', '2025/2', '2026/1'].sort(compararSemestres)).toEqual([
      '2025/2',
      '2026/1',
      '2027/1',
    ]);
  });

  it('desloca para frente e para trás', () => {
    expect(deslocarSemestre('2026/2', 1)).toBe('2027/1');
    expect(deslocarSemestre('2026/2', 3)).toBe('2028/1');
    expect(deslocarSemestre('2027/1', -1)).toBe('2026/2');
    expect(deslocarSemestre('2027/1', 0)).toBe('2027/1');
  });

  it('calcula o ordinal a partir do ingresso', () => {
    expect(ordinalDoSemestre('2024/2', '2024/2')).toBe(1);
    expect(ordinalDoSemestre('2024/2', '2026/2')).toBe(5);
    expect(semestreDoOrdinal('2024/2', 5)).toBe('2026/2');
  });

  it('lista um intervalo inclusivo', () => {
    expect(intervaloDeSemestres('2026/2', '2028/1')).toEqual([
      '2026/2',
      '2027/1',
      '2027/2',
      '2028/1',
    ]);
    expect(intervaloDeSemestres('2028/1', '2026/2')).toEqual([]);
  });

  it('identifica a paridade do período', () => {
    expect(ehSemestreImpar('2027/1')).toBe(true);
    expect(ehSemestreImpar('2027/2')).toBe(false);
  });
});

describe('semestreDaData', () => {
  it('divide o ano em julho', () => {
    expect(semestreDaData(new Date(2026, 9, 4))).toBe('2026/2');
    expect(semestreDaData(new Date(2027, 0, 15))).toBe('2027/1');
    expect(semestreDaData(new Date(2027, 6, 31))).toBe('2027/1');
    expect(semestreDaData(new Date(2027, 7, 1))).toBe('2027/2');
  });
});
