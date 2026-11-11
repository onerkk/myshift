/* MyShift v4 — 薪資頁
   計算全部來自 calcSalaryEst / calcPayPeriod / Payroll.*；每個顯示條件與原 uiSalaryDashboardHtml 相同。
   明細列、對帳表、逐日依據、夜點校準、歷月核對沿用原函式輸出（條件分支很多，不重寫以免漏項），由 .v4-pay 範圍重新上樣式。
   新增：應領組成比例條、特休使用進度條。 */
(function(){
'use strict';
const PAL=['#61ebad','#8fd3ff','#ffd27a','#c3b4ff','#ff9c8f','#7fe3d2','#ffb86b','#b6c4d8'];
function compositionHtml(src,isSlip){
  const zh=lang==='zh',labels=salaryFieldLabels(),keys=isSlip?Payroll.incomeKeys:['baseSum','proposal','otherIncome','otPay','holidayPay','nightPay','disasterPay'];
  const items=keys.map(k=>[k,Number(src[k])||0]).filter(x=>x[1]>0);if(items.length<2)return'';
  const total=items.reduce((n,x)=>n+x[1],0);
  return `<div class="v4-comp"><div class="v4-comp-head"><span>${zh?'應領組成':'Komposisi pendapatan'}</span></div><div class="v4-comp-bar" aria-hidden="true">${items.map((x,i)=>`<i style="flex:${x[1]/total};background:${PAL[i%PAL.length]}"></i>`).join('')}</div><div class="v4-comp-legend">${items.map((x,i)=>`<span><i style="background:${PAL[i%PAL.length]}"></i>${labels[x[0]]||x[0]}<b>${Math.round(x[1]/total*100)}%</b></span>`).join('')}</div></div>`;
}
window.uiSalaryDashboardHtml=function(y,m){
  const zh=lang==='zh',pp=calcPayPeriod(y,m);if(!pp||!rot())return'';
  const payMY=m===12?{y:y+1,m:1}:{y,m:m+1};
  const pay5=getPayDay(payMY.y,payMY.m,5),pay20=getPayDay(payMY.y,payMY.m,20);
  const label=zh?`${y} 年 ${m} 月`:`${String(m).padStart(2,'0')} / ${y}`;
  const period=`${salaryDateLabel(pp.sd)} – ${salaryDateLabel(pp.ed)}`;
  const head=`<div class="v4-root v4-payhead"><div class="v4-payhead-nav"><button class="v4-round prev" data-a="payPrev" aria-label="${zh?'上個薪資月':'Bulan gaji sebelumnya'}">${uiIcon('chevron',18)}</button><div><h2>${label}</h2><p>${period}</p></div><button class="v4-round" data-a="payNext" aria-label="${zh?'下個薪資月':'Bulan gaji berikutnya'}">${uiIcon('chevron',18)}</button></div><div class="v4-payhead-jump"><button class="v4-pill" data-a="payLatest">${zh?'最近已結算':'Terbaru'}</button><button class="v4-pill grow" data-a="payCurrent">${studioIcon('clock',15)}<span>${zh?'本期試算 · 請假後自動更新':'Periode aktif · otomatis setelah cuti'}</span>${uiIcon('chevron',14)}</button></div></div>`;
  const est=calcSalaryEst(y,m);
  if(!est)return `<div class="v4-pay">${head}<div class="v4-root v4-slab v4-payempty"><span class="v4-payempty-ic">${studioIcon('money',34)}</span><h3>${zh?'先設定，再掌握薪資':'Atur data gaji Anda'}</h3><p>${zh?'填入固定應領、扣款與加班規則，即可查看預估實領。':'Masukkan data tetap untuk estimasi.'}</p><button class="v4-btn primary" data-a="salOpen">${zh?'設定薪資資料':'Atur data gaji'}${uiIcon('arrow',17)}</button></div></div>`;
  const actual=est.hasSlip?est.official:null,display=actual||est;
  const autoBadge=`<span class="v4-badge">${zh?'薪資紀錄 · 自動核算':'Catatan gaji · hitungan otomatis'}</span>`;
  if(est.dataPending&&!actual)return `<div class="v4-pay">${head}<div class="v4-root v4-slab v4-paynet pending">${autoBadge}<p class="t">${salaryForecastTitle(est)}</p><p class="m">${salaryNoteText('leaveNotReady')}</p><button class="v4-btn" data-a="salRefresh">${zh?'重新同步':'Sinkronkan lagi'}</button></div></div>`;
  const gross=Math.max(1,display.income),netPct=Math.max(0,Math.min(100,display.net/gross*100)),dedPct=100-netPct;
  const notes=(est.notes||[]).map(k=>`<li>${salaryNoteText(k)}</li>`).join('');
  const moneyTitle=actual?(zh?'公司實領 · 既有薪資條':'Gaji bersih · slip tersimpan'):salaryForecastTitle(est);
  const meta=actual?(zh?'自動讀取你已提供的薪資條；下方另外顯示班表計算與差額。':'Slip tersimpan dimuat otomatis; estimasi jadwal ditampilkan terpisah.'):est.missingComponents?(zh?'缺少項目未當作 0 元結清，這不是完整實領。':'Komponen yang belum diketahui tidak dianggap nol.'):(zh?'班表 × 公司規則 · 修改出勤後自動重算':'Jadwal × aturan · diperbarui otomatis');
  const metrics=est.dataPending?'':`<div class="v4-paymetrics"><div><strong>${est.workedDays===undefined?pp.wd:est.workedDays}<small>${zh?'天':'hri'}</small></strong><span>${zh?'扣假後出勤':'Kerja setelah cuti'}</span></div><div><strong>${Math.round((est.workedHours===undefined?pp.tH:est.workedHours)*100)/100}<small>h</small></strong><span>${zh?'扣假後工時':'Jam setelah cuti'}</span></div><div><strong>${est.otH}<small>h</small></strong><span>${zh?'估算加班':'Estimasi lembur'}</span></div></div>`;
  const disasterMeta=!actual&&(est.disasterH>0||est.disasterWorkedH>0)?`<div class="v4-paytags"><b>🌀 ${zh?'天災假':'Bencana'}</b>${est.disasterH>0?`<span>${zh?'停班未出勤':'Libur'} ${est.disasterAbsentH||est.disasterH}h${est.disasterAutoCount?(zh?' · 自動公告':' · otomatis'):''}</span>`:''}${est.disasterWorkedH>0?`<span>${zh?'停班日出勤':'Tetap masuk'} ${est.disasterWorkedH}h</span>`:''}${est.disasterOtCut>0?`<span>${zh?'不計加班':'Lembur dipotong'} ${est.disasterOtCut}h</span>`:''}</div>`:'';
  const companyHours=actual?`<div class="v4-paytags"><b>${zh?'公司時數':'Jam slip'}</b>${[['weekdayH','平日','Biasa'],['holidayH','假日','Libur'],['sickH','病假','Sakit'],['disasterH','天災假','Bencana']].filter(([k])=>Payroll.number(actual[k])!==null).map(([k,z,id])=>`<span>${zh?z:id} ${actual[k]}h</span>`).join('')}</div>`:'';
  const salaryRows=actual?studioSalaryRows(Object.assign({isSlip:true},actual)):studioSalaryRows(est);
  const recon=salaryReconciliationHtml(est),fold=(cls,open,sum,body)=>`<details class="v4-root v4-slab v4-fold ${cls}"${open?' open':''}><summary><span>${sum}</span>${uiIcon('chevron',18)}</summary>${body}</details>`;
  const daily=salaryDailyAuditHtml(est),history=salaryHistoryHtml(),night=salaryNightCalibrationHtml(est);
  return `<div class="v4-pay">${head}`
   +`<div class="v4-root v4-slab v4-paynet${est.incomplete?' incomplete':''}${actual?' slip':''}"><div class="v4-paynet-top">${autoBadge}<span class="v4-paynet-seal" aria-hidden="true">${studioIcon(actual?'shield':'money',22)}</span></div><p class="t">${moneyTitle}</p><strong class="v4-paynet-num">${studioMoney(display.net)}</strong><p class="m">${meta}</p>`
     +`<div class="v4-flow"><div class="v4-flow-track" aria-hidden="true"><i style="width:${netPct}%"></i><b style="width:${dedPct}%"></b></div><div class="v4-flow-label"><span><i class="in"></i>${zh?'應領':'Pendapatan'}<b>${studioMoney(display.income)}</b></span><span><i class="out"></i>${zh?'應扣':'Potongan'}<b>${studioMoney(display.deduction)}</b></span></div></div>`
     +compositionHtml(display,!!actual)+metrics+disasterMeta+companyHours+`</div>`
   +`<div class="v4-root v4-paydates"><div class="v4-slab-lite">${studioIcon('money',20)}<span><small>${zh?'發薪日':'Tanggal gaji'}</small><strong>${actual&&actual.payDate?esc(actual.payDate.slice(5).replace('-',' / ')):payMY.m+' / '+pay5}</strong></span></div><div class="v4-slab-lite">${studioIcon('award',20)}<span><small>${zh?'績效獎金':'Bonus kinerja'}</small><strong>${payMY.m} / ${pay20}</strong></span></div></div>`
   +fold('rows',true,studioIcon('trend',18)+(actual?(zh?'公司薪資明細':'Rincian slip'):(zh?'估算明細':'Rincian estimasi')),`<div class="salary-detail-list">${salaryRows}</div>`)
   +(notes?`<aside class="v4-root v4-slab v4-paycall"><strong>${zh?'估算仍有待確認項目':'Estimasi perlu diperiksa'}</strong><ul>${notes}</ul><button class="v4-btn" data-a="salOpen">${zh?'查看計算依據':'Lihat dasar perhitungan'}</button></aside>`:'')
   +(night?`<div class="v4-root v4-slab v4-paylegacy">${night}</div>`:'')
   +(recon?fold('recon',true,zh?'班表自動計算與公司差額':'Estimasi otomatis vs slip',recon):'')
   +fold('formula',false,zh?'估算公式與時數':'Rumus estimasi',`<div class="salary-detail-meta"><span>${zh?'固定時薪':'Per jam'} $${est.hourly.toFixed(2)}</span><span>${zh?'加班基數時薪':'Basis lembur'} $${est.otHourly.toFixed(2)}</span><span>${zh?'請假基數時薪':'Basis cuti'} $${est.leaveHourly.toFixed(2)}</span></div><p class="payroll-help">${zh?`病假合計 ${est.sickPayH||0}h，依每天生效的薪資與扣薪率加總＝${studioMoney(est.sickDed)}。平日加班前段 ${est.totalFront||0}h、後段 ${est.totalBack||0}h。夜點依逐日${est.nightMode==='hour'?'夜間出勤時段':'出勤班次'}與當日單價加總＝${studioMoney(est.nightPay)}；逐日明細顯示時數、單價及取整前金額。免稅與應稅不按比例推算。`:`Sakit tercatat ${est.sickH||0}h / dihitung ${est.sickPayH||0}h. Lembur tingkat 1: ${est.totalFront||0}h; tingkat 2: ${est.totalBack||0}h.`}</p>`)
   +(daily?`<div class="v4-root v4-slab v4-paylegacy">${daily}</div>`:'')+(history?`<div class="v4-root v4-slab v4-paylegacy">${history}</div>`:'')
   +`<p class="v4-root v4-paydisc">${studioIcon('info',16)}<span>${zh?'依班表與已記錄的獎金自動試算；未登記的浮動獎金不在此金額內。':'Dihitung dari jadwal dan bonus tercatat; bonus yang belum tercatat tidak termasuk.'}</span></p></div>`;
};
/* 特休列（薪資頁底部）：同動作 alEdit，新增使用進度條 */
window.MyShiftV4=window.MyShiftV4||{};
window.MyShiftV4.annualBar=function(){
  const zh=lang==='zh',al=getAL(),has=al.total>0,rem=has?alRem():0,used=has?Math.max(0,al.total-rem):0,pct=has?Math.max(0,Math.min(100,used/al.total*100)):0;
  return `<button class="v4-root v4-slab v4-al" data-a="alEdit"><span class="v4-sec-ic">${studioIcon('leave',22)}</span><span class="v4-al-copy"><strong>${has?t('alRem'):(zh?'設定年度特休':'Atur cuti tahunan')}</strong><small>${alYRange(curALY())}</small>${has?`<i class="v4-al-bar"><u style="width:${pct.toFixed(1)}%"></u></i><small>${zh?`已用 ${used} / ${al.total} ${t('hr')}`:`Terpakai ${used} / ${al.total} ${t('hr')}`}</small>`:''}</span><b>${has?rem+'<small>'+t('hr')+'</small>':uiIcon('chevron',18)}</b></button>`;
};
if(typeof render==='function')render();
})();
