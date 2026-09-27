/*
  card-normalize.js
  -----------------
  Job: shared shape for cards inside a Cardset.
  { id, term, definition, termImageUrl }
*/

const { makeId } = require('./id');

function normalizeCard(raw, index) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const term =
    raw.term === undefined || raw.term === null ? '' : String(raw.term).trim();
  const definition =
    raw.definition === undefined || raw.definition === null
      ? ''
      : String(raw.definition).trim();
  if (!term && !definition) {
    return null;
  }

  let id = raw.id ? String(raw.id).trim() : '';
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    id = makeId('card');
    if (index !== undefined && index !== null) {
      id = id + '-' + index;
    }
  }

  return {
    id: id,
    term: term,
    definition: definition,
    termImageUrl:
      raw.termImageUrl === undefined || raw.termImageUrl === null
        ? ''
        : String(raw.termImageUrl).trim()
  };
}

function normalizeCards(rawCards) {
  if (!Array.isArray(rawCards)) {
    return [];
  }
  const cards = [];
  for (let i = 0; i < rawCards.length; i++) {
    const card = normalizeCard(rawCards[i], i);
    if (card) {
      cards.push(card);
    }
  }
  return cards;
}

module.exports = {
  normalizeCard: normalizeCard,
  normalizeCards: normalizeCards
};
