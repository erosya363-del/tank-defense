"use strict";

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
  let nearX = clamp(cx, rx, rx + rw);
  let nearY = clamp(cy, ry, ry + rh);
  return Math.hypot(cx - nearX, cy - nearY) < cr;
}

function weightedPick(items, weights) {
  let total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function shadeColor(hex, percent) {
  let num = parseInt(hex.replace('#',''), 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + percent));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  let b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function getDynamicColor(skin) {
  switch(skin) {
    case 'green': return '#2ecc71';
    case 'red':   return '#e74c3c';
    case 'purple': return '#9b59b6';
    default: return '#4a9eff';
  }
}

function getWeapon() {
  return WEAPONS.find(w => w.id === currentWeapon) || WEAPONS[0];
}

function getSpawnPosition() {
  let side = randInt(0, 3);
  let x, y;
  switch(side) {
    case 0: x = rand(100, CONFIG.MAP_W-100); y = CONFIG.MAP_SPAWN_MARGIN; break;
    case 1: x = CONFIG.MAP_W - CONFIG.MAP_SPAWN_MARGIN; y = rand(100, CONFIG.MAP_H-100); break;
    case 2: x = rand(100, CONFIG.MAP_W-100); y = CONFIG.MAP_H - CONFIG.MAP_SPAWN_MARGIN; break;
    case 3: x = CONFIG.MAP_SPAWN_MARGIN; y = rand(100, CONFIG.MAP_H-100); break;
  }
  return { x, y };
}

// Polyfill for roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r,r,r,r];
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    this.lineTo(x + w, y + h - r[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    this.lineTo(x + r[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    this.lineTo(x, y + r[0]);
    this.quadraticCurveTo(x, y, x + r[0], y);
    this.closePath();
    return this;
  };
}