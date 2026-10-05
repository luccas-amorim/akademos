import { describe, expect, it } from 'vitest';
import {
  aluno,
  cursadas,
  escala,
  instituicao,
  matriz,
  ofertas2027,
  planoPrototipo,
} from '../__fixtures__/ana';
import { comunidade } from '../__fixtures__/comunidade';
import type { Cursada, Objetivo, Plano } from '../tipos';
import { prepararContexto, type EntradaInsights } from './contexto';
import { gerarInsights } from './motor';
import { preverNota } from './previsao';
import {
  regraCarga,
  regraCarreira,
  regraCorrelacao,
  regraFormatura,
  regraLotacao,
  regraRisco,
} from './regras';

const plano: Plano = {
  id: 'p',
  alunoId: 'ana',
  semestre: '2027/1',
  turmas: planoPrototipo,
  criadoEm: '2026-10-01',
};

const objetivo: Objetivo = {
  id: 'obj',
  alunoId: 'ana',
  titulo: 'Ciência de dados em saúde',
  principal: true,
  competencias: [
    { nome: 'Programação e dados', disciplinas: ['EX102', 'EX202', 'EX401'] },
    { nome: 'Aprendizado de máquina', disciplinas: ['EX601', 'EX701'] },
  ],
};

const entrada: EntradaInsights = {
  instituicao,
  escala,
  matriz,
  aluno,
  cursadas,
  ofertas: ofertas2027.map((o) => ({ ...o, atualizadaEm: '2026-10-04T18:00:00Z' })),
  planos: [plano],
  objetivos: [objetivo],
  semestreAtual: '2026/2',
  agora: new Date('2026-10-04T21:00:00Z'),
  comunidade,
};
const ctx = (e: Partial<EntradaInsights> = {}) => prepararContexto({ ...entrada, ...e });

describe('regra de formatura', () => {
  it('positivo: Sinais e Sistemas segura a formatura de 2028/1', () => {
    const [i] = regraFormatura(ctx()).filter((x) => x.alvo === 'EX404');
    expect(i).toMatchObject({
      tipo: 'risco',
      rotulo: 'Formatura',
      severidade: 'alta',
      fonte: 'regra',
    });
    expect(i!.texto).toContain('Adiada desde 2026/1');
    expect(i!.texto).toContain('de 2028/1 para 2028/2');
    expect(i!.motivo).toContain('matriz 2019');
  });

  it('negativo: com Sinais e Sistemas aprovada não há alerta', () => {
    const feita: Cursada = {
      ...cursadas[0]!,
      id: 'x',
      disciplinaCodigo: 'EX404',
      semestre: '2026/1',
      nota: 7,
    };
    expect(
      regraFormatura(ctx({ cursadas: [...cursadas, feita] })).filter((x) => x.alvo === 'EX404'),
    ).toEqual([]);
  });
});

describe('regra de risco', () => {
  it('positivo: Estatística Aplicada com reprovação condicional da comunidade', () => {
    const r = regraRisco(ctx());
    expect(r.map((x) => x.alvo)).toEqual(['EX504']);
    expect(r[0]).toMatchObject({ severidade: 'media', fonte: 'comunidade' });
    expect(r[0]!.texto).toContain('18% de reprovação');
    expect(r[0]!.motivo).toBe('214 históricos anônimos');
  });

  it('negativo: sem dados da comunidade, notas boas não geram alerta', () => {
    expect(regraRisco(ctx({ comunidade: null }))).toEqual([]);
  });

  it('previsões são faixas, nunca pontos', () => {
    const p = preverNota('EX504', ctx())!;
    expect(p.intervalo.max).toBeGreaterThan(p.intervalo.min);
    expect(p.intervalo).toEqual({ min: 6.9, max: 7.8 });
  });

  it('cai para a previsão pessoal sem comunidade e marca a fonte', () => {
    const p = preverNota('EX501', ctx({ comunidade: null }))!;
    expect(p.fonte).toBe('pessoal');
    expect(p.porque).toContain('Arquitetura de Computadores 7,4');
  });

  it('alto risco quando a faixa encosta na reprovação', () => {
    const fracas = cursadas.map((c) => (c.nota ? { ...c, nota: 5.6 } : c));
    const r = regraRisco(ctx({ cursadas: fracas, comunidade: null }));
    expect(r.length).toBe(4);
    expect(r.every((x) => x.severidade === 'alta' && x.fonte === 'pessoal')).toBe(true);
  });
});

describe('regra de lotação', () => {
  it('positivo: IA T01 deve lotar e a T02 é a alternativa', () => {
    const i = regraLotacao(ctx()).find((x) => x.alvo === '2027-1-EX601-T01')!;
    expect(i.titulo).toBe('Inteligência Artificial T01 deve lotar');
    expect(i.texto).toMatch(/^94 interessados para 60 vagas\. A T02 tem \d+% de chance/);
    expect(i.motivo).toBe('Pré-matrícula SIGAA UFX · há 3 h');
  });

  it('turma lotada que está no plano é severidade alta', () => {
    expect(regraLotacao(ctx()).find((x) => x.alvo === '2027-1-EX404-T01')?.severidade).toBe('alta');
  });

  it('negativo: sem turmas lotadas, nada', () => {
    const folgadas = entrada.ofertas.map((o) => ({ ...o, interessados: 1 }));
    expect(regraLotacao(ctx({ ofertas: folgadas }))).toEqual([]);
  });
});

describe('regra de correlação', () => {
  it('positivo: Cálculo III antecipa Sinais e Sistemas, com faixa 5,8 a 6,9', () => {
    const r = regraCorrelacao(ctx());
    const i = r.find((x) => x.alvo === 'EX404')!;
    expect(i.titulo).toBe('Cálculo III antecipa Sinais e Sistemas');
    expect(i.texto).toContain('r = 0,61');
    expect(i.texto).toContain('5,8 a 6,9');
    expect(i.fonte).toBe('comunidade');
    expect(i.motivo).toBe('1.240 históricos anônimos');
  });

  it('respeita k: célula com menos de 10 históricos não aparece', () => {
    expect(regraCorrelacao(ctx()).some((x) => x.alvo === 'EX604')).toBe(false);
  });

  it('negativo: sem comunidade, nenhuma correlação', () => {
    expect(regraCorrelacao(ctx({ comunidade: null }))).toEqual([]);
  });

  it('ignora estatísticas de outra matriz', () => {
    expect(regraCorrelacao(ctx({ comunidade: { ...comunidade, matrizId: 'outra' } }))).toEqual([]);
  });
});

describe('regra de carga', () => {
  it('positivo: resume horas e folga do plano', () => {
    const [i] = regraCarga(ctx());
    expect(i).toMatchObject({ severidade: 'baixa', fonte: 'pessoal' });
    expect(i!.titulo).toBe('2027/1 com 16 h de aula, quinta quase livre');
  });

  it('acusa plano acima do histórico', () => {
    const pesado: Plano = {
      ...plano,
      turmas: [...planoPrototipo, '2027-1-EX603-T01', '2027-1-EX802-T01', '2027-1-EX604-T01'],
    };
    const [i] = regraCarga(ctx({ planos: [pesado] }));
    expect(i!.severidade).toBe('media');
    expect(i!.titulo).toContain('acima do seu histórico');
  });

  it('negativo: sem plano, sem insight', () => {
    expect(regraCarga(ctx({ planos: [] }))).toEqual([]);
  });
});

describe('regra de carreira', () => {
  it('positivo: aderência e sugestão de turma', () => {
    const [i] = regraCarreira(ctx());
    expect(i!.titulo).toBe('Ciência de dados em saúde: 50% coberto');
    expect(i!.texto).toContain('aprendizado de máquina');
    expect(i!.texto).toContain('Inteligência Artificial cobre uma lacuna');
    expect(i!.motivo).toBe('Competências declaradas por você');
  });

  it('negativo: sem objetivo principal, nada', () => {
    expect(regraCarreira(ctx({ objetivos: [{ ...objetivo, principal: false }] }))).toEqual([]);
  });
});

describe('motor', () => {
  it('ordena por severidade e todo insight tem motivo e fonte', () => {
    const todos = gerarInsights(entrada);
    expect(todos[0]!.rotulo).toBe('Formatura');
    const ordem = { alta: 0, media: 1, baixa: 2 };
    for (let i = 1; i < todos.length; i++) {
      expect(ordem[todos[i]!.severidade]).toBeGreaterThanOrEqual(ordem[todos[i - 1]!.severidade]);
    }
    for (const i of todos) {
      expect(i.motivo.length).toBeGreaterThan(0);
      expect(['pessoal', 'comunidade', 'regra']).toContain(i.fonte);
    }
    expect(new Set(todos.map((i) => i.id)).size).toBe(todos.length);
  });
});
