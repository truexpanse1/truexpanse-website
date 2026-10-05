/* ──────────────────────────────────────────────────────────────
   TrueXpanse Lead-Magnet Popup — "The Revenue Leak Checklist"
   Self-contained: injects HTML + scoped CSS + behavior.
   - Slides into bottom-right (full-width bottom sheet on mobile).
   - Triggers on FIRST of: ~12s elapsed OR scroll past 45% of page.
   - X dismiss => 7-day quiet via localStorage tx_lm_dismissed.
   - Successful submit => tx_lm_done, never shown again.
   - Submits to Netlify form "lead-magnet" (same AJAX pattern as apply.html).
   - Opens /guides/revenue-leak-checklist.html in a new tab on submit.
   - Respects prefers-reduced-motion. Idempotent. Fails soft.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // ── Idempotency guard ──
  if (window.__txLeadMagnetLoaded) return;
  window.__txLeadMagnetLoaded = true;

  var DISMISS_KEY = 'tx_lm_dismissed';
  var DONE_KEY = 'tx_lm_done';
  var QUIET_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  var GUIDE_URL = '/guides/business-growth-checklist.html';

  // ── Safe localStorage helpers (private mode / disabled storage) ──
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

  // ── Should we show at all? ──
  function shouldShow() {
    if (lsGet(DONE_KEY)) return false;
    var d = lsGet(DISMISS_KEY);
    if (d) {
      var ts = parseInt(d, 10);
      if (!isNaN(ts) && (Date.now() - ts) < QUIET_MS) return false;
    }
    return true;
  }

  if (!shouldShow()) return;

  var prefersReduced = false;
  try {
    prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  // ── Scoped styles ──
  var css = [
    '#tx-lm-root{position:fixed;right:24px;bottom:24px;z-index:99999;width:340px;max-width:calc(100vw - 48px);',
    'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
    'opacity:0;transform:translateY(28px);pointer-events:none;}',
    '#tx-lm-root.tx-lm-anim{transition:opacity .45s ease,transform .45s cubic-bezier(.22,1,.36,1);}',
    '#tx-lm-root.tx-lm-show{opacity:1;transform:translateY(0);pointer-events:auto;}',
    '#tx-lm-card{position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:16px;',
    'box-shadow:0 24px 60px rgba(13,27,42,.22),0 6px 18px rgba(13,27,42,.10);overflow:hidden;}',
    '#tx-lm-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border:none;cursor:pointer;',
    'background:rgba(15,23,42,.05);color:#475569;border-radius:8px;font-size:18px;line-height:1;z-index:2;',
    'display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;}',
    '#tx-lm-close:hover{background:rgba(200,16,46,.10);color:#C8102E;}',
    '#tx-lm-close:focus-visible{outline:2px solid #C8102E;outline-offset:2px;}',
    '.tx-lm-body{padding:22px 20px 20px;}',
    '.tx-lm-top{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;}',
    '.tx-lm-cover{flex:0 0 64px;width:64px;height:84px;border-radius:6px;background:linear-gradient(150deg,#0D1B2A,#1e293b);',
    'box-shadow:0 6px 16px rgba(13,27,42,.30);position:relative;overflow:hidden;display:flex;flex-direction:column;',
    'justify-content:flex-end;padding:8px 7px;border-left:3px solid #C8102E;}',
    '.tx-lm-cover .tx-lm-cv-eyebrow{font-size:5px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:#ff8a96;margin-bottom:2px;}',
    '.tx-lm-cover .tx-lm-cv-title{font-size:8.5px;font-weight:900;line-height:1.05;color:#fff;text-transform:uppercase;letter-spacing:-.01em;}',
    '.tx-lm-eyebrow{font-size:.62rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#C8102E;margin-bottom:5px;}',
    '.tx-lm-headline{font-size:1.12rem;font-weight:900;line-height:1.12;color:#0f172a;letter-spacing:-.01em;margin-bottom:5px;}',
    '.tx-lm-subhead{font-size:.78rem;line-height:1.45;color:#64748b;}',
    '.tx-lm-field{margin-bottom:9px;}',
    '.tx-lm-field label{display:block;font-size:.68rem;font-weight:800;color:#0f172a;margin-bottom:4px;letter-spacing:.01em;}',
    '.tx-lm-field input{width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:9px;',
    'font-family:inherit;font-size:.88rem;color:#0f172a;background:#fff;transition:border-color .15s;}',
    '.tx-lm-field input:focus{outline:none;border-color:#C8102E;}',
    '#tx-lm-submit{width:100%;justify-content:center;display:inline-flex;align-items:center;gap:7px;',
    'font-weight:800;font-size:.86rem;letter-spacing:.02em;padding:12px 18px;border-radius:9px;cursor:pointer;',
    'border:none;background:#C8102E;color:#fff;transition:background .2s,transform .2s,box-shadow .2s;margin-top:3px;}',
    '#tx-lm-submit:hover{background:#a30d24;transform:translateY(-1px);box-shadow:0 8px 22px rgba(200,16,46,.30);}',
    '#tx-lm-submit:focus-visible{outline:2px solid #0D1B2A;outline-offset:2px;}',
    '#tx-lm-submit[disabled]{opacity:.7;cursor:default;transform:none;box-shadow:none;}',
    '.tx-lm-reassure{font-size:.66rem;color:#94a3b8;text-align:center;margin-top:9px;}',
    '.tx-lm-thanks{text-align:center;padding:30px 22px 26px;}',
    '.tx-lm-thanks .tx-lm-check{font-size:2rem;margin-bottom:8px;}',
    '.tx-lm-thanks h3{font-size:1rem;font-weight:900;color:#0f172a;margin-bottom:8px;}',
    '.tx-lm-thanks p{font-size:.8rem;line-height:1.5;color:#64748b;}',
    '@media (max-width:600px){',
    '  #tx-lm-root{right:0;left:0;bottom:0;width:100%;max-width:100%;transform:translateY(100%);}',
    '  #tx-lm-card{border-radius:16px 16px 0 0;border-bottom:none;}',
    '}'
  ].join('');

  // ── Build DOM ──
  var styleEl = document.createElement('style');
  styleEl.id = 'tx-lm-style';
  styleEl.textContent = css;

  var root = document.createElement('div');
  root.id = 'tx-lm-root';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Free guide download');

  root.innerHTML = [
    '<div id="tx-lm-card">',
    '  <button id="tx-lm-close" type="button" aria-label="Close">&times;</button>',
    '  <form id="tx-lm-form" name="lead-magnet" method="POST" data-netlify="true" netlify-honeypot="bot-field">',
    '    <input type="hidden" name="form-name" value="lead-magnet" />',
    '    <p hidden><label>Don’t fill this out: <input name="bot-field" /></label></p>',
    '    <div class="tx-lm-body">',
    '      <div class="tx-lm-top">',
    '        <div class="tx-lm-cover" aria-hidden="true">',
    '          <div class="tx-lm-cv-eyebrow">Free Guide</div>',
    '          <div class="tx-lm-cv-title">The Growth Checklist</div>',
    '        </div>',
    '        <div>',
    '          <div class="tx-lm-eyebrow">Free Guide</div>',
    '          <div class="tx-lm-headline">The Business Growth Checklist</div>',
    '          <div class="tx-lm-subhead">7 levers growing businesses use to win more customers, raise profit, and scale.</div>',
    '        </div>',
    '      </div>',
    '      <div class="tx-lm-field">',
    '        <label for="tx-lm-name">First name</label>',
    '        <input id="tx-lm-name" type="text" name="name" autocomplete="given-name" required placeholder="Your name" />',
    '      </div>',
    '      <div class="tx-lm-field">',
    '        <label for="tx-lm-email">Email</label>',
    '        <input id="tx-lm-email" type="email" name="email" autocomplete="email" required placeholder="you@company.com" />',
    '      </div>',
    '      <button id="tx-lm-submit" type="submit">Download Now &rarr;</button>',
    '      <div class="tx-lm-reassure">No spam. Unsubscribe anytime.</div>',
    '    </div>',
    '  </form>',
    '</div>'
  ].join('');

  function mount() {
    if (!document.body || document.getElementById('tx-lm-root')) return;
    document.head.appendChild(styleEl);
    document.body.appendChild(root);
    wire();
    arm();
  }

  // ── Show / hide ──
  var shown = false;
  // If a page-level fixed bottom bar is visible (e.g. index.html #stickybar),
  // lift the popup so it clears the bar instead of stacking on top of it.
  function clearBottomBar() {
    try {
      var bar = document.getElementById('stickybar');
      if (!bar) return;
      var cs = window.getComputedStyle(bar);
      var atBottom = cs.position === 'fixed' && parseFloat(cs.bottom || '0') < 4;
      var visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
        (bar.classList.contains('show') || parseFloat(cs.opacity || '1') > 0.1);
      if (atBottom && visible) {
        var h = bar.getBoundingClientRect().height || 0;
        if (h > 0) root.style.bottom = (h + 16) + 'px';
      }
    } catch (e) {}
  }

  function show() {
    if (shown) return;
    shown = true;
    disarm();
    clearBottomBar();
    if (!prefersReduced) root.classList.add('tx-lm-anim');
    // force reflow so the transition fires from the hidden state
    /* eslint-disable no-unused-expressions */
    root.offsetHeight;
    root.classList.add('tx-lm-show');
    // move focus to the close button for keyboard users (non-stealing on desktop is fine here)
    var closeBtn = document.getElementById('tx-lm-close');
    if (closeBtn) { try { closeBtn.focus({ preventScroll: true }); } catch (e) { closeBtn.focus(); } }
  }

  function dismiss() {
    lsSet(DISMISS_KEY, String(Date.now()));
    teardown();
  }

  function teardown() {
    root.classList.remove('tx-lm-show');
    var done = function () { if (root && root.parentNode) root.parentNode.removeChild(root); };
    if (prefersReduced) { done(); }
    else { setTimeout(done, 480); }
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.keyCode === 27) dismiss();
  }

  // ── Triggers: first of 12s OR 45% scroll ──
  var timer = null;
  function onScroll() {
    var doc = document.documentElement;
    var scrollable = (doc.scrollHeight - doc.clientHeight);
    if (scrollable <= 0) return; // nothing to scroll; let the timer handle it
    var pct = window.pageYOffset / scrollable;
    if (pct >= 0.45) show();
  }
  function arm() {
    timer = setTimeout(show, 12000);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('keydown', onKey);
  }
  function disarm() {
    if (timer) { clearTimeout(timer); timer = null; }
    window.removeEventListener('scroll', onScroll);
  }

  // ── Wire behavior ──
  function wire() {
    var closeBtn = document.getElementById('tx-lm-close');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    var form = document.getElementById('tx-lm-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('tx-lm-submit');
      if (btn) { btn.setAttribute('disabled', 'disabled'); btn.textContent = 'Sending…'; }

      // Capture the lead in Netlify — same pattern as apply.html (non-blocking).
      try {
        var data = new URLSearchParams(new FormData(form)).toString();
        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: data
        }).catch(function () {});
      } catch (err) { /* never block the download */ }

      // Mark done so it never shows again.
      lsSet(DONE_KEY, String(Date.now()));

      // Deliver the guide instantly in a new tab.
      try { window.open(GUIDE_URL, '_blank'); } catch (err) {}

      // Swap to the thank-you state.
      var card = document.getElementById('tx-lm-card');
      if (card) {
        card.innerHTML =
          '<button id="tx-lm-close-2" type="button" aria-label="Close">&times;</button>' +
          '<div class="tx-lm-thanks">' +
          '  <div class="tx-lm-check" aria-hidden="true">✓</div>' +
          '  <h3>Your guide is opening in a new tab</h3>' +
          '  <p>Tip: print or save it to PDF so you have it anytime. Want it applied to <em>your</em> numbers? Book a free strategy session.</p>' +
          '</div>';
        var close2 = document.getElementById('tx-lm-close-2');
        // re-apply close button styling (inherits #tx-lm-close rules only by id, so set inline-safe class)
        if (close2) {
          close2.id = 'tx-lm-close';
          close2.addEventListener('click', dismiss);
        }
      }

      // Auto-dismiss after a few seconds.
      setTimeout(dismiss, 6000);
    });
  }

  // ── Boot ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
