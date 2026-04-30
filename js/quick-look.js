/**
 * Quick Look — TrueXpanse welcome popup
 *
 * Watkins-Plumbing-style centered popup that hits visitors ~1.5 seconds after
 * arrival with a pre-built lead magnet + sneak peek of what TrueXpanse offers.
 *
 * Design intent (per Don, 2026-04-30): visitors won't wait for AI to scrub the
 * site at runtime. This popup is hand-curated and pre-built so it's instant.
 * The AI-auto-generated version is a v2 feature for client sites where the
 * agency curates once via MAT and the cache renders the popup.
 *
 * One-and-done per session: dismiss persists in sessionStorage so we don't
 * pester the visitor on every page navigation inside the same session.
 */
(function () {
  'use strict';
  if (window.__truexpanseQuickLookLoaded) return;
  window.__truexpanseQuickLookLoaded = true;

  // ── Curated content (pre-built, no AI calls) ───────────────────────────
  const TILES = [
    {
      icon: '🚀',
      label: 'Free Revenue Audit',
      href: 'https://link.truexpanse.com/widget/booking/dHihuvadHB4f7h0XBW4i',
      external: true,
    },
    {
      icon: '🔥',
      label: 'Quantum Marketing',
      href: 'pages/quantum-marketing.html',
    },
    {
      icon: '💸',
      label: 'Procrastination Tax',
      href: 'pages/procrastination-tax.html',
    },
    {
      icon: '⚡',
      label: 'MAT Platform',
      href: 'https://massiveactiontracker.com/',
      external: true,
    },
  ];

  const PRIMARY_CTA = {
    label: '📞  Book My Free Revenue Audit',
    href: 'https://link.truexpanse.com/widget/booking/dHihuvadHB4f7h0XBW4i',
    external: true,
  };

  // ── Configuration ──────────────────────────────────────────────────────
  const SHOW_AFTER_MS = 1500;
  const STORAGE_KEY = 'tx_quick_look_dismissed';

  // ── Styles ─────────────────────────────────────────────────────────────
  const css = `
.tx-ql-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13,27,42,0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  transition: opacity .28s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
}
.tx-ql-overlay.is-open { opacity: 1; }
.tx-ql-popup {
  position: relative;
  background: #fff;
  border-radius: 22px;
  max-width: 460px;
  width: 100%;
  padding: 38px 32px 28px;
  box-shadow: 0 30px 80px rgba(13,27,42,0.4);
  text-align: center;
  transform: scale(0.92) translateY(12px);
  transition: transform .35s cubic-bezier(.18,.89,.32,1.2);
}
.tx-ql-overlay.is-open .tx-ql-popup { transform: scale(1) translateY(0); }
.tx-ql-close {
  position: absolute;
  top: 14px; right: 14px;
  width: 28px; height: 28px;
  background: rgba(15,23,42,0.06);
  color: #1b2d4f;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s ease;
  font-family: inherit;
}
.tx-ql-close:hover { background: rgba(15,23,42,0.12); }
.tx-ql-badge {
  display: inline-block;
  background: linear-gradient(135deg, #E63946 0%, #C8102E 100%);
  color: #fff;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 8px 18px;
  border-radius: 100px;
  margin-bottom: 18px;
  box-shadow: 0 6px 16px rgba(200,16,46,0.32);
}
.tx-ql-title {
  font-size: 1.6rem;
  line-height: 1.18;
  font-weight: 900;
  color: #1b2d4f;
  margin: 0 0 10px;
  letter-spacing: -0.01em;
}
.tx-ql-sub {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #5a6478;
  margin: 0 0 22px;
  max-width: 380px;
  margin-left: auto; margin-right: auto;
}
.tx-ql-tiles {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 22px;
}
.tx-ql-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 14px 8px;
  background: #f6f7fb;
  border: 1.5px solid #e6e8ef;
  border-radius: 14px;
  text-decoration: none;
  color: #1b2d4f;
  transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
  cursor: pointer;
}
.tx-ql-tile:hover {
  border-color: #E63946;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(200,16,46,0.15);
}
.tx-ql-tile-icon { font-size: 1.7rem; line-height: 1; }
.tx-ql-tile-label {
  font-size: 0.74rem;
  font-weight: 700;
  text-align: center;
  line-height: 1.25;
  color: #1b2d4f;
}
.tx-ql-cta {
  display: block;
  width: 100%;
  background: linear-gradient(135deg, #E63946 0%, #C8102E 100%);
  color: #fff;
  border: none;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 800;
  padding: 14px 18px;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  letter-spacing: 0.01em;
  text-decoration: none;
  box-shadow: 0 8px 18px rgba(200,16,46,0.32);
  transition: transform .15s ease, box-shadow .15s ease;
}
.tx-ql-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(200,16,46,0.45); }
.tx-ql-cta:active { transform: translateY(0); }
.tx-ql-fineprint {
  font-size: 0.78rem;
  color: #94a0b3;
  margin-top: 14px;
  margin-bottom: 0;
}
.tx-ql-fineprint a {
  color: #5a6478;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

@media (max-width: 480px) {
  .tx-ql-popup { padding: 30px 22px 22px; border-radius: 18px; }
  .tx-ql-badge { font-size: 0.66rem; padding: 7px 14px; margin-bottom: 14px; }
  .tx-ql-title { font-size: 1.32rem; }
  .tx-ql-sub { font-size: 0.88rem; margin-bottom: 18px; }
  .tx-ql-tiles { gap: 8px; margin-bottom: 18px; }
  .tx-ql-tile { padding: 12px 6px; border-radius: 12px; }
  .tx-ql-tile-icon { font-size: 1.45rem; }
  .tx-ql-tile-label { font-size: 0.68rem; }
  .tx-ql-cta { font-size: 0.92rem; padding: 12px 16px; }
}
`;

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'tx-ql-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── DOM ────────────────────────────────────────────────────────────────
  function buildPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'tx-ql-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tx-ql-title');
    overlay.style.display = 'none';

    let tilesHtml = '';
    TILES.forEach(t => {
      const target = t.external ? ' target="_blank" rel="noopener"' : '';
      tilesHtml += `
        <a href="${t.href}" class="tx-ql-tile"${target} data-ql-tile="${t.label}">
          <span class="tx-ql-tile-icon">${t.icon}</span>
          <span class="tx-ql-tile-label">${t.label}</span>
        </a>`;
    });

    const ctaTarget = PRIMARY_CTA.external ? ' target="_blank" rel="noopener"' : '';

    overlay.innerHTML = `
      <div class="tx-ql-popup">
        <button type="button" class="tx-ql-close" aria-label="Close">×</button>
        <div class="tx-ql-badge">🎁 Free 20-min Revenue Audit</div>
        <h2 class="tx-ql-title" id="tx-ql-title">Don't browse the whole site.</h2>
        <p class="tx-ql-sub">Here's a quick taste of what TrueXpanse offers — and a free audit if you want to skip ahead.</p>
        <div class="tx-ql-tiles">${tilesHtml}</div>
        <a href="${PRIMARY_CTA.href}" class="tx-ql-cta"${ctaTarget} data-ql-cta="primary">${PRIMARY_CTA.label}</a>
        <p class="tx-ql-fineprint">Tap any tile to jump there — or <a data-ql-dismiss>browse normally →</a></p>
      </div>`;

    document.body.appendChild(overlay);
    return overlay;
  }

  // ── Behavior ───────────────────────────────────────────────────────────
  function init() {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return;

    injectStyles();
    const overlay = buildPopup();
    const closeBtn = overlay.querySelector('.tx-ql-close');
    const dismissLink = overlay.querySelector('[data-ql-dismiss]');

    function open() {
      overlay.style.display = 'flex';
      void overlay.offsetWidth; // force reflow so the transition fires
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'quick_look_shown', { event_category: 'engagement' });
      }
    }

    function close(reason) {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      sessionStorage.setItem(STORAGE_KEY, '1');
      setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 280);
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'quick_look_dismissed', {
          event_category: 'engagement',
          event_label: reason || 'unknown',
        });
      }
    }

    closeBtn.addEventListener('click', () => close('close-button'));
    dismissLink.addEventListener('click', e => { e.preventDefault(); close('browse-link'); });
    overlay.addEventListener('click', e => { if (e.target === overlay) close('backdrop'); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close('escape');
    });

    // Track tile + CTA click-throughs but don't block the navigation.
    overlay.addEventListener('click', e => {
      const tile = e.target.closest('[data-ql-tile]');
      const cta = e.target.closest('[data-ql-cta]');
      if (typeof window.gtag !== 'function') return;
      if (tile) {
        window.gtag('event', 'quick_look_tile_click', {
          event_category: 'engagement',
          event_label: tile.getAttribute('data-ql-tile'),
        });
      } else if (cta) {
        window.gtag('event', 'quick_look_cta_click', {
          event_category: 'engagement',
          event_label: 'book_audit',
        });
      }
    });

    setTimeout(open, SHOW_AFTER_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
