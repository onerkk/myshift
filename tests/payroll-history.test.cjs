'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Payroll=require('../payroll.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../private-import/2026-08-payroll.json'),'utf8'));
const september=JSON.parse(fs.readFileSync(path.join(__dirname,'../private-import/2026-09-payroll.json'),'utf8'));
function context(){
  const writes=[],c={Payroll,AbortController,setTimeout,clearTimeout,console,Date,Promise,Set,Math,Array,Object,Number,String,
    fbUser:{uid:'owner-test',email:'onerkk@gmail.com',emailVerified:true},SAL:{monthly:{}},writes,
    getSalPeriod(y,m){return c.SAL.monthly[y+'-'+String(m).padStart(2,'0')]||{}},
    normalizeSal(){c.SAL=Payroll.migrate(c.SAL)},sSAL(){writes.push(JSON.stringify(c.SAL))},
    fetch:async url=>({ok:true,json:async()=>url.includes('2026-09')?september:raw})};
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf("let payrollReferenceState="),source.indexOf('function automaticNightRule(')),c);
  return c;
}
test('provided payroll is validated and loaded automatically for its verified owner without a form',async()=>{
  const c=context();await c.loadPayrollReference();
  assert.equal(c.SAL.monthly[raw.month].slip.net,raw.slip.net);
  assert.equal(c.SAL.base,raw.sourceDetails.fixedIncome.base);
  assert.equal(c.SAL.referenceOwnerUid,'owner-test');assert.equal(c.writes.length,1);
  c.fetch=()=>{throw Error('should use saved version')};await c.loadPayrollReference();assert.equal(c.writes.length,1);
  assert.equal(c.SAL.monthly[raw.month].sickHoursOverride,undefined);
  assert.equal(c.SAL.monthly['2026-09'].proposal,400);
  assert.equal(c.SAL.monthly['2026-09'].slip.net,52302);
  assert.equal(c.SAL.referenceVersion,325);
  assert.equal(c.SAL.monthly['2026-09'].nightCalibration.sourceUnits,7);
});
test('cached v324 payroll upgrades night calibration automatically without changing a manual bonus or the saved period',async()=>{
  const c=context(),oldSeptember=JSON.parse(JSON.stringify(september));delete oldSeptember.sourceDetails.nightBaseline;
  c.SAL=Payroll.attachReference(c.SAL,raw);c.SAL=Payroll.attachReference(c.SAL,oldSeptember);
  c.SAL.referenceVersion=324;c.SAL.referenceOwnerUid='owner-test';
  Object.assign(c.SAL.monthly['2026-09'],{proposal:0,bonusSources:{proposal:'manual'},payPeriodStart:'2026-08-26',payPeriodEnd:'2026-09-20'});
  await c.loadPayrollReference();assert.equal(c.SAL.referenceVersion,325);
  assert.equal(c.SAL.monthly['2026-09'].nightCalibration.rate,4624/7);
  assert.equal(c.SAL.monthly['2026-09'].proposal,0);assert.equal(c.SAL.monthly['2026-09'].payPeriodEnd,'2026-09-20');
});
test('reference is not fetched for another account, an unverified email or a logged-out session',async()=>{
  for(const user of [null,{uid:'other',email:'other@example.invalid',emailVerified:true},{uid:'other',email:'onerkk@gmail.com',emailVerified:false}]){
    const c=context();c.fbUser=user;c.fetch=()=>{throw Error('must not fetch')};await c.loadPayrollReference();
    assert.equal(c.writes.length,0);assert.deepEqual(c.SAL,{monthly:{}});
  }
});
test('account changes and invalid responses cannot attach or save a reference to the wrong user',async()=>{
  const c=context();c.fetch=async()=>({ok:true,json:async()=>{c.fbUser={uid:'other'};return raw}});
  await c.loadPayrollReference();assert.equal(c.writes.length,0);
  for(const response of [{ok:false},{ok:true,json:async()=>({...raw,slip:{...raw.slip,net:1}})}]){
    const d=context();d.fetch=async()=>response;await d.loadPayrollReference();assert.equal(d.writes.length,0);assert.deepEqual(d.SAL,{monthly:{}});
  }
});
test('historical own leaves survive month and unit filters without duplicate entries',async()=>{
  const c=context();c.S={yr:2026,mo:9,unit:'current'};c.TY=2026;c.TM=9;c.PAY_VIEW={y:2026,m:8};
  c.latestClosedSalaryMonth=()=>({y:2026,m:8});c.fsEnqueue=fn=>fn();c.leaveNumber=Payroll.number;c.render=()=>{};c._syncAnnualToALD=()=>{};
  const doc=(id,date,uid,unit)=>({id,data:()=>({date,uid,unit,hours:8,leaveType:'sick'})});
  const current=doc('current','2026-08-03','owner-test','current'),old=doc('older','2026-06-30','owner-test','old-unit');
  const other=doc('other','2026-08-03','colleague','different-unit');
  const queried=[];
  c.fbDb={collection:()=>({where:(field,op,value)=>{
    if(field==='ym')queried.push(...value);
    return{get:async()=>({forEach:f=>(field==='uid'?[current,old]:[current,other]).forEach(f)})};
  }})};
  const dates=fs.readFileSync(path.join(__dirname,'../schedule-experience.js'),'utf8');vm.runInContext(dates.slice(dates.indexOf('function experienceMonthDates('),dates.indexOf('function experienceOwnLeaveEvents(')),c);
  vm.runInContext(source.slice(source.indexOf('let leavesCache={};'),source.indexOf('function _syncAnnualToALD(){')),c);
  await c.loadLeaves();
  assert.equal(vm.runInContext("leavesCache['2026-08-03'].length",c),1);
  assert.equal(vm.runInContext("leavesCache['2026-06-30'][0].docId",c),'older');
  assert.equal(vm.runInContext('payrollLeaveState.ownHistoryLoaded',c),true);
  assert.ok(queried.includes('2026-10'));assert.ok(queried.includes('2026-08'));assert.equal(new Set(queried).size,queried.length);
});
test('queued payroll saves retain their originating uid and snapshot',async()=>{
  const c=context(),jobs=[],saved=[];
  c.localStorage={setItem(){}};c.fsEnqueue=fn=>{jobs.push(fn);return Promise.resolve()};
  c.fbDb={collection:()=>({doc:uid=>({set:async data=>saved.push({uid,data})})})};
  vm.runInContext(source.slice(source.indexOf('function sSAL(){'),source.indexOf('// 登入後從雲端拉回薪資')),c);
  c.SAL={base:24000};c.sSAL();c.fbUser={uid:'other'};c.SAL={base:30000};await jobs[0]();
  assert.equal(saved[0].uid,'owner-test');assert.equal(JSON.parse(saved[0].data.sal).base,24000);
});
test('a saved v306 reference still upgrades to September and retains the custom attendance period',async()=>{
  const c=context();c.SAL=Payroll.attachReference(c.SAL,raw);c.SAL.referenceVersion=306;c.SAL.referenceOwnerUid='owner-test';
  c.SAL.monthly['2026-09']={proposal:0,payPeriodStart:'2026-08-26',payPeriodEnd:'2026-09-20'};
  await c.loadPayrollReference();assert.equal(c.SAL.referenceVersion,325);assert.equal(c.SAL.monthly['2026-09'].slip.net,52302);
  assert.equal(c.SAL.monthly['2026-09'].payPeriodEnd,'2026-09-20');assert.equal(c.SAL.monthly['2026-09'].proposal,400);
});
test('a missing September file never commits a partial batch and can be retried',async()=>{
  const c=context();c.fetch=async url=>url.includes('2026-09')?{ok:false}:{ok:true,json:async()=>raw};
  await c.loadPayrollReference();assert.equal(c.writes.length,0);assert.equal(c.SAL.monthly['2026-08'],undefined);
  c.fetch=async url=>({ok:true,json:async()=>url.includes('2026-09')?september:raw});
  await c.loadPayrollReference();assert.equal(c.writes.length,1);assert.equal(c.SAL.monthly['2026-09'].slip.net,52302);
});
test('manual bonus changes during a reference fetch are preserved, and stale parallel loads cannot save twice',async()=>{
  const c=context(),pending=[];c.fetch=url=>new Promise(resolve=>pending.push({url,resolve}));
  const old=c.loadPayrollReference(),latest=c.loadPayrollReference();
  c.SAL.monthly['2026-09']={proposal:0,bonusSources:{proposal:'manual'}};
  for(const p of pending.slice(2))p.resolve({ok:true,json:async()=>p.url.includes('2026-09')?september:raw});
  await latest;assert.equal(c.writes.length,1);assert.equal(c.SAL.monthly['2026-09'].proposal,0);
  for(const p of pending.slice(0,2))p.resolve({ok:true,json:async()=>p.url.includes('2026-09')?september:raw});
  await old;assert.equal(c.writes.length,1);
});
