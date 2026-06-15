"use strict";

// ==================== AUDIO SYSTEM (ONLY SFX - NO MUSIC) ====================
let audioCtx = null;
let sfxGain = null; // Громкость эффектов

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Создаем узел громкости для эффектов
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = settings?.sfxEnabled ? 0.5 : 0;
    sfxGain.connect(audioCtx.destination);
  }

  // Разблокировка звука на iOS/Android (нужен жест пользователя)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// ===== ЗАГЛУШКИ ДЛЯ МУЗЫКИ (Они ничего не делают, чтобы игра висла) =====
function startMusic() {
  // Музыка отключена для производительности
}

function stopMusic() {
  // Ничего не делаем
}

// ===== ЗВУКОВЫЕ ЭФФЕКТЫ (SFX) =====
function playSound(type) {
  if (!audioCtx || !settings?.sfxEnabled) return;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  // Подключаем цепочку: Оциллятор -> Громкость -> Выход
  osc.connect(g);
  g.connect(sfxGain); 

  let now = audioCtx.currentTime;

  // Звук выстрела (Ретро "Пиу")
  if (type === 'shoot') { 
    osc.type = 'square'; // Квадратная волна (Денди)
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.stop(now + 0.2).then(() => { osc.disconnect(); g.disconnect(); });
  } 
  // Звук попадания (Короткий "Тык")
  else if (type === 'hit') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.05);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.stop(now + 0.1).then(() => { osc.disconnect(); g.disconnect(); });
  }
  // Звук взрыва (Глубокий "Бум")
  else if (type === 'explosion') { 
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.stop(now + 0.4).then(() => { osc.disconnect(); g.disconnect(); });
  }

  osc.start(now);
}
