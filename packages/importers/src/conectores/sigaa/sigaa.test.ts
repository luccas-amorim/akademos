import { montarPacotes } from '@akademos/registry';
import { lerInstituicoes } from '@akademos/registry/node';
import { readFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { corresponder } from '../../correspondencia';
import { ErroConector, type ClienteHttp, type Requisicao, type Resposta } from '../../http';
import { extrairLinhas, type PdfJsMinimo } from '../../pdf/extrair';
import type { ModeloHistorico } from '../../tipos';
import { lerHorarioSigaa } from './horarios';
import { criarConectorSigaa, lerTurmas } from './sigaa';

const fixture = (nome: string) =>
  readFileSync(new URL(`../../../__fixtures__/${nome}`, import.meta.url));
const html = (nome: string) => fixture(`sigaa/${nome}`).toString('utf8');

const [ufx] = montarPacotes(lerInstituicoes().find((i) => i.pasta === 'ufx')!).entradas;
const matriz = ufx!.pacote.matriz;
const modelo = ufx!.modeloHistorico as ModeloHistorico;

/** SIGAA de mentira: responde com as páginas gravadas e registra as requisições. */
function sigaaFalso(senhaCerta = 'certa') {
  const pedidos: Requisicao[] = [];
  const pagina = (r: Requisicao, texto: string, extra: Partial<Resposta> = {}): Resposta => ({
    status: 200,
    url: r.url,
    tipo: 'text/html; charset=UTF-8',
    texto,
    bytes: new Uint8Array(),
    cookies: { ...r.cookies, JSESSIONID: 'abc123' },
    ...extra,
  });
  const http: ClienteHttp = {
    async requisitar(r) {
      pedidos.push(r);
      const caminho = new URL(r.url).pathname;
      if (caminho === '/sigaa/verTelaLogin.do') return pagina(r, html('login.html'));
      if (caminho === '/sigaa/logar.do') {
        return r.form?.['user.senha'] === senhaCerta
          ? pagina(r, html('portal-discente.html'), {
              url: 'https://sigaa.ufx.br/sigaa/portais/discente/discente.jsf',
            })
          : pagina(r, html('login-erro.html'));
      }
      if (caminho === '/sigaa/portais/discente/discente.jsf' && r.metodo === 'GET') {
        return pagina(r, html('portal-discente.html'));
      }
      if (caminho === '/sigaa/portais/discente/discente.jsf' && r.metodo === 'POST') {
        const bytes = new Uint8Array(fixture('sigaa-ufx-historico.pdf'));
        return pagina(r, '', { tipo: 'application/pdf', bytes });
      }
      if (caminho === '/sigaa/public/turmas/listar.jsf') {
        return pagina(
          r,
          r.metodo === 'GET' ? html('turmas-form.html') : html('turmas-resultado.html'),
        );
      }
      return pagina(r, 'não encontrado', { status: 404 });
    },
  };
  const conector = criarConectorSigaa({
    base: 'https://sigaa.ufx.br',
    instituicoes: ['ufx'],
    http,
    modelo,
    departamentos: ['1234'],
    lerPdf: async (bytes) => (await extrairLinhas(pdfjs as unknown as PdfJsMinimo, bytes)).linhas,
  });
  return { conector, pedidos };
}

describe('conector SIGAA (fixtures gravadas)', () => {
  it('entra com a credencial do aluno e guarda só os cookies da sessão', async () => {
    const { conector, pedidos } = sigaaFalso();
    const s = await conector.login({ usuario: 'ana', senha: 'certa' });
    expect(s.cookies).toEqual({ JSESSIONID: 'abc123' });
    const post = pedidos.find((p) => p.metodo === 'POST')!;
    expect(post.form).toMatchObject({ 'user.login': 'ana', 'user.senha': 'certa', width: '' });
    expect(JSON.stringify(s)).not.toContain('certa');
  });

  it('acusa senha errada', async () => {
    const { conector } = sigaaFalso();
    await expect(conector.login({ usuario: 'ana', senha: 'errada' })).rejects.toMatchObject({
      codigo: 'credenciais',
    });
  });

  it('emite o histórico pelo menu JSF e lê o PDF com o modelo da UFX', async () => {
    const { conector, pedidos } = sigaaFalso();
    const s = await conector.login({ usuario: 'ana', senha: 'certa' });
    const hist = await conector.historico(s);
    expect(hist).toHaveLength(22);
    const emitir = pedidos.at(-1)!;
    expect(emitir.form).toMatchObject({
      'javax.faces.ViewState': 'j_id1',
      'menu:form_menu_discente:j_id_jsp_340461267_99':
        'menu:form_menu_discente:j_id_jsp_340461267_99',
    });
  });

  it('lê a oferta pública com vagas, ocupação e horários na grade da UFX', async () => {
    const { conector, pedidos } = sigaaFalso();
    const s = await conector.login({ usuario: 'ana', senha: 'certa' });
    const turmas = await conector.oferta!(s, '2027/1');
    expect(pedidos.at(-1)!.form).toMatchObject({
      'formTurma:inputDepto': '1234',
      'formTurma:inputAno': '2027',
      'formTurma:inputPeriodo': '1',
      'javax.faces.ViewState': 'j_id2',
    });
    expect(turmas).toHaveLength(6);
    const ia = turmas.find((t) => t.disciplinaCodigo === 'INF0601' && t.turma === 'T01')!;
    expect(ia).toMatchObject({
      vagas: 60,
      interessados: 94,
      professor: 'ICARO MENDES',
      local: 'Lab 3',
    });
    expect(ia.horarios).toEqual([
      { dia: 'ter', slot: 2 },
      { dia: 'qui', slot: 2 },
    ]);
    // Códigos do SIGAA casam com a matriz pelos códigos alternativos do registro.
    expect(
      corresponder({ codigo: ia.disciplinaCodigo, nome: 'INTELIGÊNCIA ARTIFICIAL' }, matriz)
        .disciplina?.codigo,
    ).toBe('EX601');
    const bio = turmas.find((t) => t.disciplinaCodigo === 'INF0910')!;
    expect(bio.titulo).toBe('Bioinformática');
  });

  it('falha com elegância quando o HTML muda', () => {
    expect(() => lerTurmas('<html><body>manutenção</body></html>', '2027/1')).toThrow(ErroConector);
  });
});

describe('horários do SIGAA', () => {
  it('decodifica dias, turno e períodos', () => {
    expect(lerHorarioSigaa('24M12')).toEqual([
      { dia: 'seg', slot: 0 },
      { dia: 'qua', slot: 0 },
    ]);
    expect(lerHorarioSigaa('5T34 6T12')).toEqual([
      { dia: 'qui', slot: 3 },
      { dia: 'sex', slot: 2 },
    ]);
    expect(lerHorarioSigaa('3M1234')).toEqual([
      { dia: 'ter', slot: 0 },
      { dia: 'ter', slot: 1 },
    ]);
    expect(lerHorarioSigaa('a combinar')).toEqual([]);
  });
});
