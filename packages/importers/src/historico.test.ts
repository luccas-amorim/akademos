import { montarPacotes } from '@akademos/registry';
import { lerInstituicoes } from '@akademos/registry/node';
import { readFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { corresponder, normalizarNome, similaridade } from './correspondencia';
import { extrairLinhas, type PdfJsMinimo } from './pdf/extrair';
import { aplicarModelo } from './pdf/modelo';
import { cursadasDaRevisao, mesclarCursadas, montarRevisao } from './revisao';
import type { ModeloHistorico } from './tipos';

const [ufx] = montarPacotes(lerInstituicoes().find((i) => i.pasta === 'ufx')!).entradas;
const matriz = ufx!.pacote.matriz;
const modelo = ufx!.modeloHistorico as ModeloHistorico;
const pdf = new Uint8Array(
  readFileSync(new URL('../__fixtures__/sigaa-ufx-historico.pdf', import.meta.url)),
);

describe('histórico SIGAA (fixture sintética)', async () => {
  const { linhas, semTexto } = await extrairLinhas(pdfjs as unknown as PdfJsMinimo, pdf);
  const { cursadas, naoReconhecidas } = aplicarModelo(linhas, modelo);

  it('extrai texto com coordenadas e reconstrói as linhas', () => {
    expect(semTexto).toBe(false);
    expect(linhas).toContain('2024.2 MAT0101 CÁLCULO DIFERENCIAL I 60 T01 92,0 7,8 APR');
  });

  it('lê as 22 linhas de disciplina e ignora cabeçalho e rodapé', () => {
    expect(cursadas).toHaveLength(22);
    expect(naoReconhecidas).toEqual([]);
    expect(cursadas[0]).toMatchObject({
      semestre: '2024/2',
      codigo: 'MAT0101',
      nome: 'CÁLCULO DIFERENCIAL I',
      nota: 7.8,
      frequencia: 0.92,
      situacao: 'aprovada',
    });
    expect(cursadas.at(-1)).toMatchObject({ nota: null, frequencia: null, situacao: 'cursando' });
  });

  it('casa 21 linhas com a matriz e pede revisão em 2', () => {
    const revisao = montarRevisao(cursadas, matriz);
    const reconhecidas = revisao.filter((l) => l.correspondencia.disciplina);
    expect(reconhecidas).toHaveLength(21);
    const revisar = revisao.filter((l) => l.revisar);
    expect(revisar.map((l) => [l.bruta.codigo, l.revisar])).toEqual([
      ['MAT0301', 'tentativa-anterior'],
      ['ENG9910', 'sem-equivalente'],
    ]);
  });

  it('gera cursadas com as decisões da revisão', () => {
    const revisao = montarRevisao(cursadas, matriz);
    const inovacao = revisao.find((l) => l.bruta.codigo === 'ENG9910')!;
    const importadas = cursadasDaRevisao(
      revisao,
      { [inovacao.id]: { acao: 'importar', disciplinaCodigo: 'EX704' } },
      'ana',
    );
    expect(importadas).toHaveLength(22);
    expect(importadas.find((c) => c.disciplinaCodigo === 'EX704')).toMatchObject({
      semestre: '2026/1',
      nota: 9,
    });
    const calculo3 = importadas.filter((c) => c.disciplinaCodigo === 'EX301');
    expect(calculo3.map((c) => c.situacao)).toEqual(['reprovada', 'aprovada']);
  });

  it('reimportar atualiza as mesmas linhas em vez de duplicar', () => {
    const revisao = montarRevisao(cursadas, matriz);
    const primeira = cursadasDaRevisao(revisao, {}, 'ana').map((c, i) => ({ ...c, id: `x${i}` }));
    const segunda = mesclarCursadas(primeira, cursadasDaRevisao(revisao, {}, 'ana'));
    expect(segunda.map((c) => c.id)).toEqual(primeira.map((c) => c.id));
  });
});

describe('correspondência por nome', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalizarNome('CÁLCULO  III (2ª vez)')).toBe('calculo iii');
  });

  it('aceita nomes quase iguais (trigramas ≥ 0,8)', () => {
    expect(similaridade('Programação Orientada a Objetos', 'PROGRAMACAO ORIENTADA A OBJETOS')).toBe(
      1,
    );
    const c = corresponder({ codigo: 'X999', nome: 'Programacao Orientada a Objeto' }, matriz);
    expect(c).toMatchObject({ por: 'nome' });
    expect(c.disciplina?.codigo).toBe('EX303');
  });

  it('recusa nomes diferentes e devolve só uma sugestão', () => {
    const c = corresponder({ codigo: 'X999', nome: 'Cálculo Diferencial e Integral I' }, matriz);
    expect(c.disciplina).toBeNull();
    expect(c.sugestao?.codigo).toBe('EX101');
  });
});
