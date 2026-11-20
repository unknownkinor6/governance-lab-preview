// Site checks (no packages): run `node tools/check.mjs`. Exits 1 if anything fails.
//  - every local link and image resolves to a file, and every #anchor exists on its page
//  - every <img> has alt, every page has exactly one <h1>, a <title> and a meta description
//  - no build placeholders ({{root}}) left, every @partial marker is closed
//  - outside /review/: each sample document or fictional example shows the short label exactly once,
//    the label appears nowhere else, and the old long explanation appears nowhere
//  - nothing on the site offers a live purchase (purchase buttons stay disabled)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['partials', 'tools', 'node_modules', '.git', 'assets']);
const LABEL = 'Illustrative example using fictional information';
const HOME_LABEL = 'Fictional example illustrating the report format.';
const OLD_LONG = /client case study|does not represent completed work/i;
const count = (hay, needle) => hay.split(needle).length - 1;
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
  if (!rel.startsWith('review/')) {
    if (OLD_LONG.test(html)) fails.push(`${rel}: old long fictional-example explanation`);
    const body = html.slice(html.indexOf('<body'));
    // the pages of the full sample are one document, so they share one label
    const articles = [...body.matchAll(/<article class="doc"[^>]*>[\s\S]*?<\/article>/g)].map((m) => m[0]);
    const pagesOfOne = articles.filter((a) => /aria-label="Full sample/.test(a));
    const documents = articles.filter((a) => !pagesOfOne.includes(a));
    if (pagesOfOne.length) documents.push(pagesOfOne.join(''));
    for (const d of documents) {
      const n = count(text(d), LABEL);
      if (n !== 1) fails.push(`${rel}: sample document shows the label ${n} times (must be once): ${(d.match(/aria-label="([^"]+)"/) || [])[1]}`);
    }
    const examples = [...body.matchAll(/<div class="fiction-label"[^>]*>[\s\S]*?<\/div>/g)].map((m) => m[0]);
    for (const e of examples) if (text(e).trim() !== LABEL) fails.push(`${rel}: fictional example label is not the short label`);
    // anywhere else on the page the label is a repeat (the Resources card names the samples once)
    const rest = body.replace(/<p class="doc-fiction">[^<]*<\/p>/g, '').replace(/<div class="fiction-label"[^>]*>[\s\S]*?<\/div>/g, '').replace(/<span class="post-kicker">[^<]*<\/span>/g, '');
    if (rest.includes(LABEL)) fails.push(`${rel}: repeated fictional-example label outside the one allowed place`);
    if (/class="finding-card"/.test(body) && count(text(body), HOME_LABEL) !== 1) fails.push(`${rel}: illustrative finding must carry its one label`);
  }
  for (const m of html.matchAll(/<(button|a)\b[^>]*>([^<]*(?:Buy|Purchas|basket|Checkout)[^<]*)</gi)) {
    if (!/disabled/.test(m[0])) fails.push(`${rel}: live purchase control "${m[2].trim()}"`);
  }
}
console.log(`checked ${files.length} pages, ${links} local links`);
if (fails.length) { console.log(fails.map((x) => '  FAIL ' + x).join('\n')); process.exit(1); }
console.log('all checks passed');
