import http.server
import socketserver
import urllib.parse
import json
import re
import secrets
from pathlib import Path

PORT = 10000
BASE_DIR = Path(__file__).parent

ADMIN_PASSWORD = "Kf$9mXpQ#2vNrL7w"
SESSIONS = set()



def parse_content_blocks(raw_content):
    segments = []
    current_type = "normal"
    current_lines = []
    for line in raw_content.splitlines():
        stripped = line.strip().lower()
        if stripped in ("[dream]", "[/dream]", "[thought]", "[/thought]"):
            if current_lines:
                text = "\n".join(current_lines).strip()
                if text:
                    segments.append((current_type, text))
            current_lines = []
            if stripped == "[dream]":
                current_type = "dream"
            elif stripped in ("[/dream]", "[/thought]"):
                current_type = "normal"
            elif stripped == "[thought]":
                current_type = "thought"
        else:
            current_lines.append(line)
    if current_lines:
        text = "\n".join(current_lines).strip()
        if text:
            segments.append((current_type, text))
    return segments


def generate_page_html(page_num, chapter_title, raw_content):
    prev_page = page_num - 1
    segments = parse_content_blocks(raw_content)

    main_content = ""
    for seg_type, content in segments:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
        if not paragraphs:
            continue
        if seg_type == "normal":
            for p in paragraphs:
                main_content += f"      <p>{p}</p>\n\n"
        elif seg_type == "dream":
            main_content += "      <hr class=\"underline\"/>\n\n"
            main_content += "      <div class=\"dreamMemText\">\n\n"
            for p in paragraphs:
                main_content += f"        <p>{p}</p>\n\n"
            main_content += "      </div>\n\n"
        elif seg_type == "thought":
            for p in paragraphs:
                main_content += f"      <div class=\"thoughtText\">\n        <p>{p}</p>\n      </div>\n\n"

    if prev_page >= 1:
        nav = (
            '    <div class="page-footer-action" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">\n'
            f'      <a href="page{prev_page}.html" class="comingSoonButton" style="padding: 15px 30px;">⬅️</a>\n'
            '      <a href="comingsoon.html" class="comingSoonButton">COMING SOON!</a>\n'
            '    </div>'
        )
    else:
        nav = (
            '    <div class="page-footer-action">\n'
            '      <a href="page2.html" class="comingSoonButton">➡️</a>\n'
            '    </div>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">

<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="utf-8" />
  <title>Page {page_num} | KnowFlux</title>
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
          <li>
            <a href="index.html">Home</a>
          </li>
          <li class="has-submenu">
            <a href="aboutbook.html" id="read-link">Read</a>
            <ul>
              <li><a href="aboutbook.html">About Book</a></li>
              <li><a href="page1.html">Open Book</a></li>
              <li><a href="pages.html">Pages</a></li>
              <li><a href="chapters.html">Chapters</a></li>
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
  </div>
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

  <div id="copyright">
    <div class="wrap">
      <div>&copy; <span id="copyright-year">2026</span> <span class="logo">KnowFlux</span></div>
    </div>
  </div>
</body>

</html>"""


def update_previous_page(prev_page_num, new_page_num):
    prev_file = BASE_DIR / f"page{prev_page_num}.html"
    if not prev_file.exists():
        return False
    content = prev_file.read_text(encoding="utf-8")
    new_content = re.sub(
        r'<a href="comingsoon\.html" class="comingSoonButton"[^>]*>COMING SOON!</a>',
        f'<a href="page{new_page_num}.html" class="comingSoonButton">➡️</a>',
        content,
    )
    prev_file.write_text(new_content, encoding="utf-8")
    return True


def update_pages_html(page_num, chapter_title):
    pages_file = BASE_DIR / "pages.html"
    content = pages_file.read_text(encoding="utf-8")
    new_card = (
        f'      <a href="page{page_num}.html" class="feature-link">\n'
        f'        <div class="poetry-box">\n'
        f'          <h3>PAGE {page_num}</h3>\n'
        f'          <div class="subheading">{chapter_title.upper()}</div>\n'
        f'        </div>\n'
        f'      </a>\n'
    )
    marker = '    <div class="spacer v100">'
    idx = content.find(marker)
    if idx != -1:
        insert_at = content.rfind("    </div>\n", 0, idx)
        if insert_at != -1:
            content = content[:insert_at] + new_card + content[insert_at:]
    pages_file.write_text(content, encoding="utf-8")


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

        elif self.path == "/admin/generate":
            if not self._is_authenticated():
                self._send_json(401, {"success": False, "error": "Unauthorized."})
                return

            try:
                page_num = int(params.get("page_num", [""])[0])
                chapter_title = params.get("chapter_title", [""])[0].strip()
                raw_content = params.get("main_content", [""])[0]

                if not chapter_title:
                    self._send_json(400, {"success": False, "error": "Chapter title is required."})
                    return

                if not raw_content.strip():
                    self._send_json(400, {"success": False, "error": "Main content cannot be empty."})
                    return

                new_page_file = BASE_DIR / f"page{page_num}.html"
                if new_page_file.exists():
                    self._send_json(400, {"success": False, "error": f"page{page_num}.html already exists! Delete it first if you want to regenerate."})
                    return

                html = generate_page_html(page_num, chapter_title, raw_content)
                new_page_file.write_text(html, encoding="utf-8")

                prev_updated = update_previous_page(page_num - 1, page_num)
                update_pages_html(page_num, chapter_title)

                self._send_json(200, {
                    "success": True,
                    "message": f"Page {page_num} created successfully!",
                    "file": f"page{page_num}.html",
                    "prev_updated": prev_updated,
                })

            except ValueError:
                self._send_json(400, {"success": False, "error": "Page number must be a valid number."})
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
