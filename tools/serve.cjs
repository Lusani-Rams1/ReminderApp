// Local static preview of the working website copy.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  let relative;
  try { relative = decodeURIComponent(new URL(request.url, 'http://localhost:5500').pathname); }
  catch (_) { response.writeHead(400); response.end('Invalid path'); return; }
  if (relative === '/') relative = '/login.html';
  const file = path.resolve(root, '.' + relative);
  const type = types[path.extname(file).toLowerCase()];
  if (!file.startsWith(root + path.sep) || !type || relative.split('/').some(part => part.startsWith('.') || part === 'node_modules')) {
    response.writeHead(404); response.end('Not found'); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); response.end(data);
  });
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(5500, '127.0.0.1', () => console.log('Firebase website: http://localhost:5500/login.html'));
