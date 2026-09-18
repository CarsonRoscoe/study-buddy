/*
  server.js
  ---------
  Job: start the Express app (the "front door" of the Node process).

  Beginner mental model:
  - Express is a library that listens for HTTP requests on a port.
  - Static files (HTML/CSS/JS) are served from website/.
  - API routes under /api/cards and /api/quizzes talk to JSON files on disk.

  Keep this file short. File read/write details belong in lib/*-store.js.
  HTTP method details belong in routes/*.js.
*/

const path = require('path');
const express = require('express');
const cardsRouter = require('./routes/cards');
const quizzesRouter = require('./routes/quizzes');

const app = express();
const PORT = 3000;

// Let Express parse JSON bodies from fetch/POST requests.
app.use(express.json());

// Serve HTML, CSS, JS, and assets from the website folder.
// Example: /cards.html → website/cards.html
const websitePath = path.join(__dirname, '..', 'website');
app.use(express.static(websitePath));

// Card API
app.use('/api/cards', cardsRouter);

// Quiz history API
app.use('/api/quizzes', quizzesRouter);

app.listen(PORT, function () {
  console.log('Study Buddy is running!');
  console.log('Open http://localhost:' + PORT + ' in your browser.');
});
