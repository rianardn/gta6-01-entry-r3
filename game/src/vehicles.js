// vehicles.js — car models, arcade driving physics, traffic AI for Harbor Heat.
(function (global) {
  'use strict';
  var U = global.HH.util;

  var MODELS = [
    { name: 'Verde Compact',  color: '#d8a13c', top: 300, accel: 240, grip: 3.2, len: 46, wid: 22 },
    { name: 'Marina Sedan',   color: '#3c7dd8', top: 330, accel: 260, grip: 3.0, len: 50, wid: 22 },
    { name: 'Dockside Pickup',color: '#8c4a2e', top: 290, accel: 230, grip: 3.4, len: 54, wid: 24 },
    { name: 'Hilltop Coupe',  color: '#c23c5e', top: 380, accel: 300, grip: 2.8, len: 48, wid: 22 },
    { name: 'City Taxi',      color: '#e8c832', top: 320, accel: 250, grip: 3.1, len: 50, wid: 22, taxi: true },
    { name: 'Harbor Van',     color: '#5a6b7a', top: 260, accel: 200, grip: 3.6, len: 58, wid: 26 },
    { name: 'Interceptor',    color: '#20242e', top: 420, accel: 340, grip: 2.6, len: 52, wid: 23, police: true },
    { name: 'Verde Cruiser',  color: '#1c3a6e', top: 400, accel: 320, grip: 2.7, len: 52, wid: 23, police: true }
  ];

  function makeCar(modelIdx, x, y, angle) {
    var m = MODELS[modelIdx % MODELS.length];
    return {
      model: m, x: x, y: y, angle: angle || 0,
      speed: 0, steer: 0, driver: null, // driver: 'player' | 'traffic' | 'police' | null (parked)
      health: 100, brakeLight: false, siren: false, sirenPhase: 0,
      halfLen: m.len / 2, halfWid: m.wid / 2,
      targetSpeed: 0, route: null, routeIdx: 0, stuck: 0, honk: 0
    };
  }

  // Arcade car update. throttle -1..1, steer -1..1, dt seconds.
  function driveCar(car, throttle, steer, dt, handbrake) {
    var m = car.model;
    var target = throttle * m.top;
    var rate = throttle !== 0 ? m.accel : 180;
    if (handbrake) { rate = 520; target = 0; }
    if (car.speed < target) car.speed = Math.min(target, car.speed + rate * dt);
    else if (car.speed > target) car.speed = Math.max(target, car.speed - rate * dt * 1.4);
    var spd = Math.abs(car.speed);
    var steerAuthority = clamp01(spd / 60) * (car.speed < 0 ? -1 : 1);
    car.angle += steer * m.grip * steerAuthority * dt * (spd / m.top + 0.25);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.brakeLight = throttle < 0 || handbrake;
    if (car.siren) car.sirenPhase += dt * 6;
  }

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  // Keep a car out of buildings and inside the world: slide along the hit.
  function collideWorld(city, car) {
    var hit = global.HH.city.hitBuilding(city, car.x, car.y, car.halfLen * 0.7);
    if (hit) {
      // Push out along the smallest penetration axis.
      var hx = hit.x !== undefined ? hit.x : hit.x - hit.w / 2;
      var hy = hit.y !== undefined ? hit.y : hit.y - hit.h / 2;
      var hw = hit.w, hh = hit.h;
      var cx = hx + hw / 2, cy = hy + hh / 2;
      var dx = car.x - cx, dy = car.y - cy;
      var px = hw / 2 + car.halfLen * 0.7 - Math.abs(dx);
      var py = hh / 2 + car.halfLen * 0.7 - Math.abs(dy);
      if (px < py) car.x += dx > 0 ? px : -px;
      else car.y += dy > 0 ? py : -py;
      if (Math.abs(car.speed) > 120) global.HH.audio.sfx.crash();
      car.speed *= 0.35;
      return true;
    }
    if (!global.HH.city.inBounds(city, car.x, car.y, 30)) {
      car.x = U.clamp(car.x, 30, city.size - 30);
      car.y = U.clamp(car.y, 30, city.size - 30);
      car.speed *= 0.4;
      return true;
    }
    return false;
  }

  // --- Traffic AI: cars cruise the road grid, stopping for each other. ---
  function spawnTraffic(city, rng, count, avoid) {
    var cars = [];
    var lines = city.roadCenters();
    var tries = 0;
    while (cars.length < count && tries < count * 40) {
      tries++;
      var horizontal = rng() < 0.5;
      var line = lines[1 + Math.floor(rng() * (lines.length - 2))];
      var along = U.range(rng, 100, city.size - 100);
      var x = horizontal ? along : line + (rng() < 0.5 ? 13 : -13);
      var y = horizontal ? line + (rng() < 0.5 ? 13 : -13) : along;
      var angle = horizontal ? (x % 2 < 1 ? 0 : Math.PI) : (y % 2 < 1 ? Math.PI / 2 : -Math.PI / 2);
      if (rng() < 0.5) angle += Math.PI;
      if (avoid && U.dist(x, y, avoid.x, avoid.y) < 500) continue;
      var car = makeCar(U.intRange(rng, 0, 5), x, y, angle);
      car.driver = 'traffic';
      car.targetSpeed = U.range(rng, 90, 150);
      cars.push(car);
    }
    return cars;
  }

  function updateTraffic(city, cars, dt, others) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      // Look ahead for a car in front; slow down instead of ramming.
      var ahead = 0;
      var ax = c.x + Math.cos(c.angle) * 70, ay = c.y + Math.sin(c.angle) * 70;
      for (var j = 0; j < others.length; j++) {
        var o = others[j];
        if (o === c) continue;
        if (U.dist(ax, ay, o.x, o.y) < 46) { ahead = 1; break; }
      }
      var throttle = ahead ? 0 : 1;
      // Steer back onto the nearest road line if pushed off.
      var onH = Math.abs(c.y - city.nearestRoadCoord(c.y)) < 26;
      var onV = Math.abs(c.x - city.nearestRoadCoord(c.x)) < 26;
      var steer = 0;
      if (!onH && !onV) {
        var want = U.angleTo(c.x, c.y, c.x + Math.cos(c.angle) * 100, city.nearestRoadCoord(c.y));
        steer = U.clamp(U.wrapAngle(want - c.angle) * 2, -1, 1);
      }
      c.speed = Math.min(c.speed, c.targetSpeed);
      driveCar(c, throttle, steer, dt, false);
      collideWorld(city, c);
    }
  }

  global.HH = global.HH || {};
  global.HH.vehicles = {
    MODELS: MODELS, makeCar: makeCar, driveCar: driveCar,
    collideWorld: collideWorld, spawnTraffic: spawnTraffic, updateTraffic: updateTraffic
  };
})(typeof window !== 'undefined' ? window : globalThis);
