import http.server
import socketserver
import urllib.parse
import json
import re
import secrets
import os
import base64
import requests # Make sure to add 'requests' to your requirements.txt
from pathlib import Path

# --- CONFIGURATION ---
PORT = int(os.environ.get("PORT", 10000))
BASE_DIR = Path(__file__).parent
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Kf$9mXpQ#2vNrL7w")
SESSIONS = set()

# GitHub API Settings (Set these in Render Dashboard)
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO_OWNER = os.environ.get("REPO_OWNER")
REPO_NAME = os.environ.get("REPO_NAME")
BRANCH = os.environ.get("BRANCH", "main")

def push_to_github(file_path, content, message):
    """Commits and pushes a file to GitHub via API."""
    if not all([GITHUB_TOKEN, REPO_OWNER, REPO_NAME]):
        print("GitHub config missing. Saving locally only.")
        return False

    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{file_path}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # Get the current file SHA if it exists (required for updates)
    response = requests.get(url, headers=headers)
    sha = response.json().get("sha") if response.status_code == 200 else None

    payload = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
        "branch": BRANCH
    }
    if sha:
        payload["sha"] = sha

    res = requests.put(url, headers=headers, json=payload)
    return res.status_code in [200, 201]

# --- YOUR EXISTING LOGIC (UPDATED FOR GITHUB) ---

def parse_content_blocks(raw_content):
    segments = []
    current_type = "normal"
    current_lines = []
    for line in raw_content.splitlines():
        stripped = line.strip().lower()
        if stripped in ("[dream]", "[/dream]", "[thought]", "[/thought]"):
            if current_lines:
                text = "\n".join(current_lines).strip()
                if text: segments.append((current_type, text))
            current_lines = []
            if stripped == "[dream]": current_type = "dream"
            elif stripped in ("[/dream]", "[/thought]"): current_type = "normal"
            elif stripped == "[thought]": current_type = "thought"
        else:
            current_lines.append(line)
    if current_lines:
        text = "\n".join(current_lines).strip()
        if text: segments.append((current_type, text))
    return segments

def generate_page_html(page_num, chapter_title, raw_content):
    prev_page = page_num - 1
    segments = parse_content_blocks(raw_content)
    main_content = ""
    for seg_type, content in segments:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
        if not paragraphs: continue
        if seg_type == "normal":
            for p in paragraphs: main_content += f"      <p>{p}</p>\n\n"
        elif seg_type == "dream":
            main_content += "      <hr class=\"underline\"/>\n\n      <div class=\"dreamMemText\">\n\n"
            for p in paragraphs: main_content += f"        <p>{p}</p>\n\n"
            main_content += "      </div>\n\n"
        elif seg_type == "thought":
            for p in paragraphs: main_content += f"      <div class=\"thoughtText\">\n        <p>{p}</p>\n      </div>\n\n"

    nav = f'    <div class="page-footer-action" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">\n      <a href="page{prev_page}.html" class="comingSoonButton" style="padding: 15px 30px;">⬅️</a>\n      <a href="comingsoon.html" class="comingSoonButton">COMING SOON!</a>\n    </div>' if prev_page >= 1 else '    <div class="page-footer-action">\n      <a href="page2.html" class="comingSoonButton">➡️</a>\n    </div>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="utf-8" />
  <title>Page {page_num} | KnowFlux</title>
  <link rel="stylesheet" href="https://googleapis.com|Open+Sans">
  <link rel="icon" type="image/png" href="Images/favicon.png">
  <link rel="stylesheet" href="style.css?cachebust=13">
  <script src="script.js?cachebust=13"></script>
</head>
<body>
  <div id="topMenu"><div class="wrap"><a class="logo" href="index.html">KnowFlux</a></div></div>
  <div class="wrap">
    <div class="page-header-container"><h2 class="page-title">Page {page_num}</h2><h3 class="page-subtitle">{chapter_title}</h3></div>
    <div class="page-content">{main_content}</div>
    {nav}
  </div>
</body>
</html>"""

def update_previous_page_on_github(prev_page_num, new_page_num):
    file_path = f"page{prev_page_num}.html"
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{file_path}"
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        content = base64.b64decode(res.json()["content"]).decode("utf-8")
        new_content = re.sub(r'<a href="comingsoon\.html" class="comingSoonButton"[^>]*>COMING SOON!</a>', f'<a href="page{new_page_num}.html" class="comingSoonButton">➡️</a>', content)
        push_to_github(file_path, new_content, f"Update page {prev_page_num} nav")

def update_pages_list_on_github(page_num, chapter_title):
    file_path = "pages.html"
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/contents/{file_path}"
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        content = base64.b64decode(res.json()["content"]).decode("utf-8")
        new_card = f'      <a href="page{page_num}.html" class="feature-link">\n        <div class="poetry-box">\n          <h3>PAGE {page_num}</h3>\n          <div class="subheading">{chapter_title.upper()}</div>\n        </div>\n      </a>\n'
        marker = '    <div class="spacer v100">'
        idx = content.find(marker)
        if idx != -1:
            insert_at = content.rfind("    </div>\n", 0, idx)
            content = content[:insert_at] + new_card + content[insert_at:]
            push_to_github(file_path, content, f"Add page {page_num} to list")

class AdminHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def _is_authenticated(self):
        return self.headers.get("X-Auth-Token", "") in SESSIONS

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        params = urllib.parse.parse_qs(self.rfile.read(content_length).decode("utf-8"))

        if self.path == "/admin/login":
            if params.get("password", [""])[0] == ADMIN_PASSWORD:
                token = secrets.token_hex(32)
                SESSIONS.add(token)
                self._send_json(200, {"success": True, "token": token})
            else:
                self._send_json(401, {"success": False})

        elif self.path == "/admin/generate":
            if not self._is_authenticated():
                self._send_json(401, {"success": False})
                return
            
            p_num = int(params.get("page_num", [""])[0])
            c_title = params.get("chapter_title", [""])[0]
            raw_c = params.get("main_content", [""])[0]
            
            html = generate_page_html(p_num, c_title, raw_c)
            # Push new page, update previous, and update list
            push_to_github(f"page{p_num}.html", html, f"Generate page {p_num}")
            update_previous_page_on_github(p_num - 1, p_num)
            update_pages_list_on_github(p_num, c_title)
            
            self._send_json(200, {"success": True})

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

if __name__ == "__main__":
    with socketserver.TCPServer(("0.0.0.0", PORT), AdminHTTPRequestHandler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()
