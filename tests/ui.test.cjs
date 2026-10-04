'use strict';
process.env.TZ='Asia/Taipei';
// Production presenters + real action dispatcher. No browser or network required.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function presenter(name){
  const a=source.lastIndexOf('function '+name+'(');
  assert.ok(a>=0,name);
  const b=source.indexOf('\nfunction ',a+9);
  return source.slice(a,b<0?source.length:b);
}
const names=['salaryNightCalibrationHtml','salaryHistoryHtml','natureControlsHtml','salaryForecastTitle','salaryFieldLabels','salaryNoteText','salaryReconciliationHtml','salaryDailyAuditHtml','salaryDateLabel','uiIcon','uiShiftClass','uiShiftShort','uiFormatDuration','uiHeaderHtml','uiBottomNavHtml','uiScreenHeading','studioIcon','studioWeatherSculpture','studioWeatherIcon','studioShiftLabel','studioShiftTime','uiTodayHeroHtml','uiWeekStripHtml','uiWeatherPreviewHtml','uiPayPreviewHtml','studioMoney','studioSalaryRows','uiSalaryDashboardHtml','uiPrecipChartHtml','_wxTimeLabel','_wxStatusHtml','wxHtml','uiTideCurveHtml','tideHtml','studioCalendarLegendHtml','uiCalendarTodayAnchorHtml','uiMonthSummaryHtml','uiUpcomingEventsHtml','calendarHolidayRuns','uiCalendarBreakStripHtml','uiCalendarHolidaysHtml','uiCalendarNoticesHtml','calendarScopedLeaves','calendarLeaveStatus','calendarLeaveStatusText','calendarDayInfo','calendarLeaveLabel','calendarEventChipsHtml','calendarDaySummaryHtml','calendarHighlightsHtml','calendarDataNoticeHtml','calendarAgendaHtml','uiCalendarPageHtml','rCal','uiMoreHtml','fbBarHtml','uiLeaveSummaryHtml','_miniSwitch'];
const fixed=Date.parse('2026-09-10T10:10:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
function env(lang='zh'){
  const store=new Map();
  const c={salaryHistoryAudit:()=>({total:0}),WxFx:{getQuality:()=>"balanced"},Date:Clock,Math,Number,String,Array,Object,Set,console,Payroll:require('../payroll.js'),lang,TY:2026,TM:9,TD:10,
    S:{step:'cal',yr:2026,mo:9,rt:'4on2off',unit:'測試單位',showLunar:false,instH:true},UI_TAB:'today',UI_CAL_VIEW:'month',UI_CAL_FILTER:'all',adminEvState:{months:['2026-09'],loading:false,error:false},payrollLeaveState:{uid:'me',unit:'測試單位',months:['2026-09'],loading:false,error:false},PAY_VIEW:{y:2026,m:8},
    RN:{zh:{'4on2off':'四休二'},id:{'4on2off':'4 kerja 2 libur'}},SC:{早:'e',晚:'n',中:'m',休:'o'},
    EVS:{},NOTES:{},TYD:{},ALD:{},SHIFT_OV:{},DP:null,IMG:{icon:'./icons/icon-192x192.png'},
    fbUser:null,fbLoginPending:false,admin:false,shift:'早',WxSfx:{isMuted:()=>true,getVolume:()=>.3},
    wxData:null,_wxLoading:false,_wxErrorCode:'',tideData:null,tideErr:true,tideCollapsed:false,
    WXZ:{0:'晴天',2:'局部多雲',3:'多雲',63:'中雨'},WXD:{0:'Cerah',2:'Berawan',3:'Mendung',63:'Hujan'},
    navigator:{onLine:true,userAgent:'test'},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},
    render(){},loadLeaves(){},loadAdminEv(){},notifyCtaHtml:()=>'',wxAlertHtml:()=>'',rainWarnHtml:()=>'',rainObsHtml:()=>'',
    _wxStale:()=>false,_wxErrorText:()=>lang==='zh'?'請選擇地點':'Pilih lokasi',_wxHourIndex:()=>0,
    _wxCurrentView:d=>({code:d&&d.code,sourceLabel:'Open-Meteo 模式預報',note:'',stationFresh:false}),
    _normalPop:p=>p===null||p===undefined?null:Number(p),_popSourceAt:()=> 'open-meteo',
    _nowHourKey:()=> '2026-09-10T18',
    ek:(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-'),
    esc:s=>String(s??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[v]),
    dim:(y,m)=>new Date(y,m,0).getDate(),fdw:(y,m)=>new Date(y,m-1,1).getDay(),
    rot:()=>({h:12}),cyc:()=>['早','早','休','休','晚','晚'],
    formatShiftOffset:(rule,minutes)=>{const v=(rule.startMinute+minutes)%1440;return String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0')},
    getAdminEv:()=>[],hasAdminEv:()=>false,getLeaves:()=>[],isRegularLeave:l=>l.hours>0,myLeave:()=>[],getLT:()=>({}),
    gh:()=>null,isTWOff:()=>false,getPayDay:(y,m,d)=>d,getAL:()=>({total:80}),alRem:()=>56,curALY:()=>2025,alYRange:()=> '2025/12/26 – 2026/12/25',
    en:v=>v,sf:s=>s,lunarTodayStrip:()=>'<div class="alm-strip">農曆</div>',lunarCellText:()=>'<span class="lun-mini">初十</span>',
    latestClosedSalaryMonth:()=>({y:2026,m:8}),
    calcPayPeriod:()=>({sd:new Date(2026,6,26),ed:new Date(2026,7,25),wd:22,tH:264,oH:64,rawOH:88}),
    estimate:{net:27700,income:29000,deduction:1300,baseSum:24000,otH:64,fixedDed:1000,hourly:180,otHourly:180,leaveHourly:180},
    errors:[],alert:message=>c.errors.push(message),
  };
  c.t=key=>key==='wk'?(lang==='zh'?['日','一','二','三','四','五','六']:['Min','Sen','Sel','Rab','Kam','Jum','Sab']):({app:lang==='zh'?'我的班表':'Jadwal Saya',hr:lang==='zh'?'小時':'jam',alRem:lang==='zh'?'特休餘額':'Sisa cuti',rem:lang==='zh'?'接下來的行程':'Agenda'})[key]||key;
  c.gs=()=>c.shift;c.getShiftWorkRule=()=>({isWork:c.shift!=='休',startMinute:c.shift==='晚'?1200:480,shiftHours:12});
  c.isAdmin=()=>c.admin;c.calcSalaryEst=()=>c.estimate;
  c.window={addEventListener(){}};c.getSeason=()=>"autumn";c.WxSfx.getButtonVolume=()=>.45;c.isFxEnabled=()=>true;c.isFxMasterEnabled=()=>true;c.isFxAdminEnabled=()=>true;c.leaveHoursDetail=l=>({regularHours:l.hours||0,overtimeHours:0});c._popSourceLabel=()=>"Open-Meteo 模式預報";
  vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../schedule-experience.js'),'utf8'),c);vm.runInContext(names.map(presenter).join('\n'),c);
  const ha=source.indexOf('function handle('),hb=source.indexOf('let wxData=null',ha);
  vm.runInContext(source.slice(ha,hb),c);
  c.action=(a,data={})=>c.handle({currentTarget:{dataset:{a,...data}}});
  return c;
}
function data(){return {temp:28,code:0,source:'Open-Meteo',provider:'open-meteo',updatedAt:fixed,sourceTime:fixed,lat:23.32,lon:120.27,locationSource:'manual',place:{display:'臺南市 鹽水區'},hTime:[],hPrec:[],days:Array.from({length:7},(_,i)=>({date:'2026-09-'+(10+i),code:i?3:0,hi:31,lo:24}))}}
test('all five production screens render in both languages with optional services unavailable',()=>{
  for(const lang of ['zh','id']){
    const c=env(lang);
    for(const tab of ['today','calendar','pay','weather','more']){
      c.UI_TAB=tab;const html=c.rCal();assert.ok(html.includes('data-screen="'+tab+'"'));assert.ok(html.includes('aria-current="page"'));assert.doesNotMatch(html,/undefined|NaN/);
    }
  }
});
test('calendar has every real date, correct December/January navigation and native date buttons',()=>{
  const c=env();c.S.yr=2026;c.S.mo=12;
  let h=c.uiCalendarPageHtml();assert.equal((h.match(/class="day /g)||[]).length,35);assert.equal((h.match(/<button type="button" class="day /g)||[]).length,35);assert.equal((h.match(/data-month-offset="0"/g)||[]).length,31);assert.doesNotMatch(h,/calendar-empty-cell/);
  c.action('next');assert.equal(c.S.yr,2027);assert.equal(c.S.mo,1);
  c.action('prev');assert.equal(c.S.yr,2026);assert.equal(c.S.mo,12);
  c.action('today');assert.equal(c.S.yr,2026);assert.equal(c.S.mo,9);
  c.action('open',{d:'25'});assert.equal(JSON.stringify(c.S.modal),JSON.stringify({y:2026,m:9,d:25}));assert.deepEqual(c.errors,[]);
});
test('adjacent calendar cells open their actual date and leave main-month summaries unchanged',()=>{
  for(const language of ['zh','id']){
    const c=env(language);c.fbUser={uid:'me'};c.S.yr=2027;c.S.mo=1;
    c.gs=(y,m)=>m===1?'早':'晚';c.payrollLeaveState.months=['2027-01'];
    const html=c.uiCalendarPageHtml();assert.equal((html.match(/data-month-offset="0"/g)||[]).length,31);assert.equal((html.match(/adjacent-month/g)||[]).length,11);
    assert.match(html,/data-a="openDate" data-y="2026" data-m="12" data-d="27"/);assert.match(html,/data-a="openDate" data-y="2027" data-m="2" data-d="6"/);assert.doesNotMatch(html,/calendar-empty-cell/);
    const first=html.match(/<button type="button" class="day [^>]*data-date="2026-12-27"[\s\S]*?<\/button>/)[0];assert.match(first,/day-month-label/);assert.match(first,language==='zh'?/>12月</:/>Des</);assert.match(first,/unknown/);assert.match(first,/>—</);
    c.action('openDate',{y:'2026',m:'12',d:'27'});assert.equal(JSON.stringify(c.S.modal),JSON.stringify({y:2026,m:12,d:27}));
  }
});
test('weekends are individually tagged and Taiwan holiday weekends become a visible multi-day break',()=>{
  const c=env();c.S.yr=2026;c.S.mo=9;
  c.isTWOff=(y,m,d)=>y===2026&&m===9&&(d===25||d===28);
  c.gh=(y,m,d)=>y===2026&&m===9&&d===25?'中秋節':y===2026&&m===9&&d===28?'教師節':null;
  const h=c.uiCalendarPageHtml();
  assert.match(h,/class="calendar-breaks"/);assert.match(h,/9\/25（五）/);assert.match(h,/9\/28（一）/);assert.match(h,/4天/);
  assert.equal((h.match(/class="day [^"]* break-day/g)||[]).length,4);
  assert.match(h,/data-d="26" aria-current="false" aria-label="26 早班, 星期六/);
  assert.match(h,/data-d="27" aria-current="false" aria-label="27 早班, 星期日/);
  assert.match(h,/class="calendar-date-tag official"[^>]*title="中秋節"[^>]*>假/);
  c.isTWOff=()=>false;c.gh=()=>null;c.S.mo=11;
  assert.doesNotMatch(c.uiCalendarPageHtml(),/class="calendar-breaks"/);
});
test('seven-day and reminder actions open their explicit date across month and year boundaries',()=>{
  const c=env();c.TY=2026;c.TM=12;c.TD=29;
  const h=c.uiWeekStripHtml();assert.match(h,/data-y="2027" data-m="1" data-d="1"/);
  c.action('openDate',{y:'2027',m:'1',d:'1'});assert.equal(JSON.stringify(c.S.modal),JSON.stringify({y:2027,m:1,d:1}));
  c.EVS['2027-01-02']=['custom'];c.NOTES['2027-01-02']='<img src=x onerror=alert(1)>';
  const events=c.uiUpcomingEventsHtml(2027,1);assert.match(events,/data-y="2027" data-m="1" data-d="2"/);assert.match(events,/&lt;img/);assert.doesNotMatch(events,/<img/);
});
test('shift console displays the actual remaining duration and no fabricated progress on rest days',()=>{
  const c=env();const h=c.uiTodayHeroHtml();assert.match(h.replace(/<[^>]+>/g,''),/1小時50分/);assert.match(h,/aria-valuenow="85"/);
  c.shift='休';const rest=c.uiTodayHeroHtml();assert.match(rest,/今天休息/);assert.doesNotMatch(rest,/role="progressbar"|班表已同步|連休第 1/);
});
test('salary shows configured amounts and only claims verification when the difference is zero',()=>{
  const c=env();let h=c.uiSalaryDashboardHtml(2026,8);assert.match(h,/\$27,700/);assert.match(h,/2026\/07\/26 – 2026\/08\/25/);assert.match(h,/扣假後工時/);
  c.estimate.verified=true;c.estimate.verificationDelta=100;h=c.uiSalaryDashboardHtml(2026,8);assert.doesNotMatch(h,/已核對實領|與公司薪資條一致/);
  c.estimate.verificationDelta=0;assert.doesNotMatch(c.uiSalaryDashboardHtml(2026,8),/已核對實領|公司實領/); // A totals-only flag is never a complete slip.
  c.estimate=null;assert.match(c.uiSalaryDashboardHtml(2026,8),/data-a="salOpen"/);
});
test('live weather retains chosen location, source time, refresh, daily detail and radar actions',()=>{
  const c=env();c.wxData=data();const h=c.wxHtml();assert.match(h,/臺南市 鹽水區/);assert.match(h,/開啟時每 5 分鐘更新/);assert.match(h,/09\/10\s+18:10/);assert.match(h,/data-a="wxR"/);assert.match(h,/href="radar2.html"/);assert.equal((h.match(/class="forecast-day/g)||[]).length,7);
  assert.notEqual(c.studioWeatherIcon(null),c.studioWeatherIcon(0));
});
test('weather screen and home preview show the local rain check beside model conditions',()=>{
  const c=env();c.wxData=data();c._wxCurrentView=()=>({code:2,sourceLabel:'Open-Meteo 溫度＋CWA 雨量實測',note:'附近雨量站近10分鐘 0.0 mm；雲況依模式估算',stationFresh:true});
  const weather=c.wxHtml(),home=c.uiWeatherPreviewHtml();
  assert.match(weather,/局部多雲/);assert.match(weather,/附近雨量站近10分鐘 0\.0 mm/);assert.match(weather,/Open-Meteo 溫度＋CWA 雨量實測/);
  assert.match(home,/附近雨量站近10分鐘 0\.0 mm/);assert.match(home,/局部多雲/);
});
test('more screen preserves account and role restrictions without duplicate admin controls',()=>{
  const c=env();c.UI_TAB='more';let h=c.rCal();assert.match(h,/id="loginBtn"/);assert.doesNotMatch(h,/data-a="leavesOv"/);
  c.fbUser={uid:'me',displayName:'測試 <名字>'};c.admin=true;h=c.rCal();assert.match(h,/測試 &lt;名字&gt;/);assert.equal((h.match(/data-a="leavesOv"/g)||[]).length,1);assert.equal((h.match(/role="switch"/g)||[]).length,3);
  const toggle=c._miniSwitch(true,'setUserPref()',true,'#fff','警報通知');assert.match(toggle,/role="switch" aria-checked="true" aria-label="警報通知" disabled/);
});

test('saved company records display consistently while the independent estimate and difference remain visible',()=>{
  const c=env();const slip={baseSum:24000,proposal:400,otherIncome:0,otTaxFree:1800,otTaxable:600,holidayPay:1000,nightPay:1200,fixedDed:1000,leaveDed:400,laborPensionSelf:0,income:29000,deduction:1400,net:27600,weekdayH:16,holidayH:8,sickH:8,disasterH:0,payDate:'2026-09-05'};
  Object.assign(c.estimate,{baseSum:24000,otPay:3000,holidayPay:0,nightPay:2000,proposal:0,otherIncome:0,fixedDed:1000,leaveDed:300,laborPensionSelf:0,hasSlip:true,official:slip,notes:[]});
  c.estimate.reconciliation=c.Payroll.reconcile(c.estimate,slip);
  const h=c.uiSalaryDashboardHtml(2026,8);assert.match(h,/<strong class="salary-net">\$27,600<\/strong>/);assert.match(h,/公司實領 · 既有薪資條/);
  assert.match(h,/班表自動計算與公司差額/);assert.match(h,/班表估算實領<strong>\$27,700/);assert.match(h,/\+\$100/);assert.doesNotMatch(h,/公司實領 · 薪資條記錄|加入薪資條|undefined|NaN/);
  const home=c.uiPayPreviewHtml();assert.match(home,/\$27,600/);assert.doesNotMatch(home,/\$27,700/);
});
test('September company net is 52302 while the remaining unknown night-rule difference is shown explicitly',()=>{
  const c=env(),slip=JSON.parse(fs.readFileSync(path.join(__dirname,'../private-import/2026-09-payroll.json'),'utf8')).slip;
  Object.assign(c.estimate,{baseSum:39590,proposal:400,otherIncome:0,otPay:12867,holidayPay:0,nightPay:3423,fixedDed:2540,leaveDed:2639,laborPensionSelf:0,
    income:56280,deduction:5179,net:51101,hasSlip:true,official:slip,incomplete:true,notes:['nightEstimate','nightAmountMismatch']});
  c.estimate.reconciliation=c.Payroll.reconcile(c.estimate,slip);
  for(const lang of ['zh','id']){c.lang=lang;const html=c.uiSalaryDashboardHtml(2026,9);
    assert.match(html,/<strong class="salary-net">\$52,302<\/strong>/);assert.match(html,/\$51,101/);assert.match(html,/−\$1,201/);
    assert.doesNotMatch(html,/NaN|undefined/);}
});
test('calibrated night amounts display their immutable source and cannot claim an independently verified match',()=>{
  const c=env(),raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../private-import/2026-09-payroll.json'),'utf8'));
  const model=c.Payroll.calibrateNight(raw.month,raw.slip,raw.sourceDetails.nightBaseline);
  Object.assign(c.estimate,{baseSum:39590,proposal:400,otherIncome:0,otPay:12867,holidayPay:0,nightPay:4624,nightCount:7,
    fixedDed:2540,leaveDed:2639,laborPensionSelf:0,income:57481,deduction:5179,net:52302,hasSlip:true,official:raw.slip,
    incomplete:true,notes:['nightCalibratedEstimate'],nightCalibration:model});
  c.estimate.reconciliation=c.Payroll.reconcile(c.estimate,raw.slip);
  for(const lang of ['zh','id']){c.lang=lang;const html=c.uiSalaryDashboardHtml(2026,9);
    assert.match(html,/\$52,302/);assert.match(html,/\$4,624/);assert.match(html,/660\.5714/);
    assert.match(html,lang==='zh'?/校準估算/:/Estimasi terkalibrasi/);assert.doesNotMatch(html,/分項一致|已核對|NaN|undefined/);
  }
});
test('unknown night components and loading never masquerade as a complete net',()=>{
  const c=env();Object.assign(c.estimate,{net:25000,nightPay:0,missingComponents:true,incomplete:true,notes:['nightRate']});
  let h=c.uiSalaryDashboardHtml(2026,8);assert.match(h,/已算項目小計 · 尚有缺項/);assert.match(h,/待計算/);assert.doesNotMatch(h,/自動預估實領|加入薪資條/);
  assert.match(c.uiPayPreviewHtml(),/小計/);
  c.estimate.dataPending=true;h=c.uiSalaryDashboardHtml(2026,8);assert.match(h,/同步中/);assert.doesNotMatch(h,/\$25,000/);
  assert.doesNotMatch(c.uiPayPreviewHtml(),/\$25,000/);assert.match(h,/薪資紀錄 · 自動核算/);
});

test('daily agenda merges notices, personal notes and pay labels, without exposing colleague identities',()=>{
  const c=env();c.fbUser={uid:'me'};
  c.getAdminEv=key=>key==='2026-09-20'?['health','meeting','health']:[];
  c.EVS['2026-09-20']=['meeting','custom','class'];c.NOTES['2026-09-20']='注意 <img src=x onerror=alert(1)>';
  c.getLeaves=()=>[{uid:'a',unit:'測試單位',hours:2,name:'PRIVATE_NAME',reason:'PRIVATE_REASON'},{uid:'a',unit:'測試單位',hours:3},{uid:'b',unit:'測試單位',hours:4},{uid:'c',unit:'測試單位',hours:0}];
  const day=c.calendarDayInfo(2026,9,20);
  assert.equal(day.leaveCount,2);assert.equal(day.events.filter(e=>e.id==='meeting').length,1);assert.equal(day.events.filter(e=>e.id==='health').length,1);
  const h=c.uiCalendarPageHtml();assert.match(h,/tone-meeting[^>]*>班股會議/);assert.match(h,/tone-health[^>]*>健康檢查/);assert.match(h,/>請假<\/span><b>2<\/b>/);
  c.action('calendarFilter',{filter:'health'});assert.equal(c.UI_CAL_VIEW,'agenda');assert.equal(c.UI_CAL_FILTER,'health');
  const agenda=c.uiCalendarPageHtml();assert.equal((agenda.match(/class="agenda-day[" ]/g)||[]).length,1);assert.match(agenda,/&lt;img/);assert.match(agenda,/績效獎金/);assert.doesNotMatch(agenda,/<img src=x|PRIVATE_NAME|PRIVATE_REASON/);
  const brief=c.calendarDaySummaryHtml(2026,9,20);assert.match(brief,/2 人請假/);assert.match(brief,/class/);assert.match(brief,/&lt;img/);
});
test('unknown and failed leave loading do not masquerade as zero; loaded empty days are zero',()=>{
  const c=env();c.fbUser={uid:'me'};c.payrollLeaveState.months=[];
  assert.equal(c.calendarDayInfo(2026,9,1).leaveCount,null);
  assert.match(c.uiCalendarPageHtml(),/>請假<\/span><b>—<\/b>/);
  c.payrollLeaveState.error=true;assert.match(c.uiCalendarPageHtml(),/data-a="calendarReload"/);
  c.payrollLeaveState.error=false;c.payrollLeaveState.months=['2026-09'];
  assert.equal(c.calendarDayInfo(2026,9,1).leaveCount,0);
  c.fbUser=null;assert.equal(c.calendarDayInfo(2026,9,1).leaveCount,null);assert.match(c.uiCalendarPageHtml(),/登入後/);
});
test('today console and seven-day cards always show anonymous leave counts, including zero and unknown',()=>{
  const c=env();c.fbUser={uid:'me'};
  let hero=c.uiTodayHeroHtml();assert.match(hero,/hero-leave-overview/);assert.match(hero,/9\/10 當日請假/);assert.match(hero,/hero-leave-number"><b>0<\/b>/);
  assert.equal((c.uiWeekStripHtml().match(/class="week-leave-count/g)||[]).length,7);
  c.getLeaves=key=>key==='2026-09-10'?[{uid:'other',unit:'測試單位',hours:4,name:'PRIVATE_NAME'}]:[];
  hero=c.uiTodayHeroHtml();assert.match(hero,/hero-leave-number"><b>1<\/b>/);assert.doesNotMatch(hero,/PRIVATE_NAME/);assert.match(c.uiCalendarTodayAnchorHtml(),/1 人請假/);
  c.payrollLeaveState.months=[];hero=c.uiTodayHeroHtml();assert.match(hero,/hero-leave-number"><b>—<\/b>/);assert.match(hero,/資料未取得/);assert.doesNotMatch(hero,/hero-leave-number"><b>0<\/b>/);
  c.lang='id';assert.match(c.uiTodayHeroHtml(),/Cuti tanggal ini/);assert.match(c.uiWeekStripHtml(),/>Cuti<\/span><b>—/);
});
test('selected-unit counts exclude own history from other units and include separate manual placeholders across units',()=>{
  const c=env();c.fbUser={uid:'me'};
  c.getLeaves=()=>[{uid:'me',unit:'其他單位',hours:8},{uid:'a',unit:'測試單位',hours:3},{uid:'a',unit:'測試單位',hours:5},{uid:'admin_0',unit:'測試單位',hours:8},{uid:'admin_0',unit:'其他單位',hours:8}];
  assert.equal(c.calendarDayInfo(2026,9,1).leaveCount,2);
  c.S.unit='__all';assert.equal(c.calendarDayInfo(2026,9,1).leaveCount,null);
  c.payrollLeaveState.unit='__all';assert.equal(c.calendarDayInfo(2026,9,1).leaveCount,4);
});
test('agenda contains all dates, filters leave days, handles empty months and preserves leap dates',()=>{
  const c=env();c.fbUser={uid:'me'};c.action('calendarView',{view:'agenda'});
  assert.equal((c.uiCalendarPageHtml().match(/class="agenda-day[" ]/g)||[]).length,30);
  c.action('calendarFilter',{filter:'leave'});assert.match(c.uiCalendarPageHtml(),/目前沒有符合的日期/);
  c.getLeaves=key=>key==='2026-09-03'?[{uid:'a',unit:'測試單位',hours:4}]:[];
  assert.equal((c.uiCalendarPageHtml().match(/class="agenda-day[" ]/g)||[]).length,1);
  c.S.yr=2028;c.S.mo=2;c.action('calendarView',{view:'month'});
  assert.equal((c.uiCalendarPageHtml().match(/class="day /g)||[]).length,35);assert.equal((c.uiCalendarPageHtml().match(/data-month-offset="0"/g)||[]).length,29);
  c.action('today');assert.equal(c.UI_CAL_FILTER,'all');assert.equal(c.UI_CAL_VIEW,'month');
});

test('announcement loads reject out-of-order months, deduplicate dates and remove cancelled notices',async()=>{
  const c=env(),pending=[];c.adminEvCache={};c.adminEvRequest=0;c.ADMIN_EV=['meeting','health'];
  c.fsEnqueue=fn=>Promise.resolve().then(fn);
  c.fbDb={collection:()=>({where:(field,op,ym)=>({get:()=>new Promise(resolve=>pending.push({ym,resolve}))})})};
  vm.runInContext(presenter('loadAdminEv'),c);
  const snapshot=rows=>({forEach:fn=>rows.forEach(data=>fn({data:()=>data}))});
  const old=c.loadAdminEv();await Promise.resolve();const oldRequests=pending.splice(0);assert.deepEqual(oldRequests.map(p=>p.ym),['2026-08','2026-09','2026-10']);
  c.S.mo=10;const recent=c.loadAdminEv();await Promise.resolve();const newRequests=pending.splice(0);assert.deepEqual(newRequests.map(p=>p.ym),['2026-09','2026-10']);
  newRequests.forEach(p=>p.resolve(snapshot(p.ym==='2026-10'?[{date:'2026-10-19',type:'health'},{date:'2026-10-19',type:'health'}]:[])));await recent;
  oldRequests.forEach(p=>p.resolve(snapshot(p.ym==='2026-09'?[{date:'2026-09-20',type:'meeting'}]:[])));await old;
  assert.equal(JSON.stringify(c.adminEvCache),JSON.stringify({'2026-10-19':['health']}));
  const cancel=c.loadAdminEv();await Promise.resolve();pending.splice(0).forEach(p=>p.resolve(snapshot([])));await cancel;
  assert.deepEqual(Object.keys(c.adminEvCache),[]);assert.ok(c.adminEvState.months.includes('2026-10'));
});

test('holiday ranges, full-month names and original calendar sections are visible without expanding anything',()=>{
  for(const lang of ['zh','id']){
    const c=env(lang);c.fbUser={uid:'me'};c.S.mo=10;c.payrollLeaveState.months=['2026-10'];
    const holidays={9:lang==='zh'?'國慶日(補假)':'Libur Pengganti',10:lang==='zh'?'國慶日':'Hari Nasional TW',18:lang==='zh'?'重陽節':'Chongyang',25:lang==='zh'?'光復節':'Hari Retrosesi',26:lang==='zh'?'光復節(補假)':'Libur Pengganti',31:lang==='zh'?'萬聖節':'Halloween'};
    c.gh=(y,m,d)=>y===2026&&m===10?holidays[d]||null:null;
    c.isTWOff=(y,m,d)=>y===2026&&m===10&&[9,26].includes(d);
    c.getAdminEv=key=>key==='2026-10-19'?['health']:[];
    c.getLeaves=key=>key==='2026-10-19'?[{uid:'a',hours:8,unit:'測試單位'}]:[];
    c.EVS['2026-10-20']=['custom'];c.NOTES['2026-10-20']='PERSONAL_NOTE';
    for(const view of ['month','agenda']){
      c.UI_CAL_VIEW=view;const h=c.uiCalendarPageHtml();
      assert.doesNotMatch(h,/<details|calendar-holiday-details|\shidden(?:[\s=>])/);
      assert.equal((h.match(/class="calendar-break-item"/g)||[]).length,2);
      const names=h.match(/<div class="calendar-holiday-list">([\s\S]*?)<p class="holiday-work-note">/)[1];
      for(const name of Object.values(holidays))assert.ok(names.includes(name));
      assert.equal((names.match(/class="calendar-holiday-row"/g)||[]).length,6);
      for(const marker of ['calendar-today-anchor','restored-notice','rem-list','PERSONAL_NOTE'])assert.ok(h.includes(marker),marker);
      if(view==='month'){
        assert.ok(h.indexOf('class="calendar-breaks"')<h.indexOf('class="wk-row"'));
        assert.equal((h.match(/class="break-day-tag"/g)||[]).length,6);
        assert.match(h,/1\/3/);assert.match(h,/3\/3/);
      }
    }
  }
});
test('holiday list remains for past dates and months without long weekends',()=>{
  const c=env();c.S.mo=8;c.gh=(y,m,d)=>m===8&&d===8?'父親節':null;c.isTWOff=()=>false;
  const h=c.uiCalendarPageHtml();assert.doesNotMatch(h,/class="calendar-breaks"/);assert.match(h,/class="calendar-holiday-row" data-a="open" data-d="8"/);assert.match(h,/父親節/);
  c.gh=()=>null;assert.match(c.uiCalendarPageHtml(),/本月沒有已收錄的假日或節日/);
});
test('cross-year holiday ranges keep both dates and holiday rows open the selected calendar month',()=>{
  const c=env();c.S.yr=2027;c.S.mo=12;
  c.isTWOff=(y,m,d)=>y===2027&&m===12&&d===31;
  c.gh=(y,m,d)=>y===2027&&m===12&&d===31?'元旦(補假)':y===2028&&m===1&&d===1?'元旦':null;
  const h=c.uiCalendarPageHtml();assert.match(h,/12\/31（五）/);assert.match(h,/1\/2（日）/);
  c.action('open',{d:'31'});assert.equal(JSON.stringify(c.S.modal),JSON.stringify({y:2027,m:12,d:31}));
});

test('exact holiday names, own leave and commute helpers remain prominent without revealing colleagues',()=>{
 const c=env();c.fbUser={uid:'me'};c.gh=(y,m,d)=>d===25?'中秋節':null;c.myLeave=key=>key.endsWith('-25')?[{uid:'me',leaveType:'sick',hours:8}]:[];c.getLT=()=>({name:'病假',nameId:'Cuti sakit'});
 const html=c.uiCalendarPageHtml();assert.match(html,/class="[^"]*day-holiday[^"]*"[^>]*>中秋節/);assert.match(html,/病假 8h/);assert.match(html,/experienceOpenDay\('leave'\)/);assert.match(html,/data-a="share"/);
 const day=c.calendarDayInfo(2026,9,25);assert.equal(day.events[0].label,'本人 病假 8h');
 c.isFxMasterEnabled=()=>false;c.isFxEnabled=()=>false;const controls=c.natureControlsHtml();assert.match(controls,/role="switch" aria-checked="false"/);assert.match(controls,/已關閉，輕觸恢復/);assert.match(controls,/previewNature\('rain',this\)" disabled/);
});
