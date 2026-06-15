"use strict";

class Player {
  constructor() {
    this.x = CONFIG.MAP_W / 2;
    this.y = CONFIG.MAP_H / 2 + 100;
    this.size = CONFIG.PLAYER_SIZE;
    this.hp = CONFIG.PLAYER_HP_MAX + playerUpgrades.hp * 20;
    this.maxHp = this.hp;
    this.speed = CONFIG.PLAYER_SPEED + playerUpgrades.speed * 20;
    this.angle = 0;
    this.fireTimer = 0;
    this.damageMult = 1 + playerUpgrades.damage * 0.15;
    this.fireRateMult = 1 - playerUpgrades.fireRate * 0.1;
    this.invulnTimer = 0;
    this.trackOffset = 0;
    this.moving = false;
    this.trackTimer = 0;
  }

  update(dt) {
    let dtS = dt * gameSpeed;
    let mx = 0, my = 0;
    if (keys['KeyW'] || keys['ArrowUp']) my -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) my += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    if (joystick.active) { mx = joystick.dx; my = joystick.dy; }

    let len = Math.hypot(mx, my);
    this.moving = len > 0;

    if (len > 0) {
      let moveAngle = Math.atan2(my, mx);
      mx /= len; my /= len;
      this.x += mx * this.speed * dtS;
      this.y += my * this.speed * dtS;
      this.trackOffset += this.speed * dtS * 0.1;

      // СЛЕДЫ ГУСЕНИЦ (используем направление движения, а не взгляда)
      this.trackTimer += dtS;
      if (this.trackTimer > 0.08) {
        this.trackTimer = 0;
        let trackSkin = settings?.tankSkin || 'blue';
        let trackColor = trackSkin === 'green' ? '#1a6e3a' : trackSkin === 'red' ? '#6e1a1a' : trackSkin === 'purple' ? '#4a1a5a' : '#1a3e5e';
        tracks.push({
          x: this.x, y: this.y, angle: moveAngle,
          life: 8, maxLife: 8, size: this.size,
          color: trackColor
        });
        if (tracks.length > 600) tracks.shift();
      }
    }

    this.x = clamp(this.x, this.size, CONFIG.MAP_W - this.size);
    this.y = clamp(this.y, this.size, CONFIG.MAP_H - this.size);

    for (let o of obstacles) {
      if (circleRectCollide(this.x, this.y, this.size, o.x, o.y, o.w, o.h)) {
        let cx = clamp(this.x, o.x, o.x + o.w);
        let cy = clamp(this.y, o.y, o.y + o.h);
        let dx = this.x - cx, dy = this.y - cy;
        let d = Math.hypot(dx, dy);
        if (d > 0) { this.x += dx/d * (this.size - d); this.y += dy/d * (this.size - d); }
      }
    }

    // Прицеливание
    if (!isMobile) {
      this.angle = angle(this, { x: mouse.worldX, y: mouse.worldY });
    } else {
      let nearest = null, nearDist = Infinity;
      for (let e of enemies) {
        let d = dist(this, e);
        if (d < nearDist) { nearDist = d; nearest = e; }
      }
      if (nearest && nearDist < 500) {
        this.angle = angle(this, nearest);
      } else {
        this.angle = Math.atan2(-(this.y - base.y), base.x - this.x);
      }
    }

    // Стрельба
    let w = getWeapon();
    this.fireTimer -= dtS;
    if ((mouse.down || mobileFire) && this.fireTimer <= 0) {
      this.fire(w);
      this.fireTimer = w.fireRate * this.fireRateMult;
      stats.shotsFired++;
    }

    this.invulnTimer -= dt;
  }

  fire(w) {
    playSound('shoot');
    spawnMuzzleFlash(
      this.x + Math.cos(this.angle) * (this.size + 8),
      this.y + Math.sin(this.angle) * (this.size + 8),
      this.angle,
      w.color
    );
    addScreenShake(1.2);
    let dmg = w.damage * this.damageMult;
    let count = w.bullets || 1;
    for (let i = 0; i < count; i++) {
      let a = this.angle + (w.spread ? (rand(-1,1) * w.spread * (Math.PI/2)) : 0);
      bullets.push({
        x: this.x + Math.cos(this.angle) * (this.size + 5),
        y: this.y + Math.sin(this.angle) * (this.size + 5),
        vx: Math.cos(a) * w.bulletSpeed,
        vy: Math.sin(a) * w.bulletSpeed,
        damage: dmg,
        size: w.bulletSize,
        color: w.color,
        pierce: w.pierce || 0,
        pierceCount: 0,
        explode: w.explode || 0,
        life: 3
      });
    }
    for (let i = 0; i < 5; i++) {
      particles.push(createParticle(
        this.x + Math.cos(this.angle) * (this.size + 8),
        this.y + Math.sin(this.angle) * (this.size + 8),
        Math.cos(this.angle + rand(-0.3,0.3)) * rand(50,150),
        Math.sin(this.angle + rand(-0.3,0.3)) * rand(50,150),
        w.color, rand(2,5), 0.3
      ));
    }
  }

  takeDamage(dmg) {
    if (this.invulnTimer > 0) return;
    this.hp -= dmg;
    this.invulnTimer = 0.5;
    stats.damageTaken += dmg;
    if (this.hp < 0) this.hp = 0;
    addShake(4, 0.2);
    playSound('hit');

    if (this.hp <= 0) {
      lives--;
      if (lives <= 0) {
        endGameOver();
      } else {
        this.hp = this.maxHp;
        this.x = CONFIG.MAP_W/2;
        this.y = CONFIG.MAP_H/2 + 100;
        this.invulnTimer = 3;
      }
    }
  }

  draw() {
    let sx = this.x - _camOffX;
    let sy = this.y - _camOffY;

    const bodyColor = getDynamicColor(settings.tankSkin);
    const darkColor  = shadeColor(bodyColor, -40);
    const lightColor = shadeColor(bodyColor, -80);

    ctx.save();
    ctx.translate(sx, sy);

    // 1. Гусеницы
    ctx.fillStyle = darkColor;
    ctx.fillRect(-this.size - 4, -this.size + 3, 8, this.size * 2 - 6);
    ctx.fillRect(this.size - 4, -this.size + 3, 8, this.size * 2 - 6);

    ctx.save();
    ctx.fillStyle = shadeColor(bodyColor, -80);
    let patternOffset = this.trackOffset % 10;
    for (let i = -this.size + 3; i < this.size - 3; i += 10) {
      let y = i + patternOffset;
      if (y >= -this.size + 3 && y <= this.size - 13) {
        ctx.fillRect(-this.size - 3, y, 6, 6);
        ctx.fillRect(this.size - 3, y, 6, 6);
      }
    }
    ctx.restore();

    // 2. Корпус с вращением
    ctx.save();
    ctx.rotate(this.angle);

    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 10) % 2) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-this.size, -this.size, this.size*2, this.size*2, 6);
    ctx.fill();

    ctx.strokeStyle = shadeColor(bodyColor, 100);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = darkColor;
    ctx.fillRect(0, -4, this.size + 8, 8);

    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}