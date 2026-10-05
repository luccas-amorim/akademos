/** O app está rodando dentro do Tauri (desktop)? Conectores só funcionam lá. */
export function ehDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
