// hud.js — HUD panels, minimap, toasts and menu screens for Harbor Heat.
(function (global) {
  'use strict';
  var U = global.HH.util;

  var el = {};
  var mapCtx = null;
  var toastTimer = null;

  function bind() {
    el.cash = document.getElementById('cash');
    el.clock = document.getElementById('clock');
    el.stars = document.getElementById('stars');
    el.objective = document.getElementById('objective');
    el.healthFill = document.getElementById('healthFill');
    el.speed = document.getElementById('speed');
    el.toast = document.getElementById('toast');
    el.menu = document.getElementById('menu');
    var mapCanvas = document.getElementById('map');
    if (mapCanvas) mapCtx = mapCanvas.getContext('2d');
  }

  function showToast(title, sub, ms) {
    if (!el.toast) return;
    el.toast.innerHTML = title + (sub ? '<small>' + sub + '</small>' : '');
    el.toast.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.style.display = 'none'; }, ms || 2600);
  }

  function hideToast() { if (el.toast) el.toast.style.display = 'none'; }

  function update(game) {
    var p = game.player;
    if (el.cash) el.cash.innerHTML = U.money(p.cash) + '<small> &nbsp;PORT VERDE</small>';
    if (el.clock) el.clock.textContent = U.clockString(game.minutes) + '  ·  ' + game.dayLabel;
    if (el.stars) {
      var s = '';
      for (var i = 0; i < 5; i++) s += i < game.wanted.level ? '★' : '☆';
      el.stars.textContent = s;
      el.stars.style.opacity = game.wanted.level > 0 ? 1 : 0.35;
    }
    if (el.objective) {
      var m = game.missions;
      if (m.active) {
        el.objective.innerHTML = '<b>' + m.active.name + '</b> — ' + m.active.giver +
          '<br>' + global.HH.missions.stepText(m);
      } else if (m.storyIdx < m.story.length) {
        el.objective.innerHTML = 'Press <b>M</b> to start the next job:<br><b>' +
          m.story[m.storyIdx].name + '</b> — ' + m.story[m.storyIdx].giver;
      } else {
        el.objective.innerHTML = '<b>Story complete!</b><br>Port Verde is yours. Side jobs still pay — press <b>M</b>.';
      }
    }
    if (el.healthFill) {
      el.healthFill.style.width = Math.max(0, p.health) + '%';
      el.healthFill.style.background = p.health > 50
        ? 'linear-gradient(90deg,#37d67a,#7dff9a)'
        : 'linear-gradient(90deg,#d63737,#ff7a7a)';
    }
    if (el.speed) {
      if (p.car) {
        var kmh = Math.round(Math.abs(p.car.speed) * 0.36);
        el.speed.innerHTML = '<b>' + kmh + '</b> km/h<br>' + p.car.model.name +
          (p.car.health < 100 ? '<br>condition ' + Math.max(0, Math.round(p.car.health)) + '%' : '');
      } else {
        el.speed.innerHTML = 'ON FOOT<br>press E near a car';
      }
    }
    drawMinimap(game);
  }

  function drawMinimap(game) {
    if (!mapCtx) return;
    var S = 168, scale = S / game.city.size;
    var ctx = mapCtx;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#141a28';
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    // Ground + roads.
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#4a5266';
    ctx.lineWidth = 2;
    var lines = game.city.roadCenters();
    for (var i = 0; i < lines.length; i++) {
      var v = lines[i] * scale;
      ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(S, v); ctx.stroke();
    }
    // Mission marker.
    var step = global.HH.missions.currentStep(game.missions);
    if (step && step.type === 'goto') {
      var tx = step.x !== undefined ? step.x : game.city.spots[step.spot].x;
      var ty = step.y !== undefined ? step.y : game.city.spots[step.spot].y;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(tx * scale, ty * scale, 5, 0, Math.PI * 2); ctx.fill();
    }
    // Cop cars (blue), player (white triangle).
    ctx.fillStyle = '#5a8aff';
    for (var c = 0; c < game.copCars.length; c++) {
      ctx.beginPath(); ctx.arc(game.copCars[c].x * scale, game.copCars[c].y * scale, 3, 0, Math.PI * 2); ctx.fill();
    }
    var p = game.player;
    ctx.save();
    ctx.translate(p.x * scale, p.y * scale);
    ctx.rotate(p.angle + Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Viewport box.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, S, S);
    ctx.restore();
  }

  function showMenu(html) {
    if (el.menu) {
      el.menu.style.display = 'flex';
      if (html) el.menu.innerHTML = html;
    }
  }

  function hideMenu() { if (el.menu) el.menu.style.display = 'none'; }

  function gameOverScreen(game, reason) {
    var m = game.missions;
    var done = m.done.length;
    showMenu(
      '<div class="card"><h1 style="color:#ff5a5a">' + reason + '</h1>' +
      '<h2>The Verde family is not pleased</h2>' +
      '<p>Cash banked: <b>' + U.money(game.player.cash) + '</b> &nbsp;·&nbsp; Jobs finished: <b>' + done + ' / ' + m.story.length + '</b></p>' +
      '<p>Press <b>R</b> to start over from your last save, or reload the page for a fresh run.</p>' +
      '<button id="playBtn" onclick="document.getElementById(\'menu\').style.display=\'none\';window.HH_RESTART&&window.HH_RESTART()">TRY AGAIN</button></div>'
    );
  }

  function winScreen(game) {
    showMenu(
      '<div class="card"><h1>STORY COMPLETE</h1>' +
      '<h2>Dana Reyes walks away clean</h2>' +
      '<p>All five Verde jobs are done. The sun is coming up over Port Verde, the cops have lost your trail, and the money is yours: <b>' + U.money(game.player.cash) + '</b>.</p>' +
      '<p>Side jobs are still open — close this screen and keep playing, or press <b>R</b> to run it all again.</p>' +
      '<button id="playBtn" onclick="document.getElementById(\'menu\').style.display=\'none\'">KEEP PLAYING</button></div>'
    );
  }

  global.HH = global.HH || {};
  global.HH.hud = {
    bind: bind, update: update, showToast: showToast, hideToast: hideToast,
    showMenu: showMenu, hideMenu: hideMenu,
    gameOverScreen: gameOverScreen, winScreen: winScreen
  };
})(typeof window !== 'undefined' ? window : globalThis);
