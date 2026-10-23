// Menyalin kode bersama (src/) ke Apps Script dan website. Jalankan: node build.js
const fs = require('fs');
const path = require('path');
const R = (...p) => path.join(__dirname, ...p);
const baca = f => fs.readFileSync(R(f), 'utf8');
const tulis = (f, isi) => { fs.writeFileSync(R(f), isi); console.log('→ ' + f); };
const head = '/* FILE OTOMATIS dari src/ — jangan diubah manual, ubah di src/ lalu jalankan: node build.js */\n';

const hitung = baca('src/hitung.js');
const pesanan = baca('src/pesanan.js');
const katalog = baca('src/katalog-default.js');

// Apps Script (.gs)
tulis('server/HitungServer.gs', head + hitung.replace('})(this);', '})(globalThis);'));
tulis('server/Pesanan.gs', head + pesanan.replace('})(this);', '})(globalThis);'));
tulis('server/Katalog.gs', head + katalog);
// Panel admin (browser)
tulis('server/Hitung.html', '<script>\n' + head + hitung + '\n</script>\n');
// Website
tulis('assets/pesanan.js', head + pesanan);
// modal (harga pokok) TIDAK ikut ke website publik
tulis('assets/katalog-default.js', head + katalog.replace('var KATALOG_DEFAULT', 'window.MALOMO_KATALOG_DEFAULT').replace(/, modal: [^,}]+/g, ''));
tulis('server/AdminJs.html', '<script>\n' + head + baca('src/admin.js') + '\n</script>\n');
