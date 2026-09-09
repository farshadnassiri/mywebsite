/* Site chrome: theme, nav, drawer, reveal-on-scroll, forms. */
(function () {
  'use strict';

  /* ==========================================================================
     Analytics — Google Analytics 4, loaded only with consent
     ========================================================================== */
  var CFG = window.SITE_CONFIG || {};
  var AN = CFG.analytics || {};

  /* Pages under demos/ sit one level down, so any link this script builds needs
     the same prefix the shell gives the static ones. Derived from our own tag. */
  var BASE = (function () {
    var tag = document.querySelector('script[src$="assets/js/site.js"]');
    var src = tag ? tag.getAttribute('src') || '' : '';
    return src.replace(/assets\/js\/site\.js$/, '');
  })();
  var CONSENT_KEY = 'fn-consent';
  var gaLoaded = false;

  function consentChoice() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function rememberConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
  }

  function loadGA() {
    if (gaLoaded || !AN.ga4Id) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    /* Start from denied and grant only analytics: this site runs no advertising,
       so the ad categories stay off permanently. */
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(AN.ga4Id);
    document.head.appendChild(s);
    window.gtag('config', AN.ga4Id);
  }

  /* Named events. A no-op when analytics is off or consent was declined, so
     callers never have to check. */
  window.siteTrack = function (name, props) {
    if (gaLoaded && typeof window.gtag === 'function') {
      window.gtag('event', name, props || {});
    }
  };

  function showConsentBanner() {
    var bar = document.createElement('div');
    bar.className = 'consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookies');
    bar.innerHTML =
      '<div class="consent__in">' +
        '<p class="consent__t">This site can use Google Analytics to count visits and see which ' +
        'pages are read. It stores a cookie, so it only runs if you agree. Declining changes ' +
        'nothing else about the site. <a href="' + BASE + 'privacy.html">What is collected</a></p>' +
        '<div class="consent__b">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-consent="denied">Decline</button>' +
          '<button type="button" class="btn btn--primary btn--sm" data-consent="granted">Accept</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('is-in'); });

    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var choice = b.getAttribute('data-consent');
      rememberConsent(choice);
      if (choice === 'granted') loadGA();
      bar.classList.remove('is-in');
      setTimeout(function () { bar.remove(); }, 250);
    });
  }

  if (AN.ga4Id) {
    if (AN.requireConsent === false) {
      loadGA();
    } else {
      var choice = consentChoice();
      if (choice === 'granted') loadGA();
      else if (choice !== 'denied') showConsentBanner();
    }
  }

  /* Lets the privacy page offer a way to change the decision. */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-consent-reset]')) return;
    e.preventDefault();
    try { localStorage.removeItem(CONSENT_KEY); } catch (err) {}
    location.reload();
  });

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

    /* The enquiry as a plain-text message. Used for the no-endpoint fallback and,
       more importantly, to give the visitor a way out if the post fails. */
    function composeMessage() {
      var data = new FormData(form);
      var lines = [];
      data.forEach(function (v, k) {
        if (k.charAt(0) === '_') return;          /* form-service control fields */
        if (!String(v).trim()) return;
        var label = k.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        lines.push(label + ': ' + v);
      });
      return {
        subject: 'Website enquiry — ' + (data.get('service') || 'General'),
        body: lines.join('\n')
      };
    }

    function mailtoHref() {
      var m = composeMessage();
      return 'mailto:farshadnassiri@gmail.com?subject=' + encodeURIComponent(m.subject) +
             '&body=' + encodeURIComponent(m.body);
    }

    /* A failed post must not be a dead end: the visitor gets one click to send
       the same details by email, and a copy button for anyone on webmail whose
       browser does nothing with a mailto link. */
    function showFallback(status, reason, retryable) {
      status.hidden = false;
      status.className = 'callout callout--box callout--warn mt-3';
      status.innerHTML =
        '<h4>That did not send.</h4>' +
        '<p class="small muted">' + reason + '</p>' +
        '<div class="btn-row mt-2">' +
          '<a class="btn btn--primary btn--sm" href="' + mailtoHref() + '">Send it as an email instead</a>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-copy-enquiry>Copy the details</button>' +
        '</div>' +
        '<p class="note mt-2">Nothing you typed has been lost — it is still in the form above. ' +
        (retryable ? 'You can also just try again. ' : '') +
        'The address is <strong>farshadnassiri@gmail.com</strong>.</p>';
      status.scrollIntoView({ block: 'nearest' });

      var copyBtn = status.querySelector('[data-copy-enquiry]');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var m = composeMessage();
          var text = m.subject + '\n\n' + m.body;
          var done = function () { copyBtn.textContent = 'Copied'; };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { copyBtn.textContent = 'Press Ctrl+C'; });
          } else {
            copyBtn.textContent = 'Press Ctrl+C';
          }
        });
      }
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
          if (r.ok) return null;
          /* Read the service's own explanation — a monthly cap being reached
             needs different advice from a network blip. */
          return r.json().catch(function () { return null; }).then(function (j) {
            var msg = j && (j.error ||
              (j.errors && j.errors[0] && (j.errors[0].message || j.errors[0].code)));
            var err = new Error(msg || 'request failed');
            err.status = r.status;
            err.detail = msg;
            throw err;
          });
        }).then(function () {
          window.siteTrack('enquiry_sent', {
            service_name: String(body.get('service') || 'unspecified'),
            sector: String(body.get('sector') || 'unspecified')
          });
          form.reset();
          if (status) {
            status.hidden = false;
            status.className = 'callout callout--box mt-3';
            status.innerHTML = '<h4>Thank you — that has reached me.</h4>' +
              '<p class="small muted">You will get a reply within one business day, usually with two or three ' +
              'follow-up questions so the first call is useful rather than exploratory.</p>';
            status.scrollIntoView({ block: 'nearest' });
          }
        }).catch(function (err) {
          window.siteTrack('enquiry_failed', { reason: String((err && err.status) || 'network') });
          if (!status) return;
          var capped = err && (err.status === 429 ||
            /limit|quota|exceed/i.test(String(err.detail || '')));
          showFallback(
            status,
            capped
              ? 'The form is not accepting submissions at the moment. Nothing is wrong with what ' +
                'you wrote — please send it by email and it will be answered the same way.'
              : 'Something went wrong between your browser and the form — usually a connection ' +
                'that dropped mid-send.',
            !capped
          );
        }).finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Send request'; }
        });
        return;
      }

      /* No endpoint configured — offer the same email escape hatch. */
      e.preventDefault();
      window.location.href = mailtoHref();
      if (status) {
        showFallback(status, 'This form is not connected to a mailbox yet, so it has to go by email.', false);
      }
    });
  }

  /* ---------- What visitors actually do ----------
     Derived from the href rather than sprinkled through the markup, so every
     link to a case or a service is covered without touching 30 cards. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var m = href.match(/demos\/([a-z-]+)\.html/);
    if (m) { window.siteTrack('case_opened', { case_name: m[1] }); return; }
    m = href.match(/services\.html#([a-z-]+)/);
    if (m) window.siteTrack('service_opened', { service_name: m[1] });
  });

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
