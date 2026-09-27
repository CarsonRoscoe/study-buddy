/*
  id.js
  -----
  Job: build simple timestamp ids for JSON filenames.
  Example: class-1726612345678
*/

function makeId(prefix) {
  // Date.now() is milliseconds since 1970 — unique enough for one student
  // creating one item at a time on a local machine.
  return prefix + '-' + Date.now();
}

function assertSafeId(id, label) {
  // Regex: only letters, numbers, dash, underscore for the whole string.
  // Rejecting bad ids stops path tricks like "../../secret".
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    const error = new Error('Invalid ' + (label || 'id'));
    error.code = 'INVALID_ID';
    throw error;
  }
}

module.exports = {
  makeId: makeId,
  assertSafeId: assertSafeId
};
