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

document.addEventListener('DOMContentLoaded', function() {
// ---------------------------------------------------------------------------
// Book Contents Tab System (for contents.html and similar)
// ---------------------------------------------------------------------------
(function initBookTabs() {
const tabContainer = document.getElementById('book-tabs');
if (!tabContainer) return; // not on contents page

const tabs = tabContainer.querySelectorAll('.book-tab');
const panels = document.querySelectorAll('#book-content > .book-panel');

tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
    // Remove .active from all tabs
    tabs.forEach(function(t) { t.classList.remove('active'); });
    // Add .active to clicked tab
    this.classList.add('active');

    // Show matching panel, hide others
    const bookId = this.getAttribute('data-book');
    panels.forEach(function(panel) {
        panel.style.display = (panel.id === 'panel-' + bookId) ? 'block' : 'none';
    });
    });
});

// ── Apply Bookmarks: rewrite first-page links to bookmarked page ─────────
window.applyBookmarks = function() {
    var bookmarks = {
    exploded: localStorage.getItem('knowflux-bookmark-exploded'),
    pinnacle: localStorage.getItem('knowflux-bookmark-pinnacle')
    };

    var explodedFirstPage = 'reader.html?book=exploded&page=1'
    var pinnacleFirstPage = 'reader.html?book=pinnacle&page=1'

    // Find all links that point to the first page of either book
    document.querySelectorAll('a[href="' + explodedFirstPage + '"]').forEach(function(link) {
        if (bookmarks.exploded && bookmarks.exploded !== explodedFirstPage) {
        link.setAttribute('data-original-href', explodedFirstPage);
        link.href = bookmarks.exploded;
        }
    });
    document.querySelectorAll('a[href="' + pinnacleFirstPage + '"]').forEach(function(link) {
        if (bookmarks.pinnacle && bookmarks.pinnacle !== pinnacleFirstPage) {
        link.setAttribute('data-original-href', pinnacleFirstPage);
        link.href = bookmarks.pinnacle;
        }
    });
    };

// Run immediately on page load
window.applyBookmarks();
})();
});