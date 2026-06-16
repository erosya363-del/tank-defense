"use strict";

// ==================== AUDIO SYSTEM ====================
let audioCtx = null;
let sfxGain = null;

// Rate limiting — не более N вызовов каждого типа в секунду
const _soundLastPlay = {};
const _soundMinInterval = {
  shoot: 0.05,   // минимум 50мс между выстрелами
  hit: 0.02,     // минимум 20мс между попаданиями
  explosion: 0.05,
  pickup: 0.1,
  boss: 1.0
};
const MAX_ACTIVE_NODES = 15;
let _activeNodes = 0;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = settings?.sfxEnabled ? 0.5 : 0;
    sfxGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Музыка отключена для производительности
function startMusic() {}
function stopMusic() {}

// ===== ЗВУКОВЫЕ ЭФФЕКТЫ =====
function playSound(type) {
  if (!audioCtx || !settings?.sfxEnabled) return;

  // Rate limiting
  let now = audioCtx.currentTime;
  let lastTime = _soundLastPlay[type] || 0;
  let minInterval = _soundMinInterval[type] || 0.03;
  if (now - lastTime < minInterval) return;
  _soundLastPlay[type] = now;

  // Лимит активных нодов
  if (_activeNodes >= MAX_ACTIVE_NODES) return;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.connect(g);
  g.connect(sfxGain);

  switch(type) {
    case 'shoot':
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'hit':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.05);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.08);
      break;

    case 'explosion':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.35);
      break;

    case 'pickup':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'boss':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.55);
      break;

    default:
      osc.disconnect();
      g.disconnect();
      return;
  }

  _activeNodes++;
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
    osc.onended = null;
    _activeNodes--;
  };
}