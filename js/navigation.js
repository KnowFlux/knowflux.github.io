document.addEventListener('DOMContentLoaded', function() {
// ---------------------------------------------------------------------------
// Promo message cycling
// ---------------------------------------------------------------------------
const promoElement = document.getElementById('promo');
const promoMessages = promoElement.querySelectorAll('div');
let currentIndex = 0;

setInterval(function() {
promoMessages[currentIndex].style.display = 'none';
currentIndex = (currentIndex + 1) % promoMessages.length;
promoMessages[currentIndex].style.display = 'block';
}, 5000);

// ---------------------------------------------------------------------------
// Smart Reveal Header (hide on scroll down, show on scroll up)
// ---------------------------------------------------------------------------
const nav = document.getElementById('topMenu');
const promo = document.getElementById('promo');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
if (window.scrollY > lastScrollY && window.scrollY > 100) {
    nav.classList.add('nav-hidden');
    promo.classList.add('nav-hidden');
} else {
    nav.classList.remove('nav-hidden');
    promo.classList.remove('nav-hidden');
}
lastScrollY = window.scrollY;
});

// ---------------------------------------------------------------------------
// Desktop: Click-to-open navigation for cleaner menu interaction
// ---------------------------------------------------------------------------
function setupClickToOpenMenu() {
if (window.innerWidth <= 600) return;

// Add click handlers to all menu items with submenus
document.querySelectorAll('#topLinks li.has-submenu').forEach(li => {
    const link = li.querySelector(':scope > a');
    if (!link) return;
    
    link.addEventListener('click', function(e) {
    // Prevent navigation if this is just a menu toggle
    if (this.getAttribute('href') === '#') {
        e.preventDefault();
    }
    
    // Stop propagation to prevent triggering the document-level close handler
    e.stopPropagation();
    
    // Toggle this submenu
    li.classList.toggle('submenu-active');
    
    // Close other open submenus at the same level
    li.parentNode.querySelectorAll(':scope > li.has-submenu').forEach(otherLi => {
        if (otherLi !== li && !otherLi.contains(li)) {
        otherLi.classList.remove('submenu-active');
        }
    });
    });
});

// Close submenus when clicking outside the menu
document.addEventListener('click', function(e) {
    if (!e.target.closest('#topLinks')) {
    document.querySelectorAll('#topLinks li.has-submenu').forEach(li => {
        li.classList.remove('submenu-active');
    });
    }
});

// Close submenu when clicking on a navigation link (not a submenu toggle)
document.querySelectorAll('#topLinks li ul a').forEach(link => {
    link.addEventListener('click', function() {
    // Only close if this is NOT a submenu toggle link (href="#")
    if (this.getAttribute('href') !== '#') {
        setTimeout(() => {
        document.querySelectorAll('#topLinks li.has-submenu').forEach(li => {
            li.classList.remove('submenu-active');
        });
        }, 100);
    }
    });
});

// Fix submenu overflow (position left if goes off-screen)
function adjustSubmenuPosition() {
    document.querySelectorAll('#topLinks li.has-submenu.submenu-active > ul').forEach(subUl => {
    subUl.classList.remove('flip-left');
    const rect = subUl.getBoundingClientRect();
    if (rect.right > window.innerWidth - 50) {
        subUl.classList.add('flip-left');
    }
    });
}

document.addEventListener('click', adjustSubmenuPosition);
}
setupClickToOpenMenu();

// ---------------------------------------------------------------------------
// Mobile Nav Overlay System
// ---------------------------------------------------------------------------
const isMobile = () => window.innerWidth <= 768;

// Build a tree of nav items from the existing #topLinks ul
function extractNavItems(ul) {
const items = [];
if (!ul) return items;
ul.querySelectorAll(':scope > li').forEach(li => {
    const a = li.querySelector(':scope > a');
    const subUl = li.querySelector(':scope > ul');
    if (!a) return;
    items.push({
    text: a.textContent.trim(),
    href: a.getAttribute('href'),
    children: subUl ? extractNavItems(subUl) : []
    });
});
return items;
}

const navUl = document.querySelector('#topLinks > ul');
const navTree = extractNavItems(navUl);

// Build the overlay DOM once
const overlay = document.createElement('div');
overlay.id = 'mnav-overlay';
overlay.setAttribute('aria-hidden', 'true');
document.body.appendChild(overlay);

const panelContainer = document.createElement('div');
panelContainer.id = 'mnav-panels';
overlay.appendChild(panelContainer);

let panelStack = [];

function closeMobileNav() {
overlay.classList.remove('open');
overlay.setAttribute('aria-hidden', 'true');
document.body.style.overflow = '';
// Clear panels after transition
setTimeout(() => {
    panelContainer.innerHTML = '';
    panelStack = [];
}, 320);
}

// Tap the dark backdrop to close
overlay.addEventListener('click', function(e) {
if (e.target === overlay) closeMobileNav();
});

function showPanel(items, title) {
// Slide current panel left
if (panelStack.length > 0) {
    const cur = panelStack[panelStack.length - 1];
    cur.classList.remove('mnav-active');
    cur.classList.add('mnav-out');
}

const panel = buildPanel(items, title, panelStack.length === 0);
panelContainer.appendChild(panel);
panelStack.push(panel);

// Trigger slide-in animation
requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.classList.add('mnav-active');
}));
}

function goBack() {
if (panelStack.length <= 1) {
    closeMobileNav();
    return;
}
const dying = panelStack.pop();
dying.classList.remove('mnav-active');
dying.classList.add('mnav-exit');

const prev = panelStack[panelStack.length - 1];
prev.classList.remove('mnav-out');
prev.classList.add('mnav-active');

setTimeout(() => {
    if (dying.parentNode) dying.parentNode.removeChild(dying);
}, 320);
}

function buildPanel(items, title, isRoot) {
const panel = document.createElement('div');
panel.className = 'mnav-panel';

// Header
const header = document.createElement('div');
header.className = 'mnav-header';

const actionBtn = document.createElement('button');
actionBtn.className = 'mnav-action-btn';
if (isRoot) {
    actionBtn.innerHTML = '&#x2715;'; // ✕
    actionBtn.setAttribute('aria-label', 'Close menu');
    actionBtn.addEventListener('click', closeMobileNav);
} else {
    actionBtn.innerHTML = '&#x2190; Back'; // ← Back
    actionBtn.setAttribute('aria-label', 'Back');
    actionBtn.addEventListener('click', goBack);
}
header.appendChild(actionBtn);

if (title) {
    const titleEl = document.createElement('span');
    titleEl.className = 'mnav-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);
}

panel.appendChild(header);

// Items list
const ul = document.createElement('ul');
ul.className = 'mnav-list';

items.forEach(item => {
    const li = document.createElement('li');

    if (item.children.length > 0) {
    // Has sub-items — show as a button that opens the next panel
    const btn = document.createElement('button');
    btn.className = 'mnav-item mnav-has-children';
    const label = document.createElement('span');
    label.textContent = item.text;
    const arrow = document.createElement('span');
    arrow.className = 'mnav-arrow';
    arrow.innerHTML = '›';
    btn.appendChild(label);
    btn.appendChild(arrow);
    btn.addEventListener('click', () => showPanel(item.children, item.text));
    li.appendChild(btn);
    } else {
    // Leaf — navigate directly
    const a = document.createElement('a');
    a.className = 'mnav-item';
    a.href = item.href;
    a.textContent = item.text;
    a.addEventListener('click', closeMobileNav);
    li.appendChild(a);
    }

    ul.appendChild(li);
});

panel.appendChild(ul);
return panel;
}

// Add hamburger button to the nav bar
const topMenuWrap = document.querySelector('#topMenu .wrap');
if (topMenuWrap) {
const hamburger = document.createElement('button');
hamburger.id = 'mnav-hamburger';
hamburger.setAttribute('aria-label', 'Open menu');
hamburger.innerHTML = '<span></span><span></span><span></span>';
topMenuWrap.appendChild(hamburger);

hamburger.addEventListener('click', function() {
    if (!isMobile()) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Show ALL top-level nav items as the first panel
    showPanel(navTree, null);
});
}
});



