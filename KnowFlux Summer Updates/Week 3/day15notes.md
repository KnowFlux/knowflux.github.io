Markdown
# Release Notes — Platform Hardening, Path Fixes & Documentation Overhaul

## Goal
Three core goals were addressed in this update:
1. **Backend & Build Resilience:** Secure SSL fetching, standard path resolution with `ROOT_DIR`, HTML escaping in sitemap generation, and JS bundler module updates.
2. **Content & Navigation Polish:** Add Page 19 to *Exploded*, fix relative path links across the `Poetry/` subfolder, introduce a styled custom 404 error page, and update book metadata.
3. **Documentation Overhaul:** Rebuild `README.md` with full architecture flowcharts, stack breakdowns, CLI setup commands, and publishing workflows.

---

## What We Did

### 1. Backend & Infrastructure — Robustness & Path Safety
* **SSL Verification:** Created a secure SSL context using `certifi.where()` for `urllib` requests in `Backend/algolia-build-index.py`.
* **Path Resolution:** Replaced hardcoded relative paths in `Backend/algolia-build-index.py` with `ROOT_DIR` references for `sitemap.xml` and `algolia_records.json`.
* **Sitemap XML Escaping:** Wrapped sitemap URL locations in `html.escape()` inside `Backend/server.py` to prevent malformed XML generation.
* **Dynamic Book Schema:** Explicitly added `file: ""` and `url: "reader.html?book={book_id}&page={page_num}"` properties in `add_page_to_books_json()`.
* **Bundler Pipeline:** Replaced `bookmarks.js` with `contents.js` in `JS_MODULES` inside `Backend/build.py`.

### 2. Frontend & Subdirectory Repair — Navigation & Experience
* **Custom 404 Page:** Created `404.html` complete with a lost-story haiku, theme stylesheet links, and direct navigation quicklinks.
* **Poetry Link Resolution:** Corrected relative header and footer navigation links (e.g., `index.html` → `../index.html`) across all HTML files in the `Poetry/` directory.
* **Poetry Stanza Revisions:** Rewrote poem stanzas in `sowhisperedthewind.html`.
* **Metadata Alignment:** Updated page count for *Exploded* from 18 to 19 pages and refined description copy in `aboutbook.html`.

### 3. Content, Data & Version Control — Clean Repositories
* **New Book Content:** Added Page 19 (*"A Calling"*) to *Exploded* in `books.json`.
* **Sitemap Timestamps:** Updated `<lastmod>` timestamps to `2026-08-01` and appended updated reader URLs in `sitemap.xml`.
* **Git Ignore Rules:** Added `__pycache__/`, `bookeditinghistory.txt`, `gitdiff.txt`, `node_modules/`, `.venv/`, `.DS_Store`, `.pytest_cache/`, and `*.pyc` to `.gitignore`.
* **Repository Cleanup:** Untracked compiled Python bytecode (`.pyc`) and purged untracked `node_modules/@algolia` files from version control.

### 4. Project Documentation — Technical Blueprint
* **Architecture Visual:** Added ASCII flowchart mapping browser static requests, Python stdlib backend endpoints, and external services.
* **Tech Stack Overview:** Categorized stack details for zero-framework HTML/CSS/JS frontend, Python standard library server, Algolia search, and Kit newsletter.
* **Developer & Admin Guide:** Documented environment setup (`PORT`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`), bundling workflow via `Backend/build.py`, content markup tags (`[dream]`, `[thought]`, `[underline]`), and `/admin` publishing flows.

---

## Lesson Learned
**Subdirectories demand relative URL discipline, and explicit path resolution prevents runtime failures.** Relative links break quickly when files live in subfolders like `Poetry/` unless parent pathing (`../`) is enforced. Similarly, using `ROOT_DIR` for file path resolution guarantees server scripts execute reliably regardless of the current working directory.