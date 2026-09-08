(() => {
  const STARTERS = [
    {name:'Gabby',rate:14},{name:'Yuridia',rate:14},{name:'Franklin',rate:16.5},{name:'Elea',rate:16},
    {name:'David',rate:''},{name:'Sarah',rate:''},{name:'Silvea',rate:13},{name:'A',rate:''},{name:'B',rate:''},{name:'C',rate:''}
  ];
  const SUPABASE_URL='https://gateinrstctizjkiyxxz.supabase.co';
  const SUPABASE_KEY='sb_publishable_E_L4AwBUizoMBa7I2XOCUw_mTfKGbY9';
  const SESSION_KEY='weeklyPayrollCloudSession';

  const $ = s => document.querySelector(s);
  const employeesEl = $('#employees'), historyEl = $('#historyList');
  const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number.isFinite(n)?n:0);
  const num = v => { const n=parseFloat(v); return Number.isFinite(n)&&n>=0?Math.min(n,1000000):0; };
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const monday = () => { const d=new Date(); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toISOString().slice(0,10); };

  let state = loadState();
  let installPrompt = null;
  let cloudSession = loadCloudSession();
  let cloudBooting = !!cloudSession;
  let cloudSaveTimer = null;
  let loadingCloud = false;

  function normalizeEmployee(e,i=0){
    return {
      id:e?.id ?? Date.now()+i,
      name:e?.name ?? 'Employee',
      payType:e?.payType === 'fixed' ? 'fixed' : 'hourly',
      rate:e?.rate ?? '',
      weeklyPay:e?.weeklyPay ?? '',
      hours:e?.hours ?? '',
      deduction:e?.deduction ?? ''
    };
  }

  function normalizeState(x){
    const base = x && typeof x === 'object' ? x : {};
    return {
      weekStart:base.weekStart || monday(),
      ot:base.ot !== false,
      totalSales:base.totalSales ?? '',
      supplies:base.supplies ?? '',
      employees:Array.isArray(base.employees) ? base.employees.map(normalizeEmployee) : STARTERS.map((e,i)=>normalizeEmployee({id:Date.now()+i,...e},i)),
      history:Array.isArray(base.history) ? base.history : []
    };
  }

  function loadState(){
    try{return normalizeState(JSON.parse(localStorage.getItem('weeklyPayrollState')||'null'));}
    catch(e){return normalizeState(null);}
  }

  function loadCloudSession(){
    try{
      const session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
      return session?.access_token && session?.refresh_token ? session : null;
    }catch(e){return null;}
  }

  function setCloudSession(session){
    cloudSession=session || null;
    if(cloudSession) localStorage.setItem(SESSION_KEY,JSON.stringify(cloudSession));
    else localStorage.removeItem(SESSION_KEY);
    renderCloudAuth();
  }

  function saveState(){
    localStorage.setItem('weeklyPayrollState',JSON.stringify(state));
    if(!loadingCloud && !cloudBooting) scheduleCloudSave();
  }

  function toast(msg){
    const el=$('#toast');
    el.textContent=msg;
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'),1800);
  }

  function calc(e){
    const payType=e.payType === 'fixed' ? 'fixed' : 'hourly';
    const deduction=num(e.deduction);
    if(payType==='fixed'){
      const gross=num(e.weeklyPay);
      return {payType,rate:0,hours:0,deduction,regular:0,overtime:0,gross,pay:Math.max(0,gross-deduction)};
    }
    const rate=num(e.rate), hours=num(e.hours);
    let regular=hours, overtime=0;
    if(state.ot && hours>40){regular=40;overtime=hours-40;}
    const gross=regular*rate+overtime*rate*1.5;
    return {payType,rate,hours,deduction,regular,overtime,gross,pay:Math.max(0,gross-deduction)};
  }

  function getTotals(){
    let worked=0,hours=0,gross=0,pay=0;
    state.employees.forEach(e=>{
      const c=calc(e);
      if((c.payType==='fixed'&&c.gross>0)||(c.payType==='hourly'&&c.hours>0)) worked++;
      hours+=c.hours; gross+=c.gross; pay+=c.pay;
    });
    return {worked,hours,gross,pay};
  }

  function updateSummary(){
    const {worked,hours,gross,pay}=getTotals();
    const sales=num(state.totalSales), supplies=num(state.supplies);
    const suppliesPct=sales>0?(supplies/sales)*100:0;
    const payrollPct=sales>0?(gross/sales)*100:0;
    const totalCost=supplies+gross;
    const totalCostPct=sales>0?(totalCost/sales)*100:0;
    const cashRemaining=sales-totalCost;
    $('#worked').textContent=worked;
    $('#hoursTotal').textContent=hours.toFixed(2);
    $('#grossTotal').textContent=money(gross);
    $('#payTotal').textContent=money(pay);
    $('#suppliesPct').textContent=suppliesPct.toFixed(2)+'%';
    $('#payrollPct').textContent=payrollPct.toFixed(2)+'%';
    $('#totalCostPct').textContent=totalCostPct.toFixed(2)+'%';
    $('#cashRemaining').textContent=money(cashRemaining);
  }

  function applyStateToUi(){
    $('#weekStart').value=state.weekStart||monday();
    $('#otToggle').checked=state.ot!==false;
    $('#totalSales').value=state.totalSales ?? '';
    $('#supplies').value=state.supplies ?? '';
    renderEmployees();
    renderHistory();
  }

  function renderEmployees(){
    employeesEl.innerHTML='';
    state.employees.forEach((raw,idx)=>{
      const e=normalizeEmployee(raw,idx);
      state.employees[idx]=e;
      const c=calc(e), fixed=e.payType==='fixed';
      const card=document.createElement('section');
      card.className='employee';
      card.dataset.id=e.id;
      card.innerHTML=`<div class="employee-head"><div class="employee-title">Employee ${idx+1}</div><button class="remove" type="button" data-action="remove">Remove</button></div>
        <div class="grid">
          <div class="field name"><label>Name</label><input data-key="name" type="text" value="${esc(e.name)}" /></div>
          <div class="field"><label>Pay type</label><select data-key="payType"><option value="hourly" ${fixed?'':'selected'}>Hourly</option><option value="fixed" ${fixed?'selected':''}>Fixed weekly</option></select></div>
          <div class="field"><label>${fixed?'Weekly pay':'Rate / hour'}</label><input data-key="${fixed?'weeklyPay':'rate'}" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(fixed?e.weeklyPay:e.rate)}" /></div>
          <div class="field ${fixed?'hidden-field':''}"><label>Weekly hours</label><input data-key="hours" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(e.hours)}" ${fixed?'disabled':''} /></div>
          <div class="field"><label>Deduction</label><input data-key="deduction" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(e.deduction)}" /></div>
        </div>
        <div class="results">
          <div class="result"><small>${fixed?'Pay type':'Regular hrs'}</small><strong data-out="regular">${fixed?'Fixed weekly':c.regular.toFixed(2)}</strong></div>
          <div class="result"><small>${fixed?'Weekly amount':'OT hrs'}</small><strong data-out="overtime">${fixed?money(c.gross):c.overtime.toFixed(2)}</strong></div>
          <div class="result"><small>Gross pay</small><strong data-out="gross">${money(c.gross)}</strong></div>
          <div class="result pay"><small>Pay employee</small><strong data-out="pay">${money(c.pay)}</strong></div>
        </div>`;
      employeesEl.appendChild(card);
    });
    updateSummary();
    saveState();
  }

  function refreshCard(card,e){
    const c=calc(e), fixed=e.payType==='fixed';
    card.querySelector('[data-out="regular"]').textContent=fixed?'Fixed weekly':c.regular.toFixed(2);
    card.querySelector('[data-out="overtime"]').textContent=fixed?money(c.gross):c.overtime.toFixed(2);
    card.querySelector('[data-out="gross"]').textContent=money(c.gross);
    card.querySelector('[data-out="pay"]').textContent=money(c.pay);
    updateSummary();
    saveState();
  }

  function renderHistory(){
    historyEl.innerHTML='';
    if(!state.history?.length){
      historyEl.innerHTML='<div class="empty">No saved weeks yet.</div>';
      return;
    }
    state.history.slice().sort((a,b)=>String(b.weekStart||'').localeCompare(String(a.weekStart||''))).forEach(h=>{
      const sales=num(h.totalSales), supplies=num(h.supplies), gross=num(h.gross);
      const suppliesPct=sales>0?(supplies/sales)*100:0;
      const totalCost=supplies+gross;
      const totalPct=sales>0?(totalCost/sales)*100:0;
      const remaining=sales-totalCost;
      const row=document.createElement('div');
      row.className='history-item';
      row.innerHTML=`<div><strong>Week of ${esc(h.weekStart)}</strong><br><small>${num(h.worked)} employees · ${num(h.hours).toFixed(2)} hrs · ${money(num(h.pay))}<br>Sales ${money(sales)} · Supplies ${money(supplies)} (${suppliesPct.toFixed(2)}%) · Total ${totalPct.toFixed(2)}% · Remaining ${money(remaining)}</small></div><div class="actions"><button class="btn secondary" type="button" data-load="${esc(h.id)}">Load</button><button class="btn danger" type="button" data-delete="${esc(h.id)}">Delete</button></div>`;
      historyEl.appendChild(row);
    });
  }

  function tokenExpSeconds(token){
    try{
      const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      const json=JSON.parse(atob(part.padEnd(part.length+(4-part.length%4)%4,'=')));
      return Number(json.exp)||0;
    }catch(e){return 0;}
  }

  async function refreshCloudSession(){
    if(!cloudSession?.refresh_token) return false;
    try{
      const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
        method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:cloudSession.refresh_token})
      });
      if(!res.ok) throw new Error('Session expired');
      const data=await res.json();
      setCloudSession(data);
      return true;
    }catch(e){
      setCloudSession(null);
      setCloudStatus('Sign in again to resume cloud sync.','warn');
      return false;
    }
  }

  async function ensureCloudSession(){
    if(!cloudSession?.access_token) return false;
    const exp=tokenExpSeconds(cloudSession.access_token);
    if(exp && exp > Math.floor(Date.now()/1000)+60) return true;
    return refreshCloudSession();
  }

  async function cloudFetch(path,options={},retry=true){
    if(!(await ensureCloudSession())) throw new Error('Not signed in');
    const headers={'apikey':SUPABASE_KEY,'Authorization':`Bearer ${cloudSession.access_token}`,...(options.headers||{})};
    const res=await fetch(`${SUPABASE_URL}${path}`,{...options,headers});
    if(res.status===401 && retry && await refreshCloudSession()) return cloudFetch(path,options,false);
    return res;
  }

  function setCloudStatus(message,type=''){
    const el=$('#cloudStatus');
    if(!el) return;
    el.textContent=message;
    el.className='cloud-status'+(type?' '+type:'');
  }

  function renderCloudAuth(){
    const signedIn=!!cloudSession?.user?.id;
    $('#cloudLoginFields').style.display=signedIn?'none':'grid';
    $('#cloudSignedIn').style.display=signedIn?'flex':'none';
    $('#cloudUserEmail').textContent=signedIn?(cloudSession.user.email||'Signed in'):'';
    if(signedIn) setCloudStatus(navigator.onLine?'Cloud sync ready.':'Offline — changes will sync when you are online.',navigator.onLine?'good':'warn');
    else setCloudStatus('Not signed in — data is saved only on this device.');
  }

  function scheduleCloudSave(){
    if(!cloudSession?.user?.id || !navigator.onLine) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer=setTimeout(()=>cloudSaveNow(false),700);
  }

  async function cloudSaveNow(showToast=true){
    if(!cloudSession?.user?.id || !navigator.onLine) return false;
    try{
      setCloudStatus('Syncing…');
      const res=await cloudFetch('/rest/v1/weekly_payroll_cloud?on_conflict=user_id',{
        method:'POST',
        headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify({user_id:cloudSession.user.id,state})
      });
      if(!res.ok) throw new Error(await res.text());
      setCloudStatus(`Synced ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`,'good');
      if(showToast) toast('Cloud synced');
      return true;
    }catch(e){
      setCloudStatus('Cloud sync failed — local data is still saved.','warn');
      if(showToast) toast('Cloud sync failed');
      return false;
    }
  }

  async function cloudLoadOrCreate(){
    if(!cloudSession?.user?.id) return;
    cloudBooting=true;
    try{
      setCloudStatus('Loading cloud data…');
      const userId=encodeURIComponent(cloudSession.user.id);
      const res=await cloudFetch(`/rest/v1/weekly_payroll_cloud?select=state,updated_at&user_id=eq.${userId}&limit=1`);
      if(!res.ok) throw new Error(await res.text());
      const rows=await res.json();
      if(Array.isArray(rows) && rows.length && rows[0].state && Array.isArray(rows[0].state.employees)){
        loadingCloud=true;
        state=normalizeState(rows[0].state);
        localStorage.setItem('weeklyPayrollState',JSON.stringify(state));
        applyStateToUi();
        loadingCloud=false;
        setCloudStatus('Cloud data loaded.','good');
        toast('Cloud data loaded');
      }else{
        await cloudSaveNow(false);
        setCloudStatus('This device is now backed up to the cloud.','good');
        toast('Cloud backup created');
      }
    }catch(e){
      setCloudStatus('Could not load cloud data — local data is still available.','warn');
    }finally{
      loadingCloud=false;
      cloudBooting=false;
    }
  }

  async function signIn(){
    const email=$('#cloudEmail').value.trim();
    const password=$('#cloudPassword').value;
    if(!email || !password){toast('Enter email and password');return;}
    setCloudStatus('Signing in…');
    try{
      const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
        method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data?.msg||data?.error_description||data?.message||'Sign in failed');
      setCloudSession(data);
      $('#cloudPassword').value='';
      await cloudLoadOrCreate();
    }catch(e){
      setCloudStatus(e.message||'Sign in failed.','warn');
      toast(e.message||'Sign in failed');
    }
  }

  async function signUp(){
    const email=$('#cloudEmail').value.trim();
    const password=$('#cloudPassword').value;
    if(!email || !password){toast('Enter email and password');return;}
    if(password.length<6){toast('Password needs at least 6 characters');return;}
    setCloudStatus('Creating account…');
    try{
      const res=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{
        method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data?.msg||data?.error_description||data?.message||'Could not create account');
      if(data?.access_token){
        setCloudSession(data);
        $('#cloudPassword').value='';
        await cloudLoadOrCreate();
      }else{
        setCloudStatus('Account created. Check your email to confirm, then sign in.','good');
        toast('Account created');
      }
    }catch(e){
      setCloudStatus(e.message||'Could not create account.','warn');
      toast(e.message||'Could not create account');
    }
  }

  async function signOut(){
    try{
      if(cloudSession?.access_token){
        await fetch(`${SUPABASE_URL}/auth/v1/logout`,{
          method:'POST',
          headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${cloudSession.access_token}`}
        });
      }
    }catch(e){}
    setCloudSession(null);
    cloudBooting=false;
    setCloudStatus('Signed out — local data stays on this device.');
    toast('Signed out');
  }

  $('#weekStart').addEventListener('change',e=>{state.weekStart=e.target.value||monday();saveState();});
  $('#otToggle').addEventListener('change',e=>{state.ot=e.target.checked;renderEmployees();});
  const metricInput=()=>{state.totalSales=$('#totalSales').value;state.supplies=$('#supplies').value;updateSummary();saveState();};
  $('#totalSales').addEventListener('input',metricInput);
  $('#supplies').addEventListener('input',metricInput);
  $('#totalSales').addEventListener('change',metricInput);
  $('#supplies').addEventListener('change',metricInput);

  employeesEl.addEventListener('input',e=>{
    const input=e.target.closest('input[data-key]');
    if(!input)return;
    const card=input.closest('.employee');
    const emp=state.employees.find(x=>String(x.id)===card.dataset.id);
    if(!emp)return;
    emp[input.dataset.key]=input.value;
    refreshCard(card,emp);
  });

  employeesEl.addEventListener('change',e=>{
    const select=e.target.closest('select[data-key="payType"]');
    if(!select)return;
    const card=select.closest('.employee');
    const emp=state.employees.find(x=>String(x.id)===card.dataset.id);
    if(!emp)return;
    emp.payType=select.value==='fixed'?'fixed':'hourly';
    renderEmployees();
  });

  employeesEl.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action="remove"]');
    if(!btn)return;
    const id=btn.closest('.employee').dataset.id;
    state.employees=state.employees.filter(x=>String(x.id)!==id);
    renderEmployees();
  });

  $('#addEmployee').addEventListener('click',()=>{state.employees.push(normalizeEmployee({id:Date.now(),name:'New Employee'}));renderEmployees();});
  $('#clearHours').addEventListener('click',()=>{state.employees.forEach(e=>{e.hours='';e.deduction='';});renderEmployees();toast('Hours cleared');});
  $('#printBtn').addEventListener('click',()=>window.print());

  $('#saveWeek').addEventListener('click',()=>{
    const {worked,hours,gross,pay}=getTotals();
    const snap={id:(state.weekStart||monday())+'-'+Date.now(),weekStart:state.weekStart||monday(),ot:state.ot,totalSales:state.totalSales??'',supplies:state.supplies??'',worked,hours,gross,pay,employees:JSON.parse(JSON.stringify(state.employees))};
    state.history=(state.history||[]).filter(h=>h.weekStart!==snap.weekStart);
    state.history.push(snap);
    saveState();
    renderHistory();
    toast('Week saved');
  });

  historyEl.addEventListener('click',e=>{
    const load=e.target.closest('[data-load]'),del=e.target.closest('[data-delete]');
    if(load){
      const h=state.history.find(x=>x.id===load.dataset.load);
      if(h){
        state.weekStart=h.weekStart;
        state.ot=h.ot;
        state.totalSales=h.totalSales??'';
        state.supplies=h.supplies??'';
        state.employees=(h.employees||[]).map(normalizeEmployee);
        applyStateToUi();
        toast('Saved week loaded');
      }
    }
    if(del){
      state.history=state.history.filter(x=>x.id!==del.dataset.delete);
      saveState();
      renderHistory();
      toast('Saved week deleted');
    }
  });

  $('#cloudSignIn').addEventListener('click',signIn);
  $('#cloudSignUp').addEventListener('click',signUp);
  $('#cloudSyncNow').addEventListener('click',()=>cloudSaveNow(true));
  $('#cloudSignOut').addEventListener('click',signOut);
  $('#cloudPassword').addEventListener('keydown',e=>{if(e.key==='Enter')signIn();});

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').style.display='block';});
  $('#installBtn').addEventListener('click',async()=>{if(!installPrompt){toast('Use your browser menu → Install app');return;}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('#installBtn').style.display='none';});
  window.addEventListener('appinstalled',()=>{installPrompt=null;$('#installBtn').style.display='none';toast('App installed');});

  function onlineStatus(){
    $('#offline').style.display=navigator.onLine?'none':'block';
    if(cloudSession?.user?.id){
      if(navigator.onLine){
        setCloudStatus('Online — cloud sync ready.','good');
        scheduleCloudSave();
      }else setCloudStatus('Offline — changes will sync when you are online.','warn');
    }
  }

  window.addEventListener('online',onlineStatus);
  window.addEventListener('offline',onlineStatus);

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));
  }

  applyStateToUi();
  renderCloudAuth();
  onlineStatus();

  if(cloudSession) cloudLoadOrCreate();
  else cloudBooting=false;
})();
