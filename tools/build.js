#!/usr/bin/env node
/* Static site builder — no dependencies.
 *
 *   node tools/build.js
 *
 * Reads src/pages/*.html (body content + a JSON meta comment on line 1),
 * wraps each in the shared shell from src/partials/, and writes plain HTML to
 * the repository root (and to demos/ for pages whose slug contains a slash).
 * The output is committed, so GitHub Pages serves it with no CI step.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/* Set this to your public origin (e.g. 'https://farshadnassiri.com') to emit
   absolute canonical URLs. Left empty, canonicals stay relative. */
const SITE_URL = '';
const SRC = path.join(ROOT, 'src');

const read = (p) => fs.readFileSync(p, 'utf8');
const partial = (n) => read(path.join(SRC, 'partials', n + '.html'));

const SHELL = partial('shell');
const NAV = partial('nav');
const FOOTER = partial('footer');

const META_RE = /^<!--META\s*([\s\S]*?)-->\s*/;

function build() {
  const dir = path.join(SRC, 'pages');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
  const written = [];

  for (const file of files) {
    const raw = read(path.join(dir, file));
    const m = raw.match(META_RE);
    if (!m) throw new Error(`${file}: missing <!--META {...}--> block on the first line`);

    let meta;
    try { meta = JSON.parse(m[1]); }
    catch (e) { throw new Error(`${file}: meta is not valid JSON — ${e.message}`); }

    const body = raw.slice(m[0].length);
    const slug = meta.slug || file.replace(/\.html$/, '');
    const depth = slug.split('/').length - 1;
    const base = depth ? '../'.repeat(depth) : '';

    const scripts = (meta.scripts || [])
      .map((s) => `  <script src="${base}assets/js/${s}"></script>`)
      .join('\n');

    let html = SHELL
      .replace('{{nav}}', NAV)
      .replace('{{footer}}', FOOTER)
      .replace('{{body}}', body)
      .replace('{{scripts}}', scripts)
      .replace(/\{\{title\}\}/g, esc(meta.title))
      .replace(/\{\{desc\}\}/g, esc(meta.desc))
      .replace(/\{\{canonical\}\}/g, SITE_URL
        ? SITE_URL.replace(/\/$/, '') + '/' + (slug === 'index' ? '' : slug + '.html')
        : (slug === 'index' ? './' : base + slug + '.html'))
      .replace(/\{\{base\}\}/g, base);

    const out = path.join(ROOT, slug + '.html');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    written.push(path.relative(ROOT, out));
  }

  if (SITE_URL) {
    const origin = SITE_URL.replace(/\/$/, '');
    const urls = written
      .filter((f) => f !== '404.html')
      .map((f) => `  <url><loc>${origin}/${f === 'index.html' ? '' : f}</loc></url>`)
      .join('\n');
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    written.push('sitemap.xml');
  }

  written.sort().forEach((f) => console.log('  ✓ ' + f));
  console.log(`\n${written.length} files written.`);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

build();
