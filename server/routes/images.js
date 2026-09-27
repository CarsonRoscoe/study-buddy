/*
  images.js (routes)
  ------------------
  Job: accept a base64 data URL and save it under data/images/.
*/

const express = require('express');
const imageStore = require('../lib/image-store');

const router = express.Router();

router.post('/', async function (req, res) {
  try {
    const result = await imageStore.saveDataUrl(req.body && req.body.dataUrl);
    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'INVALID_INPUT') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('save image failed:', err);
    res.status(500).json({ error: 'Could not save image.' });
  }
});

module.exports = router;
