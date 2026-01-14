// Script file for KnowFlux

// Promo message cycling
document.addEventListener('DOMContentLoaded', function() {
  const promoElement = document.getElementById('promo');
  const promoMessages = promoElement.querySelectorAll('div');
  let currentIndex = 0;

  // Cycle through promo messages every 5 seconds
  setInterval(function() {
    // Hide current message
    promoMessages[currentIndex].style.display = 'none';

    // Move to next message
    currentIndex = (currentIndex + 1) % promoMessages.length;

    // Show next message
    promoMessages[currentIndex].style.display = 'block';
  }, 5000); // 5000 milliseconds = 5 seconds

  // Smart Reveal Header
  const nav = document.getElementById('topMenu');
  const promo = document.getElementById('promo');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (window.scrollY > lastScrollY && window.scrollY > 100) {
      // Scrolling down
      nav.classList.add('nav-hidden');
      promo.classList.add('nav-hidden');
    } else {
      // Scrolling up
      nav.classList.remove('nav-hidden');
      promo.classList.remove('nav-hidden');
    }
    lastScrollY = window.scrollY;
  });

  // Dynamic Copyright Year (CST)
  const updateYear = () => {
    const yearElement = document.getElementById('copyright-year');
    if (yearElement) {
      // Get current UTC time and adjust for CST (UTC-6)
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const cstOffset = -6;
      const cstDate = new Date(utcTime + (3600000 * cstOffset));
      yearElement.textContent = cstDate.getFullYear();
    }
  };
  updateYear();

  // Scroll Progress Tracking for Page 1
  const progressBar = document.getElementById('scroll-progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.height = scrolled + "%";
    });
  }

  // Mobile Submenu Double-Tap Logic
  const readLink = document.getElementById('read-link');
  let clickCount = 0;

  if (readLink) {
    readLink.addEventListener('click', function(e) {
      // Check if we are on a touch device or small screen
      if (window.innerWidth <= 1024) { 
        if (clickCount === 0) {
          e.preventDefault(); // Stop the first click from redirecting
          const parentLi = this.parentElement;
          parentLi.classList.toggle('submenu-active');
          clickCount++;
          
          // Reset click count if they click elsewhere
          setTimeout(() => {
            // We don't reset immediately to allow the second click
          }, 300);
        } else {
          // Second click: let the natural link behavior happen
          clickCount = 0; 
        }
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!readLink.contains(e.target)) {
        readLink.parentElement.classList.remove('submenu-active');
        clickCount = 0;
      }
    });
  }
});
