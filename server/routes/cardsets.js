/*
  cardsets.js (routes)
  --------------------
  Job: HTTP for /api/cardsets
*/

const express = require('express');
const cardsetStore = require('../lib/cardset-store');

const router = express.Router();

router.get('/', async function (req, res) {
  try {
    let cardsets = await cardsetStore.listCardsets();
    if (req.query.classId) {
      const classId = String(req.query.classId);
      cardsets = cardsets.filter(function (set) {
        return set.classId === classId;
      });
    }
    res.json(cardsets);
  } catch (err) {
    console.error('listCardsets failed:', err);
    res.status(500).json({ error: 'Could not list cardsets.' });
  }
});

// PUT /api/cardsets/order  body: { ids: ['cardset-…', …] }
router.put('/order', async function (req, res) {
  try {
    const ids = req.body && req.body.ids;
    res.json(await cardsetStore.reorderCardsets(ids));
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('reorderCardsets failed:', err);
    res.status(500).json({ error: 'Could not reorder cardsets.' });
  }
});

router.get('/:id', async function (req, res) {
  try {
    const cardset = await cardsetStore.getCardset(req.params.id);
    if (!cardset) {
      res.status(404).json({ error: 'Cardset not found.' });
      return;
    }
    res.json(cardset);
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('getCardset failed:', err);
    res.status(500).json({ error: 'Could not get cardset.' });
  }
});

router.post('/', async function (req, res) {
  try {
    const cardset = await cardsetStore.createCardset(req.body || {});
    res.status(201).json(cardset);
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('createCardset failed:', err);
    res.status(500).json({ error: 'Could not create cardset.' });
  }
});

router.put('/:id', async function (req, res) {
  try {
    const cardset = await cardsetStore.updateCardset(
      req.params.id,
      req.body || {}
    );
    if (!cardset) {
      res.status(404).json({ error: 'Cardset not found.' });
      return;
    }
    res.json(cardset);
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('updateCardset failed:', err);
    res.status(500).json({ error: 'Could not update cardset.' });
  }
});

// PATCH /api/cardsets/:id/move  body: { classId: string|null }
router.patch('/:id/move', async function (req, res) {
  try {
    const classId =
      req.body && req.body.classId ? String(req.body.classId).trim() : '';
    if (!classId) {
      res.status(400).json({ error: 'classId is required.' });
      return;
    }
    const cardset = await cardsetStore.moveCardset(req.params.id, classId);
    if (!cardset) {
      res.status(404).json({ error: 'Cardset not found.' });
      return;
    }
    res.json(cardset);
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('moveCardset failed:', err);
    res.status(500).json({ error: 'Could not move cardset.' });
  }
});

router.delete('/:id', async function (req, res) {
  try {
    const deleted = await cardsetStore.deleteCardset(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Cardset not found.' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('deleteCardset failed:', err);
    res.status(500).json({ error: 'Could not delete cardset.' });
  }
});

// POST /api/cardsets/:id/cards — append one card to the set
router.post('/:id/cards', async function (req, res) {
  try {
    const result = await cardsetStore.appendCard(req.params.id, req.body || {});
    if (!result) {
      res.status(404).json({ error: 'Cardset not found.' });
      return;
    }
    res.status(201).json(result.card);
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('appendCard failed:', err);
    res.status(500).json({ error: 'Could not add card to cardset.' });
  }
});

module.exports = router;
