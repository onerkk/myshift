/* MyShift v4 — 新視圖層（預覽：next.html）
   只重寫「畫面」：覆寫 app.js / schedule-experience.js 的同名全域視圖函式；
   資料、薪資、請假、天氣、同步等邏輯一律沿用原函式，不複製、不改動。 */
(function(){
'use strict';
var SHIFT_KEY={'早':'early','中':'mid','晚':'night','休':'off'};
function sk(s){return SHIFT_KEY[s]||'none'}
function two(n){return String(n).padStart(2,'0')}

/* ── 頂列 ── */
window.uiHeaderHtml=function(){
  var zh=lang==='zh',WK=t('wk'),dw=new Date(TY,TM-1,TD).getDay();
  var big=zh?TM+'月'+TD+'日':TD+'/'+TM,sub=zh?'週'+WK[dw]+' · '+TY:WK[dw]+' · '+TY;
  return '<header class="v4-top"><button class="v4-date" data-a="tabToday" aria-label="'+(zh?'回到今天':'Kembali ke hari ini')+'"><strong>'+big+'</strong><span>'+sub+'</span></button>'
   +'<div class="v4-top-actions"><button class="v4-round appearance-toggle" onclick="MyShiftAppearance.cycle()" aria-label="'+(zh?'切換日夜外觀':'Ganti tampilan')+'">'+studioIcon('sun',18)+'</button>'
   +'<button class="v4-round v4-lang" data-a="lang" aria-label="'+(zh?'切換為印尼文':'Ganti ke bahasa Mandarin')+'">'+(zh?'中<i>ID</i>':'ID<i>中</i>')+'</button>'
   +'<button class="v4-round" data-a="tabMore" aria-label="'+(zh?'功能與設定':'Fitur dan pengaturan')+'">'+uiIcon('settings',20)+'</button></div></header>';
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
  var count=esc(value).replace(/(\d+)\s*(小時|分|jam|mnt|menit|j|m)(?![a-z])/gi,'$1<small>$2</small>');
  var regMin=rule.regularMinutes!=null?rule.regularMinutes:Math.min(8,rule.shiftHours)*60,otMin=rule.overtimeMinutes!=null?rule.overtimeMinutes:Math.max(0,rule.shiftHours-8)*60,regular=regMin/60,ot=otMin/60;
  var core=rule.isWork?Math.round(progress)+'<small>%</small>':s==='休'?'OFF':'—';
  var tag=s==='休'?(zh?'輪班休假':'Libur shift'):studioShiftLabel(s);
  return '<div class="v4-hero v4-s-'+sk(s)+'" aria-label="'+(zh?'今日班次':'Shift hari ini')+'">'
   +'<div class="v4-orbit" id="v4OrbitSlot" data-shift="'+esc(s||'')+'" data-work="'+(rule.isWork?1:0)+'" data-start="'+(rule.startMinute||0)+'" data-reg="'+regMin+'" data-ot="'+otMin+'">'
     +'<div class="v4-orbit-tags"><span class="v4-tag"><i></i>'+tag+'</span><span class="v4-phase">'+phase+'</span></div>'
     +'<div class="v4-orbit-core" aria-hidden="true"><b>'+core+'</b><span>'+(rule.isWork?(zh?'排定進度':'Progres'):(zh?'今日狀態':'Hari ini'))+'</span></div>'
     +'<div class="v4-orbit-hours" aria-hidden="true"><i class="h6">06</i><i class="h12">12</i><i class="h18">18</i><i class="h0">00</i></div>'
     +'<div class="v4-orbit-readout" role="status"></div>'
     +'<p class="v4-orbit-hint">'+(zh?'左右拖曳，預看接下來每個小時':'Geser untuk melihat jam berikutnya')+'</p>'
   +'</div>'
   +'<div class="v4-hero-copy"><p class="v4-lead">'+lead+'</p><h1 class="v4-count">'+count+'</h1><p class="v4-ctx">'+m+'/'+d+' '+(zh?'班表歸屬日':'Tanggal jadwal')+'</p></div>'
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
  return '<div class="v4-dock" role="group" aria-label="'+(zh?'常用操作':'Tindakan cepat')+'">'
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
  return '<div class="v4-week"><div class="v4-kicker"><h2>'+(zh?'接下來 7 天':'7 hari ke depan')+'</h2><button data-a="tabCalendar">'+(zh?'完整班表':'Kalender')+uiIcon('arrow',16)+'</button></div><div class="v4-week-row">'+items+'</div></div>';
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
