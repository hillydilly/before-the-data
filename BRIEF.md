# Before The Data — Website Build Brief

## What You're Building
A music blog called "Before The Data" (successor to the legendary Hillydilly.com music blog, 2007–2020). This is a clean, minimal, editorial music discovery site. Vanilla HTML/CSS/JS only — no frameworks. Firebase Firestore for data.

## Brand
- Name: Before The Data
- Domain: beforethedata.com (will point here)
- Logo mark: assets/brand/logo-black.jpg (geometric "btd" mark — black on white)
- Logo dark: assets/brand/logo-dark-bg.jpg (same mark, white on dark textured bg)
- Wordmark: assets/brand/wordmark-light.jpg ("BEFORE THE DATA" in bold condensed sans-serif)
- Color palette: Monochromatic. Black (#000), white (#fff), light gray bg (#f5f5f5 or #f0f0f0), dark gray text (#222), mid gray (#888). NO red accents — this is cleaner/more minimal than Hillydilly.
- Typography: Bold condensed sans-serif for headings (use "Barlow Condensed" or "Bebas Neue" from Google Fonts). Clean sans for body (Inter or system-ui).

## Design Reference
Look at assets/brand/hillydilly-ref-homepage.jpg and hillydilly-ref-detail.jpg — this is the original Hillydilly.com design to base the layout on. Match the structure but apply the new BTD brand (monochromatic instead of red accents).

Key design elements from the reference:
- Persistent audio player bar at very top of page (full width)
- Left sidebar navigation (fixed, ~200px wide)
- Main content area to the right
- "NEW MUSIC" section: horizontal scrollable row of cards with album art + play overlay + title + artist
- "CHARTS" section: numbered list (#1–#25) with play button, artist - song name, heart, more options
- Song detail page: large album art header (full width, blurred bg), song/artist info, country flag, social links, written article below, tracklist, right sidebar with "Written By", "Next Post", "Related Tracks"

## Pages to Build

### 1. Discover (index.html) — Homepage
- Top: New Music horizontal scroll (latest ~10 posts, card format with album art)
- Below: Charts — top 25 songs ranked #1–#25 (sorted by views from Firebase)
- Both sections show "Last updated X ago" timestamp

### 2. New Music (new-music.html)
- Full grid/list of all posts, newest first
- Each item: album art, artist name, song/album title, published date
- Paginated or infinite scroll

### 3. Popular (popular.html)  
- Top 25 list sorted by views (pulled from Firebase posts collection)
- Same numbered list format as Charts on homepage

### 4. Search (search.html)
- Search input (prominent)
- Results update as you type, filtering posts by artist name or song title
- Results show album art, artist, title, date

### 5. Post Detail (post.html?id=XXXX or post/[slug]/index.html)
- Hero: full-width album art with blurred background overlay, artist + song title centered
- Meta: "Published X ago", country flag emoji, artist social links (TikTok, Instagram, Spotify, Twitter, Web)
- Share buttons: Twitter, Instagram
- Tags
- Article writeup (body text, ~2–3 paragraphs)
- Tracklist (if album/EP — list of songs with play buttons)
- Right sidebar: Written By, Next Post thumbnail, Related Tracks (3–4 items)

## Audio Player (Persistent Top Bar)
- Fixed at very top, full width, always visible
- Shows: album art thumbnail, "Artist - Song" text, source badge ("SPOTIFY")
- Controls: previous, play/pause, next, heart/like, volume slider, search icon
- Uses Spotify 30-second preview URLs (stored in Firebase as `previewUrl`)
- Playlist is the current page's tracklist or global queue

## Firebase Data Structure
Firebase config:
```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec",
  authDomain: "ar-scouting-dashboard.firebaseapp.com", 
  projectId: "ar-scouting-dashboard",
  storageBucket: "ar-scouting-dashboard.firebasestorage.app",
  messagingSenderId: "290834477922",
  appId: "1:290834477922:web:979499b51ba18607f0f23b"
};
```

Collection: `btd_posts`
Document structure:
```javascript
{
  id: string,
  slug: string,           // URL-safe slug
  title: string,          // Song or album title
  artist: string,         // Artist name
  artUrl: string,         // Album art image URL
  previewUrl: string,     // Spotify 30-sec preview URL
  spotifyId: string,      // Spotify track ID
  writeup: string,        // Full article HTML or markdown
  publishedAt: timestamp,
  country: string,        // 2-letter country code e.g. "US"
  tags: string[],
  socialLinks: {
    spotify: string,
    tiktok: string,
    instagram: string,
    twitter: string,
    web: string
  },
  tracks: [{ id, title, artist, previewUrl }],  // for albums/EPs
  relatedIds: string[],   // IDs of related posts
  writtenBy: { name: string, location: string },
  views: number
}
```

Collection: `btd_config`
- Document `site`: { lastNewMusicUpdate, lastChartsUpdate, chartSongs: [{id, rank}] }

## Sidebar Navigation
- Logo at top (BTD mark + "Before The Data" wordmark)
- User/branding line: "Chad Hillard" or just the brand
- Nav links: Discover, New Music, Popular, Search
- Footer links: About, Contact, Submit Music

## Demo Data
Seed 5–8 demo posts in the HTML/JS so the site looks populated on first load (before Firebase has real data). Use real artist names and placeholder album art from picsum.photos or similar. Include varied countries (US flag, UK flag, etc).

## Technical Requirements
- Pure vanilla HTML/CSS/JS — zero npm, zero frameworks, zero build step
- Firebase SDK loaded via CDN (v9 compat mode)
- Mobile responsive (sidebar collapses to bottom nav on mobile <768px)
- Fast: images lazy-loaded, no unnecessary requests
- Audio player state persists across page navigation (use sessionStorage or URL params)
- Each page is a separate .html file for simplicity (no SPA routing needed)
- CSS variables for theming: --bg, --bg-2, --tx-1, --tx-2, --tx-3, --bd, --acc (black)

## File Structure
```
index.html          (Discover/homepage)
new-music.html      (New Music page)
popular.html        (Popular page)
search.html         (Search page)
post.html           (Post detail — loads by ?id= or ?slug= param)
css/
  main.css          (all styles)
js/
  firebase.js       (Firebase init + data helpers)
  player.js         (Audio player logic)
  app.js            (Page-specific logic, included per page)
assets/
  brand/            (logos already here)
```

## What Done Looks Like
1. All 5 HTML pages built and visually complete
2. Persistent audio player works (plays Spotify previews)
3. Firebase integration reads/writes posts correctly
4. Demo data shows on every page so it looks real
5. Mobile responsive
6. Looks clean, editorial, professional — worthy of the Hillydilly legacy

When completely finished, run this command to notify:
openclaw system event --text "Done: Before The Data site built — all 5 pages, audio player, Firebase, mobile responsive" --mode now
