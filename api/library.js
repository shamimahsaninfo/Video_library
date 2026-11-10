const { del } = require('@vercel/blob');
const { read, write, isAdmin } = require('./_store');
module.exports = async (req, res) => {
  try {
    const adm = isAdmin(req), q = req.query || {};
    if (req.method === 'GET') {
      if (q.me) return res.json({ admin: adm });
      let it = await read();
      if (!adm) it = it.filter(i => i.published).map(({ note, ...r }) => r);
      return res.json(it);
    }
    if (!adm) return res.status(401).json({ error: 'অনুমতি নেই' });
    let items = await read();
    if (req.method === 'PATCH') {
      const b = req.body || {}, i = items.find(x => x.id === b.id);
      if (!i) return res.status(404).json({ error: 'পাওয়া যায়নি' });
      ['title', 'desc', 'note'].forEach(k => { if (typeof b[k] === 'string') i[k] = b[k].slice(0, 5000); });
      if (['pending', 'checking', 'true', 'false'].includes(b.status)) i.status = b.status;
      if (typeof b.published === 'boolean') i.published = b.published;
      await write(items);
      return res.json(i);
    }
    if (req.method === 'DELETE') {
      const i = items.find(x => x.id === q.id);
      if (!i) return res.status(404).json({ error: 'পাওয়া যায়নি' });
      try { await del([i.video, i.thumb].filter(Boolean)); } catch (e) {}
      await write(items.filter(x => x !== i));
      return res.json({ ok: 1 });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: 'ডাটাবেজে সমস্যা হয়েছে' }); }
};
