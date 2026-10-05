import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ClienteHttp, Requisicao, Resposta } from '../../http';
import { criarConectorJupiter, faixaDoHorario, lerHistoricoJupiter } from './jupiter';

const html = (nome: string) =>
  readFileSync(new URL(`../../../__fixtures__/jupiter/${nome}`, import.meta.url), 'utf8');

/** Grade típica da USP (períodos de 1h40). */
const FAIXAS = [
  { inicio: '08:00', fim: '09:40' },
  { inicio: '10:00', fim: '11:40' },
  { inicio: '14:00', fim: '15:40' },
  { inicio: '16:00', fim: '17:40' },
  { inicio: '19:20', fim: '21:00' },
  { inicio: '21:10', fim: '22:50' },
];

function jupiterFalso() {
  const pedidos: Requisicao[] = [];
  const resp = (r: Requisicao, texto: string, status = 200): Resposta => ({
    status,
    url: r.url,
    tipo: 'text/html',
    texto,
    bytes: new Uint8Array(),
    cookies: { ...r.cookies, JSESSIONID: 'usp1' },
  });
  const http: ClienteHttp = {
    async requisitar(r) {
      pedidos.push(r);
      const u = new URL(r.url);
      if (u.pathname.endsWith('/webLogin.jsp')) return resp(r, html('login.html'));
      if (u.pathname.endsWith('/autenticar')) {
        return resp(r, r.form?.senusu === 'certa' ? html('inicio.html') : html('login-erro.html'));
      }
      if (u.pathname.endsWith('/historicoEscolar')) return resp(r, html('historico.html'));
      if (u.pathname.endsWith('/obterTurma') && u.searchParams.get('sgldis') === 'MAC0323') {
        return resp(r, html('turma-MAC0323.html'));
      }
      return resp(r, '', 404);
    },
  };
  const conector = criarConectorJupiter({
    base: 'https://uspdigital.usp.br/jupiterweb/',
    instituicoes: ['usp'],
    http,
    faixas: FAIXAS,
    disciplinas: () => ['MAC0323', 'MAC9999'],
  });
  return { conector, pedidos };
}

describe('conector JúpiterWeb (fixtures gravadas)', () => {
  it('entra com Nº USP e senha e acusa credencial errada', async () => {
    const { conector, pedidos } = jupiterFalso();
    const s = await conector.login({ usuario: '1234567', senha: 'certa' });
    expect(s.cookies.JSESSIONID).toBe('usp1');
    expect(pedidos[1]!.form).toMatchObject({ codpes: '1234567', senusu: 'certa' });
    await expect(conector.login({ usuario: '1234567', senha: 'x' })).rejects.toMatchObject({
      codigo: 'credenciais',
    });
  });

  it('lê o histórico por semestre, com reprovação e matrícula em curso', async () => {
    const { conector } = jupiterFalso();
    const h = await conector.historico(await conector.login({ usuario: '1', senha: 'certa' }));
    expect(h).toHaveLength(5);
    expect(h[1]).toMatchObject({
      semestre: '2025/1',
      codigo: 'MAT2453',
      nota: 4,
      situacao: 'reprovada',
      frequencia: 0.88,
    });
    expect(h.at(-1)).toMatchObject({
      semestre: '2026/2',
      situacao: 'cursando',
      nota: null,
      frequencia: null,
    });
  });

  it('consulta turmas por disciplina e converte horário de relógio em faixa', async () => {
    const { conector } = jupiterFalso();
    const turmas = await conector.oferta!(
      await conector.login({ usuario: '1', senha: 'certa' }),
      '2027/1',
    );
    expect(turmas).toHaveLength(2);
    expect(turmas[0]).toMatchObject({
      disciplinaCodigo: 'MAC0323',
      turma: 'T04',
      vagas: 60,
      interessados: 71,
      professor: 'Carlos Exemplo',
      horarios: [
        { dia: 'ter', slot: 0 },
        { dia: 'qui', slot: 1 },
      ],
    });
    expect(turmas[1]!.horarios).toEqual([
      { dia: 'seg', slot: 4 },
      { dia: 'qua', slot: 4 },
    ]);
  });

  it('falha com elegância se a página mudar', () => {
    expect(() => lerHistoricoJupiter('<html>manutenção</html>')).toThrow(/histórico/i);
  });
});

describe('faixaDoHorario', () => {
  it('escolhe a faixa com maior sobreposição', () => {
    expect(faixaDoHorario('08:00', '09:40', FAIXAS)).toBe(0);
    expect(faixaDoHorario('19:00', '21:00', FAIXAS)).toBe(4);
    expect(faixaDoHorario('12:00', '13:00', FAIXAS)).toBeNull();
  });
});
