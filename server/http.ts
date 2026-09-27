import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Static file server for the built client, with SPA fallback and a health check.
 * With `devClientPort`, page requests redirect to the Vite dev server instead of
 * serving a possibly stale build from dist/.
 */
export function createHttpServer(
  distDir: string,
  devClientPort?: number,
  stats: () => { rooms: number } = () => ({ rooms: 0 }),
) {
  const root = resolve(distDir);
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname === '/healthz') {
      // rooms: the deploy script waits for 0 before restarting, since rooms live in memory.
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...stats() }));
      return;
    }
    if (devClientPort) {
      const host = (req.headers.host ?? 'localhost').replace(/:\d+$/, '');
      res.writeHead(302, { location: `http://${host}:${devClientPort}${url.pathname}${url.search}` });
      res.end();
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end();
      return;
    }
    let file = normalize(join(root, decodeURIComponent(url.pathname)));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Client not built. Run `npm run build`, or use `npm run dev` and open the Vite URL.');
      return;
    }
    const immutable = url.pathname.startsWith('/assets/');
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else createReadStream(file).pipe(res);
  });
}
