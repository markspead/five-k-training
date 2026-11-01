/* gps.js: pure GPS-track maths (distance, per-mile splits, route drawing). The browser Geolocation wiring is in v-run.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Gps = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var M_PER_MI = 1609.344;
  function haversine(a, b) {
    var R = 6371008.8, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function newTrack() { return { pts: [], meters: 0, splits: [], lastSplitT: null }; }
  /* Add a fix {lat, lon, t (ms), acc (m)}. Ignores poor-accuracy fixes, GPS jitter (<4 m) and impossible jumps (>9 m/s). Mutates and returns the track. */
  function addPoint(tr, p) {
    if (p.acc != null && p.acc > 40) return tr;
    var last = tr.pts[tr.pts.length - 1];
    if (!last) { tr.pts.push(p); tr.lastSplitT = p.t; return tr; }
    var d = haversine(last, p), dt = (p.t - last.t) / 1000;
    if (d < 4) return tr;
    if (dt > 0 && d / dt > 9) return tr;
    var before = tr.meters;
    tr.meters += d;
    tr.pts.push(p);
    // per-mile splits, interpolating the crossing time inside this step
    var n = Math.floor(before / M_PER_MI) + 1;
    while (n * M_PER_MI <= tr.meters) {
      var frac = (n * M_PER_MI - before) / d, tCross = last.t + frac * (p.t - last.t);
      tr.splits.push(Math.round((tCross - tr.lastSplitT) / 1000));
      tr.lastSplitT = tCross; n++;
    }
    return tr;
  }
  function miles(tr) { return tr.meters / M_PER_MI; }
  /* SVG path for the route, scaled to fit w x h with padding. Longitude is scaled by cos(latitude) so the shape is not stretched. */
  function routePath(pts, w, h, pad) {
    if (!pts || pts.length < 2) return '';
    pad = pad == null ? 10 : pad;
    var minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity, i;
    for (i = 0; i < pts.length; i++) {
      minLat = Math.min(minLat, pts[i].lat); maxLat = Math.max(maxLat, pts[i].lat);
      minLon = Math.min(minLon, pts[i].lon); maxLon = Math.max(maxLon, pts[i].lon);
    }
    var k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
    var sx = (maxLon - minLon) * k || 1e-9, sy = (maxLat - minLat) || 1e-9;
    var scale = Math.min((w - 2 * pad) / sx, (h - 2 * pad) / sy);
    var ox = (w - sx * scale) / 2, oy = (h - sy * scale) / 2, out = [];
    for (i = 0; i < pts.length; i++) {
      var x = ox + (pts[i].lon - minLon) * k * scale, y = oy + (maxLat - pts[i].lat) * scale;
      out.push((i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1));
    }
    return out.join(' ');
  }
  /* Keep at most `max` points for storage (always keeps first and last). */
  function thin(pts, max) {
    if (pts.length <= max) return pts.map(function (p) { return { lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5), t: p.t }; });
    var out = [], step = (pts.length - 1) / (max - 1);
    for (var i = 0; i < max; i++) { var p = pts[Math.round(i * step)]; out.push({ lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5), t: p.t }); }
    return out;
  }
  return { M_PER_MI: M_PER_MI, haversine: haversine, newTrack: newTrack, addPoint: addPoint, miles: miles, routePath: routePath, thin: thin };
});
