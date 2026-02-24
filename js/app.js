/* ============================================
   Before The Data — App / Page Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Determine current page
  const path = window.location.pathname;
  // data-page on <body> is the authoritative signal (handles clean URLs like /sloe-jack-pour-me-a-drink)
  const bodyPage = document.body.dataset.page;
  const page = bodyPage || (
    path.includes('new-music') ? 'new-music'
    : path.includes('popular') ? 'popular'
    : path.includes('search') ? 'search'
    : path.includes('post') ? 'post'
    : 'discover'
  );

  // Highlight active nav
  document.querySelectorAll('#sidebar nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (page === 'discover' && (href === 'index.html' || href === './'))
      a.classList.add('active');
    else if (href && href.includes(page))
      a.classList.add('active');
  });

  // Page-specific logic
  switch (page) {
    case 'discover': await renderDiscover(); break;
    case 'new-music': await renderNewMusic(); break;
    case 'popular': await renderPopular(); break;
    case 'search': initSearch(); break;
    case 'post': await renderPost(); break;
  }
});

/* --- Helpers --- */
function createMusicCard(post) {
  const card = document.createElement('div');
  card.className = 'music-card';
  card.innerHTML = `
    <div class="card-art" data-playing-id="${post.id}">
      <img src="${post.artUrl}" alt="${post.title}" loading="lazy">
      <div class="play-overlay"><div class="play-circle">&#9654;</div></div>
    </div>
    <div class="card-title">${post.title}</div>
    <div class="card-artist">${post.artist}</div>
  `;
  // Click art area → play or pause if already playing this track
  card.querySelector('.card-art').addEventListener('click', (e) => {
    e.stopPropagation();
    const current = Player.getCurrent();
    if (current && current.id === post.id) {
      Player.togglePlay(); // pause/resume if this card is active
    } else {
      Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl });
    }
  });
  // Click title or artist → navigate to post
  card.querySelector('.card-title').addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `/${post.id}`;
  });
  card.querySelector('.card-artist').addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `/${post.id}`;
  });
  return card;
}

function createChartRow(post, rank) {
  const row = document.createElement('div');
  row.className = 'chart-row';
  row.innerHTML = `
    <div class="chart-rank">#${rank}</div>
    <button class="chart-play" data-playing-id="${post.id}">&#9654;</button>
    <img class="chart-art" src="${post.artUrl}" alt="${post.title}" loading="lazy">
    <div class="chart-info">
      <div class="chart-artist">${post.artist}</div>
      <div class="chart-title">${post.title}</div>
    </div>
    <div class="chart-actions">
      <button title="Like">&#9825;</button>
      <button title="More">&#8943;</button>
    </div>
  `;
  row.querySelector('.chart-play').addEventListener('click', (e) => {
    e.stopPropagation();
    Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl });
  });
  row.addEventListener('click', () => {
    window.location.href = `/${post.id}`;
  });
  return row;
}

function createChartRowFromTrack(track) {
  const row = document.createElement('div');
  row.className = 'chart-row';
  const thumb = track.artUrlSm || track.artUrl || (track.ytId ? `https://img.youtube.com/vi/${track.ytId}/hqdefault.jpg` : '');
  row.innerHTML = `
    <div class="chart-rank">#${track.rank}</div>
    <button class="chart-play" title="Play" data-playing-id="${track.spotifyId}">&#9654;</button>
    <img class="chart-art" src="${thumb}" alt="${track.title}" loading="lazy">
    <div class="chart-info">
      <div class="chart-artist">${track.artist}${track.explicit ? ' <span class="explicit">E</span>' : ''}</div>
      <div class="chart-title">${track.title}</div>
    </div>
    <div class="chart-actions">
      <button title="Like">&#9825;</button>
    </div>
  `;
  // Disable play button if no preview available
  if (!track.previewUrl) {
    row.querySelector('.chart-play').disabled = true;
    row.querySelector('.chart-play').title = 'No preview available';
    row.querySelector('.chart-play').style.opacity = '0.3';
  }

  const playFn = (e) => {
    if (e) e.stopPropagation();
    if (!track.previewUrl) return; // no preview — do nothing
    Player.play({
      id: track.spotifyId,
      title: track.title,
      artist: track.artist,
      artUrl: track.artUrl || thumb,
      previewUrl: track.previewUrl
    });
  };
  row.querySelector('.chart-play').addEventListener('click', playFn);
  row.addEventListener('click', playFn);
  return row;
}

/* --- Discover Page --- */
async function renderDiscover() {
  const scrollContainer = document.getElementById('new-music-scroll');
  const chartList = document.getElementById('chart-list');
  if (!scrollContainer || !chartList) return;

  // New Music: demo/Firebase posts
  const latest = await fetchPosts('publishedAt', 'desc', 10);
  Player.setQueue(latest); // pre-load so next/prev works across all cards
  latest.forEach(p => scrollContainer.appendChild(createMusicCard(p)));

  // Charts: real data from Firebase btd_charts
  const charts = await fetchCharts();
  if (charts.length > 0) {
    charts.forEach(t => chartList.appendChild(createChartRowFromTrack(t)));
  } else {
    // Fallback to demo posts
    const popular = await fetchPosts('views', 'desc', 25);
    popular.forEach((p, i) => chartList.appendChild(createChartRow(p, i + 1)));
  }
}

/* --- New Music Page --- */
async function renderNewMusic() {
  const grid = document.getElementById('music-grid');
  if (!grid) return;

  const posts = await fetchPosts('publishedAt', 'desc', 500);
  Player.setQueue(posts); // pre-load full page as queue
  posts.forEach(p => {
    const card = createMusicCard(p);
    const dateEl = document.createElement('div');
    dateEl.className = 'card-date';
    dateEl.textContent = timeAgo(p.publishedAt);
    card.appendChild(dateEl);
    grid.appendChild(card);
  });
}

/* --- Popular Page --- */
async function renderPopular() {
  const list = document.getElementById('popular-list');
  if (!list) return;

  const popular = await fetchPosts('views', 'desc', 25);
  popular.forEach((p, i) => list.appendChild(createChartRow(p, i + 1)));
}

/* --- Search Page --- */
function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const q = input.value.trim();
      results.innerHTML = '';
      if (!q) return;
      const posts = await searchPosts(q);
      if (posts.length === 0) {
        results.innerHTML = '<div class="loading-msg">No results found</div>';
        return;
      }
      posts.forEach(p => {
        const el = document.createElement('div');
        el.className = 'search-result';
        el.innerHTML = `
          <img src="${p.artUrl}" alt="${p.title}" loading="lazy">
          <div class="result-info">
            <div class="result-title">${p.title}</div>
            <div class="result-artist">${p.artist}</div>
            <div class="result-date">${timeAgo(p.publishedAt)}</div>
          </div>
        `;
        el.addEventListener('click', () => {
          window.location.href = `/${p.id}`;
        });
        results.appendChild(el);
      });
    }, 250);
  });

  // Focus on load
  input.focus();
}

/* --- Post Detail Page --- */
async function renderPost() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const slug = params.get('slug');
  // Clean URL: /sloe-jack-pour-me-a-drink — slug lives in pathname
  const pathSlug = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || null;

  let post = null;
  if (id) post = await fetchPostById(id);
  else if (slug) post = await fetchPostBySlug(slug);
  else if (pathSlug && pathSlug !== 'post') post = await fetchPostBySlug(pathSlug);

  if (!post) {
    document.getElementById('post-content').innerHTML =
      '<div class="loading-msg">Post not found</div>';
    return;
  }

  // Increment views
  incrementViews(post.id);

  // Hero
  const hero = document.getElementById('post-hero');
  hero.innerHTML = `
    <div class="post-hero-bg" style="background-image:url('${post.artUrl}')"></div>
    <div class="post-art-wrap" id="art-play-wrap">
      <img class="post-hero-art" src="${post.artUrl}" alt="${post.title}">
      ${post.previewUrl ? `<div class="post-art-overlay"><div class="art-play-circle">&#9654;</div></div>` : ''}
    </div>
    <div class="post-hero-meta">
      <div class="post-artist">${post.artist}</div>
      <div class="post-title">${post.title}</div>
      <div class="post-date">Published ${timeAgo(post.publishedAt)}</div>
      <div class="post-country">${countryFlag(post.country)}</div>
      <div class="post-stream-links">
        ${post.previewUrl ? `<button class="post-play-btn" id="hero-play-btn">▶ Play Preview</button>` : ''}
        ${post.socialLinks?.spotify ? `<a href="${post.socialLinks.spotify}" target="_blank" class="stream-pill spotify-pill">Spotify</a>` : ''}
        ${post.socialLinks?.appleMusic || post.previewUrl ? `<a href="https://music.apple.com/search?term=${encodeURIComponent((post.artist||'')+' '+(post.title||''))}" target="_blank" class="stream-pill apple-pill">Apple Music</a>` : ''}
      </div>
      <div class="post-socials">
        ${post.socialLinks?.instagram ? `<a href="${post.socialLinks.instagram}" target="_blank" class="social-pill">Instagram</a>` : ''}
        ${post.socialLinks?.tiktok ? `<a href="${post.socialLinks.tiktok}" target="_blank" class="social-pill">TikTok</a>` : ''}
        ${post.socialLinks?.twitter ? `<a href="${post.socialLinks.twitter}" target="_blank" class="social-pill">Twitter</a>` : ''}
        ${post.socialLinks?.web ? `<a href="${post.socialLinks.web}" target="_blank" class="social-pill">Website</a>` : ''}
      </div>
      <div class="post-tags">
        ${(post.tags || []).map(t => `<span>${t}</span>`).join('')}
      </div>
    </div>
  `;

  // Play button — play preview
  const playPost = () => {
    if (!post.previewUrl) return;
    Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl });
    const playBtn = document.getElementById('hero-play-btn');
    if (playBtn) playBtn.textContent = '▶ Playing in player bar ↑';
  };

  const artWrap = document.getElementById('art-play-wrap');
  if (artWrap && post.previewUrl) {
    artWrap.addEventListener('click', (e) => { e.stopPropagation(); playPost(); });
  }

  const playBtn = document.getElementById('hero-play-btn');
  if (playBtn && post.previewUrl) {
    playBtn.addEventListener('click', (e) => { e.stopPropagation(); playPost(); });
  }

  // Body
  const body = document.getElementById('post-body');
  body.innerHTML = post.writeup || '<p>No writeup available.</p>';

  // Tracklist — Spotify embeds for additional tracks
  const tracklist = document.getElementById('post-tracklist');
  if (post.tracks && post.tracks.length > 0) {
    const trackItems = post.tracks.map(t => {
      if (t.spotifyId) {
        return `<div class="track-embed">
          <iframe src="https://open.spotify.com/embed/track/${t.spotifyId}?utm_source=generator&theme=0"
            width="100%" height="80" frameborder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"></iframe>
        </div>`;
      }
      // Fallback: plain row if no Spotify ID
      return `<div class="track-row">
        <div class="track-name">${t.title}</div>
        <div class="track-artist-name">${t.artist}</div>
      </div>`;
    }).join('');
    tracklist.innerHTML = `<h3>Tracklist</h3>${trackItems}`;
  }

  // Sidebar
  const sidebar = document.getElementById('post-sidebar');
  let sidebarHTML = '';

  // Written By
  if (post.writtenBy) {
    sidebarHTML += `
      <section>
        <h4>Written By</h4>
        <div class="written-by">
          <div class="author-avatar">${post.writtenBy.name.charAt(0)}</div>
          <div>
            <div class="author-name">${post.writtenBy.name}</div>
            <div class="author-location">${post.writtenBy.location}</div>
          </div>
        </div>
      </section>
    `;
  }

  // Related Tracks
  if (post.relatedIds && post.relatedIds.length > 0) {
    sidebarHTML += '<section><h4>Related Tracks</h4>';
    for (const rid of post.relatedIds.slice(0, 4)) {
      const rel = await fetchPostById(rid);
      if (rel) {
        sidebarHTML += `
          <a class="related-item" href="/${rel.id}">
            <img src="${rel.artUrl}" alt="${rel.title}" loading="lazy">
            <div>
              <div class="rel-title">${rel.title}</div>
              <div class="rel-artist">${rel.artist}</div>
            </div>
          </a>
        `;
      }
    }
    sidebarHTML += '</section>';
  }
  sidebar.innerHTML = sidebarHTML;

  updatePostMeta(post);
  updateJsonLd(post);
}

// ─── SEO: Dynamic meta tags for post pages ───────────────────────────────────
function setMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`) ||
           document.querySelector(`meta[name="${property}"]`);
  if (el) el.content = content;
}

function updatePostMeta(post) {
  const title = `${post.artist} - "${post.title}" | Before The Data`;
  const rawDesc = post.writeup ? post.writeup.replace(/<[^>]+>/g, '') : '';
  const description = rawDesc.length > 155
    ? rawDesc.substring(0, 152) + '...'
    : (rawDesc || `Free music discovery — ${post.artist} - ${post.title} on Before The Data`);
  const image = post.artUrl || 'https://beforethedata.com/assets/og-image.jpg';
  const url = `https://beforethedata.com/${post.slug || post.id}`;

  document.title = title;

  // Standard
  setMeta('description', description);

  // OG
  setMeta('og:title', title);
  setMeta('og:description', description);
  setMeta('og:image', image);
  setMeta('og:url', url);
  setMeta('og:type', 'article');

  // Twitter
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);

  // Canonical
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = url;
}

function updateJsonLd(post) {
  const existing = document.getElementById('post-jsonld');
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'post-jsonld';
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Review",
    "name": `${post.artist} - "${post.title}"`,
    "author": { "@type": "Person", "name": "Chad Hillard" },
    "itemReviewed": {
      "@type": "MusicRecording",
      "name": post.title,
      "byArtist": { "@type": "MusicGroup", "name": post.artist }
    },
    "reviewBody": post.writeup ? post.writeup.replace(/<[^>]+>/g, '') : '',
    "publisher": {
      "@type": "Organization",
      "name": "Before The Data",
      "url": "https://beforethedata.com"
    }
  });
  document.head.appendChild(script);
}
