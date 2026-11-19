# Harbor Heat

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original top-down 2.5D open-world crime game, built for the **gta6-01** bounty ("Make GTA 6").
You are **Dana Reyes**, a getaway driver trying to buy her way out of **Port Verde** — a harbour
city of seven districts, one ferry terminal, and far too many cops.

## Play

Open `game/index.html` in a desktop browser (or `node serve.ts`, then visit
http://localhost:8080). No install, no network, no libraries — pure HTML5 Canvas and
vanilla JavaScript, with synthesized sound through the WebAudio API.

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive / walk |
| Mouse | Aim (on foot) |
| Click | Shoot |
| E | Steal a car / get out |
| Space | Handbrake |
| M | Start the next story job |
| J | Start a side job |
| 1 / 2 | Pistol / Scattergun |
| P | Pause |
| H | Save / load your progress |

## The game

- **Port Verde** — a 9×9-block city with seven districts (Old Town, Downtown, North Hills,
  Marina, Dockside, Beachfront, South Park), 100+ buildings, traffic, pedestrians, parks,
  and landmarks: the Ferry Terminal, Verde Stadium, and City Hall.
- **Driving** — eight car models with arcade physics (acceleration, drift, handbrake),
  traffic AI, collisions, and carjacking: walk up to any parked or slow car and press E.
  Stealing in front of a cop raises your wanted level.
- **Wanted system** — 0–5 stars. Heat rises from crimes and decays when you stay out of
  sight. Police cars, foot cops, and (at 4+ stars) motorcycle interceptors hunt you; get
  busted and you lose a cut of your cash.
- **Story** — five missions with Rico, Marisol, and the crew: a marina pickup, a
  container-yard shootout, a hilltop grab, a stadium drop, and a dawn run out of town.
  Rewards from $400 to $2,500.
- **Side jobs** — courier runs, taxi fares, and vigilante bounties, whenever you want them.
- **Combat** — pistol and scattergun, enemy AI that shoots back, health pickups, and a
  wanted spike when the shooting starts.
- **Day / night** — a full clock (07:00–22:00+), golden-hour sunsets, street lamps and
  headlights after dark, and a minimap that follows you everywhere.
- **Save** — progress, cash, and the story chapter persist in localStorage.

## Screenshots

Four real frames from the game, in `screenshots/`:

1. `1-drive.jpg` — golden-hour drive through the Marina district.
2. `2-chase.jpg` — a three-star police chase at night downtown.
3. `3-mission.jpg` — on-foot shootout at the container yard.
4. `4-night.jpg` — the marina after dark, lamps on.

## Self-test

`node test.js` runs a headless logic test (city generation, car physics, wanted math,
and a full play-through of mission 1) — **38 checks, all passing**.

## Files

- `main.ts` — entrypoint: copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the kit's `buildDossier`.
- `game/` — the whole game: `index.html` plus `src/` (14 modules, no dependencies).
- `screenshots/` — the four frames above.
- `test.js` — the headless self-test.
- `serve.ts` — the kit's static server (unchanged).
- `vendor/` — the kit's vendored library (unchanged).

## License

MIT.
