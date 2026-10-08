// DOM side of the world: intro, index rail, case panel, lightbox, keys, swipe, deep links.
// Works without WebGL too: the rail becomes the page and panels still open.

import { NODES, RINGS, ABOUT, THEME } from './data.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/"/g, '&quot;');
const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
const ringOf = key => RINGS.find(r => r.key === key);
const narrow = () => matchMedia('(max-width: 760px)').matches;

let world = null;
let openId = null;

// ── intro ─────────────────────────────────────────────────────────
function buildIntro() {
  document.body.dataset.biome = THEME.biome;
  document.title = ABOUT.name;
  $('#introKicker').innerHTML = ABOUT.kicker || '';
  $('#introTitle').innerHTML = ABOUT.name;
  $('#introVerse').innerHTML = ABOUT.footnote || '';
  $('#brand').innerHTML = `<b>${ABOUT.brand || ABOUT.name}</b><span>${ABOUT.brandSub || ''}</span>`;
  const apps = NODES.filter(n => n.ring === 'platform').length;
  $('#introRole').innerHTML = ABOUT.role;
  $('#introLines').innerHTML = ABOUT.lines.map(l => `<p>${l}</p>`).join('');
  $('#introStats').innerHTML = [
    [String(NODES.length), 'places on the map'], [String(apps), RINGS[1].label.toLowerCase()], [String(NODES.filter(n => n.ring === 'signal').length), 'showcase islands'],
  ].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');
  $('#introRings').innerHTML = RINGS.map((r, i) =>
    `<li><i class="dot r${i}"></i><b>${r.label}</b> ${r.note}</li>`).join('');
  $('#introLinks').innerHTML = ABOUT.links.map(l => `<a href="${esc(l.href)}">${l.label}</a>`).join('<span>◆</span>');
}

// ── rail ─────────────────────────────────────────────────────────
function buildRail() {
  $('#railList').innerHTML = RINGS.map((r, i) => {
    const nodes = NODES.filter(n => n.ring === r.key);
    return `<section><h3><i class="dot r${i}"></i>${r.label}</h3><p class="note">${r.note}</p>` +
      nodes.map(n => `<button class="rail-item" data-id="${n.id}"><span class="g">${n.glyph}</span>${n.title}</button>`).join('') +
      '</section>';
  }).join('');
  $('#railList').addEventListener('click', e => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    select(b.dataset.id);
    if (narrow()) document.body.classList.remove('rail-open');
  });
}

function markRail(id) {
  document.querySelectorAll('.rail-item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
}

// ── panel ────────────────────────────────────────────────────────
function mediaTile(m, i) {
  const thumb = m.thumb
    ? `<img loading="lazy" src="${esc(m.thumb)}" alt="${esc(m.title)}">`
    : `<video muted preload="metadata" src="${esc(m.src)}#t=0.5"></video>`;
  return `<button class="tile${m.type === 'video' ? ' vid' : ''}" data-i="${i}" title="${esc(m.title)}">${thumb}</button>`;
}

function renderPanel(n) {
  const ring = ringOf(n.ring);
  const order = NODES.map(x => x.id);
  const i = order.indexOf(n.id);
  const prev = byId[order[(i - 1 + order.length) % order.length]];
  const next = byId[order[(i + 1) % order.length]];
  const eco = n.ring === 'core' ? NODES.filter(x => x.link === n.id) : [];
  const parent = n.link ? byId[n.link] : null;

  $('#panelBody').innerHTML = `
    <p class="kicker">${ring.label} <span>◆</span> ${n.kicker || ring.note}</p>
    <h2><span class="g">${n.glyph}</span>${n.title}</h2>
    ${n.tagline ? `<p class="tagline">${n.tagline}</p>` : ''}
    ${(n.body || []).map(p => `<p>${p}</p>`).join('')}
    ${parent ? `<p class="rel">Part of the <button class="jump" data-id="${parent.id}">${parent.glyph} ${parent.title}</button> ecosystem.</p>` : ''}
    ${eco.length ? `<h3>Ecosystem</h3><div class="chips">${eco.map(x => `<button class="chip jump" data-id="${x.id}">${x.glyph} ${x.title}</button>`).join('')}</div>` : ''}
    ${n.built ? `<h3>Built</h3><div class="chips">${n.built.map(b => `<span class="chip">${b}</span>`).join('')}</div>` : ''}
    ${n.media && n.media.length ? `<h3>Work <span class="count">${n.media.length}</span></h3><div class="grid">${n.media.map(mediaTile).join('')}</div>` : ''}
    ${n.links ? `<div class="links">${n.links.map(l => `<a class="btn" href="${esc(l.href)}">${l.label} ►</a>`).join('')}</div>` : ''}
    <nav class="pn">
      <button class="jump" data-id="${prev.id}">◄ ${prev.title}</button>
      <button class="jump" data-id="${next.id}">${next.title} ►</button>
    </nav>`;
  $('#panelBody').scrollTop = 0;
}

function openPanel(n) {
  openId = n.id;
  renderPanel(n);
  document.body.classList.add('panel-open');
  $('#panel').setAttribute('aria-hidden', 'false');
  markRail(n.id);
  history.replaceState(null, '', '#' + n.id);
  updateShift();
  if (tour && TOUR[tour.i] !== n.id) followTour(n.id);
}

function closePanel(toOverview = true) {
  if (!openId) return;
  openId = null;
  document.body.classList.remove('panel-open');
  $('#panel').setAttribute('aria-hidden', 'true');
  markRail(null);
  history.replaceState(null, '', location.pathname + location.search);
  updateShift();
  if (toOverview && world) world.overview();
}

function select(id) {
  if (!byId[id]) return;
  if (world) world.focus(id);   // world calls back into openPanel
  else openPanel(byId[id]);
}

// Keep the focused island in the clear part of the screen.
function updateShift() {
  if (!world) return;
  if (narrow()) {
    const sheet = openId ? $('#panel').getBoundingClientRect().height : 0;
    world.setViewShift(0, openId ? Math.min(sheet, innerHeight * 0.62) * 0.5 : 0);
    return;
  }
  const panel = openId ? $('#panel').offsetWidth : 0;
  const rail = document.body.classList.contains('entered') ? $('#rail').offsetWidth : 0;
  world.setViewShift((panel - rail) / 2, 0);
}

// ── lightbox ─────────────────────────────────────────────────────
let lb = null;
function openLightbox(list, i) {
  lb = { list, i };
  document.body.classList.add('lb-open');
  showLightbox();
}
function showLightbox() {
  const m = lb.list[lb.i];
  $('#lbStage').innerHTML = m.type === 'video'
    ? `<video src="${esc(m.src)}" controls autoplay loop playsinline></video>`
    : `<img src="${esc(m.src)}" alt="${esc(m.title)}">`;
  $('#lbCap').textContent = `${m.title}  ·  ${lb.i + 1} / ${lb.list.length}`;
}
function stepLightbox(d) { lb.i = (lb.i + d + lb.list.length) % lb.list.length; showLightbox(); }
function closeLightbox() {
  lb = null;
  document.body.classList.remove('lb-open');
  $('#lbStage').innerHTML = '';
}

// ── tooltip ──────────────────────────────────────────────────────
function hover(n, x, y) {
  const tip = $('#tip');
  if (!n) { tip.hidden = true; return; }
  tip.hidden = false;
  tip.innerHTML = `<b>${n.glyph} ${n.title}</b>${n.tagline ? `<span>${n.tagline}</span>` : ''}`;
  const w = tip.offsetWidth;
  tip.style.transform = `translate(${Math.min(x + 16, innerWidth - w - 12)}px, ${y + 18}px)`;
}

// ── guided tour ──────────────────────────────────────────────────
// Stop -1 is the bird's-eye map, then every node in NODES order.
const TOUR = NODES.map(n => n.id);
const TOUR_DWELL = 9000;
let tour = null;

function startTour() {
  if (lb) closeLightbox();
  document.body.classList.remove('rail-open');
  document.body.classList.add('touring');
  $('#btnTour').classList.add('on');
  tour = { i: -1, auto: true, timer: 0 };
  showStop();
}
function showStop() {
  clearTimeout(tour.timer);
  if (tour.i < 0) { closePanel(false); world && world.overview(); }
  else select(TOUR[tour.i]);
  renderTour();
  schedule();
}
function schedule() {
  clearTimeout(tour.timer);
  if (tour.auto) tour.timer = setTimeout(() => stepTour(1), TOUR_DWELL);
}
function stepTour(d) {
  const n = TOUR.length + 1;
  tour.i = ((tour.i + 1 + d + n) % n) - 1;
  showStop();
}
function pauseTour() {
  if (!tour || !tour.auto) return;
  tour.auto = false;
  clearTimeout(tour.timer);
  renderTour();
}
function toggleAuto() {
  tour.auto = !tour.auto;
  renderTour();
  schedule();
}
// The visitor picked a stop themselves: continue the tour from there, paused.
function followTour(id) {
  if (!tour) return;
  const i = TOUR.indexOf(id);
  if (i >= 0) tour.i = i;
  pauseTour();
  renderTour();
}
function endTour() {
  if (!tour) return;
  clearTimeout(tour.timer);
  tour = null;
  document.body.classList.remove('touring');
  $('#btnTour').classList.remove('on');
}
function renderTour() {
  const n = byId[TOUR[tour.i]];
  $('#tourStep').innerHTML = tour.i < 0
    ? `<b>THE MAP</b><span>${RINGS.map(r => r.label).join(' ◆ ')}</span>`
    : `<b>${n.glyph} ${n.title}</b><span>${tour.i + 1} / ${TOUR.length} ◆ ${ringOf(n.ring).label}</span>`;
  $('#tourAuto').textContent = tour.auto ? '❚❚' : '►';
  $('#tourAuto').setAttribute('aria-label', tour.auto ? 'Pause tour' : 'Play tour');
}

// ── wiring ───────────────────────────────────────────────────────
function enter() {
  document.body.classList.add('entered');
  $('#intro').setAttribute('aria-hidden', 'true');
  const id = location.hash.slice(1);
  if (world) world.enter(byId[id] ? id : null);
  else if (byId[id]) openPanel(byId[id]);
  updateShift();
}

function wire() {
  $('#enter').addEventListener('click', enter);
  $('#panelClose').addEventListener('click', () => { pauseTour(); closePanel(); });
  $('#btnOverview').addEventListener('click', () => { pauseTour(); closePanel(false); world && world.overview(); });
  $('#btnIndex').addEventListener('click', () => document.body.classList.toggle('rail-open'));
  $('#btnTour').addEventListener('click', () => (tour ? endTour() : startTour()));
  $('#tourPrev').addEventListener('click', () => stepTour(-1));
  $('#tourNext').addEventListener('click', () => stepTour(1));
  $('#tourAuto').addEventListener('click', toggleAuto);
  $('#tourEnd').addEventListener('click', endTour);
  $('#panelBody').addEventListener('wheel', pauseTour, { passive: true });
  $('#panelBody').addEventListener('touchmove', pauseTour, { passive: true });
  $('#btnAbout').addEventListener('click', () => {
    endTour();
    closePanel(false);
    document.body.classList.remove('entered');
    $('#intro').setAttribute('aria-hidden', 'false');
    $('#enter').focus();
  });
  $('#panelBody').addEventListener('click', e => {
    const j = e.target.closest('.jump');
    if (j) { select(j.dataset.id); return; }
    const t = e.target.closest('.tile');
    if (t && openId) { pauseTour(); openLightbox(byId[openId].media, +t.dataset.i); }
  });
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => stepLightbox(-1));
  $('#lbNext').addEventListener('click', () => stepLightbox(1));
  $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox' || e.target.id === 'lbStage') closeLightbox(); });

  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (lb) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') stepLightbox(1);
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      return;
    }
    if (!document.body.classList.contains('entered')) {
      if (e.key === 'Enter' && document.activeElement === document.body) enter();
      return;
    }
    if (e.key === 'Escape') {
      if (document.body.classList.contains('rail-open')) document.body.classList.remove('rail-open');
      else if (tour) endTour();
      else closePanel();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const d = e.key === 'ArrowRight' ? 1 : -1;
      if (tour) stepTour(d);
      else if (world) world.step(d);
      else {
        const order = NODES.map(n => n.id);
        const i = openId ? order.indexOf(openId) : -1;
        select(order[(i + d + order.length) % order.length]);
      }
    }
  });
  addEventListener('resize', updateShift);
}

async function boot() {
  buildIntro();
  buildRail();
  wire();
  // Canvas text needs the display font loaded before the textures are drawn.
  await Promise.race([
    Promise.all([document.fonts.load('40px basiic'), document.fonts.load('16px "8bitfont"')]),
    new Promise(r => setTimeout(r, 2500)),
  ]).catch(() => {});
  try {
    const { createWorld } = await import('./world.js');
    world = createWorld({
      canvas: $('#world'),
      onSelect: n => openPanel(n),
      onHover: hover,
      biome: THEME.biome,
    });
    world.onUserMove(pauseTour);
    world.onSwipe(d => (tour ? stepTour(d) : world.step(d)));
  } catch (err) {
    console.error('3D world unavailable, using the index view.', err);
    document.body.classList.add('no-webgl');
  }
  document.body.classList.add('ready');
  $('#enter').disabled = false;
}

boot();
