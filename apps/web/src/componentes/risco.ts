import type { NivelRisco } from '@akademos/core';
import { t } from '@lingui/core/macro';

export const COR_RISCO: Record<NivelRisco, string> = {
  baixo: 'var(--olive-ink)',
  moderado: 'var(--amber-ink)',
  alto: 'var(--danger)',
};

export function rotuloRisco(n: NivelRisco): string {
  switch (n) {
    case 'baixo':
      return t`Baixo`;
    case 'moderado':
      return t`Moderado`;
    case 'alto':
      return t`Alto`;
  }
}
