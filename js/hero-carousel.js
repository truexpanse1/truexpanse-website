/**
 * Hero Carousel — TrueXpanse homepage
 *
 * Embedded directly into the hero (right-side card, where Don's photo used
 * to be). Auto-advances through 5 most-popular offers. Pre-built content,
 * no AI runtime delay. Procrastination calculator leads as the strongest
 * lead magnet.
 *
 * Click tracking: every slide click fires a GA4 `hero_carousel_click` event
 * with the slide title as label, so Don can see which slide is the most
 * popular in GA4 → Events report.
 *
 * Mounts into <div id="tx-hero-carousel">.
 */
(function () {
  'use strict';
  if (window.__txHeroCarouselLoaded) return;
  window.__txHeroCarouselLoaded = true;

  // ── Slides — Procrastination first (strongest lead magnet) ─────────────
  const SLIDES = [
    {
      icon: '💸',
      tag: 'Most Popular',
      title: 'How Much Is Procrastination Costing Your Business?',
      desc: 'Calculate the real cost of waiting — your monthly Procrastination Tax, in plain numbers.',
      href: 'pages/procrastination-tax.html',
    },
    {
      icon: '🔥',
      title: 'TrueXpanse Quantum Marketing',
      desc: 'A full-service marketing system — ads, content, CRM, and AI-search visibility working together.',
      href: 'pages/quantum-marketing.html',
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

  const AUTO_ADVANCE_MS = 5000;

  const css = `
.tx-hero-carousel {
  position: relative;
  height: 520px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0,0,0,0.28);
  background: linear-gradient(155deg, #1b2d4f 0%, #0d1b2a 65%, #112236 100%);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
}
.tx-hc-header {
  padding: 24px 28px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.tx-hc-eyebrow {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #ff8a96;
}
.tx-hc-stage {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.tx-hc-track {
  display: flex;
  height: 100%;
  transition: transform .5s cubic-bezier(.4,0,.2,1);
  will-change: transform;
}
.tx-hc-slide {
  flex: 0 0 100%;
  min-width: 0;
  padding: 24px 32px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  text-decoration: none;
  color: #fff;
  cursor: pointer;
  transition: background .15s ease;
}
.tx-hc-slide:hover { background: rgba(255,255,255,0.04); }
.tx-hc-slide-tag {
  display: inline-block;
  align-self: center;
  background: linear-gradient(135deg, #E63946 0%, #C8102E 100%);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: 100px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(200,16,46,0.45);
}
.tx-hc-slide-icon {
  font-size: 3rem;
  line-height: 1;
  margin-bottom: 14px;
}
.tx-hc-slide-title {
  font-size: 1.22rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 10px;
  line-height: 1.22;
  letter-spacing: -0.005em;
}
.tx-hc-slide-desc {
  font-size: 0.88rem;
  color: rgba(255,255,255,0.72);
  line-height: 1.55;
  margin: 0 0 14px;
  max-width: 360px;
  margin-left: auto; margin-right: auto;
}
.tx-hc-slide-cta {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 800;
  color: #ff8a96;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tx-hc-slide-cta::after { content: '  →'; }

.tx-hc-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px; height: 32px;
  border: none;
  background: rgba(255,255,255,0.10);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  z-index: 2;
  transition: background .15s ease, transform .15s ease;
  font-family: inherit;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.tx-hc-arrow:hover { background: rgba(255,255,255,0.22); transform: translateY(-50%) scale(1.06); }
.tx-hc-arrow.tx-hc-arrow-prev { left: 8px; }
.tx-hc-arrow.tx-hc-arrow-next { right: 8px; }

.tx-hc-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px 0 16px;
  flex-shrink: 0;
}
.tx-hc-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: rgba(255,255,255,0.25);
  cursor: pointer;
  transition: background .2s ease, transform .2s ease;
}
.tx-hc-dot:hover { background: rgba(255,255,255,0.45); }
.tx-hc-dot.is-active {
  background: #ff8a96;
  transform: scale(1.3);
}

@media (max-width: 768px) {
  .tx-hero-carousel { height: auto; min-height: 360px; }
  .tx-hc-slide { padding: 22px 26px 24px; }
  .tx-hc-slide-icon { font-size: 2.4rem; margin-bottom: 10px; }
  .tx-hc-slide-title { font-size: 1.05rem; }
  .tx-hc-slide-desc { font-size: 0.82rem; }
}
`;

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'tx-hc-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build(host) {
    let slidesHtml = '';
    SLIDES.forEach((s, i) => {
      const target = s.external ? ' target="_blank" rel="noopener"' : '';
      const tagHtml = s.tag ? `<span class="tx-hc-slide-tag">${s.tag}</span>` : '';
      slidesHtml += `
        <a href="${s.href}" class="tx-hc-slide"${target} data-hc-slide="${i}" data-hc-title="${s.title}">
          ${tagHtml}
          <span class="tx-hc-slide-icon">${s.icon}</span>
          <h3 class="tx-hc-slide-title">${s.title}</h3>
          <p class="tx-hc-slide-desc">${s.desc}</p>
          <span class="tx-hc-slide-cta">Learn more</span>
        </a>`;
    });

    let dotsHtml = '';
    SLIDES.forEach((_, i) => {
      dotsHtml += `<button type="button" class="tx-hc-dot${i === 0 ? ' is-active' : ''}" data-hc-dot="${i}" aria-label="Show slide ${i + 1}"></button>`;
    });

    host.innerHTML = `
      <div class="tx-hc-header">
        <span class="tx-hc-eyebrow">✨ TrueXpanse Highlights</span>
      </div>
      <div class="tx-hc-stage">
        <button type="button" class="tx-hc-arrow tx-hc-arrow-prev" aria-label="Previous offer">‹</button>
        <div class="tx-hc-track">${slidesHtml}</div>
        <button type="button" class="tx-hc-arrow tx-hc-arrow-next" aria-label="Next offer">›</button>
      </div>
      <div class="tx-hc-dots">${dotsHtml}</div>`;
  }

  function init() {
    const host = document.getElementById('tx-hero-carousel');
    if (!host) return;

    injectStyles();
    build(host);

    const track = host.querySelector('.tx-hc-track');
    const prevBtn = host.querySelector('.tx-hc-arrow-prev');
    const nextBtn = host.querySelector('.tx-hc-arrow-next');
    const dots = Array.from(host.querySelectorAll('.tx-hc-dot'));
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

    prevBtn.addEventListener('click', () => go(current - 1, { userInitiated: true }));
    nextBtn.addEventListener('click', () => go(current + 1, { userInitiated: true }));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i, { userInitiated: true })));

    // Pause auto-advance on hover so visitors can read
    host.addEventListener('mouseenter', stopAutoAdvance);
    host.addEventListener('mouseleave', startAutoAdvance);

    // Touch swipe on mobile
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1), { userInitiated: true });
    });

    // Click tracking — fires before navigation so the event is recorded
    host.addEventListener('click', e => {
      const slide = e.target.closest('[data-hc-slide]');
      if (slide && typeof window.gtag === 'function') {
        window.gtag('event', 'hero_carousel_click', {
          event_category: 'engagement',
          event_label: slide.getAttribute('data-hc-title'),
          slide_index: Number(slide.getAttribute('data-hc-slide')),
        });
      }
    });

    startAutoAdvance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
