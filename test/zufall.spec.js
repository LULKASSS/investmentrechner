// Zufallstest: viele Eingaben quer durch alle Seiten. Keine Fehler, keine kaputten Zahlen.
const { test, expect } = require('@playwright/test');

const KAPUTT = /NaN|Infinity|undefined|null €|−0 €/;

async function sichtbarerText(page) {
  return page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter(e => e.children.length === 0 && e.offsetParent && !e.closest('[hidden]'))
    .map(e => e.textContent).join(' | '));
}

// ZUFALL=30 npx playwright test zufall → mehr Durchläufe
const N = +(process.env.ZUFALL || 6);
for (let seed = 1; seed <= N; seed++) {
  test(`Zufallseingaben, Durchlauf ${seed}`, async ({ page }) => {
    test.setTimeout(90_000);
    const problems = [];
    page.on('pageerror', e => problems.push('Fehler: ' + e.message));
    let s = seed * 7919;
    const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = a => a[Math.floor(rnd() * a.length)];
    await page.goto('/');
    await page.click('#ldGo');
    await page.fill('#alter', String(pick([18, 30, 45, 58, 63, 69])));
    await page.press('#alter', 'Tab');
    await page.click('.q-next[data-q="0"]');
    await page.fill('#beginn', String(pick([60, 63, 67, 70])));
    await page.press('#beginn', 'Tab');
    await page.click('.q-next[data-q="1"]');
    const st = pick(['ang', 'selbst']);
    await page.click(`[data-v="${st}"]`);
    if (st === 'ang') await page.fill('#netto', String(pick([900, 2600, 5200, 14000])));
    else { await page.fill('#gewinn', String(pick([1500, 4500, 20000]))); if (rnd() < 0.5) await page.check('#drv'); }
    if (rnd() < 0.5) await page.fill('#bedarf', String(pick([800, 2000, 4500])));
    await page.click('#next2');
    if (rnd() < 0.5) await page.fill('#bestand', String(pick([150, 900, 6000])));
    if (rnd() < 0.6) await page.fill('#ersp', String(pick([5000, 40000, 500000])));
    await page.click('#go');
    await page.waitForTimeout(800);
    for (let i = 0; i < 14; i++) {
      const a = pick(['luecke', 'warten', 'toepfe', 'toepfe', 'toepfe', 'grv', 'infl', 'spar', 'chip', 'chip', 'ziel', 'ums', 'einm', 'split']);
      if (['luecke', 'warten', 'toepfe'].includes(a)) await page.click(`#tbNav [data-go="${a}"]`);
      const vis = sel => page.locator(sel).first().isVisible();
      if (a === 'grv' && await vis('#grvB')) await page.fill('#grvB', String(pick([0, 400, 1900])));
      if (a === 'infl' && await vis('#infl')) await page.locator('#infl').fill(String(pick([0, 2.5, 5])));
      if (a === 'spar' && await vis('#spar')) await page.fill('#spar', String(pick([0, 25, 300, 2000])));
      if (a === 'chip' && await vis('#bDep')) await page.click(pick(['#bDep', '#bEinm', '#bImm']));
      if (a === 'ziel' && await vis('#einmWrap.open #einmZiel')) await page.click(`#einmZiel [data-v="${pick(['av', 'dep'])}"]`);
      if (a === 'ums' && await vis('#ums')) await page.click(`#ums [data-v="${pick([0, 1, 3, 5])}"]`);
      if (a === 'einm' && await vis('#einmWrap.open #einm')) await page.fill('#einm', String(pick([0, 1000, 25000])));
      if (a === 'split' && await vis('#splitWrap.open #split')) await page.locator('#split').fill(String(pick([0, 50, 100])));
      await page.waitForTimeout(650);
      const t = await sichtbarerText(page);
      const m = t.match(KAPUTT);
      expect(m && t.slice(Math.max(0, m.index - 80), m.index + 40), `nach Aktion ${a}`).toBeNull();
    }
    await page.click('#pdfBtn');
    await expect(page.locator('#vPages img').first()).toBeVisible({ timeout: 20_000 });
    expect(problems).toEqual([]);
  });
}
