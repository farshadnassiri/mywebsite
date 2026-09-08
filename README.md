# Farshad Nassiri — Tech-Enabled Finance

Marketing and demonstration site for a Fractional CFO / FP&A practice.

The site is deliberately **static** — plain HTML, CSS and vanilla JavaScript, no
framework, no runtime dependencies, no CDN except a web font. It loads fast, it
works on any host, and it will still build in five years.

## What is here

| Page | Purpose |
| --- | --- |
| `index.html` | Positioning, live cash model, question-first entry points, service ladder, entry offer |
| `solutions.html` | Problem library — the owner's question routed to a model and a service |
| `demos.html` | Index of the interactive models |
| `demos/pricing-simulator.html` | Price / volume / margin simulator with lever ranking |
| `demos/cash-runway.html` | 13-week cash flow, runway and the hiring decision |
| `demos/profitability.html` | Client profitability, overhead allocation, margin leakage |
| `demos/spend-controls.html` | Five control tests run over a full payment population |
| `services.html` | All services with indicative pricing, plus FAQ |
| `financial-health-review.html` | The entry offer, in detail |
| `about.html` | Background, data handling, and an explicit scope boundary |
| `contact.html` | Qualification form |
| `404.html` | Not-found page |

All demo figures are **synthetic** and labelled as such on every page. The
arithmetic behind them is real — the models compute in the browser from the
inputs on screen.

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
current build. Node 18+ is all it needs.

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

If `node` is missing: `sudo apt install nodejs` (or install Node 22 from
NodeSource for a current version).

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

**Contact form** — `assets/js/config.js`:

```js
window.SITE_CONFIG = { formEndpoint: '', email: '…', calendarUrl: '' };
```

Leave `formEndpoint` empty and the form opens a pre-filled email draft. Paste a
[Formspree](https://formspree.io) / Basin / Netlify Forms endpoint and it posts
there instead, with inline success and failure states. Nothing else changes.

**Canonical URLs and sitemap** — set `SITE_URL` at the top of `tools/build.js`
to your public origin (e.g. `https://farshadnassiri.com`) and rebuild. Absolute
canonicals and a `sitemap.xml` are then emitted.

**Pricing** — the founding-client offer ($495 vs $750, first three engagements)
appears in `src/pages/index.html`, `services.html` and
`financial-health-review.html`. Search for `495` when it is time to retire it.

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
