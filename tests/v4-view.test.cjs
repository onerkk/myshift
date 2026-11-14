'use strict';
process.env.TZ='Asia/Taipei';
// Redesigned view layer (v4/*.js) on top of the real presenters and the real action dispatcher.
// These tests pin what the redesign promised: every screen renders in both languages, every button
// points at an action the dispatcher really handles, and the information the old screens showed is still there.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {env,source,fixed}=require('./helpers/ui-env.cjs');

const V4=['view','calendar','sheet','pay','more','setup','dialog','wxsheets','weather']; // orrery.js is WebGL only
const v4Source=name=>fs.readFileSync(path.join(__dirname,'../v4',name+'.js'),'utf8');
const dispatcher=source.slice(source.indexOf('function handle('),source.indexOf('let wxData=null',source.indexOf('function handle(')));
const ACTIONS=new Set([...dispatcher.matchAll(/case\s*["']([A-Za-z]+)["']\s*:/g)].map(m=>m[1]));

function v4env(lang='zh',setup=()=>{}){
  const c=env(lang);
  const listeners=[];
  Object.assign(c,{
    window:c,addEventListener(){},requestAnimationFrame(){},matchMedia:()=>({matches:false}),
    document:{addEventListener:(type,fn)=>listeners.push({type,fn}),getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],body:{classList:{contains:()=>true},appendChild(){}},activeElement:null,createElement:()=>({addEventListener(){},querySelector:()=>null,remove(){}})},
    MyShiftNavigation:{pageBar:()=>'',beforeChange(){},back(){}},MyShiftAppearance:{get:()=>'auto',cycle(){},set(){}},
    experienceShiftTimeline:c.experienceShiftTimeline,
    R:{'4on2off':{c:['早','早','早','早','休','休'],h:12},'2on2off':{c:['晚','晚','休','休'],h:12}},
    EI:['class','custom','annualL','typhoon','meeting'],ADMIN_EV:['meeting'],EE:{class:'📚',custom:'📝',annualL:'🌴',typhoon:'🌀',meeting:'👥'},TYM:{},OTD:{},AL_RESET_TS:{},SAL:{},
    gsOrig:()=>c.shift,doShiftAdj(){},lunarModalBlock:()=>'<div class="alm-box">農民曆</div>',
    getLeaveTypes:()=>[{id:'sick',name:'病假',nameId:'Sakit',color:'#f66'},{id:'annual',name:'特休',nameId:'Tahunan',color:'#6cf'}],
    leaveRecordLabel:l=>l.leaveType,formatLeaveRange:()=>'08:00–12:00',hasPreciseLeaveTime:()=>true,
    getUnits:()=>['測試單位','另一單位'],unitConfigAvailable:()=>true,unitConfigStatusHtml:()=>'',fbAuthReady:true,
    uiUnitControlHtml:()=>'<section class="unit-control">unit</section>',fbBarHtml:()=>'',
    uiAtmosphereSceneHtml:()=>'<div class="atmosphere-view" data-scene-root></div>',
    studioAlertVisual:()=>'<svg></svg>',evaluateWxAlerts:()=>[],_limitText:(s,n)=>String(s).slice(0,n),
    _rainObsMeta:()=>null,_rainMm:v=>v==null?'—':String(v),_fmtTimeShort:s=>String(s).slice(11,16),_gpsPlaceText:()=>'GPS',
    tidePhaseInfo:()=>null,WeatherData:{num:v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null)},
    SHIFT_HR:{早:[8,9,10,11,12,13,14,15,16,17,18,19],晚:[20,21,22,23,0,1,2,3,4,5,6,7]},
    wxDetailShow:false,wxDetailDay:0,tideDetailShow:false,tideDetailDay:null,USER_PREFS:{},APP_CFG:{wxAlerts:{}},
  });
  setup(c);
  // `wxData=` inside the presenters must hit the same binding the tests set.
  for(const name of V4)vm.runInContext(v4Source(name),c,{filename:'v4/'+name+'.js'});
  c.listeners=listeners;
  c.screen=tab=>{c.UI_TAB=tab;return c.rCal()};
  return c;
}
const actionsIn=html=>[...html.matchAll(/data-a="([^"]+)"/g)].map(m=>m[1]);
const weather=()=>{const hTime=[],n=48;for(let i=0;i<n;i++){const d=new Date(fixed+i*3600000);d.setMinutes(0,0,0);const p=x=>String(x).padStart(2,'0');hTime.push(`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:00`)}
  return {temp:28,code:63,source:'Open-Meteo',provider:'open-meteo',updatedAt:fixed,sourceTime:fixed,lat:23.32,lon:120.27,locationSource:'manual',place:{display:'臺南市 鹽水區'},
    hTime,hTemp:hTime.map(()=>27),hCode:hTime.map(()=>63),hPrec:hTime.map((_,i)=>i<24?70:20),hRain:hTime.map(()=>1.2),hWind:hTime.map(()=>12),hGust:hTime.map(()=>30),hHum:hTime.map(()=>80),hCloud:hTime.map(()=>90),
    hPopSource:hTime.map(()=>'cwa'),_cwaScope:'town',days:Array.from({length:7},(_,i)=>({date:'2026-09-'+(10+i),code:i?3:63,hi:31,lo:24}))}};

test('every screen renders in both languages and every button maps to a real dispatcher action',()=>{
  assert.ok(ACTIONS.size>40,'dispatcher actions were found');
  for(const lang of ['zh','id']){
    const c=v4env(lang,c=>{c.wxData=weather();c.fbUser={uid:'me',displayName:'測試',email:'t@example.invalid'}});
    for(const tab of ['today','calendar','pay','weather','more']){
      const h=c.screen(tab);
      assert.ok(h.includes('class="v4-top')&&h.includes('class="v4-nav'),lang+'/'+tab+' has the v4 header and navigation');
      assert.ok(!/undefined|NaN|\[object Object\]/.test(h.replace(/<svg[\s\S]*?<\/svg>/g,'')),lang+'/'+tab+' has no leaked placeholder: '+(h.match(/.{30}(?:undefined|NaN|\[object Object\]).{30}/)||[''])[0]);
      for(const a of actionsIn(h))assert.ok(ACTIONS.has(a),lang+'/'+tab+' uses unknown action "'+a+'"');
      assert.equal((h.match(/class="v4-nav-item[^"]*"/g)||[]).length,5);assert.equal((h.match(/aria-current="page"/g)||[]).length,1);
    }
  }
});

test('today keeps every fact the original hero showed, and the orrery gets the real shift window',()=>{
  const c=v4env('zh'),h=c.screen('today');
  const slot=h.match(/id="v4OrbitSlot"([^>]*)>/)[1];
  assert.match(slot,/data-shift="早"/);assert.match(slot,/data-work="1"/);assert.match(slot,/data-start="480"/);assert.match(slot,/data-reg="480"/);assert.match(slot,/data-ot="240"/);
  for(const text of ['早班','班次進度','08:00','20:00','正常班制 8h','排定加班 4h','班表歸屬日','今日行程'])assert.ok(h.includes(text),text);
  assert.match(h,/role="progressbar"[^>]*aria-valuenow="\d+"/);
  // four quick actions, same targets as before
  const dock=h.match(/class="v4-root v4-dock"[\s\S]*?<\/div>/)[0];
  assert.match(dock,/experienceOpenDay\('leave'\)/);assert.match(dock,/experienceOpenDay\('shift'\)/);assert.match(dock,/data-a="share"/);assert.match(dock,/data-a="stats"/);
  // seven days, first is today
  const days=[...h.matchAll(/class="v4-day [^"]*"[^>]*data-y="(\d+)" data-m="(\d+)" data-d="(\d+)"/g)];
  assert.equal(days.length,7);assert.deepEqual(days[0].slice(1).map(Number),[2026,9,10]);assert.deepEqual(days[6].slice(1).map(Number),[2026,9,16]);
  // rest day: no progress bar, says so
  c.shift='休';const rest=c.screen('today');assert.ok(rest.includes('今天休息'));assert.ok(!rest.includes('role="progressbar"'));assert.match(rest,/data-work="0"/);
  // text states use the small headline, numeric countdowns the large one
  assert.match(rest,/class="v4-count text"/);
});

test('calendar grid has one button per real day, opens the right date and offers both views',()=>{
  const c=v4env('zh',c=>{c.EVS['2026-09-12']=['custom'];c.NOTES['2026-09-12']='牙醫回診';c.S.showLunar=true});
  const h=c.screen('calendar');
  const cells=[...h.matchAll(/<button type="button" class="v4-cell([^"]*)" (data-a="open" data-d="(\d+)"|data-a="openDate" data-y="(\d+)" data-m="(\d+)" data-d="(\d+)")[^>]*data-date="([^"]+)"/g)];
  const inMonth=cells.filter(m=>m[3]);
  assert.deepEqual(inMonth.map(m=>Number(m[3])),Array.from({length:30},(_,i)=>i+1));
  assert.equal(cells.length%7,0);assert.ok(cells.length>=35);
  assert.equal(cells.filter(m=>/\btoday\b/.test(m[1])).length,1);assert.equal(cells.find(m=>/\btoday\b/.test(m[1]))[7],'2026-09-10');
  for(const m of cells.filter(m=>!m[3]))assert.equal(m[7],[m[4],String(m[5]).padStart(2,'0'),String(m[6]).padStart(2,'0')].join('-'));
  assert.ok(h.includes('lun-mini'),'lunar text stays in the cells when enabled');assert.ok(h.includes('alm-strip'));
  assert.match(h,/id="calendar-view-month"[^>]*aria-pressed="true"/);assert.match(h,/id="calendar-view-agenda"[^>]*aria-pressed="false"/);
  for(const a of ['prev','next','today'])assert.ok(h.includes('data-a="'+a+'"'),a);
  assert.ok(h.includes('牙醫回診'),'own note appears in upcoming events');
  c.UI_CAL_VIEW='agenda';const agenda=c.screen('calendar');
  assert.equal((agenda.match(/class="v4-aday /g)||[]).length,30);assert.equal((agenda.match(/data-a="calendarFilter"/g)||[]).filter(Boolean).length>=9,true);
  assert.ok(!agenda.includes('class="v4-cells"'));
});

test('date sheet keeps the form fields and anchors the leave, shift and event code depends on',()=>{
  const c=v4env('zh',c=>{c.fbUser={uid:'me'};c.S.modal={y:2026,m:9,d:10};c.S.showLunar=true;c.EVS['2026-09-10']=['custom','annualL','typhoon'];c.NOTES['2026-09-10']='備忘';c.TYD['2026-09-10']=4;c.ALD['2026-09-10']=4});
  const h=c.rMod();
  assert.match(h,/^<div class="modal-bg" data-a="close"><div class="modal-sheet /,'navigation module injects the return bar after this exact prefix');
  for(const id of ['leaveTypeSel','leaveStartSel','leaveEndSel','leaveTimePreview','leaveReasonIn','leaveSubmitBtn','day-shift-section','day-event-section','day-dialog-title','alSel','tySel','custIn'])assert.ok(h.includes('id="'+id+'"'),id);
  for(const hook of ['class="leave-entry ','class="day-brief ',"submitLeave('2026-09-10')","setLeavePreset('2026-09-10','full')","updateLeaveTimeOptions('2026-09-10')","doShiftAdj('2026-09-10','晚')",'data-a="tyw"','data-a="alh"','data-a="tyh"','experienceMoveDay(-1)','experienceChooseDay(this.value)','alm-box'])assert.ok(h.includes(hook),hook);
  for(const a of actionsIn(h))assert.ok(ACTIONS.has(a),'sheet uses unknown action "'+a+'"');
  assert.equal((h.match(/data-a="tev"/g)||[]).length,4,'personal markers only; admin markers are not offered to everyone');
  assert.equal((h.match(/data-a="tev"[^>]*aria-pressed="true"/g)||[]).length,3);
  // rest day: no leave form, a clear note instead
  c.shift='休';const rest=c.rMod();assert.ok(!rest.includes('id="leaveSubmitBtn"'));assert.ok(rest.includes('不建立請假紀錄'));
  // signed-out: no leave form at all
  c.fbUser=null;c.shift='早';assert.ok(!c.rMod().includes('id="leaveSubmitBtn"'));
});

test('weather shows the official township source, and falls back to estimated rainfall instead of a blank',()=>{
  const c=v4env('zh',c=>{c.wxData=weather();c._popSourceLabel=(s,zh)=>s==='cwa'?(c.wxData._cwaScope==='county'?'中央氣象署縣市預報':'中央氣象署鄉鎮預報'):'Open-Meteo 模式預報';c._popSourceAt=(d,i)=>d.hPopSource[i]});
  let h=c.screen('weather');
  assert.equal((h.match(/class="v4-hr[ "]/g)||[]).length,24);assert.ok(h.includes('中央氣象署鄉鎮預報'));assert.ok(h.includes('70%'));assert.ok(!h.includes('class="mm"'));
  assert.ok(h.includes('你的上班時段'),'shift hours are marked on the hourly strip');
  assert.ok(h.includes('href="radar2.html"'));assert.ok(h.includes('data-a="wxR"'));assert.ok(h.includes('openWxLocation()'));
  assert.equal((h.match(/class="v4-fday[ "]/g)||[]).length,7);
  c.wxData._cwaScope='county';assert.ok(c.screen('weather').includes('中央氣象署縣市預報'));
  // no probability anywhere: show millimetres and say so, never "0%"
  c.wxData.hPrec=c.wxData.hPrec.map(()=>null);h=c.screen('weather');
  assert.ok(h.includes('預估雨量'));assert.ok(h.includes('1.2mm'));assert.ok(!/>0%</.test(h));
  // hourly sheet for the same data
  c.wxDetailShow=true;const sheet=c.wxDetailHtml();assert.ok(sheet.startsWith('<div class="wx-detail"'));assert.ok(sheet.includes('預估 1.2 mm'));assert.equal((sheet.match(/class="v4-hrow[ "]/g)||[]).length-1,6,'18:00–23:00, the hours of that day present in the data');
  // no data at all: an explicit empty state with a retry, not an empty page
  c.wxData=null;const empty=c.screen('weather');assert.ok(empty.includes('v4-wxempty'));assert.ok(empty.includes('data-a="wxR"'));
});

test('pay page states: not set up, estimate, and annual leave bar',()=>{
  const c=v4env('zh');let h=c.screen('pay');
  assert.ok(h.includes('$27,700'));assert.ok(h.includes('$29,000'));assert.ok(h.includes('$1,300'));
  for(const a of ['payPrev','payNext','payLatest','payCurrent','salOpen','alEdit'])assert.ok(h.includes('data-a="'+a+'"'),a);
  assert.ok(h.includes('已用 24 / 80'),'annual leave used = total − remaining');
  c.estimate=null;h=c.screen('pay');assert.ok(h.includes('先設定，再掌握薪資'));assert.ok(h.includes('data-a="salOpen"'));assert.ok(!h.includes('v4-paynet'));
});

test('first-run setup and wizard keep the fields and actions the dispatcher reads',()=>{
  const c=v4env('zh',c=>{c.S.step='type'});
  let h=c.rType();
  assert.ok(h.includes('id="unitSel"'));assert.ok(h.includes('id="alTI"'),'pick reads #alTI');assert.equal((h.match(/data-a="pick" data-k="/g)||[]).length,2);
  assert.ok(h.includes('data-a="lzh"')&&h.includes('data-a="lid"'));
  c.S.step='wiz';c.S.wT=null;c.S.wS=null;c.S.wN=null;c.S.wD=null;h=c.rWiz();
  assert.ok(h.includes('data-a="wizShift" data-v="早"'));assert.ok(h.includes('data-a="wizOff"'));assert.ok(h.includes('data-a="wb"'));
  c.S.wT='w';c.S.wS='早';h=c.rWiz();assert.equal((h.match(/data-a="wwd"/g)||[]).length,2,'the harness cycle has two consecutive early days');
  for(const a of actionsIn(h))assert.ok(ACTIONS.has(a),a);
});

test('more page: role restrictions hold and the destructive reset goes through a confirmation',()=>{
  const c=v4env('zh',c=>{c.fbUser={uid:'me',displayName:'測試'}});let h=c.screen('more');
  assert.ok(!h.includes('data-a="leavesOv"'),'unit leave overview is admin only');
  for(const a of ['stats','share','help','prefs','reset','lunar','sfx','lzh','lid'])assert.ok(h.includes('data-a="'+a+'"'),a);
  assert.match(h,/· v\d{3}<\/p>/);
  c.admin=true;assert.ok(c.screen('more').includes('data-a="leavesOv"'));
  // dialog.js intercepts alEdit and reset in the capture phase, before the dispatcher sees them
  const click=c.listeners.filter(l=>l.type==='click');assert.ok(click.length>=1);
  let stopped=0;const target=a=>({closest:sel=>sel.includes('"'+a+'"')?{dataset:{a},closest:()=>null}:null});
  const fire=a=>{for(const l of click)try{l.fn({target:target(a),isTrusted:false,preventDefault(){},stopImmediatePropagation(){stopped++}})}catch(_){/* the dialog itself needs a DOM */}};
  fire('reset');assert.equal(stopped,1,'reset is intercepted');fire('alEdit');assert.equal(stopped,2,'annual-leave edit is intercepted');fire('stats');assert.equal(stopped,2,'other actions pass through');
});
