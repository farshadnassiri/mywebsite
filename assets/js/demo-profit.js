/* Client profitability & overhead allocation. Synthetic portfolio, real allocation maths. */
(function () {
  'use strict';
  if (!window.FN || !document.getElementById('pf-bars')) return;
  var $ = function (id) { return document.getElementById(id); };

  /* name, monthly revenue, direct cost, delivery hours, support tickets */
  var CLIENTS = [
    { name: 'Northwind Retail',   rev: 38000, dc: 21000, hrs: 210, tix: 42 },
    { name: 'Kestrel Logistics',  rev: 26500, dc: 13800, hrs: 96,  tix: 8 },
    { name: 'Alder & Co',         rev: 19200, dc: 9600,  hrs: 74,  tix: 11 },
    { name: 'Brightpath Clinics', rev: 15400, dc: 10900, hrs: 168, tix: 63 },
    { name: 'Ostara Foods',       rev: 12800, dc: 6100,  hrs: 52,  tix: 6 },
    { name: 'Halcyon Studio',     rev: 9600,  dc: 5900,  hrs: 88,  tix: 27 },
    { name: 'Vertex Build',       rev: 8900,  dc: 4200,  hrs: 36,  tix: 4 },
    { name: 'Marlowe Legal',      rev: 7400,  dc: 3500,  hrs: 30,  tix: 5 },
    { name: 'Copperline Tools',   rev: 6200,  dc: 4800,  hrs: 71,  tix: 22 },
    { name: 'Sable Interiors',    rev: 4100,  dc: 2900,  hrs: 44,  tix: 19 }
  ];

  var BASIS_NOTES = {
    revenue: 'The default almost everywhere, because it needs no data. It quietly assumes big accounts consume support in proportion to what they pay — which is the assumption most often wrong.',
    hours: 'Allocates by the time your team actually spends. This is where labour-intensive accounts stop hiding behind their invoice size.',
    effort: 'A blend of delivery hours and support load. Closest to reality for service businesses where a demanding client absorbs management attention as well as delivery time.'
  };

  var basis = 'revenue';
  var sel = $('pf-drop');
  CLIENTS.forEach(function (c, i) {
    var o = document.createElement('option');
    o.value = String(i); o.textContent = c.name;
    sel.appendChild(o);
  });

  function weightOf(c, b) {
    if (b === 'revenue') return c.rev;
    if (b === 'hours') return c.hrs;
    return c.hrs * 0.6 + c.tix * 6;    /* effort: hours plus a ticket-load proxy */
  }

  function compute(list, pool, b) {
    b = b || basis;
    var totalW = list.reduce(function (a, c) { return a + weightOf(c, b); }, 0) || 1;
    return list.map(function (c) {
      var oh = pool * (weightOf(c, b) / totalW);
      var gross = c.rev - c.dc;
      var net = gross - oh;
      return {
        name: c.name, rev: c.rev, dc: c.dc, hrs: c.hrs, gross: gross, oh: oh, net: net,
        margin: c.rev ? (net / c.rev) * 100 : 0,
        revPerHour: c.hrs ? c.rev / c.hrs : 0
      };
    });
  }

  var barsMount = FN.mount($('pf-bars'), function () { return document.createElement('div'); });

  function update() {
    var pool = Math.max(0, +$('pf-oh').value || 0);
    var target = +$('pf-tm').value;
    var avoidable = +$('pf-av').value / 100;
    $('pf-tm-val').textContent = target + '%';
    $('pf-av-val').textContent = (avoidable * 100).toFixed(0) + '%';
    $('pf-basis-note').textContent = BASIS_NOTES[basis];
    $('pf-basis-badge').textContent = 'by ' + (basis === 'effort' ? 'service effort' : basis === 'hours' ? 'labour hours' : 'revenue');

    var rows = compute(CLIENTS, pool).sort(function (a, b) { return b.net - a.net; });
    var totRev = rows.reduce(function (a, r) { return a + r.rev; }, 0);
    var totDc = rows.reduce(function (a, r) { return a + r.dc; }, 0);
    var totHrs = rows.reduce(function (a, r) { return a + r.hrs; }, 0);
    var op = totRev - totDc - pool;
    var belowTarget = rows.filter(function (r) { return r.margin < target; });
    var lossMakers = rows.filter(function (r) { return r.net < 0; });
    var leakage = belowTarget.reduce(function (a, r) { return a + (r.rev * target / 100 - r.net); }, 0);
    var top3 = rows.slice(0, 3).reduce(function (a, r) { return a + r.net; }, 0);

    $('pf-op').textContent = FN.usdC(op);
    $('pf-op-d').textContent = FN.usdC(op * 12) + ' annualised';
    $('pf-nm').textContent = (op / totRev * 100).toFixed(1) + '%';
    $('pf-nm-d').textContent = 'on ' + FN.usdC(totRev) + ' of revenue';
    $('pf-bt').textContent = belowTarget.length + ' of ' + rows.length;
    $('pf-bt-d').textContent = FN.usdC(belowTarget.reduce(function (a, r) { return a + r.rev; }, 0)) +
      ' of revenue (' + (belowTarget.reduce(function (a, r) { return a + r.rev; }, 0) / totRev * 100).toFixed(0) + '%)';
    $('pf-leak').textContent = FN.usdC(Math.max(0, leakage));
    $('pf-loss').textContent = lossMakers.length;
    $('pf-loss').className = 'kpi__val ' + (lossMakers.length ? 'neg' : 'pos');
    $('pf-loss-d').textContent = lossMakers.length
      ? FN.usdC(-lossMakers.reduce(function (a, r) { return a + r.net; }, 0)) + ' of losses absorbed'
      : 'every account covers its overhead';
    $('pf-conc').textContent = op > 0 ? (top3 / op * 100).toFixed(0) + '%' : '—';

    var P = FN.palette();
    barsMount.update(FN.hbars({
      padLeft: 140, rowH: 33,
      items: rows.map(function (r) {
        return {
          label: r.name, value: r.net,
          color: r.net < 0 ? P.danger : (r.margin < target ? P.warn : P.accent)
        };
      }),
      vFmt: FN.usdC
    }));

    $('pf-tbody').innerHTML = rows.map(function (r) {
      return '<tr' + (r.net < 0 ? ' class="is-flagged"' : '') + '>' +
        '<td><strong>' + r.name + '</strong></td>' +
        '<td class="n">' + FN.usd(r.rev) + '</td>' +
        '<td class="n">' + FN.usd(r.dc) + '</td>' +
        '<td class="n">' + FN.num(r.hrs) + '</td>' +
        '<td class="n">' + FN.usd(r.oh) + '</td>' +
        '<td class="n ' + (r.net >= 0 ? '' : 'neg') + '"><strong>' + FN.usd(r.net) + '</strong></td>' +
        '<td class="n ' + (r.margin < 0 ? 'neg' : r.margin < target ? '' : 'pos') + '">' + r.margin.toFixed(1) + '%</td>' +
        '<td class="n">' + FN.usd(r.revPerHour, 0) + '</td>' +
      '</tr>';
    }).join('');
    $('pf-tfoot').innerHTML = '<tr><td><strong>Total</strong></td>' +
      '<td class="n"><strong>' + FN.usd(totRev) + '</strong></td>' +
      '<td class="n">' + FN.usd(totDc) + '</td>' +
      '<td class="n">' + FN.num(totHrs) + '</td>' +
      '<td class="n">' + FN.usd(pool) + '</td>' +
      '<td class="n"><strong>' + FN.usd(op) + '</strong></td>' +
      '<td class="n">' + (op / totRev * 100).toFixed(1) + '%</td>' +
      '<td class="n">' + FN.usd(totRev / totHrs, 0) + '</td></tr>';

    /* Drop-a-client simulation */
    var dropIdx = sel.value === '' ? -1 : +sel.value;
    var out = $('pf-drop-out');
    if (dropIdx >= 0) {
      var dropped = CLIENTS[dropIdx];
      var before = compute(CLIENTS, pool).filter(function (r) { return r.name === dropped.name; })[0];
      var removedOh = before.oh * avoidable;
      var remaining = CLIENTS.filter(function (_, i) { return i !== dropIdx; });
      var newPool = pool - removedOh;
      var newOp = remaining.reduce(function (a, c) { return a + c.rev - c.dc; }, 0) - newPool;
      var diff = newOp - op;
      out.innerHTML =
        '<p class="xsmall"><strong>' + dropped.name + '</strong> currently shows ' +
        '<span class="' + (before.net >= 0 ? '' : 'neg') + '">' + FN.usd(before.net) + '</span> of net profit ' +
        '(' + before.margin.toFixed(1) + '% margin).</p>' +
        '<p class="xsmall mt-1">Losing them removes ' + FN.usd(before.gross) + ' of contribution and only ' +
        FN.usd(removedOh) + ' of overhead. Company profit goes ' +
        '<strong class="' + (diff >= 0 ? 'pos' : 'neg') + '">' + FN.sgn(diff, FN.usd) + '</strong> to ' +
        FN.usd(newOp) + '.</p>' +
        (diff < 0
          ? '<p class="xsmall mt-1"><strong>You would be worse off.</strong> Their allocated overhead does not leave with them — it lands on everyone else. Reprice or reduce cost to serve before you resign an account.</p>'
          : '<p class="xsmall mt-1">This one genuinely destroys value, even after allowing for overhead that stays behind.</p>');
    } else {
      out.innerHTML = '<p class="xsmall muted mt-0">Pick a client to see what losing them actually does to total profit.</p>';
    }

    /* Narrative */
    var worst = rows[rows.length - 1];
    var best = rows[0];
    var bits = [];
    bits.push('<p><strong>' + best.name + '</strong> contributes ' + FN.usd(best.net) + ' a month at a ' +
      best.margin.toFixed(1) + '% margin, while <strong>' + worst.name + '</strong> returns ' +
      FN.usd(worst.net) + ' — on ' + FN.usdC(worst.rev) + ' of revenue that looks perfectly respectable on an invoice.</p>');

    if (basis !== 'revenue') {
      var order = rows.map(function (x) { return x.name; });
      var revSorted = compute(CLIENTS, pool, 'revenue').sort(function (a, b) { return b.net - a.net; });
      var moved = revSorted.filter(function (r, i) {
        return Math.abs(i - order.indexOf(r.name)) >= 2;
      });
      if (moved.length) {
        bits.push('<p>Switching the allocation basis moves <strong>' + moved.length + ' account' +
          (moved.length > 1 ? 's' : '') + '</strong> by two or more places in the ranking. Nothing about the ' +
          'business changed — only the honesty of the cost allocation. This is why the basis has to be agreed ' +
          'before anyone acts on the numbers.</p>');
      }
    }

    if (lossMakers.length) {
      bits.push('<p><strong>' + lossMakers.length + ' account' + (lossMakers.length > 1 ? 's are' : ' is') +
        ' loss-making</strong>, absorbing ' + FN.usdC(-lossMakers.reduce(function (a, r) { return a + r.net; }, 0)) +
        ' a month — ' + (op > 0 ? Math.round(-lossMakers.reduce(function (a, r) { return a + r.net; }, 0) / op * 100) + '% of total operating profit' : 'more than the business earns') +
        '. The fix is rarely termination: it is a price increase, a scope reduction, or a change in how the work is delivered.</p>');
    }

    bits.push('<p>Closing the gap to a ' + target + '% target on the underperforming accounts alone is worth ' +
      '<strong>' + FN.usdC(Math.max(0, leakage)) + ' a month</strong> — ' + FN.usdC(Math.max(0, leakage) * 12) +
      ' a year, from clients you already have and are already serving.</p>');

    $('pf-insight').innerHTML = bits.join('');
  }

  $('pf-basis').addEventListener('click', function (e) {
    var b = e.target.closest('[data-basis]');
    if (!b) return;
    basis = b.getAttribute('data-basis');
    $('pf-basis').querySelectorAll('[data-basis]').forEach(function (x) {
      x.setAttribute('aria-pressed', String(x === b));
    });
    update();
  });
  ['pf-oh', 'pf-tm', 'pf-av'].forEach(function (id) { $(id).addEventListener('input', update); });
  sel.addEventListener('change', update);
  window.addEventListener('themechange', update);
  update();
})();
