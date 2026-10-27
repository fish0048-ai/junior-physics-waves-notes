import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ISLANDS, axialToWorld } from "./config.js?v=4";
import { getProgress, isCompleted } from "./progress.js?v=4";

const HEX_RADIUS = 1.12;

const MAT = {
  sand: new THREE.MeshStandardMaterial({ color: 0xf3d7a1, roughness: 0.92 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x7dbe6a, roughness: 0.86 }),
  clay: new THREE.MeshStandardMaterial({ color: 0xd7a574, roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xc4844a, roughness: 0.78 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3f8f4e, roughness: 0.8 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.72 }),
  water: new THREE.MeshStandardMaterial({ color: 0x3e9bb5, roughness: 0.35, metalness: 0.08 }),
  waterDeep: new THREE.MeshStandardMaterial({ color: 0x1f6f8a, roughness: 0.55 }),
};

function hexShape(radius) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const x = radius * Math.cos(a);
    const y = radius * Math.sin(a);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function matte(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04, ...extra });
}

function tree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.05 * scale, 0.18 * scale, 5), MAT.wood);
  trunk.position.y = 0.09 * scale;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 0.32 * scale, 6), MAT.leaf);
  crown.position.y = 0.3 * scale;
  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.11 * scale, 0.22 * scale, 6), matte(0x63b56a));
  crown2.position.y = 0.42 * scale;
  g.add(trunk, crown, crown2);
  g.position.set(x, 0.16, z);
  return g;
}

function pedestal(color, x, z) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.1, 6), MAT.cream);
  base.position.y = 0.05;
  const gemMat = matte(color, { metalness: 0.35, roughness: 0.28 });
  const gem = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), gemMat);
  gem.position.y = 0.18;
  g.add(base, gem);
  g.position.set(x, 0.16, z);
  return g;
}

function createIslandProp(island) {
  const g = new THREE.Group();
  const roof = matte(island.accent);
  const wall = MAT.cream;
  const accent = matte(island.color);

  if (island.id === "atom") {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.12, 8), wall);
    stand.position.y = 0.22;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), accent);
    core.position.y = 0.48;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 8, 28), roof);
    ring.rotation.x = Math.PI / 2.4;
    ring.position.y = 0.48;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), matte(0xdbeafe, { transparent: true, opacity: 0.45 }));
    dome.position.y = 0.42;
    g.add(stand, core, ring, dome);
  } else if (island.id === "periodic") {
    const heights = [0.28, 0.42, 0.34, 0.5, 0.36, 0.46];
    heights.forEach((h, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.2), wall);
      box.position.set(-0.24 + col * 0.24, 0.16 + h / 2, -0.08 + row * 0.26);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), i % 2 ? roof : accent);
      cap.position.set(box.position.x, 0.16 + h + 0.02, box.position.z);
      g.add(box, cap);
    });
  } else if (island.id === "decompose") {
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.36), MAT.wood);
    table.position.y = 0.24;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.08), MAT.clay);
    leg.position.y = 0.16;
    const flask = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), matte(0x93c5fd, { transparent: true, opacity: 0.85 }));
    flask.scale.y = 1.25;
    flask.position.set(-0.16, 0.4, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 8), matte(0xe0f2fe));
    neck.position.set(-0.16, 0.56, 0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), matte(0xfde68a, { emissive: 0xf59e0b, emissiveIntensity: 0.35 }));
    lamp.position.set(0.2, 0.46, 0);
    g.add(table, leg, flask, neck, lamp);
  } else if (island.id === "molecule") {
    const house = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.32), wall);
    house.position.set(-0.18, 0.3, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.18, 4), roof);
    cap.position.set(-0.18, 0.52, 0);
    cap.rotation.y = Math.PI / 4;
    const atoms = [
      [0.22, 0.4, 0, 0xef4444, 0.12],
      [0.4, 0.48, 0.08, 0x64748b, 0.08],
      [0.18, 0.5, -0.12, 0x64748b, 0.08],
    ];
    atoms.forEach(([x, y, z, color, r]) => {
      g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), matte(color)), { position: new THREE.Vector3(x, y, z) }));
    });
    g.add(house, cap);
  } else if (island.id === "elements") {
    g.add(pedestal(0xf6c445, -0.28, 0.08));
    g.add(pedestal(0xc46b3a, 0.02, -0.12));
    g.add(pedestal(0xf5e27a, 0.28, 0.12));
  } else {
    [[-0.22, 0.05, 0x93c5fd], [0.02, -0.08, 0xfca5a5], [0.24, 0.08, 0xcbd5e1]].forEach(([x, z, color]) => {
      const bin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.16), matte(color));
      bin.position.set(x, 0.22, z);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), matte(island.accent));
      ball.position.set(x, 0.34, z);
      g.add(bin, ball);
    });
  }
  return g;
}

function makeNameSprite(text, tint) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,248,238,0.96)";
  ctx.beginPath();
  ctx.roundRect(16, 28, 480, 104, 36);
  ctx.fill();
  ctx.fillStyle = tint || "#c2410c";
  ctx.fillRect(16, 28, 18, 104);
  ctx.fillStyle = "#3f2a1d";
  ctx.font = "700 64px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 80);
  const tex = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(1.7, 0.53, 1);
  sprite.position.y = 1.45;
  sprite.raycast = () => {};
  return sprite;
}

export class WorldScene {
  constructor(canvas, { onIslandPick, reducedMotion = false }) {
    this.canvas = canvas;
    this.onIslandPick = onIslandPick;
    this.reducedMotion = reducedMotion;
    this.islandMeshes = new Map();
    this.focusTarget = null;
    this.focusTween = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.running = true;
    this.paused = false;
    this.markerGroups = new Map();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = !reducedMotion;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb7ddf0);
    this.scene.fog = new THREE.Fog(0xf6e7cf, 22, 48);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
    this.camera.position.set(8, 9, 12);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 22;
    this.controls.maxPolarAngle = Math.PI / 2.35;
    this.controls.minPolarAngle = 0.35;
    this.controls.target.set(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xfff1dd, 0x6f8f72, 0.72);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4df, 1.15);
    sun.position.set(8, 16, 6);
    sun.castShadow = !reducedMotion;
    if (sun.castShadow) {
      sun.shadow.mapSize.set(1024, 1024);
    }
    this.scene.add(sun);

    this._buildSea();
    this._buildIslands();
    this._bindEvents();
    this._resize();
    this._animate();
  }

  _buildSea() {
    const deep = new THREE.Mesh(new THREE.CircleGeometry(46, 64), MAT.waterDeep);
    deep.rotation.x = -Math.PI / 2;
    deep.position.y = -0.22;
    const sea = new THREE.Mesh(new THREE.CircleGeometry(34, 64), MAT.water);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.12;
    this.scene.add(deep, sea);
    this.sea = sea;

    for (let i = 0; i < 7; i += 1) {
      const cloud = new THREE.Group();
      for (let p = 0; p < 3; p += 1) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.45 + p * 0.08, 10, 8), matte(0xfffaf3));
        puff.position.set(p * 0.45, 0, (p % 2) * 0.12);
        cloud.add(puff);
      }
      const angle = (i / 7) * Math.PI * 2;
      cloud.position.set(Math.cos(angle) * 11, 6.2 + (i % 3) * 0.4, Math.sin(angle) * 11);
      this.scene.add(cloud);
    }
  }

  _buildIslands() {
    const prog = getProgress();
    ISLANDS.forEach((island) => {
      const { x, z } = axialToWorld(island.axial[0], island.axial[1]);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.userData.islandId = island.id;

      const cliffGeo = new THREE.ExtrudeGeometry(hexShape(HEX_RADIUS), {
        depth: 0.42,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.06,
        bevelSegments: 1,
      });
      cliffGeo.rotateX(-Math.PI / 2);
      cliffGeo.translate(0, -0.28, 0);
      const cliff = new THREE.Mesh(cliffGeo, MAT.sand);
      cliff.castShadow = true;
      cliff.receiveShadow = true;
      group.add(cliff);

      const grassGeo = new THREE.ShapeGeometry(hexShape(HEX_RADIUS * 0.82));
      grassGeo.rotateX(-Math.PI / 2);
      const grass = new THREE.Mesh(grassGeo, MAT.grass);
      grass.position.y = 0.15;
      grass.receiveShadow = true;
      group.add(grass);

      const rugGeo = new THREE.CircleGeometry(0.34, 6);
      const rug = new THREE.Mesh(rugGeo, matte(island.color));
      rug.rotation.x = -Math.PI / 2;
      rug.position.y = 0.16;
      group.add(rug);

      group.add(tree(-0.72, 0.15, 0.85));
      group.add(tree(0.62, -0.55, 0.7));

      const prop = createIslandProp(island);
      group.add(prop);
      const label = makeNameSprite(`${String(island.index).padStart(2, "0")} ${island.shortTitle || island.title}`, island.accent);
      label.position.y = 1.55;
      group.add(label);

      this._syncMarkers(group, island, prog);

      this.scene.add(group);
      this.islandMeshes.set(island.id, group);
    });

    const bridgeMat = MAT.wood;
    for (let i = 0; i < ISLANDS.length; i += 1) {
      const a = ISLANDS[i];
      const b = ISLANDS[(i + 1) % ISLANDS.length];
      const pa = axialToWorld(a.axial[0], a.axial[1]);
      const pb = axialToWorld(b.axial[0], b.axial[1]);
      const mid = new THREE.Vector3((pa.x + pb.x) / 2, 0.05, (pa.z + pb.z) / 2);
      const len = Math.hypot(pb.x - pa.x, pb.z - pa.z);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(len * 0.85, 0.06, 0.18), bridgeMat);
      plank.position.copy(mid);
      plank.lookAt(pb.x, 0.05, pb.z);
      this.scene.add(plank);
    }

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.52, 0.22, 6),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 })
    );
    hub.position.y = 0.08;
    this.scene.add(hub);
    const hubLabel = makeNameSprite("第6章");
    hubLabel.position.y = 0.85;
    this.scene.add(hubLabel);
  }

  _syncMarkers(group, island, prog) {
    const old = this.markerGroups.get(island.id);
    if (old) group.remove(old);
    const markers = new THREE.Group();
    if (prog.visited.includes(island.id)) {
      const flag = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
      );
      flag.position.set(0.55, 0.55, 0.35);
      markers.add(flag);
    }
    if (island.taskId && isCompleted(island.taskId)) {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.12, 0),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x14532d, emissiveIntensity: 0.35 })
      );
      star.position.set(-0.45, 0.75, 0.35);
      markers.add(star);
    }
    group.add(markers);
    this.markerGroups.set(island.id, markers);
  }

  refreshCompletionMarkers() {
    const prog = getProgress();
    ISLANDS.forEach((island) => {
      const group = this.islandMeshes.get(island.id);
      if (group) this._syncMarkers(group, island, prog);
    });
  }

  setPaused(value) {
    this.paused = value;
  }

  _bindEvents() {
    this._onResize = () => this._resize();
    window.addEventListener("resize", this._onResize);

    this._down = null;
    this._onDown = (ev) => {
      this._down = { x: ev.clientX, y: ev.clientY };
    };
    this._onPointer = (ev) => {
      if (!this._down) return;
      const dx = ev.clientX - this._down.x;
      const dy = ev.clientY - this._down.y;
      this._down = null;
      if (dx * dx + dy * dy > 36) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects([...this.islandMeshes.values()], true);
      if (!hits.length) return;
      let obj = hits[0].object;
      while (obj && !obj.userData.islandId && obj.parent) obj = obj.parent;
      const id = obj?.userData?.islandId;
      if (id) this.onIslandPick(id);
    };
    this.canvas.addEventListener("pointerdown", this._onDown);
    this.canvas.addEventListener("pointerup", this._onPointer);
  }

  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  highlightIsland(id) {
    this.islandMeshes.forEach((group, islandId) => {
      const scale = islandId === id ? 1.06 : 1;
      group.scale.set(scale, scale, scale);
    });
    this.focusOn(id);
  }

  focusOn(islandId) {
    const group = this.islandMeshes.get(islandId);
    if (!group) return;
    const target = group.position.clone();
    target.y = 0.2;
    const fromTarget = this.controls.target.clone();
    const fromPos = this.camera.position.clone();
    const offset = new THREE.Vector3(3.2, 4.5, 3.2);
    const toPos = target.clone().add(offset);

    if (this.reducedMotion) {
      this.controls.target.copy(target);
      this.camera.position.copy(toPos);
      return;
    }

    this.focusTarget = { fromTarget, toTarget: target, fromPos, toPos, t: 0 };
  }

  resetView() {
    this.focusTarget = {
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0),
      fromPos: this.camera.position.clone(),
      toPos: new THREE.Vector3(8, 9, 12),
      t: 0,
    };
    this.islandMeshes.forEach((group) => group.scale.set(1, 1, 1));
  }

  _animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this._animate());
    if (this.paused) return;

    if (this.focusTarget) {
      this.focusTarget.t = Math.min(1, this.focusTarget.t + 0.035);
      const k = 1 - Math.pow(1 - this.focusTarget.t, 3);
      this.controls.target.lerpVectors(this.focusTarget.fromTarget, this.focusTarget.toTarget, k);
      this.camera.position.lerpVectors(this.focusTarget.fromPos, this.focusTarget.toPos, k);
      if (this.focusTarget.t >= 1) this.focusTarget = null;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    window.removeEventListener("resize", this._onResize);
    this.canvas.removeEventListener("pointerdown", this._onDown);
    this.canvas.removeEventListener("pointerup", this._onPointer);
    this.controls.dispose();
    this.renderer.dispose();
  }
}

export function probeWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("webgl2"));
  } catch {
    return false;
  }
}
