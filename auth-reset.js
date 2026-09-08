(() => {
  const SUPABASE_URL='https://gateinrstctizjkiyxxz.supabase.co';
  const SUPABASE_KEY='sb_publishable_E_L4AwBUizoMBa7I2XOCUw_mTfKGbY9';
  const LIVE_RESET_URL='https://weekly-payroll-pwa.vercel.app/?reset=1';

  const $ = s => document.querySelector(s);
  const statusEl = () => $('#cloudStatus');

  function setStatus(message,type=''){
    const el=statusEl();
    if(!el) return;
    el.textContent=message;
    el.className='cloud-status'+(type?' '+type:'');
  }

  function toast(message){
    const el=$('#toast');
    if(!el) return;
    el.textContent=message;
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'),2200);
  }

  function authParams(){
    const search=new URLSearchParams(location.search);
    const hash=new URLSearchParams((location.hash||'').replace(/^#/,''));
    return {
      reset:search.get('reset')==='1',
      type:hash.get('type')||search.get('type')||'',
      accessToken:hash.get('access_token')||search.get('access_token')||'',
      refreshToken:hash.get('refresh_token')||search.get('refresh_token')||'',
      error:hash.get('error_description')||search.get('error_description')||''
    };
  }

  function injectUi(){
    const login=$('#cloudLoginFields');
    const cloud=$('.cloud');
    if(!login || !cloud || $('#cloudForgotPassword')) return;

    const forgotWrap=document.createElement('div');
    forgotWrap.className='actions';
    forgotWrap.style.gridColumn='1 / -1';
    forgotWrap.innerHTML='<button id="cloudForgotPassword" class="btn secondary" type="button">Forgot Password / Reset</button>';
    login.appendChild(forgotWrap);

    const panel=document.createElement('div');
    panel.id='cloudResetPanel';
    panel.style.display='none';
    panel.style.marginTop='12px';
    panel.style.padding='12px';
    panel.style.border='1px solid var(--line)';
    panel.style.borderRadius='12px';
    panel.style.background='#fff';
    panel.innerHTML=`
      <div style="font-weight:900;margin-bottom:4px">Reset Password</div>
      <div style="color:var(--muted);font-size:.8rem;margin-bottom:10px">Enter your new password below.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="field"><label for="cloudNewPassword">New password</label><input id="cloudNewPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters" /></div>
        <div class="field"><label for="cloudNewPassword2">Confirm password</label><input id="cloudNewPassword2" type="password" autocomplete="new-password" placeholder="Repeat password" /></div>
      </div>
      <div class="actions" style="margin-top:10px">
        <button id="cloudSaveNewPassword" class="btn primary" type="button">Save New Password</button>
        <button id="cloudCancelReset" class="btn secondary" type="button">Cancel</button>
      </div>`;
    cloud.appendChild(panel);

    $('#cloudForgotPassword').addEventListener('click',sendResetEmail);
    $('#cloudSaveNewPassword').addEventListener('click',saveNewPassword);
    $('#cloudCancelReset').addEventListener('click',()=>{
      panel.style.display='none';
      history.replaceState({},'',location.pathname);
      setStatus('Enter your email and password to sign in.');
    });

    const p=authParams();
    if(p.error){
      setStatus(decodeURIComponent(p.error.replace(/\+/g,' ')),'warn');
    }
    if((p.reset || p.type==='recovery') && p.accessToken){
      panel.style.display='block';
      $('#cloudLoginFields').style.display='none';
      setStatus('Reset link verified. Choose a new password.','good');
      setTimeout(()=>$('#cloudNewPassword')?.focus(),100);
    }
  }

  async function sendResetEmail(){
    const email=$('#cloudEmail')?.value.trim();
    if(!email){
      setStatus('Enter your email address first.','warn');
      toast('Enter your email first');
      $('#cloudEmail')?.focus();
      return;
    }

    const btn=$('#cloudForgotPassword');
    if(btn) btn.disabled=true;
    setStatus('Sending password reset email…');
    try{
      const res=await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(LIVE_RESET_URL)}`,{
        method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email})
      });
      let data={};
      try{data=await res.json();}catch(e){}
      if(!res.ok) throw new Error(data?.msg||data?.error_description||data?.message||'Could not send reset email');
      setStatus('Reset email sent. Open the email and tap Reset Password.','good');
      toast('Reset email sent');
    }catch(e){
      setStatus(e.message||'Could not send reset email.','warn');
      toast('Reset email failed');
    }finally{
      if(btn) btn.disabled=false;
    }
  }

  async function saveNewPassword(){
    const p=authParams();
    const password=$('#cloudNewPassword')?.value||'';
    const confirm=$('#cloudNewPassword2')?.value||'';

    if(!p.accessToken){
      setStatus('Reset link is missing or expired. Request a new reset email.','warn');
      return;
    }
    if(password.length<6){
      setStatus('Password needs at least 6 characters.','warn');
      return;
    }
    if(password!==confirm){
      setStatus('The two passwords do not match.','warn');
      return;
    }

    const btn=$('#cloudSaveNewPassword');
    if(btn) btn.disabled=true;
    setStatus('Saving new password…');
    try{
      const res=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
        method:'PUT',
        headers:{
          'apikey':SUPABASE_KEY,
          'Authorization':`Bearer ${p.accessToken}`,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({password})
      });
      let data={};
      try{data=await res.json();}catch(e){}
      if(!res.ok) throw new Error(data?.msg||data?.error_description||data?.message||'Could not update password');

      localStorage.removeItem('weeklyPayrollCloudSession');
      location.hash='';
      history.replaceState({},'',location.pathname);
      $('#cloudResetPanel').style.display='none';
      $('#cloudLoginFields').style.display='grid';
      $('#cloudPassword').value='';
      setStatus('Password changed successfully. Sign in with your new password.','good');
      toast('Password changed');
      $('#cloudPassword')?.focus();
    }catch(e){
      setStatus(e.message||'Could not update password. Request a new reset email.','warn');
      toast('Password reset failed');
    }finally{
      if(btn) btn.disabled=false;
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injectUi);
  else injectUi();
})();
