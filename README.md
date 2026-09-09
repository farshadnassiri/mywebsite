# Farshad Nassiri — Tech-Enabled Finance

Marketing and demonstration site for a Fractional CFO / FP&A practice.

The site is deliberately **static** — plain HTML, CSS and vanilla JavaScript, no
framework, no runtime dependencies, no CDN except a web font. It loads fast, it
works on any host, and it will still build in five years.

## What is here

| Page | Purpose |
| --- | --- |
| `index.html` | The problem picker and its live answer panel, the Financial Health Review with its FAQ, services |
| `solutions.html` | The 30 business problems, grouped by theme; the hub the whole site funnels through |
| `demos/pricing-simulator.html` | Price / volume / margin simulator with lever ranking |
| `demos/cash-runway.html` | 13-week cash flow, runway and the hiring decision |
| `demos/profitability.html` | Client profitability, overhead allocation, margin leakage |
| `demos/spend-controls.html` | Five control tests run over a full payment population |
| `services.html` | All services with indicative pricing, plus FAQ |
| `financial-health-review.html` | The entry offer, in detail |
| `about.html` | Background, data handling, and an explicit scope boundary |
| `contact.html` | Qualification form |
| `privacy.html` | What the site collects, and a control to change the analytics choice |
| `404.html` | Not-found page |

All figures come from a **constructed example business**, labelled as such on
every page. The arithmetic is real — every page computes in the browser from the
inputs on screen, and each worked example states plainly how much of a real
engagement it represents and what it leaves out.

**Positioning notes for future edits:**

- The site makes no reference to technology, automation, AI, software
  development or dashboards. The offer is finance judgement — understanding the
  owner's problem and answering it.
- The funnel is **problem → worked example → service**, in that order, and every
  page should keep a visitor moving along it. The homepage picker, the problem
  hub and the closing block of each worked example are the three hinges.
- Nothing is presented as a real client engagement. The example business is
  constructed and every page says so; outcomes are written as "in the example".
  Each worked example states that it is roughly 5% of a real engagement and
  lists what the other 95% covers.

## Running it locally

The site is static, so nothing needs to be installed and nothing needs to be
built before it will run. There is a small dependency-free dev server in the
repo:

```bash
node tools/serve.js            # http://localhost:8000
node tools/serve.js 3000       # a different port
node tools/serve.js --no-watch # serve only, skip the src/ watcher
```

It serves the repository root, rebuilds the generated HTML whenever anything
under `src/` changes, and sends no-cache headers so a refresh always shows the
current build.

Any Node from 14 onwards will run it. Recursive directory watching needs Node 20
on Linux; below that the server watches each `src/` directory individually
instead, which covers the same files and prints a note saying so.

If you would rather not use it, any static server works — the committed HTML is
the whole site:

```bash
python3 -m http.server 8000
```

Opening `index.html` straight from the filesystem also works; only the demo
models need JavaScript, and they run fine over `file://`.

### On WSL

```bash
git clone https://github.com/farshadnassiri/mywebsite.git
cd mywebsite
git checkout claude/fractional-cfo-website-b7hyfx
node tools/serve.js
```

Then open <http://localhost:8000> in Windows. WSL2 forwards `localhost`
automatically; if your setup does not, use the address `hostname -I` prints.

Two things worth knowing:

- Keep the clone in the Linux filesystem (`~/mywebsite`), not under
  `/mnt/c/...`. On a Windows drive `fs.watch` misses changes, so the rebuild
  watcher silently stops working — and everything is slower.
- The web font loads from Google Fonts. Offline, the site falls back to system
  fonts and stays fully usable, it just looks slightly different.

If `node` is missing, `sudo apt install nodejs` works, though on older Ubuntu
releases it installs a very old Node. For a current one:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

## Editing

The root `.html` files are **generated**. Do not edit them directly; they are
overwritten on the next build.

```
src/
  partials/shell.html   ← <head>, body wrapper, script tags
  partials/nav.html     ← header + mobile drawer
  partials/footer.html  ← footer, including the synthetic-data disclaimer
  pages/*.html          ← page bodies, each starting with a <!--META {...}--> block
tools/build.js          ← the builder (no dependencies)
tools/serve.js          ← local dev server + src/ watcher
assets/css/main.css     ← the whole design system
assets/js/              ← site chrome, chart helpers, one file per demo
```

Change a page body or a partial, then:

```bash
node tools/build.js
```

That rewrites the root HTML. Commit both the `src/` change and the generated
output — the generated files are what gets served.

`{{base}}` inside a page or partial expands to the relative path back to the
site root (`../` inside `demos/`, empty elsewhere). Always use it for links and
assets so pages work at any depth.

## Configuration

**Contact form** — `assets/js/config.js` holds `formEndpoint`, currently a
Formspree form. Submissions arrive by email and are listed in the Formspree
dashboard.

The handler in `assets/js/site.js` posts the whole form as `FormData` and adds
two fields of its own: `_subject` (`Company — Service`, so enquiries are
triageable from the inbox list) and `_replyto` (so Reply goes to the sender).
A hidden `_gotcha` honeypot on the form discards bot submissions.

On success the form resets and confirms. **On any failure — including the free
plan's monthly cap being reached — the visitor is not left at a dead end:** what
they typed stays in the form, and they get a one-click "send it as an email
instead" link with every field already composed, plus a copy button for anyone
on webmail whose browser ignores `mailto:`. A capped form and a dropped
connection get different wording, since retrying only helps for one of them.

The endpoint is public by design — it lives in client-side code, like every
static-site form service. To swap provider, replace the URL; to go back to the
email-draft fallback, empty it.

**Analytics** — `assets/js/config.js`. Both routes are off in the shipped state:
no script, no cookie, no request anywhere.

- `analytics.script` + `attrs` — a collector you host yourself (Umami,
  Plausible, Matomo). Cookieless, so it loads immediately and needs no banner.
- `analytics.ga4Id` — Google Analytics. Note that **Google has suspended
  Analytics for accounts associated with Iranian IP addresses**, so this route
  is unavailable from some regions regardless of the code; the self-hosted one
  is not.

Both drive the same `siteTrack()` events, so switching costs one line.

Because GA4 stores cookies, `requireConsent` (default `true`) keeps it off until
the visitor accepts: declining loads nothing rather than loading Google with
storage disabled. Consent is remembered in `localStorage`, and `privacy.html`
carries a control to clear that choice.

Beyond page views, `window.siteTrack(name, props)` records the things worth
knowing — it is a no-op when analytics is off, so callers never check:

| Event | Fires when | Tells you |
| --- | --- | --- |
| `problem_selected` | a homepage problem is picked | which problems the market actually has |
| `case_opened` | any link to a worked example | which analysis earns attention |
| `service_opened` | any link to a service section | what visitors price up |
| `enquiry_sent` / `enquiry_failed` | contact form outcome | the bottom of the funnel |

Case and service events are derived from the link's `href`, so new links are
covered without touching the markup.

**Canonical URLs and sitemap** — set `SITE_URL` at the top of `tools/build.js`
to your public origin (e.g. `https://farshadnassiri.com`) and rebuild. Absolute
canonicals and a `sitemap.xml` are then emitted.

**Pricing** — every price on the site is a *starting* price, stated as such.
The figures live in `src/pages/index.html`, `services.html` and
`financial-health-review.html`; search for `$750` and `From $` to find them all.

## Deploying

Any static host works. For **GitHub Pages**: Settings → Pages → deploy from
branch, root directory. `.nojekyll` is present so nothing is filtered.

There is no CI step and no build required on the server — the committed HTML is
the site.

## Browser support

Modern evergreen browsers. Light and dark themes both ship; the toggle is in the
header and the choice persists in `localStorage`. Without JavaScript every page
still renders and reads correctly — only the interactive models and the reveal
animation need it.
