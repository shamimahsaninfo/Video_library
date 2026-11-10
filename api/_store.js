const { put, list } = require('@vercel/blob');
async function read() {
  const { blobs } = await list({ prefix: 'library.json' });
  if (!blobs.length) return [];
  const r = await fetch(blobs[0].url + '?t=' + Date.now());
  return r.ok ? await r.json() : [];
}
async function write(a) {
  await put('library.json', JSON.stringify(a), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0 });
}
function isAdmin(req) { const p = process.env.ADMIN_PASSWORD; return !!p && req.headers['x-admin'] === p; }
module.exports = { read, write, isAdmin };
