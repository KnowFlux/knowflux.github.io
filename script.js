// Script file for KnowFlux

document.addEventListener('DOMContentLoaded', function() {

  // ---------------------------------------------------------------------------
  // Promo message cycling
  // ---------------------------------------------------------------------------
  const promoElement = document.getElementById('promo');
  const promoMessages = promoElement.querySelectorAll('div');
  let currentIndex = 0;

  setInterval(function() {
    promoMessages[currentIndex].style.display = 'none';
    currentIndex = (currentIndex + 1) % promoMessages.length;
    promoMessages[currentIndex].style.display = 'block';
  }, 5000);

  // ---------------------------------------------------------------------------
  // Smart Reveal Header (hide on scroll down, show on scroll up)
  // ---------------------------------------------------------------------------
  const nav = document.getElementById('topMenu');
  const promo = document.getElementById('promo');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (window.scrollY > lastScrollY && window.scrollY > 100) {
      nav.classList.add('nav-hidden');
      promo.classList.add('nav-hidden');
    } else {
      nav.classList.remove('nav-hidden');
      promo.classList.remove('nav-hidden');
    }
    lastScrollY = window.scrollY;
  });

  // ---------------------------------------------------------------------------
  // Dynamic Copyright Year (CST)
  // ---------------------------------------------------------------------------
  const updateYear = () => {
    const yearElement = document.getElementById('copyright-year');
    if (yearElement) {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const cstDate = new Date(utcTime + (3600000 * -6));
      yearElement.textContent = cstDate.getFullYear();
    }
  };
  updateYear();

  // ---------------------------------------------------------------------------
  // Scroll Progress Bar
  // ---------------------------------------------------------------------------
  const progressBar = document.getElementById('scroll-progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const winScroll = window.pageYOffset || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      let scrolled = (winScroll / height) * 100;
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (isTouch && scrolled > 97) scrolled = 100;
      progressBar.style.height = Math.min(100, Math.max(0, scrolled)) + '%';
    });
  }

  // ---------------------------------------------------------------------------
  // Desktop: fix nested submenu overflow (fly-out to right, flip left if needed)
  // ---------------------------------------------------------------------------
  function fixDesktopSubOverflow() {
    // Run on all non-mobile screens (600px+) for more sensitive overflow detection
    if (window.innerWidth <= 600) return;
    document.querySelectorAll('#topLinks li ul li').forEach(li => {
      li.addEventListener('mouseenter', function() {
        const subUl = this.querySelector(':scope > ul');
        if (!subUl) return;
        // Temporarily make it visible off-screen to measure
        subUl.style.visibility = 'hidden';
        subUl.style.pointerEvents = 'none';
        subUl.classList.remove('flip-left');
        // Force reflow
        const rect = subUl.getBoundingClientRect();
        // Use 50px buffer for more conservative, sensitive detection (prevents off-screen)
        if (rect.right > window.innerWidth - 50) {
          subUl.classList.add('flip-left');
        }
        subUl.style.visibility = '';
        subUl.style.pointerEvents = '';
      });
    });
  }
  fixDesktopSubOverflow();

  // ---------------------------------------------------------------------------
  // Mobile Nav Overlay System
  // ---------------------------------------------------------------------------
  const isMobile = () => window.innerWidth <= 768;

  // Build a tree of nav items from the existing #topLinks ul
  function extractNavItems(ul) {
    const items = [];
    if (!ul) return items;
    ul.querySelectorAll(':scope > li').forEach(li => {
      const a = li.querySelector(':scope > a');
      const subUl = li.querySelector(':scope > ul');
      if (!a) return;
      items.push({
        text: a.textContent.trim(),
        href: a.getAttribute('href'),
        children: subUl ? extractNavItems(subUl) : []
      });
    });
    return items;
  }

  const navUl = document.querySelector('#topLinks > ul');
  const navTree = extractNavItems(navUl);

  // Build the overlay DOM once
  const overlay = document.createElement('div');
  overlay.id = 'mnav-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);

  const panelContainer = document.createElement('div');
  panelContainer.id = 'mnav-panels';
  overlay.appendChild(panelContainer);

  let panelStack = [];

  function closeMobileNav() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Clear panels after transition
    setTimeout(() => {
      panelContainer.innerHTML = '';
      panelStack = [];
    }, 320);
  }

  // Tap the dark backdrop to close
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeMobileNav();
  });

  function showPanel(items, title) {
    // Slide current panel left
    if (panelStack.length > 0) {
      const cur = panelStack[panelStack.length - 1];
      cur.classList.remove('mnav-active');
      cur.classList.add('mnav-out');
    }

    const panel = buildPanel(items, title, panelStack.length === 0);
    panelContainer.appendChild(panel);
    panelStack.push(panel);

    // Trigger slide-in animation
    requestAnimationFrame(() => requestAnimationFrame(() => {
      panel.classList.add('mnav-active');
    }));
  }

  function goBack() {
    if (panelStack.length <= 1) {
      closeMobileNav();
      return;
    }
    const dying = panelStack.pop();
    dying.classList.remove('mnav-active');
    dying.classList.add('mnav-exit');

    const prev = panelStack[panelStack.length - 1];
    prev.classList.remove('mnav-out');
    prev.classList.add('mnav-active');

    setTimeout(() => {
      if (dying.parentNode) dying.parentNode.removeChild(dying);
    }, 320);
  }

  function buildPanel(items, title, isRoot) {
    const panel = document.createElement('div');
    panel.className = 'mnav-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'mnav-header';

    const actionBtn = document.createElement('button');
    actionBtn.className = 'mnav-action-btn';
    if (isRoot) {
      actionBtn.innerHTML = '&#x2715;'; // ✕
      actionBtn.setAttribute('aria-label', 'Close menu');
      actionBtn.addEventListener('click', closeMobileNav);
    } else {
      actionBtn.innerHTML = '&#x2190; Back'; // ← Back
      actionBtn.setAttribute('aria-label', 'Back');
      actionBtn.addEventListener('click', goBack);
    }
    header.appendChild(actionBtn);

    if (title) {
      const titleEl = document.createElement('span');
      titleEl.className = 'mnav-title';
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }

    panel.appendChild(header);

    // Items list
    const ul = document.createElement('ul');
    ul.className = 'mnav-list';

    items.forEach(item => {
      const li = document.createElement('li');

      if (item.children.length > 0) {
        // Has sub-items — show as a button that opens the next panel
        const btn = document.createElement('button');
        btn.className = 'mnav-item mnav-has-children';
        const label = document.createElement('span');
        label.textContent = item.text;
        const arrow = document.createElement('span');
        arrow.className = 'mnav-arrow';
        arrow.innerHTML = '›';
        btn.appendChild(label);
        btn.appendChild(arrow);
        btn.addEventListener('click', () => showPanel(item.children, item.text));
        li.appendChild(btn);
      } else {
        // Leaf — navigate directly
        const a = document.createElement('a');
        a.className = 'mnav-item';
        a.href = item.href;
        a.textContent = item.text;
        a.addEventListener('click', closeMobileNav);
        li.appendChild(a);
      }

      ul.appendChild(li);
    });

    panel.appendChild(ul);
    return panel;
  }

  // Add hamburger button to the nav bar
  const topMenuWrap = document.querySelector('#topMenu .wrap');
  if (topMenuWrap) {
    const hamburger = document.createElement('button');
    hamburger.id = 'mnav-hamburger';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    topMenuWrap.appendChild(hamburger);

    hamburger.addEventListener('click', function() {
      if (!isMobile()) return;
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // Show ALL top-level nav items as the first panel
      showPanel(navTree, null);
    });
  }

  // ---------------------------------------------------------------------------
  // Save last-read book page
  // ---------------------------------------------------------------------------
  const pageNum = document.querySelector('.page-title');
  if (pageNum && pageNum.textContent.match(/^Page \d+/)) {
    localStorage.setItem('lastBookPage', window.location.pathname.split('/').pop());
  }

  // ---------------------------------------------------------------------------
  // Reading Experience Controller
  // Activates only on pages that contain .page-content (all book pages).
  // No HTML files need to be modified — everything is driven from here.
  // ---------------------------------------------------------------------------
  (function initReadingExperience() {

    const content = document.querySelector('.page-content');
    if (!content) return;               // Not a book page — stop here.

    // Mark the body so every scoped CSS rule activates
    document.body.classList.add('reading-page');

    // ── Restore user preferences from localStorage ───────────────────────────
    const FONT_SIZES    = ['rdr-text-sm', 'rdr-text-md', 'rdr-text-lg', 'rdr-text-xl'];
    const WIDTHS        = ['rdr-width-narrow', 'rdr-width-normal', 'rdr-width-wide'];
    const FONT_FAMILIES = ['rdr-font-normal', 'rdr-font-garamond', 'rdr-font-lora'];
    const savedSize     = localStorage.getItem('rdr-font-size')    || 'rdr-text-md';
    const savedWidth    = localStorage.getItem('rdr-width')        || 'rdr-width-normal';
    const savedFont     = localStorage.getItem('rdr-font-family')  || 'rdr-font-normal';
    const savedFocus    = localStorage.getItem('rdr-focus')        === 'true';

    document.body.classList.add(savedSize, savedWidth, savedFont);
    if (savedFocus) document.body.classList.add('rdr-focus');

    // ── Word count + estimated reading time ──────────────────────────────────
    const words       = content.innerText.trim().split(/\s+/).filter(Boolean).length;
    const readingMins = Math.max(1, Math.round(words / 200));
    const header      = document.querySelector('.page-header-container');

    if (header) {
      const meta = document.createElement('div');
      meta.className = 'rdr-meta';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'rdr-time-badge';
      timeBadge.textContent = '\u23F1 ' + readingMins + ' min read';

      const wordBadge = document.createElement('span');
      wordBadge.className = 'rdr-word-badge';
      wordBadge.textContent = words.toLocaleString() + ' words';

      meta.appendChild(timeBadge);
      meta.appendChild(wordBadge);
      header.appendChild(meta);
    }

    // ── Three-dots toggle button ──────────────────────────────────────────────
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'rdr-toolbar-toggle';
    toggleBtn.setAttribute('aria-label', 'Reading settings');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = '&#x22EE;';
    document.body.appendChild(toggleBtn);

    // ── Slide-over backdrop overlay ───────────────────────────────────────────
    const settingsOverlay = document.createElement('div');
    settingsOverlay.id = 'rdr-settings-overlay';
    document.body.appendChild(settingsOverlay);

    // ── Slide-over settings panel ─────────────────────────────────────────────
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'rdr-settings-panel';
    settingsPanel.setAttribute('role', 'dialog');
    settingsPanel.setAttribute('aria-label', 'Reading settings');
    document.body.appendChild(settingsPanel);

    const panelHeader = document.createElement('div');
    panelHeader.id = 'rdr-settings-header';
    panelHeader.innerHTML =
      '<span id="rdr-settings-title">Display</span>' +
      '<button id="rdr-settings-close" aria-label="Close settings">&#x2715;</button>';
    settingsPanel.appendChild(panelHeader);

    // The toolbar variable points to the button container so existing queries work
    const toolbar = document.createElement('div');
    toolbar.id = 'rdr-settings-body';

    var widthSection = isMobile() ? '' :
      '<div class="rdr-tb-section rdr-width-section">' +
        '<div class="rdr-tb-label">Line Width</div>' +
        '<div class="rdr-btn-row">' +
          '<button class="rdr-ctrl-btn rdr-width-btn" data-width="rdr-width-narrow" aria-label="Narrow">Narrow</button>' +
          '<button class="rdr-ctrl-btn rdr-width-btn" data-width="rdr-width-normal" aria-label="Normal">Normal</button>' +
          '<button class="rdr-ctrl-btn rdr-width-btn" data-width="rdr-width-wide"   aria-label="Wide">Wide</button>' +
        '</div>' +
      '</div>';

    toolbar.innerHTML =
      '<div class="rdr-tb-section">' +
        '<div class="rdr-tb-label">Text Size</div>' +
        '<div class="rdr-btn-row">' +
          '<button class="rdr-ctrl-btn rdr-size-btn" data-size="rdr-text-sm"  aria-label="Small">A\u207B</button>' +
          '<button class="rdr-ctrl-btn rdr-size-btn" data-size="rdr-text-md"  aria-label="Normal">A</button>' +
          '<button class="rdr-ctrl-btn rdr-size-btn" data-size="rdr-text-lg"  aria-label="Large">A\u207A</button>' +
          '<button class="rdr-ctrl-btn rdr-size-btn" data-size="rdr-text-xl"  aria-label="X-Large">A\u207A\u207A</button>' +
        '</div>' +
      '</div>' +
      '<div class="rdr-tb-section">' +
        '<div class="rdr-tb-label">Font</div>' +
        '<div class="rdr-btn-row rdr-font-row">' +
          '<button class="rdr-ctrl-btn rdr-font-btn" data-font="rdr-font-normal"   aria-label="Normal">Normal</button>' +
          '<button class="rdr-ctrl-btn rdr-font-btn" data-font="rdr-font-garamond" aria-label="EB Garamond" style="font-family:\'EB Garamond\',Georgia,serif">Garamond</button>' +
          '<button class="rdr-ctrl-btn rdr-font-btn" data-font="rdr-font-lora"     aria-label="Lora" style="font-family:\'Lora\',Georgia,serif">Lora</button>' +
        '</div>' +
      '</div>' +
      widthSection +
      '<div class="rdr-tb-section">' +
        '<button class="rdr-full-btn" id="rdr-focus-btn">' +
          (savedFocus ? '\u2726 Exit Focus' : '\u2726 Focus Mode') +
        '</button>' +
      '</div>';

    settingsPanel.appendChild(toolbar);

    // Mark the saved-state buttons as active
    const initSizeBtn  = toolbar.querySelector('[data-size="'  + savedSize  + '"]');
    const initWidthBtn = toolbar.querySelector('[data-width="' + savedWidth + '"]');
    const initFontBtn  = toolbar.querySelector('[data-font="'  + savedFont  + '"]');
    if (initSizeBtn)  initSizeBtn.classList.add('rdr-active');
    if (initWidthBtn) initWidthBtn.classList.add('rdr-active');
    if (initFontBtn)  initFontBtn.classList.add('rdr-active');
    if (savedFocus)   document.getElementById('rdr-focus-btn').classList.add('rdr-active');

    // Open / close slide-over
    function openToolbar() {
      settingsOverlay.classList.add('rdr-open');
      settingsPanel.classList.add('rdr-open');
      toggleBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function closeToolbar() {
      settingsOverlay.classList.remove('rdr-open');
      settingsPanel.classList.remove('rdr-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      settingsPanel.classList.contains('rdr-open') ? closeToolbar() : openToolbar();
    });

    settingsOverlay.addEventListener('click', closeToolbar);
    document.getElementById('rdr-settings-close').addEventListener('click', closeToolbar);

    // Font-family control
    toolbar.querySelectorAll('.rdr-font-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var f = this.dataset.font;
        FONT_FAMILIES.forEach(function(c) { document.body.classList.remove(c); });
        document.body.classList.add(f);
        localStorage.setItem('rdr-font-family', f);
        toolbar.querySelectorAll('.rdr-font-btn').forEach(function(b) { b.classList.remove('rdr-active'); });
        this.classList.add('rdr-active');
      }.bind(btn));
    });

    // Font-size control
    toolbar.querySelectorAll('.rdr-size-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var size = this.dataset.size;
        FONT_SIZES.forEach(function(c) { document.body.classList.remove(c); });
        document.body.classList.add(size);
        localStorage.setItem('rdr-font-size', size);
        toolbar.querySelectorAll('.rdr-size-btn').forEach(function(b) { b.classList.remove('rdr-active'); });
        this.classList.add('rdr-active');
      }.bind(btn));
    });

    // Line-width control
    toolbar.querySelectorAll('.rdr-width-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var w = this.dataset.width;
        WIDTHS.forEach(function(c) { document.body.classList.remove(c); });
        document.body.classList.add(w);
        localStorage.setItem('rdr-width', w);
        toolbar.querySelectorAll('.rdr-width-btn').forEach(function(b) { b.classList.remove('rdr-active'); });
        this.classList.add('rdr-active');
      }.bind(btn));
    });

    // Focus mode
    document.getElementById('rdr-focus-btn').addEventListener('click', function() {
      var isFocus = document.body.classList.toggle('rdr-focus');
      localStorage.setItem('rdr-focus', isFocus);
      this.textContent = isFocus ? '\u2726 Exit Focus' : '\u2726 Focus Mode';
      this.classList.toggle('rdr-active', isFocus);
    });

    // ── Keyboard arrow navigation between pages ───────────────────────────────
    var nextHref = null;
    var prevHref = null;

    // Pull links directly from the footer nav buttons
    var footerLinks = document.querySelectorAll('.page-footer-action a');
    footerLinks.forEach(function(a) {
      var href = a.getAttribute('href');
      var txt  = a.textContent.trim();
      // Emoji arrows are reliable indicators in the current markup
      if (txt.includes('\u27A1') || txt.includes('\u27B6') || txt.includes('\u2192')) {
        nextHref = href;
      } else if (txt.includes('\u2B05') || txt.includes('\u2190')) {
        prevHref = href;
      }
    });

    // Fallback: infer from URL pattern (e.g. exploded-page3.html → page2 / page4)
    if (!nextHref || !prevHref) {
      var fileName  = window.location.pathname.split('/').pop();
      var pageMatch = fileName.match(/^(.+?-page)(\d+)\.html$/);
      if (pageMatch) {
        var prefix = pageMatch[1];
        var num    = parseInt(pageMatch[2], 10);
        if (!prevHref && num > 1) prevHref = prefix + (num - 1) + '.html';
        if (!nextHref)            nextHref = prefix + (num + 1) + '.html';
      }
    }

    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && nextHref) window.location.href = nextHref;
      if (e.key === 'ArrowLeft'  && prevHref) window.location.href = prevHref;
    });

    // ── Chapter-start detection — adds 'chapter-start' class for drop cap ─────
    (function detectChapterStart() {
      var curFile  = window.location.pathname.split('/').pop();
      var curMatch = curFile.match(/^(.+?-page)(\d+)\.html$/);
      if (!curMatch) return;
      var pageNum = parseInt(curMatch[2], 10);
      if (pageNum === 1) {
        // First numbered page is always a chapter start
        document.body.classList.add('chapter-start');
        return;
      }
      // Fetch the previous page and compare subtitles
      var prevUrl  = curMatch[1] + (pageNum - 1) + '.html';
      var curSubEl = document.querySelector('.page-subtitle');
      var curName  = curSubEl ? curSubEl.textContent.trim() : '';
      fetch(prevUrl)
        .then(function(r) {
          if (!r.ok) { document.body.classList.add('chapter-start'); return ''; }
          return r.text();
        })
        .then(function(html) {
          if (!html) return;
          var doc     = (new DOMParser()).parseFromString(html, 'text/html');
          var prevSub = doc.querySelector('.page-subtitle');
          var prevName = prevSub ? prevSub.textContent.trim() : '';
          if (prevName !== curName) document.body.classList.add('chapter-start');
        })
        .catch(function() {});
    }());

    // Keyboard hint — show once per browser session
    var hintShown = sessionStorage.getItem('rdr-kbd-shown');
    if (!hintShown && (nextHref || prevHref)) {
      var hint = document.createElement('div');
      hint.id  = 'rdr-kbd-hint';
      var parts = [];
      if (prevHref) parts.push('<kbd>\u2190</kbd> Previous');
      if (nextHref) parts.push('Next <kbd>\u2192</kbd>');
      hint.innerHTML = parts.join('&nbsp;&nbsp;&nbsp;');
      document.body.appendChild(hint);
      setTimeout(function() { hint.classList.add('rdr-visible'); }, 1400);
      setTimeout(function() {
        hint.classList.remove('rdr-visible');
        setTimeout(function() { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 350);
      }, 4800);
      sessionStorage.setItem('rdr-kbd-shown', '1');
    }

    // ── Back-to-top button ────────────────────────────────────────────────────
    var backTop = document.createElement('button');
    backTop.id  = 'rdr-back-top';
    backTop.setAttribute('aria-label', 'Back to top');
    backTop.textContent = '\u2191';    // ↑
    document.body.appendChild(backTop);

    backTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ── Chapter completion toast ──────────────────────────────────────────────
    var toast        = document.createElement('div');
    toast.id         = 'rdr-complete-toast';
    var subtitle     = document.querySelector('.page-subtitle');
    var chapterName  = subtitle ? subtitle.textContent.trim() : 'Chapter';
    toast.textContent = chapterName + ' \u2014 Complete!';
    document.body.appendChild(toast);
    var toastShown   = false;
    var isChapterEnd = !nextHref; // true if this is the final page (no next)

    // Fetch the next sequential page (by URL pattern) to compare its subtitle
    // This avoids relying on footer links which may have inconsistent hrefs
    var curFile      = window.location.pathname.split('/').pop();
    var curPageMatch = curFile.match(/^(.+?-page)(\d+)\.html$/);
    var fetchNextUrl = curPageMatch
      ? curPageMatch[1] + (parseInt(curPageMatch[2], 10) + 1) + '.html'
      : null;

    if (fetchNextUrl) {
      fetch(fetchNextUrl)
        .then(function(r) {
          if (!r.ok) { isChapterEnd = true; return ''; } // no next page → chapter ends
          return r.text();
        })
        .then(function(html) {
          if (!html) return;
          var parser   = new DOMParser();
          var doc      = parser.parseFromString(html, 'text/html');
          var nextSub  = doc.querySelector('.page-subtitle');
          var nextName = nextSub ? nextSub.textContent.trim() : '';
          isChapterEnd = nextName !== chapterName;
        })
        .catch(function() { isChapterEnd = false; });
    }

    // ── Unified scroll handler (back-to-top + toast) ─────────────────────────
    window.addEventListener('scroll', function() {
      var scrolled = window.pageYOffset || document.documentElement.scrollTop;
      var total    = document.documentElement.scrollHeight - window.innerHeight;
      var pct      = total > 0 ? Math.round((scrolled / total) * 100) : 0;

      // Back-to-top visibility
      if (scrolled > 400) {
        backTop.classList.add('rdr-visible');
      } else {
        backTop.classList.remove('rdr-visible');
      }

      // Chapter completion toast — only fires at the last page of a chapter
      if (pct >= 100 && !toastShown && isChapterEnd) {
        toastShown = true;
        toast.classList.add('rdr-visible');
        setTimeout(function() {
          toast.classList.remove('rdr-visible');
        }, 3200);
      }
    });

  })(); // end initReadingExperience

  // ---------------------------------------------------------------------------
  // Random Poem Redirect
  // ---------------------------------------------------------------------------
  const randomPoemBtn = document.getElementById('random-poem-btn');
  if (randomPoemBtn) {
    const poems = [
      'finalmoment.html',
      'symbolsofnature.html',
      'unrestfulstillness.html',
      'rhythmofthereriver.html'
    ];
    randomPoemBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = poems[Math.floor(Math.random() * poems.length)];
    });
  }

});
