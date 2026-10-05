import type { SituacaoEfetiva } from '@akademos/core';
import { t } from '@lingui/core/macro';

export interface EstiloSituacao {
  rotulo: string;
  cor: string;
  fundo: string;
}

/** Cores e rótulos das situações (design/Akademos.dc.html, legenda do Percurso). */
export function estiloSituacao(s: SituacaoEfetiva): EstiloSituacao {
  switch (s) {
    case 'ok':
      return { rotulo: t`Cursada`, cor: 'var(--olive-ink)', fundo: 'var(--olive-tint)' };
    case 'cur':
      return { rotulo: t`Cursando`, cor: 'var(--primary)', fundo: 'var(--primary-tint)' };
    case 'pend':
      return { rotulo: t`Adiada`, cor: 'var(--amber-ink)', fundo: 'var(--amber-tint)' };
    case 'lib':
      return { rotulo: t`Disponível`, cor: 'var(--ink-body)', fundo: 'var(--surface)' };
    case 'blq':
      return { rotulo: t`Bloqueada`, cor: 'var(--ink-3)', fundo: 'var(--bg)' };
  }
}

export const ORDEM_LEGENDA: SituacaoEfetiva[] = ['ok', 'cur', 'pend', 'lib', 'blq'];
