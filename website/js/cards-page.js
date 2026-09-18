/*
  cards-page.js
  -------------
  Job: behavior for cards.html only.

  Main responsibilities:
  - Left panel: create / edit a card (and Preview as a flipable flashcard)
  - Right panel: browse, filter, edit/delete; also Import and Export modes

  Dependencies (script load order):
  - StudyBuddyApi from api.js (create/update/delete/list)
  - StudyBuddyShared from shared.js (escapeHtml, tag helpers, paintCardElement)

  Does not talk to the disk directly — only through the API helpers.
*/

(function () {
  var form = document.getElementById('card-form');
  var cardIdInput = document.getElementById('card-id');
  var frontTitleInput = document.getElementById('card-front-title');
  var frontInput = document.getElementById('card-front');
  var backInput = document.getElementById('card-back');
  var backSubtitleInput = document.getElementById('card-back-subtitle');
  var tagsInput = document.getElementById('card-tags');
  var saveButton = document.getElementById('save-button');
  var previewButton = document.getElementById('preview-button');
  var cancelEditButton = document.getElementById('cancel-edit');
  var formStatus = document.getElementById('form-status');
  var formTitle = document.getElementById('card-form-title');
  var cardPreview = document.getElementById('card-preview');
  var previewFlashcard = document.getElementById('card-preview-flashcard');
  var tableBody = document.getElementById('cards-table-body');
  var listCount = document.getElementById('cards-list-count');
  var tagFilter = document.getElementById('cards-tag-filter');
  var tagFilterEmpty = document.getElementById('cards-tag-filter-empty');
  var textFilter = document.getElementById('cards-text-filter');
  var suggestedTagsEl = document.getElementById('suggested-tags');
  var suggestedTagsEmpty = document.getElementById('suggested-tags-empty');

  var listModeBrowse = document.getElementById('list-mode-browse');
  var listModeImport = document.getElementById('list-mode-import');
  var listModeExport = document.getElementById('list-mode-export');
  var cardsPanelStatus = document.getElementById('cards-panel-status');
  var listTitle = document.getElementById('card-list-title');
  var importFileInput = document.getElementById('import-file');
  var importTagsEl = document.getElementById('import-tags');
  var importTagsEmpty = document.getElementById('import-tags-empty');
  var importCount = document.getElementById('import-count');
  var importTableBody = document.getElementById('import-table-body');
  var importDoneButton = document.getElementById('import-done');
  var importCancelButton = document.getElementById('import-cancel');
  var importDuplicatesNote = document.getElementById('import-duplicates-note');
  var exportTagFilter = document.getElementById('export-tag-filter');
  var exportTagFilterEmpty = document.getElementById('export-tag-filter-empty');
  var exportCount = document.getElementById('export-count');
  var exportTableBody = document.getElementById('export-table-body');
  var exportDownloadButton = document.getElementById('export-download');
  var exportCancelButton = document.getElementById('export-cancel');
  var cardsImportButton = document.getElementById('cards-import');
  var cardsExportButton = document.getElementById('cards-export');

  /*
    Shared helpers from shared.js (loaded before this file).
    We keep short local wrappers below so the rest of the file reads cleanly.
  */
  var Shared = window.StudyBuddyShared;

  var allCards = [];
  var suggestedTagsExpanded = false;
  // Your cards panel mode: 'browse' | 'import' | 'export'
  var listMode = 'browse';
  // Card ids unchecked in Export (cleared when export tags change).
  var exportExcludedIds = {};
  // Parsed cards waiting for Import preview (Done commits them).
  var pendingImportCards = [];
  // Indexes unchecked in the Import table.
  var importExcludedIndexes = {};
  var previewMode = false;
  var previewShowingBack = false;
  var previewIsFlipping = false;
  var PREVIEW_FLIP_DURATION_MS = 350;

  /** Show a status line under the form (green = ok, red = error). */
  function setFormOrPanelStatus(el, message, kind) {
    el.textContent = message;
    el.className = 'form-status';
    if (kind === 'ok') {
      el.classList.add('form-status--ok');
    }
    if (kind === 'error') {
      el.classList.add('form-status--error');
    }
  }

  function setStatus(message, kind) {
    setFormOrPanelStatus(formStatus, message, kind);
  }

  function setPanelStatus(message, kind) {
    setFormOrPanelStatus(cardsPanelStatus, message, kind);
  }

  function parseTagsFromInput(text) {
    if (!text || !String(text).trim()) {
      return [];
    }
    return String(text)
      .split(',')
      .map(function (part) {
        return part.trim();
      })
      .filter(function (part) {
        return part.length > 0;
      });
  }

  function tagsToInputValue(tags) {
    if (!Array.isArray(tags) || !tags.length) {
      return '';
    }
    return tags.join(', ');
  }

  function readFormCardData() {
    return {
      frontTitle: frontTitleInput.value.trim(),
      front: frontInput.value.trim(),
      back: backInput.value.trim(),
      backSubtitle: backSubtitleInput.value.trim(),
      tags: parseTagsFromInput(tagsInput.value)
    };
  }

  function paintPreviewFlashcard(showBack) {
    var data = readFormCardData();
    // Reuse the shared painter; empty fields show placeholders so the card still looks real.
    Shared.paintCardElement(
      previewFlashcard,
      {
        frontTitle: data.frontTitle,
        front: data.front || 'Front',
        back: data.back || 'Back',
        backSubtitle: data.backSubtitle
      },
      showBack
    );
  }

  function setPreviewMode(enabled) {
    previewMode = !!enabled;
    form.hidden = previewMode;
    cardPreview.hidden = !previewMode;
    previewButton.textContent = previewMode ? 'Edit' : 'Preview';

    if (previewMode) {
      previewShowingBack = false;
      previewIsFlipping = false;
      paintPreviewFlashcard(false);
    } else {
      previewFlashcard.classList.remove('is-showing-back');
      previewShowingBack = false;
      previewIsFlipping = false;
    }
  }

  function togglePreviewFlip() {
    if (!previewMode || previewIsFlipping) {
      return;
    }

    previewIsFlipping = true;
    var nextShowBack = !previewShowingBack;

    if (nextShowBack) {
      previewFlashcard.classList.add('is-showing-back');
    } else {
      previewFlashcard.classList.remove('is-showing-back');
    }

    setTimeout(function () {
      previewShowingBack = nextShowBack;
      paintPreviewFlashcard(nextShowBack);
    }, PREVIEW_FLIP_DURATION_MS / 4);

    setTimeout(function () {
      previewIsFlipping = false;
    }, PREVIEW_FLIP_DURATION_MS);
  }

  function resetFormToCreateMode() {
    cardIdInput.value = '';
    frontTitleInput.value = '';
    frontInput.value = '';
    backInput.value = '';
    backSubtitleInput.value = '';
    tagsInput.value = '';
    formTitle.textContent = 'Add a card';
    saveButton.textContent = 'Add card';
    cancelEditButton.hidden = true;
    setPreviewMode(false);
    renderSuggestedTags();
  }

  function enterEditMode(card) {
    cardIdInput.value = card.id;
    frontTitleInput.value = card.frontTitle || '';
    frontInput.value = card.front || '';
    backInput.value = card.back || '';
    backSubtitleInput.value = card.backSubtitle || '';
    tagsInput.value = tagsToInputValue(card.tags);
    formTitle.textContent = 'Edit card';
    saveButton.textContent = 'Save changes';
    cancelEditButton.hidden = false;
    setStatus('', '');
    setPreviewMode(false);
    renderSuggestedTags();
    frontTitleInput.focus();
  }

  /** Swap Your cards content; rename heading while importing. */
  function setListMode(mode) {
    listMode = mode;
    listModeBrowse.hidden = mode !== 'browse';
    listModeImport.hidden = mode !== 'import';
    listModeExport.hidden = mode !== 'export';
    cardsImportButton.hidden = mode !== 'browse';
    cardsExportButton.hidden = mode !== 'browse';
    listTitle.textContent = mode === 'import' ? 'Importing cards' : 'Your cards';

    var layout = document.querySelector('.cards-layout');
    if (layout) {
      if (mode === 'browse') {
        layout.classList.remove('is-list-focused');
      } else {
        layout.classList.add('is-list-focused');
      }
    }

    if (mode === 'browse') {
      pendingImportCards = [];
      importExcludedIndexes = {};
      setPanelStatus('', '');
      applyFiltersAndRender();
      return;
    }

    if (mode === 'import') {
      setPanelStatus('', '');
      renderImportPreview();
      return;
    }

    if (mode === 'export') {
      exportExcludedIds = {};
      setPanelStatus('', '');
      renderExportFilters([]);
      updateExportSelection();
    }
  }

  function getTagsByUsage(cards) {
    var counts = {};
    cards.forEach(function (card) {
      if (!Array.isArray(card.tags)) {
        return;
      }
      card.tags.forEach(function (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.keys(counts).sort(function (a, b) {
      if (counts[b] !== counts[a]) {
        return counts[b] - counts[a];
      }
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
  }

  function toggleTagInInput(tag) {
    var current = parseTagsFromInput(tagsInput.value);
    var index = current.indexOf(tag);
    if (index === -1) {
      current.push(tag);
    } else {
      current.splice(index, 1);
    }
    tagsInput.value = tagsToInputValue(current);
    renderSuggestedTags();
  }

  function renderSuggestedTags() {
    var ranked = getTagsByUsage(allCards);
    var selectedLookup = {};
    parseTagsFromInput(tagsInput.value).forEach(function (tag) {
      selectedLookup[tag] = true;
    });

    suggestedTagsEl.innerHTML = '';

    if (!ranked.length) {
      suggestedTagsEmpty.hidden = false;
      return;
    }

    suggestedTagsEmpty.hidden = true;
    var showAll = suggestedTagsExpanded || ranked.length <= 10;
    var visible = showAll ? ranked : ranked.slice(0, 10);

    visible.forEach(function (tag) {
      var isSelected = !!selectedLookup[tag];
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className =
        'tag-filter__option suggested-tags__chip' +
        (isSelected ? ' is-selected' : '');
      chip.setAttribute('data-suggested-tag', tag);
      chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      chip.textContent = tag;
      suggestedTagsEl.appendChild(chip);
    });

    if (ranked.length > 10) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'suggested-tags__more';
      more.setAttribute(
        'data-suggested-more',
        suggestedTagsExpanded ? 'collapse' : 'expand'
      );
      more.textContent = suggestedTagsExpanded ? 'less…' : 'more…';
      suggestedTagsEl.appendChild(more);
    }
  }

  function escapeHtml(text) {
    return Shared.escapeHtml(text);
  }

  function collectAllTags(cards) {
    return Shared.collectAllTags(cards);
  }

  function getSelectedTags() {
    return Shared.getCheckedCheckboxValues(tagFilter);
  }

  function filterCardsBySelectedTags(cards, selectedTags) {
    return Shared.filterCardsBySelectedTags(cards, selectedTags);
  }

  function getExportSelectedTags() {
    return Shared.getCheckedCheckboxValues(exportTagFilter);
  }

  function filterCardsByText(cards, query) {
    // Normalize the search box text: trim spaces, lowercase for case-insensitive match.
    var needle = String(query || '')
      .trim()
      .toLowerCase();
    if (!needle) {
      return cards.slice();
    }
    return cards.filter(function (card) {
      // Join several fields into one big string, then search with indexOf.
      // indexOf returns -1 when the needle is not found.
      var haystack = [
        card.frontTitle || '',
        card.front || '',
        card.back || '',
        card.backSubtitle || ''
      ]
        .join('\n')
        .toLowerCase();
      return haystack.indexOf(needle) !== -1;
    });
  }

  function getAvailableTags(selectedTags) {
    return collectAllTags(filterCardsBySelectedTags(allCards, selectedTags));
  }

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
      checkbox.name = 'cards-tag-filter';
      checkbox.checked = isSelected;

      var text = document.createElement('span');
      text.textContent = tag;

      label.appendChild(checkbox);
      label.appendChild(text);
      tagFilter.appendChild(label);
    });
  }

  function updateListCount(filteredLength) {
    var total = allCards.length;
    if (total === 0) {
      listCount.textContent = '0 cards';
      return;
    }
    if (filteredLength === total) {
      listCount.textContent = total === 1 ? '1 card' : total + ' cards';
      return;
    }
    listCount.textContent = filteredLength + '/' + total + ' cards';
  }

  function renderTable(cards) {
    tableBody.innerHTML = '';
    updateListCount(cards.length);

    if (!allCards.length) {
      var emptyRow = document.createElement('tr');
      emptyRow.innerHTML =
        '<td colspan="2" class="cards-table__empty">No cards yet. Add your first one!</td>';
      tableBody.appendChild(emptyRow);
      return;
    }

    if (!cards.length) {
      var noMatchRow = document.createElement('tr');
      noMatchRow.innerHTML =
        '<td colspan="2" class="cards-table__empty">No cards match the current filters.</td>';
      tableBody.appendChild(noMatchRow);
      return;
    }

    cards.forEach(function (card) {
      var row = document.createElement('tr');
      row.innerHTML =
        '<td class="cards-table__title">' +
        escapeHtml(card.frontTitle || '—') +
        '</td>' +
        '<td class="cards-table__actions">' +
        '<button type="button" class="button button--small button--secondary" data-action="edit" data-id="' +
        escapeHtml(card.id) +
        '">Edit</button> ' +
        '<button type="button" class="button button--small button--danger" data-action="delete" data-id="' +
        escapeHtml(card.id) +
        '">Delete</button>' +
        '</td>';
      tableBody.appendChild(row);
    });
  }

  function applyFiltersAndRender() {
    var selectedTags = getSelectedTags();
    var filtered = filterCardsBySelectedTags(allCards, selectedTags);
    filtered = filterCardsByText(filtered, textFilter.value);
    renderTable(filtered);
  }

  async function refreshTable() {
    try {
      allCards = await window.StudyBuddyApi.getCards();
      renderTagFilters(getSelectedTags());
      renderSuggestedTags();
      if (listMode === 'browse') {
        applyFiltersAndRender();
      }
      if (listMode === 'export') {
        renderExportFilters(getExportSelectedTags());
        updateExportSelection();
      }
    } catch (err) {
      tableBody.innerHTML =
        '<tr><td colspan="2" class="cards-table__empty">Could not load cards.</td></tr>';
      listCount.textContent = 'Could not load cards.';
      setStatus(err.message, 'error');
    }
  }

  // ----- Import -----

  /**
   * Build a simple string that represents a card's content.
   * Used to detect duplicates: same title/front/back/subtitle → same key.
   * join('\n') sticks the pieces together with newline characters between them.
   */
  function cardContentKey(card) {
    return [
      String(card.frontTitle || '').trim(),
      String(card.front || '').trim(),
      String(card.back || '').trim(),
      String(card.backSubtitle || '').trim()
    ].join('\n');
  }

  function parseImportPayload(data) {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      if (Array.isArray(data.cards)) {
        return data.cards;
      }
      if (data.front !== undefined || data.back !== undefined) {
        return [data];
      }
    }
    throw new Error(
      'JSON must be a card object, an array of cards, or { "cards": [...] }.'
    );
  }

  function normalizeImportCard(raw) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    var front = raw.front === undefined || raw.front === null ? '' : String(raw.front).trim();
    var back = raw.back === undefined || raw.back === null ? '' : String(raw.back).trim();
    if (!front || !back) {
      return null;
    }
    var tags = [];
    if (Array.isArray(raw.tags)) {
      tags = raw.tags
        .map(function (tag) {
          return String(tag).trim();
        })
        .filter(Boolean);
    } else if (typeof raw.tags === 'string') {
      tags = parseTagsFromInput(raw.tags);
    }
    return {
      id: raw.id ? String(raw.id) : '',
      frontTitle:
        raw.frontTitle === undefined || raw.frontTitle === null
          ? ''
          : String(raw.frontTitle).trim(),
      front: front,
      back: back,
      backSubtitle:
        raw.backSubtitle === undefined || raw.backSubtitle === null
          ? ''
          : String(raw.backSubtitle).trim(),
      tags: tags
    };
  }

  async function loadImportPreviewFromFile(file) {
    var text = await file.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('File is not valid JSON.');
    }

    var rawList = parseImportPayload(data);
    var cards = [];
    var seenInFile = {};
    var skippedInvalid = 0;

    rawList.forEach(function (raw) {
      var card = normalizeImportCard(raw);
      if (!card) {
        skippedInvalid = skippedInvalid + 1;
        return;
      }
      var key = cardContentKey(card);
      if (seenInFile[key]) {
        return;
      }
      seenInFile[key] = true;
      cards.push({
        frontTitle: card.frontTitle,
        front: card.front,
        back: card.back,
        backSubtitle: card.backSubtitle,
        tags: card.tags,
        id: card.id
      });
    });

    if (!cards.length) {
      throw new Error(
        skippedInvalid
          ? 'No valid cards found in that file.'
          : 'That file has no cards to import.'
      );
    }

    return cards;
  }

  function getImportReadyCards() {
    return pendingImportCards.filter(function (_card, index) {
      return !importExcludedIndexes[index];
    });
  }

  function buildExistingCardLookup() {
    var existingIds = {};
    var existingKeys = {};
    allCards.forEach(function (card) {
      if (card.id) {
        existingIds[card.id] = true;
      }
      existingKeys[cardContentKey(card)] = true;
    });
    return { existingIds: existingIds, existingKeys: existingKeys };
  }

  function isImportDuplicate(card, lookup) {
    if (!lookup) {
      lookup = buildExistingCardLookup();
    }
    if (card.id && lookup.existingIds[card.id]) {
      return true;
    }
    return !!lookup.existingKeys[cardContentKey(card)];
  }

  /** Default-exclude cards that already exist so the reviewer sees them unchecked. */
  function markImportDuplicatesExcluded() {
    var lookup = buildExistingCardLookup();
    pendingImportCards.forEach(function (card, index) {
      if (isImportDuplicate(card, lookup)) {
        importExcludedIndexes[index] = true;
      }
    });
  }

  function renderImportPreview() {
    var tags = collectAllTags(pendingImportCards);
    importTagsEl.innerHTML = '';

    if (!tags.length) {
      importTagsEmpty.hidden = false;
    } else {
      importTagsEmpty.hidden = true;
      tags.forEach(function (tag) {
        var chip = document.createElement('span');
        chip.className = 'tag-filter__option tag-filter__option--static';
        chip.setAttribute('role', 'listitem');
        chip.textContent = tag;
        importTagsEl.appendChild(chip);
      });
    }

    var ready = getImportReadyCards();
    var count = ready.length;
    importCount.textContent =
      count === 1 ? 'Selected 1 card' : 'Selected ' + count + ' cards';
    importDoneButton.disabled = count === 0;

    var lookup = buildExistingCardLookup();
    var hasDuplicates = false;
    importTableBody.innerHTML = '';
    if (!pendingImportCards.length) {
      var emptyRow = document.createElement('tr');
      emptyRow.innerHTML =
        '<td colspan="2" class="cards-table__empty">No cards in file.</td>';
      importTableBody.appendChild(emptyRow);
      importDuplicatesNote.hidden = true;
      return;
    }

    pendingImportCards.forEach(function (card, index) {
      var duplicate = isImportDuplicate(card, lookup);
      if (duplicate) {
        hasDuplicates = true;
      }
      var checked = !importExcludedIndexes[index];
      var titleHtml = escapeHtml(card.frontTitle || '—');
      if (duplicate) {
        titleHtml =
          '<span class="cards-table__title--duplicate">' +
          titleHtml +
          '</span><span class="cards-table__duplicate-mark">*</span>';
      }
      var row = document.createElement('tr');
      if (duplicate) {
        row.className = 'cards-table__row--duplicate';
      }
      row.innerHTML =
        '<td class="cards-table__title">' +
        titleHtml +
        '</td>' +
        '<td>' +
        '<input type="checkbox" class="cards-table__export-check" data-import-index="' +
        index +
        '"' +
        (checked ? ' checked' : '') +
        (duplicate ? ' disabled' : '') +
        ' aria-label="Import ' +
        escapeHtml(card.frontTitle || 'card') +
        (duplicate ? ' (duplicate, skipped)' : '') +
        '">' +
        '</td>';
      importTableBody.appendChild(row);
    });

    importDuplicatesNote.hidden = !hasDuplicates;
  }

  async function commitImportSelection() {
    var selected = getImportReadyCards();
    if (!selected.length) {
      throw new Error('Select at least one card to import.');
    }

    var existingIds = {};
    var existingKeys = {};
    allCards.forEach(function (card) {
      existingIds[card.id] = true;
      existingKeys[cardContentKey(card)] = true;
    });

    var toCreate = [];
    var skippedDuplicate = 0;

    selected.forEach(function (card) {
      var key = cardContentKey(card);
      if ((card.id && existingIds[card.id]) || existingKeys[key]) {
        skippedDuplicate = skippedDuplicate + 1;
        return;
      }
      existingKeys[key] = true;
      toCreate.push({
        frontTitle: card.frontTitle,
        front: card.front,
        back: card.back,
        backSubtitle: card.backSubtitle,
        tags: card.tags
      });
    });

    var created = 0;
    for (var i = 0; i < toCreate.length; i++) {
      await window.StudyBuddyApi.createCard(toCreate[i]);
      created = created + 1;
    }

    return { created: created, skippedDuplicate: skippedDuplicate };
  }

  // ----- Export -----

  function getExportTagFilteredCards() {
    return filterCardsBySelectedTags(allCards, getExportSelectedTags());
  }

  function getExportReadyCards() {
    return getExportTagFilteredCards().filter(function (card) {
      return !exportExcludedIds[card.id];
    });
  }

  function renderExportFilters(selectedTags) {
    if (!selectedTags) {
      selectedTags = [];
    }
    var selectedLookup = {};
    selectedTags.forEach(function (tag) {
      selectedLookup[tag] = true;
    });

    var matching = filterCardsBySelectedTags(allCards, selectedTags);
    var tags = collectAllTags(matching);
    exportTagFilter.innerHTML = '';

    if (!collectAllTags(allCards).length) {
      exportTagFilterEmpty.hidden = false;
      return;
    }

    exportTagFilterEmpty.hidden = true;
    tags.forEach(function (tag) {
      var isSelected = !!selectedLookup[tag];
      var label = document.createElement('label');
      label.className = 'tag-filter__option' + (isSelected ? ' is-selected' : '');

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = tag;
      checkbox.name = 'export-tag-filter';
      checkbox.checked = isSelected;

      var text = document.createElement('span');
      text.textContent = tag;

      label.appendChild(checkbox);
      label.appendChild(text);
      exportTagFilter.appendChild(label);
    });
  }

  function updateExportSelection() {
    var tagFiltered = getExportTagFilteredCards();
    var ready = getExportReadyCards();
    var count = ready.length;

    exportCount.textContent =
      count === 1 ? 'Selected 1 card' : 'Selected ' + count + ' cards';
    exportDownloadButton.disabled = count === 0;

    exportTableBody.innerHTML = '';

    if (!tagFiltered.length) {
      var emptyRow = document.createElement('tr');
      emptyRow.innerHTML =
        '<td colspan="2" class="cards-table__empty">No cards match the current filters.</td>';
      exportTableBody.appendChild(emptyRow);
      return;
    }

    tagFiltered.forEach(function (card) {
      var checked = !exportExcludedIds[card.id];
      var row = document.createElement('tr');
      row.innerHTML =
        '<td class="cards-table__title">' +
        escapeHtml(card.frontTitle || '—') +
        '</td>' +
        '<td>' +
        '<input type="checkbox" class="cards-table__export-check" data-export-id="' +
        escapeHtml(card.id) +
        '"' +
        (checked ? ' checked' : '') +
        ' aria-label="Export ' +
        escapeHtml(card.frontTitle || 'card') +
        '">' +
        '</td>';
      exportTableBody.appendChild(row);
    });
  }

  /**
   * Make a tag safe for a download filename.
   * Regex /[^a-z0-9]+/g means: find one-or-more characters that are NOT
   * lowercase letters or digits, and replace each run with a single dash.
   * The second regex strips leading/trailing dashes.
   */
  function sanitizeFilenameTag(tag) {
    return String(tag || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatExportFilename() {
    var now = new Date();
    var yyyy = String(now.getFullYear());
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var mm = month < 10 ? '0' + month : String(month);
    var dd = day < 10 ? '0' + day : String(day);
    var selectedTags = getExportSelectedTags()
      .map(sanitizeFilenameTag)
      .filter(Boolean);
    var tagSuffix = selectedTags.length ? selectedTags.join('-') : 'all';
    return 'cards-' + yyyy + '-' + mm + '-' + dd + '-' + tagSuffix + '.json';
  }

  function downloadExport() {
    var cards = getExportReadyCards().map(function (card) {
      return {
        frontTitle: card.frontTitle || '',
        front: card.front || '',
        back: card.back || '',
        backSubtitle: card.backSubtitle || '',
        tags: Array.isArray(card.tags) ? card.tags.slice() : []
      };
    });

    var blob = new Blob([JSON.stringify(cards, null, 2)], {
      type: 'application/json'
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = formatExportFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // ----- Events -----

  tagsInput.addEventListener('input', function () {
    renderSuggestedTags();
  });

  suggestedTagsEl.addEventListener('click', function (event) {
    var more = event.target.closest('[data-suggested-more]');
    if (more) {
      suggestedTagsExpanded = more.getAttribute('data-suggested-more') === 'expand';
      renderSuggestedTags();
      return;
    }
    var chip = event.target.closest('[data-suggested-tag]');
    if (!chip) {
      return;
    }
    toggleTagInInput(chip.getAttribute('data-suggested-tag'));
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var cardData = readFormCardData();
    var editingId = cardIdInput.value.trim();

    if (!cardData.front || !cardData.back) {
      setStatus('Front and back are both required.', 'error');
      return;
    }

    try {
      if (editingId) {
        await window.StudyBuddyApi.updateCard(editingId, cardData);
        setStatus('Card updated.', 'ok');
      } else {
        await window.StudyBuddyApi.createCard(cardData);
        setStatus('Card added.', 'ok');
      }
      resetFormToCreateMode();
      await refreshTable();
    } catch (err) {
      setStatus(err.message, 'error');
    }
  });

  cancelEditButton.addEventListener('click', function () {
    resetFormToCreateMode();
    setStatus('', '');
  });

  previewButton.addEventListener('click', function () {
    setPreviewMode(!previewMode);
  });

  previewFlashcard.addEventListener('click', function () {
    togglePreviewFlip();
  });

  previewFlashcard.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePreviewFlip();
    }
  });

  tagFilter.addEventListener('change', function (event) {
    if (event.target && event.target.name === 'cards-tag-filter') {
      renderTagFilters(getSelectedTags());
      applyFiltersAndRender();
    }
  });

  textFilter.addEventListener('input', function () {
    applyFiltersAndRender();
  });

  cardsImportButton.addEventListener('click', function () {
    // Open the file picker immediately; preview UI appears after a file is chosen.
    importFileInput.value = '';
    importFileInput.click();
  });

  cardsExportButton.addEventListener('click', function () {
    setListMode('export');
  });

  var footerGotoImport = document.getElementById('footer-goto-import');
  if (footerGotoImport) {
    footerGotoImport.addEventListener('click', function (event) {
      event.preventDefault();
      cardsImportButton.click();
    });
  }

  var footerGotoExport = document.getElementById('footer-goto-export');
  if (footerGotoExport) {
    footerGotoExport.addEventListener('click', function (event) {
      event.preventDefault();
      cardsExportButton.click();
    });
  }

  exportCancelButton.addEventListener('click', function () {
    setListMode('browse');
  });

  importFileInput.addEventListener('change', async function () {
    var file = importFileInput.files && importFileInput.files[0];
    if (!file) {
      return;
    }

    setPanelStatus('Reading file…', '');
    try {
      pendingImportCards = await loadImportPreviewFromFile(file);
      importExcludedIndexes = {};
      markImportDuplicatesExcluded();
      setListMode('import');
      setPanelStatus('', '');
    } catch (err) {
      pendingImportCards = [];
      setListMode('browse');
      setPanelStatus(err.message, 'error');
    } finally {
      importFileInput.value = '';
    }
  });

  importTableBody.addEventListener('change', function (event) {
    var checkbox = event.target.closest('[data-import-index]');
    if (!checkbox) {
      return;
    }
    var index = Number(checkbox.getAttribute('data-import-index'));
    if (checkbox.checked) {
      delete importExcludedIndexes[index];
    } else {
      importExcludedIndexes[index] = true;
    }
    renderImportPreview();
  });

  importDoneButton.addEventListener('click', async function () {
    setPanelStatus('Importing…', '');
    importDoneButton.disabled = true;
    try {
      var result = await commitImportSelection();
      await refreshTable();
      var parts = [];
      parts.push(
        result.created === 1
          ? 'Imported 1 card.'
          : 'Imported ' + result.created + ' cards.'
      );
      if (result.skippedDuplicate) {
        parts.push(result.skippedDuplicate + ' duplicate skipped.');
      }
      setPanelStatus(parts.join(' '), result.created ? 'ok' : 'error');
      setListMode('browse');
    } catch (err) {
      setPanelStatus(err.message, 'error');
      importDoneButton.disabled = getImportReadyCards().length === 0;
    }
  });

  importCancelButton.addEventListener('click', function () {
    setListMode('browse');
  });

  exportTagFilter.addEventListener('change', function (event) {
    if (event.target && event.target.name === 'export-tag-filter') {
      exportExcludedIds = {};
      renderExportFilters(getExportSelectedTags());
      updateExportSelection();
    }
  });

  exportTableBody.addEventListener('change', function (event) {
    var checkbox = event.target.closest('[data-export-id]');
    if (!checkbox) {
      return;
    }
    var id = checkbox.getAttribute('data-export-id');
    if (checkbox.checked) {
      delete exportExcludedIds[id];
    } else {
      exportExcludedIds[id] = true;
    }
    updateExportSelection();
  });

  exportDownloadButton.addEventListener('click', function () {
    if (!getExportReadyCards().length) {
      setPanelStatus('Select at least one card to export.', 'error');
      return;
    }
    downloadExport();
    setPanelStatus('Download started.', 'ok');
  });

  tableBody.addEventListener('click', async function (event) {
    var button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    var action = button.getAttribute('data-action');
    var id = button.getAttribute('data-id');

    if (action === 'edit') {
      try {
        var card = await window.StudyBuddyApi.getCard(id);
        enterEditMode(card);
      } catch (err) {
        setStatus(err.message, 'error');
      }
      return;
    }

    if (action === 'delete') {
      var confirmed = window.confirm('Delete this card? This cannot be undone.');
      if (!confirmed) {
        return;
      }
      try {
        await window.StudyBuddyApi.deleteCard(id);
        if (cardIdInput.value === id) {
          resetFormToCreateMode();
        }
        setStatus('Card deleted.', 'ok');
        await refreshTable();
      } catch (err) {
        setStatus(err.message, 'error');
      }
    }
  });

  refreshTable();
})();
