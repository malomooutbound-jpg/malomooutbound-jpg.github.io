// Tiruan sederhana lingkungan Google Apps Script untuk menguji kode server di Node.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function buatSheet(nama) {
  const grid = []; // array baris
  let maxCols = 26, maxRows = 1000;
  const lastRow = () => { for (let i = grid.length - 1; i >= 0; i--) if (grid[i] && grid[i].some(v => v !== '' && v !== undefined)) return i + 1; return 0; };
  const lastCol = () => grid.reduce((m, r) => Math.max(m, (r || []).reduce((mm, v, j) => (v !== '' && v !== undefined ? j + 1 : mm), 0)), 0);
  const range = (r, c, nr = 1, nc = 1) => {
    const api = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (grid[r - 1 + i] || [])[c - 1 + j]; return v === undefined ? '' : v; })),
      setValues: (vals) => { vals.forEach((row, i) => { grid[r - 1 + i] = grid[r - 1 + i] || []; row.forEach((v, j) => { grid[r - 1 + i][c - 1 + j] = v; }); }); return api; },
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (grid[r - 1 + i]) grid[r - 1 + i][c - 1 + j] = ''; return api; },
      setFontWeight: () => api, setBackground: () => api, setNumberFormat: () => api
    };
    return api;
  };
  return {
    _grid: grid, getName: () => nama,
    getDataRange: () => range(1, 1, Math.max(lastRow(), 1), Math.max(lastCol(), 1)),
    getRange: range, getLastRow: lastRow, getLastColumn: lastCol,
    getMaxColumns: () => maxCols, getMaxRows: () => maxRows,
    insertColumnsAfter: (a, n) => { maxCols += n; },
    appendRow: (row) => { grid[lastRow()] = row.slice(); },
    deleteRow: (i) => { grid.splice(i - 1, 1); },
    setFrozenRows: () => {}
  };
}

function buatLingkungan(opsi = {}) {
  const sheets = { Sheet1: buatSheet('Sheet1') };
  const ss = {
    getId: () => 'SHEET123', getName: () => 'Malomo Database',
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => (sheets[n] = buatSheet(n)),
    getSheets: () => Object.values(sheets),
    deleteSheet: sh => { delete sheets[sh.getName()]; },
    setActiveSheet: () => {}, setSpreadsheetTimeZone: () => {}
  };
  const props = {};
  const cache = {};
  const user = { aktif: opsi.aktif ?? 'malomooutbound@gmail.com', efektif: opsi.efektif ?? 'malomooutbound@gmail.com' };
  const surat = [];
  const pad = n => String(n).padStart(2, '0');
  const ctx = {
    console, JSON, Math, Date, Number, String, Object, Array, Error, RegExp, isFinite, parseFloat, encodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    Session: { getActiveUser: () => ({ getEmail: () => user.aktif }), getEffectiveUser: () => ({ getEmail: () => user.efektif }), getScriptTimeZone: () => 'Asia/Makassar' },
    Utilities: {
      formatDate: (d, tz, f) => f.replace('yyyy', d.getFullYear()).replace('yy', String(d.getFullYear()).slice(2)).replace('MM', pad(d.getMonth() + 1)).replace('dd', pad(d.getDate())).replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())),
      getUuid: () => Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
      newBlob: (isi) => ({ getAs: () => ({ setName: () => ({}) }), isi })
    },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; }, removeAll: ks => ks.forEach(k => delete cache[k]) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    DriveApp: { getFolderById: () => { throw new Error('tidak ada drive di tes'); }, getFileById: () => { throw new Error('tidak ada'); }, Access: {}, Permission: {} },
    MailApp: { sendEmail: (...a) => surat.push(a) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => ({ isi: s }) }) },
    HtmlService: { XFrameOptionsMode: {}, createHtmlOutput: h => ({ setTitle: () => ({ html: h }) }), createTemplateFromFile: () => ({ evaluate: () => ({ setTitle: () => ({ addMetaTag: () => ({ setXFrameOptionsMode: () => ({}) }) }) }) }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TES/exec' }) }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..', 'server');
  // urutan seperti Apps Script: semua file .gs dimuat ke ruang global yang sama
  const kode = fs.readdirSync(dir).filter(f => f.endsWith('.gs')).map(f => `// ${f}\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n');
  vm.runInContext(kode, ctx, { filename: 'apps-script.gs' });
  return { ctx, sheets, user, surat, cache };
}

module.exports = { buatLingkungan };
