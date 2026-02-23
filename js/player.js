/* === Before The Data — Audio Player === */

const Player = (() => {
  let audio = new Audio();
  let queue = [];
  let currentIdx = -1;
  let isPlaying = false;

  const $ = id => document.getElementById(id);

  function init() {
    audio.volume = 0.8;

    // Restore state from sessionStorage
    const saved = sessionStorage.getItem('btd_player');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        queue = s.queue || [];
        currentIdx = s.currentIdx ?? -1;
        if (queue[currentIdx]) updateUI(queue[currentIdx]);
      } catch (e) {}
    }

    // Controls
    $('btn-play')?.addEventListener('click', toggle);
    $('btn-prev')?.addEventListener('click', prev);
    $('btn-next')?.addEventListener('click', next);
    $('player-vol')?.addEventListener('input', e => { audio.volume = e.target.value; });

    // Audio events
    audio.addEventListener('ended', next);
    audio.addEventListener('play', () => { isPlaying = true; updatePlayBtn(); });
    audio.addEventListener('pause', () => { isPlaying = false; updatePlayBtn(); });
  }

  function saveState() {
    sessionStorage.setItem('btd_player', JSON.stringify({ queue, currentIdx }));
  }

  function updateUI(track) {
    if (!track) return;
    const art = $('player-art');
    const title = $('player-title');
    const artist = $('player-artist');
    if (art) { art.src = track.artUrl || ''; art.alt = track.title; }
    if (title) title.textContent = track.title || '—';
    if (artist) artist.textContent = track.artist || 'Select a track';
  }

  function updatePlayBtn() {
    const btn = $('btn-play');
    if (btn) btn.textContent = isPlaying ? '⏸' : '▶';
  }

  function playTrack(track) {
    // Add to queue if not already current
    const idx = queue.findIndex(t => t.id === track.id);
    if (idx >= 0) {
      currentIdx = idx;
    } else {
      queue.push(track);
      currentIdx = queue.length - 1;
    }
    updateUI(track);
    saveState();

    if (track.previewUrl) {
      audio.src = track.previewUrl;
      audio.play().catch(() => {});
    } else {
      // No preview available — just update UI
      audio.pause();
      isPlaying = false;
      updatePlayBtn();
    }
  }

  function setQueue(tracks, startIdx = 0) {
    queue = tracks;
    if (queue[startIdx]) {
      currentIdx = startIdx;
      playTrack(queue[startIdx]);
    }
    saveState();
  }

  function toggle() {
    if (!audio.src && queue[currentIdx]?.previewUrl) {
      audio.src = queue[currentIdx].previewUrl;
    }
    if (isPlaying) { audio.pause(); } else { audio.play().catch(() => {}); }
  }

  function next() {
    if (currentIdx < queue.length - 1) {
      currentIdx++;
      playTrack(queue[currentIdx]);
    }
  }

  function prev() {
    if (currentIdx > 0) {
      currentIdx--;
      playTrack(queue[currentIdx]);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { playTrack, setQueue, toggle, next, prev };
})();
