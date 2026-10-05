import type { DadosLocais } from '@akademos/core';

/** Escapa um campo CSV (RFC 4180). */
function campo(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Histórico em CSV, uma linha por cursada (abre em planilhas). */
export function historicoEmCsv(dados: DadosLocais): string {
  const porCodigo = new Map(dados.matriz.disciplinas.map((d) => [d.codigo, d]));
  const cabecalho = [
    'semestre',
    'codigo',
    'disciplina',
    'creditos',
    'area',
    'nota',
    'frequencia',
    'situacao',
  ];
  const linhas = [...dados.cursadas]
    .sort(
      (a, b) =>
        a.semestre.localeCompare(b.semestre) ||
        a.disciplinaCodigo.localeCompare(b.disciplinaCodigo),
    )
    .map((c) => {
      const d = porCodigo.get(c.disciplinaCodigo);
      return [
        c.semestre,
        c.disciplinaCodigo,
        d?.nome,
        d?.creditos,
        d?.area,
        c.nota,
        c.frequencia,
        c.situacao,
      ];
    });
  return [cabecalho, ...linhas].map((l) => l.map(campo).join(',')).join('\n') + '\n';
}

export interface Exportacao {
  formato: 'akademos/v1';
  exportadoEm: string;
  matriz: { id: string; versaoRegistro: string };
  tabelas: Record<string, unknown[]>;
}

export function montarExportacao(
  dados: DadosLocais,
  tabelas: Record<string, unknown[]>,
  agora = new Date(),
): Exportacao {
  return {
    formato: 'akademos/v1',
    exportadoEm: agora.toISOString(),
    matriz: { id: dados.matriz.id, versaoRegistro: dados.matriz.versaoRegistro },
    tabelas,
  };
}

/** Oferece um arquivo para download sem passar por servidor. */
export function baixar(nome: string, conteudo: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
