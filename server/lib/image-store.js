/*
  image-store.js
  --------------
  Job: save uploaded images under data/images/ and return a public URL path.
  Students send a data URL (base64) from the browser; we write a real file.
*/

const fs = require('fs').promises;
const path = require('path');
const { makeId } = require('./id');

const IMAGES_DIR = path.join(__dirname, '..', '..', 'data', 'images');

/**
 * Save a browser data URL like "data:image/png;base64,AAAA...".
 * Returns { url: "/data/images/img-....png" }.
 */
async function saveDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    const error = new Error('image dataUrl is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }

  // Regex: capture mime subtype (png/jpeg/...) and the base64 payload.
  const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    const error = new Error('image must be a data:image/...;base64 URL');
    error.code = 'INVALID_INPUT';
    throw error;
  }

  let ext = match[1].toLowerCase();
  if (ext === 'jpeg') {
    ext = 'jpg';
  }
  // Only allow simple extensions.
  if (!/^[a-z0-9]+$/.test(ext)) {
    const error = new Error('unsupported image type');
    error.code = 'INVALID_INPUT';
    throw error;
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const id = makeId('img');
  const filename = id + '.' + ext;
  const buffer = Buffer.from(match[2], 'base64');
  await fs.writeFile(path.join(IMAGES_DIR, filename), buffer);

  return { url: '/data/images/' + filename };
}

module.exports = {
  saveDataUrl: saveDataUrl,
  IMAGES_DIR: IMAGES_DIR
};
