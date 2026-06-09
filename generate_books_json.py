#!/usr/bin/env python3
"""
Standalone script to generate books.json from existing content.
This can be run independently without needing the server.
"""

import json
import re
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent

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
    """Extract page number and chapter title from a page file."""
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
                chapter: pages
                for chapter, pages in sorted(
                    exploded_chapters.items(),
                    key=lambda item: min(p["page_number"] for p in item[1])
                )
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
                chapter: pages
                for chapter, pages in sorted(
                    pinnacle_chapters.items(),
                    key=lambda item: min(p["page_number"] for p in item[1])
                )
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
    books_data["lastUpdated"] = datetime.now().isoformat()
    
    return books_data


if __name__ == "__main__":
    books_data = generate_books_json()
    books_json_file = BASE_DIR / "books.json"
    books_json_file.write_text(json.dumps(books_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ books.json generated successfully!")
    print(f"📍 Location: {books_json_file}")
    print(f"📖 Books found: {len(books_data['books'])}")
    for book in books_data['books']:
        print(f"   - {book['title']}: {book['totalPages']} pages")
    if books_data['poetry']:
        total_poems = sum(len(poems) for poems in books_data['poetry']['sections'].values())
        print(f"📜 Poetry sections: {len(books_data['poetry']['sections'])} ({total_poems} poems)")
