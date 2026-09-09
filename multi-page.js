(() => {
  const rawGet = Storage.prototype.getItem;
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  const realFetch = window.fetch.bind(window);

  const LEGACY_KEY = 'weeklyPayrollState';
  const PAGE_KEYS = {
    1: 'weeklyPayrollState_page1_v2',
    2: 'weeklyPayrollState_page2_v2'
  };
  const CLOUD_BOOK_KEY = 'weeklyPayrollCloudBook_v2';
  const BOOK_MARKER = '__weeklyPayrollPages';

  const params = new URLSearchParams(location.search);
  const activePage = params.get('page') === '2' ? 2 : 1;

  const legacyRaw = rawGet.call(localStorage, LEGACY_KEY);
  const page1Raw = rawGet.call(localStorage, PAGE_KEYS[1]);
  const page2Raw = rawGet.call(localStorage, PAGE_KEYS[2]);

  if (!page1Raw && legacyRaw) rawSet.call(localStorage, PAGE_KEYS[1], legacyRaw);
  if (!page2Raw && (page1Raw || legacyRaw)) rawSet.call(localStorage, PAGE_KEYS[2], page1Raw || legacyRaw);

  function safeParse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (e) {
      try { return JSON.parse(JSON.stringify(value)); }
      catch (err) { return value; }
    }
  }

  function localPageState(page) {
    return safeParse(rawGet.call(localStorage, PAGE_KEYS[page]));
  }

  function makeBook(base) {
    if (base && base[BOOK_MARKER] === 2 && base.pages) {
      return {
        [BOOK_MARKER]: 2,
        pages: {
          1: clone(base.pages[1] ?? base.pages['1'] ?? null),
          2: clone(base.pages[2] ?? base.pages['2'] ?? base.pages[1] ?? base.pages['1'] ?? null)
        }
      };
    }

    if (base && typeof base === 'object') {
      return {
        [BOOK_MARKER]: 2,
        pages: { 1: clone(base), 2: clone(base) }
      };
    }

    const p1 = localPageState(1);
    const p2 = localPageState(2);
    const fallback = p1 || p2 || safeParse(legacyRaw);
    return {
      [BOOK_MARKER]: 2,
      pages: {
        1: clone(p1 || fallback),
        2: clone(p2 || p1 || fallback)
      }
    };
  }

  function currentBook() {
    const saved = safeParse(rawGet.call(localStorage, CLOUD_BOOK_KEY));
    if (saved && saved[BOOK_MARKER] === 2 && saved.pages) {
      const book = makeBook(saved);
      const activeLocal = localPageState(activePage);
      if (activeLocal) book.pages[activePage] = clone(activeLocal);
      return book;
    }

    const p1 = localPageState(1);
    const p2 = localPageState(2);
    const fallback = p1 || p2 || safeParse(legacyRaw);
    return {
      [BOOK_MARKER]: 2,
      pages: {
        1: clone(p1 || fallback),
        2: clone(p2 || p1 || fallback)
      }
    };
  }

  Storage.prototype.getItem = function(key) {
    if (this === localStorage && key === LEGACY_KEY) {
      return rawGet.call(this, PAGE_KEYS[activePage]);
    }
    return rawGet.call(this, key);
  };

  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === LEGACY_KEY) {
      return rawSet.call(this, PAGE_KEYS[activePage], value);
    }
    return rawSet.call(this, key, value);
  };

  Storage.prototype.removeItem = function(key) {
    if (this === localStorage && key === LEGACY_KEY) {
      return rawRemove.call(this, PAGE_KEYS[activePage]);
    }
    return rawRemove.call(this, key);
  };

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : (input?.url || '');
    const isPayrollCloud = url.includes('/rest/v1/weekly_payroll_cloud');
    if (!isPayrollCloud) return realFetch(input, init);

    const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
    let nextInit = init;

    if (method === 'POST' && typeof init?.body === 'string') {
      try {
        const payload = JSON.parse(init.body);
        if (payload && payload.state) {
          const book = currentBook();
          book.pages[activePage] = clone(payload.state);
          payload.state = book;
          rawSet.call(localStorage, CLOUD_BOOK_KEY, JSON.stringify(book));
          nextInit = { ...init, body: JSON.stringify(payload) };
        }
      } catch (e) {}
    }

    const response = await realFetch(input, nextInit);

    if (method === 'GET' && response.ok) {
      try {
        const rows = await response.clone().json();
        if (Array.isArray(rows)) {
          if (rows.length && rows[0]?.state) {
            const book = makeBook(rows[0].state);
            rawSet.call(localStorage, CLOUD_BOOK_KEY, JSON.stringify(book));
            rows[0].state = clone(book.pages[activePage] || book.pages[1]);
          } else if (!rows.length) {
            rawSet.call(localStorage, CLOUD_BOOK_KEY, JSON.stringify(currentBook()));
          }

          const headers = new Headers(response.headers);
          headers.delete('content-length');
          headers.delete('content-encoding');
          headers.set('content-type', 'application/json');
          return new Response(JSON.stringify(rows), {
            status: response.status,
            statusText: response.statusText,
            headers
          });
        }
      } catch (e) {}
    }

    return response;
  };

  function injectPageNav() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.querySelector('#payrollPageNav')) return;

    const style = document.createElement('style');
    style.textContent = `
      .payroll-page-nav{display:flex;gap:8px;align-items:center;margin:-4px 0 12px;padding:6px;background:#e9edf2;border-radius:14px;width:max-content;max-width:100%}
      .payroll-page-nav button{border:0;background:transparent;color:var(--muted);font-weight:900;padding:9px 18px;border-radius:10px;min-width:94px}
      .payroll-page-nav button.active{background:#fff;color:var(--text);box-shadow:0 2px 8px rgba(16,24,40,.10)}
      @media(max-width:520px){.payroll-page-nav{width:100%;display:grid;grid-template-columns:1fr 1fr}.payroll-page-nav button{width:100%;min-width:0;padding:9px 10px}}
      @media print{.payroll-page-nav{display:none!important}}
    `;
    document.head.appendChild(style);

    const nav = document.createElement('div');
    nav.id = 'payrollPageNav';
    nav.className = 'payroll-page-nav';
    nav.setAttribute('role', 'tablist');
    nav.innerHTML = `
      <button type="button" data-page="1" class="${activePage === 1 ? 'active' : ''}" aria-selected="${activePage === 1}">Page 1</button>
      <button type="button" data-page="2" class="${activePage === 2 ? 'active' : ''}" aria-selected="${activePage === 2}">Page 2</button>
    `;
    topbar.insertAdjacentElement('afterend', nav);

    nav.addEventListener('click', event => {
      const button = event.target.closest('button[data-page]');
      if (!button) return;
      const page = button.dataset.page === '2' ? 2 : 1;
      if (page === activePage) return;
      const next = new URL(location.href);
      next.search = '';
      next.hash = '';
      next.searchParams.set('page', String(page));
      location.href = next.toString();
    });
  }

  injectPageNav();
})();
