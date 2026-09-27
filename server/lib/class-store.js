/*
  class-store.js
  --------------
  Job: read/write Class folder JSON files under data/classes/.
  A Class is a folder: title + optional cover photo.
  Cardsets point at a class via classId.
*/

const fs = require('fs').promises;
const path = require('path');
const { makeId, assertSafeId } = require('./id');

const CLASSES_DIR = path.join(__dirname, '..', '..', 'data', 'classes');

function getClassFilePath(id) {
  assertSafeId(id, 'class id');
  return path.join(CLASSES_DIR, id + '.json');
}

function buildClassFields(input) {
  return {
    title:
      input.title === undefined || input.title === null
        ? ''
        : String(input.title).trim(),
    coverImageUrl:
      input.coverImageUrl === undefined || input.coverImageUrl === null
        ? ''
        : String(input.coverImageUrl).trim()
  };
}

function presentClass(classObj) {
  return {
    id: classObj.id,
    title: classObj.title,
    coverImageUrl: classObj.coverImageUrl || '',
    sortOrder:
      typeof classObj.sortOrder === 'number' ? classObj.sortOrder : null,
    createdAt: classObj.createdAt,
    updatedAt: classObj.updatedAt
  };
}

async function writeClass(classObj) {
  await fs.writeFile(
    getClassFilePath(classObj.id),
    JSON.stringify(classObj, null, 2),
    'utf8'
  );
  return classObj;
}

async function listClasses() {
  await fs.mkdir(CLASSES_DIR, { recursive: true });
  const names = await fs.readdir(CLASSES_DIR);
  const classes = [];

  for (const name of names) {
    if (!name.endsWith('.json')) {
      continue;
    }
    const text = await fs.readFile(path.join(CLASSES_DIR, name), 'utf8');
    classes.push(presentClass(JSON.parse(text)));
  }

  classes.sort(function (a, b) {
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

  return classes;
}

async function getClass(id) {
  try {
    const text = await fs.readFile(getClassFilePath(id), 'utf8');
    return presentClass(JSON.parse(text));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

async function createClass(input) {
  await fs.mkdir(CLASSES_DIR, { recursive: true });
  const fields = buildClassFields(input);
  if (!fields.title) {
    const error = new Error('title is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }

  const now = new Date().toISOString();
  const classObj = {
    id: makeId('class'),
    title: fields.title,
    coverImageUrl: fields.coverImageUrl,
    sortOrder: Date.now(),
    createdAt: now,
    updatedAt: now
  };

  return writeClass(classObj);
}

async function updateClass(id, input) {
  const existing = await getClass(id);
  if (!existing) {
    return null;
  }

  const fields = buildClassFields(input);
  if (!fields.title) {
    const error = new Error('title is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }

  const updated = {
    id: existing.id,
    title: fields.title,
    coverImageUrl: fields.coverImageUrl,
    sortOrder:
      typeof existing.sortOrder === 'number' ? existing.sortOrder : Date.now(),
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };

  return writeClass(updated);
}

async function deleteClass(id) {
  try {
    await fs.unlink(getClassFilePath(id));
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

/** Persist display order for Home. ids = class ids left-to-right / top-to-bottom. */
async function reorderClasses(ids) {
  if (!Array.isArray(ids)) {
    const error = new Error('ids array is required');
    error.code = 'INVALID_INPUT';
    throw error;
  }
  const now = new Date().toISOString();
  for (let i = 0; i < ids.length; i++) {
    const id = String(ids[i] || '').trim();
    assertSafeId(id, 'class id');
    const existing = await getClass(id);
    if (!existing) {
      continue;
    }
    await writeClass({
      id: existing.id,
      title: existing.title,
      coverImageUrl: existing.coverImageUrl,
      sortOrder: i,
      createdAt: existing.createdAt,
      updatedAt: now
    });
  }
  return listClasses();
}

module.exports = {
  listClasses: listClasses,
  getClass: getClass,
  createClass: createClass,
  updateClass: updateClass,
  deleteClass: deleteClass,
  reorderClasses: reorderClasses
};
