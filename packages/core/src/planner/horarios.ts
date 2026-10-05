import type { Dia, FaixaHoraria, GradeSemanal, Horario } from '../tipos';

export const ROTULO_DIA: Record<Dia, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
};

/** "08:00"–"10:00" → "08–10"; minutos só aparecem quando não são zero. */
export function rotuloFaixa(f: FaixaHoraria): string {
  const curto = (h: string) => (h.endsWith(':00') ? h.slice(0, 2) : h);
  return `${curto(f.inicio)}–${curto(f.fim)}`;
}

/** Junta faixas contíguas: 14–16 + 16–18 → 14–18. */
function juntar(slots: number[], faixas: readonly FaixaHoraria[]): string[] {
  const ordenados = [...new Set(slots)].sort((a, b) => a - b);
  const blocos: FaixaHoraria[] = [];
  for (const s of ordenados) {
    const f = faixas[s];
    if (!f) continue;
    const ultimo = blocos.at(-1);
    if (ultimo && ultimo.fim === f.inicio) ultimo.fim = f.fim;
    else blocos.push({ ...f });
  }
  return blocos.map(rotuloFaixa);
}

/** "Seg, Qua · 08–10" — dias em ordem da grade e faixas agrupadas. */
export function descreverHorarios(horarios: readonly Horario[], grade: GradeSemanal): string {
  if (!horarios.length) return 'sem horário';
  const dias = grade.dias.filter((d) => horarios.some((h) => h.dia === d));
  const porDia = dias.map((d) => juntar(horarios.filter((h) => h.dia === d).map((h) => h.slot), grade.faixas).join(' / '));
  const iguais = porDia.every((p) => p === porDia[0]);
  const faixas = iguais ? porDia[0]! : [...new Set(porDia)].join(' / ');
  return `${dias.map((d) => ROTULO_DIA[d]).join(', ')} · ${faixas}`;
}
