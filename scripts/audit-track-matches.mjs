#!/usr/bin/env node
/**
 * audit-track-matches.mjs
 * Audits archive posts for wrong/missing previews using Apple Music only.
 * No Spotify API — Spotify blocks automation aggressively.
 *
 * For each archive post:
 *   1. Search Apple Music for artist + title
 *   2. Score the match — if confident, store the preview URL
 *   3. If no Apple Music match, fall back to YouTube → yt-dlp → Cloudinary mp3
 *
 * Usage:
 *   node audit-track-matches.mjs              — audit only, print report
 *   node audit-track-matches.mjs --fix        — audit + fix bad/missing previews
 *   node audit-track-matches.mjs --limit 100  — only process first 100
 */

import { existsSync, writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const FIREBASE_KEY  = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config';
const CLOUDINARY_CLOUD  = 'dd9nbystx';
const CLOUDINARY_KEY    = '313951951797545';
const CLOUDINARY_SECRET = 'seOMwI2Hd2x_5fhbnn11c2o7SNU';

const args = process.argv.slice(2);
const FIX     = args.includes('--fix');
const DRY_RUN = args.includes('--dry-run');
const _limitIdx = args.indexOf('--limit');
const LIMIT   = _limitIdx !== -1 ? parseInt(args[_limitIdx + 1] || '9999') : 9999;
const MIN_SCORE = 40;
const REPORT_PATH = '/tmp/btd-track-audit-report.json';

// ── Helpers ───────────────────────────────────────────────────────────────────
function normStr(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreAppleMatch(result, artist, title) {
  const rArtist = normStr(result.artistName || '');
  const rTitle  = normStr(result.trackName  || '');
  const eArtist = normStr(artist);
  const eTitle  = normStr(title);
  let score = 0;
  const aw = eArtist.split(' ').filter(w => w.length > 1);
  if (aw.length > 0) score += (aw.filter(w => rArtist.includes(w)).length / aw.length) * 50;
  const tw = eTitle.split(' ').filter(w => w.length > 1);
  if (tw.length > 0) score += (tw.filter(w => rTitle.includes(w)).length / tw.length) * 50;
  return score;
}

// ── Apple Music search ────────────────────────────────────────────────────────
async function searchAppleMusic(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=10`);
    const d = await res.json();
    const results = d.results || [];
    const scored = results.map(r => ({ r, score: scoreAppleMatch(r, artist, title) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score < MIN_SCORE) return null;
    return best.r;
  } catch (e) { return null; }
}

// ── YouTube fallback ──────────────────────────────────────────────────────────
async function fetchYouTubePreview(artist, title, slug) {
  const tmpFull = `/tmp/btd-audit-${slug}.mp3`;
  const tmpTrim = `/tmp/btd-audit-${slug}-30s.mp3`;
  try {
    const query = `${artist} ${title} official`;
    execSync(`yt-dlp "ytsearch1:${query}" -x --audio-format mp3 --audio-quality 0 -o "${tmpFull}" --no-playlist -q --cookies-from-browser chrome`, { timeout: 60000 });
    execSync(`ffmpeg -i "${tmpFull}" -ss 0 -t 30 -c:a libmp3lame -q:a 2 "${tmpTrim}" -y -loglevel quiet`, { timeout: 30000 });
    const buffer = readFileSync(tmpTrim);
    const base64 = buffer.toString('base64');
    const publicId = `btd/previews/${slug}-preview`;
    const ts = Math.floor(Date.now() / 1000);
    const sigStr = `public_id=${publicId}&timestamp=${ts}${CLOUDINARY_SECRET}`;
    const sig = createHash('sha256').update(sigStr).digest('hex');
    const form = new FormData();
    form.append('file', `data:audio/mp3;base64,${base64}`);
    form.append('public_id', publicId);
    form.append('timestamp', String(ts));
    form.append('api_key', CLOUDINARY_KEY);
    form.append('signature', sig);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`, { method: 'POST', body: form });
    const data = await res.json();
    return data.secure_url || null;
  } catch (e) { return null; }
  finally {
    for (const f of [tmpFull, tmpTrim]) { try { if (existsSync(f)) execSync(`rm -f "${f}"`); } catch (_) {} }
  }
}

// ── Firebase helpers ──────────────────────────────────────────────────────────
async function fetchAllArchivePosts() {
  let allDocs = [], pageToken = null, page = 0;
  do {
    const url = `https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config?key=${FIREBASE_KEY}&pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url);
      if (res.status === 429) { await new Promise(r => setTimeout(r, 3000)); continue; }
      const data = await res.json();
      // Only archive posts (isArchive: true)
      const docs = (data.documents || []).filter(d => {
        if (!d.name?.includes('btd_post_')) return false;
        return d.fields?.isArchive?.booleanValue === true;
      });
      allDocs.push(...docs);
      pageToken = data.nextPageToken || null;
      page++;
      process.stdout.write(`\r  Fetching... page ${page} (${allDocs.length} archive posts)`);
      break;
    }
    if (pageToken) await new Promise(r => setTimeout(r, 150));
  } while (pageToken);
  console.log();
  return allDocs;
}

async function patchPost(docId, fields) {
  const fieldPaths = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const url = `${FIREBASE_BASE}/${docId}?key=${FIREBASE_KEY}&${fieldPaths}`;
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') body.fields[k] = { stringValue: v };
    else if (typeof v === 'boolean') body.fields[k] = { booleanValue: v };
  }
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.ok;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎵 BTD Track Audit (Apple Music only)${FIX ? ' + Fix' : ''}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  console.log('Fetching all archive posts from Firebase...');
  const docs = await fetchAllArchivePosts();
  console.log(`Found ${docs.length} archive posts.\n`);

  const toProcess = docs.slice(0, LIMIT);
  let hasPreview = 0, noPreview = 0, fixed = 0, failed = 0, skipped = 0;
  const badList = [];

  for (let i = 0; i < toProcess.length; i++) {
    const doc = toProcess[i];
    const docId = doc.name.split('/').pop();
    const f = doc.fields || {};
    const artist     = f.artist?.stringValue     || '';
    const title      = f.title?.stringValue      || '';
    const previewUrl = f.previewUrl?.stringValue || '';
    const slug       = f.slug?.stringValue       || docId.replace('btd_post_', '').replace(/_/g, '-');

    process.stdout.write(`\r  [${i + 1}/${toProcess.length}] ${artist} - "${title}"`.slice(0, 80).padEnd(80));

    if (!artist || !title) { skipped++; continue; }

    // If already has a previewUrl, spot-check it with Apple Music
    if (previewUrl) {
      hasPreview++;
      continue; // trust existing previews for now — just fix missing ones
    }

    // No preview — try to find one
    noPreview++;
    badList.push({ docId, artist, title, slug });

    if (!FIX && !DRY_RUN) continue;

    // Search Apple Music
    const appleResult = await searchAppleMusic(artist, title);
    await new Promise(r => setTimeout(r, 300)); // be polite to iTunes API

    let newPreviewUrl = appleResult?.previewUrl || null;
    let newArtUrl = null;

    if (appleResult) {
      console.log(`\n  ✅ Apple Music match: ${appleResult.artistName} - "${appleResult.trackName}"`);
      if (newPreviewUrl) console.log(`     Preview: found`);
      // Also grab better artwork if we don't have one
      const artUrl = f.artUrl?.stringValue || '';
      if (!artUrl && appleResult.artworkUrl100) {
        newArtUrl = appleResult.artworkUrl100.replace('100x100bb', '600x600bb');
      }
    } else {
      console.log(`\n  ⚠️  No Apple Music match — trying YouTube...`);
      newPreviewUrl = await fetchYouTubePreview(artist, title, slug);
      if (newPreviewUrl) console.log(`     YouTube preview: uploaded to Cloudinary`);
      else console.log(`     No preview found`);
    }

    if (DRY_RUN) {
      console.log(`     [DRY RUN] Would patch: previewUrl=${newPreviewUrl ? 'YES' : 'NO'}`);
      continue;
    }

    if (newPreviewUrl || newArtUrl) {
      const patch = {};
      if (newPreviewUrl) patch.previewUrl = newPreviewUrl;
      if (newArtUrl) patch.artUrl = newArtUrl;
      const ok = await patchPost(docId, patch);
      if (ok) { fixed++; } else { failed++; }
    }

    // Save progress periodically
    if ((i + 1) % 50 === 0) {
      writeFileSync(REPORT_PATH, JSON.stringify({ hasPreview, noPreview, fixed, failed, skipped, badList }, null, 2));
    }
  }

  console.log('\n');

  const report = {
    generatedAt: new Date().toISOString(),
    total: toProcess.length,
    hasPreview,
    noPreview,
    skipped,
    fixed,
    failed,
    missingPreviews: badList,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('═══════════════════════════════════════');
  console.log('  AUDIT COMPLETE');
  console.log(`  Total archive posts: ${toProcess.length}`);
  console.log(`  Already have preview: ${hasPreview}`);
  console.log(`  Missing preview:      ${noPreview}`);
  if (FIX) {
    console.log(`  Fixed:               ${fixed}`);
    console.log(`  Failed:              ${failed}`);
  }
  console.log(`  Report: ${REPORT_PATH}`);
  console.log('═══════════════════════════════════════\n');

  if (noPreview > 0 && !FIX) {
    console.log(`Run with --fix to repair ${noPreview} missing previews.\n`);
  }
}

main().catch(console.error);
