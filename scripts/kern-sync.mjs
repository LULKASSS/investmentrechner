/* Rechenkern aus index.html (erstes <script>) 1:1 in ziele.html übernehmen.
 * Der Ziele-Planer rechnet die Rente mit genau derselben Logik wie der Investmentrechner.
 * Aufruf: npm run kern  (der Fehlercheck meldet, wenn beide auseinanderlaufen) */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const kernAus = html => html.split('<script>')[1].split('</script>')[0];
export const KERN_RE = /(<script data-kern>)([\s\S]*?)(<\/script>)/;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const kern = kernAus(await readFile(root + 'index.html', 'utf8'));
  const ziele = await readFile(root + 'ziele.html', 'utf8');
  if (!KERN_RE.test(ziele)) { console.log('❌ ziele.html: <script data-kern> fehlt'); process.exit(1); }
  await writeFile(root + 'ziele.html', ziele.replace(KERN_RE, (_, a, __, c) => a + kern + c));
  console.log('✅ Rechenkern in ziele.html übernommen');
}
