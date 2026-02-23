/**
 * BTD Post Importer — Before The Data
 * Groups tracks by album, generates write-ups, pushes to Firebase
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load env
const envPath = '/Users/clawdbot/.openclaw/workspace/scripts/.env';
const env = {};
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const FIREBASE_PROJECT = 'ar-scouting-dashboard';
const FIREBASE_KEY = env.FIREBASE_API_KEY || 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

// Spotify creds
const SPOTIFY_CLIENT_ID = 'f7dac43e65584124ac11bc702431d26d';
const SPOTIFY_CLIENT_SECRET = '0a4ec9c84f114f81a80b0508e006299e';

// --- Parse CSV ---
function parseCSV(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
    return obj;
  }).filter(r => r['Track URI'] && !r['Track URI'].startsWith('spotify:local'));
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += c;
  }
  result.push(current);
  return result;
}

// --- Spotify token ---
async function getSpotifyToken() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}

// --- Fetch Spotify track metadata ---
async function getTrackMeta(trackId, token) {
  try {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const t = await res.json();
    return {
      artUrl: t.album?.images?.[0]?.url || '',
      artUrlSm: t.album?.images?.[2]?.url || '',
      previewUrl: t.preview_url || '',
      albumArt: t.album?.images?.[0]?.url || ''
    };
  } catch { return null; }
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function trackIdFromUri(uri) {
  return uri.replace('spotify:track:', '');
}

// --- Write-ups ---
const WRITEUPS = {
  // Keyed by "artist||album" for album posts, or "artist||title" for singles
  'SLOE JACK||POUR ME A DRINK': `SLOE JACK is on a roll and this one's no exception. "Pour Me A Drink" rides a laid-back groove that somehow hits harder with every listen — there's a looseness to it that feels lived-in, like the best kind of Friday night. Off the back of the Position Music publishing deal, these guys are just getting started.`,

  'J. Cole||The Fall-Off': `Cole came back with something to prove and *The Fall-Off* delivers. This isn't a victory lap — it's Cole in a contemplative mode, working through what legacy actually means when the game has moved on without you. The features are surgical (Burna Boy, Future, Tems all pull their weight), and the production gives each track room to breathe. One of the more honest major-label rap albums in recent memory.`,

  'Dame Atlas||ACT I': `Dame Atlas is one of the most quietly compelling young voices to emerge in a while, and *ACT I* is a proper introduction. The project sits somewhere between bedroom pop and singer-songwriter territory — sparse arrangements, emotional precision, nothing wasted. There's a rawness here that feels deliberate rather than rough. Keep a close eye.`,

  'Finnegan Tui||Wildflower': `New Zealand's Finnegan Tui delivers a track that sounds like a sunrise. Acoustic-forward and quietly devastating, "Wildflower" is the kind of song that sounds better every time you hear it. On Eywa Music — a name worth remembering.`,

  'Deloyd Elze||George Jones (ft. Angela Autumn)': `Alt country that earns its reference point. Deloyd Elze and Angela Autumn share vocal duties over a production that feels timeless without being derivative. Concord Records knows what they've got here — a song that sounds like it's been around forever, in the best possible way.`,

  'Noah Kahan||The Great Divide': `Noah Kahan is operating at a different level right now and "The Great Divide" confirms it. The energy is massive — this is arena folk-rock that lands every punch. An 88 popularity score on Spotify says the rest of the world already knows it. One of the more undeniable tracks of the early year.`,

  'HARDY||McArthur': `Four generations of country on one track and it works. HARDY's production sensibility holds the whole thing together while Church, Wallen, and McGraw each bring their own weight to it. A Big Loud statement record that has genuine emotion underneath the machinery.`,

  'Tyler Ballgame||For The First Time, Again': `Tyler Ballgame on Rough Trade with a track that sounds like vintage bedroom folk. Measured, melancholy, and quietly confident — "For The First Time, Again" is exactly the kind of song this site exists for. One to watch.`,

  'Jerri||Loop': `Certified earworm. "Loop" is minimal and bouncy with a hook that just doesn't let go — this one has been on repeat since it landed. Boom Records LLC sitting on something real here.`,

  'Fred again..||scared': `Two artists operating in entirely different worlds finding a genuinely interesting middle ground. Fred again..'s stutter-house production puts Young Thug in an unusual environment and he sounds loose and alive because of it. One of the better moments from the *USB* campaign.`,

  'James Blake||Death of Love': `James Blake being James Blake — which is to say, devastating. A slow-burning piece of work that sits somewhere between pop and the avant-garde, "Death of Love" is uncomfortable in the way only the best Blake tracks are. This is some of his strongest material in a while.`,

  'Tolou||Body': `Tolou's "Body" is a tight 100 BPM groove that doesn't waste a second. Punchy, direct, and smooth — this is what we mean when we talk about a song that just works on every level. Keep tabs on Tolou.`,

  'Vory||6 AM IN HOUSTON': `Vory's *6 AM IN HOUSTON* is trap soul in its most atmospheric form. The Trae Tha Truth collab hits like the city itself — humid, heavy, moving. "What To Do" with Biirthplace shows the other side of the project: warm, unhurried, built for late nights. Distributed independently through EngineEars, and it sounds like it.`,

  'Kamal.||how the f*** does everybody else manage?': `Just the title alone. Kamal. writes from the pocket of quiet panic that most people don't know how to articulate and somehow makes it feel universal. Acoustic-forward with emotional clarity that's genuinely rare. Neighbourhood Recordings has a real one here.`,

  'Nino Uptown||No One\'s Perfect': `Nino Uptown's melodic rap sensibility hits different on "No One's Perfect." A slow groove with a lot of subtext — the kind of record that doesn't show all its cards on the first listen. One to sit with. New 11 Records.`,

  'Ingrid||What Kind of Man': `Ingrid has a tone that cuts right through. "What Kind of Man" is spare and acoustic-forward, built entirely around her voice — and that voice is more than enough. Lil Bunny Records, independent trajectory.`,

  'Peter Xan||Long Way Down': `Three artists from three different worlds creating something that doesn't belong to any of them individually. FADER Label with a record that sounds like a slow exhale — alté-adjacent and completely its own thing. Peter Xan, Connie Constance, and Obongjayar all bring something essential.`,
};

function getWriteup(artist, album, title) {
  // Try album key first
  const albumKey = `${artist}||${album}`;
  if (WRITEUPS[albumKey]) return WRITEUPS[albumKey];
  // Try title key
  const titleKey = `${artist}||${title}`;
  if (WRITEUPS[titleKey]) return WRITEUPS[titleKey];
  // Fuzzy: check if any key starts with artist
  for (const k of Object.keys(WRITEUPS)) {
    if (k.startsWith(artist + '||')) return WRITEUPS[k];
  }
  return `${artist} — "${title}". On the playlist, on repeat.`;
}

// --- Spotify embed HTML ---
function spotifyEmbed(trackId) {
  return `<div class="btd-track-embed"><iframe style="border-radius:8px" src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>`;
}

// --- Firebase write ---
async function writePost(post) {
  const fields = {};
  const toField = (v) => {
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'number') return { integerValue: String(Math.round(v)) };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toField) } };
    if (v !== null && typeof v === 'object') {
      const mapFields = {};
      for (const [mk, mv] of Object.entries(v)) mapFields[mk] = toField(mv);
      return { mapValue: { fields: mapFields } };
    }
    return { stringValue: String(v) };
  };
  for (const [k, v] of Object.entries(post)) {
    // socialLinks stored as JSON string in some places — parse it to an object if needed
    if (k === 'socialLinks' && typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        const mapFields = {};
        for (const [mk, mv] of Object.entries(parsed)) mapFields[mk] = { stringValue: mv };
        fields[k] = { mapValue: { fields: mapFields } };
      } catch { fields[k] = { stringValue: v }; }
      continue;
    }
    fields[k] = toField(v);
  }

  const docId = `btd_post_${post.id}`;
  const url = `${BASE_URL}/config/${docId}?key=${FIREBASE_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to write ${docId}:`, err.slice(0, 200));
    return false;
  }
  return true;
}

// --- Main ---
async function main() {
  const csvPath = '/Users/clawdbot/before-the-data/data/new-music-playlist.csv';
  const tracks = parseCSV(csvPath);

  // Sort by Added At descending (newest first) — already sorted but ensure it
  tracks.sort((a, b) => new Date(b['Added At']) - new Date(a['Added At']));

  // Take top 25
  const top25 = tracks.slice(0, 25);

  console.log(`Processing ${top25.length} tracks...`);

  // Get Spotify token
  const token = await getSpotifyToken();
  console.log('Spotify token:', token ? 'OK' : 'FAILED');

  // Group by album
  const albumMap = new Map(); // albumName -> [tracks]
  for (const t of top25) {
    const albumKey = `${t['Album Name']}__${t['Artist Name(s)'].split(';')[0]}`;
    if (!albumMap.has(albumKey)) albumMap.set(albumKey, []);
    albumMap.get(albumKey).push(t);
  }

  // Build posts
  const posts = [];
  const processedAlbums = new Set();

  for (const t of top25) {
    const primaryArtist = t['Artist Name(s)'].split(';')[0].trim();
    const albumKey = `${t['Album Name']}__${primaryArtist}`;

    if (processedAlbums.has(albumKey)) continue;
    processedAlbums.add(albumKey);

    const albumTracks = albumMap.get(albumKey);
    const isAlbumPost = albumTracks.length > 1;

    // Fetch Spotify metadata for primary track
    const trackId = trackIdFromUri(t['Track URI']);
    const meta = await getTrackMeta(trackId, token);
    await new Promise(r => setTimeout(r, 200)); // rate limit

    const artUrl = meta?.artUrl || '';
    const previewUrl = meta?.previewUrl || '';

    const publishedAt = t['Added At'] || new Date().toISOString();
    const tags = t['Genres'] ? t['Genres'].split(',').map(g => g.trim()).filter(Boolean).slice(0, 5) : [];

    let title, writeup, postId, trackEmbeds = '';

    if (isAlbumPost) {
      // Album post
      title = t['Album Name'];
      const writeupKey = `${primaryArtist}||${t['Album Name']}`;
      writeup = WRITEUPS[writeupKey] || getWriteup(primaryArtist, t['Album Name'], title);

      // Build track embeds HTML
      trackEmbeds = albumTracks.map(at => {
        const atId = trackIdFromUri(at['Track URI']);
        return `<div class="btd-track-item">
  <div class="btd-track-title">${at['Track Name']}</div>
  ${spotifyEmbed(atId)}
</div>`;
      }).join('\n');

      postId = slugify(`${primaryArtist}-${t['Album Name']}`).slice(0, 60);
    } else {
      // Single post
      title = t['Track Name'];
      writeup = getWriteup(primaryArtist, t['Album Name'], t['Track Name']);
      trackEmbeds = spotifyEmbed(trackId);
      postId = slugify(`${primaryArtist}-${t['Track Name']}`).slice(0, 60);
    }

    // Build full writeup HTML with embeds below
    const fullWriteup = `<p>${writeup}</p>\n<div class="btd-tracks">\n${trackEmbeds}\n</div>`;

    const post = {
      id: postId,
      slug: postId,
      title,
      artist: isAlbumPost ? t['Artist Name(s)'].split(';').slice(0, 3).map(a => a.trim()).join(', ') : t['Artist Name(s)'].split(';').map(a => a.trim()).join(', '),
      artUrl,
      previewUrl,
      writeup: fullWriteup,
      publishedAt,
      tags,
      isAlbumPost,
      trackCount: albumTracks.length,
      spotifyUri: t['Track URI'],
      label: t['Record Label'] || '',
      views: 0,
      writtenBy: { name: 'Chad Hillard', location: 'Austin' },
      socialLinks: `{"spotify":"https://open.spotify.com/track/${trackId}"}`,
    };

    posts.push(post);
    console.log(`  → [${isAlbumPost ? 'ALBUM' : 'SINGLE'}] ${post.artist} — "${post.title}" (${albumTracks.length} track${albumTracks.length > 1 ? 's' : ''})`);
  }

  console.log(`\nTotal posts to create: ${posts.length}`);
  console.log('Writing to Firebase...\n');

  let ok = 0, fail = 0;
  for (const post of posts) {
    const success = await writePost(post);
    if (success) {
      ok++;
      console.log(`  ✅ ${post.artist} — "${post.title}"`);
    } else {
      fail++;
      console.log(`  ❌ ${post.artist} — "${post.title}"`);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\nDone: ${ok} written, ${fail} failed`);
}

main().catch(console.error);
