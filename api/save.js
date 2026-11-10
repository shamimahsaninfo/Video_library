const https = require('https');
const { put } = require('@vercel/blob');
const { read, write, isAdmin } = require('./_store');
const HOST = /(^|\.)(fbcdn\.net|fbsbx\.com|facebook\.com)$/;
const ok = u => { try { const t = new URL(u); return t.protocol === 'https:' && HOST.test(t.hostname); } catch (e) { return false; } };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'অনুমতি নেই' });
  const b = req.body || {};
  if (!ok(b.u)) return res.status(400).json({ error: 'লিংক অনুমোদিত নয়' });
  const id = Date.now().toString(36);
  try {
    const r = await new Promise((s, j) => https.get(b.u, { headers: { 'User-Agent': 'Mozilla/5.0' } },
      x => x.statusCode === 200 ? s(x) : (x.resume(), j(new Error('dl')))).on('error', j));
    const v = await put('videos/' + id + '.mp4', r, { access: 'public', contentType: 'video/mp4', addRandomSuffix: true, multipart: true });
    let thumb = '';
    if (ok(b.thumb)) {
      try {
        const t = await fetch(b.thumb), buf = Buffer.from(await t.arrayBuffer());
        thumb = (await put('thumbs/' + id + '.jpg', buf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: true })).url;
      } catch (e) {}
    }
    const items = await read();
    const item = { id, title: String(b.title || '').slice(0, 300), desc: '', note: '', status: 'pending', published: false,
      video: v.url, thumb, source: String(b.source || '').slice(0, 500), quality: String(b.label || ''), at: new Date().toISOString() };
    items.unshift(item);
    await write(items);
    res.json(item);
  } catch (e) { res.status(500).json({ error: 'সংরক্ষণ ব্যর্থ হয়েছে। ভিডিও অনেক বড় হলে সময় শেষ হয়ে যেতে পারে।' }); }
};
