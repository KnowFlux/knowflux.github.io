# Today's Plan
Edit the structure of the navigation menu and possibly other places to clean up and improve navigation. 

# Ideas

## Option 1
Rewrite nav structure to hold three links: Open, Books, Poetry, and Search. Open opens a submenu with options to open Exploded or the Pinnacle of Reality. Books leads to the aboutbook.html page, where I add links to pages and chapters of the books. Finally, Poetry leads to the poetry page, and search leads to the search page. 

### Implementation Steps
1. Delete all extra ul or li  options. 
2. Rewrite nav structure.
3. Add flexbox layout to div class = "action" to fit multiple buttons. 
4. Center items. 
5. Add ample padding to allow for action expansion. Make sure to use #ff3c00 as this is a C2A according to new design scheme [Here.](/KnowFlux%20Summer%20Updates/day1notes.md)

**Difficulty:** Easy

## Option 2
Rewrite nav structure to be identical as in Option 1, but instead of a separate page for pages and chapters, combine into one "contents" page, including both pages and chapters for a said book with chapters first. 

### Implementation Steps
1. Delete all extra ul or li options. 
2. Recreate nav structure.
3. Add flexbox layout to div class = "action" to fit more than one button. 
4. Center items.
5. Add ample padding, use #ff3c00 as mentioned [Here.](/KnowFlux%20Summer%20Updates/day1notes.md)

**Difficulty:** Easy

## Option 3
Rewrite nav structure in a very intentional way. Have "Books" "Open" "Poetry" and "Search". Everything leads to the exact same thing as in Options 1 & 2, however, "Open" has another option: "Contents". This contents page is different: it combines the contents of both books into one page, by having a selector on top as in [Here.](/admin.html)

### Implementation Steps
1. Completely overwrite nav structure. 
2. Create [contents.html](/contents.html)
3. Write HTML, CSS, and JS for the page.

**Difficulty:** Intermediate/Hard

# Chosen Option: Option 3

## More Detailed Structure
**Step 1** Create contents.html 


**Step 2** For tab selector: Use existing [admin.html](/admin.html) 
selectors, styles, and scripts


**Step 3** For each book pane: Use existing [admin.html](/admin.html) classes and id's


**Step 4** For book chapter dropdowns: Use existing [sowhisperedthewind.html](/sowhisperedthewind.html) dropdowns


**Step 5** For pages within chapters: Use basic HTML unordered list strucutre


**Step 6** For unordered list styling: Use AI as a mentor


**Step 7** Update all HTML nav structures
