# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Clone of the classic arcade game **Asteroids**, built with plain HTML5 Canvas and vanilla JavaScript (ES6+). No build tools, no bundler, no package manager, no dependencies. The entire game logic lives in a single file: `game.js`.

## Running

No build step. Either:
- Open `index.html` directly in a browser, or
- Serve locally: `npx serve .` then visit `http://localhost:3000`

There is no test suite, linter, or package.json in this repo. Verify changes by loading the page in a browser and playing the game.

## Architecture

`game.js` is structured as a single procedural file with clearly delimited sections (look for `// ── Section ──` comment dividers):

1. **Input** — `keys` (held) and `justPressed` (edge-triggered) maps populated by `keydown`/`keyup` listeners. Use `pressed(code)` to consume a one-shot press (e.g. shooting), and `keys[code]` directly for continuous state (e.g. rotation/thrust).
2. **Audio** — lazily-created single `AudioContext` (`getAudioCtx()`), with procedural sound synthesis via oscillators (e.g. `playShootSound()`). No audio files/assets.
3. **Utils** — `wrap` (toroidal wraparound), `dist`, `rand`, `randInt`.
4. **Entity classes** — `Bullet`, `Asteroid`, `Ship`, `Particle`. Each has its own `update(dt)` and `draw()`. All entities mark themselves `dead = true` rather than removing themselves from arrays; arrays are filtered each frame in `update()`.
5. **Game state** — module-level mutable variables (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state`, `deadTimer`). `state` is one of `'playing' | 'dead' | 'gameover'`. There is no class/object wrapping this — it's a flat global state machine.
6. **Update loop** (`update(dt)`) — branches on `state` first. Handles input → physics update → collision detection (bullet-vs-asteroid, ship-vs-asteroid) → level progression (`nextLevel()` when `asteroids.length === 0`).
7. **Draw loop** (`draw()`) — clears canvas, draws entities back-to-front (particles → asteroids → bullets → ship), then HUD/overlays.
8. **Main loop** (`loop(ts)`) — `requestAnimationFrame` loop computing `dt` in seconds, clamped to 0.05s max to avoid physics jumps on tab-switch/lag.

### Key conventions

- Canvas is fixed at `W = 800`, `H = 600` (also hardcoded in `index.html`'s `<canvas>` attributes — keep in sync if changed).
- Space is toroidal: all moving entities wrap position via `wrap(v, max)` rather than bouncing/clamping.
- Asteroids have 3 sizes (`size` 1–3); `RADII`, `SPEEDS`, `POINTS` arrays are indexed by size. Destroying one calls `split()`, which spawns two smaller asteroids (size 1 has no children).
- Ship has temporary invincibility (`invincible` timer) on spawn/respawn, rendered as blinking (skip draw on alternating frames) rather than a visual shield.
- Physics is dt-based (frame-rate independent), not fixed-timestep.

### Known gap

`README.md` advertises power-ups and a unique "shooting star" asteroid type; neither exists in `game.js` yet. Don't assume these are implemented — check the code, not the README, before referencing this functionality.

