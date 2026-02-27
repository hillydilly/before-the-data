// Backfill genres as array — multiple genres per post
import https from 'https';

const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';

async function fbFetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ ok: res.statusCode < 300, json: () => JSON.parse(data) }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// Returns array of matching genres — can be multiple
function inferGenres(artist, title, writeup) {
  const text = `${artist} ${title} ${writeup}`.toLowerCase();
  const genres = new Set();

  // Hip-Hop
  if (/\b(rap|hip.?hop|trap|drill|bars|verse|freestyle|flow|hook|808|lyrical|rhyme|feature)\b/.test(text)) genres.add('Hip-Hop');
  // R&B
  if (/\b(r&b|rnb|neo.?soul|soul|falsetto|groove|slow jam|sensual|vocal|melisma)\b/.test(text)) genres.add('R&B');
  // Indie
  if (/\b(indie|bedroom pop|dream pop|shoegaze|lo.?fi|lo fi|bedroom|diy|4-track|cassette)\b/.test(text)) genres.add('Indie');
  // Electronic
  if (/\b(electronic|edm|synth|house|techno|club|bass music|produced|production|beats|instrumental)\b/.test(text)) genres.add('Electronic');
  // Pop
  if (/\b(pop|catchy|chorus|hook|radio|mainstream|anthemic|earworm|single)\b/.test(text)) genres.add('Pop');
  // Country
  if (/\b(country|twang|nashville|honky.?tonk|western|bluegrass|americana|boot)\b/.test(text)) genres.add('Country');
  // Folk
  if (/\b(folk|acoustic|singer.?songwriter|fingerpick|storytell|narrative|ballad)\b/.test(text)) genres.add('Folk');
  // Rock
  if (/\b(rock|guitar|riff|distortion|grunge|metal|band|drums|live band)\b/.test(text)) genres.add('Rock');
  // Punk
  if (/\b(punk|post.?punk|hardcore|emo|screamo|raw|noise)\b/.test(text)) genres.add('Punk');
  // Jazz
  if (/\b(jazz|blues|swing|brass|horn|piano jazz|bebop|improvise)\b/.test(text)) genres.add('Jazz');
  // Afrobeats
  if (/\b(afrobeats|afropop|amapiano|highlife|naija|afro|dancehall|caribbean)\b/.test(text)) genres.add('Afrobeats');
  // Latin
  if (/\b(latin|reggaeton|salsa|cumbia|dembow|spanish|bachata)\b/.test(text)) genres.add('Latin');
  // Alt (catch-all only if nothing else matched)
  if (genres.size === 0) genres.add('Alt');

  return [...genres];
}

async function getAllPosts() {
  let allDocs = [], pageToken = null;
  do {
    const url = `${FIREBASE_BASE}/config?key=${FIREBASE_KEY}&pageSize=500${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fbFetch(url);
    const data = await res.json();
    const docs = (data.documents || []).filter(d => d.name?.includes('btd_post_'));
    allDocs = allDocs.concat(docs);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return allDocs;
}

async function patchGenres(slug, genres) {
  // Store primary genre as string + all genres as array
  const url = `${FIREBASE_BASE}/config/btd_post_${slug}?key=${FIREBASE_KEY}&updateMask.fieldPaths=genre&updateMask.fieldPaths=genres`;
  const res = await fbFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        genre: { stringValue: genres[0] }, // primary (for backward compat)
        genres: { arrayValue: { values: genres.map(g => ({ stringValue: g })) } }
      }
    })
  });
  return res.ok;
}

async function main() {
  console.log('Fetching all posts...');
  const posts = await getAllPosts();
  console.log(`Found ${posts.length} posts`);

  let done = 0;
  const genreCounts = {};

  for (const doc of posts) {
    const f = doc.fields || {};
    const slug = f.slug?.stringValue || doc.name.split('/').pop().replace('btd_post_', '');
    const artist = f.artist?.stringValue || '';
    const title = f.title?.stringValue || '';
    const writeup = (f.writeup?.stringValue || '').replace(/<[^>]+>/g, ' ');

    const genres = inferGenres(artist, title, writeup);
    genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1);

    const ok = await patchGenres(slug, genres);
    if (ok) {
      done++;
      if (done % 30 === 0) console.log(`[${done}/${posts.length}]`);
    }
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\nDone: ${done}/${posts.length}`);
  console.log('Genre counts:', JSON.stringify(genreCounts, null, 2));
}

main().catch(console.error);
