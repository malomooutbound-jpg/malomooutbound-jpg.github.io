const assert = require('assert');
const { buatLingkungan } = require('./gas-mock');
let lulus = 0;
function uji(nama, fn) { fn(); lulus++; console.log('✓ ' + nama); }

const env = buatLingkungan();
const g = env.ctx;

uji('setup membuat semua sheet, pengaturan & katalog', () => {
  const log = g.setup();
  ['Pengaturan', 'Katalog', 'Pesanan', 'Kru', 'Anggota', 'Invoice', 'Pembayaran'].forEach(n => assert.ok(env.sheets[n], n));
  assert.ok(!env.sheets.Sheet1, 'Sheet1 kosong dihapus');
  g.Db.bersihkanCache(); g.resetSettings_();
  assert.strictEqual(g.setting_('persen_kas'), '25');
  assert.strictEqual(g.setting_('admin_email'), 'malomooutbound@gmail.com');
  assert.ok(g.Db.baca('Katalog').length >= 25);
  // jalankan ulang tidak menggandakan
  g.setup(); g.Db.bersihkanCache();
  assert.strictEqual(g.Db.baca('Pengaturan').filter(r => r.kunci === 'persen_kas').length, 1);
  assert.ok(log.length > 5);
});

uji('API katalog publik', () => {
  const r = g.apiKatalog_();
  assert.ok(r.ok);
  assert.ok(r.katalog.find(k => k.id === 'pk-class'));
  assert.strictEqual(r.info.wa1, '6287779092032');
});

let kode;
uji('Terima pesanan dari website, harga dihitung ulang di server', () => {
  const r = g.terimaPesanan_({ nama: 'Pak Rahman', instansi: 'SDIT Al Fikri', wa: '0812 3456 7890', tgl_mulai: '2026-11-20',
    jumlah_hari: 1, lokasi: 'Maros', peserta: 60,
    pilihan: [{ id: 'ob-sd', qty: 60, harga: 1 /* dicoba dimanipulasi */ }, { id: 'ks-reguler', qty: 60 }, { id: 'pk-class', qty: 40 }] });
  assert.ok(r.ok, r.pesan);
  kode = r.kode;
  assert.ok(/^MLM-\d{4}-001$/.test(kode), kode);
  assert.strictEqual(r.total, 60 * 50000 + 60 * 80000 + 60 * 155000);
  g.Db.bersihkanCache();
  const p = g.Db.baca('Pesanan')[0];
  assert.strictEqual(p.status, 'Baru');
  const items = JSON.parse(p.items_json);
  assert.strictEqual(items.filter(i => i.paket === 'Class Meeting').length, 2);
  assert.strictEqual(items.find(i => i.kode === 'ks-reguler').modal, '', 'modal Reguler kosong');
  assert.ok(!JSON.stringify(g.apiKatalog_()).includes('modal'), 'modal tidak bocor ke API publik');
  assert.strictEqual(String(p.wa), '081234567890');
});

uji('Pesanan ditolak bila di bawah minimal peserta', () => {
  const r = g.terimaPesanan_({ nama: 'X', wa: '081200000001', peserta: 10, pilihan: [{ id: 'ob-sd', qty: 10 }] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.pesan.includes('minimal'));
});

uji('Batas spam per nomor WA', () => {
  const d = { nama: 'Y', wa: '081299999999', peserta: 1, pilihan: [{ id: 'ks-hemat', qty: 1 }] };
  for (let i = 0; i < 3; i++) assert.ok(g.terimaPesanan_(d).ok);
  assert.strictEqual(g.terimaPesanan_(d).ok, false);
});

uji('Honeypot bot tidak tersimpan', () => {
  g.Db.bersihkanCache();
  const n = g.Db.baca('Pesanan').length;
  g.terimaPesanan_({ nama: 'bot', wa: '081211111111', situs: 'http://spam', pilihan: [{ id: 'ks-hemat', qty: 1 }] });
  g.Db.bersihkanCache();
  assert.strictEqual(g.Db.baca('Pesanan').length, n);
});

uji('doPost aksi pesan mengembalikan JSON', () => {
  const out = g.doPost({ postData: { contents: JSON.stringify({ aksi: 'pesan', data: { nama: 'Bu Sari', wa: '081377777777', peserta: 35, pilihan: [{ id: 'ob-fun', qty: 35 }] } }) } });
  const r = JSON.parse(out.isi);
  assert.ok(r.ok, r.pesan);
});

uji('Admin: akses ditolak untuk akun bukan admin / tanpa login', () => {
  env.user.aktif = ''; env.user.efektif = 'malomooutbound@gmail.com';
  assert.throws(() => g.adminInit(), /AKSES/);
  env.user.aktif = 'orang@gmail.com'; env.user.efektif = 'orang@gmail.com';
  assert.throws(() => g.adminInit(), /belum terdaftar/);
  env.user.aktif = 'orang@gmail.com'; env.user.efektif = 'malomooutbound@gmail.com';
  assert.throws(() => g.adminInit(), /deployment/);
  env.user.aktif = env.user.efektif = 'malomooutbound@gmail.com';
});

let anggota;
uji('Admin: anggota, kru, simpan pesanan', () => {
  const d = g.adminInit();
  assert.ok(d.pesanan.length >= 5);
  anggota = ['Ahmad', 'Budi', 'Citra', 'Dodi'].map(n => g.adminSimpanAnggota({ nama: n, aktif: true }));
  const p = d.pesanan.find(x => x.id === kode);
  p.status = 'Selesai';
  p.pembawa_id = anggota[0].id;
  p.biaya_akomodasi = 1000000;
  const items = JSON.parse(p.items_json);
  items.forEach(it => { if (it.kategori !== 'outbound') it.pengelola_id = anggota[1].id; });
  p.items_json = JSON.stringify(items);
  const s = g.adminSimpanPesanan(p);
  assert.strictEqual(s.total, 60 * 50000 + 60 * 80000 + 60 * 155000);
  g.adminSimpanKru(kode, anggota.map((a, i) => ({ anggota_id: a.id, nama: a.nama, peran: i ? 'Instruktur' : 'Koordinator', hadir: '1' })));
  g.Db.bersihkanCache();
  assert.strictEqual(g.Db.baca('Kru').filter(k => k.pesanan_id === kode).length, 4);
  // simpan ulang kru tidak menggandakan
  g.adminSimpanKru(kode, anggota.slice(0, 2).map(a => ({ anggota_id: a.id, hadir: '1|0,5' })));
  g.Db.bersihkanCache();
  assert.strictEqual(g.Db.baca('Kru').filter(k => k.pesanan_id === kode).length, 2);
  assert.throws(() => g.adminHapusAnggota(anggota[0].id), /Nonaktifkan/);
});

uji('Admin: pesanan baru dari admin dapat kode', () => {
  const s = g.adminSimpanPesanan({ nama: 'Telepon', status: 'Penawaran', items_json: JSON.stringify([{ kategori: 'outbound', nama: 'Fun Games', harga: 100000, qty: 30 }]) });
  assert.ok(/^MLM-/.test(s.id));
  assert.strictEqual(s.sumber, 'admin');
  assert.strictEqual(s.total, 3000000);
});

uji('Admin: invoice DP + pelunasan, nomor berurutan, HTML', () => {
  const r1 = g.adminBuatInvoice({ pesanan_id: kode, jenis: 'DP', jumlah: 7000000, tanggal: '2026-11-01' });
  assert.strictEqual(r1.invoice.no, 'INV/MLM/2026/001');
  assert.strictEqual(r1.invoice.jatuh_tempo, '2026-11-08');
  assert.ok(r1.html.includes('Class Meeting'));
  assert.ok(r1.html.includes('Rp17.100.000'), 'total');
  g.adminStatusInvoice(r1.invoice.no, 'Lunas', '2026-11-02');
  const r2 = g.adminBuatInvoice({ pesanan_id: kode, jenis: 'Pelunasan', jumlah: 7000000, tanggal: '2026-11-21' });
  assert.strictEqual(r2.invoice.no, 'INV/MLM/2026/002');
  assert.ok(r2.html.includes('Sudah dibayar'));
  assert.throws(() => g.adminBuatInvoice({ pesanan_id: kode, jenis: 'DP', jumlah: 0 }), /lebih dari 0/);
});

uji('Admin: pengaturan, katalog, pembayaran', () => {
  g.adminSimpanPengaturan({ persen_kas: '30', rekening: 'BSI 123 a.n. Malomo' });
  g.Db.bersihkanCache();
  assert.strictEqual(g.setting_('persen_kas'), '30');
  assert.strictEqual(g.setting_('persen_barang'), '10', 'kunci lain tetap');
  const kat = g.Db.baca('Katalog');
  kat[0].harga = 55000;
  g.adminSimpanKatalog(kat);
  g.Db.bersihkanCache();
  assert.strictEqual(g.Db.baca('Katalog')[0].harga, 55000);
  const b = g.adminCatatPembayaran({ bulan: '2026-11', anggota_id: anggota[0].id, nama: 'Ahmad', jumlah: 500000 });
  assert.ok(b.id);
  assert.ok(g.adminHapusPembayaran(b.id));
});

uji('Notifikasi email dikirim bila notif_email diisi', () => {
  assert.ok(env.surat.length >= 1);
});


uji('Keamanan: rumus Sheets dinetralkan, setup hanya pemilik, nomor tidak dipakai ulang', () => {
  const r = g.terimaPesanan_({ nama: '=HYPERLINK("http://x","klik")', wa: '081255555555', peserta: 1, pilihan: [{ id: 'ks-hemat', qty: 1 }] });
  assert.ok(r.ok);
  const sh = env.sheets.Pesanan._grid;
  const baris = sh.find(row => row && row[0] === r.kode);
  assert.ok(String(baris[4]).startsWith("'="), 'diawali apostrof');
  // qty outbound tidak boleh kurang dari peserta
  const r2 = g.terimaPesanan_({ nama: 'Q', wa: '081266666666', peserta: 50, pilihan: [{ id: 'ob-sd', qty: 1 }] });
  assert.strictEqual(r2.total, 50 * 55000); // harga ob-sd sudah diubah admin jadi 55rb
  // setup dari luar pemilik ditolak
  env.user.aktif = ''; assert.throws(() => g.setup(), /pemilik/);
  env.user.aktif = 'malomooutbound@gmail.com';
  // hapus pesanan terbaru lalu buat lagi: kode tidak terpakai ulang
  g.adminHapusPesanan(r2.kode);
  const r3 = g.terimaPesanan_({ nama: 'R', wa: '081288888888', peserta: 1, pilihan: [{ id: 'ks-hemat', qty: 1 }] });
  assert.notStrictEqual(r3.kode, r2.kode);
  // pesanan yang punya invoice tidak bisa dihapus
  assert.throws(() => g.adminHapusPesanan(kode), /invoice/);
  // selesai tanpa tanggal ditolak
  assert.throws(() => g.adminSimpanPesanan({ nama: 'Z', status: 'Selesai', items_json: '[]' }), /tanggal/);
});

console.log(`\n${lulus} tes server lulus`);
