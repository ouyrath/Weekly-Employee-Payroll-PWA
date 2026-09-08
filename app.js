(() => {
  const STARTERS = [
    {name:'Gabby',rate:14},{name:'Yuridia',rate:14},{name:'Franklin',rate:16.5},{name:'Elea',rate:16},
    {name:'David',rate:''},{name:'Sarah',rate:''},{name:'Silvea',rate:13},{name:'A',rate:''},{name:'B',rate:''},{name:'C',rate:''}
  ];
  const $ = s => document.querySelector(s);
  const employeesEl = $('#employees'), historyEl = $('#historyList');
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number.isFinite(n)?n:0);
  const num = v => { const n=parseFloat(v); return Number.isFinite(n)&&n>=0?Math.min(n,1000000):0; };
  const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const monday = () => { const d=new Date(); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toISOString().slice(0,10); };
  let state = loadState();
  let installPrompt = null;

  function loadState(){
    try{
      const x=JSON.parse(localStorage.getItem('weeklyPayrollState')||'null');
      if(x && Array.isArray(x.employees)) return x;
    }catch(e){}
    return {weekStart:monday(),ot:true,employees:STARTERS.map((e,i)=>({id:Date.now()+i,...e,hours:'',deduction:''})),history:[]};
  }
  function saveState(){ localStorage.setItem('weeklyPayrollState',JSON.stringify(state)); }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1600); }
  function calc(e){
    const rate=num(e.rate), hours=num(e.hours), deduction=num(e.deduction);
    let regular=hours, overtime=0;
    if(state.ot && hours>40){ regular=40; overtime=hours-40; }
    const gross=regular*rate+overtime*rate*1.5;
    return {rate,hours,deduction,regular,overtime,gross,pay:Math.max(0,gross-deduction)};
  }
  function updateSummary(){
    let worked=0,hours=0,gross=0,pay=0;
    state.employees.forEach(e=>{const c=calc(e);if(c.hours>0)worked++;hours+=c.hours;gross+=c.gross;pay+=c.pay;});
    $('#worked').textContent=worked; $('#hoursTotal').textContent=hours.toFixed(2); $('#grossTotal').textContent=money(gross); $('#payTotal').textContent=money(pay);
  }
  function renderEmployees(){
    employeesEl.innerHTML='';
    state.employees.forEach((e,idx)=>{
      const c=calc(e);
      const card=document.createElement('section'); card.className='employee'; card.dataset.id=e.id;
      card.innerHTML=`<div class="employee-head"><div class="employee-title">Employee ${idx+1}</div><button class="remove" type="button" data-action="remove">Remove</button></div>
        <div class="grid">
          <div class="field name"><label>Name</label><input data-key="name" type="text" value="${esc(e.name)}" /></div>
          <div class="field"><label>Rate / hour</label><input data-key="rate" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(e.rate)}" /></div>
          <div class="field"><label>Weekly hours</label><input data-key="hours" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(e.hours)}" /></div>
          <div class="field"><label>Deduction</label><input data-key="deduction" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(e.deduction)}" /></div>
        </div>
        <div class="results"><div class="result"><small>Regular hrs</small><strong data-out="regular">${c.regular.toFixed(2)}</strong></div><div class="result"><small>OT hrs</small><strong data-out="overtime">${c.overtime.toFixed(2)}</strong></div><div class="result"><small>Gross pay</small><strong data-out="gross">${money(c.gross)}</strong></div><div class="result pay"><small>Pay employee</small><strong data-out="pay">${money(c.pay)}</strong></div></div>`;
      employeesEl.appendChild(card);
    });
    updateSummary(); saveState();
  }
  function refreshCard(card,e){
    const c=calc(e);
    card.querySelector('[data-out="regular"]').textContent=c.regular.toFixed(2);
    card.querySelector('[data-out="overtime"]').textContent=c.overtime.toFixed(2);
    card.querySelector('[data-out="gross"]').textContent=money(c.gross);
    card.querySelector('[data-out="pay"]').textContent=money(c.pay);
    updateSummary(); saveState();
  }
  function renderHistory(){
    historyEl.innerHTML='';
    if(!state.history?.length){ historyEl.innerHTML='<div class="empty">No saved weeks yet.</div>'; return; }
    state.history.slice().sort((a,b)=>b.weekStart.localeCompare(a.weekStart)).forEach(h=>{
      const row=document.createElement('div'); row.className='history-item';
      row.innerHTML=`<div><strong>Week of ${esc(h.weekStart)}</strong><br><small>${h.worked} employees · ${h.hours.toFixed(2)} hrs · ${money(h.pay)}</small></div><div class="actions"><button class="btn secondary" type="button" data-load="${esc(h.id)}">Load</button><button class="btn danger" type="button" data-delete="${esc(h.id)}">Delete</button></div>`;
      historyEl.appendChild(row);
    });
  }

  $('#weekStart').value=state.weekStart||monday(); $('#otToggle').checked=state.ot!==false;
  $('#weekStart').addEventListener('change',e=>{state.weekStart=e.target.value||monday();saveState();});
  $('#otToggle').addEventListener('change',e=>{state.ot=e.target.checked;renderEmployees();});
  employeesEl.addEventListener('input',e=>{
    const input=e.target.closest('input[data-key]'); if(!input)return;
    const card=input.closest('.employee'); const emp=state.employees.find(x=>String(x.id)===card.dataset.id); if(!emp)return;
    emp[input.dataset.key]=input.value; refreshCard(card,emp);
  });
  employeesEl.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action="remove"]'); if(!btn)return;
    const id=btn.closest('.employee').dataset.id; state.employees=state.employees.filter(x=>String(x.id)!==id); renderEmployees();
  });
  $('#addEmployee').addEventListener('click',()=>{state.employees.push({id:Date.now(),name:'New Employee',rate:'',hours:'',deduction:''});renderEmployees();});
  $('#clearHours').addEventListener('click',()=>{state.employees.forEach(e=>{e.hours='';e.deduction='';});renderEmployees();toast('Hours cleared');});
  $('#printBtn').addEventListener('click',()=>window.print());
  $('#saveWeek').addEventListener('click',()=>{
    let worked=0,hours=0,gross=0,pay=0; state.employees.forEach(e=>{const c=calc(e);if(c.hours>0)worked++;hours+=c.hours;gross+=c.gross;pay+=c.pay;});
    const snap={id:(state.weekStart||monday())+'-'+Date.now(),weekStart:state.weekStart||monday(),ot:state.ot,worked,hours,gross,pay,employees:JSON.parse(JSON.stringify(state.employees))};
    state.history=(state.history||[]).filter(h=>h.weekStart!==snap.weekStart); state.history.push(snap); saveState(); renderHistory(); toast('Week saved');
  });
  historyEl.addEventListener('click',e=>{
    const load=e.target.closest('[data-load]'), del=e.target.closest('[data-delete]');
    if(load){const h=state.history.find(x=>x.id===load.dataset.load);if(h){state.weekStart=h.weekStart;state.ot=h.ot;state.employees=JSON.parse(JSON.stringify(h.employees));$('#weekStart').value=state.weekStart;$('#otToggle').checked=state.ot;renderEmployees();toast('Saved week loaded');}}
    if(del){state.history=state.history.filter(x=>x.id!==del.dataset.delete);saveState();renderHistory();toast('Saved week deleted');}
  });

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').style.display='block';});
  $('#installBtn').addEventListener('click',async()=>{if(!installPrompt){toast('Use your browser menu → Install app');return;}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').style.display='none';});
  window.addEventListener('appinstalled',()=>{installPrompt=null;$('#installBtn').style.display='none';toast('App installed');});
  function onlineStatus(){ $('#offline').style.display=navigator.onLine?'none':'block'; }
  window.addEventListener('online',onlineStatus); window.addEventListener('offline',onlineStatus); onlineStatus();
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}

  renderEmployees(); renderHistory();
})();
