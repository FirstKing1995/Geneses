/* Gênesis · tempo com o jogo fechado: o mundo segue a 1/10 da velocidade, em modo seguro. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Off = G.Offline = {};

  // minutos de jogo que passam para um tempo real fora (ms)
  Off.minutesFor = function (awayMs) {
    if (!(awayMs > C.OFFLINE_MIN_SEC * 1000)) return 0;
    const perRealSec = C.DAY_MIN / C.REAL_SEC_PER_DAY * C.OFFLINE_RATE;
    return Math.min(awayMs / 1000 * perRealSec, C.OFFLINE_MAX_DAYS * C.DAY_MIN);
  };

  // roda a simulação em modo seguro (ninguém morre) e devolve um resumo
  Off.run = function (S, minutes) {
    const Sim = G.Sim;
    const before = {
      t: S.t, stock: Object.assign({}, S.stock), chron: S.chron.length,
      built: S.buildings.filter((b) => b.built).length,
      fe: S.people.filter((p) => p.alive).map((p) => p.fe),
    };
    S.safe = true;
    const step = 4, n = Math.floor(minutes / step);
    for (let i = 0; i < n && !S.over; i++) {
      Sim.step(S, step);
      if (S.events.length > 50) S.events.length = 0;
    }
    S.events.length = 0;
    S.safe = false;
    for (const p of S.people) p.prayer = null;
    Sim.refresh(S);
    const alive = S.people.filter((p) => p.alive);
    return {
      minutes: n * step,
      days: (S.t - before.t) / C.DAY_MIN,
      from: before.t, to: S.t,
      stockBefore: before.stock, stockAfter: Object.assign({}, S.stock),
      newChron: S.chron.slice(before.chron),
      built: S.buildings.filter((b) => b.built).length - before.built,
      alive: alive.map((p) => ({ name: p.name, saude: Math.round(p.needs.saude), humor: p.mood })),
    };
  };
})(globalThis.G = globalThis.G || {});
