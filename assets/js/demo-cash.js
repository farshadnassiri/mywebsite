/* 13-week cash flow model. Synthetic inputs, real mechanics. */
(function () {
  'use strict';
  if (!window.FN || !document.getElementById('c-chart')) return;

  var $ = function (id) { return document.getElementById(id); };
  var WEEKS = 13;
  var SUPPLIER_LAG = 3;          /* ~21 day supplier terms */
  var ids = ['c-open', 'c-rev', 'c-g', 'c-dso', 'c-gm', 'c-pay', 'c-opex', 'c-oneoff',
             'c-ow', 'c-floor', 'c-hire-on', 'c-hire-n', 'c-hire-cost', 'c-hw'];

  function read() {
    return {
      open: +$('c-open').value || 0,
      rev: Math.max(0, +$('c-rev').value || 0),
      g: (+$('c-g').value || 0) / 100,
      dso: Math.max(1, +$('c-dso').value || 1),
      gm: (+$('c-gm').value || 0) / 100,
      pay: Math.max(0, +$('c-pay').value || 0),
      opex: Math.max(0, +$('c-opex').value || 0),
      oneoff: Math.max(0, +$('c-oneoff').value || 0),
      ow: +$('c-ow').value || 1,
      floor: +$('c-floor').value || 0,
      hireOn: $('c-hire-on').checked,
      hireN: Math.max(0, +$('c-hire-n').value || 0),
      hireCost: Math.max(0, +$('c-hire-cost').value || 0),
      hw: +$('c-hw').value || 1
    };
  }

  /* Weekly revenue for week i (1-based); i can be negative for periods already invoiced. */
  function weeklyRev(s, i) {
    var base = s.rev * 12 / 52;
    return base * Math.pow(1 + s.g, (i - 1) / (52 / 12));
  }

  function project(s, withHires) {
    var lag = s.dso / 7;
    var payrollPerRun = s.pay * 12 / 26;   /* one bi-weekly payroll run */
    var opexWeekly = s.opex * 12 / 52;
    var hireWeekly = withHires ? s.hireN * s.hireCost * 12 / 52 : 0;
    var rows = [], bal = s.open;

    for (var i = 1; i <= WEEKS; i++) {
      /* Collections: revenue invoiced `lag` weeks ago, split across the two weeks it straddles. */
      var src = i - lag;
      var lo = Math.floor(src), frac = src - lo;
      var collections = weeklyRev(s, lo) * (1 - frac) + weeklyRev(s, lo + 1) * frac;

      var suppliers = weeklyRev(s, i - SUPPLIER_LAG) * (1 - s.gm);
      var payroll = (i % 2 === 1) ? payrollPerRun : 0;
      var overhead = opexWeekly;
      var other = (i === s.ow ? s.oneoff : 0) + (withHires && i >= s.hw ? hireWeekly : 0)
                + (withHires && i === s.hw ? s.hireN * 1500 : 0);   /* onboarding/equipment */

      var net = collections - suppliers - payroll - overhead - other;
      bal += net;
      rows.push({
        wk: i, collections: collections, suppliers: suppliers, payroll: payroll,
        overhead: overhead, other: other, net: net, bal: bal
      });
    }
    return rows;
  }

  var chart = FN.mount($('c-chart'), function () { return document.createElement('div'); });
  var netChart = FN.mount($('c-net'), function () { return document.createElement('div'); });
  var leverChart = FN.mount($('c-levers'), function () { return document.createElement('div'); });

  function update() {
    var s = read();
    $('c-g-val').textContent = FN.sgn(s.g * 100, function (v) { return v.toFixed(1) + '%'; });
    $('c-dso-val').textContent = s.dso + ' days';
    $('c-gm-val').textContent = (s.gm * 100).toFixed(0) + '%';
    $('c-ow-val').textContent = s.ow;
    $('c-hw-val').textContent = s.hw;
    $('c-hire-block').style.opacity = s.hireOn ? '1' : '.45';
    $('c-hire-block').style.pointerEvents = s.hireOn ? '' : 'none';

    var rows = project(s, s.hireOn);
    var noHire = s.hireOn ? project(s, false) : null;
    var bals = rows.map(function (r) { return r.bal; });
    var min = Math.min.apply(null, bals), minIdx = bals.indexOf(min);
    var below = bals.filter(function (b) { return b < s.floor; }).length;
    var gap = Math.max(0, s.floor - min);
    var closing = bals[bals.length - 1];
    var netTotal = closing - s.open;
    var perWeek = netTotal / WEEKS;
    var ar = s.rev * (s.dso / 30);

    $('c-min').textContent = FN.usdC(min);
    $('c-min').className = 'kpi__val ' + (min < 0 ? 'neg' : min < s.floor ? 'neg' : 'pos');
    $('c-min-wk').textContent = 'in week ' + (minIdx + 1);
    $('c-below').textContent = below;
    $('c-below').className = 'kpi__val ' + (below ? 'neg' : 'pos');
    $('c-gap').textContent = gap > 0 ? FN.usdC(gap) : 'None';
    $('c-gap').className = 'kpi__val ' + (gap > 0 ? 'neg' : 'pos');
    $('c-close').textContent = FN.usdC(closing);
    $('c-close-d').innerHTML = '<span class="' + (netTotal >= 0 ? 'pos' : 'neg') + '">' +
      FN.sgn(netTotal, FN.usdC) + ' over 13 weeks</span>';
    var runwayWks = perWeek < 0 ? Math.max(0, Math.round(closing / -perWeek)) : null;
    $('c-runway').textContent = runwayWks == null ? 'Building' : (runwayWks > 52 ? '52+ wks' : runwayWks + ' wks');
    $('c-runway-d').textContent = perWeek < 0
      ? 'at ' + FN.usdC(-perWeek) + '/week net burn'
      : 'cash grows ' + FN.usdC(perWeek) + '/week';
    $('c-ar').textContent = FN.usdC(ar);
    $('c-ar-d').textContent = s.dso + ' days of sales unbilled or unpaid';
    $('c-badge').textContent = s.hireOn ? s.hireN + ' hires modelled' : '13 weeks';

    var P = FN.palette();
    var series = [{ values: bals, area: true, dots: false, color: P.accent }];
    if (noHire) {
      series.unshift({
        values: noHire.map(function (r) { return r.bal; }),
        dashed: true, dots: false, width: 1.5, opacity: .6, color: P.muted
      });
    }
    chart.update(FN.line({
      height: 270, labels: rows.map(function (r) { return 'W' + r.wk; }),
      series: series, xEvery: 1, threshold: s.floor, thresholdLabel: 'safety floor',
      markers: [{ i: minIdx, v: min, text: 'trough ' + FN.usdC(min), color: min < s.floor ? P.danger : P.accent }]
    }));

    netChart.update(FN.bars({
      height: 210, showValues: false,
      items: rows.map(function (r) {
        return { label: 'W' + r.wk, value: r.net, color: r.net >= 0 ? P.accent : P.danger };
      })
    }));

    var tb = $('c-tbody');
    tb.innerHTML = rows.map(function (r) {
      return '<tr' + (r.bal < s.floor ? ' class="is-flagged"' : '') + '>' +
        '<td>Week ' + r.wk + '</td>' +
        '<td class="n">' + FN.usd(r.collections) + '</td>' +
        '<td class="n">' + (r.suppliers ? '(' + FN.usd(r.suppliers) + ')' : '—') + '</td>' +
        '<td class="n">' + (r.payroll ? '(' + FN.usd(r.payroll) + ')' : '—') + '</td>' +
        '<td class="n">(' + FN.usd(r.overhead) + ')</td>' +
        '<td class="n">' + (r.other ? '(' + FN.usd(r.other) + ')' : '—') + '</td>' +
        '<td class="n ' + (r.net >= 0 ? 'pos' : 'neg') + '">' + FN.sgn(r.net, FN.usd) + '</td>' +
        '<td class="n"><strong>' + FN.usd(r.bal) + '</strong></td>' +
      '</tr>';
    }).join('');

    /* Narrative */
    var bits = [];
    bits.push('<p>Cash bottoms out at <strong>' + FN.usdC(min) + ' in week ' + (minIdx + 1) + '</strong>' +
      (gap > 0
        ? ', which is <strong class="neg">' + FN.usdC(gap) + ' below your safety floor</strong>. That is the number to solve — not the closing balance, which looks fine and tells you nothing.'
        : ', staying above your safety floor throughout. The plan survives the quarter as modelled.') + '</p>');

    if (s.g > 0 && s.dso > 30) {
      var cashPerMonthOfGrowth = s.rev * s.g * (s.dso / 30);
      bits.push('<p>You are growing ' + (s.g * 100).toFixed(1) + '% a month while waiting ' + s.dso +
        ' days to be paid. Each month of growth locks a further <strong>' + FN.usdC(cashPerMonthOfGrowth) +
        '</strong> into receivables. Growth is consuming cash here, not producing it — the healthier the ' +
        'sales month, the tighter the bank account.</p>');
    }

    var dsoSave = s.rev * (10 / 30);
    bits.push('<p>Collecting <strong>10 days faster</strong> would release roughly <strong>' + FN.usdC(dsoSave) +
      '</strong> of one-off cash — ' + (gap > 0 ? (dsoSave >= gap
        ? 'more than enough to close the gap without borrowing anything.'
        : 'about ' + Math.round(dsoSave / gap * 100) + '% of the gap.')
        : 'permanent headroom that costs nothing to create.') +
      ' In most small businesses this is faster and cheaper than any financing conversation.</p>');

    if (s.hireOn && noHire) {
      var nhBals = noHire.map(function (r) { return r.bal; });
      var nhMin = Math.min.apply(null, nhBals);
      bits.push('<p><strong>The hiring decision:</strong> ' + s.hireN + ' hire' + (s.hireN > 1 ? 's' : '') +
        ' at ' + FN.usdC(s.hireN * s.hireCost) + '/month costs <strong>' + FN.usdC(nhMin - min) +
        '</strong> of trough cash by week 13 — the floor drops from ' + FN.usdC(nhMin) + ' to ' + FN.usdC(min) + '. ' +
        (min < s.floor && nhMin >= s.floor
          ? 'Without the hires you clear the floor; with them you do not. Either delay the start date, or line up the funding first — the decision is affordable, the timing is not.'
          : 'The P&L impact is gradual; the cash impact starts on day one and does not reverse if revenue is late.') + '</p>');
    }

    if (min < 0) {
      bits.push('<p class="neg"><strong>This plan runs out of money.</strong> Before week ' + (minIdx + 1) +
        ' you need an overdraft, a deposit from customers, or a payment date moved.</p>');
    }
    $('c-insight').innerHTML = bits.join('');

    /* ---------- What would fix it ---------- */
    var P2 = FN.palette();
    var levers = [
      {
        label: 'Collect 10 days faster',
        value: s.rev * (10 / 30),
        note: 'Chasing invoices earlier and invoicing on the day the work finishes. Costs nothing.'
      },
      {
        label: 'Take 14 more days from suppliers',
        value: s.rev * (1 - s.gm) * (14 / 30),
        note: 'A conversation with your three largest suppliers, not a financing product.'
      },
      {
        label: 'Move the one-off bill 4 weeks',
        value: s.oneoff,
        note: 'Only a timing change — the money is still owed, but not in the tightest week.'
      },
      {
        label: 'Ask for 20% deposits',
        value: s.rev * 0.2 * (s.dso / 30),
        note: 'Changes the shape of every future month, not just this quarter.'
      }
    ];
    if (s.hireOn) {
      levers.push({
        label: 'Delay hiring by 6 weeks',
        value: s.hireN * s.hireCost * 12 / 52 * 6,
        note: 'The same decision, made later, at no cost beyond the delay itself.'
      });
    }
    levers.push({
      label: 'Borrow the shortfall',
      value: gap,
      note: 'Fast, but the only option on this list you pay interest on — and it fixes nothing underneath.'
    });

    leverChart.update(FN.hbars({
      padLeft: 176, rowH: 34, target: gap > 0 ? gap : null,
      items: levers.map(function (l, i) {
        return {
          label: l.label, value: l.value,
          color: i === levers.length - 1 ? P2.warn : P2.accent
        };
      }),
      vFmt: FN.usdC
    }));

    var free = levers.slice(0, levers.length - 1);
    var covering = free.filter(function (l) { return l.value >= gap; });
    var best = free.slice().sort(function (a, b) { return b.value - a.value; })[0];
    var fix = [];

    if (gap > 0) {
      fix.push('<p>You need <strong>' + FN.usdC(gap) + '</strong> to keep cash above your floor. ' +
        (covering.length
          ? '<strong>' + covering.length + ' of these actions would cover it on their own</strong>, and ' +
            'none of them involve a lender. The largest, “' + best.label.toLowerCase() + '”, releases ' +
            FN.usdC(best.value) + '.'
          : 'No single action closes it, but ' + free.length + ' of them together release ' +
            FN.usdC(free.reduce(function (a, l) { return a + l.value; }, 0)) +
            ' — comfortably more than enough in combination.') + '</p>');
    } else {
      fix.push('<p>You have no shortfall to cover at these settings, so treat this as headroom ' +
        'rather than a rescue. “' + best.label + '” alone would release <strong>' + FN.usdC(best.value) +
        '</strong> of permanent slack — which is what makes the next hire, or a bad quarter, ' +
        'survivable without a conversation with the bank.</p>');
    }

    fix.push('<p><strong>Collecting faster is almost always the largest number on this list</strong>, ' +
      'and it is the one owners consider last. At ' + s.dso + ' days you are lending ' +
      FN.usdC(ar) + ' to your customers, interest-free, permanently. Ten days of that is ' +
      FN.usdC(s.rev * (10 / 30)) + ' back in your account, and it does not have to be repaid.</p>');

    fix.push('<p class="small muted">Borrowing is shown for comparison, not as a recommendation. ' +
      'It is the fastest option and the only one with a cost attached — and it leaves the cause ' +
      'of the shortfall exactly where it was.</p>');

    $('c-fix-insight').innerHTML = fix.join('');
  }

  ids.forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', update);
  });
  window.addEventListener('themechange', update);
  update();
})();
