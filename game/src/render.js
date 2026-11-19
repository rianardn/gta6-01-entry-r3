// render.js — every pixel of Port Verde: city, cars, people, light and shadow.
(function (global) {
  'use strict';
  var U = global.HH.util;

  // Day palette shifts with the hour (0..24): [sky, road, ground].
  function skyFor(hour) {
    if (hour < 5 || hour >= 20) return { sky: '#0d1330', road: '#23262e', ground: '#1c2030', light: 0.55 };
    if (hour < 7) return { sky: '#3a2a4a', road: '#2e2a33', ground: '#2a2438', light: 0.7 };
    if (hour < 9) return { sky: '#e8a56b', road: '#3d3a3f', ground: '#6b5a4a', light: 0.9 };
    if (hour < 17) return { sky: '#8ec8ee', road: '#3a3d44', ground: '#7a8a6a', light: 1.0 };
    if (hour < 19) return { sky: '#e88a5a', road: '#3a363e', ground: '#6a5a48', light: 0.92 };
    return { sky: '#4a3a6a', road: '#2a2830', ground: '#332c40', light: 0.7 };
  }

  function drawCity(ctx, game, cam, pal) {
    var city = game.city;
    var x0 = cam.x - 40, y0 = cam.y - 40, x1 = cam.x + cam.w + 40, y1 = cam.y + cam.h + 40;
    // Ground.
    ctx.fillStyle = pal.ground;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // District tint blocks.
    for (var d = 0; d < city.districts.length; d++) {
      var dd = city.districts[d];
      ctx.fillStyle = dd.ground;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(dd.x0 * city.tile, dd.y0 * city.tile, (dd.x1 - dd.x0) * city.tile, (dd.y1 - dd.y0) * city.tile);
    }
    ctx.globalAlpha = 1;
    // Water strip along the east edge (the bay).
    ctx.fillStyle = '#2a6a8c';
    ctx.fillRect(city.size - 6, 0, 60, city.size);
    ctx.fillStyle = '#3a86a8';
    ctx.fillRect(city.size - 6, 0, 10, city.size);
    // Roads.
    var lines = city.roadCenters();
    ctx.fillStyle = pal.road;
    for (var i = 0; i < lines.length; i++) {
      ctx.fillRect(0, lines[i] - 26, city.size, 52);
      ctx.fillRect(lines[i] - 26, 0, 52, city.size);
    }
    // Sidewalk rings.
    ctx.fillStyle = 'rgba(200,200,190,0.25)';
    for (var j = 0; j < lines.length; j++) {
      ctx.fillRect(0, lines[j] - 44, city.size, 18);
      ctx.fillRect(0, lines[j] + 26, city.size, 18);
      ctx.fillRect(lines[j] - 44, 0, 18, city.size);
      ctx.fillRect(lines[j] + 26, 0, 18, city.size);
    }
    // Lane dashes.
    ctx.strokeStyle = 'rgba(255,230,120,0.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    ctx.beginPath();
    for (var k = 0; k < lines.length; k++) {
      ctx.moveTo(0, lines[k]); ctx.lineTo(city.size, lines[k]);
      ctx.moveTo(lines[k], 0); ctx.lineTo(lines[k], city.size);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Crosswalks at intersections.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var a = 0; a < lines.length; a++) {
      for (var b = 0; b < lines.length; b++) {
        for (var s = -2; s <= 2; s++) {
          ctx.fillRect(lines[a] - 22 + s * 10, lines[b] - 26, 5, 12);
          ctx.fillRect(lines[a] - 22 + s * 10, lines[b] + 14, 5, 12);
        }
      }
    }
    // Trees.
    for (var t = 0; t < city.trees.length; t++) {
      var tr = city.trees[t];
      if (tr.x < x0 || tr.x > x1 || tr.y < y0 || tr.y > y1) continue;
      ctx.fillStyle = tr.palm ? '#2e8b57' : '#3a7a3a';
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a4632';
      ctx.beginPath(); ctx.arc(tr.x, tr.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Landmarks.
    for (var l = 0; l < city.landmarks.length; l++) {
      var lm = city.landmarks[l];
      ctx.fillStyle = lm.color;
      ctx.fillRect(lm.x - lm.w / 2, lm.y - lm.h / 2, lm.w, lm.h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(lm.name, lm.x, lm.y + 4);
    }
    // Buildings with fake height shading.
    for (var bi = 0; bi < city.buildings.length; bi++) {
      var b = city.buildings[bi];
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      var shade = b.height * 5;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + shade, b.y + shade, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Windows.
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      var cols = Math.max(1, Math.floor(b.w / 22)), rows = Math.max(1, Math.floor(b.h / 22));
      for (var wx = 0; wx < cols; wx++) {
        for (var wy = 0; wy < rows; wy++) {
          if ((wx * 7 + wy * 3 + bi) % 3 === 0) {
            ctx.fillRect(b.x + 8 + wx * 20, b.y + 8 + wy * 20, 9, 11);
          }
        }
      }
      ctx.fillStyle = b.accent;
      ctx.fillRect(b.x, b.y, b.w, 5);
    }
    // Street lamps (glow at night).
    var night = pal.light < 0.8;
    for (var li = 0; li < city.lamps.length; li++) {
      var lamp = city.lamps[li];
      if (lamp.x < x0 || lamp.x > x1 || lamp.y < y0 || lamp.y > y1) continue;
      if (night) {
        var g = ctx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 46);
        g.addColorStop(0, 'rgba(255,220,120,0.5)');
        g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 46, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#222';
      ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    }
  }

  function drawCar(ctx, car, isPlayer) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    var m = car.model;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-m.len / 2 + 3, -m.wid / 2 + 4, m.len, m.wid);
    // Body.
    ctx.fillStyle = car.health <= 0 ? '#333' : m.color;
    roundRect(ctx, -m.len / 2, -m.wid / 2, m.len, m.wid, 7);
    ctx.fill();
    // Cabin.
    ctx.fillStyle = 'rgba(20,28,40,0.9)';
    roundRect(ctx, -m.len / 2 + 12, -m.wid / 2 + 4, m.len * 0.45, m.wid - 8, 5);
    ctx.fill();
    // Headlights.
    ctx.fillStyle = '#fff8c8';
    ctx.fillRect(m.len / 2 - 3, -m.wid / 2 + 3, 3, 5);
    ctx.fillRect(m.len / 2 - 3, m.wid / 2 - 8, 3, 5);
    // Brake lights.
    if (car.brakeLight) {
      ctx.fillStyle = '#ff2a2a';
      ctx.fillRect(-m.len / 2, -m.wid / 2 + 3, 3, 5);
      ctx.fillRect(-m.len / 2, m.wid / 2 - 8, 3, 5);
    }
    // Taxi sign / police light bar.
    if (m.taxi) {
      ctx.fillStyle = '#111';
      ctx.fillRect(-6, -m.wid / 2 - 4, 12, 5);
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, -m.wid / 2 - 6);
    }
    if (m.police) {
      var phase = Math.floor(car.sirenPhase) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2a2a' : '#2a6aff';
      ctx.fillRect(-8, -m.wid / 2 - 3, 7, 5);
      ctx.fillStyle = phase ? '#2a6aff' : '#ff2a2a';
      ctx.fillRect(1, -m.wid / 2 - 3, 7, 5);
    }
    // Smoke when wrecked.
    if (car.health <= 0) {
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath(); ctx.arc(-m.len / 4, 0, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (isPlayer) {
      ctx.strokeStyle = 'rgba(255,210,62,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(car.x, car.y, m.len * 0.75, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPerson(ctx, x, y, angle, shirt, pants, skin, walkPhase, panic) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    var bob = walkPhase ? Math.sin(walkPhase) * 2 : 0;
    // Legs.
    ctx.fillStyle = pants;
    ctx.fillRect(-4, -6 + bob, 8, 5);
    ctx.fillRect(-4, 1 - bob, 8, 5);
    // Body.
    ctx.fillStyle = shirt;
    ctx.fillRect(-7, -8, 14, 16);
    // Head.
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    // Panic mark.
    if (panic > 0) {
      ctx.fillStyle = '#ff2a2a';
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
      ctx.fillText('!', 0, -16);
    }
    ctx.restore();
  }

  function drawPlayer(ctx, p) {
    if (p.onFoot) {
      // Dana: teal jacket, dark jeans, aiming reticle line.
      drawPerson(ctx, p.x, p.y, p.angle, '#1f8a8a', '#232a38', '#f0c8a0', p.walkPhase, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.aimAngle) * 18, p.y + Math.sin(p.aimAngle) * 18);
      ctx.lineTo(p.x + Math.cos(p.aimAngle) * 44, p.y + Math.sin(p.aimAngle) * 44);
      ctx.stroke();
      // Gun.
      ctx.fillStyle = '#222';
      ctx.save();
      ctx.translate(p.x + Math.cos(p.aimAngle) * 14, p.y + Math.sin(p.aimAngle) * 14);
      ctx.rotate(p.aimAngle);
      ctx.fillRect(0, -2, 12, 4);
      ctx.restore();
    }
  }

  function drawWorld(ctx, game, cam) {
    var pal = skyFor(game.hour);
    ctx.fillStyle = pal.sky;
    ctx.fillRect(cam.x - 60, cam.y - 60, cam.w + 120, cam.h + 120);
    drawCity(ctx, game, cam, pal);
    // Mission marker.
    var step = global.HH.missions.currentStep(game.missions);
    if (step && (step.type === 'goto')) {
      var tx = step.x !== undefined ? step.x : game.city.spots[step.spot].x;
      var ty = step.y !== undefined ? step.y : game.city.spots[step.spot].y;
      var pulse = 1 + Math.sin(game.time * 4) * 0.15;
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tx, ty, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 34); ctx.lineTo(tx - 9, ty - 14); ctx.lineTo(tx + 9, ty - 14);
      ctx.closePath(); ctx.fill();
    }
    // Pickups.
    for (var pi = 0; pi < game.pickups.length; pi++) {
      var pk = game.pickups[pi];
      var bob = Math.sin(game.time * 5 + pi) * 3;
      ctx.fillStyle = pk.kind === 'health' ? '#37d67a' : '#ffd23e';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10131f';
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillText(pk.kind === 'health' ? '+' : '$', pk.x, pk.y + bob + 4);
    }
    // Pedestrians.
    for (var p = 0; p < game.peds.length; p++) {
      var ped = game.peds[p];
      drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.pants, ped.skin, ped.walking ? game.time * 8 : 0, ped.panic);
    }
    // Cars (parked + traffic + police).
    for (var c = 0; c < game.cars.length; c++) drawCar(ctx, game.cars[c], game.player.car === game.cars[c]);
    for (var cc = 0; cc < game.copCars.length; cc++) drawCar(ctx, game.copCars[cc], false);
    // Enemies.
    for (var e = 0; e < game.enemies.length; e++) {
      var en = game.enemies[e];
      drawPerson(ctx, en.x, en.y, en.angle, en.kind === 'heavy' ? '#5a1a1a' : '#3a1a2a', '#1a1a1a', '#d8a878', game.time * 8, 0);
      // Health bar.
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(en.x - 14, en.y - 26, 28, 5);
      ctx.fillStyle = '#ff4a4a';
      ctx.fillRect(en.x - 14, en.y - 26, 28 * Math.max(0, en.health / (en.kind === 'heavy' ? 120 : 60)), 5);
    }
    // Foot cops.
    for (var f = 0; f < game.footCops.length; f++) {
      var cop = game.footCops[f];
      drawPerson(ctx, cop.x, cop.y, cop.angle, '#1c3a6e', '#16233a', '#f0c8a0', game.time * 9, 0);
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
      ctx.fillText('PD', cop.x, cop.y - 14);
    }
    // Bullets.
    ctx.fillStyle = '#ffe9a8';
    for (var b = 0; b < game.bullets.length; b++) {
      var bl = game.bullets[b];
      ctx.save();
      ctx.translate(bl.x, bl.y);
      ctx.rotate(bl.angle);
      ctx.fillRect(-7, -1.5, 14, 3);
      ctx.restore();
    }
    // Sparks.
    for (var s = 0; s < game.sparks.length; s++) {
      var sp = game.sparks[s];
      ctx.fillStyle = 'rgba(255,200,80,' + (sp.life / sp.max) + ')';
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 5 * (sp.life / sp.max) + 2, 0, Math.PI * 2); ctx.fill();
    }
    // Player.
    drawPlayer(ctx, game.player);
    // Night overlay.
    if (pal.light < 1) {
      ctx.fillStyle = 'rgba(8,10,30,' + (1 - pal.light) * 0.45 + ')';
      ctx.fillRect(cam.x - 60, cam.y - 60, cam.w + 120, cam.h + 120);
      // Headlight cone from the player's car.
      if (game.player.car) {
        var car = game.player.car;
        var grad = ctx.createRadialGradient(car.x, car.y, 10, car.x, car.y, 260);
        grad.addColorStop(0, 'rgba(255,240,180,0.25)');
        grad.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(car.x, car.y, 260, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Hurt vignette.
    if (game.player.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(255,30,30,' + game.player.hurtFlash * 0.5 + ')';
      ctx.fillRect(cam.x - 60, cam.y - 60, cam.w + 120, cam.h + 120);
    }
  }

  global.HH = global.HH || {};
  global.HH.render = { drawWorld: drawWorld, drawCar: drawCar, drawPerson: drawPerson, skyFor: skyFor };
})(typeof window !== 'undefined' ? window : globalThis);
