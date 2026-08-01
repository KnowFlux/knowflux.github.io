# 🚀 KnowFlux

**KnowFlux** is a self-published fiction & poetry platform — a literary hub with a bold, Nintendo-inspired visual identity. Two serialized books (*Exploded* and *The Pinnacle of Reality*), an ever-growing poetry archive, and an interactive character database called the **Omni-Dex**.

🌐 **Live site:** [knowflux.ink](https://knowflux.ink)

---

## ✨ Features

### 📖 Books
- Two serialized books: **Exploded** and **The Pinnacle of Reality**
- Pages served dynamically — content lives in `books.json`, rendered by `reader.html`

### 🖋️ Poetry
- Curated poetry archive with sections (Haikus, Tanka, Free Verse, etc.)
- Each poem is a self-contained static HTML page

### 🃏 Omni-Dex
- Interactive character/universe database with:
  - Universe & type filtering (tabs + pills)
  - Animated stat bars
  - Modal detail view with stats sidebar and keyboard navigation (`←`/`→`/`Esc`)

### 📚 Reading Experience
- **Customizable display**: text size, font family (Normal / Garamond / Lora), line width
- **Dark mode** & **Focus mode**
- **Bookmarks** — "Continue reading" links adapt to where you left off
- **Word count + estimated reading time** per page
- **Scroll progress bar**, **keyboard navigation** (`←` / `→`), **chapter-completion toast**
- **Drop caps** on chapter-open pages

### 🔍 Search
- Instant client-side search powered by **Algolia**
- Index built from `sitemap.xml` via `Backend/algolia-build-index.py`

### 🛠️ Admin Panel
- Password-protected content generator at `/admin`
- Add book pages or poems without touching the filesystem:
  - **Book pages** → parsed with `[dream]`, `[thought]`, `[underline]` markers and written to `books.json`
  - **Poems** → generate a static HTML page + update the poetry grid
- Automatically updates `sitemap.xml` and **auto-commits & pushes** to GitHub

---

## 🏗️ Architecture

KnowFlux is a **serverless-style Jamstack** site with a thin Python dev/ops layer.

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
│  Algolia (search) · Kit (newsletter) · GitHub (deployment)       │
└──────────────────────────────────────────────────────────────────┘
```

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | **Zero frameworks** — pure HTML5, CSS3, Vanilla JS |
| CSS | Modular system under `css/` (`main.css` imports the rest) |
| JS | ES5-style modules bundled into `js/bundle.js` via `Backend/build.py` |
| Backend | **Python standard library only** (`http.server`, `socketserver`, `json`, `re`) |
| Search | **Algolia** (`algoliasearch` via npm) |
| Newsletter | **Kit (ConvertKit)** |
| Deployment | **Render** (auto-deploy + auto-commit GitHub pipeline) |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node/npm (only for Algolia index building)

### 1. Build the JS bundle
```bash
python Backend/build.py
```
This concatenates all modules in `js/` into `js/bundle.js` and `script.js`.

### 2. Start the dev server
```bash
python Backend/server.py
```
Serves on `http://localhost:5001` (override with `PORT`).

> The server also powers the admin panel. To unlock it, set `ADMIN_PASSWORD` in a `.env` file:
> ```env
> ADMIN_PASSWORD=your_password_here
> GITHUB_TOKEN=your_token_here   # optional: enables auto-commit on publish
> ```

### 3. Regenerate books.json / sitemap (if needed)
```bash
python Backend/generate_books_json.py   # rebuild poetry section, preserve book pages
python Backend/algolia-build-index.py   # rebuild Algolia search records from sitemap
```

---

## 🗂️ Project Structure

```
KnowFlux/
├── index.html                 # Home page
├── reader.html                # Dynamic book reader (loads pages from books.json)
├── aboutbook.html             # Book overview
├── contents.html              # Chapter contents (tabbed by book)
├── poetry.html                # Poetry grid (index of all poems)
├── omni-dex.html              # Interactive character database
├── search.html                # Algolia-powered search
├── feedback.html              # Reader feedback
├── admin.html                 # Password-protected content generator
├── comingsoon.html            # "Next chapter" splash page
├── books.json                 # 📖 THE content source — all book pages live here
├── sitemap.xml                # Auto-generated on publish
├── algolia_records.json       # Search index records (generated)
├── css/                       # Modular CSS (main.css aggregates everything)
│   ├── main.css
│   ├── base.css
│   ├── layout.css
│   ├── navigation.css
│   ├── reading.css
│   ├── poetry.css
│   ├── omni-dex.css
│   ├── darkmode.css
│   └── ...
├── js/                        # ES5 JS modules
│   ├── bundle.js              # Built output (run Backend/build.py)
│   ├── reader.js              # Dynamic book page loading
│   ├── navigation.js          # Menu, mobile overlay, promo cycling
│   ├── reading.js             # Reading experience controller
│   ├── contents.js            # Contents tabs + bookmark-aware links
│   ├── random.js              # "Random poem/book" buttons
│   ├── footer.js              # Copyright year (CST) + footer reveal
│   └── omni-dex.js            # Omni-Dex data, filters, modal
├── Backend/
│   ├── server.py              # Dev server + admin content API
│   ├── build.py               # JS bundler
│   ├── generate_books_json.py # Regenerate books.json from HTML
│   ├── algolia-build-index.py # Build Algolia search records
│   └── config.py              # Shared ROOT_DIR constant
├── Images/                    # Static images
├── Poetry/                    # Generated poem HTML files
└── package.json               # npm (only algoliasearch)
```

---

## ✍️ Publishing Workflow

1. Log into `/admin`, enter the password.
2. Pick a tab — **Pinnacle**, **Exploded**, or **Poetry**.
3. Fill in the form:
   - **Book pages**: page number, chapter title, content (with `[dream]` / `[thought]` / `[underline]` markers)
   - **Poems**: title, section (or new section), stanzas separated by blank lines
4. Hit **Generate** — the server:
   - Writes to `books.json` (or creates a poem HTML file / updates `poetry.html`)
   - Regenerates `sitemap.xml`
   - Auto-commits and pushes to GitHub *(if `GITHUB_TOKEN` is set)*
5. Render deploys automatically. 🎉

### Content Markers (book pages)
| Marker | Renders as |
|---|---|
| `[dream]...[/dream]` | Styled italic memory card |
| `[thought]...[/thought]` | Blue italic inline thought |
| `[underline]` | Orange horizontal divider |

---

## 🔧 Configuration

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default `5001`) |
| `ADMIN_PASSWORD` | Admin panel password (from `.env`) |
| `GITHUB_TOKEN` | Enables auto-commit/push on content publish |
| `GIT_REPO_URL` | Override repo URL for auto-commit (defaults to `origin`) |

Algolia keys live in `script.js`/`search.html` — swap them for your own fork.

---

## 🧪 Testing

The project currently has **no automated tests** — a great next step! Key areas that would benefit:
- `Backend/server.py` content-block parser (`parse_content_blocks`, `render_content_blocks`)
- `Backend/build.py` bundling
- `Backend/algolia-build-index.py` record generation
- `js/` modules (reader data loading, bookmark logic, Omni-Dex filtering)

---

## 📄 License

© 2026 KnowFlux — *Keep Blooming, Keep Flying*