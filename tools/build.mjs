// Copies the shared head, header and footer (partials/) into every page, between markers:
//   <!-- @head --> ... <!-- /@head -->   <!-- @header --> ... <!-- /@header -->   <!-- @footer --> ... <!-- /@footer -->
// {{root}} becomes the relative path back to the site root, so pages work on any host or sub-folder.
// The nav link whose data-nav matches <body data-page="..."> gets aria-current="page".
// Run: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['partials', 'tools', 'node_modules', '.git', 'assets']);
const partial = (n) => fs.readFileSync(path.join(ROOT, 'partials', n + '.html'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
// every file in partials/ can be used as <!-- @name --><!-- /@name --> (e.g. the sample documents)
const parts = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'partials')).filter((f) => f.endsWith('.html'))
  .map((f) => [f.slice(0, -5), partial(f.slice(0, -5))]));

function pages(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...pages(path.join(dir, e.name))); }
    else if (e.name.endsWith('.html')) out.push(path.join(dir, e.name));
  }
  return out;
}

let changed = 0;
for (const file of pages(ROOT)) {
  const rel = path.relative(ROOT, path.dirname(file));
  const depth = rel ? rel.split(path.sep).length : 0;
  const root = depth ? '../'.repeat(depth) : './';
  let html = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const page = (html.match(/<body[^>]*data-page="([^"]+)"/) || [])[1] || '';
  const noSticky = /<body[^>]*data-no-sticky/.test(html);
  const before = html;
  for (const [name, src] of Object.entries(parts)) {
    let block = src.replaceAll('{{root}}', root);
    if (name === 'header' && page) block = block.replaceAll(`data-nav="${page}"`, `data-nav="${page}" aria-current="page"`);
    if (name === 'footer' && noSticky) block = block.replace(/\n<a class="btn sticky-cta"[\s\S]*?<\/a>/, '');
    const re = new RegExp(`(<!-- @${name} -->)[\\s\\S]*?(<!-- /@${name} -->)`);
    if (re.test(html)) html = html.replace(re, `$1\n${block}\n$2`);
  }
  if (html !== before) { fs.writeFileSync(file, html); changed++; }
}
console.log(`build: ${changed} page(s) updated`);
