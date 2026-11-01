/* share.js: draws a result card on a canvas, then shares it as a PNG (Web Share API) or downloads it. */
(function () {
  'use strict';
  var App = window.App;
  /* opts: {title, big, lines:[[label,value]], footer} */
  function draw(opts) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d'), cs = getComputedStyle(document.documentElement);
    var accent = cs.getPropertyValue('--accent').trim() || '#ff7a1a';
    x.fillStyle = '#121212'; x.fillRect(0, 0, W, H);
    x.fillStyle = accent; x.fillRect(0, 0, W, 16);
    x.textAlign = 'center'; x.fillStyle = '#a0a0a8'; x.font = '600 44px -apple-system, Helvetica, Arial, sans-serif';
    x.fillText(opts.title.toUpperCase(), W / 2, 150);
    x.fillStyle = accent; x.font = '800 190px -apple-system, Helvetica, Arial, sans-serif';
    x.fillText(opts.big, W / 2, 400);
    x.fillStyle = '#f2f2f4'; x.textAlign = 'left';
    var y = 560;
    opts.lines.forEach(function (l) {
      x.fillStyle = '#a0a0a8'; x.font = '500 44px -apple-system, Helvetica, Arial, sans-serif'; x.fillText(l[0], 120, y);
      x.fillStyle = '#f2f2f4'; x.font = '700 56px -apple-system, Helvetica, Arial, sans-serif'; x.textAlign = 'right'; x.fillText(l[1], W - 120, y); x.textAlign = 'left';
      x.fillStyle = '#34343a'; x.fillRect(120, y + 32, W - 240, 2);
      y += 120;
    });
    x.textAlign = 'center'; x.fillStyle = '#a0a0a8'; x.font = '500 40px -apple-system, Helvetica, Arial, sans-serif';
    x.fillText(opts.footer || '5K Training', W / 2, H - 80);
    return cv;
  }
  function send(opts, filename) {
    var cv = draw(opts);
    cv.toBlob(function (blob) {
      if (!blob) { App.toast('Could not make the picture'); return; }
      var file = null;
      try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) { }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: opts.title }).catch(function (e) { if (e && e.name !== 'AbortError') download(blob, filename); });
      } else download(blob, filename);
    }, 'image/png');
  }
  function download(blob, filename) {
    var a = App.h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    App.toast('Picture saved to your downloads');
  }
  App.share = { draw: draw, send: send };
})();
