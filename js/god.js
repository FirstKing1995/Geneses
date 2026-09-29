/* Gênesis · Deus: Fé, Poder, orações, milagres e alinhamento (Etapa 2). Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG, U = G.U;
  const God = G.God = {};

  God.MIRACLES = {
    calor: { name: 'Calor', cost: 10, r: 5, icon: 'fogo', desc: 'Aquece e protege um lugar por uma noite inteira.', answers: 'frio lobos' },
    raio: { name: 'Raio', cost: 15, r: 0.9, icon: 'raio', desc: 'Derruba árvore ou pedra e espanta lobos e onça. Em alguém, pune.', answers: 'lobos onca' },
    chuva: { name: 'Chuva', cost: 15, r: 12, icon: 'chuva', desc: 'Frutas fora de época, cabaças cheias e roça crescendo.', answers: 'fome sede' },
    cura: { name: 'Cura', cost: 20, r: 0.9, icon: 'cura', desc: 'Devolve a saúde de alguém e salva um parto difícil.', answers: 'parto doente', unlock: 'familia' },
    revelacao: { name: 'Revelação', cost: C.REVELACAO_COST, r: 0.9, icon: 'revelacao', desc: 'Num sonho, entrega a alguém a próxima descoberta, se o povo já começou a entender.', answers: '', unlock: 'descoberta' },
  };
  const LOCKED = { familia: 'A Cura chega com o primeiro filho.', descoberta: 'A Revelação chega com a primeira descoberta.' };
  const PRAYERS = {
    frio: ['Deus, está frio demais.', 'Céu, manda um pouco de calor.'],
    fome: ['Deus, temos fome.', 'Céu, não deixa a gente passar fome.'],
    sede: ['Deus, precisamos de água.', 'Céu, manda chuva, por favor.'],
    lobos: ['Deus, os lobos!', 'Céu, espanta esses lobos!', 'Deus, protege a gente dos lobos!'],
    onca: ['Deus, a onça!', 'Céu, tira essa onça daqui!', 'Deus, protege a gente da onça!'],
  };
  const THANKS = ['Ele ouviu!', 'Obrigado, céu!', 'Eu sabia que alguém olhava por nós.'];
  God.PRAYER_HELP = { frio: 'calor', fome: 'chuva', sede: 'chuva', parto: 'cura', doente: 'cura', lobos: 'raio', onca: 'raio' };
  const PRAYER_H = { lobos: 2, onca: 2 };   // prazo curto: lobo e onça não esperam
  God.unlocked = (S, kind) => {
    const m = God.MIRACLES[kind];
    if (!m || !m.unlock) return true;
    if (m.unlock === 'familia') return (S.stats.births || 0) > 0;
    if (m.unlock === 'descoberta') return !!(G.Tech && G.Tech.count(S) > 0);
    return false;
  };
  God.lockedText = (kind) => LOCKED[(God.MIRACLES[kind] || {}).unlock] || '';

  const has = (p, t) => p.traits.indexOf(t) >= 0;
  function Sim() { return G.Sim; }

  God.init = function (S) {
    if (!S.god) S.god = { poder: C.POWER_START, align: 0, auras: [], rainUntil: 0, lastGrace: -1e9, answered: 0, ignored: 0, miracles: 0 };
    for (const p of S.people) {
      if (p.fe === undefined) p.fe = has(p, 'Devoto') ? 65 : has(p, 'Cético') ? 35 : C.FAITH_START;
      if (p.prayer === undefined) p.prayer = null;
      if (p.prayCool === undefined) p.prayCool = 0;
    }
  };

  // fé com peso dos traços e do alinhamento
  God.faith = function (S, p, delta) {
    if (!p.alive || !delta) return;
    let d = delta;
    if (d > 0) { if (has(p, 'Devoto')) d *= 1.5; if (has(p, 'Cético')) d *= 0.5; if (S.god.align > 30) d *= 1.2; }
    else { if (has(p, 'Devoto')) d *= 0.5; if (has(p, 'Cético')) d *= 1.5; if (S.god.align < -30) d *= 0.7; }
    p.fe = U.clamp(p.fe + d, 0, 100);
  };
  God.align = function (S, d) { S.god.align = U.clamp(S.god.align + d, -100, 100); };

  // expoente que aplica às Vontades: fé alta obedece mais
  God.obedience = function (S, p) {
    let o = 0.6 + 0.8 * (p.fe === undefined ? 50 : p.fe) / 100;
    if (has(p, 'Devoto')) o += 0.2;
    if (has(p, 'Cético')) o -= 0.25;
    if (S.god && S.god.align < -30) o += 0.15;
    return U.clamp(o, 0.35, 1.8);
  };

  God.heatAt = function (S, x, y) {
    if (!S.god) return 0;
    let best = 0;
    for (const a of S.god.auras) {
      const d = Math.hypot(a.x + 0.5 - x, a.y + 0.5 - y);
      if (d <= a.r) best = Math.max(best, C.CALOR_HEAT * (d < a.r * 0.6 ? 1 : (a.r - d) / (a.r * 0.4)));
    }
    return best;
  };

  function near(p, x, y, r) { return Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5)) <= r; }

  // ---------- orações ----------
  const PRAY_FOR = {
    filha: (q) => 'Deus, cure minha filha ' + q.name + '.', filho: (q) => 'Deus, cure meu filho ' + q.name + '.',
    companheira: (q) => 'Deus, salve a ' + q.name + '.', companheiro: (q) => 'Deus, salve o ' + q.name + '.',
    'mãe': () => 'Deus, cure a minha mãe.', pai: () => 'Deus, cure o meu pai.',
    'irmã': (q) => 'Deus, cuida da ' + q.name + '.', 'irmão': (q) => 'Deus, cuida do ' + q.name + '.',
  };
  function wantPrayer(S, p) {
    const n = p.needs, ctx = S.ctx, Fm = G.Family;
    const cura = God.unlocked(S, 'cura');
    // parto difícil: ela reza, e quem ama reza por ela
    if (p.labor && p.labor.hard && !p.labor.helped) return { kind: 'parto', target: p.id, text: 'Deus, me ajuda neste parto!' };
    for (const mate of Fm.partners(S, p)) {
      if (mate.labor && mate.labor.hard && !mate.labor.helped) return { kind: 'parto', target: mate.id, text: 'Deus, salva a ' + mate.name + ' e o bebê!' };
    }
    if (cura) {
      for (const k of Fm.family(S, p)) {
        const q = k.q;
        if (!q.alive || q.labor || q.needs.saude >= 35 || !PRAY_FOR[k.r]) continue;
        if (S.people.some((o) => o.prayer && o.prayer.kind === 'doente' && o.prayer.target === q.id)) continue;
        return { kind: 'doente', target: q.id, text: PRAY_FOR[k.r](q) };
      }
      if (n.saude < 30 && !p.labor) return { kind: 'doente', target: p.id, text: 'Deus, me cura.' };
    }
    const th = G.Narr && G.Narr.threat(S, p);
    if (th) { const k = th.k === 'onca' ? 'onca' : 'lobos'; return { kind: k, target: p.id, text: S.rng.pick(PRAYERS[k]) }; }
    if (n.calor < 35 && p.tempHere < 10 && !(ctx.fireLit && G.Sim.fireHeat(S, p.x, p.y) > 5)) return { kind: 'frio', target: p.id, text: S.rng.pick(PRAYERS.frio) };
    if (n.fome < 25 && ctx.food === 0 && ctx.bushFruit < 3) return { kind: 'fome', target: p.id, text: S.rng.pick(PRAYERS.fome) };
    if (n.sede < 25 && S.stock.agua === 0) return { kind: 'sede', target: p.id, text: S.rng.pick(PRAYERS.sede) };
    return null;
  }
  function stillNeeds(S, p, pr) {
    const n = p.needs, kind = pr.kind;
    const t = G.Family.person(S, pr.target) || p;
    if (kind === 'frio') return n.calor < 60;
    if (kind === 'fome') return n.fome < 55 && S.ctx.food < 3;
    if (kind === 'sede') return n.sede < 60;
    if (kind === 'parto') return !!(t.alive && t.labor && t.labor.hard && !t.labor.helped);
    if (kind === 'doente') return t.alive && t.needs.saude < 60;
    if (kind === 'lobos') return !!(G.Narr && G.Narr.wolvesOut(S));
    if (kind === 'onca') return !!(G.Narr && G.Narr.oncaOut(S));
    return false;
  }
  // agradecimento (e luto): não pede nada, não espera resposta; a fé de quem agradece vira Poder (Etapa 6)
  God.thank = function (S, p, text, poder, loud, kind) {
    const g = S.god;
    if (!g || !p || !p.alive) return false;
    g.poder += poder;
    g.thanks = (g.thanks || 0) + 1;
    g.thanksPoder = (g.thanksPoder || 0) + poder;
    if (kind !== 'luto') { God.faith(S, p, 2); G.Sim.addMem(S, p, 'agradeceu'); }
    if (text) G.Sim.say(S, p, text, true, 'god');
    if (loud && text) S.events.push({ k: 'thanks', pid: p.id, kind: kind || 'gratidao', poder, text: p.name + (kind === 'luto' ? ' reza: “' : ' agradece: “') + text + '” +' + poder + ' de Poder' });
    return true;
  };
  const MORNING = [(p) => 'Obrigad' + (p.sex === 'F' ? 'a' : 'o') + ' por mais um dia.', () => 'Bom dia, céu.', () => 'Cuida da gente hoje, tá?'];
  God.hourly = function (S) {
    const g = S.god, Sm = G.Sim;
    // Poder nasce da fé do povo, e não tem teto (Etapa 6): guarde para os grandes atos
    let sum = 0;
    for (const p of S.people) if (p.alive) sum += p.fe / 100;
    g.poder += sum * C.POWER_PER_FAITH_H;
    g.auras = g.auras.filter((a) => a.until > S.t);
    if (S.safe) return;   // com o jogo fechado ninguém reza nem é ignorado
    // de manhã, quem tem muita fé agradece pelo dia
    if (Math.floor(S.ck.hour) === 7) {
      for (const p of S.people) {
        if (!p.alive || p.sleeping || p.carriedBy || p.prayer || G.Family.age(S, p) < 7) continue;
        if (p.fe < (has(p, 'Devoto') ? 55 : 70) || !S.rng.chance(0.3)) continue;
        God.thank(S, p, S.rng.pick(MORNING)(p), C.THANKS.manha, false);
      }
    }
    for (const p of S.people) {
      if (!p.alive) continue;
      if (p.prayer) {
        if (!stillNeeds(S, p, p.prayer)) { p.prayer = null; p.prayCool = S.t + C.PRAYER_COOLDOWN_H * 60; continue; }
        if (S.t >= p.prayer.until) {
          God.faith(S, p, C.FAITH_IGNORED);
          for (const q of S.people) if (q !== p && q.alive && Math.hypot(q.x - p.x, q.y - p.y) < 10) God.faith(S, q, C.FAITH_IGNORED_SEEN);
          Sm.addMem(S, p, 'oracaoIgnorada');
          g.ignored++;
          Sm.toast(S, 'Ninguém respondeu à oração de ' + p.name + '. A fé caiu.', 'bad');
          p.prayer = null; p.prayCool = S.t + C.PRAYER_COOLDOWN_H * 60;
        }
        continue;
      }
      if (p.carriedBy || G.Family.age(S, p) < 5) continue;
      const want = wantPrayer(S, p);
      if (!want) continue;
      // no parto se reza acordado ou não, de barraca ou não
      if (want.kind !== 'parto' && (p.sleeping || p.inTent || p.prayCool > S.t)) continue;
      // parto: prazo é o próprio parto; o resto espera 12 h
      const until = want.kind === 'parto' ? G.Family.person(S, want.target).labor.until : S.t + (PRAYER_H[want.kind] || C.PRAYER_HOURS) * 60;
      p.prayer = { kind: want.kind, target: want.target, text: want.text, t0: S.t, until };
      Sm.say(S, p, want.text, true);
      S.events.push({ k: 'prayer', pid: p.id, text: p.name + ' reza: “' + want.text + '”' });
    }
  };

  God.daily = function (S) {
    const g = S.god;
    const graced = S.t - g.lastGrace < 3 * C.DAY_MIN;
    const target = graced ? 70 : 35;
    for (const p of S.people) {
      if (!p.alive) continue;
      // sem sinal de Deus a fé esfria até 35; com sinais recentes, aquece até 70
      if (p.fe > target) p.fe = Math.max(target, p.fe - 0.7);
      else p.fe = Math.min(target, p.fe + 0.7);
    }
    // o alinhamento volta devagar ao centro
    g.align = g.align > 0 ? Math.max(0, g.align - 1) : Math.min(0, g.align + 1);
  };

  // oração que ninguém atendeu a tempo (ex.: o parto acabou sem ajuda)
  God.ignorePrayers = function (S, kinds, targetId) {
    const Sm = G.Sim;
    for (const p of S.people) {
      if (!p.alive || !p.prayer || kinds.indexOf(p.prayer.kind) < 0 || p.prayer.target !== targetId) continue;
      God.faith(S, p, C.FAITH_IGNORED);
      Sm.addMem(S, p, 'oracaoIgnorada');
      S.god.ignored++;
      p.prayer = null; p.prayCool = S.t + C.PRAYER_COOLDOWN_H * 60;
    }
  };
  // pedido na hora, sem esperar a volta do relógio (mordida de lobo ou de onça)
  God.cry = function (S, p, kind) {
    if (S.safe || !p.alive || p.prayer || p.carriedBy || G.Family.age(S, p) < 5 || !PRAYERS[kind]) return false;
    const text = S.rng.pick(PRAYERS[kind]);
    p.prayer = { kind, target: p.id, text, t0: S.t, until: S.t + (PRAYER_H[kind] || C.PRAYER_HOURS) * 60 };
    G.Sim.say(S, p, text, true);
    S.events.push({ k: 'prayer', pid: p.id, text: p.name + ' reza: “' + text + '”' });
    return true;
  };
  God.onBirth = function (S, baby, mom, dad) {
    for (const q of [mom, dad]) if (q && q.alive) God.faith(S, q, C.FAITH_MIRACLE_SEEN);
  };
  God.onDeath = function (S, dead) {
    for (const q of S.people) if (q.alive) God.faith(S, q, C.FAITH_DEATH);
  };

  function answer(S, kindNeeded, x, y, r) {
    const Sm = G.Sim;
    let n = 0;
    for (const p of S.people) {
      if (!p.alive || !p.prayer) continue;
      if (kindNeeded.indexOf(p.prayer.kind) < 0) continue;
      if (!near(p, x, y, r + 1)) continue;
      God.faith(S, p, C.FAITH_ANSWER);
      for (const q of S.people) if (q !== p && q.alive && Math.hypot(q.x - p.x, q.y - p.y) < 10) God.faith(S, q, C.FAITH_ANSWER_SEEN);
      Sm.addMem(S, p, 'oracaoAtendida');
      Sm.say(S, p, S.rng.pick(THANKS), true, 'god');
      S.god.answered++;
      S.god.poder += C.THANKS.oracao; S.god.thanksPoder = (S.god.thanksPoder || 0) + C.THANKS.oracao;
      God.align(S, 5);
      S.events.push({ k: 'toast', text: 'Você atendeu à oração de ' + p.name + '. A fé subiu, e o agradecimento dá +' + C.THANKS.oracao + ' de Poder.', tone: 'good' });
      // atendida, pode pedir de novo quando o milagre acabar
      p.prayer = null; p.prayCool = S.t + C.PRAYER_ANSWERED_COOLDOWN_H * 60;
      n++;
    }
    return n;
  }

  // atende todas as orações de um tipo, estejam onde estiverem (o raio que espanta a matilha salva todo mundo)
  God.answerKind = function (S, kinds) { return answer(S, kinds, 0, 0, Infinity); };

  function answerTarget(S, kinds, targetId) {
    const Sm = G.Sim;
    let n = 0;
    for (const p of S.people) {
      if (!p.alive || !p.prayer || kinds.indexOf(p.prayer.kind) < 0 || p.prayer.target !== targetId) continue;
      God.faith(S, p, C.FAITH_ANSWER);
      Sm.addMem(S, p, 'oracaoAtendida');
      Sm.say(S, p, S.rng.pick(THANKS), true, 'god');
      S.god.answered++;
      S.god.poder += C.THANKS.oracao; S.god.thanksPoder = (S.god.thanksPoder || 0) + C.THANKS.oracao;
      God.align(S, 5);
      S.events.push({ k: 'toast', text: 'Você atendeu à oração de ' + p.name + '. A fé subiu, e o agradecimento dá +' + C.THANKS.oracao + ' de Poder.', tone: 'good' });
      p.prayer = null; p.prayCool = S.t + C.PRAYER_ANSWERED_COOLDOWN_H * 60;
      n++;
    }
    return n;
  }
  // quem a Cura alcança: o mais fraco perto do toque (bebês no colo contam)
  God.curaTarget = function (S, x, y) {
    let best = null;
    for (const p of S.people) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5));
      if (d > 1.3) continue;
      if (!best || p.needs.saude < best.needs.saude || (p.labor && !best.labor)) best = p;
    }
    return best;
  };

  // quem recebe a Revelação: a pessoa mais perto do toque, de 7 anos para cima
  God.dreamTarget = function (S, x, y) {
    let best = null, bd = 1.3;
    for (const p of S.people) {
      if (!p.alive || p.carriedBy || G.Family.age(S, p) < 7) continue;
      const d = Math.hypot(p.x - (x + 0.5), p.y - (y + 0.5));
      if (d <= bd) { bd = d; best = p; }
    }
    return best;
  };

  // ---------- milagres ----------
  God.canCast = function (S, kind) {
    const m = God.MIRACLES[kind];
    if (!m) return 'Milagre desconhecido';
    if (!God.unlocked(S, kind)) return God.lockedText(kind);
    if (kind === 'revelacao') { const why = G.Tech.canReveal(S); if (why) return why; }
    if (S.god.poder < m.cost) return 'Falta Poder: precisa de ' + m.cost + '.';
    return '';
  };
  God.cast = function (S, kind, x, y) {
    const why = God.canCast(S, kind);
    if (why) return { ok: false, msg: why };
    const Sm = G.Sim, w = S.world, m = God.MIRACLES[kind], g = S.god;
    if (x < 0 || y < 0 || x >= w.W || y >= w.H) return { ok: false, msg: 'Fora do mundo.' };
    if (!Sm.isSeen(S, x, y)) return { ok: false, msg: 'A névoa cobre esse lugar. Deus só age onde o povo já esteve.' };
    const healed = kind === 'cura' ? God.curaTarget(S, x, y) : null;
    if (kind === 'cura' && !healed) return { ok: false, msg: 'Toque em alguém para curar.' };
    const dreamer = kind === 'revelacao' ? God.dreamTarget(S, x, y) : null;
    if (kind === 'revelacao' && !dreamer) return { ok: false, msg: 'Toque em alguém (de 7 anos ou mais) para revelar.' };
    g.poder -= m.cost;
    g.miracles++;
    g.lastGrace = S.t;
    let msg = '';
    // quem viu, se admira
    for (const p of S.people) if (p.alive && near(p, x, y, 8)) { God.faith(S, p, C.FAITH_MIRACLE_SEEN); if (kind !== 'raio') Sm.addMem(S, p, 'viuMilagre'); }
    if (kind === 'revelacao') {
      const id = G.Tech.reveal(S, dreamer);
      God.faith(S, dreamer, C.FAITH_ANSWER);
      for (const q of S.people) if (q.alive && q !== dreamer) God.faith(S, q, C.FAITH_MIRACLE_SEEN);
      God.align(S, 3);
      Sm.say(S, dreamer, 'Eu vi… eu sei como fazer!', true);
      msg = 'Revelação: ' + dreamer.name + ' sonhou com ' + G.Tech.DISC[id].name.toLowerCase() + '.';
      S.events.push({ k: 'miracle', kind, x: Math.floor(dreamer.x), y: Math.floor(dreamer.y) });
    } else if (kind === 'cura') {
      const h = healed, wasLabor = !!(h.labor && h.labor.hard && !h.labor.helped);
      h.needs.saude = Math.min(100, h.needs.saude + C.CURA_HEAL);
      h.dmg.raio = 0; h.dmg.parto = 0;
      if (h.labor) h.labor.helped = true;
      Sm.addMem(S, h, 'curado');
      God.faith(S, h, C.FAITH_ANSWER_SEEN);
      God.align(S, 4);
      answerTarget(S, ['parto', 'doente'], h.id);
      msg = 'Cura sobre ' + h.name + ': a saúde voltou.' + (wasLabor ? ' O parto vai correr bem.' : '');
      S.events.push({ k: 'miracle', kind, x: Math.floor(h.x), y: Math.floor(h.y) });
    } else if (kind === 'calor') {
      g.auras.push({ x, y, r: C.CALOR_R, until: S.t + C.CALOR_HOURS * 60 });
      God.align(S, 3);
      const n = answer(S, 'frio lobos', x, y, C.CALOR_R);
      msg = 'Calor sobre o lugar por ' + C.CALOR_HOURS + ' horas.' + (n ? '' : '');
      S.events.push({ k: 'miracle', kind, x, y });
    } else if (kind === 'chuva') {
      g.rainUntil = Math.max(g.rainUntil, S.t + C.CHUVA_HOURS * 60);
      let fruits = 0;
      for (const o of w.objs) {
        if (o.k !== 'bush' || Math.hypot(o.x - x, o.y - y) > C.CHUVA_R) continue;
        const before = o.fruit;
        o.fruit = Math.min(C.BUSH_MAX, o.fruit + C.CHUVA_FRUIT);
        fruits += o.fruit - before;
      }
      const water = Math.min(C.CHUVA_WATER, G.Tech.waterCap(S) - S.stock.agua);
      if (Math.hypot(S.camp.x - x, S.camp.y - y) <= C.CHUVA_R + 2) S.stock.agua += Math.max(0, water);
      God.align(S, 3);
      answer(S, 'fome sede', x, y, C.CHUVA_R);
      Sm.refresh(S);
      const dry = G.Narr ? G.Narr.onChuva(S) : '';
      const rocas = G.Campo ? G.Campo.onChuva(S, x, y) : 0;   // Etapa 10: a roça molhada cresce uns dias de uma vez
      msg = 'Chuva abençoada: ' + fruits + ' frutas nasceram nos arbustos.' + (rocas ? (rocas === 1 ? ' A roça cresceu a olhos vistos.' : ' As roças cresceram a olhos vistos.') : '') + (dry ? ' ' + dry : '');
      S.events.push({ k: 'miracle', kind, x, y });
    } else if (kind === 'raio') {
      S.events.push({ k: 'bolt', x, y });
      const i = y * w.W + x;
      // lobo perto do raio: o raio é dele (e o trovão espanta a matilha)
      const wolf = G.Narr ? G.Narr.onRaio(S, x, y) : null;
      const hit = wolf ? null : S.people.find((p) => p.alive && !p.inTent && near(p, x, y, C.RAIO_R));
      const game = wolf || hit || !G.Fauna ? null : G.Fauna.onRaio(S, x, y);   // capivara: carne e couro
      const o = wolf || game ? null : G.W.objAt(w, i);
      if (wolf) msg = wolf;
      else if (game) msg = game;
      else if (hit) {
        hit.needs.saude -= C.RAIO_DAMAGE;
        hit.dmg.raio = (hit.dmg.raio || 0) + C.RAIO_DAMAGE;
        Sm.addMem(S, hit, 'atingidoRaio');
        God.faith(S, hit, 6);
        for (const q of S.people) if (q !== hit && q.alive) { Sm.addMem(S, q, 'viuRaio'); God.faith(S, q, 4); }
        God.align(S, -15);
        Sm.say(S, hit, 'Perdão! Perdão!', true);
        msg = 'O raio atingiu ' + hit.name + '. O povo teme você.';
      } else if (o && o.k === 'tree') {
        o.k = 'stump'; o.regrow = 0; G.W.refreshBlock(w, i);
        S.stock.madeira += C.TREE_WOOD;
        msg = 'O raio derrubou uma árvore: +' + C.TREE_WOOD + ' madeira no estoque.';
        for (const q of S.people) if (q.alive && near(q, x, y, 8)) Sm.addMem(S, q, 'viuRaio');
      } else if (o && o.k === 'rock') {
        const stone = o.ch * C.ROCK_STONE;
        G.W.removeObj(w, o);
        S.stock.pedra += stone;
        msg = 'O raio partiu a pedra: +' + stone + ' pedra no estoque.';
        for (const q of S.people) if (q.alive && near(q, x, y, 8)) Sm.addMem(S, q, 'viuRaio');
      } else {
        msg = 'O raio caiu no chão. O povo olhou para o céu.';
        for (const q of S.people) if (q.alive && near(q, x, y, 10)) God.faith(S, q, 2);
      }
      Sm.refresh(S);
    }
    return { ok: true, msg };
  };
})(globalThis.G = globalThis.G || {});
