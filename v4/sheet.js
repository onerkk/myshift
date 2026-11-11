/* MyShift v4 — 日期彈窗（請假／調班／標記事項）與全站彈窗外框
   表單的 id、事件處理（doShiftAdj / submitLeave / removeLeave / setLeavePreset / adminSetLeave / tev / alh / tyh / tyw …）
   與原版完全相同；JS 依賴的類名（modal-bg、modal-sheet、leave-entry、day-brief、#day-shift-section、#day-event-section）保留。
   新增：班別橫幅顯示上下班時間與正常／加班時數。 */
(function(){
'use strict';
const SK={'早':'early','中':'mid','晚':'night','休':'off'},sk=s=>SK[s]||'none';
const TONES=['meeting','health','pay','annual','personal','holiday','adjusted'],tone=x=>TONES.includes(x)?x:'own';

window.uiDaySheetNavigationHtml=function(){
  const zh=lang==='zh';
  return `<nav class="day-sheet-nav v4-sheet-nav" aria-label="${zh?'日期操作捷徑':'Pintasan tanggal'}">${[['leave',zh?'請假':'Cuti'],['shift',zh?'調班':'Ubah shift'],['events',zh?'標記事項':'Tandai agenda']].map(([id,label])=>`<button onclick="experienceJumpDay('${id}')">${label}</button>`).join('')}<button class="day-nav-close" data-a="close" aria-label="${zh?'關閉日期視窗':'Tutup detail tanggal'}">×</button></nav>`;
};
window.uiDaySheetDateControlHtml=function(y,m,d){
  const zh=lang==='zh';
  return `<div class="v4-stepper"><button class="prev" onclick="experienceMoveDay(-1)" aria-label="${zh?'前一天':'Hari sebelumnya'}">${uiIcon('chevron',18)}</button><label><span>${zh?'操作日期':'Tanggal yang dipilih'}</span><input type="date" value="${ek(y,m,d)}" aria-label="${zh?'選擇請假與事項日期':'Pilih tanggal cuti dan agenda'}" onchange="experienceChooseDay(this.value)"></label><button onclick="experienceMoveDay(1)" aria-label="${zh?'後一天':'Hari berikutnya'}">${uiIcon('chevron',18)}</button></div>`;
};
window.calendarDaySummaryHtml=function(y,m,d){
  const day=calendarDayInfo(y,m,d),zh=lang==='zh';
  const chips=day.events.map(e=>`<span class="v4-chip tone-${tone(e.tone)}">${esc(e.label)}</span>`).join('')+(day.adjusted?`<span class="v4-chip tone-adjusted">${zh?'已調班':'Shift diubah'}</span>`:'')+(day.holiday?`<span class="v4-chip tone-holiday">${esc(day.holiday)}</span>`:'');
  return `<section class="day-brief v4-card" aria-label="${zh?'當日事項':'Agenda hari ini'}"><header><h3>${zh?'當日事項':'Agenda hari ini'}</h3><span class="v4-count-pill${day.leaveCount>0?' has':''}">${esc(calendarLeaveLabel(day))}</span></header><div class="v4-chips">${chips||`<span class="v4-none">${zh?'目前沒有其他事項':'Belum ada agenda lain'}</span>`}</div><small>${esc(S.unit==='__all'?(zh?'全部單位':'Semua unit'):S.unit||(zh?'目前範圍':'Lingkup saat ini'))} · ${esc(calendarLeaveStatusText(day.status))}</small></section>`;
};
window.shiftAdjHtml=function(y,m,d){
  const zh=lang==='zh',key=ek(y,m,d),orig=gsOrig(y,m,d),isOv=!!SHIFT_OV[key],cur=SHIFT_OV[key]||orig;
  if(orig===null)return'';
  const opts=[['早',zh?'早班':'Pagi'],['中',zh?'中班':'Siang'],['晚',zh?'晚班':'Malam'],['休',zh?'休假':'Libur']];
  const origLabel=(opts.find(o=>o[0]===orig)||[0,orig])[1];
  return `<section class="v4-card v4-adj" id="day-shift-section"><h3>${uiIcon('refresh',17)}${zh?'調班':'Ubah shift'}<small>${zh?'特殊狀況改這天班別':'Hanya untuk hari ini'}</small></h3><div class="v4-adj-opts">${opts.map(([v,label])=>`<button type="button" class="v4-s-${sk(v)}${cur===v?' on':''}${orig===v?' orig':''}" aria-pressed="${cur===v}" onclick="doShiftAdj('${key}','${v}')"><i></i>${label}</button>`).join('')}</div>${isOv?`<div class="v4-adj-foot"><span>${zh?'原班表為「'+origLabel+'」':'Asli: '+origLabel}</span><button onclick="doShiftAdj('${key}','')" class="v4-btn ghost">${zh?'↩ 還原原班':'↩ Reset'}</button></div>`:`<p class="v4-hint">${zh?'點上方按鈕即可把這天改成其他班別，只影響這一天。會自動重算工時與薪資。':'Klik untuk ubah shift hari ini saja.'}</p>`}</section>`;
};
window.modalLeaveHtml=function(y,m,d){
  const zh=lang==='zh',date=ek(y,m,d),leaves=calendarScopedLeaves(date),myLeaves=myLeave(date),rule=getShiftWorkRule(y,m,d);
  const uniqueCount=a=>new Set((a||[]).filter(isRegularLeave).map((l,i)=>String(l.uid||l.docId||'record_'+i)+(String(l.uid||'').startsWith('admin_')?'|'+(l.unit||''):''))).size;
  let html='';
  const realLeaves=leaves.filter(l=>isRegularLeave(l)&&!String(l.uid||'').startsWith('admin_'));
  if(leaves.length&&isAdmin()&&realLeaves.length){
    const realPeople=uniqueCount(realLeaves);
    html+=`<section class="v4-card v4-leave-list"><h3>${studioIcon('leave',17)}${zh?'今日 '+realPeople+' 人請假':realPeople+' orang cuti'}</h3>${realLeaves.map(l=>{
      const lt=getLT(l.leaveType);let timeStr='';
      if(l.ts&&l.ts.toDate){const dt=l.ts.toDate();timeStr=`${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`}
      return `<div class="v4-leave-row" style="--lt:${lt?lt.color:'#999'}"><b>${esc(l.name)} ${esc(leaveRecordLabel(l))}${l.unit&&l.unit!==S.unit?' ['+esc(l.unit)+']':''}</b><small>🕒 ${esc(formatLeaveRange(l,date))}</small>${timeStr?`<small class="dim">${zh?'登記 ':'Dicatat '}${timeStr}</small>`:''}${l.reason?`<small class="reason">💬 ${esc(l.reason)}</small>`:''}</div>`;
    }).join('')}</section>`;
  }
  if(fbUser&&myLeaves.length){
    html+=`<section class="v4-card v4-leave-list mine"><h3>${studioIcon('leave',17)}${zh?'我的請假':'Cuti saya'}</h3>${myLeaves.map(l=>{
      const lt=getLT(l.leaveType);
      return `<div class="v4-leave-row" style="--lt:${lt?lt.color:'#999'}"><div class="v4-leave-row-top"><span><b>${esc(leaveRecordLabel(l))}</b><small>🕒 ${esc(formatLeaveRange(l,date))}</small></span><button class="v4-btn danger" onclick="removeLeave('${date}','${l.leaveType}','${l.docId||''}')">${zh?'取消':'Batal'}</button></div>${l.reason?`<small class="reason">💬 ${esc(l.reason)}</small>`:''}${!hasPreciseLeaveTime(l)?`<small class="warn">⚠️ ${zh?'舊紀錄沒有起訖時間；薪資暫沿用舊推算。建議取消後重登。':'Data lama tanpa waktu; masukkan ulang untuk akurat.'}</small>`:''}</div>`;
    }).join('')}</section>`;
  }
  if(fbUser&&Object.prototype.hasOwnProperty.call(OTD,date)){
    html+=`<div class="leave-legacy-note v4-legacy">${zh?'舊紀錄：當日加班 ':'Data lama: lembur hari ini '}${Math.max(0,+OTD[date]||0)}h <button onclick="clearLegacyOT('${date}')">${zh?'取消舊紀錄':'Hapus data lama'}</button></div>`;
  }
  if(fbUser&&rule.isWork){
    const full=rule.regularMinutes+rule.overtimeMinutes;
    const oldOT=Object.prototype.hasOwnProperty.call(OTD,date)?`<div class="leave-legacy-note v4-legacy">${zh?`此日舊加班紀錄為 ${OTD[date]}h；新增後改依請假時段自動計算。`:`Lembur lama ${OTD[date]}h; setelah simpan dihitung dari waktu cuti.`}</div>`:'';
    html+=`<section class="leave-entry v4-card v4-leave-form">
      <h3 class="leave-entry-title">${studioIcon('leave',17)}${zh?'新增請假':'Tambah cuti'}</h3>
      <label class="v4-field"><span>${zh?'假別':'Jenis cuti'}</span><select id="leaveTypeSel" aria-label="${zh?'假別':'Jenis cuti'}" onchange="updateLeaveTimeOptions('${date}')">${getLeaveTypes().map(lt=>`<option value="${esc(lt.id)}">${esc(zh?lt.name:(lt.nameId||lt.name))}</option>`).join('')}</select></label>
      <p class="leave-shift-hint v4-hint">${zh?`班別 ${formatShiftOffset(rule,0)}–${formatShiftOffset(rule,full)} · 正常 ${rule.regularMinutes/60}h${rule.overtimeMinutes?`＋加班 ${rule.overtimeMinutes/60}h`:''}`:`Shift ${formatShiftOffset(rule,0)}–${formatShiftOffset(rule,full)} · Normal ${rule.regularMinutes/60}h${rule.overtimeMinutes?` + lembur ${rule.overtimeMinutes/60}h`:''}`}</p>
      <div class="v4-field-row"><label class="v4-field" for="leaveStartSel"><span>${zh?'開始':'Mulai'}</span><select id="leaveStartSel" onchange="updateLeaveTimePreview('${date}')"></select></label><label class="v4-field" for="leaveEndSel"><span>${zh?'結束':'Selesai'}</span><select id="leaveEndSel" onchange="updateLeaveTimePreview('${date}')"></select></label></div>
      <div class="v4-presets"><button onclick="setLeavePreset('${date}','full')">${zh?`全班 ${rule.shiftHours}h`:`Penuh ${rule.shiftHours}h`}</button><button onclick="setLeavePreset('${date}','regular')">${zh?`正常 ${rule.regularMinutes/60}h`:`Normal ${rule.regularMinutes/60}h`}</button>${rule.overtimeMinutes?`<button onclick="setLeavePreset('${date}','overtime')">${zh?'只不加班':'Tanpa lembur'}</button>`:''}</div>
      <div id="leaveTimePreview" class="leave-time-preview v4-preview" role="status" aria-live="polite"></div>
      ${oldOT}
      <label class="v4-field"><span>${zh?'原因（選填，僅管理員可見）':'Alasan (opsional, hanya admin)'}</span><input type="text" id="leaveReasonIn" maxlength="50" aria-label="${zh?'請假原因（選填）':'Alasan (opsional)'}" placeholder="${zh?'原因（選填，僅管理員可見）':'Alasan (opsional, hanya admin)'}"></label>
      <button id="leaveSubmitBtn" class="leave-submit v4-btn primary wide" onclick="submitLeave('${date}')">${zh?'確認新增':'Simpan'}</button>
    </section>`;
  }else if(fbUser&&!rule.isWork)html+=`<p class="v4-card v4-restday">${zh?'此日為休假日，沒有正常工時，不建立請假紀錄。':'Hari libur, tidak perlu cuti.'}</p>`;
  if(isAdmin()){
    const people=uniqueCount(leaves);
    html+=`<section class="admin-leave-edit v4-card v4-admin"><h3>👑 ${zh?'管理員：手動設定請假人數':'Admin: Set jumlah cuti'}</h3><div class="v4-inline"><input type="number" aria-label="${zh?'當日請假人數':'Jumlah cuti hari ini'}" id="adminLeaveN" min="0" value="${people}" placeholder="0"><button class="v4-btn primary" onclick="adminSetLeave('${date}')">${zh?'確認':'OK'}</button></div></section>`;
  }
  return html;
};
window.adminEvModalHtml=function(y,m,d){
  if(!isAdmin())return'';
  const zh=lang==='zh',date=ek(y,m,d),aevs=getAdminEv(date);
  return `<section class="v4-card v4-admin"><h3>👑 ${zh?'管理員：單位事項':'Admin: Agenda unit'}</h3><div class="v4-admin-evs">${ADMIN_EV.map(type=>{const active=aevs.includes(type);return `<button class="v4-btn ${active?'danger':'ghost'}" onclick="${active?`removeAdminEvBtn('${date}','${type}')`:`addAdminEvBtn('${date}','${type}')`}">${EE[type]} ${active?(zh?'取消':'Batal'):(zh?'設定':'Set')} ${en(type)}</button>`}).join('')}</div></section>`;
};
window.rMod=function(){
  const zh=lang==='zh',{y,m,d}=S.modal,key=ek(y,m,d),s=gs(y,m,d),hol=gh(y,m,d),ev=EVS[key]||[],dw=new Date(y,m-1,d).getDay(),WK=t('wk');
  const rule=getShiftWorkRule(y,m,d),time=studioShiftTime(rule),isToday=y===TY&&m===TM&&d===TD;
  const evR=EI.filter(id=>!ADMIN_EV.includes(id)).map(id=>{const a=ev.includes(id);return `<button class="ev-item v4-ev${a?' on':''}" data-a="tev" data-eid="${id}" aria-pressed="${a}"><span class="v4-ev-emoji">${EE[id]}</span><span class="v4-ev-name">${en(id)}</span><i class="v4-ev-check">${a?'✓':''}</i></button>`}).join('');
  const ds=zh?`${m}月${d}日 週${WK[dw]}`:`${WK[dw]}, ${d}/${m}/${y}`;
  const hours=(sel,max=12)=>{let o='';for(let h=0.5;h<=max;h+=0.5)o+=`<option value="${h}"${h===sel?' selected':''}>${h} ${t('hr')}</option>`;return o};
  let alP='';if(ev.includes('annualL'))alP=`<section class="v4-card v4-pick"><label class="v4-field"><span>🌴 ${t('alPick')}（${t('alRem')}: ${alRem()}${t('hr')}）</span><select id="alSel" data-a="alh">${hours(ALD[key]||0)}</select></label></section>`;
  let custP='';if(ev.includes('custom'))custP=`<section class="v4-card v4-pick"><label class="v4-field"><span>📝 ${zh?'備註內容':'Isi catatan'}</span><input type="text" id="custIn" value="${esc(NOTES[key]||'')}" placeholder="${zh?'輸入備註...':'Tulis catatan...'}" maxlength="50" oninput="NOTES['${key}']=this.value;sNotes()"></label></section>`;
  let tyP='';if(ev.includes('typhoon')){
    const meta=TYM[key]||{},pol=(SAL&&SAL.disasterPolicy)||'normalOnly',polText=zh?(pol==='unpaid'?'依設定不給薪':pol==='normalOnly'?'只給正常 8h、不計排定加班':'本薪與排定加班照給、不列請假扣款'):(pol==='unpaid'?'tidak dibayar':pol==='normalOnly'?'hanya jam normal':'dibayar penuh');
    tyP=`<section class="v4-card v4-pick disaster-pick"><label class="v4-field"><span>🌀 ${zh?'颱風假（停班）時數':'Jam Libur Topan'}</span><select id="tySel" data-a="tyh">${hours(TYD[key]||0)}</select></label>${meta.auto?`<p class="disaster-source v4-hint">${zh?'依人事總處停班公告自動建立':'Otomatis dari pengumuman DGPA'}${meta.text?`：${esc(meta.text)}`:''}</p>`:''}<button type="button" class="disaster-worked v4-toggle${meta.worked?' on':''}" data-a="tyw" aria-pressed="${!!meta.worked}"><i></i><span><b>${zh?'停班日仍出勤':'Tetap masuk kerja'}</b><small>${zh?(meta.worked?'已標記出勤：不列天災假，依設定倍率計出勤加給':'未出勤：依公司政策給薪'):(meta.worked?'Ditandai masuk':'Tidak masuk')}</small></span></button><p class="v4-hint">${zh?`薪資：${polText}（勞動部天然災害要點第 7 點：未出勤宜不扣薪，出勤宜加給）。可在薪資規則修改。`:`Gaji: ${polText}.`}</p></section>`;
  }
  let leaveHtml;try{leaveHtml=modalLeaveHtml(y,m,d)}catch(e){leaveHtml='<p class="v4-card v4-err">Leave error: '+esc(e.message)+'</p>'}
  return `<div class="modal-bg" data-a="close"><div class="modal-sheet v4-sheet v4-s-${sk(s)}" role="dialog" aria-modal="true" aria-labelledby="day-dialog-title" onclick="event.stopPropagation()"><div class="modal-handle"></div>`
   +`<header class="v4-sheet-head"><div><p>${isToday?(zh?'今天':'Hari ini'):y}</p><h2 class="modal-title" id="day-dialog-title">${ds}</h2></div>${hol?`<span class="v4-chip tone-holiday">🎌 ${esc(hol)}</span>`:''}</header>`
   +uiDaySheetNavigationHtml()+uiDaySheetDateControlHtml(y,m,d)
   +`<div class="modal-shift v4-shiftband"><span class="v4-shiftband-dot"></span><div><b class="modal-shift-name">${sf(s)}</b><small>${rule.isWork?`${time.range} · ${zh?'正常':'Normal'} ${rule.regularMinutes/60}h${rule.overtimeMinutes?(zh?'＋加班 ':' + lembur ')+rule.overtimeMinutes/60+'h':''}`:s==='休'?(zh?'不需出勤':'Tidak perlu bekerja'):(zh?'尚未排班':'Belum ada shift')}</small></div>${SHIFT_OV[key]?`<span class="v4-chip tone-adjusted">${zh?'已調班':'Shift diubah'}</span>`:''}</div>`
   +calendarDaySummaryHtml(y,m,d)+shiftAdjHtml(y,m,d)+leaveHtml+adminEvModalHtml(y,m,d)
   +`<h3 class="modal-section v4-sheet-sec" id="day-event-section">${t('mark')}</h3><div class="ev-list v4-evs">${evR}</div>${alP}${tyP}${custP}${S.showLunar?`<div class="v4-lunar">${lunarModalBlock(y,m,d)}</div>`:''}`
   +`<button class="modal-done v4-btn primary wide" data-a="close">${t('done')}</button></div></div>`;
};
if(typeof render==='function')render();
})();
