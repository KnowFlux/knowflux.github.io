import http.server
import socketserver
import urllib.parse
import json
import re
import secrets
from pathlib import Path

PORT = 5000
BASE_DIR = Path(__file__).parent

ADMIN_PASSWORD = "Kf$9mXpQ#2vNrL7w"
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
  <link rel="icon" type="image/png" href="Images/favicon.png">
  <link rel="stylesheet" href="style.css?cachebust=13">
  <script src="script.js?cachebust=13"></script>"""

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
              <li><a href="exploded-page1.html">Open Book</a></li>
              <li><a href="exploded-pages.html">Pages</a></li>
              <li><a href="exploded-chapters.html">Chapters</a></li>
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
      <h3>SUBSCRIBE TO RECEIVE UPDATES ABOUT NEW CONTENT</h3>
      <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
      <center>
      <form action="https://app.kit.com/forms/8975170/subscriptions" class="seva-form formkit-form" method="post" data-sv-form="8975170" data-uid="f1aefa469b" data-format="inline" data-version="5"><div data-style="clean"><div data-element="fields" class="seva-fields formkit-fields"><div class="formkit-field"><input class="formkit-input" name="email_address" placeholder="Your email address" required type="email"></div><button data-element="submit" class="formkit-submit"><span>Subscribe</span></button></div></div></form>
      </center>
    </div>
  </div>
  <div id="footer">
    <div class="wrap">
      <ul>
        <li><a href="feedback.html">Feedback</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="https://anonewsletter-0.kit.com/e0e5fab31c">Subscribe</a></li>
      </ul>
    </div>
  </div>
  <div id="copyright">
    <div class="wrap">
      <div>&copy; <span id="copyright-year">2026</span> <span class="logo">KnowFlux</span></div>
    </div>
  </div>"""


def build_page_nav(page_num, file_prefix):
    """Build the footer nav for a book-style page."""
    prev_num = page_num - 1
    if prev_num >= 1:
        return (
            '    <div class="page-footer-action" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">\n'
            f'      <a href="{file_prefix}{prev_num}.html" class="comingSoonButton" style="padding: 15px 30px;">⬅️</a>\n'
            '      <a href="comingsoon.html" class="comingSoonButton">COMING SOON!</a>\n'
            '    </div>'
        )
    else:
        return (
            '    <div class="page-footer-action">\n'
            f'      <a href="{file_prefix}2.html" class="comingSoonButton">➡️</a>\n'
            '    </div>'
        )


def generate_page_html(page_num, chapter_title, raw_content, file_prefix, book_title):
    segments = parse_content_blocks(raw_content)
    main_content = render_content_blocks(segments)
    nav = build_page_nav(page_num, file_prefix)

    return f"""<!DOCTYPE html>
<html lang="en">

<head>
{COMMON_HEAD}
  <title>{book_title} — Page {page_num} | KnowFlux</title>
</head>

<body>
{COMMON_NAV}
  <div class="wrap">
    <div class="page-header-container">
      <h2 class="page-title">Page {page_num}</h2>
      <h3 class="page-subtitle">{chapter_title}</h3>
    </div>

    <div class="page-content" id="page1-content">
{main_content}    </div>

{nav}
  </div>

  <div id="scroll-progress-container">
    <div id="scroll-progress-bar"></div>
  </div>

{SUBSCRIBE_FOOTER}
</body>

</html>"""


# ---------------------------------------------------------------------------
# Pages index and chapters index helpers
# ---------------------------------------------------------------------------

PAGES_INDEX_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="utf-8" />
  <title>{book_title} — Pages | KnowFlux</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Anton|Open+Sans">
  <link rel="icon" type="image/png" href="Images/favicon.png">
  <link rel="stylesheet" href="style.css?cachebust=13">
  <script src="script.js?cachebust=13"></script>
</head>

<body>
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
          <li><a href="index.html">Home</a></li>
          <li class="has-submenu">
            <a href="aboutbook.html" id="read-link">Read</a>
            <ul>
              <li><a href="aboutbook.html">About Book</a></li>
              <li><a href="exploded-page1.html">Open Book</a></li>
              <li><a href="exploded-pages.html">Pages</a></li>
              <li><a href="exploded-chapters.html">Chapters</a></li>
            </ul>
          </li>
          <li><a href="poetry.html">Poetry</a></li>
          <li><a href="search.html" title="Search"><span class="search-icon">🔍</span></a></li>
        </ul>
      </div>
      <a class="logo" href="index.html">KnowFlux</a>
    </div>
  </div>
  <div class="wrap content-page">
    <h1 class="page-title">{heading}</h1>
    <div class="poetry-flex-grid">
    </div>
    <div class="spacer v100"></div>
  </div>
  <div id="copyright">
    <div class="wrap">
      <div>&copy; <span id="copyright-year">2026</span> <span class="logo">KnowFlux</span></div>
    </div>
  </div>
</body>
</html>"""

CHAPTERS_INDEX_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="utf-8" />
  <title>{book_title} — Chapters | KnowFlux</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Anton|Open+Sans">
  <link rel="icon" type="image/png" href="Images/favicon.png">
  <link rel="stylesheet" href="style.css?cachebust=13">
  <script src="script.js?cachebust=13"></script>
</head>

<body>
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
          <li><a href="index.html">Home</a></li>
          <li class="has-submenu">
            <a href="aboutbook.html" id="read-link">Read</a>
            <ul>
              <li><a href="aboutbook.html">About Book</a></li>
              <li><a href="exploded-page1.html">Open Book</a></li>
              <li><a href="exploded-pages.html">Pages</a></li>
              <li><a href="exploded-chapters.html">Chapters</a></li>
            </ul>
          </li>
          <li><a href="poetry.html">Poetry</a></li>
          <li><a href="search.html" title="Search"><span class="search-icon">🔍</span></a></li>
        </ul>
      </div>
      <a class="logo" href="index.html">KnowFlux</a>
    </div>
  </div>
  <div class="wrap content-page">
    <h1 class="page-title">{heading}</h1>
    <div class="poetry-flex-grid">
    </div>
    <div class="spacer v100"></div>
  </div>
  <div id="copyright">
    <div class="wrap">
      <div>&copy; <span id="copyright-year">2026</span> <span class="logo">KnowFlux</span></div>
    </div>
  </div>
</body>
</html>"""


def ensure_index_file(filepath, template, book_title, heading):
    """Create the index file from template if it doesn't exist. Returns True if created."""
    if not filepath.exists():
        content = template.format(book_title=book_title, heading=heading)
        filepath.write_text(content, encoding="utf-8")
        return True
    return False


def add_card_to_index(filepath, card_html):
    """Insert a card before the closing </div> of .poetry-flex-grid."""
    content = filepath.read_text(encoding="utf-8")
    marker = '    </div>\n    <div class="spacer v100">'
    idx = content.find(marker)
    if idx != -1:
        content = content[:idx] + card_html + content[idx:]
    else:
        empty_grid = '    <div class="poetry-flex-grid">\n    </div>'
        idx2 = content.find(empty_grid)
        if idx2 != -1:
            insert_at = idx2 + len('    <div class="poetry-flex-grid">\n')
            content = content[:insert_at] + card_html + content[insert_at:]
    filepath.write_text(content, encoding="utf-8")


def chapter_title_exists(filepath, chapter_title):
    """Return True if an <h3> with this chapter title already exists in the file."""
    if not filepath.exists():
        return False
    content = filepath.read_text(encoding="utf-8")
    titles = re.findall(r'<h3>([^<]+)</h3>', content)
    return chapter_title.strip() in [t.strip() for t in titles]


def update_previous_page_nav(prev_file_path, new_page_filename):
    """Update the COMING SOON link in the previous page to point to the new page."""
    if not prev_file_path.exists():
        return False
    content = prev_file_path.read_text(encoding="utf-8")
    new_content = re.sub(
        r'<a href="comingsoon\.html" class="comingSoonButton"[^>]*>COMING SOON!</a>',
        f'<a href="{new_page_filename}" class="comingSoonButton">➡️</a>',
        content,
    )
    prev_file_path.write_text(new_content, encoding="utf-8")
    return new_content != content


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
  <link rel="icon" type="image/png" href="Images/favicon.png">
  <link rel="stylesheet" href="style.css?cachebust=13">
  <script src="script.js?cachebust=13"></script>
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
# HTTP Handler
# ---------------------------------------------------------------------------

class AdminHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Expires", "0")
        super().end_headers()

    def _is_authenticated(self):
        token = self.headers.get("X-Auth-Token", "")
        return token in SESSIONS and token != ""

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
                is_exploded = self.path == "/admin/generate-exploded"
                file_prefix = "exploded-page" if is_exploded else "pinnacle-page"
                book_title = "Exploded" if is_exploded else "The Pinnacle of Reality"
                pages_filename = "exploded-pages.html" if is_exploded else "pinnacle-pages.html"
                chapters_filename = "exploded-chapters.html" if is_exploded else "pinnacle-chapters.html"
                pages_heading = "EXPLODED — PAGES" if is_exploded else "THE PINNACLE OF REALITY — PAGES"
                chapters_heading = "EXPLODED — CHAPTERS" if is_exploded else "THE PINNACLE OF REALITY — CHAPTERS"

                page_num = int(params.get("page_num", [""])[0])
                chapter_title = params.get("chapter_title", [""])[0].strip()
                raw_content = params.get("main_content", [""])[0]

                if page_num < 1:
                    self._send_json(400, {"success": False, "error": "Page number must be 1 or greater."})
                    return
                if not chapter_title:
                    self._send_json(400, {"success": False, "error": "Chapter title is required."})
                    return
                if not raw_content.strip():
                    self._send_json(400, {"success": False, "error": "Content cannot be empty."})
                    return

                new_filename = f"{file_prefix}{page_num}.html"
                new_page_file = BASE_DIR / new_filename
                if new_page_file.exists():
                    self._send_json(400, {"success": False, "error": f"{new_filename} already exists. Delete it first to regenerate."})
                    return

                # Auto-create index files if needed
                pages_file = BASE_DIR / pages_filename
                chapters_file = BASE_DIR / chapters_filename
                pages_created = ensure_index_file(pages_file, PAGES_INDEX_TEMPLATE, book_title, pages_heading)
                chapters_created = ensure_index_file(chapters_file, CHAPTERS_INDEX_TEMPLATE, book_title, chapters_heading)

                # Generate the page
                html = generate_page_html(page_num, chapter_title, raw_content, file_prefix, book_title)
                new_page_file.write_text(html, encoding="utf-8")

                # Update previous page's nav
                prev_updated = False
                if page_num > 1:
                    prev_file = BASE_DIR / f"{file_prefix}{page_num - 1}.html"
                    prev_updated = update_previous_page_nav(prev_file, new_filename)

                # Add card to pages index
                pages_card = (
                    f'      <a href="{new_filename}" class="feature-link">\n'
                    f'        <div class="poetry-box">\n'
                    f'          <h3>PAGE {page_num}</h3>\n'
                    f'          <div class="subheading">{chapter_title.upper()}</div>\n'
                    f'        </div>\n'
                    f'      </a>\n'
                )
                add_card_to_index(pages_file, pages_card)

                # Add card to chapters index only if this chapter title isn't already listed
                chapter_is_new = not chapter_title_exists(chapters_file, chapter_title)
                if chapter_is_new:
                    chapters_card = (
                        f'      <a href="{new_filename}" class="feature-link">\n'
                        f'        <div class="poetry-box">\n'
                        f'          <h3>{chapter_title}</h3>\n'
                        f'          <div class="subheading">PAGE {page_num}</div>\n'
                        f'        </div>\n'
                        f'      </a>\n'
                    )
                    add_card_to_index(chapters_file, chapters_card)

                self._send_json(200, {
                    "success": True,
                    "file": new_filename,
                    "pages_file": pages_filename,
                    "chapters_file": chapters_filename,
                    "pages_created": pages_created,
                    "chapters_created": chapters_created,
                    "prev_updated": prev_updated,
                    "page_num": page_num,
                    "chapter_is_new": chapter_is_new,
                })

            except ValueError:
                self._send_json(400, {"success": False, "error": "Page number must be a valid number."})
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


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", PORT), AdminHTTPRequestHandler) as httpd:
    print(f"Serving HTTP on 0.0.0.0 port {PORT}...")
    httpd.serve_forever()
