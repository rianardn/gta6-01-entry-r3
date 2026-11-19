// audio.js — WebAudio synth: every sound in Harbor Heat is generated, no files.
(function (global) {
  'use strict';

  var ctx = null;
  var master = null;
  var muted = false;
  var engineOsc = null, engineGain = null, engineFilter = null;
  var musicTimer = null;
  var musicStep = 0;

  // Chill synthwave bassline loop (A minor): [midi note, beats].
  var BASSLINE = [
    [45, 1], [45, 1], [48, 1], [43, 1],
    [45, 1], [45, 1], [52, 1], [50, 1],
    [45, 1], [45, 1], [48, 1], [43, 1],
    [40, 1], [40, 1], [43, 1], [47, 1]
  ];

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { return false; }
    return true;
  }

  function resume() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }

  function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    var t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  var sfx = {
    shoot: function () { noise(0.12, 0.4, 3200); tone(220, 0.09, 'square', 0.18, 60); },
    hit: function () { tone(180, 0.12, 'sawtooth', 0.2, 90); },
    pickup: function () { tone(660, 0.1, 'sine', 0.22); setTimeout(function () { tone(880, 0.14, 'sine', 0.22); }, 90); },
    cash: function () { tone(988, 0.08, 'sine', 0.2); setTimeout(function () { tone(1319, 0.16, 'sine', 0.2); }, 80); },
    door: function () { noise(0.08, 0.2, 900); tone(140, 0.08, 'square', 0.12, 90); },
    crash: function () { noise(0.25, 0.5, 700); tone(90, 0.2, 'sawtooth', 0.25, 40); },
    siren: function () { tone(780, 0.5, 'sine', 0.07, 1040); },
    mission: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.18, 'triangle', 0.22); }, i * 110);
      });
    },
    fail: function () { tone(220, 0.35, 'sawtooth', 0.2, 110); tone(165, 0.4, 'sawtooth', 0.18, 82); },
    click: function () { tone(1200, 0.04, 'square', 0.1); },
    wanted: function () { tone(392, 0.15, 'square', 0.14); setTimeout(function () { tone(311, 0.2, 'square', 0.14); }, 140); }
  };

  // Engine hum that follows the car's speed (0..1).
  function engine(speed01, on) {
    if (!ensure() || muted) { stopEngine(); return; }
    if (!on) { stopEngine(); return; }
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 500;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    }
    var t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(50 + speed01 * 160, t, 0.08);
    engineFilter.frequency.setTargetAtTime(400 + speed01 * 1400, t, 0.1);
    engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.05, t, 0.1);
  }

  function stopEngine() {
    if (engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }

  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = setInterval(function () {
      if (muted || !ctx) return;
      var step = BASSLINE[musicStep % BASSLINE.length];
      musicStep++;
      tone(midiToFreq(step[0] - 12), 0.42, 'triangle', 0.11);
      if (musicStep % 8 === 0) tone(midiToFreq(step[0] + 12), 0.4, 'sine', 0.05);
    }, 430);
  }

  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function toggleMute() { muted = !muted; return muted; }

  global.HH = global.HH || {};
  global.HH.audio = {
    ensure: ensure, resume: resume, sfx: sfx, engine: engine,
    startMusic: startMusic, stopMusic: stopMusic, toggleMute: toggleMute
  };
})(typeof window !== 'undefined' ? window : globalThis);
