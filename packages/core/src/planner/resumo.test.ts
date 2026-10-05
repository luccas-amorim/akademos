import { describe, expect, it } from 'vitest';
import { cursadas, instituicao, matriz, ofertas2027, planoPrototipo } from '../__fixtures__/ana';
import { resumirPlano } from './resumo';

const turmas = (ids: string[]) => ofertas2027.filter((o) => ids.includes(o.id));
const base = { matriz, instituicao, cursadas, semestreAtual: '2026/2' };

describe('resumirPlano', () => {
  it('plano do protótipo: 16 créditos, 16 h, sem conflito, formatura 2028/1', () => {
    const r = resumirPlano({ ...base, turmas: turmas(planoPrototipo) });
    expect(r).toMatchObject({
      semestre: '2027/1',
      creditos: 16,
      horas: 16,
      conflitos: [],
      formatura: '2028/1',
      formaturaIdeal: '2028/1',
    });
    expect(r.menorChance).toBeLessThan(90);
  });

  it('tirar Sinais e Sistemas atrasa a formatura em relação ao ideal', () => {
    const r = resumirPlano({
      ...base,
      turmas: turmas(planoPrototipo.filter((id) => !id.includes('EX404'))),
    });
    expect(r.formatura).toBe('2028/2');
    expect(r.formaturaIdeal).toBe('2028/1');
  });

  it('conta conflitos ao trocar de turma', () => {
    const r = resumirPlano({ ...base, turmas: turmas([...planoPrototipo, '2027-1-EX603-T01']) });
    expect(r.conflitos).toHaveLength(2);
  });

  it('plano vazio tem chance 100 e nenhuma hora', () => {
    const r = resumirPlano({ ...base, turmas: [] });
    expect(r).toMatchObject({ creditos: 0, horas: 0, menorChance: 100 });
  });
});
