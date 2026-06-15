"use strict";

class Enemy {
  constructor(type, x, y, level) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.level = level;
    this.size = CONFIG.ENEMY_SIZES ? CONFIG.ENEMY_SIZES[type] || 20 : (ENEMY_TYPES[type] ? ENEMY_TYPES[type].size : 20);
    this.angle = 0;
    this.fireTimer = rand(0.5, 2);
    this.state = 'move';
    this.stateTimer = rand(1, 3);
    this.trackOffset = 0;
    this.flashTimer = 0;
    this.trackTimer = 0;

    let s = 1 + level * 0.04;
    let cfg = ENEMY_TYPES[type];
    if (cfg) {
      this.hp = cfg.hp * s; this.maxHp = this.hp;
      this.speed = cfg.speed; this.damage = cfg.damage * s; this.color = cfg.color;
      this.fireRate = cfg.fireRate; this.bulletSpeed = cfg.bulletSpeed; this.money = cfg.money;
    } else {
      this.hp = 20 * s; this.maxHp = this.hp;
      this.speed = 90; this.damage = 8 * s; this.color = '#82c91e';
      this.fireRate = 1.5; this.bulletSpeed = 250; this.money = 10;
    }
  }

  update(dt) {
    let dtS = dt * gameSpeed;
    this.flashTimer -= dt;

    let target = base;
    let dToBase = dist(this, target);
    let dToPlayer = player ? dist(this, player) : Infinity;

    if (player && dToPlayer < 300) {
      target = player;
      this.angle = angle(this, player);
    } else {
      target = base;
      this.angle = angle(this, {x: base.x + base.w/2, y: base.y + base.h/2});
    }

    this.stateTimer -= dtS;
    if (this.stateTimer <= 0) {
      if (this.type === 'striker') {
        this.state = this.state === 'charge' ? 'move' : 'charge';
        this.stateTimer = rand(1, 2);
      } else {
        this.state = this.state === 'shoot' ? 'move' : (dToBase < 250 || dToPlayer < 250 ? 'shoot' : 'move');
        this.stateTimer = rand(1, 3);
      }
    }

    if (this.state === 'move' || this.state === 'charge') {
      let spd = this.state === 'charge' ? this.speed * 1.8 : this.speed;
      let tx = target.x + (target.w ? target.w/2 : 0) - this.x;
      let ty = target.y + (target.h ? target.h/2 : 0) - this.y;
      let tlen = Math.hypot(tx, ty);
      if (tlen > 0) {
        this.x += (tx/tlen) * spd * dtS;
        this.y += (ty/tlen) * spd * dtS;
        this.trackOffset += spd * dtS * 0.1;

        // СЛЕДЫ ГУСЕНИЦ
        this.trackTimer += dtS;
        if (this.trackTimer > 0.12) {
          this.trackTimer = 0;
          tracks.push({
            x: this.x, y: this.y, angle: this.angle,
            life: 5, maxLife: 5, size: this.size, color: shadeColor(this.color, -40)
          });
          if (tracks.length > 600) tracks.shift();
        }
      }
    }

    if (this.state === 'shoot' || (this.type === 'elite' && (dToPlayer < 400 || dToBase < 400))) {
      this.fireTimer -= dtS;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireRate;
        let a = angle(this, target);
        let spread = this.type === 'elite' ? 0.15 : 0;
        for (let i = 0; i < (this.type === 'elite' ? 3 : 1); i++) {
          let fa = a + (spread ? rand(-1,1)*spread*Math.PI/2 : 0);
          enemyBullets.push({
            x: this.x + Math.cos(a) * this.size,
            y: this.y + Math.sin(a) * this.size,
            vx: Math.cos(fa) * this.bulletSpeed,
            vy: Math.sin(fa) * this.bulletSpeed,
            damage: this.damage,
            size: this.type === 'heavy' || this.type === 'artillery' ? 6 : 4,
            life: 4
          });
        }
      }
    }

    // Коллизия с препятствиями
    for (let o of obstacles) {
      if (circleRectCollide(this.x, this.y, this.size, o.x, o.y, o.w, o.h)) {
        let cx = clamp(this.x, o.x, o.x + o.w);
        let cy = clamp(this.y, o.y, o.y + o.h);
        let dx = this.x - cx, dy = this.y - cy;
        let d2 = Math.hypot(dx, dy);
        if (d2 > 0) { this.x += dx/d2 * (this.size - d2); this.y += dy/d2 * (this.size - d2); }
      }
    }

    // Коллизия с другими врагами (отталкивание)
    for (let other of enemies) {
      if (other === this) continue;
      let dx = this.x - other.x;
      let dy = this.y - other.y;
      let d = Math.hypot(dx, dy);
      let minDist = this.size + other.size;
      if (d < minDist && d > 0) {
        let push = (minDist - d) * 0.5;
        this.x += (dx / d) * push;
        this.y += (dy / d) * push;
      }
    }

    // Коллизия с игроком (только врага отталкиваем, не трогаем player.x/y)
    if (player) {
      let dx = this.x - player.x;
      let dy = this.y - player.y;
      let d = Math.hypot(dx, dy);
      let minDist = this.size + player.size;
      if (d < minDist && d > 0) {
        let push = (minDist - d);
        this.x += (dx / d) * push;
        this.y += (dy / d) * push;
      }
    }

    // Коллизия с базой — отталкивание, а не смерть
    if (circleRectCollide(this.x, this.y, this.size, base.x, base.y, base.w, base.h)) {
      let cx = clamp(this.x, base.x, base.x + base.w);
      let cy = clamp(this.y, base.y, base.y + base.h);
      let dx = this.x - cx, dy = this.y - cy;
      let d2 = Math.hypot(dx, dy);
      if (d2 > 0) {
        this.x += (dx/d2) * (this.size - d2 + 2);
        this.y += (dy/d2) * (this.size - d2 + 2);
      }
      base.hp -= this.damage * 0.1;
      this.state = 'shoot';
    }
  }

  draw() {
    let sx = this.x - _camOffX;
    let sy = this.y - _camOffY;
    if (sx < -50 || sx > W+50 || sy < -50 || sy > H+50) return;

    ctx.save();
    ctx.translate(sx, sy);

    if (this.flashTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.flashTimer * 30) * 0.5;
    }

    // Гусеницы
    ctx.fillStyle = shadeColor(this.color, -40);
    ctx.fillRect(-this.size - 3, -this.size + 2, 6, this.size*2 - 4);
    ctx.fillRect(this.size - 3, -this.size + 2, 6, this.size*2 - 4);

    // Паттерн гусениц
    ctx.save();
    ctx.fillStyle = shadeColor(this.color, -60);
    let patternOffset = this.trackOffset % 8;
    for (let i = -this.size + 2; i < this.size - 2; i += 8) {
      let y = i + patternOffset;
      if (y >= -this.size + 2 && y <= this.size - 10) {
        ctx.fillRect(-this.size - 2, y, 4, 4);
        ctx.fillRect(this.size - 2, y, 4, 4);
      }
    }
    ctx.restore();

    // Корпус
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-this.size, -this.size, this.size*2, this.size*2, 4);
    ctx.fill();
    ctx.strokeStyle = shadeColor(this.color, 40);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Дуло
    ctx.fillStyle = shadeColor(this.color, 20);
    ctx.fillRect(0, -3, this.size + 6, 6);
    // Башня
    ctx.fillStyle = shadeColor(this.color, 30);
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.45, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Полоска HP
    if (this.hp < this.maxHp) {
      let bw = this.size * 2;
      let bh = 4;
      let by = -this.size - 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(-bw/2, by, bw, bh);
      ctx.fillStyle = this.hp/this.maxHp > 0.5 ? '#2ecc71' : this.hp/this.maxHp > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(-bw/2, by, bw * (this.hp/this.maxHp), bh);
    }

    ctx.restore();
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.flashTimer = 0.1;
    stats.damageDealt += dmg;
    playSound('hit');

    if (this.hp <= 0) {
      stats.enemiesKilled++;
      comboCount++;
      comboTimer = 2;
      comboMultiplier = 1 + Math.floor(comboCount / 5) * 0.1;

      money += Math.floor(this.money * comboMultiplier * (1 + (bankLevel - 1) * 0.2));
      score += this.money;
      spawnExplosion(this.x, this.y, this.color, 15);
      playSound('explosion');

      if (Math.random() < 0.15) {
        pickups.push({ x: this.x, y: this.y, type: 'health', amount: 15, life: 10, size: 10 });
      }
      return true;
    }
    return false;
  }
}

class Boss {
  constructor(level) {
    this.type = 'boss';
    this.size = 45;
    this.x = CONFIG.MAP_W / 2;
    this.y = CONFIG.MAP_SPAWN_MARGIN || 80;
    this.angle = 0;
    this.trackOffset = 0;
    this.state = 'approach';
    this.stateTimer = 3;
    this.fireTimer = 0;
    this.flashTimer = 0;
    this.level = level;
    this.minionTimer = 15;
    this.trackTimer = 0;

    let s = 1 + level * 0.08;
    this.hp = 300 * s;
    this.maxHp = this.hp;
    this.speed = 50;
    this.damage = 30 * s;
    this.bulletSpeed = 300;
    this.pattern = 0;
    this.patternTimer = 0;
    this.specialCharge = 0;

    this.name = 'БОСС ' + BOSS_NAMES[Math.floor((level / CONFIG.BOSS_EVERY - 1) % BOSS_NAMES.length)];
    this.color = CONFIG.COLORS.boss;

    playSound('boss');
  }

  update(dt) {
    let dtS = dt * gameSpeed;
    this.flashTimer -= dt;
    this.trackOffset += this.speed * dtS * 0.1;

    let target = base;
    let cx = target.x + target.w/2;
    let cy = target.y + target.h/2;
    this.angle = angle(this, {x:cx, y:cy});

    this.stateTimer -= dtS;
    this.patternTimer -= dtS;
    this.minionTimer -= dtS;
    this.specialCharge -= dtS;

    // СЛЕДЫ ГУСЕНИЦ
    this.trackTimer += dtS;
    if (this.trackTimer > 0.06) {
      this.trackTimer = 0;
      tracks.push({
        x: this.x, y: this.y, angle: this.angle,
        life: 10, maxLife: 10, size: this.size, color: '#880033'
      });
      if (tracks.length > 600) tracks.shift();
    }

    switch(this.state) {
      case 'approach':
        let d = dist(this, {x:cx, y:cy});
        if (d < 300) {
          this.state = 'attack';
          this.stateTimer = rand(2, 4);
          this.pattern = randInt(0, 3);
        } else {
          this.x += Math.cos(this.angle) * this.speed * dtS;
          this.y += Math.sin(this.angle) * this.speed * dtS;
        }
        break;
      case 'attack':
        let strafeAngle = this.angle + Math.PI/2 * (Math.sin(gameTime * 2) > 0 ? 1 : -1);
        this.x += Math.cos(strafeAngle) * this.speed * 0.5 * dtS;
        this.y += Math.sin(strafeAngle) * this.speed * 0.5 * dtS;

        if (this.stateTimer <= 0) {
          this.state = 'reload';
          this.stateTimer = 2;
        }

        this.fireTimer -= dtS;
        if (this.fireTimer <= 0) {
          this.fireTimer = 0.3;
          switch(this.pattern) {
            case 0:
              let sa = this.angle + gameTime * 3;
              enemyBullets.push({
                x: this.x + Math.cos(sa) * this.size,
                y: this.y + Math.sin(sa) * this.size,
                vx: Math.cos(sa) * this.bulletSpeed,
                vy: Math.sin(sa) * this.bulletSpeed,
                damage: this.damage * 0.5,
                size: 5,
                life: 4
              });
              break;
            case 1:
              let ba = angle(this, {x:cx, y:cy});
              for (let i = -2; i <= 2; i++) {
                let a = ba + i * 0.2;
                enemyBullets.push({
                  x: this.x + Math.cos(a) * this.size,
                  y: this.y + Math.sin(a) * this.size,
                  vx: Math.cos(a) * this.bulletSpeed,
                  vy: Math.sin(a) * this.bulletSpeed,
                  damage: this.damage * 0.4,
                  size: 5,
                  life: 4
                });
              }
              this.fireTimer = 0.8;
              break;
            case 2:
              if (Math.floor(this.patternTimer * 2) !== Math.floor((this.patternTimer + dtS) * 2)) {
                for (let i = 0; i < 12; i++) {
                  let a = (i / 12) * Math.PI * 2;
                  enemyBullets.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(a) * this.bulletSpeed * 0.7,
                    vy: Math.sin(a) * this.bulletSpeed * 0.7,
                    damage: this.damage * 0.3,
                    size: 4,
                    life: 3
                  });
                }
              }
              break;
            case 3:
              if (this.specialCharge <= 0) {
                let ca = angle(this, {x:cx, y:cy});
                enemyBullets.push({
                  x: this.x, y: this.y,
                  vx: Math.cos(ca) * this.bulletSpeed * 1.5,
                  vy: Math.sin(ca) * this.bulletSpeed * 1.5,
                  damage: this.damage * 2,
                  size: 10,
                  life: 3
                });
                this.specialCharge = 3;
              }
              break;
          }
        }
        break;
      case 'reload':
        let d2 = dist(this, {x:cx, y:cy});
        if (d2 > 350) {
          this.x += Math.cos(this.angle) * this.speed * dtS;
          this.y += Math.sin(this.angle) * this.speed * dtS;
        }
        if (this.stateTimer <= 0) {
          this.state = 'attack';
          this.stateTimer = rand(2, 4);
          this.pattern = randInt(0, 3);
        }
        break;
    }

    if (this.minionTimer <= 0 && enemies.length < 8) {
      this.minionTimer = 10;
      let spawnCount = Math.min(2 + Math.floor(this.level / 10), 5);
      for (let i = 0; i < spawnCount; i++) {
        let a = rand(0, Math.PI * 2);
        let d = this.size + 20;
        let e = new Enemy('light', this.x + Math.cos(a)*d, this.y + Math.sin(a)*d, this.level);
        e.hp *= 0.7; e.maxHp = e.hp;
        e.money = Math.floor(e.money * 0.5);
        enemies.push(e);
      }
    }

    this.x = clamp(this.x, this.size, CONFIG.MAP_W - this.size);
    this.y = clamp(this.y, this.size, CONFIG.MAP_H - this.size);
  }

  draw() {
    let sx = this.x - _camOffX;
    let sy = this.y - _camOffY;
    if (sx < -100 || sx > W+100 || sy < -100 || sy > H+100) return;

    ctx.save();
    ctx.translate(sx, sy);

    if (this.flashTimer > 0) ctx.globalAlpha = 0.5 + Math.sin(this.flashTimer * 30) * 0.5;

    // Radial glow
    let grad = ctx.createRadialGradient(0, 0, this.size * 0.5, 0, 0, this.size * 2);
    grad.addColorStop(0, 'rgba(255,0,68,0.3)');
    grad.addColorStop(1, 'rgba(255,0,68,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Гусеницы
    ctx.fillStyle = '#880033';
    ctx.fillRect(-this.size - 5, -this.size + 5, 10, this.size*2 - 10);
    ctx.fillRect(this.size - 5, -this.size + 5, 10, this.size*2 - 10);

    // Паттерн гусениц
    ctx.save();
    ctx.fillStyle = '#660022';
    let patternOffset = this.trackOffset % 12;
    for (let i = -this.size + 5; i < this.size - 5; i += 12) {
      let y = i + patternOffset;
      if (y >= -this.size + 5 && y <= this.size - 17) {
        ctx.fillRect(-this.size - 4, y, 8, 8);
        ctx.fillRect(this.size - 4, y, 8, 8);
      }
    }
    ctx.restore();

    // Корпус
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = CONFIG.COLORS.boss;
    ctx.beginPath();
    ctx.roundRect(-this.size, -this.size, this.size*2, this.size*2, 8);
    ctx.fill();
    ctx.strokeStyle = '#ff6688';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Внутренний круг
    ctx.fillStyle = '#cc0033';
    ctx.beginPath();
    ctx.roundRect(-this.size*0.6, -this.size*0.6, this.size*1.2, this.size*1.2, 6);
    ctx.fill();

    // Дуло
    ctx.fillStyle = '#ff4466';
    ctx.fillRect(0, -5, this.size + 12, 10);
    ctx.fillStyle = '#ff6688';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Глаз
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.size * 0.3, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(this.size * 0.35, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.flashTimer = 0.08;
    stats.damageDealt += dmg;

    if (this.hp <= 0) {
      money += 200 * (1 + (bankLevel - 1) * 0.3);
      score += 500;
      spawnExplosion(this.x, this.y, '#ff0044', 40);
      spawnExplosion(this.x - 20, this.y - 20, '#ff6600', 20);
      spawnExplosion(this.x + 20, this.y + 20, '#ffaa00', 20);
      addShake(12, 0.5);
      playSound('explosion');
      return true;
    }
    return false;
  }
}