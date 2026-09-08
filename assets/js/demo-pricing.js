/* Pricing & margin simulator. All arithmetic runs in the browser. */
(function () {
  'use strict';
  if (!window.FN || !document.getElementById('p-curve')) return;

  var $ = function (id) { return document.getElementById(id); };
  var inputs = ['p-price', 'p-vol', 'p-vc', 'p-fc', 'p-dp', 'p-el'].map($);

  function read() {
    return {
      P: Math.max(0.01, +$('p-price').value || 0),
      Q: Math.max(1, +$('p-vol').value || 0),
      VC: Math.max(0, +$('p-vc').value || 0),
      F: Math.max(0, +$('p-fc').value || 0),
      dp: +$('p-dp').value / 100,
      el: +$('p-el').value
    };
  }

  /* Constant-sensitivity volume response: a 1% price rise costs `el`% of volume. */
  function model(s, dp) {
    var P1 = s.P * (1 + dp);
    var Q1 = Math.max(0, s.Q * (1 - s.el * dp));
    var rev = P1 * Q1;
    var cm = P1 - s.VC;                    /* contribution per unit */
    var gp = cm * Q1;
    var op = gp - s.F;
    return {
      P: P1, Q: Q1, rev: rev, cm: cm, gp: gp, op: op,
      gmPct: rev ? (gp / rev) * 100 : 0,
      be: cm > 0 ? s.F / cm : Infinity
    };
  }

  var curveMount = FN.mount($('p-curve'), function () { return document.createElement('div'); });
  var wfMount = FN.mount($('p-waterfall'), function () { return document.createElement('div'); });
  var levMount = FN.mount($('p-levers'), function () { return document.createElement('div'); });

  function delta(now, was, fmt) {
    var d = now - was;
    var cls = d > 0 ? 'pos' : (d < 0 ? 'neg' : 'muted');
    var pct = was !== 0 ? ' (' + FN.sgn(((d / Math.abs(was)) * 100), function (v) { return v.toFixed(0) + '%'; }) + ')' : '';
    return '<span class="' + cls + '">' + FN.sgn(d, fmt) + pct + '</span>';
  }

  function update() {
    var s = read();
    var base = model(s, 0);
    var now = model(s, s.dp);

    $('p-dp-val').textContent = FN.sgn(s.dp * 100, function (v) { return v.toFixed(0) + '%'; });
    $('p-el-val').textContent = s.el.toFixed(1);
    $('p-el-note').textContent = s.el === 0
      ? 'Nobody leaves — price is not why they buy from you.'
      : s.el < 0.7 ? 'Low: customers stay. You are hard to replace.'
      : s.el <= 1.5 ? 'Moderate: a 1% rise loses about ' + s.el.toFixed(1) + '% of your volume.'
      : 'High: customers shop around and will move on price.';

    $('p-rev').textContent = FN.usdC(now.rev);
    $('p-rev-d').innerHTML = delta(now.rev, base.rev, FN.usdC);
    $('p-gm').textContent = now.gmPct.toFixed(1) + '%';
    $('p-gm-d').innerHTML = delta(now.gmPct, base.gmPct, function (v) { return v.toFixed(1) + 'pp'; });
    $('p-op').textContent = FN.usdC(now.op);
    $('p-op-d').innerHTML = delta(now.op, base.op, FN.usdC);
    $('p-units').textContent = FN.num(Math.round(now.Q));
    $('p-units-d').innerHTML = delta(Math.round(now.Q), s.Q, function (v) { return FN.num(v); });
    $('p-be').textContent = isFinite(now.be) ? FN.num(Math.ceil(now.be)) : 'never';
    $('p-be-d').innerHTML = isFinite(now.be) && isFinite(base.be)
      ? delta(Math.ceil(now.be), Math.ceil(base.be), function (v) { return FN.num(v); })
      : '<span class="neg">price is below unit cost</span>';
    var mos = now.Q > 0 && isFinite(now.be) ? (1 - now.be / now.Q) * 100 : -100;
    $('p-mos').textContent = mos > 0 ? mos.toFixed(0) + '%' : '—';
    $('p-mos').className = 'kpi__val ' + (mos < 15 ? 'neg' : '');

    /* Waterfall: current profit -> price effect -> volume effect -> new profit */
    var priceEffect = s.Q * (now.P - s.P);
    var volumeEffect = (now.Q - s.Q) * (now.P - s.VC);
    wfMount.update(FN.waterfall({
      height: 250,
      items: [
        { label: 'Profit now', value: base.op, total: true },
        { label: 'Price effect', value: priceEffect },
        { label: 'Volume effect', value: volumeEffect },
        { label: 'Profit after', value: now.op, total: true }
      ]
    }));

    /* Profit curve across the price range */
    var xs = [], vals = [], marker = 0;
    for (var d = -20; d <= 30; d += 1) {
      xs.push(d);
      vals.push(model(s, d / 100).op);
      if (d === Math.round(s.dp * 100)) marker = xs.length - 1;
    }
    var bestIdx = vals.indexOf(Math.max.apply(null, vals));
    curveMount.update(FN.line({
      height: 230, padLeft: 52,
      labels: xs.map(function (d) { return (d > 0 ? '+' : '') + d + '%'; }),
      series: [{ values: vals, area: true, dots: false }],
      xEvery: 10,
      markers: [
        { i: bestIdx, v: vals[bestIdx], text: 'best: ' + (xs[bestIdx] > 0 ? '+' : '') + xs[bestIdx] + '%', color: FN.palette().warn },
        { i: marker, v: vals[marker], text: 'you', color: FN.palette().accent }
      ]
    }));

    /* Lever comparison: profit impact of a 1% move in each driver */
    var lp = s.Q * s.P * 0.01;                     /* +1% price  */
    var lv = (s.P - s.VC) * s.Q * 0.01;            /* +1% volume */
    var lc = s.VC * s.Q * 0.01;                    /* -1% variable cost */
    var lf = s.F * 0.01;                           /* -1% fixed cost */
    levMount.update(FN.hbars({
      padLeft: 132, rowH: 32,
      items: [
        { label: '+1% price', value: lp },
        { label: '+1% volume', value: lv },
        { label: '−1% variable cost', value: lc },
        { label: '−1% fixed cost', value: lf }
      ],
      vFmt: function (v) { return FN.usdC(v) + '/mo'; }
    }));

    /* Narrative */
    var maxLoss = (now.P - s.VC) > 0 ? (1 - (s.P - s.VC) / (now.P - s.VC)) * 100 : -100;
    var assumedLoss = s.el * s.dp * 100;
    var bits = [];

    if (Math.abs(s.dp) < 0.005) {
      bits.push('<p>At today’s price you keep <strong>' + FN.usd(base.cm, 2) + ' from every sale</strong> ' +
        'once you have paid to deliver it, which leaves <strong>' + FN.usdC(base.op) + '</strong> of profit ' +
        'a month — a ' + (base.rev ? (base.op / base.rev * 100).toFixed(1) : '0') +
        '% margin. Move the price slider to test a change.</p>');
    } else if (s.dp > 0) {
      bits.push('<p>Raising price <strong>' + (s.dp * 100).toFixed(0) + '%</strong> lifts what you keep on each ' +
        'sale from ' + FN.usd(base.cm, 2) + ' to <strong>' + FN.usd(now.cm, 2) + '</strong>. That is the whole ' +
        'argument: you keep more from every sale, so you need fewer of them.</p>');
      bits.push('<p><strong>You could lose up to ' + maxLoss.toFixed(1) + '% of your customers</strong> and still ' +
        'be no worse off than today. Your own assumption says you would lose ' + assumedLoss.toFixed(1) + '% — ' +
        (assumedLoss < maxLoss
          ? 'comfortably inside that cushion, so the increase still pays even if you are badly wrong about how customers react.'
          : 'more than you can afford, so on this assumption the increase costs you money. The question is whether customers really are that sensitive, or whether that is nerves.') +
        '</p>');
    } else {
      bits.push('<p>Cutting price <strong>' + Math.abs(s.dp * 100).toFixed(0) + '%</strong> drops what you keep on ' +
        'each sale to <strong>' + FN.usd(now.cm, 2) + '</strong>. Just to end up where you started you would need ' +
        '<strong>' + (base.cm > 0 && now.cm > 0 ? ((base.cm / now.cm - 1) * 100).toFixed(1) + '% more sales' : 'more sales than you can win') +
        '</strong> — every month, permanently.</p>');
    }

    var levers = [
      { n: 'your price', v: lp }, { n: 'the number you sell', v: lv },
      { n: 'what each one costs', v: lc }, { n: 'your fixed costs', v: lf }
    ].sort(function (a, b) { return b.v - a.v; });
    bits.push('<p>A 1% improvement in <strong>' + levers[0].n + '</strong> is worth ' + FN.usdC(levers[0].v) +
      ' a month — <strong>' + (levers[3].v ? (levers[0].v / levers[3].v).toFixed(1) + ' times' : 'far') +
      ' more</strong> than the same 1% off ' + levers[3].n + '. Most cost-cutting efforts go after the smallest ' +
      'item on that list.</p>');

    if (now.op < 0) {
      bits.push('<p class="neg"><strong>This scenario loses money.</strong> At ' + FN.num(Math.round(now.Q)) +
        ' units you are below the ' + (isFinite(now.be) ? FN.num(Math.ceil(now.be)) : '—') +
        ' you need just to cover your fixed costs.</p>');
    }
    $('p-insight').innerHTML = bits.join('');

    /* ---------- Tab 2: every price, compared ---------- */
    var steps = [-10, -5, 0, 5, 10, 15, 20];
    $('p-scen-tbody').innerHTML = steps.map(function (d) {
      var m = model(s, d / 100);
      var vs = m.op - base.op;
      var isNow = d === Math.round(s.dp * 100);
      return '<tr' + (isNow ? ' style="background:var(--accent-soft)"' : '') + '>' +
        '<td><strong>' + (d > 0 ? '+' : '') + d + '%</strong>' + (isNow ? ' <span class="badge badge--accent">you</span>' : '') + '</td>' +
        '<td class="n">' + FN.usd(m.P, 2) + '</td>' +
        '<td class="n">' + FN.num(Math.round(m.Q)) + '</td>' +
        '<td class="n">' + FN.usd(m.rev) + '</td>' +
        '<td class="n">' + m.gmPct.toFixed(1) + '%</td>' +
        '<td class="n"><strong>' + FN.usd(m.op) + '</strong></td>' +
        '<td class="n ' + (vs > 0 ? 'pos' : vs < 0 ? 'neg' : 'muted') + '">' + (d === 0 ? '—' : FN.sgn(vs, FN.usd)) + '</td>' +
      '</tr>';
    }).join('');

    var bestStep = steps.map(function (d) { return { d: d, op: model(s, d / 100).op }; })
      .sort(function (a, b) { return b.op - a.op; })[0];
    var drop10 = model(s, -0.10);
    $('p-scen-insight').innerHTML =
      '<p>Across this whole range the best outcome is at <strong>' +
      (bestStep.d > 0 ? '+' : '') + bestStep.d + '%</strong>, worth ' + FN.usdC(bestStep.op) +
      ' a month against ' + FN.usdC(base.op) + ' today. ' +
      (bestStep.d > 0
        ? 'Every row above your current price earns more than the one below it — the volume you lose ' +
          'is worth less than the margin you keep.'
        : 'On these assumptions your customers are sensitive enough that holding or cutting price wins.') +
      '</p>' +
      '<p><strong>Discounting is the expensive row.</strong> Cutting 10% takes profit to ' +
      FN.usdC(drop10.op) + ' — ' +
      (base.op > 0 && drop10.op < base.op
        ? 'a ' + Math.round((1 - drop10.op / base.op) * 100) + '% fall'
        : 'a worse position') +
      ' — and you would have to sell ' +
      (drop10.cm > 0 ? FN.num(Math.round((base.gp / drop10.cm) - s.Q)) + ' more units every month' : 'volume you cannot reach') +
      ' just to stand still. That is the real cost of the discount your largest customer keeps asking for.</p>';

    /* ---------- Tab 3: which lever pays ---------- */
    var ranked = [
      { n: 'raising price 1%', v: lp, why: 'goes straight to the bottom line — nothing else changes' },
      { n: 'selling 1% more', v: lv, why: 'you also pay to deliver the extra work' },
      { n: 'cutting unit cost 1%', v: lc, why: 'worth having, but usually the hardest to actually do' },
      { n: 'cutting fixed costs 1%', v: lf, why: 'the smallest lever, and the one most often chosen first' }
    ].sort(function (a, b) { return b.v - a.v; });

    $('p-lev-insight').innerHTML =
      '<p>On your numbers, <strong>' + ranked[0].n + '</strong> is worth <strong>' + FN.usdC(ranked[0].v) +
      ' a month</strong> — ' + ranked[0].why + '. The same 1% off ' +
      (ranked[3].n.indexOf('fixed') >= 0 ? 'your fixed costs' : ranked[3].n) + ' is worth ' + FN.usdC(ranked[3].v) +
      (ranked[3].v ? ', roughly ' + (ranked[0].v / ranked[3].v).toFixed(1) + ' times less' : '') + '.</p>' +
      '<p>This ordering is stable across almost every small business, and it is almost always the ' +
      'reverse of where the effort goes. Cost-cutting programmes feel decisive and land on the ' +
      'smallest lever; a price conversation feels risky and is worth several times more. ' +
      '<strong>Doing all four at once — 1% each — would be worth ' +
      FN.usdC(lp + lv + lc + lf) + ' a month</strong>, or ' + FN.usdC((lp + lv + lc + lf) * 12) +
      ' a year, without winning a single new customer.</p>';
  }

  inputs.forEach(function (i) { i.addEventListener('input', update); });
  window.addEventListener('themechange', update);
  update();
})();
