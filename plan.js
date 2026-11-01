/* plan.js: the 25-day training plan as plain data, plus pure helpers to adjust it.
   EDIT THE PLAN HERE: see BEGINNER and INTERMEDIATE below (one entry per run day).
   Dates are local "YYYY-MM-DD". Mon Nov 2 2026 .. Thu Nov 26 2026 (race day). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./dates.js'), require('./timer.js'));
  else root.Plan = factory(root.Dates, root.Timer);
})(typeof self !== 'undefined' ? self : this, function (Dates, Timer) {
  'use strict';
  var START = '2026-11-02', RACE = '2026-11-26', TAPER_START = '2026-11-23';
  var WARM = 300, COOL = 300; // 5 min walk before and after every run

  /* Run-day recipes. Each: [date, kind, args]
       'iv'   = intervals: [count, runSec, walkSec]   (run, walk, run, walk ... run)
       'cont' = one continuous run: [runSec]
     Add a line, change numbers, and everything (titles, totals, calendar) follows. */
  var BEGINNER = [
    ['2026-11-02', 'iv', [8, 60, 90]], ['2026-11-04', 'iv', [7, 90, 90]], ['2026-11-06', 'iv', [6, 120, 90]], ['2026-11-07', 'iv', [5, 180, 90]],
    ['2026-11-09', 'iv', [4, 240, 90]], ['2026-11-11', 'iv', [3, 420, 120]], ['2026-11-13', 'iv', [2, 600, 120]], ['2026-11-14', 'iv', [2, 720, 120]],
    ['2026-11-16', 'cont', [1200]], ['2026-11-18', 'iv', [2, 660, 90]], ['2026-11-20', 'cont', [1800]], ['2026-11-21', 'cont', [900, 'easy']],
    ['2026-11-23', 'cont', [900, 'easy']], ['2026-11-24', 'cont', [600, 'shakeout']]
  ];
  var INTERMEDIATE = [
    ['2026-11-02', 'cont', [900]], ['2026-11-04', 'cont', [1200]], ['2026-11-06', 'iv', [5, 180, 60]], ['2026-11-07', 'cont', [1500, 'long']],
    ['2026-11-09', 'cont', [1200]], ['2026-11-11', 'iv', [6, 180, 60]], ['2026-11-13', 'cont', [1500]], ['2026-11-14', 'cont', [2100, 'long']],
    ['2026-11-16', 'cont', [1500]], ['2026-11-18', 'iv', [5, 300, 90]], ['2026-11-20', 'cont', [2400, 'long']], ['2026-11-21', 'cont', [900, 'easy']],
    ['2026-11-23', 'cont', [900, 'easy']], ['2026-11-24', 'cont', [600, 'shakeout']]
  ];
  var WALK_DATES = ['2026-11-05', '2026-11-12', '2026-11-19']; // Thursdays: easy walk

  var REST_TIPS = [
    'Rest is part of training. Your legs get stronger while you recover. Drink water and sleep well.',
    'Take the day off. A gentle stretch or a short easy walk is fine, but you do not have to do anything.',
    'Recovery day. Eat well, hydrate, and lay out your running clothes for the next run.'
  ];

  function mins(sec) { return sec % 60 === 0 ? (sec / 60) + ' min' : Timer.speakDur(sec).replace(' seconds', ' sec'); }
  function mmss(sec) { return Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60); }

  function make(date, type, title, segments, desc, tag) {
    return { date: date, type: type, title: title, segments: segments, total: Timer.total(segments), desc: desc, tag: tag || type };
  }

  function buildRun(date, kind, a) {
    var core = [], title, desc, tag;
    if (kind === 'iv') {
      for (var i = 0; i < a[0]; i++) { core.push(['run', a[1]]); if (i < a[0] - 1) core.push(['walk', a[2]]); }
      title = 'Run/walk: ' + a[0] + ' × (' + mmss(a[1]) + ' run, ' + mmss(a[2]) + ' walk)';
      desc = 'Run ' + Timer.speakDur(a[1]) + ', then walk ' + Timer.speakDur(a[2]) + ', ' + a[0] + ' runs in all. Keep the runs slow enough to chat.';
      tag = 'intervals';
    } else {
      core.push(['run', a[0]]);
      tag = a[1] || 'continuous';
      var m = Math.round(a[0] / 60);
      title = tag === 'long' ? 'Long run: ' + m + ' min' : tag === 'easy' ? 'Easy run: ' + m + ' min' : tag === 'shakeout' ? 'Shake-out run: ' + m + ' min' : 'Continuous run: ' + m + ' min';
      desc = 'Run ' + m + ' minutes without stopping at an easy, chatty pace. If you need to walk, walk, then start running again.';
      if (tag === 'shakeout') desc = 'A very short, very easy jog to keep your legs loose before the rest day. Stop if anything hurts.';
      if (tag === 'easy') desc = 'Run ' + m + ' minutes at an easy pace. This is a lighter day so your legs are fresh for race day.';
    }
    var segs = [['warmup', WARM]].concat(core, [['cooldown', COOL]]);
    desc = 'Walk 5 minutes to warm up. ' + desc + ' Finish with a 5 minute walk to cool down.';
    return make(date, 'run', title, segs, desc, tag);
  }

  function restDay(date, n, label) {
    return make(date, 'rest', label || 'Rest day', [], REST_TIPS[(n || 0) % REST_TIPS.length], 'rest');
  }

  function raceDay(level) {
    return make(RACE, 'race', 'Race day: 5K', [],
      'Your 5K: 3.1 miles (5 km). Warm up with an easy walk, start slower than feels necessary, and finish strong. Walking is allowed. The goal is to finish.', 'race');
  }

  /* Build the base plan for a level: array of 25 day objects, one per date. */
  function generate(level) {
    var recipes = level === 'intermediate' ? INTERMEDIATE : BEGINNER;
    var byDate = {}, i;
    for (i = 0; i < recipes.length; i++) byDate[recipes[i][0]] = recipes[i];
    var out = [], n = 0;
    Dates.range(START, RACE).forEach(function (d) {
      var day;
      if (d === RACE) day = raceDay(level);
      else if (byDate[d]) day = buildRun(d, byDate[d][1], byDate[d][2]);
      else if (WALK_DATES.indexOf(d) >= 0) day = make(d, 'walk', 'Easy walk: 25 min', [['walk', 1500]],
        'Cross-training day. Walk briskly for 25 minutes, or swap in a bike ride or a swim. Easy effort.', 'walk');
      else day = restDay(d, n++, d === '2026-11-25' ? 'Rest day before the race' : 'Rest day');
      day.week = weekNumber(d);
      out.push(day);
    });
    return out;
  }

  function weekNumber(date) { return Math.floor(Dates.diffDays(Dates.weekStart(START), date) / 7) + 1; }
  function weekLabel(n) { return n >= 4 ? 'Week 4: Race week' : n === 3 ? 'Week 3: Peak' : 'Week ' + n; }

  /* Group days into Monday-based weeks: [{n, label, start, days}] */
  function groupWeeks(plan) {
    var weeks = [];
    plan.forEach(function (d) {
      var ws = Dates.weekStart(d.date), last = weeks[weeks.length - 1];
      if (!last || last.start !== ws) { last = { n: weekNumber(d.date), label: weekLabel(weekNumber(d.date)), start: ws, days: [] }; weeks.push(last); }
      last.days.push(d);
    });
    return weeks;
  }

  function copyDay(src, date) { var c = JSON.parse(JSON.stringify(src)); c.date = date; c.week = weekNumber(date); return c; }

  /* "Shift the plan forward one day" from `fromDate`: today's (and every later) workout slides one day later.
     Race day (Nov 26) and the rest day before it (Nov 25) never move. One later rest/walk day is absorbed
     so nothing falls off the end; if there is none, the last workout before the final rest day is dropped. */
  function shiftForward(plan, fromDate) {
    var raceIdx = -1, i;
    for (i = 0; i < plan.length; i++) if (plan[i].type === 'race') raceIdx = i;
    var lastIdx = raceIdx - 2; // Nov 24: last day that may move
    var i0 = -1;
    for (i = 0; i < plan.length; i++) if (plan[i].date >= fromDate) { i0 = i; break; }
    if (i0 < 0) return { plan: plan, changed: false };
    while (i0 <= lastIdx && plan[i0].type === 'rest') i0++;
    if (i0 > lastIdx) return { plan: plan, changed: false };
    var items = plan.slice(i0, lastIdx + 1), k = -1, j;
    for (j = 1; j < items.length; j++) if (items[j].type === 'rest') { k = j; break; }
    if (k < 0) for (j = 1; j < items.length; j++) if (items[j].type === 'walk') { k = j; break; }
    if (k < 0) k = items.length - 1;
    items.splice(k, 1);
    var next = plan.slice();
    var moved = [restDay(plan[i0].date, 1, 'Rest day (plan shifted)')].concat(items);
    for (j = 0; j < moved.length; j++) {
      var date = plan[i0 + j].date;
      next[i0 + j] = j === 0 ? moved[0] : copyDay(moved[j], date);
      if (j > 0) next[i0 + j].shifted = true;
    }
    next.forEach(function (d) { d.week = weekNumber(d.date); });
    return { plan: next, changed: true };
  }

  /* "Repeat this week": next week's workouts are replaced by a copy of the week that starts at
     `weekStart`. Race week (from Nov 23) is never replaced, so the taper and race day stay fixed. */
  function repeatWeek(plan, weekStart) {
    var next = plan.slice(), changed = false;
    for (var n = 0; n < 7; n++) {
      var src = null, tgtIdx = -1, tgtDate = Dates.addDays(weekStart, 7 + n), i;
      for (i = 0; i < plan.length; i++) {
        if (plan[i].date === Dates.addDays(weekStart, n)) src = plan[i];
        if (plan[i].date === tgtDate) tgtIdx = i;
      }
      if (src && tgtIdx >= 0 && tgtDate < TAPER_START && src.type !== 'race') {
        next[tgtIdx] = copyDay(src, tgtDate); next[tgtIdx].shifted = true; changed = true;
      }
    }
    return { plan: next, changed: changed };
  }

  /* Replay the saved adjustments on top of a freshly generated plan. ops: [{op:'shift', from}, {op:'repeat', from}] */
  function applyAdjust(base, ops) {
    var plan = base;
    (ops || []).forEach(function (o) {
      var r = o.op === 'repeat' ? repeatWeek(plan, o.from) : shiftForward(plan, o.from);
      plan = r.plan;
    });
    return plan;
  }

  function build(level, ops) { return applyAdjust(generate(level), ops); }
  function dayOf(plan, date) { for (var i = 0; i < plan.length; i++) if (plan[i].date === date) return plan[i]; return null; }
  function nextWorkout(plan, fromDate) {
    for (var i = 0; i < plan.length; i++) if (plan[i].date >= fromDate && (plan[i].type === 'run' || plan[i].type === 'race')) return plan[i];
    return null;
  }
  /* Run days before `today` with no completed entry. doneSet: {date: true} */
  function missedRuns(plan, doneSet, today) {
    return plan.filter(function (d) { return d.type === 'run' && d.date < today && !doneSet[d.date]; });
  }
  /* Phase of the programme for a given day. */
  function phaseOf(today) {
    if (today < START) return 'before';
    if (today > RACE) return 'after';
    return today === RACE ? 'race' : 'training';
  }

  return { START: START, RACE: RACE, TAPER_START: TAPER_START, generate: generate, build: build, groupWeeks: groupWeeks, weekNumber: weekNumber,
    weekLabel: weekLabel, shiftForward: shiftForward, repeatWeek: repeatWeek, applyAdjust: applyAdjust, dayOf: dayOf,
    nextWorkout: nextWorkout, missedRuns: missedRuns, phaseOf: phaseOf, BEGINNER: BEGINNER, INTERMEDIATE: INTERMEDIATE };
});
