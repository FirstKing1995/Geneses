/* Gênesis · arte em pixel gerada por código. Nenhum arquivo de imagem: tudo nasce aqui. */
(function (G) {
  'use strict';
  const A = G.Art = {};

  // paleta base (ENDESGA 32 + alguns tons de apoio)
  const P = {
    ink: '#181425', ink2: '#262b44', ink3: '#3a4466', slate: '#5a6988', mist: '#8b9bb4', silver: '#c0cbdc', white: '#ffffff',
    red: '#e43b44', wine: '#a22633', rose: '#f6757a', maroon: '#3e2731', bark: '#733e39', wood: '#b86f50', tan: '#e4a672',
    parch: '#ead4aa', skinD: '#c28569', skinL: '#e8b796', rust: '#be4a2f', orange: '#d77643', ember: '#f77622', gold: '#feae34',
    yellow: '#fee761', leaf: '#63c74d', green: '#3e8948', pine: '#265c42', deep: '#193c3e', blue: '#124e89', sky: '#0099db',
    ice: '#2ce8f5', plum: '#68386c', pink: '#b55088', gourd: '#c9a068',
  };
  A.P = P;

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  A.mk = mk;

  // grade de pixels -> canvas
  function Buf(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
  Buf.prototype.set = function (x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; };
  Buf.prototype.get = function (x, y) { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.p[y * this.w + x] : null; };
  Buf.prototype.canvas = function () {
    const [c, x] = mk(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let i = 0; i < this.w; i++) {
      const col = this.p[y * this.w + i];
      if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    }
    return c;
  };
  function fromRows(rows, map) {
    const b = new Buf(rows[0].length, rows.length);
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = map[r[x]]; if (col) b.set(x, y, col); } });
    return b;
  }
  function line(b, x0, y0, x1, y1, c, mark) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      b.set(x0, y0, c); if (mark) mark.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  A.lighten = lighten;

  // ---------- terreno: cores por estação ----------
  // tipos: 0 funda, 1 rasa, 2 rio, 3 areia, 4 campo, 5 floresta, 6 colina, 7 montanha, 8 campo seco
  // cada tom: [escuro, base, claro]
  A.TERRAIN = [
    { // primavera
      0: ['#0c3a68', '#124e89', '#1d64a6'], 1: ['#0a7fc0', '#0e93d4', '#35c4ec'], 2: ['#0a7fc0', '#0e93d4', '#35c4ec'],
      3: ['#c89a6a', '#e4b27c', '#efd2a2'], 4: ['#3e8948', '#58a447', '#79c356'], 5: ['#265c42', '#34713f', '#468a44'],
      6: ['#4f8a44', '#6a9e4c', '#8ab65e'], 7: ['#56607e', '#67748f', '#8290a8'], 8: ['#7c8a3c', '#99a44c', '#b7bb62'],
    },
    { // verão
      0: ['#0c3a68', '#124e89', '#1d64a6'], 1: ['#0a7fc0', '#0e93d4', '#35c4ec'], 2: ['#0a7fc0', '#0e93d4', '#35c4ec'],
      3: ['#cc9f6c', '#e8b880', '#f2d8a8'], 4: ['#4d8a36', '#70a842', '#95c254'], 5: ['#2c5e36', '#3e773a', '#528e42'],
      6: ['#6a8a40', '#88a24a', '#a6b85a'], 7: ['#56607e', '#67748f', '#8290a8'], 8: ['#a08a44', '#bea45a', '#d6bc74'],
    },
    { // outono
      0: ['#0c3a68', '#124e89', '#1d64a6'], 1: ['#0a7fc0', '#0e93d4', '#35c4ec'], 2: ['#0a7fc0', '#0e93d4', '#35c4ec'],
      3: ['#c28f62', '#dcaa76', '#e8c898'], 4: ['#7c7232', '#9c8a40', '#bca656'], 5: ['#5e4a2a', '#7a5c30', '#94723c'],
      6: ['#7e6c3a', '#98844a', '#b09c5e'], 7: ['#56607e', '#67748f', '#8290a8'], 8: ['#98703e', '#b48a50', '#cca666'],
    },
    { // inverno
      0: ['#1a3a5c', '#24507a', '#35668f'], 1: ['#3e7eaa', '#5896c0', '#9ccbe4'], 2: ['#3e7eaa', '#5896c0', '#9ccbe4'],
      3: ['#bdb4ae', '#d4ccc8', '#e8e4e0'], 4: ['#bcc7d8', '#d6dee9', '#eef3f9'], 5: ['#aab6ca', '#c6d0de', '#e0e7f0'],
      6: ['#b4bfd0', '#ccd5e2', '#e6ecf4'], 7: ['#7d8aa6', '#a3b0c6', '#dfe6f0'], 8: ['#c2cad8', '#dae0ea', '#f0f4f8'],
    },
  ];
  // detalhes (tufos e flores) por estação
  A.DETAIL = [
    { tuft: '#2f6e3e', flowers: ['#fee761', '#ffffff', '#f6757a', '#b9a2ff'] },
    { tuft: '#3e6e2e', flowers: ['#fee761', '#ffffff'] },
    { tuft: '#6a5a2a', flowers: ['#d77643'] },
    { tuft: '#8b9bb4', flowers: [] },
  ];

  // ---------- árvores ----------
  const TREE_TONES = {
    spring: ['#193c3e', '#265c42', '#3e8948', '#63c74d', '#9be070'],
    ipe: ['#68386c', '#b55088', '#e0708e', '#f6a0b4', '#ffd6e0'],
    summer: ['#193c3e', '#245a3a', '#377a3c', '#55a944', '#7fcf5a'],
    autumn: ['#3e2731', '#a22633', '#be4a2f', '#d77643', '#f0a040'],
    autumnY: ['#733e39', '#b86f50', '#d79b3e', '#feae34', '#fee761'],
  };
  function canopy(b, cx, cy, blobs, tones, seed) {
    const W = b.w, H = b.h, mask = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      for (const bl of blobs) {
        if ((x + 0.5 - bl[0]) ** 2 + (y + 0.5 - bl[1]) ** 2 <= bl[2] * bl[2]) { mask[y * W + x] = 1; break; }
      }
    }
    const m = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
    const lx = cx - 4, ly = cy - 5;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!m(x, y)) continue;
      const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ly) / 12;
      let t = d < 0.42 ? 4 : d < 0.72 ? 3 : d < 1.0 ? 2 : 1;
      if (G.hash2(x, y, seed) < 0.2) t = Math.max(1, t - 1);
      if (!m(x, y + 1) || !m(x + 1, y)) t = 0;
      else if (!m(x, y - 1) || !m(x - 1, y)) t = Math.max(1, Math.min(t, 3));
      b.set(x, y, tones[t]);
    }
    // tufos de folhas: pequenas meias-luas
    const rng = new G.RNG(seed * 7 + 1);
    for (let k = 0; k < 9; k++) {
      const x = Math.floor(rng.range(cx - 7, cx + 7)), y = Math.floor(rng.range(cy - 6, cy + 5));
      if (!m(x, y) || !m(x, y + 1) || !m(x - 1, y + 1) || !m(x + 1, y + 1) || !m(x, y + 2)) continue;
      b.set(x - 1, y + 1, tones[1]); b.set(x, y + 1, tones[1]); b.set(x + 1, y + 1, tones[1]);
      b.set(x, y, tones[Math.min(4, 3 + (y < cy ? 1 : 0))]);
    }
    return mask;
  }
  function broadTree(v, season) {
    const b = new Buf(22, 26);
    const tx = 10;
    for (let y = 13; y < 24; y++) { b.set(tx, y, P.wood); b.set(tx + 1, y, P.bark); }
    b.set(tx - 1, 23, P.bark); b.set(tx + 2, 23, P.maroon); b.set(tx + 2, 22, P.bark);
    if (season === 3) {
      const pts = [];
      const br = [[10, 16, 6, 9], [6, 9, 4, 6], [11, 15, 16, 9], [16, 9, 18, 6], [10, 13, 9, 5], [11, 12, 13, 4], [13, 4, 14, 2], [9, 5, 8, 3], [6, 9, 7, 5], [16, 9, 15, 5]];
      for (const s of br) line(b, s[0], s[1], s[2], s[3], P.bark, pts);
      for (const [x, y] of pts) {
        if (!b.get(x, y - 1) && G.hash2(x, y, v + 50) < 0.75) b.set(x, y - 1, P.white);
        if (G.hash2(x, y, v + 60) < 0.25) b.set(x + 1, y, P.maroon);
      }
      return b.canvas();
    }
    const cx = 11 + (v === 1 ? -1 : v === 2 ? 1 : 0), cy = 9;
    const blobs = [[cx, cy, 7.6], [cx - 5, cy + 2, 4.6], [cx + 5, cy + 2, 4.6], [cx - 2 + v, cy - 4, 4.4], [cx + 3 - v, cy - 3, 4]];
    let tones = TREE_TONES.summer;
    if (season === 0) tones = v === 1 ? TREE_TONES.ipe : TREE_TONES.spring;
    else if (season === 2) tones = v === 2 ? TREE_TONES.autumnY : TREE_TONES.autumn;
    const mask = canopy(b, cx, cy, blobs, tones, 11 + v * 29 + season * 5);
    const rng = new G.RNG(300 + v * 13 + season);
    const inside = (x, y) => mask[y * b.w + x] && mask[(y + 1) * b.w + x] && mask[y * b.w + x + 1];
    if (season === 0 && v !== 1) {
      for (let k = 0; k < 14; k++) {
        const x = rng.int(3, 18), y = rng.int(2, 14);
        if (inside(x, y)) b.set(x, y, rng.chance(0.5) ? '#ffffff' : '#f6a0b4');
      }
    }
    if (season === 1 && v === 0) {
      for (let k = 0; k < 8; k++) {
        const x = rng.int(4, 17), y = rng.int(5, 14);
        if (inside(x, y)) { b.set(x, y, P.ember); b.set(x, y - 1, P.gold); }
      }
    }
    return b.canvas();
  }
  function arauTree(v, season) {
    const W = 22, H = 32, b = new Buf(W, H);
    const cx = 11;
    for (let y = 9; y < 31; y++) { b.set(cx - 1, y, P.wood); b.set(cx, y, P.bark); }
    b.set(cx - 2, 30, P.bark); b.set(cx + 1, 30, P.maroon);
    // tocos de galhos
    b.set(cx - 2, 18 + v, P.bark); b.set(cx + 1, 22 - v, P.bark);
    const tones = ['#12302c', '#1f4d3a', '#2f6b40', '#4a9148', '#6fb45a'];
    const widths = [5, 7.5, 9.5, 10.4, 10.4, 9.8, 8.6, 7];
    const mask = new Uint8Array(W * H);
    for (let r = 0; r < widths.length; r++) {
      const y = 2 + r, hw = widths[r] - (v === 2 ? 0.6 : 0);
      for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - cx) <= hw) mask[y * W + x] = 1;
    }
    // pontas voltadas para cima
    const tips = [2 + v % 2, 5, 8, 14, 17, 19 - v % 2];
    for (const tx of tips) { mask[1 * W + tx] = 1; mask[0 * W + tx] = tx % 2; }
    // segunda camada
    for (let r = 0; r < 3; r++) {
      const y = 11 + r, hw = [5.5, 4.6, 3.2][r];
      for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - cx) <= hw) mask[y * W + x] = 1;
    }
    const m = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!m(x, y)) continue;
      let t = y <= 3 ? 4 : y <= 5 ? 3 : y <= 8 ? 2 : y <= 11 ? 2 : 1;
      if ((x + v) % 3 === 0 && y > 3) t = Math.max(1, t - 1);
      if (!m(x, y + 1)) t = 0;
      if (G.hash2(x, y, 77 + v) < 0.15) t = Math.max(1, t - 1);
      b.set(x, y, tones[t]);
    }
    if (season === 3) {
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        if (m(x, y) && !m(x, y - 1)) { b.set(x, y, P.white); if (m(x, y + 1) && G.hash2(x, y, 5) < 0.5) b.set(x, y + 1, P.silver); }
      }
    }
    return b.canvas();
  }

  // ---------- arbusto (pitangueira) ----------
  const BUSH_TONES = [
    ['#193c3e', '#265c42', '#3e8948', '#63c74d'],
    ['#193c3e', '#265c42', '#377a3c', '#55a944'],
    ['#3e2731', '#6a4a2a', '#8a7a3a', '#b8a050'],
    ['#3e2731', '#6a4a3a', '#8b6d5c', '#b89a80'],
  ];
  function bush(fruit, season) {
    const W = 14, H = 11, b = new Buf(W, H);
    const blobs = [[7, 6.6, 5.2], [3.8, 7.4, 3.4], [10.2, 7.4, 3.4], [6.2, 3.8, 3.2], [8.8, 4.2, 3]];
    const mask = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (const bl of blobs) {
      if ((x + 0.5 - bl[0]) ** 2 + (y + 0.5 - bl[1]) ** 2 <= bl[2] * bl[2]) { mask[y * W + x] = 1; break; }
    }
    const m = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
    const tones = BUSH_TONES[season];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!m(x, y)) continue;
      const d = Math.hypot(x + 0.5 - 5, y + 0.5 - 2.5) / 8;
      let t = d < 0.5 ? 3 : d < 0.85 ? 2 : 1;
      if (G.hash2(x, y, 91) < 0.18) t = Math.max(1, t - 1);
      if (!m(x, y + 1) || !m(x + 1, y)) t = 0;
      b.set(x, y, tones[t]);
    }
    if (season === 3) for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (m(x, y) && !m(x, y - 1)) b.set(x, y, P.white);
    const spots = [[4, 5], [9, 4], [7, 8], [11, 7], [3, 8], [7, 3]];
    for (let i = 0; i < Math.min(6, fruit * 2); i++) {
      const [x, y] = spots[i];
      b.set(x, y, P.red); b.set(x - 1, y, P.wine); b.set(x, y - 1, P.rose);
    }
    return b.canvas();
  }

  // ---------- pedras ----------
  function rock(size, v, snow) {
    const dims = [[9, 7], [12, 9], [16, 12]][size];
    const W = dims[0], H = dims[1], b = new Buf(W, H);
    const cx = W / 2, cy = H * 0.58, rx = W / 2 - 0.6, ry = H * 0.45;
    const mask = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      let r = nx * nx + ny * ny;
      r += (G.hash2(Math.floor(Math.atan2(ny, nx) * 3), v, 13) - 0.5) * 0.25;
      if (r <= 1 && y < H - 1) mask[y * W + x] = 1;
    }
    const m = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
    const tones = ['#262b44', '#3a4466', '#5a6988', '#8b9bb4', '#c0cbdc'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!m(x, y)) continue;
      const d = Math.hypot(x + 0.5 - cx * 0.6, y + 0.5 - cy * 0.45) / (W * 0.75);
      let t = d < 0.3 ? 4 : d < 0.62 ? 3 : d < 0.9 ? 2 : 1;
      if (!m(x, y + 1) || !m(x + 1, y)) t = 0;
      b.set(x, y, tones[t]);
    }
    // rachadura
    if (size > 0) { const x0 = Math.floor(W * 0.55) + (v % 2); for (let k = 0; k < 3; k++) if (m(x0 + (k > 1 ? 1 : 0), 3 + k)) b.set(x0 + (k > 1 ? 1 : 0), 3 + k, tones[1]); }
    if (snow) for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (m(x, y) && !m(x, y - 1)) { b.set(x, y, P.white); if (m(x, y + 1) && y < H * 0.4) b.set(x, y + 1, P.silver); }
    return b.canvas();
  }

  function stump(snow) {
    const b = fromRows([
      '..........',
      '...kkkk...',
      '..kttttk..',
      '.ktrrrrtk.',
      '.kttttttk.',
      '.kbbbbbBk.',
      'kbbbbbbBBk',
      '.kkkkkkkk.',
    ], { k: P.maroon, t: P.tan, r: P.wood, b: P.bark, B: P.maroon });
    if (snow) { b.set(3, 2, P.white); b.set(4, 2, P.white); b.set(5, 2, P.silver); b.set(6, 2, P.white); }
    return b.canvas();
  }

  function grave() {
    return fromRows([
      '...kkkk...',
      '..kssssk..',
      '..ksxxsk..',
      '..ksxxsk..',
      '..kxxxxk..',
      '..ksxxsk..',
      '..kssSsk..',
      '..kssSsk..',
      '.kdddddddk',
      'kddddddddk',
      '.kkkkkkkk.',
    ], { k: P.ink2, s: P.mist, S: P.slate, x: P.slate, d: P.bark });
  }

  // ---------- fogueira ----------
  // lv 1: pedrinhas soltas · lv 2: roda de pedras · lv 3: roda maior sobre um chão de pedra (os bancos vão no chão, no render)
  function fireBase(lit, lv) {
    lv = lv || 1;
    const b = new Buf(16, 16);
    if (lv >= 3) {
      for (let y = 7; y <= 15; y++) for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - 8) / 7.9, dy = (y + 0.5 - 11.6) / 4.3;
        if (dx * dx + dy * dy > 1) continue;
        const lajota = (Math.floor((x + (y >> 1) % 2 * 2) / 4) + (y >> 1)) % 2;
        b.set(x, y, (y % 2 === 0 && (x + y) % 4 === 0) ? P.ink3 : lajota ? P.slate : '#6c7896');
      }
    }
    // toras cruzadas
    line(b, 4, 12, 11, 9, P.bark); line(b, 4, 13, 11, 10, P.wood);
    line(b, 4, 9, 11, 12, P.bark); line(b, 4, 10, 11, 13, P.wood);
    if (!lit) {
      for (let x = 5; x <= 10; x++) { b.set(x, 11, P.maroon); if (x % 2) b.set(x, 10, P.slate); }
      b.set(7, 9, P.mist); b.set(8, 9, P.slate);
    }
    if (lv === 1) {
      // pedras em volta
      const st = [[2, 12], [3, 14], [6, 15], [9, 15], [12, 14], [13, 12], [12, 10], [3, 10]];
      for (const [x, y] of st) { b.set(x, y, P.slate); b.set(x + 1, y, P.mist); b.set(x, y - 1, P.silver); b.set(x + 1, y + 1, P.ink3); }
    } else {
      // roda de pedras encostadas (blocos 2 x 2): as de trás antes, as da frente por cima das toras
      const n = lv >= 3 ? 12 : 11, rx = lv >= 3 ? 6.3 : 5.8, ry = lv >= 3 ? 3.5 : 3.2;
      const stones = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2 + 0.15;
        stones.push([Math.round(7.5 + Math.cos(a) * rx - 0.5), Math.round(11.8 + Math.sin(a) * ry - 0.5)]);
      }
      stones.sort((s, t) => s[1] - t[1]);
      for (const [x, y] of stones) {
        b.set(x, y, P.silver); b.set(x + 1, y, P.mist); b.set(x, y + 1, P.slate); b.set(x + 1, y + 1, P.ink3);
        if (lv >= 3) b.set(x - 1, y + 1, P.ink3);
      }
    }
    return b;
  }
  function fireFrame(f, lv) {
    lv = lv || 1;
    const b = fireBase(true, lv);
    const hts = [[7, 9, 6], [8, 6, 9], [6, 8, 8]][f].map((h) => h + (lv - 1));
    const cols = [P.red, P.ember, P.gold, P.yellow];
    const xs = [6, 8, 10];
    for (let i = 0; i < 3; i++) {
      const x = xs[i], h = hts[i];
      for (let k = 0; k < h; k++) {
        const y = 11 - k, w = Math.max(0, Math.round((h - k) / 3));
        for (let dx = -w; dx <= w; dx++) {
          const edge = Math.abs(dx) === w;
          const c = k > h - 2 ? cols[0] : edge ? cols[1] : k < h * 0.4 ? cols[3] : cols[2];
          b.set(x + dx, y, c);
        }
      }
    }
    b.set(8 + (f - 1), 2 + f, P.yellow);
    return b.canvas();
  }

  // ---------- barracas ----------
  function tent1(ghost) {
    const W = 32, H = 30, b = new Buf(W, H);
    const apx = 16, top = 5, base = 26, half = 13;
    for (let y = top; y <= base; y++) {
      const t = (y - top) / (base - top), hw = Math.round(t * half);
      for (let dx = -hw; dx <= hw; dx++) {
        const x = apx + dx;
        let c = dx < 0 ? P.tan : P.wood;
        if (dx === -hw) c = P.bark;
        if (dx === hw) c = P.maroon;
        if (dx >= 0 && dx < 2) c = P.bark;
        if (y % 5 === 0 && Math.abs(dx) < hw - 1 && (x + y) % 2 === 0) c = dx < 0 ? P.wood : P.bark;
        b.set(x, y, c);
      }
    }
    // entrada
    for (let y = 15; y <= base; y++) {
      const hw = Math.round((y - 15) / (base - 15) * 4);
      for (let dx = -hw; dx <= hw; dx++) b.set(apx + dx + 1, y, dx === -hw ? P.bark : P.ink);
    }
    // varas cruzadas no topo
    line(b, apx - 3, 1, apx + 1, 6, P.bark); line(b, apx + 3, 1, apx - 1, 6, P.maroon);
    // estacas
    b.set(apx - half - 1, base, P.maroon); b.set(apx + half + 1, base, P.maroon);
    for (let x = apx - half; x <= apx + half; x++) b.set(x, base + 1, P.maroon);
    return b.canvas();
  }
  function tent2() {
    const W = 32, H = 30, b = new Buf(W, H);
    // paredes de couro
    for (let y = 13; y <= 26; y++) for (let x = 4; x <= 27; x++) {
      let c = x < 16 ? P.tan : P.wood;
      if (x === 4 || x === 27) c = P.bark;
      if ((x === 10 || x === 21) && y > 14) c = P.bark;
      b.set(x, y, c);
    }
    // telhado
    for (let y = 3; y <= 13; y++) {
      const t = (y - 3) / 10, hw = Math.round(3 + t * 13);
      for (let dx = -hw; dx <= hw; dx++) {
        const x = 16 + dx;
        let c = dx < 0 ? P.wood : P.bark;
        if (dx === -hw || y === 13) c = P.maroon;
        if (y % 3 === 0 && Math.abs(dx) < hw && (x % 2)) c = dx < 0 ? P.orange : P.wood;
        b.set(x, y, c);
      }
    }
    line(b, 12, 1, 16, 4, P.bark); line(b, 20, 1, 16, 4, P.bark);
    // porta
    for (let y = 17; y <= 26; y++) for (let x = 13; x <= 18; x++) b.set(x, y, x === 13 ? P.bark : P.ink);
    for (let y = 17; y <= 22; y++) b.set(19 - Math.floor((y - 17) / 2), y, P.tan);
    // pedras na base
    for (let x = 3; x <= 28; x += 3) { b.set(x, 27, P.mist); b.set(x + 1, 27, P.slate); b.set(x, 26, P.silver); }
    // bandeirinha
    line(b, 16, 0, 16, 3, P.bark); b.set(17, 0, P.red); b.set(18, 0, P.red); b.set(17, 1, P.wine);
    return b.canvas();
  }

  // ---------- estoque ----------
  function mat() {
    const b = new Buf(32, 32);
    for (let y = 3; y < 30; y++) for (let x = 2; x < 30; x++) {
      const edge = x === 2 || x === 29 || y === 3 || y === 29;
      let c = ((x + y) % 4 < 2) ? P.wood : '#a0603f';
      if ((x - y + 64) % 6 === 0) c = P.bark;
      if (edge) c = P.bark;
      b.set(x, y, c);
    }
    return b.canvas();
  }
  function item(kind) {
    switch (kind) {
      case 'madeira': return fromRows(['.bbbbbb.', 'tobbbbbB', 'tobbbbBB', '.kkkkkk.'], { b: P.wood, B: P.bark, t: P.tan, o: P.wood, k: P.maroon }).canvas();
      case 'pedra': return fromRows(['..lL..', '.lllm.', 'lllmmk', '.kkkk.'], { l: P.mist, L: P.silver, m: P.slate, k: P.ink2 }).canvas();
      case 'frutas': return fromRows(['.pr.rp.', 'rrrrrrr', 'wbwbwbw', '.bbbbb.'], { p: P.rose, r: P.red, w: P.wood, b: P.bark }).canvas();
      case 'peixe': return fromRows(['.LLLL.k', 'LeLllkk', '.llll.k'], { L: P.silver, l: P.mist, e: P.ink, k: P.slate }).canvas();
      case 'agua': return fromRows(['.k.', 'ggg', 'gGg', 'ggg', '.g.'], { k: P.bark, g: P.gourd, G: P.tan }).canvas();
      // Etapa 5
      case 'carne': return fromRows(['.kkkk.', 'kRWRRk', 'kRRWRk', '.kkkk.'], { k: P.maroon, R: P.red, W: P.rose }).canvas();
      case 'couro': return fromRows(['k....k', 'kHHHHk', '.HhhH.', 'kHHHHk'], { k: P.maroon, H: LEATHER[0], h: LEATHER[1] }).canvas();
      case 'argila': return fromRows(['.AAA.', 'AaAAa', 'kkkkk'], { A: CLAY[0], a: CLAY[1], k: P.maroon }).canvas();
      case 'defumado': return fromRows(['.LLLL.k', 'LeLllkk', '.llll.k'], { L: SMOKED[0], l: SMOKED[1], e: P.ink, k: P.bark }).canvas();
      case 'seca': return fromRows(['.pr.rp.', 'rrrrrrr', 'wbwbwbw', '.bbbbb.'], { p: P.tan, r: P.orange, w: P.wood, b: P.bark }).canvas();
    }
    return null;
  }
  // cores da Etapa 5: couro, barro, defumado
  const LEATHER = ['#a8744c', '#6e4630'];
  const CLAY = ['#b0704e', '#7e4a36'];
  const SMOKED = ['#b0703a', '#7a4628'];
  A.LEATHER = LEATHER;

  // ---------- moquém, jirau e forno de barro (Etapa 5) ----------
  // moquém: grelha de varas sobre brasa, cercada de pedras (16 x 16)
  function moquem() {
    return fromRows([
      '................',
      '................',
      '..kkkkkkkkkkkk..',
      '..kbwbwbwbwbwk..',
      '..kkkkkkkkkkkk..',
      '..kb........bk..',
      '..kb........bk..',
      '..kb..r..r..bk..',
      '..kb.rOrrOr.bk..',
      '..kb.rrOOrr.bk..',
      '.skkssrrrrsskks.',
      '..ss.sssssss.s..',
    ], { k: P.bark, b: P.wood, w: P.tan, r: P.rust, O: P.ember, s: P.slate }).canvas();
  }
  // jirau: estrado de varas sobre quatro pés (32 x 14)
  function jirau() {
    return fromRows([
      '................................',
      '................................',
      '................................',
      '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
      '..kwbwbwbwbwbwbwbwbwbwbwbwbwbk..',
      '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
      '...kb.........kb.........kb.....',
      '...kb.........kb.........kb.....',
      '...kb.........kb.........kb.....',
      '...kb.........kb.........kb.....',
      '..kkbk.......kkbk.......kkbk....',
    ], { k: P.bark, b: P.wood, w: P.tan }).canvas();
  }
  // forno de barro: cúpula com a boca acesa e potes ao lado (32 x 30)
  function forno() {
    const b = new Buf(32, 30);
    const cx = 14.5, cy = 20, rx = 11.5, ry = 13;
    for (let y = 4; y <= 27; y++) for (let x = 0; x < 32; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1 || y > 26) continue;
      const edge = (dx * dx + dy * dy > 0.84) || y === 26;
      let c = x < cx - 3 ? CLAY[0] : x > cx + 5 ? CLAY[1] : '#9a5e42';
      if (y < 10 && x < cx) c = P.tan;
      if (edge) c = P.maroon;
      b.set(x, y, c);
    }
    // boca do forno com brasa
    for (let y = 18; y <= 25; y++) for (let x = 11; x <= 18; x++) {
      const top = y === 18 && (x === 11 || x === 18);
      if (top) continue;
      const inner = x > 11 && x < 18 && y > 18;
      b.set(x, y, inner ? (y >= 23 ? (x % 2 ? P.ember : P.rust) : P.ink) : P.maroon);
    }
    // respiro no topo
    b.set(14, 5, P.ink); b.set(15, 5, P.ink);
    // dois potes
    const pot = (px, py) => {
      const rows = ['.kkk.', '.kRk.', 'kOOOk', 'kOYOk', 'kOOrk', '.kkk.'];
      rows.forEach((r, yy) => { for (let xx = 0; xx < 5; xx++) { const m = { k: P.maroon, R: P.tan, O: P.orange, Y: P.tan, r: P.rust }[r[xx]]; if (m) b.set(px + xx, py + yy, m); } });
    };
    pot(25, 21); pot(27, 23);
    return b.canvas();
  }

  // ---------- Etapa 7: obras que evoluem, as casas de cada lugar, armazém e oficinas ----------
  // tons de palha, tábua e pedra: do mais escuro ao mais claro (a luz vem de cima, pela esquerda)
  const THATCH = ['#5e4228', '#8a6440', '#b8904e', '#d8b56a', '#ecd28e'];
  const PLANK = ['#4e2e22', '#733e39', '#9a5e42', '#b86f50', '#d49a6a'];
  const STONE = ['#262b44', '#3a4466', '#5a6988', '#8b9bb4', '#c0cbdc'];
  A.THATCH = THATCH; A.PLANK = PLANK;
  const H7 = (x, y, s) => G.hash2(x, y, 700 + (s || 0));
  // telhado de palha em duas águas: do cume (y0, meia largura hw0) ao beiral (y1, hw1), com fiadas e franja
  function thatch(b, cx, y0, y1, hw0, hw1, seed) {
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0), hw = Math.round(hw0 + (hw1 - hw0) * t);
      for (let dx = -hw; dx <= hw; dx++) {
        const x = cx + dx;
        let tone = dx < -hw * 0.25 ? 3 : dx > hw * 0.45 ? 1 : 2;
        if ((y - y0) % 3 === 2) tone--;
        if (H7(x, y, seed) < 0.16) tone = Math.max(1, tone - 1);
        else if (H7(x, y, seed + 1) < 0.07 && tone < 4) tone++;
        if (dx === -hw || dx === hw || y === y0) tone = 0;
        b.set(x, y, THATCH[Math.max(0, tone)]);
      }
    }
    // franja do beiral
    const hw = Math.round(hw1);
    for (let dx = -hw; dx <= hw; dx++) if ((cx + dx) % 2 === 0) b.set(cx + dx, y1 + 1, THATCH[0]);
  }
  // telhado de tábuas (ou telhas de madeira): fiadas de 2 px com emendas desencontradas
  function shingles(b, cx, y0, y1, hw0, hw1, cols) {
    cols = cols || PLANK;
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0), hw = Math.round(hw0 + (hw1 - hw0) * t);
      const row = (y - y0) >> 1;
      for (let dx = -hw; dx <= hw; dx++) {
        const x = cx + dx;
        let tone = dx < 0 ? 3 : 2;
        if ((y - y0) % 2 === 1) tone--;
        if ((x + row * 3) % 5 === 0) tone = 1;
        if (dx === -hw || dx === hw || y === y0 || y === y1) tone = 0;
        b.set(x, y, cols[tone]);
      }
    }
  }
  // parede de tábuas em pé
  function plankWall(b, x0, y0, x1, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = (x - x0) % 3;
      let c = k === 2 ? PLANK[1] : x < (x0 + x1) / 2 ? PLANK[3] : PLANK[2];
      if (k !== 2 && H7(x, y, 9) < 0.06) c = PLANK[1];
      if (x === x0 || x === x1) c = PLANK[0];
      b.set(x, y, c);
    }
  }
  function rect7(b, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) b.set(x, y, c); }
  function door(b, x0, y0, x1, y1, arch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (arch && y === y0 && (x === x0 || x === x1)) continue;
      b.set(x, y, x === x0 || x === x1 || (y === y0 && !arch) ? PLANK[0] : P.ink);
    }
  }
  function windowAt(b, x0, y0, w, h) {
    rect7(b, x0, y0, x0 + w - 1, y0 + h - 1, P.ink);
    for (let x = x0 - 1; x <= x0 + w; x++) b.set(x, y0 + h, PLANK[1]);   // peitoril
    b.set(x0, y0, '#2b1d1a');
  }

  // oca: domo alto de palha, a casa grande de muitas famílias (32 x 34)
  function oca() {
    const W = 32, H = 34, b = new Buf(W, H);
    const cx = 15.5, base = 31, top = 3;
    for (let y = top; y <= base; y++) {
      const t = (base - y) / (base - top);
      const hw = 15.2 * Math.pow(Math.max(0, 1 - Math.pow(t, 2.4)), 0.55);
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx;
        if (Math.abs(dx) > hw) continue;
        const rel = dx / Math.max(1, hw);
        let tone = rel < -0.35 ? 3 : rel > 0.45 ? 1 : 2;
        if ((base - y) % 3 === 1) tone--;
        if (H7(x, y, 3) < 0.15) tone = Math.max(1, tone - 1);
        else if (H7(x, y, 4) < 0.06) tone = Math.min(4, tone + 1);
        if (rel < -0.55 && y < 16 && H7(x, y, 5) < 0.3) tone = 4;
        if (Math.abs(dx) > hw - 1) tone = 0;
        b.set(x, y, THATCH[Math.max(0, tone)]);
      }
    }
    // tufo no topo
    b.set(15, 1, THATCH[3]); b.set(16, 2, THATCH[2]); b.set(14, 2, THATCH[3]); b.set(17, 1, THATCH[1]); b.set(15, 2, THATCH[2]); b.set(16, 1, THATCH[4]);
    // porta em arco
    for (let y = 23; y <= base; y++) for (let x = 13; x <= 18; x++) {
      if (y === 23 && (x === 13 || x === 18)) continue;
      b.set(x, y, x === 13 || x === 18 || y === 23 ? THATCH[0] : P.ink);
    }
    // chão
    for (let x = 1; x < 31; x++) if (b.get(x, base)) b.set(x, base + 1, THATCH[0]);
    return b.canvas();
  }

  // palafita: casa de tábuas sobre esteios, com escadinha (32 x 34)
  function palafita() {
    const W = 32, H = 34, b = new Buf(W, H);
    // esteios
    for (const x of [4, 11, 20, 27]) for (let y = 24; y <= 32; y++) { b.set(x, y, PLANK[2]); b.set(x + 1, y, PLANK[0]); }
    // escada
    for (let y = 24; y <= 32; y++) { b.set(14, y, PLANK[3]); b.set(17, y, PLANK[1]); }
    for (const y of [26, 29, 32]) for (let x = 15; x <= 16; x++) b.set(x, y, P.tan);
    // estrado
    for (let x = 2; x <= 29; x++) { b.set(x, 22, P.tan); b.set(x, 23, x % 4 === 0 ? PLANK[0] : PLANK[2]); b.set(x, 24, PLANK[0]); }
    // paredes
    plankWall(b, 4, 12, 27, 21);
    door(b, 14, 15, 17, 21);
    windowAt(b, 7, 15, 3, 3); windowAt(b, 22, 15, 3, 3);
    // telhado
    thatch(b, 16, 1, 12, 3, 15, 11);
    return b.canvas();
  }

  // casa de barro (taipa): paredes de barro com a trama de varas aparecendo (32 x 34)
  function casaBarro() {
    const W = 32, H = 34, b = new Buf(W, H);
    for (let y = 15; y <= 30; y++) for (let x = 3; x <= 28; x++) {
      let c = x < 11 ? CLAY[0] : x > 21 ? CLAY[1] : '#9a5e42';
      if (H7(x, y, 21) < 0.08) c = CLAY[1];
      else if (H7(x, y, 22) < 0.05) c = '#c88a62';
      b.set(x, y, c);
    }
    // barro respingado no pé da parede e um reboco que caiu, mostrando as varas
    for (let x = 4; x <= 27; x++) for (let y = 28; y <= 30; y++) if (H7(x, y, 24) < 0.45) b.set(x, y, CLAY[1]);
    for (let x = 6; x <= 9; x++) b.set(x, 19, CLAY[1]);
    for (let x = 5; x <= 10; x++) { b.set(x, 20, x % 3 === 0 ? PLANK[1] : PLANK[2]); b.set(x, 22, x % 3 === 0 ? PLANK[1] : PLANK[2]); }
    for (let x = 5; x <= 10; x++) b.set(x, 21, x === 5 || x === 10 ? CLAY[1] : '#8a5238');
    for (let x = 6; x <= 9; x++) b.set(x, 23, CLAY[1]);
    // esteios e viga
    for (let y = 15; y <= 30; y++) { b.set(3, y, PLANK[1]); b.set(28, y, PLANK[0]); }
    for (let x = 3; x <= 28; x++) b.set(x, 15, PLANK[1]);
    for (let x = 3; x <= 28; x++) b.set(x, 31, P.maroon);
    // porta de tábuas e janela
    for (let y = 21; y <= 30; y++) for (let x = 13; x <= 18; x++) b.set(x, y, x === 13 || x === 18 || y === 21 ? PLANK[0] : (x % 2 ? PLANK[3] : PLANK[2]));
    b.set(17, 26, P.gold);
    windowAt(b, 22, 18, 3, 3);
    // telhado de palha, de quatro águas
    thatch(b, 16, 3, 15, 6, 15, 23);
    return b.canvas();
  }

  // casa de pedra: blocos de pedra, telhas de madeira e chaminé (32 x 34)
  function casaPedra() {
    const W = 32, H = 34, b = new Buf(W, H);
    for (let y = 15; y <= 30; y++) {
      const row = Math.floor((y - 15) / 3), off = row % 2 ? 3 : 0;
      for (let x = 3; x <= 28; x++) {
        const bx = Math.floor((x + off) / 5), mortar = (y - 15) % 3 === 2 || (x + off) % 5 === 0;
        let c = mortar ? STONE[1] : H7(bx, row, 31) < 0.35 ? STONE[2] : H7(bx, row, 32) < 0.5 ? STONE[3] : '#a2aec4';
        if (!mortar && (x + off) % 5 === 1 && (y - 15) % 3 === 0) c = STONE[4];
        if (x === 3 || x === 28) c = STONE[1];
        b.set(x, y, c);
      }
    }
    for (let x = 3; x <= 28; x++) b.set(x, 31, STONE[0]);
    // porta em arco com a volta de pedra clara
    for (let y = 21; y <= 30; y++) for (let x = 13; x <= 18; x++) {
      if (y === 21 && (x === 13 || x === 18)) continue;
      b.set(x, y, x === 13 || x === 18 ? PLANK[0] : (x % 2 ? PLANK[3] : PLANK[2]));
    }
    for (let x = 13; x <= 18; x++) b.set(x, 20, STONE[4]);
    b.set(12, 21, STONE[4]); b.set(19, 21, STONE[4]); b.set(17, 26, P.gold);
    windowAt(b, 6, 19, 3, 3); windowAt(b, 22, 19, 3, 3);
    // telhado de telhas de madeira
    shingles(b, 16, 4, 15, 6, 15);
    // chaminé
    for (let y = 1; y <= 8; y++) for (let x = 22; x <= 25; x++) b.set(x, y, x === 22 || x === 25 ? STONE[1] : y === 1 ? STONE[4] : (x + y) % 3 ? STONE[3] : STONE[2]);
    b.set(23, 1, P.ink); b.set(24, 1, P.ink);
    return b.canvas();
  }

  // moquém grande: duas grelhas, uma em cima da outra (16 x 14)
  function moquem2() {
    return fromRows([
      '.kkkkkkkkkkkkkk.',
      '.kbwbwbwbwbwbwk.',
      '.kkkkkkkkkkkkkk.',
      '.kb..........bk.',
      '.kkkkkkkkkkkkkk.',
      '.kbwbwbwbwbwbwk.',
      '.kkkkkkkkkkkkkk.',
      '.kb..........bk.',
      '.kb.r..r..r..bk.',
      '.kbrOrrOrrOr.bk.',
      '.kbrrOOrrOOr.bk.',
      'skkssrrrrrrsskks',
      '.sss.ssssss.sss.',
    ], { k: P.bark, b: P.wood, w: P.tan, r: P.rust, O: P.ember, s: P.slate }).canvas();
  }
  // jirau coberto: o mesmo estrado, debaixo de um telhado de palha (32 x 20)
  function jirau2() {
    const b = new Buf(32, 20);
    const base = fromRows([
      '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
      '..kwbwbwbwbwbwbwbwbwbwbwbwbwbk..',
      '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
      '...kb.........kb.........kb.....',
      '...kb.........kb.........kb.....',
      '...kb.........kb.........kb.....',
      '...kb.........kb.........kb.....',
      '..kkbk.......kkbk.......kkbk....',
    ], { k: P.bark, b: P.wood, w: P.tan });
    for (let y = 0; y < base.h; y++) for (let x = 0; x < 32; x++) { const c = base.get(x, y); if (c) b.set(x, y + 12, c); }
    // esteios do telhado
    for (const x of [2, 29]) for (let y = 4; y <= 19; y++) { b.set(x, y, PLANK[3]); b.set(x + 1, y, PLANK[1]); }
    // telhado baixo e comprido
    for (let y = 0; y <= 5; y++) for (let x = 0; x < 32; x++) {
      const inset = 5 - y;
      if (x < Math.max(0, inset - 2) || x > 31 - Math.max(0, inset - 2)) continue;
      let tone = x < 12 ? 3 : x > 22 ? 1 : 2;
      if (y % 3 === 2) tone--;
      if (H7(x, y, 41) < 0.15) tone = Math.max(1, tone - 1);
      if (y === 0 || y === 5 || x === Math.max(0, inset - 2) || x === 31 - Math.max(0, inset - 2)) tone = 0;
      b.set(x, y, THATCH[tone]);
    }
    for (let x = 0; x < 32; x += 2) b.set(x, 6, THATCH[0]);
    return b.canvas();
  }
  // forno grande: cúpula maior, chaminé e três potes (32 x 32)
  function forno2() {
    const b = new Buf(32, 32);
    const cx = 14, cy = 21, rx = 12.5, ry = 15;
    for (let y = 5; y <= 29; y++) for (let x = 0; x < 32; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1 || y > 28) continue;
      const edge = (dx * dx + dy * dy > 0.86) || y === 28;
      let c = x < cx - 3 ? CLAY[0] : x > cx + 5 ? CLAY[1] : '#9a5e42';
      if (y < 12 && x < cx) c = P.tan;
      if (!edge && (y - 5) % 5 === 4 && H7(x, y, 51) < 0.6) c = CLAY[1];   // anéis de barro
      if (edge) c = P.maroon;
      b.set(x, y, c);
    }
    // chaminé de barro
    for (let y = 1; y <= 7; y++) for (let x = 12; x <= 15; x++) b.set(x, y, x === 12 || x === 15 ? P.maroon : y === 1 ? P.ink : CLAY[0]);
    // boca larga com brasa
    for (let y = 19; y <= 27; y++) for (let x = 9; x <= 18; x++) {
      if (y === 19 && (x === 9 || x === 18)) continue;
      const inner = x > 9 && x < 18 && y > 19;
      b.set(x, y, inner ? (y >= 25 ? ((x + y) % 2 ? P.ember : P.rust) : P.ink) : P.maroon);
    }
    const pot = (px, py, big) => {
      const rows = big ? ['..kkk..', '..kRk..', '.kOOOk.', 'kOYOOOk', 'kOYOOrk', 'kOOOOrk', '.kOOrk.', '..kkk..'] : ['.kkk.', '.kRk.', 'kOOOk', 'kOYOk', 'kOOrk', '.kkk.'];
      rows.forEach((r, yy) => { for (let xx = 0; xx < r.length; xx++) { const m = { k: P.maroon, R: P.tan, O: P.orange, Y: P.tan, r: P.rust }[r[xx]]; if (m) b.set(px + xx, py + yy, m); } });
    };
    pot(24, 20, true); pot(27, 25); pot(22, 25);
    return b.canvas();
  }

  // armazém: paiol de varas trançadas sobre pés baixos, telhado de palha (32 x 32)
  function armazem1() {
    const W = 32, H = 32, b = new Buf(W, H);
    for (const x of [6, 14, 18, 25]) { for (let y = 25; y <= 29; y++) { b.set(x, y, PLANK[2]); b.set(x + 1, y, PLANK[0]); } b.set(x - 1, 30, STONE[2]); b.set(x, 30, STONE[3]); b.set(x + 1, 30, STONE[2]); b.set(x + 2, 30, STONE[1]); }
    for (let x = 4; x <= 27; x++) { b.set(x, 23, P.tan); b.set(x, 24, PLANK[0]); }
    // paredes de varas trançadas
    for (let y = 12; y <= 22; y++) for (let x = 5; x <= 26; x++) {
      let c = ((x + y) % 4 < 2) === (Math.floor((y - 12) / 2) % 2 === 0) ? P.tan : P.wood;
      if (x % 5 === 0) c = PLANK[1];
      if (x > 20 && c === P.tan) c = P.gourd;
      if (x === 5 || x === 26) c = PLANK[0];
      b.set(x, y, c);
    }
    door(b, 13, 15, 18, 22);
    thatch(b, 16, 1, 12, 3, 15, 61);
    // cesto de frutas e pote ao pé da escada
    const cesto = ['.RrR.', 'kwbwk', 'kbwbk', '.kkk.'];
    cesto.forEach((r, y) => { for (let x = 0; x < 5; x++) { const c = { R: P.red, r: P.wine, k: PLANK[0], w: P.tan, b: P.wood }[r[x]]; if (c) b.set(26 + x, 27 + y, c); } });
    ['.kk.', 'kOOk', 'kOrk', '.kk.'].forEach((r, y) => { for (let x = 0; x < 4; x++) { const c = { k: P.maroon, O: P.orange, r: P.rust }[r[x]]; if (c) b.set(1 + x, 27 + y, c); } });
    return b.canvas();
  }
  // armazém de tábuas: alto e fechado, sobre base de barro, porta dupla com travessa (32 x 32)
  function armazem2() {
    const W = 32, H = 32, b = new Buf(W, H);
    for (let y = 26; y <= 30; y++) for (let x = 3; x <= 28; x++) b.set(x, y, y === 30 ? P.maroon : y === 26 ? CLAY[1] : H7(x, y, 62) < 0.12 ? CLAY[1] : x < 16 ? CLAY[0] : '#9a5e42');
    plankWall(b, 4, 11, 27, 25);
    // porta dupla com o Z da travessa
    for (let y = 16; y <= 25; y++) for (let x = 11; x <= 20; x++) b.set(x, y, x === 11 || x === 20 || x === 15 || x === 16 || y === 16 ? PLANK[0] : (x % 2 ? PLANK[3] : PLANK[2]));
    line(b, 12, 24, 14, 17, PLANK[1]); line(b, 17, 17, 19, 24, PLANK[1]);
    b.set(15, 21, P.gold); b.set(16, 21, P.gold);
    // respiro
    rect7(b, 14, 12, 17, 13, P.ink);
    shingles(b, 16, 1, 10, 4, 15);
    return b.canvas();
  }
  // marcenaria: galpão aberto de palha, bancada de tronco, serra e tábuas (32 x 30)
  function marcenaria1() {
    const W = 32, H = 30, b = new Buf(W, H);
    // sombra do galpão no chão
    for (let y = 10; y <= 12; y++) for (let x = 4; x <= 27; x++) b.set(x, y, 'rgba(24,20,37,0.28)');
    for (const x of [3, 27]) for (let y = 8; y <= 28; y++) { b.set(x, y, PLANK[2]); b.set(x + 1, y, PLANK[0]); }
    // tocos e tronco da bancada
    for (const x0 of [8, 20]) for (let y = 22; y <= 27; y++) for (let x = x0; x < x0 + 3; x++) b.set(x, y, y === 22 ? P.tan : x === x0 ? P.wood : PLANK[1]);
    for (let y = 18; y <= 21; y++) for (let x = 6; x <= 25; x++) b.set(x, y, x === 6 || x === 25 ? P.tan : y === 18 ? P.tan : y === 21 ? PLANK[0] : (x % 4 === 0 ? PLANK[1] : P.wood));
    // serra sobre a bancada
    for (let x = 12; x <= 17; x++) b.set(x, 17, STONE[4]);
    for (let x = 12; x <= 17; x += 2) b.set(x, 18, STONE[3]);
    b.set(18, 17, PLANK[1]); b.set(19, 17, PLANK[1]); b.set(19, 16, PLANK[1]);
    // tábuas empilhadas
    for (let k = 0; k < 3; k++) for (let x = 4; x <= 11; x++) { b.set(x, 26 - k * 2, P.tan); b.set(x, 27 - k * 2, PLANK[2]); }
    for (let k = 0; k < 3; k++) { b.set(12, 27 - k * 2, PLANK[0]); b.set(12, 26 - k * 2, PLANK[1]); }
    // serragem
    for (const [x, y] of [[14, 24], [16, 25], [13, 26], [18, 24], [15, 27], [22, 28], [11, 28]]) b.set(x, y, P.tan);
    thatch(b, 16, 1, 8, 13, 15, 71);
    return b.canvas();
  }
  // marcenaria com bancada: telhado de tábuas, bancada firme com torno, mais tábuas (32 x 30)
  function marcenaria2() {
    const W = 32, H = 30, b = new Buf(W, H);
    for (let y = 10; y <= 12; y++) for (let x = 3; x <= 28; x++) b.set(x, y, 'rgba(24,20,37,0.28)');
    for (const x of [2, 15, 28]) for (let y = 8; y <= 28; y++) { b.set(x, y, PLANK[2]); b.set(x + 1, y, PLANK[0]); }
    // bancada de tábuas
    for (let x = 6; x <= 26; x++) { b.set(x, 18, P.tan); b.set(x, 19, P.wood); b.set(x, 20, PLANK[0]); }
    for (const x of [7, 25]) for (let y = 21; y <= 27; y++) { b.set(x, y, PLANK[2]); b.set(x + 1, y, PLANK[0]); }
    for (let x = 7; x <= 26; x++) b.set(x, 25, PLANK[1]);   // travessa de baixo
    // torno de pedra e plaina
    rect7(b, 21, 15, 23, 17, STONE[2]); b.set(21, 15, STONE[4]); b.set(22, 15, STONE[3]);
    rect7(b, 10, 16, 13, 17, PLANK[3]); b.set(11, 15, PLANK[1]);
    // serra pendurada no esteio do meio
    for (let y = 11; y <= 16; y++) b.set(17, y, STONE[4]);
    for (let y = 11; y <= 16; y += 2) b.set(18, y, STONE[3]);
    b.set(17, 10, PLANK[1]);
    // pilha de tábuas maior
    for (let k = 0; k < 4; k++) for (let x = 3; x <= 12; x++) { b.set(x, 28 - k * 2, P.tan); b.set(x, 29 - k * 2, PLANK[2]); }
    shingles(b, 16, 1, 8, 14, 15.5);
    return b.canvas();
  }
  // tecelagem: tear de varas debaixo de um telhadinho de palha, com um pano começando e feixes de fibra (32 x 30)
  function tecelagem1() {
    const W = 32, H = 30, b = new Buf(W, H);
    for (const x of [3, 27]) for (let y = 7; y <= 28; y++) { b.set(x, y, PLANK[2]); b.set(x + 1, y, PLANK[0]); }
    // quadro do tear
    for (const x of [8, 22]) for (let y = 10; y <= 27; y++) { b.set(x, y, P.wood); b.set(x + 1, y, PLANK[1]); }
    for (let x = 8; x <= 23; x++) { b.set(x, 10, P.tan); b.set(x, 11, PLANK[1]); b.set(x, 25, P.tan); b.set(x, 26, PLANK[1]); }
    // fios
    for (let x = 11; x <= 20; x += 2) for (let y = 12; y <= 18; y++) b.set(x, y, P.parch);
    // pano sendo tecido
    const band = [P.red, P.red, P.gold, P.wine, P.red, P.tan];
    for (let y = 19; y <= 24; y++) for (let x = 10; x <= 21; x++) b.set(x, y, (x + y) % 6 === 0 ? P.gold : band[y - 19]);
    // feixes de fibra no chão
    for (const [x0, y0] of [[23, 24], [26, 26]]) for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + 3; x++) b.set(x, y, y === y0 + 1 ? P.rust : (x + y) % 2 ? P.gourd : THATCH[2]);
    thatch(b, 16, 1, 7, 12, 15, 81);
    return b.canvas();
  }
  // tear grande: telhado de tábuas, tear mais largo com desenho, mantas penduradas (32 x 30)
  function tecelagem2() {
    const W = 32, H = 30, b = new Buf(W, H);
    for (const x of [2, 28]) for (let y = 7; y <= 28; y++) { b.set(x, y, PLANK[2]); b.set(x + 1, y, PLANK[0]); }
    for (const x of [6, 23]) for (let y = 10; y <= 27; y++) { b.set(x, y, P.wood); b.set(x + 1, y, PLANK[1]); }
    for (let x = 6; x <= 24; x++) { b.set(x, 10, P.tan); b.set(x, 11, PLANK[1]); b.set(x, 25, P.tan); b.set(x, 26, PLANK[1]); }
    for (let x = 9; x <= 22; x += 2) for (let y = 12; y <= 16; y++) b.set(x, y, P.parch);
    // pano com losangos
    for (let y = 17; y <= 24; y++) for (let x = 8; x <= 22; x++) {
      const d = Math.abs(((x - 8) % 6) - 3) + Math.abs(((y - 17) % 6) - 3);
      b.set(x, y, d === 3 ? P.gold : d < 2 ? P.plum : P.red);
    }
    // mantas no varal da direita
    for (let y = 12; y <= 20; y++) { b.set(26, y, y % 3 ? P.sky : P.parch); b.set(27, y, y % 3 ? P.blue : P.parch); }
    for (let y = 13; y <= 19; y++) { b.set(30, y, y % 2 ? P.leaf : P.green); b.set(31, y, P.green); }
    shingles(b, 16, 1, 7, 14, 15.5);
    return b.canvas();
  }
  // bancos de tronco em volta da fogueira do centro (vão no chão, debaixo de quem senta)
  function benchH() {
    return fromRows(['.kkkkkkkkkk.', 'kTbbbbbbbbTk', 'kTwbwwbwbwTk', '.kkkkkkkkkk.'], { k: PLANK[0], T: P.tan, b: P.wood, w: PLANK[1] }).canvas();
  }
  function benchV() {
    return fromRows(['.kkk.', 'kbwbk', 'kbwbk', 'kbbbk', 'kbwbk', 'kbwbk', 'kbbbk', 'kbwbk', 'kTTTk', '.kkk.'], { k: PLANK[0], T: P.tan, b: P.wood, w: PLANK[1] }).canvas();
  }
  // itens novos no estoque e nas costas de quem carrega
  function item7(kind) {
    switch (kind) {
      case 'tabuas': return fromRows(['TTTTTTTTk.', 'bbbbbbbbk.', '.TTTTTTTTk', '.bbbbbbbbk'], { T: P.tan, b: PLANK[2], k: PLANK[0] }).canvas();
      case 'fibra': return fromRows(['y.Y.y.', 'yYyYyY', 'rrrrrr', 'YyYyYy', 'y.y.Y.'], { y: THATCH[3], Y: THATCH[2], r: P.rust }).canvas();
      case 'mantas': return fromRows(['kkkkkkk', 'kRGRGRk', 'kRRRRRk', 'kWWWWWk', 'kkkkkkk'], { k: P.maroon, R: P.red, G: P.gold, W: P.parch }).canvas();
      case 'redes': return fromRows(['b......b', 'bRGRGRGb', '.RRRRRR.', '..kkkk..'], { b: PLANK[1], R: P.sky, G: P.parch, k: P.blue }).canvas();
    }
    return null;
  }

  // ---------- capivaras (14 x 9 por quadro): de frente, de costas, direita, esquerda ----------
  const CAPI_SIDE = ['.........kk...', '..kkkkkkkFFk..', '.kFFFFFFFFFFk.', 'kFFFFFFFFFeFFk', 'kFFFFFFFFFFFnk', 'kfFFFFFFFFFFk.', '.kffffffffkk..'];
  const CAPI_LEGS = [['..kfk..kfk....', '..kk...kk.....'], ['.kfk....kfk...', '.kk.....kk....'], ['...kfk.kfk....', '...kk..kk.....']];
  const CAPI_FRONT = ['...kkkkkkkk...', '..kffffffffk..', '.kffFFFFFFffk.', '.kfFFFFFFFFfk.', '.kfFeFFFFeFfk.', '.kfFFFFFFFFfk.', '..kFFFFFFFFk..', '..kkFnnnnFkk..', '..kk......kk..'];
  const CAPI_BACK = ['...kkkkkkkk...', '..kFFFFFFFFk..', '.kFFFFFFFFFFk.', '.kFFFFFFFFFFk.', '.kFFFFFFFFFFk.', '.kfFFFFFFFFfk.', '..kffFFFFffk..', '..kfkkkkkkfk..', '..kk......kk..'];
  const CAPI_FUR = [{ F: '#9a6a44', f: '#6a4430' }, { F: '#8a6040', f: '#5e3c2a' }];
  A.CAPI_W = 14; A.CAPI_H = 9;
  const capiSheets = {};
  A.capiSheet = function (fur) {
    fur = fur ? 1 : 0;
    if (capiSheets[fur]) return capiSheets[fur];
    const map = Object.assign({ k: '#2b1d1a', e: '#181425', n: '#3e2731' }, CAPI_FUR[fur]);
    const fw = A.CAPI_W, fh = A.CAPI_H;
    const [c, x] = mk(fw * 3, fh * 4);
    const front = fromRows(CAPI_FRONT, map), back = fromRows(CAPI_BACK, map);
    for (let f = 0; f < 3; f++) {
      const side = fromRows(CAPI_SIDE.concat(CAPI_LEGS[f]), map);
      const bob = f === 1 ? 1 : 0;
      x.drawImage(front.canvas(), 0, 0, fw, fh - 1, f * fw, bob, fw, fh - 1);
      x.drawImage(front.canvas(), 0, fh - 1, fw, 1, f * fw, fh - 1, fw, 1);
      x.drawImage(back.canvas(), 0, 0, fw, fh - 1, f * fw, fh + bob, fw, fh - 1);
      x.drawImage(back.canvas(), 0, fh - 1, fw, 1, f * fw, 2 * fh - 1, fw, 1);
      x.drawImage(side.canvas(), f * fw, 2 * fh);
      const m = new Buf(fw, fh);
      for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < fw; xx++) m.set(fw - 1 - xx, yy, side.get(xx, yy));
      x.drawImage(m.canvas(), f * fw, 3 * fh);
    }
    return (capiSheets[fur] = c);
  };
  // capivara abatida: deitada, sem as patas no chão
  A.capiDead = function () {
    if (capiSheets.dead) return capiSheets.dead;
    const rows = CAPI_SIDE.map((r) => r.replace('e', 'k'));
    return (capiSheets.dead = fromRows(['..............'].concat(rows.slice(1)), { k: '#2b1d1a', n: '#3e2731', F: '#7a5234', f: '#553624' }).canvas());
  };

  // ---------- pessoas ----------
  const HEAD = {
    FM: ['.kkkkkk.', 'khhhhhhk', 'khHhhhhk', 'khsssshk', 'ksessesk', '.kssssk.', 'kcccccck', 'scccccCs', 'scccccCs', 'kcccccCk', '.kCCCCk.'],
    FF: ['.kkkkkk.', 'khhhhhhk', 'khHhhhhk', 'khsssshk', 'hsessesh', 'hhsssshh', 'hcccccch', 'scccccCs', 'scccccCs', 'kcccccCk', 'kCCCCCCk'],
    BM: ['.kkkkkk.', 'khhhhhhk', 'khHhhhhk', 'khhhhhhk', 'khhhhhhk', '.khhhhk.', 'kcccccck', 'sCccccCs', 'sCccccCs', 'kCccccCk', '.kCCCCk.'],
    BF: ['.kkkkkk.', 'khhhhhhk', 'khHhhhhk', 'khhhhhhk', 'hhhhhhhh', 'hhhhhhhh', 'hhhhhhhh', 'sChhhhCs', 'sCccccCs', 'kCccccCk', 'kCCCCCCk'],
    SM: ['.kkkkk..', 'khhhhhk.', 'khHhhhhk', 'khhhsssk', 'khhssesk', '.khsssk.', '.kcccck.', '.kccsck.', '.kccsck.', '.kcccck.', '.kCCCCk.'],
    SF: ['.kkkkk..', 'khhhhhk.', 'khHhhhhk', 'khhhsssk', 'hhhssesk', 'hhhsssk.', 'hhcccck.', '.hccsck.', '.kccsck.', '.kcccck.', 'kCCCCCk.'],
  };
  const LEGS = {
    F: [['..l..l..', '..l..l..', '.ff..ff.'], ['..l..l..', '.ff..l..', '.....ff.'], ['..l..l..', '..l..ff.', '.ff.....']],
    S: [['...ll...', '...ll...', '...fff..'], ['..l..l..', '.l....l.', 'ff....ff'], ['...ll...', '..l.l...', '..ff.ff.']],
  };
  A.PERSON_W = 8; A.PERSON_H = 14;
  function personFrame(sex, dir, frame, col, beard, closed) {
    const key = (dir === 0 ? 'F' : dir === 1 ? 'B' : 'S') + (sex === 'F' ? 'F' : 'M');
    const head = HEAD[key].slice();
    if (beard && dir === 0) head[5] = '.kbbbbk.';
    if (beard && dir >= 2) head[5] = '.khbbbk.';
    const legs = LEGS[dir >= 2 ? 'S' : 'F'][frame];
    const bob = (dir < 2 && frame > 0) ? 1 : 0;
    const map = {
      k: '#1c1624', h: col.hair, H: lighten(col.hair, 38), s: col.skin, S: col.skinD, e: closed ? col.skinD : '#1c1624',
      c: col.cloth, C: col.clothD, l: col.skinD, f: P.maroon, b: col.hair,
    };
    const b = new Buf(8, 14);
    head.forEach((r, y) => { for (let x = 0; x < 8; x++) { const c = map[r[x]]; if (c) b.set(x, y + bob, c); } });
    legs.forEach((r, i) => { for (let x = 0; x < 8; x++) { const c = map[r[x]]; if (c) b.set(x, 11 + i, c); } });
    if (dir === 3) { // espelha
      const m = new Buf(8, 14);
      for (let y = 0; y < 14; y++) for (let x = 0; x < 8; x++) m.set(7 - x, y, b.get(x, y));
      return m;
    }
    return b;
  }
  const sheets = new Map();
  const GRAY = '#b8c0cc';
  A.personSheet = function (p, gray) {
    const leather = !!p.roupa;
    const key = p.id + ':' + p.look.skin + p.look.hair + p.look.cloth + p.look.beard + (gray ? 'g' : '') + (leather ? 'L' : '');
    let s = sheets.get(key);
    if (s) return s;
    const col = G.Sim.colorsOf(p.look);
    if (gray) col.hair = GRAY;
    if (leather) { col.cloth = LEATHER[0]; col.clothD = LEATHER[1]; }   // roupa de couro
    const [c, x] = mk(8 * 3, 14 * 4);
    for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) x.drawImage(personFrame(p.sex, d, f, col, p.look.beard).canvas(), f * 8, d * 14);
    // dormindo: frente com olhos fechados, deitada
    const fr = personFrame(p.sex, 0, 0, col, p.look.beard, true).canvas();
    const [sc, sx] = mk(14, 8);
    sx.translate(0, 8); sx.rotate(-Math.PI / 2); sx.drawImage(fr, 0, 0);
    s = { sheet: c, sleep: sc };
    sheets.set(key, s);
    return s;
  };

  // ---------- crianças (6 x 11): cabeça grande, corpo curto ----------
  const KID = {
    FM: ['.kkkk.', 'khhhhk', 'khsshk', 'kessek', 'kssssk', '.kssk.', 'kcccck', 'scccCs', '.cCCc.'],
    FF: ['.kkkk.', 'khhhhk', 'hhsshh', 'hesseh', 'hssssh', 'hksskh', 'kcccck', 'scccCs', 'cccCCc'],
    BM: ['.kkkk.', 'khhhhk', 'khHhhk', 'khhhhk', 'khhhhk', '.kkkk.', 'kCccCk', 'sCccCs', '.cCCc.'],
    BF: ['.kkkk.', 'khhhhk', 'hhHhhh', 'hhhhhh', 'hhhhhh', 'hhhhhh', 'kChhCk', 'sCccCs', 'cccCCc'],
    SM: ['.kkk..', 'khhhk.', 'khhssk', 'khssek', 'khsssk', '.kssk.', '.kcck.', '.kcsk.', '.kcck.'],
    SF: ['.kkk..', 'khhhk.', 'hhhssk', 'hhssek', 'hhsssk', 'hhssk.', 'hkcck.', '.kcsk.', '.ccck.'],
  };
  const KID_LEGS = {
    F: [['.l..l.', 'ff..ff'], ['ff..l.', '....ff'], ['.l..ff', 'ff....']],
    S: [['..ll..', '..ff..'], ['.l..l.', 'f....f'], ['..ll..', '.f.f..']],
  };
  A.KID_W = 6; A.KID_H = 11;
  function kidFrame(sex, dir, frame, col, closed) {
    const key = (dir === 0 ? 'F' : dir === 1 ? 'B' : 'S') + (sex === 'F' ? 'F' : 'M');
    const head = KID[key], legs = KID_LEGS[dir >= 2 ? 'S' : 'F'][frame];
    const bob = (dir < 2 && frame > 0) ? 1 : 0;
    const map = {
      k: '#1c1624', h: col.hair, H: lighten(col.hair, 38), s: col.skin, S: col.skinD, e: closed ? col.skinD : '#1c1624',
      c: col.cloth, C: col.clothD, l: col.skinD, f: P.maroon,
    };
    const b = new Buf(6, 11);
    head.forEach((r, y) => { for (let x = 0; x < 6; x++) { const c = map[r[x]]; if (c) b.set(x, y + bob, c); } });
    legs.forEach((r, i) => { for (let x = 0; x < 6; x++) { const c = map[r[x]]; if (c) b.set(x, 9 + i, c); } });
    if (dir === 3) {
      const m = new Buf(6, 11);
      for (let y = 0; y < 11; y++) for (let x = 0; x < 6; x++) m.set(5 - x, y, b.get(x, y));
      return m;
    }
    return b;
  }
  A.kidSheet = function (p) {
    const leather = !!p.roupa;
    const key = 'k' + p.id + ':' + p.look.skin + p.look.hair + p.look.cloth + (leather ? 'L' : '');
    let s = sheets.get(key);
    if (s) return s;
    const col = G.Sim.colorsOf(p.look);
    if (leather) { col.cloth = LEATHER[0]; col.clothD = LEATHER[1]; }
    const [c, x] = mk(6 * 3, 11 * 4);
    for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) x.drawImage(kidFrame(p.sex, d, f, col).canvas(), f * 6, d * 11);
    const fr = kidFrame(p.sex, 0, 0, col, true).canvas();
    const [sc, sx] = mk(11, 6);
    sx.translate(0, 6); sx.rotate(-Math.PI / 2); sx.drawImage(fr, 0, 0);
    s = { sheet: c, sleep: sc };
    sheets.set(key, s);
    return s;
  };
  // bebê enrolado no pano, para ir no colo
  const bundles = {};
  A.bundle = function (skinIdx) {
    if (bundles[skinIdx]) return bundles[skinIdx];
    const col = G.Sim.colorsOf({ skin: skinIdx, hair: '#181425', cloth: 0 });
    return (bundles[skinIdx] = fromRows(['.kkk.', 'kcsck', 'kccck', '.kkk.'], { k: P.bark, c: P.parch, s: col.skin }).canvas());
  };

  // ---------- lobos (16 x 10 por quadro): de lado, de frente e de costas ----------
  const WOLF_SIDE = ['..........kk....', '.........kFFk...', '..kkkkkkkFFFFkk.', '.kFFFFFFFFFeFFFn', 'kFFFFFFFFFFFLLk.', 'kFkFFFFFFFFFkk..', 'kFk.kFfffffFk...'];
  const WOLF_SIDE_LEGS = [['.k..kFk..kFk....', '....kFk..kFk....', '....kk...kk.....'],
    ['.k..kFk..kFk....', '...kFk...kFk....', '...kk....kk.....'],
    ['.k..kFk..kFk....', '.....kFk..kFk...', '.....kk...kk....']];
  const WOLF_FRONT = ['...k.......k....', '...kk.....kk....', '...kFk...kFk....', '...kFFkkkFFk....', '..kFeFFFFFeFk...', '..kFFFLLLFFFk...', '...kFFLnLFFk....', '....kfLLLfk.....', '.....kFkFk......', '.....kk.kk......'];
  const WOLF_BACK = ['...k.......k....', '...kk.....kk....', '...kFk...kFk....', '...kFFkkkFFk....', '..kFFFFFFFFFk...', '...kFFFFFFFk....', '...kFFFfFFFk....', '....kFFFFFk.....', '....kFkFkFk.....', '....kk.L.kk.....'];
  const FURS = [
    { F: P.mist, f: P.slate, L: P.silver },
    { F: '#a08a74', f: '#6e5a4a', L: '#dccbb0' },
    { F: P.slate, f: P.ink3, L: P.mist },
  ];
  A.WOLF_W = 16; A.WOLF_H = 10;
  // olhos que brilham no escuro (em coordenadas do quadro): frente, costas, direita, esquerda
  A.WOLF_EYES = [[[4, 4], [10, 4]], [], [[11, 3]], [[4, 3]]];
  const wolfSheets = {};
  A.wolfSheet = function (fur) {
    if (wolfSheets[fur]) return wolfSheets[fur];
    const map = Object.assign({ k: '#181425', e: '#181425', n: '#181425' }, FURS[fur] || FURS[0]);
    const fw = A.WOLF_W, fh = A.WOLF_H;
    const [c, x] = mk(fw * 3, fh * 4);
    for (let f = 0; f < 3; f++) {
      const side = fromRows(WOLF_SIDE.concat(WOLF_SIDE_LEGS[f]), map);
      const bob = f === 1 ? 1 : 0;
      const front = fromRows(WOLF_FRONT, map), back = fromRows(WOLF_BACK, map);
      // de frente e de costas o passo é um balanço de 1 px (a última linha, dos pés, fica no chão)
      x.drawImage(front.canvas(), 0, 0, fw, fh - 1, f * fw, 0 * fh + bob, fw, fh - 1);
      x.drawImage(front.canvas(), 0, fh - 1, fw, 1, f * fw, 1 * fh - 1, fw, 1);
      x.drawImage(back.canvas(), 0, 0, fw, fh - 1, f * fw, 1 * fh + bob, fw, fh - 1);
      x.drawImage(back.canvas(), 0, fh - 1, fw, 1, f * fw, 2 * fh - 1, fw, 1);
      x.drawImage(side.canvas(), f * fw, 2 * fh);
      // de lado para a esquerda: espelhado
      const m = new Buf(fw, fh);
      for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < fw; xx++) m.set(fw - 1 - xx, yy, side.get(xx, yy));
      x.drawImage(m.canvas(), f * fw, 3 * fh);
    }
    return (wolfSheets[fur] = c);
  };

  // ---------- ícones da interface (10 x 10) ----------
  const ICONS = {
    madeira: [['..........', '..........', '...kkkkkk.', '..kyykbbbk', '.kyooykbbk', '.kyooykBBk', '..kyykBBBk', '...kkkkkk.', '..........', '..........'],
      { k: P.maroon, y: P.tan, o: P.wood, b: P.wood, B: P.bark }],
    pedra: [['..........', '..........', '....kkk...', '..kkLLlk..', '.kLLlllmk.', '.kLlllmmk.', 'kllllmmmmk', '.kkkkkkkk.', '..........', '..........'],
      { k: P.ink2, L: P.silver, l: P.mist, m: P.slate }],
    agua: [['....k.....', '...kCk....', '...kCck...', '..kCccck..', '..kCccck..', '.kCcccbbk.', '.kccccbbk.', '.kcccbbbk.', '..kbbbbk..', '...kkkk...'],
      { k: P.ink2, C: '#9fe8ff', c: P.sky, b: P.blue }],
    frutas: [['.....gg...', '....gGk...', '...kkkkk..', '..kPrrrrk.', '.kPrrrrrdk', '.krrrrrrdk', '.krrrrrddk', '..kdddddk.', '...kkkkk..', '..........'],
      { k: P.maroon, g: P.green, G: P.leaf, P: P.rose, r: P.red, d: P.wine }],
    peixe: [['..........', '..........', '...kkkk.k.', '..kLLLLkLk', '.kLeLLlkLk', '.kLLlllkk.', '..kllllkLk', '...kkkk.kk', '..........', '..........'],
      { k: P.ink2, L: P.silver, l: P.mist, e: P.ink }],
    fogo: [['....r.....', '...rOr....', '...rOOr...', '..rOyyOr..', '..rOyyOr..', '.rOyyyyOr.', '.rOyWWyOr.', '.rOyWWyOr.', '..rOOOOr..', '...rrrr...'],
      { r: P.rust, O: P.ember, y: P.gold, W: P.yellow }],
    construir: [['..........', '..kkkkk...', '.kLLLLlk..', '.kLlllmk..', '..kkbkkk..', '....kbk...', '....kbk...', '....kbk...', '....kbk...', '.....k....'],
      { k: P.ink2, L: P.silver, l: P.mist, m: P.slate, b: P.wood }],
    energia: [['..........', '...kkk....', '..kYYk....', '.kYYk.....', '.kYYk.....', '.kYYk...k.', '.kYYYk.kk.', '..kYYYYk..', '...kkkk...', '..........'],
      { k: P.ink2, Y: P.yellow }],
    social: [['..........', '.kkkkkkkk.', 'kWWWWWWWWk', 'kWWkWkWkWk', 'kWWWWWWWWk', '.kkkkWkkk.', '.....kWk..', '......kk..', '..........', '..........'],
      { k: P.ink2, W: P.parch }],
    saude: [['..........', '.kkk.kkk..', 'kRRrkrrrk.', 'kRrrrrrrk.', 'krrrrrrdk.', '.krrrrdk..', '..krrdk...', '...kdk....', '....k.....', '..........'],
      { k: P.ink2, R: P.rose, r: P.red, d: P.wine }],
    humor: [['..kkkkk...', '.kyyyyyk..', 'kyykyykyk.', 'kyyyyyyyk.', 'kykyyykyk.', 'kyykkkyyk.', '.kyyyyyk..', '..kkkkk...', '..........', '..........'],
      { k: P.ink2, y: P.gold }],
    barraca: [['....k.....', '...kbk....', '...kbbk...', '..kbbBBk..', '..kbbdBk..', '.kbbddBBk.', '.kbdddBBk.', 'kbbdddBBBk', 'kkkkkkkkkk', '..........'],
      { k: P.maroon, b: P.tan, B: P.wood, d: P.ink }],
    cronica: [['..........', '.kkkkkkkk.', '.kRWWWWWk.', '.kRWkkkWk.', '.kRWWWWWk.', '.kRWkkWWk.', '.kRWWWWWk.', '.kRkkkkkk.', '.kkRRRRRk.', '..kkkkkkk.'],
      { k: P.ink2, R: P.wine, W: P.parch }],
    primavera: [['..........', '...kPk....', '..kPPPk...', '.kPPyPPk..', '..kPPPk...', '...kPk....', '....g.....', '...gg.g...', '....ggg...', '....g.....'],
      { k: P.pink, P: P.rose, y: P.yellow, g: P.green }],
    verao: [['....y.....', '.y..y..y..', '..yyyyy...', '..yYYYy...', 'yyyYYYyyy.', '..yYYYy...', '..yyyyy...', '.y..y..y..', '....y.....', '..........'],
      { y: P.gold, Y: P.yellow }],
    outono: [['......kk..', '....kkook.', '...koooOk.', '..kooOook.', '.koOooOk..', '.kOooOok..', '..kooook..', '.k.kkkk...', 'k.........', '..........'],
      { k: P.bark, o: P.orange, O: P.gold }],
    inverno: [['....w.....', '..w.w.w...', '...www....', 'wwwwWwwww.', '...www....', '..w.w.w...', '....w.....', '..........', '..........', '..........'],
      { w: P.silver, W: P.white }],
    nublado: [['..........', '..........', '...kkk....', '..kWWWkk..', '.kWWWWWWk.', 'kWWWWWWLLk', 'kWWWWWLLLk', '.kkkkkkkk.', '..........', '..........'],
      { k: P.ink2, W: P.silver, L: P.mist }],
    chuva: [['...kkk....', '..kWWWkk..', '.kWWWWWWk.', 'kWWWWWLLLk', '.kkkkkkkk.', '..b..b..b.', '.b..b..b..', '..........', '..b..b..b.', '.b..b..b..'],
      { k: P.ink2, W: P.silver, L: P.mist, b: P.sky }],
    neve: [['...kkk....', '..kWWWkk..', '.kWWWWWWk.', 'kWWWWWLLLk', '.kkkkkkkk.', '..w...w...', '.www.www..', '..w...w...', '.....w....', '....www...'],
      { k: P.ink2, W: P.silver, L: P.mist, w: P.white }],
    termometro: [['....kk....', '...kWWk...', '...kWWk...', '...kWrk...', '...kWrk...', '...kWrk...', '..kWrrrk..', '..krrrrk..', '..krrrrk..', '...kkkk...'],
      { k: P.ink2, W: P.parch, r: P.red }],
    pessoa: [['...kkkk...', '..khhhhk..', '..khssk...', '..kssssk..', '...kkkk...', '..kcccck..', '.kcccccck.', '.kcccccck.', '.kkkkkkkk.', '..........'],
      { k: P.ink2, h: P.bark, s: P.skinL, c: P.wood }],
  };
  ICONS.raio = [['.....kkkk.', '....kYYk..', '...kYYk...', '..kYYYkkk.', '.kYYYYYYk.', '..kkkYYk..', '....kYk...', '...kYk....', '..kYk.....', '..kk......'],
    { k: P.rust, Y: P.yellow }];
  ICONS.deus = [['....y.....', '.y..y..y..', '..yyyyy...', '.yyWWWyy..', 'yyWkkkWyy.', '.yyWWWyy..', '..yyyyy...', '.y..y..y..', '....y.....', '..........'],
    { y: P.gold, W: P.white, k: P.ink }];
  ICONS.reza = [['..k..', '.kYk.', '.kYk.', 'kYYYk', 'kYWYk', '.kkk.'], { k: P.rust, Y: P.gold, W: P.yellow }];
  ICONS.cura = [['..........', '...kkkk...', '...kLLk...', '.kkkLLkkk.', '.kLWLLLLk.', '.kLLLLLLk.', '.kkkLLkkk.', '...kLLk...', '...kkkk...', '..........'],
    { k: P.pine, L: P.leaf, W: '#c8f0a0' }];
  ICONS.bebe = [['..........', '...kkkk...', '..kssssk..', '.ksessesk.', '.kssssssk.', '..kssssk..', '.kcccccck.', 'kcccccccck', '.kcccccck.', '..kkkkkk..'],
    { k: P.ink2, s: P.skinL, e: P.ink, c: P.parch }];
  ICONS.afeto = [['..........', '.kkk..kkk.', 'kPPpkkpppk', 'kPpppppppk', 'kppppppppk', '.kppppppk.', '..kppppk..', '...kppk...', '....kk....', '..........'],
    { k: P.plum, P: '#ffd6e0', p: P.rose }];
  ICONS.arvore = [['....kk....', '..kkGGkk..', '.kGGggGGk.', 'kGgGGGGgGk', 'kGGGgGGGGk', '.kGGGGGGk.', '..kkbbkk..', '....bb....', '....bb....', '..bbbbbb..'],
    { k: P.pine, G: P.leaf, g: P.green, b: P.bark }];
  ICONS.lobo = [['.k......k.', '.kk....kk.', '.kFk..kFk.', '.kFFkkFFk.', 'kFFFFFFFFk', 'kFeFFFFeFk', 'kFFFLLFFFk', '.kFLLLLFk.', '..kLnnLk..', '...kkkk...'],
    { k: P.ink2, F: P.mist, L: P.silver, e: P.gold, n: P.ink }];
  ICONS.seca = [['....y.....', '.y..y..y..', '..yyyyy...', 'yyyYYYyyy.', '..yyyyy...', '.y..y..y..', 'kkkkkkkkkk', 'bBbkbBbbkb', 'bbkbbbkbBb', 'kkkkkkkkkk'],
    { y: P.gold, Y: P.yellow, k: P.bark, b: P.wood, B: P.tan }];
  ICONS.mel = [['..........', '...kkkk...', '..kWWWWk..', '..kkkkkk..', '.kyyyyyyk.', '.kyYYyyyk.', '.kyYyyyyk.', '.kyyyyyok.', '.kyyyyook.', '..kkkkkk..'],
    { k: P.bark, W: P.parch, y: P.gold, Y: P.yellow, o: P.orange }];
  ICONS.pergunta = [['.kkkkk.', 'kWWWWWk', 'kWkkkWk', 'kWWWkWk', 'kWWkWWk', 'kWWWWWk', 'kWWkWWk', '.kkkkk.', '..kk...'],
    { k: P.ink2, W: P.parch }];
  // Etapa 5: descobertas, recursos e obras
  ICONS.lasca = [['..........', '......kk..', '.....kLLk.', '....kLllk.', '...kLllmk.', '..kLllmk..', '.kLlmmk...', '.kLmmk....', '..kkk.....', '..........'],
    { k: P.ink2, L: P.silver, l: P.mist, m: P.slate }];
  ICONS.cesto = [['...kkkk...', '..k....k..', '..k....k..', 'kkkkkkkkkk', 'kyWyWyWyWk', 'kWyWyWyWyk', '.kyWyWyWk.', '.kWyWyWyk.', '..kkkkkk..', '..........'],
    { k: P.bark, y: P.tan, W: P.wood }];
  ICONS.lanca = [['.......kk.', '......kLLk', '.....kLLmk', '....kbkmk.', '...kbk.k..', '..kbk.....', '.kbk......', 'kbk.......', 'kk........', '..........'],
    { k: P.ink2, L: P.silver, m: P.slate, b: P.wood }];
  ICONS.anzol = [['.....kk...', '....kWWk..', '.....kWk..', '.....kWk..', '.....kWk..', '..k..kWk..', '.kWk.kWk..', '.kWWkWWk..', '..kWWWk...', '...kkk....'],
    { k: P.ink2, W: P.parch }];
  ICONS.moquem = [['.s....s...', '..s..s....', 'kkkkkkkkkk', 'kbFbFbFbFk', 'kkkkkkkkkk', '.k......k.', '.k.r..r.k.', '.krOrrOrk.', 'kkrrOOrrkk', '..........'],
    { s: P.silver, k: P.bark, b: P.wood, F: SMOKED[0], r: P.rust, O: P.ember }];
  ICONS.jirau = [['..........', '..........', '.RrR.rRr..', 'kkkkkkkkkk', 'kwbwbwbwbk', 'kkkkkkkkkk', '.k..k...k.', '.k..k...k.', '.k..k...k.', 'kk.kk..kk.'],
    { R: P.red, r: P.wine, k: P.bark, w: P.tan, b: P.wood }];
  ICONS.pote = [['..kkkkkk..', '..kRRRRk..', '...kOOk...', '..kOOOOk..', '.kOYOOOrk.', '.kOYOOOrk.', '.kOOOOOrk.', '..kOOOrk..', '...kkkk...', '..........'],
    { k: P.maroon, R: P.tan, O: P.orange, Y: P.tan, r: P.rust }];
  ICONS.forno = [['..........', '...kkkk...', '..kOOOOk..', '.kOYOOOrk.', 'kOYOOOOOrk', 'kOOkkkkOrk', 'kOkdEEdkrk', 'kOkEyyEkrk', 'kkkkkkkkkk', '..........'],
    { k: P.maroon, O: CLAY[0], Y: P.tan, r: CLAY[1], d: P.ink, E: P.ember, y: P.gold }];
  ICONS.carne = [['..........', '..kkkkk...', '.kRRRRRk..', 'kRWRRRRRk.', 'kRRWRRrRk.', 'kRRRWRRRk.', '.kRRRWRk..', '..kkkkk...', '..........', '..........'],
    { k: P.maroon, R: P.red, r: P.wine, W: P.rose }];
  ICONS.couro = [['..kk..kk..', '.kHHkkHHk.', '.kHHHHHHk.', '..kHhhHk..', '.kHHhhHHk.', 'kHHHhhHHHk', 'kHkHHHHkHk', 'kk.kHHk.kk', '...kHHk...', '....kk....'],
    { k: P.maroon, H: LEATHER[0], h: LEATHER[1] }];
  ICONS.argila = [['..........', '..........', '...kkkk...', '..kAAAAk..', '.kAaAAAAk.', 'kAAAAaAAAk', 'kAaAAAAAak', '.kkkkkkkk.', '..........', '..........'],
    { k: P.maroon, A: CLAY[0], a: CLAY[1] }];
  ICONS.ferramentas = [['......kk..', '..kkkkbk..', '.kLLLkbk..', 'kLlllkbk..', 'kLlmmkbk..', '.kmmkkbk..', '..kk.kbk..', '.....kbk..', '.....kbk..', '......k...'],
    { k: P.ink2, L: P.silver, l: P.mist, m: P.slate, b: P.wood }];
  ICONS.roupas = [['..kk..kk..', '.kHHkkHHk.', 'kHHHHHHHHk', 'kHhHHHHhHk', '.kkHHHHkk.', '..kHhhHk..', '..kHHHHk..', '..kHHhHk..', '..kkkkkk..', '..........'],
    { k: P.maroon, H: LEATHER[0], h: LEATHER[1] }];
  ICONS.defumado = [['..........', '..........', '...kkkk.k.', '..kLLLLkLk', '.kLeLLlkLk', '.kLLlllkk.', '..kllllkLk', '...kkkk.kk', '..........', '..........'],
    { k: P.bark, L: SMOKED[0], l: SMOKED[1], e: P.ink }];
  ICONS.frutaseca = [['..........', '....kkk...', '...kOYOk..', '...kOoOk..', '.kkkkOkkk.', 'kOYOkkkOYk', 'kOoOk.kOok', '.kkkkkkkk.', '..........', '..........'],
    { k: P.bark, O: P.orange, o: P.rust, Y: P.tan }];
  ICONS.revelacao = [['....y.....', '.y..y..y..', '..y...y...', '..kkkkkk..', '.kWWWWWWk.', 'kWWBnnBWWk', '.kWWWWWWk.', '..kkkkkk..', '..y...y...', '.y..y..y..'],
    { y: P.gold, k: P.ink2, W: P.white, B: P.sky, n: P.ink }];
  ICONS.capivara = [['..........', '......kk..', '.kkkkkFFk.', 'kFFFFFFeFk', 'kFFFFFFFnk', 'kfFFFFFFk.', '.kffffkk..', '.kfk.kfk..', '.kk..kk...', '..........'],
    { k: '#2b1d1a', F: CAPI_FUR[0].F, f: CAPI_FUR[0].f, e: P.ink, n: P.maroon }];
  ICONS.limpo = ICONS.verao;
  ICONS.fogueira = ICONS.fogo;
  ICONS.fome = ICONS.frutas;
  ICONS.sede = ICONS.agua;
  ICONS.calor = ICONS.fogo;
  // Etapa 7: materiais, oficinas, caminho e casas
  ICONS.tabuas = [['..........', '..........', 'kkkkkkkkk.', 'kTTTTTTTTk', 'kbbbbbbbbk', '.kkkkkkkkk', 'kTTTTTTTTk', 'kbbbbbbbbk', '.kkkkkkkk.', '..........'],
    { k: PLANK[0], T: P.tan, b: PLANK[2] }];
  ICONS.fibra = [['.y..y..y..', '..y.y.y...', '..yYyYy...', '..YyYyY...', '.kRRRRRk..', '..yYyYy...', '..YyYyY...', '.y.y.Y.y..', 'y..y..y..y', '..........'],
    { y: THATCH[3], Y: THATCH[2], R: P.rust, k: P.maroon }];
  ICONS.mantas = [['..........', '.kkkkkkkk.', 'kRRRRRRRRk', 'kGGGGGGGGk', 'kRRRRRRRRk', 'kWWWWWWWWk', 'kRRRRRRRRk', 'kGGGGGGGGk', '.kkkkkkkk.', '..........'],
    { k: P.maroon, R: P.red, G: P.gold, W: P.parch }];
  ICONS.redes = [['b........b', 'bk......kb', 'b.k....k.b', 'b.RRGGRR.b', 'b..RGGR..b', 'b...RR...b', 'b........b', 'b........b', 'bb......bb', '..........'],
    { b: PLANK[1], k: P.blue, R: P.sky, G: P.parch }];
  ICONS.armazem = [['....yy....', '...yYYy...', '..yYYYYy..', '.yyyyyyyy.', '.kTwTwTwk.', '.kwTkkwTk.', '.kTwkkTwk.', '.kkkkkkkk.', '.k..kk..k.', '..........'],
    { y: THATCH[2], Y: THATCH[3], k: PLANK[0], T: P.tan, w: P.wood }];
  ICONS.marcenaria = [['..........', '.kkkkkkkbb', 'kLLLLLLLbb', 'kLLLLLLkbb', '.kmkmkmk..', '..........', 'kkkkkkkkkk', 'kTTTTTTTTk', 'kbbbbbbbbk', 'kkkkkkkkkk'],
    { k: P.ink2, L: STONE[4], m: STONE[2], b: PLANK[2], T: P.tan }];
  ICONS.tecelagem = [['bbbbbbbbbb', 'b.W.W.W.Wb', 'b.W.W.W.Wb', 'b.W.W.W.Wb', 'bRRRRRRRRb', 'bGGGGGGGGb', 'bRRRRRRRRb', 'bbbbbbbbbb', 'b........b', 'b........b'],
    { b: PLANK[1], W: P.parch, R: P.red, G: P.gold }];
  ICONS.caminho = [['g...dDd..g', '...dDDd...', '..dDsDd.g.', 'g.dDDd....', '..dDDDd...', '...dDsDd..', '.g..dDDd..', '...dDDd.g.', '..dDsDd...', '.dDDd....g'],
    { g: P.green, d: '#7a5234', D: '#b88a5e', s: STONE[3] }];
  ICONS.oca = [['....yy....', '...yYYy...', '..yYYYYy..', '.yYYYYYYy.', '.yYYYYyYy.', 'yYYYkkYYyy', 'yYYkkkkYyy', 'kyykkkkyyk', '..........', '..........'],
    { y: THATCH[1], Y: THATCH[3], k: THATCH[0] }];
  ICONS.palafita = [['...yyyy...', '..yYYYYy..', '.yYYYYYYy.', 'yyyyyyyyyy', '.bTbkkbTb.', '.bTbkkbTb.', 'kkkkkkkkkk', '.b.b..b.b.', '.b.bTTb.b.', '.b.b..b.b.'],
    { y: THATCH[1], Y: THATCH[3], b: PLANK[2], T: P.tan, k: PLANK[0] }];
  ICONS.barro = [['...yyyy...', '..yYYYYy..', '.yYYYYYYy.', 'yyyyyyyyyy', '.cCCCCCCc.', '.cCbbCkkc.', '.cCbbCCCc.', '.cCbbCCCc.', 'kkkkkkkkkk', '..........'],
    { y: THATCH[1], Y: THATCH[3], c: CLAY[1], C: CLAY[0], b: PLANK[2], k: P.maroon }];
  ICONS.casapedra = [['......ss..', '...bbbss..', '..bBBBBbb.', '.bBBBBBBBb', 'kkkkkkkkkk', 'kSsSsSsSsk', 'ksSbbSkksk', 'kSsbbsSSsk', 'kkkkkkkkkk', '..........'],
    { b: PLANK[1], B: PLANK[3], s: STONE[3], S: STONE[2], k: STONE[1] }];
  ICONS.melhorar = [['....kk....', '...kGGk...', '..kGGGGk..', '.kGGGGGGk.', 'kkkGGGGkkk', '...kGGk...', '...kGGk...', '...kGGk...', '...kkkk...', '..........'],
    { k: P.ink2, G: P.gold }];
  // Etapa 8: as invenções
  ICONS.faca = [['........kk', '.......kLk', '......kLlk', '.....kLlk.', '....kLlk..', '...kLlk...', '..kykk....', '.kbbk.....', 'kbbk......', 'kkk.......'],
    { k: P.ink2, L: P.silver, l: P.mist, b: P.wood, y: P.tan }];
  ICONS.corda = [['..........', '...kkkk...', '..kyYyYk..', '.kYkkkkyk.', '.kyk..kYk.', '.kYkkkkyk.', '..kyYyYk..', '...kkkyk..', '......kYk.', '.......kk.'],
    { k: P.bark, y: P.tan, Y: P.gourd }];
  ICONS.flauta = [['........kk', '.......kgk', '......kgGk', '.....kgkk.', '....kgGk..', '...kgkk...', '..kgGk....', '.kgkk.....', 'kgGk......', 'kkk.......'],
    { k: P.bark, g: P.tan, G: P.gourd }];
  ICONS.tambor = [['..........', '.kkkkkkkk.', 'kWWWWWWWWk', 'kkWWWWWWkk', 'kbkbbbbkbk', 'kbbkbbkbbk', 'kbbbkkbbbk', 'kbbkbbkbbk', '.kbbbbbbk.', '..kkkkkk..'],
    { k: P.maroon, W: P.parch, b: P.wood }];
  ICONS.machado = [['.....kk...', '..kkkbk...', '.kLLkbk...', 'kLllyyk...', 'kLlmyyk...', '.kmmkbk...', '..kkkbk...', '....kbk...', '....kbk...', '.....k....'],
    { k: P.ink2, L: P.silver, l: P.mist, m: P.slate, b: P.wood, y: P.tan }];
  ICONS.agulha = [['.......kk.', '......kWk.', '......k.k.', '.....kWk..', '....kWk...', '...kWk..r.', '..kWk..r..', '.kWk..r...', '.kk..r....', '....r.....'],
    { k: P.ink2, W: P.parch, r: P.red }];
  ICONS.arco = [['..kk......', '.kbk....kk', '.kbw...kLk', 'kb.w..kyk.', 'kb.w.kyk..', 'kb.wkyk...', 'kb.wyk....', '.kbwk.....', '.kbk......', '..kk......'],
    { k: P.ink2, b: P.wood, w: P.parch, y: P.tan, L: P.silver }];
  ICONS.redePesca = [['.r..r..r..', 'yky.yky.yk', '.y.y.y.y..', 'y.y.y.y.y.', '.y.y.y.y..', 'y.y.y.y.y.', '.y.y.y.y..', '..y.y.y...', '...y.y....', '....y.....'],
    { y: P.tan, k: P.bark, r: P.red }];
  ICONS.vaso = [['...kkkk...', '...kRRk...', '....kk....', '...kOOk...', '..kOOOOk..', '.kWkWkWkk.', '.kOYOOOrk.', '.kOOOOOrk.', '..kOOOrk..', '...kkkk...'],
    { k: P.maroon, R: P.tan, O: P.orange, Y: P.tan, r: P.rust, W: P.parch }];
  ICONS.invencao = ICONS.faca;
  // vaso no fogo (7 x 6) e o tambor que fica perto da fogueira (7 x 8)
  function vasoFogo() {
    return fromRows(['.kkkkk.', 'kOOOOOk', 'kWkWkWk', 'kOOOOrk', '.kOOrk.', '..kkk..'],
      { k: P.maroon, O: P.orange, W: P.parch, r: P.rust }).canvas();
  }
  function tamborSpr() {
    return fromRows(['.kkkkk.', 'kWWWWWk', 'kkWWWkk', 'kbkbkbk', 'kbbkbbk', 'kbkbkbk', 'kbbbbbk', '.kkkkk.'],
      { k: P.maroon, W: P.parch, b: P.wood }).canvas();
  }
  const iconCache = {};
  A.icon = function (name) {
    if (iconCache[name]) return iconCache[name];
    const def = ICONS[name]; if (!def) return null;
    return (iconCache[name] = fromRows(def[0], def[1]).canvas());
  };
  A.iconURL = function (name) { const c = A.icon(name); return c ? c.toDataURL() : ''; };

  // ---------- construção de todos os sprites ----------
  A.build = function () {
    const S = A.spr = {};
    S.broad = [0, 1, 2, 3].map((s) => [0, 1, 2].map((v) => broadTree(v, s)));
    S.arau = [0, 1, 2, 3].map((s) => [0, 1, 2].map((v) => arauTree(v, s)));
    S.bush = [0, 1, 2, 3].map((s) => [0, 1, 2, 3].map((f) => bush(f, s)));
    S.rock = [0, 1, 2].map((sz) => [false, true].map((sn) => [0, 1].map((v) => rock(sz, v, sn))));
    S.stump = [stump(false), stump(true)];
    S.grave = grave().canvas();
    S.fire = [0, 1, 2].map((f) => fireFrame(f, 1));
    S.fireOut = fireBase(false).canvas();
    // Etapa 7: a fogueira por nível (1 a 3): quadros acesa e apagada
    S.fireLv = [null, 1, 2, 3].map((lv) => (lv ? { lit: [0, 1, 2].map((f) => fireFrame(f, lv)), out: fireBase(false, lv).canvas() } : null));
    S.tent = { barraca: tent1(), barraca2: tent2() };
    // casas: barraca nível 1 e 2, e as casas do nível 3
    S.house = { 1: S.tent.barraca, 2: S.tent.barraca2, oca: oca(), palafita: palafita(), barro: casaBarro(), pedra: casaPedra() };
    S.moquem = moquem(); S.jirau = jirau(); S.forno = forno();
    S.works2 = { moquem: moquem2(), jirau: jirau2(), forno: forno2() };
    S.shop = { armazem: [null, armazem1(), armazem2()], marcenaria: [null, marcenaria1(), marcenaria2()], tecelagem: [null, tecelagem1(), tecelagem2()] };
    S.bench = { h: benchH(), v: benchV() };
    S.mat = mat();
    S.item = {};
    for (const k of ['madeira', 'pedra', 'frutas', 'peixe', 'agua', 'carne', 'couro', 'argila', 'defumado', 'seca']) S.item[k] = item(k);
    for (const k of ['tabuas', 'fibra', 'mantas', 'redes']) S.item[k] = item7(k);
    S.item.caca = S.item.carne;
    // sombra
    const ellipse = (w, h, a) => {
      const [c, x] = mk(w, h);
      x.fillStyle = 'rgba(24,20,37,' + a + ')';
      for (let y = 0; y < h; y++) {
        const t = (y + 0.5) / h * 2 - 1, half = Math.round(w / 2 * Math.sqrt(1 - t * t));
        x.fillRect(w / 2 - half, y, half * 2, 1);
      }
      return c;
    };
    S.shadow = ellipse(10, 4, 0.3);
    S.bigShadow = ellipse(20, 6, 0.26);
    // letra z para o sono
    S.z = fromRows(['kkkk', '..k.', '.k..', 'kkkk'], { k: '#dfe6f0' }).canvas();
    // seta de seleção
    S.chevron = fromRows(['kkkkkkk', 'kgggggk', '.kgggk.', '..kgk..', '...k...'], { k: P.ink, g: P.gold }).canvas();
    // coração do casal
    S.heart = fromRows(['Rr.rr', 'rrrrr', '.rrr.', '..r..'], { r: P.rose, R: '#ffd6e0' }).canvas();
    // Etapa 6: nota de música (festa e cantoria) e araras (duas asas: aberta e fechada)
    S.note = fromRows(['..kk', '..kg', '..k.', 'kkk.', 'kgk.', '.k..'], { k: P.ink, g: P.yellow }).canvas();
    S.note2 = fromRows(['.kkkk', '.kggk', '.k..k', 'kkkkk', 'kgkkg', '.k..k'], { k: P.ink, g: P.gold }).canvas();
    const arara = (body, wing) => [
      fromRows(['r....r', 'rr..rr', '.rbbr.', '..bb..', '..y...'], { r: wing, b: body, y: P.yellow }).canvas(),
      fromRows(['......', '.rbbr.', 'rrbbrr', '..y...', '......'], { r: wing, b: body, y: P.yellow }).canvas(),
    ];
    S.arara = [arara(P.red, P.sky), arara(P.red, P.gold), arara(P.sky, P.yellow)];
    // Etapa 8: vaso no fogo e tambor
    S.vasoFogo = vasoFogo();
    S.tambor = tamborSpr();
    return S;
  };
})(globalThis.G = globalThis.G || {});
