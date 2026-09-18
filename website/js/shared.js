/*
  shared.js
  ---------
  Job: small helpers used by more than one page script.

  Why this file exists (DRY = Don't Repeat Yourself):
  Study, Quiz, and Cards all need things like "shuffle a list" and
  "filter cards by tags". Putting those helpers here means we write
  them once and every page can reuse them.

  This file does NOT talk to the server and does NOT own a whole page.
  Page scripts still decide WHAT to show; shared.js only helps with HOW
  (shuffle, escape text, paint a flashcard face, etc.).

  Load order in HTML (important!):
    1. api.js      → window.StudyBuddyApi
    2. shared.js   → window.StudyBuddyShared
    3. *-page.js   → uses both of the above
*/

(function () {
  /**
   * Fisher–Yates shuffle.
   * Makes a COPY of the list, then randomly swaps items so every order
   * is equally likely. We copy first so the original array is unchanged.
   */
  function shuffle(list) {
    // .slice() with no arguments copies every item into a new array.
    var copy = list.slice();
    var i;
    for (i = copy.length - 1; i > 0; i--) {
      // Pick a random index from 0 through i (inclusive).
      var j = Math.floor(Math.random() * (i + 1));
      // Swap copy[i] and copy[j] using a temporary variable.
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Make text safe to put inside HTML (for example in table cells).
   * Without this, a card title like <script> could break the page.
   * Each .replace() uses a regular expression (regex) to find a character
   * and swap it for an HTML-safe version.
   */
  function escapeHtml(text) {
    return (
      String(text)
        // Regex: find every & and turn it into the &amp; entity.
        .replace(/&/g, "&amp;")
        // Regex: find every < (less-than) so the browser won't treat it as a tag.
        .replace(/</g, "&lt;")
        // Regex: find every > (greater-than).
        .replace(/>/g, "&gt;")
        // Regex: find every " so it cannot break out of an HTML attribute.
        .replace(/"/g, "&quot;")
    );
  }

  /**
   * Collect every unique tag string from a list of cards, sorted A→Z.
   * "Unique" means each tag appears only once in the result, even if
   * many cards share that tag.
   */
  function collectAllTags(cards) {
    // An object used like a set: if seen[tag] is true, we already stored it.
    var seen = {};
    var tags = [];

    cards.forEach(function (card) {
      // Some older cards might not have a tags array — skip those safely.
      if (!Array.isArray(card.tags)) {
        return;
      }
      card.tags.forEach(function (tag) {
        if (!seen[tag]) {
          seen[tag] = true;
          tags.push(tag);
        }
      });
    });

    // Sort alphabetically so the filter chips are predictable for students.
    tags.sort(function (a, b) {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });

    return tags;
  }

  /**
   * AND filter: keep a card only if it includes EVERY selected tag.
   * If selectedTags is empty, keep every card (no filter active).
   */
  function filterCardsBySelectedTags(cards, selectedTags) {
    if (!selectedTags.length) {
      return cards.slice();
    }

    return cards.filter(function (card) {
      var cardTags = Array.isArray(card.tags) ? card.tags : [];
      var i;
      for (i = 0; i < selectedTags.length; i++) {
        // indexOf returns -1 when the tag is missing from the card.
        if (cardTags.indexOf(selectedTags[i]) === -1) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Read the values of all checked checkboxes inside a container element
   * (for example a fieldset of tag filters).
   */
  function getCheckedCheckboxValues(container) {
    if (!container) {
      return [];
    }
    var checked = container.querySelectorAll('input[type="checkbox"]:checked');
    var selected = [];
    var i;
    for (i = 0; i < checked.length; i++) {
      selected.push(checked[i].value);
    }
    return selected;
  }

  /**
   * Read a JSON array of tag strings from localStorage.
   * localStorage only stores strings, so we JSON.parse them back into an array.
   * If anything goes wrong (bad JSON, private browsing), return [].
   */
  function readStoredTags(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(function (tag) {
        return typeof tag === "string" && tag.trim();
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * Save a tag array into localStorage as JSON text.
   * Failures are ignored so a full disk / private mode does not crash the page.
   */
  function writeStoredTags(key, tags) {
    try {
      window.localStorage.setItem(key, JSON.stringify(tags));
    } catch (err) {
      // Intentionally empty: filters still work for this browser session.
    }
  }

  /**
   * Drop stored tags that no longer exist on any card
   * (for example after a classmate deleted those cards).
   */
  function sanitizeStoredTags(tags, cards) {
    var known = {};
    collectAllTags(cards).forEach(function (tag) {
      known[tag] = true;
    });
    return tags.filter(function (tag) {
      return known[tag];
    });
  }

  /**
   * Fill one flashcard element with either the front or the back of a card.
   * cardEl is the <article class="flashcard"> that contains
   * [data-field="title"], [data-field="text"], and [data-field="subtitle"].
   */
  function paintCardElement(cardEl, card, showBack) {
    var titleEl = cardEl.querySelector('[data-field="title"]');
    var textEl = cardEl.querySelector('[data-field="text"]');
    var subtitleEl = cardEl.querySelector('[data-field="subtitle"]');

    if (showBack) {
      // CSS uses .is-showing-back to mirror the card (scaleX flip).
      cardEl.classList.add("is-showing-back");
      titleEl.textContent = "";
      titleEl.hidden = true;
      textEl.textContent = card.back;
      subtitleEl.textContent = card.backSubtitle || "";
      subtitleEl.hidden = !card.backSubtitle;
    } else {
      cardEl.classList.remove("is-showing-back");
      titleEl.textContent = card.frontTitle || "";
      titleEl.hidden = !card.frontTitle;
      textEl.textContent = card.front;
      subtitleEl.textContent = "";
      subtitleEl.hidden = true;
    }
  }

  // Publish helpers on window so page scripts can call StudyBuddyShared.shuffle(...).
  window.StudyBuddyShared = {
    shuffle: shuffle,
    escapeHtml: escapeHtml,
    collectAllTags: collectAllTags,
    filterCardsBySelectedTags: filterCardsBySelectedTags,
    getCheckedCheckboxValues: getCheckedCheckboxValues,
    readStoredTags: readStoredTags,
    writeStoredTags: writeStoredTags,
    sanitizeStoredTags: sanitizeStoredTags,
    paintCardElement: paintCardElement,
  };
})();
