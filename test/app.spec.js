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

const zahl = s => +String(s).replace(/[^\d]/g, '');
async function zurLoesung(page, { ersp = '20000' } = {}) {
  await page.click('#ldGo');
  await page.click('.q-next[data-q="0"]');
  await page.click('.q-next[data-q="1"]');
  await page.click('[data-v="ang"]');
  await page.fill('#netto', '3200'); await page.fill('#bedarf', '2800');
  await page.click('#next2');
  if (ersp) await page.fill('#ersp', ersp);
  await page.click('#go');
  await expect(page.locator('#luecke')).toBeVisible();
  await page.click('#tbNav [data-go="toepfe"]');
  await expect(page.locator('#toepfe')).toBeVisible();
  await expect(page.locator('#ringPct')).toHaveText(/%/, { timeout: 10_000 });
}

test('Einmalzahlung: eingestellt unter dem Chip, Ergebnis als Spalte, in „Zusammen“ eingerechnet @mobil', async ({ page }) => {
  const problems = await open(page);
  await zurLoesung(page);
  await expect(page.locator('#bEinm')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#einmWrap')).toHaveClass(/open/);
  await expect(page.locator('#einm')).toHaveValue('20.000');
  await expect(page.locator('#potEinm')).toBeVisible();
  await expect(page.locator('#einmH')).toContainText('Sparrate für die ganze Lücke');
  await page.waitForTimeout(1500);
  const av = zahl(await page.locator('#pAvL').textContent()), e = zahl(await page.locator('#eL').textContent()), sum = zahl(await page.locator('#pSumL').textContent());
  expect(Math.abs(av + e - sum)).toBeLessThanOrEqual(1);
  // aus: Spalte und „Zusammen“ weg, Pille wieder breit
  await page.click('#bEinm');
  await expect(page.locator('#potEinm')).toBeHidden();
  await expect(page.locator('#potSum')).toBeHidden();
  await expect(page.locator('#solPill')).toHaveClass(/single/);
  expect(problems).toEqual([]);
});

test('Einmalzahlung abgewählt bleibt abgewählt, wenn man das Ersparte ändert', async ({ page }) => {
  await open(page);
  await zurLoesung(page);
  await page.click('#bEinm');
  await page.click('#tbNav [data-go="intake"]');
  await page.fill('#ersp', '30000');
  await page.click('#tbNav [data-go="toepfe"]');
  await expect(page.locator('#bEinm')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#potEinm')).toBeHidden();
});

test('Depot: Kapital in der Pille und in der Umschicht-Rechnung gleich gerundet', async ({ page }) => {
  await open(page);
  await zurLoesung(page, { ersp: '' });
  await page.click('#bDep');
  await page.waitForTimeout(1500);
  const pille = await page.locator('#pDepK').textContent();
  const rechnung = await page.locator('#uvCalc dd.sum').textContent();
  expect(pille).toBe(rechnung);
  // Steuer beim Umschichten: Pille und Rechnung zeigen dieselbe Zahl
  expect(zahl(await page.locator('#pDepT').textContent())).toBe(zahl(await page.locator('#uvCalc dd.neg').first().textContent()));
});

test('Immobilie: Eigenanteil nie länger als bis zur Rente', async ({ page }) => {
  await open(page);
  await page.click('#ldGo');
  await page.fill('#alter', '66'); await page.press('#alter', 'Tab');
  await page.click('.q-next[data-q="0"]');
  await page.click('.q-next[data-q="1"]');
  await page.click('[data-v="ang"]'); await page.fill('#netto', '3200');
  await page.click('#next2'); await page.click('#go');
  await expect(page.locator('#luecke')).toBeVisible();
  await page.click('#tbNav [data-go="toepfe"]');
  await page.click('#bImm');
  await expect(page.locator('#immJahreV')).toHaveText('1 J. (2027)');
  await expect(page.locator('#pImmRs')).toContainText('1 Jahr');
});

test('Vorschlag-PDF mit allen Bausteinen @mobil', async ({ page }) => {
  const problems = await open(page);
  await zurLoesung(page);
  await page.click('#bDep'); await page.click('#bImm');
  await page.click('#pdfBtn');
  await expect(page.locator('#vPages img')).toHaveCount(2, { timeout: 20_000 });
  expect(problems).toEqual([]);
});
