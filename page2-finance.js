(() => {
  const params = new URLSearchParams(location.search);
  const activePage = params.get('page') === '2' ? 2 : 1;
  const isPage2 = activePage === 2;
  const realFetch = window.fetch.bind(window);

  const FINANCE_KEY = 'weeklyPayrollPage2Finance_v1';
  const PAGE2_STATE_KEY = 'weeklyPayrollState_page2_v2';
  const CLOUD_BOOK_KEY = 'weeklyPayrollCloudBook_v2';

  const $ = s => document.querySelector(s);
  const num = v => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, 1000000) : 0;
  };
  const money = n => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD'
  }).format(Number.isFinite(n) ? n : 0);

  function safeParse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function loadFinance() {
    const saved = safeParse(localStorage.getItem(FINANCE_KEY));
    return {
      franchiseFees: saved?.franchiseFees ?? '',
      monthlyRent: saved?.monthlyRent ?? '',
      history: saved?.history && typeof saved.history === 'object' ? saved.history : {}
    };
  }

  let finance = loadFinance();

  function saveFinance() {
    localStorage.setItem(FINANCE_KEY, JSON.stringify(finance));
  }

  function financeSnapshot() {
    return {
      franchiseFees: finance.franchiseFees ?? '',
      monthlyRent: finance.monthlyRent ?? '',
      history: finance.history || {}
    };
  }

  function mergeFinance(value) {
    if (!value || typeof value !== 'object') return;
    finance.franchiseFees = value.franchiseFees ?? finance.franchiseFees ?? '';
    finance.monthlyRent = value.monthlyRent ?? finance.monthlyRent ?? '';
    if (value.history && typeof value.history === 'object') {
      finance.history = { ...(finance.history || {}), ...value.history };
    }
    saveFinance();
    if (isPage2) {
      applyInputs();
      setTimeout(() => { recalc(); decorateHistory(); }, 0);
    }
  }

  function syncFinanceFromCloudBook() {
    const book = safeParse(localStorage.getItem(CLOUD_BOOK_KEY));
    const p2 = book?.pages?.[2] ?? book?.pages?.['2'];
    if (p2?.page2Finance) mergeFinance(p2.page2Finance);
  }

  function attachFinanceToLocalPage2() {
    const raw = localStorage.getItem(PAGE2_STATE_KEY);
    const state = safeParse(raw);
    if (!state || typeof state !== 'object') return;
    const next = { ...state, page2Finance: financeSnapshot() };
    localStorage.setItem(PAGE2_STATE_KEY, JSON.stringify(next));
  }

  // Keep Page 2 finance details inside the existing two-page cloud backup.
  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : (input?.url || '');
    const isPayrollCloud = url.includes('/rest/v1/weekly_payroll_cloud');
    if (!isPayrollCloud) return realFetch(input, init);

    const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
    let nextInit = init;

    if (method === 'POST' && typeof init?.body === 'string') {
      try {
        if (activePage === 1) attachFinanceToLocalPage2();
        const payload = JSON.parse(init.body);
        if (activePage === 2 && payload?.state && typeof payload.state === 'object') {
          payload.state = { ...payload.state, page2Finance: financeSnapshot() };
          nextInit = { ...init, body: JSON.stringify(payload) };
        }
      } catch (e) {}
    }

    const response = await realFetch(input, nextInit);

    if (method === 'GET' && response.ok) {
      // multi-page.js saves the complete cloud book locally before returning.
      setTimeout(syncFinanceFromCloudBook, 0);
    }

    return response;
  };

  if (!isPage2) {
    // Still preserve Page 2 finance data whenever Page 1 performs cloud sync.
    syncFinanceFromCloudBook();
    return;
  }

  function addUi() {
    const metrics = $('.store-metrics');
    if (!metrics || $('#franchiseFees')) return;

    const fragment = document.createDocumentFragment();

    const franchiseField = document.createElement('div');
    franchiseField.className = 'metric-field page2-extra';
    franchiseField.innerHTML = '<label for="franchiseFees">Franchise Fees</label><input id="franchiseFees" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" />';
    fragment.appendChild(franchiseField);

    const franchisePct = document.createElement('div');
    franchisePct.className = 'metric-result page2-extra';
    franchisePct.innerHTML = '<small>Franchise Fees % of Sales</small><strong id="franchisePct">0.00%</strong>';
    fragment.appendChild(franchisePct);

    const rentField = document.createElement('div');
    rentField.className = 'metric-field page2-extra';
    rentField.innerHTML = '<label for="monthlyRent">Monthly Rent</label><input id="monthlyRent" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" />';
    fragment.appendChild(rentField);

    const weeklyRent = document.createElement('div');
    weeklyRent.className = 'metric-result page2-extra';
    weeklyRent.innerHTML = '<small>Weekly Rent (Monthly ÷ 4)</small><strong id="weeklyRent">$0.00</strong>';
    fragment.appendChild(weeklyRent);

    const rentPct = document.createElement('div');
    rentPct.className = 'metric-result page2-extra';
    rentPct.innerHTML = '<small>Rent % of Sales</small><strong id="rentPct">0.00%</strong>';
    fragment.appendChild(rentPct);

    metrics.appendChild(fragment);

    const totalLabel = $('#totalCostPct')?.closest('.metric-result')?.querySelector('small');
    if (totalLabel) totalLabel.textContent = 'Total % (Supplies + Payroll + Franchise + Rent)';

    const note = $('.note');
    if (note && !note.dataset.page2FinanceNote) {
      note.dataset.page2FinanceNote = '1';
      note.textContent += ' On Page 2, weekly rent is monthly rent divided by 4. Franchise fees and weekly rent are included in Total % and Total Cash Remaining.';
    }

    $('#franchiseFees').addEventListener('input', () => {
      finance.franchiseFees = $('#franchiseFees').value;
      saveFinance();
      setTimeout(recalc, 0);
    });
    $('#monthlyRent').addEventListener('input', () => {
      finance.monthlyRent = $('#monthlyRent').value;
      saveFinance();
      setTimeout(recalc, 0);
    });
    $('#franchiseFees').addEventListener('change', () => setTimeout(recalc, 0));
    $('#monthlyRent').addEventListener('change', () => setTimeout(recalc, 0));

    applyInputs();
  }

  function applyInputs() {
    if ($('#franchiseFees')) $('#franchiseFees').value = finance.franchiseFees ?? '';
    if ($('#monthlyRent')) $('#monthlyRent').value = finance.monthlyRent ?? '';
  }

  function recalc() {
    if (!isPage2 || !$('#franchiseFees')) return;

    const sales = num($('#totalSales')?.value);
    const supplies = num($('#supplies')?.value);
    const grossText = ($('#grossTotal')?.textContent || '').replace(/[^0-9.-]/g, '');
    const gross = num(grossText);
    const franchiseFees = num(finance.franchiseFees);
    const monthlyRent = num(finance.monthlyRent);
    const weeklyRent = monthlyRent / 4;

    const franchisePct = sales > 0 ? (franchiseFees / sales) * 100 : 0;
    const rentPct = sales > 0 ? (weeklyRent / sales) * 100 : 0;
    const totalCost = supplies + gross + franchiseFees + weeklyRent;
    const totalPct = sales > 0 ? (totalCost / sales) * 100 : 0;
    const remaining = sales - totalCost;

    $('#franchisePct').textContent = franchisePct.toFixed(2) + '%';
    $('#weeklyRent').textContent = money(weeklyRent);
    $('#rentPct').textContent = rentPct.toFixed(2) + '%';
    $('#totalCostPct').textContent = totalPct.toFixed(2) + '%';
    $('#cashRemaining').textContent = money(remaining);
  }

  function getPage2State() {
    return safeParse(localStorage.getItem(PAGE2_STATE_KEY));
  }

  function saveFinanceForWeek() {
    const week = $('#weekStart')?.value;
    if (!week) return;
    finance.history = finance.history || {};
    finance.history[week] = {
      franchiseFees: finance.franchiseFees ?? '',
      monthlyRent: finance.monthlyRent ?? ''
    };
    saveFinance();
    attachFinanceToLocalPage2();
  }

  function loadFinanceForWeek(week) {
    if (!week) return;
    const saved = finance.history?.[week];
    finance.franchiseFees = saved?.franchiseFees ?? '';
    finance.monthlyRent = saved?.monthlyRent ?? '';
    saveFinance();
    applyInputs();
    setTimeout(recalc, 0);
  }

  function decorateHistory() {
    const historyList = $('#historyList');
    const state = getPage2State();
    if (!historyList || !Array.isArray(state?.history)) return;

    historyList.querySelectorAll('.history-item').forEach(row => {
      const loadBtn = row.querySelector('[data-load]');
      const id = loadBtn?.dataset.load;
      if (!id) return;
      const h = state.history.find(item => item.id === id);
      if (!h) return;

      const sales = num(h.totalSales);
      const supplies = num(h.supplies);
      const gross = num(h.gross);
      const extra = finance.history?.[h.weekStart] || {};
      const franchiseFees = num(extra.franchiseFees);
      const weeklyRent = num(extra.monthlyRent) / 4;
      const franchisePct = sales > 0 ? (franchiseFees / sales) * 100 : 0;
      const rentPct = sales > 0 ? (weeklyRent / sales) * 100 : 0;
      const totalCost = supplies + gross + franchiseFees + weeklyRent;
      const totalPct = sales > 0 ? (totalCost / sales) * 100 : 0;
      const remaining = sales - totalCost;

      const small = row.querySelector('small');
      if (!small) return;
      small.innerHTML = `${num(h.worked)} employees · ${num(h.hours).toFixed(2)} hrs · ${money(num(h.pay))}<br>` +
        `Sales ${money(sales)} · Supplies ${money(supplies)} · Franchise ${money(franchiseFees)} (${franchisePct.toFixed(2)}%) · Weekly Rent ${money(weeklyRent)} (${rentPct.toFixed(2)}%) · Total ${totalPct.toFixed(2)}% · Remaining ${money(remaining)}`;
    });
  }

  addUi();
  syncFinanceFromCloudBook();

  // App.js updates these values after its own input handlers; recalculate immediately after it.
  document.addEventListener('input', event => {
    if (event.target?.matches('#totalSales,#supplies,[data-key]')) setTimeout(recalc, 0);
  });
  document.addEventListener('change', event => {
    if (event.target?.matches('#totalSales,#supplies,[data-key],select[data-key]')) setTimeout(recalc, 0);
  });

  const grossEl = $('#grossTotal');
  if (grossEl) new MutationObserver(() => setTimeout(recalc, 0)).observe(grossEl, { childList: true, characterData: true, subtree: true });

  const historyEl = $('#historyList');
  if (historyEl) new MutationObserver(() => setTimeout(decorateHistory, 0)).observe(historyEl, { childList: true });

  $('#saveWeek')?.addEventListener('click', () => {
    saveFinanceForWeek();
    setTimeout(decorateHistory, 0);
  });

  historyEl?.addEventListener('click', event => {
    const load = event.target.closest('[data-load]');
    const del = event.target.closest('[data-delete]');

    if (load) {
      setTimeout(() => {
        loadFinanceForWeek($('#weekStart')?.value);
        decorateHistory();
      }, 0);
    }

    if (del) {
      const week = String(del.dataset.delete || '').slice(0, 10);
      if (week && finance.history?.[week]) {
        delete finance.history[week];
        saveFinance();
        attachFinanceToLocalPage2();
      }
      setTimeout(decorateHistory, 0);
    }
  });

  setTimeout(() => { applyInputs(); recalc(); decorateHistory(); }, 0);
  window.addEventListener('load', () => setTimeout(() => { recalc(); decorateHistory(); }, 0));
})();
