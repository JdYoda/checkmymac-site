#!/usr/bin/env node
// Проверка аналитики кнопок «Скачать»: node tools/test-download-analytics.mjs
//
// Открывает локальные главные страницы под адресом https://checkmymac.app и
// нажимает каждую кнопку скачивания. Запросы к GoatCounter перехватываются и
// до настоящего счётчика не доходят. Скрипт count.js грузится из сети
// по-настоящему, поэтому заодно проверяется его контрольная сумма.

import { openSite, sleep, waitFor } from './lib/site-browser.mjs';

const COUNT = 'https://checkmymac.goatcounter.com/count';

const CASES = [
  { page: '/', want: ['download-en-hero', 'download-en-section', 'download-en-price'] },
  { page: '/ru/', want: ['download-ru-hero', 'download-ru-section', 'download-ru-price'] },
];

async function main() {
  const failures = [];
  const site = await openSite({
    blockedHosts: ['checkmymac.goatcounter.com', 'github.com'],
    policy: (url) => {
      if (url.startsWith(COUNT)) return 'ok';
      if (new URL(url).hostname === 'gc.zgo.at') return 'pass';
      return 'block';
    },
  });

  try {
    const countEvents = () => site.seen
      .filter((u) => u.startsWith(COUNT + '?'))
      .map((u) => new URL(u).searchParams);
    const clickNames = () => [...new Set(countEvents().filter((q) => q.get('e') === 'true').map((q) => q.get('p')))];
    const dmgRequests = () => site.seen.filter((u) => u.endsWith('.dmg'));

    for (const { page, want } of CASES) {
      if (!(await site.navigate(page))) {
        failures.push(`${page}: страница не загрузилась за 30 с`);
        continue;
      }
      await sleep(300);

      const pageviews = countEvents().filter((q) => q.get('e') !== 'true').map((q) => q.get('p'));
      if (!pageviews.includes(page)) {
        failures.push(`${page}: просмотр страницы не отправлен на ${COUNT} (получено: ${JSON.stringify(pageviews)})`);
      }

      const buttons = await site.evaluate(`document.querySelectorAll('a[href$=".dmg"]').length`);
      if (buttons !== want.length) {
        failures.push(`${page}: кнопок скачивания ${buttons}, ожидалось ${want.length}`);
      }

      for (let i = 0; i < want.length; i++) {
        site.seen.length = 0;
        await site.evaluate(`void document.querySelectorAll('a[href$=".dmg"]')[${i}]?.click()`);
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
    await site.close();
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
