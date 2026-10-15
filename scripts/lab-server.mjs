// Servidor del laboratorio de pruebas: sirve el build de producción de la PWA y reenvía /api a la API.
// La PWA y la API quedan en el mismo origen (http://localhost:4200), como en producción:
// el service worker funciona (localhost cuenta como origen seguro) y no hace falta CORS.
//   npm run lab          -> compila y levanta el servidor
//   npm run lab:serve    -> solo levanta el servidor con el build existente
// Variables opcionales: PORT (4200) y API_URL (http://localhost:8080).
import { createReadStream, existsSync, statSync } from 'node:fs';
import { request as httpRequest, createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT ?? 4200);
const API_URL = new URL(process.env.API_URL ?? 'http://localhost:8080');
const ROOT = join(import.meta.dirname, '..', 'dist', 'Pwa_FatFish', 'browser');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
// Control files must never be cached by the browser, so new versions of the app arrive.
const NO_CACHE = new Set(['/index.html', '/ngsw.json', '/ngsw-worker.js', '/manifest.webmanifest']);

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error(`No existe el build en ${ROOT}. Ejecuta primero: npm run lab`);
  process.exit(1);
}

function proxyToApi(req, res) {
  const started = performance.now();
  const upstream = httpRequest(
    {
      hostname: API_URL.hostname,
      port: API_URL.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: API_URL.host },
    },
    (apiRes) => {
      res.writeHead(apiRes.statusCode ?? 502, apiRes.headers);
      apiRes.pipe(res);
      apiRes.on('end', () =>
        console.log(`[api] ${req.method} ${req.url} -> ${apiRes.statusCode} (${(performance.now() - started).toFixed(1)} ms)`),
      );
    },
  );
  upstream.on('error', (err) => {
    console.error(`[api] ${req.method} ${req.url} -> 502 (${err.code}): ¿está corriendo la API en ${API_URL.origin}?`);
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ title: 'API no disponible', detail: err.code }));
  });
  req.pipe(upstream);
}

function serveStatic(req, res) {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(ROOT, 'index.html'); // Angular routes (/historial, /retroalimentacion)
  }
  const servedAs = file === join(ROOT, 'index.html') ? '/index.html' : path;
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': NO_CACHE.has(servedAs) ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => (req.url.startsWith('/api/') ? proxyToApi(req, res) : serveStatic(req, res))).listen(PORT, () => {
  console.log(`PWA del laboratorio en http://localhost:${PORT} (API: ${API_URL.origin})`);
});
