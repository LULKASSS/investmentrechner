// Mac-App: startet, zeigt die Startseite, öffnet keine fremden Seiten im App-Fenster.
const { test, expect, _electron: electron } = require('@playwright/test');
const os = require('node:os'), fs = require('node:fs'), path = require('node:path');

test('Mac-App startet mit Startseite', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rechner-'));
  const app = await electron.launch({ args: ['.'], cwd: path.join(__dirname, '..'), env: { ...process.env, RECHNER_DATA: tmp } });
  try {
    const win = await app.firstWindow();
    const problems = [];
    win.on('pageerror', e => problems.push(e.message));
    await expect(win.locator('#ldGo')).toBeVisible();
    expect(await win.title()).toBe('Investmentrechner');
    expect(win.url()).toBe('app://rechner/index.html');
    expect(problems).toEqual([]);
  } finally {
    await app.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
