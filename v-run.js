/* v-run.js: the Run tab: guided interval timer, free run stopwatch, GPS tracking, treadmill mode.
   One shared session object (saved in localStorage) keeps running if you switch tabs or the page reloads.
   Time is always computed from timestamps (Date.now), never by counting ticks, so throttled tabs stay accurate. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, P = window.Plan, T = window.Timer, C = window.Calc, G = window.Gps;
  var ticker = null, wake = null, geoId = null, lastSave = 0, hooks = { tick: null, state: null }, pendingMode = null;

  /* ---------- session core ---------- */
  function sess() { return App.state.session; }
  function elapsed(s) { return (s.acc + (s.status === 'running' ? Date.now() - s.t0 : 0)) / 1000 + (s.skip || 0); }
  function persist() { App.save(); lastSave = Date.now(); }
  function notifyState() { if (hooks.state) hooks.state(); }

  /* ---------- cues: sound, vibration, voice ---------- */
  function speak(text) {
    if (!App.state.voice || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch (e) { }
  }
  function cue(kind, text) {
    var st = App.state;
    if (st.sound) App.beep(kind === 'run' ? 'run' : kind === 'done' ? 'done' : 'walk');
    if (st.vibrate && navigator.vibrate) { try { navigator.vibrate(kind === 'run' ? [200, 80, 200] : kind === 'done' ? [300, 100, 300, 100, 500] : [400]); } catch (e) { } }
    if (text) speak(text);
  }

  /* ---------- screen wake lock ---------- */
  function lockScreen() {
    if (!('wakeLock' in navigator) || wake) return;
    navigator.wakeLock.request('screen').then(function (l) { wake = l; l.addEventListener('release', function () { wake = null; }); }).catch(function () { });
  }
  function unlockScreen() { if (wake) { try { wake.release(); } catch (e) { } wake = null; } }

  /* ---------- GPS ---------- */
  function startGps() {
    var s = sess();
    if (geoId != null || !s || s.mode !== 'gps') return;
    if (!navigator.geolocation) { s.gpsError = 'This browser has no GPS. Use Free run and enter the distance afterwards.'; return; }
    geoId = navigator.geolocation.watchPosition(function (pos) {
      var s2 = sess(); if (!s2 || s2.mode !== 'gps') return;
      s2.gpsError = null; s2.acc = s2.acc || 0; s2.lastAcc = pos.coords.accuracy;
      if (s2.status !== 'running') return;
      G.addPoint(s2.track, { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now(), acc: pos.coords.accuracy });
    }, function (err) {
      var s2 = sess(); if (!s2) return;
      s2.gpsError = err.code === 1 ? 'Location is turned off for this app. Allow it in Settings > Privacy > Location Services > Safari Websites, or use Free run.' : 'Could not get a GPS fix yet. Keep the screen on and wait a moment, or use Free run.';
      if (hooks.tick) hooks.tick(s2, elapsed(s2));
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 });
  }
  function stopGps() { if (geoId != null && navigator.geolocation) navigator.geolocation.clearWatch(geoId); geoId = null; }

  /* ---------- ticking ---------- */
  function startTicker() { if (!ticker) ticker = setInterval(tick, 250); }
  function stopTicker() { clearInterval(ticker); ticker = null; }
  function accumulateTreadmill(s) { var n = Date.now(); if (s.status === 'running') s.mi += s.mph * (n - s.lastT) / 3600000; s.lastT = n; }
  function tick() {
    var s = sess();
    if (!s || s.status !== 'running') { if (!s || s.status === 'done') stopTicker(); return; }
    var el = elapsed(s);
    if (s.mode === 'treadmill') accumulateTreadmill(s);
    if (s.mode === 'guided') {
      var loc = T.locate(s.segs, el);
      if (loc.done) { finish(true); return; }
      var say = [];
      if (loc.index !== s.lastIdx) {
        s.lastIdx = loc.index;   // after a long background pause this jumps straight to the right phase
        cue(loc.phase, null); say.push(T.cueText(loc.phase, loc.phaseDur));
        if (loc.index === 0 && el < 2) say = [T.cueText(loc.phase, loc.phaseDur)];
      }
      if (!s.half && loc.total >= 600 && el >= loc.total / 2) { s.half = true; say.push('Halfway'); }
      if (!s.oneMin && loc.total > 180 && loc.totalRemaining <= 60) { s.oneMin = true; say.push('One minute left'); }
      if (say.length) speak(say.join('. '));
      if (say.length) persist();
    }
    if (Date.now() - lastSave > 5000) persist();
    if (hooks.tick) hooks.tick(s, el);
  }

  /* ---------- actions ---------- */
  function begin(mode, extra) {
    App.audioUnlock();
    var s = Object.assign({ mode: mode, status: 'running', acc: 0, t0: Date.now(), skip: 0, segs: [], planDate: null, lastIdx: -1, half: false, oneMin: false,
      startDate: App.today(), mi: 0, mph: 6, lastT: Date.now(), track: mode === 'gps' ? G.newTrack() : null, gpsError: null, finalSec: 0 }, extra || {});
    App.state.session = s; persist(); lockScreen(); startTicker();
    if (mode === 'gps') startGps();
    tick(); notifyState();
  }
  function pause() {
    var s = sess(); if (!s || s.status !== 'running') return;
    if (s.mode === 'treadmill') accumulateTreadmill(s);
    s.acc += Date.now() - s.t0; s.status = 'paused'; s.pausedAt = Date.now(); persist(); unlockScreen(); notifyState();
  }
  function resume() {
    var s = sess(); if (!s || s.status !== 'paused') return;
    var gap = Date.now() - (s.pausedAt || Date.now());
    if (s.track && s.track.pts.length) { s.track.pts[s.track.pts.length - 1].t += gap; s.track.lastSplitT += gap; } // paused time is not running time
    s.t0 = Date.now(); s.lastT = Date.now(); s.status = 'running'; persist(); lockScreen(); startTicker(); App.audioUnlock(); notifyState();
  }
  function skip() {
    var s = sess(); if (!s || s.mode !== 'guided' || s.status !== 'running') return;
    var loc = T.locate(s.segs, elapsed(s));
    if (!loc.done) { s.skip += loc.phaseRemaining; tick(); }
  }
  function finish(complete) {
    var s = sess(); if (!s) return;
    if (s.mode === 'treadmill') accumulateTreadmill(s);
    var el = elapsed(s);
    s.finalSec = s.mode === 'guided' && complete ? T.total(s.segs) : Math.floor(el);
    s.complete = !!complete; s.acc = el * 1000; s.skip = 0; s.status = 'done';
    persist(); unlockScreen(); stopGps(); stopTicker();
    if (complete) cue('done', 'Workout complete');
    notifyState();
  }
  function discard() { stopGps(); stopTicker(); unlockScreen(); App.state.session = null; persist(); notifyState(); }
  /* Turn a finished session into a draft log entry and open the log form. */
  function toLog() {
    var s = sess(); if (!s) return;
    var runs = s.segs.filter(function (x) { return x[0] === 'run'; }).length;
    App.draft = { date: s.startDate, sec: s.finalSec, mi: s.mode === 'gps' ? G.miles(s.track) : s.mode === 'treadmill' ? s.mi : null,
      kind: s.mode === 'guided' ? 'guided' : s.mode, cont: s.mode === 'guided' ? runs === 1 : true, planDate: s.planDate || null,
      route: s.mode === 'gps' ? G.thin(s.track.pts, 120) : null, bestSplit: s.mode === 'gps' && s.track.splits.length ? Math.min.apply(null, s.track.splits) : null };
    App.state.session = null; persist(); App.nav('log/new');
  }
  /* Called at app start and when the page returns from the background. */
  App.sessionResume = function () {
    var s = sess();
    if (s && s.status !== 'done' && Date.now() - (s.t0 || 0) > 12 * 3600 * 1000 && s.status === 'running') { App.state.session = null; persist(); return; }
    if (s && s.status === 'running') { startTicker(); lockScreen(); if (s.mode === 'gps') startGps(); tick(); }
    if (s && s.status === 'paused' && s.mode === 'gps') startGps();
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { var s = sess(); if (s && s.status === 'running') { lockScreen(); tick(); } }
  });

  /* ---------- the view ---------- */
  var MODES = [['guided', 'Guided'], ['free', 'Free run'], ['gps', 'GPS'], ['treadmill', 'Treadmill']];

  function cueToggles() {
    function box(key, label) {
      return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: App.state[key] ? true : null, onchange: function (e) { App.state[key] = e.target.checked; App.save(); } }), h('span', null, label));
    }
    return h('div', { class: 'card' }, h('h3', null, 'Cues'), box('sound', 'Sound beeps'), box('vibrate', 'Vibration (not on iPhone Safari)'), box('voice', 'Voice announcements'), App.metronomeControl());
  }

  App.views.run = function (el, params) {
    var date = params[0] && D.parse(params[0]) ? params[0] : null;
    var plan = App.plan(), today = App.today();
    var day = date ? P.dayOf(plan, date) : P.dayOf(plan, today);
    if (day && day.type !== 'run' && day.type !== 'walk') day = null;
    var el2 = null, refs = {};

    function paint() {
      el.textContent = '';
      var s = sess();
      el.appendChild(h('div', { class: 'head' }, h('h1', null, s ? (s.status === 'done' ? 'Run finished' : 'Running') : 'Run')));
      if (!s) idle(); else if (s.status === 'done') done(s); else running(s);
    }

    /* idle: pick a mode */
    function idle() {
      var mode = pendingMode || (day ? 'guided' : 'free');
      if (mode === 'guided' && !day) mode = 'free';
      var tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Run mode' });
      MODES.forEach(function (m) {
        tabs.appendChild(h('button', { type: 'button', 'aria-pressed': String(mode === m[0]), onclick: function () { pendingMode = m[0]; paint(); } }, m[1]));
      });
      el.appendChild(tabs);
      if (mode === 'guided') {
        if (!day) el.appendChild(h('div', { class: 'card' }, h('p', null, 'No guided workout today. Pick a day from the plan, or use Free run, GPS or Treadmill.'), h('a', { class: 'btn', href: '#/plan' }, 'Open plan')));
        else {
          var lines = App.workoutLines(day);
          el.appendChild(h('div', { class: 'card accent' }, h('span', { class: 'pill accent' }, D.label(day.date)), h('h2', { style: 'margin-top:.5rem' }, day.title),
            h('p', { class: 'muted' }, 'Total time: ' + App.words(day.total)),
            h('table', null, lines.map(function (l) { return h('tr', null, h('th', null, l[0]), h('td', null, l[1])); })),
            progressBar(day.segments, true)));
          el.appendChild(cueToggles());
          el.appendChild(h('button', { class: 'btn primary big', onclick: function () { begin('guided', { segs: day.segments, planDate: day.date }); } }, 'Start workout'));
          el.appendChild(h('p', { class: 'muted small' }, 'Keep this screen open. The timer keeps correct time even if the phone sleeps, but sound and voice cues only play while the page is awake.'));
        }
      } else if (mode === 'free') {
        el.appendChild(h('div', { class: 'card' }, h('h2', null, 'Free run'), h('p', null, 'A simple stopwatch for days you just want to run. You can enter the distance afterwards.')));
        el.appendChild(cueToggles());
        el.appendChild(h('button', { class: 'btn primary big', onclick: function () { begin('free'); } }, 'Start stopwatch'));
      } else if (mode === 'gps') {
        el.appendChild(h('div', { class: 'card' }, h('h2', null, 'GPS run'), h('p', null, 'Live distance, pace, mile splits and your route.'),
          h('p', { class: 'small' }, h('b', null, 'Important: '), 'iPhone web apps can only track while the screen is on and this app stays open. Keep the screen awake (the app asks for that) and do not switch apps. If tracking stops, use Free run and type the distance afterwards.')));
        el.appendChild(h('button', { class: 'btn primary big', onclick: function () { begin('gps'); } }, 'Start GPS run'));
        el.appendChild(h('p', { class: 'muted small' }, 'GPS is least accurate between tall buildings and trees. Nothing leaves your phone.'));
        el.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { pendingMode = 'free'; paint(); } }, 'Manual entry instead'), h('a', { class: 'btn', href: '#/log/new' }, 'Log a run by hand')));
      } else {
        el.appendChild(h('div', { class: 'card' }, h('h2', null, 'Treadmill'), h('p', null, 'Set the belt speed and the app works out distance and pace. Change the speed as you go.')));
        var u = App.unit() === 'km' ? 'km/h' : 'mph', inp = h('input', { type: 'number', inputmode: 'decimal', step: '0.1', min: '1', max: '20', value: C.toUnit(6, App.unit()).toFixed(1) });
        el.appendChild(h('div', { class: 'card' }, App.field('Starting speed (' + u + ')', inp), h('p', { class: 'muted small' }, 'Need help picking a speed? See the ', h('a', { href: '#/treadmill' }, 'speed to pace converter'), '.')));
        el.appendChild(cueToggles());
        el.appendChild(h('button', { class: 'btn primary big', onclick: function () {
          var v = parseFloat(inp.value); if (!(v > 0)) { App.toast('Enter a speed'); return; } begin('treadmill', { mph: C.fromUnit(v, App.unit()) }); } }, 'Start treadmill run'));
      }
    }

    function progressBar(segs, static_) {
      var tot = T.total(segs), bar = h('div', { class: 'progress', role: 'img', 'aria-label': 'Workout segments' });
      segs.forEach(function (sg, i) { var b = h('b'); bar.appendChild(h('i', { class: sg[0], style: 'flex:' + sg[1] + ' 1 0' }, b)); if (!static_) (refs.fills = refs.fills || []).push(b); });
      return bar;
    }

    /* running or paused */
    function running(s) {
      refs = {};
      var guided = s.mode === 'guided';
      var big = h('div', { class: 'big-time', 'aria-hidden': 'true' }, '0:00'), sr = h('div', { class: 'sr-only', 'aria-live': 'off', style: 'position:absolute;left:-999px' });
      refs.big = big;
      if (guided) {
        refs.phase = h('div', { class: 'phase' }, ''); refs.total = h('div', { class: 'muted', style: 'text-align:center' }, ''); refs.next = h('div', { class: 'muted', style: 'text-align:center' }, '');
        el.append(h('div', { class: 'card' }, refs.phase, big, refs.total, h('div', { style: 'margin:.8rem 0' }, progressBar(s.segs)), refs.next));
      } else {
        el.append(h('div', { class: 'card' }, h('div', { class: 'muted', style: 'text-align:center' }, s.mode === 'gps' ? 'GPS run' : s.mode === 'treadmill' ? 'Treadmill run' : 'Free run'), big));
        if (s.mode === 'gps') {
          refs.dist = h('b', null, '0.00'); refs.avg = h('b', null, '–'); refs.cur = h('b', null, '–');
          refs.status = h('p', { class: 'small muted' }); refs.splits = h('div'); refs.route = h('div');
          el.append(h('div', { class: 'grid3' }, h('div', { class: 'stat' }, refs.dist, h('span', null, App.unit())), h('div', { class: 'stat' }, refs.avg, h('span', null, 'avg pace')), h('div', { class: 'stat' }, refs.cur, h('span', null, 'now'))),
            h('div', { class: 'card' }, refs.route, refs.status), h('div', { class: 'card' }, h('h3', null, 'Splits'), refs.splits),
            h('p', { class: 'small muted' }, 'iPhone web apps only track while the screen is on. Keep this page open.'));
        } else if (s.mode === 'treadmill') {
          var u = App.unit() === 'km' ? 'km/h' : 'mph';
          refs.dist = h('b', null, '0.00'); refs.pace = h('b', null, '–'); refs.speed = h('b', null, '');
          function bump(d) { return function () { accumulateTreadmill(s); s.mph = Math.max(0.5, C.fromUnit(Math.round((C.toUnit(s.mph, App.unit()) + d) * 10) / 10, App.unit())); persist(); tick(); }; }
          el.append(h('div', { class: 'grid3' }, h('div', { class: 'stat' }, refs.dist, h('span', null, App.unit())), h('div', { class: 'stat' }, refs.speed, h('span', null, u)), h('div', { class: 'stat' }, refs.pace, h('span', null, 'pace'))),
            h('div', { class: 'row', style: 'justify-content:center;margin:.6rem 0' }, h('button', { class: 'btn', 'aria-label': 'Slower', onclick: bump(-0.1) }, '−  0.1'), h('button', { class: 'btn', 'aria-label': 'Faster', onclick: bump(0.1) }, '+  0.1')));
        }
      }
      el.appendChild(sr); refs.sr = sr;
      var pausedLabel = s.status === 'paused';
      var btns = h('div', { class: 'stack' },
        h('button', { class: 'btn primary big', onclick: pausedLabel ? resume : pause }, pausedLabel ? 'Resume' : 'Pause'),
        h('div', { class: 'grid2' },
          guided ? h('button', { class: 'btn', disabled: pausedLabel, onclick: skip }, 'Skip phase') : h('span'),
          h('button', { class: 'btn danger', onclick: function () {
            App.confirm(guided ? 'Stop this workout now?' : 'Finish this run?', guided ? 'Stop' : 'Finish', true).then(function (ok) { if (ok) finish(false); }); } }, guided ? 'Stop' : 'Finish')));
      el.appendChild(btns);
      el.appendChild(cueToggles());
      if (s.status === 'paused') el.insertBefore(h('div', { class: 'card note pulse' }, 'Paused'), el.children[1]);
      update(s, elapsed(s));
    }

    function update(s, el_) {
      if (!refs.big || !document.body.contains(refs.big)) return;
      var sec = Math.floor(el_);
      if (s.mode === 'guided') {
        var loc = T.locate(s.segs, el_);
        if (loc.done) return;
        refs.phase.textContent = T.label(loc.phase); refs.phase.className = 'phase ' + loc.phase;
        var rem = Math.ceil(loc.phaseRemaining);
        refs.big.textContent = C.fmtMS(rem); refs.total.textContent = 'Total left ' + C.fmtMS(Math.ceil(loc.totalRemaining));
        var nx = s.segs[loc.index + 1]; refs.next.textContent = nx ? 'Next: ' + T.label(nx[0]) + ' ' + C.fmtMS(nx[1]) : 'Next: finish';
        (refs.fills || []).forEach(function (b, i) { b.style.width = (i < loc.index ? 100 : i === loc.index ? 100 * loc.phaseElapsed / loc.phaseDur : 0).toFixed(1) + '%'; });
        refs.sr.textContent = '';
      } else {
        refs.big.textContent = C.fmtMS(sec);
        if (s.mode === 'treadmill') {
          refs.dist.textContent = C.toUnit(s.mi, App.unit()).toFixed(2); refs.speed.textContent = C.toUnit(s.mph, App.unit()).toFixed(1);
          refs.pace.textContent = C.fmtPace(C.paceIn(C.speedToPace(s.mph), App.unit()));
        } else if (s.mode === 'gps') {
          var mi = G.miles(s.track);
          refs.dist.textContent = C.toUnit(mi, App.unit()).toFixed(2);
          refs.avg.textContent = mi > 0.02 ? C.fmtPace(C.paceIn(C.pace(el_, mi), App.unit())) : '–';
          refs.cur.textContent = currentPace(s) || '–';
          refs.status.textContent = s.gpsError || (s.track.pts.length ? 'GPS accuracy about ' + Math.round(s.lastAcc || 0) + ' m' : 'Waiting for a GPS fix… (if asked, tap Allow)');
          if (s.track.pts.length !== refs.nPts) { refs.nPts = s.track.pts.length; refs.route.textContent = ''; refs.route.appendChild(App.chart.route(s.track.pts)); }
          if (s.track.splits.length !== refs.nSplits) {
            refs.nSplits = s.track.splits.length; refs.splits.textContent = '';
            refs.splits.appendChild(s.track.splits.length ? h('table', null, s.track.splits.map(function (x, i) { return h('tr', null, h('td', null, 'Mile ' + (i + 1)), h('td', null, C.fmtMS(x))); })) : h('p', { class: 'muted small' }, 'Your first mile split appears after 1 mile.'));
          }
        }
      }
    }
    function currentPace(s) {
      var pts = s.track.pts; if (pts.length < 3) return '';
      var last = pts[pts.length - 1], i = pts.length - 1, d = 0;
      while (i > 0 && last.t - pts[i - 1].t < 40000) { d += G.haversine(pts[i - 1], pts[i]); i--; }
      var dt = (last.t - pts[i].t) / 1000;
      return d > 20 && dt > 8 ? C.fmtPace(C.paceIn(dt / (d / G.M_PER_MI), App.unit())) : '';
    }

    function done(s) {
      var mi = s.mode === 'gps' ? G.miles(s.track) : s.mode === 'treadmill' ? s.mi : 0;
      el.appendChild(h('div', { class: 'card accent' },
        s.complete ? h('div', { class: 'flourish', 'aria-hidden': 'true' }, App.svg('<svg viewBox="0 0 120 120"><circle class="c" cx="60" cy="60" r="54"/><path class="k" d="M38 62l16 16 28-32"/></svg>'), h('i'), h('i'), h('i'), h('i'), h('i'), h('i')) : null,
        h('h2', { style: 'text-align:center' }, s.complete ? 'Workout complete' : 'Run stopped'),
        h('div', { class: 'big-time', style: 'font-size:3.2rem' }, C.fmtMS(s.finalSec)),
        mi > 0 ? h('p', { style: 'text-align:center' }, App.dist(mi) + ' · ' + App.paceStr(C.pace(s.finalSec, mi))) : null));
      if (s.mode === 'gps' && s.track.pts.length > 1) el.appendChild(h('div', { class: 'card' }, App.chart.route(s.track.pts)));
      el.appendChild(h('div', { class: 'stack' }, h('button', { class: 'btn primary big', onclick: toLog }, 'Log this run'),
        h('button', { class: 'btn', onclick: function () { App.confirm('Discard this run without saving?', 'Discard', true).then(function (ok) { if (ok) discard(); }); } }, 'Discard')));
    }

    hooks.tick = function (s, e) { update(s, e); };
    hooks.state = function () { if (document.getElementById('main') && App.views.run && location.hash.indexOf('#/run') === 0) paint(); };
    paint();
    return function () { hooks.tick = null; hooks.state = null; };
  };
})();
