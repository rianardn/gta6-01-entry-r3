// missions.js — five story jobs for the Verde family plus side work.
(function (global) {
  'use strict';
  var U = global.HH.util;

  var STORY = [
    {
      id: 'm1', name: 'First Pickup',
      brief: 'Rico needs a package from the Ferry Terminal. Drive there, grab it, bring it back to the garage. Keep it clean.',
      giver: 'Rico',
      steps: [
        { type: 'goto', spot: 'marina', text: 'Drive to the Ferry Terminal' },
        { type: 'wait', seconds: 2, text: 'Pick up the package' },
        { type: 'goto', spot: 'garage', text: 'Bring it back to Rico\u2019s Garage' }
      ],
      reward: 400
    },
    {
      id: 'm2', name: 'The Loud Way In',
      brief: 'The Dockside crew is holding Rico\u2019s cousin. Clear the yard and get him out. Expect guns.',
      giver: 'Rico',
      steps: [
        { type: 'goto', spot: 'docks', text: 'Reach the Container Yard' },
        { type: 'clear', count: 4, text: 'Clear out the Dockside crew (0/4)' },
        { type: 'goto', spot: 'garage', text: 'Get back to the garage' }
      ],
      reward: 800,
      spawnEnemies: 4
    },
    {
      id: 'm3', name: 'Hilltop Pickup',
      brief: 'A client on the hill wants a fast car, no questions. Steal the coupe parked at the Hilltop Mansion and deliver it to the Marina. Cops will notice.',
      giver: 'Vera',
      steps: [
        { type: 'goto', spot: 'hills', text: 'Reach the Hilltop Mansion' },
        { type: 'steal', model: 3, text: 'Steal the coupe' },
        { type: 'goto', spot: 'marina', text: 'Deliver it to the Ferry Terminal' }
      ],
      reward: 1200,
      spawnCar: { model: 3, spot: 'hills' }
    },
    {
      id: 'm4', name: 'Stadium Drop',
      brief: 'Vera\u2019s crew left a duffel at the stadium. The PD has the place watched — grab it fast and lose the tail before you come home.',
      giver: 'Vera',
      steps: [
        { type: 'goto', spot: 'stadium', text: 'Reach Verde Stadium' },
        { type: 'wait', seconds: 3, text: 'Grab the duffel' },
        { type: 'lose', text: 'Lose the cops (drop to 0 stars)' },
        { type: 'goto', spot: 'garage', text: 'Return to Rico\u2019s Garage' }
      ],
      reward: 1500,
      wantedOnPickup: 2
    },
    {
      id: 'm5', name: 'Sunrise Run',
      brief: 'One last run: the beachfront pier, then the marina, then home before sunrise. The whole PD is awake tonight. Finish this and you\u2019re out.',
      giver: 'Rico',
      steps: [
        { type: 'goto', spot: 'beach', text: 'Reach the Beachfront Pier' },
        { type: 'goto', spot: 'marina', text: 'Then the Ferry Terminal' },
        { type: 'clear', count: 3, text: 'Deal with the ambush (0/3)' },
        { type: 'goto', spot: 'home', text: 'Get home to Dana\u2019s Apartment' }
      ],
      reward: 2500,
      spawnEnemies: 3
    }
  ];

  var JOBS = [
    { id: 'j1', name: 'Courier Run', text: 'Deliver a package across town', reward: 150, kind: 'goto' },
    { id: 'j2', name: 'Taxi Fare', text: 'Pick up a fare and drop them off', reward: 120, kind: 'taxi' },
    { id: 'j3', name: 'Vigilante', text: 'Take down 3 street thugs', reward: 300, kind: 'clear' }
  ];

  function makeMissions() {
    return {
      story: STORY, jobs: JOBS,
      storyIdx: 0, active: null, stepIdx: 0, stepT: 0,
      killed: 0, jobCooldown: 0, done: [], startedAt: 0
    };
  }

  function currentStep(m) {
    if (!m.active) return null;
    return m.active.steps[m.stepIdx] || null;
  }

  function startStory(m, game) {
    if (m.storyIdx >= STORY.length) return false;
    m.active = STORY[m.storyIdx];
    m.stepIdx = 0; m.stepT = 0; m.killed = 0;
    m.startedAt = game.time;
    setupStep(game, m);
    global.HH.audio.sfx.mission();
    return true;
  }

  function startJob(m, game, job) {
    var spots = game.city.spots;
    var keys = Object.keys(spots);
    var a = spots[U.pick(Math.random, keys)];
    var b = spots[U.pick(Math.random, keys)];
    var steps;
    if (job.kind === 'goto') steps = [{ type: 'goto', x: a.x, y: a.y, label: a.label, text: 'Deliver to ' + a.label }];
    else if (job.kind === 'taxi') steps = [
      { type: 'goto', x: a.x, y: a.y, label: a.label, text: 'Pick up the fare at ' + a.label },
      { type: 'goto', x: b.x, y: b.y, label: b.label, text: 'Drop them at ' + b.label }
    ];
    else steps = [{ type: 'clear', count: 3, text: 'Take down the thugs (0/3)' }];
    m.active = { id: job.id, name: job.name, brief: job.text, giver: 'Side job', steps: steps, reward: job.reward, job: true };
    m.stepIdx = 0; m.stepT = 0; m.killed = 0;
    setupStep(game, m);
    global.HH.audio.sfx.mission();
    return true;
  }

  function setupStep(game, m) {
    var s = currentStep(m);
    if (!s) return;
    if (s.type === 'clear' && !s.spawned) {
      s.spawned = true;
      var n = s.count || 3;
      var px = game.player.x, py = game.player.y;
      for (var i = 0; i < n; i++) {
        var a = U.range(Math.random, 0, Math.PI * 2);
        var d = U.range(Math.random, 180, 320);
        game.enemies.push(global.HH.combat.makeEnemy(
          U.clamp(px + Math.cos(a) * d, 40, game.city.size - 40),
          U.clamp(py + Math.sin(a) * d, 40, game.city.size - 40),
          i === 0 ? 'heavy' : 'thug'
        ));
      }
    }
    if (s.type === 'steal' && m.active.spawnCar && !s.spawnedCar) {
      s.spawnedCar = true;
      var spot = game.city.spots[m.active.spawnCar.spot];
      var car = global.HH.vehicles.makeCar(m.active.spawnCar.model, spot.x + 60, spot.y, 0);
      car.driver = null;
      game.cars.push(car);
      s.carRef = car;
    }
  }

  function stepText(m) {
    var s = currentStep(m);
    if (!s) return '';
    if (s.type === 'clear') return s.text.replace(/\(\d+\/\d+\)/, '(' + m.killed + '/' + (s.count || 3) + ')');
    return s.text;
  }

  // Returns 'done' | 'failed' | null. Call every frame while a mission is active.
  function update(game, m, dt) {
    if (!m.active) return null;
    var s = currentStep(m);
    if (!s) {
      // All steps complete.
      var reward = m.active.reward;
      game.player.cash += reward;
      global.HH.audio.sfx.cash();
      game.toast(m.active.name + ' complete!', '+' + U.money(reward) + ' — ' + (m.active.job ? 'job done' : 'story ' + (m.storyIdx + 1) + ' of ' + STORY.length));
      m.done.push(m.active.id);
      if (!m.active.job) m.storyIdx++;
      m.active = null;
      return 'done';
    }
    var p = game.player;
    var dist = 0;
    if (s.type === 'goto') {
      var tx = s.x !== undefined ? s.x : game.city.spots[s.spot].x;
      var ty = s.y !== undefined ? s.y : game.city.spots[s.spot].y;
      dist = U.dist(p.x, p.y, tx, ty);
      if (dist < 70) {
        m.stepIdx++;
        m.stepT = 0;
        setupStep(game, m);
        global.HH.audio.sfx.pickup();
      }
    } else if (s.type === 'wait') {
      m.stepT += dt;
      if (m.stepT >= s.seconds) {
        // Grabbing the package draws police attention on the stadium job.
        if (m.active.wantedOnPickup) global.HH.cops.addHeat(game.wanted, m.active.wantedOnPickup);
        m.stepIdx++; m.stepT = 0; setupStep(game, m); global.HH.audio.sfx.pickup();
      }
    } else if (s.type === 'clear') {
      var need = s.count || 3;
      if (m.killed >= need) { m.stepIdx++; m.stepT = 0; setupStep(game, m); }
    } else if (s.type === 'steal') {
      if (p.car === s.carRef) { m.stepIdx++; m.stepT = 0; setupStep(game, m); global.HH.audio.sfx.pickup(); }
    } else if (s.type === 'lose') {
      if (game.wanted.level <= 0) { m.stepIdx++; m.stepT = 0; setupStep(game, m); }
    }
    return null;
  }

  function abandon(m) {
    m.active = null; m.stepIdx = 0; m.stepT = 0;
  }

  global.HH = global.HH || {};
  global.HH.missions = {
    STORY: STORY, JOBS: JOBS, makeMissions: makeMissions,
    startStory: startStory, startJob: startJob, update: update,
    currentStep: currentStep, stepText: stepText, abandon: abandon
  };
})(typeof window !== 'undefined' ? window : globalThis);
