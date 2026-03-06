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
// NO SPOTIFY API — Spotify blocks AI/automation aggressively. Use Apple Music + YouTube only.

const POSTS_CSV  = '/Users/clawdbot/Downloads/api_wp_wp_posts_20200416_1355PDT.csv';
const TRACKS_CSV = '/Users/clawdbot/Downloads/api_tracks_tracks_proper_20200416_1354PDT.csv';
const PROGRESS_FILE = process.argv.includes('--progress-file')
  ? process.argv[process.argv.indexOf('--progress-file') + 1]
  : '/tmp/hillydilly-import-progress.json';

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

// Spotify API removed — blocked AI/automation. Use Apple Music + YouTube only.

// Normalize strings for fuzzy matching
function normStr(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Score a Spotify track against expected artist + title
function matchScore(track, artist, title) {
  const tArtists = track.artists?.map(a => normStr(a.name)).join(' ') || '';
  const tTitle = normStr(track.name);
  const eArtist = normStr(artist);
  const eTitle = normStr(title);

  let score = 0;
  // Artist match (required for good score)
  const artistWords = eArtist.split(' ').filter(w => w.length > 1);
  const artistHits = artistWords.filter(w => tArtists.includes(w)).length;
  if (artistWords.length > 0) score += (artistHits / artistWords.length) * 50;

  // Title match
  const titleWords = eTitle.split(' ').filter(w => w.length > 1);
  const titleHits = titleWords.filter(w => tTitle.includes(w)).length;
  if (titleWords.length > 0) score += (titleHits / titleWords.length) * 50;

  return score;
}

// Spotify search removed. Apple Music is primary source for artwork + preview.

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
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=10`);
    const d = await res.json();
    const results = d.results || [];

    // Score each result — must match both artist AND title reasonably well
    const eArtist = normStr(artist);
    const eTitle = normStr(title);

    const scored = results.map(r => {
      const rArtist = normStr(r.artistName || '');
      const rTitle = normStr(r.trackName || '');
      let score = 0;
      const artistWords = eArtist.split(' ').filter(w => w.length > 1);
      if (artistWords.length > 0) {
        score += (artistWords.filter(w => rArtist.includes(w)).length / artistWords.length) * 50;
      }
      const titleWords = eTitle.split(' ').filter(w => w.length > 1);
      if (titleWords.length > 0) {
        score += (titleWords.filter(w => rTitle.includes(w)).length / titleWords.length) * 50;
      }
      return { r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Require minimum match quality
    if (!best || best.score < 40) return null;
    return best.r.previewUrl || null;
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
// Canonical genre names — Title Case, no duplicates
const GENRE_ALIASES = {
  'hip-hop': 'Hip-Hop',
  'hip hop': 'Hip-Hop',
  'hiphop': 'Hip-Hop',
  'rap': 'Rap',
  'trap': 'Rap',
  'r&b': 'R&B',
  'rnb': 'R&B',
  'soul': 'Soul',
  'neo-soul': 'Neo-Soul',
  'neosoul': 'Neo-Soul',
  'electronic': 'Electronic',
  'electro': 'Electronic',
  'edm': 'Electronic',
  'house': 'Electronic',
  'techno': 'Electronic',
  'synth': 'Electronic',
  'dance': 'Electronic',
  'pop': 'Pop',
  'indie pop': 'Indie Pop',
  'indipop': 'Indie Pop',
  'indie rock': 'Indie Rock',
  'indie': 'Indie',
  'alternative': 'Alternative',
  'alt': 'Alternative',
  'alt-pop': 'Alt Pop',
  'alt pop': 'Alt Pop',
  'folk': 'Folk',
  'indie folk': 'Indie Folk',
  'country': 'Country',
  'acoustic': 'Folk',
  'rock': 'Rock',
  'punk': 'Punk',
  'jazz': 'Jazz',
  'blues': 'Jazz',
  'classical': 'Classical',
  'orchestral': 'Classical',
  'afrobeats': 'Afrobeats',
  'afrobeat': 'Afrobeats',
  'reggae': 'Reggae',
  'latin': 'Latin',
};

function autoGenres(rawGenre, artist, title) {
  const g = (rawGenre || '').toLowerCase();
  const combined = g; // only use the stored genre field, not artist/title (too noisy)
  const genres = new Set();

  // Check raw genre field against known aliases first
  for (const [alias, canonical] of Object.entries(GENRE_ALIASES)) {
    if (combined.includes(alias)) genres.add(canonical);
  }

  // If nothing matched from genre field, do a looser content-based fallback
  if (genres.size === 0) {
    const t = (title || '').toLowerCase();
    const a = (artist || '').toLowerCase();
    const wide = `${g} ${t} ${a}`;
    if (wide.match(/hip.hop/)) genres.add('Hip-Hop');
    if (wide.match(/\brap\b|\btrap\b/)) genres.add('Rap');
    if (wide.match(/r&b|rnb/)) genres.add('R&B');
    if (wide.match(/electro|synth|\bedm\b|house|techno/)) genres.add('Electronic');
    if (wide.match(/\bpop\b/)) genres.add('Pop');
    if (wide.match(/indie/)) genres.add('Indie');
    if (wide.match(/folk|acoustic/)) genres.add('Folk');
    if (wide.match(/\brock\b/)) genres.add('Rock');
    if (wide.match(/\balt\b|alternative/)) genres.add('Alternative');
    if (wide.match(/jazz|blues/)) genres.add('Jazz');
    if (genres.size === 0) genres.add('Indie'); // default
  }

  return [...genres];
}

// ── CSV parser (handles quoted multiline fields correctly) ───────────────────
function parseCSV(filePath) {
  const content = readFileSync(filePath, { encoding: 'utf-8', flag: 'r' });
  const rows = parseCSVContent(content);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map(vals => {
    const row = {};
    headers.forEach((h, j) => row[h.trim()] = (vals[j] || '').trim());
    return row;
  });
}

// Parses full CSV content respecting quoted multiline fields
function parseCSVContent(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          // Escaped double-quote
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r' && content[i + 1] === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i += 2;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  // Push final field/row if content doesn't end with newline
  if (field || row.length > 0) {
    row.push(field);
    if (row.some(f => f !== '')) rows.push(row);
  }
  return rows;
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
      // 1. Apple Music — primary source for both artwork AND preview
      let artUrl = null;
      let previewUrl = null;

      try {
        const itunesQ = encodeURIComponent(`${artist} ${title}`);
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${itunesQ}&media=music&entity=song&limit=10`);
        const itunesData = await itunesRes.json();
        const results = itunesData.results || [];

        // Score results — need artist + title to match
        const eArtist = normStr(artist);
        const eTitle = normStr(title);
        const scored = results.map(r => {
          const rArtist = normStr(r.artistName || '');
          const rTitle = normStr(r.trackName || '');
          let score = 0;
          const aw = eArtist.split(' ').filter(w => w.length > 1);
          if (aw.length > 0) score += (aw.filter(w => rArtist.includes(w)).length / aw.length) * 50;
          const tw = eTitle.split(' ').filter(w => w.length > 1);
          if (tw.length > 0) score += (tw.filter(w => rTitle.includes(w)).length / tw.length) * 50;
          return { r, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];

        if (best && best.score >= 40) {
          const itunesArt = best.r.artworkUrl100?.replace('100x100bb', '600x600bb');
          if (itunesArt) {
            const cloudPublicId = `btd/posts/${slug}`;
            artUrl = await uploadToCloudinary(itunesArt, cloudPublicId);
            console.log(`  Apple Music art: ${artUrl ? 'uploaded' : 'FAILED'} (score: ${Math.round(best.score)})`);
          }
          previewUrl = best.r.previewUrl || null;
          if (previewUrl) console.log(`  Apple Music preview: found`);
        } else {
          console.log(`  Apple Music: no confident match (best score: ${best ? Math.round(best.score) : 0})`);
        }
      } catch (e) {
        console.log('  Apple Music lookup failed:', e.message);
      }

      // 2. YouTube fallback for preview if Apple Music had none
      if (!previewUrl) {
        console.log('  No Apple Music preview — trying YouTube...');
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
      // No Spotify trackId stored — Apple Music + YouTube only
      if (artUrl)    fields.artUrl = artUrl;
      if (previewUrl) fields.previewUrl = previewUrl;

      // Build proper writtenBy nested field via raw patch
      const patchUrl = `${FIREBASE_BASE}/${docId}?key=${FIREBASE_KEY}&` +
        ['slug','artist','title','writeup','publishedAt','isArchive','btdPostLive','genres','artUrl','previewUrl','writtenBy']
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
