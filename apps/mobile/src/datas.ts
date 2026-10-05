/** "DD/MM/AAAA" → Date às 9h, ou null se inválida ou no passado. */
export function lerDataDoPrazo(texto: string, agora = new Date()): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 9, 0, 0);
  if (d.getDate() !== Number(m[1]) || d <= agora) return null;
  return d;
}
