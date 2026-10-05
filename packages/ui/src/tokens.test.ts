import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Cor, cores, nomeDaVariavel } from './tokens';

const css = readFileSync(fileURLToPath(new URL('./styles.css', import.meta.url)), 'utf8');

describe('tokens', () => {
  it('styles.css declara cada cor de tokens.ts com o mesmo valor', () => {
    for (const [nome, hex] of Object.entries(cores)) {
      const variavel = nomeDaVariavel(nome as Cor);
      expect(css, `${variavel} ausente ou divergente`).toContain(`${variavel}: ${hex};`);
    }
  });

  it('usa os valores de docs/DESIGN.md para as cores principais', () => {
    expect(cores.bg).toBe('#f6f5f1');
    expect(cores.primary).toBe('#1e3a8a');
    expect(cores.olive).toBe('#5a6e2e');
    expect(cores.danger).toBe('#a33a2a');
  });

  it('converte nomes para variáveis CSS', () => {
    expect(nomeDaVariavel('ink2')).toBe('--ink-2');
    expect(nomeDaVariavel('primaryTintSoft')).toBe('--primary-tint-soft');
  });
});
