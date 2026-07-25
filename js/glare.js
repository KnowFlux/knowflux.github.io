/**
 * Glass card glare effect
 * On mousemove, a soft radial highlight follows the cursor.
 * On mouseleave, the highlight fades out.
 */

document.addEventListener('DOMContentLoaded', function() {
  var cards = document.querySelectorAll('.feature, .home-book-card');

  cards.forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;   // mouse X relative to card
      var y = e.clientY - rect.top;    // mouse Y relative to card

      var percentX = (x / rect.width) * 100;
      var percentY = (y / rect.height) * 100;

      card.style.setProperty('--glare-x', percentX + '%');
      card.style.setProperty('--glare-y', percentY + '%');
    });

    card.addEventListener('mouseleave', function() {
      // Reset to center so the fade-out looks smooth
      card.style.setProperty('--glare-x', '50%');
      card.style.setProperty('--glare-y', '50%');
    });
  });
});