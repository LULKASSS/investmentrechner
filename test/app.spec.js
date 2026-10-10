// Den Rechner einmal wie im Termin durchspielen: Startseite → fünf Fragen → Lücke → Vorschlag.
const { test, expect } = require('@playwright/test');

async function open(page) {
  const problems = [];
  page.on('pageerror', e => problems.push('Fehler: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('Konsole: ' + m.text()); });
  await page.goto('/');
  return problems;
}

async function fragenBeantworten(page, { netto = '2600', bedarf = '2100' } = {}) {
  await page.click('#ldGo');
  await page.click('.q-next[data-q="0"]');
  await page.click('.q-next[data-q="1"]');
  await page.click('[data-v="ang"]');
  await page.fill('#netto', netto);
  await page.fill('#bedarf', bedarf);
  await expect(page.locator('#next2')).toBeEnabled();
  await page.click('#next2');
  await expect(page.locator('#go')).toBeEnabled();
  await page.click('#go');
  await expect(page.locator('.mod-h:visible').first()).toHaveText('Deine Lücke');
}

test('Startseite lädt ohne Fehler @mobil', async ({ page }) => {
  const problems = await open(page);
  await expect(page.locator('#ldGo')).toBeVisible();
  await page.waitForTimeout(500);
  expect(problems).toEqual([]);
});

test('Fragen bis zur Lücke, Zahlen sind plausibel @mobil', async ({ page }) => {
  const problems = await open(page);
  await fragenBeantworten(page);
  const text = await page.locator('body').innerText();
  expect(text).toContain('2.100 €');
  expect(text).toMatch(/Gesetzl\. Rente/);
  // Lücke wird nach der Animation als Eurobetrag angezeigt, nicht als NaN/Infinity
  await expect.poll(async () => page.locator('body').innerText(), { timeout: 15_000 }).toMatch(/Lücke im Monat\s*\n?\s*[\d.]+ €/);
  expect(await page.locator('body').innerText()).not.toMatch(/NaN|Infinity|undefined/);
  expect(problems).toEqual([]);
});

test('Höherer Bedarf ergibt größere Lücke', async ({ page }) => {
  const luecke = async bedarf => {
    await open(page);
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
    await page.reload();
    await fragenBeantworten(page, { bedarf });
    let v = '';
    await expect.poll(async () => (v = (await page.locator('body').innerText()).match(/Lücke im Monat\s*\n?\s*([\d.]+) €/)?.[1] || ''), { timeout: 15_000 }).not.toBe('');
    return +v.replace(/\./g, '');
  };
  const klein = await luecke('2100'), gross = await luecke('3000');
  expect(gross).toBeGreaterThan(klein);
});

test('Vorschlag als PDF-Vorschau', async ({ page }) => {
  const problems = await open(page);
  await fragenBeantworten(page);
  await page.click('#pdfBtn');
  await expect(page.locator('#vPages img').first()).toBeVisible({ timeout: 20_000 });
  expect(await page.locator('#vPages img').count()).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});
