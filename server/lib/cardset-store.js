/*
  cardset-store.js
  ----------------
  Job: read/write Cardset (deck) JSON files under data/cardsets/.
  A Cardset has a required title, a required classId, and an array of
  cards: { id, term, definition, termImageUrl? }.
*/

const fs = require('fs').promises;
const path = require('path');
const { makeId, assertSafeId } = require('./id');
const { normalizeCard, normalizeCards } = require('./card-normalize');
const classStore = require('./class-store');

const CARDSETS_DIR = path.join(__dirname, '..', '..', 'data', 'cardsets');

function getCardsetFilePath(id) {
  assertSafeId(id, 'cardset id');
  return path.join(CARDSETS_DIR, id + '.json');
}

function buildCardsetFields(input) {
  let classId = null;
  if (input.classId !== undefined && input.classId !== null && input.classId !== '') {
    classId = String(input.classId).trim();
    assertSafeId(classId, 'class id');
  }

  return {
    title:
      input.title === undefined || input.title === null
        ? ''
        : String(input.title).trim(),
    classId: classId,
    cards: normalizeCards(input.cards)
  };
}

async function listCardsets() {
  await fs.mkdir(CARDSETS_DIR, { recursive: true });
  const names = await fs.readdir(CARDSETS_DIR);
  const cardsets = [];

  for (const name of names) {
    if (!name.endsWith('.json')) {
      continue;
    }
    const text = await fs.readFile(path.join(CARDSETS_DIR, name), 'utf8');
    cardsets.push(JSON.parse(text));
  }

  cardsets.sort(function (a, b) {
    const aOrder =
      typeof a.sortOrder === 'number'
        ? a.sortOrder
        : -(Date.parse(a.updatedAt || a.createdAt || '') || 0);
    const bOrder =
      typeof b.sortOrder === 'number'
        ? b.sortOrder
        : -(Date.parse(b.updatedAt || b.createdAt || '') || 0);
    if (aOrder < bOrder) {
      return -1;
    }
    if (aOrder > bOrder) {
      return 1;
    }
    return 0;
  });

  return cardsets;
}

async function getCardset(id) {
  try {
    const text = await fs.readFile(getCardsetFilePath(id), 'utf8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

async function assertClassExists(classId) {
  if (!classId) {
    const error = new Error('classId is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  const classObj = await classStore.getClass(classId);
  if (!classObj) {
    const error = new Error('Class not found.');
    error.code = 'INVALID_INPUT';
    throw error;
  }
}

async function createCardset(input) {
  await fs.mkdir(CARDSETS_DIR, { recursive: true });
  const fields = buildCardsetFields(input);
  if (!fields.title) {
    const error = new Error('title is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  await assertClassExists(fields.classId);

  const now = new Date().toISOString();
  const cardset = {
    id: makeId('cardset'),
    title: fields.title,
    classId: fields.classId,
    cards: fields.cards,
    sortOrder: Date.now(),
    createdAt: now,
    updatedAt: now
  };

  await fs.writeFile(
    getCardsetFilePath(cardset.id),
    JSON.stringify(cardset, null, 2),
    'utf8'
  );
  return cardset;
}

async function updateCardset(id, input) {
  const existing = await getCardset(id);
  if (!existing) {
    return null;
  }

  const fields = buildCardsetFields(input);
  if (!fields.title) {
    const error = new Error('title is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  if (!fields.classId) {
    fields.classId = existing.classId;
  } else {
    await assertClassExists(fields.classId);
  }

  const updated = {
    id: existing.id,
    title: fields.title,
    classId: fields.classId,
    cards: fields.cards,
    sortOrder:
      typeof existing.sortOrder === 'number' ? existing.sortOrder : Date.now(),
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(
    getCardsetFilePath(id),
    JSON.stringify(updated, null, 2),
    'utf8'
  );
  return updated;
}

/** Move a cardset into an existing class. */
async function moveCardset(id, classId) {
  const existing = await getCardset(id);
  if (!existing) {
    return null;
  }

  const nextClassId = String(classId || '').trim();
  await assertClassExists(nextClassId);

  const updated = {
    id: existing.id,
    title: existing.title,
    classId: nextClassId,
    cards: Array.isArray(existing.cards) ? existing.cards : [],
    sortOrder:
      typeof existing.sortOrder === 'number' ? existing.sortOrder : Date.now(),
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  await fs.writeFile(
    getCardsetFilePath(id),
    JSON.stringify(updated, null, 2),
    'utf8'
  );
  return updated;
}

async function deleteCardset(id) {
  try {
    await fs.unlink(getCardsetFilePath(id));
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/** After a Class is deleted, remove the Cardsets that lived in it. */
async function deleteCardsetsInClass(classId) {
  const all = await listCardsets();
  for (let i = 0; i < all.length; i++) {
    if (all[i].classId === classId) {
      await deleteCardset(all[i].id);
    }
  }
}

async function appendCard(cardsetId, rawCard) {
  const existing = await getCardset(cardsetId);
  if (!existing) {
    return null;
  }
  const card = normalizeCard(rawCard, (existing.cards || []).length);
  if (!card) {
    const error = new Error('term or definition is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  if (!card.id || card.id.indexOf('card-') !== 0) {
    card.id = makeId('card');
  }
  const cards = (Array.isArray(existing.cards) ? existing.cards : []).concat([
    card
  ]);
  const updated = await updateCardset(cardsetId, {
    title: existing.title,
    classId: existing.classId,
    cards: cards
  });
  return { cardset: updated, card: card };
}

/** Persist display order. ids = cardset ids in the desired grid order. */
async function reorderCardsets(ids) {
  if (!Array.isArray(ids)) {
    const error = new Error('ids array is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  const now = new Date().toISOString();
  for (let i = 0; i < ids.length; i++) {
    const id = String(ids[i] || '').trim();
    assertSafeId(id, 'cardset id');
    const existing = await getCardset(id);
    if (!existing) {
      continue;
    }
    const updated = {
      id: existing.id,
      title: existing.title,
      classId: existing.classId || null,
      cards: Array.isArray(existing.cards) ? existing.cards : [],
      sortOrder: i,
      createdAt: existing.createdAt,
      updatedAt: now
    };
    await fs.writeFile(
      getCardsetFilePath(id),
      JSON.stringify(updated, null, 2),
      'utf8'
    );
  }
  return listCardsets();
}

module.exports = {
  listCardsets: listCardsets,
  getCardset: getCardset,
  createCardset: createCardset,
  updateCardset: updateCardset,
  moveCardset: moveCardset,
  deleteCardset: deleteCardset,
  deleteCardsetsInClass: deleteCardsetsInClass,
  appendCard: appendCard,
  reorderCardsets: reorderCardsets
};
