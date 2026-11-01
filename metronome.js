/* metronome.js: cadence beeps with WebAudio, scheduled ahead of time so the beat stays steady. Also owns the shared
   audio context and the cue beeps used by the guided run. The Cadence screen is registered here too. */
(function () {
  'use strict';
  var App = window.App, h = App.h, ctx = null, timer = null, nextT = 0, on = false;
  function audio() {
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, vol) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol || 0.4, start + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(a.destination); o.start(start); o.stop(start + dur + 0.02);
  }
  /* cue beeps for the guided timer: run = two high beeps, walk = one low long beep */
  App.beep = function (kind) {
    var a = audio(); if (!a) return; var t = a.currentTime + 0.02;
    if (kind === 'run') { tone(880, t, 0.14); tone(880, t + 0.2, 0.14); }
    else if (kind === 'done') { tone(660, t, 0.15); tone(880, t + 0.18, 0.15); tone(1100, t + 0.36, 0.3); }
    else tone(440, t, 0.4);
  };
  App.audioUnlock = audio; // call from a tap so iOS allows sound later

  var M = App.metronome = {
    get on() { return on; },
    get bpm() { return App.state.cadence; },
    setBpm: function (n) { App.state.cadence = Math.max(150, Math.min(190, Math.round(n))); App.save(); },
    start: function () {
      var a = audio(); if (!a || on) return false;
      on = true; nextT = a.currentTime + 0.1;
      timer = setInterval(function () {
        var interval = 60 / App.state.cadence;
        while (nextT < a.currentTime + 0.25) { tone(1000, nextT, 0.05, 0.3); nextT += interval; }
      }, 50);
      return true;
    },
    stop: function () { on = false; clearInterval(timer); timer = null; }
  };
  /* small control used inside the Run screen */
  App.metronomeControl = function () {
    var label = h('b', null, ''), btn = h('button', { class: 'btn small', 'aria-pressed': 'false' }, 'Start');
    function paint() { label.textContent = App.state.cadence + ' steps/min'; btn.textContent = M.on ? 'Stop' : 'Start'; btn.setAttribute('aria-pressed', String(M.on)); }
    btn.addEventListener('click', function () { if (M.on) M.stop(); else M.start(); paint(); });
    function step(d) { return function () { M.setBpm(App.state.cadence + d); paint(); }; }
    paint();
    return h('div', { class: 'row between' }, h('span', null, 'Cadence ', label),
      h('span', { class: 'row' }, h('button', { class: 'btn small', 'aria-label': 'Slower cadence', onclick: step(-2) }, '−'),
        h('button', { class: 'btn small', 'aria-label': 'Faster cadence', onclick: step(2) }, '+'), btn));
  };
  App.views.cadence = function (el) {
    var slider = h('input', { type: 'range', min: '150', max: '190', step: '1', value: String(App.state.cadence), 'aria-label': 'Steps per minute' });
    var out = h('div', { class: 'big-time' }, String(App.state.cadence)), btn = h('button', { class: 'btn primary big' }, M.on ? 'Stop' : 'Start');
    slider.addEventListener('input', function () { M.setBpm(+slider.value); out.textContent = App.state.cadence; });
    btn.addEventListener('click', function () { if (M.on) M.stop(); else M.start(); btn.textContent = M.on ? 'Stop' : 'Start'; });
    el.append(App.back('more', 'More'), App.header('Cadence metronome'),
      h('div', { class: 'card stack' }, out, h('p', { class: 'muted', style: 'text-align:center' }, 'steps per minute'), slider,
        h('div', { class: 'row between small muted' }, h('span', null, '150'), h('span', null, '190')), btn),
      h('div', { class: 'card note' }, h('p', null, 'Match one step to each beep. Many beginners land between 160 and 175. If it feels rushed, take shorter, quicker steps rather than longer ones.'),
        h('p', { class: 'muted small' }, 'The beat keeps going while you use the Run tab. Turn the phone volume up and keep the screen on. iPhone may pause the beep if you lock the screen.')));
  };
})();
