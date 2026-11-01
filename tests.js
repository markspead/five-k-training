/* Run with: node tests.js   (no dependencies) */
'use strict';
const assert = require('assert');
const Dates = require('./dates.js'), Calc = require('./calc.js'), Timer = require('./timer.js'), Plan = require('./plan.js'),
  Stats = require('./stats.js'), Badges = require('./badges.js'), Ics = require('./ics.js'), Gps = require('./gps.js');
let passed = 0;
function test(name, fn) { try { fn(); passed++; } catch (e) { console.error('FAIL: ' + name + '\n  ' + e.message); process.exitCode = 1; } }
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= (eps || 1e-6), a + ' vs ' + b);

/* ---- dates ---- */
test('Nov 2 2026 is Monday, Nov 26 is Thursday', () => {
  assert.strictEqual(Dates.dayName('2026-11-02'), 'Monday');
  assert.strictEqual(Dates.dayName('2026-11-26'), 'Thursday');
});
test('date add/diff are local and DST-safe', () => {
  assert.strictEqual(Dates.addDays('2026-11-01', 1), '2026-11-02'); // DST ends Nov 1 2026 in the US
  assert.strictEqual(Dates.addDays('2026-10-31', 2), '2026-11-02');
  assert.strictEqual(Dates.diffDays('2026-11-01', '2026-11-26'), 25);
  assert.strictEqual(Dates.diffDays('2026-11-02', '2026-11-26'), 24);
  assert.strictEqual(Dates.weekStart('2026-11-08'), '2026-11-02');
  assert.strictEqual(Dates.weekStart('2026-11-09'), '2026-11-09');
  assert.strictEqual(Dates.fmt(new Date(2026, 10, 2, 23, 59)), '2026-11-02');
  assert.strictEqual(Dates.parse('nope'), null);
});

/* ---- calc ---- */
test('pace: 31:00 for 3.1 mi = 10:00 per mile', () => {
  assert.strictEqual(Calc.fmtPace(Calc.pace(1860, 3.1)), '10:00');
});
test('mm:ss formatting and parsing', () => {
  assert.strictEqual(Calc.fmtMS(0), '0:00'); assert.strictEqual(Calc.fmtMS(65), '1:05');
  assert.strictEqual(Calc.fmtMS(1860), '31:00'); assert.strictEqual(Calc.fmtMS(3725), '1:02:05');
  assert.strictEqual(Calc.fmtMS(59.6), '1:00');
  assert.strictEqual(Calc.parseTime('31:00'), 1860); assert.strictEqual(Calc.parseTime('1:02:05'), 3725);
  assert.strictEqual(Calc.parseTime('45'), 2700); assert.strictEqual(Calc.parseTime('12:75'), null);
  assert.strictEqual(Calc.parseTime('abc'), null); assert.strictEqual(Calc.parseTime(''), null);
});
test('unit conversion and km pace', () => {
  near(Calc.miToKm(1), 1.609344); near(Calc.kmToMi(5), 3.10686, 1e-4);
  near(Calc.paceIn(600, 'km'), 372.82, 0.01);
});
test('treadmill speed <-> pace', () => {
  assert.strictEqual(Calc.speedToPace(6), 600); assert.strictEqual(Calc.fmtPace(Calc.speedToPace(7.5)), '8:00');
  assert.strictEqual(Calc.paceToSpeed(600), 6); assert.ok(isNaN(Calc.speedToPace(0)));
  const rows = Calc.paceTable('mi'); assert.ok(rows.length > 10); assert.strictEqual(rows[0].speed, 4);
  near(Calc.paceTable('mi', 6, 6, 1)[0].fiveK, 600 * Calc.FIVE_K_MI);
});
test('Riegel prediction', () => {
  near(Calc.riegel(1200, 1, 1), 1200);
  // 20:00 for 5 km -> 10 km = 20*2^1.06 min
  near(Calc.riegel(1200, 5, 10), 1200 * Math.pow(2, 1.06), 1e-6);
  const f = Calc.predict5K(600, 1.0); near(f, 600 * Math.pow(Calc.FIVE_K_MI, 1.06), 1e-6);
  assert.ok(f > 600 * Calc.FIVE_K_MI); // predicted slower than the same pace held
  assert.ok(isNaN(Calc.predict5K(0, 1)));
});
test('goal-time splits table', () => {
  const s = Calc.splitsTable(1860); // 31:00
  near(s.perKm, 372); near(s.perMile, 1860 / Calc.FIVE_K_MI, 1e-9);
  assert.strictEqual(s.km.length, 5); assert.strictEqual(s.km[4].cum, 1860); assert.strictEqual(s.mile[3].cum, 1860);
  near(s.mile[0].cum, 1860 / Calc.FIVE_K_MI, 1e-9);
});

/* ---- timer ---- */
test('timer locate / catch-up', () => {
  const segs = [['warmup', 300], ['run', 60], ['walk', 90], ['run', 60], ['cooldown', 300]];
  assert.strictEqual(Timer.total(segs), 810);
  let r = Timer.locate(segs, 0); assert.strictEqual(r.phase, 'warmup'); assert.strictEqual(r.phaseRemaining, 300);
  r = Timer.locate(segs, 330); assert.strictEqual(r.phase, 'run'); assert.strictEqual(r.index, 1); assert.strictEqual(r.phaseRemaining, 30);
  r = Timer.locate(segs, 500); assert.strictEqual(r.index, 3); // came back from background in a later phase
  r = Timer.locate(segs, 810); assert.ok(r.done); r = Timer.locate(segs, 9999); assert.ok(r.done);
  assert.strictEqual(r.totalRemaining, 0);
});
test('spoken durations', () => {
  assert.strictEqual(Timer.speakDur(60), '1 minute'); assert.strictEqual(Timer.speakDur(90), '90 seconds');
  assert.strictEqual(Timer.speakDur(180), '3 minutes'); assert.strictEqual(Timer.speakDur(150), '2 minutes 30 seconds');
  assert.strictEqual(Timer.cueText('run', 180), 'Run for 3 minutes'); assert.strictEqual(Timer.cueText('walk', 90), 'Walk for 90 seconds');
});

/* ---- plan ---- */
for (const level of ['beginner', 'intermediate']) {
  const plan = Plan.generate(level);
  test(level + ': 25 consecutive unique local dates, Mon Nov 2 to Thu Nov 26', () => {
    assert.strictEqual(plan.length, 25);
    assert.strictEqual(plan[0].date, '2026-11-02'); assert.strictEqual(Dates.dayName(plan[0].date), 'Monday');
    assert.strictEqual(plan[24].date, '2026-11-26'); assert.strictEqual(Dates.dayName(plan[24].date), 'Thursday');
    assert.strictEqual(new Set(plan.map(d => d.date)).size, 25);
    for (let i = 1; i < 25; i++) assert.strictEqual(Dates.diffDays(plan[i - 1].date, plan[i].date), 1);
  });
  test(level + ': segments sum to stated totals and are sane', () => {
    plan.forEach(d => {
      assert.strictEqual(d.segments.reduce((t, s) => t + s[1], 0), d.total, d.date);
      d.segments.forEach(s => { assert.ok(s[1] > 0 && ['warmup', 'run', 'walk', 'cooldown'].includes(s[0])); });
      if (d.type === 'run') { assert.strictEqual(d.segments[0][0], 'warmup'); assert.strictEqual(d.segments[d.segments.length - 1][0], 'cooldown'); }
      if (d.type === 'rest' || d.type === 'race') assert.strictEqual(d.total, 0);
    });
  });
  test(level + ': ~4 run days a week, race day fixed, rest on Nov 25, taper', () => {
    const weeks = Plan.groupWeeks(plan);
    assert.strictEqual(weeks.length, 4);
    assert.deepStrictEqual(weeks.map(w => w.days.length), [7, 7, 7, 4]);
    weeks.slice(0, 3).forEach(w => { const n = w.days.filter(d => d.type === 'run').length; assert.ok(n === 4, 'week ' + w.n + ' has ' + n); });
    assert.strictEqual(Plan.dayOf(plan, '2026-11-25').type, 'rest');
    assert.strictEqual(Plan.dayOf(plan, '2026-11-26').type, 'race');
    const longestRun = d => d.segments.filter(s => s[0] === 'run').reduce((m, s) => Math.max(m, s[1]), 0);
    const w3 = weeks[2].days.filter(d => d.type === 'run').reduce((m, d) => Math.max(m, longestRun(d)), 0);
    const w4 = weeks[3].days.filter(d => d.type === 'run').reduce((m, d) => Math.max(m, d.total), 0);
    assert.ok(w3 >= (level === 'beginner' ? 1500 : 2400), 'peak run in week 3');
    assert.ok(w4 < weeks[2].days.reduce((m, d) => Math.max(m, d.total), 0), 'taper is lighter');
    assert.ok(plan.every(d => d.week === Plan.weekNumber(d.date)));
  });
}
test('beginner has a 25-30 min continuous run in week 3; intermediate starts at 15 min continuous', () => {
  const b = Plan.generate('beginner').filter(d => d.week === 3 && d.type === 'run');
  assert.ok(b.some(d => { const r = d.segments.filter(s => s[0] === 'run'); return r.length === 1 && r[0][1] >= 1500 && r[0][1] <= 1800; }));
  const i = Plan.generate('intermediate')[0]; assert.strictEqual(i.segments[1][1], 900);
});
test('shift plan forward keeps race day and Nov 25 rest', () => {
  const base = Plan.generate('beginner'), r = Plan.shiftForward(base, '2026-11-04');
  assert.ok(r.changed); const p = r.plan;
  assert.strictEqual(p.length, 25);
  assert.strictEqual(p[0].title, base[0].title);                       // Nov 2 untouched
  assert.strictEqual(p[2].type, 'rest');                              // Nov 4 became rest
  assert.strictEqual(p[3].title, base[2].title);                      // old Nov 4 workout now Nov 5 (replaced the walk day)
  assert.strictEqual(p[24].type, 'race'); assert.strictEqual(p[23].type, 'rest');
  p.forEach((d, i) => assert.strictEqual(d.date, base[i].date));
  assert.strictEqual(p.filter(d => d.type === 'run').length, base.filter(d => d.type === 'run').length);
  assert.ok(Plan.applyAdjust(base, [{ op: 'shift', from: '2026-11-04' }])[2].type === 'rest');
});
test('shifting many times never moves race or the day before; drops a workout only when needed', () => {
  let p = Plan.generate('beginner');
  for (let k = 0; k < 12; k++) p = Plan.shiftForward(p, '2026-11-18').plan;
  assert.strictEqual(p.length, 25); assert.strictEqual(p[24].type, 'race'); assert.strictEqual(p[23].type, 'rest');
  assert.deepStrictEqual(p.map(d => d.date), Plan.generate('beginner').map(d => d.date));
  const none = Plan.shiftForward(Plan.generate('beginner'), '2026-11-25'); assert.strictEqual(none.changed, false);
});
test('repeat this week copies it onto next week, never touching race week', () => {
  const base = Plan.generate('beginner'), r = Plan.repeatWeek(base, '2026-11-02');
  assert.ok(r.changed);
  for (let i = 0; i < 7; i++) { assert.strictEqual(r.plan[7 + i].title, base[i].title); assert.strictEqual(r.plan[7 + i].date, base[7 + i].date); }
  assert.deepStrictEqual(r.plan.slice(14).map(d => d.title), base.slice(14).map(d => d.title));
  assert.strictEqual(Plan.repeatWeek(base, '2026-11-16').changed, false);
  assert.strictEqual(Plan.repeatWeek(base, '2026-11-09').plan[14].title, base[7].title);
  assert.strictEqual(Plan.repeatWeek(base, '2026-11-09').plan[21].title, base[21].title); // Nov 23 untouched
});
test('missed runs and phases', () => {
  const plan = Plan.generate('beginner');
  const missed = Plan.missedRuns(plan, { '2026-11-02': true }, '2026-11-06').map(d => d.date);
  assert.deepStrictEqual(missed, ['2026-11-04']);
  assert.strictEqual(Plan.phaseOf('2026-11-01'), 'before'); assert.strictEqual(Plan.phaseOf('2026-11-02'), 'training');
  assert.strictEqual(Plan.phaseOf('2026-11-26'), 'race'); assert.strictEqual(Plan.phaseOf('2026-11-27'), 'after');
  assert.strictEqual(Plan.nextWorkout(plan, '2026-11-03').date, '2026-11-04');
});

/* ---- stats ---- */
const E = (date, mi, sec, extra) => Object.assign({ id: date + (extra && extra.id || ''), date, mi, sec, cont: true, kind: 'free' }, extra);
test('log streak', () => {
  const log = [E('2026-11-02', 1, 600), E('2026-11-03', 1, 600), E('2026-11-04', 1, 600)];
  assert.strictEqual(Stats.logStreak(log, '2026-11-04'), 3);
  assert.strictEqual(Stats.logStreak(log, '2026-11-05'), 3);  // today still open
  assert.strictEqual(Stats.logStreak(log, '2026-11-06'), 0);  // missed a day
  assert.strictEqual(Stats.logStreak([], '2026-11-04'), 0);
});
test('plan streak: rest days keep it alive, a missed run breaks it', () => {
  const plan = Plan.generate('beginner');
  let log = [{ date: '2026-11-02', sec: 1, id: 'a' }, { date: '2026-11-04', sec: 1, id: 'b' }];
  assert.strictEqual(Stats.planStreak(plan, log, '2026-11-04', '2026-11-02'), 3);   // run, rest, run
  assert.strictEqual(Stats.planStreak(plan, log, '2026-11-05', '2026-11-02'), 4);   // + easy walk day
  assert.strictEqual(Stats.planStreak(plan, log, '2026-11-06', '2026-11-02'), 4);   // Nov 6 run still open today
  assert.strictEqual(Stats.planStreak(plan, log, '2026-11-07', '2026-11-02'), 0);   // Nov 6 missed
});
test('weekly totals and summary vs last week', () => {
  const log = [E('2026-11-02', 1, 600), E('2026-11-04', 1.5, 900), E('2026-11-10', 3, 2000)];
  const s = Stats.weeklySummary(log, '2026-11-09');
  assert.strictEqual(s.runs, 1); near(s.mi, 3); assert.strictEqual(s.prev.runs, 2); near(s.dMi, 0.5); assert.strictEqual(s.dRuns, -1);
});
test('records', () => {
  const log = [E('2026-11-02', 1, 660), E('2026-11-04', 2, 1200), E('2026-11-06', 0.5, 200, { cont: false }), E('2026-11-10', 3.2, 2000, { bestSplit: 540 })];
  const r = Stats.records(log);
  near(r.longest.mi, 3.2); assert.strictEqual(r.bestPace.sec, 540); assert.strictEqual(r.weeklyMi.date, '2026-11-02');
  near(r.weeklyMi.mi, 3.5); assert.ok(r.best5K.sec < 2000 * 1.1);
  assert.deepStrictEqual(Stats.records([]), { longest: null, bestPace: null, best5K: null, weeklyMi: null });
});
test('shoe mileage and warning thresholds', () => {
  const shoe = { id: 's1', name: 'A', startMi: 20 };
  const log = [E('2026-11-02', 2, 1, { shoeId: 's1' }), E('2026-11-03', 3, 1, { shoeId: 's2' }), E('2026-11-04', 1.5, 1, { shoeId: 's1' })];
  near(Stats.shoeMiles(shoe, log), 23.5);
  assert.strictEqual(Stats.shoeStatus(23), 'ok'); assert.strictEqual(Stats.shoeStatus(260), 'soon');
  assert.strictEqual(Stats.shoeStatus(299.9), 'soon'); assert.strictEqual(Stats.shoeStatus(300), 'replace');
});
test('check-in suggestion is gentle', () => {
  assert.strictEqual(Stats.suggestion({ legs: 3, sleep: 3, sore: 4 }).rest, true);
  assert.strictEqual(Stats.suggestion({ legs: 3, sleep: 3, sore: 5 }).rest, true);
  assert.strictEqual(Stats.suggestion({ legs: 5, sleep: 5, sore: 1 }).rest, false);
  assert.ok(!/guilt|lazy|should/i.test(Stats.suggestion({ legs: 1, sleep: 1, sore: 5 }).text));
  assert.strictEqual(Stats.suggestion(null), null);
});
test('CSV export escapes and import validates', () => {
  const csv = Stats.toCSV([{ id: 'x', date: '2026-11-02', sec: 1860, mi: 3.1, note: 'shin, "left"', kind: 'free', shoeId: 's' }], [{ id: 's', name: 'Pegasus' }]);
  const lines = csv.split('\r\n'); assert.strictEqual(lines.length, 3);
  assert.ok(lines[1].startsWith('2026-11-02,31:00,1860,3.10,4.99,10:00,')); assert.ok(lines[1].includes('"shin, ""left"""')); assert.ok(lines[1].includes('Pegasus'));
  assert.ok(Stats.validateImport({ log: [{ date: '2026-11-02', sec: 10 }] }).ok);
  assert.ok(!Stats.validateImport({ log: [{ date: 'bad', sec: 10 }] }).ok);
  assert.ok(!Stats.validateImport({ nothing: 1 }).ok); assert.ok(!Stats.validateImport(null).ok);
  assert.ok(!Stats.validateImport({ app: 'other', log: [] }).ok);
  assert.ok(Stats.shouldRemindBackup(5, 0)); assert.ok(!Stats.shouldRemindBackup(4, 0)); assert.ok(Stats.shouldRemindBackup(10, 5)); assert.ok(!Stats.shouldRemindBackup(9, 5));
});

/* ---- badges ---- */
test('badges', () => {
  const plan = Plan.generate('beginner');
  let b = Badges.evaluate({ log: [], plan, today: '2026-11-03' });
  assert.ok(Object.values(b).every(x => !x.earned));
  const log = [E('2026-11-02', 0.8, 600, { cont: false }), E('2026-11-04', 1.2, 800, { cont: false })];
  b = Badges.evaluate({ log, plan, today: '2026-11-04' });
  assert.ok(b.first_run.earned && b.first_mile.earned && !b.runs_5.earned && !b.two_miles.earned && b.pb_distance.earned && !b.pb_pace.earned);
  const many = [];
  ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-07', '2026-11-09', '2026-11-11'].forEach((d, i) => many.push(E(d, 1 + i * 0.3, 600 + i * 50, { cont: i > 3 })));
  b = Badges.evaluate({ log: many, plan, today: '2026-11-11' });
  assert.ok(b.runs_5.earned && !b.runs_10.earned && b.two_miles.earned && !b.five_k_distance.earned);
  assert.ok(b.week_done.earned && b.week_done.date === '2026-11-08');   // all 4 week-1 runs done
  assert.ok(!b.streak_7.earned || b.streak_7.date);                      // streak: Nov 2..Nov 8 all kept -> earned on Nov 8
  assert.ok(b.streak_7.earned && b.streak_7.date === '2026-11-08');
  b = Badges.evaluate({ log: [E('2026-11-20', 3.2, 2000, { kind: 'race' })], plan, today: '2026-11-26' });
  assert.ok(b.five_k_distance.earned && b.race_done.earned && !b.streak_7.earned);
  assert.ok(Badges.DEFS.every(d => d.icon.length > 5 && d.name && d.desc));
});

/* ---- ics ---- */
test('ics validity', () => {
  const plan = Plan.generate('beginner');
  const s = Ics.build(plan, { time: '16:30', now: new Date(Date.UTC(2026, 10, 1, 12, 0, 0)) });
  assert.ok(s.startsWith('BEGIN:VCALENDAR\r\n') && s.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(s), 'only CRLF line endings');
  s.split('\r\n').forEach(l => assert.ok(Buffer.byteLength(l) <= 75, 'line too long: ' + l));
  const runs = plan.filter(d => d.type === 'run').length;
  assert.strictEqual((s.match(/BEGIN:VEVENT/g) || []).length, runs + 1);
  assert.strictEqual((s.match(/END:VEVENT/g) || []).length, runs + 1);
  assert.strictEqual((s.match(/TRIGGER:-PT15M/g) || []).length, runs);
  assert.ok(s.includes('DTSTAMP:20261101T120000Z') && s.includes('DTSTART:20261102T163000'));
  assert.ok(s.includes('DTSTART;VALUE=DATE:20261126') && s.includes('SUMMARY:5K RACE DAY'));
  const uids = s.match(/UID:.+/g); assert.strictEqual(new Set(uids).size, uids.length);
  const unfolded = s.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('SUMMARY:5K training: Run/walk: 8 × (1:00 run\\, 1:30 walk)'));
  assert.ok(Ics.build(plan, { time: '16:30', raceTime: '08:00' }).includes('DTSTART:20261126T080000'));
});
test('ics escaping and folding', () => {
  assert.strictEqual(Ics.escapeText('a,b;c\\d\ne'), 'a\\,b\;c\\\\d\\ne');
  const f = Ics.fold('X:' + 'é'.repeat(100));
  f.split('\r\n').forEach(l => assert.ok(Buffer.byteLength(l) <= 75));
  assert.strictEqual(f.replace(/\r\n /g, ''), 'X:' + 'é'.repeat(100));
});

/* ---- gps ---- */
test('gps distance, splits and route', () => {
  near(Gps.haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }), 111195, 50);
  const tr = Gps.newTrack(); let t = 0;
  // walk due north at 3 m/s, a fix every 5 s, for ~2 miles
  for (let i = 0; i <= 230; i++) { Gps.addPoint(tr, { lat: 37 + (i * 15) / 111195, lon: -79, t: i * 5000, acc: 10 }); }
  near(Gps.miles(tr), 15 * 230 / 1609.344, 0.02);
  assert.strictEqual(tr.splits.length, 2); assert.ok(Math.abs(tr.splits[0] - 1609.344 / 3) < 6);
  Gps.addPoint(tr, { lat: 40, lon: -79, t: 231 * 5000, acc: 10 });     // teleport: rejected
  Gps.addPoint(tr, { lat: 37.04, lon: -79, t: 232 * 5000, acc: 200 }); // poor accuracy: rejected
  near(Gps.miles(tr), 15 * 230 / 1609.344, 0.02);
  const d = Gps.routePath(tr.pts, 300, 200, 10); assert.ok(d.startsWith('M') && d.includes('L'));
  assert.strictEqual(Gps.routePath([], 10, 10), ''); assert.ok(Gps.thin(tr.pts, 20).length === 20);
});

console.log(passed + ' tests passed' + (process.exitCode ? ', SOME FAILED' : ''));
