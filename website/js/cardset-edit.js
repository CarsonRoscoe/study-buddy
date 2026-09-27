/*
  cardset-edit.js
  ---------------
  Cardset Edit tab — table editor, live save, preview pane.
*/

function createCardsetEditor(options) {
  options = options || {};
  let Shared = window.StudyBuddyShared;
  let Api = window.StudyBuddyApi;
  let els = options.elements || {};
  let onSaved =
    typeof options.onSaved === 'function' ? options.onSaved : function () {};

  let tbody = els.tbody;
  let addBtn = els.addBtn;
  let statusEl = els.statusEl;
  let previewHint = els.previewHint;
  let previewCard = els.previewCard;
  let imageFileInput = els.imageFileInput;
  let layoutEl = els.layoutEl;

  let cardset = null;
  let cards = [];
  let selectedId = null;
  let previewFrontSide = 'term';
  let imageTargetId = null;

  let saveTimer = null;
  let saving = false;
  let pendingSave = false;
  let statusClearTimer = null;
  let wired = false;

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }
    if (statusClearTimer) {
      window.clearTimeout(statusClearTimer);
      statusClearTimer = null;
    }
    statusEl.textContent = message || '';
    statusEl.className =
      'form-status' +
      (isError ? ' form-status--error' : message ? ' form-status--ok' : '');
    if (message && !isError && message.indexOf('Saving') === -1) {
      statusClearTimer = window.setTimeout(function () {
        statusEl.textContent = '';
        statusEl.className = 'form-status';
      }, 2000);
    }
  }

  function findCard(id) {
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].id === id) {
        return cards[i];
      }
    }
    return null;
  }

  function hasContent(card) {
    return !!(String(card.term || '').trim() || String(card.definition || '').trim());
  }

  function cardsForSave() {
    return cards.filter(hasContent).map(function (card) {
      return {
        id: card.id,
        term: String(card.term || '').trim(),
        definition: String(card.definition || '').trim(),
        termImageUrl: String(card.termImageUrl || '').trim()
      };
    });
  }

  function mergeDraftRows(savedCards) {
    let savedIds = {};
    savedCards.forEach(function (c) {
      savedIds[c.id] = true;
    });
    let drafts = cards.filter(function (c) {
      return !hasContent(c);
    });
    return savedCards.concat(
      drafts.filter(function (c) {
        return !savedIds[c.id];
      })
    );
  }

  function scheduleSave() {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(function () {
      saveTimer = null;
      persist();
    }, 450);
  }

  async function persist() {
    if (!cardset) {
      return;
    }
    if (saving) {
      pendingSave = true;
      return;
    }
    saving = true;
    setStatus('Saving…');
    try {
      let updated = await Api.updateCardset(cardset.id, {
        title: cardset.title,
        classId: cardset.classId,
        cards: cardsForSave()
      });
      cardset = updated;
      cards = mergeDraftRows(Array.isArray(updated.cards) ? updated.cards.slice() : []);
      if (selectedId && !findCard(selectedId)) {
        selectedId = cards.length ? cards[0].id : null;
      }
      updatePreview();
      setStatus('Saved.');
      onSaved(updated);
    } catch (err) {
      setStatus(err.message || 'Could not save.', true);
    } finally {
      saving = false;
      if (pendingSave) {
        pendingSave = false;
        persist();
      }
    }
  }

  function readRowIntoCard(tr) {
    let id = tr.getAttribute('data-card-id');
    let card = findCard(id);
    if (!card) {
      return;
    }
    tr.querySelectorAll('[data-field]').forEach(function (el) {
      let field = el.getAttribute('data-field');
      if (field === 'term' || field === 'definition' || field === 'termImageUrl') {
        card[field] = el.value;
      }
    });
  }

  function syncFromDom() {
    if (!tbody) {
      return;
    }
    tbody.querySelectorAll('tr[data-card-id]').forEach(readRowIntoCard);
  }

  function updatePreview() {
    if (!previewCard || !previewHint) {
      return;
    }
    let card = selectedId ? findCard(selectedId) : null;
    if (!card || !hasContent(card)) {
      previewCard.hidden = true;
      previewHint.hidden = false;
      previewHint.textContent = card ? 'Add term or definition.' : 'Select a row.';
      return;
    }
    previewHint.hidden = true;
    previewCard.hidden = false;
    previewCard.setAttribute('data-front-side', previewFrontSide);
    previewCard.classList.remove('is-showing-back');
    Shared.paintCardElement(previewCard, card, previewFrontSide, false);
  }

  function renderTable(focusSelected) {
    if (!tbody) {
      return;
    }

    if (!cards.length) {
      tbody.innerHTML =
        '<tr class="cardset-edit-table__empty">' +
        '<td colspan="4">No cards yet.</td>' +
        '</tr>';
      updatePreview();
      return;
    }

    tbody.innerHTML = cards
      .map(function (card) {
        let selected = card.id === selectedId;
        return (
          '<tr data-card-id="' +
          Shared.escapeHtml(card.id) +
          '" class="' +
          (selected ? 'is-selected' : '') +
          '">' +
          '<td><textarea data-field="term" rows="2" maxlength="500" aria-label="Term">' +
          Shared.escapeHtml(card.term || '') +
          '</textarea></td>' +
          '<td><textarea data-field="definition" rows="2" maxlength="2000" aria-label="Definition">' +
          Shared.escapeHtml(card.definition || '') +
          '</textarea></td>' +
          '<td class="cardset-edit-table__image-cell">' +
          '<div class="cardset-edit-table__image-row">' +
          '<input type="text" data-field="termImageUrl" maxlength="500" placeholder="Image URL" aria-label="Term image URL" value="' +
          Shared.escapeHtml(card.termImageUrl || '') +
          '" />' +
          '<button type="button" class="button button--secondary button--icon cardset-edit-upload" data-upload-for="' +
          Shared.escapeHtml(card.id) +
          '" title="Upload term image" aria-label="Upload term image">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<rect x="3" y="5" width="18" height="14" rx="2"></rect>' +
          '<circle cx="8.5" cy="10.5" r="1.5"></circle>' +
          '<path d="m21 15-5-5-4 4-2-2-6 6"></path>' +
          '</svg></button>' +
          '</div></td>' +
          '<td class="cardset-edit-table__delete-cell">' +
          '<div class="cardset-edit-table__delete-wrap">' +
          '<button type="button" class="cardset-edit-row-delete" aria-label="Delete card">×</button>' +
          '</div></td>' +
          '</tr>'
        );
      })
      .join('');

    updatePreview();

    if (focusSelected && selectedId) {
      let row = tbody.querySelector(
        '[data-card-id="' + String(selectedId).replace(/"/g, '\\"') + '"]'
      );
      if (row) {
        let term = row.querySelector('[data-field="term"]');
        if (term) {
          term.focus();
        }
      }
    }
  }

  function selectRow(id) {
    if (selectedId === id) {
      return;
    }
    syncFromDom();
    selectedId = id;
    tbody.querySelectorAll('tr[data-card-id]').forEach(function (tr) {
      tr.classList.toggle('is-selected', tr.getAttribute('data-card-id') === id);
    });
    previewFrontSide = 'term';
    updatePreview();
  }

  function addRow() {
    syncFromDom();
    let id = 'card-' + Date.now();
    cards.push({
      id: id,
      term: '',
      definition: '',
      termImageUrl: ''
    });
    selectedId = id;
    renderTable(true);
  }

  function deleteRow(id) {
    syncFromDom();
    cards = cards.filter(function (c) {
      return c.id !== id;
    });
    if (selectedId === id) {
      selectedId = cards.length ? cards[cards.length - 1].id : null;
    }
    renderTable(false);
    persist();
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

  function applyImageToCard(cardId, url) {
    let card = findCard(cardId);
    if (!card) {
      return;
    }
    card.termImageUrl = url;
    let row = tbody.querySelector(
      '[data-card-id="' + String(cardId).replace(/"/g, '\\"') + '"]'
    );
    if (row) {
      let urlInput = row.querySelector('[data-field="termImageUrl"]');
      if (urlInput) {
        urlInput.value = url;
      }
    }
    if (selectedId === cardId) {
      updatePreview();
    }
  }

  async function uploadImageForCard(cardId, file) {
    if (!file || !cardId) {
      return;
    }
    try {
      setStatus('Uploading…');
      let dataUrl = await readFileAsDataUrl(file);
      let uploaded = await Api.uploadImage(dataUrl);
      applyImageToCard(cardId, uploaded.url);
      await persist();
    } catch (err) {
      setStatus(err.message || 'Could not upload image.', true);
    }
  }

  function wire() {
    if (wired || !tbody) {
      return;
    }
    wired = true;

    tbody.addEventListener('input', function (event) {
      let target = event.target;
      if (!target.matches('[data-field]')) {
        return;
      }
      let tr = target.closest('tr[data-card-id]');
      if (!tr) {
        return;
      }
      readRowIntoCard(tr);
      let id = tr.getAttribute('data-card-id');
      if (selectedId === id) {
        updatePreview();
      }
      scheduleSave();
    });

    tbody.addEventListener('paste', function (event) {
      let target = event.target;
      if (!target.matches('[data-field="termImageUrl"]')) {
        return;
      }
      let clip = event.clipboardData;
      if (!clip || !clip.items) {
        return;
      }
      for (let i = 0; i < clip.items.length; i++) {
        if (clip.items[i].type.indexOf('image') === -1) {
          continue;
        }
        let file = clip.items[i].getAsFile();
        if (!file) {
          continue;
        }
        event.preventDefault();
        let tr = target.closest('tr[data-card-id]');
        if (tr) {
          uploadImageForCard(tr.getAttribute('data-card-id'), file);
        }
        break;
      }
    });

    tbody.addEventListener('click', function (event) {
      let deleteBtn = event.target.closest('.cardset-edit-row-delete');
      if (deleteBtn) {
        event.preventDefault();
        let tr = deleteBtn.closest('tr[data-card-id]');
        if (tr) {
          deleteRow(tr.getAttribute('data-card-id'));
        }
        return;
      }

      let uploadBtn = event.target.closest('[data-upload-for]');
      if (uploadBtn) {
        event.preventDefault();
        imageTargetId = uploadBtn.getAttribute('data-upload-for');
        if (imageFileInput) {
          imageFileInput.click();
        }
        return;
      }

      let tr = event.target.closest('tr[data-card-id]');
      if (tr) {
        selectRow(tr.getAttribute('data-card-id'));
      }
    });

    tbody.addEventListener('focusin', function (event) {
      let tr = event.target.closest('tr[data-card-id]');
      if (tr) {
        selectRow(tr.getAttribute('data-card-id'));
      }
    });

    if (previewCard) {
      previewCard.addEventListener('click', function () {
        let card = selectedId ? findCard(selectedId) : null;
        if (!card || !hasContent(card)) {
          return;
        }
        Shared.flipCardElement(previewCard, card, previewFrontSide);
      });

      previewCard.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          previewCard.click();
        }
      });
    }

    if (imageFileInput) {
      imageFileInput.addEventListener('change', async function () {
        let file = imageFileInput.files && imageFileInput.files[0];
        imageFileInput.value = '';
        if (!file || !imageTargetId) {
          return;
        }
        await uploadImageForCard(imageTargetId, file);
        imageTargetId = null;
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addRow();
      });
    }
  }

  function setCardset(next) {
    cardset = next;
    cards = Array.isArray(next.cards) ? next.cards.slice() : [];
    selectedId = cards.length ? cards[0].id : null;
    if (layoutEl) {
      layoutEl.hidden = false;
    }
    renderTable(false);
    setStatus('');
  }

  wire();

  return {
    setCardset: setCardset,
    addRow: addRow,
    syncFromDom: syncFromDom
  };
}

window.StudyBuddyCardsetEdit = {
  create: createCardsetEditor
};
