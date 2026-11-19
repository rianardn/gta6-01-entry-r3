// city.js — Port Verde: a seeded grid city with six districts, roads, buildings.
(function (global) {
  'use strict';
  var U = global.HH.util;

  var TILE = 320;            // city block size in world units
  var GRID = 9;              // 9x9 blocks
  var WORLD = TILE * GRID;   // 2880 world units across

  var DISTRICTS = [
    { name: 'Old Town',    x0: 0, y0: 0, x1: 3, y1: 3, ground: '#8a7f6a', roof: '#6b5f4c', accent: '#c9a86a' },
    { name: 'Downtown',    x0: 3, y0: 0, x1: 6, y1: 3, ground: '#5d6470', roof: '#3d4454', accent: '#7fb2ff' },
    { name: 'North Hills', x0: 6, y0: 0, x1: 9, y1: 3, ground: '#5f7a52', roof: '#48603e', accent: '#a8d18d' },
    { name: 'Marina',      x0: 0, y0: 3, x1: 3, y1: 6, ground: '#4e7d8c', roof: '#3a6270', accent: '#8fd8e8' },
    { name: 'Dockside',    x0: 3, y0: 3, x1: 6, y1: 6, ground: '#6e6258', roof: '#544a40', accent: '#e8a04c' },
    { name: 'Beachfront',  x0: 6, y0: 3, x1: 9, y1: 6, ground: '#c2a878', roof: '#a8895c', accent: '#ffe9a8' },
    { name: 'South Park',  x0: 0, y0: 6, x1: 9, y1: 9, ground: '#55794a', roof: '#40603a', accent: '#b5e39a' }
  ];

  function districtAt(bx, by) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      if (bx >= d.x0 && bx < d.x1 && by >= d.y0 && by < d.y1) return d;
    }
    return DISTRICTS[0];
  }

  // Roads run between blocks: road center lines at multiples of TILE.
  function roadCenters() {
    var lines = [];
    for (var i = 0; i <= GRID; i++) lines.push(i * TILE);
    return lines;
  }

  function nearestRoadCoord(v) { return Math.round(v / TILE) * TILE; }

  // Is a world point on a road (within the road half-width)?
  function onRoad(x, y) {
    var rx = Math.abs(x - nearestRoadCoord(x));
    var ry = Math.abs(y - nearestRoadCoord(y));
    return rx < 26 || ry < 26;
  }

  // Is a world point on a sidewalk (the ring just outside the road)?
  function onSidewalk(x, y) {
    var rx = Math.abs(x - nearestRoadCoord(x));
    var ry = Math.abs(y - nearestRoadCoord(y));
    return (rx >= 26 && rx < 44) || (ry >= 26 && ry < 44);
  }

  function buildCity(seed) {
    var rng = U.makeRng(seed);
    var buildings = [];
    var trees = [];
    var lamps = [];
    var hydrants = [];

    for (var bx = 0; bx < GRID; bx++) {
      for (var by = 0; by < GRID; by++) {
        var d = districtAt(bx, by);
        var x0 = bx * TILE + 52, y0 = by * TILE + 52;
        var x1 = (bx + 1) * TILE - 52, y1 = (by + 1) * TILE - 52;
        // South Park is mostly green: few buildings, many trees.
        if (d.name === 'South Park') {
          var nT = U.intRange(rng, 6, 10);
          for (var t = 0; t < nT; t++) {
            trees.push({ x: U.range(rng, x0, x1), y: U.range(rng, y0, y1), r: U.range(rng, 14, 24) });
          }
          continue;
        }
        // Marina / Beachfront get a plaza + palms instead of a second tower.
        var lots = d.name === 'Downtown' ? 4 : 3;
        for (var l = 0; l < lots; l++) {
          var w = U.range(rng, 62, 108), h = U.range(rng, 62, 108);
          var px = U.range(rng, x0, x1 - w), py = U.range(rng, y0, y1 - h);
          var tall = d.name === 'Downtown' && rng() < 0.55;
          buildings.push({
            x: px, y: py, w: w, h: h,
            height: tall ? U.intRange(rng, 3, 6) : U.intRange(rng, 1, 3),
            roof: d.roof, accent: d.accent, district: d.name,
            hue: U.range(rng, -8, 8)
          });
        }
        // Street props around the block edges.
        for (var p = 0; p < 3; p++) {
          var side = U.intRange(rng, 0, 3);
          var px2 = side === 0 ? x0 - 34 : (side === 1 ? x1 + 34 : U.range(rng, x0, x1));
          var py2 = side === 2 ? y0 - 34 : (side === 3 ? y1 + 34 : U.range(rng, y0, y1));
          if (rng() < 0.6) lamps.push({ x: px2, y: py2 });
          else hydrants.push({ x: px2, y: py2 });
        }
        if (d.name === 'Beachfront' || d.name === 'Marina' || d.name === 'North Hills') {
          trees.push({ x: U.range(rng, x0, x1), y: U.range(rng, y0, y1), r: U.range(rng, 12, 20), palm: d.name !== 'North Hills' });
        }
      }
    }

    // Landmarks: the ferry terminal (Marina), the stadium (Dockside), city hall (Downtown).
    var landmarks = [
      { name: 'Ferry Terminal', x: 1 * TILE + 160, y: 4 * TILE + 160, w: 150, h: 90, color: '#2e7f9e' },
      { name: 'Verde Stadium', x: 4 * TILE + 160, y: 4 * TILE + 160, w: 190, h: 120, color: '#7a4a8c' },
      { name: 'City Hall', x: 4 * TILE + 160, y: 1 * TILE + 160, w: 130, h: 100, color: '#4a6a8c' }
    ];

    // Named spawn / mission spots on roads.
    var spots = {
      home: { x: 1 * TILE, y: 7 * TILE, label: 'Dana\u2019s Apartment' },
      garage: { x: 5 * TILE, y: 7 * TILE, label: 'Rico\u2019s Garage' },
      marina: { x: 1 * TILE, y: 4 * TILE, label: 'Ferry Terminal' },
      stadium: { x: 4 * TILE, y: 4 * TILE, label: 'Verde Stadium' },
      hall: { x: 4 * TILE, y: 1 * TILE, label: 'City Hall' },
      beach: { x: 8 * TILE, y: 4 * TILE, label: 'Beachfront Pier' },
      docks: { x: 5 * TILE, y: 5 * TILE, label: 'Container Yard' },
      hills: { x: 7 * TILE, y: 1 * TILE, label: 'Hilltop Mansion' }
    };

    return {
      tile: TILE, grid: GRID, size: WORLD,
      buildings: buildings, trees: trees, lamps: lamps, hydrants: hydrants,
      landmarks: landmarks, spots: spots, districts: DISTRICTS,
      districtAt: districtAt, onRoad: onRoad, onSidewalk: onSidewalk,
      nearestRoadCoord: nearestRoadCoord, roadCenters: roadCenters
    };
  }

  // Circle vs building AABB collision; returns the building hit or null.
  function hitBuilding(city, x, y, r) {
    var bs = city.buildings;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    var ls = city.landmarks;
    for (var j = 0; j < ls.length; j++) {
      var l = ls[j];
      var lx = l.x - l.w / 2, ly = l.y - l.h / 2;
      if (x + r > lx && x - r < lx + l.w && y + r > ly && y - r < ly + l.h) return l;
    }
    return null;
  }

  function inBounds(city, x, y, m) {
    m = m || 0;
    return x > m && y > m && x < city.size - m && y < city.size - m;
  }

  global.HH = global.HH || {};
  global.HH.city = {
    buildCity: buildCity, hitBuilding: hitBuilding, inBounds: inBounds,
    TILE: TILE, GRID: GRID, WORLD: WORLD
  };
})(typeof window !== 'undefined' ? window : globalThis);
