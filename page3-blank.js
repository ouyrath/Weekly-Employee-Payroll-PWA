(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('page') !== '3') return;

  const style = document.createElement('style');
  style.textContent = `
    body.page-three-blank .summary,
    body.page-three-blank .cloud,
    body.page-three-blank .store-metrics,
    body.page-three-blank .toolbar,
    body.page-three-blank .employees,
    body.page-three-blank .footer-actions,
    body.page-three-blank .history,
    body.page-three-blank .note,
    body.page-three-blank .offline,
    body.page-three-blank .install { display:none !important; }
    body.page-three-blank .app { padding-bottom:40px; }
    body.page-three-blank #payrollPageNav { margin-bottom:0; }
    @media print { body.page-three-blank .topbar { display:none !important; } }
  `;
  document.head.appendChild(style);
  document.body.classList.add('page-three-blank');
})();
