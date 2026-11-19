// main.ts — Harbor Heat entrypoint (Node 22, standard library only).
// Copies game/ and screenshots/ beside this file to /output and writes
// /output/dossier.json with the kit's buildDossier, under the scorer's caps.
//
// Run it locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game:  node serve.ts  (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(gameDir)) throw new Error('Harbor Heat: game/ is missing from the repository');
if (!existsSync(shotsDir) || readdirSync(shotsDir).filter((f) => !f.startsWith('.')).length === 0) {
  throw new Error('Harbor Heat: screenshots/ holds no image — the first is the cover');
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => !f.startsWith('.')) : [];
console.log('Harbor Heat: wrote ' + out + ' (game/ + ' + shots.length + ' screenshots + dossier.json)');
