/* stats.js: pure log maths: streaks, weekly totals, records, shoes, check-ins, CSV + import validation.
   A log entry: {id, date, sec, mi (miles or null), effort, feel, note, kind, cont, shoeId, planDate, bestSplit} */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./dates.js'), require('./calc.js'));
  else root.Stats = factory(root.Dates, root.Calc);
})(typeof self !== 'undefined' ? self : this, function (Dates, Calc) {
  'use strict';

  /* Dates (as {date:true}) that count as "done": a logged run on that day, or an entry that names the plan day. */
  function doneSet(log) {
    var s = {};
    log.forEach(function (e) { s[e.date] = true; if (e.planDate) s[e.planDate] = true; });
    return s;
  }

  /* Streak: consecutive "kept" days ending today (today is not penalised while still open).
     kept(date) -> boolean. Never counts days before `floor`. */
  function streak(kept, today, floor) {
    var d = today, n = 0;
    if (!kept(d)) d = Dates.addDays(d, -1);
    while (d >= floor && kept(d)) { n++; d = Dates.addDays(d, -1); }
    return n;
  }
  /* Plan streak: a day is kept if it has a log entry, or is a rest/walk day (rest never breaks a streak). */
  function planStreak(plan, log, today, floor) {
    var done = doneSet(log), type = {};
    plan.forEach(function (p) { type[p.date] = p.type; });
    return streak(function (d) { return !!done[d] || type[d] === 'rest' || type[d] === 'walk'; }, today, floor);
  }
  /* Simple streak: consecutive calendar days with a logged run. */
  function logStreak(log, today) {
    var s = doneSet(log);
    return streak(function (d) { return !!s[d]; }, today, '2000-01-01');
  }

  function weeklyTotals(log) {
    var w = {};
    log.forEach(function (e) {
      var k = Dates.weekStart(e.date);
      var o = w[k] || (w[k] = { start: k, runs: 0, mi: 0, sec: 0 });
      o.runs++; o.mi += e.mi || 0; o.sec += e.sec || 0;
    });
    return w;
  }
  /* Summary of the week starting `ws` compared with the week before. */
  function weeklySummary(log, ws) {
    var w = weeklyTotals(log), zero = { runs: 0, mi: 0, sec: 0 };
    var cur = w[ws] || zero, prev = w[Dates.addDays(ws, -7)] || zero;
    return { start: ws, runs: cur.runs, mi: cur.mi, sec: cur.sec, prev: prev,
      dRuns: cur.runs - prev.runs, dMi: cur.mi - prev.mi, dSec: cur.sec - prev.sec };
  }

  function isContRun(e) { return !!e.cont && e.mi >= 1; }
  /* Personal records. */
  function records(log) {
    var r = { longest: null, bestPace: null, best5K: null, weeklyMi: null };
    log.forEach(function (e) {
      if (e.mi > 0 && (!r.longest || e.mi > r.longest.mi)) r.longest = { mi: e.mi, date: e.date };
      var splitPace = e.bestSplit > 0 ? e.bestSplit : null;
      var avg = isContRun(e) ? Calc.pace(e.sec, e.mi) : null;
      var p = splitPace && avg ? Math.min(splitPace, avg) : (splitPace || avg);
      if (p && (!r.bestPace || p < r.bestPace.sec)) r.bestPace = { sec: p, date: e.date };
      if (isContRun(e)) {
        var f = Calc.predict5K(e.sec, e.mi);
        if (isFinite(f) && (!r.best5K || f < r.best5K.sec)) r.best5K = { sec: f, date: e.date, actual: e.mi >= Calc.FIVE_K_MI - 0.02 };
      }
    });
    var w = weeklyTotals(log);
    Object.keys(w).forEach(function (k) { if (w[k].mi > 0 && (!r.weeklyMi || w[k].mi > r.weeklyMi.mi)) r.weeklyMi = { mi: w[k].mi, date: k }; });
    return r;
  }

  /* Shoes: total miles = starting miles + logged miles tagged with the shoe. */
  function shoeMiles(shoe, log) {
    var t = shoe.startMi || 0;
    log.forEach(function (e) { if (e.shoeId === shoe.id && e.mi) t += e.mi; });
    return t;
  }
  function shoeStatus(mi) { return mi >= 300 ? 'replace' : mi >= 250 ? 'soon' : 'ok'; }

  /* Pre-run check-in: legs / sleep (5 = great), soreness (5 = very sore). Gentle, never guilt. */
  function suggestion(c) {
    if (!c) return null;
    if (c.sore >= 4) return { rest: true, text: 'Your body is asking for a break. Swapping in a rest day (or an easy walk) is a good call. Rest is training too.' };
    if (c.legs <= 2 && c.sleep <= 2) return { rest: false, text: 'Tired legs and short sleep. Go extra easy today, and walk more if you want to.' };
    if (c.sore === 3) return { rest: false, text: 'A bit sore. Keep it gentle and stop if anything feels sharp.' };
    return { rest: false, text: 'You are good to go. Have a great run.' };
  }

  /* ---- Backup helpers ---- */
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(log, shoes) {
    var names = {}; (shoes || []).forEach(function (s) { names[s.id] = s.name; });
    var rows = [['date', 'duration', 'duration_sec', 'distance_mi', 'distance_km', 'pace_per_mi', 'effort_1to5', 'feel_1to5', 'type', 'shoes', 'note']];
    log.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).forEach(function (e) {
      rows.push([e.date, Calc.fmtMS(e.sec), e.sec, e.mi ? e.mi.toFixed(2) : '', e.mi ? Calc.miToKm(e.mi).toFixed(2) : '',
        e.mi ? Calc.fmtPace(Calc.pace(e.sec, e.mi)) : '', e.effort || '', e.feel || '', e.kind || '', names[e.shoeId] || '', e.note || '']);
    });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }
  /* Validate an imported backup object. Returns {ok, error} or {ok, data}. */
  function validateImport(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'This is not a backup file.' };
    if (obj.app && obj.app !== 'five-k-training-app') return { ok: false, error: 'This backup is from a different app.' };
    if (!Array.isArray(obj.log)) return { ok: false, error: 'The backup has no run log.' };
    var log = [];
    for (var i = 0; i < obj.log.length; i++) {
      var e = obj.log[i];
      if (!e || !Dates.parse(e.date) || !(e.sec >= 0)) return { ok: false, error: 'Run #' + (i + 1) + ' in the backup is not valid.' };
      log.push(e);
    }
    var data = JSON.parse(JSON.stringify(obj)); data.log = log; delete data.app; delete data.exportedAt;
    return { ok: true, data: data };
  }
  function shouldRemindBackup(logLen, lastBackupLen) { return logLen > 0 && logLen - (lastBackupLen || 0) >= 5; }

  return { doneSet: doneSet, streak: streak, planStreak: planStreak, logStreak: logStreak, weeklyTotals: weeklyTotals, weeklySummary: weeklySummary,
    records: records, isContRun: isContRun, shoeMiles: shoeMiles, shoeStatus: shoeStatus, suggestion: suggestion, toCSV: toCSV,
    validateImport: validateImport, shouldRemindBackup: shouldRemindBackup };
});
