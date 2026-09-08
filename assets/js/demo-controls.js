/* Spend controls & audit analytics. A synthetic payment population, tested in full. */
(function () {
  'use strict';
  if (!window.FN || !document.getElementById('s-chart')) return;
  var $ = function (id) { return document.getElementById(id); };

  /* d = day of April 2026, dow 0=Sun..6=Sat, hr = posting hour, age = days since vendor setup */
  var LEDGER = [
    { d: 1,  dow: 3, hr: 11, vendor: 'Meridian Supply Co',   ref: 'INV-2280', amt: 3120,  by: 'A. Okafor', ap: 'M. Devlin', age: 640 },
    { d: 2,  dow: 4, hr: 9,  vendor: 'Voss Facilities',      ref: '55118',    amt: 1840,  by: 'A. Okafor', ap: 'M. Devlin', age: 1120 },
    { d: 3,  dow: 5, hr: 14, vendor: 'Meridian Supply Co',   ref: 'INV-2291', amt: 8450,  by: 'A. Okafor', ap: 'M. Devlin', age: 640 },
    { d: 3,  dow: 5, hr: 15, vendor: 'Halden Print',         ref: 'HP-771',   amt: 620,   by: 'J. Rivas',  ap: 'M. Devlin', age: 410 },
    { d: 6,  dow: 1, hr: 10, vendor: 'Northgate Utilities',  ref: 'Q2-04',    amt: 2410,  by: 'A. Okafor', ap: 'M. Devlin', age: 2200 },
    { d: 7,  dow: 2, hr: 13, vendor: 'Voss Facilities',      ref: '55123',    amt: 2180,  by: 'J. Rivas',  ap: 'M. Devlin', age: 1120 },
    { d: 7,  dow: 2, hr: 16, vendor: 'Trellis Software',     ref: 'SUB-0417', amt: 1290,  by: 'A. Okafor', ap: 'M. Devlin', age: 880 },
    { d: 8,  dow: 3, hr: 11, vendor: 'Fairmount Freight',    ref: 'FF-9902',  amt: 6740,  by: 'A. Okafor', ap: 'M. Devlin', age: 1500 },
    { d: 9,  dow: 4, hr: 12, vendor: 'Voss Facilities',      ref: '55123-A',  amt: 2180,  by: 'J. Rivas',  ap: 'J. Rivas',  age: 1120 },
    { d: 10, dow: 5, hr: 15, vendor: 'Halden Print',         ref: 'HP-780',   amt: 940,   by: 'J. Rivas',  ap: 'M. Devlin', age: 410 },
    { d: 11, dow: 6, hr: 19, vendor: 'Meridian Supply Co',   ref: 'INV-2291', amt: 8450,  by: 'A. Okafor', ap: 'M. Devlin', age: 640 },
    { d: 13, dow: 1, hr: 9,  vendor: 'Trellis Software',     ref: 'SUB-0418', amt: 860,   by: 'A. Okafor', ap: 'M. Devlin', age: 880 },
    { d: 14, dow: 2, hr: 10, vendor: 'Arclight Consulting',  ref: 'AC-114',   amt: 4900,  by: 'J. Rivas',  ap: 'M. Devlin', age: 210 },
    { d: 15, dow: 3, hr: 11, vendor: 'Arclight Consulting',  ref: 'AC-115',   amt: 4850,  by: 'J. Rivas',  ap: 'M. Devlin', age: 210 },
    { d: 15, dow: 3, hr: 14, vendor: 'Northgate Utilities',  ref: 'Q2-05',    amt: 1980,  by: 'A. Okafor', ap: 'M. Devlin', age: 2200 },
    { d: 16, dow: 4, hr: 9,  vendor: 'Arclight Consulting',  ref: 'AC-116',   amt: 4750,  by: 'J. Rivas',  ap: 'M. Devlin', age: 210 },
    { d: 16, dow: 4, hr: 13, vendor: 'Fairmount Freight',    ref: 'FF-9931',  amt: 3260,  by: 'A. Okafor', ap: 'M. Devlin', age: 1500 },
    { d: 17, dow: 5, hr: 16, vendor: 'Larkspur Catering',    ref: 'LC-330',   amt: 780,   by: 'J. Rivas',  ap: 'M. Devlin', age: 95 },
    { d: 18, dow: 6, hr: 21, vendor: 'Torrent Logistics',    ref: 'TL-4471',  amt: 12300, by: 'J. Rivas',  ap: 'J. Rivas',  age: 340 },
    { d: 20, dow: 1, hr: 10, vendor: 'Meridian Supply Co',   ref: 'INV-2310', amt: 2760,  by: 'A. Okafor', ap: 'M. Devlin', age: 640 },
    { d: 20, dow: 1, hr: 11, vendor: 'Trellis Software',     ref: 'SUB-0419', amt: 2140,  by: 'A. Okafor', ap: 'M. Devlin', age: 880 },
    { d: 21, dow: 2, hr: 12, vendor: 'Voss Facilities',      ref: '55140',    amt: 1910,  by: 'J. Rivas',  ap: 'M. Devlin', age: 1120 },
    { d: 22, dow: 3, hr: 15, vendor: 'Pinehurst Media',      ref: 'PM-208',   amt: 4950,  by: 'J. Rivas',  ap: 'M. Devlin', age: 150 },
    { d: 23, dow: 4, hr: 9,  vendor: 'Pinehurst Media',      ref: 'PM-209',   amt: 4975,  by: 'J. Rivas',  ap: 'M. Devlin', age: 150 },
    { d: 23, dow: 4, hr: 14, vendor: 'Halden Print',         ref: 'HP-796',   amt: 1130,  by: 'J. Rivas',  ap: 'M. Devlin', age: 410 },
    { d: 24, dow: 5, hr: 10, vendor: 'Fairmount Freight',    ref: 'FF-9958',  amt: 5480,  by: 'A. Okafor', ap: 'M. Devlin', age: 1500 },
    { d: 25, dow: 6, hr: 8,  vendor: 'Cobalt Trading Ltd',   ref: 'CT-001',   amt: 18750, by: 'J. Rivas',  ap: 'M. Devlin', age: 6 },
    { d: 27, dow: 1, hr: 11, vendor: 'Northgate Utilities',  ref: 'Q2-06',    amt: 2240,  by: 'A. Okafor', ap: 'M. Devlin', age: 2200 },
    { d: 27, dow: 1, hr: 17, vendor: 'Larkspur Catering',    ref: 'LC-341',   amt: 640,   by: 'J. Rivas',  ap: 'M. Devlin', age: 95 },
    { d: 28, dow: 2, hr: 12, vendor: 'Meridian Supply Co',   ref: 'INV-2325', amt: 4180,  by: 'A. Okafor', ap: 'M. Devlin', age: 640 },
    { d: 28, dow: 2, hr: 23, vendor: 'Trellis Software',     ref: 'SUB-0421', amt: 3400,  by: 'A. Okafor', ap: 'A. Okafor', age: 880 },
    { d: 29, dow: 3, hr: 10, vendor: 'Voss Facilities',      ref: '55152',    amt: 2050,  by: 'J. Rivas',  ap: 'M. Devlin', age: 1120 },
    { d: 29, dow: 3, hr: 13, vendor: 'Fairmount Freight',    ref: 'FF-9977',  amt: 4120,  by: 'A. Okafor', ap: 'M. Devlin', age: 1500 },
    { d: 30, dow: 4, hr: 11, vendor: 'Halden Print',         ref: 'HP-808',   amt: 870,   by: 'J. Rivas',  ap: 'M. Devlin', age: 410 },
    { d: 30, dow: 4, hr: 16, vendor: 'Arclight Consulting',  ref: 'AC-121',   amt: 3900,  by: 'J. Rivas',  ap: 'M. Devlin', age: 210 },
    { d: 30, dow: 4, hr: 18, vendor: 'Cobalt Trading Ltd',   ref: 'CT-004',   amt: 9400,  by: 'J. Rivas',  ap: 'M. Devlin', age: 11 }
  ];

  var TESTS = {
    dupe:   { label: 'Duplicate payment',    short: 'Duplicates' },
    split:  { label: 'Approval splitting',   short: 'Splitting' },
    sod:    { label: 'Same person in and out', short: 'Duties' },
    hours:  { label: 'Off-hours posting',    short: 'Off-hours' },
    vendor: { label: 'New vendor, high value', short: 'New vendor' }
  };

  function enabled(t) {
    var el = document.querySelector('[data-test="' + t + '"]');
    return el && el.checked;
  }

  function analyse() {
    var limit = Math.max(1, +$('s-limit').value || 0);
    var band = +$('s-band').value / 100;
    var newDays = Math.max(0, +$('s-newv').value || 0);
    var mat = Math.max(0, +$('s-mat').value || 0);

    var findings = LEDGER.map(function () { return []; });
    var recoverable = 0;

    /* 1. Duplicates — same vendor, same amount, within 14 days */
    if (enabled('dupe')) {
      LEDGER.forEach(function (a, i) {
        LEDGER.forEach(function (b, j) {
          if (j <= i) return;
          if (a.vendor === b.vendor && Math.abs(a.amt - b.amt) < 0.01 && Math.abs(a.d - b.d) <= 14 && b.amt >= mat) {
            var exact = a.ref === b.ref;
            findings[j].push({
              test: 'dupe', value: b.amt,
              text: (exact ? 'Identical reference and amount to ' : 'Same amount and vendor as ') +
                    a.ref + ' on Apr ' + a.d
            });
            recoverable += b.amt;
          }
        });
      });
    }

    /* 2. Approval-limit splitting — clustered invoices just under the limit */
    if (enabled('split')) {
      var byVendor = {};
      LEDGER.forEach(function (r, i) { (byVendor[r.vendor] = byVendor[r.vendor] || []).push(i); });
      Object.keys(byVendor).forEach(function (v) {
        var idx = byVendor[v].filter(function (i) {
          return LEDGER[i].amt <= limit && LEDGER[i].amt >= limit * (1 - band);
        });
        if (idx.length < 2) return;
        idx.sort(function (a, b) { return LEDGER[a].d - LEDGER[b].d; });
        var cluster = idx.filter(function (i) {
          return idx.some(function (j) { return j !== i && Math.abs(LEDGER[i].d - LEDGER[j].d) <= 5; });
        });
        if (cluster.length < 2) return;
        var total = cluster.reduce(function (a, i) { return a + LEDGER[i].amt; }, 0);
        cluster.forEach(function (i) {
          if (LEDGER[i].amt < mat) return;
          findings[i].push({
            test: 'split', value: LEDGER[i].amt,
            text: cluster.length + ' invoices totalling ' + FN.usd(total) + ' within 5 days, each ' +
                  'just under the ' + FN.usd(limit) + ' limit'
          });
        });
      });
    }

    /* 3. Segregation of duties */
    if (enabled('sod')) {
      LEDGER.forEach(function (r, i) {
        if (r.by === r.ap && r.amt >= mat) {
          findings[i].push({ test: 'sod', value: r.amt, text: r.by + ' both entered and approved this payment' });
        }
      });
    }

    /* 4. Off-hours postings */
    if (enabled('hours')) {
      LEDGER.forEach(function (r, i) {
        var weekend = r.dow === 0 || r.dow === 6;
        var late = r.hr < 7 || r.hr >= 19;
        if ((weekend || late) && r.amt >= mat) {
          findings[i].push({
            test: 'hours', value: r.amt,
            text: (weekend ? 'Posted at the weekend' : 'Posted at ' + String(r.hr).padStart(2, '0') + ':00') +
                  (weekend && late ? ', after hours' : '')
          });
        }
      });
    }

    /* 5. New vendor, high value */
    if (enabled('vendor')) {
      LEDGER.forEach(function (r, i) {
        if (r.age <= newDays && r.amt >= Math.max(mat, limit)) {
          findings[i].push({
            test: 'vendor', value: r.amt,
            text: 'Vendor created ' + r.age + ' days before payment, above the approval limit'
          });
        }
      });
    }

    return { findings: findings, recoverable: recoverable, limit: limit };
  }

  var chart = FN.mount($('s-chart'), function () { return document.createElement('div'); });
  var view = 'flagged';

  function update() {
    $('s-band-val').textContent = $('s-band').value + '%';
    var res = analyse();
    var findings = res.findings;
    var flaggedIdx = [];
    findings.forEach(function (f, i) { if (f.length) flaggedIdx.push(i); });

    var totalSpend = LEDGER.reduce(function (a, r) { return a + r.amt; }, 0);
    var atRisk = flaggedIdx.reduce(function (a, i) { return a + LEDGER[i].amt; }, 0);
    var counts = {};
    Object.keys(TESTS).forEach(function (t) { counts[t] = 0; });
    findings.forEach(function (f) { f.forEach(function (x) { counts[x.test]++; }); });
    var bypassed = LEDGER.filter(function (r) { return r.amt > res.limit && r.by === r.ap; }).length;

    $('s-n').textContent = LEDGER.length;
    $('s-nv').textContent = FN.usdC(totalSpend) + ' of spend';
    $('s-ex').textContent = flaggedIdx.length;
    $('s-ex').className = 'kpi__val ' + (flaggedIdx.length ? 'neg' : 'pos');
    $('s-exr').textContent = (flaggedIdx.length / LEDGER.length * 100).toFixed(0) + '% of payments';
    $('s-var').textContent = FN.usdC(atRisk);
    $('s-varp').textContent = (atRisk / totalSpend * 100).toFixed(0) + '% of the month';
    $('s-rec').textContent = FN.usdC(res.recoverable);
    $('s-rec').className = 'kpi__val ' + (res.recoverable ? 'neg' : 'pos');
    $('s-byp').textContent = bypassed;
    $('s-byp').className = 'kpi__val ' + (bypassed ? 'neg' : 'pos');

    var P = FN.palette();
    chart.update(FN.bars({
      height: 210, yFmt: function (v) { return String(Math.round(v)); },
      vFmt: function (v) { return String(Math.round(v)); },
      items: Object.keys(TESTS).map(function (t) {
        return {
          label: TESTS[t].short, value: counts[t], dim: !enabled(t),
          color: counts[t] ? (t === 'dupe' ? P.danger : P.warn) : P.line,
          sub: enabled(t) ? null : 'off'
        };
      })
    }));

    var show = view === 'all' ? LEDGER.map(function (_, i) { return i; }) : flaggedIdx;
    $('s-tbody').innerHTML = show.map(function (i) {
      var r = LEDGER[i], f = findings[i];
      return '<tr' + (f.length ? ' class="is-flagged"' : '') + '>' +
        '<td>Apr ' + r.d + '</td>' +
        '<td><strong>' + r.vendor + '</strong><br><span class="xsmall muted">' + r.ref + '</span></td>' +
        '<td class="n">' + FN.usd(r.amt) + '</td>' +
        '<td class="xsmall">' + r.by + '<br>' +
          '<span' + (r.by === r.ap ? ' class="flag"' : ' class="muted"') + '>' + r.ap + '</span></td>' +
        '<td class="wrap-cell">' +
          (f.length
            ? f.map(function (x) {
                return '<div class="finding"><span class="badge badge--danger">' + TESTS[x.test].short +
                       '</span> <span class="xsmall muted">' + x.text + '</span></div>';
              }).join('')
            : '<span class="xsmall muted">—</span>') +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="muted">No exceptions at these parameters.</td></tr>';

    /* Narrative */
    var bits = [];
    bits.push('<p><strong>' + flaggedIdx.length + ' of ' + LEDGER.length + ' payments</strong> raised an exception, ' +
      'covering <strong>' + FN.usdC(atRisk) + '</strong> — ' + (atRisk / totalSpend * 100).toFixed(0) +
      '% of the month’s spend. An exception is not a finding of fraud; it is a transaction that the ' +
      'control environment should have questioned and did not.</p>');

    if (res.recoverable > 0) {
      bits.push('<p>The duplicate test alone identifies <strong class="neg">' + FN.usdC(res.recoverable) +
        '</strong> of payments made twice. That is cash out the door for goods received once — recoverable ' +
        'with a phone call, and worth roughly ' + FN.usdC(res.recoverable * 12) + ' a year if the pattern holds.</p>');
    }
    if (counts.split > 0) {
      bits.push('<p>Invoices are clustering immediately below the ' + FN.usd(res.limit) + ' approval limit. ' +
        'Whether that is a supplier billing habit or deliberate structuring, the effect is the same: work that ' +
        'should have required a second signature did not get one. Approving <em>by vendor per week</em> rather than ' +
        '<em>by invoice</em> closes this without adding admin.</p>');
    }
    if (counts.sod > 0) {
      bits.push('<p>' + counts.sod + ' payment' + (counts.sod > 1 ? 's were' : ' was') +
        ' entered and approved by the same person. In a small finance team this is often unavoidable — ' +
        'the answer is a compensating control (an owner review of the payment run, or a bank dual-authorisation ' +
        'above a threshold), not a bigger team.</p>');
    }
    if (counts.vendor > 0) {
      bits.push('<p>A vendor created days before a five-figure payment is the single highest-risk pattern in ' +
        'accounts payable, and the one most commonly exploited. It warrants a documented check of the bank ' +
        'details against the supplier’s own records — by phone, not by replying to the email.</p>');
    }
    if (!flaggedIdx.length) {
      bits.push('<p>Nothing flagged at these thresholds. Worth loosening the parameters before concluding the ' +
        'population is clean — a test that never fires is not evidence of control.</p>');
    }
    $('s-insight').innerHTML = bits.join('');
  }

  document.querySelectorAll('[data-test]').forEach(function (el) { el.addEventListener('change', update); });
  ['s-limit', 's-band', 's-newv', 's-mat'].forEach(function (id) { $(id).addEventListener('input', update); });
  $('s-view').addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]');
    if (!b) return;
    view = b.getAttribute('data-view');
    $('s-view').querySelectorAll('[data-view]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    update();
  });
  window.addEventListener('themechange', update);
  update();
})();
