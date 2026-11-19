// combat.js — shooting, bullets, and hostile gunmen.
(function (global) {
  'use strict';
  var U = global.HH.util;

  function makeEnemy(x, y, kind) {
    return {
      x: x, y: y, angle: 0, speed: 95,
      health: kind === 'heavy' ? 120 : 60, kind: kind || 'thug',
      shootCd: U.range(Math.random, 0.4, 1.2), state: 'guard',
      burst: 0, retarget: 0
    };
  }

  function fireBullet(game, x, y, angle, from) {
    game.bullets.push({
      x: x + Math.cos(angle) * 26, y: y + Math.sin(angle) * 26,
      angle: angle, speed: 780, life: 0.85, from: from, damage: from === 'player' ? 34 : 9
    });
    global.HH.audio.sfx.shoot();
  }

  // Player shooting with the mouse.
  function playerShoot(game, p, dt) {
    if (p.onFoot === false) return;
    if (!global.HH.input.wasClicked() && !global.HH.input.mouse.down) return;
    if (p.shootCd > 0) return;
    p.shootCd = 0.24;
    fireBullet(game, p.x, p.y, p.aimAngle, 'player');
    global.HH.cops.addHeat(game.wanted, 0.25);
  }

  function updateBullets(game, dt) {
    var bullets = game.bullets;
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      var dead = b.life <= 0 || !global.HH.city.inBounds(game.city, b.x, b.y, 4);
      if (!dead && global.HH.city.hitBuilding(game.city, b.x, b.y, 2)) {
        dead = true;
        game.sparks.push({ x: b.x, y: b.y, life: 0.25, max: 0.25 });
      }
      if (!dead && b.from !== 'player') {
        var p = game.player;
        if (U.dist(b.x, b.y, p.x, p.y) < (p.onFoot ? 14 : 26)) {
          global.HH.player.hurt(p, b.damage);
          dead = true;
        }
      }
      if (!dead && b.from === 'player') {
        // Hit enemies.
        for (var e = 0; e < game.enemies.length; e++) {
          var en = game.enemies[e];
          if (U.dist(b.x, b.y, en.x, en.y) < 16) {
            en.health -= b.damage;
            game.sparks.push({ x: b.x, y: b.y, life: 0.3, max: 0.3 });
            global.HH.audio.sfx.hit();
            dead = true;
            break;
          }
        }
        // Hit foot cops.
        if (!dead) {
          for (var c = 0; c < game.footCops.length; c++) {
            var cop = game.footCops[c];
            if (U.dist(b.x, b.y, cop.x, cop.y) < 15) {
              cop.health -= b.damage;
              global.HH.audio.sfx.hit();
              dead = true;
              if (cop.health <= 0) global.HH.cops.addHeat(game.wanted, global.HH.cops.HEAT.killCop);
              break;
            }
          }
        }
        // Hit a pedestrian (counts as a crime).
        if (!dead) {
          for (var pd = 0; pd < game.peds.length; pd++) {
            var ped = game.peds[pd];
            if (U.dist(b.x, b.y, ped.x, ped.y) < 13) {
              game.peds.splice(pd, 1);
              global.HH.cops.addHeat(game.wanted, global.HH.cops.HEAT.hitPed);
              dead = true;
              break;
            }
          }
        }
        // Hit a car.
        if (!dead) {
          var all = game.cars.concat(game.copCars);
          for (var ci = 0; ci < all.length; ci++) {
            var car = all[ci];
            if (U.pointInCar(b.x, b.y, car)) {
              car.health -= b.damage;
              game.sparks.push({ x: b.x, y: b.y, life: 0.3, max: 0.3 });
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) bullets.splice(i, 1);
    }
    // Burning wrecks: cars at 0 health smoke and stop.
    var allCars = game.cars.concat(game.copCars);
    for (var k = 0; k < allCars.length; k++) {
      var cc = allCars[k];
      if (cc.health <= 0 && cc.driver !== 'wreck') {
        cc.driver = 'wreck';
        cc.speed = 0;
        global.HH.audio.sfx.crash();
      }
    }
  }

  function updateEnemies(game, dt) {
    var p = game.player;
    for (var i = game.enemies.length - 1; i >= 0; i--) {
      var en = game.enemies[i];
      if (en.health <= 0) {
        game.enemies.splice(i, 1);
        game.missions.killed++;
        p.cash += 60;
        game.pickups.push({ x: en.x, y: en.y, kind: 'cash', amount: 60, life: 20 });
        continue;
      }
      var d = U.dist(en.x, en.y, p.x, p.y);
      var want = U.angleTo(en.x, en.y, p.x, p.y);
      if (d < 460) {
        en.state = 'attack';
        en.angle = U.turnToward(en.angle, want, 4 * dt);
        if (d > 200) {
          en.x += Math.cos(en.angle) * en.speed * dt;
          en.y += Math.sin(en.angle) * en.speed * dt;
        }
        en.shootCd -= dt;
        if (d < 380 && en.shootCd <= 0) {
          en.shootCd = en.kind === 'heavy' ? 0.9 : 1.3;
          fireBullet(game, en.x, en.y, want + U.range(Math.random, -0.12, 0.12), 'enemy');
        }
      } else {
        en.state = 'guard';
        en.retarget -= dt;
        if (en.retarget <= 0) {
          en.angle = U.range(Math.random, 0, Math.PI * 2);
          en.retarget = U.range(Math.random, 2, 5);
        }
      }
      if (global.HH.city.hitBuilding(game.city, en.x, en.y, 10)) {
        en.x -= Math.cos(en.angle) * en.speed * dt;
        en.y -= Math.sin(en.angle) * en.speed * dt;
      }
    }
  }

  global.HH = global.HH || {};
  global.HH.combat = {
    makeEnemy: makeEnemy, fireBullet: fireBullet, playerShoot: playerShoot,
    updateBullets: updateBullets, updateEnemies: updateEnemies
  };
})(typeof window !== 'undefined' ? window : globalThis);
