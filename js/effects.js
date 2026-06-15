"use strict";

// ==================== PARTICLES ====================
const MAX_PARTICLES = 300;

function createParticle(x, y, vx, vy, color, size, life) {
  return { x, y, vx, vy, color, size, life, maxLife: life };
}

// Взрыв с искрами, дымом и осколками
function spawnExplosion(x, y, color, count) {
  count = Math.min(count, 20);
  let mainColor = color || '#ff8844';

  // Искры (быстрые, яркие)
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    let a = rand(0, Math.PI * 2);
    let spd = rand(60, 280);
    particles.push(createParticle(
      x, y,
      Math.cos(a) * spd,
      Math.sin(a) * spd,
      mainColor,
      rand(2, 6),
      rand(0.2, 0.6)
    ));
  }

  // Дым (медленный, серый, крупный)
  for (let i = 0; i < count / 2; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    let a = rand(0, Math.PI * 2);
    let spd = rand(10, 80);
    let smokeGray = 40 + Math.floor(rand(0, 60));
    particles.push(createParticle(
      x + rand(-5, 5), y + rand(-5, 5),
      Math.cos(a) * spd,
      Math.sin(a) * spd,
      `rgb(${smokeGray},${smokeGray},${smokeGray})`,
      rand(6, 14),
      rand(0.6, 1.4)
    ));
  }

  // Осколки (маленькие, быстрые, белые)
  for (let i = 0; i < count / 3; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    let a = rand(0, Math.PI * 2);
    let spd = rand(100, 350);
    particles.push(createParticle(
      x, y,
      Math.cos(a) * spd,
      Math.sin(a) * spd,
      '#ffffff',
      rand(1, 3),
      rand(0.1, 0.3)
    ));
  }
}

// Эффект попадания пули
function spawnHitEffect(x, y, color) {
  // Вспышка
  if (particles.length < MAX_PARTICLES) {
    particles.push(createParticle(x, y, 0, 0, '#ffffff', rand(8, 14), 0.08));
  }

  // Искры от рикошета
  for (let i = 0; i < 6; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    let a = rand(0, Math.PI * 2);
    let spd = rand(80, 250);
    particles.push(createParticle(
      x, y,
      Math.cos(a) * spd,
      Math.sin(a) * spd,
      color || '#ffcc44',
      rand(1, 3),
      rand(0.1, 0.35)
    ));
  }
}

// Тряска камеры
function addShake(intensity, duration) {
  shakeTime = Math.max(shakeTime, duration);
  shakeX = rand(-intensity, intensity);
  shakeY = rand(-intensity, intensity);
}

function addScreenShake(intensity) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
}

// Огненный след (для ракет/пуль)
function spawnTrail(x, y, color) {
  if (particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < 2; i++) {
    particles.push(createParticle(
      x + rand(-2, 2), y + rand(-2, 2),
      rand(-10, 10), rand(-10, 10),
      color || '#ffaa44',
      rand(2, 4),
      rand(0.1, 0.25)
    ));
  }
}

// ==================== DAMAGE NUMBERS ====================
window.damageNumbers = [];

function showDamageNumber(x, y, damage) {
  damageNumbers.push({
    x, y,
    value: Math.round(damage),
    life: 1.0,
    vy: -25,
  });
}

function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    let dn = damageNumbers[i];
    dn.y += dn.vy * dt;
    dn.vy += 10 * dt; // gravity
    dn.life -= dt;
    if (dn.life <= 0) damageNumbers.splice(i, 1);
  }
}

function drawDamageNumbers(ctx) {
  if (!damageNumbers.length) return;
  ctx.save();
  for (let dn of damageNumbers) {
    ctx.globalAlpha = Math.max(0, dn.life);
    ctx.fillStyle = "#ffcc00";
    ctx.font = `bold ${14 + (1 - dn.life) * 4}px Arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;

    let sx = dn.x - _camOffX;
    let sy = dn.y - _camOffY;
    ctx.fillText(dn.value, sx, sy);
  }
  ctx.restore();
}

// ==================== MUZZLE FLASH ====================
function spawnMuzzleFlash(x, y, angle, color) {
  if (particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < 3; i++) {
    let a = angle + rand(-0.2, 0.2);
    let spd = rand(50, 150);
    particles.push(createParticle(
      x + Math.cos(angle) * 5,
      y + Math.sin(angle) * 5,
      Math.cos(a) * spd,
      Math.sin(a) * spd,
      '#ffffee',
      rand(3, 6),
      rand(0.05, 0.12)
    ));
  }
}