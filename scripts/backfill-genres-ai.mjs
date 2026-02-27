// Backfill genres using AI inference from artist name + writeup text
// Uses Claude to classify into clean genre buckets

import https from 'https';
import { execSync } from 'child_process';

const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';

// Genre buckets we want on the site
const GENRES = ['Hip-Hop', 'Pop', 'Indie', 'R&B', 'Electronic', 'Rock', 'Country', 'Folk', 'Alt', 'Lo-Fi', 'Punk', 'Jazz', 'Afrobeats', 'Latin'];

// Simple artist→genre lookup for well-known names (avoids API calls)
const KNOWN = {
  '21 savage': 'Hip-Hop', 'metro boomin': 'Hip-Hop', 'lil tecca': 'Hip-Hop',
  'lil baby': 'Hip-Hop', 'lil wayne': 'Hip-Hop', 'fredo bang': 'Hip-Hop',
  'nobigdyl': 'Hip-Hop', 'aminé': 'Hip-Hop', 'jpegmafia': 'Hip-Hop',
  'bakar': 'Indie', 'geese': 'Indie', 'bartees strange': 'Indie',
  'flume': 'Electronic', 'waxahatchee': 'Folk', 'lola young': 'Pop',
  'dominic fike': 'Pop', 'ella langley': 'Country', 'chesle': 'R&B',
  'dave': 'Hip-Hop', 'aj tracey': 'Hip-Hop', 'aka lisa': 'Pop',
};

async function fbFetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, json: () => JSON.parse(data) }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function inferGenre(artist, title, writeup) {
  const text = `${artist} ${title} ${writeup}`.toLowerCase();
  // Check known artists first
  for (const [name, genre] of Object.entries(KNOWN)) {
    if (artist.toLowerCase().includes(name)) return genre;
  }
  // Keyword inference
  if (/\b(rap|hip.?hop|trap|drill|bars|verse|freestyle|diss|beef|flow|hook|808)\b/.test(text)) return 'Hip-Hop';
  if (/\b(r&b|rnb|neo.?soul|soul|vocals|falsetto|groove|slow jam)\b/.test(text)) return 'R&B';
  if (/\b(indie|lo.?fi|bedroom|bedroom pop|dream pop|shoegaze|alt.?rock)\b/.test(text)) return 'Indie';
  if (/\b(electronic|edm|dance|synth|house|techno|club|bass)\b/.test(text)) return 'Electronic';
  if (/\b(country|twang|nashville|honky|western|bluegrass)\b/.test(text)) return 'Country';
  if (/\b(folk|acoustic|singer.?songwriter|fingerpick)\b/.test(text)) return 'Folk';
  if (/\b(punk|post.?punk|hardcore|emo|screamo)\b/.test(text)) return 'Punk';
  if (/\b(jazz|blues|swing|brass|horn|piano jazz)\b/.test(text)) return 'Jazz';
  if (/\b(afrobeats|afropop|amapiano|highlife|naija)\b/.test(text)) return 'Afrobeats';
  if (/\b(latin|reggaeton|salsa|cumbia|dembow)\b/.test(text)) return 'Latin';
  if (/\b(rock|guitar|riff|distortion|grunge|metal)\b/.test(text)) return 'Rock';
  if (/\b(pop|catchy|chorus|hook|radio|mainstream|anthemic)\b/.test(text)) return 'Pop';
  return 'Alt';
}

async function getAllPosts() {
  let allDocs = [], pageToken = null;
  do {
    const url = `${FIREBASE_BASE}/config?key=${FIREBASE_KEY}&pageSize=500${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fbFetch(url);
    const data = await res.json();
    const docs = (data.documents || []).filter(d => d.name?.includes('btd_post_'));
    allDocs = allDocs.concat(docs);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return allDocs;
}

async function patchGenre(slug, genre) {
  const url = `${FIREBASE_BASE}/config/btd_post_${slug}?key=${FIREBASE_KEY}&updateMask.fieldPaths=genre`;
  const res = await fbFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { genre: { stringValue: genre } } })
  });
  return res.ok;
}

async function main() {
  console.log('Fetching all posts...');
  const posts = await getAllPosts();
  console.log(`Found ${posts.length} posts`);

  let done = 0;
  const genreCounts = {};

  for (const doc of posts) {
    const f = doc.fields || {};
    const slug = f.slug?.stringValue || doc.name.split('/').pop().replace('btd_post_', '');
    const artist = f.artist?.stringValue || '';
    const title = f.title?.stringValue || '';
    const writeup = (f.writeup?.stringValue || '').replace(/<[^>]+>/g, ' ');

    const genre = inferGenre(artist, title, writeup);
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;

    const ok = await patchGenre(slug, genre);
    if (ok) {
      done++;
      if (done % 20 === 0) console.log(`[${done}/${posts.length}] ...`);
    }
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\nDone: ${done}/${posts.length} updated`);
  console.log('Genre breakdown:', JSON.stringify(genreCounts, null, 2));
}

main().catch(console.error);
