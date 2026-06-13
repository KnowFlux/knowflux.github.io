document.addEventListener('DOMContentLoaded', function() {
// ---------------------------------------------------------------------------
// Dynamic Copyright Year (CST)
// ---------------------------------------------------------------------------
const updateYear = () => {
const yearElement = document.getElementById('copyright-year');
if (yearElement) {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cstDate = new Date(utcTime + (3600000 * -6));
    yearElement.textContent = cstDate.getFullYear();
}
};
updateYear();



// ===============================================================
// Footer Reveal on Scroll — slides in when subscribe section is visible
// ===============================================================
(function() {
const footer = document.getElementById('footer');
const copyright = document.getElementById('copyright');
const subscribe = document.getElementById('subscribe');
if (!footer || !copyright || !subscribe) return;

let revealed = false;

function attemptReveal() {
    if (revealed) return;
    const subRect = subscribe.getBoundingClientRect();
    // Reveal when the bottom of the subscribe section enters the viewport
    if (subRect.bottom <= window.innerHeight + 20) {
    revealed = true;
    setTimeout(function() {
        footer.setAttribute('data-reveal', 'true');
        copyright.setAttribute('data-reveal', 'true');
        window.removeEventListener('scroll', scrollHandler);
    }, 500);
    }
}

function scrollHandler() {
    attemptReveal();
}

window.addEventListener('scroll', scrollHandler, { passive: true });
// Also check immediately in case user loads mid-page
attemptReveal();
})();
});
