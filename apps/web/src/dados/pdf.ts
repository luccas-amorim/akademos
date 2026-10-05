import { extrairLinhas, type PdfJsMinimo, type ResultadoExtracao } from '@akademos/importers';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/** Lê o PDF no aparelho com pdf.js (carregado só quando necessário). */
export async function lerPdf(arquivo: File): Promise<ResultadoExtracao> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  return extrairLinhas(pdfjs as unknown as PdfJsMinimo, dados);
}
