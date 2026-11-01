/* badges.js: achievements. evaluate() is pure: give it the log, plan and today, get back which badges are earned.
   `icon` is the inner SVG markup of a minimal 24x24 line icon (stroke = currentColor). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./dates.js'), require('./calc.js'), require('./stats.js'));
  else root.Badges = factory(root.Dates, root.Calc, root.Stats);
})(typeof self !== 'undefined' ? self : this, function (Dates, Calc, Stats) {
  'use strict';
  var DEFS = [
    { id: 'first_run', name: 'First run', desc: 'Log your first run.', icon: '<circle cx="12" cy="12" r="8"/><path d="M9 12l2 2 4-4"/>' },
    { id: 'first_mile', name: 'First mile', desc: 'Log a run of 1 mile or more.', icon: '<path d="M4 18h16M6 18V8h4v10M14 18V4h4v14"/>' },
    { id: 'runs_5', name: '5 runs', desc: 'Log 5 runs.', icon: '<path d="M5 12h14M12 5v14"/><circle cx="12" cy="12" r="9"/>' },
    { id: 'runs_10', name: '10 runs', desc: 'Log 10 runs.', icon: '<circle cx="12" cy="12" r="9"/><path d="M8 9v6M12 9v6M16 9v6"/>' },
    { id: 'two_miles', name: '2 miles', desc: 'Run 2 miles continuously.', icon: '<path d="M3 17c4-8 8-8 18 0"/><path d="M12 9v4"/>' },
    { id: 'five_k_distance', name: '3.1 miles', desc: 'Run 3.1 miles (5K) continuously.', icon: '<path d="M4 20V5l12 3-12 4"/><path d="M4 20h16"/>' },
    { id: 'streak_7', name: '7-day streak', desc: 'Keep your plan going for 7 days in a row. Rest days count.', icon: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2 2 2 0-3-1-5 1-8z"/>' },
    { id: 'week_done', name: 'Week complete', desc: 'Finish every run in a plan week.', icon: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 15l2 2 4-4"/>' },
    { id: 'pb_distance', name: 'Longest run', desc: 'Beat your own longest distance.', icon: '<path d="M5 19l5-8 4 4 5-9"/><path d="M15 6h4v4"/>' },
    { id: 'pb_pace', name: 'Fastest pace', desc: 'Beat your own best pace on a continuous run.', icon: '<circle cx="12" cy="13" r="7"/><path d="M12 13V9M10 3h4"/>' },
    { id: 'race_done', name: '5K finisher', desc: 'Record your race-day finish.', icon: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M12 14v4M8 20h8"/>' }
  ];

  function sorted(log) { return log.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id < b.id ? -1 : 1); }); }

  /* Did a later entry beat everything before it (needs at least one earlier entry with a value)? */
  function beatsPrevious(entries, valueFn, better) {
    var best = null, hit = false;
    entries.forEach(function (e) {
      var v = valueFn(e);
      if (v == null || !isFinite(v)) return;
      if (best != null && better(v, best)) hit = true;
      if (best == null || better(v, best)) best = v;
    });
    return hit;
  }

  /* ctx: {log, plan, today, floor}. Returns {id: {earned, date}} */
  function evaluate(ctx) {
    var log = sorted(ctx.log || []), plan = ctx.plan || [], out = {};
    DEFS.forEach(function (d) { out[d.id] = { earned: false, date: null }; });
    function grant(id, date) { if (!out[id].earned) out[id] = { earned: true, date: date || null }; }
    log.forEach(function (e, i) {
      grant('first_run', e.date);
      if (e.mi >= 1) grant('first_mile', e.date);
      if (i === 4) grant('runs_5', e.date);
      if (i === 9) grant('runs_10', e.date);
      if (e.cont && e.mi >= 2) grant('two_miles', e.date);
      if (e.cont && e.mi >= 3.1) grant('five_k_distance', e.date);
      if (e.kind === 'race') grant('race_done', e.date);
    });
    // 7-day streak at any point: replay day by day through the plan
    if (plan.length && ctx.today) {
      var first = plan[0].date, d = first;
      while (d <= ctx.today) {
        if (Stats.planStreak(plan, log, d, first) >= 7) { grant('streak_7', d); break; }
        d = Dates.addDays(d, 1);
      }
      // completed week: every run day in a Monday-week has an entry
      var done = Stats.doneSet(log), weeks = {};
      plan.forEach(function (p) {
        var ws = Dates.weekStart(p.date), w = weeks[ws] || (weeks[ws] = { runs: 0, done: 0, last: p.date });
        if (p.type === 'run') { w.runs++; if (done[p.date]) w.done++; }
        if (p.date > w.last) w.last = p.date;
      });
      Object.keys(weeks).sort().forEach(function (k) {
        var w = weeks[k];
        if (w.runs > 0 && w.done === w.runs) grant('week_done', w.last);
      });
    }
    if (beatsPrevious(log, function (e) { return e.mi > 0 ? e.mi : null; }, function (a, b) { return a > b; })) grant('pb_distance');
    if (beatsPrevious(log, function (e) { return Stats.isContRun(e) ? Calc.pace(e.sec, e.mi) : null; }, function (a, b) { return a < b; })) grant('pb_pace');
    return out;
  }
  return { DEFS: DEFS, evaluate: evaluate };
});
