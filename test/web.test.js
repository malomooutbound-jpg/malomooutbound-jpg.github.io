// Uji tampilan & alur website dengan Chromium. Jalankan: node test/web.test.js
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const TYPE = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (f.endsWith('/')) f += 'index.html';
      fs.readFile(f, (e, d) => { if (e) { rsp.writeHead(404); return rsp.end(); } rsp.writeHead(200, { 'Content-Type': TYPE[path.extname(f)] || 'text/plain' }); rsp.end(d); });
    }).listen(0, () => res(s));
  });
}

(async () => {
  const srv = await serve();
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' }).catch(() => chromium.launch());
  const galat = [];

  for (const [nama, vp] of [['desktop', { width: 1366, height: 860 }], ['hp', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => galat.push(nama + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_FAILED/.test(m.text())) galat.push(nama + ' console: ' + m.text()); });
    // blokir font eksternal agar tes stabil
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    // mode API: tiru server Apps Script
    let dikirim = null;
    await page.route(/script\.google\.com/, async r => {
      if (r.request().method() === 'POST') { dikirim = JSON.parse(r.request().postData()); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, kode: 'MLM-2611-007', total: 1 }) }); }
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: false }) });
    });
    await page.addInitScript(() => { window.__API = true; });
    await page.goto(base);
    await page.evaluate(() => { window.MALOMO_CONFIG.API_URL = 'https://script.google.com/macros/s/TES/exec'; });
    await page.waitForTimeout(300);

    // tidak ada scroll horizontal
    const lebar = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert.ok(lebar[0] <= lebar[1] + 1, `${nama}: scroll horizontal ${lebar}`);

    await page.screenshot({ path: path.join(OUT, `${nama}-atas.png`) });
    assert.strictEqual(await page.locator('#kartu-outbound .card').count(), 3);
    await page.click('[data-tab-ob="Umum & instansi"]');
    assert.strictEqual(await page.locator('#kartu-outbound .card').count(), 3);
    assert.strictEqual(await page.locator('#kartu-paket .card').count(), 3);

    // pilih Class Meeting dari kartu -> builder
    await page.click('#kartu-paket [data-pilih="pk-class"]');
    await page.waitForTimeout(400);
    assert.strictEqual(await page.inputValue('#peserta'), '50');
    // tambah kaos dari tab layanan
    await page.click('[data-tab-ly="catering"]');
    await page.click('#kartu-layanan [data-tambah="ct-standar"]');
    await page.waitForTimeout(300);
    await page.fill('#peserta', '60');
    await page.selectOption('#jumlah_hari', '2');
    const total = await page.textContent('#ringkasan-total');
    // Class Meeting 60 x 155.000 + catering 60 x 2 x 20.000 = 9.300.000 + 2.400.000
    assert.strictEqual(total.trim(), 'Rp11.700.000', `${nama} total ${total}`);

    // di bawah minimal
    await page.fill('#peserta', '20');
    const g = await page.textContent('#ringkasan-galat');
    assert.ok(/minimal 40/.test(g), g);
    await page.fill('#peserta', '60');

    await page.locator('#rancang').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `${nama}-rancang.png`), fullPage: false });

    // kirim tanpa nama -> galat
    await page.click('#btn-kirim');
    assert.ok(/Nama wajib/.test(await page.textContent('#ringkasan-galat')));
    await page.fill('#nama', 'Pak Rahman');
    await page.fill('#instansi', 'SDIT Al Fikri');
    await page.fill('#wa', '081234567890');
    await page.fill('#lokasi', 'Maros');
    await page.click('#btn-kirim');
    await page.waitForSelector('#modal-sukses[open]');
    assert.ok(dikirim && dikirim.aksi === 'pesan');
    assert.deepStrictEqual(dikirim.data.pilihan.map(p => p.id), ['pk-class', 'ct-standar']);
    assert.ok((await page.textContent('#sukses-teks')).includes('MLM-2611-007'));
    const wa = await page.getAttribute('#sukses-wa', 'href');
    assert.ok(wa.startsWith('https://wa.me/6287779092032?text=') && decodeURIComponent(wa).includes('Estimasi total: Rp11.700.000'));
    await page.screenshot({ path: path.join(OUT, `${nama}-sukses.png`) });
    await page.click('[data-tutup]');
    await page.screenshot({ path: path.join(OUT, `${nama}-penuh.png`), fullPage: true });
    await ctx.close();
  }

  // mode tanpa API: langsung WhatsApp
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(base);
  await page.evaluate(() => { window.MALOMO_CONFIG.API_URL = ''; });
  await page.fill('#nama', 'Bu Sari'); await page.fill('#wa', '081377777777');
  await page.click('#btn-kirim');
  await page.waitForSelector('#modal-sukses[open]');
  assert.ok((await page.textContent('#sukses-judul')).includes('Satu langkah'));
  await ctx.close();

  await browser.close(); srv.close();
  if (galat.length) { console.error(galat.join('\n')); process.exit(1); }
  console.log('✓ tes website lulus (desktop + hp + tanpa API). Tangkapan layar di test/shots/');
})().catch(e => { console.error(e); process.exit(1); });
