// Site checks (no packages): run `node tools/check.mjs`. Exits 1 if anything fails.
//  - every local link and image resolves to a file, and every #anchor exists on its page
//  - every <img> has alt, every page has exactly one <h1>, a <title> and a meta description
//  - no build placeholders ({{root}}) left, every @partial marker is closed
//  - any page showing the fictional examples carries the full fictional-example label
//  - nothing on the site offers a live purchase (purchase buttons stay disabled)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['partials', 'tools', 'node_modules', '.git', 'assets']);
const LABEL = 'Illustrative example using fictional information. This is not a client case study and does not represent completed work or achieved outcomes.';
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(d, e.name)); }
  else if (e.name.endsWith('.html')) files.push(path.join(d, e.name));
} })(ROOT);

const fails = [];
const ids = new Map();
const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
for (const f of files) ids.set(f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));

let links = 0;
for (const f of files) {
  const rel = path.relative(ROOT, f).replaceAll('\\', '/');
  const html = fs.readFileSync(f, 'utf8');
  const is404 = rel === '404.html';
  const base = is404 ? ROOT : path.dirname(f);
  if (html.includes('{{root}}')) fails.push(`${rel}: unreplaced {{root}}`);
  for (const m of html.matchAll(/<!-- @([\w-]+) -->/g)) if (!html.includes(`<!-- /@${m[1]} -->`)) fails.push(`${rel}: marker @${m[1]} not closed`);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fails.push(`${rel}: ${h1s} <h1> elements`);
  if (!/<title>[^<]+<\/title>/.test(html)) fails.push(`${rel}: missing <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) fails.push(`${rel}: missing meta description`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) fails.push(`${rel}: <img> without alt: ${m[0].slice(0, 80)}`);
  for (const m of html.replace(/<base\b[^>]*>/g, '').matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
    links++;
    const [pathPart, hash] = url.split('#');
    let target = f;
    if (pathPart) {
      const clean = pathPart.split('?')[0];
      let p = clean.startsWith('/') ? path.join(ROOT, clean) : path.resolve(base, clean);
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { fails.push(`${rel}: broken link ${url}`); continue; }
      target = p;
    }
    if (hash && target.endsWith('.html') && !(ids.get(target) || new Set()).has(hash)) fails.push(`${rel}: missing anchor #${hash} (${url})`);
  }
  const t = text(html);
  const showsExample = /class="doc"/.test(html) && /F0[123]/.test(html) || /hv-report/.test(html);
  if (showsExample && !t.includes(LABEL) && !t.includes('Based on an illustrative example using fictional information')) fails.push(`${rel}: shows fictional examples without the label`);
  if (/class="doc"/.test(html) && /F0[123]/.test(html) && !t.includes(LABEL)) fails.push(`${rel}: sample document without the full label`);
  for (const m of html.matchAll(/<(button|a)\b[^>]*>([^<]*(?:Buy|Purchas|basket|Checkout)[^<]*)</gi)) {
    if (!/disabled/.test(m[0])) fails.push(`${rel}: live purchase control "${m[2].trim()}"`);
  }
}
console.log(`checked ${files.length} pages, ${links} local links`);
if (fails.length) { console.log(fails.map((x) => '  FAIL ' + x).join('\n')); process.exit(1); }
console.log('all checks passed');
