/* v-stretch.js: guided warm-up and cool-down routines with timers. Timestamp based, with optional beep and voice. */
(function () {
  'use strict';
  var App = window.App, h = App.h, C = window.Calc;
  var ROUTINES = {
    warmup: { title: 'Warm-up (dynamic)', intro: 'Do these before you run. Keep moves smooth and easy.', moves: [
      ['Brisk walk', 60, 'Walk quickly in place or along the path to get your heart rate up.'],
      ['Leg swings, right', 20, 'Hold a wall. Swing your right leg forward and back like a pendulum.'],
      ['Leg swings, left', 20, 'Same on the left leg.'],
      ['Walking lunges', 30, 'Step forward into a gentle lunge, back knee toward the ground, then step through.'],
      ['Ankle circles', 20, 'Lift one foot and draw slow circles with your toes, then switch halfway.'],
      ['High knees (march)', 30, 'March in place, lifting knees to hip height. Stay light on your feet.'],
      ['Butt kicks (easy)', 30, 'Jog slowly in place, heels toward your glutes.']] },
    cooldown: { title: 'Cool-down (static)', intro: 'Do these after your cool-down walk. Hold still, breathe slowly, never bounce or force it.', moves: [
      ['Calf stretch, right', 30, 'Hands on a wall, right heel down, leg straight behind you. Lean in gently.'],
      ['Calf stretch, left', 30, 'Same on the left leg.'],
      ['Quad stretch, right', 30, 'Hold a wall. Pull your right heel toward your glute, knees together.'],
      ['Quad stretch, left', 30, 'Same on the left leg.'],
      ['Hamstring stretch', 30, 'Sit and reach toward your toes with a soft bend in your knees, or put one heel on a low step.'],
      ['Hip flexor stretch', 30, 'Kneel on one knee, tuck your hips forward. Switch sides halfway.'],
      ['Deep breathing', 30, 'Stand tall. Breathe in through your nose for 4, out for 6.']] }
  };

  App.views.stretch = function (el, params) {
    var key = params[0];
    el.appendChild(App.back(key ? 'stretch' : 'more', key ? 'Routines' : 'More'));
    if (!ROUTINES[key]) {
      el.appendChild(App.header('Warm-up and cool-down'));
      Object.keys(ROUTINES).forEach(function (k) {
        var r = ROUTINES[k], tot = r.moves.reduce(function (a, m) { return a + m[1]; }, 0);
        el.appendChild(h('div', { class: 'card' }, h('h2', null, r.title), h('p', { class: 'muted' }, r.intro), h('p', { class: 'small' }, r.moves.length + ' moves · about ' + Math.round(tot / 60) + ' min'),
          h('a', { class: 'btn primary', href: '#/stretch/' + k }, 'Start guided routine'),
          h('ul', { class: 'small' }, r.moves.map(function (m) { return h('li', null, h('b', null, m[0] + ' (' + m[1] + 's): '), m[2]); }))));
      });
      return;
    }
    var r = ROUTINES[key], idx = 0, t0 = null, accMs = 0, running = false, timer = null;
    el.appendChild(App.header(r.title));
    var name = h('div', { class: 'phase run' }), time = h('div', { class: 'big-time' }), desc = h('p', { style: 'text-align:center' }), nxt = h('p', { class: 'muted', style: 'text-align:center' });
    var go = h('button', { class: 'btn primary big' }, 'Start'), skipB = h('button', { class: 'btn' }, 'Next move'), prevB = h('button', { class: 'btn' }, 'Back');
    el.appendChild(h('div', { class: 'card' }, name, time, desc, nxt));
    el.appendChild(h('div', { class: 'stack' }, go, h('div', { class: 'grid2' }, prevB, skipB)));
    function show() {
      var m = r.moves[idx]; name.textContent = m[0]; desc.textContent = m[2];
      nxt.textContent = r.moves[idx + 1] ? 'Next: ' + r.moves[idx + 1][0] : 'Last move';
      time.textContent = C.fmtMS(Math.max(0, Math.ceil(m[1] - (accMs + (running ? Date.now() - t0 : 0)) / 1000)));
    }
    function setIdx(i, announce) {
      if (i >= r.moves.length) { stop(); name.textContent = 'Done'; time.textContent = '0:00'; desc.textContent = 'Nice. You are ready.'; nxt.textContent = ''; go.textContent = 'Start again'; idx = 0;
        if (announce) { if (App.state.sound) App.beep('done'); if (App.state.voice && window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance('Routine complete')); } return; }
      idx = Math.max(0, i); accMs = 0; t0 = Date.now(); show();
      if (announce) { if (App.state.sound) App.beep('walk'); if (App.state.voice && window.speechSynthesis) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(r.moves[idx][0])); } }
    }
    function stop() { running = false; clearInterval(timer); go.textContent = 'Resume'; }
    function tick() { if ((accMs + Date.now() - t0) / 1000 >= r.moves[idx][1]) setIdx(idx + 1, true); else show(); }
    go.addEventListener('click', function () {
      App.audioUnlock();
      if (running) { accMs += Date.now() - t0; stop(); show(); return; }
      if (go.textContent === 'Start again') idx = 0;
      running = true; t0 = Date.now(); go.textContent = 'Pause'; timer = setInterval(tick, 250); show();
    });
    skipB.addEventListener('click', function () { var was = running; setIdx(idx + 1, true); if (was && idx < r.moves.length) { running = true; } });
    prevB.addEventListener('click', function () { setIdx(idx - 1, false); });
    show();
    return function () { clearInterval(timer); };
  };
})();
