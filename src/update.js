'use strict';

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
