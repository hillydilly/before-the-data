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

      /* Content hidden until gate cleared */
      .btd-content-hidden {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Inline email gate ──────────────────────────────────────────────────────

  function buildInlineGate(post, onUnlock) {
    const isArchive = isArchivePost(post);

    const el = document.createElement('div');
    el.id = 'btd-inline-gate';

    const headline = isArchive
      ? 'Sign up free to keep reading.'
      : 'Enter your email to keep reading.';

    const subtext = isArchive
      ? 'This post is from the Before The Data archive. Sign up free to explore 19 years of music discovery.'
      : 'Free music discovery. No spam. Unsubscribe anytime.';

    el.innerHTML = `
      <div class="ig-logo">
        <img src="/assets/brand/logo-black-mark.png" alt="BTD" width="28">
      </div>
      <h2 class="ig-headline">${headline}</h2>
      <p class="ig-sub">${subtext}</p>
      <form class="ig-form" id="btd-ig-form">
        <input type="email" class="ig-input" id="btd-ig-email"
          placeholder="your@email.com" required autocomplete="email">
        <button type="submit" class="ig-submit">Continue</button>
      </form>
      <p class="ig-fine">No spam. Unsubscribe anytime.</p>
    `;

    el.querySelector('#btd-ig-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = el.querySelector('#btd-ig-email').value.trim();
      if (!email) return;
      const btn = el.querySelector('.ig-submit');
      btn.textContent = 'Checking...';
      btn.disabled = true;

      // Check Firebase for existing record
      const existing = await lookupSubscriber(email);
      const tier = existing ? existing.tier : 'free';

      setEmail(email);
      setTier(tier);

      // Subscribe via Netlify function
      netlifySubscribe(email);

      // Unlock content
      el.remove();
      onUnlock();
    });

    return el;
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

    // ── No email ────────────────────────────────────────────────────────────
    if (!email) {
      hideGated();

      const gateEl = buildInlineGate(post, () => {
        showGated();
        // Count this read for free tier
        if (!isPaid()) incrementDailyReads();
      });

      if (insertBeforeEl && insertBeforeEl.parentElement) {
        insertBeforeEl.parentElement.insertBefore(gateEl, insertBeforeEl);
      } else {
        document.getElementById('post-content')?.appendChild(gateEl);
      }
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
          ${isPaidTier ? `<a href="/api/customer-portal?email=${encodeURIComponent(email)}" style="color:var(--tx-3);font-size:10px;text-decoration:underline;">Manage subscription</a> &middot; ` : ''}
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
        setTimeout(() => {
          modal.classList.remove('visible');
          renderSidebarLogin();
        }, 1800);
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
  }

  return { initPostGate, initSearchGate, initSiteAuth, openAuthModal, siteLogout, checkGate, isSubscribed };
})();
