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
  function fireBase(lit) {
    const b = new Buf(16, 16);
    // toras cruzadas
    line(b, 4, 12, 11, 9, P.bark); line(b, 4, 13, 11, 10, P.wood);
    line(b, 4, 9, 11, 12, P.bark); line(b, 4, 10, 11, 13, P.wood);
    if (!lit) {
      for (let x = 5; x <= 10; x++) { b.set(x, 11, P.maroon); if (x % 2) b.set(x, 10, P.slate); }
      b.set(7, 9, P.mist); b.set(8, 9, P.slate);
    }
    // pedras em volta
    const st = [[2, 12], [3, 14], [6, 15], [9, 15], [12, 14], [13, 12], [12, 10], [3, 10]];
    for (const [x, y] of st) { b.set(x, y, P.slate); b.set(x + 1, y, P.mist); b.set(x, y - 1, P.silver); b.set(x + 1, y + 1, P.ink3); }
    return b;
  }
  function fireFrame(f) {
    const b = fireBase(true);
    const hts = [[7, 9, 6], [8, 6, 9], [6, 8, 8]][f];
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
    }
    return null;
  }

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
    const key = p.id + ':' + p.look.skin + p.look.hair + p.look.cloth + p.look.beard + (gray ? 'g' : '');
    let s = sheets.get(key);
    if (s) return s;
    const col = G.Sim.colorsOf(p.look);
    if (gray) col.hair = GRAY;
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
    const key = 'k' + p.id + ':' + p.look.skin + p.look.hair + p.look.cloth;
    let s = sheets.get(key);
    if (s) return s;
    const col = G.Sim.colorsOf(p.look);
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
  ICONS.limpo = ICONS.verao;
  ICONS.fogueira = ICONS.fogo;
  ICONS.fome = ICONS.frutas;
  ICONS.sede = ICONS.agua;
  ICONS.calor = ICONS.fogo;
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
    S.fire = [0, 1, 2].map(fireFrame);
    S.fireOut = fireBase(false).canvas();
    S.tent = { barraca: tent1(), barraca2: tent2() };
    S.mat = mat();
    S.item = {};
    for (const k of ['madeira', 'pedra', 'frutas', 'peixe', 'agua']) S.item[k] = item(k);
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
    return S;
  };
})(globalThis.G = globalThis.G || {});
