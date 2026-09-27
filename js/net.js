/* Gênesis · conexão com o servidor (Google Apps Script). Sem servidor configurado, o jogo fica só local. */
(function (G) {
  'use strict';
  const C = G.CFG;
  const Net = G.Net = {};
  const SK = 'genesis.sessao', AK = 'genesis.api';
  Net.offset = 0;   // relógio do servidor − relógio do aparelho

  function ls() { try { return globalThis.localStorage || null; } catch (e) { return null; } }

  Net.url = function () {
    let u = C.API_URL || '';
    const st = ls();
    try {
      const q = new URLSearchParams(location.search).get('api');
      if (q && st) st.setItem(AK, q);
      if (!u && st) u = st.getItem(AK) || '';
    } catch (e) { /* sem acesso */ }
    return String(u).trim();
  };
  Net.enabled = () => !!Net.url();
  Net.now = () => Date.now() + Net.offset;

  Net.session = function () {
    const st = ls(); if (!st) return null;
    try { return JSON.parse(st.getItem(SK) || 'null'); } catch (e) { return null; }
  };
  Net.setSession = function (s) {
    const st = ls(); if (!st) return;
    try { if (s) st.setItem(SK, JSON.stringify(s)); else st.removeItem(SK); } catch (e) { /* sem acesso */ }
  };

  Net.call = async function (action, data, timeoutMs) {
    const url = Net.url();
    if (!url) return { ok: false, erro: 'Servidor não configurado.' };
    const body = JSON.stringify(Object.assign({ action }, data || {}));
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); }, timeoutMs || 20000);
    const t0 = Date.now();
    try {
      const r = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', signal: ctl ? ctl.signal : undefined });
      const txt = await r.text();
      let js;
      try { js = JSON.parse(txt); } catch (e) { return { ok: false, erro: 'O servidor respondeu algo inesperado. Confira o endereço do Apps Script.' }; }
      if (js && typeof js.now === 'number') Net.offset = js.now - Math.round((t0 + Date.now()) / 2);
      if (js && js.ok === false && js.sessao === false) Net.setSession(null);
      return js;
    } catch (e) {
      return { ok: false, erro: 'Sem conexão com o servidor. O jogo segue salvando neste aparelho.', offline: true };
    } finally {
      clearTimeout(timer);
    }
  };

  // envio sem esperar resposta (ao fechar a aba)
  Net.beacon = function (action, data) {
    const url = Net.url();
    if (!url || typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
    try { return navigator.sendBeacon(url, new Blob([JSON.stringify(Object.assign({ action }, data || {}))], { type: 'text/plain;charset=utf-8' })); } catch (e) { return false; }
  };
})(globalThis.G = globalThis.G || {});
