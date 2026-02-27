// Backfill genre field on all BTD posts using Spotify track → artist → genre
import https from 'https';

const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';
const SPOTIFY_CLIENT_ID = 'f7dac43e65584124ac11bc702431d26d';
const SPOTIFY_CLIENT_SECRET = '0a4ec9c84f114f81a80b0508e006299e';

async function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, json: () => JSON.parse(data), text: () => data }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function getSpotifyToken() {
  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const d = await res.json();
  return d.access_token;
}

async function getGenreForTrack(trackId, token) {
  if (!trackId) return null;
  try {
    // Get track → artist IDs
    const tr = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!tr.ok) return null;
    const track = await tr.json();
    const artistId = track.artists?.[0]?.id;
    if (!artistId) return null;

    // Get artist → genres
    const ar = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!ar.ok) return null;
    const artist = await ar.json();
    const genres = artist.genres || [];
    return genres[0] || null; // primary genre
  } catch(e) {
    return null;
  }
}

async function getAllPosts() {
  let allDocs = [], pageToken = null;
  do {
    const url = `${FIREBASE_BASE}/config?key=${FIREBASE_KEY}&pageSize=500${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    const docs = (data.documents || []).filter(d => d.name?.includes('btd_post_'));
    allDocs = allDocs.concat(docs);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return allDocs;
}

async function patchGenre(slug, genre) {
  const url = `${FIREBASE_BASE}/config/btd_post_${slug}?key=${FIREBASE_KEY}&updateMask.fieldPaths=genre`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { genre: { stringValue: genre } } })
  });
  return res.ok;
}

// Normalize Spotify genre to cleaner display label
function normalizeGenre(raw) {
  if (!raw) return 'Uncategorized';
  const map = {
    'hip hop': 'Hip-Hop', 'rap': 'Hip-Hop', 'trap': 'Hip-Hop', 'melodic rap': 'Hip-Hop',
    'pop': 'Pop', 'indie pop': 'Indie Pop', 'alt z': 'Indie Pop',
    'indie rock': 'Indie Rock', 'rock': 'Rock', 'alternative': 'Alt',
    'r&b': 'R&B', 'neo soul': 'R&B', 'soul': 'R&B',
    'electronic': 'Electronic', 'edm': 'Electronic', 'dance pop': 'Pop',
    'country': 'Country', 'folk': 'Folk', 'singer-songwriter': 'Folk',
    'punk': 'Punk', 'emo': 'Alt', 'lo-fi': 'Lo-Fi',
  };
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  // Title case the raw genre
  return raw.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

async function main() {
  console.log('Getting Spotify token...');
  const token = await getSpotifyToken();
  
  console.log('Fetching all posts...');
  const posts = await getAllPosts();
  console.log(`Found ${posts.length} posts`);

  let done = 0, failed = 0, skipped = 0;
  
  for (const doc of posts) {
    const f = doc.fields || {};
    const slug = f.slug?.stringValue || doc.name.split('/').pop().replace('btd_post_', '');
    const trackId = f.trackId?.stringValue;
    const existingGenre = f.genre?.stringValue;
    
    if (existingGenre) { skipped++; continue; }
    if (!trackId) {
      // No trackId — try to infer from artist name via search
      failed++;
      continue;
    }

    const rawGenre = await getGenreForTrack(trackId, token);
    const genre = normalizeGenre(rawGenre);
    const ok = await patchGenre(slug, genre);
    
    if (ok) {
      done++;
      console.log(`[${done}/${posts.length}] ${slug} → ${genre}`);
    } else {
      failed++;
      console.log(`[FAIL] ${slug}`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\nDone: ${done} updated, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
