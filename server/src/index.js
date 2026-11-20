
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 3001);
const here = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.resolve(here, '../../media');
const WEB_DIR = path.resolve(here, '../../web/dist');

const TICK_MS = 50;
const MAX_CHUNK_BYTES = 64 * 1024;
const MIN_KBPS = 50;
const MAX_KBPS = 100_000;

let bandwidthKbps = 0;

const MIME = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.mpd': 'application/dash+xml',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function waitDrain(res) {
  return new Promise((resolve) => {
    const done = () => {
      res.off('drain', done);
      res.off('close', done);
      resolve();
    };
    res.once('drain', done);
    res.once('close', done);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
      if (chunks.length > 16) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function safeResolve(baseDir, urlPath) {
  const target = path.resolve(baseDir, '.' + path.posix.normalize('/' + urlPath));
  return target.startsWith(baseDir + path.sep) || target === baseDir ? target : null;
}

async function sendThrottled(res, filePath, size) {
  let closed = false;
  res.on('close', () => {
    closed = true;
  });

  const handle = await fs.promises.open(filePath, 'r');
  try {
    let sent = 0;
    while (sent < size && !closed) {
      const kbps = bandwidthKbps;
      const budget = kbps > 0 ? Math.max(1, Math.floor(((kbps * 1000) / 8) * (TICK_MS / 1000))) : MAX_CHUNK_BYTES;
      const length = Math.min(budget, MAX_CHUNK_BYTES, size - sent);
      const chunk = Buffer.allocUnsafe(length);
      const { bytesRead } = await handle.read(chunk, 0, length, sent);
      if (bytesRead === 0) break;

      const flushed = res.write(chunk.subarray(0, bytesRead));
      sent += bytesRead;

      if (kbps > 0) await sleep(TICK_MS);
      else if (!flushed) await waitDrain(res);
    }
    res.end();
  } finally {
    await handle.close();
  }
}

async function serveMedia(req, res, urlPath) {
  const filePath = safeResolve(MEDIA_DIR, urlPath.replace(/^\/media/, ''));
  const stat = filePath && (await fs.promises.stat(filePath).catch(() => null));
  if (!stat || !stat.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
    return;
  }

  const ext = path.extname(filePath);
  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    // Segments must always go through the throttle; a cached copy would hide it.
    'Cache-Control': 'no-store',
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range && (ext === '.mp4' || ext === '.webm')) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    res.writeHead(206, {
      ...headers,
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, 'Accept-Ranges': 'bytes', 'Content-Length': stat.size });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  if (ext === '.ts' || ext === '.m4s') await sendThrottled(res, filePath, stat.size);
  else fs.createReadStream(filePath).pipe(res);
}

async function serveStatic(req, res, urlPath) {
  let filePath = safeResolve(WEB_DIR, urlPath);
  let stat = filePath && (await fs.promises.stat(filePath).catch(() => null));
  if (stat?.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    stat = await fs.promises.stat(filePath).catch(() => null);
  }
  if (!stat || !stat.isFile()) {
    filePath = path.join(WEB_DIR, 'index.html');
    stat = await fs.promises.stat(filePath).catch(() => null);
  }
  if (!stat) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Interface não compilada. Rode: pnpm build');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, urlPath) {
  if (urlPath === '/api/bandwidth' && req.method === 'GET') {
    return sendJson(res, 200, { kbps: bandwidthKbps });
  }

  if (urlPath === '/api/bandwidth' && (req.method === 'POST' || req.method === 'PUT')) {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return sendJson(res, 400, { error: 'JSON inválido' });
    }
    const kbps = Number(payload?.kbps);
    const unlimited = kbps === 0;
    if (!Number.isFinite(kbps) || (!unlimited && (kbps < MIN_KBPS || kbps > MAX_KBPS))) {
      return sendJson(res, 400, { error: `kbps deve ser 0 (sem limite) ou entre ${MIN_KBPS} e ${MAX_KBPS}` });
    }
    bandwidthKbps = Math.round(kbps);
    console.log(`[rede] limite: ${bandwidthKbps === 0 ? 'sem limite' : `${bandwidthKbps} kbit/s`}`);
    return sendJson(res, 200, { kbps: bandwidthKbps });
  }

  return sendJson(res, 404, { error: 'rota inexistente' });
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    if (pathname.startsWith('/media/')) return await serveMedia(req, res, pathname);
    return await serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('erro interno');
  }
});

server.listen(PORT, () => {
  const hasMedia = fs.existsSync(path.join(MEDIA_DIR, 'master.m3u8'));
  console.log(`Servidor em http://localhost:${PORT}`);
  if (!hasMedia) console.warn('Vídeo não encontrado em ./media. Rode: pnpm video');
});
