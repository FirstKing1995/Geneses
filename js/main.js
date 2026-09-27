/* Gênesis · laço principal, telas, conta, save e controles (mouse, toque e teclado). */
(function (G) {
  'use strict';
  const C = G.CFG, R = G.R, UI = G.UI, Sim = G.Sim, Save = G.Save, A = G.Art, W = G.W, Net = G.Net, God = G.God;
  const $ = (s) => document.querySelector(s);
  const TS = C.TILE;
  const ZOOMS = [1, 2, 3, 4, 5, 6];

  let mode = 'title';
  let S = null, speed = 1, acc = 0, lastT = 0, lastSave = 0, lastCloud = 0, cloudBusy = false;
  let demo = null, demoDir = { x: 1, y: 0.35 };
  let siteWorld = null, siteSeed = 0, siteSel = null;
  let placing = null, ghost = null, casting = null;
  let camTarget = null, holdSim = false;
  const rng = new G.RNG((Date.now() ^ 0x5bd1e995) >>> 0);

  function setMode(m) {
    mode = m;
    document.body.dataset.mode = m;
    $('#scr-title').hidden = m !== 'title';
    $('#scr-site').hidden = m !== 'site';
    $('#hud').hidden = !(m === 'game' || m === 'over');
    $('#scr-over').hidden = m !== 'over';
    if (m !== 'game') { cancelPlacing(); cancelCasting(); }
    R.overlay.ring = null;
    if (m !== 'game' && m !== 'over') { R.overlay.selPerson = 0; R.overlay.selBuilding = 0; }
  }

  // ---------- conta ----------
  const session = () => (Net.enabled() ? Net.session() : null);
  function localSaveFor(email) {
    const d = Save.read();
    if (!d || d.game !== 'genesis') return null;
    if ((d.conta || '') !== (email || '')) return null;
    return d;
  }
  async function login(tab, f) {
    const res = tab === 'criar' ? await Net.call('cadastrar', f) : await Net.call('entrar', { email: f.email, senha: f.senha });
    if (res.ok) {
      Net.setSession({ token: res.token, nome: res.usuario.nome, email: res.usuario.email, mundo: res.mundo || null });
      UI.toast(tab === 'criar' ? 'Conta criada. Bem-vindo, ' + res.usuario.nome + '.' : 'Bem-vindo de volta, ' + res.usuario.nome + '.', 'good');
      showTitle();
    }
    return res;
  }
  async function logout() {
    const s = session();
    if (s) Net.call('sair', { token: s.token });
    Net.setSession(null);
    showTitle();
  }
  async function openRanking() {
    UI.ranking([], 'Carregando…');
    const res = await Net.call('ranking', {});
    UI.ranking(res.ok ? res.lista : [], res.ok ? '' : res.erro);
  }

  // ---------- título ----------
  function showTitle() {
    if (!demo) {
      demo = W.generate(20260926);
      const s = W.bestSite(demo);
      R.cam.x = (s.x - 6) * TS; R.cam.y = s.y * TS;
    }
    R.cam.zoom = 3;
    const net = Net.enabled(), s = session();
    $('#acct-actions').hidden = !net || !!s;
    $('#btn-logout').hidden = !s;
    $('#btn-ranking').hidden = !net;
    $('#acct-line').hidden = !s;
    if (s) $('#acct-line').textContent = 'Conectado como ' + s.nome;
    const d = localSaveFor(s ? s.email : '');
    const cloud = s && s.mundo && !s.mundo.fim ? s.mundo : null;
    const has = (d && !d.over) || !!cloud;
    $('#btn-continue').hidden = !has;
    $('#continue-info').hidden = !has;
    if (has) {
      if (d && !d.over) {
        const alive = d.people.filter((p) => p.alive).map((p) => ({ name: p.name }));
        $('#continue-info').textContent = Sim.dateText(d.t) + ' · ' + (alive.length ? Sim.listNames(alive) : 'ninguém vivo');
      } else {
        $('#continue-info').textContent = 'Ano ' + cloud.ano + ', ' + String(cloud.estacao).toLowerCase() + ', dia ' + cloud.dia + ' · ' + (cloud.nomes || '') + ' (na nuvem)';
      }
    }
    setMode('title');
  }

  async function continueGame() {
    const s = session();
    let d = localSaveFor(s ? s.email : '');
    let nowTrusted = Date.now();
    if (s) {
      $('#btn-continue').disabled = true; $('#btn-continue').textContent = 'Buscando seu mundo…';
      const res = await Net.call('carregar', { token: s.token });
      $('#btn-continue').disabled = false; $('#btn-continue').textContent = 'Continuar';
      if (res.ok) {
        nowTrusted = res.now;
        if (res.dados) {
          let cloudD = null;
          try { cloudD = JSON.parse(res.dados); } catch (e) { cloudD = null; }
          if (cloudD && (!d || (res.savedAt || 0) > (d.savedAt || 0) + 1000)) { cloudD.savedAt = res.savedAt; d = cloudD; }
        }
      } else if (res.sessao === false) { UI.toast('Sua sessão expirou. Entre de novo.', 'warn'); showTitle(); return; }
      else if (!d) { UI.toast(res.erro || 'Não deu para buscar o mundo.', 'warn'); return; }
      else { UI.toast('Sem conexão: abrindo o save deste aparelho.', 'warn'); nowTrusted = Net.now(); }
    }
    const st = d && Save.deserialize(d);
    if (!st) { UI.toast('Não achei um mundo salvo.', 'warn'); showTitle(); return; }
    S = st;
    enterGame();
    // o mundo seguiu com o jogo fechado
    const minutes = S.over ? 0 : G.Offline.minutesFor(nowTrusted - (d.savedAt || nowTrusted));
    if (minutes >= C.DAY_MIN / 24) {
      holdSim = true;
      setTimeout(() => {
        const r = G.Offline.run(S, minutes);
        UI.consume(S, 0);
        R.invalidate();
        UI.bind(S);
        UI.away(r, () => { holdSim = false; checkPending(); });
        save();
      }, 60);
    } else setTimeout(checkPending, 400);
  }
  // viajantes esperando resposta (a janela fecha com o jogo; aqui ela volta)
  function checkPending() {
    if (!S || mode !== 'game') return;
    const g = G.Narr.pending(S);
    if (g) askChoice(g.id);
  }
  // uma janela por vez: espera a outra fechar
  const modalOpen = () => ['#modal-birth', '#modal-choice', '#modal-away'].some((id) => !$(id).hidden);
  function askChoice(gid) {
    if (!S || S.safe || mode !== 'game') return;
    if (modalOpen()) { setTimeout(() => askChoice(gid), 600); return; }
    const g = S.narr.groups[gid];
    if (!g || g.state !== 'esperando') return;
    const before = speed;
    setSpeed(0);
    UI.choice(gid, (accept) => {
      if (accept !== null) G.Narr.decide(S, gid, accept);
      UI.update(0, true);
      setSpeed(before || 1);
      save();
    });
  }

  // ---------- escolha do local ----------
  function newSiteWorld() {
    siteSeed = rng.int(1, 2147483646);
    siteWorld = W.generate(siteSeed);
    siteSel = null;
    R.invalidate();
    R.cam.x = siteWorld.W * TS / 2; R.cam.y = siteWorld.H * TS / 2;
    R.cam.zoom = Math.max(0.2, R.fitZoom(siteWorld));
    $('#seed-label').textContent = 'Mundo ' + siteSeed;
    UI.siteInfo(siteWorld, null);
    const best = W.bestSite(siteWorld);
    if (best) pickSite(best.x, best.y);
  }
  function pickSite(tx, ty) {
    const s = W.evalSite(siteWorld, tx, ty);
    siteSel = s;
    R.overlay.ring = { x: tx, y: ty, r: 10, ok: s.valid };
    UI.siteInfo(siteWorld, s);
  }
  function startGame(names, kind) {
    S = Sim.newGame(siteSeed, { x: siteSel.x, y: siteSel.y }, names, siteWorld);
    if (kind) G.Narr.setKind(S, kind);
    siteWorld = null;
    enterGame();
    R.overlay.beam = { x: S.camp.x + 1, y: S.camp.y + 1, t0: performance.now() };
    save(true);
  }
  function enterGame() {
    R.invalidate();
    R.cam.x = (S.camp.x + 1) * TS; R.cam.y = (S.camp.y + 1) * TS;
    R.cam.zoom = UI.isMobile() ? 2 : 3;
    speed = 1; acc = 0; lastSave = performance.now(); lastCloud = performance.now();
    UI.bind(S);
    UI.sheet('');
    setMode(S.over ? 'over' : 'game');
    if (S.over) UI.showOver(S);
  }

  // ---------- salvar ----------
  function save(forceCloud) {
    if (!S) return false;
    const s = session();
    const txt = Save.store(S, { conta: s ? s.email : '' });
    lastSave = performance.now();
    const el = $('#save-status');
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (el) el.textContent = txt ? 'Salvo neste aparelho às ' + hora + '.' : 'Este navegador não deixou salvar.';
    if (s && txt && (forceCloud || performance.now() - lastCloud > C.CLOUD_SAVE_SEC * 1000)) cloudSave(txt);
    return !!txt;
  }
  async function cloudSave(txt) {
    const s = session();
    if (!s || cloudBusy) return;
    cloudBusy = true; lastCloud = performance.now();
    const res = await Net.call('salvar', { token: s.token, dados: txt, resumo: Save.summary(S) });
    cloudBusy = false;
    const el = $('#save-status');
    if (res.ok) {
      s.mundo = Save.summary(S); Net.setSession(s);
      if (el) el.textContent = 'Salvo na nuvem e neste aparelho às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.';
    } else if (res.sessao === false) {
      UI.toast('Sua sessão expirou. O jogo segue salvando neste aparelho.', 'warn');
    } else if (el) el.textContent = res.erro || 'Não deu para salvar na nuvem agora.';
  }
  function beaconSave() {
    if (!S) return;
    const s = session();
    const txt = Save.store(S, { conta: s ? s.email : '' });
    if (s && txt) Net.beacon('salvar', { token: s.token, dados: txt, resumo: Save.summary(S) });
  }

  // ---------- construção ----------
  function startPlacing(type) {
    if (mode !== 'game') return;
    cancelCasting();
    if (placing === type) { cancelPlacing(); return; }
    placing = type;
    document.body.dataset.placing = type;
    showHint('Toque no mapa para marcar a ' + C.BUILD[type].name.toLowerCase() + '.', cancelPlacing);
    if (UI.isMobile()) UI.sheet('');
    const c = R.toWorld(window.innerWidth / 2, window.innerHeight / 2);
    updateGhost(c.x, c.y);
  }
  function showHint(text, onCancel) {
    const hint = $('#place-hint');
    hint.hidden = false;
    hint.innerHTML = `<span>${text}</span><button class="btn btn-small" id="place-cancel">Cancelar</button>`;
    $('#place-cancel').onclick = onCancel;
  }
  function hideHint() { const h = $('#place-hint'); if (h) h.hidden = true; }
  function cancelPlacing() {
    placing = null; ghost = null; R.overlay.ghost = null;
    if (!casting) delete document.body.dataset.placing;
    if (!casting) hideHint();
  }
  function footprint(type, wx, wy) {
    const d = C.BUILD[type];
    return { x: Math.floor(wx / TS - (d.w - 1) / 2), y: Math.floor(wy / TS - (d.h - 1) / 2) };
  }
  function updateGhost(wx, wy) {
    if (!placing || !S) return;
    const f = footprint(placing, wx, wy);
    const why = Sim.canPlace(S, placing, f.x, f.y);
    ghost = { type: placing, x: f.x, y: f.y, ok: !why, why };
    R.overlay.ghost = ghost;
  }
  function placeAt(wx, wy) {
    updateGhost(wx, wy);
    if (!ghost) return;
    if (!ghost.ok) { UI.toast(ghost.why + '.', 'warn'); return; }
    const b = Sim.placeBlueprint(S, placing, ghost.x, ghost.y);
    if (b) {
      const d = C.BUILD[b.type];
      UI.toast(d.name + ' marcada. Precisa de ' + Object.entries(d.cost).map(([k, v]) => v + ' de ' + k).join(' e ') + '.', '');
      if (!S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai trabalhar na obra.', 'warn');
    }
    cancelPlacing();
  }

  // ---------- milagres ----------
  function startCasting(kind) {
    if (mode !== 'game' || !S) return;
    if (casting === kind) { cancelCasting(); return; }
    const why = God.canCast(S, kind);
    if (why) { UI.toast(why + ' O Poder nasce da fé do povo.', 'warn'); return; }
    cancelPlacing();
    casting = kind;
    document.body.dataset.placing = 'milagre';
    const m = God.MIRACLES[kind];
    showHint('Toque no mapa para o milagre ' + m.name + '. ' + m.desc, cancelCasting);
    if (UI.isMobile()) UI.sheet('');
    const c = R.toWorld(window.innerWidth / 2, window.innerHeight / 2);
    aimCast(c.x, c.y);
    UI.update(0, true);
  }
  function aimCast(wx, wy) {
    if (!casting) return;
    const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    R.overlay.cast = { kind: casting, x: tx, y: ty, r: God.MIRACLES[casting].r, ok: Sim.isSeen(S, tx, ty) && (casting !== 'cura' || !!God.curaTarget(S, tx, ty)) };
  }
  function cancelCasting() {
    casting = null; R.overlay.cast = null;
    if (!placing) { delete document.body.dataset.placing; hideHint(); }
  }
  function castAt(wx, wy) {
    const kind = casting;
    const res = God.cast(S, kind, Math.floor(wx / TS), Math.floor(wy / TS));
    UI.toast(res.msg, res.ok ? (kind === 'raio' ? 'warn' : 'good') : 'warn');
    cancelCasting();
    UI.update(0, true);
  }

  // ---------- toque e mouse ----------
  const cv = () => $('#view');
  const ptrs = new Map();
  let drag = null, pinch = null;
  function onDown(e) {
    cv().setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: R.cam.zoom };
      drag = null;
    } else {
      drag = { x: e.clientX, y: e.clientY, cx: R.cam.x, cy: R.cam.y, moved: false, button: e.button };
    }
  }
  function onMove(e) {
    const p = ptrs.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const z = pinch.zoom * d / pinch.d;
      if (mode === 'site') R.cam.zoom = Math.max(0.15, Math.min(4, z));
      else R.cam.zoom = Math.max(1, Math.min(6, z));
      camTarget = null;
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; cv().classList.add('dragging'); }
      if (drag.moved) {
        const s = R.scale();
        R.cam.x = drag.cx - dx / s; R.cam.y = drag.cy - dy / s;
        clampCam(); camTarget = null;
      }
    }
    if (e.pointerType === 'mouse') {
      const w = R.toWorld(e.clientX, e.clientY);
      if (placing) updateGhost(w.x, w.y);
      if (casting) aimCast(w.x, w.y);
    }
  }
  function onUp(e) {
    ptrs.delete(e.pointerId);
    if (pinch) { if (ptrs.size < 2) { pinch = null; if (mode !== 'site') R.cam.zoom = snapZoom(R.cam.zoom); } drag = null; return; }
    cv().classList.remove('dragging');
    if (drag && !drag.moved) tap(e.clientX, e.clientY, drag.button);
    drag = null;
  }
  function snapZoom(z) { let best = ZOOMS[0]; for (const q of ZOOMS) if (Math.abs(q - z) < Math.abs(best - z)) best = q; return best; }
  function onWheel(e) {
    e.preventDefault();
    const before = R.toWorld(e.clientX, e.clientY);
    if (mode === 'site') R.cam.zoom = Math.max(0.15, Math.min(4, R.cam.zoom * (e.deltaY < 0 ? 1.25 : 0.8)));
    else {
      const i = ZOOMS.indexOf(snapZoom(R.cam.zoom));
      R.cam.zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + (e.deltaY < 0 ? 1 : -1)))];
    }
    const after = R.toWorld(e.clientX, e.clientY);
    R.cam.x += before.x - after.x; R.cam.y += before.y - after.y;
    clampCam(); camTarget = null;
  }
  function clampCam() {
    const w = S ? S.world : siteWorld || demo;
    if (!w) return;
    R.cam.x = Math.max(0, Math.min(w.W * TS, R.cam.x));
    R.cam.y = Math.max(0, Math.min(w.H * TS, R.cam.y));
  }
  function tap(sx, sy, button) {
    const w = R.toWorld(sx, sy);
    if (mode === 'site') { pickSite(Math.floor(w.x / TS), Math.floor(w.y / TS)); return; }
    if (mode !== 'game' || !S) return;
    if (casting) { if (button === 2) cancelCasting(); else castAt(w.x, w.y); return; }
    if (placing) { if (button === 2) cancelPlacing(); else placeAt(w.x, w.y); return; }
    let best = null, bd = 1e9;
    for (const p of S.people) {
      if (!p.alive || p.inTent) continue;
      const px = p.x * TS, py = p.y * TS - 4;
      const d = Math.hypot(px - w.x, py - w.y);
      const reach = Math.max(10, 18 / R.scale());
      if (d < reach && d < bd) { bd = d; best = p; }
    }
    if (best) { UI.select(best.id, 0); return; }
    // lobo ou viajante no mapa
    if (S.narr) {
      let ent = null, ed = 1e9;
      for (const e of S.narr.ents) {
        if (e.gone || !Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
        const d = Math.hypot(e.x * TS - w.x, e.y * TS - 4 - w.y);
        if (d < Math.max(12, 18 / R.scale()) && d < ed) { ed = d; ent = e; }
      }
      if (ent && ent.k === 'lobo') { UI.toast('Lobo. Um Raio (R) perto dele abate um e espanta a matilha. Quem fica na luz do fogo aceso está a salvo.', 'warn'); return; }
      if (ent) {
        const g = S.narr.groups[ent.gid];
        if (g && g.state === 'esperando') { askChoice(g.id); return; }
        UI.toast(ent.pd.name + (g && g.state === 'indo' ? ' segue viagem.' : ' vem pela trilha. Quando chegar, pede abrigo.'), '');
        return;
      }
    }
    const tx = Math.floor(w.x / TS), ty = Math.floor(w.y / TS);
    const bid = S.world.bgrid[ty * S.world.W + tx];
    if (bid >= 0) {
      const inside = S.people.find((p) => p.alive && p.inTent === bid);
      if (inside && !UI.sel.building) { UI.select(inside.id, 0); return; }
      UI.select(0, bid); return;
    }
    UI.select(0, 0);
    if (UI.isMobile()) UI.sheet('');
  }

  // ---------- teclado ----------
  let lastSpeed = 1;
  function setSpeed(i) { if (i > 0) lastSpeed = i; speed = i; UI.update(0, true); }
  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (mode !== 'game') return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); setSpeed(speed === 0 ? (lastSpeed || 1) : 0); }
    else if (k === '1' || k === '2' || k === '3') setSpeed(+k);
    else if (k === 'f') startPlacing('fogueira');
    else if (k === 'b') startPlacing('barraca');
    else if (k === 'q') startCasting('calor');
    else if (k === 'r') startCasting('raio');
    else if (k === 'u') startCasting('chuva');
    else if (k === 'e') startCasting('cura');
    else if (k === 't') { if ($('#modal-tree').hidden) UI.tree(); else $('#modal-tree').hidden = true; }
    else if (k === 'c') UI.sheet(document.body.dataset.sheet === 'cronica' ? '' : 'cronica');
    else if (k === 'escape') { if (placing) cancelPlacing(); else if (casting) cancelCasting(); else { UI.select(0, 0); UI.sheet(''); $('#menu').hidden = true; } }
    else if (k === '+' || k === '=') { const i = ZOOMS.indexOf(snapZoom(R.cam.zoom)); R.cam.zoom = ZOOMS[Math.min(ZOOMS.length - 1, i + 1)]; }
    else if (k === '-') { const i = ZOOMS.indexOf(snapZoom(R.cam.zoom)); R.cam.zoom = ZOOMS[Math.max(0, i - 1)]; }
    else if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) {
      const st = 48 / R.scale();
      if (k === 'w' || k === 'arrowup') R.cam.y -= st;
      if (k === 's' || k === 'arrowdown') R.cam.y += st;
      if (k === 'a' || k === 'arrowleft') R.cam.x -= st;
      if (k === 'd' || k === 'arrowright') R.cam.x += st;
      clampCam(); camTarget = null;
    }
  }

  // ---------- laço ----------
  function loop(now) {
    const dt = lastT ? Math.min(0.25, (now - lastT) / 1000) : 0;
    lastT = now;
    if (mode === 'title') {
      R.cam.x += demoDir.x * 7 * dt; R.cam.y += demoDir.y * 7 * dt;
      if (demo && (R.cam.x < 30 * TS || R.cam.x > (demo.W - 30) * TS)) demoDir.x *= -1;
      if (demo && (R.cam.y < 30 * TS || R.cam.y > (demo.H - 30) * TS)) demoDir.y *= -1;
      R.draw(null, 1, now, demo);
    } else if (mode === 'site') {
      if (siteWorld) R.draw(null, 1, now, siteWorld);
    } else if (S) {
      if (mode === 'game' && speed > 0 && !holdSim) {
        acc += dt * (C.DAY_MIN / C.REAL_SEC_PER_DAY) * C.SPEEDS[speed];
        let n = 0;
        while (acc >= C.STEP_MIN && n < 80) { Sim.step(S, C.STEP_MIN); acc -= C.STEP_MIN; n++; if (S.over) break; }
        if (n >= 80) acc = 0;
      }
      if (camTarget) {
        R.cam.x += (camTarget.x - R.cam.x) * Math.min(1, dt * 6);
        R.cam.y += (camTarget.y - R.cam.y) * Math.min(1, dt * 6);
        if (Math.hypot(camTarget.x - R.cam.x, camTarget.y - R.cam.y) < 1) camTarget = null;
      }
      R.draw(S, Math.min(1, acc / C.STEP_MIN), now);
      UI.consume(S, now);
      UI.frame(now);
      UI.update(now);
      if (mode === 'game' && now - lastSave > 60000) save();
    }
    requestAnimationFrame(loop);
  }

  // ---------- início ----------
  function boot(data) {
    A.build();
    R.init($('#view'));
    UI.init({
      place: startPlacing,
      cast: startCasting,
      casting: () => casting,
      speed: setSpeed,
      getSpeed: () => speed,
      placing: () => placing,
      save: () => { save(true); },
      toTitle: () => { save(true); S = null; showTitle(); },
      center: (x, y) => { camTarget = { x, y }; },
      over: () => { if (S) { save(true); setMode('over'); UI.showOver(S); } },
      // nascimento: pausa e pede o nome
      choice: askChoice,
      // lobos à vista: o tempo volta para 1x (dá tempo de agir)
      alarm: () => { if (speed > 1) setSpeed(1); },
      birth: (pid) => {
        if (!S || S.safe || mode !== 'game') return;
        const baby = S.people.find((q) => q.id === pid);
        if (!baby) return;
        if (modalOpen()) { setTimeout(() => UI.hooks.birth(pid), 600); return; }
        const before = speed;
        setSpeed(0);
        UI.birth(baby, () => { setSpeed(before || 1); save(); });
      },
    });
    window.addEventListener('resize', () => { R.resize(); if (mode === 'site' && siteWorld) R.cam.zoom = Math.max(0.2, R.fitZoom(siteWorld)); });
    const c = $('#view');
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onUp);
    c.addEventListener('wheel', onWheel, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'game') beaconSave(); });
    window.addEventListener('pagehide', () => { if (mode === 'game') beaconSave(); });

    $('#btn-new').addEventListener('click', () => { setMode('site'); newSiteWorld(); });
    $('#btn-continue').addEventListener('click', continueGame);
    $('#btn-login').addEventListener('click', () => UI.acct('entrar', login));
    $('#btn-signup').addEventListener('click', () => UI.acct('criar', login));
    $('#btn-logout').addEventListener('click', logout);
    $('#btn-ranking').addEventListener('click', openRanking);
    $('#btn-reroll').addEventListener('click', newSiteWorld);
    $('#btn-start').addEventListener('click', () => {
      if (!siteSel || !siteSel.valid) return;
      UI.askNames(rng, startGame, null);
    });
    $('#btn-over-new').addEventListener('click', () => {
      const s = session();
      if (s) Net.call('apagar', { token: s.token }).then(() => { s.mundo = null; Net.setSession(s); });
      Save.clear(); S = null; setMode('site'); newSiteWorld();
    });

    const hot = window.claude && window.claude.hot;
    if (hot && typeof hot.snapshot === 'function') {
      try { hot.snapshot(() => (S && mode === 'game' ? { save: Save.serialize(S) } : {})); } catch (e) { /* opcional */ }
    }
    if (data && data.save) {
      const st = Save.deserialize(data.save);
      if (st) { S = st; enterGame(); setTimeout(checkPending, 400); } else showTitle();
    } else showTitle();
    // confere a sessão em segundo plano (mundo na nuvem, relógio do servidor)
    if (session()) Net.call('hora', {}).then(() => {});

    G.debug = {
      get S() { return S; }, get mode() { return mode; },
      advance(days) { if (S) { Sim.advance(S, days * C.DAY_MIN); UI.update(0, true); } },
      setSpeed, startPlacing, startCasting, placeAt: (tx, ty) => placeAt((tx + 0.5) * TS, (ty + 0.5) * TS),
      castAt: (kind, tx, ty) => { startCasting(kind); if (casting) castAt((tx + 0.5) * TS, (ty + 0.5) * TS); },
      select: (pid) => UI.select(pid, 0, true), cam: R.cam, save: () => save(true),
    };
    requestAnimationFrame(loop);
  }

  const hot = typeof window !== 'undefined' && window.claude && window.claude.hot;
  const start = (data) => boot(data || {});
  if (hot && typeof hot.ready === 'function') hot.ready(start);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start((hot && hot.data) || {}));
  else start((hot && hot.data) || {});
})(globalThis.G = globalThis.G || {});
