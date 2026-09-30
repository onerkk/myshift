/* v319: read-only schedule views. Existing roster, leave and payroll remain authoritative. */
'use strict';
// v323: one continuous Sunday-to-Saturday date range for the app and PNG.
function experienceMonthDates(y,m){
  if(!Number.isInteger(y)||!Number.isInteger(m)||m<1||m>12)throw Error('Invalid calendar month');
  const first=new Date(y,m-1,1,12).getDay(),length=new Date(y,m,0,12).getDate(),size=Math.ceil((first+length)/7)*7;
  return Array.from({length:size},(_,i)=>{
    const date=new Date(y,m-1,1-first+i,12),yy=date.getFullYear(),mm=date.getMonth()+1;
    return{y:yy,m:mm,d:date.getDate(),inMonth:yy===y&&mm===m,monthOffset:(yy-y)*12+mm-m};
  });
}
function experienceOwnLeaveEvents(key){
  if(!fbUser)return[];
  const grouped=new Map();
  for(const leave of myLeave(key)){
    const detail=leaveHoursDetail(leave),hours=Math.max(0,Number(detail.regularHours)||0),ot=Math.max(0,Number(detail.overtimeHours)||0);
    const lt=getLT(leave.leaveType),fallback={sick:['病假','Cuti sakit'],personal:['事假','Izin pribadi'],annual:['特休','Cuti tahunan']};
    const name=(lt&&(lang==='zh'?lt.name:lt.nameId||lt.name))||(fallback[leave.leaveType]||[leave.leaveType||'未知假別',leave.leaveType||'Jenis tidak dikenal'])[lang==='zh'?0:1],annual=leave.leaveType==='annual'||lt&&(lt.name==='特休'||lt.nameId==='Cuti Tahunan');
    if(hours>0){const id='own-'+leave.leaveType,item=grouped.get(id)||{id,tone:'own-leave',name,hours:0,annual};item.hours+=hours;grouped.set(id,item)}
    if(ot>0){const id='own-overtime',item=grouped.get(id)||{id,tone:'own-leave',name:lang==='zh'?'未加班':'Tanpa lembur',hours:0};item.hours+=ot;grouped.set(id,item)}
  }
  return [...grouped.values()].map(item=>({...item,label:(lang==='zh'?'本人 ':'Saya · ')+item.name+' '+Math.round(item.hours*100)/100+'h',short:item.name+' '+Math.round(item.hours*100)/100+'h',own:true}));
}
function experienceShiftTimeline(now=new Date()){
  const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()),stamp=now.getTime(),rows=[];
  for(let i=-1;i<=31;i++){
    const dt=new Date(date);dt.setDate(dt.getDate()+i);
    const y=dt.getFullYear(),m=dt.getMonth()+1,d=dt.getDate(),rule=getShiftWorkRule(y,m,d);
    if(!rule.isWork)continue;
    const start=new Date(y,m-1,d);start.setMinutes(rule.startMinute);
    const end=new Date(start.getTime()+rule.shiftHours*3600000);
    rows.push({y,m,d,key:ek(y,m,d),rule,shift:rule.shift||gs(y,m,d),start,end,offset:i});
  }
  const active=rows.find(row=>row.start.getTime()<=stamp&&stamp<row.end.getTime()),today=rows.find(row=>row.offset===0),next=rows.find(row=>row.start.getTime()>stamp)||null;
  const row=active||today||null,phase=active?'running':today?(stamp<today.start.getTime()?'upcoming':'finished'):'off';
  const elapsed=active?(stamp-active.start.getTime())/60000:phase==='finished'?row.rule.shiftHours*60:0;
  return {row,next,phase,previous:!!active&&active.offset<0,progress:row?Math.max(0,Math.min(100,elapsed/(row.rule.shiftHours*60)*100)):0,
    remaining:row?Math.max(0,Math.ceil(((phase==='upcoming'?row.start:row.end).getTime()-stamp)/60000)):0,
    stage:active&&elapsed>=(active.rule.regularMinutes??Math.min(8,active.rule.shiftHours)*60)?'overtime':'regular'};
}
function experienceRestRun(y,m,d){
  for(let i=0;i<90;i++){
    const start=new Date(y,m-1,d+i),sy=start.getFullYear(),sm=start.getMonth()+1,sd=start.getDate();
    if(gs(sy,sm,sd)!=='休')continue;
    let count=1;for(;count<90;count++){const date=new Date(sy,sm-1,sd+count);if(gs(date.getFullYear(),date.getMonth()+1,date.getDate())!=='休')break}
    const end=new Date(sy,sm-1,sd+count-1);
    return{y:sy,m:sm,d:sd,start:ek(sy,sm,sd),end:ek(end.getFullYear(),end.getMonth()+1,end.getDate()),count,offset:i,capped:count===90};
  }
  return null;
}
function experienceDateRange(start,end){
  const a=start.split('-').map(Number),b=end.split('-').map(Number),same=start===end;
  return `${a[1]}/${a[2]}${same?'':` – ${a[0]!==b[0]?b[0]+'/':''}${b[1]}/${b[2]}`}`;
}
function uiDayFocusHtml(){
  const zh=lang==='zh',day=calendarDayInfo(TY,TM,TD),tomorrow=new Date(TY,TM-1,TD+1),y=tomorrow.getFullYear(),m=tomorrow.getMonth()+1,d=tomorrow.getDate();
  const nextDay=calendarDayInfo(y,m,d),rule=getShiftWorkRule(y,m,d),rest=experienceRestRun(TY,TM,TD),items=day.events.slice(0,4);
  return `<section class="day-focus"><header class="section-kicker"><h2>${zh?'班表助手':'Asisten jadwal'}</h2><button data-a="openDate" data-y="${TY}" data-m="${TM}" data-d="${TD}">${zh?'今日明細':'Detail hari ini'}${uiIcon('chevron',14)}</button></header>${items.length||day.holiday?`<div class="focus-events">${day.holiday?`<span class="agenda-chip tone-holiday">${esc(day.holiday)}</span>`:''}${items.map(item=>`<span class="agenda-chip tone-${item.tone}">${esc(item.label)}</span>`).join('')}${day.events.length>4?`<span class="agenda-chip tone-adjusted">+${day.events.length-4} ${zh?'項':'agenda'}</span>`:''}</div>`:''}<div class="focus-grid"><button class="focus-tile" data-depth data-a="openDate" data-y="${y}" data-m="${m}" data-d="${d}"><span class="focus-icon">${studioIcon('clock',18)}</span><small>${zh?'明日班別':'Shift besok'} · ${m}/${d}</small><strong class="focus-shift-${uiShiftClass(nextDay.shift)}">${nextDay.shift==='休'?(zh?'輪班休假':'Libur shift'):studioShiftLabel(nextDay.shift)}</strong><span>${nextDay.events.some(e=>e.own)?esc(nextDay.events.filter(e=>e.own).map(e=>e.short).join(' · ')):rule.isWork?studioShiftTime(rule).range:(zh?'依目前輪班設定':'Sesuai jadwal')}</span></button><button class="focus-tile focus-rest" data-depth ${rest?`data-a="openDate" data-y="${rest.y}" data-m="${rest.m}" data-d="${rest.d}"`:'data-a="tabCalendar"'}><span class="focus-icon">${studioIcon('vacation',18)}</span><small>${zh?'你的下一段輪班休假':'Libur shift berikutnya'}</small><strong>${rest?`${rest.count}${rest.capped?'+':''}<em>${zh?'天':'hari'}</em>`:(zh?'尚未排定':'Belum ada')}</strong><span>${rest?experienceDateRange(rest.start,rest.end):(zh?'查看輪班設定':'Lihat pengaturan shift')}</span></button></div><p class="focus-footnote">${zh?'輪班休假依班表；國定連假另列。跨夜班請先完成交班。':'Libur shift mengikuti jadwal; libur nasional terpisah. Shift malam selesai dulu.'}</p></section>`;
}
function experienceWeatherAt(target,data=wxData){
  if(!data||!target)return null;
  const hour=new Date(target);hour.setMinutes(0,0,0);
  const index=(data.hTime||[]).findIndex(value=>Date.parse(value)===hour.getTime());
  if(index<0)return null;
  const number=arr=>{const value=arr&&arr[index];return value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null};
  return{index,temp:number(data.hTemp),pop:number(data.hPrec),wind:number(data.hWind),gust:number(data.hGust),code:number(data.hCode),source:_popSourceAt(data,index)};
}
function uiShiftWeatherHtml(){
  const zh=lang==='zh',timeline=experienceShiftTimeline(),row=timeline.phase==='running'||timeline.phase==='upcoming'?timeline.row:timeline.next;
  if(!row)return'';
  const points=[{label:zh?'上班前 1 小時':'1 jam sebelum shift',time:new Date(row.start.getTime()-3600000)},{label:zh?'排定下班':'Selesai terjadwal',time:row.end}];
  const now=Date.now(),stale=!wxData||_wxStale();
  return `<section class="shift-weather"><header class="section-kicker"><h2>${zh?'上下班天氣':'Cuaca perjalanan shift'}</h2><button data-a="tabWeather">${zh?'查看預報':'Prakiraan'}${uiIcon('chevron',14)}</button></header><p class="shift-weather-context">${row.m}/${row.d} ${studioShiftLabel(row.shift)}${wxData?.place?.display?' · '+esc(wxData.place.display):''}${stale?' · '+(zh?'等候最新資料':'Menunggu data terbaru'):''}</p><div class="shift-weather-grid">${points.map(point=>{const data=experienceWeatherAt(point.time),isPast=point.time.getTime()<now,hasPop=data&&data.pop!==null,wet=hasPop&&data.pop>=40;return `<button class="shift-weather-point${wet?' likely-rain':''}" data-a="tabWeather"><span class="shift-point-top">${studioIcon(wet?'rain':'clock',17)}<b>${point.label}</b></span><strong>${point.time.getMonth()+1}/${point.time.getDate()} <em>${String(point.time.getHours()).padStart(2,'0')}:00</em></strong><div class="shift-point-metrics"><span>${data&&data.temp!==null?Math.round(data.temp)+'°C':'—°C'}</span><span>${zh?'降雨':'Hujan'} ${hasPop?Math.round(data.pop)+'%':'—'}</span></div><small>${data?`${data.wind!==null?(zh?'風速 ':'Angin ')+Math.round(data.wind)+' km/h · ':''}${hasPop?_popSourceLabel(data.source,zh):(zh?'降雨機率未提供':'Peluang hujan belum tersedia')}`:(zh?'此時段預報尚未提供':'Prakiraan jam ini belum tersedia')}</small>${wet?`<span class="shift-point-tip">${zh?'準備雨具':'Siapkan payung'}</span>`:''}${isPast?`<small>${zh?'此時段已過':'Waktu sudah berlalu'}</small>`:''}</button>`}).join('')}</div><p class="focus-footnote">${zh?'採目前所選地點的逐時預報，並非沿途即時實測。':'Prakiraan per jam untuk lokasi pilihan, bukan observasi sepanjang jalan.'}</p></section>`;
}
function uiAtmosphereSceneHtml(){
  const zh=lang==='zh',season=getSeason(),names={spring:['春季','Musim semi'],summer:['夏季','Musim panas'],autumn:['秋季','Musim gugur'],winter:['冬季','Musim dingin']};
  const data=wxData&&!_wxStale()?wxData:null,view=data?_wxCurrentView(data):null,desc=view?(zh?WXZ:WXD)[view.code]:'';
  const seasonText=names[season][zh?0:1]+' · '+(zh?'天氣示意':'Ilustrasi cuaca'),weatherText=data&&desc?desc:(zh?'等候天氣資料':'Menunggu data cuaca'),temperatureText=data?data.temp+'°C':(zh?'查看天氣':'Lihat cuaca');
  return `<section class="atmosphere-view" data-depth aria-label="${zh?'季節與天氣光景':'Pemandangan musim dan cuaca'}"><canvas class="scene-canvas" aria-hidden="true"></canvas><div class="scene-heading"><span><i class="scene-live-dot"></i>${zh?'窗外光景':'Suasana di luar'}</span><button data-a="sfx" aria-label="${zh?'切換自然音與按鍵聲':'Aktifkan suara'}" aria-pressed="${!WxSfx.isMuted()}">${uiIcon(WxSfx.isMuted()?'sound-off':'sound',17)}<span>${WxSfx.isMuted()?(zh?'開啟聲音':'Suara mati'):(zh?'聲音開啟':'Suara aktif')}</span></button></div><div class="scene-caption"><div><small data-scene-season data-live-text="${esc(seasonText)}">${esc(seasonText)}</small><strong data-scene-weather data-live-text="${esc(weatherText)}">${esc(weatherText)}</strong></div><button data-a="tabWeather"><span data-scene-temperature data-live-text="${esc(temperatureText)}">${esc(temperatureText)}</span>${uiIcon('chevron',15)}</button></div></section>`;
}
function uiCalendarRestPlanHtml(y,m){
  const zh=lang==='zh',past=y<TY||y===TY&&m<TM,startDay=y===TY&&m===TM?TD:1,run=experienceRestRun(y,m,startDay);
  if(!run)return'';
  return `<section class="calendar-rest-plan" data-depth><span class="rest-plan-icon">${studioIcon('vacation',20)}</span><span><small>${zh?(past?'當月輪班休假':'下一段輪班休假'):(past?'Libur shift bulan ini':'Libur shift berikutnya')}</small><strong>${experienceDateRange(run.start,run.end)} <em>${run.count}${run.capped?'+':''} ${zh?'天':'hari'}</em></strong><span>${zh?'依你的實際輪班；不以國定連假代替。':'Mengikuti shift Anda, terpisah dari libur nasional.'}</span></span><button data-a="openDate" data-y="${run.y}" data-m="${run.m}" data-d="${run.d}" aria-label="${zh?'查看休假日期':'Lihat tanggal libur'}">${uiIcon('chevron',18)}</button></section>`;
}
function installExperienceClock(){
  let previousMinute='',rollover='';
  const update=()=>{
    if(document.hidden)return;
    const now=new Date(),date=ek(now.getFullYear(),now.getMonth()+1,now.getDate()),minute=date+'T'+now.getHours()+':'+now.getMinutes();
    if(previousMinute===minute)return;previousMinute=minute;
    const oldY=TY,oldM=TM,oldD=TD,wasCurrent=S.yr===oldY&&S.mo===oldM;
    NOW=now;TY=now.getFullYear();TM=now.getMonth()+1;TD=now.getDate();TR=new Date(TY,TM-1,TD);
    if(rollover&&rollover!==date){if(wasCurrent){S.yr=TY;S.mo=TM}if(fbUser){loadLeaves();loadAdminEv()}}
    rollover=date;
    if(S.step==='cal'&&!document.querySelector('.modal-bg,.wx-detail'))render();
  };
  update();setInterval(update,15000);document.addEventListener('visibilitychange',update);
}
window.addEventListener('load',installExperienceClock,{once:true});
function uiQuickToolsHtml(){
  const zh=lang==='zh';
  return `<section class="quick-launch" aria-label="${zh?'常用操作':'Tindakan cepat'}"><button onclick="experienceOpenDay('leave')"><span>${studioIcon('leave',20)}</span><b>${zh?'新增請假':'Tambah cuti'}</b></button><button onclick="experienceOpenDay('shift')"><span>${uiIcon('refresh',20)}</span><b>${zh?'調班／事項':'Shift / agenda'}</b></button><button data-a="share"><span>${uiIcon('share',20)}</span><b>${zh?'分享班表':'Bagikan'}</b></button><button data-a="stats"><span>${uiIcon('chart',20)}</span><b>${zh?'年度統計':'Statistik'}</b></button></section>`;
}
function uiDayLeaveCountHtml(day,placement='hero'){
  const zh=lang==='zh',unknown=day.leaveCount===null,value=unknown?'—':day.leaveCount;
  const description=unknown?calendarLeaveStatusText(day.status):(zh?`${day.leaveCount} 人請假`:`${day.leaveCount} orang cuti`);
  if(placement==='week')return `<span class="week-leave-count${day.leaveCount>0?' has-leave':''}${unknown?' unknown':''}" aria-label="${esc(description)}"><span>${zh?'請假':'Cuti'}</span><b>${value}</b></span>`;
  return `<button class="hero-leave-overview${day.leaveCount>0?' has-leave':''}${unknown?' unknown':''}" data-a="openDate" data-y="${day.y}" data-m="${day.m}" data-d="${day.d}" aria-label="${esc(`${day.m}/${day.d} ${description}`)}"><span>${day.m}/${day.d} ${zh?'當日請假':'Cuti tanggal ini'}</span><span class="hero-leave-number"><b>${value}</b><small>${zh?'人':'orang'}</small></span>${unknown?`<em>${zh?'資料未取得':'Belum tersedia'}</em>`:''}${uiIcon('chevron',15)}</button>`;
}
function uiDaySheetNavigationHtml(){
  const zh=lang==='zh';
  return `<nav class="day-sheet-nav" aria-label="${zh?'日期操作捷徑':'Pintasan tanggal'}">${[['leave',zh?'請假':'Cuti'],['shift',zh?'調班':'Ubah shift'],['events',zh?'標記事項':'Tandai agenda']].map(([id,label])=>`<button onclick="experienceJumpDay('${id}')">${label}</button>`).join('')}<button class="day-nav-close" data-a="close" aria-label="${zh?'關閉日期視窗':'Tutup detail tanggal'}">×</button></nav>`;
}
function experienceJumpDay(section){
  const target=document.querySelector(section==='leave'?'.leave-entry':section==='shift'?'#day-shift-section':'#day-event-section'),sheet=document.querySelector('#mr .modal-sheet');
  if(!sheet)return;
  if(target){sheet.scrollTo({top:target.offsetTop-70,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});const field=target.querySelector('select,input');if(field)setTimeout(()=>{if(field.isConnected)field.focus({preventScroll:true})},320)}
  else{const summary=document.querySelector('.day-brief');if(summary)sheet.scrollTo({top:summary.offsetTop-70,behavior:'smooth'})}
}
function experienceOpenDay(section){
  const timeline=experienceShiftTimeline(),row=timeline.phase==='running'?timeline.row:section==='leave'&&timeline.phase==='off'?timeline.next:null;
  const y=row?row.y:TY,m=row?row.m:TM,d=row?row.d:TD;
  S.modal={y,m,d};S.yr=y;S.mo=m;loadLeaves();loadAdminEv();render();
  requestAnimationFrame(()=>requestAnimationFrame(()=>experienceJumpDay(section)));
}
function uiFeatureDirectoryHtml(){
  const zh=lang==='zh';
  return `<section class="feature-directory"><header class="section-kicker"><h2>${zh?'功能捷徑':'Pintasan fitur'}</h2></header><div class="feature-grid"><button data-a="salOpen">${studioIcon('money',21)}<span><b>${zh?'計薪區間與規則':'Periode & aturan gaji'}</b><small>${zh?'每月獨立設定':'Per bulan'}</small></span></button><button data-a="alEdit">${studioIcon('vacation',21)}<span><b>${zh?'特休額度':'Kuota cuti tahunan'}</b><small>${zh?'查看與調整餘額':'Lihat & atur kuota'}</small></span></button><button onclick="openWxLocation()">${studioIcon('location',21)}<span><b>${zh?'天氣地點':'Lokasi cuaca'}</b><small>${zh?'定位或手選地點':'GPS atau pilih lokasi'}</small></span></button><button data-a="prefs">${uiIcon('settings',21)}<span><b>${zh?'動畫與警報':'Animasi & peringatan'}</b><small>${zh?'分類開關與通知':'Sakelar & notifikasi'}</small></span></button></div></section>`;
}
function previewNatureSeason(season,button){
  WxFx.previewSeason(season);experiencePreviewLabel(button,lang==='zh'?'四季光景預覽中，8 秒後恢復當前季節與天氣。':'Pratinjau musim, kembali ke cuaca dan musim saat ini setelah 8 detik.');
}
function experiencePreviewLabel(button,text){
  const controls=button.closest('.nature-controls'),label=controls?.querySelector('.nature-preview-state');if(!label)return;
  controls.querySelectorAll('.is-preview').forEach(el=>el.classList.remove('is-preview'));button.classList.add('is-preview');label.textContent=text;
  clearTimeout(window._naturePreviewLabel);window._naturePreviewLabel=setTimeout(()=>{label.textContent='';if(button.isConnected)button.classList.remove('is-preview')},8100);
}
function experienceWrapCanvasText(context,text,maxWidth){
  const lines=[];let line='';
  for(const char of Array.from(String(text))){if(line&&context.measureText(line+char).width>maxWidth){lines.push(line);line=char}else line+=char}
  if(line)lines.push(line);return lines;
}
async function experienceShareCanvas(y,m,options={}){
  return MyShiftShare.canvas(y,m,options);
}

function uiUnitControlHtml(){
  if(!fbUser||typeof APP_CFG==='undefined')return'';const zh=lang==='zh',locked=!!S.lockedUnit;
  return `<section class="unit-control"><span>${studioIcon('shield',19)}</span><div><strong>${zh?'查看單位':'Unit yang ditampilkan'}</strong>${locked?`<small>${esc(S.unit)} · ${zh?'由管理員指定':'Diatur admin'}</small>`:`<select id="unitChg" aria-label="${zh?'選擇查看單位':'Pilih unit'}" onchange="if(changeSelectedUnit(this.value))render()">${isAdmin()?`<option value="__all"${S.unit==='__all'?' selected':''}>${zh?'全部單位':'Semua unit'}</option>`:''}${(APP_CFG.units||[]).map(unit=>`<option value="${esc(unit)}"${unit===S.unit?' selected':''}>${esc(unit)}</option>`).join('')}</select>`}</div></section>`;
}
function uiDaySheetDateControlHtml(y,m,d){
 const zh=lang==='zh';return `<div class="day-date-stepper"><button onclick="experienceMoveDay(-1)" aria-label="${zh?'前一天':'Hari sebelumnya'}">${uiIcon('chevron',18)}</button><label><span>${zh?'操作日期':'Tanggal yang dipilih'}</span><input type="date" value="${ek(y,m,d)}" aria-label="${zh?'選擇請假與事項日期':'Pilih tanggal cuti dan agenda'}" onchange="experienceChooseDay(this.value)"></label><button onclick="experienceMoveDay(1)" aria-label="${zh?'後一天':'Hari berikutnya'}">${uiIcon('chevron',18)}</button></div>`;
}
function experienceChooseDay(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);if(date.getFullYear()!==y||date.getMonth()+1!==m||date.getDate()!==d)return false;
 S.modal={y,m,d};S.yr=y;S.mo=m;loadLeaves();loadAdminEv();render();return true;
}
function experienceMoveDay(step){
 if(!S.modal)return;const {y,m,d}=S.modal,date=new Date(y,m-1,d+step);experienceChooseDay(ek(date.getFullYear(),date.getMonth()+1,date.getDate()));
}
