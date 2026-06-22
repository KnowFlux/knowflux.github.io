/* omni-dex.js — fixed version */

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
  const modalNext = document.getElementById('omni-modal-next');
  const modalStatsToggle = document.getElementById('omni-modal-toggle-stats');
  const modalStatsSidebar = document.getElementById('omni-modal-stats-sidebar');
  const modalStatsContent = document.getElementById('omni-modal-stats-content');
  const modalBodyWrapper = modal.querySelector('.omni-modal-body-wrapper');
  const body = document.body;
  const modalScreen = modal.querySelector('.omni-modal-screen');
  const modalContentOuter = modal.querySelector('.omni-modal-content');

  // ── State ──
  let allEntries = [];
  let currentUniverse = 'all';
  let currentType = 'all';
  let currentEntryIndex = -1;
  let currentFilteredEntries = [];
  let statsSidebarOpen = false;

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
    currentFilteredEntries = getFilteredEntries();
    if (currentFilteredEntries.length === 0) {
      grid.innerHTML = '<div class="omni-status">No entries match your filters.</div>';
      return;
    }

    let html = '';
    currentFilteredEntries.forEach(entry => {
      html += `
        <div class="omni-card card-${entry.universe}" data-id="${entry.id}">
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
    document.querySelectorAll('.omni-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        const entry = currentFilteredEntries[index];
        if (entry) {
          currentEntryIndex = index;
          openModal(entry);
        }
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

  // ── Helper: render stat bars ──
  function renderStats(stats) {
    if (!stats) return '';
    let html = '';
    for (const [label, value] of Object.entries(stats)) {
      const labelDisplay = label.replace(/_/g, ' ');
      html += `
        <div class="omni-stat" data-stat-label="${label}" data-stat-value="${value}">
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

  // ── Modal: Dynamic height calculation ──
  const MODAL_BASE_HEIGHT = 350;      // px — matches CSS .omni-modal-screen height
  const MODAL_EXPAND_THRESHOLD = 20;  // px — max overflow before scroll
  const MODAL_BOTTOM_PAD = 10;        // px — blank space at bottom when expanded
  const MODAL_SCROLL_PAD = 8;         // px — blank space at bottom when scrolling

  function adjustModalHeight() {
    const titlebar = modal.querySelector('.omni-modal-titlebar');
    const titlebarHeight = titlebar ? titlebar.offsetHeight : 40;

    // Restore natural padding on content before measurement
    modalContent.style.paddingBottom = '0';

    // Get the full natural height of the content
    const contentHeight = modalContent.scrollHeight;

    // Total height the screen would need to fit content
    const neededHeight = titlebarHeight + contentHeight + MODAL_BOTTOM_PAD;
    const overflow = neededHeight - MODAL_BASE_HEIGHT;

    // Clamp: never exceed 80% of viewport
    const maxAllowed = window.innerHeight * 0.80;

    if (overflow <= 0) {
      // Fits easily
      modalScreen.style.height = MODAL_BASE_HEIGHT + 'px';
      modalScreen.style.overflow = 'hidden';
      modalContent.style.overflowY = 'hidden';
    } else if (overflow <= MODAL_EXPAND_THRESHOLD) {
      // Expands to fit (capped)
      const expanded = Math.min(neededHeight, maxAllowed);
      modalScreen.style.height = expanded + 'px';
      modalScreen.style.overflow = 'hidden';
      if (expanded >= neededHeight) {
        modalContent.style.overflowY = 'hidden';
      } else {
        modalContent.style.overflowY = 'auto';
        modalContent.style.paddingBottom = MODAL_SCROLL_PAD + 'px';
      }
    } else {
      // Too tall — add scrollbar
      modalScreen.style.height = Math.min(MODAL_BASE_HEIGHT, maxAllowed) + 'px';
      modalScreen.style.overflow = 'hidden';
      modalContent.style.overflowY = 'auto';
      modalContent.style.paddingBottom = MODAL_SCROLL_PAD + 'px';
    }

    // Final safety clamp
    const currentH = parseInt(modalScreen.style.height);
    if (currentH > maxAllowed) {
      modalScreen.style.height = maxAllowed + 'px';
      modalScreen.style.overflow = 'hidden';
      modalContent.style.overflowY = 'auto';
      modalContent.style.paddingBottom = MODAL_SCROLL_PAD + 'px';
    }
  }

  // ── Modal: Open ──
  function openModal(entry) {
    modalTitle.textContent = entry.title;
    modalContent.innerHTML = entry.content || '<p>No further details available.</p>';

    // Set data-universe on outer modal content for per-universe theming
    modalContentOuter.dataset.universe = entry.universe || 'pinnacle';

    // Populate stats sidebar
    if (entry.stats) {
      modalStatsContent.innerHTML = renderStats(entry.stats);
      // Immediately fill stat bars to their actual values (no animation)
      requestAnimationFrame(() => {
        modalStatsContent.querySelectorAll('.omni-stat-fill').forEach(fill => {
          // Temporarily disable transition for instant fill
          fill.style.transition = 'none';
          const target = parseInt(fill.dataset.value);
          fill.style.width = target + '%';
          // Re-enable transition for any future changes (not currently used but for consistency)
          requestAnimationFrame(() => {
            fill.style.transition = '';
          });
        });
      });
    } else {
      modalStatsContent.innerHTML = '<p style="color: #888; font-size: 0.85rem;">No stats available.</p>';
    }

    // Close sidebar when opening new entry
    closeStatsSidebar();

    // Adjust modal height based on content
    adjustModalHeight();

    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });
  }

  // ── Modal: Close ──
  function closeModal() {
    modal.classList.remove('visible');
  }

  // ── Modal: Next entry ──
  function nextEntry() {
    if (currentFilteredEntries.length === 0) return;
    currentEntryIndex = (currentEntryIndex + 1) % currentFilteredEntries.length;
    const entry = currentFilteredEntries[currentEntryIndex];
    if (entry) openModal(entry);
  }

  // ── Stats Sidebar ──
  function toggleStatsSidebar() {
    statsSidebarOpen = !statsSidebarOpen;
    if (statsSidebarOpen) {
      modalStatsSidebar.classList.add('open');
      modalBodyWrapper.classList.add('sidebar-open');
    } else {
      closeStatsSidebar();
    }
  }

  function closeStatsSidebar() {
    statsSidebarOpen = false;
    modalStatsSidebar.classList.remove('open');
    modalBodyWrapper.classList.remove('sidebar-open');
  }

  // ── Stat click tooltip ──
  // Shows a small explanation when a stat label is clicked in the sidebar.
  // Tooltips dismiss when clicking anywhere outside the stat element.
  function attachStatTooltips() {
    // Single delegated listener on the stats container
    modalStatsContent.addEventListener('click', function(e) {
      const statEl = e.target.closest('.omni-stat');
      if (!statEl) return;

      // Toggle tooltip on this stat
      const existing = statEl.querySelector('.omni-stat-tooltip');
      if (existing) {
        existing.remove();
        return;
      }

      // Remove all other tooltips first
      document.querySelectorAll('.omni-stat-tooltip').forEach(t => t.remove());

      const label = statEl.dataset.statLabel;
      const value = statEl.dataset.statValue;
      const title = currentFilteredEntries[currentEntryIndex]?.title || '';
      const tooltip = document.createElement('div');
      tooltip.className = 'omni-stat-tooltip';
      tooltip.textContent = getStatExplanation(label, value, title);
      statEl.appendChild(tooltip);
    });
  }

  // ── Dismiss tooltips on click outside any stat ──
  document.addEventListener('click', function(e) {
    if (!modal.classList.contains('visible')) return;
    if (e.target.closest('.omni-stat')) return;
    document.querySelectorAll('.omni-stat-tooltip').forEach(t => t.remove());
  });

  // ── Stat explanation generator ──
  function getStatExplanation(label, value, title) {
    const explanations = {
      threat_level: 'How dangerous this creature is in combat.',
      aggression: 'Likelihood of attacking unprovoked.',
      intelligence: 'Problem-solving and adaptability capacity.',
      speed: 'Movement and reaction speed rating.',
      energy_draw: 'Magical energy required to cast or maintain.',
      stability: 'How reliably the spell or object functions.',
      range: 'Effective distance of effect.',
      precision: 'Accuracy and control required.',
      danger_level: 'Overall hazard assessment for this location.',
      knowledge_value: 'Amount of useful information held within.',
      accessibility: 'Ease of entry or retrieval.',
      power_level: 'Raw magical or physical power.',
      dangerousness: 'Tendency to cause harm or disruption.',
      loyalty: 'Trustworthiness or allegiance stability.',
      fire_power: 'Thermal energy output.',
      durability: 'Resistance to damage and wear.',
      rareness: 'Scarcity and value on the open market.',
      sentience: 'Level of self-awareness or independent will.',
    };
    const cleanLabel = label.toLowerCase().replace(/ /g, '_');
    return explanations[cleanLabel] || `Statistic: ${label} = ${value}/100.`;
  }

  // ── Event Listeners ──

  // Close button
  modalClose.addEventListener('click', closeModal);

  // Next button
  modalNext.addEventListener('click', nextEntry);

  // Close modal on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Stats sidebar toggle
  modalStatsToggle.addEventListener('click', () => {
    toggleStatsSidebar();
    if (statsSidebarOpen) {
      // Attach tooltips after sidebar opens and renders
      requestAnimationFrame(attachStatTooltips);
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('visible')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight' || e.key === 'n') nextEntry();
  });

  // ── Tab Handlers ──
  universeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      universeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentUniverse = tab.dataset.universe;
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