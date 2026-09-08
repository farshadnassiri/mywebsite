/* Tiny dependency-free SVG charting + formatting helpers.
   Charts re-render on resize and on theme change so they always read correctly. */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var FN = global.FN = global.FN || {};

  /* ---------- Formatting ---------- */
  FN.usd = function (n, d) {
    d = d == null ? 0 : d;
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (n < 0 ? '−$' : '$') + s;
  };
  FN.usdC = function (n) {
    var a = Math.abs(n), sign = n < 0 ? '−' : '';
    if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    if (a >= 1e3) return sign + '$' + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return sign + '$' + Math.round(a);
  };
  FN.pct = function (n, d) { d = d == null ? 1 : d; return (n < 0 ? '−' : '') + Math.abs(n).toFixed(d) + '%'; };
  FN.sgn = function (n, fmt) { return (n > 0 ? '+' : '') + (fmt ? fmt(n) : n); };
  FN.num = function (n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };

  /* ---------- Palette (theme-aware) ---------- */
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  FN.palette = function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      ink: cssVar('--ink', '#101315'),
      muted: cssVar('--muted', '#6B7379'),
      faint: cssVar('--faint', '#9AA1A6'),
      line: cssVar('--line', '#E3E1DA'),
      accent: cssVar('--accent', '#0E6F5C'),
      warn: cssVar('--warn', '#B4581F'),
      danger: cssVar('--danger', '#A3312B'),
      surface: cssVar('--surface', '#fff'),
      series: dark
        ? ['#4FD3AF', '#E0954F', '#7FA6E8', '#E0736B', '#B39CE0', '#8FB98F']
        : ['#0E6F5C', '#B4581F', '#31558C', '#A3312B', '#6B4E9E', '#4C7A4C']
    };
  };

  /* ---------- SVG helpers ---------- */
  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function niceTicks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    var span = max - min;
    var step = Math.pow(10, Math.floor(Math.log(span / count) / Math.LN10));
    var err = (span / count) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
    for (var v = lo; v <= hi + step / 2; v += step) out.push(Math.abs(v) < step / 1e6 ? 0 : v);
    return out;
  }

  /* ---------- Responsive registry ---------- */
  var registry = [];
  function draw(entry) {
    var w = entry.el.clientWidth;
    if (!w) return;
    entry.el.innerHTML = '';
    entry.el.appendChild(entry.render(w, FN.palette()));
  }
  function redrawAll() { registry.forEach(draw); }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(redrawAll, 120); });
  window.addEventListener('themechange', redrawAll);

  FN.mount = function (elm, render) {
    if (!elm) return { update: function () {} };
    var entry = { el: elm, render: render };
    var existing = registry.filter(function (r) { return r.el === elm; })[0];
    if (existing) existing.render = render; else registry.push(entry);
    var e = existing || entry;
    draw(e);
    return { update: function (r) { e.render = r || e.render; draw(e); } };
  };

  /* ---------- Line / area chart ---------- */
  FN.line = function (opts) {
    return function (W, C) {
      var H = opts.height || 260;
      var P = { l: opts.padLeft == null ? 54 : opts.padLeft, r: 14, t: 14, b: 30 };
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.title || 'chart' });
      var series = opts.series, labels = opts.labels;
      var all = [];
      series.forEach(function (s) { s.values.forEach(function (v) { all.push(v); }); });
      if (opts.includeZero !== false) all.push(0);
      var ticks = niceTicks(Math.min.apply(null, all), Math.max.apply(null, all), opts.ticks || 4);
      var yMin = ticks[0], yMax = ticks[ticks.length - 1];
      var iw = W - P.l - P.r, ih = H - P.t - P.b;
      var x = function (i) { return P.l + (labels.length < 2 ? iw / 2 : (i / (labels.length - 1)) * iw); };
      var y = function (v) { return P.t + ih - ((v - yMin) / (yMax - yMin)) * ih; };

      if (opts.band) {
        svg.appendChild(el('rect', {
          x: x(opts.band.from), y: P.t, width: Math.max(1, x(opts.band.to) - x(opts.band.from)), height: ih,
          fill: C.warn, opacity: .07
        }));
      }
      ticks.forEach(function (t) {
        svg.appendChild(el('line', { x1: P.l, x2: W - P.r, y1: y(t), y2: y(t), stroke: C.line, 'stroke-width': 1 }));
        svg.appendChild(el('text', {
          x: P.l - 9, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: C.faint
        }, (opts.yFmt || FN.usdC)(t)));
      });
      if (yMin < 0 && yMax > 0) {
        svg.appendChild(el('line', { x1: P.l, x2: W - P.r, y1: y(0), y2: y(0), stroke: C.muted, 'stroke-width': 1.2, opacity: .55 }));
      }
      if (opts.threshold != null) {
        svg.appendChild(el('line', {
          x1: P.l, x2: W - P.r, y1: y(opts.threshold), y2: y(opts.threshold),
          stroke: C.danger, 'stroke-width': 1.2, 'stroke-dasharray': '4 4'
        }));
        svg.appendChild(el('text', { x: W - P.r, y: y(opts.threshold) - 6, 'text-anchor': 'end', 'font-size': 10, fill: C.danger }, opts.thresholdLabel || ''));
      }

      series.forEach(function (s, si) {
        var col = s.color || C.series[si % C.series.length];
        var pts = s.values.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ');
        if (s.area) {
          var base = y(Math.max(yMin, 0));
          svg.appendChild(el('polygon', {
            points: x(0) + ',' + base + ' ' + pts + ' ' + x(s.values.length - 1) + ',' + base,
            fill: col, opacity: .10
          }));
        }
        svg.appendChild(el('polyline', {
          points: pts, fill: 'none', stroke: col, 'stroke-width': s.width || 2.1,
          'stroke-linejoin': 'round', 'stroke-linecap': 'round',
          'stroke-dasharray': s.dashed ? '5 4' : null, opacity: s.opacity || 1
        }));
        if (s.dots !== false && s.values.length <= 20) {
          s.values.forEach(function (v, i) {
            svg.appendChild(el('circle', { cx: x(i), cy: y(v), r: 2.6, fill: C.surface, stroke: col, 'stroke-width': 1.6 }));
          });
        }
      });

      (opts.markers || []).forEach(function (m) {
        var col = m.color || C.danger;
        svg.appendChild(el('circle', { cx: x(m.i), cy: y(m.v), r: 4.5, fill: col }));
        var anchor = m.i > labels.length * 0.65 ? 'end' : 'start';
        var dx = anchor === 'end' ? -8 : 8;
        svg.appendChild(el('text', { x: x(m.i) + dx, y: y(m.v) - 10, 'text-anchor': anchor, 'font-size': 10.5, 'font-weight': 600, fill: col }, m.text));
      });

      var every = opts.xEvery || Math.max(1, Math.ceil(labels.length / (W < 420 ? 5 : 9)));
      labels.forEach(function (l, i) {
        if (i % every !== 0 && i !== labels.length - 1) return;
        svg.appendChild(el('text', { x: x(i), y: H - 9, 'text-anchor': 'middle', 'font-size': 10.5, fill: C.faint }, l));
      });
      return svg;
    };
  };

  /* ---------- Vertical bars (supports negatives) ---------- */
  FN.bars = function (opts) {
    return function (W, C) {
      var H = opts.height || 250;
      var P = { l: opts.padLeft == null ? 54 : opts.padLeft, r: 14, t: 18, b: 40 };
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.title || 'chart' });
      var items = opts.items;
      var vals = items.map(function (d) { return d.value; }).concat([0]);
      var ticks = niceTicks(Math.min.apply(null, vals), Math.max.apply(null, vals), 4);
      var yMin = ticks[0], yMax = ticks[ticks.length - 1];
      var iw = W - P.l - P.r, ih = H - P.t - P.b;
      var band = iw / items.length, bw = Math.min(opts.maxBar || 54, band * 0.62);
      var y = function (v) { return P.t + ih - ((v - yMin) / (yMax - yMin)) * ih; };

      ticks.forEach(function (t) {
        svg.appendChild(el('line', { x1: P.l, x2: W - P.r, y1: y(t), y2: y(t), stroke: C.line, 'stroke-width': 1 }));
        svg.appendChild(el('text', { x: P.l - 9, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: C.faint }, (opts.yFmt || FN.usdC)(t)));
      });

      items.forEach(function (d, i) {
        var cx = P.l + band * i + band / 2;
        var col = d.color || (d.value < 0 ? C.danger : C.accent);
        var top = y(Math.max(0, d.value)), bot = y(Math.min(0, d.value));
        svg.appendChild(el('rect', { x: cx - bw / 2, y: top, width: bw, height: Math.max(1.5, bot - top), rx: 3, fill: col, opacity: d.dim ? .35 : 1 }));
        if (opts.showValues !== false) {
          svg.appendChild(el('text', {
            x: cx, y: d.value < 0 ? bot + 13 : top - 6, 'text-anchor': 'middle',
            'font-size': 10.5, 'font-weight': 600, fill: col
          }, (opts.vFmt || opts.yFmt || FN.usdC)(d.value)));
        }
        var lbl = String(d.label);
        var maxChars = Math.max(4, Math.floor(band / 6.2));
        svg.appendChild(el('text', {
          x: cx, y: H - 22, 'text-anchor': 'middle', 'font-size': 10.5, fill: C.muted
        }, lbl.length > maxChars ? lbl.slice(0, maxChars - 1) + '…' : lbl));
        if (d.sub) svg.appendChild(el('text', { x: cx, y: H - 8, 'text-anchor': 'middle', 'font-size': 9.5, fill: C.faint }, d.sub));
      });
      svg.appendChild(el('line', { x1: P.l, x2: W - P.r, y1: y(0), y2: y(0), stroke: C.muted, 'stroke-width': 1.2, opacity: .6 }));
      return svg;
    };
  };

  /* ---------- Waterfall ---------- */
  FN.waterfall = function (opts) {
    return function (W, C) {
      var H = opts.height || 270;
      var P = { l: 58, r: 14, t: 24, b: 44 };
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.title || 'waterfall' });
      var items = opts.items, run = 0, steps = [];
      items.forEach(function (d) {
        if (d.total) { steps.push({ label: d.label, start: 0, end: d.value != null ? d.value : run, total: true }); run = d.value != null ? d.value : run; }
        else { steps.push({ label: d.label, start: run, end: run + d.value, delta: d.value }); run += d.value; }
      });
      var vals = [0];
      steps.forEach(function (s) { vals.push(s.start, s.end); });
      var ticks = niceTicks(Math.min.apply(null, vals), Math.max.apply(null, vals), 4);
      var yMin = ticks[0], yMax = ticks[ticks.length - 1];
      var iw = W - P.l - P.r, ih = H - P.t - P.b;
      var band = iw / steps.length, bw = Math.min(56, band * 0.62);
      var y = function (v) { return P.t + ih - ((v - yMin) / (yMax - yMin)) * ih; };

      ticks.forEach(function (t) {
        svg.appendChild(el('line', { x1: P.l, x2: W - P.r, y1: y(t), y2: y(t), stroke: C.line, 'stroke-width': 1 }));
        svg.appendChild(el('text', { x: P.l - 9, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: C.faint }, (opts.yFmt || FN.usdC)(t)));
      });

      steps.forEach(function (s, i) {
        var cx = P.l + band * i + band / 2;
        var top = y(Math.max(s.start, s.end)), bot = y(Math.min(s.start, s.end));
        var col = s.total ? C.ink : (s.delta >= 0 ? C.accent : C.danger);
        svg.appendChild(el('rect', { x: cx - bw / 2, y: top, width: bw, height: Math.max(2, bot - top), rx: 3, fill: col }));
        if (i < steps.length - 1) {
          svg.appendChild(el('line', {
            x1: cx + bw / 2, x2: cx + band - bw / 2, y1: y(s.end), y2: y(s.end),
            stroke: C.faint, 'stroke-width': 1, 'stroke-dasharray': '3 3'
          }));
        }
        var txt = s.total ? (opts.yFmt || FN.usdC)(s.end) : FN.sgn(s.delta, opts.yFmt || FN.usdC);
        svg.appendChild(el('text', { x: cx, y: top - 7, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 600, fill: col }, txt));
        var words = String(s.label).split(' '), line1 = words[0], line2 = words.slice(1).join(' ');
        svg.appendChild(el('text', { x: cx, y: H - 24, 'text-anchor': 'middle', 'font-size': 10.5, fill: C.muted }, line1));
        if (line2) svg.appendChild(el('text', { x: cx, y: H - 11, 'text-anchor': 'middle', 'font-size': 10.5, fill: C.muted }, line2));
      });
      return svg;
    };
  };

  /* ---------- Horizontal bars ---------- */
  FN.hbars = function (opts) {
    return function (W, C) {
      var items = opts.items;
      var rowH = opts.rowH || 30, P = { l: opts.padLeft || 120, r: 56, t: 8, b: 8 };
      var H = P.t + P.b + rowH * items.length;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.title || 'chart' });
      var vals = items.map(function (d) { return d.value; }).concat([0]);
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var iw = W - P.l - P.r;
      var x = function (v) { return P.l + ((v - lo) / (hi - lo || 1)) * iw; };
      var x0 = x(0);

      items.forEach(function (d, i) {
        var cy = P.t + rowH * i + rowH / 2;
        var col = d.color || (d.value < 0 ? C.danger : C.accent);
        var xa = x(d.value);
        svg.appendChild(el('rect', {
          x: Math.min(x0, xa), y: cy - rowH * 0.29, width: Math.max(2, Math.abs(xa - x0)),
          height: rowH * 0.58, rx: 3, fill: col, opacity: d.dim ? .4 : .9
        }));
        svg.appendChild(el('text', { x: P.l - 10, y: cy + 4, 'text-anchor': 'end', 'font-size': 11.5, fill: C.ink }, d.label));
        /* Always label to the right of the bar: for a negative bar that is the
           zero line, which keeps the text off the row label on the left. */
        svg.appendChild(el('text', {
          x: (d.value < 0 ? x0 : xa) + 7, y: cy + 4, 'text-anchor': 'start',
          'font-size': 11, 'font-weight': 600, fill: col
        }, (opts.vFmt || FN.usdC)(d.value)));
      });
      if (opts.target != null) {
        svg.appendChild(el('line', { x1: x(opts.target), x2: x(opts.target), y1: P.t, y2: H - P.b, stroke: C.warn, 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
      }
      svg.appendChild(el('line', { x1: x0, x2: x0, y1: P.t, y2: H - P.b, stroke: C.line, 'stroke-width': 1 }));
      return svg;
    };
  };

  /* ---------- Stacked bars ---------- */
  FN.stacked = function (opts) {
    return function (W, C) {
      var H = opts.height || 250;
      var P = { l: 54, r: 14, t: 16, b: 40 };
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.title || 'chart' });
      var groups = opts.groups, keys = opts.keys;
      var totals = groups.map(function (g) { return keys.reduce(function (a, k) { return a + (g[k] || 0); }, 0); });
      var ticks = niceTicks(0, Math.max.apply(null, totals), 4);
      var yMax = ticks[ticks.length - 1];
      var iw = W - P.l - P.r, ih = H - P.t - P.b;
      var band = iw / groups.length, bw = Math.min(46, band * 0.6);
      var y = function (v) { return P.t + ih - (v / yMax) * ih; };

      ticks.forEach(function (t) {
        svg.appendChild(el('line', { x1: P.l, x2: W - P.r, y1: y(t), y2: y(t), stroke: C.line, 'stroke-width': 1 }));
        svg.appendChild(el('text', { x: P.l - 9, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 10.5, fill: C.faint }, (opts.yFmt || FN.usdC)(t)));
      });
      groups.forEach(function (g, i) {
        var cx = P.l + band * i + band / 2, acc = 0;
        keys.forEach(function (k, ki) {
          var v = g[k] || 0; if (!v) return;
          svg.appendChild(el('rect', {
            x: cx - bw / 2, y: y(acc + v), width: bw, height: Math.max(1, y(acc) - y(acc + v)),
            fill: (opts.colors && opts.colors[ki]) || C.series[ki % C.series.length]
          }));
          acc += v;
        });
        svg.appendChild(el('text', { x: cx, y: H - 20, 'text-anchor': 'middle', 'font-size': 10.5, fill: C.muted }, g.label));
      });
      return svg;
    };
  };
})(window);
