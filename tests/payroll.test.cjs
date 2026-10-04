'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Payroll=require('../payroll.js');
// Synthetic examples, unrelated to any employee's payslip.
const official={baseSum:24000,proposal:400,otherIncome:0,otTaxFree:1800,otTaxable:600,holidayPay:1000,nightPay:1200,
  fixedDed:1000,leaveDed:400,laborPensionSelf:0,income:29000,deduction:1400,net:27600,
  weekdayH:16,holidayH:8,sickH:8,disasterH:0,generalH:0,payDate:'2026-09-05'};
const oldEstimate={baseSum:24000,proposal:0,otherIncome:0,otPay:3000,holidayPay:0,nightPay:2000,
  fixedDed:1000,leaveDed:300,laborPensionSelf:0,income:29000,deduction:1300,net:27700};
test('synthetic discrepancy components explain the net difference exactly',()=>{
  const c=Payroll.reconcile(oldEstimate,official);assert.equal(c.valid,true);assert.equal(c.matched,false);
  const byKey=Object.fromEntries(c.rows.map(r=>[r.key,r.delta]));
  assert.equal(byKey.otPay,600);assert.equal(byKey.holidayPay,-1000);assert.equal(byKey.nightPay,800);assert.equal(byKey.proposal,-400);assert.equal(byKey.leaveDed,-100);
  assert.equal(c.deltas.income,0);assert.equal(c.deltas.deduction,-100);assert.equal(c.deltas.net,100);
  assert.equal(c.rows.reduce((sum,r)=>sum+r.delta*(r.deduction?-1:1),0),100);
});
test('slip math checks components as well as all three totals',()=>{
  assert.equal(Payroll.slip(official).valid,true);
  assert.equal(Payroll.slip({...official,net:27700}).valid,false);
  assert.equal(Payroll.slip({...official,holidayPay:0}).valid,false);
  assert.equal(Payroll.slip({income:29000,deduction:1400,net:27600}).valid,false);
  const missing={...official};delete missing.otherIncome;assert.equal(Payroll.slip(missing).valid,false);
  assert.equal(Payroll.slip({...official,otherIncome:0}).valid,true);
});
test('explicit zero is different from unknown and invalid numeric input',()=>{
  assert.equal(Payroll.number(0),0);assert.equal(Payroll.number('0'),0);
  for(const value of [null,undefined,'',false,-1,Infinity,'oops'])assert.equal(Payroll.number(value),null);
  const c=Payroll.slip({...official,deduction:0});assert.equal(c.valid,false);assert.equal(c.data.deduction,0);
});
test('exact legacy calibration retires once with backup; fresh and custom profiles are preserved',()=>{
  const legacy={schemaVersion:4,otWageBase:39530,leaveWageBase:39280,night:553,monthly:{'2026-07':{payrollCalibrationVersion:1,proposal:200,reportedNet:34000}}};
  const source=JSON.stringify(legacy),fixed=Payroll.migrate(legacy);assert.equal(JSON.stringify(legacy),source);
  assert.equal(fixed.otWageBase,0);assert.equal(fixed.leaveWageBase,0);assert.equal(fixed.night,0);assert.equal(fixed.retiredCalibration.night,553);
  assert.equal(fixed.monthly['2026-07'].reportedNet,34000);assert.equal(fixed.monthly['2026-08'],undefined);
  assert.deepEqual(Payroll.migrate(fixed),fixed);
  const custom=Payroll.migrate({...legacy,night:250});assert.equal(custom.night,250);assert.equal(custom.leaveWageBase,39280);
  const fresh=Payroll.migrate({base:35090,meal:3000,transport:1000,position:500,monthly:{}});assert.deepEqual(fresh.monthly,{});assert.equal(fresh.night,undefined);
});
test('migration archives monthly overrides and does not mutate source or repeat on reload',()=>{
  const source={schemaVersion:5,monthly:{'2026-08':{inputVersion:2,nightTotalOverride:0,sickHoursOverride:52,otFrontH:20,otBackH:20}}};
  const before=JSON.stringify(source),m=Payroll.migrate(source),p=m.monthly['2026-08'];
  assert.equal(JSON.stringify(source),before);assert.equal(p.sickHoursOverride,undefined);assert.equal(p.nightTotalOverride,undefined);
  assert.equal(p.manualEstimateBackup.sickHoursOverride,52);assert.equal(p.manualEstimateBackup.nightTotalOverride,0);
  assert.deepEqual(Payroll.migrate(m),m);
});
test('v303 and v304 recover the prior setting only for the exact known profile, with uncertainty retained',()=>{
  const profile={base:35090,meal:3000,transport:1000,position:500};
  const old={...profile,schemaVersion:4,otWageBase:39530,leaveWageBase:39280,night:553,monthly:{'2026-07':{payrollCalibrationVersion:1}}};
  const fixed=Payroll.migrate(old);assert.equal(fixed.night,489);assert.equal(fixed.nightRateSource,'legacy-unverified');
  const v304={...profile,schemaVersion:5,otWageBase:0,leaveWageBase:0,night:0,retiredCalibration:fixed.retiredCalibration};
  assert.equal(Payroll.migrate(v304).night,489);
  assert.equal(Payroll.migrate({...v304,night:300}).night,300);
  assert.equal(Payroll.migrate({...v304,base:24000}).night,0);
  assert.deepEqual(Payroll.migrate(fixed),fixed);
});
test('missing night pay and rounding changes are accounted for separately',()=>{
  const failed={...oldEstimate,otPay:3010,nightPay:0,leaveDed:320,income:27010,deduction:1320,net:25690};
  assert.equal(failed.net-oldEstimate.net,-2010);
  assert.equal(-2000+10-20,-2010);
  assert.equal(Payroll.reconcile(failed,official).deltas.net,-1910);
});

test('import whitelists a single salary month, without changing global rules or identity',()=>{
  const parsed=Payroll.parseImport(JSON.stringify({kind:'myshift-payroll',month:'2026-08',slip:official,uid:'ignored',base:1,inputs:{proposal:800,sickHoursOverride:52,night:1,base:999}}));
  assert.equal(parsed.month,'2026-08');assert.equal(parsed.slip.net,27600);assert.deepEqual(parsed.inputs,{proposal:800,sickHoursOverride:52});
  assert.equal(parsed.uid,undefined);assert.equal(parsed.base,undefined);assert.equal(parsed.slip.generalH,0);assert.equal(parsed.slip.weekdayH,16);
  for(const month of ['2026-13','2026-00','../../'])assert.throws(()=>Payroll.parseImport(JSON.stringify({kind:'myshift-payroll',month,slip:official})));
  assert.throws(()=>Payroll.parseImport(JSON.stringify({kind:'myshift-payroll',month:'2026-08',slip:{...official,net:0}})));
});
test('rest and national holiday examples are independent of weekday overtime',()=>{
  const rest=Payroll.dailyOT('rest',12,4,100,4/3,5/3);assert.equal(rest.ordinary,0);assert.equal(rest.weekdayH,0);assert.equal(rest.holidayH,12);assert.ok(Math.abs(rest.holiday-2333.3333333333)<1e-7);
  const holiday=Payroll.dailyOT('holiday',10,4,100,4/3,5/3);assert.ok(Math.abs(holiday.holiday-1066.6666666667)<1e-7);assert.equal(holiday.ordinary,0);
});

test('dated salaries retain past rates across a raise and preserve later explicit changes',()=>{
  const source={base:28000,meal:1000,union:70,wageHistory:[
    {effectiveFrom:'2026-05-26',base:24000,union:60},
    {effectiveFrom:'2026-07-01',base:26000,union:65}
  ],wageHistoryCutoff:'2026-08-25'};
  assert.equal(Payroll.salaryAt(source,'2026-06-30').baseSum,25000);
  assert.equal(Payroll.salaryAt(source,'2026-07-01').baseSum,27000);
  assert.equal(Payroll.salaryAt(source,'2026-09-10').baseSum,29000);
  assert.equal(Payroll.salaryAt(source,'2026-06-30').fixedDed,60);
  assert.equal(source.base,28000);
});
test('validated history attaches once without importing monthly hour overrides or changing its source',()=>{
  const source={base:0,monthly:{'2026-08':{proposal:0,manualEstimateBackup:{sickHoursOverride:20}}}};
  const reference={kind:'myshift-payroll',month:'2026-08',slip:official,inputs:{sickHoursOverride:8},sourceDetails:{fixedIncome:{base:24000},fixedDeduction:{union:1000},fixedPayEffectiveDate:'2026-07-01',nightEstimate:{rate:300},fixedIncomeHistory:[{effectiveFrom:'2026-05-26',base:23000}]}};
  const before=JSON.stringify(source),s=Payroll.attachReference(source,reference);
  assert.equal(JSON.stringify(source),before);assert.equal(s.enabled,true);assert.equal(s.night,300);assert.equal(s.nightPolicy,'auto');
  assert.equal(s.monthly['2026-08'].slip.net,27600);assert.equal(s.monthly['2026-08'].proposal,400);
  assert.equal(s.monthly['2026-08'].sickHoursOverride,undefined);assert.equal(s.monthly['2026-09'],undefined);
  assert.deepEqual(Payroll.attachReference(s,reference),s);
  const altered={...official,proposal:500,income:29100,net:27700};
  s.monthly['2026-08'].slip=altered;
  assert.equal(Payroll.attachReference(s,reference).monthly['2026-08'].slip.net,27700);
  assert.throws(()=>Payroll.attachReference(source,{...reference,slip:{...official,net:1}}));
});
test('night rule inference requires multiple complete months and rejects ambiguous or inconsistent evidence',()=>{
  const day=worked=>({worked,shiftHours:12});
  const rows=[{complete:true,amount:450,days:[day(12),day(6)]},{complete:true,amount:375,days:[day(12),day(3)]}];
  assert.deepEqual(Payroll.inferNightRule(rows),{policy:'prorated',rate:300,sampleCount:2});
  assert.equal(Payroll.inferNightRule(rows.slice(0,1)),null);
  assert.equal(Payroll.inferNightRule([rows[0],{...rows[1],complete:false}]),null);
  assert.equal(Payroll.inferNightRule([{complete:true,amount:300,days:[day(12)]},{complete:true,amount:600,days:[day(12),day(12)]}]),null);
  assert.equal(Payroll.inferNightRule([...rows,{complete:true,amount:1000,days:[day(12)]}]),null);
});

test('night auto learning needs three distinct complete periods and an untouched holdout month',()=>{
  const row=(month,worked,amount)=>({month,complete:true,amount,days:[{worked:12,shiftHours:12},{worked,shiftHours:12}]});
  const rows=[row('2026-05',6,450),row('2026-06',3,375),row('2026-07',9,525)];
  const fit=Payroll.validateNightRule(rows);assert.equal(fit.rate,300);assert.equal(fit.policy,'prorated');assert.equal(fit.validatedMonth,'2026-07');
  assert.equal(Payroll.validateNightRule(rows.slice(0,2)),null);
  assert.equal(Payroll.validateNightRule([rows[0],rows[0],rows[1]]),null);
  assert.equal(Payroll.validateNightRule([rows[0],rows[1],{...rows[2],amount:526}]),null);
  assert.equal(Payroll.validateNightRule([rows[0],rows[1],{...rows[2],complete:false}]),null);
});
test('multi-month audit never treats equal net totals with wrong components as matched',()=>{
  const audit=Payroll.historyAudit([{month:'2026-08',slip:official,estimate:{...oldEstimate,net:27600,deduction:1400,leaveDed:400,sickPayH:7,personalPayH:0,weekdayH:16,holidayH:8}}]);
  assert.equal(audit.valid,1);assert.equal(audit.matched,0);assert.ok(audit.rows[0].differences.some(d=>d.key==='nightPay'));assert.deepEqual(audit.rows[0].hourMismatches,['sickH']);
  assert.equal(Payroll.historyAudit([{month:'2026-07',slip:{net:27600},estimate:oldEstimate}]).valid,0);
});
test('the provided August sick deduction is reproduced without calibrating a free parameter',()=>{
  const r=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../private-import/2026-08-payroll.json'),'utf8'));
  const expected=Math.round(r.slip.baseSum/240*r.slip.sickH*.5);assert.equal(expected,r.slip.leaveDed);
  // Independent cents-scale arithmetic, before rounding to whole dollars.
  assert.equal(Math.round(r.slip.baseSum*r.slip.sickH/480),r.slip.leaveDed);
});

test('September supplied slip explains the original 1601 difference and preserves the old setting beside an observed calibration',()=>{
  const r=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../private-import/2026-09-payroll.json'),'utf8'));
  assert.equal(Payroll.slip(r.slip).valid,true);
  assert.equal(39590+400+9898+2969+4624,57481);
  assert.equal(88+178+1145+1129+2639,5179);
  assert.equal(57481-5179,52302);
  const e={baseSum:39590,proposal:0,otherIncome:0,otPay:12867,holidayPay:0,nightPay:3423,fixedDed:2540,leaveDed:2639,laborPensionSelf:0,
    income:55880,deduction:5179,net:50701,weekdayH:52,holidayH:0,sickPayH:32};
  const check=Payroll.reconcile(e,r.slip),diff=Object.fromEntries(check.rows.map(row=>[row.key,row.delta]));
  assert.equal(diff.proposal,-400);assert.equal(diff.nightPay,-1201);assert.equal(check.deltas.net,-1601);
  for(const key of ['baseSum','otPay','holidayPay','fixedDed','leaveDed','laborPensionSelf'])assert.equal(diff[key],0);
  const saved=Payroll.attachReference({base:35090,night:489,nightRateSource:'unconfirmed',monthly:{}},r);
  assert.equal(saved.night,489);assert.equal(saved.nightRateSource,'unconfirmed');
  assert.equal(saved.monthly['2026-09'].proposal,400);assert.equal(saved.monthly['2026-10'],undefined);
  assert.equal(saved.monthly['2026-09'].payPeriodEnd,undefined);
  assert.equal(saved.monthly['2026-09'].nightCalibration.sourceUnits,7);
  assert.equal(saved.monthly['2026-09'].nightCalibration.verified,false);
});
test('night calibration validates known components, uses a fixed observation and never mutates source data',()=>{
  const r=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../private-import/2026-09-payroll.json'),'utf8'));
  const original=JSON.stringify(r),calibration=Payroll.calibrateNight(r.month,r.slip,r.sourceDetails.nightBaseline);
  assert.equal(calibration.rate,4624/7);assert.equal(calibration.source,'payslip-calibrated');assert.equal(calibration.verified,false);
  assert.equal(JSON.stringify(r),original);
  for(const change of [{nightRate:0},{nightPay:0},{workedDays:6},{workedHours:157},{otPay:12868},{sickH:0},{periodStart:'2026-02-30'},{policy:'auto'}]){
    assert.equal(Payroll.calibrateNight(r.month,r.slip,{...r.sourceDetails.nightBaseline,...change}),null);
  }
  assert.equal(Payroll.calibrateNight(r.month,{...r.slip,net:1},r.sourceDetails.nightBaseline),null);
  const missing={...r.slip,sickH:null};assert.equal(Payroll.calibrateNight(r.month,missing,r.sourceDetails.nightBaseline),null);
});
test('automatic calibration excludes future and stale statements, preserves attachment identity and ignores editable attendance totals',()=>{
  const r=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../private-import/2026-09-payroll.json'),'utf8'));
  const s=Payroll.attachReference({monthly:{}},r),original=JSON.stringify(s);
  assert.equal(Payroll.automaticNightCalibration(s,'2026-08'),null);
  assert.equal(Payroll.automaticNightCalibration(s,'2026-10').rate,4624/7);
  assert.deepEqual(Payroll.attachReference(s,r),s);assert.equal(JSON.stringify(s),original);
  s.monthly['2026-09'].payPeriodEnd='2026-09-19';s.monthly['2026-09'].nightCountOverride=100;s.monthly['2026-10']=null;
  assert.equal(Payroll.automaticNightCalibration(s,'2026-10').rate,4624/7);
  Object.assign(s.monthly['2026-09'].slip,{nightPay:4724,income:57581,net:52402});
  assert.equal(Payroll.automaticNightCalibration(s,'2026-10'),null);
  const newer=Payroll.attachReference({monthly:{'2026-09':{slip:s.monthly['2026-09'].slip}}},r);
  assert.equal(newer.monthly['2026-09'].nightCalibration,undefined);
});
test('reference attachment preserves an explicitly changed bonus zero, current wages and saved company records',()=>{
  const r={kind:'myshift-payroll',month:'2026-08',slip:official,sourceDetails:{fixedIncome:{base:24000}}};
  const source={schemaVersion:8,base:30000,monthly:{'2026-08':{proposal:0,bonusSources:{proposal:'manual'}}}};
  const s=Payroll.attachReference(source,r);assert.equal(s.monthly['2026-08'].proposal,0);assert.equal(s.base,30000);
  assert.equal(Payroll.monthSalary(s,'2026-08').baseSum,24000);assert.equal(Payroll.monthSalary(s,'2026-09').baseSum,30000);
  assert.equal(Payroll.attachReference(s,r).monthly['2026-08'].proposal,0);
});
test('dated rule changes apply daily, preserve the pre-change baseline and inherit partial changes',()=>{
  const s={night:500,otWageBase:33000,ruleBaseline:{night:300,otWageBase:24000,nightPolicy:'prorated'},ruleHistory:[
    {effectiveFrom:'2026-10-01',night:500},{effectiveFrom:'2026-07-01',otWageBase:30000}]};
  const before=JSON.stringify(s);
  assert.equal(Payroll.ruleAt(s,'2026-06-30').night,300);assert.equal(Payroll.ruleAt(s,'2026-06-30').otWageBase,24000);
  assert.equal(Payroll.ruleAt(s,'2026-07-01').otWageBase,30000);assert.equal(Payroll.ruleAt(s,'2026-09-30').night,300);
  assert.equal(Payroll.ruleAt(s,'2026-10-01').night,500);assert.equal(Payroll.ruleAt(s,'2026-10-01').otWageBase,30000);
  assert.equal(JSON.stringify(s),before);
});
test('night hourly pay uses clock intersection across midnight, including middle shifts and exact leave location',()=>{
  const rule={nightMode:'hour',night:50,nightWindowStart:1320,nightWindowEnd:360}; // 22:00–06:00
  const day={shift:'晚',startMinute:1200,shiftHours:12,worked:12,workRanges:[[0,720]]};
  assert.equal(Payroll.nightAllowance(day,rule).amount,400);
  // Equal four-hour absences at different times have different night-pay effects.
  assert.equal(Payroll.nightAllowance({...day,worked:8,workRanges:[[240,720]]},rule).amount,300);
  assert.equal(Payroll.nightAllowance({...day,worked:8,workRanges:[[0,240],[480,720]]},rule).amount,200);
  assert.equal(Payroll.nightAllowance({shift:'中',startMinute:960,shiftHours:8,worked:8,workRanges:[[0,480]]},rule).amount,100);
  assert.equal(Payroll.nightAllowance({shift:'早',startMinute:480,shiftHours:12,worked:12,workRanges:[[0,720]]},rule).amount,0);
  assert.equal(Payroll.nightAllowance({...day,worked:0,workRanges:[]},rule).amount,0);
  const incomplete=Payroll.nightAllowance({...day,worked:8,workRanges:null},rule);assert.equal(incomplete.unknown,true);
});
test('hourly ranges handle half hours, overlapping leaves, ordinary OT total without a clock range and unknown legacy times',()=>{
  assert.deepEqual(Payroll.attendanceRanges(12,[{startOffset:120,endOffset:270},{startOffset:240,endOffset:360}],8),[[0,120],[360,720]]);
  assert.equal(Payroll.attendanceRanges(12,[{hours:4}],8),null);
  assert.equal(Payroll.attendanceRanges(12,[],10),null);
  const rule={nightMode:'hour',night:40,nightWindowStart:60,nightWindowEnd:330};
  assert.equal(Payroll.nightAllowance({shift:'晚',startMinute:1200,shiftHours:12,worked:12,workRanges:[[0,720]]},rule).amount,180);
});
test('matching component values cannot hide wrong totals or contradictory attendance hours',()=>{
  const est={...official,otPay:2400,sickPayH:8,incomplete:false};
  assert.equal(Payroll.reconcile(est,official).matched,true);
  assert.equal(Payroll.reconcile({...est,net:27601},official).matched,false);
  const result=Payroll.reconcile({...est,sickPayH:7},official);assert.equal(result.matched,false);assert.deepEqual(result.hourMismatches,['sickH']);
});
