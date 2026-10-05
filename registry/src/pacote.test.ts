import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { lerInstituicoes, RAIZ_REGISTRO } from './node';
import { montarPacotes, type ArquivosInstituicao } from './pacote';
import { SCHEMAS } from './schema';

const ufx = lerInstituicoes().find((a) => a.pasta === 'ufx');

describe('registro real', () => {
  it('UFX tem a matriz do protótipo', () => {
    const { entradas, problemas } = montarPacotes(ufx!);
    expect(problemas.filter((p) => p.grave)).toEqual([]);
    const { pacote, ficticia, modeloHistorico } = entradas[0]!;
    expect(ficticia).toBe(true);
    expect(pacote.matriz.id).toBe('ufx/eng-computacao/2019');
    expect(pacote.matriz.disciplinas).toHaveLength(32);
    expect(pacote.matriz.creditosTotal).toBe(128);
    expect(pacote.matriz.disciplinas.find((d) => d.codigo === 'EX404')).toMatchObject({
      nome: 'Sinais e Sistemas',
      cargaHoraria: 60,
      periodicidade: 'impar',
    });
    expect(pacote.matriz.prerequisitos).toContainEqual({
      disciplinaCodigo: 'EX604',
      requerCodigo: 'EX404',
      tipo: 'pre',
    });
    expect(pacote.instituicao.grade.faixas).toHaveLength(5);
    expect(modeloHistorico?.situacoes.APR).toBe('aprovada');
  });

  it('todas as instituições do registro são válidas', () => {
    for (const arq of lerInstituicoes()) {
      expect(
        montarPacotes(arq).problemas.filter((p) => p.grave),
        arq.pasta,
      ).toEqual([]);
    }
  });

  it('os JSON Schemas versionados estão em dia com o Zod', () => {
    for (const [nome, schema] of Object.entries(SCHEMAS)) {
      const salvo = JSON.parse(
        readFileSync(join(RAIZ_REGISTRO, 'schema', `${nome}.schema.json`), 'utf8'),
      );
      expect(salvo, `rode "pnpm --filter @akademos/registry schema"`).toEqual(
        JSON.parse(JSON.stringify(z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }))),
      );
    }
  });
});

describe('validação de coerência', () => {
  const base = (disciplinas: unknown[], creditos_total = 8): ArquivosInstituicao => ({
    pasta: 'tst',
    instituicao: {
      sigla: 'TST',
      nome: 'Teste',
      sistema: 'outro',
      escala: 'e',
      creditos_max_semestre: 20,
      grade: { dias: ['seg'], faixas: [{ inicio: '08:00', fim: '10:00' }] },
    },
    escala: {
      escalas: [{ id: 'e', nome: 'E', min: 0, max: 10, aprovacao: 5, frequencia_minima: 0.75 }],
    },
    matrizes: {
      'cursos/c/2020.yaml': {
        curso: { id: 'c', nome: 'C', grau: 'bacharelado' },
        ano: 2020,
        versao: '1',
        creditos_total,
        disciplinas,
      },
    },
  });
  const d = (codigo: string, semestre: number, requer: string[] = []) => ({
    codigo,
    nome: codigo,
    creditos: 4,
    semestre,
    area: 'Área',
    requer,
  });
  const mensagens = (arq: ArquivosInstituicao) =>
    montarPacotes(arq)
      .problemas.filter((p) => p.grave)
      .map((p) => p.mensagem);

  it('aceita uma matriz coerente', () => {
    expect(mensagens(base([d('A1', 1), d('B1', 2, ['A1'])]))).toEqual([]);
  });

  it('acusa pré-requisito inexistente', () => {
    expect(mensagens(base([d('A1', 1), d('B1', 2, ['ZZ9'])]))).toEqual([
      expect.stringContaining('ZZ9'),
    ]);
  });

  it('acusa ciclo', () => {
    expect(mensagens(base([d('A1', 1, ['B1']), d('B1', 2, ['A1'])]))).toEqual([
      expect.stringContaining('ciclo'),
    ]);
  });

  it('acusa créditos que não fecham', () => {
    expect(mensagens(base([d('A1', 1)], 8))).toEqual([expect.stringContaining('créditos')]);
  });

  it('acusa campo desconhecido e formato inválido', () => {
    const r = mensagens(base([{ ...d('a1', 1), extra: true }, d('B1', 2)]));
    expect(r.length).toBeGreaterThan(0);
  });

  it('acusa pasta com nome diferente da sigla', () => {
    expect(mensagens({ ...base([d('A1', 1), d('B1', 2)]), pasta: 'outra' })).toEqual([
      expect.stringContaining('"tst"'),
    ]);
  });
});
