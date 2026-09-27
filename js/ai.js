/* Gênesis · IA utilitária e ações dos cidadãos. Sem DOM.
   Cada cidadão dá nota a cada ação possível e executa a maior.
   As Vontades de Deus pesam no trabalho; as necessidades pesam mais quando apertam. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U, W = G.W, Sim = G.Sim;
  const AI = G.AI = {};
  const RUN = 0, DONE = 1, FAIL = -1;
  const DONE_QUIET = 2;   // terminou, mas sem o "bom dia" (acordou de madrugada para beber, por exemplo)

  const WORK = ['frutas', 'agua', 'madeira', 'pedra', 'pesca', 'construir', 'fogo'];
  const WORK_SET = new Set(WORK);
  const SKILL_OF = { frutas: 'coleta', agua: 'coleta', madeira: 'coleta', pedra: 'coleta', pesca: 'pesca', construir: 'construcao', fogo: null };
  // reavaliadas a cada 20 min; alimentar o fogo não (é rápido, e largar no meio devolvia a lenha e recomeçava sem fim)
  const REEVAL = new Set(WORK.filter((w) => w !== 'fogo').concat(['vagar', 'brincar', 'aquecer', 'depositar']));
  const Fam = G.Family;
  AI.WORK = WORK;
  AI.LABEL = { frutas: 'Frutas', agua: 'Água', madeira: 'Madeira', pedra: 'Pedra', pesca: 'Pesca', construir: 'Construir', fogo: 'Fogo' };
  AI.SKILL_LABEL = { coleta: 'Coleta', pesca: 'Pesca', construcao: 'Construção' };
  const RES_LABEL = { madeira: 'madeira', pedra: 'pedra', agua: 'água', frutas: 'frutas', peixe: 'peixe' };

  const LINES = {
    chegada: ['Chegamos.', 'Que lugar bonito.', 'Vamos ficar aqui.'],
    chegada2: ['Aqui tem futuro.', 'Vai dar certo.', 'É aqui.'],
    frio: ['Que frio!', 'Tô congelando…', 'Brr…'],
    sede: ['Tô morrendo de sede.', 'Preciso de água.'],
    fome: ['Que fome…', 'Minha barriga tá roncando.'],
    sono: ['Tô morto de sono.', 'Boa noite.', 'Até amanhã.'],
    acordar: ['Bom dia!', 'Dormi bem.', 'Que noite…', 'Mais um dia.'],
    madeira: ['Vou buscar lenha.', 'Mais madeira!'],
    pedra: ['Vou atrás de pedra.', 'Essa pedra serve.'],
    frutas: ['Olha, pitanga!', 'Vou colher frutas.'],
    agua: ['Vou encher as cabaças.'],
    pesca: ['Hoje tem peixe.', 'Vou pescar.'],
    peixe: ['Pesquei um!', 'Olha o tamanho desse!'],
    semPeixe: ['Nada hoje…', 'Os peixes fugiram.'],
    construir: ['Mãos à obra.', 'Vai ficar bonito.'],
    fogo: ['Vou cuidar do fogo.', 'O fogo tá baixo.'],
    chat: ['Lembra da nossa terra?', 'Você viu aquilo no céu?', 'Acho que alguém olha por nós.', 'Amanhã a gente termina.',
      'Ha ha!', 'Que dia…', 'Que bom que você tá aqui.', 'E se vier mais gente?', 'O inverno me assusta.'],
    greve: ['Chega! Não aguento mais.'],
    deus: ['Senti algo… uma presença.', 'Tem alguém aí em cima?', 'Estamos sendo vigiados?', 'Obrigado, céu.'],
    quente: ['Que calorzinho bom.'],
    casal: ['Que bom que você tá aqui.', 'Lembra quando a gente chegou?', 'Vamos dar conta.', 'Você é a minha casa.', 'Olha o céu hoje.'],
    crianca: ['Mãe, olha!', 'Pai, me ensina?', 'Quando eu crescer vou pescar.', 'Conta uma história?', 'Tô com fome!', 'Por que o céu é azul?'],
    brincar: ['Pega-pega!', 'Não me pega!', 'Achei uma pedra bonita!', 'Olha o que eu sei fazer!', 'Ha ha ha!'],
    parto: ['Tá vindo…', 'Respira…', 'Aguenta firme.'],
    lobos: ['Lobos!', 'Corre pro fogo!', 'Tem lobo aqui!'],
  };
  AI.LINES = LINES;

  // ---------- utilidades ----------
  const has = (p, t) => p.traits.indexOf(t) >= 0;
  function urg(v) { const u = (100 - v) / 100; return u <= 0 ? 0 : u * u; }
  function lvl(p, sk) { return Math.min(C.SKILL_MAX, Math.floor(Math.sqrt((p.skills[sk] || 0) / C.SKILL_XP_DIV))); }
  AI.lvl = lvl;
  let curS = null;   // estado do passo atual (para a fase da vida)
  function workSpeed(p, sk) {
    let s = 1 + C.SKILL_BONUS * (sk ? lvl(p, sk) : 0);
    if (curS) s *= Fam.workFactor(curS, p);
    if (has(p, 'Trabalhador')) s *= 1.15;
    if (has(p, 'Preguiçoso')) s *= 0.85;
    if (p.needs.energia < 15) s *= 0.8;
    return s;
  }
  function tileOf(S, p) { return Math.floor(p.y) * S.world.W + Math.floor(p.x); }
  // quem carrega um bebê sente o frio dele também
  function feltCold(S, p) {
    let c = p.needs.calor;
    for (const b of S.people) if (b.alive && b.carriedBy === p.id && b.needs.calor < c) c = b.needs.calor;
    return c;
  }
  function person(S, id) { for (const q of S.people) if (q.id === id) return q; return null; }
  AI.person = person;
  function say(S, p, key, chance, force) {
    if (chance !== undefined && S.rng.next() > chance) return;
    Sim.say(S, p, S.rng.pick(LINES[key]), force);
  }
  function setPath(p, path) { p.path = path && path.length ? path : null; p.pathI = 0; }
  function moving(p) { return !!(p.path && p.pathI < p.path.length); }
  function face(p, tx, ty) {
    const dx = tx + 0.5 - p.x, dy = ty + 0.5 - p.y;
    if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) return;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 2 : 3; else p.dir = dy > 0 ? 0 : 1;
  }
  function faceIdx(S, p, i) { face(p, i % S.world.W, (i / S.world.W) | 0); }

  function route(S, p, test, maxCost) {
    const r = W.findNearest(S.world, tileOf(S, p), test, maxCost || 160);
    if (!r) return null;
    setPath(p, r.path);
    return r;
  }
  function toCamp(S, p) { return route(S, p, (i) => (Sim.isCamp(S, i) ? 1 : 0), 180); }
  function toBuilding(S, p, b) {
    const w = S.world;
    return route(S, p, (i) => {
      const x = i % w.W, y = (i / w.W) | 0;
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return 0;
      return x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h ? 1 : 0;
    }, 180);
  }
  function litFires(S) { return S.buildings.filter((b) => b.type === 'fogueira' && b.built && b.fuel > 0); }
  function litNearCamp(S) {
    return litFires(S).some((b) => Math.abs(b.x - S.camp.x) <= 8 && Math.abs(b.y - S.camp.y) <= 8);
  }
  function othersDoing(S, p, type) { return S.people.some((q) => q !== p && q.alive && q.act && q.act.type === type); }
  function fishTaken(S, p, i) { return S.people.some((q) => q !== p && q.alive && q.act && q.act.type === 'pesca' && q.act.spot === i); }

  function deposit(S, p) {
    const c = p.carry; if (!c) return;
    // o primeiro filho que ajuda: o portão da Etapa 3
    if ((p.mother || p.father) && Fam.age(S, p) < 18 && c.k !== 'obra' && !S.stats.childHelped) {
      S.stats.childHelped = true;
      Sim.chron(S, p.name + ' ajudou pela primeira vez: trouxe ' + c.n + ' de ' + RES_LABEL[c.k] + ' para o estoque.');
    }
    if (c.k === 'obra') { S.stock.madeira += c.madeira || 0; S.stock.pedra += c.pedra || 0; }
    else if (c.k === 'agua') S.stock.agua = Math.min(C.WATER_CAP, S.stock.agua + c.n);
    else S.stock[c.k] += c.n;
    if (c.k !== 'obra') Sim.float(S, S.camp.x + 1, S.camp.y + 0.6, '+' + c.n + ' ' + RES_LABEL[c.k]);
    p.carry = null;
  }

  // ---------- movimento ----------
  function move(S, p, dt) {
    if (!p.path) return;
    const w = S.world;
    let mult = Fam.walkFactor(S, p);
    if (has(p, 'Ágil')) mult *= 1.15;
    if (p.needs.energia < 15) mult *= 0.8;
    if (S.ck.season === 3) mult /= C.SNOW_SLOW;
    mult *= G.Narr.walkMult(S);   // nevasca: neve pelos joelhos
    if (p.carry && p.carry.n >= 6) mult *= 0.92;
    let budget = dt / C.WALK_MIN_PER_TILE * mult, guard = 0;
    while (budget > 1e-6 && p.path && p.pathI < p.path.length && guard++ < 24) {
      const idx = p.path[p.pathI];
      if (w.block[idx]) {
        const goal = p.path[p.path.length - 1];
        const np = w.block[goal] ? null : W.findPath(w, tileOf(S, p), goal, 300);
        if (!np) { p.path = null; p.stuck = true; return; }
        setPath(p, np);
        continue;
      }
      const tx = (idx % w.W) + 0.5, ty = ((idx / w.W) | 0) + 0.5;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      const cost = C.COST[w.tile[idx]] * (w.slow[idx] ? 2 : 1);
      const can = budget / cost;
      if (d > 1e-6) { if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 2 : 3; else p.dir = dy > 0 ? 0 : 1; }
      if (d <= can) { p.x = tx; p.y = ty; budget -= d * cost; p.pathI++; p.walk += d; }
      else { p.x += dx / d * can; p.y += dy / d * can; p.walk += can; budget = 0; }
    }
    if (p.path && p.pathI >= p.path.length) p.path = null;
  }

  // ---------- barracas ----------
  function pickTent(S, p) {
    const tents = S.buildings.filter((b) => b.built && C.BUILD[b.type].cap);
    if (!tents.length) return null;
    const cap = (b) => C.BUILD[b.type].cap;
    const mate = Fam.partnerOf(S, p);
    let mine = tents.find((b) => b.beds.indexOf(p.id) >= 0);
    if (mine && Fam.tentLoad(S, mine) > cap(mine)) {
      // passou do limite (alguém cresceu): sai primeiro quem não está com o par na barraca, o maior e mais velho
      const paired = (id) => { const q = person(S, id); return !!(q && q.partner && mine.beds.indexOf(q.partner) >= 0); };
      const out = mine.beds.filter((id) => !paired(id)).map((id) => person(S, id)).filter(Boolean)
        .sort((a, b) => Fam.bedUnits(S, b) - Fam.bedUnits(S, a) || a.born - b.born)[0] || p;
      mine.beds.splice(mine.beds.indexOf(out.id), 1);
      if (out === p) mine = null;
    }
    if (mine) return mine;
    const mateTent = mate ? tents.find((b) => b.beds.indexOf(mate.id) >= 0) : null;
    const need = (g) => g.reduce((n, q) => n + Fam.bedUnits(S, q), 0);
    const fits = (b, g) => Fam.tentLoad(S, b) + need(g) <= cap(b);
    const holds = (b, ids) => b.beds.some((id) => ids.indexOf(id) >= 0);
    const parents = [p.mother, p.father].filter(Boolean);
    const kids = S.people.filter((q) => q.mother === p.id || q.father === p.id).map((q) => q.id);
    // casal dorme junto; criança perto dos pais; depois barraca vazia; depois qualquer lugar
    const choose = (g) => (mateTent && fits(mateTent, g) ? mateTent : null) ||
      tents.find((b) => fits(b, g) && holds(b, parents)) || tents.find((b) => fits(b, g) && holds(b, kids)) ||
      tents.find((b) => fits(b, g) && !b.beds.length) || tents.find((b) => fits(b, g));
    let g = mate && !mateTent ? [p, mate] : [p], pick = choose(g);
    if (!pick && g.length > 1) { g = [p]; pick = choose(g); }
    if (!pick) return null;
    for (const q of g) if (pick.beds.indexOf(q.id) < 0) pick.beds.push(q.id);
    return pick;
  }
  function enterTent(S, p, b) { p.inTent = b.id; p.x = b.x + 1; p.y = b.y + 1; p.px = p.x; p.py = p.y; }
  function exitTent(S, p) {
    const b = Sim.building(S, p.inTent);
    p.inTent = 0;
    if (!b) return;
    const w = S.world;
    const cands = [[b.x + 1, b.y + b.h], [b.x, b.y + b.h], [b.x - 1, b.y + 1], [b.x + b.w, b.y + 1], [b.x, b.y - 1], [b.x + 1, b.y - 1]];
    for (const [x, y] of cands) {
      if (x >= 0 && y >= 0 && x < w.W && y < w.H && !w.block[y * w.W + x] && !w.slow[y * w.W + x]) {
        p.x = x + 0.5; p.y = y + 0.5; p.px = p.x; p.py = p.y; return;
      }
    }
  }

  // ---------- ações ----------
  const ACT = {};

  ACT.chegar = {
    start() { return true; },
    run(S, p, a, dt) {
      if (moving(p)) return RUN;
      if (!a.said) {
        a.said = true; p.dir = 0;
        Sim.addMem(S, p, 'chegada');
        say(S, p, p === S.people[0] ? 'chegada' : 'chegada2', 1, true);
      }
      if (!S.arrived && S.people.every((q) => !q.alive || !q.act || q.act.type !== 'chegar' || !moving(q))) {
        S.arrived = true;
        Sim.chron(S, Sim.listNames(S.people.filter((q) => q.alive)) + ' chegaram ' + S.siteLabel + '.');
        S.events.push({ k: 'arrived' });
      }
      a.t += dt;
      return a.t >= 30 ? DONE : RUN;
    },
  };

  ACT.depositar = {
    start(S, p) { return !!p.carry && !!toCamp(S, p); },
    run(S, p) {
      if (moving(p)) return RUN;
      if (p.stuck) return FAIL;
      deposit(S, p);
      return DONE;
    },
  };

  ACT.beber = {
    start(S, p, a) {
      const w = S.world, here = tileOf(S, p);
      const wr = W.findNearest(w, here, (i) => (W.waterAdj(w, i) >= 0 ? 1 : 0), 90);
      if (S.stock.agua > 0) {
        const cr = W.findNearest(w, here, (i) => (Sim.isCamp(S, i) ? 1 : 0), 180);
        // com lobos rondando, bebe do estoque, perto do fogo
        if (cr && (!wr || cr.cost <= wr.cost + 3 || G.Narr.wolvesOut(S))) { a.src = 'estoque'; setPath(p, cr.path); return true; }
      }
      if (!wr) return false;
      a.src = 'fonte'; a.water = W.waterAdj(w, wr.idx); setPath(p, wr.path);
      return true;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'drink'; a.t = 0;
        if (a.src === 'fonte') { const wi = W.waterAdj(S.world, tileOf(S, p)); if (wi >= 0) faceIdx(S, p, wi); }
      }
      a.t += dt;
      if (a.t < 10) return RUN;
      const n = p.needs;
      if (a.src === 'estoque') {
        const units = Math.min(S.stock.agua, Math.ceil((100 - n.sede) / C.WATER_DRINK));
        if (units <= 0) {
          // a água do estoque acabou enquanto chegava: vai beber na fonte (antes ficava meia hora sem poder beber)
          const w = S.world, wr = W.findNearest(w, tileOf(S, p), (i) => (W.waterAdj(w, i) >= 0 ? 1 : 0), 90);
          if (!wr) return FAIL;
          a.src = 'fonte'; a.stage = 'go'; a.t = 0; setPath(p, wr.path);
          return RUN;
        }
        S.stock.agua -= units; n.sede = Math.min(100, n.sede + units * C.WATER_DRINK);
      } else n.sede = 100;
      return DONE;
    },
  };

  ACT.comer = {
    start(S, p, a) {
      const w = S.world, here = tileOf(S, p);
      const r = W.findNearest(w, here, (i) => W.adjObj(w, i, (o) => o.k === 'bush' && o.fruit > 0 && !o.res), 60);
      const food = S.stock.frutas + S.stock.peixe;
      if (food > 0) {
        const cr = W.findNearest(w, here, (i) => (Sim.isCamp(S, i) ? 1 : 0), 180);
        // longe de casa, com fruta no pé logo ali (ou quase nada no estoque): come no arbusto
        const bushFirst = r && (!cr || r.cost + 12 < cr.cost || food < 3);
        if (cr && !bushFirst) { a.src = 'estoque'; setPath(p, cr.path); return true; }
      }
      if (!r) return false;
      a.src = 'arbusto'; a.obj = r.data; a.obj.res = p.id; setPath(p, r.path);
      return true;
    },
    run(S, p, a, dt) {
      const n = p.needs;
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'eat'; a.t = 0; a.next = 0;
        if (a.obj) face(p, a.obj.x, a.obj.y);
      }
      a.t += dt;
      if (a.t < a.next) return RUN;
      if (n.fome >= 88) return DONE;
      if (a.src === 'estoque') {
        const st = S.stock;
        if (st.peixe > 0 && litNearCamp(S)) { st.peixe--; n.fome += C.FISH_COOKED; Sim.addMem(S, p, 'comeuQuente'); a.next = a.t + 25; a.hot = true; }
        else if (st.frutas > 0) { st.frutas--; n.fome += C.FRUIT_FOOD; a.next = a.t + 6; }
        else if (st.peixe > 0) { st.peixe--; n.fome += C.FISH_RAW; Sim.addMem(S, p, 'comeuCru'); a.next = a.t + 12; }
        else {
          if (n.fome > 40) return DONE;
          // o estoque acabou enquanto chegava: tenta um arbusto com fruta por perto
          const w = S.world, r = W.findNearest(w, tileOf(S, p), (i) => W.adjObj(w, i, (o) => o.k === 'bush' && o.fruit > 0 && !o.res), 60);
          if (!r) return FAIL;
          a.src = 'arbusto'; a.obj = r.data; a.obj.res = p.id; a.stage = 'go'; a.t = 0; setPath(p, r.path);
          return RUN;
        }
      } else {
        const o = a.obj;
        if (o.k !== 'bush' || o.fruit <= 0) return a.ate ? DONE : FAIL;
        o.fruit--; n.fome += C.FRUIT_FOOD; a.ate = true; a.next = a.t + 6;
      }
      n.fome = Math.min(100, n.fome);
      return RUN;
    },
  };

  ACT.dormir = {
    start(S, p, a) {
      const w = S.world, fires = litFires(S), auras = S.god ? S.god.auras : [];
      // gelado, com fogo aceso: dorme junto do fogo esta noite (a barraca fria não esquenta ninguém)
      const frozen = feltCold(S, p) < C.SLEEP_BY_FIRE && (fires.length || auras.length);
      const tent = frozen ? null : pickTent(S, p);
      if (tent && toBuilding(S, p, tent)) { a.tent = tent.id; return true; }
      let r = null;
      if (fires.length || auras.length) {
        // dorme perto do fogo ou dentro do Calor de Deus
        r = W.findNearest(w, tileOf(S, p), (i) => {
          const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
          if (fires.some((f) => Math.hypot(x - f.x - 0.5, y - f.y - 0.5) <= C.FIRE_FULL_R)) return 1;
          return auras.some((g) => Math.hypot(x - g.x - 0.5, y - g.y - 0.5) <= g.r * 0.55) ? 1 : 0;
        }, 140);
      }
      a.byFire = !!r;
      if (!r) r = W.findNearest(w, tileOf(S, p), (i) => (Sim.isCamp(S, i) ? 1 : 0), 180);
      setPath(p, r ? r.path : null);
      return true;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        a.stage = 'sleep'; a.t = 0; p.sleeping = true; p.dir = 0;
        if (a.tent && !p.stuck) { const b = Sim.building(S, a.tent); if (b && b.built) enterTent(S, p, b); }
        say(S, p, 'sono', 0.3);
      }
      a.t += dt;
      const n = p.needs, h = S.ck.hour, day = h >= 6 && h < 19;
      if (day && n.energia >= 75) return DONE;
      // Daqui para baixo, quem acorda fica um tempo sem poder deitar de novo (p.fail.dormir).
      // Sem isso, deitava no mesmo instante e ficava entrando e saindo da barraca,
      // ou, com sono demais, levantava para beber e deitava de novo sem nunca chegar à água.
      // acorda para beber ou comer (comer só se houver comida): alguns minutos bastam para escolher ir
      // (se beber ou comer está bloqueado agora, não adianta acordar: levantava e desmaiava de novo sem parar)
      if ((n.sede < 10 && !(p.fail.beber > S.t)) || (n.fome < 8 && (S.ctx.food > 0 || S.ctx.bushFruit > 0) && !(p.fail.comer > S.t))) { p.fail.dormir = S.t + 6; return DONE_QUIET; }
      // frio demais aqui, sem fogo por perto: levanta para se aquecer ou rezar (meia hora)
      // (quem desmaiou de cansaço só acorda assim depois de recuperar um pouco)
      if (feltCold(S, p) < 12 && !(a.faint && n.energia < 20) && Math.max(Sim.fireHeat(S, p.x, p.y), G.God.heatAt(S, p.x, p.y)) < 5) return FAIL;
      // descansado de madrugada: levanta se houver algo que valha mais que ficar deitado (olha a cada meia hora)
      if (n.energia >= 99 && S.t >= (a.look || 0)) {
        a.look = S.t + 30;
        let me = 0, best = 0;
        for (const c of scoreList(S, p)) { if (c.type === 'dormir') me = Math.max(me, c.score); else best = Math.max(best, c.score); }
        if (best > me + 5) return FAIL;
      }
      return RUN;
    },
    end(S, p, a, r) {
      if (!p.sleeping) return;
      p.sleeping = false;
      if (a.t >= 240) {
        const b = p.inTent ? Sim.building(S, p.inTent) : null;
        Sim.addMem(S, p, b ? (b.type === 'barraca2' ? 'dormiuBem' : 'dormiuBarraca') : 'dormiuRelento');
      }
      if (p.inTent) exitTent(S, p);
      if (r === DONE) say(S, p, 'acordar', 0.35);
    },
  };

  ACT.aquecer = {
    start(S, p, a) {
      const w = S.world, fires = litFires(S), auras = S.god ? S.god.auras : [];
      if (fires.length || auras.length) {
        // fogueira acesa ou o Calor de Deus: o que estiver mais perto
        const r = route(S, p, (i) => {
          const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
          if (fires.some((f) => Math.hypot(x - f.x - 0.5, y - f.y - 0.5) <= C.FIRE_FULL_R)) return 1;
          return auras.some((g) => Math.hypot(x - g.x - 0.5, y - g.y - 0.5) <= g.r * 0.55) ? 1 : 0;
        }, 140);
        if (r) { a.src = 'fogo'; return true; }
      }
      const tent = pickTent(S, p);
      if (tent && toBuilding(S, p, tent)) { a.src = 'barraca'; a.tent = tent.id; return true; }
      return false;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'warm'; a.t = 0;
        if (a.src === 'barraca') { const b = Sim.building(S, a.tent); if (!b) return FAIL; enterTent(S, p, b); }
        else if (G.God.heatAt(S, p.x, p.y) > Sim.fireHeat(S, p.x, p.y)) a.src = 'aura';
        else { const f = litFires(S)[0]; if (f) face(p, f.x, f.y); }
      }
      a.t += dt;
      if (feltCold(S, p) >= 95 || a.t > 150) return DONE;
      if (a.src === 'fogo' && !S.ctx.fireLit) return FAIL;
      if (a.src === 'aura' && !(G.God.heatAt(S, p.x, p.y) > 0)) return FAIL;
      if (a.t > 30 && p.needs.calor > 60 && S.rng.next() < 0.004) say(S, p, 'quente');
      return RUN;
    },
    end(S, p) { if (p.inTent && !p.sleeping) exitTent(S, p); },
  };

  ACT.conversar = {
    start(S, p, a) {
      const q = person(S, a.q);
      if (!q || !q.alive || q.sleeping || q.inTent) return false;
      const w = S.world, qi = tileOf(S, q), qx = qi % w.W, qy = (qi / w.W) | 0;
      const r = route(S, p, (i) => {
        if (i === qi) return 0;
        const x = i % w.W, y = (i / w.W) | 0;
        return Math.max(Math.abs(x - qx), Math.abs(y - qy)) <= 1 ? 1 : 0;
      }, 40);
      if (!r) return false;
      AI.abort(S, q);
      const chat = { a: p.id, b: q.id, on: false, over: false, t: 0, dur: 40 + S.rng.int(0, 30) };
      a.chat = chat; a.with = q.id;
      q.act = { type: 'conversar', stage: 'wait', t: 0, chat, with: p.id, score: 50 };
      q.path = null;
      return true;
    },
    run(S, p, a, dt) {
      const chat = a.chat;
      if (chat.over) return chat.t >= 20 ? DONE : FAIL;
      const other = person(S, a.with);
      if (!other || !other.alive || !other.act || other.act.chat !== chat) { chat.over = true; return chat.t >= 20 ? DONE : FAIL; }
      if (chat.a === p.id) {
        if (!chat.on) {
          if (moving(p)) return RUN;
          if (p.stuck) { chat.over = true; return FAIL; }
          chat.on = true;
        }
        chat.t += dt;
        if (chat.t >= chat.dur) { chat.over = true; return DONE; }
        if (S.rng.next() < dt / 16) {
          const who = S.rng.next() < 0.5 ? p : other, kid = Fam.age(S, who) < 12;
          say(S, who, kid ? 'crianca' : p.partner === other.id ? 'casal' : 'chat', 1);
        }
      } else {
        a.t += dt;
        if (!chat.on && a.t > 90) { chat.over = true; return FAIL; }
      }
      face(p, Math.floor(other.x), Math.floor(other.y));
      return RUN;
    },
    end(S, p, a) {
      const chat = a.chat; if (!chat) return;
      chat.over = true;
      p.chatCool = S.t + 240;
      if (chat.t >= 20) {
        Sim.addMem(S, p, 'conversou'); p.rel[a.with] = (p.rel[a.with] || 0) + 1;
        if (chat.a === p.id) { const q = person(S, a.with); if (q) Fam.onChat(S, p, q); }
      }
    },
  };

  ACT.vagar = {
    start(S, p, a) {
      const w = S.world;
      a.dur = 15 + S.rng.int(0, 20);
      for (let k = 0; k < 8; k++) {
        const x = S.camp.x + S.rng.int(-5, 6), y = S.camp.y + S.rng.int(-5, 6);
        if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) continue;
        const i = y * w.W + x;
        if (w.block[i] || w.slow[i] || G.IS_WATER[w.tile[i]]) continue;
        const path = W.findPath(w, tileOf(S, p), i, 60);
        if (path) { setPath(p, path); return true; }
      }
      return true;
    },
    run(S, p, a, dt) { if (moving(p)) return RUN; a.t += dt; return a.t >= a.dur ? DONE : RUN; },
  };

  // criança brinca perto do acampamento: corre, ri e ganha companhia
  ACT.brincar = {
    start(S, p, a) {
      const w = S.world;
      a.dur = 40 + S.rng.int(0, 40); a.hops = 0;
      return hop(S, p, a, w);
    },
    run(S, p, a, dt) {
      if (moving(p)) return RUN;
      a.stage = 'play';
      a.t += dt;
      if (S.rng.next() < dt / 30) say(S, p, 'brincar', 1);
      if (a.t >= a.dur) { Sim.addMem(S, p, 'brincou'); return DONE; }
      if (a.hops < 5 && S.rng.next() < dt / 8) hop(S, p, a, S.world);
      return RUN;
    },
  };
  function hop(S, p, a, w) {
    for (let k = 0; k < 6; k++) {
      const x = S.camp.x + S.rng.int(-4, 5), y = S.camp.y + S.rng.int(-4, 5);
      if (x < 1 || y < 1 || x >= w.W - 1 || y >= w.H - 1) continue;
      const i = y * w.W + x;
      if (w.block[i] || w.slow[i] || G.IS_WATER[w.tile[i]]) continue;
      const path = W.findPath(w, tileOf(S, p), i, 40);
      if (path) { setPath(p, path); a.hops++; return true; }
    }
    return a.hops > 0;
  }

  // trabalho de parto: vai para a barraca (ou perto do fogo) e fica até o bebê nascer
  ACT.parto = {
    start(S, p, a) {
      const fires = litFires(S), w = S.world;
      const tent = pickTent(S, p);
      const tentWarm = tent && S.temp + C.BUILD[tent.type].heat >= C.COMFORT;
      if (tent && (tentWarm || !fires.length) && toBuilding(S, p, tent)) { a.tent = tent.id; return true; }
      if (fires.length) route(S, p, (i) => {
        const x = i % w.W + 0.5, y = ((i / w.W) | 0) + 0.5;
        return fires.some((f) => Math.hypot(x - f.x - 0.5, y - f.y - 0.5) <= C.FIRE_FULL_R) ? 1 : 0;
      }, 140);
      return true;
    },
    run(S, p, a, dt) {
      if (a.stage === 'go') {
        if (moving(p) && !p.stuck) return RUN;
        a.stage = 'labor'; a.t = 0; p.dir = 0;
        if (a.tent) { const b = Sim.building(S, a.tent); if (b && b.built) enterTent(S, p, b); }
      }
      a.t += dt;
      if (!p.labor) return DONE;
      if (S.rng.next() < dt / 50) say(S, p, 'parto', 1);
      return RUN;
    },
    end(S, p) { if (p.inTent && !p.sleeping) exitTent(S, p); },
  };

  ACT.greve = {
    start(S, p) { toCamp(S, p); return true; },
    run(S, p, a, dt) { if (moving(p)) return RUN; a.t += dt; return a.t >= 240 ? DONE : RUN; },
  };

  // lobos por perto: corre para o fogo aceso, a barraca ou o Calor de Deus e fica lá até eles irem embora
  ACT.fugir = {
    start(S, p, a) {
      const w = S.world, Nr = G.Narr;
      if (Nr.safeSpot(S, p)) { a.src = p.inTent ? 'barraca' : 'fogo'; a.stage = 'hide'; return true; }
      const r = route(S, p, (i) => (Nr.safeTile(S, i) ? 1 : 0), 120);
      if (r) { if (!p.path) setPath(p, [r.idx]); a.src = 'fogo'; }   // já está no tile: vai até o meio dele
      else {
        const tent = pickTent(S, p);
        if (tent && toBuilding(S, p, tent)) { a.src = 'barraca'; a.tent = tent.id; }
        else if (toCamp(S, p)) a.src = 'campo';   // sem abrigo: junto dos outros, no acampamento
        else return false;
      }
      say(S, p, 'lobos', 0.6, true);
      return true;
    },
    run(S, p, a, dt) {
      const Nr = G.Narr;
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        a.stage = 'hide'; a.t = 0; p.dir = 0;
        if (a.src === 'barraca') { const b = Sim.building(S, a.tent); if (b && b.built) enterTent(S, p, b); }
      }
      a.t += dt;
      const n = p.needs, h = S.ck.hour;
      if (!Nr.wolvesOut(S)) {
        // os lobos foram embora: quem pegou no sono continua dormindo ali mesmo
        if (p.sleeping) { p.act = { type: 'dormir', stage: 'sleep', t: a.slept || 0, score: 50, byFire: a.src === 'fogo' }; return RUN; }
        return DONE;
      }
      // o fogo apagou e aqui ficou perigoso: procura outro abrigo
      if (a.src === 'fogo' && !p.sleeping && a.t > 4 && !Nr.safeSpot(S, p)) {
        a.stage = 'go';
        return ACT.fugir.start(S, p, a) ? RUN : FAIL;
      }
      if (p.sleeping) {
        a.slept = (a.slept || 0) + dt;
        // acorda com sede, fome ou frio (a urgência decide o resto)
        if (n.sede < 10 || (n.fome < 8 && S.ctx.food > 0) || feltCold(S, p) < 12) p.sleeping = false;
      } else if (n.energia < 25 || ((h >= 21 || h < 5) && n.energia < 70)) { p.sleeping = true; p.dir = 0; }
      return RUN;
    },
    end(S, p) {
      p.sleeping = false;
      if (p.inTent) exitTent(S, p);
    },
  };

  function objOk(o, kind) {
    if (!o) return false;
    if (kind === 'madeira') return o.k === 'tree';
    if (kind === 'pedra') return o.k === 'rock' && o.ch > 0;
    if (kind === 'frutas') return o.k === 'bush';
    return true;
  }

  function gather(kind) {
    const sk = SKILL_OF[kind];
    return {
      start(S, p, a) {
        if (p.carry && p.carry.k !== kind) return false;
        if (p.carry && p.carry.n >= Fam.carryCap(S, p)) return false;
        const w = S.world;
        let test;
        if (kind === 'madeira') test = (i) => W.adjObj(w, i, (o) => o.k === 'tree' && !o.res);
        else if (kind === 'pedra') test = (i) => W.adjObj(w, i, (o) => o.k === 'rock' && o.ch > 0 && !o.res);
        else if (kind === 'frutas') test = (i) => W.adjObj(w, i, (o) => o.k === 'bush' && o.fruit > 0 && !o.res);
        else if (kind === 'agua') test = (i) => (W.waterAdj(w, i) >= 0 ? 1 : 0);
        else test = (i) => (W.waterAdj(w, i) >= 0 && W.waterCount8(w, i) >= 2 && !fishTaken(S, p, i) ? 1 : 0);
        // procura o alvo mais perto do acampamento (trabalho perto de casa), depois caminha até ele
        const campI = S.camp.y * w.W + S.camp.x;
        const r = W.findNearest(w, campI, test, C.SEARCH_MAX);
        if (!r) return false;
        const path = W.findPath(w, tileOf(S, p), r.idx, 300);
        if (!path) return false;
        setPath(p, path);
        if (typeof r.data === 'object') { a.obj = r.data; a.obj.res = p.id; }
        a.spot = r.idx; a.caught = 0;
        return true;
      },
      run(S, p, a, dt) {
        const w = S.world;
        if (a.stage === 'go') {
          if (moving(p)) return RUN;
          if (p.stuck) return FAIL;
          if (a.obj && !objOk(a.obj, kind)) return p.carry ? toHaul(S, p, a) : FAIL;
          a.stage = 'work'; a.t = 0; a.roll = 0; a.next = kind === 'frutas' ? C.HARVEST_MIN : 0;
          if (a.obj) face(p, a.obj.x, a.obj.y);
          else { const wi = W.waterAdj(w, tileOf(S, p)); if (wi >= 0) { faceIdx(S, p, wi); a.water = wi; } }
          if (!a.spoke) { a.spoke = true; say(S, p, kind, 0.3); }
        }
        if (a.stage === 'work') {
          a.t += dt * workSpeed(p, sk);
          p.skills[sk] += dt / 60 * Fam.xpFactor(S, p);
          if (kind === 'madeira') {
            if (!objOk(a.obj, kind)) return FAIL;
            if (a.t < C.CHOP_MIN) return RUN;
            a.obj.k = 'stump'; a.obj.regrow = 0; a.obj.res = 0;
            W.refreshBlock(w, a.obj.y * w.W + a.obj.x);
            p.carry = { k: 'madeira', n: C.TREE_WOOD };
            S.events.push({ k: 'fell', x: a.obj.x, y: a.obj.y });
          } else if (kind === 'pedra') {
            if (!objOk(a.obj, kind)) return FAIL;
            if (a.t < C.MINE_MIN) return RUN;
            a.obj.ch--;
            p.carry = { k: 'pedra', n: C.ROCK_STONE };
            if (a.obj.ch <= 0) W.removeObj(w, a.obj);
          } else if (kind === 'frutas') {
            const o = a.obj;
            if (a.t < a.next) return RUN;
            const cap = Fam.carryCap(S, p), full = p.carry && p.carry.n >= cap;
            if (!full && o.k === 'bush' && o.fruit > 0) {
              o.fruit--;
              if (!p.carry) p.carry = { k: 'frutas', n: 0 };
              p.carry.n++;
              a.next = a.t + C.HARVEST_FRUIT_MIN;
              return RUN;
            }
            if (!full && p.carry && p.carry.n < cap - 1) {
              o.res = 0;
              const r = W.findNearest(w, tileOf(S, p), (i) => W.adjObj(w, i, (b) => b.k === 'bush' && b.fruit > 0 && !b.res), 10);
              if (r) { a.obj = r.data; a.obj.res = p.id; setPath(p, r.path); a.stage = 'go'; return RUN; }
            }
            if (!p.carry) return FAIL;
          } else if (kind === 'agua') {
            if (a.t < C.WATER_MIN) return RUN;
            const room = C.WATER_CAP - S.stock.agua;
            if (room <= 0) return DONE;
            // na seca o rio baixa: cada viagem rende menos
            p.carry = { k: 'agua', n: Math.max(1, Math.min(Math.round((Fam.stage(S, p) === 'crianca' ? 3 : C.WATER_TRIP) * G.Narr.waterMult(S)), room)) };
          } else {
            if (a.t - a.roll >= C.FISH_ROLL) {
              a.roll += C.FISH_ROLL;
              let ch = C.FISH_CHANCE + C.FISH_CHANCE_LVL * lvl(p, 'pesca');
              if (S.ck.season === 3) ch *= C.FISH_WINTER;
              ch *= G.Narr.fishMult(S);   // seca e nevasca espantam, piracema enche o rio
              if (S.rng.next() < ch) {
                a.caught++;
                p.carry = { k: 'peixe', n: a.caught };
                say(S, p, 'peixe', 0.5);
                if (a.water >= 0) S.events.push({ k: 'splash', x: a.water % w.W, y: (a.water / w.W) | 0 });
              }
            }
            if (a.caught < C.FISH_MAX && a.t < C.FISH_SESSION) return RUN;
            if (!a.caught) { say(S, p, 'semPeixe', 0.6); return DONE; }
          }
          return toHaul(S, p, a);
        }
        if (a.stage === 'haul') {
          if (moving(p)) return RUN;
          if (p.stuck) return FAIL;
          deposit(S, p);
          return DONE;
        }
        return RUN;
      },
    };
  }
  function toHaul(S, p, a) {
    if (a.obj && a.obj.res === p.id) a.obj.res = 0;
    a.stage = 'haul';
    return toCamp(S, p) ? RUN : FAIL;
  }
  ACT.madeira = gather('madeira');
  ACT.pedra = gather('pedra');
  ACT.frutas = gather('frutas');
  ACT.agua = gather('agua');
  ACT.pesca = gather('pesca');

  ACT.construir = {
    start(S, p, a) {
      if (p.carry) return false;
      const job = S.ctx.job; if (!job) return false;
      const b = job.b, miss = Sim.missing(job);
      a.b = b.id;
      if (miss.madeira + miss.pedra > 0) {
        let cap = Fam.carryCap(S, p);
        const take = { madeira: 0, pedra: 0 };
        for (const k of ['madeira', 'pedra']) { const t = Math.min(miss[k], S.stock[k], cap); take[k] = t; cap -= t; }
        if (take.madeira + take.pedra === 0) return false;
        if (!toCamp(S, p)) return false;
        a.take = take; a.stage = 'fetch';
        return true;
      }
      if (!toBuilding(S, p, b)) return false;
      return true;
    },
    run(S, p, a, dt) {
      const b = Sim.building(S, a.b);
      if (!b) return FAIL;
      const job = Sim.jobOf(b);
      if (!job) return DONE;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const m = Math.min(a.take.madeira, S.stock.madeira), s = Math.min(a.take.pedra, S.stock.pedra);
        if (m + s === 0) return FAIL;
        S.stock.madeira -= m; S.stock.pedra -= s;
        p.carry = { k: 'obra', madeira: m, pedra: s, n: m + s };
        if (!toBuilding(S, p, b)) return FAIL;
        a.stage = 'deliver';
        return RUN;
      }
      if (a.stage === 'deliver') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        job.have.madeira += p.carry.madeira; job.have.pedra += p.carry.pedra;
        p.carry = null;
        Sim.refresh(S);
        return DONE;
      }
      if (a.stage === 'go') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const miss = Sim.missing(job);
        if (miss.madeira + miss.pedra > 0) return DONE;
        a.stage = 'build'; a.t = 0;
        face(p, b.x, b.y);
        say(S, p, 'construir', 0.3);
      }
      job.progress = job.progress + dt * workSpeed(p, 'construcao') / job.work;
      p.skills.construcao += dt / 60 * Fam.xpFactor(S, p);
      a.t += dt;
      if (job.progress >= 1) { Sim.complete(S, b); return DONE; }
      return RUN;
    },
    end(S, p) {
      if (p.carry && p.carry.k === 'obra') { S.stock.madeira += p.carry.madeira; S.stock.pedra += p.carry.pedra; p.carry = null; }
    },
  };

  ACT.fogo = {
    start(S, p, a) {
      if (p.carry) return false;
      const f = S.ctx.fire;
      if (!f || S.stock.madeira <= 0) return false;
      a.b = f.id;
      // leva de uma vez o que cabe no fogo (antes eram 3 por viagem: na nevasca não dava conta)
      a.want = Math.max(1, Math.min(Fam.carryCap(S, p), S.stock.madeira, Math.ceil(C.FIRE_CAP - f.fuel)));
      if (!toCamp(S, p)) return false;
      a.stage = 'fetch';
      return true;
    },
    run(S, p, a) {
      const f = Sim.building(S, a.b);
      if (!f) return FAIL;
      if (a.stage === 'fetch') {
        if (moving(p)) return RUN;
        if (p.stuck) return FAIL;
        const n = Math.min(a.want, S.stock.madeira);
        if (n <= 0) return FAIL;
        S.stock.madeira -= n;
        p.carry = { k: 'madeira', n, fuel: true };
        if (!toBuilding(S, p, f)) return FAIL;
        a.stage = 'feed';
        return RUN;
      }
      if (moving(p)) return RUN;
      if (p.stuck) return FAIL;
      f.fuel = Math.min(C.FIRE_CAP, f.fuel + p.carry.n);
      p.carry = null;
      face(p, f.x, f.y);
      say(S, p, 'fogo', 0.15);
      Sim.refresh(S);
      return DONE;
    },
    end(S, p) { if (p.carry && p.carry.fuel) { S.stock.madeira += p.carry.n; p.carry = null; } },
  };

  // ---------- notas ----------
  function chatPartner(S, p) {
    if (S.ctx.night || p.needs.social > 78 || p.chatCool > S.t) return null;
    let best = null, bd = 8;
    for (const q of S.people) {
      if (q === p || !q.alive || q.carriedBy || q.labor || q.sleeping || q.inTent || q.chatCool > S.t) continue;
      const qa = q.act;
      if (qa && !(WORK_SET.has(qa.type) || qa.type === 'vagar')) continue;
      if (q.needs.sede < 30 || q.needs.fome < 25 || q.needs.calor < 30) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  }
  function foodFactor(S) {
    const d = S.ctx.foodDays;
    if (d > 60) return 0.2;
    if (d > 40) return 0.5;
    return (1 + 0.5 * U.clamp((4 - d) / 4, 0, 1)) * (d < 1 ? 1.6 : 1);
  }
  function campNeed(S, wk) {
    const st = S.stock, ctx = S.ctx;
    switch (wk) {
      case 'frutas': return ctx.bushFruit > 0 ? foodFactor(S) * Math.min(1, ctx.bushFruit / 12) : 0;
      case 'pesca': return foodFactor(S) * 0.95;
      case 'agua': return st.agua >= C.WATER_CAP - 2 ? 0 : st.agua < 8 ? 1.3 : 1;
      case 'madeira': {
        if (ctx.jobNeeds.madeira > st.madeira) return 2.2;
        let f = st.madeira < 10 ? 1.35 : st.madeira > 200 ? 0.15 : st.madeira > 100 ? 0.45 : 1;
        // lenha para o frio: com fogueira e tempo frio, pouca lenha vira prioridade
        if (ctx.fire && (S.ck.season >= 2 || S.temp < 14)) {
          const days = st.madeira / 6;
          if (days < 5) f = Math.max(f, 1 + 0.9 * (5 - days) / 5);
        }
        return f;
      }
      case 'pedra': {
        if (ctx.jobNeeds.pedra > st.pedra) return 2.2;
        return st.pedra > 40 ? 0.15 : st.pedra > 20 ? 0.5 : 1;
      }
      case 'construir': return ctx.jobDoable ? 1.35 : 0;
      case 'fogo': return ctx.fireNeedsFuel ? 1.6 : 0;
    }
    return 1;
  }

  function scoreList(S, p) {
    const n = p.needs, ctx = S.ctx, out = [];
    const add = (type, s, extra) => {
      if (!(s > 0)) return;
      if (p.fail[type] && p.fail[type] > S.t) return;
      const o = { type, score: s + (S.rng.next() * 4 - 2) };
      if (extra) Object.assign(o, extra);
      out.push(o);
    };
    const crit = (v) => (v < C.CRITICAL ? C.CRITICAL_BONUS : 0);
    const dinner = ctx.hour >= 18 && ctx.hour < 22;
    if (p.carry) add('depositar', 44);
    // quase cheio não come nem bebe (senão o sorteio de ±2 fazia começar e largar na hora)
    if (n.sede < 85) add('beber', urg(n.sede) * 110 + crit(n.sede) + (dinner && n.sede < 70 ? C.EVENING_BONUS : 0));
    if ((ctx.food > 0 || ctx.bushFruit > 0) && n.fome < 85) add('comer', urg(n.fome) * 100 + crit(n.fome) + (dinner && n.fome < 70 ? C.EVENING_BONUS : 0));
    const st = Fam.stage(S, p);
    let sd = urg(n.energia) * 100 + (ctx.night ? 38 : 0) + (ctx.evening ? (st === 'crianca' ? 30 : 10) : 0) + (n.energia < 8 ? C.CRITICAL_BONUS : 0);
    if (!ctx.night && n.energia > 35) sd -= 25;
    add('dormir', sd);
    const heat = ctx.fireLit || ctx.tents > 0 || (S.god && S.god.auras.length > 0);
    const cal = feltCold(S, p);
    if (p.tempHere < C.COMFORT && heat && cal < 85) add('aquecer', urg(cal) * 115 + crit(cal));
    const q = chatPartner(S, p);
    if (q) add('conversar', urg(n.social) * 70 + 12, { q });
    for (const wk of WORK) {
      const v = S.vontades[wk] | 0;
      if (!v || !Fam.canWork(S, p, wk)) continue;
      if (wk === 'fogo' && othersDoing(S, p, 'fogo')) continue;
      const vw = Math.pow(C.VONTADE_W[v], G.God.obedience(S, p));
      let s = C.WORK_BASE * vw * campNeed(S, wk);
      if (!(s > 0)) continue;
      if (has(p, 'Trabalhador')) s *= 1.15;
      if (has(p, 'Preguiçoso')) s *= 0.85;
      const sk = SKILL_OF[wk];
      if (sk) s *= 1 + 0.03 * lvl(p, sk);
      if (wk !== 'construir' && wk !== 'fogo' && othersDoing(S, p, wk)) s *= 0.8;
      if (ctx.night && wk !== 'fogo') s *= 0.45;
      s *= G.Narr.workMult(S, wk);   // nevasca, tempestade e lobos seguram o povo em casa
      add(wk, Math.min(C.WORK_CAP, s));
    }
    if (st === 'crianca') add('brincar', ctx.night ? 0 : 22 + urg(n.social) * 25);
    else add('vagar', has(p, 'Preguiçoso') ? 14 : 7);
    out.sort((a, b) => b.score - a.score);
    return out;
  }
  AI.scoreList = scoreList;

  // ---------- ciclo ----------
  function end(S, p, r) {
    const a = p.act; if (!a) return;
    p.act = null;
    const def = ACT[a.type];
    if (def && def.end) def.end(S, p, a, r);
    if (a.obj && a.obj.res === p.id) a.obj.res = 0;
    p.path = null; p.stuck = false;
    if (r === FAIL) p.fail[a.type] = S.t + 30;
  }
  AI.abort = function (S, p) { end(S, p, 0); };

  AI.decide = function (S, p) {
    const list = scoreList(S, p);
    for (const c of list) {
      const a = { type: c.type, score: c.score, stage: 'go', t: 0 };
      if (c.q) a.q = c.q.id;
      p.stuck = false;
      if (ACT[c.type].start(S, p, a)) { p.act = a; p.nextEval = S.t + C.REEVAL_MIN; return a; }
      if (a.obj && a.obj.res === p.id) a.obj.res = 0;
      p.fail[c.type] = S.t + 45;
      p.path = null;
    }
    return null;
  };

  // tenta só um tipo de ação (usado nas urgências)
  AI.decideType = function (S, p, type) {
    if (p.fail[type] && p.fail[type] > S.t) return null;
    const a = { type, score: 99, stage: 'go', t: 0 };
    p.stuck = false;
    if (ACT[type].start(S, p, a)) { p.act = a; p.nextEval = S.t + C.REEVAL_MIN; return a; }
    if (a.obj && a.obj.res === p.id) a.obj.res = 0;
    p.fail[type] = S.t + 45; p.path = null;
    return null;
  };

  function urgentNeed(S, p, a) {
    if (p.urgentCool > S.t || p.sleeping || a.type === 'chegar' || a.type === 'parto') return null;
    const n = p.needs, ctx = S.ctx;
    // lobo por perto e longe do fogo: corre antes de tudo
    if (a.type !== 'fugir' && G.Narr.threat(S, p)) return 'fugir';
    if (a.type === 'fugir') {
      // escondido: só sai para beber ou comer do estoque, e só se o estoque estiver na luz do fogo
      if (!G.Narr.safeXY(S, S.camp.x + 1, S.camp.y + 1)) return null;
      if (n.sede < 12 && S.stock.agua > 0) return 'beber';
      if (n.fome < 10 && ctx.food > 0) return 'comer';
      return null;
    }
    if (n.sede < 12 && a.type !== 'beber') return 'beber';
    if (n.fome < 10 && a.type !== 'comer' && (ctx.food > 0 || ctx.bushFruit > 0)) return 'comer';
    const cal = feltCold(S, p);
    // indo dormir junto do fogo já é se aquecer; alimentar o fogo também
    if (cal < 15 && p.tempHere < C.COMFORT && a.type !== 'aquecer' && a.type !== 'fogo' && !(a.type === 'dormir' && a.byFire)) {
      // o fogo está morrendo e ninguém foi cuidar dele: quem sente frio vai reacender (é o que aquece todo mundo).
      // Sem isso, na nevasca todos corriam para o fogo que se apagava e ninguém buscava lenha.
      if (ctx.fireNeedsFuel && S.stock.madeira > 0 && (S.vontades.fogo | 0) > 0 && Fam.canWork(S, p, 'fogo') && !othersDoing(S, p, 'fogo')) return 'fogo';
      if (ctx.fireLit || ctx.tents > 0 || (S.god && S.god.auras.length > 0)) return 'aquecer';
    }
    // quem está gelando termina de se aquecer antes de ir dormir (senão alterna entre os dois e congela)
    if (n.energia < 8 && a.type !== 'dormir' && a.type !== 'fogo' && !(a.type === 'aquecer' && cal < C.SLEEP_BY_FIRE)) return 'dormir';
    return null;
  }

  AI.tick = function (S, p, dt) {
    curS = S;
    if (p.labor && (!p.act || p.act.type !== 'parto')) {
      if (p.act) end(S, p, 0);
      const a = { type: 'parto', score: 999, stage: 'go', t: 0 };
      p.sleeping = false;
      ACT.parto.start(S, p, a); p.act = a;
    }
    if (!p.act) AI.decide(S, p);
    const a = p.act;
    if (!a) return;
    move(S, p, dt);
    const r = ACT[a.type].run(S, p, a, dt);
    if (r !== RUN) { end(S, p, r); AI.decide(S, p); return; }
    const need = urgentNeed(S, p, a);
    if (need && (need === 'fugir' || (a.type !== 'beber' && a.type !== 'comer'))) {
      end(S, p, 0);
      if (!AI.decideType(S, p, need)) { p.urgentCool = S.t + 30; AI.decide(S, p); }
      return;
    }
    if (S.t >= p.nextEval) {
      p.nextEval = S.t + C.REEVAL_MIN;
      if (REEVAL.has(a.type)) {
        const list = scoreList(S, p);
        const best = list[0];
        if (best && best.type !== a.type) {
          const cur = list.find((c) => c.type === a.type);
          const cs = cur ? cur.score : 0;
          if (best.score > cs * 1.3 + 10) { end(S, p, 0); AI.decide(S, p); }
        }
      }
    }
  };

  AI.forceSleepHere = function (S, p) {
    p.act = { type: 'dormir', stage: 'sleep', t: 0, score: 99, faint: true };
    p.sleeping = true; p.path = null;
    if (!p.faintAt || S.t - p.faintAt > C.DAY_MIN) Sim.toast(S, p.name + ' desmaiou de cansaço.', 'warn');
    p.faintAt = S.t;
  };
  AI.startGreve = function (S, p) {
    const a = { type: 'greve', stage: 'go', t: 0, score: 99 };
    ACT.greve.start(S, p, a);
    p.act = a;
    say(S, p, 'greve', 1, true);
  };
  AI.touch = function (S, p) {
    if (!p.alive || p.sleeping || p.inTent) return;
    if (!p.touched || S.rng.next() < 0.2) { say(S, p, 'deus', 1, true); p.touched = true; }
  };

  const DOING = {
    madeira: ['Indo cortar madeira', 'Cortando uma árvore', 'Levando madeira'],
    pedra: ['Indo atrás de pedra', 'Quebrando pedra', 'Levando pedra'],
    frutas: ['Indo colher frutas', 'Colhendo frutas', 'Levando frutas'],
    agua: ['Indo buscar água', 'Enchendo as cabaças', 'Levando água'],
    pesca: ['Indo pescar', 'Pescando', 'Levando peixe'],
  };
  AI.describe = function (S, p) {
    if (!p.alive) return 'Morreu ' + ({ frio: 'de frio', sede: 'de sede', fome: 'de fome', raio: 'atingido por um raio', parto: 'no parto', velhice: 'de velhice', lobos: 'no ataque dos lobos' }[p.cause] || '');
    if (p.carriedBy) { const c = person(S, p.carriedBy); return c ? (c.sleeping ? 'Dormindo no colo de ' : 'No colo de ') + c.name : 'Sozinho'; }
    const a = p.act;
    if (!a) return 'Pensando no que fazer';
    const st = a.stage;
    switch (a.type) {
      case 'chegar': return 'Chegando ao novo lar';
      case 'depositar': return 'Guardando no estoque';
      case 'beber': return st === 'go' ? 'Indo beber água' : 'Bebendo água';
      case 'comer': return st === 'go' ? 'Indo comer' : a.src === 'arbusto' ? 'Comendo frutas no pé' : a.hot ? 'Comendo peixe assado' : 'Comendo';
      case 'dormir': return p.sleeping ? (p.inTent ? 'Dormindo na barraca' : 'Dormindo ao relento') : 'Indo dormir';
      case 'aquecer': return st === 'go' ? 'Indo se aquecer' : p.inTent ? 'Se aquecendo na barraca' : a.src === 'aura' ? 'Se aquecendo no calor de Deus' : 'Se aquecendo no fogo';
      case 'conversar': { const o = person(S, a.with); return a.chat && a.chat.on ? 'Conversando com ' + (o ? o.name : '…') : 'Indo conversar'; }
      case 'vagar': return 'Dando uma volta';
      case 'brincar': return st === 'play' ? 'Brincando' : 'Indo brincar';
      case 'parto': return p.labor && p.labor.hard && !p.labor.helped ? 'Em trabalho de parto difícil' : 'Em trabalho de parto';
      case 'greve': return 'Em greve';
      case 'fugir': return st === 'go' ? 'Fugindo dos lobos' : p.sleeping ? (p.inTent ? 'Dormindo na barraca' : 'Dormindo junto ao fogo') : p.inTent ? 'Escondido na barraca' : a.src === 'campo' ? 'Junto dos outros, com medo' : 'A salvo junto ao fogo';
      case 'construir': return st === 'fetch' ? 'Pegando material' : st === 'deliver' ? 'Levando material para a obra' : st === 'build' ? 'Construindo' : 'Indo para a obra';
      case 'fogo': return st === 'fetch' ? 'Pegando lenha' : 'Alimentando a fogueira';
    }
    const d = DOING[a.type];
    if (d) return st === 'work' ? d[1] : st === 'haul' ? d[2] : d[0];
    return '…';
  };
})(globalThis.G = globalThis.G || {});
