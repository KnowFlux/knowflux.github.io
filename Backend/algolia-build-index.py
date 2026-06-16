import urllib.request
from html.parser import HTMLParser
import json
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, parse_qs
from config import ROOT_DIR

class MetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ''
        self.description = ''
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag == 'title':
            self.in_title = True
        if tag == 'meta':
            attrs_dict = dict(attrs)
            if attrs_dict.get('name') == 'description':
                self.description = attrs_dict.get('content', '')

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data.strip()

def make_object_id(url):
    """Create a unique objectID from a URL."""
    path = url.split('://', 1)[-1].split('/', 1)[-1] if '://' in url else url
    if not path or path == '':
        return 'home'
    clean = ''.join(c if c.isalnum() or c in '.-_?=&' else '-' for c in path)
    return clean

def extract_book_page_info(url):
    """Return (book_name, page_number) if URL is a reader book page, else None."""
    parsed = urlparse(url)
    if parsed.path.rstrip('/') == '/reader.html':
        params = parse_qs(parsed.query)
        book = params.get('book', [None])[0]
        page = params.get('page', [None])[0]
        if book and page:
            return (book, page)
    return None

# Parse sitemap
tree = ET.parse('sitemap.xml')  # or use the live URL
root = tree.getroot()
ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

records = []
for url_elem in root.findall('ns:url', ns):
    loc_elem = url_elem.find('ns:loc', ns)
    if loc_elem is None or not loc_elem.text:
        continue
    page_url = loc_elem.text.strip()

    # Fetch the page content
    try:
        response = urllib.request.urlopen(page_url, timeout=5)
        html = response.read().decode('utf-8')
    except Exception as e:
        print(f"Could not fetch {page_url}: {e}")
        continue

    parser = MetadataParser()
    parser.feed(html)
    parser.close()

    # Build relative URL (remove domain)
    domain = 'https://knowflux.ink'
    if page_url.startswith(domain):
        relative_url = page_url[len(domain):] or '/'
    elif page_url.startswith('https://knowflux.github.io'):
        relative_url = page_url[len('https://knowflux.github.io'):] or '/'
    else:
        relative_url = page_url  # fallback

    title = parser.title or 'KnowFlux'

    # Override title for reader book pages
    book_info = extract_book_page_info(page_url)
    if book_info:
        book, page = book_info
        # Capitalize book name properly
        readable_book = book.replace('-', ' ').title()
        title = f"Page {page} | {readable_book}"

    records.append({
        "objectID": make_object_id(page_url),
        "title": title,
        "description": parser.description or '',
        "url": relative_url
    })

# Write JSON
with open('algolia_records.json', 'w') as f:
    json.dump(records, f, indent=2)

print(f"Created {len(records)} records in algolia_records.json")
