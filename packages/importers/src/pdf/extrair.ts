/**
 * Extração de linhas de texto de um PDF com pdf.js. A biblioteca é injetada
 * (build "legacy" no Node, build padrão com worker no navegador) para que este
 * pacote não dependa de uma plataforma.
 */

interface ItemDeTexto {
  str: string;
  transform: number[];
  width: number;
}

export interface PdfJsMinimo {
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean; verbosity?: number }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: Array<ItemDeTexto | { type: string }> }>;
      }>;
    }>;
    destroy(): Promise<void>;
  };
}

export interface ResultadoExtracao {
  linhas: string[];
  /** PDF sem camada de texto (digitalizado): precisa de OCR. */
  semTexto: boolean;
  paginas: number;
}

/** Tolerância vertical (em pontos) para considerar itens na mesma linha. */
const TOLERANCIA_Y = 2.5;

function ehItem(i: ItemDeTexto | { type: string }): i is ItemDeTexto {
  return 'str' in i;
}

export async function extrairLinhas(
  pdfjs: PdfJsMinimo,
  dados: Uint8Array,
): Promise<ResultadoExtracao> {
  // pdf.js transfere o buffer para o worker; passamos uma cópia.
  // Só lemos texto: fontes não importam (verbosity 0 cala avisos sobre elas).
  const tarefa = pdfjs.getDocument({ data: dados.slice(), isEvalSupported: false, verbosity: 0 });
  const doc = await tarefa.promise;
  const linhas: string[] = [];
  let itensTotais = 0;
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const pagina = await doc.getPage(p);
      const { items } = await pagina.getTextContent();
      const itens = items.filter(ehItem).filter((i) => i.str.trim() !== '');
      itensTotais += itens.length;
      // Agrupa por coordenada y (de cima para baixo) e ordena cada linha por x.
      const grupos: Array<{ y: number; itens: ItemDeTexto[] }> = [];
      for (const it of itens) {
        const y = it.transform[5] ?? 0;
        const g = grupos.find((x) => Math.abs(x.y - y) <= TOLERANCIA_Y);
        if (g) g.itens.push(it);
        else grupos.push({ y, itens: [it] });
      }
      grupos.sort((a, b) => b.y - a.y);
      for (const g of grupos) {
        g.itens.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0));
        linhas.push(
          g.itens
            .map((i) => i.str.trim())
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
        );
      }
    }
  } finally {
    await tarefa.destroy();
  }
  return { linhas, semTexto: itensTotais === 0, paginas: doc.numPages };
}
