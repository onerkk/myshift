'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Payroll=require('../payroll.js');
const official={baseSum:39590,proposal:800,otherIncome:0,otTaxFree:8688,otTaxable:2200,holidayPay:5664,nightPay:3525,
  fixedDed:2540,leaveDed:4289,laborPensionSelf:0,income:60467,deduction:6829,net:53638,
  weekdayH:44,holidayH:19,sickH:52,disasterH:12,generalH:4,payDate:'2026-09-04'};
const oldEstimate={baseSum:39590,proposal:0,otherIncome:0,otPay:15812,holidayPay:0,nightPay:6083,
  fixedDed:2540,leaveDed:3601,laborPensionSelf:0,income:61485,deduction:6141,net:55344};
test('all original discrepancy components explain net +1706 exactly',()=>{
  const c=Payroll.reconcile(oldEstimate,official);assert.equal(c.valid,true);assert.equal(c.matched,false);
  const byKey=Object.fromEntries(c.rows.map(r=>[r.key,r.delta]));
  assert.equal(byKey.otPay,4924);assert.equal(byKey.holidayPay,-5664);assert.equal(byKey.nightPay,2558);assert.equal(byKey.proposal,-800);assert.equal(byKey.leaveDed,-688);
  assert.equal(c.deltas.income,1018);assert.equal(c.deltas.deduction,-688);assert.equal(c.deltas.net,1706);
  assert.equal(c.rows.reduce((sum,r)=>sum+r.delta*(r.deduction?-1:1),0),1706);
});
test('slip math checks components as well as all three totals',()=>{
  assert.equal(Payroll.slip(official).valid,true);
  assert.equal(Payroll.slip({...official,net:55344}).valid,false);
  assert.equal(Payroll.slip({...official,holidayPay:0}).valid,false);
  assert.equal(Payroll.slip({income:60467,deduction:6829,net:53638}).valid,false);
  const missing={...official};delete missing.otherIncome;assert.equal(Payroll.slip(missing).valid,false);
  assert.equal(Payroll.slip({...official,otherIncome:0}).valid,true);
});
test('explicit zero is different from unknown and invalid numeric input',()=>{
  assert.equal(Payroll.number(0),0);assert.equal(Payroll.number('0'),0);
  for(const value of [null,undefined,'',false,-1,Infinity,'oops'])assert.equal(Payroll.number(value),null);
  const c=Payroll.slip({...official,deduction:0});assert.equal(c.valid,false);assert.equal(c.data.deduction,0);
});
test('exact legacy calibration retires once with backup; fresh and custom profiles are preserved',()=>{
  const legacy={schemaVersion:4,otWageBase:39530,leaveWageBase:39280,night:553,monthly:{'2026-07':{payrollCalibrationVersion:1,proposal:200,reportedNet:57053}}};
  const source=JSON.stringify(legacy),fixed=Payroll.migrate(legacy);assert.equal(JSON.stringify(legacy),source);
  assert.equal(fixed.otWageBase,0);assert.equal(fixed.leaveWageBase,0);assert.equal(fixed.night,0);assert.equal(fixed.retiredCalibration.night,553);
  assert.equal(fixed.monthly['2026-07'].reportedNet,57053);assert.equal(fixed.monthly['2026-08'],undefined);
  assert.deepEqual(Payroll.migrate(fixed),fixed);
  const custom=Payroll.migrate({...legacy,night:250});assert.equal(custom.night,250);assert.equal(custom.leaveWageBase,39280);
  const fresh=Payroll.migrate({base:35090,meal:3000,transport:1000,position:500,monthly:{}});assert.deepEqual(fresh.monthly,{});assert.equal(fresh.night,undefined);
});
test('migration keeps old blank zeros automatic and preserves new explicit zero',()=>{
  const old=Payroll.migrate({schemaVersion:4,monthly:{'2026-08':{nightTotalOverride:0},'2026-09':{nightTotalOverride:100}}});
  assert.equal(old.monthly['2026-08'].nightTotalOverride,null);assert.equal(old.monthly['2026-09'].nightTotalOverride,100);
  assert.equal(Payroll.period({inputVersion:2,nightTotalOverride:0}).nightTotalOverride,0);
  assert.equal(Payroll.period({nightTotalOverride:0}).nightTotalOverride,null);
});
test('import whitelists a single salary month, without changing global rules or identity',()=>{
  const parsed=Payroll.parseImport(JSON.stringify({kind:'myshift-payroll',month:'2026-08',slip:official,uid:'ignored',base:1,inputs:{proposal:800,sickHoursOverride:52,night:1,base:999}}));
  assert.equal(parsed.month,'2026-08');assert.equal(parsed.slip.net,53638);assert.deepEqual(parsed.inputs,{proposal:800,sickHoursOverride:52});
  assert.equal(parsed.uid,undefined);assert.equal(parsed.base,undefined);assert.equal(parsed.slip.generalH,4);assert.equal(parsed.slip.weekdayH,44);
  for(const month of ['2026-13','2026-00','../../'])assert.throws(()=>Payroll.parseImport(JSON.stringify({kind:'myshift-payroll',month,slip:official})));
  assert.throws(()=>Payroll.parseImport(JSON.stringify({kind:'myshift-payroll',month:'2026-08',slip:{...official,net:0}})));
});
test('rest and national holiday examples are independent of weekday overtime',()=>{
  const rest=Payroll.dailyOT('rest',12,4,100,4/3,5/3);assert.equal(rest.ordinary,0);assert.equal(rest.weekdayH,0);assert.equal(rest.holidayH,12);assert.ok(Math.abs(rest.holiday-2333.3333333333)<1e-7);
  const holiday=Payroll.dailyOT('holiday',10,4,100,4/3,5/3);assert.ok(Math.abs(holiday.holiday-1066.6666666667)<1e-7);assert.equal(holiday.ordinary,0);
});
