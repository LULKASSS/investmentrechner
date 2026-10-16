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

test('Scrollen über die Weg-Kurve schaltet nicht ins Abtasten, Halten schon @mobil', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Touch-Gesten über CDP');
  await open(page);
  await fragenBeantworten(page);
  await page.click('#tbNav [data-go="warten"]');
  await expect(page.locator('#phK')).toHaveText(/^Kapital mit/, { timeout: 10_000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.getElementById('pathPlot').scrollIntoView({ block: 'center' }));
  const cdp = await context.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const box = await page.locator('#pathPlot').boundingBox(), x = box.x + box.width * 0.35, y = box.y + box.height * 0.5;
  // Finger aufsetzen und gleich senkrecht wischen: Kopf bleibt beim Kapital
  await touch('touchStart', x, y); await page.waitForTimeout(60);
  await expect(page.locator('#phK')).toHaveText(/^Kapital mit/);
  for (let i = 1; i <= 6; i++) await touch('touchMove', x, y - i * 15);
  await touch('touchEnd');
  await expect(page.locator('#phK')).toHaveText(/^Kapital mit/);
  // kurz halten, dann ziehen: Kopf zeigt den Wert in diesem Alter
  const b2 = await page.locator('#pathPlot').boundingBox(), y2 = b2.y + b2.height * 0.5;
  await touch('touchStart', b2.x + b2.width * 0.3, y2); await page.waitForTimeout(400);
  await touch('touchMove', b2.x + b2.width * 0.4, y2);
  await expect(page.locator('#phK')).toHaveText(/^Mit \d+/);
  await touch('touchEnd');
  await expect(page.locator('#phK')).toHaveText(/^Kapital mit/);
});

/* Übergabe aus der Finanzaufnahme (#aufnahme=…): nur Zahlen, geprüft, Hash danach weg */
const aufnahme = d => '/#aufnahme=' + Buffer.from(JSON.stringify(d)).toString('base64url');
async function oeffneMit(page, url) {
  const problems = [];
  page.on('pageerror', e => problems.push('Fehler: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('Konsole: ' + m.text()); });
  await page.goto(url);
  return problems;
}

test('Übergabe aus der Finanzaufnahme füllt die Felder vor, Startseite bleibt @mobil', async ({ page }) => {
  const problems = await oeffneMit(page, aufnahme({ v: 1, alter: 35, status: 'ang', netto: 2850, ersp: 10700 }));
  await expect(page.locator('#ldGo')).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe('');
  await page.click('#ldGo');
  await expect(page.locator('#alter')).toHaveValue('35');
  await expect(page.locator('#netto')).toHaveValue('2.850');
  await expect(page.locator('#ersp')).toHaveValue('10.700');
  await expect(page.locator('#status [data-v="ang"]')).toHaveAttribute('aria-pressed', 'true');
  // Bedarf rechnet der Rechner wie bisher selbst (90 % vom Netto, auf 50 aufgerundet)
  await expect(page.locator('#bedarf')).toHaveValue('2.600');
  expect(problems).toEqual([]);
});

test('Übergabe im schon offenen Tab (nur der Hash wechselt)', async ({ page }) => {
  await open(page);
  await page.goto(aufnahme({ v: 1, alter: 50, status: 'ang', netto: 3100, ersp: 0 }));
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
  await page.click('#ldGo');
  await expect(page.locator('#alter')).toHaveValue('50');
  await expect(page.locator('#netto')).toHaveValue('3.100');
});

test('Übergabe: selbstständig mit Gewinn', async ({ page }) => {
  await oeffneMit(page, aufnahme({ v: 1, alter: 41, status: 'selbst', gewinn: 4200, ersp: 0 }));
  await page.click('#ldGo');
  await expect(page.locator('#alter')).toHaveValue('41');
  expect(await page.evaluate(() => [document.getElementById('gewinnCtl').hidden, document.getElementById('nettoCtl').hidden])).toEqual([false, true]);
  await expect(page.locator('#gewinn')).toHaveValue('4.200');
});

test('Übergabe: unplausible oder kaputte Werte werden ignoriert', async ({ page }) => {
  const problems = await oeffneMit(page, aufnahme({ v: 1, alter: 150, status: 'chef', netto: -5, ersp: '9999', name: 'Max Muster' }));
  await page.click('#ldGo');
  await expect(page.locator('#alter')).toHaveValue('32');
  await expect(page.locator('#netto')).toHaveValue('');
  await expect(page.locator('#ersp')).toHaveValue('');
  expect(await page.locator('body').innerText()).not.toContain('Max Muster');
  await page.goto('about:blank'); await page.goto('/#aufnahme=%%%kaputt');
  await expect(page.locator('#ldGo')).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe('');
  await page.goto('about:blank'); await page.goto(aufnahme({ v: 2, alter: 40 }));
  await page.click('#ldGo');
  await expect(page.locator('#alter')).toHaveValue('32');
  expect(problems).toEqual([]);
});
