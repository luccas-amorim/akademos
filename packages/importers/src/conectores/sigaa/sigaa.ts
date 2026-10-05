/**
 * Conector SIGAA (docs/ARCHITECTURE.md › Conectores). Roda no aparelho do
 * aluno, com a credencial dele; nada passa por servidor do Akademos.
 *
 * - Histórico: o próprio SIGAA emite o PDF ("Emitir Histórico"); lemos com o
 *   mesmo parser da importação manual e o modelo da instituição.
 * - Oferta: consulta pública de turmas (vagas ofertadas e ocupadas, horários).
 *
 * Scraping é frágil por natureza: cada mudança de HTML exige nova fixture em
 * __fixtures__/sigaa e um aumento de `versao`.
 */
import type { Connector, Credenciais, OfertaBruta, Sessao } from '../../connector';
import { ErroConector, type ClienteHttp, type Resposta } from '../../http';
import { aplicarModelo } from '../../pdf/modelo';
import type { CursadaBruta, ModeloHistorico } from '../../tipos';
import { acaoDoFormulario, analisar, camposDoFormulario, texto } from '../html';
import { lerHorarioSigaa, MAPA_PADRAO, type FaixaSigaa } from './horarios';

export interface OpcoesSigaa {
  /** Ex.: https://sigaa.ufx.br */
  base: string;
  instituicoes: string[];
  http: ClienteHttp;
  /** Extrai linhas de texto de um PDF (pdf.js, injetado). */
  lerPdf: (bytes: Uint8Array) => Promise<string[]>;
  modelo: ModeloHistorico;
  /** Departamentos cuja oferta interessa ao curso (ids do formulário público). */
  departamentos?: string[];
  mapaHorarios?: FaixaSigaa[];
}

export const VERSAO_SIGAA = '1.0.0';

function exigirOk(r: Resposta, etapa: string): Resposta {
  if (r.status >= 500 || r.status === 0) {
    throw new ErroConector('indisponivel', `O SIGAA não respondeu (${etapa}, HTTP ${r.status}).`);
  }
  return r;
}

export function criarConectorSigaa(o: OpcoesSigaa): Connector {
  const url = (caminho: string) => new URL(caminho, o.base).toString();

  async function login(cred: Credenciais): Promise<Sessao> {
    const pagina = exigirOk(
      await o.http.requisitar({ metodo: 'GET', url: url('/sigaa/verTelaLogin.do'), cookies: {} }),
      'tela de login',
    );
    const form = analisar(pagina.texto).querySelector('form[name="loginForm"]');
    if (!form) throw new ErroConector('formato', 'A tela de login do SIGAA mudou.');
    const r = exigirOk(
      await o.http.requisitar({
        metodo: 'POST',
        url: acaoDoFormulario(form, pagina.url),
        form: { ...camposDoFormulario(form), 'user.login': cred.usuario, 'user.senha': cred.senha },
        cookies: pagina.cookies,
      }),
      'login',
    );
    if (/senha inv[aá]lid/i.test(r.texto)) {
      throw new ErroConector('credenciais', 'Usuário ou senha não conferem no SIGAA.');
    }
    if (!/Portal do Discente/i.test(r.texto) && !r.url.includes('/portais/discente')) {
      throw new ErroConector('formato', 'Entramos, mas o portal do discente não abriu.');
    }
    return { conector: 'sigaa', cookies: r.cookies, dados: { portal: r.url } };
  }

  async function historico(s: Sessao): Promise<CursadaBruta[]> {
    const portal = exigirOk(
      await o.http.requisitar({
        metodo: 'GET',
        url: s.dados?.portal ?? url('/sigaa/portais/discente/discente.jsf'),
        cookies: s.cookies,
      }),
      'portal',
    );
    const doc = analisar(portal.texto);
    const link = doc.querySelectorAll('a').find((a) => /Emitir Hist[oó]rico/i.test(texto(a)));
    const form = doc.querySelector('form[id="menu:form_menu_discente"]');
    const acao = /\{'([^']+)':'([^']+)'\}/.exec(link?.getAttribute('onclick') ?? '');
    if (!link || !form || !acao) {
      throw new ErroConector('formato', 'Não achamos "Emitir Histórico" no portal do SIGAA.');
    }
    const pdf = exigirOk(
      await o.http.requisitar({
        metodo: 'POST',
        url: acaoDoFormulario(form, portal.url),
        form: { ...camposDoFormulario(form), [acao[1]!]: acao[2]! },
        cookies: portal.cookies,
      }),
      'histórico',
    );
    if (!pdf.tipo.includes('pdf')) {
      throw new ErroConector('formato', 'O SIGAA não devolveu o PDF do histórico.');
    }
    const { cursadas } = aplicarModelo(await o.lerPdf(pdf.bytes), o.modelo);
    return cursadas;
  }

  async function oferta(s: Sessao, semestre: string): Promise<OfertaBruta[]> {
    const [ano, periodo] = semestre.split('/');
    const saida: OfertaBruta[] = [];
    for (const depto of o.departamentos ?? []) {
      const pagina = exigirOk(
        await o.http.requisitar({
          metodo: 'GET',
          url: url('/sigaa/public/turmas/listar.jsf'),
          cookies: s.cookies,
        }),
        'consulta de turmas',
      );
      const form = analisar(pagina.texto).querySelector('form[id="formTurma"]');
      const buscar = form
        ?.querySelectorAll('input[type="submit"]')
        .find((i) => /Buscar/i.test(i.getAttribute('value') ?? ''));
      if (!form || !buscar)
        throw new ErroConector('formato', 'A consulta pública de turmas mudou.');
      const r = exigirOk(
        await o.http.requisitar({
          metodo: 'POST',
          url: acaoDoFormulario(form, pagina.url),
          form: {
            ...camposDoFormulario(form),
            'formTurma:inputNivel': 'G',
            'formTurma:inputDepto': depto,
            'formTurma:inputAno': ano!,
            'formTurma:inputPeriodo': periodo!,
            [buscar.getAttribute('name')!]: buscar.getAttribute('value') ?? 'Buscar',
          },
          cookies: pagina.cookies,
        }),
        'turmas',
      );
      saida.push(...lerTurmas(r.texto, semestre, o.mapaHorarios ?? MAPA_PADRAO));
    }
    return saida;
  }

  return {
    id: 'sigaa',
    versao: VERSAO_SIGAA,
    instituicoes: o.instituicoes,
    login,
    historico,
    oferta,
  };
}

/** Lê a tabela da consulta pública de turmas. */
export function lerTurmas(
  html: string,
  semestre: string,
  mapa: readonly FaixaSigaa[] = MAPA_PADRAO,
): OfertaBruta[] {
  const tabela = analisar(html).querySelector('#lista-turmas');
  if (!tabela) throw new ErroConector('formato', 'Tabela de turmas não encontrada.');
  const saida: OfertaBruta[] = [];
  let disciplina: { codigo: string; nome: string } | null = null;
  for (const tr of tabela.querySelectorAll('tbody tr')) {
    if (tr.classList.contains('agrupador')) {
      const m = /^([A-Z]{2,}\d{3,})\s*-\s*(.+)$/.exec(texto(tr));
      disciplina = m ? { codigo: m[1]!, nome: m[2]! } : null;
      continue;
    }
    if (!disciplina) continue;
    const tds = tr.querySelectorAll('td').map((td) => texto(td));
    const [turma, docentes, horario, local, vagas, ocupadas] = tds;
    if (!turma || !horario) continue;
    // "Tópicos Especiais: Bioinformática" → o tema vira o título da turma.
    const tema = /:\s*(.+)$/.exec(disciplina.nome)?.[1];
    saida.push({
      semestre,
      disciplinaCodigo: disciplina.codigo,
      turma: `T${turma.padStart(2, '0')}`,
      titulo: tema ? tema.charAt(0) + tema.slice(1).toLowerCase() : null,
      professor: docentes ? docentes.replace(/\s*\(\d+h\)/g, '') : null,
      local: local || null,
      vagas: Number(vagas) || 0,
      interessados: Number(ocupadas) || 0,
      horarios: lerHorarioSigaa(horario, mapa),
    });
  }
  return saida;
}
