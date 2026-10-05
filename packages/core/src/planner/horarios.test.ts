import { describe, expect, it } from 'vitest';
import { instituicao } from '../__fixtures__/ana';
import { descreverHorarios, rotuloFaixa } from './horarios';

const g = instituicao.grade;

describe('descreverHorarios', () => {
  it('agrupa dias com a mesma faixa', () => {
    expect(
      descreverHorarios(
        [
          { dia: 'qua', slot: 0 },
          { dia: 'seg', slot: 0 },
        ],
        g,
      ),
    ).toBe('Seg, Qua · 08–10');
  });

  it('junta faixas contíguas', () => {
    expect(
      descreverHorarios(
        [
          { dia: 'ter', slot: 2 },
          { dia: 'ter', slot: 3 },
        ],
        g,
      ),
    ).toBe('Ter · 14–18');
  });

  it('lista faixas diferentes por dia', () => {
    expect(
      descreverHorarios(
        [
          { dia: 'qui', slot: 3 },
          { dia: 'sex', slot: 2 },
        ],
        g,
      ),
    ).toBe('Qui, Sex · 16–18 / 14–16');
  });

  it('mostra minutos quando existem', () => {
    expect(rotuloFaixa({ inicio: '19:00', fim: '20:40' })).toBe('19–20:40');
    expect(descreverHorarios([], g)).toBe('sem horário');
  });
});
