// test.js — headless self-test for Harbor Heat's game logic (node, no browser).
// Run: node test.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, 'game', 'src');

// Minimal browser stubs so the modules load in Node.
const sandbox = {
  window: undefined,
  document: { getElementById: () => null, addEventListener: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console: console,
  setTimeout: setTimeout, setInterval: setInterval, clearTimeout: clearTimeout,
  Math: Math, JSON: JSON
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(name) {
  const code = fs.readFileSync(path.join(SRC, name), 'utf8');
  vm.runInContext(code, sandbox, { filename: name });
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
}

// Stub audio before loading modules that call it.
load('util.js');
sandbox.HH.audio = { sfx: { crash: () => {}, wanted: () => {}, shoot: () => {}, hit: () => {}, pickup: () => {}, cash: () => {}, door: () => {}, mission: () => {}, fail: () => {}, click: () => {}, siren: () => {} }, engine: () => {}, startMusic: () => {} };
load('city.js');
load('vehicles.js');
load('people.js');
load('cops.js');
load('player.js');
load('combat.js');
load('missions.js');

const U = sandbox.HH.util;
const City = sandbox.HH.city;
const V = sandbox.HH.vehicles;
const Cops = sandbox.HH.cops;
const Missions = sandbox.HH.missions;

console.log('== util ==');
check('clamp', U.clamp(5, 0, 3) === 3 && U.clamp(-1, 0, 3) === 0);
check('wrapAngle', Math.abs(U.wrapAngle(Math.PI * 3) - Math.PI) < 1e-9);
check('money', U.money(12500) === '$12,500');
check('clockString', U.clockString(480) === '08:00' && U.clockString(1350) === '22:30');
check('rng deterministic', (() => {
  const a = U.makeRng(7), b = U.makeRng(7);
  return a() === b() && a() === b();
})());

console.log('== city ==');
const city = City.buildCity(1337);
check('city size', city.size === 2880);
check('buildings present', city.buildings.length > 100, 'got ' + city.buildings.length);
check('districts', city.districts.length === 7);
check('spots', Object.keys(city.spots).length === 8);
check('onRoad center', city.onRoad(320, 100) === true);
check('onRoad off-road', city.onRoad(160, 160) === false);
check('hitBuilding detects', City.hitBuilding(city, city.buildings[0].x + 5, city.buildings[0].y + 5, 4) !== null);
check('hitBuilding clear', City.hitBuilding(city, 320, 320, 4) === null);
check('inBounds', City.inBounds(city, 100, 100, 0) && !City.inBounds(city, -5, 100, 0));

console.log('== vehicles ==');
const car = V.makeCar(3, 320, 320, 0);
check('car model', car.model.name === 'Hilltop Coupe' && car.halfLen === 24);
V.driveCar(car, 1, 0, 1, false);
check('car accelerates', car.speed > 200, 'speed=' + car.speed.toFixed(1));
check('car moves forward', car.x > 400, 'x=' + car.x.toFixed(1));
const x0 = car.x;
V.driveCar(car, 0, 1, 0.5, false);
check('car steers', car.angle > 0.05, 'angle=' + car.angle.toFixed(3));
const traffic = V.spawnTraffic(city, U.makeRng(99), 10, { x: 320, y: 320 });
check('traffic spawns', traffic.length === 10);
check('traffic drives', traffic.every((c) => c.driver === 'traffic'));

console.log('== cops / wanted ==');
const w = Cops.makeWanted();
check('wanted starts 0', w.level === 0);
Cops.addHeat(w, 1);
check('heat level 1', w.level === 1);
Cops.addHeat(w, 2);
check('heat level 3', w.level === 3);
check('units for 3 stars', Cops.unitsForLevel(3) === 3);
check('units for 0 stars', Cops.unitsForLevel(0) === 0);
check('units for 5 stars', Cops.unitsForLevel(5) === 6);
Cops.updateWanted(w, 7, false, true);
check('wanted decays when hidden', w.heat < 3, 'heat=' + w.heat.toFixed(2));

console.log('== missions ==');
const m = Missions.makeMissions();
check('5 story missions', m.story.length === 5);
check('3 side jobs', m.jobs.length === 3);
// Fake a minimal game object for the mission flow.
const fakeGame = {
  city: city, time: 0, wanted: w, player: { x: city.spots.marina.x, y: city.spots.marina.y, cash: 0, onFoot: true, car: null },
  enemies: [], bullets: [], sparks: [], pickups: [], peds: [], cars: [], copCars: [],
  toast: () => {}
};
fakeGame.player.cash = 0;
Missions.startStory(m, fakeGame);
check('mission 1 starts', m.active && m.active.id === 'm1');
check('first step is goto marina', Missions.currentStep(m).type === 'goto');
// Player already at the marina: step should advance.
Missions.update(fakeGame, m, 0.1);
check('goto step completes at spot', Missions.currentStep(m).type === 'wait');
Missions.update(fakeGame, m, 2.5);
check('wait step completes', Missions.currentStep(m).type === 'goto' && Missions.currentStep(m).spot === 'garage');
// Teleport to the garage and finish.
fakeGame.player.x = city.spots.garage.x; fakeGame.player.y = city.spots.garage.y;
Missions.update(fakeGame, m, 0.1);
const r = Missions.update(fakeGame, m, 0.1);
check('mission 1 completes + pays', r === 'done' && fakeGame.player.cash === 400, 'cash=' + fakeGame.player.cash);
check('story advances', m.storyIdx === 1);

console.log('== combat ==');
const enemy = sandbox.HH.combat.makeEnemy(500, 500, 'thug');
check('enemy health', enemy.health === 60);
const heavy = sandbox.HH.combat.makeEnemy(500, 500, 'heavy');
check('heavy health', heavy.health === 120);

console.log('== people ==');
const peds = sandbox.HH.people.spawnPeds(city, U.makeRng(5), 20, { x: 320, y: 320 });
check('peds spawn', peds.length > 10, 'got ' + peds.length);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
