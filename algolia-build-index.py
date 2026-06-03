import urllib.request
from html.parser import HTMLParser
import json
import xml.etree.ElementTree as ET

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

# Parse sitemap
tree = ET.parse('sitemap.xml')  # or use the live URL
root = tree.getroot()
ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

records = []
for url in root.findall('ns:url/ns:loc', ns):
    page_url = url.text
    # We only want .html pages (skip root index.html duplicate)
    if '.html' not in page_url:
        continue

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

    # Create a record
    records.append({
        "objectID": page_url.split('/')[-1].replace('.html', ''),
        "title": parser.title or 'Untitled',
        "description": parser.description or '',
        "url": page_url.replace('https://knowflux.github.io', '')  # make relative
    })

# Write JSON
with open('algolia_records.json', 'w') as f:
    json.dump(records, f, indent=2)

print(f"Created {len(records)} records in algolia_records.json")