'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────

const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
  startAmbientMusic();
  if (state === 'menu') menuStartRequested = true;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null;
let musicStarted = false;
let masterVolumeGain = null;
let masterVolume = 1;   // 0..1, ajustable desde el menú de pausa

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterVolumeGain = audioCtx.createGain();
    masterVolumeGain.gain.value = masterVolume;
    masterVolumeGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function setMasterVolume(v) {
  masterVolume = Math.min(1, Math.max(0, Math.round(v * 10) / 10));
  if (masterVolumeGain) masterVolumeGain.gain.value = masterVolume;
}

function playShootSound() {
  const ctx = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(900, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.65, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(masterVolumeGain);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

function playCrashSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // Estallido de ruido (impacto)
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(2000, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(150, now + 0.4);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.9, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterVolumeGain);
  noise.start(now);
  noise.stop(now + 0.4);

  // Golpe grave que acompaña el impacto
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

  oscGain.gain.setValueAtTime(0.8, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(oscGain);
  oscGain.connect(masterVolumeGain);
  osc.start(now);
  osc.stop(now + 0.35);
}

const LEVEL_UP_DURATION = 1.4; // segundos: dura el "jiggle" antes de pasar de nivel

function playLevelUpSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(660, now);

  // Vibrato rápido: el "jiggle" del tono
  const lfo     = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(18, now);
  lfoGain.gain.setValueAtTime(60, now);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  lfo.start(now);
  lfo.stop(now + LEVEL_UP_DURATION);

  // Arpegio ascendente sobre el vibrato
  [660, 880, 1100, 1320].forEach((freq, i) => {
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
  });

  gain.gain.setValueAtTime(0.22, now);
  gain.gain.setValueAtTime(0.22, now + LEVEL_UP_DURATION - 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, now + LEVEL_UP_DURATION);

  osc.connect(gain);
  gain.connect(masterVolumeGain);
  osc.start(now);
  osc.stop(now + LEVEL_UP_DURATION);
}

function playGameOverSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const notes = [440, 392, 349, 293, 220]; // jingle descendente de derrota

  notes.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = now + i * 0.18;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    osc.connect(gain);
    gain.connect(masterVolumeGain);
    osc.start(t);
    osc.stop(t + 0.18);
  });
}

function startAmbientMusic() {
  if (musicStarted) return;
  musicStarted = true;
  const ctx = getAudioCtx();

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
  masterGain.connect(masterVolumeGain);

  // Dron grave: dos osciladores levemente desafinados para textura espacial
  [55, 55.6].forEach(freq => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
  });

  // Pad que sube y baja de volumen muy lentamente ("viento" espacial)
  const pad     = ctx.createOscillator();
  const padGain = ctx.createGain();
  pad.type = 'triangle';
  pad.frequency.setValueAtTime(220, ctx.currentTime);
  padGain.gain.setValueAtTime(0, ctx.currentTime);
  pad.connect(padGain);
  padGain.connect(masterGain);
  pad.start();

  const lfo     = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.05, ctx.currentTime);
  lfoGain.gain.setValueAtTime(0.15, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(padGain.gain);
  lfo.start();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Forma fija (normalizada a radio 1) para los asteroides grandes (size 3)
const LARGE_ASTEROID_SHAPE = [
  [-0.1228, -0.9401],
  [ 0.3918, -0.7557],
  [ 0.3580, -0.2019],
  [ 0.8659, -0.0698],
  [ 0.6816,  0.4778],
  [ 0.3059,  0.4318],
  [-0.0244,  0.9077],
  [-0.6299,  0.6242],
  [-1.0000,  0.0154],
  [-0.8279, -0.4921],
];

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    if (size === 3) {
      // Forma fija para asteroides grandes, sin variaciones
      this.verts = LARGE_ASTEROID_SHAPE.map(([vx, vy]) => [vx * this.radius, vy * this.radius]);
    } else {
      // Polígono irregular
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.tripleShotTimer = 0;
    this.shieldTimer   = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible      > 0) this.invincible      -= dt;
    if (this.shootCooldown   > 0) this.shootCooldown   -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldTimer     > 0) this.shieldTimer     -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    if (this.tripleShotTimer > 0) {
      const SPREAD = 0.28; // rad entre balas del abanico
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;

    if (this.shieldTimer > 0) {
      const glow = 0.6 + 0.4 * Math.sin(this.shieldTimer * 8);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(255, 165, 0, ${glow.toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups: Disparo Triple y Escudo Temporal ──────────────────────────────
const TRIPLE_SHOT_CHANCE   = 1 / 50; // 1 de cada 50 asteroides pequeños destruidos
const TRIPLE_SHOT_DURATION = 10;     // segundos de duración del power-up
const SHIELD_CHANCE        = 1 / 50; // probabilidad independiente del disparo triple
const SHIELD_DURATION      = 10;     // segundos de duración del escudo

const POWERUP_COLORS = {
  triple: '0, 255, 255',   // cian
  shield: '255, 165, 0',   // naranjo
};

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'triple' | 'shield'
    this.radius = 10;
    this.ttl = 8; // desaparece si no se recoge
    this.pulse = 0;
    this.dead = false;
  }

  update(dt) {
    this.pulse += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const blink = this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0;
    if (blink) return;

    const rgb  = POWERUP_COLORS[this.type];
    const glow = 0.6 + 0.4 * Math.sin(this.pulse * 6);
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle   = `rgba(${rgb}, ${(glow * 0.35).toFixed(2)})`;
    ctx.strokeStyle = `rgba(${rgb}, ${glow.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.3;
    if (this.type === 'triple') {
      // Icono: tres trazos en abanico
      [-0.35, 0, 0.35].forEach(a => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - Math.PI / 2) * 6, Math.sin(a - Math.PI / 2) * 6);
        ctx.stroke();
      });
    } else {
      // Icono: anillo de escudo
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

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

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'menu') {
    menuBlinkTimer += dt;
    if (menuStartRequested) {
      menuStartRequested = false;
      initGame();
    }
    return;
  }

  if (pressed('Escape') && state !== 'gameover') {
    paused = !paused;
    if (paused) pauseIndex = 0;
  }

  if (paused) {
    if (pressed('ArrowUp'))   pauseIndex = (pauseIndex + PAUSE_OPTIONS.length - 1) % PAUSE_OPTIONS.length;
    if (pressed('ArrowDown')) pauseIndex = (pauseIndex + 1) % PAUSE_OPTIONS.length;

    if (pauseIndex === 2) {
      if (pressed('ArrowLeft'))  setMasterVolume(masterVolume - 0.1);
      if (pressed('ArrowRight')) setMasterVolume(masterVolume + 0.1);
    }

    if (pressed('Enter') || pressed('Space')) {
      if (pauseIndex === 0) paused = false;
      else if (pauseIndex === 1) { initGame(); paused = false; }
    }
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) showMenu();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  if (state === 'levelup') {
    levelUpTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    if (levelUpTimer <= 0) { state = 'playing'; nextLevel(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    const newBullets = ship.tryShoot();
    if (newBullets.length) playShootSound();
    bullets.push(...newBullets);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (a.size === 1 && !powerUpSpawnedThisLevel && Math.random() < TRIPLE_SHOT_CHANCE) {
          powerUps.push(new PowerUp(a.x, a.y, 'triple'));
          powerUpSpawnedThisLevel = true;
        }
        if (a.size === 1 && !shieldSpawnedThisLevel && Math.random() < SHIELD_CHANCE) {
          powerUps.push(new PowerUp(a.x, a.y, 'shield'));
          shieldSpawnedThisLevel = true;
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldTimer > 0) {
          // El escudo absorbe el golpe: el asteroide se destruye como si le hubieran disparado
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          asteroids.push(...a.split());
          ship.shieldTimer = 0;
        } else {
          killShip();
        }
        break;
      }
    }
    asteroids = asteroids.filter(a => !a.dead);
  }

  // Nave vs power-up
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'triple') ship.tripleShotTimer = TRIPLE_SHOT_DURATION;
      else if (p.type === 'shield') ship.shieldTimer = SHIELD_DURATION;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) {
    playLevelUpSound();
    state        = 'levelup';
    levelUpTimer = LEVEL_UP_DURATION;
  }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.tripleShotTimer > 0) {
    const barX = 14, barY = 38, barW = 140, barH = 8;
    const frac = ship.tripleShotTimer / TRIPLE_SHOT_DURATION;

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
    ctx.fillRect(barX, barY, barW * frac, barH);
  }

  if (ship.shieldTimer > 0) {
    const barX = 14, barY = 52, barW = 140, barH = 8;
    const frac = ship.shieldTimer / SHIELD_DURATION;

    ctx.strokeStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = 'rgba(255, 165, 0, 0.9)';
    ctx.fillRect(barX, barY, barW * frac, barH);
  }
}

// Renderiza texto con pitch fijo (look de fuente arcade de 8 bits), sombra neón
// desplazada estilo cabina de los 80', y lo escala sin suavizado para pixelarlo.
// maxWidth limita el ancho final para que el texto quede dentro de los márgenes.
function drawPixelText(text, cx, cy, fontSize, maxWidth, color) {
  const off  = document.createElement('canvas');
  const octx = off.getContext('2d');
  const cellW   = fontSize * 0.82;
  const padding = 4;
  const w = Math.ceil(cellW * text.length) + padding * 2;
  const h = Math.ceil(fontSize * 1.3) + padding;
  off.width  = w;
  off.height = h;

  octx.font = `bold ${fontSize}px 'Courier New', monospace`;
  octx.textBaseline = 'top';

  octx.fillStyle = 'rgba(120,120,120,0.9)'; // sombra gris desplazada
  for (let i = 0; i < text.length; i++)
    octx.fillText(text[i], padding + i * cellW + 3, padding + 3);

  octx.fillStyle = color;
  for (let i = 0; i < text.length; i++)
    octx.fillText(text[i], padding + i * cellW, padding);

  const scale = Math.min(6, maxWidth / w);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, cx - (w * scale) / 2, cy - (h * scale) / 2, w * scale, h * scale);
  ctx.imageSmoothingEnabled = true;
}

function drawMenu() {
  drawPixelText('CLONEROID', W / 2, H / 2 - 60, 30, W - 100, '#fff');

  ctx.textAlign = 'center';
  ctx.font      = '18px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  if (Math.floor(menuBlinkTimer * 2) % 2 === 0)
    ctx.fillText('PULSA CUALQUIER TECLA PARA INICIAR', W / 2, H / 2 + 90);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawPauseMenu() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 40px monospace';
  ctx.fillText('PAUSA', W / 2, H / 2 - 60);

  ctx.font = '22px monospace';
  PAUSE_OPTIONS.forEach((label, i) => {
    const y = H / 2 + i * 44;
    const text = i === 2 ? `VOLUMEN: ${'█'.repeat(Math.round(masterVolume * 10))}${'░'.repeat(10 - Math.round(masterVolume * 10))}` : label;
    ctx.fillStyle = i === pauseIndex ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.fillText(i === pauseIndex ? `> ${text} <` : text, W / 2, y);
  });
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'menu') {
    drawMenu();
    return;
  }

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA VOLVER AL MENÚ`);

  if (state === 'levelup')
    drawOverlay(`NIVEL ${level} COMPLETADO`, `PREPARANDO NIVEL ${level + 1}...`);

  if (paused) drawPauseMenu();
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

showMenu();
requestAnimationFrame(loop);
