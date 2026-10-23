# Malomo Outbound — Website & Sistem Admin

Website pemesanan (GitHub Pages) + server & database (Google Apps Script + Google Sheets) + panel admin.

| Bagian | Isi |
| --- | --- |
| `index.html`, `assets/` | Website publik: katalog, rancang paket, form pesan, galeri, booklet |
| `server/` | Kode Apps Script: API publik, panel admin, invoice, pembagian hasil |
| `src/` | Sumber kode bersama (hitungan, katalog). Ubah di sini lalu `node build.js` |
| `test/` | Tes otomatis (`npm test`) |

## Aturan pembagian (default, bisa diubah di menu Pengaturan)

- **Outbound**: pendapatan − akomodasi (10% / manual) − barang Malomo (10% / manual) = laba bersih.
  Laba dibagi: kas Malomo 25% · pembawa order 5% (tanpa pembawa → kas Malomo) · instruktur 50% · kas bersama 20%.
- **Instruktur**: dibagi per poin = bobot peran × hari hadir (½ hari = 0,5). Koordinator 1,5, instruktur 1.
- **Kas bersama**: dibagi rata ke semua anggota aktif tiap bulan (proyek berstatus Selesai/Lunas).
- **Layanan tambahan** (kaos, jersey, bordir, catering, dokumentasi): fee Malomo 3% dari **laba** = (harga jual − modal) × jumlah, 1,5% bila order dibawa sendiri oleh pengelola. Modal diisi di panel admin (tidak tampil di website).

## Pemasangan

### A. Server & database (akun Google malomooutbound@gmail.com)

1. Buat Google Sheets baru bernama **Malomo Database**.
2. Menu **Ekstensi → Apps Script**. Buat file sesuai isi folder `server/` (nama sama, `.gs` = Skrip, `.html` = HTML). Untuk `appsscript.json`: Setelan proyek → centang *Tampilkan file manifes*.
3. Pilih fungsi **setup** → ▶ Jalankan → izinkan akses. Semua sheet & katalog terisi otomatis.
4. Bagikan folder galeri dan file booklet di Google Drive ke malomooutbound@gmail.com (atau pindahkan ke akun itu).
5. **Terapkan → Deployment baru → Aplikasi web**, dua kali:
   - **API publik** — Jalankan sebagai: *Saya* · Akses: *Siapa saja*. Salin link `/exec`.
   - **Admin** — Jalankan sebagai: *Pengguna yang mengakses aplikasi web* · Akses: *Siapa saja yang memiliki Akun Google*.
     Panel admin = link deployment Admin + `?page=admin`.
6. Admin lain: tambahkan emailnya di Pengaturan → `admin_email`, lalu bagikan Google Sheets sebagai **Editor** ke email itu.

Setelah mengubah kode: Terapkan → Kelola deployment → Edit → Versi baru (untuk kedua deployment).

### B. Website (GitHub malomooutbound)

1. Buat repo **`<username>.github.io`** (contoh `malomooutbound.github.io`), publik.
2. Unggah semua isi folder ini (tanpa `node_modules`).
3. Buka `assets/config.js`, isi `API_URL` dengan link API publik `/exec`.
4. Settings → Pages → Branch `main` / root → Save. Website tampil di `https://<username>.github.io`.
5. Isi Pengaturan → `website_url` dengan alamat itu.

Selama `API_URL` kosong, website tetap jalan dengan katalog bawaan dan pesanan dikirim lewat WhatsApp.

## Pengembangan

```bash
npm install
npm test        # build + tes hitungan, server (tiruan Apps Script), website, panel admin
```
