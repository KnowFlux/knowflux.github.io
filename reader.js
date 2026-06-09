// reader.js — part 1
(function() {
  const params = new URLSearchParams(window.location.search);
  const book = params.get('book') || 'exploded';   // default to Exploded
  const pageNum = parseInt(params.get('page'), 10) || 1;

  console.log('Book:', book, 'Page:', pageNum);

  fetch('books.json')
    .then(function(response) {
      if (!response.ok) throw new Error('Failed to load books.json');
      return response.json();
    })
    .then(function(data) {
      window.__booksData = data; // share with script.js
      console.log('Loaded books:', data.books.length);
      // Step 3 goes here...
      // Find the book
      var bookData = data.books.find(function(b) {
        return b.id === book;
      });

      if (!bookData) {
        console.error('Book not found:', book);
        return;
      }

      // Find the page
      var page = bookData.pages.find(function(p) {
        return p.page_number === pageNum;
      });

      if (!page) {
        console.error('Page not found:', pageNum);
        return;
      }

      console.log('Found:', page.chapter_title);

      // Inject page title and subtitle
      var titleEl = document.querySelector('.page-title');
      var subtitleEl = document.querySelector('.page-subtitle');

      titleEl.textContent = 'Page ' + page.page_number;
      subtitleEl.textContent = page.chapter_title;

       var toast = document.getElementById('rdr-complete-toast');
       if (toast) {
        toast.textContent = page.chapter_title + ' \u2014 Complete!';
       }

      // Inject the content
      var contentDiv = document.getElementById('reader-content');
      contentDiv.innerHTML = page.content;

      // Update the browser tab title
      document.title = 'Page ' + page.page_number + ' | ' + bookData.title;

      // Build navigation
      var navDiv = document.querySelector('.page-footer-action');
      navDiv.innerHTML = '';

      // Previous button
      if (pageNum > 1) {
        var prevLink = document.createElement('a');
        prevLink.href = 'reader.html?book=' + book + '&page=' + (pageNum - 1);
        prevLink.className = 'comingSoonButton';
        prevLink.textContent = '⬅️';
        navDiv.appendChild(prevLink);
      }

      // Next button — always visible
      var nextLink = document.createElement('a');
      if (pageNum < bookData.pages.length) {
        nextLink.href = 'reader.html?book=' + book + '&page=' + (pageNum + 1);
        nextLink.textContent = '➡️';
      } else {
        nextLink.href = 'comingsoon.html';
        nextLink.textContent = 'COMING SOON!';
      }
      nextLink.className = 'comingSoonButton';
      navDiv.appendChild(nextLink);
    })
    .catch(function(error) {
      console.error(error);
    });
})();