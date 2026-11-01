/* calc.js: pure number helpers: time formatting, pace, splits, Riegel prediction, treadmill conversions. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MI_KM = 1.609344;
  var FIVE_K_MI = 5 / MI_KM; // 3.1069 miles
  function p2(n) { return n < 10 ? '0' + n : '' + n; }
  /* 1860 -> "31:00"; 3725 -> "1:02:05" */
  function fmtMS(sec) {
    if (!isFinite(sec) || sec < 0) return '--:--';
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? h + ':' + p2(m) + ':' + p2(s) : m + ':' + p2(s);
  }
  /* "31:00" -> 1860, "1:02:05" -> 3725, "45" -> 2700 (bare number = minutes). null if invalid. */
  function parseTime(str) {
    if (str == null) return null;
    var t = String(str).trim();
    if (!t) return null;
    var parts = t.split(':');
    if (parts.length > 3) return null;
    var nums = [];
    for (var i = 0; i < parts.length; i++) {
      if (!/^\d+(\.\d+)?$/.test(parts[i])) return null;
      nums.push(parseFloat(parts[i]));
    }
    if (nums.length === 1) return Math.round(nums[0] * 60);
    if (nums.length === 2) { if (nums[1] >= 60) return null; return Math.round(nums[0] * 60 + nums[1]); }
    if (nums[1] >= 60 || nums[2] >= 60) return null;
    return Math.round(nums[0] * 3600 + nums[1] * 60 + nums[2]);
  }
  function miToKm(mi) { return mi * MI_KM; }
  function kmToMi(km) { return km / MI_KM; }
  function toUnit(mi, units) { return units === 'km' ? mi * MI_KM : mi; }
  function fromUnit(v, units) { return units === 'km' ? v / MI_KM : v; }
  /* Seconds per mile for a run (distance in miles). */
  function pace(sec, mi) { return mi > 0 ? sec / mi : NaN; }
  /* Convert seconds-per-mile to seconds-per-unit. */
  function paceIn(secPerMi, units) { return units === 'km' ? secPerMi / MI_KM : secPerMi; }
  function fmtPace(secPerUnit) { return isFinite(secPerUnit) && secPerUnit > 0 ? fmtMS(secPerUnit) : '--:--'; }
  /* Treadmill: speed (mph or km/h) <-> pace (sec per mile or per km). */
  function speedToPace(speed) { return speed > 0 ? 3600 / speed : NaN; }
  function paceToSpeed(secPerUnit) { return secPerUnit > 0 ? 3600 / secPerUnit : NaN; }
  function paceTable(units, from, to, step) {
    var rows = [];
    from = from || (units === 'km' ? 6 : 4); to = to || (units === 'km' ? 14 : 8.5); step = step || (units === 'km' ? 0.5 : 0.25);
    for (var s = from; s <= to + 1e-9; s += step) {
      var sp = Math.round(s * 100) / 100, pc = speedToPace(sp);
      var miles5k = units === 'km' ? 5 : FIVE_K_MI;
      rows.push({ speed: sp, pace: pc, fiveK: pc * miles5k });
    }
    return rows;
  }
  /* Riegel: T2 = T1 * (D2/D1)^1.06. Distances in any matching unit. */
  function riegel(t1, d1, d2) { return d1 > 0 && t1 > 0 ? t1 * Math.pow(d2 / d1, 1.06) : NaN; }
  function predict5K(sec, mi) { return riegel(sec, mi, FIVE_K_MI); }
  /* Goal time -> split tables. Even pacing. perMile rows at mile 1,2,3 + finish; perKm rows at km 1..5. */
  function splitsTable(goalSec) {
    var perMi = goalSec / FIVE_K_MI, perKm = goalSec / 5, mile = [], km = [], i;
    for (i = 1; i <= 3; i++) mile.push({ mark: i + ' mi', cum: perMi * i });
    mile.push({ mark: '3.1 mi (finish)', cum: goalSec });
    for (i = 1; i <= 5; i++) km.push({ mark: i + ' km', cum: perKm * i });
    return { perMile: perMi, perKm: perKm, mile: mile, km: km };
  }
  return { MI_KM: MI_KM, FIVE_K_MI: FIVE_K_MI, fmtMS: fmtMS, parseTime: parseTime, miToKm: miToKm, kmToMi: kmToMi, toUnit: toUnit,
    fromUnit: fromUnit, pace: pace, paceIn: paceIn, fmtPace: fmtPace, speedToPace: speedToPace, paceToSpeed: paceToSpeed,
    paceTable: paceTable, riegel: riegel, predict5K: predict5K, splitsTable: splitsTable };
});
