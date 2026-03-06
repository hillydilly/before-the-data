#!/usr/bin/env node
/**
 * Fast artwork backfill using iTunes Search API
 * Covers ALL posts with missing artwork, paginating through entire Firebase
 * Runs with concurrency to finish in ~1-2 hours instead of 12+
 */
const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config';
const CONCURRENCY = 5;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchItunes(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const url = `https://itunes.apple.com/search?term=${q}&entity=song&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results || [];

    const cleanTitle = title.toLowerCase().replace(/\s*feat.*$/i,'').replace(/\s*ft\..*$/i,'').replace(/[^a-z0-9\s]/g,'').trim();
    const cleanArtist = artist.toLowerCase().split(/[,&]/)[0].replace(/[^a-z0-9\s]/g,'').trim();

    // Try exact match first
    for (const r of results) {
      const rTitle = (r.trackName || '').toLowerCase().replace(/[^a-z0-9\s]/g,'');
      const rArtist = (r.artistName || '').toLowerCase().replace(/[^a-z0-9\s]/g,'');
      const titleMatch = rTitle.includes(cleanTitle) || cleanTitle.includes(rTitle.substring(0, 8));
      const artistMatch = rArtist.includes(cleanArtist.split(' ')[0]) || cleanArtist.includes(rArtist.split(' ')[0]);
      if (titleMatch && artistMatch && r.artworkUrl100) {
        return r.artworkUrl100.replace('100x100bb', '640x640bb').replace('100x100', '640x640');
      }
    }
    // Fallback: first result with artwork
    const first = results.find(r => r.artworkUrl100);
    if (first) return first.artworkUrl100.replace('100x100bb', '640x640bb').replace('100x100', '640x640');
    return null;
  } catch { return null; }
}

async function patchArt(docId, artUrl) {
  const url = `${FIREBASE_BASE}/${docId}?key=${FIREBASE_KEY}&updateMask.fieldPaths=artUrl`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { artUrl: { stringValue: artUrl } } })
  });
  return res.ok;
}

async function processChunk(chunk, stats) {
  for (const doc of chunk) {
    const docId = doc.name.split('/').pop();
    const artist = doc.fields?.artist?.stringValue || '';
    const title = doc.fields?.title?.stringValue || '';
    if (!artist || !title) { stats.skipped++; continue; }

    const artUrl = await searchItunes(artist, title);
    if (artUrl) {
      const ok = await patchArt(docId, artUrl);
      if (ok) { stats.fixed++; } else { stats.failed++; }
    } else {
      stats.failed++;
    }
    await sleep(200);
  }
}

async function main() {
  console.log('Loading all posts missing artwork from Firebase...');
  const missing = [];
  let pageToken = null, page = 0;

  do {
    page++;
    let url = `${FIREBASE_BASE}?key=${FIREBASE_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const data = await fetch(url).then(r => r.json());
    const docs = (data.documents || []).filter(d => {
      if (!d.name?.includes('btd_post_')) return false;
      const art = d.fields?.artUrl?.stringValue || '';
      return !art;
    });
    missing.push(...docs);
    pageToken = data.nextPageToken || null;
    process.stdout.write(`\r  Page ${page}: ${missing.length} missing so far...`);
    if (pageToken) await sleep(150);
  } while (pageToken);

  console.log(`\n\nFound ${missing.length} posts missing artwork. Starting backfill with concurrency ${CONCURRENCY}...\n`);

  const stats = { fixed: 0, failed: 0, skipped: 0 };
  const chunkSize = Math.ceil(missing.length / CONCURRENCY);
  const chunks = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    chunks.push(missing.slice(i * chunkSize, (i + 1) * chunkSize));
  }

  const startTime = Date.now();
  await Promise.all(chunks.map(chunk => processChunk(chunk, stats)));

  const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
  console.log(`\nDone in ${elapsed} minutes:`);
  console.log(`  Fixed:   ${stats.fixed}`);
  console.log(`  Failed:  ${stats.failed}`);
  console.log(`  Skipped: ${stats.skipped}`);
}

main().catch(console.error);
