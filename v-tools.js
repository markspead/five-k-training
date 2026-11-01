/* v-tools.js: Race pace calculator, treadmill converter, pace zones. */
(function () {
  'use strict';
  var App = window.App, h = App.h, C = window.Calc, S = window.Stats;

  App.views.calc = function (el) {
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Race pace calculator'));
    var goal = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'mm:ss, like 36:00', value: App.state.goalTime ? C.fmtMS(App.state.goalTime) : '' });
    var out = h('div');
    function table(rows, head) {
      return h('table', null, h('tr', null, h('th', null, head), h('th', null, 'Split time')), rows.map(function (r) { return h('tr', null, h('td', null, r.mark), h('td', null, C.fmtMS(r.cum))); }));
    }
    function upd() {
      out.textContent = ''; var t = C.parseTime(goal.value);
      if (!t || t < 600) { out.appendChild(h('p', { class: 'muted' }, 'Enter a goal time to see your splits.')); return; }
      var s = C.splitsTable(t);
      out.append(h('div', { class: 'grid2' }, h('div', { class: 'stat' }, h('b', null, C.fmtMS(s.perMile)), h('span', null, 'per mile')), h('div', { class: 'stat' }, h('b', null, C.fmtMS(s.perKm)), h('span', null, 'per km'))),
        h('h3', { style: 'margin-top:1rem' }, 'Per mile'), table(s.mile, 'Mile'), h('h3', { style: 'margin-top:1rem' }, 'Per km'), table(s.km, 'Km'),
        h('p', { class: 'muted small' }, 'Even pacing. Starting a little slower than this and finishing faster is usually smoother.'));
    }
    goal.addEventListener('input', upd);
    el.appendChild(h('div', { class: 'card' }, App.field('Goal time', goal), out)); upd();

    // prediction
    var runs = App.sortedLog().filter(function (e) { return e.mi >= 0.5; });
    var sel = h('select', null, h('option', { value: '' }, 'Choose a logged run'), runs.map(function (e) { return h('option', { value: e.id }, window.Dates.label(e.date) + ': ' + App.dist(e.mi) + ' in ' + App.dur(e.sec)); }));
    var t2 = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'mm:ss' }), d2 = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', placeholder: App.unit() });
    var res = h('div', { 'aria-live': 'polite' });
    function pred() {
      res.textContent = ''; var t, mi;
      if (sel.value) { var e = App.state.log.filter(function (x) { return x.id === sel.value; })[0]; t = e.sec; mi = e.mi; }
      else { t = C.parseTime(t2.value); mi = C.fromUnit(parseFloat(d2.value), App.unit()); }
      if (!(t > 0) || !(mi > 0)) return;
      var f = C.predict5K(t, mi);
      res.append(h('div', { class: 'stat' }, h('b', null, C.fmtMS(f)), h('span', null, 'predicted 5K finish (' + App.paceStr(C.pace(f, C.FIVE_K_MI)) + ')')),
        h('p', { class: 'muted small' }, 'Riegel formula: T2 = T1 × (D2 / D1)^1.06. A rough guide. Runs with walk breaks and short runs predict slower than you may really run.'));
    }
    [sel, t2, d2].forEach(function (x) { x.addEventListener('input', pred); x.addEventListener('change', pred); });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Predict my 5K'), App.field('From a logged run', sel), h('p', { class: 'muted small' }, 'or enter any run:'),
      h('div', { class: 'grid2' }, App.field('Time', t2), App.field('Distance (' + App.unit() + ')', d2)), res));
  };

  App.views.treadmill = function (el) {
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Treadmill converter'));
    var u = App.unit() === 'km' ? 'km/h' : 'mph', per = App.unit();
    var sp = h('input', { type: 'number', inputmode: 'decimal', step: '0.1', value: App.unit() === 'km' ? '9.6' : '6.0' }), pc = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'mm:ss' });
    var o1 = h('p', { 'aria-live': 'polite', style: 'font-weight:700' }), o2 = h('p', { 'aria-live': 'polite', style: 'font-weight:700' });
    sp.addEventListener('input', function () { var v = parseFloat(sp.value); o1.textContent = v > 0 ? v + ' ' + u + ' = ' + C.fmtPace(C.speedToPace(v)) + ' per ' + per + ' · 5K in ' + C.fmtMS(C.speedToPace(v) * (per === 'km' ? 5 : C.FIVE_K_MI)) : ''; });
    pc.addEventListener('input', function () { var t = C.parseTime(pc.value); o2.textContent = t > 0 ? C.fmtMS(t) + ' per ' + per + ' = ' + C.paceToSpeed(t).toFixed(1) + ' ' + u : ''; });
    sp.dispatchEvent(new Event('input'));
    el.appendChild(h('div', { class: 'card' }, App.field('Speed (' + u + ') to pace', sp), o1, App.field('Pace (per ' + per + ') to speed', pc), o2));
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Pace table'), h('table', null, h('tr', null, h('th', null, u), h('th', null, 'Pace /' + per), h('th', null, '5K time')),
      C.paceTable(per).map(function (r) { return h('tr', null, h('td', null, r.speed.toFixed(2).replace(/0$/, '')), h('td', null, C.fmtMS(r.pace)), h('td', null, C.fmtMS(r.fiveK))); })),
      h('p', { class: 'muted small' }, 'Many treadmills read slightly fast or slow. Set the incline to 1% to feel more like outdoors.')));
    el.appendChild(h('a', { class: 'btn', href: '#/run' }, 'Start a treadmill run'));
  };

  App.views.zones = function (el) {
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Pace zones'));
    var rec = S.records(App.state.log), base = rec.best5K ? C.paceIn(rec.best5K.sec / C.FIVE_K_MI, App.unit()) : null;
    function range(a, b) { return base ? ' About ' + C.fmtMS(base + a) + (b != null ? ' to ' + C.fmtMS(base + b) : ' or slower') + ' per ' + App.unit() + '.' : ''; }
    function zone(name, color, text, talk, rng) {
      return h('div', { class: 'card' }, h('div', { class: 'row' }, h('span', { class: 'pill accent' }, name)), h('p', null, text), h('p', { class: 'small' }, h('b', null, 'Talk test: '), talk), rng ? h('p', { class: 'muted small' }, rng) : null);
    }
    el.appendChild(h('p', { class: 'muted' }, 'Most of your runs should feel easy. Speed comes later.'));
    el.appendChild(zone('Easy', '', 'Comfortable and relaxed. You could keep going much longer. This is where almost all of your training belongs.', 'You can speak full sentences without gasping.', range(60, null)));
    el.appendChild(zone('Steady', '', 'Controlled and a little work. Good for the middle of a longer run or the 5K itself.', 'You can speak in short sentences, a few words at a time.', range(20, 60)));
    el.appendChild(zone('Hard', '', 'Tough, for short bursts only. Not needed for your first 5K.', 'You can say one or two words. Breathing is heavy.', range(-30, 20)));
    el.appendChild(h('div', { class: 'card note' }, h('p', null, 'If you are unsure, slow down. If you cannot talk, you are going too fast for a beginner run.'),
      base ? h('p', { class: 'muted small' }, 'Ranges are based on your best predicted 5K pace.') : h('p', { class: 'muted small' }, 'After you log a run of 1 mile or more, pace ranges for your zones appear here.')));
  };
})();
