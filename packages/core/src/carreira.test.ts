import { describe, expect, it } from 'vitest';
import { aderenciaAoObjetivo, coberturaDaCompetencia } from './carreira';
import type { SituacaoEfetiva } from './percurso';

const sit = new Map<string, SituacaoEfetiva>([
  ['A', 'ok'],
  ['B', 'cur'],
  ['C', 'lib'],
]);

describe('carreira', () => {
  it('conta aprovada como 1, em curso como 0,6 e atividades feitas como 1', () => {
    expect(coberturaDaCompetencia({ nome: 'x', disciplinas: ['A', 'B'] }, sit).percentual).toBe(80);
    const c = coberturaDaCompetencia(
      {
        nome: 'y',
        disciplinas: ['C'],
        atividades: [
          { titulo: 'IC', feito: true },
          { titulo: 'Congresso', feito: false },
        ],
      },
      sit,
    );
    expect(c.percentual).toBe(33);
    expect(c.faltando).toEqual(['C']);
    expect(c.atividadesPendentes).toEqual(['Congresso']);
  });

  it('aderência é a média das competências', () => {
    const a = aderenciaAoObjetivo(
      {
        id: 'o',
        alunoId: 'a',
        titulo: 'Dados',
        principal: true,
        competencias: [
          { nome: '1', disciplinas: ['A'] },
          { nome: '2', disciplinas: ['C'] },
        ],
      },
      sit,
    );
    expect(a.percentual).toBe(50);
  });

  it('objetivo sem competências tem aderência zero', () => {
    expect(
      aderenciaAoObjetivo(
        { id: 'o', alunoId: 'a', titulo: 'x', principal: true, competencias: [] },
        sit,
      ).percentual,
    ).toBe(0);
  });
});
