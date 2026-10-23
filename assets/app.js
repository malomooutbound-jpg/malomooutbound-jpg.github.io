/* Website Malomo — katalog, rancang paket, kirim pesanan */
(function () {
  'use strict';
  var C = window.MALOMO_CONFIG || {};
  var KAT = normalKatalog(window.MALOMO_KATALOG_DEFAULT || []);
  var INFO = { wa1: C.WA_ADMIN, wa2: C.WA_ADMIN2, instagram: C.INSTAGRAM, lokasi: C.LOKASI,
    booklet: C.BOOKLET_ID ? { status: 'publik', lihat: 'https://drive.google.com/file/d/' + C.BOOKLET_ID + '/view' } : null };

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var LAYANAN = [
    { kat: 'kaos', label: 'Kaos sablon', ikut: 'peserta', catatan: 'Biaya tambahan: lengan panjang +Rp5.000, ukuran XXXL dan XXXXL +Rp10.000 per pcs. Tanpa minimal order.' },
    { kat: 'jersey', label: 'Jersey', ikut: '', catatan: 'Harga mulai. Bisa bertambah sesuai bahan, model kerah, ukuran, desain, dan jumlah pesanan. Bahan bebas pilih: Milano, Dryfit, Hyget, Embos, dan lainnya.' },
    { kat: 'bordir', label: 'Bordir', ikut: '', catatan: 'Bordir komputer untuk logo seragam, badge, topi, peci, dan nama santri. Kirim logo PNG/PDF resolusi tinggi agar hasil lebih tajam.' },
    { kat: 'catering', label: 'Catering', ikut: 'porsi', catatan: 'Konsumsi untuk outbound, rapat, pengajian, dan acara sekolah.' },
    { kat: 'dokumentasi', label: 'Dokumentasi', ikut: '', catatan: 'Harga per kegiatan.' }
  ];

  /* ---------------- util ---------------- */
  function rupiah(n) { n = Math.round(Number(n) || 0); return 'Rp' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rbSingkat(n) { return n >= 1000000 ? 'Rp' + (n / 1000000).toString().replace('.', ',') + ' jt' : 'Rp' + Math.round(n / 1000) + 'rb'; }
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function waLink(no, teks) { return 'https://wa.me/' + String(no || '').replace(/\D/g, '') + (teks ? '?text=' + encodeURIComponent(teks) : ''); }
  function waTampil(no) { var d = String(no || '').replace(/\D/g, '').replace(/^62/, '0'); return d.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3'); }
  function poin(teks) { return String(teks || '').split('|').map(function (s) { return s.trim(); }).filter(String); }
  function simpanLokal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  function bacaLokal(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function normalKatalog(list) {
    return list.filter(function (k) { return !(k.aktif === false || String(k.aktif).toUpperCase() === 'FALSE'); }).map(function (k) {
      var o = {}; for (var x in k) o[x] = k[x];
      o.harga = Number(o.harga) || 0; o.min = Number(o.min) || 1; o.kategori = String(o.kategori || '').toLowerCase();
      o.tambahan = o.tambahan || String(o.grup || '').indexOf('Tambahan') === 0;
      return o;
    });
  }
  function byKat(kat) { return KAT.filter(function (k) { return k.kategori === kat && !k.tambahan; }); }
  function byId(id) { for (var i = 0; i < KAT.length; i++) if (KAT[i].id === id) return KAT[i]; return null; }

  /* ---------------- kartu ---------------- */
  function kartu(k, aksi) {
    var unggul = k.badge ? ' unggul' : '';
    var min = k.min > 1 ? '<p class="min">Minimal ' + k.min + ' ' + esc(k.satuan) + '</p>' : '';
    return '<article class="card' + unggul + '">' + (k.badge ? '<span class="badge">' + esc(k.badge) + '</span>' : '') +
      '<div><p class="grup">' + esc(k.grup) + '</p><h3>' + esc(k.nama) + '</h3></div>' +
      '<div class="harga"><b>' + rupiah(k.harga) + '</b><span>/ ' + esc(k.satuan) + '</span></div>' +
      '<ul>' + poin(k.keterangan).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' + min +
      '<button type="button" class="btn ' + (unggul ? '' : 'btn-ghost') + '" data-' + aksi + '="' + esc(k.id) + '">' +
      (aksi === 'pilih' ? 'Pilih paket ini' : 'Tambahkan ke paket') + '</button></article>';
  }

  var tabOb = 'Sekolah & pesantren';
  function renderOutbound() {
    $$('[data-tab-ob]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab-ob') === tabOb)); });
    $('#kartu-outbound').innerHTML = byKat('outbound').filter(function (k) { return k.grup === tabOb; }).map(function (k) { return kartu(k, 'pilih'); }).join('');
  }
  function renderPaket() { $('#kartu-paket').innerHTML = byKat('paket').map(function (k) { return kartu(k, 'pilih'); }).join(''); }

  var tabLy = 'kaos';
  function renderLayanan() {
    var ada = LAYANAN.filter(function (l) { return byKat(l.kat).length; });
    if (!ada.some(function (l) { return l.kat === tabLy; }) && ada[0]) tabLy = ada[0].kat;
    $('#tab-layanan').innerHTML = ada.map(function (l) {
      return '<button role="tab" class="tab" aria-selected="' + (l.kat === tabLy) + '" data-tab-ly="' + l.kat + '">' + l.label + '</button>';
    }).join('');
    $('#kartu-layanan').innerHTML = byKat(tabLy).map(function (k) { return kartu(k, 'tambah'); }).join('');
    var l = LAYANAN.filter(function (x) { return x.kat === tabLy; })[0];
    $('#catatan-layanan').textContent = l ? l.catatan : '';
  }

  /* ---------------- builder ---------------- */
  var S = { kegiatan: '', addon: {} };
  LAYANAN.forEach(function (l) { S.addon[l.kat] = { on: false, id: '', qty: 0, manual: false, ids: {}, ekstra: {} }; });

  function peserta() { return Math.max(0, Math.floor(Number($('#peserta').value) || 0)); }
  function hari() { return Math.max(1, Math.floor(Number($('#jumlah_hari').value) || 1)); }

  function renderPilihKegiatan() {
    var html = '';
    var grup = '';
    var list = byKat('outbound').concat(byKat('paket'));
    list.forEach(function (k) {
      if (k.grup !== grup) { grup = k.grup; html += '<p class="pilih-grup">' + esc(grup) + '</p>'; }
      html += '<label class="pilih"><input type="radio" name="kegiatan" value="' + esc(k.id) + '"' + (S.kegiatan === k.id ? ' checked' : '') + '>' +
        '<span class="radio"></span><span><b>' + esc(k.nama) + '</b><small>' + esc(poin(k.keterangan).slice(0, 2).join(' · ')) + '</small></span>' +
        '<span class="p-harga">' + rbSingkat(k.harga) + '<small>/' + esc(k.satuan) + '</small></span></label>';
    });
    html += '<p class="pilih-grup">Lainnya</p><label class="pilih"><input type="radio" name="kegiatan" value=""' + (!S.kegiatan ? ' checked' : '') + '>' +
      '<span class="radio"></span><span><b>Tanpa outbound</b><small>Pesan kaos, jersey, bordir, catering, atau dokumentasi saja</small></span></label>';
    $('#pilih-kegiatan').innerHTML = html;
  }

  function opsi(kat, terpilih) {
    return byKat(kat).map(function (k) {
      return '<option value="' + esc(k.id) + '"' + (k.id === terpilih ? ' selected' : '') + '>' + esc(k.nama) + ' — ' + rupiah(k.harga) + '/' + esc(k.satuan) + '</option>';
    }).join('');
  }

  function renderAddons() {
    var html = LAYANAN.filter(function (l) { return byKat(l.kat).length; }).map(function (l) {
      var a = S.addon[l.kat];
      var list = byKat(l.kat);
      if (!a.id) a.id = (list.filter(function (k) { return k.badge; })[0] || list[0]).id;
      var mulai = Math.min.apply(null, list.map(function (k) { return k.harga; }));
      var body;
      if (l.kat === 'dokumentasi') {
        body = '<div class="cek-list full">' + list.map(function (k) {
          return '<label class="cek"><input type="checkbox" data-dok="' + esc(k.id) + '"' + (a.ids[k.id] ? ' checked' : '') + '> ' + esc(k.nama) + ' · ' + rupiah(k.harga) + '</label>';
        }).join('') + '</div>';
      } else {
        body = '<label class="field"><span>Pilihan</span><select data-addon-id="' + l.kat + '">' + opsi(l.kat, a.id) + '</select></label>' +
          '<label class="field"><span>Jumlah</span><input type="number" min="0" inputmode="numeric" data-addon-qty="' + l.kat + '" value="' + (a.qty || '') + '"></label>';
        if (l.kat === 'kaos') {
          body += KAT.filter(function (k) { return k.kategori === 'kaos' && k.tambahan; }).map(function (k) {
            return '<label class="field full"><span>' + esc(k.nama) + ' (+' + rupiah(k.harga) + '/pcs) — jumlah pcs</span>' +
              '<input type="number" min="0" inputmode="numeric" data-ekstra="' + esc(k.id) + '" value="' + (a.ekstra[k.id] || '') + '" placeholder="0"></label>';
          }).join('');
        }
      }
      return '<div class="addon' + (a.on ? ' on' : '') + '" data-addon="' + l.kat + '">' +
        '<label class="addon-head"><input type="checkbox" data-addon-on="' + l.kat + '"' + (a.on ? ' checked' : '') + '>' +
        '<span><b>' + l.label + '</b><small>mulai ' + rupiah(mulai) + '</small></span></label>' +
        '<div class="addon-body">' + body + '</div></div>';
    }).join('');
    $('#addons').innerHTML = html;
  }

  function qtyOtomatis(kat) {
    if (kat === 'kaos') return peserta();
    if (kat === 'catering') return peserta() * hari();
    var k = byId(S.addon[kat].id);
    return k ? Math.max(k.min, kat === 'jersey' ? 12 : k.min) : 1;
  }

  function sinkronQty() {
    LAYANAN.forEach(function (l) {
      var a = S.addon[l.kat];
      if (a.on && !a.manual && l.kat !== 'dokumentasi') {
        a.qty = qtyOtomatis(l.kat);
        var inp = $('[data-addon-qty="' + l.kat + '"]');
        if (inp) inp.value = a.qty || '';
      }
    });
  }

  function pilihan() {
    var p = [];
    var k = byId(S.kegiatan);
    if (k) p.push({ id: k.id, qty: k.kategori === 'outbound' ? peserta() * hari() : peserta() });
    LAYANAN.forEach(function (l) {
      var a = S.addon[l.kat];
      if (!a.on) return;
      if (l.kat === 'dokumentasi') { Object.keys(a.ids).forEach(function (id) { if (a.ids[id]) p.push({ id: id, qty: 1 }); }); return; }
      if (a.id && a.qty > 0) p.push({ id: a.id, qty: a.qty });
      Object.keys(a.ekstra).forEach(function (id) { if (a.ekstra[id] > 0) p.push({ id: id, qty: a.ekstra[id] }); });
    });
    return p;
  }

  var hasil = { baris: [], total: 0, galat: [] };
  function hitung() {
    hasil = window.MalomoPesanan.hitungPesanan({ peserta: peserta(), jumlah_hari: hari(), pilihan: pilihan() }, KAT);
    var ul = $('#ringkasan-baris');
    ul.innerHTML = hasil.baris.length ? hasil.baris.map(function (b) {
      var ket = b.qty + ' ' + b.satuan + ' × ' + rupiah(b.harga);
      if (b.kategori === 'outbound' && hari() > 1) ket = peserta() + ' ' + b.satuan + ' × ' + hari() + ' hari × ' + rupiah(b.harga);
      return '<li><span>' + esc(b.nama) + '<small>' + esc(ket) + '</small></span><b>' + rupiah(b.subtotal) + '</b></li>';
    }).join('') : '<li class="kosong">Belum ada pilihan. Pilih kegiatan atau tambahan di sebelah kiri.</li>';
    $('#ringkasan-total').textContent = rupiah(hasil.total);
    $('#bar-total').textContent = rupiah(hasil.total);
    $('#ringkasan-per').textContent = hasil.total && peserta() ? '≈ ' + rupiah(Math.round(hasil.total / peserta())) + ' per peserta' : '';
    var galat = hasil.galat.filter(function (g) { return g.indexOf('Pilih minimal') !== 0; });
    $('#ringkasan-galat').innerHTML = galat.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('');
  }

  function semua() { sinkronQty(); hitung(); }

  function pasangBuilder() {
    var form = $('#form-pesan');
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'kegiatan') S.kegiatan = t.value;
      if (t.hasAttribute('data-addon-on')) {
        var kat = t.getAttribute('data-addon-on');
        S.addon[kat].on = t.checked;
        t.closest('.addon').classList.toggle('on', t.checked);
        if (t.checked && kat === 'dokumentasi' && !Object.keys(S.addon.dokumentasi.ids).some(function (i) { return S.addon.dokumentasi.ids[i]; })) {
          var first = byKat('dokumentasi')[0]; if (first) { S.addon.dokumentasi.ids[first.id] = true; var cb = $('[data-dok="' + first.id + '"]'); if (cb) cb.checked = true; }
        }
      }
      if (t.hasAttribute('data-addon-id')) { var k2 = t.getAttribute('data-addon-id'); S.addon[k2].id = t.value; if (!S.addon[k2].manual) S.addon[k2].qty = 0; }
      if (t.hasAttribute('data-dok')) S.addon.dokumentasi.ids[t.getAttribute('data-dok')] = t.checked;
      semua();
    });
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-addon-qty')) { var k = t.getAttribute('data-addon-qty'); S.addon[k].qty = Math.max(0, Math.floor(Number(t.value) || 0)); S.addon[k].manual = t.value !== ''; }
      if (t.hasAttribute('data-ekstra')) S.addon.kaos.ekstra[t.getAttribute('data-ekstra')] = Math.max(0, Math.floor(Number(t.value) || 0));
      if (t.id === 'peserta' || t.id === 'jumlah_hari' || t.hasAttribute('data-addon-qty') || t.hasAttribute('data-ekstra')) semua();
      if (t.closest('.field')) t.closest('.field').classList.remove('salah');
    });
    form.addEventListener('submit', kirim);
    var hariIni = new Date(); hariIni.setMinutes(hariIni.getMinutes() - hariIni.getTimezoneOffset());
    $('#tgl_mulai').min = hariIni.toISOString().slice(0, 10);
    var draf = bacaLokal('malomo_pemesan');
    if (draf) ['nama', 'instansi', 'wa', 'email'].forEach(function (k) { if (draf[k]) $('#' + k).value = draf[k]; });
  }

  /* klik "Pilih paket" / "Tambahkan" di kartu */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-pilih],[data-tambah],[data-tab-ob],[data-tab-ly],[data-tutup]');
    if (!t) return;
    if (t.hasAttribute('data-tab-ob')) { tabOb = t.getAttribute('data-tab-ob'); renderOutbound(); return; }
    if (t.hasAttribute('data-tab-ly')) { tabLy = t.getAttribute('data-tab-ly'); renderLayanan(); return; }
    if (t.hasAttribute('data-tutup')) { $('#modal-sukses').close(); return; }
    if (t.hasAttribute('data-pilih')) {
      var k = byId(t.getAttribute('data-pilih'));
      S.kegiatan = k.id;
      if (peserta() < k.min) $('#peserta').value = k.min;
      renderPilihKegiatan();
    } else {
      var k2 = byId(t.getAttribute('data-tambah'));
      var a = S.addon[k2.kategori];
      a.on = true;
      if (k2.kategori === 'dokumentasi') a.ids[k2.id] = true; else { a.id = k2.id; a.manual = false; }
      renderAddons();
    }
    semua();
    document.getElementById('rancang').scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------------- kirim ---------------- */
  function teksWa(kode) {
    var d = dataForm();
    var l = ['Assalamu\'alaikum Admin Malomo, saya ingin memesan:', ''];
    if (kode) l.push('Kode pesanan: ' + kode);
    l.push('Nama: ' + d.nama);
    if (d.instansi) l.push('Instansi: ' + d.instansi);
    if (d.tgl_mulai) l.push('Tanggal: ' + d.tgl_mulai + (d.jumlah_hari > 1 ? ' (' + d.jumlah_hari + ' hari)' : ''));
    else if (d.jumlah_hari > 1) l.push('Durasi: ' + d.jumlah_hari + ' hari');
    if (d.lokasi) l.push('Lokasi: ' + d.lokasi);
    if (d.peserta) l.push('Peserta: ' + d.peserta + ' orang');
    l.push('', 'Rincian:');
    hasil.baris.forEach(function (b) { l.push('• ' + b.nama + ' — ' + b.qty + ' ' + b.satuan + ' × ' + rupiah(b.harga) + ' = ' + rupiah(b.subtotal)); });
    l.push('', 'Estimasi total: ' + rupiah(hasil.total));
    if (d.catatan) l.push('Catatan: ' + d.catatan);
    l.push('', 'Mohon penawaran resmi dan rundown-nya. Terima kasih.');
    return l.join('\n');
  }

  function dataForm() {
    return { nama: $('#nama').value.trim(), instansi: $('#instansi').value.trim(), wa: $('#wa').value.trim(), email: $('#email').value.trim(),
      tgl_mulai: $('#tgl_mulai').value, jumlah_hari: hari(), lokasi: $('#lokasi').value.trim(), peserta: peserta(),
      catatan: $('#catatan').value.trim(), situs: $('#situs').value, pilihan: pilihan() };
  }

  function tandai(id, pesan, list) { var f = $('#' + id).closest('.field'); f.classList.add('salah'); list.push(pesan); }

  function kirim(e) {
    e.preventDefault();
    hitung();
    var d = dataForm();
    var galat = hasil.galat.slice();
    if (!d.nama) tandai('nama', 'Nama wajib diisi.', galat);
    if (d.wa.replace(/\D/g, '').length < 9) tandai('wa', 'Nomor WhatsApp belum benar.', galat);
    if (galat.length) {
      $('#ringkasan-galat').innerHTML = galat.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('');
      var salah = $('.field.salah input'); if (salah) salah.focus();
      else $('#ringkasan').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    simpanLokal('malomo_pemesan', { nama: d.nama, instansi: d.instansi, wa: d.wa, email: d.email });
    var btn = $('#btn-kirim');
    if (!C.API_URL) { sukses('', false); return; }
    btn.disabled = true; btn.textContent = 'Mengirim…';
    fetch(C.API_URL, { method: 'POST', body: JSON.stringify({ aksi: 'pesan', data: d }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.pesan || 'Gagal mengirim.');
        sukses(r.kode, true);
      })
      .catch(function (err) {
        $('#ringkasan-galat').innerHTML = '<li>' + esc(err.message || 'Koneksi bermasalah.') + ' Anda tetap bisa mengirim lewat WhatsApp.</li>';
        sukses('', false, true);
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Kirim pesanan'; });
  }

  function sukses(kode, tersimpan, gagal) {
    var m = $('#modal-sukses');
    $('#sukses-judul').textContent = tersimpan ? 'Pesanan tercatat' : (gagal ? 'Kirim lewat WhatsApp' : 'Satu langkah lagi');
    $('#sukses-teks').innerHTML = tersimpan
      ? 'Kode pesanan Anda <b>' + esc(kode) + '</b>. Kirim ringkasannya ke WhatsApp admin agar penawaran resmi dan rundown segera kami siapkan.'
      : 'Kirim ringkasan pesanan ke WhatsApp admin. Admin akan membalas dengan penawaran resmi dan rundown.';
    $('#sukses-wa').href = waLink(INFO.wa1, teksWa(kode));
    $('#sukses-wa').textContent = tersimpan ? 'Kirim ringkasan ke WhatsApp admin' : 'Buka WhatsApp admin';
    if (m.showModal) m.showModal(); else window.open($('#sukses-wa').href, '_blank');
  }

  /* ---------------- info, galeri, hero ---------------- */
  function pasangInfo() {
    $$('[data-wa]').forEach(function (a) {
      var no = a.getAttribute('data-wa') === '2' ? INFO.wa2 : INFO.wa1;
      a.href = waLink(no, 'Assalamu\'alaikum Admin Malomo, saya ingin bertanya tentang paket outbound.');
      if (a.hasAttribute('data-wa-text')) a.textContent = 'Admin ' + a.getAttribute('data-wa') + ' · ' + waTampil(no);
    });
    $$('[data-ig]').forEach(function (a) { a.href = 'https://instagram.com/' + INFO.instagram; a.textContent = 'Instagram @' + INFO.instagram; });
    $$('[data-lokasi]').forEach(function (s) { s.textContent = INFO.lokasi || ''; });
    var b = INFO.booklet;
    $$('[data-booklet]').forEach(function (a) {
      if (b && b.status === 'publik') { a.href = b.lihat; }
      else { a.href = waLink(INFO.wa1, 'Assalamu\'alaikum Admin Malomo, boleh minta booklet katalog paket 2026?'); a.textContent = a.textContent.replace('Unduh', 'Minta').replace('Lihat', 'Minta'); }
    });
    $('#tahun').textContent = new Date().getFullYear();
  }

  function pasangGaleri(list, hero) {
    if (hero) {
      var img = new Image();
      img.onload = function () { var h = $('#hero-photo'); h.style.backgroundImage = 'url("' + hero + '")'; h.classList.add('ada-foto'); };
      img.src = hero;
    }
    if (!list || !list.length) return;
    $('#galeri-grid').innerHTML = list.map(function (g) {
      return '<a href="' + esc(g.besar) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(g.kecil) + '" alt="' + esc(g.nama || 'Dokumentasi kegiatan Malomo') + '"></a>';
    }).join('');
    $('#galeri-grid').setAttribute('data-n', String(list.length));
    $('#galeri').hidden = false;
  }

  /* foto Drive langsung dari server gambar Google (lebih cepat, tanpa redirect) */
  function fotoCepat(u) {
    var m = /drive\.google\.com\/thumbnail\?id=([^&]+)&sz=w(\d+)/.exec(u || '');
    return m ? 'https://lh3.googleusercontent.com/d/' + m[1] + '=w' + m[2] : u;
  }

  function terapkanApi(r) {
    if (!r || !r.ok) return;
    (r.galeri || []).forEach(function (g) { g.kecil = fotoCepat(g.kecil); g.besar = fotoCepat(g.besar); });
    r.hero = fotoCepat(r.hero);
    if (r.katalog && r.katalog.length) { KAT = normalKatalog(r.katalog); renderSemua(); }
    if (r.info) {
      INFO.wa1 = r.info.wa1 || INFO.wa1; INFO.wa2 = r.info.wa2 || INFO.wa2;
      INFO.instagram = r.info.instagram || INFO.instagram; INFO.lokasi = r.info.lokasi || INFO.lokasi;
      if (r.info.booklet && r.info.booklet.status) INFO.booklet = r.info.booklet;
      pasangInfo();
    }
    pasangGaleri(r.galeri, r.hero);
  }

  function muatApi() {
    if (!C.API_URL) return;
    var simpanan = bacaLokal('malomo_api_v1');
    if (simpanan && simpanan.data) terapkanApi(simpanan.data); // tampil instan dari kunjungan sebelumnya
    fetch(C.API_URL + (C.API_URL.indexOf('?') > 0 ? '&' : '?') + 'api=katalog')
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok) return;
        simpanLokal('malomo_api_v1', { t: Date.now(), data: r });
        terapkanApi(JSON.parse(JSON.stringify(r)));
      })
      .catch(function () { /* tetap pakai katalog bawaan */ });
  }


  /* ---------------- navigasi ---------------- */
  function pasangNav() {
    var nav = $('#nav'), btn = $('.menu-btn'), menu = $('#menu-hp');
    window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });
    btn.addEventListener('click', function () {
      var buka = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(buka)); menu.hidden = !buka;
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) { btn.setAttribute('aria-expanded', 'false'); menu.hidden = true; } });
    if ('IntersectionObserver' in window) {
      var diRancang = false, ringkasanTampak = false, bar = $('#bar-hp');
      var upd = function () { var t = diRancang && !ringkasanTampak; bar.classList.toggle('tampil', t); document.body.classList.toggle('bar-aktif', t); };
      new IntersectionObserver(function (en) { diRancang = en[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe($('#form-pesan'));
      new IntersectionObserver(function (en) { ringkasanTampak = en[0].isIntersecting; upd(); }, { threshold: 0.25 }).observe($('#ringkasan'));
    }
  }

  function renderSemua() {
    renderOutbound(); renderPaket(); renderLayanan(); renderPilihKegiatan(); renderAddons(); semua();
  }

  S.kegiatan = (byKat('outbound')[0] || {}).id || '';
  pasangNav();
  pasangBuilder();
  pasangInfo();
  renderSemua();
  muatApi();
})();
