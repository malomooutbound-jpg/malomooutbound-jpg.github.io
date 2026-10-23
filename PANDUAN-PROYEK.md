# Malomo Outbound — Rekap & Panduan Proyek

Dokumen serah terima untuk melanjutkan proyek di Google Antigravity (atau editor lain).
Agen AI di editor sebaiknya membaca file ini dulu sebelum mengubah kode.

Status per 23 Oktober 2026: **website, server, database, dan panel admin sudah aktif.**

---

## 1. Alamat penting

| Bagian | Alamat / ID |
| --- | --- |
| Website publik | https://malomooutbound-jpg.github.io |
| Repo GitHub | https://github.com/malomooutbound-jpg/malomooutbound-jpg.github.io (akun `malomooutbound-jpg`) |
| Google Sheets (database) | "Malomo Database" — https://docs.google.com/spreadsheets/d/1B7e3mYd597l_jnNBKe16dIVe6LMe_D6m0yYCzBwKb0E/edit |
| Apps Script (server) | Proyek "Malomo Server", Script ID `1igza8Iqp53zI0PaKEe10M2VfSLaTu14cUe1SzSytYdcQJhCxt6XrtV6n` |
| API publik (deployment 1) | https://script.google.com/macros/s/AKfycbwSrXq8ZAR62bzIC-ZwF7y4e3nme6Q7nU_BtJbs9nYZPlyjdM_tybOvX13M611Ar8M/exec |
| Panel admin (deployment 2) | https://script.google.com/macros/s/AKfycbzz3zHwkGJcOWlScjD1B7mDFSzPpOA-qbGkslK9F1Qn_Z9fsB13kRHeV10KICmj1iIg/exec?page=admin |
| Booklet PDF (Drive) | ID `1vT-iN4DUJOSNtf1onHk_9CJoOVePvCad` |
| Folder galeri (Drive) | ID `14fvoKUxVZKi0FjXHAUdVeUpuJUiASIMo` |
| Logo asli (Drive) | ID `19q9UYuUrxC1wBn2FJYKnrCywlC2eoBNh` |
| Akun pemilik | malomooutbound@gmail.com (Google) |
| WhatsApp admin | Admin 1: 0877-7909-2032 · Admin 2: 0822-5952-9276 · IG @malomo.outbound |

Panel admin harus dibuka di jendela Incognito / profil Chrome yang **hanya** login ke malomooutbound@gmail.com
(Apps Script error bila ada beberapa akun Google login sekaligus).

---

## 2. Arsitektur

```
Klien ──► Website (GitHub Pages: index.html + assets/)
              │  GET ?api=katalog  /  POST {aksi:'pesan'}
              ▼
          API publik (Apps Script, jalankan sebagai pemilik, akses: siapa saja)
              │
              ▼
          Google Sheets "Malomo Database" + Google Drive (galeri, booklet, PDF invoice)
              ▲
              │  google.script.run
Tim admin ──► Panel admin (Apps Script, jalankan sebagai pengguna yang mengakses, akses: akun Google)
```

- Website tetap jalan tanpa API (katalog bawaan + kirim lewat WhatsApp).
- Harga pesanan **dihitung ulang di server** dari sheet Katalog; harga dari browser tidak dipercaya.
- Hitungan pembagian hasil berjalan di browser admin (`src/hitung.js`), data disimpan lewat server.

---

## 3. Struktur folder

| Path | Isi |
| --- | --- |
| `index.html`, `assets/` | Website publik (yang di-deploy ke GitHub Pages) |
| `assets/config.js` | `API_URL` (link API publik), nomor WA, ID booklet |
| `src/hitung.js` | **Sumber** mesin hitung pembagian hasil |
| `src/pesanan.js` | **Sumber** hitung estimasi pesanan |
| `src/katalog-default.js` | **Sumber** katalog bawaan (termasuk modal — modal tidak dikirim ke website) |
| `src/admin.js` | **Sumber** logika panel admin |
| `build.js` | Menyalin `src/` ke `server/` dan `assets/`. Jalankan `node build.js` setelah ubah `src/` |
| `server/*.gs`, `server/*.html` | Kode Apps Script (Code, Db, AdminApi, Invoice, Setup + file hasil build) |
| `test/` | Tes otomatis: hitungan, server (tiruan Apps Script), website & admin (Playwright) |
| `favicon.ico`, `assets/icon-*.png`, `assets/logo.svg` | Logo/ikon (ikon PNG juga ditanam sebagai data URI di `index.html`) |

File di `server/` yang **dibuat otomatis** (jangan diedit langsung): `HitungServer.gs`, `Pesanan.gs`, `Katalog.gs`, `Hitung.html`, `AdminJs.html`.
Di Apps Script, nama file `.gs` dan `.html` tidak boleh sama, karena itu server memakai `AdminApi.gs` dan `HitungServer.gs`.

---

## 4. Aturan bisnis yang sudah disepakati

**Outbound (bertingkat)**
1. Pendapatan outbound − akomodasi & transport (default 10%, bisa manual) − pembelian barang Malomo (default 10%, bisa manual) = **laba bersih**.
2. Laba bersih dibagi: **kas Malomo 25%**, **pembawa order 5%** (tanpa pembawa → masuk kas Malomo), **instruktur 50%**, **kas bersama 20%**.
3. Instruktur dibagi per **poin = bobot peran × hari hadir** (½ hari = 0,5). Koordinator 1,5 · Instruktur 1. Bisa nominal manual per orang.
4. **Kas bersama** dibagi **rata ke semua anggota aktif** per bulan (proyek berstatus Selesai/Lunas, menurut bulan tanggal kegiatan).
5. Persen bisa diubah per proyek ("Ubah persen khusus proyek ini") atau umum di Pengaturan.

**Layanan tambahan** (kaos, jersey, bordir, catering, dokumentasi)
- Fee Malomo **3% dari laba layanan** = (harga jual − modal) × jumlah. **1,5%** bila order dibawa sendiri oleh pengelola.
- Modal diisi per item (Katalog atau per pesanan). Modal kosong → fee Rp0 + peringatan.
- Paket acara dipecah per komponen lewat kolom `komponen` (contoh `outbound:75000|kaos:80000`).

**Lain-lain**
- Tidak ada biaya transport tambahan untuk klien.
- Kode pesanan `MLM-YYMM-NNN`, invoice `INV/MLM/YYYY/NNN` (nomor tidak pernah dipakai ulang).
- DP default 50%, jatuh tempo invoice 7 hari.

---

## 5. Cara kerja di Google Antigravity

1. Ekstrak `malomo-outbound.zip`, buka foldernya di Antigravity.
2. Terminal: `npm install` lalu `npm test` (semua tes harus lulus).
3. **Hubungkan ke GitHub** (repo website):
   ```bash
   git init && git branch -M main
   git remote add origin https://github.com/malomooutbound-jpg/malomooutbound-jpg.github.io.git
   git fetch origin && git reset --soft origin/main   # ambil riwayat yang sudah ada
   git add -A && git commit -m "Tambah kode server, sumber, dan tes"
   git push origin main
   ```
   GitHub Pages otomatis memperbarui website setiap push ke `main` (± 1 menit).
4. **Hubungkan ke Apps Script** dengan clasp (login dilakukan sendiri oleh pemilik akun):
   ```bash
   npm install -g @google/clasp
   clasp login                       # pilih malomooutbound@gmail.com
   mkdir as-online && cd as-online && clasp clone 1igza8Iqp53zI0PaKEe10M2VfSLaTu14cUe1SzSytYdcQJhCxt6XrtV6n
   ```
   Bandingkan isi `as-online/` dengan `server/` sebelum menimpa apa pun. Setelah cocok, kirim perubahan dengan `clasp push`.
   Aktifkan dulu "Google Apps Script API" di https://script.google.com/home/usersettings.
5. **Setelah mengubah kode server**, perbarui KEDUA deployment agar link tidak berubah:
   ```bash
   clasp deploy -i AKfycbwSrXq8ZAR62bzIC-ZwF7y4e3nme6Q7nU_BtJbs9nYZPlyjdM_tybOvX13M611Ar8M -d "API publik"
   clasp deploy -i AKfycbzz3zHwkGJcOWlScjD1B7mDFSzPpOA-qbGkslK9F1Qn_Z9fsB13kRHeV10KICmj1iIg -d "Admin"
   ```
   (Atau lewat editor: Terapkan → Kelola deployment → Edit → Versi baru.)
6. Alur ubah kode: edit `src/` atau file biasa → `node build.js` → `npm test` → push GitHub (website) dan/atau `clasp push` + deploy (server).

Prompt awal yang disarankan untuk agen di Antigravity:
> Baca PANDUAN-PROYEK.md dan README.md. Jalankan npm test. Jangan ubah aturan pembagian di bagian 4 tanpa persetujuan saya. File hasil build jangan diedit langsung.

---

## 6. Data & akses

- Sheet: Pengaturan, Katalog (kolom `modal` tidak tampil di website), Pesanan, Kru, Anggota, Invoice, Pembayaran.
- Admin: email di Pengaturan → `admin_email` (pisahkan koma) **dan** Google Sheets dibagikan sebagai Editor ke email itu.
- Pemilik tersimpan di Script Properties `OWNER_EMAIL`; fungsi `setup` & `cekSemua` hanya bisa dijalankan pemilik.
- Invoice PDF disimpan di folder Drive `invoice_folder_id` (dibuat otomatis saat pertama). Bagikan folder itu ke admin lain sebagai Editor.

---

## 7. Yang masih perlu dikerjakan

**Data (oleh tim)**
- [ ] Hapus pesanan uji `MLM-2610-001` ("TES SISTEM") di sheet Pesanan / panel admin.
- [ ] Isi daftar Anggota, `rekening` di Pengaturan.
- [ ] Isi modal untuk Kaos Reguler/Premium, Jersey Pro/Juara, Bordir Logo/Badge, Catering Standar/Spesial, Video, Drone.
- [ ] Tambah foto berbeda ke folder galeri (ideal 6 atau 9 foto; saat ini 4, dua di antaranya sama).
- [ ] Cek pembagian komponen paket di Katalog (Milad, Tim Olahraga) sesuai kenyataan.

**Pengembangan (opsional)**
- [ ] Ganti logo lama "M MALOMO" di panel admin (`server/Admin.html`) dan invoice (`server/Invoice.gs`) dengan logo baru (`assets/logo.svg`).
- [ ] Simpan "potret" aturan & bobot saat proyek ditandai Selesai/Lunas, agar rekap bulan lalu tidak berubah bila persen/anggota diubah kemudian.
- [ ] Anggota keluar: tambah tanggal nonaktif agar rekap bulan lama tetap benar.
- [ ] Domain sendiri (misal malomo.id) lewat Settings → Pages → Custom domain.
- [ ] Ganti deskripsi repo GitHub (ada salah ketik "psan").

---

## 8. Catatan teknis

- Respons API pertama kadang 5–7 detik (Apps Script "cold start"); website menyimpan respons terakhir di localStorage agar kunjungan berikutnya instan.
- Foto Drive ditampilkan lewat `lh3.googleusercontent.com/d/<ID>=w<lebar>`; folder & file harus "Siapa saja yang memiliki link".
- Isian pesanan yang diawali `= + - @` diberi apostrof agar tidak dibaca sebagai rumus Sheets.
- Batas spam: 3 pesanan / 10 menit per nomor WA, 15 pesanan / menit total, 60 email notifikasi / hari.
- Banner "Aplikasi ini dibuat oleh pengguna Google Apps Script" di panel admin normal untuk akun Gmail pribadi.
