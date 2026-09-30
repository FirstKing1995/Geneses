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
  let placing = null, ghost = null, casting = null, roading = null;
  let camTarget = null, holdSim = false;
  const rng = new G.RNG((Date.now() ^ 0x5bd1e995) >>> 0);

  function setMode(m) {
    mode = m;
    document.body.dataset.mode = m;
    $('#scr-title').hidden = m !== 'title';
    $('#scr-site').hidden = m !== 'site';
    $('#hud').hidden = !(m === 'game' || m === 'over');
    $('#scr-over').hidden = m !== 'over';
    if (m !== 'game') { cancelPlacing(); cancelCasting(); stopRoad(true); }
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
    let res;
    if (tab === 'criar') {
      res = await Net.call('cadastrar', f, 45000);
      // a conta pode ter sido criada mesmo com a resposta perdida no caminho (o servidor acorda devagar), ou numa
      // tentativa anterior: com os mesmos dados, entra direto
      if (!res.ok && (res.offline || res.estranha || res.falha || /Já existe/.test(res.erro || ''))) {
        const r2 = await Net.call('entrar', { email: f.email, senha: f.senha }, 45000);
        if (r2.ok) res = r2;
      }
    } else res = await Net.call('entrar', { email: f.email, senha: f.senha }, 45000);
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
    if (net) Net.warm();   // acorda o servidor enquanto o jogador olha a tela de título
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
    const minutes = S.over ? 0 : G.Offline.minutesFor(nowTrusted - (d.savedAt || nowTrusted), S);
    if (minutes >= C.DAY_MIN / 24) {
      holdSim = true;
      UI.awayProgress(0, minutes);
      // em fatias: ausências longas não travam a tela
      G.Offline.runAsync(S, minutes, (f) => UI.awayProgress(f, minutes), (r) => {
        UI.consume(S, 0, true);
        R.invalidate();
        UI.bind(S);
        UI.away(r, () => { holdSim = false; checkPending(); });
        save();
      });
    } else setTimeout(checkPending, 400);
  }
  // viajantes esperando resposta (a janela fecha com o jogo; aqui ela volta)
  function checkPending() {
    if (!S || mode !== 'game') return;
    const g = G.Narr.pending(S);
    if (g) askChoice(g.id);
    if (S.stats.eraEnd && !S.stats.eraSeen) showEra();   // a era fechou com o jogo fechado
    if (G.Deus && G.Deus.pending(S)) setTimeout(showGodPending, 900);   // Deus subiu de nível com o jogo fechado
  }
  // uma janela por vez: espera a outra fechar
  const modalOpen = () => ['#modal-birth', '#modal-choice', '#modal-away', '#modal-era', '#modal-dom'].some((id) => !$(id).hidden);
  // Etapa 11: Deus subiu de nível (o nome que o povo dá, o dom): pausa e pergunta, uma janela por vez
  function showGodPending() {
    if (!S || S.safe || mode !== 'game' || !G.Deus || !G.Deus.pending(S)) return;
    if (!$('#modal-dom').hidden) return;
    if (modalOpen()) { setTimeout(showGodPending, 700); return; }
    $('#modal-deus').hidden = true;
    const before = speed;
    setSpeed(0);
    UI.godPending(() => { setSpeed(before || 1); save(); });
  }
  // fim da Era da Família: pausa e mostra o que o povo construiu
  function showEra() {
    if (!S || S.safe || mode !== 'game' || S.stats.eraSeen) return;
    if (modalOpen()) { setTimeout(showEra, 800); return; }
    S.stats.eraSeen = true;
    const before = speed;
    setSpeed(0);
    UI.eraEnd(() => { setSpeed(before || 1); save(); });
  }
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
    cancelCasting(); stopRoad(true);
    if (placing === type) { cancelPlacing(); return; }
    placing = type;
    document.body.dataset.placing = type;
    showHint('Toque no mapa para marcar ' + C.BUILD[type].a + ' ' + C.BUILD[type].name.toLowerCase() + '.', cancelPlacing);
    if (UI.isMobile()) UI.sheet('');
    const c = R.toWorld(window.innerWidth / 2, window.innerHeight / 2);
    updateGhost(c.x, c.y);
  }
  function showHint(text, onCancel) {
    const hint = $('#place-hint');
    hint.hidden = false;
    hint.innerHTML = `<span>${text}</span><button class="btn btn-small" id="place-cancel">Cancelar</button>`;
    $('#place-cancel').onclick = onCancel;
    positionHint();
  }
  // a dica fica logo acima do painel de obras (que pode ter mais de uma fileira)
  function positionHint() {
    const hint = $('#place-hint'), panel = $('#p-construir');
    if (!hint || UI.isMobile() || !panel) { if (hint) hint.style.bottom = ''; return; }
    const r = panel.getBoundingClientRect();
    hint.style.bottom = r.height > 0 ? Math.round(window.innerHeight - r.top + 10) + 'px' : '';
  }
  function hideHint() { const h = $('#place-hint'); if (h) h.hidden = true; }
  function cancelPlacing() {
    placing = null; ghost = null; R.overlay.ghost = null;
    if (!casting && !roading) delete document.body.dataset.placing;
    if (!casting && !roading) hideHint();
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
      const costs = Object.entries(d.cost).map(([k, v]) => v + ' de ' + k);
      UI.toast(d.name + (d.a === 'o' ? ' marcado' : ' marcada') + '. ' + (costs.length ? 'Precisa de ' + (costs.length > 1 ? costs.slice(0, -1).join(', ') + ' e ' + costs[costs.length - 1] : costs[0]) + '.' : 'Só pede trabalho: o povo lavra a terra.'), '');
      if (!S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai trabalhar na obra.', 'warn');
    }
    cancelPlacing();
  }

  // ---------- milagres ----------
  function startCasting(kind) {
    if (mode !== 'game' || !S) return;
    if (casting === kind) { cancelCasting(); return; }
    const why = God.canCast(S, kind);
    if (why) { UI.toast(why + (S.god.poder < God.cost(S, kind) ? ' O Poder nasce da fé do povo.' : ''), 'warn'); return; }
    cancelPlacing(); stopRoad(true);
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
    R.overlay.cast = { kind: casting, x: tx, y: ty, r: God.radius(S, casting), ok: Sim.isSeen(S, tx, ty) &&
      (casting !== 'cura' || !!God.curaTarget(S, tx, ty)) && (casting !== 'revelacao' || !!God.dreamTarget(S, tx, ty)) };
  }
  function cancelCasting() {
    casting = null; R.overlay.cast = null;
    if (!placing && !roading) { delete document.body.dataset.placing; hideHint(); }
  }

  // ---------- caminhos (Etapa 7): arrastar pelo chão marca os passos; o povo abre com a Vontade de Construir ----------
  function startRoad() {
    if (mode !== 'game' || !S) return;
    if (roading && !roading.fence) { stopRoad(); return; }
    cancelPlacing(); cancelCasting(); stopRoad(true);
    roading = { lv: 2, stroke: null };
    document.body.dataset.placing = 'caminho';
    roadHint();
    if (UI.isMobile()) UI.sheet('');
    UI.update(0, true);
  }
  // cercas (Etapa 10): o mesmo pincel dos caminhos
  function startFence() {
    if (mode !== 'game' || !S) return;
    if (!G.Tech.known(S, 'cerca')) { UI.toast('Cerca: vem com a descoberta da cerca (' + G.Campo.DEF.cerca.learn + ').', ''); return; }
    if (roading && roading.fence) { stopRoad(); return; }
    cancelPlacing(); cancelCasting(); stopRoad(true);
    roading = { lv: 1, stroke: null, fence: true };
    document.body.dataset.placing = 'cerca';
    roadHint();
    if (UI.isMobile()) UI.sheet('');
    UI.update(0, true);
  }
  function roadHint() {
    const hint = $('#place-hint');
    hint.hidden = false;
    const lv = roading.lv;
    if (roading.fence) {
      hint.innerHTML = `<span>${UI.isMobile() ? 'Arraste com um dedo para marcar a cerca; com dois, mexe o mapa.' : 'Arraste pelo chão para marcar a cerca (o botão direito mexe o mapa).'} Feche a volta toda: árvore, pedra e água também servem de parede.</span>
      <span class="modes">
        <button class="btn btn-small${lv === 1 ? ' on' : ''}" data-rlv="1" title="Cerca de vara: 1 madeira por passo. Em cima de caminho vira porteira.">Cercar</button>
        <button class="btn btn-small${lv === 0 ? ' on' : ''}" data-rlv="0" title="Desmancha a cerca marcada ou feita.">Desfazer</button>
      </span>
      <button class="btn btn-small" id="place-cancel">Pronto</button>`;
      hint.querySelectorAll('[data-rlv]').forEach((b) => { b.onclick = () => { roading.lv = +b.dataset.rlv; roadHint(); }; });
      $('#place-cancel').onclick = () => stopRoad();
      positionHint();
      return;
    }
    hint.innerHTML = `<span>${UI.isMobile() ? 'Arraste com um dedo para marcar; com dois, mexe o mapa.' : 'Arraste pelo chão para marcar o caminho (o botão direito mexe o mapa).'}</span>
      <span class="modes">
        <button class="btn btn-small${lv === 2 ? ' on' : ''}" data-rlv="2" title="Terra batida: só trabalho. Anda-se 30% mais rápido.">Terra</button>
        <button class="btn btn-small${lv === 3 ? ' on' : ''}" data-rlv="3" title="Pedra: 1 pedra por passo. Anda-se 45% mais rápido.">Pedra</button>
        <button class="btn btn-small${lv === 0 ? ' on' : ''}" data-rlv="0" title="Desmancha o caminho marcado ou feito.">Desfazer</button>
      </span>
      <button class="btn btn-small" id="place-cancel">Pronto</button>`;
    hint.querySelectorAll('[data-rlv]').forEach((b) => { b.onclick = () => { roading.lv = +b.dataset.rlv; roadHint(); }; });
    $('#place-cancel').onclick = () => stopRoad();
    positionHint();
  }
  function stopRoad(quiet) {
    if (!roading) return;
    roading = null; R.overlay.brush = null;
    if (!placing && !casting) { delete document.body.dataset.placing; hideHint(); }
    if (!quiet) UI.update(0, true);
  }
  function tileAt(wx, wy) {
    const w = S.world, tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    return tx < 0 || ty < 0 || tx >= w.W || ty >= w.H ? -1 : ty * w.W + tx;
  }
  function paintRoad(i) {
    const st = roading && roading.stroke;
    if (!st || i < 0 || st.seen.has(i)) return;
    st.seen.add(i);
    if (roading.fence) {
      const K = G.Campo;
      if (roading.lv === 0) { if (K.markFence(S, i, false)) st.removed++; return; }
      if (K.markFence(S, i, true)) { st.marked++; return; }
      const why = K.fenceWhy(S, i);
      if (why) st.why = why; else st.had = true;   // já tinha cerca aqui
      return;
    }
    if (roading.lv === 0) { if (G.Obras.markRoad(S, i, 0)) st.removed++; return; }
    if (G.Obras.markRoad(S, i, roading.lv)) { st.marked++; return; }
    const why = G.Obras.roadWhy(S, i);
    if (why) st.why = why;
    else st.had = true;   // já tinha caminho igual ou melhor
  }
  // do passo anterior até o atual, sem pular (arrasto rápido)
  function paintLine(i0, i1) {
    const W = S.world.W;
    let x0 = i0 % W, y0 = (i0 / W) | 0;
    const x1 = i1 % W, y1 = (i1 / W) | 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let k = 0; k < 400; k++) {
      paintRoad(y0 * W + x0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // o primeiro passo só é marcado quando o dedo anda (ou solta): se vier um segundo dedo, era para mexer o mapa
  function roadDown(sx, sy) {
    const w = R.toWorld(sx, sy), i = tileAt(w.x, w.y);
    roading.stroke = { seen: new Set(), marked: 0, removed: 0, why: '', had: false, last: i, pending: true, sx, sy };
  }
  function roadMove(sx, sy) {
    const w = R.toWorld(sx, sy), i = tileAt(w.x, w.y), st = roading.stroke;
    brushAt(i);
    if (!st) return;
    if (st.pending) { if (Math.hypot(sx - st.sx, sy - st.sy) < 5) return; st.pending = false; paintRoad(st.last); }
    if (i < 0 || i === st.last) return;
    if (st.last >= 0) paintLine(st.last, i); else paintRoad(i);
    st.last = i;
  }
  function roadUp(discard) {
    const st = roading && roading.stroke;
    if (!st) return;
    if (discard && st.pending) { roading.stroke = null; return; }
    if (st.pending) paintRoad(st.last);
    roading.stroke = null;
    if (roading.fence) { fenceDone(st); return; }
    if (st.marked) UI.toast(st.marked + (st.marked === 1 ? ' passo de caminho marcado' : ' passos de caminho marcados') + (roading.lv === 3 ? ', de pedra (1 pedra cada)' : '') + '. O povo abre com a Vontade de Construir.', '');
    else if (st.removed) UI.toast(st.removed + (st.removed === 1 ? ' passo desfeito.' : ' passos desfeitos.'), '');
    else if (st.why) UI.toast(st.why + '.', 'warn');
    else if (st.had && roading.lv) UI.toast('Aí já tem caminho' + (roading.lv === 3 ? ' de pedra.' : '.'), '');
    if (st.marked && !S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai abrir o caminho.', 'warn');
    UI.update(0, true);
  }
  // fim de um traço de cerca: quanto marcou e se a volta da roça (ou do curral) fecha quando a cerca ficar pronta
  function fenceDone(st) {
    const K = G.Campo;
    if (st.marked) UI.toast(st.marked + (st.marked === 1 ? ' passo de cerca marcado' : ' passos de cerca marcados') + ' (1 madeira cada). O povo finca com a Vontade de Construir.', '');
    else if (st.removed) UI.toast(st.removed + (st.removed === 1 ? ' passo de cerca desfeito.' : ' passos de cerca desfeitos.'), '');
    else if (st.why) UI.toast(st.why + '.', 'warn');
    else if (st.had && roading.lv) UI.toast('Aí já tem cerca.', '');
    if (st.marked && !S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai fincar a cerca.', 'warn');
    if (st.marked) {
      const near = S.buildings.filter((b) => (b.type === 'roca' || b.type === 'curral') && b.built && !K.enclosed(S, b));
      const closes = near.find((b) => !K.enclPlanned(S, b).open);
      if (closes) UI.toast('Com essa cerca pronta, ' + (closes.type === 'roca' ? 'a roça fica fechada' : 'o curral fica fechado') + '.', 'good');
      else if (near.length) {
        const w = S.world, lx = st.last % w.W, ly = (st.last / w.W) | 0;
        const b = near.find((q) => Math.hypot(q.x + 1.5 - lx, q.y + 1.5 - ly) < 14);
        if (b) UI.toast('A cerca ainda não fecha a volta ' + (b.type === 'roca' ? 'da roça' : 'do curral') + ': bicho entra pela brecha. Árvore, pedra e água contam como parede.', 'warn');
      }
    }
    UI.update(0, true);
  }
  // o passo debaixo do mouse
  function brushAt(i) {
    if (!roading) return;
    if (roading.fence) {
      const w = S.world, has = i >= 0 && !!(w.fence[i] || w.fenceJob[i]);
      R.overlay.brush = { tiles: [], lv: roading.lv, fence: true, hover: i, hoverOk: roading.lv === 0 ? has : i >= 0 && !has && !G.Campo.fenceWhy(S, i) };
      return;
    }
    const why = i >= 0 ? G.Obras.roadWhy(S, i) : 'fora';
    R.overlay.brush = { tiles: [], lv: roading.lv, hover: i, hoverOk: roading.lv === 0 ? i >= 0 && !!(S.world.road[i] >= 2 || S.world.roadJob[i]) : !why };
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
    if (!$('#menu').hidden) $('#menu').hidden = true;   // tocar no mapa fecha o menu
    cv().setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: R.cam.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: R.cam.x, cy: R.cam.y };
      drag = null;
      if (roading && roading.stroke) roadUp(true);
    } else if (roading && mode === 'game' && e.button === 0) {
      drag = null;
      roadDown(e.clientX, e.clientY);
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
      // os dois dedos também arrastam o mapa
      const s = R.scale();
      R.cam.x = pinch.cx - ((a.x + b.x) / 2 - pinch.mx) / s; R.cam.y = pinch.cy - ((a.y + b.y) / 2 - pinch.my) / s;
      clampCam();
      camTarget = null;
      return;
    }
    if (roading && mode === 'game' && !drag) { if (roading.stroke || e.pointerType === 'mouse') roadMove(e.clientX, e.clientY); return; }
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
    if (roading && roading.stroke) { roadUp(); return; }
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
    if (roading) return;
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
      if (ent && ent.k === 'lobo') { UI.toast('Lobo. Um Raio (R) perto dele abate um e espanta a matilha. Quem fica na luz do fogo aceso está a salvo. Com lança na mão, o povo revida.', 'warn'); return; }
      if (ent && ent.k === 'onca') { UI.toast(G.Bichos.oncaInfo, 'warn'); return; }
      if (ent) {
        const g = S.narr.groups[ent.gid];
        if (g && g.state === 'esperando') { askChoice(g.id); return; }
        UI.toast(ent.pd.name + (g && g.state === 'indo' ? ' segue viagem.' : ' vem pela trilha. Quando chegar, pede abrigo.'), '');
        return;
      }
    }
    // bichos de criação (Etapa 10)
    if (S.campo && S.campo.bichos.length) {
      let an = null, ad = 1e9;
      for (const a of S.campo.bichos) {
        const d = Math.hypot(a.x * TS - w.x, a.y * TS - 3 - w.y);
        if (d < Math.max(9, 14 / R.scale()) && d < ad) { ad = d; an = a; }
      }
      if (an) { UI.toast(G.Campo.info(S, an), ''); return; }
    }
    // bichos (Etapa 9: cada um com o seu jeito; o jacaré, se estiver n'água, é tocado onde aparecem os olhos)
    if (S.fauna) {
      let cap = null, cd = 1e9;
      for (const e of S.fauna.ents) {
        if (e.gone || e.hidden || !Sim.isSeen(S, Math.floor(e.x), Math.floor(e.y))) continue;
        const wet = e.sp === 'jacare' && e.inWater && e.wx !== undefined, ex = wet ? e.wx : e.x, ey = wet ? e.wy : e.y;
        const big = e.sp === 'anta' || e.sp === 'jacare' ? 4 : 0;
        const d = Math.hypot(ex * TS - w.x, ey * TS - 3 - w.y);
        if (d < Math.max(10 + big, 16 / R.scale()) && d < cd) { cd = d; cap = e; }
      }
      if (cap) { UI.toast(G.Bichos.info(S, cap), cap.sp === 'jacare' || cap.state === 'investida' ? 'warn' : ''); return; }
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
  function setSpeed(i) { i = Math.max(0, Math.min(C.SPEEDS.length - 1, i | 0)); if (i > 0) lastSpeed = i; speed = i; UI.update(0, true); }
  function onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (mode !== 'game') return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); setSpeed(speed === 0 ? (lastSpeed || 1) : 0); }
    else if (k >= '1' && k <= '5' && k.length === 1) setSpeed(+k);
    else if (k === 'f') startPlacing('fogueira');
    else if (k === 'b') startPlacing('barraca');
    else if (k === 'q') startCasting('calor');
    else if (k === 'r') startCasting('raio');
    else if (k === 'u') startCasting('chuva');
    else if (k === 'e') startCasting('cura');
    else if (k === 'v') startCasting('revelacao');
    else if (k === 'z') startCasting('bencao');   // Etapa 11
    else if (k === 'm' || k === 'j' || k === 'o' || k === 'g' || k === 'k' || k === 'l' || k === 'h' || k === 'y') {
      const t = { m: 'moquem', j: 'jirau', o: 'forno', g: 'armazem', k: 'marcenaria', l: 'tecelagem', h: 'roca', y: 'curral' }[k];
      if (G.Tech.buildOpen(S, t)) startPlacing(t);
      else { const d = C.BUILD[t], why = d.need && !G.Tech.known(S, d.need) ? 'vem com ' + G.Tech.DISC[d.need].name.toLowerCase() : G.Obras.openWhy(S, t); UI.toast(d.name + ': ' + why + '.', ''); }
    }
    else if (k === 'p') startRoad();
    else if (k === 'x') startFence();
    else if (k === 'i') { if ($('#modal-disc').hidden) UI.disc(); else $('#modal-disc').hidden = true; }
    else if (k === 't') { if ($('#modal-tree').hidden) UI.tree(); else $('#modal-tree').hidden = true; }
    else if (k === 'n' && G.Audio) { const on = G.Audio.toggle(); if (UI.syncSound) UI.syncSound(); UI.toast(on ? 'Som ligado.' : 'Som desligado.', ''); }
    else if (k === 'c') UI.sheet(document.body.dataset.sheet === 'cronica' ? '' : 'cronica');
    else if (k === 'escape') {
      if (!$('#modal-deus').hidden) $('#modal-deus').hidden = true;
      else if (!$('#menu').hidden) $('#menu').hidden = true; else if (placing) cancelPlacing(); else if (casting) cancelCasting(); else if (roading) stopRoad();
      else if (UI.sel && (UI.sel.person || UI.sel.building)) UI.select(0, 0);
      else if (document.body.dataset.sheet) UI.sheet('');
      else UI.closeAll();   // no computador: fecha os painéis abertos
    }
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
    if (G.Audio) G.Audio.frame(S && (mode === 'game' || mode === 'over') && !holdSim ? S : null, mode, mode === 'game' ? speed : 1);
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
      if (!holdSim) {   // com o mundo seguindo fora (tempo offline), os avisos esperam o resumo
        UI.consume(S, now);
        UI.frame(now);
        UI.update(now);
        if (mode === 'game' && now - lastSave > 60000) save();
      }
    }
    requestAnimationFrame(loop);
  }

  // ---------- início ----------
  function boot(data) {
    A.build();
    R.init($('#view'));
    if (G.Audio) G.Audio.init();
    UI.init({
      place: startPlacing,
      road: startRoad,
      roading: () => !!(roading && !roading.fence),
      fence: startFence,
      fencing: () => !!(roading && roading.fence),
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
      era: showEra,
      godPending: showGodPending,
      panels: () => positionHint(),
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
    window.addEventListener('resize', () => { R.resize(); positionHint(); if (mode === 'site' && siteWorld) R.cam.zoom = Math.max(0.2, R.fitZoom(siteWorld)); });
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
    $('#btn-login').addEventListener('click', () => { Net.warm(); UI.acct('entrar', login); });
    $('#btn-signup').addEventListener('click', () => { Net.warm(); UI.acct('criar', login); });
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
      setSpeed, startPlacing, startCasting, startRoad, startFence, stopRoad, placeAt: (tx, ty) => placeAt((tx + 0.5) * TS, (ty + 0.5) * TS),
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
