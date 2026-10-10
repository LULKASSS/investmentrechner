/* Schneller Fehlercheck ohne Browser:
 * 1. JavaScript in index.html und ziele.html ist syntaktisch gültig, ziele.html hat denselben Rechenkern
 * 2. HTML-Grundgerüst stimmt, keine doppelten IDs
 * 3. Keine Kundendaten oder Schlüssel im Repo (es ist öffentlich)
 * Exit-Code 1 bei Fehlern. */
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { kernAus, KERN_RE } from './kern-sync.mjs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [], warns = [];
const html = await readFile(root + 'index.html', 'utf8');
const ziele = await readFile(root + 'ziele.html', 'utf8');

/* 1. Syntax und 2. HTML/IDs – für den Rechner und den Ziele-Planer */
let scripts = [], ids = [];
for (const [datei, text] of [['index.html', html], ['ziele.html', ziele]]) {
  const sc = [...text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!sc.length) errors.push(`${datei}: kein <script> gefunden`);
  sc.forEach((code, i) => {
    try { new vm.Script(code, { filename: `${datei} <script #${i + 1}>` }); }
    catch (e) { errors.push(`${datei}: Syntaxfehler in Script ${i + 1}: ${e.message}`); }
  });
  for (const need of ['<!doctype html>', '<meta charset', 'name="viewport"', '<title>'])
    if (!text.toLowerCase().includes(need.toLowerCase())) errors.push(`${datei}: ${need} fehlt`);
  const id = [...text.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  for (const d of new Set(id.filter((v, i, a) => a.indexOf(v) !== i))) errors.push(`${datei}: ID doppelt vergeben: #${d}`);
  scripts = scripts.concat(sc); ids = ids.concat(id);
}
/* Ziele-Planer rechnet mit demselben Kern wie der Rechner */
const kz = ziele.match(KERN_RE);
if (!kz || kz[2] !== kernAus(html)) errors.push('ziele.html: Rechenkern weicht von index.html ab – „npm run kern“ ausführen');

/* 3. Kundendaten und Schlüssel */
let files = [];
try { files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); }
catch { warns.push('git nicht verfügbar, Datencheck übersprungen'); }
for (const f of files) {
  if (/\.(pdf|xlsx?|docx?|csv)$/i.test(f)) errors.push(`Dokument im Repo: ${f} (Vorschläge und Kundenunterlagen gehören nicht hierher)`);
  if (/\.(js|mjs|html|md|json|yml)$/.test(f)) {
    const t = await readFile(root + f, 'utf8').catch(() => '');
    if (/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-ant-[A-Za-z0-9-]{20,}/.test(t)) errors.push(`Möglicher Zugangsschlüssel in ${f}`);
    if (/\bDE\d{2}(?: ?\d{4}){4} ?\d{2}\b/.test(t)) errors.push(`Sieht nach einer IBAN aus: ${f}`);
  }
}

for (const w of warns) console.log('⚠️  ' + w);
if (errors.length) { console.log('❌ Fehlercheck fehlgeschlagen:'); for (const e of errors) console.log('   • ' + e); process.exit(1); }
console.log(`✅ Fehlercheck ok (${scripts.length} Scripts, ${ids.length} IDs, ${files.length} Dateien geprüft)`);
