# Day 7 — Notes

## Today's Plan
The focus for today is a major architectural migration: replacing static per‑page files (`exploded-page1.html`, `pinnacle-page1.html`, etc.) with a single dynamic `reader.html` that loads content from `books.json`. This reduces file duplication, makes navigation easier, and sets up for better bookmarking and reading‑experience features. The diff.txt shows the complete set of changes across 25+ files.

## Ideas & Options For Improvement

### Idea 1 — Create a Dynamic Reader Page (`reader.html` + `reader.js`)

Instead of maintaining dozens of individual HTML files (one per book page), create one template page that loads content on‑the‑fly based on query parameters. This makes it trivial to add new pages — just update `books.json`.

**Implementation Steps**
1. Create `reader.html` with the standard KnowFlux layout (nav, promo, footer) but empty content containers.
2. Create `reader.js` that:
   - Reads `book` and `page` from the URL query string.
   - Fetches `books.json` and finds the matching page.
   - Injects the page title, subtitle, content, and navigation links.
   - Handles chapter‑start detection (drop‑caps) and chapter‑end toast.
3. Update all internal links to point to `reader.html?book=exploded&page=N` instead of `exploded-pageN.html`.

| Before | After |
|---|---|
| 15+ separate `exploded-page*.html` files (each with full `<html>` boilerplate) | Single `reader.html` template |
| `pinnacle-page1.html` exists as a static file | Pinnacle content served dynamically via `reader.html?book=pinnacle&page=1` |
| Adding a new page requires creating a full HTML file and updating nav | Add a JSON entry and the page is automatically served |

### Idea 2 — Centralize Navigation Updates Across All Preexisting Files

Every static page (index, poetry, feedback, each poem, search, contents, etc.) had hardcoded nav links pointing to old static file names. The diff shows these were all updated in one sweep to use the new reader URLs.

**Implementation Steps**
1. Use find‑and‑replace across the entire project to change:
   - `href="exploded-page1.html"` → `href="reader.html?book=exploded&page=1"`
   - `href="pinnacle-page1.html"` → `href="reader.html?book=pinnacle&page=1"`
2. Apply the same change in `server.py`'s `COMMON_NAV`, `PAGES_INDEX_TEMPLATE`, and `CHAPTERS_INDEX_TEMPLATE`.
3. Verify all `a` tags and `data-original-href` attributes in `script.js` are updated.

| Before | After |
|---|---|
| 20+ files each had outdated nav links | All nav links point to the dynamic reader |
| Inconsistent paths between generated and hand‑edited pages | Single source of truth in `COMMON_NAV` |
| Bookmark / Continue Reading logic used file names like `exploded-page1.html` | Now uses `reader.html?book=...&page=...` |

### Idea 3 — Enrich books.json with Page Content for Dynamic Loading

Without page content in `books.json`, `reader.js` cannot display anything. The old `books.json` only contained metadata (page number, chapter title, file, url). We added a `content` field holding the inner HTML of `<div class="page-content">`.

**Implementation Steps**
1. Add `extract_page_content()` function to both `generate_books_json.py` and `server.py`.
2. Parse each page file with regex to capture the content between `<div class="page-content" ...>` and `</div>`.
3. Include the extracted content in the JSON object for every page.
4. Regenerate `books.json` to include the new field.

| Before | After |
|---|---|
| `{ "page_number": 1, "chapter_title": "...", "file": "...", "url": "..." }` | `{ ..., "content": "<p>The Realist sped...</p>" }` |
| Reader would need to fetch the page file separately | Reader has all content in a single JSON request |
| Slower loading (multiple HTTP requests) | Faster, fewer requests |

### Idea 4 — Simplify script.js Reading Experience by Delegating to reader.js

The old `script.js` had complex logic for detecting chapter starts by fetching the previous page, comparing subtitles, and showing a chapter‑complete toast. That logic was duplicated and fragile. Moving it to `reader.js` (which already has all data in memory) makes the code cleaner and more reliable.

**Implementation Steps**
1. Remove the `detectChapterStart` IIFE and `markFirstParagraphForDropCap` call from `script.js`.
2. Remove the toast‑showing logic (the scroll listener is still needed for the back‑to‑top button).
3. In `reader.js`, after loading the page data:
   - Set `window.__chapterEnd` and `window.__chapterName` so the toast in `script.js` can use them.
   - Add drop‑cap class to the first paragraph if it's a chapter start.
   - Set the toast text and visibility state.
4. Keep keyboard navigation and settings toolbar in `script.js` (they still work).

| Before | After |
|---|---|
| `script.js` tried to fetch previous page HTML to compare subtitles | `reader.js` compares subtitles directly from in‑memory data |
| Toast logic mixed into scroll handler | Toast trigger is simpler: just check `window.__chapterEnd` |
| Duplicate chapter detection in both `reader.js` and `script.js` | Single source of truth in `reader.js` |

### Idea 5 — Clean Up server.py and sitemap.xml for New URL Scheme

The admin generator and the sitemap needed updating to reflect the new reader URLs. The admin generator (`server.py`) now uses `reader.html?book=exploded&page=1` in the generated nav templates. The sitemap.xml also switched all `exploded-pageN.html` and `pinnacle-page1.html` URLs to the new format.

**Implementation Steps**
1. Update `COMMON_NAV`, `PAGES_INDEX_TEMPLATE`, `CHAPTERS_INDEX_TEMPLATE` in `server.py` to use `reader.html` links.
2. Fix a stray typo (`</div>s` → `</div>`) in `PAGES_INDEX_TEMPLATE`.
3. In `sitemap.xml`, replace all old static page URLs with `reader.html?book=...&page=...` equivalents.
4. Ensure the `generate_books_json.py` and `server.py` `extract_page_info()` both include the new `content` field.

| Before | After |
|---|---|
| `sitemap.xml` listed `exploded-page1.html` etc. | Lists `reader.html?book=exploded&page=1` etc. |
| Admin-generated nav pointed to old static files | Admin-generated nav uses dynamic reader URLs |
| `books.json` had no content field | `books.json` includes full page content for each page |

## Summary of Changes

| Area | Before | After |
|---|---|---|
| **Page structure** | One HTML file per book page (e.g., `exploded-page1.html`) | Single `reader.html` + `reader.js` loads content from `books.json` |
| **Navigation links** | Hardcoded to `exploded-page1.html` etc. in 20+ files | Changed to `reader.html?book=exploded&page=1` across all files |
| **books.json** | Metadata only (page_number, chapter_title, file, url) | Added `content` field with full page HTML |
| **script.js** | Had its own chapter-start detection and toast logic | Removed duplicate logic; relies on `window.__chapterEnd/Name` from `reader.js` |
| **server.py** | Templates still referenced old static paths | Updated all URLs to reader format; fixed minor typo |
| **generate_books_json.py** | Did not extract content | Added `extract_page_content()` function |
| **sitemap.xml** | Listed `exploded-pageN.html` etc. | Updated to `reader.html?book=...&page=...` format |
| **Deleted files** | `pinnacle-page1.html` was a standalone static file | Removed (content now served via reader) |

## Notes
- The `reader.js` must be loaded **after** `script.js` because it sets `window.__booksData` which `script.js` may use (though not currently). Ensure script order in `reader.html`.
- The cachebust parameter for `script.js` remains `?cachebust=13`; no change needed this week.
- The `lastBookPage` localStorage key now stores the full URL with query string (e.g., `reader.html?book=exploded&page=5`) instead of just the filename. Existing bookmarks will point to old static files — they will still work but won't show "Continue Reading" correctly until users click on the new reader links; however, all new bookmarks will be functional.