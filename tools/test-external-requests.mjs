#!/usr/bin/env node
// Проверка внешних запросов и шрифтов: node tools/test-external-requests.mjs
//
// Открывает каждую страницу сайта из локальных файлов под адресом
// https://checkmymac.app и смотрит, к каким чужим серверам она обращается.
// Разрешённый список совпадает с тем, что обещает privacy.html, плюс CDN с
// three.js для 3D-героя. Чужие запросы обрываются, в сеть ничего не уходит.
// Заодно проверяется, что заголовок набран своим шрифтом, а не запасным.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, openSite, sleep } from './lib/site-browser.mjs';

const MAIN = ['gc.zgo.at', 'checkmymac.goatcounter.com', 'cdn.jsdelivr.net'];

// Под каким именем каждый чужой сервер назван в privacy.html
const DISCLOSED_AS = {
  'gc.zgo.at': 'GoatCounter',
  'checkmymac.goatcounter.com': 'GoatCounter',
  'cdn.jsdelivr.net': 'jsDelivr',
};

const PAGES = [
  { page: '/', allowed: MAIN, cyrillic: false },
  { page: '/ru/', allowed: MAIN, cyrillic: true },
  { page: '/privacy.html', allowed: [], cyrillic: false },
  { page: '/terms.html', allowed: [], cyrillic: false },
  { page: '/refunds.html', allowed: [], cyrillic: false },
  { page: '/setup.html', allowed: [], cyrillic: false },
  { page: '/ru/setup.html', allowed: [], cyrillic: true },
  { page: '/404.html', allowed: [], cyrillic: false },
];

const FONT_PROBE = `(async () => {
  await document.fonts.ready;
  const clean = (s) => s.replace(/["']/g, '').trim();
  const h = document.querySelector('h1');
  const loaded = [...document.fonts].filter((f) => f.status === 'loaded');
  return {
    heading: h ? clean(getComputedStyle(h).fontFamily.split(',')[0]) : null,
    loaded: [...new Set(loaded.map((f) => clean(f.family)))],
    cyrillic: loaded.some((f) => clean(f.family) === 'Montserrat' && /U\\+0?400/i.test(f.unicodeRange)),
  };
})()`;

async function main() {
  const failures = [];
  const site = await openSite();

  try {
    for (const { page, allowed, cyrillic } of PAGES) {
      if (!(await site.navigate(page))) {
        failures.push(`${page}: страница не загрузилась за 30 с`);
        continue;
      }
      await sleep(500);

      const hosts = [...new Set(site.seen.map((u) => new URL(u).hostname))].filter((h) => h !== 'checkmymac.app');
      const foreign = hosts.filter((h) => !allowed.includes(h));
      if (foreign.length) {
        failures.push(`${page}: обращается к чужим серверам: ${foreign.join(', ')}`);
      }

      const fonts = await site.evaluate(FONT_PROBE);
      if (fonts.heading !== 'Montserrat') {
        failures.push(`${page}: заголовок задан шрифтом ${fonts.heading}, ожидался Montserrat`);
      }
      if (!fonts.loaded.includes('Montserrat')) {
        failures.push(`${page}: файл шрифта Montserrat не загрузился (загружены: ${JSON.stringify(fonts.loaded)})`);
      }
      if (cyrillic && !fonts.cyrillic) {
        failures.push(`${page}: кириллическое начертание Montserrat не загрузилось, русский текст набран запасным шрифтом`);
      }
    }
  } finally {
    await site.close();
  }

  const privacy = readFileSync(path.join(ROOT, 'privacy.html'), 'utf8');
  for (const host of new Set(PAGES.flatMap((p) => p.allowed))) {
    const name = DISCLOSED_AS[host];
    if (!name) failures.push(`${host}: разрешён в тесте, но не указано, как он назван в privacy.html`);
    else if (!privacy.includes(name)) failures.push(`privacy.html не упоминает ${name}, хотя страницы обращаются к ${host}`);
  }

  if (failures.length) {
    console.log(`ПРОВАЛ: ${failures.length}`);
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  console.log(`OK: ${PAGES.length} страниц обращаются только к разрешённым серверам, заголовки набраны своим Montserrat`);
}

main().catch((err) => {
  console.error('ОШИБКА ТЕСТА: ' + err.message);
  process.exit(2);
});
