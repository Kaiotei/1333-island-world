# Island World

A data-driven 3D portfolio and site map. Every project is a floating island around a centerpiece.

**Live demo:** https://kaiotei.github.io/1333-island-world/

Built by [Kaiotei](https://github.com/Kaiotei) for [13 <33 Covenant](https://1333covenant.com) and released as one of its open-source apps.

## Features

- Orbit camera pinned to the current island, slowly turning on its own. Drag to turn and tilt, pinch or scroll to zoom.
- Swipe left or right (or arrow keys, or a sideways trackpad swipe) to move between islands.
- Two biomes: `night` (mountains, water, spires, crystals) and `clouds` (a daytime cloud sea).
- Guided tour, index rail, case-study panel with a media grid and lightbox, deep links (`#island-id`).
- Map labels that declutter by priority as you zoom out, and a no-WebGL fallback where the index becomes the page.
- All geometry is procedural; no model files.

## Run it

```sh
python -m http.server 8000
# then open http://localhost:8000/
```
It uses ES modules, so it has to be served; opening the file directly will not work.

## Make it yours

Everything lives in **`data.js`**: `THEME.biome`, the intro copy (`ABOUT`), the three rings (`RINGS`) and the islands (`NODES`). The comment at the top of that file documents every field. `world.js` holds the engine and both biomes; add a biome by adding an entry to `BIOMES`.

The example data maps the other 13 <33 Covenant open-source apps. The tiles in `assets/` are placeholders.

**Stack:** three.js r185 (from unpkg), vanilla JS modules, no build step.

## License

[AGPL-3.0](LICENSE). You can use, change and build on this. If you run a modified version for others over a network, you must share its source under the same license. Keep the credit to 13 <33 Covenant.

## More from 13 <33 Covenant

[1333-changing-room](https://github.com/Kaiotei/1333-changing-room) · [1333-whole-armor](https://github.com/Kaiotei/1333-whole-armor) · [1333-globe](https://github.com/Kaiotei/1333-globe) · [1333-jacobs-ladder](https://github.com/Kaiotei/1333-jacobs-ladder) · [1333-angelhub](https://github.com/Kaiotei/1333-angelhub) · [1333-bible-study](https://github.com/Kaiotei/1333-bible-study) · [1333-moon-calendar](https://github.com/Kaiotei/1333-moon-calendar) · [1333-guestbook](https://github.com/Kaiotei/1333-guestbook) · [1333-chat-widget](https://github.com/Kaiotei/1333-chat-widget) · [1333-contrast-check](https://github.com/Kaiotei/1333-contrast-check)
