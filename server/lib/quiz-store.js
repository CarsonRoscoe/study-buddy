/*
  quiz-store.js
  -------------
  Job: read and write quiz history JSON files under data/quizzes/.
  This file does NOT know about Express (no req/res).
  Routes call these functions; these functions only touch the disk.

  Quiz shape saved on disk:
  {
    id,
    createdAt,
    selectedTags,   // tags used to filter the deck (may be [])
    total,
    correctCount,
    incorrectCount,
    items: [        // one entry per card in the session
      {
        cardId,
        correct,    // true or false
        frontTitle, // snapshot so review still works if the card changes later
        front,
        back,
        backSubtitle,
        tags        // snapshot of that card's tags
      }
    ]
  }
*/

const fs = require('fs').promises;
const path = require('path');

const QUIZZES_DIR = path.join(__dirname, '..', '..', 'data', 'quizzes');

function makeQuizId() {
  // Date.now() is milliseconds since 1970. For a single student on one machine,
  // two quizzes will not be saved in the same millisecond, so this is unique enough.
  return `quiz-${Date.now()}`;
}

function getQuizFilePath(id) {
  // Regex: ^ start, [a-zA-Z0-9_-]+ one-or-more safe chars, $ end.
  // This blocks path tricks like "../../etc/passwd" in an id.
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    const error = new Error('Invalid quiz id');
    error.code = 'INVALID_ID';
    throw error;
  }
  return path.join(QUIZZES_DIR, `${id}.json`);
}

/**
 * Normalize one quiz item from the client.
 * Requires cardId and a boolean correct flag.
 */
function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const cardId = raw.cardId === undefined || raw.cardId === null ? '' : String(raw.cardId).trim();
  if (!cardId) {
    return null;
  }

  if (typeof raw.correct !== 'boolean') {
    return null;
  }

  return {
    cardId: cardId,
    correct: raw.correct,
    frontTitle: raw.frontTitle ? String(raw.frontTitle) : '',
    front: raw.front ? String(raw.front) : '',
    back: raw.back ? String(raw.back) : '',
    backSubtitle: raw.backSubtitle ? String(raw.backSubtitle) : '',
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(function (tag) {
          return String(tag).trim();
        }).filter(Boolean)
      : []
  };
}

async function listQuizzes() {
  await fs.mkdir(QUIZZES_DIR, { recursive: true });

  const names = await fs.readdir(QUIZZES_DIR);
  const quizzes = [];

  for (const name of names) {
    if (!name.endsWith('.json')) {
      continue;
    }

    const fullPath = path.join(QUIZZES_DIR, name);
    const text = await fs.readFile(fullPath, 'utf8');
    quizzes.push(JSON.parse(text));
  }

  // Newest first
  quizzes.sort(function (a, b) {
    if (a.createdAt < b.createdAt) {
      return 1;
    }
    if (a.createdAt > b.createdAt) {
      return -1;
    }
    return 0;
  });

  return quizzes;
}

async function getQuiz(id) {
  const filePath = getQuizFilePath(id);

  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Save a finished quiz from { selectedTags, items }.
 * Counts are computed on the server so the file stays trustworthy.
 */
async function createQuiz(input) {
  await fs.mkdir(QUIZZES_DIR, { recursive: true });

  const selectedTags = Array.isArray(input.selectedTags)
    ? input.selectedTags.map(function (tag) {
        return String(tag).trim();
      }).filter(Boolean)
    : [];

  if (!Array.isArray(input.items) || input.items.length === 0) {
    const error = new Error('items must be a non-empty array');
    error.code = 'INVALID_ITEMS';
    throw error;
  }

  const items = [];
  for (let i = 0; i < input.items.length; i++) {
    const item = normalizeItem(input.items[i]);
    if (!item) {
      const error = new Error('Each item needs cardId and a boolean correct value');
      error.code = 'INVALID_ITEMS';
      throw error;
    }
    items.push(item);
  }

  let correctCount = 0;
  let incorrectCount = 0;
  items.forEach(function (item) {
    if (item.correct) {
      correctCount = correctCount + 1;
    } else {
      incorrectCount = incorrectCount + 1;
    }
  });

  const id = makeQuizId();
  const quiz = {
    id: id,
    createdAt: new Date().toISOString(),
    selectedTags: selectedTags,
    total: items.length,
    correctCount: correctCount,
    incorrectCount: incorrectCount,
    items: items
  };

  const filePath = getQuizFilePath(id);
  await fs.writeFile(filePath, JSON.stringify(quiz, null, 2), 'utf8');

  return quiz;
}

async function deleteQuiz(id) {
  const filePath = getQuizFilePath(id);

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

module.exports = {
  listQuizzes: listQuizzes,
  getQuiz: getQuiz,
  createQuiz: createQuiz,
  deleteQuiz: deleteQuiz
};
