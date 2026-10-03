import curriculo from '@site/src/data/curriculo.json';

/**
 * Regras do curso lidas de src/data/curriculo.json → config, com padrões
 * genéricos. Nenhum componente deve fixar número de dias, faixas ou créditos:
 * tudo o que muda de uma universidade para outra vem daqui.
 *
 * A regra de faixas está duplicada em scripts/validate-curriculo.mjs, que roda
 * em Node puro — ao mudar uma, mude a outra.
 */

export type Plano = Record<string, string>;

/** O que ocupa a grade: disciplina obrigatória ou vaga de eletiva. */
export type ItemDaGrade = {
  creditos: number;
  /** false = não ocupa faixa na semana (ex.: orientação de trabalho final). */
  ocupaGrade?: boolean;
  /** Força o número de faixas, em vez de calculá-lo pelos créditos. */
  faixas?: number;
  /** Rotas em que o item é cumprido fora da grade, com o rótulo exibido. */
  foraDaGradeEm?: Record<string, string>;
};

export type Disciplina = ItemDaGrade & {
  codigo: string;
  nome: string;
  serie: number;
  ch?: number;
  area: string;
  /** Página da disciplina em docs/, sem a extensão (opcional). */
  slug?: string;
  status: string;
  plano: Plano | null;
};

export type VagaEletiva = ItemDaGrade & {
  rotulo: string;
  serie: number;
  plano: Plano;
};

export type SemestreDaRota = {
  semestre: string;
  nota?: string;
  marco?: string;
  estagio?: string;
};

export type Rota = {
  id: string;
  titulo: string;
  subtitulo?: string;
  resumo?: string;
  nota?: string;
  semestres: SemestreDaRota[];
};

type Config = {
  horasPorCredito: number;
  dias: string[];
  faixasPorDia: number;
  creditosPorFaixa: number;
  diasLivresDesejados: number;
  rotuloDia: {singular: string; plural: string};
  coresDasAreas: Record<string, string>;
};

const PADRAO: Config = {
  horasPorCredito: 20,
  dias: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
  faixasPorDia: 2,
  creditosPorFaixa: 2,
  diasLivresDesejados: 1,
  rotuloDia: {singular: 'dia', plural: 'dias'},
  coresDasAreas: {},
};

export const config: Config = {...PADRAO, ...(curriculo as {config?: Partial<Config>}).config};

export const meta = curriculo.meta;
export const calendario = curriculo.calendario as Record<string, string>;
export const disciplinas = curriculo.disciplinas as Disciplina[];
export const vagasEletivas = curriculo.eletivas.alocacao as VagaEletiva[];
export const eletivas = curriculo.eletivas;

export const cenarios = curriculo.cenarios as {
  padrao: string;
  notaDaDecisao?: string;
  troncoComum: SemestreDaRota[];
  rotas: Rota[];
};
export const rotas = cenarios.rotas;
export const rotaPadrao = rotas.find((r) => r.id === cenarios.padrao) ?? rotas[0];

/** Faixas da semana inteira, e o teto que preserva os dias livres desejados. */
export const MAXIMO_FAIXAS = config.dias.length * config.faixasPorDia;
export const TETO_FAIXAS = (config.dias.length - config.diasLivresDesejados) * config.faixasPorDia;

/** Situações que contam como integralizadas. */
export const CONCLUIDA = new Set(['cursada', 'aproveitada']);
export const concluida = (d: Disciplina) => CONCLUIDA.has(d.status);

export const ROTULO_STATUS: Record<string, string> = {
  cursada: 'Cursada',
  aproveitada: 'Aproveitada',
  cursando: 'Cursando',
  adiada: 'Adiada',
  pendente: 'A cursar',
};

export const COR_STATUS: Record<string, string> = {
  cursada: '#16a34a',
  aproveitada: '#16a34a',
  cursando: '#2563eb',
  adiada: '#ea580c',
  pendente: '#6b7280',
};

export const chDe = (d: Disciplina) => d.ch ?? d.creditos * config.horasPorCredito;

/** Faixas que o item ocupa na semana, na rota indicada. */
export function faixasDe(item: ItemDaGrade, rota: string): number {
  if (item.foraDaGradeEm?.[rota]) return 0;
  if (item.ocupaGrade === false) return 0;
  if (typeof item.faixas === 'number') return item.faixas;
  return Math.min(config.faixasPorDia, Math.ceil(item.creditos / config.creditosPorFaixa));
}

/** "1 noite livre", "2 noites livres". */
export function diasLivres(n: number): string {
  const {singular, plural} = config.rotuloDia;
  return n === 1 ? `1 ${singular} livre` : `${n} ${plural} livres`;
}

/** Como o semestre fica na semana, dado o total de faixas. */
export function folgaDaSemana(faixas: number): {ok: boolean; texto: string} {
  if (faixas > MAXIMO_FAIXAS) return {ok: false, texto: 'não cabe na semana'};
  if (faixas > TETO_FAIXAS) {
    return {ok: false, texto: `sem ${config.rotuloDia.singular} livre`};
  }
  if (config.diasLivresDesejados === 0) return {ok: true, texto: 'cabe na semana'};
  return {ok: true, texto: diasLivres(config.diasLivresDesejados)};
}

/** Ordinal do semestre no percurso (1º, 2º...), pelo calendário. */
const ordinalPorSemestre = new Map(
  Object.entries(calendario).map(([ordinal, sem]) => [sem, Number(ordinal)]),
);
export const ordinalDe = (semestre: string) => ordinalPorSemestre.get(semestre);

export type CargaDoSemestre = {faixas: number; creditos: number; itens: number};

/** semestre → carga, numa rota. Inclui disciplinas e vagas de eletiva. */
export function cargaDaRota(rota: string): Map<string, CargaDoSemestre> {
  const porSemestre = new Map<string, CargaDoSemestre>();
  const alocar = (semestre: string | undefined, item: ItemDaGrade) => {
    if (!semestre) return;
    const c = porSemestre.get(semestre) ?? {faixas: 0, creditos: 0, itens: 0};
    c.faixas += faixasDe(item, rota);
    c.creditos += item.creditos;
    c.itens += 1;
    porSemestre.set(semestre, c);
  };
  for (const d of disciplinas) alocar(d.plano?.[rota], d);
  for (const e of vagasEletivas) alocar(e.plano[rota], e);
  return new Map([...porSemestre.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** Números que a página publica sobre cada rota — calculados, nunca digitados. */
export function resumoDaRota(rota: string) {
  const carga = cargaDaRota(rota);
  const semestres = [...carga.keys()];
  // O semestre atual já está em curso: não entra no que falta decidir.
  const futuros = semestres.filter((s) => s !== meta.semestreAtual);
  return {
    formatura: semestres[semestres.length - 1] ?? '—',
    faixasACumprir: futuros.reduce((a, s) => a + carga.get(s)!.faixas, 0),
    semestresComFolga: futuros.filter((s) => carga.get(s)!.faixas <= TETO_FAIXAS).length,
    semestresFuturos: futuros.length,
  };
}

/** Paleta para rotas e áreas sem cor declarada. */
export const PALETA = ['#3b82f6', '#f59e0b', '#8b5cf6', '#0d9488', '#dc2626', '#0891b2', '#be185d', '#4f46e5'];

export const corDaRota = (rota: string) =>
  PALETA[Math.max(0, rotas.findIndex((r) => r.id === rota)) % PALETA.length];

const areasEmOrdem = [...new Set(disciplinas.map((d) => d.area))];
export const corDaArea = (area: string) =>
  config.coresDasAreas[area] ?? PALETA[areasEmOrdem.indexOf(area) % PALETA.length];

/** "2027/2" ou, quando as rotas divergem, "2027/2 · B: 2027/1". */
export function cursarEm(plano: Plano | null): string {
  if (!plano) return '—';
  const base = plano[rotaPadrao.id];
  const outras = rotas
    .filter((r) => r.id !== rotaPadrao.id && plano[r.id] && plano[r.id] !== base)
    .map((r) => `${r.id}: ${plano[r.id]}`);
  return [base, ...outras].join(' · ');
}
