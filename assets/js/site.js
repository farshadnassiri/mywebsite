/* Site chrome: theme, nav, drawer, reveal-on-scroll, forms. */
(function () {
  'use strict';

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  var KEY = 'fn-theme';
  function apply(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme-toggle]');
    if (!b) return;
    apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    window.dispatchEvent(new Event('themechange'));
  });

  /* ---------- Nav ---------- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var drawer = document.getElementById('drawer');
  var toggle = document.querySelector('[data-drawer-toggle]');
  if (drawer && toggle) {
    toggle.addEventListener('click', function () {
      var open = drawer.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        drawer.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* Mark active nav link */
  var here = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
  document.querySelectorAll('.nav__links a[href]').forEach(function (a) {
    var p = new URL(a.getAttribute('href'), location.href).pathname
      .replace(/index\.html$/, '').replace(/\/$/, '');
    if (p && p === here) a.classList.add('is-active');
  });

  /* ---------- Reveal ----------
     A plain rAF-throttled scroll check rather than IntersectionObserver. Since
     a missed element stays invisible, the reveal state is derived from the
     current scroll position on every frame rather than from an asynchronous
     callback. Cost is negligible: the list shrinks as elements reveal, and the
     listeners detach once it is empty. */
  var pending = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  pending.forEach(function (el, i) {
    el.style.transitionDelay = Math.min(i % 4, 3) * 60 + 'ms';
  });

  var queued = false;
  function revealVisible() {
    queued = false;
    var limit = window.innerHeight * 0.94;
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().top < limit) {
        pending[i].classList.add('is-in');
        pending.splice(i, 1);
      }
    }
    if (!pending.length) {
      window.removeEventListener('scroll', onMove);
      window.removeEventListener('resize', onMove);
    }
  }
  function onMove() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(revealVisible);
  }
  if (pending.length) {
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    revealVisible();
    window.addEventListener('load', revealVisible);
  }

  /* ---------- Year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Contact form ---------- */
  /* Set FORM_ENDPOINT in assets/js/config.js to a Formspree / Basin / Netlify
     endpoint. Until then the form falls back to a pre-filled email draft. */
  var form = document.querySelector('form[data-lead-form]');
  if (form) {
    // Prefill "interest" from ?service= / ?q= in the URL (used by demo + service CTAs).
    var qs = new URLSearchParams(location.search);
    var svc = qs.get('service');
    if (svc) {
      var sel = form.querySelector('[name="service"]');
      if (sel) {
        Array.prototype.forEach.call(sel.options, function (o) {
          if (o.value.toLowerCase() === svc.toLowerCase()) sel.value = o.value;
        });
      }
    }
    var q = qs.get('q');
    if (q) {
      var ta = form.querySelector('[name="problem"]');
      if (ta && !ta.value) ta.value = decodeURIComponent(q);
    }

    form.addEventListener('submit', function (e) {
      var endpoint = (window.SITE_CONFIG && window.SITE_CONFIG.formEndpoint) || '';
      var status = form.querySelector('[data-form-status]');
      if (endpoint) {
        e.preventDefault();
        var btn = form.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        var body = new FormData(form);
        /* A subject line that says who and what, so enquiries are triageable
           from the inbox list without opening them. */
        var who = (body.get('company') || body.get('name') || 'Website').toString().trim();
        var about = (body.get('service') || body.get('problem_area') || 'General enquiry').toString().trim();
        body.set('_subject', who + ' — ' + about);
        if (body.get('email')) body.set('_replyto', body.get('email'));

        fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: body
        }).then(function (r) {
          if (!r.ok) throw new Error('bad status');
          form.reset();
          if (status) {
            status.hidden = false;
            status.className = 'callout callout--box mt-3';
            status.innerHTML = '<h4>Thank you — that has reached me.</h4>' +
              '<p class="small muted">You will get a reply within one business day, usually with two or three ' +
              'follow-up questions so the first call is useful rather than exploratory.</p>';
            status.scrollIntoView({ block: 'nearest' });
          }
        }).catch(function () {
          if (status) {
            status.hidden = false;
            status.className = 'callout callout--box callout--warn mt-3';
            status.innerHTML = '<h4>That did not go through.</h4>' +
              '<p class="small muted">Nothing you typed has been lost — it is still in the form. ' +
              'Please try once more, or send the same details straight to ' +
              '<a class="link-arrow" href="mailto:farshadnassiri@gmail.com">farshadnassiri@gmail.com</a>.</p>';
            status.scrollIntoView({ block: 'nearest' });
          }
        }).finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Send request'; }
        });
        return;
      }

      /* No endpoint configured yet — compose an email instead. */
      e.preventDefault();
      var data = new FormData(form);
      var lines = [];
      data.forEach(function (v, k) {
        if (String(v).trim()) lines.push(k.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + ': ' + v);
      });
      var subject = 'Website enquiry — ' + (data.get('service') || 'General');
      window.location.href = 'mailto:farshadnassiri@gmail.com?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      if (status) {
        status.hidden = false;
        status.className = 'callout callout--box mt-3';
        status.innerHTML = '<h4>Opening your email client…</h4><p class="small muted">If nothing opened, ' +
          'send the same details to <strong>farshadnassiri@gmail.com</strong>.</p>';
      }
    });
  }

  /* ---------- Tabs ---------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      /* Charts in the panel just revealed were never measured while hidden. */
      window.dispatchEvent(new Event('tabshown'));
    }

    list.addEventListener('click', function (e) {
      var t = e.target.closest('[role="tab"]');
      if (t) select(t);
    });

    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (next < 0) return;
      e.preventDefault();
      var t = tabs[(next + tabs.length) % tabs.length];
      t.focus();
      select(t);
    });

    tabs.forEach(function (t) {
      t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    });
  });

  /* ---------- Solution filter ---------- */
  var filterRow = document.querySelector('[data-filter-row]');
  if (filterRow) {
    var items = document.querySelectorAll('[data-topic]');
    filterRow.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      filterRow.querySelectorAll('[data-filter]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
      items.forEach(function (it) {
        var show = f === 'all' || it.getAttribute('data-topic') === f;
        it.style.display = show ? '' : 'none';
      });
    });
  }
})();
