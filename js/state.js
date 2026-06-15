"use strict";

const GAME_VERSION = '2.0.0';

// ==================== CONFIG ====================
const CONFIG = {
  MAP_W: 2400,
  MAP_H: 2400,
  MAP_SPAWN_MARGIN: 80,
  MAP_SPAWN_MIN_DIST: 400,

  PLAYER_SIZE: 22,
  PLAYER_SPEED: 180,
  PLAYER_HP_MAX: 100,

  BASE_SIZE: 60,
  BASE_HP_MAX: 100,

  BOSS_EVERY: 3,

  TOTAL_LEVELS: 50,

  COLORS: {
    player: '#4a9eff',
    playerTrack: '#2a6ebb',
    playerGun: '#6ab4ff',
    enemyBullet: '#ff4444',
    light: '#82c91e',
    medium: '#e74c3c',
    heavy: '#8e44ad',
    striker: '#f1c40f',
    artillery: '#e67e22',
    armored: '#95a5a6',
    elite: '#e74c3c',
    boss: '#ff0044',
    bullet: '#ffdd44',
    obstacle: '#3a3a5a',
    obstacleBorder: '#5a5a8a',
    base: '#f39c12',
    baseDamaged: '#e67e22',
    trackLight: '#332211',
    trackHeavy: '#1a1a0a',
  },
};

// ==================== ENEMY TYPES ====================
const ENEMY_TYPES = {
  light: {
    hp: 20, hpGrowth: 2, speed: 90, speedGrowth: 1,
    damage: 8, damageGrowth: 1, size: 16, color: CONFIG.COLORS.light,
    money: 10, fireRate: 1.5, bulletSpeed: 250, bulletSize: 4,
    aggroRange: 400, name: 'Light',
  },
  medium: {
    hp: 40, hpGrowth: 4, speed: 65, speedGrowth: 1,
    damage: 15, damageGrowth: 2, size: 20, color: CONFIG.COLORS.medium,
    money: 20, fireRate: 1.2, bulletSpeed: 300, bulletSize: 4,
    aggroRange: 400, name: 'Medium',
  },
  heavy: {
    hp: 100, hpGrowth: 10, speed: 40, speedGrowth: 1,
    damage: 25, damageGrowth: 3, size: 26, color: CONFIG.COLORS.heavy,
    money: 35, fireRate: 2.0, bulletSpeed: 280, bulletSize: 6,
    aggroRange: 350, name: 'Heavy',
  },
  striker: {
    hp: 15, hpGrowth: 2, speed: 130, speedGrowth: 3,
    damage: 10, damageGrowth: 1, size: 14, color: CONFIG.COLORS.striker,
    money: 15, fireRate: 0.8, bulletSpeed: 350, bulletSize: 3,
    aggroRange: 450, name: 'Striker',
  },
  artillery: {
    hp: 35, hpGrowth: 3, speed: 30, speedGrowth: 0.5,
    damage: 35, damageGrowth: 5, size: 24, color: CONFIG.COLORS.artillery,
    money: 30, fireRate: 3.0, bulletSpeed: 200, bulletSize: 5,
    aggroRange: 500, name: 'Artillery',
  },
  armored: {
    hp: 150, hpGrowth: 15, speed: 35, speedGrowth: 0.5,
    damage: 20, damageGrowth: 3, size: 28, color: CONFIG.COLORS.armored,
    money: 45, fireRate: 1.8, bulletSpeed: 260, bulletSize: 5,
    aggroRange: 350, name: 'Armored',
  },
  elite: {
    hp: 80, hpGrowth: 8, speed: 70, speedGrowth: 2,
    damage: 20, damageGrowth: 3, size: 22, color: CONFIG.COLORS.elite,
    money: 50, fireRate: 0.6, bulletSpeed: 350, bulletSize: 4,
    aggroRange: 450, name: 'Elite',
  },
};

// ==================== WEAPONS ====================
const WEAPONS = [
  { id: 'cannon', name: 'Cannon', cost: 0, unlockLevel: 1, desc: 'Balanced weapon', fireRate: 0.5, bulletSpeed: 400, bulletSize: 5, damage: 15, bullets: 1, spread: 0, pierce: 0, explode: 0, color: '#ffdd44' },
  { id: 'rapid', name: 'Rapid Gun', cost: 200, unlockLevel: 2, desc: 'Fast fire rate', fireRate: 0.15, bulletSpeed: 450, bulletSize: 3, damage: 8, bullets: 1, spread: 0.08, pierce: 0, explode: 0, color: '#44ffaa' },
  { id: 'heavy', name: 'Heavy Cannon', cost: 350, unlockLevel: 3, desc: 'High damage, slow', fireRate: 1.0, bulletSpeed: 300, bulletSize: 8, damage: 40, bullets: 1, spread: 0, pierce: 1, explode: 0, color: '#ff8844' },
  { id: 'shotgun', name: 'Shotgun', cost: 500, unlockLevel: 5, desc: 'Spread shot', fireRate: 0.8, bulletSpeed: 350, bulletSize: 4, damage: 10, bullets: 5, spread: 0.35, pierce: 0, explode: 0, color: '#ffaa00' },
  { id: 'rocket', name: 'Rocket', cost: 800, unlockLevel: 7, desc: 'Area damage', fireRate: 1.5, bulletSpeed: 250, bulletSize: 7, damage: 50, bullets: 1, spread: 0, pierce: 0, explode: 60, color: '#ff4444' },
  { id: 'laser', name: 'Piercer', cost: 1200, unlockLevel: 10, desc: 'Piercing shot', fireRate: 0.3, bulletSpeed: 600, bulletSize: 3, damage: 25, bullets: 1, spread: 0, pierce: 5, explode: 0, color: '#44ffff' },
  { id: 'minigun', name: 'Minigun', cost: 2000, unlockLevel: 15, desc: 'Rapid multi-shot', fireRate: 0.08, bulletSpeed: 500, bulletSize: 2, damage: 6, bullets: 3, spread: 0.15, pierce: 0, explode: 0, color: '#ff88ff' },
];

const BOSS_NAMES = ['ЖУК', 'КАТОК', 'МАЛАКОСОС', 'ПАУК'];

// ==================== GAME STATE ====================
let canvas, ctx;
let W, H, scale;
let gameState = 'menu';

let player = null;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let obstacles = [];
let particles = [];
let tracks = [];
let pickups = [];
let spawnQueue = [];
let base = null;
let boss = null;
let bossActive = false;

let level = 1;
let score = 0;
let money = 0;
let lives = 3;
let gameTime = 0;
let gameSpeed = 1;
let waveNumber = 0;
let totalWaves = 0;
let waveEnemiesRemaining = 0;
let waveDelay = 0;
let waveTimer = 0;
let spawnTimer = 0;
let comboCount = 0;
let comboTimer = 0;
let comboMultiplier = 1;
let bestScore = 0;
let bestLevel = 0;
let shakeX = 0, shakeY = 0, shakeTime = 0, shakeIntensity = 0;
let lastTime = 0;

let camera = { x: CONFIG.MAP_W / 2, y: CONFIG.MAP_H / 2 + 100 };
let mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };
let keys = {};
let isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 1024);
let mobileFire = false;
let joystick = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };

let currentWeapon = 'cannon';
let unlockedWeapons = ['cannon'];
let playerUpgrades = { damage: 0, fireRate: 0, speed: 0, hp: 0, baseHp: 0 };
let bankLevel = 1;
let stats = { enemiesKilled: 0, shotsFired: 0, shotsHit: 0, damageDealt: 0, damageTaken: 0 };

let saveData = {};
let _hudCache = null;
let settings = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.3,
  sfxVolume: 0.5,
  gameSpeed: 1,
  mapSize: 'medium',
  tankSkin: 'blue',
};