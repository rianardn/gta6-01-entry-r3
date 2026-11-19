// util.js — small math + deterministic RNG helpers for Harbor Heat.
(function (global) {
  'use strict';

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist2(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }
  function dist(ax, ay, bx, by) { return Math.sqrt(dist2(ax, ay, bx, by)); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

  // Wrap an angle to [-PI, PI].
  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  // Shortest signed turn from angle a toward angle b.
  function turnToward(a, b, maxStep) {
    var d = wrapAngle(b - a);
    if (d > maxStep) return a + maxStep;
    if (d < -maxStep) return a - maxStep;
    return b;
  }

  // Mulberry32 — tiny seeded PRNG so the city is identical every run.
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function range(rng, lo, hi) { return lo + rng() * (hi - lo); }
  function intRange(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

  // AABB overlap test.
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Point-in-rotated-rect test (for car collision): rotate point into rect space.
  function pointInCar(px, py, car) {
    var dx = px - car.x, dy = py - car.y;
    var c = Math.cos(-car.angle), s = Math.sin(-car.angle);
    var lx = dx * c - dy * s, ly = dx * s + dy * c;
    return Math.abs(lx) < car.halfLen + 2 && Math.abs(ly) < car.halfWid + 2;
  }

  // Format dollars with commas.
  function money(n) {
    return '$' + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Format a game clock (minutes since midnight) as HH:MM.
  function clockString(minutes) {
    var h = Math.floor(minutes / 60) % 24;
    var m = Math.floor(minutes % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  global.HH = global.HH || {};
  global.HH.util = {
    clamp: clamp, lerp: lerp, dist: dist, dist2: dist2, angleTo: angleTo,
    wrapAngle: wrapAngle, turnToward: turnToward, makeRng: makeRng,
    pick: pick, range: range, intRange: intRange, rectsOverlap: rectsOverlap,
    pointInCar: pointInCar, money: money, clockString: clockString
  };
})(typeof window !== 'undefined' ? window : globalThis);
