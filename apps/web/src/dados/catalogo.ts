import { montarPacotes, type ArquivosInstituicao, type EntradaCatalogo } from '@akademos/registry';

/**
 * Catálogo de instituições embutido no app (registro em YAML, convertido no
 * build). Funciona offline; a atualização pelo espelho /registry vem depois.
 */
const arquivos = import.meta.glob<unknown>('../../../../registry/instituicoes/**/*.yaml', {
  eager: true,
  import: 'default',
});

function agrupar(): ArquivosInstituicao[] {
  const porPasta = new Map<string, ArquivosInstituicao>();
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    const m = /instituicoes\/([^/]+)\/(.+)$/.exec(caminho);
    if (!m) continue;
    const [, pasta, relativo] = m as unknown as [string, string, string];
    const inst = porPasta.get(pasta) ?? {
      pasta,
      instituicao: undefined,
      escala: undefined,
      matrizes: {},
    };
    if (relativo === 'instituicao.yaml') inst.instituicao = conteudo;
    else if (relativo === 'escala.yaml') inst.escala = conteudo;
    else if (relativo === 'historico-pdf.yaml') inst.historicoPdf = conteudo;
    else if (relativo.startsWith('cursos/')) inst.matrizes[relativo] = conteudo;
    porPasta.set(pasta, inst);
  }
  return [...porPasta.values()];
}

export const CATALOGO: EntradaCatalogo[] = agrupar().flatMap((arq) => {
  const { entradas, problemas } = montarPacotes(arq);
  for (const p of problemas.filter((x) => x.grave))
    console.error(`Registro: ${p.arquivo}: ${p.mensagem}`);
  return entradas;
});

export function entradaDaMatriz(matrizId: string): EntradaCatalogo | undefined {
  return CATALOGO.find((e) => e.pacote.matriz.id === matrizId);
}
