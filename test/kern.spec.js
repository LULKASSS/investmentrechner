// Rechenkern ohne Browser: lädt das erste <script> aus index.html und prüft die Rechnung.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ctx = { module: { exports: {} }, Math }; vm.createContext(ctx);
vm.runInContext(html.split('<script>')[1].split('</script>')[0], ctx);
const M = ctx.module.exports;
const BASIS = { alter: 32, rentenbeginn: 67, status: 'ang', netto: 2600, gewinn: 0, drv: false, einstieg: 22, bedarf: 2300, inflation: 0.02, anpassung: 0.015, lebenserwartung: 85, entnahme: 0.03, anspar: 0.07, bestand: 0, ersp: 0, grvBrief: null };

test.describe.configure({ mode: 'parallel' });

test('Brutto ↔ Netto geht hin und zurück', () => {
  for (const b of [800, 3000, 6000, 8450, 12000, 30000]) expect(M.bruttoAusNetto(M.nettoAusBrutto(b))).toBeCloseTo(b, 0);
});

test('Sparrate laut Vorschlag schließt die Lücke', () => {
  const r = M.rechne(BASIS), T = M.toepfe(BASIS, r, r.raten[0].rate, 1, 'depot', 0, 0);
  expect(T.anteil).toBeCloseTo(1, 3);
});

test('Später anfangen kostet mehr', () => {
  const r = M.rechne(BASIS), [a, b, c, d] = r.raten.map(x => x.rate);
  expect(a).toBeLessThan(b); expect(b).toBeLessThan(c); expect(c).toBeLessThan(d);
});

test('Renteninfo ersetzt die Schätzung, Abschlag bei 63', () => {
  const brief = M.rechne({ ...BASIS, grvBrief: 1800 });
  expect(brief.quelle).toBe('brief'); expect(brief.grvBriefB).toBe(1800);
  const frueh = M.rechne({ ...BASIS, rentenbeginn: 63, grvBrief: 1800 });
  expect(frueh.grvBriefB).toBeCloseTo(1800 * (1 - 4 * 0.036), 6);
});

test('Zufallswerte: nie NaN, nie negative Lücke', () => {
  let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648, pick = a => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < 1500; i++) {
    const p = { ...BASIS, alter: pick([18, 32, 55, 66, 69]), status: pick(['ang', 'selbst']), netto: pick([0, 900, 2600, 20000]), gewinn: pick([0, 3000, 30000]), drv: pick([true, false]),
      bedarf: pick([0, 800, 2300, 6000]), inflation: pick([0, 0.02, 0.05]), entnahme: pick([0, 0.02, 0.08]), anspar: pick([0, 0.07, 0.1]), bestand: pick([0, 300, 5000]), grvBrief: pick([null, 1800]) };
    p.rentenbeginn = Math.min(70, Math.max(p.alter + 1, pick([60, 63, 67, 70]))); p.einstieg = Math.min(22, p.alter); p.lebenserwartung = Math.max(p.rentenbeginn + 1, 85);
    const r = M.rechne(p);
    for (const k of ['luecke', 'kapital', 'grvNom', 'bedarfNom']) { expect(Number.isFinite(r[k]), `${k} bei ${JSON.stringify(p)}`).toBe(true); expect(r[k]).toBeGreaterThanOrEqual(0); }
    const T = M.toepfe(p, r, 100, 0.8, 'depot', 0, 3);
    for (const k of ['kAV', 'kDep', 'lAV', 'lDep']) expect(Number.isFinite(T[k])).toBe(true);
  }
});

test('Verlauf der Lösung endet bei Rentenbeginn beim Kapital der Pille', () => {
  const r = M.rechne(BASIS);
  for (const [anteil, ums, ein] of [[1, 0, 0], [0.8, 3, 0], [0.7, 5, 20000]]) {
    const T = M.toepfe(BASIS, r, 300, anteil, 'depot', 0, ums), V = M.loesungVerlauf(BASIS, r, T, ein);
    const e = V.sp[V.sp.length - 1], kE = ein * Math.pow(1 + BASIS.anspar, r.n);
    expect(e.av + e.dep + e.ein).toBeCloseTo(T.kAV + T.kDep + kE, 0);
    expect(V.rp[V.rp.length - 1].tot).toBeCloseTo(0, 0);
    for (const q of [...V.sp, ...V.rp]) expect(Object.values(q).every(Number.isFinite)).toBe(true);
  }
});
