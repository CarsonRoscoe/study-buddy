/*
  study-test.js
  -------------
  Test mode: one pass, Correct/Incorrect, end score (cardset.html Test tab).
*/

function createTestSession(options) {
  options = options || {};
  let els = options.elements || {};
  let hideSummaryHub = !!options.hideSummaryHub;

  let deck = [];
  let promptSides = [];
  let index = 0;
  let showingAnswer = false;
  let correctCount = 0;
  let incorrectCount = 0;
  let busy = false;
  let getCards = options.getCards;
  let wrongIds = [];
  let lastWrongIds = [];

  function answerSide(side) {
    return side === 'term' ? 'definition' : 'term';
  }

  let confettiTimer = null;

  function clearConfetti() {
    if (confettiTimer) {
      window.clearTimeout(confettiTimer);
      confettiTimer = null;
    }
    document.querySelectorAll('.confetti-layer').forEach(function (layer) {
      layer.remove();
    });
  }

  function launchConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    clearConfetti();
    let layer = document.createElement('div');
    layer.className = 'confetti-layer';
    layer.setAttribute('aria-hidden', 'true');
    let colors = [
      '#e74c3c',
      '#3498db',
      '#2ecc71',
      '#f1c40f',
      '#9b59b6',
      '#e67e22',
      '#1abc9c',
      '#16a085'
    ];
    for (let i = 0; i < 110; i++) {
      let piece = document.createElement('span');
      piece.className = 'confetti-piece';
      if (Math.random() > 0.55) {
        piece.classList.add('confetti-piece--round');
      } else if (Math.random() > 0.5) {
        piece.classList.add('confetti-piece--wide');
      }
      piece.style.setProperty('--confetti-left', Math.random() * 100 + '%');
      piece.style.setProperty('--confetti-drift', (Math.random() - 0.5) * 55 + 'vw');
      piece.style.setProperty('--confetti-delay', Math.random() * 2 + 's');
      piece.style.setProperty('--confetti-duration', 3.2 + Math.random() * 3.3 + 's');
      piece.style.setProperty('--confetti-spin', Math.floor(Math.random() * 3 + 2) * 360 + 'deg');
      piece.style.setProperty('--confetti-color', colors[i % colors.length]);
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    confettiTimer = window.setTimeout(clearConfetti, 10000);
  }

  function showMessage(text) {
    if (!els.message) {
      return;
    }
    if (!text) {
      els.message.hidden = true;
      els.message.textContent = '';
      return;
    }
    els.message.hidden = false;
    els.message.textContent = text;
  }

  function paintSlot(slotEl, card, side, flipped) {
    if (!slotEl || !card) {
      return;
    }
    let cardEl = slotEl.querySelector('.flashcard');
    if (cardEl) {
      window.StudyBuddyShared.paintCardElement(cardEl, card, side, flipped);
    }
  }

  function updateMeta() {
    if (!els.meta) {
      return;
    }
    if (!deck.length) {
      els.meta.textContent = 'No cards in this set.';
      return;
    }
    els.meta.textContent =
      'Card ' +
      (index + 1) +
      ' of ' +
      deck.length +
      ' · Correct ' +
      correctCount +
      ' · Incorrect ' +
      incorrectCount;
  }

  function buildPromptSides(cards) {
    let settings = window.StudyBuddyShared.readSettings();
    return cards.map(function () {
      return window.StudyBuddyShared.pickPromptSide(settings);
    });
  }

  function refreshView() {
    let card = deck[index];
    let under = deck[index + 1];
    if (!card) {
      finishSession();
      return;
    }

    if (els.active) {
      els.active.hidden = false;
    }
    if (els.summary) {
      els.summary.hidden = true;
    }
    showMessage('');
    if (els.deck) {
      els.deck.hidden = false;
    }
    if (els.markCorrect) {
      els.markCorrect.hidden = false;
    }
    if (els.markIncorrect) {
      els.markIncorrect.hidden = false;
    }
    showingAnswer = false;

    let side = promptSides[index] || 'definition';
    paintSlot(els.deckTop, card, side, false);
    if (under && els.deckUnder) {
      els.deckUnder.hidden = false;
      paintSlot(els.deckUnder, under, promptSides[index + 1] || 'definition', false);
    } else if (els.deckUnder) {
      els.deckUnder.hidden = true;
    }
    updateMeta();
  }

  function flipCard() {
    if (busy || !deck[index]) {
      return;
    }
    showingAnswer = !showingAnswer;
    let prompt = promptSides[index] || 'definition';
    let side = showingAnswer ? answerSide(prompt) : prompt;
    paintSlot(els.deckTop, deck[index], side, showingAnswer);
  }

  function flashMark(isCorrect) {
    return new Promise(function (resolve) {
      if (!els.answerFlash) {
        resolve();
        return;
      }
      els.answerFlash.hidden = false;
      els.answerFlash.className =
        'answer-flash is-animating ' + (isCorrect ? 'is-correct' : 'is-incorrect');
      let mark = els.answerFlash.querySelector('.answer-flash__mark');
      if (mark) {
        mark.textContent = isCorrect ? '✓' : '✗';
      }
      window.setTimeout(function () {
        els.answerFlash.hidden = true;
        els.answerFlash.className = 'answer-flash';
        resolve();
      }, 700);
    });
  }

  async function grade(isCorrect) {
    if (busy || !deck[index]) {
      return;
    }
    busy = true;
    if (isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
      let id = deck[index].id;
      if (wrongIds.indexOf(id) === -1) {
        wrongIds.push(id);
      }
    }
    await flashMark(isCorrect);

    if (els.deckTop) {
      els.deckTop.classList.add('is-sending-back');
    }
    window.setTimeout(function () {
      if (els.deckTop) {
        els.deckTop.classList.remove('is-sending-back');
      }
      index += 1;
      busy = false;
      if (index >= deck.length) {
        finishSession();
      } else {
        refreshView();
      }
    }, 620);
  }

  function finishSession() {
    if (els.deck) {
      els.deck.hidden = true;
    }
    if (els.markCorrect) {
      els.markCorrect.hidden = true;
    }
    if (els.markIncorrect) {
      els.markIncorrect.hidden = true;
    }
    if (els.active) {
      els.active.hidden = true;
    }
    let total = correctCount + incorrectCount;
    let pct = total ? Math.round((correctCount / total) * 100) : 0;
    let perfect = total > 0 && pct === 100;

    if (els.summary) {
      els.summary.hidden = false;
      els.summary.classList.toggle('is-perfect', perfect);
    }

    if (els.summaryScore) {
      els.summaryScore.textContent = correctCount + ' / ' + total + ' correct (' + pct + '%)';
    }
    if (els.summaryDetail) {
      els.summaryDetail.textContent = perfect ? 'Perfect score!' : '';
    }
    if (els.meta) {
      els.meta.textContent = 'Complete';
    }
    lastWrongIds = wrongIds.slice();
    if (els.retryMissedBtn) {
      els.retryMissedBtn.hidden = !(lastWrongIds.length && !perfect);
    }
    if (els.retryAllBtn) {
      els.retryAllBtn.hidden = false;
    }
    if (perfect) {
      launchConfetti();
    } else {
      clearConfetti();
    }
  }

  function beginDeck(cardList) {
    deck = window.StudyBuddyShared.shuffle(cardList.slice());
    promptSides = buildPromptSides(deck);
    index = 0;
    correctCount = 0;
    incorrectCount = 0;
    wrongIds = [];
    if (els.summary) {
      els.summary.hidden = true;
      els.summary.classList.remove('is-perfect');
    }
    refreshView();
  }

  function startFresh(cards) {
    clearConfetti();
    beginDeck(cards);
  }

  function startRetryMissed() {
    clearConfetti();
    if (typeof getCards !== 'function') {
      return;
    }
    let all = getCards();
    let byId = {};
    all.forEach(function (c) {
      byId[c.id] = c;
    });
    let missed = lastWrongIds
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);
    if (!missed.length) {
      startFresh(all);
      return;
    }
    beginDeck(missed);
  }

  function wireEvents() {
    if (els.flashcard) {
      els.flashcard.addEventListener('click', flipCard);
      els.flashcard.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          flipCard();
        }
      });
    }
    if (els.markCorrect) {
      els.markCorrect.addEventListener('click', function () {
        grade(true);
      });
    }
    if (els.markIncorrect) {
      els.markIncorrect.addEventListener('click', function () {
        grade(false);
      });
    }
    if (els.retryAllBtn) {
      els.retryAllBtn.addEventListener('click', function () {
        if (typeof getCards === 'function') {
          startFresh(getCards());
        }
      });
    }
    if (els.retryMissedBtn) {
      els.retryMissedBtn.addEventListener('click', function () {
        startRetryMissed();
      });
    }
  }

  function showEmpty(message) {
    if (els.meta) {
      els.meta.textContent = 'No cards in this set.';
    }
    showMessage(message || 'No cards.');
    if (els.deck) {
      els.deck.hidden = true;
    }
    if (els.markCorrect) {
      els.markCorrect.hidden = true;
    }
    if (els.markIncorrect) {
      els.markIncorrect.hidden = true;
    }
    if (els.active) {
      els.active.hidden = true;
    }
    if (els.summary) {
      els.summary.hidden = true;
    }
  }

  function load(cards) {
    if (!Array.isArray(cards) || !cards.length) {
      showEmpty();
      return;
    }

    startFresh(cards);
  }

  wireEvents();

  if (els.summaryHub && hideSummaryHub) {
    els.summaryHub.hidden = true;
  }

  return {
    load: load,
    reload: function (cards) {
      load(cards);
    }
  };
}

window.StudyBuddyTest = {
  create: createTestSession
};
