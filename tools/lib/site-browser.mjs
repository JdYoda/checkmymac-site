// Общая обвязка для тестов сайта: headless Chrome, которому локальные файлы
// репозитория отдаются под адресом https://checkmymac.app. Все запросы
// перехватываются; что делать с чужими адресами, решает политика теста.
// Нужны Google Chrome и Node 22+.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITE = 'https://checkmymac.app';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(check, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (check()) return true;
    await sleep(50);
  }
  return check();
}

function launchChrome(profileDir, blockedHosts) {
  const rules = ['checkmymac.app', ...blockedHosts].map((h) => `MAP ${h} ~NOTFOUND`).join(', ');
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    `--host-resolver-rules=${rules}`,
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

// policy(url) для адресов вне сайта: 'ok' — ответить пустым 200, 'pass' —
// пропустить в сеть, всё остальное — оборвать запрос. blockedHosts
// дополнительно закрыты на уровне DNS, чтобы до них ничего не дошло.
export async function openSite({ policy = () => 'block', blockedHosts = [], width = 1280, height = 900 } = {}) {
  if (!existsSync(CHROME)) throw new Error(`не найден Chrome: ${CHROME}`);
  const profileDir = mkdtempSync(path.join(tmpdir(), 'cmm-site-test-'));
  const { chrome, endpoint } = launchChrome(profileDir, blockedHosts);
  let cdp;

  const close = async () => {
    if (cdp) cdp.close();
    chrome.kill('SIGKILL');
    await sleep(300);
    rmSync(profileDir, { recursive: true, force: true });
  };

  try {
    cdp = await connect(await endpoint);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (method, params) => cdp.send(method, params, sessionId);

    const seen = [];
    let loaded = false;
    const note = (url) => { if (!url.startsWith('data:') && !url.startsWith('about:')) seen.push(url); };

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
      const verdict = policy(url);
      if (verdict === 'ok') return reply('Fetch.fulfillRequest', { responseCode: 200 });
      if (verdict === 'pass') return reply('Fetch.continueRequest', {});
      return reply('Fetch.failRequest', { errorReason: 'Aborted' });
    });

    await send('Page.enable');
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });

    return {
      seen,
      close,
      async navigate(pagePath, timeoutMs = 30000) {
        seen.length = 0;
        loaded = false;
        await send('Page.navigate', { url: SITE + pagePath });
        return waitFor(() => loaded, timeoutMs);
      },
      async evaluate(expression) {
        const { result, exceptionDetails } = await send('Runtime.evaluate', {
          expression, returnByValue: true, awaitPromise: true,
        });
        if (exceptionDetails) throw new Error(`ошибка в странице: ${exceptionDetails.text}`);
        return result.value;
      },
    };
  } catch (err) {
    await close();
    throw err;
  }
}
