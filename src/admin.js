/* PANEL ADMIN MALOMO — logika tampilan (dijalankan di browser admin) */

function panggil(fn, ...args) {
  return new Promise((ok, gagal) => {
    google.script.run.withSuccessHandler(ok).withFailureHandler(gagal)[fn](...args);
  });
}

function toast(pesan, galat) {
  const t = $('#toast');
  t.textContent = pesan;
  t.className = 'toast on' + (galat ? ' galat' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.className = 'toast' + (galat ? ' galat' : ''); }, galat ? 6000 : 2600);
}
function pesanGalat(e) { return String((e && e.message) || e || 'Terjadi kesalahan').replace(/^Error:\s*/, '').replace(/^AKSES:\s*/, ''); }

function S() { const o = {}; (D.pengaturan || []).forEach(r => { o[r.kunci] = r.nilai; }); return o; }
function anggotaById(id) { return (D.anggota || []).find(a => a.id === id); }
function namaAnggota(id) { const a = anggotaById(id); return a ? a.nama : (id || ''); }
function aktif(a) { return a.aktif === true || String(a.aktif).toUpperCase() === 'TRUE'; }
function parseJson(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }
function kruOf(id) { return (D.kru || []).filter(k => k.pesanan_id === id); }
function parsePesanan(p) { return Object.assign({}, p, { items: parseJson(p.items_json, []), override: parseJson(p.override_json, {}), pembawa_nama: namaAnggota(p.pembawa_id) }); }
function hitungPesanan(p) { return H.hitungProyek(parsePesanan(p), kruOf(p.id), S()); }
function pill(st) { return '<span class="pill s-' + esc(String(st).split(' ')[0]) + '">' + esc(st) + '</span>'; }
function opsiAnggota(pilih, kosong) {
  return (kosong ? '<option value="">' + esc(kosong) + '</option>' : '') + (D.anggota || [])
    .filter(a => aktif(a) || a.id === pilih)
    .map(a => '<option value="' + esc(a.id) + '"' + (a.id === pilih ? ' selected' : '') + '>' + esc(a.nama) + '</option>').join('');
}
function bolehPindah() {
  if (E && E.dirty) { try { return confirm('Perubahan pesanan belum disimpan. Tinggalkan halaman ini?'); } catch (e) { return true; } }
  return true;
}

/* ====================== NAVIGASI ====================== */
function buka(v) {
  if (!bolehPindah()) return;
  V = v; E = null;
  $$('#menu button').forEach(b => b.classList.toggle('aktif', b.dataset.v === v));
  render();
  window.scrollTo(0, 0);
}
function render() {
  const isi = $('#isi');
  if (E) return renderEditor();
  isi.innerHTML = ({ dasbor: vDasbor, pesanan: vPesanan, rekap: vRekap, anggota: vAnggota, katalog: vKatalog, pengaturan: vPengaturan }[V] || vDasbor)();
}

/* ====================== DASBOR ====================== */
function vDasbor() {
  const sekarang = hariIni();
  const r = H.rekapBulan(sekarang.slice(0, 7), { pesanan: D.pesanan.map(parsePesanan), kru: D.kru, anggota: D.anggota }, S());
  const baru = D.pesanan.filter(p => p.status === 'Baru');
  const mendatang = D.pesanan.filter(p => p.tgl_mulai >= sekarang && ['Baru', 'Penawaran', 'DP', 'Berjalan'].includes(p.status))
    .sort((a, b) => String(a.tgl_mulai).localeCompare(String(b.tgl_mulai)));
  const belumBayar = D.invoice.filter(i => i.status !== 'Lunas');
  const terbaru = D.pesanan.slice().sort((a, b) => String(b.dibuat).localeCompare(String(a.dibuat))).slice(0, 8);
  const baris = list => list.length ? list.map(p => '<tr class="klik" data-buka="' + esc(p.id) + '"><td class="tebal">' + esc(p.id) + '</td><td>' + tglIndo(p.tgl_mulai) +
    '</td><td>' + esc(p.instansi || p.nama) + '</td><td class="r">' + rp(p.total) + '</td><td>' + pill(p.status) + '</td></tr>').join('')
    : '<tr><td colspan="5" class="kosong">Belum ada.</td></tr>';
  return '<div class="head"><h1>Dasbor</h1><button class="btn" data-aksi="pesanan-baru">+ Pesanan baru</button></div>' +
    '<div class="grid g4" style="margin-bottom:14px">' +
    stat('Pesanan baru', baru.length, 'perlu ditindaklanjuti') +
    stat('Kegiatan mendatang', mendatang.length, 'penawaran s/d berjalan') +
    stat('Pendapatan ' + NAMA_BULAN[Number(sekarang.slice(5, 7)) - 1], rp(r.total.pendapatan), r.proyek.length + ' proyek selesai/lunas') +
    stat('Kas Malomo bulan ini', rp(r.total.kas + r.total.feeLayanan), 'kas bersama ' + rp(r.kasBersamaPerOrang) + '/orang') +
    '</div>' +
    (belumBayar.length ? '<div class="peringatan">' + belumBayar.length + ' invoice belum dibayar, total ' + rp(belumBayar.reduce((s, i) => s + num(i.jumlah), 0)) + '.</div>' : '') +
    '<div class="grid g2"><div class="kartu"><h2>Kegiatan mendatang</h2><div class="tw"><table><thead><tr><th>Kode</th><th>Tanggal</th><th>Klien</th><th class="r">Total</th><th>Status</th></tr></thead><tbody>' + baris(mendatang.slice(0, 8)) + '</tbody></table></div></div>' +
    '<div class="kartu"><h2>Pesanan terbaru</h2><div class="tw"><table><thead><tr><th>Kode</th><th>Tanggal</th><th>Klien</th><th class="r">Total</th><th>Status</th></tr></thead><tbody>' + baris(terbaru) + '</tbody></table></div></div></div>';
}
function stat(judul, angka, ket) { return '<div class="stat"><small>' + esc(judul) + '</small><b>' + esc(angka) + '</b><span>' + esc(ket || '') + '</span></div>'; }

/* ====================== DAFTAR PESANAN ====================== */
function vPesanan() {
  const f = FILTER;
  let list = D.pesanan.slice();
  if (f.status === 'aktif') list = list.filter(p => !['Lunas', 'Batal'].includes(p.status));
  else if (f.status !== 'semua') list = list.filter(p => p.status === f.status);
  if (f.cari) { const c = f.cari.toLowerCase(); list = list.filter(p => [p.id, p.nama, p.instansi, p.lokasi, p.wa].join(' ').toLowerCase().includes(c)); }
  list.sort((a, b) => String(b.tgl_mulai || b.dibuat).localeCompare(String(a.tgl_mulai || a.dibuat)));
  const opsi = [['aktif', 'Belum lunas'], ['semua', 'Semua']].concat(D.status.map(s => [s, s]));
  return '<div class="head"><h1>Pesanan &amp; Proyek</h1><button class="btn" data-aksi="pesanan-baru">+ Pesanan baru</button></div>' +
    '<div class="kartu"><div class="toolbar" style="margin-bottom:12px"><select id="f-status">' + opsi.map(o => '<option value="' + o[0] + '"' + (o[0] === f.status ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' +
    '<input id="f-cari" placeholder="Cari kode, nama, instansi…" value="' + esc(f.cari) + '" style="flex:1;min-width:180px"></div>' +
    '<div class="tw"><table><thead><tr><th>Kode</th><th>Kegiatan</th><th>Klien</th><th class="r">Peserta</th><th class="r">Total</th><th>Status</th><th>Sumber</th></tr></thead><tbody>' +
    (list.length ? list.map(p => '<tr class="klik" data-buka="' + esc(p.id) + '"><td class="tebal">' + esc(p.id) + '</td><td>' + tglIndo(p.tgl_mulai) + (num(p.jumlah_hari) > 1 ? ' <span class="mut">(' + p.jumlah_hari + ' hr)</span>' : '') +
      '</td><td>' + esc(p.instansi || '-') + '<div class="mut kecil">' + esc(p.nama) + '</div></td><td class="r">' + esc(p.peserta || '') + '</td><td class="r">' + rp(p.total) +
      '</td><td>' + pill(p.status) + '</td><td class="mut kecil">' + esc(p.sumber) + '</td></tr>').join('') : '<tr><td colspan="7" class="kosong">Tidak ada pesanan.</td></tr>') +
    '</tbody></table></div></div>';
}

/* ====================== EDITOR PESANAN ====================== */
function bukaPesanan(id) {
  if (!bolehPindah()) return;
  const p = id ? D.pesanan.find(x => x.id === id) : null;
  const dasar = p ? Object.assign({}, p) : { id: '', status: 'Penawaran', nama: '', instansi: '', wa: '', email: '', tgl_mulai: '', jumlah_hari: 1, lokasi: '', peserta: '', catatan: '', pembawa_id: '', biaya_akomodasi: '', biaya_barang: '', catatan_admin: '' };
  const hari = Math.max(1, num(dasar.jumlah_hari) || 1);
  E = {
    p: dasar, baru: !p, dirty: false,
    items: parseJson(dasar.items_json, []),
    override: parseJson(dasar.override_json, {}),
    kru: (p ? kruOf(p.id) : []).map(k => ({ anggota_id: k.anggota_id, peran: k.peran || 'Instruktur', manual: k.manual === '' ? '' : k.manual,
      hadir: ukuranHadir(String(k.hadir === undefined ? '' : k.hadir).split('|').map(x => num(x)), hari) }))
  };
  V = 'pesanan';
  $$('#menu button').forEach(b => b.classList.toggle('aktif', b.dataset.v === 'pesanan'));
  render();
  window.scrollTo(0, 0);
}
function ukuranHadir(arr, n) { const a = arr.slice(0, n); while (a.length < n) a.push(1); return a; }

function renderEditor() {
  const p = E.p;
  const st = D.status.map(s => '<option' + (s === p.status ? ' selected' : '') + '>' + s + '</option>').join('');
  $('#isi').innerHTML =
    '<div class="head"><button class="btn ab kc" data-aksi="kembali">← Kembali</button><h1>' + (E.baru ? 'Pesanan baru' : esc(p.id)) + ' ' + (E.baru ? '' : pill(p.status)) + '</h1>' +
    (p.wa ? '<a class="btn ab" target="_blank" href="https://wa.me/' + waNo(p.wa) + '">WhatsApp klien</a>' : '') +
    '<button class="btn" data-aksi="simpan">Simpan</button></div>' +
    '<div class="dua"><div>' +
    // Data klien
    '<div class="kartu"><h2>Data klien &amp; kegiatan</h2><div class="grid g3">' +
    fld('Status', '<select data-e="status">' + st + '</select>') +
    fld('Nama pemesan', inp('nama')) + fld('Sekolah / instansi', inp('instansi')) +
    fld('WhatsApp', inp('wa')) + fld('Tanggal mulai', inp('tgl_mulai', 'date')) +
    fld('Jumlah hari', '<input type="number" min="1" max="14" data-e="jumlah_hari" value="' + esc(p.jumlah_hari || 1) + '">') +
    fld('Lokasi', inp('lokasi')) + fld('Peserta', inp('peserta', 'number')) + fld('Email', inp('email')) +
    '</div><div class="grid g2" style="margin-top:12px">' + fld('Catatan klien', '<textarea rows="2" data-e="catatan">' + esc(p.catatan) + '</textarea>') +
    fld('Catatan admin', '<textarea rows="2" data-e="catatan_admin">' + esc(p.catatan_admin) + '</textarea>') + '</div>' +
    (E.baru ? '' : '<p class="mut kecil" style="margin-top:8px">Masuk ' + esc(p.dibuat) + ' lewat ' + esc(p.sumber) + ' · diperbarui ' + esc(p.diperbarui || '-') + '</p>') + '</div>' +
    // Item
    '<div class="kartu" id="k-item">' + htmlItem() + '</div>' +
    // Biaya
    '<div class="kartu" id="k-biaya">' + htmlBiaya() + '</div>' +
    // Kru
    '<div class="kartu" id="k-kru">' + htmlKru() + '</div>' +
    // Invoice
    '<div class="kartu" id="k-invoice">' + htmlInvoice() + '</div>' +
    (E.baru ? '' : '<p style="margin-top:6px"><button class="btn merah kc" data-aksi="hapus-pesanan">Hapus pesanan ini</button></p>') +
    '</div><div><div class="lekat"><div class="kartu gelap" id="k-bagi"></div></div></div></div>';
  renderBagi();
}
function fld(label, html) { return '<label class="f">' + label + html + '</label>'; }
function inp(k, type) { return '<input' + (type ? ' type="' + type + '"' : '') + ' data-e="' + k + '" value="' + esc(E.p[k]) + '">'; }

function htmlItem() {
  const layanan = H.KATEGORI_LAYANAN;
  const rows = E.items.map((it, i) => {
    const isL = layanan.includes(String(it.kategori).toLowerCase());
    return '<tr><td><select data-i="' + i + '" data-k="kategori">' + KATEGORI.map(k => '<option' + (k === it.kategori ? ' selected' : '') + '>' + k + '</option>').join('') + '</select></td>' +
      '<td><input data-i="' + i + '" data-k="nama" value="' + esc(it.nama) + '" style="min-width:130px;width:100%"></td>' +
      '<td><input type="number" data-i="' + i + '" data-k="harga" value="' + esc(it.harga) + '" style="width:92px"></td>' +
      '<td><input type="number" data-i="' + i + '" data-k="qty" value="' + esc(it.qty) + '" style="width:62px"></td>' +
      '<td>' + (isL ? '<input type="number" data-i="' + i + '" data-k="modal" value="' + esc(it.modal === undefined ? '' : it.modal) + '" placeholder="isi" style="width:86px" title="Modal per satuan (harga pokok)">' : '') + '</td>' +
      '<td class="r tebal" data-sub="' + i + '">' + rp(num(it.harga) * num(it.qty)) + '</td>' +
      '<td>' + (isL ? '<select data-i="' + i + '" data-k="pengelola_id" style="min-width:110px">' + opsiAnggota(it.pengelola_id, '— pilih —') + '</select>' : '<span class="mut kecil">ikut pembagian outbound</span>') + '</td>' +
      '<td class="c">' + (isL ? '<input type="checkbox" data-i="' + i + '" data-k="sendiri"' + (it.sendiri === true || it.sendiri === 'true' ? ' checked' : '') + ' title="Order dibawa sendiri oleh pengelola (fee lebih kecil)">' : '') + '</td>' +
      '<td><button class="btn merah kc" data-hapus-item="' + i + '" title="Hapus baris">✕</button></td></tr>';
  }).join('');
  const kat = (D.katalog || []).filter(k => !(k.aktif === false || String(k.aktif).toUpperCase() === 'FALSE'));
  const total = E.items.reduce((s, it) => s + num(it.harga) * num(it.qty), 0);
  return '<div class="kh"><h2>Rincian item</h2><b id="total-item">' + rp(total) + '</b></div>' +
    '<div class="tw"><table><thead><tr><th>Kategori</th><th>Uraian</th><th>Harga</th><th>Qty</th><th title="Modal per satuan, khusus layanan">Modal</th><th class="r">Subtotal</th><th>Pengelola</th><th class="c" title="Dibawa sendiri">Sendiri</th><th></th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="9" class="kosong">Belum ada item.</td></tr>') + '</tbody></table></div>' +
    '<div class="toolbar" style="margin-top:10px"><select id="tambah-kat" style="flex:1;min-width:200px"><option value="">+ Tambah dari katalog…</option>' +
    kat.map(k => '<option value="' + esc(k.id) + '">' + esc(k.nama) + ' — ' + rp(k.harga) + '/' + esc(k.satuan) + '</option>').join('') + '</select>' +
    '<input type="number" id="tambah-qty" placeholder="Qty" style="width:90px" value="' + esc(E.p.peserta || 1) + '"><button class="btn ab" data-aksi="tambah-item">Tambah</button>' +
    '<button class="btn ab" data-aksi="item-kosong">+ Baris manual</button></div>' +
    '<p class="mut kecil" style="margin-top:8px">Kategori <b>outbound</b> &amp; <b>lainnya</b> masuk pembagian bertingkat. Kaos, jersey, bordir, catering, dokumentasi: isi modal per satuan &amp; pengelolanya — fee Malomo dihitung dari labanya (harga − modal). Diskon: tambahkan baris dengan harga minus.</p>';
}

function htmlBiaya() {
  const a = H.aturan(S(), E.override);
  const h = H.hitungProyek(proyekE(), [], S());
  const ph = (persen, nilai) => 'otomatis ' + persen + '% = ' + rp(nilai);
  const o = E.override || {};
  const pf = (k, label) => fld(label, '<input type="number" step="0.5" data-o="' + k + '" value="' + esc(o[k] === undefined ? '' : o[k]) + '" placeholder="' + esc(S()[k] || H.DEFAULT[k]) + '">');
  return '<h2>Biaya &amp; pembawa order</h2><div class="grid g3">' +
    fld('Akomodasi &amp; transport <small>kosongkan = otomatis</small>', '<input type="number" data-e="biaya_akomodasi" value="' + esc(E.p.biaya_akomodasi) + '" placeholder="' + esc(ph(a.persen_akomodasi, Math.round(h.pendapatanOutbound * a.persen_akomodasi / 100))) + '">') +
    fld('Pembelian barang Malomo <small>kosongkan = otomatis</small>', '<input type="number" data-e="biaya_barang" value="' + esc(E.p.biaya_barang) + '" placeholder="' + esc(ph(a.persen_barang, Math.round(h.pendapatanOutbound * a.persen_barang / 100))) + '">') +
    fld('Pembawa order', '<select data-e="pembawa_id">' + opsiAnggota(E.p.pembawa_id, 'Tidak ada (masuk kas Malomo)') + '</select>') + '</div>' +
    '<details style="margin-top:12px"' + (Object.keys(o).some(k => o[k] !== '' && o[k] !== undefined) ? ' open' : '') + '><summary>Ubah persen khusus proyek ini</summary><div class="grid g3" style="margin-top:8px">' +
    pf('persen_kas', 'Kas Malomo %') + pf('persen_pembawa', 'Pembawa order %') + pf('persen_instruktur', 'Instruktur %') + pf('persen_kas_bersama', 'Kas bersama %') +
    pf('fee_layanan', 'Fee layanan %') + pf('fee_layanan_sendiri', 'Fee dibawa sendiri %') + '</div><p class="mut kecil">Kosongkan untuk memakai pengaturan umum.</p></details>';
}

function htmlKru() {
  const hari = Math.max(1, num(E.p.jumlah_hari) || 1);
  const peran = H.daftarPeran(S().peran);
  const rows = E.kru.map((k, i) => '<tr><td><select data-kr="' + i + '" data-k="anggota_id" style="min-width:130px">' + opsiAnggota(k.anggota_id, '— pilih —') + '</select></td>' +
    '<td><select data-kr="' + i + '" data-k="peran" style="min-width:150px">' + peran.map(r => '<option value="' + esc(r.nama) + '"' + (r.nama === k.peran ? ' selected' : '') + '>' + esc(r.nama) + ' (×' + r.bobot + ')</option>').join('') + '</select></td>' +
    '<td><div class="hari-sel">' + k.hadir.map((v, d) => '<select data-kr="' + i + '" data-h="' + d + '" title="Hari ' + (d + 1) + '">' +
      [[1, 'H' + (d + 1) + ' penuh'], [0.5, 'H' + (d + 1) + ' ½'], [0, 'H' + (d + 1) + ' —']].map(o => '<option value="' + o[0] + '"' + (num(v) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>').join('') + '</div></td>' +
    '<td><input type="number" data-kr="' + i + '" data-k="manual" value="' + esc(k.manual) + '" placeholder="otomatis" style="width:110px"></td>' +
    '<td class="r" data-kru-poin="' + i + '">-</td><td class="r tebal" data-kru-terima="' + i + '">-</td>' +
    '<td><button class="btn merah kc" data-hapus-kru="' + i + '">✕</button></td></tr>').join('');
  return '<div class="kh"><h2>Kru &amp; kehadiran</h2><span class="mut kecil">' + hari + ' hari kegiatan</span></div>' +
    '<div class="tw"><table><thead><tr><th>Anggota</th><th>Peran</th><th>Kehadiran per hari</th><th>Nominal manual</th><th class="r">Poin</th><th class="r">Diterima</th><th></th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="7" class="kosong">Belum ada kru. Tambahkan instruktur yang berangkat.</td></tr>') + '</tbody></table></div>' +
    '<div class="toolbar" style="margin-top:10px"><button class="btn ab" data-aksi="tambah-kru">+ Tambah kru</button><button class="btn ab" data-aksi="kru-semua">+ Semua anggota aktif</button></div>' +
    '<p class="mut kecil" style="margin-top:8px">Poin = bobot peran × hari hadir (½ hari = 0,5). Dana instruktur dibagi menurut poin. Isi nominal manual bila ada yang dibayar tetap; sisanya dibagi ke yang lain.</p>';
}

function htmlInvoice() {
  if (E.baru) return '<h2>Invoice</h2><p class="mut">Simpan pesanan dulu untuk membuat invoice.</p>';
  const list = D.invoice.filter(i => i.pesanan_id === E.p.id).sort((a, b) => String(a.no).localeCompare(String(b.no)));
  const rows = list.map(i => '<tr><td class="tebal">' + esc(i.no) + '</td><td>' + esc(i.jenis) + '</td><td>' + tglIndo(i.tanggal) + '</td><td class="r">' + rp(i.jumlah) + '</td><td>' +
    pill(i.status === 'Lunas' ? 'Lunas' : 'Belum dibayar') + (i.dibayar_tgl ? '<div class="mut kecil">' + tglIndo(i.dibayar_tgl) + '</div>' : '') + '</td><td><div class="toolbar">' +
    '<button class="btn ab kc" data-inv-lihat="' + esc(i.no) + '">Lihat / cetak</button>' +
    (i.file_url ? '<a class="btn ab kc" target="_blank" href="' + esc(i.file_url) + '">PDF</a>' : '<button class="btn ab kc" data-inv-pdf="' + esc(i.no) + '">Buat PDF</button>') +
    '<button class="btn ab kc" data-inv-wa="' + esc(i.no) + '">Kirim WA</button>' +
    (i.status === 'Lunas' ? '<button class="btn ab kc" data-inv-status="' + esc(i.no) + '" data-st="Belum">Batalkan lunas</button>' : '<button class="btn hijau kc" data-inv-status="' + esc(i.no) + '" data-st="Lunas">Tandai lunas</button>') +
    '<button class="btn merah kc" data-inv-hapus="' + esc(i.no) + '">✕</button></div></td></tr>').join('');
  return '<div class="kh"><h2>Invoice</h2></div>' +
    (list.length ? '<div class="tw" style="margin-bottom:12px"><table><thead><tr><th>No</th><th>Jenis</th><th>Tanggal</th><th class="r">Jumlah</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') +
    '<div class="grid g4"><label class="f">Jenis<select id="inv-jenis"><option>DP</option><option>Pelunasan</option><option>Penuh</option></select></label>' +
    '<label class="f">Jumlah<input type="number" id="inv-jumlah"></label><label class="f">Tanggal<input type="date" id="inv-tgl" value="' + hariIni() + '"></label>' +
    '<label class="f">Catatan<input id="inv-catatan" placeholder="opsional"></label></div>' +
    '<div class="toolbar" style="margin-top:10px"><label class="kecil" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="inv-pdf" checked> Simpan PDF ke Google Drive</label>' +
    '<button class="btn" data-aksi="buat-invoice">Buat invoice</button></div>';
}

function saranInvoice() {
  const el = $('#inv-jumlah'); if (!el) return;
  const total = E.items.reduce((s, it) => s + num(it.harga) * num(it.qty), 0);
  const jenis = $('#inv-jenis').value;
  const lain = D.invoice.filter(i => i.pesanan_id === E.p.id);
  const sudah = lain.filter(i => i.status === 'Lunas').reduce((s, i) => s + num(i.jumlah), 0);
  el.value = jenis === 'DP' ? Math.round(total * 0.5 / 1000) * 1000 : jenis === 'Pelunasan' ? Math.max(0, total - sudah) : total;
}

function proyekE() {
  return { items: E.items, pembawa_id: E.p.pembawa_id, pembawa_nama: namaAnggota(E.p.pembawa_id), biaya_akomodasi: E.p.biaya_akomodasi, biaya_barang: E.p.biaya_barang, override: E.override };
}
function kruE() { return E.kru.map(k => ({ anggota_id: k.anggota_id, nama: namaAnggota(k.anggota_id), peran: k.peran, hadir: k.hadir.join('|'), manual: k.manual })); }

function renderBagi() {
  const h = H.hitungProyek(proyekE(), kruE(), S());
  const a = h.aturan;
  const b = (label, nilai, cls) => '<div class="baris ' + (cls || '') + '"><span>' + label + '</span><b>' + nilai + '</b></div>';
  let html = '<h2 style="margin-bottom:10px">Pembagian hasil</h2><div class="alur">' +
    b('Pendapatan outbound', rp(h.pendapatanOutbound)) +
    b('− Akomodasi &amp; transport <span class="mut">(' + (h.akomodasiManual ? 'manual' : a.persen_akomodasi + '%') + ')</span>', rp(h.akomodasi), 'sub') +
    b('− Barang Malomo <span class="mut">(' + (h.barangManual ? 'manual' : a.persen_barang + '%') + ')</span>', rp(h.barang), 'sub') +
    b('Laba bersih', rp(h.laba), 'tot') +
    b('Kas Malomo <span class="mut">(' + a.persen_kas + '%' + (E.p.pembawa_id ? '' : ' + ' + a.persen_pembawa + '%') + ')</span>', rp(h.pos.kas), 'sub') +
    b('Pembawa order <span class="mut">(' + a.persen_pembawa + '%' + (E.p.pembawa_id ? ' · ' + esc(namaAnggota(E.p.pembawa_id)) : '') + ')</span>', rp(h.pos.pembawa), 'sub') +
    b('Dana instruktur <span class="mut">(' + a.persen_instruktur + '%)</span>', rp(h.pos.instruktur), 'sub') +
    b('Kas bersama anggota <span class="mut">(' + a.persen_kas_bersama + '%)</span>', rp(h.pos.kasBersama), 'sub') + '</div>';
  if (h.kru.length) {
    html += '<h3 style="margin:16px 0 6px">Instruktur <span class="mut kecil">' + (h.totalPoin ? rp(Math.floor(h.perPoin)) + '/poin' : '') + '</span></h3><div class="alur">' +
      h.kru.map(k => b(esc(k.nama || '(belum dipilih)') + ' <span class="mut">' + esc(k.peran) + ' · ' + k.hari + ' hr' + (k.manual !== null ? ' · manual' : ' · ' + k.poin + ' poin') + '</span>', rp(k.diterima), 'sub')).join('') + '</div>';
  }
  if (h.layanan.length) {
    html += '<h3 style="margin:16px 0 6px">Layanan tambahan</h3><div class="alur">' +
      h.layanan.map(l => b(esc(l.nama) + ' <span class="mut">' + rp(l.nilai) + (l.adaModal ? ' − modal ' + rp(l.modal) + ' = laba ' + rp(l.laba) + ' · fee ' + String(l.persen).replace('.', ',') + '% = ' + rp(l.fee) : ' · modal belum diisi') + '</span>',
        rp(l.untukPengelola) + '<div class="mut kecil" style="font-weight:400">' + esc(namaAnggota(l.pengelola_id) || 'pengelola?') + '</div>', 'sub')).join('') + '</div>';
  }
  html += '<div class="alur" style="margin-top:14px">' + b('Total nilai pesanan', rp(h.total), 'tot') + b('Kas Malomo dari proyek ini <span class="mut">(kas + fee layanan)</span>', '<span class="angka-or">' + rp(h.kasMalomoTotal) + '</span>') + '</div>';
  if (h.perAnggota.length) {
    html += '<h3 style="margin:16px 0 6px">Diterima per anggota</h3><div class="alur">' +
      h.perAnggota.map(pa => b(esc(namaAnggota(pa.anggota_id)) + ' <span class="mut">' + [pa.instruktur ? 'instruktur' : '', pa.pembawa ? 'pembawa' : '', pa.layanan ? 'layanan' : ''].filter(String).join(' + ') + '</span>', rp(pa.total), 'sub')).join('') +
      '</div><p class="mut kecil" style="margin-top:6px">Kas bersama dibagi rata ke semua anggota aktif di Rekap Bulanan (status Selesai/Lunas).</p>';
  }
  if (h.peringatan.length) html += '<div class="peringatan">' + h.peringatan.map(x => '<div>⚠ ' + esc(x) + '</div>').join('') + '</div>';
  html += '<button class="btn" data-aksi="simpan" style="width:100%;justify-content:center;margin-top:14px">Simpan pesanan</button>';
  $('#k-bagi').innerHTML = html;
  // isi poin & diterima di tabel kru
  h.kru.forEach((k, i) => {
    const p = $('[data-kru-poin="' + i + '"]'); if (p) p.textContent = k.manual !== null ? 'manual' : String(k.poin).replace('.', ',');
    const t = $('[data-kru-terima="' + i + '"]'); if (t) t.textContent = rp(k.diterima);
  });
  const tot = $('#total-item'); if (tot) tot.textContent = rp(h.total);
}

async function simpanPesanan() {
  if (!E.p.nama && !E.p.instansi) { toast('Isi nama pemesan atau instansi dulu.', true); return; }
  if (['Selesai', 'Lunas'].includes(E.p.status) && !E.p.tgl_mulai) { toast('Isi tanggal kegiatan dulu (dipakai untuk rekap bulanan).', true); return; }
  if (E.kru.some(k => !k.anggota_id)) { toast('Ada baris kru yang belum dipilih anggotanya.', true); return; }
  const tombol = $$('[data-aksi="simpan"]'); tombol.forEach(b => { b.disabled = true; });
  try {
    const p = Object.assign({}, E.p);
    p.items_json = JSON.stringify(E.items.map(it => Object.assign({}, it, { harga: num(it.harga), qty: num(it.qty) })));
    const o = {}; Object.keys(E.override || {}).forEach(k => { if (E.override[k] !== '' && E.override[k] !== undefined) o[k] = E.override[k]; });
    p.override_json = Object.keys(o).length ? JSON.stringify(o) : '';
    const s = await panggil('adminSimpanPesanan', p);
    const kru = await panggil('adminSimpanKru', s.id, kruE());
    const idx = D.pesanan.findIndex(x => x.id === s.id);
    if (idx >= 0) D.pesanan[idx] = s; else D.pesanan.push(s);
    D.kru = D.kru.filter(k => k.pesanan_id !== s.id).concat(kru);
    E.p = Object.assign({}, s); E.baru = false; E.dirty = false;
    toast('Tersimpan: ' + s.id);
    renderEditor();
  } catch (e) { toast(pesanGalat(e), true); }
  finally { tombol.forEach(b => { b.disabled = false; }); }
}

function bukaJendela() {
  const w = window.open('', '_blank');
  if (w) w.document.write('<p style="font-family:sans-serif;padding:24px">Menyiapkan invoice…</p>');
  return w;
}
function bukaHtml(html, w) {
  w = w || window.open('', '_blank');
  if (!w) { toast('Izinkan pop-up untuk menampilkan invoice.', true); return; }
  const bar = '<div class="noprint" style="position:sticky;top:0;background:#1C1C1E;padding:10px;text-align:center;margin:-24px -24px 16px">' +
    '<button onclick="window.print()" style="background:#E8772E;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer">Cetak / Simpan sebagai PDF</button></div>';
  w.document.open();
  w.document.write(html.replace('</style>', '@media print{.noprint{display:none}}</style>').replace('<body>', '<body>' + bar));
  w.document.close();
}

function teksWaInvoice(inv) {
  const s = S();
  return 'Assalamu\'alaikum Bapak/Ibu ' + (E.p.nama || '') + ',\n\nBerikut invoice ' + inv.jenis + ' kegiatan bersama Malomo' + (E.p.instansi ? ' (' + E.p.instansi + ')' : '') + ':\n' +
    'No: ' + inv.no + '\nTanggal kegiatan: ' + tglIndo(E.p.tgl_mulai) + '\nJumlah tagihan: ' + rp(inv.jumlah) + '\nJatuh tempo: ' + tglIndo(inv.jatuh_tempo) +
    (inv.file_url ? '\nPDF: ' + inv.file_url : '') + (s.rekening ? '\n\nPembayaran ke: ' + s.rekening : '') +
    '\n\nMohon kirim bukti transfer dengan menyebut nomor invoice. Jazakumullahu khairan.\n\nAdmin Malomo';
}

/* ====================== REKAP BULANAN ====================== */
function vRekap() {
  const r = H.rekapBulan(BULAN, { pesanan: D.pesanan.map(parsePesanan), kru: D.kru, anggota: D.anggota }, S());
  const bayar = D.pembayaran.filter(b => b.bulan === BULAN);
  const dibayar = id => bayar.filter(b => b.anggota_id === id).reduce((s, b) => s + num(b.jumlah), 0);
  const t = r.total;
  const rows = r.anggota.map(a => {
    const sudah = dibayar(a.anggota_id), sisa = a.total - sudah;
    return '<tr><td class="tebal">' + esc(a.nama) + '</td><td class="r">' + rp(a.instruktur) + '</td><td class="r">' + rp(a.pembawa) + '</td><td class="r">' + rp(a.layanan) +
      '</td><td class="r">' + rp(a.kasBersama) + '</td><td class="r tebal">' + rp(a.total) + '</td><td class="r">' + rp(sudah) + '</td><td class="r ' + (sisa > 0 ? 'tebal' : 'mut') + '">' + rp(sisa) +
      '</td><td id="bayar-' + esc(a.anggota_id) + '">' + (sisa > 0 ? '<button class="btn ab kc" data-bayar="' + esc(a.anggota_id) + '" data-sisa="' + sisa + '">Catat bayar</button>' : '<span class="pill s-Selesai">Beres</span>') + '</td></tr>';
  }).join('');
  return '<div class="head"><h1>Rekap ' + bulanIndo(BULAN) + '</h1><div class="toolbar"><button class="btn ab kc" data-geser="-1">←</button><input type="month" id="bulan" value="' + BULAN + '"><button class="btn ab kc" data-geser="1">→</button></div></div>' +
    '<div class="grid g4" style="margin-bottom:14px">' + stat('Pendapatan', rp(t.pendapatan), r.proyek.length + ' proyek selesai/lunas') + stat('Kas Malomo', rp(t.kas + t.feeLayanan), 'kas ' + rp(t.kas) + ' + fee layanan ' + rp(t.feeLayanan)) +
    stat('Kas bersama', rp(t.kasBersama), rp(r.kasBersamaPerOrang) + ' × ' + r.jumlahAnggotaAktif + ' anggota aktif') + stat('Akomodasi + barang', rp(t.akomodasi + t.barang), 'akomodasi ' + rp(t.akomodasi) + ' · barang ' + rp(t.barang)) + '</div>' +
    (t.belumTerbagi ? '<div class="peringatan">⚠ ' + rp(t.belumTerbagi) + ' belum terbagi ke siapa pun (dana instruktur tanpa kru/kehadiran, atau layanan tanpa pengelola). Buka proyeknya dan lengkapi.</div>' : '') +
    '<div class="kartu"><div class="kh"><h2>Yang diterima tiap anggota</h2><span class="mut kecil">Layanan = hak pengelola (sudah termasuk modal produksi)</span></div><div class="tw"><table><thead><tr><th>Anggota</th><th class="r">Instruktur</th><th class="r">Pembawa order</th><th class="r">Layanan</th><th class="r">Kas bersama</th><th class="r">Total</th><th class="r">Sudah dibayar</th><th class="r">Sisa</th><th></th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="9" class="kosong">Belum ada data bulan ini.</td></tr>') + '</tbody></table></div></div>' +
    '<div class="kartu"><h2>Proyek yang dihitung</h2><div class="tw"><table><thead><tr><th>Kode</th><th>Klien</th><th>Tanggal</th><th class="r">Nilai</th><th class="r">Laba outbound</th><th class="r">Kas Malomo</th><th class="r">Instruktur</th><th class="r">Kas bersama</th></tr></thead><tbody>' +
    (r.proyek.length ? r.proyek.map(p => '<tr class="klik" data-buka="' + esc(p.id) + '"><td class="tebal">' + esc(p.id) + '</td><td>' + esc(p.nama) + '</td><td>' + tglIndo(p.tgl) + '</td><td class="r">' + rp(p.hasil.total) +
      '</td><td class="r">' + rp(p.hasil.laba) + '</td><td class="r">' + rp(p.hasil.kasMalomoTotal) + '</td><td class="r">' + rp(p.hasil.pos.instruktur) + '</td><td class="r">' + rp(p.hasil.pos.kasBersama) + '</td></tr>').join('')
      : '<tr><td colspan="8" class="kosong">Hanya proyek berstatus Selesai atau Lunas dengan tanggal kegiatan di bulan ini yang dihitung.</td></tr>') + '</tbody></table></div></div>' +
    (bayar.length ? '<div class="kartu"><h2>Catatan pembayaran ' + bulanIndo(BULAN) + '</h2><div class="tw"><table><thead><tr><th>Tanggal</th><th>Anggota</th><th class="r">Jumlah</th><th>Catatan</th><th>Dicatat</th><th></th></tr></thead><tbody>' +
      bayar.map(b => '<tr><td>' + tglIndo(b.tgl_bayar) + '</td><td>' + esc(namaAnggota(b.anggota_id) || b.nama) + '</td><td class="r">' + rp(b.jumlah) + '</td><td>' + esc(b.catatan) + '</td><td class="mut kecil">' + esc(b.dicatat_oleh) +
        '</td><td><button class="btn merah kc" data-hapus-bayar="' + esc(b.id) + '">✕</button></td></tr>').join('') + '</tbody></table></div></div>' : '');
}

/* ====================== ANGGOTA ====================== */
let FA = null;
function vAnggota() {
  const f = FA || { id: '', nama: '', wa: '', aktif: true, catatan: '' };
  const jumlahProyek = id => new Set(D.kru.filter(k => k.anggota_id === id).map(k => k.pesanan_id)).size;
  return '<div class="head"><h1>Anggota</h1><span class="mut">' + D.anggota.filter(aktif).length + ' aktif dari ' + D.anggota.length + '</span></div>' +
    '<div class="kartu"><h2>' + (f.id ? 'Ubah anggota' : 'Tambah anggota') + '</h2><div class="grid g4">' +
    '<label class="f">Nama<input id="a-nama" value="' + esc(f.nama) + '"></label><label class="f">WhatsApp<input id="a-wa" value="' + esc(f.wa) + '"></label>' +
    '<label class="f">Catatan<input id="a-catatan" value="' + esc(f.catatan) + '"></label><label class="f">Status<select id="a-aktif"><option value="true"' + (aktif(f) ? ' selected' : '') + '>Aktif (ikut kas bersama)</option><option value="false"' + (!aktif(f) ? ' selected' : '') + '>Nonaktif</option></select></label></div>' +
    '<div class="toolbar" style="margin-top:10px"><button class="btn" data-aksi="simpan-anggota">Simpan</button>' + (f.id ? '<button class="btn ab" data-aksi="batal-anggota">Batal</button><button class="btn merah" data-aksi="hapus-anggota">Hapus</button>' : '') + '</div></div>' +
    '<div class="kartu"><div class="tw"><table><thead><tr><th>Nama</th><th>WhatsApp</th><th>Status</th><th class="r">Proyek</th><th>Bergabung</th><th>Catatan</th></tr></thead><tbody>' +
    (D.anggota.length ? D.anggota.slice().sort((a, b) => String(a.nama).localeCompare(String(b.nama))).map(a => '<tr class="klik" data-anggota="' + esc(a.id) + '"><td class="tebal">' + esc(a.nama) + '</td><td>' + esc(a.wa) + '</td><td>' +
      (aktif(a) ? '<span class="pill s-Selesai">Aktif</span>' : '<span class="pill s-Batal">Nonaktif</span>') + '</td><td class="r">' + jumlahProyek(a.id) + '</td><td>' + tglIndo(a.bergabung) + '</td><td class="mut">' + esc(a.catatan) + '</td></tr>').join('')
      : '<tr><td colspan="6" class="kosong">Belum ada anggota. Tambahkan di atas.</td></tr>') + '</tbody></table></div></div>';
}

/* ====================== KATALOG ====================== */
let KD = null;
function vKatalog() {
  if (!KD) KD = D.katalog.map(k => Object.assign({}, k));
  const kat = ['outbound', 'paket', 'kaos', 'jersey', 'bordir', 'catering', 'dokumentasi', 'lainnya'];
  const rows = KD.map((k, i) => {
    const salah = k.kategori === 'paket' && k.komponen && String(k.komponen).split('|').reduce((s, x) => s + num(x.split(':')[1]), 0) !== num(k.harga);
    const c = (f, w, t) => '<td><input' + (t ? ' type="' + t + '"' : '') + ' data-kt="' + i + '" data-k="' + f + '" value="' + esc(k[f]) + '" style="width:' + w + 'px"></td>';
    return '<tr' + (salah ? ' style="background:#FFF4D6"' : '') + '><td class="c"><input type="checkbox" data-kt="' + i + '" data-k="aktif"' + (String(k.aktif).toUpperCase() !== 'FALSE' && k.aktif !== false ? ' checked' : '') + '></td>' +
      c('id', 100) + '<td><select data-kt="' + i + '" data-k="kategori">' + kat.map(x => '<option' + (x === k.kategori ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></td>' +
      c('grup', 140) + c('nama', 170) + c('harga', 100, 'number') + c('modal', 96, 'number') + c('satuan', 80) + c('min', 64, 'number') + c('badge', 80) + c('keterangan', 260) + c('komponen', 220) + c('urutan', 64, 'number') +
      '<td><button class="btn merah kc" data-hapus-kat="' + i + '">✕</button></td></tr>';
  }).join('');
  return '<div class="head"><h1>Katalog harga</h1><button class="btn ab" data-aksi="tambah-katalog">+ Item</button><button class="btn" data-aksi="simpan-katalog">Simpan katalog</button></div>' +
    '<div class="kartu"><p class="mut kecil" style="margin-bottom:10px">Harga di sini dipakai website (rancang paket) dan dihitung ulang server saat pesanan masuk. Keterangan: pisahkan poin dengan <b>|</b>. Komponen (khusus paket) memecah harga untuk pembagian, contoh <b>outbound:75000|kaos:80000</b> — jumlahnya harus sama dengan harga (baris kuning = belum sama). Grup yang diawali "Tambahan" tampil sebagai biaya tambahan. <b>Modal</b> (harga pokok layanan) tidak tampil di website; dipakai untuk fee Malomo dari laba.</p>' +
    '<div class="tw"><table><thead><tr><th>Aktif</th><th>ID</th><th>Kategori</th><th>Grup</th><th>Nama</th><th>Harga</th><th title="Harga pokok, tidak tampil di website">Modal</th><th>Satuan</th><th>Min</th><th>Badge</th><th>Keterangan</th><th>Komponen</th><th>Urutan</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

/* ====================== PENGATURAN ====================== */
const GRUP_SET = [
  ['Pembagian hasil outbound', ['persen_akomodasi', 'persen_barang', 'persen_kas', 'persen_pembawa', 'persen_instruktur', 'persen_kas_bersama']],
  ['Layanan tambahan & kru', ['fee_layanan', 'fee_layanan_sendiri', 'peran']],
  ['Usaha & invoice', ['nama_usaha', 'alamat', 'wa_admin1', 'wa_admin2', 'instagram', 'website_url', 'rekening', 'catatan_invoice', 'jatuh_tempo_hari']],
  ['Google Drive', ['katalog_id', 'galeri_folder_id', 'galeri_maks', 'galeri_cache_detik', 'foto_hero_id', 'invoice_folder_id']],
  ['Akses & notifikasi', ['admin_email', 'notif_email']]
];
function vPengaturan() {
  const rows = {}; D.pengaturan.forEach(r => { rows[r.kunci] = r; });
  const dipakai = new Set(GRUP_SET.flatMap(g => g[1]));
  const lain = Object.keys(rows).filter(k => !dipakai.has(k));
  const grup = GRUP_SET.concat(lain.length ? [['Lainnya', lain]] : []);
  const s = S();
  const totalPersen = ['persen_kas', 'persen_pembawa', 'persen_instruktur', 'persen_kas_bersama'].reduce((t, k) => t + num(s[k]), 0);
  return '<div class="head"><h1>Pengaturan</h1><button class="btn" data-aksi="simpan-pengaturan">Simpan pengaturan</button></div>' +
    grup.map(g => '<div class="kartu"><div class="kh"><h2>' + g[0] + '</h2>' + (g[0].startsWith('Pembagian') ? '<span id="cek-persen" class="pill ' + (Math.abs(totalPersen - 100) < .001 ? 's-Selesai' : 's-Penawaran') + '">Laba dibagi: ' + totalPersen + '%</span>' : '') + '</div><div class="grid g2">' +
      g[1].map(k => '<label class="f">' + esc(k) + (rows[k] && rows[k].keterangan ? ' <small>' + esc(rows[k].keterangan) + '</small>' : '') +
        (k === 'catatan_invoice' || k === 'rekening' ? '<textarea rows="2" data-set="' + esc(k) + '">' + esc(s[k]) + '</textarea>' : '<input data-set="' + esc(k) + '" value="' + esc(s[k] === undefined ? '' : s[k]) + '">') + '</label>').join('') +
      '</div></div>').join('') +
    '<p class="mut kecil">Versi server ' + esc(D.versi) + ' · login sebagai ' + esc(D.user) + '</p>';
}

/* ====================== EVENT ====================== */
document.addEventListener('click', async e => {
  const t = e.target.closest('button,[data-buka],[data-anggota],a');
  if (!t) return;
  const d = t.dataset;
  if (t.closest('#menu') && d.v) return buka(d.v);
  if (d.buka) return bukaPesanan(d.buka);
  if (d.anggota) { FA = Object.assign({}, anggotaById(d.anggota)); return render(); }
  if (d.geser) { const [y, m] = BULAN.split('-').map(Number); const dt = new Date(y, m - 1 + Number(d.geser), 1); BULAN = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); return render(); }
  if (d.hapusItem !== undefined) { E.items.splice(Number(d.hapusItem), 1); E.dirty = true; $('#k-item').innerHTML = htmlItem(); $('#k-biaya').innerHTML = htmlBiaya(); return renderBagi(); }
  if (d.hapusKru !== undefined) { E.kru.splice(Number(d.hapusKru), 1); E.dirty = true; $('#k-kru').innerHTML = htmlKru(); return renderBagi(); }
  if (d.hapusKat !== undefined) { KD.splice(Number(d.hapusKat), 1); return render(); }
  if (d.bayar) {
    const cell = $('#bayar-' + CSS.escape(d.bayar));
    cell.innerHTML = '<div class="toolbar"><input type="number" id="by-jml" value="' + d.sisa + '" style="width:110px"><input type="date" id="by-tgl" value="' + hariIni() + '" style="width:140px"><button class="btn hijau kc" data-bayar-ok="' + esc(d.bayar) + '">Simpan</button></div>';
    return;
  }
  if (d.bayarOk) {
    try {
      const b = await panggil('adminCatatPembayaran', { bulan: BULAN, anggota_id: d.bayarOk, nama: namaAnggota(d.bayarOk), jumlah: num($('#by-jml').value), tgl_bayar: $('#by-tgl').value, catatan: 'Bagi hasil ' + bulanIndo(BULAN) });
      D.pembayaran.push(b); toast('Pembayaran dicatat'); render();
    } catch (er) { toast(pesanGalat(er), true); }
    return;
  }
  if (d.hapusBayar) { try { await panggil('adminHapusPembayaran', d.hapusBayar); D.pembayaran = D.pembayaran.filter(b => b.id !== d.hapusBayar); render(); } catch (er) { toast(pesanGalat(er), true); } return; }
  if (d.invLihat) { const w = bukaJendela(); try { bukaHtml(await panggil('adminHtmlInvoice', d.invLihat), w); } catch (er) { if (w) w.close(); toast(pesanGalat(er), true); } return; }
  if (d.invPdf) {
    t.disabled = true; t.textContent = 'Membuat…';
    try { const url = await panggil('adminPdfInvoice', d.invPdf); D.invoice.find(i => i.no === d.invPdf).file_url = url; $('#k-invoice').innerHTML = htmlInvoice(); saranInvoice(); toast('PDF tersimpan di Drive'); }
    catch (er) { toast(pesanGalat(er), true); t.disabled = false; t.textContent = 'Buat PDF'; }
    return;
  }
  if (d.invWa) { const inv = D.invoice.find(i => i.no === d.invWa); window.open('https://wa.me/' + waNo(E.p.wa) + '?text=' + encodeURIComponent(teksWaInvoice(inv)), '_blank'); return; }
  if (d.invStatus) {
    try { const inv = await panggil('adminStatusInvoice', d.invStatus, d.st, hariIni()); const i = D.invoice.findIndex(x => x.no === inv.no); D.invoice[i] = inv; $('#k-invoice').innerHTML = htmlInvoice(); saranInvoice(); toast(inv.status === 'Lunas' ? 'Ditandai lunas' : 'Status dikembalikan'); }
    catch (er) { toast(pesanGalat(er), true); }
    return;
  }
  if (d.invHapus) {
    let ya = true; try { ya = confirm('Hapus invoice ' + d.invHapus + '?'); } catch (x) { /* */ }
    if (!ya) return;
    try { await panggil('adminHapusInvoice', d.invHapus); D.invoice = D.invoice.filter(i => i.no !== d.invHapus); $('#k-invoice').innerHTML = htmlInvoice(); saranInvoice(); } catch (er) { toast(pesanGalat(er), true); }
    return;
  }
  switch (d.aksi) {
    case 'pesanan-baru': return bukaPesanan('');
    case 'kembali': if (bolehPindah()) { E = null; render(); } return;
    case 'simpan': return simpanPesanan();
    case 'hapus-pesanan': {
      let ya = true; try { ya = confirm('Hapus pesanan ' + E.p.id + ' beserta data kru-nya? Invoice tetap tersimpan.'); } catch (x) { /* */ }
      if (!ya) return;
      try { await panggil('adminHapusPesanan', E.p.id); D.pesanan = D.pesanan.filter(p => p.id !== E.p.id); D.kru = D.kru.filter(k => k.pesanan_id !== E.p.id); E = null; toast('Pesanan dihapus'); render(); }
      catch (er) { toast(pesanGalat(er), true); }
      return;
    }
    case 'tambah-item': {
      const k = D.katalog.find(x => x.id === $('#tambah-kat').value);
      if (!k) return toast('Pilih item katalog dulu.', true);
      const qty = Math.max(1, num($('#tambah-qty').value) || 1);
      const kom = String(k.komponen || '').split('|').map(s => s.split(':')).filter(x => x[0] && num(x[1]));
      if (k.kategori === 'paket' && kom.length && kom.reduce((s, x) => s + num(x[1]), 0) === num(k.harga)) {
        kom.forEach(x => E.items.push({ kode: k.id, kategori: x[0].trim().toLowerCase(), nama: k.nama + ' — ' + x[0].trim(), harga: num(x[1]), qty, satuan: k.satuan, paket: k.nama, pengelola_id: '', sendiri: false, modal: '' }));
      } else {
        E.items.push({ kode: k.id, kategori: k.kategori === 'paket' ? 'outbound' : k.kategori, nama: k.nama, harga: num(k.harga), qty, satuan: k.satuan, paket: '', pengelola_id: '', sendiri: false, modal: k.modal === undefined ? '' : k.modal });
      }
      E.dirty = true; $('#k-item').innerHTML = htmlItem(); $('#k-biaya').innerHTML = htmlBiaya(); return renderBagi();
    }
    case 'item-kosong': E.items.push({ kode: '', kategori: 'lainnya', nama: '', harga: 0, qty: 1, satuan: '', paket: '', pengelola_id: '', sendiri: false }); E.dirty = true; $('#k-item').innerHTML = htmlItem(); return renderBagi();
    case 'tambah-kru': E.kru.push({ anggota_id: '', peran: 'Instruktur', manual: '', hadir: ukuranHadir([], Math.max(1, num(E.p.jumlah_hari) || 1)) }); E.dirty = true; $('#k-kru').innerHTML = htmlKru(); return renderBagi();
    case 'kru-semua': {
      const ada = new Set(E.kru.map(k => k.anggota_id));
      D.anggota.filter(a => aktif(a) && !ada.has(a.id)).forEach(a => E.kru.push({ anggota_id: a.id, peran: 'Instruktur', manual: '', hadir: ukuranHadir([], Math.max(1, num(E.p.jumlah_hari) || 1)) }));
      E.dirty = true; $('#k-kru').innerHTML = htmlKru(); return renderBagi();
    }
    case 'buat-invoice': {
      if (E.dirty) return toast('Simpan perubahan pesanan dulu sebelum membuat invoice.', true);
      t.disabled = true; t.textContent = 'Membuat…';
      const w = bukaJendela();
      try {
        const r = await panggil('adminBuatInvoice', { pesanan_id: E.p.id, jenis: $('#inv-jenis').value, jumlah: num($('#inv-jumlah').value), tanggal: $('#inv-tgl').value, catatan: $('#inv-catatan').value, simpanPdf: $('#inv-pdf').checked });
        D.invoice.push(r.invoice);
        $('#k-invoice').innerHTML = htmlInvoice(); saranInvoice();
        toast('Invoice ' + r.invoice.no + ' dibuat' + (r.invoice.pdf_galat ? ' (' + r.invoice.pdf_galat + ')' : ''));
        bukaHtml(r.html, w);
      } catch (er) { if (w) w.close(); toast(pesanGalat(er), true); t.disabled = false; t.textContent = 'Buat invoice'; }
      return;
    }
    case 'simpan-anggota': {
      const a = Object.assign({}, FA || {}, { nama: $('#a-nama').value.trim(), wa: $('#a-wa').value.trim(), catatan: $('#a-catatan').value.trim(), aktif: $('#a-aktif').value === 'true' });
      try { const s = await panggil('adminSimpanAnggota', a); const i = D.anggota.findIndex(x => x.id === s.id); if (i >= 0) D.anggota[i] = s; else D.anggota.push(s); FA = null; toast('Anggota tersimpan'); render(); }
      catch (er) { toast(pesanGalat(er), true); }
      return;
    }
    case 'batal-anggota': FA = null; return render();
    case 'hapus-anggota': {
      try { await panggil('adminHapusAnggota', FA.id); D.anggota = D.anggota.filter(a => a.id !== FA.id); FA = null; toast('Anggota dihapus'); render(); }
      catch (er) { toast(pesanGalat(er), true); }
      return;
    }
    case 'tambah-katalog': KD.push({ id: 'item-' + (KD.length + 1), kategori: 'outbound', grup: '', nama: '', harga: 0, satuan: 'orang', min: 1, badge: '', keterangan: '', komponen: '', aktif: true, urutan: (KD.length + 1) * 10 }); return render();
    case 'simpan-katalog': {
      const ids = KD.map(k => k.id); if (new Set(ids).size !== ids.length) return toast('Ada ID katalog yang sama. ID harus unik.', true);
      try { D.katalog = await panggil('adminSimpanKatalog', KD); KD = null; toast('Katalog tersimpan'); render(); }
      catch (er) { toast(pesanGalat(er), true); }
      return;
    }
    case 'simpan-pengaturan': {
      const map = {}; $$('[data-set]').forEach(el => { map[el.dataset.set] = el.value.trim(); });
      const tot = ['persen_kas', 'persen_pembawa', 'persen_instruktur', 'persen_kas_bersama'].reduce((t, k) => t + num(map[k]), 0);
      if (Math.abs(tot - 100) > 0.001) return toast('Persen kas + pembawa + instruktur + kas bersama harus 100% (sekarang ' + tot + '%).', true);
      try { D.pengaturan = await panggil('adminSimpanPengaturan', map); toast('Pengaturan tersimpan'); render(); }
      catch (er) { toast(pesanGalat(er), true); }
      return;
    }
  }
});

document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (t.id === 'f-cari') { FILTER.cari = t.value; const pos = t.selectionStart; render(); const n = $('#f-cari'); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (!E && d.set !== undefined && String(d.set).startsWith('persen_')) {
    const tot = ['persen_kas', 'persen_pembawa', 'persen_instruktur', 'persen_kas_bersama'].reduce((s, k) => s + num(($('[data-set="' + k + '"]') || {}).value), 0);
    const el = $('#cek-persen'); if (el) { el.textContent = 'Laba dibagi: ' + tot + '%'; el.className = 'pill ' + (Math.abs(tot - 100) < .001 ? 's-Selesai' : 's-Penawaran'); }
    return;
  }
  if (d.kt !== undefined && KD) { const k = KD[Number(d.kt)]; k[d.k] = t.type === 'checkbox' ? t.checked : (t.type === 'number' ? (t.value === '' && d.k === 'modal' ? '' : num(t.value)) : t.value); return; }
  if (!E) return;
  if (d.e) {
    E.p[d.e] = t.value; E.dirty = true;
    if (d.e === 'jumlah_hari') { const n = Math.max(1, Math.min(14, num(t.value) || 1)); E.kru.forEach(k => { k.hadir = ukuranHadir(k.hadir, n); }); $('#k-kru').innerHTML = htmlKru(); }
    if (d.e === 'pembawa_id' || d.e === 'biaya_akomodasi' || d.e === 'biaya_barang' || d.e === 'jumlah_hari' || d.e === 'status') renderBagi();
    return;
  }
  if (d.o) { E.override[d.o] = t.value === '' ? '' : num(t.value); E.dirty = true; return renderBagi(); }
  if (d.i !== undefined) {
    const it = E.items[Number(d.i)];
    it[d.k] = t.type === 'checkbox' ? t.checked : (d.k === 'harga' || d.k === 'qty' ? num(t.value) : d.k === 'modal' ? (t.value === '' ? '' : num(t.value)) : t.value);
    E.dirty = true;
    if (d.k === 'kategori') { $('#k-item').innerHTML = htmlItem(); }
    const sub = $('[data-sub="' + d.i + '"]'); if (sub) sub.textContent = rp(num(it.harga) * num(it.qty));
    if (d.k === 'harga' || d.k === 'qty' || d.k === 'kategori') $('#k-biaya').innerHTML = htmlBiaya();
    return renderBagi();
  }
  if (d.kr !== undefined) {
    const k = E.kru[Number(d.kr)];
    if (d.h !== undefined) k.hadir[Number(d.h)] = num(t.value); else k[d.k] = d.k === 'manual' ? (t.value === '' ? '' : num(t.value)) : t.value;
    E.dirty = true; return renderBagi();
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-status') { FILTER.status = t.value; return render(); }
  if (t.id === 'bulan' && t.value) { BULAN = t.value; return render(); }
  if (t.id === 'inv-jenis') return saranInvoice();
  if (t.dataset.kt !== undefined && t.dataset.k === 'kategori') return render();
  if (t.dataset.e === 'status' && E) { E.p.status = t.value; E.dirty = true; renderBagi(); }
});
window.addEventListener('beforeunload', e => { if (E && E.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ====================== MULAI ====================== */
panggil('adminInit').then(d => {
  D = d;
  ['pesanan', 'kru', 'anggota', 'invoice', 'pembayaran', 'katalog', 'pengaturan'].forEach(k => { D[k] = D[k] || []; });
  $('#user').textContent = d.user;
  $('#layar').hidden = true; $('#app').hidden = false;
  buka('dasbor');
  const obs = new MutationObserver(() => saranInvoice());
  obs.observe($('#isi'), { childList: true });
}).catch(e => {
  const m = pesanGalat(e);
  $('#layar').innerHTML = '<div class="box"><h2 style="margin-bottom:8px">Tidak bisa membuka panel admin</h2><p>' + esc(m) + '</p>' +
    '<p class="mut kecil" style="margin-top:12px">Pastikan Anda login dengan akun Google yang terdaftar sebagai admin, akun itu diberi akses Editor ke Google Sheets "Malomo Database", dan membuka link deployment Admin.</p></div>';
});
