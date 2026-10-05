/**
 * Servidor opcional. Sem VITE_API_URL o app funciona só no aparelho (é o caso
 * da publicação de demonstração no GitHub Pages).
 */
export const API_URL: string | null =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || null;

export const temServidor = (): boolean => API_URL !== null;
