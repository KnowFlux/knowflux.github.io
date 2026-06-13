
document.addEventListener('DOMContentLoaded', function() {
// ---------------------------------------------------------------------------
// Random Poem Redirect
// ---------------------------------------------------------------------------
const randomPoemBtn = document.getElementById('random-poem-btn');
if (randomPoemBtn) {
const poems = [
    'finalmoment.html',
    'symbolsofnature.html',
    'unrestfulstillness.html',
    'rhythmofthereriver.html'
];
randomPoemBtn.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = poems[Math.floor(Math.random() * poems.length)];
});
}

const randomBookBtn = document.getElementById('random-book-btn');
if (randomBookBtn) {
const books = [
    'reader.html?book=exploded&page=1',
    'reader.html?book=pinnacle&page=1'
];
randomBookBtn.addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = books[Math.floor(Math.random() * books.length)];
});
}
});