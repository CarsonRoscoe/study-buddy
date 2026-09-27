/*
  class-page.js
  -------------
  Job: Class folder — Cardsets in this Class. Drag a Cardset onto another to reorder.
  Rename the Class by double-clicking its breadcrumb label.
*/

let Shared = window.StudyBuddyShared;
let Api = window.StudyBuddyApi;

let classId = Shared.getQueryParam('id');
let classBreadcrumb = document.getElementById('class-breadcrumb');
let cardsetsGrid = document.getElementById('cardsets-grid');
let classEmpty = document.getElementById('class-empty');
let classAddCardset = document.getElementById('class-add-cardset');
let classStatus = document.getElementById('class-status');
let classMenuBtn = document.getElementById('class-menu-button');
let classMenu = document.getElementById('class-menu');
let importInput = document.getElementById('import-cardset');
let exportCardsetDialog = document.getElementById('export-cardset-dialog');
let exportCardsetForm = document.getElementById('export-cardset-form');
let exportCardsetSelect = document.getElementById('export-cardset-select');
let exportCardsetStatus = document.getElementById('export-cardset-status');

let classObj = null;
let cardsets = [];
let dragKind = null;
let ignoreDropClick = false;
let swapAnimating = false;
let renaming = false;

function setStatus(message, isError) {
  classStatus.textContent = message || '';
  classStatus.className =
    'form-status' +
    (isError ? ' form-status--error' : message ? ' form-status--ok' : '');
}

function renderBreadcrumb() {
  Shared.renderBreadcrumb(classBreadcrumb, [
    { label: 'Home', href: '/index.html' },
    { label: classObj.title || 'Class', editable: true }
  ]);
}

function renderGrid() {
  let isEmpty = !cardsets.length;
  if (classEmpty) {
    classEmpty.hidden = !isEmpty;
  }
  if (isEmpty) {
    cardsetsGrid.innerHTML = '';
    cardsetsGrid.hidden = true;
    return;
  }

  cardsetsGrid.hidden = false;

  let setHtml = cardsets
    .map(function (set) {
      let count = Array.isArray(set.cards) ? set.cards.length : 0;
      return (
        '<div class="tile tile--cardset" role="link" tabindex="0" draggable="true" ' +
        'data-drop="cardset" data-cardset-id="' +
        Shared.escapeHtml(set.id) +
        '" data-href="/cardset.html?id=' +
        encodeURIComponent(set.id) +
        '">' +
        '<span class="tile__title">' +
        Shared.escapeHtml(set.title) +
        '</span>' +
        '<span class="tile__meta">' +
        count +
        ' card' +
        (count === 1 ? '' : 's') +
        '</span></div>'
      );
    })
    .join('');

  cardsetsGrid.innerHTML = setHtml;
}

function renderClass() {
  document.title = 'Study Buddy — ' + (classObj.title || 'Class');
  renderBreadcrumb();
}

async function refresh() {
  if (!classId) {
    setStatus('Missing Class id in the URL.', true);
    return;
  }
  setStatus('Loading…');
  try {
    classObj = await Api.getClass(classId);
    cardsets = await Api.getCardsets({ classId: classId });
    renderClass();
    renderGrid();
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Could not load Class.', true);
  }
}

async function saveClassTitle(nextTitle) {
  let title = String(nextTitle || '').trim();
  if (!title) {
    setStatus('Class name is required.', true);
    renderBreadcrumb();
    return;
  }
  if (!classObj) {
    return;
  }
  if (title === classObj.title) {
    renderBreadcrumb();
    return;
  }
  try {
    classObj = await Api.updateClass(classId, {
      title: title,
      coverImageUrl: classObj.coverImageUrl || ''
    });
    document.title = 'Study Buddy — ' + classObj.title;
    renderBreadcrumb();
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Could not rename Class.', true);
    renderBreadcrumb();
  }
}

function startBreadcrumbRename() {
  if (renaming || !classObj) {
    return;
  }
  let label = classBreadcrumb.querySelector('.breadcrumb__current--editable');
  if (!label) {
    return;
  }
  renaming = true;
  let input = document.createElement('input');
  input.type = 'text';
  input.className = 'breadcrumb__edit';
  input.value = classObj.title || '';
  input.maxLength = 120;
  input.setAttribute('aria-label', 'Rename class');
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
      saveClassTitle(input.value);
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

function wireDragAndDrop() {
  cardsetsGrid.addEventListener('dragstart', function (event) {
    let setTile = event.target.closest('[data-cardset-id]');
    if (setTile && cardsetsGrid.contains(setTile)) {
      let id = setTile.getAttribute('data-cardset-id');
      event.dataTransfer.setData('text/plain', id);
      event.dataTransfer.setData('text/cardset-id', id);
      event.dataTransfer.effectAllowed = 'move';
      setTile.classList.add('is-dragging');
      dragKind = 'cardset';
    }
  });

  cardsetsGrid.addEventListener('dragend', function (event) {
    let tile = event.target.closest('.tile');
    if (tile) {
      tile.classList.remove('is-dragging');
    }
    dragKind = null;
    document.querySelectorAll('.is-drop-target').forEach(function (el) {
      el.classList.remove('is-drop-target');
    });
  });

  cardsetsGrid.addEventListener('dragover', function (event) {
    if (!dragKind) {
      return;
    }
    let tile = event.target.closest('[data-drop="cardset"]');
    if (!tile || tile.classList.contains('is-dragging')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  cardsetsGrid.addEventListener('dragenter', function (event) {
    if (!dragKind) {
      return;
    }
    let tile = event.target.closest('[data-drop="cardset"]');
    if (!tile || tile.classList.contains('is-dragging')) {
      return;
    }
    tile.classList.add('is-drop-target');
  });

  cardsetsGrid.addEventListener('dragleave', function (event) {
    let tile = event.target.closest('[data-drop="cardset"]');
    if (!tile) {
      return;
    }
    if (!tile.contains(event.relatedTarget)) {
      tile.classList.remove('is-drop-target');
    }
  });

  cardsetsGrid.addEventListener('drop', async function (event) {
    let tile = event.target.closest('[data-drop="cardset"]');
    if (!tile || tile.classList.contains('is-dragging')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    tile.classList.remove('is-drop-target');
    ignoreDropClick = true;

    let targetSetId = tile.getAttribute('data-cardset-id');
    let draggedSetId = (
      event.dataTransfer.getData('text/cardset-id') ||
      ''
    ).trim();

    try {
      if (
        draggedSetId.indexOf('cardset-') === 0 &&
        targetSetId &&
        draggedSetId !== targetSetId
      ) {
        let sourceEl = cardsetsGrid.querySelector(
          '[data-cardset-id="' +
            String(draggedSetId).replace(/"/g, '\\"') +
            '"]'
        );
        let rectA = sourceEl ? sourceEl.getBoundingClientRect() : null;
        let rectB = tile.getBoundingClientRect();
        if (!Shared.swapItemsById(cardsets, draggedSetId, targetSetId)) {
          ignoreDropClick = false;
          return;
        }
        renderGrid();
        let elA = cardsetsGrid.querySelector(
          '[data-cardset-id="' +
            String(draggedSetId).replace(/"/g, '\\"') +
            '"]'
        );
        let elB = cardsetsGrid.querySelector(
          '[data-cardset-id="' +
            String(targetSetId).replace(/"/g, '\\"') +
            '"]'
        );
        swapAnimating = true;
        await Shared.animateTileSwap(rectA, rectB, elA, elB);
        swapAnimating = false;
        let ordered = await Api.reorderCardsets(
          cardsets.map(function (set) {
            return set.id;
          })
        );
        cardsets = ordered.filter(function (set) {
          return set.classId === classId;
        });
      } else {
        ignoreDropClick = false;
        return;
      }
      window.setTimeout(function () {
        ignoreDropClick = false;
      }, 300);
    } catch (err) {
      swapAnimating = false;
      ignoreDropClick = false;
      setStatus(err.message || 'Could not move item.', true);
      refresh();
    }
  });

  cardsetsGrid.addEventListener('click', function (event) {
    if (dragKind || swapAnimating || ignoreDropClick) {
      if (ignoreDropClick) {
        ignoreDropClick = false;
      }
      event.preventDefault();
      return;
    }
    let tile = event.target.closest('[data-href]');
    if (tile && cardsetsGrid.contains(tile)) {
      window.location.href = tile.getAttribute('data-href');
    }
  });

  cardsetsGrid.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    let tile = event.target.closest('[data-href]');
    if (tile && cardsetsGrid.contains(tile)) {
      event.preventDefault();
      window.location.href = tile.getAttribute('data-href');
    }
  });
}

classBreadcrumb.addEventListener('dblclick', function (event) {
  let label = event.target.closest('.breadcrumb__current--editable');
  if (!label || !classBreadcrumb.contains(label)) {
    return;
  }
  event.preventDefault();
  startBreadcrumbRename();
});

function closeClassMenu() {
  classMenu.hidden = true;
  classMenuBtn.setAttribute('aria-expanded', 'false');
}

function openExportCardsetDialog() {
  if (!exportCardsetDialog || !exportCardsetSelect) {
    return;
  }
  exportCardsetStatus.textContent = '';
  exportCardsetStatus.className = 'form-status';
  exportCardsetSelect.innerHTML = '';
  if (!cardsets.length) {
    exportCardsetStatus.textContent = 'No cardsets.';
    exportCardsetStatus.className = 'form-status form-status--error';
  } else {
    cardsets.forEach(function (set) {
      let option = document.createElement('option');
      option.value = set.id;
      option.textContent = set.title || 'Untitled cardset';
      exportCardsetSelect.appendChild(option);
    });
  }
  exportCardsetDialog.showModal();
}

async function exportSelectedCardset() {
  let id = exportCardsetSelect && exportCardsetSelect.value;
  if (!id) {
    return;
  }
  try {
    exportCardsetStatus.textContent = 'Preparing export…';
    exportCardsetStatus.className = 'form-status';
    let set = await Api.getCardset(id);
    let payload = Shared.buildCardsetExportPayload(set);
    Shared.downloadJsonFile(
      Shared.safeExportFilename(set.title, '.json'),
      payload
    );
    exportCardsetDialog.close();
    setStatus('Exported.');
  } catch (err) {
    exportCardsetStatus.textContent = err.message || 'Could not export cardset.';
    exportCardsetStatus.className = 'form-status form-status--error';
  }
}

async function deleteClassAction() {
  if (!classObj) {
    return;
  }
  let ok = window.confirm('Delete "' + classObj.title + '"?');
  if (!ok) {
    return;
  }
  try {
    await Api.deleteClass(classObj.id);
    window.location.href = '/index.html';
  } catch (err) {
    setStatus(err.message || 'Could not delete Class.', true);
  }
}

classMenuBtn.addEventListener('click', function (event) {
  event.stopPropagation();
  let willOpen = classMenu.hidden;
  Shared.closeOpenMenus();
  if (willOpen) {
    classMenu.hidden = false;
    classMenuBtn.setAttribute('aria-expanded', 'true');
  }
});

classMenu.addEventListener('click', function (event) {
  event.stopPropagation();
  let item = event.target.closest('[data-menu]');
  if (!item) {
    return;
  }
  let action = item.getAttribute('data-menu');
  if (action === 'import') {
    closeClassMenu();
    importInput.click();
    return;
  }
  if (action === 'export') {
    closeClassMenu();
    openExportCardsetDialog();
    return;
  }
  if (action === 'delete') {
    closeClassMenu();
    deleteClassAction();
  }
});

importInput.addEventListener('change', async function () {
  let file = importInput.files && importInput.files[0];
  importInput.value = '';
  if (!file || !classObj) {
    return;
  }
  try {
    let text = await file.text();
    let data = JSON.parse(text);
    if (!data || typeof data !== 'object') {
      throw new Error('Import file must be a JSON object.');
    }
    let title =
      data.title !== undefined && data.title !== null
        ? String(data.title).trim()
        : '';
    if (!title) {
      throw new Error('Import file needs a title.');
    }
    if (!Array.isArray(data.cards)) {
      throw new Error('Import file needs a cards array.');
    }
    setStatus('Importing…');
    await Api.createCardset({
      title: title,
      classId: classId,
      cards: data.cards
    });
    await refresh();
    setStatus('Imported.');
  } catch (err) {
    setStatus(err.message || 'Could not import cardset.', true);
    refresh();
  }
});

if (exportCardsetForm) {
  exportCardsetForm.addEventListener('submit', function (event) {
    let submitter = event.submitter;
    let value = submitter ? submitter.value : 'cancel';
    if (value === 'cancel') {
      return;
    }
    event.preventDefault();
    exportSelectedCardset();
  });
}

if (classAddCardset) {
  classAddCardset.addEventListener('click', function () {
    Shared.openNewCardsetDialog({
      classId: classId,
      onCreated: function () {
        refresh();
      }
    });
  });
}

wireDragAndDrop();
Shared.initChrome({
  onCardsetCreated: function () {
    refresh();
  }
});
refresh();
