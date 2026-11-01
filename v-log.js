/* v-log.js: run history, add/edit form, delete with confirm. Also App.addEntry (shared by every way of logging a run). */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, C = window.Calc, P = window.Plan, S = window.Stats, B = window.Badges;

  App.addEntry = function (e) {
    var st = App.state, ctx = function () { return B.evaluate({ log: st.log, plan: App.plan(), today: App.today() }); };
    var before = ctx();
    st.log.push(e);
    if (e.shoeId) st.lastShoe = e.shoeId;
    App.save();
    var after = ctx(), won = B.DEFS.filter(function (d) { return after[d.id].earned && !before[d.id].earned; });
    if (won.length) setTimeout(function () { App.toast('New badge: ' + won.map(function (d) { return d.name; }).join(', ')); }, 1600);
    return e;
  };
  var FEEL = ['Rough', 'Great'];

  App.entryCard = function (e) {
    var pace = e.mi > 0 ? C.pace(e.sec, e.mi) : NaN, est = e.mi >= 1 ? C.predict5K(e.sec, e.mi) : NaN;
    var shoe = App.state.shoes.filter(function (s) { return s.id === e.shoeId; })[0];
    return h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('b', null, D.label(e.date)), h('span', { class: 'pill' }, ({ guided: 'Guided', free: 'Free', gps: 'GPS', treadmill: 'Treadmill', race: 'Race', manual: 'Manual' })[e.kind] || 'Run')),
      h('div', { class: 'grid3', style: 'margin:.5rem 0' },
        h('div', { class: 'stat' }, h('b', null, App.dur(e.sec)), h('span', null, 'time')),
        h('div', { class: 'stat' }, h('b', null, e.mi > 0 ? C.toUnit(e.mi, App.unit()).toFixed(2) : '–'), h('span', null, App.unit())),
        h('div', { class: 'stat' }, h('b', null, e.mi > 0 ? C.fmtPace(C.paceIn(pace, App.unit())) : '–'), h('span', null, 'pace /' + App.unit()))),
      h('p', { class: 'small muted' }, [e.effort ? 'Effort ' + e.effort + '/5' : '', e.feel ? 'Felt ' + e.feel + '/5' : '', shoe ? shoe.name : '', isFinite(est) ? 'Est. 5K ' + C.fmtMS(est) : ''].filter(Boolean).join(' · ')),
      e.route && e.route.length > 1 ? App.chart.route(e.route.map(function (p) { return { lat: p.lat, lon: p.lon }; }), 'Route') : null,
      e.note ? h('p', null, e.note) : null,
      h('div', { class: 'row' },
        h('a', { class: 'btn small', href: '#/log/edit/' + e.id, 'aria-label': 'Edit run on ' + D.label(e.date) }, 'Edit'),
        h('button', { class: 'btn small danger', 'aria-label': 'Delete run on ' + D.label(e.date), onclick: function () {
          App.confirm('Delete the run from ' + D.label(e.date) + '? This cannot be undone.', 'Delete', true).then(function (ok) {
            if (!ok) return; App.state.log = App.state.log.filter(function (x) { return x.id !== e.id; }); App.save(); App.toast('Deleted'); App.rerender(); }); } }, 'Delete')));
  };

  function form(el, existing, draft) {
    var st = App.state, today = App.today();
    var e = existing ? JSON.parse(JSON.stringify(existing)) : Object.assign({ id: App.id(), date: today, sec: 0, mi: null, effort: null, feel: null, note: '', kind: 'manual', cont: false, shoeId: st.lastShoe, planDate: null }, draft || {});
    el.appendChild(App.back('log', 'Log'));
    el.appendChild(App.header(existing ? 'Edit run' : 'Log a run'));
    var date = h('input', { type: 'date', value: e.date, max: today, required: true });
    var dur = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'mm:ss, like 31:00', value: e.sec ? C.fmtMS(e.sec) : '', autocomplete: 'off' });
    var dist = h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: '0', placeholder: 'optional', value: e.mi ? C.toUnit(e.mi, App.unit()).toFixed(2) : '' });
    var note = h('textarea', { placeholder: 'Optional, like "left shin felt tight"' }, e.note || '');
    var cont = h('input', { type: 'checkbox', checked: e.cont ? true : null });
    var shoe = h('select', null, h('option', { value: '' }, 'None'), st.shoes.filter(function (s) { return !s.retired || s.id === e.shoeId; }).map(function (s) { return h('option', { value: s.id, selected: s.id === e.shoeId ? true : null }, s.name); }));
    var msg = h('p', { class: 'small', style: 'color:var(--bad)', role: 'alert' });
    var pred = h('p', { class: 'small muted' });
    function updPred() {
      var t = C.parseTime(dur.value), d = parseFloat(dist.value);
      pred.textContent = t && d > 0 ? 'Pace: ' + C.fmtPace(C.paceIn(C.pace(t, C.fromUnit(d, App.unit())), App.unit())) + ' /' + App.unit() + (C.fromUnit(d, App.unit()) >= 1 ? ' · Predicted 5K: ' + C.fmtMS(C.predict5K(t, C.fromUnit(d, App.unit()))) : '') : '';
    }
    dur.addEventListener('input', updPred); dist.addEventListener('input', updPred); updPred();
    el.appendChild(h('div', { class: 'card' },
      App.field('Date', date), App.field('Time (mm:ss or h:mm:ss)', dur), App.field('Distance (' + App.unit() + ')', dist, 'Leave blank if you do not know it.'), pred,
      h('label', { class: 'check' }, cont, h('span', null, 'I ran the whole way (no walk breaks)')),
      h('label', null, 'Effort (how hard it felt)'), App.seg('Effort', e.effort, function (v) { e.effort = v; }, ['Easy', 'Very hard']),
      h('label', null, 'How did it feel overall?'), App.seg('Feel', e.feel, function (v) { e.feel = v; }, FEEL),
      st.shoes.length ? App.field('Shoes', shoe) : null,
      App.field('Note', note), msg));
    el.appendChild(h('div', { class: 'stack' },
      h('button', { class: 'btn primary big', onclick: function () {
        var t = C.parseTime(dur.value), d = dist.value === '' ? null : parseFloat(dist.value);
        if (!D.parse(date.value)) { msg.textContent = 'Pick a date.'; return; }
        if (!t || t < 1) { msg.textContent = 'Enter the time like 31:00 (minutes:seconds).'; return; }
        if (d != null && !(d > 0 && d < 100)) { msg.textContent = 'Distance should be a positive number, or blank.'; return; }
        e.date = date.value; e.sec = t; e.mi = d != null ? C.fromUnit(d, App.unit()) : null; e.note = note.value.trim(); e.cont = cont.checked; e.shoeId = shoe.value || null;
        if (existing) { var i = st.log.map(function (x) { return x.id; }).indexOf(e.id); st.log[i] = e; if (e.shoeId) st.lastShoe = e.shoeId; App.save(); App.toast('Saved'); App.nav('log'); }
        else {
          App.addEntry(e); App.draft = null;
          var est = e.mi >= 1 ? C.predict5K(e.sec, e.mi) : NaN;
          var soreHint = e.effort >= 5 || e.feel === 1;
          var m = App.modal(h('div', { class: 'stack' }, h('h2', null, 'Run saved'), isFinite(est) ? h('p', null, 'Predicted 5K from this run: ', h('b', null, C.fmtMS(est))) : null,
            soreHint ? h('p', { class: 'muted' }, 'That sounds like a tough one. An easy walk or a rest day is a fine next step.') : h('p', null, 'Nice work. Rest and drink some water.'),
            h('button', { class: 'btn primary', onclick: function () { m.close(); } }, 'OK')), { center: true, label: 'Run saved', onclose: function () { App.nav('today'); } });
        }
      } }, 'Save'),
      existing ? null : h('p', { class: 'muted small' }, 'Tip: soreness 4 or 5 on your check-in means a rest day is a good call.')));
  }

  App.views.log = function (el, params) {
    if (params[0] === 'new') {
      var draft = App.draft;
      if (!draft && params[1] && D.parse(params[1])) {
        var day = P.dayOf(App.plan(), params[1]);
        draft = { date: params[1] <= App.today() ? params[1] : App.today(), planDate: params[1], sec: day ? day.total : 0, kind: 'guided',
          cont: !!day && day.segments.filter(function (s) { return s[0] === 'run'; }).length === 1 };
      }
      return form(el, null, draft);
    }
    if (params[0] === 'edit') {
      var ex = App.state.log.filter(function (x) { return x.id === params[1]; })[0];
      if (!ex) { el.appendChild(h('p', null, 'That run was not found.')); return; }
      return form(el, ex);
    }
    var log = App.sortedLog();
    el.appendChild(App.header('Log', h('a', { class: 'btn primary small', href: '#/log/new' }, '+ Log a run')));
    el.appendChild(h('div', { class: 'seg', role: 'group', 'aria-label': 'Log views' }, h('button', { 'aria-pressed': 'true' }, 'History'), h('button', { 'aria-pressed': 'false', onclick: function () { App.nav('progress'); } }, 'Progress')));
    if (!log.length) el.appendChild(h('div', { class: 'card' }, h('p', null, 'No runs yet. After your first workout, tap "Mark as done" or "Log run" and it will show up here.')));
    log.forEach(function (e) { el.appendChild(App.entryCard(e)); });
    if (log.length) el.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { App.download('5k-log.csv', S.toCSV(App.state.log, App.state.shoes), 'text/csv'); } }, 'Export CSV')));
  };
})();
