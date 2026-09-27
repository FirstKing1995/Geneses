/* Gênesis · renderizador: terreno em blocos, objetos, pessoas, luz da noite e clima. */
(function (G) {
  'use strict';
  const C = G.CFG, A = G.Art, T = G.T, U = G.U;
  const R = G.R = {};
  const TS = C.TILE, CH = C.CHUNK, CPX = TS * CH;
  const IS_WATER = G.IS_WATER;

  let cv, ctx, W = 0, H = 0, dpr = 1, sc = 3, ox = 0, oy = 0;
  const cam = R.cam = { x: 1024, y: 1024, zoom: 3 };
  const chunks = new Map();
  let chunkKey = '';
  let light, lctx;
  const parts = [];
  const drops = [], splashes = [];
  const bolts = [];
  let lastNow = 0;
  R.overlay = { ghost: null, ring: null, selPerson: 0, selBuilding: 0 };

  R.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    [light, lctx] = A.mk(8, 8);
    R.resize();
  };
  R.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = Math.max(1, Math.floor(cv.clientWidth * dpr)); H = Math.max(1, Math.floor(cv.clientHeight * dpr));
    cv.width = W; cv.height = H;
    light.width = Math.max(1, Math.ceil(W / 4)); light.height = Math.max(1, Math.ceil(H / 4));
  };
  function scale() { const s = cam.zoom * dpr; return s >= 1 ? Math.max(1, Math.round(s)) : s; }
  R.scale = () => sc / dpr;
  R.toScreen = function (wx, wy) { return { x: (wx * sc + ox) / dpr, y: (wy * sc + oy) / dpr }; };
  R.toWorld = function (sx, sy) { return { x: (sx * dpr - ox) / sc, y: (sy * dpr - oy) / sc }; };
  R.fitZoom = function (w) { const s = R.sizeCSS(); return Math.min(s.w / (w.W * TS), s.h / (w.H * TS)) * 0.92; };
  R.sizeCSS = () => ({ w: W / dpr, h: H / dpr });

  // ---------- paletas empacotadas ----------
  let PAL = null;
  function pack(hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
  }
  function buildPal() {
    PAL = A.TERRAIN.map((seas) => { const o = []; for (let t = 0; t < 9; t++) o[t] = seas[t].map(pack); return o; });
    PAL.foam = [pack('#c8f4ff'), pack('#c8f4ff'), pack('#dff4ff'), pack('#eef6fb')];
    PAL.wet = [pack('#b0845a'), pack('#b4885c'), pack('#a8805a'), pack('#a8a2a0')];
    PAL.detail = A.DETAIL.map((d) => ({ tuft: pack(d.tuft), flowers: d.flowers.map(pack) }));
    PAL.pebble = [pack('#8b9bb4'), pack('#5a6988'), pack('#c0cbdc')];
    PAL.snowSpark = pack('#ffffff');
  }

  // ruído de valor suave numa grade de 2^sh px
  function vnoise(wx, wy, sh, seed) {
    const gx = wx >> sh, gy = wy >> sh, s = 1 << sh;
    let fx = (wx - (gx << sh)) / s, fy = (wy - (gy << sh)) / s;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = G.hash2(gx, gy, seed), b = G.hash2(gx + 1, gy, seed), c = G.hash2(gx, gy + 1, seed), d = G.hash2(gx + 1, gy + 1, seed);
    const top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  }
  // relevo: diferença de altura na diagonal, por tile (interpolada por pixel = sombra suave)
  let shadeW = null, shadeF = null;
  function shadeField(w) {
    if (shadeW === w) return shadeF;
    const f = new Float32Array(w.W * w.H), e = w.elev;
    for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) {
      const x0 = Math.max(0, x - 1), y0 = Math.max(0, y - 1), x1 = Math.min(w.W - 1, x + 1), y1 = Math.min(w.H - 1, y + 1);
      f[y * w.W + x] = e[y0 * w.W + x0] - e[y1 * w.W + x1];
    }
    shadeW = w; shadeF = f;
    return f;
  }
  function bil(f, a, b, c, d, tx, ty) {
    const top = f[a] + (f[b] - f[a]) * tx, bot = f[c] + (f[d] - f[c]) * tx;
    return top + (bot - top) * ty;
  }

  function renderChunk(w, cx, cy, season) {
    if (!PAL) buildPal();
    const [c, x] = A.mk(CPX, CPX);
    const img = x.createImageData(CPX, CPX);
    const buf = new Uint32Array(img.data.buffer);
    const pal = PAL[season], seed = w.seed, Wt = w.W, Ht = w.H;
    const MG = 2, M = CPX + MG * 2;
    const types = new Uint8Array(M * M), E = new Float32Array(M * M), SH = new Float32Array(M * M);
    const shade = shadeField(w);
    const ox0 = cx * CPX - MG, oy0 = cy * CPX - MG;
    for (let j = 0; j < M; j++) {
      const wy = oy0 + j, fy = wy / TS - 0.5;
      let y0 = Math.floor(fy); const ty = fy - y0; let y1 = y0 + 1;
      y0 = y0 < 0 ? 0 : y0 >= Ht ? Ht - 1 : y0; y1 = y1 < 0 ? 0 : y1 >= Ht ? Ht - 1 : y1;
      for (let i = 0; i < M; i++) {
        const wx = ox0 + i, fx = wx / TS - 0.5;
        let x0 = Math.floor(fx); const tx = fx - x0; let x1 = x0 + 1;
        x0 = x0 < 0 ? 0 : x0 >= Wt ? Wt - 1 : x0; x1 = x1 < 0 ? 0 : x1 >= Wt ? Wt - 1 : x1;
        const a = y0 * Wt + x0, b = y0 * Wt + x1, cc = y1 * Wt + x0, d = y1 * Wt + x1;
        const e = bil(w.elev, a, b, cc, d, tx, ty), m = bil(w.moist, a, b, cc, d, tx, ty), r = bil(w.riv, a, b, cc, d, tx, ty);
        const jit = (vnoise(wx, wy, 3, seed + 5) - 0.5) * 0.016 + (G.hash2(wx, wy, seed + 6) - 0.5) * 0.0015;
        const k = j * M + i;
        types[k] = G.W.classify(e + jit, m, r + jit * 0.4);
        E[k] = e;
        SH[k] = bil(shade, a, b, cc, d, tx, ty);
      }
    }
    const foam = PAL.foam[season], wet = PAL.wet[season];
    for (let j = MG; j < M - MG; j++) {
      for (let i = MG; i < M - MG; i++) {
        const k = j * M + i, t = types[k], wx = ox0 + i, wy = oy0 + j;
        const tones = pal[t];
        const h = G.hash2(wx, wy, seed + 9);
        let col;
        if (IS_WATER[t]) {
          const n1 = !IS_WATER[types[k - 1]] || !IS_WATER[types[k + 1]] || !IS_WATER[types[k - M]] || !IS_WATER[types[k + M]];
          if (n1) col = foam;
          else {
            const n2 = !IS_WATER[types[k - 2]] || !IS_WATER[types[k + 2]] || !IS_WATER[types[k - 2 * M]] || !IS_WATER[types[k + 2 * M]];
            if (t === T.DEEP) {
              const e = E[k];
              let tone = e < 0.2 ? 0 : e < 0.27 ? 1 : 2;
              if (h < 0.12 && tone > 0) tone--;
              col = n2 ? tones[2] : tones[tone];
            } else col = n2 ? tones[2] : (h < 0.05 ? tones[2] : tones[1]);
          }
        } else {
          let tone = 1;
          const hb = vnoise(wx, wy, 4, seed + 21);
          if (hb < 0.3) tone = hb < 0.24 || h < 0.35 ? 0 : 1;
          else if (hb > 0.74) tone = hb > 0.8 || h < 0.35 ? 2 : 1;
          if (h < 0.05) tone = 0; else if (h > 0.965) tone = 2;
          const dE = SH[k] + (h - 0.5) * 0.012;
          const th = (t === T.HILL || t === T.MOUNTAIN) ? 0.018 : 0.042;
          if (dE > th) tone = Math.min(2, tone + 1); else if (dE < -th) tone = Math.max(0, tone - 1);
          col = tones[tone];
          const nearW = IS_WATER[types[k - 1]] || IS_WATER[types[k + 1]] || IS_WATER[types[k - M]] || IS_WATER[types[k + M]];
          if (nearW) col = wet;
        }
        buf[(j - MG) * CPX + (i - MG)] = col;
      }
    }
    // detalhes: tufos, flores, pedrinhas
    const det = PAL.detail[season];
    const at = (px, py) => types[(py + MG) * M + px + MG];
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const gx = cx * CH + tx, gy = cy * CH + ty;
      if (gx >= Wt || gy >= Ht) continue;
      const t = w.tile[gy * Wt + gx];
      if (IS_WATER[t]) continue;
      for (let n = 0; n < 3; n++) {
        const hx = G.hash2(gx * 3 + n, gy, seed + 31), hy = G.hash2(gx, gy * 3 + n, seed + 37), hk = G.hash2(gx + n, gy - n, seed + 41);
        const px = tx * TS + 1 + Math.floor(hx * 13), py = ty * TS + 2 + Math.floor(hy * 13);
        if (at(px, py) !== t) continue;
        const o = py * CPX + px;
        if (t === T.SAND || t === T.MOUNTAIN) {
          if (hk < 0.45) { buf[o] = PAL.pebble[1]; if (px + 1 < CPX) buf[o + 1] = PAL.pebble[0]; if (py > 0) buf[o - CPX] = PAL.pebble[2]; }
        } else if (season === 3) {
          if (hk < 0.3) buf[o] = PAL.snowSpark;
          else if (hk < 0.5 && px > 0 && px + 1 < CPX && py > 0) { buf[o] = det.tuft; buf[o - CPX - 1] = det.tuft; }
        } else if (hk < 0.62) {
          if (px > 0 && px + 1 < CPX && py > 0) { buf[o] = det.tuft; buf[o - CPX - 1] = det.tuft; buf[o - CPX + 1] = det.tuft; }
        } else if (det.flowers.length && hk < 0.62 + (season === 0 ? 0.3 : 0.12) && t !== T.FOREST) {
          const f = det.flowers[Math.floor(G.hash2(gx, gy, seed + n + 51) * det.flowers.length)];
          buf[o] = f;
          if (px > 0 && px + 1 < CPX && py > 0 && py + 1 < CPX && season === 0) { buf[o - 1] = f; buf[o + 1] = f; buf[o - CPX] = f; buf[o + CPX] = det.tuft; }
        }
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  function chunk(w, cx, cy, season) {
    const key = cx + ',' + cy;
    let c = chunks.get(key);
    if (!c) { c = renderChunk(w, cx, cy, season); chunks.set(key, c); }
    return c;
  }
  R.invalidate = function () { chunks.clear(); chunkKey = ''; };

  // ---------- partículas ----------
  function spawn(p) { if (parts.length < 400) parts.push(p); }
  R.event = function (e) {
    if (e.k === 'bolt') {
      bolts.push({ x: e.x, y: e.y, t0: performance.now(), seed: Math.random() * 1000 });
      for (let i = 0; i < 18; i++) spawn({ x: e.x * TS + 8, y: e.y * TS + 10, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, g: 90, life: 0.7, col: Math.random() < 0.5 ? '#fee761' : '#ffffff' });
      return;
    }
    if (e.k === 'heart') {
      for (let i = 0; i < 3; i++) spawn({ x: e.x * TS + 6 + (Math.random() - 0.5) * 10, y: e.y * TS - 2 - i * 5, vx: (Math.random() - 0.5) * 4, vy: -6 - Math.random() * 4, g: 0, life: 2.4 + i * 0.3, spr: 'heart' });
      return;
    }
    if (e.k === 'miracle') {
      const col = e.kind === 'chuva' ? '#9fe8ff' : e.kind === 'cura' ? '#9be070' : '#fee761';
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 3 * TS;
        spawn({ x: e.x * TS + 8 + Math.cos(a) * r, y: e.y * TS + 8 + Math.sin(a) * r, vx: 0, vy: -10 - Math.random() * 18, g: 0, life: 1.4 + Math.random(), col });
      }
      return;
    }
    if (e.k === 'fell') {
      for (let i = 0; i < 10; i++) spawn({ x: e.x * TS + 8 + (Math.random() - 0.5) * 10, y: e.y * TS + 2, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, g: 40, life: 1.2, col: Math.random() < 0.6 ? '#3e8948' : '#733e39' });
    } else if (e.k === 'splash') {
      for (let i = 0; i < 6; i++) spawn({ x: e.x * TS + 8, y: e.y * TS + 8, vx: (Math.random() - 0.5) * 24, vy: -14 - Math.random() * 10, g: 50, life: 0.6, col: '#c8f4ff' });
    } else if (e.k === 'bite') {
      // mordida: respingo vermelho e um risco branco
      for (let i = 0; i < 10; i++) spawn({ x: e.x * TS + (Math.random() - 0.5) * 6, y: e.y * TS - 4 + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 30, vy: -12 - Math.random() * 16, g: 60, life: 0.7, col: Math.random() < 0.7 ? '#e43b44' : '#ffffff' });
    }
  };
  function updateParts(dt, S, now) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if (!S) return;
    for (const b of S.buildings) {
      if (b.type !== 'fogueira' || !b.built || b.fuel <= 0) continue;
      if (Math.random() < dt * 5) spawn({ x: b.x * TS + 8 + (Math.random() - 0.5) * 3, y: b.y * TS + 4, vx: (Math.random() - 0.5) * 3, vy: -8 - Math.random() * 4, g: 0, life: 2.2, col: 'smoke' });
      if (Math.random() < dt * 2.5) spawn({ x: b.x * TS + 8, y: b.y * TS + 6, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 10, g: 0, life: 0.7, col: '#feae34' });
    }
  }

  // ---------- helpers de desenho ----------
  function blit(img, wx, wy, alpha) {
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(wx * sc + ox), Math.round(wy * sc + oy), Math.round(img.width * sc), Math.round(img.height * sc));
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }
  function rect(wx, wy, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(wx * sc + ox), Math.round(wy * sc + oy), Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
  }

  function darkness(h) {
    if (h >= 7 && h < 17.5) return 0;
    if (h >= 17.5 && h < 19.5) return (h - 17.5) / 2 * 0.64;
    if (h >= 4.5 && h < 7) return 0.64 * (1 - (h - 4.5) / 2.5);
    return h >= 23 || h < 3 ? 0.7 : 0.64;
  }
  R.darkness = darkness;

  // ---------- quadro ----------
  R.draw = function (S, alpha, now, world) {
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    const w = S ? S.world : world;
    if (!w) return;
    sc = scale();
    const season = S ? S.ck.season : 0;
    const key = w.seed + ':' + season;
    if (key !== chunkKey) { chunks.clear(); chunkKey = key; }
    ox = Math.round(W / 2 - cam.x * sc); oy = Math.round(H / 2 - cam.y * sc);
    ctx.imageSmoothingEnabled = sc < 1;
    ctx.fillStyle = '#0c3a68';
    ctx.fillRect(0, 0, W, H);
    // área visível em px do mundo
    const vx0 = -ox / sc, vy0 = -oy / sc, vx1 = (W - ox) / sc, vy1 = (H - oy) / sc;
    const cx0 = Math.max(0, Math.floor(vx0 / CPX)), cy0 = Math.max(0, Math.floor(vy0 / CPX));
    const cx1 = Math.min(Math.ceil(w.W / CH) - 1, Math.floor(vx1 / CPX)), cy1 = Math.min(Math.ceil(w.H / CH) - 1, Math.floor(vy1 / CPX));
    let budget = 3;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = cx + ',' + cy;
      if (!chunks.has(k)) { if (budget-- <= 0) continue; }
      const c = chunk(w, cx, cy, season);
      ctx.drawImage(c, Math.round(cx * CPX * sc + ox), Math.round(cy * CPX * sc + oy), Math.ceil(CPX * sc), Math.ceil(CPX * sc));
    }
    const tx0 = Math.max(0, Math.floor(vx0 / TS) - 2), ty0 = Math.max(0, Math.floor(vy0 / TS) - 2);
    const tx1 = Math.min(w.W - 1, Math.ceil(vx1 / TS) + 2), ty1 = Math.min(w.H - 1, Math.ceil(vy1 / TS) + 3);
    // brilho na água
    if (sc >= 1.5) {
      const tt = now / 1000;
      const spark = season === 3 ? '#eef6fb' : '#bff3ff';
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const t = w.tile[ty * w.W + tx];
        if (!IS_WATER[t]) continue;
        const h = G.hash2(tx, ty, 99);
        const ph = (tt * (0.25 + h * 0.35) + h * 10) % 1;
        if (ph < 0.22) {
          const px = tx * TS + 3 + Math.floor(G.hash2(tx, ty, 7) * 9), py = ty * TS + 3 + Math.floor(G.hash2(ty, tx, 7) * 9);
          rect(px, py, ph < 0.11 ? 2 : 3, 1, spark);
        }
      }
    }
    // tapete do estoque e auras de Calor
    if (S) drawCamp(S);
    if (S && S.god) drawAuras(S, now);
    // lista ordenada por y
    const list = [];
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const oi = w.objGrid[ty * w.W + tx];
      if (oi < 0) continue;
      const o = w.objs[oi];
      if (o.k === 'gone') continue;
      list.push({ y: ty * TS + 14, o });
    }
    if (S) {
      for (const b of S.buildings) {
        if (b.x + b.w < tx0 || b.x > tx1 || b.y + b.h < ty0 || b.y > ty1) continue;
        list.push({ y: (b.y + b.h) * TS - 1, b });
      }
      for (const p of S.people) {
        if (!p.alive || p.inTent || p.carriedBy) continue;
        const x = U.lerp(p.px, p.x, alpha), y = U.lerp(p.py, p.y, alpha);
        list.push({ y: y * TS + 4, p, x, y });
      }
      // lobos e viajantes: só onde o povo já viu (na névoa, só os uivos)
      if (S.narr) for (const e of S.narr.ents) {
        if (e.gone || !G.Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
        const x = U.lerp(e.px, e.x, alpha), y = U.lerp(e.py, e.y, alpha);
        if (x < tx0 - 1 || x > tx1 + 1 || y < ty0 - 1 || y > ty1 + 1) continue;
        list.push({ y: y * TS + 4, e, x, y });
      }
    }
    list.sort((a, b) => a.y - b.y);
    const snow = season === 3;
    for (const it of list) {
      if (it.o) drawObj(it.o, season, snow, sc < 1);
      else if (it.b) drawBuilding(S, it.b, now);
      else if (it.e) drawEnt(S, it.e, it.x, it.y, now);
      else drawPerson(S, it.p, it.x, it.y, now);
    }
    // partículas
    updateParts(dt, S, now);
    for (const p of parts) {
      if (p.spr) blit(A.spr[p.spr], p.x - 2, p.y - 2, Math.min(1, p.life / 1.2));
      else if (p.col === 'smoke') { const a = Math.min(1, p.life / 2.2); rect(p.x, p.y, 2, 2, 'rgba(192,203,220,' + (a * 0.5).toFixed(2) + ')'); }
      else rect(p.x, p.y, 1, 1, p.col);
    }
    // névoa sobre o que o povo ainda não viu
    if (S && S.seen) drawFog(S);
    // sobreposições do jogador
    const ov = R.overlay;
    if (ov.ghost) drawGhost(S, ov.ghost);
    if (ov.cast) drawCast(ov.cast, now);
    if (S && ov.selPerson) {
      const p = S.people.find((q) => q.id === ov.selPerson);
      if (p && p.alive) {
        const x = p.inTent ? p.x : U.lerp(p.px, p.x, alpha), y = p.inTent ? p.y - 1.4 : U.lerp(p.py, p.y, alpha);
        const bob = Math.round(Math.sin(now / 220) * 1.5), kid = G.Family.stage(S, p) === 'crianca';
        blit(A.spr.chevron, x * TS - 3.5, y * TS - (kid ? 15 : 19) + bob);
      }
    }
    if (S && ov.selBuilding) {
      const b = S.buildings.find((q) => q.id === ov.selBuilding);
      if (b) outline(b.x * TS, b.y * TS, b.w * TS, b.h * TS, '#feae34');
    }
    // noite
    if (S) {
      drawLight(S, now);
      if (S.narr && S.narr.ents.length) drawEyes(S, alpha);
      drawWeather(S, dt);
    }
    if (ov.ring) drawRing(ov.ring);
    if (ov.beam) drawBeam(ov, now);
    if (bolts.length) drawBolts(now);
  };

  // ---------- névoa ----------
  // um pixel por tile, em degraus (borda mais clara), desenhado sem suavizar para ficar no estilo pixel
  let fogCv = null, fogCtx = null, fogRev = -1, fogWorld = null;
  function drawFog(S) {
    const w = S.world, seen = S.seen, Wt = w.W, Ht = w.H;
    if (!fogCv || fogWorld !== w) { [fogCv, fogCtx] = A.mk(Wt, Ht); fogWorld = w; fogRev = -1; }
    if (fogRev !== S.seenRev) {
      fogRev = S.seenRev;
      const img = fogCtx.createImageData(Wt, Ht), d = img.data;
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wt; x++) {
        const i = y * Wt + x, o = i * 4;
        d[o] = 24; d[o + 1] = 20; d[o + 2] = 37;
        if (seen[i]) { d[o + 3] = 0; continue; }
        let near = 3;
        for (let dy = -2; dy <= 2 && near > 1; dy++) for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= Wt || ny >= Ht || !seen[ny * Wt + nx]) continue;
          const c = Math.max(Math.abs(dx), Math.abs(dy));
          if (c < near) near = c;
        }
        d[o + 3] = near === 1 ? 150 : near === 2 ? 200 : 232;
      }
      fogCtx.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fogCv, ox, oy, Wt * TS * sc, Ht * TS * sc);
    ctx.restore();
  }

  function drawAuras(S, now) {
    for (const a of S.god.auras) {
      const cx = (a.x + 0.5) * TS * sc + ox, cy = (a.y + 0.5) * TS * sc + oy, r = a.r * TS * sc;
      const left = (a.until - S.t) / (C.CALOR_HOURS * 60);
      const pulse = 0.5 + 0.5 * Math.sin(now / 600);
      ctx.save();
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, 'rgba(254,174,52,' + (0.16 + 0.06 * pulse) * Math.min(1, left * 3) + ')');
      g.addColorStop(1, 'rgba(254,174,52,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (Math.random() < 0.25) spawn({ x: (a.x + 0.5) * TS + (Math.random() - 0.5) * a.r * TS * 1.4, y: (a.y + 0.5) * TS + (Math.random() - 0.5) * a.r * TS * 1.4, vx: 0, vy: -12, g: 0, life: 1.1, col: '#feae34' });
    }
  }

  function drawCast(c, now) {
    const cx = (c.x + 0.5) * TS * sc + ox, cy = (c.y + 0.5) * TS * sc + oy;
    const col = c.kind === 'chuva' ? '#2ce8f5' : c.kind === 'raio' ? '#ffffff' : c.kind === 'cura' ? '#63c74d' : '#feae34';
    ctx.save();
    ctx.lineWidth = Math.max(2, dpr * 2);
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.lineDashOffset = -now / 40;
    ctx.strokeStyle = c.ok ? col : '#e43b44';
    const r = Math.max(0.6, c.r) * TS * sc;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.12; ctx.fillStyle = c.ok ? col : '#e43b44'; ctx.fill();
    ctx.globalAlpha = 1;
    const s = Math.max(3, TS * sc * 0.35);
    ctx.fillStyle = c.ok ? col : '#e43b44';
    ctx.fillRect(cx - s / 2, cy - 1, s, 2); ctx.fillRect(cx - 1, cy - s / 2, 2, s);
    ctx.restore();
  }

  function drawBolts(now) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], t = (now - b.t0) / 1000;
      if (t > 0.5) { bolts.splice(i, 1); continue; }
      const tx = (b.x + 0.5) * TS * sc + ox, ty = (b.y + 0.6) * TS * sc + oy;
      if (t < 0.12) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - t / 0.12)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      const a = 1 - t / 0.5;
      const step = Math.max(6, TS * sc * 0.9);
      const pts = [];
      let x = tx + Math.sin(b.seed) * TS * sc * 3, y = -10;
      while (y < ty) {
        pts.push([x, y]);
        y += step;
        x += (Math.sin(b.seed + y * 0.37) + Math.sin(b.seed * 1.7 + y * 0.11)) * step * 0.45;
        x += (tx - x) * Math.min(1, y / ty) * 0.35;
      }
      pts.push([tx, ty]);
      ctx.save();
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = 'rgba(254,231,97,' + (0.55 * a).toFixed(3) + ')'; ctx.lineWidth = Math.max(4, sc * 2.4);
      ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = Math.max(2, sc);
      ctx.stroke();
      ctx.restore();
    }
  }

  // coluna de luz: o momento em que o casal chega
  function drawBeam(ov, now) {
    const b = ov.beam, t = (now - b.t0) / 1000;
    if (t > 6) { ov.beam = null; return; }
    const a = t < 0.7 ? t / 0.7 : t > 4 ? Math.max(0, (6 - t) / 2) : 1;
    const cx = Math.round(b.x * TS * sc + ox), by = Math.round(b.y * TS * sc + oy);
    const wd = Math.round(TS * 2.4 * sc), step = Math.max(2, Math.round(sc * 2));
    ctx.save();
    for (let y = 0; y < by; y += step) {
      const f = y / by;
      ctx.fillStyle = 'rgba(254,231,97,' + (0.5 * a * f * f).toFixed(3) + ')';
      ctx.fillRect(cx - wd / 2, y, wd, step);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 * a * f).toFixed(3) + ')';
      ctx.fillRect(cx - wd / 8, y, wd / 4, step);
    }
    const g = ctx.createRadialGradient(cx, by, 0, cx, by, wd * 1.6);
    g.addColorStop(0, 'rgba(254,231,97,' + (0.6 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(254,231,97,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - wd * 1.6, by - wd * 1.6, wd * 3.2, wd * 3.2);
    const px = Math.max(2, Math.round(sc));
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.6 + i / 14) % 1;
      const sx = cx + Math.sin(i * 12.9 + t * 2) * wd * 0.7, sy = by - ph * wd * 3;
      ctx.fillStyle = 'rgba(255,244,184,' + ((1 - ph) * a).toFixed(3) + ')';
      ctx.fillRect(Math.round(sx), Math.round(sy), px, px);
    }
    ctx.restore();
  }

  function outline(x, y, w, h, col) {
    const t = Math.max(1, Math.round(sc / 3));
    ctx.fillStyle = col;
    const X = Math.round(x * sc + ox), Y = Math.round(y * sc + oy), Wd = Math.round(w * sc), Hd = Math.round(h * sc);
    const seg = Math.max(2, Math.round(sc * 2));
    for (let i = 0; i < Wd; i += seg * 2) { ctx.fillRect(X + i, Y, Math.min(seg, Wd - i), t); ctx.fillRect(X + i, Y + Hd - t, Math.min(seg, Wd - i), t); }
    for (let i = 0; i < Hd; i += seg * 2) { ctx.fillRect(X, Y + i, t, Math.min(seg, Hd - i)); ctx.fillRect(X + Wd - t, Y + i, t, Math.min(seg, Hd - i)); }
  }

  function drawObj(o, season, snow, tiny) {
    const bx = o.x * TS, by = o.y * TS;
    const S = A.spr;
    switch (o.k) {
      case 'tree': {
        const arau = o.sp === 'arau';
        if (!tiny) blit(S.bigShadow, bx - 3, by + 11);
        if (arau) blit(S.arau[season][o.v], bx - 3, by + 13 - 30);
        else blit(S.broad[season][o.v], bx - 3, by + 13 - 23);
        break;
      }
      case 'stump': blit(S.stump[snow ? 1 : 0], bx + 3, by + 7); break;
      case 'bush': blit(S.bush[season][Math.min(3, o.fruit)], bx + 1, by + 4); break;
      case 'rock': {
        const sz = o.big ? (o.ch >= 3 ? 2 : 1) : 0;
        const img = S.rock[sz][snow ? 1 : 0][o.v % 2];
        blit(img, bx + 8 - img.width / 2, by + 14 - img.height);
        break;
      }
      case 'grave': blit(S.grave, bx + 3, by + 3); break;
    }
  }

  function drawCamp(S) {
    const x = S.camp.x * TS, y = S.camp.y * TS;
    blit(A.spr.mat, x, y);
    const st = S.stock, it = A.spr.item;
    const pile = (img, n, x0, y0, cols, dx, dy, max) => {
      const k = Math.min(max, n);
      for (let i = 0; i < k; i++) {
        const cx = i % cols, cy = Math.floor(i / cols);
        blit(img, x0 + cx * dx + (cy % 2) * 2, y0 - cy * dy);
      }
    };
    pile(it.madeira, Math.ceil(st.madeira / 5), x + 4, y + 11, 2, 8, 3, 8);
    pile(it.pedra, Math.ceil(st.pedra / 4), x + 20, y + 11, 2, 6, 3, 6);
    pile(it.frutas, Math.ceil(st.frutas / 8), x + 4, y + 24, 2, 8, 3, 6);
    pile(it.peixe, Math.ceil(st.peixe / 4), x + 19, y + 24, 2, 6, 2, 6);
    pile(it.agua, Math.ceil(st.agua / 6), x + 13, y + 26, 3, 4, 0, 5);
  }

  function drawBuilding(S, b, now) {
    const S2 = A.spr, bx = b.x * TS, by = b.y * TS;
    const ghost = !b.built;
    if (b.type === 'fogueira') {
      const lit = b.built && b.fuel > 0;
      const img = lit ? S2.fire[Math.floor(now / 140) % 3] : S2.fireOut;
      blit(img, bx, by - 2, ghost ? 0.45 : undefined);
    } else {
      const img = S2.tent[b.type];
      blit(S2.bigShadow, bx + 5, by + 26, ghost ? 0.4 : undefined);
      blit(img, bx, by + 1, ghost ? 0.45 : undefined);
      // parto dentro da barraca: um sinal acima dela
      const labor = S.people.find((p) => p.alive && p.inTent === b.id && p.labor);
      if (labor && !ghost) {
        const bob = Math.round(Math.sin(now / 250) * 1);
        const icon = A.icon(labor.labor.hard && !labor.labor.helped ? 'reza' : 'bebe');
        blit(icon, bx + 16 - icon.width / 2, by - 12 + bob);
      }
      // zzz de quem dorme dentro
      const sleepers = S.people.filter((p) => p.alive && p.inTent === b.id && p.sleeping && !p.carriedBy).length;
      if (sleepers && !ghost) {
        const t = (now / 1000) % 2;
        for (let i = 0; i < 2; i++) {
          const ph = (t + i) % 2;
          blit(S2.z, bx + 22 + ph * 3, by - 2 - ph * 6, Math.max(0, 1 - ph / 2));
        }
      }
    }
    const job = G.Sim.jobOf(b);
    if (job) {
      outline(bx, by, b.w * TS, b.h * TS, '#feae34');
      const need = job.cost.madeira + (job.cost.pedra || 0);
      const have = job.have.madeira + job.have.pedra;
      const f = job.progress > 0 ? job.progress : have / need * 0.999;
      rect(bx + 1, by - 5, b.w * TS - 2, 3, '#181425');
      rect(bx + 2, by - 4, (b.w * TS - 4) * U.clamp(f, 0, 1), 1, job.progress > 0 ? '#63c74d' : '#feae34');
    }
    if (b.type === 'fogueira' && b.built) {
      rect(bx + 2, by + 15, 12, 2, '#181425');
      rect(bx + 3, by + 15.5, 10 * b.fuel / C.FIRE_CAP, 1, b.fuel > C.FIRE_REFUEL_AT ? '#feae34' : '#e43b44');
    }
  }

  const TOOL = { madeira: 'axe', pedra: 'pick', construir: 'hammer', pesca: 'rod' };
  function drawPerson(S, p, x, y, now) {
    const st = G.Family.stage(S, p), kid = st === 'crianca';
    const sheet = kid ? A.kidSheet(p) : A.personSheet(p, st === 'idoso');
    const fw = kid ? A.KID_W : 8, fh = kid ? A.KID_H : 14;
    const wx = x * TS, wy = y * TS;
    blit(A.spr.shadow, wx - 6, wy + 2);
    const a = p.act;
    const babies = S.people.filter((b) => b.alive && b.carriedBy === p.id);
    if (p.sleeping) {
      blit(sheet.sleep, wx - (kid ? 5 : 7), wy - (kid ? 3 : 5));
      babies.forEach((b, i) => blit(A.bundle(b.look.skin), wx + 3 + i * 4, wy - 3));
      const t = (now / 1000) % 2;
      blit(A.spr.z, wx + 4 + t * 2, wy - 12 - t * 5, Math.max(0, 1 - t / 2));
      return;
    }
    const moving = p.path && p.pathI < p.path.length;
    let frame = 0;
    if (moving) frame = 1 + (Math.floor(p.walk * 5) % 2);
    const work = a && (a.stage === 'work' || a.stage === 'build');
    const swing = work ? Math.floor(now / 260) % 2 : 0;
    const dy = work && swing ? 1 : 0;
    const img = sheet.sheet;
    const sx = frame * fw, sy = p.dir * fh, top = kid ? wy - 7 : wy - 10;
    ctx.drawImage(img, sx, sy, fw, fh, Math.round((wx - fw / 2) * sc + ox), Math.round((top + dy) * sc + oy), Math.round(fw * sc), Math.round(fh * sc));
    // barriga de grávida, depois dos primeiros dias
    if (p.preg && S.t - p.preg.t0 > 15 * C.DAY_MIN) {
      const col = G.Sim.colorsOf(p.look).cloth, by = top + 7 + dy;
      if (p.dir === 2) rect(wx + 3, by, 1, 2, col); else if (p.dir === 3) rect(wx - 4, by, 1, 2, col);
      else { rect(wx - 4, by + 1, 1, 1, col); rect(wx + 3, by + 1, 1, 1, col); }
    }
    // bebê no colo, na altura do peito
    babies.forEach((b, i) => {
      const bw = A.bundle(b.look.skin);
      const bx0 = p.dir === 2 ? wx + 1 : p.dir === 3 ? wx - 6 : wx - 2 - i * 3;
      if (p.dir !== 1) blit(bw, bx0 + (p.dir >= 2 ? 0 : i * 5), top + 6 + dy);
    });
    if (work) drawTool(p, a, wx, wy, swing);
    if (p.prayer) {
      const icon = A.icon('reza'), bob = Math.round(Math.sin(now / 250) * 1);
      blit(icon, wx - icon.width / 2, top - 8 - (p.carry ? 6 : 0) + bob);
    }
    if (p.carry && !work) {
      const k = p.carry.k === 'obra' ? (p.carry.madeira ? 'madeira' : 'pedra') : p.carry.k;
      const it = A.spr.item[k];
      if (it) blit(it, wx - it.width / 2, top - it.height);
    }
  }
  // lobos e viajantes (gente de fora ainda não entra no povo: desenha com a folha de uma pessoa qualquer)
  const fakes = new Map();
  function drawEnt(S, e, x, y, now) {
    const wx = x * TS, wy = y * TS;
    const moving = !!e.path;
    if (e.k === 'lobo') {
      const sh = A.wolfSheet(e.fur || 0), fw = A.WOLF_W, fh = A.WOLF_H;
      const frame = moving ? 1 + (Math.floor(e.walk * 4) % 2) : 0;
      blit(A.spr.shadow, wx - 5, wy + 2);
      // indo embora: some aos poucos
      const al = e.state === 'embora' ? Math.max(0.35, 1 - (e.t - (e.leftAt || e.t)) / 120) : 1;
      if (al < 1) ctx.globalAlpha = al;
      ctx.drawImage(sh, frame * fw, e.dir * fh, fw, fh, Math.round((wx - fw / 2) * sc + ox), Math.round((wy - 6) * sc + oy), Math.round(fw * sc), Math.round(fh * sc));
      if (al < 1) ctx.globalAlpha = 1;
      return;
    }
    let f = fakes.get(e.id);
    if (!f) { f = { id: 'v' + e.id, sex: e.pd.sex, look: e.pd.look }; fakes.set(e.id, f); }
    const sheet = A.personSheet(f);
    const frame = moving ? 1 + (Math.floor(e.walk * 5) % 2) : 0, top = wy - 10;
    blit(A.spr.shadow, wx - 6, wy + 2);
    ctx.drawImage(sheet.sheet, frame * 8, e.dir * 14, 8, 14, Math.round((wx - 4) * sc + ox), Math.round(top * sc + oy), Math.round(8 * sc), Math.round(14 * sc));
    // trouxa nas costas
    const bx = e.dir === 2 ? wx - 6 : e.dir === 3 ? wx + 2 : wx - 2;
    if (e.dir !== 0) rect(bx, top + 6, 4, 4, '#8a6440');
    // esperando resposta: um balão com interrogação
    const g = S.narr.groups[e.gid];
    if (g && g.state === 'esperando') {
      const icon = A.icon('pergunta'), bob = Math.round(Math.sin(now / 260 + e.id) * 1);
      blit(icon, wx - icon.width / 2, top - 11 + bob);
    }
  }
  // olhos de lobo brilhando no escuro
  function drawEyes(S, alpha) {
    const dark = Math.max(darkness(S.ck.hour), S.precip ? 0.2 : 0);
    if (dark < 0.3) return;
    const col = 'rgba(254,231,97,' + Math.min(1, dark * 1.4).toFixed(2) + ')';
    for (const e of S.narr.ents) {
      if (e.k !== 'lobo' || e.gone || !G.Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
      const x = U.lerp(e.px, e.x, alpha) * TS - A.WOLF_W / 2, y = U.lerp(e.py, e.y, alpha) * TS - 6;
      const moving = !!e.path, frame = moving ? 1 + (Math.floor(e.walk * 4) % 2) : 0;
      const bob = e.dir < 2 && frame === 1 ? 1 : 0;
      for (const [ex, ey] of A.WOLF_EYES[e.dir]) rect(x + ex, y + ey + bob, 1, 1, col);
    }
  }
  function drawTool(p, a, wx, wy, swing) {
    const kind = a.type === 'construir' ? 'hammer' : TOOL[a.type];
    const d = p.dir, fx = d === 3 ? -1 : 1;
    const hx = d >= 2 ? wx + fx * 3 : wx + 3, hy = wy - 4;
    if (kind === 'rod') {
      const tipx = d === 2 ? wx + 9 : d === 3 ? wx - 9 : wx + 5, tipy = d === 1 ? wy - 14 : wy - 11;
      for (let i = 0; i <= 5; i++) rect(hx + (tipx - hx) * i / 5, hy + (tipy - hy) * i / 5, 1, 1, '#733e39');
      const ly = d === 1 ? wy - 10 : wy + 2 + (swing ? 1 : 0);
      for (let yy = tipy; yy < ly; yy++) rect(tipx, yy, 1, 1, 'rgba(234,212,170,0.8)');
      return;
    }
    if (!kind) return;
    const up = swing === 0;
    const tx = d >= 2 ? hx + fx * (up ? 1 : 3) : hx + (up ? 0 : 1), ty = up ? hy - 5 : hy - 1;
    for (let i = 0; i < 4; i++) rect(tx - (d === 3 ? -i * 0 : 0), ty + i, 1, 1, '#733e39');
    const head = kind === 'axe' ? '#c0cbdc' : kind === 'pick' ? '#8b9bb4' : '#5a6988';
    rect(tx - (kind === 'pick' ? 1 : 0), ty - 1, kind === 'pick' ? 3 : 2, 2, head);
  }

  function drawGhost(S, g) {
    if (!S) return;
    const S2 = A.spr;
    const img = g.type === 'fogueira' ? S2.fireOut : S2.tent[g.type === 'barraca2' ? 'barraca2' : 'barraca'];
    const def = C.BUILD[g.type];
    blit(img, g.x * TS, g.y * TS + (g.type === 'fogueira' ? -2 : 1), 0.6);
    ctx.fillStyle = g.ok ? 'rgba(254,174,52,0.22)' : 'rgba(228,59,68,0.35)';
    ctx.fillRect(Math.round(g.x * TS * sc + ox), Math.round(g.y * TS * sc + oy), Math.round(def.w * TS * sc), Math.round(def.h * TS * sc));
    outline(g.x * TS, g.y * TS, def.w * TS, def.h * TS, g.ok ? '#feae34' : '#e43b44');
  }

  function drawRing(r) {
    const cx = (r.x + 0.5) * TS * sc + ox, cy = (r.y + 0.5) * TS * sc + oy, rad = r.r * TS * sc;
    ctx.save();
    ctx.lineWidth = Math.max(2, dpr * 2);
    ctx.setLineDash([6 * dpr, 5 * dpr]);
    ctx.strokeStyle = r.ok ? '#feae34' : '#e43b44';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = r.ok ? 'rgba(254,174,52,0.12)' : 'rgba(228,59,68,0.12)';
    ctx.fill();
    // coluna de luz no centro
    ctx.fillStyle = r.ok ? '#fee761' : '#e43b44';
    const s = Math.max(3, TS * sc * 0.5);
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    ctx.restore();
  }

  function drawLight(S, now) {
    const h = S.ck.hour;
    let dark = darkness(h);
    if (S.precip) dark = Math.max(dark, S.precip === 'chuva' ? 0.24 : 0.16);
    const Nr = G.Narr;
    if (Nr && Nr.is(S, 'tempestade')) dark = Math.max(dark, 0.36);
    if (Nr && Nr.is(S, 'nevasca')) dark = Math.max(dark, 0.26);
    const dusk = h >= 16.5 && h < 19.5 ? Math.sin((h - 16.5) / 3 * Math.PI) : 0;
    const dawn = h >= 4.5 && h < 7.5 ? Math.sin((h - 4.5) / 3 * Math.PI) : 0;
    if (dusk > 0) { ctx.fillStyle = 'rgba(247,118,34,' + (dusk * 0.16).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (dawn > 0) { ctx.fillStyle = 'rgba(246,117,122,' + (dawn * 0.12).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    if (dark <= 0.01) return;
    const lw = light.width, lh = light.height;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = 'rgba(14,12,40,' + dark.toFixed(3) + ')';
    lctx.fillRect(0, 0, lw, lh);
    lctx.globalCompositeOperation = 'destination-out';
    const fires = S.buildings.filter((b) => b.type === 'fogueira' && b.built && b.fuel > 0);
    if (S.god) for (const a of S.god.auras) {
      const cx = ((a.x + 0.5) * TS * sc + ox) / 4, cy = ((a.y + 0.5) * TS * sc + oy) / 4, r = a.r * TS * sc / 4;
      for (const [f, al] of [[1.0, 0.3], [0.7, 0.6], [0.4, 0.9]]) { lctx.fillStyle = 'rgba(0,0,0,' + al + ')'; lctx.beginPath(); lctx.arc(cx, cy, r * f, 0, Math.PI * 2); lctx.fill(); }
    }
    for (const b of fires) {
      const fl = 1 + Math.sin(now / 90 + b.id) * 0.04 + Math.sin(now / 37) * 0.02;
      const cx = ((b.x + 0.5) * TS * sc + ox) / 4, cy = ((b.y + 0.4) * TS * sc + oy) / 4;
      const r = TS * sc * 5.2 * fl / 4;
      const steps = [[1.0, 0.35], [0.72, 0.7], [0.45, 1]];
      for (const [f, a] of steps) {
        lctx.fillStyle = 'rgba(0,0,0,' + a + ')';
        lctx.beginPath(); lctx.arc(cx, cy, r * f, 0, Math.PI * 2); lctx.fill();
      }
    }
    // quem está com fogo por perto tem pouca luz própria; céu estrelado fica para depois
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(light, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of fires) {
      const cx = (b.x + 0.5) * TS * sc + ox, cy = (b.y + 0.4) * TS * sc + oy;
      const r = TS * sc * 3.2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(247,118,34,' + (0.22 * dark / 0.64).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(247,118,34,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // gota nova: cai até um ponto do chão (visão de cima), onde vira respingo
  function newDrop(anywhere) {
    return { x: Math.random() * W * 1.15, y: anywhere ? Math.random() * H : -Math.random() * 40 * dpr, ly: Math.random() * H, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 6 };
  }

  let flash = 0, flashWait = 2;
  function drawWeather(S, dt) {
    const kind = S.precip, Nr = G.Narr;
    const blizzard = !!(Nr && Nr.is(S, 'nevasca')), storm = !!(Nr && Nr.is(S, 'tempestade'));
    // seca: o dia fica amarelado e parado
    if (Nr && Nr.is(S, 'seca') && darkness(S.ck.hour) < 0.3) { ctx.fillStyle = 'rgba(247,150,50,0.09)'; ctx.fillRect(0, 0, W, H); }
    // tempestade: relâmpagos
    if (storm) {
      flashWait -= dt;
      if (flashWait <= 0) { flash = 0.14; flashWait = 2.5 + Math.random() * 5; }
      if (flash > 0) { ctx.fillStyle = 'rgba(235,240,255,' + (flash * 2.2).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); flash -= dt; }
    }
    // nevasca: tudo branco de vento
    if (blizzard) { ctx.fillStyle = 'rgba(214,226,240,0.2)'; ctx.fillRect(0, 0, W, H); }
    const area = (W * H) / (dpr * dpr);
    const target = kind ? Math.min(kind === 'neve' ? (blizzard ? 560 : 260) : 380, Math.round(area / (kind === 'neve' ? (blizzard ? 2600 : 6000) : 3800))) : 0;
    while (drops.length < target) drops.push(newDrop(true));
    if (drops.length > target) drops.length = target;
    if (!kind) { splashes.length = 0; return; }
    const px = Math.max(1, Math.round(dpr * 2));
    if (kind === 'chuva') {
      ctx.fillStyle = 'rgba(30,40,74,0.2)'; ctx.fillRect(0, 0, W, H);
      const w = Math.max(1, Math.round(dpr)), seg = px * 1.6;
      ctx.fillStyle = 'rgba(178,220,246,0.62)';
      for (const d of drops) {
        d.y += 700 * dpr * d.s * dt; d.x -= 150 * dpr * d.s * dt;
        if (d.y >= d.ly) {
          if (splashes.length < 220) splashes.push({ x: d.x, y: d.ly, t: 0 });
          Object.assign(d, newDrop(false));
          continue;
        }
        // rastro para cima e para a direita, oposto ao movimento
        for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(d.x + i * seg * 0.21), Math.round(d.y - i * seg), w, Math.ceil(seg));
      }
      ctx.fillStyle = 'rgba(214,236,250,0.75)';
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.t += dt;
        if (s.t > 0.2) { splashes.splice(i, 1); continue; }
        const r = px * (0.8 + s.t * 9);
        ctx.fillRect(Math.round(s.x - r), Math.round(s.y), w, w);
        ctx.fillRect(Math.round(s.x + r), Math.round(s.y), w, w);
        ctx.fillRect(Math.round(s.x), Math.round(s.y - r * 0.6), w, w);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const d of drops) {
        d.ph += dt;
        if (blizzard) {
          // vento de lado, neve rápida
          d.y += 150 * dpr * d.s * dt; d.x += (220 + Math.sin(d.ph * 2) * 40) * dpr * d.s * dt;
          if (d.y > H || d.x > W + 10) { d.y = Math.random() * H * 0.6 - 10; d.x = -10 - Math.random() * W * 0.3; }
          ctx.fillRect(Math.round(d.x), Math.round(d.y), px * 2, px);
          continue;
        }
        d.y += 55 * dpr * d.s * dt; d.x += Math.sin(d.ph * 1.3) * 18 * dpr * dt;
        if (d.y > H) { d.y = -6; d.x = Math.random() * W; }
        ctx.fillRect(Math.round(d.x), Math.round(d.y), px, px);
      }
    }
  }
})(globalThis.G = globalThis.G || {});
