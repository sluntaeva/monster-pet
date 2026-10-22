import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const types: Record<string,string> = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
export async function serveStatic(req: IncomingMessage, res: ServerResponse, root: string): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) { res.writeHead(404); res.end(); return; }
    const base = await realpath(root);
    const candidate = await realpath(resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname)));
    if (!candidate.startsWith(base + sep) || !(await stat(candidate)).isFile()) { res.writeHead(404); res.end(); return; }
    const bytes = await readFile(candidate);
    res.setHeader('Content-Type', types[extname(candidate)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.setHeader('Content-Length', bytes.length);
    res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404); res.end(); }
}
