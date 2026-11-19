// people.js — pedestrians who stroll the sidewalks and flee from danger.
(function (global) {
  'use strict';
  var U = global.HH.util;

  var SHIRTS = ['#d84a4a', '#4a7dd8', '#4ad87a', '#d8c44a', '#9a4ad8', '#d88a4a', '#4ad8d2', '#e8e8e8'];
  var PANTS = ['#2e3440', '#4a3a2e', '#2e4a6b', '#5a2e4a'];

  function makePed(city, rng, x, y) {
    return {
      x: x, y: y, angle: U.range(rng, 0, Math.PI * 2),
      speed: U.range(rng, 26, 46),
      shirt: U.pick(rng, SHIRTS), pants: U.pick(rng, PANTS),
      skin: U.pick(rng, ['#f0c8a0', '#d8a878', '#a87850', '#8a5a38', '#f5d8b8']),
      panic: 0, targetX: x, targetY: y, retarget: 0, walking: rng() < 0.5
    };
  }

  function spawnPeds(city, rng, count, avoid) {
    var peds = [];
    var tries = 0;
    while (peds.length < count && tries < count * 30) {
      tries++;
      var x = U.range(rng, 60, city.size - 60);
      var y = U.range(rng, 60, city.size - 60);
      if (!city.onSidewalk(x, y) && !city.onRoad(x, y)) continue;
      if (avoid && U.dist(x, y, avoid.x, avoid.y) < 380) continue;
      peds.push(makePed(city, rng, x, y));
    }
    return peds;
  }

  function updatePeds(city, peds, dt, danger) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      p.retarget -= dt;
      var dangerNear = danger && U.dist(p.x, p.y, danger.x, danger.y) < 260;
      if (dangerNear) p.panic = 1.2;
      if (p.panic > 0) {
        p.panic -= dt;
        // Flee directly away from the danger.
        var a = U.angleTo(danger.x, danger.y, p.x, p.y);
        p.angle = U.turnToward(p.angle, a, 6 * dt);
        p.x += Math.cos(p.angle) * 130 * dt;
        p.y += Math.sin(p.angle) * 130 * dt;
      } else if (p.retarget <= 0) {
        // Pick a nearby sidewalk point to stroll toward.
        p.targetX = U.clamp(p.x + U.range(Math.random, -260, 260), 40, city.size - 40);
        p.targetY = U.clamp(p.y + U.range(Math.random, -260, 260), 40, city.size - 40);
        p.retarget = U.range(Math.random, 3, 8);
        p.walking = Math.random() < 0.7;
      } else if (p.walking) {
        var want = U.angleTo(p.x, p.y, p.targetX, p.targetY);
        p.angle = U.turnToward(p.angle, want, 3 * dt);
        var nx = p.x + Math.cos(p.angle) * p.speed * dt;
        var ny = p.y + Math.sin(p.angle) * p.speed * dt;
        if (!global.HH.city.hitBuilding(city, nx, ny, 10)) { p.x = nx; p.y = ny; }
        else p.retarget = 0;
      }
      p.x = U.clamp(p.x, 20, city.size - 20);
      p.y = U.clamp(p.y, 20, city.size - 20);
    }
  }

  global.HH = global.HH || {};
  global.HH.people = { makePed: makePed, spawnPeds: spawnPeds, updatePeds: updatePeds };
})(typeof window !== 'undefined' ? window : globalThis);
