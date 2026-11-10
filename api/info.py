from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json, os, re
import yt_dlp

OK = re.compile(r'^https://([a-z0-9-]+\.)?(facebook\.com|fb\.watch|fb\.com)/', re.I)

class handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        q = parse_qs(urlparse(self.path).query)
        url = q.get('url', [''])[0]
        key = q.get('key', [''])[0]
        pw = os.environ.get('ADMIN_PASSWORD', '')
        if not pw or key != pw:
            return self._send(401, {'error': 'পাসওয়ার্ড ভুল'})
        if not OK.match(url):
            return self._send(400, {'error': 'শুধু ফেসবুকের লিংক চলবে'})
        try:
            opts = {'quiet': True, 'no_warnings': True, 'noplaylist': True, 'skip_download': True}
            with yt_dlp.YoutubeDL(opts) as y:
                j = y.extract_info(url, download=False)
        except Exception:
            return self._send(422, {'error': 'ভিডিও আনা যায়নি। ভিডিওটি পাবলিক কিনা দেখুন।'})
        out = []
        for f in j.get('formats') or []:
            if f.get('url') and f.get('vcodec') not in (None, 'none') and f.get('acodec') not in (None, 'none'):
                h = f.get('height') or 0
                out.append({'height': h,
                            'label': (str(h) + 'p') if h else str(f.get('format_note') or f.get('format_id') or 'ভিডিও'),
                            'url': f['url'],
                            'size': f.get('filesize') or f.get('filesize_approx') or 0})
        if not out and j.get('url'):
            out.append({'height': j.get('height') or 0, 'label': 'ভিডিও', 'url': j['url'], 'size': 0})
        out.sort(key=lambda x: -x['height'])
        self._send(200, {'title': j.get('title') or '', 'thumbnail': j.get('thumbnail') or '',
                         'formats': out, 'preview': out[-1]['url'] if out else ''})
