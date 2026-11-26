/* MyShift v4 — 班表頁（月曆／每日清單）
   資料全部來自原本的 calendarDayInfo / calendarHolidayRuns / experienceMonthDates 等函式；這裡只重寫畫面。
   動作（data-a）與原版相同：prev / next / today / open / openDate / calendarView / calendarFilter / calendarReload / almToday。
   新增：左右滑動月曆換月、本月班別比例條。 */
(function(){
'use strict';
const SK={'早':'early','中':'mid','晚':'night','休':'off'},sk=s=>SK[s]||'none';
const TONES=['meeting','health','pay','annual','personal','holiday','adjusted'];
const tone=x=>TONES.includes(x)?x:'own';
function chipsHtml(day){
  const zh=lang==='zh';
  const holiday=[day.publicOff?(zh?'國定假日':'Libur nasional'):'',day.holiday].filter(Boolean).join(' · ');
  return day.events.map(e=>`<span class="v4-chip tone-${tone(e.tone)}">${esc(e.label)}</span>`).join('')
    +(day.adjusted?`<span class="v4-chip tone-adjusted">${zh?'已調班':'Shift diubah'}</span>`:'')
    +(holiday?`<span class="v4-chip tone-holiday">${esc(holiday)}</span>`:'')
    +(day.breakLabel?`<span class="v4-chip tone-holiday">${esc(day.breakLabel)}</span>`:'');
}
const head=(icon,title,sub,right)=>`<div class="v4-sec-head"><span class="v4-sec-ic">${icon}</span><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${right||''}</div>`;

window.studioCalendarLegendHtml=function(){
  const zh=lang==='zh',items=[['today',zh?'今天':'Hari ini'],['early',zh?'早班':'Pagi'],['night',zh?'晚班':'Malam'],['mid',zh?'中班':'Siang'],['off',zh?'輪班休假':'Libur shift'],['weekend',zh?'週六／日':'Akhir pekan'],['holiday',zh?'國定假日':'Libur nasional'],['break',zh?'連假':'Libur panjang']];
  return `<div class="v4-legend" aria-label="${zh?'班別與日期圖例':'Legenda shift dan tanggal'}">${items.map(([k,l])=>`<span class="lg-${k}"><i></i>${l}</span>`).join('')}</div>`;
};
window.uiCalendarTodayAnchorHtml=function(){
  const zh=lang==='zh',s=gs(TY,TM,TD),rule=getShiftWorkRule(TY,TM,TD),time=studioShiftTime(rule),day=calendarDayInfo(TY,TM,TD);
  return `<button class="v4-root v4-anchor v4-s-${sk(s)}" data-a="openDate" data-y="${TY}" data-m="${TM}" data-d="${TD}"><span class="v4-anchor-date">${TM}/${TD}</span><span class="v4-anchor-copy"><b>${zh?'今天':'Hari ini'} · ${studioShiftLabel(s)}</b><small>${esc(calendarLeaveLabel(day))}${rule.isWork?' · '+time.range:''}</small></span>${uiIcon('chevron',17)}</button>`;
};
window.uiMonthSummaryHtml=function(st,workDays){
  const zh=lang==='zh',defs=[{key:'早',tone:'early',label:zh?'早班':'Pagi'},{key:'晚',tone:'night',label:zh?'晚班':'Malam'},...(Number(st['中']||0)>0?[{key:'中',tone:'mid',label:zh?'中班':'Siang'}]:[]),{key:'休',tone:'off',label:zh?'休假':'Libur'}];
  const total=defs.reduce((n,x)=>n+Number(st[x.key]||0),0)||1;
  return `<div class="v4-msum"><div class="v4-msum-head"><h2>${zh?'本月概覽':'Ringkasan bulan'}</h2><span>${zh?'出勤':'Kerja'} <strong>${workDays}</strong> ${zh?'天':'hari'}</span></div><div class="v4-msum-bar" aria-hidden="true">${defs.map(x=>`<i class="v4-s-${x.tone}" style="flex:${Number(st[x.key]||0)/total}"></i>`).join('')}</div><div class="v4-msum-grid">${defs.map(x=>`<div class="v4-s-${x.tone}"><span><i></i>${x.label}</span><strong>${Number(st[x.key]||0)}</strong></div>`).join('')}</div></div>`;
};
window.uiCalendarBreakStripHtml=function(y,m){
  const runs=calendarHolidayRuns(y,m);if(!runs.length)return'';const wk=t('wk'),zh=lang==='zh';
  const dateLabel=key=>{const [yy,mm,dd]=key.split('-').map(Number);return `${mm}/${dd}（${wk[new Date(yy,mm-1,dd).getDay()]}）`};
  return `<div class="v4-root v4-slab v4-breaks" aria-label="${zh?'本月連續假期':'Libur panjang bulan ini'}">${head(studioIcon('calendar',19),zh?'本月連假':'Libur panjang',runs.length+(zh?' 段連續假期':' periode berturut-turut'),`<span class="v4-sec-count">${runs.reduce((n,r)=>n+r.length,0)}<small>${zh?'假日':'hari'}</small></span>`)}<div class="v4-rows">${runs.map(run=>{const [yy,mm,dd]=run.start.split('-').map(Number);return `<button type="button" class="v4-row brk" data-a="openDate" data-y="${yy}" data-m="${mm}" data-d="${dd}" aria-label="${esc(dateLabel(run.start))} 至 ${esc(dateLabel(run.end))}，${run.length}${zh?'天連假':' hari libur'}"><span class="v4-row-main"><strong>${esc(dateLabel(run.start))}<i>→</i>${esc(dateLabel(run.end))}</strong><small>${run.names.length?esc(run.names.join('・')):(zh?'週末連休':'Akhir pekan panjang')}</small></span><span class="v4-row-badge">${run.length}${zh?'天':' hari'}</span></button>`}).join('')}</div></div>`;
};
window.uiCalendarHolidaysHtml=function(days){
  const zh=lang==='zh',wk=t('wk'),holidays=days.filter(day=>day.holiday);
  return `<div class="v4-root v4-slab v4-holidays" aria-label="${zh?'本月假日與節日':'Hari libur dan perayaan bulan ini'}">${head(studioIcon('calendar',20),zh?'本月假日與節日':'Hari libur & perayaan',zh?'完整月份・含補假與節慶':'Sebulan penuh · termasuk libur pengganti',`<span class="v4-sec-count">${holidays.length}<small>${zh?'個日期':'tanggal'}</small></span>`)}<div class="v4-rows">${holidays.map(day=>`<button type="button" class="v4-row hol" data-a="open" data-d="${day.d}"><span class="v4-row-date"><b>${day.m}/${String(day.d).padStart(2,'0')}</b><small>${zh?'週':''}${wk[new Date(day.y,day.m-1,day.d).getDay()]}</small></span><span class="v4-row-main"><strong>${esc(day.holiday)}</strong></span>${uiIcon('chevron',15)}</button>`).join('')||`<p class="v4-empty">${zh?'本月沒有已收錄的假日或節日。':'Tidak ada hari libur atau perayaan yang tercatat bulan ini.'}</p>`}</div><p class="v4-note">${zh?'節日不一定放假，當日出勤仍依你的班別。':'Perayaan belum tentu hari libur; tetap ikuti shift Anda.'}</p></div>`;
};
window.uiCalendarNoticesHtml=function(days){
  const zh=lang==='zh',upcoming=days.filter(day=>day.key>=ek(TY,TM,TD));
  const announcements=upcoming.flatMap(day=>day.events.filter(e=>['meeting','health'].includes(e.id)).map(e=>({day,label:e.label,tone:e.tone})));
  const leaves=upcoming.filter(day=>day.leaveCount>0).map(day=>({day,label:calendarLeaveLabel(day),tone:'pay'}));
  const section=(kind,icon,title,items)=>items.length?`<div class="v4-root v4-slab v4-notices ${kind}">${head(studioIcon(icon,18),title,'',`<span class="v4-sec-count">${items.length}</span>`)}<div class="v4-notice-items">${items.map(({day,label,tone:tn})=>`<button type="button" class="v4-ndate tone-${tone(tn)}" data-a="open" data-d="${day.d}"><b>${day.m}/${day.d}</b><span>${esc(label)}</span></button>`).join('')}</div></div>`:'';
  return section('event','event',zh?'單位公告':'Pengumuman unit',announcements)+section('leave','leave',zh?'請假動態':'Status cuti',leaves);
};
window.calendarHighlightsHtml=function(days){
  const zh=lang==='zh',month=days[0].key.slice(0,7),known=adminEvState.months.includes(month);
  return `<div class="v4-root v4-hl">${['meeting','health'].map(type=>{
    const found=days.filter(day=>day.events.some(e=>e.id===type)),next=found.filter(day=>day.key>=ek(TY,TM,TD)),shown=(next.length?next:found).slice(0,2);
    const dates=shown.map(day=>`${day.m}/${day.d}`).join('、');
    return `<button class="v4-hl-tile tone-${type}" data-a="calendarFilter" data-filter="${type}"><span>${type==='meeting'?(zh?'班股會議':'Rapat regu'):(zh?'健康檢查':'Pemeriksaan medis')} ${uiIcon('chevron',13)}</span><strong>${dates||(!known?(zh?'待同步':'Menunggu'):(zh?'未安排':'Belum ada'))}</strong><small>${found.length?(zh?`本月 ${found.length} 天${next.length?' · 接下來':''}`:`${found.length} hari bulan ini${next.length?' · mendatang':''}`):(zh?'點此查看日期':'Lihat tanggal')}</small></button>`;
  }).join('')}</div>`;
};
window.calendarDataNoticeHtml=function(y,m){
  const zh=lang==='zh',status=calendarLeaveStatus(y,m),ym=ek(y,m,1).slice(0,7);
  const adminKnown=adminEvState.months.includes(ym),adminPending=adminEvState.loading||!adminKnown;
  const messages=[calendarLeaveStatusText(status)];
  if(adminEvState.error)messages.push(zh?'會議／體檢更新失敗':'Gagal memperbarui rapat/medis');
  else if(adminPending)messages.push(zh?'單位事項同步中':'Memuat agenda unit');
  const retry=status.state==='error'||adminEvState.error,busy=!retry&&(adminPending||status.state==='loading'||status.state==='pending');
  return `<div class="v4-datanote${retry?' err':busy?' busy':''}" role="status"><i></i><span>${esc(messages.join(' · '))}</span>${retry?`<button data-a="calendarReload">${zh?'重試':'Coba lagi'}</button>`:''}</div>`;
};
window.uiCalendarRestPlanHtml=function(y,m){
  const zh=lang==='zh',past=y<TY||y===TY&&m<TM,startDay=y===TY&&m===TM?TD:1,run=experienceRestRun(y,m,startDay);
  if(!run)return'';
  return `<div class="v4-root v4-slab v4-restplan v4-s-off"><span class="v4-sec-ic">${studioIcon('vacation',20)}</span><span class="v4-restplan-copy"><small>${zh?(past?'當月輪班休假':'下一段輪班休假'):(past?'Libur shift bulan ini':'Libur shift berikutnya')}</small><strong>${experienceDateRange(run.start,run.end)} <em>${run.count}${run.capped?'+':''} ${zh?'天':'hari'}</em></strong><span>${zh?'依你的實際輪班；不以國定連假代替。':'Mengikuti shift Anda, terpisah dari libur nasional.'}</span></span><button class="v4-go" data-a="openDate" data-y="${run.y}" data-m="${run.m}" data-d="${run.d}" aria-label="${zh?'查看休假日期':'Lihat tanggal libur'}">${uiIcon('chevron',18)}</button></div>`;
};
window.calendarAgendaHtml=function(days){
  const zh=lang==='zh',filter=UI_CAL_FILTER,filters=[['all',zh?'全部':'Semua'],['meeting',zh?'會議':'Rapat'],['health',zh?'體檢':'Medis'],['leave',zh?'有請假':'Cuti'],['mine',zh?'本人請假':'Cuti saya'],['holiday',zh?'節日':'Perayaan'],['rest',zh?'輪班休':'Libur shift'],['adjusted',zh?'調班':'Shift diubah'],['personal',zh?'個人事項':'Pribadi']];
  const matches=day=>filter==='all'||(filter==='leave'?day.leaveCount>0:filter==='mine'?day.events.some(e=>e.own||e.id==='annualL'):filter==='holiday'?!!day.holiday:filter==='rest'?day.shift==='休':filter==='adjusted'?day.adjusted:filter==='personal'?day.events.some(e=>!['meeting','health','pay','bonus'].includes(e.id)):day.events.some(e=>e.id===filter));
  const shown=days.filter(matches),wk=t('wk'),unavailable=(filter==='leave'&&!days[0].status.known)||(['meeting','health'].includes(filter)&&!adminEvState.months.includes(days[0].key.slice(0,7)));
  return `<div class="v4-filters" role="group" aria-label="${zh?'篩選每日事項':'Filter agenda'}">${filters.map(([v,label])=>`<button id="agenda-filter-${v}" data-a="calendarFilter" data-filter="${v}" aria-pressed="${filter===v}">${label}</button>`).join('')}</div><div class="v4-agenda-head"><h3>${zh?'每日事項':'Agenda harian'}</h3><span>${zh?`${shown.length} 天`:`${shown.length} hari`}</span></div><div class="v4-adays">${shown.map(day=>{
    const chips=chipsHtml(day),weekday=wk[new Date(day.y,day.m-1,day.d).getDay()];
    return `<button class="v4-aday v4-s-${sk(day.shift)}${day.today?' today':''}" data-a="open" data-d="${day.d}" aria-current="${day.today?'date':'false'}"><span class="v4-aday-date"><strong>${day.d}</strong><small>${day.today?(zh?'今天':'Hari ini'):(zh?'週':'')+weekday}</small></span><span class="v4-aday-body"><span class="v4-aday-head"><b>${studioShiftLabel(day.shift)}</b><span class="${day.leaveCount>0?'has':''}">${day.leaveCount===null?(zh?'請假 —':'Cuti —'):esc(calendarLeaveLabel(day))}</span></span>${S.showLunar?lunarCellText(day.y,day.m,day.d):''}<span class="v4-chips">${chips||`<span class="v4-none">${zh?'無其他事項':'Tidak ada agenda lain'}</span>`}</span></span>${uiIcon('chevron',14)}</button>`;
  }).join('')||`<div class="v4-empty box"><strong>${unavailable?(zh?'資料尚未取得':'Data belum tersedia'):(zh?'目前沒有符合的日期':'Belum ada tanggal yang sesuai')}</strong><p>${filter==='leave'&&!days[0].status.known?esc(calendarLeaveStatusText(days[0].status)):(zh?'可切換「全部」查看完整班表。':'Pilih Semua untuk jadwal lengkap.')}</p></div>`}</div>`;
};

function monthDateAction(day){
  return day.inMonth?`data-a="open" data-d="${day.d}"`:`data-a="openDate" data-y="${day.y}" data-m="${day.m}" data-d="${day.d}"`;
}

function calendarWeekHtml(week){
  const zh=lang==='zh',wk=t('wk'),cells=[],notes=[];
  for(const day of week){
    const {y,m,d,shift,today,inMonth}=day;
    const weekday=new Date(y,m-1,d).getDay(),weekend=weekday===0||weekday===6;
    const weekdayLabel=(zh?'週':'')+wk[weekday];
    const action=monthDateAction(day),chips=chipsHtml(day);
    const lunar=S.showLunar?lunarCellText(y,m,d):'';
    const monthLabel=zh?`${m}月`:['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][m-1];
    const fullShift=shift==='休'?(zh?'輪班休假':'Libur shift'):studioShiftLabel(shift);
    const shortShift=shift==='休'?(zh?'輪休':'Libur'):shift?uiShiftShort(shift):(zh?'未排':'—');
    const aria=[`${y}/${m}/${d}`,weekdayLabel,today?(zh?'今天':'Hari ini'):'',fullShift,
      day.publicOff?(zh?'國定假日':'Libur nasional'):'',day.holiday,...day.events.map(e=>e.label),
      day.adjusted?(zh?'已調班':'Shift diubah'):'',calendarLeaveLabel(day),day.breakLabel].filter(Boolean).join(', ');
    const classes=['v4-cell','v4-s-'+sk(shift),inMonth?'':'adj',today?'today':'',weekend?'we':'',day.publicOff?'hol':'',day.breakLabel?'brk':'',chips?'has-notes':''].filter(Boolean).join(' ');
    const tags=[today?(zh?'今天':'Hari ini'):'',!inMonth?monthLabel:'',day.publicOff?(zh?'國假':'Libur'):''].filter(Boolean);
    cells.push(`<button type="button" class="${classes}" ${action} aria-current="${today?'date':'false'}" aria-label="${esc(aria)}"${lunar?` aria-describedby="cal-lunar-${day.key}"`:''} data-date="${day.key}" data-month-offset="${day.monthOffset}">
      <b class="c-num">${d}</b><span class="c-shift">${esc(shortShift)}</span>
      ${lunar?`<span class="c-lunar" id="cal-lunar-${day.key}">${lunar}</span>`:''}
      <span class="c-leave${day.leaveCount>0?' has':''}">${uiIcon('user',14)}<b>${day.leaveCount??'—'}</b></span>
      ${tags.length?`<span class="c-tags">${tags.map(tag=>`<span>${tag}</span>`).join('')}</span>`:''}
    </button>`);
    if(chips){
      notes.push(`<li><button type="button" class="v4-week-note" ${action}>
        <span class="v4-note-date"><b>${m}/${d}</b><small>${weekdayLabel}</small></span>
        <span class="v4-chips">${chips}</span>${uiIcon('chevron',15)}
      </button></li>`);
    }
  }
  const first=week[0],last=week[week.length-1],range=`${first.m}/${first.d} – ${last.m}/${last.d}`;
  return `<div class="v4-cal-week" role="group" aria-label="${range}"><div class="v4-week-dates">${cells.join('')}</div>
    ${notes.length?`<ul class="v4-week-notes" aria-label="${range} ${zh?'本週事項':'Agenda pekan ini'}">${notes.join('')}</ul>`:''}</div>`;
}

function monthGridHtml(days){
  const zh=lang==='zh',weeks=[];
  for(let i=0;i<days.length;i+=7)weeks.push(calendarWeekHtml(days.slice(i,i+7)));
  return `<div class="v4-cal-key"><span>${uiIcon('user',16)}${zh?'請假人數':'Jumlah cuti'}</span><span><i></i>${zh?'當日有事項':'Ada agenda'}</span></div>
    <div class="v4-grid"><div class="v4-wk" aria-label="${zh?'星期':'Hari'}">${t('wk').map((w,i)=>`<div class="${i===0||i===6?'we':''}">${w}</div>`).join('')}</div>
    <div class="v4-cells">${weeks.join('')}</div></div>
    <p class="v4-note">${zh?'附月份的日期屬於前後月。請假人數顯示「—」代表尚未取得。點日期或事項可看明細，左右滑動可換月。':'Label bulan menandai tanggal di luar bulan ini. Tanda — berarti jumlah cuti belum tersedia. Ketuk tanggal atau agenda untuk detail. Geser untuk ganti bulan.'}</p>${studioCalendarLegendHtml()}`;
}

window.uiCalendarPageHtml=function(){
  const zh=lang==='zh',y=S.yr,m=S.mo;
  const breaks=new Map();
  for(const run of calendarHolidayRuns(y,m)){
    run.dates.forEach((key,i)=>breaks.set(key,zh?`連假第 ${i+1} 天，共 ${run.length} 天`:`Libur panjang hari ${i+1} dari ${run.length}`));
  }
  const gridDays=experienceMonthDates(y,m).map(date=>{
    const day=calendarDayInfo(date.y,date.m,date.d);
    return {...day,...date,publicOff:isTWOff(day.y,day.m,day.d),breakLabel:breaks.get(day.key)||''};
  });
  const days=gridDays.filter(day=>day.inMonth),st={};days.forEach(day=>{if(day.shift)st[day.shift]=(st[day.shift]||0)+1});
  const workDays=Object.entries(st).filter(([s])=>s!=='休').reduce((n,[,v])=>n+v,0);
  const ml=zh?`${y} 年 ${m} 月`:`${String(m).padStart(2,'0')} / ${y}`;
  const context=[(RN[lang]&&RN[lang][S.rt])||S.rt||'',S.unit&&S.unit!=='__all'?S.unit:S.unit==='__all'?(zh?'全部單位':'Semua unit'):''].filter(Boolean).join(' · ');
  const isNow=y===TY&&m===TM;
  return `<div class="v4-root v4-calhead"><div class="v4-calhead-title"><h1 aria-label="${ml}">${zh?`${m}<small>月</small>`:`${String(m).padStart(2,'0')}`}</h1><p><b>${y}</b>${context?' · '+esc(context):''}<span>${zh?'班別・事項・當日人力':'Shift · Agenda · Cuti'}</span></p></div><div class="v4-calhead-nav"><button class="v4-round prev" data-a="prev" aria-label="${zh?'上個月':'Bulan sebelumnya'}">${uiIcon('chevron',18)}</button><button class="v4-pill${isNow?' on':''}" data-a="today">${studioIcon('event',15)}${zh?'今天':'Hari ini'}</button><button class="v4-round next" data-a="next" aria-label="${zh?'下個月':'Bulan berikutnya'}">${uiIcon('chevron',18)}</button></div></div>`
   +`<div class="v4-root v4-slab v4-month" aria-label="${ml}">${uiMonthSummaryHtml(st,workDays)}<div class="v4-switch" role="group" aria-label="${zh?'班表顯示方式':'Tampilan jadwal'}"><button id="calendar-view-month" data-a="calendarView" data-view="month" aria-pressed="${UI_CAL_VIEW==='month'}">${studioIcon('calendar',16)}${zh?'月曆總覽':'Kalender'}</button><button id="calendar-view-agenda" data-a="calendarView" data-view="agenda" aria-pressed="${UI_CAL_VIEW==='agenda'}">${studioIcon('event',16)}${zh?'每日清單':'Agenda harian'}</button></div>${calendarDataNoticeHtml(y,m)}${S.showLunar?lunarTodayStrip():''}${UI_CAL_VIEW==='agenda'?calendarAgendaHtml(days):monthGridHtml(gridDays)}</div>`
   +uiCalendarTodayAnchorHtml()+uiCalendarRestPlanHtml(y,m)+uiCalendarBreakStripHtml(y,m)+calendarHighlightsHtml(days)+uiQuickToolsHtml()+uiCalendarHolidaysHtml(days)+uiCalendarNoticesHtml(days)+uiUpcomingEventsHtml(y,m);
};

/* 左右滑動月曆換月（新增）。垂直捲動不受影響；換月後月曆從滑動方向滑入。 */
let sx=0,sy=0,tracking=false;
document.addEventListener('touchstart',e=>{const g=e.target.closest&&e.target.closest('.v4-grid');tracking=!!g&&e.touches.length===1;if(tracking){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});
document.addEventListener('touchcancel',()=>{tracking=false},{passive:true});
document.addEventListener('touchend',e=>{
  if(!tracking)return;tracking=false;const c=e.changedTouches[0],dx=c.clientX-sx,dy=c.clientY-sy;
  if(Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.6)return;
  const btn=document.querySelector('.v4-calhead-nav .'+(dx<0?'next':'prev'));if(!btn)return;
  slide(dx<0?'r':'l');btn.click();
},{passive:true});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.v4-calhead-nav [data-a=prev],.v4-calhead-nav [data-a=next]');if(b&&e.isTrusted)slide(b.dataset.a==='next'?'r':'l')},true);
function slide(dir){
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const old=document.querySelector('.v4-cells');let tries=0;
  (function wait(){requestAnimationFrame(()=>{const g=document.querySelector('.v4-cells');if(g&&g!==old)g.classList.add('in-'+dir);else if(++tries<8)wait()})})();
}
if(typeof render==='function')render();
})();
