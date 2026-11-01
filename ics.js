/* ics.js: builds an iCalendar (.ics) file. CRLF line endings, UID, DTSTAMP, escaped text, 75-octet line folding. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./dates.js'));
  else root.Ics = factory(root.Dates);
})(typeof self !== 'undefined' ? self : this, function (Dates) {
  'use strict';
  function escapeText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function byteLen(ch) { var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  /* Fold a content line at 75 octets (continuation lines start with one space). */
  function fold(line) {
    var out = [], cur = '', n = 0, limit = 75;
    for (var ch of line) {
      var b = byteLen(ch);
      if (n + b > limit) { out.push(cur); cur = ' '; n = 1; limit = 75; }
      cur += ch; n += b;
    }
    out.push(cur);
    return out.join('\r\n');
  }
  function stamp(now) {
    var d = now || new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }
  function ymd(s) { return s.replace(/-/g, ''); }
  function hm(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? [+m[1], +m[2]] : [16, 30]; }
  function addMin(date, h, m, add) {
    var tot = h * 60 + m + add, dayAdd = Math.floor(tot / 1440); tot = ((tot % 1440) + 1440) % 1440;
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return ymd(Dates.addDays(date, dayAdd)) + 'T' + p(Math.floor(tot / 60)) + p(tot % 60) + '00';
  }
  /* opts: {time:'16:30', raceTime:'' (optional "HH:MM"), now:Date} */
  function build(plan, opts) {
    opts = opts || {};
    var t = hm(opts.time), ds = stamp(opts.now), L = [];
    L.push('BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//five-k-training-app//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH');
    plan.forEach(function (d) {
      if (d.type !== 'run' && d.type !== 'race') return;
      var race = d.type === 'race', rt = race && opts.raceTime ? hm(opts.raceTime) : null;
      L.push('BEGIN:VEVENT', 'UID:5k-' + ymd(d.date) + '@five-k-training-app', 'DTSTAMP:' + ds);
      if (race && !rt) {
        L.push('DTSTART;VALUE=DATE:' + ymd(d.date), 'DTEND;VALUE=DATE:' + ymd(Dates.addDays(d.date, 1)));
      } else {
        var h = race ? rt[0] : t[0], m = race ? rt[1] : t[1], dur = race ? 60 : Math.max(30, Math.round(d.total / 60));
        L.push('DTSTART:' + ymd(d.date) + 'T' + (h < 10 ? '0' + h : h) + (m < 10 ? '0' + m : m) + '00', 'DTEND:' + addMin(d.date, h, m, dur));
      }
      L.push('SUMMARY:' + escapeText(race ? '5K RACE DAY' : '5K training: ' + d.title));
      L.push('DESCRIPTION:' + escapeText(d.desc));
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escapeText(race ? '5K race day' : '5K training reminder'),
        'TRIGGER:' + (race && !rt ? '-PT15H' : '-PT15M'), 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  return { build: build, escapeText: escapeText, fold: fold };
});
