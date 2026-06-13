document.addEventListener('DOMContentLoaded', function() {
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
// Save last-read book page
// ---------------------------------------------------------------------------
const pageNum = document.querySelector('.page-title');
if (pageNum && pageNum.textContent.match(/^Page \d+/)) {
localStorage.setItem('lastBookPage', window.location.pathname + window.location.search);
}


// ---------------------------------------------------------------------------
// Reading Experience Controller
// Activates only on pages that contain .page-content (all book pages).
// No HTML files need to be modified — everything is driven from here.
// ---------------------------------------------------------------------------
(function initReadingExperience() {
const bookContent  = document.querySelector('.page-content');
const poetryContent = document.querySelector('.poetry-content');
if (!bookContent && !poetryContent) return;     // Not a reading page

const isPoetryPage = !!poetryContent;
const content = bookContent || poetryContent;   // whichever exists

document.body.classList.add('reading-page');

// ── Restore user preferences from localStorage ──
const FONT_SIZES    = ['rdr-text-sm', 'rdr-text-md', 'rdr-text-lg', 'rdr-text-xl'];
const WIDTHS        = ['rdr-width-narrow', 'rdr-width-normal', 'rdr-width-wide'];
const FONT_FAMILIES = ['rdr-font-normal', 'rdr-font-garamond', 'rdr-font-lora'];

const PREFERENCES_SAVED = 'rdr-preferences-saved';
const preferencesSaved = localStorage.getItem(PREFERENCES_SAVED) === 'true';

var savedSize  = 'rdr-text-md';
var savedWidth = 'rdr-width-normal';
var savedFont  = 'rdr-font-normal';
var savedFocus = false;

if (preferencesSaved) {
    savedSize  = localStorage.getItem('rdr-font-size')   || 'rdr-text-md';
    savedWidth = localStorage.getItem('rdr-width')       || 'rdr-width-normal';
    savedFont  = localStorage.getItem('rdr-font-family') || 'rdr-font-normal';
    savedFocus = localStorage.getItem('rdr-focus')       === 'true';
}

document.body.classList.add(savedSize, savedWidth, savedFont);
if (savedFocus) document.body.classList.add('rdr-focus');

// ── Word count + reading time (only for book pages) ──
if (!isPoetryPage) {
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
}

// ── Three-dots toggle button ──
const toggleBtn = document.createElement('button');
toggleBtn.id = 'rdr-toolbar-toggle';
toggleBtn.setAttribute('aria-label', 'Reading settings');
toggleBtn.setAttribute('aria-expanded', 'false');
toggleBtn.innerHTML = '&#x22EE;';
document.body.appendChild(toggleBtn);

// ── Slide-over backdrop overlay ──
const settingsOverlay = document.createElement('div');
settingsOverlay.id = 'rdr-settings-overlay';
document.body.appendChild(settingsOverlay);

// ── Slide-over settings panel ──
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

const toolbar = document.createElement('div');
toolbar.id = 'rdr-settings-body';

// Line width section: never for poetry; also hidden on mobile
var widthSection = (isPoetryPage || (window.innerWidth <= 768)) ? '' :
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
    // Focus mode: only for book pages
    (isPoetryPage ? '' :
    '<div class="rdr-tb-section">' +
        '<button class="rdr-full-btn" id="rdr-focus-btn">' +
        (savedFocus ? '\u2726 Exit Focus' : '\u2726 Focus Mode') +
        '</button>' +
    '</div>') +
    '<div class="rdr-tb-section">' +
    '<button class="rdr-full-btn" id="rdr-dark-btn">' +
        '\ud83c\udf19 Dark Mode' +
    '</button>' +
    '</div>' +
    '<div class="rdr-tb-section rdr-save-section">' +
    '<button class="rdr-full-btn" id="rdr-save-btn">' +
        '\ud83d\udcbe Save Preferences' +
    '</button>' +
    '</div>' +
    // Bookmark: only for book pages
    (isPoetryPage ? '' :
    '<div class="rdr-tb-section rdr-bookmark-section">' +
        '<button class="rdr-full-btn" id="rdr-bookmark-btn">' +
        '\ud83d\udccd Bookmark' +
        '</button>' +
    '</div>');

settingsPanel.appendChild(toolbar);

// Mark saved-state buttons as active
const initSizeBtn  = toolbar.querySelector('[data-size="'  + savedSize  + '"]');
const initWidthBtn = toolbar.querySelector('[data-width="' + savedWidth + '"]');
const initFontBtn  = toolbar.querySelector('[data-font="'  + savedFont  + '"]');
if (initSizeBtn)  initSizeBtn.classList.add('rdr-active');
if (initWidthBtn) initWidthBtn.classList.add('rdr-active');
if (initFontBtn)  initFontBtn.classList.add('rdr-active');
if (savedFocus && !isPoetryPage) {
    const focusBtn = document.getElementById('rdr-focus-btn');
    if (focusBtn) focusBtn.classList.add('rdr-active');
}

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
    toolbar.querySelectorAll('.rdr-size-btn').forEach(function(b) { b.classList.remove('rdr-active'); });
    this.classList.add('rdr-active');
    }.bind(btn));
});

// Line-width control (only if buttons exist)
toolbar.querySelectorAll('.rdr-width-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
    var w = this.dataset.width;
    WIDTHS.forEach(function(c) { document.body.classList.remove(c); });
    document.body.classList.add(w);
    toolbar.querySelectorAll('.rdr-width-btn').forEach(function(b) { b.classList.remove('rdr-active'); });
    this.classList.add('rdr-active');
    }.bind(btn));
});

// Focus mode (only if button exists)
const focusBtn = document.getElementById('rdr-focus-btn');
if (focusBtn) {
    focusBtn.addEventListener('click', function() {
    var isFocus = document.body.classList.toggle('rdr-focus');
    this.textContent = isFocus ? '\u2726 Exit Focus' : '\u2726 Focus Mode';
    this.classList.toggle('rdr-active', isFocus);
    });
}

// ── Dark mode ──
const READING_DARK_MODE_KEY = 'knowflux-reading-dark-mode';
const darkBtn = document.getElementById('rdr-dark-btn');
const isDarkEnabled = preferencesSaved && localStorage.getItem(READING_DARK_MODE_KEY) === 'true';
if (isDarkEnabled) {
    document.documentElement.setAttribute('data-dark-mode', 'true');
    darkBtn.classList.add('rdr-active');
}
darkBtn.addEventListener('click', function() {
    const isCurrentlyDark = document.documentElement.getAttribute('data-dark-mode') === 'true';
    const newState = !isCurrentlyDark;
    if (newState) {
    document.documentElement.setAttribute('data-dark-mode', 'true');
    darkBtn.classList.add('rdr-active');
    } else {
    document.documentElement.removeAttribute('data-dark-mode');
    darkBtn.classList.remove('rdr-active');
    }
});

// ── Save Preferences ──
const saveBtn = document.getElementById('rdr-save-btn');
if (saveBtn) {
    saveBtn.addEventListener('click', function() {
    var currentSize = 'rdr-text-md';
    FONT_SIZES.forEach(function(c) { if (document.body.classList.contains(c)) currentSize = c; });
    var currentWidth = 'rdr-width-normal';
    WIDTHS.forEach(function(c) { if (document.body.classList.contains(c)) currentWidth = c; });
    var currentFont = 'rdr-font-normal';
    FONT_FAMILIES.forEach(function(c) { if (document.body.classList.contains(c)) currentFont = c; });
    var currentFocus = document.body.classList.contains('rdr-focus');
    var currentDark = document.documentElement.getAttribute('data-dark-mode') === 'true';

    localStorage.setItem('rdr-font-size', currentSize);
    localStorage.setItem('rdr-width', currentWidth);
    localStorage.setItem('rdr-font-family', currentFont);
    localStorage.setItem('rdr-focus', currentFocus);
    localStorage.setItem('knowflux-reading-dark-mode', currentDark);
    localStorage.setItem(PREFERENCES_SAVED, 'true');

    saveBtn.textContent = '\u2714 Preference Saved!';
    setTimeout(function() { saveBtn.textContent = '\ud83d\udcbe Save Preferences'; }, 2000);
    });
}

// ── Bookmark button (only for books) ──
if (!isPoetryPage) {
    (function initBookmark() {
    var bookmarkBtn = document.getElementById('rdr-bookmark-btn');
    if (!bookmarkBtn) return;
    var params = new URLSearchParams(window.location.search);
    var bookName = params.get('book') || '';
    var pageNum  = params.get('page') || '';
    if (!bookName || !pageNum) { bookmarkBtn.style.display = 'none'; return; }
    var pageUrl = 'reader.html?book=' + bookName + '&page=' + pageNum;
    var storageKey = 'knowflux-bookmark-' + bookName;
    var currentBookmark = localStorage.getItem(storageKey);
    function updateBookmarkBtn() {
        if (currentBookmark === pageUrl) {
        bookmarkBtn.textContent = '\u2705 Bookmarked';
        bookmarkBtn.classList.add('rdr-active');
        } else {
        bookmarkBtn.textContent = '\ud83d\udccd Bookmark';
        bookmarkBtn.classList.remove('rdr-active');
        }
    }
    updateBookmarkBtn();
    bookmarkBtn.addEventListener('click', function() {
        if (currentBookmark === pageUrl) {
        localStorage.removeItem(storageKey);
        currentBookmark = null;
        } else {
        localStorage.setItem(storageKey, pageUrl);
        currentBookmark = pageUrl;
        }
        updateBookmarkBtn();
        if (window.applyBookmarks) window.applyBookmarks();
    });
    })();
}

// ── Keyboard arrow navigation ──
var nextHref = null;
var prevHref = null;
var footerLinks = document.querySelectorAll('.page-footer-action a');
footerLinks.forEach(function(a) {
    var href = a.getAttribute('href');
    var txt  = a.textContent.trim();
    if (txt.includes('\u27A1') || txt.includes('\u27B6') || txt.includes('\u2192')) {
    nextHref = href;
    } else if (txt.includes('\u2B05') || txt.includes('\u2190')) {
    prevHref = href;
    }
});
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

// Chapter-start detection is now handled by reader.js

function markFirstParagraphForDropCap() {
    var pageContent = document.querySelector('.page-content');
    if (!pageContent) return;
    var firstPara = pageContent.querySelector('p');
    if (firstPara) firstPara.classList.add('rdr-drop-cap-target');
}

// Keyboard hint
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

// ── Back-to-top button ──
var backTop = document.createElement('button');
backTop.id  = 'rdr-back-top';
backTop.setAttribute('aria-label', 'Back to top');
backTop.textContent = '\u2191';
document.body.appendChild(backTop);
backTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ── Chapter completion toast (only for books) ──
if (!isPoetryPage) {
    var toast        = document.createElement('div');
    toast.id         = 'rdr-complete-toast';
    toast.textContent = (window.__chapterName || 'Chapter') + ' \u2014 Complete!';
    document.body.appendChild(toast);
    var toastShown   = false;

    window.addEventListener('scroll', function() {
    var scrolled = window.pageYOffset || document.documentElement.scrollTop;
    var total    = document.documentElement.scrollHeight - window.innerHeight;
    var pct      = total > 0 ? Math.round((scrolled / total) * 100) : 0;
    if (scrolled > 400) backTop.classList.add('rdr-visible');
    else backTop.classList.remove('rdr-visible');
    if (pct >= 100 && !toastShown && window.__chapterEnd) {
        toastShown = true;
        toast.classList.add('rdr-visible');
        setTimeout(function() { toast.classList.remove('rdr-visible'); }, 3200);
    }
    });
}

})(); // end initReadingExperience
});



