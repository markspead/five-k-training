/* v-badges.js: Badges screen and Personal records. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, C = window.Calc, B = window.Badges, S = window.Stats;

  App.views.badges = function (el) {
    var res = B.evaluate({ log: App.state.log, plan: App.plan(), today: App.today() }), n = 0;
    B.DEFS.forEach(function (d) { if (res[d.id].earned) n++; });
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Badges'));
    el.appendChild(h('p', { class: 'muted' }, n + ' of ' + B.DEFS.length + ' earned'));
    var grid = h('div', { class: 'badges' });
    B.DEFS.forEach(function (d) {
      var r = res[d.id];
      grid.appendChild(h('div', { class: 'badge ' + (r.earned ? 'on' : 'off'), role: 'group', 'aria-label': d.name + (r.earned ? ', earned' : ', not yet') + '. ' + d.desc },
        App.svg('<svg viewBox="0 0 24 24" aria-hidden="true">' + d.icon + '</svg>'), h('b', null, d.name), h('small', null, r.earned ? (r.date ? D.monthDay(r.date) : 'Earned') : d.desc)));
    });
    el.appendChild(grid);
  };

  App.views.records = function (el) {
    var r = S.records(App.state.log);
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Personal records'));
    function row(label, val, date, note) {
      return h('li', null, h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'muted small' }, label), h('div', { style: 'font-size:1.3rem;font-weight:700' }, val || '–'),
        note ? h('div', { class: 'muted small' }, note) : null), date ? h('span', { class: 'muted small' }, D.label(date)) : null));
    }
    el.appendChild(h('div', { class: 'card' }, h('ul', { class: 'list' },
      row('Longest run', r.longest ? App.dist(r.longest.mi) : null, r.longest && r.longest.date),
      row('Fastest mile pace', r.bestPace ? App.paceStr(r.bestPace.sec) : null, r.bestPace && r.bestPace.date, 'From continuous runs of 1 mile or more, or a GPS split.'),
      row('Fastest 5K equivalent', r.best5K ? C.fmtMS(r.best5K.sec) : null, r.best5K && r.best5K.date, r.best5K && !r.best5K.actual ? 'Predicted with the Riegel formula.' : null),
      row('Most miles in a week', r.weeklyMi ? App.dist(r.weeklyMi.mi, 1) : null, r.weeklyMi && r.weeklyMi.date, r.weeklyMi ? 'Week starting' : null))));
    if (!App.state.log.length) el.appendChild(h('p', { class: 'muted' }, 'Records appear after you log runs with distance.'));
  };
})();
