/* ============================================
   Before The Data — Content Gate
   Three tiers:
     1. No email  -> email capture (inline or archive)
     2. Free      -> 2 reads/day, then upgrade modal
     3. Paid      -> full access, no gates
   ============================================ */

const BTDGate = (() => {
  // localStorage keys
  const KEY_EMAIL        = 'btd_email';
  const KEY_TIER         = 'btd_tier';
  const KEY_DAILY        = 'btd_daily_reads';

  // Paid tiers that bypass all gates
  const PAID_TIERS = ['heard-first', 'pro'];

  const FIREBASE_KEY  = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
  const FIREBASE_BASE = 'https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getEmail() {
    try { return localStorage.getItem(KEY_EMAIL) || ''; } catch(e) { return ''; }
  }

  function setEmail(email) {
    try { localStorage.setItem(KEY_EMAIL, email); } catch(e) {}
  }

  function getTier() {
    try {
      const t = localStorage.getItem(KEY_TIER);
      if (t) return t;
      // Fallback: infer from dashboard tokens if btd_tier not set
      if (localStorage.getItem('btd_pro_token')) return 'pro';
      if (localStorage.getItem('btd_hf_token')) return 'heard-first';
      return 'free';
    } catch(e) { return 'free'; }
  }

  function setTier(tier) {
    try { localStorage.setItem(KEY_TIER, tier); } catch(e) {}
  }

  function isPaid() {
    return PAID_TIERS.includes(getTier());
  }

  // Daily read tracking: { date: "YYYY-MM-DD", count: N }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function getDailyReads() {
    try {
      const raw = localStorage.getItem(KEY_DAILY);
      if (!raw) return { date: todayStr(), count: 0 };
      const obj = JSON.parse(raw);
      if (obj.date !== todayStr()) return { date: todayStr(), count: 0 };
      return obj;
    } catch(e) { return { date: todayStr(), count: 0 }; }
  }

  function incrementDailyReads() {
    try {
      const dr = getDailyReads();
      dr.count += 1;
      localStorage.setItem(KEY_DAILY, JSON.stringify(dr));
    } catch(e) {}
  }

  // Returns year of post (from publishedAt which can be {seconds:N} or ISO string)
  function postYear(post) {
    if (!post || !post.publishedAt) return new Date().getFullYear();
    const pa = post.publishedAt;
    if (typeof pa === 'object' && pa.seconds) {
      return new Date(pa.seconds * 1000).getFullYear();
    }
    if (typeof pa === 'string') {
      return new Date(pa).getFullYear();
    }
    return new Date().getFullYear();
  }

  function isArchivePost(post) {
    return postYear(post) <= 2023;
  }

  // Check Firebase for subscriber record to get stored tier
  async function lookupSubscriber(email) {
    try {
      const id = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const res = await fetch(
        `${FIREBASE_BASE}/config/btd_sub_${id}?key=${FIREBASE_KEY}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      const tier = data.fields?.tier?.stringValue || 'free';
      return { found: true, tier };
    } catch(e) { return null; }
  }

  // Subscribe via Netlify function (fire and forget)
  function netlifySubscribe(email) {
    fetch('/.netlify/functions/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).catch(() => {});
  }

  // ── Gate styles ────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('btd-gate-styles')) return;
    const style = document.createElement('style');
    style.id = 'btd-gate-styles';
    style.textContent = `
      /* ── Inline email prompt (soft gate above content) ── */
      #btd-inline-gate {
        background: #fff;
        border: 1.5px solid #e0e0e0;
        padding: 32px 28px;
        margin: 0 0 28px;
        text-align: center;
      }
      #btd-inline-gate .ig-logo {
        margin: 0 auto 16px;
      }
      #btd-inline-gate .ig-headline {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 28px; font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #000; margin: 0 0 8px; line-height: 1;
      }
      #btd-inline-gate .ig-sub {
        font-size: 14px; color: #444;
        line-height: 1.6; margin: 0 0 20px;
      }
      #btd-inline-gate .ig-form {
        display: flex; flex-direction: column; gap: 10px;
        max-width: 360px; margin: 0 auto 10px;
      }
      #btd-inline-gate .ig-input {
        width: 100%; padding: 12px 14px;
        border: 1.5px solid #e0e0e0;
        font-size: 14px; font-family: inherit;
        outline: none; background: #fafafa;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      #btd-inline-gate .ig-input:focus { border-color: #000; background: #fff; }
      #btd-inline-gate .ig-submit {
        width: 100%; padding: 12px;
        background: #000; color: #fff;
        font-size: 13px; font-weight: 700;
        letter-spacing: 1.5px; text-transform: uppercase;
        cursor: pointer; border: none;
        font-family: inherit;
        transition: background 0.15s;
      }
      #btd-inline-gate .ig-submit:hover { background: #222; }
      #btd-inline-gate .ig-submit:disabled { opacity: 0.6; cursor: default; }
      #btd-inline-gate .ig-fine {
        font-size: 11px; color: #999; margin: 0;
      }

      /* ── Upgrade modal (free limit hit) ── */
      #btd-upgrade-modal {
        display: none;
        position: fixed; inset: 0; z-index: 9999;
        align-items: center; justify-content: center;
      }
      #btd-upgrade-modal.visible { display: flex; }
      #btd-upgrade-modal .um-backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(4px);
      }
      #btd-upgrade-modal .um-card {
        position: relative; z-index: 1;
        background: #fff;
        width: 100%; max-width: 440px;
        margin: 16px;
        overflow: hidden;
      }
      #btd-upgrade-modal .um-top-bar {
        height: 4px;
        background: #000;
      }
      #btd-upgrade-modal .um-body {
        padding: 36px 32px;
      }
      #btd-upgrade-modal .um-logo {
        margin-bottom: 16px;
      }
      #btd-upgrade-modal .um-headline {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 36px; font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #000; margin: 0 0 10px; line-height: 1;
      }
      #btd-upgrade-modal .um-sub {
        font-size: 14px; color: #444;
        line-height: 1.6; margin: 0 0 24px;
      }
      #btd-upgrade-modal .um-plans {
        display: flex; flex-direction: column; gap: 12px;
        margin-bottom: 24px;
      }
      #btd-upgrade-modal .um-plan {
        border: 1.5px solid #e0e0e0;
        padding: 16px;
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px;
      }
      #btd-upgrade-modal .um-plan.um-plan-pro {
        border-color: #000;
        background: #000;
        color: #fff;
      }
      #btd-upgrade-modal .um-plan-name {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 18px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .5px;
      }
      #btd-upgrade-modal .um-plan.um-plan-pro .um-plan-name { color: #fff; }
      #btd-upgrade-modal .um-plan-desc {
        font-size: 12px; color: #666; margin-top: 2px; line-height: 1.4;
      }
      #btd-upgrade-modal .um-plan.um-plan-pro .um-plan-desc { color: #aaa; }
      #btd-upgrade-modal .um-plan-price {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 20px; font-weight: 700;
        white-space: nowrap; flex-shrink: 0;
      }
      #btd-upgrade-modal .um-plan.um-plan-pro .um-plan-price { color: #fff; }
      #btd-upgrade-modal .um-cta {
        display: block; width: 100%; padding: 14px;
        background: #000; color: #fff;
        font-size: 13px; font-weight: 700;
        letter-spacing: 1.5px; text-transform: uppercase;
        text-align: center; text-decoration: none;
        border: none; font-family: inherit;
        cursor: pointer; box-sizing: border-box;
        transition: background 0.15s;
      }
      #btd-upgrade-modal .um-cta:hover { background: #222; }
      #btd-upgrade-modal .um-fine {
        font-size: 11px; color: #999;
        text-align: center; margin-top: 10px;
      }

      /* Blur gate — content visible but blurred, modal floats over */
      .btd-content-hidden {
        display: block !important;
        filter: blur(6px);
        pointer-events: none;
        user-select: none;
        opacity: 0.5;
      }
      #btd-blur-gate-wrap {
        position: relative;
      }
      #btd-blur-gate-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 10;
        background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.95) 100%);
        pointer-events: none;
      }
      #btd-blur-gate-backdrop {
        position: fixed; inset: 0; z-index: 7999;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(2px);
      }
      #btd-blur-gate-modal {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        z-index: 8000;
        width: 92%;
        max-width: 440px;
        background: #fff;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        box-sizing: border-box;
        overflow: hidden;
      }
      #btd-blur-gate-modal .bgm-top-bar {
        height: 4px; background: #000;
      }
      #btd-blur-gate-modal .bgm-body {
        padding: 32px 28px 28px;
        text-align: center;
      }
      #btd-blur-gate-modal .bgm-logo {
        width: 28px; height: 28px; object-fit: contain;
        display: block; margin: 0 auto 16px;
      }
      #btd-blur-gate-modal .bgm-headline {
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 30px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 1px;
        color: #000; margin: 0 0 10px; line-height: 1;
      }
      #btd-blur-gate-modal .bgm-sub {
        font-size: 13px; color: #555;
        line-height: 1.6; margin: 0 0 22px;
      }
      #btd-blur-gate-modal .bgm-form {
        display: flex; flex-direction: column; gap: 10px;
      }
      #btd-blur-gate-modal .bgm-input {
        width: 100%; padding: 13px 14px;
        border: 1.5px solid #e0e0e0;
        font-size: 14px; font-family: inherit;
        outline: none; background: #fafafa;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      #btd-blur-gate-modal .bgm-input:focus { border-color: #000; background: #fff; }
      #btd-blur-gate-modal .bgm-submit {
        width: 100%; padding: 13px;
        background: #000; color: #fff;
        font-size: 11px; font-weight: 700;
        letter-spacing: 2px; text-transform: uppercase;
        border: none; cursor: pointer; font-family: inherit;
        transition: background 0.15s;
      }
      #btd-blur-gate-modal .bgm-submit:hover { background: #222; }
      #btd-blur-gate-modal .bgm-submit:disabled { opacity: 0.6; cursor: default; }
      #btd-blur-gate-modal .bgm-fine {
        font-size: 11px; color: #aaa; margin: 14px 0 0;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Blur gate — wraps gated content, floats modal over blur ──────────────

  function buildBlurGate(post, gatedEls, onUnlock) {
    const isArchive = isArchivePost(post);
    const headline = isArchive ? 'Sign up free to keep reading.' : 'Enter your email to keep reading.';
    const subtext = isArchive
      ? 'This post is from the Before The Data archive. Sign up free to explore 19 years of music discovery.'
      : 'Free music discovery. No spam. Unsubscribe anytime.';

    // Wrap gated elements in a relative container
    const firstEl = gatedEls.find(el => el && el.parentElement);
    if (!firstEl) return;

    const wrap = document.createElement('div');
    wrap.id = 'btd-blur-gate-wrap';

    // Insert wrap before first gated element
    firstEl.parentElement.insertBefore(wrap, firstEl);

    // Move all gated els into wrap, blurred
    gatedEls.forEach(el => {
      if (el) {
        el.classList.add('btd-content-hidden');
        wrap.appendChild(el);
      }
    });

    // Gradient fade overlay
    const overlay = document.createElement('div');
    overlay.id = 'btd-blur-gate-overlay';
    wrap.appendChild(overlay);

    // Backdrop (fixed, full screen, behind modal)
    const backdrop = document.createElement('div');
    backdrop.id = 'btd-blur-gate-backdrop';
    document.body.appendChild(backdrop);

    // Modal on document.body (fixed positioning breaks inside filtered parents on iOS)
    const modal = document.createElement('div');
    modal.id = 'btd-blur-gate-modal';
    modal.innerHTML = `
      <div class="bgm-top-bar"></div>
      <div class="bgm-body">
        <img src="/assets/brand/logo-black-mark.png" alt="BTD" class="bgm-logo">
        <h2 class="bgm-headline">${headline}</h2>
        <p class="bgm-sub">${subtext}</p>
        <form class="bgm-form" id="btd-ig-form">
          <input type="email" class="bgm-input" id="btd-ig-email"
            placeholder="your@email.com" required autocomplete="email">
          <button type="submit" class="bgm-submit">Continue &rarr;</button>
        </form>
        <p class="bgm-fine">No spam &middot; Unsubscribe anytime</p>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btd-ig-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailVal = modal.querySelector('#btd-ig-email').value.trim();
      if (!emailVal) return;
      const btn = modal.querySelector('.bgm-submit');
      btn.textContent = 'Checking...';
      btn.disabled = true;

      const existing = await lookupSubscriber(emailVal);
      const tier = existing ? existing.tier : 'free';
      setEmail(emailVal);
      setTier(tier);
      netlifySubscribe(emailVal);

      // Show brief success then reload so content unlocks cleanly
      btn.textContent = tier === 'pro' ? 'Welcome back, Pro member.' : tier === 'heard-first' ? 'Welcome back!' : 'You\'re in!';
      renderSidebarLogin();
      renderMobileAccountTab();
      setTimeout(() => { window.location.reload(); }, 900);
    });
  }

  // ── Upgrade modal ──────────────────────────────────────────────────────────

  let upgradeModalEl = null;

  function showUpgradeModal() {
    if (upgradeModalEl) {
      upgradeModalEl.classList.add('visible');
      return;
    }

    const el = document.createElement('div');
    el.id = 'btd-upgrade-modal';
    el.innerHTML = `
      <div class="um-backdrop"></div>
      <div class="um-card">
        <div class="um-top-bar"></div>
        <div class="um-body">
          <div class="um-logo">
            <img src="/assets/brand/logo-black-mark.png" alt="BTD" width="28">
          </div>
          <h2 class="um-headline">Upgrade to keep reading.</h2>
          <p class="um-sub">You've read your 2 free posts for today. Upgrade to Heard First for unlimited access to every post, past and present.</p>
          <div class="um-plans">
            <div class="um-plan">
              <div>
                <div class="um-plan-name">Heard First</div>
                <div class="um-plan-desc">Unlimited reads, early access, archive access, search by city.</div>
              </div>
              <div class="um-plan-price">$9/mo</div>
            </div>
            <div class="um-plan um-plan-pro">
              <div>
                <div class="um-plan-name">Heard First Pro</div>
                <div class="um-plan-desc">Everything plus live scouting dashboard, A&amp;R data, and city search.</div>
              </div>
              <div class="um-plan-price">$49.99/mo</div>
            </div>
          </div>
          <a href="/heard-first" class="um-cta">See Plans</a>
          <p class="um-fine">Cancel anytime. No contracts.</p>
          <p class="um-fine" style="margin-top:12px;">Or <a href="/archive" style="color:#000000;font-weight:600;text-decoration:underline;">browse the archive</a> to explore 19 years of music discovery.</p>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    el.querySelector('.um-backdrop').addEventListener('click', () => {
      // Don't allow dismissal -- content stays hidden
    });

    upgradeModalEl = el;
    requestAnimationFrame(() => el.classList.add('visible'));
  }

  // ── Main entry point ───────────────────────────────────────────────────────
  // Called from renderPost() after post data is loaded.
  // post: the post object (needs publishedAt)
  // gatedEls: array of DOM elements to hide when gate is active
  // insertBeforeEl: element to insert the inline gate prompt before

  function initPostGate(post, gatedEls, insertBeforeEl) {
    injectStyles();

    function hideGated() {
      gatedEls.forEach(el => el && el.classList.add('btd-content-hidden'));
    }
    function showGated() {
      gatedEls.forEach(el => el && el.classList.remove('btd-content-hidden'));
    }

    // Paid tier -- full access, no gate
    if (isPaid()) {
      return;
    }

    const email = getEmail();

    // ── No email — blur gate ─────────────────────────────────────────────────
    if (!email) {
      buildBlurGate(post, gatedEls, () => {
        if (!isPaid()) incrementDailyReads();
      });
      return;
    }

    // ── Has email — archive posts are fully unlocked (no daily limit) ───────
    if (isArchivePost(post)) {
      // Email = full archive access. Don't gate, don't count.
      return;
    }

    // ── Has email but free/no tier — apply daily limit to new posts ──────────
    const dr = getDailyReads();
    if (dr.count >= 2) {
      // Hit daily limit -- show upgrade modal, hide content
      hideGated();
      showUpgradeModal();
      return;
    }

    // Under the limit -- allow read, increment counter
    incrementDailyReads();
  }

  // ── Legacy: checkGate (used by Player for play gating) ────────────────────
  // Keep this so Player doesn't break if it still references BTDGate.checkGate

  function isSubscribed() {
    try { return !!localStorage.getItem(KEY_EMAIL); } catch(e) { return false; }
  }

  function checkGate() {
    return true; // play gating removed; content gate handles access
  }

  // ── Search gate ──────────────────────────────────────────────────────────
  // If user has no email, intercept search focus/input and show signup prompt

  function initSearchGate() {
    const inputs = [
      document.getElementById('search-input'),
      document.getElementById('mobile-search-input'),
    ].filter(Boolean);

    if (!inputs.length) return;
    if (getEmail()) return; // already signed up, no gate needed

    inputs.forEach(input => {
      input.addEventListener('focus', function onFocus() {
        if (getEmail()) return;
        input.blur();
        // Use unified auth modal, refocus search on success
        const origOpen = openAuthModal;
        openAuthModal({ onSuccess: () => { setTimeout(() => input.focus(), 100); } });
      }, { once: false });
    });
  }

  function showSearchSignupPrompt(nearEl) {
    if (document.getElementById('btd-search-gate')) return; // already showing

    const el = document.createElement('div');
    el.id = 'btd-search-gate';
    el.innerHTML = `
      <style>
        #btd-search-gate {
          position: fixed; inset: 0; z-index: 9000;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.55);
        }
        #btd-search-gate .sg-card {
          background: #fff; color: #000;
          padding: 36px 32px; max-width: 400px; width: 90%;
          text-align: center;
        }
        #btd-search-gate .sg-headline {
          font-size: 22px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 1px; margin: 0 0 10px;
        }
        #btd-search-gate .sg-sub {
          font-size: 14px; color: #555; line-height: 1.6; margin: 0 0 24px;
        }
        #btd-search-gate .sg-form {
          display: flex; flex-direction: column; gap: 10px;
        }
        #btd-search-gate .sg-input {
          padding: 12px 14px; border: 1px solid #ccc;
          font-size: 14px; outline: none; width: 100%; box-sizing: border-box;
        }
        #btd-search-gate .sg-input:focus { border-color: #000; }
        #btd-search-gate .sg-btn {
          padding: 13px; background: #000; color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; border: none; cursor: pointer;
        }
        #btd-search-gate .sg-btn:hover { background: #222; }
        #btd-search-gate .sg-dismiss {
          margin-top: 14px; font-size: 12px; color: #999; cursor: pointer;
          text-decoration: underline; background: none; border: none;
        }
      </style>
      <div class="sg-card">
        <p class="sg-headline">Search the catalog</p>
        <p class="sg-sub">19 years of music discovery, all searchable. Free to sign up.</p>
        <div class="sg-form">
          <input class="sg-input" id="sg-email-input" type="email" placeholder="Your email address" autocomplete="email">
          <button class="sg-btn" id="sg-submit-btn">Unlock Search &#x2192;</button>
        </div>
        <button class="sg-dismiss" id="sg-dismiss-btn">Maybe later</button>
      </div>
    `;
    document.body.appendChild(el);

    const emailInput = el.querySelector('#sg-email-input');
    const submitBtn  = el.querySelector('#sg-submit-btn');
    const dismissBtn = el.querySelector('#sg-dismiss-btn');

    emailInput.focus();

    submitBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes('@')) {
        emailInput.style.borderColor = 'red';
        return;
      }
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      try {
        await fetch('/.netlify/functions/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'search-gate' }),
        });
      } catch(e) {}
      setEmail(email);
      el.remove();
      // Re-focus the original search input
      if (nearEl) { nearEl.focus(); }
    });

    dismissBtn.addEventListener('click', () => { el.remove(); });

    // Close on backdrop click
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  }

  // ── Site-wide auth: sidebar login block + auth modal ─────────────────────

  function getTierLabel(tier) {
    if (tier === 'pro') return 'Heard First Pro';
    if (tier === 'heard-first') return 'Heard First';
    return 'Free member';
  }

  function renderSidebarLogin() {
    const block = document.getElementById('sidebar-login-block');
    if (!block) return;
    const email = getEmail();
    const tier = getTier();
    if (email) {
      const isPaidTier = PAID_TIERS.includes(tier);
      block.innerHTML = `
        <div id="sidebar-account-info">
          <strong>${email}</strong>
          ${getTierLabel(tier)}
          <br>
          ${isPaidTier ? `<a href="#" onclick="BTDGate.openPortal(event,'${email.replace(/'/g,"\\'")}');" style="color:var(--tx-3);font-size:10px;text-decoration:underline;">Manage subscription</a> &middot; ` : ''}
          <button class="sidebar-logout" onclick="BTDGate.siteLogout()">Log out</button>
        </div>`;
    } else {
      block.innerHTML = `
        <button id="sidebar-login-btn" onclick="BTDGate.openAuthModal()">
          <span class="login-icon">&#x2192;</span> Log in / Sign up
        </button>`;
    }
  }

  function openAuthModal(opts) {
    let modal = document.getElementById('btd-auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'btd-auth-modal';
      modal.innerHTML = `
        <div class="am-card">
          <p class="am-title" id="am-title">Sign in</p>
          <p class="am-sub" id="am-sub">Enter your email to access the archive, search, and more.</p>
          <input class="am-input" id="am-email-input" type="email" placeholder="Your email address" autocomplete="email">
          <button class="am-btn" id="am-submit-btn">Continue &#x2192;</button>
          <p class="am-note">New? We will create a free account. Already a Heard First member? You will be recognised automatically.</p>
          <button class="am-dismiss" id="am-dismiss-btn">Maybe later</button>
        </div>`;
      document.body.appendChild(modal);

      document.getElementById('am-dismiss-btn').addEventListener('click', () => {
        modal.classList.remove('visible');
      });
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });

      document.getElementById('am-submit-btn').addEventListener('click', async () => {
        const emailVal = document.getElementById('am-email-input').value.trim();
        if (!emailVal || !emailVal.includes('@')) {
          document.getElementById('am-email-input').style.borderColor = 'red';
          return;
        }
        const btn = document.getElementById('am-submit-btn');
        btn.textContent = 'Checking...';
        btn.disabled = true;

        // Check if existing subscriber in Firebase
        const safeEmail = emailVal.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const FIREBASE_KEY = 'AIzaSyAI2Nrt4PsnOB0DyLa4yrWYyY39Oblzcec';
        let tier = 'free';
        try {
          const r = await fetch(`https://firestore.googleapis.com/v1/projects/ar-scouting-dashboard/databases/(default)/documents/config/btd_sub_${safeEmail}?key=${FIREBASE_KEY}`);
          if (r.ok) {
            const d = await r.json();
            if (d.fields?.tier?.stringValue) tier = d.fields.tier.stringValue;
          }
        } catch(e) {}

        // Save to localStorage
        setEmail(emailVal);
        try { localStorage.setItem(KEY_TIER, tier); } catch(e) {}

        // If new free user — call subscribe to send welcome email
        if (tier === 'free') {
          try {
            await fetch('/.netlify/functions/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailVal, source: 'site-login' }),
            });
          } catch(e) {}
        }

        // Show success
        const card = modal.querySelector('.am-card');
        card.innerHTML = `
          <div class="am-success">
            <p style="font-size:22px;margin:0 0 12px;">&#x2713;</p>
            <p>${tier === 'pro' ? 'Welcome back, Pro member.' : tier === 'heard-first' ? 'Welcome back, Heard First member.' : 'You\'re in. Welcome to Before The Data.'}</p>
          </div>`;
        // Update UI immediately (don't wait for close animation)
        renderSidebarLogin();
        renderMobileAccountTab();

        setTimeout(() => {
          modal.classList.remove('visible');
          // Reload page so gated content unlocks and sidebar shows correct state
          window.location.reload();
        }, 1200);
      });
    }
    modal.classList.add('visible');
    setTimeout(() => document.getElementById('am-email-input')?.focus(), 50);
  }

  function siteLogout() {
    try {
      localStorage.removeItem(KEY_EMAIL);
      localStorage.removeItem(KEY_TIER);
      localStorage.removeItem('btd_pro_token');
      localStorage.removeItem('btd_pro_email');
      localStorage.removeItem('btd_hf_token');
      localStorage.removeItem('btd_hf_email');
      localStorage.removeItem('btd_hf_tier');
    } catch(e) {}
    renderSidebarLogin();
  }

  function initSiteAuth() {
    // Backfill btd_tier from dashboard tokens if missing
    try {
      if (!localStorage.getItem(KEY_TIER)) {
        if (localStorage.getItem('btd_pro_token')) {
          localStorage.setItem(KEY_TIER, 'pro');
          const proEmail = localStorage.getItem('btd_pro_email');
          if (proEmail && !localStorage.getItem(KEY_EMAIL)) localStorage.setItem(KEY_EMAIL, proEmail);
        } else if (localStorage.getItem('btd_hf_token')) {
          const hfTier = localStorage.getItem('btd_hf_tier') || 'heard-first';
          localStorage.setItem(KEY_TIER, hfTier);
          const hfEmail = localStorage.getItem('btd_hf_email');
          if (hfEmail && !localStorage.getItem(KEY_EMAIL)) localStorage.setItem(KEY_EMAIL, hfEmail);
        }
      }
    } catch(e) {}

    // Inject sidebar login block before sidebar-footer if not already in HTML
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !document.getElementById('sidebar-login-block')) {
      const footer = sidebar.querySelector('.sidebar-footer');
      const block = document.createElement('div');
      block.id = 'sidebar-login-block';
      if (footer) sidebar.insertBefore(block, footer);
      else sidebar.appendChild(block);
    }
    renderSidebarLogin();

    // Mobile account tab — inject into bottom nav
    injectMobileAccountTab();
  }

  function injectMobileAccountTab() {
    // Only inject on mobile viewports
    if (window.innerWidth > 767) return;
    const nav = document.querySelector('#sidebar nav');
    if (!nav) return;
    if (document.getElementById('btd-mobile-account-tab')) return;

    const tab = document.createElement('a');
    tab.id = 'btd-mobile-account-tab';
    tab.href = '#';
    tab.setAttribute('aria-label', 'Account');
    tab.innerHTML = `<span class="nav-icon" id="btd-acct-icon">&#x1F464;</span><span id="btd-acct-label">Account</span>`;
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const email = getEmail();
      if (!email) { openAuthModal(); return; }
      showMobileAccountSheet();
    });
    nav.appendChild(tab);
    renderMobileAccountTab();
  }

  function renderMobileAccountTab() {
    const icon = document.getElementById('btd-acct-icon');
    const label = document.getElementById('btd-acct-label');
    if (!icon || !label) return;
    const email = getEmail();
    if (email) {
      icon.textContent = email.charAt(0).toUpperCase();
      icon.style.cssText = 'width:22px;height:22px;border-radius:50%;background:#111;color:#fff;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;';
      label.textContent = 'Account';
    } else {
      icon.style.cssText = '';
      icon.innerHTML = '&#x1F464;';
      label.textContent = 'Log in';
    }
  }

  function showMobileAccountSheet() {
    let sheet = document.getElementById('btd-account-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'btd-account-sheet';
      // Styles injected inline so they work without CSS file changes
      sheet.style.cssText = `
        position:fixed;bottom:60px;left:0;right:0;z-index:500;
        background:#fff;border-top:1px solid #e0e0e0;
        padding:20px 24px;box-shadow:0 -4px 20px rgba(0,0,0,.1);
      `;
      document.body.appendChild(sheet);
      document.addEventListener('click', (e) => {
        if (!sheet.contains(e.target) && e.target.id !== 'btd-mobile-account-tab') {
          sheet.style.display = 'none';
        }
      });
    }
    const email = getEmail();
    const tier = getTier();
    const isPaidTier = PAID_TIERS.includes(tier);
    sheet.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:2px;">${email}</div>
      <div style="font-size:11px;color:#888;margin-bottom:16px;">${getTierLabel(tier)}</div>
      ${isPaidTier ? `<a href="#" onclick="BTDGate.openPortal(event,'${email.replace(/'/g,"\\'")}');" style="display:block;font-size:13px;color:#111;text-decoration:none;font-weight:600;padding:10px 0;border-top:1px solid #f0f0f0;">Manage subscription &rarr;</a>` : ''}
      <button onclick="BTDGate.siteLogout();document.getElementById('btd-account-sheet').style.display='none';BTDGate.renderMobileAccountTab();" style="display:block;width:100%;text-align:left;font-size:13px;color:#888;background:none;border:none;border-top:1px solid #f0f0f0;padding:10px 0;cursor:pointer;">Log out</button>
    `;
    sheet.style.display = 'block';
  }

  function renderMobileTopBar() {
    const btn = document.getElementById('mtb-account-btn');
    if (!btn) return;
    const email = getEmail();
    const tier = getTier();
    if (email) {
      btn.textContent = email.charAt(0).toUpperCase();
      btn.classList.add('logged-in');
      btn.title = email;
    } else {
      btn.innerHTML = '&#x1F464;';
      btn.classList.remove('logged-in');
      btn.title = 'Log in';
    }
    // Remove old listener by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!getEmail()) { openAuthModal(); return; }
      // Toggle dropdown
      let menu = document.getElementById('btd-mobile-account-menu');
      if (!menu) {
        menu = document.createElement('div');
        menu.id = 'btd-mobile-account-menu';
        document.body.appendChild(menu);
        document.addEventListener('click', () => menu.classList.remove('visible'));
      }
      const isPaidTier = PAID_TIERS.includes(tier);
      menu.innerHTML = `
        <div class="mam-email">${getEmail()}</div>
        <div class="mam-tier">${getTierLabel(tier)}</div>
        ${isPaidTier ? `<a href="#" onclick="BTDGate.openPortal(event,'${getEmail().replace(/'/g,"\\'")}');">Manage subscription</a>` : ''}
        <button onclick="BTDGate.siteLogout();document.getElementById('btd-mobile-account-menu').classList.remove('visible');BTDGate.renderMobileTopBar()">Log out</button>`;
      menu.classList.toggle('visible');
    });
  }

  async function openPortal(e, email) {
    e.preventDefault();
    try {
      const r = await fetch('/.netlify/functions/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const d = await r.json();
      if (d.url) { window.location.href = d.url; }
      else { alert('Could not open billing portal. Please contact support.'); }
    } catch(err) {
      alert('Could not open billing portal. Please try again.');
    }
  }

  return { initPostGate, initSearchGate, initSiteAuth, openAuthModal, openPortal, siteLogout, renderMobileAccountTab, checkGate, isSubscribed };
})();
