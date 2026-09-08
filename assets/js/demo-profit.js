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
    revenue: 'The default almost everywhere, because it needs no extra records. It quietly assumes a client uses your team in proportion to what they pay you — which is the assumption most often wrong.',
    hours: 'Shares overhead by the time your team actually spends. This is where labour-hungry accounts stop hiding behind a large invoice.',
    effort: 'Hours plus the support load a client generates. Closest to reality where a demanding client absorbs management attention as well as delivery time.'
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
  var concMount = FN.mount($('pf-conc-chart'), function () { return document.createElement('div'); });

  /* What total company profit becomes if one client leaves, given that only part
     of the overhead they carried can actually be removed. */
  function ifClientLeft(idx, pool, avoidable) {
    var rows = compute(CLIENTS, pool);
    var before = rows.filter(function (r) { return r.name === CLIENTS[idx].name; })[0];
    var removedOh = before.oh * avoidable;
    var remaining = CLIENTS.filter(function (_, i) { return i !== idx; });
    var newOp = remaining.reduce(function (a, c) { return a + c.rev - c.dc; }, 0) - (pool - removedOh);
    return { before: before, removedOh: removedOh, newOp: newOp };
  }

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
      var sim = ifClientLeft(dropIdx, pool, avoidable);
      var diff = sim.newOp - op;
      out.innerHTML =
        '<p class="xsmall"><strong>' + CLIENTS[dropIdx].name + '</strong> currently shows ' +
        '<span class="' + (sim.before.net >= 0 ? '' : 'neg') + '">' + FN.usd(sim.before.net) + '</span> of profit ' +
        '(' + sim.before.margin.toFixed(1) + '% margin).</p>' +
        '<p class="xsmall mt-1">Losing them takes away ' + FN.usd(sim.before.gross) + ' of contribution but only ' +
        FN.usd(sim.removedOh) + ' of overhead. Total profit moves ' +
        '<strong class="' + (diff >= 0 ? 'pos' : 'neg') + '">' + FN.sgn(diff, FN.usd) + '</strong> to ' +
        FN.usd(sim.newOp) + '.</p>' +
        (diff < 0
          ? '<p class="xsmall mt-1"><strong>You would be worse off.</strong> Their share of the overhead does not leave with them — it lands on everyone else. Reprice or cut the cost of serving them before you resign the account.</p>'
          : '<p class="xsmall mt-1">This one genuinely costs you money, even after allowing for the overhead that stays behind.</p>');
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

    /* ---------- Tab 2: reading the table ---------- */
    var byRevPerHour = rows.slice().sort(function (a, b) { return b.revPerHour - a.revPerHour; });
    var topRate = byRevPerHour[0], bottomRate = byRevPerHour[byRevPerHour.length - 1];
    $('pf-table-insight').innerHTML =
      '<p>Your best account earns <strong>' + FN.usd(topRate.revPerHour) + ' an hour</strong> (' +
      topRate.name + '); your worst earns <strong>' + FN.usd(bottomRate.revPerHour) + '</strong> (' +
      bottomRate.name + '). Same team, same overhead, ' +
      (bottomRate.revPerHour ? (topRate.revPerHour / bottomRate.revPerHour).toFixed(1) + ' times' : 'a large multiple') +
      ' the return. Nothing in the sales ledger shows you this.</p>' +
      '<p>The company average is ' + FN.usd(totRev / totHrs) + ' an hour. Any account below it is ' +
      'being subsidised by the ones above — which is a decision worth making deliberately rather ' +
      'than by accident.</p>';

    /* ---------- Tab 3: concentration and the leave test ---------- */
    var P2 = FN.palette();
    var byRev = CLIENTS.slice().sort(function (a, b) { return b.rev - a.rev; });
    var top3Rev = byRev.slice(0, 3).reduce(function (a, c) { return a + c.rev; }, 0);
    concMount.update(FN.hbars({
      padLeft: 140, rowH: 28,
      items: byRev.map(function (c, i) {
        return {
          label: c.name, value: c.rev / totRev * 100,
          color: i < 3 ? P2.warn : P2.accent
        };
      }),
      vFmt: function (v) { return v.toFixed(1) + '%'; }
    }));

    $('pf-risk-tbody').innerHTML = CLIENTS.map(function (c, i) {
      var sim = ifClientLeft(i, pool, avoidable);
      var diff = sim.newOp - op;
      return '<tr' + (diff < 0 ? '' : ' class="is-flagged"') + '>' +
        '<td><strong>' + c.name + '</strong></td>' +
        '<td class="n">' + FN.usd(c.rev) + '</td>' +
        '<td class="n">' + FN.usd(sim.before.gross) + '</td>' +
        '<td class="n">' + FN.usd(sim.removedOh) + '</td>' +
        '<td class="n"><strong>' + FN.usd(sim.newOp) + '</strong></td>' +
        '<td class="n ' + (diff >= 0 ? 'pos' : 'neg') + '">' + FN.sgn(diff, FN.usd) + '</td>' +
      '</tr>';
    }).join('');

    var helpful = CLIENTS.map(function (c, i) {
      return { name: c.name, diff: ifClientLeft(i, pool, avoidable).newOp - op };
    }).filter(function (x) { return x.diff > 0; });

    $('pf-risk-insight').innerHTML =
      '<p>Your three largest clients are <strong>' + (top3Rev / totRev * 100).toFixed(0) +
      '% of revenue</strong>. Losing the biggest one would take ' +
      FN.usdC(ifClientLeft(CLIENTS.indexOf(byRev[0]), pool, avoidable).newOp - op) +
      ' off profit — and the overhead it was carrying would simply move onto everyone else.</p>' +
      (helpful.length
        ? '<p>Only <strong>' + helpful.length + ' account' + (helpful.length > 1 ? 's' : '') +
          '</strong> would leave you better off by going: ' +
          helpful.map(function (h) { return h.name; }).join(', ') +
          '. Every other loss-maker on this list is still contributing something towards overhead ' +
          'you would keep paying anyway — which is exactly why “fire the unprofitable clients” is ' +
          'usually the wrong instruction.</p>'
        : '<p>At this setting, <strong>no client is worth losing</strong>. Even the loss-makers ' +
          'contribute towards overhead you would keep paying. The answer for those accounts is a ' +
          'price increase or a smaller scope, not a resignation letter.</p>') +
      '<p class="small muted">Rows highlighted in red are the ones you would be better off without.</p>';
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
