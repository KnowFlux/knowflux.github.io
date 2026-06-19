
import http.server
import socketserver
import sys
import urllib.parse
import json
import re
import secrets
from pathlib import Path
import subprocess
import os
import socket
from config import ROOT_DIR

# ---------------------------------------------------------------------------
# Start server
# ---------------------------------------------------------------------------

def free_port(port):
    """Kill any process listening on the given port (macOS/Linux)."""
    import subprocess, os, signal, time
    try:
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True, text=True, timeout=5
        )
        pids = result.stdout.strip().splitlines()
        for pid in pids:
            pid = pid.strip()
            if pid and pid.isdigit():
                os.kill(int(pid), signal.SIGKILL)
                print(f"Killed process {pid} on port {port}")
                time.sleep(0.5)
    except Exception:
        # lsof not available, or no process
        pass

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        super().server_bind()

PORT = int(os.environ.get('PORT', 5001))
BASE_DIR = ROOT_DIR

# Simple .env reader (no external package)
env_file = ROOT_DIR / '.env'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, _, value = line.partition('=')
                os.environ[key.strip()] = value.strip()

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
SESSIONS = set()


# ---------------------------------------------------------------------------
# Content block parser (shared by Exploded and Pinnacle)
# ---------------------------------------------------------------------------

def parse_content_blocks(raw_content):
    content = raw_content.replace('[thought]', '<span class="thoughtText">').replace('[/thought]', '</span>')
    segments = []
    current_type = "normal"
    current_lines = []
    for line in content.splitlines():
        stripped = line.strip().lower()
        if stripped in ("[dream]", "[underline]"):
            if current_lines:
                text = "\n".join(current_lines).strip()
                if text:
                    segments.append((current_type, text))
            current_lines = []
            current_type = "dream" if stripped == "[dream]" else "underline"
        elif stripped in ("[/dream]", "[/underline]"):
            if current_lines:
                text = "\n".join(current_lines).strip()
                if text:
                    segments.append((current_type, text))
            current_lines = []
            current_type = "normal"
        else:
            current_lines.append(line)
    if current_lines:
        text = "\n".join(current_lines).strip()
        if text:
            segments.append((current_type, text))
    return segments


def render_content_blocks(segments):
    html = ""
    for seg_type, content in segments:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
        if not paragraphs:
            continue
        if seg_type == "normal":
            for p in paragraphs:
                html += f"      <p>{p}</p>\n\n"
        elif seg_type == "dream":
            html += "      <hr class=\"underline\"/>\n\n"
            html += "      <div class=\"dreamMemText\">\n\n"
            for p in paragraphs:
                html += f"        <p>{p}</p>\n\n"
            html += "      </div>\n\n"
        elif seg_type == "underline":
            html += "      <div class=\"underline\"></div>\n\n"
    return html


# ---------------------------------------------------------------------------
# Shared page HTML builder
# ---------------------------------------------------------------------------

COMMON_HEAD = """\
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Anton|Open+Sans">
  <link rel="icon" type="image/png" href="Images/favicon.jpeg">
  <link rel="stylesheet" href = "css/main.css">
  <script src = "js/bundle.js?cachebust=14"></script>"""

COMMON_NAV = """\
  <div id="promo">
    <div>Content Posted Weekly!</div>
    <div style="display:none;">Subscribe For Updates!</div>
    <div style="display:none;">Stay Tuned For Poetry And Prose!</div>
    <div style="display:none;">Send Feedback And See Responses!</div>
  </div>
  <div id="topMenu">
    <div class="wrap">
      <div id="topLinks">
        <ul>
          <li>
            <a href="index.html">Home</a>
          </li>
          <li class="has-submenu">
            <a href="aboutbook.html" id="read-link">Read</a>
            <ul>
              <li><a href="aboutbook.html">About Book</a></li>
              <li><a href="reader.html?book=exploded&page=1">Open Book</a></li>
              <li><a href="exploded-pages.html">Pages</a></li>
              <li><a href="exploded-chapters.html">Chapters</a></li>
              <li><a href="omni-dex.html">Omni‑Dex</a></li>
            </ul>
          </li>
          <li>
            <a href="poetry.html">Poetry</a>
          </li>
          <li>
            <a href="search.html" title="Search"><span class="search-icon">🔍</span></a>
          </li>
        </ul>
      </div>
      <a class="logo" href="index.html">KnowFlux</a>
    </div>
  </div>"""

SUBSCRIBE_FOOTER = """\
  <div id="subscribe">
    <div class="wrap">
      <h3>Leave your email here if you want front-row seats to the disaster that is our writing process.</h3>
      <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
      <center>
      <form action="https://app.kit.com/forms/8975170/subscriptions" class="seva-form formkit-form" method="post" data-sv-form="8975170" data-uid="f1aefa469b" data-format="inline" data-version="5"><div data-style="clean"><div data-element="fields" class="seva-fields formkit-fields"><div class="formkit-field"><input class="formkit-input" name="email_address" placeholder="Your email address" required type="email"></div><button data-element="submit" class="formkit-submit"><span>Subscribe</span></button></div></div></form>
      </center>
    </div>
  </div>
  <div id = "footer" data-reveal = "false">
    <div class="wrap">
      <ul>
        <li><a href="feedback.html">Feedback</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="https://anonewsletter-0.kit.com/e0e5fab31c">Subscribe</a></li>
      </ul>
    </div>
  </div>
  <div id = "copyright" data-reveal = "false">
    <div class="wrap">
      <div>&copy; <span id="copyright-year">2026</span> <span class="logo">KnowFlux</span></div>
    </div>
  </div>"""

























































# ---------------------------------------------------------------------------

# Update books.json directly with a new book page (no HTML file created)
# ---------------------------------------------------------------------------









































































def add_page_to_books_json(book_id, book_title, page_num, chapter_title, rendered_content):
    """
    Add a new page entry to books.json.
    Parses raw content with [dream]/[thought]/[underline] markers into proper HTML.
    """
    books_json_file = BASE_DIR / "books.json"
    
    # Load existing data or start fresh
    if books_json_file.exists():
        with open(books_json_file, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = {"books": [], "poetry": {}, "lastUpdated": None}
    else:






        data = {"books": [], "poetry": {}, "lastUpdated": None}
    
    # Find or create the book entry
    book_entry = None
    for b in data.get("books", []):
        if b.get("id") == book_id:
            book_entry = b
            break
    
    if book_entry is None:
        book_entry = {
            "id": book_id,
            "title": book_title,
            "description": "",
            "totalPages": 0,
            "pagesUrl": f"/{book_id}-pages.html",
            "chaptersUrl": f"/{book_id}-chapters.html",
            "pages": [],
            "chapters": {}
        }
        data["books"].append(book_entry)
    
    # Check if page already exists (by page_number)
    for p in book_entry["pages"]:
        if p["page_number"] == page_num:
            return False, f"Page {page_num} already exists in {book_title}."
    
    # Build the new page entry – note: no 'file' field since no HTML file exists
    new_page = {
        "page_number": page_num,
        "chapter_title": chapter_title,
        "content": rendered_content,
        # 'file' and 'url' are omitted because pages are served dynamically
    }
    
    # Insert in sorted order
    book_entry["pages"].append(new_page)
    book_entry["pages"].sort(key=lambda x: x["page_number"])
    
    # Update totalPages
    book_entry["totalPages"] = len(book_entry["pages"])
    
    # Update chapters grouping
    chapters = {}
    for p in book_entry["pages"]:
        ch = p["chapter_title"]
        if ch not in chapters:
            chapters[ch] = []
        chapters[ch].append(p)
    book_entry["chapters"] = chapters
    
    from datetime import datetime
    data["lastUpdated"] = datetime.now().isoformat()
    
    # Write back
    with open(books_json_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return True, None

























# ---------------------------------------------------------------------------



































































# Poetry
# ---------------------------------------------------------------------------

def get_poem_filename(title):
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "", slug)
    return slug + ".html"


def get_poetry_sections():
    poetry_file = BASE_DIR / "poetry.html"
    if not poetry_file.exists():
        return []
    content = poetry_file.read_text(encoding="utf-8")
    return re.findall(r'<h2>([^<]+)</h2>', content)


def generate_poem_html(title, section_name, raw_content):
    stanzas = [s.strip() for s in re.split(r"\n\s*\n", raw_content.strip()) if s.strip()]
    poem_html = ""
    for i, stanza in enumerate(stanzas):
        lines = [l.strip() for l in stanza.splitlines() if l.strip()]
        for line in lines:
            poem_html += f"      <p>{line}</p>\n"
        if i < len(stanzas) - 1:
            poem_html += '      <div class="clear spacer v20"></div>\n'

    subtitle = f"A {section_name.rstrip('s').upper()}"

    return f"""<!DOCTYPE html>
<html lang="en">

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="utf-8" />
  <title>{title} | KnowFlux</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Anton|Open+Sans">
  <link rel="icon" type="image/png" href="Images/favicon.jpeg">
  <link rel="stylesheet" href = "css/main.css">
  <script src = "js/bundle.js?cachebust=14"></script>
</head>

<body>
{COMMON_NAV}
  <div class="wrap">
    <div class="page-header-container">
      <h2 class="page-title">{title}</h2>
      <h3 class="page-subtitle">{subtitle}</h3>
    </div>
    <div class="clear spacer v20"></div>
    <div class="poetry-content">
{poem_html}    </div>
    <div class="clear spacer v100"></div>
  </div>

{SUBSCRIBE_FOOTER}
</body>

</html>"""


def update_poetry_html(poem_title, poem_filename, section_name):
    poetry_file = BASE_DIR / "poetry.html"
    if not poetry_file.exists():
        return False
    content = poetry_file.read_text(encoding="utf-8")

    subtitle = f"A {section_name.rstrip('s').upper()}"
    new_card = (
        f'      <a href="{poem_filename}" class="feature-link">\n'
        f'        <div class="poetry-box">\n'
        f'          <h3>{poem_title}</h3>\n'
        f'          <div class="subheading">{subtitle}</div>\n'
        f'        </div>\n'
        f'      </a>\n'
    )

    section_h2 = f'<h2>{section_name}</h2>'
    section_idx = content.find(section_h2)

    if section_idx != -1:
        grid_start = content.find('<div class="poetry-flex-grid">', section_idx)
        if grid_start != -1:
            # Find the grid's OWN closing </div> — it sits just before the
            # section wrap's closing </div>, so look for the 4-space </div>
            # followed by the 2-space </div> that closes the wrap.
            grid_close = content.find('\n    </div>\n  </div>', grid_start)
            if grid_close != -1:
                # Insert before the \n    </div> (i.e. inside the grid, after last card)
                insert_at = grid_close  # points to \n before grid's </div>
                content = content[:insert_at + 1] + new_card + content[insert_at + 1:]
    else:
        new_section = (
            f'  <div class = "wrap content-page">\n'
            f'    <h2>{section_name}</h2>\n'
            f'    <hr class = "underline"/>\n'
            f'    <div class="poetry-flex-grid">\n'
            f'{new_card}'
            f'    </div>\n'
            f'  </div>\n'
        )
        for marker in ['    <div class = "clear spacer v100">', '  <div id = "subscribe">']:
            idx = content.find(marker)
            if idx != -1:
                content = content[:idx] + new_section + content[idx:]
                break

    poetry_file.write_text(content, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# Books JSON generation
# ---------------------------------------------------------------------------

def extract_page_content(filename):
    """Extract the main content HTML from a page file."""
    filepath = BASE_DIR / filename
    if not filepath.exists():
        return ""
    content = filepath.read_text(encoding="utf-8")
    match = re.search(
        r'<div class="page-content"[^>]*>(.*?)</div>',
        content,
        re.DOTALL
    )
    return match.group(1).strip() if match else ""


def extract_page_info(filename):
    """Extract page number, chapter title, and content from a page file."""
    filepath = BASE_DIR / filename
    if not filepath.exists():
        return None
    
    content = filepath.read_text(encoding="utf-8")
    page_match = re.search(r'<h2 class="page-title">Page (\d+)</h2>', content)
    chapter_match = re.search(r'<h3 class="page-subtitle">([^<]+)</h3>', content)
    
    if page_match and chapter_match:
        return {
            "page_number": int(page_match.group(1)),
            "chapter_title": chapter_match.group(1),
            "file": filename,
            "url": f"/{filename}",
            "content": extract_page_content(filename)
        }
    return None



def extract_poetry_data():
    """Extract all poetry sections and poems from poetry.html."""
    poetry_file = BASE_DIR / "poetry.html"
    if not poetry_file.exists():
        return {}
    
    content = poetry_file.read_text(encoding="utf-8")
    poetry_data = {}
    
    # Find all sections by looking for <h2> tags
    sections = re.findall(r'<h2>([^<]+)</h2>', content)
    
    for section in sections:
        # Find where this section starts and where the next one begins
        section_h2_idx = content.find(f'<h2>{section}</h2>')
        
        if section_h2_idx >= 0:
            # Find the next <h2> to determine section end
            next_h2_idx = content.find('<h2>', section_h2_idx + 10)
            if next_h2_idx < 0:
                next_h2_idx = len(content)
            
            # Extract just this section's content
            section_content = content[section_h2_idx:next_h2_idx]
            
            # Find poem links within this section - must be in a poetry-box
            # Match <a href="..."> followed by <div class="poetry-box"> and then <h3>
            poems_in_section = []
            for match in re.finditer(r'<a href="([^"]+)"[^>]*>.*?<div class="poetry-box">.*?<h3>([^<]+)</h3>', section_content, re.DOTALL):
                filename, title = match.groups()
                poems_in_section.append({
                    "title": title.strip(),
                    "file": filename,
                    "url": f"/{filename}"
                })
            
            if poems_in_section:
                poetry_data[section] = poems_in_section
    
    return poetry_data


def generate_books_json():
    """Generate the complete books.json structure from current HTML files."""
    books_data = {
        "books": [],
        "poetry": {},
        "lastUpdated": None
    }
    
    # Find all Exploded pages by searching the filesystem
    exploded_pages = []
    for page_file in sorted(BASE_DIR.glob("exploded-page*.html")):
        page_info = extract_page_info(page_file.name)
        if page_info:
            exploded_pages.append(page_info)
    
    if exploded_pages:
        # Extract unique chapters from exploded pages
        exploded_chapters = {}
        for page in sorted(exploded_pages, key=lambda p: p["page_number"]):
            chapter = page["chapter_title"]
            if chapter not in exploded_chapters:
                exploded_chapters[chapter] = []
            exploded_chapters[chapter].append(page)
        
        books_data["books"].append({
            "id": "exploded",
            "title": "Exploded",
            "description": "Mysteries Unravel And Truth Is Revealed",
            "totalPages": len(exploded_pages),
            "pagesUrl": "/exploded-pages.html",
            "chaptersUrl": "/exploded-chapters.html",
            "pages": sorted(exploded_pages, key=lambda x: x["page_number"]),
            "chapters": {
                chapter: pages for chapter, pages in sorted(exploded_chapters.items())
            }
        })
    
    # Find all Pinnacle pages by searching the filesystem
    pinnacle_pages = []
    for page_file in sorted(BASE_DIR.glob("pinnacle-page*.html")):
        page_info = extract_page_info(page_file.name)
        if page_info:
            pinnacle_pages.append(page_info)
    
    if pinnacle_pages:
        pinnacle_chapters = {}
        for page in sorted(pinnacle_pages, key=lambda p: p["page_number"]):
            chapter = page["chapter_title"]
            if chapter not in pinnacle_chapters:
                pinnacle_chapters[chapter] = []
            pinnacle_chapters[chapter].append(page)
        
        books_data["books"].append({
            "id": "pinnacle",
            "title": "The Pinnacle of Reality",
            "description": "An Epic Tale of Reality and Destiny",
            "totalPages": len(pinnacle_pages),
            "pagesUrl": "/pinnacle-pages.html",
            "chaptersUrl": "/pinnacle-chapters.html",
            "pages": sorted(pinnacle_pages, key=lambda x: x["page_number"]),
            "chapters": {
                chapter: pages for chapter, pages in sorted(pinnacle_chapters.items())
            }
        })
    
    # Extract poetry data
    poetry_data = extract_poetry_data()
    if poetry_data:
        books_data["poetry"] = {
            "url": "/poetry.html",
            "sections": poetry_data
        }
    
    # Add timestamp
    from datetime import datetime
    books_data["lastUpdated"] = datetime.now().isoformat()
    
    return books_data


def get_priority_and_freq(filename):
    """Determine SEO priority and change frequency for a page."""
    if filename in ('index.html', ''):
        return 1.0, 'weekly'
    elif filename in ('aboutbook.html', 'poetry.html', 'contents.html'):
        return 0.9, 'weekly'
    elif filename.endswith('-pages.html') or filename.endswith('-chapters.html'):
        return 0.85, 'weekly'
    elif filename.startswith('exploded-page') or filename.startswith('pinnacle-page'):
        return 0.8, 'weekly'
    elif filename in ('comingsoon.html',):
        return 0.5, 'monthly'
    else:
        # Poetry and other content pages
        return 0.8, 'weekly'


def update_sitemap():
    """Generate and write a valid sitemap.xml with all pages, including dynamic reader URLs from books.json."""
    sitemap_file = BASE_DIR / "sitemap.xml"
    base_url = "https://knowflux.ink"
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    html_files = sorted(BASE_DIR.glob("*.html"))
    excluded = {'admin.html'}

    # Static pages
    pages = [('/', 1.0, 'weekly', today)]
    pages.append(('index.html', 1.0, 'weekly', today))

    for f in html_files:
        name = f.name
        if name in excluded or name == 'index.html':
            continue
        priority, freq = get_priority_and_freq(name)
        pages.append((name, priority, freq, today))

    # Add dynamic book pages from books.json
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
                        # Reader URL: reader.html?book=<book_id>&page=<page_num>
                        reader_url = f"reader.html?book={book_id}&page={page_num}"
                        # Use 0.8 priority, weekly (same as static page)
                        pages.append((reader_url, 0.8, 'weekly', today))
        except (json.JSONDecodeError, Exception):
            pass  # If books.json is corrupted, skip dynamic pages

    for page_path, priority, changefreq, lastmod in pages:
        if page_path == '/':
            loc = base_url + '/'
        elif page_path.startswith('reader.html?'):
            # Dynamic URL: no leading slash before reader.html?
            loc = f"{base_url}/{page_path}"
        else:
            loc = f"{base_url}/{page_path}"
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{loc}</loc>')
        xml_lines.append(f'    <lastmod>{lastmod}</lastmod>')
        xml_lines.append(f'    <changefreq>{changefreq}</changefreq>')
        xml_lines.append(f'    <priority>{priority:.1f}</priority>')
        xml_lines.append('  </url>')
    
    xml_lines.append('</urlset>')
    sitemap_file.write_text('\n'.join(xml_lines) + '\n', encoding="utf-8")
    return True


def save_books_json():
    """Generate and save books.json to disk."""
    books_data = generate_books_json()
    books_json_file = BASE_DIR / "books.json"
    books_json_file.write_text(json.dumps(books_data, indent=2, ensure_ascii=False), encoding="utf-8")
    return books_data

# ---------------------------------------------------------------------------
# Auto‑commit to GitHub (if GITHUB_TOKEN is set)
# ---------------------------------------------------------------------------

def auto_commit(message):
    """Stage all changes, commit, and push to GitHub using a stored token."""
    import subprocess
    import os
    import sys

    token = os.environ.get('GITHUB_TOKEN', '')
    if not token:
        print("Auto‑commit: No GITHUB_TOKEN set, skipping.")
        sys.stdout.flush()
        return

    # Determine the repository URL (fallback to env var)
    repo_url = os.environ.get('GIT_REPO_URL', '')
    if not repo_url:
        try:
            repo_url = subprocess.check_output(
                ['git', 'config', '--get', 'remote.origin.url'],
                text=True
            ).strip()
        except:
            print("Auto‑commit: No remote origin and no GIT_REPO_URL set. Aborting.")
            sys.stdout.flush()
            return

    if 'github.com' not in repo_url:
        print("Auto‑commit: Repository URL is not GitHub, skipping.")
        sys.stdout.flush()
        return

    try:
        cwd = BASE_DIR
        branch = os.environ.get('RENDER_GIT_BRANCH') or 'main'

        print(f"Auto‑commit: Repository URL = {repo_url}")
        sys.stdout.flush()

        # Check if remote 'origin' exists
        origin_exists = subprocess.run(
            ['git', 'remote', 'get-url', 'origin'],
            capture_output=True, cwd=cwd
        ).returncode == 0

        if not origin_exists:
            # Add the remote (this will create 'origin')
            subprocess.run(['git', 'remote', 'add', 'origin', repo_url], cwd=cwd)
            print("Auto‑commit: Added remote 'origin'.")
            sys.stdout.flush()

        # Now set authenticated URL (this overwrites if already exists)
        authed_url = repo_url.replace('https://', f'https://{token}@')
        subprocess.run(['git', 'remote', 'set-url', 'origin', authed_url], cwd=cwd)
        print("Auto‑commit: Set authenticated remote.")
        sys.stdout.flush()

        # Stage all changes
        subprocess.run(['git', 'add', '-A'], cwd=cwd)
        print("Auto‑commit: Staged changes.")
        sys.stdout.flush()

        # Check for changes
        result = subprocess.run(['git', 'diff-index', '--quiet', 'HEAD'],
                                capture_output=True, cwd=cwd)
        if result.returncode == 0:
            print("Auto‑commit: No changes to commit.")
            sys.stdout.flush()
            return

        # Commit
        name = os.environ.get('GIT_NAME', 'KnowFlux Bot')
        email = os.environ.get('GIT_EMAIL', 'bot@knowflux.ink')
        subprocess.run([
            'git', '-c', f'user.name={name}',
            '-c', f'user.email={email}',
            'commit', '-m', message
        ], cwd=cwd)
        print("Auto‑commit: Committed.")
        sys.stdout.flush()

        # Push
        push_result = subprocess.run(
            ['git', 'push', 'origin', f'HEAD:{branch}'],
            capture_output=True, text=True, cwd=cwd
        )
        print(f"Push stdout: {push_result.stdout}")
        print(f"Push stderr: {push_result.stderr}")
        sys.stdout.flush()

        # Restore original URL (remove authentication)
        subprocess.run(['git', 'remote', 'set-url', 'origin', repo_url], cwd=cwd)
        print("Auto‑commit: Restored remote URL.")
        sys.stdout.flush()

    except Exception as e:
        print(f"Auto‑commit failed: {e}")
        sys.stdout.flush()
    finally:
        # Ensure remote URL is restored even on error
        try:
            subprocess.run(['git', 'remote', 'set-url', 'origin', repo_url], cwd=cwd)
        except:
            pass

# ---------------------------------------------------------------------------
# HTTP Handler
# ---------------------------------------------------------------------------

class AdminHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        # Guard against missing self.path (happens during parse_request errors)
        path = getattr(self, 'path', '')
        if path.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.css', '.js')):
            # Cache images and static assets for 30 days
            self.send_header("Cache-Control", "public, max-age=2592000")
        else:
            # Don't cache dynamic content
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Expires", "0")
        super().end_headers()

    def _is_authenticated(self):
        token = self.headers.get("X-Auth-Token", "")
        return token in SESSIONS

    def do_GET(self):
        if self.path in ("/admin", "/admin.html"):
            self.path = "/admin.html"
        elif self.path == "/admin/poetry-sections":
            if not self._is_authenticated():
                self._send_json(401, {"success": False, "error": "Unauthorized."})
                return
            sections = get_poetry_sections()
            self._send_json(200, {"success": True, "sections": sections})
            return
        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")
        params = urllib.parse.parse_qs(post_data)

        if self.path == "/admin/login":
            password = params.get("password", [""])[0]
            if password == ADMIN_PASSWORD:
                token = secrets.token_hex(32)
                SESSIONS.add(token)
                self._send_json(200, {"success": True, "token": token})
            else:
                self._send_json(401, {"success": False, "error": "Incorrect password."})

        elif self.path in ("/admin/generate-exploded", "/admin/generate-pinnacle"):
            if not self._is_authenticated():
                self._send_json(401, {"success": False, "error": "Unauthorized."})
                return

            try:
                page_num_str = params.get("page_num", [""])[0].strip()
                chapter_title = params.get("chapter_title", [""])[0].strip()
                raw_content = params.get("main_content", [""])[0]

                if not page_num_str or not page_num_str.isdigit():
                    self._send_json(400, {"success": False, "error": "Valid page number is required."})
                    return
                page_num = int(page_num_str)
                if not chapter_title:
                    self._send_json(400, {"success": False, "error": "Chapter / page title is required."})
                    return
                if not raw_content.strip():
                    self._send_json(400, {"success": False, "error": "Page content cannot be empty."})
                    return

                book_id = "exploded" if "exploded" in self.path else "pinnacle"
                book_title = "Exploded" if book_id == "exploded" else "The Pinnacle of Reality"

                segments = parse_content_blocks(raw_content)
                rendered_content = render_content_blocks(segments)

                success, error_msg = add_page_to_books_json(
                    book_id, book_title, page_num, chapter_title, rendered_content
                )
                if not success:
                    self._send_json(400, {"success": False, "error": error_msg or "Could not add page."})
                    return

                # Don't call save_books_json() here — that scans HTML files on disk
                # and would overwrite the new entry we just added to books.json.
                # add_page_to_books_json already persists the change.
                update_sitemap()
                auto_commit(f"Add Page {page_num} of {book_title}")


                self._send_json(200, {
                    "success": True,
                    "page_num": page_num,
                    "book_id": book_id,
                    "book_title": book_title,
                })

            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e)})

        elif self.path == "/admin/generate-poetry":
            if not self._is_authenticated():
                self._send_json(401, {"success": False, "error": "Unauthorized."})
                return
            try:
                poem_title = params.get("poem_title", [""])[0].strip()
                section_name = params.get("section_name", [""])[0].strip()
                raw_content = params.get("main_content", [""])[0]

                if not poem_title:
                    self._send_json(400, {"success": False, "error": "Poem title is required."})
                    return
                if not section_name:
                    self._send_json(400, {"success": False, "error": "Section name is required."})
                    return
                if not raw_content.strip():
                    self._send_json(400, {"success": False, "error": "Poem content cannot be empty."})
                    return

                poem_filename = get_poem_filename(poem_title)
                poem_file = BASE_DIR / poem_filename
                if poem_file.exists():
                    self._send_json(400, {"success": False, "error": f"{poem_filename} already exists. Delete it first to regenerate."})
                    return

                html = generate_poem_html(poem_title, section_name, raw_content)
                poem_file.write_text(html, encoding="utf-8")
                update_poetry_html(poem_title, poem_filename, section_name)

                # Regenerate books.json and sitemap
                save_books_json()
                update_sitemap()
                auto_commit(f"Add poem {poem_title}")

                self._send_json(200, {
                    "success": True,
                    "file": poem_filename,
                    "section": section_name,
                })

            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e)})

        else:
            self.send_response(404)
            self.end_headers()

    def _send_json(self, code, data):
        response = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    import time
    free_port(PORT)
    for attempt in range(5):
        try:
            with ReusableTCPServer(("0.0.0.0", PORT), AdminHTTPRequestHandler) as httpd:
                print(f"Serving HTTP on 0.0.0.0 port {PORT}...")
                httpd.serve_forever()
        except OSError as e:
            if e.errno == 48:
                print(f"Port {PORT} still in use ({attempt+1}/5). Waiting 2 seconds...")
                time.sleep(2)
            else:
                raise
    else:
        print(f"Failed to bind to port {PORT} after 5 attempts.")
        sys.exit(1)


