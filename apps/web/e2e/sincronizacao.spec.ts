import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Tarefa 3.5: dois navegadores (aparelhos) com a mesma conta. Cada um edita
 * offline; ao voltar a conexão, os dois convergem para o mesmo estado.
 */

const email = `e2e-${Date.now()}@exemplo.test`;
const senha = 'senha-de-teste-e2e-123';

async function novoAparelho(browser: Browser): Promise<Page> {
  const contexto = await browser.newContext();
  return contexto.newPage();
}

async function criarConta(page: Page): Promise<string> {
  await page.goto('/entrar');
  await page.getByRole('radio', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome').fill('Ana E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.locator('form').getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Sua frase de recuperação' })).toBeVisible();
  const palavras = await page.locator('ol li').allInnerTexts();
  expect(palavras).toHaveLength(12);
  await page.getByText('Anotei a frase num lugar seguro').click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  // Pede 3 posições sorteadas: preenche as que aparecerem.
  for (let n = 1; n <= 12; n++) {
    const campo = page.getByLabel(`Palavra ${n}`, { exact: true });
    if (await campo.count()) await campo.fill(palavras[n - 1]!.trim());
  }
  await page.getByRole('button', { name: 'Confirmar e criar a chave' }).click();
  await expect(page).toHaveURL(/\/importar$/);
  return palavras.map((p) => p.trim()).join(' ');
}

async function entrar(page: Page, frase: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Frase de recuperação' })).toBeVisible();
  await page.getByLabel('As 12 palavras, separadas por espaço').fill(frase);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function sincronizado(page: Page) {
  await expect(page.getByText(/Cifrado · sincronizado/)).toBeVisible();
}

async function escreverNoDiario(page: Page, texto: string) {
  await page.getByPlaceholder('O que você espera do próximo semestre?').fill(texto);
  await page.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText(texto)).toBeVisible();
}

test('dois aparelhos editam offline e convergem', async ({ browser }) => {
  const a = await novoAparelho(browser);
  const frase = await criarConta(a);

  // A carrega o percurso de exemplo; a escrita agenda o envio cifrado.
  await a.getByRole('button', { name: /carregar a aluna de exemplo/ }).click();
  await expect(a.getByRole('heading', { name: /Ana\./ })).toBeVisible();
  await a.waitForTimeout(3000);
  await sincronizado(a);

  // B entra com a mesma conta e recebe os dados decifrando com a frase.
  const b = await novoAparelho(browser);
  await entrar(b, frase);
  await expect(b.getByText('Ana Ribeiro')).toBeVisible();
  await expect(b.getByText('48%')).toBeVisible();

  // Em desenvolvimento não há service worker: abre a tela antes de cair a rede.
  for (const p of [a, b]) {
    await p.getByRole('link', { name: 'Carreira' }).click();
    await expect(p.getByRole('heading', { name: 'Diário de expectativas' })).toBeVisible();
  }

  // Os dois ficam offline e editam.
  await a.context().setOffline(true);
  await b.context().setOffline(true);
  await escreverNoDiario(a, 'Escrito no aparelho A, offline');
  await escreverNoDiario(b, 'Escrito no aparelho B, offline');

  // Voltam: o evento "online" dispara a sincronização. Duas rodadas bastam.
  await a.context().setOffline(false);
  await b.context().setOffline(false);
  for (const p of [a, b, a]) {
    await p.reload();
    await p.waitForTimeout(2500);
  }
  for (const p of [a, b]) {
    await p.getByRole('link', { name: 'Carreira' }).click();
    await expect(p.getByText('Escrito no aparelho A, offline')).toBeVisible();
    await expect(p.getByText('Escrito no aparelho B, offline')).toBeVisible();
  }
});
