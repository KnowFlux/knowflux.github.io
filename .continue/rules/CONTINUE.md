# KnowFlux — Developer Guide

> A poetry and fiction website built with pure HTML5/CSS3/JS and a Python admin backend.

---

## 1. Project Overview

KnowFlux is a literary website for publishing serialized fiction and poetry. It features progressive books ("Exploded" and "The Pinnacle of Reality"), a poetry collection, and a polished reading experience. The entire site is **static HTML pages** served by a small Python HTTP server that also doubles as a **content generation API** for an admin panel.

| Aspect | Detail |
|---|---|
| **Live site** | [knowflux.ink](https://knowflux.ink) |
| **Frontend** | HTML5, CSS3, vanilla JavaScript |
| **Backend** | Python 3 (`server.py`) using built-in `http.server` and `socketserver` |
| **Content storage** | Static `.html` files on disk + `books.json` metadata |
| **Search** | Algolia (embedded in `search.html`) |
| **Feedback** | Formspree |
| **Email subscriptions** | ConvertKit (`Kit`) |
| **Hosting** | GitHub Pages (CNAME: `knowflux.ink`) |
| **Design** | Nintendo-inspired bold aesthetic: `#4392F1` (blue), `#F46036` (orange), fonts `Anton` + `Open Sans` |

---

## 2. Getting Started

### Prerequisites

- **Python 3.9+** (no external packages — uses only the standard library)
- Any modern web browser
- Git

### Install & Run

```bash
# Clone the repo
git clone <repository-url>
cd KnowFlux

# Start the development server
python3 server.py
# → Serves on http://localhost:5000 with content API at /admin/*
```

> The server automatically serves static files and the admin API from the same port. Hot reload is **not** supported — restart the server after changes to `server.py`.

### Generate books.json (optional, offline)

```bash
python3 generate_books_json.py
# → Regenerates books.json from the current HTML files on disk
```

### Running Tests

There is currently **no test suite**. Manual testing checklist:
1. Visit `http://localhost:5000/admin.html` and log in with the admin password.
2. Generate a new book page via the admin panel. Verify navigation links update.
3. Generate a new poem. Verify it appears on `poetry.html`.
4. Check reading experience features on any book page (dark mode, font controls, scroll bar).

---

## 3. Project Structure

```
KnowFlux/
├── server.py                  ★ Python HTTP server + content-generation API
├── generate_books_json.py      Standalone books.json generator
├── script.js                  ★ All client-side JavaScript (reading UX, nav, dark mode)
├── style.css                  ★ All site-wide CSS (very large — scoped by class)
├── books.json                 Auto-generated book/poetry metadata (read by Algolia)
├── README.md                  Public-facing project README
├── CNAME                      knowflux.ink (required by GitHub Pages)
├── sitemap.xml                SEO sitemap
│
├── index.html                 Homepage
├── aboutbook.html             Book synopses hub
├── poetry.html                Poetry index (grid of poem cards by section)
├── admin.html                 ★ Password-protected admin panel (content generator UI)
├── search.html                Algolia-powered search page
├── feedback.html              Feedback form (Formspree)
├── comingsoon.html            Placeholder / hype page
│
├── exploded-page1.html  …15   Book pages for "Exploded" (sci-fi novel)
├── exploded-pages.html        Grid index of all Exploded pages
├── exploded-chapters.html     Grid index grouped by chapter
│
├── pinnacle-page1.html  …     Book pages for "The Pinnacle of Reality"
├── pinnacle-pages.html        Grid index (placeholder)
├── pinnacle-chapters.html     Grid index (placeholder)
│
├── finalmoment.html           Poem: The Final Moment
├── symbolsofnature.html       Poem: Symbols of Nature
├── unrestfulstillness.html    Poem: Unrestful Stillness
├── sowhisperedthewind.html    Poem: So Whispered the Wind
├── rhythmoftheredriver.html   Poem: Rhythm of the Red River
│
├── Images/                    Cover art, favicon, screenshots
│
├── .git/                      Git repository
└── KnowFlux Summer Updates/   Drafts/planning notes
```

### Key Files Deep Dive

| File | Role |
|---|---|
| **`server.py`** | HTTP server + 3 POST endpoints (`/admin/login`, `/admin/generate-*`, `/admin/generate-poetry`). Parses `[dream]`, `[thought]`, `[underline]` content markers. Auto-generates index pages and updates navigation. |
| **`script.js`** | Promo banner cycler, smart scroll-hide nav, dynamic copyright year (CST), scroll progress bar, hamburger mobile nav, reading experience controller (font/width/dark mode/keyboard arrows/back-to-top/chapter completion toast), random poem redirect. |
| **`style.css`** | All visual styling. Scoped to specific pages via body classes (e.g., `.reading-page` triggers reading UX styles). Uses `@media` breakpoints at 768px and 600px. |
| **`admin.html`** | Auth overlay → tabs for Exploded / Poetry / Pinnacle → form fields → JS fetch calls to server API. Renders success/error messages inline. |
| **`books.json`** | Arrays of `{ page_number, chapter_title, file, url }` per book, plus poetry sections. Regenerated on every admin action and via standalone script. |
| **`generate_books_json.py`** | Mirror of the JSON generation logic from `server.py`, callable standalone. |

---

## 4. Development Workflow

### Coding Standards

- **HTML:** Static pages are fully self-contained. Book pages embed navigation HTML directly — NOT using includes or templates. This is intentional (GitHub Pages compatibility).
- **CSS:** All styles live in `style.css`. New components should be scoped via a parent class/ID to avoid leaks.
- **JS:** Single file `script.js`. Feature groups are wrapped in IIFEs with descriptive comments (`// ── Section Name ──`). Use `const`/`let`, `forEach`, and `fetch` (ES6+).
- **Python:** Follows PEP-8 loosely. Functions are documented with docstrings. All logic is in `server.py` (no separate modules).

### Content Generation Flow

```
Admin (admin.html) → POST /admin/generate-{exploded|pinnacle|poetry}
    → server.py validates input
    → Writes new .html file to disk
    → Updates index pages (pages/chapters.html) by inserting card HTML
    → Updates previous page's "COMING SOON" link to point to the new page
    → Regenerates books.json
    → Returns success JSON
```

**IMPORTANT:** Generated HTML files contain the full page structure (nav, footer, etc.) baked in. If you change the site-wide nav, you must **re-generate all pages** or manually update each `.html`.

### Build & Deployment

- **No build step.** The site is served as-is.
- **Deployment:** Push to the `main` branch. GitHub Pages deploys from `main` automatically via the CNAME file. The `server.py` is **not used in production** — only for local development and the admin panel.
- To deploy the admin panel for content creation, run `server.py` locally or on a VPS.

### Contribution Guidelines

1. Test all changes locally with `python3 server.py` before committing.
2. If adding pages manually, run `python3 generate_books_json.py` to update metadata.
3. Keep `script.js` and `style.css` additions scoped and commented.
4. Do **not** commit the admin password to version control when sharing publicly (the password is currently hardcoded in `server.py` — see Security note below).

---

## 5. Key Concepts

### Content Markers

The server parses three special markers in raw content text that get converted to styled HTML:

| Marker | Rendered Output |
|---|---|
| `[dream]...[/dream]` | Block wrapped in `<div class="dreamMemText">` — styled as italic card with an orange underline above |
| `[thought]...[/thought]` | Inline wrapped in `<span class="thoughtText">` — blue italic text |
| `[underline]...[/underline]` | Creates `<div class="underline"></div>` — horizontal orange divider line |

These are used in the admin panel's textarea. The format toolbar buttons insert these markers around selected text.

### Book Page Template Convention

Every book page follows this consistent pattern, which the server uses for scraping and generation:

```html
<h2 class="page-title">Page {N}</h2>
<h3 class="page-subtitle">{Chapter Title}</h3>
<div class="page-content" id="page{N}-content">
  <!-- content paragraphs -->
</div>
<div class="page-footer-action">
  <!-- navigation links with emoji arrows -->
</div>
```

### `COMMON_NAV` vs Page-Level Nav

There are **two different nav structures** in this project:

1. **`COMMON_NAV`** in `server.py` — Used when generating pages via the admin panel. Simpler structure.
2. **Page-level nav** in `exploded-page1.html` — Hand-edited, richer nested menu with "Books" → sub-menus.

This is a known inconsistency. Admin-generated pages get the simpler nav. If you want the richer nav everywhere, update `COMMON_NAV` in `server.py`.

### Reading Experience System

All reading UX features activate automatically when a page contains `<div class="page-content">`. The `initReadingExperience()` IIFE in `script.js` detects this and:

- Adds `rdr-*` CSS classes to control font size, width, dark mode
- Injects a settings toolbar (three-dots button → slide-over panel)
- Detects chapter starts (to enable drop caps) by comparing subtitles with the previous page
- Adds keyboard arrow navigation (← / →)
- Shows a completion toast when reaching the end of a chapter

User preferences are stored in `localStorage` with keys like `rdr-font-size`, `rdr-width`, `rdr-dark-mode`, etc.

---

## 6. Common Tasks

### Adding a New Book

1. Create a new folder-prefix pair (e.g., `mybook-page1.html`).
2. Add new tabs/routes in `server.py` following the pattern of `generate-exploded`/`generate-pinnacle`.
3. Add a new tab in `admin.html` (copy an existing tab's HTML + JS handler).
4. Add the book to the navigation in all generated pages (update `COMMON_NAV` in `server.py`).

### Adding a New Poem

1. Go to `http://localhost:5000/admin.html`, log in.
2. Click the "Poetry" tab.
3. Enter title, select (or create) a section, paste content with blank lines between stanzas.
4. Click "GENERATE POEM".
5. The poem page is created, and `poetry.html` is updated automatically.

### Manually Updating Site Navigation

Since nav is **baked into each HTML file**, changing the global nav requires either:
- Re-generating all pages via the admin panel, OR
- Running a find-and-replace across all `.html` files for the navigation block

### Updating books.json

```bash
python3 generate_books_json.py
```

This scans all `exploded-page*.html`, `pinnacle-page*.html`, and `poetry.html` and rebuilds the JSON.

### Adding Algolia Search Records

`books.json` is structured to be used with Algolia search indexing. Check `search.html` for the Algolia widget initialization. After regenerating `books.json`, re-index it in the Algolia dashboard.

---

## 7. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "COMING SOON!" link instead of next page | Admin didn't generate the next sequential page | Generate the next page number via admin |
| Generated page has outdated nav | `COMMON_NAV` in `server.py` is out of sync | Update `COMMON_NAV` and re-generate the page |
| `books.json` missing a page/poem | `generate_books_json.py` hasn't been run | `python3 generate_books_json.py` |
| Dark mode / font settings not sticking | `localStorage` cleared, or reading a non-reading page | Settings only apply on pages with `.page-content` |
| Admin panel "Could not reach server" | Server not running, or port mismatch | Ensure `python3 server.py` is running on port 5000 |
| Mobile nav broken | `script.js` not loading (check cachebust param) | Update cachebust version in the `<script>` tag query string |
| Page content not parsing `[dream]`/`[thought]` tags | Tags have incorrect casing or formatting | Must be lowercase, exact match: `[dream]...[/dream]` |

### Debugging Tips

- **Inspect `books.json`:** Open `http://localhost:5000/books.json` to verify the generated JSON structure.
- **Check console:** Most JS features log to the console on errors. Open DevTools (`F12`).
- **Force-refresh CSS/JS:** Append `?cachebust={new_number}` to `<link>` and `<script>` tags to bypass browser cache.
- **Test API directly:**
  ```bash
  # Login
  curl -X POST http://localhost:5000/admin/login \
    -d "password=YOUR_PASSWORD"

  # Generate a page (use returned token)
  curl -X POST http://localhost:5000/admin/generate-exploded \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "X-Auth-Token: YOUR_TOKEN" \
    -d "page_num=16&chapter_title=Test&main_content=Some text"
  ```

---

## 8. References

### External Services
- **Algolia:** [InstantSearch.js docs](https://www.algolia.com/doc/guides/building-search-ui/getting-started/js/) — used in `search.html`
- **Formspree:** [Formspree docs](https://help.formspree.io/) — feedback form endpoint
- **ConvertKit:** [Kit forms API](https://developers.kit.com/) — subscription form
- **Google Fonts:** `Anton` and `Open Sans` loaded via CDN

### Project Details
- **Domain:** `knowflux.ink` (managed via GitHub Pages CNAME)
- **Static asset caching:** Images/CSS/JS are cached for 30 days via server `Cache-Control` header
- **Admin authentication:** Token-based (random hex stored in server-side `SESSIONS` set). Passwords are sent as plain `x-www-form-urlencoded` — use HTTPS in production.

---

## ⚠️ Security Notes (Important)

1. **The admin password is hardcoded in `server.py`:** `ADMIN_PASSWORD = "Kf$9mXpQ#2vNrL7w"`. This should be moved to an environment variable before public deployment.
2. **Sessions are stored in memory:** Server restarts invalidate all tokens. Production would need persistent sessions.
3. **No CSRF protection:** The admin POST endpoints rely only on the `X-Auth-Token` header. A production version should add CSRF tokens.
4. **No input sanitization:** Content is written directly into HTML templates without escaping. If untrusted users ever get admin access, XSS is possible. For the current single-admin use case this is acceptable.

---

© 2026 KnowFlux. *Keep Blooming, Keep Flying*