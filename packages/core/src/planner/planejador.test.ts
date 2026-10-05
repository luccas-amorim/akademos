import { describe, expect, it } from 'vitest';
import { cursadas, instituicao, matriz, ofertas2027, planoPrototipo } from '../__fixtures__/ana';
import type { Matriz } from '../tipos';
import {
  alternarTurma,
  caminhoCritico,
  chanceDeVaga,
  conflitosDaGrade,
  diasLivres,
  horasSemanais,
  preverFormatura,
} from './planejador';

const base = { matriz, cursadas, semestreAtual: '2026/2', limiteCreditos: 24 };
const codigosDoPlano = (ids: string[]) =>
  ofertas2027.filter((o) => ids.includes(o.id)).map((o) => o.disciplinaCodigo);

describe('preverFormatura — matriz da UFX (Ana)', () => {
  it('com Sinais e Sistemas em 2027/1, forma em 2028/1', () => {
    const p = preverFormatura({
      ...base,
      fixos: { '2027/1': codigosDoPlano(planoPrototipo) },
    });
    expect(p.formatura).toBe('2028/1');
    expect(p.cronograma.find((s) => s.semestre === '2027/2')?.codigos).toContain('EX604');
  });

  it('sem Sinais e Sistemas (só ofertada em semestre ímpar), passa para 2028/2', () => {
    const semSS = planoPrototipo.filter((id) => !id.includes('EX404'));
    const p = preverFormatura({ ...base, fixos: { '2027/1': codigosDoPlano(semSS) } });
    expect(p.formatura).toBe('2028/2');
    const s2028 = p.cronograma.find((s) => s.semestre === '2028/1')!;
    expect(s2028.codigos).toContain('EX404');
  });

  it('respeita o limite de créditos por semestre', () => {
    const p = preverFormatura(base);
    for (const s of p.cronograma) {
      const cr = s.codigos.reduce(
        (t, c) => t + matriz.disciplinas.find((d) => d.codigo === c)!.creditos,
        0,
      );
      expect(cr).toBeLessThanOrEqual(24);
    }
  });

  it('nunca agenda uma disciplina antes dos requisitos', () => {
    const p = preverFormatura(base);
    const quando = new Map(p.cronograma.flatMap((s) => s.codigos.map((c) => [c, s.semestre])));
    for (const pr of matriz.prerequisitos) {
      const d = quando.get(pr.disciplinaCodigo);
      const r = quando.get(pr.requerCodigo);
      if (d && r) expect(r < d, `${pr.requerCodigo} antes de ${pr.disciplinaCodigo}`).toBe(true);
    }
  });
});

describe('preverFormatura — outras matrizes', () => {
  const linear: Matriz = {
    id: 'm',
    cursoId: 'c',
    ano: 2020,
    creditosTotal: 12,
    versaoRegistro: '1',
    disciplinas: ['A', 'B', 'C'].map((codigo, i) => ({
      codigo,
      matrizId: 'm',
      nome: codigo,
      creditos: 4,
      cargaHoraria: 60,
      semestreSugerido: i + 1,
      area: 'X',
      tipo: 'obrigatoria' as const,
      periodicidade: 'ambos' as const,
      codigosAlternativos: [],
    })),
    prerequisitos: [
      { disciplinaCodigo: 'B', requerCodigo: 'A', tipo: 'pre' },
      { disciplinaCodigo: 'C', requerCodigo: 'B', tipo: 'pre' },
    ],
  };

  it('cadeia linear leva um semestre por elo, mesmo com folga de créditos', () => {
    const p = preverFormatura({
      matriz: linear,
      cursadas: [],
      semestreAtual: '2026/2',
      limiteCreditos: 40,
    });
    expect(p.formatura).toBe('2028/1');
    expect(caminhoCritico(linear, [])).toEqual(['A', 'B', 'C']);
  });

  it('periodicidade anual atrasa a cadeia', () => {
    const anual: Matriz = {
      ...linear,
      disciplinas: linear.disciplinas.map((d) => ({ ...d, periodicidade: 'impar' as const })),
    };
    const p = preverFormatura({
      matriz: anual,
      cursadas: [],
      semestreAtual: '2026/2',
      limiteCreditos: 40,
    });
    expect(p.cronograma.map((s) => s.semestre)).toEqual(['2027/1', '2028/1', '2029/1']);
  });

  it('limite apertado espalha disciplinas independentes', () => {
    const paralela: Matriz = { ...linear, prerequisitos: [] };
    const p = preverFormatura({
      matriz: paralela,
      cursadas: [],
      semestreAtual: '2026/2',
      limiteCreditos: 4,
    });
    expect(p.formatura).toBe('2028/1');
    expect(p.cronograma).toHaveLength(3);
  });

  it('acusa quando é impossível concluir', () => {
    const p = preverFormatura({
      matriz: linear,
      cursadas: [],
      semestreAtual: '2026/2',
      limiteCreditos: 2,
    });
    expect(p.formatura).toBeNull();
    expect(p.impedimento).toMatch(/limite/);
  });

  it('quem já cumpriu tudo forma no semestre atual', () => {
    const tudo = linear.disciplinas.map((d, i) => ({
      id: String(i),
      alunoId: 'x',
      disciplinaCodigo: d.codigo,
      semestre: '2025/1',
      nota: 8,
      frequencia: 1,
      situacao: 'aprovada' as const,
    }));
    expect(
      preverFormatura({
        matriz: linear,
        cursadas: tudo,
        semestreAtual: '2026/2',
        limiteCreditos: 24,
      }).formatura,
    ).toBe('2026/2');
  });
});

describe('caminhoCritico — Ana', () => {
  it('é a cadeia restante mais longa', () => {
    expect(caminhoCritico(matriz, cursadas)).toHaveLength(2);
  });
});

describe('grade semanal', () => {
  const plano = ofertas2027.filter((o) => planoPrototipo.includes(o.id));

  it('o plano do protótipo não tem conflitos e soma 16 h', () => {
    expect(conflitosDaGrade(plano)).toEqual([]);
    expect(horasSemanais(plano, instituicao.grade.faixas)).toBe(16);
  });

  it('detecta choque de horário na mesma faixa', () => {
    const ia1 = ofertas2027.find((o) => o.id === '2027-1-EX601-T02')!;
    const sd = ofertas2027.find((o) => o.id === '2027-1-EX603-T01')!;
    const c = conflitosDaGrade([ia1, sd]);
    expect(c).toHaveLength(2); // seg e qua, faixa 16–18
    expect(c[0]!.ofertas.map((o) => o.disciplinaCodigo).sort()).toEqual(['EX601', 'EX603']);
  });

  it('lista dias sem aula', () => {
    expect(diasLivres(plano, instituicao.grade.dias)).toEqual([]);
    expect(diasLivres([ofertas2027[0]!], instituicao.grade.dias)).toEqual(['ter', 'qui', 'sex']);
  });

  it('escolher uma turma troca a outra turma da mesma disciplina', () => {
    const p1 = alternarTurma(planoPrototipo, '2027-1-EX601-T01', ofertas2027);
    expect(p1).toContain('2027-1-EX601-T01');
    expect(p1).not.toContain('2027-1-EX601-T02');
    const p2 = alternarTurma(p1, '2027-1-EX601-T01', ofertas2027);
    expect(p2.some((id) => id.includes('EX601'))).toBe(false);
  });
});

describe('chanceDeVaga', () => {
  it('é alta com folga e cai com a lotação', () => {
    const folga = chanceDeVaga({ vagas: 50, interessados: 22 });
    const justa = chanceDeVaga({ vagas: 45, interessados: 52 });
    const lotada = chanceDeVaga({ vagas: 60, interessados: 94 });
    expect(folga).toBeGreaterThanOrEqual(95);
    expect(justa).toBeGreaterThan(lotada);
    expect(lotada).toBeLessThan(50);
  });

  it('prioridade maior aumenta a chance', () => {
    const t = { vagas: 60, interessados: 94 };
    expect(chanceDeVaga(t, 1)).toBeGreaterThan(chanceDeVaga(t, 3));
  });

  it('fica entre 1 e 99', () => {
    expect(chanceDeVaga({ vagas: 10, interessados: 0 })).toBe(99);
    expect(chanceDeVaga({ vagas: 1, interessados: 500 })).toBe(1);
  });
});
