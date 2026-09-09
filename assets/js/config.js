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

     `script` — a collector you host yourself (Umami, Plausible, Matomo). These
     are cookieless, so they load straight away and need no consent banner:

       script: 'https://stats.yourdomain.com/script.js',
       attrs: { 'data-website-id': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }

     `ga4Id` — Google Analytics, e.g. 'G-XXXXXXXXXX'. GA stores cookies, so
     requireConsent keeps it off until the visitor accepts; declining loads
     nothing at all rather than loading Google with storage disabled. Set
     requireConsent to false only if you are certain no visitor is in a
     jurisdiction that requires prior consent (the EU and UK do).

     Either one drives the same siteTrack() events, so switching between them
     costs one line here and nothing else. */
  analytics: {
    script: '',
    attrs: {},
    ga4Id: '',
    requireConsent: true
  }
};
