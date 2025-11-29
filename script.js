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
});
