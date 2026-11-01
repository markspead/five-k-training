/* ui.js: app core: saved state, tiny DOM helper, router, dialogs, formatting helpers. No framework. */
(function () {
  'use strict';
  var KEY = 'fivek.v1';
  var DEFAULTS = {
    level: 'beginner', units: 'mi', goalTime: null, reminderTime: '16:30', raceTime: '',
    sound: true, vibrate: true, voice: true, theme: 'auto', accent: 'orange', largeText: false, highContrast: false,
    log: [], adjust: [], checkins: {}, shoes: [], body: [], checklist: {}, onboarded: false,
    lastBackupLen: 0, cadence: 170, session: null, raceRun: null, raceResult: null, lastShoe: null, dismissed: {}
  };
  var App = window.App = { views: {}, modes: {}, state: null, memOnly: false };
  var D = window.Dates, C = window.Calc, P = window.Plan, S = window.Stats;

  /* ---------- storage ---------- */
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { App.memOnly = true; }
    var st = {};
    try { st = raw ? JSON.parse(raw) : {}; } catch (e) { st = {}; }
    App.state = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), st);
  }
  App.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(App.state)); App.memOnly = false; } catch (e) { App.memOnly = true; }
  };
  App.defaults = function () { return JSON.parse(JSON.stringify(DEFAULTS)); };
  App.replaceState = function (obj) { App.state = Object.assign(App.defaults(), obj); App.save(); App.applyLook(); };
  App.id = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------- DOM helper: h('div', {class:'x', onclick:fn}, 'text', child) ---------- */
  App.h = function (tag, attrs) {
    var el = document.createElement(tag), i;
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    for (i = 2; i < arguments.length; i++) add(arguments[i]);
    return el;
  };
  var h = App.h;
  var ICONS = {
    today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M5 21l4-6 3 1 2-5M9 15l-1-4 5-3 3 3 3 1M13 8l-2-1-3 2"/>',
    plan: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    log: '<path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3"/>',
    more: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2 2 2 0-3-1-5 1-8z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    flag: '<path d="M5 21V4l13 4-13 5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.5"/>'
  };
  App.icon = function (name, cls) {
    var d = document.createElement('div');
    d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
      (cls ? ' class="' + cls + '"' : '') + '>' + (ICONS[name] || name) + '</svg>';
    return d.firstChild;
  };
  /* inline SVG from a static string (never user text) */
  App.svg = function (markup) { var d = document.createElement('div'); d.innerHTML = markup; return d.firstChild; };

  /* ---------- formatting that follows the unit setting ---------- */
  App.unit = function () { return App.state.units === 'km' ? 'km' : 'mi'; };
  App.dist = function (mi, digits) { return mi > 0 ? C.toUnit(mi, App.unit()).toFixed(digits == null ? 2 : digits) + ' ' + App.unit() : '–'; };
  App.paceStr = function (secPerMi) { return isFinite(secPerMi) && secPerMi > 0 ? C.fmtPace(C.paceIn(secPerMi, App.unit())) + ' /' + App.unit() : '–'; };
  App.dur = function (sec) { return C.fmtMS(sec); };
  App.words = function (sec) { var m = Math.round(sec / 60); return m < 1 ? Math.round(sec) + ' sec' : m + ' min'; };
  App.today = function () { return D.today(); };
  var planCache = null;
  App.plan = function () {
    var key = App.state.level + JSON.stringify(App.state.adjust);
    if (!planCache || planCache.key !== key) planCache = { key: key, plan: P.build(App.state.level, App.state.adjust) };
    return planCache.plan;
  };
  App.done = function () { return S.doneSet(App.state.log); };
  App.sortedLog = function () { return App.state.log.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); }); };

  /* ---------- look: theme, accent, large text, contrast ---------- */
  App.applyLook = function () {
    var r = document.documentElement, s = App.state;
    if (s.theme === 'dark' || s.theme === 'light') r.setAttribute('data-theme', s.theme); else r.removeAttribute('data-theme');
    r.setAttribute('data-accent', s.accent || 'orange');
    if (s.largeText) r.setAttribute('data-large', ''); else r.removeAttribute('data-large');
    if (s.highContrast) r.setAttribute('data-contrast', 'high'); else r.removeAttribute('data-contrast');
  };

  /* ---------- toast + dialogs ---------- */
  var toastTimer;
  App.toast = function (msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };
  var lastFocus = null;
  App.modal = function (content, opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    lastFocus = document.activeElement;
    var box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || 'Dialog' }, content);
    var ov = h('div', { class: 'overlay' + (opts.center ? ' center' : '') }, box);
    function close(v) { if (ov.parentNode) root.removeChild(ov); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { } if (opts.onclose) opts.onclose(v); }
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !opts.sticky) close(); });
    if (!opts.sticky) ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    root.appendChild(ov);
    var f = box.querySelector('button, input, select, textarea, a'); if (f) f.focus();
    return { close: close, box: box };
  };
  /* Promise<boolean> */
  App.confirm = function (msg, okLabel, danger) {
    return new Promise(function (res) {
      var m = App.modal(h('div', { class: 'stack' }, h('p', null, msg),
        h('div', { class: 'row' },
          h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: function () { m.close(true); } }, okLabel || 'OK'),
          h('button', { class: 'btn', onclick: function () { m.close(false); } }, 'Cancel'))), { center: true, label: 'Confirm', onclose: function (v) { res(!!v); } });
    });
  };

  /* ---------- shared widgets ---------- */
  /* 1..5 segmented radio group. labels: [low text, high text] */
  App.seg = function (name, value, onchange, labels, count) {
    var btns = [], n = count || 5, cur = value;
    var group = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': name });
    for (var i = 1; i <= n; i++) (function (i) {
      var b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(cur === i), 'aria-label': name + ' ' + i + ' of ' + n }, String(i));
      b.addEventListener('click', function () {
        cur = cur === i ? null : i;
        btns.forEach(function (x, j) { x.setAttribute('aria-checked', String(cur === j + 1)); });
        onchange(cur);
      });
      btns.push(b); group.appendChild(b);
    })(i);
    return h('div', null, group, labels ? h('div', { class: 'seg-labels' }, h('span', null, labels[0]), h('span', null, labels[1])) : null);
  };
  App.field = function (label, input, hint) {
    var id = 'f' + App.id();
    input.id = id;
    return h('div', null, h('label', { for: id }, label), input, hint ? h('p', { class: 'muted small' }, hint) : null);
  };
  App.back = function (to, label) {
    return h('a', { class: 'btn ghost small', href: '#/' + to, 'aria-label': 'Back to ' + (label || to) }, App.icon('back'), label || 'Back');
  };
  App.header = function (title, right) { return h('div', { class: 'head' }, h('h1', null, title), right || null); };
  App.download = function (name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain' }), a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  App.nav = function (to) { location.hash = '#/' + to; };

  /* ---------- router ---------- */
  var TABS = [['today', 'Today'], ['run', 'Run'], ['plan', 'Plan'], ['log', 'Log'], ['more', 'More']];
  var TAB_OF = { today: 'today', race: 'today', run: 'run', plan: 'plan', log: 'log', progress: 'log' };
  var cleanup = null;
  function buildTabs() {
    var nav = document.getElementById('tabs');
    TABS.forEach(function (t) { nav.appendChild(h('a', { href: '#/' + t[0], 'data-tab': t[0] }, App.icon(t[0]), t[1])); });
  }
  function render() {
    var parts = (location.hash.replace(/^#\/?/, '') || 'today').split('/');
    var name = parts[0];
    if (!App.views[name]) { name = 'today'; parts = ['today']; }
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    var main = document.getElementById('main');
    main.textContent = '';
    var tab = TAB_OF[name] || 'more';
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    try { cleanup = App.views[name](main, parts.slice(1)) || null; }
    catch (e) { main.appendChild(h('div', { class: 'card' }, h('h2', null, 'Something went wrong'), h('p', null, String(e && e.message)))); if (window.console) console.error(e); }
    window.scrollTo(0, 0);
    document.title = '5K Training';
  }
  App.rerender = render;
  App.start = function () {
    load(); App.applyLook(); buildTabs();
    window.addEventListener('hashchange', render);
    render();
  };
})();
