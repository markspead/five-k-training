/* v-progress.js: totals, readiness, weekly distance bars, pace-over-time line, 5K prediction. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, C = window.Calc, P = window.Plan, S = window.Stats;

  App.views.progress = function (el) {
    var st = App.state, log = st.log, today = App.today(), u = App.unit();
    el.appendChild(App.header('Progress'));
    el.appendChild(h('div', { class: 'seg', role: 'group', 'aria-label': 'Log views' }, h('button', { 'aria-pressed': 'false', onclick: function () { App.nav('log'); } }, 'History'), h('button', { 'aria-pressed': 'true' }, 'Progress')));
    var tot = log.reduce(function (a, e) { a.mi += e.mi || 0; a.sec += e.sec; return a; }, { mi: 0, sec: 0 }), rec = S.records(log);
    var streak = S.planStreak(App.plan(), log, today < P.START ? P.START : today > P.RACE ? P.RACE : today, P.START);
    function stat(v, l) { return h('div', { class: 'stat' }, h('b', null, v), h('span', null, l)); }
    el.appendChild(h('div', { class: 'grid2', style: 'margin-top:.75rem' }, stat(String(log.length), 'runs'), stat(App.dist(tot.mi, 1), 'total distance'), stat(App.words(tot.sec), 'total time'), stat(streak + (streak === 1 ? ' day' : ' days'), 'current streak'),
      stat(rec.longest ? App.dist(rec.longest.mi) : '–', 'longest run'), stat(rec.bestPace ? App.paceStr(rec.bestPace.sec) : '–', 'best pace')));
    // readiness
    var longest = rec.longest ? rec.longest.mi : 0, frac = Math.min(1, longest / C.FIVE_K_MI);
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Race readiness'),
      h('p', null, 'Longest run: ' + (u === 'km' ? C.toUnit(longest, 'km').toFixed(1) + ' km of 5 km' : longest.toFixed(1) + ' mi of 3.1 mi')),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(frac * 100)), 'aria-label': 'Longest run compared to 5K' }, h('b', { style: 'width:' + (frac * 100) + '%' })),
      rec.best5K ? h('p', { class: 'small muted' }, 'Predicted 5K from your best effort: ' + C.fmtMS(rec.best5K.sec) + (rec.best5K.actual ? '' : ' (Riegel formula)')) : h('p', { class: 'small muted' }, 'Log a run with a distance of 1 mile or more to see a predicted 5K time.')));
    // weekly distance bars: the 4 plan weeks
    var wt = S.weeklyTotals(log), items = P.groupWeeks(App.plan()).map(function (w) {
      var v = wt[w.start] ? C.toUnit(wt[w.start].mi, u) : 0; return { label: 'W' + w.n, value: v, text: v.toFixed(1) };
    });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Weekly distance (' + u + ')'), App.chart.bars(items, { label: 'Weekly distance in ' + u })));
    // pace over time
    var pts = log.filter(function (e) { return e.mi > 0.1 && e.sec > 0; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (e) {
      return { label: D.monthDay(e.date), value: C.paceIn(C.pace(e.sec, e.mi), u) }; });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Pace over time (min/' + u + ')'), App.chart.line(pts, { invert: true, fmt: function (v) { return C.fmtMS(v); }, label: 'Pace over time' }),
      h('p', { class: 'muted small' }, 'Higher on the chart is faster. Walk breaks make guided runs look slower.')));
    var ws = D.weekStart(today < P.START ? P.START : today > P.RACE ? D.weekStart(P.RACE) : today);
    el.appendChild(App.weeklyCard(ws, 'Week of ' + D.monthDay(ws)));
    el.appendChild(h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/records' }, 'Personal records'), h('a', { class: 'btn', href: '#/badges' }, 'Badges')));
  };
})();
