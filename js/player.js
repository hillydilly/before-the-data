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
  const artEl = bar?.querySelector('.player-art');
  const titleEl = bar?.querySelector('.player-title');
  const sourceEl = bar?.querySelector('.player-source');
  const playBtn = bar?.querySelector('.play-btn');
  const prevBtn = bar?.querySelector('.prev-btn');
  const nextBtn = bar?.querySelector('.next-btn');
  const heartBtn = bar?.querySelector('.heart-btn');
  const progressFill = bar?.querySelector('.player-progress-fill');
  const volumeSlider = bar?.querySelector('.volume-slider');

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
    }
    if (titleEl) titleEl.textContent = `${track.artist} — ${track.title}`;
    if (sourceEl) sourceEl.textContent = track.previewUrl ? 'APPLE MUSIC' : (track.ytId ? 'YOUTUBE' : '—');
  }

  function updatePlayButton() {
    if (playBtn) {
      playBtn.innerHTML = isPlaying ? '&#9646;&#9646;' : '&#9654;';
    }
    // Update all page play buttons
    document.querySelectorAll('[data-playing-id]').forEach(el => {
      el.classList.remove('is-playing');
    });
    if (isPlaying && queue[currentIndex]) {
      document.querySelectorAll(`[data-playing-id="${queue[currentIndex].id}"]`).forEach(el => {
        el.classList.add('is-playing');
      });
    }
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

  function _playCurrentTrack() {
    const track = queue[currentIndex];
    if (!track || !track.previewUrl) {
      updateUI(track || { artist: '', title: 'No preview available', artUrl: '' });
      isPlaying = false;
      updatePlayButton();
      saveState();
      return;
    }
    audio.src = track.previewUrl;
    audio.play().then(() => {
      isPlaying = true;
      updatePlayButton();
    }).catch(() => {
      isPlaying = false;
      updatePlayButton();
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

  // Init
  document.addEventListener('DOMContentLoaded', restoreState);

  return { play, togglePlay, next, prev, getQueue: () => queue, getCurrent: () => queue[currentIndex] };
})();
