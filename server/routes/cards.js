/*
  cards.js (routes)
  -----------------
  Job: handle HTTP for /api/cards (GET, POST, PUT, DELETE).
  This file talks to Express (req/res) and calls card-store for disk work.
  It does NOT write files itself and does NOT send HTML.
*/

const express = require('express');
const cardStore = require('../lib/card-store');

const router = express.Router();

/**
 * Shared helper: front and back must be non-empty strings.
 * frontTitle, backSubtitle, and tags are optional.
 * Returns an error message string, or null if everything looks ok.
 */
function getValidationError(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body must be JSON with front and back.';
  }

  const front = body.front === undefined || body.front === null ? '' : String(body.front).trim();
  const back = body.back === undefined || body.back === null ? '' : String(body.back).trim();

  if (!front) {
    return 'front is required and cannot be empty.';
  }
  if (!back) {
    return 'back is required and cannot be empty.';
  }

  // tags, when sent, must be an array (empty array is fine).
  if (body.tags !== undefined && body.tags !== null && !Array.isArray(body.tags)) {
    return 'tags must be an array of strings.';
  }

  return null;
}

/** Pull the card fields we accept from the request body. */
function getCardInput(body) {
  return {
    frontTitle: body.frontTitle,
    front: body.front,
    back: body.back,
    backSubtitle: body.backSubtitle,
    tags: body.tags
  };
}

// GET /api/cards → list all cards
router.get('/', async function (req, res) {
  try {
    const cards = await cardStore.listCards();
    res.json(cards);
  } catch (err) {
    console.error('listCards failed:', err);
    res.status(500).json({ error: 'Could not list cards.' });
  }
});

// GET /api/cards/:id → one card
router.get('/:id', async function (req, res) {
  try {
    const card = await cardStore.getCard(req.params.id);
    if (!card) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }
    res.json(card);
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('getCard failed:', err);
    res.status(500).json({ error: 'Could not get card.' });
  }
});

// POST /api/cards → create a card
router.post('/', async function (req, res) {
  const validationError = getValidationError(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const card = await cardStore.createCard(getCardInput(req.body));
    // 201 means "created"
    res.status(201).json(card);
  } catch (err) {
    console.error('createCard failed:', err);
    res.status(500).json({ error: 'Could not create card.' });
  }
});

// PUT /api/cards/:id → update a card
router.put('/:id', async function (req, res) {
  const validationError = getValidationError(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const card = await cardStore.updateCard(req.params.id, getCardInput(req.body));

    if (!card) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }

    res.json(card);
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('updateCard failed:', err);
    res.status(500).json({ error: 'Could not update card.' });
  }
});

// DELETE /api/cards/:id → remove the file
router.delete('/:id', async function (req, res) {
  try {
    const deleted = await cardStore.deleteCard(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Card not found.' });
      return;
    }
    // 204 means "success, no body"
    res.status(204).send();
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('deleteCard failed:', err);
    res.status(500).json({ error: 'Could not delete card.' });
  }
});

module.exports = router;
