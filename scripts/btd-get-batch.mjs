/**
 * btd-get-batch.mjs
 * Finds the next N unprocessed tracks from the new music CSV,
 * fetches iTunes preview URLs, outputs JSON to stdout.
 *
 * Usage: node btd-get-batch.mjs [--batch 25] [--dry-run]
 */

import { readFileSync } from 'fs';

const FIREBASE_PROJECT = 'ar-scouting-dashboard';
const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
const CSV_PATH = '/Users/clawdbot/before-the-data/data/new-music-playlist.csv';

const args = process.argv.slice(2);
const batchSize = parseInt(args[args.indexOf('--batch') + 1] || '25');
const dryRun = args.includes('--dry-run');

// --- Parse CSV ---
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const c of line) {
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += c;
  }
  result.push(current);
  return result;
}

function parseCSV(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
    return obj;
  }).filter(r => r['Track URI'] && !r['Track URI'].startsWith('spotify:local'));
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim().slice(0, 60);
}

function trackIdFromUri(uri) {
  return uri.replace('spotify:track:', '');
}

// --- Fetch existing Firebase post IDs ---
async function getExistingPostIds() {
  const ids = new Set();
  let nextPageToken = null;
  do {
    const url = `${BASE_URL}/config?key=${FIREBASE_KEY}&pageSize=100${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    for (const doc of (data.documents || [])) {
      const name = doc.name?.split('/').pop() || '';
      if (name.startsWith('btd_post_')) {
        ids.add(name.replace('btd_post_', ''));
      }
    }
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);
  return ids;
}

// --- Spotify token + artwork ---
const SPOTIFY_CLIENT_ID = 'f7dac43e65584124ac11bc702431d26d';
const SPOTIFY_CLIENT_SECRET = '0a4ec9c84f114f81a80b0508e006299e';
let _spotifyToken = null;

async function getSpotifyToken() {
  if (_spotifyToken) return _spotifyToken;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  _spotifyToken = data.access_token;
  return _spotifyToken;
}

async function getSpotifyArtwork(trackId) {
  try {
    const token = await getSpotifyToken();
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return { artUrl: '', artUrlSm: '' };
    const t = await res.json();
    return {
      artUrl: t.album?.images?.[0]?.url || '',
      artUrlSm: t.album?.images?.[2]?.url || '',
    };
  } catch {
    return { artUrl: '', artUrlSm: '' };
  }
}

// --- Fetch iTunes preview URL ---
async function getItunesPreview(artist, title) {
  const q = `${artist} ${title}`.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '+');
  const url = `https://itunes.apple.com/search?term=${q}&entity=song&limit=5`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    const best = (data.results || []).find(r => r.previewUrl);
    return best?.previewUrl || '';
  } catch {
    return '';
  }
}

// --- Main ---
async function main() {
  const allTracks = parseCSV(CSV_PATH);
  // Sort newest first
  allTracks.sort((a, b) => new Date(b['Added At'] || 0) - new Date(a['Added At'] || 0));

  process.stderr.write(`Total tracks in CSV: ${allTracks.length}\n`);

  const existing = await getExistingPostIds();
  process.stderr.write(`Already in Firebase: ${existing.size}\n`);

  // Find unprocessed tracks (de-dupe by album for album posts)
  const processed = new Set();
  const batch = [];

  for (const t of allTracks) {
    if (batch.length >= batchSize) break;

    const primaryArtist = (t['Artist Name(s)'] || '').split(';')[0].trim();
    const postId = slugify(`${primaryArtist}-${t['Track Name']}`);

    if (existing.has(postId)) continue;
    if (processed.has(postId)) continue;
    processed.add(postId);

    batch.push({
      trackUri: t['Track URI'],
      trackId: trackIdFromUri(t['Track URI']),
      trackName: t['Track Name'],
      albumName: t['Album Name'],
      artists: (t['Artist Name(s)'] || '').split(';').map(a => a.trim()).filter(Boolean),
      primaryArtist,
      addedAt: t['Added At'] || new Date().toISOString(),
      popularity: parseInt(t['Popularity'] || '0'),
      explicit: t['Explicit'] === 'true',
      postId,
    });
  }

  process.stderr.write(`Next batch: ${batch.length} tracks\n`);
  process.stderr.write(`Remaining after batch: ${allTracks.filter(t => {
    const pa = (t['Artist Name(s)'] || '').split(';')[0].trim();
    const pid = slugify(`${pa}-${t['Track Name']}`);
    return !existing.has(pid);
  }).length - batch.length}\n`);

  if (dryRun) {
    for (const t of batch) {
      process.stderr.write(`  • ${t.primaryArtist} — ${t.trackName}\n`);
    }
    return;
  }

  // Fetch Spotify artwork + iTunes previews
  process.stderr.write('Fetching artwork + previews...\n');
  for (const t of batch) {
    const [artwork, preview] = await Promise.all([
      getSpotifyArtwork(t.trackId),
      getItunesPreview(t.primaryArtist, t.trackName),
    ]);
    t.artUrl = artwork.artUrl;
    t.artUrlSm = artwork.artUrlSm;
    t.previewUrl = preview;
    await new Promise(r => setTimeout(r, 300));
    process.stderr.write(`  ${t.artUrl ? '🖼' : '📭'} ${t.previewUrl ? '🎵' : '🔇'} ${t.primaryArtist} — ${t.trackName}\n`);
  }

  // Output batch as JSON
  console.log(JSON.stringify(batch, null, 2));
}

main().catch(e => { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); });
