/* ====================================================================
 * SETUP — jalankan SEKALI dari editor:
 *   pilih fungsi "setup" > klik ▶ Jalankan > izinkan akses.
 * Aman dijalankan ulang: data yang sudah ada tidak dihapus.
 * ==================================================================== */
var PENGATURAN_DEFAULT = [
  ['nama_usaha', 'Malomo Outbound', 'Nama di website & invoice'],
  ['alamat', 'Makassar, Sulawesi Selatan', 'Alamat di invoice & website'],
  ['wa_admin1', '6287779092032', 'WhatsApp Admin 1 (format 62...)'],
  ['wa_admin2', '6282259529276', 'WhatsApp Admin 2'],
  ['instagram', 'malomo.outbound', 'Username Instagram tanpa @'],
  ['website_url', '', 'Link website GitHub Pages, contoh https://malomooutbound.github.io'],
  ['admin_email', '', 'Email yang boleh membuka panel admin, pisahkan dengan koma'],
  ['notif_email', '', 'Email penerima notifikasi pesanan baru (kosongkan bila tidak perlu)'],
  ['katalog_id', '1vT-iN4DUJOSNtf1onHk_9CJoOVePvCad', 'ID file PDF booklet di Google Drive'],
  ['galeri_folder_id', '14fvoKUxVZKi0FjXHAUdVeUpuJUiASIMo', 'ID folder foto dokumentasi di Google Drive'],
  ['galeri_maks', '9', 'Jumlah foto galeri di website'],
  ['galeri_cache_detik', '300', 'Foto baru muncul paling lambat sekian detik'],
  ['foto_hero_id', '', 'ID foto utama website (kosong = foto galeri terbaru)'],
  ['invoice_folder_id', '', 'Folder Drive untuk PDF invoice (kosong = dibuat otomatis)'],
  ['rekening', '', 'Rekening pembayaran di invoice, contoh: BSI 7123456789 a.n. Malomo Outbound'],
  ['catatan_invoice', 'DP 50% untuk mengunci tanggal kegiatan. Pelunasan sesuai kesepakatan.', 'Catatan di bawah invoice'],
  ['jatuh_tempo_hari', '7', 'Jatuh tempo invoice (hari setelah tanggal invoice)'],
  ['persen_akomodasi', '10', 'Biaya akomodasi & transport (% pendapatan outbound), bisa diisi manual per proyek'],
  ['persen_barang', '10', 'Pembelian barang Malomo (% pendapatan outbound), bisa diisi manual per proyek'],
  ['persen_kas', '25', 'Kas Malomo (% laba bersih)'],
  ['persen_pembawa', '5', 'Fee pembawa order (% laba bersih). Tanpa pembawa → masuk kas Malomo'],
  ['persen_instruktur', '50', 'Dana instruktur (% laba bersih), dibagi per hari x bobot'],
  ['persen_kas_bersama', '20', 'Kas bersama anggota (% laba bersih), dibagi rata anggota aktif tiap bulan'],
  ['fee_layanan', '3', 'Fee Malomo dari LABA layanan tambahan (% dari harga jual - modal)'],
  ['fee_layanan_sendiri', '1.5', 'Fee bila order layanan dibawa sendiri oleh pengelola'],
  ['peran', 'Koordinator:1.5, Instruktur:1', 'Peran kru dan bobotnya']
];

function setup() {
  wajibPemilik_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Jalankan setup dari Apps Script yang dibuka lewat Google Sheets (Ekstensi > Apps Script).');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', ss.getId());
  var pemilik = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  if (pemilik) props.setProperty('OWNER_EMAIL', pemilik.toLowerCase());
  ss.setSpreadsheetTimeZone('Asia/Makassar');

  var log = [];
  Object.keys(SKEMA).forEach(function (nama) {
    var sh = ss.getSheetByName(nama);
    if (!sh) { sh = ss.insertSheet(nama); log.push('Sheet dibuat: ' + nama); }
    var kolom = SKEMA[nama];
    if (sh.getMaxColumns() < kolom.length) sh.insertColumnsAfter(sh.getMaxColumns(), kolom.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, kolom.length).setValues([kolom]).setFontWeight('bold').setBackground('#FDEBDD');
    sh.setFrozenRows(1);
    (KOLOM_TEKS[nama] || []).forEach(function (k) {
      sh.getRange(1, kolom.indexOf(k) + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  });

  // Pengaturan default (hanya kunci yang belum ada)
  var ada = {};
  Db.bersihkanCache();
  Db.baca('Pengaturan').forEach(function (r) { ada[r.kunci] = true; });
  PENGATURAN_DEFAULT.forEach(function (r) {
    if (ada[r[0]]) return;
    var nilai = r[1];
    if ((r[0] === 'admin_email' || r[0] === 'notif_email') && pemilik) nilai = pemilik;
    Db.tambah('Pengaturan', { kunci: r[0], nilai: nilai, keterangan: r[2] });
    log.push('Pengaturan ditambah: ' + r[0]);
  });

  // Katalog default
  if (!Db.baca('Katalog').length) {
    Db.tulisSemua('Katalog', KATALOG_DEFAULT.map(function (k, i) {
      return Object.assign({ aktif: true, urutan: (i + 1) * 10 }, k);
    }));
    log.push('Katalog default diisi: ' + KATALOG_DEFAULT.length + ' item');
  }

  // Hapus sheet bawaan yang kosong
  ['Sheet1', 'Lembar1', 'Sheet 1'].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) { ss.deleteSheet(sh); log.push('Sheet kosong dihapus: ' + n); }
  });

  ss.setActiveSheet(ss.getSheetByName('Pesanan'));
  log.push('Selesai. Pemilik/admin: ' + (pemilik || '(tidak terbaca)'));
  console.log(log.join('\n'));
  return log;
}

/** Hanya pemilik (dijalankan dari editor Apps Script) yang boleh menjalankan setup. */
function wajibPemilik_() {
  var aktif = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  var efektif = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  var pemilik = PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL');
  if (!aktif || aktif !== efektif || (pemilik && pemilik !== aktif)) throw new Error('AKSES: setup hanya bisa dijalankan pemilik dari editor Apps Script.');
}
