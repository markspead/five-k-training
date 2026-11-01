/* v-shoes-body.js: shoe mileage tracker and optional body log (weight, resting heart rate) with trend charts. */
(function () {
  'use strict';
  var App = window.App, h = App.h, D = window.Dates, C = window.Calc, S = window.Stats;

  App.views.shoes = function (el) {
    var st = App.state;
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Shoes'));
    el.appendChild(h('p', { class: 'muted' }, 'Pick your shoes when you log a run and their miles add up on their own. Most shoes last about 300 to 500 miles; this app warns you at 300.'));
    if (!st.shoes.length) el.appendChild(h('div', { class: 'card' }, h('p', null, 'No shoes yet. Add the pair you run in.')));
    st.shoes.forEach(function (s) {
      var mi = S.shoeMiles(s, st.log), status = S.shoeStatus(mi), pct = Math.min(100, mi / 3);
      el.appendChild(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('b', null, s.name), s.retired ? h('span', { class: 'pill' }, 'Retired') : null),
        h('p', null, App.dist(mi, 1) + ' of 300 mi'), h('div', { class: 'bar ' + (status === 'replace' ? 'bad' : status === 'soon' ? 'warn' : ''), role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '300', 'aria-valuenow': String(Math.round(mi)), 'aria-label': s.name + ' mileage' }, h('b', { style: 'width:' + pct + '%' })),
        status === 'replace' ? h('p', { style: 'color:var(--bad)' }, 'These have reached 300 miles. Time to think about a new pair.') : status === 'soon' ? h('p', { style: 'color:var(--warn)' }, 'Getting close to 300 miles.') : null,
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: function () { s.retired = !s.retired; App.save(); App.rerender(); } }, s.retired ? 'Un-retire' : 'Retire'),
          h('button', { class: 'btn small danger', onclick: function () { App.confirm('Remove ' + s.name + '? Runs keep their data but lose the shoe tag.', 'Remove', true).then(function (ok) {
            if (!ok) return; st.shoes = st.shoes.filter(function (x) { return x.id !== s.id; }); st.log.forEach(function (e) { if (e.shoeId === s.id) e.shoeId = null; }); App.save(); App.rerender(); }); } }, 'Remove'))));
    });
    var name = h('input', { type: 'text', placeholder: 'Brand and model', maxlength: '40' }), start = h('input', { type: 'number', inputmode: 'decimal', step: '0.1', min: '0', placeholder: '0' });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Add shoes'), App.field('Name', name), App.field('Miles already on them (' + App.unit() + ')', start),
      h('button', { class: 'btn primary', onclick: function () {
        if (!name.value.trim()) { App.toast('Give the shoes a name'); return; }
        var id = App.id(); st.shoes.push({ id: id, name: name.value.trim(), startMi: start.value ? C.fromUnit(parseFloat(start.value) || 0, App.unit()) : 0, retired: false }); st.lastShoe = st.lastShoe || id; App.save(); App.rerender(); } }, 'Add')));
  };

  App.views.body = function (el) {
    var st = App.state, lb = App.unit() === 'mi', wu = lb ? 'lb' : 'kg';
    el.appendChild(App.back('more', 'More')); el.appendChild(App.header('Body log'));
    el.appendChild(h('p', { class: 'muted' }, 'Totally optional. Fill in only what you want to track. Resting heart rate (beats per minute, measured when you wake up) often drops as you get fitter.'));
    var date = h('input', { type: 'date', value: App.today(), max: App.today() }), w = h('input', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: 'optional' }), hr = h('input', { type: 'number', inputmode: 'numeric', placeholder: 'optional' });
    el.appendChild(h('div', { class: 'card' }, App.field('Date', date), App.field('Weight (' + wu + ')', w), App.field('Resting heart rate (bpm)', hr),
      h('button', { class: 'btn primary', onclick: function () {
        var wv = parseFloat(w.value), hv = parseInt(hr.value, 10);
        if (!(wv > 0) && !(hv > 0)) { App.toast('Enter a weight or heart rate'); return; }
        st.body = st.body.filter(function (b) { return b.date !== date.value; });
        st.body.push({ date: date.value, w: wv > 0 ? (lb ? wv : wv * 2.20462) : null, hr: hv > 0 ? hv : null }); App.save(); App.toast('Saved'); App.rerender(); } }, 'Save entry')));
    var rows = st.body.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var wp = rows.filter(function (b) { return b.w; }).map(function (b) { return { label: D.monthDay(b.date), value: lb ? b.w : b.w / 2.20462 }; });
    var hp = rows.filter(function (b) { return b.hr; }).map(function (b) { return { label: D.monthDay(b.date), value: b.hr }; });
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Weight (' + wu + ')'), App.chart.line(wp, { fmt: function (v) { return v.toFixed(0); }, label: 'Weight trend' })));
    el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Resting heart rate (bpm)'), App.chart.line(hp, { fmt: function (v) { return v.toFixed(0); }, label: 'Resting heart rate trend' })));
    if (rows.length) el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Entries'), h('ul', { class: 'list' }, rows.slice().reverse().map(function (b) {
      return h('li', null, h('div', { class: 'item' }, h('div', { class: 'grow' }, D.label(b.date) + ': ' + (b.w ? (lb ? b.w : b.w / 2.20462).toFixed(1) + ' ' + wu : '') + (b.w && b.hr ? ' · ' : '') + (b.hr ? b.hr + ' bpm' : '')),
        h('button', { class: 'btn small danger', 'aria-label': 'Delete entry for ' + D.label(b.date), onclick: function () { st.body = st.body.filter(function (x) { return x !== b; }); App.save(); App.rerender(); } }, 'Delete')));
    }))));
  };
})();
