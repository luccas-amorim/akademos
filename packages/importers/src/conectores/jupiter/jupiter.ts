/**
 * Conector JúpiterWeb (USP). Como o SIGAA, roda no aparelho do aluno.
 *
 * - Histórico: página HTML "Histórico Escolar", agrupada por "AAAA Nº Semestre".
 * - Oferta: consulta pública por disciplina (obterTurma?sgldis=…), com horários
 *   em hora de relógio e vagas/inscritos por turma.
 */
import type { Dia, FaixaHoraria, Horario, SituacaoCursada } from '@akademos/core';
import type { Connector, Credenciais, OfertaBruta, Sessao } from '../../connector';
import { ErroConector, type ClienteHttp } from '../../http';
import type { CursadaBruta } from '../../tipos';
import { acaoDoFormulario, analisar, camposDoFormulario, texto } from '../html';

export const VERSAO_JUPITER = '1.0.0';

const SITUACOES: Record<string, SituacaoCursada> = {
  A: 'aprovada',
  D: 'aproveitada',
  RN: 'reprovada',
  RF: 'reprovada',
  RA: 'reprovada',
  MA: 'cursando',
  T: 'trancada',
};

const DIAS: Record<string, Dia> = {
  seg: 'seg',
  ter: 'ter',
  qua: 'qua',
  qui: 'qui',
  sex: 'sex',
  sab: 'sab',
  sáb: 'sab',
};

export interface OpcoesJupiter {
  /** Ex.: https://uspdigital.usp.br/jupiterweb/ */
  base: string;
  instituicoes: string[];
  http: ClienteHttp;
  /** Faixas da grade da instituição, para converter horário de relógio em faixa. */
  faixas: readonly FaixaHoraria[];
  /** Disciplinas cuja oferta consultar (a consulta pública é por disciplina). */
  disciplinas: () => string[];
}

const minutos = (h: string) => {
  const [a, b] = h.split(':').map(Number);
  return (a ?? 0) * 60 + (b ?? 0);
};

/** Faixa da grade que mais se sobrepõe ao intervalo [início, fim]. */
export function faixaDoHorario(
  inicio: string,
  fim: string,
  faixas: readonly FaixaHoraria[],
): number | null {
  let melhor: number | null = null;
  let sobreposicao = 0;
  faixas.forEach((f, i) => {
    const s = Math.min(minutos(fim), minutos(f.fim)) - Math.max(minutos(inicio), minutos(f.inicio));
    if (s > sobreposicao) {
      sobreposicao = s;
      melhor = i;
    }
  });
  return melhor;
}

export function lerHistoricoJupiter(html: string): CursadaBruta[] {
  const tabela = analisar(html).querySelector('#historico');
  if (!tabela)
    throw new ErroConector('formato', 'Tabela do histórico não encontrada no JúpiterWeb.');
  const saida: CursadaBruta[] = [];
  let semestre: string | null = null;
  for (const tr of tabela.querySelectorAll('tr')) {
    if (tr.classList.contains('cabecalho')) continue;
    if (tr.classList.contains('periodo')) {
      const m = /(\d{4})\s+([12])º/.exec(texto(tr));
      semestre = m ? `${m[1]}/${m[2]}` : null;
      continue;
    }
    const tds = tr.querySelectorAll('td').map((td) => texto(td));
    if (!semestre || tds.length < 8) continue;
    const [codigo, nome, , , , freq, nota, sit] = tds as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    const n = Number(nota.replace(',', '.'));
    const f = Number(freq.replace(',', '.'));
    saida.push({
      semestre,
      codigo,
      nome,
      nota: Number.isFinite(n) && nota !== '-' ? n : null,
      frequencia: Number.isFinite(f) && freq !== '-' ? f / 100 : null,
      situacaoOriginal: sit,
      situacao: SITUACOES[sit] ?? null,
      linha: tds.join(' | '),
    });
  }
  return saida;
}

export function lerTurmasJupiter(
  html: string,
  disciplina: string,
  semestre: string,
  faixas: readonly FaixaHoraria[],
): OfertaBruta[] {
  const blocos = analisar(html).querySelectorAll('div.turma');
  return blocos.map((b) => {
    const codigoTurma = texto(b.querySelector('table.dadosTurma b'));
    const horarios: Horario[] = [];
    const professores = new Set<string>();
    for (const tr of b.querySelectorAll('table.horarios tr').slice(1)) {
      const [quando, prof] = tr.querySelectorAll('td').map((td) => texto(td));
      const m = /^(\p{L}{3})\s+(\d{2}:\d{2})\s+(\d{2}:\d{2})$/u.exec(quando ?? '');
      const dia = m ? DIAS[m[1]!.toLowerCase()] : undefined;
      const slot = m ? faixaDoHorario(m[2]!, m[3]!, faixas) : null;
      if (dia && slot !== null && !horarios.some((h) => h.dia === dia && h.slot === slot))
        horarios.push({ dia, slot });
      if (prof) professores.add(prof);
    }
    const linhaVagas =
      b
        .querySelectorAll('table.vagas tr')[1]
        ?.querySelectorAll('td')
        .map((td) => Number(texto(td))) ?? [];
    return {
      semestre,
      disciplinaCodigo: disciplina,
      turma: codigoTurma.slice(-2) ? `T${codigoTurma.slice(-2)}` : 'T01',
      titulo: null,
      professor: [...professores].join(', ') || null,
      local: null,
      vagas: linhaVagas[1] ?? 0,
      interessados: linhaVagas[2] ?? 0,
      horarios,
    };
  });
}

export function criarConectorJupiter(o: OpcoesJupiter): Connector {
  const url = (caminho: string) => new URL(caminho, o.base).toString();

  async function login(cred: Credenciais): Promise<Sessao> {
    const pagina = await o.http.requisitar({
      metodo: 'GET',
      url: url('webLogin.jsp'),
      cookies: {},
    });
    const form = analisar(pagina.texto).querySelector('form[name="form1"]');
    if (!form) throw new ErroConector('formato', 'A tela de login do JúpiterWeb mudou.');
    const r = await o.http.requisitar({
      metodo: 'POST',
      url: acaoDoFormulario(form, pagina.url),
      form: { ...camposDoFormulario(form), codpes: cred.usuario, senusu: cred.senha },
      cookies: pagina.cookies,
    });
    if (/senha inv[aá]lid/i.test(r.texto))
      throw new ErroConector('credenciais', 'Número USP ou senha não conferem.');
    if (!/Hist[oó]rico Escolar/i.test(r.texto))
      throw new ErroConector('formato', 'O JúpiterWeb não abriu a página inicial.');
    return { conector: 'jupiter', cookies: r.cookies };
  }

  async function historico(s: Sessao): Promise<CursadaBruta[]> {
    const r = await o.http.requisitar({
      metodo: 'GET',
      url: url('historicoEscolar'),
      cookies: s.cookies,
    });
    return lerHistoricoJupiter(r.texto);
  }

  async function oferta(s: Sessao, semestre: string): Promise<OfertaBruta[]> {
    const saida: OfertaBruta[] = [];
    for (const d of o.disciplinas()) {
      const r = await o.http.requisitar({
        metodo: 'GET',
        url: url(`obterTurma?sgldis=${encodeURIComponent(d)}`),
        cookies: s.cookies,
      });
      if (r.status === 404) continue;
      saida.push(...lerTurmasJupiter(r.texto, d, semestre, o.faixas));
    }
    return saida;
  }

  return {
    id: 'jupiterweb',
    versao: VERSAO_JUPITER,
    instituicoes: o.instituicoes,
    login,
    historico,
    oferta,
  };
}
