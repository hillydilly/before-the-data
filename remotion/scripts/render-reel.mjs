#!/usr/bin/env node
/**
 * BTD Reel Renderer
 * Usage: node scripts/render-reel.mjs --artist "SLOE JACK" --title "POUR ME A DRINK" --art "https://..." [--out output.mp4]
 */

import {execSync} from 'child_process';
import {fileURLToPath} from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const artistName = get('--artist') || 'ARTIST';
const songTitle = get('--title') || 'SONG TITLE';
const artUrl = get('--art') || '';
const outFile = get('--out') || `output/${slugify(artistName)}-${slugify(songTitle)}.mp4`;

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (!artUrl) {
  console.error('❌  --art URL is required');
  process.exit(1);
}

const outPath = path.resolve(rootDir, outFile);
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive: true});

const props = JSON.stringify({artistName, songTitle, artUrl});

console.log(`🎬  Rendering: ${artistName} — ${songTitle}`);
console.log(`📁  Output: ${outPath}`);

const cmd = [
  'npx remotion render',
  `--props='${props.replace(/'/g, "\\'")}'`,
  `BTDReel`,
  `"${outPath}"`,
].join(' ');

try {
  execSync(cmd, {cwd: rootDir, stdio: 'inherit'});
  console.log(`✅  Done: ${outPath}`);
} catch (e) {
  console.error('❌  Render failed');
  process.exit(1);
}
