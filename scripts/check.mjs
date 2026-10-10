/* Schneller Fehlercheck ohne Browser:
 * 1. JavaScript in index.html ist syntaktisch gültig
 * 2. HTML-Grundgerüst stimmt, keine doppelten IDs
 * 3. Keine Kundendaten oder Schlüssel im Repo (es ist öffentlich)
 * Exit-Code 1 bei Fehlern. */
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [], warns = [];
const html = await readFile(root + 'index.html', 'utf8');

/* 1. Syntax */
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) errors.push('index.html: kein <script> gefunden');
scripts.forEach((code, i) => {
  try { new vm.Script(code, { filename: `index.html <script #${i + 1}>` }); }
  catch (e) { errors.push(`Syntaxfehler in Script ${i + 1}: ${e.message}`); }
});

/* 2. HTML und IDs */
for (const need of ['<!doctype html>', '<meta charset', 'name="viewport"', '<title>'])
  if (!html.toLowerCase().includes(need.toLowerCase())) errors.push(`index.html: ${need} fehlt`);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
for (const d of new Set(ids.filter((v, i, a) => a.indexOf(v) !== i))) errors.push(`ID doppelt vergeben: #${d}`);

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
