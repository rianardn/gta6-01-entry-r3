// main.js — Harbor Heat bootstrap, game loop, camera, spawning, demo scenes.
(function (global) {
  'use strict';
  var U = global.HH.util;

  var canvas, ctx;
  var game = null;
  var lastT = 0;
  var ZOOM = 1.6; // camera zoom: the world reads bigger on screen
  var cam = { x: 0, y: 0, w: 800, h: 500 };
  var paused = false;
  var started = false;
  var saveTimer = 0;
  var sirenTimer = 0;

  function newGame(demo) {
    var city = global.HH.city.buildCity(1337);
    var home = city.spots.home;
    var g = {
      city: city,
      player: global.HH.player.makePlayer(home.x, home.y),
      wanted: global.HH.cops.makeWanted(),
      missions: global.HH.missions.makeMissions(),
      cars: [], copCars: [], footCops: [],
      peds: [], enemies: [], bullets: [], sparks: [], pickups: [],
      time: 0, minutes: 480, day: 1, dayLabel: 'DAY 1',
      hour: 8, state: 'menu', demo: demo || null,
      toast: null, won: false, over: false
    };
    var rng = U.makeRng(4242);
    // Parked cars around the city.
    var lines = city.roadCenters();
    for (var i = 0; i < 14; i++) {
      var line = lines[1 + Math.floor(rng() * (lines.length - 2))];
      var along = U.range(rng, 120, city.size - 120);
      var horiz = rng() < 0.5;
      var car = global.HH.vehicles.makeCar(
        U.intRange(rng, 0, 5),
        horiz ? along : line + 32, horiz ? line + 32 : along,
        horiz ? 0 : Math.PI / 2
      );
      car.driver = null;
      g.cars.push(car);
    }
    // A starter car near home so the player can drive right away.
    var starter = global.HH.vehicles.makeCar(1, home.x + 40, home.y + 30, 0);
    starter.driver = null;
    g.cars.push(starter);
    g.cars = g.cars.concat(global.HH.vehicles.spawnTraffic(city, rng, 10, g.player));
    g.peds = global.HH.people.spawnPeds(city, rng, 46, g.player);
    // Health pickups scattered around.
    for (var h = 0; h < 4; h++) {
      g.pickups.push({
        x: U.range(rng, 100, city.size - 100), y: U.range(rng, 100, city.size - 100),
        kind: 'health', amount: 35, life: 999
      });
    }
    return g;
  }

  function applyDemo(g, demo) {
    if (!demo) return;
    var city = g.city;
    if (demo === 'drive') {
      // Player in a coupe on the marina road at golden hour.
      var car = global.HH.vehicles.makeCar(3, city.spots.marina.x + 120, city.spots.marina.y, 0);
      car.driver = 'player';
      g.cars.push(car);
      g.player.car = car;
      g.player.onFoot = false;
      g.player.x = car.x; g.player.y = car.y;
      g.autopilot = true;
      g.minutes = 17 * 60 + 40; g.hour = 17.6;
    } else if (demo === 'chase') {
      // Three-star chase at night downtown. Cop cars spawn close so they are in frame.
      var car2 = global.HH.vehicles.makeCar(3, city.spots.hall.x, city.spots.hall.y + 60, Math.PI / 2);
      car2.driver = 'player';
      g.cars.push(car2);
      g.player.car = car2;
      g.player.onFoot = false;
      g.player.x = car2.x; g.player.y = car2.y;
      g.autopilot = true;
      global.HH.cops.addHeat(g.wanted, 3);
      for (var i = 0; i < 3; i++) {
        var cop = global.HH.cops.spawnCopCar(city, U.makeRng(100 + i), g.player.x, g.player.y, 0);
        // Pull the pursuit into the camera frame.
        var ang = (i / 3) * Math.PI * 2;
        cop.x = g.player.x + Math.cos(ang) * 260;
        cop.y = g.player.y + Math.sin(ang) * 260;
        cop.angle = U.angleTo(cop.x, cop.y, g.player.x, g.player.y);
        g.copCars.push(cop);
      }
      g.minutes = 21 * 60 + 20; g.hour = 21.3;
    } else if (demo === 'mission') {
      // On foot at the container yard, enemies ahead, midday.
      g.player.x = city.spots.docks.x - 160;
      g.player.y = city.spots.docks.y;
      for (var j = 0; j < 3; j++) {
        g.enemies.push(global.HH.combat.makeEnemy(
          city.spots.docks.x + 60 + j * 50, city.spots.docks.y - 40 + j * 40,
          j === 0 ? 'heavy' : 'thug'
        ));
      }
      global.HH.missions.startStory(g.missions, g);
      g.minutes = 12 * 60; g.hour = 12;
    } else if (demo === 'night') {
      // On foot in the marina at night, neon and lamps.
      g.player.x = city.spots.marina.x;
      g.player.y = city.spots.marina.y + 120;
      g.minutes = 22 * 60 + 30; g.hour = 22.5;
    }
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    cam.w = w / ZOOM; cam.h = h / ZOOM;
  }

  function update(dt) {
    var p = game.player;
    if (game.state !== 'play') return;
    game.time += dt;
    // Game clock: 1 real second = 1 game minute.
    game.minutes += dt;
    if (game.minutes >= 1440) { game.minutes -= 1440; game.day++; game.dayLabel = 'DAY ' + game.day; }
    game.hour = game.minutes / 60;

    // Missions.
    var input = global.HH.input;
    if (input.wasPressed('m') && !game.missions.active) {
      if (game.missions.storyIdx < game.missions.story.length) {
        global.HH.missions.startStory(game.missions, game);
        showToast(game.missions.active.name, game.missions.active.brief, 4200);
      } else {
        var job = U.pick(Math.random, global.HH.missions.JOBS);
        global.HH.missions.startJob(game.missions, game, job);
        showToast(job.name, job.text, 3200);
      }
    }
    if (input.wasPressed('m') && game.missions.active) {
      // M toggles the objective reminder.
      showToast(game.missions.active.name, global.HH.missions.stepText(game.missions), 2600);
    }
    global.HH.missions.update(game, game.missions, dt);

    // Player.
    global.HH.player.update(game, p, dt);
    global.HH.combat.playerShoot(game, p, dt);
    global.HH.combat.updateBullets(game, dt);
    global.HH.combat.updateEnemies(game, dt);

    // Traffic + pedestrians.
    global.HH.vehicles.updateTraffic(game.city, game.cars.filter(function (c) { return c.driver === 'traffic'; }), dt, game.cars.concat(game.copCars));
    var danger = p.onFoot ? null : { x: p.x, y: p.y };
    if (game.wanted.level > 0) danger = { x: p.x, y: p.y };
    global.HH.people.updatePeds(game.city, game.peds, dt, danger);

    // Wanted: maintain police presence for the level.
    var want = global.HH.cops.unitsForLevel(game.wanted.level);
    var rng = Math.random;
    while (game.copCars.length < want) {
      game.copCars.push(global.HH.cops.spawnCopCar(game.city, rng, p.x, p.y, p.angle));
    }
    while (game.copCars.length > want) game.copCars.pop();
    global.HH.cops.updateCopCars(game.city, game.copCars, p, dt);
    // Foot cops join at 2+ stars when the player is on foot.
    if (game.wanted.level >= 2 && p.onFoot && game.footCops.length < game.wanted.level - 1) {
      var a = U.range(Math.random, 0, Math.PI * 2);
      game.footCops.push(global.HH.cops.makeFootCop(
        U.clamp(p.x + Math.cos(a) * 320, 40, game.city.size - 40),
        U.clamp(p.y + Math.sin(a) * 320, 40, game.city.size - 40), a
      ));
    }
    if (game.wanted.level < 2) game.footCops.length = 0;
    global.HH.cops.updateFootCops(game.city, game.footCops, p, dt, game.bullets);
    var anyNear = game.copCars.some(function (c) { return U.dist(c.x, c.y, p.x, p.y) < 520; }) ||
      game.footCops.some(function (c) { return U.dist(c.x, c.y, p.x, p.y) < 320; });
    global.HH.cops.updateWanted(game.wanted, dt, anyNear, false);

    // Pickups.
    for (var i = game.pickups.length - 1; i >= 0; i--) {
      var pk = game.pickups[i];
      if (U.dist(p.x, p.y, pk.x, pk.y) < 34) {
        if (pk.kind === 'health') { p.health = Math.min(p.maxHealth, p.health + pk.amount); }
        else { p.cash += pk.amount; }
        global.HH.audio.sfx.pickup();
        game.pickups.splice(i, 1);
      }
    }
    // Sparks decay.
    for (var s = game.sparks.length - 1; s >= 0; s--) {
      game.sparks[s].life -= dt;
      if (game.sparks[s].life <= 0) game.sparks.splice(s, 1);
    }
    // Siren ambience.
    sirenTimer -= dt;
    if (game.copCars.length > 0 && sirenTimer <= 0) {
      sirenTimer = 1.6;
      global.HH.audio.sfx.siren();
    }
    // Busted: a cop car touching the player on foot at low speed, or foot cop adjacent.
    if (p.onFoot && game.wanted.level > 0 && !p.dead) {
      var caught = game.footCops.some(function (c) { return U.dist(c.x, c.y, p.x, p.y) < 26; });
      if (caught) {
        p.busted = true;
        game.state = 'over';
        global.HH.hud.gameOverScreen(game, 'BUSTED');
        global.HH.audio.sfx.fail();
      }
    }
    // Dead.
    if (p.dead && !game.over) {
      game.over = true;
      game.state = 'over';
      global.HH.hud.gameOverScreen(game, 'WASTED');
    }
    // Story complete.
    if (!game.won && game.missions.storyIdx >= game.missions.story.length && !game.missions.active) {
      game.won = true;
      global.HH.hud.winScreen(game);
      global.HH.audio.sfx.mission();
    }
    // Engine sound off when on foot.
    if (p.onFoot) global.HH.audio.engine(0, false);
    // Autosave every 20s.
    saveTimer += dt;
    if (saveTimer > 20) { saveTimer = 0; global.HH.save.save(game); }

    // Camera follows the player, clamped to the world.
    cam.x = U.clamp(p.x - cam.w / 2, 0, game.city.size - cam.w);
    cam.y = U.clamp(p.y - cam.h / 2, 0, game.city.size - cam.h);
    // Mouse world position for aiming (accounts for camera zoom).
    var m = global.HH.input.mouse;
    var scaleX = canvas.width / canvas.clientWidth, scaleY = canvas.height / canvas.clientHeight;
    m.wx = cam.x + (m.x * scaleX) / ZOOM;
    m.wy = cam.y + (m.y * scaleY) / ZOOM;

    global.HH.hud.update(game);
    global.HH.input.endFrame();
  }

  function showToast(title, sub, ms) {
    global.HH.hud.showToast(title, sub, ms);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-cam.x, -cam.y);
    global.HH.render.drawWorld(ctx, game, cam);
    ctx.restore();
  }

  function loop(t) {
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (started && !paused && game.state === 'play') update(dt);
    else if (started) global.HH.input.endFrame();
    render();
    requestAnimationFrame(loop);
  }

  function start(demo) {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    global.HH.input.bind(canvas);
    global.HH.hud.bind();
    resize();
    window.addEventListener('resize', resize);
    game = newGame(demo);
    // Restore a save unless a demo scene is requested.
    if (!demo) {
      var saved = global.HH.save.load();
      if (saved) global.HH.save.applySave(game, saved);
    }
    applyDemo(game, demo);
    cam.x = U.clamp(game.player.x - cam.w / 2, 0, game.city.size - cam.w);
    cam.y = U.clamp(game.player.y - cam.h / 2, 0, game.city.size - cam.h);
    game.state = 'play';
    started = true;
    global.HH.hud.hideMenu();
    global.HH.audio.resume();
    global.HH.audio.startMusic();
    // Demo mode: auto-start the first story job so the HUD shows a live objective.
    if (demo && !game.missions.active) {
      global.HH.missions.startStory(game.missions, game);
    }
    requestAnimationFrame(loop);
  }

  function bindMenu() {
    var btn = document.getElementById('playBtn');
    if (btn) btn.addEventListener('click', function () {
      global.HH.audio.resume();
      global.HH.audio.sfx.click();
      start(null);
    });
    window.addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'p' && started) {
        paused = !paused;
        showToast(paused ? 'PAUSED' : 'RESUMED', paused ? 'Press P to continue' : '', 1200);
      }
      if (k === 'r' && game && game.state === 'over') {
        window.location.reload();
      }
      if (k === 'm' && started) {
        // Mute toggle is on N to avoid clashing with missions.
      }
      if (k === 'n' && started) {
        var muted = global.HH.audio.toggleMute();
        showToast(muted ? 'SOUND OFF' : 'SOUND ON', '', 1000);
      }
    });
    window.HH_RESTART = function () {
      global.HH.save.clear();
      window.location.reload();
    };
  }

  // Screenshot helper: ?demo=drive|chase|mission|night starts straight into a scene.
  function boot() {
    var params = new URLSearchParams(window.location.search);
    var demo = params.get('demo');
    var autostart = params.get('autostart') === '1' || !!demo;
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    if (autostart) {
      start(demo);
    } else {
      bindMenu();
      game = newGame(null);
      cam.x = U.clamp(game.player.x - cam.w / 2, 0, game.city.size - cam.w);
      cam.y = U.clamp(game.player.y - cam.h / 2, 0, game.city.size - cam.h);
      render();
      requestAnimationFrame(function (t) {
        lastT = t;
        requestAnimationFrame(loop);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.HH = global.HH || {};
  global.HH.main = { newGame: newGame, applyDemo: applyDemo, start: start, game: function () { return game; } };
})(typeof window !== 'undefined' ? window : globalThis);
