"""
Standalone script to regenerate books.json.
- Book pages are preserved as-is (they are managed by the admin panel via server.py).
- Poetry section is rebuilt from poetry.html (which still uses static .html files).
- If books.json doesn't exist, it will create a minimal one with poetry only.
"""

import json
import re
from datetime import datetime
from config import ROOT_DIR

# ROOT_DIR is the repo root (parent of Backend/). poetry.html and books.json
# live there, so this script must read/write from ROOT_DIR — not Backend/.
BASE_DIR = ROOT_DIR

def extract_poetry_data():
    """Extract all poetry sections and poems from poetry.html."""
    poetry_file = BASE_DIR / "poetry.html"
    if not poetry_file.exists():
        return {}
    
    content = poetry_file.read_text(encoding="utf-8")
    poetry_data = {}
    
    sections = re.findall(r'<h2>([^<]+)</h2>', content)
    
    for section in sections:
        section_h2_idx = content.find(f'<h2>{section}</h2>')
        if section_h2_idx >= 0:
            next_h2_idx = content.find('<h2>', section_h2_idx + 10)
            if next_h2_idx < 0:
                next_h2_idx = len(content)
            section_content = content[section_h2_idx:next_h2_idx]
            poems_in_section = []
            for match in re.finditer(r'<a href="([^"]+)"[^>]*>.*?<div class="poetry-box">.*?<h3>([^<]+)</h3>', section_content, re.DOTALL):
                filename, title = match.groups()
                # Validate against disk: hrefs are written as Poetry/foo.html
                # relative to the repo root, so a stale or unprefixed href
                # is a real 404 and must not enter books.json.
                if not (BASE_DIR / filename).exists():
                    print(f"WARNING: skipping {title.strip()!r} -> {filename} (file not found)")
                    continue
                poems_in_section.append({
                    "title": title.strip(),
                    "url": f"/{filename}"
                })
            if poems_in_section:
                poetry_data[section] = poems_in_section
    return poetry_data


if __name__ == "__main__":
    books_json_file = BASE_DIR / "books.json"
    
    # Load existing books.json to preserve book pages
    if books_json_file.exists():
        with open(books_json_file, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = {"books": [], "poetry": {}, "lastUpdated": None}
        print("📖 Existing books.json found. Preserving book pages.")
    else:
        data = {"books": [], "poetry": {}, "lastUpdated": None}
        print("📖 No books.json found. Creating new one.")
    
    # Only regenerate poetry section (book pages are dynamic, managed by server)
    poetry_data = extract_poetry_data()
    if poetry_data:
        data["poetry"] = {
            "url": "/poetry.html",
            "sections": poetry_data
        }
    
    # Update timestamp
    data["lastUpdated"] = datetime.now().isoformat()
    
    # Write back
    books_json_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    
    print(f"✅ books.json updated successfully!")
    print(f"   Books preserved: {len(data.get('books', []))}")
    total_poems = sum(len(poems) for poems in poetry_data.values()) if poetry_data else 0
    print(f"   Poetry sections: {len(poetry_data)} ({total_poems} poems)")