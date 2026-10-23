/* ====================================================================
 * INVOICE — nomor otomatis INV/MLM/2026/001, HTML untuk dicetak & PDF di Drive
 * ==================================================================== */
var JENIS_INVOICE = ['DP', 'Pelunasan', 'Penuh'];

function nomorInvoice_(tanggal) {
  var tahun = String(tanggal || '').slice(0, 4) || Utilities.formatDate(new Date(), zona_(), 'yyyy');
  var awal = 'INV/MLM/' + tahun + '/';
  var maks = 0;
  Db.baca('Invoice').forEach(function (r) {
    var no = String(r.no || '');
    if (no.indexOf(awal) === 0) maks = Math.max(maks, Number(no.slice(awal.length)) || 0);
  });
  return awal + ('00' + nomorBerikut_('NO_INVOICE_' + tahun, maks)).slice(-3);
}

function tambahHari_(tgl, hari) {
  var d = new Date(tgl + 'T00:00:00');
  d.setDate(d.getDate() + hari);
  return Utilities.formatDate(d, zona_(), 'yyyy-MM-dd');
}

/** b: {pesanan_id, jenis, jumlah, tanggal?, jatuh_tempo?, catatan?, simpanPdf?} */
function adminBuatInvoice(b) {
  var user = requireAdmin_();
  var p = Db.baca('Pesanan').filter(function (x) { return x.id === b.pesanan_id; })[0];
  if (!p) throw new Error('Pesanan tidak ditemukan.');
  if (JENIS_INVOICE.indexOf(b.jenis) < 0) throw new Error('Jenis invoice tidak dikenal.');
  var jumlah = Math.round(Number(b.jumlah) || 0);
  if (jumlah <= 0) throw new Error('Jumlah tagihan harus lebih dari 0.');
  var tanggal = tanggal_(b.tanggal) || Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd');
  var tempo = tanggal_(b.jatuh_tempo) || tambahHari_(tanggal, Number(setting_('jatuh_tempo_hari')) || 7);

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var inv;
  try {
    inv = { no: nomorInvoice_(tanggal), pesanan_id: p.id, jenis: b.jenis, tanggal: tanggal, jatuh_tempo: tempo,
      jumlah: jumlah, status: 'Belum dibayar', dibayar_tgl: '', file_url: '', catatan: bersih_(b.catatan, 500), dibuat_oleh: user };
    Db.tambah('Invoice', inv);
  } finally { lock.releaseLock(); }

  if (b.simpanPdf) {
    try { inv.file_url = simpanPdfInvoice_(inv.no); }
    catch (e) { inv.pdf_galat = 'PDF belum tersimpan: ' + e.message; }
  }
  return { invoice: inv, html: htmlInvoice_(inv.no) };
}

function adminHtmlInvoice(no) {
  requireAdmin_();
  return htmlInvoice_(no);
}

function adminPdfInvoice(no) {
  requireAdmin_();
  return simpanPdfInvoice_(no);
}

function adminStatusInvoice(no, status, tgl) {
  requireAdmin_();
  var inv = Db.baca('Invoice').filter(function (r) { return r.no === no; })[0];
  if (!inv) throw new Error('Invoice tidak ditemukan.');
  inv.status = status === 'Lunas' ? 'Lunas' : 'Belum dibayar';
  inv.dibayar_tgl = inv.status === 'Lunas' ? (tanggal_(tgl) || Utilities.formatDate(new Date(), zona_(), 'yyyy-MM-dd')) : '';
  Db.simpan('Invoice', inv, 'no');
  return inv;
}

function adminHapusInvoice(no) {
  requireAdmin_();
  return Db.hapus('Invoice', no, 'no');
}

function simpanPdfInvoice_(no) {
  var inv = Db.baca('Invoice').filter(function (r) { return r.no === no; })[0];
  if (!inv) throw new Error('Invoice tidak ditemukan.');
  var folderId = setting_('invoice_folder_id');
  var folder;
  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); }
    catch (e) { throw new Error('Folder invoice tidak bisa dibuka dengan akun ini. Minta pemilik membagikan folder "Malomo Invoice" sebagai Editor ke akun Anda.'); }
  } else {
    folder = DriveApp.createFolder('Malomo Invoice');
    adminSimpanPengaturan({ invoice_folder_id: folder.getId() });
  }
  var nama = no.replace(/\//g, '-') + '.pdf';
  var blob = Utilities.newBlob(htmlInvoice_(no), 'text/html', nama.replace('.pdf', '.html')).getAs('application/pdf').setName(nama);
  var lama = folder.getFilesByName(nama);
  while (lama.hasNext()) { try { lama.next().setTrashed(true); } catch (e) { /* file milik akun lain */ } }
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* kebijakan akun */ }
  inv.file_url = file.getUrl();
  Db.simpan('Invoice', inv, 'no');
  return inv.file_url;
}

function tglIndo_(s) {
  if (!s) return '-';
  var b = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var p = String(s).slice(0, 10).split('-');
  if (p.length < 3) return s;
  return Number(p[2]) + ' ' + b[Number(p[1]) - 1] + ' ' + p[0];
}

/** Gabungkan komponen paket menjadi satu baris seperti yang dilihat klien. */
function barisInvoice_(items) {
  var hasil = [], idx = {};
  items.forEach(function (it) {
    var kunci = it.paket ? 'pk:' + it.paket + ':' + it.qty : null;
    if (kunci && idx[kunci] !== undefined) { hasil[idx[kunci]].harga += Number(it.harga) || 0; return; }
    var b = { nama: it.paket || it.nama, harga: Number(it.harga) || 0, qty: Number(it.qty) || 0, satuan: it.satuan || '' };
    if (kunci) idx[kunci] = hasil.length;
    hasil.push(b);
  });
  return hasil;
}

function htmlInvoice_(no) {
  var s = settings_();
  var inv = Db.baca('Invoice').filter(function (r) { return r.no === no; })[0];
  if (!inv) throw new Error('Invoice tidak ditemukan.');
  var p = Db.baca('Pesanan').filter(function (x) { return x.id === inv.pesanan_id; })[0] || {};
  var items = []; try { items = JSON.parse(p.items_json || '[]'); } catch (e) { items = []; }
  var baris = barisInvoice_(items);
  var total = baris.reduce(function (t, b) { return t + b.harga * b.qty; }, 0);
  var lain = Db.baca('Invoice').filter(function (r) { return r.pesanan_id === inv.pesanan_id && r.no !== inv.no; });
  var dibayar = lain.filter(function (r) { return r.status === 'Lunas'; }).reduce(function (t, r) { return t + (Number(r.jumlah) || 0); }, 0);
  var rp = MalomoHitung.rupiah, e = escapeHtml_;
  var sisa = Math.max(0, total - dibayar - Number(inv.jumlah));
  var lunas = inv.status === 'Lunas';
  var wa = [s.wa_admin1, s.wa_admin2].filter(String).map(function (w) { return '+' + String(w).replace(/^\+/, ''); }).join(' / ');

  var rows = baris.map(function (b, i) {
    return '<tr><td>' + (i + 1) + '</td><td>' + e(b.nama) + '</td><td class="r">' + b.qty + ' ' + e(b.satuan) +
      '</td><td class="r">' + rp(b.harga) + '</td><td class="r">' + rp(b.harga * b.qty) + '</td></tr>';
  }).join('');

  return '<!doctype html><html><head><meta charset="utf-8"><title>' + e(inv.no) + '</title><style>' +
    '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Helvetica,Arial,sans-serif;color:#1d1d1f;font-size:12px;margin:0;padding:24px}' +
    'table.lay{width:100%;border-collapse:collapse;margin:0}table.lay td{border:0;padding:0;vertical-align:top}table.top{border-bottom:3px solid #E8772E}table.top td{padding-bottom:14px}table.lay.grid{margin:18px 0}table.lay.foot{margin-top:36px}' +
    '.brand{font-size:22px;font-weight:800;letter-spacing:4px}.brand b{color:#E8772E}.muted{color:#6b6b70}' +
    'h1{font-size:26px;margin:0;color:#E8772E;text-align:right}.meta{text-align:right;margin-top:6px;line-height:1.6}' +
    '.grid{margin:18px 0}.box{width:50%;padding-right:18px}.box h3{font-size:11px;letter-spacing:1px;color:#6b6b70;margin:0 0 6px;text-transform:uppercase}' +
    'table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#FDEBDD;text-align:left;padding:8px;font-size:11px}td{padding:8px;border-bottom:1px solid #eee}.r{text-align:right}' +
    '.sum{width:300px;margin-left:auto;margin-top:12px}.sum td{border:none;padding:4px 8px}.sum .big td{font-size:15px;font-weight:800;border-top:2px solid #1d1d1f;padding-top:8px}' +
    '.stamp{display:inline-block;border:2px solid ' + (lunas ? '#1a7f37' : '#E8772E') + ';color:' + (lunas ? '#1a7f37' : '#E8772E') + ';padding:4px 12px;font-weight:800;letter-spacing:2px;border-radius:6px;margin-top:6px}' +
    '.note{margin-top:22px;padding:12px;background:#f7f7f8;border-radius:8px;line-height:1.6}.foot{margin-top:36px}' +
    '</style></head><body>' +
    '<table class="lay top"><tr><td><div class="brand"><svg viewBox="4 16 92 68" style="width:28px;height:20px;vertical-align:middle;display:inline-block" aria-hidden="true"><path d="M10 76.8 L33.3 23 L49.3 53.6 L66.7 23 L90 73.9" fill="none" stroke="#E8772E" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/></svg> MALOMO</div><div class="muted" style="margin-top:6px;line-height:1.6">' +
    e(s.nama_usaha || 'Malomo Outbound') + '<br>' + e(s.alamat || '') + '<br>WA ' + e(wa) + (s.instagram ? ' · IG @' + e(s.instagram) : '') + '</div></td>' +
    '<td style="text-align:right"><h1>INVOICE</h1><div class="meta"><b>' + e(inv.no) + '</b><br>Tanggal: ' + tglIndo_(inv.tanggal) + '<br>Jatuh tempo: ' + tglIndo_(inv.jatuh_tempo) +
    '<br><span class="stamp">' + (lunas ? 'LUNAS' : e(String(inv.jenis).toUpperCase())) + '</span></div></td></tr></table>' +
    '<table class="lay grid"><tr><td class="box"><h3>Ditagihkan kepada</h3><b>' + e(p.instansi || p.nama || '-') + '</b><br>' + (p.instansi ? e(p.nama) + '<br>' : '') + 'WA ' + e(p.wa || '-') + '</td>' +
    '<td class="box"><h3>Kegiatan</h3>Kode pesanan: <b>' + e(p.id || '-') + '</b><br>Tanggal: ' + tglIndo_(p.tgl_mulai) + (Number(p.jumlah_hari) > 1 ? ' (' + p.jumlah_hari + ' hari)' : '') +
    '<br>Lokasi: ' + e(p.lokasi || '-') + '<br>Peserta: ' + e(p.peserta || '-') + '</td></tr></table>' +
    '<table><thead><tr><th>#</th><th>Uraian</th><th class="r">Jumlah</th><th class="r">Harga</th><th class="r">Subtotal</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<table class="sum"><tr><td>Total kegiatan</td><td class="r">' + rp(total) + '</td></tr>' +
    (dibayar ? '<tr><td>Sudah dibayar</td><td class="r">-' + rp(dibayar) + '</td></tr>' : '') +
    '<tr class="big"><td>Tagihan ' + e(inv.jenis) + '</td><td class="r">' + rp(inv.jumlah) + '</td></tr>' +
    (sisa ? '<tr><td class="muted">Sisa setelah tagihan ini</td><td class="r muted">' + rp(sisa) + '</td></tr>' : '') + '</table>' +
    '<div class="note"><b>Pembayaran</b><br>' + (s.rekening ? e(s.rekening) : 'Hubungi admin untuk informasi rekening.') +
    '<br>Mohon kirim bukti transfer ke WhatsApp admin dengan menyebut nomor invoice.' +
    (inv.catatan ? '<br><br><b>Catatan</b><br>' + e(inv.catatan) : '') + (s.catatan_invoice ? '<br><br>' + e(s.catatan_invoice) : '') + '</div>' +
    '<table class="lay foot"><tr><td class="muted">Terima kasih telah mempercayakan kegiatan Anda kepada Malomo.<br>Malomo dalam bahasa Bugis berarti mudah.</td>' +
    '<td style="text-align:center;width:180px">Hormat kami,<br><br><br><br><b>Admin Malomo</b></td></tr></table>' +
    '</body></html>';
}
