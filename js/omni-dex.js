/* =========================================================
   Omni-Dex JS - Card grid, filters, tab switching, modal
   ========================================================= */

(function() {
  'use strict';

  // ---------- DOM References ----------
  const grid          = document.getElementById('omni-card-grid');
  const statusEl      = document.getElementById('omni-status');
  const tabs          = document.querySelectorAll('.omni-tab');
  const pills         = document.querySelectorAll('.type-pill');
  const modal         = document.getElementById('omni-modal');
  const modalContent  = document.getElementById('omni-modal-content');
  const modalBody     = document.getElementById('omni-modal-content');
  const modalTitle    = document.querySelector('.omni-modal-title');
  const modalContentDiv = document.getElementById('omni-modal-content');
  const modalStatsSidebar = document.getElementById('omni-modal-stats-sidebar');
  const modalStatsContent = document.getElementById('omni-modal-stats-content');
  const toggleStatsBtn   = document.getElementById('omni-modal-toggle-stats');
  const closeBtn      = document.getElementById('omni-modal-close');
  const nextBtn       = document.getElementById('omni-modal-next');
  const omniStatus    = document.getElementById('omni-status');

  // ---------- State ----------
  let allEntries = [];
  let currentUniverse = 'all';
  let currentType = 'all';
  let currentIndex = 0;
  let filteredEntries = [];

  // ---------- Load Data ----------
  function loadData() {
    showStatus('Loading Omni-Dex...');
    fetch('omni-dex-data.json')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load data');
        return response.json();
      })
      .then(data => {
        allEntries = (data.entries || data).map(e => ({
        name: e.title,
        universe: e.universe,
        type: e.type,
        description: e.short_description,
        longDesc: e.content,
        stats: e.stats,
        statDescriptions: {}
      }));
        hideStatus();
        applyFilters();
      })
      .catch(err => {
        showStatus('Error loading data: ' + err.message);
      });
  }

  // ---------- Status Helpers ----------
  function showStatus(msg) {
    if (omniStatus) {
      omniStatus.textContent = msg;
      omniStatus.classList.remove('hidden');
    }
  }

  function hideStatus() {
    if (omniStatus) {
      omniStatus.classList.add('hidden');
    }
  }

  // ---------- Filtering ----------
  function applyFilters() {
    filteredEntries = allEntries.filter(entry => {
      // Universe filter
      if (currentUniverse !== 'all' && entry.universe !== currentUniverse) {
        return false;
      }
      // Type filter
      if (currentType !== 'all' && entry.type !== currentType) {
        return false;
      }
      return true;
    });

    renderGrid();
  }

  // ---------- Render Card Grid ----------
  function renderGrid() {
    if (!grid) return;

    if (filteredEntries.length === 0) {
      grid.innerHTML = '<p class="omni-status">No entries match your filters.</p>';
      return;
    }

    let html = '';
    filteredEntries.forEach((entry, index) => {
      const universeClass = entry.universe === 'exploded' ? 'card-exploded' : 'card-pinnacle';
      const universeLabel = entry.universe === 'exploded' ? 'Exploded' : 'Pinnacle';
      const typeLabel = entry.type ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1) : 'Unknown';

      // Stat bars
      let statsHtml = '';
      if (entry.stats) {
        statsHtml = '<div class="omni-card-stats">';
        Object.keys(entry.stats).forEach(statName => {
          const value = entry.stats[statName];
          statsHtml += `
            <div class="omni-stat">
              <span class="omni-stat-label">${statName}</span>
              <div class="omni-stat-bar">
                <div class="omni-stat-fill" style="--target-width:${value}%"></div>
              </div>
              <span class="omni-stat-value">${value}</span>
            </div>
          `;
        });
        statsHtml += '</div>';
      }

      html += `
        <div class="omni-card ${universeClass}" data-index="${index}" onclick="openModalByIndex(${index})">
          <div class="omni-card-header">${universeLabel} | ${typeLabel}</div>
          <h3 class="omni-card-title">${entry.name || 'Untitled'}</h3>
          <p class="omni-card-desc">${entry.description || entry.shortDesc || ''}</p>
          ${statsHtml}
        </div>
      `;
    });

    grid.innerHTML = html;
  }

  // ---------- Tab Switching ----------
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      currentUniverse = this.dataset.universe;
      applyFilters();
    });
  });

  // ---------- Type Filter Pills ----------
  pills.forEach(pill => {
    pill.addEventListener('click', function() {
      pills.forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      currentType = this.dataset.type;
      applyFilters();
    });
  });

  // ---------- Modal ----------
  // Expose openModalByIndex globally so onclick in card works
  window.openModalByIndex = function(index) {
    const entry = filteredEntries[index];
    if (!entry) return;
    currentIndex = index;

    // Show modal
    modal.classList.add('visible');
    document.body.classList.add('modal-active');

    // Set universe attribute for per-theme styling (on both overlay and content)
    modal.setAttribute('data-universe', entry.universe || 'pinnacle');
    modalContent.setAttribute('data-universe', entry.universe || 'pinnacle');

    // Title
    modalTitle.textContent = entry.name || 'Untitled';

    // Body content
    let bodyHtml = entry.longDesc || entry.description || '';
    if (entry.details) {
      bodyHtml += '<br><br>' + entry.details;
    }
    modalContentDiv.innerHTML = bodyHtml;

    // Stats sidebar
    let statsHtml = '';
    if (entry.stats) {
      Object.keys(entry.stats).forEach(statName => {
        const value = entry.stats[statName];
        statsHtml += `
          <div class="omni-stat">
            <span class="omni-stat-label" onclick="showStatTooltip(this, '${statName}')">${statName}</span>
            <div class="omni-stat-bar">
              <div class="omni-stat-fill" style="--target-width:${value}%"></div>
            </div>
            <span class="omni-stat-value">${value}</span>
          </div>
        `;
      });
    } else {
      statsHtml = '<p>No stats available.</p>';
    }
    modalStatsContent.innerHTML = statsHtml;

    // Close sidebar if open
    modalStatsSidebar.classList.remove('open');
    document.querySelector('.omni-modal-body-wrapper').classList.remove('sidebar-open');
  };

  // ---------- Close Modal ----------
  function closeModal() {
    modal.classList.remove('visible');
    document.body.classList.remove('modal-active');
    // Clean up any tooltips
    document.querySelectorAll('.omni-stat-tooltip').forEach(t => t.remove());
  }

  // ---------- Toggle Stats Sidebar ----------
  toggleStatsBtn.addEventListener('click', function() {
    modalStatsSidebar.classList.toggle('open');
    document.querySelector('.omni-modal-body-wrapper').classList.toggle('sidebar-open');
  });

  // ---------- Next Entry ----------
  nextBtn.addEventListener('click', function() {
    if (filteredEntries.length === 0) return;
    currentIndex = (currentIndex + 1) % filteredEntries.length;
    window.openModalByIndex(currentIndex);
  });

  // ---------- Close Button & Overlay Click ----------
  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // ---------- Keyboard Support ----------
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
    if (e.key === 'ArrowRight' && modal.classList.contains('visible')) {
      nextBtn.click();
    }
  });

  // ---------- Stat Tooltip ----------
  window.showStatTooltip = function(element, statName) {
    // Remove any existing tooltips
    document.querySelectorAll('.omni-stat-tooltip').forEach(t => t.remove());

    const entry = filteredEntries[currentIndex];
    if (!entry || !entry.statDescriptions || !entry.statDescriptions[statName]) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'omni-stat-tooltip';
    tooltip.textContent = entry.statDescriptions[statName];
    element.appendChild(tooltip);
  };

  // Click anywhere else to remove tooltip
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.omni-stat-tooltip') && !e.target.closest('.omni-stat-label')) {
      document.querySelectorAll('.omni-stat-tooltip').forEach(t => t.remove());
    }
  });

  // ---------- Init ----------
  loadData();

})();
