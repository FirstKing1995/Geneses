/* Gênesis · simulação: tempo, clima, necessidades, construções, mortes, metas. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U, T = G.T;
  const Sim = G.Sim = {};

  // ---------- nomes, traços, aparência ----------
  const FEM = ['Iara', 'Jaci', 'Moema', 'Potira', 'Maíra', 'Tainá', 'Naiá', 'Ceci', 'Jurema', 'Iracema', 'Araci', 'Juçara',
    'Luzia', 'Rosa', 'Clara', 'Benedita', 'Inaê', 'Açucena', 'Amana', 'Irani'];
  const MASC = ['Aruã', 'Caiubi', 'Iberê', 'Kauê', 'Piatã', 'Raoni', 'Ubiratã', 'Cauã', 'Bento', 'Joaquim', 'Tomé', 'Chico',
    'Apoena', 'Jurandir', 'Ubirajara', 'Moacir', 'Ravi', 'Davi', 'Guaraci', 'Iuri'];
  const PAIRS = [['Trabalhador', 'Preguiçoso'], ['Resistente ao frio', 'Friorento'], ['Otimista', 'Pessimista'], ['Devoto', 'Cético']];
  const SOLO = ['Comilão', 'Ágil'];
  const TRAIT_DESC = {
    'Trabalhador': 'Trabalha 15% mais rápido e gosta de trabalhar.',
    'Preguiçoso': 'Trabalha 15% mais devagar e vive procurando sombra.',
    'Resistente ao frio': 'Perde calor 30% mais devagar.',
    'Friorento': 'Perde calor 30% mais rápido.',
    'Otimista': '+8 de humor.',
    'Pessimista': '−8 de humor.',
    'Devoto': 'Segue as Vontades com mais força.',
    'Cético': 'Pesa menos as Vontades e faz do jeito dele.',
    'Comilão': 'Sente fome 25% mais rápido.',
    'Ágil': 'Anda 15% mais rápido.',
  };
  const SKINS = [['#f2c79e', '#d49b73'], ['#e8b796', '#c28569'], ['#c28569', '#9a5f45'], ['#a8694a', '#7a4630'], ['#7a4a34', '#553022']];
  const HAIRS = ['#181425', '#2b1d1a', '#3e2731', '#3e2731', '#733e39', '#be4a2f'];
  const CLOTHS = [['#b86f50', '#733e39'], ['#c9a068', '#8a6440'], ['#8a7a4a', '#5e5230'], ['#9a6a8a', '#5e3a5a'], ['#6a8a9a', '#3e5a6a']];

  const MEM = {
    comeuQuente: { t: 'Comeu comida quente', v: 5, d: 1440 },
    comeuCru: { t: 'Comeu peixe cru', v: -3, d: 720 },
    dormiuBarraca: { t: 'Dormiu na barraca', v: 4, d: 1440 },
    dormiuBem: { t: 'Dormiu bem abrigado', v: 6, d: 1440 },
    dormiuRelento: { t: 'Dormiu ao relento', v: -6, d: 1440 },
    passouFrio: { t: 'Passou frio', v: -8, d: 1440 },
    passouFome: { t: 'Passou fome', v: -10, d: 1440 },
    passouSede: { t: 'Passou sede', v: -10, d: 1440 },
    conversou: { t: 'Conversou', v: 4, d: 1440 },
    fogueira: { t: 'Viu a primeira fogueira', v: 6, d: 3 * 1440 },
    obra: { t: 'Ergueu algo novo', v: 5, d: 2 * 1440 },
    chegada: { t: 'Começou uma vida nova', v: 5, d: 3 * 1440 },
    perdeuAlguem: { t: 'Perdeu alguém', v: -30, d: 60 * 1440 },
    oracaoAtendida: { t: 'Teve a oração atendida', v: 8, d: 2 * 1440 },
    oracaoIgnorada: { t: 'Rezou e ninguém respondeu', v: -5, d: 1440 },
    viuMilagre: { t: 'Viu um milagre', v: 4, d: 1440 },
    atingidoRaio: { t: 'Foi atingido por um raio', v: -15, d: 3 * 1440 },
    viuRaio: { t: 'Viu um raio cair perto', v: -3, d: 1440 },
    esperaFilho: { t: 'Espera um filho', v: 8, d: 45 * 1440 },
    nasceuFilho: { t: 'Um filho nasceu', v: 15, d: 10 * 1440 },
    nasceuIrmao: { t: 'Nasceu alguém da família', v: 6, d: 5 * 1440 },
    perdeuBebe: { t: 'Perdeu um bebê', v: -30, d: 45 * 1440 },
    perdeuCompanheiro: { t: 'Perdeu quem amava', v: -30, d: 60 * 1440 },
    perdeuFamilia: { t: 'Perdeu alguém da família', v: -30, d: 60 * 1440 },
    curado: { t: 'Foi curado por Deus', v: 10, d: 3 * 1440 },
    brincou: { t: 'Brincou', v: 4, d: 720 },
    mordido: { t: 'Foi mordido por um lobo', v: -12, d: 3 * 1440 },
    acolhido: { t: 'Foi acolhido pelo povo', v: 10, d: 5 * 1440 },
    chegouGente: { t: 'Chegou gente nova', v: 4, d: 2 * 1440 },
    fartura: { t: 'Tempo de fartura', v: 4, d: 3 * 1440 },
    mel: { t: 'Comeu mel', v: 5, d: 1440 },
  };
  Sim.MEM = MEM; Sim.TRAIT_DESC = TRAIT_DESC;

  // ---------- tempo ----------
  function clock(t) {
    const day = Math.floor(t / C.DAY_MIN);
    const doy = day % C.YEAR_DAYS;
    const season = Math.floor(doy / C.SEASON_DAYS);
    return { day, year: Math.floor(day / C.YEAR_DAYS) + 1, doy, season, dos: (doy % C.SEASON_DAYS) + 1, hour: (t % C.DAY_MIN) / 60 };
  }
  Sim.clock = clock;
  Sim.dateText = function (t) {
    const c = clock(t);
    return 'Ano ' + c.year + ', ' + C.SEASONS[c.season].toLowerCase() + ', dia ' + c.dos;
  };
  Sim.ageOf = function (S, p) { return Math.floor((S.t - p.born) / (C.DAY_MIN * C.YEAR_DAYS)); };
  Sim.has = function (p, tr) { return p.traits.indexOf(tr) >= 0; };

  // ---------- clima ----------
  function seasonBase(dayF) {
    const sd = C.SEASON_DAYS, bl = C.SEASON_BLEND_DAYS;
    const k = Math.floor(dayF / sd);
    const s = ((k % 4) + 4) % 4;
    const into = dayF - k * sd;
    const a = C.SEASON_TEMP[s];
    if (into < sd - bl) return a;
    const b = C.SEASON_TEMP[(s + 1) % 4];
    const f = (into - (sd - bl)) / bl;
    return a + (b - a) * f * f * (3 - 2 * f);
  }
  function dayRand(S, day) { return (G.hash2(day, 7, S.seed) * 2 - 1) * C.DAY_RANDOM; }
  function weatherOf(S, day) {
    const season = Math.floor((day % C.YEAR_DAYS) / C.SEASON_DAYS);
    const h = G.hash2(day, 13, S.seed);
    if (day === 0 || h >= C.RAIN_CHANCE[season]) return { kind: G.hash2(day, 17, S.seed) < 0.3 ? 'nublado' : 'limpo', start: 0, end: 0 };
    const start = 2 + G.hash2(day, 19, S.seed) * 18;
    return { kind: 'chuva', start, end: start + 3 + G.hash2(day, 23, S.seed) * 9 };
  }
  function precipNow(S) {
    const ck = S.ck, h = ck.hour;
    // nevasca, tempestade e seca mandam no céu (a chuva de Deus ainda vence a seca)
    const nar = G.Narr ? G.Narr.precip(S) : undefined;
    if (nar !== undefined) return nar;
    if (S.god && S.god.rainUntil > S.t) return seasonBase(ck.doy + h / 24) < 3.5 ? 'neve' : 'chuva';
    const today = weatherOf(S, ck.day), yest = ck.day > 0 ? weatherOf(S, ck.day - 1) : null;
    let on = today.kind === 'chuva' && h >= today.start && h < today.end;
    if (!on && yest && yest.kind === 'chuva' && yest.end > 24 && h + 24 < yest.end) on = true;
    if (!on) return null;
    return seasonBase(ck.doy + h / 24) < 3.5 ? 'neve' : 'chuva';
  }
  function ambient(S) {
    const ck = S.ck;
    const base = seasonBase(ck.doy + ck.hour / 24);
    const swing = C.DAY_SWING * Math.sin((ck.hour - 9) / 24 * 2 * Math.PI);
    const rnd = U.lerp(dayRand(S, ck.day), dayRand(S, ck.day + 1), ck.hour / 24);
    const pr = S.precip === 'chuva' ? C.RAIN_COLD : S.precip === 'neve' ? C.SNOW_COLD : 0;
    return base + swing + rnd + pr + (G.Narr ? G.Narr.tempMod(S) : 0);
  }
  Sim.seasonBase = seasonBase;
  Sim.weatherOf = weatherOf;
  Sim.daysToWinter = function (S) {
    const ck = S.ck;
    if (ck.season === 3) return 0;
    return 45 - ck.doy;
  };

  function tileTemp(S, i) {
    const t = S.world.tile[i];
    return S.temp + (t === T.MOUNTAIN ? C.MOUNTAIN_COLD : t === T.HILL ? C.HILL_COLD : 0);
  }
  function fireHeat(S, x, y) {
    let best = 0;
    for (const b of S.buildings) {
      if (b.type !== 'fogueira' || !b.built || b.fuel <= 0) continue;
      const d = Math.hypot(b.x + 0.5 - x, b.y + 0.5 - y);
      let h = 0;
      if (d <= C.FIRE_FULL_R) h = C.FIRE_HEAT;
      else if (d < C.FIRE_MAX_R) h = C.FIRE_HEAT * (C.FIRE_MAX_R - d) / (C.FIRE_MAX_R - C.FIRE_FULL_R);
      if (h > best) best = h;
    }
    return best;
  }
  Sim.fireHeat = fireHeat;
  function personTemp(S, p) {
    const w = S.world;
    if (p.carriedBy) { const c = G.Family.carrierOf(S, p); if (c && c.alive) return (c.tempHere !== undefined ? c.tempHere : 16) + 3; }
    const fh = fireHeat(S, p.x, p.y) * (p.sleeping && !p.inTent && p.fireShare !== undefined ? p.fireShare : 1);
    let t0 = tileTemp(S, Math.floor(p.y) * w.W + Math.floor(p.x)) + Math.max(fh, G.God.heatAt(S, p.x, p.y));
    if (p.inTent) { const b = Sim.building(S, p.inTent); if (b && b.built) t0 += C.BUILD[b.type].heat; }
    return t0;
  }
  Sim.personTemp = personTemp;

  // ---------- criação ----------
  Sim.traitClash = function (list, t) {
    return PAIRS.some((pr) => pr.indexOf(t) >= 0 && pr.some((x) => x !== t && list.indexOf(x) >= 0));
  };
  function pickTraits(rng) {
    const pool = [];
    PAIRS.forEach((pr) => pool.push(pr));
    SOLO.forEach((s) => pool.push([s]));
    const out = [];
    while (out.length < 2) {
      const grp = rng.pick(pool);
      if (grp.some((g) => out.indexOf(g) >= 0)) continue;
      const tr = rng.pick(grp);
      if (out.indexOf(tr) < 0) out.push(tr);
    }
    return out;
  }
  function makeLook(rng, sex) {
    return {
      skin: rng.int(0, SKINS.length - 1), hair: rng.pick(HAIRS), cloth: rng.int(0, CLOTHS.length - 1),
      style: sex === 'F' ? rng.int(0, 1) : rng.int(0, 1), beard: sex === 'M' && rng.chance(0.35),
    };
  }
  Sim.colorsOf = function (look) {
    return { skin: SKINS[look.skin][0], skinD: SKINS[look.skin][1], hair: look.hair, cloth: CLOTHS[look.cloth][0], clothD: CLOTHS[look.cloth][1] };
  };
  Sim.randomNames = function (rng) { return [rng.pick(FEM), rng.pick(MASC)]; };
  Sim.namePool = { FEM, MASC };
  Sim.pickTraits = pickTraits; Sim.makeLook = makeLook;

  function makePerson(S, sex, name, age) {
    const rng = S.rng;
    return {
      id: S.nextPid++, name, sex, born: S.t - age * C.DAY_MIN * C.YEAR_DAYS - rng.int(0, C.YEAR_DAYS - 1) * C.DAY_MIN,
      traits: pickTraits(rng),
      skills: { coleta: 0, pesca: 0, construcao: 0 },
      needs: { fome: 80 + rng.range(0, 10), sede: 75 + rng.range(0, 10), energia: 88, calor: 90, social: 70, saude: 100 },
      mood: 60, mem: [], x: 0, y: 0, px: 0, py: 0, dir: 0, walk: 0,
      path: null, pathI: 0, act: null, carry: null, alive: true, cause: '', diedAt: 0,
      sleeping: false, inTent: 0, say: null, sayId: 0, sayAt: -999, nextEval: 0, fail: {}, chatCool: 0, rel: {},
      dmg: { fome: 0, sede: 0, frio: 0 }, look: makeLook(rng, sex), tempHere: 16, touched: false, warned: {},
    };
  }

  Sim.makePerson = makePerson;
  function makeGoals() {
    return [
      { id: 'fogo', text: 'Acenda a primeira fogueira', done: false },
      { id: 'barraca', text: 'Construa uma barraca', done: false },
      { id: 'comida', text: 'Guarde ' + C.GOAL_FOOD + ' porções de comida', done: false },
      { id: 'lenha', text: 'Guarde ' + C.GOAL_WOOD + ' de madeira', done: false },
      { id: 'inverno', text: 'Sobreviva ao primeiro inverno', done: false },
    ];
  }

  Sim.newGame = function (seed, site, names, world) {
    const w = world || G.W.generate(seed);
    const S = {
      v: 1, seed: seed >>> 0, world: w, t: C.START_HOUR * 60,
      rng: new G.RNG((seed ^ 0xa5a5a5a5) >>> 0),
      camp: { x: site.x, y: site.y }, siteLabel: G.W.siteLabel(w, G.W.evalSite(w, site.x, site.y)),
      stock: Object.assign({}, C.START_STOCK), vontades: Object.assign({}, C.DEFAULT_VONTADES),
      people: [], buildings: [], nextPid: 1, nextBid: 1,
      chron: [], events: [], goals: makeGoals(), stats: { firstFire: false, firstTent: false, allGoals: false, winters: 0 },
      over: false, arrived: false,
    };
    S.ck = clock(S.t);
    S.precip = null; S.temp = 16;
    foundCamp(S);
    const [nf, nm] = names || Sim.randomNames(S.rng);
    const a = makePerson(S, 'F', nf, S.rng.int(19, 24));
    const b = makePerson(S, 'M', nm, S.rng.int(20, 26));
    S.people.push(a, b);
    arrive(S, [a, b]);
    Sim.init(S);
    return S;
  };

  function foundCamp(S) {
    const w = S.world;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = (S.camp.y + dy) * w.W + S.camp.x + dx;
      const o = G.W.objAt(w, i);
      if (o) G.W.removeObj(w, o);
    }
  }
  Sim.isCamp = function (S, i) {
    const w = S.world, x = i % w.W, y = (i / w.W) | 0;
    return x >= S.camp.x && x <= S.camp.x + 1 && y >= S.camp.y && y <= S.camp.y + 1;
  };

  function arrive(S, list) {
    const w = S.world, campI = S.camp.y * w.W + S.camp.x;
    const r = G.W.findNearest(w, campI, (i) => {
      const x = i % w.W, y = (i / w.W) | 0;
      return Math.hypot(x - S.camp.x, y - S.camp.y) >= 9 ? 1 : 0;
    }, 40);
    let path = [], sx = S.camp.x, sy = S.camp.y;
    if (r) { sx = r.idx % w.W; sy = (r.idx / w.W) | 0; path = r.path.slice().reverse().slice(1).concat([campI]); }
    list.forEach((p, k) => {
      p.x = sx + 0.5 + (k ? 0.35 : -0.35); p.y = sy + 0.5; p.px = p.x; p.py = p.y;
      p.act = { type: 'chegar', stage: 'go', t: 0, score: 999 };
      p.path = path.length ? path.slice() : null; p.pathI = 0;
    });
  }

  // ---------- memórias, fala, eventos ----------
  Sim.addMem = function (S, p, k) {
    const def = MEM[k]; if (!def) return;
    const ex = p.mem.find((m) => m.k === k);
    if (ex) ex.until = S.t + def.d; else p.mem.push({ k, until: S.t + def.d });
  };
  Sim.say = function (S, p, text, force) {
    if (!force && S.t - p.sayAt < 40) return;
    p.say = text; p.sayId++; p.sayAt = S.t;
  };
  Sim.toast = function (S, text, tone) { S.events.push({ k: 'toast', text, tone: tone || '' }); };
  Sim.chron = function (S, text) { S.chron.push({ t: S.t, text }); S.events.push({ k: 'chron', text }); };
  Sim.float = function (S, x, y, text) { S.events.push({ k: 'float', x, y, text }); };

  // ---------- construções ----------
  Sim.building = function (S, id) { for (const b of S.buildings) if (b.id === id) return b; return null; };
  Sim.canPlace = function (S, type, x, y) {
    const def = C.BUILD[type], w = S.world;
    for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx < 1 || ty < 1 || tx >= w.W - 1 || ty >= w.H - 1) return 'Fora do mapa';
      const i = ty * w.W + tx;
      if (S.seen && !S.seen[i]) return 'A névoa cobre esse lugar';
      if (G.IS_WATER[w.tile[i]]) return 'Não dá para construir na água';
      if (w.bgrid[i] >= 0) return 'Já tem uma obra aqui';
      if (Sim.isCamp(S, i)) return 'Esse é o lugar do estoque';
      const o = G.W.objAt(w, i);
      if (o && o.k !== 'stump' && o.k !== 'bush') return o.k === 'tree' ? 'Tem uma árvore no caminho' : o.k === 'rock' ? 'Tem uma pedra no caminho' : 'Lugar ocupado';
    }
    return '';
  };
  Sim.placeBlueprint = function (S, type, x, y) {
    if (Sim.canPlace(S, type, x, y)) return null;
    const def = C.BUILD[type], w = S.world;
    const b = { id: S.nextBid++, type, x, y, w: def.w, h: def.h, built: false, progress: 0,
      have: { madeira: 0, pedra: 0 }, fuel: 0, beds: [], up: null };
    for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
      const i = (y + dy) * w.W + x + dx;
      const o = G.W.objAt(w, i);
      if (o) G.W.removeObj(w, o);
      w.bgrid[i] = b.id; G.W.refreshBlock(w, i);
    }
    S.buildings.push(b);
    Sim.refresh(S);
    return b;
  };
  Sim.removeBuilding = function (S, b) {
    const w = S.world;
    // devolve material entregue
    const src = b.up ? b.up.have : b.built ? null : b.have;
    if (src) { S.stock.madeira += src.madeira; S.stock.pedra += src.pedra; }
    if (b.up) { b.up = null; Sim.refresh(S); return; }
    for (const p of S.people) {
      if (p.inTent === b.id) { G.AI.abort(S, p); p.inTent = 0; }
      if (p.act && p.act.b === b.id) G.AI.abort(S, p);
    }
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) {
      const i = (b.y + dy) * w.W + b.x + dx;
      w.bgrid[i] = -1; G.W.refreshBlock(w, i);
    }
    S.buildings.splice(S.buildings.indexOf(b), 1);
    Sim.refresh(S);
  };
  Sim.startUpgrade = function (S, b) {
    if (!b.built || b.up) return false;
    const to = Object.keys(C.BUILD).find((k) => C.BUILD[k].from === b.type);
    if (!to) return false;
    b.up = { to, have: { madeira: 0, pedra: 0 }, progress: 0 };
    Sim.refresh(S);
    return true;
  };
  // obra em andamento: projeto novo ou melhoria
  Sim.jobOf = function (b) {
    if (!b.built) { const d = C.BUILD[b.type]; return { b, cost: d.cost, have: b.have, work: d.work, get progress() { return b.progress; }, set progress(v) { b.progress = v; } }; }
    if (b.up) { const d = C.BUILD[b.up.to]; return { b, cost: d.cost, have: b.up.have, work: d.work, get progress() { return b.up.progress; }, set progress(v) { b.up.progress = v; } }; }
    return null;
  };
  Sim.missing = function (job) {
    const out = { madeira: 0, pedra: 0 };
    for (const k in job.cost) out[k] = Math.max(0, job.cost[k] - (job.have[k] || 0));
    return out;
  };
  Sim.complete = function (S, b) {
    if (b.up) {
      b.type = b.up.to; b.up = null;
      Sim.chron(S, 'A barraca virou ' + C.BUILD[b.type].name.toLowerCase() + '.');
    } else {
      b.built = true; b.progress = 1;
      if (b.type === 'fogueira') {
        b.fuel = 3;
        if (!S.stats.firstFire) { S.stats.firstFire = true; Sim.chron(S, 'A primeira fogueira foi acesa.'); S.people.forEach((p) => p.alive && Sim.addMem(S, p, 'fogueira')); }
        else Sim.toast(S, 'Fogueira pronta.');
      } else {
        if (!S.stats.firstTent) { S.stats.firstTent = true; Sim.chron(S, 'Ergueram a primeira barraca.'); }
        else Sim.toast(S, C.BUILD[b.type].name + ' pronta.');
      }
    }
    S.people.forEach((p) => p.alive && Sim.addMem(S, p, 'obra'));
    Sim.refresh(S);
  };

  // ---------- contexto para a IA ----------
  Sim.refresh = function (S) {
    const ck = S.ck = clock(S.t);
    const st = S.stock;
    const alive = S.people.filter((p) => p.alive).length || 1;
    const ctx = S.ctx || (S.ctx = { bushFruit: 0 });
    ctx.alive = alive;
    ctx.hour = ck.hour;
    ctx.night = ck.hour >= 21 || ck.hour < 5;
    ctx.evening = ck.hour >= 19 && ck.hour < 21;
    ctx.food = st.frutas + st.peixe;
    ctx.mouths = G.Family.mouths(S);
    ctx.foodDays = (st.frutas * C.FRUIT_FOOD + st.peixe * C.FISH_COOKED) / (ctx.mouths * C.HUNGER_H * 24);
    let fire = null, lit = false, tents = 0;
    for (const b of S.buildings) {
      if (b.type === 'fogueira' && b.built) { if (b.fuel > 0) lit = true; if (!fire || b.fuel < fire.fuel) fire = b; }
      if ((b.type === 'barraca' || b.type === 'barraca2') && b.built) tents++;
    }
    ctx.fire = fire; ctx.fireLit = lit; ctx.tents = tents;
    const nightH = ck.hour >= 18 || ck.hour < 7;
    const cold = S.temp < 13 || (nightH && S.temp < 16) || (S.precip && S.temp < 20);
    // com frio, ou com lobos rondando (o fogo espanta), a fogueira não pode apagar
    ctx.fireNeedsFuel = !!(fire && fire.fuel <= C.FIRE_REFUEL_AT && st.madeira > 0 && (cold || (G.Narr && G.Narr.wantFire(S))));
    let job = null;
    for (const b of S.buildings) { const j = Sim.jobOf(b); if (j) { job = j; break; } }
    ctx.job = job;
    ctx.jobNeeds = job ? Sim.missing(job) : { madeira: 0, pedra: 0 };
    ctx.jobDoable = !!job && ((ctx.jobNeeds.madeira + ctx.jobNeeds.pedra === 0) ||
      (ctx.jobNeeds.madeira > 0 && st.madeira > 0) || (ctx.jobNeeds.pedra > 0 && st.pedra > 0));
  };
  function countBushFruit(S) {
    let n = 0;
    for (const o of S.world.objs) {
      if (o.k === 'bush' && o.fruit > 0 && Math.abs(o.x - S.camp.x) < 24 && Math.abs(o.y - S.camp.y) < 24) n += o.fruit;
    }
    S.ctx.bushFruit = n;
  }

  // ---------- necessidades ----------
  function updateNeeds(S, p, dt) {
    const h = dt / 60, n = p.needs, has = Sim.has;
    const rest = p.sleeping ? C.SLEEP_METABOLISM : 1;
    const baby = !!p.carriedBy;
    const mm = baby ? { fome: 0.8, sede: 0.8, energia: 0, frio: 1.2 } : G.Family.needMult(S, p);
    n.fome -= C.HUNGER_H * h * rest * mm.fome * (has(p, 'Comilão') ? 1.25 : 1);
    n.sede -= C.THIRST_H * h * rest * mm.sede * (S.ck.season === 1 ? C.THIRST_SUMMER : 1) * (G.Narr ? G.Narr.thirstMult(S) : 1);
    if (baby) { n.energia = 100; n.social = 100; }
    else if (p.sleeping) {
      let rate = C.SLEEP_GROUND_H;
      if (p.inTent) { const b = Sim.building(S, p.inTent); rate = b && b.type === 'barraca2' ? C.SLEEP_TENT2_H : C.SLEEP_TENT_H; }
      n.energia += rate * h;
    } else n.energia -= C.ENERGY_H * h * mm.energia;
    if (baby) { /* no colo, sempre acompanhado */ }
    else if (p.act && p.act.type === 'conversar' && p.act.chat && p.act.chat.on) n.social += C.CHAT_SOCIAL_H * h;
    else if (p.act && p.act.type === 'brincar' && p.act.stage === 'play') n.social += C.CHAT_SOCIAL_H * 0.5 * h;
    else n.social -= C.SOCIAL_H * h;
    const tp = p.tempHere = personTemp(S, p);
    const cm = (has(p, 'Friorento') ? 1.3 : has(p, 'Resistente ao frio') ? 0.7 : 1) * mm.frio;
    const deficit = C.COMFORT - tp;
    if (deficit > 0) {
      const floor = Math.max(0, 100 - deficit * C.COLD_SLOPE * cm);
      if (n.calor > floor) n.calor = Math.max(floor, n.calor - (C.COLD_RATE + deficit * C.COLD_RATE_DEG) * cm * h * (p.sleeping ? 1.1 : 1));
      else n.calor = Math.min(floor, n.calor + C.WARM_GAIN * h);
    } else n.calor += (C.WARM_GAIN - deficit * C.WARM_GAIN_DEG) * h;
    for (const k of ['fome', 'sede', 'energia', 'calor', 'social']) n[k] = U.clamp(n[k], 0, 100);
    let hurt = false;
    if (n.fome <= 0) { const d = C.HEALTH_DAY.fome / 24 * h; n.saude -= d; p.dmg.fome += d; hurt = true; }
    if (n.sede <= 0) { const d = C.HEALTH_DAY.sede / 24 * h; n.saude -= d; p.dmg.sede += d; hurt = true; }
    if (n.calor <= 0) { const d = C.HEALTH_DAY.frio / 24 * h; n.saude -= d; p.dmg.frio += d; hurt = true; }
    else if (n.calor < C.HYPOTHERMIA_BELOW) { const d = C.HYPOTHERMIA_DAY / 24 * h; n.saude -= d; p.dmg.frio += d; hurt = true; }
    if (!hurt && n.fome > 25 && n.sede > 25 && n.calor > 25) n.saude += C.HEALTH_REGEN_DAY / 24 * h;
    n.saude = Math.min(100, n.saude);
    // saúde cheia: as feridas antigas não contam mais para a causa de uma morte futura
    if (n.saude >= 100) { const d = p.dmg; if (d.fome || d.sede || d.frio || d.raio || d.parto || d.lobo) { d.fome = d.sede = d.frio = 0; d.raio = d.parto = d.lobo = 0; } }
    if (S.safe && n.saude < C.OFFLINE_HEALTH_FLOOR) n.saude = C.OFFLINE_HEALTH_FLOOR;
    // desmaia de cansaço, menos quem está indo se aquecer: esse aguenta até chegar ao fogo
    if (!baby && n.energia <= 0 && !p.sleeping && (!p.act || ['dormir', 'beber', 'comer', 'parto', 'aquecer', 'fugir', 'fogo'].indexOf(p.act.type) < 0)) {
      G.AI.abort(S, p);
      G.AI.forceSleepHere(S, p);
    }
  }

  function hourlyPerson(S, p) {
    const n = p.needs;
    p.mem = p.mem.filter((m) => m.until > S.t);
    if (n.fome < 10) Sim.addMem(S, p, 'passouFome');
    if (n.sede < 10) Sim.addMem(S, p, 'passouSede');
    if (n.calor < 20) Sim.addMem(S, p, 'passouFrio');
    let m = 50;
    for (const me of p.mem) m += MEM[me.k].v;
    if (Sim.has(p, 'Otimista')) m += 8;
    if (Sim.has(p, 'Pessimista')) m -= 8;
    for (const k of ['fome', 'sede', 'calor', 'energia']) if (n[k] < 25) m -= 6;
    if (n.social < 20) m -= 4;
    if (n.saude < 50) m -= 8;
    p.mood = U.clamp(Math.round(m), 0, 100);
    // avisos ao jogador (uma vez por crise)
    warn(S, p, 'frio', n.calor < 25, p.name + ' está congelando.');
    warn(S, p, 'fome', n.fome < 15, p.name + ' está com muita fome.');
    warn(S, p, 'sede', n.sede < 15, p.name + ' está com muita sede.');
    warn(S, p, 'saude', n.saude < 40, p.name + ' está fraco. Saúde em ' + Math.round(n.saude) + '.');
    // surto de humor
    const h = S.ck.hour;
    const crisis = n.sede < 25 || n.fome < 20 || n.calor < 20 || n.energia < 25;
    if (p.mood < 12 && !crisis && h >= 7 && h < 17 && !p.sleeping && !p.carriedBy && !p.labor && G.Family.age(S, p) >= 12 && (!p.act || p.act.type !== 'greve') &&
      (p.greveAt === undefined || S.t - p.greveAt > 2 * C.DAY_MIN) && S.rng.chance(0.25)) {
      p.greveAt = S.t;
      G.AI.abort(S, p);
      G.AI.startGreve(S, p);
      Sim.toast(S, p.name + ' entrou em greve: "Chega! Não aguento mais."', 'bad');
    }
  }
  function warn(S, p, k, cond, text) {
    if (cond && !p.warned[k]) { p.warned[k] = true; Sim.toast(S, text, 'bad'); }
    else if (!cond && p.warned[k]) p.warned[k] = false;
  }

  // ---------- ciclos ----------
  function daily(S) {
    const ck = S.ck, w = S.world;
    const per = C.BUSH_DAYS_PER_FRUIT[ck.season];
    const bm = G.Narr ? G.Narr.bushMult(S) : 1;   // seca para, fartura acelera
    for (const o of w.objs) {
      if (o.k === 'bush') {
        if (ck.season === 3) { o.fruit = 0; o.grow = 0; continue; }   // o inverno derruba as frutas que sobraram
        if (per > 0 && bm > 0 && o.fruit < C.BUSH_MAX) {
          o.grow += bm / per;
          if (o.grow >= 1) { const add = Math.floor(o.grow); o.fruit = Math.min(C.BUSH_MAX, o.fruit + add); o.grow -= add; }
        }
      } else if (o.k === 'stump') {
        o.regrow = (o.regrow || 0) + 1;
        const i = o.y * w.W + o.x;
        if (o.regrow >= C.TREE_REGROW_DAYS && w.bgrid[i] < 0 && !Sim.isCamp(S, i) &&
          !S.people.some((p) => p.alive && Math.floor(p.x) === o.x && Math.floor(p.y) === o.y)) {
          o.k = 'tree'; o.regrow = 0; G.W.refreshBlock(w, i);
        }
      }
    }
    // comida estraga no estoque: calor apressa, frio conserva
    const rm = C.ROT_SEASON[ck.season];
    rot(S, 'frutas', C.ROT_FRUIT * rm);
    rot(S, 'peixe', C.ROT_FISH * rm);
    const season = C.SEASONS[ck.season];
    if (ck.dos === 1 && ck.day > 0) {
      if (ck.season === 3) Sim.chron(S, S.stats.winters === 0 ? 'Chegou o primeiro inverno.' : 'Começou o inverno.');
      else if (ck.season === 0) {
        S.stats.winters++;
        const alive = S.people.filter((p) => p.alive);
        if (S.stats.winters === 1 && alive.length) Sim.chron(S, 'O primeiro inverno terminou. ' + listNames(alive) + (alive.length > 1 ? ' sobreviveram.' : ' sobreviveu.'));
        else Sim.toast(S, 'Começou a ' + season.toLowerCase() + '.');
      } else Sim.toast(S, 'Começou o ' + season.toLowerCase() + '.');
    }
    const dw = Sim.daysToWinter(S);
    if (dw === 10 || dw === 5) Sim.toast(S, 'O inverno chega em ' + dw + ' dias. Estoque comida e lenha.', 'warn');
    G.Family.daily(S);
    if (G.Narr) G.Narr.daily(S);
  }
  function rot(S, k, rate) {
    const acc = S.stats.rotAcc || (S.stats.rotAcc = {});
    acc[k] = (acc[k] || 0) + S.stock[k] * rate;
    const n = Math.floor(acc[k]);
    if (n > 0) {
      const lost = Math.min(n, S.stock[k]);
      S.stock[k] -= lost; acc[k] -= n;
      S.stats.rotted = (S.stats.rotted || 0) + lost;
      S.stats.rottedToday = lost;
    } else S.stats.rottedToday = 0;
  }
  function listNames(arr) {
    const n = arr.map((p) => p.name);
    return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1];
  }
  Sim.listNames = listNames;

  function hourly(S) {
    countBushFruit(S);
    const low = S.ctx.foodDays < 2 && S.ctx.bushFruit < 6;
    if (low && !S.stats.foodWarn) { S.stats.foodWarn = true; Sim.toast(S, 'A comida está acabando. Suba Pesca ou Frutas nas Vontades.', 'warn'); }
    else if (S.ctx.foodDays > 4) S.stats.foodWarn = false;
    for (const p of S.people) if (p.alive) hourlyPerson(S, p);
    G.Family.hourly(S);
    if (G.Narr) G.Narr.hourly(S);
    checkGoals(S);
  }

  function checkGoals(S) {
    const st = S.stock;
    const test = {
      fogo: () => S.stats.firstFire,
      barraca: () => S.stats.firstTent,
      comida: () => st.frutas + st.peixe >= C.GOAL_FOOD,
      lenha: () => st.madeira >= C.GOAL_WOOD,
      inverno: () => S.stats.winters >= 1 && S.people.some((p) => p.alive),
    };
    for (const g of S.goals) {
      const fn = test[g.id] || (G.Family.goalTest[g.id] && (() => G.Family.goalTest[g.id](S)));
      if (!g.done && fn && fn()) { g.done = true; Sim.toast(S, 'Meta cumprida: ' + g.text.toLowerCase() + '.', 'good'); }
    }
    if (!S.goalsPhase || S.goalsPhase === 1) {
      if (!S.stats.allGoals && S.goals.every((g) => g.done)) {
        S.stats.allGoals = true;
        Sim.chron(S, 'A base está pronta. O povo aprendeu a atravessar o inverno.');
      }
      if (S.stats.allGoals) {
        S.goalsPhase = 2; S.goals = G.Family.goals2();
        Sim.toast(S, 'Novas metas: a família.', 'good');
        checkGoals(S);
      }
    } else if (S.goalsPhase === 2 && !S.stats.famGoals && S.goals.every((g) => g.done)) {
      S.stats.famGoals = true;
      Sim.chron(S, 'A família cresceu. O povo já se sustenta com as próprias mãos.');
    }
  }

  function updateBuildings(S, dt) {
    for (const b of S.buildings) {
      if (b.type === 'fogueira' && b.built && b.fuel > 0) {
        b.fuel -= dt / 60 / C.FIRE_BURN_H * (S.precip === 'chuva' ? C.FIRE_RAIN : 1) * (G.Narr ? G.Narr.fireMult(S) : 1);
        if (b.fuel <= 0) {
          b.fuel = 0;
          if (S.temp < 14 && S.people.some((p) => p.alive)) Sim.toast(S, 'A fogueira apagou.', 'warn');
        }
      }
    }
  }

  // ---------- morte ----------
  function die(S, p) {
    p.alive = false; p.diedAt = S.t;
    const d = p.dmg;
    p.cause = d.frio >= d.fome && d.frio >= d.sede ? 'frio' : d.sede >= d.fome ? 'sede' : 'fome';
    if ((d.raio || 0) > 0 && p.needs.saude <= 0 && (d.raio || 0) >= Math.max(d.frio, d.fome, d.sede)) p.cause = 'raio';
    if ((d.parto || 0) > 0 && (d.parto || 0) >= Math.max(d.frio, d.fome, d.sede, d.raio || 0)) p.cause = 'parto';
    if ((d.lobo || 0) > 0 && d.lobo >= Math.max(d.frio, d.fome, d.sede, d.raio || 0, d.parto || 0)) p.cause = 'lobos';
    if (d.velhice) p.cause = 'velhice';
    S.stats.lastDeathAt = S.t;   // o Narrador dá um respiro depois de uma perda
    if (G.Narr) G.Narr.onDeath(S);
    G.AI.abort(S, p);
    p.sleeping = false;
    if (p.inTent) { const b = Sim.building(S, p.inTent); if (b) { p.x = b.x + 1; p.y = b.y + b.h + 0.5; } p.inTent = 0; }
    for (const b of S.buildings) b.beds = b.beds.filter((id) => id !== p.id);
    const w = S.world;
    const r = G.W.findNearest(w, Math.floor(p.y) * w.W + Math.floor(p.x),
      (i) => (!G.W.objAt(w, i) && w.bgrid[i] < 0 && !Sim.isCamp(S, i) && !G.IS_WATER[w.tile[i]] ? 1 : 0), 30);
    if (r) G.W.addObj(w, 'grave', r.idx % w.W, (r.idx / w.W) | 0, { name: p.name });
    const causeTxt = { frio: 'de frio', sede: 'de sede', fome: 'de fome', raio: 'atingid' + (p.sex === 'F' ? 'a' : 'o') + ' por um raio', parto: 'no parto', velhice: 'de velhice', lobos: 'no ataque dos lobos' }[p.cause];
    const age = Sim.ageOf(S, p);
    Sim.chron(S, p.name + ' morreu ' + causeTxt + (age < 1 ? ', com poucos meses.' : ', ' + (age < 12 ? 'com ' : 'aos ') + age + (age === 1 ? ' ano.' : ' anos.')));
    G.Family.onDeath(S, p);
    for (const q of S.people) if (q.alive && !q.mem.some((m) => m.k === 'perdeuCompanheiro' || m.k === 'perdeuFamilia')) Sim.addMem(S, q, 'perdeuAlguem');
    G.God.onDeath(S, p);
    if (!S.people.some((q) => q.alive)) {
      S.over = true;
      Sim.chron(S, 'O povo se foi. Restam os túmulos e esta crônica.');
      S.events.push({ k: 'over' });
    }
  }

  // ---------- névoa: Deus vê e age só onde o povo já esteve ----------
  function reveal(S, x, y, r) {
    const w = S.world, seen = S.seen;
    let n = 0;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(w.W - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(w.H - 1, Math.ceil(y + r));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * w.W + tx;
      if (!seen[i] && (tx + 0.5 - x) ** 2 + (ty + 0.5 - y) ** 2 <= r * r) { seen[i] = 1; n++; }
    }
    if (n) S.seenRev = (S.seenRev || 0) + 1;
    return n;
  }
  Sim.reveal = reveal;
  Sim.isSeen = function (S, x, y) {
    const w = S.world;
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return false;
    return !S.seen || S.seen[y * w.W + x] === 1;
  };
  function lookAround(S, p) {
    const i = Math.floor(p.y) * S.world.W + Math.floor(p.x);
    if (p.seenTile === i) return;
    p.seenTile = i;
    reveal(S, Math.floor(p.x) + 0.5, Math.floor(p.y) + 0.5, C.SEE_R);
  }

  // a fogueira aquece bem só quem cabe em volta dela: os mais perto ganham o lugar
  function fireSeats(S) {
    const out = [];
    for (const p of S.people) { if (p.alive && p.sleeping && !p.inTent && !p.carriedBy) out.push(p); else p.fireShare = 1; }
    if (!out.length) return;
    for (const p of out) p.fireShare = C.FIRE_CROWD;
    for (const b of S.buildings) {
      if (b.type !== 'fogueira' || !b.built || b.fuel <= 0) continue;
      const near = out.filter((p) => Math.hypot(b.x + 0.5 - p.x, b.y + 0.5 - p.y) < C.FIRE_MAX_R && p.fireShare < 1)
        .sort((a, c) => Math.hypot(b.x + 0.5 - a.x, b.y + 0.5 - a.y) - Math.hypot(b.x + 0.5 - c.x, b.y + 0.5 - c.y) || a.id - c.id);
      for (let i = 0; i < Math.min(C.FIRE_SEATS, near.length); i++) near[i].fireShare = 1;
    }
  }

  // ---------- passo ----------
  Sim.step = function (S, dt) {
    if (S.over) return;
    const prevHour = Math.floor(S.t / 60), prevDay = Math.floor(S.t / C.DAY_MIN);
    S.t += dt;
    S.ck = clock(S.t);
    const newDay = Math.floor(S.t / C.DAY_MIN) !== prevDay;
    S.precip = precipNow(S);
    S.temp = ambient(S);
    if (newDay) { daily(S); G.God.daily(S); }
    if (Math.floor(S.t / 60) !== prevHour) { hourly(S); G.God.hourly(S); }
    updateBuildings(S, dt);
    Sim.refresh(S);
    fireSeats(S);
    for (const p of S.people) {
      if (!p.alive || p.carriedBy) continue;
      p.px = p.x; p.py = p.y;
      G.AI.tick(S, p, dt);
      updateNeeds(S, p, dt);
      if (S.seen) lookAround(S, p);
    }
    for (const p of S.people) {
      if (!p.alive || !p.carriedBy) continue;
      if (G.Family.followCarrier(S, p)) updateNeeds(S, p, dt);
      else p.needs.saude = -999;
    }
    if (G.Narr) G.Narr.step(S, dt);   // lobos e viajantes
    for (const p of S.people) if (p.alive && p.needs.saude <= 0) die(S, p);
  };
  Sim.advance = function (S, minutes) {
    const steps = Math.round(minutes / C.STEP_MIN);
    for (let i = 0; i < steps && !S.over; i++) Sim.step(S, C.STEP_MIN);
  };
  Sim.init = function (S) {
    G.God.init(S);
    G.Family.init(S);
    if (G.Narr) G.Narr.init(S);
    if (!S.seen) {
      S.seen = new Uint8Array(S.world.W * S.world.H);
      reveal(S, S.camp.x + 1, S.camp.y + 1, S.t > C.START_HOUR * 60 + 60 ? C.SEE_OLD_SAVE : C.SEE_CAMP);
    }
    S.seenRev = (S.seenRev || 0) + 1;
    for (const p of S.people) if (p.alive) { p.seenTile = -1; lookAround(S, p); }
    S.ck = clock(S.t);
    S.precip = precipNow(S);
    S.temp = ambient(S);
    Sim.refresh(S);
    countBushFruit(S);
  };
})(globalThis.G = globalThis.G || {});
