/* ====================================================================
 * DATABASE (Google Sheets)
 * Setiap sheet = satu tabel. Baris 1 = nama kolom. Jangan ubah nama kolom.
 * ==================================================================== */
var SKEMA = {
  Pengaturan: ['kunci', 'nilai', 'keterangan'],
  Katalog: ['id', 'kategori', 'grup', 'nama', 'harga', 'satuan', 'min', 'badge', 'keterangan', 'komponen', 'aktif', 'urutan', 'modal'],
  Pesanan: ['id', 'dibuat', 'sumber', 'status', 'nama', 'instansi', 'wa', 'email', 'tgl_mulai', 'jumlah_hari', 'lokasi',
    'peserta', 'catatan', 'items_json', 'total', 'pembawa_id', 'biaya_akomodasi', 'biaya_barang', 'override_json',
    'catatan_admin', 'diperbarui'],
  Kru: ['id', 'pesanan_id', 'anggota_id', 'nama', 'peran', 'bobot', 'hadir', 'manual'],
  Anggota: ['id', 'nama', 'wa', 'aktif', 'catatan', 'bergabung'],
  Invoice: ['no', 'pesanan_id', 'jenis', 'tanggal', 'jatuh_tempo', 'jumlah', 'status', 'dibayar_tgl', 'file_url', 'catatan', 'dibuat_oleh'],
  Pembayaran: ['id', 'bulan', 'anggota_id', 'nama', 'jumlah', 'tgl_bayar', 'catatan', 'dicatat_oleh']
};

/** Kolom yang disimpan sebagai teks apa adanya (agar 0812..., 2026-11-10, 1|0,5 tidak diubah Sheets). */
var KOLOM_TEKS = {
  Pengaturan: ['kunci', 'nilai', 'keterangan'],
  Katalog: ['id', 'kategori', 'grup', 'nama', 'satuan', 'badge', 'keterangan', 'komponen'],
  Pesanan: ['id', 'dibuat', 'sumber', 'status', 'nama', 'instansi', 'wa', 'email', 'tgl_mulai', 'lokasi', 'catatan',
    'items_json', 'pembawa_id', 'override_json', 'catatan_admin', 'diperbarui'],
  Kru: ['id', 'pesanan_id', 'anggota_id', 'nama', 'peran', 'hadir'],
  Anggota: ['id', 'nama', 'wa', 'catatan', 'bergabung'],
  Invoice: ['no', 'pesanan_id', 'jenis', 'tanggal', 'jatuh_tempo', 'status', 'dibayar_tgl', 'file_url', 'catatan', 'dibuat_oleh'],
  Pembayaran: ['id', 'bulan', 'anggota_id', 'nama', 'tgl_bayar', 'catatan', 'dicatat_oleh']
};

var Db = (function () {
  var _ss = null;
  var _cache = {};

  function ss() {
    if (_ss) return _ss;
    var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    try {
      _ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      throw new Error('Database tidak bisa dibuka. Pastikan akun Anda diberi akses Editor ke Google Sheets "Malomo Database". (' + e.message + ')');
    }
    if (!_ss) throw new Error('Database belum dihubungkan. Jalankan fungsi "setup" dari editor Apps Script.');
    return _ss;
  }

  function sheet(nama) {
    var sh = ss().getSheetByName(nama);
    if (!sh) throw new Error('Sheet "' + nama + '" tidak ada. Jalankan fungsi "setup".');
    return sh;
  }

  function nilaiKeTeks(v) {
    if (v instanceof Date) {
      var tz = Session.getScriptTimeZone() || 'Asia/Makassar';
      var jam = v.getHours() || v.getMinutes();
      return Utilities.formatDate(v, tz, jam ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
    }
    return v;
  }

  function baca(nama) {
    if (_cache[nama]) return _cache[nama].map(function (o) { return Object.assign({}, o); });
    var sh = sheet(nama);
    var data = sh.getDataRange().getValues();
    if (data.length < 2) { _cache[nama] = []; return []; }
    var head = data[0].map(String);
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var r = data[i];
      if (r.every(function (c) { return c === '' || c === null; })) continue;
      var o = {};
      for (var j = 0; j < head.length; j++) if (head[j]) o[head[j]] = nilaiKeTeks(r[j]);
      rows.push(o);
    }
    _cache[nama] = rows;
    return rows.map(function (o) { return Object.assign({}, o); });
  }

  function keBaris(nama, obj) {
    return SKEMA[nama].map(function (k) {
      var v = obj[k];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') v = JSON.stringify(v);
      // cegah teks dibaca Sheets sebagai rumus (=, +, -, @)
      if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
      return v;
    });
  }

  function tulisSemua(nama, rows) {
    var sh = sheet(nama);
    var kolom = SKEMA[nama].length;
    var lama = Math.max(sh.getLastRow() - 1, 0);
    if (rows.length) sh.getRange(2, 1, rows.length, kolom).setValues(rows.map(function (o) { return keBaris(nama, o); }));
    if (lama > rows.length) sh.getRange(rows.length + 2, 1, lama - rows.length, Math.max(kolom, sh.getLastColumn())).clearContent();
    delete _cache[nama];
  }

  function tambah(nama, obj) {
    sheet(nama).appendRow(keBaris(nama, obj));
    delete _cache[nama];
    return obj;
  }

  /** Simpan (ubah bila id sudah ada, tambah bila belum). */
  function simpan(nama, obj, kunci) {
    kunci = kunci || 'id';
    var sh = sheet(nama);
    var ids = sh.getLastRow() > 1 ? sh.getRange(2, SKEMA[nama].indexOf(kunci) + 1, sh.getLastRow() - 1, 1).getValues() : [];
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(obj[kunci])) {
        sh.getRange(i + 2, 1, 1, SKEMA[nama].length).setValues([keBaris(nama, obj)]);
        delete _cache[nama];
        return obj;
      }
    }
    return tambah(nama, obj);
  }

  function hapus(nama, id, kunci) {
    kunci = kunci || 'id';
    var sh = sheet(nama);
    if (sh.getLastRow() < 2) return false;
    var ids = sh.getRange(2, SKEMA[nama].indexOf(kunci) + 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(id)) { sh.deleteRow(i + 2); delete _cache[nama]; return true; }
    }
    return false;
  }

  /** Ganti semua baris yang cocok `cocok(row)` dengan `baru`. */
  function ganti(nama, cocok, baru) {
    var sisa = baca(nama).filter(function (r) { return !cocok(r); });
    tulisSemua(nama, sisa.concat(baru || []));
  }

  function bersihkanCache() { _cache = {}; }

  return { ss: ss, sheet: sheet, baca: baca, tambah: tambah, simpan: simpan, hapus: hapus, ganti: ganti,
    tulisSemua: tulisSemua, bersihkanCache: bersihkanCache };
})();

/* ---------- Pengaturan ---------- */
var _settings = null;
function settings_() {
  if (_settings) return _settings;
  var s = {};
  try { Db.baca('Pengaturan').forEach(function (r) { if (r.kunci) s[String(r.kunci).trim()] = r.nilai; }); }
  catch (e) { console.warn(e); }
  _settings = s;
  return s;
}
function setting_(k) { var v = settings_()[k]; return v === undefined || v === null ? '' : String(v).trim(); }
function resetSettings_() { _settings = null; }

function idBaru_(awalan) {
  return awalan + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

/** Nomor urut yang hanya naik (tidak terpakai ulang walau data dihapus). Panggil di dalam lock. */
function nomorBerikut_(kunci, maksAda) {
  var props = PropertiesService.getScriptProperties();
  var n = Math.max(Number(props.getProperty(kunci) || 0), Number(maksAda) || 0) + 1;
  props.setProperty(kunci, String(n));
  return n;
}
