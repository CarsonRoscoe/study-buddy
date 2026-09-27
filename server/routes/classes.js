/*
  classes.js (routes)
  -------------------
  Job: HTTP for /api/classes
*/

const express = require('express');
const classStore = require('../lib/class-store');
const cardsetStore = require('../lib/cardset-store');

const router = express.Router();

router.get('/', async function (req, res) {
  try {
    res.json(await classStore.listClasses());
  } catch (err) {
    console.error('listClasses failed:', err);
    res.status(500).json({ error: 'Could not list classes.' });
  }
});

// PUT /api/classes/order  body: { ids: ['class-…', …] }
router.put('/order', async function (req, res) {
  try {
    const ids = req.body && req.body.ids;
    res.json(await classStore.reorderClasses(ids));
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('reorderClasses failed:', err);
    res.status(500).json({ error: 'Could not reorder classes.' });
  }
});

router.get('/:id', async function (req, res) {
  try {
    const classObj = await classStore.getClass(req.params.id);
    if (!classObj) {
      res.status(404).json({ error: 'Class not found.' });
      return;
    }
    res.json(classObj);
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('getClass failed:', err);
    res.status(500).json({ error: 'Could not get class.' });
  }
});

router.post('/', async function (req, res) {
  try {
    const classObj = await classStore.createClass(req.body || {});
    res.status(201).json(classObj);
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('createClass failed:', err);
    res.status(500).json({ error: 'Could not create class.' });
  }
});

router.put('/:id', async function (req, res) {
  try {
    const classObj = await classStore.updateClass(req.params.id, req.body || {});
    if (!classObj) {
      res.status(404).json({ error: 'Class not found.' });
      return;
    }
    res.json(classObj);
  } catch (err) {
    if (err.code === 'INVALID_INPUT' || err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('updateClass failed:', err);
    res.status(500).json({ error: 'Could not update class.' });
  }
});

router.delete('/:id', async function (req, res) {
  try {
    const deleted = await classStore.deleteClass(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Class not found.' });
      return;
    }
    await cardsetStore.deleteCardsetsInClass(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('deleteClass failed:', err);
    res.status(500).json({ error: 'Could not delete class.' });
  }
});

module.exports = router;
