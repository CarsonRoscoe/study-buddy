/*
  server.js
  ---------
  Job: Express app — static website/, /api routes, image files from data/images/.
*/

const path = require('path');
const express = require('express');
const classesRouter = require('./routes/classes');
const cardsetsRouter = require('./routes/cardsets');
const imagesRouter = require('./routes/images');

const app = express();
const PORT = 3000;

// Base64 image uploads need a larger JSON body limit than Express default.
app.use(express.json({ limit: '8mb' }));

const websitePath = path.join(__dirname, '..', 'website');
app.use(express.static(websitePath));

app.get('/settings.html', function (req, res) {
  res.redirect(302, '/index.html');
});

const imagesPath = path.join(__dirname, '..', 'data', 'images');
app.use('/data/images', express.static(imagesPath));

app.use('/api/classes', classesRouter);
app.use('/api/cardsets', cardsetsRouter);
app.use('/api/images', imagesRouter);

app.listen(PORT, function () {
  console.log('Study Buddy is running!');
  console.log('Open http://localhost:' + PORT + ' in your browser.');
});
