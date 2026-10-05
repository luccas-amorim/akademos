import type { Cursada, PacoteInstituicao } from '@akademos/core';
import { Hlc } from '@akademos/sync';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { criarDriverNode } from './adapters/node';
import { abrirBanco, type Banco } from './banco';

const pacote: PacoteInstituicao = {
  escala: { id: 'ufx-0-10', nome: '0 a 10', min: 0, max: 10, aprovacao: 6, frequenciaMinima: 0.75 },
  instituicao: {
    id: 'ufx',
    sigla: 'UFX',
    nome: 'Universidade Federal de Exemplo',
    escalaId: 'ufx-0-10',
    sistema: 'sigaa',
    creditosMaxSemestre: 24,
    grade: { dias: ['seg', 'ter'], faixas: [{ inicio: '08:00', fim: '10:00' }] },
  },
  curso: { id: 'ufx/ec', instituicaoId: 'ufx', nome: 'Eng. de Computação', grau: 'bacharelado' },
  matriz: {
    id: 'ufx/ec/2019',
    cursoId: 'ufx/ec',
    ano: 2019,
    creditosTotal: 8,
    versaoRegistro: '1',
    disciplinas: [
      {
        codigo: 'EX101',
        matrizId: 'ufx/ec/2019',
        nome: 'Cálculo I',
        creditos: 4,
        cargaHoraria: 60,
        semestreSugerido: 1,
        area: 'Matemática',
        tipo: 'obrigatoria',
        periodicidade: 'ambos',
        codigosAlternativos: ['MAT0101'],
      },
      {
        codigo: 'EX201',
        matrizId: 'ufx/ec/2019',
        nome: 'Cálculo II',
        creditos: 4,
        cargaHoraria: 60,
        semestreSugerido: 2,
        area: 'Matemática',
        tipo: 'obrigatoria',
        periodicidade: 'ambos',
        codigosAlternativos: [],
      },
    ],
    prerequisitos: [{ disciplinaCodigo: 'EX201', requerCodigo: 'EX101', tipo: 'pre' }],
  },
};

const cursada = (id: string, nota: number | null): Cursada => ({
  id,
  alunoId: 'a1',
  disciplinaCodigo: 'EX101',
  semestre: '2024/2',
  nota,
  frequencia: 0.9,
  situacao: 'aprovada',
});

let abertos: Banco[] = [];
let tick = 0;
const relogio = (no: string) => new Hlc(no, () => ++tick);

async function novo(no = 'a', caminho?: string) {
  const b = await abrirBanco(criarDriverNode(caminho), relogio(no));
  abertos.push(b);
  return b;
}

afterEach(async () => {
  for (const b of abertos) await b.fechar().catch(() => undefined);
  abertos = [];
});

describe('banco local', () => {
  it('instala e lê o pacote do registro', async () => {
    const b = await novo();
    await b.repos.registro.instalar(pacote);
    await b.repos.registro.instalar(pacote); // idempotente
    const lido = await b.repos.registro.obter('ufx/ec/2019');
    expect(lido?.matriz.disciplinas.map((d) => d.codigo).sort()).toEqual(['EX101', 'EX201']);
    expect(lido?.matriz.disciplinas.find((d) => d.codigo === 'EX101')?.codigosAlternativos).toEqual(
      ['MAT0101'],
    );
    expect(lido?.matriz.prerequisitos).toEqual(pacote.matriz.prerequisitos);
    expect(lido?.instituicao.grade).toEqual(pacote.instituicao.grade);
  });

  it('grava, lê e apaga (logicamente) dados do aluno', async () => {
    const b = await novo();
    await b.repos.cursadas.salvar(cursada('c1', 7.8));
    expect(await b.repos.cursadas.obter('c1')).toEqual(cursada('c1', 7.8));
    await b.repos.cursadas.apagar('c1');
    expect(await b.repos.cursadas.listar()).toEqual([]);
    expect(await b.repos.cursadas.obter('c1')).toBeNull();
  });

  it('registra uma op por coluna alterada', async () => {
    const b = await novo();
    await b.repos.cursadas.salvar(cursada('c1', 7.8));
    const criacao = await b.ops.locaisDesde(null);
    expect(criacao.map((o) => o.coluna).sort()).toEqual(
      [
        'aluno_id',
        'apagado',
        'disciplina_codigo',
        'frequencia',
        'nota',
        'semestre',
        'situacao',
      ].sort(),
    );
    const cursor = criacao.at(-1)!.hlc;
    await b.repos.cursadas.salvar(cursada('c1', 8.1));
    const edicao = await b.ops.locaisDesde(cursor);
    expect(edicao).toEqual([expect.objectContaining({ coluna: 'nota', valor: 8.1 })]);
    await b.repos.cursadas.salvar(cursada('c1', 8.1)); // sem mudança, sem op
    expect(await b.ops.locaisDesde(edicao[0]!.hlc)).toEqual([]);
  });

  it('desfaz a transação inteira em caso de erro', async () => {
    const b = await novo();
    await expect(
      b.repos.transacao(async (tx) => {
        await tx.cursadas.salvar(cursada('c1', 5));
        throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');
    expect(await b.repos.cursadas.listar()).toEqual([]);
  });

  it('dois aparelhos convergem trocando ops (último a escrever vence por célula)', async () => {
    const a = await novo('a');
    const b = await novo('b');
    await a.repos.cursadas.salvar(cursada('c1', 7));
    await b.ops.aplicarRemotas(await a.ops.locaisDesde(null));
    expect(await b.repos.cursadas.obter('c1')).toEqual(cursada('c1', 7));

    // Edições concorrentes em colunas diferentes se combinam.
    await a.repos.cursadas.salvar({ ...cursada('c1', 9) });
    await b.repos.cursadas.salvar({ ...cursada('c1', 7), frequencia: 0.5 });
    const deA = await a.ops.locaisDesde(null);
    const deB = await b.ops.locaisDesde(null);
    await a.ops.aplicarRemotas(deB);
    await b.ops.aplicarRemotas(deA);
    const final = { ...cursada('c1', 9), frequencia: 0.5 };
    expect(await a.repos.cursadas.obter('c1')).toEqual(final);
    expect(await b.repos.cursadas.obter('c1')).toEqual(final);
  });

  it('espera todas as colunas antes de criar uma linha remota', async () => {
    const a = await novo('a');
    const b = await novo('b');
    await a.repos.cursadas.salvar(cursada('c1', 7));
    const todas = await a.ops.locaisDesde(null);
    await b.ops.aplicarRemotas(todas.filter((o) => o.coluna !== 'semestre'));
    expect(await b.repos.cursadas.listar()).toEqual([]);
    await b.ops.aplicarRemotas(todas.filter((o) => o.coluna === 'semestre'));
    expect(await b.repos.cursadas.obter('c1')).toEqual(cursada('c1', 7));
  });

  it('os dados sobrevivem a fechar e reabrir o arquivo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'akademos-'));
    const arquivo = join(dir, 'akademos.db');
    try {
      const b1 = await novo('a', arquivo);
      await b1.repos.cursadas.salvar(cursada('c1', 6.4));
      await b1.fechar();
      const b2 = await novo('a', arquivo);
      expect(await b2.repos.cursadas.obter('c1')).toEqual(cursada('c1', 6.4));
      await b2.fechar();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exporta e apaga tudo', async () => {
    const b = await novo();
    await b.repos.registro.instalar(pacote);
    await b.repos.cursadas.salvar(cursada('c1', 7));
    expect((await b.exportar()).cursada).toEqual([cursada('c1', 7)]);
    await b.apagarTudo();
    expect(await b.repos.cursadas.listar()).toEqual([]);
    expect(await b.repos.registro.obter('ufx/ec/2019')).toBeNull();
    expect(await b.ops.locaisDesde(null)).toEqual([]);
  });
});
