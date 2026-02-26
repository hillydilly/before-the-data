#!/usr/bin/env node
/**
 * Backfill missing artwork for BTD posts using iTunes Search API
 */
const API_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const PROJECT = 'ar-scouting-dashboard';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchItunes(artist, title) {
  const q = encodeURIComponent(`${artist} ${title}`);
  const url = `https://itunes.apple.com/search?term=${q}&entity=song&limit=5`;
  const res = await fetch(url);
  const data = await res.json();
  for (const r of data.results || []) {
    const aName = (r.artistName || '').toLowerCase();
    const tName = (r.trackName || '').toLowerCase();
    const cleanTitle = title.toLowerCase().replace(/\s*feat.*$/i,'').replace(/\s*ft\..*$/i,'').trim();
    const cleanArtist = artist.toLowerCase().split(',')[0].trim();
    if (tName.includes(cleanTitle) || cleanTitle.includes(tName)) {
      if (aName.includes(cleanArtist) || cleanArtist.includes(aName.split(' ')[0])) {
        return {
          artUrl: (r.artworkUrl100 || '').replace('100x100', '640x640'),
          artUrlSm: (r.artworkUrl100 || '').replace('100x100', '300x300'),
        };
      }
    }
  }
  // Fallback: return first result if any
  const first = data.results?.[0];
  if (first?.artworkUrl100) {
    return {
      artUrl: first.artworkUrl100.replace('100x100', '640x640'),
      artUrlSm: first.artworkUrl100.replace('100x100', '300x300'),
    };
  }
  return null;
}

async function patchFirestore(docId, fields) {
  const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const url = `${BASE}/config/${docId}?${fieldPaths}&key=${API_KEY}`;
  const body = {
    fields: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, { stringValue: v }])
    )
  };
  const res = await fetch(url, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  return res.ok;
}

async function main() {
  // Get all posts missing artwork
  const url = `${BASE}/config?pageSize=200&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  const missing = (data.documents || []).filter(d => {
    if (!d.name.includes('btd_post_')) return false;
    const artUrl = d.fields?.artUrl?.stringValue || '';
    return !artUrl;
  });

  console.log(`Found ${missing.length} posts missing artwork\n`);

  let fixed = 0, failed = 0;
  for (const doc of missing) {
    const docId = doc.name.split('/').pop();
    const artist = doc.fields?.artist?.stringValue || '';
    const title = doc.fields?.title?.stringValue || '';

    process.stdout.write(`  ${artist} - ${title} ... `);
    const art = await searchItunes(artist, title);
    if (art?.artUrl) {
      const ok = await patchFirestore(docId, { artUrl: art.artUrl, artUrlSm: art.artUrlSm });
      if (ok) { console.log(`✅ ${art.artUrl.split('/').pop()}`); fixed++; }
      else { console.log('❌ PATCH failed'); failed++; }
    } else {
      console.log('❌ not found on iTunes');
      failed++;
    }
    await sleep(300);
  }

  console.log(`\nDone: ${fixed} fixed, ${failed} failed`);
}

main().catch(console.error);
