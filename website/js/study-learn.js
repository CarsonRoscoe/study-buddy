/*
  study-learn.js
  --------------
  Learn mode: browse cards with previous / next; flip to see the other side.
  At the last card, Next becomes reshuffle (shuffle animation + restart).
*/

var RESHUFFLE_ARC_DURATION_MS = 380;
var RESHUFFLE_CYCLES_PER_SIDE = 3;

function createLearnSession(options) {
  options = options || {};
  let els = options.elements || {};

  let deck = [];
  let promptSides = [];
  let index = 0;
  let showingAnswer = false;
  let isReshuffling = false;

  function answerSide(side) {
    return side === 'term' ? 'definition' : 'term';
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
    els.meta.textContent = 'Card ' + (index + 1) + ' of ' + deck.length;
  }

  function setNextButtonMode(isReshuffle) {
    if (!els.nextBtn) {
      return;
    }
    let nextGlyph = els.nextBtn.querySelector('.study-nav__glyph--next');
    let reshuffleGlyph = els.nextBtn.querySelector('.study-nav__glyph--reshuffle');
    if (nextGlyph) {
      nextGlyph.hidden = isReshuffle;
    }
    if (reshuffleGlyph) {
      reshuffleGlyph.hidden = !isReshuffle;
    }
    els.nextBtn.classList.toggle('study-nav__btn--reshuffle', isReshuffle);
    if (isReshuffle) {
      els.nextBtn.setAttribute('aria-label', 'Reshuffle and restart');
      els.nextBtn.title = 'Reshuffle';
    } else {
      els.nextBtn.setAttribute('aria-label', 'Next card');
      els.nextBtn.title = 'Next';
    }
  }

  function updateNav() {
    let atLast = deck.length > 0 && index >= deck.length - 1;
    if (els.prevBtn) {
      els.prevBtn.disabled = isReshuffling || index <= 0;
    }
    if (els.nextBtn) {
      els.nextBtn.disabled = isReshuffling || !deck.length;
      setNextButtonMode(atLast);
    }
  }

  function buildPromptSides(cards) {
    let settings = window.StudyBuddyShared.readSettings();
    return cards.map(function () {
      return window.StudyBuddyShared.pickPromptSide(settings);
    });
  }

  function refreshView() {
    if (!deck.length) {
      showEmpty();
      return;
    }

    if (els.active) {
      els.active.hidden = false;
    }
    showMessage('');
    if (els.deck) {
      els.deck.hidden = false;
    }
    if (els.deckBase) {
      els.deckBase.hidden = true;
    }

    let card = deck[index];
    let under = deck[index + 1];
    showingAnswer = false;

    let side = promptSides[index] || 'definition';
    paintSlot(els.deckTop, card, side, false);
    if (under && els.deckUnder) {
      els.deckUnder.hidden = false;
      paintSlot(els.deckUnder, under, promptSides[index + 1] || 'definition', false);
    } else if (els.deckUnder) {
      els.deckUnder.hidden = true;
    }
    if (els.flashcard) {
      els.flashcard.classList.remove('is-showing-back');
    }
    updateMeta();
    updateNav();
  }

  function flipCard() {
    if (isReshuffling || !deck[index]) {
      return;
    }
    showingAnswer = !showingAnswer;
    let prompt = promptSides[index] || 'definition';
    let side = showingAnswer ? answerSide(prompt) : prompt;
    paintSlot(els.deckTop, deck[index], side, showingAnswer);
  }

  function playReshuffleAnimation(onDone) {
    if (!els.deckTop || !els.deckUnder || !els.deckBase || !els.flashcard) {
      onDone();
      return;
    }

    isReshuffling = true;
    updateNav();
    showMessage('');

    let baseCardEl = els.deckBase.querySelector('.flashcard');
    let underCardEl = els.deckUnder.querySelector('.flashcard');
    let emptyCard = { id: '', term: '', definition: '' };
    let grabCount = RESHUFFLE_CYCLES_PER_SIDE * 2;
    let shuffle = window.StudyBuddyShared.shuffle;
    let paint = window.StudyBuddyShared.paintCardElement;

    let nextOrder = shuffle(deck.slice());
    let finalTop = nextOrder[0] || emptyCard;
    let currentTop = deck[index] || deck[0] || emptyCard;
    let pool = shuffle(deck.slice());
    let animStack = [currentTop];
    let i;
    for (i = 1; i < grabCount; i++) {
      animStack.push(pool[i % pool.length] || emptyCard);
    }
    animStack.push(finalTop);

    function paintBaseTop() {
      paint(baseCardEl, animStack[0] || finalTop, 'definition', false);
    }

    function hideFlyer(slot) {
      slot.classList.add('is-reshuffle-hidden');
    }

    function showFlyer(slot) {
      slot.classList.remove('is-reshuffle-hidden');
    }

    els.deckBase.hidden = false;
    els.deckUnder.hidden = false;
    paintBaseTop();
    hideFlyer(els.deckTop);
    hideFlyer(els.deckUnder);
    showingAnswer = false;
    els.flashcard.classList.remove('is-showing-back');

    els.deckTop.classList.remove(
      'is-sending-back',
      'is-reshuffling-left',
      'is-reshuffling-right'
    );
    els.deckUnder.classList.remove('is-reshuffling-left', 'is-reshuffling-right');

    let duration = RESHUFFLE_ARC_DURATION_MS;
    let half = Math.round(duration / 2);
    let leftDone = false;
    let rightDone = false;
    let finished = false;

    function finishReshuffle() {
      if (finished) {
        return;
      }
      if (!leftDone || !rightDone) {
        return;
      }
      finished = true;
      els.deckTop.classList.remove(
        'is-reshuffling-left',
        'is-reshuffling-right',
        'is-reshuffle-hidden'
      );
      els.deckUnder.classList.remove(
        'is-reshuffling-left',
        'is-reshuffling-right',
        'is-reshuffle-hidden'
      );

      deck = nextOrder;
      promptSides = buildPromptSides(deck);
      index = 0;
      showingAnswer = false;

      let side = promptSides[0] || 'definition';
      paint(els.flashcard, finalTop, side, false);
      els.deckUnder.hidden = true;
      els.deckBase.hidden = true;
      void els.deckTop.offsetWidth;
      void els.deckUnder.offsetWidth;

      isReshuffling = false;
      refreshView();
      if (typeof onDone === 'function') {
        onDone();
      }
    }

    function runArc(slot, className, then) {
      let settled = false;

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
      window.setTimeout(settle, duration + 80);
    }

    function grabAndAnimate(slot, cardEl, className, then) {
      let grabbed = animStack.shift() || emptyCard;
      paint(cardEl, grabbed, 'definition', false);
      paintBaseTop();
      runArc(slot, className, then);
    }

    function runSide(slot, cardEl, className, onSideDone) {
      let cycle = 0;

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

    runSide(els.deckTop, els.flashcard, 'is-reshuffling-left', function () {
      leftDone = true;
      finishReshuffle();
    });

    window.setTimeout(function () {
      runSide(els.deckUnder, underCardEl, 'is-reshuffling-right', function () {
        rightDone = true;
        finishReshuffle();
      });
    }, half);
  }

  function go(delta) {
    if (isReshuffling || !deck.length) {
      return;
    }
    if (delta > 0 && index >= deck.length - 1) {
      playReshuffleAnimation();
      return;
    }
    let next = index + delta;
    if (next < 0 || next >= deck.length) {
      return;
    }
    index = next;
    refreshView();
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
    if (els.prevBtn) {
      els.prevBtn.addEventListener('click', function () {
        go(-1);
      });
    }
    if (els.nextBtn) {
      els.nextBtn.addEventListener('click', function () {
        go(1);
      });
    }
    if (els.active) {
      els.active.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          go(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          go(1);
        }
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
    if (els.deckBase) {
      els.deckBase.hidden = true;
    }
    if (els.active) {
      els.active.hidden = true;
    }
    if (els.prevBtn) {
      els.prevBtn.disabled = true;
    }
    if (els.nextBtn) {
      els.nextBtn.disabled = true;
      setNextButtonMode(false);
    }
  }

  function load(cards) {
    if (!Array.isArray(cards) || !cards.length) {
      deck = [];
      showEmpty();
      return;
    }
    deck = cards.slice();
    promptSides = buildPromptSides(deck);
    index = 0;
    isReshuffling = false;
    refreshView();
  }

  wireEvents();

  return {
    load: load,
    reload: function (cards) {
      load(cards);
    }
  };
}

window.StudyBuddyLearn = {
  create: createLearnSession
};
