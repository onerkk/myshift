'use strict';
// Run from the repository root: node --test tests/leave-payroll.test.cjs
// Executes production functions from app.js; all database I/O is an in-memory fixture.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return source.slice(a,b)}
function env(){
  const c={Date,Math,Number,String,Array,Object,Set,Uint8Array,Promise,console,Payroll:require('../payroll.js'),lang:'zh',
    fbUser:{uid:'me',displayName:'測試',email:'test@example.invalid'},S:{unit:'test',modal:null},
    leavesCache:{},ALD:{},OTD:{},TYD:{},AL:{},shifts:{'2026-09-10':'早'},shiftHours:12,
    fields:{},alerts:[],writes:[],failWrite:false,
    SAL:{enabled:true,base:24000,meal:0,transport:0,position:0,night:0,nightCountOverride:0,proposal:0,
      union:0,welfare:0,laborIns:0,healthIns:0,otherDed:0,otWageBase:0,leaveWageBase:0,
      sickRate:.5,personalRate:1,otTier1Rate:1.33340,otTier2Rate:1.66670,otTaxFreeH:46.6666667,
      laborPensionWage:0,laborPensionSelfRate:0,laborPensionEmployerRate:6,monthly:{}},
    APP_CFG:{leaveTypes:[{id:'annual',name:'特休',nameId:'Cuti Tahunan',step:.5,otDeduct:4},
      {id:'sick',name:'病假',nameId:'Sakit',step:1,otDeduct:4},{id:'personal',name:'事假',nameId:'Izin Pribadi',step:1,otDeduct:4},
      {id:'official',name:'公假',nameId:'Dinas',step:1,otDeduct:0},{id:'comp',name:'補休',nameId:'Kompensasi',step:.5,otDeduct:0}]},
    render(){},sAL(){},sOTD(){},loadLeaves(){return Promise.resolve()},isTWOff(){return false},
  };
  c.rot=()=>({h:c.shiftHours});c.gs=(y,m,d)=>c.shifts[c.ek(y,m,d)]||'休';
  c.getLT=id=>c.APP_CFG.leaveTypes.find(x=>x.id===id);
  c.alert=text=>c.alerts.push(text);c.document={getElementById:id=>c.fields[id]||null};
  c.fsEnqueue=fn=>Promise.resolve().then(fn);
  c.firebase={firestore:{FieldValue:{serverTimestamp:()=>({seconds:1})}}};
  c.fbDb={collection:()=>({doc:id=>({set:async data=>{if(c.failWrite)throw Error('write rejected');c.writes.push({id,data})},delete:async()=>{if(c.failWrite)throw Error('delete rejected');c.writes.push({id,deleted:true})}})})};
  vm.createContext(c);
  const chunks=[
    between('function _leaveId(', '// ═══ 班別覆寫'),
    between('function salPeriodKey(', '// 薪資年月不是'),
    between('function calcPayPeriod(', 'function payCardHtml('),
    between('function calcSalaryEst(', 'function salaryEstHtml('),
    between('function _syncAnnualDateToALD(', 'const ADMIN_EMAILS='),
    between('function leaveStepMinutes(', '// 請假彈窗渲染後'),
    between('function ek(', 'function hk('),
    between('function calcOT(', 'function calcPayPeriod('),
  ];
  vm.runInContext(chunks.join('\n'),c);
  c.select=(type,start,end)=>{
    c.fields={leaveTypeSel:{value:type},leaveStartSel:{value:String(start)},leaveEndSel:{value:String(end)},
      leaveReasonIn:{value:''},leaveSubmitBtn:{dataset:{},disabled:false}};
  };
  return c;
}
function record(type,start,end,extra={}){return {uid:'me',leaveType:type,hours:Math.max(0,Math.min(480,end)-Math.min(480,start))/60,startOffset:start,endOffset:end,shiftHours:12,shiftStartMinute:480,schemaVersion:3,...extra}}
function near(a,b){assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)}
const cases=[
  ['full annual','annual',0,720,8,0,0,24000],
  ['regular-only annual','annual',0,480,8,4,0,24600],
  ['overtime-only','annual',480,720,0,0,0,24000],
  ['last two overtime hours','annual',600,720,0,2,0,24266],
  ['partial regular and overtime sick','sick',360,600,2,2,100,24166],
  ['full sick','sick',0,720,8,0,400,23600],
  ['full personal','personal',0,720,8,0,800,23200],
  ['normal sick then work all overtime','sick',0,480,8,4,400,24200],
  ['half-hour annual boundary','annual',450,510,.5,3.5,0,24516],
  ['full official','official',0,720,8,0,0,24000],
  ['full comp','comp',0,720,8,0,0,24000],
];
for(const [name,type,start,end,normal,ot,ded,net] of cases)test(name,()=>{
  const c=env();c.leavesCache['2026-09-10']=[record(type,start,end)];
  const pp=c.calcPayPeriod(2026,9),salary=c.calcSalaryEst(2026,9);
  near(pp.leaveH,normal);near(pp.oH,ot);near(salary.autoOtH,ot);near(salary.leaveDed,ded);near(salary.net,net);
  assert.equal(salary.otTaxFree,null);assert.equal(salary.otTaxable,null);
});
test('no leave defaults to scheduled 4h overtime',()=>{const c=env();assert.equal(c.calcPayPeriod(2026,9).oH,4);assert.equal(c.calcSalaryEst(2026,9).net,24600)});
test('night shift clock labels and midnight split',()=>{
  const c=env();c.shifts['2026-09-10']='晚';const rule=c.getShiftWorkRule(2026,9,10);
  assert.equal(c.formatShiftOffset(rule,0),'20:00');assert.equal(c.formatShiftOffset(rule,240),'翌日 00:00');
  assert.equal(c.formatShiftOffset(rule,480),'翌日 04:00');assert.equal(c.formatShiftOffset(rule,720),'翌日 08:00');
  c.leavesCache['2026-09-10']=[record('sick',420,600,{shiftStartMinute:1200})];
  assert.equal(c.calcPayPeriod(2026,9).leaveH,1);assert.equal(c.calcPayPeriod(2026,9).oH,2);
  c.lang='id';assert.equal(c.formatShiftOffset(rule,720),'Besok 08:00');
});
test('eight-hour early/middle/night rules have no internal overtime',()=>{
  const c=env();c.shiftHours=8;
  for(const [shift,start,end] of [['早','08:00','16:00'],['中','16:00','翌日 00:00'],['晚','00:00','08:00']]){
    c.shifts['2026-09-10']=shift;const rule=c.getShiftWorkRule(2026,9,10);
    assert.equal(c.formatShiftOffset(rule,0),start);assert.equal(c.formatShiftOffset(rule,480),end);assert.equal(rule.overtimeMinutes,0);
    c.select('annual',0,480);assert.equal(c.leaveSelection('2026-09-10').h.regularHours,8);assert.equal(c.leaveSelection('2026-09-10').error,'');
  }
});
test('overlapping stored intervals count only once, other users excluded',()=>{
  const c=env();c.leavesCache['2026-09-10']=[record('personal',360,660),record('annual',420,720),record('sick',0,720,{uid:'other'})];
  assert.equal(c.calcPayPeriod(2026,9).leaveH,2);assert.equal(c.calcPayPeriod(2026,9).oH,0);assert.equal(c.calcSalaryEst(2026,9).leaveDed,200);
});
test('all half-hour ranges obey time conservation',()=>{
  const c=env();
  for(let start=0;start<720;start+=30)for(let end=start+30;end<=720;end+=30){
    const l=record('annual',start,end);c.leavesCache['2026-09-10']=[l];
    const regular=c.summarizeRegularLeaveForDay([l],12,'me').totalHours,ot=c.getActualOTForDay('2026-09-10',4,12,'me');
    near(regular+4-ot,(end-start)/60);assert.ok(regular<=8&&ot>=0&&ot<=4);
  }
});
test('legacy records preserve their previous overtime interpretation',()=>{
  const c=env();c.leavesCache['2026-09-10']=[record('annual',0,480,{schemaVersion:2})];
  assert.equal(c.calcPayPeriod(2026,9).oH,0);
  c.OTD['2026-09-10']=4;assert.equal(c.calcPayPeriod(2026,9).oH,4);
  c.OTD['2026-09-10']=0;assert.equal(c.calcPayPeriod(2026,9).oH,0);
  c.leavesCache['2026-09-10']=[{uid:'me',leaveType:'annual',hours:4}];delete c.OTD['2026-09-10'];
  assert.equal(c.calcPayPeriod(2026,9).oH,0);
});
test('v3 selected range takes priority over old daily override',()=>{
  const c=env();c.OTD['2026-09-10']=4;c.leavesCache['2026-09-10']=[record('annual',0,720)];assert.equal(c.calcPayPeriod(2026,9).oH,0);
  c.OTD['2026-09-10']=0;c.leavesCache['2026-09-10']=[record('annual',0,480)];assert.equal(c.calcPayPeriod(2026,9).oH,4);
});
test('paid disaster marker keeps source policy',()=>{const c=env();c.TYD['2026-09-10']=12;assert.equal(c.calcPayPeriod(2026,9).oH,4);assert.equal(c.calcSalaryEst(2026,9).leaveDed,0)});
test('26th through 25th payroll boundary, including new year',()=>{
  for(const [y,m,inside,outside] of [[2026,9,['2026-08-26','2026-09-25'],['2026-08-25','2026-09-26']],[2027,1,['2026-12-26','2027-01-25'],['2026-12-25','2027-01-26']]]){
    const c=env();c.shifts={};for(const date of inside.concat(outside)){c.shifts[date]='早';c.leavesCache[date]=[record('personal',0,720)]}
    const pp=c.calcPayPeriod(y,m);assert.equal(pp.wd,2);assert.equal(pp.leaveH,16);assert.equal(c.calcSalaryEst(y,m).leaveDed,1600);
  }
});
test('old calibration fixture no longer pays nights during full sick leave or claims complete verification',()=>{
  const c=env();Object.assign(c.SAL,{base:35090,meal:3000,transport:1000,position:500,night:553,
    union:88,welfare:178,laborIns:1145,healthIns:1129,otWageBase:39530,leaveWageBase:39280});
  c.SAL.monthly['2026-07']={proposal:200,otherIncome:1413,reportedTaxFree:11657,reportedTaxable:3167,reportedGross:61557,reportedDeduction:4504,reportedNet:57053};
  c.shifts={};for(let i=0;i<19;i++){const d=new Date(2026,5,26+i);c.shifts[c.ek(d.getFullYear(),d.getMonth()+1,d.getDate())]=i<10?'晚':'早'}
  c.leavesCache['2026-06-26']=[{uid:'me',leaveType:'annual',hours:4}];
  for(const date of ['2026-06-27','2026-06-28','2026-06-29'])c.leavesCache[date]=[{uid:'me',leaveType:'sick',hours:8}];
  c.TYD['2026-06-30']=4;const salary=c.calcSalaryEst(2026,7);
  assert.equal(salary.otH,60);assert.equal(salary.otPay,14824);assert.equal(salary.leaveDed,1964);
  assert.equal(salary.nightAutoCount,6);assert.equal(salary.partialNightCount,1);
  assert.equal(salary.nightPay,3318);assert.equal(salary.verified,false);assert.equal(salary.incomplete,true);
});
test('reject invalid, reversed, out-of-shift and invalid leave increments',()=>{
  const c=env();
  for(const [type,start,end] of [['annual',120,60],['annual',0,0],['annual',-30,30],['annual',0,750],['annual',15,75],['sick',450,510],['unknown',0,720]]){
    c.select(type,start,end);assert.ok(c.leaveSelection('2026-09-10').error,`${type}: ${start}-${end}`);
  }
  c.select('sick',30,90);assert.equal(c.leaveSelection('2026-09-10').error,'');
  c.select('sick',690,720);assert.equal(c.leaveSelection('2026-09-10').error,'');
  c.select('annual',0,720);assert.ok(c.leaveSelection('2026-09-11').error);
});
test('reject duplicate intervals but allow adjacent split records',()=>{
  const c=env();c.leavesCache['2026-09-10']=[record('annual',0,240)];
  c.select('annual',120,360);assert.ok(c.leaveSelection('2026-09-10').error);
  c.select('annual',240,720);assert.equal(c.leaveSelection('2026-09-10').error,'');
});
test('legacy annual marker participates in validation and survives overtime-only record',async()=>{
  const c=env();c.ALD['2026-09-10']=8;c.select('annual',0,480);assert.ok(c.leaveSelection('2026-09-10').error);
  c.select('annual',480,720);assert.equal(c.leaveSelection('2026-09-10').error,'');
  await c.submitLeave('2026-09-10');assert.equal(c.ALD['2026-09-10'],8);assert.equal(c.calcPayPeriod(2026,9).leaveH,8);
  const l=c.leavesCache['2026-09-10'][0];await c.removeLeave('2026-09-10','annual',l.docId);assert.equal(c.ALD['2026-09-10'],8);
});
test('submit full 12h stores annual 8h and full range; cancel restores quota and overtime',async()=>{
  const c=env();c.OTD['2026-09-10']=0;c.select('annual',0,720);await c.submitLeave('2026-09-10');
  const data=c.writes[0].data;assert.equal(data.hours,8);assert.equal(data.startOffset,0);assert.equal(data.endOffset,720);assert.equal(data.schemaVersion,3);
  assert.equal(c.ALD['2026-09-10'],8);assert.equal(c.calcPayPeriod(2026,9).oH,0);assert.equal(Object.hasOwn(c.OTD,'2026-09-10'),false);
  await c.removeLeave('2026-09-10','annual',c.writes[0].id);assert.equal(c.ALD['2026-09-10'],undefined);assert.equal(c.calcPayPeriod(2026,9).oH,4);
});
test('overtime-only submission is not counted as annual leave or headcount',async()=>{
  const c=env();c.select('annual',480,720);await c.submitLeave('2026-09-10');const l=c.leavesCache['2026-09-10'][0];
  assert.equal(l.hours,0);assert.equal(c.isRegularLeave(l),false);assert.equal(c.ALD['2026-09-10'],undefined);assert.equal(c.leaveRecordLabel(l),'未加班 4h');
  assert.equal(c.calcSalaryEst(2026,9).leaveDed,0);
});
test('failed save rolls back annual quota and preserves legacy overtime',async()=>{
  const c=env();c.failWrite=true;c.OTD['2026-09-10']=2;c.select('annual',0,720);await c.submitLeave('2026-09-10');
  assert.equal(c.ALD['2026-09-10'],undefined);assert.equal(c.leavesCache['2026-09-10'],undefined);assert.equal(c.OTD['2026-09-10'],2);assert.equal(c.alerts.length,1);
});
test('failed cancellation restores records and annual quota',async()=>{
  const c=env();const l=record('annual',0,720,{docId:'existing'});c.leavesCache['2026-09-10']=[l];c.ALD['2026-09-10']=8;c.failWrite=true;
  await c.removeLeave('2026-09-10','annual','existing');assert.equal(c.leavesCache['2026-09-10'].length,1);assert.equal(c.ALD['2026-09-10'],8);
});
test('null offsets are never treated as a precise midnight range',()=>{
  const c=env();assert.equal(c.hasPreciseLeaveTime({startOffset:null,endOffset:480}),false);assert.equal(c.leaveNumber(''),null);assert.equal(c.leaveNumber(0),0);
});

test('full absent night has no automatic allowance; partial night requires an explicit unit',()=>{
  const c=env();c.shifts['2026-09-10']='晚';c.SAL.night=300;
  c.leavesCache['2026-09-10']=[record('sick',0,720)];let e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,0);assert.equal(e.workedDays,0);assert.equal(e.workedHours,0);
  c.leavesCache['2026-09-10']=[record('sick',0,240)];e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,0);assert.ok(e.notes.includes('partialNight'));assert.equal(e.workedHours,8);
  c.SAL.monthly['2026-09']={inputVersion:2,days:{'2026-09-10':{nightUnits:.5}}};e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,150);assert.ok(!e.notes.includes('partialNight'));
});
test('explicit zero monthly overrides suppress pay; blank restores automatic calculation',()=>{
  const c=env();c.shifts['2026-09-10']='晚';c.SAL.night=300;
  c.SAL.monthly['2026-09']={inputVersion:2,nightTotalOverride:0,otFrontH:0,otBackH:0};let e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,0);assert.equal(e.otPay,0);
  c.SAL.monthly['2026-09']={inputVersion:2,nightTotalOverride:null,otFrontH:null,otBackH:null};e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,300);assert.equal(e.otPay,600);
});
test('rest-day work is counted once in its own category; weekend alone never changes category',()=>{
  const c=env();c.shifts={'2026-09-12':'早'};
  let e=c.calcSalaryEst(2026,9);assert.equal(e.weekdayH,4);assert.equal(e.holidayPay,0);
  c.SAL.monthly['2026-09']={inputVersion:2,days:{'2026-09-12':{kind:'rest',workedHours:12}}};e=c.calcSalaryEst(2026,9);
  assert.equal(e.otPay,0);assert.equal(e.weekdayH,0);assert.equal(e.holidayH,12);assert.equal(e.holidayPay,2333);assert.equal(e.otH,12);
  c.SAL.monthly['2026-09'].days['2026-09-12'].workedHours=0;e=c.calcSalaryEst(2026,9);assert.equal(e.holidayPay,0);assert.equal(e.workedHours,0);
});
test('holiday on an originally off date can be paid without inventing a schedule shift',()=>{
  const c=env();c.shifts={};c.SAL.monthly['2026-09']={inputVersion:2,days:{'2026-09-12':{kind:'holiday',workedHours:4}}};
  const e=c.calcSalaryEst(2026,9);assert.equal(e.holidayPay,800);assert.equal(e.otPay,0);assert.equal(e.workedHours,4);assert.equal(e.workedDays,1);
});
test('monthly total OT is no longer split in half; both actual tiers are required',()=>{
  const c=env();c.SAL.monthly['2026-09']={otHoursOverride:50};let e=c.calcSalaryEst(2026,9);
  assert.equal(e.otH,4);assert.ok(e.notes.includes('legacyOtTotal'));
  c.SAL.monthly['2026-09']={inputVersion:2,otFrontH:3,otBackH:1};e=c.calcSalaryEst(2026,9);
  assert.equal(e.totalFront,3);assert.equal(e.totalBack,1);assert.equal(e.otPay,566);
});
test('52 sick payroll hours at the fixed base produces 4289, without fabricating missing leave dates',()=>{
  const c=env();Object.assign(c.SAL,{base:35090,meal:3000,transport:1000,position:500});
  c.SAL.monthly['2026-09']={inputVersion:2,sickHoursOverride:52};const before=JSON.stringify(c.leavesCache);
  const e=c.calcSalaryEst(2026,9);assert.equal(e.sickH,0);assert.equal(e.sickPayH,52);assert.equal(e.leaveDed,4289);
  assert.equal(JSON.stringify(c.leavesCache),before);assert.equal(c.calcSalaryEst(2026,10).leaveDed,0);
});
test('changing later-month settings never changes saved prior-month company amounts',()=>{
  const c=env();const slip={baseSum:24000,proposal:0,otherIncome:0,otTaxFree:600,otTaxable:0,holidayPay:0,nightPay:0,fixedDed:0,leaveDed:0,laborPensionSelf:0,income:24600,deduction:0,net:24600};
  c.SAL.monthly['2026-09']={slip};let e=c.calcSalaryEst(2026,9);assert.equal(e.hasSlip,true);assert.equal(e.verified,true);
  c.SAL.base=30000;e=c.calcSalaryEst(2026,9);assert.equal(e.official.net,24600);assert.notEqual(e.net,24600);assert.equal(e.verified,false);
  e=c.calcSalaryEst(2026,10);assert.equal(e.hasSlip,false);assert.equal(e.reportedNet,null);
});
test('salary forecast is explicitly incomplete until both payroll months finish loading',()=>{
  const c=env();c.payrollLeaveState={uid:'me',loading:false,error:false,months:['2026-09']};
  assert.ok(c.calcSalaryEst(2026,9).notes.includes('leaveNotReady'));
  c.payrollLeaveState.months.push('2026-08');assert.ok(!c.calcSalaryEst(2026,9).notes.includes('leaveNotReady'));
  c.payrollLeaveState.error=true;assert.ok(c.calcSalaryEst(2026,9).notes.includes('leaveNotReady'));
});

function formEnv(){
  const c=env();c.PAY_VIEW={y:2026,m:9};c.SAL_DEFAULT={...c.SAL,schemaVersion:5};c.saved=[];
  c.sSAL=()=>c.saved.push(JSON.parse(JSON.stringify(c.SAL)));c.S.showSal=true;
  c.esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s]);
  c.studioMoney=n=>'$'+Math.round(n).toLocaleString('en-US');c.handle=()=>{};
  vm.runInContext(between('function normalizeSal(', 'normalizeSal();')+'\n'+between('function setSalPeriod(', 'function _leaveId(')+'\n'+between('function salaryFieldLabels(', 'setTimeout(()=>{const sp='),c);
  for(const k of ['base','meal','transport','position','night','union','welfare','laborIns','healthIns','otherDed','laborPensionWage','laborPensionSelfRate','laborPensionEmployerRate','otWageBase','leaveWageBase','otTier1Rate','otTier2Rate','sickRate','personalRate'])c.fields['sal_'+k]={value:String(c.SAL[k]??'')};
  return c;
}
test('saving the real salary form validates before mutation, preserves zero and stays in the selected month',()=>{
  const c=formEnv(),before=JSON.stringify(c.SAL);c.fields.sal_base.value='bad';assert.equal(c.saveSalaryForm(),false);assert.equal(JSON.stringify(c.SAL),before);assert.equal(c.saved.length,0);
  c.fields.sal_base.value='24000';c.fields.sal_nightTotalOverride={value:'0'};c.fields.sal_sickHoursOverride={value:'0'};
  c.fields.sal_proposal={value:'800'};assert.equal(c.saveSalaryForm(),true);assert.equal(c.saved.length,1);
  const p=c.getSalPeriod(2026,9);assert.equal(p.nightTotalOverride,0);assert.equal(p.sickHoursOverride,0);assert.equal(p.proposal,800);
  assert.equal(c.getSalPeriod(2026,10).nightTotalOverride,null);assert.equal(c.getSalPeriod(2026,10).proposal,0);
  assert.match(c.rSalary(),/id="sal_nightTotalOverride" value="0"/);
  assert.doesNotMatch(c.rSalary(),/NaN|undefined/);
});
test('import previews before saving, preserves an existing month and rejects inconsistent files',async()=>{
  const c=formEnv(),button={},target={innerHTML:'',textContent:'',querySelector:()=>button};c.fields.sal_importPreview=target;
  const data={kind:'myshift-payroll',month:'2026-08',slip:{baseSum:24000,proposal:800,otherIncome:0,otTaxFree:0,otTaxable:0,holidayPay:0,nightPay:0,fixedDed:0,leaveDed:0,laborPensionSelf:0,income:24800,deduction:0,net:24800},inputs:{proposal:800,sickHoursOverride:0}};
  c.SAL.monthly['2026-09']={proposal:100};const original=JSON.stringify(c.SAL);
  await c.previewSalaryImport({files:[{size:1000,text:async()=>JSON.stringify(data)}]});
  assert.equal(JSON.stringify(c.SAL),original);assert.equal(c.saved.length,0);assert.match(target.innerHTML,/\$24,800/);assert.equal(button.onclick,c.handle);
  assert.equal(c.applySalaryImport(),true);assert.equal(c.PAY_VIEW.m,8);assert.equal(c.SAL.monthly['2026-09'].proposal,100);assert.equal(c.getSalPeriod(2026,8).slip.net,24800);assert.equal(c.saved.length,1);
  const saved=JSON.stringify(c.SAL);data.slip.net=1;
  await c.previewSalaryImport({files:[{size:1000,text:async()=>JSON.stringify(data)}]});assert.match(target.textContent,/未匯入/);assert.equal(c.applySalaryImport(),false);assert.equal(JSON.stringify(c.SAL),saved);
});
test('not attending an explicitly assigned rest or national holiday never deducts ordinary sick wages',()=>{
  const c=env();c.leavesCache['2026-09-10']=[record('sick',0,720)];
  for(const kind of ['rest','holiday']){
    c.SAL.monthly['2026-09']={inputVersion:2,days:{'2026-09-10':{kind,workedHours:0}}};
    const e=c.calcSalaryEst(2026,9);assert.equal(e.leaveDed,0);assert.equal(e.holidayPay,0);assert.equal(e.income,24000);
  }
});
