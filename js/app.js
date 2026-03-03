/* ============================================
   Before The Data — App / Page Logic
   ============================================ */
function truncateTitle(title, maxLen) {
  maxLen = maxLen || 35;
  if (!title) return title;
  // Strip feat./ft. from titles and artist names
  var display = title
    .replace(/\s*\(feat\..*?\)/i, '')
    .replace(/\s*\(ft\..*?\)/i, '')
    .replace(/\s*ft\..*$/i, '')
    .replace(/,.*$/, '')
    .trim();
  if (display.length > maxLen) display = display.slice(0, maxLen).trim() + '…';
  return display;
}


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

  // Site auth — sidebar login block + unified auth modal
  if (typeof BTDGate !== 'undefined' && BTDGate.initSiteAuth) {
    BTDGate.initSiteAuth();
  }

  // Search gate — prompt email signup before allowing search
  if (typeof BTDGate !== 'undefined' && BTDGate.initSearchGate) {
    BTDGate.initSearchGate();
  }

  // Mobile sticky search — filter new music list on index page
  const mobileSearchInput = document.getElementById('mobile-search-input');
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', () => {
      const q = mobileSearchInput.value.toLowerCase().trim();
      document.querySelectorAll('#new-music-scroll .music-list-item, #music-grid .music-list-item, #music-grid .music-card').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
    });
  }

// Page-specific logic
  switch (page) {
    case 'discover': await renderDiscover(); break;
    case 'new-music': await renderNewMusic(); break;
    case 'popular': await renderPopular(); break;
    case 'search': initSearch(); break;
    case 'post': await renderPost(); break;
    case 'artist': await renderArtist(); break;
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
    <div class="card-title" title="&quot;${post.title}&quot;">&ldquo;${truncateTitle(post.title)}&rdquo;</div>
    <div class="card-artist" title="${post.artist}">${truncateTitle(post.artist, 30)}</div>

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
    window.location.href = `/${post.slug || post.id}`;
  });
  card.querySelector('.card-artist').addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `/${post.slug || post.id}`;
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
      <div class="chart-artist" title="${post.artist}">${truncateTitle(post.artist, 30)}</div>
      <div class="chart-title">&ldquo;${post.title}&rdquo;</div>
    </div>

  `;
  row.querySelector('.chart-play').addEventListener('click', (e) => {
    e.stopPropagation();
    Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl });
  });
  row.addEventListener('click', () => {
    window.location.href = `/${post.slug || post.id}`;
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
      <div class="chart-title">&ldquo;${track.title}&rdquo;</div>
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

  // Always grid on discover page
  const latest = await fetchPosts('publishedAt', 'desc', 10);
  Player.setQueue(latest);
  latest.forEach(p => scrollContainer.appendChild(createMusicCard(p)));

  // Charts
  const charts = await fetchCharts();
  if (charts.length > 0) {
    charts.forEach(t => chartList.appendChild(createChartRowFromTrack(t)));
  } else {
    const popular = await fetchPosts('views', 'desc', 25);
    popular.forEach((p, i) => chartList.appendChild(createChartRow(p, i + 1)));
  }
}

/* --- New Music Page --- */
function createListItem(post) {
  const item = document.createElement('div');
  item.className = 'music-list-item';
  item.dataset.id = post.id;
  if (post.genre) item.dataset.genre = post.genre;

  // Strip HTML from writeup
  const rawWriteup = post.writeup || '';
  const writeupText = rawWriteup.replace(/<[^>]*>/g, '').trim();

  item.innerHTML = `
    <div class="list-art" data-post-link="${post.slug || post.id}" data-playing-id="${post.id}">
      <img src="${post.artUrl}" alt="${post.title}" loading="lazy">
      <div class="list-play-overlay">
        <button class="list-play-btn" data-playing-id="${post.id}">&#9654;</button>
      </div>
    </div>
    <div class="list-info">
      <a class="list-artist" href="/artist/${artistSlug(post.artist || '')}">${post.artist}</a>
      <div class="list-title" title="&quot;${post.title}&quot;">&ldquo;${truncateTitle(post.title, 50)}&rdquo;</div>
      ${writeupText ? `<div class="list-writeup">${writeupText}</div>` : ''}
      <div class="list-genres">${(post.genres && post.genres.length ? post.genres : (post.genre ? [post.genre] : [])).map(g => '<a href="/new-music.html?genre=' + encodeURIComponent(g) + '" class="genre-pill" onclick="event.stopPropagation()">' + g + '</a>').join('')}</div>
      <div class="list-date">${timeAgo(post.publishedAt)}</div>
    </div>
  `;

  // Artwork click → post page
  item.querySelector('.list-art').addEventListener('click', (e) => {
    if (e.target.classList.contains('list-play-btn')) return;
    window.location.href = `/${post.slug || post.id}`;
  });

  item.querySelector('.list-play-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const current = Player.getCurrent();
    if (current && current.id === post.id) {
      Player.togglePlay();
    } else {
      Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl });
    }
  });

  // Title + writeup click → post page
  item.querySelector('.list-title').addEventListener('click', () => {
    window.location.href = `/${post.slug || post.id}`;
  });
  item.querySelector('.list-writeup')?.addEventListener('click', () => {
    window.location.href = `/${post.slug || post.id}`;
  });

  // Artist link — stop propagation so it doesn't bubble to post navigation
  item.querySelector('.list-artist')?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  return item;
}

async function renderNewMusic() {
  const grid = document.getElementById('music-grid');
  if (!grid) return;

  // Attach toggle listeners immediately (before async fetch) so clicks always register
  let currentView = localStorage.getItem('btd-view') || 'list';
  const _setView = (view) => {
    currentView = view;
    localStorage.setItem('btd-view', view);
    document.getElementById('view-list')?.classList.toggle('active', view === 'list');
    document.getElementById('view-grid')?.classList.toggle('active', view === 'grid');
  };
  _setView(currentView); // set initial button state right away
  document.getElementById('view-list')?.addEventListener('click', () => {
    _setView('list');
    if (typeof renderView === 'function') renderView('list');
  });
  document.getElementById('view-grid')?.addEventListener('click', () => {
    _setView('grid');
    if (typeof renderView === 'function') renderView('grid');
  });

  const allPosts = await fetchPosts('publishedAt', 'desc', 500);

  const urlGenre = new URLSearchParams(window.location.search).get('genre');
  const urlYear = new URLSearchParams(window.location.search).get('year');
  let activeGenre = urlGenre || null;
  let activeYear = urlYear ? parseInt(urlYear) : null;

  // Inject genre + year filter bar
  const pageHeader = document.querySelector('.page-header') || grid.parentElement;
  const existingBar = document.getElementById('genre-filter-bar');
  if (!existingBar && pageHeader) {
    const genres = [...new Set(allPosts.flatMap(p => p.genres && p.genres.length ? p.genres : (p.genre ? [p.genre] : [])))].sort();
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2007; y--) years.push(y);

    const bar = document.createElement('div');
    bar.id = 'genre-filter-bar';
    bar.innerHTML = `
      <button class="genre-btn ${!activeGenre && !activeYear ? 'active' : ''}" data-genre="">All</button>
      ${genres.map(g => `<button class="genre-btn ${activeGenre === g ? 'active' : ''}" data-genre="${g}">${g}</button>`).join('')}
      <div class="year-filter-wrap" id="year-filter-wrap">
        <button class="genre-btn year-pill ${activeYear ? 'active' : ''}" id="year-pill-btn">
          ${activeYear ? activeYear : 'Year'} ▾
        </button>
        <div class="year-dropdown" id="year-dropdown">
          ${years.map(y => `<button class="year-option ${activeYear === y ? 'active' : ''}" data-year="${y}">${y}</button>`).join('')}
        </div>
      </div>
    `;
    pageHeader.insertBefore(bar, grid);

    // Genre filter clicks
    bar.addEventListener('click', e => {
      const genreBtn = e.target.closest('.genre-btn:not(.year-pill)');
      if (genreBtn && genreBtn.dataset.genre !== undefined) {
        activeGenre = genreBtn.dataset.genre || null;
        bar.querySelectorAll('.genre-btn:not(.year-pill)').forEach(b => b.classList.toggle('active', b.dataset.genre === (activeGenre || '')));
        renderView(currentView);
        const url = new URL(window.location.href);
        if (activeGenre) url.searchParams.set('genre', activeGenre);
        else url.searchParams.delete('genre');
        history.replaceState({}, '', url);
      }
    });

    // Year pill toggle dropdown
    const yearBtn = document.getElementById('year-pill-btn');
    const yearDropdown = document.getElementById('year-dropdown');
    yearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      yearDropdown.classList.toggle('open');
    });

    // Year option clicks
    yearDropdown.addEventListener('click', e => {
      const opt = e.target.closest('.year-option');
      if (!opt) return;
      const y = parseInt(opt.dataset.year);
      activeYear = activeYear === y ? null : y;
      yearDropdown.querySelectorAll('.year-option').forEach(o => o.classList.toggle('active', parseInt(o.dataset.year) === activeYear));
      yearBtn.textContent = activeYear ? activeYear + ' ▾' : 'Year ▾';
      yearBtn.classList.toggle('active', !!activeYear);
      yearDropdown.classList.remove('open');
      renderView(currentView);
      const url = new URL(window.location.href);
      if (activeYear) url.searchParams.set('year', activeYear);
      else url.searchParams.delete('year');
      history.replaceState({}, '', url);
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => yearDropdown.classList.remove('open'));
  }

  Player.setQueue(allPosts);

  function renderView(view) {
    currentView = view;
    _setView(view);
    let posts = allPosts;
    if (activeGenre) posts = posts.filter(p => (p.genres || [p.genre]).includes(activeGenre));
    if (activeYear) posts = posts.filter(p => p.publishedAt && new Date(p.publishedAt).getFullYear() === activeYear);
    grid.innerHTML = '';
    if (view === 'list') {
      grid.className = 'music-grid list-view';
      posts.forEach(p => grid.appendChild(createListItem(p)));
    } else {
      grid.className = 'music-grid';
      posts.forEach(p => {
        const card = createMusicCard(p);
        const dateEl = document.createElement('div');
        dateEl.className = 'card-date';
        dateEl.textContent = timeAgo(p.publishedAt);
        card.appendChild(dateEl);
        grid.appendChild(card);
      });
    }
  }

  renderView(currentView);

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
            <div class="result-title">&ldquo;${p.title}&rdquo;</div>
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
function artistSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function renderArtist() {
  // Get artist from URL: /artist/tame-impala
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const slug = pathParts[1] || pathParts[0] || '';
  if (!slug) return;

  const allPosts = await fetchPosts('publishedAt', 'desc', 500);
  // Match by artistSlug
  const posts = allPosts.filter(p => artistSlug(p.artist || '') === slug || (p.artist || '').split(',').some(a => artistSlug(a.trim()) === slug));

  const artistName = posts[0]?.artist?.split(',')[0]?.trim() || slug.replace(/-/g, ' ');

  // Hero
  const hero = document.getElementById('artist-hero');
  if (hero) {
    hero.innerHTML = `
      <div class="artist-hero-inner">
        ${posts[0]?.artUrl ? `<img class="artist-hero-art" src="${posts[0].artUrl}" alt="${artistName}">` : ''}
        <div class="artist-hero-meta">
          <div class="artist-hero-name">${artistName}</div>
          <div class="artist-hero-count">${posts.length} post${posts.length !== 1 ? 's' : ''} on Before The Data</div>
        </div>
      </div>
    `;
  }

  // Posts grid
  const postsEl = document.getElementById('artist-posts');
  if (postsEl) {
    if (posts.length === 0) {
      postsEl.innerHTML = '<div class="loading-msg">No posts found for this artist.</div>';
      return;
    }
    postsEl.className = 'artist-posts music-grid list-view';
    Player.setQueue(posts);
    posts.forEach(p => postsEl.appendChild(createListItem(p)));
  }
}

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
      <div class="post-art-overlay"><div class="art-play-circle">&#9654;</div></div>
    </div>
    <div class="post-hero-meta">
      <a class="post-artist" href="/artist/${artistSlug(post.artist || '')}"><span onclick="event.stopPropagation()">${post.artist}</span></a>
      <div class="post-title">&ldquo;${post.title}&rdquo;</div>
      <div class="post-date">${formatPostDate(post.publishedAt)}</div>
      <div class="post-country">${countryFlag(post.country)}</div>
      <div class="post-stream-links">
        ${(post.previewUrl || post.trackId || post.youtubeId) ? `<button class="post-play-btn" id="hero-play-btn">▶ ${post.youtubeId && !post.trackId ? 'Watch on YouTube' : 'Play Preview'}</button>` : ''}
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
        ${(post.genres && post.genres.length ? post.genres : (post.genre ? [post.genre] : [])).map(g => `<a href="/new-music.html?genre=${encodeURIComponent(g)}" class="genre-pill" onclick="event.stopPropagation();window.location.href='/new-music.html?genre=${encodeURIComponent(g)}'">${g}</a>`).join('')}
        ${(post.tags || []).filter(t => {
          const skip = ['artist-discovery','new-music','new-release','featured','editorial','scouting'];
          if (skip.includes(t.toLowerCase())) return false;
          const gl = (post.genres || []).map(g => g.toLowerCase());
          return !gl.includes(t.toLowerCase());
        }).map(t => `<span>${t}</span>`).join('')}
      </div>
    </div>
  `;

  // Play button — always plays 30s preview in the bottom player bar
  // If previewUrl not stored, fetch it live from /api/spotify-preview
  let _resolvedPreviewUrl = post.previewUrl || null;
  let _fetchingPreview = false;

  const scrollToYouTube = () => {
    const embed = document.getElementById('post-youtube-embed');
    if (embed) {
      embed.scrollIntoView({ behavior: 'smooth', block: 'center' });
      embed.style.outline = '2px solid #FF0000';
      setTimeout(() => { embed.style.outline = ''; }, 1800);
    }
  };

  const doPlay = (previewUrl) => {
    Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl });
    const btn = document.getElementById('hero-play-btn');
    if (btn) btn.textContent = '▶ Playing...';
  };

  const playPost = async () => {
    // If we already have a preview URL, play it immediately
    if (_resolvedPreviewUrl) { doPlay(_resolvedPreviewUrl); return; }

    // No previewUrl but has trackId — fetch from our proxy
    if (post.trackId && !_fetchingPreview) {
      _fetchingPreview = true;
      const btn = document.getElementById('hero-play-btn');
      if (btn) btn.textContent = '▶ Loading...';
      try {
        const res = await fetch(`/api/spotify-preview?trackId=${post.trackId}`);
        const data = await res.json();
        if (data.previewUrl) {
          _resolvedPreviewUrl = data.previewUrl;
          doPlay(_resolvedPreviewUrl);
        } else {
          // Track exists on Spotify but has no preview — fall back to YouTube
          if (post.youtubeId) { scrollToYouTube(); }
          else if (btn) btn.textContent = '▶ No Preview Available';
        }
      } catch (e) {
        if (btn) btn.textContent = '▶ Play Preview';
      } finally { _fetchingPreview = false; }
      return;
    }

    // No trackId, has youtubeId — scroll to YouTube embed
    if (post.youtubeId) { scrollToYouTube(); }
  };

  const artWrap = document.getElementById('art-play-wrap');
  if (artWrap && (post.previewUrl || post.trackId || post.youtubeId)) {
    artWrap.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = Player.getCurrent();
      if (_resolvedPreviewUrl && current && current.id === post.id) { Player.togglePlay(); return; }
      playPost();
    });
  }

  const playBtn = document.getElementById('hero-play-btn');
  if (playBtn && (post.previewUrl || post.trackId || post.youtubeId)) {
    playBtn.addEventListener('click', (e) => { e.stopPropagation(); playPost(); });
  }

  // Content gate — check access before rendering body/sidebar/tracklist
  if (typeof BTDGate !== 'undefined' && BTDGate.initPostGate) {
    const bodyWrap = document.querySelector('.post-body-wrap');
    const tracklist = document.getElementById('post-tracklist');
    BTDGate.initPostGate(
      post,
      [bodyWrap, tracklist],
      bodyWrap
    );
  }

  // Body
  const body = document.getElementById('post-body');
  body.innerHTML = post.writeup || '<p>No writeup available.</p>';

  // Embed — Spotify if trackId, YouTube as fallback if youtubeId
  if (post.trackId) {
    const embedWrap = document.createElement('div');
    embedWrap.id = 'post-spotify-embed';
    embedWrap.className = 'post-spotify-embed';
    embedWrap.innerHTML = `<iframe src="https://open.spotify.com/embed/track/${post.trackId}?utm_source=generator&theme=0"
      width="100%" height="152" frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy" style="border-radius:12px"></iframe>`;
    body.appendChild(embedWrap);
  } else if (post.youtubeId) {
    const embedWrap = document.createElement('div');
    embedWrap.id = 'post-youtube-embed';
    embedWrap.className = 'post-youtube-embed';
    embedWrap.innerHTML = `<iframe width="100%" height="200" style="border-radius:8px"
      src="https://www.youtube.com/embed/${post.youtubeId}?rel=0"
      frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen loading="lazy"></iframe>`;
    body.appendChild(embedWrap);
  }

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
        <div class="track-name">&ldquo;${t.title}&rdquo;</div>
        <div class="track-artist-name">${t.artist}</div>
      </div>`;
    }).join('');
    tracklist.innerHTML = `<h3>Tracklist</h3>${trackItems}`;
  }

  // Sidebar
  const sidebar = document.getElementById('post-sidebar');
  let sidebarHTML = '';

  // Written By
  if (post.writtenBy && post.writtenBy.name && post.writtenBy.name !== 'undefined') {
    // Known author photos — add more as we import the archive
    const AUTHOR_PHOTOS = {
      'chad hillard': 'https://res.cloudinary.com/dd9nbystx/image/upload/v1772287609/btd/chad-profile.jpg',
      'hillydilly': 'https://res.cloudinary.com/dd9nbystx/image/upload/v1772287609/btd/chad-profile.jpg',
    };
    const GENERIC_AVATAR = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e0e0e0'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%23bbb'/%3E%3Cellipse cx='20' cy='36' rx='12' ry='9' fill='%23bbb'/%3E%3C/svg%3E`;
    const authorKey = (post.writtenBy.name || '').toLowerCase().trim();
    const avatarSrc = AUTHOR_PHOTOS[authorKey] || (post.writtenBy.photo || GENERIC_AVATAR);
    sidebarHTML += `
      <section>
        <h4>Written By</h4>
        <div class="written-by">
          <img class="author-avatar" src="${avatarSrc}" alt="${post.writtenBy.name}">
          <div>
            <div class="author-name">${post.writtenBy.name}</div>
            ${post.writtenBy.location ? `<div class="author-location">${post.writtenBy.location}</div>` : ''}
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
              <div class="rel-title">&ldquo;${rel.title}&rdquo;</div>
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
