#!/usr/bin/env python3
# Сборка героя: вшивает модель, HDR, фото батареи и скриншот программы
# в шаблон v3-template.html. Результат — самодостаточный HTML без внешних файлов.
# Запуск: python3 build_v3.py  (или python3 build_v3.py другой-part_defs.json)
import base64, pathlib, sys, json

base = pathlib.Path(__file__).resolve().parent
tpl = (base / "v3-template.html").read_text()

gltf = (base / "model/scene-embedded.gltf").read_text()
assert "</script" not in gltf.lower()
hdr = "data:image/vnd.radiance;base64," + base64.b64encode((base / "model/studio.hdr").read_bytes()).decode()
screen = "data:image/png;base64," + base64.b64encode((base / "model/app-screen.png").read_bytes()).decode()
batts = ["data:image/png;base64," + base64.b64encode((base / f"model/battseg-{i}.png").read_bytes()).decode() for i in range(3)]

pd_path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else base / "part_defs.json"
part_defs = json.dumps(json.load(open(pd_path)))

out = tpl.replace("__GLTF_JSON__", gltf).replace("__HDR_URI__", hdr).replace("__SCREEN_URI__", screen)
out = out.replace("__BATT_SHAPES__", (base / "model/battshape.json").read_text())
out = out.replace("__BATT_URI_0__", batts[0]).replace("__BATT_URI_1__", batts[1]).replace("__BATT_URI_2__", batts[2])
out = out.replace("__PART_DEFS__", part_defs)
dst = base / "v3-macbook-m5.html"
dst.write_text(out)
print(f"OK {dst} — {dst.stat().st_size/1024/1024:.1f} MB")
