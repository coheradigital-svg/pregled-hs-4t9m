/* HighSky лендинг: живата чат симулация в първия екран.
   Сценарият е в data.js (HS.chat). Пуска се сама, когато се вижда, спира
   извън екрана, зацикля с пауза и има бутон „Пусни отново“. */
(function () {
  'use strict';
  var HS = window.HS || {}, script = HS.chat || [];
  var root = document.documentElement;
  var STATIC = root.classList.contains('static');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.getElementById('chatBody'), list = document.getElementById('chatList');
  var field = document.getElementById('chatField'), input = field && field.parentNode;
  var typed = field && field.querySelector('.chat__typed');
  var cartVal = document.getElementById('cartVal'), cart = document.getElementById('cart'), plus = document.getElementById('cartPlus');
  var replay = document.getElementById('chatReplay'), chat = document.getElementById('chat');
  if (!body || !list) return;
  var fmt = window.HSfmt || function (v) { return String(v); };
  var shape = window.HSShape || function () { return ''; };
  var NB = String.fromCharCode(160);
  var STAMP = '<div class="stamp"><svg class="ic" aria-hidden="true"><use href="#i-moon"/></svg>Петък, 23:30</div>';
  function n(key) { return HS.n && HS.n[key] ? HS.n[key].v : 0; }

  var run = 0, visible = true, cartNow = n('chat.cart0'), waiters = [];
  function sleep(ms, id) {
    return new Promise(function (res, rej) {
      var left = ms, last = performance.now();
      (function tick() {
        if (id !== run) return rej('stop');
        var now = performance.now();
        if (visible && !document.hidden) left -= now - last;
        last = now;
        if (left <= 0) return res();
        setTimeout(tick, Math.min(60, Math.max(16, left)));
      })();
    });
  }
  function toBottom(instant) {
    var top = body.scrollHeight;
    if (instant || reduce || STATIC) body.scrollTop = top;
    else body.scrollTo({ top: top, behavior: 'smooth' });
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function setCart(v, instant) {
    if (!cartVal) return;
    var from = cartNow; cartNow = v;
    if (instant || reduce || STATIC) { cartVal.textContent = fmt(v, 0); return; }
    var t0 = null;
    (function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3);
      cartVal.textContent = fmt(Math.round(from + (v - from) * e), 0);
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
    cart.classList.remove('bump'); void cart.offsetWidth; cart.classList.add('bump');
  }
  function showPlus(amount) {
    if (!plus || reduce || STATIC) return;
    plus.textContent = '+' + amount + NB + 'евро';
    plus.classList.remove('go'); void plus.offsetWidth; plus.classList.add('go');
  }
  function cardsHtml(cards) {
    var cls = cards.length === 1 ? 'pcards pcards--1' : cards.length === 2 ? 'pcards pcards--2' : 'pcards';
    return '<div class="' + cls + '">' + cards.map(function (c) {
      var meta = (c.spec ? '<span>' + esc(c.spec) + '</span>' : '<span></span>') + '<span class="pcard__price">' + c.price + '&nbsp;евро</span>';
      return '<div class="pcard' + (c.wide ? ' pcard--wide' : '') + '" data-id="' + c.id + '">' +
        '<span class="pcard__ok" aria-hidden="true"><svg class="ic"><use href="#i-check"/></svg></span>' +
        '<div class="pcard__img">' + shape(c.shape) + '</div>' +
        '<div><span class="pcard__name">' + esc(c.name) + '</span><span class="pcard__meta">' + meta + '</span></div></div>';
    }).join('') + '</div>';
  }
  function pick(id) { var p = list.querySelectorAll('.pcard[data-id="' + id + '"]'); if (p.length) p[p.length - 1].classList.add('is-pick'); }
  function words(text) { return text.split(' ').map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' '); }

  /* Крайното състояние наведнъж (static, намалено движение) */
  function renderAll() {
    list.innerHTML = STAMP;
    script.forEach(function (s) {
      if (s.who === 's') { var sy = el('div', 'sys in', '<svg class="ic" aria-hidden="true"><use href="#i-checkcircle"/></svg><span>' + esc(s.text) + '</span>'); list.appendChild(sy); return; }
      var m = el('div', 'msg in msg--' + s.who + (s.cards ? ' has-cards' : ''), '<span>' + esc(s.text) + '</span>' + (s.cards ? cardsHtml(s.cards) : ''));
      list.appendChild(m);
      Array.prototype.forEach.call(m.querySelectorAll('.pcard'), function (c) { c.classList.add('in'); });
      if (s.pick) pick(s.pick);
    });
    setCart(n('chat.cart2'), true);
    /* на телефон разговорът се показва от началото */
    if (window.matchMedia('(max-width: 760px)').matches) body.scrollTop = 0; else toBottom(true);
  }

  async function play(id) {
    list.innerHTML = STAMP; cartNow = n('chat.cart0'); setCart(cartNow, true);
    if (typed) typed.textContent = ''; field.classList.remove('has-text', 'long'); input.classList.remove('ready');
    body.scrollTop = 0;
    await sleep(300, id);
    for (var i = 0; i < script.length; i++) {
      var s = script[i];
      if (s.who === 'c') {
        field.classList.add('has-text'); input.classList.add('ready');
        var per = Math.max(14, Math.min(34, 1300 / s.text.length));
        for (var k = 1; k <= s.text.length; k++) { typed.textContent = s.text.slice(0, k); if (!field.classList.contains('long') && typed.offsetWidth > field.clientWidth - 8) field.classList.add('long'); await sleep(per, id); }
        await sleep(260, id);
        input.classList.add('sent'); setTimeout(function () { input.classList.remove('sent'); }, 140);
        typed.textContent = ''; field.classList.remove('has-text', 'long'); input.classList.remove('ready');
        var mc = el('div', 'msg msg--c', '<span>' + esc(s.text) + '</span>');
        list.appendChild(mc); toBottom(); requestAnimationFrame(function () { mc.classList.add('in'); });
        await sleep(650, id);
      } else if (s.who === 'a') {
        var ty = el('div', 'msg msg--a typing', '<i></i><i></i><i></i>');
        ty.setAttribute('aria-label', 'Пише');
        list.appendChild(ty); toBottom(); requestAnimationFrame(function () { ty.classList.add('in'); });
        await sleep(Math.min(1500, 700 + s.text.length * 4), id);
        /* текстът расте дума по дума, балонът расте с него */
        var ma = el('div', 'msg msg--a in' + (s.cards ? ' has-cards' : ''), '<span></span>');
        var txt = ma.firstChild, ws = s.text.split(' ');
        list.replaceChild(ma, ty);
        for (var w = 0; w < ws.length; w++) { txt.textContent += (w ? ' ' : '') + ws[w]; if (w % 4 === 0) toBottom(true); await sleep(38, id); }
        toBottom();
        if (s.cards) {
          ma.insertAdjacentHTML('beforeend', cardsHtml(s.cards));
          var cs = ma.querySelectorAll('.pcard');
          toBottom();
          await sleep(180, id);
          for (var c = 0; c < cs.length; c++) { cs[c].classList.add('in'); await sleep(110, id); }
          toBottom();
        }
        if (s.pick) { await sleep(250, id); pick(s.pick); }
        if (s.cart) { await sleep(200, id); setCart(n(s.cart)); showPlus(s.plus); }
        await sleep(Math.min(3200, 1100 + s.text.length * 14), id);
      } else {
        await sleep(300, id);
        var sy = el('div', 'sys', '<svg class="ic" aria-hidden="true"><use href="#i-checkcircle"/></svg><span>' + esc(s.text) + '</span>');
        list.appendChild(sy); toBottom(); requestAnimationFrame(function () { sy.classList.add('in'); });
        await sleep(6500, id);
      }
    }
    list.style.transition = 'opacity 400ms var(--ease-in)'; list.style.opacity = '0';
    await sleep(450, id);
    list.style.opacity = ''; list.style.transition = '';
    start();
  }
  function start() {
    var id = ++run;
    list.style.opacity = '';
    play(id).catch(function () {});
  }

  if (STATIC || reduce) { renderAll(); if (replay && reduce) replay.addEventListener('click', renderAll); return; }

  list.innerHTML = STAMP; /* до пускането прозорецът показва часа */
  if ('IntersectionObserver' in window && chat) {
    var begun = false;
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !begun) { begun = true; start(); }
    }, { threshold: window.matchMedia('(max-width: 760px)').matches ? 0.55 : 0.25 }).observe(chat);
  } else start();
  if (replay) replay.addEventListener('click', function () { visible = true; start(); });
})();
