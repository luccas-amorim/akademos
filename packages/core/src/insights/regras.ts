/**
 * Regras determinísticas do motor de insights. Cada uma é uma função pura
 * `(ctx) => Insight[]` e todo insight traz `motivo` e `fonte` (regra 5 do
 * CLAUDE.md). Os textos saem em pt-BR; a UI os exibe como dados.
 */
import { aderenciaAoObjetivo } from '../carreira';
import { formatarIntervalo, formatarNota, tempoDecorrido } from '../formato';
import { chanceDeVaga, diasLivres, horasSemanais, preverFormatura } from '../planner/planejador';
import { compararSemestres, semestreDoOrdinal } from '../semestre';
import type { Dia, Insight, Oferta } from '../tipos';
import type { ContextoInsights } from './contexto';
import { preverNota } from './previsao';

export type Regra = (ctx: ContextoInsights) => Insight[];

const NOME_DIA: Record<Dia, string> = {
  seg: 'segunda',
  ter: 'terça',
  qua: 'quarta',
  qui: 'quinta',
  sex: 'sexta',
  sab: 'sábado',
};

function lista(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? '';
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}

function rotuloOferta(o: Oferta, ctx: ContextoInsights): string {
  return o.titulo ?? ctx.nome(o.disciplinaCodigo);
}

/* ——— Formatura: disciplina que, se não entrar agora, atrasa a formatura ——— */

export const regraFormatura: Regra = (ctx) => {
  const limite = ctx.instituicao.creditosMaxSemestre;
  const base = {
    matriz: ctx.matriz,
    cursadas: ctx.cursadas,
    semestreAtual: ctx.semestreAtual,
    limiteCreditos: limite,
  };
  const prevista = preverFormatura(base).formatura;
  if (!prevista) return [];
  const out: Insight[] = [];
  for (const d of ctx.matriz.disciplinas) {
    if (!ctx.elegivel(d.codigo)) continue;
    const sem = preverFormatura({
      ...base,
      proibidas: { [ctx.proximoSemestre]: [d.codigo] },
    }).formatura;
    if (!sem || compararSemestres(sem, prevista) <= 0) continue;
    const dependentes = ctx.matriz.prerequisitos
      .filter((p) => p.requerCodigo === d.codigo)
      .map((p) => ctx.nome(p.disciplinaCodigo));
    const atrasada = ctx.situacoes.get(d.codigo) === 'pend';
    const desde = semestreDoOrdinal(ctx.aluno.ingresso, d.semestreSugerido);
    const abertura = atrasada ? `Adiada desde ${desde}` : 'Fica para depois no seu plano';
    const exigida = dependentes.length ? ` e exigida por ${lista(dependentes)}` : '';
    out.push({
      id: `formatura:${d.codigo}`,
      tipo: 'risco',
      rotulo: 'Formatura',
      alvo: d.codigo,
      severidade: 'alta',
      titulo: `${d.nome} segura sua formatura`,
      texto: `${abertura}${exigida}. Se não entrar em ${ctx.proximoSemestre}, a formatura passa de ${prevista} para ${sem}.`,
      motivo: `Cadeia de pré-requisitos da matriz ${ctx.matriz.ano}`,
      fonte: 'regra',
      acao: { rotulo: `Planejar ${ctx.proximoSemestre}`, destino: 'planejar' },
    });
  }
  return out;
};

/* ——— Risco: disciplinas em curso com previsão perto da reprovação ——— */

export const regraRisco: Regra = (ctx) =>
  ctx.cursadas
    .filter((c) => c.situacao === 'cursando' && c.semestre === ctx.semestreAtual)
    .flatMap((c): Insight[] => {
      const p = preverNota(c.disciplinaCodigo, ctx);
      if (!p || p.nivel === 'baixo') return [];
      return [
        {
          id: `risco:${c.disciplinaCodigo}`,
          tipo: 'risco',
          rotulo: 'Risco',
          alvo: c.disciplinaCodigo,
          severidade: p.nivel === 'alto' ? 'alta' : 'media',
          titulo: `Atenção em ${ctx.nome(c.disciplinaCodigo)}`,
          texto: `${p.porque} Previsão de ${formatarIntervalo(p.intervalo)}; aprovação a partir de ${formatarNota(ctx.aprovacao10)}.`,
          motivo: p.motivo,
          fonte: p.fonte,
          acao: { rotulo: 'Ver desempenho', destino: 'desempenho' },
        },
      ];
    });

/* ——— Lotação: turma com mais interessados que vagas ——— */

export const regraLotacao: Regra = (ctx) => {
  const faixa = ctx.faixaPrioridade ?? 3;
  const porDisciplina = new Map<string, Oferta[]>();
  for (const o of ctx.ofertasProximas) {
    if (!ctx.elegivel(o.disciplinaCodigo)) continue;
    porDisciplina.set(o.disciplinaCodigo, [...(porDisciplina.get(o.disciplinaCodigo) ?? []), o]);
  }
  const planoIds = new Set(ctx.planoProximo.map((o) => o.id));
  const out: Insight[] = [];
  for (const turmas of porDisciplina.values()) {
    const lotada = turmas
      .filter((t) => t.interessados > t.vagas)
      .sort((a, b) => b.interessados / b.vagas - a.interessados / a.vagas)[0];
    if (!lotada) continue;
    const alternativa = turmas
      .filter((t) => t.id !== lotada.id && t.titulo === lotada.titulo)
      .map((t) => ({ t, chance: chanceDeVaga(t, faixa) }))
      .sort((a, b) => b.chance - a.chance)[0];
    const lido = lotada.atualizadaEm
      ? ` · ${tempoDecorrido(new Date(lotada.atualizadaEm), ctx.agora)}`
      : '';
    const sistema =
      ctx.instituicao.sistema === 'sigaa'
        ? 'SIGAA'
        : ctx.instituicao.sistema === 'jupiter'
          ? 'JúpiterWeb'
          : 'sistema';
    out.push({
      id: `lotacao:${lotada.id}`,
      tipo: 'lotacao',
      rotulo: 'Lotação',
      alvo: lotada.id,
      severidade: planoIds.has(lotada.id) ? 'alta' : 'media',
      titulo: `${rotuloOferta(lotada, ctx)} ${lotada.turma} deve lotar`,
      texto:
        `${lotada.interessados} interessados para ${lotada.vagas} vagas.` +
        (alternativa && alternativa.chance >= 55
          ? ` A ${alternativa.t.turma} tem ${alternativa.chance}% de chance para a sua faixa de prioridade.`
          : ' Escolha uma turma reserva.'),
      motivo: `Pré-matrícula ${sistema} ${ctx.instituicao.sigla}${lido}`,
      fonte: 'regra',
      acao: { rotulo: 'Ver turmas', destino: 'planejar' },
    });
  }
  return out;
};

/* ——— Correlação: nota já obtida antecipa disciplina futura ——— */

export const regraCorrelacao: Regra = (ctx) => {
  const stats = ctx.comunidadeValida;
  if (!stats) return [];
  return stats.correlacoes
    .filter((c) => c.n >= stats.k && Math.abs(c.r) >= 0.5)
    .filter((c) => ctx.nota10(c.de) !== null)
    .filter((c) => {
      const s = ctx.situacoes.get(c.para);
      return s === 'lib' || s === 'pend' || s === 'blq';
    })
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 3)
    .map((c): Insight => {
      const x = ctx.nota10(c.de)!;
      const centro = c.intercepto + c.inclinacao * x;
      const meia = Math.max(0.4, c.residuo * 0.5);
      const intervalo = {
        min: Math.round(Math.max(0, centro - meia) * 10) / 10,
        max: Math.round(Math.min(10, centro + meia) * 10) / 10,
      };
      const apertado = intervalo.min < ctx.aprovacao10 + 1;
      return {
        id: `correlacao:${c.de}:${c.para}`,
        tipo: 'correlacao',
        rotulo: 'Correlação',
        alvo: c.para,
        severidade: apertado ? 'media' : 'baixa',
        titulo: `${ctx.nome(c.de)} antecipa ${ctx.nome(c.para)}`,
        texto:
          `r = ${formatarNota(c.r, { casas: 2 })} entre as duas na sua matriz. Sua nota sugere ${formatarNota(intervalo.min)} a ${formatarNota(intervalo.max)}.` +
          (apertado
            ? ` Revisar o conteúdo de ${ctx.nome(c.de)} antes de começar tende a ajudar.`
            : ''),
        motivo: `${c.n.toLocaleString('pt-BR')} históricos anônimos`,
        fonte: 'comunidade',
        acao: { rotulo: 'Ver correlações', destino: 'desempenho' },
      };
    });
};

/* ——— Carga: o plano do próximo semestre frente ao seu histórico ——— */

export const regraCarga: Regra = (ctx) => {
  const plano = ctx.planoProximo;
  if (!plano.length) return [];
  const creditosDe = (codigos: Iterable<string>) =>
    [...new Set(codigos)].reduce((s, c) => s + (ctx.disciplina(c)?.creditos ?? 0), 0);
  const creditos = creditosDe(plano.map((o) => o.disciplinaCodigo));
  const horas = horasSemanais(plano, ctx.instituicao.grade.faixas);

  const porSemestre = new Map<string, string[]>();
  for (const c of ctx.cursadas) {
    if (c.situacao === 'cursando' || c.situacao === 'aproveitada') continue;
    porSemestre.set(c.semestre, [...(porSemestre.get(c.semestre) ?? []), c.disciplinaCodigo]);
  }
  const historico = [...porSemestre.values()].map(creditosDe);
  const mediaHist = historico.length
    ? historico.reduce((s, x) => s + x, 0) / historico.length
    : null;

  const livres = diasLivres(plano, ctx.instituicao.grade.dias);
  const ocupacao = new Map<Dia, number>();
  for (const o of plano)
    for (const h of o.horarios) ocupacao.set(h.dia, (ocupacao.get(h.dia) ?? 0) + 1);
  const leves = ctx.instituicao.grade.dias.filter((d) => ocupacao.get(d) === 1);
  const folga = livres.length
    ? `${NOME_DIA[livres[0]!]} livre`
    : leves.length
      ? `${NOME_DIA[leves.at(-1)!]} quase livre`
      : 'semana cheia';

  const acima = mediaHist !== null && creditos > mediaHist * 1.25;
  const usados = ctx.instituicao.grade.dias
    .filter((d) => (ocupacao.get(d) ?? 0) >= 2)
    .map((d) => NOME_DIA[d]);
  return [
    {
      id: `carga:${ctx.proximoSemestre}`,
      tipo: 'carga',
      rotulo: 'Carga',
      alvo: ctx.proximoSemestre,
      severidade: acima ? 'media' : 'baixa',
      titulo: acima
        ? `${ctx.proximoSemestre} com ${creditos} créditos, acima do seu histórico`
        : `${ctx.proximoSemestre} com ${formatarNota(horas, { casas: 0 })} h de aula, ${folga}`,
      texto: acima
        ? `Sua média é de ${Math.round(mediaHist!)} créditos por semestre. Considere adiar uma disciplina que não esteja no caminho crítico.`
        : `O plano atual concentra aulas ${usados.length ? `em ${lista(usados)}` : 'em poucos horários'} (${creditos} créditos).` +
          (livres.length || leves.length
            ? ' Bom para buscar estágio ou iniciação científica com antecedência.'
            : ''),
      motivo: `Seu plano de ${ctx.proximoSemestre}`,
      fonte: 'pessoal',
      acao: { rotulo: 'Abrir semana', destino: 'planejar' },
    },
  ];
};

/* ——— Carreira: aderência ao objetivo e a disciplina que mais ajuda ——— */

export const regraCarreira: Regra = (ctx) => {
  const objetivo = ctx.objetivos.find((o) => o.principal);
  if (!objetivo || !objetivo.competencias.length) return [];
  const ader = aderenciaAoObjetivo(objetivo, ctx.situacoes);
  const fracas = ader.competencias.filter((c) => c.percentual < 50);
  const faixa = ctx.faixaPrioridade ?? 3;

  // Turma do próximo semestre que cobre mais competências fracas.
  const sugestao = ctx.ofertasProximas
    .filter((o) => ctx.elegivel(o.disciplinaCodigo))
    .map((o) => ({
      o,
      cobre: fracas.filter((c) => c.faltando.includes(o.disciplinaCodigo)).map((c) => c.nome),
      chance: chanceDeVaga(o, faixa),
    }))
    .filter((x) => x.cobre.length)
    .sort((a, b) => b.cobre.length - a.cobre.length || b.chance - a.chance)[0];

  const faltam = fracas.map((c) => c.nome.toLowerCase());
  return [
    {
      id: `carreira:${objetivo.id}`,
      tipo: 'carreira',
      rotulo: 'Carreira',
      alvo: objetivo.id,
      severidade: ader.percentual < 50 ? 'media' : 'baixa',
      titulo: `${objetivo.titulo}: ${ader.percentual}% coberto`,
      texto:
        (faltam.length
          ? `Ainda fracas: ${lista(faltam)}.`
          : 'Todas as competências estão encaminhadas.') +
        (sugestao
          ? ` ${sugestao.o.titulo ? `A eletiva ${sugestao.o.titulo}` : ctx.nome(sugestao.o.disciplinaCodigo)} cobre ${sugestao.cobre.length > 1 ? `${sugestao.cobre.length} lacunas` : 'uma lacuna'} e tem ${sugestao.chance}% de chance de vaga.`
          : ''),
      motivo: 'Competências declaradas por você',
      fonte: 'pessoal',
      acao: { rotulo: 'Ver aderência', destino: 'carreira' },
    },
  ];
};

export const REGRAS: Regra[] = [
  regraFormatura,
  regraLotacao,
  regraCarreira,
  regraRisco,
  regraCorrelacao,
  regraCarga,
];
