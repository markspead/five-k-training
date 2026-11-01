/* onboarding.js: 4 short first-launch screens with a Skip button. */
(function () {
  'use strict';
  var App = window.App, h = App.h;
  var SCREENS = [
    ['<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'Welcome', 'A 25-day plan to your first 5K on Thanksgiving, Thursday Nov 26. Training starts Monday Nov 2. Short workouts, plenty of rest.'],
    ['<path d="M5 12l5 5 9-10"/>', 'Follow the timer', 'On Today, tap Start. The timer beeps, vibrates and speaks when to run and walk. Keep your screen on while you go.'],
    ['<path d="M4 19V8M10 19V4M16 19v-8M22 19H2"/>', 'Log and track', 'Mark runs as done, add distance and how it felt, and watch your streak, progress charts and badges grow. Missed a day? Skip it, no guilt.'],
    ['<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/>', 'Your phone, your data', 'Everything stays on this phone and works offline. On iPhone, tap Share and Add to Home Screen. Back up from Settings now and then.']
  ];
  App.showTour = function (manual) {
    var i = 0, holder = h('div'), m;
    function done() { App.state.onboarded = true; App.save(); m.close(); }
    function paint() {
      var s = SCREENS[i];
      holder.textContent = '';
      holder.appendChild(h('div', { class: 'onb stack' }, App.svg('<svg viewBox="0 0 24 24" aria-hidden="true">' + s[0] + '</svg>'), h('h2', { style: 'margin:0' }, s[1]), h('p', null, s[2]),
        h('div', { class: 'dots', 'aria-label': 'Screen ' + (i + 1) + ' of 4' }, SCREENS.map(function (_, j) { return h('i', { class: j === i ? 'on' : '' }); })),
        h('div', { class: 'row', style: 'justify-content:center' },
          h('button', { class: 'btn ghost', onclick: done }, 'Skip'),
          i > 0 ? h('button', { class: 'btn', onclick: function () { i--; paint(); } }, 'Back') : null,
          h('button', { class: 'btn primary', onclick: function () { if (i < 3) { i++; paint(); } else done(); } }, i < 3 ? 'Next' : 'Get started'))));
      var b = holder.querySelector('.btn.primary'); if (b) b.focus();
    }
    m = App.modal(holder, { center: true, sticky: false, label: 'Welcome tour', onclose: function () { if (!App.state.onboarded) { App.state.onboarded = true; App.save(); } } });
    paint();
  };
})();
