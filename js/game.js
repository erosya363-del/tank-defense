"use strict";

// ==================== MAP GENERATION ====================
function generateObstacles(lvl) {
  obstacles = [];
  let count = 8 + Math.floor(lvl * 0.5);
  let seed = lvl * 137;

  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    let x = ((seed % (CONFIG.MAP_W - 200)) + 100);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    let y = ((seed % (CONFIG.MAP_H - 200)) + 100);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    let w = 30 + (seed % 80);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    let h = 30 + (seed % 80);

    let bx = CONFIG.MAP_W/2 - CONFIG.BASE_SIZE/2;
    let by = CONFIG.MAP_H - CONFIG.BASE_SIZE - 100;
    let safe = rectCollide(
      {x: bx-60, y: by-60, w: CONFIG.BASE_SIZE+120, h: CONFIG.BASE_SIZE+120},
      {x, y, w, h}
    ) || rectCollide(
      {x: CONFIG.MAP_W/2-60, y: CONFIG.MAP_H/2+40, w: 120, h: 120},
      {x, y, w, h}
    );
    if (!safe) continue;

    obstacles.push({ x, y, w, h });
  }
}

// ==================== WAVE GENERATION ====================
function generateWaveData(lvl) {
  totalWaves = 3 + Math.floor(lvl * 0.3);
  if (lvl % CONFIG.BOSS_EVERY === 0) totalWaves += 1;

  spawnQueue = [];

  for (let w = 0; w < totalWaves; w++) {
    let waveEnemies = [];
    let isBossWave = (w === totalWaves - 1 && lvl % CONFIG.BOSS_EVERY === 0);

    if (isBossWave) {
      waveEnemies.push({ type: 'boss', count: 1, delay: 0 });
    } else {
      let count = 3 + Math.floor(lvl * 0.4 + w * 0.5);

      let types = ['light'];
      if (lvl >= 3) types.push('medium');
      if (lvl >= 5) types.push('striker');
      if (lvl >= 8) types.push('heavy');
      if (lvl >= 12) types.push('artillery');
      if (lvl >= 15) types.push('armored');
      if (lvl >= 20) types.push('elite');

      let weights = types.map((t, i) => {
        if (lvl < 10) return i === 0 ? 60 : 20;
        let w2 = Math.max(5, 30 - i * 5);
        return w2;
      });

      for (let i = 0; i < count; i++) {
        let type = weightedPick(types, weights);
        waveEnemies.push({ type, count: 1, delay: 0.5 + rand(0, 0.5) });
      }
    }

    spawnQueue.push(waveEnemies);
  }
}

// ==================== RENDER HELPERS ====================
let _camOffX = 0, _camOffY = 0;

function renderBackground() {
  let grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a2a1a');
  grad.addColorStop(0.5, '#2a3a2a');
  grad.addColorStop(1, '#1a2a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function renderGrid() {
  let gridSize = 60;
  let offsetX = (-camera.x + shakeX + W/2) % gridSize;
  let offsetY = (-camera.y + shakeY + H/2) % gridSize;

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;

  for (let x = offsetX; x < W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = offsetY; y < H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function renderObstacles() {
  for (let o of obstacles) {
    let sx = o.x - _camOffX;
    let sy = o.y - _camOffY;
    if (sx + o.w < -20 || sx > W+20 || sy + o.h < -20 || sy > H+20) continue;

    ctx.fillStyle = CONFIG.COLORS.obstacle;
    ctx.fillRect(sx, sy, o.w, o.h);
    ctx.strokeStyle = CONFIG.COLORS.obstacleBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, o.w, o.h);

    // Подсветка верхних и левых краёв
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(sx, sy, o.w, 3);
    ctx.fillRect(sx, sy, 3, o.h);
  }
}

function renderTracks() {
  if (tracks.length < 2) return;

  ctx.save();

  for (let t of tracks) {
    let sx = t.x - _camOffX;
    let sy = t.y - _camOffY;

    if (sx < -100 || sx > W+100 || sy < -100 || sy > H+100) continue;

    let alpha = (t.life / t.maxLife) * 0.4;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t.angle);
    ctx.globalAlpha = alpha;

    let trackW = t.size * 0.7;
    let trackH = t.size * 1.2;

    // Полоса гусеницы (тонкая тёмная полоса)
    ctx.fillStyle = t.color || '#333';
    ctx.fillRect(-trackW/2, -trackH/2, trackW, trackH);

    // Протектор (звенья) — чередующиеся шипы
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    let treadSize = Math.max(2, t.size * 0.12);
    for (let i = -trackH/2; i < trackH/2; i += treadSize * 2.2) {
      ctx.fillRect(-trackW/2 - 1, i, trackW + 2, treadSize * 0.7);
    }

    // Центральная полоса (след)
    ctx.fillStyle = t.color || '#333';
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillRect(-1, -trackH/2, 2, trackH);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.restore();
}

function renderBase() {
  if (!base) return;
  let sx = base.x - _camOffX;
  let sy = base.y - _camOffY;

  let grad = ctx.createRadialGradient(sx + base.w/2, sy + base.h/2, base.w*0.3, sx + base.w/2, sy + base.h/2, base.w*1.5);
  let baseHealthPct = base.hp / base.maxHp;
  let glowColor = baseHealthPct > 0.5 ? 'rgba(243,156,18,0.15)' : 'rgba(231,76,60,0.2)';
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx + base.w/2, sy + base.h/2, base.w * 1.5, 0, Math.PI * 2);
  ctx.fill();

  let baseColor = baseHealthPct > 0.3 ? CONFIG.COLORS.base : CONFIG.COLORS.baseDamaged;
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.roundRect(sx, sy, base.w, base.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#f5b041';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F6E1}', sx + base.w/2, sy + base.h/2);

  let bw = base.w + 20;
  let bh = 8;
  let bx = sx + base.w/2 - bw/2;
  let by = sy - 16;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = baseHealthPct > 0.5 ? '#2ecc71' : baseHealthPct > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(bx, by, bw * baseHealthPct, bh);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);
}

function renderPickups() {
  for (let p of pickups) {
    let sx = p.x - _camOffX;
    let sy = p.y - _camOffY;
    if (sx < -20 || sx > W+20 || sy < -20 || sy > H+20) continue;
    let pulse = 1 + Math.sin(gameTime * 5) * 0.2;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', sx, sy);
  }
}

function renderBullets() {
  for (let b of bullets) {
    let sx = b.x - _camOffX;
    let sy = b.y - _camOffY;
    if (sx < -10 || sx > W+10 || sy < -10 || sy > H+10) continue;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(sx, sy, b.size, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.fillStyle = b.color + '44';
    ctx.beginPath();
    ctx.arc(sx, sy, b.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let b of enemyBullets) {
    let sx = b.x - _camOffX;
    let sy = b.y - _camOffY;
    if (sx < -10 || sx > W+10 || sy < -10 || sy > H+10) continue;
    ctx.fillStyle = CONFIG.COLORS.enemyBullet;
    ctx.beginPath();
    ctx.arc(sx, sy, b.size || 4, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.fillStyle = '#ff444444';
    ctx.beginPath();
    ctx.arc(sx, sy, (b.size || 4) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderParticles() {
  for (let p of particles) {
    let alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - _camOffX, p.y - _camOffY, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// МИНИКАРТА — правый верхний угол
function renderMinimap() {
  let mw = 120, mh = 120;
  let mx = W - mw - 10;
  let my = 70;
  let sx = mw / CONFIG.MAP_W, sy = mh / CONFIG.MAP_H;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, mh);

  if (base) {
    ctx.fillStyle = CONFIG.COLORS.base;
    ctx.fillRect(mx + base.x * sx, my + base.y * sy, base.w * sx, base.h * sy);
  }

  if (player) {
    ctx.fillStyle = CONFIG.COLORS.player;
    ctx.beginPath();
    ctx.arc(mx + player.x * sx, my + player.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let e of enemies) {
    ctx.fillStyle = e.color || '#f00';
    ctx.fillRect(mx + e.x * sx - 1, my + e.y * sy - 1, 2, 2);
  }

  if (boss) {
    ctx.fillStyle = CONFIG.COLORS.boss;
    ctx.beginPath();
    ctx.arc(mx + boss.x * sx, my + boss.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.strokeRect(
    mx + (camera.x - W/2) * sx,
    my + (camera.y - H/2) * sy,
    W * sx, H * sy
  );
}

function renderMenuBG() {
  let grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0a0a2e');
  grad.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  let t = gameTime;
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 8; i++) {
    let x = ((t * 30 + i * 100) % (W + 100)) - 50;
    let y = 100 + i * 60 + Math.sin(t + i) * 20;
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.roundRect(x, y, 40, 30, 5);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ==================== GAME LOOP ====================
function gameLoop(timestamp) {
  let dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (gameState === 'menu') {
    gameTime += dt;
  }

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (gameState !== 'playing') return;

  gameTime += dt;
  let dtS = dt * gameSpeed;

  // Combo timer
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) {
      comboCount = 0;
      comboMultiplier = 1;
    }
  }

  // Shake (старая система + shakeIntensity)
  if (shakeTime > 0) {
    shakeTime -= dt;
    shakeX = rand(-4, 4);
    shakeY = rand(-4, 4);
  } else if (shakeIntensity > 0) {
    shakeX = (Math.random() * 2 - 1) * shakeIntensity;
    shakeY = (Math.random() * 2 - 1) * shakeIntensity;
    shakeIntensity -= dt * 15;
    if (shakeIntensity < 0) shakeIntensity = 0;
  } else {
    shakeX = 0;
    shakeY = 0;
  }

  // Player
  if (player) player.update(dt);

  // Camera
  camera.x = lerp(camera.x, player.x, 5 * dt);
  camera.y = lerp(camera.y, player.y, 5 * dt);

  // Tracks update
  for (let i = tracks.length - 1; i >= 0; i--) {
    tracks[i].life -= dtS;
    if (tracks[i].life <= 0) tracks.splice(i, 1);
  }

  // Wave delay
  waveDelay -= dtS;
  if (waveDelay <= 0 && waveNumber < totalWaves) {
    let wave = spawnQueue[waveNumber];
    for (let e of wave) {
      if (e.type === 'boss') {
        boss = new Boss(level);
        bossActive = true;
      } else {
        let pos = getSpawnPosition();
        enemies.push(new Enemy(e.type, pos.x, pos.y, level));
      }
    }
    waveNumber++;
    waveDelay = waveNumber < totalWaves ? (3 + rand(0, 2)) : 0;
  }

  // Level complete check
  if (waveNumber >= totalWaves && enemies.length === 0 && !bossActive) {
    if (level >= CONFIG.TOTAL_LEVELS) {
      endVictory();
      return;
    }
    showLevelComplete();
    return;
  }

  // Update enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update(dt);
    if (e.hp <= 0) {
      enemies.splice(i, 1);
    }
  }

  // Update boss
  if (boss) {
    boss.update(dt);
    if (boss.hp <= 0) {
      bossActive = false;
      boss = null;
      if (level >= CONFIG.TOTAL_LEVELS) {
        endVictory();
        return;
      }
      showLevelComplete();
      return;
    }
  }

  // Player bullets
  updateBullets(dt);

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx * dtS;
    p.y += p.vy * dtS;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= dtS;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Pickups
  for (let i = pickups.length - 1; i >= 0; i--) {
    let p = pickups[i];
    p.life -= dt;
    if (p.life <= 0) { pickups.splice(i, 1); continue; }
    if (player && Math.hypot(p.x - player.x, p.y - player.y) < p.size + player.size) {
      if (p.type === 'health') {
        player.hp = Math.min(player.maxHp, player.hp + p.amount);
        playSound('pickup');
      }
      pickups.splice(i, 1);
    }
  }

  // Base HP check
  if (base.hp <= 0) {
    base.hp = 0;
    spawnExplosion(base.x + base.w/2, base.y + base.h/2, '#ff4400', 50);
    addShake(15, 0.5);
    lives = 0;
    endGameOver();
    return;
  }

  updateDamageNumbers(dt);
  updateHUD();
}

function updateBullets(dt) {
  let dtS = dt * gameSpeed;

  // Player bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.x += b.vx * dtS;
    b.y += b.vy * dtS;
    b.life -= dtS;

    let hitObstacle = false;
    for (let o of obstacles) {
      if (circleRectCollide(b.x, b.y, b.size, o.x, o.y, o.w, o.h)) {
        hitObstacle = true;
        spawnHitEffect(b.x, b.y, '#888888');
        spawnExplosion(b.x, b.y, b.color, 3);
        break;
      }
    }
    if (hitObstacle || b.life <= 0 || b.x < -50 || b.x > CONFIG.MAP_W+50 || b.y < -50 || b.y > CONFIG.MAP_H+50) {
      bullets.splice(i, 1);
      continue;
    }

    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      let e = enemies[j];
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.size + e.size) {
        stats.shotsHit++;
        spawnHitEffect(b.x, b.y, b.color);
        showDamageNumber(e.x, e.y - 20, b.damage);
        if (e.takeDamage(b.damage)) {
          enemies.splice(j, 1);
        }
        if (b.explode > 0) {
          spawnExplosion(b.x, b.y, '#ff8844', 12);
          for (let k = enemies.length - 1; k >= 0; k--) {
            let e2 = enemies[k];
            if (Math.hypot(b.x - e2.x, b.y - e2.y) < b.explode) {
              if (e2.takeDamage(b.damage * 0.5)) {
                enemies.splice(k, 1);
              }
            }
          }
          if (boss && Math.hypot(b.x - boss.x, b.y - boss.y) < b.explode) {
            boss.takeDamage(b.damage * 0.3);
          }
        }
        if (b.pierce > 0 && b.pierceCount < b.pierce) {
          b.pierceCount++;
        } else {
          bullets.splice(i, 1);
          hit = true;
        }
        break;
      }
    }

    if (!hit && boss) {
      if (Math.hypot(b.x - boss.x, b.y - boss.y) < b.size + boss.size) {
        stats.shotsHit++;
        spawnHitEffect(b.x, b.y, '#ffaa00');
        if (boss.takeDamage(b.damage)) {
          bossActive = false;
          boss = null;
          if (level >= CONFIG.TOTAL_LEVELS) {
            endVictory();
            return;
          }
          showLevelComplete();
          return;
        }
        if (b.explode > 0) {
          spawnExplosion(b.x, b.y, '#ff8844', 12);
        }
        if (b.pierce > 0 && b.pierceCount < b.pierce) {
          b.pierceCount++;
        } else {
          bullets.splice(i, 1);
        }
      }
    }
  }

  // Enemy bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let b = enemyBullets[i];
    b.x += b.vx * dtS;
    b.y += b.vy * dtS;
    b.life -= dtS;

    if (b.life <= 0 || b.x < -50 || b.x > CONFIG.MAP_W+50 || b.y < -50 || b.y > CONFIG.MAP_H+50) {
      enemyBullets.splice(i, 1);
      continue;
    }

    let hitObs = false;
    for (let o of obstacles) {
      if (circleRectCollide(b.x, b.y, b.size, o.x, o.y, o.w, o.h)) {
        hitObs = true;
        spawnHitEffect(b.x, b.y, '#ff4444');
        spawnExplosion(b.x, b.y, '#ff4444', 3);
        break;
      }
    }
    if (hitObs) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (player && Math.hypot(b.x - player.x, b.y - player.y) < b.size + player.size) {
      spawnHitEffect(player.x, player.y, '#ff4444');
      player.takeDamage(b.damage);
      enemyBullets.splice(i, 1);
      addShake(3, 0.15);
      continue;
    }

    if (circleRectCollide(b.x, b.y, b.size, base.x, base.y, base.w, base.h)) {
      spawnHitEffect(b.x, b.y, '#ff6600');
      base.hp -= b.damage;
      enemyBullets.splice(i, 1);
      addShake(5, 0.2);
      spawnExplosion(b.x, b.y, '#ff4444', 5);
    }
  }
}

// ==================== RENDER ====================
function render() {
  ctx.clearRect(0, 0, W, H);

  if (gameState === 'menu') {
    renderMenuBG();
    return;
  }

  _camOffX = camera.x - W/2 + shakeX;
  _camOffY = camera.y - H/2 + shakeY;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  renderBackground();
  renderGrid();
  renderObstacles();
  renderTracks();
  renderBase();
  renderPickups();

  for (let e of enemies) e.draw();
  if (boss) boss.draw();
  if (player) player.draw();

  renderBullets();
  renderParticles();
  drawDamageNumbers(ctx);

  // Эффект низкого HP
  if (player && player.hp < player.maxHp * 0.3) {
    let intensity = (1 - player.hp / (player.maxHp * 0.3)) * 0.3;
    ctx.fillStyle = `rgba(255,0,0,${intensity * (0.5 + Math.sin(gameTime * 4) * 0.5)})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();

  renderMinimap();
}

// ==================== INITIALIZATION ====================
function initGame() {
  player = new Player();
  base = {
    x: CONFIG.MAP_W/2 - CONFIG.BASE_SIZE/2,
    y: CONFIG.MAP_H - CONFIG.BASE_SIZE - 100,
    w: CONFIG.BASE_SIZE,
    h: CONFIG.BASE_SIZE,
    hp: CONFIG.BASE_HP_MAX + playerUpgrades.baseHp * 20,
    maxHp: CONFIG.BASE_HP_MAX + playerUpgrades.baseHp * 20
  };
  enemies = [];
  bullets = [];
  enemyBullets = [];
  particles = [];
  pickups = [];
  tracks = [];
  waveNumber = 0;
  waveDelay = 2;
  bossActive = false;
  boss = null;
  stats = { enemiesKilled: 0, shotsFired: 0, shotsHit: 0, damageDealt: 0, damageTaken: 0 };
  comboCount = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  generateObstacles(level);
  generateWaveData(level);
  updateHUD();
}

function startGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();

  if (level > 50) level = 1;
  if (!saveData.currentWeapon || !WEAPONS.find(w => w.id === saveData.currentWeapon)) {
    currentWeapon = 'cannon';
  }

  level = 1;
  score = 0;
  money = 0;
  bankLevel = saveData.bankLevel || 1;
  unlockedWeapons = saveData.unlockedWeapons || ['cannon'];
  currentWeapon = saveData.currentWeapon || 'cannon';
  playerUpgrades = saveData.playerUpgrades || { damage:0, fireRate:0, speed:0, hp:0, baseHp:0 };
  lives = 3;

  bestLevel = saveData.bestLevel || 0;
  bestScore = saveData.bestScore || 0;

  initGame();

  gameState = 'playing';
  hideAllScreens();
  document.getElementById('hud').style.display = isMobile ? 'none' : 'flex';
  document.getElementById('mobile-hud').style.display = isMobile ? 'flex' : 'none';
  document.getElementById('mobile-controls').style.display = isMobile ? 'block' : 'none';

  initAudio();
  if (settings.musicEnabled) startMusic();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  scale = Math.min(W / 800, H / 600, 2);
}

// ==================== INPUT HANDLING ====================
function initInput() {
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Escape') togglePause();
    if (e.code === 'Space' || e.code === 'Enter') {
      if (gameState === 'menu') startGame();
      if (gameState === 'gameOver' || gameState === 'victory') showMenu();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.worldX = e.clientX + camera.x - W/2;
    mouse.worldY = e.clientY + camera.y - H/2;
  });

  canvas.addEventListener('mousedown', () => {
    initAudio();
    mouse.down = true;
  });
  canvas.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Mobile touch
  canvas.addEventListener('touchstart', (e) => {
    initAudio();
    isMobile = true;
    let touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
    mouse.worldX = touch.clientX + camera.x - W/2;
    mouse.worldY = touch.clientY + camera.y - H/2;
    mouse.down = true;
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let touch = e.touches[0];
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
    mouse.worldX = touch.clientX + camera.x - W/2;
    mouse.worldY = touch.clientY + camera.y - H/2;
  });
  canvas.addEventListener('touchend', () => { mouse.down = false; });

  // Joystick
  let jz = document.getElementById('joystick-zone');
  let fb = document.getElementById('fire-btn');
  let wb = document.getElementById('weapon-btn');

  if (jz) {
    jz.addEventListener('touchstart', e => {
      e.preventDefault();
      initAudio();
      const t = e.changedTouches[0];
      joystick.active = true;
      joystick.id = t.identifier;
      const r = jz.getBoundingClientRect();
      joystick.startX = r.left + r.width/2;
      joystick.startY = r.top + r.height/2;
      updateJoystick(t);
    });
    jz.addEventListener('touchmove', e => {
      e.preventDefault();
      for (let t of e.changedTouches) {
        if (t.identifier === joystick.id) updateJoystick(t);
      }
    });
    jz.addEventListener('touchend', e => {
      for (let t of e.changedTouches) {
        if (t.identifier === joystick.id) {
          joystick.active = false;
          joystick.dx = 0;
          joystick.dy = 0;
          joystick.id = null;
          document.getElementById('joystick-knob').style.transform = 'translate(-50%, -50%)';
        }
      }
    });
  }

  if (fb) {
    fb.addEventListener('touchstart', e => { e.preventDefault(); initAudio(); mobileFire = true; });
    fb.addEventListener('touchend', e => { e.preventDefault(); mobileFire = false; });
  }

  if (wb) {
    wb.addEventListener('touchstart', e => {
      e.preventDefault();
      let weapons = WEAPONS.filter(w => unlockedWeapons.includes(w.id));
      let idx = weapons.findIndex(w => w.id === currentWeapon);
      let next = (idx + 1) % weapons.length;
      currentWeapon = weapons[next].id;
      updateHUD();
    });
  }
}

function updateJoystick(t) {
  let dx = t.clientX - joystick.startX;
  let dy = t.clientY - joystick.startY;
  let d = Math.hypot(dx, dy);
  let maxR = 50;
  if (d > maxR) { dx = dx/d*maxR; dy = dy/d*maxR; d = maxR; }
  joystick.dx = dx / maxR;
  joystick.dy = dy / maxR;
  const knob = document.getElementById('joystick-knob');
  if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

// ==================== SCREEN MANAGEMENT ====================
function showMenu() {
  gameState = 'menu';
  hideAllScreens();
  document.getElementById('menu-screen').style.display = 'flex';
  let save = loadSave();
  if ((save?.bestLevel ?? 0) > 0) {
    document.getElementById('btn-continue').style.display = 'inline-block';
    document.getElementById('btn-backup').style.display = 'inline-block';
  } else {
    document.getElementById('btn-continue').style.display = 'none';
    document.getElementById('btn-backup').style.display = 'none';
  }
  stopMusic();
}

function hideAllScreens() {
  ['menu-screen','pause-screen','gameover-screen','victory-screen','level-screen','upgrade-screen','settings-screen'].forEach(id => {
    let el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    document.getElementById('pause-screen').style.display = 'flex';
  } else if (gameState === 'paused') {
    gameState = 'playing';
    hideAllScreens();
    lastTime = performance.now();
  }
}

function endGameOver() {
  gameState = 'gameOver';
  if (score > bestScore) bestScore = score;
  if (level > bestLevel) bestLevel = level;
  saveSave({ bestScore, bestLevel, unlockedWeapons, currentWeapon, playerUpgrades, bankLevel, money, speed: gameSpeed });
  document.getElementById('go-level').textContent = level;
  document.getElementById('go-score').textContent = score;
  document.getElementById('go-best').textContent = bestScore;
  document.getElementById('gameover-screen').style.display = 'flex';
  stopMusic();
}

function endVictory() {
  gameState = 'victory';
  if (score > bestScore) bestScore = score;
  saveSave({ bestScore, bestLevel: 50, speed: gameSpeed });
  document.getElementById('v-score').textContent = score;
  document.getElementById('victory-screen').style.display = 'flex';
  stopMusic();
}

function showLevelComplete() {
  gameState = 'levelComplete';
  let earned = Math.floor(50 + level * 15 + enemies.reduce((a,e) => a + (e.money||0), 0) * 0.5);
  money += earned;
  score += 100 + level * 20;
  document.getElementById('ls-score').textContent = score;
  document.getElementById('ls-money').textContent = earned;
  document.getElementById('ls-title').textContent = level % CONFIG.BOSS_EVERY === 0 ? 'BOSS DEFEATED!' : 'LEVEL COMPLETE!';

  let statsHtml = `
    <div class="stat-line">Врагов уничтожено: ${stats.enemiesKilled}</div>
    <div class="stat-line">Выстрелов: ${stats.shotsFired}</div>
    <div class="stat-line">Точность: ${stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0}%</div>
    <div class="stat-line">Урон нанесён: ${Math.round(stats.damageDealt)}</div>
    <div class="stat-line">Урон получен: ${Math.round(stats.damageTaken)}</div>
  `;
  document.getElementById('ls-stats').innerHTML = statsHtml;
  document.getElementById('level-screen').style.display = 'flex';
  stopMusic();
}

function showUpgradeScreen() {
  gameState = 'upgrade';
  hideAllScreens();
  document.getElementById('upgrade-screen').style.display = 'flex';
  renderUpgrades();
}

// ==================== HUD ====================
function updateHUD() {
  let ph = Math.max(0, player ? Math.round(player.hp) : 0);
  let pm = player ? player.maxHp : 100;
  document.querySelector('#player-hp .bar-fill').style.width = (ph/pm*100)+'%';
  document.querySelector('#player-hp .bar-text').textContent = ph;

  let bh = Math.max(0, base ? Math.round(base.hp) : 0);
  let bm = base ? base.maxHp : 100;
  document.querySelector('#base-hp .bar-fill').style.width = (bh/bm*100)+'%';
  document.querySelector('#base-hp .bar-text').textContent = bh;

  document.getElementById('hud-level').textContent = level;
  document.getElementById('hud-money').textContent = money;
  document.getElementById('hud-bank').textContent = bankLevel;
  document.getElementById('hud-weapon').textContent = getWeapon().name;
  document.getElementById('hud-score').textContent = score;
  document.getElementById('hud-wave').textContent = `${waveNumber}/${totalWaves}`;
  document.getElementById('hud-combo').textContent = `x${comboMultiplier.toFixed(1)}`;

  document.getElementById('m-level').textContent = 'LVL '+level;
  document.getElementById('m-hp').textContent = 'HP '+ph;
  document.getElementById('m-base').textContent = 'BASE '+bh;
  document.getElementById('m-money').textContent = '\u{1F4B0}'+money;
  document.getElementById('m-weapon').textContent = getWeapon().name;
  document.getElementById('m-wave').textContent = waveNumber+'/'+totalWaves;
  document.getElementById('m-combo').textContent = 'x'+comboMultiplier.toFixed(1);

  if (boss) {
    document.getElementById('boss-hud').style.display = 'block';
    let bhp = Math.max(0, Math.round(boss.hp));
    let bmax = Math.max(0, boss.maxHp);
    document.getElementById('boss-hp').querySelector('.bar-fill').style.width = (bhp/bmax*100)+'%';
    document.getElementById('boss-hp').querySelector('.bar-text').textContent = bhp + ' / ' + bmax;
    document.getElementById('boss-name').textContent = '\u26A0 ' + boss.name;
  } else {
    document.getElementById('boss-hud').style.display = 'none';
  }

  if (comboCount >= 5) {
    document.getElementById('combo-display').style.display = 'block';
    document.getElementById('combo-display').textContent = `COMBO x${comboMultiplier.toFixed(1)}`;
  } else {
    document.getElementById('combo-display').style.display = 'none';
  }
}

// ==================== UPGRADES ====================
function renderUpgrades() {
  let panel = document.getElementById('upgrade-panel');
  if (!panel) return;
  let html = `<div style="text-align:left;margin-bottom:10px;font-size:18px">Money: \u{1F4B0} <span style="color:#f39c12">${money}</span></div>`;

  html += '<div style="text-align:left;margin-bottom:10px;font-size:14px;color:#aaa">WEAPONS</div><div class="weapon-select">';
  for (let w of WEAPONS) {
    let unlocked = unlockedWeapons.includes(w.id);
    let canBuy = !unlocked && money >= w.cost && level >= w.unlockLevel;
    let active = currentWeapon === w.id;
    html += `<div class="weapon-btn ${active?'active':''}" onclick="selectWeapon('${w.id}')" style="${!unlocked&&!canBuy?'opacity:0.4':''}">
      <div>${w.name}</div>
      <div style="font-size:11px;color:#aaa">${unlocked ? (active?'\u2713 Active':w.desc) : (level >= w.unlockLevel ? `\u{1F4B0}${w.cost}` : `LVL ${w.unlockLevel}`)}</div>
    </div>`;
  }
  html += '</div>';

  html += '<div style="text-align:left;margin:10px 0 5px;font-size:14px;color:#aaa">STATS</div>';
  let upgrades = [
    { key:'damage', name:'Damage', desc:'Increase damage +15%', stat: playerUpgrades.damage, cost: () => 100 + playerUpgrades.damage * 150 },
    { key:'fireRate', name:'Fire Rate', desc:'Increase fire rate +10%', stat: playerUpgrades.fireRate, cost: () => 100 + playerUpgrades.fireRate * 150 },
    { key:'speed', name:'Speed', desc:'Increase movement +20', stat: playerUpgrades.speed, cost: () => 80 + playerUpgrades.speed * 120 },
    { key:'hp', name:'Max HP', desc:'Increase max HP +20', stat: playerUpgrades.hp, cost: () => 120 + playerUpgrades.hp * 180 },
    { key:'baseHp', name:'Base HP', desc:'Increase base HP +20', stat: playerUpgrades.baseHp, cost: () => 150 + playerUpgrades.baseHp * 200 }
  ];

  for (let u of upgrades) {
    let cost = u.cost();
    let canAfford = money >= cost;
    html += `<div class="upgrade-row">
      <div class="upgrade-info">
        <div class="upgrade-name">${u.name} (Lv ${u.stat})</div>
        <div class="upgrade-desc">${u.desc}</div>
        <div class="upgrade-cost">\u{1F4B0} ${cost}</div>
      </div>
      <button class="upgrade-btn" ${!canAfford?'disabled':''} onclick="buyUpgrade('${u.key}',${cost})">BUY</button>
    </div>`;
  }

  let bankCost = 300 + bankLevel * 200;
  html += `<div class="upgrade-row">
    <div class="upgrade-info">
      <div class="upgrade-name">Bank (Lv ${bankLevel})</div>
      <div class="upgrade-desc">Increase income +20% per level</div>
      <div class="upgrade-cost">\u{1F4B0} ${bankCost}</div>
    </div>
    <button class="upgrade-btn" ${money < bankCost?'disabled':''} onclick="buyBank(${bankCost})">BUY</button>
  </div>`;

  panel.innerHTML = html;
}

window.selectWeapon = function(id) {
  let w = WEAPONS.find(w => w.id === id);
  if (!w) return;
  if (unlockedWeapons.includes(id)) {
    currentWeapon = id;
  } else if (money >= w.cost && level >= w.unlockLevel) {
    money -= w.cost;
    unlockedWeapons.push(id);
    currentWeapon = id;
  }
  saveSave({ bestScore, bestLevel, unlockedWeapons, currentWeapon, playerUpgrades, bankLevel, speed: gameSpeed });
  renderUpgrades();
  updateHUD();
};

window.buyUpgrade = function(key, cost) {
  if (money < cost) return;
  money -= cost;
  playerUpgrades[key]++;
  saveSave({ bestScore, bestLevel, unlockedWeapons, currentWeapon, playerUpgrades, bankLevel, speed: gameSpeed });
  renderUpgrades();
  updateHUD();
};

window.buyBank = function(cost) {
  if (money < cost) return;
  money -= cost;
  bankLevel++;
  saveSave({ bestScore, bestLevel, unlockedWeapons, currentWeapon, playerUpgrades, bankLevel, speed: gameSpeed });
  renderUpgrades();
  updateHUD();
};

// ==================== SETTINGS ====================
function renderSettings() {
  let panel = document.getElementById('settings-panel');
  if (!panel) return;
  let html = '';

  html += `<div class="setting-row">
    <div class="setting-info">
      <div class="setting-name">Размер поля</div>
      <div class="setting-desc">Маленькое, среднее или большое</div>
    </div>
    <div class="setting-control">
      <select onchange="updateSetting('mapSize', this.value)">
        <option value="small" ${settings.mapSize === 'small' ? 'selected' : ''}>Маленькое</option>
        <option value="medium" ${settings.mapSize === 'medium' ? 'selected' : ''}>Среднее</option>
        <option value="large" ${settings.mapSize === 'large' ? 'selected' : ''}>Большое</option>
      </select>
    </div>
  </div>`;

  html += `<div class="setting-row">
    <div class="setting-info">
      <div class="setting-name">Скорость игры</div>
      <div class="setting-desc">Текущая: ${settings.gameSpeed}x</div>
    </div>
    <div class="setting-control">
      <select onchange="updateSetting('gameSpeed', parseFloat(this.value))">
        <option value="0.25" ${settings.gameSpeed === 0.25 ? 'selected' : ''}>0.25x</option>
        <option value="0.5" ${settings.gameSpeed === 0.5 ? 'selected' : ''}>0.5x</option>
        <option value="0.75" ${settings.gameSpeed === 0.75 ? 'selected' : ''}>0.75x</option>
        <option value="1" ${settings.gameSpeed === 1 ? 'selected' : ''}>1.0x</option>
      </select>
    </div>
  </div>`;

  html += `<div class="setting-row">
    <div class="setting-info">
      <div class="setting-name">Вид танка</div>
      <div class="setting-desc">Цвет вашего танка</div>
    </div>
    <div class="setting-control">
      <select onchange="updateSetting('tankSkin', this.value)">
        <option value="blue" ${settings.tankSkin === 'blue' ? 'selected' : ''}>Синий</option>
        <option value="green" ${settings.tankSkin === 'green' ? 'selected' : ''}>Зеленый</option>
        <option value="red" ${settings.tankSkin === 'red' ? 'selected' : ''}>Красный</option>
        <option value="purple" ${settings.tankSkin === 'purple' ? 'selected' : ''}>Фиолетовый</option>
      </select>
    </div>
  </div>`;

  html += `<div class="setting-row">
    <div class="setting-info">
      <div class="setting-name">Громкость музыки</div>
      <div class="setting-desc">${Math.round(settings.musicVolume * 100)}%</div>
    </div>
    <div class="setting-control">
      <input type="range" min="0" max="1" step="0.1" value="${settings.musicVolume}" oninput="updateSetting('musicVolume', parseFloat(this.value))">
    </div>
  </div>`;

  html += `<div class="setting-row">
    <div class="setting-info">
      <div class="setting-name">Громкость звуков</div>
      <div class="setting-desc">${Math.round(settings.sfxVolume * 100)}%</div>
    </div>
    <div class="setting-control">
      <input type="range" min="0" max="1" step="0.1" value="${settings.sfxVolume}" oninput="updateSetting('sfxVolume', parseFloat(this.value))">
    </div>
  </div>`;

  html += `<div class="setting-row">
    <div class="setting-info">
      <div class="setting-name">Музыка</div>
      <div class="setting-desc">Включить/выключить музыку</div>
    </div>
    <div class="setting-control">
      <button class="setting-btn" onclick="toggleSetting('musicEnabled')">${settings.musicEnabled ? '\u2713 ВКЛ' : '\u2717 ВЫКЛ'}</button>
    </div>
  </div>`;

  html += `<div class="setting-row">
    <div class="setting-info">
      <div class="setting-name">Звуки</div>
      <div class="setting-desc">Включить/выключить звуки</div>
    </div>
    <div class="setting-control">
      <button class="setting-btn" onclick="toggleSetting('sfxEnabled')">${settings.sfxEnabled ? '\u2713 ВКЛ' : '\u2717 ВЫКЛ'}</button>
    </div>
  </div>`;

  panel.innerHTML = html;
}

window.updateSetting = function(key, value) {
  settings[key] = value;
  saveSettings();
  applySettings();
  renderSettings();
};

window.showSettingsScreen = function() {
  hideAllScreens();
  document.getElementById('settings-screen').style.display = 'flex';
  renderSettings();
};

window.earnedLevelBonus = function() {
  let earned = Math.floor(50 + level * 15);
  money += earned;
  score += 100 + level * 20;
  return earned;
};

window.toggleSetting = function(key) {
  settings[key] = !settings[key];
  saveSettings();
  applySettings();
  if (key === 'musicEnabled') {
    if (settings.musicEnabled && gameState === 'playing') { startMusic(); } else { stopMusic(); }
  }
  renderSettings();
};

// ==================== EVENT HANDLERS ====================
function initUIEvents() {
  document.getElementById('btn-play').addEventListener('click', () => {
    level = 1;
    score = 0;
    money = 0;
    bankLevel = saveData.bankLevel || 1;
    unlockedWeapons = saveData.unlockedWeapons || ['cannon'];
    currentWeapon = saveData.currentWeapon || 'cannon';
    playerUpgrades = saveData.playerUpgrades || { damage:0, fireRate:0, speed:0, hp:0, baseHp:0 };
    lives = 3;
    startGame();
  });

  document.getElementById('btn-continue').addEventListener('click', () => {
    level = (saveData.bestLevel || 1) + 1;
    if (level > 50) level = 1;
    score = 0;
    money = saveData.money || 0;
    bankLevel = saveData.bankLevel || 1;
    unlockedWeapons = saveData.unlockedWeapons || ['cannon'];
    currentWeapon = saveData.currentWeapon || 'cannon';
    playerUpgrades = saveData.playerUpgrades || { damage:0, fireRate:0, speed:0, hp:0, baseHp:0 };
    lives = 3;
    startGame();
  });

  document.getElementById('btn-resume').addEventListener('click', togglePause);
  document.getElementById('btn-restart-pause').addEventListener('click', () => { hideAllScreens(); startGame(); });
  document.getElementById('btn-menu-pause').addEventListener('click', showMenu);
  document.getElementById('btn-restart-go').addEventListener('click', () => { hideAllScreens(); score = 0; money = 0; lives = 3; startGame(); });
  document.getElementById('btn-menu-go').addEventListener('click', showMenu);
  document.getElementById('btn-menu-v').addEventListener('click', showMenu);

  document.getElementById('btn-upgrades').addEventListener('click', showUpgradeScreen);
  document.getElementById('btn-next-level').addEventListener('click', () => {
    level++;
    hideAllScreens();
    initGame();
    gameState = 'playing';
  });
  document.getElementById('btn-upgrade-done').addEventListener('click', () => {
    level++;
    if (level > CONFIG.TOTAL_LEVELS) level = CONFIG.TOTAL_LEVELS;
    money += earnedLevelBonus();
    hideAllScreens();
    initGame();
    gameState = 'playing';
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    hideAllScreens();
    document.getElementById('settings-screen').style.display = 'flex';
    renderSettings();
  });
  document.getElementById('btn-settings-done').addEventListener('click', () => {
    hideAllScreens();
    if (gameState === 'menu') {
      document.getElementById('menu-screen').style.display = 'flex';
    } else {
      document.getElementById('pause-screen').style.display = 'flex';
    }
  });

  document.getElementById('pause-btn').addEventListener('click', togglePause);

  document.getElementById('speed-btn').addEventListener('click', () => {
    let speeds = [1.0, 0.75, 0.5, 0.25];
    let idx = speeds.indexOf(gameSpeed);
    idx = (idx + 1) % speeds.length;
    gameSpeed = speeds[idx];
    settings.gameSpeed = gameSpeed;
    saveSettings();
    document.getElementById('speed-btn').textContent = gameSpeed + 'x';
  });

  document.getElementById('sound-btn').addEventListener('click', () => {
    settings.musicEnabled = !settings.musicEnabled;
    settings.sfxEnabled = settings.musicEnabled;
    saveSettings();
    applySettings();
    if (settings.musicEnabled && gameState === 'playing') {
      startMusic();
      document.getElementById('sound-btn').textContent = '\u{1F50A}';
    } else {
      stopMusic();
      document.getElementById('sound-btn').textContent = '\u{1F507}';
    }
  });
}

// ==================== MAIN INIT ====================
window.addEventListener('load', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  loadSettings();
  applySettings();
  loadSave();

  initInput();
  initUIEvents();
  showMenu();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
});