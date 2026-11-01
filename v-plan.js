/* v-plan.js: the Plan tab (calendar grouped by week) and the day detail screen. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, P = window.Plan, S = window.Stats, I = window.Ics;

  App.downloadIcs = function () {
    var st = App.state, text = I.build(App.plan(), { time: st.reminderTime, raceTime: st.raceTime, now: new Date() });
    App.download('5k-training.ics', text, 'text/calendar');
    App.toast('Calendar file saved. Open it to add the reminders.');
  };

  function typeLabel(d) { return d.type === 'run' ? App.words(d.total) : d.type === 'walk' ? 'Easy walk' : d.type === 'race' ? '3.1 mi / 5 km' : 'Rest'; }

  App.views.plan = function (el, params) {
    if (params[0] === 'day' && D.parse(params[1])) return dayView(el, params[1]);
    var plan = App.plan(), today = App.today(), done = App.done();
    el.appendChild(App.header('Plan', h('span', { class: 'pill' }, App.state.level === 'beginner' ? 'Beginner' : 'Intermediate')));
    P.groupWeeks(plan).forEach(function (w) {
      var card = h('div', { class: 'card' }, h('h2', null, w.label), h('p', { class: 'muted small', style: 'margin-top:-.3rem' }, D.monthDay(w.days[0].date) + ' to ' + D.monthDay(w.days[w.days.length - 1].date)));
      w.days.forEach(function (d) {
        var isDone = !!done[d.date], race = d.type === 'race';
        card.appendChild(h('a', { class: 'day' + (d.date === today ? ' today' : '') + (race ? ' race' : ''), href: '#/plan/day/' + d.date,
          'aria-label': D.dayName(d.date) + ' ' + D.monthDay(d.date) + ': ' + d.title + (isDone ? ', done' : '') },
          h('div', { class: 'dt' }, D.dayShort(d.date), h('small', null, D.monthDay(d.date))),
          h('div', { class: 'grow', style: 'flex:1;min-width:0' }, h('div', { style: 'font-weight:600' }, d.title), h('div', { class: 'muted small' }, typeLabel(d) + (d.shifted ? ' · moved' : ''))),
          d.type === 'rest' ? null : h('div', { class: 'tick' + (isDone ? ' on' : '') }, isDone ? App.icon('check') : null)));
      });
      el.appendChild(card);
    });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Reminders'), h('p', { class: 'muted small' }, 'Phones cannot be reliably reminded by a web app, so this makes a calendar file with every run and a 15 minute alert.'),
      h('button', { class: 'btn', onclick: App.downloadIcs }, 'Add reminders to Calendar'),
      h('p', { class: 'muted small' }, 'Time: ' + App.state.reminderTime + ' (change in Settings)')));
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Missed some days?'), h('button', { class: 'btn', onclick: function () { App.planOptions(today < P.START ? P.START : today > P.RACE ? P.RACE : today); } }, 'Plan options')));
  };

  function dayView(el, date) {
    var plan = App.plan(), d = P.dayOf(plan, date), today = App.today(), done = App.done();
    el.appendChild(App.back('plan', 'Plan'));
    if (!d) { el.appendChild(h('p', null, 'That date is not in the plan.')); return; }
    el.appendChild(App.header(D.dayName(date) + ', ' + D.monthDay(date)));
    var entries = App.state.log.filter(function (e) { return e.date === date || e.planDate === date; });
    var card = h('div', { class: 'card' + (d.type === 'race' ? ' accent' : '') }, h('h2', null, d.title), d.total ? h('p', { class: 'muted' }, 'Total time: ' + App.words(d.total)) : null);
    var lines = App.workoutLines(d);
    if (lines.length) card.appendChild(h('table', null, lines.map(function (l) { return h('tr', null, h('th', null, l[0]), h('td', null, l[1])); })));
    card.appendChild(h('p', null, d.desc));
    el.appendChild(card);
    var acts = h('div', { class: 'stack' });
    if (d.type === 'race') acts.appendChild(h('a', { class: 'btn primary big', href: '#/race' }, 'Open race day'));
    if (d.type === 'run' || d.type === 'walk') acts.appendChild(h('a', { class: 'btn primary big', href: '#/run/' + date }, 'Start this workout'));
    if (d.type !== 'rest' && d.type !== 'race') {
      if (!done[date]) acts.appendChild(h('div', { class: 'grid2' }, h('button', { class: 'btn', onclick: function () { App.quickDone(d); } }, 'Mark as done'), h('a', { class: 'btn', href: '#/log/new/' + date }, 'Log run')));
    }
    el.appendChild(acts);
    if (entries.length) {
      el.appendChild(h('h2', null, 'Logged'));
      entries.forEach(function (e) { el.appendChild(App.entryCard(e)); });
    }
    if (date >= today && date < P.RACE) el.appendChild(h('div', { class: 'card note' }, h('button', { class: 'btn small', onclick: function () { App.planOptions(date); } }, 'Adjust plan from here')));
  }
})();
