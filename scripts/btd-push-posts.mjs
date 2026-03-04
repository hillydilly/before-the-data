/**
 * btd-push-posts.mjs
 * Reads complete post objects (with writeups) from stdin JSON, pushes to Firebase.
 * Usage: echo '[{...}]' | node btd-push-posts.mjs
 */

const FIREBASE_PROJECT = 'ar-scouting-dashboard';
const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

function spotifyEmbed(trackId) {
  return `<div class="btd-track-embed"><iframe style="border-radius:8px" src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>`;
}

function toField(v) {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { integerValue: String(Math.round(v)) };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toField) } };
  if (v !== null && typeof v === 'object') {
    const mapFields = {};
    for (const [mk, mv] of Object.entries(v)) mapFields[mk] = toField(mv);
    return { mapValue: { fields: mapFields } };
  }
  return { stringValue: String(v ?? '') };
}

async function fetchAppleMusicPreview(artist, title) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=5`);
    const data = await res.json();
    const match = (data.results || []).find(r =>
      r.trackName?.toLowerCase() === title.toLowerCase() &&
      r.artistName?.toLowerCase().includes(artist.toLowerCase().split(' ')[0])
    ) || data.results?.[0];
    return match?.previewUrl || null;
  } catch (e) {
    return null;
  }
}

async function fetchYouTubePreview(artist, title, slug) {
  // Fallback: yt-dlp first 30s → Cloudinary hosted mp3
  const { execSync } = await import('child_process');
  const { existsSync, unlinkSync } = await import('fs');
  const tmpFull = `/tmp/btd-preview-${slug}.mp3`;
  const tmpTrim = `/tmp/btd-preview-${slug}-30s.mp3`;
  try {
    const query = `${artist} ${title} official`;
    execSync(`yt-dlp "ytsearch1:${query}" -x --audio-format mp3 --audio-quality 0 -o "${tmpFull}" --no-playlist -q`, { timeout: 60000 });
    execSync(`ffmpeg -i "${tmpFull}" -ss 0 -t 30 -c:a libmp3lame -q:a 2 "${tmpTrim}" -y -loglevel quiet`, { timeout: 30000 });

    const { createReadStream, readFileSync } = await import('fs');
    const fileBuffer = readFileSync(tmpTrim);
    const base64 = fileBuffer.toString('base64');
    const ts = Math.floor(Date.now() / 1000);
    const publicId = `btd/previews/${slug}-preview`;
    const { createHash } = await import('crypto');
    const sigStr = `public_id=${publicId}&timestamp=${ts}seOMwI2Hd2x_5fhbnn11c2o7SNU`;
    const sig = createHash('sha256').update(sigStr).digest('hex');

    const form = new FormData();
    form.append('file', `data:audio/mp3;base64,${base64}`);
    form.append('public_id', publicId);
    form.append('timestamp', String(ts));
    form.append('api_key', '313951951797545');
    form.append('signature', sig);

    const uploadRes = await fetch('https://api.cloudinary.com/v1_1/dd9nbystx/raw/upload', { method: 'POST', body: form });
    const uploadData = await uploadRes.json();

    // Cleanup
    [tmpFull, tmpTrim].forEach(f => { try { unlinkSync(f); } catch (e) {} });

    if (uploadData.secure_url) return uploadData.secure_url;
    return null;
  } catch (e) {
    [tmpFull, tmpTrim].forEach(f => { try { unlinkSync(f); } catch (e) {} });
    return null;
  }
}

async function writePost(post) {
  const fields = {};
  for (const [k, v] of Object.entries(post)) {
    if (v === undefined || v === null) continue;
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
    console.error(`❌ ${post.artist} — "${post.title}": ${err.slice(0, 150)}`);
    return false;
  }
  console.log(`✅ ${post.artist} — "${post.title}"`);
  return true;
}

async function main() {
  // Read JSON from stdin
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const posts = JSON.parse(input);

  console.log(`Pushing ${posts.length} posts to Firebase...`);
  let ok = 0, fail = 0;

  for (const post of posts) {
    // writeup stored as-is; Spotify embed is injected client-side by app.js via trackId

    // Fetch Apple Music preview URL if not already set
    if (!post.previewUrl && post.artist && post.title) {
      post.previewUrl = await fetchAppleMusicPreview(post.artist, post.title);
      if (post.previewUrl) {
        console.log(`  🎵 Apple Music preview: ${post.artist} — "${post.title}"`);
      } else {
        // Fallback: YouTube → yt-dlp → 30s trim → Cloudinary
        console.log(`  🎵 No Apple Music preview, trying YouTube fallback for ${post.artist} — "${post.title}"...`);
        post.previewUrl = await fetchYouTubePreview(post.artist, post.title, post.id || post.slug);
        if (post.previewUrl) console.log(`  🎵 YouTube preview uploaded: ${post.previewUrl}`);
        else console.log(`  ⚠️  No preview found for ${post.artist} — "${post.title}"`);
      }
    }

    // Set defaults
    post.views = 0;
    post.writtenBy = { name: 'Chad Hillard', location: 'Nashville, TN' };
    post.socialLinks = { spotify: `https://open.spotify.com/track/${post.trackId}` };
    post.tags = post.tags || [];
    post.country = post.country || '';

    // Ensure genres array exists (required for genre pills on site)
    if (!post.genres || !post.genres.length) {
      const skipTags = ['new-music','artist-discovery','featured','editorial','scouting','new-release'];
      const genreTags = (post.tags || []).filter(t => !skipTags.includes(t.toLowerCase()))
        .map(t => t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      post.genres = genreTags.length ? genreTags : ['Indie'];
      post.genre = post.genres[0];
    }

    const success = await writePost(post);
    success ? ok++ : fail++;
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\nDone: ${ok} written, ${fail} failed`);

  // Rebuild static posts.json after every import so the site loads fast
  if (ok > 0) {
    console.log('\nRebuilding posts.json...');
    const { execSync } = await import('child_process');
    try {
      execSync(`node ${new URL('./build-posts-json.mjs', import.meta.url).pathname}`, { stdio: 'inherit' });
    } catch (e) {
      console.error('⚠️  posts.json rebuild failed:', e.message);
    }
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
