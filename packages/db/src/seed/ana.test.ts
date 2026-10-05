import { carregarDados } from '@akademos/core';
import { montarPacotes } from '@akademos/registry';
import { lerInstituicoes } from '@akademos/registry/node';
import { Hlc } from '@akademos/sync';
import { describe, expect, it } from 'vitest';
import { criarDriverNode } from '../adapters/node';
import { abrirBanco } from '../banco';
import { semearAna } from './ana';

describe('seed da Ana', () => {
  it('grava o percurso do protótipo e pode ser recarregado', async () => {
    const ufx = lerInstituicoes().find((i) => i.pasta === 'ufx')!;
    const [entrada] = montarPacotes(ufx).entradas;
    const banco = await abrirBanco(criarDriverNode(), new Hlc('teste'));
    await semearAna(banco.repos, entrada!.pacote, { agora: new Date('2026-10-04T21:00:00Z') });

    const dados = await carregarDados(banco.repos);
    expect(dados?.aluno.nome).toBe('Ana Ribeiro');
    expect(dados?.cursadas.filter((c) => c.situacao === 'aprovada')).toHaveLength(16);
    expect(dados?.cursadas.filter((c) => c.situacao === 'cursando')).toHaveLength(4);
    expect(dados?.ofertas.filter((o) => o.semestre === '2027/1')).toHaveLength(10);
    expect(dados?.planos.find((p) => p.semestre === '2027/1')?.turmas).toHaveLength(4);
    expect(dados?.objetivos.find((o) => o.principal)?.titulo).toBe('Ciência de dados em saúde');
    expect(dados?.marcos).toHaveLength(4);
    expect(dados?.diario).toHaveLength(3);
    // Toda oferta planejada existe.
    const ids = new Set(dados?.ofertas.map((o) => o.id));
    for (const p of dados!.planos) for (const t of p.turmas) expect(ids.has(t), t).toBe(true);
    await banco.fechar();
  });
});
