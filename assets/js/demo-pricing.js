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
      ? 'No volume response — you own the relationship.'
      : s.el < 0.7 ? 'Low: differentiated, sticky, or price is not the reason they buy.'
      : s.el <= 1.5 ? 'Moderate: a 1% rise costs about ' + s.el.toFixed(1) + '% of volume.'
      : 'High: commodity-like, customers shop on price.';

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
      bits.push('<p>At today’s price you earn <strong>' + FN.usd(base.cm, 2) + ' of contribution per unit</strong> ' +
        'and <strong>' + FN.usdC(base.op) + '</strong> of operating profit a month — a ' +
        (base.rev ? (base.op / base.rev * 100).toFixed(1) : '0') + '% margin. Move the price slider to test a change.</p>');
    } else if (s.dp > 0) {
      bits.push('<p>Raising price <strong>' + (s.dp * 100).toFixed(0) + '%</strong> lifts contribution per unit from ' +
        FN.usd(base.cm, 2) + ' to <strong>' + FN.usd(now.cm, 2) + '</strong>. That is the whole argument: you keep more of every ' +
        'sale, so you need fewer of them.</p>');
      bits.push('<p><strong>You could lose up to ' + maxLoss.toFixed(1) + '% of volume</strong> and still be no worse off. ' +
        'Your sensitivity assumption says you would lose ' + assumedLoss.toFixed(1) + '% — ' +
        (assumedLoss < maxLoss
          ? 'comfortably inside the buffer, so this price rise pays even if you are meaningfully wrong about how customers react.'
          : 'more than the break-even loss, so on this assumption the increase destroys profit. The judgement call is whether that sensitivity is real or defensive.') +
        '</p>');
    } else {
      bits.push('<p>Cutting price <strong>' + Math.abs(s.dp * 100).toFixed(0) + '%</strong> drops contribution per unit to <strong>' +
        FN.usd(now.cm, 2) + '</strong>. To stand still on profit you now need <strong>' +
        (base.cm > 0 && now.cm > 0 ? ((base.cm / now.cm - 1) * 100).toFixed(1) + '% more volume' : 'volume you cannot get') +
        '</strong> — every month, permanently.</p>');
    }

    var levers = [{ n: 'price', v: lp }, { n: 'volume', v: lv }, { n: 'variable cost', v: lc }, { n: 'fixed cost', v: lf }]
      .sort(function (a, b) { return b.v - a.v; });
    bits.push('<p>On your numbers, a 1% move in <strong>' + levers[0].n + '</strong> is worth ' + FN.usdC(levers[0].v) +
      ' a month — <strong>' + (levers[3].v ? (levers[0].v / levers[3].v).toFixed(1) + '×' : 'far') +
      ' more</strong> than the same 1% in ' + levers[3].n + '. Most cost-cutting programmes chase the smallest lever on this list.</p>');

    if (now.op < 0) {
      bits.push('<p class="neg"><strong>This scenario loses money.</strong> At ' + FN.num(Math.round(now.Q)) +
        ' units you are below the break-even of ' + (isFinite(now.be) ? FN.num(Math.ceil(now.be)) : '—') + '.</p>');
    }
    $('p-insight').innerHTML = bits.join('');
  }

  inputs.forEach(function (i) { i.addEventListener('input', update); });
  window.addEventListener('themechange', update);
  update();
})();
