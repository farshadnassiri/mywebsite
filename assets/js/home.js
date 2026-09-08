/* Homepage hero: a live 13-week cash model. Synthetic data, real arithmetic. */
(function () {
  'use strict';
  var chartEl = document.getElementById('hero-chart');
  if (!chartEl || !window.FN) return;

  var OPENING = 182000;
  var FLOOR = 75000;
  var K = 1000;
  var COLLECT = [58, 42, 71, 50, 64, 48, 77, 52, 60, 49, 73, 55, 66].map(function (v) { return v * K; });
  var OUTFLOW = [46, 88, 44, 52, 90, 46, 48, 92, 85, 47, 50, 93, 48].map(function (v) { return v * K; });
  var LABELS = COLLECT.map(function (_, i) { return 'W' + (i + 1); });

  var SCENARIOS = {
    base: {
      note: 'Base case: customers pay on current terms and headcount is unchanged. ' +
            'Cash never breaks the $75k floor, but week 12 is tight — that is a payroll week ' +
            'landing next to a slow collection week.',
      build: function () { return { inflow: COLLECT.slice(), outflow: OUTFLOW.slice() }; }
    },
    slow: {
      note: 'Collections slip by two weeks — a 14-day DSO deterioration, which is what one large ' +
            'customer changing its payment run looks like. Nothing about the business got worse. ' +
            'The timing did, and it costs more than $50k of headroom.',
      build: function () {
        var inflow = COLLECT.map(function (v, i) {
          return 0.4 * v + 0.6 * (i >= 2 ? COLLECT[i - 2] : 0);
        });
        return { inflow: inflow, outflow: OUTFLOW.slice() };
      }
    },
    hire: {
      note: 'Two hires starting in week 3 at $9.5k fully-loaded monthly cost each, plus $6k of ' +
            'one-off setup. The P&L still looks fine — the cash floor is what the decision ' +
            'actually moves.',
      build: function () {
        var weekly = 2 * 9500 * 12 / 52;
        var outflow = OUTFLOW.map(function (v, i) {
          return v + (i >= 2 ? weekly : 0) + (i === 2 ? 6000 : 0);
        });
        return { inflow: COLLECT.slice(), outflow: outflow };
      }
    }
  };

  function project(sc) {
    var f = SCENARIOS[sc].build(), bal = OPENING, out = [];
    for (var i = 0; i < f.inflow.length; i++) {
      bal = bal + f.inflow[i] - f.outflow[i];
      out.push(bal);
    }
    return out;
  }

  var baseline = project('base');
  var current = 'base';
  var mount = FN.mount(chartEl, function () { return document.createElement('div'); });

  function render(sc) {
    var vals = project(sc);
    var min = Math.min.apply(null, vals);
    var minIdx = vals.indexOf(min);
    var gap = Math.max(0, FLOOR - min);
    var netPerWeek = (vals[vals.length - 1] - OPENING) / vals.length;
    var runway = netPerWeek < 0 ? vals[vals.length - 1] / -netPerWeek : null;

    document.getElementById('hero-min').textContent = FN.usdC(min);
    document.getElementById('hero-min').className = 'kpi__val ' + (min < FLOOR ? 'neg' : '');
    document.getElementById('hero-minwk').textContent = 'in week ' + (minIdx + 1);
    document.getElementById('hero-runway').textContent = runway ? Math.round(runway) + ' wks' : '13+ wks';
    document.getElementById('hero-runway-note').textContent = runway
      ? 'at ' + FN.usdC(-netPerWeek) + '/week net burn' : 'cash flat or building';
    var gapEl = document.getElementById('hero-gap');
    gapEl.textContent = gap > 0 ? FN.usdC(gap) : 'None';
    gapEl.className = 'kpi__val ' + (gap > 0 ? 'neg' : 'pos');
    document.getElementById('hero-note').textContent = SCENARIOS[sc].note;

    var series = [{ name: 'Cash', values: vals, area: true, dots: false }];
    if (sc !== 'base') {
      series.unshift({ name: 'Base', values: baseline, dashed: true, dots: false, width: 1.5, opacity: .5, color: FN.palette().muted });
    }
    mount.update(FN.line({
      title: '13-week projected cash balance',
      labels: LABELS,
      series: series,
      height: 210,
      padLeft: 48,
      threshold: FLOOR,
      thresholdLabel: 'safety floor',
      markers: [{ i: minIdx, v: min, text: FN.usdC(min), color: min < FLOOR ? FN.palette().danger : FN.palette().accent }],
      yFmt: FN.usdC
    }));
  }

  var seg = document.getElementById('hero-seg');
  seg.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sc]');
    if (!b) return;
    current = b.getAttribute('data-sc');
    seg.querySelectorAll('[data-sc]').forEach(function (x) {
      x.setAttribute('aria-pressed', String(x === b));
    });
    render(current);
  });
  window.addEventListener('themechange', function () { render(current); });
  render(current);
})();
