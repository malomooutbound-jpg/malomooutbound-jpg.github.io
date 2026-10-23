const assert = require('assert');
const H = require('../src/hitung.js');
let lulus = 0;
function uji(nama, fn) { fn(); lulus++; console.log('✓ ' + nama); }

uji('Contoh dasar Rp3 juta, 4 instruktur 1 hari, ada pembawa order', () => {
  const p = { items: [{ kategori: 'outbound', nama: 'SD', harga: 50000, qty: 60 }], pembawa_id: 'A1' };
  const kru = ['A1', 'A2', 'A3', 'A4'].map(id => ({ anggota_id: id, peran: 'Instruktur', hadir: '1' }));
  const h = H.hitungProyek(p, kru, {});
  assert.strictEqual(h.pendapatanOutbound, 3000000);
  assert.strictEqual(h.akomodasi, 300000);
  assert.strictEqual(h.barang, 300000);
  assert.strictEqual(h.laba, 2400000);
  assert.deepStrictEqual(h.pos, { kas: 600000, pembawa: 120000, instruktur: 1200000, kasBersama: 480000 });
  h.kru.forEach(k => assert.strictEqual(k.diterima, 300000));
  const a1 = h.perAnggota.find(x => x.anggota_id === 'A1');
  assert.strictEqual(a1.total, 420000);
  assert.strictEqual(h.peringatan.length, 0);
});

uji('Akomodasi manual 1 juta (bensin 500rb + makan 500rb)', () => {
  const p = { items: [{ kategori: 'outbound', harga: 50000, qty: 60 }], pembawa_id: 'A1', biaya_akomodasi: '1.000.000' };
  const kru = ['A1', 'A2', 'A3', 'A4'].map(id => ({ anggota_id: id, peran: 'Instruktur', hadir: 1 }));
  const h = H.hitungProyek(p, kru, {});
  assert.strictEqual(h.laba, 1700000);
  assert.deepStrictEqual(h.pos, { kas: 425000, pembawa: 85000, instruktur: 850000, kasBersama: 340000 });
  h.kru.forEach(k => assert.strictEqual(k.diterima, 212500));
});

uji('Tanpa pembawa order: 5% masuk kas Malomo', () => {
  const p = { items: [{ kategori: 'outbound', harga: 50000, qty: 60 }] };
  const h = H.hitungProyek(p, [{ anggota_id: 'A', hadir: '1' }], {});
  assert.strictEqual(h.pos.pembawa, 0);
  assert.strictEqual(h.pos.kas, 720000);
});

uji('Outbound 2 hari, D hanya 1 hari (dana instruktur 2,1 juta)', () => {
  // laba 4.200.000 -> 50% = 2.100.000
  const p = { items: [{ kategori: 'outbound', harga: 4200000, qty: 1 }], biaya_akomodasi: 0, biaya_barang: 0 };
  const kru = [
    { anggota_id: 'A', hadir: '1|1' }, { anggota_id: 'B', hadir: '1|1' },
    { anggota_id: 'C', hadir: '1|1' }, { anggota_id: 'D', hadir: '1|0' }];
  const h = H.hitungProyek(p, kru, {});
  assert.strictEqual(h.pos.instruktur, 2100000);
  assert.deepStrictEqual(h.kru.map(k => k.diterima), [600000, 600000, 600000, 300000]);
});

uji('Bobot koordinator 1,5 dan setengah hari', () => {
  const p = { items: [{ kategori: 'outbound', harga: 6000000, qty: 1 }], biaya_akomodasi: 0, biaya_barang: 0 };
  const kru = [
    { anggota_id: 'A', peran: 'Koordinator', hadir: '1|1|1' }, { anggota_id: 'B', peran: 'Instruktur', hadir: '1|1|1' },
    { anggota_id: 'C', peran: 'Instruktur', hadir: '1|1|1' }, { anggota_id: 'D', peran: 'Instruktur', hadir: '0,5|0,5|0,5' }];
  const h = H.hitungProyek(p, kru, {});
  assert.strictEqual(h.totalPoin, 12);
  assert.deepStrictEqual(h.kru.map(k => k.diterima), [1125000, 750000, 750000, 375000]);
});

uji('Nominal manual satu kru, sisanya dibagi poin', () => {
  const p = { items: [{ kategori: 'outbound', harga: 2000000, qty: 1 }], biaya_akomodasi: 0, biaya_barang: 0 };
  const kru = [{ anggota_id: 'A', hadir: '1', manual: 400000 }, { anggota_id: 'B', hadir: '1' }, { anggota_id: 'C', hadir: '1' }];
  const h = H.hitungProyek(p, kru, {});
  assert.deepStrictEqual(h.kru.map(k => k.diterima), [400000, 300000, 300000]);
});

uji('Pembagian sisa rupiah tetap tepat total', () => {
  const p = { items: [{ kategori: 'outbound', harga: 1000000, qty: 1 }], biaya_akomodasi: 0, biaya_barang: 0 };
  const kru = [{ anggota_id: 'A', hadir: '1' }, { anggota_id: 'B', hadir: '1' }, { anggota_id: 'C', hadir: '1' }];
  const h = H.hitungProyek(p, kru, {});
  assert.strictEqual(h.kru.reduce((s, k) => s + k.diterima, 0), h.pos.instruktur);
  assert.strictEqual(h.instrukturBelumTerbagi, 0);
});

uji('Fee layanan 3% dari LABA (harga - modal), 1,5% bila dibawa sendiri', () => {
  const p = { items: [
    { kategori: 'kaos', nama: 'Kaos Hemat', harga: 65000, modal: 55000, qty: 60, pengelola_id: 'K' },
    { kategori: 'catering', nama: 'Hemat', harga: 15000, modal: 10000, qty: 60, pengelola_id: 'C', sendiri: true },
    { kategori: 'dokumentasi', nama: 'Foto & Reels', harga: 750000, modal: 500000, qty: 1, pengelola_id: 'D' },
    { kategori: 'jersey', nama: 'Jersey Basic', harga: 80000, modal: 65000, qty: 1, pengelola_id: 'J' }] };
  const h = H.hitungProyek(p, [], {});
  assert.strictEqual(h.layanan[0].laba, 600000);
  assert.strictEqual(h.layanan[0].fee, 18000);           // 3% x (65rb-55rb) x 60
  assert.strictEqual(h.layanan[0].untukPengelola, 3882000);
  assert.strictEqual(h.layanan[1].fee, 4500);            // 1,5% x 5rb x 60
  assert.strictEqual(h.layanan[2].fee, 7500);            // 3% x 250rb
  assert.strictEqual(h.layanan[3].fee, 450);             // 3% x 15rb (contoh user)
  assert.strictEqual(h.feeLayanan, 30450);
  assert.strictEqual(h.pendapatanOutbound, 0);
  assert.strictEqual(h.peringatan.length, 0);
});

uji('Modal belum diisi: fee 0 dan ada peringatan', () => {
  const h = H.hitungProyek({ items: [{ kategori: 'kaos', nama: 'Kaos Reguler', harga: 80000, qty: 10, pengelola_id: 'K' }] }, [], {});
  assert.strictEqual(h.layanan[0].fee, 0);
  assert.strictEqual(h.layanan[0].untukPengelola, 800000);
  assert.ok(h.peringatan.some(s => s.includes('Modal')));
});

uji('Paket gabungan: outbound + kaos dipisah', () => {
  const p = { items: [
    { kategori: 'outbound', nama: 'Class Meeting (outbound)', harga: 75000, qty: 40 },
    { kategori: 'kaos', nama: 'Class Meeting (kaos)', harga: 80000, modal: 60000, qty: 40, pengelola_id: 'K' }] };
  const h = H.hitungProyek(p, [{ anggota_id: 'A', hadir: '1' }], {});
  assert.strictEqual(h.pendapatanOutbound, 3000000);
  assert.strictEqual(h.pendapatanLayanan, 3200000);
  assert.strictEqual(h.feeLayanan, 24000);
  assert.strictEqual(h.kasMalomoTotal, h.pos.kas + 24000);
});

uji('Override persen per proyek', () => {
  const p = { items: [{ kategori: 'outbound', harga: 1000000, qty: 1 }], biaya_akomodasi: 0, biaya_barang: 0,
    override: { persen_instruktur: 55, persen_kas_bersama: 15 } };
  const h = H.hitungProyek(p, [{ anggota_id: 'A', hadir: 1 }], {});
  assert.strictEqual(h.pos.instruktur, 550000);
  assert.strictEqual(h.pos.kasBersama, 150000);
  assert.strictEqual(h.pos.kas, 300000);
});

uji('Proyek rugi tidak membagikan apa pun', () => {
  const p = { items: [{ kategori: 'outbound', harga: 500000, qty: 1 }], biaya_akomodasi: 700000 };
  const h = H.hitungProyek(p, [{ anggota_id: 'A', hadir: 1 }], {});
  assert.ok(h.laba < 0);
  assert.deepStrictEqual(h.pos, { kas: 0, pembawa: 0, instruktur: 0, kasBersama: 0 });
  assert.ok(h.peringatan.some(s => s.includes('rugi')));
});

uji('Rekap bulan: kas bersama dibagi rata ke anggota aktif', () => {
  const anggota = Array.from({ length: 10 }, (_, i) => ({ id: 'M' + i, nama: 'Anggota ' + i, aktif: true }));
  anggota.push({ id: 'X', nama: 'Nonaktif', aktif: false });
  // tiga proyek dengan kas bersama 480rb + 300rb + 720rb = 1,5 jt
  const mk = (id, laba) => ({ id, status: 'Selesai', tgl_mulai: '2026-11-10',
    items: [{ kategori: 'outbound', harga: laba, qty: 1 }], biaya_akomodasi: 0, biaya_barang: 0 });
  const pesanan = [mk('P1', 2400000), mk('P2', 1500000), mk('P3', 3600000),
    Object.assign(mk('P4', 9000000), { status: 'Penawaran' }),
    Object.assign(mk('P5', 9000000), { tgl_mulai: '2026-12-01' })];
  const kru = [{ pesanan_id: 'P1', anggota_id: 'M0', hadir: '1' }];
  const r = H.rekapBulan('2026-11', { pesanan, kru, anggota }, {});
  assert.strictEqual(r.proyek.length, 3);
  assert.strictEqual(r.total.kasBersama, 1500000);
  assert.strictEqual(r.jumlahAnggotaAktif, 10);
  r.anggota.forEach(a => assert.strictEqual(a.kasBersama, 150000));
  assert.ok(!r.anggota.find(a => a.anggota_id === 'X'));
  const m0 = r.anggota.find(a => a.anggota_id === 'M0');
  assert.strictEqual(m0.instruktur, 1200000);
  assert.strictEqual(m0.total, 1350000);
});

uji('Parsing angka format Indonesia', () => {
  assert.strictEqual(H.num('Rp1.500.000'), 1500000);
  assert.strictEqual(H.num('1,5'), 1.5);
  assert.strictEqual(H.num(''), 0);
  assert.strictEqual(H.rupiah(1234567), 'Rp1.234.567');
});

console.log(`\n${lulus} tes lulus`);
