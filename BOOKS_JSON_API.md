# Books.json API Documentation

## Overview

The `books.json` file is automatically generated and updated by your server whenever new content is published. It provides a structured JSON representation of all books, chapters, pages, and poetry on your KnowFlux site.

**Location:** `/books.json`  
**Format:** JSON  
**Auto-updated:** Yes - whenever you publish new content via the admin panel

---

## Structure

### Top-level Properties

```json
{
  "books": [...],           // Array of book objects
  "poetry": {...},          // Poetry sections and poems
  "lastUpdated": "ISO8601"  // Timestamp of last update
}
```

### Books Array

Each book object contains:

```json
{
  "id": "exploded",                          // Unique identifier
  "title": "Exploded",                       // Display title
  "description": "Mysteries Unravel...",     // Book description
  "totalPages": 2,                           // Total number of pages
  "pagesUrl": "/exploded-pages.html",        // Link to pages index
  "chaptersUrl": "/exploded-chapters.html",  // Link to chapters index
  "pages": [                                 // All pages in order
    {
      "page_number": 14,
      "chapter_title": "A Calling",
      "file": "exploded-page14.html",
      "url": "/exploded-page14.html"
    },
    ...
  ],
  "chapters": {                              // Chapters organized by title
    "A Calling": [                           // Array of pages in this chapter
      {
        "page_number": 14,
        "chapter_title": "A Calling",
        "file": "exploded-page14.html",
        "url": "/exploded-page14.html"
      },
      {
        "page_number": 15,
        "chapter_title": "A Calling",
        "file": "exploded-page15.html",
        "url": "/exploded-page15.html"
      }
    ]
  }
}
```

### Poetry Object

```json
{
  "url": "/poetry.html",
  "sections": {
    "Haikus": [
      {
        "title": "The Final Moment",
        "file": "finalmoment.html",
        "url": "/finalmoment.html"
      },
      ...
    ],
    "Triplets": [...]
  }
}
```

---

## Usage Examples

### Fetch all books

```javascript
fetch('/books.json')
  .then(res => res.json())
  .then(data => {
    data.books.forEach(book => {
      console.log(`${book.title}: ${book.totalPages} pages`);
    });
  });
```

### Get a specific book

```javascript
fetch('/books.json')
  .then(res => res.json())
  .then(data => {
    const exploded = data.books.find(b => b.id === 'exploded');
    console.log(exploded.pages); // All pages in order
  });
```

### Get chapters in a book

```javascript
fetch('/books.json')
  .then(res => res.json())
  .then(data => {
    const book = data.books[0];
    Object.entries(book.chapters).forEach(([chapterTitle, pages]) => {
      console.log(`${chapterTitle}: ${pages.length} pages`);
    });
  });
```

### Get all poetry

```javascript
fetch('/books.json')
  .then(res => res.json())
  .then(data => {
    Object.entries(data.poetry.sections).forEach(([section, poems]) => {
      console.log(`${section}:`);
      poems.forEach(poem => {
        console.log(`  - ${poem.title}`);
      });
    });
  });
```

### Get a specific page

```javascript
fetch('/books.json')
  .then(res => res.json())
  .then(data => {
    const page = data.books[0].pages.find(p => p.page_number === 14);
    // Use page.url to fetch the content
    fetch(page.url)
      .then(res => res.text())
      .then(html => {
        // Parse the HTML to extract content
      });
  });
```

---

## Mobile App Integration

### Step 1: Fetch the catalog

```javascript
const catalog = await fetch('/books.json').then(r => r.json());
```

### Step 2: Display books/chapters

```javascript
catalog.books.forEach(book => {
  // Display book in UI
  // Show chapters or pages
});
```

### Step 3: Load individual pages

```javascript
const page = book.pages[0];
const pageContent = await fetch(page.url)
  .then(r => r.text());
```

### Step 4: Parse page content

The HTML pages contain structured content with these elements:
- `<h2 class="page-title">` - Page number
- `<h3 class="page-subtitle">` - Chapter title
- `<div class="page-content">` - Main content
- `<p>` - Paragraphs
- `<div class="dreamMemText">` - Special content sections
- `<div class="underline">` - Decorative elements

### Step 5: Cache for offline use

```javascript
// Store the catalog locally
localStorage.setItem('booksCache', JSON.stringify(catalog));

// Check freshness using lastUpdated
const cached = JSON.parse(localStorage.getItem('booksCache'));
if (cached && new Date(cached.lastUpdated) > new Date(yourLastSync)) {
  // Use cached version
}
```

---

## Auto-Update Process

The `books.json` file is **automatically regenerated** whenever:

1. **A new page is published** (via `/admin/generate-exploded` or `/admin/generate-pinnacle`)
2. **A new poem is published** (via `/admin/generate-poetry`)

The update process:
1. Your admin panel POSTs new content to the server
2. Server generates the HTML file (page or poem)
3. Server calls `save_books_json()`
4. `books.json` is rewritten with current state
5. Your mobile app can poll or use webhooks to detect changes

### Check for updates

```javascript
// Poll every 5 minutes
setInterval(async () => {
  const response = await fetch('/books.json');
  const newCatalog = await response.json();
  
  if (newCatalog.lastUpdated !== lastKnownUpdate) {
    // New content available!
    updateUI(newCatalog);
  }
}, 5 * 60 * 1000);
```

---

## Current Content

### Books
- **Exploded** (2 pages)
  - Chapter: "A Calling" (Pages 14-15)
- **The Pinnacle of Reality** (1 page)
  - Chapter: "Prologue: Shattered" (Page 1)

### Poetry
- **Haikus** (4 poems)
  - The Final Moment
  - Symbols of Nature
  - Unrestful Stillness
  - So Whispered the Wind
- **Triplets** (1 poem)
  - Rhythm of the Red River

---

## Server Implementation Details

### Generation Function

The `generate_books_json()` function in `server.py`:
- Scans `exploded-page*.html` and `pinnacle-page*.html` files
- Extracts page numbers and chapter titles from HTML headers
- Parses `poetry.html` for poetry sections and poems
- Creates the structured JSON object
- Includes an ISO 8601 timestamp

### Auto-save Location

Both `/generate_books_json.py` and `server.py` contain identical `generate_books_json()` and `save_books_json()` functions for consistency.

### Manual Regeneration

You can manually regenerate `books.json` by running:

```bash
python3 /workspaces/knowflux.github.io/generate_books_json.py
```

This is useful if you add files manually or want to refresh the catalog.

---

## Things to Note

1. **Books must follow naming conventions:**
   - `exploded-pageN.html` for Exploded book
   - `pinnacle-pageN.html` for Pinnacle book

2. **Page files must have:**
   - `<h2 class="page-title">Page N</h2>`
   - `<h3 class="page-subtitle">Chapter Title</h3>`

3. **Poetry must follow the structure:**
   - `<h2>Section Name</h2>` for sections
   - `<div class="poetry-flex-grid">` containing poems
   - `<a href="poemfile.html">` with nested `<h3>Poem Title</h3>`

4. **The JSON is regenerated on every publish**, so your mobile app should handle occasional stale reads gracefully.

---

## Troubleshooting

**Problem:** `books.json` doesn't include my new page

**Solution:** The page filename must follow the pattern: `exploded-pageN.html` or `pinnacle-page N.html`, and must contain the required HTML headers.

**Problem:** Poetry section appears empty

**Solution:** Ensure poems are in `<div class="poetry-flex-grid">` with proper `<a>` tags containing `<h3>` titles.

**Problem:** `lastUpdated` is old

**Solution:** Run the manual generation script or refresh by publishing new content.

---

## Future Enhancements

Consider adding to `books.json` for mobile use:
- Word count per page
- Reading time estimates
- Book/page metadata (author, publish date, etc.)
- Content preview (first 200 characters)
- CRC/hash for content verification
- Book cover image URLs
