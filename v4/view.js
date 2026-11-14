/* MyShift v4 — 新視圖層（預覽：next.html）
   只重寫「畫面」：覆寫 app.js / schedule-experience.js 的同名全域視圖函式；
   資料、薪資、請假、天氣、同步等邏輯一律沿用原函式，不複製、不改動。 */
(function(){
'use strict';
var SHIFT_KEY={'早':'early','中':'mid','晚':'night','休':'off'};
function sk(s){return SHIFT_KEY[s]||'none'}
function two(n){return String(n).padStart(2,'0')}

/* ── 頂列 ── */
var _origPageBar=MyShiftNavigation.pageBar;
MyShiftNavigation.pageBar=function(){return ''}; /* 返回鍵併入 v4 頂列，不再有一條黏在上面蓋住內容的返回列 */
function todayShiftKey(){try{return sk(gs(TY,TM,TD))}catch(e){return 'none'}}
window.uiHeaderHtml=function(){
  var zh=lang==='zh',WK=t('wk'),dw=new Date(TY,TM-1,TD).getDay();
  var big=zh?TM+'月'+TD+'日':TD+'/'+TM,sub=zh?'週'+WK[dw]+' · '+TY:WK[dw]+' · '+TY;
  var bar=_origPageBar.call(MyShiftNavigation),dest=bar?((bar.match(/return-destination">([^<]*)</)||[])[1]||''):'';
  var back=bar?'<button class="v4-back" data-a="navBack" aria-label="'+(zh?'返回':'Kembali ke ')+dest+'">'+uiIcon('chevron',16)+'<span>'+(dest||(zh?'返回':'Kembali'))+'</span></button>':'';
  return '<header class="v4-top'+(back?' has-back':'')+'">'+back+'<button class="v4-date" data-a="tabToday" aria-label="'+(zh?'回到今天':'Kembali ke hari ini')+'"><strong>'+big+'</strong><span>'+sub+'</span></button>'
   +'<div class="v4-top-actions"><button class="v4-round appearance-toggle" onclick="MyShiftAppearance.cycle()" aria-label="'+(zh?'切換日夜外觀':'Ganti tampilan')+'">'+studioIcon('sun',18)+'</button>'
   +'<button class="v4-round v4-lang" data-a="lang" aria-label="'+(zh?'切換為印尼文':'Ganti ke bahasa Mandarin')+'">'+(zh?'中<i>ID</i>':'ID<i>中</i>')+'</button>'
   +'<button class="v4-round" data-a="tabMore" aria-label="'+(zh?'功能與設定':'Fitur dan pengaturan')+'">'+uiIcon('settings',20)+'</button></div></header>';
};

/* ── 底部導覽 ── 同五個分頁與動作；強調色跟著今天的班別 */
window.uiBottomNavHtml=function(){
  var zh=lang==='zh',defs=[['today','tabToday','today',zh?'今天':'Hari ini'],['calendar','tabCalendar','calendar',zh?'班表':'Jadwal'],['pay','tabPay','pay',zh?'薪資':'Gaji'],['weather','tabWeather','weather',zh?'天氣':'Cuaca'],['more','tabMore','more',zh?'更多':'Lainnya']];
  return '<nav class="v4-nav v4-s-'+todayShiftKey()+'" aria-label="'+(zh?'主要導覽':'Main navigation')+'">'+defs.map(function(d){var on=UI_TAB===d[0];
    return '<button class="v4-nav-item'+(on?' on':'')+'" data-a="'+d[1]+'" aria-current="'+(on?'page':'false')+'"><span class="v4-nav-ic">'+uiIcon(d[2],22)+'</span><span class="v4-nav-tx">'+d[3]+'</span></button>'}).join('')+'</nav>';
};

/* ── 班表助手 ── 同原內容：今日事項標籤、明日班別、下一段輪班休假、註記 */
window.uiDayFocusHtml=function(){
  var zh=lang==='zh',day=calendarDayInfo(TY,TM,TD),tm=new Date(TY,TM-1,TD+1),y=tm.getFullYear(),m=tm.getMonth()+1,d=tm.getDate();
  var nextDay=calendarDayInfo(y,m,d),rule=getShiftWorkRule(y,m,d),rest=experienceRestRun(TY,TM,TD),items=day.events.slice(0,4);
  var chips=(items.length||day.holiday)?'<div class="v4-chips">'+(day.holiday?'<span class="v4-chip tone-holiday">'+esc(day.holiday)+'</span>':'')+items.map(function(it){return '<span class="v4-chip tone-'+it.tone+'">'+esc(it.label)+'</span>'}).join('')+(day.events.length>4?'<span class="v4-chip tone-adjusted">+'+(day.events.length-4)+' '+(zh?'項':'agenda')+'</span>':'')+'</div>':'';
  var ownNext=nextDay.events.filter(function(e){return e.own});
  var sub=ownNext.length?esc(ownNext.map(function(e){return e.short}).join(' · ')):rule.isWork?studioShiftTime(rule).range:(zh?'依目前輪班設定':'Sesuai jadwal');
  return '<div class="v4-root v4-slab v4-brief"><div class="v4-kicker in"><h2>'+(zh?'班表助手':'Asisten jadwal')+'</h2><button data-a="openDate" data-y="'+TY+'" data-m="'+TM+'" data-d="'+TD+'">'+(zh?'今日明細':'Detail hari ini')+uiIcon('chevron',14)+'</button></div>'+chips
   +'<div class="v4-tiles"><button class="v4-tile v4-s-'+sk(nextDay.shift)+'" data-a="openDate" data-y="'+y+'" data-m="'+m+'" data-d="'+d+'"><span class="v4-tile-ic">'+studioIcon('clock',18)+'</span><small>'+(zh?'明日班別':'Shift besok')+' · '+m+'/'+d+'</small><strong>'+(nextDay.shift==='休'?(zh?'輪班休假':'Libur shift'):studioShiftLabel(nextDay.shift))+'</strong><span>'+sub+'</span></button>'
   +'<button class="v4-tile v4-s-off" '+(rest?'data-a="openDate" data-y="'+rest.y+'" data-m="'+rest.m+'" data-d="'+rest.d+'"':'data-a="tabCalendar"')+'><span class="v4-tile-ic">'+studioIcon('vacation',18)+'</span><small>'+(zh?'你的下一段輪班休假':'Libur shift berikutnya')+'</small><strong>'+(rest?rest.count+(rest.capped?'+':'')+'<em>'+(zh?'天':'hari')+'</em>':(zh?'尚未排定':'Belum ada'))+'</strong><span>'+(rest?experienceDateRange(rest.start,rest.end):(zh?'查看輪班設定':'Lihat pengaturan shift'))+'</span></button></div>'
   +'<p class="v4-note">'+(zh?'輪班休假依班表；國定連假另列。跨夜班請先完成交班。':'Libur shift mengikuti jadwal; libur nasional terpisah. Shift malam selesai dulu.')+'</p></div>';
};

/* ── 天氣／薪資摘要 ── 同原資料來源與文字 */
function insight(action,cls,icon,small,strong,note,meta){
  return '<button class="v4-insight '+cls+'" data-a="'+action+'"><span class="v4-insight-ic">'+icon+'</span><span class="v4-insight-copy"><small>'+small+'</small><strong>'+strong+'</strong>'+(note?'<small class="note">'+note+'</small>':'')+'</span>'+(meta?'<span class="v4-insight-meta">'+meta+'</span>':'')+uiIcon('chevron',18)+'</button>';
}
window.uiWeatherPreviewHtml=function(){
  var zh=lang==='zh';
  if(!wxData)return insight('tabWeather','wx',studioIcon('cloud',22),zh?'目前天氣':'Cuaca sekarang',_wxLoading?(zh?'正在取得天氣':'Memuat cuaca'):(zh?'查看天氣與位置':'Lihat cuaca dan lokasi'),'','');
  var d=wxData,now=_wxCurrentView(d),desc=(zh?WXZ:WXD)[now.code]||'',updated=_wxTimeLabel(d.sourceTime||d.updatedAt);
  return insight('tabWeather','wx',studioWeatherSculpture(now.code),_wxStale()?(zh?'上次天氣':'Cuaca tersimpan'):(now.stationFresh?(zh?'雨量實測＋雲況推估':'Rain observation + cloud estimate'):(zh?'目前模式預報':'Current model forecast')),d.temp+'° <em>'+esc(desc)+'</em>',now.note?esc(now.note):'',esc(now.sourceLabel)+'<b>'+updated+'</b>');
};
window.uiPayPreviewHtml=function(y,m){
  var zh=lang==='zh',pv=latestClosedSalaryMonth();y=pv.y;m=pv.m;
  var est=calcSalaryEst(y,m),pp=calcPayPeriod(y,m);if(!pp)return'';
  var actual=est&&est.hasSlip?est.official:null;
  var value=actual?studioMoney(actual.net):(est?(est.dataPending?'—':studioMoney(est.net)):pp.tH+'h');
  var title=actual?(zh?'公司實領':'Gaji bersih'):est?salaryForecastTitle(est):(zh?'設定自動計薪':'Atur hitungan otomatis');
  return insight('tabPay','pay',studioIcon('money',23),m+' 月 · '+title,value,'',actual?(zh?'薪資條記錄':'Slip tersimpan'):(zh?'班表自動計算':'Hitungan jadwal'));
};

/* ── 近期事項 ── */
window.uiUpcomingEventsHtml=function(y,m){
  var WK=t('wk'),items=[];
  for(var d=1;d<=dim(y,m);d++){
    if(y<TY||(y===TY&&m<TM)||(y===TY&&m===TM&&d<TD))continue;
    var key=ek(y,m,d),events=EVS[key]||[];
    (function(d,key){events.forEach(function(eid){var name=eid==='custom'&&NOTES[key]?esc(NOTES[key]):eid==='typhoon'&&TYD[key]?en(eid)+' '+TYD[key]+'h':en(eid),s=gs(y,m,d);
      items.push('<button class="v4-agenda-item v4-s-'+sk(s)+'" data-a="openDate" data-y="'+y+'" data-m="'+m+'" data-d="'+d+'"><span class="v4-agenda-date"><strong>'+d+'</strong><small>'+m+(lang==='zh'?'月':'')+'</small></span><span class="v4-agenda-info"><strong>'+name+'</strong><small>'+WK[new Date(y,m-1,d).getDay()]+' · '+studioShiftLabel(s)+'</small></span>'+uiIcon('chevron',17)+'</button>');
    })})(d,key);
  }
  return items.length?'<div class="v4-root v4-slab v4-agenda"><div class="v4-kicker in"><h2>'+t('rem')+'</h2></div><div class="v4-agenda-list">'+items.join('')+'</div></div>':'';
};

/* ── 今日主視覺：天球儀 ── 與原 uiTodayHeroHtml 相同的資料與判斷，全部資訊保留 */
window.uiTodayHeroHtml=function(){
  var zh=lang==='zh',timeline=experienceShiftTimeline(),row=timeline.row,s=row?row.shift:gs(TY,TM,TD),rule=row?row.rule:getShiftWorkRule(TY,TM,TD),time=studioShiftTime(rule),progress=timeline.progress||0;
  var lead=zh?'今天的節奏':'Ritme hari ini',value=zh?'尚未排班':'Belum ada shift',phase=zh?'設定輪班後顯示':'Atur jadwal Anda';
  if(timeline.phase==='off'&&s==='休'){var run=experienceRestRun(TY,TM,TD);lead=zh?'把時間留給自己':'Waktu untuk diri sendiri';value=zh?'今天休息':'Hari libur';phase=run?(zh?'接下來連休 '+run.count+' 天':'Libur '+run.count+' hari mulai hari ini'):(zh?'今日不需出勤':'Tidak perlu bekerja hari ini')}
  else if(timeline.phase==='upcoming'){lead=zh?'距離上班':'Mulai dalam';value=uiFormatDuration(timeline.remaining);phase=zh?'準備迎接下一班':'Bersiap untuk shift'}
  else if(timeline.phase==='running'){lead=zh?'距離排定下班':'Selesai terjadwal dalam';value=uiFormatDuration(timeline.remaining);phase=timeline.previous?(zh?'昨日夜班 · 跨日延續':'Shift kemarin · lewat tengah malam'):timeline.stage==='overtime'?(zh?'排定加班時段':'Waktu lembur terjadwal'):(zh?'班次進行中':'Shift berlangsung')}
  else if(timeline.phase==='finished'){lead=zh?'辛苦了，今天':'Terima kasih, hari ini';value=zh?'班次已完成':'Shift selesai';phase=zh?'今日排定班次完成':'Jadwal hari ini selesai'}
  var rest=experienceRestRun(TY,TM,TD),nextOff=rest&&rest.offset>0?(zh?rest.offset+' 天後休假':'Libur dalam '+rest.offset+' hari'):s==='休'?(zh?'好好休息':'Selamat beristirahat'):(zh?'依目前輪班設定':'Sesuai pengaturan shift');
  var y=row?row.y:TY,m=row?row.m:TM,d=row?row.d:TD,day=calendarDayInfo(y,m,d),own=day.events.filter(function(e){return e.own||e.id==='annualL'||e.id==='typhoon'});
  var taskText=day.events.length?(zh?day.events.length+' 項事項':day.events.length+' agenda'):day.leaveCount>0?(zh?day.leaveCount+' 人請假':day.leaveCount+' cuti'):(zh?'今日行程':'Agenda hari ini');
  var count=esc(value).replace(/(\d+)\s*(小時|分鐘|分|jam|mnt|menit|j|m)(?![a-z])/gi,'$1<small>$2</small>');
  var regMin=rule.regularMinutes!=null?rule.regularMinutes:Math.min(8,rule.shiftHours)*60,otMin=rule.overtimeMinutes!=null?rule.overtimeMinutes:Math.max(0,rule.shiftHours-8)*60,regular=regMin/60,ot=otMin/60;
  var core=rule.isWork?Math.round(progress)+'<small>%</small>':s==='休'?'OFF':'—';
  var tag=s==='休'?(zh?'輪班休假':'Libur shift'):studioShiftLabel(s);
  return '<div class="v4-root v4-hero v4-s-'+sk(s)+'" aria-label="'+(zh?'今日班次':'Shift hari ini')+'">'
   +'<div class="v4-orbit" id="v4OrbitSlot" data-shift="'+esc(s||'')+'" data-work="'+(rule.isWork?1:0)+'" data-start="'+(rule.startMinute||0)+'" data-reg="'+regMin+'" data-ot="'+otMin+'">'
     +'<div class="v4-orbit-tags"><span class="v4-tag"><i></i>'+tag+'</span><span class="v4-phase">'+phase+'</span></div>'
     +'<div class="v4-orbit-core" aria-hidden="true"><b>'+core+'</b><span>'+(rule.isWork?(zh?'排定進度':'Progres'):(zh?'今日狀態':'Hari ini'))+'</span></div>'
     +'<div class="v4-orbit-hours" aria-hidden="true"><i class="h6">06</i><i class="h12">12</i><i class="h18">18</i><i class="h0">00</i></div>'
     +'<div class="v4-orbit-readout" role="status"></div>'
     +'<p class="v4-orbit-hint"><i>‹</i>'+(zh?'拖曳太陽，預看每個小時':'Geser matahari untuk melihat tiap jam')+'<i>›</i></p>'
   +'</div>'
   +'<div class="v4-hero-copy"><p class="v4-lead">'+lead+'</p><h1 class="v4-count'+(/\d/.test(value)?'':' text')+'">'+count+'</h1><p class="v4-ctx">'+m+'/'+d+' '+(zh?'班表歸屬日':'Tanggal jadwal')+'</p></div>'
   +(rule.isWork?'<div class="v4-line"><div class="v4-line-labels"><span>'+time.start+'</span><span>'+(zh?'班次進度':'Progres')+' '+Math.round(progress)+'%</span><span>'+time.end+'</span></div>'
     +'<div class="v4-track" style="--reg:'+(regular/rule.shiftHours*100)+'%;--p:'+progress.toFixed(1)+'%" role="progressbar" aria-label="'+(zh?'排定班次進度':'Progres jadwal')+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(progress)+'"><span></span><i></i></div>'
     +'<div class="v4-segs"><span><i class="reg"></i>'+(zh?'正常班制':'Jam normal')+' '+regular+'h</span>'+(ot?'<span><i class="ot"></i>'+(zh?'排定加班':'Lembur terjadwal')+' '+ot+'h</span>':'')+'</div></div>'
    :'<p class="v4-restnote">'+(zh?'點選日期，可查看行程與請假紀錄。':'Pilih tanggal untuk melihat agenda dan cuti.')+'</p>')
   +'<div class="v4-hero-legacy">'+uiDayLeaveCountHtml(day)+'</div>'
   +(own.length?'<div class="v4-own">'+own.map(function(e){return '<span>'+esc(e.label)+'</span>'}).join('')+'</div>':'')
   +'<div class="v4-hero-foot"><span>'+studioIcon('vacation',16)+nextOff+'</span><button data-a="openDate" data-y="'+y+'" data-m="'+m+'" data-d="'+d+'">'+studioIcon('event',16)+taskText+uiIcon('chevron',14)+'</button></div>'
  +'</div>';
};

/* ── 常用操作 ── 同四個動作 */
window.uiQuickToolsHtml=function(){
  var zh=lang==='zh';
  function b(attr,icon,label){return '<button '+attr+'><span>'+icon+'</span><b>'+label+'</b></button>'}
  return '<div class="v4-root v4-dock" role="group" aria-label="'+(zh?'常用操作':'Tindakan cepat')+'">'
   +b('onclick="experienceOpenDay(\'leave\')"',studioIcon('leave',22),zh?'請假':'Cuti')
   +b('onclick="experienceOpenDay(\'shift\')"',uiIcon('refresh',22),zh?'調班／事項':'Shift / agenda')
   +b('data-a="share"',uiIcon('share',22),zh?'分享班表':'Bagikan')
   +b('data-a="stats"',uiIcon('chart',22),zh?'年度統計':'Statistik')+'</div>';
};

/* ── 接下來 7 天 ── */
window.uiWeekStripHtml=function(){
  var WK=t('wk'),zh=lang==='zh',items='';
  for(var i=0;i<7;i++){
    var dt=new Date(TY,TM-1,TD+i),y=dt.getFullYear(),m=dt.getMonth()+1,d=dt.getDate(),day=calendarDayInfo(y,m,d),s=day.shift,own=day.events.find(function(e){return e.own||e.id==='annualL'}),weekend=dt.getDay()===0||dt.getDay()===6;
    var text=[y+'/'+m+'/'+d,studioShiftLabel(s),day.holiday].concat(day.events.map(function(e){return e.label}),[calendarLeaveLabel(day)]).filter(Boolean).join(', ');
    var rule=getShiftWorkRule(y,m,d),tm=rule.isWork?studioShiftTime(rule).start:'';
    items+='<button class="v4-day v4-s-'+sk(s)+(i===0?' now':'')+(weekend?' wk':'')+(isTWOff(y,m,d)?' hol':'')+'" data-a="openDate" data-y="'+y+'" data-m="'+m+'" data-d="'+d+'" aria-current="'+(i===0?'date':'false')+'" aria-label="'+esc(text)+'">'
     +'<span class="v4-day-w">'+(i===0?(zh?'今天':'Kini'):WK[dt.getDay()])+'</span><strong>'+d+'</strong>'
     +'<span class="v4-day-s">'+(s==='休'?(zh?'休':'Libur'):uiShiftShort(s))+'</span><span class="v4-day-t">'+(tm||'·')+'</span>'
     +'<span class="v4-day-tags">'+(day.holiday?'<em class="hol">'+esc(day.holiday)+'</em>':'')+(own?'<em class="own">'+esc(own.short)+'</em>':day.events.length?'<em>'+day.events.length+' '+(zh?'事項':'agenda')+'</em>':'')+'</span>'
     +'<span class="v4-day-leave">'+uiDayLeaveCountHtml(day,'week')+'</span></button>';
  }
  return '<div class="v4-root v4-week"><div class="v4-kicker"><h2>'+(zh?'接下來 7 天':'7 hari ke depan')+'</h2><button data-a="tabCalendar">'+(zh?'完整班表':'Kalender')+uiIcon('arrow',16)+'</button></div><div class="v4-week-row">'+items+'</div></div>';
};

/* ── 上下班天氣 ── 同原資料（experienceWeatherAt）、同兩個時間點、同提示文字；新增降雨機率量條 */
window.uiShiftWeatherHtml=function(){
  var zh=lang==='zh',timeline=experienceShiftTimeline(),row=timeline.phase==='running'||timeline.phase==='upcoming'?timeline.row:timeline.next;
  if(!row)return'';
  var points=[{label:zh?'上班前 1 小時':'1 jam sebelum shift',time:new Date(row.start.getTime()-3600000),icon:'clock'},{label:zh?'排定下班':'Selesai terjadwal',time:row.end,icon:'clock'}];
  var now=Date.now(),stale=!wxData||_wxStale();
  var cards=points.map(function(pt){
    var data=experienceWeatherAt(pt.time),isPast=pt.time.getTime()<now,hasPop=data&&data.pop!==null,wet=hasPop&&data.pop>=40;
    var mm=null;if(data&&!hasPop&&wxData&&wxData.hRain){var rv=wxData.hRain[data.index];if(rv!==null&&rv!==undefined&&rv!==''&&isFinite(Number(rv)))mm=Number(rv)}
    var detail=data?((data.wind!==null?(zh?'風速 ':'Angin ')+Math.round(data.wind)+' km/h · ':'')+(hasPop?_popSourceLabel(data.source,zh):mm!==null?(zh?'降雨機率暫時取不到，改顯示模式預估雨量':'Peluang hujan belum tersedia; menampilkan perkiraan curah hujan'):(zh?'降雨機率未提供':'Peluang hujan belum tersedia'))):(zh?'此時段預報尚未提供':'Prakiraan jam ini belum tersedia');
    return '<button class="v4-point'+(wet?' wet':'')+(isPast?' past':'')+'" data-a="tabWeather"><span class="v4-point-top">'+studioIcon(wet?'rain':'clock',16)+'<b>'+pt.label+'</b></span>'
     +'<strong><small>'+(pt.time.getMonth()+1)+'/'+pt.time.getDate()+'</small>'+two(pt.time.getHours())+':00</strong>'
     +'<span class="v4-point-metrics"><b>'+(data&&data.temp!==null?Math.round(data.temp)+'°C':'—°C')+'</b><span>'+(hasPop?(zh?'降雨 ':'Hujan ')+Math.round(data.pop)+'%':mm!==null?(zh?'預估 ':'Perkiraan ')+(mm>=10?Math.round(mm):mm.toFixed(1))+' mm':(zh?'降雨 —':'Hujan —'))+'</span></span>'
     +'<i class="v4-pop" style="--pop:'+(hasPop?Math.max(0,Math.min(100,Math.round(data.pop))):0)+'%" aria-hidden="true"></i>'
     +'<small>'+detail+'</small>'+(wet?'<em class="v4-point-tip">'+(zh?'準備雨具':'Siapkan payung')+'</em>':'')+(isPast?'<small class="past">'+(zh?'此時段已過':'Waktu sudah berlalu')+'</small>':'')+'</button>';
  }).join('');
  return '<div class="v4-root v4-slab v4-commute"><div class="v4-kicker in"><h2>'+(zh?'上下班天氣':'Cuaca perjalanan shift')+'</h2><button data-a="tabWeather">'+(zh?'查看預報':'Prakiraan')+uiIcon('chevron',14)+'</button></div>'
   +'<p class="v4-commute-ctx">'+row.m+'/'+row.d+' '+studioShiftLabel(row.shift)+(wxData&&wxData.place&&wxData.place.display?' · '+esc(wxData.place.display):'')+(stale?' · '+(zh?'等候最新資料':'Menunggu data terbaru'):'')+'</p>'
   +'<div class="v4-points">'+cards+'</div><p class="v4-note">'+(zh?'採目前所選地點的逐時預報，並非沿途即時實測。':'Prakiraan per jam untuk lokasi pilihan, bukan observasi sepanjang jalan.')+'</p></div>';
};

/* ── 通知提示 ── 同原顯示條件與動作 */
window.notifyCtaHtml=function(){
  if(typeof Notification==='undefined'||S.step!=='cal')return'';
  var cfg=APP_CFG.wxAlerts||{},up=USER_PREFS||{};
  if(cfg.master===false||cfg.notifyEnabled===false||up.wxMaster===false||up.wxNotify===false||Notification.permission==='granted')return'';
  var dismissed=0;try{dismissed=parseInt(localStorage.getItem('_wxNotifyCtaDismiss'))||0}catch(e){}
  if(dismissed&&Date.now()-dismissed<7*24*3600*1000)return'';
  var zh=lang==='zh',denied=Notification.permission==='denied';
  return '<div class="v4-root v4-slab v4-notice"><span class="v4-notice-ic">'+uiIcon('bell',20)+'</span><div class="v4-notice-copy"><h2>'+(zh?'天氣與災防通知':'Notifikasi cuaca')+'</h2><p>'+(denied?(zh?'通知已被瀏覽器封鎖，可到手機系統設定開啟。':'Notifikasi diblokir. Aktifkan di pengaturan perangkat.'):(zh?'接收所在地的天氣與災防提醒；背景通知依裝置支援。':'Terima peringatan lokal. Notifikasi latar belakang bergantung pada perangkat.'))+'</p>'
   +(denied?'':'<button type="button" class="v4-notice-go" onclick="requestNotifyPermission()">'+(zh?'啟用通知':'Aktifkan notifikasi')+uiIcon('arrow',16)+'</button>')+'</div>'
   +'<button type="button" class="v4-notice-x" onclick="dismissWxNotifyCta()" aria-label="'+(zh?'暫時隱藏通知提示':'Tutup saran notifikasi')+'">✕</button></div>';
};

/* 拖曳天球儀時的讀數：該時刻 + 是否在班 + 逐時預報（有資料才顯示） */
window.MyShiftV4={scrubText:function(dt){
  var zh=lang==='zh',out=[(dt.getMonth()+1)+'/'+dt.getDate()+' '+two(dt.getHours())+':'+two(dt.getMinutes())];
  try{
    var on=false;for(var k=-1;k<=0;k++){var b=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()+k),r=getShiftWorkRule(b.getFullYear(),b.getMonth()+1,b.getDate());
      if(r.isWork){var st=b.getTime()+r.startMinute*6e4;if(dt>=st&&dt<st+r.shiftHours*36e5)on=true}}
    out.push(on?(zh?'上班中':'Bekerja'):(zh?'非上班時段':'Di luar shift'));
    if(typeof wxData!=='undefined'&&wxData&&wxData.hTime&&typeof _wxHourIndex==='function'){
      var best=-1,bd=1e15;for(var i=0;i<wxData.hTime.length;i++){var df=Math.abs(new Date(wxData.hTime[i])-dt);if(df<bd){bd=df;best=i}}
      if(best>=0&&bd<=36e5){if(wxData.hTemp&&wxData.hTemp[best]!=null)out.push(Math.round(wxData.hTemp[best])+'°');
        if(wxData.hPrec&&wxData.hPrec[best]!=null)out.push((zh?'降雨機率 ':'Hujan ')+Math.round(wxData.hPrec[best])+'%')}
    }
  }catch(e){}
  return out.join(' · ');
}};
if(typeof render==='function')render();
})();
