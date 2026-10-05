import { describe, expect, it } from 'vitest';
import {
  aluno,
  cursadas,
  escala,
  instituicao,
  matriz,
  ofertas2027,
  planoPrototipo,
} from './__fixtures__/ana';
import { comunidade } from './__fixtures__/comunidade';
import { detectarNotasNovas } from './notas';
import { analisar } from './painel';
import type { DadosLocais } from './repos';

const dados: DadosLocais = {
  instituicao,
  escala,
  curso: {
    id: aluno.cursoId,
    instituicaoId: 'ufx',
    nome: 'Engenharia de Computação',
    grau: 'bacharelado',
  },
  matriz,
  aluno,
  cursadas,
  ofertas: ofertas2027,
  planos: [{ id: 'p', alunoId: 'ana', semestre: '2027/1', turmas: planoPrototipo, criadoEm: '' }],
  objetivos: [],
  marcos: [],
  diario: [],
};

describe('analisar (painel)', () => {
  it('reúne os números da tela Início', () => {
    const a = analisar(dados, new Date(2026, 9, 4, 21), comunidade);
    expect(a.semestreAtual).toBe('2026/2');
    expect(a.ordinalAtual).toBe(5);
    expect(a.integralizacao.percentual).toBe(48);
    expect(a.formatura.formatura).toBe('2028/1');
    expect(a.previsoes.get('EX504')?.nivel).toBe('moderado');
    expect(a.insights[0]?.rotulo).toBe('Formatura');
    expect(a.comunidade).toBe(comunidade);
  });

  it('sem comunidade, as previsões ficam pessoais', () => {
    const a = analisar(dados, new Date(2026, 9, 4));
    expect([...a.previsoes.values()].every((p) => p.fonte === 'pessoal')).toBe(true);
  });
});

describe('detectarNotasNovas', () => {
  it('acha cursadas que ganharam nota', () => {
    const antes = cursadas;
    const depois = cursadas.map((c) => (c.disciplinaCodigo === 'EX501' ? { ...c, nota: 8.5 } : c));
    expect(detectarNotasNovas(antes, depois)).toEqual([
      { cursadaId: expect.any(String), disciplinaCodigo: 'EX501', nota: 8.5 },
    ]);
    expect(detectarNotasNovas(antes, antes)).toEqual([]);
  });

  it('conta como nova a cursada que chegou já com nota', () => {
    const nova = { ...cursadas[0]!, id: 'novo' };
    expect(detectarNotasNovas([], [nova])).toHaveLength(1);
  });
});
