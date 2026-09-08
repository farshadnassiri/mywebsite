/* Homepage question selector: each question renders the figure, the numbers and
   the conclusion a review produces for it. Constructed example business. */
(function () {
  'use strict';
  if (!window.FN || !document.getElementById('qpicker')) return;
  var $ = function (id) { return document.getElementById(id); };

  /* ---- The example business, used consistently across every answer ---- */
  var REV = 148100, DELIVERY = 82700, TEAM = 30000, OVERHEAD = 16000;
  var PROFIT = REV - DELIVERY - TEAM - OVERHEAD;          /* 19,400 */

  var CLIENTS = [
    ['Northwind Retail', 5197], ['Kestrel Logistics', 4469], ['Alder & Co', 3636],
    ['Ostara Foods', 2724], ['Vertex Build', 1936], ['Marlowe Legal', 1602],
    ['Halcyon Studio', 718], ['Sable Interiors', -73], ['Brightpath Clinics', -283],
    ['Copperline Tools', -526]
  ];

  var WEEKS = ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12','W13'];
  var CASH = [113538,124614,118152,129228,122766,98842,92380,103456,96994,108070,101608,112684,106222];
  var CASH_HIRE = [113538,124614,110767,117459,106612,78304,67457,74148,63302,69993,59146,65838,54991];
  var FLOOR = 75000;

  var CHECKS = [
    { label: 'Paid twice', value: 5 }, { label: 'Split', value: 5 },
    { label: 'One person', value: 3 }, { label: 'Odd hours', value: 4 },
    { label: 'New supplier', value: 2 }
  ];

  var QUESTIONS = [
    {
      id: 'money',
      example: 'demos/profitability.html', service: 'services.html#costing-pricing',
      short: 'Where is my money actually going?',
      title: 'Cost structure',
      q: 'Where is my money actually going?',
      kpis: [
        { l: 'Revenue', v: FN.usdC(REV), d: 'per month' },
        { l: 'Kept as profit', v: (PROFIT / REV * 100).toFixed(1) + '%', d: FN.usdC(PROFIT) + ' a month' },
        { l: 'Largest cost', v: (DELIVERY / REV * 100).toFixed(0) + '%', d: 'delivering the work' }
      ],
      caption: 'Every dollar of revenue, followed to what is left at the bottom.',
      chart: function () {
        return FN.waterfall({
          height: 250,
          items: [
            { label: 'Revenue', value: REV, total: true },
            { label: 'Delivery cost', value: -DELIVERY },
            { label: 'Team & admin', value: -TEAM },
            { label: 'Overheads', value: -OVERHEAD },
            { label: 'Profit', value: PROFIT, total: true }
          ]
        });
      },
      take: 'For every <strong>$100 you invoice</strong>, $56 goes straight back out on delivering ' +
            'the work, $20 on the team and admin behind it, and $11 on overheads. <strong>$13 stays.</strong> ' +
            'The $56 is the number worth arguing about — it moves with every single job you accept, ' +
            'so a two-point improvement there is worth more than any saving on the other two combined.',
      get: 'In a review you get this for <b>your</b> business, with every cost traced to where it ' +
           'actually arises — including the ones currently buried in “general expenses”.'
    },
    {
      id: 'profit',
      example: 'demos/profitability.html', service: 'services.html#costing-pricing',
      short: 'Am I actually profitable?',
      title: 'Client profitability',
      q: 'Am I actually profitable — and on which work?',
      kpis: [
        { l: 'Loss-making clients', v: '3 of 10', d: 'once overhead is shared out', neg: true },
        { l: 'Losses absorbed', v: FN.usdC(882), d: 'every month' },
        { l: 'Profit from top 3', v: '68%', d: 'concentration risk' }
      ],
      caption: 'Monthly profit per client after every cost, including a fair share of overhead.',
      chart: function () {
        var P = FN.palette();
        return FN.hbars({
          padLeft: 132, rowH: 26,
          items: CLIENTS.map(function (c) {
            return { label: c[0], value: c[1], color: c[1] < 0 ? P.danger : (c[1] < 1500 ? P.warn : P.accent) };
          }),
          vFmt: FN.usdC
        });
      },
      take: 'The business makes money overall, so nothing looks wrong from the outside. ' +
            'Underneath, <strong>three accounts lose money every month</strong> and the smallest ' +
            'four together contribute less than the largest one alone. Almost none of this is a ' +
            'reason to resign a client — it is a reason to reprice, reduce what is included, or ' +
            'change how the work gets delivered.',
      get: 'In a review you get your own client list ranked this way, with the overhead share ' +
           'explained so <b>your team accepts the numbers</b> rather than arguing with them.'
    },
    {
      id: 'price',
      example: 'demos/pricing-simulator.html', service: 'services.html#costing-pricing',
      short: 'Are we charging enough?',
      title: 'Pricing',
      q: 'Are we charging enough?',
      kpis: [
        { l: 'Your price', v: '$125', d: 'average per unit' },
        { l: 'What it costs', v: '$114', d: 'including overhead' },
        { l: 'For a 20% margin', v: '$143', d: '+14% on today' }
      ],
      caption: 'Today’s price against what the work costs, and the price a 20% margin requires.',
      chart: function () {
        var P = FN.palette();
        return FN.bars({
          height: 230, maxBar: 76,
          yFmt: function (v) { return '$' + Math.round(v); },
          vFmt: function (v) { return '$' + v.toFixed(0); },
          items: [
            { label: 'Direct cost', value: 74, color: P.muted, sub: 'per unit' },
            { label: 'Full cost', value: 114, color: P.warn, sub: 'with overhead' },
            { label: 'Your price', value: 125, color: P.accent, sub: 'today' },
            { label: 'Target price', value: 143, color: P.series[2], sub: '20% margin' }
          ]
        });
      },
      take: 'The gap between the $74 everyone can see and the <strong>$114 the work really costs</strong> ' +
            'is where small businesses lose money without noticing. At $125 you are earning an 8.8% ' +
            'margin. A <strong>10% price rise adds about $15,000 a month</strong> — and you could ' +
            'afford to lose up to <strong>19.7% of your volume</strong> before it stopped being worth ' +
            'doing. Most owners assume that number is around 5%.',
      get: 'In a review you get your true cost per unit, job or client, and the price each one ' +
           'needs to hit <b>the margin you decide on</b> — plus what happens if customers push back.'
    },
    {
      id: 'cash',
      example: 'demos/cash-runway.html', service: 'services.html#fpa',
      short: 'Will we run out of cash?',
      title: 'Cash forecast',
      q: 'Will we run out of cash?',
      kpis: [
        { l: 'Lowest point', v: FN.usdC(92380), d: 'in week 7' },
        { l: 'Below your floor', v: 'No', d: 'clears it all quarter', pos: true },
        { l: 'Tied up in invoices', v: FN.usdC(225000), d: '45 days of sales' }
      ],
      caption: 'Thirteen weeks of cash, week by week, against the balance you would not go below.',
      chart: function () {
        var P = FN.palette();
        return FN.line({
          height: 240, labels: WEEKS, xEvery: 1,
          series: [{ values: CASH, area: true, dots: false, color: P.accent }],
          threshold: FLOOR, thresholdLabel: 'your floor',
          markers: [{ i: 6, v: 92380, text: 'low point', color: P.accent }]
        });
      },
      take: 'The monthly view says this business is comfortable. The weekly view shows the real ' +
            'shape: a <strong>quarterly payment in week 6</strong> lands next to a payroll week and ' +
            'takes $35,000 out at once, dropping cash to its lowest point of the quarter. It survives ' +
            '— but the closing balance would never have told you that week 7 was the tight one. ' +
            '<strong>$225,000 is sitting in unpaid invoices</strong>; collecting ten days faster ' +
            'would release about $50,000 that costs nothing to raise.',
      get: 'In a review you get your own weekly picture from your invoices and payment terms, ' +
           'with <b>the exact weeks that get tight</b> and what to move to fix them.'
    },
    {
      id: 'hire',
      example: 'demos/cash-runway.html#hiring', service: 'services.html#fpa',
      short: 'Can we afford to hire?',
      title: 'Hiring decision',
      q: 'Can we afford to hire?',
      kpis: [
        { l: 'Two hires cost', v: FN.usdC(19000), d: 'per month, fully loaded' },
        { l: 'New low point', v: FN.usdC(54991), d: 'was ' + FN.usdC(92380), neg: true },
        { l: 'Below your floor', v: '7 weeks', d: 'from week 7 onward', neg: true }
      ],
      caption: 'The same thirteen weeks, with and without two hires starting in week 3.',
      chart: function () {
        var P = FN.palette();
        return FN.line({
          height: 240, labels: WEEKS, xEvery: 1,
          series: [
            { values: CASH, dashed: true, dots: false, width: 1.6, opacity: .6, color: P.muted },
            { values: CASH_HIRE, area: true, dots: false, color: P.danger }
          ],
          threshold: FLOOR, thresholdLabel: 'your floor',
          markers: [{ i: 12, v: 54991, text: FN.usdC(54991), color: P.danger }]
        });
      },
      take: 'On the profit and loss account these two hires look affordable — they are covered by ' +
            'the monthly margin. On cash they are not: the low point falls from $92,400 to ' +
            '<strong>$55,000, about $20,000 under the floor</strong>, and stays under it for seven ' +
            'straight weeks. The decision is not wrong; <strong>the start date is.</strong> Moving ' +
            'it back six weeks, or collecting faster first, makes the same hires safe.',
      get: 'In a review you get this tested on your own numbers before you make an offer — ' +
           '<b>an affordable answer and a defensible start date</b>, not a gut call.'
    },
    {
      id: 'leak',
      example: 'demos/spend-controls.html', service: 'services.html#controls',
      short: 'Could money be going out unnoticed?',
      title: 'Payments',
      q: 'Could money be going out without anyone checking?',
      kpis: [
        { l: 'Payments checked', v: '36 of 36', d: 'one month, all of them' },
        { l: 'Raised a question', v: '11', d: '31% of payments', neg: true },
        { l: 'Recovered', v: FN.usdC(10600), d: 'paid twice', pos: true }
      ],
      caption: 'Five checks run across every payment in the month, and what each one found.',
      chart: function () {
        var P = FN.palette();
        return FN.bars({
          height: 230, maxBar: 64,
          yFmt: function (v) { return String(Math.round(v)); },
          vFmt: function (v) { return String(Math.round(v)); },
          items: CHECKS.map(function (c, i) {
            return { label: c.label, value: c.value, color: i === 0 ? P.danger : P.warn };
          })
        });
      },
      take: 'Nobody here is dishonest. The business simply grew and the habits did not. ' +
            '<strong>$10,600 was paid out twice</strong> for goods received once — a refund, not an ' +
            'accounting adjustment. Five invoices arrived just under the $5,000 approval limit within ' +
            'a few days of each other, so work needing a second signature never got one. ' +
            'And three payments were entered and approved by the same person, which in a small team ' +
            'is normal — it just needs something alongside it.',
      get: 'In a review every payment in the period is checked, not a sample of twenty — with ' +
           '<b>a figure against each finding</b> and the smallest change that stops it recurring.'
    }
  ];

  /* ---- Build the picker ---- */
  var picker = $('qpicker');
  picker.innerHTML = QUESTIONS.map(function (q, i) {
    return '<button type="button" data-q="' + q.id + '" aria-pressed="' + (i === 0) + '">' +
      '<span class="qpicker__mark">' + (i + 1) + '</span><span>' + q.short + '</span></button>';
  }).join('');

  var chart = FN.mount($('ans-chart'), function () { return document.createElement('div'); });
  var current = QUESTIONS[0];

  function render(q) {
    current = q;
    $('ans-title').textContent = q.title;
    $('ans-q').textContent = q.q;
    $('ans-caption').textContent = q.caption;
    $('ans-take').innerHTML = q.take;
    $('ans-get').innerHTML = q.get;
    $('ans-kpis').innerHTML = q.kpis.map(function (k) {
      return '<div class="kpi"><div class="kpi__label">' + k.l + '</div>' +
        '<div class="kpi__val ' + (k.neg ? 'neg' : k.pos ? 'pos' : '') + '">' + k.v + '</div>' +
        '<div class="kpi__delta">' + k.d + '</div></div>';
    }).join('');
    chart.update(q.chart());
    $('ans-example').href = q.example;
    $('ans-service').href = q.service;
  }

  picker.addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]');
    if (!b) return;
    var q = QUESTIONS.filter(function (x) { return x.id === b.getAttribute('data-q'); })[0];
    picker.querySelectorAll('[data-q]').forEach(function (x) {
      x.setAttribute('aria-pressed', String(x === b));
    });
    render(q);
  });

  window.addEventListener('themechange', function () { render(current); });
  render(current);
})();
