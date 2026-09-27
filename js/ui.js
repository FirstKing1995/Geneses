/* Gênesis · interface (DOM): HUD, Vontades, povo, construir, Crônica, avisos e balões. */
(function (G) {
  'use strict';
  const C = G.CFG, Sim = G.Sim, AI = G.AI, A = G.Art;
  const UI = G.UI = {};
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icons = {};
  const ic = (n) => icons[n] || (icons[n] = A.iconURL(n));
  const pad = G.U.pad2;
  let S = null;
  UI.sel = { person: 0, building: 0 };

  const VORDER = ['frutas', 'pesca', 'agua', 'madeira', 'pedra', 'construir', 'fogo'];
  const VICON = { frutas: 'frutas', pesca: 'peixe', agua: 'agua', madeira: 'madeira', pedra: 'pedra', construir: 'construir', fogo: 'fogo' };
  const VHELP = {
    frutas: 'Colher pitangas nos arbustos. Arbustos não dão fruta no inverno.',
    pesca: 'Pescar na beira da água. Peixe assado na fogueira sustenta mais.',
    agua: 'Encher as cabaças para beber no acampamento.',
    madeira: 'Cortar árvores. Lenha para a fogueira e para as obras.',
    pedra: 'Quebrar pedras. Precisa para a fogueira e a barraca avançada.',
    construir: 'Levar material e erguer as obras que você marcar.',
    fogo: 'Manter a fogueira acesa quando esfria.',
  };
  const LEVELS = ['Proibido', 'Baixa', 'Normal', 'Máxima'];
  const NEEDS = [['fome', 'Fome', 'fome'], ['sede', 'Sede', 'sede'], ['energia', 'Energia', 'energia'], ['calor', 'Calor', 'calor'], ['social', 'Social', 'social'], ['saude', 'Saúde', 'saude']];
  const GOAL_HINT = {
    filho: 'O casal precisa dormir junto na barraca, com comida em dia.',
    camas: 'Barraca simples: um casal e uma criança. Marque outra.',
    estoque: 'Mais bocas: suba Frutas e Pesca nas Vontades.',
    ajuda: 'Aos 7 anos a criança colhe frutas e busca água.',
    povo: 'Cuide dos partos: a Cura salva um parto difícil.',
    fogo: 'Construir → Fogueira, perto do estoque.',
    barraca: 'Construir → Barraca simples, perto do fogo.',
    comida: 'Suba Frutas e Pesca nas Vontades.',
    lenha: 'Suba Madeira antes do outono.',
    inverno: 'Fogo aceso, comida e lenha até a primavera.',
  };
  const RES = [['madeira', 'madeira'], ['pedra', 'pedra'], ['agua', 'agua'], ['frutas', 'frutas'], ['peixe', 'peixe']];
  const RES_NAME = { madeira: 'Madeira', pedra: 'Pedra', agua: 'Água', frutas: 'Frutas', peixe: 'Peixe' };

  // ---------- montagem ----------
  UI.init = function (hooks) {
    UI.hooks = hooks;
    // ícones estáticos
    document.querySelectorAll('#mobnav button').forEach((b) => {
      const n = { vontades: 'verao', construir: 'construir', deus: 'deus', povo: 'pessoa', cronica: 'cronica' }[b.dataset.open];
      b.querySelector('img').src = ic(n);
    });
    $('#btn-cronica img').src = ic('cronica');
    // Vontades
    $('#vontades').innerHTML = VORDER.map((w) => `
      <div class="vrow" data-w="${w}" title="${esc(VHELP[w])}">
        <img class="ico" src="${ic(VICON[w])}" alt="">
        <div class="lbl"><span>${AI.LABEL[w]}</span><span class="who"></span></div>
        <div class="meter" role="radiogroup" aria-label="Vontade: ${AI.LABEL[w]}">
          ${[0, 1, 2, 3].map((l) => `<button data-l="${l}" role="radio" aria-label="${LEVELS[l]}" title="${LEVELS[l]}">${l === 0 ? '<span>×</span>' : ''}</button>`).join('')}
        </div>
      </div>`).join('');
    $('#vontades').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-l]'); if (!b || !S) return;
      const w = b.closest('.vrow').dataset.w;
      S.vontades[w] = +b.dataset.l;
      paintVontades(true);
    });
    // construir
    const builds = [['fogueira', 'fogo', 'F'], ['barraca', 'barraca', 'B']];
    $('#builds').innerHTML = builds.map(([t, icn, key]) => {
      const d = C.BUILD[t];
      return `<button class="btn bbtn" data-build="${t}" title="${esc(d.desc)}">
        <img class="ico" src="${ic(icn)}" alt=""><span>${d.name}<kbd>${key}</kbd></span>
        <span class="cost">${Object.keys(d.cost).map((k) => `<span data-c="${k}"><img src="${ic(k)}" alt="${RES_NAME[k]}"> ${d.cost[k]}</span>`).join('')}</span>
      </button>`;
    }).join('');
    $('#builds').addEventListener('click', (e) => {
      const b = e.target.closest('[data-build]'); if (!b) return;
      UI.hooks.place(b.dataset.build);
    });
    // Deus: milagres e orações
    const keys = { calor: 'Q', raio: 'R', chuva: 'U', cura: 'E' };
    $('#miracles').innerHTML = Object.keys(G.God.MIRACLES).map((k) => {
      const m = G.God.MIRACLES[k];
      return `<button class="btn mbtn" data-mir="${k}" title="${esc(m.desc)}"><img class="ico" src="${ic(m.icon)}" alt=""><span>${m.name} <kbd>${keys[k]}</kbd></span><span class="cost">${m.cost} de Poder</span></button>`;
    }).join('');
    $('#miracles').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mir]'); if (!b) return;
      UI.hooks.cast(b.dataset.mir);
    });
    $('#prayers').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pid]'); if (!b || !S) return;
      const p = S.people.find((q) => q.id === +b.dataset.pid);
      if (!p || !p.prayer) return;
      // leva até quem precisa (na Cura, é o doente, não quem reza)
      const t = G.Family.person(S, p.prayer.target) || p;
      const shown = t.carriedBy ? (G.Family.person(S, t.carriedBy) || t) : t;
      UI.select(shown.id, 0, true);
      UI.hooks.cast(G.God.PRAYER_HELP[p.prayer.kind]);
    });
    // árvore da família
    $('#btn-tree img').src = ic('arvore');
    $('#btn-tree').addEventListener('click', () => UI.tree());
    $('#tree-close').addEventListener('click', () => { $('#modal-tree').hidden = true; });
    // povo
    $('#people').addEventListener('click', (e) => {
      const c = e.target.closest('[data-pid]'); if (!c) return;
      UI.select(+c.dataset.pid, 0, true);
    });
    $('#inspector').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !S) return;
      if (b.dataset.act === 'rename') {
        const kid = S.people.find((q) => q.id === UI.sel.person);
        if (kid) UI.birth(kid, null, true);
        return;
      }
      const bd = Sim.building(S, UI.sel.building); if (!bd) return;
      if (b.dataset.act === 'upgrade') { Sim.startUpgrade(S, bd); UI.toast('Melhoria marcada. O povo vai levar material.', ''); }
      if (b.dataset.act === 'remove') {
        if (b.dataset.armed) { Sim.removeBuilding(S, bd); UI.select(0, 0); UI.toast(C.BUILD[bd.type].name + ' removida. Material devolvido ao estoque.', ''); }
        else { b.dataset.armed = '1'; b.textContent = 'Confirmar remoção'; }
        return;
      }
      if (b.dataset.act === 'back') UI.select(0, 0);
      lastInsp = '';
    });
    // Crônica e painéis
    $('#btn-cronica').addEventListener('click', () => UI.sheet(document.body.dataset.sheet === 'cronica' ? '' : 'cronica'));
    $('#cronica-close').addEventListener('click', () => UI.sheet(''));
    document.querySelectorAll('#mobnav button').forEach((b) => b.addEventListener('click', () => {
      UI.sheet(document.body.dataset.sheet === b.dataset.open ? '' : b.dataset.open);
    }));
    // velocidade e menu
    document.querySelectorAll('.spd[data-speed]').forEach((b) => b.addEventListener('click', () => UI.hooks.speed(+b.dataset.speed)));
    const pause = document.querySelector('.spd[data-speed="0"]');
    pause.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="1" width="3" height="12" fill="currentColor"/><rect x="9" y="1" width="3" height="12" fill="currentColor"/></svg>';
    $('#btn-menu').innerHTML = '<svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true"><rect y="1" width="16" height="2" fill="currentColor"/><rect y="6" width="16" height="2" fill="currentColor"/><rect y="11" width="16" height="2" fill="currentColor"/></svg>';
    $('#btn-menu').addEventListener('click', () => { $('#menu').hidden = !$('#menu').hidden; });
    $('#menu-save').addEventListener('click', () => { UI.hooks.save(); });
    // Narrador: dá para trocar no meio do jogo
    const ns = $('#menu-narr');
    ns.innerHTML = Object.keys(C.NARRADORES).map((k) => `<option value="${k}">${esc(C.NARRADORES[k].name)}</option>`).join('');
    ns.addEventListener('change', () => {
      if (!S || !G.Narr.setKind(S, ns.value)) return;
      const k = C.NARRADORES[ns.value];
      $('#narr-desc').textContent = k.desc;
      UI.toast('Narrador ' + k.name + '. ' + k.desc, '');
    });
    $('#menu-title').addEventListener('click', () => { $('#menu').hidden = true; UI.hooks.toTitle(); });
  };

  UI.sheet = function (name) {
    if (name) document.body.dataset.sheet = name; else delete document.body.dataset.sheet;
    document.querySelectorAll('#mobnav button').forEach((b) => b.classList.toggle('on', b.dataset.open === name));
  };
  UI.isMobile = () => window.matchMedia('(max-width: 820px)').matches;

  UI.bind = function (state) {
    S = state;
    if (S.narr) { $('#menu-narr').value = S.narr.kind; $('#narr-desc').textContent = G.Narr.kind(S).desc; }
    UI.sel = { person: 0, building: 0 };
    lastInsp = ''; cardsKey = '';
    $('#chron').innerHTML = '';
    for (const c of S.chron) addChron(c, false);
    $('#toasts').innerHTML = '';
    bubbles.forEach((b) => b.el.remove()); bubbles.clear();
    UI.update(0, true);
  };

  UI.select = function (pid, bid, center) {
    UI.sel.person = pid || 0; UI.sel.building = bid || 0;
    G.R.overlay.selPerson = UI.sel.person; G.R.overlay.selBuilding = UI.sel.building;
    lastInsp = ''; cardsKey = '';
    if (pid && S) {
      const p = S.people.find((q) => q.id === pid);
      if (p && p.alive) { AI.touch(S, p); if (center) UI.hooks.center(p.x * C.TILE, p.y * C.TILE); }
    }
    if ((pid || bid) && UI.isMobile()) UI.sheet('povo');
    UI.update(0, true);
  };

  // ---------- atualização ----------
  let lastUpd = 0, lastInsp = '', cardsKey = '';
  UI.update = function (now, force) {
    if (!S) return;
    if (!force && now - lastUpd < 180) return;
    lastUpd = now;
    const ck = S.ck;
    $('#season-ico').src = ic(['primavera', 'verao', 'outono', 'inverno'][ck.season]);
    $('#season-name').textContent = C.SEASONS[ck.season];
    $('#season-day').textContent = 'dia ' + ck.dos;
    $('#year-label').textContent = 'Ano ' + ck.year;
    const dw = Sim.daysToWinter(S);
    const fc = $('#forecast');
    fc.textContent = ck.season === 3 ? 'Primavera em ' + (C.SEASON_DAYS - ck.dos + 1) + (C.SEASON_DAYS - ck.dos + 1 === 1 ? ' dia' : ' dias') : 'Inverno em ' + dw + (dw === 1 ? ' dia' : ' dias');
    fc.classList.toggle('soon', ck.season !== 3 && dw <= 10);
    paintEvent();
    const h = Math.floor(ck.hour), m = Math.floor((ck.hour - h) * 60 / 10) * 10;
    $('#clock').textContent = pad(h) + ':' + pad(m);
    $('#temp').textContent = Math.round(S.temp) + ' °C';
    const wk = S.precip || (Sim.weatherOf(S, ck.day).kind === 'nublado' ? 'nublado' : 'limpo');
    $('#weather-ico').src = ic(wk === 'limpo' && (ck.hour < 6 || ck.hour >= 19) ? 'energia' : wk);
    $('#weather-ico').alt = { limpo: 'Céu limpo', nublado: 'Nublado', chuva: 'Chuva', neve: 'Neve' }[wk];
    paintStock();
    paintVontades(false);
    paintGoals();
    paintBuilds();
    paintPeople();
    paintInspector();
    paintGod();
    document.querySelectorAll('.spd[data-speed]').forEach((b) => b.classList.toggle('on', +b.dataset.speed === UI.hooks.getSpeed()));
  };

  // faixa do almanaque: o que o Narrador trouxe (ou está trazendo)
  const EV_ICON = { lobos: 'lobo', nevasca: 'neve', tempestade: 'chuva', seca: 'seca', andarilho: 'pessoa', fartura: 'frutas', piracema: 'peixe', veranico: 'verao' };
  function paintEvent() {
    const el = $('#event-line'), st = G.Narr.status(S);
    if (!st) { if (!el.hidden) { el.hidden = true; delete document.body.dataset.ev; } return; }
    el.hidden = false; document.body.dataset.ev = st.k;
    el.className = 'event-line small ' + st.tone;
    const img = el.querySelector('img'), src = ic(EV_ICON[st.k] || 'deus');
    if (img.getAttribute('src') !== src) img.src = src;
    const sp = el.querySelector('span');
    if (sp.textContent !== st.text) sp.textContent = st.text;
  }
  function paintStock() {
    const st = S.stock;
    const html = RES.map(([k, icn]) => `<span class="it" title="${RES_NAME[k]}"><img class="ico" src="${ic(icn)}" alt="${RES_NAME[k]}">${k === 'agua' ? st.agua + '/' + C.WATER_CAP : st[k]}</span>`).join('') +
      `<span class="food">Comida para <b>${S.ctx.foodDays < 1 ? 'menos de 1 dia' : Math.floor(S.ctx.foodDays) + (Math.floor(S.ctx.foodDays) === 1 ? ' dia' : ' dias')}</b>` +
      (S.stats.rottedToday ? ` · estragaram ${S.stats.rottedToday} ontem` : '') + `</span>`;
    setHTML($('#stock'), html);
  }
  function paintVontades(force) {
    document.querySelectorAll('.vrow').forEach((row) => {
      const w = row.dataset.w, v = S.vontades[w] | 0;
      row.querySelectorAll('button').forEach((b) => {
        const l = +b.dataset.l;
        b.classList.toggle('fill', l > 0 && l <= v);
        b.classList.toggle('off0', l === 0 && v === 0);
        b.setAttribute('aria-checked', l === v ? 'true' : 'false');
      });
      const who = S.people.filter((p) => p.alive && p.act && p.act.type === w).map((p) => p.name);
      row.querySelector('.who').textContent = who.length ? who.join(', ') : '';
    });
  }
  function paintGoals() {
    $('#goals-title').textContent = S.goalsPhase === 2 ? 'Metas da Família' : 'Metas do Ato 1';
    let next = true;
    const html = S.goals.map((g) => {
      let cls = g.done ? 'done' : '';
      let hint = '';
      if (!g.done && next) { cls = 'next'; hint = `<span class="hint">${esc(GOAL_HINT[g.id])}</span>`; next = false; }
      return `<li class="${cls}"><span class="box"></span><span>${esc(g.text)}${hint}</span></li>`;
    }).join('');
    setHTML($('#goals'), html);
  }
  function paintBuilds() {
    document.querySelectorAll('.bbtn').forEach((b) => {
      const d = C.BUILD[b.dataset.build];
      b.classList.toggle('on', UI.hooks.placing() === b.dataset.build);
      b.querySelectorAll('[data-c]').forEach((s) => s.classList.toggle('lack', S.stock[s.dataset.c] < d.cost[s.dataset.c]));
    });
  }
  function barCls(v) { return v < 25 ? 'low' : v < 50 ? 'mid' : ''; }
  function ordered() {
    return S.people.slice().sort((a, b) => (b.alive - a.alive) || (a.born - b.born));
  }
  UI.ageText = function (st, p) {
    const F = G.Family, y = F.age(st, p);
    if (y < 1) return p.sex === 'F' ? 'recém-nascida' : 'recém-nascido';
    const lbl = F.stageLabel(st, p);
    return (y === 1 ? '1 ano' : y + ' anos') + (lbl === 'adulto' || lbl === 'adulta' ? '' : ' · ' + lbl);
  };
  function paintPeople() {
    const list = $('#people');
    const key = ordered().map((p) => p.id + (p.alive ? 'a' : 'd')).join(',') + '|' + UI.sel.person;
    if (key !== cardsKey) {
      cardsKey = key;
      list.innerHTML = ordered().map((p) => `
        <button class="pcard${p.id === UI.sel.person ? ' sel' : ''}${p.alive ? '' : ' dead'}" data-pid="${p.id}">
          <div class="row1"><span class="nm">${esc(p.name)}${p.alive ? '' : ' †'}</span><span class="small muted age"></span></div>
          <div class="doing"></div>
          ${p.alive ? `<div class="minibars">${NEEDS.slice(0, 4).map(([k, , icn]) => `<div class="mb" title="${k}"><img class="ico" src="${ic(icn)}" alt=""><div class="bar"><i data-n="${k}"></i></div></div>`).join('')}</div>` : ''}
        </button>`).join('');
    }
    for (const p of S.people) {
      const c = list.querySelector(`[data-pid="${p.id}"]`); if (!c) continue;
      c.querySelector('.age').textContent = p.alive ? UI.ageText(S, p) : Sim.ageOf(S, p) + (Sim.ageOf(S, p) === 1 ? ' ano' : ' anos');
      c.querySelector('.doing').textContent = AI.describe(S, p);
      c.querySelectorAll('i[data-n]').forEach((i) => { const v = p.needs[i.dataset.n]; i.style.width = v + '%'; i.className = barCls(v); });
    }
    const n = S.people.filter((p) => p.alive).length;
    $('#povo-title').textContent = 'Seu povo · ' + n;
  }
  function paintGod() {
    const g = S.god; if (!g) return;
    $('#poder-num').textContent = Math.floor(g.poder);
    $('#poder-bar').style.width = Math.min(100, g.poder / C.POWER_MAX * 100) + '%';
    $('#align-mark').style.left = ((g.align + 100) / 2) + '%';
    document.querySelectorAll('.mbtn').forEach((b) => {
      const m = G.God.MIRACLES[b.dataset.mir], open = G.God.unlocked(S, b.dataset.mir);
      b.classList.toggle('poor', g.poder < m.cost);
      b.classList.toggle('locked', !open);
      b.title = open ? m.desc : 'Libera com o primeiro filho. ' + m.desc;
      b.classList.toggle('on', UI.hooks.casting() === b.dataset.mir);
    });
    const pr = S.people.filter((p) => p.alive && p.prayer);
    const html = pr.map((p) => {
      const h = Math.max(0, Math.ceil((p.prayer.until - S.t) / 60));
      const help = G.God.MIRACLES[G.God.PRAYER_HELP[p.prayer.kind]].name;
      return `<li><button data-pid="${p.id}"><span class="q">“${esc(p.prayer.text)}”</span><span class="meta">${esc(p.name)} · faltam ${h} h · atenda com ${help}</span></button></li>`;
    }).join('');
    setHTML($('#prayers'), html);
  }
  function paintInspector() {
    const el = $('#inspector');
    if (UI.sel.person) {
      const p = S.people.find((q) => q.id === UI.sel.person);
      if (!p) { el.innerHTML = ''; return; }
      const n = p.needs;
      const needs = NEEDS.map(([k, lbl, icn]) => `<div class="need"><img class="ico" src="${ic(icn)}" alt=""><span>${lbl}</span><div class="bar"><i class="${barCls(n[k])}" style="width:${n[k]}%"></i></div><span class="v">${Math.round(n[k])}</span></div>`).join('') +
        `<div class="need"><img class="ico" src="${ic('humor')}" alt=""><span>Humor</span><div class="bar"><i class="${barCls(p.mood)}" style="width:${p.mood}%"></i></div><span class="v">${p.mood}</span></div>` +
        `<div class="need"><img class="ico" src="${ic('deus')}" alt=""><span>Fé</span><div class="bar"><i class="${barCls(p.fe)}" style="width:${p.fe}%"></i></div><span class="v">${Math.round(p.fe)}</span></div>`;
      const mems = p.mem.slice().sort((a, b) => Math.abs(Sim.MEM[b.k].v) - Math.abs(Sim.MEM[a.k].v)).slice(0, 6)
        .map((m) => { const d = Sim.MEM[m.k]; return `<li class="${d.v >= 0 ? 'pos' : 'neg'}">${d.v > 0 ? '+' : ''}${d.v} ${esc(d.t)}</li>`; }).join('');
      const skills = Object.keys(p.skills).map((k) => `<span>${AI.SKILL_LABEL[k]}</span><span>nível ${AI.lvl(p, k)}</span>`).join('');
      const F = G.Family;
      // família: par, pais, filhos, irmãos, avós, netos
      const groups = {};
      for (const k of F.family(S, p)) {
        const r = k.r, lbl = { companheira: 'Companheira', companheiro: 'Companheiro', 'mãe': 'Mãe', pai: 'Pai', filha: 'Filhos', filho: 'Filhos', 'irmã': 'Irmãos', 'irmão': 'Irmãos', 'avó': 'Avós', 'avô': 'Avós', neta: 'Netos', neto: 'Netos' }[r];
        if (!lbl) continue;
        const who = esc(k.q.name) + (k.q.alive ? (lbl === 'Filhos' || lbl === 'Irmãos' || lbl === 'Netos' ? ' (' + F.age(S, k.q) + ')' : '') : ' †');
        (groups[lbl] = groups[lbl] || []).push(who + (lbl.startsWith('Compan') && k.q.alive ? ' · afeto ' + Math.round(p.afeto || 0) : ''));
      }
      const fam = ['Companheira', 'Companheiro', 'Mãe', 'Pai', 'Filhos', 'Irmãos', 'Avós', 'Netos'].filter((k) => groups[k])
        .map((k) => `<span>${k}</span><span>${groups[k].join(', ')}</span>`).join('');
      let state = '';
      if (p.alive && p.labor) state = p.labor.hard && !p.labor.helped ? 'Parto difícil. A Cura salva mãe e bebê.' : 'Em trabalho de parto.';
      else if (p.alive && p.preg && p.preg.known) { const d = Math.max(1, Math.ceil((p.preg.due - S.t) / C.DAY_MIN)); state = 'Grávida · o bebê chega em ' + d + (d === 1 ? ' dia.' : ' dias.'); }
      const who = p.sex === 'F' ? 'Ela' : 'Ele';
      const html = `<div class="insp">
        <h3><span>${esc(p.name)}</span><span class="small muted">${who}, ${p.alive ? UI.ageText(S, p) : Sim.ageOf(S, p) + ' anos'}</span></h3>
        <p class="small">${p.alive ? esc(AI.describe(S, p)) + ' · ' + feel(p.tempHere) : esc(AI.describe(S, p)) + '.'}</p>
        ${state ? `<p class="small preg">${esc(state)}</p>` : ''}
        ${p.prayer ? `<p class="story">Reza: “${esc(p.prayer.text)}”</p>` : ''}
        <div class="chips">${p.traits.map((t) => `<span class="chip" title="${esc(Sim.TRAIT_DESC[t])}">${esc(t)}</span>`).join('')}</div>
        ${p.alive ? `<div class="needs">${needs}</div>` : ''}
        ${fam ? `<div class="kv fam">${fam}</div>` : ''}
        ${p.alive && (p.mother || p.father) && F.age(S, p) < 3 ? '<div class="chips"><button class="btn btn-small" data-act="rename">Dar outro nome</button></div>' : ''}
        ${p.carriedBy ? '' : `<div class="kv">${skills}</div>`}
        ${mems ? `<ul class="mems">${mems}</ul>` : ''}
      </div>`;
      setHTML(el, html);
      return;
    }
    if (UI.sel.building) {
      const b = Sim.building(S, UI.sel.building);
      if (!b) { el.innerHTML = ''; return; }
      const d = C.BUILD[b.type], job = Sim.jobOf(b);
      let status = '';
      if (job) {
        const need = (job.cost.madeira || 0) + (job.cost.pedra || 0), have = job.have.madeira + job.have.pedra;
        status = (b.up ? 'Melhorando para ' + C.BUILD[b.up.to].name.toLowerCase() + '. ' : 'Em obra. ') +
          'Material ' + have + '/' + need + (job.progress > 0 ? ' · trabalho ' + Math.floor(job.progress * 100) + '%' : '');
      } else if (b.type === 'fogueira') status = b.fuel > 0 ? 'Acesa · lenha ' + b.fuel.toFixed(1) + '/' + C.FIRE_CAP : 'Apagada · o povo reacende quando esfriar';
      else status = 'Dormem aqui: ' + (b.beds.map((id) => { const q = S.people.find((x) => x.id === id && x.alive); return q ? q.name : ''; }).filter(Boolean).join(', ') || 'ninguém ainda') +
        ' · ' + G.Family.tentLoad(S, b) + ' de ' + d.cap + ' lugares';
      const canUp = b.built && !b.up && Object.keys(C.BUILD).some((k) => C.BUILD[k].from === b.type);
      const sig = b.id + b.type + (b.built ? 1 : 0) + (b.up ? 1 : 0) + canUp;
      if (lastInsp !== sig) {
        lastInsp = sig;
        el.innerHTML = `<div class="insp">
          <h3><span>${esc(d.name)}</span></h3>
          <p class="small muted">${esc(d.desc)}</p>
          <p class="small" id="bstatus"></p>
          <div class="chips">
            ${canUp ? `<button class="btn btn-small" data-act="upgrade">Melhorar (${Object.keys(C.BUILD).filter((k) => C.BUILD[k].from === b.type).map((k) => Object.entries(C.BUILD[k].cost).map(([r, v]) => v + ' ' + r).join(', '))})</button>` : ''}
            <button class="btn btn-small" data-act="remove">${b.built ? 'Remover' : 'Cancelar obra'}</button>
          </div>
        </div>`;
      }
      const st = el.querySelector('#bstatus'); if (st) st.textContent = status;
      return;
    }
    if (el.innerHTML) el.innerHTML = '';
    lastInsp = '';
  }
  function feel(t) { return t >= 30 ? 'com calor' : t >= C.COMFORT ? 'confortável' : t >= 8 ? 'com frio' : t >= 0 ? 'com muito frio' : 'congelando'; }
  function moodWord(m) { return m >= 75 ? 'radiante' : m >= 55 ? 'feliz' : m >= 40 ? 'em paz' : m >= 25 ? 'triste' : 'em desespero'; }
  function setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }

  // ---------- eventos da simulação ----------
  UI.consume = function (state, now) {
    const ev = state.events;
    if (!ev.length) return;
    for (const e of ev) {
      if (e.k === 'toast') UI.toast(e.text, e.tone);
      else if (e.k === 'prayer') UI.toast(e.text, 'prayer');
      else if (e.k === 'chron') { addChron({ t: state.t, text: e.text }, !e.birth); }
      else if (e.k === 'birth') { if (UI.hooks.birth) UI.hooks.birth(e.pid); }
      else if (e.k === 'float') UI.float(e.x, e.y, e.text);
      else if (e.k === 'over') UI.hooks.over();
      else if (e.k === 'choice') { if (UI.hooks.choice) UI.hooks.choice(e.gid); }
      else if (e.k === 'narr') { if (e.on && e.ev === 'lobos' && UI.hooks.alarm) UI.hooks.alarm(); }
      else if (e.k === 'bite') { G.R.event(e); if (UI.hooks.alarm) UI.hooks.alarm(); }
      else if (e.k === 'arrived') {
        if (!state.stats.firstFire && !state.buildings.length) {
          setTimeout(() => UI.toast('Eles chegaram. Marque uma fogueira perto do estoque: Construir → Fogueira.', 'good'), 2600);
          setTimeout(() => UI.toast('Toque em alguém para ver o que sente. As Vontades dizem o que priorizar.', ''), 7000);
        }
      }
      else G.R.event(e);
    }
    ev.length = 0;
  };
  UI.refreshChron = function () {
    $('#chron').innerHTML = '';
    for (const c of S.chron) addChron(c, false);
  };
  function addChron(c, toast) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="when">${esc(Sim.dateText(c.t))}</span><span class="what">${esc(c.text)}</span>`;
    const list = $('#chron');
    list.insertBefore(li, list.firstChild);
    if (toast) UI.toast(c.text, 'chron');
  }
  UI.toast = function (text, tone) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('out'), tone === 'chron' ? 5200 : 4200);
    setTimeout(() => el.remove(), tone === 'chron' ? 5800 : 4800);
  };
  UI.float = function (x, y, text) {
    const s = G.R.toScreen(x * C.TILE, y * C.TILE);
    const el = document.createElement('div');
    el.className = 'float';
    el.textContent = text;
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
    $('#fx').appendChild(el);
    setTimeout(() => el.remove(), 1700);
  };

  // ---------- balões de fala ----------
  const bubbles = new Map();
  UI.frame = function (now) {
    if (!S) return;
    const scale = G.R.scale();
    for (const p of S.people) {
      let b = bubbles.get(p.id);
      if (!b) { b = { el: document.createElement('div'), id: -1, t0: 0 }; b.el.className = 'bubble'; b.el.hidden = true; $('#fx').appendChild(b.el); bubbles.set(p.id, b); }
      if (p.sayId !== b.id) { b.id = p.sayId; b.t0 = now; b.el.textContent = p.say || ''; b.el.classList.toggle('god', AI.LINES.deus.indexOf(p.say) >= 0 || !!(p.prayer && p.prayer.text === p.say)); }
      const show = p.alive && p.say && now - b.t0 < 3400 && b.t0 > 0 && scale >= 1.5;
      if (!show) { if (!b.el.hidden) b.el.hidden = true; continue; }
      const s = G.R.toScreen(p.x * C.TILE, (p.inTent ? p.y - 1.6 : p.y) * C.TILE - 12);
      b.el.hidden = false;
      b.el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
    }
  };

  // ---------- escolha do local ----------
  UI.siteInfo = function (w, s) {
    if (!s) { $('#site-title').textContent = 'Nenhum lugar escolhido'; $('#site-stats').innerHTML = ''; $('#site-reason').hidden = true; $('#btn-start').disabled = true; return; }
    $('#site-title').textContent = s.valid ? G.TNAME[s.tile] + ', ' + G.W.siteLabel(w, s) : 'Aqui não dá';
    const clima = s.cold > 0.35 ? 'Frio (montanha)' : s.cold > 0.15 ? 'Fresco' : 'Ameno';
    $('#site-stats').innerHTML = [
      ['madeira', 'Árvores', s.trees], ['pedra', 'Pedras', s.rocks], ['frutas', 'Pitangueiras', s.bushes],
      ['agua', 'Água', s.waterDist >= 99 ? 'longe' : s.waterDist <= 1 ? 'ao lado (' + s.waterKind + ')' : 'a ' + s.waterDist + ' passos (' + s.waterKind + ')'],
      ['termometro', 'Clima', clima],
    ].map(([i, k, v]) => `<dt><img class="ico" src="${ic(i)}" alt="">${k}</dt><dd>${v}</dd>`).join('');
    $('#site-reason').hidden = s.valid;
    $('#site-reason').textContent = s.reason;
    $('#btn-start').disabled = !s.valid;
  };

  UI.askNames = function (rng, cb, back) {
    const f = $('#name-f'), m = $('#name-m');
    const [a, b] = Sim.randomNames(rng);
    f.value = a; m.value = b;
    // Narrador: Equilibrado vem marcado
    $('#narr-opts').innerHTML = Object.keys(C.NARRADORES).map((k) => {
      const n = C.NARRADORES[k];
      return `<label class="narr-opt"><input type="radio" name="narr" value="${k}"${k === C.NARR_DEFAULT ? ' checked' : ''}><b>${esc(n.name)}</b><span>${esc(n.desc)}</span></label>`;
    }).join('');
    $('#modal-names').hidden = false;
    const roll = (e) => {
      const t = e.target.closest('[data-roll]'); if (!t) return;
      const pool = t.dataset.roll === 'F' ? Sim.namePool.FEM : Sim.namePool.MASC;
      (t.dataset.roll === 'F' ? f : m).value = rng.pick(pool);
    };
    const form = $('#form-names');
    form.onclick = roll;
    form.onsubmit = (e) => {
      e.preventDefault();
      const nf = f.value.trim() || a, nm = m.value.trim() || b;
      const pick = form.querySelector('input[name="narr"]:checked');
      $('#modal-names').hidden = true;
      cb([nf, nm], pick ? pick.value : C.NARR_DEFAULT);
    };
    $('#btn-names-back').onclick = () => { $('#modal-names').hidden = true; if (back) back(); };
    setTimeout(() => f.focus(), 50);
  };

  // ---------- conta ----------
  UI.acct = function (tab, onSubmit) {
    const form = $('#form-acct');
    const set = (t) => {
      form.classList.toggle('criar', t === 'criar');
      form.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
      $('#acct-title').textContent = t === 'criar' ? 'Criar conta' : 'Entrar';
      $('#acct-submit').textContent = t === 'criar' ? 'Criar conta' : 'Entrar';
      $('#acct-senha').setAttribute('autocomplete', t === 'criar' ? 'new-password' : 'current-password');
      form.dataset.tab = t;
      $('#acct-erro').hidden = true;
    };
    set(tab);
    form.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => set(b.dataset.tab); });
    $('#modal-acct').hidden = false;
    $('#acct-cancel').onclick = () => { $('#modal-acct').hidden = true; };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#acct-submit');
      btn.disabled = true; const label = btn.textContent; btn.textContent = 'Aguarde…';
      const res = await onSubmit(form.dataset.tab, { nome: $('#acct-nome').value.trim(), email: $('#acct-email').value.trim(), senha: $('#acct-senha').value });
      btn.disabled = false; btn.textContent = label;
      if (res && res.ok) { $('#modal-acct').hidden = true; $('#acct-senha').value = ''; }
      else { const er = $('#acct-erro'); er.textContent = (res && res.erro) || 'Não deu certo. Tente de novo.'; er.hidden = false; }
    };
    setTimeout(() => (tab === 'criar' ? $('#acct-nome') : $('#acct-email')).focus(), 50);
  };
  UI.ranking = function (list, erro) {
    $('#rank-list').innerHTML = erro ? `<li>${esc(erro)}</li>` : (list && list.length ? list.map((r) => `<li><b>${esc(r.nome)}</b> — ${r.anos ? r.anos + (r.anos === 1 ? ' ano' : ' anos') : 'primeiro ano'} <span>· ${esc(r.local || '')} · ${r.vivos} ${r.vivos === 1 ? 'vivo' : 'vivos'}</span></li>`).join('') : '<li>Ninguém no ranking ainda.</li>');
    $('#modal-rank').hidden = false;
    $('#rank-close').onclick = () => { $('#modal-rank').hidden = true; };
  };
  UI.away = function (r, onOk) {
    const days = Math.round(r.days);
    $('#away-lead').textContent = days < 1 ? 'Passaram poucas horas. O povo seguiu a vida.' :
      'Passaram ' + days + (days === 1 ? ' dia' : ' dias') + ', de ' + Sim.dateText(r.from).toLowerCase() + ' até ' + Sim.dateText(r.to).toLowerCase() + '.';
    const RS = ['madeira', 'pedra', 'agua', 'frutas', 'peixe'];
    $('#away-stats').innerHTML = RS.map((k) => {
      const d = r.stockAfter[k] - r.stockBefore[k];
      return `<dt><img class="ico" src="${ic(k)}" alt="">${RES_NAME[k]}</dt><dd>${r.stockAfter[k]} <span class="small muted">(${d >= 0 ? '+' : ''}${d})</span></dd>`;
    }).join('') + r.alive.map((a) => `<dt><img class="ico" src="${ic('pessoa')}" alt="">${esc(a.name)}</dt><dd>saúde ${a.saude} · ${moodWord(a.humor)}</dd>`).join('');
    $('#away-chron').innerHTML = r.newChron.slice().reverse().map((c) => `<li><span class="when">${esc(Sim.dateText(c.t))}</span><span class="what">${esc(c.text)}</span></li>`).join('');
    $('#modal-away').hidden = false;
    $('#away-ok').onclick = () => { $('#modal-away').hidden = true; if (onOk) onOk(); };
  };
  UI.busy = function (text) {
    $('#away-title').textContent = text || 'Enquanto você esteve fora…';
  };

  // ---------- nascimento: Deus dá o nome ----------
  UI.birth = function (baby, onDone, rename) {
    const F = G.Family, ela = baby.sex === 'F';
    const mom = F.person(S, baby.mother), dad = F.person(S, baby.father);
    const pais = [mom, dad].filter(Boolean).map((q) => q.name).join(' e ');
    const ck = S.ck;
    $('#birth-ico').src = ic('bebe');
    $('#birth-title').textContent = rename ? 'Outro nome para ' + baby.name : ela ? 'Nasceu uma menina!' : 'Nasceu um menino!';
    $('#birth-lead').textContent = rename ? (ela ? 'Filha' : 'Filho') + ' de ' + pais + '.' :
      (ela ? 'Filha' : 'Filho') + ' de ' + pais + ', ' + C.SEASONS[ck.season].toLowerCase() + ' do ano ' + ck.year + '. Que nome ' + (ela ? 'ela' : 'ele') + ' vai ter?';
    $('#form-birth .modal-actions .small').textContent = rename ? '' : 'O jogo fica pausado até você decidir.';
    const input = $('#birth-name');
    input.value = baby.name;
    $('#birth-roll').onclick = () => { input.value = F.pickName(S, baby.sex); };
    $('#form-birth').onsubmit = (e) => {
      e.preventDefault();
      F.rename(S, baby.id, input.value);
      $('#modal-birth').hidden = true;
      cardsKey = ''; lastInsp = '';
      UI.refreshChron();
      if (!rename) UI.toast('Bem-vind' + (ela ? 'a' : 'o') + ', ' + baby.name + '.', 'chron');
      if (onDone) onDone();
    };
    $('#modal-birth').hidden = false;
    setTimeout(() => { input.focus(); input.select(); }, 50);
  };

  // ---------- viajantes: acolher ou mandar seguir ----------
  UI.choice = function (gid, onDone) {
    const info = G.Narr.groupInfo(S, gid);
    if (!info) { if (onDone) onDone(null); return false; }
    const ps = info.people, one = ps.length === 1;
    const mom = ps.find((q) => q.role === 'mae'), dad = ps.find((q) => q.role === 'pai'), kid = ps.find((q) => q.role === 'filho');
    $('#choice-ico').src = ic('pessoa');
    if (info.kind === 'casal') {
      $('#choice-title').textContent = 'Um casal pede abrigo';
      $('#choice-lead').textContent = (mom ? mom.name : '') + ' e ' + (dad ? dad.name : '') + ' vêm de longe' +
        (kid ? ', com ' + (kid.sex === 'F' ? 'a filha ' : 'o filho ') + kid.name + ', de ' + kid.age + ' anos' : '') +
        '. Contam que perderam tudo no último inverno e pedem para ficar.';
    } else {
      const p = ps[0], ela = p.sex === 'F';
      $('#choice-title').textContent = ela ? 'Uma andarilha pede abrigo' : 'Um andarilho pede abrigo';
      $('#choice-lead').textContent = p.name + ', ' + p.age + ' anos, chegou pela trilha com uma trouxa nas costas. ' + (ela ? 'Ela' : 'Ele') + ' pede para ficar e trabalhar.';
    }
    const roleTxt = { mae: 'mãe', pai: 'pai', filho: null, so: null };
    $('#choice-people').innerHTML = ps.map((p, i) => `<li><canvas data-i="${i}" width="8" height="14"></canvas>
      <div class="nm">${esc(p.name)}<span class="small">${p.age} anos${roleTxt[p.role] ? ' · ' + roleTxt[p.role] : p.role === 'filho' ? ' · ' + (p.sex === 'F' ? 'filha' : 'filho') : ''}</span></div>
      <div class="chips">${p.traits.map((t) => `<span class="chip" title="${esc(Sim.TRAIT_DESC[t])}">${esc(t)}</span>`).join('')}</div></li>`).join('');
    ps.forEach((p, i) => {
      const cv = $('#choice-people').querySelector(`canvas[data-i="${i}"]`);
      const sh = A.personSheet({ id: 'c' + gid + ':' + i, sex: p.sex, look: p.look });
      cv.getContext('2d').drawImage(sh.sheet, 0, 0, 8, 14, 0, 0, 8, 14);
    });
    const beds = G.Family.bedsTotal(S), need = G.Family.bedsNeeded(S) + ps.length * 2;
    $('#choice-note').textContent = 'Hoje: comida para ' + Math.floor(S.ctx.foodDays) + (Math.floor(S.ctx.foodDays) === 1 ? ' dia' : ' dias') +
      ' · barracas com ' + beds + ' lugares, ' + (need > beds ? 'faltariam ' + (need - beds) : 'sobrariam ' + (beds - need)) + ' com ' + (one ? 'quem chegou' : 'eles') + '.' +
      (info.kind === 'casal' ? ' Recusar é para sempre: não vem outro casal.' : '');
    $('#choice-yes').textContent = one ? 'Acolher' : 'Acolher os três';
    const close = (accept) => { $('#modal-choice').hidden = true; if (onDone) onDone(accept); };
    $('#choice-yes').onclick = () => close(true);
    $('#choice-no').onclick = () => close(false);
    $('#modal-choice').hidden = false;
    setTimeout(() => $('#choice-yes').focus(), 50);
    return true;
  };

  // ---------- árvore da família (SVG montado aqui) ----------
  UI.tree = function () {
    if (!S) return;
    const F = G.Family, people = S.people.slice();
    const gen = new Map();
    const g = (p) => {
      if (gen.has(p.id)) return gen.get(p.id);
      gen.set(p.id, 0);
      let v = 0;
      for (const id of [p.mother, p.father]) { const q = F.person(S, id); if (q) v = Math.max(v, g(q) + 1); }
      gen.set(p.id, v);
      return v;
    };
    people.forEach(g);
    // quem chegou de fora fica na geração do par
    for (const p of people) if (!p.mother && !p.father && p.partner) { const q = F.person(S, p.partner); if (q && (q.mother || q.father)) gen.set(p.id, gen.get(q.id)); }
    const rows = [];
    for (const p of people) { const r = gen.get(p.id); (rows[r] = rows[r] || []).push(p); }
    const order = new Map();
    const pkey = (p) => Math.min(order.has(p.mother) ? order.get(p.mother) : 1e9, order.has(p.father) ? order.get(p.father) : 1e9);
    for (let ri = 0; ri < rows.length; ri++) {
      const row = (rows[ri] || []).sort((a, b) => pkey(a) - pkey(b) || a.born - b.born);
      const out = [];
      for (const p of row) {
        if (out.indexOf(p) >= 0) continue;
        out.push(p);
        const q = F.person(S, p.partner);
        if (q && row.indexOf(q) >= 0 && out.indexOf(q) < 0) out.push(q);
      }
      rows[ri] = out;
      out.forEach((p, i) => order.set(p.id, ri * 1000 + i));
    }
    const NW = 112, NH = 46, GX = 14, GY = 50, PAD = 16;
    const widest = Math.max(1, ...rows.map((r) => (r ? r.length : 0)));
    const Wd = Math.max(360, widest * NW + (widest - 1) * GX + PAD * 2);
    const pos = new Map();
    rows.forEach((row, ri) => {
      const w = row.length * NW + (row.length - 1) * GX;
      row.forEach((p, i) => pos.set(p.id, { x: (Wd - w) / 2 + i * (NW + GX), y: PAD + ri * (NH + GY) }));
    });
    const Hd = PAD * 2 + rows.length * NH + (rows.length - 1) * GY;
    let lines = '', nodes = '';
    // casais: traço entre os dois, com um coração
    const done = new Set();
    for (const p of people) {
      const q = F.person(S, p.partner);
      if (!q || done.has(p.id) || !pos.has(q.id)) continue;
      done.add(p.id); done.add(q.id);
      const a = pos.get(p.id), b = pos.get(q.id);
      if (a.y !== b.y) continue;
      const x1 = Math.min(a.x, b.x) + NW, x2 = Math.max(a.x, b.x), y = a.y + NH / 2;
      lines += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="t-couple"/><circle cx="${(x1 + x2) / 2}" cy="${y}" r="3.5" class="t-heart"/>`;
    }
    // filhos: descem do meio do casal (ou de quem estiver)
    const fams = new Map();
    for (const p of people) {
      if (!p.mother && !p.father) continue;
      const k = [p.mother, p.father].sort().join('-');
      (fams.get(k) || fams.set(k, []).get(k)).push(p);
    }
    for (const [k, kids] of fams) {
      const par = k.split('-').map(Number).filter(Boolean).map((id) => pos.get(id)).filter(Boolean);
      if (!par.length) continue;
      const px = par.length === 2 && par[0].y === par[1].y ? (Math.min(par[0].x, par[1].x) + NW + Math.max(par[0].x, par[1].x)) / 2 : par[0].x + NW / 2;
      const py = par.length === 2 && par[0].y === par[1].y ? par[0].y + NH / 2 : par[0].y + NH;
      const ks = kids.map((c) => pos.get(c.id)).filter(Boolean);
      if (!ks.length) continue;
      const by = ks[0].y - GY / 2;
      const xs = ks.map((c) => c.x + NW / 2);
      lines += `<path d="M${px} ${py}V${by}" class="t-line"/>`;
      lines += `<path d="M${Math.min(px, ...xs)} ${by}H${Math.max(px, ...xs)}" class="t-line"/>`;
      for (const x of xs) lines += `<path d="M${x} ${by}V${ks[0].y}" class="t-line"/>`;
    }
    for (const p of people) {
      const a = pos.get(p.id);
      const age = p.alive ? UI.ageText(S, p) : '† ' + Sim.ageOf(S, p) + (Sim.ageOf(S, p) === 1 ? ' ano' : ' anos');
      nodes += `<g class="t-node${p.alive ? '' : ' dead'}${p.sex === 'F' ? ' f' : ' m'}" data-pid="${p.id}" transform="translate(${a.x},${a.y})">` +
        `<rect width="${NW}" height="${NH}" rx="6"/><text x="10" y="19" class="t-name">${esc(p.name)}</text><text x="10" y="35" class="t-age">${esc(age)}</text></g>`;
    }
    $('#tree').innerHTML = `<svg viewBox="0 0 ${Wd} ${Hd}" width="${Wd}" height="${Hd}" role="img" aria-label="Árvore da família">${lines}${nodes}</svg>`;
    $('#tree').onclick = (e) => {
      const n = e.target.closest('[data-pid]'); if (!n) return;
      const id = +n.getAttribute('data-pid'), q = F.person(S, id);
      if (!q) return;
      $('#modal-tree').hidden = true;
      UI.select(q.carriedBy ? q.carriedBy : id, 0, true);
      if (q.carriedBy) UI.select(id, 0, false);
    };
    $('#modal-tree').hidden = false;
    // começa com o casal fundador no meio (no celular a árvore rola para os lados)
    const box = $('#tree');
    box.scrollLeft = Math.max(0, (box.scrollWidth - box.clientWidth) / 2);
  };

  UI.showOver = function (state) {
    $('#over-chron').innerHTML = state.chron.slice().reverse().map((c) => `<li><span class="when">${esc(Sim.dateText(c.t))}</span><span class="what">${esc(c.text)}</span></li>`).join('');
    $('#scr-over').hidden = false;
  };
})(globalThis.G = globalThis.G || {});
