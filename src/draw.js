'use strict';

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
