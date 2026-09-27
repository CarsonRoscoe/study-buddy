/*
  learn-page.js
  -------------
  Legacy URL — study lives on cardset.html with a Learn tab.
*/

(function () {
  let id = window.StudyBuddyShared.getQueryParam('id');
  if (!id) {
    window.location.replace('/index.html');
    return;
  }
  let params = new URLSearchParams(window.location.search);
  params.set('id', id);
  params.set('tab', 'learn');
  window.location.replace('/cardset.html?' + params.toString());
})();
