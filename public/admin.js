(() => {
  'use strict';
  const root = document.getElementById('root');
  const toastEl = document.getElementById('toast');

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return el;
  }
  let toastT;
  function toast(msg, ok = true) {
    toastEl.textContent = msg;
    toastEl.className = 'show' + (ok ? '' : ' bad');
    clearTimeout(toastT);
    toastT = setTimeout(() => (toastEl.className = ''), ok ? 2200 : 5000);
  }
  async function api(path, method = 'GET', body) {
    try {
      const r = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, body: body ? JSON.stringify(body) : undefined });
      let data = null; try { data = await r.json(); } catch {}
      return { status: r.status, data: data || {} };
    } catch { return { status: 0, data: { error: 'تعذّر الاتصال بالخادم' } }; }
  }
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const fmt = (t) => new Date(t).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });

  let S = null;      // last server state
  let M = null;      // editable model
  let tab = 'content';

  /* ---------------- login ---------------- */
  function loginView(msg) {
    const pw = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'كلمة مرور الإدارة', 'aria-label': 'كلمة مرور الإدارة', dir: 'ltr' });
    const err = h('p', { class: 'err', text: msg || '' });
    const btn = h('button', { class: 'b', type: 'submit', text: 'دخول' });
    root.replaceChildren(h('div', { class: 'login' },
      h('h1', { text: 'لوحة الإدارة ✦' }), h('p', { class: 'hint', text: 'A Day to Remember' }),
      h('form', { onSubmit: async (e) => {
        e.preventDefault(); btn.disabled = true; err.textContent = '';
        const r = await api('/api/admin/login', 'POST', { password: pw.value });
        if (r.status === 200) return load();
        err.textContent = r.data.error || 'تعذّر الدخول'; btn.disabled = false;
      } }, pw, err, btn)));
    pw.focus();
  }

  async function load() {
    const r = await api('/api/admin/state');
    if (r.status === 401) return loginView();
    if (r.status !== 200) return loginView(r.data.error);
    S = r.data.state; M = clone(S);
    M.stops.forEach((s) => (s.newCode = ''));
    render();
  }

  /* ---------------- shell ---------------- */
  const TABS = [['content', 'النصوص'], ['checklist', 'القواعد (القائمة)'], ['stops', 'المحطات'], ['theme', 'المظهر'], ['progress', 'التقدّم'], ['security', 'الأمان']];
  function render() {
    const panel = h('div', { class: 'panel' });
    ({ content: paneContent, checklist: paneChecklist, stops: paneStops, theme: paneTheme, progress: paneProgress, security: paneSecurity })[tab](panel);
    root.replaceChildren(h('div', { class: 'wrap' },
      h('header', { class: 'top' },
        h('h1', { text: 'لوحة الإدارة ✦' }),
        h('div', { class: 'row' },
          h('a', { class: 'b alt sm', href: '/', target: '_blank', rel: 'noopener', style: 'text-decoration:none;display:inline-block', text: 'معاينة الموقع كضيف' }),
          h('button', { class: 'b alt sm', type: 'button', text: 'خروج', onClick: async () => { await api('/api/admin/logout', 'POST'); loginView(); } }))),
      h('nav', { class: 'tabs' }, TABS.map(([k, t]) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), type: 'button', text: t, onClick: () => { tab = k; render(); } }))),
      panel));
  }

  function field(label, input, hint) { return h('label', { class: 'f' }, label, hint ? h('small', { text: ' — ' + hint }) : null, input); }
  function txt(obj, key, opts = {}) {
    const el = opts.area ? h('textarea', { dir: 'auto' }) : h('input', { type: 'text', dir: 'auto' });
    el.value = obj[key] ?? '';
    if (opts.rows) el.rows = opts.rows;
    el.addEventListener('input', () => (obj[key] = el.value));
    return el;
  }
  async function save(btn, path, body, sliceKeys) {
    btn.disabled = true;
    const r = await api(path, 'PUT', body);
    btn.disabled = false;
    if (r.status === 401) return loginView('انتهت الجلسة، سجّل الدخول من جديد');
    if (r.status !== 200 || !r.data.ok) return toast(r.data.error || 'فشل الحفظ', false);
    S = r.data.state;
    for (const k of sliceKeys) M[k] = clone(S[k]);
    if (sliceKeys.includes('stops')) M.stops.forEach((s) => (s.newCode = ''));
    toast('تم الحفظ ✦');
    render();
  }
  const saveBar = (label, onClick) => { const b = h('button', { class: 'b', type: 'button', text: label }); b.addEventListener('click', () => onClick(b)); return h('div', { class: 'savebar' }, h('span', { class: 'hint', text: 'التغييرات تُحفظ في قاعدة البيانات وتظهر للزوّار فورًا.' }), b); };

  /* ---------------- panes ---------------- */
  function paneContent(p) {
    const C = M.content;
    const groups = [
      ['صفحة الدعوة', [['siteTitle', 'عنوان الموقع'], ['date', 'التاريخ'], ['inviteMessage', 'نص الدعوة', 'فقرات تفصلها سطر فارغ', true], ['inviteTagline', 'الجملة تحت النص'], ['inviteButton', 'زر القبول']]],
      ['صفحة القواعد', [['rulesHeading', 'العنوان'], ['rulesSubtitle', 'العنوان الفرعي'], ['rulesIntro', 'النص التمهيدي'], ['rulesFooter', 'الجملة الأخيرة'], ['rulesButton', 'زر المتابعة']]],
      ['الخريطة والنافذة السرّية', [['mapHeading', 'عنوان الخريطة'], ['stopLabel', 'كلمة «Stop»'], ['popupTitle', 'عنوان النافذة'], ['popupMessage', 'رسالة النافذة'], ['popupPlaceholder', 'نص خانة الرمز'], ['popupButton', 'زر الفتح'], ['wrongCode', 'رسالة الرمز الخاطئ'], ['tooManyTries', 'رسالة كثرة المحاولات'], ['mapButton', 'زر فتح الخريطة'], ['mapFooter', 'الجملة تحت الخريطة'], ['mapClosing', 'الجملة الختامية']]],
      ['النجمة الذهبية (الرسالة)', [['letterPopupTitle', 'عنوان نافذة كلمة السر'], ['letterPopupMessage', 'رسالة النافذة'], ['letterPopupButton', 'زر فتح الرسالة']]],
    ];
    p.append(h('h2', { text: 'نصوص الموقع' }), h('p', { class: 'hint', text: 'كل النصوص قابلة للتعديل. الموقع يرفض تلقائيًا الكلمات التي تكشف سبب المفاجأة.' }));
    groups.forEach(([g, fs]) => { p.append(h('h3', { text: g })); fs.forEach(([k, l, hint, area]) => p.append(field(l, txt(C, k, { area, rows: area ? 9 : 0 }), hint))); });
    p.append(saveBar('حفظ النصوص', (b) => save(b, '/api/admin/content', { content: C }, ['content'])));
  }

  function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; render(); }

  function paneChecklist(p) {
    const L = M.checklist;
    p.append(h('h2', { text: 'قواعد اليوم (القائمة التفاعلية)' }), h('p', { class: 'hint', text: 'الترقيم 01، 02… يتحدّث تلقائيًا حسب الترتيب. زر «القائمة» لا يُفعَّل إلا بعد تأشير كل البنود.' }));
    L.forEach((it, i) => {
      p.append(h('div', { class: 'box' },
        h('div', { class: 'itemhead' }, h('b', { text: 'البند ' + String(i + 1).padStart(2, '0') }),
          h('div', { class: 'row' },
            h('button', { class: 'b alt sm', type: 'button', text: '↑', 'aria-label': 'للأعلى', onClick: () => move(L, i, -1) }),
            h('button', { class: 'b alt sm', type: 'button', text: '↓', 'aria-label': 'للأسفل', onClick: () => move(L, i, 1) }),
            h('button', { class: 'b danger sm', type: 'button', text: 'حذف', onClick: () => { if (confirm('حذف هذا البند؟')) { L.splice(i, 1); render(); } } }))),
        field('العنوان', txt(it, 'title')), field('النص', txt(it, 'body', { area: true, rows: 3 }))));
    });
    p.append(h('button', { class: 'b alt', type: 'button', text: '+ إضافة بند', onClick: () => { L.push({ title: '', body: '' }); render(); } }));
    p.append(saveBar('حفظ القواعد', (b) => save(b, '/api/admin/checklist', { items: L.map(({ title, body }) => ({ title, body })) }, ['checklist'])));
  }

  const chip = (ok, yes, no) => h('span', { class: 'chip ' + (ok ? 'ok' : 'bad'), text: ok ? yes : no });
  function showToggle(s) {
    const cb = h('input', { type: 'checkbox' }); cb.checked = !!s.showActivity;
    cb.addEventListener('change', () => (s.showActivity = cb.checked));
    return h('label', { class: 'f' }, h('div', { class: 'row' }, cb, h('span', { text: 'إظهار اسم النشاط والإيموجي للزائر بعد فتح المحطة (الوضع الافتراضي: مخفي)' })));
  }
  function paneStops(p) {
    const T = M.stops;
    p.append(h('h2', { text: 'محطات الرحلة' }), h('p', { class: 'hint', text: 'لا تظهر للزائر أي تفاصيل (الاسم، الرابط، وقت المغادرة…) إلا بعد إدخال رمز المحطة الصحيح. الرموز مخزّنة مشفّرة ولا يمكن عرضها — لتغيير رمز اكتب رمزًا جديدًا. المحطة بدون رمز تكون مفتوحة للجميع من البداية.' }));

    p.append(h('h3', { text: 'ملخّص الإعداد' }), h('table', null,
      h('thead', null, h('tr', null, ['#', 'المحطة', 'الرمز', 'رابط الخريطة', 'وقت المغادرة'].map((t) => h('th', { text: t })))),
      h('tbody', null, T.map((s, i) => {
        const hasCode = s.codeSet || (s.newCode || '').trim();
        return h('tr', null, h('td', { text: i + 1 }), h('td', { dir: 'auto', text: s.activity || s.lockedTitle }), h('td', null, hasCode ? chip(true, '✓ معيّن', '') : chip(true, 'مفتوحة للجميع', '')), h('td', null, chip(!!s.mapsUrl, '✓ موجود', '✗ ناقص')), h('td', null, s.departureTime ? chip(true, s.departureTime, '') : chip(false, '', 'بدون')));
      }))));

    p.append(h('h3', { text: 'تعديل المحطات' }));
    T.forEach((s, i) => {
      p.append(h('div', { class: 'box' },
        h('div', { class: 'itemhead' }, h('b', { text: 'المحطة ' + String(i + 1).padStart(2, '0') }),
          h('div', { class: 'row' },
            h('button', { class: 'b alt sm', type: 'button', text: '↑', 'aria-label': 'للأعلى', onClick: () => move(T, i, -1) }),
            h('button', { class: 'b alt sm', type: 'button', text: '↓', 'aria-label': 'للأسفل', onClick: () => move(T, i, 1) }),
            h('button', { class: 'b danger sm', type: 'button', text: 'حذف', onClick: () => { if (confirm('حذف هذه المحطة نهائيًا؟')) { T.splice(i, 1); render(); } } }))),
        h('div', { class: 'grid2' },
          field('العنوان قبل الفتح (يراه الجميع)', txt(s, 'lockedTitle')),
          field('العنوان بعد الفتح', txt(s, 'unlockedTitle'))),
        h('div', { class: 'grid2' }, field('النشاط / اسم المكان', txt(s, 'activity'), 'للإدارة فقط'), field('إيموجي', txt(s, 'emoji'))),
        showToggle(s),
        field('الوصف', txt(s, 'description', { area: true, rows: 2 }), 'اختياري'),
        field('رابط Google Maps', Object.assign(txt(s, 'mapsUrl'), { dir: 'ltr' }), 'https://…'),
        h('div', { class: 'grid2' }, field('وقت المغادرة', txt(s, 'departureTime'), 'مثال: 4:45 PM'), field('ملاحظة المغادرة', txt(s, 'departureNote'))),
        field('الرمز السري ' + (s.codeSet ? '(معيّن ✓ — اكتب رمزًا جديدًا فقط لتغييره)' : '(غير معيّن)'), Object.assign(txt(s, 'newCode'), { placeholder: s.codeSet ? 'اتركه فارغًا للإبقاء على الرمز الحالي' : 'اكتب الرمز السري', dir: 'ltr', autocomplete: 'off' }), 'يُفضَّل 6 أحرف فأكثر، ولا يتكرر بين المحطات')));
    });
    if (T.length < 12) p.append(h('button', { class: 'b alt', type: 'button', text: '+ إضافة محطة', onClick: () => { T.push({ id: null, lockedTitle: 'A New Secret ✦', unlockedTitle: '', emoji: '', activity: '', showActivity: false, description: '', mapsUrl: '', departureTime: '', departureNote: '', codeSet: false, newCode: '' }); render(); } }));
    p.append(saveBar('حفظ المحطات', (b) => save(b, '/api/admin/stops', { stops: T.map((s) => ({ id: s.id, lockedTitle: s.lockedTitle, unlockedTitle: s.unlockedTitle, emoji: s.emoji, activity: s.activity, showActivity: !!s.showActivity, description: s.description, mapsUrl: s.mapsUrl, departureTime: s.departureTime, departureNote: s.departureNote, newCode: s.newCode })) }, ['stops'])));
  }

  const THEME_FIELDS = [['bg', 'خلفية الصفحة (سماوي فاتح)'], ['bg2', 'تدرّج الخلفية (أصفر فاتح)'], ['card', 'لون البطاقات'], ['blush', 'سماوي هادئ'], ['rose', 'سماوي أساسي'], ['deep', 'أزرق داكن (العناوين والأزرار)'], ['ink', 'لون النص'], ['sun', 'أصفر النجوم والزينة']];
  const THEME_DEFAULT = { bg: '#f1f8fc', bg2: '#fff4cc', card: '#fffefa', blush: '#d4ebf8', rose: '#4a9fcb', deep: '#1c6490', ink: '#1f3b4d', sun: '#efb62b', hearts: true, heartCount: 14 };
  function paneTheme(p) {
    const T = M.theme;
    p.append(h('h2', { text: 'الألوان والمظهر' }));
    const prev = h('div', { class: 'preview' }, h('div', { style: 'font-size:26px;font-weight:700', text: 'A Day to Remember ✦' }), h('div', { class: 'pb', text: 'Accept My Invitation ✦' }));
    const paint = () => { prev.style.background = `linear-gradient(180deg, ${T.bg}, ${T.bg2})`; prev.style.color = T.ink; prev.firstChild.style.color = T.deep; prev.lastChild.style.background = `linear-gradient(135deg, ${T.rose}, ${T.deep})`; };
    THEME_FIELDS.forEach(([k, l]) => {
      const inp = h('input', { type: 'color', value: T[k] });
      inp.addEventListener('input', () => { T[k] = inp.value; paint(); });
      p.append(h('label', { class: 'f' }, h('div', { class: 'row' }, inp, h('span', { text: l }))));
    });
    const hearts = h('input', { type: 'checkbox' }); hearts.checked = !!T.hearts; hearts.addEventListener('change', () => (T.hearts = hearts.checked));
    const cnt = h('input', { type: 'range', min: 0, max: 30, value: T.heartCount }); cnt.addEventListener('input', () => (T.heartCount = Number(cnt.value)));
    p.append(h('label', { class: 'f' }, h('div', { class: 'row' }, hearts, h('span', { text: 'إظهار النجوم المتحرّكة في الخلفية' }))), h('label', { class: 'f' }, 'عدد النجوم', cnt), prev);
    paint();
    p.append(h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'b alt sm', type: 'button', text: 'استعادة الألوان الأصلية', onClick: () => { M.theme = clone(THEME_DEFAULT); render(); } })));
    p.append(saveBar('حفظ المظهر', (b) => save(b, '/api/admin/theme', { theme: T }, ['theme'])));
  }

  async function doReset(scope, extra, msg) {
    if (!confirm(msg)) return;
    const r = await api('/api/admin/reset', 'POST', { scope, ...extra });
    if (r.status !== 200) return toast(r.data.error || 'فشل', false);
    S = r.data.state; M.visitors = S.visitors; M.epoch = S.epoch;
    toast('تمت إعادة الضبط ✦'); render();
  }
  function paneProgress(p) {
    p.append(h('h2', { text: 'تقدّم الزوّار' }), h('p', { class: 'hint', text: 'المحطات المفتوحة تُحفظ على جهاز الزائر (كوكي) وفي الخادم. استخدم الأزرار هنا لتجربة الموقع من الصفر أو لإعادة ضبط الزائر.' }));
    p.append(h('div', { class: 'row' },
      h('button', { class: 'b alt', type: 'button', text: 'قفل كل المحطات للجميع', onClick: () => doReset('unlocks', {}, 'قفل كل المحطات لجميع الزوّار؟') }),
      h('button', { class: 'b alt', type: 'button', text: 'تصفير تقدّم القواعد (القائمة)', onClick: () => doReset('checklist', {}, 'سيُطلب من الجميع تأشير القواعد من جديد. متابعة؟') }),
      h('button', { class: 'b danger', type: 'button', text: 'إعادة ضبط كل شيء', onClick: () => doReset('everything', {}, 'قفل المحطات وتصفير القواعد للجميع (ابدأ من الصفر)؟') })));
    p.append(h('h3', { text: 'الزوّار (آخر 200)' }));
    const V = M.visitors || [];
    if (!V.length) return p.append(h('p', { class: 'hint', text: 'لا يوجد زوّار بعد.' }));
    p.append(h('table', null, h('thead', null, h('tr', null, ['الزائر', 'أول زيارة', 'آخر زيارة', 'المحطات المفتوحة', ''].map((t) => h('th', { text: t })))),
      h('tbody', null, V.map((v) => h('tr', null, h('td', { dir: 'ltr', text: v.short }), h('td', { text: fmt(v.created) }), h('td', { text: fmt(v.lastSeen) }), h('td', { text: v.unlocked.length + ' / ' + M.stops.length }),
        h('td', null, v.unlocked.length ? h('button', { class: 'b danger sm', type: 'button', text: 'قفل محطاته', onClick: () => doReset('visitor', { visitor: v.id }, 'قفل المحطات المفتوحة لهذا الزائر؟') }) : null))))));
  }

  function paneSecurity(p) {
    const cur = h('input', { type: 'password', autocomplete: 'current-password', dir: 'ltr' });
    const nw = h('input', { type: 'password', autocomplete: 'new-password', dir: 'ltr' });
    const btn = h('button', { class: 'b', type: 'button', text: 'تغيير كلمة المرور' });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const r = await api('/api/admin/password', 'POST', { current: cur.value, next: nw.value });
      btn.disabled = false;
      if (r.status === 200) { cur.value = ''; nw.value = ''; toast('تم تغيير كلمة المرور ✦'); } else toast(r.data.error || 'فشل', false);
    });
    p.append(h('h2', { text: 'الأمان' }), h('p', { class: 'hint', text: 'كلمة المرور مخزّنة بصيغة مشفّرة. بعد التغيير تُغلق الجلسات الأخرى. بعد 5 محاولات خاطئة يُقفل الدخول مؤقتًا.' }),
      field('كلمة المرور الحالية', cur), field('كلمة المرور الجديدة', nw, '10 أحرف على الأقل'), h('div', { style: 'margin-top:14px' }, btn));
  }

  load();
})();
