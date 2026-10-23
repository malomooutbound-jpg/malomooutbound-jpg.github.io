/* ====================================================================
 * PANEL ADMIN — semua fungsi di sini hanya untuk akun admin.
 * Dipanggil dari Admin.html lewat google.script.run.
 * ==================================================================== */
var STATUS_PESANAN = ['Baru', 'Penawaran', 'DP', 'Berjalan', 'Selesai', 'Lunas', 'Batal'];

function adminList_() {
  var list = String(setting_('admin_email') || '').split(/[,;\s]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(String);
  var pemilik = PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL');
  if (pemilik && list.indexOf(pemilik) < 0) list.push(pemilik);
  return list;
}

/** Pastikan yang memanggil adalah admin yang login dengan akun Google-nya sendiri. */
function requireAdmin_() {
  var aktif = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  var efektif = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!aktif) throw new Error('AKSES: Silakan login dengan akun Google admin Malomo, lalu buka link panel admin.');
  if (aktif !== efektif) throw new Error('AKSES: Buka panel admin lewat link deployment "Admin" (bukan link API publik).');
  if (adminList_().indexOf(aktif) < 0) throw new Error('AKSES: Akun ' + aktif + ' belum terdaftar sebagai admin. Minta pemilik menambahkan email ini di Pengaturan > admin_email dan membagikan Google Sheets sebagai Editor.');
  return aktif;
}

function sekarang_() { return Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd HH:mm'); }

/** Semua data untuk panel admin (data kecil, dihitung di browser). */
function adminInit() {
  var user = requireAdmin_();
  return {
    user: user,
    versi: VERSI,
    status: STATUS_PESANAN,
    pengaturan: Db.baca('Pengaturan'),
    katalog: Db.baca('Katalog'),
    pesanan: Db.baca('Pesanan'),
    kru: Db.baca('Kru'),
    anggota: Db.baca('Anggota'),
    invoice: Db.baca('Invoice'),
    pembayaran: Db.baca('Pembayaran'),
    apiUrl: (function () { try { return ScriptApp.getService().getUrl(); } catch (e) { return ''; } })()
  };
}

/* ---------- Pesanan / proyek ---------- */
function adminSimpanPesanan(p) {
  requireAdmin_();
  if (!p) throw new Error('Data kosong.');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var baru = !p.id;
    if (baru) {
      p.id = kodePesanan_();
      p.dibuat = sekarang_();
      p.sumber = 'admin';
      p.status = p.status || 'Penawaran';
    } else {
      var lama = Db.baca('Pesanan').filter(function (x) { return x.id === p.id; })[0];
      if (!lama) throw new Error('Pesanan ' + p.id + ' tidak ditemukan.');
      p.dibuat = lama.dibuat; p.sumber = lama.sumber;
    }
    if (STATUS_PESANAN.indexOf(p.status) < 0) p.status = 'Baru';
    if ((p.status === 'Selesai' || p.status === 'Lunas') && !tanggal_(p.tgl_mulai)) throw new Error('Isi tanggal kegiatan dulu sebelum status ' + p.status + ' (dipakai untuk rekap bulanan).');
    var items = typeof p.items_json === 'string' ? JSON.parse(p.items_json || '[]') : (p.items || []);
    p.items_json = JSON.stringify(items);
    p.total = items.reduce(function (s, it) { return s + (Number(it.harga) || 0) * (Number(it.qty) || 0); }, 0);
    if (p.override && typeof p.override === 'object') p.override_json = JSON.stringify(p.override);
    p.diperbarui = sekarang_();
    var simpan = {};
    SKEMA.Pesanan.forEach(function (k) { simpan[k] = p[k] === undefined ? '' : p[k]; });
    Db.simpan('Pesanan', simpan);
    return simpan;
  } finally { lock.releaseLock(); }
}

function adminHapusPesanan(id) {
  requireAdmin_();
  if (Db.baca('Invoice').some(function (i) { return i.pesanan_id === id; })) throw new Error('Pesanan ini sudah punya invoice. Ubah statusnya menjadi Batal, jangan dihapus.');
  Db.hapus('Pesanan', id);
  Db.ganti('Kru', function (k) { return k.pesanan_id === id; }, []);
  return true;
}

/** Ganti seluruh kru satu proyek. kru: [{anggota_id, nama, peran, bobot, hadir, manual}] */
function adminSimpanKru(pesananId, kru) {
  requireAdmin_();
  var kunci = LockService.getScriptLock(); kunci.waitLock(20000);
  try {
  var baris = (kru || []).filter(function (k) { return k.anggota_id; }).map(function (k) {
    return { id: k.id || idBaru_('KR'), pesanan_id: pesananId, anggota_id: k.anggota_id, nama: k.nama || '',
      peran: k.peran || 'Instruktur', bobot: k.bobot === undefined ? '' : k.bobot, hadir: String(k.hadir || ''),
      manual: k.manual === undefined || k.manual === null ? '' : k.manual };
  });
  Db.ganti('Kru', function (k) { return k.pesanan_id === pesananId; }, baris);
  return baris;
  } finally { kunci.releaseLock(); }
}

/* ---------- Anggota ---------- */
function adminSimpanAnggota(a) {
  requireAdmin_();
  if (!a || !String(a.nama || '').trim()) throw new Error('Nama anggota wajib diisi.');
  if (!a.id) { a.id = idBaru_('AG'); a.bergabung = a.bergabung || Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd'); }
  a.aktif = a.aktif === true || String(a.aktif).toUpperCase() === 'TRUE';
  var simpan = {};
  SKEMA.Anggota.forEach(function (k) { simpan[k] = a[k] === undefined ? '' : a[k]; });
  Db.simpan('Anggota', simpan);
  return simpan;
}

function adminHapusAnggota(id) {
  requireAdmin_();
  var dipakai = Db.baca('Kru').some(function (k) { return k.anggota_id === id; }) ||
    Db.baca('Pesanan').some(function (p) { return p.pembawa_id === id || String(p.items_json || '').indexOf(id) >= 0; });
  if (dipakai) throw new Error('Anggota ini sudah tercatat di proyek. Nonaktifkan saja, jangan dihapus.');
  Db.hapus('Anggota', id);
  return true;
}

/* ---------- Katalog & Pengaturan ---------- */
function adminSimpanKatalog(list) {
  requireAdmin_();
  var kunci = LockService.getScriptLock(); kunci.waitLock(20000);
  try {
  var bersih = (list || []).filter(function (k) { return k.id && k.nama; }).map(function (k, i) {
    var o = {};
    SKEMA.Katalog.forEach(function (c) { o[c] = k[c] === undefined ? '' : k[c]; });
    o.harga = Number(o.harga) || 0; o.min = Number(o.min) || 1;
    o.modal = o.modal === '' || o.modal === null ? '' : Number(o.modal) || 0;
    o.aktif = !(o.aktif === false || String(o.aktif).toUpperCase() === 'FALSE');
    o.urutan = Number(o.urutan) || (i + 1) * 10;
    o.kategori = String(o.kategori || '').toLowerCase();
    return o;
  });
  Db.tulisSemua('Katalog', bersih);
  return bersih;
  } finally { kunci.releaseLock(); }
}

function adminSimpanPengaturan(map) {
  requireAdmin_();
  var kunci = LockService.getScriptLock(); kunci.waitLock(20000);
  try {
  var rows = Db.baca('Pengaturan');
  var ket = {};
  rows.forEach(function (r) { ket[r.kunci] = r.keterangan; });
  var baru = Object.keys(map || {}).map(function (k) { return { kunci: k, nilai: String(map[k] === undefined ? '' : map[k]), keterangan: ket[k] || '' }; });
  // pertahankan kunci yang tidak dikirim
  rows.forEach(function (r) { if (!(r.kunci in map)) baru.push(r); });
  Db.tulisSemua('Pengaturan', baru);
  resetSettings_();
  CacheService.getScriptCache().removeAll(['galeri_v2']);
  return Db.baca('Pengaturan');
  } finally { kunci.releaseLock(); }
}

/* ---------- Pembayaran ke anggota ---------- */
function adminCatatPembayaran(b) {
  requireAdmin_();
  var user = Session.getActiveUser().getEmail();
  var row = { id: b.id || idBaru_('BY'), bulan: b.bulan, anggota_id: b.anggota_id, nama: b.nama || '',
    jumlah: Number(b.jumlah) || 0, tgl_bayar: b.tgl_bayar || Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd'),
    catatan: b.catatan || '', dicatat_oleh: user };
  Db.simpan('Pembayaran', row);
  return row;
}

function adminHapusPembayaran(id) {
  requireAdmin_();
  return Db.hapus('Pembayaran', id);
}
