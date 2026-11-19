// player.js — Dana Reyes on foot and behind the wheel.
(function (global) {
  'use strict';
  var U = global.HH.util;
  var V = global.HH.vehicles;

  function makePlayer(x, y) {
    return {
      x: x, y: y, angle: -Math.PI / 2, speed: 0,
      health: 100, maxHealth: 100, cash: 150,
      onFoot: true, car: null,
      sprint: false, aimAngle: -Math.PI / 2,
      shootCd: 0, hurtFlash: 0, busted: false, dead: false,
      walkPhase: 0, lastCrimeAt: 0
    };
  }

  function hurt(player, amount) {
    if (player.dead || player.busted) return;
    player.health -= amount;
    player.hurtFlash = 0.35;
    if (player.health <= 0) {
      player.health = 0;
      player.dead = true;
      global.HH.audio.sfx.fail();
    }
  }

  function updateOnFoot(game, p, dt) {
    var input = global.HH.input;
    var axes = input.moveAxes();
    var sprint = input.isDown('shift');
    var maxSpd = sprint ? 250 : 165;
    var tx = axes.x, ty = axes.y;
    var len = Math.sqrt(tx * tx + ty * ty);
    if (len > 0) { tx /= len; ty /= len; }
    p.x += tx * maxSpd * dt;
    p.y += ty * maxSpd * dt;
    p.speed = len > 0 ? maxSpd : 0;
    if (len > 0) {
      p.angle = Math.atan2(ty, tx);
      p.walkPhase += dt * 10;
    }
    // Aim at the mouse.
    var m = input.mouse;
    p.aimAngle = Math.atan2((m.wy - p.y), (m.wx - p.x));
    p.shootCd -= dt;
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);

    // Building collision: slide back out.
    var hit = global.HH.city.hitBuilding(game.city, p.x, p.y, 13);
    if (hit) {
      var hx = hit.x !== undefined ? hit.x : hit.x - hit.w / 2;
      var hy = hit.y !== undefined ? hit.y : hit.y - hit.h / 2;
      var cx = hx + hit.w / 2, cy = hy + hit.h / 2;
      var dx = p.x - cx, dy = p.y - cy;
      var px = hit.w / 2 + 13 - Math.abs(dx);
      var py = hit.h / 2 + 13 - Math.abs(dy);
      if (px < py) p.x += dx > 0 ? px : -px;
      else p.y += dy > 0 ? py : -py;
    }
    p.x = U.clamp(p.x, 16, game.city.size - 16);
    p.y = U.clamp(p.y, 16, game.city.size - 16);

    // Enter nearest car with E.
    if (input.wasPressed('e')) {
      var car = nearestCar(game, p.x, p.y, 64);
      if (car) enterCar(game, p, car);
    }
  }

  function nearestCar(game, x, y, maxD) {
    var best = null, bd = maxD;
    var all = game.cars.concat(game.copCars);
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (c.driver === 'player') continue;
      var d = U.dist(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function enterCar(game, p, car) {
    if (car.driver === 'traffic' || car.driver === 'police') {
      // Stealing a car is a crime — unless it is the player's own mission car.
      if (car.driver === 'police') global.HH.cops.addHeat(game.wanted, global.HH.cops.HEAT.stealCar + 1);
      else global.HH.cops.addHeat(game.wanted, global.HH.cops.HEAT.stealCar);
      global.HH.audio.sfx.door();
    }
    if (car.driver === 'traffic') {
      // The driver bails out as a pedestrian.
      game.peds.push(global.HH.people.makePed(game.city, Math.random, car.x + 30, car.y + 30));
    }
    car.driver = 'player';
    p.car = car;
    p.onFoot = false;
    car.speed = 0;
    global.HH.audio.sfx.door();
  }

  function exitCar(game, p) {
    var car = p.car;
    if (!car) return;
    car.driver = null;
    car.speed = 0;
    // Step out to the side of the car.
    var sx = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    var sy = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    if (!global.HH.city.hitBuilding(game.city, sx, sy, 13)) { p.x = sx; p.y = sy; }
    else { p.x = car.x - Math.cos(car.angle) * 40; p.y = car.y - Math.sin(car.angle) * 40; }
    p.car = null;
    p.onFoot = true;
    p.angle = car.angle;
    global.HH.audio.sfx.door();
  }

  function updateDriving(game, p, dt) {
    var input = global.HH.input;
    var car = p.car;
    if (!car) { p.onFoot = true; return; }
    var axes, handbrake;
    if (game.autopilot) {
      // Demo autopilot: cruise forward, steer back onto the road line.
      var want = car.angle;
      var onH = Math.abs(car.y - game.city.nearestRoadCoord(car.y)) < 26;
      var onV = Math.abs(car.x - game.city.nearestRoadCoord(car.x)) < 26;
      if (onH) want = Math.cos(car.angle) > 0 ? 0 : Math.PI;
      else if (onV) want = Math.sin(car.angle) > 0 ? Math.PI / 2 : -Math.PI / 2;
      else want = U.angleTo(car.x, car.y, car.x + Math.cos(car.angle) * 100, game.city.nearestRoadCoord(car.y));
      axes = { x: U.clamp(U.wrapAngle(want - car.angle) * 2, -1, 1), y: -1 };
      handbrake = false;
    } else {
      axes = input.moveAxes();
      handbrake = input.isDown(' ');
    }
    var throttle = -axes.y; // W = forward
    var steer = axes.x;
    V.driveCar(car, throttle, steer, dt, handbrake);
    var wasHit = V.collideWorld(game.city, car);
    if (wasHit && Math.abs(car.speed) > 200) {
      hurt(p, 4);
    }
    p.x = car.x; p.y = car.y;
    p.angle = car.angle;
    p.aimAngle = car.angle;
    p.speed = Math.abs(car.speed);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.shootCd -= dt;
    global.HH.audio.engine(Math.abs(car.speed) / car.model.top, true);
    if (input.wasPressed('e')) exitCar(game, p);
    // Speeding past a cop car at high speed draws a little heat.
    if (Math.abs(car.speed) > 330) {
      for (var i = 0; i < game.copCars.length; i++) {
        if (U.dist(car.x, car.y, game.copCars[i].x, game.copCars[i].y) < 200) {
          global.HH.cops.addHeat(game.wanted, 0.15 * dt);
          break;
        }
      }
    }
  }

  function update(game, p, dt) {
    if (p.dead || p.busted) return;
    if (p.onFoot) updateOnFoot(game, p, dt);
    else updateDriving(game, p, dt);
  }

  global.HH = global.HH || {};
  global.HH.player = {
    makePlayer: makePlayer, hurt: hurt, update: update,
    enterCar: enterCar, exitCar: exitCar, nearestCar: nearestCar
  };
})(typeof window !== 'undefined' ? window : globalThis);
