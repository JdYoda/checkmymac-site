#!/bin/bash
# Полноразмерные версии скриншотов для лайтбокса: img/shots/*.png -> img/full/*.webp
# Имена сохраняются: превью img/web/als.png <-> полная img/full/als.webp,
# по этому соответствию lightbox.js и находит картинку.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v cwebp >/dev/null || { echo "Нужен cwebp: brew install webp"; exit 1; }
mkdir -p img/full

# Собираем только то, что реально стоит на страницах — лишние файлы в репозиторий
# не тащим. Список берём из разметки, чтобы он не разъезжался с сайтом.
NAMES=$(grep -oh 'img/web/[a-z-]*\.png' index.html ru/index.html | sed 's|img/web/||; s|\.png||' | sort -u)

for n in $NAMES; do
  SRC="img/shots/$n.png"
  [ -f "$SRC" ] || { echo "нет исходника $SRC — пропускаю"; continue; }
  cwebp -quiet -q 88 "$SRC" -o "img/full/$n.webp"
  printf "%-16s %6s КБ\n" "$n" "$(( $(stat -f%z "img/full/$n.webp") / 1024 ))"
done
