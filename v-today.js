/* v-today.js: the Today screen: countdown, widget summary, today's workout, missed-day help, check-in, weekly summary. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, P = window.Plan, S = window.Stats, C = window.Calc, T = window.Timer;

  /* Plain-words breakdown of a day: warm-up / main / cool-down lines. */
  App.workoutLines = function (day) {
    var segs = day.segments, lines = [];
    if (!segs.length) return lines;
    if (segs[0][0] === 'warmup') lines.push(['Warm-up', App.words(segs[0][1]) + ' easy walk']);
    var mid = segs.filter(function (s) { return s[0] === 'run' || s[0] === 'walk'; });
    if (mid.length) {
      var runs = mid.filter(function (s) { return s[0] === 'run'; });
      if (runs.length === 1) lines.push(['Run', App.words(runs[0][1]) + ' continuous, easy pace']);
      else if (runs.length > 1) {
        var walk = mid.filter(function (s) { return s[0] === 'walk'; })[0];
        lines.push(['Intervals', runs.length + ' × run ' + T.speakDur(runs[0][1]) + ' + walk ' + (walk ? T.speakDur(walk[1]) : '')]);
      } else lines.push(['Walk', App.words(mid[0][1]) + ' brisk walk']);
    }
    if (segs[segs.length - 1][0] === 'cooldown') lines.push(['Cool-down', App.words(segs[segs.length - 1][1]) + ' easy walk']);
    return lines;
  };
  App.quickDone = function (day) {
    App.addEntry({ id: App.id(), date: day.date <= App.today() ? day.date : App.today(), sec: day.total, mi: null, kind: 'guided', cont: false, planDate: day.date, effort: null, note: '' });
    App.toast('Marked as done. Nice work.');
    App.rerender();
  };

  /* Offer: shift forward / repeat week. `from` is the date the shift starts at. */
  App.planOptions = function (from) {
    var plan = App.plan(), shift = P.shiftForward(plan, from), rep = P.repeatWeek(plan, D.weekStart(from));
    var m = App.modal(h('div', { class: 'stack' },
      h('h2', null, 'Adjust the plan'),
      h('p', { class: 'muted' }, 'Race day stays fixed on Thursday, Nov 26. No guilt: life happens, and these keep you on track.'),
      h('button', { class: 'btn primary big', disabled: !shift.changed, onclick: function () {
        App.state.adjust.push({ op: 'shift', from: from }); App.save(); m.close(); App.toast('Plan shifted forward one day'); App.rerender(); } }, 'Shift the plan forward one day'),
      h('p', { class: 'muted small' }, 'Everything from ' + D.label(from) + ' moves a day later and one rest day is absorbed. The rest day before the race stays.'),
      h('button', { class: 'btn big', disabled: !rep.changed, onclick: function () {
        App.state.adjust.push({ op: 'repeat', from: D.weekStart(from) }); App.save(); m.close(); App.toast('Next week now repeats this week'); App.rerender(); } }, 'Repeat this week'),
      h('p', { class: 'muted small' }, rep.changed ? 'Next week uses this week\'s workouts, so you get one more week at this level. Race week is never changed.' : 'Not available now: the next week is race week, which stays as planned.'),
      App.state.adjust.length ? h('button', { class: 'btn ghost', onclick: function () { App.state.adjust = []; App.save(); m.close(); App.toast('Plan reset to original'); App.rerender(); } }, 'Undo all adjustments') : null,
      h('button', { class: 'btn ghost', onclick: function () { m.close(); } }, 'Close')), { label: 'Adjust the plan' });
  };

  App.weeklyCard = function (ws, title) {
    var s = S.weeklySummary(App.state.log, ws);
    function delta(v, f) { return v === 0 ? 'same as last week' : (v > 0 ? '+' : '−') + f(Math.abs(v)) + ' vs last week'; }
    var card = h('div', { class: 'card' }, h('h2', null, title || 'This week'),
      h('div', { class: 'grid3' },
        h('div', { class: 'stat' }, h('b', null, String(s.runs)), h('span', null, 'runs')),
        h('div', { class: 'stat' }, h('b', null, C.toUnit(s.mi, App.unit()).toFixed(1)), h('span', null, App.unit())),
        h('div', { class: 'stat' }, h('b', null, App.words(s.sec)), h('span', null, 'time'))),
      h('p', { class: 'muted small' }, delta(s.dRuns, function (v) { return v + (v === 1 ? ' run' : ' runs'); }) + ' · ' + delta(Math.round(s.dMi * 100) / 100, function (v) { return C.toUnit(v, App.unit()).toFixed(1) + ' ' + App.unit(); })),
      h('button', { class: 'btn small', onclick: function () {
        App.share.send({ title: 'Week of ' + D.monthDay(ws), big: C.toUnit(s.mi, App.unit()).toFixed(1) + ' ' + App.unit(),
          lines: [['Runs', String(s.runs)], ['Time', App.dur(s.sec)], ['Vs last week', (s.dMi >= 0 ? '+' : '−') + C.toUnit(Math.abs(s.dMi), App.unit()).toFixed(1) + ' ' + App.unit()]], footer: '5K Training · Thanksgiving 5K' }, 'week-' + ws + '.png'); } }, 'Share'));
    return card;
  };

  function countdown(today) {
    var n = D.diffDays(today, P.RACE);
    return n === 0 ? 'Race day is today' : n === 1 ? '1 day to the 5K' : n + ' days to the 5K';
  }

  function widget(today, plan) {
    var ws = D.weekStart(today), wk = plan.filter(function (d) { return D.weekStart(d.date) === ws && d.type === 'run'; });
    var done = App.done(), nDone = wk.filter(function (d) { return done[d.date]; }).length;
    var streak = S.planStreak(plan, App.state.log, today, P.START);
    var next = P.nextWorkout(plan, today === P.RACE || today < P.START ? today : (done[today] ? D.addDays(today, 1) : today));
    return h('div', { class: 'card widget' },
      App.chart.ring(wk.length ? nDone / wk.length : 0, nDone + '/' + wk.length, 88, 'Weekly goal: ' + nDone + ' of ' + wk.length + ' runs done'),
      h('div', null,
        h('div', { class: 'streak', 'aria-label': 'Streak ' + streak + ' days' }, App.icon('flame', 'flame'), streak + (streak === 1 ? ' day' : ' days')),
        h('div', { class: 'muted small' }, 'Weekly goal: ' + nDone + ' of ' + wk.length + ' runs'),
        next ? h('div', { class: 'small' }, h('b', null, 'Next: '), D.label(next.date) + ' · ' + next.title) : null));
  }

  function workoutCard(day, today, done) {
    var isDone = !!done[day.date];
    if (day.type === 'rest') return h('div', { class: 'card' }, h('span', { class: 'pill' }, 'Today'), h('h2', null, day.title), h('p', null, day.desc));
    var lines = App.workoutLines(day);
    return h('div', { class: 'card accent' },
      h('div', { class: 'row between' }, h('span', { class: 'pill accent' }, day.date === today ? 'Today' : D.label(day.date)), isDone ? h('span', { class: 'pill' }, 'Done ✓') : null),
      h('h2', { style: 'margin-top:.5rem' }, day.title),
      h('p', { class: 'muted' }, 'Total time: ' + App.words(day.total)),
      h('table', null, lines.map(function (l) { return h('tr', null, h('th', null, l[0]), h('td', null, l[1])); })),
      h('p', { class: 'small' }, day.desc),
      h('div', { class: 'stack', style: 'margin-top:.8rem' },
        h('a', { class: 'btn primary big', href: '#/run/' + day.date }, isDone ? 'Run it again' : 'Start'),
        isDone ? null : h('div', { class: 'grid2' },
          h('button', { class: 'btn', onclick: function () { App.quickDone(day); } }, 'Mark as done'),
          h('a', { class: 'btn', href: '#/log/new/' + day.date }, 'Log run'))));
  }

  function checkinCard(today, day) {
    var c = App.state.checkins[today] || {}, out = h('p', { class: 'small' }), act = h('div');
    function update() {
      App.state.checkins[today] = c; App.save();
      var sug = S.suggestion(c.legs && c.sleep && c.sore ? c : null);
      out.textContent = sug ? sug.text : '';
      act.textContent = '';
      if (sug && sug.rest) act.appendChild(h('button', { class: 'btn small', onclick: function () { App.planOptions(today); } }, 'Swap in a rest day'));
    }
    var card = h('div', { class: 'card' }, h('h2', null, 'Pre-run check-in'),
      h('p', { class: 'muted small' }, 'Optional. Takes 10 seconds.'),
      h('label', null, 'How do your legs feel?'), App.seg('Legs', c.legs, function (v) { c.legs = v; update(); }, ['Heavy', 'Fresh']),
      h('label', null, 'How did you sleep?'), App.seg('Sleep', c.sleep, function (v) { c.sleep = v; update(); }, ['Poorly', 'Great']),
      h('label', null, 'Soreness'), App.seg('Soreness', c.sore, function (v) { c.sore = v; update(); }, ['None', 'Very sore']), out, act);
    var sug = S.suggestion(c.legs && c.sleep && c.sore ? c : null);
    if (sug) { out.textContent = sug.text; if (sug.rest) act.appendChild(h('button', { class: 'btn small', onclick: function () { App.planOptions(today); } }, 'Swap in a rest day')); }
    return card;
  }

  App.views.today = function (el) {
    var today = App.today(), plan = App.plan(), done = App.done(), st = App.state, phase = P.phaseOf(today);
    el.appendChild(h('div', { class: 'head' }, h('h1', null, 'Today'),
      h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Settings' }, App.icon('gear'))));
    el.appendChild(h('p', { class: 'muted', style: 'margin-top:-.5rem' }, D.dayName(today) + ', ' + D.monthDay(today)));
    if (App.memOnly) el.appendChild(h('div', { class: 'card note small' }, 'Your browser is not letting this app save data. Runs will be lost when you close it. Try Safari and Add to Home Screen.'));
    if (S.shouldRemindBackup(st.log.length, st.lastBackupLen))
      el.appendChild(h('div', { class: 'card note' }, h('b', null, 'Back up your runs'), h('p', { class: 'small' }, 'You have logged ' + (st.log.length - st.lastBackupLen) + ' runs since your last backup. Saving a copy takes a second.'),
        h('button', { class: 'btn small', onclick: function () { App.exportJSON(); App.rerender(); } }, 'Export backup')));

    el.appendChild(h('div', { class: 'card hero' }, h('div', { class: 'num' }, phase === 'after' ? '5K' : String(Math.max(0, D.diffDays(today, P.RACE)))),
      h('div', { class: 'muted' }, phase === 'after' ? 'Thanksgiving 5K is done' : phase === 'race' ? 'Race day is today' : D.diffDays(today, P.RACE) === 1 ? 'day to the 5K' : 'days to the 5K'),
      h('span', { class: 'sr-only', style: 'position:absolute;left:-999px' }, countdown(today))));

    var ses = st.session;
    if (ses && ses.status !== 'done') el.appendChild(h('a', { class: 'card accent', style: 'display:block;text-decoration:none;color:inherit', href: '#/run' }, h('b', null, 'A run is ' + (ses.status === 'paused' ? 'paused' : 'in progress')), h('div', { class: 'muted small' }, 'Tap to go back to the timer.')));
    var oldShoe = st.shoes.filter(function (s) { return !s.retired && S.shoeStatus(S.shoeMiles(s, st.log)) === 'replace'; })[0];
    if (oldShoe) el.appendChild(h('a', { class: 'card note', style: 'display:block;text-decoration:none;color:inherit', href: '#/shoes' }, h('b', null, oldShoe.name + ' has 300+ miles'), h('div', { class: 'muted small' }, 'Time to think about new shoes.')));

    if (phase === 'before') {
      el.appendChild(h('div', { class: 'card accent' }, h('h2', null, 'Training starts Monday Nov 2'), h('p', null, 'Tomorrow is day one. Lay out your shoes, charge your phone and have some water ready.'),
        h('p', { class: 'muted small' }, 'First workout: ' + plan[0].title + ' (' + App.words(plan[0].total) + ')'),
        h('a', { class: 'btn', href: '#/plan' }, 'See the full plan')));
      el.appendChild(h('div', { class: 'card note small' }, 'Your level is ' + st.level + '. You can change it in Settings before you start.'));
      return;
    }
    if (phase === 'after') { afterRace(el); return; }

    el.appendChild(widget(today, plan));
    var day = P.dayOf(plan, today);

    // gentle missed-day message
    var missed = P.missedRuns(plan, done, today).filter(function (d) { return D.diffDays(d.date, today) <= 7; });
    if (missed.length) {
      var m = missed[missed.length - 1];
      el.appendChild(h('div', { class: 'card note' }, h('b', null, 'Missed ' + D.dayName(m.date) + ': skip it and keep going.'),
        h('p', { class: 'small muted' }, 'Nothing to make up. If you would like more room, you can adjust the plan.'),
        h('button', { class: 'btn small', onclick: function () { App.planOptions(today); } }, 'Plan options')));
    }

    if (phase === 'race') {
      el.appendChild(h('div', { class: 'card accent' }, h('span', { class: 'pill accent' }, 'Race day'), h('h2', { style: 'margin-top:.5rem' }, 'Thanksgiving 5K'),
        h('p', null, st.raceResult ? 'You finished in ' + App.dur(st.raceResult.sec) + '. Well done.' : (st.goalTime ? 'Goal time: ' + App.dur(st.goalTime) + '. ' : '') + 'Warm up, start easy, enjoy it.'),
        h('a', { class: 'btn primary big', href: '#/race' }, st.raceResult ? 'See your finish' : 'Open race day')));
    } else {
      el.appendChild(workoutCard(day, today, done));
      if (day.type === 'run' && !done[today]) el.appendChild(checkinCard(today, day));
    }
    if (D.dow(today) === 0) el.appendChild(App.weeklyCard(D.weekStart(today), 'Your week'));
    if (today >= '2026-11-19') el.appendChild(h('a', { class: 'card note', style: 'display:block;text-decoration:none;color:inherit', href: '#/checklist' }, h('b', null, 'Race-week checklist'), h('div', { class: 'muted small' }, 'Nov 19 to 26: small things to get ready. Tap to open.')));
  };

  function afterRace(el) {
    var st = App.state, log = st.log, tot = log.reduce(function (a, e) { a.mi += e.mi || 0; a.sec += e.sec; return a; }, { mi: 0, sec: 0 }), rec = S.records(log);
    el.appendChild(h('div', { class: 'card accent' }, h('div', { class: 'flourish', 'aria-hidden': 'true' }, App.svg('<svg viewBox="0 0 120 120"><circle class="c" cx="60" cy="60" r="54"/><path class="k" d="M38 62l16 16 28-32"/></svg>'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i')),
      h('h2', { style: 'text-align:center' }, 'The 5K is done'),
      h('p', { style: 'text-align:center' }, st.raceResult ? 'Official time: ' + App.dur(st.raceResult.sec) : 'Thanks for putting in the work.'),
      h('div', { class: 'grid2' }, h('div', { class: 'stat' }, h('b', null, String(log.length)), h('span', null, 'runs logged')), h('div', { class: 'stat' }, h('b', null, App.dist(tot.mi, 1)), h('span', null, 'total distance')),
        h('div', { class: 'stat' }, h('b', null, App.words(tot.sec)), h('span', null, 'total time')), h('div', { class: 'stat' }, h('b', null, rec.longest ? App.dist(rec.longest.mi, 1) : '–'), h('span', null, 'longest run')))));
    el.appendChild(h('div', { class: 'card' }, h('p', null, 'Keep going if you like. Free run, GPS and treadmill modes still work, and the log keeps everything.'),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/run' }, 'Free run'), h('a', { class: 'btn', href: '#/progress' }, 'Progress'), h('a', { class: 'btn', href: '#/badges' }, 'Badges'))));
  }
})();
