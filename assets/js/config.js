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

  /* Google Analytics 4.
     ga4Id: your Measurement ID from Admin → Data streams (looks like G-XXXXXXXXXX).
     Left empty, nothing loads: no script, no cookie, no request to Google.

     GA4 stores cookies, so requireConsent keeps it switched off until the
     visitor accepts. Nothing is loaded before they do — declining loads
     nothing at all, rather than loading Google with storage disabled.
     Set requireConsent to false only if you are certain you have no visitors
     in jurisdictions that require prior consent (the EU and UK do). */
  analytics: {
    ga4Id: '',
    requireConsent: true
  }
};
