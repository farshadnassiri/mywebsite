/* Site configuration.
   formEndpoint: where the contact form posts. Currently a Formspree form —
   submissions arrive by email and are listed in the Formspree dashboard.
   The endpoint is public by design (it lives in client-side code); spam is
   handled by Formspree's own filtering plus the _gotcha honeypot on the form.
   Empty it and the form falls back to opening a pre-filled email draft. */
window.SITE_CONFIG = {
  formEndpoint: 'https://formspree.io/f/xzebkvej',
  email: 'farshadnassiri@gmail.com',
  calendarUrl: '',  /* e.g. a Cal.com or Calendly link; falls back to /contact.html */

  /* Analytics. Both options are off by default: nothing loads, no cookie is
     set, and no request leaves the page.

     `script` — a cookieless collector. It loads straight away and needs no
     consent banner, because it stores nothing on the visitor's device.

     Cloudflare Web Analytics (free; token from the Cloudflare dashboard under
     Analytics & Logs → Web Analytics → your site → Manage site):

       script: 'https://static.cloudflareinsights.com/beacon.min.js',
       attrs: { type: 'module', 'data-cf-beacon': '{"token": "..."}' }

     The token is public by design — it sits in the page source of every site
     using it, exactly like the form endpoint above.

     Cloudflare reports page views, visits, referrers, countries and devices.
     It has no custom-event API, so the siteTrack() calls in site.js are NOT
     recorded by it — they stay harmless no-ops, ready for a collector that
     does. Top pages still shows which worked example gets read.

     Or a collector you host yourself, which does support events:

       script: 'https://stats.yourdomain.com/script.js',
       attrs: { 'data-website-id': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }

     `ga4Id` — Google Analytics, e.g. 'G-XXXXXXXXXX'. GA stores cookies, so
     requireConsent keeps it off until the visitor accepts; declining loads
     nothing at all rather than loading Google with storage disabled. Set
     requireConsent to false only if you are certain no visitor is in a
     jurisdiction that requires prior consent (the EU and UK do).

     Switching between any of these costs one line here and nothing else. */
  analytics: {
    script: 'https://static.cloudflareinsights.com/beacon.min.js',
    attrs: {
      type: 'module',
      'data-cf-beacon': '{"token": "630e06ba79f6498fa91a461b1fe938f5"}'
    },
    ga4Id: '',
    requireConsent: true
  }
};
