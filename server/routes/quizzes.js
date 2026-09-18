/*
  quizzes.js (routes)
  -------------------
  Job: handle HTTP for /api/quizzes (GET, POST, DELETE).
  Talks to Express (req/res) and calls quiz-store for disk work.
*/

const express = require('express');
const quizStore = require('../lib/quiz-store');

const router = express.Router();

// GET /api/quizzes → list all saved quizzes (newest first)
router.get('/', async function (req, res) {
  try {
    const quizzes = await quizStore.listQuizzes();
    res.json(quizzes);
  } catch (err) {
    console.error('listQuizzes failed:', err);
    res.status(500).json({ error: 'Could not list quizzes.' });
  }
});

// GET /api/quizzes/:id → one quiz
router.get('/:id', async function (req, res) {
  try {
    const quiz = await quizStore.getQuiz(req.params.id);
    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }
    res.json(quiz);
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('getQuiz failed:', err);
    res.status(500).json({ error: 'Could not get quiz.' });
  }
});

// POST /api/quizzes → save a finished quiz
router.post('/', async function (req, res) {
  try {
    const quiz = await quizStore.createQuiz({
      selectedTags: req.body && req.body.selectedTags,
      items: req.body && req.body.items
    });
    res.status(201).json(quiz);
  } catch (err) {
    if (err.code === 'INVALID_ITEMS') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('createQuiz failed:', err);
    res.status(500).json({ error: 'Could not save quiz.' });
  }
});

// DELETE /api/quizzes/:id → remove one history file
router.delete('/:id', async function (req, res) {
  try {
    const deleted = await quizStore.deleteQuiz(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('deleteQuiz failed:', err);
    res.status(500).json({ error: 'Could not delete quiz.' });
  }
});

module.exports = router;
