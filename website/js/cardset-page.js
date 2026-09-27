/*
  cardset-page.js
  ---------------
  Cardset hub — Learn / Test / Edit tabs; import and export in ⋯ menu.
*/

let Shared = window.StudyBuddyShared;
let Api = window.StudyBuddyApi;

let cardsetId = Shared.getQueryParam('id');
let setBreadcrumb = document.getElementById('set-breadcrumb');
let statusEl = document.getElementById('set-status');
let emptyEl = document.getElementById('set-empty');
let emptyEditBtn = document.getElementById('set-empty-edit');
let studyWrap = document.getElementById('set-study-wrap');
let importInput = document.getElementById('import-set');
let setMenuBtn = document.getElementById('set-menu-button');
let setMenu = document.getElementById('set-menu');
let tabLearn = document.getElementById('tab-learn');
let tabTest = document.getElementById('tab-test');
let tabEdit = document.getElementById('tab-edit');
let panelLearn = document.getElementById('panel-learn');
let panelTest = document.getElementById('panel-test');
let panelEdit = document.getElementById('panel-edit');

let cardset = null;
let classes = [];
let parentClass = null;
let renaming = false;
let activeTab = 'learn';
let learnSession = null;
let testSession = null;
let editSession = null;

function cards() {
  return cardset && Array.isArray(cardset.cards) ? cardset.cards : [];
}

function setStatus(message, isError) {
  statusEl.textContent = message || '';
  statusEl.className =
    'form-status' +
    (isError ? ' form-status--error' : message ? ' form-status--ok' : '');
}

function findClass(id) {
  if (!id) {
    return null;
  }
  for (let i = 0; i < classes.length; i++) {
    if (classes[i].id === id) {
      return classes[i];
    }
  }
  return null;
}

function renderBreadcrumb() {
  let crumbs = [{ label: 'Home', href: '/index.html' }];
  if (parentClass) {
    crumbs.push({
      label: parentClass.title,
      href: '/class.html?id=' + encodeURIComponent(parentClass.id)
    });
  }
  crumbs.push({ label: cardset.title || 'Cardset', editable: true });
  Shared.renderBreadcrumb(setBreadcrumb, crumbs);
}

function initEditSession() {
  if (editSession) {
    return;
  }
  editSession = window.StudyBuddyCardsetEdit.create({
    elements: {
      tbody: document.getElementById('edit-cards-body'),
      addBtn: document.getElementById('edit-add-card'),
      statusEl: document.getElementById('edit-status'),
      previewHint: document.getElementById('edit-preview-hint'),
      previewCard: document.getElementById('edit-preview-card'),
      imageFileInput: document.getElementById('edit-image-file'),
      layoutEl: document.getElementById('edit-layout')
    },
    onSaved: function (updated) {
      cardset = updated;
      updateStudyVisibility();
      if (learnSession) {
        learnSession.reload(cards());
      }
      if (testSession) {
        testSession.reload(cards());
      }
    }
  });
}

function initStudySessions() {
  if (!learnSession) {
    learnSession = window.StudyBuddyLearn.create({
      elements: {
        meta: document.getElementById('learn-meta'),
        message: document.getElementById('learn-message'),
        deck: document.getElementById('learn-deck'),
        deckBase: document.getElementById('learn-deck-base'),
        deckTop: document.getElementById('learn-deck-top'),
        deckUnder: document.getElementById('learn-deck-under'),
        flashcard: document.getElementById('learn-flashcard'),
        prevBtn: document.getElementById('learn-prev'),
        nextBtn: document.getElementById('learn-next'),
        active: document.getElementById('active-learn')
      }
    });
  }

  if (!testSession) {
    testSession = window.StudyBuddyTest.create({
      hideSummaryHub: true,
      getCards: cards,
      elements: {
        meta: document.getElementById('test-meta'),
        message: document.getElementById('test-message'),
        deck: document.getElementById('test-deck'),
        deckTop: document.getElementById('test-deck-top'),
        deckUnder: document.getElementById('test-deck-under'),
        flashcard: document.getElementById('test-flashcard'),
        markCorrect: document.getElementById('test-mark-correct'),
        markIncorrect: document.getElementById('test-mark-incorrect'),
        active: document.getElementById('active-test'),
        summary: document.getElementById('test-summary'),
        summaryScore: document.getElementById('test-summary-score'),
        summaryDetail: document.getElementById('test-summary-detail'),
        retryMissedBtn: document.getElementById('test-retry-missed'),
        retryAllBtn: document.getElementById('test-retry-all'),
        answerFlash: document.getElementById('test-answer-flash')
      }
    });
  }
}

function reloadStudy() {
  let list = cards();
  learnSession.load(list);
  testSession.load(list);
}

function updateStudyVisibility() {
  let list = cards();
  let hasCards = list.length > 0;
  if (emptyEl) {
    emptyEl.hidden = hasCards || activeTab === 'edit';
  }
  if (studyWrap) {
    studyWrap.hidden = !cardset || (!hasCards && activeTab !== 'edit');
  }
}

function setTab(tab) {
  if (tab === 'test') {
    activeTab = 'test';
  } else if (tab === 'edit') {
    activeTab = 'edit';
  } else {
    activeTab = 'learn';
  }

  if (panelLearn) {
    panelLearn.hidden = activeTab !== 'learn';
  }
  if (panelTest) {
    panelTest.hidden = activeTab !== 'test';
  }
  if (panelEdit) {
    panelEdit.hidden = activeTab !== 'edit';
  }
  if (tabLearn) {
    tabLearn.classList.toggle('is-active', activeTab === 'learn');
    tabLearn.setAttribute('aria-selected', activeTab === 'learn' ? 'true' : 'false');
  }
  if (tabTest) {
    tabTest.classList.toggle('is-active', activeTab === 'test');
    tabTest.setAttribute('aria-selected', activeTab === 'test' ? 'true' : 'false');
  }
  if (tabEdit) {
    tabEdit.classList.toggle('is-active', activeTab === 'edit');
    tabEdit.setAttribute('aria-selected', activeTab === 'edit' ? 'true' : 'false');
  }

  updateStudyVisibility();

  if (activeTab === 'edit' && cardset && editSession) {
    editSession.setCardset(cardset);
  }

  if (cardsetId) {
    let url = '/cardset.html?id=' + encodeURIComponent(cardsetId);
    if (activeTab === 'test') {
      url += '&tab=test';
    } else if (activeTab === 'edit') {
      url += '&tab=edit';
    }
    window.history.replaceState({}, '', url);
  }
}

function readInitialTab() {
  let tab = (Shared.getQueryParam('tab') || 'learn').toLowerCase();
  if (tab === 'test' || tab === 'edit') {
    setTab(tab);
  } else {
    setTab('learn');
  }
}

function renderShell() {
  parentClass = findClass(cardset.classId);
  document.title = 'Study Buddy — ' + (cardset.title || 'Cardset');
  renderBreadcrumb();
  updateStudyVisibility();
}

function applyCardsToStudy() {
  initStudySessions();
  initEditSession();
  reloadStudy();
  if (cardset && editSession && activeTab === 'edit') {
    editSession.setCardset(cardset);
  }
}

async function refresh(reloadStudyFlag) {
  if (!cardsetId) {
    setStatus('Missing Cardset id in the URL.', true);
    return;
  }
  setStatus('Loading…');
  try {
    let results = await Promise.all([
      Api.getCardset(cardsetId),
      Api.getClasses()
    ]);
    cardset = results[0];
    classes = results[1];
    renderShell();
    if (reloadStudyFlag !== false) {
      applyCardsToStudy();
    }
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Could not load Cardset.', true);
  }
}

async function saveCardsetTitle(nextTitle) {
  let title = String(nextTitle || '').trim();
  if (!title) {
    setStatus('Cardset name is required.', true);
    renderBreadcrumb();
    return;
  }
  if (!cardset) {
    return;
  }
  if (title === cardset.title) {
    renderBreadcrumb();
    return;
  }
  try {
    cardset = await Api.updateCardset(cardset.id, {
      title: title,
      classId: cardset.classId,
      cards: cardset.cards || []
    });
    document.title = 'Study Buddy — ' + cardset.title;
    renderBreadcrumb();
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Could not rename Cardset.', true);
    renderBreadcrumb();
  }
}

function startBreadcrumbRename() {
  if (renaming || !cardset) {
    return;
  }
  let label = setBreadcrumb.querySelector('.breadcrumb__current--editable');
  if (!label) {
    return;
  }
  renaming = true;
  let input = document.createElement('input');
  input.type = 'text';
  input.className = 'breadcrumb__edit';
  input.value = cardset.title || '';
  input.maxLength = 120;
  input.setAttribute('aria-label', 'Rename cardset');
  label.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;
  function finish(save) {
    if (finished) {
      return;
    }
    finished = true;
    renaming = false;
    if (save) {
      saveCardsetTitle(input.value);
    } else {
      renderBreadcrumb();
    }
  }

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      input.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });

  input.addEventListener('blur', function () {
    finish(true);
  });
}

function closeSetMenu() {
  setMenu.hidden = true;
  setMenuBtn.setAttribute('aria-expanded', 'false');
}

function exportSet() {
  if (!cardset) {
    return;
  }
  let payload = Shared.buildCardsetExportPayload(cardset);
  Shared.downloadJsonFile(
    Shared.safeExportFilename(cardset.title, '.json'),
    payload
  );
  setStatus('Exported.');
}

setBreadcrumb.addEventListener('dblclick', function (event) {
  let label = event.target.closest('.breadcrumb__current--editable');
  if (!label || !setBreadcrumb.contains(label)) {
    return;
  }
  event.preventDefault();
  startBreadcrumbRename();
});

if (tabLearn) {
  tabLearn.addEventListener('click', function () {
    setTab('learn');
  });
}
if (tabTest) {
  tabTest.addEventListener('click', function () {
    setTab('test');
  });
}
if (tabEdit) {
  tabEdit.addEventListener('click', function () {
    setTab('edit');
  });
}

if (emptyEditBtn) {
  emptyEditBtn.addEventListener('click', function () {
    setTab('edit');
  });
}

setMenuBtn.addEventListener('click', function (event) {
  event.stopPropagation();
  let willOpen = setMenu.hidden;
  Shared.closeOpenMenus();
  if (willOpen) {
    setMenu.hidden = false;
    setMenuBtn.setAttribute('aria-expanded', 'true');
  }
});

setMenu.addEventListener('click', function (event) {
  event.stopPropagation();
  let item = event.target.closest('[data-menu]');
  if (!item) {
    return;
  }

  if (item.getAttribute('data-menu') === 'export') {
    closeSetMenu();
    exportSet();
    return;
  }
  if (item.getAttribute('data-menu') === 'import') {
    closeSetMenu();
    importInput.click();
  }
});

importInput.addEventListener('change', async function () {
  let file = importInput.files && importInput.files[0];
  importInput.value = '';
  if (!file || !cardset) {
    return;
  }
  try {
    let text = await file.text();
    let data = JSON.parse(text);
    if (!data || typeof data !== 'object') {
      throw new Error('Import file must be a JSON object.');
    }
    if (!Array.isArray(data.cards)) {
      throw new Error('Import file needs a cards array.');
    }
    let before = cards().length;
    let merged = Shared.appendCardsDedupe(cards(), data.cards);
    let added = merged.length - before;
    cardset = await Api.updateCardset(cardset.id, {
      title: cardset.title,
      classId: cardset.classId,
      cards: merged
    });
    renderShell();
    applyCardsToStudy();
    setStatus(
      added
        ? 'Added ' + added + ' card' + (added === 1 ? '' : 's') + '.'
        : 'No new cards.'
    );
  } catch (err) {
    setStatus(err.message || 'Could not import cards.', true);
  }
});

Shared.initChrome({
  cardsetId: cardsetId
});

readInitialTab();
refresh();

window.addEventListener('pageshow', function (event) {
  if (event.persisted && cardsetId) {
    refresh();
  }
});

window.addEventListener('beforeunload', function () {
  if (editSession) {
    editSession.syncFromDom();
  }
});
