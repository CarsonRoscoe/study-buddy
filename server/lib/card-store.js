/*
  card-store.js
  -------------
  Job: read and write flashcard JSON files under data/cards/.
  This file does NOT know about Express (no req/res).
  Routes call these functions; these functions only touch the disk.

  Card shape saved on disk:
  {
    id,           // also used as the filename (card-<timestamp>)
    frontTitle,   // short label on the front (can be "")
    front,        // main front text (required)
    back,         // main back text (required)
    backSubtitle, // short label on the back (can be "")
    createdAt,    // ISO date string
    updatedAt,    // ISO date string
    tags          // array of strings (default [])
  }
*/

const fs = require('fs').promises;
const path = require('path');

// Absolute path to the shared cards folder (two levels up from server/lib/).
const CARDS_DIR = path.join(__dirname, '..', '..', 'data', 'cards');

/**
 * Build a simple unique id students can see in the filename.
 * Example: card-1726612345678
 * Date.now() is milliseconds since 1970 — unique enough for one student creating
 * cards one at a time (two creates will not share the same millisecond).
 */
function makeCardId() {
  return `card-${Date.now()}`;
}

/**
 * Turn whatever the client sent for tags into a clean string array.
 * Empty / missing → [].
 */
function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const cleaned = [];
  for (let i = 0; i < tags.length; i++) {
    const tag = String(tags[i]).trim();
    if (tag) {
      cleaned.push(tag);
    }
  }
  return cleaned;
}

/**
 * Build the fields we store from a create/update request body.
 * Does not include id / createdAt (those are set by create/update).
 */
function buildCardFields(input) {
  return {
    frontTitle: input.frontTitle === undefined || input.frontTitle === null
      ? ''
      : String(input.frontTitle).trim(),
    front: String(input.front).trim(),
    back: String(input.back).trim(),
    backSubtitle: input.backSubtitle === undefined || input.backSubtitle === null
      ? ''
      : String(input.backSubtitle).trim(),
    tags: normalizeTags(input.tags)
  };
}

/**
 * Full path for one card file.
 * We only allow safe id characters so people cannot escape the folder.
 */
function getCardFilePath(id) {
  // Regex: only letters, numbers, dash, underscore — whole string must match.
  // .test(id) returns true/false. Rejecting bad ids stops path traversal attacks.
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    const error = new Error('Invalid card id');
    error.code = 'INVALID_ID';
    throw error;
  }
  return path.join(CARDS_DIR, `${id}.json`);
}

/**
 * Read every .json file in data/cards/ and return an array of card objects.
 * Skips README.md and any non-json files.
 */
async function listCards() {
  // Make sure the folder exists (first run / empty project).
  await fs.mkdir(CARDS_DIR, { recursive: true });

  const names = await fs.readdir(CARDS_DIR);
  const cards = [];

  for (const name of names) {
    // Only treat .json files as cards.
    if (!name.endsWith('.json')) {
      continue;
    }

    const fullPath = path.join(CARDS_DIR, name);
    const text = await fs.readFile(fullPath, 'utf8');
    const card = JSON.parse(text);
    cards.push(card);
  }

  // Newest first is nicer when learning; prefer updatedAt, fall back to createdAt.
  cards.sort(function (a, b) {
    const aTime = a.updatedAt || a.createdAt || '';
    const bTime = b.updatedAt || b.createdAt || '';
    if (aTime < bTime) {
      return 1;
    }
    if (aTime > bTime) {
      return -1;
    }
    return 0;
  });

  return cards;
}

/**
 * Read one card by id. Returns null if the file is missing.
 */
async function getCard(id) {
  const filePath = getCardFilePath(id);

  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    // Node uses 'ENOENT' when a file does not exist.
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Create a new card file.
 * Returns the saved card object (including id, dates, and tags).
 */
async function createCard(input) {
  await fs.mkdir(CARDS_DIR, { recursive: true });

  const id = makeCardId();
  const now = new Date().toISOString();
  const fields = buildCardFields(input);

  const card = {
    id: id,
    frontTitle: fields.frontTitle,
    front: fields.front,
    back: fields.back,
    backSubtitle: fields.backSubtitle,
    createdAt: now,
    updatedAt: now,
    tags: fields.tags
  };

  const filePath = getCardFilePath(id);
  // pretty-print JSON (2 spaces) so students can open the file and read it
  await fs.writeFile(filePath, JSON.stringify(card, null, 2), 'utf8');

  return card;
}

/**
 * Update an existing card. Returns the updated card, or null if missing.
 * Keeps the same id and createdAt; refreshes updatedAt.
 */
async function updateCard(id, input) {
  const existing = await getCard(id);
  if (!existing) {
    return null;
  }

  const fields = buildCardFields(input);
  const updated = {
    id: existing.id,
    frontTitle: fields.frontTitle,
    front: fields.front,
    back: fields.back,
    backSubtitle: fields.backSubtitle,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    tags: fields.tags
  };

  const filePath = getCardFilePath(id);
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf8');

  return updated;
}

/**
 * Delete one card file. Returns true if deleted, false if it was already gone.
 */
async function deleteCard(id) {
  const filePath = getCardFilePath(id);

  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

// Export the functions so routes/cards.js can require them.
module.exports = {
  listCards: listCards,
  getCard: getCard,
  createCard: createCard,
  updateCard: updateCard,
  deleteCard: deleteCard
};
