/* =========================================================
   Lore Lens — links Omni-Dex entries inside book/poetry text
   Author: KnowFlux
   =========================================================
   Reads omni-dex-data.json, finds entry names in rendered
   content, and shows a popover card on click. No backend.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var CONTENT_SELECTOR = '.page-content, .poetry-content';
  if (!document.querySelector(CONTENT_SELECTOR)) return;

  // ---------- State ----------
  var byName = {};          // lowercased name/alias -> entry
  var entriesById = {};     // id -> entry
  var matcher = null;       // compiled RegExp
  var popover = null;
  var modal = null;         // expanded full-screen card
  var activeId = null;
  var scanTimer = null;

  // ---------- Helpers ----------
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function formatStatName(name) {
    return name.split('_').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  // ---------- Index ----------
  function buildIndex(data) {
    var entries = data.entries || data;

    entries.forEach(function (e) {
      var entry = {
        id: e.id,
        name: e.title,
        universe: e.universe,
        type: e.type,
        description: e.short_description,
        content: e.content,
        stats: e.stats,
        statDescriptions: e.statDescriptions || {}
      };
      entriesById[entry.id] = entry;
      [entry.name].concat(e.aliases || []).forEach(function (nm) {
        if (nm) byName[nm.toLowerCase()] = entry;
      });
    });

    var names = Object.keys(byName).sort(function (a, b) {
      return b.length - a.length; // longest first
    });
    if (!names.length) return;

    matcher = new RegExp(
      '\\b(?:' + names.map(escapeRegExp).join('|') + ')(?:s|es)?\\b',
      'gi'
    );
  }

  function entryForMatch(text) {
    var key = text.toLowerCase();
    if (byName[key]) return byName[key];
    if (key.slice(-2) === 'es' && byName[key.slice(0, -2)]) return byName[key.slice(0, -2)];
    if (key.slice(-1) === 's' && byName[key.slice(0, -1)]) return byName[key.slice(0, -1)];
    return null;
  }

  // ---------- Linkify ----------
  function linkTextNode(node, seen) {
    var text = node.nodeValue;
    if (!text || !matcher) return;

    matcher.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var emitFrom = 0;
    var m;

    while ((m = matcher.exec(text)) !== null) {
      var entry = entryForMatch(m[0]);
      if (!entry) continue;
      if (seen[entry.id]) continue;   // already linked once on this page

      if (m.index > emitFrom) {
        frag.appendChild(document.createTextNode(text.slice(emitFrom, m.index)));
      }
      var span = document.createElement('span');
      span.className = 'lore-link';
      span.setAttribute('data-lore-id', entry.id);
      span.setAttribute('role', 'button');
      span.setAttribute('tabindex', '0');
      span.textContent = m[0];
      frag.appendChild(span);
      seen[entry.id] = true;
      emitFrom = matcher.lastIndex;
    }

    if (emitFrom === 0) return;
    if (emitFrom < text.length) {
      frag.appendChild(document.createTextNode(text.slice(emitFrom)));
    }
    node.parentNode.replaceChild(frag, node);
  }

  function scanRoot(root, seen) {
    if (!root || !matcher) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentNode;
        if (!parent) return NodeFilter.FILTER_REJECT;
        var tag = parent.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'A' || tag === 'CODE') {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.classList && parent.classList.contains('lore-link')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (n) { linkTextNode(n, seen); });
  }

  function scanAll() {
    var seen = {};
    // Seed with entries already linked so re-scans don't add duplicates.
    document.querySelectorAll('.lore-link').forEach(function (el) {
      seen[el.getAttribute('data-lore-id')] = true;
    });
    document.querySelectorAll(CONTENT_SELECTOR).forEach(function (root) {
      scanRoot(root, seen);
    });
  }

  // ---------- Popover ----------
  function ensurePopover() {
    if (popover) return popover;
    popover = document.createElement('div');
    popover.className = 'lore-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Lore card');
    popover.innerHTML =
      '<button class="lore-popover-close" aria-label="Close">&times;</button>' +
      '<div class="lore-popover-tag"></div>' +
      '<h3 class="lore-popover-title"></h3>' +
      '<p class="lore-popover-desc"></p>' +
      '<div class="lore-popover-footer">' +
        '<button class="lore-popover-expand" type="button" aria-label="Expand entry">' +
          '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
            'stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="15 3 21 3 21 9"></polyline>' +
            '<polyline points="9 21 3 21 3 15"></polyline>' +
            '<line x1="21" y1="3" x2="14" y2="10"></line>' +
            '<line x1="3" y1="21" x2="10" y2="14"></line>' +
          '</svg>' +
        '</button>' +
        '<a class="lore-popover-link" href="omni-dex.html">View in Omni-Dex &rarr;</a>' +
      '</div>';
    document.body.appendChild(popover);
    popover.querySelector('.lore-popover-close').addEventListener('click', hidePopover);
    popover.querySelector('.lore-popover-expand').addEventListener('click', function () {
      if (activeId) openModal(activeId);
    });
    return popover;
  }

  function typeLabelOf(entry) {
    return entry.type
      ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1) : 'Entry';
  }

  function universeLabelOf(entry) {
    return entry.universe === 'exploded' ? 'Exploded'
      : (entry.universe ? entry.universe.charAt(0).toUpperCase() + entry.universe.slice(1) : 'KnowFlux');
  }

  function renderPopover(entry) {
    var pop = ensurePopover();
    pop.querySelector('.lore-popover-tag').textContent =
      universeLabelOf(entry) + ' | ' + typeLabelOf(entry);
    pop.querySelector('.lore-popover-title').textContent = entry.name || 'Untitled';
    pop.querySelector('.lore-popover-desc').textContent = entry.description || '';
    pop.setAttribute('data-universe', entry.universe || 'pinnacle');
  }

  function positionPopover(anchor) {
    var pop = ensurePopover();
    var r = anchor.getBoundingClientRect();
    var margin = 12;

    pop.classList.add('visible');
    pop.style.visibility = 'hidden';
    var pr = pop.getBoundingClientRect();

    var left = r.left + window.scrollX + (r.width / 2) - (pr.width / 2);
    var maxLeft = window.scrollX + document.documentElement.clientWidth - pr.width - margin;
    left = Math.max(window.scrollX + margin, Math.min(left, maxLeft));

    var top = r.bottom + window.scrollY + 8;
    if (r.bottom + pr.height + 24 > window.innerHeight && r.top - pr.height - 12 > 0) {
      top = r.top + window.scrollY - pr.height - 8;
    }
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
    pop.style.visibility = '';
  }

  function showPopover(anchor) {
    var entry = entriesById[anchor.getAttribute('data-lore-id')];
    if (!entry) return;
    activeId = anchor.getAttribute('data-lore-id');
    renderPopover(entry);
    positionPopover(anchor);
    document.querySelectorAll('.lore-link.active').forEach(function (el) {
      el.classList.remove('active');
    });
    anchor.classList.add('active');
  }

  function hidePopover() {
    if (popover) popover.classList.remove('visible');
    activeId = null;
    document.querySelectorAll('.lore-link.active').forEach(function (el) {
      el.classList.remove('active');
    });
  }

  // ---------- Expanded modal (mirrors the Omni-Dex modal) ----------
  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'lore-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Omni-Dex entry');
    modal.innerHTML =
      '<div class="lore-modal-content">' +
        '<div class="lore-modal-screen">' +
          '<div class="lore-modal-titlebar">' +
            '<span class="lore-modal-title">Title</span>' +
            '<button class="lore-modal-stats-btn" type="button">Stats</button>' +
          '</div>' +
          '<div class="lore-modal-body-wrapper">' +
            '<div class="lore-modal-body"></div>' +
            '<div class="lore-modal-stats-sidebar"><div class="lore-modal-stats-content"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="lore-modal-controls">' +
          '<button class="lore-modal-btn lore-modal-btn-close" type="button">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var sidebar = modal.querySelector('.lore-modal-stats-sidebar');
    var wrapper = modal.querySelector('.lore-modal-body-wrapper');

    modal.querySelector('.lore-modal-stats-btn').addEventListener('click', function () {
      sidebar.classList.toggle('open');
      wrapper.classList.toggle('sidebar-open');
    });
    modal.querySelector('.lore-modal-btn-close').addEventListener('click', hideModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) hideModal();
    });
    // Stat tooltips (same behavior as Omni-Dex)
    modal.querySelector('.lore-modal-stats-content').addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('.omni-stat-trigger') : null;
      var label = e.target.closest ? e.target.closest('.omni-stat-label') : null;
      modal.querySelectorAll('.lore-stat-tooltip').forEach(function (t) { t.remove(); });

      if (trigger) {
        var statItem = trigger.closest('.omni-stat');
        if (statItem) statItem.classList.toggle('open');
        return;
      }

      if (!label) return;
      var entry = entriesById[activeId];
      var statName = label.getAttribute('data-stat');
      if (!entry || !entry.statDescriptions || !entry.statDescriptions[statName]) return;
      var tip = document.createElement('div');
      tip.className = 'lore-stat-tooltip';
      tip.textContent = entry.statDescriptions[statName];
      label.appendChild(tip);
    });
    return modal;
  }

  function buildStatsHtml(entry) {
    if (!entry.stats) return '<p>No stats available.</p>';
    var html = '';
    Object.keys(entry.stats).forEach(function (statName) {
      var value = entry.stats[statName];
      var description = entry.statDescriptions && entry.statDescriptions[statName]
        ? entry.statDescriptions[statName]
        : 'No description available.';
      html +=
        '<div class="omni-stat">' +
          '<button class="omni-stat-trigger" type="button" data-stat="' + statName + '">' +
            '<span class="omni-stat-label" data-stat="' + statName + '">' +
              formatStatName(statName) +
            '</span>' +
            '<span class="omni-stat-value">' + value + '</span>' +
          '</button>' +
          '<div class="omni-stat-bar">' +
            '<div class="omni-stat-fill" style="--target-width:' + value + '%"></div>' +
          '</div>' +
          '<div class="omni-stat-description">' + description + '</div>' +
        '</div>';
    });
    return html;
  }

  function openModal(id) {
    var entry = entriesById[id];
    if (!entry) return;
    hidePopover();
    activeId = id;

    var m = ensureModal();
    var universe = entry.universe || 'pinnacle';
    m.setAttribute('data-universe', universe);
    m.querySelector('.lore-modal-content').setAttribute('data-universe', universe);
    m.querySelector('.lore-modal-title').textContent = entry.name || 'Untitled';
    m.querySelector('.lore-modal-body').innerHTML = entry.content || entry.description || '';
    m.querySelector('.lore-modal-stats-content').innerHTML = buildStatsHtml(entry);

    m.querySelector('.lore-modal-stats-sidebar').classList.remove('open');
    m.querySelector('.lore-modal-body-wrapper').classList.remove('sidebar-open');

    document.body.classList.add('lore-modal-active');
    m.classList.add('visible');
  }

  function hideModal() {
    if (!modal) return;
    modal.classList.remove('visible');
    document.body.classList.remove('lore-modal-active');
    modal.querySelectorAll('.lore-stat-tooltip').forEach(function (t) { t.remove(); });
    activeId = null;
    document.querySelectorAll('.lore-link.active').forEach(function (el) {
      el.classList.remove('active');
    });
  }

  // ---------- Events ----------
  document.addEventListener('click', function (e) {
    var t = e.target;
    // While the modal is open, keep clicks inside it away from popover logic.
    if (modal && modal.classList.contains('visible')) {
      if (modal.contains(t)) {
        if (!(t.closest && t.closest('.omni-stat-label'))) {
          modal.querySelectorAll('.lore-stat-tooltip').forEach(function (x) { x.remove(); });
        }
        return;
      }
    }
    var link = t.closest ? t.closest('.lore-link') : null;
    if (link) {
      e.preventDefault();
      if (activeId === link.getAttribute('data-lore-id')) hidePopover();
      else showPopover(link);
      return;
    }
    if (popover && popover.contains(t)) return;
    hidePopover();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modal && modal.classList.contains('visible')) hideModal();
      else hidePopover();
    }
    if ((e.key === 'Enter' || e.key === ' ') &&
        e.target.classList && e.target.classList.contains('lore-link')) {
      e.preventDefault();
      showPopover(e.target);
    }
  });

  window.addEventListener('scroll', function () {
    if (modal && modal.classList.contains('visible')) return;
    if (activeId) hidePopover();
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (modal && modal.classList.contains('visible')) return;
    if (activeId) hidePopover();
  });

  // ---------- Observe async-injected content ----------
  function debouncedScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanAll, 120);
  }

  function observeContainers() {
    var observer = new MutationObserver(debouncedScan);
    document.querySelectorAll(CONTENT_SELECTOR).forEach(function (el) {
      observer.observe(el, { childList: true, subtree: true });
    });
  }

  // ---------- Boot ----------
  fetch('omni-dex-data.json')
    .then(function (r) {
      if (!r.ok) throw new Error('Failed to load omni-dex-data.json');
      return r.json();
    })
    .then(function (data) {
      buildIndex(data);
      scanAll();           // static pages (poetry)
      observeContainers(); // dynamic pages (books)
    })
    .catch(function (err) {
      console.warn('Lore Lens: disabled —', err.message);
    });

});