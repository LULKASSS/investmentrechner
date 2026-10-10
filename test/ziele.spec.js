// Ziele-Planer (Versuch): einmal durchspielen, Plan prüfen, Rente gegen den Investmentrechner abgleichen.
const { test, expect } = require('@playwright/test');

async function open(page) {
  const problems = [];
  page.on('pageerror', e => problems.push('Fehler: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('Konsole: ' + m.text()); });
  await page.goto('/ziele.html');
  return problems;
}
const zahl = s => +String(s).replace(/[^\d]/g, '');

async function durch(page, { netto = '3200', ziele = ['notgroschen', 'auto', 'rente'], ersp = '' } = {}) {
  await page.click('#los');
  await page.fill('#netto', netto);
  await page.click('#next0');
  for (const t of ziele) await page.click(`#tiles [data-typ="${t}"]`);
  await page.click('#next1');
  if (ersp) await page.fill('#ersp', ersp);
  await page.click('#plane');
  await expect(page.locator('#ziele')).toBeVisible();
}

test('Ziele-Planer: Startseite → Fragen → Ziele → Zeitstrahl → Plan @mobil', async ({ page }) => {
  const problems = await open(page);
  await durch(page, { ersp: '8000', ziele: ['notgroschen', 'auto', 'wohnung', 'reise', 'rente'] });
  await expect(page.locator('#zGrid .zk[data-zid]')).toHaveCount(5);
  await page.click('#nav [data-go="zeit"]');
  await expect(page.locator('#tHero')).toHaveText(/\d.* €/, { timeout: 10_000 });
  await page.click('#nav [data-go="plan"]');
  await expect(page.locator('#pHero')).toHaveText(/von|Alle|Dein/, { timeout: 10_000 });
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/NaN|Infinity|undefined/);
  // nichts ragt seitlich aus dem Bild
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  expect(problems).toEqual([]);
});

test('Plan: mit „Alles pünktlich“ kommen alle Ziele pünktlich', async ({ page }) => {
  await open(page);
  await durch(page, { ziele: ['notgroschen', 'auto', 'reise'] });
  const summe = zahl(await page.locator('#zSum').textContent({ timeout: 5000 }));
  await page.click('#nav [data-go="plan"]');
  await expect(page.locator('#pHero')).toHaveText(/von/, { timeout: 10_000 });
  const knopf = page.locator('#pQuick [data-bud]');
  // Schnellknopf und Summe auf der Ziele-Seite zeigen denselben Betrag
  await page.waitForTimeout(1200);
  expect(zahl(await knopf.textContent())).toBe(zahl(await page.locator('#zSum').textContent()) || summe);
  await knopf.click();
  await expect(page.locator('#pHero')).toHaveText('Alle 3');
  await expect(page.locator('#pRows .ink-gap')).toHaveCount(0);
});

test('Ziel dazu und weg: Karte erscheint und verschwindet, Summe passt sich an', async ({ page }) => {
  await open(page);
  await durch(page, { ziele: ['auto'] });
  await page.waitForTimeout(1300);
  const vorher = zahl(await page.locator('#zSum').textContent());
  await page.click('#zGrid .zk-add');
  await page.click('#zGrid .picker [data-typ="reise"]');
  await expect(page.locator('#zGrid .zk[data-zid]')).toHaveCount(2);
  await expect.poll(async () => zahl(await page.locator('#zSum').textContent())).toBeGreaterThan(vorher);
  await page.locator('#zGrid [data-weg]').nth(1).click();
  await expect(page.locator('#zGrid .zk[data-zid]')).toHaveCount(1);
});

test('Rente rechnet wie der Investmentrechner (gleiche Sparrate)', async ({ page }) => {
  // Investmentrechner: 32 J., 3.200 € netto, Wunschrente 2.800 € → Sparrate auf der Seite „Weg“
  await page.goto('/');
  await page.click('#ldGo');
  await page.click('.q-next[data-q="0"]');
  await page.click('.q-next[data-q="1"]');
  await page.click('[data-v="ang"]');
  await page.fill('#netto', '3200'); await page.fill('#bedarf', '2800');
  await page.click('#next2'); await page.click('#go');
  await page.click('#tbNav [data-go="warten"]');
  await page.waitForTimeout(1500);
  const rechner = zahl(await page.locator('#wegR').textContent());
  expect(rechner).toBeGreaterThan(0);

  await page.goto('/ziele.html');
  await durch(page, { ziele: ['rente'] });
  const feld = page.locator('#zGrid input[data-k="wunsch"]');
  await feld.fill('2800'); await feld.press('Tab');
  await expect.poll(async () => zahl(await page.locator('#zGrid [data-rate]').textContent()), { timeout: 5000 }).toBe(rechner);
});
