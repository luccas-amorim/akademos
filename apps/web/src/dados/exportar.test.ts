import type { DadosLocais } from '@akademos/core';
import { describe, expect, it } from 'vitest';
import { historicoEmCsv, montarExportacao } from './exportar';

const dados = {
  matriz: {
    id: 'm',
    versaoRegistro: '1',
    disciplinas: [{ codigo: 'EX1', nome: 'Cálculo, "I"', creditos: 4, area: 'Mat' }],
  },
  cursadas: [
    {
      id: '1',
      alunoId: 'a',
      disciplinaCodigo: 'EX1',
      semestre: '2025/1',
      nota: 7.5,
      frequencia: 0.9,
      situacao: 'aprovada',
    },
  ],
} as unknown as DadosLocais;

describe('exportação', () => {
  it('gera CSV com cabeçalho e escapa vírgulas e aspas', () => {
    expect(historicoEmCsv(dados)).toBe(
      'semestre,codigo,disciplina,creditos,area,nota,frequencia,situacao\n' +
        '2025/1,EX1,"Cálculo, ""I""",4,Mat,7.5,0.9,aprovada\n',
    );
  });

  it('identifica formato e matriz no JSON', () => {
    const e = montarExportacao(dados, { cursada: [] }, new Date('2026-10-05T00:00:00Z'));
    expect(e).toEqual({
      formato: 'akademos/v1',
      exportadoEm: '2026-10-05T00:00:00.000Z',
      matriz: { id: 'm', versaoRegistro: '1' },
      tabelas: { cursada: [] },
    });
  });
});
