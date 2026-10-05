/**
 * Gera __fixtures__/sigaa-ufx-historico.pdf: um histórico SINTÉTICO no layout
 * do SIGAA, para a aluna fictícia Ana (UFX). Não contém dados de ninguém.
 * Uso: pnpm --filter @akademos/importers fixtures
 */
import { writeFileSync } from 'node:fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const LINHAS: Array<[string, string, string, string, string, string, string, string]> = [
  ['2024.2', 'MAT0101', 'CÁLCULO DIFERENCIAL I', '60', 'T01', '92,0', '7,8', 'APR'],
  ['2024.2', 'INF0102', 'ALGORITMOS E PROGRAMAÇÃO', '60', 'T01', '96,0', '9,1', 'APR'],
  ['2024.2', 'MAT0103', 'GEOMETRIA ANALÍTICA', '60', 'T02', '90,0', '8,0', 'APR'],
  ['2024.2', 'ENG0104', 'INTRODUÇÃO À ENGENHARIA', '30', 'T01', '100,0', '9,5', 'APR'],
  ['2025.1', 'MAT0201', 'CÁLCULO II', '60', 'T01', '88,0', '6,4', 'APR'],
  ['2025.1', 'INF0202', 'ESTRUTURAS DE DADOS', '60', 'T01', '94,0', '8,7', 'APR'],
  ['2025.1', 'MAT0203', 'ÁLGEBRA LINEAR', '60', 'T01', '90,0', '7,2', 'APR'],
  ['2025.1', 'FIS0204', 'FÍSICA GERAL I', '60', 'T03', '86,0', '6,9', 'APR'],
  ['2025.2', 'MAT0301', 'CÁLCULO III', '60', 'T01', '80,0', '4,2', 'REP'],
  ['2025.2', 'MAT0302', 'PROBABILIDADE', '60', 'T01', '92,0', '7,5', 'APR'],
  ['2025.2', 'INF0303', 'PROGRAMAÇÃO ORIENTADA A OBJETOS', '60', 'T01', '98,0', '9,0', 'APR'],
  ['2025.2', 'FIS0304', 'FÍSICA GERAL II', '60', 'T01', '84,0', '6,2', 'APR'],
  ['2025.2', 'ELE0305', 'CIRCUITOS DIGITAIS', '60', 'T01', '92,0', '8,1', 'APR'],
  ['2026.1', 'MAT0301', 'CÁLCULO III', '60', 'T02', '90,0', '6,1', 'APR'],
  ['2026.1', 'INF0401', 'BANCO DE DADOS', '60', 'T01', '96,0', '8,8', 'APR'],
  ['2026.1', 'ELE0402', 'ARQUITETURA DE COMPUTADORES', '60', 'T01', '90,0', '7,4', 'APR'],
  ['2026.1', 'MAT0403', 'CÁLCULO NUMÉRICO', '60', 'T01', '88,0', '6,8', 'APR'],
  ['2026.1', 'ENG9910', 'TÓPICOS EM INOVAÇÃO', '30', 'T01', '100,0', '9,0', 'APR'],
  ['2026.2', 'INF0501', 'SISTEMAS OPERACIONAIS', '60', 'T01', '--', '--', 'MATR'],
  ['2026.2', 'INF0502', 'REDES DE COMPUTADORES', '60', 'T01', '--', '--', 'MATR'],
  ['2026.2', 'INF0503', 'ENGENHARIA DE SOFTWARE', '60', 'T01', '--', '--', 'MATR'],
  ['2026.2', 'MAT0504', 'ESTATÍSTICA APLICADA', '60', 'T01', '--', '--', 'MATR'],
];

const COLUNAS = [40, 88, 145, 395, 425, 462, 505, 540];

const pdf = await PDFDocument.create();
pdf.setTitle('Histórico escolar (FICTÍCIO)');
pdf.setProducer('Akademos — fixture de testes');
const fonte = await pdf.embedFont(StandardFonts.Helvetica);
const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
const pagina = pdf.addPage([595, 842]);
let y = 800;
const texto = (t: string, x: number, tamanho = 8, f = fonte) =>
  pagina.drawText(t, { x, y, size: tamanho, font: f, color: rgb(0.1, 0.1, 0.1) });

texto('UNIVERSIDADE FEDERAL DE EXEMPLO', 40, 12, negrito);
y -= 16;
texto('SIGAA - Sistema Integrado de Gestão de Atividades Acadêmicas', 40, 9);
y -= 22;
texto('HISTÓRICO ESCOLAR — DOCUMENTO FICTÍCIO PARA TESTES', 40, 11, negrito);
y -= 18;
texto('Nome: ANA RIBEIRO          Matrícula: 20242001017', 40, 9);
y -= 12;
texto('Curso: ENGENHARIA DE COMPUTAÇÃO - BACHARELADO   Currículo: 2019', 40, 9);
y -= 24;
[
  'Ano/Período',
  'Código',
  'Componente Curricular',
  'CH',
  'Turma',
  'Freq. %',
  'Nota',
  'Situação',
].forEach((c, i) => texto(c, COLUNAS[i]!, 8, negrito));
y -= 14;
for (const linha of LINHAS) {
  linha.forEach((c, i) => texto(c, COLUNAS[i]!));
  y -= 13;
}
y -= 10;
texto('Legenda: APR - Aprovado; REP - Reprovado; MATR - Matriculado.', 40, 7);
y -= 10;
texto('Página 1 de 1', 500, 7);

const bytes = await pdf.save({ useObjectStreams: false });
writeFileSync(new URL('../__fixtures__/sigaa-ufx-historico.pdf', import.meta.url), bytes);
console.info(`sigaa-ufx-historico.pdf (${bytes.length} bytes)`);
