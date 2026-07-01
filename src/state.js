'use strict';

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let powerUpSpawnedThisLevel = false;
let shieldSpawnedThisLevel = false;
let score, lives, level;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover' | 'levelup'
let deadTimer;
let levelUpTimer;
let menuBlinkTimer = 0;
let menuStartRequested = false;
let paused = false;
let pauseIndex = 0;   // 0 = reanudar, 1 = reiniciar, 2 = volumen
const PAUSE_OPTIONS = ['REANUDAR', 'REINICIAR PARTIDA', 'VOLUMEN'];

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function showMenu() {
  ship = new Ship();
  ship.dead = true; // oculta la nave en el menú
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  menuBlinkTimer = 0;
  state = 'menu';
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  powerUpSpawnedThisLevel = false;
  shieldSpawnedThisLevel = false;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  powerUpSpawnedThisLevel = false;
  shieldSpawnedThisLevel = false;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  playCrashSound();
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
    playGameOverSound();
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}
