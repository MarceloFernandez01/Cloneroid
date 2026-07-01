'use strict';

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
