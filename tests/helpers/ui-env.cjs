'use strict';
// Shared harness for presenter tests: the real view functions run in a vm context, no browser or network.
// Used by tests/ui.test.cjs (original presenters) and tests/v4-view.test.cjs (redesigned view layer).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8');
function presenter(name){
  const a=source.lastIndexOf('function '+name+'(');
  assert.ok(a>=0,name);
  const b=source.indexOf('\nfunction ',a+9);
  return source.slice(a,b<0?source.length:b);
}
const names=['salaryNightCalibrationHtml','salaryHistoryHtml','effectDescription','natureControlsHtml','salaryForecastTitle','salaryFieldLabels','salaryNoteText','salaryReconciliationHtml','salaryDailyAuditHtml','salaryDateLabel','uiIcon','uiShiftClass','uiShiftShort','uiFormatDuration','uiHeaderHtml','uiBottomNavHtml','uiScreenHeading','studioIcon','studioWeatherSculpture','studioWeatherIcon','studioShiftLabel','studioShiftTime','uiTodayHeroHtml','uiWeekStripHtml','uiWeatherPreviewHtml','uiPayPreviewHtml','studioMoney','studioSalaryRows','uiSalaryDashboardHtml','uiPrecipChartHtml','_wxTimeLabel','_wxStatusHtml','wxHtml','uiTideCurveHtml','tideHtml','studioCalendarLegendHtml','uiCalendarTodayAnchorHtml','uiMonthSummaryHtml','uiUpcomingEventsHtml','calendarHolidayRuns','uiCalendarBreakStripHtml','uiCalendarHolidaysHtml','uiCalendarNoticesHtml','calendarScopedLeaves','calendarLeaveStatus','calendarLeaveStatusText','calendarDayInfo','calendarLeaveLabel','calendarEventChipsHtml','calendarDaySummaryHtml','calendarHighlightsHtml','calendarDataNoticeHtml','calendarAgendaHtml','uiCalendarPageHtml','rCal','uiMoreHtml','fbBarHtml','uiLeaveSummaryHtml','_miniSwitch'];
const fixed=Date.parse('2026-09-10T10:10:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
function env(lang='zh'){
  const store=new Map();
  const c={salaryHistoryAudit:()=>({total:0}),WxFx:{getQuality:()=>"balanced"},Date:Clock,Math,Number,String,Array,Object,Set,console,Payroll:require('../../payroll.js'),lang,TY:2026,TM:9,TD:10,
    S:{step:'cal',yr:2026,mo:9,rt:'4on2off',unit:'測試單位',showLunar:false,instH:true},UI_TAB:'today',UI_CAL_VIEW:'month',UI_CAL_FILTER:'all',adminEvState:{months:['2026-09'],loading:false,error:false},payrollLeaveState:{uid:'me',unit:'測試單位',months:['2026-09'],loading:false,error:false},PAY_VIEW:{y:2026,m:8},
    RN:{zh:{'4on2off':'四休二'},id:{'4on2off':'4 kerja 2 libur'}},SC:{早:'e',晚:'n',中:'m',休:'o'},
    EVS:{},NOTES:{},TYD:{},ALD:{},SHIFT_OV:{},DP:null,IMG:{icon:'./icons/icon-192x192.png'},
    fbUser:null,fbLoginPending:false,fbLogoutPending:false,admin:false,shift:'早',WxSfx:{isMuted:()=>true,getVolume:()=>.3},
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
  vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../schedule-experience.js'),'utf8'),c);vm.runInContext(names.map(presenter).join('\n'),c);
  const ha=source.indexOf('function handle('),hb=source.indexOf('let wxData=null',ha);
  vm.runInContext(source.slice(ha,hb),c);
  c.action=(a,data={})=>c.handle({currentTarget:{dataset:{a,...data}}});
  return c;
}

module.exports={env,source,presenter,names,fixed,Clock};
