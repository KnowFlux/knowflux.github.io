document.querySelectorAll('.home-book-card').forEach(card => {
  card.addEventListener('mouseenter', function(e) {
    const rect = this.getBoundingClientRect();
    
    // Map exact cursor coordinate intercept relative to card box
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Feed parameters straight into the CSS environment
    this.style.setProperty('--enter-x', `${x}px`);
    this.style.setProperty('--enter-y', `${y}px`);
    
    // Animate the liquid expansion
    this.classList.add('liquid-activated');
  });

  card.addEventListener('mouseleave', function() {
    // Flush the token state cleanly so it can flow from a new angle next time
    this.classList.remove('liquid-activated');
  });
});