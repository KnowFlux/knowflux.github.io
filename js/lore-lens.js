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
  function linkTextNode(node) {
    var text = node.nodeValue;
    if (!text || !matcher) return;

    matcher.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var emitFrom = 0;
    var m;

    while ((m = matcher.exec(text)) !== null) {
      var entry = entryForMatch(m[0]);
      if (!entry) continue;

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
      emitFrom = matcher.lastIndex;
    }

    if (emitFrom === 0) return;
    if (emitFrom < text.length) {
      frag.appendChild(document.createTextNode(text.slice(emitFrom)));
    }
    node.parentNode.replaceChild(frag, node);
  }

  function scanRoot(root) {
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
    nodes.forEach(linkTextNode);
  }

  function scanAll() {
    document.querySelectorAll(CONTENT_SELECTOR).forEach(scanRoot);
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
      '<div class="lore-popover-body"></div>' +
      '<div class="lore-popover-stats"></div>' +
      '<a class="lore-popover-link" href="omni-dex.html">View in Omni-Dex &rarr;</a>';
    document.body.appendChild(popover);
    popover.querySelector('.lore-popover-close').addEventListener('click', hidePopover);
    return popover;
  }

  function renderPopover(entry) {
    var pop = ensurePopover();
    var typeLabel = entry.type
      ? entry.type.charAt(0).toUpperCase() + entry.type.slice(1) : 'Entry';
    var universeLabel = entry.universe === 'exploded' ? 'Exploded'
      : (entry.universe ? entry.universe.charAt(0).toUpperCase() + entry.universe.slice(1) : 'KnowFlux');

    pop.querySelector('.lore-popover-tag').textContent = universeLabel + ' | ' + typeLabel;
    pop.querySelector('.lore-popover-title').textContent = entry.name || 'Untitled';
    pop.querySelector('.lore-popover-body').innerHTML = entry.content || entry.description || '';

    var statsHtml = '';
    if (entry.stats) {
      Object.keys(entry.stats).forEach(function (statName) {
        var value = entry.stats[statName];
        statsHtml +=
          '<div class="lore-stat">' +
            '<span class="lore-stat-label">' + formatStatName(statName) + '</span>' +
            '<span class="lore-stat-value">' + value + '</span>' +
            '<div class="lore-stat-bar"><div class="lore-stat-fill" style="width:' + value + '%"></div></div>' +
          '</div>';
      });
    }
    pop.querySelector('.lore-popover-stats').innerHTML = statsHtml;
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

  // ---------- Events ----------
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.lore-link') : null;
    if (link) {
      e.preventDefault();
      if (activeId === link.getAttribute('data-lore-id')) hidePopover();
      else showPopover(link);
      return;
    }
    if (popover && popover.contains(e.target)) return;
    hidePopover();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hidePopover();
    if ((e.key === 'Enter' || e.key === ' ') &&
        e.target.classList && e.target.classList.contains('lore-link')) {
      e.preventDefault();
      showPopover(e.target);
    }
  });

  window.addEventListener('scroll', function () { if (activeId) hidePopover(); }, { passive: true });
  window.addEventListener('resize', function () { if (activeId) hidePopover(); });

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