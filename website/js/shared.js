/*
  shared.js
  ---------
  Job: helpers used by more than one page (shuffle, settings, paint, chrome).
*/

let SETTINGS_KEY = 'studyBuddy.settings';
let DEFAULT_SETTINGS = { answerWith: { term: false, definition: true } };

function shuffle(list) {
  let copy = list.slice();
  let i;
  for (i = copy.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readSettings() {
  try {
    let raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        answerWith: {
          term: DEFAULT_SETTINGS.answerWith.term,
          definition: DEFAULT_SETTINGS.answerWith.definition
        }
      };
    }
    let parsed = JSON.parse(raw);
    let term = !!(parsed.answerWith && parsed.answerWith.term);
    let definition = !!(parsed.answerWith && parsed.answerWith.definition);
    if (!term && !definition) {
      definition = true;
    }
    return { answerWith: { term: term, definition: definition } };
  } catch (err) {
    return {
      answerWith: {
        term: DEFAULT_SETTINGS.answerWith.term,
        definition: DEFAULT_SETTINGS.answerWith.definition
      }
    };
  }
}

function writeSettings(settings) {
  try {
    let term = !!(settings.answerWith && settings.answerWith.term);
    let definition = !!(settings.answerWith && settings.answerWith.definition);
    if (!term && !definition) {
      definition = true;
    }
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ answerWith: { term: term, definition: definition } })
    );
  } catch (err) {
    // Ignore storage failures.
  }
}

function pickPromptSide(settings) {
  let aw = (settings && settings.answerWith) || DEFAULT_SETTINGS.answerWith;
  if (aw.term && aw.definition) {
    return Math.random() < 0.5 ? 'term' : 'definition';
  }
  if (aw.term) {
    return 'term';
  }
  return 'definition';
}

function paintCardElement(cardEl, card, side, flipped) {
  let textEl = cardEl.querySelector('[data-field="text"]');
  let imageEl = cardEl.querySelector('[data-field="image"]');
  let titleEl = cardEl.querySelector('[data-field="title"]');
  let subtitleEl = cardEl.querySelector('[data-field="subtitle"]');

  if (flipped) {
    cardEl.classList.add('is-showing-back');
  } else {
    cardEl.classList.remove('is-showing-back');
  }

  if (titleEl) {
    titleEl.textContent = '';
    titleEl.hidden = true;
  }
  if (subtitleEl) {
    subtitleEl.textContent = '';
    subtitleEl.hidden = true;
  }

  let showTerm = side === 'term';
  if (textEl) {
    textEl.textContent = showTerm ? card.term || '' : card.definition || '';
  }

  if (imageEl) {
    if (showTerm && card.termImageUrl) {
      imageEl.src = card.termImageUrl;
      imageEl.alt = card.term || 'Term image';
      imageEl.hidden = false;
    } else {
      imageEl.removeAttribute('src');
      imageEl.alt = '';
      imageEl.hidden = true;
    }
  }
}

// Keep in sync with .flashcard { transition: transform … }
let FLIP_DURATION_MS = 550;

/**
 * Flip a flashcard with mid-animation content swap.
 * CSS counter-flips .flashcard__face so text stays upright; we change
 * term/definition at the halfway point (scaleX ≈ 0) so nothing reads backwards.
 */
function flipCardElement(cardEl, card, frontSide) {
  if (!cardEl || !card || cardEl.getAttribute('data-flipping') === '1') {
    return;
  }
  let showingBack = cardEl.classList.contains('is-showing-back');
  let nextFlipped = !showingBack;
  let nextSide =
    nextFlipped
      ? frontSide === 'term'
        ? 'definition'
        : 'term'
      : frontSide || 'term';

  cardEl.setAttribute('data-flipping', '1');
  // Start the scaleX animation immediately (class only — keep old text until mid).
  if (nextFlipped) {
    cardEl.classList.add('is-showing-back');
  } else {
    cardEl.classList.remove('is-showing-back');
  }

  window.setTimeout(function () {
    paintCardElement(cardEl, card, nextSide, nextFlipped);
  }, FLIP_DURATION_MS / 2);

  window.setTimeout(function () {
    cardEl.removeAttribute('data-flipping');
  }, FLIP_DURATION_MS);
}

/**
 * FLIP swap: after DOM reorder, fly each tile from its old rect to its new spot.
 * firstRectA / firstRectB = getBoundingClientRect() before the swap.
 */
function animateTileSwap(firstRectA, firstRectB, elA, elB, durationMs) {
  durationMs = durationMs || 350;
  if (!elA || !elB || !firstRectA || !firstRectB) {
    return Promise.resolve();
  }
  let a1 = elA.getBoundingClientRect();
  let b1 = elB.getBoundingClientRect();

  elA.style.transition = 'none';
  elB.style.transition = 'none';
  elA.style.transform =
    'translate(' +
    (firstRectA.left - a1.left) +
    'px, ' +
    (firstRectA.top - a1.top) +
    'px)';
  elB.style.transform =
    'translate(' +
    (firstRectB.left - b1.left) +
    'px, ' +
    (firstRectB.top - b1.top) +
    'px)';
  elA.style.zIndex = '6';
  elB.style.zIndex = '5';
  elA.offsetWidth;

  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      elA.style.transition = 'transform ' + durationMs + 'ms ease';
      elB.style.transition = 'transform ' + durationMs + 'ms ease';
      elA.style.transform = '';
      elB.style.transform = '';
      window.setTimeout(function () {
        elA.style.transition = '';
        elB.style.transition = '';
        elA.style.zIndex = '';
        elB.style.zIndex = '';
        resolve();
      }, durationMs);
    });
  });
}

function swapItemsById(list, idA, idB) {
  let i = -1;
  let j = -1;
  for (let n = 0; n < list.length; n++) {
    if (list[n].id === idA) {
      i = n;
    }
    if (list[n].id === idB) {
      j = n;
    }
  }
  if (i < 0 || j < 0 || i === j) {
    return false;
  }
  let tmp = list[i];
  list[i] = list[j];
  list[j] = tmp;
  return true;
}

function getQueryParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch (err) {
    return null;
  }
}

/**
 * Close any open header / overflow menus.
 */
function closeOpenMenus() {
  document.querySelectorAll('.add-menu__panel').forEach(function (panel) {
    panel.hidden = true;
  });
  document.querySelectorAll('[aria-expanded="true"]').forEach(function (btn) {
    if (btn.id === 'open-settings') {
      return;
    }
    btn.setAttribute('aria-expanded', 'false');
  });
}

/** Close modal dialogs when the user clicks the backdrop (outside the panel). */
function wireDialogBackdropClose(dialog) {
  if (!dialog || dialog.dataset.backdropClose === '1') {
    return;
  }
  dialog.dataset.backdropClose = '1';
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) {
      return;
    }
    dialog.close();
  });
}

function wireAllAppDialogs() {
  document.querySelectorAll('dialog.app-dialog').forEach(wireDialogBackdropClose);
}

/** Pre-select Class or Cardset on create dialogs from the current URL. */
function getCreateContext() {
  let path = window.location.pathname || '';
  let id = getQueryParam('id');
  if (!id) {
    return { kind: 'home' };
  }
  if (path.indexOf('class.html') !== -1) {
    return { kind: 'class', classId: id };
  }
  if (
    path.indexOf('cardset.html') !== -1 ||
    path.indexOf('cardset-edit.html') !== -1 ||
    path.indexOf('learn.html') !== -1 ||
    path.indexOf('test.html') !== -1
  ) {
    return { kind: 'cardset', cardsetId: id };
  }
  return { kind: 'home' };
}

function fillSelect(select, placeholder, options, preferredId) {
  let html =
    '<option value="">' + escapeHtml(placeholder) + '</option>';
  for (let i = 0; i < options.length; i++) {
    html +=
      '<option value="' +
      escapeHtml(options[i].value) +
      '">' +
      escapeHtml(options[i].label) +
      '</option>';
  }
  select.innerHTML = html;
  select.value = preferredId || '';
  if (select.value !== (preferredId || '')) {
    select.value = '';
  }
}

// --- Settings dialog ---

let settingsDialogWired = false;

function ensureSettingsDialog() {
  if (document.getElementById('settings-dialog')) {
    return;
  }
  document.body.insertAdjacentHTML(
    'beforeend',
    '<dialog id="settings-dialog" class="app-dialog settings-dialog">' +
      '<form method="dialog" id="settings-form" class="card-form">' +
      '<h2 id="settings-title">Settings</h2>' +
      '<fieldset class="settings-fieldset">' +
      '<legend>Answer with</legend>' +
      '<p class="field-hint">Prompt side in Learn and Test. Pick at least one.</p>' +
      '<label class="settings-check">' +
      '<input type="checkbox" id="answer-term" /> Term' +
      '</label>' +
      '<label class="settings-check">' +
      '<input type="checkbox" id="answer-definition" /> Definition' +
      '</label>' +
      '</fieldset>' +
      '<p id="settings-status" class="form-status" role="status"></p>' +
      '<div class="card-form__actions">' +
      '<button type="submit" value="cancel" class="button button--secondary" formnovalidate>Cancel</button>' +
      '<button type="submit" value="save" class="button">Save</button>' +
      '</div>' +
      '</form>' +
      '</dialog>'
  );
  wireDialogBackdropClose(document.getElementById('settings-dialog'));
}

function wireSettingsDialog() {
  if (settingsDialogWired) {
    return;
  }
  ensureSettingsDialog();
  settingsDialogWired = true;

  let dialog = document.getElementById('settings-dialog');
  let form = document.getElementById('settings-form');
  let termBox = document.getElementById('answer-term');
  let defBox = document.getElementById('answer-definition');
  let statusEl = document.getElementById('settings-status');

  function setSettingsStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.className =
      'form-status' +
      (isError ? ' form-status--error' : message ? ' form-status--ok' : '');
  }

  form.addEventListener('submit', function (event) {
    let submitter = event.submitter;
    let value = submitter ? submitter.value : 'cancel';
    if (value === 'cancel') {
      return;
    }
    event.preventDefault();
    if (!termBox.checked && !defBox.checked) {
      setSettingsStatus('Pick at least one: Term or Definition.', true);
      return;
    }
    writeSettings({
      answerWith: { term: termBox.checked, definition: defBox.checked }
    });
    setSettingsStatus('Saved.');
    window.setTimeout(function () {
      dialog.close();
    }, 250);
  });
}

function openSettingsDialog() {
  ensureSettingsDialog();
  wireSettingsDialog();
  let dialog = document.getElementById('settings-dialog');
  let termBox = document.getElementById('answer-term');
  let defBox = document.getElementById('answer-definition');
  let statusEl = document.getElementById('settings-status');
  let settings = readSettings();
  termBox.checked = !!settings.answerWith.term;
  defBox.checked = !!settings.answerWith.definition;
  statusEl.textContent = '';
  statusEl.className = 'form-status';
  dialog.showModal();
}

let newCardsetDialogWired = false;

// --- Create cardset dialog ---

function ensureNewCardsetDialog() {
  if (document.getElementById('new-cardset-dialog')) {
    return;
  }
  document.body.insertAdjacentHTML(
    'beforeend',
    '<dialog id="new-cardset-dialog" class="app-dialog">' +
      '<form method="dialog" id="new-cardset-form" class="card-form">' +
      '<h2>New Cardset</h2>' +
      '<label for="new-cardset-title">Title</label>' +
      '<input type="text" id="new-cardset-title" maxlength="120" placeholder="Cardset title" />' +
      '<label for="new-cardset-class">Class</label>' +
      '<select id="new-cardset-class"></select>' +
      '<p id="new-cardset-status" class="form-status" role="status"></p>' +
      '<div class="card-form__actions">' +
      '<button type="button" id="new-cardset-cancel" class="button button--secondary">Cancel</button>' +
      '<button type="submit" id="new-cardset-submit" class="button">Create</button>' +
      '</div>' +
      '</form>' +
      '</dialog>'
  );
  wireDialogBackdropClose(document.getElementById('new-cardset-dialog'));
}

function wireNewCardsetDialog() {
  if (newCardsetDialogWired) {
    return;
  }
  ensureNewCardsetDialog();
  newCardsetDialogWired = true;

  let dialog = document.getElementById('new-cardset-dialog');
  let form = document.getElementById('new-cardset-form');
  let titleInput = document.getElementById('new-cardset-title');
  let classSelect = document.getElementById('new-cardset-class');
  let statusEl = document.getElementById('new-cardset-status');
  let saving = false;

  function setDialogStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.className =
      'form-status' +
      (isError ? ' form-status--error' : message ? ' form-status--ok' : '');
  }

  document.getElementById('new-cardset-cancel').addEventListener('click', function () {
    dialog.close();
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (saving) {
      return;
    }
    let title = titleInput.value.trim() || 'Untitled cardset';
    let classId = classSelect.value;
    if (!classId) {
      setDialogStatus('Choose a class.', true);
      classSelect.focus();
      return;
    }
    saving = true;
    try {
      setDialogStatus('Creating…');
      let created = await window.StudyBuddyApi.createCardset({
        title: title,
        classId: classId,
        cards: []
      });
      dialog.close();
      let onCreated = dialog._onCreated;
      let ctx = getCreateContext();
      if (
        ctx.kind === 'class' &&
        ctx.classId === classId &&
        typeof onCreated === 'function'
      ) {
        onCreated(created);
      } else {
        window.location.href = '/class.html?id=' + encodeURIComponent(classId);
      }
    } catch (err) {
      setDialogStatus(err.message || 'Could not create Cardset.', true);
    } finally {
      saving = false;
    }
  });

  dialog._setStatus = setDialogStatus;
}

async function openNewCardsetDialog(options) {
  options = options || {};
  ensureNewCardsetDialog();
  wireNewCardsetDialog();
  let dialog = document.getElementById('new-cardset-dialog');
  dialog._onCreated =
    typeof options.onCreated === 'function' ? options.onCreated : null;
  document.getElementById('new-cardset-title').value = '';
  dialog._setStatus('Loading classes…');
  dialog.showModal();
  try {
    let classes = await window.StudyBuddyApi.getClasses();
    let preferred = options.classId || null;
    if (!preferred) {
      let ctx = getCreateContext();
      if (ctx.kind === 'class') {
        preferred = ctx.classId;
      } else if (ctx.kind === 'cardset' && ctx.cardsetId) {
        let set = await window.StudyBuddyApi.getCardset(ctx.cardsetId);
        preferred = set && set.classId;
      }
    }
    fillSelect(
      document.getElementById('new-cardset-class'),
      'Choose a class',
      classes.map(function (classObj) {
        return { value: classObj.id, label: classObj.title || 'Untitled class' };
      }),
      preferred
    );
    dialog._setStatus(
      classes.length ? '' : 'No classes.',
      !classes.length
    );
  } catch (err) {
    dialog._setStatus(err.message || 'Could not load classes.', true);
  }
  document.getElementById('new-cardset-title').focus();
}

// --- Header chrome (+ menu, settings gear) ---

function initChrome(options) {
  options = options || {};
  wireAllAppDialogs();
  let addBtn = document.getElementById('add-menu-button');
  let addMenu = document.getElementById('add-menu');

  if (addBtn) {
    if (!addBtn.getAttribute('aria-label')) {
      addBtn.setAttribute('aria-label', 'Create');
    }
  }

  if (addBtn && addMenu) {
    addBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      let willOpen = addMenu.hidden;
      closeOpenMenus();
      if (willOpen) {
        addMenu.hidden = false;
        addBtn.setAttribute('aria-expanded', 'true');
      }
    });

    addMenu.addEventListener('click', async function (event) {
      event.stopPropagation();
      let item = event.target.closest('[data-action]');
      if (!item) {
        return;
      }
      let action = item.getAttribute('data-action');
      closeOpenMenus();
      if (action === 'new-class') {
        if (typeof options.onNewClass === 'function') {
          options.onNewClass();
        } else {
          window.location.href = '/index.html?new=class';
        }
      } else if (action === 'new-cardset') {
        if (typeof options.onNewCardset === 'function') {
          options.onNewCardset();
        } else {
          openNewCardsetDialog({
            classId: options.classId || null,
            onCreated: options.onCardsetCreated
          });
        }
      }
    });
  }

  let settingsBtn = document.getElementById('open-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      closeOpenMenus();
      openSettingsDialog();
    });
  }

  document.addEventListener('click', function () {
    closeOpenMenus();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeOpenMenus();
    }
  });
}

// --- Breadcrumb ---

function renderBreadcrumb(container, crumbs) {
  if (!container || !crumbs || !crumbs.length) {
    return;
  }
  container.innerHTML = crumbs
    .map(function (crumb, index) {
      let sep =
        index === 0
          ? ''
          : ' <span class="breadcrumb__sep" aria-hidden="true">/</span> ';
      if (crumb.href) {
        return (
          sep +
          '<a href="' +
          escapeHtml(crumb.href) +
          '">' +
          escapeHtml(crumb.label) +
          '</a>'
        );
      }
      let editableClass = crumb.editable
        ? ' breadcrumb__current--editable'
        : '';
      let title = crumb.editable ? ' title="Double-click to rename"' : '';
      return (
        sep +
        '<span class="breadcrumb__current' +
        editableClass +
        '" aria-current="page"' +
        title +
        '>' +
        escapeHtml(crumb.label) +
        '</span>'
      );
    })
    .join('');
}

// --- Import / export helpers ---

function downloadJsonFile(filename, payload) {
  let blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  let url = URL.createObjectURL(blob);
  let link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeCardForExport(card) {
  return {
    id: card.id,
    term: card.term || '',
    definition: card.definition || '',
    termImageUrl: card.termImageUrl || ''
  };
}

function buildCardsetExportPayload(cardset) {
  return {
    title: cardset.title || 'Cardset',
    cards: (cardset.cards || []).map(normalizeCardForExport)
  };
}

function buildClassExportPayload(classObj, cardsets) {
  return {
    title: classObj.title || 'Class',
    coverImageUrl: classObj.coverImageUrl || '',
    cardsets: (cardsets || []).map(function (set) {
      return {
        title: set.title || 'Cardset',
        cards: (set.cards || []).map(normalizeCardForExport)
      };
    })
  };
}

function cardDedupeKey(card) {
  let id = String(card.id || '').trim();
  if (id) {
    return 'id:' + id;
  }
  let term = String(card.term || '')
    .trim()
    .toLowerCase();
  let def = String(card.definition || '')
    .trim()
    .toLowerCase();
  return 'pair:' + term + '\0' + def;
}

function appendCardsDedupe(existingCards, incomingCards) {
  let keys = {};
  let existingIds = {};
  (existingCards || []).forEach(function (card) {
    keys[cardDedupeKey(card)] = true;
    if (card.id) {
      existingIds[String(card.id)] = true;
    }
  });
  let merged = (existingCards || []).slice();
  (incomingCards || []).forEach(function (card, index) {
    let key = cardDedupeKey(card);
    if (keys[key]) {
      return;
    }
    keys[key] = true;
    let next = {
      id: card.id,
      term: card.term || '',
      definition: card.definition || '',
      termImageUrl: card.termImageUrl || ''
    };
    if (!next.id || existingIds[String(next.id)]) {
      next.id = 'card-' + Date.now() + '-' + index;
    }
    existingIds[String(next.id)] = true;
    merged.push(next);
  });
  return merged;
}

function safeExportFilename(title, suffix) {
  let base = String(title || 'export')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return (base || 'export') + suffix;
}

window.StudyBuddyShared = {
  shuffle: shuffle,
  escapeHtml: escapeHtml,
  readSettings: readSettings,
  writeSettings: writeSettings,
  pickPromptSide: pickPromptSide,
  paintCardElement: paintCardElement,
  flipCardElement: flipCardElement,
  animateTileSwap: animateTileSwap,
  swapItemsById: swapItemsById,
  FLIP_DURATION_MS: FLIP_DURATION_MS,
  getQueryParam: getQueryParam,
  initChrome: initChrome,
  closeOpenMenus: closeOpenMenus,
  renderBreadcrumb: renderBreadcrumb,
  openNewCardsetDialog: openNewCardsetDialog,
  openSettingsDialog: openSettingsDialog,
  downloadJsonFile: downloadJsonFile,
  buildCardsetExportPayload: buildCardsetExportPayload,
  buildClassExportPayload: buildClassExportPayload,
  appendCardsDedupe: appendCardsDedupe,
  safeExportFilename: safeExportFilename
};
