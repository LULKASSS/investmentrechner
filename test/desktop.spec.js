// Mac-App: startet, zeigt die Startseite, öffnet keine fremden Seiten im App-Fenster
// und holt sich die aktuelle Fassung der Seite selbst (ohne Netz: die zuletzt geholte).
const { test, expect, _electron: electron } = require('@playwright/test');
const os = require('node:os'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');

const ROOT = path.join(__dirname, '..');

async function starte(tmp, quelle) {
  const app = await electron.launch({ args: ['.'], cwd: ROOT, env: { ...process.env, RECHNER_DATA: tmp, RECHNER_QUELLE: quelle } });
  const win = await app.firstWindow();
  const problems = [];
  win.on('pageerror', e => problems.push(e.message));
  await expect(win.locator('#ldGo')).toBeVisible();
  return { app, win, problems };
}

test('Mac-App startet mit Startseite', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rechner-'));
  const { app, win, problems } = await starte(tmp, 'aus');
  try {
    expect(await win.title()).toBe('Investmentrechner');
    expect(win.url()).toBe('app://rechner/index.html');
    expect(problems).toEqual([]);
  } finally {
    await app.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Mac-App nimmt die neue Fassung aus dem Netz und merkt sie sich für ohne Netz', async () => {
  // Server mit einer „neueren“ Seite: dieselbe index.html mit einer Markierung
  const neu = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace('<title>Investmentrechner</title>', '<title>Investmentrechner</title>\n<meta name="fassung" content="neu-aus-dem-netz">');
  const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(neu); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rechner-'));
  const marke = win => win.locator('meta[name="fassung"]').getAttribute('content');
  try {
    let a = await starte(tmp, `http://127.0.0.1:${server.address().port}/`);
    expect(await marke(a.win)).toBe('neu-aus-dem-netz');
    expect(a.problems).toEqual([]);
    await a.app.close();

    // Netz weg (Port ohne Server): die gemerkte Fassung kommt, nicht die eingebaute
    server.close();
    a = await starte(tmp, 'http://127.0.0.1:9/');
    expect(await marke(a.win)).toBe('neu-aus-dem-netz');
    await a.app.close();
  } finally {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
