(() => {
  const employeesEl = document.querySelector('#employees');
  if (!employeesEl) return;

  const openEmployees = new Set();

  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const style = document.createElement('style');
  style.textContent = `
    .compact-section-btn,.compact-edit{border:1px solid var(--line);background:#fff;color:var(--text);border-radius:10px;padding:8px 11px;font-weight:800;min-height:38px;white-space:nowrap}
    .cloud-head{align-items:center}.cloud.compact-collapsed{padding:10px 12px}.cloud.compact-collapsed> :not(.cloud-head){display:none!important}.cloud.compact-collapsed .cloud-head{margin-bottom:0}
    .employee-quick{display:none;min-width:0;flex:1;align-items:center;gap:10px}.employee-quick strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.employee-quick span{font-size:.8rem;color:var(--muted);white-space:nowrap}.employee-quick .quick-pay{color:var(--good);font-weight:900;font-size:.92rem}
    .employee.compact-collapsed{padding:9px 11px}.employee.compact-collapsed .employee-head{margin-bottom:0}.employee.compact-collapsed .employee-title,.employee.compact-collapsed .remove,.employee.compact-collapsed .grid,.employee.compact-collapsed .results{display:none!important}.employee.compact-collapsed .employee-quick{display:grid;grid-template-columns:minmax(0,1fr) auto auto}
    .employee:not(.compact-collapsed) .employee-quick{display:none}.employee:not(.compact-collapsed) .compact-edit{background:var(--accent);color:var(--accentText);border-color:var(--accent)}
    .history-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.history.compact-collapsed .history-list{display:none}.history.compact-collapsed{margin-top:14px}.history.compact-collapsed .history-head{margin-bottom:0}
    @media(max-width:820px){
      .app{padding-top:12px}.topbar{margin-bottom:10px}.title p{font-size:.84rem}.summary{gap:7px;margin-bottom:9px}.stat{padding:10px;border-radius:13px}.stat strong{font-size:1.02rem}.cloud,.store-metrics,.toolbar{margin-bottom:9px}.store-metrics{gap:7px;padding:9px}.metric-field{gap:4px}.metric-field input{min-height:40px;padding:9px 10px}.metric-result{min-height:55px;padding:8px 10px}.metric-result strong{font-size:1rem}.toolbar{padding:9px;gap:7px}.field{gap:4px}.field input,.field select{min-height:40px;padding:9px 10px}.otrow{min-height:40px}.employees{gap:7px}.footer-actions{margin-top:9px;padding:7px}.history{margin-top:14px}
    }
    @media(max-width:520px){
      .employee.compact-collapsed .employee-quick{grid-template-columns:minmax(0,1fr) auto}.employee.compact-collapsed .employee-quick span:not(.quick-pay){grid-column:1/2;grid-row:2}.employee.compact-collapsed .employee-quick .quick-pay{grid-column:2/3;grid-row:1/3;align-self:center}.compact-edit{padding:7px 9px;min-height:36px}
    }
    @media print{.compact-section-btn,.compact-edit,.employee-quick{display:none!important}.cloud.compact-collapsed> :not(.cloud-head),.history.compact-collapsed .history-list,.employee.compact-collapsed .grid,.employee.compact-collapsed .results,.employee.compact-collapsed .employee-title{display:revert!important}}
  `;
  document.head.appendChild(style);

  function quickText(card) {
    const name = card.querySelector('[data-key="name"]')?.value?.trim() || 'Employee';
    const payType = card.querySelector('[data-key="payType"]')?.value || 'hourly';
    const hoursRaw = parseFloat(card.querySelector('[data-key="hours"]')?.value || '0');
    const hours = Number.isFinite(hoursRaw) ? hoursRaw : 0;
    const pay = card.querySelector('[data-out="pay"]')?.textContent?.trim() || '$0.00';
    return {
      name,
      detail: payType === 'fixed' ? 'Fixed weekly' : `${hours.toFixed(2)} hrs`,
      pay
    };
  }

  function updateQuick(card) {
    const quick = card.querySelector('.employee-quick');
    const toggle = card.querySelector('[data-compact-toggle]');
    if (!quick || !toggle) return;
    const q = quickText(card);
    quick.innerHTML = `<strong>${esc(q.name)}</strong><span>${esc(q.detail)}</span><span class="quick-pay">${esc(q.pay)}</span>`;
    toggle.textContent = card.classList.contains('compact-collapsed') ? 'Edit' : 'Done';
    toggle.setAttribute('aria-expanded', card.classList.contains('compact-collapsed') ? 'false' : 'true');
  }

  function decorateEmployee(card) {
    if (!card || card.dataset.compactReady === '1') return;
    const head = card.querySelector('.employee-head');
    if (!head) return;

    const quick = document.createElement('div');
    quick.className = 'employee-quick';
    head.insertBefore(quick, head.querySelector('.remove'));

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'compact-edit';
    toggle.dataset.compactToggle = '1';
    head.insertBefore(toggle, head.querySelector('.remove'));

    card.dataset.compactReady = '1';
    const id = String(card.dataset.id || '');
    card.classList.toggle('compact-collapsed', !openEmployees.has(id));
    updateQuick(card);
  }

  function decorateAllEmployees() {
    employeesEl.querySelectorAll('.employee').forEach(decorateEmployee);
  }

  employeesEl.addEventListener('click', event => {
    const button = event.target.closest('[data-compact-toggle]');
    if (!button) return;
    const card = button.closest('.employee');
    if (!card) return;
    const id = String(card.dataset.id || '');
    const willOpen = card.classList.contains('compact-collapsed');
    card.classList.toggle('compact-collapsed', !willOpen);
    if (willOpen) openEmployees.add(id);
    else openEmployees.delete(id);
    updateQuick(card);
  });

  employeesEl.addEventListener('input', event => {
    const card = event.target.closest('.employee');
    if (card) queueMicrotask(() => updateQuick(card));
  });

  employeesEl.addEventListener('change', () => setTimeout(decorateAllEmployees, 0));

  new MutationObserver(() => decorateAllEmployees()).observe(employeesEl, { childList: true });
  decorateAllEmployees();

  const addEmployeeBtn = document.querySelector('#addEmployee');
  addEmployeeBtn?.addEventListener('click', () => {
    setTimeout(() => {
      const cards = [...employeesEl.querySelectorAll('.employee')];
      const card = cards[cards.length - 1];
      if (!card) return;
      decorateEmployee(card);
      const id = String(card.dataset.id || '');
      openEmployees.add(id);
      card.classList.remove('compact-collapsed');
      updateQuick(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => card.querySelector('[data-key="name"]')?.focus(), 250);
    }, 0);
  });

  function addSectionToggle(section, head, closedLabel, openLabel, startOpen = false) {
    if (!section || !head || head.querySelector('[data-section-toggle]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'compact-section-btn';
    button.dataset.sectionToggle = '1';
    head.appendChild(button);

    const setOpen = open => {
      section.classList.toggle('compact-collapsed', !open);
      button.textContent = open ? openLabel : closedLabel;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    setOpen(startOpen);
    button.addEventListener('click', () => setOpen(section.classList.contains('compact-collapsed')));
    return { setOpen };
  }

  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
  const resetMode = params.get('reset') === '1' || params.get('type') === 'recovery' || hash.get('type') === 'recovery';
  const cloud = document.querySelector('.cloud');
  const cloudToggle = addSectionToggle(cloud, cloud?.querySelector('.cloud-head'), 'Account / Cloud', 'Hide Account', resetMode);

  if (resetMode) cloudToggle?.setOpen(true);

  const history = document.querySelector('.history');
  const historyTitle = history?.querySelector('h2');
  if (historyTitle) {
    historyTitle.classList.add('history-head');
    addSectionToggle(history, historyTitle, 'Show Saved Weeks', 'Hide Saved Weeks', false);
  }
})();
