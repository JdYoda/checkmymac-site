#!/bin/bash
# Превью для сетки скриншотов: img/shots/*.png -> img/web/<имя>-350.webp и -700.webp
#
# Зачем два маленьких размера. В сетке карточка занимает ~336 CSS-пикселей.
# Если отдать браузеру файл 1400 px, он ужимает его вчетверо на лету и делает
# это грубо — на мониторе без Retina текст интерфейса рассыпается на квадратные
# ступеньки (Юра увидел это на Windows 2026-08-20). Здесь ужатие делает Lanczos
# плюс лёгкая резкость, и браузеру остаётся показать картинку один в один.
#
# 350w берут обычные мониторы, 700w — Retina и планшет с одной колонкой.
# Старые файлы img/web/<имя>.webp остаются в srcset последней ступенью.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v cwebp >/dev/null || { echo "Нужен cwebp: brew install webp"; exit 1; }

# Исходники (img/shots) в репозиторий сайта не входят — они лежат только
# у Юры локально. На чужой машине скрипт честно скажет, чего не хватает.
NAMES=$(grep -oh 'img/web/[a-z-]*-350\.webp' index.html ru/index.html | sed 's|img/web/||; s|-350\.webp||' | sort -u)

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

for n in $NAMES; do
  SRC="img/shots/$n.png"
  [ -f "$SRC" ] || { echo "нет исходника $SRC — пропускаю"; continue; }
  for W in 350 700; do
    python3 - "$SRC" "$TMP/$n-$W.png" "$W" <<'PY'
import sys
from PIL import Image, ImageFilter

src, dst, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert("RGB")
height = round(im.height * width / im.width)
im = im.resize((width, height), Image.LANCZOS)
# После сильного уменьшения картинка всегда выходит мягче исходника: мелкие
# детали усредняются. Возвращаем немного контраста на границах — умеренно,
# иначе по краям кнопок появятся светлые ореолы.
im = im.filter(ImageFilter.UnsharpMask(radius=0.7, percent=55, threshold=2))
im.save(dst)
PY
    cwebp -quiet -q 84 "$TMP/$n-$W.png" -o "img/web/$n-$W.webp"
  done
  printf "%-16s 350w %4s КБ · 700w %4s КБ\n" "$n" \
    "$(( $(stat -f%z "img/web/$n-350.webp") / 1024 ))" \
    "$(( $(stat -f%z "img/web/$n-700.webp") / 1024 ))"
done
