import { describe, expect, it } from 'vitest';
import { escala } from './__fixtures__/ana';
import {
  desnormalizarNota,
  formatarInteiro,
  formatarIntervalo,
  formatarNota,
  normalizarNota,
  tempoDecorrido,
} from './formato';

describe('formato', () => {
  it('formata notas em pt-BR', () => {
    expect(formatarNota(7.8)).toBe('7,8');
    expect(formatarNota(9)).toBe('9,0');
    expect(formatarNota(null)).toBe('—');
  });

  it('oculta notas quando pedido', () => {
    expect(formatarNota(7.8, { ocultar: true })).toBe('•,•');
    expect(formatarIntervalo({ min: 5.8, max: 6.9 }, { ocultar: true })).toBe('•,• – •,•');
  });

  it('formata intervalos', () => {
    expect(formatarIntervalo({ min: 5.8, max: 6.9 })).toBe('5,8–6,9');
  });

  it('normaliza para 0–10 e volta', () => {
    const cem = { ...escala, min: 0, max: 100, aprovacao: 50 };
    expect(normalizarNota(75, cem)).toBe(7.5);
    expect(desnormalizarNota(7.5, cem)).toBe(75);
    expect(normalizarNota(7, escala)).toBe(7);
  });

  it('formata inteiros com separador de milhar', () => {
    expect(formatarInteiro(1240)).toBe('1.240');
  });
});

describe('tempoDecorrido', () => {
  const agora = new Date('2026-10-04T21:00:00Z');
  const antes = (min: number) => new Date(agora.getTime() - min * 60_000);
  it('descreve intervalos curtos e longos', () => {
    expect(tempoDecorrido(antes(0), agora)).toBe('agora');
    expect(tempoDecorrido(antes(12), agora)).toBe('há 12 min');
    expect(tempoDecorrido(antes(180), agora)).toBe('há 3 h');
    expect(tempoDecorrido(antes(60 * 24), agora)).toBe('há 1 dia');
    expect(tempoDecorrido(antes(60 * 72), agora)).toBe('há 3 dias');
  });
});
