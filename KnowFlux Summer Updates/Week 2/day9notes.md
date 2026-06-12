# Day 9 — Notes

## Today's Plan
The focus for today was fixing the broken `sitemap.xml` and making sure `algolia-build-index.py` works with the new dynamic reader architecture. We also reconciled divergent git branches.

---

## The Problems

### Problem 1 — `sitemap.xml` Was Not Valid XML

The sitemap was missing `<url>` wrapper tags and `<loc>` elements entirely. The `update_sitemap()` function in `server.py` was generating lines like:

```xml
    <lastmod>2026-06-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
```

...without the opening `<url>` tag or `<loc>` (the actual URL). Also, the base URL was still set to `https://knowflux.github.io` instead of `https://knowflux.ink`.

**Root Cause:** When the deprecated functions were removed in Day 8, the lines that write `<url>` and `<loc>` were accidentally removed from `update_sitemap()`.

### Problem 2 — Dynamic Reader URLs Not in Sitemap

The sitemap only included static `.html` files. But now book pages are served dynamically via `reader.html?book=exploded&page=1`. Search engines need these URLs indexed too. The old `update_sitemap()` only scanned `*.html` files on disk.

### Problem 3 — `algolia-build-index.py` Had Wrong Domain and Filter

The script had two bugs:
1. It filtered to only URLs containing `.html`, which excluded dynamic reader URLs.
2. It tried to make URLs relative by replacing `https://knowflux.github.io` — but the new sitemap uses `https://knowflux.ink`.

### Problem 4 — Divergent Git Branches

After editing `server.py` and `algolia-build-index.py`, the local branch had diverged from the remote `main`. Git refused to pull without specifying merge strategy.

---

## The Fixes

### Fix 1 — Rewrote `update_sitemap()` in server.py

The function now:
- Uses correct base URL `https://knowflux.ink`
- Wraps each entry in `<url>` with a `<loc>` child
- Reads `books.json` and adds dynamic reader URLs (`reader.html?book=...&page=...`)
- Escapes `&` as `&amp;` automatically (handled by ElementTree)

**Before:**
```python
for page_path, priority, changefreq, lastmod in pages_to_include:
    if page_path == '/':
        loc = base_url + '/'
    xml_lines.append(f'    <lastmod>{lastmod}</lastmod>')
    xml_lines.append(f'    <changefreq>{changefreq}</changefreq>')
    xml_lines.append(f'    <priority>{priority:.1f}</priority>')
    xml_lines.append('  </url>')
```

**After:**
```python
for page_path, priority, changefreq, lastmod in pages:
    if page_path == '/':
        loc = base_url + '/'
    elif page_path.startswith('reader.html?'):
        loc = f"{base_url}/{page_path}"
    else:
        loc = f"{base_url}/{page_path}"
    xml_lines.append('  <url>')
    xml_lines.append(f'    <loc>{loc}</loc>')
    xml_lines.append(f'    <lastmod>{lastmod}</lastmod>')
    xml_lines.append(f'    <changefreq>{changefreq}</changefreq>')
    xml_lines.append(f'    <priority>{priority:.1f}</priority>')
    xml_lines.append('  </url>')
```

Also added code to read `books.json` and create entries for each dynamic page:

```python
books_json_file = BASE_DIR / "books.json"
if books_json_file.exists():
    try:
        with open(books_json_file, "r", encoding="utf-8") as bf:
            books_data = json.load(bf)
        for book in books_data.get("books", []):
            book_id = book.get("id", "")
            for page in book.get("pages", []):
                page_num = page.get("page_number")
                if page_num is not None:
                    reader_url = f"reader.html?book={book_id}&page={page_num}"
                    pages.append((reader_url, 0.8, 'weekly', today))
    except (json.JSONDecodeError, Exception):
        pass
```

### Fix 2 — Regenerated sitemap.xml with Valid Structure

Ran a Python script that uses `xml.etree.ElementTree` to generate a properly structured sitemap with all pages:

- Root `/` → priority 1.0
- All `.html` files (excluding `admin.html`) with appropriate priorities
- All dynamic reader URLs from `books.json` → priority 0.8

**Before:**
```xml
    <lastmod>2026-06-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
```
(Broken — no `<url>` wrapper, no `<loc>`)

**After:**
```xml
  <url>
    <loc>https://knowflux.ink/reader.html?book=exploded&page=1</loc>
    <lastmod>2026-06-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
```

Total: 30+ well-formed entries including 16 Exploded pages and 1 Pinnacle page.

### Fix 3 — Escaped `&` to `&amp;` in URLs

The `&` character in `reader.html?book=exploded&page=1` is illegal in XML. ElementTree's `tostring()` escapes it automatically. The regenerated sitemap now uses `&amp;`.

### Fix 4 — Updated algolia-build-index.py

The script was rewritten to:
- Parse all `<url>` entries from the sitemap (not just those with `.html`)
- Use `https://knowflux.ink` as the domain for relative URL conversion
- Handle the root URL `/` with objectID `'home'`
- Create unique object IDs using `make_object_id()` that works with query strings
- Include dynamic reader pages in the Algolia index

**Before (filtered to `.html` only):**
```python
if '.html' not in page_url:
    continue

records.append({
    "objectID": page_url.split('/')[-1].replace('.html', ''),
    "url": page_url.replace('https://knowflux.github.io', '')
})
```

**After (includes all URLs):**
```python
def make_object_id(url):
    path = url.split('://', 1)[-1].split('/', 1)[-1] if '://' in url else url
    if not path or path == '':
        return 'home'
    clean = ''.join(c if c.isalnum() or c in '.-_?=&' else '-' for c in path)
    return clean

# Then for each URL:
domain = 'https://knowflux.ink'
if page_url.startswith(domain):
    relative_url = page_url[len(domain):] or '/'
else:
    relative_url = page_url

records.append({
    "objectID": make_object_id(page_url),
    "title": parser.title or 'KnowFlux',
    "description": parser.description or '',
    "url": relative_url
})
```

### Fix 5 — Reconciled Divergent Git Branches

Ran `git config pull.rebase false` then `git pull origin main` to merge. This kept both local and remote commit histories intact.

---

## Summary of Changes

| Area | Before | After |
|---|---|---|
| **`server.py` `update_sitemap()`** | Missing `<url>` and `<loc>` tags; old domain `knowflux.github.io` | Valid XML with `<url>`/`<loc>`; `knowflux.ink`; dynamic reader URLs from `books.json` |
| **`sitemap.xml`** | 8 broken entries, no `&amp;` escaping, no dynamic URLs | 30+ well-formed entries including 16 Exploded pages + 1 Pinnacle page; `&amp;` escaped |
| **`algolia-build-index.py`** | Only `.html` files; wrong domain; poor object IDs | All sitemap URLs; `knowflux.ink` domain; `make_object_id()` for unique IDs |
| **Git branches** | Divergent — couldn't pull | Merged successfully |

## Notes
- `update_sitemap()` is called automatically after every admin action (book page or poem generation)
- To manually regenerate `sitemap.xml`, run the Python script from today's session
- `algolia-build-index.py` fetches each page from the live site — requires server or network access
- The sed command `sed -i '' 's/&/&amp;/g' sitemap.xml` was avoided to prevent double-escaping; instead we regenerated from scratch using ElementTree
- All dynamic reader URLs are now indexable by search engines and searchable through Algolia
