#!/usr/bin/env node
/**
 * TURBO artwork backfill — max concurrency, no delays
 * Splits 10k+ posts across N parallel workers, each hitting iTunes independently
 */
const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config';
const CONCURRENCY = 20; // 20 parallel iTunes lookups at once
const BATCH_REPORT = 100;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchItunes(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&entity=song&limit=5`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results || [];
    const cleanTitle = title.toLowerCase().replace(/\s*(feat|ft)\.?.*/i,'').replace(/[^a-z0-9\s]/g,'').trim();
    const cleanArtist = artist.toLowerCase().split(/[,&]/)[0].replace(/[^a-z0-9\s]/g,'').trim();
    const firstWord = cleanArtist.split(' ')[0];
    for (const r of results) {
      const rTitle = (r.trackName||'').toLowerCase().replace(/[^a-z0-9\s]/g,'');
      const rArtist = (r.artistName||'').toLowerCase().replace(/[^a-z0-9\s]/g,'');
      if ((rTitle.includes(cleanTitle.substring(0,8)) || cleanTitle.includes(rTitle.substring(0,8))) &&
          (rArtist.includes(firstWord) || firstWord.length > 3 && rArtist.includes(firstWord.substring(0,4))) &&
          r.artworkUrl100) {
        return r.artworkUrl100.replace('100x100bb','640x640bb').replace('100x100','640x640');
      }
    }
    const first = results.find(r => r.artworkUrl100);
    return first ? first.artworkUrl100.replace('100x100bb','640x640bb').replace('100x100','640x640') : null;
  } catch { return null; }
}

async function patchArt(docId, artUrl) {
  try {
    const url = `${FIREBASE_BASE}/${docId}?key=${FIREBASE_KEY}&updateMask.fieldPaths=artUrl`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({fields:{artUrl:{stringValue:artUrl}}}),
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  } catch { return false; }
}

async function worker(posts, workerId, stats) {
  for (const post of posts) {
    const docId = post.name.split('/').pop();
    const artist = post.fields?.artist?.stringValue || '';
    const title = post.fields?.title?.stringValue || '';
    if (!artist || !title) { stats.skipped++; stats.done++; continue; }
    const artUrl = await searchItunes(artist, title);
    if (artUrl) {
      const ok = await patchArt(docId, artUrl);
      if (ok) stats.fixed++; else stats.failed++;
    } else {
      stats.failed++;
    }
    stats.done++;
    if (stats.done % BATCH_REPORT === 0) {
      const pct = Math.round(stats.done / stats.total * 100);
      const elapsed = Math.round((Date.now() - stats.startTime) / 1000 / 60);
      const rate = stats.done / ((Date.now() - stats.startTime) / 1000);
      const eta = Math.round((stats.total - stats.done) / rate / 60);
      console.log(`[${pct}%] ${stats.done}/${stats.total} — Fixed: ${stats.fixed} | ETA: ${eta}min | Elapsed: ${elapsed}min`);
    }
  }
}

async function main() {
  console.log('Collecting missing artwork list from Firebase...');
  const missing = [];
  let pageToken = null, page = 0;
  do {
    let url = `${FIREBASE_BASE}?key=${FIREBASE_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const data = await fetch(url).then(r => r.json());
    for (const d of (data.documents||[])) {
      if (!d.name?.includes('btd_post_')) continue;
      if (!d.fields?.artUrl?.stringValue) missing.push(d);
    }
    pageToken = data.nextPageToken||null;
    page++;
    process.stdout.write(`\r  ${page}/60 pages, ${missing.length} missing...`);
  } while (pageToken);

  console.log(`\n\nFound ${missing.length} posts missing artwork`);
  console.log(`Starting ${CONCURRENCY} parallel workers...\n`);

  const stats = { fixed:0, failed:0, skipped:0, done:0, total:missing.length, startTime:Date.now() };
  const chunkSize = Math.ceil(missing.length / CONCURRENCY);
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(missing.slice(i*chunkSize, (i+1)*chunkSize), i, stats));
  }
  await Promise.all(workers);

  const elapsed = Math.round((Date.now() - stats.startTime) / 1000 / 60);
  console.log(`\n✅ Done in ${elapsed} minutes`);
  console.log(`   Fixed:   ${stats.fixed}`);
  console.log(`   Failed:  ${stats.failed}`);
  console.log(`   Skipped: ${stats.skipped}`);
}

main().catch(console.error);
