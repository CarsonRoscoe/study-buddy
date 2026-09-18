/*
  api.js
  ------
  Job: talk to the Study Buddy server using fetch.

  Beginner mental model:
  - The browser cannot read files from data/cards/ directly (security).
  - Instead we ask the Node server: "GET /api/cards" and it sends JSON back.
  - fetch() starts that HTTP request; await waits for the response.

  This file does NOT update the page (no document.querySelector).
  Page scripts call StudyBuddyApi.* and then update the DOM themselves.

  Why wrap everything in (function () { ... })(); ?
  That is an IIFE (Immediately Invoked Function Expression). It keeps
  helper names like readJsonOrThrow private, and only exposes what we put
  on window.StudyBuddyApi.
*/

(function () {
  var CARDS_BASE = '/api/cards';
  var QUIZZES_BASE = '/api/quizzes';

  /**
   * Turn a fetch Response into JSON, or throw a clear Error.
   * Page scripts can catch the error and show a message to the user.
   */
  async function readJsonOrThrow(response) {
    // 204 No Content has no body (used by DELETE).
    if (response.status === 204) {
      return null;
    }

    var data = null;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error('Server did not return valid JSON.');
    }

    if (!response.ok) {
      var message = data && data.error ? data.error : 'Request failed (' + response.status + ').';
      throw new Error(message);
    }

    return data;
  }

  async function getCards() {
    // fetch defaults to GET. We wait for the Response, then parse JSON.
    var response = await fetch(CARDS_BASE);
    return readJsonOrThrow(response);
  }

  async function getCard(id) {
    // encodeURIComponent keeps special characters safe inside a URL path.
    var response = await fetch(CARDS_BASE + '/' + encodeURIComponent(id));
    return readJsonOrThrow(response);
  }

  async function createCard(cardData) {
    // POST means "create". JSON.stringify turns a JS object into text.
    var response = await fetch(CARDS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData)
    });
    return readJsonOrThrow(response);
  }

  async function updateCard(id, cardData) {
    var response = await fetch(CARDS_BASE + '/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData)
    });
    return readJsonOrThrow(response);
  }

  async function deleteCard(id) {
    var response = await fetch(CARDS_BASE + '/' + encodeURIComponent(id), {
      method: 'DELETE'
    });
    return readJsonOrThrow(response);
  }

  async function getQuizzes() {
    var response = await fetch(QUIZZES_BASE);
    return readJsonOrThrow(response);
  }

  async function getQuiz(id) {
    var response = await fetch(QUIZZES_BASE + '/' + encodeURIComponent(id));
    return readJsonOrThrow(response);
  }

  /**
   * Save a finished quiz.
   * quizData looks like: { selectedTags: [], items: [{ cardId, correct, front, ... }] }
   */
  async function createQuiz(quizData) {
    var response = await fetch(QUIZZES_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData)
    });
    return readJsonOrThrow(response);
  }

  async function deleteQuiz(id) {
    var response = await fetch(QUIZZES_BASE + '/' + encodeURIComponent(id), {
      method: 'DELETE'
    });
    return readJsonOrThrow(response);
  }

  window.StudyBuddyApi = {
    getCards: getCards,
    getCard: getCard,
    createCard: createCard,
    updateCard: updateCard,
    deleteCard: deleteCard,
    getQuizzes: getQuizzes,
    getQuiz: getQuiz,
    createQuiz: createQuiz,
    deleteQuiz: deleteQuiz
  };
})();
