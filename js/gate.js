/* ============================================
   Before The Data — Email Gate
   One free play, then email capture modal
   ============================================ */

const BTDGate = (() => {
  const STORAGE_KEY = 'btd_plays';
  const SUBSCRIBER_KEY = 'btd_subscriber';
  const FREE_PLAYS = 1;
  const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
  const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';

  let modalEl = null;

  function getPlays() {
    try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0'); } catch(e) { return 0; }
  }

  function incrementPlays() {
    try { localStorage.setItem(STORAGE_KEY, getPlays() + 1); } catch(e) {}
  }

  function isSubscribed() {
    try { return !!localStorage.getItem(SUBSCRIBER_KEY); } catch(e) { return false; }
  }

  function markSubscribed(email, tier) {
    try {
      localStorage.setItem(SUBSCRIBER_KEY, email);
      if (tier) localStorage.setItem('btd_tier', tier);
    } catch(e) {}
  }

  function getStoredTier() {
    try { return localStorage.getItem('btd_tier') || 'free'; } catch(e) { return 'free'; }
  }

  // Check Firebase for existing subscriber — returns { found, tier } or null
  async function lookupSubscriber(email) {
    try {
      const id = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const res = await fetch(`${FIREBASE_BASE}/config/btd_sub_${id}?key=${FIREBASE_KEY}`);
      if (!res.ok) return null;
      const data = await res.json();
      const tier = data.fields?.tier?.stringValue || 'free';
      return { found: true, tier };
    } catch(e) { return null; }
  }

  function createModal() {
    const el = document.createElement('div');
    el.id = 'btd-gate-modal';
    el.innerHTML = `
      <div class="gate-backdrop"></div>
      <div class="gate-card">
        <div class="gate-art-strip"></div>
        <div class="gate-body">
          <div class="gate-logo">
            <img src="/assets/brand/logo-black-mark.png" alt="BTD" width="32">
          </div>
          <h2 class="gate-headline">Enter your email.</h2>
          <p class="gate-sub">Already a member? Enter your email to get back in. New here? Enter your email to get access. Free.</p>
          <form class="gate-form" id="btd-gate-form">
            <input type="email" class="gate-input" id="gate-email" placeholder="your@email.com" required autocomplete="email">
            <button type="submit" class="gate-submit">Continue →</button>
          </form>
          <p class="gate-fine">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector('.gate-backdrop').addEventListener('click', () => hideModal());

    el.querySelector('#btd-gate-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = el.querySelector('#gate-email').value.trim();
      if (!email) return;
      await submitEmail(email, el);
    });

    modalEl = el;
    return el;
  }

  function showModal() {
    if (!modalEl) createModal();
    modalEl.classList.add('visible');
    document.body.style.overflow = 'hidden';
    setTimeout(() => modalEl.querySelector('#gate-email')?.focus(), 100);
  }

  function hideModal() {
    if (modalEl) modalEl.classList.remove('visible');
    document.body.style.overflow = '';
  }

  async function submitEmail(email, el) {
    const btn = el.querySelector('.gate-submit');
    btn.textContent = 'Checking...';
    btn.disabled = true;

    try {
      // Check Firebase first — existing subscriber?
      const existing = await lookupSubscriber(email);

      if (existing) {
        // Returning subscriber — just let them in, no welcome email
        markSubscribed(email, existing.tier);
        const greeting = existing.tier === 'paid'
          ? `<h2 class="gate-headline">Welcome back.</h2><p class="gate-sub">You're a Heard First member. Full access unlocked.</p>`
          : `<h2 class="gate-headline">Welcome back.</h2><p class="gate-sub">Good to see you. Keep listening.</p>`;
        el.querySelector('.gate-body').innerHTML = `
          <div class="gate-logo"><img src="/assets/brand/logo-black-mark.png" alt="BTD" width="32"></div>
          ${greeting}
          <button class="gate-submit" id="gate-close-btn">Keep Listening →</button>
        `;
        el.querySelector('#gate-close-btn').addEventListener('click', () => hideModal());
        return;
      }

      // New subscriber — save to Firebase + send welcome email
      const id = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      await fetch(`${FIREBASE_BASE}/config/btd_sub_${id}?key=${FIREBASE_KEY}&updateMask.fieldPaths=email&updateMask.fieldPaths=subscribedAt&updateMask.fieldPaths=source&updateMask.fieldPaths=tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          email: { stringValue: email },
          subscribedAt: { stringValue: new Date().toISOString() },
          source: { stringValue: 'play-gate' },
          tier: { stringValue: 'free' }
        }})
      });

      // Send welcome email (fire and forget)
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).catch(() => {});

      markSubscribed(email, 'free');
      el.querySelector('.gate-body').innerHTML = `
        <div class="gate-logo"><img src="/assets/brand/logo-black-mark.png" alt="BTD" width="32"></div>
        <h2 class="gate-headline">You're in.</h2>
        <p class="gate-sub">Check your inbox. Every pick comes to you first. Before the blogs, before the playlists, before anyone else.</p>
        <button class="gate-submit" id="gate-close-btn">Keep Listening →</button>
      `;
      el.querySelector('#gate-close-btn').addEventListener('click', () => hideModal());
    } catch(err) {
      btn.textContent = 'Get Access';
      btn.disabled = false;
      console.warn('[BTD Gate] Submit failed:', err);
      markSubscribed(email, 'free');
      hideModal();
    }
  }

  // Called by Player before each play
  function checkGate() {
    if (isSubscribed()) return true; // already in, always allow
    const plays = getPlays();
    if (plays < FREE_PLAYS) {
      incrementPlays();
      return true; // allow play
    }
    // Over limit — show gate
    showModal();
    return false; // block play
  }

  // Inject styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #btd-gate-modal {
        display: none;
        position: fixed; inset: 0; z-index: 9999;
        align-items: center; justify-content: center;
      }
      #btd-gate-modal.visible { display: flex; }
      .gate-backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(4px);
      }
      .gate-card {
        position: relative; z-index: 1;
        background: #ffffff;
        width: 100%; max-width: 420px;
        margin: 16px;
        overflow: hidden;
      }
      .gate-art-strip {
        height: 4px;
        background: #000000;
      }
      .gate-body {
        padding: 40px 36px;
      }
      .gate-logo {
        margin-bottom: 20px;
      }
      .gate-headline {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 42px; font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #000; margin: 0 0 10px;
        line-height: 1;
      }
      .gate-sub {
        font-size: 14px; color: #444;
        line-height: 1.6; margin: 0 0 12px;
      }
      .gate-sub2 {
        font-size: 14px; font-weight: 700; color: #000;
        line-height: 1.5; margin: 0 0 24px;
      }
      .gate-form {
        display: flex; flex-direction: column; gap: 10px;
        margin-bottom: 14px;
      }
      .gate-input {
        width: 100%; padding: 13px 16px;
        border: 1.5px solid #e0e0e0;
        font-size: 14px; font-family: inherit;
        outline: none; background: #fafafa;
        transition: border-color 0.15s;
        box-sizing: border-box;
      }
      .gate-input:focus { border-color: #000; background: #fff; }
      .gate-submit {
        width: 100%; padding: 13px;
        background: #000; color: #fff;
        font-size: 13px; font-weight: 700;
        letter-spacing: 1.5px; text-transform: uppercase;
        cursor: pointer; border: none;
        font-family: inherit;
        transition: background 0.15s;
      }
      .gate-submit:hover { background: #222; }
      .gate-submit:disabled { opacity: 0.6; cursor: default; }
      .gate-fine {
        font-size: 11px; color: #999;
        line-height: 1.5; margin: 0;
      }
      .gate-fine a { color: #000; text-decoration: underline; }
    `;
    document.head.appendChild(style);
  }

  injectStyles();

  return { checkGate, isSubscribed };
})();
