import { montarPacotes } from '@akademos/registry';
import { lerInstituicoes } from '@akademos/registry/node';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerDataDoPrazo } from './datas';

describe('lerDataDoPrazo', () => {
  const agora = new Date(2026, 9, 5, 12);
  it('aceita data futura em DD/MM/AAAA, às 9h', () => {
    expect(lerDataDoPrazo('20/11/2026', agora)).toEqual(new Date(2026, 10, 20, 9));
  });
  it('recusa data inválida ou passada', () => {
    expect(lerDataDoPrazo('31/02/2027', agora)).toBeNull();
    expect(lerDataDoPrazo('01/01/2020', agora)).toBeNull();
    expect(lerDataDoPrazo('2026-11-20', agora)).toBeNull();
  });
});

describe('catálogo embutido', () => {
  it('está em dia com o registro (rode pnpm --filter @akademos/mobile catalogo)', () => {
    const gerado = JSON.parse(
      readFileSync(new URL('./dados/catalogo.generated.json', import.meta.url), 'utf8'),
    ) as { entradas: unknown[] };
    const atual = lerInstituicoes().flatMap((arq) => montarPacotes(arq).entradas);
    expect(gerado.entradas).toEqual(JSON.parse(JSON.stringify(atual)));
  });
});
