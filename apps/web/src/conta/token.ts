/** Token Bearer da sessão. Fica neste navegador; sair o apaga. */
const CHAVE = 'akademos:token';

export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function gravarToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CHAVE, token);
    else localStorage.removeItem(CHAVE);
  } catch {
    // Sem armazenamento: a sessão vale só até fechar a página.
  }
}
