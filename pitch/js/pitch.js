/**
 * TrueXpanse Pitch Hub — interactivity
 * - Loads industries.json
 * - Renders the industry-card grid + shared-pages grid
 * - Renders the right-side slide-out nav (MGP-style)
 * - Adding a new prospect: edit /pitch/data/industries.json + redeploy
 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function loadData() {
    try {
      const res = await fetch('./data/industries.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load industries.json');
      return await res.json();
    } catch (err) {
      console.error('Pitch hub data load failed:', err);
      return { industries: [], shared: [] };
    }
  }

  function renderIndustryGrid(industries) {
    const grid = $('#industry-grid');
    if (!grid) return;
    grid.innerHTML = industries.map((ind) => {
      const empty = !ind.mockups || ind.mockups.length === 0;
      const count = (ind.mockups || []).length;
      return `
        <div class="industry-card ${empty ? 'empty' : ''}" data-industry="${ind.id}" role="button" tabindex="0">
          <span class="emoji">${ind.emoji || '📁'}</span>
          <h3>${ind.name}</h3>
          <p class="tagline">${ind.tagline || ''}</p>
          <div class="count">${empty ? 'No mockups yet' : `${count} mockup${count === 1 ? '' : 's'}`}</div>
        </div>
      `;
    }).join('');

    // Clicking an industry card opens the right-side nav and scrolls to that section
    $$('#industry-grid .industry-card').forEach((card) => {
      const open = () => {
        openNav();
        const sectionId = `nav-industry-${card.dataset.industry}`;
        const target = document.getElementById(sectionId);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function renderSharedGrid(shared) {
    const grid = $('#shared-grid');
    if (!grid) return;
    grid.innerHTML = shared.map((s) => `
      <a class="shared-card" href="${s.url}" target="_blank" rel="noopener">
        <div class="ico">${s.icon || '📄'}</div>
        <div>
          <div class="name">${s.name}</div>
          <div class="sub">${s.subtitle || ''}</div>
        </div>
      </a>
    `).join('');
  }

  function renderNav(industries, shared) {
    const panel = $('#nav-panel-body');
    if (!panel) return;

    const industriesHtml = `
      <div class="nav-section">
        <div class="nav-section-label">Industry Mockups</div>
        ${industries.map((ind) => {
          const mockups = ind.mockups || [];
          return `
            <div class="nav-industry" id="nav-industry-${ind.id}">
              <div class="nav-industry-header">
                <span class="emoji">${ind.emoji}</span>
                <span>${ind.name}</span>
              </div>
              ${mockups.length === 0
                ? `<div class="nav-empty">No mockups yet — add one in industries.json</div>`
                : `<ul class="nav-mockups">
                    ${mockups.map((m) => `
                      <li>
                        <a href="${m.url}" target="_blank" rel="noopener">
                          <span class="pill">${m.id.toUpperCase()}</span>
                          <span>${m.name} — ${m.subtitle}</span>
                        </a>
                      </li>
                    `).join('')}
                  </ul>`
              }
            </div>
          `;
        }).join('')}
      </div>
    `;

    const sharedHtml = `
      <div class="nav-section">
        <div class="nav-section-label">Shared Pitch Pages</div>
        <ul class="nav-shared-list">
          ${shared.map((s) => `
            <li>
              <a href="${s.url}" target="_blank" rel="noopener">
                <span class="ico">${s.icon}</span>
                <span>${s.name}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    panel.innerHTML = industriesHtml + sharedHtml;
  }

  // ── NAV OPEN/CLOSE ─────────────────────────────────────────────────
  function openNav() {
    $('#nav-panel').classList.add('is-open');
    $('#nav-backdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    $('#nav-panel').classList.remove('is-open');
    $('#nav-backdrop').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function wireNavControls() {
    $('#nav-toggle')?.addEventListener('click', openNav);
    $('#nav-close')?.addEventListener('click', closeNav);
    $('#nav-backdrop')?.addEventListener('click', closeNav);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
  }

  // ── BOOT ────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    wireNavControls();
    const data = await loadData();
    renderIndustryGrid(data.industries || []);
    renderSharedGrid(data.shared || []);
    renderNav(data.industries || [], data.shared || []);
  });
})();
