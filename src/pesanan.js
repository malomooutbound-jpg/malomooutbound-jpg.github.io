/*
 * Hitung estimasi pesanan dari pilihan klien + katalog.
 * Dipakai di website (estimasi langsung) dan di server (harga resmi, klien tidak bisa mengubah harga).
 */
(function (root) {
  'use strict';

  function angka(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function pecahKomponen(teks) {
    return String(teks || '').split('|').map(function (s) {
      var p = s.split(':');
      return { kategori: (p[0] || '').trim().toLowerCase(), harga: angka(p[1]) };
    }).filter(function (k) { return k.kategori && k.harga; });
  }

  function aktif(k) { return !(k.aktif === false || String(k.aktif).toUpperCase() === 'FALSE'); }

  /**
   * data: { peserta, jumlah_hari, pilihan:[{id, qty}] }
   * return { baris:[...], items:[...] (sudah dipecah komponen), total, galat:[] }
   */
  function hitungPesanan(data, katalog) {
    var byId = {};
    (katalog || []).forEach(function (k) { if (aktif(k)) byId[k.id] = k; });
    var peserta = Math.max(0, Math.floor(angka(data.peserta)));
    var galat = [];
    var baris = [];
    var items = [];

    (data.pilihan || []).forEach(function (p) {
      var k = byId[p.id];
      if (!k) { galat.push('Item "' + p.id + '" tidak tersedia.'); return; }
      var qty = Math.max(0, Math.floor(angka(p.qty)));
      if (!qty) return;
      if ((k.kategori === 'outbound' || k.kategori === 'paket') && qty < peserta) qty = peserta; // tidak boleh kurang dari jumlah peserta
      var min = angka(k.min);
      var basisMin = (k.kategori === 'outbound' || k.kategori === 'paket') ? peserta : qty;
      if (min > 1 && basisMin < min) galat.push(k.nama + ': minimal ' + min + ' ' + (k.satuan || '') + '.');
      var subtotal = angka(k.harga) * qty;
      baris.push({ id: k.id, kategori: k.kategori, nama: k.nama, harga: angka(k.harga), qty: qty, satuan: k.satuan || '', subtotal: subtotal });

      if (k.kategori === 'paket') {
        var komp = pecahKomponen(k.komponen);
        var jumlahKomp = komp.reduce(function (s, c) { return s + c.harga; }, 0);
        if (!komp.length || jumlahKomp !== angka(k.harga)) komp = [{ kategori: 'outbound', harga: angka(k.harga) }];
        komp.forEach(function (c) {
          items.push({ kode: k.id, kategori: c.kategori, nama: k.nama + ' — ' + c.kategori, harga: c.harga, qty: qty, satuan: k.satuan || '' });
        });
      } else {
        items.push({ kode: k.id, kategori: k.kategori, nama: k.nama, harga: angka(k.harga), qty: qty, satuan: k.satuan || '' });
      }
    });

    var total = baris.reduce(function (s, b) { return s + b.subtotal; }, 0);
    if (!baris.length) galat.push('Pilih minimal satu paket atau layanan.');
    return { baris: baris, items: items, total: total, galat: galat };
  }

  var api = { hitungPesanan: hitungPesanan, pecahKomponen: pecahKomponen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MalomoPesanan = api;
})(this);
