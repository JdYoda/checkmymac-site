# План реализации: редизайн лендинга «Прибор и бумага»

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полный редизайн checkmymac.yoda-service.com в характере «Прибор и бумага» с живым 3D-героем, обе локали.

**Architecture:** Статичный HTML+CSS+JS на GitHub Pages. Тёмная шапка-«прибор» с 3D-героем (three.js, внешняя Draco-модель, постер-фоллбэк), перфорированный отрыв, бумажные секции, тёмный футер. Эталон характера — `docs/superpowers/specs/mock-b-reference.html`; движок героя — из `hero-proto/v3-template.html` (его README обязателен к прочтению).

**Tech Stack:** three.js 0.161.0 (importmap, jsdelivr CDN), Draco-декодер с того же CDN, gltf-transform (однократно через npx) для сжатия модели, Google Fonts (Space Grotesk + JetBrains Mono).

## Global Constraints

- Спека: `docs/superpowers/specs/2026-08-15-redesign-pribor-i-bumaga-design.md` — все её «не ломать» действуют в каждой задаче.
- DMG-ссылка строго вида `https://github.com/JdYoda/checkmymac-site/releases/latest/download/CheckMyMacPro-1.5.21.dmg` и версия строго внутри `<span class="dl-ver">v1.5.21 · 9 MB DMG</span>` — эти два фрагмента правит sed в `~/Projects/checkmymac/Scripts/make-appcast.sh`, менять их разметку нельзя.
- Якоря `#pricing`, `#download`, `#features`, `#faq` сохраняются.
- SEO-мета (title/description/canonical/hreflang/OG/twitter) переносится из текущих index.html дословно.
- Go-live-комментарии в pricing (`<!-- Go-live (этап F): ... -->`) переносятся дословно.
- Контент (тексты) переносится из текущих `index.html` и `ru/index.html` без переписывания.
- Рабочая директория всех задач: `~/Projects/checkmymac/site` (отдельный git-репозиторий). Коммиты на русском. Push — только по команде Юры.
- Просмотр промежуточных результатов: no-cache сервер на 8935 (`site/tmp/proto/nocache_server.py` — при необходимости поправить корень на site/), Юре — Cmd+Shift+R.

---

### Task 1: Ассеты героя (модель Draco, постеры, HDR, скрин экрана)

**Files:**
- Create: `site/assets/hero/mac.glb`, `site/assets/hero/studio.hdr`, `site/assets/hero/app-screen.png`, `site/assets/hero/poster.webp`, `site/assets/hero/poster-mobile.webp`

**Interfaces:**
- Produces: URL-ассеты для Task 2: `assets/hero/mac.glb` (Draco), `assets/hero/studio.hdr`, `assets/hero/app-screen.png`, постеры для Task 4.

- [ ] **Step 1: Сжать модель в Draco-glb** (⚠️ требует npx — скачивание gltf-transform, разрешение Юры получено вместе с одобрением плана)

```bash
cd ~/Projects/checkmymac/site/hero-proto/model
npx --yes @gltf-transform/cli optimize scene-embedded.gltf ../../assets/hero/mac.glb --compress draco --texture-compress webp
ls -la ../../assets/hero/mac.glb
```
Ожидание: файл 2–5 MB. Если optimize сломает материалы — запасной вариант: `npx --yes @gltf-transform/cli draco scene-embedded.gltf ../../assets/hero/mac.glb` (только геометрия, без пережатия текстур).

- [ ] **Step 2: Скопировать статичные ассеты**

```bash
cd ~/Projects/checkmymac/site
cp hero-proto/model/studio.hdr assets/hero/
cp hero-proto/model/app-screen.png assets/hero/
```

- [ ] **Step 3: Снять постеры из прототипа** (Playwright, v32.html на 8935): постер №1 — собранный мак без текстов и бирок (десктоп, до загрузки модели); постер №2 — разобранный с бирками (мобильный герой). Скрыть тексты прототипа (`h1, h2, p, header, .btn, a, .hint, #dbg` вне .callout/svg), для №1 снять покой, для №2 удержать раскрытие потоком pointermove по канвасу. Кадры → `cwebp -q 82` (есть в системе? если нет — PIL `save('poster.webp', 'WEBP', quality=82)`).

```bash
python3 - <<'EOF'
from PIL import Image
Image.open('/tmp/poster-raw.png').save('assets/hero/poster.webp', 'WEBP', quality=82)
Image.open('/tmp/poster-mobile-raw.png').save('assets/hero/poster-mobile.webp', 'WEBP', quality=82)
EOF
```

- [ ] **Step 4: Проверка Draco-модели рендером** — временная страница `tmp/proto/glb-check.html`: three.js importmap + GLTFLoader + DRACOLoader (`https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/libs/draco/`), загрузить `../../assets/hero/mac.glb`, отрендерить кадр, Playwright-скриншот. Ожидание: мак выглядит как в прототипе (материалы целы), консоль без ошибок.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/checkmymac/site
git add assets/hero
git commit -m "Ассеты 3D-героя: Draco-модель, HDR, скрин экрана, постеры"
```

---

### Task 2: hero.js — очищенный движок героя на внешних ассетах

**Files:**
- Create: `site/js/hero.js`
- Read: `site/hero-proto/v3-template.html` (донор кода), `site/hero-proto/README.md`

**Interfaces:**
- Produces: ES-модуль, экспорт `initHero({ container, assets })`; сам решает — 3D или ничего (постер лежит в HTML). Условие 3D: `matchMedia('(hover:hover) and (pointer:fine)').matches && innerWidth >= 1000 && !prefersReduced3D` (reduced-motion → постер). Контейнер: `<div id="hero3d">` внутри секции героя; бирки/линии рисуются в него же. По готовности модели — `container.classList.add('live')` (CSS прячет постер fade-ом).
- Consumes: ассеты Task 1.

- [ ] **Step 1: Выдрать JS прототипа в модуль.** Скопировать `<script type="module">` из v3-template.html в `js/hero.js`, обернуть в `export function initHero(opts)`. Заменить вшитые данные на загрузки: `new GLTFLoader().setDRACOLoader(draco).load(assets.model, …)`; `new RGBELoader().load(assets.hdr, …)`; экранная текстура — `new THREE.TextureLoader().load(assets.screen, …)` (та же подмена emissiveMap Object_107 с копией UV-трансформа). Канвас и DOM-элементы (бирки, svg выносок) создавать внутри `container`, а не искать по id в документе.

- [ ] **Step 2: Вычистить отладку.** Удалить: `#dbg`-блок и его обновление в frame, все `window.__spDbg/__scrDbg/__basinDbg/__wellDbg/__diag/__partsCount`, диагностические traverse-блоки. hint «PROTO V3.2» в модуле отсутствует (он в HTML прототипа — просто не переносится).

- [ ] **Step 3: Грепы-инварианты чистки**

```bash
grep -c "window.__\|#dbg\|getElementById('dbg')" js/hero.js
```
Ожидание: 0 вхождений.

- [ ] **Step 4: Смоук на тестовой странице.** `tmp/proto/hero-check.html`: секция героя по разметке Task 4 (постер + `#hero3d`), importmap, `initHero({...})`. Playwright: дождаться `#hero3d.live`, проверить раскрытие потоком pointermove по силуэту (бирки видимы: `[...document.querySelectorAll('.callout')].some(c => +c.style.opacity > .9)`), сборку за краем, отсутствие ошибок консоли.

- [ ] **Step 5: Commit**

```bash
git add js/hero.js
git commit -m "Движок 3D-героя: внешние ассеты, без отладки, initHero()"
```

---

### Task 3: style.css — дизайн-система «Прибор и бумага»

**Files:**
- Create: `site/css/style.css` (заменяет старый целиком; старый сохранить как `css/style-old.css` до конца работ — юр-страницы Task 6 переводятся на новый, затем старый удалить с разрешения Юры)
- Read: `docs/superpowers/specs/mock-b-reference.html` (донор токенов и стилей секций)

**Interfaces:**
- Produces: классы для Task 4/5/6: `.wrap .nav .brand .nav-cta .device .hero .hero-copy .cta .hero-note .tear .sec-sub .spec .stamp .shots-grid .steps .step .plans .plan .price .plan-for .soon .tiers .tier .faq .foot .btn-primary .dl-meta .dl-ver` (имена связки с релизным скриптом — `.dl-ver`, `.btn-primary` — как на текущем сайте).
- Токены: копировать `:root` из mock-b-reference.html дословно (coal/paper/amber/good/warn/bad/rule-d/rule-l + шрифты).

- [ ] **Step 1: Перенести стили эталона** в `css/style.css`: токены, тёмная зона, отрыв `.tear`, бумажные секции, карточки, планы, faq, футер — из mock-b-reference.html; добавить недостающее по текущему сайту: `.tiers/.tier` (секция download), `.dl-meta/.dl-ver`, `.lang` (переключатель RU/EN), стили постера героя: `.hero-poster { position:absolute; inset:0; object-fit:cover; opacity:1; transition:opacity .6s }` и `#hero3d.live ~ .hero-poster { opacity:0; pointer-events:none }`.

- [ ] **Step 2: Responsive.** Брейки: ≤1000px герой = постер-картинка фикс. высоты 60vh; ≤768px таблица `.spec` — каждая строка блоком (`display:block` td, метка сверху); сетки shots/steps/plans в одну колонку; отступы секций 48px. Правило корня: `html, body { overflow-x: clip }`.

- [ ] **Step 3: Проверка на эталоне.** Подменить в копии mock-b-reference стиль на внешний `css/style.css` (страница `tmp/proto/css-check.html`), Playwright-скрин 1280 и 375: вёрстка не разваливается, нет горизонтального скролла:

```js
document.documentElement.scrollWidth <= window.innerWidth
```
Ожидание: true на 320/375/768/1280.

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "Дизайн-система «Прибор и бумага»: токены, секции, responsive"
```

---

### Task 4: index.html (EN)

**Files:**
- Modify: `site/index.html` (полная замена разметки; старый сохранить в git-истории — отдельный файл не нужен)

**Interfaces:**
- Consumes: классы Task 3, `initHero` Task 2, ассеты Task 1.
- Produces: эталон структуры для Task 5 (ru) — та же разметка, другие тексты.

- [ ] **Step 1: Собрать страницу.** `<head>` — вся SEO-мета из текущего index.html дословно + новые шрифты + `css/style.css?v=20260815`. Тело: `.device` (nav + герой) → `.tear` → бумажные секции `#features`, shots, how, `#download` (кнопка `.btn-primary` с текущей DMG-ссылкой и `.dl-meta/.dl-ver` дословно), `#pricing` (планы + go-live-комментарии дословно), `#faq` (все 10 details) → `.foot`. Герой:

```html
<section class="hero" aria-label="MacBook teardown">
  <div id="hero3d"></div>
  <img class="hero-poster" src="assets/hero/poster.webp" srcset="assets/hero/poster-mobile.webp 800w, assets/hero/poster.webp 1400w" sizes="100vw" alt="MacBook Pro разобран на детали с вердиктами диагностики" width="1200" height="792">
  <div class="hero-copy">заголовок h1, sub, кнопка .btn-primary (прямая DMG-ссылка, как на текущем сайте), link-cta на #pricing, .hero-note — все тексты из текущего index.html дословно</div>
</section>
<script type="importmap">…three@0.161.0…</script>
<script type="module">
  import { initHero } from './js/hero.js';
  initHero({ container: document.getElementById('hero3d'),
    assets: { model: 'assets/hero/mac.glb', hdr: 'assets/hero/studio.hdr', screen: 'assets/hero/app-screen.png' } });
</script>
```

- [ ] **Step 2: Грепы-инварианты**

```bash
grep -c 'releases/latest/download/CheckMyMacPro-' index.html   # =2 (CTA героя + кнопка в #download, обе прямые DMG — как на текущем сайте)
grep -c 'class="dl-ver"' index.html                            # =1
grep -c 'id="pricing"' index.html                              # =1
grep -c 'Go-live' index.html                                   # =2
grep -c 'hreflang' index.html                                  # =3
```

- [ ] **Step 3: Прогон релизного sed-а на копии** (dry-run, файлы не портим):

```bash
tmpd=$(mktemp -d) && cp index.html "$tmpd/" && sed -i '' \
  -e "s|CheckMyMacPro-[0-9.]*\.dmg|CheckMyMacPro-9.9.9.dmg|g" \
  -e "s|<span class=\"dl-ver\">[^<]*</span>|<span class=\"dl-ver\">v9.9.9 · 10 MB DMG</span>|g" "$tmpd/index.html" \
  && grep -c "9.9.9" "$tmpd/index.html"
```
Ожидание: ≥2 замены (ссылка + dl-ver) — формат совместим со скриптом.

- [ ] **Step 4: Живой смоук через 8935** (скопировать index+css+js+assets в зону сервера или поднять второй no-cache сервер с корнем site/): Playwright на 1280 — постер виден сразу, `#hero3d.live` появляется, раскрытие работает, все секции на месте; на 375 — только постер, glb не запрашивается (`performance.getEntriesByName` без mac.glb); скролл-ширина в норме.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Новый лендинг EN: прибор и бумага, живой 3D-герой"
```

---

### Task 5: ru/index.html

**Files:**
- Modify: `site/ru/index.html` (полная замена по образцу Task 4)

**Interfaces:**
- Consumes: структура Task 4; тексты — из текущего `ru/index.html` дословно; пути ассетов/скриптов с префиксом `../` (`../css/style.css`, `../js/hero.js`, `../assets/hero/...`).

- [ ] **Step 1: Собрать русскую страницу**: разметка Task 4, все тексты из текущей ru-версии, SEO-мета из текущей ru-версии дословно, `lang="ru"`, переключатель EN → `/`.

- [ ] **Step 2: Грепы-инварианты** — те же, что Task 4 Step 2, плюс:

```bash
grep -c 'lang="ru"' ru/index.html   # >=1
grep -c '\.\./js/hero\.js' ru/index.html  # =1
```

- [ ] **Step 3: Прогон sed-а на копии** — команда Task 4 Step 3 для `ru/index.html`. Ожидание: ≥2 замены.

- [ ] **Step 4: Живой смоук** — Playwright: русская страница, герой живой, секции на месте, нет горизонтального скролла 375/1280.

- [ ] **Step 5: Commit**

```bash
git add ru/index.html
git commit -m "Новый лендинг RU"
```

---

### Task 6: Юридические страницы и уборка

**Files:**
- Modify: `site/privacy.html`, `site/terms.html`, `site/refunds.html` (замена подключаемого CSS + обёртка `.device`-шапкой и `.foot`-футером; контент не трогать)
- Delete: `site/css/style-old.css` (только после визуальной проверки всех страниц; удаление файла — с разрешения Юры)

- [ ] **Step 1: Перевести юр-страницы на новый стиль**: шапка-мини (тёмная полоса с лого и ссылкой на главную), контент на «бумаге», футер тёмный. Тексты дословно прежние.

- [ ] **Step 2: Смоук** — Playwright-скрины трёх страниц (1280/375), ссылки с главной работают.

- [ ] **Step 3: Commit**

```bash
git add privacy.html terms.html refunds.html
git commit -m "Юр-страницы в стиле «Прибор и бумага»"
```

---

### Task 7: Финальная приёмка и отчёт Юре

- [ ] **Step 1: Полный прогон приёмки по спеке**: обе локали (постер-скорость, 3D-десктоп, постер-мобайл), grep-инварианты обеих страниц, sed-совместимость, юр-страницы, консоль без ошибок, скролл 320/375/768/1280.

- [ ] **Step 2: Скриншоты Юре** (обе локали полные + мобильный вид) + просьба прокликать вживую через 8935 (Cmd+Shift+R). Ничего не пушить.

- [ ] **Step 3: После «ок» Юры** — спросить разрешение удалить `css/style-old.css`, финальный коммит, обновить PROGRESS.md (основной репо) и память; предложить публикацию (git push) — только по явной команде.
