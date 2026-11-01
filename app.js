/* app.js: start-up. Registers the service worker (offline support), restores a running session, shows the tour on first launch. */
(function () {
  'use strict';
  var App = window.App;
  App.start();
  App.sessionResume();
  if (!App.state.onboarded) App.showTour(false);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is optional */ }); });
  }
})();
