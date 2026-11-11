/* MyShift v4 — 初次設定（選單位／班制／輪班位置）與使用說明
   動作與欄位 id 同原版：pick / wizShift / wizOff / wn / wwd / wod / wb / lzh / lid、#unitSel、#alTI、#unitHelpChg、chUnit、closeH、reset。
   使用說明的顏色與標記圖例改成與新介面一致（原圖例是舊配色）。 */
(function(){
'use strict';
const SK={'早':'early','中':'mid','晚':'night','休':'off'},sk=s=>SK[s]||'none';
const langSeg=()=>`<div class="v4-seg small v4-setup-lang" role="group" aria-label="Language"><button data-a="lzh" aria-pressed="${lang==='zh'}">中文</button><button data-a="lid" aria-pressed="${lang==='id'}">Indonesia</button></div>`;
const googleBtn=zh=>`<button onclick="fbLogin()" class="auth-signin v4-btn v4-google"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="">${zh?'Google 登入':'Login Google'}</button>`;

window.rType=function(){
  const zh=lang==='zh',unitOpts=getUnits().map(u=>`<option value="${esc(u)}"${S.unit===u?' selected':''}>${esc(u)}</option>`).join('');
  const cards=Object.keys(R).length?Object.entries(R).map(([k,v])=>{const w=v.c.filter(x=>x!=='休').length,o=v.c.filter(x=>x==='休').length,kinds=[...new Set(v.c)];
    return `<button class="v4-rot" data-a="pick" data-k="${k}"><span class="v4-rot-badge">${w>9?k.substring(0,3):w+':'+o}</span><span class="v4-rot-copy"><b>${RN[lang]&&RN[lang][k]||k}</b><small>${v.h}h · ${v.c.length}${t('cyc')}</small><i class="v4-rot-strip" aria-hidden="true">${v.c.slice(0,24).map(x=>`<u class="v4-s-${sk(x)}"></u>`).join('')}</i></span>${uiIcon('chevron',18)}</button>`}).join(''):`<p class="v4-setup-warn">${zh?'⚠️ 尚未設定輪班規則，請管理員到後台設定':'⚠️ Belum ada aturan shift'}</p>`;
  return `<div class="v4-setup"><div class="v4-setup-hero"><img src="${IMG.icon}" alt=""><h1>${t('app')}</h1><p>${t('desc')}</p></div>
  <section class="v4-setup-card"><h3><i>1</i>${zh?'選擇單位':'Pilih Unit'}</h3><select id="unitSel" ${unitConfigAvailable()?'':' disabled'} aria-describedby="unitConfigHint" onchange="if(!changeSelectedUnit(this.value))this.value=getUnits().includes(S.unit)?S.unit:''"><option value="">${zh?'-- 請選擇 --':'-- Pilih --'}</option>${unitOpts}</select><div id="unitConfigHint">${unitConfigStatusHtml()}</div></section>
  <section class="v4-setup-card"><h3><i>2</i>${zh?'選擇輪班制度':'Pilih pola shift'}</h3><div class="v4-rots">${cards}</div></section>
  <section class="v4-setup-card"><h3><i>3</i>${t('alSetup')}</h3><p class="v4-setup-range">${alYRange(curALY())}</p><label class="v4-field"><span>${t('alTotal')}</span><input type="number" id="alTI" value="${getAL().total||''}" placeholder="0" min="0" step="0.5" inputmode="decimal"></label><p class="v4-hint">${t('alSkip')}</p></section>
  ${!fbUser&&fbAuthReady?`<div class="v4-setup-auth">${googleBtn(zh)}</div>`:fbUser?`<p class="v4-setup-user">✅ ${esc(fbUser.displayName||fbUser.email||'')}</p>`:''}${langSeg()}</div>`;
};
function wizPage(q,step,ct){
  return `<div class="v4-setup wiz"><div class="v4-wiz-top"><button class="v4-round" data-a="wb" aria-label="Back">${uiIcon('chevron',18)}</button><div><small>STEP ${step}</small><h1>${q}</h1></div><span class="v4-badge">${(RN[lang]&&RN[lang][S.rt])||S.rt||''}</span></div><div class="v4-wiz-steps" aria-hidden="true"><i class="on"></i><i class="${step==='2/2'?'on':''}"></i></div>${ct}</div>`;
}
window.wS=wizPage;
window.rWiz=function(){
  const zh=lang==='zh',c=cyc();
  if(!R[S.rt]||!c.length){S.step='type';return rType()}
  const opt=(attr,s,label)=>`<button class="v4-opt v4-s-${sk(s)}" ${attr}><span class="orb"></span><b>${label}</b></button>`;
  const num=(attr,n)=>`<button class="v4-opt num" ${attr}><b>${t('dn').replace('#n#',n)}</b></button>`;
  if(!S.wT){
    const allSh=[...new Set(c)];
    const login=!fbAuthReady?`<p class="v4-setup-user dim">${zh?'⏳ 檢查登入狀態...':'⏳ Checking login...'}</p>`:!fbUser?`<div class="v4-setup-auth">${googleBtn(zh)}</div>`:'';
    return wizPage(zh?'今天上什麼班？':'Shift hari ini?','1/2',`<div class="v4-opts">${allSh.filter(x=>x!=='休').map(s=>opt(`data-a="wizShift" data-v="${s}"`,s,sf(s))).join('')}${opt('data-a="wizOff"','休',t('off'))}</div>${login}`);
  }
  if(S.wT==='o'&&!S.wN){const sh=[...new Set(c.filter(x=>x!=='休'))];return wizPage(zh?'休假後接什麼班？':'Shift setelah libur?','1/2',`<div class="v4-opts">${sh.map(s=>opt(`data-a="wn" data-v="${s}"`,s,'→ '+sf(s))).join('')}</div>`)}
  if(S.wT==='w'&&S.wS&&S.wD===null){let mx=0,cr=0;for(let i=0;i<c.length*2;i++){if(c[i%c.length]===S.wS){cr++;mx=Math.max(mx,cr)}else cr=0}return wizPage(t('q3w').replace('#s#',sf(S.wS)),'2/2',`<div class="v4-opts three">${Array.from({length:mx},(_,i)=>num(`data-a="wwd" data-v="${i+1}"`,i+1)).join('')}</div>`)}
  if(S.wT==='o'&&S.wN&&S.wD===null){let mx=0;for(let i=0;i<c.length;i++){if(c[i]!=='休')continue;let j=i;while(j<c.length&&c[j]==='休')j++;if(c[j%c.length]===S.wN)mx=Math.max(mx,j-i)}return wizPage(t('q3o'),'2/2',`<div class="v4-opts three">${Array.from({length:mx},(_,i)=>num(`data-a="wod" data-v="${i+1}"`,i+1)).join('')}</div>`)}
  return'';
};

window.rHelp=function(){
  const zh=lang==='zh',steps=t('h');
  const sw=(k,l)=>`<div class="v4-help-item"><i class="sw v4-s-${k}"></i><span>${l}</span></div>`;
  const mark=(demo,l)=>`<div class="v4-help-item"><span class="demo">${demo}</span><span>${l}</span></div>`;
  const cell=(cls,inner)=>`<i class="mini ${cls}">${inner||''}</i>`;
  const step=(n,title,desc,cls='')=>`<div class="v4-help-step ${cls}"><i>${n}</i><div><h3>${title}</h3><p>${desc}</p></div></div>`;
  return `<div class="modal-bg" data-a="closeH"><div class="modal-sheet help-sheet v4-sheet v4-help" role="dialog" aria-modal="true" aria-label="${zh?'使用說明':'Panduan'}" onclick="event.stopPropagation()"><div class="modal-handle"></div>
  <header class="v4-sheet-head"><div><p>${zh?'華新麗華 輪班管理系統':'Sistem Manajemen Shift'}</p><h2 class="modal-title">${zh?'我的班表 使用說明':'My Shift Panduan'}</h2></div><img class="v4-help-icon" src="${IMG.icon}" alt=""></header>
  <section class="v4-card"><h3>${zh?'班表顏色說明':'Warna Jadwal'}</h3><div class="v4-help-grid">${sw('early',zh?'早班':'Pagi')}${sw('night',zh?'晚班':'Malam')}${sw('mid',zh?'中班':'Siang')}${sw('off',zh?'休假':'Libur')}</div></section>
  <section class="v4-card"><h3>${zh?'日曆標記說明':'Tanda Kalender'}</h3><div class="v4-help-grid marks">
    ${mark(cell('today','<b>28</b>'),zh?'今天（發光外框）':'Hari ini')}
    ${mark(cell('hol','<b>10</b>'),zh?'國定假日 / 週末（紅色日期）':'Libur nasional / akhir pekan')}
    ${mark(cell('ev','<u>備註</u>'),zh?'有標記事項（格內標籤）':'Ada catatan')}
    ${mark(cell('lv','<s>請假 2</s>'),zh?'請假人數（格子底部）':'Jumlah cuti')}
    ${mark(cell('al','<u class="al">特休</u>'),zh?'已排特休':'Pakai cuti')}
    ${mark(cell('pay','<u class="pay">發薪</u>'),zh?'發薪日（每月5日，遇假日提前）':'Gaji (tgl 5, maju jika libur)')}
    ${mark(cell('pay','<u class="pay">績效</u>'),zh?'績效獎金（每月20日，遇假日提前）':'Bonus (tgl 20, maju jika libur)')}
    ${mark(cell('brk','<em>連假</em>'),zh?'連假（底部紅帶）':'Libur panjang')}
  </div></section>
  <section class="v4-card"><h3>${zh?'薪資計算說明':'Perhitungan Gaji'}</h3>${step('$',zh?'薪資計算週期':'Periode Perhitungan',zh?'每月預設計薪區間為上月 26 日至當月 25 日（例如 3 月為 2/26～3/25）。公司某月結算日若有變動，可在「薪資」設定中的「本月計薪區間」單獨調整，起日與迄日都會計入。':'Periode default adalah tanggal 26 bulan lalu sampai tanggal 25 bulan ini. Jika tanggal perusahaan berubah pada bulan tertentu, atur masing-masing di pengaturan gaji; tanggal awal dan akhir ikut dihitung.','pay')}${step('💰',zh?'發薪日與獎金日':'Gaji & Bonus',zh?'每月 5 日發放薪資，每月 20 日發放績效獎金。遇國定假日或週末則提前至前一個工作日。日曆上以「發薪」和「績效」標示實際發放日。':'Gaji tanggal 5, bonus tanggal 20. Jika jatuh di hari libur/weekend, dimajukan ke hari kerja sebelumnya.','pay')}</section>
  <section class="v4-card"><h3>${zh?'功能說明':'Panduan Fitur'}</h3>${steps.map((s,i)=>{const [title,desc]=s.split('|');return step(i+1,title,desc)}).join('')}</section>
  <section class="v4-card"><h3>🏭 ${zh?'切換單位':'Ganti Unit'}</h3><div class="v4-inline"><select id="unitHelpChg"${unitConfigAvailable()?'':' disabled'} aria-label="${zh?'切換單位':'Ganti Unit'}"><option value="">${zh?'-- 無 --':'-- None --'}</option>${isAdmin()?`<option value="__all"${S.unit==='__all'?' selected':''}>${zh?'全部單位':'Semua Unit'}</option>`:''}${getUnits().map(u=>`<option value="${esc(u)}"${S.unit===u?' selected':''}>${esc(u)}</option>`).join('')}</select><button class="v4-btn primary" data-a="chUnit" data-target="unitHelpChg"${unitConfigAvailable()?'':' disabled'}>${zh?'確認':'OK'}</button></div>${unitConfigStatusHtml('unitHelpConfigHint')}</section>
  <button class="modal-done v4-btn primary wide" data-a="closeH">${t('done')}</button>
  <button class="modal-done v4-btn danger wide" data-a="reset">${zh?'⚠️ 重新設定班表':'⚠️ Reset Jadwal'}</button></div></div>`;
};
if(typeof render==='function')render();
})();
