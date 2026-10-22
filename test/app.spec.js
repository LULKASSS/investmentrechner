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
  await page.click('.q-next[data-q="3"]');
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
  await page.click('.q-next[data-q="3"]');
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
  await page.click('#next2'); await page.click('.q-next[data-q="3"]'); await page.click('#go');
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
  // mit allen Bausteinen und der Kurve der Lösung rutschen „Deine Angaben“ auf Seite 3
  await expect(page.locator('#vPages img')).toHaveCount(3, { timeout: 20_000 });
  expect(problems).toEqual([]);
});

test('Sparrate vergleichen: weicht man vom Vorschlag ab, wird er zur Vergleichsrate, von Hand änderbar @mobil', async ({ page }) => {
  const problems = await open(page);
  await zurLoesung(page);
  // Vorschlag eingestellt: nichts zu vergleichen
  await expect(page.locator('#vglWrap')).toBeHidden();
  await expect(page.locator('#vglFx')).toBeHidden();
  const vorschlag = zahl(await page.locator('#spar').inputValue());
  // eigene Sparrate darunter: der Vorschlag wird zur Vergleichsrate
  await page.fill('#spar', '150');
  await expect(page.locator('#vgl')).toHaveValue(new Intl.NumberFormat('de-DE').format(vorschlag));
  await expect(page.locator('#vglFx')).toContainText(`${vorschlag - 150} € weniger`);
  await expect(page.locator('#vglTick')).toBeVisible();
  expect(await page.locator('#lpVgl').getAttribute('d')).toMatch(/^M/);
  await expect(page.locator('#lpLabsIn')).toContainText(`Vergleich ${vorschlag} €`);
  // Vergleichsrate von Hand: Unterschied neben „Vergleich“ = Kapital mit 300 € minus Kapital mit 150 €
  await page.fill('#spar', '300'); await page.waitForTimeout(1000);
  const k300 = zahl(await page.locator('#pSumK').textContent());
  await page.fill('#spar', '150'); await page.waitForTimeout(1000);
  const k150 = zahl(await page.locator('#pSumK').textContent());
  await page.fill('#vgl', '300');
  await expect(page.locator('#vglFx')).toContainText('150 € weniger');
  await expect(page.locator('#lpLabsIn')).toContainText('Vergleich 300 €');
  expect(Math.abs(zahl(await page.locator('#lpLabsIn .lp-dv').textContent()) - (k300 - k150))).toBeLessThanOrEqual(100);
  // ausschalten und wieder holen
  await page.click('#vglAus');
  await expect(page.locator('#vglFx')).toBeHidden();
  expect(await page.locator('#lpVgl').getAttribute('d')).toBe('');
  await expect(page.locator('#vglAn')).toHaveText(`Vergleichen mit ${vorschlag} €`);
  await page.click('#vglAn');
  await expect(page.locator('#vglFx')).toBeVisible();
  // zurück auf die ganze Lücke: Vergleich verschwindet
  await page.click('#qFull');
  await expect(page.locator('#vglWrap')).toBeHidden();
  expect(problems).toEqual([]);
});

test('Balken der Sparrate: Regler stellt die Sparrate, „ganze Lücke“ setzt zurück, ab der Lücke grün', async ({ page }) => {
  const problems = await open(page);
  await zurLoesung(page);
  await expect(page.locator('#sparRW')).toHaveClass(/zu/);
  await page.locator('#sparR').fill('100');
  await expect(page.locator('#spar')).toHaveValue('100');
  await expect(page.locator('#sparRW')).not.toHaveClass(/zu/);
  await page.click('#qFull');
  await expect(page.locator('#sparRW')).toHaveClass(/zu/);
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

test('Schnell durchklicken: Weg- und Lösungs-Kurve zeichnen sich trotzdem fertig', async ({ page }) => {
  const problems = await open(page);
  await zurLoesung(page);
  // Lösung: Kurve ins Bild, während sie sich zeichnet neu rechnen lassen
  await page.evaluate(() => document.getElementById('solPathPanel').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  await page.fill('#spar', '300');
  await page.waitForTimeout(3000);
  const ganz = async (clip, plot) => page.evaluate(([c, p]) => +document.getElementById(c).getAttribute('width') >= document.getElementById(p).clientWidth, [clip, plot]);
  expect(await ganz('lpClipR', 'lpPlot')).toBe(true);
  // Weg: hin, sofort weiter, zurück
  await page.click('#tbNav [data-go="warten"]'); await page.waitForTimeout(450);
  await page.click('#tbNav [data-go="toepfe"]'); await page.waitForTimeout(300);
  await page.click('#tbNav [data-go="warten"]'); await page.waitForTimeout(3000);
  expect(await ganz('pClipR', 'pathPlot')).toBe(true);
  expect(problems).toEqual([]);
});

// Sparziele in der Datenaufnahme eintippen: immer in die leere Zeile, daraus wird ein Ziel
async function zieleEintippen(page, ziele) {
  for (const [name, betrag, jahre] of ziele) {
    await page.locator('#zRows .z-row.neu [data-f="titel"]').fill(name);
    const r = page.locator('#zRows .z-row[data-id]').last();
    await expect(r.locator('[data-f="titel"]')).toHaveValue(name);
    await r.locator('[data-f="betrag"]').fill(String(betrag));
    await r.locator('[data-f="jahre"]').fill(String(jahre));
  }
}
const DREI = [['Notgroschen', 9500, 1], ['Auto', 25000, 4], ['Wohnung', 70000, 8]];
async function mitZielen(page, ziele = DREI) {
  await page.click('#ldGo');
  await page.click('.q-next[data-q="0"]');
  await page.click('.q-next[data-q="1"]');
  await page.click('[data-v="ang"]');
  await page.fill('#netto', '3200'); await page.fill('#bedarf', '2800');
  await page.click('#next2');
  await page.fill('#ersp', '20000');
  await page.click('.q-next[data-q="3"]');
  await zieleEintippen(page, ziele);
  await page.click('#go');
  await expect(page.locator('#luecke')).toBeVisible();
}

test('Ziele: in den Daten eingetippt, eigene Seite, Summe = Rente + Ziele, Termin verschieben senkt die Rate @mobil', async ({ page }) => {
  const problems = await open(page);
  await mitZielen(page);
  await expect(page.locator('#tbZiele')).toBeVisible();
  await page.click('#tbNav [data-go="toepfe"]');
  await expect(page.locator('#pnLoesZiele')).toBeVisible();
  const rente = zahl(await page.locator('#spar').inputValue());
  await page.click('#tbNav [data-go="ziele"]');
  await expect(page.locator('#ziele .z-card')).toHaveCount(3);
  await page.waitForTimeout(900);
  const raten = await page.locator('#zGrid input[data-f="rate"]').evaluateAll(els => els.map(e => +e.value.replace(/\D/g, '')));
  expect(zahl(await page.locator('#zSum').textContent())).toBe(rente + raten.reduce((a, b) => a + b, 0));
  // Auto ein Jahr später (Griff mit der Pfeiltaste): kleinere Rate
  const auto = page.locator('#zGrid .z-card').nth(1);
  const vorher = zahl(await auto.locator('input[data-f="rate"]').inputValue());
  await page.locator('#zPlan .zp-h').nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(auto.locator('.z-jahr')).toHaveText('2031');
  expect(zahl(await auto.locator('input[data-f="rate"]').inputValue())).toBeLessThan(vorher);
  // eigene, kleinere Rate: das Ziel rückt nach hinten
  await auto.locator('input[data-f="rate"]').fill('200');
  await expect(auto.locator('.z-fx')).toContainText('später als gewünscht');
  await auto.locator('.z-puenkt').click();
  await expect(auto.locator('.z-jahr')).toHaveText('2031');
  expect(problems).toEqual([]);
});

test('Ziele: Budget zu klein, „Ins Budget einpassen“ verschiebt, bis jedes Jahr passt', async ({ page }) => {
  const problems = await open(page);
  await mitZielen(page);
  await page.click('#tbNav [data-go="ziele"]');
  await page.fill('#budget', '1200');
  await expect(page.locator('#zBud')).toContainText('über Budget');
  await page.click('#zFit');
  await expect(page.locator('#zBud')).toContainText('passt');
  await expect(page.locator('#zFit')).toBeHidden();
  // jede Jahres-Säule bleibt im Budget
  const ueber = await page.locator('#zPlan .zp-ue').evaluateAll(els => els.filter(e => parseFloat(e.style.height) > 0.5).length);
  expect(ueber).toBe(0);
  await expect(page.locator('#zGrid .z-card').nth(2).locator('.z-fx')).toContainText('Sparen ab');
  expect(problems).toEqual([]);
});

test('Lösung: weniger als die ganze Lücke nennt die Erhöhung ab nächstem Jahr', async ({ page }) => {
  const problems = await open(page);
  await zurLoesung(page);
  await expect(page.locator('#nachFx')).toBeHidden();
  await page.fill('#spar', '150');
  await expect(page.locator('#nachFx')).toContainText('mehr');
  await expect(page.locator('#nachFx')).toContainText('Gehaltserhöhung');
  // wer die Erhöhung ab nächstem Jahr dazunimmt, deckt die Lücke: etwa so viel wie die Differenz plus ein Jahr Zinsen
  const plus = zahl(await page.locator('#nachFx b').textContent());
  const ganz = zahl(await page.locator('#qFull').textContent().then(t => t.replace(/^.*Lücke/, '')));
  expect(plus).toBeGreaterThan(ganz - 150);
  expect(plus).toBeLessThan((ganz - 150) * 1.25);
  await page.click('#qFull');
  await expect(page.locator('#nachFx')).toBeHidden();
  expect(problems).toEqual([]);
});

test('Vorschlag-PDF mit Zielen @mobil', async ({ page }) => {
  const problems = await open(page);
  await mitZielen(page);
  await page.click('#pdfBtn');
  await expect(page.locator('#vPages img')).toHaveCount(3, { timeout: 20_000 });
  expect(problems).toEqual([]);
});

test('Sparziel: Name tippen ohne dass der Cursor springt, steht im Zeitstrahl; „+ Sparziel“ auf der Seite', async ({ page }) => {
  const problems = await open(page);
  await mitZielen(page, [['M', 8000, 2]]);
  await page.click('#tbNav [data-go="ziele"]');
  const t = page.locator('#zGrid .z-titel');
  await t.click(); await page.keyboard.press('End'); await page.keyboard.type('otorrad');
  await expect(t).toHaveValue('Motorrad');
  await expect(page.locator('#zPlan')).toContainText('Motorrad');
  await page.click('#zNeu');
  await expect(page.locator('#zGrid .z-card')).toHaveCount(2);
  await expect(page.locator('#zGrid .z-card').nth(1).locator('.z-titel')).toBeFocused();
  expect(problems).toEqual([]);
});
