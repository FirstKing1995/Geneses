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

  const VORDER = ['frutas', 'pesca', 'caca', 'agua', 'madeira', 'pedra', 'argila', 'construir', 'oficio', 'conservar', 'fogo'];
  const VICON = { frutas: 'frutas', pesca: 'peixe', caca: 'lanca', agua: 'agua', madeira: 'madeira', pedra: 'pedra', argila: 'argila',
    construir: 'construir', oficio: 'ferramentas', conservar: 'moquem', fogo: 'fogo' };
  const VHELP = {
    frutas: 'Colher pitangas nos arbustos. Arbustos não dão fruta no inverno.',
    pesca: 'Pescar na beira da água. Peixe assado na fogueira sustenta mais.',
    caca: 'Caçar capivaras com a lança: carne e couro para roupas. Precisa de ferramenta.',
    agua: 'Encher as cabaças para beber no acampamento.',
    madeira: 'Cortar árvores. Lenha para a fogueira e para as obras. Depois dos cestos, cada árvore dá também 2 de fibra.',
    pedra: 'Quebrar pedras. Precisa para a fogueira, a barraca avançada e as ferramentas.',
    argila: 'Cavar barro na beira d\'água, para o forno de barro.',
    construir: 'Levar material, erguer e melhorar as obras que você marcar, e abrir os caminhos marcados.',
    oficio: 'Ferramentas (1 pedra e 1 madeira) e roupas de couro (2 couros). Com as oficinas: tábuas na marcenaria (2 madeira) e mantas e redes na tecelagem (fibra).',
    conservar: 'Levar peixe e carne ao moquém e frutas ao jirau: comida que dura o inverno.',
    fogo: 'Manter a fogueira acesa quando esfria.',
  };
  const LEVELS = ['Proibido', 'Baixa', 'Normal', 'Máxima'];
  const NEEDS = [['fome', 'Fome', 'fome'], ['sede', 'Sede', 'sede'], ['energia', 'Energia', 'energia'], ['calor', 'Calor', 'calor'], ['social', 'Social', 'social'], ['saude', 'Saúde', 'saude']];
  const GOAL_HINT = {
    olhar: 'Toque em alguém no mapa ou na lista do Povo.',
    vontade: 'Nas Vontades, toque nos quadradinhos de um trabalho.',
    frutas20: 'Suba Frutas nas Vontades: colhem nas pitangueiras.',
    agua10: 'Suba Água nas Vontades.',
    peixe5: 'Suba Pesca nas Vontades.',
    milagre: 'Em Deus, escolha um milagre e toque no mapa.',
    historia: 'De tardinha, com o fogo aceso, alguém conta uma história.',
    oracao: 'Quando alguém rezar, toque na oração em Deus.',
    festa: 'Nascimento, descoberta e o fim do inverno dão festa à noite.',
    ensino: 'Quem sabe muito ensina os jovens de 7 a 17 anos.',
    filho: 'Um par de mulher e homem precisa dormir junto na barraca, com comida em dia.',
    camas: 'Barraca simples: um casal e uma criança. Marque outra.',
    estoque: 'Mais bocas: suba Frutas e Pesca nas Vontades.',
    ajuda: 'Aos 7 anos a criança colhe frutas e busca água.',
    povo: 'Cuide dos partos: a Cura salva um parto difícil.',
    fogo: 'Construir → Fogueira, perto do estoque.',
    barraca: 'Construir → Barraca simples, perto do fogo.',
    comida: 'Suba Frutas e Pesca nas Vontades.',
    lenha: 'Suba Madeira antes do outono.',
    inverno: 'Fogo aceso, comida e lenha até a primavera.',
    d_pedra: 'Quem corta madeira e quebra pedra acaba lascando uma pedra.',
    d_ferramentas: 'Suba Ofício: 1 pedra e 1 madeira viram uma ferramenta.',
    d_conserva: 'Construa moquém e jirau e suba Conservar, antes do inverno.',
    d_roupas: 'Suba Caça (couro) e Ofício (roupas): 2 couros por roupa.',
    d_ceramica: 'Quem busca água no barranco aprende o barro. A Revelação ajuda.',
    d_aldeia: 'Acolha quem pede abrigo e cuide dos partos.',
    o_fogueira: 'Toque na fogueira e escolha Melhorar: 8 pedras viram uma roda de pedras.',
    o_caminho: 'Construir → Caminho e arraste pelo chão. Construir, nas Vontades, abre.',
    o_armazem: 'Construir → Armazém, a até 8 passos do estoque.',
    o_tabuas: 'Construa uma marcenaria. O Ofício faz tábuas quando uma obra pede.',
    o_casa: 'Melhore uma barraca avançada. A casa depende do lugar: água, mata, campo ou serra.',
    o_oficinas: 'A marcenaria vem com a pedra lascada; a tecelagem, com os cestos.',
    o_mantas: 'Na tecelagem, o Ofício tece mantas com a fibra das árvores cortadas.',
    o_caminhos: 'Ligue o estoque à água, às obras e ao mato: por caminho se anda mais depressa.',
    o_melhorias: 'Toque numa obra pronta e escolha Melhorar.',
    // Etapa 8: invenções
    i_faca: 'A faca vem do Ofício, de cortar madeira e de carnear a caça. Veja em Povo → Descobertas → Invenções.',
    i_corda: 'A corda vem de tirar embira (cortando árvores), colher, tecer e construir.',
    i_tres: 'Várias invenções andam ao mesmo tempo, cada uma com o seu trabalho. Veja o que falta em Povo → Descobertas.',
    i_arco: 'Com o arco inventado, suba Caça nas Vontades.',
    i_tambor: 'Com o tambor inventado, a próxima festa tem batuque: nascimento, fim do inverno, fartura ou descoberta.',
    i_todas: 'A Revelação (tecla V) adianta a invenção que você escolher na janela das Descobertas.',
  };
  // estoque: os cinco de sempre e os da Etapa 5, que aparecem quando existem
  const RES = [['madeira', 'madeira'], ['pedra', 'pedra'], ['argila', 'argila'], ['tabuas', 'tabuas'], ['fibra', 'fibra'], ['agua', 'agua'], ['frutas', 'frutas'], ['peixe', 'peixe'], ['carne', 'carne'],
    ['defumado', 'defumado'], ['seca', 'frutaseca'], ['couro', 'couro'], ['ferramentas', 'ferramentas'], ['roupas', 'roupas'], ['mantas', 'mantas'], ['redes', 'redes']];
  const RES_BASE = new Set(['madeira', 'pedra', 'agua', 'frutas', 'peixe']);
  const RES_NAME = { madeira: 'Madeira', pedra: 'Pedra', agua: 'Água', frutas: 'Frutas', peixe: 'Peixe', carne: 'Carne', couro: 'Couro', argila: 'Argila',
    defumado: 'Defumado (peixe e carne)', seca: 'Fruta seca', ferramentas: 'Ferramentas', roupas: 'Roupas de couro',
    tabuas: 'Tábuas', fibra: 'Fibra (embira)', mantas: 'Mantas', redes: 'Redes de dormir' };
  // o nome do material no meio de uma frase
  const MAT_WORD = { madeira: 'madeira', pedra: 'pedra', argila: 'argila', tabuas: 'tábuas', fibra: 'fibra' };
  UI.RES_NAME = RES_NAME;

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
      if (S.vontades[w] !== +b.dataset.l) S.stats.vontadeChanged = true;
      S.vontades[w] = +b.dataset.l;
      paintVontades(true);
    });
    // construir (as das descobertas aparecem com elas; o armazém, depois do primeiro inverno) e a ferramenta de caminho
    const builds = [['fogueira', 'fogo'], ['barraca', 'barraca'], ['armazem', 'armazem'], ['moquem', 'moquem'], ['jirau', 'jirau'], ['forno', 'forno'],
      ['marcenaria', 'marcenaria'], ['tecelagem', 'tecelagem']];
    const SHORT = { barraca: 'Barraca', forno: 'Forno' };   // nome curto no botão (o painel fica em duas fileiras)
    $('#builds').innerHTML = builds.map(([t, icn]) => {
      const d = C.BUILD[t];
      return `<button class="btn bbtn" data-build="${t}" title="${esc(d.name + ': ' + d.desc)}">
        <img class="ico" src="${ic(icn)}" alt=""><span>${SHORT[t] || d.name}<kbd>${d.key}</kbd></span>
        <span class="cost">${Object.keys(d.cost).map((k) => `<span data-c="${k}"><img src="${ic(k)}" alt="${RES_NAME[k]}"> ${d.cost[k]}</span>`).join('')}</span>
      </button>`;
    }).join('') + `<button class="btn bbtn" data-tool="caminho" title="Arraste pelo chão para marcar um caminho. Terra: só trabalho, anda-se 30% mais rápido. Pedra: 1 pedra por passo, 45% mais rápido.">
        <img class="ico" src="${ic('caminho')}" alt=""><span>Caminho<kbd>P</kbd></span><span class="cost"><span>arraste no chão</span></span>
      </button>`;
    $('#builds').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tool]'); if (t) { UI.hooks.road(); return; }
      const b = e.target.closest('[data-build]'); if (!b) return;
      UI.hooks.place(b.dataset.build);
    });
    // Deus: milagres e orações
    const keys = { calor: 'Q', raio: 'R', chuva: 'U', cura: 'E', revelacao: 'V' };
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
    // árvore da família e descobertas
    $('#btn-tree img').src = ic('arvore');
    $('#btn-tree').addEventListener('click', () => UI.tree());
    $('#tree-close').addEventListener('click', () => { $('#modal-tree').hidden = true; });
    $('#btn-disc img').src = ic('lasca');
    $('#btn-disc').addEventListener('click', () => UI.disc());
    $('#disc-close').addEventListener('click', () => { $('#modal-disc').hidden = true; });
    $('#modal-disc').addEventListener('click', (e) => {
      const t = e.target.closest('[data-dtab]'); if (t) { UI.disc(t.dataset.dtab); return; }
      const b = e.target.closest('[data-reveal]'); if (!b) return;
      if (S && S.tech) S.tech.aim = b.dataset.reveal;   // a Revelação vai entregar esta (Etapa 8)
      $('#modal-disc').hidden = true;
      UI.hooks.cast('revelacao');
    });
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
      if (b.dataset.act === 'upgrade') {
        const kind = b.dataset.kind || null;
        if (Sim.startUpgrade(S, bd, kind)) {
          const d = Sim.upDef(bd);
          UI.toast('Melhoria marcada: ' + d.name.toLowerCase() + '. O povo vai levar ' + costText(d.cost) + '.', '');
          if (!S.vontades.construir) UI.toast('Construir está proibido nas Vontades. Ninguém vai trabalhar na obra.', 'warn');
        }
      }
      if (b.dataset.act === 'remove') {
        const d = Sim.def(bd), was = bd.up ? 'A melhoria foi desmarcada' : d.name + (d.a === 'o' ? ' removido' : ' removida');
        if (b.dataset.armed || bd.up) { Sim.removeBuilding(S, bd); if (!bd.up && !S.buildings.includes(bd)) UI.select(0, 0); UI.toast(was + '. Material devolvido ao estoque.', ''); }
        else { b.dataset.armed = '1'; b.textContent = 'Confirmar remoção'; }
        lastInsp = '';
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
    $('#menu-close').addEventListener('click', () => { $('#menu').hidden = true; });
    // tempo com o jogo fechado
    const off = $('#menu-offline');
    off.innerHTML = C.OFFLINE_RATE_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    off.addEventListener('change', () => { if (!S) return; S.opts = S.opts || {}; S.opts.offline = +off.value; UI.toast('Com o jogo fechado: ' + C.OFFLINE_RATE_NAMES[+off.value] + '.'); });
    $('#menu-save').addEventListener('click', () => { UI.hooks.save(); });
    // som: chave geral e as três trilhas (guardado neste aparelho)
    const Au = G.Audio;
    if (Au) {
      const sync = () => { $('#snd-on').checked = Au.pref.on; $('#snd-music').value = Math.round(Au.pref.music * 100); $('#snd-amb').value = Math.round(Au.pref.amb * 100); $('#snd-sfx').value = Math.round(Au.pref.sfx * 100); };
      sync();
      UI.syncSound = sync;
      $('#snd-on').addEventListener('change', (e) => { Au.unlock(); Au.set('on', e.target.checked); });
      for (const [id, k] of [['#snd-music', 'music'], ['#snd-amb', 'amb'], ['#snd-sfx', 'sfx']]) $(id).addEventListener('input', (e) => { Au.unlock(); Au.set(k, +e.target.value / 100); });
      // um clique de leve nos botões do jogo
      document.addEventListener('click', (e) => { if (e.target.closest('.vrow button, .bbtn, .mbtn, .spd, .pcard')) Au.ui('click'); });
    }
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
    $('#menu-offline').value = String(S.opts && S.opts.offline !== undefined ? S.opts.offline : C.OFFLINE_RATE_DEFAULT);
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
      if (p && p.alive) { AI.touch(S, p); S.stats.inspected = true; if (center) UI.hooks.center(p.x * C.TILE, p.y * C.TILE); }
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
    const st = S.stock, T = G.Tech;
    // o que ainda não existe no jogo não aparece; o que já apareceu fica, mesmo zerado
    const seen = S.stats.stockSeen || (S.stats.stockSeen = {});
    for (const [k] of RES) if (!RES_BASE.has(k) && st[k] > 0) seen[k] = 1;
    if (T.known(S, 'pedra')) seen.ferramentas = 1;
    const html = RES.filter(([k]) => RES_BASE.has(k) || seen[k]).map(([k, icn]) => `<span class="it" title="${RES_NAME[k]}"><img class="ico" src="${ic(icn)}" alt="${RES_NAME[k]}">${k === 'agua' ? st.agua + '/' + T.waterCap(S) : st[k]}</span>`).join('') +
      `<span class="food">Comida para <b>${S.ctx.foodDays < 1 ? 'menos de 1 dia' : Math.floor(S.ctx.foodDays) + (Math.floor(S.ctx.foodDays) === 1 ? ' dia' : ' dias')}</b>` +
      (S.stats.rottedToday ? ` · estragaram ${S.stats.rottedToday} ontem` : '') + `</span>`;
    setHTML($('#stock'), html);
  }
  function paintVontades(force) {
    document.querySelectorAll('.vrow').forEach((row) => {
      const w = row.dataset.w, v = S.vontades[w] | 0;
      const open = G.Tech.workOpen(S, w);
      if (row.hidden === open) row.hidden = !open;
      if (!open) return;
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
  // metas: quantas já foram e as próximas 4 (a primeira com a dica); cada uma mostra o Poder que rende
  function paintGoals() {
    const done = S.goals.filter((g) => g.done).length;
    $('#goals-title').textContent = (S.goalsPhase === 4 ? (S.stats.aldeiaGoals ? 'A aldeia tomou forma' : 'Metas da Aldeia') : S.stats.eraEnd ? 'Era da Família completa' : S.goalsPhase === 3 ? 'Metas das Descobertas' : S.goalsPhase === 2 ? 'Metas da Família' : 'Metas do Ato 1') +
      ' · ' + done + ' de ' + S.goals.length;
    const open = S.goals.filter((g) => !g.done).slice(0, 4);
    const html = open.map((g, i) => {
      const hint = i === 0 && GOAL_HINT[g.id] ? `<span class="hint">${esc(GOAL_HINT[g.id])}</span>` : '';
      const rw = g.reward ? `<span class="rw" title="Poder que a meta rende">+${g.reward}</span>` : '';
      return `<li class="${i === 0 ? 'next' : ''}${g.opt ? ' opt' : ''}"><span class="box"></span><span>${esc(g.text)}${hint}</span>${rw}</li>`;
    }).join('') || '<li class="done"><span class="box"></span><span>Todas cumpridas.</span></li>';
    setHTML($('#goals'), html);
  }
  function paintBuilds() {
    document.querySelectorAll('.bbtn').forEach((b) => {
      if (b.dataset.tool) { b.classList.toggle('on', !!(UI.hooks.roading && UI.hooks.roading())); return; }
      const d = C.BUILD[b.dataset.build];
      const open = G.Tech.buildOpen(S, b.dataset.build);
      if (b.hidden === open) b.hidden = !open;
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
    $('#poder-bar').style.width = Math.min(100, g.poder / C.POWER_BAR * 100) + '%';
    $('#align-mark').style.left = ((g.align + 100) / 2) + '%';
    document.querySelectorAll('.mbtn').forEach((b) => {
      const m = G.God.MIRACLES[b.dataset.mir], open = G.God.unlocked(S, b.dataset.mir);
      b.classList.toggle('poor', g.poder < m.cost);
      b.classList.toggle('locked', !open);
      b.title = open ? m.desc : G.God.lockedText(b.dataset.mir) + ' ' + m.desc;
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
        .map((m) => { const d = Sim.MEM[m.k]; return `<li class="${d.v >= 0 ? 'pos' : 'neg'}">${d.v > 0 ? '+' : ''}${d.v} ${esc(p.sex === 'F' && d.tf ? d.tf : d.t)}</li>`; }).join('');
      const skills = Object.keys(p.skills).filter((k) => AI.SKILL_LABEL[k] && (['coleta', 'pesca', 'construcao'].indexOf(k) >= 0 || p.skills[k] > 0))
        .map((k) => `<span>${AI.SKILL_LABEL[k]}</span><span>nível ${AI.lvl(p, k)}</span>`).join('');
      const F = G.Family;
      // família: par, pais, filhos, irmãos, avós, netos
      const groups = {};
      for (const k of F.family(S, p)) {
        const r = k.r, lbl = { companheira: 'Companheira', companheiro: 'Companheiro', 'mãe': 'Mãe', pai: 'Pai', filha: 'Filhos', filho: 'Filhos', 'irmã': 'Irmãos', 'irmão': 'Irmãos', 'avó': 'Avós', 'avô': 'Avós', neta: 'Netos', neto: 'Netos' }[r];
        if (!lbl) continue;
        const who = esc(k.q.name) + (k.q.alive ? (lbl === 'Filhos' || lbl === 'Irmãos' || lbl === 'Netos' ? ' (' + F.age(S, k.q) + ')' : '') : ' †');
        (groups[lbl] = groups[lbl] || []).push(who + (lbl.startsWith('Compan') && k.q.alive ? ' · afeto ' + Math.round(F.afeto(p, k.q)) : ''));
      }
      const fam = ['Companheira', 'Companheiro', 'Mãe', 'Pai', 'Filhos', 'Irmãos', 'Avós', 'Netos'].filter((k) => groups[k])
        .map((k) => `<span>${k}${k.startsWith('Compan') && groups[k].length > 1 ? 's' : ''}</span><span>${groups[k].join(', ')}</span>`).join('');
      let state = '';
      if (p.alive && p.labor) state = p.labor.hard && !p.labor.helped ? 'Parto difícil. A Cura salva mãe e bebê.' : 'Em trabalho de parto.';
      else if (p.alive && p.preg && p.preg.known) { const d = Math.max(1, Math.ceil((p.preg.due - S.t) / C.DAY_MIN)); state = 'Grávida · o bebê chega em ' + d + (d === 1 ? ' dia.' : ' dias.'); }
      const who = p.sex === 'F' ? 'Ela' : 'Ele';
      // Etapa 6: a última conversa e quem está brigado
      const talk = p.alive && p.talk && S.t - p.talk.t < 2 * C.DAY_MIN ? `<div class="talk"><span class="small muted">Última conversa${p.talk.kind === 'briga' ? ' (briga)' : p.talk.kind === 'consolo' ? ' (consolo)' : p.talk.kind === 'pazes' ? ' (pazes)' : ''}</span>${p.talk.lines.map(([n, t]) => `<p><b>${esc(n)}:</b> “${esc(t)}”</p>`).join('')}</div>` : '';
      const feud = p.alive && p.feud ? Object.keys(p.feud).filter((id) => p.feud[id] > S.t).map((id) => { const q = F.person(S, +id); return q && q.alive ? q.name : ''; }).filter(Boolean) : [];
      if (feud.length) state = (state ? state + ' ' : '') + 'Brigad' + (p.sex === 'F' ? 'a' : 'o') + ' com ' + feud.join(' e ') + ': sem se falar por uns dias.';
      const html = `<div class="insp">
        <h3><span>${esc(p.name)}</span><span class="small muted">${who}, ${p.alive ? UI.ageText(S, p) : Sim.ageOf(S, p) + ' anos'}</span></h3>
        <p class="small">${p.alive ? esc(AI.describe(S, p)) + ' · ' + feel(p.tempHere) : esc(AI.describe(S, p)) + '.'}</p>
        ${state ? `<p class="small preg">${esc(state)}</p>` : ''}
        ${p.prayer ? `<p class="story">Reza: “${esc(p.prayer.text)}”</p>` : ''}
        ${talk}
        <div class="chips">${p.traits.map((t) => `<span class="chip" title="${esc(Sim.TRAIT_DESC[t])}">${esc(t)}</span>`).join('')}</div>
        ${p.alive ? gear(p) : ''}
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
      const d = Sim.def(b), job = Sim.jobOf(b);
      const opts = Sim.upgrades(S, b);
      const sig = b.id + ':' + (d.lv || 1) + (d.kind || '') + (b.built ? 1 : 0) + (b.up ? 'u' + b.up.lv + (b.up.kind || '') : '') + '|' + opts.map((o) => (o.kind || '') + (o.why ? 0 : 1)).join(',');
      if (lastInsp !== sig) {
        lastInsp = sig;
        const lvChip = C.BUILD[b.type].up ? `<span class="small muted">nível ${d.lv || 1}${d.max ? ' · o último' : ''}</span>` : '';
        el.innerHTML = `<div class="insp">
          <h3><span>${esc(d.name)}</span>${lvChip}</h3>
          <p class="small muted">${esc(d.desc)}</p>
          <p class="small" id="bstatus"></p>
          ${b.built && !b.up && opts.length ? upgradeHTML(b, opts) : ''}
          <div class="chips">
            <button class="btn btn-small" data-act="remove">${b.up ? 'Cancelar melhoria' : b.built ? 'Remover' : 'Cancelar obra'}</button>
          </div>
        </div>`;
      }
      const st = el.querySelector('#bstatus'); if (st) st.textContent = buildingStatus(b, d, job);
      return;
    }
    if (el.innerHTML) el.innerHTML = '';
    lastInsp = '';
  }
  function costText(cost) {
    const parts = Object.keys(cost || {}).map((k) => cost[k] + ' de ' + (MAT_WORD[k] || k));
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1] : parts[0] || 'nada';
  }
  // o que a obra está fazendo agora (atualiza a cada quadro)
  function buildingStatus(b, d, job) {
    const T = G.Tech;
    if (job) {
      const mats = Object.keys(job.cost);
      const need = mats.reduce((n, k) => n + job.cost[k], 0), have = mats.reduce((n, k) => n + Math.min(job.cost[k], job.have[k] || 0), 0);
      const short = mats.filter((k) => (job.have[k] || 0) < job.cost[k] && (S.stock[k] || 0) <= 0);
      return (b.up ? 'Melhorando para ' + Sim.upDef(b).name.toLowerCase() + '. ' : 'Em obra. ') +
        'Material ' + have + '/' + need + (job.progress > 0 ? ' · trabalho ' + Math.floor(job.progress * 100) + '%' : '') +
        (short.length && job.progress <= 0 ? ' · falta ' + short.map((k) => MAT_WORD[k] || k).join(' e ') + ' no estoque' + (short.includes('tabuas') ? ' (a marcenaria faz)' : short.includes('fibra') ? ' (vem da casca das árvores cortadas)' : '') : '');
    }
    const f = d.fire;
    if (b.type === 'fogueira') return (b.fuel > 0 ? 'Acesa · lenha ' + b.fuel.toFixed(1) + '/' + C.FIRE_CAP : 'Apagada · o povo reacende quando esfriar') +
      ' · ' + f.seats + ' dormem no calor · histórias para até ' + f.listen;
    if (b.type === 'moquem' || b.type === 'jirau') return batchText(b, d);
    if (b.type === 'forno') return 'Água no estoque: ' + S.stock.agua + ' de ' + T.waterCap(S) + '.';
    if (b.type === 'armazem') return 'Guardando comida para ' + Math.floor(S.ctx.foodDays) + (Math.floor(S.ctx.foodDays) === 1 ? ' dia' : ' dias') + (S.stats.rottedToday ? ' · ontem estragaram ' + S.stats.rottedToday : '') + '. O lobo não leva nada.';
    if (d.shop) {
      const who = S.people.filter((p) => p.alive && p.act && p.act.type === 'oficio' && p.act.shop === b.id).map((p) => p.name);
      const make = d.shop.k === 'tabuas' ? 'Tábuas: 2 de madeira dão 1, em ' + Math.round(C.TABUA_MIN / d.shop.speed) + ' min. No estoque: ' + S.stock.tabuas + '.' :
        'Manta: 3 de fibra · rede: 4 de fibra, em ' + Math.round(C.TECIDO_MIN / d.shop.speed) + ' min cada. Fibra no estoque: ' + S.stock.fibra + '.';
      return (who.length ? 'Trabalhando: ' + who.join(', ') + '. ' : 'Com Ofício nas Vontades, o povo trabalha aqui quando falta. ') + make;
    }
    const nm = (id) => { const q = S.people.find((x) => x.id === +id && x.alive); return q ? q.name : ''; };
    const guests = Object.keys(b.guests || {}).filter((id) => b.guests[id] > S.t).map(nm).filter(Boolean);
    return 'Dormem aqui: ' + (b.beds.map(nm).filter(Boolean).join(', ') || 'ninguém ainda') +
      ' · ' + G.Family.bedLoad(S, b) + ' de ' + d.cap + ' lugares · +' + d.heat + ' °C' + (guests.length ? ' · esta noite, de visita: ' + guests.join(', ') : '');
  }
  // as melhorias possíveis: uma (ou as casas do lugar), com o custo e, quando não dá, o porquê
  const HOUSE_ICON = { oca: 'oca', palafita: 'palafita', barro: 'barro', pedra: 'casapedra' };
  function upgradeHTML(b, opts) {
    const house = opts.some((o) => o.kind);
    const rows = opts.map((o) => {
      const d = o.def, icon = o.kind ? HOUSE_ICON[o.kind] : 'melhorar';
      const cost = Object.keys(d.cost).map((k) => `<span data-c="${k}"><img src="${ic(k)}" alt="${esc(RES_NAME[k] || k)}"> ${d.cost[k]}</span>`).join('');
      return `<button class="btn uprow${o.why ? ' off' : ''}" data-act="upgrade"${o.kind ? ` data-kind="${o.kind}"` : ''}${o.why ? ' disabled' : ''} title="${esc(d.desc)}">
        <img class="ico" src="${ic(icon)}" alt=""><span class="nm">${esc(d.name)}</span><span class="cost">${cost}</span>
        <span class="why">${o.why ? esc(o.why.charAt(0).toUpperCase() + o.why.slice(1)) + '.' : esc(d.desc)}</span></button>`;
    }).join('');
    return `<div class="ups"><span class="small muted">${house ? 'Virar casa: a casa depende do lugar' : 'Melhorar'}</span>${rows}</div>`;
  }
  function feel(t) { return t >= 30 ? 'com calor' : t >= C.COMFORT ? 'confortável' : t >= 8 ? 'com frio' : t >= 0 ? 'com muito frio' : 'congelando'; }
  // ferramenta e roupa de quem está no inspetor
  function gear(p) {
    const T = G.Tech, out = [];
    // Etapa 8: a ferramenta ganha o nome dos utensílios que o povo já inventou
    const kit = ['faca', 'machado', 'arco'].filter((id) => T.known(S, id)).map((id) => (id === 'arco' ? 'arco' : id));
    const tool = kit.length ? kit[0][0].toUpperCase() + listPT(kit).slice(1) : 'Ferramenta';
    if (T.known(S, 'pedra') && G.Family.age(S, p) >= 12) out.push(p.tool ? tool + ' ' + Math.max(1, Math.round(p.tool.dur)) + '%' : 'Sem ferramenta');
    if (p.roupa) out.push((T.known(S, 'agulha') ? 'Roupa costurada ' : 'Roupa de couro ') + Math.max(1, Math.round(p.roupa.dur)) + '%');
    else if (S.stats.clothesMade && G.Family.age(S, p) >= 3) out.push('Sem roupa de couro');
    if (p.manta) out.push('Manta ' + Math.max(1, Math.round(p.manta.dur)) + '%');
    else if (S.stats.mantasMade && G.Family.age(S, p) >= 3) out.push('Sem manta');
    if (p.rede) out.push('Rede de dormir ' + Math.max(1, Math.round(p.rede.dur)) + '%');
    return out.length ? `<p class="small gear">${esc(out.join(' · '))}</p>` : '';
  }
  // moquém e jirau: o que está na grelha
  function batchText(b, d) {
    const q = b.batch, moq = b.type === 'moquem', cap = moq ? d.smoke.cap : d.dry.cap;
    if (!q) return moq ? 'Vazio. Cabem ' + cap + '. O povo arma quando há 4 ou mais de peixe ou carne e ' + C.MOQUEM_WOOD + ' de madeira (Conservar nas Vontades).' :
      S.ck.season === 3 ? 'Vazio. No inverno não há sol que seque fruta.' : 'Vazio. Cabem ' + cap + '. O povo espalha frutas quando há 4 ou mais (Conservar nas Vontades).';
    const h = Math.max(1, Math.ceil(q.left / 60));
    const what = q.n + ' ' + (q.k === 'frutas' ? (q.n === 1 ? 'fruta' : 'frutas') : q.k);
    return moq ? 'Defumando ' + what + ' · pronto em ' + h + ' h' : 'Secando ' + what + ' · faltam ' + h + ' h de sol' + (G.Tech.dryNow(S, b) ? '' : ' (parado: sem sol agora)');
  }
  function moodWord(m) { return m >= 75 ? 'radiante' : m >= 55 ? 'feliz' : m >= 40 ? 'em paz' : m >= 25 ? 'triste' : 'em desespero'; }
  function setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }

  // ---------- eventos da simulação ----------
  UI.consume = function (state, now, quiet) {
    const ev = state.events;
    if (!ev.length) return;
    for (const e of ev) {
      if (G.Audio && !quiet) G.Audio.event(e, state);
      if (e.k === 'toast') UI.toast(e.text, e.tone);
      else if (e.k === 'prayer') UI.toast(e.text, 'prayer');
      else if (e.k === 'chron') { addChron({ t: state.t, text: e.text }, !e.birth); }
      else if (e.k === 'birth') { if (UI.hooks.birth) UI.hooks.birth(e.pid); }
      else if (e.k === 'float') UI.float(e.x, e.y, e.text);
      else if (e.k === 'over') UI.hooks.over();
      else if (e.k === 'choice') { if (UI.hooks.choice) UI.hooks.choice(e.gid); }
      else if (e.k === 'narr') { if (e.on && e.ev === 'lobos' && UI.hooks.alarm) UI.hooks.alarm(); }
      else if (e.k === 'disc') { if (e.hint) setTimeout(() => UI.toast(e.hint, 'good'), 1800); if (!$('#modal-disc').hidden) UI.disc(); }
      else if (e.k === 'era') { if (UI.hooks.era) UI.hooks.era(); }
      else if (e.k === 'bite') { G.R.event(e); if (UI.hooks.alarm) UI.hooks.alarm(); }
      else if (e.k === 'thanks') UI.toast(e.text, e.kind === 'luto' ? 'prayer' : 'thanks');
      else if (e.k === 'festa' || e.k === 'story' || e.k === 'fight' || e.k === 'goal' || e.k === 'moon' || e.k === 'song') { /* só som */ }
      else if (e.k === 'fireLit') G.R.event(e);
      else if (e.k === 'star' || e.k === 'rainbow' || e.k === 'birds') G.R.event(e);
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
    const shown = [];
    for (const p of S.people) {
      let b = bubbles.get(p.id);
      if (!b) { b = { el: document.createElement('div'), id: -1, t0: 0, w: 0, h: 0 }; b.el.className = 'bubble'; b.el.hidden = true; $('#fx').appendChild(b.el); bubbles.set(p.id, b); }
      if (p.sayId !== b.id) {
        b.id = p.sayId; b.t0 = now; b.el.textContent = p.say || ''; b.w = 0;
        const god = p.sayKind === 'god' || AI.LINES.deus.indexOf(p.say) >= 0 || !!(p.prayer && p.prayer.text === p.say);
        b.el.className = 'bubble' + (god ? ' god' : p.sayKind ? ' ' + p.sayKind : '');
        b.el.dataset.who = p.name;
        if (G.Audio && p.alive && p.say) G.Audio.voice(p, p.sayKind, now);
      }
      const long = p.sayKind === 'historia' ? 5200 : 3400;
      const show = p.alive && p.say && now - b.t0 < long && b.t0 > 0 && scale >= 1.5;
      if (!show) { if (!b.el.hidden) b.el.hidden = true; continue; }
      const s = G.R.toScreen(p.x * C.TILE, (p.inTent ? p.y - 1.6 : p.y) * C.TILE - 12);
      shown.push({ b, x: Math.round(s.x), y: Math.round(s.y) });
    }
    // conversa: a fala mais nova fica no lugar; a mais velha sobe se encostar (lê-se de cima para baixo)
    shown.sort((a, c) => c.b.t0 - a.b.t0);
    const placed = [];
    for (const it of shown) {
      const el = it.b.el;
      if (el.hidden) el.hidden = false;
      if (!it.b.w) { it.b.w = el.offsetWidth || 120; it.b.h = el.offsetHeight || 22; }
      const w = it.b.w, h = it.b.h;
      let y = it.y, up = false;
      for (let k = 0; k < 5; k++) {
        const hit = placed.find((r) => Math.abs(r.x - it.x) < (r.w + w) / 2 + 4 && y > r.y - r.h - 2 && y - h < r.y + 2);
        if (!hit) break;
        y = hit.y - hit.h - 6; up = true;
      }
      placed.push({ x: it.x, y, w, h });
      if (el.classList.contains('up') !== up) el.classList.toggle('up', up);
      el.style.transform = `translate(${it.x}px, ${y}px) translate(-50%, -100%)`;
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
    $('#rank-list').innerHTML = erro ? `<li>${esc(erro)}</li>` : (list && list.length ? list.map((r) => `<li><b>${esc(r.nome)}</b> — ${r.anos ? r.anos + (r.anos === 1 ? ' ano' : ' anos') : 'primeiro ano'} <span>· ${esc(r.local || '')} · ${r.vivos} ${r.vivos === 1 ? 'vivo' : 'vivos'}${r.desc ? ' · ' + r.desc + (r.desc === 1 ? ' descoberta' : ' descobertas') : ''}${r.aldeia ? ' · virou aldeia' : ''}</span></li>`).join('') : '<li>Ninguém no ranking ainda.</li>');
    $('#modal-rank').hidden = false;
    $('#rank-close').onclick = () => { $('#modal-rank').hidden = true; };
  };
  // o mundo ainda está seguindo (ausência longa): progresso na mesma janela
  UI.awayProgress = function (f, minutes) {
    const total = Math.max(1, Math.round(minutes / C.DAY_MIN));
    $('#away-title').textContent = 'Enquanto você esteve fora…';
    $('#away-lead').textContent = 'O mundo está seguindo: dia ' + Math.min(total, Math.round(total * f)) + ' de ' + total + '.';
    $('#away-bar').hidden = false;
    $('#away-bar i').style.width = Math.round(f * 100) + '%';
    $('#away-stats').innerHTML = ''; $('#away-chron').innerHTML = '';
    $('#away-ok').hidden = true;
    $('#modal-away').hidden = false;
  };
  UI.away = function (r, onOk) {
    $('#away-bar').hidden = true; $('#away-ok').hidden = false;
    const days = Math.round(r.days);
    $('#away-lead').textContent = days < 1 ? 'Passaram poucas horas. O povo seguiu a vida.' :
      'Passaram ' + days + (days === 1 ? ' dia' : ' dias') + ', de ' + Sim.dateText(r.from).toLowerCase() + ' até ' + Sim.dateText(r.to).toLowerCase() + '.';
    const RS = RES.map(([k]) => k).filter((k) => RES_BASE.has(k) || r.stockAfter[k] || r.stockBefore[k]);
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
    // quem chegou de fora fica na geração de um par que nasceu aqui
    const bondIds = (p) => Object.keys(p.bonds || {}).map(Number);
    for (const p of people) {
      if (p.mother || p.father) continue;
      for (const id of bondIds(p)) { const q = F.person(S, id); if (q && (q.mother || q.father)) { gen.set(p.id, gen.get(q.id)); break; } }
    }
    const rows = [];
    for (const p of people) { const r = gen.get(p.id); (rows[r] = rows[r] || []).push(p); }
    // quem teve filho junto também fica lado a lado, se der
    const coParent = new Set();
    for (const p of people) if (p.mother && p.father) { coParent.add(p.mother + '-' + p.father); coParent.add(p.father + '-' + p.mother); }
    const mates = (p, row) => row.filter((q) => q !== p && (F.isPartner(p, q) || coParent.has(p.id + '-' + q.id)));
    const order = new Map();
    const pkey = (p) => Math.min(order.has(p.mother) ? order.get(p.mother) : 1e9, order.has(p.father) ? order.get(p.father) : 1e9);
    for (let ri = 0; ri < rows.length; ri++) {
      const row = (rows[ri] || []).sort((a, b) => pkey(a) - pkey(b) || a.born - b.born);
      // quem tem mais pares vai no meio, os pares dos dois lados
      const out = [];
      const byHub = row.slice().sort((a, b) => mates(b, row).length - mates(a, row).length || row.indexOf(a) - row.indexOf(b));
      const placed = new Set();
      for (const p of row) {
        if (placed.has(p.id)) continue;
        const hub = byHub.find((h) => !placed.has(h.id) && (h === p || mates(p, row).indexOf(h) >= 0) && mates(h, row).length > mates(p, row).length) || p;
        const ms = mates(hub, row).filter((q) => !placed.has(q.id));
        const left = ms.filter((_, i) => i % 2 === 1).reverse(), right = ms.filter((_, i) => i % 2 === 0);
        for (const q of left.concat([hub], right)) if (!placed.has(q.id)) { placed.add(q.id); out.push(q); }
        if (!placed.has(p.id)) { placed.add(p.id); out.push(p); }
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
      row.forEach((p, i) => pos.set(p.id, { x: (Wd - w) / 2 + i * (NW + GX), y: PAD + 12 + ri * (NH + GY) }));   // +12: lugar para o arco dos pares
    });
    const Hd = PAD * 2 + 12 + rows.length * NH + (rows.length - 1) * GY;
    let lines = '', nodes = '';
    // pares: traço entre os dois, com um coração (lado a lado); de longe, um arco por cima
    const near = (a, b) => a.y === b.y && Math.abs(a.x - b.x) <= NW + GX + 1;
    const done = new Set();
    for (const p of people) {
      for (const id of bondIds(p)) {
        const q = F.person(S, id), key = Math.min(p.id, id) + '-' + Math.max(p.id, id);
        if (!q || done.has(key) || !pos.has(q.id)) continue;
        done.add(key);
        const a = pos.get(p.id), b = pos.get(q.id);
        if (a.y !== b.y) continue;
        if (near(a, b)) {
          const x1 = Math.min(a.x, b.x) + NW, x2 = Math.max(a.x, b.x), y = a.y + NH / 2;
          lines += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="t-couple"/><circle cx="${(x1 + x2) / 2}" cy="${y}" r="3.5" class="t-heart"/>`;
        } else {
          const x1 = a.x + NW / 2, x2 = b.x + NW / 2, y = a.y, mx = (x1 + x2) / 2, top = y - 16;
          lines += `<path d="M${x1} ${y}Q${mx} ${top * 2 - y} ${x2} ${y}" class="t-couple t-arc"/><circle cx="${mx}" cy="${top}" r="3.5" class="t-heart"/>`;
        }
      }
    }
    // filhos: descem do meio do par (lado a lado) ou de baixo da mãe
    const fams = new Map();
    for (const p of people) {
      if (!p.mother && !p.father) continue;
      const k = [p.mother, p.father].sort().join('-');
      (fams.get(k) || fams.set(k, []).get(k)).push(p);
    }
    for (const [k, kids] of fams) {
      const par = k.split('-').map(Number).filter(Boolean).map((id) => pos.get(id)).filter(Boolean);
      if (!par.length) continue;
      const side = par.length === 2 && near(par[0], par[1]);
      const mom = pos.get(kids[0].mother) || par[0];
      const px = side ? (Math.min(par[0].x, par[1].x) + NW + Math.max(par[0].x, par[1].x)) / 2 : mom.x + NW / 2;
      const py = side ? par[0].y + NH / 2 : mom.y + NH;
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

  // ---------- descobertas: a trilha ----------
  // Descobertas: a trilha da Era da Família (Etapa 5) e as invenções (Etapa 8), em duas abas
  let discTab = 'trilha';
  const listPT = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1]);
  UI.disc = function (tab) {
    if (!S) return;
    if (tab) discTab = tab;
    const T = G.Tech, I = G.Inv, open = T.open(S);
    const reveal = (id) => {
      if (!G.God.unlocked(S, 'revelacao')) return '';
      if (T.revealable(S, id)) return `<button class="btn btn-small" data-reveal="${id}">Revelar (${C.REVELACAO_COST} de Poder)</button>`;
      return `<span class="small muted">Revelação: a partir de ${Math.round(C.REVELACAO_MIN * 100)}% da prática.</span>`;
    };
    const knownTxt = (d, k) => (k.how === 'revelacao' ? 'Revelada a ' : d.inv ? 'Inventada por ' : 'Descoberta por ') + esc(k.by || 'alguém') + ' · ' + esc(Sim.dateText(k.t).toLowerCase());
    const row = (id, cls, status, bar, act) => { const d = T.DISC[id];
      return `<li class="${cls}"><img class="ico ico-lg" src="${ic(d.icon)}" alt="">
        <div><b>${esc(d.name)}</b><span class="small gives">${esc(d.gives)}</span><span class="small st">${status}</span>${bar}${act}</div></li>`; };
    const learning = (id, pr) => ['Aprendendo ' + esc(T.DISC[id].learn) + ' · ' + Math.floor(pr * 100) + '% da prática', `<div class="bar"><i style="width:${Math.floor(pr * 100)}%"></i></div>`];
    $('#disc-list').innerHTML = T.ORDER.map((id, i) => {
      const k = S.tech.known[id];
      if (k) return row(id, 'known', knownTxt(T.DISC[id], k), '', '');
      if (id === open) { const [st, bar] = learning(id, T.progress(S, id)); return row(id, 'open', st, bar, reveal(id)); }
      return row(id, 'locked', i === 0 ? 'Depois da primeira fogueira' : 'Depois de ' + esc(T.DISC[T.ORDER[i - 1]].name.toLowerCase()), '', '');
    }).join('');
    if (I) {
      $('#inv-list').innerHTML = I.ORDER.map((id) => {
        const k = S.tech.known[id];
        if (k) return row(id, 'known', knownTxt(T.DISC[id], k), '', '');
        if (I.isOpen(S, id)) { const [st, bar] = learning(id, I.progress(S, id)); return row(id, 'open', st, bar, reveal(id)); }
        return row(id, 'locked', '<span class="req">Pede ' + esc(listPT(I.missing(S, id))) + '</span>', '', '');
      }).join('');
      $('#inv-count').textContent = '(' + I.count(S) + ' de ' + I.ORDER.length + ')';
    }
    const inv = discTab === 'inv' && !!I;
    $('#disc-list').hidden = inv; $('#inv-list').hidden = !inv;
    for (const b of document.querySelectorAll('.disc-tabs [data-dtab]')) b.classList.toggle('on', b.dataset.dtab === (inv ? 'inv' : 'trilha'));
    $('#disc-intro').textContent = inv
      ? 'Cada invenção abre quando o que ela pede já existe e aprende com o seu próprio trabalho: várias andam ao mesmo tempo. A Revelação entrega a que você escolher, se o povo já passou de ' + Math.round(C.REVELACAO_MIN * 100) + '% da prática.'
      : 'O povo aprende fazendo: cada descoberta vem da prática, uma depois da outra. A Revelação de Deus entrega a próxima antes da hora.';
    const alive = S.people.filter((p) => p.alive).length;
    $('#disc-era').hidden = inv;
    $('#disc-era').textContent = S.stats.eraEnd ? 'A Era da Família se fechou em ' + Sim.dateText(S.stats.eraEnd).toLowerCase() + '.' :
      'Para fechar a Era da Família: ' + C.ALDEIA_POP + ' pessoas (hoje ' + alive + ') e a cerâmica' + (T.known(S, 'ceramica') ? ' (já descoberta).' : '.');
    $('#modal-disc').hidden = false;
  };

  // ---------- fim da Era da Família ----------
  UI.eraEnd = function (onDone) {
    const st = S.stats, alive = S.people.filter((p) => p.alive), dead = S.people.filter((p) => !p.alive);
    const years = Math.max(1, Math.floor((st.eraEnd - C.START_HOUR * 60) / (C.DAY_MIN * C.YEAR_DAYS)));
    const gens = Math.max(1, ...S.people.map(function gen(p) { const m = G.Family.person(S, p.mother), f = G.Family.person(S, p.father); return 1 + Math.max(m ? gen(m) : 0, f ? gen(f) : 0); }));
    $('#era-ico').src = ic('pote');
    // só o que o povo tem de fato
    const has = ['fogo'];
    if (G.Tech.known(S, 'pedra')) has.push('ferramentas de pedra');
    if (st.hunted) has.push('caça');
    if (st.conserved) has.push('comida guardada para o inverno');
    has.push(S.tech && S.tech.potes ? 'potes de barro' : 'o segredo do barro');
    $('#era-lead').textContent = 'Em ' + years + (years === 1 ? ' ano' : ' anos') + ', o casal que chegou ' + S.siteLabel + ' virou um povo de ' + alive.length +
      ' pessoas, com ' + has.slice(0, -1).join(', ') + ' e ' + has[has.length - 1] + '. O acampamento virou aldeia.';
    $('#era-stats').innerHTML = [
      ['pessoa', 'Vivos', alive.length], ['bebe', 'Nasceram', st.births || 0], ['arvore', 'Gerações', gens],
      ['lasca', 'Descobertas', G.Tech.count(S) + ' de ' + G.Tech.ORDER.length], ['deus', 'Milagres', S.god ? S.god.miracles : 0],
      ['reza', 'Orações atendidas', S.god ? S.god.answered : 0], ['cronica', 'Túmulos', dead.length],
    ].map(([i, k, v]) => `<dt><img class="ico" src="${ic(i)}" alt="">${k}</dt><dd>${v}</dd>`).join('');
    $('#era-ok').onclick = () => { $('#modal-era').hidden = true; if (onDone) onDone(); };
    $('#modal-era').hidden = false;
    setTimeout(() => $('#era-ok').focus(), 50);
  };

  UI.showOver = function (state) {
    $('#over-chron').innerHTML = state.chron.slice().reverse().map((c) => `<li><span class="when">${esc(Sim.dateText(c.t))}</span><span class="what">${esc(c.text)}</span></li>`).join('');
    $('#scr-over').hidden = false;
  };
})(globalThis.G = globalThis.G || {});
