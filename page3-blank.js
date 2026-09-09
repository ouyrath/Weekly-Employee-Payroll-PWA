(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('page') !== '3') return;

  const mainSites = [
    {name:'KhmerFinds', url:'https://khmerfinds.com', note:'Main classifieds/community website'},
    {name:'Weekly Payroll', url:'https://weekly-payroll-pwa.vercel.app', note:'Weekly payroll calculator'},
    {name:'Employee Time Clock', url:'https://employee-timeclock-chi.vercel.app', note:'Employee clock and schedule'},
    {name:'Now Hiring Public', url:'https://now-hiring-public.vercel.app', note:'Public hiring/application site'},
    {name:'Future Plans — 15 Year', url:'https://future-plans-15-year.vercel.app', note:'15-year future plans tracker'},
    {name:'Donut Shop Profit Tracker', url:'https://donut-shop-profit-tracker.vercel.app', note:'Donut shop sales, costs, and profit'},
    {name:'Store Cost Tracker', url:'https://store-cost-tracker.vercel.app', note:'Store cost tracking'},
    {name:'WalkFit Pro', url:'https://walkfit-pro.vercel.app', note:'Walking exercise app'},
    {name:'Emily Alarm Clock', url:'https://emily-alarm-clock.vercel.app', note:'Alarm clock app'},
    {name:'Super Loud Kitchen Timer', url:'https://super-loud-kitchen-timer.vercel.app', note:'Kitchen timer app'},
    {name:'Emily Calculator', url:'https://emily-calculator.vercel.app', note:'Calculator app'},
    {name:'Fair Play Blackjack', url:'https://fair-play-blackjack.vercel.app', note:'Blackjack game'},
    {name:'Khmer Blackjack', url:'https://khmer-blackjack.vercel.app', note:'Khmer blackjack game'},
    {name:'Poker Play', url:'https://poker-play.vercel.app', note:'Poker game'},
    {name:'Target Strike Mobile', url:'https://target-strike-mobile.vercel.app', note:'Mobile shooting game'},
    {name:'Business Obligation Calculator', url:'https://business-obligation-calculator.vercel.app', note:'Business obligation calculator'},
    {name:'Khmer Classifieds Worldwide', url:'https://khmer-classifieds-worldwide.vercel.app', note:'Khmer classifieds project'},
    {name:'Khmer Date', url:'https://khmer-date.vercel.app', note:'Khmer date website'},
    {name:'Khmer Chat', url:'https://khmer-chat.vercel.app', note:'Khmer chat website'},
    {name:'Khmer Together', url:'https://khmer-together.vercel.app', note:'Khmer community project'},
    {name:'KhmerFinds Simple', url:'https://khmerfinds-simple.vercel.app', note:'Simplified KhmerFinds project'},
    {name:'David Coin DVC', url:'https://david-coin-dvc.vercel.app', note:'DVC token website'}
  ];

  const testSites = [
    'future-plans-cloud-test',
    'walkfit-v5-schema-check',
    'walkfit-schema-check',
    'walkfit-path-test',
    'walkfit-pro-schema-test',
    'emily-alarm-clock-test',
    'alarm-schema-test',
    'alarm-base64-test',
    'alarm-path-test',
    'emily-calculator-fullscreen-test',
    'emily-calculator-test',
    'blackjack-sound-test',
    'fair-play-blackjack-test',
    'bizcalc-share-test',
    'bizcalc-path-test',
    'pwa-shape-test',
    'lobby-bell-test',
    'david-coin-metadata-safe',
    'employee-timeclock-schema-test'
  ].map(name => ({
    name: name.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
    url: `https://${name}.vercel.app`,
    note: 'Test / development project'
  }));

  const style = document.createElement('style');
  style.textContent = `
    body.page-three-sites .summary,
    body.page-three-sites .cloud,
    body.page-three-sites .store-metrics,
    body.page-three-sites .toolbar,
    body.page-three-sites .employees,
    body.page-three-sites .footer-actions,
    body.page-three-sites .history,
    body.page-three-sites .note,
    body.page-three-sites .offline,
    body.page-three-sites .install { display:none !important; }
    body.page-three-sites .app { padding-bottom:48px; }
    body.page-three-sites #payrollPageNav { margin-bottom:12px; }
    .site-directory{display:grid;gap:12px}
    .site-directory-head{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:var(--shadow)}
    .site-directory-head h2{margin:0;font-size:1.25rem}.site-directory-head p{margin:5px 0 0;color:var(--muted);font-size:.86rem}
    .site-search{width:100%;margin-top:12px;border:1px solid var(--line);border-radius:12px;padding:11px 12px;min-height:44px;background:#fff;color:var(--text)}
    .site-section{display:grid;gap:8px}.site-section-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:2px}.site-section-title h3{margin:0;font-size:1rem}.site-count{font-size:.78rem;color:var(--muted);font-weight:800}
    .site-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .site-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 12px;display:flex;align-items:center;gap:10px;min-width:0;box-shadow:0 4px 14px rgba(16,24,40,.05)}
    .site-card-copy{min-width:0;flex:1}.site-card strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.site-card small{display:block;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .site-open{border:0;background:var(--accent);color:var(--accentText);border-radius:10px;padding:8px 12px;font-weight:900;text-decoration:none;white-space:nowrap}
    .test-toggle{border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 11px;font-weight:900}.test-sites-wrap[hidden]{display:none!important}
    .site-empty{display:none;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;text-align:center;color:var(--muted)}
    @media(max-width:700px){.site-list{grid-template-columns:1fr}.site-card{padding:10px}.site-open{padding:8px 10px}}
    @media print{body.page-three-sites .topbar,#payrollPageNav,.site-search,.test-toggle{display:none!important}.site-list{grid-template-columns:1fr 1fr}.site-open{display:none}.test-sites-wrap[hidden]{display:grid!important}}
  `;
  document.head.appendChild(style);
  document.body.classList.add('page-three-sites');

  const title = document.querySelector('.title h1');
  const subtitle = document.querySelector('.title p');
  if (title) title.textContent = 'My Websites';
  if (subtitle) subtitle.textContent = 'All of my main websites and app projects in one place.';

  const nav = document.querySelector('#payrollPageNav');
  const directory = document.createElement('section');
  directory.className = 'site-directory';
  directory.innerHTML = `
    <div class="site-directory-head">
      <h2>Website Directory</h2>
      <p>${mainSites.length} main websites/apps + ${testSites.length} test/development projects.</p>
      <input id="siteSearch" class="site-search" type="search" placeholder="Search websites…" autocomplete="off" />
    </div>
    <div class="site-section">
      <div class="site-section-title"><h3>Main Websites & Apps</h3><span class="site-count" id="mainCount"></span></div>
      <div class="site-list" id="mainSiteList"></div>
    </div>
    <div class="site-section">
      <div class="site-section-title"><h3>Test / Development Projects</h3><button class="test-toggle" id="testToggle" type="button">Show ${testSites.length}</button></div>
      <div class="test-sites-wrap" id="testSitesWrap" hidden><div class="site-list" id="testSiteList"></div></div>
    </div>
    <div class="site-empty" id="siteEmpty">No website matches your search.</div>
  `;

  if (nav) nav.insertAdjacentElement('afterend', directory);
  else document.querySelector('.topbar')?.insertAdjacentElement('afterend', directory);

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const renderCard = site => `
    <article class="site-card" data-search="${esc((site.name+' '+site.note+' '+site.url).toLowerCase())}">
      <div class="site-card-copy">
        <strong>${esc(site.name)}</strong>
        <small>${esc(site.note)}</small>
      </div>
      <a class="site-open" href="${esc(site.url)}" target="_blank" rel="noopener">Open</a>
    </article>`;

  const mainList = document.querySelector('#mainSiteList');
  const testList = document.querySelector('#testSiteList');
  if (mainList) mainList.innerHTML = mainSites.map(renderCard).join('');
  if (testList) testList.innerHTML = testSites.map(renderCard).join('');
  const mainCount = document.querySelector('#mainCount');
  if (mainCount) mainCount.textContent = `${mainSites.length} websites`;

  const testToggle = document.querySelector('#testToggle');
  const testWrap = document.querySelector('#testSitesWrap');
  testToggle?.addEventListener('click', () => {
    const willShow = testWrap?.hasAttribute('hidden');
    if (willShow) testWrap?.removeAttribute('hidden'); else testWrap?.setAttribute('hidden','');
    testToggle.textContent = willShow ? 'Hide Tests' : `Show ${testSites.length}`;
  });

  const search = document.querySelector('#siteSearch');
  const empty = document.querySelector('#siteEmpty');
  search?.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('.site-card').forEach(card => {
      const show = !q || card.dataset.search.includes(q);
      card.style.display = show ? 'flex' : 'none';
      if (show) visible++;
    });
    if (q && testWrap?.hasAttribute('hidden')) {
      const hasTest = [...document.querySelectorAll('#testSiteList .site-card')].some(card => card.style.display !== 'none');
      if (hasTest) {
        testWrap.removeAttribute('hidden');
        if (testToggle) testToggle.textContent = 'Hide Tests';
      }
    }
    if (empty) empty.style.display = visible ? 'none' : 'block';
  });
})();
