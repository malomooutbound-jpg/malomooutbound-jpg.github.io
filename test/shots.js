const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
(async () => {
  const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'text/plain' }); r.end(d); }); }).listen(0);
  const base = `http://localhost:${srv.address().port}/`;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const n = Number(process.argv[2] || 4);
  for (const [nama, w, h] of [['hp', 390, 844], ['tab', 820, 1180], ['laptop', 1366, 768]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
    await p.route(/script\.google\.com/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, katalog: [], info: {}, hero: base + 'test/shots/img/g0.jpg', galeri: Array.from({ length: n }, (_, i) => ({ nama: 'g' + i, kecil: base + `test/shots/img/g${i % 5}.jpg`, besar: base + `test/shots/img/g${i % 5}.jpg` })) }) }));
    await p.goto(base); await p.waitForTimeout(800);
    const lebar = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log(nama, 'scrollWidth', lebar, 'viewport', w);
    await p.screenshot({ path: `test/shots/v-${nama}.png`, fullPage: true });
  }
  await b.close(); srv.close();
})();
