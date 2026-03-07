#!/usr/bin/env node
/**
 * build-posts-json.mjs
 * Fetches ALL posts from Firebase and writes a static posts.json
 * to the public directory. The site loads this single file instead
 * of paginating through Firestore on every page load.
 *
 * Usage: node scripts/build-posts-json.mjs
 * Called automatically by btd-push-posts.mjs after each import.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dir, '..', 'posts.json');

const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const BASE = `https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents`;

function strVal(f) { return f?.stringValue || ''; }
function intVal(f) { return parseInt(f?.integerValue || 0); }
function boolVal(f) { return f?.booleanValue || false; }
function arrVal(f) { return (f?.arrayValue?.values || []).map(v => v.stringValue || ''); }
function mapVal(f) {
  const fields = f?.mapValue?.fields || {};
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, strVal(v)]));
}

function parseDoc(doc) {
  const id = doc.name.split('/').pop();
  const f = doc.fields || {};
  const slug = strVal(f.slug) || id.replace('btd_post_', '').replace(/_/g, '-');
  const tsRaw = f.publishedAt?.timestampValue || f.publishedAt?.stringValue || '';
  const publishedSec = tsRaw ? Math.floor(new Date(tsRaw).getTime() / 1000) : 0;

  return {
    id: strVal(f.id) || slug,
    slug,
    title: strVal(f.title),
    artist: strVal(f.artist),
    artUrl: strVal(f.artUrl),
    artUrlSm: strVal(f.artUrlSm) || strVal(f.artUrl),
    previewUrl: strVal(f.previewUrl),
    trackId: strVal(f.trackId) || strVal(f.spotifyId),
    youtubeId: strVal(f.youtubeId) || strVal(f.ytId),
    country: strVal(f.country),
    city: strVal(f.city),
    location: strVal(f.location),
    publishedAt: { seconds: publishedSec },
    tags: arrVal(f.tags),
    genres: arrVal(f.genres) || (strVal(f.genre) ? [strVal(f.genre)] : []),
    type: strVal(f.type),
    writeup: strVal(f.writeup),
    views: intVal(f.views),
    btdPostLive: boolVal(f.btdPostLive),
    isArchive: boolVal(f.isArchive),
    writtenBy: mapVal(f.writtenBy),
    socialLinks: mapVal(f.socialLinks),
    spotifyEmbed: strVal(f.spotifyEmbed),
    genre: strVal(f.genre),
  };
}

async function fetchAllPosts() {
  let allDocs = [], pageToken = null;
  let page = 0;
  do {
    const url = `${BASE}/config?key=${FIREBASE_KEY}&pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(url);
      if (res.status !== 429) break;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
    const data = await res.json();
    const docs = (data.documents || []).filter(d => d.name?.includes('btd_post_'));
    allDocs.push(...docs);
    pageToken = data.nextPageToken || null;
    page++;
    process.stdout.write(`  Page ${page}: ${docs.length} posts (total: ${allDocs.length})\n`);
  } while (pageToken);
  return allDocs;
}

async function main() {
  console.log('Building posts.json...');
  const docs = await fetchAllPosts();
  const posts = docs
    .map(parseDoc)
    .filter(p => p.title && p.artist) // skip empty stubs
    .sort((a, b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0));

  const output = {
    generated: new Date().toISOString(),
    count: posts.length,
    posts,
  };

  writeFileSync(OUT_PATH, JSON.stringify(output));
  console.log(`✅ posts.json written: ${posts.length} posts (${Math.round(JSON.stringify(output).length / 1024)}KB)`);

  // Also build slim posts-live.json — all non-archive posts for fast discover/new-music page load
  // Include btdPostLive:true posts always, plus recent non-archive posts (last 500)
  const btdLive = posts.filter(p => p.btdPostLive === true);
  const recentNonArchive = posts
    .filter(p => !p.isArchive && p.btdPostLive !== true)
    .slice(0, 500); // already sorted newest-first
  const livePosts = [...btdLive, ...recentNonArchive]
    .sort((a,b) => (b.publishedAt?.seconds||0) - (a.publishedAt?.seconds||0));
  const liveOutput = { generated: new Date().toISOString(), count: livePosts.length, posts: livePosts };
  const liveOutPath = new URL('../posts-live.json', import.meta.url).pathname;
  writeFileSync(liveOutPath, JSON.stringify(liveOutput));
  console.log(`✅ posts-live.json written: ${livePosts.length} live posts (${Math.round(JSON.stringify(liveOutput).length / 1024)}KB)`);

  // Also build search-index.json — slim version for browser search (no writeup, smaller)
  const searchPosts = posts.map(p => {
    const d = p.publishedAt?.seconds ? new Date(p.publishedAt.seconds * 1000).toISOString() : '';
    return {
      slug: p.slug, title: p.title, artist: p.artist,
      artUrlSm: (() => { const sm = p.artUrlSm || p.artUrl || ''; return sm.includes('scdn.co') ? (p.artUrl && !p.artUrl.includes('scdn.co') ? p.artUrl : '') : sm; })(),
      previewUrl: p.previewUrl || '',
      city: p.city || '', country: p.country || '',
      genres: p.genres || [], tags: p.tags || [],
      publishedAt: d,
      isArchive: p.isArchive || false,
      btdPostLive: p.btdPostLive || false,
    };
  });
  const searchOutput = { generated: new Date().toISOString(), count: searchPosts.length, posts: searchPosts };
  const searchOutPath = new URL('../search-index.json', import.meta.url).pathname;
  writeFileSync(searchOutPath, JSON.stringify(searchOutput));
  console.log(`✅ search-index.json written: ${searchPosts.length} posts (${Math.round(JSON.stringify(searchOutput).length / 1024)}KB)`);

  // Build archive-index.json — ultra-lean for archive year grid (no writeup, no preview URL, just boolean)
  const SILHOUETTE = 'artist-default.svg';
  const archivePosts = posts.map(p => {
    const artUrl = p.artUrlSm || p.artUrl || '';
    const d = p.publishedAt?.seconds ? new Date(p.publishedAt.seconds * 1000).toISOString() : '';
    return {
      s: p.slug,                          // slug
      t: p.title,                         // title
      a: p.artist,                        // artist
      d: d.slice(0, 10),                  // date YYYY-MM-DD
      i: artUrl.includes('scdn.co') ? '' : artUrl,  // artUrl (scrubbed)
      p: !!p.previewUrl,                  // hasPreview (boolean only)
      y: p.type || '',                    // type (ep/lp/etc)
      r: artUrl && !artUrl.includes(SILHOUETTE) ? 1 : 0,  // hasRealArt
    };
  }).filter(p => p.t && p.a);
  const archiveOutput = { generated: new Date().toISOString(), count: archivePosts.length, posts: archivePosts };
  const archiveOutPath = new URL('../archive-index.json', import.meta.url).pathname;
  writeFileSync(archiveOutPath, JSON.stringify(archiveOutput));
  console.log(`✅ archive-index.json written: ${archivePosts.length} posts (${Math.round(JSON.stringify(archiveOutput).length / 1024)}KB)`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
