# 🚀 KnowFlux

**KnowFlux** is a self-published fiction & poetry platform — a literary hub with a bold, Nintendo-inspired visual identity. Two serialized books (*Exploded* and *The Pinnacle of Reality*), an ever-growing poetry archive, and an interactive character database called the **Omni-Dex**.

🌐 **Live site:** [knowflux.ink](https://knowflux.ink)

---

## ✨ Features

### 📖 Books
- Two serialized books: **Exploded** and **The Pinnacle of Reality**
- **Fully dynamic** — there are no per-page HTML files. Every page lives in `books.json` and is rendered by `reader.html?book=<id>&page=<n>`

### 🖋️ Poetry
- Curated poetry archive with sections (Haikus, Triplets, …)
- Unlike books, each poem **is** a standalone static HTML file in `Poetry/`, listed by `poetry.html`

### 🃏 Omni-Dex & Lore Lens
- Interactive character/universe database (`omni-dex.html`):
  - Universe & type filtering (tabs + pills)
  - Animated stat bars
  - Modal detail view with stats sidebar and keyboard navigation (`←`/`→`/`Esc`)
- **Lore Lens** — site-wide hover popovers that scan the rendered page for Omni-Dex entry names and show that card inline
- Both features read from `omni-dex-data.json`

### 📚 Reading Experience
- **Customizable display**: text size, font family (Normal / Garamond / Lora), line width
- **Dark mode** & **Focus mode**
- **Bookmarks** — "Continue reading" links adapt to where you left off
- **Word count + estimated reading time** per page
- **Scroll progress bar**, **keyboard navigation** (`←` / `→`), **chapter-completion toast**
- **Drop caps** on chapter-open pages

### 🔍 Search
- Instant client-side search powered by **Algolia**
- The SDK is loaded from a CDN in `search.html` (v4); keys are inlined there
- The index is built from `sitemap.xml` by `Backend/algolia-build-index.py` into `algolia_records.json`

### 🛠️ Admin Panel
- Password-protected content generator at `/admin`
- Add book pages or poems without touching the filesystem:
  - **Book pages** → parsed with `[dream]`, `[thought]`, `[underline]` markers and written to `books.json`
  - **Poems** → generates a static HTML page in `Poetry/` and updates the `poetry.html` grid
- Regenerates `sitemap.xml` and **auto-commits & pushes** to GitHub

---

## 🏗️ Architecture

A **static Jamstack site** with a thin Python dev/ops layer. Nothing renders on a server at request time — the backend exists purely to *author* content.

```
┌──────────────────────────────────────────────────────────────────┐
│                           Browser                                │
│  index · reader · poetry · contents · omni-dex · search · admin  │
└──────────────┬───────────────────────────────────────────┬───────┘
               │ static HTML + CSS + JS                   │ form posts / fetch
               ▼                                           ▼
┌──────────────────────────┐                 ┌──────────────────────────┐
│      Static Assets       │                 │   Backend (Python stdlib)│
│  HTML / CSS / JS / JSON  │                 │  server.py — dev server  │
│  books.json · poetry.html│                 │  + admin content API     │
└──────────────┬───────────┘                 └────────────┬─────────────┘
               │                                          │
               ▼                                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                        External Services                         │
│  Algolia (search) · Kit (newsletter) · GitHub (host + commits)    │
└──────────────────────────────────────────────────────────────────┘
```

### The one rule: `books.json` is the source of truth for books

Books used to be generated from `exploded-page*.html` files on disk. They aren't anymore — those files are gone. `books.json` **is** the database, and the admin panel is the only thing that should write to it.

**Never let a script rebuild `books.json` from HTML.** `save_books_json()` in `server.py` deliberately loads the existing file, rebuilds **only** the `poetry` section, and writes it back. That distinction is the difference between an edit and a data-loss event.

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | **Zero frameworks** — pure HTML5, CSS3, Vanilla JS |
| CSS | Modular system under `css/` (`main.css` aggregates the rest) |
| JS | ES5-style modules concatenated into `js/bundle.js` by `Backend/build.py` |
| Backend | **Python standard library only** (`http.server`, `socketserver`, `json`, `re`) |
| Search | **Algolia** — `algoliasearch` v4 from CDN in `search.html` |
| Newsletter | **Kit (ConvertKit)** |
| Hosting | **GitHub Pages** (`CNAME` → `knowflux.ink`) + auto-commit content pipeline |

> `auto_commit()` still honours a `RENDER_GIT_BRANCH` env var from an earlier Render deployment. Harmless — it defaults to `main`.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- **No npm step.** No external Python packages are required (see `requirements.txt`).
  - ⚠️ Exception: `Backend/algolia-build-index.py` imports `certifi`, which is neither installed nor declared. That script fails on import today.

### 1. Build the JS bundle
```bash
cd Backend
python build.py
```
Concatenates the modules listed in `JS_MODULES` into `js/bundle.js` (and mirrors the output to root `script.js` for the legacy poetry pages).

> `js/omni-dex.js` is **not** in that list — it is loaded separately with `defer` on `omni-dex.html` only, so the rest of the site doesn't pay for it.

### 2. Start the dev server
```bash
cd Backend
python server.py
```
Serves on `http://localhost:5001` (override with `PORT`).

To unlock the admin panel, create a `.env` in the repo root:
```env
ADMIN_PASSWORD=your_password_here
GITHUB_TOKEN=your_token_here   # optional: enables auto-commit on publish
```

> 🔒 **If `ADMIN_PASSWORD` is unset, `/admin/login` accepts an empty password.** The env var defaults to `""` and the check is a plain `==`. Always set it before exposing the server.

### 3. Regenerate the poetry index (optional)
```bash
python Backend/generate_books_json.py   # ⚠️ currently broken — see Known Issues
python Backend/algolia-build-index.py   # ⚠️ currently broken — missing certifi
```

---

## 🗂️ Project Structure

```
KnowFlux/
├── index.html                 # Home page
├── reader.html                # Dynamic book reader (?book=<id>&page=<n>)
├── aboutbook.html             # Book overview
├── contents.html              # Chapter contents (tabbed by book)
├── poetry.html                # Poetry grid — the index AND the source for books.json poetry
├── omni-dex.html              # Interactive character database
├── search.html                # Algolia-powered search (SDK from CDN)
├── feedback.html              # Reader feedback
├── admin.html                 # Password-protected content generator
├── comingsoon.html            # Legacy splash page — linked from nothing
├── 404.html                   # Custom error page (GitHub Pages serves this automatically)
├── books.json                 # 📖 THE content source — all book pages live here
├── omni-dex-data.json         # Character/universe data for Omni-Dex + Lore Lens
├── sitemap.xml                # Regenerated on publish
├── algolia_records.json       # Generated search records
├── CNAME                      # knowflux.ink
├── css/                       # Modular CSS, aggregated by main.css
│   ├── main.css               # ← imports everything below
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── navigation.css
│   ├── reading.css
│   ├── poetry.css
│   ├── omni-dex.css
│   ├── lore-lens.css
│   ├── search.css
│   ├── about.css
│   ├── 404.css
│   ├── darkmode.css
│   └── responsive.css
├── js/
│   ├── bundle.js              # Built output — do not edit by hand
│   ├── reader.js              # Fetches books.json, renders a page
│   ├── navigation.js          # Menu, mobile overlay, promo cycling
│   ├── reading.js             # Reading experience controller
│   ├── contents.js            # Contents tabs + bookmark-aware links
│   ├── main.js                # Shared bootstrap
│   ├── random.js              # "Random poem/book" buttons
│   ├── footer.js              # Copyright year (CST) + footer reveal
│   ├── lore-lens.js           # Site-wide Omni-Dex hover popovers
│   └── omni-dex.js            # Omni-Dex grid, filters, modal (page-specific)
├── Backend/
│   ├── server.py              # Dev server + admin content API
│   ├── build.py               # JS bundler
│   ├── generate_books_json.py # Poetry regeneration (⚠️ broken path)
│   ├── algolia-build-index.py # Algolia records from sitemap (⚠️ missing certifi)
│   └── config.py              # Shared ROOT_DIR constant
├── Images/                    # Static images
└── Poetry/                    # Generated poem HTML files (static, one per poem)
```

---

## ✍️ Publishing Workflow

1. Log into `/admin`, enter the password.
2. Pick a tab — **Pinnacle**, **Exploded**, or **Poetry**.
3. Fill in the form:
   - **Book pages**: page number, chapter title, content (with markers)
   - **Poems**: title, section (existing or new), stanzas separated by blank lines
4. Hit **Generate** — the server:
   - Writes to `books.json` via `add_page_to_books_json()`, or creates a poem HTML file and rewrites the `poetry.html` grid
   - Regenerates `sitemap.xml`
   - Auto-commits and pushes to GitHub *(if `GITHUB_TOKEN` is set)*
5. GitHub Pages redeploys. 🎉

### Content Markers (book pages)
| Marker | Renders as |
|---|---|
| `[thought]…[/thought]` | Blue italic inline thought (works anywhere, including inside other blocks) |
| `[dream]…[/dream]` | Horizontal rule + styled italic memory card |
| `[underline]` / `[/underline]` | Orange horizontal divider |

> ⚠️ **Known bug:** `[underline]` is parsed as an *opening tag* but rendered as a *divider*. Any paragraphs written after a bare `[underline]` are silently discarded, because the renderer never emits them. Always close it with `[/underline]`.

### Content model
```json
{
  "page_number": 13,
  "chapter_title": "Ch. 2 | Scarlet",
  "content": "      <p>…</p>\n\n      <div class=\"underline\"></div>\n\n",
  "file": "",
  "url": "reader.html?book=exploded&page=13"
}
```
`content` is **pre-rendered HTML**, not markdown. Marker parsing happens once, at save time, through `parse_content_blocks()` → `render_content_blocks()`.

---

## 🔧 Configuration

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default `5001`) |
| `ADMIN_PASSWORD` | Admin panel password. **Unset = no protection.** |
| `GITHUB_TOKEN` | Enables auto-commit/push on publish |
| `GIT_REPO_URL` | Override repo URL for auto-commit (defaults to `origin`) |
| `GIT_NAME` / `GIT_EMAIL` | Commit author (defaults to `KnowFlux Bot <bot@knowflux.ink>`) |

Algolia keys are inlined in `search.html` — swap them for your own fork.

---


## 📄 License

© 2026 KnowFlux — *Keep Blooming, Keep Flying*
