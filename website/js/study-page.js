/*
  study-page.js
  -------------
  Job: behavior for the Study experience on index.html (home).

  What a new programmer should know:
  - This file runs in the browser after the HTML loads.
  - It uses StudyBuddyApi (api.js) to load cards from the server.
  - It uses StudyBuddyShared (shared.js) for shuffle / tag filter helpers.
  - It updates the page by changing the DOM (text, hidden, CSS classes).

  Study flow in plain English:
  1. Load cards → show tag filters → shuffle matching cards into a deck.
  2. Click the top card to flip front ↔ back (CSS scaleX animation).
  3. Click Next to send the top card behind the next one (CSS keyframes).
  4. After the last card, the first card stays visible and Reshuffle appears.
  5. Reshuffle plays cut animations, then starts a new shuffled round.

  Progress stays in memory for this visit — it is not saved to disk.
  Tag filters ARE remembered in localStorage across refresh.
*/

(function () {
  /*
    Grab every DOM element this page needs up front.
    getElementById looks up an element by its id="..." from the HTML.
  */
  var tagFilter = document.getElementById('tag-filter');
  var tagFilterEmpty = document.getElementById('tag-filter-empty');
  var deckCount = document.getElementById('deck-count');
  var studyMeta = document.getElementById('study-meta');
  var studyMessage = document.getElementById('study-message');
  var deck = document.getElementById('deck');
  var deckBase = document.getElementById('deck-base');
  var deckTop = document.getElementById('deck-top');
  var deckUnder = document.getElementById('deck-under');
  var flashcard = document.getElementById('flashcard');
  var nextCardButton = document.getElementById('next-card');
  var reshuffleButton = document.getElementById('reshuffle');

  /*
    Shared helpers live in shared.js (loaded before this file).
    Aliases keep the rest of this file easy to read.
  */
  var Shared = window.StudyBuddyShared;
  var shuffle = Shared.shuffle;
  var collectAllTags = Shared.collectAllTags;
  var filterCardsBySelectedTags = Shared.filterCardsBySelectedTags;
  var paintCardElement = Shared.paintCardElement;
  var readStoredTags = Shared.readStoredTags;
  var writeStoredTags = Shared.writeStoredTags;

  // ----- Session state (values that change while you study) -----
  var allCards = []; // every card from the server
  var deckCards = []; // the filtered + shuffled list for this round
  var currentIndex = 0; // which card in deckCards is on top (0 = first)
  var showingBack = false; // true when the top card shows its back face
  var isFlipping = false; // lock so we do not start two flips at once
  var isAdvancing = false; // lock during the "send to back" animation
  var isReshuffling = false; // lock during the reshuffle cut animation
  var roundFinished = false; // true after the last card; Reshuffle replaces Next

  // Timings must match CSS in components.css or animations look wrong.
  var FLIP_DURATION_MS = 350;
  var SEND_BACK_DURATION_MS = 620;
  // Reshuffle cuts are snappier than a normal "Next" send-to-back (must match CSS).
  var RESHUFFLE_ARC_DURATION_MS = 380;
  var RESHUFFLE_CYCLES_PER_SIDE = 3;

  // localStorage key for remembering Study tag filters across refresh.
  var STUDY_TAGS_STORAGE_KEY = 'studyBuddy.study.selectedTags';

  /** Which tag checkboxes are currently checked? */
  function getSelectedTags() {
    return Shared.getCheckedCheckboxValues(tagFilter);
  }

  /** Drop saved tags that no longer exist on any loaded card. */
  function sanitizeStoredTags(tags) {
    return Shared.sanitizeStoredTags(tags, allCards);
  }

  /**
   * Tags that still appear on cards matching every currently selected tag.
   * Selecting a tag narrows which other tags you can add next.
   */
  function getAvailableTags(selectedTags) {
    var matchingCards = filterCardsBySelectedTags(allCards, selectedTags);
    return collectAllTags(matchingCards);
  }

  /**
   * Build tag chips. selectedTags stay checked; the list only shows tags
   * that still appear together on the filtered cards.
   */
  function renderTagFilters(selectedTags) {
    if (!selectedTags) {
      selectedTags = [];
    }

    var selectedLookup = {};
    selectedTags.forEach(function (tag) {
      selectedLookup[tag] = true;
    });

    var tags = getAvailableTags(selectedTags);
    tagFilter.innerHTML = '';

    // No tags exist on any card at all.
    if (!collectAllTags(allCards).length) {
      tagFilterEmpty.hidden = false;
      return;
    }

    tagFilterEmpty.hidden = true;

    tags.forEach(function (tag) {
      var isSelected = !!selectedLookup[tag];
      var label = document.createElement('label');
      label.className = 'tag-filter__option' + (isSelected ? ' is-selected' : '');

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = tag;
      checkbox.name = 'tag-filter';
      checkbox.checked = isSelected;

      var text = document.createElement('span');
      text.textContent = tag;

      label.appendChild(checkbox);
      label.appendChild(text);
      tagFilter.appendChild(label);
    });
  }

  function updateMeta() {
    if (!deckCards.length) {
      studyMeta.textContent = 'No cards to study with the current filters.';
      return;
    }
    studyMeta.textContent =
      'Card ' + (currentIndex + 1) + ' of ' + deckCards.length;
  }

  /** Update only the top card's words (used mid face-flip). */
  function setCardFaceContent(showBack) {
    var card = deckCards[currentIndex];
    showingBack = showBack;
    paintCardElement(flashcard, card, showBack);
  }

  /**
   * Prepare the top card. The under card stays hidden until a
   * send-to-back transition starts (so face-flips do not reveal it).
   */
  function prepareDeckLayers() {
    var topCard = deckCards[currentIndex];
    var underCardEl = deckUnder.querySelector('.flashcard');

    paintCardElement(flashcard, topCard, false);
    showingBack = false;
    deckTop.classList.remove('is-sending-back');
    deckBase.hidden = true;

    // Keep next card painted but invisible until "Next" runs.
    if (currentIndex + 1 < deckCards.length) {
      paintCardElement(underCardEl, deckCards[currentIndex + 1], false);
    }
    deckUnder.hidden = true;
  }

  function showCurrentCard() {
    roundFinished = false;
    isReshuffling = false;
    deck.hidden = false;
    nextCardButton.hidden = false;
    reshuffleButton.hidden = true;
    reshuffleButton.disabled = false;
    studyMessage.hidden = true;
    isFlipping = false;
    isAdvancing = false;
    prepareDeckLayers();
    updateMeta();
  }

  /** Round done: keep the first card visible; Reshuffle replaces Next. */
  function showFinishedRound() {
    roundFinished = true;
    currentIndex = 0;
    deck.hidden = false;
    nextCardButton.hidden = true;
    reshuffleButton.hidden = false;
    reshuffleButton.disabled = false;
    studyMessage.hidden = false;
    studyMessage.textContent = 'You finished this round. Nice work!';
    studyMeta.textContent = 'Seen ' + deckCards.length + ' of ' + deckCards.length;
    isFlipping = false;
    isAdvancing = false;
    prepareDeckLayers();
  }

  function showEmptyState(message) {
    roundFinished = false;
    isReshuffling = false;
    deck.hidden = true;
    nextCardButton.hidden = true;
    reshuffleButton.hidden = true;
    studyMessage.hidden = false;
    studyMessage.textContent = message;
    studyMeta.textContent = 'No cards to study.';
  }

  /**
   * Flip top card front ↔ back.
   * CSS starts animating scaleX immediately.
   * Text swaps at 25% of the animation so it is not readable while mirrored.
   */
  function toggleFlip() {
    if (
      isFlipping ||
      isAdvancing ||
      isReshuffling ||
      deck.hidden ||
      !deckCards.length
    ) {
      return;
    }

    isFlipping = true;
    var nextShowBack = !showingBack;

    if (nextShowBack) {
      flashcard.classList.add('is-showing-back');
    } else {
      flashcard.classList.remove('is-showing-back');
    }

    setTimeout(function () {
      setCardFaceContent(nextShowBack);
    }, FLIP_DURATION_MS / 4);

    setTimeout(function () {
      isFlipping = false;
    }, FLIP_DURATION_MS);
  }

  /**
   * Send the top card to the back of the deck, revealing nextIndex underneath.
   * When finishing the round, nextIndex is 0 (first card) and then Reshuffle shows.
   */
  function advanceToIndex(nextIndex, finishRound) {
    if (isAdvancing || isFlipping || isReshuffling || !deckCards.length) {
      return;
    }

    isAdvancing = true;
    nextCardButton.disabled = true;
    reshuffleButton.disabled = true;

    paintCardElement(flashcard, deckCards[currentIndex], false);
    showingBack = false;
    paintCardElement(
      deckUnder.querySelector('.flashcard'),
      deckCards[nextIndex],
      false
    );
    deckUnder.hidden = false;

    deckTop.classList.remove('is-sending-back');
    void deckTop.offsetWidth;
    deckTop.classList.add('is-sending-back');

    function finishAdvance() {
      if (!isAdvancing) {
        return;
      }
      isAdvancing = false;
      deckTop.removeEventListener('animationend', onAnimEnd);
      deckTop.classList.remove('is-sending-back');
      currentIndex = nextIndex;
      nextCardButton.disabled = false;
      reshuffleButton.disabled = false;

      if (finishRound) {
        showFinishedRound();
      } else {
        prepareDeckLayers();
        updateMeta();
      }
    }

    function onAnimEnd(event) {
      if (event.target !== deckTop) {
        return;
      }
      finishAdvance();
    }

    deckTop.addEventListener('animationend', onAnimEnd);

    setTimeout(function () {
      if (isAdvancing) {
        finishAdvance();
      }
    }, SEND_BACK_DURATION_MS + 50);
  }

  function goToNextCard() {
    if (
      isAdvancing ||
      isFlipping ||
      isReshuffling ||
      roundFinished ||
      !deckCards.length
    ) {
      return;
    }

    if (currentIndex >= deckCards.length - 1) {
      // Last card → reveal the first card, then offer Reshuffle.
      advanceToIndex(0, true);
      return;
    }

    advanceToIndex(currentIndex + 1, false);
  }

  /**
   * Reshuffle: precompute the next deck order, then cut cards off a shared
   * visual stack (left / right arcs). The center (base) card updates as each
   * card is grabbed, and already shows the new top when the arcs finish —
   * so applying nextOrder does not swap the face.
   */
  function playReshuffleAnimation(onDone) {
    isReshuffling = true;
    reshuffleButton.disabled = true;
    nextCardButton.disabled = true;
    studyMessage.hidden = true;

    var baseCardEl = deckBase.querySelector('.flashcard');
    var underCardEl = deckUnder.querySelector('.flashcard');
    var emptyCard = { front: '', back: '' };
    var grabCount = RESHUFFLE_CYCLES_PER_SIDE * 2;

    // Final order is chosen up front — animation must end on nextOrder[0].
    var nextOrder = shuffle(deckCards.slice());
    var finalTop = nextOrder[0] || emptyCard;
    var currentTop = deckCards[currentIndex] || deckCards[0] || emptyCard;

    // Visual stack: current top first (so it gets grabbed), then more cuts,
    // then the real new top underneath so the center ends on finalTop.
    var pool = shuffle(deckCards.slice());
    var animStack = [currentTop];
    var i;
    for (i = 1; i < grabCount; i++) {
      animStack.push(pool[i % pool.length] || emptyCard);
    }
    animStack.push(finalTop);

    function paintBaseTop() {
      paintCardElement(baseCardEl, animStack[0] || finalTop, false);
    }

    function hideFlyer(slot) {
      slot.classList.add('is-reshuffle-hidden');
    }

    function showFlyer(slot) {
      slot.classList.remove('is-reshuffle-hidden');
    }

    deckBase.hidden = false;
    deckUnder.hidden = false;
    paintBaseTop();
    hideFlyer(deckTop);
    hideFlyer(deckUnder);
    showingBack = false;
    flashcard.classList.remove('is-showing-back');

    deckTop.classList.remove(
      'is-sending-back',
      'is-reshuffling-left',
      'is-reshuffling-right'
    );
    deckUnder.classList.remove('is-reshuffling-left', 'is-reshuffling-right');

    var duration = RESHUFFLE_ARC_DURATION_MS;
    var half = Math.round(duration / 2);
    var leftDone = false;
    var rightDone = false;
    var finished = false;

    function finishReshuffle() {
      if (finished) {
        return;
      }
      if (!leftDone || !rightDone) {
        return;
      }
      finished = true;
      deckTop.classList.remove(
        'is-reshuffling-left',
        'is-reshuffling-right',
        'is-reshuffle-hidden'
      );
      deckUnder.classList.remove(
        'is-reshuffling-left',
        'is-reshuffling-right',
        'is-reshuffle-hidden'
      );
      // Paint the real top onto the interactive card before revealing it.
      paintCardElement(flashcard, finalTop, false);
      deckUnder.hidden = true;
      deckBase.hidden = true;
      void deckTop.offsetWidth;
      void deckUnder.offsetWidth;

      // Same order the animation already revealed — no second shuffle.
      deckCards = nextOrder;
      currentIndex = 0;
      showingBack = false;
      isReshuffling = false;
      onDone();
    }

    function runArc(slot, className, then) {
      var settled = false;

      function settle() {
        if (settled) {
          return;
        }
        settled = true;
        slot.removeEventListener('animationend', onAnimEnd);
        slot.classList.remove(className);
        hideFlyer(slot);
        then();
      }

      function onAnimEnd(event) {
        if (event.target !== slot) {
          return;
        }
        settle();
      }

      showFlyer(slot);
      slot.classList.remove(className);
      void slot.offsetWidth;
      slot.classList.add(className);
      slot.addEventListener('animationend', onAnimEnd);
      setTimeout(settle, duration + 80);
    }

    /** Take the current top of the visual stack into a flying cut. */
    function grabAndAnimate(slot, cardEl, className, then) {
      var grabbed = animStack.shift() || emptyCard;
      paintCardElement(cardEl, grabbed, false);
      paintBaseTop();
      runArc(slot, className, then);
    }

    function runSide(slot, cardEl, className, onSideDone) {
      var cycle = 0;

      function nextCycle() {
        if (cycle >= RESHUFFLE_CYCLES_PER_SIDE) {
          onSideDone();
          return;
        }
        cycle = cycle + 1;
        grabAndAnimate(slot, cardEl, className, nextCycle);
      }

      nextCycle();
    }

    runSide(deckTop, flashcard, 'is-reshuffling-left', function () {
      leftDone = true;
      finishReshuffle();
    });

    setTimeout(function () {
      runSide(deckUnder, underCardEl, 'is-reshuffling-right', function () {
        rightDone = true;
        finishReshuffle();
      });
    }, half);
  }

  /** Start a fresh round from an already-chosen deck order (no re-shuffle). */
  function beginRoundWithDeck(orderedCards) {
    deckCards = orderedCards;
    currentIndex = 0;
    showingBack = false;
    isAdvancing = false;
    isReshuffling = false;
    roundFinished = false;
    nextCardButton.disabled = false;
    reshuffleButton.disabled = false;
    deckTop.classList.remove(
      'is-sending-back',
      'is-reshuffling-left',
      'is-reshuffling-right',
      'is-reshuffle-hidden'
    );
    deckUnder.classList.remove(
      'is-reshuffling-left',
      'is-reshuffling-right',
      'is-reshuffle-hidden'
    );
    deckBase.hidden = true;
    showCurrentCard();
  }

  /** Apply current checkboxes, shuffle, and start (or restart) a round. */
  function applyFiltersAndStartRound() {
    var selectedTags = getSelectedTags();
    var filtered = filterCardsBySelectedTags(allCards, selectedTags);
    var count = filtered.length;

    deckCount.textContent =
      (count === 1 ? 'Selected 1 card' : 'Selected ' + count + ' cards') +
      ' (of ' +
      allCards.length +
      ')';

    deckCards = shuffle(filtered);
    currentIndex = 0;
    showingBack = false;
    isAdvancing = false;
    isReshuffling = false;
    roundFinished = false;
    nextCardButton.disabled = false;
    reshuffleButton.disabled = false;
    deckTop.classList.remove(
      'is-sending-back',
      'is-reshuffling-left',
      'is-reshuffling-right'
    );
    deckUnder.classList.remove('is-reshuffling-left', 'is-reshuffling-right');

    if (!allCards.length) {
      showEmptyState('No cards yet. Add some on the Cards page first.');
      return;
    }

    if (!deckCards.length) {
      showEmptyState(
        'No cards match all selected tags. Uncheck a tag or pick different ones.'
      );
      return;
    }

    showCurrentCard();
  }

  flashcard.addEventListener('click', function () {
    toggleFlip();
  });

  flashcard.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFlip();
    }
  });

  nextCardButton.addEventListener('click', function () {
    goToNextCard();
  });

  reshuffleButton.addEventListener('click', function () {
    if (isReshuffling || isAdvancing || isFlipping || !deckCards.length) {
      return;
    }
    playReshuffleAnimation(function () {
      beginRoundWithDeck(deckCards);
    });
  });

  tagFilter.addEventListener('change', function (event) {
    if (event.target && event.target.name === 'tag-filter') {
      // Rebuild chips from the new selection, then reshuffle the deck.
      var selected = getSelectedTags();
      writeStoredTags(STUDY_TAGS_STORAGE_KEY, selected);
      renderTagFilters(selected);
      applyFiltersAndStartRound();
    }
  });

  async function init() {
    try {
      allCards = await window.StudyBuddyApi.getCards();
      var restored = sanitizeStoredTags(readStoredTags(STUDY_TAGS_STORAGE_KEY));
      renderTagFilters(restored);
      applyFiltersAndStartRound();
    } catch (err) {
      deck.hidden = true;
      reshuffleButton.hidden = true;
      deckCount.textContent = 'Selected 0 cards (of 0)';
      studyMessage.hidden = false;
      studyMessage.textContent = 'Could not load cards: ' + err.message;
      studyMeta.textContent = 'Error';
    }
  }

  init();
})();
