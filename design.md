# Design — CheckMyMac Pro (checkmymac-site)

Зафиксированная дизайн-система сайта. Каждый редизайн страницы читает этот файл
перед правкой кода. Не пересоздавать систему на страницу — расширять этот файл.

## Genre
editorial с технической (mono) интонацией — «протокол диагностики с сервисного стола».

## Macrostructure family
- Marketing (index.html + ru/index.html): **Stat-Led** — hero вокруг честной цифры (30+,
  тик до 30 + серый статичный «+»). Компоненты: N9 edge-aligned nav (+ mono-переключатель
  языка .lang) · F3 tabular spec sheet · masonry-витрина скриншотов .shots (columns: 2→1)
  · F4 step sequence · download-секция .dl с рамкой Free/Full .tiers · Ft4 dense colophon.
- Content (privacy / terms / refunds / 404): **Long Document**, typography-only, класс `.legal`.
- Языки: EN (/) и RU (/ru/), hreflang-связки на обеих; юр. страницы только EN.
- Скриншоты: img/web/ — WebP + PNG-fallback через `<picture>` (Safari на Catalina не умеет WebP).

## Theme — custom «тёплый уголь + янтарь»
Оси: dark paper / grotesk+mono display / warm accent (hue 82°).
Все значения — только через токены из [tokens.css](tokens.css). Инлайн-цвета запрещены.

- `--color-paper`   oklch(21% 0.012 75) — тёплый уголь
- `--color-paper-2` oklch(18.5% 0.011 75) — глубже (полосы, футер, бланк)
- `--color-ink`     oklch(93% 0.02 85)
- `--color-ink-2`   oklch(76% 0.025 82)
- `--color-ink-3`   oklch(58% 0.02 80)
- `--color-rule`    oklch(32% 0.015 78)
- `--color-accent`  oklch(82% 0.155 82) — янтарь бренда (совпадает с приложением)
- `--color-good / warn / bad` — вердикты диагностики (зелёный / янтарь / красный)
- `--color-focus`   = accent

## Typography (2 + 1)
- Display: **Space Grotesk** 500/700 — заголовки, кнопки, вопросы FAQ. Всегда roman.
- Body: системный sans (-apple-system, Segoe UI…).
- Mono: **IBM Plex Mono** 400/500/600 — протокольные подписи, цифры, вердикты,
  hero-цифра «29», колофон. `tabular-nums` на любых колонках чисел.
- Грузим с Google Fonts, `display=swap`, preconnect в `<head>`.

## Spacing
4pt-шкала в tokens.css (`--space-3xs … --space-3xl`). Только именованные токены.
Секции дышат по-разному: features 3xl · how 2xl · pricing 3xl/2xl · faq 2xl/3xl.

## Motion
- Easing: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1). Никогда браузерный `ease`.
- Ровно два entrance-примитива: number-tick hero-цифры (0→29, 0.6s, @property)
  и каскад строк бланка отчёта (row-in + led-on). Больше ничего не въезжает по скроллу.
- Hover: сдвиг цвета/бордера или translateY(-1px) — один сигнал на элемент.
- Reduced-motion: всё статично, цифра сразу 29, LED сразу в финальном цвете.
- Focus-кольцо появляется мгновенно, 2px accent, offset 3px.

## CTA voice
- Primary: заливка янтарём, Space Grotesk 600, прямые углы, `translateY(-1px)` на hover.
- Secondary: mono-ссылка с нижним подчёркиванием 1px («Get notified →»).
- Nav CTA: mono-чип с 1px рамкой, uppercase.
- Пока продажи закрыты — честные пунктирные «Coming soon», никаких фейковых кнопок Buy.

## Запрещено (анти-паттерны, уже выпиленные)
- Фейковый хром окон (traffic-light точки) — бланк отчёта рисуется как документ, не как окно.
- Eyebrow-ярлыки над секциями. Заголовки держатся сами.
- Выдуманные метрики: на сайте только реальные цифры (30+/31 проверка, 72 модели, $19/$39,
  19 бесплатных проверок). make-appcast.sh сам обновляет версию/имя DMG (span.dl-ver).
- Упоминания Yoda Service и ссылки на yoda-service.com ЗАПРЕЩЕНЫ (решение Юры 2026-08-04,
  память no-yoda-branding-public). Формула: «built inside a large Apple repair service,
  published by an independent developer». Контакт: yukkaperehenen@gmail.com.
- Градиентные заголовки, italic в заголовках, карточные сетки 3×N с иконками.

## Что страницы обязаны разделять
- Wordmark с янтарным LED-квадратом; палитру и шрифты; голос CTA; токены целиком.

## Что страницам можно
- Marketing: Tier-A CSS-энрихмент (бланк отчёта). Content: только типографика.

## Exports
### tokens.css
Живёт в корне: [tokens.css](tokens.css) — импортируется из `css/style.css`,
юридические страницы получают его через `legal.css → css/style.css`.
Другие форматы (Tailwind @theme, DTCG, shadcn) — по запросу, проект vanilla HTML/CSS.
