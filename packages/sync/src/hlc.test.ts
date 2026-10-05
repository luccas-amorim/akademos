import { describe, expect, it } from 'vitest';
import { Hlc, compararHlc, parseHlc } from './hlc';

describe('Hlc', () => {
  it('gera carimbos estritamente crescentes mesmo com o relógio parado', () => {
    const hlc = new Hlc('no-a', () => 1000);
    const a = hlc.tick();
    const b = hlc.tick();
    const c = hlc.tick();
    expect(compararHlc(a, b)).toBeLessThan(0);
    expect(compararHlc(b, c)).toBeLessThan(0);
    expect(parseHlc(c)).toEqual({ ms: 1000, contador: 2, no: 'no-a' });
  });

  it('a ordem textual é a ordem cronológica', () => {
    const hlc = new Hlc('no-a', () => 999);
    const antes = hlc.tick();
    const depois = new Hlc('no-a', () => 10_000).tick();
    expect(antes < depois).toBe(true);
  });

  it('avança ao receber um carimbo remoto do futuro', () => {
    let agora = 1000;
    const local = new Hlc('no-a', () => agora);
    const remoto = new Hlc('no-b', () => 5000).tick();
    local.receber(remoto);
    const proximo = local.tick();
    expect(compararHlc(remoto, proximo)).toBeLessThan(0);
    agora = 6000;
    expect(parseHlc(local.tick()).ms).toBe(6000);
  });

  it('desempata pelo nó quando tempo e contador coincidem', () => {
    const a = new Hlc('no-a', () => 1).tick();
    const b = new Hlc('no-b', () => 1).tick();
    expect(compararHlc(a, b)).toBeLessThan(0);
  });

  it('recusa nó com caractere separador', () => {
    expect(() => new Hlc('no:a', () => 1)).toThrow();
  });
});
