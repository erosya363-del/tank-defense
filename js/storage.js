"use strict";

// ==================== SETTINGS ====================
const SETTINGS_KEY = 'tankDefenseSettings';

const defaultSettings = {
  mapSize: 'medium',
  gameSpeed: 1.0,
  tankSkin: 'blue',
  musicVolume: 0.3,
  sfxVolume: 0.5,
  musicEnabled: true,
  sfxEnabled: true
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    settings = { ...defaultSettings, ...saved };
  } catch(e) {
    settings = { ...defaultSettings };
  }
}

// Debounce для localStorage — избегаем блокировки main thread
let _saveSettingsTimer = null;
function saveSettings() {
  if (_saveSettingsTimer) clearTimeout(_saveSettingsTimer);
  _saveSettingsTimer = setTimeout(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch(e) {}
  }, 100);
}

function applySettings() {
  CONFIG.MAP_W = settings.mapSize === 'small' ? 1600 : settings.mapSize === 'large' ? 3200 : 2400;
  CONFIG.MAP_H = CONFIG.MAP_W;
  gameSpeed = settings.gameSpeed;
  // Обновляем громкость SFX напрямую
  if (sfxGain) {
    sfxGain.gain.value = settings.sfxEnabled ? settings.sfxVolume : 0;
  }
}

// ==================== SAVE SYSTEM ====================
const SAVE_KEY = 'tankDefenseSave';
const SAVE_VERSION = 2;

function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    saveData = d || {};
  } catch(e) { saveData = {}; }
}

let _saveSaveTimer = null;
function saveSave(data) {
  if (_saveSaveTimer) clearTimeout(_saveSaveTimer);
  _saveSaveTimer = setTimeout(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e) {}
  }, 200);
}

// ==================== BACKUP / RESTORE ====================
const BACKUP_KEY = 'tankDefenseBackup';

function backupProgress() {
  try {
    let backup = {
      version: GAME_VERSION,
      saveVersion: SAVE_VERSION,
      timestamp: Date.now(),
      saveData: saveData,
      settings: settings
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    return true;
  } catch(e) { return false; }
}

function restoreProgress() {
  try {
    let raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return false;
    let backup = JSON.parse(raw);
    if (backup.saveData) {
      saveData = backup.saveData;
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }
    if (backup.settings) {
      settings = backup.settings;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    return true;
  } catch(e) { return false; }
}

function exportProgress() {
  try {
    let data = {
      version: GAME_VERSION,
      timestamp: Date.now(),
      saveData: saveData,
      settings: settings
    };
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `tanks-save-v${GAME_VERSION}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch(e) { return false; }
}

function importProgress(file) {
  return new Promise((resolve) => {
    let reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data = JSON.parse(e.target.result);
        if (data.saveData) {
          saveData = data.saveData;
          localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        }
        if (data.settings) {
          settings = data.settings;
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
        resolve(true);
      } catch(ex) { resolve(false); }
    };
    reader.readAsText(file);
  });
}

// ==================== ANALYTICS ====================
const ANALYTICS_KEY = 'tankDefenseAnalytics';

function trackEvent(category, action, label) {
  try {
    let analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    analytics.push({
      category: category,
      action: action,
      label: label || '',
      timestamp: Date.now()
    });
    // Keep last 200 events
    if (analytics.length > 200) analytics = analytics.slice(-200);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
  } catch(e) {}
}

function trackLevelStart(level) {
  trackEvent('game', 'level_start', 'level_' + level);
}

function trackLevelComplete(level, score) {
  trackEvent('game', 'level_complete', 'level_' + level + '_score_' + score);
}

function trackGameOver(level, score) {
  trackEvent('game', 'game_over', 'level_' + level + '_score_' + score);
}

function trackUpgrade(type) {
  trackEvent('upgrade', 'purchase', type);
}

function trackWeaponUnlock(weaponId) {
  trackEvent('weapon', 'unlock', weaponId);
}
