// save.js — localStorage saves for Harbor Heat.
(function (global) {
  'use strict';

  var KEY = 'harbor-heat-save-v1';

  function save(game) {
    try {
      var p = game.player;
      var data = {
        cash: p.cash, health: p.health,
        x: p.x, y: p.y, angle: p.angle,
        storyIdx: game.missions.storyIdx, done: game.missions.done,
        minutes: game.minutes, day: game.day
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function applySave(game, data) {
    if (!data) return;
    var p = game.player;
    p.cash = data.cash || 150;
    p.health = data.health || 100;
    p.x = data.x || game.city.spots.home.x;
    p.y = data.y || game.city.spots.home.y;
    p.angle = data.angle || 0;
    game.missions.storyIdx = data.storyIdx || 0;
    game.missions.done = data.done || [];
    game.minutes = data.minutes || 480;
    game.day = data.day || 1;
  }

  global.HH = global.HH || {};
  global.HH.save = { save: save, load: load, clear: clear, applySave: applySave, KEY: KEY };
})(typeof window !== 'undefined' ? window : globalThis);
