/**
 * Galaxy Navigation Module
 * Shared navigation bar for all pages in the Galaxy simulation project.
 *
 * Usage:
 *   import { initNavigation } from './js/nav.js';
 *   initNavigation();
 */

const NAV_PAGES = [
    { id: 'portal',    icon: '\uD83C\uDF0C', label: 'Portal',      href: 'portal.html'         },
    { id: 'milkyway',  icon: '\uD83C\uDF00', label: 'Milky Way',   href: 'index.html'          },
    { id: 'nebulae',   icon: '\uD83C\uDF08', label: 'Nebulae',     href: 'nebula.html'         },
    { id: 'evolution', icon: '\uD83D\uDCA5', label: 'Evolution',   href: 'evolution.html'      },
    { id: 'gravity',   icon: '\u269B\uFE0F', label: 'Gravity',     href: 'gravity.html'        },
    { id: 'scale',     icon: '\uD83D\uDD2C', label: 'Scale',       href: 'universe_scale.html' },
];

// Map filenames to page IDs for active detection
const FILE_TO_ID = {
    'portal.html':         'portal',
    'index.html':          'milkyway',
    'nebula.html':         'nebulae',
    'evolution.html':      'evolution',
    'gravity.html':        'gravity',
    'universe_scale.html': 'scale',
    'milky_way_simulation.html': 'milkyway',
};

const AUTO_HIDE_DELAY = 3000;  // ms before nav auto-hides

/**
 * Detect the current page ID from the URL pathname.
 */
function detectCurrentPage() {
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    return FILE_TO_ID[filename] || 'portal';
}

/**
 * Build and inject the navigation HTML into the document body.
 */
function buildNav(currentPageId) {
    // Create the hover trigger zone
    const trigger = document.createElement('div');
    trigger.className = 'galaxy-nav-trigger';
    trigger.setAttribute('aria-hidden', 'true');

    // Create the nav element
    const nav = document.createElement('nav');
    nav.className = 'galaxy-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Site navigation');

    // --- Desktop links ---
    const linksContainer = document.createElement('div');
    linksContainer.className = 'galaxy-nav__links';

    NAV_PAGES.forEach((page, i) => {
        if (i > 0 && (i === 3)) {
            // Divider between groups: [Portal, MilkyWay, Nebulae] | [Evolution, Gravity, Scale]
            const divider = document.createElement('span');
            divider.className = 'galaxy-nav__divider';
            divider.setAttribute('aria-hidden', 'true');
            linksContainer.appendChild(divider);
        }

        const link = document.createElement('a');
        link.className = 'galaxy-nav__link';
        link.href = page.href;
        if (page.id === currentPageId) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }

        link.innerHTML = `
            <span class="galaxy-nav__icon" aria-hidden="true">${page.icon}</span>
            <span class="galaxy-nav__label">${page.label}</span>
        `;

        link.setAttribute('title', page.label);
        linksContainer.appendChild(link);
    });

    nav.appendChild(linksContainer);

    // --- Hamburger button (mobile) ---
    const hamburger = document.createElement('button');
    hamburger.className = 'galaxy-nav__hamburger';
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = `
        <span class="galaxy-nav__hamburger-line"></span>
        <span class="galaxy-nav__hamburger-line"></span>
        <span class="galaxy-nav__hamburger-line"></span>
    `;
    nav.appendChild(hamburger);

    // --- Brand (mobile) ---
    const brand = document.createElement('div');
    brand.className = 'galaxy-nav__brand';
    const activePage = NAV_PAGES.find(p => p.id === currentPageId);
    brand.innerHTML = `
        <span class="galaxy-nav__brand-icon" aria-hidden="true">${activePage ? activePage.icon : '\uD83C\uDF0C'}</span>
        <span>${activePage ? activePage.label : 'Galaxy'}</span>
    `;
    nav.appendChild(brand);

    // --- Mobile dropdown ---
    const dropdown = document.createElement('div');
    dropdown.className = 'galaxy-nav__dropdown';
    dropdown.setAttribute('role', 'menu');

    NAV_PAGES.forEach(page => {
        const link = document.createElement('a');
        link.className = 'galaxy-nav__link';
        link.href = page.href;
        link.setAttribute('role', 'menuitem');
        if (page.id === currentPageId) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }

        link.innerHTML = `
            <span class="galaxy-nav__icon" aria-hidden="true">${page.icon}</span>
            <span class="galaxy-nav__label">${page.label}</span>
        `;

        dropdown.appendChild(link);
    });

    nav.appendChild(dropdown);

    // Insert into document
    document.body.prepend(trigger);
    document.body.prepend(nav);

    return { nav, trigger, hamburger, dropdown };
}

/**
 * Setup auto-hide behavior: nav hides after `delay` ms of no mouse
 * movement near the top of the viewport, reappears on hover near top edge.
 */
function setupAutoHide(nav, trigger, delay) {
    let hideTimeout = null;
    let isNearTop = true;

    function showNav() {
        nav.classList.remove('nav-hidden');
        resetTimer();
    }

    function hideNav() {
        // Don't hide if dropdown is open
        if (nav.querySelector('.galaxy-nav__dropdown.open')) return;
        nav.classList.add('nav-hidden');
    }

    function resetTimer() {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hideNav, delay);
    }

    // Mouse move near top
    function onMouseMove(e) {
        if (e.clientY < 70) {
            if (!isNearTop) {
                isNearTop = true;
                showNav();
            }
            resetTimer();
        } else {
            isNearTop = false;
        }
    }

    // Hovering the nav itself keeps it visible
    nav.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        nav.classList.remove('nav-hidden');
    });

    nav.addEventListener('mouseleave', () => {
        resetTimer();
    });

    // Trigger zone
    trigger.addEventListener('mouseenter', () => {
        showNav();
    });

    document.addEventListener('mousemove', onMouseMove, { passive: true });

    // Touch: show on tap near top, and hide on scroll
    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if (touch && touch.clientY < 70) {
            showNav();
        }
    }, { passive: true });

    // Start the timer
    resetTimer();
}

/**
 * Setup hamburger menu toggle for mobile.
 */
function setupHamburger(hamburger, dropdown) {
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');

        if (isOpen) {
            dropdown.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        } else {
            dropdown.classList.add('open');
            hamburger.classList.add('open');
            hamburger.setAttribute('aria-expanded', 'true');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !hamburger.contains(e.target)) {
            dropdown.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}

/**
 * Initialize the navigation bar. Call this from any page.
 * @param {Object} [options]
 * @param {number} [options.autoHideDelay=3000] - Milliseconds before auto-hiding
 * @param {string} [options.activePage] - Override current page detection (page id)
 */
export function initNavigation(options = {}) {
    const delay = options.autoHideDelay || AUTO_HIDE_DELAY;
    const currentPageId = options.activePage || detectCurrentPage();

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(currentPageId, delay));
    } else {
        init(currentPageId, delay);
    }
}

function init(currentPageId, delay) {
    // Avoid double-init
    if (document.querySelector('.galaxy-nav')) return;

    const { nav, trigger, hamburger, dropdown } = buildNav(currentPageId);
    setupAutoHide(nav, trigger, delay);
    setupHamburger(hamburger, dropdown);
}

export default initNavigation;
