import { compararSemestres, deslocarSemestre, ehSemestreImpar, type Semestre } from '../semestre';
import type { Cursada, Dia, FaixaHoraria, Matriz, Oferta } from '../tipos';
import { GrafoDePrerequisitos } from './grafo';

const CUMPRIDA = new Set<Cursada['situacao']>(['aprovada', 'aproveitada']);

/** Disciplinas aprovadas e em curso, pelo histórico. */
function estadoAtual(cursadas: readonly Cursada[]) {
  const aprovadas = new Set<string>();
  const cursando = new Set<string>();
  for (const c of cursadas) {
    if (CUMPRIDA.has(c.situacao)) aprovadas.add(c.disciplinaCodigo);
  }
  for (const c of cursadas) {
    if (c.situacao === 'cursando' && !aprovadas.has(c.disciplinaCodigo))
      cursando.add(c.disciplinaCodigo);
  }
  return { aprovadas, cursando };
}

function grafoDa(matriz: Matriz): GrafoDePrerequisitos {
  return new GrafoDePrerequisitos(
    matriz.disciplinas.map((d) => d.codigo),
    matriz.prerequisitos.filter((p) => p.tipo === 'pre'),
  );
}

/**
 * Cadeia mais longa de disciplinas ainda não cursadas, ligadas por
 * pré-requisitos: o mínimo de semestres até a formatura.
 */
export function caminhoCritico(matriz: Matriz, cursadas: readonly Cursada[]): string[] {
  const { aprovadas, cursando } = estadoAtual(cursadas);
  const restantes = matriz.disciplinas
    .map((d) => d.codigo)
    .filter((c) => !aprovadas.has(c) && !cursando.has(c));
  const restSet = new Set(restantes);
  const sub = new GrafoDePrerequisitos(
    restantes,
    matriz.prerequisitos.filter(
      (p) => p.tipo === 'pre' && restSet.has(p.disciplinaCodigo) && restSet.has(p.requerCodigo),
    ),
  );
  let melhor: string[] = [];
  const cadeia = (c: string): string[] => {
    const seguintes = sub.destrava(c).map(cadeia);
    const maior = seguintes.reduce<string[]>((a, b) => (b.length > a.length ? b : a), []);
    return [c, ...maior];
  };
  for (const c of restantes) {
    if (sub.requisitos(c).length) continue;
    const ch = cadeia(c);
    if (ch.length > melhor.length) melhor = ch;
  }
  return melhor;
}

export interface EntradaPrevisao {
  matriz: Matriz;
  cursadas: readonly Cursada[];
  /** Semestre em curso; o cronograma começa no seguinte. */
  semestreAtual: Semestre;
  limiteCreditos: number;
  /** Disciplinas já decididas por semestre (ex.: o plano de matrícula). */
  fixos?: Record<Semestre, readonly string[]>;
  /** Teto de semestres simulados, para não rodar para sempre. */
  maxSemestres?: number;
}

export interface Previsao {
  /** Semestre de formatura, ou `null` se não há como concluir. */
  formatura: Semestre | null;
  cronograma: Array<{ semestre: Semestre; codigos: string[] }>;
  impedimento: string | null;
}

function ofertadaEm(periodicidade: string, semestre: Semestre): boolean {
  if (periodicidade === 'ambos') return true;
  return ehSemestreImpar(semestre) === (periodicidade === 'impar');
}

/**
 * Menor semestre em que todos os créditos fecham, respeitando pré-requisitos,
 * limite de créditos por semestre e periodicidade de oferta. Guloso: em cada
 * semestre prioriza a disciplina que inicia a cadeia mais longa.
 */
export function preverFormatura(e: EntradaPrevisao): Previsao {
  const { matriz, limiteCreditos } = e;
  const grafo = grafoDa(matriz);
  const porCodigo = new Map(matriz.disciplinas.map((d) => [d.codigo, d]));
  const { aprovadas, cursando } = estadoAtual(e.cursadas);
  // O que está em curso é tratado como concluído ao fim do semestre atual.
  const feitas = new Set([...aprovadas, ...cursando]);
  const restantes = new Set(
    matriz.disciplinas
      .filter((d) => d.tipo !== 'optativa' && !feitas.has(d.codigo))
      .map((d) => d.codigo),
  );
  const cronograma: Previsao['cronograma'] = [];
  const maxSemestres = e.maxSemestres ?? 30;

  if (restantes.size === 0) {
    return { formatura: e.semestreAtual, cronograma, impedimento: null };
  }

  let semestre = e.semestreAtual;
  let semProgresso = 0;
  for (let i = 0; i < maxSemestres && restantes.size; i++) {
    semestre = deslocarSemestre(semestre, 1);
    const fixos = e.fixos?.[semestre];
    let escolhidas: string[];
    if (fixos) {
      escolhidas = fixos.filter((c) => restantes.has(c));
    } else {
      const candidatas = [...restantes]
        .filter((c) => grafo.requisitos(c).every((r) => feitas.has(r)))
        .filter((c) => ofertadaEm(porCodigo.get(c)!.periodicidade, semestre))
        .sort((a, b) => {
          const da = porCodigo.get(a)!;
          const db = porCodigo.get(b)!;
          return (
            grafo.profundidade(b) - grafo.profundidade(a) ||
            da.semestreSugerido - db.semestreSugerido ||
            a.localeCompare(b)
          );
        });
      escolhidas = [];
      let creditos = 0;
      for (const c of candidatas) {
        const cr = porCodigo.get(c)!.creditos;
        if (creditos + cr > limiteCreditos) continue;
        escolhidas.push(c);
        creditos += cr;
      }
    }
    if (escolhidas.length === 0) {
      // Dois anos sem nada a cursar: algo impede a conclusão.
      if (++semProgresso >= 4) break;
      continue;
    }
    semProgresso = 0;
    for (const c of escolhidas) {
      restantes.delete(c);
      feitas.add(c);
    }
    cronograma.push({ semestre, codigos: escolhidas });
  }

  if (restantes.size) {
    const grandes = [...restantes].filter((c) => porCodigo.get(c)!.creditos > limiteCreditos);
    return {
      formatura: null,
      cronograma,
      impedimento: grandes.length
        ? `${grandes.join(', ')} ultrapassa(m) o limite de ${limiteCreditos} créditos por semestre`
        : `Não foi possível encaixar ${[...restantes].join(', ')}`,
    };
  }
  return { formatura: cronograma.at(-1)!.semestre, cronograma, impedimento: null };
}

/* ——— Grade semanal ——— */

export interface Conflito {
  dia: Dia;
  slot: number;
  ofertas: Oferta[];
}

export function conflitosDaGrade(ofertas: readonly Oferta[]): Conflito[] {
  const celulas = new Map<string, Conflito>();
  for (const o of ofertas) {
    for (const h of o.horarios) {
      const k = `${h.dia}:${h.slot}`;
      const c = celulas.get(k) ?? { dia: h.dia, slot: h.slot, ofertas: [] };
      if (!c.ofertas.includes(o)) c.ofertas.push(o);
      celulas.set(k, c);
    }
  }
  return [...celulas.values()].filter((c) => c.ofertas.length > 1);
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Horas de aula por semana (faixas distintas ocupadas). */
export function horasSemanais(ofertas: readonly Oferta[], faixas: readonly FaixaHoraria[]): number {
  const ocupadas = new Set(ofertas.flatMap((o) => o.horarios.map((h) => `${h.dia}:${h.slot}`)));
  let total = 0;
  for (const k of ocupadas) {
    const f = faixas[Number(k.split(':')[1])];
    if (f) total += (minutos(f.fim) - minutos(f.inicio)) / 60;
  }
  return Math.round(total * 10) / 10;
}

export function diasLivres(ofertas: readonly Oferta[], dias: readonly Dia[]): Dia[] {
  const usados = new Set(ofertas.flatMap((o) => o.horarios.map((h) => h.dia)));
  return dias.filter((d) => !usados.has(d));
}

/**
 * Liga ou desliga uma turma no plano. Escolher uma turma remove a outra turma
 * da mesma disciplina (docs/DESIGN.md › Interações).
 */
export function alternarTurma(
  plano: readonly string[],
  ofertaId: string,
  ofertas: readonly Oferta[],
): string[] {
  if (plano.includes(ofertaId)) return plano.filter((id) => id !== ofertaId);
  const alvo = ofertas.find((o) => o.id === ofertaId);
  if (!alvo) return [...plano];
  const mesmaDisciplina = new Set(
    ofertas.filter((o) => o.disciplinaCodigo === alvo.disciplinaCodigo).map((o) => o.id),
  );
  return [...plano.filter((id) => !mesmaDisciplina.has(id)), ofertaId];
}

/**
 * Estimativa da chance de vaga (0–100) pela razão interessados/vagas e pela
 * faixa de prioridade do aluno (1 = maior prioridade). Curva logística
 * ajustada a ofertas passadas; é uma regra, não um modelo treinado.
 */
export function chanceDeVaga(
  turma: Pick<Oferta, 'vagas' | 'interessados'>,
  faixaPrioridade = 3,
): number {
  if (turma.vagas <= 0) return 1;
  const razao = turma.interessados / turma.vagas;
  // Cada faixa acima da 3ª desloca o ponto de equilíbrio em 15%.
  const equilibrio = 1.2 + (3 - faixaPrioridade) * 0.15;
  const p = 1 / (1 + Math.exp(5 * (razao - equilibrio)));
  return Math.max(1, Math.min(99, Math.round(p * 100)));
}

/** Semestres do cronograma em ordem (útil para exibir). */
export function ordenarCronograma(p: Previsao): Previsao['cronograma'] {
  return [...p.cronograma].sort((a, b) => compararSemestres(a.semestre, b.semestre));
}
