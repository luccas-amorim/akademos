import { formatarInteiro, formatarNota } from '../formato';
import type { FonteInsight, Intervalo } from '../tipos';
import type { ContextoInsights } from './contexto';

export type NivelRisco = 'baixo' | 'moderado' | 'alto';

export interface PrevisaoNota {
  codigo: string;
  /** Faixa prevista, na escala 0–10. Nunca um valor pontual. */
  intervalo: Intervalo;
  nivel: NivelRisco;
  /** Explicação curta para a tabela de risco. */
  porque: string;
  /** De onde vem o número (sempre preenchido). */
  motivo: string;
  fonte: FonteInsight;
}

const arred = (n: number) => Math.round(Math.max(0, Math.min(10, n)) * 10) / 10;
const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function faixa(centro: number, meiaLargura: number): Intervalo {
  return { min: arred(centro - meiaLargura), max: arred(centro + meiaLargura) };
}

/** Previsão pela comunidade: a correlação mais forte com uma nota que o aluno já tem. */
function pelaComunidade(codigo: string, ctx: ContextoInsights): PrevisaoNota | null {
  const stats = ctx.comunidadeValida;
  if (!stats) return null;
  const candidatas = stats.correlacoes
    .filter((c) => c.para === codigo && c.n >= stats.k && ctx.nota10(c.de) !== null)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  const c = candidatas[0];
  if (!c) return null;
  const x = ctx.nota10(c.de)!;
  const intervalo = faixa(c.intercepto + c.inclinacao * x, Math.max(0.4, c.residuo * 0.5));
  return {
    codigo,
    intervalo,
    nivel: 'baixo',
    porque: `${ctx.nome(c.de)} ${formatarNota(x)} tem a maior correlação com esta disciplina (r = ${formatarNota(c.r, { casas: 2 })}).`,
    motivo: `${formatarInteiro(c.n)} históricos anônimos`,
    fonte: 'comunidade',
  };
}

/** Previsão pessoal: requisitos diretos, área e média geral do próprio aluno. */
function pessoal(codigo: string, ctx: ContextoInsights): PrevisaoNota | null {
  const d = ctx.disciplina(codigo);
  if (!d) return null;
  const notasDe = (codigos: string[]) =>
    codigos.map((c) => ctx.nota10(c)).filter((n): n is number => n !== null);
  const requisitos = ctx.matriz.prerequisitos
    .filter((p) => p.disciplinaCodigo === codigo)
    .map((p) => p.requerCodigo);
  const daArea = ctx.matriz.disciplinas.filter((x) => x.area === d.area).map((x) => x.codigo);
  const todas = ctx.matriz.disciplinas.map((x) => x.codigo);

  const partes: Array<[number, number]> = [];
  const nr = notasDe(requisitos);
  const na = notasDe(daArea);
  const ng = notasDe(todas);
  if (nr.length) partes.push([media(nr), 0.5]);
  if (na.length) partes.push([media(na), 0.3]);
  if (ng.length) partes.push([media(ng), 0.2]);
  if (!partes.length) return null;
  const peso = partes.reduce((s, [, w]) => s + w, 0);
  const centro = partes.reduce((s, [v, w]) => s + v * w, 0) / peso;

  const base = nr.length
    ? requisitos
        .filter((r) => ctx.nota10(r) !== null)
        .map((r) => `${ctx.nome(r)} ${formatarNota(ctx.nota10(r))}`)
        .join(', ')
    : na.length
      ? `Média de ${formatarNota(media(na))} em ${d.area}`
      : `Média geral de ${formatarNota(media(ng))}`;
  return {
    codigo,
    intervalo: faixa(centro, 0.5),
    nivel: 'baixo',
    porque: `${base}.`,
    motivo: nr.length ? 'Suas notas nos pré-requisitos e na área' : 'Suas notas na área',
    fonte: 'pessoal',
  };
}

/** Previsão de nota e nível de risco de uma disciplina. */
export function preverNota(codigo: string, ctx: ContextoInsights): PrevisaoNota | null {
  const p = pelaComunidade(codigo, ctx) ?? pessoal(codigo, ctx);
  if (!p) return null;
  const aprov = ctx.aprovacao10;
  let nivel: NivelRisco =
    p.intervalo.min < aprov ? 'alto' : p.intervalo.min < aprov + 0.75 ? 'moderado' : 'baixo';
  let porque = p.porque;

  // Reprovação condicional da comunidade: "perfis com X abaixo de 6,5 reprovam 18%".
  const stats = ctx.comunidadeValida;
  const cond = stats?.condicionais.find((c) => {
    const nota = ctx.nota10(c.dado);
    return c.disciplina === codigo && c.n >= stats.k && nota !== null && nota < c.abaixoDe;
  });
  if (cond && cond.reprovacao >= 0.15) {
    if (nivel === 'baixo') nivel = 'moderado';
    porque = `${Math.round(cond.reprovacao * 100)}% de reprovação para perfis com ${ctx.nome(cond.dado)} abaixo de ${formatarNota(cond.abaixoDe)}.`;
    return {
      ...p,
      nivel,
      porque,
      fonte: 'comunidade',
      motivo: `${formatarInteiro(cond.n)} históricos anônimos`,
    };
  }
  if (nivel === 'baixo' && p.fonte === 'comunidade') {
    const geral = stats?.disciplinas[codigo];
    if (geral && geral.reprovacao < 0.1)
      porque += ' Colegas com perfil parecido raramente reprovam.';
  }
  return { ...p, nivel, porque };
}
