# KnowFlux

Where Dreams Take Flight and Stories Bloom.

Visit the live site at [knowflux.ink](https://knowflux.ink).

## Overview

KnowFlux is a creatively designed, static website dedicated to creative writing, poetry, and literary exploration. Built with a unique "Nintendo-style" aesthetic—featuring sharp borders, bold shadows, and a punchy color palette—the platform serves as a modern landing page and directory for a collection of prose and poetry.

## Design Philosophy

The site embraces a retro-modern aesthetic:
- **Typography**: Uses `Anton` for striking headings and `Open Sans` for readable body text.
- **Color Palette**: 
  - **KnowFlux Blue**: `#4392F1` (Primary interaction color)
  - **KnowFlux Orange**: `#F46036` (Accents and secondary branding)
- **UI Elements**: Hard-edged shadows (`box-shadow: 6px 6px 0px #000`), sharp borders, and responsive layouts that avoid traditional hamburger menus in favor of intuitive navigation.

## Features

- **Dynamic Content Showcase**: A specialized "Read" section with interactive book summaries and chapter navigation.
- **Poetry Grid**: A flexible, responsive grid system for browsing haikus, triplets, and other poetic forms.
- **Random Poem Discovery**: A specialized "Read Poetry" feature that intelligently selects a random piece from the collection to inspire readers.
- **Smart Progress Tracking**: A custom vertical progress bar (on specific long-form pages) that tracks reading progress with a soft blue glow.
- **Static Search**: Powered by Pagefind for lightning-fast, privacy-conscious searching across all content.
- **Countdown System**: An automated weekly release countdown timer for upcoming content releases.
- **Mobile Optimized**: Fully responsive design using modern CSS (`clamp`, `svh` units) to ensure a stable and beautiful experience across all devices.

## Project Structure

```text
KnowFlux/
├── index.html          # Homepage
├── read.html           # Main reading directory
├── pages.html          # List of all pages
├── chapters.html       # Chapter-by-chapter navigation
├── poetry.html         # Poetry collection grid
├── comingsoon.html     # Weekly content countdown
├── feedback.html       # Reader feedback form
├── search.html         # Pagefind-powered search interface
├── style.css           # Global Nintendo-style design system
├── script.js           # Interactive UI logic (cycling promos, randomizer, progress tracking)
└── Images/             # High-quality book covers and UI assets
```

## Technical Implementation

- **No Frameworks**: Pure HTML5, CSS3, and Vanilla JavaScript.
- **Zero Dependencies**: Aside from Google Fonts and the Pagefind index, the site is entirely self-contained for maximum performance and portability.
- **Deployment**: Hosted as a static site, optimized for modern browsers with built-in cache-busting mechanisms.



---
© 2026 KnowFlux. All rights reserved.
