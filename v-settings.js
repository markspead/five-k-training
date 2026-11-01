/* v-settings.js: Settings: level, units, goal, look, backup (JSON/CSV export + import), reset. */
(function () {
  'use strict';
  var App = window.App, h = App.h, C = window.Calc, S = window.Stats;

  App.exportJSON = function () {
    var st = App.state, out = JSON.parse(JSON.stringify(st));
    delete out.session; out.app = 'five-k-training-app'; out.version = 1; out.exportedAt = new Date().toISOString();
    App.download('5k-training-backup-' + window.Dates.today() + '.json', JSON.stringify(out, null, 2), 'application/json');
    st.lastBackupLen = st.log.length; App.save(); App.toast('Backup saved to your downloads');
  };

  function toggle(key, label, after) {
    return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: App.state[key] ? true : null, onchange: function (e) { App.state[key] = e.target.checked; App.save(); if (after) after(); } }), h('span', null, label));
  }
  function choice(name, key, opts, after) {
    var g = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': name });
    opts.forEach(function (o) {
      var b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(App.state[key] === o[0]) }, o[1]);
      b.addEventListener('click', function () {
        App.state[key] = o[0]; App.save();
        Array.prototype.forEach.call(g.children, function (x, i) { x.setAttribute('aria-checked', String(opts[i][0] === o[0])); });
        if (after) after(o[0]);
      });
      g.appendChild(b);
    });
    return g;
  }

  App.views.settings = function (el) {
    var st = App.state;
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Settings'));

    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Training level'),
      h('p', { class: 'muted small' }, 'Beginner: run/walk intervals, like couch to 5K. Intermediate: you can already run about 1 mile without stopping. Switching rebuilds the plan, clears plan adjustments, and keeps your log.'),
      choice('Level', 'level', [['beginner', 'Beginner'], ['intermediate', 'Intermediate']], function () { st.adjust = []; App.save(); App.toast('Plan rebuilt for ' + st.level); })));

    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Units'), choice('Units', 'units', [['mi', 'Miles'], ['km', 'Kilometers']])));

    var goal = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'mm:ss, like 38:00', value: st.goalTime ? C.fmtMS(st.goalTime) : '' });
    goal.addEventListener('change', function () { st.goalTime = C.parseTime(goal.value) || null; App.save(); });
    var rt = h('input', { type: 'time', value: st.reminderTime }), rc = h('input', { type: 'time', value: st.raceTime });
    rt.addEventListener('change', function () { st.reminderTime = rt.value || '16:30'; App.save(); });
    rc.addEventListener('change', function () { st.raceTime = rc.value || ''; App.save(); });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Race goal and reminders'), App.field('Race goal time (optional)', goal),
      App.field('Reminder time for run days', rt), App.field('Race start time (optional)', rc, 'Leave blank to add the race as an all-day event.'),
      h('button', { class: 'btn', onclick: App.downloadIcs }, 'Add reminders to Calendar'),
      h('p', { class: 'muted small' }, 'Web apps cannot send reliable notifications on iPhone, so this saves a calendar file. Open it and tap Add All.')));

    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Cues while running'), toggle('sound', 'Sound beeps'), toggle('vibrate', 'Vibration (iPhone Safari does not support it)'), toggle('voice', 'Voice announcements')));

    var sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Accent color' });
    [['orange', '#ff7a1a'], ['green', '#2fd36b'], ['blue', '#3b9bff'], ['purple', '#a97bff']].forEach(function (c) {
      sw.appendChild(h('button', { class: 'swatch', type: 'button', role: 'radio', 'aria-label': c[0], 'aria-checked': String((st.accent || 'orange') === c[0]), style: 'background:' + c[1], onclick: function () {
        st.accent = c[0]; App.save(); App.applyLook(); Array.prototype.forEach.call(sw.children, function (b) { b.setAttribute('aria-checked', String(b.getAttribute('aria-label') === c[0])); }); } }));
    });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Look'), h('label', null, 'Theme'), choice('Theme', 'theme', [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']], App.applyLook),
      h('label', null, 'Accent color'), sw, toggle('largeText', 'Large text', App.applyLook), toggle('highContrast', 'High contrast', App.applyLook)));

    // backup
    var file = h('input', { type: 'file', accept: 'application/json,.json', 'aria-label': 'Choose backup file', style: 'display:none' });
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var obj; try { obj = JSON.parse(r.result); } catch (e) { App.toast('That file is not valid JSON'); return; }
        var v = S.validateImport(obj); if (!v.ok) { App.toast(v.error); return; }
        App.confirm('Replace everything in this app with the backup (' + v.data.log.length + ' runs)?', 'Replace', true).then(function (ok) {
          if (!ok) return; App.replaceState(v.data); App.toast('Backup restored'); App.rerender(); });
      };
      r.readAsText(f); file.value = '';
    });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Your data'),
      h('p', { class: 'muted small' }, 'Everything is stored only on this phone. There are no accounts. Back up now and then, especially before clearing Safari data.'),
      h('div', { class: 'stack' },
        h('button', { class: 'btn', onclick: App.exportJSON }, 'Export data (JSON)'),
        h('button', { class: 'btn', onclick: function () { file.click(); } }, 'Import data'), file,
        h('button', { class: 'btn', onclick: function () { App.download('5k-log.csv', S.toCSV(st.log, st.shoes), 'text/csv'); } }, 'Export run log (CSV)'),
        h('button', { class: 'btn danger', onclick: function () {
          App.confirm('Delete all runs and settings on this phone?', 'Continue', true).then(function (a) {
            if (!a) return;
            App.confirm('Really delete everything? This cannot be undone. Export first if unsure.', 'Delete everything', true).then(function (b) {
              if (!b) return; App.replaceState({}); App.toast('Everything was reset'); App.nav('today'); App.rerender(); }); }); } }, 'Reset everything'))));

    el.appendChild(h('div', { class: 'card note' }, h('h3', null, 'Good to know'),
      h('ul', null, ['Warm up and cool down every time.', 'Run at an easy, chatty pace.', 'Stop for sharp pain, dizziness or chest pain.', 'Drink water through the day.', 'Do not run through an injury.', 'Wear shoes that fit, and replace them around 300 miles.', 'See a doctor before you start if you have any health concern.'].map(function (t) { return h('li', null, t); })),
      h('a', { href: '#/safety' }, 'More safety tips')));
    el.appendChild(h('p', { class: 'muted small' }, 'No network calls are made by this app. Version 1.'));
  };
})();
