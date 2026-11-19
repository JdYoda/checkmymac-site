#!/usr/bin/env node
// Проверка аналитики кнопок «Скачать»: node tools/test-download-analytics.mjs
//
// Поднимает headless Chrome, отдаёт ему локальные файлы сайта под адресом
// https://checkmymac.app и нажимает каждую кнопку скачивания. Запросы к
// GoatCounter перехватываются и до настоящего счётчика не доходят.
// Нужны Google Chrome и Node 22+. Скрипт count.js грузится из сети по-настоящему.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SITE = 'https://checkmymac.app';
const COUNT = 'https://checkmymac.goatcounter.com/count';

const CASES = [
  { page: '/', want: ['download-en-hero', 'download-en-section', 'download-en-price'] },
  { page: '/ru/', want: ['download-ru-hero', 'download-ru-section', 'download-ru-price'] },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (check()) return true;
    await sleep(50);
  }
  return check();
}

function launchChrome(profileDir) {
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--host-resolver-rules=MAP checkmymac.app ~NOTFOUND, MAP checkmymac.goatcounter.com ~NOTFOUND, MAP github.com ~NOTFOUND',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const endpoint = new Promise((resolve, reject) => {
    let buf = '';
    chrome.stderr.on('data', (chunk) => {
      buf += chunk;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    chrome.on('exit', (code) => reject(new Error(`Chrome завершился с кодом ${code}`)));
    setTimeout(() => reject(new Error('Chrome не отдал адрес DevTools за 20 с')), 20000);
  });
  return { chrome, endpoint };
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('нет соединения с DevTools')), { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined) {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
      else p.resolve(msg.result);
      return;
    }
    for (const fn of listeners) fn(msg);
  });
  return {
    send(method, params = {}, sessionId) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      });
    },
    on(fn) { listeners.push(fn); },
    close() { ws.close(); },
  };
}

function localFile(url) {
  let rel = decodeURIComponent(new URL(url).pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return null;
  if (!existsSync(file) || !statSync(file).isFile()) return null;
  return file;
}

async function main() {
  if (!existsSync(CHROME)) throw new Error(`не найден Chrome: ${CHROME}`);
  const profileDir = mkdtempSync(path.join(tmpdir(), 'cmm-analytics-'));
  const { chrome, endpoint } = launchChrome(profileDir);
  const failures = [];
  let cdp;

  try {
    cdp = await connect(await endpoint);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => cdp.send(method, params, sessionId);

    const seen = [];
    let loaded = false;
    const note = (url) => {
      if (url.startsWith(COUNT + '?') || url.endsWith('.dmg')) seen.push(url);
    };

    cdp.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Page.loadEventFired') loaded = true;
      if (msg.method === 'Network.requestWillBeSent') note(msg.params.request.url);
      if (msg.method !== 'Fetch.requestPaused') return;

      const { requestId, request } = msg.params;
      const url = request.url;
      note(url);
      const reply = (method, params) => send(method, { requestId, ...params }).catch(() => {});

      if (url.startsWith(SITE + '/')) {
        const file = localFile(url);
        if (!file) return reply('Fetch.fulfillRequest', { responseCode: 404 });
        return reply('Fetch.fulfillRequest', {
          responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: TYPES[path.extname(file)] || 'application/octet-stream' }],
          body: readFileSync(file).toString('base64'),
        });
      }
      if (url.startsWith(COUNT)) return reply('Fetch.fulfillRequest', { responseCode: 200 });
      if (new URL(url).hostname === 'gc.zgo.at') return reply('Fetch.continueRequest', {});
      return reply('Fetch.failRequest', { errorReason: 'Aborted' });
    });

    await send('Page.enable');
    await send('Network.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });

    const countEvents = () => seen
      .filter((u) => u.startsWith(COUNT + '?'))
      .map((u) => new URL(u).searchParams);
    const clickNames = () => [...new Set(countEvents().filter((q) => q.get('e') === 'true').map((q) => q.get('p')))];
    const dmgRequests = () => seen.filter((u) => u.endsWith('.dmg'));

    for (const { page, want } of CASES) {
      seen.length = 0;
      loaded = false;
      await send('Page.navigate', { url: SITE + page });
      if (!(await waitFor(() => loaded, 30000))) {
        failures.push(`${page}: страница не загрузилась за 30 с`);
        continue;
      }
      await sleep(300);

      const pageviews = countEvents().filter((q) => q.get('e') !== 'true').map((q) => q.get('p'));
      if (!pageviews.includes(page)) {
        failures.push(`${page}: просмотр страницы не отправлен на ${COUNT} (получено: ${JSON.stringify(pageviews)})`);
      }

      const { result } = await send('Runtime.evaluate', {
        expression: `document.querySelectorAll('a[href$=".dmg"]').length`,
      });
      if (result.value !== want.length) {
        failures.push(`${page}: кнопок скачивания ${result.value}, ожидалось ${want.length}`);
      }

      for (let i = 0; i < want.length; i++) {
        seen.length = 0;
        await send('Runtime.evaluate', {
          expression: `document.querySelectorAll('a[href$=".dmg"]')[${i}]?.click()`,
        });
        await waitFor(() => clickNames().length > 0 && dmgRequests().length > 0, 3000);
        await sleep(200);

        const got = clickNames();
        if (got.length !== 1 || got[0] !== want[i]) {
          failures.push(`${page} кнопка №${i + 1}: ожидалось событие ${want[i]}, получено ${JSON.stringify(got)}`);
        }
        if (dmgRequests().length === 0) {
          failures.push(`${page} кнопка №${i + 1}: клик не начал скачивание .dmg`);
        }
      }
    }
  } finally {
    if (cdp) cdp.close();
    chrome.kill('SIGKILL');
    await sleep(300);
    rmSync(profileDir, { recursive: true, force: true });
  }

  if (failures.length) {
    console.log(`ПРОВАЛ: ${failures.length}`);
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  const total = CASES.reduce((n, c) => n + c.want.length, 0);
  console.log(`OK: ${total} кнопок на ${CASES.length} страницах отправляют свои события, скачивание .dmg не сломано`);
}

main().catch((err) => {
  console.error('ОШИБКА ТЕСТА: ' + err.message);
  process.exit(2);
});
