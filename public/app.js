/* A Day to Remember ✦ — app script (v2, Nov 2026)
   v2 changes: stars (yellow + blue) instead of decorative hearts, the "Khashoom" signature on every rule sheet,
   the stop-1 playlist page («اسمع عبال توصلني»), and the ending walk (hand in hand from the car to the balloon).
   Quick edits: see the EDITABLE block right below. */
(() => {
  'use strict';
  /* ===================== EDITABLE ===================== */
  const SIGN_NAME = 'Khashoom';                       // the name signed on each rule sheet
  const STAR_COLS = ['#f4cf5d', '#a9d3f5', '#f7dd8a', '#2f5f9e', '#e9be4f', '#cfe6f5', '#1f4670']; // star colours (yellow + baby blue + navy blue)
  const PLAYLIST_DEFAULT = {
    stopId: 1,                                        // shown right after this stop's code is entered
    text: 'اسمع عبال توصلني',
    url: 'https://youtube.com/playlist?list=PLdWicoJSSsoM&si=9im5IPhGry6mT9xl',
    label: 'Our Playlist',
    cta: 'Open the playlist',
  };
  const MUSIC_YT_ID = '';                             // '' = the music is the file audio/music.mp3 (now: Yiruma – River Flows in You); a YouTube video ID here would use YouTube instead
  /* ==================================================== */
  let D = window.DTR, C = D && D.content;
  const ASSET = Object.assign({ car: 'images/car.webp', carEmpty: 'images/car-empty.webp', balloon: 'images/balloon.webp', balloonEmpty: 'images/balloon-empty.webp', walk: 'images/walk.webp', music: 'audio/music.mp3' }, window.DTR_ASSETS || {});
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const rand = (a, b) => a + Math.random() * (b - a);
  // v2: nothing is remembered between visits — every load/refresh starts at the invite with all codes locked again.
  // Progress lives only in memory for this visit; any progress an older version saved in the browser is wiped.
  try { Object.keys(localStorage).filter((k) => k.startsWith('dtr2:') || k.startsWith('dtr:')).forEach((k) => localStorage.removeItem(k)); sessionStorage.clear(); } catch {}
  const MEM = new Map();
  const LS = {
    get(k, d) { return MEM.has(k) ? JSON.parse(MEM.get(k)) : d; },
    set(k, v) { MEM.set(k, JSON.stringify(v)); },
  };
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // only ever used with static SVG strings below
      else if (k === 'style') for (const [a, b] of Object.entries(v)) el.style.setProperty(a, b);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return el;
  }
  const withHearts = (t) => String(t).split(/([♡✦✧])/).map((p) => (/^[♡✦✧]$/.test(p) ? h('span', { class: 'hrt', text: p }) : p));

  /* ---------- static svg ---------- */
  const HEART = '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" d="M12 2.6l2.75 5.95 6.5.72-4.85 4.4 1.35 6.4L12 16.8l-5.75 3.27 1.35-6.4L2.75 9.27l6.5-.72z"/></svg>'; // decorative star (was a heart)
  const SEAL = (inner, id) => `<svg class="seal" viewBox="0 0 100 100"><defs><radialGradient id="w${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#3a6593"/><stop offset=".55" stop-color="#1b3b62"/><stop offset="1" stop-color="#0d213a"/></radialGradient></defs>
    <path fill="url(#w${id})" d="M50 3c7 0 9 4 15 5s11-1 15 4 2 10 5 15 8 7 8 14-4 9-5 15 1 11-4 15-10 2-15 5-7 8-14 8-9-4-15-5-11 1-15-4-2-10-5-15-8-8-8-15 4-9 5-15-1-11 4-15 10-2 15-5 7-7 14-7z"/>
    <circle cx="50" cy="50" r="31" fill="none" stroke="#0b1c31" stroke-opacity=".55" stroke-width="3"/><circle cx="50" cy="50" r="31" fill="none" stroke="#5d86b3" stroke-opacity=".35" stroke-width="1" transform="translate(-1 -1)"/>${inner}</svg>`;
  const SEAL_HEART = '<path fill="#f1d27a" stroke="#f1d27a" stroke-width="2" stroke-linejoin="round" d="M50 33l5.2 11.2 12.3 1.4-9.2 8.3 2.6 12.1L50 59.8l-10.9 6.2 2.6-12.1-9.2-8.3 12.3-1.4z"/>';
  const CORNER = '<svg class="corner {c}" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1"><path d="M2 24V8a6 6 0 0 1 6-6h16"/><path d="M6 24V11a5 5 0 0 1 5-5h13" stroke-opacity=".6"/><circle cx="4" cy="4" r="1.6" fill="currentColor"/></svg>';
  const LOCK = '<svg viewBox="0 0 32 38"><defs><linearGradient id="lg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f3e2b0"/><stop offset=".5" stop-color="#c9a45c"/><stop offset="1" stop-color="#9b7632"/></linearGradient></defs><path class="shackle" d="M9 17v-6a7 7 0 0 1 14 0v6" fill="none" stroke="url(#lg)" stroke-width="3.6" stroke-linecap="round"/><rect x="4" y="16" width="24" height="19" rx="4" fill="url(#lg)" stroke="#8a6a2c" stroke-width=".8"/><circle cx="16" cy="24" r="2.6" fill="#5b4318"/><path d="M16 25v5" stroke="#5b4318" stroke-width="2" stroke-linecap="round"/></svg>';
  const NIB = '<svg viewBox="0 0 28 28"><path d="M2 26 L8 14 L20 2 L26 8 L14 20 Z" fill="#14304f"/><path d="M2 26 L8 14 L14 20 Z" fill="#c9a45c"/><path d="M2 26 L10 18" stroke="#fdfaf2" stroke-width="1"/></svg>';
  const SIG_PATHS = [
    'M14 62 C22 30 34 14 40 22 C46 30 30 66 26 70 C40 52 52 40 60 44 C66 48 58 62 66 60 C74 58 80 44 86 46 C92 48 86 62 94 60 C104 57 108 36 118 22 C112 40 106 60 112 62 C120 64 128 46 136 46 C144 46 136 62 146 60 C156 58 160 44 168 46 C176 48 168 64 180 60 C196 54 214 40 226 42 C236 44 222 60 236 58 C250 56 262 44 274 40 M30 78 C100 71 190 69 286 62',
  ];
  const CAR_SVG = '<svg viewBox="0 0 68 40"><ellipse cx="34" cy="36" rx="28" ry="3" fill="rgba(0,0,0,.18)"/><path d="M6 27c0-5 3-8 8-9l8-8c2-2 4-3 7-3h12c3 0 5 1 7 3l7 8c5 1 7 4 7 9v3H6z" fill="#9aa3ad"/><path d="M24 11h8v8H17zM35 11h7c2 0 3 1 4 2l5 6H35z" fill="#d6e6f2"/><path d="M6 25h56" stroke="#7d8792" stroke-width="1"/><rect x="58" y="22" width="5" height="3" rx="1" fill="#f5e3a8"/><circle cx="18" cy="31" r="5.5" fill="#2c3440"/><circle cx="18" cy="31" r="2.2" fill="#c3cad2"/><circle cx="50" cy="31" r="5.5" fill="#2c3440"/><circle cx="50" cy="31" r="2.2" fill="#c3cad2"/><path fill="#fff" d="M33 22.5s-2.6-1.5-2.6-3.2a1.4 1.4 0 0 1 2.6-.7 1.4 1.4 0 0 1 2.6.7c0 1.7-2.6 3.2-2.6 3.2z"/></svg>';
  const STRIPES = ['#14304f', '#f8f3e9', '#a9cfea', '#f8f3e9', '#14304f', '#f8f3e9', '#a9cfea'];
  function balloonSvg(withPeople) {
    // envelope made of 7 gores
    const gores = STRIPES.map((col, i) => {
      const x0 = 10 + i * (130 / 7), x1 = x0 + 130 / 7;
      return `<path d="M75 8 C${x0 - 20 + i * 2} 14 ${x0 - 6} 60 ${x0 + 2} 92 L${x1 - 2} 92 C${x1 + 6} 60 ${x1 + 20 - i * 2} 14 75 8Z" fill="${col}"/>`;
    }).join('');
    const people = withPeople ? `<g class="p1"><circle cx="66" cy="160" r="6" fill="#3b2a22"/><path d="M59 182c0-9 3-15 7-15s7 6 7 15z" fill="#fdfaf2"/><circle cx="62" cy="156" r="2.2" fill="#e8a3b3"/></g><g class="p2"><circle cx="85" cy="158" r="6.5" fill="#3b2a22"/><path d="M77 182c0-10 4-16 8-16s8 6 8 16z" fill="#e8b23c"/></g>` : '';
    return `<svg viewBox="0 0 150 226"><defs><clipPath id="env"><path d="M75 6C30 6 6 36 8 64c2 26 30 42 42 58h50c12-16 40-32 42-58C144 36 120 6 75 6z"/></clipPath><radialGradient id="shade" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>
      <g clip-path="url(#env)"><g transform="translate(0 -2) scale(1 1.35)">${gores}</g><rect width="150" height="130" fill="url(#shade)"/></g>
      <path d="M50 122h50l-6 16H56z" fill="#c9a45c"/><path d="M58 138l2 30M92 138l-2 30M66 138l1 30M84 138l-1 30" stroke="#6b5530" stroke-width="1.2"/>
      ${people}
      <path d="M56 168h38l-3 22H59z" fill="#a9773e"/><path d="M56 168h38" stroke="#7a5426" stroke-width="3"/><path d="M60 176h31M60 183h30" stroke="#8a6232" stroke-width="1"/></svg>`;
  }

  /* ---------- floating hearts ---------- */
  (function floaters() {
    if (reduced) return;
    const box = document.getElementById('hearts');
    const cols = STAR_COLS;
    for (let i = 0; i < 14; i++) box.append(h('span', { class: 'fh', html: HEART, style: { left: rand(2, 94) + '%', '--s': rand(10, 22) + 'px', '--d': rand(14, 26) + 's', '--dl': -rand(0, 26) + 's', '--sw': rand(-40, 40) + 'px', '--o': rand(.25, .55).toFixed(2), '--c': cols[i % cols.length] } }));
  })();
  function burst(x, y, n = 18, spread = 120) {
    if (reduced) return;
    const cols = STAR_COLS;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), d = rand(spread * .35, spread);
      const el = h('span', { class: 'bh', html: HEART, style: { '--x': x + 'px', '--y': y + 'px', '--s': rand(10, 22) + 'px', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d - spread * .25 + 'px', '--r': rand(-50, 50) + 'deg', '--t': rand(.8, 1.3) + 's', '--c': cols[i % cols.length] } });
      document.body.append(el); setTimeout(() => el.remove(), 1400);
    }
  }
  const burstFrom = (el, n, spread) => { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, n, spread); };
  const buzz = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

  /* ---------- routing ---------- */
  const pages = {}; let shown = null, curIdx = 0;
  const ROUTES = ['invite', 'rules', 'map'];
  let signed = 0;
  const unlocked = () => LS.get('unlocked', []);
  const allSigned = () => signed >= D.checklist.length;
  function allowed(r) {
    if (r === 'invite') return true;
    if (r === 'rules') return LS.get('accepted', false) || unlocked().length > 0;
    if (r === 'map') return allSigned() || unlocked().length > 0;
    return false;
  }
  const guard = (r) => (allowed(r) ? r : r === 'map' && allowed('rules') ? 'rules' : 'invite');
  const hashRoute = () => { const r = location.hash.replace(/^#\//, ''); return ROUTES.includes(r) ? r : null; };
  function go(r) { curIdx += 1; history.pushState({ i: curIdx }, '', '#/' + r); show(r); }
  window.addEventListener('popstate', () => {
    const i = history.state && typeof history.state.i === 'number' ? history.state.i : null;
    if (i === null || i < curIdx) { curIdx = i || 0; restart(); } else { curIdx = i; show(hashRoute() || 'invite'); }
  });
  function show(r) {
    r = guard(r);
    if (location.hash !== '#/' + r) history.replaceState({ i: curIdx }, '', '#/' + r);
    if (r === shown) return;
    const prev = shown && pages[shown]; shown = r;
    const enter = () => { Object.values(pages).forEach((p) => p.classList.remove('active', 'leaving')); pages[r].classList.add('active'); window.scrollTo(0, 0); if (r === 'map') mapEnter(); };
    if (prev && !reduced) { prev.classList.add('leaving'); setTimeout(enter, 330); } else enter();
  }

  /* ---------- page 1 : invitation ---------- */
  function buildInvite() {
    const paras = C.inviteMessage.split(/\n\s*\n/).map((p) => {
      const parts = p.trim().split(/(".*?")/);
      return h('p', { dir: 'rtl' }, parts.map((s) => (/^".*"$/.test(s) ? h('span', { class: 'q', text: s }) : s)));
    });
    const card = h('div', { class: 'sheet framed letter-msg' }, paras);
    ['tl', 'tr', 'bl', 'br'].forEach((c) => card.insertAdjacentHTML('beforeend', CORNER.replace('{c}', c)));
    return h('section', { class: 'page', 'aria-label': C.siteTitle },
      h('div', { class: 'wrap' },
        h('div', { class: 'kick-seal', html: SEAL(SEAL_HEART, 'a') }),
        h('h1', { class: 'title' }, withHearts(C.siteTitle)),
        h('div', { class: 'date' }, h('i'), h('span', { text: C.date }), h('i')),
        card,
        h('p', { class: 'tagline' }, withHearts(C.inviteTagline)),
        h('button', { class: 'btn', type: 'button', onClick: (e) => { buzz(); burstFrom(e.currentTarget, 14, 90); LS.set('accepted', true); startMusic(); setTimeout(() => go('rules'), reduced ? 0 : 380); } }, withHearts(C.inviteButton))));
  }

  /* ---------- page 2 : rules as signing sheets ---------- */
  let papers = [], fillEl, countEl, rulesBtn, stackEl, doneEl;
  function buildRules() {
    const items = D.checklist; signed = 0;
    fillEl = h('div', { class: 'fill' });
    countEl = h('b', { text: '0 / ' + items.length });
    rulesBtn = h('button', { class: 'btn', type: 'button', disabled: true, onClick: () => { if (allSigned()) { buzz(); go('map'); } } }, withHearts(C.rulesButton));
    papers = items.map((it, i) => {
      const rot = rand(-7, -3).toFixed(1), dx = rand(-4, 14).toFixed(0), dy = rand(-3, 3).toFixed(0);
      const sigSvg = h('div', { html: `<svg class="sig" viewBox="0 0 300 96" preserveAspectRatio="xMinYMid meet"><defs><mask id="sgm${i}" maskUnits="userSpaceOnUse" x="-20" y="-40" width="360" height="180"><path class="mk" d="M0 0" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/></mask></defs><g transform="translate(${dx} ${dy}) rotate(${rot} 150 56)"><g transform="translate(150 0) skewX(-9) translate(-150 0)"><text class="sgt" x="34" y="66" mask="url(#sgm${i})" filter="url(#ink)">${SIGN_NAME}</text></g><path class="fl" filter="url(#ink)" d="M0 0" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="1"/></g></svg>` }).firstChild;
      const nib = h('span', { class: 'nib', html: NIB });
      const stamp = h('span', { class: 'stamp', html: SEAL(SEAL_HEART, 's' + i) });
      const line = h('button', { class: 'signline', type: 'button', 'aria-label': 'وقّع هنا', onClick: () => signSheet(i) },
        h('span', { class: 'ln' }), h('span', { class: 'x', text: '✕' }), h('span', { class: 'nibhint', 'aria-hidden': 'true', text: '🖋️' }), h('span', { class: 'hint', text: 'وقّع هنا 🖋️' }));
      const el = h('article', { class: 'paper', 'aria-label': it.title },
        h('div', { class: 'pno' }, h('span', { text: pad(i + 1) }), h('i')),
        h('h3', { dir: 'auto', text: it.title }),
        h('p', { class: 'pbody', dir: 'rtl', text: it.body }),
        h('div', { class: 'sign' }, stamp, line, sigSvg, nib));
      el._p = { sig: sigSvg.querySelector('.fl'), mk: sigSvg.querySelector('.mk'), txt: sigSvg.querySelector('.sgt'), nib, line, signed: false };
      return el;
    });
    stackEl = h('div', { class: 'stack' }, papers);
    doneEl = h('div', { class: 'alldone' }, h('div', { class: 'pile' }, h('span'), h('span'), h('span'), h('span', { html: SEAL(SEAL_HEART, 'p') }).firstChild));
    layout();
    return h('section', { class: 'page', 'aria-label': C.rulesHeading },
      h('div', { class: 'wrap' },
        h('h2', { class: 'heading' }, withHearts(C.rulesHeading)),
        h('p', { class: 'subtitle', text: C.rulesSubtitle }),
        (() => { const el = h('p', { class: 'intro', dir: 'rtl', text: C.rulesIntro }); fitIntro(el); return el; })(),
        h('div', { class: 'progress', role: 'status' }, h('div', { class: 'progress-top' }, h('span', { text: 'Progress' }), countEl), h('div', { class: 'bar' }, fillEl)),
        stackEl, doneEl,
        h('p', { class: 'foot-line' }, withHearts(C.rulesFooter)),
        rulesBtn));
  }
  function fitIntro(el) {
    let lastW = -1;
    const fit = () => {
      const w = el.clientWidth;
      if (!w || w === lastW) return;
      lastW = w;
      el.style.fontSize = '20px';
      const cs = getComputedStyle(el);
      const avail = w - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const r = document.createRange(); r.selectNodeContents(el);
      const need = r.getBoundingClientRect().width;
      if (need > avail) el.style.fontSize = Math.max(11, Math.floor(20 * avail / need * 10 * 0.98) / 10) + 'px';
    };
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(el);
    requestAnimationFrame(fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastW = -1; fit(); });
  }
  function layout() {
    papers.forEach((p, i) => {
      const d = i - signed;
      p.style.zIndex = String(100 - i);
      if (d < 0) { p.dataset.depth = 'gone'; p.inert = true; return; }
      p.dataset.depth = d === 0 ? '0' : d <= 3 ? String(d) : 'h';
      p.inert = d !== 0; p.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
    });
    const total = D.checklist.length;
    countEl.textContent = `${signed} / ${total}`;
    fillEl.style.transform = `scaleX(${signed / total})`;
  }
  function signSheet(i) {
    const p = papers[i]; if (!p || p._p.signed || i !== signed) return;
    p._p.signed = true; buzz(8);
    p.querySelector('.sign').classList.add('signed');
    const path = p._p.sig, mk = p._p.mk, txt = p._p.txt, nib = p._p.nib;
    let bb = { x: 34, y: 18, width: 210, height: 62 };
    try { const b = txt.getBBox(); if (b && b.width > 20) bb = b; } catch {}
    // the pen's route through the word: a tight zigzag that uncovers the script letter by letter
    const top = bb.y + bb.height * 0.3, bot = bb.y + bb.height * 0.76;
    let zz = `M${(bb.x - 6).toFixed(1)} ${bot.toFixed(1)}`, up = true;
    for (let x = bb.x - 2; x <= bb.x + bb.width + 8; x += 6.5) { zz += ` L${x.toFixed(1)} ${(up ? top : bot).toFixed(1)}`; up = !up; }
    mk.setAttribute('d', zz);
    // the flourish underline: a swash under the name with a little hooked tail
    const fx = bb.x + 4, fy = bb.y + bb.height * 0.93, fw = bb.width * 0.95;
    path.setAttribute('d', `M${fx - 10} ${fy + 3} C${fx + fw * .25} ${fy + 13} ${fx + fw * .62} ${fy + 4} ${fx + fw + 22} ${fy - 9} C${fx + fw + 36} ${fy - 15} ${fx + fw + 30} ${fy - 1} ${fx + fw + 12} ${fy}`);
    const svg = path.ownerSVGElement, dur = reduced ? 0 : 1750, split = .76, t0 = performance.now();
    const zl = mk.getTotalLength(), fl = path.getTotalLength();
    const ease = (k) => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const step = (now) => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      const a = Math.min(1, k / split), b = k <= split ? 0 : (k - split) / (1 - split);
      const ea = a < 1 ? a * (2 - a) * .5 + a * .5 : 1, eb = ease(b);
      mk.style.strokeDashoffset = String(1 - ea);
      path.style.strokeDashoffset = String(1 - eb);
      try {
        const hr = nib.parentElement.getBoundingClientRect();
        const q = k <= split ? mk.getPointAtLength(ea * zl).matrixTransform(txt.getScreenCTM()) : path.getPointAtLength(eb * fl).matrixTransform(path.getScreenCTM());
        nib.style.opacity = k < 1 ? '1' : '0';
        nib.style.transform = `translate(${q.x - hr.left - 2}px, ${q.y - hr.top - 26}px)`;
      } catch {}
      if (k < 1) requestAnimationFrame(step); else afterSign();
    };
    const afterSign = () => {
      burstFrom(txt, 18, 110); buzz(15);
      setTimeout(() => {
        if (!reduced) p.classList.add('fly');
        signed += 1;
        setTimeout(() => { p.style.visibility = 'hidden'; }, reduced ? 0 : 900);
        layout();
        if (allSigned()) finishRules();
        else { const nx = papers[signed]; setTimeout(() => nx.querySelector('.signline').focus({ preventScroll: true }), 300); }
      }, reduced ? 0 : 650);
    };
    requestAnimationFrame(step);
  }
  function finishRules() {
    setTimeout(() => {
      stackEl.style.display = 'none'; doneEl.classList.add('on');
      rulesBtn.disabled = false; buzz(25);
      setTimeout(() => { burstFrom(doneEl, 46, 200); }, reduced ? 0 : 200);
    }, reduced ? 0 : 750);
  }

  /* ---------- page 3 : the map ---------- */
  const W = 360, H = 960;
  const STOP_PTS = [[120, 200], [240, 380], [120, 560], [240, 740]];
  const START = [240, 40], BALLOON = [180, 900];
  const ROUTE = [START, [240, 120], [120, 120], [120, 200], [120, 290], [240, 290], [240, 380], [240, 470], [120, 470], [120, 560], [120, 650], [240, 650], [240, 740], [240, 830], [180, 830], [180, 890]];
  function roundedPath(pts, r = 18) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1), rr = Math.min(r, l1 / 2, l2 / 2);
      const a = [x1 - (x1 - x0) / l1 * rr, y1 - (y1 - y0) / l1 * rr], b = [x1 + (x2 - x1) / l2 * rr, y1 + (y2 - y1) / l2 * rr];
      d += ` L${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${x1} ${y1} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    }
    const L = pts[pts.length - 1]; return d + ` L${L[0]} ${L[1]}`;
  }
  function mapSvg() {
    const HS = [40, 120, 200, 290, 380, 470, 560, 650, 740, 830], VS = [30, 120, 240, 330];
    let blocks = '';
    for (let yi = 0; yi < HS.length - 1; yi++) for (let xi = 0; xi < VS.length - 1; xi++) {
      const x = VS[xi] + 8, y = HS[yi] + 8, w = VS[xi + 1] - VS[xi] - 16, hh = HS[yi + 1] - HS[yi] - 16;
      const park = (xi === 1 && yi === 5) || (xi === 2 && yi === 0) || (xi === 0 && yi === 3);
      blocks += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="6" fill="${park ? '#dfe7d3' : '#ece3cf'}" stroke="${park ? '#c9d6b8' : '#e2d6bd'}" stroke-width="1"/>`;
      if (park) for (let k = 0; k < 6; k++) { const tx = x + 12 + (k % 3) * (w - 24) / 2, ty = y + 16 + Math.floor(k / 3) * (hh - 32); blocks += `<circle cx="${tx}" cy="${ty}" r="7" fill="#c3d3ae"/><circle cx="${tx - 2}" cy="${ty - 2}" r="3" fill="#d3e0c1"/>`; }
      else { const n = 2 + ((xi + yi) % 3); for (let k = 0; k < n; k++) blocks += `<rect x="${x + 8 + k * (w - 16) / n}" y="${y + 8}" width="${(w - 16) / n - 6}" height="${hh * .38}" rx="2" fill="#e4d8bf"/>`; }
    }
    // left/right edge blocks
    for (let yi = 0; yi < HS.length - 1; yi++) { blocks += `<rect x="-10" y="${HS[yi] + 8}" width="32" height="${HS[yi + 1] - HS[yi] - 16}" rx="6" fill="#ece3cf"/><rect x="338" y="${HS[yi] + 8}" width="40" height="${HS[yi + 1] - HS[yi] - 16}" rx="6" fill="#ece3cf"/>`; }
    const river = 'M370 300 C300 320 280 250 200 262 C130 272 110 340 -10 326';
    let streets = '';
    HS.forEach((y) => { streets += `<path d="M-10 ${y}H370"/>`; });
    VS.forEach((x) => { streets += `<path d="M${x} 30V838"/>`; });
    const trees = [[40, 880], [70, 925], [300, 870], [330, 920], [270, 935], [100, 900], [30, 940]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#c3d3ae"/><circle cx="${x - 3}" cy="${y - 3}" r="4" fill="#d6e2c4"/>`).join('');
    const route = roundedPath(ROUTE);
    return `<svg class="mapsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs><pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#f4ecdb"/><circle cx="1" cy="1" r=".5" fill="#e9dfc8"/></pattern>
      <linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ecd8"/><stop offset="1" stop-color="#dbe5cb"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#grain)"/>
      ${blocks}
      <path d="${river}" fill="none" stroke="#cfe6f5" stroke-width="34" stroke-linecap="round"/><path d="${river}" fill="none" stroke="#b9d9ef" stroke-width="2" stroke-dasharray="6 9" opacity=".8"/>
      <g fill="none" stroke="#d8cbb0" stroke-width="15" stroke-linecap="round">${streets}</g>
      <g fill="none" stroke="#fffdf8" stroke-width="12" stroke-linecap="round">${streets}</g>
      <g fill="none" stroke="#e9dfca" stroke-width=".8" stroke-dasharray="4 5">${streets}</g>
      <rect x="0" y="846" width="${W}" height="${H - 846}" fill="url(#meadow)"/>${trees}
      <path d="M180 830 V892" stroke="#e7d7b4" stroke-width="12" stroke-linecap="round"/>
      <g transform="translate(318 56)" fill="none" stroke="#c9a45c" stroke-width="1.2"><circle r="17" stroke-dasharray="2 3"/><path d="M0 -15 L4 0 L0 15 L-4 0Z" fill="#14304f" stroke="none"/><path d="M0 -15 L4 0 L-4 0Z" fill="#c9a45c" stroke="none"/><path d="M-14 0H14"/></g>
      <path id="routeBase" d="${route}" fill="none" stroke="#14304f" stroke-opacity=".55" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="0.1 8"/>
      <path id="routeDone" d="${route}" fill="none" stroke="#14304f" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 99999"/>
      <g transform="translate(${START[0]} ${START[1]})"><circle r="9" fill="#fffcf5" stroke="#c9a45c" stroke-width="2"/><circle r="3.5" fill="#14304f"/></g>
    </svg>`;
  }
  let mapBox, routePath, routeDone, routeLen = 0, stopLens = [], carEl, carLen = 0, stopEls = [], balloonEl, driving = false;
  function buildMap() {
    mapBox = h('div', { class: 'mapbox', id: 'mapbox', html: mapSvg() });
    routePath = mapBox.querySelector('#routeBase'); routeDone = mapBox.querySelector('#routeDone');
    stopEls = D.stops.map((st, i) => {
      const [x, y] = STOP_PTS[i] || [180, 200 + i * 180];
      const tagT = h('span', { class: 't' });
      const el = h('div', { class: `stop side-${x < 180 ? 'r' : 'l'}`, style: { left: (x / W) * 100 + '%', top: (y / H) * 100 + '%' } },
        h('button', { class: 'pin', type: 'button', onClick: () => openStop(i) }, h('span', { html: SEAL('', 'm' + i) }).firstChild, h('span', { class: 'num', text: pad(i + 1) }), h('span', { class: 'lock', html: LOCK })),
        h('button', { class: 'tag', type: 'button', tabindex: '-1', 'aria-hidden': 'true', onClick: () => openStop(i) }, h('small', { text: `${C.stopLabel} ${pad(i + 1)} —` }), tagT));
      el._t = tagT; return el;
    });
    stopEls.forEach((e) => mapBox.append(e));
    balloonEl = h('button', { class: 'balloon-btn', type: 'button', 'aria-label': C.letterPopupTitle, style: { left: (BALLOON[0] / W) * 100 + '%', top: (BALLOON[1] / H) * 100 + '%' }, html: balloonSvg(false), onClick: tapBalloon });
    mapBox.append(balloonEl);
    carEl = h('div', { class: 'car', html: CAR_SVG }); mapBox.append(carEl);
    useSprite(ASSET.car, (img) => { carEl.replaceChildren(img); carEl.classList.add('sprite'); });
    return h('section', { class: 'page', 'aria-label': C.mapHeading },
      h('div', { class: 'wrap' },
        h('h2', { class: 'heading' }, withHearts(C.mapHeading)),
        h('div', { class: 'mapframe' }, mapBox),
        h('p', { class: 'foot-line' }, withHearts(C.mapFooter)),
        h('p', { class: 'closing' }, withHearts(C.mapClosing))));
  }
  function useSprite(src, cb) { const img = new Image(); img.alt = ''; img.decoding = 'async'; img.onload = () => cb(img); img.src = src; }
  function measure() {
    routeLen = routePath.getTotalLength();
    const targets = [...STOP_PTS.slice(0, D.stops.length), [BALLOON[0], 890]];
    let from = 0;
    stopLens = targets.map(([tx, ty]) => {
      let best = from, bd = 1e9;
      for (let l = from; l <= routeLen; l += 2) { const p = routePath.getPointAtLength(l), d = Math.hypot(p.x - tx, p.y - ty); if (d < bd) { bd = d; best = l; } if (bd < 1 && d > 30) break; }
      from = best; return best;
    });
  }
  let lastX = null;
  function placeCar(l) {
    const p = routePath.getPointAtLength(Math.max(0, Math.min(routeLen, l)));
    if (lastX !== null && Math.abs(p.x - lastX) > .05) carEl.classList.toggle('left', p.x < lastX);
    lastX = p.x;
    carEl.style.left = (p.x / W) * 100 + '%'; carEl.style.top = (p.y / H) * 100 + '%';
    routeDone.setAttribute('stroke-dasharray', `${l} 99999`);
    return p;
  }
  function carIndex() { return LS.get('carAt', 0); } // 0 = start, k = stop k, stops+1 = balloon
  const lenFor = (k) => (k <= 0 ? 0 : stopLens[k - 1]);
  function drive(toK, done) {
    const from = lenFor(carIndex()), to = lenFor(toK);
    LS.set('carAt', toK);
    if (to <= from || reduced) { carLen = to; placeCar(to); done && done(); return; }
    driving = true;
    const dist = to - from, dur = Math.min(4200, Math.max(1400, dist * 7)), t0 = performance.now();
    let lastTrail = 0;
    const tgt = toK <= D.stops.length ? stopEls[toK - 1] : balloonEl;
    tgt && tgt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      carLen = from + dist * e; const p = placeCar(carLen);
      if (now - lastTrail > 70 && k < .98) { lastTrail = now; trailHeart(p); }
      if (k < 1) requestAnimationFrame(step); else { driving = false; done && done(); }
    };
    requestAnimationFrame(step);
  }
  let trailN = 0;
  function trailHeart(p) {
    const el = h('span', { class: 'th', html: HEART, style: { '--c': (trailN++ % 2 ? (Math.random() < .5 ? '#a9d3f5' : '#2f5f9e') : (Math.random() < .5 ? '#f4cf5d' : '#f7dd8a')), left: (p.x / W) * 100 + '%', top: (p.y / H) * 100 + '%', '--s': rand(9, 16) + 'px', '--dx': rand(-22, 22) + 'px', '--r': rand(-40, 40) + 'deg' } });
    mapBox.append(el); setTimeout(() => el.remove(), 1650);
  }
  function refreshStops() {
    const u = unlocked(); const next = D.stops.findIndex((_, i) => !u.includes(i + 1));
    stopEls.forEach((el, i) => {
      const st = D.stops[i], on = u.includes(i + 1);
      el.classList.toggle('unlocked', on); el.classList.toggle('locked', !on); el.classList.toggle('next', i === next);
      el._t.replaceChildren(...withHearts(on ? st.title : st.lockedTitle));
      el.querySelector('.pin').setAttribute('aria-label', `${C.stopLabel} ${i + 1}: ${on ? st.title : st.lockedTitle}`);
    });
    balloonEl.classList.toggle('ready', next === -1);
  }
  function mapEnter() {
    requestAnimationFrame(() => { measure(); carLen = lenFor(carIndex()); placeCar(carLen); refreshStops(); });
  }
  function openStop(i) {
    if (driving) return;
    if (unlocked().includes(i + 1)) return openReveal(i, false);
    openCode('stop' + (i + 1), D.stops[i].codeHash, C.popupButton, C.popupTitle, C.popupMessage, (data) => {
      if (data && data.stop) Object.assign(D.stops[i], data.stop);
      const u = unlocked(); if (!u.includes(i + 1)) u.push(i + 1); LS.set('unlocked', u);
      refreshStops(); buzz(30);
      setTimeout(() => {
        const target = Math.max(carIndex(), i + 1);
        drive(target, () => { burstFrom(stopEls[i].querySelector('.pin'), 22, 110); setTimeout(() => openReveal(i, true), reduced ? 0 : 450); });
      }, reduced ? 0 : 900);
    });
  }
  function tapBalloon() {
    if (driving) return;
    const n = D.stops.length;
    if (unlocked().length < n) { balloonEl.animate && balloonEl.animate([{ transform: 'translate(-50%,-78%) rotate(0)' }, { transform: 'translate(-50%,-78%) rotate(-6deg)' }, { transform: 'translate(-50%,-78%) rotate(5deg)' }, { transform: 'translate(-50%,-78%) rotate(0)' }], { duration: 500 }); return; }
    drive(n + 1, () => setTimeout(openSky, reduced ? 0 : 300));
  }

  /* ---------- codes ---------- */
  async function sha256(s) {
    if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
    return '';
  }
  let REMOTE = false;
  async function CHECK(key, v, hash) {
    if (!REMOTE) return (await sha256(v)) === String(hash).toLowerCase() ? { ok: true } : {};
    const isLetter = key === 'letter';
    const body = isLetter ? { code: v } : { stopId: D.stops[+key.slice(4) - 1].id, code: v };
    const r = await fetch(isLetter ? '/api/letter' : '/api/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, credentials: 'same-origin', cache: 'no-store', body: JSON.stringify(body) });
    let data = null; try { data = await r.json(); } catch {}
    if (r.status === 200 && data && data.ok) return { ok: true, data };
    if (r.status === 429) return {}; // no lockout: treat as a wrong code
    if (r.status === 401) return {};
    return { error: true };
  }
  const norm = (s) => String(s || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\s+/g, '').toLowerCase();
  function openCode(key, code, btnText, title, msg, onOk, gold) {
    const input = h('input', { type: 'text', class: 'code-input', name: 'secret-code', inputmode: 'numeric', placeholder: C.popupPlaceholder, 'aria-label': C.popupPlaceholder, autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go', maxlength: '100' });
    const err = h('p', { class: 'err', 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn', type: 'submit' }, withHearts(btnText));
    let timer = null;
    const shake = () => { input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); buzz([20, 40, 20]); };
    const T = () => LS.get('tries:' + key, { n: 0, until: 0 });
    const cooldown = () => {
      clearTimeout(timer);
      // no lockout (Albndari's request): never disable the input, unlimited tries
      LS.set('tries:' + key, { n: 0, until: 0 });
      btn.disabled = false; input.disabled = false; err.textContent = '';
    };
    let busy = false;
    const form = h('form', { class: 'code-form', autocomplete: 'off', novalidate: true, onSubmit: async (e) => {
      e.preventDefault();
      if (busy) return;
      const v = norm(input.value);
      if (!v) { err.textContent = C.wrongCode; shake(); return; }
      busy = true; btn.disabled = true;
      let res;
      try { res = await CHECK(key, v, code); } catch { res = { error: true }; }
      busy = false; btn.disabled = false;
      if (res.ok) { LS.set('tries:' + key, { n: 0, until: 0 }); clearTimeout(timer); closeModal(); onOk(res.data); return; }
      if (res.error) { err.textContent = 'Connection hiccup — please try again ✦'; return; }
      err.textContent = C.wrongCode; shake(); input.select();
    } }, input, err, btn);
    openModal([h('div', { class: 'lockring', html: gold ? `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#14304f"/><path fill="#e6cf93" d="M50 18l7 22 23 1-18 14 6 23-18-13-18 13 6-23-18-14 23-1z"/></svg>` : SEAL(`<g transform="translate(34 27) scale(1)">${LOCK.replace('<svg viewBox="0 0 32 38">', '<svg width="32" height="38" viewBox="0 0 32 38">').replace(/id="lg"/, 'id="lg2"').replace(/url\(#lg\)/g, 'url(#lg2)')}</g>`, 'c') }), h('h2', null, withHearts(title)), h('p', { class: 'lead', text: msg }), form], title);
    cooldown();
    setTimeout(() => { if (!input.disabled) input.focus(); }, reduced ? 0 : 420);
  }
  function openReveal(i, fresh) {
    const d = D.stops[i];
    const safeUrl = typeof d.mapsUrl === 'string' && /^https:\/\//i.test(d.mapsUrl) ? d.mapsUrl : '';
    openModal([
      h('span', { class: 'r-emoji', 'aria-hidden': 'true', text: d.emoji || '✦' }),
      h('div', { class: 'r-kicker', text: `${C.stopLabel} ${pad(d.number || i + 1)}` }),
      h('h2', { class: 'r-title', dir: 'auto' }, withHearts(d.title)),
      d.activity ? h('span', { class: 'r-act', dir: 'auto', text: d.activity }) : null,
      d.description ? h('p', { class: 'r-desc', dir: 'auto', text: d.description }) : null,
      (d.departureNote || d.departureTime) ? h('div', { class: 'note' }, h('span', { class: 'note-k', text: '📌 Note' }), h('span', { class: 'note-t', dir: 'auto', text: d.departureNote || d.departureTime })) : null,
      isPlaylistStop(i) ? h('div', { class: 'pl-mini' }, h('p', { class: 'pl-mini-t', dir: 'rtl', text: PLAYLIST.text }), playlistCard()) : null,
      h('div', { class: 'r-actions' },
        safeUrl ? h('a', { class: 'btn', href: safeUrl, target: '_blank', rel: 'noopener noreferrer' }, withHearts(C.mapButton)) : h('button', { class: 'btn', type: 'button', disabled: true }, withHearts(C.mapButton)),
        h('button', { class: 'btn ghost', type: 'button', onClick: () => closeModal(), text: 'Back to the map' })),
    ], d.title);
    if (fresh) setTimeout(() => burst(innerWidth / 2, innerHeight * .3, 30, 170), 120);
  }

  /* ---------- stop 1: the playlist page (اسمع عبال توصلني) ---------- */
  const PLAYLIST = Object.assign({}, PLAYLIST_DEFAULT, (C && C.playlist) || {});
  const PLAY_ICON = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13l10.5-6.5z"/></svg>';
  const isPlaylistStop = (i) => { const s = D.stops[i]; if (!s) return false; const key = s.id != null ? s.id : (s.number != null ? s.number : i + 1); return String(key) === String(PLAYLIST.stopId); };
  function playlistCard() {
    return h('a', { class: 'pl-card', href: PLAYLIST.url, target: '_blank', rel: 'noopener noreferrer', onClick: () => pauseMusic() },
      h('span', { class: 'pl-art', 'aria-hidden': 'true' }, h('span', { class: 'pl-vinyl' }), h('span', { class: 'pl-play', html: PLAY_ICON })),
      h('span', { class: 'pl-txt' }, h('b', { text: PLAYLIST.label }), h('small', { text: PLAYLIST.cta + ' ↗' })));
  }

  /* ---------- the sky, the balloon, the star ---------- */
  let skyEl = null;
  function openSky() {
    if (skyEl) return;
    const stars = h('div', { class: 'stars' });
    for (let i = 0; i < 46; i++) stars.append(h('i', { style: { left: rand(0, 100) + '%', top: rand(0, 62) + '%', '--d': rand(1.6, 4) + 's', '--dl': -rand(0, 4) + 's', width: rand(1, 3) + 'px', height: '' } }));
    // v2 ending: the car pulls up, the two of them walk hand in hand to the empty basket, step in together, and the balloon lifts off
    const balEmpty = h('div', { class: 'bal-empty', html: balloonSvg(false) });
    const balFull = h('div', { class: 'bal-full', html: balloonSvg(true) });
    const bal = h('div', { class: 'bal' }, balEmpty, balFull);
    useSprite(ASSET.balloonEmpty, (img) => { balEmpty.replaceChildren(img); bal.classList.add('sprite'); });
    useSprite(ASSET.balloon, (img) => { balFull.replaceChildren(img); bal.classList.add('sprite'); });
    const pcar = h('div', { class: 'pcar' }, h('div', { class: 'pcar-in', html: CAR_SVG }));
    useSprite(ASSET.car, (img) => { pcar.firstChild.replaceChildren(img); pcar.classList.add('sprite'); });
    const walker = h('div', { class: 'walker', 'aria-hidden': 'true' });
    useSprite(ASSET.walk, (img) => { walker.append(img); });
    const star = h('button', { class: 'star', type: 'button', 'aria-label': C.letterPopupTitle, html: '<svg viewBox="-50 -50 100 100"><defs><radialGradient id="sg"><stop offset="0" stop-color="#fffbe9"/><stop offset=".6" stop-color="#f3dc9a"/><stop offset="1" stop-color="#d9b25f"/></radialGradient></defs><path fill="url(#sg)" d="M0 -46 C5 -12 12 -5 46 0 C12 5 5 12 0 46 C-5 12 -12 5 -46 0 C-12 -5 -5 -12 0 -46Z"/><circle r="7" fill="#fff"/></svg>', onClick: (e) => { buzz(15); burstFrom(e.currentTarget, 16, 90); openLetterGate(); } });
    skyEl = h('div', { class: 'sky', role: 'dialog', 'aria-label': C.letterPopupTitle }, stars, h('div', { class: 'ground' }), pcar, bal, walker, star,
      h('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '×', onClick: closeSky }));
    document.body.append(skyEl); document.body.classList.add('modal-open');
    const sky = skyEl, later = (ms, fn) => setTimeout(() => { if (skyEl === sky) fn(); }, ms);
    if (reduced) { balFull.style.opacity = '1'; sky.classList.add('in', 'parked', 'up', 'star-on'); return; }
    const T = { arrive: 250, walk: 1750, walkDur: 3000, stepIn: 4800, up: 5700, star: 9300 };
    later(T.arrive, () => sky.classList.add('in', 'parked'));
    later(T.walk, () => {
      // they step out of the car (the car shows empty), then walk hand in hand with a gentle bob
      if (ASSET.carEmpty) useSprite(ASSET.carEmpty, (img) => { pcar.firstChild.replaceChildren(img); });
      const sw = sky.clientWidth, cr = pcar.getBoundingClientRect(), br = bal.getBoundingClientRect(), wr = walker.getBoundingClientRect();
      const x0 = cr.left + cr.width * .45, x1 = br.left + br.width / 2 - wr.width - 6, x2 = br.left + br.width / 2 - wr.width / 2;
      walker.style.left = x0 + 'px'; walker.classList.add('on');
      walker.animate([{ transform: 'translateX(0)', opacity: 0 }, { opacity: 1, offset: .12 }, { transform: `translateX(${Math.max(20, x1 - x0)}px)`, opacity: 1 }], { duration: T.walkDur, easing: 'cubic-bezier(.35,.1,.6,1)', fill: 'forwards' });
      later(T.stepIn - T.walk, () => {
        walker.classList.add('stop');
        walker.animate([{ transform: `translateX(${Math.max(20, x1 - x0)}px)`, opacity: 1 }, { transform: `translate(${x2 - x0}px, -26px) scale(.82)`, opacity: 0 }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
        later(250, () => { balFull.style.opacity = '1'; });
      });
    });
    later(T.up, () => sky.classList.add('up'));
    later(T.star, () => sky.classList.add('star-on'));
  }
  function closeSky() { if (!skyEl) return; skyEl.remove(); skyEl = null; document.body.classList.remove('modal-open'); }
  function openLetterGate() {
    if (LS.get('letter', false) && D.letter) return openLetter(false);
    openCode('letter', D.FINAL_CODE_HASH, C.letterPopupButton, C.letterPopupTitle, C.letterPopupMessage, (data) => { if (data && data.letter) D.letter = data.letter; LS.set('letter', true); setTimeout(() => openLetter(true), reduced ? 0 : 260); }, true);
  }
  function openLetter(fresh) {
    const L = D.letter;
    const dlg = openModal([
      h('div', { class: 'letter' },
        h('h2', { class: 'letter-title' }, withHearts(L.title)),
        L.subtitle ? h('p', { class: 'letter-sub', text: L.subtitle }) : null,
        h('div', { class: 'orn', html: '<i></i>' + '<svg viewBox="0 0 24 24">' + HEART.slice(HEART.indexOf('<path')) + '<i></i>' }),
        h('div', { class: 'letter-body' }, L.paragraphs.map((t) => h('p', { dir: 'auto', class: /^[A-Za-z]/.test(t.trim()) ? 'en' : '' }, withHearts(t)))),
        h('p', { class: 'letter-date', text: L.date }),
        h('p', { class: 'letter-sign', dir: 'auto' }, withHearts(L.signoff))),
      h('div', { class: 'r-actions' }, h('button', { class: 'btn ghost', type: 'button', onClick: () => closeModal(), text: 'Back to the map' })),
    ], L.title);
    dlg.classList.add('letter-dialog');
    if (fresh) setTimeout(() => burst(innerWidth / 2, innerHeight * .25, 40, 200), 150);
  }

  /* ---------- modal ---------- */
  let modalEl = null, lastFocus = null;
  function openModal(kids, label) {
    closeModal(true); lastFocus = document.activeElement;
    const dlg = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': label }, h('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '×', onClick: () => closeModal() }), kids);
    modalEl = h('div', { class: 'overlay', onClick: (e) => { if (e.target === modalEl) closeModal(); } }, dlg);
    document.body.append(modalEl); document.body.classList.add('modal-open');
    return dlg;
  }
  function closeModal(instant) {
    if (!modalEl) return; const el = modalEl; modalEl = null;
    if (!skyEl) document.body.classList.remove('modal-open');
    if (instant || reduced) el.remove(); else { el.classList.add('out'); setTimeout(() => el.remove(), 220); }
    if (!instant && lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch {}
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (modalEl) closeModal(); else closeSky(); } });

  /* ---------- start / restart ---------- */
  function build() {
    const app = document.getElementById('app'); app.replaceChildren();
    pages.invite = buildInvite(); pages.rules = buildRules(); pages.map = buildMap();
    Object.values(pages).forEach((p) => app.append(p));
  }
  async function restart() {
    closeModal(true); closeSky();
    if (REMOTE) { try { await fetch('/api/restart', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, credentials: 'same-origin', body: '{}' }); } catch {} LS.set('accepted', false); LS.set('unlocked', []); LS.set('carAt', 0); LS.set('letter', false); location.replace(location.pathname + '#/invite'); location.reload(); return; }
    LS.set('accepted', false);
    if (D.resetStopsOnBack) { LS.set('unlocked', []); LS.set('carAt', 0); LS.set('letter', false); }
    build(); shown = null;
    history.replaceState({ i: curIdx }, '', '#/invite'); show('invite');
  }
  document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" class="sr" aria-hidden="true"><filter id="ink" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/><feGaussianBlur stdDeviation=".35" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></svg>');
  /* ---------- music: «River Flows in You» is the file audio/music.mp3 (MUSIC_YT_ID = ''); YouTube only if an ID is set ---------- */
  let audio = null, muted = LS.get('muted', false), isWav = false;
  let yt = null, ytReady = false, ytFailed = false, wantPlay = false, useFallback = false, pausedByUser = false, startedAt = 0;
  let ytVol = 0, fadeT = null, watchT = null, cueT = null;
  const NOTE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.4" fill="currentColor"/><circle cx="17" cy="16" r="2.4" fill="currentColor"/></svg>';
  const NOTE_OFF = NOTE_ON.replace('</svg>', '<path d="M3 3l18 18"/></svg>');
  const muteBtn = h('button', { class: 'mute', type: 'button', hidden: true, 'aria-label': 'Music', onClick: () => {
    if (Date.now() - startedAt < 900) return; // this same tap just started the music: don't mute it straight away
    muted = !muted; LS.set('muted', muted); applyMute();
    if (!muted) { pausedByUser = false; startMusic(); }
    paintMute();
  } });
  const cue = h('div', { class: 'music-cue', hidden: true, 'aria-hidden': 'true', text: 'tap anywhere for music ♪' });
  const paintMute = () => { muteBtn.innerHTML = muted ? NOTE_OFF : NOTE_ON; muteBtn.classList.toggle('off', muted); muteBtn.setAttribute('aria-pressed', String(!muted)); };
  const showCue = () => { if (wantPlay || audible()) return; muteBtn.hidden = false; paintMute(); muteBtn.classList.add('cue'); cue.hidden = false; };
  const hideCue = () => { muteBtn.classList.remove('cue'); cue.hidden = true; };
  const ytState = () => { try { return yt && ytReady ? yt.getPlayerState() : null; } catch { return null; } };
  const ytMutedNow = () => { try { return yt.isMuted(); } catch { return true; } };
  function audible() {
    if (useFallback) return !!audio && !isWav && !audio.paused;
    return ytState() === 1 && (muted || !ytMutedNow());
  }
  function applyMute() {
    try { if (yt && ytReady) { if (muted) yt.mute(); else yt.unMute(); } } catch {}
    if (audio) audio.muted = muted;
  }
  function ytPlay() {
    try { if (muted) yt.mute(); else yt.unMute(); yt.setVolume(ytVol); yt.playVideo(); } catch { ytFail(); }
  }
  function fadeYT() {
    if (fadeT || ytVol >= 60) return;
    fadeT = setInterval(() => { ytVol = Math.min(60, ytVol + 3); try { yt.setVolume(ytVol); } catch {} if (ytVol >= 60) { clearInterval(fadeT); fadeT = null; } }, 120);
  }
  function onYTReady() {
    ytReady = true;
    try { yt.setVolume(0); } catch {}
    ytPlay(); // try to start right away (works where the browser allows sound before a tap)
    clearTimeout(cueT); cueT = setTimeout(() => { if (!audible()) showCue(); }, 2500);
  }
  function onYTState(e) {
    const s = e && e.data;
    if (s === 0) { try { yt.seekTo(0, true); yt.playVideo(); } catch {} return; } // loop
    if (s !== 1) return;
    if (pausedByUser) { try { yt.pauseVideo(); } catch {} return; }
    if (!muted && ytMutedNow()) { showCue(); return; } // the browser only let it play silently: wait for the first tap
    if (!wantPlay) { wantPlay = true; muteBtn.hidden = false; paintMute(); }
    hideCue();
    if (useFallback) { useFallback = false; try { if (audio) audio.pause(); } catch {} } // YouTube caught up: drop the backup
    fadeYT();
  }
  function ytFail() {
    if (ytFailed) return;
    ytFailed = true;
    if (wantPlay && !audible()) fallback(); else if (!wantPlay) showCue();
  }
  function loadYT() {
    if (!MUSIC_YT_ID) { fileMusic(); return; }
    const box = h('div', { class: 'yt-box', 'aria-hidden': 'true' });
    const ifr = document.createElement('iframe');
    ifr.id = 'yt-music'; ifr.title = 'Background music'; ifr.tabIndex = -1;
    ifr.setAttribute('allow', 'autoplay; encrypted-media');
    ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    ifr.src = 'https://www.youtube.com/embed/' + MUSIC_YT_ID + '?enablejsapi=1&playsinline=1&controls=0&disablekb=1&fs=0&rel=0&iv_load_policy=3&loop=1&playlist=' + MUSIC_YT_ID + '&origin=' + encodeURIComponent(location.origin);
    box.append(ifr); document.body.append(box);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { if (prev) prev(); } catch {}
      try { yt = new YT.Player(ifr, { events: { onReady: onYTReady, onStateChange: onYTState, onError: ytFail } }); } catch { ytFail(); }
    };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; s.onerror = ytFail;
    document.head.append(s);
    setTimeout(() => { if (!ytReady) ytFail(); }, 15000); // never loaded (offline, blocked…)
  }
  function fileMusic() { // the song is the file audio/music.mp3 itself (no YouTube). Loaded as a blob (iPhone-safe even where the host sends no byte ranges); tries to play at once, else the first tap anywhere starts it
    ytFailed = true; useFallback = true;
    audio = new Audio(); audio.loop = true; audio.preload = 'auto'; audio.muted = muted;
    try { audio.volume = 0; } catch {}
    const wav = new Uint8Array(46); const dv = new DataView(wav.buffer); // a tiny silent clip, so a tap before the song has loaded still unlocks this player
    [[0, 0x52494646], [8, 0x57415645], [12, 0x666d7420], [36, 0x64617461]].forEach(([o, v]) => dv.setUint32(o, v));
    dv.setUint32(4, 38, true); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 16000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); dv.setUint32(40, 2, true);
    try { audio.src = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })); isWav = true; } catch {}
    audio.addEventListener('playing', () => {
      if (pausedByUser) { try { audio.pause(); } catch {} return; }
      if (isWav) return;
      if (!wantPlay) { wantPlay = true; muteBtn.hidden = false; paintMute(); }
      hideCue(); fadeAudio();
    });
    audio.addEventListener('ended', () => { if (isWav) return; try { audio.currentTime = 0; audio.play().catch(() => {}); } catch {} }); // loop, belt and braces
    const tryPlay = () => { try { const p = audio.play(); if (p && p.catch) p.catch(() => { clearTimeout(cueT); cueT = setTimeout(() => { if (!audible()) showCue(); }, 600); }); } catch {} };
    const useFile = (url) => { audio.src = url; isWav = false; audio.loop = true; audio.muted = muted; if (!pausedByUser) tryPlay(); };
    fetch(ASSET.music).then((r) => { if (!r.ok) throw new Error('music'); return r.blob(); })
      .then((b) => useFile(URL.createObjectURL(new Blob([b], { type: 'audio/mpeg' }))))
      .catch(() => useFile(ASSET.music));
  }
  let aFadeT = null;
  function fadeAudio() {
    if (aFadeT || !audio || audio.volume >= .6) return;
    aFadeT = setInterval(() => { let v = .6; try { v = Math.min(.6, audio.volume + .03); audio.volume = v; } catch {} if (v >= .6) { clearInterval(aFadeT); aFadeT = null; } }, 120);
  }
  function unlockAudio() { // inside a tap: wake a backup <audio> with a tiny silent clip so it can take over later
    if (!audio) {
      audio = new Audio(); audio.loop = true; audio.preload = 'auto'; audio.muted = muted;
      try { audio.volume = 0; } catch {}
      const wav = new Uint8Array(46); const dv = new DataView(wav.buffer);
      [[0, 0x52494646], [8, 0x57415645], [12, 0x666d7420], [36, 0x64617461]].forEach(([o, v]) => dv.setUint32(o, v));
      dv.setUint32(4, 38, true); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 16000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); dv.setUint32(40, 2, true);
      try { audio.src = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' })); isWav = true; } catch {}
    }
    if (isWav || useFallback) { try { audio.play().catch(() => {}); } catch {} }
  }
  let mp3P = null;
  function fallback() { // the old track, so there's never silence
    if (useFallback || pausedByUser || !ASSET.music) return;
    useFallback = true; hideCue();
    if (!audio) unlockAudio();
    if (!isWav) { audio.play().catch(() => {}); return; }
    mp3P = mp3P || fetch(ASSET.music).then((r) => { if (!r.ok) throw new Error('music'); return r.blob(); })
      .then((b) => { if (!useFallback) return; audio.src = URL.createObjectURL(new Blob([b], { type: 'audio/mpeg' })); isWav = false; audio.loop = true; audio.muted = muted; return audio.play(); })
      .then(() => { let v = 0; const t = setInterval(() => { v = Math.min(.6, v + .03); try { audio.volume = v; } catch {} if (v >= .6) clearInterval(t); }, 120); })
      .catch(() => {});
  }
  function startMusic() { // called from a tap (Accept, or the first touch anywhere)
    if (pausedByUser || audible()) return;
    if (!wantPlay) { wantPlay = true; startedAt = Date.now(); muteBtn.hidden = false; paintMute(); }
    hideCue();
    unlockAudio();
    if (useFallback) return;
    if (ytReady && !ytFailed) ytPlay(); else if (ytFailed) { fallback(); return; }
    if (!watchT) watchT = setTimeout(() => { watchT = null; if (!audible() && !pausedByUser) fallback(); }, 8000);
  }
  function pauseMusic() { // the playlist card was tapped: let YouTube's playlist play alone
    pausedByUser = true;
    try { if (yt && ytReady) yt.pauseVideo(); } catch {}
    try { if (audio && !audio.paused) audio.pause(); } catch {}
  }
  const firstTouch = () => { if (!pausedByUser && !audible()) startMusic(); };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, firstTouch, { capture: true, passive: true }));

  async function boot() {
    if (!D) {
      REMOTE = true;
      // fresh start on every load: ask the server to forget this visitor's unlocked stops first
      try { await fetch('/api/restart', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, credentials: 'same-origin', cache: 'no-store', body: '{}' }); } catch {}
      const r = await fetch('/api/site', { cache: 'no-store', credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' } });
      const s = await r.json();
      D = { content: s.content, checklist: s.checklist, letter: null, resetStopsOnBack: true,
        stops: s.stops.map((x) => ({ id: x.id, number: x.number, lockedTitle: x.lockedTitle, ...(x.unlocked && x.detail ? x.detail : { title: '' }) })) };
      LS.set('unlocked', []); LS.set('carAt', 0); LS.set('letter', false); // every stop starts locked
    }
    C = D.content;
    document.title = C.siteTitle;
    document.body.append(muteBtn, cue);
    loadYT(); // the YouTube player loads with the page
    build();
    curIdx = 0;
    history.replaceState({ i: 0 }, '', location.pathname + location.search + '#/invite'); // ignore any old hash
    show('invite');
  }
  boot().catch(() => { document.getElementById('app').append(h('div', { class: 'wrap', style: { padding: '80px 20px' } }, h('p', { text: 'Something went wrong — please try again ✦' }), h('button', { class: 'btn', type: 'button', onClick: () => location.reload(), text: 'Retry' }))); });
  window.__dtr = { openSky, go, show, pauseMusic, music: () => ({ id: MUSIC_YT_ID, ytReady, ytFailed, ytState: ytState(), ytMuted: yt && ytReady ? ytMutedNow() : null, ytVol, t: (() => { try { return yt.getCurrentTime(); } catch { return null; } })(), wantPlay, useFallback, audible: audible(), muted, cue: !cue.hidden, backup: audio && { wav: isWav, paused: audio.paused, muted: audio.muted, t: audio.currentTime } }) };
})();
