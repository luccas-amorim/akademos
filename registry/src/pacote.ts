import { GrafoDePrerequisitos, type PacoteInstituicao } from '@akademos/core';
import {
  EscalasSchema,
  InstituicaoSchema,
  MatrizSchema,
  ModeloHistoricoSchema,
  type ModeloHistoricoYaml,
} from './schema';

/** Arquivos (já lidos como objetos) de uma instituição do registro. */
export interface ArquivosInstituicao {
  /** Nome da pasta, ex.: `ufx`. */
  pasta: string;
  instituicao: unknown;
  escala: unknown;
  /** Chave: caminho relativo `cursos/<curso>/<ano>.yaml`. */
  matrizes: Record<string, unknown>;
  historicoPdf?: unknown;
}

export interface Problema {
  arquivo: string;
  mensagem: string;
  grave: boolean;
}

export interface EntradaCatalogo {
  pacote: PacoteInstituicao;
  ficticia: boolean;
  modeloHistorico: ModeloHistoricoYaml | null;
}

/**
 * Converte e valida os arquivos de uma instituição. Devolve os pacotes de cada
 * matriz e os problemas encontrados (graves impedem o uso do pacote).
 */
export function montarPacotes(arq: ArquivosInstituicao): {
  entradas: EntradaCatalogo[];
  problemas: Problema[];
} {
  const problemas: Problema[] = [];
  const base = `instituicoes/${arq.pasta}`;
  const erro = (arquivo: string, mensagem: string, grave = true) =>
    problemas.push({ arquivo: `${base}/${arquivo}`, mensagem, grave });

  const inst = InstituicaoSchema.safeParse(arq.instituicao);
  const esc = EscalasSchema.safeParse(arq.escala);
  if (!inst.success) inst.error.issues.forEach((i) => erro('instituicao.yaml', descrever(i)));
  if (!esc.success) esc.error.issues.forEach((i) => erro('escala.yaml', descrever(i)));

  let modeloHistorico: ModeloHistoricoYaml | null = null;
  if (arq.historicoPdf !== undefined) {
    const m = ModeloHistoricoSchema.safeParse(arq.historicoPdf);
    if (m.success) {
      modeloHistorico = m.data;
      try {
        new RegExp(m.data.linha);
      } catch (e) {
        erro('historico-pdf.yaml', `expressão "linha" inválida: ${(e as Error).message}`);
      }
    } else m.error.issues.forEach((i) => erro('historico-pdf.yaml', descrever(i)));
  }
  if (!inst.success || !esc.success) return { entradas: [], problemas };

  const i = inst.data;
  if (i.sigla.toLowerCase() !== arq.pasta) {
    erro('instituicao.yaml', `a pasta deve se chamar "${i.sigla.toLowerCase()}"`);
  }
  const escala = esc.data.escalas.find((e) => e.id === i.escala);
  if (!escala) {
    erro('instituicao.yaml', `escala "${i.escala}" não existe em escala.yaml`);
    return { entradas: [], problemas };
  }

  const entradas: EntradaCatalogo[] = [];
  for (const [caminho, bruto] of Object.entries(arq.matrizes)) {
    const r = MatrizSchema.safeParse(bruto);
    if (!r.success) {
      r.error.issues.forEach((iss) => erro(caminho, descrever(iss)));
      continue;
    }
    const m = r.data;
    const nomeEsperado = `cursos/${m.curso.id}/${m.ano}.yaml`;
    if (caminho !== nomeEsperado) erro(caminho, `o arquivo deve ficar em ${nomeEsperado}`);

    const instituicaoId = i.sigla.toLowerCase();
    const cursoId = `${instituicaoId}/${m.curso.id}`;
    const matrizId = `${cursoId}/${m.ano}`;

    // Coerência interna da matriz.
    const vistos = new Set<string>();
    for (const d of m.disciplinas) {
      if (vistos.has(d.codigo)) erro(caminho, `código repetido: ${d.codigo}`);
      vistos.add(d.codigo);
    }
    const arestas = m.disciplinas.flatMap((d) =>
      d.requer.map((r) => ({ disciplinaCodigo: d.codigo, requerCodigo: r })),
    );
    const grafo = new GrafoDePrerequisitos([...vistos], arestas);
    for (const a of grafo.inexistentes()) {
      erro(caminho, `${a.disciplinaCodigo} exige ${a.requerCodigo}, que não existe na matriz`);
    }
    for (const d of m.disciplinas) {
      for (const c of d.correquisitos) {
        if (!vistos.has(c)) erro(caminho, `${d.codigo} tem correquisito inexistente: ${c}`);
      }
    }
    const ciclo = grafo.ciclo();
    if (ciclo) erro(caminho, `ciclo de pré-requisitos: ${ciclo.join(' → ')}`);
    const porCodigo = new Map(m.disciplinas.map((d) => [d.codigo, d]));
    for (const a of arestas) {
      const d = porCodigo.get(a.disciplinaCodigo);
      const r = porCodigo.get(a.requerCodigo);
      if (d && r && r.semestre >= d.semestre) {
        erro(
          caminho,
          `${d.codigo} (${d.semestre}º) exige ${r.codigo}, sugerida no ${r.semestre}º semestre`,
          false,
        );
      }
    }
    const soma = m.disciplinas
      .filter((d) => d.tipo !== 'optativa')
      .reduce((s, d) => s + d.creditos, 0);
    if (soma !== m.creditos_total) {
      erro(
        caminho,
        `créditos não fecham: disciplinas obrigatórias e eletivas somam ${soma}, creditos_total é ${m.creditos_total}`,
      );
    }

    entradas.push({
      ficticia: i.ficticia ?? false,
      modeloHistorico,
      pacote: {
        instituicao: {
          id: instituicaoId,
          sigla: i.sigla,
          nome: i.nome,
          escalaId: escala.id,
          sistema: i.sistema,
          creditosMaxSemestre: i.creditos_max_semestre,
          grade: i.grade,
        },
        escala: {
          id: escala.id,
          nome: escala.nome,
          min: escala.min,
          max: escala.max,
          aprovacao: escala.aprovacao,
          frequenciaMinima: escala.frequencia_minima,
        },
        curso: { id: cursoId, instituicaoId, nome: m.curso.nome, grau: m.curso.grau },
        matriz: {
          id: matrizId,
          cursoId,
          ano: m.ano,
          creditosTotal: m.creditos_total,
          versaoRegistro: m.versao,
          disciplinas: m.disciplinas.map((d) => ({
            codigo: d.codigo,
            matrizId,
            nome: d.nome,
            creditos: d.creditos,
            cargaHoraria: d.carga_horaria ?? Math.round(d.creditos * m.horas_por_credito),
            semestreSugerido: d.semestre,
            area: d.area,
            tipo: d.tipo,
            periodicidade: d.oferta,
            codigosAlternativos: d.codigos_alternativos,
          })),
          prerequisitos: m.disciplinas.flatMap((d) => [
            ...d.requer.map((r) => ({
              disciplinaCodigo: d.codigo,
              requerCodigo: r,
              tipo: 'pre' as const,
            })),
            ...d.correquisitos.map((r) => ({
              disciplinaCodigo: d.codigo,
              requerCodigo: r,
              tipo: 'co' as const,
            })),
          ]),
        },
      },
    });
  }
  return { entradas, problemas };
}

function descrever(issue: { path: PropertyKey[]; message: string }): string {
  const onde = issue.path.length ? issue.path.map(String).join('.') + ': ' : '';
  return onde + issue.message;
}
