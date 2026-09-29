/* Gênesis · bichos (Etapa 5): capivaras em bandos perto da água. Pastam de dia, descansam à noite,
   fogem de quem vem caçar e aumentam o bando com o tempo. Com a lança, viram carne e couro. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, W = G.W;
  const F = G.Fauna = {};

  function rint(S, a, b) { return S.rng.int(a, b); }
  function tileOk(w, x, y) {
    if (x < 2 || y < 2 || x >= w.W - 2 || y >= w.H - 2) return false;
    const i = y * w.W + x;
    return !w.block[i] && !w.slow[i] && !G.IS_WATER[w.tile[i]];
  }

  // ---------- estado ----------
  F.init = function (S) {
    const f = S.fauna || (S.fauna = { herds: [], ents: [], nextId: 1, nextHerd: 1 });
    f.herds = f.herds || []; f.ents = f.ents || [];
    // ao carregar ninguém está caçando: solta as capivaras que estavam escolhidas
    for (const e of f.ents) { e.path = null; e.pathI = 0; e.res = 0; if (e.px === undefined) { e.px = e.x; e.py = e.y; } }
    if (!f.made) {
      f.made = true;
      for (let k = 0; k < C.FAUNA_HERDS; k++) newHerd(S, rint(S, C.FAUNA_HERD[0], C.FAUNA_HERD[1]));
    }
  };
  // um lugar de capivara: capim ou areia na beira da água, longe o bastante do acampamento
  function herdSpot(S) {
    const w = S.world, cx = S.camp.x + 1, cy = S.camp.y + 1;
    const taken = S.fauna.herds.filter((h) => h.alive !== false);
    for (let k = 0; k < 120; k++) {
      const a = S.rng.next() * Math.PI * 2, d = C.FAUNA_DIST[0] + S.rng.next() * (C.FAUNA_DIST[1] - C.FAUNA_DIST[0]);
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (!tileOk(w, x, y) || W.waterAdj(w, y * w.W + x) < 0) continue;
      if (taken.some((h) => Math.hypot(h.x - x, h.y - y) < 10)) continue;
      return { x, y };
    }
    return null;
  }
  function newHerd(S, n) {
    const f = S.fauna, spot = herdSpot(S);
    if (!spot) return null;
    const h = { id: f.nextHerd++, x: spot.x, y: spot.y, lastBirth: S.ck ? S.ck.day : 0, empty: 0 };
    f.herds.push(h);
    for (let i = 0; i < n; i++) spawnAt(S, h);
    return h;
  }
  function spawnAt(S, h) {
    const w = S.world;
    for (let k = 0; k < 20; k++) {
      const x = h.x + rint(S, -2, 2), y = h.y + rint(S, -2, 2);
      if (!tileOk(w, x, y)) continue;
      const e = { id: S.fauna.nextId++, h: h.id, x: x + 0.5, y: y + 0.5, px: x + 0.5, py: y + 0.5, dir: rint(S, 0, 3), walk: 0,
        path: null, pathI: 0, state: 'pasto', wait: rint(S, 10, 90), res: 0, big: S.rng.chance(0.3) };
      S.fauna.ents.push(e);
      return e;
    }
    return null;
  }
  F.alive = (S) => (S.fauna ? S.fauna.ents.filter((e) => e.state !== 'morta') : []);
  F.herdOf = (S, e) => S.fauna.herds.find((h) => h.id === e.h) || null;
  F.get = (S, id) => (S.fauna ? S.fauna.ents.find((e) => e.id === id) || null : null);

  // ---------- movimento ----------
  function setPath(e, path) { e.path = path && path.length ? path : null; e.pathI = 0; }
  function move(S, e, dt, speed) {
    if (!e.path) return;
    const w = S.world;
    let budget = dt / C.WALK_MIN_PER_TILE * speed, guard = 0;
    while (budget > 1e-6 && e.path && e.pathI < e.path.length && guard++ < 24) {
      const idx = e.path[e.pathI];
      if (w.block[idx]) { e.path = null; break; }
      const tx = (idx % w.W) + 0.5, ty = ((idx / w.W) | 0) + 0.5;
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      const cost = C.COST[w.tile[idx]] * (w.slow[idx] ? 2 : 1);
      const can = budget / cost;
      if (d > 1e-6) { if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? 2 : 3; else e.dir = dy > 0 ? 0 : 1; }
      if (d <= can) { e.x = tx; e.y = ty; budget -= d * cost; e.pathI++; e.walk += d; }
      else { e.x += dx / d * can; e.y += dy / d * can; e.walk += can; budget = 0; }
    }
    if (e.path && e.pathI >= e.path.length) e.path = null;
  }
  // pasta por perto de casa
  function wander(S, e, h) {
    const w = S.world, here = Math.floor(e.y) * w.W + Math.floor(e.x);
    for (let k = 0; k < 6; k++) {
      const x = h.x + rint(S, -C.FAUNA_HOME_R, C.FAUNA_HOME_R), y = h.y + rint(S, -C.FAUNA_HOME_R, C.FAUNA_HOME_R);
      if (!tileOk(w, x, y)) continue;
      const path = W.findPath(w, here, y * w.W + x, 60);
      if (path) { setPath(e, path); return true; }
    }
    return false;
  }
  // foge de quem ameaça: para longe, sem sair muito de casa
  F.scare = function (S, e, fx, fy) {
    if (!e || e.state === 'morta') return;
    const w = S.world, h = F.herdOf(S, e) || { x: Math.floor(e.x), y: Math.floor(e.y) };
    const here = Math.floor(e.y) * w.W + Math.floor(e.x);
    let dx = e.x - fx, dy = e.y - fy;
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    for (let k = 0; k < 10; k++) {
      const run = 6 + rint(S, 0, 3), ang = (S.rng.next() - 0.5) * 1.6;
      const rx = dx * Math.cos(ang) - dy * Math.sin(ang), ry = dx * Math.sin(ang) + dy * Math.cos(ang);
      let x = Math.round(e.x + rx * run), y = Math.round(e.y + ry * run);
      if (Math.hypot(x - h.x, y - h.y) > C.FAUNA_HOME_R + 5) { x = Math.round((x + h.x) / 2); y = Math.round((y + h.y) / 2); }
      if (!tileOk(w, x, y)) continue;
      const path = W.findPath(w, here, y * w.W + x, 80);
      if (path) { setPath(e, path); e.state = 'fuga'; e.wait = 0; return; }
    }
  };
  F.kill = function (S, e) {
    e.state = 'morta'; e.path = null; e.deadAt = S.t;
  };
  F.remove = function (S, e) { e.gone = true; };

  F.step = function (S, dt) {
    const f = S.fauna;
    if (!f || !f.ents.length) return;
    const h24 = S.ck.hour, night = h24 >= 20 || h24 < 6;
    for (const e of f.ents) {
      if (e.gone) continue;
      e.px = e.x; e.py = e.y;
      if (e.state === 'morta') { if (S.t - e.deadAt > C.DAY_MIN) e.gone = true; continue; }
      const h = F.herdOf(S, e);
      if (e.state === 'fuga') {
        move(S, e, dt, C.FAUNA_FLEE);
        if (!e.path) { e.state = 'pasto'; e.wait = rint(S, 20, 60); }
        continue;
      }
      if (e.path) { move(S, e, dt, C.FAUNA_SPEED); continue; }
      if (night) continue;   // à noite o bando dorme amontoado
      e.wait -= dt;
      if (e.wait > 0 || !h) continue;
      wander(S, e, h);
      e.wait = rint(S, 30, 150);
    }
    if (f.ents.some((e) => e.gone)) f.ents = f.ents.filter((e) => !e.gone);
  };

  // uma vez por dia: filhotes (fora do inverno) e bandos novos onde o antigo acabou
  F.daily = function (S) {
    const f = S.fauna;
    if (!f) return;
    const day = S.ck.day;
    for (const h of f.herds) {
      const n = f.ents.filter((e) => e.h === h.id && e.state !== 'morta').length;
      if (!n) { h.empty = (h.empty || 0) + 1; continue; }
      h.empty = 0;
      if (S.ck.season !== 3 && n >= 2 && n < C.FAUNA_MAX && day - h.lastBirth >= C.FAUNA_BIRTH_DAYS) { spawnAt(S, h); h.lastBirth = day; }
      // capivara sozinha não dá cria: com o tempo, uma de fora chega e o bando recomeça
      if (n === 1) { h.lonely = (h.lonely || 0) + 1; if (h.lonely >= C.FAUNA_LONELY_DAYS && S.ck.season !== 3) { spawnAt(S, h); h.lonely = 0; h.lastBirth = day; } }
      else h.lonely = 0;
    }
    // bando que acabou some; depois de um tempo aparece outro, em outro lugar
    const dead = f.herds.filter((h) => h.empty >= C.FAUNA_NEW_HERD_DAYS);
    if (dead.length) {
      f.herds = f.herds.filter((h) => h.empty < C.FAUNA_NEW_HERD_DAYS);
      for (let i = 0; i < dead.length; i++) newHerd(S, rint(S, C.FAUNA_HERD[0], C.FAUNA_HERD[1]));
    }
  };

  // ---------- caça: a presa mais perto (de quem caça) que ninguém já escolheu ----------
  F.prey = function (S, p, maxD) {
    let best = null, bd = maxD || 60;
    // quantas sobram em cada bando, descontando as que outros caçadores já escolheram
    const size = {};
    for (const e of F.alive(S)) if (!e.res || e.res === p.id) size[e.h] = (size[e.h] || 0) + 1; else size[e.h] = (size[e.h] || 0);
    for (const e of F.alive(S)) {
      if (e.res && e.res !== p.id) continue;
      if (size[e.h] <= C.CACA_KEEP) continue;   // deixa o casal do bando: ele volta a crescer
      if (S.seen && !S.seen[Math.floor(e.y) * S.world.W + Math.floor(e.x)]) continue;   // só o que o povo já viu
      const d = Math.hypot(e.x - p.x, e.y - p.y) + Math.hypot(e.x - S.camp.x, e.y - S.camp.y) * 0.5;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };
  // Raio numa capivara: carne e couro direto no estoque
  F.onRaio = function (S, x, y) {
    let hit = null, bd = 1.4;
    for (const e of F.alive(S)) { const d = Math.hypot(e.x - x - 0.5, e.y - y - 0.5); if (d < bd) { bd = d; hit = e; } }
    if (!hit) return null;
    F.kill(S, hit); hit.gone = true;
    for (const e of F.alive(S)) if (Math.hypot(e.x - hit.x, e.y - hit.y) < 6) F.scare(S, e, hit.x, hit.y);
    S.stock.carne += C.CACA_CARNE; S.stock.couro += C.CACA_COURO;
    return 'O raio abateu uma capivara: +' + C.CACA_CARNE + ' carne e +' + C.CACA_COURO + ' couro no estoque.';
  };
})(globalThis.G = globalThis.G || {});
