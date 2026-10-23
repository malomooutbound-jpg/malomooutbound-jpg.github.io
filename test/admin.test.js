// Uji panel admin end-to-end: tampilan Admin.html + kode server (tiruan Apps Script). Jalankan: node test/admin.test.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { buatLingkungan } = require('./gas-mock');

const AS = path.join(__dirname, '..', 'server');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const STUB = `<script>
window.google = { script: { run: (function mk(ok, fail) { return new Proxy({}, { get(_, name) {
  if (name === 'withSuccessHandler') return f => mk(f, fail);
  if (name === 'withFailureHandler') return f => mk(ok, f);
  return (...args) => { window.__gas(name, JSON.stringify(args)).then(r => { const o = JSON.parse(r); setTimeout(() => o.err ? (fail && fail(new Error(o.err))) : (ok && ok(o.val)), 30); }); };
} }); })() } };
</script>`;

function halaman() {
  let html = fs.readFileSync(path.join(AS, 'Admin.html'), 'utf8');
  html = html.replace("<?!= include('Hitung'); ?>", () => fs.readFileSync(path.join(AS, 'Hitung.html'), 'utf8'))
    .replace("<?!= include('AdminJs'); ?>", () => fs.readFileSync(path.join(AS, 'AdminJs.html'), 'utf8'))
    .replace('<base target="_top">', () => '<base target="_top">' + STUB);
  assert.ok(!html.includes('<?'), 'semua include terganti');
  return html;
}

(async () => {
  const env = buatLingkungan();
  const g = env.ctx;
  g.setup();
  g.Db.bersihkanCache(); g.resetSettings_();
  const nama = ['Ahmad', 'Budi', 'Citra', 'Dodi', 'Fajar'];
  nama.forEach(n => g.adminSimpanAnggota({ nama: n, aktif: true }));
  const psn = g.terimaPesanan_({ nama: 'Pak Rahman', instansi: 'SDIT Al Fikri', wa: '081234567890', tgl_mulai: '2026-11-20', jumlah_hari: 2,
    lokasi: 'Malino', peserta: 60, pilihan: [{ id: 'ob-sd', qty: 120 }, { id: 'ks-reguler', qty: 60 }] });
  assert.ok(psn.ok);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const galat = [];
  page.on('pageerror', e => galat.push(e.message));
  await page.exposeFunction('__gas', (fn, args) => {
    try { g.Db.bersihkanCache(); g.resetSettings_(); const val = g[fn](...JSON.parse(args)); return JSON.stringify({ val: JSON.parse(JSON.stringify(val === undefined ? null : val)) }); }
    catch (e) { return JSON.stringify({ err: e.message }); }
  });
  await page.setContent(halaman());
  await page.waitForSelector('#app:not([hidden])');
  await page.waitForTimeout(200); if (!(await page.textContent('#isi')).includes('Pesanan baru')) { console.log('ISI:', (await page.textContent('#isi')).slice(0,300), galat, await page.textContent('#layar')); }
  assert.ok((await page.textContent('#isi')).includes('Pesanan baru'));
  await page.screenshot({ path: path.join(OUT, 'admin-dasbor.png') });

  // buka pesanan dari daftar
  await page.click('#menu [data-v="pesanan"]');
  await page.click(`[data-buka="${psn.kode}"]`);
  await page.waitForSelector('#k-bagi');
  // pendapatan outbound 120 x 50.000 = 6.000.000
  assert.ok((await page.textContent('#k-bagi')).includes('Rp6.000.000'));
  await page.selectOption('[data-e="status"]', 'Selesai');
  const ids = await page.$$eval('[data-e="pembawa_id"] option', o => o.map(x => x.value));
  await page.selectOption('[data-e="pembawa_id"]', ids[1]); // Ahmad
  await page.fill('[data-e="biaya_akomodasi"]', '1000000');
  // kru: semua anggota aktif, Dodi hari-2 tidak hadir, Fajar dihapus, Ahmad koordinator
  await page.click('[data-aksi="kru-semua"]');
  assert.strictEqual(await page.locator('[data-hapus-kru]').count(), 5);
  await page.click('[data-hapus-kru="4"]');
  await page.selectOption('[data-kr="0"][data-k="peran"]', 'Koordinator');
  await page.selectOption('[data-kr="3"][data-h="1"]', '0');
  // pengelola kaos = Citra
  await page.selectOption('[data-i="1"][data-k="pengelola_id"]', { label: 'Citra' });
  await page.fill('[data-i="1"][data-k="modal"]', '65000');
  const bagi = await page.textContent('#k-bagi');
  // laba = 6.000.000 - 1.000.000 - 600.000 = 4.400.000 ; instruktur 50% = 2.200.000
  assert.ok(bagi.includes('Rp4.400.000'), 'laba');
  assert.ok(bagi.includes('Rp2.200.000'), 'dana instruktur');
  // poin: Ahmad 1,5x2=3, Budi 2, Citra 2, Dodi 1 = 8 -> 275.000/poin
  assert.ok(bagi.includes('Rp825.000') && bagi.includes('Rp550.000') && bagi.includes('Rp275.000'), 'pembagian poin');
  // kaos 60 x 80.000 = 4.800.000, modal 60 x 65.000 -> laba 900.000, fee 3% = 27.000 -> 4.773.000
  assert.ok(bagi.includes('Rp27.000') && bagi.includes('Rp4.773.000'), 'hak pengelola kaos dari laba');
  await page.screenshot({ path: path.join(OUT, 'admin-proyek.png'), fullPage: true });

  await page.click('#k-bagi [data-aksi="simpan"]');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.startsWith('Tersimpan'));
  g.Db.bersihkanCache();
  const tersimpan = g.Db.baca('Pesanan').find(p => p.id === psn.kode);
  assert.strictEqual(tersimpan.status, 'Selesai');
  assert.strictEqual(Number(tersimpan.biaya_akomodasi), 1000000);
  const kru = g.Db.baca('Kru').filter(k => k.pesanan_id === psn.kode);
  assert.strictEqual(kru.length, 4);
  assert.strictEqual(kru.find(k => k.peran === 'Koordinator').hadir, '1|1');
  assert.ok(kru.some(k => k.hadir === '1|0'));

  // invoice DP -> popup
  await page.waitForSelector('#inv-jumlah');
  assert.strictEqual(await page.inputValue('#inv-jumlah'), String(Math.round(10800000 * 0.5 / 1000) * 1000));
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('[data-aksi="buat-invoice"]')]);
  await popup.waitForFunction(() => document.body && document.body.innerText.includes('INVOICE'));
  assert.ok((await popup.content()).includes('INV/MLM/2026/001'));
  await popup.setViewportSize({ width: 900, height: 1200 });
  await popup.screenshot({ path: path.join(OUT, 'admin-invoice.png'), fullPage: true });
  await popup.close();
  await page.waitForSelector('[data-inv-status]');
  await page.click('[data-inv-status]');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('lunas'));
  g.Db.bersihkanCache();
  assert.strictEqual(g.Db.baca('Invoice')[0].status, 'Lunas');

  // rekap November 2026
  await page.click('[data-aksi="kembali"]');
  await page.click('#menu [data-v="rekap"]');
  await page.fill('#bulan', '2026-11');
  await page.dispatchEvent('#bulan', 'change');
  const rekap = await page.textContent('#isi');
  // kas bersama 20% x 4.400.000 = 880.000 / 5 anggota aktif = 176.000
  assert.ok(rekap.includes('Rp880.000') && rekap.includes('Rp176.000'), 'kas bersama rata');
  await page.click('[data-bayar]');
  await page.click('[data-bayar-ok]');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('dicatat'));
  await page.screenshot({ path: path.join(OUT, 'admin-rekap.png'), fullPage: true });

  // pengaturan: persen tidak 100% ditolak
  await page.click('#menu [data-v="pengaturan"]');
  await page.fill('[data-set="persen_kas"]', '30');
  await page.click('[data-aksi="simpan-pengaturan"]');
  assert.ok((await page.textContent('#toast')).includes('harus 100%'));
  await page.fill('[data-set="persen_kas"]', '25');
  await page.fill('[data-set="rekening"]', 'BSI 7123456789 a.n. Malomo Outbound');
  await page.click('[data-aksi="simpan-pengaturan"]');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Pengaturan tersimpan'));
  g.Db.bersihkanCache(); g.resetSettings_();
  assert.strictEqual(g.setting_('rekening'), 'BSI 7123456789 a.n. Malomo Outbound');

  // katalog
  await page.click('#menu [data-v="katalog"]');
  await page.fill('[data-kt="0"][data-k="harga"]', '55000');
  await page.click('[data-aksi="simpan-katalog"]');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Katalog tersimpan'));
  g.Db.bersihkanCache();
  assert.strictEqual(g.Db.baca('Katalog')[0].harga, 55000);

  // anggota
  await page.click('#menu [data-v="anggota"]');
  await page.fill('#a-nama', 'Gilang');
  await page.click('[data-aksi="simpan-anggota"]');
  await page.waitForFunction(() => document.querySelector('#isi').textContent.includes('Gilang'));

  // pesanan baru dari admin
  await page.click('#menu [data-v="pesanan"]');
  await page.click('[data-aksi="pesanan-baru"]');
  await page.fill('[data-e="instansi"]', 'Kantor Dinas X');
  await page.selectOption('#tambah-kat', 'ob-tb');
  await page.fill('#tambah-qty', '40');
  await page.click('[data-aksi="tambah-item"]');
  await page.click('.head [data-aksi="simpan"]');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.startsWith('Tersimpan'));

  // HP
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#menu [data-v="dasbor"]');
  const lebar = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(lebar[0] <= lebar[1] + 1, 'tanpa scroll horizontal di HP ' + lebar);
  await page.screenshot({ path: path.join(OUT, 'admin-hp.png'), fullPage: true });

  // akses ditolak untuk non-admin
  env.user.aktif = env.user.efektif = 'tamu@gmail.com';
  const p2 = await ctx.newPage();
  await p2.exposeFunction('__gas', (fn, args) => { try { return JSON.stringify({ val: g[fn](...JSON.parse(args)) }); } catch (e) { return JSON.stringify({ err: e.message }); } });
  await p2.setContent(halaman());
  await p2.waitForFunction(() => document.querySelector('#layar').textContent.includes('Tidak bisa membuka'));
  assert.ok((await p2.textContent('#layar')).includes('belum terdaftar'));

  await browser.close();
  if (galat.length) { console.error(galat); process.exit(1); }
  console.log('✓ tes panel admin lulus (pesanan, kru per hari, pembagian, invoice, rekap, pengaturan, katalog, anggota, akses)');
})().catch(e => { console.error(e); process.exit(1); });
