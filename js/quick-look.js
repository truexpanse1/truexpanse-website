/**
 * Quick Look — TrueXpanse welcome carousel
 *
 * Centered popup that hits visitors ~1.5 seconds after arrival with a mini
 * slideshow of TrueXpanse's most popular offers. Pre-built (no AI runtime
 * delay), positive language, click-to-jump per slide, dismiss via X.
 *
 * Per Don 2026-04-30: visitors won't wait for AI to scrub the site at run-
 * time. The AI auto-generation lives on the agency side (one scan → cache);
 * the visitor always sees pre-built content.
 *
 * One-and-done per session via sessionStorage.
 */
(function () {
  'use strict';
  if (window.__truexpanseQuickLookLoaded) return;
  window.__truexpanseQuickLookLoaded = true;

  // ── Slides (most popular offers, in priority order) ────────────────────
  const SLIDES = [
    {
      icon: '🔥',
      title: 'TrueXpanse Quantum Marketing',
      desc: 'A full-service marketing system — ads, content, CRM, and AI-search visibility working together.',
      href: 'pages/quantum-marketing.html',
    },
    {
      icon: '💸',
      title: 'How Much Is Procrastination Costing Your Business?',
      desc: 'Calculate the real cost of waiting — your monthly Procrastination Tax in plain numbers.',
      href: 'pages/procrastination-tax.html',
    },
    {
      icon: '🎯',
      title: '90-Day Contractor Growth Accelerator',
      desc: 'Built for painting contractors doing $500K–$2M and ready to break their ceiling.',
      href: 'pages/contractor-accelerator.html',
    },
    {
      icon: '🧭',
      title: 'Business Coaching with Don',
      desc: 'Strategy on the business, counsel on the people — 35 years of operator experience.',
      href: 'pages/coaching.html',
    },
    {
      icon: '⚡',
      title: 'Massive Action Tracker',
      desc: 'Track the daily activity and KPIs that actually drive revenue. The platform behind it all.',
      href: 'https://massiveactiontracker.com/',
      external: true,
    },
  ];

  const SHOW_AFTER_MS = 1500;
  const AUTO_ADVANCE_MS = 4500;
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
  max-width: 480px;
  width: 100%;
  padding: 36px 28px 28px;
  box-shadow: 0 30px 80px rgba(13,27,42,0.4);
  text-align: center;
  transform: scale(0.92) translateY(12px);
  transition: transform .35s cubic-bezier(.18,.89,.32,1.2);
}
.tx-ql-overlay.is-open .tx-ql-popup { transform: scale(1) translateY(0); }
.tx-ql-close {
  position: absolute;
  top: 14px; right: 14px;
  width: 32px; height: 32px;
  background: rgba(15,23,42,0.06);
  color: #1b2d4f;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s ease;
  font-family: inherit;
  z-index: 2;
}
.tx-ql-close:hover { background: rgba(15,23,42,0.12); }
.tx-ql-badge {
  display: inline-block;
  background: linear-gradient(135deg, #E63946 0%, #C8102E 100%);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 7px 16px;
  border-radius: 100px;
  margin-bottom: 14px;
  box-shadow: 0 6px 16px rgba(200,16,46,0.3);
}
.tx-ql-heading {
  font-size: 1.5rem;
  line-height: 1.18;
  font-weight: 900;
  color: #1b2d4f;
  margin: 0 0 22px;
  letter-spacing: -0.01em;
}

/* ── Carousel ──────────────────────────────────────────────────────── */
.tx-ql-stage {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(135deg, #f6f7fb 0%, #eef0f7 100%);
  margin-bottom: 18px;
}
.tx-ql-track {
  display: flex;
  transition: transform .45s cubic-bezier(.4,0,.2,1);
  will-change: transform;
}
.tx-ql-slide {
  flex: 0 0 100%;
  min-width: 0;
  padding: 28px 24px 26px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: background .15s ease;
}
.tx-ql-slide:hover { background: rgba(230,57,70,0.04); }
.tx-ql-slide-icon {
  font-size: 2.6rem;
  line-height: 1;
  margin-bottom: 14px;
}
.tx-ql-slide-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1b2d4f;
  margin: 0 0 10px;
  line-height: 1.25;
  letter-spacing: -0.005em;
}
.tx-ql-slide-desc {
  font-size: 0.88rem;
  color: #5a6478;
  line-height: 1.55;
  margin: 0 0 16px;
  max-width: 340px;
}
.tx-ql-slide-cta {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 800;
  color: #E63946;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tx-ql-slide-cta::after { content: '  →'; }

.tx-ql-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255,255,255,0.92);
  color: #1b2d4f;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(15,23,42,0.12);
  z-index: 1;
  transition: background .15s ease, transform .15s ease;
  font-family: inherit;
}
.tx-ql-arrow:hover { background: #fff; transform: translateY(-50%) scale(1.06); }
.tx-ql-arrow.tx-ql-arrow-prev { left: 8px; }
.tx-ql-arrow.tx-ql-arrow-next { right: 8px; }

.tx-ql-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.tx-ql-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: #d4d8e3;
  cursor: pointer;
  transition: background .2s ease, transform .2s ease;
}
.tx-ql-dot:hover { background: #a8aebd; }
.tx-ql-dot.is-active {
  background: #E63946;
  transform: scale(1.25);
}

@media (max-width: 480px) {
  .tx-ql-popup { padding: 28px 18px 22px; border-radius: 18px; }
  .tx-ql-badge { font-size: 0.66rem; padding: 6px 13px; }
  .tx-ql-heading { font-size: 1.25rem; margin-bottom: 18px; }
  .tx-ql-slide { padding: 22px 18px 20px; }
  .tx-ql-slide-icon { font-size: 2.2rem; margin-bottom: 10px; }
  .tx-ql-slide-title { font-size: 1rem; }
  .tx-ql-slide-desc { font-size: 0.82rem; }
  .tx-ql-arrow { width: 30px; height: 30px; font-size: 15px; }
  .tx-ql-arrow.tx-ql-arrow-prev { left: 4px; }
  .tx-ql-arrow.tx-ql-arrow-next { right: 4px; }
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
    overlay.setAttribute('aria-labelledby', 'tx-ql-heading');
    overlay.style.display = 'none';

    let slidesHtml = '';
    SLIDES.forEach((s, i) => {
      const target = s.external ? ' target="_blank" rel="noopener"' : '';
      slidesHtml += `
        <a href="${s.href}" class="tx-ql-slide"${target} data-ql-slide="${i}" data-ql-title="${s.title}">
          <span class="tx-ql-slide-icon">${s.icon}</span>
          <h3 class="tx-ql-slide-title">${s.title}</h3>
          <p class="tx-ql-slide-desc">${s.desc}</p>
          <span class="tx-ql-slide-cta">Learn more</span>
        </a>`;
    });

    let dotsHtml = '';
    SLIDES.forEach((_, i) => {
      dotsHtml += `<button type="button" class="tx-ql-dot${i === 0 ? ' is-active' : ''}" data-ql-dot="${i}" aria-label="Go to slide ${i + 1}"></button>`;
    });

    overlay.innerHTML = `
      <div class="tx-ql-popup">
        <button type="button" class="tx-ql-close" aria-label="Close">×</button>
        <div class="tx-ql-badge">✨ TrueXpanse Highlights</div>
        <h2 class="tx-ql-heading" id="tx-ql-heading">The best of TrueXpanse, in 60 seconds.</h2>
        <div class="tx-ql-stage">
          <button type="button" class="tx-ql-arrow tx-ql-arrow-prev" aria-label="Previous offer">‹</button>
          <div class="tx-ql-track">${slidesHtml}</div>
          <button type="button" class="tx-ql-arrow tx-ql-arrow-next" aria-label="Next offer">›</button>
        </div>
        <div class="tx-ql-dots">${dotsHtml}</div>
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
    const track = overlay.querySelector('.tx-ql-track');
    const prevBtn = overlay.querySelector('.tx-ql-arrow-prev');
    const nextBtn = overlay.querySelector('.tx-ql-arrow-next');
    const dots = Array.from(overlay.querySelectorAll('.tx-ql-dot'));
    const slideCount = SLIDES.length;

    let current = 0;
    let autoTimer = null;

    function render() {
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
    }

    function go(i, opts) {
      current = ((i % slideCount) + slideCount) % slideCount;
      render();
      if (opts && opts.userInitiated) restartAutoAdvance();
    }

    function startAutoAdvance() {
      stopAutoAdvance();
      autoTimer = setInterval(() => go(current + 1), AUTO_ADVANCE_MS);
    }
    function stopAutoAdvance() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }
    function restartAutoAdvance() {
      stopAutoAdvance();
      startAutoAdvance();
    }

    function open() {
      overlay.style.display = 'flex';
      void overlay.offsetWidth;
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      startAutoAdvance();
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'quick_look_shown', { event_category: 'engagement' });
      }
    }

    function close(reason) {
      stopAutoAdvance();
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

    // Carousel controls
    prevBtn.addEventListener('click', () => go(current - 1, { userInitiated: true }));
    nextBtn.addEventListener('click', () => go(current + 1, { userInitiated: true }));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i, { userInitiated: true })));

    // Pause auto-advance on hover so users have time to read
    const popup = overlay.querySelector('.tx-ql-popup');
    popup.addEventListener('mouseenter', stopAutoAdvance);
    popup.addEventListener('mouseleave', startAutoAdvance);

    // Touch swipe for mobile
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1), { userInitiated: true });
    });

    // Close handlers
    closeBtn.addEventListener('click', () => close('close-button'));
    overlay.addEventListener('click', e => { if (e.target === overlay) close('backdrop'); });
    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape') close('escape');
      if (e.key === 'ArrowLeft') go(current - 1, { userInitiated: true });
      if (e.key === 'ArrowRight') go(current + 1, { userInitiated: true });
    });

    // Slide click analytics — don't block navigation
    overlay.addEventListener('click', e => {
      const slide = e.target.closest('[data-ql-slide]');
      if (slide && typeof window.gtag === 'function') {
        window.gtag('event', 'quick_look_slide_click', {
          event_category: 'engagement',
          event_label: slide.getAttribute('data-ql-title'),
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
