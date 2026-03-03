// BTD-DEPLOY-CHECK-20260226
/* ============================================
   Before The Data — Firebase + Data Layer
   ============================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec",
  authDomain: "ar-scouting-dashboard.firebaseapp.com",
  projectId: "ar-scouting-dashboard",
  storageBucket: "ar-scouting-dashboard.firebasestorage.app",
  messagingSenderId: "290834477922",
  appId: "1:290834477922:web:979499b51ba18607f0f23b"
};

/* --- 8 Demo/Fallback Posts --- */
const DEMO_POSTS = [
  {
    id: "demo-1",
    slug: "bayard-the-bloodhound-moonlight",
    title: "Moonlight",
    artist: "Bayard the Bloodhound",
    artUrl: "https://picsum.photos/seed/btd1/400/400",
    previewUrl: "",
    spotifyId: "3n3Ppam7vgaVa1iaRUc9Lp",
    writeup: "<p>Bayard the Bloodhound delivers a stunning late-night anthem with \"Moonlight,\" blending ethereal synths with a driving four-on-the-floor beat. The production is lush and cinematic, pulling listeners into a dreamlike state that's impossible to shake.</p><p>Originally from Stockholm, the duo has been quietly building a catalog of twilight-hued electronic pop that feels both intimate and expansive. \"Moonlight\" is their most accomplished effort yet.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 86400 },
    country: "SE",
    tags: ["electronic", "synth-pop", "indie"],
    socialLinks: { spotify: "https://open.spotify.com", instagram: "https://instagram.com", twitter: "https://twitter.com" },
    tracks: [],
    relatedIds: ["demo-2", "demo-3", "demo-4"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 1240
  },
  {
    id: "demo-2",
    slug: "fijitrip-frail",
    title: "Frail",
    artist: "fijitrip",
    artUrl: "https://picsum.photos/seed/btd2/400/400",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d6/8b/84/d68b84c8-4fbe-9373-6eb3-8b5e561f7826/mzaf_171419210965323693.plus.aac.p.m4a",
    spotifyId: "5HCyWlXZPP0y6Gqq8TgA20",
    writeup: "<p>fijitrip's \"Frail\" is a bedroom-pop gem that wears its vulnerability on its sleeve. Gentle guitar plucks over a lo-fi beat create an atmosphere that's both melancholic and reassuring.</p><p>The LA-based artist has found a sweet spot between hyperpop tendencies and acoustic intimacy, making \"Frail\" a track that resonates on repeat listens.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 172800 },
    country: "US",
    tags: ["bedroom-pop", "lo-fi", "indie"],
    socialLinks: { spotify: "https://open.spotify.com", tiktok: "https://tiktok.com", instagram: "https://instagram.com" },
    tracks: [],
    relatedIds: ["demo-1", "demo-5", "demo-6"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 2100
  },
  {
    id: "demo-3",
    slug: "99-neighbors-television",
    title: "Television",
    artist: "99 Neighbors",
    artUrl: "https://picsum.photos/seed/btd3/400/400",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/f0/ac/c0/f0acc0a3-2745-9b87-ed88-534a28863d3b/mzaf_10205580210110560148.plus.aac.p.m4a",
    spotifyId: "2FRnf9qhLbvw8fu4IBXx78",
    writeup: "<p>99 Neighbors' debut album <em>Television</em> is a genre-bending journey through hip-hop, rock, and electronic landscapes. The Burlington, Vermont collective blurs every boundary with effortless cool.</p><p>Each track feels like flipping channels — unpredictable, sometimes chaotic, always engaging. This is the sound of a group that refuses to be put in a box.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 259200 },
    country: "US",
    tags: ["hip-hop", "alternative", "experimental"],
    socialLinks: { spotify: "https://open.spotify.com", twitter: "https://twitter.com", web: "https://99neighbors.com" },
    tracks: [
      { id: "t1", title: "Facts", artist: "99 Neighbors", previewUrl: "" },
      { id: "t2", title: "Gotta Be", artist: "99 Neighbors", previewUrl: "" },
      { id: "t3", title: "Television", artist: "99 Neighbors", previewUrl: "" }
    ],
    relatedIds: ["demo-4", "demo-7", "demo-8"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 3400
  },
  {
    id: "demo-4",
    slug: "always-never-its-over",
    title: "It's Over",
    artist: "Always Never",
    artUrl: "https://picsum.photos/seed/btd4/400/400",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d6/d1/d0/d6d1d068-9cd2-35d3-77fa-d7b030069206/mzaf_10009288922721543562.plus.aac.p.m4a",
    spotifyId: "4iV5W9uYEdYUVa79Axb7Rh",
    writeup: "<p>Always Never returns with \"It's Over,\" a shimmering alt-R&B ballad that aches with quiet intensity. The production is spacious and minimal — just enough reverb-drenched keys and a heartbeat-like kick.</p><p>London's finest export in the bedroom-soul space continues to prove that less is infinitely more.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 345600 },
    country: "GB",
    tags: ["r&b", "soul", "alternative"],
    socialLinks: { spotify: "https://open.spotify.com", instagram: "https://instagram.com" },
    tracks: [],
    relatedIds: ["demo-1", "demo-2", "demo-6"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 1870
  },
  {
    id: "demo-5",
    slug: "mall-grab-sunflower",
    title: "Sunflower",
    artist: "Mall Grab",
    artUrl: "https://picsum.photos/seed/btd5/400/400",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/81/e7/e3/81e7e329-cf22-2fe0-5caa-a04eda535b92/mzaf_513514328450626326.plus.aac.p.m4a",
    spotifyId: "6habFhsOp2NvshLv26DqMb",
    writeup: "<p>Mall Grab's \"Sunflower\" is a lo-fi house cut that feels like dancing in a sunlit warehouse at 6 AM. Grainy textures, a dusty breakbeat, and a euphoric chord progression — that's all you need.</p><p>The Australian DJ and producer has built an empire on stripped-back dancefloor anthems, and \"Sunflower\" might be his most joyful yet.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 432000 },
    country: "AU",
    tags: ["house", "lo-fi house", "electronic"],
    socialLinks: { spotify: "https://open.spotify.com", instagram: "https://instagram.com", twitter: "https://twitter.com" },
    tracks: [],
    relatedIds: ["demo-1", "demo-7", "demo-3"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 980
  },
  {
    id: "demo-6",
    slug: "joji-glimpse-of-us",
    title: "Glimpse of Us",
    artist: "Joji",
    artUrl: "https://picsum.photos/seed/btd6/400/400",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0c/53/c2/0c53c240-300a-5ddf-fc86-3a54e1b73a78/mzaf_13555682862214742934.plus.aac.p.m4a",
    spotifyId: "6xGruZOHLs39ZbVccQTuPZ",
    writeup: "<p>Joji strips everything back on \"Glimpse of Us,\" a piano-driven ballad that showcases his vocal range and emotional depth. It's raw, unfiltered, and achingly beautiful.</p><p>The track marks a departure from his more production-heavy work, proving that the Japanese-Australian artist doesn't need layers to leave an impact.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 518400 },
    country: "JP",
    tags: ["pop", "ballad", "indie"],
    socialLinks: { spotify: "https://open.spotify.com", tiktok: "https://tiktok.com", web: "https://jfrombk.com" },
    tracks: [],
    relatedIds: ["demo-2", "demo-4", "demo-8"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 5200
  },
  {
    id: "demo-7",
    slug: "fred-again-jungle",
    title: "Jungle",
    artist: "Fred again..",
    artUrl: "https://picsum.photos/seed/btd7/400/400",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/02/de/1b/02de1b3f-8ec3-0858-f3fc-35c362e968ad/mzaf_17116467804427987281.plus.aac.p.m4a",
    spotifyId: "2dHkYj7uFcVV3x1MLGE9R0",
    writeup: "<p>Fred again.. continues his streak of emotionally charged electronic music with \"Jungle.\" Chopped vocal samples swirl around a propulsive garage beat that begs to be played on a rooftop at sunset.</p><p>The British producer's ability to find profound beauty in everyday sounds remains unmatched. \"Jungle\" is a love letter to the city at night.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 604800 },
    country: "GB",
    tags: ["electronic", "garage", "uk bass"],
    socialLinks: { spotify: "https://open.spotify.com", instagram: "https://instagram.com" },
    tracks: [],
    relatedIds: ["demo-5", "demo-1", "demo-3"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 4100
  },
  {
    id: "demo-8",
    slug: "pinkpantheress-boys-a-liar",
    title: "Boy's a liar",
    artist: "PinkPantheress",
    artUrl: "https://picsum.photos/seed/btd8/400/400",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/eb/47/1f/eb471f8e-1cb7-7b2b-7933-778499bebbc9/mzaf_9607257104137505664.plus.aac.p.m4a",
    spotifyId: "5sHlShPFdGGfT2FSGYN8sK",
    writeup: "<p>PinkPantheress delivers yet another sub-two-minute masterpiece with \"Boy's a liar.\" Pitched-up vocals dance over a breakbeat-infused pop instrumental that sounds like nostalgia you can't quite place.</p><p>The British sensation's gift for brevity is radical — every second counts, and nothing overstays its welcome. Pop songwriting distilled to its purest form.</p>",
    publishedAt: { seconds: Math.floor(Date.now() / 1000) - 691200 },
    country: "GB",
    tags: ["pop", "breakbeat", "uk garage"],
    socialLinks: { spotify: "https://open.spotify.com", tiktok: "https://tiktok.com", instagram: "https://instagram.com", twitter: "https://twitter.com" },
    tracks: [],
    relatedIds: ["demo-7", "demo-6", "demo-4"],
    writtenBy: { name: "Chad Hillard", location: "Nashville, TN" },
    views: 6800
  }
];

/* --- Country code to flag emoji --- */
function countryFlag(code) {
  if (!code) return '';
  code = code === 'UK' ? 'GB' : code;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
}

/* --- Time ago --- */
function formatPostDate(ts) {
  if (!ts) return '';
  let ms;
  if (typeof ts === 'number') ms = ts * 1000;
  else if (ts && typeof ts === 'object' && ts.seconds) ms = ts.seconds * 1000;
  else if (typeof ts === 'string') ms = new Date(ts).getTime();
  else if (ts instanceof Date) ms = ts.getTime();
  else return '';
  if (!ms || isNaN(ms)) return '';
  const d = new Date(ms);
  const diffDays = Math.floor((Date.now() - ms) / 86400000);
  // Posts older than 30 days show full date
  if (diffDays > 30) {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return timeAgo(ts);
}

function timeAgo(ts) {
  if (!ts) return '';
  let ms;
  if (typeof ts === 'number') {
    ms = ts * 1000;
  } else if (ts && typeof ts === 'object' && ts.seconds) {
    ms = ts.seconds * 1000;
  } else if (typeof ts === 'string') {
    ms = new Date(ts).getTime();
  } else if (ts instanceof Date) {
    ms = ts.getTime();
  } else {
    return '';
  }
  if (!ms || isNaN(ms)) return '';
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 120) return '1 minute ago';
  if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
  if (diff < 7200) return '1 hour ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  if (diff < 172800) return '1 day ago';
  if (diff < 2592000) return Math.floor(diff / 86400) + ' days ago';
  if (diff < 5184000) return '1 month ago';
  if (diff < 31536000) return Math.floor(diff / 2592000) + ' months ago';
  const yrs = Math.floor(diff / 31536000);
  return yrs === 1 ? '1 year ago' : yrs + ' years ago';
}

/* --- Firebase / Data --- */
let db = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      firebaseReady = true;
      console.log('[BTD] Firebase initialized');
    }
  } catch (e) {
    console.warn('[BTD] Firebase init failed, using demo data:', e.message);
  }
}

/* Parse a Firestore REST document into a plain post object */
function parsePostDoc(doc) {
  const f = doc.fields || {};
  const id = doc.name?.split('/').pop() || '';

  function strVal(field) { return field?.stringValue || ''; }
  function intVal(field) { return parseInt(field?.integerValue || 0); }
  function boolVal(field) { return field?.booleanValue || false; }
  function arrVal(field) { return (field?.arrayValue?.values || []).map(v => v.stringValue || ''); }
  function mapVal(field) {
    const fields = field?.mapValue?.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([k,v]) => [k, strVal(v)]));
  }

  const slug = strVal(f.slug) || id.replace('btd_post_','');
  return {
    id: strVal(f.id) || slug,
    slug,
    title: strVal(f.title),
    artist: strVal(f.artist),
    artUrl: strVal(f.artUrl),
    artUrlSm: strVal(f.artUrlSm),
    previewUrl: strVal(f.previewUrl),
    spotifyId: strVal(f.spotifyId) || strVal(f.trackId),
    trackId: strVal(f.trackId) || strVal(f.spotifyId),
    youtubeId: strVal(f.youtubeId) || strVal(f.ytId),
    country: strVal(f.country),
    publishedAt: { seconds: (() => { const ts = f.publishedAt?.timestampValue || f.publishedAt?.stringValue; return ts ? Math.floor(new Date(ts).getTime() / 1000) : 0; })() },
    tags: arrVal(f.tags),
    genres: arrVal(f.genres) || (strVal(f.genre) ? [strVal(f.genre)] : []),
    socialLinks: mapVal(f.socialLinks),
    writeup: strVal(f.writeup),
    tracks: [],
    writtenBy: mapVal(f.writtenBy),
    views: intVal(f.views)
  };
}

/* Fetch all posts — paginates, caches in sessionStorage for 10min to avoid quota burns */
async function fetchPostsFromFirebase() {
  const CACHE_KEY = 'btd_posts_cache';
  const CACHE_TTL = 5 * 60 * 1000; // 5 min TTL

  // Check for cache bust signal from Firebase (written by BTD agent after each import)
  let bustTs = 0;
  try {
    const bustDoc = await fetch(
      `https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config/btd_cache?key=${FIREBASE_CONFIG.apiKey}`
    ).then(r=>r.json());
    bustTs = parseInt(bustDoc.fields?.lastImport?.integerValue || 0);
  } catch(e) {}

  // Serve cache only if it's fresh AND post-dates the last import signal
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, posts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL && posts?.length > 0 && ts > bustTs) {
        return posts;
      }
    }
  } catch(e) {}
  try {
    // Fetch config collection and filter btd_post_ docs client-side
    // Using pagination to get all posts efficiently
    let allDocs = [], pageToken = null;
    do {
      const url = `https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config?key=${FIREBASE_CONFIG.apiKey}&pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
      let res;
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await fetch(url);
        if (res.status !== 429) break;
        await new Promise(r => setTimeout(r, (attempt+1) * 1500));
      }
      if (!res.ok) { console.warn('[BTD] Firebase fetch failed:', res.status); break; }
      const data = await res.json();
      const docs = (data.documents || []).filter(d => d.name?.includes('btd_post_'));
      allDocs = allDocs.concat(docs);
      pageToken = data.nextPageToken || null;
      if (pageToken) await new Promise(r => setTimeout(r, 200));
    } while (pageToken);
    if (allDocs.length === 0) return null;
    const posts = allDocs.map(parsePostDoc);
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), posts })); } catch(e) {}
    return posts;
  } catch (e) {
    console.warn('[BTD] Posts fetch failed:', e.message);
    return null;
  }
}

async function fetchPosts(orderByField = 'publishedAt', direction = 'desc', limitCount = 25) {
  const livePosts = await fetchPostsFromFirebase();
  const posts = livePosts || [...DEMO_POSTS];

  if (orderByField === 'views') {
    posts.sort((a, b) => direction === 'desc' ? b.views - a.views : a.views - b.views);
  } else {
    posts.sort((a, b) => {
      const aS = typeof a.publishedAt === 'object' ? a.publishedAt.seconds : Math.floor(new Date(a.publishedAt).getTime()/1000);
      const bS = typeof b.publishedAt === 'object' ? b.publishedAt.seconds : Math.floor(new Date(b.publishedAt).getTime()/1000);
      return direction === 'desc' ? bS - aS : aS - bS;
    });
  }
  return posts.slice(0, limitCount);
}

async function fetchPostById(id) {
  // Strip btd_post_ prefix if already present (avoid double-prefix)
  const cleanId = id.replace(/^btd_post_/, '');
  // Normalize: try both dashes and underscores as doc ID separators
  const underscoreId = cleanId.replace(/-/g, '_');
  const dashId = cleanId;

  // 1. Try direct doc ID lookup (fast path)
  for (const tryId of [underscoreId, dashId]) {
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config/btd_post_${tryId}?key=${FIREBASE_CONFIG.apiKey}`
      );
      if (res.ok) {
        const doc = await res.json();
        if (doc.fields) return parsePostDoc(doc);
      }
    } catch(e) {}
  }

  // 2. Query Firestore by slug field directly (handles renamed slugs like archive posts)
  try {
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'config' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'slug' },
            op: 'EQUAL',
            value: { stringValue: cleanId }
          }
        },
        limit: 1
      }
    };
    const qRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents:runQuery?key=${FIREBASE_CONFIG.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(queryBody) }
    );
    if (qRes.ok) {
      const results = await qRes.json();
      const doc = results[0]?.document;
      if (doc?.fields) return parsePostDoc(doc);
    }
  } catch(e) {}

  // 3. Fallback: scan recent posts cache
  const all = await fetchPosts('publishedAt', 'desc', 500);
  return all.find(p => p.id === cleanId || p.slug === cleanId || p.id === id || p.slug === id) || DEMO_POSTS.find(p => p.id === id || p.slug === id) || null;
}

async function fetchPostBySlug(slug) {
  return fetchPostById(slug);
}

async function searchPosts(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const all = await fetchPosts('publishedAt', 'desc', 100);
  return all.filter(p =>
    p.artist.toLowerCase().includes(q) ||
    p.title.toLowerCase().includes(q) ||
    (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
  );
}

async function incrementViews(postId) {
  if (firebaseReady && db) {
    try {
      await db.collection('btd_posts').doc(postId).update({
        views: firebase.firestore.FieldValue.increment(1)
      });
    } catch (e) { /* ignore */ }
  }
}

/* --- Fetch Charts (from config/btd_charts) --- */
async function fetchCharts() {
  // Try Firebase REST (no auth needed for config collection)
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config/btd_charts?key=${FIREBASE_CONFIG.apiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      const tracks = data.fields?.tracks?.arrayValue?.values || [];
      return tracks.map(v => {
        const f = v.mapValue.fields;
        return {
          rank:       parseInt(f.rank?.integerValue || 0),
          title:      f.title?.stringValue || '',
          artist:     f.artist?.stringValue || '',
          spotifyId:  f.spotifyId?.stringValue || '',
          previewUrl: f.previewUrl?.stringValue || '',
          artUrl:     f.artUrl?.stringValue || '',
          artUrlSm:   f.artUrlSm?.stringValue || '',
          albumName:  f.albumName?.stringValue || '',
          ytId:       f.ytId?.stringValue || '',
          explicit:   f.explicit?.booleanValue || false,
          addedAt:    f.addedAt?.stringValue || ''
        };
      }).sort((a, b) => a.rank - b.rank);
    }
  } catch (e) {
    console.warn('[BTD] Charts fetch failed:', e.message);
  }
  return [];
}

// Init on load
document.addEventListener('DOMContentLoaded', initFirebase);
