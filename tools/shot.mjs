// Screenshot a page with headless Chrome over CDP (no packages needed).
// Usage:
//   node tools/shot.mjs <url> <outPrefix> [--w 1440] [--h 900] [--mobile] [--shots 6] [--full] [--wait 2500]
// --shots N  : scroll the page and capture N viewport-sized frames (good for sites with reveal animations)
// --full     : one full-page capture (good for our own pages)
// Prints a JSON summary (files written, page height, console errors).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const url = args[0], out = args[1];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes(k);
const MOBILE = has('--mobile');
const W = +opt('--w', MOBILE ? 390 : 1440), H = +opt('--h', MOBILE ? 844 : 900);
const SHOTS = +opt('--shots', 0), FULL = has('--full'), WAIT = +opt('--wait', 2500);
const SCALE = +opt('--scale', 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tgl-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--remote-debugging-port=0',
    '--autoplay-policy=no-user-gesture-required',
    `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) await sleep(100);
  if (!fs.existsSync(portFile)) throw new Error('Chrome did not start');
  await sleep(150);
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.bad(new Error(`${p.method}: ${m.error.message}`)) : p.ok(m.result);
    } else for (const l of listeners) l(m);
  };
  const send = (method, params = {}, sessionId) => new Promise((ok, bad) => {
    const i = ++id; pending.set(i, { ok, bad, method });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });
  const close = async () => {
    try { await send('Browser.close'); } catch {}
    try { ws.close(); } catch {}
    for (let i = 0; i < 50 && proc.exitCode === null; i++) await sleep(100);
    if (proc.exitCode === null) proc.kill();
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 300 }); } catch {}
  };
  return { send, listeners, close };
}

const b = await launch();
const summary = { url, files: [], errors: [] };
try {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => b.send(m, p, sessionId);
  b.listeners.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') summary.errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') summary.errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') summary.errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  await s('Page.enable'); await s('Runtime.enable'); await s('Log.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: MOBILE });
  if (MOBILE) await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (MOBILE) await s('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const loaded = new Promise((ok) => { b.listeners.push((m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') ok(); }); });
  await s('Page.navigate', { url });
  await Promise.race([loaded, sleep(20000)]);
  await sleep(WAIT);
  const ev = async (expression) => (await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
  if (has('--strip')) {
    // remove pop-ups and cookie banners that cover the page (reference captures only)
    const STRIP = `(() => { const vw = innerWidth, vh = innerHeight; let n = 0;
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el); if (cs.position !== 'fixed' && !el.matches('[role=dialog],dialog,[aria-modal=true]')) continue;
        const r = el.getBoundingClientRect(); const area = (r.width * r.height) / (vw * vh);
        const txt = (el.textContent || '').toLowerCase();
        if (area > 0.3 || el.matches('[role=dialog],dialog,[aria-modal=true]') || /cookie|privacy choices|consent/.test(txt) && area > 0.03) { el.remove(); n++; }
      }
      for (const e of [document.documentElement, document.body]) { e.style.setProperty('overflow', 'auto', 'important'); e.style.setProperty('position', 'static', 'important'); }
      return n; })()`;
    summary.stripped = await ev(STRIP);
    await sleep(400);
    summary.stripped += await ev(STRIP);
  }
  if (opt('--eval')) { summary.eval = await ev(opt('--eval')); await sleep(900); }
  const height = await ev('Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)');
  summary.height = height;
  const cap = async (file, extra = {}) => {
    const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 72, ...extra });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64')); summary.files.push(file);
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (FULL) {
    // walk the page first so lazy content and scroll reveals have fired
    for (let y = 0; y < height; y += Math.round(H * 0.7)) { await ev(`window.scrollTo(0, ${y})`); await sleep(160); }
    await ev('window.scrollTo(0, 0)'); await sleep(600);
    const h2 = await ev('document.documentElement.scrollHeight');
    await s('Emulation.setDeviceMetricsOverride', { width: W, height: Math.min(h2, 16000), deviceScaleFactor: SCALE, mobile: MOBILE });
    await sleep(900);
    await cap(`${out}-full.jpg`);
  }
  if (SHOTS) {
    const step = Math.max(H * 0.95, (height - H) / Math.max(1, SHOTS - 1));
    for (let i = 0; i < SHOTS; i++) {
      const y = Math.round(Math.min(i * step, Math.max(0, height - H)));
      await ev(`window.scrollTo(0, ${y})`); await sleep(1100);
      await cap(`${out}-${String(i + 1).padStart(2, '0')}.jpg`);
      if (y >= height - H) break;
    }
  }
  if (opt('--pdf')) {
    // print with the page's own @page size; --pdf-scale shrinks content so the desktop layout fits the paper
    for (let y = 0; y < height; y += Math.round(H * 0.7)) { await ev(`window.scrollTo(0, ${y})`); await sleep(60); }
    await ev('window.scrollTo(0, 0)'); await sleep(500);
    const r = await s('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, scale: +opt('--pdf-scale', 1) });
    fs.writeFileSync(opt('--pdf'), Buffer.from(r.data, 'base64')); summary.files.push(opt('--pdf'));
  } else if (!FULL && !SHOTS) await cap(`${out}.jpg`);
} catch (e) { summary.fatal = String(e); }
await b.close();
console.log(JSON.stringify(summary, null, 1));
