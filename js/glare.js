document.querySelectorAll('.home-book-card').forEach(card => {
  card.addEventListener('mouseenter', function(e) {
    const rect = this.getBoundingClientRect();
    
    // Calculate exact entry position relative to the card's box
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Pass coordinates smoothly to CSS variables
    this.style.setProperty('--enter-x', `${x}px`);
    this.style.setProperty('--enter-y', `${y}px`);
    
    // Trigger the scale animation
    this.classList.add('mouse-entered');
  });

  card.addEventListener('mouseleave', function() {
    // Reset state cleanly so it can re-trigger on the next entry point
    this.classList.remove('mouse-entered');
  });
});