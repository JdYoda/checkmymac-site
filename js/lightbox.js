// Скриншоты в сетке открываются в полный рост по клику.
// Превью живёт в 334 px, и на мониторе без Retina мелкий текст интерфейса
// в нём не читается совсем — здесь показываем исходник 2256–2940 px.
(function () {
  var grid = document.querySelector('.shots-grid');
  if (!grid) return;
  var figures = [].slice.call(grid.querySelectorAll('figure'));
  if (!figures.length) return;

  var ru = (document.documentElement.lang || '').indexOf('ru') === 0;
  var T = ru
    ? { close: 'Закрыть', prev: 'Предыдущий скриншот', next: 'Следующий скриншот', open: 'Открыть скриншот крупно' }
    : { close: 'Close', prev: 'Previous screenshot', next: 'Next screenshot', open: 'Open screenshot larger' };

  // Полная версия ищется по имени превью: img/web/als-700.webp -> img/full/als.webp.
  // Хвост с размером обязателен к отбрасыванию: в img/full лежат файлы без него.
  // Так новый скриншот на странице подхватывается сам, без правки скрипта;
  // если полной версии нет, onerror ниже вернёт превью.
  function fullSrc(img) {
    return img.src.replace('/img/web/', '/img/full/').replace(/(-\d+)?\.(png|jpg|webp)$/, '.webp');
  }

  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML =
    '<div class="lb-bar"><span class="lb-count"></span>' +
    '<button type="button" class="lb-btn lb-close" aria-label="' + T.close + '">&times;</button></div>' +
    '<button type="button" class="lb-btn lb-prev" aria-label="' + T.prev + '">&lsaquo;</button>' +
    '<button type="button" class="lb-btn lb-next" aria-label="' + T.next + '">&rsaquo;</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(lb);

  var lbImg = lb.querySelector('img');
  var lbCap = lb.querySelector('figcaption');
  var lbCount = lb.querySelector('.lb-count');
  var idx = -1, opener = null;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function show(i) {
    idx = (i + figures.length) % figures.length;
    var src = figures[idx].querySelector('img');
    var cap = figures[idx].querySelector('figcaption');
    lbImg.src = fullSrc(src);
    lbImg.alt = src.alt || '';
    lbCap.textContent = cap ? cap.textContent : '';
    lbCount.textContent = pad(idx + 1) + ' / ' + pad(figures.length);
  }

  // Полной версии может не оказаться — показываем превью, а не битую картинку.
  lbImg.addEventListener('error', function () {
    var src = figures[idx] && figures[idx].querySelector('img');
    if (src && lbImg.src !== src.src) lbImg.src = src.src;
  });

  function open(i) {
    opener = figures[i];
    show(i);
    // Полоса прокрутки на Windows занимает место: убрать её без компенсации —
    // значит дёрнуть всю страницу вбок в момент открытия.
    var gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
    document.body.style.overflow = 'hidden';
    lb.classList.add('open');
    // Пока браузер не пересчитал стили, оверлей ещё visibility: hidden, и фокус
    // на невидимую кнопку не встаёт — Tab уводил бы на страницу под лайтбоксом.
    // Принудительный reflow дешевле таймера и не мигает.
    void lb.offsetWidth;
    lb.querySelector('.lb-close').focus();
  }

  function close() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (opener) opener.focus();
    opener = null;
    idx = -1;
  }

  figures.forEach(function (fig, i) {
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', T.open);
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); open(i); }
    });
  });

  grid.addEventListener('click', function (e) {
    var fig = e.target.closest ? e.target.closest('figure') : null;
    if (!fig) return;
    var i = figures.indexOf(fig);
    if (i >= 0) open(i);
  });

  lb.addEventListener('click', function (e) {
    if (e.target === lb) { close(); return; }                 // клик мимо картинки
    if (e.target.closest('.lb-close')) close();
    else if (e.target.closest('.lb-prev')) show(idx - 1);
    else if (e.target.closest('.lb-next')) show(idx + 1);
  });

  document.addEventListener('keydown', function (e) {
    if (idx < 0) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
})();
