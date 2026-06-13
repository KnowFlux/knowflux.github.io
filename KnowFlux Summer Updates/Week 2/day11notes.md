# Day 11 — Professional Project Structure: Breaking Up Monoliths

## Goal
Transform KnowFlux from a flat, monolithic codebase into a modular, organized project structure that scales better and is easier to maintain — like a professional developer environment.

## What We Did

### 1. Created a proper folder hierarchy
- **Before:** All 30+ files in one flat root directory. `style.css` was ~2000 lines, `script.js` was ~600 lines.
- **After:**
  ```
  KnowFlux/
  ├── css/                  ← 8 modular stylesheets
  │   ├── base.css          ← reset, body, typography, Google Fonts
  │   ├── layout.css        ← .wrap, #banner, .responsive-book-layout, page structure
  │   ├── navigation.css    ← #promo, #topMenu, submenus, mobile nav overlay
  │   ├── reading.css       ← READING EXPERIENCE ENHANCEMENTS (biggest chunk)
  │   ├── dark-mode.css     ← [data-dark-mode] styles
  │   ├── components.css    ← buttons, .badge, .poetry-box, .dreamMemText, blockquote, search
  │   └── responsive.css    ← ALL @media blocks consolidated into one file
  │
  ├── js/                   ← 7 modular JavaScript files
  │   ├── navigation.js     ← promo cycling, smart header, mobile nav, click-to-open menus
  │   ├── reading.js        ← reading experience controller (initReadingExperience)
  │   ├── footer.js         ← copyright year, footer reveal on scroll
  │   ├── random.js         ← random poem/book redirect buttons
  │   ├── contents.js       ← book tabs system + bookmark rewrites
  │   ├── reader.js         ← dynamic book page loader (fetches from books.json)
  │   ├── bundle.js         ← built output from build.py
  │   └── main.js           ← entry point (DOMContentLoaded wrapper)
  │
  ├── Backend/              ← all Python files
  │   ├── config.py         ← ROOT_DIR definition shared by all scripts
  │   ├── server.py         ← HTTP server + admin API
  │   ├── build.py          ← concatenates JS modules into bundle.js
  │   ├── generate_books_json.py
  │   └── algolia-build-index.py
  │
  ├── poems/                ← (ready for future move of poem HTML files)
  └── ...root HTML files remain
  ```

### 2. Created `css/main.css` as entry point
- Uses `@import` to load all CSS modules in order
- HTML files link to `css/main.css` — one link tag, browser downloads one request (with `@import` fallback chain)

### 3. Created `Backend/build.py` — a custom build script
- Concatenates all JS modules into `js/bundle.js` AND root `script.js` for backward compatibility
- Simple 20-line script — no Webpack, no npm, no complexity
- Run with: `python3 Backend/build.py`

### 4. Created `Backend/config.py` — shared path configuration
- Defines `ROOT_DIR = Path(__file__).resolve().parent.parent`
- Every Python script imports `ROOT_DIR` instead of guessing file locations
- Single source of truth — if we restructure again, we change one line in one file

### 5. Fixed path bugs in Python scripts
- **`server.py`:** `BASE_DIR = ROOT_DIR` instead of `Path(__file__).parent`
- **`server.py`:** `.env` reader uses `ROOT_DIR / '.env'` for explicit path
- **`build.py`:** All JS module paths prefixed with `ROOT_DIR /`
- **`build.py`:** `BUNDLE` and `FALLBACK` output paths use `ROOT_DIR /`
- **`build.py`:** Fixed missing comma after `'js/reader.js'` in module list

### 6. Fixed the "JS doesn't run" bug — the biggest issue
- **Problem:** All JS modules were running immediately at parse time, before the DOM was ready. `document.getElementById('promo')` returned `null`, causing silent failures.
- **Diagnosis:** DevTools Console showed `TypeError: null is not an object` on every page.
- **Root Cause:** When we split `script.js`, we kept the **inner code** but dropped the **`DOMContentLoaded` wrapper** that surrounded everything.
- **Fix:** Wrapped every module in its own `document.addEventListener('DOMContentLoaded', function() { ... })`:
  - `js/navigation.js` — wrapped entire file
  - `js/reading.js` — wrapped entire file (including scroll progress bar, reading experience controller, back-to-top, chapter toast)
  - `js/footer.js` — wrapped entire file
  - `js/random.js` — wrapped entire file
  - `js/contents.js` — wrapped entire file
- Multiple `DOMContentLoaded` listeners all fire — they don't overwrite each other.

### 7. Identified duplicate code in `js/contents.js`
- Found that the bookmark button initialization code was **duplicated** — it existed both inside `js/reading.js` (inside the reading controller IIFE) AND at the top of `js/contents.js`.
- The `contents.js` version referenced `isPoetryPage` which is a local variable from `js/reading.js` — this would cause a ReferenceError.
- **Decision:** The bookmark initialization inside `js/reading.js` is authoritative since it has access to `isPoetryPage`. The `contents.js` version will need cleanup.

### 8. Fixed port typo that caused PermissionError
- `server.py` had `PORT = int(os.environ.get('PORT', 500))` — port 500 is a privileged port on Linux, requiring `sudo`.
- **Fixed to:** `PORT = int(os.environ.get('PORT', 5000))` — port 5000 is unprivileged and works without root.

## The Module Decision Making Framework

During the refactor, we developed a rule for deciding where CSS belongs:

| Test | If YES → Layout | If YES → Component |
|---|---|---|
| Does it define the page skeleton? (header, footer, main column) | ✅ | |
| Is it a reusable building block used inside multiple layouts? | | ✅ |
| Does it start with `.wrap`, `#banner`, `#subscribe`, `#footer`, `.content-page`? | ✅ | |
| Does it have a specific visual identity like `.badge`, `.poetry-box`, `.dreamMemText`? | | ✅ |
| Would you move it to another page and expect it to look the same? | | ✅ |

Examples applied:
- `.home-book-card` → **components.css** (specific card pattern)
- `.responsive-book-layout` → **layout.css** (generic layout container)
- `#bookSummary` → **components.css** (styled details/summary widget)
- `#pagesLink` → **components.css** (centered button row utility, currently dead code)
- `#scroll-progress-container` base → **components.css**, reading overrides → **reading.css**, media queries → **responsive.css**

## What Changed In HTML Files

All 14 HTML files and `server.py` templates were updated:
- `style.css?cachebust=13` → `css/main.css?cachebust=14`
- `script.js?cachebust=13` → `js/bundle.js?cachebust=14`
- `reader.js?cachebust=13` → `js/reader.js?cachebust=14` (in `reader.html` only)

## How To Run

```bash
# 1. Build JS bundle
python3 Backend/build.py

# 2. Start server (from project root)
python3 Backend/server.py

# 3. Visit http://localhost:5000
```

## Lessons Learned

1. **DOM timing is everything.** If JS runs before `<body>` exists, `getElementById()` returns `null`. Always wrap in `DOMContentLoaded` unless you explicitly need early execution.
2. **Concatenation doesn't fix timing.** Building all modules into one file doesn't change when they execute — a bundle of broken code is still broken.
3. **One change at a time.** Moving files AND splitting code AND fixing paths all at once multiplies debugging complexity. Test after each step.
4. **The `.env` file can't live in `Backend/`** — it needs to be at the project root. We kept it there.
5. **`requirements.txt` must stay at root** — Render, Heroku, and all platforms look for it there by default.
6. **Low ports are privileged.** Port 500 was a typo for 5000. On Linux, only root can bind to ports below 1024.
7. **Dead code with a comment is better than mysterious dead code.** We kept `#pagesLink` in components.css with a comment noting it's unused rather than deleting it — it documents a design pattern that exists in the system.

## Known Issues For Future

- `js/contents.js` has a duplicate bookmark block that references `isPoetryPage` — needs cleanup
- Poem HTML files are still in root — ready to move to `poems/` folder when ready
- Some HTML files may still have old `style.css` or `script.js` references if find-and-replace missed any
- `@import` in `main.css` adds one extra HTTP round trip — acceptable for now, could be eliminated by a CSS build step later