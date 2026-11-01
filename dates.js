/* dates.js: local calendar-date helpers. All dates are "YYYY-MM-DD" strings in LOCAL time.
   Never use new Date("YYYY-MM-DD") (that parses as UTC); always build from y, m, d. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Dates = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function addDays(s, n) { var d = parse(s); return fmt(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
  /* Whole days from a to b, DST-safe (uses UTC arithmetic on the y/m/d parts only). */
  function diffDays(a, b) {
    var x = parse(a), y = parse(b);
    return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 864e5);
  }
  function dow(s) { return parse(s).getDay(); } // 0 = Sunday
  function dayName(s) { return DAYS[dow(s)]; }
  function dayShort(s) { return DAYS[dow(s)].slice(0, 3); }
  function monthDay(s) { var d = parse(s); return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function label(s) { return dayShort(s) + ' ' + monthDay(s); }
  /* Monday on or before s. */
  function weekStart(s) { var k = (dow(s) + 6) % 7; return addDays(s, -k); }
  function today(now) { return fmt(now || new Date()); }
  function range(a, b) { var out = [], n = diffDays(a, b); for (var i = 0; i <= n; i++) out.push(addDays(a, i)); return out; }
  return { fmt: fmt, parse: parse, addDays: addDays, diffDays: diffDays, dow: dow, dayName: dayName, dayShort: dayShort,
    monthDay: monthDay, label: label, weekStart: weekStart, today: today, range: range, DAYS: DAYS, MONTHS: MONTHS };
});
