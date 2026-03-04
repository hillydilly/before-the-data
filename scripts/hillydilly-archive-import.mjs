#!/usr/bin/env node
/**
 * Hillydilly Archive Import Script
 * Imports posts from CSV files into BTD Firebase as archive posts.
 *
 * Usage:
 *   node hillydilly-archive-import.mjs [--batch 50] [--year 2016] [--author 1] [--dry-run]
 *
 * Options:
 *   --batch N     Number of posts to process (default: 25)
 *   --year YYYY   Only import posts from this year
 *   --author ID   Only import posts from this author ID
 *   --dry-run     Print what would be imported without writing to Firebase
 *   --offset N    Skip first N matched posts (for resuming)
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { parse } from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const FIREBASE_KEY  = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config';
const CLOUDINARY_CLOUD  = 'dd9nbystx';
const CLOUDINARY_KEY    = '313951951797545';
const CLOUDINARY_SECRET = 'seOMwI2Hd2x_5fhbnn11c2o7SNU';
const SPOTIFY_CLIENT_ID     = 'f7dac43e65584124ac11bc702431d26d';
const SPOTIFY_CLIENT_SECRET = '0a4ec9c84f114f81a80b0508e006299e';

const POSTS_CSV  = '/Users/clawdbot/Downloads/api_wp_wp_posts_20200416_1355PDT.csv';
const TRACKS_CSV = '/Users/clawdbot/Downloads/api_tracks_tracks_proper_20200416_1354PDT.csv';
const PROGRESS_FILE = '/tmp/hillydilly-import-progress.json';

// ── Author map ────────────────────────────────────────────────────────────────
const AUTHOR_MAP = {
  '1':     { name: 'Chad Hillard',       location: 'Nashville, TN' },
  '4':     { name: 'Justin Lowes',       location: 'Edmonton, Canada' },
  '88906': { name: 'Taylor Rummel',      location: 'Grand Rapids, MI' },
  '88919': { name: 'Cole Ryan',          location: 'Pittsburgh, PA' },
  '88920': { name: 'Nishant Karvinkop', location: 'Brooklyn, NY' },
  '91364': { name: 'Michael Enwright',   location: 'Boston, MA' },
  '88892': { name: 'Brendan Little',     location: 'Vancouver, BC' },
};

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const BATCH    = parseInt(getArg('--batch', '25'));
const YEAR     = getArg('--year', null);
const AUTHOR   = getArg('--author', null);
const DRY_RUN  = args.includes('--dry-run');
const OFFSET   = parseInt(getArg('--offset', '0'));

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\xa0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugToDocId(slug) {
  return 'btd_post_' + slug.replace(/-/g, '_');
}

async function safePatch(docId, fields) {
  const fieldPaths = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const url = `${FIREBASE_BASE}/${docId}?key=${FIREBASE_KEY}&${fieldPaths}`;
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string')  body.fields[k] = { stringValue: v };
    else if (typeof v === 'boolean') body.fields[k] = { booleanValue: v };
    else if (typeof v === 'number')  body.fields[k] = { integerValue: String(v) };
    else if (Array.isArray(v))  body.fields[k] = { arrayValue: { values: v.map(i => ({ stringValue: i })) } };
    else if (v instanceof Date) body.fields[k] = { timestampValue: v.toISOString() };
  }
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Firebase PATCH failed: ${await res.text()}`);
  return res.json();
}

async function docExists(docId) {
  const res = await fetch(`${FIREBASE_BASE}/${docId}?key=${FIREBASE_KEY}`);
  const d = await res.json();
  return !!d.fields;
}

// ── Spotify ───────────────────────────────────────────────────────────────────
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const d = await res.json();
  spotifyToken = d.access_token;
  spotifyTokenExpiry = Date.now() + (d.expires_in - 60) * 1000;
  return spotifyToken;
}

async function searchSpotify(artist, title) {
  try {
    const token = await getSpotifyToken();
    const q = encodeURIComponent(`track:${title} artist:${artist}`);
    const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    const tracks = d.tracks?.items || [];
    if (!tracks.length) {
      // Fallback: less strict search
      const q2 = encodeURIComponent(`${artist} ${title}`);
      const res2 = await fetch(`https://api.spotify.com/v1/search?q=${q2}&type=track&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d2 = await res2.json();
      return d2.tracks?.items?.[0] || null;
    }
    return tracks[0];
  } catch (e) {
    return null;
  }
}

// ── Cloudinary ────────────────────────────────────────────────────────────────
async function uploadToCloudinary(imageUrl, publicId) {
  try {
    // Download image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch image');
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

    const ts = Math.floor(Date.now() / 1000);
    const sigStr = `public_id=${publicId}&timestamp=${ts}${CLOUDINARY_SECRET}`;
    const sig = createHash('sha256').update(sigStr).digest('hex');

    const form = new FormData();
    form.append('file', `data:${mimeType};base64,${base64}`);
    form.append('public_id', publicId);
    form.append('timestamp', String(ts));
    form.append('api_key', CLOUDINARY_KEY);
    form.append('signature', sig);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST', body: form,
    });
    const d = await res.json();
    return d.secure_url || null;
  } catch (e) {
    return null;
  }
}

async function uploadAudioToCloudinary(filePath, publicId) {
  try {
    const buffer = readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const ts = Math.floor(Date.now() / 1000);
    const sigStr = `public_id=${publicId}&timestamp=${ts}${CLOUDINARY_SECRET}`;
    const sig = createHash('sha256').update(sigStr).digest('hex');

    const form = new FormData();
    form.append('file', `data:audio/mp3;base64,${base64}`);
    form.append('public_id', publicId);
    form.append('timestamp', String(ts));
    form.append('api_key', CLOUDINARY_KEY);
    form.append('signature', sig);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`, {
      method: 'POST', body: form,
    });
    const d = await res.json();
    return d.secure_url || null;
  } catch (e) {
    return null;
  }
}

// ── Apple Music preview ───────────────────────────────────────────────────────
async function fetchAppleMusicPreview(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=5`);
    const d = await res.json();
    const match = (d.results || []).find(r =>
      r.trackName?.toLowerCase() === title.toLowerCase() &&
      r.artistName?.toLowerCase().includes(artist.toLowerCase().split(' ')[0].toLowerCase())
    ) || d.results?.[0];
    return match?.previewUrl || null;
  } catch (e) {
    return null;
  }
}

// ── YouTube fallback preview ──────────────────────────────────────────────────
async function fetchYouTubePreview(artist, title, slug) {
  const tmpFull = `/tmp/btd-preview-${slug}.mp3`;
  const tmpTrim = `/tmp/btd-preview-${slug}-30s.mp3`;
  try {
    const query = `${artist} ${title} official`;
    execSync(`yt-dlp "ytsearch1:${query}" -x --audio-format mp3 --audio-quality 0 -o "${tmpFull}" --no-playlist -q`, { timeout: 60000 });
    execSync(`ffmpeg -i "${tmpFull}" -ss 0 -t 30 -c:a libmp3lame -q:a 2 "${tmpTrim}" -y -loglevel quiet`, { timeout: 30000 });
    const publicId = `btd/previews/${slug}-preview`;
    const url = await uploadAudioToCloudinary(tmpTrim, publicId);
    return url;
  } catch (e) {
    return null;
  } finally {
    [tmpFull, tmpTrim].forEach(f => { try { if (existsSync(f)) unlinkSync(f); } catch (_) {} });
  }
}

// ── Genre auto-assign ─────────────────────────────────────────────────────────
function autoGenres(rawGenre, artist, title) {
  const g = (rawGenre || '').toLowerCase();
  const t = (title || '').toLowerCase();
  const a = (artist || '').toLowerCase();
  const combined = `${g} ${t} ${a}`;
  const genres = [];
  if (combined.match(/hip.hop|rap|trap/)) genres.push('hip-hop');
  if (combined.match(/r&b|rnb|soul/)) genres.push('r&b');
  if (combined.match(/electro|synth|dance|edm|house|techno/)) genres.push('electronic');
  if (combined.match(/pop/)) genres.push('pop');
  if (combined.match(/indie/)) genres.push('indie');
  if (combined.match(/folk|country|acoustic/)) genres.push('folk');
  if (combined.match(/rock|alt/)) genres.push('rock');
  if (combined.match(/jazz|blues/)) genres.push('jazz');
  if (combined.match(/classical|orchestral/)) genres.push('classical');
  if (!genres.length) genres.push('indie'); // default
  return [...new Set(genres)];
}

// ── CSV parser (handles quoted fields with commas) ────────────────────────────
function parseCSV(filePath) {
  const content = readFileSync(filePath, { encoding: 'utf-8', flag: 'r' });
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => row[h] = vals[j] || '');
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Loading CSVs...');
  const wpPosts = parseCSV(POSTS_CSV);
  const tracks  = parseCSV(TRACKS_CSV);

  // Index tracks by slug
  const tracksBySlug = {};
  for (const t of tracks) {
    const slug = (t.post_url || '').replace(/^\/|\/$/g, '').split('/').pop();
    if (slug) tracksBySlug[slug] = t;
  }

  // Roundup/non-track post title patterns to skip
  const SKIP_PATTERNS = [
    /^songs of the week/i,
    /^tracks of the week/i,
    /^best of \d{4}/i,
    /^playlist:/i,
    /^mixtape:/i,
    /^roundup:/i,
    /^weekly wrap/i,
    /^new music friday/i,
    /^featured playlist/i,
  ];

  // Filter posts
  let posts = wpPosts.filter(p =>
    p.post_type === 'post' &&
    p.post_status === 'publish' &&
    p.post_parent === '0' &&
    !SKIP_PATTERNS.some(rx => rx.test(p.post_title))
  );

  if (YEAR)   posts = posts.filter(p => p.post_date?.startsWith(YEAR));
  if (AUTHOR) posts = posts.filter(p => p.post_author === AUTHOR);

  // Sort oldest first
  posts.sort((a, b) => a.post_date < b.post_date ? -1 : 1);

  // Load progress
  let progress = {};
  if (existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')); } catch (_) {}
  }

  // Skip already-done slugs
  const pending = posts.filter(p => !progress[p.post_name]);
  const batch = pending.slice(OFFSET, OFFSET + BATCH);

  console.log(`Total published posts: ${posts.length}`);
  console.log(`Already imported: ${Object.keys(progress).length}`);
  console.log(`Pending: ${pending.length}`);
  console.log(`This batch: ${batch.length} posts\n`);

  let imported = 0, skipped = 0, errors = 0;

  for (const post of batch) {
    const slug = post.post_name;
    const docId = slugToDocId(slug);
    const track = tracksBySlug[slug];

    const artist = track?.artist || post.post_title?.split(' - ')[0]?.trim() || '';
    const titleRaw = track?.title || post.post_title?.split(' - ').slice(1).join(' - ').replace(/^"|"$/g, '').trim() || post.post_title;
    const title = titleRaw.replace(/^[""]|[""]$/g, '').trim();
    const writeup = stripHtml(post.post_content || '');
    const publishedAt = new Date(post.post_date_gmt || post.post_date);
    const authorInfo = AUTHOR_MAP[post.post_author] || { name: 'Hillydilly Staff', location: '' };
    const rawGenre = track?.genre || '';

    console.log(`\n[${imported + skipped + errors + 1}/${batch.length}] ${artist} - "${title}"`);
    console.log(`  slug: ${slug} | author: ${authorInfo.name} | date: ${post.post_date.slice(0,10)}`);

    if (!artist || !title) {
      console.log('  SKIP: missing artist or title');
      skipped++; continue;
    }

    if (!DRY_RUN && await docExists(docId)) {
      console.log('  SKIP: already in Firebase');
      progress[slug] = 'skipped';
      skipped++; continue;
    }

    if (DRY_RUN) {
      console.log('  DRY RUN — would import');
      imported++; continue;
    }

    try {
      // 1. Spotify search
      let trackId = null;
      let artUrl = null;
      const spotifyTrack = await searchSpotify(artist, title);
      if (spotifyTrack) {
        trackId = spotifyTrack.id;
        const imgUrl = spotifyTrack.album?.images?.[0]?.url;
        if (imgUrl) {
          const cloudPublicId = `btd/posts/${slug}`;
          artUrl = await uploadToCloudinary(imgUrl, cloudPublicId);
          console.log(`  Spotify: ${trackId} | art: ${artUrl ? 'uploaded' : 'FAILED'}`);
        }
      } else {
        console.log('  Spotify: no match found');
      }

      // 2. Apple Music preview
      let previewUrl = await fetchAppleMusicPreview(artist, title);
      if (previewUrl) {
        console.log('  Apple Music preview: found');
      } else {
        console.log('  Apple Music preview: not found, trying YouTube...');
        previewUrl = await fetchYouTubePreview(artist, title, slug);
        if (previewUrl) console.log(`  YouTube preview: uploaded`);
        else console.log('  Preview: NONE found');
      }

      // 3. Genres
      const genres = autoGenres(rawGenre, artist, title);

      // 4. Build post object and write to Firebase
      const fields = {
        slug,
        artist,
        title,
        writeup,
        publishedAt,
        isArchive: true,
        btdPostLive: false,
        genres,
        writtenBy_name: authorInfo.name,
        writtenBy_location: authorInfo.location,
      };
      if (trackId)   fields.trackId = trackId;
      if (artUrl)    fields.artUrl = artUrl;
      if (previewUrl) fields.previewUrl = previewUrl;

      // Build proper writtenBy nested field via raw patch
      const patchUrl = `${FIREBASE_BASE}/${docId}?key=${FIREBASE_KEY}&` +
        ['slug','artist','title','writeup','publishedAt','isArchive','btdPostLive','genres','trackId','artUrl','previewUrl','writtenBy']
        .map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');

      const body = {
        fields: {
          slug: { stringValue: slug },
          artist: { stringValue: artist },
          title: { stringValue: title },
          writeup: { stringValue: writeup },
          publishedAt: { timestampValue: publishedAt.toISOString() },
          isArchive: { booleanValue: true },
          btdPostLive: { booleanValue: false },
          genres: { arrayValue: { values: genres.map(g => ({ stringValue: g })) } },
          writtenBy: { mapValue: { fields: {
            name: { stringValue: authorInfo.name },
            ...(authorInfo.location ? { location: { stringValue: authorInfo.location } } : {}),
          }}},
          ...(trackId   ? { trackId:    { stringValue: trackId } } : {}),
          ...(artUrl    ? { artUrl:     { stringValue: artUrl } } : {}),
          ...(previewUrl ? { previewUrl: { stringValue: previewUrl } } : {}),
        }
      };

      const res = await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.log(`  Firebase PATCH failed: ${err.slice(0, 100)}`);
        errors++; continue;
      }

      console.log(`  IMPORTED`);
      progress[slug] = 'done';
      imported++;

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 300));

    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      errors++;
    }
  }

  // Save progress
  if (!DRY_RUN) writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  console.log(`\n=============================`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Errors:   ${errors}`);
  console.log(`Progress saved to ${PROGRESS_FILE}`);
  if (!DRY_RUN) console.log('\nRun "node scripts/build-posts-json.mjs" to rebuild posts.json when ready.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
