/* HighSky лендинг: поведение на страницата.
   Скролът е родният. Нищо не е вързано за позицията на скрола: съдържанието
   се появява веднъж при влизане в екрана и остава. Релсите са родни
   scroll-snap ленти с пръст, бутони и влачене с мишка. */
(function () {
  'use strict';
  var HS = window.HS || { n: {} };
  var root = document.documentElement;
  var STATIC = root.classList.contains('static');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---- Числата идват от data.js -------------------------------------------- */
  var NB = String.fromCharCode(160); /* неразделим интервал */
  function fmt(v, d) {
    var s = Number(v).toFixed(d || 0).split('.');
    var i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, NB);
    return d ? i + ',' + s[1] : i;
  }
  function num(key) { return HS.n[key]; }
  $$('[data-n]').forEach(function (el) { var n = num(el.getAttribute('data-n')); if (n) el.textContent = fmt(n.v, n.d); });
  $$('[data-count]').forEach(function (el) { var n = num(el.getAttribute('data-count')); if (n) el.textContent = fmt(n.v, n.d); });
  var cEl = $('#countries');
  if (cEl && HS.countries) { var c = HS.countries.slice(); cEl.textContent = c.slice(0, -1).join(', ') + ' и ' + c[c.length - 1]; }

  /* ---- Адресът на призивите: една константа в data.js ----------------------- */
  var mail = 'mailto:' + (HS.CONTACT_EMAIL || '') + (HS.CONTACT_SUBJECT ? '?subject=' + encodeURIComponent(HS.CONTACT_SUBJECT) : '');
  $$('.js-contact').forEach(function (a) { a.setAttribute('href', mail); });

  /* ---- Броячи ------------------------------------------------------------------ */
  function countUp(el) {
    if (el.__done) return; el.__done = true;
    var n = num(el.getAttribute('data-count')); if (!n) return;
    if (STATIC || reduce) { el.textContent = fmt(n.v, n.d); return; }
    var from = parseFloat(el.getAttribute('data-from') || '0');
    var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
    var dur = 1400, t0 = null;
    el.textContent = fmt(from, n.d);
    function step(t) {
      if (t0 === null) t0 = t + delay;
      var p = Math.min(1, Math.max(0, (t - t0) / dur));
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (n.v - from) * e, n.d);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var storyTo = $('[data-count="storyTo"]'); if (storyTo) storyTo.setAttribute('data-delay', '1100');

  /* ---- Появяване веднъж при влизане в екрана -------------------------------- */
  var onEnter = {};
  function revealed(el) {
    el.classList.add('in');
    $$('[data-count]', el).forEach(countUp);
    if (el.id && onEnter[el.id]) onEnter[el.id](el);
  }
  var rvs = $$('.rv');
  if (STATIC || !hasIO) { rvs.forEach(revealed); $$('[data-count]').forEach(countUp); }
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { revealed(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rvs.forEach(function (el) {
      /* първият екран се показва веднага при зареждане, с каскада */
      if (el.closest('.hero')) requestAnimationFrame(function () { requestAnimationFrame(function () { revealed(el); }); });
      else io.observe(el);
    });
    var ioC = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); ioC.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (el) { if (!el.closest('.rv')) ioC.observe(el); });
  }

  /* ---- Горната лента става стъкло след първите пиксели ------------------------ */
  var bar = $('#bar');
  if (bar) {
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none';
    document.body.prepend(sentinel);
    if (hasIO) new IntersectionObserver(function (es) { bar.classList.toggle('is-solid', !es[0].isIntersecting); }).observe(sentinel);
    else bar.classList.add('is-solid');
  }

  /* ---- Залепен бутон на телефон ---------------------------------------------- */
  var dock = $('#dock'), heroCta = $('#heroCta'), finalCta = $('#finalCta');
  if (dock && hasIO && heroCta && finalCta) {
    var seen = { hero: true, fin: false }, below = false;
    function upd() {
      var show = !seen.hero && !seen.fin && below;
      dock.classList.toggle('show', show);
      dock.setAttribute('aria-hidden', show ? 'false' : 'true');
      var a = $('a', dock); if (a) a.tabIndex = show ? 0 : -1;
    }
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      seen.hero = e.isIntersecting;
      below = !e.isIntersecting && e.boundingClientRect.top < 0; /* бутонът на първия екран е над нас */
      upd();
    }).observe(heroCta);
    new IntersectionObserver(function (es) { seen.fin = es[0].isIntersecting; upd(); }).observe(finalCta);
  }

  /* ---- Силуети на продуктите (собствени SVG) ------------------------------------ */
  var gid = 0;
  function metal(id) {
    return '<defs><linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" stop-color="#A4CAE5"/><stop offset=".28" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#CFE3F2"/><stop offset="1" stop-color="#5D9BC8"/></linearGradient></defs>';
  }
  var SHAPES = {
    jug: function (g) { return '<path d="M44 15l9-4-4 9" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4" stroke-linejoin="round"/><path d="M19 15h26l1.5 5c1.5 9 4 21 4 31 0 4-3 7-7 7H20.5c-4 0-7-3-7-7 0-10 2.5-22 4-31L19 15z" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4"/><path d="M17.5 24c-9 0-10 17-1.5 18.5" fill="none" stroke="#196F9E" stroke-width="3.4" stroke-linecap="round"/><path d="M19 15h26" stroke="#146B96" stroke-width="2.2" stroke-linecap="round"/>'; },
    jugSmall: function (g) { return '<path d="M40 30l8-3.5-3.5 7.5" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4" stroke-linejoin="round"/><path d="M20 30h21l1 3.5c2 6 4 11 4 16 0 4-3 6.5-7 6.5H22c-4 0-7-2.5-7-6.5 0-5 2-10 4-16L20 30z" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4"/><path d="M18.5 36c-7 0-7.5 12-1 13" fill="none" stroke="#196F9E" stroke-width="3" stroke-linecap="round"/><path d="M20 30h21" stroke="#146B96" stroke-width="2" stroke-linecap="round"/>'; },
    frother: function (g) { return '<rect x="20" y="12" width="24" height="38" rx="7" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4"/><rect x="18.5" y="9" width="27" height="7" rx="3.5" fill="#222F55"/><path d="M44 20c7 0 7 16 0 16" fill="none" stroke="#222F55" stroke-width="3.6" stroke-linecap="round"/><rect x="15" y="50" width="34" height="8" rx="4" fill="#222F55"/><circle cx="32" cy="54" r="1.6" fill="#2B80B9"/>'; },
    jugHandle: function (g) { return '<path d="M44 15l9-4-4 9" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4" stroke-linejoin="round"/><path d="M19 15h26l1.5 5c1.5 9 4 21 4 31 0 4-3 7-7 7H20.5c-4 0-7-3-7-7 0-10 2.5-22 4-31L19 15z" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4"/><path d="M16.5 22.5c-10 1-10.5 19-.5 21" fill="none" stroke="#222F55" stroke-width="6" stroke-linecap="round"/><path d="M24 30h6M23 37h7M22.5 44h7.5" stroke="#146B96" stroke-width="1.6" stroke-linecap="round"/><path d="M19 15h26" stroke="#146B96" stroke-width="2.2" stroke-linecap="round"/>'; },
    jugTall: function (g) { return '<path d="M41 9l7-2-2.5 6.5" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4" stroke-linejoin="round"/><rect x="22" y="9" width="20" height="49" rx="5" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4"/><path d="M22 18h-4.5a3 3 0 0 0-3 3v19a3 3 0 0 0 3 3H22" fill="none" stroke="#222F55" stroke-width="5" stroke-linejoin="round"/><path d="M14.5 26h-2M14.5 31h-2M14.5 36h-2" stroke="#2B80B9" stroke-width="1.6" stroke-linecap="round"/><rect x="22" y="44" width="20" height="5" fill="#2B80B9" opacity=".55"/>'; },
    bottle: function (g) { return '<rect x="27" y="5" width="10" height="7" rx="2" fill="#222F55"/><path d="M28 12h8v5c6 2 9 6 9 11v25c0 3-2 5-5 5H24c-3 0-5-2-5-5V28c0-5 3-9 9-11v-5z" fill="url(#' + g + ')" stroke="#196F9E" stroke-width="1.4"/><rect x="21.5" y="31" width="21" height="16" rx="3" fill="#2B80B9"/><path d="M26 37.5h12M26 42h8" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>'; }
  };
  function shape(name) {
    var g = 'hsm' + (++gid);
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + metal(g) + (SHAPES[name] || SHAPES.jug)(g) + '</svg>';
  }
  window.HSShape = shape;
  window.HSfmt = fmt;
  var ins = $('#insightImg'); if (ins) ins.innerHTML = shape('jug');

  /* ---- 2. Каталогът: хиляди точки, светват десет -------------------------------- */
  (function () {
    var cv = $('#dots'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, grid = [], lit = [], done = false, started = false;
    function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
    function layout() {
      var r = cv.getBoundingClientRect(); if (!r.width) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.width * 400 / 560;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gap = W < 420 ? 6.2 : 7.2, pad = 14;
      var cols = Math.floor((W - pad * 2) / gap), rows = Math.floor((H - pad * 2) / gap);
      var ox = (W - (cols - 1) * gap) / 2, oy = (H - (rows - 1) * gap) / 2;
      grid = [];
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) grid.push({ x: ox + x * gap, y: oy + y * gap, c: x / cols });
      var R = rnd(4242); lit = [];
      while (lit.length < 10) {
        var p = grid[Math.floor(R() * grid.length)], ok = true;
        for (var k = 0; k < lit.length; k++) { var dx = lit[k].x - p.x, dy = lit[k].y - p.y; if (dx * dx + dy * dy < (W * 0.13) * (W * 0.13)) { ok = false; break; } }
        if (ok && p.x > 24 && p.x < W - 24 && p.y > 24 && p.y < H - 24) lit.push(p);
      }
      return true;
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var wave = Math.min(1, t / 1300);
      for (var i = 0; i < grid.length; i++) {
        var d = grid[i], a = Math.max(0, Math.min(1, (wave * 1.35 - d.c * 0.35 - 0) / 1)) * 0.2;
        if (a <= 0) continue;
        ctx.fillStyle = 'rgba(34,47,85,' + a.toFixed(3) + ')';
        ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
      }
      for (var j = 0; j < lit.length; j++) {
        var p = lit[j], s = Math.max(0, Math.min(1, (t - 1300 - j * 150) / 500));
        if (s <= 0) continue;
        var e = 1 - Math.pow(1 - s, 3);
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22 * e);
        g.addColorStop(0, 'rgba(43,128,185,0.35)'); g.addColorStop(1, 'rgba(43,128,185,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 22 * e, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(43,128,185,' + (0.45 * e).toFixed(3) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8.5 * e, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#2B80B9'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.6 * e, 0, Math.PI * 2); ctx.fill();
      }
    }
    var FINAL = 1300 + 10 * 150 + 600;
    function play() {
      if (started) return; started = true;
      if (!layout()) return;
      if (STATIC || reduce) { draw(FINAL); done = true; return; }
      var t0 = null;
      function f(t) { if (t0 === null) t0 = t; var e = t - t0; draw(e); if (e < FINAL) requestAnimationFrame(f); else done = true; }
      requestAnimationFrame(f);
    }
    var fig = cv.closest('.rv');
    if (STATIC || !hasIO) play();
    else new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { play(); o.disconnect(); } }, { threshold: 0.3 }).observe(fig || cv);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (started && layout()) draw(FINAL); }, 150); });
  })();

  /* ---- 4. Маржът: ленти в реален мащаб ---------------------------------------- */
  (function () {
    var max = 0, fills = $$('.mrow__fill');
    fills.forEach(function (f) { var n = num(f.getAttribute('data-w')); if (n && n.v > max) max = n.v; });
    fills.forEach(function (f) { var n = num(f.getAttribute('data-w')); if (n) f.style.width = (n.v / max * 100) + '%'; });
  })();

  /* ---- 5. Фунията: истинските пропорции ---------------------------------------- */
  (function () {
    var body = $('.funnel__body'); if (!body) return;
    var rows = $$('.frow', body), shapeEl = $('.funnel__shape', body);
    var vals = rows.map(function (r) { var n = num(r.getAttribute('data-key')); return n ? n.v : 0; });
    var max = Math.max.apply(null, vals);
    rows.forEach(function (r, i) { var bar = $('.frow__bar i', r); bar.style.setProperty('--w', (vals[i] / max * 100) + '%'); bar.style.setProperty('--i', i); });
    function geom() {
      var b = body.getBoundingClientRect(), L = [], R = [];
      rows.forEach(function (r, i) {
        var br = $('.frow__bar', r).getBoundingClientRect();
        var w = Math.max(3, br.width * vals[i] / max), cx = br.left - b.left + br.width / 2;
        var top = br.top - b.top, bot = br.bottom - b.top;
        L.push([cx - w / 2, top], [cx - w / 2, bot]); R.unshift([cx + w / 2, top], [cx + w / 2, bot]);
      });
      var rr = []; for (var k = 0; k < R.length; k += 2) rr.push(R[k + 1], R[k]);
      var pts = L.concat(rr).map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; });
      shapeEl.style.setProperty('--clip', 'polygon(' + pts.join(',') + ')');
    }
    geom();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(geom, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(geom);
    window.addEventListener('load', geom);
  })();

  /* ---- 10. Един месец: таксата се връща в първите три дни ------------------------ */
  (function () {
    var g = $('#monthGrid'); if (!g) return;
    var days = HS.n['tech.payback'] ? HS.n['tech.payback'].v : 3, html = '';
    for (var i = 1; i <= 30; i++) html += '<span' + (i <= days ? ' class="pay" style="--i:' + (i - 1) + '"' : '') + '>' + i + '</span>';
    g.innerHTML = html;
  })();

  /* ---- 3. Релсата: роден скрол, бутони, влачене с мишка с проекция --------------- */
  function rail(el, dotsEl) {
    /* Точките и бутоните вървят по достижимите позиции, не по картите:
       на широк екран последните карти се виждат наведнъж. */
    var slides = Array.prototype.slice.call(el.children), now = 0, stops = [0];
    var btns = $$('[data-rail="' + el.id + '"]'), dots = [];
    function maxScroll() { return Math.max(0, el.scrollWidth - el.clientWidth); }
    function measure() {
      var b = slides[0].offsetLeft, m = maxScroll();
      stops = [];
      slides.forEach(function (s) { var x = Math.min(m, s.offsetLeft - b); if (!stops.length || x - stops[stops.length - 1] > 8) stops.push(x); });
      if (dotsEl) { dotsEl.innerHTML = stops.length > 1 ? stops.map(function () { return '<i></i>'; }).join('') : ''; dots = $$('i', dotsEl); }
    }
    function nearest(x) {
      var best = 0, d = Infinity;
      stops.forEach(function (p, n) { var dd = Math.abs(p - x); if (dd < d) { d = dd; best = n; } });
      return best;
    }
    function set(i) {
      now = i;
      dots.forEach(function (d, n) { d.classList.toggle('on', n === i); });
      btns.forEach(function (b) { var dir = +b.getAttribute('data-dir'); b.disabled = dir < 0 ? i <= 0 : i >= stops.length - 1; });
    }
    function go(i) {
      i = Math.max(0, Math.min(stops.length - 1, i));
      el.scrollTo({ left: stops[i], behavior: reduce ? 'auto' : 'smooth' });
    }
    measure();
    var raf = 0;
    el.addEventListener('scroll', function () {
      if (raf) return; raf = requestAnimationFrame(function () { raf = 0; set(nearest(el.scrollLeft)); });
    }, { passive: true });
    btns.forEach(function (b) { b.addEventListener('click', function () { go(now + (+b.getAttribute('data-dir'))); }); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(now + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(now - 1); }
    });
    if (fine) {
      var down = false, x0 = 0, s0 = 0, moved = 0, hist = [];
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; moved = 0; x0 = e.clientX; s0 = el.scrollLeft; hist = [{ x: e.clientX, t: performance.now() }];
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx));
        if (moved > 8) {
          el.classList.add('is-drag');
          var target = s0 - dx, m = maxScroll();
          if (target < 0) target = target * 0.35; else if (target > m) target = m + (target - m) * 0.35;
          el.scrollLeft = target;
        }
        hist.push({ x: e.clientX, t: performance.now() }); if (hist.length > 6) hist.shift();
      });
      window.addEventListener('pointerup', function () {
        if (!down) return; down = false;
        if (moved <= 8) return;
        var a = hist[0], b = hist[hist.length - 1], dt = Math.max(1, b.t - a.t);
        var v = -(b.x - a.x) / dt * 1000;
        var proj = el.scrollLeft + (v / 1000) * 0.992 / (1 - 0.992);
        el.classList.remove('is-drag');
        go(nearest(proj));
      });
      el.addEventListener('click', function (e) { if (moved > 8) { e.preventDefault(); e.stopPropagation(); } }, true);
      el.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
    set(0);
    function remeasure() { measure(); set(nearest(el.scrollLeft)); }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(remeasure, 120); });
    window.addEventListener('load', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    return { go: go };
  }
  var mr = $('#momentsRail'); if (mr) window.HSRail = rail(mr, $('#momentsDots'));

  /* ---- 12. Въпросите: акордеон ---------------------------------------------------- */
  $$('.qa').forEach(function (qa, i) {
    var btn = $('button', qa), panel = $('.qa__a', qa);
    var id = 'qa-' + (i + 1); panel.id = id; btn.setAttribute('aria-controls', id);
    panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', id + '-b'); btn.id = id + '-b';
    panel.inert = true;
    btn.addEventListener('click', function () {
      var open = !qa.classList.contains('open');
      qa.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.inert = !open;
    });
  });
})();
