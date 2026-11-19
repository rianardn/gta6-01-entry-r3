// input.js — keyboard + mouse state for Harbor Heat.
(function (global) {
  'use strict';

  var keys = {};
  var pressed = {};   // keys pressed this frame (edge-triggered)
  var mouse = { x: 0, y: 0, down: false, clicked: false, wx: 0, wy: 0 };
  var canvas = null;

  function bind(canvasEl) {
    canvas = canvasEl;
    window.addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!keys[k]) pressed[k] = true;
      keys[k] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) !== -1) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys[k] = false;
    });
    window.addEventListener('blur', function () { keys = {}; });
    canvasEl.addEventListener('mousemove', function (e) {
      var r = canvasEl.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    canvasEl.addEventListener('mousedown', function (e) {
      if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
    });
    window.addEventListener('mouseup', function () { mouse.down = false; });
    canvasEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function isDown(k) { return !!keys[k]; }

  // True only on the frame the key went down.
  function wasPressed(k) { return !!pressed[k]; }

  // True only on the frame the mouse was clicked.
  function wasClicked() { return mouse.clicked; }

  function endFrame() {
    pressed = {};
    mouse.clicked = false;
  }

  // Movement axes from WASD + arrows: {x: -1..1, y: -1..1}.
  function moveAxes() {
    var x = 0, y = 0;
    if (isDown('a') || isDown('arrowleft')) x -= 1;
    if (isDown('d') || isDown('arrowright')) x += 1;
    if (isDown('w') || isDown('arrowup')) y -= 1;
    if (isDown('s') || isDown('arrowdown')) y += 1;
    return { x: x, y: y };
  }

  global.HH = global.HH || {};
  global.HH.input = {
    bind: bind, isDown: isDown, wasPressed: wasPressed, wasClicked: wasClicked,
    endFrame: endFrame, moveAxes: moveAxes, mouse: mouse
  };
})(typeof window !== 'undefined' ? window : globalThis);
