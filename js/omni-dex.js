(function () {
  'use strict';

  // ── DOM references ──
  const grid = document.getElementById('omni-card-grid');
  const statusEl = document.getElementById('omni-status');
  const universeTabs = document.querySelectorAll('.omni-tab');
  const typePills = document.querySelectorAll('.type-pill');
  const modal = document.getElementById('omni-modal');
  const modalTitle = modal.querySelector('.omni-modal-title');
  const modalContent = document.getElementById('omni-modal-content');
  const modalClose = document.getElementById('omni-modal-close');
  const modalRandom = document.getElementById('omni-modal-random');
  const body = document.body;

  // ── State ──
  let allEntries = [];
  let currentUniverse = 'all';
  let currentType = 'all';

  // ── Fetch Data ──
  async function loadData() {
    try {
      statusEl.textContent = 'Loading Omni‑Dex...';
      statusEl.classList.remove('hidden');
      grid.innerHTML = '';

      const response = await fetch('omni-dex-data.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      allEntries = data.entries || [];
      statusEl.classList.add('hidden');
      renderCards();
    } catch (err) {
      statusEl.textContent = `Failed to load Omni‑Dex data: ${err.message}`;
      statusEl.classList.remove('hidden');
    }
  }

  // ── Filtering ──
  function getFilteredEntries() {
    return allEntries.filter(entry => {
      const universeMatch = currentUniverse === 'all' || entry.universe === currentUniverse;
      const typeMatch = currentType === 'all' || entry.type === currentType;
      return universeMatch && typeMatch;
    });
  }

  // ── Render Cards ──
  function renderCards() {
    const entries = getFilteredEntries();
    if (entries.length === 0) {
      grid.innerHTML = '<div class="omni-status">No entries match your filters.</div>';
      return;
    }

    let html = '';
    entries.forEach(entry => {
      html += `
        <div class="omni-card" data-id="${entry.id}">
          <div class="omni-card-type">${entry.universe} · ${entry.type}</div>
          <h3 class="omni-card-title">${escapeHtml(entry.title)}</h3>
          <p class="omni-card-desc">${escapeHtml(entry.short_description)}</p>
          <div class="omni-card-stats">
            ${renderStats(entry.stats)}
          </div>
        </div>
      `;
    });
    grid.innerHTML = html;

    // Attach click listeners to cards
    document.querySelectorAll('.omni-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id);
        const entry = allEntries.find(e => e.id === id);
        if (entry) openModal(entry);
      });
    });

    // Trigger stat bar animation after DOM update
    requestAnimationFrame(() => {
      document.querySelectorAll('.omni-stat-fill').forEach(fill => {
        const target = parseInt(fill.dataset.value);
        fill.style.width = target + '%';
      });
    });
  }

  // ── Helper: render stat bars (initially width 0%, animated via CSS transition) ──
  function renderStats(stats) {
    if (!stats) return '';
    let html = '';
    for (const [label, value] of Object.entries(stats)) {
      const labelDisplay = label.replace(/_/g, ' ');
      html += `
        <div class="omni-stat">
          <span class="omni-stat-label">${labelDisplay}</span>
          <div class="omni-stat-bar">
            <div class="omni-stat-fill" data-value="${value}" style="width: 0%;"></div>
          </div>
          <span class="omni-stat-value">${value}</span>
        </div>
      `;
    }
    return html;
  }

  // ── Escape HTML to prevent XSS ──
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ── Modal ──
  function openModal(entry) {
    modalTitle.textContent = entry.title;
    modalContent.innerHTML = entry.content || '<p>No further details available.</p>';
    // Also show stats in modal? For now, just full content.
    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });
  }

  function closeModal() {
    modal.classList.remove('visible');
  }

  modalClose.addEventListener('click', closeModal);
  modalRandom.addEventListener('click', () => {
    // Random entry from current filtered list
    const filtered = getFilteredEntries();
    if (filtered.length === 0) return;
    const randomEntry = filtered[Math.floor(Math.random() * filtered.length)];
    openModal(randomEntry);
  });

  // Close modal when clicking outside content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // ── Tab Handlers ──
  universeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      universeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentUniverse = tab.dataset.universe;
      // Set body attribute for CSS theming
      body.dataset.universe = currentUniverse;
      renderCards();
    });
  });

  typePills.forEach(pill => {
    pill.addEventListener('click', () => {
      typePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentType = pill.dataset.type;
      renderCards();
    });
  });

  // ── Init ──
  loadData();

})();