/*
  cardset-edit-page.js
  --------------------
  Legacy URL — editor lives on cardset.html under the Edit tab.
*/

(function () {
  let id = window.StudyBuddyShared.getQueryParam('id');
  if (!id) {
    window.location.replace('/index.html');
    return;
  }
  window.location.replace(
    '/cardset.html?id=' + encodeURIComponent(id) + '&tab=edit'
  );
})();
