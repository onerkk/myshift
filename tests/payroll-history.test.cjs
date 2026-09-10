'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Payroll=require('../payroll.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../private-import/2026-08-payroll.json'),'utf8'));
function context(){
  const writes=[],c={Payroll,AbortController,setTimeout,clearTimeout,console,Date,Promise,Set,Math,Array,Object,Number,String,
    fbUser:{uid:'owner-test',email:'onerkk@gmail.com',emailVerified:true},SAL:{monthly:{}},writes,
    getSalPeriod(y,m){return c.SAL.monthly[y+'-'+String(m).padStart(2,'0')]||{}},
    normalizeSal(){c.SAL=Payroll.migrate(c.SAL)},sSAL(){writes.push(JSON.stringify(c.SAL))},
    fetch:async()=>({ok:true,json:async()=>raw})};
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
  assert.equal(c.SAL.monthly['2026-09'],undefined);
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
  c.fbDb={collection:()=>({where:field=>({get:async()=>({forEach:f=>(field==='uid'?[current,old]:[current,other]).forEach(f)})})})};
  vm.runInContext(source.slice(source.indexOf('let leavesCache={};'),source.indexOf('function _syncAnnualToALD(){')),c);
  await c.loadLeaves();
  assert.equal(vm.runInContext("leavesCache['2026-08-03'].length",c),1);
  assert.equal(vm.runInContext("leavesCache['2026-06-30'][0].docId",c),'older');
  assert.equal(vm.runInContext('payrollLeaveState.ownHistoryLoaded',c),true);
});
test('queued payroll saves retain their originating uid and snapshot',async()=>{
  const c=context(),jobs=[],saved=[];
  c.localStorage={setItem(){}};c.fsEnqueue=fn=>{jobs.push(fn);return Promise.resolve()};
  c.fbDb={collection:()=>({doc:uid=>({set:async data=>saved.push({uid,data})})})};
  vm.runInContext(source.slice(source.indexOf('function sSAL(){'),source.indexOf('// 登入後從雲端拉回薪資')),c);
  c.SAL={base:24000};c.sSAL();c.fbUser={uid:'other'};c.SAL={base:30000};await jobs[0]();
  assert.equal(saved[0].uid,'owner-test');assert.equal(JSON.parse(saved[0].data.sal).base,24000);
});
