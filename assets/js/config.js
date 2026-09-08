/* Site configuration.
   formEndpoint: where the contact form posts. Currently a Formspree form —
   submissions arrive by email and are listed in the Formspree dashboard.
   The endpoint is public by design (it lives in client-side code); spam is
   handled by Formspree's own filtering plus the _gotcha honeypot on the form.
   Empty it and the form falls back to opening a pre-filled email draft. */
window.SITE_CONFIG = {
  formEndpoint: 'https://formspree.io/f/xzebkvej',
  email: 'farshadnassiri@gmail.com',
  calendarUrl: ''   /* e.g. a Cal.com or Calendly link; falls back to /contact.html */
};
