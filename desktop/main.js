/* Investmentrechner als Mac-App (Electron).
 * Lädt dieselbe index.html wie die Webseite, läuft ohne claude.ai und – bis auf
 * Schriften und PDF-Bibliothek beim ersten Mal – auch offline. Der Vorschlag als
 * PDF geht über den normalen Sichern-Dialog. */
const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');

/* Eigenes Schema statt file://: feste Herkunft und sicherer Kontext */
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

/* Tests (RECHNER_DATA=Ordner): eigener Speicher, nie das echte Profil */
if (process.env.RECHNER_DATA) app.setPath('userData', path.join(process.env.RECHNER_DATA, 'profil'));

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
