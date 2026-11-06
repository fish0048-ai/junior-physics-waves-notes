import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ISLANDS, axialToWorld } from "./config.js?v=10";
import { islandProgress } from "./progress.js?v=10";
import { ICONS, UI } from "./icons.js?v=10";

const COS30 = Math.cos(Math.PI / 6);
const R = 1.3;
const INR = R * COS30;
const SHORE_R = R * 1.1;
const TOP = 0.52;
const HUB_R = 0.95;
const HOME = { target: new THREE.Vector3(0, 0, 0.9), phi: 0.8, theta: 0 };

const P = {
  sky: 0x8fdde4,
  deep: 0x1fa3bf,
  shallow: 0x8ae6e0,
  foam: 0xffffff,
  sandTop: 0xf6dfae,
  sandSide: 0xe3bf86,
  dirt: 0xd6a066,
  grass: 0x9dd36a,
  grassSide: 0x76b552,
  path: 0xf5e8d0,
  cream: 0xfff6e6,
  wood: 0xcf9a64,
  woodDark: 0x8d5a34,
};

const matCache = new Map();
function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, flatShading: true, ...opts });
    matCache.set(key, m);
  }
  return m;
}

function glass(color = 0xe6f6ff, opacity = 0.35) {
  return mat(color, {
    transparent: true,
    opacity,
    roughness: 0.08,
    flatShading: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const lighten = (c, k = 0.55) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
const darken = (c, k = 0.35) => new THREE.Color(c).lerp(new THREE.Color(0x000000), k).getHex();
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const hexDist = (x, z) => Math.max(Math.abs(x), Math.abs(x) * 0.5 + Math.abs(z) * COS30);
const pad = (n) => String(n).padStart(2, "0");

const ease = {
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function mesh(parent, geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function hexShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a));
    else s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  s.closePath();
  return s;
}

/** 六角柱：上下蓋用 capMat、側面用 sideMat；底部在 y=0 */
function prism(r, h, capMat, sideMat, bevel = 0.05) {
  const b = Math.min(bevel, h / 3);
  const geo = new THREE.ExtrudeGeometry(hexShape(r - b), {
    depth: Math.max(0.001, h - 2 * b),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, b, 0);
  const m = new THREE.Mesh(geo, [capMat, sideMat]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function gable(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

function house(parent, { x, z, w, h, d, wall = P.cream, roof, rot = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, TOP, z);
  g.rotation.y = rot;
  parent.add(g);
  mesh(g, new THREE.BoxGeometry(w, h, d), mat(wall), 0, h / 2, 0);
  mesh(g, gable(w * 1.14, h * 0.75, d * 1.12), mat(roof), 0, h, 0);
  mesh(g, new THREE.BoxGeometry(w * 0.22, h * 0.56, 0.02), mat(0x7c4a2d), 0, h * 0.28, d / 2 + 0.006);
  const win = mat(0x9fd8ff, { emissive: 0x2a6f99, emissiveIntensity: 0.18, flatShading: false });
  [-1, 1].forEach((s) => mesh(g, new THREE.BoxGeometry(w * 0.16, h * 0.24, 0.02), win, s * w * 0.3, h * 0.6, d / 2 + 0.006));
  return g;
}

function hullGeo(len, wid, depth) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, -wid / 2);
  s.lineTo(len * 0.18, -wid / 2);
  s.quadraticCurveTo(len / 2, -wid * 0.2, len / 2, 0);
  s.quadraticCurveTo(len / 2, wid * 0.2, len * 0.18, wid / 2);
  s.lineTo(-len / 2, wid / 2);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 1,
    curveSegments: 6,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.012, 0);
  return g;
}

function sailboat(sailColor) {
  const g = new THREE.Group();
  mesh(g, hullGeo(0.5, 0.18, 0.07), mat(0xfffaf0), 0, 0, 0);
  mesh(g, new THREE.BoxGeometry(0.32, 0.012, 0.12), mat(P.wood), -0.03, 0.088, 0);
  mesh(g, new THREE.CylinderGeometry(0.008, 0.008, 0.52, 6), mat(P.woodDark), 0.02, 0.34, 0);
  const main = new THREE.Shape();
  main.moveTo(0, 0);
  main.lineTo(0, 0.44);
  main.lineTo(-0.21, 0.02);
  main.closePath();
  mesh(g, new THREE.ShapeGeometry(main), mat(sailColor, { side: THREE.DoubleSide, flatShading: false }), 0.012, 0.1, 0);
  const jib = new THREE.Shape();
  jib.moveTo(0, 0);
  jib.lineTo(0, 0.36);
  jib.lineTo(0.17, 0.02);
  jib.closePath();
  mesh(g, new THREE.ShapeGeometry(jib), mat(0xffffff, { side: THREE.DoubleSide, flatShading: false }), 0.03, 0.12, 0);
  return g;
}

const GEO = {
  trunk: new THREE.CylinderGeometry(0.03, 0.045, 0.18, 6).translate(0, 0.09, 0),
  canopy: new THREE.IcosahedronGeometry(0.15, 1).translate(0, 0.27, 0),
  pine: new THREE.ConeGeometry(0.13, 0.4, 7).translate(0, 0.32, 0),
  bush: new THREE.IcosahedronGeometry(0.075, 0).translate(0, 0.05, 0),
  flower: new THREE.IcosahedronGeometry(0.022, 0).translate(0, 0.03, 0),
  rock: new THREE.DodecahedronGeometry(0.07, 0),
  plank: new THREE.BoxGeometry(0.075, 0.025, 0.3),
  post: new THREE.CylinderGeometry(0.012, 0.012, 0.15, 5).translate(0, 0.075, 0),
};

class Scatter {
  constructor() {
    this.items = { trunk: [], canopy: [], pine: [], bush: [], flower: [], rock: [] };
  }

  push(type, x, y, z, s = 1, rot = 0, color = null) {
    this.items[type].push({ x, y, z, s, rot, color });
  }

  build(parent) {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const materials = {
      trunk: mat(0x9b6a43),
      canopy: mat(0xffffff),
      pine: mat(0xffffff),
      bush: mat(0xffffff),
      flower: mat(0xffffff, { roughness: 0.6 }),
      rock: mat(0xffffff, { roughness: 0.95 }),
    };
    Object.entries(this.items).forEach(([type, list]) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(GEO[type], materials[type], list.length);
      im.castShadow = type !== "flower";
      im.receiveShadow = true;
      list.forEach((it, i) => {
        dummy.position.set(it.x, it.y, it.z);
        if (Array.isArray(it.rot)) dummy.rotation.set(it.rot[0], it.rot[1], it.rot[2]);
        else dummy.rotation.set(0, it.rot, 0);
        dummy.scale.setScalar(it.s);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        if (it.color != null) im.setColorAt(i, col.set(it.color));
      });
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      parent.add(im);
    });
  }
}

const GREENS = [0x4fae5a, 0x3f9a55, 0x67bf62, 0x86c95b, 0x2f8a4f];
const WARM = [0xf2a65a, 0xe9c46a];
const FLOWERS = [0xff8fab, 0xffd166, 0xffffff, 0xc77dff, 0xff7a59];
const ROCKS = [0xc9bca8, 0xb0a69a, 0xddd1bd];
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

function decorate(base, dirs, blocked, rand, maxR = INR * 0.9) {
  const sc = new Scatter();
  const clearOfPaths = (a) => dirs.every((d) => Math.abs(angleDiff(a, d)) > 0.3);
  let trees = 0;
  let bushes = 0;
  let flowers = 0;
  for (let k = 0; k < 220 && (trees < 9 || bushes < 7 || flowers < 14); k += 1) {
    const a = rand() * Math.PI * 2;
    const r = 0.2 + rand() * (maxR - 0.2);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (hexDist(x, z) > maxR || blocked(x, z) || !clearOfPaths(a)) continue;
    const roll = rand();
    if (trees < 9 && roll < 0.45) {
      const s = 0.8 + rand() * 0.5;
      sc.push("trunk", x, TOP, z, s);
      if (rand() < 0.3) sc.push("pine", x, TOP, z, s, rand() * 6, pick(rand, GREENS));
      else sc.push("canopy", x, TOP, z, s, rand() * 6, rand() < 0.15 ? pick(rand, WARM) : pick(rand, GREENS));
      trees += 1;
    } else if (bushes < 7 && roll < 0.72) {
      sc.push("bush", x, TOP, z, 0.8 + rand() * 0.6, rand() * 6, pick(rand, GREENS));
      bushes += 1;
    } else if (flowers < 14) {
      sc.push("flower", x, TOP, z, 0.8 + rand() * 0.5, 0, pick(rand, FLOWERS));
      flowers += 1;
    }
  }
  for (let k = 0; k < 12; k += 1) {
    const a = rand() * Math.PI * 2;
    if (!clearOfPaths(a)) continue;
    const rr = maxR / 0.9 + 0.02 + rand() * 0.1;
    sc.push("rock", Math.cos(a) * rr, 0.13, Math.sin(a) * rr, 0.6 + rand() * 0.8, [rand() * 3, rand() * 3, rand() * 3], pick(rand, ROCKS));
  }
  sc.build(base);
}

/* ───────── 各島地標（局部座標，正面朝 +z） ───────── */

function buildElements(g, island) {
  const m = new THREE.Group();
  m.position.set(0, TOP, -0.26);
  g.add(m);
  mesh(m, new THREE.BoxGeometry(0.8, 0.05, 0.5), mat(0xeadbc4), 0, 0.025, 0);
  mesh(m, new THREE.BoxGeometry(0.7, 0.05, 0.44), mat(0xf3e6d0), 0, 0.075, 0);
  mesh(m, new THREE.BoxGeometry(0.62, 0.26, 0.3), mat(P.cream), 0, 0.23, -0.05);
  for (let i = 0; i < 4; i += 1) {
    mesh(m, new THREE.CylinderGeometry(0.026, 0.03, 0.26, 8), mat(0xffffff), -0.255 + i * 0.17, 0.23, 0.15);
  }
  mesh(m, new THREE.BoxGeometry(0.72, 0.045, 0.42), mat(0xf3e6d0), 0, 0.383, 0);
  mesh(m, gable(0.76, 0.17, 0.44), mat(island.accent), 0, 0.405, 0);
  mesh(m, new THREE.BoxGeometry(0.13, 0.17, 0.02), mat(0x7c4a2d), 0, 0.185, 0.105);

  const specimens = [
    (p) => {
      const n = mesh(p, new THREE.DodecahedronGeometry(0.075, 0), mat(0xf6c445, { metalness: 0.9, roughness: 0.22 }), 0, 0.2, 0);
      n.rotation.set(0.4, 0.6, 0.2);
      n.scale.set(1.1, 0.8, 1);
    },
    (p) => {
      mesh(p, new THREE.BoxGeometry(0.15, 0.05, 0.08), mat(0xc8703c, { metalness: 0.85, roughness: 0.28 }), 0, 0.165, 0);
      const coil = mesh(p, new THREE.TorusGeometry(0.035, 0.012, 6, 16), mat(0xd9804a, { metalness: 0.85, roughness: 0.3 }), 0, 0.225, 0);
      coil.rotation.x = Math.PI / 2;
    },
    (p) => {
      [[0, 0.2, 0, 0.06], [0.05, 0.17, 0.03, 0.042], [-0.045, 0.165, -0.02, 0.036]].forEach(([x, y, z, s]) => {
        const c = mesh(p, new THREE.OctahedronGeometry(s, 0), mat(0xf2df3a, { roughness: 0.5 }), x, y, z);
        c.rotation.set(0.3, x * 10, 0.2);
      });
    },
  ];
  specimens.forEach((build, i) => {
    const p = new THREE.Group();
    p.position.set(-0.32 + i * 0.32, TOP, 0.3);
    g.add(p);
    mesh(p, new THREE.CylinderGeometry(0.075, 0.09, 0.14, 8), mat(0xfff4e2), 0, 0.07, 0);
    build(p);
  });
}

/** 週期表第 1–3 週期：欄位依真實族數排列，顏色表元素類別 */
function buildPeriodic(g, island, ctx) {
  const CELLS = [
    [1, 1, "n"], [18, 1, "g"],
    [1, 2, "a"], [2, 2, "e"], [13, 2, "m"], [14, 2, "n"], [15, 2, "n"], [16, 2, "n"], [17, 2, "n"], [18, 2, "g"],
    [1, 3, "a"], [2, 3, "e"], [13, 3, "t"], [14, 3, "m"], [15, 3, "n"], [16, 3, "n"], [17, 3, "n"], [18, 3, "g"],
  ];
  const COLORS = { a: 0xf26b4f, e: 0xf6a04d, t: 0x9fb0c6, m: 0xb79ce0, n: 0x5fc3a0, g: 0xb56be0 };
  const cw = 0.09;
  const cd = 0.15;
  mesh(g, new THREE.BoxGeometry(18 * cw + 0.12, 0.04, 3 * cd + 0.12), mat(0xeee4d4), 0, TOP + 0.02, 0);
  CELLS.forEach(([col, row, kind]) => {
    const h = 0.1 + ctx.rand() * 0.2 + (kind === "g" ? 0.08 : 0);
    const x = (col - 9.5) * cw;
    const z = (row - 2) * cd;
    mesh(g, new THREE.BoxGeometry(cw * 0.8, h, cd * 0.72), mat(COLORS[kind]), x, TOP + 0.04 + h / 2, z);
    mesh(g, new THREE.BoxGeometry(cw * 0.88, 0.02, cd * 0.8), mat(lighten(COLORS[kind], 0.45)), x, TOP + 0.05 + h, z);
  });
  ctx.mini("第 1 族", (1 - 9.5) * cw, TOP + 0.62, -0.05);
  ctx.mini("第 18 族（鈍氣）", (18 - 9.5) * cw, TOP + 0.68, -0.05);
}

function buildAtom(g, island, ctx) {
  mesh(g, new THREE.CylinderGeometry(0.42, 0.44, 0.05, 24), mat(0xeee4d4, { flatShading: false }), 0, TOP + 0.025, 0);
  mesh(g, new THREE.CylinderGeometry(0.33, 0.34, 0.24, 24), mat(P.cream, { flatShading: false }), 0, TOP + 0.17, 0);
  mesh(g, new THREE.CylinderGeometry(0.345, 0.345, 0.035, 24), mat(island.accent, { flatShading: false }), 0, TOP + 0.3, 0);
  const winMat = mat(0x8fd0ff, { emissive: 0x2f7fbf, emissiveIntensity: 0.3, flatShading: false });
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const w = mesh(g, new THREE.BoxGeometry(0.06, 0.08, 0.02), winMat, Math.cos(a) * 0.336, TOP + 0.19, Math.sin(a) * 0.336);
    w.rotation.y = Math.PI / 2 - a;
  }
  mesh(g, new THREE.SphereGeometry(0.29, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd6ecff, { metalness: 0.2, roughness: 0.25, flatShading: false }), 0, TOP + 0.315, 0);
  mesh(g, new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), mat(0xcbd5e1, { metalness: 0.6, roughness: 0.3, flatShading: false }), 0, TOP + 0.8, 0);

  const atom = new THREE.Group();
  atom.position.set(0, TOP + 1.12, 0);
  g.add(atom);
  const proton = mat(0xef4444, { flatShading: false, roughness: 0.4 });
  const neutron = mat(0xd1d5db, { flatShading: false, roughness: 0.4 });
  for (let i = 0; i < 12; i += 1) {
    const y = 1 - ((i + 0.5) * 2) / 12;
    const r = Math.sqrt(1 - y * y);
    const phi = i * 2.39996;
    mesh(atom, new THREE.SphereGeometry(0.048, 14, 10), i % 2 ? neutron : proton, Math.cos(phi) * r * 0.072, y * 0.072, Math.sin(phi) * r * 0.072);
  }
  const ringMat = mat(0xffffff, { transparent: true, opacity: 0.85, flatShading: false, emissive: 0x9cc9ff, emissiveIntensity: 0.3 });
  const eMat = mat(0x3b82f6, { emissive: 0x1d4ed8, emissiveIntensity: 0.7, flatShading: false });
  [
    { r: 0.27, n: 2, tilt: [1.2, 0, 0.3], speed: 1.6 },
    { r: 0.44, n: 4, tilt: [1.9, 0.6, -0.4], speed: -1.0 },
  ].forEach((o) => {
    const orbit = new THREE.Group();
    orbit.rotation.set(o.tilt[0], o.tilt[1], o.tilt[2]);
    atom.add(orbit);
    mesh(orbit, new THREE.TorusGeometry(o.r, 0.006, 6, 72), ringMat, 0, 0, 0, false);
    const pivot = new THREE.Group();
    orbit.add(pivot);
    for (let i = 0; i < o.n; i += 1) {
      const a = (i / o.n) * Math.PI * 2;
      mesh(pivot, new THREE.SphereGeometry(0.032, 14, 10), eMat, Math.cos(a) * o.r, Math.sin(a) * o.r, 0);
    }
    ctx.anims.push((dt) => {
      pivot.rotation.z += o.speed * dt;
    });
  });
  ctx.anims.push((dt) => {
    atom.rotation.y += 0.25 * dt;
  });
  ctx.mini("示意模型：電子環不是真實軌跡", 0.78, TOP + 1.12, 0);
}

/** 電解水示意：負極收集氫氣、正極收集氧氣，體積約 2:1 */
function buildDecompose(g, island, ctx) {
  house(g, { x: -0.05, z: -0.5, w: 0.56, h: 0.26, d: 0.26, roof: island.accent });
  const bz = 0.12;
  const by = TOP + 0.2;
  mesh(g, new THREE.BoxGeometry(0.98, 0.04, 0.44), mat(0xd9a36a), 0, by, bz);
  [[-0.44, -0.18], [0.44, -0.18], [-0.44, 0.18], [0.44, 0.18]].forEach(([x, z]) => {
    mesh(g, new THREE.BoxGeometry(0.035, 0.18, 0.035), mat(0x9b6a43), x, TOP + 0.09, bz + z);
  });
  const top = by + 0.02;
  const tx = -0.08;
  mesh(g, new THREE.BoxGeometry(0.5, 0.12, 0.26), glass(0xd8f3ff, 0.32), tx, top + 0.06, bz, false);
  mesh(g, new THREE.BoxGeometry(0.48, 0.09, 0.24), mat(0x52c1ea, { transparent: true, opacity: 0.72, roughness: 0.1, flatShading: false }), tx, top + 0.05, bz, false);

  const tubeH = 0.5;
  const tubeBottom = top + 0.05;
  const tubeTop = tubeBottom + tubeH;
  const tubes = [
    { x: tx - 0.12, gas: 0.26, count: 8, label: "氫氣 H₂（負極）" },
    { x: tx + 0.12, gas: 0.13, count: 4, label: "氧氣 O₂（正極）" },
  ];
  const bubbleMat = mat(0xffffff, { transparent: true, opacity: 0.9, flatShading: false });
  tubes.forEach((t) => {
    mesh(g, new THREE.CylinderGeometry(0.05, 0.05, tubeH, 18, 1, true), glass(0xeaf7ff, 0.3), t.x, tubeBottom + tubeH / 2, bz, false);
    mesh(g, new THREE.SphereGeometry(0.05, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass(0xeaf7ff, 0.3), t.x, tubeTop, bz, false);
    const liq = tubeH - t.gas;
    mesh(g, new THREE.CylinderGeometry(0.044, 0.044, liq, 16), mat(0x7fd3f2, { transparent: true, opacity: 0.55, flatShading: false }), t.x, tubeBottom + liq / 2, bz, false);
    mesh(g, new THREE.CylinderGeometry(0.044, 0.044, t.gas, 16), mat(0xffffff, { transparent: true, opacity: 0.35, flatShading: false }), t.x, tubeTop - t.gas / 2, bz, false);
    mesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), mat(0x4b5563, { metalness: 0.7, roughness: 0.3 }), t.x, tubeBottom + 0.02, bz);
    const start = tubeBottom + 0.06;
    const span = tubeTop - t.gas - start;
    const bubbles = Array.from({ length: t.count }, (_, i) => ({
      m: mesh(g, new THREE.SphereGeometry(0.011, 8, 6), bubbleMat, t.x, start, bz, false),
      phase: i / t.count,
    }));
    ctx.anims.push((dt, time) => {
      bubbles.forEach((b, i) => {
        const k = (time * 0.32 + b.phase) % 1;
        b.m.position.y = start + k * span;
        b.m.position.x = t.x + Math.sin(time * 6 + i) * 0.012;
      });
    });
    ctx.mini(t.label, t.x, tubeTop + 0.16, bz);
  });
  ctx.mini("氣體體積約 2：1", tx, top - 0.08, bz + 0.3);

  const batX = 0.34;
  mesh(g, new THREE.BoxGeometry(0.16, 0.11, 0.11), mat(0x334155), batX, top + 0.055, bz);
  mesh(g, new THREE.BoxGeometry(0.162, 0.035, 0.112), mat(0xf59e0b), batX, top + 0.06, bz);
  mesh(g, new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), mat(0xef4444), batX + 0.045, top + 0.125, bz);
  mesh(g, new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), mat(0x1f2937), batX - 0.045, top + 0.125, bz);
  const wire = (from, to, color) => {
    const pts = [
      new THREE.Vector3(from, top + 0.14, bz),
      new THREE.Vector3(from, top + 0.34, bz + 0.08),
      new THREE.Vector3(to + 0.02, top + 0.3, bz + 0.2),
      new THREE.Vector3(to, top + 0.09, bz + 0.13),
    ];
    mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.008, 6, false), mat(color, { flatShading: false }), 0, 0, 0);
  };
  wire(batX + 0.045, tubes[1].x, 0xef4444);
  wire(batX - 0.045, tubes[0].x, 0x1f2937);
}

function molecule(kind) {
  const g = new THREE.Group();
  const A = { H: [0xf8fafc, 0.045], O: [0xef4444, 0.07], C: [0x334155, 0.066] };
  const bondMat = mat(0xe5e7eb, { flatShading: false });
  const atom = (el, x, y) => mesh(g, new THREE.SphereGeometry(A[el][1], 16, 12), mat(A[el][0], { flatShading: false, roughness: 0.35 }), x, y, 0);
  const bond = (x1, y1, x2, y2, off = 0) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const c = mesh(g, new THREE.CylinderGeometry(0.014, 0.014, len, 8), bondMat, (x1 + x2) / 2, (y1 + y2) / 2, off);
    c.rotation.z = Math.atan2(-(x2 - x1), y2 - y1);
  };
  const double = (x1, y1, x2, y2) => {
    bond(x1, y1, x2, y2, 0.02);
    bond(x1, y1, x2, y2, -0.02);
  };
  if (kind === "O2") {
    atom("O", -0.065, 0);
    atom("O", 0.065, 0);
    double(-0.065, 0, 0.065, 0);
  } else if (kind === "CO2") {
    atom("C", 0, 0);
    atom("O", -0.13, 0);
    atom("O", 0.13, 0);
    double(-0.13, 0, 0, 0);
    double(0, 0, 0.13, 0);
  } else {
    const half = ((104.5 / 2) * Math.PI) / 180;
    const hx = Math.sin(half) * 0.1;
    const hy = -Math.cos(half) * 0.1;
    atom("O", 0, 0.02);
    atom("H", -hx, 0.02 + hy);
    atom("H", hx, 0.02 + hy);
    bond(0, 0.02, -hx, 0.02 + hy);
    bond(0, 0.02, hx, 0.02 + hy);
  }
  return g;
}

function buildMolecule(g, island, ctx) {
  const f = new THREE.Group();
  f.position.set(-0.1, TOP, -0.4);
  g.add(f);
  mesh(f, new THREE.BoxGeometry(0.7, 0.26, 0.3), mat(P.cream), 0, 0.13, 0);
  for (let i = 0; i < 3; i += 1) mesh(f, gable(0.24, 0.12, 0.3), mat(island.accent), -0.235 + i * 0.235, 0.26, 0);
  mesh(f, new THREE.CylinderGeometry(0.045, 0.055, 0.36, 10), mat(0xd9634a), 0.3, 0.42, -0.05);
  mesh(f, new THREE.CylinderGeometry(0.057, 0.057, 0.03, 10), mat(0xffffff), 0.3, 0.52, -0.05);
  mesh(f, new THREE.BoxGeometry(0.16, 0.15, 0.02), mat(0x475569), 0, 0.075, 0.151);
  const win = mat(0x9fd8ff, { emissive: 0x2a6f99, emissiveIntensity: 0.18, flatShading: false });
  [-0.24, -0.14, 0.14, 0.24].forEach((x) => mesh(f, new THREE.BoxGeometry(0.06, 0.06, 0.02), win, x, 0.17, 0.151));

  const cz = 0.24;
  const cy = TOP + 0.13;
  mesh(g, new THREE.BoxGeometry(1.2, 0.06, 0.22), mat(0x64748b), 0, cy, cz);
  mesh(g, new THREE.BoxGeometry(1.18, 0.012, 0.18), mat(0x1f2937, { roughness: 0.95 }), 0, cy + 0.036, cz);
  [[-0.5, -0.08], [0.5, -0.08], [-0.5, 0.08], [0.5, 0.08]].forEach(([x, z]) => {
    mesh(g, new THREE.BoxGeometry(0.03, 0.13, 0.03), mat(0x475569), x, TOP + 0.065, cz + z);
  });
  const beltY = cy + 0.042;
  const kinds = ["O2", "H2O", "CO2", "H2O", "O2", "CO2"];
  const mols = kinds.map((kind, i) => {
    const m = molecule(kind);
    m.position.set(0, beltY + (kind === "H2O" ? 0.09 : 0.072), cz);
    g.add(m);
    return { m, phase: i / kinds.length };
  });
  const place = (time) => {
    mols.forEach(({ m, phase }) => {
      const k = (time * 0.07 + phase) % 1;
      m.position.x = -0.56 + k * 1.12;
      m.scale.setScalar(Math.min(1, k * 9, (1 - k) * 9));
      m.rotation.y = time * 0.6 + phase * 6;
    });
  };
  place(0);
  ctx.anims.push((dt, time) => place(time));
  ctx.mini("球棍模型：O 紅、H 白、C 黑", 0, cy + 0.36, cz + 0.12);
}

function buildClassify(g, island, ctx) {
  house(g, { x: 0, z: -0.52, w: 0.42, h: 0.22, d: 0.22, roof: island.accent });
  const bz = 0.24;
  const binH = 0.15;
  const red = mat(0xef4444, { flatShading: false, roughness: 0.4 });
  const blue = mat(0x3b82f6, { flatShading: false, roughness: 0.4 });
  const ball = (m, x, z) => mesh(g, new THREE.SphereGeometry(0.034, 14, 10), m, x, TOP + binH + 0.02, z);
  [
    { x: -0.42, color: 0xa78bfa, label: "混合物", fill: (x) => [[red, -0.06, -0.04], [blue, 0.06, -0.04], [blue, -0.05, 0.05], [red, 0.06, 0.05]].forEach(([m, dx, dz]) => ball(m, x + dx, bz + dz)) },
    { x: 0, color: 0x60a5fa, label: "元素", fill: (x) => [[-0.035, -0.045], [0.035, -0.045], [-0.035, 0.05], [0.035, 0.05]].forEach(([dx, dz]) => ball(blue, x + dx, bz + dz)) },
    { x: 0.42, color: 0xf472b6, label: "化合物", fill: (x) => [[red, -0.035, -0.045], [blue, 0.035, -0.045], [red, -0.035, 0.05], [blue, 0.035, 0.05]].forEach(([m, dx, dz]) => ball(m, x + dx, bz + dz)) },
  ].forEach((bin) => {
    mesh(g, new THREE.BoxGeometry(0.3, binH, 0.24), mat(bin.color), bin.x, TOP + binH / 2, bz);
    mesh(g, new THREE.BoxGeometry(0.25, 0.006, 0.19), mat(darken(bin.color, 0.45)), bin.x, TOP + binH + 0.002, bz);
    bin.fill(bin.x);
    ctx.mini(bin.label, bin.x, TOP + 0.5, bz + 0.05);
  });

  const craneMat = mat(0xf59e0b);
  [-0.66, 0.66].forEach((x) => mesh(g, new THREE.BoxGeometry(0.05, 0.78, 0.05), craneMat, x, TOP + 0.39, bz));
  mesh(g, new THREE.BoxGeometry(1.38, 0.05, 0.07), craneMat, 0, TOP + 0.8, bz);
  const trolley = new THREE.Group();
  trolley.position.set(0, TOP + 0.76, bz);
  g.add(trolley);
  mesh(trolley, new THREE.BoxGeometry(0.1, 0.06, 0.1), mat(0x374151), 0, 0, 0);
  const cable = mesh(trolley, new THREE.CylinderGeometry(0.005, 0.005, 1, 4), mat(0x1f2937), 0, -0.15, 0);
  const claw = new THREE.Group();
  trolley.add(claw);
  mesh(claw, new THREE.BoxGeometry(0.07, 0.03, 0.07), mat(0x6b7280, { metalness: 0.5 }), 0, 0, 0);
  mesh(claw, new THREE.SphereGeometry(0.034, 14, 10), red, 0, -0.045, 0);
  const place = (time) => {
    trolley.position.x = Math.sin(time * 0.5) * 0.42;
    const drop = 0.2 + 0.08 * (0.5 + 0.5 * Math.sin(time * 1.1));
    claw.position.y = -drop;
    cable.scale.y = drop;
    cable.position.y = -drop / 2;
  };
  place(0);
  ctx.anims.push((dt, time) => place(time));
}

const LANDMARKS = {
  elements: buildElements,
  periodic: buildPeriodic,
  atom: buildAtom,
  decompose: buildDecompose,
  molecule: buildMolecule,
  classify: buildClassify,
};

const KEEPOUT = {
  elements: (x, z) => Math.hypot(x, z + 0.05) < 0.64,
  periodic: (x, z) => Math.abs(x) < 0.92 && Math.abs(z) < 0.34,
  atom: (x, z) => Math.hypot(x, z) < 0.52,
  decompose: (x, z) => Math.abs(x) < 0.56 && z > -0.68 && z < 0.4,
  molecule: (x, z) => Math.abs(x) < 0.66 && z > -0.62 && z < 0.4,
  classify: (x, z) => Math.abs(x) < 0.75 && z > -0.68 && z < 0.42,
};

export class WorldScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.reducedMotion = !!opts.reducedMotion;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.low = (navigator.hardwareConcurrency || 8) <= 4 || (coarse && Math.min(screen.width, screen.height) < 700);
    this.islands = new Map();
    this.anims = [];
    this.pickables = [];
    this.selectedId = null;
    this.hoverId = null;
    this.tween = null;
    this.time = 0;
    this.paused = false;
    this.running = true;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._down = null;
    this._moveXY = null;
    this._needsPick = false;
    this._interacted = false;
    this._acc = 0;

    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer = r;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.low ? 1.25 : 1.75));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    const sky = new THREE.Color(P.sky);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 25, 60);
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.08,
      enablePan: false,
      minDistance: 5,
      maxDistance: 30,
      minPolarAngle: 0.3,
      maxPolarAngle: 1.12,
      rotateSpeed: 0.7,
      zoomSpeed: 0.9,
    });

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = "isl-labels-layer";
    canvas.insertAdjacentElement("afterend", this.labelRenderer.domElement);

    this.pickMat = new THREE.MeshBasicMaterial({ visible: false });
    this.flagGray = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8 });
    this.flagGold = new THREE.MeshStandardMaterial({ color: 0xf5b301, roughness: 0.45, emissive: 0x7a5200, emissiveIntensity: 0.35 });

    this._buildLights();
    this._buildWater();
    this._buildIslands();
    this._buildHub();
    this._buildBridges();
    this._buildBoats();
    this._buildBirds();
    this._buildRings();
    this._bindEvents();
    this._resize();
    this.refreshStatus();
    if (opts.intro && !this.reducedMotion) this._intro();
    else this._applyHome();

    this._loop = this._loop.bind(this);
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(0xfff6e8, 0x7fd3d6, 0.85);
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.2);
    sun.position.set(7, 16, 9);
    sun.castShadow = true;
    const size = this.low ? 1024 : 2048;
    sun.shadow.mapSize.set(size, size);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 2, far: 42 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    const fill = new THREE.DirectionalLight(0xcfeeff, 0.45);
    fill.position.set(-8, 6, -6);
    this.scene.add(hemi, sun, sun.target, fill);
  }

  _buildWater() {
    const seg = this.low ? 90 : 140;
    const geo = new THREE.PlaneGeometry(240, 240, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const islands = ISLANDS.map((i) => {
      const p = axialToWorld(i.axial[0], i.axial[1]);
      return new THREE.Vector3(p.x, p.z, SHORE_R * COS30);
    });
    islands.push(new THREE.Vector3(0, 0, HUB_R * 1.1 * COS30));
    this.waterUniforms = {
      uTime: { value: 0 },
      uIsl: { value: islands },
      uDeep: { value: new THREE.Color(P.deep) },
      uShallow: { value: new THREE.Color(P.shallow) },
      uFoam: { value: new THREE.Color(P.foam) },
    };
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.02 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.waterUniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying vec3 vWPos;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vec4 wp0 = modelMatrix * vec4(transformed, 1.0);
          transformed.y += sin(wp0.x * 0.55 + uTime * 1.1) * 0.03 + cos(wp0.z * 0.65 + uTime * 0.9) * 0.03;
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uTime;
          uniform vec3 uIsl[${islands.length}];
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          varying vec3 vWPos;
          float hexD(vec2 p) { p = abs(p); return max(p.x, p.x * 0.5 + p.y * 0.8660254); }`
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float d = 1e3;
          for (int i = 0; i < ${islands.length}; i++) {
            vec3 isl = uIsl[i];
            d = min(d, hexD(vWPos.xz - isl.xy) - isl.z);
          }
          float shallow = 1.0 - smoothstep(0.0, 1.7, d);
          vec3 col = mix(uDeep, uShallow, shallow);
          float band = 1.0 - smoothstep(0.02, 0.17, d);
          float ripple = smoothstep(0.78, 1.0, sin(d * 9.0 - uTime * 2.2) * 0.5 + 0.5) * (1.0 - smoothstep(0.1, 0.95, d));
          float sparkle = smoothstep(0.965, 1.0, sin(vWPos.x * 1.7 + uTime * 0.8) * sin(vWPos.z * 1.5 - uTime * 0.6));
          col = mix(col, uFoam, clamp(band * 0.85 + ripple * 0.5 + sparkle * 0.16, 0.0, 1.0));
          diffuseColor.rgb = col;`
        );
    };
    const water = new THREE.Mesh(geo, m);
    water.receiveShadow = true;
    this.scene.add(water);
  }

  _mini(entry, parent, text, x, y, z) {
    const el = document.createElement("div");
    el.className = "isl-mini";
    el.textContent = text;
    const obj = new CSS2DObject(el);
    obj.position.set(x, y, z);
    parent.add(obj);
    entry.minis.push(el);
    return obj;
  }

  _makeLabel(island) {
    const anchor = document.createElement("div");
    anchor.className = "isl-anchor";
    anchor.setAttribute("aria-hidden", "true");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.tabIndex = -1;
    btn.className = "isl-tag";
    btn.dataset.island = island.id;
    btn.style.setProperty("--isl", island.color);
    btn.setAttribute("aria-label", `${island.index}. ${island.title}`);
    btn.innerHTML = `<span class="isl-tag-num">${pad(island.index)}</span><span class="isl-tag-text"><b>${island.title}</b><small>${island.subtitle}</small></span><span class="isl-tag-prog"></span><span class="isl-tag-star">${UI.star}</span>`;
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.opts.onIslandPick?.(island.id);
    });
    btn.addEventListener("pointerenter", () => this._setHover(island.id));
    btn.addEventListener("pointerleave", () => this._setHover(null));
    anchor.appendChild(btn);
    return { obj: new CSS2DObject(anchor), btn };
  }

  _buildIslands() {
    ISLANDS.forEach((island, idx) => {
      const { x, z } = axialToWorld(island.axial[0], island.axial[1]);
      const rand = rng(1000 + idx * 97);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      this.scene.add(group);
      const base = new THREE.Group();
      group.add(base);
      const entry = { island, group, base, pos: new THREE.Vector3(x, 0, z), minis: [], hop: -1 };
      this.islands.set(island.id, entry);

      const shore = prism(SHORE_R, 0.25, mat(P.sandTop, { flatShading: false }), mat(P.sandSide), 0.06);
      shore.position.y = -0.13;
      const dirt = prism(R * 0.985, 0.34, mat(P.dirt), mat(P.dirt), 0.04);
      dirt.position.y = 0.08;
      const grass = prism(R, 0.1, mat(P.grass, { flatShading: false }), mat(P.grassSide), 0.035);
      grass.position.y = 0.42;
      base.add(shore, dirt, grass);

      const neighbor = (o) => {
        const p = axialToWorld(o.axial[0], o.axial[1]);
        return Math.atan2(p.z - z, p.x - x);
      };
      const outward = Math.atan2(z, x);
      const dirs = [
        neighbor(ISLANDS[(idx + 1) % ISLANDS.length]),
        neighbor(ISLANDS[(idx + ISLANDS.length - 1) % ISLANDS.length]),
        outward,
      ];
      const pathMat = mat(P.path, { flatShading: false });
      dirs.forEach((a) => {
        const len = INR - 0.38;
        const rc = 0.38 + len / 2;
        const tile = mesh(base, new THREE.BoxGeometry(len, 0.02, 0.17), pathMat, Math.cos(a) * rc, TOP + 0.006, Math.sin(a) * rc);
        tile.rotation.y = -a;
      });
      if (island.id !== "periodic") {
        const plaza = prism(0.54, 0.03, mat(lighten(island.color, 0.62), { flatShading: false }), mat(lighten(island.color, 0.4)), 0.012);
        plaza.position.y = TOP - 0.005;
        base.add(plaza);
      }
      this._buildPier(base, outward, idx % 2 === 0, rand);

      const ctx = {
        rand,
        anims: this.anims,
        mini: (text, mx, my, mz) => this._mini(entry, base, text, mx, my, mz),
      };
      LANDMARKS[island.id](base, island, ctx);

      const flagA = outward + 0.62;
      const fx = Math.cos(flagA) * INR * 0.72;
      const fz = Math.sin(flagA) * INR * 0.72;
      const keep = KEEPOUT[island.id];
      const blocked = (px, pz) =>
        keep(px, pz) || Math.hypot(px - fx, pz - fz) < 0.17 || (island.id !== "periodic" && Math.hypot(px, pz) < 0.56);
      decorate(base, dirs, blocked, rand);
      this._buildFlag(entry, fx, fz, idx);

      const { obj, btn } = this._makeLabel(island);
      obj.position.set(0, island.labelY || 1.6, 0);
      base.add(obj);
      entry.label = btn;

      const h = (island.labelY || 1.6) + 0.2;
      const pickVol = new THREE.Mesh(new THREE.CylinderGeometry(SHORE_R, SHORE_R, h, 6), this.pickMat);
      pickVol.position.y = h / 2 - 0.1;
      pickVol.userData.islandId = island.id;
      group.add(pickVol);
      this.pickables.push(pickVol);
    });
  }

  _buildPier(base, angle, withBoat, rand) {
    const g = new THREE.Group();
    g.rotation.y = -angle;
    base.add(g);
    const step = mat(P.path);
    for (let i = 0; i < 3; i += 1) {
      mesh(g, new THREE.BoxGeometry(0.08, 0.06, 0.2), step, INR - 0.02 + i * 0.07, TOP - 0.1 - i * 0.1, 0);
    }
    const x0 = INR + 0.18;
    const len = 0.62;
    mesh(g, new THREE.BoxGeometry(len, 0.035, 0.2), mat(P.wood), x0 + len / 2, 0.2, 0);
    [x0 + 0.05, x0 + len - 0.03].forEach((px) =>
      [-0.09, 0.09].forEach((pz) => mesh(g, new THREE.CylinderGeometry(0.018, 0.018, 0.34, 6), mat(P.woodDark), px, 0.05, pz))
    );
    if (!withBoat) return;
    const boat = new THREE.Group();
    boat.position.set(x0 + len * 0.62, 0.02, 0.2);
    boat.rotation.y = 0.15;
    g.add(boat);
    mesh(boat, hullGeo(0.32, 0.13, 0.06), mat(pick(rand, [0xff8a65, 0x4fc3f7, 0xffd54f])), 0, 0, 0);
    mesh(boat, new THREE.BoxGeometry(0.03, 0.01, 0.11), mat(P.wood), 0, 0.072, 0);
    const phase = rand() * 6;
    this.anims.push((dt, t) => {
      boat.position.y = 0.02 + Math.sin(t * 1.7 + phase) * 0.015;
      boat.rotation.x = Math.sin(t * 1.3 + phase) * 0.05;
    });
  }

  _buildFlag(entry, fx, fz, idx) {
    const fg = new THREE.Group();
    fg.position.set(fx, TOP, fz);
    entry.base.add(fg);
    mesh(fg, new THREE.CylinderGeometry(0.05, 0.06, 0.03, 8), mat(0xd6cbb8), 0, 0.015, 0);
    mesh(fg, new THREE.CylinderGeometry(0.012, 0.016, 0.62, 6), mat(0xe5e7eb, { metalness: 0.5, roughness: 0.4 }), 0, 0.31, 0);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.54, 0);
    fg.add(pivot);
    entry.flagCloth = mesh(pivot, new THREE.BoxGeometry(0.24, 0.14, 0.01), this.flagGray, 0.12, 0, 0);
    entry.flagStar = mesh(fg, new THREE.OctahedronGeometry(0.035, 0), mat(0xf5b301, { metalness: 0.6, roughness: 0.3, emissive: 0x6b4a00, emissiveIntensity: 0.4 }), 0, 0.65, 0);
    this.anims.push((dt, t) => {
      pivot.rotation.y = Math.sin(t * 2.4 + idx) * 0.28;
      entry.flagStar.rotation.y += dt * 1.5;
    });
  }

  _buildHub() {
    const g = new THREE.Group();
    this.scene.add(g);
    const shore = prism(HUB_R * 1.1, 0.25, mat(P.sandTop, { flatShading: false }), mat(P.sandSide), 0.06);
    shore.position.y = -0.13;
    const dirt = prism(HUB_R * 0.985, 0.34, mat(P.dirt), mat(P.dirt), 0.04);
    dirt.position.y = 0.08;
    const grass = prism(HUB_R, 0.1, mat(P.grass, { flatShading: false }), mat(P.grassSide), 0.035);
    grass.position.y = 0.42;
    const plaza = prism(HUB_R * 0.62, 0.03, mat(0xf3e6d0, { flatShading: false }), mat(0xe5d5bb), 0.012);
    plaza.position.y = TOP - 0.005;
    g.add(shore, dirt, grass, plaza);

    const stripeA = mat(0xff7043);
    const stripeB = mat(P.cream);
    for (let i = 0; i < 4; i += 1) {
      mesh(g, new THREE.CylinderGeometry(0.15 - i * 0.015, 0.16 - i * 0.015, 0.13, 12), i % 2 ? stripeB : stripeA, 0, TOP + 0.065 + i * 0.13, 0);
    }
    mesh(g, new THREE.CylinderGeometry(0.17, 0.17, 0.025, 12), mat(0x334155), 0, TOP + 0.53, 0);
    mesh(g, new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), mat(0xfff1b8, { emissive: 0xffc94d, emissiveIntensity: 1.2, flatShading: false }), 0, TOP + 0.6, 0);
    mesh(g, new THREE.ConeGeometry(0.13, 0.12, 12), mat(0xe0532a), 0, TOP + 0.71, 0);
    const beams = new THREE.Group();
    beams.position.set(0, TOP + 0.6, 0);
    g.add(beams);
    const beamGeo = new THREE.ConeGeometry(0.22, 1.5, 18, 1, true);
    beamGeo.translate(0, -0.75, 0);
    beamGeo.rotateZ(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    [0, Math.PI].forEach((a) => {
      const b = new THREE.Mesh(beamGeo, beamMat);
      b.rotation.y = a;
      beams.add(b);
    });
    this.anims.push((dt) => {
      beams.rotation.y += dt * 0.6;
    });

    const sc = new Scatter();
    const rand = rng(77);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const rr = HUB_R * 0.74;
      if (i % 2) sc.push("bush", Math.cos(a) * rr, TOP, Math.sin(a) * rr, 1, rand() * 6, pick(rand, GREENS));
      else {
        sc.push("trunk", Math.cos(a) * rr, TOP, Math.sin(a) * rr, 0.75);
        sc.push("canopy", Math.cos(a) * rr, TOP, Math.sin(a) * rr, 0.75, rand() * 6, pick(rand, GREENS));
      }
    }
    sc.build(g);

    const anchor = document.createElement("div");
    anchor.className = "isl-anchor";
    anchor.setAttribute("aria-hidden", "true");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.tabIndex = -1;
    btn.className = "isl-tag is-hub";
    btn.innerHTML = `<span class="isl-tag-num is-light">${ICONS.lighthouse}</span><span class="isl-tag-text"><b>燈塔總挑戰</b><small class="isl-hub-note">混合 10 題</small></span>`;
    btn.setAttribute("aria-label", "燈塔總挑戰");
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.opts.onHubPick?.();
    });
    anchor.appendChild(btn);
    const obj = new CSS2DObject(anchor);
    obj.position.set(0, TOP + 1.05, 0);
    g.add(obj);
    this.hubLabel = btn;
    this.hubNote = btn.querySelector(".isl-hub-note");
  }

  _buildBridges() {
    const dummy = new THREE.Object3D();
    const planks = [];
    const posts = [];
    const railMat = mat(P.woodDark, { flatShading: false });
    const rise = 0.28;
    ISLANDS.forEach((a, i) => {
      const b = ISLANDS[(i + 1) % ISLANDS.length];
      const pa = axialToWorld(a.axial[0], a.axial[1]);
      const pb = axialToWorld(b.axial[0], b.axial[1]);
      const dx = pb.x - pa.x;
      const dz = pb.z - pa.z;
      const dist = Math.hypot(dx, dz);
      const ux = dx / dist;
      const uz = dz / dist;
      const inset = INR - 0.08;
      const sx = pa.x + ux * inset;
      const sz = pa.z + uz * inset;
      const len = dist - inset * 2;
      const yaw = Math.atan2(-uz, ux);
      const px = -uz;
      const pz = ux;
      const n = Math.max(8, Math.round(len / 0.085));
      const yAt = (t) => TOP - 0.03 + rise * 4 * t * (1 - t);
      for (let j = 0; j < n; j += 1) {
        const t = (j + 0.5) / n;
        const x = sx + ux * len * t;
        const z = sz + uz * len * t;
        const slope = (rise * 4 * (1 - 2 * t)) / len;
        dummy.position.set(x, yAt(t), z);
        dummy.rotation.set(0, yaw, Math.atan(slope), "YZX");
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        planks.push(dummy.matrix.clone());
        if (j % 3 === 0 || j === n - 1) {
          [-1, 1].forEach((side) => {
            dummy.position.set(x + px * 0.15 * side, yAt(t), z + pz * 0.15 * side);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            posts.push(dummy.matrix.clone());
          });
        }
      }
      [-1, 1].forEach((side) => {
        const pts = [];
        for (let k = 0; k <= 12; k += 1) {
          const t = k / 12;
          pts.push(new THREE.Vector3(sx + ux * len * t + px * 0.15 * side, yAt(t) + 0.14, sz + uz * len * t + pz * 0.15 * side));
        }
        mesh(this.scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.01, 5, false), railMat);
      });
    });
    const plankMesh = new THREE.InstancedMesh(GEO.plank, mat(P.wood), planks.length);
    planks.forEach((m, i) => plankMesh.setMatrixAt(i, m));
    const postMesh = new THREE.InstancedMesh(GEO.post, mat(P.woodDark), posts.length);
    posts.forEach((m, i) => postMesh.setMatrixAt(i, m));
    [plankMesh, postMesh].forEach((im) => {
      im.castShadow = true;
      im.receiveShadow = true;
      this.scene.add(im);
    });
  }

  _buildBoats() {
    [
      { r: 9.2, speed: 0.045, phase: 0.4, sail: 0x0ea5e9, exam: true },
      { r: 10.4, speed: -0.035, phase: 2.6, sail: 0xffffff },
      { r: 8.4, speed: 0.03, phase: 4.4, sail: 0xffd166 },
    ].forEach((s) => {
      const g = sailboat(s.sail);
      g.scale.setScalar(s.exam ? 1.9 : 1.5);
      this.scene.add(g);
      if (s.exam) {
        const pickBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), this.pickMat);
        pickBox.position.y = 0.3;
        pickBox.userData.islandId = "__boat";
        g.add(pickBox);
        this.pickables.push(pickBox);
        const anchor = document.createElement("div");
        anchor.className = "isl-anchor";
        anchor.setAttribute("aria-hidden", "true");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.tabIndex = -1;
        btn.className = "isl-tag is-boat";
        btn.innerHTML = `<span class="isl-tag-num is-boat">${UI.boat}</span><span class="isl-tag-text"><b>會考小船</b><small>會考題型</small></span>`;
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.opts.onBoatPick?.();
        });
        anchor.appendChild(btn);
        const label = new CSS2DObject(anchor);
        label.position.set(0, 0.75, 0);
        g.add(label);
      }
      const place = (t) => {
        const a = s.phase + t * s.speed;
        g.position.set(Math.cos(a) * s.r, 0.02 + Math.sin(t * 1.6 + s.phase) * 0.025, Math.sin(a) * s.r);
        const dir = Math.sign(s.speed);
        const tx = -Math.sin(a) * dir;
        const tz = Math.cos(a) * dir;
        g.rotation.set(Math.sin(t * 1.3 + s.phase) * 0.06, Math.atan2(-tz, tx), 0, "YXZ");
      };
      place(0);
      this.anims.push((dt, t) => place(t));
    });
  }

  _buildBirds() {
    const wm = mat(0xffffff);
    for (let i = 0; i < 4; i += 1) {
      const g = new THREE.Group();
      this.scene.add(g);
      mesh(g, new THREE.BoxGeometry(0.08, 0.025, 0.025), wm, 0, 0, 0, false);
      const left = new THREE.Group();
      const right = new THREE.Group();
      g.add(left, right);
      mesh(left, new THREE.BoxGeometry(0.03, 0.006, 0.14), wm, 0, 0, 0.07, false);
      mesh(right, new THREE.BoxGeometry(0.03, 0.006, 0.14), wm, 0, 0, -0.07, false);
      const radius = 3.6 + i * 1.1;
      const speed = 0.22 + i * 0.04;
      const phase = i * 1.7;
      const height = 3.3 + (i % 2) * 0.5;
      const place = (t) => {
        const a = phase + t * speed;
        g.position.set(Math.cos(a) * radius, height + Math.sin(t * 0.9 + phase) * 0.15, Math.sin(a) * radius);
        g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
        const flap = Math.sin(t * 9 + phase) * 0.5;
        left.rotation.x = -flap;
        right.rotation.x = flap;
      };
      place(0);
      this.anims.push((dt, t) => place(t));
    }
  }

  _buildRings() {
    const make = (inner, outer, opacity) => {
      const geo = new THREE.RingGeometry(inner, outer, 6, 1, Math.PI / 6);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false }));
      m.visible = false;
      m.renderOrder = 2;
      this.scene.add(m);
      return m;
    };
    this.selRing = make(SHORE_R * 1.06, SHORE_R * 1.18, 0.9);
    this.hoverRing = make(SHORE_R * 1.06, SHORE_R * 1.12, 0.55);
  }

  _bindEvents() {
    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);
    const c = this.canvas;
    this._onDown = (e) => {
      this._down = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (!this._interacted) {
        this._interacted = true;
        this.opts.onFirstInteract?.();
      }
    };
    this._onUp = (e) => {
      const d = this._down;
      this._down = null;
      if (!d) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7 || performance.now() - d.t > 650) return;
      const id = this._pick(e.clientX, e.clientY);
      if (id === "__boat") this.opts.onBoatPick?.();
      else if (id) this.opts.onIslandPick?.(id);
    };
    this._onMove = (e) => {
      if (e.pointerType === "touch") return;
      this._moveXY = [e.clientX, e.clientY];
      this._needsPick = true;
    };
    this._onLeave = () => {
      this._moveXY = null;
      this._setHover(null);
    };
    this._onStart = () => {
      this.tween = null;
    };
    c.addEventListener("pointerdown", this._onDown);
    c.addEventListener("pointerup", this._onUp);
    c.addEventListener("pointermove", this._onMove);
    c.addEventListener("pointerleave", this._onLeave);
    this.controls.addEventListener("start", this._onStart);
  }

  _pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    return hit ? hit.object.userData.islandId : null;
  }

  _setHover(id) {
    if (this.hoverId === id) return;
    this.hoverId = id;
    this.islands.forEach((e, key) => e.label.classList.toggle("is-hover", key === id));
    this.canvas.classList.toggle("is-pointer", !!id);
    const e = id ? this.islands.get(id) : null;
    if (e && id !== this.selectedId) {
      this.hoverRing.position.set(e.pos.x, 0.085, e.pos.z);
      this.hoverRing.visible = true;
    } else {
      this.hoverRing.visible = false;
    }
  }

  _fit() {
    const aspect = this.camera.aspect || 1.6;
    return THREE.MathUtils.clamp(24 * Math.max(1, 1.5 / aspect), 20, 50);
  }

  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const fit = this._fit();
    this.controls.maxDistance = fit * 1.3;
    this.scene.fog.near = fit * 1.2;
    this.scene.fog.far = fit * 2.8;
  }

  _applySpherical(tw, k) {
    const { from, to } = tw;
    const target = from.target.clone().lerp(to.target, k);
    const sph = new THREE.Spherical(
      from.r + (to.r - from.r) * k,
      from.phi + (to.phi - from.phi) * k,
      from.theta + (to.theta - from.theta) * k
    );
    this.camera.position.setFromSpherical(sph).add(target);
    this.controls.target.copy(target);
    this.camera.lookAt(target);
  }

  _tweenTo(to, dur, easing = ease.outCubic) {
    const s = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const tw = {
      t: 0,
      dur,
      ease: easing,
      from: { target: this.controls.target.clone(), r: s.radius, phi: s.phi, theta: s.theta },
      to: { target: to.target.clone(), r: to.r, phi: to.phi, theta: s.theta + angleDiff(to.theta, s.theta) },
    };
    if (this.reducedMotion || dur <= 0) {
      this._applySpherical(tw, 1);
      this.tween = null;
      return;
    }
    this.tween = tw;
  }

  _applyHome() {
    const sph = new THREE.Spherical(this._fit(), HOME.phi, HOME.theta);
    this.camera.position.setFromSpherical(sph).add(HOME.target);
    this.controls.target.copy(HOME.target);
    this.camera.lookAt(HOME.target);
  }

  _intro() {
    const sph = new THREE.Spherical(this._fit() * 1.25, 0.32, -0.85);
    this.camera.position.setFromSpherical(sph);
    this.controls.target.set(0, 0, 0);
    this.camera.lookAt(0, 0, 0);
    this._tweenTo({ target: HOME.target, r: this._fit(), phi: HOME.phi, theta: HOME.theta }, 2.6, ease.inOutCubic);
  }

  focus(id, { instant = false } = {}) {
    const e = this.islands.get(id);
    if (!e) return;
    this.selectedId = id;
    this.islands.forEach((other, key) => {
      other.label.classList.toggle("is-on", key === id);
      other.minis.forEach((el) => el.classList.toggle("is-show", key === id));
    });
    this.labelRenderer.domElement.classList.add("has-focus");
    this.selRing.material.color.set(e.island.color);
    this.selRing.position.set(e.pos.x, 0.09, e.pos.z);
    this.selRing.visible = true;
    this.hoverRing.visible = false;
    if (!this.reducedMotion && !instant) e.hop = 0;

    const theta = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target)).theta;
    const aspect = this.camera.aspect || 1.6;
    const wide = this.canvas.clientWidth >= 900;
    const target = new THREE.Vector3(e.pos.x, 0.4, e.pos.z);
    if (wide) target.add(new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta)).multiplyScalar(1.05));
    else target.add(new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta)).multiplyScalar(aspect < 0.9 ? 1.7 : 0.9));
    const radius = Math.min(18, 8.6 * Math.max(1, 1.15 / aspect));
    this._tweenTo({ target, r: radius, phi: 0.88, theta }, instant ? 0 : 1.15);
  }

  clearSelection() {
    this.selectedId = null;
    this.islands.forEach((e) => {
      e.label.classList.remove("is-on");
      e.minis.forEach((el) => el.classList.remove("is-show"));
    });
    this.labelRenderer.domElement.classList.remove("has-focus");
    this.selRing.visible = false;
  }

  resetView() {
    this.clearSelection();
    this._tweenTo({ target: HOME.target, r: this._fit(), phi: HOME.phi, theta: HOME.theta }, 1.3, ease.inOutCubic);
  }

  refreshStatus() {
    this.islands.forEach((e) => {
      const prog = islandProgress(e.island);
      e.label.classList.toggle("is-done", prog.complete);
      e.label.querySelector(".isl-tag-prog").textContent = prog.complete ? "" : `${prog.done}/${prog.total}`;
      e.flagCloth.material = prog.complete ? this.flagGold : this.flagGray;
      e.flagStar.visible = prog.complete;
    });
  }

  setHubNote(text) {
    if (this.hubNote) this.hubNote.textContent = text;
  }

  setPaused(value) {
    this.paused = value;
    if (!value) this._last = performance.now();
  }

  _update(dt) {
    if (this.tween) {
      this.tween.t += dt;
      const k = Math.min(1, this.tween.t / this.tween.dur);
      this._applySpherical(this.tween, this.tween.ease(k));
      if (k >= 1) this.tween = null;
    }
    if (!this.reducedMotion) {
      this.time += dt;
      this.waterUniforms.uTime.value = this.time;
      for (const fn of this.anims) fn(dt, this.time);
    }
    this.islands.forEach((e) => {
      if (e.hop < 0) return;
      e.hop += dt / 0.55;
      const k = Math.min(1, e.hop);
      e.base.position.y = Math.sin(Math.PI * k) * 0.16 * (1 - k * 0.4);
      if (k >= 1) {
        e.hop = -1;
        e.base.position.y = 0;
      }
    });
    if (this.selRing.visible) {
      const pulse = Math.sin(this.time * 3);
      this.selRing.scale.set(1 + pulse * 0.025, 1, 1 + pulse * 0.025);
      this.selRing.material.opacity = 0.65 + pulse * 0.25;
    }
    if (this._needsPick && this._moveXY && !this._down) {
      this._needsPick = false;
      this._setHover(this._pick(this._moveXY[0], this._moveXY[1]));
    }
  }

  _loop(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, Math.max(0, (now - this._last) / 1000));
    this._last = now;
    if (this.paused || document.hidden) return;
    let step = dt;
    if (this.low) {
      this._acc += dt;
      if (this._acc < 1 / 32) return;
      step = Math.min(0.05, this._acc);
      this._acc = 0;
    }
    this._update(step);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    const c = this.canvas;
    c.removeEventListener("pointerdown", this._onDown);
    c.removeEventListener("pointerup", this._onUp);
    c.removeEventListener("pointermove", this._onMove);
    c.removeEventListener("pointerleave", this._onLeave);
    this.controls.dispose();
    this.renderer.dispose();
    this.labelRenderer.domElement.remove();
  }
}
