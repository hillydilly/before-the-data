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
    // Build full writeup with Spotify embed
    const embedHtml = spotifyEmbed(post.trackId);
    post.writeup = `<p>${post.writeup}</p>\n<div class="btd-tracks">\n${embedHtml}\n</div>`;

    // Set defaults
    post.views = 0;
    post.writtenBy = { name: 'Chad Hillard', location: 'Nashville, TN' };
    post.socialLinks = { spotify: `https://open.spotify.com/track/${post.trackId}` };
    post.tags = post.tags || [];
    post.country = post.country || '';

    const success = await writePost(post);
    success ? ok++ : fail++;
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\nDone: ${ok} written, ${fail} failed`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
