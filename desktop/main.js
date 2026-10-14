/* Investmentrechner als Mac-App (Electron).
 * Holt beim Start die aktuelle index.html von GitHub Pages, damit die App ohne neues
 * Bauen auf dem Stand der Webseite ist, und merkt sich eine Kopie. Ohne Internet startet
 * sie mit der zuletzt geholten Fassung, beim allerersten Mal mit der eingebauten.
 * Der Vorschlag als PDF geht über den normalen Sichern-Dialog. */
const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
/* Tests setzen RECHNER_QUELLE auf einen eigenen Server oder auf „aus“ */
const QUELLE = process.env.RECHNER_QUELLE ?? 'https://lulkasss.github.io/investmentrechner/';
const WARTEN_MS = 4000;

/* Eigenes Schema statt file://: feste Herkunft und sicherer Kontext */
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

/* Tests (RECHNER_DATA=Ordner): eigener Speicher, nie das echte Profil */
if (process.env.RECHNER_DATA) app.setPath('userData', path.join(process.env.RECHNER_DATA, 'profil'));

const kopie = () => path.join(app.getPath('userData'), 'aktuell', 'index.html');
/* Nur eine echte Rechner-Seite übernehmen, keine Fehlerseite vom Server oder Netz */
const istRechner = t => t.length > 50000 && t.includes('<title>Investmentrechner</title>') && t.trimEnd().endsWith('</html>');

async function holeAktuell() {
  if (!QUELLE || QUELLE === 'aus') return null;
  try {
    const res = await net.fetch(new URL('index.html', QUELLE).toString(), { cache: 'no-store', signal: AbortSignal.timeout(WARTEN_MS) });
    if (!res.ok) return null;
    const text = await res.text();
    if (!istRechner(text)) return null;
    fs.mkdirSync(path.dirname(kopie()), { recursive: true });
    fs.writeFileSync(kopie() + '.neu', text); fs.renameSync(kopie() + '.neu', kopie());
    return text;
  } catch { return null; }
}
function gemerkt() {
  try { const t = fs.readFileSync(kopie(), 'utf8'); return istRechner(t) ? t : null; } catch { return null; }
}
const alsHtml = text => new Response(text, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

function createWindow() {
  const win = new BrowserWindow({
    width: 1320, height: 900, minWidth: 380, minHeight: 600,
    title: 'Investmentrechner', backgroundColor: '#F6F6F8', show: false,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  win.once('ready-to-show', () => win.show());

  /* Links nach außen im Standardbrowser öffnen, nie im App-Fenster */
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });

  win.loadURL('app://rechner/index.html');
  return win;
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'fileMenu', label: 'Ablage' },
    { role: 'editMenu' },
    { label: 'Darstellung', submenu: [{ role: 'reload', label: 'Neu laden' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'toggleDevTools', label: 'Entwicklerwerkzeuge' }] },
    { role: 'windowMenu' }
  ]));
}

app.setName('Investmentrechner');
app.whenReady().then(() => {
  protocol.handle('app', req => {
    const { pathname } = new URL(req.url);
    // Die Seite selbst: aktuell aus dem Netz, sonst die gemerkte Kopie, sonst die eingebaute
    if (pathname === '/' || pathname === '/index.html') {
      return holeAktuell().then(t => { t = t || gemerkt(); return t ? alsHtml(t) : net.fetch(pathToFileURL(path.join(ROOT, 'index.html')).toString()); });
    }
    const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(ROOT + path.sep)) return new Response('verboten', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  /* Der Rechner braucht keine Geräte oder Berechtigungen */
  const allowed = new Set(['clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.has(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => allowed.has(perm));

  buildMenu();
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
