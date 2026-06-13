#!/usr/bin/env python3
"""Concatenate JS modules into js/bundle.js and root script.js for backward compat."""
import os
from config import ROOT_DIR

JS_MODULES = [
    ROOT_DIR / 'js/reader.js',
    ROOT_DIR / 'js/navigation.js',
    ROOT_DIR / 'js/reading.js',
    ROOT_DIR / 'js/bookmarks.js',
    ROOT_DIR / 'js/footer.js',
    ROOT_DIR / 'js/random.js',
    ROOT_DIR / 'js/main.js',
]

BUNDLE = ROOT_DIR / 'js/bundle.js'
FALLBACK = ROOT_DIR / 'script.js'

def build():
    combined = []
    for path in JS_MODULES:
        if not os.path.exists(path):
            print(f'WARNING: {path} not found — skipping')
            continue
        with open(path) as f:
            combined.append(f'// ── {path} ──\n')
            combined.append(f.read().strip())
            combined.append('\n\n')

    output = ''.join(combined)

    # Write to both locations during transition
    with open(BUNDLE, 'w') as f:
        f.write(output)
    with open(FALLBACK, 'w') as f:
        f.write(output)

    total_lines = len(output.splitlines())
    print(f'Built {BUNDLE} and {FALLBACK} ({total_lines} lines) from {len(JS_MODULES)} modules.')

if __name__ == '__main__':
    build()