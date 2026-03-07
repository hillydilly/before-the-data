/* ============================================
   Before The Data — Audio Player
   ============================================ */

const Player = (() => {
  let audio = new Audio();
  let queue = [];
  let currentIndex = -1;
  let isPlaying = false;

  // DOM refs
  const bar = document.getElementById('player-bar');
  const artEl = document.getElementById('player-bar-art');
  const titleEl = document.getElementById('player-title-text');
  const sourceEl = document.getElementById('player-apple-link');
  const playBtn = bar?.querySelector('.play-btn');
  const prevBtn = bar?.querySelector('.prev-btn');
  const nextBtn = bar?.querySelector('.next-btn');
  const progressFill = bar?.querySelector('.player-progress-fill');
  const volumeSlider = document.getElementById('volume-slider');
  const volumePopup = document.getElementById('volume-popup');
  const volumeBtn = bar?.querySelector('.volume-btn');

  const progressBar = bar?.querySelector('.player-progress');

  // Restore state from sessionStorage
  function restoreState() {
    try {
      const saved = sessionStorage.getItem('btd_player');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.queue) queue = s.queue;
        if (typeof s.currentIndex === 'number') currentIndex = s.currentIndex;
        if (s.volume !== undefined && volumeSlider) {
          audio.volume = s.volume;
          volumeSlider.value = s.volume;
        }
        if (currentIndex >= 0 && queue[currentIndex]) {
          updateUI(queue[currentIndex]);
        }
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      sessionStorage.setItem('btd_player', JSON.stringify({
        queue: queue.slice(0, 50),
        currentIndex,
        volume: audio.volume
      }));
    } catch (e) {}
  }

  function updateUI(track) {
    if (!bar) return;
    if (artEl) {
      artEl.src = track.artUrl || '';
      artEl.alt = track.title || '';
      // Show art only when a real track is loaded
      if (track.artUrl) { artEl.classList.add('has-art'); }
      else { artEl.classList.remove('has-art'); }
    }
    // No em dash — use hyphen
    if (titleEl) titleEl.textContent = `${track.artist} - "${track.title}"`;
    // Update Apple Music link
    const appleLink = document.getElementById('player-apple-link');
    if (appleLink) {
      if (track.previewUrl) {
        const q = encodeURIComponent(`${track.artist || ''} ${track.title || ''}`);
        appleLink.href = `https://music.apple.com/search?term=${q}`;
        appleLink.textContent = 'APPLE MUSIC';
        appleLink.style.display = '';
      } else if (track.ytId) {
        appleLink.href = `https://www.youtube.com/watch?v=${track.ytId}`;
        appleLink.textContent = 'YOUTUBE';
        appleLink.style.display = '';
      } else {
        appleLink.href = '#';
        appleLink.textContent = '\u2014';
      }
    }
    if (sourceEl && sourceEl.tagName !== 'A') sourceEl.textContent = track.previewUrl ? 'APPLE MUSIC' : (track.ytId ? 'YOUTUBE' : '');
  }

  function updatePlayButton() {
    if (playBtn) {
      playBtn.innerHTML = isPlaying ? '&#9646;&thinsp;&#9646;' : '&#9654;';
      playBtn.classList.toggle('is-paused', !isPlaying);
    }
    // Reset all list play buttons to play icon
    document.querySelectorAll('.list-play-btn').forEach(btn => {
      btn.innerHTML = '&#9654;';
    });
    // Reset all data-playing-id elements
    document.querySelectorAll('[data-playing-id]').forEach(el => {
      el.classList.remove('is-playing');
    });
    if (isPlaying && queue[currentIndex]) {
      const id = queue[currentIndex].id;
      document.querySelectorAll(`[data-playing-id="${id}"]`).forEach(el => {
        el.classList.add('is-playing');
      });
      // Update the specific list play button to show pause
      document.querySelectorAll(`.list-play-btn[data-playing-id="${id}"]`).forEach(btn => {
        btn.innerHTML = '&#9646;&thinsp;&#9646;';
      });
    }
    // Dispatch event so post page overlay can sync
    document.dispatchEvent(new CustomEvent('btd:playerStateChange'));
  }

  // Audio events
  audio.addEventListener('timeupdate', () => {
    if (audio.duration && progressFill) {
      progressFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
  });

  audio.addEventListener('ended', () => {
    next();
  });

  audio.addEventListener('error', () => {
    console.warn('[BTD Player] Audio error, skipping');
    next();
  });

  // Controls
  function play(track, newQueue) {
    if (newQueue) {
      queue = newQueue;
      currentIndex = queue.findIndex(t => t.id === track.id);
      if (currentIndex === -1) { queue.unshift(track); currentIndex = 0; }
    } else {
      const idx = queue.findIndex(t => t.id === track.id);
      if (idx >= 0) {
        currentIndex = idx;
      } else {
        queue.push(track);
        currentIndex = queue.length - 1;
      }
    }
    _playCurrentTrack();
  }

  async function _fetchAppleMusicPreview(artist, title) {
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=5`);
      const data = await res.json();
      const match = (data.results || []).find(r =>
        r.trackName?.toLowerCase() === title.toLowerCase() &&
        r.artistName?.toLowerCase().includes((artist || '').toLowerCase().split(' ')[0])
      ) || data.results?.[0];
      return match?.previewUrl || null;
    } catch (e) { return null; }
  }

  async function _playCurrentTrack() {
    const track = queue[currentIndex];
    if (!track) {
      updateUI({ artist: '', title: 'No preview available', artUrl: '' });
      isPlaying = false;
      updatePlayButton();
      saveState();
      return;
    }
    // If no previewUrl stored, try fetching from Apple Music live
    if (!track.previewUrl && track.artist && track.title) {
      updateUI({ ...track, title: 'Loading...' });
      track.previewUrl = await _fetchAppleMusicPreview(track.artist, track.title);
    }
    if (!track.previewUrl) {
      updateUI({ ...track, title: `${track.title} — No preview available` });
      isPlaying = false;
      updatePlayButton();
      saveState();
      return;
    }
    // Gate check — show email modal on 2nd play if not subscribed
    if (typeof BTDGate !== 'undefined' && !BTDGate.checkGate()) {
      return; // blocked — modal shown
    }
    audio.src = track.previewUrl;
    audio.play().then(() => {
      isPlaying = true;
      updatePlayButton();
    }).catch(async () => {
      // URL failed (expired Deezer token, network error, etc.) — try Apple Music live
      isPlaying = false;
      updatePlayButton();
      updateUI({ ...track, title: 'Loading...' });
      const freshUrl = await _fetchAppleMusicPreview(track.artist, track.title);
      if (freshUrl) {
        track.previewUrl = freshUrl;
        audio.src = freshUrl;
        audio.play().then(() => { isPlaying = true; updatePlayButton(); updateUI(track); }).catch(() => {
          updateUI({ ...track, title: `${track.title} — No preview available` });
        });
      } else {
        updateUI({ ...track, title: `${track.title} — No preview available` });
      }
    });
    updateUI(track);
    saveState();
  }

  function togglePlay() {
    if (!audio.src && queue[currentIndex]) {
      _playCurrentTrack();
      return;
    }
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      audio.play().catch(() => {});
      isPlaying = true;
    }
    updatePlayButton();
  }

  function next() {
    if (queue.length === 0) return;
    currentIndex = (currentIndex + 1) % queue.length;
    _playCurrentTrack();
  }

  function prev() {
    if (queue.length === 0) return;
    currentIndex = (currentIndex - 1 + queue.length) % queue.length;
    _playCurrentTrack();
  }

  // Pre-load a section as the queue without starting playback
  function setQueue(tracks) {
    if (!tracks || tracks.length === 0) return;
    queue = tracks.map(t => ({ id: t.id, title: t.title, artist: t.artist, artUrl: t.artUrl, previewUrl: t.previewUrl }));
    saveState();
  }

  // Event listeners
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (prevBtn) prevBtn.addEventListener('click', prev);
  if (nextBtn) nextBtn.addEventListener('click', next);
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      audio.volume = parseFloat(e.target.value);
      saveState();
    });
  }
  // Volume popup toggle
  if (volumeBtn && volumePopup) {
    volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      volumePopup.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!volumeBtn.contains(e.target)) volumePopup.classList.remove('open');
    });
  }

  // ── Progress bar click to seek ─────────────────────────────────────────────
  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * audio.duration;
    });
  }

  // ── Load full posts.json into queue for prev/next navigation ───────────────
  async function _loadQueueFromPostsJson() {
    if (queue.length > 10) return; // already populated
    try {
      const res = await fetch('/posts.json');
      const posts = await res.json();
      const playable = posts
        .filter(p => p.previewUrl)
        .map(p => ({ id: p.slug || p.id, slug: p.slug || p.id, title: p.title, artist: p.artist, artUrl: p.artUrl, previewUrl: p.previewUrl }));
      if (playable.length > 0 && queue.length <= 1) {
        // Merge: keep current track at front, add rest
        const cur = queue[currentIndex];
        queue = playable;
        if (cur) {
          const idx = queue.findIndex(t => t.id === cur.id);
          currentIndex = idx >= 0 ? idx : 0;
        }
        saveState();
      }
    } catch (_) {}
  }

  // ── Player bar search ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    restoreState();
    _loadQueueFromPostsJson();

    // Auto-load current post on post pages, latest post on other pages
    // Only if player is currently idle (no track loaded from sessionStorage)
    const currentTrack = queue[currentIndex];
    if (!currentTrack || !currentTrack.previewUrl) {
      const page = document.body.dataset.page;
      if (page === 'post') {
        // Post page: player.js runs before app.js fully loads the post,
        // so we listen for the custom event app.js fires after loading
        document.addEventListener('btd:postLoaded', (e) => {
          const post = e.detail;
          if (post && !Player.getCurrent()) {
            Player.play({ id: post.id, title: post.title, artist: post.artist, artUrl: post.artUrl, previewUrl: post.previewUrl || null });
          }
        }, { once: true });
      } else {
        // Other pages: load latest post from posts.json once queue is ready
        setTimeout(async () => {
          if (queue.length > 0 && !Player.getCurrent()) {
            const latest = queue[0];
            updateUI(latest);
            // Don't auto-play — just load the track info so bar shows something
          }
        }, 1500);
      }
    }

      });

  return { play, togglePlay, next, prev, setQueue, getQueue: () => queue, getCurrent: () => queue[currentIndex], isPlaying: () => isPlaying };
})();
