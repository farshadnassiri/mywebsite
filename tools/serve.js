#!/usr/bin/env node
/* Local development server — no dependencies.
 *
 *   node tools/serve.js              → http://localhost:8000
 *   node tools/serve.js 3000         → a different port
 *   node tools/serve.js --no-watch   → serve only, do not rebuild on change
 *
 * Serves the repository root as a static site, and rebuilds the generated HTML
 * whenever anything under src/ changes. Nothing needs to be installed.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const port = Number(args.find((a) => /^\d+$/.test(a))) || Number(process.env.PORT) || 8000;
const watch = !args.includes('--no-watch');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function build(reason) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { cwd: ROOT, stdio: 'pipe' });
    console.log(`  rebuilt (${reason})`);
  } catch (e) {
    console.error('  build failed:\n' + (e.stderr || e.stdout || e.message).toString().trim());
  }
}

/* Resolve a URL to a file inside ROOT, refusing anything that escapes it. */
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  let file = path.normalize(path.join(ROOT, clean));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

const server = http.createServer((req, res) => {
  const file = resolve(req.url);
  if (!file) {
    const notFound = path.join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache'      /* always serve the newest build while developing */
  });
  fs.createReadStream(file).pipe(res);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try:  node tools/serve.js ${port + 1}`);
    process.exit(1);
  }
  throw e;
});

server.listen(port, () => {
  console.log(`\n  Farshad Nassiri — site running`);
  console.log(`  http://localhost:${port}\n`);
  if (watch) {
    let timer = null;
    fs.watch(path.join(ROOT, 'src'), { recursive: true }, (_e, name) => {
      clearTimeout(timer);
      timer = setTimeout(() => build(name || 'src changed'), 120);
    });
    console.log('  Watching src/ — edit a page and refresh the browser.');
  }
  console.log('  Ctrl+C to stop.\n');
});
