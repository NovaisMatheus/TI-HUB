import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:https';
import { request } from 'node:http';

const directory = resolve('.local/tls');
const settings = JSON.parse(readFileSync(resolve(directory, 'config.json'), 'utf8').trim());
const allowedHosts = new Set(
  [settings.ip, settings.hostname].flatMap((host) => [host, `${host}:443`]),
);
const server = createServer(
  {
    pfx: readFileSync(resolve(directory, 'server.pfx')),
    passphrase: readFileSync(resolve(directory, 'password.txt'), 'utf8').trim(),
    minVersion: 'TLSv1.2',
  },
  (req, res) => {
    if (
      !allowedHosts.has(req.headers.host) ||
      !req.url?.startsWith('/') ||
      req.url.startsWith('//')
    ) {
      res.writeHead(400).end('Endereço inválido.');
      return;
    }
    const upstream = request(
      {
        hostname: '127.0.0.1',
        port: 5173,
        method: req.method,
        path: req.url,
        headers: { ...req.headers, 'x-forwarded-proto': 'https' },
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.setTimeout(30000, () => upstream.destroy());
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end('Hub indisponível. Verifique pnpm dev no servidor.');
    });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  },
);
server.on('upgrade', (req, socket, head) => {
  if (
    !allowedHosts.has(req.headers.host) ||
    !req.url?.startsWith('/') ||
    req.url.startsWith('//')
  ) {
    socket.destroy();
    return;
  }
  const upstream = request({
    hostname: '127.0.0.1',
    port: 5173,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, 'x-forwarded-proto': 'https' },
  });
  upstream.on('upgrade', (response, peer, peerHead) => {
    const headers = response.rawHeaders.reduce(
      (text, value, index, values) =>
        index % 2 === 0 ? `${text}${value}: ${values[index + 1]}\r\n` : text,
      '',
    );
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers}\r\n`);
    if (head.length) peer.write(head);
    if (peerHead.length) socket.write(peerHead);
    peer.pipe(socket).pipe(peer);
    peer.on('error', () => socket.destroy());
    socket.on('error', () => peer.destroy());
    socket.on('close', () => peer.destroy());
  });
  upstream.on('response', () => socket.destroy());
  upstream.on('error', () => socket.destroy());
  upstream.end();
});
server.listen(443, settings.ip, () =>
  console.log(`HTTPS do Hub disponível em https://${settings.hostname}`),
);
server.on('error', (error) => {
  console.error(`Não foi possível iniciar HTTPS: ${error.code}`);
  process.exitCode = 1;
});
