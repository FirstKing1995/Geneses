/* Gênesis · tempo com o jogo fechado: o mundo segue numa fração da velocidade (o jogador escolhe), em modo seguro. Sem DOM. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Off = G.Offline = {};
  const now = () => (globalThis.performance && performance.now ? performance.now() : Date.now());

  Off.rate = (S) => C.OFFLINE_RATES[S && S.opts && S.opts.offline !== undefined ? S.opts.offline : C.OFFLINE_RATE_DEFAULT] || C.OFFLINE_RATES[C.OFFLINE_RATE_DEFAULT];

  // minutos de jogo que passam para um tempo real fora (ms)
  Off.minutesFor = function (awayMs, S) {
    if (!(awayMs > C.OFFLINE_MIN_SEC * 1000)) return 0;
    const perRealSec = C.DAY_MIN / C.REAL_SEC_PER_DAY * Off.rate(S);
    return Math.min(awayMs / 1000 * perRealSec, C.OFFLINE_MAX_DAYS * C.DAY_MIN);
  };

  // a simulação em modo seguro (ninguém morre), em pedaços
  Off.start = function (S, minutes) {
    const step = 4;
    const job = {
      S, step, total: Math.max(1, Math.floor(minutes / step)), left: Math.floor(minutes / step),
      before: {
        t: S.t, stock: Object.assign({}, S.stock), chron: S.chron.length,
        built: S.buildings.filter((b) => b.built).length,
      },
    };
    S.safe = true;
    return job;
  };
  // roda até acabar ou até gastar maxMs; devolve true quando acabou
  Off.advance = function (job, maxMs) {
    const S = job.S, Sim = G.Sim, t0 = now();
    let k = 0;
    while (job.left > 0 && !S.over) {
      Sim.step(S, job.step);
      if (S.events.length > 50) S.events.length = 0;
      job.left--;
      if (++k % 64 === 0 && now() - t0 > maxMs) break;
    }
    return job.left <= 0 || S.over;
  };
  Off.finish = function (job) {
    const S = job.S, Sim = G.Sim, before = job.before;
    S.events.length = 0;
    S.safe = false;
    for (const p of S.people) p.prayer = null;
    Sim.refresh(S);
    const alive = S.people.filter((p) => p.alive);
    return {
      minutes: (job.total - job.left) * job.step,
      days: (S.t - before.t) / C.DAY_MIN,
      from: before.t, to: S.t,
      stockBefore: before.stock, stockAfter: Object.assign({}, S.stock),
      newChron: S.chron.slice(before.chron),
      built: S.buildings.filter((b) => b.built).length - before.built,
      alive: alive.map((p) => ({ name: p.name, saude: Math.round(p.needs.saude), humor: p.mood })),
    };
  };
  // tudo de uma vez (testes e Node)
  Off.run = function (S, minutes) {
    const job = Off.start(S, minutes);
    Off.advance(job, Infinity);
    return Off.finish(job);
  };
  // no navegador: fatias de ~30 ms, com progresso, sem travar a tela
  Off.runAsync = function (S, minutes, onProgress, onDone) {
    const job = Off.start(S, minutes);
    const tick = () => {
      const done = Off.advance(job, 30);
      if (onProgress) onProgress(1 - job.left / job.total, job);
      if (done) onDone(Off.finish(job));
      else setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
  };
})(globalThis.G = globalThis.G || {});
