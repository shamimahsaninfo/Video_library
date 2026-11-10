const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const lib = require('./api/library');
const save = require('./api/save');
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const OK = /^https:\/\/([a-z0-9-]+\.)?(facebook\.com|fb\.watch|fb\.com)\//i;
app.all('/api/library', lib);
app.post('/api/save', save);
app.get('/api/info', (req, res) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || req.query.key !== pw) return res.status(401).json({ error: 'পাসওয়ার্ড ভুল' });
  const url = String(req.query.url || '');
  if (!OK.test(url)) return res.status(400).json({ error: 'শুধু ফেসবুকের লিংক চলবে' });
  execFile('yt-dlp', ['-J', '--no-playlist', '--no-warnings', '--', url], { maxBuffer: 50 * 1024 * 1024, timeout: 90000 }, (err, out) => {
    if (err) return res.status(422).json({ error: 'ভিডিও আনা যায়নি। ভিডিওটি পাবলিক কিনা দেখুন।' });
    const j = JSON.parse(out);
    const fm = (j.formats || [])
      .filter(f => f.url && f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none')
      .map(f => ({ height: f.height || 0, label: f.height ? f.height + 'p' : String(f.format_note || f.format_id || 'ভিডিও'), url: f.url, size: f.filesize || f.filesize_approx || 0 }))
      .sort((a, b) => b.height - a.height);
    if (!fm.length && j.url) fm.push({ height: j.height || 0, label: 'ভিডিও', url: j.url, size: 0 });
    res.json({ title: j.title || '', thumbnail: j.thumbnail || '', formats: fm, preview: fm.length ? fm[fm.length - 1].url : '' });
  });
});
app.listen(process.env.PORT || 3000, () => console.log('running'));
