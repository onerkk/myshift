'use strict';
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
const names=['uiIcon','uiShiftClass','uiShiftShort','uiFormatDuration','uiHeaderHtml','uiBottomNavHtml','uiScreenHeading','studioIcon','studioWeatherIcon','studioShiftLabel','studioShiftTime','uiTodayHeroHtml','uiWeekStripHtml','uiWeatherPreviewHtml','uiPayPreviewHtml','studioMoney','studioSalaryRows','uiSalaryDashboardHtml','uiPrecipChartHtml','_wxTimeLabel','_wxStatusHtml','wxHtml','uiTideCurveHtml','tideHtml','studioCalendarLegendHtml','uiCalendarTodayAnchorHtml','uiMonthSummaryHtml','uiUpcomingEventsHtml','uiCalendarPageHtml','rCal','uiMoreHtml','fbBarHtml','uiLeaveSummaryHtml','_miniSwitch'];
const fixed=Date.parse('2026-09-10T10:10:00Z');
class Clock extends Date{constructor(...args){super(...(args.length?args:[fixed]))}static now(){return fixed}}
function env(lang='zh'){
  const store=new Map();
  const c={Date:Clock,Math,Number,String,Array,Object,Set,console,lang,TY:2026,TM:9,TD:10,
    S:{step:'cal',yr:2026,mo:9,rt:'4on2off',unit:'測試單位',showLunar:false,instH:true},UI_TAB:'today',PAY_VIEW:{y:2026,m:8},
    RN:{zh:{'4on2off':'四休二'},id:{'4on2off':'4 kerja 2 libur'}},SC:{早:'e',晚:'n',中:'m',休:'o'},
    EVS:{},NOTES:{},TYD:{},ALD:{},SHIFT_OV:{},DP:null,IMG:{icon:'./icons/icon-192x192.png'},
    fbUser:null,fbLoginPending:false,admin:false,shift:'早',WxSfx:{isMuted:()=>true},
    wxData:null,_wxLoading:false,_wxErrorCode:'',tideData:null,tideErr:true,tideCollapsed:false,
    WXZ:{0:'晴天',3:'多雲',63:'中雨'},WXD:{0:'Cerah',3:'Mendung',63:'Hujan'},
    navigator:{onLine:true,userAgent:'test'},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},
    render(){},loadLeaves(){},loadAdminEv(){},notifyCtaHtml:()=>'',wxAlertHtml:()=>'',rainWarnHtml:()=>'',rainObsHtml:()=>'',
    _wxStale:()=>false,_wxErrorText:()=>lang==='zh'?'請選擇地點':'Pilih lokasi',_wxHourIndex:()=>0,
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
    calcPayPeriod:()=>({wd:22,tH:264,oH:64,rawOH:88}),
    estimate:{net:55344,income:61485,deduction:6141,baseSum:44000,otH:64,fixedDed:6141,hourly:180,otHourly:180,leaveHourly:180},
    errors:[],alert:message=>c.errors.push(message),
  };
  c.t=key=>key==='wk'?(lang==='zh'?['日','一','二','三','四','五','六']:['Min','Sen','Sel','Rab','Kam','Jum','Sab']):({app:lang==='zh'?'我的班表':'Jadwal Saya',hr:lang==='zh'?'小時':'jam',alRem:lang==='zh'?'特休餘額':'Sisa cuti',rem:lang==='zh'?'接下來的行程':'Agenda'})[key]||key;
  c.gs=()=>c.shift;c.getShiftWorkRule=()=>({isWork:c.shift!=='休',startMinute:c.shift==='晚'?1200:480,shiftHours:12});
  c.isAdmin=()=>c.admin;c.calcSalaryEst=()=>c.estimate;
  vm.createContext(c);vm.runInContext(names.map(presenter).join('\n'),c);
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
  let h=c.uiCalendarPageHtml();assert.equal((h.match(/class="day /g)||[]).length,31);assert.equal((h.match(/<button type="button" class="day /g)||[]).length,31);
  c.action('next');assert.equal(c.S.yr,2027);assert.equal(c.S.mo,1);
  c.action('prev');assert.equal(c.S.yr,2026);assert.equal(c.S.mo,12);
  c.action('today');assert.equal(c.S.yr,2026);assert.equal(c.S.mo,9);
  c.action('open',{d:'25'});assert.equal(JSON.stringify(c.S.modal),JSON.stringify({y:2026,m:9,d:25}));assert.deepEqual(c.errors,[]);
});
test('seven-day and reminder actions open their explicit date across month and year boundaries',()=>{
  const c=env();c.TY=2026;c.TM=12;c.TD=29;
  const h=c.uiWeekStripHtml();assert.match(h,/data-y="2027" data-m="1" data-d="1"/);
  c.action('openDate',{y:'2027',m:'1',d:'1'});assert.equal(JSON.stringify(c.S.modal),JSON.stringify({y:2027,m:1,d:1}));
  c.EVS['2027-01-02']=['custom'];c.NOTES['2027-01-02']='<img src=x onerror=alert(1)>';
  const events=c.uiUpcomingEventsHtml(2027,1);assert.match(events,/data-y="2027" data-m="1" data-d="2"/);assert.match(events,/&lt;img/);assert.doesNotMatch(events,/<img/);
});
test('shift console displays the actual remaining duration and no fabricated progress on rest days',()=>{
  const c=env();const h=c.uiTodayHeroHtml();assert.match(h,/1小時50分/);assert.match(h,/aria-valuenow="85"/);
  c.shift='休';const rest=c.uiTodayHeroHtml();assert.match(rest,/今天休息/);assert.doesNotMatch(rest,/role="progressbar"|班表已同步|連休第 1/);
});
test('salary shows configured amounts and only claims verification when the difference is zero',()=>{
  const c=env();let h=c.uiSalaryDashboardHtml(2026,8);assert.match(h,/\$55,344/);assert.match(h,/2026\/07\/26 – 2026\/08\/25/);assert.match(h,/較原排少 24h/);
  c.estimate.verified=true;c.estimate.verificationDelta=100;h=c.uiSalaryDashboardHtml(2026,8);assert.doesNotMatch(h,/已核對實領|與公司薪資條一致/);
  c.estimate.verificationDelta=0;assert.match(c.uiSalaryDashboardHtml(2026,8),/已核對實領/);
  c.estimate=null;assert.match(c.uiSalaryDashboardHtml(2026,8),/data-a="salOpen"/);
});
test('live weather retains chosen location, source time, refresh, daily detail and radar actions',()=>{
  const c=env();c.wxData=data();const h=c.wxHtml();assert.match(h,/臺南市 鹽水區/);assert.match(h,/開啟時每 5 分鐘更新/);assert.match(h,/09\/10\s+18:10/);assert.match(h,/data-a="wxR"/);assert.match(h,/href="radar2.html"/);assert.equal((h.match(/class="forecast-day/g)||[]).length,7);
  assert.notEqual(c.studioWeatherIcon(null),c.studioWeatherIcon(0));
});
test('more screen preserves account and role restrictions without duplicate admin controls',()=>{
  const c=env();c.UI_TAB='more';let h=c.rCal();assert.match(h,/id="loginBtn"/);assert.doesNotMatch(h,/data-a="leavesOv"/);
  c.fbUser={uid:'me',displayName:'測試 <名字>'};c.admin=true;h=c.rCal();assert.match(h,/測試 &lt;名字&gt;/);assert.equal((h.match(/data-a="leavesOv"/g)||[]).length,1);assert.equal((h.match(/role="switch"/g)||[]).length,2);
  const toggle=c._miniSwitch(true,'setUserPref()',true,'#fff','警報通知');assert.match(toggle,/role="switch" aria-checked="true" aria-label="警報通知" disabled/);
});
