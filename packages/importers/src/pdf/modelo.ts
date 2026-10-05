import type { CursadaBruta, ModeloHistorico } from '../tipos';

export interface ResultadoModelo {
  cursadas: CursadaBruta[];
  /** Linhas que parecem disciplina (começam com período) mas não casaram com o modelo. */
  naoReconhecidas: string[];
}

const PARECE_DISCIPLINA = /^\d{4}[./][12]\b/;

function numero(txt: string | undefined, decimal: ',' | '.'): number | null {
  if (!txt || /^-+$/.test(txt.trim())) return null;
  const limpo = decimal === ',' ? txt.replace(/\./g, '').replace(',', '.') : txt.replace(/,/g, '');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** Aplica o modelo da instituição a cada linha de texto do histórico. */
export function aplicarModelo(linhas: readonly string[], modelo: ModeloHistorico): ResultadoModelo {
  const re = new RegExp(modelo.linha);
  const cursadas: CursadaBruta[] = [];
  const naoReconhecidas: string[] = [];
  for (const linha of linhas) {
    const m = re.exec(linha.trim());
    const g = m?.groups;
    if (!g || !g.semestre || !g.codigo) {
      if (PARECE_DISCIPLINA.test(linha.trim())) naoReconhecidas.push(linha);
      continue;
    }
    const freq = numero(g.frequencia, modelo.separador_decimal);
    const situacaoOriginal = (g.situacao ?? '').trim();
    cursadas.push({
      semestre: g.semestre.replace('.', '/'),
      codigo: g.codigo.trim(),
      nome: (g.nome ?? '').trim(),
      nota: numero(g.nota, modelo.separador_decimal),
      frequencia: freq === null ? null : freq > 1 ? freq / 100 : freq,
      situacaoOriginal,
      situacao: modelo.situacoes[situacaoOriginal] ?? null,
      linha,
    });
  }
  return { cursadas, naoReconhecidas };
}
