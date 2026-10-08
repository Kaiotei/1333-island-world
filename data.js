// Everything on the map lives here. Edit this file, not world.js.
//
// Three rings, inside out:
//   core     - one centerpiece (the AngelGotchi device model is drawn for it)
//   platform - any number of small islands with a floating card each
//   signal   - up to 4 big showcase islands with orbiting media frames
//              (an island with id 'music' gets a spinning record instead)
//
// Node fields: id, ring, glyph, title, kicker?, tagline?, body[], built[]?,
//   media[]? ({ src, thumb, type: 'image' | 'video', title, ar }),
//   links[]? ({ label, href }), link? (id of a parent node, shown as "Part of ...").
// Deep links: index.html#<id> opens that island directly.
//
// This example maps the 13 <33 Covenant open-source apps.

const GH = 'https://github.com/Kaiotei/';
const T = (n, title, ar = 1) => ({ src: `assets/tile-${n}.svg`, thumb: `assets/tile-${n}.svg`, type: 'image', title, ar });

export const THEME = {
  biome: 'night',   // 'night' (mountains + water) or 'clouds' (daytime cloud sea)
};

export const ABOUT = {
  name: 'Island World',
  kicker: '✟ 13 &lt;33 COVENANT OPEN SOURCE ✟',
  brand: '✟ ISLANDS',
  brandSub: 'WORLD',
  role: 'A 3D portfolio and site map. Every project is an island.',
  lines: [
    'Swap the contents of data.js for your own work and the whole world rebuilds around it: islands, cards, labels, the index and the tour.',
    'This example maps the apps 13 &lt;33 Covenant released as open source.',
  ],
  links: [
    { label: 'GitHub', href: GH + '1333-island-world' },
    { label: '1333covenant.com', href: 'https://1333covenant.com' },
  ],
  footnote: 'AGPL-3.0 ◆ built with three.js',
};

export const RINGS = [
  { key: 'core', label: 'The Core', note: 'The centerpiece' },
  { key: 'platform', label: 'The Apps', note: 'Small tools and pages' },
  { key: 'signal', label: 'The Showcase', note: 'The big 3D pieces' },
];

export const NODES = [
  // ── CORE ─────────────────────────────────────────────────────────
  {
    id: 'angelgotchi', ring: 'core', glyph: '✟', title: 'AngelGotchi',
    kicker: 'Core ✦ the device at the center',
    tagline: 'A wearable digital pet that keeps you tethered to the light instead of the feed.',
    body: [
      'The procedural device in the middle of the map is drawn by world.js for whichever node sits in the core ring.',
      'Rename it, rewrite it, or replace angelgotchi() in world.js with your own centerpiece.',
    ],
    built: ['three.js', 'Procedural geometry', 'Canvas textures'],
  },

  // ── PLATFORM ─────────────────────────────────────────────────────
  { id: 'angelhub', ring: 'platform', glyph: '◐', title: 'angelHUB',
    tagline: 'A personal start page: clocks, weather, moon, lists, notes, music.',
    body: ['Draggable glass panels on a 24-column grid, a dock that opens apps in windows, and a music and ambient player.'],
    built: ['Gridstack', 'Open-Meteo', 'Web Audio'],
    links: [{ label: 'Repo', href: GH + '1333-angelhub' }] },
  { id: 'bible', ring: 'platform', glyph: '✧', title: 'Bible Study',
    tagline: 'A reader with reading plans, study notes and verse cards.',
    body: ['The full Bible in Basic English, offline-friendly, with a plain skin and a styled one.'],
    links: [{ label: 'Repo', href: GH + '1333-bible-study' }] },
  { id: 'moon', ring: 'platform', glyph: '☾', title: 'Moon Calendar',
    tagline: 'Moon phase, local weather and the church year.',
    body: ['Phase maths with no API, a month grid of phases and feast days, and a local barometer.'],
    links: [{ label: 'Repo', href: GH + '1333-moon-calendar' }] },
  { id: 'guestbook', ring: 'platform', glyph: '▤', title: 'Guestbook',
    tagline: 'A retro guestbook on Firebase Realtime Database.',
    body: ['Runs in localStorage demo mode until you paste in your own Firebase config.'],
    links: [{ label: 'Repo', href: GH + '1333-guestbook' }] },
  { id: 'chat', ring: 'platform', glyph: '✉', title: 'Chat Widget',
    tagline: 'A floating chat launcher for any page.',
    body: ['Lazy-loads a widget.st room on first open, remembers if it was open across pages.'],
    links: [{ label: 'Repo', href: GH + '1333-chat-widget' }] },
  { id: 'contrast', ring: 'platform', glyph: '◑', title: 'Contrast Check',
    tagline: 'WCAG contrast plus colour-blind simulation, in one script.',
    body: ['Tests text on translucent panels over the lightest thing behind them, which is where low contrast hides.'],
    links: [{ label: 'Repo', href: GH + '1333-contrast-check' }] },

  // ── SIGNAL (max 4) ───────────────────────────────────────────────
  { id: 'changingroom', ring: 'signal', glyph: '✦', title: 'Changing Room',
    tagline: 'A 3D dress-up viewer with procedurally built garments.',
    body: ['A faceless mannequin, garments generated from flat print images, sizes and colourways.'],
    media: [T(1, 'Tee'), T(2, 'Hoodie'), T(3, 'Pants')],
    links: [{ label: 'Repo', href: GH + '1333-changing-room' }] },
  { id: 'armor', ring: 'signal', glyph: '◈', title: 'The Whole Armor',
    tagline: 'A 3D game about the armour of God.',
    body: ['Fly the heavenly places and collect each piece of armour from Ephesians 6.'],
    media: [T(4, 'Realm'), T(5, 'Armour'), T(6, 'Sky')],
    links: [{ label: 'Repo', href: GH + '1333-whole-armor' }] },
  { id: 'music', ring: 'signal', glyph: '♫', title: 'Globe',
    tagline: 'A spinning holographic globe for a landing page.',
    body: ['One draw call each for land, halo, grid, arcs and city nodes. Shown here with the record-player island.'],
    media: [T(3, 'Cover'), T(1, 'Land'), T(2, 'Arcs')],
    links: [{ label: 'Repo', href: GH + '1333-globe' }] },
  { id: 'ladder', ring: 'signal', glyph: '☩', title: "Jacob's Ladder",
    tagline: 'A full-screen slide deck where the camera climbs a ladder of light.',
    body: ['Browse side to side; each slide lifts the camera one rung.'],
    media: [T(6, 'Rung'), T(4, 'Light'), T(5, 'Clouds')],
    links: [{ label: 'Repo', href: GH + '1333-jacobs-ladder' }] },
];
