/* === Before The Data — Firebase + Data Layer === */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec",
  authDomain: "ar-scouting-dashboard.firebaseapp.com",
  projectId: "ar-scouting-dashboard",
  storageBucket: "ar-scouting-dashboard.firebasestorage.app",
  messagingSenderId: "290834477922",
  appId: "1:290834477922:web:979499b51ba18607f0f23b"
};

const DEMO_POSTS = [
  { id: '1', slug: 'billy-vincent-simple-man', title: 'Simple Man', artist: 'Billy Vincent',
    artUrl: 'https://picsum.photos/seed/bv1/400/400', previewUrl: '',
    country: 'US', publishedAt: '2026-02-22', tags: ['folk', 'singer-songwriter'],
    writeup: 'Billy Vincent is the kind of find that reminds you why you started a music blog in the first place. The Virginia-based singer-songwriter dropped this raw, spine-tingling cover that had Luke Combs himself sliding into the comments. That\'s not hype — that\'s proof.',
    views: 2840, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  },
  { id: '2', slug: 'sarah-lola-how-cruel', title: 'How Cruel', artist: 'Sarah Lola',
    artUrl: 'https://picsum.photos/seed/sl1/400/400', previewUrl: '',
    country: 'US', publishedAt: '2026-02-21', tags: ['pop', 'indie'],
    writeup: 'Sarah Lola has been quietly stacking up massive TikTok numbers — 2.7M on one post, 1.6M on another. The sustained momentum tells you it\'s not a fluke. "How Cruel" is the song that\'s doing it, and it\'s easy to hear why.',
    views: 1920, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  },
  { id: '3', slug: 'sloe-jack-slow-down', title: 'SLOW DOWN', artist: 'SLOE JACK',
    artUrl: 'https://picsum.photos/seed/sj1/400/400', previewUrl: '',
    country: 'US', publishedAt: '2026-02-20', tags: ['indie-pop', 'alternative'],
    writeup: 'SLOE JACK is signed to our management roster for good reason. SLOW DOWN is the track that\'s been climbing steadily since its release — clean production, undeniable hook, and a sound that sits perfectly between indie and mainstream.',
    views: 3100, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  },
  { id: '4', slug: 'iyah-may-karmageddon', title: 'Karmageddon', artist: 'iyah may',
    artUrl: 'https://picsum.photos/seed/im1/400/400', previewUrl: '',
    country: 'US', publishedAt: '2026-02-19', tags: ['pop', 'r&b'],
    writeup: 'iyah may has been building something real. Karmageddon is the moment where all the pieces click — the vocals, the production, the intention. Filed under: artists you\'ll know in two years.',
    views: 2200, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  },
  { id: '5', slug: 'jerri-loop', title: 'Loop', artist: 'Jerri',
    artUrl: 'https://picsum.photos/seed/jr1/400/400', previewUrl: '',
    country: 'US', publishedAt: '2026-02-18', tags: ['indie', 'bedroom-pop'],
    writeup: 'Loop by Jerri is the kind of song that gets stuck in your head for days without you ever figuring out why. Minimal, hypnotic, effortlessly cool. This is early.',
    views: 1400, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  },
  { id: '6', slug: 'don-kai-debut', title: 'Right Now', artist: 'Don Kai',
    artUrl: 'https://picsum.photos/seed/dk1/400/400', previewUrl: '',
    country: 'US', publishedAt: '2026-02-17', tags: ['hip-hop', 'r&b'],
    writeup: 'Don Kai is operating on a different frequency. Right Now has that rare quality where every element is exactly where it should be — no wasted space, no unnecessary flourish.',
    views: 980, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  },
  { id: '7', slug: 'dame-atlas-blue', title: 'Blue', artist: 'Dame Atlas',
    artUrl: 'https://picsum.photos/seed/da1/400/400', previewUrl: '',
    country: 'UK', publishedAt: '2026-02-16', tags: ['indie', 'alternative'],
    writeup: 'Dame Atlas out of the UK brings a textured, atmospheric sound that feels cinematic without trying. Blue is three minutes of pure atmosphere.',
    views: 750, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  },
  { id: '8', slug: 'biirthplace-untitled', title: 'Untitled', artist: 'Biirthplace',
    artUrl: 'https://picsum.photos/seed/bp1/400/400', previewUrl: '',
    country: 'US', publishedAt: '2026-02-15', tags: ['ambient', 'experimental'],
    writeup: 'Biirthplace makes music that sounds like a memory you can\'t quite place. Untitled lives up to its name — it resists categorization, and that\'s exactly the point.',
    views: 620, writtenBy: { name: 'Chad Hillard', location: 'Chicago' }
  }
];

// Firebase + data access
let db = null;
let _postsCache = null;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
    }
  } catch (e) {
    console.warn('Firebase init failed, using demo data:', e.message);
  }
}

async function getAllPosts() {
  if (_postsCache) return _postsCache;
  let posts = [...DEMO_POSTS];
  try {
    if (db) {
      const snap = await db.collection('btd_posts').get();
      if (!snap.empty) {
        const fbPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Merge: Firebase posts override demo by id
        const fbIds = new Set(fbPosts.map(p => p.id));
        posts = [...fbPosts, ...posts.filter(p => !fbIds.has(p.id))];
      }
    }
  } catch (e) {
    console.warn('Firestore fetch failed:', e.message);
  }
  // Sort by date desc
  posts.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  _postsCache = posts;
  return posts;
}

async function getPostById(id) {
  const posts = await getAllPosts();
  return posts.find(p => p.id === id) || null;
}

async function getPostsByViews(limit = 25) {
  const posts = await getAllPosts();
  return [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, limit);
}

function searchPosts(posts, query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return posts.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.artist.toLowerCase().includes(q) ||
    (p.tags || []).some(t => t.toLowerCase().includes(q))
  );
}

// Country code to flag emoji
function countryFlag(code) {
  if (!code) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

// Time ago helper
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Init on load
document.addEventListener('DOMContentLoaded', initFirebase);
