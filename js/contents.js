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

// ── Dynamic contents: fetch books.json and build chapter lists ──
document.addEventListener('DOMContentLoaded', function() {
  (function initDynamicContents() {
    // Only run on contents.html (has #book-content with .book-panel children)
    var panels = document.querySelectorAll('#book-content > .book-panel');
    if (!panels.length) return;

    fetch('books.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        data.books.forEach(function(book) {
          var panel = document.getElementById('panel-' + book.id);
          if (!panel) return;

          // Group pages by chapter (preserving order)
          var chapters = {};
          var chapterOrder = [];
          book.pages.forEach(function(page) {
            var title = page.chapter_title;
            if (!chapters[title]) {
              chapters[title] = [];
              chapterOrder.push(title);
            }
            chapters[title].push(page);
          });

          // Build HTML matching the existing <details>/<summary>/<ul> pattern
          var html = '';
          chapterOrder.forEach(function(chapterTitle, i) {
            var pages = chapters[chapterTitle];
            html += '<details' + (i === 0 ? ' open' : '') + '>';
            html += '<summary>' + chapterTitle + '</summary>';
            html += '<ul>';
            pages.forEach(function(page) {
              html += '<li><a href="' + (page.url || page.file) + '">Page ' + page.page_number + '</a></li>';
            });
            html += '</ul>';
            html += '</details>';
          });

          panel.innerHTML = html;
        });

        // Re-apply bookmarks now that links are freshly injected
        if (window.applyBookmarks) window.applyBookmarks();
      })
      .catch(function(err) {
        console.error('Dynamic contents: could not load books.json', err);
      });
  })();
});