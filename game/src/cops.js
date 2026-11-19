// cops.js — the wanted system and Port Verde PD pursuit AI.
(function (global) {
  'use strict';
  var U = global.HH.util;
  var V = global.HH.vehicles;

  var MAX_WANTED = 5;

  // Heat gained by each crime. Wanted decays when the player is unseen.
  var HEAT = { stealCar: 1, hitPed: 1, shoot: 1, speedNearCop: 0, killCop: 2, missionCrime: 1 };

  function makeWanted() {
    return { level: 0, heat: 0, seen: 0, hidden: 0, flash: 0 };
  }

  function addHeat(wanted, amount) {
    wanted.heat = U.clamp(wanted.heat + amount, 0, MAX_WANTED);
    var nl = Math.floor(wanted.heat);
    if (nl > wanted.level) {
      wanted.level = nl;
      wanted.flash = 1.5;
      global.HH.audio.sfx.wanted();
    }
  }

  // How many police units the current wanted level fields.
  function unitsForLevel(level) {
    if (level <= 0) return 0;
    if (level === 1) return 1;
    if (level === 2) return 2;
    if (level === 3) return 3;
    if (level === 4) return 4;
    return 6;
  }

  function spawnCopCar(city, rng, nearX, nearY, playerAngle) {
    // Spawn on a road behind / beside the player, out of direct sight.
    var lines = city.roadCenters();
    var line = lines[1 + Math.floor(rng() * (lines.length - 2))];
    var along = U.range(rng, 100, city.size - 100);
    var horizontal = rng() < 0.5;
    var x = horizontal ? along : line;
    var y = horizontal ? line : along;
    var d = U.dist(x, y, nearX, nearY);
    if (d < 420) { x = U.clamp(nearX + (rng() < 0.5 ? -560 : 560), 80, city.size - 80); y = nearY; }
    var car = V.makeCar(rng() < 0.5 ? 6 : 7, x, y, U.angleTo(x, y, nearX, nearY));
    car.driver = 'police';
    car.siren = true;
    car.targetSpeed = 360;
    return car;
  }

  function makeFootCop(x, y, angle) {
    return {
      x: x, y: y, angle: angle || 0, speed: 150,
      health: 60, state: 'chase', shootCd: 0, stuck: 0
    };
  }

  // Police car pursuit: steer toward the player, ram to stop them.
  function updateCopCars(city, cops, player, dt) {
    for (var i = 0; i < cops.length; i++) {
      var c = cops[i];
      var want = U.angleTo(c.x, c.y, player.x, player.y);
      var steer = U.clamp(U.wrapAngle(want - c.angle) * 1.6, -1, 1);
      var d = U.dist(c.x, c.y, player.x, player.y);
      var throttle = d > 60 ? 1 : 0.4;
      V.driveCar(c, throttle, steer, dt, false);
      V.collideWorld(city, c);
      // Ramming the player's car damages it; ramming the player on foot hurts.
      if (player.car && d < 52 && Math.abs(c.speed) > 60) {
        player.car.health -= 14 * dt;
        if (Math.random() < dt * 2) global.HH.audio.sfx.crash();
      }
    }
  }

  // Foot cops run at the player and shoot when close.
  function updateFootCops(city, cops, player, dt, bullets) {
    for (var i = cops.length - 1; i >= 0; i--) {
      var c = cops[i];
      if (c.health <= 0) { cops.splice(i, 1); continue; }
      var d = U.dist(c.x, c.y, player.x, player.y);
      var want = U.angleTo(c.x, c.y, player.x, player.y);
      c.angle = U.turnToward(c.angle, want, 5 * dt);
      if (d > 240) {
        c.x += Math.cos(c.angle) * c.speed * dt;
        c.y += Math.sin(c.angle) * c.speed * dt;
      } else if (d > 90) {
        c.x += Math.cos(c.angle) * c.speed * 0.6 * dt;
        c.y += Math.sin(c.angle) * c.speed * 0.6 * dt;
      }
      c.shootCd -= dt;
      if (d < 320 && c.shootCd <= 0) {
        c.shootCd = 1.15;
        bullets.push({
          x: c.x, y: c.y, angle: want + U.range(Math.random, -0.09, 0.09),
          speed: 720, life: 0.9, from: 'cop', damage: 9
        });
        global.HH.audio.sfx.shoot();
      }
      if (global.HH.city.hitBuilding(city, c.x, c.y, 10)) {
        c.x -= Math.cos(c.angle) * c.speed * dt;
        c.y -= Math.sin(c.angle) * c.speed * dt;
      }
    }
  }

  // Decay: if no cop can see the player for a while, heat falls.
  function updateWanted(wanted, dt, anyCopNear, playerHidden) {
    wanted.flash = Math.max(0, wanted.flash - dt);
    if (wanted.level <= 0) return;
    if (anyCopNear) {
      wanted.seen += dt;
      wanted.hidden = 0;
    } else {
      wanted.hidden += dt;
      wanted.seen = 0;
    }
    if (wanted.hidden > 6) {
      wanted.heat = Math.max(0, wanted.heat - dt * 0.35);
      var nl = Math.floor(wanted.heat);
      if (nl < wanted.level) wanted.level = nl;
    }
  }

  global.HH = global.HH || {};
  global.HH.cops = {
    MAX_WANTED: MAX_WANTED, HEAT: HEAT, makeWanted: makeWanted,
    addHeat: addHeat, unitsForLevel: unitsForLevel,
    spawnCopCar: spawnCopCar, makeFootCop: makeFootCop,
    updateCopCars: updateCopCars, updateFootCops: updateFootCops,
    updateWanted: updateWanted
  };
})(typeof window !== 'undefined' ? window : globalThis);
