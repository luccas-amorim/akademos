import type { DestinoInsight, Insight } from '@akademos/core';

/** Cor do rótulo de cada tipo de insight (design/Akademos.dc.html). */
export function corDoInsight(i: Pick<Insight, 'tipo' | 'rotulo'>): string {
  switch (i.tipo) {
    case 'risco':
      return 'var(--danger)';
    case 'lotacao':
      return 'var(--amber-ink)';
    case 'carreira':
      return 'var(--primary)';
    case 'correlacao':
      return 'var(--olive)';
    case 'carga':
      return 'var(--ink-body)';
  }
}

export const ROTA_DO_DESTINO = {
  planejar: '/planejar',
  percurso: '/percurso',
  desempenho: '/desempenho',
  carreira: '/carreira',
  insights: '/insights',
} as const satisfies Record<DestinoInsight, string>;

export const ROTULO_FONTE: Record<Insight['fonte'], string> = {
  pessoal: 'Seus dados',
  comunidade: 'Comunidade',
  regra: 'Regra',
};
