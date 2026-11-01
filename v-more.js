/* v-more.js: the More tab: a simple menu of everything else. */
(function () {
  'use strict';
  var App = window.App, h = App.h;
  var GROUPS = [
    ['Training', [['badges', 'Badges', 'Achievements you have earned'], ['records', 'Personal records', 'Longest run, best pace, best 5K'], ['calc', 'Race pace calculator', 'Goal time to splits, and a 5K prediction'],
      ['treadmill', 'Treadmill converter', 'Speed to pace table'], ['zones', 'Pace zones', 'Easy, steady, hard and the talk test'], ['cadence', 'Cadence metronome', '150 to 190 steps per minute'],
      ['stretch', 'Warm-up and cool-down', 'Guided stretch routines']]],
    ['Health', [['shoes', 'Shoes', 'Track shoe miles'], ['body', 'Body log', 'Weight and resting heart rate (optional)'], ['fueling', 'Hydration and fueling', 'What to drink and eat'], ['safety', 'Safety tips', 'Stay healthy and injury free']]],
    ['Race week', [['checklist', 'Race-week checklist', 'Nov 19 to 26'], ['race', 'Race day', 'Goal, stopwatch, finish']]],
    ['App', [['settings', 'Settings', 'Level, units, look, backup'], ['help', 'Help and tour', 'Four quick screens']]]
  ];
  App.views.more = function (el) {
    el.appendChild(App.header('More'));
    GROUPS.forEach(function (g) {
      el.appendChild(h('h2', null, g[0]));
      el.appendChild(h('div', { class: 'card' }, h('ul', { class: 'list' }, g[1].map(function (i) {
        return h('li', null, h('a', { href: '#/' + i[0] }, h('div', { class: 'grow' }, h('div', { style: 'font-weight:600' }, i[1]), h('div', { class: 'muted small' }, i[2])), h('span', { class: 'chev' }, App.icon('chev'))));
      }))));
    });
  };
})();
