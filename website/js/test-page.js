/*
  test-page.js
  ------------
  Legacy URL — study lives on cardset.html with a Test tab.
*/

(function () {
  let id = window.StudyBuddyShared.getQueryParam('id');
  if (!id) {
    window.location.replace('/index.html');
    return;
  }
  let params = new URLSearchParams(window.location.search);
  params.set('id', id);
  params.set('tab', 'test');
  window.location.replace('/cardset.html?' + params.toString());
})();
