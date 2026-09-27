/* Gênesis · família (Etapa 3): idades, casais, gravidez, parto, bebês no colo e parentesco. Sem DOM.
   A intimidade é abstraída: o casal dorme junto na barraca e aparece um coração. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const F = G.Family = {};
  const YEAR = () => C.DAY_MIN * C.YEAR_DAYS;
  const Sim = () => G.Sim;

  // ---------- fases da vida ----------
  F.stageOfAge = (age) => (age < 3 ? 'bebe' : age < 12 ? 'crianca' : age < 18 ? 'jovem' : age < C.OLD_AGE ? 'adulto' : 'idoso');
  F.age = (S, p) => Math.floor((S.t - p.born) / YEAR());
  F.ageYears = (S, p) => (S.t - p.born) / YEAR();
  F.stage = (S, p) => F.stageOfAge(F.age(S, p));
  const LABEL = {
    F: { bebe: 'bebê', crianca: 'criança', jovem: 'jovem', adulto: 'adulta', idoso: 'idosa' },
    M: { bebe: 'bebê', crianca: 'criança', jovem: 'jovem', adulto: 'adulto', idoso: 'idoso' },
  };
  F.stageLabel = (S, p) => LABEL[p.sex === 'F' ? 'F' : 'M'][F.stage(S, p)];
  F.isAdult = (S, p) => F.age(S, p) >= 18;

  function person(S, id) { if (!id) return null; for (const q of S.people) if (q.id === id) return q; return null; }
  F.person = person;

  // quem trabalha em quê: criança só colhe frutas e busca água, a partir dos 7
  F.canWork = function (S, p, wk) {
    const st = F.stage(S, p);
    if (st === 'bebe' || p.labor || (p.rest && p.rest > S.t)) return false;   // resguardo depois do parto
    if (st === 'crianca') return F.age(S, p) >= C.CHILD_HELP_AGE && (wk === 'frutas' || wk === 'agua');
    return true;
  };
  F.carrying = (S, p) => S.people.some((b) => b.alive && b.carriedBy === p.id);
  F.latePregnant = (S, p) => !!(p.preg && p.preg.due - S.t < C.LATE_PREG_DAYS * C.DAY_MIN);
  F.workFactor = function (S, p) {
    const st = F.stage(S, p);
    let f = st === 'crianca' ? 0.5 : st === 'jovem' ? 0.75 : st === 'idoso' ? 0.8 : 1;
    if (F.carrying(S, p)) f *= 0.85;
    if (F.latePregnant(S, p)) f *= 0.7;
    return f;
  };
  F.walkFactor = function (S, p) {
    const st = F.stage(S, p);
    let f = st === 'crianca' ? 0.9 : st === 'idoso' ? 0.85 : 1;
    if (F.latePregnant(S, p)) f *= 0.85;
    return f;
  };
  F.carryCap = (S, p) => (F.stage(S, p) === 'crianca' ? C.CARRY_CHILD : C.CARRY);
  // aprender: jovem aprende mais rápido, e mais ainda perto de um idoso
  F.xpFactor = function (S, p) {
    const st = F.stage(S, p);
    let f = st === 'jovem' ? 1.5 : st === 'crianca' ? 1.2 : 1;
    if ((st === 'jovem' || st === 'crianca') && S.people.some((q) => q.alive && q !== p && F.stage(S, q) === 'idoso' && Math.hypot(q.x - p.x, q.y - p.y) < 6)) f *= 1.25;
    return f;
  };
  F.nursing = (S, p) => p.sex === 'F' && S.people.some((b) => b.alive && b.mother === p.id && F.stage(S, b) === 'bebe' && b.carriedBy === p.id);
  // multiplicadores de necessidade por fase e estado
  F.needMult = function (S, p) {
    const st = F.stage(S, p);
    const m = { fome: 1, sede: 1, energia: 1, frio: 1 };
    if (st === 'crianca') { m.fome = 0.6; m.sede = 0.65; m.energia = 1.15; m.frio = 1.15; }
    else if (st === 'jovem') { m.fome = 0.85; m.sede = 0.9; }
    else if (st === 'idoso') { m.fome = 0.9; m.energia = 1.2; m.frio = 1.15; }
    if (p.preg) { m.fome *= C.PREGNANT_HUNGER; m.energia *= C.PREGNANT_ENERGY; }
    if (F.nursing(S, p)) { m.fome *= 1.15; m.sede *= 1.15; }
    return m;
  };
  // bocas para o cálculo de "comida para N dias"
  F.mouths = function (S) {
    let n = 0;
    for (const p of S.people) {
      if (!p.alive) continue;
      if (F.stage(S, p) === 'bebe') { if (!F.nursing(S, person(S, p.carriedBy) || p)) n += 0.3; continue; }
      n += F.needMult(S, p).fome;
    }
    return Math.max(1, n);
  };
  // lugar na barraca: adulto e jovem 2, criança 1, bebê vai no colo
  F.bedUnits = function (S, p) { const st = F.stage(S, p); return st === 'bebe' ? 0 : st === 'crianca' ? 1 : 2; };
  F.tentLoad = function (S, b) {
    let n = 0;
    for (const id of b.beds) { const q = person(S, id); if (q && q.alive) n += F.bedUnits(S, q); }
    return n;
  };
  F.bedsNeeded = function (S) { let n = 0; for (const p of S.people) if (p.alive) n += F.bedUnits(S, p); return n; };
  F.bedsTotal = function (S) {
    let n = 0;
    for (const b of S.buildings) if (b.built && C.BUILD[b.type].cap) n += C.BUILD[b.type].cap;
    return n;
  };

  // ---------- parentesco ----------
  function ancestors(S, p, depth, out) {
    if (!p || depth <= 0) return out;
    for (const id of [p.mother, p.father]) {
      if (!id) continue;
      out.add(id);
      ancestors(S, person(S, id), depth - 1, out);
    }
    return out;
  }
  // próximo = um é ascendente do outro até avós, ou têm um ascendente em comum até avós (irmãos, tios, primos)
  F.closeKin = function (S, a, b) {
    if (!a || !b) return false;
    if (a.id === b.id) return true;
    const A = ancestors(S, a, 2, new Set([a.id])), B = ancestors(S, b, 2, new Set([b.id]));
    for (const x of A) if (B.has(x)) return true;
    return false;
  };
  F.childrenOf = (S, p) => S.people.filter((q) => q.mother === p.id || q.father === p.id);
  F.siblingsOf = (S, p) => S.people.filter((q) => q !== p && ((p.mother && q.mother === p.mother) || (p.father && q.father === p.father)));
  F.partnerOf = function (S, p) { const q = person(S, p.partner); return q && q.alive ? q : null; };
  // como p chama q
  F.relation = function (S, p, q) {
    const fem = q.sex === 'F';
    if (p.partner === q.id) return fem ? 'companheira' : 'companheiro';
    if (p.mother === q.id) return 'mãe';
    if (p.father === q.id) return 'pai';
    if (q.mother === p.id || q.father === p.id) return fem ? 'filha' : 'filho';
    if ((p.mother && q.mother === p.mother) || (p.father && q.father === p.father)) return fem ? 'irmã' : 'irmão';
    const gp = [person(S, p.mother), person(S, p.father)];
    if (gp.some((x) => x && (x.mother === q.id || x.father === q.id))) return fem ? 'avó' : 'avô';
    const gc = F.childrenOf(S, p);
    if (gc.some((x) => x.id === q.mother || x.id === q.father)) return fem ? 'neta' : 'neto';
    return '';
  };
  F.family = function (S, p) {
    const out = [];
    for (const q of S.people) { if (q === p) continue; const r = F.relation(S, p, q); if (r) out.push({ q, r }); }
    return out;
  };

  // ---------- nomes e herança ----------
  F.pickName = function (S, sex) {
    const pool = sex === 'F' ? Sim().namePool.FEM : Sim().namePool.MASC;
    const used = new Set(S.people.filter((q) => q.alive).map((q) => q.name));
    const free = pool.filter((n) => !used.has(n));
    return S.rng.pick(free.length ? free : pool);
  };
  function inheritTraits(S, mom, dad) {
    const Sm = Sim(), out = [];
    const cands = [].concat(mom ? mom.traits : [], dad ? dad.traits : []);
    for (const t of cands) {
      if (out.length >= 2 || out.indexOf(t) >= 0) continue;
      if (Sm.traitClash(out, t)) continue;
      if (S.rng.chance(C.TRAIT_INHERIT)) out.push(t);
    }
    const extra = Sm.pickTraits(S.rng);
    for (const t of extra) { if (out.length >= 2) break; if (out.indexOf(t) < 0 && !Sm.traitClash(out, t)) out.push(t); }
    return out;
  }
  function inheritLook(S, mom, dad, sex) {
    const a = mom ? mom.look : null, b = dad ? dad.look : null;
    const base = Sim().makeLook(S.rng, sex);
    if (a && b) {
      const lo = Math.min(a.skin, b.skin), hi = Math.max(a.skin, b.skin);
      base.skin = S.rng.int(lo, hi);
      base.hair = S.rng.chance(0.5) ? a.hair : b.hair;
    }
    return base;
  }

  // ---------- casais ----------
  F.link = function (S, a, b, afeto) {
    a.partner = b.id; b.partner = a.id;
    a.afeto = b.afeto = afeto;
  };
  F.addAfeto = function (S, p, d) {
    const q = F.partnerOf(S, p);
    p.afeto = U.clamp((p.afeto || 0) + d, 0, 100);
    if (q) q.afeto = U.clamp((q.afeto || 0) + d, 0, 100);
  };
  F.onChat = function (S, p, q) {
    if (p.partner === q.id) F.addAfeto(S, p, C.AFETO_CHAT);
  };
  function formCouples(S) {
    const free = S.people.filter((p) => p.alive && !F.partnerOf(S, p) && F.age(S, p) >= 18 && F.age(S, p) <= 50);
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
      const a = free[i], b = free[j];
      if (F.partnerOf(S, a) || F.partnerOf(S, b) || F.closeKin(S, a, b)) continue;
      const talks = Math.min(a.rel[b.id] || 0, b.rel[a.id] || 0);
      if (talks < C.COUPLE_TALKS || a.mood < 40 || b.mood < 40) continue;
      if (!S.rng.chance(C.COUPLE_DAILY)) continue;
      F.link(S, a, b, 55);
      Sim().chron(S, a.name + ' e ' + b.name + ' estão juntos.');
    }
  }

  // ---------- gravidez e parto ----------
  function youngestChildAge(S, w) {
    let best = Infinity;
    for (const q of S.people) if (q.alive && q.mother === w.id) best = Math.min(best, F.ageYears(S, q));
    return best;
  }
  // uma vez por noite: casal junto na barraca, afeto alto e o corpo em dia
  function nightTogether(S) {
    for (const w of S.people) {
      if (!w.alive || w.sex !== 'F' || !w.sleeping || !w.inTent) continue;
      const m = F.partnerOf(S, w);
      if (!m || !m.sleeping || m.inTent !== w.inTent) continue;
      F.addAfeto(S, w, C.AFETO_NIGHT);
      if ((w.afeto || 0) < C.AFETO_MIN) continue;
      const tb = Sim().building(S, w.inTent);
      if (tb) S.events.push({ k: 'heart', x: tb.x + 1, y: tb.y });
      if (m.sex !== 'M' || w.preg || w.labor) continue;
      const aw = F.age(S, w), am = F.age(S, m);
      if (aw < 18 || aw > C.FERTILE_MAX || am < 18 || F.closeKin(S, w, m)) continue;
      if (youngestChildAge(S, w) < C.BIRTH_SPACING_Y) continue;
      const n = w.needs;
      if (n.fome < 30 || n.saude < 50 || n.calor < 40) continue;
      if (S.rng.next() < C.CONCEIVE_NIGHT * (w.afeto / 100)) {
        w.preg = { t0: S.t, due: S.t + Math.round(C.PREGNANCY_Y * YEAR()), father: m.id, known: false };
      }
    }
  }
  function pregnancyHour(S) {
    const Sm = Sim();
    for (const w of S.people) {
      if (!w.alive) { w.preg = null; w.labor = null; continue; }
      if (w.preg && !w.preg.known && S.t - w.preg.t0 >= C.PREG_KNOWN_DAYS * C.DAY_MIN) {
        w.preg.known = true;
        const dad = person(S, w.preg.father);
        if (!S.stats.firstPreg) { S.stats.firstPreg = true; Sm.chron(S, w.name + ' espera o primeiro filho do povo.'); }
        else Sm.toast(S, w.name + ' está grávida.', 'good');
        Sm.addMem(S, w, 'esperaFilho'); if (dad && dad.alive) Sm.addMem(S, dad, 'esperaFilho');
      }
      if (w.preg && !w.labor && S.t >= w.preg.due) startLabor(S, w);
      if (w.labor) {
        const L = w.labor;
        if (L.hard && !L.helped && !S.safe) { w.needs.saude -= C.LABOR_HARD_DMG_H; w.dmg.parto = (w.dmg.parto || 0) + C.LABOR_HARD_DMG_H; }
        if (S.t >= L.until) giveBirth(S, w);
      }
    }
  }
  function startLabor(S, w) {
    const Sm = Sim();
    let risk = C.BIRTH_RISK;
    if (S.buildings.some((b) => b.built && C.BUILD[b.type].cap)) risk += C.BIRTH_RISK_TENT;
    if (S.ctx && S.ctx.fireLit) risk += C.BIRTH_RISK_FIRE;
    if (w.needs.saude < 50 || w.needs.fome < 25) risk += C.BIRTH_RISK_WEAK;
    const hard = !S.safe && S.rng.next() < Math.max(0.02, risk);
    w.labor = { t0: S.t, until: S.t + C.LABOR_H * 60, hard, helped: false };
    G.AI.abort(S, w);
    if (hard) Sm.toast(S, 'O parto de ' + w.name + ' está difícil. Ela vai precisar de você.', 'bad');
    else Sm.toast(S, w.name + ' entrou em trabalho de parto.', 'good');
  }
  F.makeBaby = function (S, mom, dad, sex, name) {
    const Sm = Sim();
    const p = Sm.makePerson(S, sex, name, 0);
    p.born = S.t;
    p.traits = inheritTraits(S, mom, dad);
    p.look = inheritLook(S, mom, dad, sex);
    p.needs = { fome: 100, sede: 100, energia: 100, calor: 100, social: 100, saude: 100 };
    p.mother = mom ? mom.id : 0; p.father = dad ? dad.id : 0;
    p.carriedBy = mom && mom.alive ? mom.id : 0;
    p.x = mom ? mom.x : S.camp.x + 1; p.y = mom ? mom.y : S.camp.y + 1; p.px = p.x; p.py = p.y;
    p.inTent = mom ? mom.inTent : 0;
    p.fe = mom ? Math.round((mom.fe + (dad ? dad.fe : mom.fe)) / 2) : 50;
    p.prayer = null; p.prayCool = 0;
    p.lastAge = 0;
    return p;
  };
  function giveBirth(S, w) {
    const Sm = Sim();
    const dad = person(S, w.preg ? w.preg.father : 0);
    const hard = w.labor.hard && !w.labor.helped;
    w.preg = null; w.labor = null;
    w.rest = S.t + C.DAY_MIN; w.needs.energia = Math.max(10, w.needs.energia - 25);
    if (hard) G.God.ignorePrayers(S, ['parto'], w.id);
    if (hard && S.rng.next() < C.BIRTH_LOSS_HARD) {
      Sm.chron(S, 'O bebê de ' + w.name + ' não sobreviveu ao parto.');
      Sm.addMem(S, w, 'perdeuBebe'); if (dad && dad.alive) Sm.addMem(S, dad, 'perdeuBebe');
      return null;
    }
    const sex = S.rng.chance(0.5) ? 'F' : 'M';
    const baby = F.makeBaby(S, w, dad, sex, F.pickName(S, sex));
    // o bebê mais velho passa para o colo do pai
    if (dad && dad.alive) for (const b of S.people) if (b.alive && b.carriedBy === w.id && !F.carrying(S, dad)) b.carriedBy = dad.id;
    S.people.push(baby);
    S.stats.births = (S.stats.births || 0) + 1;
    const first = S.stats.births === 1;
    const txt = 'Nasceu ' + baby.name + ', ' + (sex === 'F' ? 'filha' : 'filho') + ' de ' + w.name + (dad ? ' e ' + dad.name : '') + '.' +
      (first ? ' É a primeira criança do povo.' : '');
    S.chron.push({ t: S.t, text: txt, pid: baby.id, born: true });
    S.events.push({ k: 'chron', text: txt, birth: !S.safe });
    S.events.push({ k: 'birth', pid: baby.id });
    Sm.addMem(S, w, 'nasceuFilho'); if (dad && dad.alive) Sm.addMem(S, dad, 'nasceuFilho');
    for (const q of S.people) if (q.alive && q !== w && q !== dad && q !== baby && F.closeKin(S, q, baby)) Sm.addMem(S, q, 'nasceuIrmao');
    if (first) { S.era = 'familia'; Sm.chron(S, 'Começa a Era da Família.'); }
    G.God.onBirth(S, baby, w, dad);
    return baby;
  }
  // renomear depois (Deus dá o nome): troca também na Crônica
  F.rename = function (S, pid, name) {
    const p = person(S, pid);
    name = String(name || '').trim().slice(0, 14);
    if (!p || !name || name === p.name) return false;
    const old = p.name;
    p.name = name;
    for (const c of S.chron) if (c.pid === pid) c.text = c.text.replace(old, name);
    return true;
  };

  // ---------- bebês ----------
  F.carrierOf = (S, b) => person(S, b.carriedBy);
  function newCarrier(S, b) {
    const fam = [person(S, b.mother), person(S, b.father)].concat(F.siblingsOf(S, b))
      .filter((q) => q && q.alive && F.age(S, q) >= 12 && !q.carriedBy);
    const any = S.people.filter((q) => q.alive && q !== b && F.age(S, q) >= 12);
    const c = fam[0] || any[0] || null;
    b.carriedBy = c ? c.id : 0;
    return c;
  }
  // o bebê vai onde quem o carrega vai
  F.followCarrier = function (S, b) {
    let c = F.carrierOf(S, b);
    if (!c || !c.alive) c = newCarrier(S, b);
    if (!c) return false;
    b.x = c.x; b.y = c.y; b.px = c.px; b.py = c.py;
    b.inTent = c.inTent; b.sleeping = c.sleeping; b.dir = c.dir;
    return true;
  };
  // mamar ou comer do estoque, de hora em hora
  function feedBabies(S) {
    for (const b of S.people) {
      if (!b.alive || !b.carriedBy) continue;
      const n = b.needs;
      if (n.fome > 70 && n.sede > 70) continue;
      const c = F.carrierOf(S, b);
      if (!c) continue;
      if (c.id === b.mother && c.needs.fome > 20 && c.needs.sede > 20) {
        n.fome = 100; n.sede = 100;
        c.needs.fome -= C.NURSE_COST; c.needs.sede -= C.NURSE_COST;
        continue;
      }
      // sem mãe por perto: papinha de fruta e água do estoque
      const st = S.stock;
      if (n.fome <= 70 && st.frutas > 0) { st.frutas--; n.fome = 100; }
      else if (n.fome <= 70 && st.peixe > 0) { st.peixe--; n.fome = 100; }
      if (n.sede <= 70 && st.agua > 0) { st.agua--; n.sede = 100; }
      else if (n.sede <= 70 && c.needs.sede > 30) n.sede = Math.min(100, n.sede + 40);
    }
  }
  // desmame: aos 3 anos a criança anda sozinha
  function wean(S, b) {
    const c = F.carrierOf(S, b);
    b.carriedBy = 0;
    b.sleeping = false; b.inTent = 0;
    if (c) { b.x = c.x; b.y = c.y; b.px = b.x; b.py = b.y; }
    b.act = null; b.path = null;
  }

  // ---------- aniversários e velhice ----------
  function birthday(S, p, age) {
    const Sm = Sim();
    const ela = p.sex === 'F';
    if (age === 3) { wean(S, p); Sm.toast(S, p.name + ' já anda sozinh' + (ela ? 'a' : 'o') + '.', 'good'); }
    else if (age === C.CHILD_HELP_AGE) Sm.toast(S, p.name + ' fez ' + age + ' anos e já ajuda: colhe frutas e busca água.', 'good');
    else if (age === 12) Sm.toast(S, p.name + ' fez 12 anos e virou aprendiz: agora faz todo trabalho.', 'good');
    else if (age === 18) {
      const first = !S.stats.firstAdult && (p.mother || p.father);
      if (first) S.stats.firstAdult = true;
      Sm.chron(S, (first ? 'A primeira criança do povo cresceu: ' : '') + p.name + ' fez 18 anos.');
      // o primogênito virou adulto: o Narrador manda um segundo casal pedindo abrigo
      if ((p.mother || p.father) && G.Narr) G.Narr.onAdult(S, p);
    } else if (age === C.OLD_AGE) Sm.toast(S, p.name + ' fez ' + age + ' anos: ensina os jovens, mas já não tem a mesma força.');
    else Sm.toast(S, 'Aniversário de ' + p.name + ': ' + age + ' anos.');
  }
  function oldAge(S, p, age) {
    if (S.safe || age < C.OLD_AGE) return;
    const yearly = C.OLD_DEATH_BASE + (age - C.OLD_AGE) * C.OLD_DEATH_STEP;
    if (S.rng.next() < yearly / C.YEAR_DAYS) { p.dmg.velhice = 999; p.needs.saude = -999; }   // abaixo de zero: a cura natural do passo não salva
  }

  // ---------- metas da família ----------
  F.goals2 = function () {
    return [
      { id: 'filho', text: 'Receba o primeiro filho', done: false },
      { id: 'camas', text: 'Tenha barraca para todos', done: false },
      { id: 'estoque', text: 'Guarde comida para ' + C.GOAL_FOOD_DAYS + ' dias', done: false },
      { id: 'ajuda', text: 'Veja um filho crescer e ajudar', done: false },
      { id: 'povo', text: 'Chegue a ' + C.GOAL_PEOPLE + ' pessoas', done: false },
    ];
  };
  F.goalTest = {
    filho: (S) => (S.stats.births || 0) > 0,
    camas: (S) => F.bedsNeeded(S) > 4 && F.bedsTotal(S) >= F.bedsNeeded(S),
    estoque: (S) => S.ctx.foodDays >= C.GOAL_FOOD_DAYS,
    ajuda: (S) => !!S.stats.childHelped,
    povo: (S) => S.people.filter((p) => p.alive).length >= C.GOAL_PEOPLE,
  };

  // ---------- ganchos chamados pela simulação ----------
  F.init = function (S) {
    S.stats.births = S.stats.births || 0;
    for (const p of S.people) {
      if (p.afeto === undefined) p.afeto = 0;
      if (p.partner === undefined) p.partner = 0;
      if (p.mother === undefined) p.mother = 0;
      if (p.father === undefined) p.father = 0;
      if (p.preg === undefined) p.preg = null;
      if (p.labor === undefined) p.labor = null;
      if (p.carriedBy === undefined) p.carriedBy = 0;
    }
    // o casal que chegou junto já é um casal
    if (!S.famInit) {
      S.famInit = true;
      const [a, b] = S.people;
      if (a && b && !a.partner && !b.partner && !a.mother && !b.mother) F.link(S, a, b, C.AFETO_START);
    }
    for (const b of S.people) if (b.alive && b.carriedBy) F.followCarrier(S, b);
  };
  F.hourly = function (S) {
    const h = Math.floor(S.ck.hour);
    if (h === 23) nightTogether(S);
    pregnancyHour(S);
    feedBabies(S);
  };
  F.daily = function (S) {
    for (const p of S.people) {
      if (!p.alive) continue;
      const age = F.age(S, p);
      if (p.lastAge !== undefined && age > p.lastAge) birthday(S, p, age);
      p.lastAge = age;
      oldAge(S, p, age);
      if (p.partner) {
        const q = F.partnerOf(S, p);
        if (!q) { p.partner = 0; continue; }
        p.afeto = U.clamp((p.afeto || 0) - C.AFETO_DECAY - (p.mood < 25 ? 1 : 0), 0, 100);
      }
    }
    formCouples(S);
  };
  F.onDeath = function (S, p) {
    const Sm = Sim();
    p.preg = null; p.labor = null;
    if (p.carriedBy) p.carriedBy = 0;
    // quem estava no colo passa para outro
    for (const b of S.people) if (b.alive && b.carriedBy === p.id) { if (!newCarrier(S, b)) b.needs.saude = -999; }
    const q = F.partnerOf(S, p);
    if (q) Sm.addMem(S, q, 'perdeuCompanheiro');
    for (const k of F.family(S, p)) if (k.q.alive && (k.r === 'mãe' || k.r === 'pai' || k.r === 'filha' || k.r === 'filho')) Sm.addMem(S, k.q, 'perdeuFamilia');
  };
})(globalThis.G = globalThis.G || {});
