# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Clone of the classic arcade game **Asteroids**, built with plain HTML5 Canvas and vanilla JavaScript (ES6+). No build tools, no bundler, no package manager, no dependencies. The game logic lives in the `src/` folder, split into classic (non-module) scripts loaded in order by `index.html`.

## Running

No build step. Either:
- Open `index.html` directly in a browser, or
- Serve locally: `npx serve .` then visit `http://localhost:3000`

There is no test suite, linter, or package.json in this repo. Verify changes by loading the page in a browser and playing the game.

## Architecture

The code is split into `src/*.js` files, loaded via plain `<script>` tags (no `import`/`export`, no bundler) in the exact order listed in `index.html`. All top-level `const`/`let`/functions/classes share one global scope across files, so load order matters whenever a later file references something defined earlier (e.g. `entities.js` uses `wrap`/`rand` from `core.js`; `update.js` uses classes from `entities.js` and state from `state.js`).

1. **`src/core.js`** — canvas/context (`canvas`, `ctx`, `W`, `H`) and utils: `wrap` (toroidal wraparound), `dist`, `rand`, `randInt`.
2. **`src/input.js`** — `keys` (held) and `justPressed` (edge-triggered) maps populated by `keydown`/`keyup` listeners. Use `pressed(code)` to consume a one-shot press (e.g. shooting), and `keys[code]` directly for continuous state (e.g. rotation/thrust).
3. **`src/audio.js`** — lazily-created single `AudioContext` (`getAudioCtx()`), with procedural sound synthesis via oscillators (e.g. `playShootSound()`). No audio files/assets.
4. **`src/entities.js`** — entity classes: `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`. Each has its own `update(dt)` and `draw()`. All entities mark themselves `dead = true` rather than removing themselves from arrays; arrays are filtered each frame in `update()`.
5. **`src/state.js`** — module-level mutable variables (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`, `deadTimer`, ...) plus state-transition functions (`showMenu`, `initGame`, `nextLevel`, `killShip`, `explode`, `spawnAsteroids`). `state` is one of `'menu' | 'playing' | 'dead' | 'gameover' | 'levelup'`. There is no class/object wrapping this — it's a flat global state machine.
6. **`src/update.js`** — `update(dt)` branches on `state` first. Handles pause menu → input → physics update → collision detection (bullet-vs-asteroid, ship-vs-asteroid, ship-vs-powerup) → level progression (`nextLevel()` when `asteroids.length === 0`).
7. **`src/draw.js`** — `draw()` clears canvas, draws entities back-to-front (particles → asteroids → power-ups → bullets → ship), then HUD/overlays (menu, pause, game over, level up).
8. **`src/main.js`** — `requestAnimationFrame` loop (`loop(ts)`) computing `dt` in seconds, clamped to 0.05s max to avoid physics jumps on tab-switch/lag. Kicks off the game with `showMenu()`.

### Key conventions

- Canvas is fixed at `W = 800`, `H = 600` (also hardcoded in `index.html`'s `<canvas>` attributes — keep in sync if changed).
- Space is toroidal: all moving entities wrap position via `wrap(v, max)` rather than bouncing/clamping.
- Asteroids have 3 sizes (`size` 1–3); `RADII`, `SPEEDS`, `POINTS` arrays are indexed by size. Destroying one calls `split()`, which spawns two smaller asteroids (size 1 has no children).
- Ship has temporary invincibility (`invincible` timer) on spawn/respawn, rendered as blinking (skip draw on alternating frames) rather than a visual shield.
- Physics is dt-based (frame-rate independent), not fixed-timestep.

### Known gap

`README.md` advertises a unique "shooting star" asteroid type that doesn't exist in the code yet (power-ups — triple shot and shield — are implemented, in `src/entities.js`/`src/state.js`). Don't assume the shooting-star asteroid is implemented — check the code, not the README, before referencing that functionality.

