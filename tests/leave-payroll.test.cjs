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
    SAL:{dayRuleMode:'roster',payRounding:'nearest',nightPolicy:'unconfirmed',enabled:true,base:24000,meal:0,transport:0,position:0,night:0,nightCountOverride:0,proposal:0,
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
    between('function latestClosedSalaryMonth(', 'function setSalPeriod('),
    between('function calcPayPeriod(', 'function payCardHtml('),
    between('function payrollHistoryEstimates(', 'function sNotes('),
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
  ['last two overtime hours','annual',600,720,0,2,0,24267],
  ['partial regular and overtime sick','sick',360,600,2,2,100,24167],
  ['full sick','sick',0,720,8,0,400,23600],
  ['full personal','personal',0,720,8,0,800,23200],
  ['normal sick then work all overtime','sick',0,480,8,4,400,24200],
  ['half-hour annual boundary','annual',450,510,.5,3.5,0,24517],
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
test('monthly pay periods default to the inclusive 26th-to-25th range across year boundaries',()=>{
  const c=env(),sep=c.getSalaryPeriodRange(2026,9),jan=c.getSalaryPeriodRange(2027,1);
  assert.equal(sep.start,'2026-08-26');assert.equal(sep.end,'2026-09-25');assert.equal(sep.custom,false);
  assert.equal(jan.start,'2026-12-26');assert.equal(jan.end,'2027-01-25');
  assert.deepEqual(Array.from(c.salaryCalendarMonths(sep.sd,sep.ed)),['2026-08','2026-09']);
});
test('custom period is saved by payroll month and changes the dates actually included in calculation',()=>{
  const c=env();c.SAL.monthly['2026-09']={inputVersion:3,payPeriodStart:'2026-08-30',payPeriodEnd:'2026-10-02'};
  c.shifts={'2026-08-29':'早','2026-08-30':'早','2026-09-25':'晚','2026-10-02':'早','2026-10-03':'早'};
  c.leavesCache['2026-08-30']=[record('personal',0,720)];
  const pp=c.calcPayPeriod(2026,9);assert.equal(pp.sd.getDate(),30);assert.equal(pp.sd.getMonth(),7);assert.equal(pp.ed.getDate(),2);assert.equal(pp.ed.getMonth(),9);
  assert.equal(pp.wd,3);assert.equal(pp.tH,36);assert.equal(pp.leaveH,8);assert.equal(pp.oH,8);assert.equal(pp.unworkedOT,4);
  const est=c.calcSalaryEst(2026,9),keys=est.days.map(d=>d.key);
  assert.ok(keys.includes('2026-08-30'));assert.ok(keys.includes('2026-10-02'));
  assert.ok(!keys.includes('2026-08-29'));assert.ok(!keys.includes('2026-10-03'));
  assert.equal(est.workedDays,2);assert.equal(est.personalH,8);assert.equal(est.personalDed,800);
  const next=c.getSalaryPeriodRange(2026,10);assert.equal(next.start,'2026-09-26');assert.equal(next.end,'2026-10-25');
  assert.deepEqual(Array.from(c.salaryCalendarMonths(pp.sd,pp.ed)),['2026-08','2026-09','2026-10']);
});
test('invalid custom dates fall back to the default and custom close-date navigation follows the saved interval',()=>{
  const c=env();c.SAL.monthly['2026-09']={payPeriodStart:'2026-02-30',payPeriodEnd:'2026-09-25'};
  assert.equal(c.getSalaryPeriodRange(2026,9).start,'2026-08-26');
  c.SAL.monthly['2026-09']={payPeriodStart:'2026-08-30',payPeriodEnd:'2026-10-02'};
  assert.equal(c.latestClosedSalaryMonth(new Date(2026,8,30)).m,8);
  c.PAY_VIEW={y:2026,m:8};c.payViewCurrent(new Date(2026,8,30));assert.equal(vm.runInContext('PAY_VIEW.m',c),10);
  assert.equal(c.latestClosedSalaryMonth(new Date(2026,8,25)).m,8);
});
test('custom boundaries identify overlapping and unassigned days instead of silently double-counting them',()=>{
  const c=env(),start=new Date(2026,7,30),end=new Date(2026,9,2);
  let warnings=Array.from(c.salaryPeriodBoundaryWarnings(2026,9,start,end));
  assert.equal(warnings.length,2);assert.match(warnings[0],/4 天未分配/);assert.match(warnings[1],/重疊 7 天/);
  c.SAL.monthly['2026-08']={payPeriodStart:'2026-07-26',payPeriodEnd:'2026-08-29'};
  c.SAL.monthly['2026-10']={payPeriodStart:'2026-10-03',payPeriodEnd:'2026-10-25'};
  warnings=Array.from(c.salaryPeriodBoundaryWarnings(2026,9,start,end));assert.deepEqual(warnings,[]);
});
test('leave loading fetches every month in a custom period and safely batches longer intervals',async()=>{
  const monthQueries=[],ctx={Date,Math,Promise,Set,console,fbUser:{uid:'me'},S:{yr:2026,mo:9,unit:'test'},TY:2026,TM:9,PAY_VIEW:{y:2026,m:9},ALD:{},AL_RESET_TS:{},
    fsEnqueue:fn=>Promise.resolve().then(fn),latestClosedSalaryMonth:()=>({y:2026,m:8}),leaveNumber:()=>null,getLeaveTypes:()=>[],alYear:()=>2026,sAL(){},render(){},
    salaryCalendarMonths(sd,ed){const out=[],d=new Date(sd.getFullYear(),sd.getMonth(),1),last=new Date(ed.getFullYear(),ed.getMonth(),1);while(d<=last){out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);d.setMonth(d.getMonth()+1)}return out;},
    calcPayPeriod(y,m){return y===2026&&m===9?{sd:new Date(2025,10,1),ed:new Date(2026,9,31)}:{sd:new Date(y,m-2,26),ed:new Date(y,m-1,25)};},
    fbDb:{collection(){return{where(field,op,value){if(field==='ym')monthQueries.push(value.slice());return{get:async()=>({forEach(){}})}}}}}};
  vm.createContext(ctx);
  const dates=fs.readFileSync(path.join(__dirname,'../schedule-experience.js'),'utf8');vm.runInContext(dates.slice(dates.indexOf('function experienceMonthDates('),dates.indexOf('function experienceOwnLeaveEvents(')),ctx);
  vm.runInContext(between('let leavesCache={};','function _syncAnnualToALD(')+'\n'+between('function _syncAnnualToALD(','function _syncAnnualDateToALD('),ctx);
  await vm.runInContext('loadLeaves()',ctx);
  assert.equal(monthQueries.length,2);assert.ok(monthQueries.every(batch=>batch.length<=10));
  const loaded=new Set(monthQueries.flat());for(const month of ['2025-11','2026-09','2026-10'])assert.ok(loaded.has(month),month);
  assert.equal(vm.runInContext("payrollLeaveState.months.includes('2026-10')",ctx),true);
});
test('old calibration fixture no longer pays nights during full sick leave or claims complete verification',()=>{
  const c=env();Object.assign(c.SAL,{base:24000,night:300,
    union:10,welfare:20,laborIns:100,healthIns:100,otWageBase:0,leaveWageBase:0});
  c.SAL.monthly['2026-07']={proposal:200,otherIncome:100,reportedTaxFree:6000,reportedTaxable:3000,reportedGross:35000,reportedDeduction:1000,reportedNet:34000};
  c.shifts={};for(let i=0;i<19;i++){const d=new Date(2026,5,26+i);c.shifts[c.ek(d.getFullYear(),d.getMonth()+1,d.getDate())]=i<10?'晚':'早'}
  c.leavesCache['2026-06-26']=[{uid:'me',leaveType:'annual',hours:4}];
  for(const date of ['2026-06-27','2026-06-28','2026-06-29'])c.leavesCache[date]=[{uid:'me',leaveType:'sick',hours:8}];
  c.TYD['2026-06-30']=4;const salary=c.calcSalaryEst(2026,7);
  assert.equal(salary.otH,60);assert.equal(salary.otPay,9000);assert.equal(salary.leaveDed,1200);
  assert.equal(salary.nightAutoCount,6);assert.equal(salary.partialNightCount,2);
  assert.equal(salary.nightPay,1800);assert.equal(salary.verified,false);assert.equal(salary.incomplete,true);
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

test('night pay automatically follows attendance and a one-time partial-shift policy',()=>{
  const c=env();c.shifts['2026-09-10']='晚';c.SAL.night=300;
  c.leavesCache['2026-09-10']=[record('sick',0,720)];let e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,0);assert.equal(e.workedHours,0);
  c.leavesCache['2026-09-10']=[record('sick',0,240)];e=c.calcSalaryEst(2026,9);
  assert.equal(e.workedHours,8);assert.equal(e.nightPay,200);assert.equal(e.missingComponents,false);assert.ok(e.notes.includes('nightEstimate'));
  c.SAL.nightPolicy='prorated';e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,200);assert.equal(e.missingComponents,false);
  c.SAL.nightPolicy='attendance';assert.equal(c.calcSalaryEst(2026,9).nightPay,300);
  c.SAL.nightPolicy='full';assert.equal(c.calcSalaryEst(2026,9).nightPay,0);
  c.leavesCache={};assert.equal(c.calcSalaryEst(2026,9).nightPay,300);
});

test('old monthly totals cannot freeze automatic pay when attendance changes',()=>{
  const c=env();c.shifts['2026-09-10']='晚';c.SAL.night=300;c.SAL.nightPolicy='prorated';
  c.SAL.monthly['2026-09']={inputVersion:2,nightTotalOverride:0,nightCountOverride:0,otFrontH:0,otBackH:0,sickHoursOverride:52};
  let e=c.calcSalaryEst(2026,9);assert.equal(e.nightPay,300);assert.equal(e.otPay,600);assert.equal(e.leaveDed,0);
  c.leavesCache['2026-09-10']=[record('sick',0,720)];e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,0);assert.equal(e.otPay,0);assert.equal(e.leaveDed,400);
  c.leavesCache={};assert.equal(c.calcSalaryEst(2026,9).net,24900);
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
test('automatic tiers come from each day, not a total or a saved split',()=>{
  const c=env();c.shifts['2026-09-11']='早';c.OTD={'2026-09-10':1,'2026-09-11':4};
  c.SAL.monthly['2026-09']={inputVersion:2,otHoursOverride:50,otFrontH:25,otBackH:25};
  const e=c.calcSalaryEst(2026,9);assert.equal(e.otH,5);assert.equal(e.totalFront,3);assert.equal(e.totalBack,2);assert.equal(e.otPay,733);
  assert.equal(e.otHoursOverridden,false);
});

test('52 hours of recorded sick leave automatically yields 2600, across the 26th cutoff',()=>{
  const c=env();Object.assign(c.SAL,{base:24000});c.shifts={};
  const dates=['2026-07-27','2026-07-30','2026-07-31','2026-08-03','2026-08-10','2026-08-15','2026-08-25'];
  dates.forEach((date,i)=>{c.shifts[date]='早';c.leavesCache[date]=[record('sick',0,i===6?240:480)];});
  const original=JSON.stringify(c.leavesCache);let e=c.calcSalaryEst(2026,8);
  assert.equal(e.sickH,52);assert.equal(e.sickPayH,52);assert.equal(e.leaveDed,2600);assert.equal(JSON.stringify(c.leavesCache),original);
  delete c.leavesCache['2026-07-27'];e=c.calcSalaryEst(2026,8);assert.equal(e.sickH,44);assert.equal(e.leaveDed,2200);
  assert.equal(c.calcSalaryEst(2026,9).leaveDed,0);
});
test('legacy 12h payable sick records are preserved while normal attendance remains capped at 8h',()=>{
  const c=env();Object.assign(c.SAL,{base:24000});c.shifts={};
  [12,12,8,8,8,4].forEach((hours,i)=>{const date=c.ek(2026,8,i+1);c.shifts[date]='早';c.leavesCache[date]=[{uid:'me',leaveType:'sick',hours}];});
  const before=JSON.stringify(c.leavesCache),e=c.calcSalaryEst(2026,8);
  assert.equal(e.sickH,52);assert.equal(e.leaveDed,2600);assert.equal(c.calcPayPeriod(2026,8).leaveH,44);
  assert.equal(e.days.reduce((n,d)=>n+d.legacyWageH,0),8);assert.equal(JSON.stringify(c.leavesCache),before);
});
test('synthetic overtime examples round once at the component total without a fitted wage base',()=>{
  for(const [base,days,pay] of [[25001,17,10626],[27000,11,7425]]){
    const c=env();c.SAL.base=base;c.shifts={};
    for(let d=1;d<=days;d++)c.shifts[c.ek(2026,8,d)]='早';
    assert.equal(c.calcSalaryEst(2026,8).otPay,pay);
  }
});
test('one-time weekday classification automatically applies to future months without date input',()=>{
  const c=env();c.SAL.dayRuleMode='weekly';c.SAL.weeklyDayKinds=['work','work','work','work','work','work','rest'];
  c.shifts={'2026-09-12':'早','2026-10-10':'早'};
  for(const month of [9,10]){const e=c.calcSalaryEst(2026,month);assert.equal(e.holidayH,12);assert.equal(e.holidayPay,2333);assert.equal(e.otPay,0);}
  c.SAL.monthly['2026-09']={days:{'2026-09-12':{kind:'work'}}};assert.equal(c.calcSalaryEst(2026,9).holidayPay,0);
  assert.equal(c.calcSalaryEst(2026,10).holidayPay,2333);
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
  const c=env();c.TY=2026;c.TM=9;c.TD=10;c.PAY_VIEW={y:2026,m:9};c.SAL_DEFAULT={...c.SAL,schemaVersion:5};c.saved=[];
  vm.runInContext('PAY_VIEW={y:2026,m:9}',c);
  c.sSAL=()=>c.saved.push(JSON.parse(JSON.stringify(c.SAL)));c.S.showSal=true;
  c.esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s]);
  c.studioMoney=n=>'$'+Math.round(n).toLocaleString('en-US');c.handle=()=>{};
  vm.runInContext(between('function normalizeSal(', 'normalizeSal();')+'\n'+between('function setSalPeriod(', 'function _leaveId(')+'\n'+between('function salaryFieldLabels(', 'let _openingTimer='),c);
  for(const k of ['base','meal','transport','position','night','union','welfare','laborIns','healthIns','otherDed','laborPensionWage','laborPensionSelfRate','laborPensionEmployerRate','otWageBase','leaveWageBase','otTier1Rate','otTier2Rate','sickRate','personalRate'])c.fields['sal_'+k]={value:String(c.SAL[k]??'')};
  const range=c.defaultSalaryPeriod(c.PAY_VIEW.y,c.PAY_VIEW.m);c.fields.sal_periodStart={value:range.start};c.fields.sal_periodEnd={value:range.end};
  return c;
}
test('salary settings save atomic one-time rules and preserve archived records without an import',()=>{
  const c=formEnv(),before=JSON.stringify(c.SAL);c.fields.sal_base.value='bad';assert.equal(c.saveSalaryForm(),false);assert.equal(JSON.stringify(c.SAL),before);assert.equal(c.saved.length,0);
  c.fields.sal_base.value='24000';c.fields.sal_night.value='0';c.fields.sal_nightConfirmed={checked:true};
  c.fields.sal_nightPolicy={value:'prorated'};c.fields.sal_dayRuleMode={value:'weekly'};c.fields.sal_week_6={value:'rest'};
  c.fields.sal_proposal={value:'800'};c.SAL.monthly['2026-09']={slip:{net:123},days:{'2026-09-10':{kind:'rest',workedHours:4}}};
  assert.equal(c.saveSalaryForm(),true);assert.equal(c.saved.length,1);
  assert.equal(c.SAL.night,0);assert.equal(c.SAL.nightRateSource,'configured');assert.equal(c.SAL.weeklyDayKinds[6],'rest');
  const p=c.getSalPeriod(2026,9);assert.equal(p.proposal,800);assert.equal(p.slip.net,123);assert.equal(p.days['2026-09-10'].workedHours,4);
  assert.equal(p.payPeriodStart,'2026-08-26');assert.equal(p.payPeriodEnd,'2026-09-25');
  assert.equal(c.getSalPeriod(2026,10).proposal,0);
  for(const lang of ['zh','id']){c.lang=lang;const html=c.rSalary();assert.match(html,/id="sal_periodStart"/);assert.match(html,/id="sal_periodEnd"/);assert.match(html,/pay-period-editor/);assert.doesNotMatch(html,/sal_importFile|sal_nightTotalOverride|sal_sickHoursOverride|NaN|undefined/);}
});

test('custom date form validates, saves only its selected month and preserves prior monthly data',()=>{
  const c=formEnv();c.SAL.monthly['2026-09']={slip:{net:123},proposal:500,payPeriodStart:'2026-08-30',payPeriodEnd:'2026-10-02',days:{'2026-09-10':{kind:'rest',workedHours:4}}};
  c.fields.sal_periodStart.value='2026-08-30';c.fields.sal_periodEnd.value='2026-10-02';
  const preview=c.rSalary();assert.match(preview,/value="2026-08-30"/);assert.match(preview,/value="2026-10-02"/);assert.match(preview,/4 天未分配/);assert.match(preview,/重疊 7 天/);
  assert.equal(c.saveSalaryForm(),true);
  const p=c.SAL.monthly['2026-09'];assert.equal(p.payPeriodStart,'2026-08-30');assert.equal(p.payPeriodEnd,'2026-10-02');
  assert.equal(p.slip.net,123);assert.equal(p.proposal,500);assert.equal(p.days['2026-09-10'].workedHours,4);
  assert.equal(c.getSalaryPeriodRange(2026,10).start,'2026-09-26');
  const before=JSON.stringify(c.SAL);c.fields.sal_periodStart.value='2026-10-05';c.fields.sal_periodEnd.value='2026-10-04';
  assert.equal(c.saveSalaryForm(),false);assert.equal(JSON.stringify(c.SAL),before);
  c.fields.sal_periodStart.value='2026-01-01';c.fields.sal_periodEnd.value='2027-01-06';
  assert.equal(c.saveSalaryForm(),false);assert.equal(JSON.stringify(c.SAL),before);
});

test('period reset restores the selected payroll month default and refreshes the 3D range preview',()=>{
  const c=formEnv();c.fields.sal_periodStart.value='2026-08-30';c.fields.sal_periodEnd.value='2026-10-02';
  c.fields.salaryPeriodPreview={textContent:''};c.fields.salaryPeriodDays={textContent:''};
  c.fields.salaryPeriodMessage={textContent:'',setAttribute(k,v){this[k]=v}};
  c.fields.salaryPeriodState={textContent:'',classList:{toggle(){}}};c.fields.payPeriodEditor={classList:{toggle(){}}};
  c.resetSalaryPeriodInputs();assert.equal(c.fields.sal_periodStart.value,'2026-08-26');assert.equal(c.fields.sal_periodEnd.value,'2026-09-25');
  assert.equal(c.fields.salaryPeriodPreview.textContent,'2026/08/26 – 2026/09/25');assert.equal(c.fields.salaryPeriodDays.textContent,'31 天');
});

test('saving automatic days does not freeze a weekly rule to work on every date',()=>{
  const c=formEnv();c.fields.sal_dayRuleMode={value:'weekly'};c.fields.sal_week_4={value:'rest'};
  c.fields.sal_effectiveFrom={value:'2026-09-01'};
  c.fields.sal_kind_2026={value:'auto'};c.fields['sal_kind_2026-09-10']={value:'auto'};
  assert.equal(c.saveSalaryForm(),true);assert.equal(Object.keys(c.getSalPeriod(2026,9).days).length,0);
  assert.equal(c.calcSalaryEst(2026,9).holidayH,12);assert.equal(c.calcSalaryEst(2026,9).otPay,0);
});

test('not attending an explicitly assigned rest or national holiday never deducts ordinary sick wages',()=>{
  const c=env();c.leavesCache['2026-09-10']=[record('sick',0,720)];
  for(const kind of ['rest','holiday']){
    c.SAL.monthly['2026-09']={inputVersion:2,days:{'2026-09-10':{kind,workedHours:0}}};
    const e=c.calcSalaryEst(2026,9);assert.equal(e.leaveDed,0);assert.equal(e.holidayPay,0);assert.equal(e.income,24000);
  }
});

test('a raise inside the payroll period uses the applicable daily wage for OT and sick deductions',()=>{
  const c=env();c.shifts={'2026-06-29':'早','2026-06-30':'早','2026-07-01':'早','2026-07-02':'早'};
  c.SAL.base=30000;c.SAL.wageHistory=[{effectiveFrom:'2026-05-01',base:24000},{effectiveFrom:'2026-07-01',base:30000}];
  c.leavesCache['2026-06-30']=[record('sick',0,720)];c.leavesCache['2026-07-02']=[record('sick',0,720)];
  const e=c.calcSalaryEst(2026,7);assert.equal(e.baseSum,30000);assert.equal(e.otPay,1350);assert.equal(e.leaveDed,900);
  assert.equal(e.days.find(d=>d.key==='2026-06-29').dayOtHourly,100);
  assert.equal(e.days.find(d=>d.key==='2026-07-01').dayOtHourly,125);
});
test('full paid disaster leave keeps paid ordinary overtime but does not create night attendance',()=>{
  const c=env();c.shifts['2026-09-10']='晚';c.SAL.night=300;c.TYD['2026-09-10']=12;
  const e=c.calcSalaryEst(2026,9);assert.equal(e.otPay,600);assert.equal(e.nightPay,0);assert.equal(e.workedDays,0);assert.equal(e.workedHours,0);assert.equal(e.leaveDed,0);
});
test('default payroll screen explains automatic rules without requiring confirmation or an import',()=>{
  const c=formEnv();c.SAL.nightPolicy='auto';c.SAL.dayRuleMode='roster';
  for(const lang of ['zh','id']){
    c.lang=lang;const h=c.rSalary();assert.doesNotMatch(h,/sal_nightConfirmed|type="checkbox"|sal_importFile|尚未確認|固定規則設定一次/);
    assert.match(h,/payroll-basis/);assert.equal((h.match(/<details\b/g)||[]).length,(h.match(/<\/details>/g)||[]).length);
  }
});

test('leave preview uses the exact dated month engine, including night loss and rounding, without mutating records',()=>{
  const c=env();c.shifts={'2026-09-10':'晚'};c.SAL.night=300;c.SAL.nightPolicy='prorated';
  const entry=record('sick',0,720),before=JSON.stringify({sal:c.SAL,leaves:c.leavesCache});
  const impact=c.leaveSalaryImpact('2026-09-10',entry);
  assert.equal(JSON.stringify({sal:c.SAL,leaves:c.leavesCache}),before);
  assert.equal(impact.month,'2026-09');assert.equal(impact.delta.leaveDed,400);assert.equal(impact.delta.otPay,-600);assert.equal(impact.delta.nightPay,-300);assert.equal(impact.delta.net,-1300);
  c.leavesCache['2026-09-10']=[entry];const saved=c.calcSalaryEst(2026,9);assert.equal(saved.net,impact.after.net);assert.equal(saved.leaveDed,impact.after.leaveDed);
});
test('preview routes the 26th to the following pay month and keeps pre-raise wages',()=>{
  const c=env();c.SAL.base=30000;c.SAL.wageHistory=[{effectiveFrom:'2026-05-01',base:24000},{effectiveFrom:'2026-07-01',base:30000}];c.shifts={'2026-06-26':'早'};
  const impact=c.leaveSalaryImpact('2026-06-26',record('sick',0,720));
  assert.equal(impact.month,'2026-07');assert.equal(impact.delta.leaveDed,400);assert.equal(impact.delta.otPay,-600);assert.equal(impact.delta.net,-1000);
  c.shifts={'2026-12-26':'早'};assert.equal(c.leaveSalaryImpact('2026-12-26',record('annual',480,720)).month,'2027-01');
});
test('preview uses the daily rest-day rule, not ordinary overtime or sick deduction',()=>{
  const c=env();c.SAL.monthly['2026-09']={days:{'2026-09-10':{kind:'rest'}}};
  const impact=c.leaveSalaryImpact('2026-09-10',record('sick',0,720));
  assert.equal(impact.delta.leaveDed,0);assert.equal(impact.delta.otPay,0);assert.equal(impact.delta.holidayPay,-2333);assert.equal(impact.after.holidayH,0);
});
test('saved company amounts stay immutable while a historical leave preview changes only the estimate',()=>{
  const c=env();c.SAL.monthly['2026-09']={slip:{baseSum:24000,proposal:0,otherIncome:0,otTaxFree:600,otTaxable:0,holidayPay:0,nightPay:0,fixedDed:0,leaveDed:0,laborPensionSelf:0,income:24600,deduction:0,net:24600}};
  const impact=c.leaveSalaryImpact('2026-09-10',record('personal',0,720));
  assert.equal(impact.after.official.net,24600);assert.equal(impact.after.net,23200);assert.equal(c.SAL.monthly['2026-09'].slip.net,24600);
});
test('saved special-day hours cannot keep holiday and night pay after a full leave; cancellation restores them',()=>{
  const c=env();c.shifts['2026-09-10']='晚';c.SAL.night=300;c.SAL.nightPolicy='prorated';
  c.SAL.monthly['2026-09']={days:{'2026-09-10':{kind:'rest',workedHours:12}}};
  const entry=record('sick',0,720),impact=c.leaveSalaryImpact('2026-09-10',entry);
  assert.equal(impact.delta.holidayPay,-2333);assert.equal(impact.delta.nightPay,-300);assert.equal(impact.delta.leaveDed,0);
  c.leavesCache['2026-09-10']=[entry];assert.equal(c.calcSalaryEst(2026,9).net,impact.after.net);
  c.leavesCache={};assert.equal(c.calcSalaryEst(2026,9).net,impact.before.net);
  c.SAL.monthly['2026-09'].days['2026-09-10'].workedHours=4;
  c.leavesCache['2026-09-10']=[record('sick',0,240)];
  assert.ok(c.calcSalaryEst(2026,9).notes.includes('specialAttendance'));
});
test('leave preview preserves the minus sign when the projected net is below zero',()=>{
  const c=env();c.SAL.otherDed=24000;c.select('personal',0,720);
  c.fields.leaveTimePreview={textContent:'',classList:{toggle(){}}};
  c.updateLeaveTimePreview('2026-09-10');assert.match(c.fields.leaveTimePreview.textContent,/儲存後 −\$800/);
});
test('history audit and payroll use the same night rule, trained only on earlier complete periods',()=>{
  const c=env();c.shifts={'2026-05-10':'晚','2026-06-10':'晚','2026-06-11':'晚','2026-07-10':'晚','2026-07-11':'晚','2026-08-10':'晚'};
  c.leavesCache={'2026-06-10':[record('annual',0,360)],'2026-07-10':[record('annual',0,240)]};
  Object.assign(c.SAL,{night:300,nightPolicy:'prorated',nightRateSource:'configured'});
  for(const m of [5,6,7,8]){
    const e=c.calcSalaryEst(2026,m),s={};
    for(const key of ['baseSum','proposal','otherIncome','holidayPay','nightPay','fixedDed','leaveDed','laborPensionSelf','income','deduction','net','sickH','personalH','annualH','disasterH','weekdayH','holidayH'])s[key]=e[key];
    s.otTaxFree=e.otPay;s.otTaxable=0;c.SAL.monthly['2026-0'+m]={slip:s};
  }
  Object.assign(c.SAL,{night:100,nightPolicy:'auto',nightRateSource:'unconfirmed'});
  c.payrollLeaveState={uid:'me',ownHistoryLoaded:true,months:[],loading:false,error:false};
  assert.equal(c.automaticNightRule('2026-07'),null);
  const fit=c.automaticNightRule('2026-08');assert.equal(fit.policy,'prorated');assert.equal(fit.rate,300);assert.equal(fit.validatedMonth,'2026-07');
  const audit=c.salaryHistoryAudit().rows.find(r=>r.month==='2026-08');
  assert.equal(audit.matched,true);assert.equal(audit.estimate,c.calcSalaryEst(2026,8).net);
});

function septemberEnv(){
  const c=env(),reference=JSON.parse(fs.readFileSync(path.join(__dirname,'../private-import/2026-09-payroll.json'),'utf8'));
  Object.assign(c.SAL,{base:35090,meal:3000,transport:1000,position:500,night:489,nightPolicy:'auto',nightRateSource:'unconfirmed',union:88,welfare:178,laborIns:1145,healthIns:1129});
  c.SAL.monthly['2026-09']={inputVersion:3,payPeriodStart:'2026-08-26',payPeriodEnd:'2026-09-20',proposal:0};
  // Synthetic dates reconstruct screenshot totals only; the upload does not contain the actual day-by-day roster.
  c.shifts={};for(let i=0;i<17;i++){const date=new Date(2026,7,26+i),key=c.ek(2026,date.getMonth()+1,date.getDate());c.shifts[key]=i<7?'晚':'早';
    if(i>=13)c.leavesCache[key]=[record('sick',0,720)];}
  return{c,reference};
}
test('September calibrates the observed night baseline automatically, imports its bonus and keeps official totals separate',()=>{
  const {c,reference}=septemberEnv();
  let e=c.calcSalaryEst(2026,9);assert.equal(e.net,50701);assert.equal(e.otPay,12867);assert.equal(e.nightPay,3423);assert.equal(e.leaveDed,2639);
  c.SAL=c.Payroll.attachReference(c.SAL,reference);e=c.calcSalaryEst(2026,9);
  assert.equal(e.proposal,400);assert.equal(e.net,52302);assert.equal(e.official.net,52302);assert.equal(e.nightPay,4624);
  assert.equal(e.verificationDelta,0);assert.equal(e.verified,false);assert.ok(e.notes.includes('nightCalibratedEstimate'));
  assert.ok(!e.notes.includes('nightAmountMismatch'));assert.equal(e.nightCalibration.sourceUnits,7);near(e.nightRate,4624/7);
  assert.equal(e.workedDays,13);assert.equal(e.workedHours,156);assert.equal(e.otH,52);assert.equal(e.sickPayH,32);
  assert.equal(c.getSalaryPeriodRange(2026,9).end,'2026-09-20');assert.equal(c.getSalPeriod(2026,10).proposal,0);
  const saved=JSON.stringify(c.SAL.monthly['2026-09'].slip),nightDate=Object.keys(c.shifts)[0];
  c.leavesCache[nightDate]=[record('sick',0,720)];e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,3963);assert.equal(e.otH,48);assert.equal(JSON.stringify(c.SAL.monthly['2026-09'].slip),saved);
  delete c.leavesCache[nightDate];assert.equal(c.calcSalaryEst(2026,9).nightPay,4624);
});
test('calibrated night preview equals saved calculation for every half-hour leave range and rounds only the monthly sum',()=>{
  const {c,reference}=septemberEnv();c.SAL=c.Payroll.attachReference(c.SAL,reference);
  const date=Object.keys(c.shifts)[0],baseline=JSON.stringify(c.SAL.monthly['2026-09'].nightCalibration);
  for(let start=0;start<720;start+=30)for(let end=start+30;end<=720;end+=30){
    delete c.leavesCache[date];const entry=record('annual',start,end,{shiftStartMinute:1200}),preview=c.leaveSalaryImpact(date,entry);
    c.leavesCache[date]=[entry];const e=c.calcSalaryEst(2026,9),expected=Math.round((7-(end-start)/720)*4624/7);
    assert.equal(e.nightPay,expected);assert.equal(e.nightPay,preview.after.nightPay);assert.equal(e.net,preview.after.net);
    assert.equal(JSON.stringify(c.SAL.monthly['2026-09'].nightCalibration),baseline);
  }
  delete c.leavesCache[date];const e=c.calcSalaryEst(2026,9);
  assert.equal(e.nightPay,4624);assert.notEqual(e.nightPay,e.days.reduce((sum,d)=>sum+Math.round(d.nightAmount),0));
});
test('shift changes, zero attendance and later periods use fixed calibration units without backfilling earlier months',()=>{
  const {c,reference}=septemberEnv();c.SAL=c.Payroll.attachReference(c.SAL,reference);
  const dates=Object.keys(c.shifts).slice(0,7);c.shifts[dates[0]]='早';assert.equal(c.calcSalaryEst(2026,9).nightPay,3963);
  c.shifts[dates[0]]='晚';for(const date of dates)c.leavesCache[date]=[record('annual',0,720)];
  assert.equal(c.calcSalaryEst(2026,9).nightPay,0);
  c.shifts={'2026-08-10':'晚','2026-10-10':'晚','2026-10-11':'晚'};c.leavesCache={};
  assert.equal(c.calcSalaryEst(2026,8).nightPay,489);assert.equal(c.calcSalaryEst(2026,8).nightCalibration,null);
  assert.equal(c.calcSalaryEst(2026,10).nightPay,1321);assert.equal(c.calcSalaryEst(2026,10).proposal,0);
  c.SAL.monthly['2026-10']={payPeriodStart:'2026-10-11',payPeriodEnd:'2026-10-11'};
  assert.equal(c.calcSalaryEst(2026,10).nightPay,661);
});
test('configured night rules override calibration by effective date, and a different shift duration is not silently fitted',()=>{
  const {c,reference}=septemberEnv();c.SAL=c.Payroll.attachReference(c.SAL,reference);
  c.SAL.ruleBaseline=c.Payroll.ruleSnapshot(c.SAL);
  c.SAL.ruleHistory=[{effectiveFrom:'2026-08-28',night:500,nightPolicy:'attendance',nightRateSource:'configured'}];
  const e=c.calcSalaryEst(2026,9);assert.equal(e.nightPay,3821);
  assert.equal(e.days.find(d=>d.key==='2026-08-27').nightSource,'payslip-calibrated');
  assert.equal(e.days.find(d=>d.key==='2026-08-28').nightSource,'configured');
  c.SAL.ruleHistory=[{effectiveFrom:'2026-08-26',nightMode:'hour',night:50,nightWindowStart:1320,nightWindowEnd:360,nightRateSource:'configured'}];
  assert.equal(c.calcSalaryEst(2026,9).nightPay,2800);assert.equal(c.calcSalaryEst(2026,9).nightCalibration,null);
  c.SAL.ruleHistory=[];c.shiftHours=8;
  assert.equal(c.calcSalaryEst(2026,9).nightPay,3423);assert.equal(c.calcSalaryEst(2026,9).nightCalibration,null);
});
test('history shows the same calibrated estimate without using it to invent independently verified company rules',()=>{
  const {c,reference}=septemberEnv();c.SAL=c.Payroll.attachReference(c.SAL,reference);
  c.payrollLeaveState={uid:'me',ownHistoryLoaded:true,months:[],loading:false,error:false};
  const raw=c.payrollHistoryEstimates()[0].estimate;assert.equal(raw.nightPay,3423);assert.equal(raw.nightCalibration,null);
  const audit=c.salaryHistoryAudit().rows.find(r=>r.month==='2026-09');
  assert.equal(audit.estimate,52302);assert.equal(audit.matched,false);assert.equal(c.automaticNightRule('2026-10'),null);
});
test('saving a new night rate and wage bases cannot rewrite the prior month forecast',()=>{
  const c=formEnv();c.shifts={'2026-09-10':'晚','2026-10-10':'晚'};c.PAY_VIEW={y:2026,m:10};
  vm.runInContext('PAY_VIEW={y:2026,m:10}',c);
  c.SAL.night=300;c.SAL.nightPolicy='prorated';c.SAL.nightRateSource='configured';
  const before=c.calcSalaryEst(2026,9).net;
  c.fields.sal_night.value='500';c.fields.sal_nightPolicy={value:'prorated'};c.fields.sal_otWageBase.value='30000';
  c.fields.sal_leaveWageBase.value='30000';c.fields.sal_effectiveFrom={value:'2026-10-01'};
  c.fields.sal_periodStart.value='2026-09-26';c.fields.sal_periodEnd.value='2026-10-25';
  assert.equal(c.saveSalaryForm(),true);assert.equal(c.calcSalaryEst(2026,9).net,before);
  assert.equal(c.calcSalaryEst(2026,10).nightPay,500);assert.equal(c.calcSalaryEst(2026,10).otPay,750);
  c.leavesCache['2026-09-10']=[record('sick',0,720)];assert.equal(c.calcSalaryEst(2026,9).leaveDed,400);
  c.leavesCache['2026-10-10']=[record('sick',0,720)];assert.equal(c.calcSalaryEst(2026,10).leaveDed,500);
});
test('a night rate change inside a period is summed daily, not multiplied by the closing-date rate',()=>{
  const c=env();c.shifts={'2026-09-09':'晚','2026-09-10':'晚'};
  Object.assign(c.SAL,{night:500,nightPolicy:'prorated',nightRateSource:'configured',ruleBaseline:{night:300,nightPolicy:'prorated',nightRateSource:'configured'},ruleHistory:[{effectiveFrom:'2026-09-10',night:500}]});
  const e=c.calcSalaryEst(2026,9);assert.equal(e.nightPay,800);assert.equal(e.nightCount,2);assert.equal(e.days.find(d=>d.key==='2026-09-09').nightAmount,300);
});
test('precise nighttime leave drives hourly night pay and preview through the same production engine',()=>{
  const c=env();c.shifts={'2026-09-10':'晚'};
  Object.assign(c.SAL,{nightMode:'hour',night:50,nightWindowStart:1320,nightWindowEnd:360,nightRateSource:'configured',nightPolicy:'auto'});
  assert.equal(c.calcSalaryEst(2026,9).nightPay,400);
  const entry=record('annual',240,480),impact=c.leaveSalaryImpact('2026-09-10',entry);
  assert.equal(impact.delta.nightPay,-200);c.leavesCache['2026-09-10']=[entry];
  assert.equal(c.calcSalaryEst(2026,9).nightPay,200);assert.equal(c.calcSalaryEst(2026,9).net,impact.after.net);
  assert.ok(!c.calcSalaryEst(2026,9).notes.includes('nightEstimate'));
  c.leavesCache['2026-09-10']=[{uid:'me',leaveType:'annual',hours:4}];assert.ok(c.calcSalaryEst(2026,9).notes.includes('nightAttendanceUnknown'));
});
test('rule-only changes require a real calendar effective date and remain atomic on failure',()=>{
  const c=formEnv();c.fields.sal_night.value='500';c.fields.sal_effectiveFrom={value:'2026-02-30'};
  const before=JSON.stringify(c.SAL);assert.equal(c.saveSalaryForm(),false);assert.equal(JSON.stringify(c.SAL),before);assert.equal(c.saved.length,0);
});
test('saving only a custom period and unchanged bonus does not create a dated rule change',()=>{
  const c=formEnv();c.SAL.nightPolicy='auto';c.fields.sal_nightPolicy={value:'auto'};
  for(let i=0;i<7;i++)c.fields['sal_week_'+i]={value:'work'};
  c.SAL.monthly['2026-09']={proposal:400};c.fields.sal_proposal={value:'400'};
  c.fields.sal_periodEnd.value='2026-09-20';assert.equal(c.saveSalaryForm(),true);
  assert.equal(c.SAL.ruleHistory,undefined);assert.equal(c.SAL.monthly['2026-09'].proposal,400);
});
