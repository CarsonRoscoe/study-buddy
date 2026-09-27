/*
  api.js
  ------
  Job: HTTP helpers for /api/classes, /api/cardsets, /api/images (fetch + JSON).
  Does not touch the DOM — page scripts call these and update the UI.
*/

let CLASSES_BASE = '/api/classes';
let CARDSETS_BASE = '/api/cardsets';
let IMAGES_BASE = '/api/images';

/**
 * Turn a fetch Response into JSON, or throw a clear Error.
 * Page scripts can catch the error and show a message to the user.
 */
async function readJsonOrThrow(response) {
  // 204 No Content has no body (used by DELETE).
  if (response.status === 204) {
    return null;
  }

  // Read as text first so HTML 404 pages don't become a vague JSON error.
  let text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error(
        !response.ok
          ? 'Request failed (' + response.status + '). Is the server up to date?'
          : 'Server did not return valid JSON.'
      );
    }
  }

  if (!response.ok) {
    let message =
      data && data.error
        ? data.error
        : 'Request failed (' + response.status + ').';
    throw new Error(message);
  }

  return data;
}

async function getClasses() {
  let response = await fetch(CLASSES_BASE);
  return readJsonOrThrow(response);
}

async function getClass(id) {
  let response = await fetch(CLASSES_BASE + '/' + encodeURIComponent(id));
  return readJsonOrThrow(response);
}

async function createClass(classData) {
  let response = await fetch(CLASSES_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classData)
  });
  return readJsonOrThrow(response);
}

async function updateClass(id, classData) {
  let response = await fetch(CLASSES_BASE + '/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classData)
  });
  return readJsonOrThrow(response);
}

async function deleteClass(id) {
  let response = await fetch(CLASSES_BASE + '/' + encodeURIComponent(id), {
    method: 'DELETE'
  });
  return readJsonOrThrow(response);
}

async function reorderClasses(ids) {
  let response = await fetch(CLASSES_BASE + '/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids })
  });
  return readJsonOrThrow(response);
}

/** List cardsets. Optional query: { classId: '...' }. */
async function getCardsets(query) {
  let url = CARDSETS_BASE;
  if (query && query.classId) {
    url += '?classId=' + encodeURIComponent(query.classId);
  }
  let response = await fetch(url);
  return readJsonOrThrow(response);
}

async function getCardset(id) {
  let response = await fetch(CARDSETS_BASE + '/' + encodeURIComponent(id));
  return readJsonOrThrow(response);
}

async function createCardset(cardsetData) {
  let response = await fetch(CARDSETS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardsetData)
  });
  return readJsonOrThrow(response);
}

async function updateCardset(id, cardsetData) {
  let response = await fetch(CARDSETS_BASE + '/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardsetData)
  });
  return readJsonOrThrow(response);
}

/** Move a cardset into an existing class. */
async function moveCardset(id, classId) {
  let response = await fetch(
    CARDSETS_BASE + '/' + encodeURIComponent(id) + '/move',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: classId })
    }
  );
  return readJsonOrThrow(response);
}

async function deleteCardset(id) {
  let response = await fetch(CARDSETS_BASE + '/' + encodeURIComponent(id), {
    method: 'DELETE'
  });
  return readJsonOrThrow(response);
}

async function reorderCardsets(ids) {
  let response = await fetch(CARDSETS_BASE + '/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids })
  });
  return readJsonOrThrow(response);
}

/** Upload a browser data URL (data:image/...;base64,...) and get back { url }. */
async function uploadImage(dataUrl) {
  let response = await fetch(IMAGES_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: dataUrl })
  });
  return readJsonOrThrow(response);
}

async function addCardsetCard(cardsetId, cardData) {
  let response = await fetch(
    CARDSETS_BASE + '/' + encodeURIComponent(cardsetId) + '/cards',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData)
    }
  );
  return readJsonOrThrow(response);
}

// One object pages can call: StudyBuddyApi.getClasses(), etc.
window.StudyBuddyApi = {
  getClasses: getClasses,
  getClass: getClass,
  createClass: createClass,
  updateClass: updateClass,
  deleteClass: deleteClass,
  reorderClasses: reorderClasses,
  getCardsets: getCardsets,
  getCardset: getCardset,
  createCardset: createCardset,
  updateCardset: updateCardset,
  moveCardset: moveCardset,
  deleteCardset: deleteCardset,
  reorderCardsets: reorderCardsets,
  addCardsetCard: addCardsetCard,
  uploadImage: uploadImage
};
