/* MyShift v4 — 更多頁（帳號、外觀、偏好、功能捷徑、工具列）
   動作與原版相同。沉浸光景控制、單位選擇、請假統計三塊有即時掛鉤與較多條件，沿用原輸出，包在 .v4-legacy 內重新上樣式。 */
(function(){
'use strict';
window.fbBarHtml=function(){
  const zh=lang==='zh';
  if(!fbUser)return `<div class="v4-root v4-slab v4-account out"><span class="v4-avatar">${uiIcon('user',24)}</span><span class="v4-account-copy"><strong>${zh?'讓班表隨你同步':'Sinkronkan jadwal Anda'}</strong><small>${zh?'登入以備份班表與請假資料':'Login untuk mencadangkan jadwal dan cuti'}</small></span><button class="v4-btn primary account-login" onclick="fbLogin()" id="loginBtn" ${fbLoginPending?'disabled':''}>${fbLoginPending?(zh?'登入中…':'Memuat…'):(zh?'Google 登入':'Login Google')}</button></div>`;
  const name=fbUser.displayName||fbUser.email||'',pic=fbUser.photoURL?`<img src="${esc(fbUser.photoURL)}" alt="" referrerpolicy="no-referrer">`:uiIcon('user',24),busy=fbLoginPending||fbLogoutPending;
  return `<div class="v4-root v4-slab v4-account" aria-busy="${busy}"><div class="v4-account-top"><span class="v4-avatar">${pic}</span><span class="v4-account-copy"><strong>${esc(name)}</strong>${fbUser.displayName&&fbUser.email?`<small class="account-email">${esc(fbUser.email)}</small>`:''}<small class="unit">${S.unit?esc(S.unit==='__all'?(zh?'全部單位':'Semua unit'):S.unit):(zh?'尚未選擇單位':'Unit belum dipilih')}</small></span><span class="v4-sync"><i></i>${zh?'雲端同步':'Tersinkron'}</span></div><div class="v4-account-actions"><button type="button" class="v4-btn account-switch" onclick="fbSwitchAccount()" ${busy?'disabled':''}>${fbLoginPending?(zh?'正在切換…':'Mengganti…'):(zh?'切換其他帳號':'Ganti akun')}</button><button type="button" class="v4-btn account-logout" onclick="fbLogout()" ${busy?'disabled':''}>${fbLogoutPending?(zh?'登出中…':'Keluar…'):(zh?'登出':'Keluar')}</button></div></div>`;
};
window.uiFeatureDirectoryHtml=function(){
  const zh=lang==='zh',tile=(attr,icon,b,s)=>`<button ${attr}><span>${icon}</span><b>${b}</b><small>${s}</small></button>`;
  return `<div class="v4-root v4-features"><div class="v4-kicker"><h2>${zh?'功能捷徑':'Pintasan fitur'}</h2></div><div class="v4-feature-grid">${tile('data-a="salOpen"',studioIcon('money',22),zh?'計薪區間與規則':'Periode & aturan gaji',zh?'每月獨立設定':'Per bulan')}${tile('data-a="alEdit"',studioIcon('vacation',22),zh?'特休額度':'Kuota cuti tahunan',zh?'查看與調整餘額':'Lihat & atur kuota')}${tile('onclick="openWxLocation()"',studioIcon('location',22),zh?'天氣地點':'Lokasi cuaca',zh?'定位或手選地點':'GPS atau pilih lokasi')}${tile('data-a="prefs"',uiIcon('settings',22),zh?'動畫與警報':'Animasi & peringatan',zh?'分類開關與通知':'Sakelar & notifikasi')}</div></div>`;
};
/* ── 請假中心 ── 與原 uiLeaveSummaryHtml 相同的計算與動作；新增各假別時數比例條 */
window.uiLeaveSummaryHtml=function(y,m){
  const zh=lang==='zh';
  if(!fbUser)return `<div class="v4-root v4-slab v4-leavec empty"><div class="v4-sec-head"><span class="v4-sec-ic">${uiIcon('user',20)}</span><div><h2>${zh?'請假中心':'Pusat cuti'}</h2><p>${zh?'登入後查看個人請假統計':'Login untuk melihat statistik cuti'}</p></div></div><p class="v4-note">${zh?'請假時數、假別分布、特休餘額與即將到來的請假會集中顯示在這裡。':'Jam cuti, jenis cuti, sisa cuti tahunan, dan jadwal cuti akan tampil di sini.'}</p></div>`;
  const dm=dim(y,m),days=new Set(),byType={};let total=0,next=null;
  for(let d=1;d<=dm;d++){
    const date=ek(y,m,d);
    myLeave(date).forEach(l=>{
      const h=leaveHoursDetail(l).regularHours,lt=getLT(l.leaveType)||{};
      if(!(h>0))return;
      total+=h;days.add(date);
      const key=l.leaveType||'other';if(!byType[key])byType[key]={h:0,lt};byType[key].h+=h;
      const ts=new Date(date+'T00:00:00+08:00').getTime();
      if(ts>=new Date(TY,TM-1,TD).setHours(0,0,0,0)&&(!next||ts<next.ts))next={ts,date,h,lt,leaveType:l.leaveType};
    });
  }
  const r1=v=>Math.round(v*10)/10,types=Object.entries(byType).sort((a,b)=>b[1].h-a[1].h);
  const nameOf=(id,v)=>zh?(v.lt.name||id):(v.lt.nameId||v.lt.name||id);
  const bar=types.length?`<div class="v4-leavec-bar" aria-hidden="true">${types.map(([id,v])=>`<i style="flex:${v.h};background:${v.lt.color||'#8fd3ff'}"></i>`).join('')}</div>`:'';
  const chips=types.map(([id,v])=>`<span class="v4-leavec-type"><i style="background:${v.lt.color||'#8fd3ff'}"></i>${esc(nameOf(id,v))}<b>${r1(v.h)}h</b></span>`).join('')||`<span class="v4-none">${zh?'本月尚無請假紀錄':'Belum ada cuti bulan ini'}</span>`;
  const a=getAL(),hasAL=a.total>0;
  const nextText=next?`${next.date.slice(5).replace('-','/')} · ${esc(zh?(next.lt.name||next.leaveType):(next.lt.nameId||next.lt.name||next.leaveType))}`:(zh?'目前沒有':'Tidak ada');
  return `<div class="v4-root v4-slab v4-leavec"><div class="v4-sec-head"><span class="v4-sec-ic">${studioIcon('leave',20)}</span><div><h2>${zh?'請假中心':'Pusat cuti'}</h2><p>${zh?`${y}年${m}月`:`${m}/${y}`}</p></div><button class="v4-pill" data-a="tabCalendar">${zh?'查看班表':'Jadwal'}${uiIcon('chevron',14)}</button></div>`
   +`<div class="v4-leavec-metrics"><div><strong>${r1(total)}<small>h</small></strong><span>${zh?'請假時數':'Jam cuti'}</span></div><div><strong>${days.size}<small>${zh?'天':'hr'}</small></strong><span>${zh?'請假天數':'Hari cuti'}</span></div><button data-a="alEdit"${hasAL?'':' class="unset"'}><strong>${hasAL?r1(alRem())+'<small>h</small>':(zh?'未設定':'Belum')}</strong><span>${zh?'特休餘額':'Sisa tahunan'}</span></button></div>`
   +bar+`<div class="v4-leavec-types">${chips}</div><div class="v4-leavec-next"><span>${zh?'下一筆請假':'Cuti berikutnya'}</span><strong>${nextText}</strong></div></div>`;
};
window.uiMoreHtml=function(y,m){
  const zh=lang==='zh',lunarOn=!!S.showLunar,soundOn=!WxSfx.isMuted(),appearance=typeof MyShiftAppearance!=='undefined'?MyShiftAppearance.get():'auto';
  const row=(action,icon,title,sub,cls='')=>`<button class="v4-setrow ${cls}" data-a="${action}"><span class="v4-setrow-ic">${uiIcon(icon,20)}</span><span class="v4-setrow-copy"><strong>${title}</strong><small>${sub}</small></span>${uiIcon('chevron',17)}</button>`;
  const sw=(action,icon,title,sub,on)=>`<button class="v4-setrow" data-a="${action}" role="switch" aria-checked="${on}"><span class="v4-setrow-ic">${uiIcon(icon,20)}</span><span class="v4-setrow-copy"><strong>${title}</strong><small>${sub}</small></span><span class="v4-switch-knob${on?' on':''}" aria-hidden="true"><i></i></span></button>`;
  const group=(title,body)=>`<div class="v4-root v4-slab v4-setgroup"><h2>${title}</h2>${body}</div>`;
  const legacy=html=>html?`<div class="v4-root v4-slab v4-legacy">${html}</div>`:'';
  return group(zh?'介面外觀':'Tampilan',`<p class="v4-hint first">${zh?'日間清晰、夜間柔和；自動模式依所在地日出日落切換（無定位時 05:00／19:00）。':'Mode otomatis mengikuti matahari terbit/terbenam (tanpa lokasi: 05.00 / 19.00).'}</p><div class="v4-seg" role="group" aria-label="${zh?'外觀模式':'Mode tampilan'}">${[['auto',zh?'自動':'Otomatis','clock'],['light',zh?'日間':'Terang','sun'],['dark',zh?'夜間':'Gelap','moon']].map(([value,label,icon])=>`<button type="button" onclick="MyShiftAppearance.set('${value}')" aria-pressed="${appearance===value}">${studioIcon(icon,16)}${label}</button>`).join('')}</div>`)
   +group(zh?'偏好設定':'Preferensi',`<div class="v4-setrow static"><span class="v4-setrow-ic">${uiIcon('user',20)}</span><span class="v4-setrow-copy"><strong>${zh?'顯示語言':'Bahasa'}</strong></span><div class="v4-seg small" role="group" aria-label="${zh?'顯示語言':'Bahasa'}"><button class="${lang==='zh'?'active':''}" data-a="lzh" aria-pressed="${lang==='zh'}">中文</button><button class="${lang==='id'?'active':''}" data-a="lid" aria-pressed="${lang==='id'}">Indonesia</button></div></div>${sw('lunar','moon',zh?'農曆與宜忌':'Kalender lunar',lunarOn?(zh?'在班表中顯示':'Tampil di kalender'):(zh?'目前隱藏':'Disembunyikan'),lunarOn)}${sw('sfx','sound',zh?'真實自然音與按鍵聲':'Suara alam & tombol',soundOn?(zh?'已開啟':'Aktif'):(zh?'已靜音':'Dimatikan'),soundOn)}`)
   +legacy(uiUnitControlHtml())+uiFeatureDirectoryHtml()+legacy(natureControlsHtml())+uiLeaveSummaryHtml(y,m)
   +group(zh?'班表工具':'Alat jadwal',row('stats','chart',zh?'年度統計':'Statistik tahunan',zh?'班別、工時、加班與請假':'Shift, jam, lembur dan cuti')+row('share','share',zh?'分享班表':'Bagikan jadwal',zh?'儲存目前月份的班表圖片':'Ekspor gambar kalender bulan ini')+row('help','help',zh?'使用說明':'Bantuan',zh?'功能、標記與資料來源':'Fitur, tanda dan sumber data'))
   +group(zh?'天氣與通知':'Cuaca & notifikasi',row('prefs','settings',zh?'天氣與警報設定':'Cuaca & peringatan',zh?'定位、通知、動畫與音效':'Lokasi, notifikasi, animasi dan suara'))
   +(isAdmin()?group(zh?'單位管理':'Administrasi unit',row('leavesOv','calendar',zh?'單位請假總覽':'Ringkasan cuti unit',zh?'請假名單、時數與人力':'Nama, jam cuti dan tenaga')):'')
   +`<div class="v4-root v4-slab v4-setgroup danger">${row('reset','refresh',zh?'重新設定輪班':'Atur ulang shift',zh?'重新選擇班制與輪班位置':'Pilih kembali pola dan posisi shift','danger')}</div>`;
};
if(typeof render==='function')render();
})();
