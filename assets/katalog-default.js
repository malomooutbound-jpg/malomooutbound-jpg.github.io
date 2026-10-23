/* FILE OTOMATIS dari src/ — jangan diubah manual, ubah di src/ lalu jalankan: node build.js */
/*
 * Katalog default Malomo 2026 (dari booklet "Katalog Paket Malomo 2026").
 * Setelah dipasang, harga diubah dari menu admin > Katalog (tersimpan di Google Sheets).
 * keterangan: beberapa poin dipisah dengan " | "
 * komponen (khusus paket): pemecahan harga per peserta untuk pembagian hasil,
 *   format "kategori:harga|kategori:harga" — jumlahnya harus sama dengan harga paket.
 * modal (khusus layanan, TIDAK tampil di website): harga pokok per satuan, dasar fee Malomo 3% dari laba.
 */
window.MALOMO_KATALOG_DEFAULT = [
  // ---------- OUTBOUND ----------
  { id: 'ob-sd', kategori: 'outbound', grup: 'Sekolah & pesantren', nama: 'Outbound SD / MI', harga: 50000, satuan: 'siswa', min: 50, badge: '', keterangan: 'Permainan sesuai usia anak | Durasi ½ hari', komponen: '' },
  { id: 'ob-smp', kategori: 'outbound', grup: 'Sekolah & pesantren', nama: 'Outbound SMP / MTs', harga: 65000, satuan: 'siswa', min: 50, badge: '', keterangan: 'Fun games & kerja sama tim | Durasi ½ hari', komponen: '' },
  { id: 'ob-sma', kategori: 'outbound', grup: 'Sekolah & pesantren', nama: 'Outbound SMA / MA / SMK', harga: 75000, satuan: 'siswa', min: 50, badge: '', keterangan: 'Fun games & team building | Durasi ½ hari', komponen: '' },
  { id: 'ob-fun', kategori: 'outbound', grup: 'Umum & instansi', nama: 'Fun Games', harga: 100000, satuan: 'orang', min: 30, badge: '', keterangan: 'Durasi ½ hari', komponen: '' },
  { id: 'ob-tb', kategori: 'outbound', grup: 'Umum & instansi', nama: 'Team Building', harga: 150000, satuan: 'orang', min: 30, badge: '', keterangan: 'Durasi ½ hari | Sesi refleksi', komponen: '' },
  { id: 'ob-full', kategori: 'outbound', grup: 'Umum & instansi', nama: 'Full Day', harga: 200000, satuan: 'orang', min: 30, badge: 'Terlaris', keterangan: 'Fun games + team building 1 hari', komponen: '' },

  // ---------- PAKET ACARA ----------
  { id: 'pk-class', kategori: 'paket', grup: 'Paket acara', nama: 'Class Meeting', harga: 155000, satuan: 'peserta', min: 40, badge: '', keterangan: 'Fun games ½ hari | Kaos sablon peserta', komponen: 'outbound:75000|kaos:80000' },
  { id: 'pk-milad', kategori: 'paket', grup: 'Paket acara', nama: 'Milad / Gathering', harga: 295000, satuan: 'peserta', min: 30, badge: 'Favorit', keterangan: 'Team building ½ hari | Kaos premium + bordir logo | Spanduk | Video dokumenter', komponen: 'outbound:150000|kaos:110000|bordir:15000|dokumentasi:20000' },
  { id: 'pk-olahraga', kategori: 'paket', grup: 'Paket acara', nama: 'Tim Olahraga', harga: 250000, satuan: 'orang', min: 12, badge: '', keterangan: 'Jersey Pro + nama & nomor | Bordir logo tim | Kaos latihan', komponen: 'jersey:250000' },

  // ---------- KAOS SABLON ----------
  { id: 'ks-hemat', kategori: 'kaos', grup: 'Kaos sablon', nama: 'Kaos Hemat', harga: 65000, satuan: 'pcs', min: 1, badge: '', keterangan: 'Cotton Combed 30s | Ukuran S – XXL | Tanpa minimal order', komponen: ''},
  { id: 'ks-reguler', kategori: 'kaos', grup: 'Kaos sablon', nama: 'Kaos Reguler', harga: 80000, satuan: 'pcs', min: 1, badge: 'Terlaris', keterangan: 'Cotton Combed 24s, lebih tebal | Ukuran S – XXL | Gratis desain', komponen: ''},
  { id: 'ks-premium', kategori: 'kaos', grup: 'Kaos sablon', nama: 'Kaos Premium', harga: 110000, satuan: 'pcs', min: 1, badge: '', keterangan: 'Cotton Combed 20s / oversize | Sablon DTF full color | Label, packing & revisi desain 3x', komponen: ''},
  { id: 'ks-lengan', kategori: 'kaos', grup: 'Tambahan kaos', nama: 'Tambahan lengan panjang', harga: 5000, satuan: 'pcs', min: 1, badge: '', keterangan: 'Biaya tambahan per pcs', komponen: '', tambahan: true },
  { id: 'ks-besar', kategori: 'kaos', grup: 'Tambahan kaos', nama: 'Tambahan ukuran XXXL – XXXXL', harga: 10000, satuan: 'pcs', min: 1, badge: '', keterangan: 'Biaya tambahan per pcs', komponen: '', tambahan: true },

  // ---------- JERSEY ----------
  { id: 'js-basic', kategori: 'jersey', grup: 'Jersey', nama: 'Jersey Basic (atasan)', harga: 80000, satuan: 'pcs', min: 6, badge: '', keterangan: 'Full printing (sublimasi) | Nama & nomor punggung | Min. 6 pcs', komponen: ''},
  { id: 'js-basic-set', kategori: 'jersey', grup: 'Jersey', nama: 'Jersey Basic (1 set)', harga: 140000, satuan: 'set', min: 6, badge: '', keterangan: 'Baju + celana | Nama & nomor punggung | Min. 6 set', komponen: ''},
  { id: 'js-pro', kategori: 'jersey', grup: 'Jersey', nama: 'Jersey Pro', harga: 200000, satuan: 'stel', min: 12, badge: 'Terlaris', keterangan: 'Baju + celana, min. 12 stel | Kerah custom | Logo sponsor tanpa batas, gratis desain', komponen: ''},
  { id: 'js-juara', kategori: 'jersey', grup: 'Jersey', nama: 'Jersey Juara', harga: 250000, satuan: 'stel', min: 10, badge: '', keterangan: 'Baju + celana, min. 10 stel | Logo tim bordir | Tas jersey, kaos kaki, gratis mockup', komponen: ''},

  // ---------- BORDIR ----------
  { id: 'bd-nama', kategori: 'bordir', grup: 'Bordir', nama: 'Bordir Nama', harga: 8000, satuan: 'titik', min: 20, badge: '', keterangan: 'Nama s/d 15 huruf | Min. 20 titik | Jadi 3 – 5 hari', komponen: ''},
  { id: 'bd-logo', kategori: 'bordir', grup: 'Bordir', nama: 'Bordir Logo', harga: 15000, satuan: 'titik', min: 24, badge: 'Terlaris', keterangan: 'Logo s/d 8×8 cm | Hingga 6 warna benang | Gratis setting pola, min. 24 titik', komponen: ''},
  { id: 'bd-badge', kategori: 'bordir', grup: 'Bordir', nama: 'Badge / Emblem', harga: 12000, satuan: 'pcs', min: 50, badge: '', keterangan: 'Badge / emblem lepas | Opsi perekat atau jahit | Min. 50 pcs', komponen: ''},

  // ---------- CATERING ----------
  { id: 'ct-hemat', kategori: 'catering', grup: 'Catering', nama: 'Catering Hemat', harga: 15000, satuan: 'porsi', min: 1, badge: '', keterangan: 'Konsumsi sederhana', komponen: ''},
  { id: 'ct-standar', kategori: 'catering', grup: 'Catering', nama: 'Catering Standar', harga: 20000, satuan: 'porsi', min: 1, badge: 'Terlaris', keterangan: 'Nasi kotak menu standar', komponen: ''},
  { id: 'ct-spesial', kategori: 'catering', grup: 'Catering', nama: 'Catering Spesial', harga: 25000, satuan: 'porsi', min: 1, badge: '', keterangan: 'Nasi kotak menu spesial', komponen: ''},

  // ---------- DOKUMENTASI ----------
  { id: 'dk-foto', kategori: 'dokumentasi', grup: 'Dokumentasi', nama: 'Foto & Reels', harga: 750000, satuan: 'kegiatan', min: 1, badge: '', keterangan: 'Foto kegiatan + video reels', komponen: ''},
  { id: 'dk-video', kategori: 'dokumentasi', grup: 'Dokumentasi', nama: 'Video Dokumenter', harga: 1000000, satuan: 'kegiatan', min: 1, badge: '', keterangan: 'Video dokumenter kegiatan', komponen: ''},
  { id: 'dk-drone', kategori: 'dokumentasi', grup: 'Dokumentasi', nama: 'Drone', harga: 1500000, satuan: 'kegiatan', min: 1, badge: '', keterangan: 'Pengambilan gambar udara', komponen: ''}
];

if (typeof module !== 'undefined' && module.exports) module.exports = KATALOG_DEFAULT;
