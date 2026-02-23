/* ============================================
   Before The Data — App / Page Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Determine current page
  const path = window.location.pathname;
  const page = path.includes('new-music') ? 'new-music'
    : path.includes('popular') ? 'popular'
    : path.includes('search') ? 'search'
    : path.includes('post') ? 'post'
    : 'discover';

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
    <div class="card-art">
      <img src="${post.artUrl}" alt="${post.title}" loading="lazy">
      <div class="play-overlay"><div class="play-circle">&#9654;</div></div>
    </div>
    <div class="card-title">${post.title}</div>
    <div class="card-artist">${post.artist}</div>
  `;
  card.addEventListener('click', () => {
    Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl });
  });
  card.querySelector('.card-art').addEventListener('dblclick', (e) => {
    e.stopPropagation();
    window.location.href = `post.html?id=${post.id}`;
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
    window.location.href = `post.html?id=${post.id}`;
  });
  return row;
}

/* --- Discover Page --- */
async function renderDiscover() {
  const scrollContainer = document.getElementById('new-music-scroll');
  const chartList = document.getElementById('chart-list');
  if (!scrollContainer || !chartList) return;

  const latest = await fetchPosts('publishedAt', 'desc', 10);
  latest.forEach(p => scrollContainer.appendChild(createMusicCard(p)));

  const popular = await fetchPosts('views', 'desc', 25);
  popular.forEach((p, i) => chartList.appendChild(createChartRow(p, i + 1)));
}

/* --- New Music Page --- */
async function renderNewMusic() {
  const grid = document.getElementById('music-grid');
  if (!grid) return;

  const posts = await fetchPosts('publishedAt', 'desc', 50);
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
          window.location.href = `post.html?id=${p.id}`;
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

  let post = null;
  if (id) post = await fetchPostById(id);
  else if (slug) post = await fetchPostBySlug(slug);

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
    <img class="post-hero-art" src="${post.artUrl}" alt="${post.title}">
    <div class="post-hero-meta">
      <div class="post-artist">${post.artist}</div>
      <div class="post-title">${post.title}</div>
      <div class="post-date">Published ${timeAgo(post.publishedAt)}</div>
      <div class="post-country">${countryFlag(post.country)}</div>
      <div class="post-socials">
        ${post.socialLinks?.spotify ? `<a href="${post.socialLinks.spotify}" target="_blank">🎵 Spotify</a>` : ''}
        ${post.socialLinks?.instagram ? `<a href="${post.socialLinks.instagram}" target="_blank">📷 Instagram</a>` : ''}
        ${post.socialLinks?.tiktok ? `<a href="${post.socialLinks.tiktok}" target="_blank">🎵 TikTok</a>` : ''}
        ${post.socialLinks?.twitter ? `<a href="${post.socialLinks.twitter}" target="_blank">🐦 Twitter</a>` : ''}
        ${post.socialLinks?.web ? `<a href="${post.socialLinks.web}" target="_blank">🌐 Web</a>` : ''}
      </div>
      <div class="post-tags">
        ${(post.tags || []).map(t => `<span>${t}</span>`).join('')}
      </div>
    </div>
  `;

  // Play button — play this track
  hero.style.cursor = 'pointer';
  hero.addEventListener('click', () => {
    Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl });
  });

  // Body
  const body = document.getElementById('post-body');
  body.innerHTML = post.writeup || '<p>No writeup available.</p>';

  // Tracklist
  const tracklist = document.getElementById('post-tracklist');
  if (post.tracks && post.tracks.length > 0) {
    tracklist.innerHTML = `<h3>Tracklist</h3>` +
      post.tracks.map(t => `
        <div class="track-row" onclick="Player.play({id:'${t.id}',title:'${t.title}',artist:'${t.artist}',artUrl:'${post.artUrl}',previewUrl:'${t.previewUrl}'})">
          <div class="track-play">&#9654;</div>
          <div class="track-name">${t.title}</div>
          <div class="track-artist-name">${t.artist}</div>
        </div>
      `).join('');
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
          <a class="related-item" href="post.html?id=${rel.id}">
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
}
