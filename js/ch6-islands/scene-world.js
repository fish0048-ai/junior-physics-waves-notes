import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ISLANDS, axialToWorld } from "./config.js";
import { getProgress, isCompleted } from "./progress.js";

const HEX_RADIUS = 1.05;

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

function createHexTop(color) {
  const geo = new THREE.ShapeGeometry(hexShape(HEX_RADIUS));
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
  return new THREE.Mesh(geo, mat);
}

function createIslandProp(island) {
  const g = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({
    color: island.accent,
    roughness: 0.7,
    metalness: 0.1,
  });
  const matLight = new THREE.MeshStandardMaterial({
    color: island.color,
    roughness: 0.65,
    metalness: 0.08,
  });

  if (island.id === "atom") {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), matLight);
    core.position.y = 0.55;
    g.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 8, 24), matBody);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    g.add(ring);
    const ring2 = ring.clone();
    ring2.rotation.z = Math.PI / 3;
    g.add(ring2);
  } else if (island.id === "periodic") {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const h = 0.12 + (row + col) * 0.04;
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), matLight);
        box.position.set(-0.28 + col * 0.19, h / 2 + 0.08, -0.12 + row * 0.19);
        g.add(box);
      }
    }
  } else if (island.id === "decompose") {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), matBody);
    tube.position.set(-0.2, 0.33, 0);
    g.add(tube);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), matLight);
    bulb.position.set(0.25, 0.45, 0.1);
    g.add(bulb);
  } else if (island.id === "molecule") {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), matLight);
    a.position.set(0, 0.35, 0);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), matBody);
    b.position.set(0.22, 0.42, 0);
    const c = b.clone();
    c.position.set(-0.2, 0.42, 0.08);
    g.add(a, b, c);
  } else {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.45), matLight);
    block.position.y = 0.25;
    g.add(block);
  }
  return g;
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

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0xb8dce8, 28, 55);

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

    const hemi = new THREE.HemisphereLight(0xfff5e6, 0x4a7c59, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(6, 14, 4);
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
    const sea = new THREE.Mesh(
      new THREE.CircleGeometry(40, 48),
      new THREE.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.95, metalness: 0.05 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.08;
    this.scene.add(sea);
  }

  _buildIslands() {
    const prog = getProgress();
    ISLANDS.forEach((island) => {
      const { x, z } = axialToWorld(island.axial[0], island.axial[1]);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.userData.islandId = island.id;

      const top = createHexTop(island.color);
      top.receiveShadow = true;
      top.castShadow = true;
      group.add(top);

      const cliff = new THREE.Mesh(
        new THREE.CylinderGeometry(HEX_RADIUS * 0.92, HEX_RADIUS * 1.05, 0.35, 6),
        new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.9 })
      );
      cliff.position.y = -0.2;
      group.add(cliff);

      const prop = createIslandProp(island);
      group.add(prop);

      this._syncMarkers(group, island, prog);

      this.scene.add(group);
      this.islandMeshes.set(island.id, group);
    });

    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.85 });
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

    this._onPointer = (ev) => {
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
