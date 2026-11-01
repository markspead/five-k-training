/* timer.js: pure interval-timer maths. Segments are [phase, seconds] pairs.
   The UI feeds in elapsed seconds computed from timestamps, so catching up after a
   background pause is just a matter of calling locate() with the new elapsed time. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Timer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LABELS = { warmup: 'Warm-up walk', run: 'Run', walk: 'Walk', cooldown: 'Cool-down walk', race: 'Race' };
  function total(segs) { var t = 0; for (var i = 0; i < segs.length; i++) t += segs[i][1]; return t; }
  function label(phase) { return LABELS[phase] || phase; }
  /* Where are we after `elapsed` seconds? */
  function locate(segs, elapsed) {
    var tot = total(segs), acc = 0;
    if (elapsed < 0) elapsed = 0;
    for (var i = 0; i < segs.length; i++) {
      var d = segs[i][1];
      if (elapsed < acc + d) {
        return { index: i, phase: segs[i][0], phaseElapsed: elapsed - acc, phaseRemaining: acc + d - elapsed,
          phaseDur: d, total: tot, elapsed: elapsed, totalRemaining: tot - elapsed, done: false };
      }
      acc += d;
    }
    return { index: segs.length, phase: null, phaseElapsed: 0, phaseRemaining: 0, phaseDur: 0, total: tot,
      elapsed: tot, totalRemaining: 0, done: true };
  }
  /* Seconds -> spoken words. 60 -> "1 minute", 90 -> "90 seconds", 180 -> "3 minutes", 150 -> "2 minutes 30 seconds"? no: <120 uses seconds. */
  function speakDur(sec) {
    sec = Math.round(sec);
    if (sec === 60) return '1 minute';
    if (sec < 120) return sec + ' seconds';
    var m = Math.floor(sec / 60), s = sec % 60;
    var out = m + ' minutes';
    if (s) out += ' ' + s + ' seconds';
    return out;
  }
  function cueText(phase, dur) {
    if (phase === 'run') return 'Run for ' + speakDur(dur);
    if (phase === 'walk') return 'Walk for ' + speakDur(dur);
    if (phase === 'warmup') return 'Warm up with an easy walk for ' + speakDur(dur);
    if (phase === 'cooldown') return 'Cool down with an easy walk for ' + speakDur(dur);
    return label(phase);
  }
  return { total: total, label: label, locate: locate, speakDur: speakDur, cueText: cueText };
});
