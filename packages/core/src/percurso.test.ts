import { describe, expect, it } from 'vitest';
import { cursadas, matriz } from './__fixtures__/ana';
import {
  integralizacao,
  mediaPonderada,
  mediaPorSemestre,
  notaDaDisciplina,
  progressoPorArea,
  mediaPorArea,
  situacaoEfetiva,
  situacoesEfetivas,
} from './percurso';
import type { Cursada } from './tipos';

const ORDINAL_ATUAL = 5; // 2026/2 para quem ingressou em 2024/2
const cursada = (c: Partial<Cursada> & Pick<Cursada, 'disciplinaCodigo'>): Cursada => ({
  id: c.disciplinaCodigo + (c.semestre ?? ''),
  alunoId: 'ana',
  semestre: '2025/1',
  nota: null,
  frequencia: null,
  situacao: 'aprovada',
  ...c,
});

describe('situacaoEfetiva', () => {
  const sit = situacoesEfetivas(matriz, cursadas, ORDINAL_ATUAL);

  it('marca aprovadas e cursando', () => {
    expect(sit.get('EX101')).toBe('ok');
    expect(sit.get('EX501')).toBe('cur');
  });

  it('marca como atrasada (pend) o que ficou para trás com requisitos cumpridos', () => {
    expect(sit.get('EX404')).toBe('pend');
  });

  it('libera quando os requisitos estão aprovados ou em curso', () => {
    expect(sit.get('EX601')).toBe('lib'); // EX302 e EX202 aprovadas
    expect(sit.get('EX603')).toBe('lib'); // EX501 e EX502 cursando
    expect(sit.get('EX703')).toBe('lib'); // sem requisitos
  });

  it('bloqueia quando algum requisito não está cumprido', () => {
    expect(sit.get('EX604')).toBe('blq'); // exige EX404, atrasada
    expect(sit.get('EX701')).toBe('blq'); // exige EX601
  });

  it('considera a última cursada: reprovação seguida de aprovação conta como ok', () => {
    const hist = [
      cursada({ disciplinaCodigo: 'EX101', semestre: '2024/2', nota: 4, situacao: 'reprovada' }),
      cursada({ disciplinaCodigo: 'EX101', semestre: '2025/1', nota: 7, situacao: 'aprovada' }),
    ];
    const d = matriz.disciplinas.find((x) => x.codigo === 'EX101')!;
    expect(situacaoEfetiva(d, matriz, hist, 2)).toBe('ok');
    expect(situacaoEfetiva(d, matriz, hist.slice(0, 1), 2)).toBe('pend');
    expect(situacaoEfetiva(d, matriz, hist.slice(0, 1), 1)).toBe('lib');
  });

  it('aproveitamento conta como aprovação; trancamento não', () => {
    const d = matriz.disciplinas.find((x) => x.codigo === 'EX101')!;
    expect(
      situacaoEfetiva(
        d,
        matriz,
        [cursada({ disciplinaCodigo: 'EX101', situacao: 'aproveitada' })],
        1,
      ),
    ).toBe('ok');
    expect(
      situacaoEfetiva(d, matriz, [cursada({ disciplinaCodigo: 'EX101', situacao: 'trancada' })], 1),
    ).toBe('lib');
  });
});

describe('integralizacao', () => {
  it('soma créditos aprovados sobre o total da matriz', () => {
    expect(integralizacao(matriz, cursadas)).toEqual({
      creditosCumpridos: 62,
      creditosCursando: 16,
      creditosTotal: 128,
      percentual: 48,
      disciplinasAprovadas: 16,
    });
  });

  it('não conta duas vezes a mesma disciplina', () => {
    const dup = [
      cursada({ disciplinaCodigo: 'EX101', semestre: '2024/2' }),
      cursada({ disciplinaCodigo: 'EX101', semestre: '2025/1' }),
    ];
    expect(integralizacao(matriz, dup).creditosCumpridos).toBe(4);
  });

  it('ignora códigos fora da matriz', () => {
    expect(integralizacao(matriz, [cursada({ disciplinaCodigo: 'ZZ999' })]).creditosCumpridos).toBe(
      0,
    );
  });
});

describe('médias', () => {
  it('pondera pelos créditos', () => {
    const m = mediaPonderada(matriz, [
      cursada({ disciplinaCodigo: 'EX101', nota: 10 }), // 4 cr
      cursada({ disciplinaCodigo: 'EX104', nota: 4 }), // 2 cr
    ]);
    expect(m).toBeCloseTo((10 * 4 + 4 * 2) / 6, 10);
  });

  it('inclui reprovações e ignora cursando, trancadas e sem nota', () => {
    const m = mediaPonderada(matriz, [
      cursada({ disciplinaCodigo: 'EX101', nota: 8 }),
      cursada({ disciplinaCodigo: 'EX102', nota: 4, situacao: 'reprovada' }),
      cursada({ disciplinaCodigo: 'EX103', nota: 10, situacao: 'trancada' }),
      cursada({ disciplinaCodigo: 'EX201', situacao: 'cursando' }),
    ]);
    expect(m).toBe(6);
  });

  it('devolve null sem notas', () => {
    expect(mediaPonderada(matriz, [])).toBeNull();
  });

  it('calcula a média da Ana como no protótipo', () => {
    expect(mediaPonderada(matriz, cursadas)).toBeCloseTo(7.7, 1);
  });

  it('agrupa por semestre, em ordem', () => {
    const s = mediaPorSemestre(matriz, cursadas);
    expect(s.map((x) => x.semestre)).toEqual(['2024/2', '2025/1', '2025/2', '2026/1']);
    expect(s[0]!.media).toBeCloseTo((7.8 * 4 + 9.1 * 4 + 8 * 4 + 9.5 * 2) / 14, 10);
  });

  it('agrupa por área', () => {
    const a = mediaPorArea(matriz, cursadas);
    const comp = a.find((x) => x.area === 'Computação')!;
    expect(comp.media).toBeCloseTo((9.1 + 8.7 + 9.0 + 8.8) / 4, 10);
    expect(a.find((x) => x.area === 'Eletiva')).toBeUndefined();
  });
});

describe('progressoPorArea', () => {
  it('lista créditos cumpridos por área na ordem da matriz', () => {
    const p = progressoPorArea(matriz, cursadas);
    expect(p[0]).toEqual({ area: 'Matemática', creditosCumpridos: 28, creditosTotal: 32 });
    expect(p.find((x) => x.area === 'Eletiva')).toEqual({
      area: 'Eletiva',
      creditosCumpridos: 0,
      creditosTotal: 8,
    });
  });
});

describe('notaDaDisciplina', () => {
  it('usa a nota da última cursada com nota', () => {
    expect(notaDaDisciplina('EX301', cursadas)).toBe(6.1);
    expect(notaDaDisciplina('EX501', cursadas)).toBeNull();
  });
});
