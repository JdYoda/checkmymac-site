import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BATT_SHAPES_DATA = [{"i": 0, "w": 95, "h": 104, "ox": 0, "pts": [[94, 0], [94, 8], [94, 16], [94, 24], [94, 32], [94, 40], [94, 48], [94, 56], [94, 64], [94, 72], [94, 80], [94, 88], [94, 96], [9, 102], [9, 94], [9, 86], [9, 78], [9, 70], [9, 62], [9, 54], [0, 50], [0, 42], [0, 34], [0, 26], [0, 18], [0, 10], [0, 2], [0, 0]]}, {"i": 1, "w": 166, "h": 104, "ox": 95, "pts": [[162, 22], [162, 30], [162, 38], [162, 46], [162, 54], [162, 62], [162, 70], [162, 78], [162, 86], [165, 94], [163, 102], [5, 102], [3, 100], [0, 98], [6, 92], [6, 84], [6, 76], [6, 68], [6, 60], [6, 52], [6, 44], [6, 36], [6, 28], [6, 22]]}, {"i": 2, "w": 98, "h": 104, "ox": 261, "pts": [[97, 0], [97, 8], [97, 16], [97, 24], [97, 32], [97, 40], [97, 48], [88, 52], [88, 60], [88, 68], [88, 76], [88, 84], [88, 92], [88, 100], [3, 102], [3, 94], [3, 86], [0, 80], [3, 74], [3, 66], [3, 58], [3, 50], [3, 42], [3, 34], [3, 26], [3, 18], [3, 10], [3, 2], [3, 0]]}];
const PART_DEFS_DATA = [
 {
  "key": "display",
  "suffixes": [
   "59",
   "60"
  ],
  "offset": [
   0,
   0.052,
   0.13
  ],
  "label": "DISPLAY",
  "verdict": "OK",
  "cls": "ok",
  "also": [
   "camera"
  ]
 },
 {
  "key": "camera",
  "suffixes": [
   "49"
  ],
  "offset": [
   0,
   0.056,
   0.19
  ],
  "label": "CAMERA",
  "verdict": "OK",
  "cls": "ok"
 },
 {
  "key": "keyboard",
  "suffixes": [
   "39"
  ],
  "offset": [
   0,
   0.05,
   0
  ],
  "label": "KEYBOARD",
  "verdict": "OK",
  "cls": "ok"
 },
 {
  "key": "touchid",
  "suffixes": [
   "34",
   "36"
  ],
  "offset": [
   0,
   0.06,
   0
  ],
  "label": "TOUCH ID",
  "verdict": "12 TOUCHES",
  "cls": "ok"
 },
 {
  "key": "trackpad",
  "suffixes": [
   "40"
  ],
  "offset": [
   0,
   0.05,
   0
  ],
  "label": "TRACKPAD",
  "verdict": "OK",
  "cls": "ok"
 },
 {
  "key": "vents",
  "suffixes": [
   "17"
  ],
  "offset": [
   0,
   0.04,
   -0.012
  ],
  "label": "VENTS",
  "verdict": "OK",
  "cls": "ok"
 },
 {
  "key": "battery",
  "suffixes": [
   "31"
  ],
  "offset": [
   0,
   -0.2,
   0
  ],
  "label": "BATTERY",
  "verdict": "1 181 CYCLES",
  "cls": "warn",
  "also": [
   "speaker"
  ]
 },
 {
  "key": "body",
  "suffixes": [
   "6",
   "32",
   "33",
   "42",
   "21"
  ],
  "offset": [
   0,
   0.006,
   0
  ],
  "label": "USB-C PORTS",
  "verdict": "OK",
  "cls": "ok"
 }
];

// Живой 3D-герой. Возвращает true, если 3D запущен; false — остаётся постер.
// container — пустой div (absolute, во всю секцию героя); assets — url-ы:
// { model, hdr, screen, battSegs: [url,url,url], draco }
export function initHero({ container, assets }) {
  // ?edit=1 — режим расстановки бирок: мак раскрыт, бирки и узлы линий
  // перетаскиваются, позиции копятся в localStorage, кнопка COPY LAYOUT
  // отдаёт готовую константу FIXED. На боевой странице режим выключен.
  const EDIT = new URLSearchParams(location.search).has('edit');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches && innerWidth >= 1000;
  if (!desktop || prefersReduced) return false;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);
  const hero = container;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const BG = 0x231d16;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 30, 60);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
camera.position.set(-2, 7.5, 26);
camera.lookAt(0, 2.8, 0);

new RGBELoader().load(assets.hdr, tex => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
});

const batteryGlow = new THREE.PointLight(0xffb224, 0, 12);
batteryGlow.position.set(0.5, -0.35, 3.6);
scene.add(batteryGlow);

// холодная подсветка внутренней панели крышки — включается при отъезде дисплея
const displayGlow = new THREE.PointLight(0x86aaff, 0, 9);
scene.add(displayGlow);
let backSheet = null;
const zoneMeshes = [];

const warm = new THREE.DirectionalLight(0xffe4b8, 0.7);
warm.position.set(8, 16, 10);
warm.castShadow = true;
warm.shadow.mapSize.set(2048, 2048);
warm.shadow.camera.left = -16; warm.shadow.camera.right = 16;
warm.shadow.camera.top = 16; warm.shadow.camera.bottom = -16;
warm.shadow.radius = 8;
scene.add(warm);
const amberRim = new THREE.DirectionalLight(0xffb224, 0.35);
amberRim.position.set(-10, 6, -8);
scene.add(amberRim);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.ShadowMaterial({ opacity: 0.3 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);

const N = 150, dpos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  dpos[i*3] = (Math.random() - 0.5) * 60;
  dpos[i*3+1] = Math.random() * 26;
  dpos[i*3+2] = (Math.random() - 0.5) * 40 - 6;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffb224, size: 0.09, transparent: true, opacity: 0.3 }));
scene.add(dust);

const root = new THREE.Group();
scene.add(root);
let rootBaseY = 0;
let rootBaseX = null;  // база смещения по X; на широких экранах мак уводится правее текста

// логические детали: suffix узла →描述. Заполняется после диагностики.
const PART_DEFS = PART_DEFS_DATA;

const parts = new Map();
const colCount = { L: 0, R: 0 };

const draco = new DRACOLoader();
draco.setDecoderPath(assets.draco);
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

loader.load(assets.model, (gltf) => {
  root.add(gltf.scene);
  gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; } });

  // нормализация: ширина ~11, низ на пол
  const bb = new THREE.Box3().setFromObject(root);
  const size = bb.getSize(new THREE.Vector3());
  const scale = 9.5 / Math.max(size.x, size.z);
  root.scale.setScalar(scale);
  const bb2 = new THREE.Box3().setFromObject(root);
  root.position.y = -bb2.min.y;
  const c = bb2.getCenter(new THREE.Vector3());
  root.position.x = -c.x - 0.2;
  root.position.z = -c.z;
  root.rotation.y = -Math.PI / 4;
  rootBaseY = root.position.y;
  rootBaseX = root.position.x;
  resize(); // применить широкоэкранный сдвиг сразу после загрузки
  const size2 = bb2.getSize(new THREE.Vector3());   // габариты уже в юнитах сцены

  // регистрация деталей: каждая — один или несколько узлов по суффиксам имён.
  // Мировой вектор отделения переводится в локальные оси родителя каждого узла —
  // у Sketchfab-иерархии узлы повёрнуты, и локальный Y не совпадает с мировым.
  scene.updateMatrixWorld(true);
  const inv = new THREE.Matrix4(), w0 = new THREE.Vector3(), w1 = new THREE.Vector3();
  for (const def of PART_DEFS) {
    const key = def.key || def.suffixes[0];
    const nodes = [];
    for (const suf of def.suffixes) {
      gltf.scene.traverse(o => { if (o.name && o.name.endsWith('_' + suf) && !o.name.startsWith('Object_') && !nodes.includes(o)) nodes.push(o); });
    }
    if (!nodes.length) continue;
    // вектор отделения задан в осях макбука — поворачиваем вместе с моделью
    const worldOffset = new THREE.Vector3(...def.offset).multiplyScalar(size2.y)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), root.rotation.y);
    const p = { nodes: nodes.map(nd => {
                  const base = nd.position.clone();
                  inv.copy(nd.parent.matrixWorld).invert();
                  w0.setFromMatrixPosition(nd.matrixWorld);
                  w1.copy(w0).add(worldOffset);
                  const localOffset = w1.applyMatrix4(inv).sub(w0.applyMatrix4(inv)).clone();
                  // самокалибровка: пробный сдвиг → замер фактического мирового сдвига → нормировка
                  const wa = new THREE.Vector3(); nd.getWorldPosition(wa);
                  nd.position.copy(base).add(localOffset);
                  nd.updateMatrixWorld(true);
                  const wb = new THREE.Vector3(); nd.getWorldPosition(wb);
                  nd.position.copy(base);
                  nd.updateMatrixWorld(true);
                  const achieved = wb.sub(wa).length(), want = worldOffset.length();
                  if (achieved > 1e-9 && want > 0) localOffset.multiplyScalar(want / achieved);
                  return { node: nd, base, localOffset };
                }),
                phase: Math.random() * Math.PI * 2, cur: 0, tgt: 0,
                idleT: 7 + Math.random() * 9, idleP: Math.random() * Math.PI * 2,
                also: def.also || [],
                label: def.label, verdict: def.verdict, cls: def.cls, meshes: [] };
    for (const nd of nodes) nd.traverse(o => { if (o.isMesh) { o.userData.part = key; p.meshes.push(o); } });
    parts.set(key, p);
  }

  // фейковая батарея: группа ячеек в мировых координатах внутри корпуса,
  // опускается вместе с нижней пластиной при hover
  const bp = parts.get('battery');
  if (bp) {
    // размещение в осях макбука: временно обнуляем поворот, потом возвращаем
    const savedRotY = root.rotation.y;
    root.rotation.y = 0;
    root.updateMatrixWorld(true);
    // батарея — многосекционная: точный силуэт каждой секции из контура фото,
    // экструзия с фаской, фото на верхней грани, чёрная плёнка по бокам
    const cellsG = new THREE.Group();
    root.add(cellsG);
    const s = root.scale.x;
    const SHAPES = BATT_SHAPES_DATA;
    const SEG_URIS = assets.battSegs;
    const totalPx = 359, blockHpx = 104;
    const battW = 6.2, battH = 0.12;
    const unit = battW / totalPx;              // мировых юнитов на пиксель фото
    const depthPx = battH / unit;              // толщина в пикселях
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0e0e10, metalness: 0.15, roughness: 0.55 });
    for (const seg of SHAPES) {
      const tex = new THREE.TextureLoader().load(SEG_URIS[seg.i]);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1 / seg.w, 1 / seg.h);
      const topMat = new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.45, metalness: 0.1,
        emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5 });
      const shape = new THREE.Shape();
      seg.pts.forEach(([px, py], k) => {
        const x = px, y = seg.h - py;
        if (k === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      });
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: depthPx, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 2 });
      geo.translate(seg.ox - totalPx / 2, -blockHpx / 2, -depthPx / 2);
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, [topMat, sideMat]);
      mesh.scale.setScalar(unit / s * s); // вершины в px → юниты сцены; root уже масштабирует на s
      mesh.scale.setScalar(unit / 1);
      // центр по X и передний край — от фактической геометрии нижней крышки
      const plateBB = new THREE.Box3().setFromObject(bp.nodes[0].node);
      const pc = plateBB.getCenter(new THREE.Vector3());
      const wpos = new THREE.Vector3(pc.x + 0.55, 0.11, plateBB.max.z - (blockHpx * unit) / 2 - 0.02);
      mesh.position.copy(root.worldToLocal(wpos.clone()));
      mesh.scale.setScalar(unit / s);
      mesh.userData.part = 'battery';
      cellsG.add(mesh);
      bp.meshes.push(mesh);
    }
    // батарейный блок выдвигается из-под корпуса вперёд-вниз, как ящик
    // (поворот root обнулён — вектор в осях макбука, повернётся вместе с ним)
    const cw = new THREE.Vector3(0, -0.165, 0).multiplyScalar(size2.y);
    const base = cellsG.position.clone();
    const inv2 = new THREE.Matrix4().copy(cellsG.parent.matrixWorld).invert();
    const a0 = new THREE.Vector3(); cellsG.getWorldPosition(a0);
    const a1 = a0.clone().add(cw);
    const la = a1.applyMatrix4(inv2).sub(a0.clone().applyMatrix4(inv2)).clone();
    cellsG.position.copy(base).add(la);
    cellsG.updateMatrixWorld(true);
    const wb = new THREE.Vector3(); cellsG.getWorldPosition(wb);
    cellsG.position.copy(base);
    cellsG.updateMatrixWorld(true);
    const achieved = wb.sub(a0).length(), want = cw.length();
    if (achieved > 1e-9) la.multiplyScalar(want / achieved);
    bp.nodes.push({ node: cellsG, base, localOffset: la });

    // динамики A2442: пара зеркальных Г-образных модулей по фото разборки —
    // матовый чёрный корпус; сзади широкая голова с овальным вуфером
    // (утопленный резиновый подвес + чуть выпуклая глянцевая мембрана),
    // вперёд узкая нога с маленьким драйвером-капсулой, сбоку язычок шлейфа.
    // В собранном виде целиком спрятаны в полости корпуса; выезжают вниз
    // слоем между топкейсом и батареей — вместе с крышкой и батареей.
    const spHous = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, metalness: 0.08, roughness: 0.5, emissive: 0x0e0e12, emissiveIntensity: 1, envMapIntensity: 0.5 });
    const spRing = new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0.0, roughness: 0.55, emissive: 0x08080a, emissiveIntensity: 1, envMapIntensity: 0.3 });
    const spMemb = new THREE.MeshPhysicalMaterial({ color: 0x121216, metalness: 0.0, roughness: 0.38, clearcoat: 0.25, clearcoatRoughness: 0.3, emissive: 0x0a0a0e, emissiveIntensity: 1, envMapIntensity: 0.35 });
    const spFlex = new THREE.MeshStandardMaterial({ color: 0x1c1c16, metalness: 0.15, roughness: 0.6, emissive: 0x0c0c08, emissiveIntensity: 1, envMapIntensity: 0.4 });
    function rrShape(w, l, r) {
      const sh = new THREE.Shape(), x = -w / 2, y = -l / 2;
      sh.moveTo(x, y + r);
      sh.lineTo(x, y + l - r); sh.quadraticCurveTo(x, y + l, x + r, y + l);
      sh.lineTo(x + w - r, y + l); sh.quadraticCurveTo(x + w, y + l, x + w, y + l - r);
      sh.lineTo(x + w, y + r); sh.quadraticCurveTo(x + w, y, x + w - r, y);
      sh.lineTo(x + r, y); sh.quadraticCurveTo(x, y, x, y + r);
      return sh;
    }
    // овальный драйвер: кольцо подвеса + выпуклая мембрана, лежит плашмя мембраной вверх
    function spDriver(w, l) {
      const g = new THREE.Group();
      const ring = rrShape(w, l, Math.min(w, l) / 2);
      ring.holes.push(rrShape(w - 0.13, l - 0.13, Math.min(w - 0.13, l - 0.13) / 2));
      const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.02, bevelEnabled: false });
      ringGeo.rotateX(-Math.PI / 2);
      g.add(new THREE.Mesh(ringGeo, spRing));
      const membGeo = new THREE.ExtrudeGeometry(
        rrShape(w - 0.15, l - 0.15, Math.min(w - 0.15, l - 0.15) / 2),
        { depth: 0.012, bevelEnabled: true, bevelThickness: 0.028, bevelSize: 0.028, bevelSegments: 3 });
      membGeo.rotateX(-Math.PI / 2);
      const memb = new THREE.Mesh(membGeo, spMemb);
      memb.position.y = 0.012;
      g.add(memb);
      return g;
    }
    const spParts = { nodes: [], meshes: [], cur: 0, tgt: 0, phase: Math.random() * 6.28,
      idleT: 1e9, idleP: 0, also: ['battery'],
      label: 'SPEAKERS', verdict: 'CRACKLING', cls: 'bad' };
    const spOffW = new THREE.Vector3(0, -0.156, 0).multiplyScalar(size2.y);
    const plateBB2 = new THREE.Box3().setFromObject(bp.nodes[0].node);
    const pc2 = plateBB2.getCenter(new THREE.Vector3());
    // позиция — точно под решётками динамиков на топкейсе: крайние полосы
    // узла клавиатуры (перфорация по бокам клавиш); выезд перпендикулярно вниз
    const kbNode = parts.has('keyboard') ? parts.get('keyboard').nodes[0].node : null;
    const kbBB = kbNode ? new THREE.Box3().setFromObject(kbNode) : plateBB2;
    for (const dir of [-1, 1]) {
      const xc = dir > 0 ? kbBB.max.x - 0.22 : kbBB.min.x + 0.22;
      const zc = kbBB.min.z + 1.7;
      const spG = new THREE.Group();
      root.add(spG);
      spG.position.copy(root.worldToLocal(new THREE.Vector3(xc, 0.1, zc)));
      spG.scale.setScalar(1 / s);
      const head = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.13, 1.5, 2, 0.05), spHous);
      head.position.set(0, 0.065, -0.95);
      spG.add(head);
      const leg = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.11, 1.95, 2, 0.04), spHous);
      leg.position.set(dir * 0.225, 0.055, 0.72);
      spG.add(leg);
      const woofer = spDriver(0.66, 1.2);
      woofer.position.set(0, 0.112, -0.95);
      spG.add(woofer);
      const front = spDriver(0.34, 0.82);
      front.position.set(dir * 0.225, 0.092, 1.18);
      spG.add(front);
      const flex = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.018, 0.22), spFlex);
      flex.position.set(dir * -0.12, 0.03, 1.62);
      spG.add(flex);
      spG.traverse(o => { if (o.isMesh) { o.userData.part = 'speaker'; spParts.meshes.push(o); } });
      // калибровка вектора вниз для группы
      const base2 = spG.position.clone();
      const inv3 = new THREE.Matrix4().copy(spG.parent.matrixWorld).invert();
      const a2 = new THREE.Vector3(); spG.getWorldPosition(a2);
      const b2 = a2.clone().add(spOffW);
      const lo2 = b2.applyMatrix4(inv3).sub(a2.clone().applyMatrix4(inv3)).clone();
      spG.position.copy(base2).add(lo2); spG.updateMatrixWorld(true);
      const c2 = new THREE.Vector3(); spG.getWorldPosition(c2);
      spG.position.copy(base2); spG.updateMatrixWorld(true);
      const ach2 = c2.sub(a2).length();
      if (ach2 > 1e-9) lo2.multiplyScalar(spOffW.length() / ach2);
      spParts.nodes.push({ node: spG, base: base2, localOffset: lo2 });
    }
    parts.set('speaker', spParts);

    // дно под клавиатурой и трекпадом: тёмно-серые пластины в корпусе,
    // чтобы при подъёме деталей не зияла чёрная пустота выреза
    const wellMat = new THREE.MeshStandardMaterial({ color: 0x67686e, metalness: 0.35, roughness: 0.45, emissive: 0x121215, emissiveIntensity: 1, envMapIntensity: 0.9 });
    for (const wk of ['keyboard', 'trackpad']) {
      const wp2 = parts.get(wk);
      if (!wp2) continue;
      const wbb = new THREE.Box3().setFromObject(wp2.nodes[0].node);
      const wsz = wbb.getSize(new THREE.Vector3());
      const wc = wbb.getCenter(new THREE.Vector3());
      const well = new THREE.Mesh(new THREE.BoxGeometry(wsz.x * 0.98 / s, 0.012 / s, wsz.z * 0.98 / s), wellMat);
      // клавиатурная ниша: дно выше внутренних слоёв корпуса, но ниже клавиш
      const wy = wk === 'keyboard' ? wbb.min.y + wsz.y * 0.52 : wbb.min.y - 0.01;
      well.position.copy(root.worldToLocal(new THREE.Vector3(wc.x, wy, wc.z)));
      well.userData.part = 'body';
      root.add(well);
    }

    // зона наведения: Г-образный силуэт собранного мака из двух невидимых
    // боксов (основание + наклонная крышка) — их края и есть граница
    // «разобрать/собрать». Рейкаст идёт только по ним, поэтому движущиеся
    // детали не влияют на состояние и автоколебаний нет.
    const zoneMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const zBase = new THREE.Mesh(
      new THREE.BoxGeometry((plateBB2.max.x - plateBB2.min.x + 0.3) / s, 0.8 / s, (plateBB2.max.z - plateBB2.min.z + 0.3) / s), zoneMat);
    zBase.position.copy(root.worldToLocal(new THREE.Vector3(pc2.x, 0.35, pc2.z)));
    root.add(zBase);
    zoneMeshes.push(zBase);
    if (parts.has('display')) {
      const dbbZ = new THREE.Box3().setFromObject(parts.get('display').nodes[0].node);
      const dszZ = dbbZ.getSize(new THREE.Vector3());
      const dcZ = dbbZ.getCenter(new THREE.Vector3());
      const zAng = Math.atan2(dszZ.z, dszZ.y);
      const zLen = Math.hypot(dszZ.y, dszZ.z);
      const zLid = new THREE.Mesh(new THREE.BoxGeometry((dszZ.x + 0.6) / s, (zLen + 0.45) / s, 0.55 / s), zoneMat);
      zLid.position.copy(root.worldToLocal(dcZ.clone()));
      zLid.rotation.x = -zAng;
      root.add(zLid);
      zoneMeshes.push(zLid);
    }

    // бирки-выноски: колонками по бокам, тонкая линия к якорю детали.
    // Якорь в локальных координатах узла — едет вместе с деталью.
    const LAYOUT = { display: ['L', 0], keyboard: ['L', 1], trackpad: ['L', 2], battery: ['L', 3],
                     camera: ['R', 0], body: ['R', 1], touchid: ['R', 2], speaker: ['R', 3] };
    // инфраструктура режима расстановки
    const savedLayout = EDIT ? JSON.parse(localStorage.getItem('cmm_layout') || '{}') : {};
    function layoutObj(round) {
      const o = {};
      for (const [k2, p2] of parts) {
        const e2 = {};
        if (p2.userPos) { e2.fx = round ? +p2.userPos.fx.toFixed(4) : p2.userPos.fx; e2.fy = round ? +p2.userPos.fy.toFixed(4) : p2.userPos.fy; }
        if (p2.linePos) { e2.t = round ? +p2.linePos.t.toFixed(3) : p2.linePos.t; e2.off = round ? +p2.linePos.off.toFixed(1) : p2.linePos.off; }
        if (Object.keys(e2).length) o[k2] = e2;
      }
      return o;
    }
    function saveLayout() { if (EDIT) localStorage.setItem('cmm_layout', JSON.stringify(layoutObj(false))); }
    if (EDIT) {
      const btn = document.createElement('button');
      btn.textContent = 'COPY LAYOUT';
      btn.style.cssText = 'position:absolute;z-index:40;left:16px;bottom:16px;font:600 12px ui-monospace,monospace;letter-spacing:.08em;color:#ece7dc;background:rgba(20,18,14,.9);border:1px solid #ffb224;padding:10px 16px;cursor:pointer;pointer-events:auto';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(layoutObj(true), null, 2)).then(() => {
          btn.textContent = 'СКОПИРОВАНО ✓';
          setTimeout(() => { btn.textContent = 'COPY LAYOUT'; }, 1600);
        });
      });
      container.appendChild(btn);
      const hint = document.createElement('div');
      hint.textContent = 'РЕЖИМ РАССТАНОВКИ: тяни бирки и жёлтые узлы линий · двойной клик — сброс · потом COPY LAYOUT';
      hint.style.cssText = 'position:absolute;z-index:40;left:16px;bottom:60px;font:11px ui-monospace,monospace;letter-spacing:.06em;color:#b8ae9c;background:rgba(20,18,14,.8);padding:6px 12px;pointer-events:none';
      container.appendChild(hint);
    }

    const leads = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leads.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + (EDIT ? 30 : 10) + ';';
    hero.appendChild(leads);
    // зафиксированная раскладка бирок и изломов линий (подобрана Юрой 2026-08-15):
    // fx/fy — позиция бирки в долях героя; t/off — излом линии (доля вдоль + перпендикуляр)
    const FIXED = {
      display: { fx: 0.5269, fy: 0.3244, t: 0.225, off: 46.7 },
      camera: { fx: 0.7262, fy: 0.1876, t: 0.446, off: 0.1 },
      keyboard: { fx: 0.4913, fy: 0.5109, t: 0.224, off: 34.8 },
      touchid: { fx: 0.8572, fy: 0.5922, t: 0.895, off: 26.6 },
      trackpad: { fx: 0.4480, fy: 0.6997, t: 0.370, off: 0.3 },
      battery: { fx: 0.5577, fy: 0.8443, t: 0.420, off: -0.2 },
      body: { fx: 0.8514, fy: 0.6942 },
      speaker: { fx: 0.8045, fy: 0.8488, t: 0.471, off: -17.7 }
    };
    for (const [k, p] of parts) {
      if (k === 'vents') continue; // вентиляция выезжает, но без бирки
      const anchorNode = ((k === 'battery' || k === 'speaker') && p.nodes[1]) ? p.nodes[1].node : p.nodes[0].node;
      const bb = new THREE.Box3().setFromObject(anchorNode);
      const w = bb.getCenter(new THREE.Vector3());
      if (k === 'body') w.set(plateBB2.max.x - 0.02, 0.23, pc2.z - 2.55); // разъём USB-C на правом борту
      const [side, slot] = LAYOUT[k] || ['R', 0];
      p.side = side; p.slot = slot;
      colCount[side]++;
      const el = document.createElement('div');
      el.className = 'callout ' + side;
      el.innerHTML = p.label + '<b class="' + p.cls + '">' + p.verdict + '</b>';
      hero.appendChild(el);
      const sp = (EDIT && savedLayout[k]) || FIXED[k] || {};
      if (sp.fx !== undefined) p.userPos = { fx: sp.fx, fy: sp.fy };
      if (sp.t !== undefined) p.linePos = { t: sp.t, off: sp.off };
      if (EDIT) {
        el.addEventListener('pointerdown', e => {
          e.preventDefault(); e.stopPropagation();
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
          const r = hero.getBoundingClientRect();
          p.dragOff = { x: parseFloat(el.style.left) - (e.clientX - r.left), y: parseFloat(el.style.top) - (e.clientY - r.top) };
          el.style.cursor = 'grabbing';
        });
        el.addEventListener('pointermove', e => {
          if (!p.dragOff) return;
          e.stopPropagation();
          const r = hero.getBoundingClientRect();
          p.userPos = { fx: (e.clientX - r.left + p.dragOff.x) / r.width, fy: (e.clientY - r.top + p.dragOff.y) / r.height };
        });
        const endDrag = () => { if (!p.dragOff) return; p.dragOff = null; el.style.cursor = 'grab'; saveLayout(); };
        el.addEventListener('pointerup', endDrag);
        el.addEventListener('pointercancel', endDrag);
        el.addEventListener('dblclick', () => { p.userPos = null; saveLayout(); });
        el.style.cursor = 'grab';
        el.style.pointerEvents = 'auto';
      }
      // ломаная выноска: бирка → узел излома → деталь. Излом хранится
      // относительно отрезка (доля t вдоль + перпендикулярный сдвиг off) —
      // при движении концов угол следует за геометрией
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      ln.setAttribute('stroke', '#ffffff');
      ln.setAttribute('stroke-width', '1');
      ln.setAttribute('stroke-opacity', '0');
      ln.setAttribute('fill', 'none');
      leads.appendChild(ln);
      const dotA = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dotA.setAttribute('r', '1.8');
      dotA.setAttribute('fill', '#ffffff');
      dotA.setAttribute('opacity', '0');
      leads.appendChild(dotA);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '1.8');
      dot.setAttribute('fill', '#ffffff');
      dot.setAttribute('opacity', '0');
      leads.appendChild(dot);
      anchorNode.updateMatrixWorld(true);
      p.anchorNode = anchorNode;
      p.anchorLocal = anchorNode.worldToLocal(w.clone());
      if (EDIT) {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('r', '5');
        handle.setAttribute('fill', '#ffb224');
        handle.setAttribute('opacity', '0');
        handle.style.cursor = 'grab';
        handle.style.pointerEvents = 'auto';
        leads.appendChild(handle);
        handle.addEventListener('pointerdown', e => {
          e.preventDefault(); e.stopPropagation();
          try { handle.setPointerCapture(e.pointerId); } catch (_) {}
          p.lineDrag = true; handle.style.cursor = 'grabbing';
        });
        handle.addEventListener('pointermove', e => {
          if (!p.lineDrag || !p._A) return;
          e.stopPropagation();
          const r = hero.getBoundingClientRect();
          const Px = e.clientX - r.left, Py = e.clientY - r.top;
          const dx = p._B.x - p._A.x, dy = p._B.y - p._A.y;
          const L2 = dx * dx + dy * dy;
          if (L2 < 1) return;
          const L = Math.sqrt(L2);
          const t = Math.max(0.05, Math.min(0.95, ((Px - p._A.x) * dx + (Py - p._A.y) * dy) / L2));
          const off = ((Px - p._A.x) * -dy + (Py - p._A.y) * dx) / L;
          p.linePos = { t, off };
        });
        const endLine = () => { if (!p.lineDrag) return; p.lineDrag = false; handle.style.cursor = 'grab'; saveLayout(); };
        handle.addEventListener('pointerup', endLine);
        handle.addEventListener('pointercancel', endLine);
        handle.addEventListener('dblclick', () => { p.linePos = null; saveLayout(); });
        p.leadHandle = handle;
      }
      p.calloutEl = el;
      p.leadLine = ln;
      p.leadDotA = dotA;
      p.leadDot = dot;
    }

    // экран: скриншот CheckMyMac Pro вместо штатных обоев модели —
    // подмена emissiveMap с сохранением UV-трансформа старой текстуры
    if (parts.has('display')) {
      for (const m of parts.get('display').meshes) {
        const mat = m.material;
        if (mat && mat.emissiveMap) {
          const old = mat.emissiveMap;
          new THREE.TextureLoader().load(assets.screen, tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = old.flipY;
            tex.wrapS = old.wrapS; tex.wrapT = old.wrapT;
            tex.repeat.copy(old.repeat); tex.offset.copy(old.offset);
            tex.rotation = old.rotation; tex.center.copy(old.center);
            if (old.channel !== undefined) tex.channel = old.channel;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            mat.emissiveMap = tex;
            mat.needsUpdate = true;
          });
        }
      }
    }
    // кнопка Touch ID целиком: корпус клавиши поверх модельной — сама кнопка
    // впаяна в общий меш клавиатуры и отдельно подниматься не может.
    // Кружок сенсора (узлы 34/36) ложится заподлицо на верх корпуса.
    const tp2 = parts.get('touchid');
    if (tp2) {
      const tbb = new THREE.Box3().setFromObject(tp2.nodes[0].node);
      const tcc = tbb.getCenter(new THREE.Vector3());
      const btnMat = new THREE.MeshStandardMaterial({ color: 0x101013, metalness: 0.05, roughness: 0.5, envMapIntensity: 0.6 });
      const btn = new THREE.Mesh(new RoundedBoxGeometry(0.42 / s, 0.12 / s, 0.34 / s, 2, 0.02 / s), btnMat);
      btn.position.copy(root.worldToLocal(new THREE.Vector3(tcc.x, 0.33, tcc.z)));
      btn.userData.part = 'touchid';
      root.add(btn);
      tp2.meshes.push(btn);
      const tOffW = new THREE.Vector3(0, 0.06, 0).multiplyScalar(size2.y);
      const tBase = btn.position.clone();
      const tInv = new THREE.Matrix4().copy(btn.parent.matrixWorld).invert();
      const ta = new THREE.Vector3(); btn.getWorldPosition(ta);
      const tb = ta.clone().add(tOffW);
      const tlo = tb.applyMatrix4(tInv).sub(ta.clone().applyMatrix4(tInv)).clone();
      btn.position.copy(tBase).add(tlo); btn.updateMatrixWorld(true);
      const tc2 = new THREE.Vector3(); btn.getWorldPosition(tc2);
      btn.position.copy(tBase); btn.updateMatrixWorld(true);
      const tach = tc2.sub(ta).length();
      if (tach > 1e-9) tlo.multiplyScalar(tOffW.length() / tach);
      tp2.nodes.push({ node: btn, base: tBase, localOffset: tlo });
    }

    // «лист подсветки»: светящийся прямоугольник по площади серой панели
    // крышки, за дисплеем; края крышки и резинка остаются без свечения
    if (parts.has('display')) {
      const dbb0 = new THREE.Box3().setFromObject(parts.get('display').nodes[0].node);
      const dsz0 = dbb0.getSize(new THREE.Vector3());
      const dc0 = dbb0.getCenter(new THREE.Vector3());
      const lidAng = Math.atan2(dsz0.z, dsz0.y);
      const lidLen = Math.hypot(dsz0.y, dsz0.z);
      const nrm = new THREE.Vector3(0, Math.sin(lidAng), Math.cos(lidAng));
      backSheet = new THREE.Mesh(
        new THREE.ShapeGeometry(rrShape(dsz0.x - 0.15, lidLen - 0.06, 0.18)),
        new THREE.MeshBasicMaterial({ color: 0x4a6fd8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      backSheet.position.copy(root.worldToLocal(dc0.clone().addScaledVector(nrm, -0.06)));
      backSheet.rotation.x = -lidAng;
      backSheet.scale.setScalar(1 / s);
      root.add(backSheet);
    }

    root.rotation.y = savedRotY;
    root.updateMatrixWorld(true);

    // позиция холодного света: в зазоре между уехавшим дисплеем и панелью крышки
    if (parts.has('display')) {
      const dbb = new THREE.Box3().setFromObject(parts.get('display').nodes[0].node);
      const dc = dbb.getCenter(new THREE.Vector3());
      const dOff = new THREE.Vector3(0, 0.052, 0.13).multiplyScalar(size2.y)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), root.rotation.y);
      displayGlow.position.copy(dc).addScaledVector(dOff, 0.5);
    }
  }

  container.classList.add('live');
  resize();                                        // замерить бирки после вставки
  if (document.fonts) document.fonts.ready.then(resize);  // и после загрузки шрифтов
}, undefined, (err) => { console.error('hero: model failed to load', err); });

// hover
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let hoverKey = null;
let appear = 0;   // плавное проявление бирок после загрузки модели
let pendingKey = null, pendingT = 0;
let mouseX = 0, mouseY = 0;

// наведение на мак раскрывает ВСЕ детали разом; бирки появляются на каждой
let openT = 0;
{
  hero.addEventListener('pointermove', e => {
    // над биркой состояние заморожено — иначе луч мимо мака сложил бы
    // конструкцию прямо под курсором
    if (e.target !== canvas) return;
    const r = hero.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    ptr.x = (px / r.width) * 2 - 1;
    ptr.y = -(py / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    if (EDIT) return; // в режиме расстановки мак раскрыт постоянно
    const hitAny = zoneMeshes.length ? ray.intersectObjects(zoneMeshes).length > 0 : false;
    if (hitAny) { hoverKey = 'open'; openT = performance.now(); }
    // гистерезис на закрытие: короткий проскок мимо конверта не схлопывает
    else if (hoverKey && performance.now() - openT > 260) hoverKey = null;
    for (const p of parts.values()) p.tgt = hoverKey ? 1 : 0;
    hero.style.cursor = hoverKey ? 'pointer' : 'default';
  });
  hero.addEventListener('pointerleave', () => {
    if (EDIT) return;
    hoverKey = null;
    for (const p of parts.values()) p.tgt = 0;
  });
}

function resize() {
  const w = hero.clientWidth, h = hero.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // на широких окнах уводим мак правее, чтобы он и его бирки не налезали
  // на заголовок слева; бирки живут в долях экрана — двигаем их отдельно
  const shift = Math.min(4.6, Math.max(0, (w / h - 1.2) * 6.2));
  if (rootBaseX !== null) root.position.x = rootBaseX + shift;
  // ширины бирок кэшируем: нужны каждый кадр, чтобы правые не ушли за экран
  for (const p of parts.values()) if (p.calloutEl) p.cw = p.calloutEl.offsetWidth;
}
addEventListener('resize', resize);
resize();

const ease = x => x * x * (3 - 2 * x);

// дыхание: 4 крупные группы вздыхают по кругу с перекрытием больше половины
// цикла — в любой момент МИНИМУМ ДВЕ группы отделены, полностью собранного
// мака не бывает. Мелкие детали дышат со своей группой: камера с дисплеем;
// динамики и корпус с нижней крышкой; Touch ID и вентиляция с клавиатурой.
const BREATH_ORDER = ['display', 'battery', 'keyboard', 'trackpad'];
const BREATH_T = 16, BREATH_D = 8.8;
const BREATH_LINK = { camera: 'display', speaker: 'battery', body: 'battery', touchid: 'keyboard', vents: 'keyboard' };

function frame(ms) {
  const tSec = ms * 0.001;
  for (const [k, p] of parts) {
    if (EDIT) p.tgt = 1;
    p.cur += (p.tgt - p.cur) * (prefersReduced ? 0.3 : (p.tgt > p.cur ? 0.07 : 0.1));
    const e = ease(Math.max(0, Math.min(1, p.cur)));
    const slot = BREATH_ORDER.indexOf(BREATH_LINK[k] || k);
    const local = ((tSec - slot * BREATH_T / BREATH_ORDER.length) % BREATH_T + BREATH_T) % BREATH_T;
    const u = local / BREATH_D;
    const inhale = (!prefersReduced && slot >= 0 && u < 1) ? Math.pow(Math.sin(u * Math.PI), 2) : 0;
    const eff = Math.min(1, e + inhale * (1 - e));
    p.eff = eff;
    const breathe = prefersReduced ? 0 : Math.sin(ms * 0.0011 + p.phase) * 0.06 * eff;
    for (const n of p.nodes) {
      n.node.position.copy(n.base).addScaledVector(n.localOffset, eff + breathe);
    }
  }
  // бирки-выноски: колонки по бокам; линия от края бирки к якорю детали
  const av = new THREE.Vector3();
  const W = hero.clientWidth, H = hero.clientHeight;
  for (const p of parts.values()) {
    if (!p.calloutEl) continue;
    av.copy(p.anchorLocal);
    p.anchorNode.localToWorld(av);
    av.project(camera);
    const ax = (av.x * 0.5 + 0.5) * W, ay = (-av.y * 0.5 + 0.5) * H;
    const n = colCount[p.side];
    let bx = p.side === 'L' ? W * 0.225 : W * 0.775;
    let ty = H * (0.2 + (n > 1 ? p.slot * 0.55 / (n - 1) : 0));
    if (p.userPos) { bx = p.userPos.fx * W; ty = p.userPos.fy * H; }
    if (p.side === 'R') bx = Math.min(bx, W - 16 - (p.cw || 150));
    p.calloutEl.style.left = bx + 'px';
    p.calloutEl.style.top = ty + 'px';
    const vis = appear;   // бирки висят всегда, не только при наведении
    p.calloutEl.style.opacity = vis.toFixed(2);
    p.calloutEl.classList.toggle('on', vis > 0.5);
    const Ax = p.side === 'L' ? bx + 6 : bx - 6, Ay = ty;
    p._A = { x: Ax, y: Ay };
    p._B = { x: ax, y: ay };
    let mx = (Ax + ax) / 2, my = (Ay + ay) / 2;
    if (p.linePos) {
      const dx = ax - Ax, dy = ay - Ay, L = Math.hypot(dx, dy) || 1;
      mx = Ax + dx * p.linePos.t + (-dy / L) * p.linePos.off;
      my = Ay + dy * p.linePos.t + (dx / L) * p.linePos.off;
    }
    p.leadLine.setAttribute('points', Ax.toFixed(1) + ',' + Ay.toFixed(1) + ' ' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + ax.toFixed(1) + ',' + ay.toFixed(1));
    p.leadLine.setAttribute('stroke-opacity', (0.4 * vis).toFixed(2));
    p.leadDotA.setAttribute('cx', Ax.toFixed(1));
    p.leadDotA.setAttribute('cy', Ay.toFixed(1));
    p.leadDotA.setAttribute('opacity', (0.8 * vis).toFixed(2));
    p.leadDot.setAttribute('cx', ax.toFixed(1));
    p.leadDot.setAttribute('cy', ay.toFixed(1));
    p.leadDot.setAttribute('opacity', (0.8 * vis).toFixed(2));
    if (p.leadHandle) {
      p.leadHandle.setAttribute('cx', mx.toFixed(1));
      p.leadHandle.setAttribute('cy', my.toFixed(1));
      p.leadHandle.setAttribute('opacity', (0.9 * vis).toFixed(2));
    }
  }

  if (parts.size) appear = Math.min(1, appear + 0.015);

  const bpp = parts.get('battery');
  batteryGlow.intensity = bpp ? bpp.cur * 13 : 0;
  const dpp = parts.get('display');
  displayGlow.intensity = dpp ? (dpp.eff || 0) * 7 : 0;
  if (backSheet) backSheet.material.opacity = dpp ? (dpp.eff || 0) * 0.4 : 0;

  // корпус статичен: разворот зафиксирован, двигаются только детали
  dust.rotation.y = ms * 0.00001;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

  return true;
}
