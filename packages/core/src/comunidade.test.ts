import { describe, expect, it } from 'vitest';
import { cursadas, escala, matriz } from './__fixtures__/ana';
import { contribuicaoAnonima } from './comunidade';
import type { Cursada } from './tipos';

describe('contribuicaoAnonima', () => {
  it('envia só código e nota (0–10, a cada 0,5) das disciplinas com nota', () => {
    const c = contribuicaoAnonima(matriz, cursadas, escala);
    expect(Object.keys(c)).toHaveLength(16);
    expect(c.EX101).toBe(8); // 7,8 → 8
    expect(c.EX301).toBe(6); // 6,1 → 6
    expect(c.EX501).toBeUndefined(); // cursando, sem nota
    expect(JSON.stringify(c)).not.toMatch(/ana|2024|semestre/i);
  });

  it('usa a tentativa mais recente e ignora códigos fora da matriz', () => {
    const extra: Cursada[] = [
      {
        id: 'r',
        alunoId: 'ana',
        disciplinaCodigo: 'EX101',
        semestre: '2026/1',
        nota: 9.6,
        frequencia: 1,
        situacao: 'aprovada',
      },
      {
        id: 'x',
        alunoId: 'ana',
        disciplinaCodigo: 'ZZ999',
        semestre: '2026/1',
        nota: 5,
        frequencia: 1,
        situacao: 'aprovada',
      },
    ];
    const c = contribuicaoAnonima(matriz, [...cursadas, ...extra], escala);
    expect(c.EX101).toBe(9.5);
    expect(c.ZZ999).toBeUndefined();
  });

  it('normaliza escalas diferentes de 0–10', () => {
    const cem = { ...escala, max: 100, aprovacao: 50 };
    const c = contribuicaoAnonima(matriz, [{ ...cursadas[0]!, nota: 73 }], cem);
    expect(c.EX101).toBe(7.5);
  });
});
