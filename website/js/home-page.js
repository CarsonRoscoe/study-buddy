/*
  home-page.js
  ------------
  Job: Home — Classes only. Drag a Class onto another Class to reorder.
*/

let Shared = window.StudyBuddyShared;
let Api = window.StudyBuddyApi;

let classesGrid = document.getElementById('classes-grid');
let homeEmpty = document.getElementById('home-empty');
let homeAddClass = document.getElementById('home-add-class');
let homeStatus = document.getElementById('home-status');
let newClassDialog = document.getElementById('new-class-dialog');
let newClassForm = document.getElementById('new-class-form');
let newClassTitle = document.getElementById('new-class-title');
let newClassCover = document.getElementById('new-class-cover');
let newClassCoverStatus = document.getElementById('new-class-cover-status');
let newClassStatus = document.getElementById('new-class-status');
let homeMenuBtn = document.getElementById('home-menu-button');
let homeMenu = document.getElementById('home-menu');
let importClassInput = document.getElementById('import-class');
let exportClassDialog = document.getElementById('export-class-dialog');
let exportClassForm = document.getElementById('export-class-form');
let exportClassSelect = document.getElementById('export-class-select');
let exportClassStatus = document.getElementById('export-class-status');

let COVER_HINT = 'Cover photo';

let classes = [];
let ignoreDropClick = false;
let dragKind = null;
let swapAnimating = false;

function setCoverStatus(message) {
  if (newClassCoverStatus) {
    newClassCoverStatus.textContent = message || COVER_HINT;
  }
}

function setStatus(message, isError) {
  homeStatus.textContent = message || '';
  homeStatus.className = 'form-status' + (isError ? ' form-status--error' : '');
}

function renderHome() {
  let isEmpty = !classes.length;
  if (homeEmpty) {
    homeEmpty.hidden = !isEmpty;
  }
  if (isEmpty) {
    classesGrid.innerHTML = '';
    classesGrid.hidden = true;
    return;
  }

  classesGrid.hidden = false;

  let classHtml = classes
    .map(function (classObj) {
      let cover = classObj.coverImageUrl
        ? '<img class="tile__cover" src="' +
          Shared.escapeHtml(classObj.coverImageUrl) +
          '" alt="" draggable="false" />'
        : '<div class="tile__cover tile__cover--placeholder" aria-hidden="true"></div>';
      return (
        '<div class="tile tile--class" role="link" tabindex="0" ' +
        'draggable="true" data-class-id="' +
        Shared.escapeHtml(classObj.id) +
        '" data-drop="class" data-href="/class.html?id=' +
        encodeURIComponent(classObj.id) +
        '">' +
        cover +
        '<span class="tile__title">' +
        Shared.escapeHtml(classObj.title) +
        '</span></div>'
      );
    })
    .join('');

  classesGrid.innerHTML = classHtml;
}

async function refresh() {
  setStatus('Loading…');
  try {
    classes = await Api.getClasses();
    renderHome();
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Could not load Home.', true);
  }
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    let reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(new Error('Could not read image file.'));
    };
    reader.readAsDataURL(file);
  });
}

function openTileHref(tile) {
  let href = tile && tile.getAttribute('data-href');
  if (href) {
    window.location.href = href;
  }
}

function clearDropTargets() {
  document.querySelectorAll('.is-drop-target').forEach(function (el) {
    el.classList.remove('is-drop-target');
  });
}

function wireGrid() {
  classesGrid.addEventListener('click', function (event) {
    let tile = event.target.closest('[data-href]');
    if (!tile || !classesGrid.contains(tile)) {
      return;
    }
    if (ignoreDropClick) {
      ignoreDropClick = false;
      return;
    }
    if (dragKind || swapAnimating) {
      event.preventDefault();
      return;
    }
    openTileHref(tile);
  });

  classesGrid.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    let tile = event.target.closest('[data-href]');
    if (!tile || !classesGrid.contains(tile)) {
      return;
    }
    event.preventDefault();
    openTileHref(tile);
  });

  classesGrid.addEventListener('dragstart', function (event) {
    let classTile = event.target.closest('[data-class-id]');
    if (!classTile || !classesGrid.contains(classTile)) {
      return;
    }
    let id = classTile.getAttribute('data-class-id');
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.setData('text/class-id', id);
    event.dataTransfer.effectAllowed = 'move';
    classTile.classList.add('is-dragging');
    dragKind = 'class';
  });

  classesGrid.addEventListener('dragend', function (event) {
    let tile = event.target.closest('.tile');
    if (tile) {
      tile.classList.remove('is-dragging');
    }
    dragKind = null;
    clearDropTargets();
  });

  classesGrid.addEventListener('dragover', function (event) {
    if (dragKind !== 'class') {
      return;
    }
    let target = event.target.closest('[data-drop="class"]');
    if (!target || target.classList.contains('is-dragging')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  classesGrid.addEventListener('dragenter', function (event) {
    if (dragKind !== 'class') {
      return;
    }
    let target = event.target.closest('[data-drop="class"]');
    if (target && !target.classList.contains('is-dragging')) {
      target.classList.add('is-drop-target');
    }
  });

  classesGrid.addEventListener('dragleave', function (event) {
    let target = event.target.closest('[data-drop]');
    if (!target) {
      return;
    }
    if (!target.contains(event.relatedTarget)) {
      target.classList.remove('is-drop-target');
    }
  });

  classesGrid.addEventListener('drop', async function (event) {
    let target = event.target.closest('[data-drop]');
    if (!target || target.classList.contains('is-dragging')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    target.classList.remove('is-drop-target');
    ignoreDropClick = true;

    let classId = target.getAttribute('data-class-id');
    let draggedClassId = (
      event.dataTransfer.getData('text/class-id') ||
      ''
    ).trim();

    try {
      if (
        draggedClassId.indexOf('class-') === 0 &&
        classId &&
        classId !== draggedClassId
      ) {
        let sourceEl = classesGrid.querySelector(
          '[data-class-id="' +
            String(draggedClassId).replace(/"/g, '\\"') +
            '"]'
        );
        let rectA = sourceEl ? sourceEl.getBoundingClientRect() : null;
        let rectB = target.getBoundingClientRect();
        if (!Shared.swapItemsById(classes, draggedClassId, classId)) {
          ignoreDropClick = false;
          return;
        }
        renderHome();
        let elA = classesGrid.querySelector(
          '[data-class-id="' +
            String(draggedClassId).replace(/"/g, '\\"') +
            '"]'
        );
        let elB = classesGrid.querySelector(
          '[data-class-id="' + String(classId).replace(/"/g, '\\"') + '"]'
        );
        swapAnimating = true;
        await Shared.animateTileSwap(rectA, rectB, elA, elB);
        swapAnimating = false;
        classes = await Api.reorderClasses(
          classes.map(function (c) {
            return c.id;
          })
        );
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
}

function openNewClassDialog() {
  newClassTitle.value = '';
  newClassCover.value = '';
  setCoverStatus(COVER_HINT);
  newClassStatus.textContent = '';
  newClassStatus.className = 'form-status';
  newClassDialog.showModal();
  newClassTitle.focus();
}

if (newClassCover) {
  newClassCover.addEventListener('change', function () {
    let file = newClassCover.files && newClassCover.files[0];
    setCoverStatus(file ? file.name : COVER_HINT);
  });
}

newClassForm.addEventListener('submit', async function (event) {
  let submitter = event.submitter;
  let value = submitter ? submitter.value : 'cancel';
  if (value === 'cancel') {
    return;
  }
  event.preventDefault();

  let title = newClassTitle.value.trim();
  if (!title) {
    newClassStatus.textContent = 'Title is required.';
    newClassStatus.className = 'form-status form-status--error';
    return;
  }

  try {
    newClassStatus.textContent = 'Creating…';
    newClassStatus.className = 'form-status';
    let coverImageUrl = '';
    let file = newClassCover.files && newClassCover.files[0];
    if (file) {
      let dataUrl = await readFileAsDataUrl(file);
      let uploaded = await Api.uploadImage(dataUrl);
      coverImageUrl = uploaded.url;
    }
    await Api.createClass({ title: title, coverImageUrl: coverImageUrl });
    newClassDialog.close();
    if (Shared.getQueryParam('new') === 'class') {
      window.history.replaceState({}, '', '/index.html');
    }
    await refresh();
  } catch (err) {
    newClassStatus.textContent = err.message || 'Could not create Class.';
    newClassStatus.className = 'form-status form-status--error';
  }
});

if (homeAddClass) {
  homeAddClass.addEventListener('click', openNewClassDialog);
}

function closeHomeMenu() {
  if (!homeMenu) {
    return;
  }
  homeMenu.hidden = true;
  homeMenuBtn.setAttribute('aria-expanded', 'false');
}

function openExportClassDialog() {
  if (!exportClassDialog || !exportClassSelect) {
    return;
  }
  exportClassStatus.textContent = '';
  exportClassStatus.className = 'form-status';
  exportClassSelect.innerHTML = '';
  if (!classes.length) {
    exportClassStatus.textContent = 'No classes.';
    exportClassStatus.className = 'form-status form-status--error';
  } else {
    classes.forEach(function (classObj) {
      let option = document.createElement('option');
      option.value = classObj.id;
      option.textContent = classObj.title || 'Untitled class';
      exportClassSelect.appendChild(option);
    });
  }
  exportClassDialog.showModal();
}

async function exportSelectedClass() {
  let id = exportClassSelect && exportClassSelect.value;
  if (!id) {
    return;
  }
  try {
    exportClassStatus.textContent = 'Preparing export…';
    exportClassStatus.className = 'form-status';
    let classObj = await Api.getClass(id);
    let cardsets = await Api.getCardsets({ classId: id });
    let payload = Shared.buildClassExportPayload(classObj, cardsets);
    Shared.downloadJsonFile(
      Shared.safeExportFilename(classObj.title, '.json'),
      payload
    );
    exportClassDialog.close();
    setStatus('Exported.');
  } catch (err) {
    exportClassStatus.textContent = err.message || 'Could not export class.';
    exportClassStatus.className = 'form-status form-status--error';
  }
}

if (homeMenuBtn && homeMenu) {
  homeMenuBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    let willOpen = homeMenu.hidden;
    Shared.closeOpenMenus();
    if (willOpen) {
      homeMenu.hidden = false;
      homeMenuBtn.setAttribute('aria-expanded', 'true');
    }
  });

  homeMenu.addEventListener('click', function (event) {
    event.stopPropagation();
    let item = event.target.closest('[data-menu]');
    if (!item) {
      return;
    }
    let action = item.getAttribute('data-menu');
    if (action === 'import') {
      closeHomeMenu();
      importClassInput.click();
      return;
    }
    if (action === 'export') {
      closeHomeMenu();
      openExportClassDialog();
    }
  });
}

if (exportClassForm) {
  exportClassForm.addEventListener('submit', function (event) {
    let submitter = event.submitter;
    let value = submitter ? submitter.value : 'cancel';
    if (value === 'cancel') {
      return;
    }
    event.preventDefault();
    exportSelectedClass();
  });
}

if (importClassInput) {
  importClassInput.addEventListener('change', async function () {
    let file = importClassInput.files && importClassInput.files[0];
    importClassInput.value = '';
    if (!file) {
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
      let incomingSets = Array.isArray(data.cardsets) ? data.cardsets : [];
      setStatus('Importing…');
      let created = await Api.createClass({
        title: title,
        coverImageUrl:
          data.coverImageUrl !== undefined && data.coverImageUrl !== null
            ? String(data.coverImageUrl)
            : ''
      });
      for (let i = 0; i < incomingSets.length; i++) {
        let set = incomingSets[i] || {};
        let setTitle =
          set.title !== undefined && set.title !== null
            ? String(set.title).trim()
            : '';
        await Api.createCardset({
          title: setTitle || 'Untitled cardset',
          classId: created.id,
          cards: Array.isArray(set.cards) ? set.cards : []
        });
      }
      await refresh();
      setStatus('Imported.');
    } catch (err) {
      setStatus(err.message || 'Could not import class.', true);
      refresh();
    }
  });
}

Shared.initChrome({
  onNewClass: openNewClassDialog
});
wireGrid();
refresh().then(function () {
  if (Shared.getQueryParam('new') === 'class') {
    openNewClassDialog();
  }
});
