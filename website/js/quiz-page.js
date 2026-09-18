/*
  quiz-page.js
  ------------
  Job: behavior for quiz.html only.

  Two big sections (see the sub-tabs in the HTML):
  1) Start a quiz — filter tags, pick cards, answer Correct/Incorrect, save.
  2) Review quizzes — list past sessions, filter/search, open detail, delete.

  Dependencies (script load order):
  - StudyBuddyApi from api.js
  - StudyBuddyShared from shared.js

  Correct/Incorrect uses the same “send top card to the back” CSS animation
  as Study, plus a floating ✓ / ✕ flash centered on the card.
*/

(function () {
  // ----- Sub-tabs -----
  var tabButtons = document.querySelectorAll('.subtabs__button');
  var panelStart = document.getElementById('panel-start');
  var panelReview = document.getElementById('panel-review');

  // ----- Start panel -----
  var quizSetup = document.getElementById('quiz-setup');
  var tagFilter = document.getElementById('quiz-tag-filter');
  var tagFilterEmpty = document.getElementById('quiz-tag-filter-empty');
  var deckCount = document.getElementById('quiz-deck-count');
  var selectedCardsEl = document.getElementById('quiz-selected-cards');
  var startButton = document.getElementById('quiz-start');
  var setupMessage = document.getElementById('quiz-setup-message');

  var quizSession = document.getElementById('quiz-session');
  var quizMeta = document.getElementById('quiz-meta');
  var deckTop = document.getElementById('quiz-deck-top');
  var deckUnder = document.getElementById('quiz-deck-under');
  var flashcard = document.getElementById('quiz-flashcard');
  var correctButton = document.getElementById('quiz-correct');
  var incorrectButton = document.getElementById('quiz-incorrect');
  var answerFlash = document.getElementById('answer-flash');
  var answerFlashMark = document.getElementById('answer-flash-mark');

  var quizResults = document.getElementById('quiz-results');
  var resultsSummary = document.getElementById('quiz-results-summary');
  var resultsWrong = document.getElementById('quiz-results-wrong');
  var tryAgainButton = document.getElementById('quiz-try-again');
  var goReviewButton = document.getElementById('quiz-go-review');

  // ----- Review panel -----
  var reviewListStatus = document.getElementById('review-list-status');
  var reviewList = document.getElementById('review-list');
  var reviewListPanel = document.getElementById('review-list-panel');
  var reviewDetail = document.getElementById('review-detail');
  var reviewDetailSummary = document.getElementById('review-detail-summary');
  var reviewDetailBody = document.getElementById('review-detail-body');
  var reviewDetailClose = document.getElementById('review-detail-close');
  var reviewDetailDelete = document.getElementById('review-detail-delete');
  var reviewTagFilter = document.getElementById('review-tag-filter');
  var reviewTagFilterEmpty = document.getElementById('review-tag-filter-empty');
  var reviewTextFilter = document.getElementById('review-text-filter');

  // ----- Session state (values that change while you quiz) -----
  // Full quiz history in memory so tag filters can re-draw without refetching.
  var allQuizzes = [];
  var allCards = []; // every card from the server (for Start filters)
  var deckCards = []; // shuffled cards for the active quiz
  var currentIndex = 0; // which question is on top
  var showingBack = false;
  var sessionItems = []; // answers collected, then POSTed when finished
  var selectedTagsForSession = []; // snapshot of filters when Start was pressed
  // Card ids unchecked from the Selected list (cleared when tags change).
  var excludedCardIds = {};
  var viewingQuizId = null; // which quiz detail is open in Review
  var isFlipping = false;
  var isAdvancing = false;

  // Must match CSS timings in components.css
  var FLIP_DURATION_MS = 350;
  var SEND_BACK_DURATION_MS = 620;
  var ANSWER_FLASH_MS = 700;
  // Let the ✓/✕ pop start before the card begins moving.
  var SEND_BACK_DELAY_MS = 250;

  /*
    Shared helpers from shared.js (loaded before this file).
    Aliases keep call sites short and readable for students.
  */
  var Shared = window.StudyBuddyShared;
  var shuffle = Shared.shuffle;
  var escapeHtml = Shared.escapeHtml;
  var collectAllTags = Shared.collectAllTags;
  var filterCardsBySelectedTags = Shared.filterCardsBySelectedTags;
  var paintCardElement = Shared.paintCardElement;
  var readStoredTags = Shared.readStoredTags;
  var writeStoredTags = Shared.writeStoredTags;

  // localStorage key so Start-quiz tag filters survive a page refresh.
  var QUIZ_TAGS_STORAGE_KEY = 'studyBuddy.quiz.selectedTags';

  /** Which Start-panel tag checkboxes are checked? */
  function getSelectedTags() {
    return Shared.getCheckedCheckboxValues(tagFilter);
  }

  /** Drop saved tags that no longer exist on any loaded card. */
  function sanitizeStoredTags(tags) {
    return Shared.sanitizeStoredTags(tags, allCards);
  }

  /**
   * Example: "50% (2/4)" — percent is rounded to the nearest whole number.
   */
  function formatScore(correctCount, total) {
    var correct = Number(correctCount) || 0;
    var all = Number(total) || 0;
    var percent = all === 0 ? 0 : Math.round((correct / all) * 100);
    return percent + '% (' + correct + '/' + all + ')';
  }

  function isPerfectScore(correctCount, total) {
    var correct = Number(correctCount) || 0;
    var all = Number(total) || 0;
    return all > 0 && correct === all;
  }

  /**
   * Every tag connected to a saved quiz: filter tags used at start, plus
   * tags on answered cards (or live card lookup for older quiz files).
   */
  function getQuizTags(quiz) {
    var seen = {};
    var tags = [];

    function addTag(tag) {
      if (!tag || seen[tag]) {
        return;
      }
      seen[tag] = true;
      tags.push(tag);
    }

    if (Array.isArray(quiz.selectedTags)) {
      quiz.selectedTags.forEach(addTag);
    }

    (quiz.items || []).forEach(function (item) {
      if (Array.isArray(item.tags)) {
        item.tags.forEach(addTag);
        return;
      }

      for (var i = 0; i < allCards.length; i++) {
        if (allCards[i].id === item.cardId) {
          (allCards[i].tags || []).forEach(addTag);
          break;
        }
      }
    });

    tags.sort();
    return tags;
  }

  /**
   * Human-readable tag list for a saved quiz.
   * Uses the filter tags when the quiz was narrowed; otherwise lists every
   * tag that appeared on cards in that quiz (never the vague "All tags").
   */
  function formatQuizTags(quiz) {
    if (Array.isArray(quiz.selectedTags) && quiz.selectedTags.length) {
      return quiz.selectedTags.join(', ');
    }

    var tags = getQuizTags(quiz);
    return tags.length ? tags.join(', ') : 'No tags';
  }

  /**
   * Example: "September 16th 2026 at 4:13pm"
   */
  function formatDate(iso) {
    try {
      var date = new Date(iso);
      if (isNaN(date.getTime())) {
        return iso;
      }

      var months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      var day = date.getDate();
      var suffix = 'th';
      if (day % 10 === 1 && day !== 11) {
        suffix = 'st';
      } else if (day % 10 === 2 && day !== 12) {
        suffix = 'nd';
      } else if (day % 10 === 3 && day !== 13) {
        suffix = 'rd';
      }

      var hours24 = date.getHours();
      var minutes = date.getMinutes();
      var ampm = hours24 >= 12 ? 'pm' : 'am';
      var hours12 = hours24 % 12;
      if (hours12 === 0) {
        hours12 = 12;
      }

      var minuteText = minutes < 10 ? '0' + minutes : String(minutes);

      return (
        months[date.getMonth()] +
        ' ' +
        day +
        suffix +
        ' ' +
        date.getFullYear() +
        ' at ' +
        hours12 +
        ':' +
        minuteText +
        ampm
      );
    } catch (err) {
      return iso;
    }
  }

  // ----- Sub-tabs -----
  function showTab(name) {
    var isStart = name === 'start';
    panelStart.hidden = !isStart;
    panelReview.hidden = isStart;

    tabButtons.forEach(function (button) {
      var active = button.getAttribute('data-tab') === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (!isStart) {
      loadReviewList();
    }
  }

  tabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      showTab(button.getAttribute('data-tab'));
    });
  });

  var footerGotoReview = document.getElementById('footer-goto-review');
  if (footerGotoReview) {
    footerGotoReview.addEventListener('click', function (event) {
      event.preventDefault();
      showTab('review');
    });
  }

  // ----- Setup / filters -----
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
      checkbox.name = 'quiz-tag-filter';
      checkbox.checked = isSelected;

      var text = document.createElement('span');
      text.textContent = tag;

      label.appendChild(checkbox);
      label.appendChild(text);
      tagFilter.appendChild(label);
    });
  }

  function getTagFilteredCards() {
    return filterCardsBySelectedTags(allCards, getSelectedTags());
  }

  /** Tag matches minus any cards the student unchecked from the list. */
  function getQuizReadyCards() {
    return getTagFilteredCards().filter(function (card) {
      return !excludedCardIds[card.id];
    });
  }

  function updateDeckCount() {
    var tagFiltered = getTagFilteredCards();
    var ready = getQuizReadyCards();
    var count = ready.length;

    deckCount.textContent =
      count === 1 ? 'Selected 1 card' : 'Selected ' + count + ' cards';
    renderSelectedCardLabels(tagFiltered);
    startButton.disabled = count === 0;
    return ready;
  }

  /**
   * List every tag-matched card as a toggle chip.
   * Selected = in the quiz; unselected = excluded until tags change.
   */
  function renderSelectedCardLabels(cards) {
    selectedCardsEl.innerHTML = '';

    cards.forEach(function (card) {
      var isSelected = !excludedCardIds[card.id];
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className =
        'tag-filter__option quiz-selected-card' +
        (isSelected ? ' is-selected' : '');
      chip.setAttribute('role', 'listitem');
      chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      chip.setAttribute('data-card-id', card.id);
      chip.textContent = card.frontTitle || 'Untitled';
      selectedCardsEl.appendChild(chip);
    });
  }

  function showSetupOnly() {
    quizSetup.hidden = false;
    quizSession.hidden = true;
    quizResults.hidden = true;
    answerFlash.hidden = true;
    setupMessage.textContent = '';
    isAdvancing = false;
    correctButton.disabled = false;
    incorrectButton.disabled = false;
    deckTop.classList.remove('is-sending-back');
    // Fresh setup after finishing — card unchecks reset for a new quiz.
    excludedCardIds = {};
    updateDeckCount();
  }

  // ----- Active quiz session -----
  function setCardFaceContent(showBack) {
    var card = deckCards[currentIndex];
    showingBack = showBack;
    paintCardElement(flashcard, card, showBack);
  }

  function prepareDeckLayers() {
    var underCardEl = deckUnder.querySelector('.flashcard');
    paintCardElement(flashcard, deckCards[currentIndex], false);
    showingBack = false;
    deckTop.classList.remove('is-sending-back');

    // Keep next card painted but invisible until Correct/Incorrect runs.
    if (currentIndex + 1 < deckCards.length) {
      paintCardElement(underCardEl, deckCards[currentIndex + 1], false);
    }
    deckUnder.hidden = true;
  }

  function showCurrentQuestion() {
    quizMeta.textContent =
      'Question ' + (currentIndex + 1) + ' of ' + deckCards.length;
    isFlipping = false;
    isAdvancing = false;
    correctButton.disabled = false;
    incorrectButton.disabled = false;
    prepareDeckLayers();
  }

  function startQuiz() {
    var filtered = getQuizReadyCards();

    if (!filtered.length) {
      setupMessage.textContent = 'No cards match the current filters.';
      setupMessage.className = 'form-status form-status--error';
      return;
    }

    selectedTagsForSession = getSelectedTags().slice();
    // Always randomize so each Start / New Quiz run is a fresh order.
    deckCards = shuffle(filtered);
    currentIndex = 0;
    sessionItems = [];
    showingBack = false;
    isFlipping = false;
    isAdvancing = false;

    quizSetup.hidden = true;
    quizResults.hidden = true;
    quizSession.hidden = false;
    showCurrentQuestion();
  }

  /** Center-screen green check or red X that pops then fades. */
  function flashAnswerMark(isCorrect) {
    answerFlash.classList.remove('is-correct', 'is-incorrect', 'is-animating');
    answerFlashMark.textContent = isCorrect ? '✓' : '✕';
    answerFlash.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    answerFlash.hidden = false;
    answerFlash.setAttribute('aria-hidden', 'false');

    void answerFlash.offsetWidth;
    answerFlash.classList.add('is-animating');

    setTimeout(function () {
      answerFlash.hidden = true;
      answerFlash.classList.remove('is-animating', 'is-correct', 'is-incorrect');
      answerFlash.setAttribute('aria-hidden', 'true');
    }, ANSWER_FLASH_MS);
  }

  function setAnswerButtonsEnabled(enabled) {
    correctButton.disabled = !enabled;
    incorrectButton.disabled = !enabled;
  }

  /**
   * Record Correct/Incorrect: flash mark, then send card to back of deck
   * (same animation as Study "Next").
   */
  function recordAnswer(isCorrect) {
    if (isAdvancing || isFlipping || quizSession.hidden || !deckCards.length) {
      return;
    }

    var card = deckCards[currentIndex];
    sessionItems.push({
      cardId: card.id,
      correct: isCorrect,
      frontTitle: card.frontTitle || '',
      front: card.front || '',
      back: card.back || '',
      backSubtitle: card.backSubtitle || '',
      tags: Array.isArray(card.tags) ? card.tags.slice() : []
    });

    isAdvancing = true;
    setAnswerButtonsEnabled(false);
    flashAnswerMark(isCorrect);

    var isLast = currentIndex >= deckCards.length - 1;

    // Last card: no under card — just wait for the flash, then results.
    if (isLast) {
      setTimeout(function () {
        currentIndex = currentIndex + 1;
        finishQuiz();
        isAdvancing = false;
      }, ANSWER_FLASH_MS);
      return;
    }

    paintCardElement(flashcard, deckCards[currentIndex], false);
    showingBack = false;
    paintCardElement(
      deckUnder.querySelector('.flashcard'),
      deckCards[currentIndex + 1],
      false
    );
    deckUnder.hidden = false;

    function finishAdvance() {
      if (!isAdvancing) {
        return;
      }
      isAdvancing = false;
      deckTop.removeEventListener('animationend', onAnimEnd);
      currentIndex = currentIndex + 1;
      showCurrentQuestion();
    }

    function onAnimEnd(event) {
      if (event.target !== deckTop) {
        return;
      }
      finishAdvance();
    }

    // Brief pause so the flash is visible before the card moves.
    setTimeout(function () {
      if (!isAdvancing) {
        return;
      }
      deckTop.classList.remove('is-sending-back');
      void deckTop.offsetWidth;
      deckTop.classList.add('is-sending-back');
      deckTop.addEventListener('animationend', onAnimEnd);
    }, SEND_BACK_DELAY_MS);

    setTimeout(function () {
      if (isAdvancing) {
        finishAdvance();
      }
    }, SEND_BACK_DELAY_MS + SEND_BACK_DURATION_MS + 50);
  }

  async function finishQuiz() {
    quizSession.hidden = true;
    answerFlash.hidden = true;
    deckTop.classList.remove('is-sending-back');

    var correctCount = 0;
    var wrongItems = [];
    sessionItems.forEach(function (item) {
      if (item.correct) {
        correctCount = correctCount + 1;
      } else {
        wrongItems.push(item);
      }
    });

    resultsSummary.textContent =
      'You got ' +
      correctCount +
      ' of ' +
      sessionItems.length +
      ' correct.';

    resultsWrong.innerHTML = '';
    if (!wrongItems.length) {
      resultsWrong.innerHTML = '<p class="study-meta">No incorrect answers — nice work!</p>';
    } else {
      var heading = document.createElement('h3');
      heading.textContent = 'Review these (incorrect)';
      resultsWrong.appendChild(heading);

      wrongItems.forEach(function (item) {
        var article = document.createElement('article');
        article.className = 'review-item';
        article.innerHTML =
          '<p class="review-item__title">' +
          escapeHtml(item.frontTitle || 'Untitled') +
          '</p>' +
          '<p><strong>Front:</strong> ' +
          escapeHtml(item.front) +
          '</p>' +
          '<p><strong>Back:</strong> ' +
          escapeHtml(item.back) +
          '</p>';
        resultsWrong.appendChild(article);
      });
    }

    quizResults.hidden = false;

    try {
      await window.StudyBuddyApi.createQuiz({
        selectedTags: selectedTagsForSession,
        items: sessionItems
      });
    } catch (err) {
      resultsSummary.textContent =
        resultsSummary.textContent + ' (Could not save history: ' + err.message + ')';
    }
  }

  function toggleFlip() {
    if (isFlipping || isAdvancing || quizSession.hidden || !deckCards.length) {
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

  flashcard.addEventListener('click', toggleFlip);
  flashcard.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFlip();
    }
  });

  startButton.addEventListener('click', startQuiz);
  correctButton.addEventListener('click', function () {
    recordAnswer(true);
  });
  incorrectButton.addEventListener('click', function () {
    recordAnswer(false);
  });
  tryAgainButton.addEventListener('click', showSetupOnly);
  goReviewButton.addEventListener('click', function () {
    showTab('review');
  });

  tagFilter.addEventListener('change', function (event) {
    if (event.target && event.target.name === 'quiz-tag-filter') {
      // New tag set → clear card-level unchecks so the list starts fresh.
      excludedCardIds = {};
      var selected = getSelectedTags();
      writeStoredTags(QUIZ_TAGS_STORAGE_KEY, selected);
      renderTagFilters(selected);
      updateDeckCount();
    }
  });

  // Toggle a card in/out of the upcoming quiz.
  selectedCardsEl.addEventListener('click', function (event) {
    var chip = event.target.closest('[data-card-id]');
    if (!chip) {
      return;
    }

    var id = chip.getAttribute('data-card-id');
    if (excludedCardIds[id]) {
      delete excludedCardIds[id];
    } else {
      excludedCardIds[id] = true;
    }
    updateDeckCount();
  });

  // ----- Review -----
  function collectAllQuizTags(quizzes) {
    var seen = {};
    var tags = [];

    quizzes.forEach(function (quiz) {
      getQuizTags(quiz).forEach(function (tag) {
        if (!seen[tag]) {
          seen[tag] = true;
          tags.push(tag);
        }
      });
    });

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

  function getReviewSelectedTags() {
    return Shared.getCheckedCheckboxValues(reviewTagFilter);
  }

  /** AND filter: quiz kept only if it includes every selected tag. */
  function filterQuizzesBySelectedTags(quizzes, selectedTags) {
    if (!selectedTags.length) {
      return quizzes.slice();
    }

    return quizzes.filter(function (quiz) {
      var quizTags = getQuizTags(quiz);
      for (var i = 0; i < selectedTags.length; i++) {
        if (quizTags.indexOf(selectedTags[i]) === -1) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Keep quizzes whose date, score, tags, or any card field contains the query
   * (case-insensitive). Blank query → keep every quiz.
   */
  function filterQuizzesByText(quizzes, query) {
    var needle = String(query || '')
      .trim()
      .toLowerCase();
    if (!needle) {
      return quizzes.slice();
    }

    return quizzes.filter(function (quiz) {
      var parts = [
        formatDate(quiz.createdAt),
        formatScore(quiz.correctCount, quiz.total),
        formatQuizTags(quiz),
        getQuizTags(quiz).join(' ')
      ];

      (quiz.items || []).forEach(function (item) {
        parts.push(
          item.frontTitle || '',
          item.front || '',
          item.back || '',
          item.backSubtitle || ''
        );
      });

      return parts.join('\n').toLowerCase().indexOf(needle) !== -1;
    });
  }

  function getAvailableReviewTags(selectedTags) {
    var matching = filterQuizzesBySelectedTags(allQuizzes, selectedTags);
    return collectAllQuizTags(matching);
  }

  function renderReviewTagFilters(selectedTags) {
    if (!selectedTags) {
      selectedTags = [];
    }

    var selectedLookup = {};
    selectedTags.forEach(function (tag) {
      selectedLookup[tag] = true;
    });

    var tags = getAvailableReviewTags(selectedTags);
    reviewTagFilter.innerHTML = '';

    if (!collectAllQuizTags(allQuizzes).length) {
      reviewTagFilterEmpty.hidden = false;
      return;
    }

    reviewTagFilterEmpty.hidden = true;
    tags.forEach(function (tag) {
      var isSelected = !!selectedLookup[tag];
      var label = document.createElement('label');
      label.className = 'tag-filter__option' + (isSelected ? ' is-selected' : '');

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = tag;
      checkbox.name = 'review-tag-filter';
      checkbox.checked = isSelected;

      var text = document.createElement('span');
      text.textContent = tag;

      label.appendChild(checkbox);
      label.appendChild(text);
      reviewTagFilter.appendChild(label);
    });
  }

  function renderReviewList(quizzes) {
    reviewList.innerHTML = '';

    if (!allQuizzes.length) {
      reviewListStatus.textContent = 'No quizzes yet. Finish one on “Start a quiz”.';
      return;
    }

    if (!quizzes.length) {
      reviewListStatus.textContent = 'No quizzes match the current filters.';
      return;
    }

    reviewListStatus.textContent =
      quizzes.length +
      ' saved quiz' +
      (quizzes.length === 1 ? '' : 'zes') +
      (quizzes.length === allQuizzes.length
        ? ''
        : ' (of ' + allQuizzes.length + ')');

    quizzes.forEach(function (quiz) {
      var row = document.createElement('div');
      row.className = 'review-row';

      var tagsText = formatQuizTags(quiz);

      row.innerHTML =
        '<div class="review-row__info">' +
        '<p class="review-row__date">' +
        escapeHtml(formatDate(quiz.createdAt)) +
        '</p>' +
        '<p class="review-row__tags">' +
        escapeHtml(tagsText) +
        '</p>' +
        '<p class="review-row__score' +
        (isPerfectScore(quiz.correctCount, quiz.total)
          ? ' review-row__score--perfect'
          : '') +
        '">' +
        escapeHtml(formatScore(quiz.correctCount, quiz.total)) +
        '</p>' +
        '</div>' +
        '<div class="review-row__actions">' +
        '<button type="button" class="button button--small button--secondary" data-action="open" data-id="' +
        escapeHtml(quiz.id) +
        '">Open</button> ' +
        '<button type="button" class="button button--small button--danger" data-action="delete" data-id="' +
        escapeHtml(quiz.id) +
        '">Delete</button>' +
        '</div>';

      reviewList.appendChild(row);
    });
  }

  function applyReviewFiltersAndRender() {
    var selectedTags = getReviewSelectedTags();
    var filtered = filterQuizzesBySelectedTags(allQuizzes, selectedTags);
    filtered = filterQuizzesByText(filtered, reviewTextFilter.value);
    renderReviewList(filtered);
  }

  function showReviewDetail(quiz) {
    viewingQuizId = quiz.id;
    reviewListPanel.hidden = true;
    reviewDetail.hidden = false;

    var tagsText = formatQuizTags(quiz);

    reviewDetailSummary.textContent =
      formatDate(quiz.createdAt) +
      ' — ' +
      formatScore(quiz.correctCount, quiz.total) +
      ' · ' +
      tagsText;

    reviewDetailBody.innerHTML = '';

    var allHeading = document.createElement('h3');
    allHeading.textContent = 'All answers';
    reviewDetailBody.appendChild(allHeading);

    (quiz.items || []).forEach(function (item, index) {
      var article = document.createElement('article');
      article.className = 'review-item' + (item.correct ? '' : ' review-item--wrong');
      article.innerHTML =
        '<p class="review-item__title">' +
        escapeHtml(String(index + 1) + '. ' + (item.frontTitle || 'Untitled')) +
        ' — ' +
        (item.correct ? 'Correct' : 'Incorrect') +
        '</p>' +
        '<p><strong>Front:</strong> ' +
        escapeHtml(item.front) +
        '</p>' +
        '<p><strong>Back:</strong> ' +
        escapeHtml(item.back) +
        '</p>';
      reviewDetailBody.appendChild(article);
    });
  }

  function hideReviewDetail() {
    viewingQuizId = null;
    reviewDetail.hidden = true;
    reviewListPanel.hidden = false;
  }

  async function loadReviewList() {
    hideReviewDetail();
    reviewListStatus.textContent = 'Loading…';
    try {
      allQuizzes = await window.StudyBuddyApi.getQuizzes();
      renderReviewTagFilters(getReviewSelectedTags());
      applyReviewFiltersAndRender();
    } catch (err) {
      allQuizzes = [];
      reviewListStatus.textContent = 'Could not load quizzes: ' + err.message;
      reviewList.innerHTML = '';
      reviewTagFilter.innerHTML = '';
      reviewTagFilterEmpty.hidden = true;
    }
  }

  reviewTagFilter.addEventListener('change', function (event) {
    if (event.target && event.target.name === 'review-tag-filter') {
      renderReviewTagFilters(getReviewSelectedTags());
      applyReviewFiltersAndRender();
    }
  });

  reviewTextFilter.addEventListener('input', function () {
    applyReviewFiltersAndRender();
  });

  reviewList.addEventListener('click', async function (event) {
    var button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    var action = button.getAttribute('data-action');
    var id = button.getAttribute('data-id');

    if (action === 'open') {
      try {
        var quiz = await window.StudyBuddyApi.getQuiz(id);
        showReviewDetail(quiz);
      } catch (err) {
        reviewListStatus.textContent = err.message;
      }
      return;
    }

    if (action === 'delete') {
      var confirmed = window.confirm('Delete this quiz from history?');
      if (!confirmed) {
        return;
      }
      try {
        await window.StudyBuddyApi.deleteQuiz(id);
        await loadReviewList();
      } catch (err) {
        reviewListStatus.textContent = err.message;
      }
    }
  });

  reviewDetailClose.addEventListener('click', hideReviewDetail);

  reviewDetailDelete.addEventListener('click', async function () {
    if (!viewingQuizId) {
      return;
    }
    var confirmed = window.confirm('Delete this quiz from history?');
    if (!confirmed) {
      return;
    }
    try {
      await window.StudyBuddyApi.deleteQuiz(viewingQuizId);
      await loadReviewList();
    } catch (err) {
      reviewDetailSummary.textContent = err.message;
    }
  });

  async function init() {
    try {
      allCards = await window.StudyBuddyApi.getCards();
      var restored = sanitizeStoredTags(readStoredTags(QUIZ_TAGS_STORAGE_KEY));
      renderTagFilters(restored);
      showSetupOnly();
    } catch (err) {
      deckCount.textContent = 'Selected 0 cards';
      setupMessage.textContent = err.message;
      setupMessage.className = 'form-status form-status--error';
      startButton.disabled = true;
    }
  }

  init();
})();
