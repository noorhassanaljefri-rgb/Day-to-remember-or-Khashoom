(() => {
  'use strict';

  /* ---------------- helpers ---------------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('adtr:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('adtr:' + k, JSON.stringify(v)); } catch {} },
  };
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const rand = (a, b) => a + Math.random() * (b - a);

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') for (const [a, b] of Object.entries(v)) el.style.setProperty(a, b);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    kids.flat().forEach((c) => c && el.append(c));
    return el;
  }
  // wrap every ✦ in a coloured span (text is still plain text — no HTML injection)
  function withHearts(text) {
    return String(text).split(/([♡✦✧])/).map((p) => (/^[♡✦✧]$/.test(p) ? h('span', { class: 'hrt', text: p }) : p));
  }

  async function api(path, opts = {}) {
    try {
      const r = await fetch(path, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: 'same-origin',
        cache: 'no-store',
      });
      let data = null;
      try { data = await r.json(); } catch {}
      return { status: r.status, data };
    } catch {
      return { status: 0, data: null };
    }
  }

  /* ---------------- theme + hearts ---------------- */
  const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); };
  function applyTheme(t) {
    const root = document.documentElement.style;
    const map = { bg: '--bg', bg2: '--bg2', card: '--card', blush: '--blush', rose: '--rose', deep: '--deep', ink: '--ink', sun: '--sun' };
    for (const [k, v] of Object.entries(map)) {
      if (/^#[0-9a-f]{6}$/i.test(t[k] || '')) { root.setProperty(v, t[k]); root.setProperty(v + '-rgb', hexRgb(t[k])); }
    }
    const m = document.querySelector('meta[name=theme-color]');
    if (m && t.bg) m.setAttribute('content', t.bg);
  }
  function spawnHearts(t) {
    const box = document.getElementById('hearts');
    box.replaceChildren();
    if (!t.hearts || reduced) return;
    const n = Math.max(0, Math.min(30, t.heartCount | 0));
    for (let i = 0; i < n; i++) {
      box.append(h('span', {
        class: 'fh', text: i % 3 === 0 ? '✦' : '✧',
        style: { left: rand(2, 96) + '%', '--size': rand(14, 30) + 'px', '--dur': rand(13, 26) + 's', '--delay': -rand(0, 26) + 's', '--sway': rand(-34, 34) + 'px', '--op': rand(.18, .42).toFixed(2) },
      }));
    }
  }
  function confetti(count = 26) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      const el = h('span', { class: 'cf', text: i % 2 ? '✦' : '✧', style: { '--s': rand(16, 34) + 'px', '--dx': rand(-170, 170) + 'px', '--dy': rand(-260, 120) + 'px', '--r': rand(-60, 60) + 'deg' } });
      document.body.append(el);
      setTimeout(() => el.remove(), 1800);
    }
  }

  /* ---------------- state ---------------- */
  let site = null;
  const pages = {};
  let shown = null;
  let checks = new Set(); // the rules list always starts empty when the site is opened
  const saveChecks = () => LS.set('checks', [...checks]);
  const checksDone = () => site.checklist.length > 0 && site.checklist.every((i) => checks.has(i.id));

  /* ---------------- routing ---------------- */
  const ROUTES = ['invite', 'rules', 'map'];
  const hashRoute = () => { const r = location.hash.replace(/^#\//, ''); return ROUTES.includes(r) ? r : null; };
  function allowed(r) {
    if (r === 'invite') return true;
    const earned = site.stops.some((x) => x.unlocked && !x.open); // an open (no-code) stop doesn't count
    if (r === 'rules') return !!LS.get('accepted', false) || checksDone() || earned;
    if (r === 'map') return checksDone() || earned;
    return false;
  }
  const guard = (r) => (allowed(r) ? r : r === 'map' && allowed('rules') ? 'rules' : 'invite');
  const histIdx = () => (history.state && typeof history.state.i === 'number' ? history.state.i : null);
  let curIdx = 0;
  function go(r) {
    if (location.hash === '#/' + r) return show(r);
    curIdx += 1;
    history.pushState({ i: curIdx }, '', '#/' + r);
    show(r);
  }
  // Browser / phone back button → everything starts again from the very beginning.
  window.addEventListener('popstate', () => {
    if (!site) return;
    const i = histIdx();
    if (i === null) { history.replaceState({ i: curIdx }, '', location.hash || '#/invite'); show(hashRoute() || 'invite'); return; }
    const back = i < curIdx;
    curIdx = i;
    if (back) restart(); else show(hashRoute() || 'invite');
  });

  function show(r) {
    r = guard(r);
    if (location.hash !== '#/' + r) history.replaceState({ i: curIdx }, '', '#/' + r);
    if (r === shown) return;
    const prev = shown ? pages[shown] : null;
    shown = r;
    LS.set('route', r);
    const enter = () => {
      Object.values(pages).forEach((p) => p.classList.remove('active', 'leaving'));
      pages[r].classList.add('active');
      window.scrollTo(0, 0);
      if (r === 'rules') refreshProgress();
      if (r === 'map') renderMap();
    };
    if (prev && !reduced) { prev.classList.add('leaving'); setTimeout(enter, 320); } else enter();
  }

  /* ---------------- page 1 : invitation ---------------- */
  function envelope() {
    return s('svg', { class: 'envelope', viewBox: '0 0 84 66', 'aria-hidden': 'true' },
      s('rect', { x: 4, y: 12, width: 76, height: 50, rx: 9, fill: 'var(--card)', stroke: 'var(--rose)', 'stroke-width': 2.5 }),
      s('path', { d: 'M6 18 L42 42 L78 18', fill: 'none', stroke: 'var(--rose)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }),
      s('circle', { cx: 42, cy: 14, r: 13, fill: 'var(--sun)' }),
      s('path', { d: SPARK_D, transform: 'translate(42 14) scale(1.15)', fill: 'var(--deep)' }));
  }
  function buildInvite() {
    const c = site.content;
    return h('section', { class: 'page', 'aria-label': c.siteTitle },
      h('div', { class: 'wrap' },
        envelope(),
        h('h1', { class: 'title' }, withHearts(c.siteTitle)),
        h('div', { class: 'date-pill', text: c.date }),
        h('div', { class: 'card msg' }, c.inviteMessage.split(/\n\s*\n/).map((p) => h('p', { dir: 'auto', text: p.trim() }))),
        h('p', { class: 'tagline' }, withHearts(c.inviteTagline)),
        h('button', { class: 'btn', type: 'button', onClick: () => { LS.set('accepted', true); go('rules'); } }, withHearts(c.inviteButton))));
  }

  /* ---------------- page 2 : rules ---------------- */
  let fillEl, countEl, rulesBtn, readyOnce = false;
  function checkSvg() { return s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, s('path', { d: 'M5 12.500 L10 17.500 L19.500 7' })); }
  function sparkles(host) {
    if (reduced) return;
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7, d = rand(22, 38);
      const sp = h('span', { class: 'spark', text: '✦', style: { '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px' } });
      host.append(sp);
      setTimeout(() => sp.remove(), 850);
    }
  }
  function buildRules() {
    const c = site.content;
    const items = site.checklist;
    fillEl = h('div', { class: 'fill' });
    countEl = h('b', { text: '0 / ' + items.length });
    rulesBtn = h('button', { class: 'btn', type: 'button', disabled: true, onClick: () => { if (checksDone()) go('map'); } }, withHearts(c.rulesButton));

    const list = h('ol', { class: 'checklist' }, items.map((it, i) => {
      const input = h('input', { type: 'checkbox', class: 'sr', id: 'chk' + it.id });
      const box = h('span', { class: 'box', 'aria-hidden': 'true' }, checkSvg());
      const label = h('label', { class: 'item' + (checks.has(it.id) ? ' done' : ''), for: 'chk' + it.id },
        input, box,
        h('div', { class: 'item-main' },
          h('div', { class: 'item-head' }, h('span', { class: 'num', text: pad(i + 1) }), h('span', { class: 'item-title', dir: 'auto', text: it.title })),
          h('p', { class: 'item-body', dir: 'auto', text: it.body })));
      input.checked = checks.has(it.id);
      input.addEventListener('change', () => {
        if (input.checked) { checks.add(it.id); label.classList.add('done', 'pop'); sparkles(box); setTimeout(() => label.classList.remove('pop'), 520); }
        else { checks.delete(it.id); label.classList.remove('done'); }
        saveChecks();
        refreshProgress();
      });
      return h('li', null, label);
    }));

    return h('section', { class: 'page', 'aria-label': c.rulesHeading },
      h('div', { class: 'wrap' },
        h('h2', { class: 'heading' }, withHearts(c.rulesHeading)),
        h('p', { class: 'subtitle', text: c.rulesSubtitle }),
        h('p', { class: 'intro', dir: 'auto', text: c.rulesIntro }),
        h('div', { class: 'progress', role: 'status' },
          h('div', { class: 'progress-top' }, h('span', { text: 'Progress' }), countEl), h('div', { class: 'bar' }, fillEl)),
        list,
        h('p', { class: 'foot-line' }, withHearts(c.rulesFooter)),
        rulesBtn));
  }
  function refreshProgress() {
    if (!fillEl) return;
    const total = site.checklist.length;
    const done = site.checklist.filter((i) => checks.has(i.id)).length;
    countEl.textContent = `${done} / ${total}`;
    fillEl.style.transform = `scaleX(${total ? done / total : 0})`;
    const all = total > 0 && done === total;
    rulesBtn.disabled = !all;
    if (all && !readyOnce && shown === 'rules') { readyOnce = true; confetti(18); }
    if (!all) readyOnce = false;
  }

  /* ---------------- page 3 : map ---------------- */
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function smoothPath(pts) {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }
  const STAR_D = 'M0 -8 L2.4 -2.6 L8 -2.2 L3.7 1.6 L5 7.5 L0 4.4 L-5 7.5 L-3.7 1.6 L-8 -2.2 L-2.4 -2.6Z';
  const SPARK_D = 'M0 -7 C1 -2 2 -1 7 0 C2 1 1 2 0 7 C-1 2 -2 1 -7 0 C-2 -1 -1 -2 0 -7Z';
  function lockSvg() {
    return s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
      s('rect', { x: 5, y: 11, width: 14, height: 10, rx: 3 }), s('path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }));
  }

  function renderMap() {
    const box = document.getElementById('mapbox');
    if (!box) return;
    box.replaceChildren();
    const c = site.content;
    const stops = site.stops;
    const n = Math.max(stops.length, 1);
    const W = 360, GAP = 235, TOP = 135;
    const H = TOP + (n - 1) * GAP + 160;
    box.style.aspectRatio = `${W} / ${H}`;

    const pts = stops.map((_, i) => ({ x: i % 2 === 0 ? 104 : 256, y: TOP + i * GAP }));
    const way = [{ x: 180, y: 38 }];
    pts.forEach((p, i) => {
      way.push(p);
      const q = pts[i + 1];
      if (q) {
        const dir = q.x > p.x ? 1 : -1;
        way.push({ x: p.x - dir * 46, y: p.y + 68 }, { x: (p.x + q.x) / 2, y: p.y + GAP / 2 }, { x: q.x + dir * 46, y: q.y - 68 });
      }
    });
    const last = pts[pts.length - 1] || { x: 180, y: TOP };
    const dirE = last.x < 180 ? 1 : -1;
    way.push({ x: last.x + dirE * 55, y: last.y + 70 }, { x: 180, y: H - 44 });
    const d = smoothPath(way);

    const rnd = mulberry(11);
    const deco = [];
    for (let y = 70, k = 0; y < H - 40; y += 78 + rnd() * 30, k++) {
      const left = k % 2 === 0;
      const x = left ? 24 + rnd() * 34 : W - 24 - rnd() * 34;
      const kind = k % 3;
      const sc = 0.8 + rnd() * 0.8;
      deco.push(
        kind === 0 ? s('path', { class: 'deco', d: STAR_D, transform: `translate(${x} ${y}) scale(${sc})`, fill: 'none', stroke: 'var(--sun)', 'stroke-width': 1.6 })
        : kind === 1 ? s('path', { class: 'deco', d: SPARK_D, transform: `translate(${x} ${y}) scale(${sc})`, fill: 'var(--sun)' })
        : s('g', { class: 'deco', transform: `translate(${x} ${y}) scale(${sc})`, fill: 'none', stroke: 'var(--rose)', 'stroke-width': 1.5, 'stroke-linecap': 'round' },
            s('path', { d: 'M-12 4 C-14 -3 -6 -6 -3 -2 C0 -8 10 -6 9 0 C14 0 14 6 8 6 L-9 6 C-12 6 -12 5 -12 4Z' })));
    }
    // compass rose (bottom corner)
    const cx = last.x < 180 ? 296 : 64, cy = H - 70;
    deco.push(s('g', { class: 'deco', transform: `translate(${cx} ${cy})`, fill: 'none', stroke: 'var(--rose)', 'stroke-width': 1.4 },
      s('circle', { r: 20, 'stroke-dasharray': '2 4' }), s('path', { d: 'M0 -17 L4 0 L0 17 L-4 0Z', fill: 'var(--blush)' }), s('path', { d: 'M-17 0 L0 -4 L17 0 L0 4Z' })));

    const svg = s('svg', { class: 'mapsvg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
      ...deco,
      s('path', { d, fill: 'none', stroke: 'var(--blush)', 'stroke-width': 18, 'stroke-linecap': 'round', opacity: '.55' }),
      s('path', { class: 'trail-dots', d, fill: 'none', stroke: 'var(--deep)', 'stroke-width': 4.2, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 11' }),
      s('g', { transform: 'translate(180 38)' }, s('circle', { r: 15, fill: 'var(--card)', stroke: 'var(--rose)', 'stroke-width': 2 }), s('path', { d: SPARK_D, transform: 'scale(1.15)', fill: 'var(--sun)' })),
      s('g', { transform: `translate(180 ${H - 44})` }, s('circle', { class: 'gold-glow', r: 26, fill: 'var(--sun)', opacity: '.25' }), s('circle', { r: 17, fill: 'var(--sun)' }), s('path', { d: SPARK_D, transform: 'scale(1.6)', fill: 'var(--deep)' })));
    box.append(svg);
    box.append(h('button', { class: 'gold-star', type: 'button', 'aria-label': c.letterPopupTitle, onClick: openLetterGate, style: { left: '50%', top: ((H - 44) / H) * 100 + '%' } }));

    stops.forEach((st, i) => {
      const p = pts[i];
      const title = st.unlocked ? st.detail.title : st.lockedTitle;
      const open = () => openStop(st.id);
      box.append(h('div', { class: `stop ${st.unlocked ? 'unlocked' : 'locked'} side-${p.x < 180 ? 'r' : 'l'}`, style: { left: (p.x / W) * 100 + '%', top: (p.y / H) * 100 + '%' } },
        h('button', { class: 'pin', type: 'button', onClick: open, 'aria-label': `${c.stopLabel} ${i + 1}: ${title}${st.unlocked ? '' : ' (locked)'}` },
          pad(i + 1),
          h('span', { class: 'badge' }, st.unlocked ? (st.detail.emoji || '✦') : lockSvg())),
        h('button', { class: 'tag', type: 'button', onClick: open, tabindex: '-1', 'aria-hidden': 'true' },
          h('small', { text: `${c.stopLabel} ${pad(i + 1)} —` }), ' ', h('span', { dir: 'auto' }, withHearts(title)),
          st.unlocked && st.detail.activity ? h('span', { class: 'tag-sub', dir: 'auto', text: st.detail.activity }) : null)));
    });
  }

  function buildMap() {
    const c = site.content;
    return h('section', { class: 'page', 'aria-label': c.mapHeading },
      h('div', { class: 'wrap' },
        h('h2', { class: 'heading' }, withHearts(c.mapHeading)),
        h('div', { class: 'mapframe' }, h('div', { class: 'mapbox', id: 'mapbox' })),
        h('p', { class: 'foot-line' }, withHearts(c.mapFooter)),
        h('p', { class: 'closing' }, withHearts(c.mapClosing))));
  }

  /* ---------------- modal system ---------------- */
  let modalEl = null, lastFocus = null;
  function openModal(dialogChildren, label) {
    closeModal(true);
    lastFocus = document.activeElement;
    const dlg = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, h('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '×', onClick: () => closeModal() }), dialogChildren);
    modalEl = h('div', { class: 'overlay', onClick: (e) => { if (e.target === modalEl) closeModal(); } }, dlg);
    document.body.append(modalEl);
    document.body.classList.add('modal-open');
    return dlg;
  }
  function closeModal(instant) {
    if (!modalEl) return;
    const el = modalEl;
    modalEl = null;
    document.body.classList.remove('modal-open');
    if (instant || reduced) el.remove(); else { el.classList.add('out'); setTimeout(() => el.remove(), 230); }
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch {}
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function openStop(id) {
    const st = site.stops.find((x) => x.id === id);
    if (!st) return;
    if (st.unlocked) openReveal(st.detail, false); else openCode(st);
  }

  function openCode(st) {
    const c = site.content;
    const input = h('input', { type: 'text', class: 'code-input', name: 'secret-code', placeholder: c.popupPlaceholder, 'aria-label': c.popupPlaceholder, autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go', maxlength: '100', dir: 'auto' });
    const err = h('p', { class: 'err', 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn', type: 'submit' }, withHearts(c.popupButton));
    let timer = null;
    const shake = () => { input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); };
    const cooldown = (secs) => {
      btn.disabled = true;
      const tick = () => {
        if (secs <= 0) { err.textContent = ''; btn.disabled = false; return; }
        err.textContent = `${c.tooManyTries} (${secs}s)`;
        secs--; timer = setTimeout(tick, 1000);
      };
      tick();
    };
    const form = h('form', { class: 'code-form', autocomplete: 'off', novalidate: true, onSubmit: async (e) => {
      e.preventDefault();
      const code = input.value.trim();
      if (!code) { err.textContent = c.wrongCode; shake(); return; }
      btn.disabled = true; err.textContent = '';
      const { status, data } = await api('/api/unlock', { method: 'POST', body: { stopId: st.id, code } });
      if (status === 200 && data && data.ok) {
        const idx = site.stops.findIndex((x) => x.id === st.id);
        site.stops[idx] = { ...site.stops[idx], unlocked: true, detail: data.stop };
        clearTimeout(timer);
        closeModal();
        renderMap();
        setTimeout(() => openReveal(data.stop, true), reduced ? 0 : 260);
      } else if (status === 429) {
        shake(); cooldown((data && data.retryAfter) || 60);
      } else if (status === 401) {
        err.textContent = c.wrongCode; shake(); input.select(); btn.disabled = false;
      } else {
        err.textContent = 'Connection hiccup — please try again ✦'; btn.disabled = false;
      }
    } }, input, err, btn);
    openModal([
      h('div', { class: 'lockring' }, lockSvg()),
      h('h2', null, withHearts(c.popupTitle)),
      h('p', { class: 'lead' }, c.popupMessage),
      form,
    ], c.popupTitle);
    setTimeout(() => input.focus(), reduced ? 0 : 420);
  }

  function openReveal(d, fresh) {
    const c = site.content;
    const safeUrl = typeof d.mapsUrl === 'string' && /^https:\/\//i.test(d.mapsUrl) ? d.mapsUrl : '';
    const note = d.departureNote || d.departureTime;
    openModal([
      h('span', { class: 'r-emoji', 'aria-hidden': 'true', text: d.emoji || '✦' }),
      h('div', { class: 'r-kicker', text: `${c.stopLabel} ${pad(d.number)}` }),
      h('h2', null, withHearts(d.title)),
      d.activity ? h('span', { class: 'r-act', dir: 'auto', text: d.activity }) : null,
      d.description ? h('p', { class: 'r-desc', dir: 'auto', text: d.description }) : null,
      note ? h('div', { class: 'note' },
        h('span', { class: 'note-k', text: '📌 Note' }),
        h('span', { class: 'note-t', dir: 'auto', text: note })) : null,
      h('div', { class: 'r-actions' },
        safeUrl ? h('a', { class: 'btn', href: safeUrl, target: '_blank', rel: 'noopener noreferrer' }, withHearts(c.mapButton)) : null,
        h('button', { class: 'btn ghost', type: 'button', onClick: () => closeModal(), text: 'Back to the map' })),
    ], d.title);
    if (fresh) confetti(28);
  }

  /* ---------------- golden star : the letter ---------------- */
  let letter = null;
  function openLetterGate() {
    if (letter) return openLetter(letter, false);
    const c = site.content;
    const input = h('input', { type: 'text', class: 'code-input', name: 'letter-code', inputmode: 'numeric', placeholder: c.popupPlaceholder, 'aria-label': c.popupPlaceholder, autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go', maxlength: '100', dir: 'ltr' });
    const err = h('p', { class: 'err', 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn', type: 'submit' }, withHearts(c.letterPopupButton));
    const shake = () => { input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); };
    const form = h('form', { class: 'code-form', autocomplete: 'off', novalidate: true, onSubmit: async (e) => {
      e.preventDefault();
      const code = input.value.trim();
      if (!code) { err.textContent = c.wrongCode; shake(); return; }
      btn.disabled = true; err.textContent = '';
      const { status, data } = await api('/api/letter', { method: 'POST', body: { code } });
      if (status === 200 && data && data.ok) {
        letter = data.letter;
        closeModal();
        setTimeout(() => openLetter(letter, true), reduced ? 0 : 260);
      } else if (status === 429) {
        err.textContent = c.tooManyTries; shake();
        setTimeout(() => { btn.disabled = false; err.textContent = ''; }, ((data && data.retryAfter) || 60) * 1000);
      } else if (status === 401) {
        err.textContent = c.wrongCode; shake(); input.select(); btn.disabled = false;
      } else {
        err.textContent = 'Connection hiccup — please try again ✦'; btn.disabled = false;
      }
    } }, input, err, btn);
    openModal([
      h('div', { class: 'lockring gold' }, s('svg', { viewBox: '-9 -9 18 18', 'aria-hidden': 'true' }, s('path', { d: SPARK_D, fill: 'var(--deep)' }))),
      h('h2', null, withHearts(c.letterPopupTitle)),
      h('p', { class: 'lead' }, c.letterPopupMessage),
      form,
    ], c.letterPopupTitle);
    setTimeout(() => input.focus(), reduced ? 0 : 420);
  }
  function openLetter(L, fresh) {
    const dlg = openModal([
      h('div', { class: 'letter' },
        h('h2', { class: 'letter-title' }, withHearts(L.title)),
        h('p', { class: 'letter-sub', text: L.subtitle }),
        h('div', { class: 'letter-body' }, L.paragraphs.map((t) => h('p', { dir: 'auto', class: /^[A-Za-z]/.test(t) ? 'en' : '' }, withHearts(t)))),
        h('p', { class: 'letter-date', text: L.date }),
        h('p', { class: 'letter-sign', dir: 'auto' }, withHearts(L.signoff))),
      h('div', { class: 'r-actions' }, h('button', { class: 'btn ghost', type: 'button', onClick: () => closeModal(), text: 'Back to the map' })),
    ], L.title);
    dlg.classList.add('letter-dialog');
    if (fresh) confetti(34);
  }

  /* ---------------- start over (back button) ---------------- */
  let restarting = false;
  async function restart() {
    if (restarting) return;
    restarting = true;
    closeModal(true);
    checks = new Set(); saveChecks();
    LS.set('accepted', false); LS.set('route', 'invite');
    letter = null; readyOnce = false;
    await api('/api/restart', { method: 'POST', body: {} });
    const { status, data } = await api('/api/site');
    if (status === 200 && data) site = data;
    build();
    shown = null;
    history.replaceState({ i: curIdx }, '', '#/invite');
    show('invite');
    restarting = false;
  }
  function build() {
    const app = document.getElementById('app');
    app.replaceChildren();
    pages.invite = buildInvite();
    pages.rules = buildRules();
    pages.map = buildMap();
    Object.values(pages).forEach((p) => app.append(p));
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    const app = document.getElementById('app');
    const { status, data } = await api('/api/site');
    if (status !== 200 || !data) {
      app.append(h('div', { class: 'err-page' }, h('p', { text: 'Something went wrong — please try again ✦' }), h('p', null, h('button', { class: 'btn', type: 'button', onClick: () => location.reload(), text: 'Retry' }))));
      return;
    }
    site = data;
    // owner reset (epoch bump) clears this device's saved progress
    if (LS.get('epoch', null) !== site.epoch) {
      if (LS.get('epoch', null) !== null) { checks = new Set(); saveChecks(); LS.set('accepted', false); LS.set('route', 'invite'); }
      LS.set('epoch', site.epoch);
    }
    checks = new Set();
    saveChecks();

    document.title = site.content.siteTitle;
    applyTheme(site.theme);
    spawnHearts(site.theme);

    build();
    curIdx = histIdx() ?? 0;
    history.replaceState({ i: curIdx }, '', location.hash || '#/invite');
    show(hashRoute() || LS.get('route', 'invite'));
  }
  boot();
})();
