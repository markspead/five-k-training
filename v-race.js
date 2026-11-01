/* v-race.js: Race Day screen: goal, checklist, race stopwatch with splits, finish form, celebration, share card. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, C = window.Calc, P = window.Plan;
  var ITEMS = [['shoes', 'Shoes laced and double knotted'], ['bib', 'Bib / race number pinned on'], ['water', 'Water bottle filled'], ['food', 'Light breakfast eaten (2 to 3 hours before)'], ['warm', 'Warm-up walk done (5 to 10 minutes)']];

  App.checkItem = function (key, label) {
    var st = App.state, cb = h('input', { type: 'checkbox', checked: st.checklist[key] ? true : null });
    var row = h('label', { class: 'check' + (st.checklist[key] ? ' done' : '') }, cb, h('span', null, label));
    cb.addEventListener('change', function () { st.checklist[key] = cb.checked; App.save(); row.className = 'check' + (cb.checked ? ' done' : ''); });
    return row;
  };

  function finishCard(sec) {
    var st = App.state, mi = C.FIVE_K_MI, goal = st.goalTime;
    var diff = goal ? sec - goal : null;
    return h('div', { class: 'card accent' },
      h('div', { class: 'flourish', 'aria-hidden': 'true' }, App.svg('<svg viewBox="0 0 120 120"><circle class="c" cx="60" cy="60" r="54"/><path class="k" d="M38 62l16 16 28-32"/></svg>'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i')),
      h('h2', { style: 'text-align:center' }, 'You did it'),
      h('div', { class: 'big-time', style: 'font-size:3.4rem' }, C.fmtMS(sec)),
      h('div', { class: 'grid2', style: 'margin-top:.8rem' },
        h('div', { class: 'stat' }, h('b', null, App.paceStr(C.pace(sec, mi))), h('span', null, 'average pace')),
        h('div', { class: 'stat' }, h('b', null, diff == null ? '–' : (diff <= 0 ? '−' : '+') + C.fmtMS(Math.abs(diff))), h('span', null, goal ? 'vs goal ' + C.fmtMS(goal) : 'no goal set'))),
      h('p', { style: 'text-align:center' }, 'A 5K, finished. Be proud of the work you put in.'),
      h('button', { class: 'btn', onclick: function () {
        App.share.send({ title: 'Thanksgiving 5K', big: C.fmtMS(sec), lines: [['Distance', '3.1 mi / 5 km'], ['Pace', App.paceStr(C.pace(sec, mi))], ['Date', D.monthDay(App.state.raceResult ? App.state.raceResult.date : P.RACE) + ', 2026']], footer: 'Finished the 5K' }, '5k-finish.png'); } }, 'Share finish card'));
  }

  App.views.race = function (el) {
    var st = App.state, today = App.today(), timer = null;
    el.appendChild(App.back('today', 'Today'));
    el.appendChild(App.header('Race day'));
    el.appendChild(h('p', { class: 'muted', style: 'margin-top:-.5rem' }, 'Thursday, Nov 26 · 5K (3.1 miles)'));
    if (today < P.RACE) el.appendChild(h('div', { class: 'card note small' }, 'Race day is ' + D.diffDays(today, P.RACE) + ' days away. You can look around now; the stopwatch works any time.'));

    if (st.raceResult) { el.appendChild(finishCard(st.raceResult.sec)); }

    // goal
    var goalIn = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'mm:ss, like 38:00', value: st.goalTime ? C.fmtMS(st.goalTime) : '' });
    var goalInfo = h('p', { class: 'small muted' });
    function goalUpd() { var t = C.parseTime(goalIn.value); goalInfo.textContent = t ? 'That is ' + App.paceStr(C.pace(t, C.FIVE_K_MI)) + '. Finishing is the real goal.' : 'Optional. Finishing is the real goal.'; }
    goalIn.addEventListener('change', function () { var t = C.parseTime(goalIn.value); st.goalTime = t || null; App.save(); goalUpd(); });
    goalUpd();
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Goal time'), App.field('Your goal (optional)', goalIn), goalInfo));

    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Race morning checklist'), ITEMS.map(function (i) { return App.checkItem('race:' + i[0], i[1]); })));

    // stopwatch
    var rr = st.raceRun;
    var clock = h('div', { class: 'big-time', 'aria-live': 'off' }, '0:00'), splitsEl = h('div'), btnRow = h('div', { class: 'stack' });
    var sw = h('div', { class: 'card' }, h('h3', null, 'Race stopwatch'), clock, btnRow, splitsEl);
    el.appendChild(sw);
    function elapsedMs() { return !rr ? 0 : rr.status === 'running' ? Date.now() - rr.t0 : rr.finalMs || 0; }
    function paintSplits() {
      splitsEl.textContent = '';
      if (rr && rr.splits.length) splitsEl.appendChild(h('table', null, h('tr', null, h('th', null, App.unit() === 'km' ? 'Km' : 'Mile'), h('th', null, 'Split'), h('th', null, 'Total')),
        rr.splits.map(function (c, i) { return h('tr', null, h('td', null, String(i + 1)), h('td', null, C.fmtMS(c - (i ? rr.splits[i - 1] : 0))), h('td', null, C.fmtMS(c))); })));
    }
    function paintBtns() {
      btnRow.textContent = '';
      if (!rr || rr.status === 'idle') btnRow.appendChild(h('button', { class: 'btn primary big', onclick: function () { App.audioUnlock(); rr = st.raceRun = { status: 'running', t0: Date.now(), splits: [] }; App.save(); paintBtns(); startClock(); } }, 'Start race'));
      else if (rr.status === 'running') {
        btnRow.appendChild(h('button', { class: 'btn big', onclick: function () { rr.splits.push(Math.round(elapsedMs() / 1000)); App.save(); paintSplits(); if (navigator.vibrate && st.vibrate) navigator.vibrate(60); } }, App.unit() === 'km' ? 'Split (km)' : 'Split (mile)'));
        btnRow.appendChild(h('button', { class: 'btn primary big', onclick: function () { rr.finalMs = Date.now() - rr.t0; rr.status = 'stopped'; App.save(); paintBtns(); clock.textContent = C.fmtMS(rr.finalMs / 1000); } }, 'Finish'));
      } else {
        btnRow.appendChild(h('button', { class: 'btn ghost', onclick: function () { App.confirm('Clear this stopwatch?', 'Clear', true).then(function (ok) { if (ok) { rr = st.raceRun = null; App.save(); clock.textContent = '0:00'; paintBtns(); paintSplits(); } }); } }, 'Clear stopwatch'));
      }
    }
    function startClock() { clearInterval(timer); timer = setInterval(function () { clock.textContent = C.fmtMS(Math.floor(elapsedMs() / 1000)); }, 200); }
    paintBtns(); paintSplits(); clock.textContent = C.fmtMS(Math.floor(elapsedMs() / 1000));
    if (rr && rr.status === 'running') startClock();

    // finish form: official time
    var official = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'mm:ss', value: st.raceResult ? C.fmtMS(st.raceResult.sec) : (rr && rr.status === 'stopped' ? C.fmtMS(Math.round(rr.finalMs / 1000)) : ''), 'aria-label': 'Official finish time' });
    var err = h('p', { class: 'small', style: 'color:var(--bad)', role: 'alert' });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, st.raceResult ? 'Change your official time' : 'Record your finish'),
      App.field('Official time (mm:ss or h:mm:ss)', official, 'Fill this from the stopwatch, or type the time from the results.'), err,
      h('button', { class: 'btn primary', onclick: function () {
        var t = C.parseTime(official.value); if (!t || t < 600) { err.textContent = 'Enter a finish time like 36:42.'; return; }
        var date = today > P.RACE ? P.RACE : today; // race happened on race day
        st.log = st.log.filter(function (e) { return e.kind !== 'race'; });
        App.addEntry({ id: App.id(), date: date, sec: t, mi: C.FIVE_K_MI, kind: 'race', cont: true, effort: null, note: 'Thanksgiving 5K', planDate: P.RACE });
        st.raceResult = { sec: t, date: date }; App.save(); App.toast('Finish recorded'); App.rerender(); } }, 'Save official time')));
    return function () { clearInterval(timer); };
  };
})();
