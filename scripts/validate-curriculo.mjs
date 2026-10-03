#!/usr/bin/env node
/**
 * Conferidor da matriz curricular.
 *
 * src/data/curriculo.json é a FONTE; horario.json e notas.json apontam para
 * ela pelo código da disciplina. Este script falha o build quando os três
 * divergem — o erro barato de cometer e caro de descobrir.
 *
 * Uso: npm run validate:curriculo
 */

import {readFileSync, existsSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const erros = [];
const avisos = [];

const err = (msg) => erros.push(msg);
const warn = (msg) => avisos.push(msg);

const ler = (arquivo) => JSON.parse(readFileSync(join(raiz, 'src/data', arquivo), 'utf8'));

// ---------------------------------------------------------------- carregamento
const curriculo = ler('curriculo.json');
const {meta, calendario, cenarios, eletivas, disciplinas} = curriculo;

// Os mesmos padrões de src/lib/grade.ts — ao mudar um, mude o outro.
const config = {
  horasPorCredito: 20,
  dias: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
  faixasPorDia: 2,
  creditosPorFaixa: 2,
  diasLivresDesejados: 1,
  rotuloDia: {singular: 'dia', plural: 'dias'},
  ...curriculo.config,
};

const STATUS_VALIDOS = new Set(['cursada', 'aproveitada', 'cursando', 'adiada', 'pendente']);
const CONCLUIDA = new Set(['cursada', 'aproveitada']);

const ROTAS = cenarios.rotas.map((r) => r.id);
const TRONCO = cenarios.troncoComum.map((s) => s.semestre);
const MAXIMO_FAIXAS = config.dias.length * config.faixasPorDia;
const TETO_FAIXAS = (config.dias.length - config.diasLivresDesejados) * config.faixasPorDia;

const chDe = (d) => d.ch ?? d.creditos * config.horasPorCredito;

/** Faixas que o item ocupa na semana, na rota indicada. */
const faixasDe = (item, rota) => {
  if (item.foraDaGradeEm?.[rota]) return 0;
  if (item.ocupaGrade === false) return 0;
  if (typeof item.faixas === 'number') return item.faixas;
  return Math.min(config.faixasPorDia, Math.ceil(item.creditos / config.creditosPorFaixa));
};

// -------------------------------------------------------------- 0. config
for (const campo of ['series', 'semestreAtual', 'chExigida', 'creditosExigidos', 'creditosObrigatorios', 'creditosEletivos']) {
  if (meta?.[campo] === undefined) err(`meta: campo obrigatório ausente "${campo}"`);
}
if (!Array.isArray(config.dias) || config.dias.length === 0) {
  err('config.dias: lista de dias de aula vazia');
}
if (config.diasLivresDesejados < 0 || config.diasLivresDesejados >= config.dias.length) {
  err(`config.diasLivresDesejados = ${config.diasLivresDesejados}: precisa ficar entre 0 e ${config.dias.length - 1}`);
}
for (const campo of ['horasPorCredito', 'faixasPorDia', 'creditosPorFaixa']) {
  if (!(config[campo] > 0)) err(`config.${campo} precisa ser um número positivo`);
}
if (!ROTAS.length) err('cenarios.rotas: declare ao menos uma rota');
if (!ROTAS.includes(cenarios.padrao)) {
  err(`cenarios.padrao = "${cenarios.padrao}", que não é id de nenhuma rota [${ROTAS}]`);
}
if (new Set(ROTAS).size !== ROTAS.length) err(`cenarios.rotas: ids repetidos [${ROTAS}]`);

// ------------------------------------------------------------ 1. integridade
const vistos = new Map();

const conferirPlano = (rotulo, plano) => {
  for (const rota of ROTAS) {
    if (!plano[rota]) err(`${rotulo}: falta o semestre da rota ${rota} em "plano"`);
  }
  for (const rota of Object.keys(plano)) {
    if (!ROTAS.includes(rota)) err(`${rotulo}: "plano" cita a rota ${rota}, que não existe`);
  }
  // No tronco comum todas as rotas são idênticas por definição.
  const semestres = ROTAS.map((r) => plano[r]);
  const noTronco = semestres.filter((s) => TRONCO.includes(s));
  if (noTronco.length && new Set(semestres).size !== 1) {
    err(`${rotulo}: no tronco comum as rotas têm de coincidir (${JSON.stringify(plano)})`);
  }
};

const conferirForaDaGrade = (rotulo, item) => {
  for (const rota of Object.keys(item.foraDaGradeEm ?? {})) {
    if (!ROTAS.includes(rota)) err(`${rotulo}: "foraDaGradeEm" cita a rota ${rota}, que não existe`);
  }
};

for (const d of disciplinas) {
  for (const campo of ['codigo', 'nome', 'serie', 'creditos', 'area', 'status']) {
    if (d[campo] === undefined || d[campo] === null || d[campo] === '') {
      err(`${d.codigo ?? '(sem código)'}: campo obrigatório ausente "${campo}"`);
    }
  }
  if (vistos.has(d.codigo)) err(`código duplicado: ${d.codigo}`);
  vistos.set(d.codigo, d);

  if (!STATUS_VALIDOS.has(d.status)) {
    err(`${d.codigo}: status inválido "${d.status}" (válidos: ${[...STATUS_VALIDOS].join(', ')})`);
  }
  if (d.serie < 1 || d.serie > meta.series) {
    err(`${d.codigo}: série ${d.serie} fora da faixa 1–${meta.series}`);
  }
  // Disciplina concluída não tem semestre planejado, e vice-versa.
  if (CONCLUIDA.has(d.status)) {
    if (d.plano) err(`${d.codigo}: "${d.status}" não deveria ter "plano" (${JSON.stringify(d.plano)})`);
  } else if (!d.plano || typeof d.plano !== 'object') {
    err(`${d.codigo}: status "${d.status}" exige "plano" com um semestre por rota`);
  } else {
    conferirPlano(d.codigo, d.plano);
  }
  conferirForaDaGrade(d.codigo, d);
  // A página da disciplina é opcional; se declarada, precisa existir.
  if (d.slug && !['md', 'mdx'].some((ext) => existsSync(join(raiz, 'docs', `${d.slug}.${ext}`)))) {
    err(`${d.codigo}: "slug" aponta para docs/${d.slug}.mdx, que não existe`);
  }
}

// ----------------------------------------------------------- 2. totais oficiais
const somaCreditos = disciplinas.reduce((a, d) => a + d.creditos, 0);
const somaCH = disciplinas.reduce((a, d) => a + chDe(d), 0);

if (somaCreditos !== meta.creditosObrigatorios) {
  err(`soma dos créditos obrigatórios = ${somaCreditos}, meta declara ${meta.creditosObrigatorios}`);
}
if (meta.creditosObrigatorios + meta.creditosEletivos !== meta.creditosExigidos) {
  err(`obrigatórios (${meta.creditosObrigatorios}) + eletivos (${meta.creditosEletivos}) ≠ exigidos (${meta.creditosExigidos})`);
}
const chEsperada = somaCH + meta.creditosEletivos * config.horasPorCredito;
if (chEsperada !== meta.chExigida) {
  err(`CH exigida declarada ${meta.chExigida}h, mas obrigatórias (${somaCH}h) + eletivas (${meta.creditosEletivos * config.horasPorCredito}h) = ${chEsperada}h`);
}

for (const e of eletivas.alocacao) {
  const rotulo = `eletiva "${e.rotulo}"`;
  if (!e.serie || e.serie < 1 || e.serie > meta.series) {
    err(`${rotulo}: série inválida ou ausente (${e.serie})`);
  }
  if (!e.plano) err(`${rotulo}: falta "plano"`);
  else conferirPlano(rotulo, e.plano);
  conferirForaDaGrade(rotulo, e);
}

const crEletivas = eletivas.alocacao.reduce((a, e) => a + e.creditos, 0);
if (crEletivas !== meta.creditosEletivos) {
  err(`eletivas alocadas somam ${crEletivas} créditos, meta declara ${meta.creditosEletivos}`);
}
// A escolha é registrada por nome; a alocação, por vaga. Ainda não ter
// escolhido não é erro.
if ((eletivas.escolhas ?? []).length !== eletivas.alocacao.length) {
  warn(`${(eletivas.escolhas ?? []).length} eletiva(s) escolhida(s) para ${eletivas.alocacao.length} vaga(s) alocada(s)`);
}

// --------------------------- 3. invariante do plano: teto de faixas por semestre
// O que limita a matrícula é FAIXA de horário, não crédito. Acima do teto não
// sobra o dia livre desejado; acima do máximo, não cabe na semana.
/** rota -> (semestre -> carga) */
const cargaPorRota = new Map();
for (const rota of ROTAS) {
  const porSemestre = new Map();
  const alocar = (semestre, creditos, faixas, item) => {
    if (!porSemestre.has(semestre)) porSemestre.set(semestre, {total: 0, faixas: 0, itens: []});
    const bucket = porSemestre.get(semestre);
    bucket.total += creditos;
    bucket.faixas += faixas;
    bucket.itens.push(item);
  };
  for (const d of disciplinas) {
    if (d.plano?.[rota]) alocar(d.plano[rota], d.creditos, faixasDe(d, rota), d.codigo);
  }
  for (const e of eletivas.alocacao) {
    if (e.plano?.[rota]) alocar(e.plano[rota], e.creditos, faixasDe(e, rota), e.rotulo);
  }
  cargaPorRota.set(rota, porSemestre);
}

const calendarioValores = new Set(Object.values(calendario));
const semestresDeAlgumaRota = new Set();

for (const rota of ROTAS) {
  const porSemestre = cargaPorRota.get(rota);
  const semestres = [...porSemestre.keys()].sort();
  for (const s of semestres) semestresDeAlgumaRota.add(s);

  for (const s of semestres) {
    const {faixas} = porSemestre.get(s);
    if (faixas > MAXIMO_FAIXAS) {
      err(`rota ${rota}, ${s}: ${faixas} faixas não cabem na semana (máximo ${MAXIMO_FAIXAS})`);
    } else if (faixas > TETO_FAIXAS) {
      warn(`rota ${rota}, ${s}: ${faixas} faixas — acima do teto de ${TETO_FAIXAS}, sem ${config.rotuloDia.singular} livre`);
    }
    if (!calendarioValores.has(s)) {
      err(`rota ${rota} aponta para "${s}", que não consta no calendário`);
    }
    if (s < meta.semestreAtual) {
      err(`rota ${rota}: ${s} é anterior ao semestre atual (${meta.semestreAtual})`);
    }
  }

  // A rota declara seus semestres: o declarado tem de bater com o calculado.
  const declarados = [
    ...TRONCO,
    ...cenarios.rotas.find((r) => r.id === rota).semestres.map((x) => x.semestre),
  ].sort();
  if (declarados.join() !== semestres.join()) {
    err(`rota ${rota}: semestres declarados [${declarados}] ≠ semestres com disciplina [${semestres}]`);
  }

  // Toda rota integraliza os mesmos créditos — mudam as datas, não o curso.
  const creditos = semestres.reduce((a, s) => a + porSemestre.get(s).total, 0);
  const esperado =
    disciplinas.filter((d) => !CONCLUIDA.has(d.status)).reduce((a, d) => a + d.creditos, 0) +
    meta.creditosEletivos;
  if (creditos !== esperado) {
    err(`rota ${rota}: distribui ${creditos} créditos, mas faltam cumprir ${esperado}`);
  }
}

for (const s of calendarioValores) {
  if (s >= meta.semestreAtual && !semestresDeAlgumaRota.has(s)) {
    warn(`semestre ${s} está no calendário mas nenhuma rota o usa`);
  }
}

for (const d of disciplinas) {
  if (d.status === 'cursando' && d.plano?.[cenarios.padrao] !== meta.semestreAtual) {
    warn(`${d.codigo}: "cursando", mas planejada para ${d.plano?.[cenarios.padrao]}, não para o semestre atual (${meta.semestreAtual})`);
  }
}

// -------------------------------------------------------------- 4. notas.json
const notas = ler('notas.json');
const regra = notas.config ?? {};
if (!(regra.escala > 0)) err('notas.json: config.escala precisa ser um número positivo');
if (!(regra.aprovacao >= 0 && regra.aprovacao <= regra.escala)) {
  err(`notas.json: config.aprovacao (${regra.aprovacao}) fora da escala 0–${regra.escala}`);
}
for (const [codigo, nota] of Object.entries(notas.notas ?? {})) {
  const d = vistos.get(codigo);
  if (!d) {
    err(`notas.json: código ${codigo} não existe em curriculo.json`);
    continue;
  }
  if (nota === null) continue;
  if (typeof nota !== 'number' || nota < 0 || nota > regra.escala) {
    err(`notas.json: nota inválida para ${codigo}: ${nota} (escala 0–${regra.escala})`);
  }
  if (d.status === 'pendente') warn(`notas.json: ${codigo} tem nota, mas está "pendente"`);
}
for (const d of disciplinas) {
  if (d.status === 'cursada' && (notas.notas?.[d.codigo] ?? null) === null) {
    warn(`${d.codigo}: "cursada", mas sem nota em notas.json`);
  }
}

// ------------------------------- 5. horário: choque de faixa e coerência
const horario = ler('horario.json');
const faixasDoDia = Object.keys(horario.faixas ?? {}).map(Number);

if (faixasDoDia.length !== config.faixasPorDia) {
  err(`horario.json declara ${faixasDoDia.length} faixa(s) por dia, mas config.faixasPorDia = ${config.faixasPorDia}`);
}

for (const [semestre, dados] of Object.entries(horario.semestres ?? {})) {
  const ocupado = new Map(); // "dia|faixa" -> código
  for (const aula of dados.aulas ?? []) {
    const d = vistos.get(aula.codigo);
    if (!d) {
      err(`horario ${semestre}: ${aula.codigo} não existe em curriculo.json`);
      continue;
    }
    if (!config.dias.includes(aula.dia)) {
      err(`horario ${semestre}: ${aula.codigo} cai em "${aula.dia}", que não está em config.dias`);
    }
    // Basta que alguma rota planeje a disciplina para o semestre do horário.
    if (!d.plano || !Object.values(d.plano).includes(semestre)) {
      err(
        `horario ${semestre}: ${aula.codigo} está no horário mas a matriz o planeja para ${
          d.plano ? Object.values(d.plano).join('/') : d.status
        }`,
      );
    }
    const esperadas = faixasDe(d, cenarios.padrao);
    if (aula.faixas.length !== esperadas) {
      err(
        `horario ${semestre}: ${aula.codigo} tem ${d.creditos} créditos e ocupa ${aula.faixas.length} faixa(s); a regra dá ${esperadas}`,
      );
    }
    for (const f of aula.faixas) {
      if (!faixasDoDia.includes(f)) {
        err(`horario ${semestre}: ${aula.codigo} usa a faixa ${f}, que não está em "faixas"`);
      }
      const chave = `${aula.dia}|${f}`;
      if (ocupado.has(chave)) {
        err(`horario ${semestre}: choque em ${aula.dia}, faixa ${f} — ${ocupado.get(chave)} e ${aula.codigo}`);
      }
      ocupado.set(chave, aula.codigo);
    }
  }

  // Toda disciplina "cursando" no semestre precisa estar no horário.
  const noHorario = new Set((dados.aulas ?? []).map((a) => a.codigo));
  for (const d of disciplinas) {
    if (
      d.status === 'cursando' &&
      d.plano?.[cenarios.padrao] === semestre &&
      faixasDe(d, cenarios.padrao) > 0 &&
      !noHorario.has(d.codigo)
    ) {
      err(`horario ${semestre}: ${d.codigo} está "cursando" mas não aparece no horário`);
    }
  }
}

// ----------------------------------------------------------------- relatório
const concluidas = disciplinas.filter((d) => CONCLUIDA.has(d.status));
const crConcluidos = concluidas.reduce((a, d) => a + d.creditos, 0);
const crRestantes =
  disciplinas
    .filter((d) => d.status === 'pendente' || d.status === 'adiada')
    .reduce((a, d) => a + d.creditos, 0) + meta.creditosEletivos;

console.log(`Matriz curricular — ${meta.curso} (${meta.curriculo ?? 's/ código'})`);
console.log(`  disciplinas obrigatórias : ${disciplinas.length}`);
console.log(`  créditos obrigatórios    : ${somaCreditos} (${somaCH}h)`);
console.log(`  + eletivas               : ${meta.creditosEletivos} créditos`);
console.log(`  = exigidos               : ${meta.creditosExigidos} (${meta.chExigida}h)`);
console.log('');
console.log(`  concluídas               : ${concluidas.length} disciplinas · ${crConcluidos} cr`);
console.log(`  cursando                 : ${disciplinas.filter((d) => d.status === 'cursando').length}`);
console.log(`  adiadas                  : ${disciplinas.filter((d) => d.status === 'adiada').length}`);
console.log(`  a cursar (com eletivas)  : ${crRestantes} créditos`);
console.log(`  teto por semestre        : ${TETO_FAIXAS} de ${MAXIMO_FAIXAS} faixas`);
for (const r of cenarios.rotas) {
  const porSemestre = cargaPorRota.get(r.id);
  const semestres = [...porSemestre.keys()].sort();
  console.log('');
  console.log(`  ${r.titulo}${r.subtitulo ? ` — ${r.subtitulo}` : ''}`);
  console.log(`    formatura ${semestres[semestres.length - 1] ?? '—'}`);
  for (const s of semestres) {
    const {faixas, total, itens} = porSemestre.get(s);
    const folga = faixas <= TETO_FAIXAS ? 'dentro do teto' : 'ACIMA do teto';
    const comum = TRONCO.includes(s) ? 'tronco' : `rota ${r.id}`;
    console.log(
      `    ${s}  ${String(faixas).padStart(2)} faixas · ${String(total).padStart(2)} cr · ` +
        `${String(itens.length).padStart(2)} itens · ${folga}  [${comum}]`,
    );
  }
}

if (avisos.length) {
  console.log('');
  for (const a of avisos) console.log(`  aviso: ${a}`);
}

if (erros.length) {
  console.error(`\n${erros.length} erro(s):`);
  for (const e of erros) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log('\n✓ matriz consistente');
