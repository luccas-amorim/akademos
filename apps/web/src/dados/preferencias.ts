import { useCallback, useSyncExternalStore } from 'react';

/**
 * Preferências deste navegador (não sincronizadas): modo de sessão e
 * "ocultar notas". Guardadas em localStorage, com eventos entre abas.
 */
export type Sessao = 'local' | 'conta';

const CHAVES = {
  sessao: 'akademos:sessao',
  ocultarNotas: 'akademos:ocultar-notas',
  comunidade: 'akademos:comunidade',
} as const;

type Chave = keyof typeof CHAVES;
const ouvintes = new Set<() => void>();

function ler(chave: Chave): string | null {
  try {
    return localStorage.getItem(CHAVES[chave]);
  } catch {
    return null;
  }
}

export function gravarPreferencia(chave: Chave, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(CHAVES[chave]);
    else localStorage.setItem(CHAVES[chave], valor);
  } catch {
    // Sem armazenamento (janela privada restrita): vale só nesta página.
  }
  for (const o of ouvintes) o();
}

function subscribe(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const aoMudar = (e: StorageEvent) => {
    if (e.key?.startsWith('akademos:')) ouvinte();
  };
  window.addEventListener('storage', aoMudar);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', aoMudar);
  };
}

export function lerSessao(): Sessao | null {
  const v = ler('sessao');
  return v === 'local' || v === 'conta' ? v : null;
}

export function useSessao(): Sessao | null {
  return useSyncExternalStore(subscribe, lerSessao, () => null);
}

export function useOcultarNotas(): [boolean, (v: boolean) => void] {
  const valor = useSyncExternalStore(
    subscribe,
    () => ler('ocultarNotas') === '1',
    () => false,
  );
  const definir = useCallback(
    (v: boolean) => gravarPreferencia('ocultarNotas', v ? '1' : null),
    [],
  );
  return [valor, definir];
}

/** Consentimento explícito para enviar agregados anônimos (opt-in, regra 6). */
export function useConsentimentoComunidade(): [boolean, (v: boolean) => void] {
  const valor = useSyncExternalStore(
    subscribe,
    () => ler('comunidade') === '1',
    () => false,
  );
  const definir = useCallback((v: boolean) => gravarPreferencia('comunidade', v ? '1' : null), []);
  return [valor, definir];
}

export function lerConsentimentoComunidade(): boolean {
  return ler('comunidade') === '1';
}
