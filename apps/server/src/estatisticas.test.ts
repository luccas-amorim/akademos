import { describe, expect, it } from 'vitest';
import { agregar, generalizarNota } from './estatisticas';

/** Gerador determinístico (mulberry32) para testar o ruído. */
function semente(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const base = { k: 10, epsilon: 1, aprovacao10: 6 };

describe('agregar', () => {
  const contribs = Array.from({ length: 40 }, (_, i) => {
    const x = 4 + (i % 10) * 0.6;
    return {
      A: x,
      B: Math.min(10, 1 + x * 0.8 + ((i * 7) % 5) * 0.1),
      C: i < 5 ? 7 : undefined,
    } as Record<string, number>;
  }).map((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)));

  it('publica disciplinas com n ≥ k e omite as demais', () => {
    const r = agregar('m', contribs, { ...base, aleatorio: semente(1) });
    expect(Object.keys(r.disciplinas).sort()).toEqual(['A', 'B']);
    expect(r.disciplinas.A!.n).toBe(40);
  });

  it('acha a correlação forte entre A e B, com ruído limitado', () => {
    const r = agregar('m', contribs, { ...base, aleatorio: semente(2) });
    const ab = r.correlacoes.find((c) => c.de === 'A' && c.para === 'B')!;
    expect(ab.r).toBeGreaterThan(0.9);
    expect(ab.inclinacao).toBeCloseTo(0.8, 1);
    expect(r.correlacoes.some((c) => c.de === 'C' || c.para === 'C')).toBe(false);
  });

  it('arredonda contagens à dezena e aplica ruído nas médias', () => {
    const medias = [3, 4, 5, 6, 7, 8].map(
      (s) => agregar('m', contribs.slice(0, 37), { ...base, aleatorio: semente(s) }).disciplinas.A!,
    );
    expect(medias[0]!.n).toBe(30);
    expect(new Set(medias.map((m) => m.media)).size).toBeGreaterThan(1);
    expect(
      Math.max(...medias.map((m) => m.media)) - Math.min(...medias.map((m) => m.media)),
    ).toBeLessThan(2);
  });

  it('calcula reprovação condicional para quem foi mal na anterior', () => {
    const r = agregar('m', contribs, { ...base, aleatorio: semente(5) });
    const cond = r.condicionais.find((c) => c.dado === 'A' && c.disciplina === 'B');
    expect(cond?.abaixoDe).toBe(6.5);
    expect(cond?.reprovacao).toBeGreaterThan(0.3);
  });
});

describe('generalizarNota', () => {
  it('arredonda a 0,5 e limita a 0–10', () => {
    expect(generalizarNota(7.26)).toBe(7.5);
    expect(generalizarNota(7.2)).toBe(7);
    expect(generalizarNota(11)).toBe(10);
  });
});
