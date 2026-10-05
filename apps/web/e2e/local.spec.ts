import { expect, test } from '@playwright/test';

test('sem conta: explorar o exemplo, recarregar e ocultar notas', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByRole('button', { name: /aluna de exemplo/ }).click();
  await expect(page.getByRole('heading', { name: /Ana\./ })).toBeVisible();
  await expect(page.getByText('48%')).toBeVisible();

  // Os dados sobrevivem a recarregar (SQLite no navegador).
  await page.reload();
  await expect(page.getByText('62 de 128 créditos')).toBeVisible();

  // Ocultar notas troca as notas por •,•.
  await page.getByRole('button', { name: 'Ocultar notas' }).click();
  await page.getByRole('link', { name: 'Percurso' }).click();
  await expect(page.getByText('•,•').first()).toBeVisible();
  await expect(page.getByText('7,8')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostrar notas' }).click();
  await expect(page.getByText('7,8').first()).toBeVisible();
});

test('planejar: trocar de turma recalcula conflitos e formatura', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: /aluna de exemplo/ }).click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /Planejar/ })
    .click();
  const formatura = page.locator('.ak-kpi', { hasText: 'Formatura' });
  await expect(formatura).toContainText('2028/1');
  // Tira Sinais e Sistemas do plano: a formatura passa para 2028/2.
  await page.getByRole('button', { name: 'Na grade ✓' }).first().click();
  await expect(formatura).toContainText('2028/2');
  await expect(page.getByText(/Sem Sinais e Sistemas/)).toBeVisible();
});
