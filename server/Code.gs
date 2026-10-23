/**
 * MALOMO OUTBOUND — Server (Google Apps Script, terikat ke Google Sheets "Malomo Database")
 *
 * FILE DI PROYEK INI:
 *   Code.gs      → pintu masuk (doGet / doPost) & API publik
 *   Db.gs        → baca / tulis Google Sheets
 *   AdminApi.gs  → fungsi panel admin (hanya akun admin)
 *   Invoice.gs   → nomor & PDF invoice
 *   Setup.gs     → jalankan "setup" sekali untuk membuat semua sheet
 *   Katalog.gs, Pesanan.gs, HitungServer.gs → data & hitungan bersama (jangan diubah manual)
 *   Admin.html, Hitung.html → tampilan panel admin
 *
 * DEPLOY (lihat README):
 *   1) API publik : Terapkan > Deployment baru > Aplikasi web
 *                   Jalankan sebagai: Saya  | Akses: Siapa saja
 *   2) Admin      : Deployment baru > Aplikasi web
 *                   Jalankan sebagai: Pengguna yang mengakses | Akses: Siapa saja yang memiliki Akun Google
 *      Panel admin dibuka dengan menambahkan ?page=admin di link deployment Admin.
 */

var VERSI = '1.0.0';

/* ====================================================================
 * PINTU MASUK
 * ==================================================================== */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.api === 'katalog') return json_(apiKatalog_());
    if (p.api === 'galeri') return json_(getGaleri());
    if (p.api === 'ping') return json_({ ok: true, versi: VERSI });
    if (p.page === 'admin') {
      var t = HtmlService.createTemplateFromFile('Admin');
      return t.evaluate()
        .setTitle('Admin Malomo')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
    }
  } catch (err) {
    return json_({ ok: false, pesan: String(err && err.message || err) });
  }
  // Default: arahkan ke website
  var web = setting_('website_url') || '';
  var html = web
    ? '<meta http-equiv="refresh" content="0;url=' + escapeHtml_(web) + '"><a href="' + escapeHtml_(web) + '">Buka website Malomo</a>'
    : '<p style="font-family:sans-serif">Server Malomo aktif (versi ' + VERSI + ').</p>';
  return HtmlService.createHtmlOutput(html).setTitle('Malomo Outbound');
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, pesan: 'Data tidak terbaca.' });
  }
  try {
    if (body.aksi === 'pesan') return json_(terimaPesanan_(body.data || {}));
    return json_({ ok: false, pesan: 'Aksi tidak dikenal.' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, pesan: String(err && err.message || err) });
  }
}

function include(nama) {
  return HtmlService.createHtmlOutputFromFile(nama).getContent();
}

/* ====================================================================
 * API PUBLIK
 * ==================================================================== */
function apiKatalog_() {
  var s = settings_();
  var galeri = [];
  try { galeri = getGaleri(); } catch (e) { galeri = []; }
  var heroId = s.foto_hero_id;
  return {
    ok: true,
    versi: VERSI,
    katalog: katalogPublik_(),
    galeri: galeri,
    hero: heroId ? driveThumb_(heroId, 1600) : (galeri[0] ? galeri[0].besar : ''),
    info: {
      nama: s.nama_usaha || 'Malomo Outbound',
      wa1: s.wa_admin1 || '',
      wa2: s.wa_admin2 || '',
      instagram: s.instagram || '',
      lokasi: s.alamat || '',
      booklet: infoBooklet_()
    }
  };
}

function katalogPublik_() {
  return Db.baca('Katalog')
    .filter(function (k) { return k.id && !(k.aktif === false || String(k.aktif).toUpperCase() === 'FALSE'); })
    .sort(function (a, b) { return Number(a.urutan || 0) - Number(b.urutan || 0); })
    .map(function (k) {
      return { id: String(k.id), kategori: String(k.kategori).toLowerCase(), grup: k.grup, nama: k.nama,
        harga: Number(k.harga) || 0, satuan: k.satuan, min: Number(k.min) || 1, badge: k.badge || '',
        keterangan: k.keterangan || '', komponen: k.komponen || '', tambahan: String(k.grup || '').indexOf('Tambahan') === 0 };
    });
}

/** Terima pesanan dari website. Harga dihitung ulang di server dari katalog. */
function terimaPesanan_(d) {
  if (d.situs) return { ok: true, kode: 'MLM-0' }; // honeypot: bot mengisi kolom tersembunyi
  var nama = bersih_(d.nama, 80), wa = String(d.wa || '').replace(/[^\d+]/g, '').slice(0, 20);
  if (!nama) return { ok: false, pesan: 'Nama wajib diisi.' };
  if (wa.replace(/\D/g, '').length < 9) return { ok: false, pesan: 'Nomor WhatsApp belum benar.' };

  var cache = CacheService.getScriptCache();
  var kunciWa = 'psn_' + wa;
  var jml = Number(cache.get(kunciWa) || 0);
  if (jml >= 3) return { ok: false, pesan: 'Terlalu banyak pesanan dari nomor ini. Coba lagi 10 menit lagi atau hubungi admin.' };
  var kunciMenit = 'psn_menit_' + Math.floor(Date.now() / 60000);
  var perMenit = Number(cache.get(kunciMenit) || 0);
  if (perMenit >= 15) return { ok: false, pesan: 'Server sedang ramai. Coba lagi sebentar atau hubungi admin lewat WhatsApp.' };
  cache.put(kunciMenit, String(perMenit + 1), 120);
  if (!Array.isArray(d.pilihan) || d.pilihan.length > 40) return { ok: false, pesan: 'Pilihan paket tidak valid.' };
  d.pilihan = d.pilihan.map(function (p) { return { id: String(p && p.id || '').slice(0, 40), qty: Math.min(20000, Math.max(0, Math.floor(Number(p && p.qty) || 0))) }; });

  var katalog = katalogPublik_();
  var hasil = MalomoPesanan.hitungPesanan({ peserta: d.peserta, jumlah_hari: d.jumlah_hari, pilihan: d.pilihan || [] }, katalog);
  if (hasil.galat.length) return { ok: false, pesan: hasil.galat.join(' ') };

  var modalById = {};
  Db.baca('Katalog').forEach(function (k) { modalById[k.id] = k.modal; });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var kode = kodePesanan_();
    var sekarang = new Date();
    Db.tambah('Pesanan', {
      id: kode,
      dibuat: Utilities.formatDate(sekarang, zona_(), 'yyyy-MM-dd HH:mm'),
      sumber: 'website',
      status: 'Baru',
      nama: nama,
      instansi: bersih_(d.instansi, 120),
      wa: wa,
      email: bersih_(d.email, 120),
      tgl_mulai: tanggal_(d.tgl_mulai),
      jumlah_hari: Math.max(1, Math.min(14, Math.floor(Number(d.jumlah_hari) || 1))),
      lokasi: bersih_(d.lokasi, 200),
      peserta: Math.max(0, Math.floor(Number(d.peserta) || 0)),
      catatan: bersih_(d.catatan, 1000),
      items_json: JSON.stringify(hasil.items.map(function (it) {
        return { kode: it.kode, kategori: it.kategori, nama: it.nama, harga: it.harga, qty: it.qty, satuan: it.satuan,
          paket: it.nama.indexOf(' — ') > 0 ? it.nama.split(' — ')[0] : '', pengelola_id: '', sendiri: false,
          modal: it.nama.indexOf(' — ') > 0 ? '' : (modalById[it.kode] === undefined ? '' : modalById[it.kode]) };
      })),
      total: hasil.total,
      pembawa_id: '', biaya_akomodasi: '', biaya_barang: '', override_json: '', catatan_admin: '',
      diperbarui: Utilities.formatDate(sekarang, zona_(), 'yyyy-MM-dd HH:mm')
    });
  } finally {
    lock.releaseLock();
  }
  cache.put(kunciWa, String(jml + 1), 600);

  try { kirimNotifikasi_(kode, nama, d, hasil); } catch (e) { console.warn('Notifikasi gagal: ' + e); }
  return { ok: true, kode: kode, total: hasil.total, baris: hasil.baris };
}

function kodePesanan_() {
  var bln = Utilities.formatDate(new Date(), zona_(), 'yyMM');
  var awal = 'MLM-' + bln + '-';
  var maks = 0;
  Db.baca('Pesanan').forEach(function (p) {
    var id = String(p.id || '');
    if (id.indexOf(awal) === 0) maks = Math.max(maks, Number(id.slice(awal.length)) || 0);
  });
  return awal + ('00' + nomorBerikut_('NO_PESANAN_' + bln, maks)).slice(-3);
}

function kirimNotifikasi_(kode, nama, d, hasil) {
  var email = setting_('notif_email');
  if (!email) return;
  var cache = CacheService.getScriptCache();
  var kunci = 'email_' + Utilities.formatDate(new Date(), zona_(), 'yyyyMMdd');
  var n = Number(cache.get(kunci) || 0);
  if (n >= 60) return; // batas aman kuota email harian akun Gmail
  cache.put(kunci, String(n + 1), 21600);
  var teks = 'Pesanan baru ' + kode + '\n\n' +
    'Nama: ' + nama + '\nInstansi: ' + (d.instansi || '-') + '\nWA: ' + d.wa +
    '\nTanggal: ' + (d.tgl_mulai || '-') + ' (' + (d.jumlah_hari || 1) + ' hari)\nLokasi: ' + (d.lokasi || '-') +
    '\nPeserta: ' + (d.peserta || '-') + '\n\n' +
    hasil.baris.map(function (b) { return '- ' + b.nama + ' × ' + b.qty + ' = ' + MalomoHitung.rupiah(b.subtotal); }).join('\n') +
    '\n\nEstimasi: ' + MalomoHitung.rupiah(hasil.total) + '\nCatatan: ' + (d.catatan || '-');
  MailApp.sendEmail(email, '[Malomo] Pesanan baru ' + kode + ' — ' + (d.instansi || nama), teks);
}

/* ====================================================================
 * GALERI & BOOKLET (dari Google Drive)
 * Folder galeri & file booklet harus dibagikan "Siapa saja yang memiliki link".
 * ==================================================================== */
function getGaleri() {
  var cache = CacheService.getScriptCache();
  var simpan = cache.get('galeri_v2');
  if (simpan) return JSON.parse(simpan);
  var folderId = setting_('galeri_folder_id');
  var maks = Number(setting_('galeri_maks')) || 9;
  var list = [];
  if (folderId) {
    try { kumpulkanGaleri_(DriveApp.getFolderById(folderId), list, 0); }
    catch (e) { console.error('Galeri tidak bisa dibaca: ' + e); }
  }
  list.sort(function (a, b) { return b.t - a.t; });
  list = list.slice(0, maks).map(function (f) {
    return { id: f.id, nama: f.nama, kecil: driveThumb_(f.id, 800), besar: driveThumb_(f.id, 1600) };
  });
  cache.put('galeri_v2', JSON.stringify(list), Number(setting_('galeri_cache_detik')) || 300);
  return list;
}

function kumpulkanGaleri_(folder, list, level) {
  var files = folder.getFiles();
  while (files.hasNext() && list.length < 200) {
    var f = files.next();
    if (String(f.getMimeType()).indexOf('image/') === 0) {
      list.push({ id: f.getId(), nama: f.getName().replace(/\.[^.]+$/, ''), t: f.getDateCreated().getTime() });
    }
  }
  if (level >= 2) return;
  var subs = folder.getFolders();
  while (subs.hasNext()) kumpulkanGaleri_(subs.next(), list, level + 1);
}

function driveThumb_(id, lebar) {
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (lebar || 1200);
}

function infoBooklet_() {
  var id = setting_('katalog_id');
  if (!id) return { status: 'kosong' };
  var cache = CacheService.getScriptCache();
  var simpan = cache.get('booklet_v1_' + id);
  if (simpan) return JSON.parse(simpan);
  var info = { id: id, status: 'tidak-ditemukan', nama: '',
    lihat: 'https://drive.google.com/file/d/' + id + '/view',
    unduh: 'https://drive.google.com/uc?export=download&id=' + id };
  try {
    var f = DriveApp.getFileById(id);
    info.nama = f.getName();
    if (f.isTrashed()) info.status = 'terhapus';
    else {
      var akses = f.getSharingAccess();
      info.status = (akses === DriveApp.Access.ANYONE_WITH_LINK || akses === DriveApp.Access.ANYONE) ? 'publik' : 'tertutup';
    }
  } catch (e) { info.status = 'tidak-ditemukan'; }
  cache.put('booklet_v1_' + id, JSON.stringify(info), 600);
  return info;
}

/* ====================================================================
 * UTILITAS
 * ==================================================================== */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function zona_() { return Session.getScriptTimeZone() || 'Asia/Makassar'; }
function bersih_(v, maks) { return String(v === undefined || v === null ? '' : v).replace(/[<>]/g, '').trim().slice(0, maks || 200); }
function tanggal_(v) { var s = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function escapeHtml_(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Cek cepat dari editor: pilih fungsi cekSemua lalu Jalankan, buka Log eksekusi. */
function cekSemua() {
  wajibPemilik_();
  var hasil = [];
  try { hasil.push('✅ Database: ' + Db.ss().getName()); } catch (e) { hasil.push('❌ Database tidak terbuka: ' + e); }
  try { hasil.push('✅ Katalog: ' + katalogPublik_().length + ' item aktif'); } catch (e) { hasil.push('❌ Katalog: ' + e); }
  var b = infoBooklet_();
  hasil.push((b.status === 'publik' ? '✅' : '❌') + ' Booklet: ' + b.status + (b.nama ? ' (' + b.nama + ')' : ''));
  CacheService.getScriptCache().remove('galeri_v2');
  var g = getGaleri();
  hasil.push((g.length ? '✅' : '❌') + ' Galeri: ' + g.length + ' foto');
  hasil.push('ℹ️ Admin terdaftar: ' + adminList_().join(', '));
  console.log(hasil.join('\n'));
  return hasil;
}
