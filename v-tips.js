/* v-tips.js: hydration and fueling tips, safety tips, race-week checklist, help. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates;

  function page(el, title, sections) {
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header(title));
    sections.forEach(function (s) {
      el.appendChild(h('div', { class: 'card' }, h('h3', null, s[0]), h('ul', null, s[1].map(function (t) { return h('li', null, t); }))));
    });
  }

  App.views.fueling = function (el) {
    page(el, 'Hydration and fueling', [
      ['Every day', ['Drink water through the day. Pale yellow urine is a good sign.', 'Eat regular meals with some carbohydrate (rice, pasta, oats, bread, fruit) and some protein.', 'You do not need sports drinks or gels for runs under an hour.']],
      ['Before a run', ['Eat a light meal 2 to 3 hours before, or a small snack (banana, toast) 30 to 60 minutes before.', 'Drink a glass of water an hour before.', 'Avoid big, greasy or very high-fiber meals right before running.']],
      ['During a run', ['For a 5K, water before and after is plenty.', 'If it is hot or you are thirsty, a few sips is fine.']],
      ['After a run', ['Drink water and eat something with carbohydrate and protein within an hour or two (chocolate milk, a sandwich, eggs and toast).', 'Do not run hungry or dehydrated the next day.']],
      ['Race morning', ['Eat what you have eaten before runs. Nothing new on race day.', 'Light breakfast 2 to 3 hours before the start, then sip water.', 'It is Thanksgiving: save the big meal for after the race.']]]);
  };

  App.views.safety = function (el) {
    page(el, 'Safety tips', [
      ['Before you start', ['If you have any health concern, a heart, lung or joint condition, or have not exercised in a long time, see a doctor first.', 'Wear shoes that fit and feel comfortable.']],
      ['On every run', ['Warm up with a walk. Cool down with a walk.', 'Run at an easy pace where you could chat.', 'Be visible: bright clothing, and a light after dark. Run facing traffic, and stay on paths when you can.', 'Tell someone where you are going, and keep your phone with you.']],
      ['Listen to your body', ['Stop for sharp pain, dizziness, chest pain or trouble breathing.', 'Mild muscle soreness is normal. Pain in a joint, shin or foot that gets worse while you run is not.', 'Do not run through an injury. Rest, and see a professional if it lasts.', 'Missing a day is fine. Extra rest never ruins a plan.']],
      ['Weather', ['Cold: dress in layers you can take off. Hot: slow down, drink water, go early or late.', 'Skip icy or very windy conditions. A treadmill or walk is a fine swap.']]]);
  };

  var CHECK = [
    ['2026-11-19', ['Confirm race time, place and parking or walking route', 'Check how many days of food and water you need for the weekend']],
    ['2026-11-20', ['Wear the shoes you will race in for your longest run', 'Pick your race outfit and try it out']],
    ['2026-11-21', ['Check the weather forecast for race day', 'Have your race registration or bib number ready']],
    ['2026-11-22', ['Easy day. Stretch gently', 'Drink water through the day']],
    ['2026-11-23', ['Check your shoes, socks and clothes are clean and ready', 'Plan how you will get to the start']],
    ['2026-11-24', ['Pack your bag: bib, safety pins, water, phone, a layer for after', 'Get to bed on time']],
    ['2026-11-25', ['Rest day. Carbohydrates with dinner, plenty of water', 'Lay out everything for the morning', 'Set two alarms']],
    ['2026-11-26', ['Eat a light breakfast 2 to 3 hours before', 'Warm-up walk and a few easy stretches', 'Start slower than feels necessary', 'Enjoy it. You earned this']]
  ];
  App.views.checklist = function (el) {
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Race-week checklist'));
    el.appendChild(h('p', { class: 'muted' }, 'Nov 19 to 26. Tick things off. Saved on this phone.'));
    var today = App.today();
    CHECK.forEach(function (d) {
      el.appendChild(h('div', { class: 'card' + (d[0] === today ? ' accent' : '') }, h('h3', null, D.dayName(d[0]) + ', ' + D.monthDay(d[0]) + (d[0] === '2026-11-26' ? ' · Race day' : '')),
        d[1].map(function (t, i) { return App.checkItem('week:' + d[0] + ':' + i, t); })));
    });
  };

  App.views.help = function (el) {
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Help'));
    el.appendChild(h('div', { class: 'card' }, h('button', { class: 'btn primary', onclick: function () { App.showTour(true); } }, 'Show the 4-screen tour')));
    [['How do I start a workout?', 'Open Today and tap Start, or use the Run tab. Keep the screen on. Beeps, vibration and voice tell you when to run and walk.'],
      ['I missed a day.', 'Skip it and keep going. If you want, tap Plan options on Today to shift the plan forward one day or repeat a week. Race day stays on Nov 26.'],
      ['Does it work without internet?', 'Yes. After the first time you open it with a connection, everything is saved on your phone.'],
      ['How do I install it on my iPhone?', 'Open it in Safari, tap the Share button, then Add to Home Screen.'],
      ['Where is my data?', 'Only on this phone. Use Settings to export a backup.']].forEach(function (q) {
      el.appendChild(h('div', { class: 'card' }, h('h3', null, q[0]), h('p', null, q[1])));
    });
  };
})();
