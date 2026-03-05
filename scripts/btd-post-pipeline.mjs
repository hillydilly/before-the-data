#!/usr/bin/env node
/**
 * BTD Post Pipeline — One command, full post.
 * Usage: node btd-post-pipeline.mjs --track "https://open.spotify.com/track/XXXXX"
 * Flags: --dry-run, --skip-post, --hook-start 15, --artist-discovery, --new-music
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// ─── CONFIG ──────────────────────────────────────────────
const SPOTIFY_CLIENT_ID = 'f7dac43e65584124ac11bc702431d26d';
const SPOTIFY_CLIENT_SECRET = '0a4ec9c84f114f81a80b0508e006299e';
const ELEVENLABS_KEY = 'sk_142b311616dae6e6e354dc7855f9c9ae3aaac3c59297abc5';
const ELEVENLABS_VOICE = 'cFug7UDQGj2zkSMIMu0H';
const CLOUDINARY_CLOUD = 'dd9nbystx';
const CLOUDINARY_KEY = '313951951797545';
const CLOUDINARY_SECRET = 'seOMwI2Hd2x_5fhbnn11c2o7SNU';
const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_PROJECT = 'ar-scouting-dashboard';
const REMOTION_DIR = '/Users/clawdbot/before-the-data/remotion';
const MEDIA_DIR = '/Users/clawdbot/.openclaw/media';
const IG_CREDS_PATH = '/Users/clawdbot/.openclaw/workspace/config/instagram-credentials.json';
const FONT_PATH = '/tmp/fonts/BarlowCondensed-Bold.ttf';
const LOGO_PATH = `${REMOTION_DIR}/public/btd-logo.png`;
const WORDMARK_PATH = `${REMOTION_DIR}/public/btd-wordmark.png`;
const YT_API_KEY = 'AIzaSyADiO5fZQFpazPzRfsQlQNRrCfuH4BYiRI';

// Voice processing chain (LOCKED Take 70)
const VOICE_CHAIN = [
  'agate=threshold=0.01:range=0.1:attack=0.5:release=50',
  'highpass=f=100:p=2',
  'equalizer=f=200:t=q:w=1.2:g=-2',
  'equalizer=f=400:t=q:w=1.5:g=-3',
  'equalizer=f=2500:t=q:w=1.0:g=1.5',
  'equalizer=f=4000:t=q:w=1.2:g=2',
  'equalizer=f=8000:t=q:w=2.0:g=-3',
  'equalizer=f=10000:t=h:w=1:g=1',
  'acompressor=threshold=0.06:ratio=3.5:attack=4:release=90:makeup=2',
  'alimiter=limit=0.90:attack=0.5:release=8',
  'aecho=0.8:0.85:25:0.12',
  'alimiter=limit=0.93:attack=1:release=10'
].join(',');

// Audio mix settings (LOCKED Take 9)
const VOICE_VOLUME = 0.4;
const REFERENCE_LEVEL_DB = -18.3; // SLOE JACK song card reference
const POST_BOOST = 1.5;

// ─── ARGS ────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
const hasFlag = (name) => args.includes(`--${name}`);

const trackUrl = getArg('track') || args.find(a => a.includes('spotify.com/track/'));
const dryRun = hasFlag('dry-run');
const skipPost = hasFlag('skip-post');
const hookStartOverride = getArg('hook-start') ? parseFloat(getArg('hook-start')) : null;
const forceType = hasFlag('artist-discovery') ? 'artist-discovery' : hasFlag('new-music') ? 'new-music' : null;

if (!trackUrl) { console.error('Usage: node btd-post-pipeline.mjs --track "https://open.spotify.com/track/XXXXX"'); process.exit(1); }

const trackId = trackUrl.match(/track\/([a-zA-Z0-9]+)/)?.[1];
if (!trackId) { console.error('Could not parse track ID from URL'); process.exit(1); }

// ─── HELPERS ─────────────────────────────────────────────
function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const headers = { 'Accept-Encoding': 'identity', ...options.headers };
    const req = mod.request(url, { method: options.method || 'GET', headers }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location, options).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd.slice(0, 120)}${cmd.length > 120 ? '...' : ''}`);
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, stdio: opts.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sanitizeEmDashes(text) {
  return text.replace(/\u2014/g, ',').replace(/\u2013/g, ',');
}

async function getSpotifyToken() {
  const res = await fetchJSON('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64') },
    body: 'grant_type=client_credentials'
  });
  return res.access_token;
}

// ─── CONTEXT OBJECT ──────────────────────────────────────
const ctx = {
  trackId,
  slug: null,
  track: null,
  artist: null,
  artistData: null,
  topTracks: [],
  tier: 1,
  postType: 'artist-discovery',
  country: 'US',
  igHandle: null,
  igFollowers: null,
  igPosts: null,
  hasTikTok: false,
  tkFollowers: null,
  hasTwitter: false,
  hasSoundCloud: false,
  monthlyListeners: null,
  totalStreams: 0,
  previewUrl: null,
  artistPhotoUrl: null,
  albumArtUrl: null,
  albumArtUrlSm: null,
  videoClipPath: null,
  hookStart: hookStartOverride || 15,
  writeup: '',
  caption: '',
  narrationScripts: {},
  narrationPaths: {},
  narrationProcessed: {},
  mixedAudioPath: null,
  reelPath: null,
  coverPath: null,
  componentName: null,
};

// ─── STEP 1: SCRAPE ARTIST DATA ─────────────────────────
async function step1_scrapeData() {
  console.log('\n═══ STEP 1: Scraping artist data ═══');
  const token = await getSpotifyToken();
  
  // Track info
  const track = await fetchJSON(`https://api.spotify.com/v1/tracks/${trackId}?market=US`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (track.error) { console.error('Spotify track error:', track.error); process.exit(1); }
  
  ctx.track = { name: track.name, id: track.id, albumName: track.album?.name, releaseDate: track.album?.release_date };
  ctx.albumArtUrl = track.album?.images?.[0]?.url || '';
  ctx.albumArtUrlSm = track.album?.images?.find(i => i.width === 64)?.url || track.album?.images?.[track.album.images.length - 1]?.url || '';
  
  const mainArtist = track.artists[0];
  ctx.artist = { name: mainArtist.name, id: mainArtist.id };
  ctx.slug = slugify(`${mainArtist.name}-${track.name}`);
  ctx.componentName = mainArtist.name.replace(/[^a-zA-Z0-9]/g, '');
  
  console.log(`  Track: ${track.name} by ${mainArtist.name}`);
  console.log(`  Slug: ${ctx.slug}`);
  
  // Artist info
  const artist = await fetchJSON(`https://api.spotify.com/v1/artists/${mainArtist.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  ctx.artistData = artist;
  ctx.artistPhotoUrl = artist.images?.[0]?.url || '';
  
  // Top tracks
  const topTracks = await fetchJSON(`https://api.spotify.com/v1/artists/${mainArtist.id}/top-tracks?market=US`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  ctx.topTracks = (topTracks.tracks || []).map(t => ({ name: t.name, streams: t.popularity, id: t.id }));
  ctx.totalStreams = 0; // Will estimate from popularity
  
  // Monthly listeners (from artist page, not in API — estimate from followers)
  ctx.monthlyListeners = artist.followers?.total || 0;
  console.log(`  Followers: ${artist.followers?.total}`);
  console.log(`  Genres: ${artist.genres?.join(', ')}`);
  
  // Apple Music preview
  try {
    const itunes = await fetchJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(mainArtist.name + ' ' + track.name)}&entity=song&limit=5`);
    const match = itunes.results?.find(r => r.trackName?.toLowerCase().includes(track.name.toLowerCase().slice(0, 10)));
    ctx.previewUrl = match?.previewUrl || itunes.results?.[0]?.previewUrl || '';
    console.log(`  Apple Music preview: ${ctx.previewUrl ? 'found' : 'not found'}`);
  } catch { ctx.previewUrl = ''; }
  
  // Artist tier
  const followers = artist.followers?.total || 0;
  if (followers >= 500000) ctx.tier = 5;
  else if (followers >= 100000) ctx.tier = 4;
  else if (followers >= 20000) ctx.tier = 3;
  else if (followers >= 5000) ctx.tier = 2;
  else ctx.tier = 1;
  
  ctx.postType = forceType || (ctx.tier >= 4 ? 'new-music' : 'artist-discovery');
  console.log(`  Tier: ${ctx.tier} → ${ctx.postType}`);
  
  // Country detection from artist name/genres
  ctx.country = 'US'; // Default, can be overridden
  
  // IG handle guess
  ctx.igHandle = slugify(mainArtist.name).replace(/-/g, '');
  console.log(`  IG handle (guess): @${ctx.igHandle}`);
}

// ─── STEP 2: DOWNLOAD ASSETS ────────────────────────────
async function step2_downloadAssets() {
  console.log('\n═══ STEP 2: Downloading assets ═══');
  const publicDir = `${REMOTION_DIR}/public`;
  
  // Artist photo
  if (ctx.artistPhotoUrl) {
    const buf = await fetchBuffer(ctx.artistPhotoUrl);
    const photoPath = `${publicDir}/${ctx.slug}-hero.jpg`;
    fs.writeFileSync(photoPath, buf);
    console.log(`  Artist photo: ${photoPath} (${(buf.length/1024).toFixed(0)}KB)`);
  }
  
  // Album art
  if (ctx.albumArtUrl) {
    const buf = await fetchBuffer(ctx.albumArtUrl);
    const artPath = `${publicDir}/${ctx.slug}-art.jpg`;
    fs.writeFileSync(artPath, buf);
    console.log(`  Album art: ${artPath} (${(buf.length/1024).toFixed(0)}KB)`);
  }
  
  // Song audio from YouTube
  try {
    const searchQ = `${ctx.artist.name} ${ctx.track.name} audio`;
    const ytSearch = await fetchJSON(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQ)}&type=video&maxResults=3&key=${YT_API_KEY}`);
    const vid = ytSearch.items?.[0];
    if (vid) {
      const ytId = vid.id.videoId;
      console.log(`  YouTube: ${ytId} — ${vid.snippet.title}`);
      const songPath = `${publicDir}/${ctx.slug}-song.mp3`;
      try {
        run(`yt-dlp -x --audio-format mp3 -o "${songPath}" "https://youtube.com/watch?v=${ytId}"`, { silent: true });
        console.log(`  Song downloaded: ${songPath}`);
      } catch (e) {
        console.log(`  yt-dlp failed, trying with cookies...`);
        try {
          run(`yt-dlp -x --audio-format mp3 --cookies-from-browser chrome -o "${songPath}" "https://youtube.com/watch?v=${ytId}"`, { silent: true });
        } catch { console.log('  Song download failed — will need manual audio'); }
      }
      
      // Check for official music video
      const mvSearch = await fetchJSON(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(ctx.artist.name + ' ' + ctx.track.name + ' official video')}&type=video&maxResults=3&key=${YT_API_KEY}`);
      const mv = mvSearch.items?.find(i => i.snippet.title.toLowerCase().includes('official') || i.snippet.title.toLowerCase().includes('video'));
      if (mv) {
        const mvId = mv.id.videoId;
        console.log(`  Music video found: ${mvId}`);
        const clipPath = `${publicDir}/${ctx.slug}-clip.mp4`;
        try {
          run(`yt-dlp -f "best[height<=720]" -o "/tmp/${ctx.slug}-mv.mp4" "https://youtube.com/watch?v=${mvId}"`, { silent: true });
          // Extract 5s clip at hook point, crop to portrait
          run(`ffmpeg -y -ss ${ctx.hookStart} -i "/tmp/${ctx.slug}-mv.mp4" -t 5 -vf "crop=ih*9/16:ih,scale=1080:1920" -an "${clipPath}" 2>/dev/null`);
          ctx.videoClipPath = clipPath;
          console.log(`  Video clip: ${clipPath}`);
        } catch { console.log('  Video clip extraction failed — using photo mode'); }
      }
    }
  } catch (e) { console.log(`  YouTube search failed: ${e.message}`); }
}

// ─── STEP 3: DETECT HOOK ─────────────────────────────────
async function step3_detectHook() {
  console.log('\n═══ STEP 3: Detecting song hook ═══');
  if (hookStartOverride) {
    console.log(`  Using override: ${hookStartOverride}s`);
    return;
  }
  
  const songPath = `${REMOTION_DIR}/public/${ctx.slug}-song.mp3`;
  if (!fs.existsSync(songPath)) {
    console.log('  No song file — using default 15s');
    return;
  }
  
  try {
    // Analyze RMS levels in 2-second windows
    const output = run(`ffmpeg -i "${songPath}" -af "astats=metadata=1:reset=60,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>/dev/null`, { silent: true });
    const levels = [];
    const lines = output.split('\n');
    let frameTime = 0;
    for (const line of lines) {
      if (line.includes('RMS_level=')) {
        const val = parseFloat(line.split('=')[1]);
        if (!isNaN(val) && val > -100) {
          levels.push({ time: frameTime, level: val });
        }
      }
      if (line.includes('pts_time:')) {
        frameTime = parseFloat(line.split('pts_time:')[1]);
      }
    }
    
    if (levels.length > 0) {
      // Find loudest sustained section (skip first 5s and last 10s)
      const candidates = levels.filter(l => l.time > 5 && l.time < levels[levels.length - 1].time - 10);
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.level - a.level);
        ctx.hookStart = Math.max(0, Math.floor(candidates[0].time - 2));
        console.log(`  Detected hook at: ${ctx.hookStart}s (RMS: ${candidates[0].level.toFixed(1)} dB)`);
        return;
      }
    }
  } catch {}
  
  console.log(`  Using default: ${ctx.hookStart}s`);
}

// ─── STEP 4: WRITE CONTENT ───────────────────────────────
async function step4_writeContent() {
  console.log('\n═══ STEP 4: Writing content ═══');
  
  const name = ctx.artist.name;
  const track = ctx.track.name;
  const followers = ctx.artistData?.followers?.total || 0;
  const genres = ctx.artistData?.genres?.join(', ') || 'Unknown';
  
  // Generate writeup (template-based, can be enhanced with AI later)
  if (ctx.postType === 'artist-discovery') {
    ctx.writeup = sanitizeEmDashes(`<p>${name} is building something quietly. ${followers.toLocaleString()} Spotify followers, ${ctx.topTracks.length} tracks in the catalog, and a sound that sits somewhere in the ${genres} space. No label push, no playlist placement, just organic growth.</p>

<p>"${track}" is the entry point. The production is deliberate, the delivery is confident, and the whole package feels like an artist who knows exactly what they want to sound like. That kind of clarity is rare this early.</p>

<p>The numbers tell one story. The music tells another. This is what discovery looks like before the data catches up.</p>`);
  } else {
    ctx.writeup = sanitizeEmDashes(`<p>${name} is back with "${track}." The production picks up where their last release left off, pushing the sound forward without losing what made it work in the first place.</p>

<p>This one lands different. The mix is clean, the arrangement is tight, and there is a confidence in the delivery that comes from knowing exactly where the song needs to go.</p>

<p>Stream it. You will understand.</p>`);
  }
  
  // Generate caption
  ctx.caption = sanitizeEmDashes(`${name} just dropped "${track}" and it is exactly what we needed to hear right now. ${ctx.postType === 'artist-discovery' ? `${followers.toLocaleString()} followers, no label, no push. Just music.` : 'New heat.'}

@${ctx.igHandle}

🎧 Stream it → open.spotify.com/playlist/3tshh0beuAVZ0jHj23x41Q
🌐 beforethedata.com`);
  
  // Em dash check
  if (ctx.writeup.includes('\u2014') || ctx.caption.includes('\u2014')) {
    console.error('  ❌ Em dash detected! Fixing...');
    ctx.writeup = sanitizeEmDashes(ctx.writeup);
    ctx.caption = sanitizeEmDashes(ctx.caption);
  }
  console.log('  ✅ Write-up generated');
  console.log('  ✅ Caption generated');
  console.log(`  Caption preview: ${ctx.caption.slice(0, 100)}...`);
}

// ─── STEP 5: GENERATE NARRATION ──────────────────────────
async function step5_narration() {
  console.log('\n═══ STEP 5: Generating narration ═══');
  
  const name = ctx.artist.name;
  const track = ctx.track.name;
  const followers = ctx.artistData?.followers?.total || 0;
  
  ctx.narrationScripts = {
    beat1: 'Looking for your next favorite artist?',
    beat2: `Meet ${name}. ${ctx.postType === 'artist-discovery' ? 'Completely under the radar.' : 'Back with new heat.'}`,
    beat3: `${followers.toLocaleString()} followers on Spotify. ${ctx.artistData?.genres?.[0] || 'Music'} out of nowhere. And getting better every release.`,
    beat4: `No label. No big push. Just music finding its way to listeners on its own.`,
    cta: `Go stream ${track} right now.`
  };
  
  const narrationDir = `${REMOTION_DIR}/public/narration`;
  if (!fs.existsSync(narrationDir)) fs.mkdirSync(narrationDir, { recursive: true });
  
  const prefix = ctx.slug.slice(0, 20);
  
  for (const [key, text] of Object.entries(ctx.narrationScripts)) {
    const rawPath = `${narrationDir}/${prefix}-${key}-raw.mp3`;
    const procPath = `${narrationDir}/${prefix}-${key}-proc.mp3`;
    
    console.log(`  Generating ${key}: "${text}"`);
    
    // ElevenLabs TTS
    try {
      const response = await new Promise((resolve, reject) => {
        const postData = JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.65, similarity_boost: 0.9, style: 0.2 }
        });
        const req = https.request({
          hostname: 'api.elevenlabs.io',
          path: `/v1/text-to-speech/${ELEVENLABS_VOICE}`,
          method: 'POST',
          headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' }
        }, (res) => {
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
      
      fs.writeFileSync(rawPath, response);
      ctx.narrationPaths[key] = rawPath;
      
      // Process through voice chain
      run(`ffmpeg -y -i "${rawPath}" -af "${VOICE_CHAIN}" "${procPath}" 2>/dev/null`);
      ctx.narrationProcessed[key] = procPath;
      
      const dur = run(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${procPath}" 2>/dev/null`);
      console.log(`  ✅ ${key}: ${parseFloat(dur).toFixed(2)}s`);
    } catch (e) {
      console.log(`  ❌ ${key} failed: ${e.message}`);
    }
  }
}

// ─── STEP 6: MIX AUDIO ──────────────────────────────────
async function step6_mixAudio() {
  console.log('\n═══ STEP 6: Mixing audio ═══');
  
  const songPath = `${REMOTION_DIR}/public/${ctx.slug}-song.mp3`;
  if (!fs.existsSync(songPath)) {
    console.log('  ⚠️ No song file — skipping audio mix');
    return;
  }
  
  // Create hook version
  const hookPath = `${REMOTION_DIR}/public/${ctx.slug}-hook.mp3`;
  run(`ffmpeg -y -ss ${ctx.hookStart} -i "${songPath}" -t 35 "${hookPath}" 2>/dev/null`);
  
  // Measure song level at ~11-16s (song card section)
  const loudness = run(`ffmpeg -i "${hookPath}" -ss 11 -t 5 -af "volumedetect" -f null - 2>&1 | grep mean_volume`, { silent: true });
  const meanMatch = loudness.match(/mean_volume:\s*([-\d.]+)/);
  const songMeanDb = meanMatch ? parseFloat(meanMatch[1]) : -15;
  const diff = songMeanDb - REFERENCE_LEVEL_DB;
  const scale = Math.pow(10, -diff / 20);
  const songBase = scale * 0.15;
  const comeback = 0.137 / songBase;
  
  console.log(`  Song level: ${songMeanDb.toFixed(1)} dB, SONG_BASE: ${songBase.toFixed(4)}, COMEBACK: ${comeback.toFixed(2)}`);
  
  // Build voice timeline (30s total)
  // beat1: 0-2s, beat2: 2-5.5s, beat3: 5.5-11s, beat4: 17-23s, cta: 23-24.5s
  const prefix = ctx.slug.slice(0, 20);
  const narrationDir = `${REMOTION_DIR}/public/narration`;
  
  const voiceSegments = [
    { key: 'beat1', start: 0 },
    { key: 'beat2', start: 2.2 },
    { key: 'beat3', start: 5.5 },
    { key: 'beat4', start: 17 },
    { key: 'cta', start: 23 }
  ];
  
  // Build voice timeline with adelay
  const voiceInputs = [];
  const voiceFilters = [];
  let inputIdx = 0;
  
  for (const seg of voiceSegments) {
    const procPath = `${narrationDir}/${prefix}-${seg.key}-proc.mp3`;
    if (fs.existsSync(procPath)) {
      voiceInputs.push(`-i "${procPath}"`);
      voiceFilters.push(`[${inputIdx}]adelay=${Math.round(seg.start * 1000)}|${Math.round(seg.start * 1000)},volume=${VOICE_VOLUME}[v${inputIdx}]`);
      inputIdx++;
    }
  }
  
  if (inputIdx === 0) {
    console.log('  ⚠️ No narration files — using song only');
    ctx.mixedAudioPath = hookPath;
    return;
  }
  
  // Mix voice timeline
  const voiceTimelinePath = `${REMOTION_DIR}/public/${ctx.slug}-voice-timeline.mp3`;
  const amixInputs = Array.from({ length: inputIdx }, (_, i) => `[v${i}]`).join('');
  const voiceCmd = `ffmpeg -y ${voiceInputs.join(' ')} -filter_complex "${voiceFilters.join(';')};${amixInputs}amix=inputs=${inputIdx}:duration=longest[out]" -map "[out]" -t 30 "${voiceTimelinePath}" 2>/dev/null`;
  run(voiceCmd);
  
  // Mix voice + song with sidechain compression
  const mixedPath = `${REMOTION_DIR}/public/${ctx.slug}-mixed.mp3`;
  // Song volume envelope: starts quiet, builds, ducks under voice, returns for outro
  const songEnvelope = `volume='if(lt(t,4),${songBase}*(0.05+(t/4)*0.05),if(lt(t,8),${songBase}*(0.10+((t-4)/4)*0.15),if(lt(t,10.5),${songBase}*(0.25+((t-8)/2.5)*0.75),if(lt(t,16.5),${songBase}*1.0,if(lt(t,17),${songBase}*(1.0-((t-16.5)/0.5)*0.85),if(lt(t,24),${songBase}*0.15,if(lt(t,25.5),${songBase}*(0.15+((t-24)/1.5)*${comeback - 0.15}),${songBase}*${comeback})))))))':eval=frame`;
  
  run(`ffmpeg -y -i "${voiceTimelinePath}" -i "${hookPath}" -filter_complex "[1:a]${songEnvelope}[song];[0:a][song]amix=inputs=2:duration=first:weights=1 1[out]" -map "[out]" -t 30 "${mixedPath}" 2>/dev/null`);
  
  ctx.mixedAudioPath = mixedPath;
  console.log(`  ✅ Mixed audio: ${mixedPath}`);
}

// ─── STEP 7: GENERATE REMOTION COMPONENT ─────────────────
async function step7_component() {
  console.log('\n═══ STEP 7: Generating Remotion component ═══');
  
  const name = ctx.artist.name;
  const track = ctx.track.name;
  const compName = `BTDReel${ctx.componentName}`;
  const visualMode = ctx.videoClipPath ? 'video' : 'reveal';
  
  // Build stats array
  const stats = [];
  if (ctx.artistData?.followers?.total) stats.push({ label: 'Spotify Followers', value: `${(ctx.artistData.followers.total / 1000).toFixed(0)}K` });
  if (ctx.igFollowers) stats.push({ label: 'Instagram', value: `${(ctx.igFollowers / 1000).toFixed(1)}K` });
  if (ctx.topTracks[0]) stats.push({ label: 'Top Track', value: `${(ctx.topTracks[0].streams / 1000).toFixed(0)}K` });
  // Pad to 6 stats
  while (stats.length < 6) stats.push({ label: 'Releases', value: `${ctx.topTracks.length}` });
  
  // Build captions from narration
  const captions = [];
  // beat2 captions (frames 60-160)
  captions.push({ text: `Meet ${name}.`, start: 66, end: 100 });
  // beat3 captions (frames 160-322)
  captions.push({ text: ctx.narrationScripts.beat3?.slice(0, 50) || '', start: 170, end: 250 });
  // beat4 captions (frames 505-660)
  captions.push({ text: 'No label. No big push.', start: 515, end: 555 });
  captions.push({ text: 'Just music.', start: 560, end: 600 });
  // CTA caption
  captions.push({ text: `Go stream ${track} right now.`, start: 700, end: 745 });
  
  // Note: This generates a basic component. For production quality,
  // the component should be hand-tuned for caption timing after hearing narration.
  const componentCode = `// Auto-generated by btd-post-pipeline.mjs
// Artist: ${name} — "${track}"
import { BTDReelV3 } from './BTDReelV3';

export const ${compName} = () => (
  <BTDReelV3
    artistName="${name}"
    trackTitle="${track}"
    albumArtSrc="/${ctx.slug}-art.jpg"
    artistPhotoSrc="/${ctx.slug}-hero.jpg"
    ${ctx.videoClipPath ? `videoClipSrc="/${ctx.slug}-clip.mp4"` : ''}
    mixedAudioSrc="/${ctx.slug}-mixed.mp3"
    visualMode="${visualMode}"
    artistTier={${ctx.tier}}
    stats={${JSON.stringify(stats)}}
    captions={${JSON.stringify(captions)}}
  />
);
`;

  const compPath = `${REMOTION_DIR}/src/${compName}.tsx`;
  fs.writeFileSync(compPath, componentCode);
  ctx.componentName = compName;
  console.log(`  ✅ Component: ${compPath}`);
  
  // Note: Root.tsx registration and render would need the V3 component to accept props.
  // For now, the pipeline creates the component file. Render step uses it.
  console.log(`  ⚠️ Component generated but V3 may need props interface update for dynamic rendering`);
}

// ─── STEP 8: RENDER REEL ────────────────────────────────
async function step8_render() {
  console.log('\n═══ STEP 8: Rendering reel ═══');
  
  const outputPath = `${MEDIA_DIR}/btd-reel-${ctx.slug}.mp4`;
  
  try {
    run(`cd "${REMOTION_DIR}" && npx remotion render ${ctx.componentName} "${outputPath}" --codec h264 2>&1 | tail -5`);
    
    // Post-render boost
    const boostedPath = `${MEDIA_DIR}/btd-reel-${ctx.slug}-boost.mp4`;
    run(`ffmpeg -y -i "${outputPath}" -af "volume=${POST_BOOST}" -c:v copy "${boostedPath}" 2>/dev/null`);
    fs.renameSync(boostedPath, outputPath);
    
    ctx.reelPath = outputPath;
    console.log(`  ✅ Reel rendered: ${outputPath}`);
  } catch (e) {
    console.log(`  ❌ Render failed: ${e.message}`);
    console.log('  The component may need manual registration in Root.tsx');
    console.log(`  Try: cd ${REMOTION_DIR} && npx remotion render ${ctx.componentName}`);
  }
}

// ─── STEP 9: GENERATE COVER IMAGE (V13 LOCKED) ──────────
async function step9_cover() {
  console.log('\n═══ STEP 9: Generating cover image (V13) ═══');
  
  const coverPath = `${MEDIA_DIR}/btd-cover-${ctx.slug}.png`;
  const heroPath = `${REMOTION_DIR}/public/${ctx.slug}-hero.jpg`;
  const bMarkPath = `${REMOTION_DIR}/public/btd-b-mark.png`;
  
  if (!fs.existsSync(heroPath)) {
    console.log('  ⚠️ No hero photo — skipping cover');
    return;
  }
  
  const artistUpper = ctx.artist.name.toUpperCase().replace(/'/g, "\\'");
  const trackName = ctx.track.name.replace(/'/g, "\\'");
  
  const pyScript = `
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

W, H = 1080, 1350
hero = Image.open('${heroPath}')
scale = W / hero.width
hero = hero.resize((int(hero.width * scale), int(hero.height * scale)), Image.LANCZOS)
canvas = Image.new('RGB', (W, H), (17, 17, 17))
canvas.paste(hero, (0, 0))
photo_bottom = hero.height
for y in range(photo_bottom - 300, photo_bottom):
    progress = ((y - (photo_bottom - 300)) / 300) ** 1.5
    for x in range(W):
        r, g, b = canvas.getpixel((x, y))
        f = 1 - progress * 0.95
        canvas.putpixel((x, y), (int(r*f + 17*(1-f)), int(g*f + 17*(1-f)), int(b*f + 17*(1-f))))
canvas = ImageEnhance.Color(canvas).enhance(0.5)
canvas = ImageEnhance.Contrast(canvas).enhance(1.15)
for y in range(200):
    p = (1 - y/200) ** 2.5
    for x in range(W):
        r, g, b = canvas.getpixel((x, y))
        f = 1 - p * 0.55
        canvas.putpixel((x, y), (int(r*f), int(g*f), int(b*f)))
draw = ImageDraw.Draw(canvas)
b_mark = Image.open('${bMarkPath}').convert('RGBA').resize((90, 90), Image.LANCZOS)
pixels = b_mark.load()
for x in range(b_mark.width):
    for y in range(b_mark.height):
        r, g, b, a = pixels[x, y]
        if a > 0: pixels[x, y] = (255, 255, 255, a)
canvas.paste(b_mark, (40, 30), b_mark)
draw = ImageDraw.Draw(canvas)
barlow = ImageFont.truetype('${FONT_PATH}', 150)
barlow_t = ImageFont.truetype('${FONT_PATH}', 60)
name_y = H - 260
for dx, dy in [(2,2), (3,3)]:
    draw.text((50+dx, name_y+dy), '${artistUpper}', fill=(0,0,0), font=barlow)
draw.text((50, name_y), '${artistUpper}', fill=(255,255,255), font=barlow)
track_y = name_y + 155
for dx, dy in [(1,1), (2,2)]:
    draw.text((50+dx, track_y+dy), '"${trackName}"', fill=(0,0,0), font=barlow_t)
draw.text((50, track_y), '"${trackName}"', fill=(240,235,222), font=barlow_t)
canvas.save('${coverPath}', 'PNG')
print('Cover saved: ${coverPath}')
`;
  
  fs.writeFileSync('/tmp/btd-cover-gen.py', pyScript);
  try {
    run(`python3 /tmp/btd-cover-gen.py`);
    ctx.coverPath = coverPath;
    console.log(`  ✅ Cover: ${coverPath}`);
  } catch (e) {
    console.log(`  ❌ Cover generation failed: ${e.message}`);
  }
}

// ─── STEP 10: PUBLISH ────────────────────────────────────
async function step10_publish() {
  console.log('\n═══ STEP 10: Publishing ═══');
  
  if (dryRun) { console.log('  🏃 DRY RUN — skipping publish'); return; }
  if (skipPost) { console.log('  ⏭️ SKIP POST — skipping publish'); return; }
  
  // Upload to Cloudinary
  console.log('  Uploading to Cloudinary...');
  
  if (ctx.reelPath && fs.existsSync(ctx.reelPath)) {
    try {
      run(`curl -s -X POST "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload" -u "${CLOUDINARY_KEY}:${CLOUDINARY_SECRET}" -F "file=@${ctx.reelPath}" -F "public_id=btd/reels/${ctx.slug}" > /tmp/cl-reel.json`);
      const clReel = JSON.parse(fs.readFileSync('/tmp/cl-reel.json', 'utf8'));
      ctx.reelCloudUrl = clReel.secure_url;
      console.log(`  ✅ Reel uploaded: ${ctx.reelCloudUrl}`);
    } catch { console.log('  ❌ Reel upload failed'); }
  }
  
  if (ctx.coverPath && fs.existsSync(ctx.coverPath)) {
    try {
      run(`curl -s -X POST "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload" -u "${CLOUDINARY_KEY}:${CLOUDINARY_SECRET}" -F "file=@${ctx.coverPath}" -F "public_id=btd/covers/${ctx.slug}" > /tmp/cl-cover.json`);
      const clCover = JSON.parse(fs.readFileSync('/tmp/cl-cover.json', 'utf8'));
      ctx.coverCloudUrl = clCover.secure_url;
      console.log(`  ✅ Cover uploaded: ${ctx.coverCloudUrl}`);
    } catch { console.log('  ❌ Cover upload failed'); }
  }
  
  // Post to Instagram
  if (ctx.reelCloudUrl) {
    console.log('  Posting to Instagram...');
    const igCreds = JSON.parse(fs.readFileSync(IG_CREDS_PATH, 'utf8'));
    
    try {
      // Create container
      const containerRes = await fetchJSON(`https://graph.facebook.com/v21.0/${igCreds.igUserId}/media?media_type=REELS&video_url=${encodeURIComponent(ctx.reelCloudUrl)}${ctx.coverCloudUrl ? '&cover_url=' + encodeURIComponent(ctx.coverCloudUrl) : ''}&caption=${encodeURIComponent(ctx.caption)}&access_token=${igCreds.accessToken}`, { method: 'POST' });
      
      if (containerRes.id) {
        console.log(`  Container: ${containerRes.id}`);
        
        // Wait for processing
        let ready = false;
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 10000));
          const status = await fetchJSON(`https://graph.facebook.com/v21.0/${containerRes.id}?fields=status_code&access_token=${igCreds.accessToken}`);
          console.log(`  Status: ${status.status_code}`);
          if (status.status_code === 'FINISHED') { ready = true; break; }
          if (status.status_code === 'ERROR') { console.log('  ❌ IG processing error'); break; }
        }
        
        if (ready) {
          const pub = await fetchJSON(`https://graph.facebook.com/v21.0/${igCreds.igUserId}/media_publish?creation_id=${containerRes.id}&access_token=${igCreds.accessToken}`, { method: 'POST' });
          console.log(`  ✅ Instagram: ${pub.id}`);
          ctx.igPostId = pub.id;
        }
      }
    } catch (e) { console.log(`  ❌ IG post failed: ${e.message}`); }
    
    // Cross-post to Facebook
    try {
      const fbRes = await fetchJSON(`https://graph.facebook.com/v21.0/${igCreds.fbPageId}/videos?file_url=${encodeURIComponent(ctx.reelCloudUrl)}&description=${encodeURIComponent(ctx.caption)}&access_token=${igCreds.accessToken}`, { method: 'POST' });
      console.log(`  ✅ Facebook: ${fbRes.id}`);
    } catch (e) { console.log(`  ❌ FB post failed: ${e.message}`); }
  }
  
  // Create Firebase doc
  console.log('  Creating Firebase doc...');
  const doc = {
    fields: {
      id: { stringValue: ctx.slug },
      slug: { stringValue: ctx.slug },
      title: { stringValue: ctx.track.name },
      artist: { stringValue: ctx.artist.name },
      artUrl: { stringValue: ctx.albumArtUrl },
      artUrlSm: { stringValue: ctx.albumArtUrlSm },
      artistImgUrl: { stringValue: ctx.artistPhotoUrl },
      country: { stringValue: ctx.country },
      genre: { stringValue: ctx.artistData?.genres?.[0] || 'Unknown' },
      genres: { arrayValue: { values: (ctx.artistData?.genres || ['Unknown']).map(g => ({ stringValue: g })) } },
      tags: { arrayValue: { values: [
        { stringValue: ctx.artistData?.genres?.[0]?.toLowerCase() || 'music' },
        { stringValue: ctx.postType }
      ] } },
      trackId: { stringValue: ctx.trackId },
      previewUrl: { stringValue: ctx.previewUrl || '' },
      publishedAt: { stringValue: new Date().toISOString() },
      views: { integerValue: '0' },
      writeup: { stringValue: ctx.writeup },
      caption: { stringValue: ctx.caption },
      postType: { stringValue: ctx.postType },
      socialLinks: { mapValue: { fields: {
        spotify: { stringValue: `https://open.spotify.com/track/${ctx.trackId}` }
      } } },
      writtenBy: { mapValue: { fields: {
        name: { stringValue: 'Chad Hillard' },
        location: { stringValue: 'Nashville, TN' }
      } } }
    }
  };
  
  try {
    const fbUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/config/btd_post_${ctx.slug}?key=${FIREBASE_KEY}`;
    await fetchJSON(fbUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: doc });
    console.log(`  ✅ Firebase: btd_post_${ctx.slug}`);
  } catch (e) { console.log(`  ❌ Firebase failed: ${e.message}`); }
}

// ─── MAIN ────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  BTD POST PIPELINE                   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`Track: ${trackUrl}`);
  console.log(`Flags: ${dryRun ? 'DRY RUN' : ''} ${skipPost ? 'SKIP POST' : ''} ${forceType || 'auto-type'}`);
  
  const start = Date.now();
  
  await step1_scrapeData();
  await step2_downloadAssets();
  await step3_detectHook();
  await step4_writeContent();
  await step5_narration();
  await step6_mixAudio();
  await step7_component();
  await step8_render();
  await step9_cover();
  await step10_publish();
  
  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  PIPELINE COMPLETE                   ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  Slug: ${ctx.slug}`);
  console.log(`  Type: ${ctx.postType} (Tier ${ctx.tier})`);
  console.log(`  Reel: ${ctx.reelPath || 'N/A'}`);
  console.log(`  Cover: ${ctx.coverPath || 'N/A'}`);
  console.log(`  Site: https://beforethedata.com/${ctx.slug}`);
  console.log(`  Time: ${elapsed} min`);
}

main().catch(e => { console.error('Pipeline error:', e); process.exit(1); });
