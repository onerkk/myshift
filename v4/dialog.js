/* MyShift v4 — 站內對話框
   取代兩個原本不夠安全／不夠清楚的操作入口（全站所有入口一次攔截）：
   1. 特休設定（data-a="alEdit"）：原本是瀏覽器 prompt()。改成站內對話框，寫入邏輯與原 handle 的 alEdit 分支逐行相同。
   2. 重新設定輪班（data-a="reset"）：原本一按就清除、沒有確認。改成先確認，確認後仍交給原 handle 執行。 */
(function(){
'use strict';
let last=null;
function close(){const d=document.getElementById('v4-dialog');if(d)d.remove();document.removeEventListener('keydown',onKey,true);if(last&&last.isConnected)try{last.focus({preventScroll:true})}catch(e){}last=null}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}}
function open(o){
  close();last=document.activeElement;
  const zh=lang==='zh',d=document.createElement('div');d.id='v4-dialog';d.className='v4-dlg-scrim';
  d.innerHTML=`<div class="v4-dlg${o.danger?' danger':''}" role="dialog" aria-modal="true" aria-labelledby="v4-dlg-title"><span class="v4-dlg-ic">${o.icon||''}</span><h2 id="v4-dlg-title">${o.title}</h2>${o.body||''}<p class="v4-dlg-err" role="alert" hidden></p><div class="v4-dlg-actions"><button type="button" class="v4-btn" data-x="cancel">${zh?'取消':'Batal'}</button><button type="button" class="v4-btn ${o.danger?'danger solid':'primary'}" data-x="ok">${o.ok}</button></div></div>`;
  d.addEventListener('click',e=>{
    if(e.target===d||e.target.closest('[data-x=cancel]')){close();return}
    if(e.target.closest('[data-x=ok]')){const err=o.onOk(d);if(err){const p=d.querySelector('.v4-dlg-err');p.textContent=err;p.hidden=false}else close()}
  });
  document.body.appendChild(d);document.addEventListener('keydown',onKey,true);
  const f=d.querySelector('input')||d.querySelector('[data-x=cancel]');if(f)setTimeout(()=>{try{f.focus();if(f.select)f.select()}catch(e){}},60);
}
function openAL(){
  const zh=lang==='zh',cur=getAL(),range=alYRange(curALY()),used=cur.total>0?Math.max(0,cur.total-alRem()):0;
  open({icon:studioIcon('leave',26),title:zh?'設定年度特休':'Atur cuti tahunan',ok:zh?'儲存':'Simpan',
    body:`<p class="v4-dlg-range">${range}</p>${cur.total>0?`<div class="v4-dlg-stats"><div><b>${cur.total}</b><span>${zh?'目前總時數':'Total'}</span></div><div><b>${used}</b><span>${zh?'已使用':'Terpakai'}</span></div><div><b>${alRem()}</b><span>${zh?'剩餘':'Sisa'}</span></div></div>`:''}<label class="v4-field"><span>${zh?'特休總時數（小時）':'Total jam cuti'}</span><input type="number" id="v4AlTotal" min="0" step="0.5" inputmode="decimal" value="${cur.total||''}" placeholder="0"></label><p class="v4-dlg-note">${zh?'儲存後會以這個數字重新起算：這個年度已排的特休時數紀錄會清除，剩餘＝輸入的數字。':'Setelah disimpan, hitungan dimulai ulang: catatan cuti tahun ini dihapus, sisa = angka yang dimasukkan.'}</p>`,
    onOk(d){
      const raw=d.querySelector('#v4AlTotal').value,total=parseFloat(raw);
      if(raw===''||isNaN(total)||total<0)return zh?'請輸入有效數字':'Masukkan angka valid';
      /* 以下與原 handle 的 alEdit 分支相同 */
      const ay=curALY(),start=`${ay}-12-26`,end=`${ay+1}-12-25`;
      for(const k in ALD){if(k>=start&&k<=end)delete ALD[k]}
      AL_RESET_TS[ay]=Date.now();
      try{localStorage.setItem('sb_al_reset',JSON.stringify(AL_RESET_TS))}catch(e){}
      setAL(total,0);render();return'';
    }});
}
function openReset(){
  const zh=lang==='zh',locked=!!S.lockedRt;
  open({danger:true,icon:uiIcon('refresh',26),title:zh?'重新設定輪班？':'Atur ulang shift?',ok:zh?'重新設定':'Atur ulang',
    body:`<p class="v4-dlg-note strong">${locked?(zh?'會回到「今天上什麼班？」重新對齊輪班位置；班制維持不變。':'Kembali ke langkah posisi shift; pola tetap.'):(zh?'會清除目前的班制與輪班位置，回到一開始的選擇畫面。':'Pola dan posisi shift saat ini dihapus dan kembali ke layar awal.')}</p><p class="v4-dlg-note">${zh?'請假、事項、備註、薪資設定不受影響。':'Cuti, agenda, catatan dan data gaji tidak berubah.'}</p>`,
    onOk(){
      const el=document.createElement('button');el.dataset.a='reset';
      S.showH=false; /* 從使用說明進來時一併關閉說明，與原本重設後看到設定畫面的結果一致 */
      handle({currentTarget:el,target:el,preventDefault(){},stopPropagation(){}});render();return'';
    }});
}
document.addEventListener('click',e=>{
  if(!document.body.classList.contains('v4'))return;
  const el=e.target.closest&&e.target.closest('[data-a="alEdit"],[data-a="reset"]');
  if(!el||el.closest('#v4-dialog'))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(el.dataset.a==='alEdit')openAL();else openReset();
},true);
window.MyShiftV4Dialog={open,close,openAL,openReset};
})();
