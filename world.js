// The explorable world. Three rings of floating islands around AngelGotchi,
// over a procedural landscape. All geometry is procedural: no model files to load.
// createWorld({ canvas, onSelect, onHover, biome }) returns
// { enter, focus, overview, step, setViewShift, current, onUserMove, onSwipe }.
// biome: 'night' (mountains, water, spires, crystals) or 'clouds' (daytime cloud sea).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NODES, RINGS } from './data.js?v=1';

const C = {
  ink: '#322036', mauve: '#96799c', purple: '#9B6CD8', light: '#c4a8e8',
  lighter: '#e0ccf8', teal: '#84c4c4', white: '#ffffff',
};
const R = { platform: 17, signal: 33 };
const Y = { core: 0, platform: 1.5, signal: 3 };
const SIGNAL_ANGLES = [Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75, Math.PI * 0.25];
const DISPLAY = "basiic, 'MS UI Gothic', Arial, sans-serif";
const BODY = "'MS UI Gothic', Arial, sans-serif";

const dec = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

// ── canvas helpers ────────────────────────────────────────────────
function canvasTex(cv, renderer) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function wrap(g, text, x, y, maxW, lh, maxLines) {
  const words = text.split(' ');
  let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) {
      if (++n === maxLines) { g.fillText(line.replace(/\s*\S*$/, '') + '...', x, y); return; }
      g.fillText(line, x, y); y += lh; line = words[i];
    } else line = test;
  }
  g.fillText(line, x, y);
}

// App card: the site's lavender chrome, glyph, name, tagline.
function cardTexture(node, renderer) {
  const W = 512, H = 640, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, C.lighter); grad.addColorStop(1, C.light);
  roundRect(g, 8, 8, W - 16, H - 16, 36); g.fillStyle = grad; g.fill();
  g.lineWidth = 8; g.strokeStyle = C.purple; g.stroke();
  roundRect(g, 30, 30, W - 60, 270, 24); g.fillStyle = C.ink; g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = C.lighter; g.font = `170px ${BODY}`;
  g.fillText(node.glyph, W / 2, 172);
  g.fillStyle = C.teal; g.font = `26px ${DISPLAY}`;
  g.fillText('✦ ✦ ✦', W / 2, 268);
  g.fillStyle = C.ink; g.font = `50px ${DISPLAY}`;
  g.textBaseline = 'alphabetic';
  wrap(g, dec(node.title), W / 2, 372, W - 70, 52, 2);
  g.font = `28px ${BODY}`; g.fillStyle = C.ink;
  wrap(g, dec(node.tagline || ''), W / 2, 470, W - 90, 34, 3);
  roundRect(g, W / 2 - 90, H - 92, 180, 50, 25); g.fillStyle = C.mauve; g.fill();
  g.fillStyle = C.white; g.font = `24px ${DISPLAY}`; g.textBaseline = 'middle';
  g.fillText('OPEN ►', W / 2, H - 66);
  return canvasTex(cv, renderer);
}

function labelSprite(title, sub, renderer, scale = 1) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const g = cv.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = C.ink; g.shadowBlur = 18;
  g.fillStyle = C.white; g.font = `92px ${DISPLAY}`;
  g.fillText(dec(title), 512, 104);
  if (sub) { g.fillStyle = C.teal; g.font = `40px ${DISPLAY}`; g.fillText(dec(sub), 512, 196); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(cv, renderer), depthWrite: false, transparent: true }));
  s.scale.set(8 * scale, 2 * scale, 1);
  return s;
}

// Map label: fixed screen size at any altitude (sizeAttenuation off).
// Canvas is sized to the text so the sprite's aspect is its real footprint (used by declutter).
function mapLabel(text, renderer, color = C.white, px = 0.036) {
  const H = 64, font = `40px ${DISPLAY}`;
  const cv = document.createElement('canvas');
  let g = cv.getContext('2d');
  g.font = font;
  cv.width = Math.ceil(g.measureText(text).width + 24); cv.height = H;
  g = cv.getContext('2d');
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 7; g.strokeStyle = C.ink; g.lineJoin = 'round';
  g.strokeText(text, cv.width / 2, H / 2 + 2);
  g.fillStyle = color; g.fillText(text, cv.width / 2, H / 2 + 2);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: canvasTex(cv, renderer), sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true, opacity: 0,
  }));
  s.scale.set(px * cv.width / H, px, 1);
  s.renderOrder = 10;
  s.userData.fade = 0;
  return s;
}

// ── terrain ──────────────────────────────────────────────────────
function valueNoise(seed) {
  const h = (x, z) => {
    const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const sm = t => t * t * (3 - 2 * t);
  return (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = sm(x - xi), zf = sm(z - zi);
    const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
    return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
  };
}

function mountainHeight(R) {
  const n = valueNoise(13), ridge = valueNoise(29);
  const band = (r, c, w) => Math.exp(-((r - c) * (r - c)) / (w * w));
  return (x, z) => {
    const r = Math.hypot(x, z);
    let f = 0, amp = 1, fr = 0.035;
    for (let o = 0; o < 5; o++) { f += (n(x * fr, z * fr) - 0.5) * amp; amp *= 0.5; fr *= 2.03; }
    const rg = 1 - Math.abs(ridge(x * 0.02, z * 0.02) * 2 - 1);
    const mount = THREE.MathUtils.smoothstep(r, 48, 120);
    let y = -10 + f * 5 + mount * (10 + rg * rg * 26 + f * 10);
    y -= 1.6 * band(r, R.platform, 3.2) + 1.8 * band(r, R.signal, 3.6) + 4 * band(r, 0, 10);
    return y;
  };
}

// A sea of clouds: low rounded billows that thicken into banks toward the horizon.
function cloudHeight(R) {
  const n = valueNoise(41), puff = valueNoise(57);
  const band = (r, c, w) => Math.exp(-((r - c) * (r - c)) / (w * w));
  return (x, z) => {
    const r = Math.hypot(x, z);
    let f = 0, amp = 1, fr = 0.03;
    for (let o = 0; o < 4; o++) { f += (n(x * fr, z * fr) - 0.5) * amp; amp *= 0.5; fr *= 2.1; }
    const p = puff(x * 0.06, z * 0.06);
    const bank = THREE.MathUtils.smoothstep(r, 60, 130) * 6;
    let y = -11 + f * 3 + p * p * 3.2 + bank;
    y -= 1.2 * band(r, R.platform, 3.2) + 1.4 * band(r, R.signal, 3.6) + 3 * band(r, 0, 10);
    return y;
  };
}

// Jitter a geometry by position hash (seam duplicates move together, no cracks).
function lumpy(geo, base, spread, squash) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = base + hash3(p.getX(i).toFixed(2) * 1, p.getY(i).toFixed(2) * 1, p.getZ(i).toFixed(2) * 1) * spread;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * squash, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// ── biomes: everything about the look that is not the islands themselves ──
const BIOMES = {
  night: {
    height: mountainHeight, water: -11.2, islandTop: C.lighter,
    fog: () => new THREE.Color(C.ink).lerp(new THREE.Color(C.mauve), 0.3),
    sky: { top: C.ink, mid: C.mauve, band: C.purple, additive: true },
    hemi: [C.lighter, C.ink, 1.3],
    ground(y, ny, tc, k) {
      const t = THREE.MathUtils.clamp((y - this.water) / 38, 0, 1);
      if (t < 0.08) tc.copy(k.teal).lerp(k.mauve, t / 0.08);
      else if (t < 0.45) tc.copy(k.mauve).lerp(k.light, (t - 0.08) / 0.37);
      else tc.copy(k.light).lerp(k.lighter, (t - 0.45) / 0.55);
      tc.lerp(k.ink, THREE.MathUtils.clamp((0.82 - ny) * 1.6, 0, 0.6));
    },
    groundMat: { roughness: 0.95, flatShading: true },
    line: C.lighter, linkOpacity: 0.28,
    props(scatter) {
      B.props(scatter);

  // Ring roads draped over the ground, with fixed-size names for the map view.
  const mapLabels = [];  // { s, prio, id? }
  const ringMat = new THREE.LineBasicMaterial({ color: B.line, transparent: true, opacity: 0.55 });
  const ringLabels = { platform: RINGS[1], signal: RINGS[2] };
  for (const key of ['platform', 'signal']) {
    const r = R[key], pts = [];
    for (let k = 0; k < 256; k++) {
      const a = (k / 256) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      pts.push(new THREE.Vector3(x, Math.max(heightAt(x, z), WATER ?? -Infinity) + 0.25, z));
    }
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
    const s = mapLabel(dec(ringLabels[key].label).toUpperCase(), renderer, C.teal, 0.03);
    s.position.set(0, heightAt(0, -r - 3) + 1, -r - 3);
    scene.add(s);
    mapLabels.push({ s, prio: 3 });
  }

  // ── nodes ──────────────────────────────────────────────────────
  const hits = [];
  const items = [];  // per node: { node, group, base, focus, dist, ... }
  const byId = {};
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  function addHit(group, radius, y, node) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), hitMat);
    m.position.y = y; m.userData.id = node.id;
    group.add(m); hits.push(m);
  }

  // core
  const coreNode = NODES.find(n => n.ring === 'core');
  const coreGroup = new THREE.Group();
  coreGroup.add(island(5.4, 6.5, 3));
  const gotchi = angelgotchi(renderer);
  gotchi.group.position.y = 3.4;
  coreGroup.add(gotchi.group);
  const coreLabel = labelSprite(coreNode.title.toUpperCase(), RINGS[0].label.toUpperCase(), renderer, 1.1);
  coreLabel.position.y = 8.6;
  coreGroup.add(coreLabel);
  addHit(coreGroup, 4.6, 3.4, coreNode);
  scene.add(coreGroup);
  const coreItem = { node: coreNode, group: coreGroup, base: new THREE.Vector3(0, Y.core, 0), bigLabel: coreLabel, labelY: 10.5, focusY: 3.6, dist: 15, phase: 0, scale: 1, hover: 0 };
  items.push(coreItem); byId[coreNode.id] = coreItem;

  // platform
  const plat = NODES.filter(n => n.ring === 'platform');
  const angleStep = (Math.PI * 2) / plat.length;
  plat.forEach((node, i) => {
    const a = Math.PI / 2 + (i - 1) * angleStep;
    const group = new THREE.Group();
    const base = new THREE.Vector3(Math.cos(a) * R.platform, Y.platform, Math.sin(a) * R.platform);
    group.position.copy(base);
    group.add(island(1.55, 2.6, 11 + i));
    const card = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.1, 0.08), new THREE.MeshStandardMaterial({ color: C.purple, roughness: 0.4, metalness: 0.3 }));
    back.position.z = -0.05;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshBasicMaterial({ map: cardTexture(node, renderer), transparent: true, toneMapped: false }));
    card.add(back, face);
    card.position.y = 2.15;
    group.add(card);
    addHit(group, 2.1, 1.9, node);
    scene.add(group);
    const it = { node, group, base, card, labelY: 4.4, focusY: 2.1, dist: 7.2, phase: i * 1.7, scale: 1, hover: 0 };
    items.push(it); byId[node.id] = it;
  });

  // signal
  const sig = NODES.filter(n => n.ring === 'signal');
  sig.forEach((node, i) => {
    const a = SIGNAL_ANGLES[i % SIGNAL_ANGLES.length];
    const group = new THREE.Group();
    const base = new THREE.Vector3(Math.cos(a) * R.signal, Y.signal, Math.sin(a) * R.signal);
    group.position.copy(base);
    group.add(island(2.8, 4.2, 41 + i));
    const label = labelSprite(node.title.toUpperCase(), RINGS[2].label.toUpperCase(), renderer, 0.75);
    label.position.y = 6.4;
    group.add(label);

    const frames = [];
    const media = (node.media || []).slice(0, 8);
    const orbit = new THREE.Group();
    orbit.position.y = 2.4;
    group.add(orbit);
    let vinylDisc = null, bars = null;
    if (node.id === 'music' && media.length) {
      vinylDisc = vinyl(loadTex(media[0].thumb), renderer);
      vinylDisc.position.y = 2.6;
      group.add(vinylDisc);
      bars = [];
      const barMat = new THREE.MeshStandardMaterial({ color: C.teal, emissive: C.teal, emissiveIntensity: 0.4 });
      for (let b = 0; b < 12; b++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.16), barMat);
        const ba = (b / 12) * Math.PI * 2;
        m.position.set(Math.cos(ba) * 1.9, 0.1, Math.sin(ba) * 1.9);
        group.add(m); bars.push(m);
      }
    }
    const list = vinylDisc ? media.slice(1) : media;
    list.forEach((m, k) => {
      const h = 1.5, w = Math.min(2.6, h * (m.ar || 1));
      const f = new THREE.Group();
      const border = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.12, h + 0.12), new THREE.MeshBasicMaterial({ color: C.lighter, side: THREE.DoubleSide }));
      border.position.z = -0.01;
      const tex = m.thumb ? loadTex(m.thumb) : glyphTexture('►', renderer);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      f.add(border, pic);
      const fa = (k / list.length) * Math.PI * 2;
      f.userData = { a: fa, y: Math.sin(k * 2.1) * 0.9, r: 3.9 + (k % 2) * 0.5 };
      orbit.add(f); frames.push(f);
    });
    addHit(group, 4.6, 2.4, node);
    scene.add(group);
    const it = { node, group, base, orbit, frames, vinylDisc, bars, bigLabel: label, labelY: 7.6, focusY: 2.6, dist: 12.5, phase: i * 2.3, scale: 1, hover: 0 };
    items.push(it); byId[node.id] = it;
  });

  // Map labels: every node's title, readable from the bird's-eye view.
  const PRIO = { core: 0, signal: 1, platform: 2 };
  items.forEach(it => {
    const s = mapLabel(dec(it.node.title), renderer, it.node.ring === 'signal' ? C.lighter : C.white);
    s.position.y = it.labelY;
    it.group.add(s);
    mapLabels.push({ s, prio: PRIO[it.node.ring], id: it.node.id });
  });

  // ── connections: core feeds the platform, the signal feeds the core ──
  const coreOut = new THREE.Vector3(0, 3.4, 0);
  items.forEach(it => {
    if (it.node.ring === 'core') return;
    const end = it.base.clone().add(new THREE.Vector3(0, 0.3, 0));
    const mid = coreOut.clone().lerp(end, 0.5); mid.y += it.node.ring === 'signal' ? 9 : 5;
    const curve = new THREE.QuadraticBezierCurve3(coreOut, mid, end);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
    const signal = it.node.ring === 'signal';
    const mat = signal
      ? new THREE.LineDashedMaterial({ color: C.teal, dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0.55 })
      : new THREE.LineBasicMaterial({ color: B.line, transparent: true, opacity: B.linkOpacity });
    const line = new THREE.Line(geo, mat);
    if (signal) line.computeLineDistances();
    scene.add(line);
  });

  // ── camera travel ──────────────────────────────────────────────
  let tween = null, current = null, entered = false, userMove = null, swipeCb = null;
  const shift = { x: 0, y: 0, tx: 0, ty: 0 };

  // Zoom range is opened up for the flight, then snapped around the new subject.
  // Drag is off mid-flight so the camera always lands on its subject.
  function flyTo(pos, tgt, dur, zoom) {
    controls.minDistance = 0.1;
    controls.maxDistance = 800;
    controls.enabled = false;
    controls.autoRotate = false;
    clearTimeout(spinTimer);
    tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: tgt, s: 0, d: reduced ? 0.001 : dur, zoom };
  }
  // Bird's-eye: near top-down, far enough that the outer ring fits the short side.
  function overviewPose() {
    const aspect = camera.aspect || 1;
    const d = 104 / Math.min(1, aspect);
    return { pos: new THREE.Vector3(0, d * 0.97, d * 0.24), tgt: new THREE.Vector3(0, -2, 0), d };
  }
  function overview() {
    current = null;
    const o = overviewPose();
    flyTo(o.pos, o.tgt, 1.6, [o.d * 0.6, o.d * 1.3]);
  }
  function focus(id) {
    const it = byId[id];
    if (!it) return;
    current = id;
    const tgt = it.base.clone(); tgt.y += it.focusY;
    let dir;
    if (it.node.ring === 'core') {
      dir = new THREE.Vector3(camera.position.x, 0, camera.position.z);
      if (dir.lengthSq() < 1) dir.set(0, 0, 1);
    } else dir = new THREE.Vector3(it.base.x, 0, it.base.z);
    dir.normalize();
    const pos = tgt.clone().addScaledVector(dir, it.dist);
    pos.y += it.dist * 0.28;
    flyTo(pos, tgt, 1.5, [it.dist * 0.55, it.dist * 2.2]);
    onSelect && onSelect(it.node);
  }
  const order = items.map(it => it.node.id);
  function step(d) {
    const i = current ? order.indexOf(current) : (d > 0 ? -1 : 0);
    focus(order[(i + d + order.length) % order.length]);
  }
  function enter(id) {
    entered = true;
    controls.enabled = true;
    if (id && byId[id]) focus(id); else overview();
  }

  controls.addEventListener('start', () => {
    clearTimeout(spinTimer);
    controls.autoRotate = false;
    userMove && userMove();
  });
  // the slow turn picks up again a few seconds after the visitor lets go
  controls.addEventListener('end', () => {
    clearTimeout(spinTimer);
    spinTimer = setTimeout(() => { controls.autoRotate = spinWanted; }, 3000);
  });

  // ── picking + swipe ────────────────────────────────────────────
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null, pointer = null, down = null, pointers = 0;
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hits, false)[0];
    return hit ? hit.object.userData.id : null;
  }
  function swipe(d) { if (swipeCb) swipeCb(d); else step(d); }
  canvas.addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' }; });
  canvas.addEventListener('pointerleave', () => { pointer = null; });
  canvas.addEventListener('pointerdown', e => {
    pointers++;
    if (pointers > 1) { if (down) down.multi = true; return; }   // pinch, not a swipe
    down = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false };
  });
  const lift = () => { pointers = Math.max(0, pointers - 1); };
  canvas.addEventListener('pointercancel', () => { lift(); down = null; });
  canvas.addEventListener('pointerup', e => {
    lift();
    if (!down || !entered) { if (!pointers) down = null; return; }
    if (pointers) return;   // wait for the last finger
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t;
    if (!down.multi) {
      if (Math.hypot(dx, dy) < 7 && dt < 600) {
        const id = pick(e.clientX, e.clientY);
        if (id) focus(id);
      } else if (e.pointerType !== 'mouse' && dt < 400 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swipe(dx < 0 ? 1 : -1);   // swipe left = next island
      }
    }
    down = null;
  });
  // trackpad: a sideways two-finger swipe moves between islands too
  let wheelX = 0, wheelBlock = 0;
  canvas.addEventListener('wheel', e => {
    if (!entered || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) { wheelX = 0; return; }
    const now = performance.now();
    if (now < wheelBlock) return;
    wheelX += e.deltaX;
    if (Math.abs(wheelX) > 60) {
      swipe(wheelX > 0 ? 1 : -1);
      wheelX = 0; wheelBlock = now + 700;
    }
  }, { passive: true });

  // ── resize ─────────────────────────────────────────────────────
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyShift();
  }
  function applyShift() {
    const w = innerWidth, h = innerHeight;
    if (Math.abs(shift.x) < 0.5 && Math.abs(shift.y) < 0.5) camera.clearViewOffset();
    else camera.setViewOffset(w, h, shift.x, shift.y, w, h);
  }
  addEventListener('resize', resize);
  resize();

  // ── loop ───────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const placed = [];
  let hoverFrame = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const bob = reduced ? 0 : 1;

    if (tween) {
      tween.s = Math.min(1, tween.s + dt / tween.d);
      const e = ease(tween.s);
      camera.position.lerpVectors(tween.p0, tween.p1, e);
      camera.position.y += Math.sin(Math.PI * e) * tween.p0.distanceTo(tween.p1) * 0.08;
      controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (tween.s >= 1) {
        controls.minDistance = tween.zoom[0];
        controls.maxDistance = tween.zoom[1];
        controls.enabled = entered;
        controls.autoRotate = spinWanted;
        tween = null;
      }
    }
    controls.update();

    // hover, sampled every other frame
    if (entered && pointer && !pointer.touch && (hoverFrame++ & 1) === 0) {
      const id = pick(pointer.x, pointer.y);
      if (id !== hovered) {
        hovered = id;
        canvas.style.cursor = id ? 'pointer' : '';
      }
      onHover && onHover(id ? byId[id].node : null, pointer.x, pointer.y);
    } else if (!pointer && hovered) {
      hovered = null; canvas.style.cursor = ''; onHover && onHover(null);
    }

    for (const it of items) {
      const target = (hovered === it.node.id || current === it.node.id) ? 1 : 0;
      it.hover += (target - it.hover) * Math.min(1, dt * 8);
      it.group.position.y = it.base.y + Math.sin(t * 0.7 + it.phase) * 0.3 * bob;
      if (it.card) {
        it.card.rotation.y = Math.atan2(camera.position.x - it.group.position.x, camera.position.z - it.group.position.z);
        it.card.scale.setScalar(1 + it.hover * 0.12);
      }
      if (it.orbit) {
        it.orbit.rotation.y = t * 0.12 * bob + it.phase;
        for (const f of it.frames) {
          const u = f.userData;
          f.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t + u.a * 3) * 0.15 * bob, Math.sin(u.a) * u.r);
          f.getWorldPosition(tmp);
          f.rotation.y = Math.atan2(camera.position.x - tmp.x, camera.position.z - tmp.z) - it.orbit.rotation.y;
          f.scale.setScalar(1 + it.hover * 0.08);
        }
      }
      if (it.vinylDisc) {
        it.vinylDisc.rotation.y = Math.atan2(camera.position.x - it.group.position.x, camera.position.z - it.group.position.z);
        it.vinylDisc.children[0].rotation.y = t * 1.6 * bob;
        it.vinylDisc.children[1].rotation.z = -t * 1.6 * bob;
        it.bars.forEach((b, k) => {
          const h = 0.3 + Math.abs(Math.sin(t * 3 + k * 1.3) * Math.sin(t * 1.7 + k)) * 1.6 * bob;
          b.scale.y = h; b.position.y = 0.05 + h / 2;
        });
      }
      for (const s of it.group.children[0].userData.shards || []) {
        s.rotation.y = t * 0.6 + s.userData.phase;
        s.rotation.x = t * 0.4;
      }
    }

    // AngelGotchi faces the viewer, with a little lag and wobble
    const want = Math.atan2(camera.position.x, camera.position.z) + Math.sin(t * 0.5) * 0.18 * bob;
    let dy = want - gotchi.group.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    gotchi.group.rotation.y += dy * Math.min(1, dt * 2.2);
    gotchi.update(t, reduced);

    // Map labels fade in with altitude, then declutter by priority like a map:
    // a label that would overlap one already placed waits until you zoom in.
    const mapOn = THREE.MathUtils.smoothstep(camera.position.distanceTo(controls.target), 30, 50);
    for (const it of items) if (it.bigLabel) it.bigLabel.material.opacity = 1 - mapOn;
    placed.length = 0;
    const pxPer = innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    for (let pass = 0; pass < 2; pass++) {
      for (const L of mapLabels) {
        const first = L.id && (L.id === current || L.id === hovered);
        if ((pass === 0) !== !!first) continue;
        let want = 0;
        if (mapOn > 0) {
          L.s.getWorldPosition(tmp).project(camera);
          if (tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1) {
            const x = (tmp.x * 0.5 + 0.5) * innerWidth, y = (0.5 - tmp.y * 0.5) * innerHeight;
            const w = L.s.scale.x * pxPer * 0.47, h = L.s.scale.y * pxPer * 0.4;
            if (!placed.some(b => Math.abs(b.x - x) < b.w + w && Math.abs(b.y - y) < b.h + h)) {
              placed.push({ x, y, w, h });
              want = mapOn;
            }
          }
        }
        const u = L.s.userData;
        u.fade += (want - u.fade) * Math.min(1, dt * 8);
        L.s.material.opacity = u.fade;
        L.s.visible = u.fade > 0.01;
      }
    }

    shift.x += (shift.tx - shift.x) * Math.min(1, dt * 6);
    shift.y += (shift.ty - shift.y) * Math.min(1, dt * 6);
    applyShift();

    renderer.render(scene, camera);
  });

  return {
    enter, focus, overview, step,
    current: () => current,
    onUserMove(fn) { userMove = fn; },
    onSwipe(fn) { swipeCb = fn; },
    setViewShift(x, y) { shift.tx = x; shift.ty = y; },
  };
}
