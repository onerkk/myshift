/* Payroll v325. Immutable night calibration, dated rules and slip audits. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.Payroll=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const number=v=>!['number','string'].includes(typeof v)||(typeof v==='string'&&v.trim()==='')?null:
    (Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null);
  const money=v=>Math.round((number(v)||0)+1e-8);
  const incomeKeys=['baseSum','proposal','otherIncome','otTaxFree','otTaxable','holidayPay','nightPay'];
  const deductionKeys=['fixedDed','leaveDed','laborPensionSelf'];
  const totalKeys=['income','deduction','net'];
  const hourKeys=['weekdayH','holidayH','sickH','personalH','annualH','disasterH','generalH'];
  const optionalKeys=['nightCountOverride','nightTotalOverride','otFrontH','otBackH','sickHoursOverride','personalHoursOverride'];
  function migrate(source){
    const s=Object.assign({},source),old=Number(s.schemaVersion)||0;
    s.monthly=Object.assign({},s.monthly&&typeof s.monthly==='object'&&!Array.isArray(s.monthly)?s.monthly:{});
    if(old<5){
      // Only retire the exact fingerprint the old normalizer injected. Retain a backup.
      const july=s.monthly['2026-07'];
      if(july&&july.payrollCalibrationVersion===1&&Number(s.otWageBase)===39530&&Number(s.leaveWageBase)===39280&&Number(s.night)===553){
        s.retiredCalibration={otWageBase:s.otWageBase,leaveWageBase:s.leaveWageBase,night:s.night};
        s.otWageBase=0;s.leaveWageBase=0;s.night=0;s.legacyRulesNeedReview=true;
      }
      // Old forms wrote zero for every blank field; do not reinterpret those as explicit zero.
      for(const [key,value] of Object.entries(s.monthly)){
        const p=Object.assign({},value);
        if(!p.inputVersion){
          for(const k of optionalKeys)if(!(number(p[k])>0))p[k]=null;
          p.inputVersion=2;
        }
        s.monthly[key]=p;
      }
    }
    if(old<6){
      // The v304 migration erased the rate. This exact old profile had a documented
      // pre-calibration setting of 489, before v303 inferred 553 from one month's total.
      // Restore the setting, but do NOT call it a verified company rate.
      const retired=s.retiredCalibration;
      if(retired&&Number(retired.night)===553&&Number(retired.otWageBase)===39530&&Number(retired.leaveWageBase)===39280&&
          Number(s.night)===0&&Number(s.base)===35090&&Number(s.meal)===3000&&Number(s.transport)===1000&&Number(s.position)===500){
        s.night=489;s.nightRateSource='legacy-unverified';
      }
      for(const [key,value] of Object.entries(s.monthly)){
        const p=Object.assign({},value),backup={};
        for(const k of optionalKeys.concat(['otHoursOverride','otTaxFreeOverride','otTaxableOverride','leaveDedOverride'])){
          if(number(p[k])!==null)backup[k]=p[k];
          delete p[k];
        }
        if(Object.keys(backup).length)p.manualEstimateBackup=Object.assign({},p.manualEstimateBackup,backup);
        p.inputVersion=3;s.monthly[key]=p;
      }
    }
    if(old<7){
      if(!s.dayRuleMode||s.dayRuleMode==='unconfirmed')s.dayRuleMode='roster';
      if(!s.nightPolicy||s.nightPolicy==='unconfirmed')s.nightPolicy='auto';
    }
    s.schemaVersion=8;
    return s;
  }
  function period(source){
    const p=Object.assign({},source||{});
    for(const key of optionalKeys)p[key]=(!p.inputVersion&&!(number(p[key])>0))?null:number(p[key]);
    p.days=p.days&&typeof p.days==='object'&&!Array.isArray(p.days)?p.days:{};
    return p;
  }
  function slip(raw){
    const s={},errors=[];
    for(const key of incomeKeys.concat(deductionKeys,totalKeys,hourKeys)){
      s[key]=number(raw&&raw[key]);
      if(s[key]!==null&&!hourKeys.includes(key)&&!Number.isSafeInteger(s[key]))errors.push(key+': 金額請填整數元');
    }
    const complete=incomeKeys.concat(deductionKeys,totalKeys).every(k=>s[k]!==null);
    const sum=keys=>keys.reduce((n,k)=>n+(s[k]||0),0);
    if(incomeKeys.every(k=>s[k]!==null)&&s.income!==null&&sum(incomeKeys)!==s.income)errors.push('應領分項合計與公司應領不符');
    if(deductionKeys.every(k=>s[k]!==null)&&s.deduction!==null&&sum(deductionKeys)!==s.deduction)errors.push('應扣分項合計與公司應扣不符');
    if(totalKeys.every(k=>s[k]!==null)&&s.income-s.deduction!==s.net)errors.push('公司應領減應扣與實領不符');
    s.payDate=raw&&/^\d{4}-\d{2}-\d{2}$/.test(raw.payDate||'')?raw.payDate:'';
    return{data:s,complete,valid:complete&&errors.length===0,errors};
  }
  function parseImport(text){
    const raw=JSON.parse(text);
    if(!raw||raw.kind!=='myshift-payroll'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw.month||''))throw Error('不是有效的班表薪資匯入檔');
    const result=slip(raw.slip);
    if(!result.valid)throw Error(result.errors.join('；')||'薪資條欄位不完整，未列項目請明確填 0');
    // Whitelist per-period forecast inputs. Never import global rules, identity or arbitrary keys.
    const inputs={};
    for(const key of ['proposal','otherIncome','sickHoursOverride','personalHoursOverride']){
      const n=number(raw.inputs&&raw.inputs[key]);if(n!==null)inputs[key]=n;
    }
    return{month:raw.month,slip:result.data,inputs};
  }
  function dailyOT(kind,worked,ordinaryOT,hourly,r1,r2){
    worked=Math.max(0,Math.min(12,number(worked)||0));
    const h=Math.max(0,Math.min(4,number(ordinaryOT)||0));
    r1=number(r1)===null?4/3:r1;r2=number(r2)===null?5/3:r2;
    if(kind==='rest')return{weekdayH:0,holidayH:worked,front:0,back:0,ordinary:0,
      holiday:hourly*(Math.min(worked,2)*r1+Math.min(Math.max(0,worked-2),6)*r2+Math.max(0,worked-8)*(1+r2))};
    if(kind==='holiday')return{weekdayH:0,holidayH:worked,front:0,back:0,ordinary:0,
      holiday:worked>0?hourly*(8+Math.min(Math.max(0,worked-8),2)*r1+Math.max(0,worked-10)*r2):0};
    return{weekdayH:h,holidayH:0,front:Math.min(h,2),back:Math.max(0,h-2),
      ordinary:hourly*(Math.min(h,2)*r1+Math.max(0,h-2)*r2),holiday:0};
  }
  function nightUnits(worked,shiftHours,policy){
    worked=Math.max(0,Math.min(shiftHours,number(worked)||0));
    if(!worked||!(shiftHours>0))return{units:0,unknown:false};
    if(policy==='attendance')return{units:1,unknown:false};
    if(policy==='prorated')return{units:worked/shiftHours,unknown:false};
    if(policy==='full')return{units:worked>=shiftHours-1e-7?1:0,unknown:false};
    return{units:worked>=shiftHours-1e-7?1:0,unknown:worked<shiftHours-1e-7};
  }
  function roundPay(value,policy){return policy==='floor'?Math.floor(value+1e-7):Math.round(value+1e-7);}
  const fixedKeys=['base','meal','transport','position','union','welfare','laborIns','healthIns','otherDed'];
  const ruleDefaults={night:0,nightMode:'shift',nightWindowStart:1200,nightWindowEnd:480,nightPolicy:'auto',nightRateSource:'unconfirmed',
    otWageBase:0,leaveWageBase:0,otTier1Rate:1.3334,otTier2Rate:1.6667,sickRate:.5,personalRate:1,
    payRounding:'nearest',dayRuleMode:'roster',weeklyDayKinds:[],laborPensionWage:0,laborPensionSelfRate:0,laborPensionEmployerRate:6};
  const ruleKeys=Object.keys(ruleDefaults);
  function ruleSnapshot(source){
    const out={};
    for(const k of ruleKeys){const value=source&&source[k];out[k]=value===undefined?ruleDefaults[k]:Array.isArray(value)?value.slice():value;}
    if(out.nightPolicy==='unconfirmed')out.nightPolicy='auto';
    out.weeklyDayKinds=Array.from({length:7},(_,i)=>(out.weeklyDayKinds||[])[i]||'work');
    return out;
  }
  function ruleAt(source,date){
    const rows=(Array.isArray(source.ruleHistory)?source.ruleHistory:[]).filter(r=>r&&/^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom||''))
      .sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
    const out=ruleSnapshot(rows.length?source.ruleBaseline||source:source);
    for(const row of rows)if(row.effectiveFrom<=date)for(const key of ruleKeys)if(row[key]!==undefined)out[key]=Array.isArray(row[key])?row[key].slice():row[key];
    return out;
  }
  // Clock ranges are relative to the start of the shift. Null means their location
  // is unknown: a legacy "4 hours" record cannot establish which night hours were worked.
  function attendanceRanges(shiftHours,absences,workedHours){
    const minutes=Math.round(shiftHours*60),missed=new Uint8Array(minutes);
    for(const leave of absences||[]){
      if(number(leave.startOffset)===null||number(leave.endOffset)===null||leave.endOffset<=leave.startOffset)return null;
      for(let i=Math.max(0,Math.round(leave.startOffset));i<Math.min(minutes,Math.round(leave.endOffset));i++)missed[i]=1;
    }
    const ranges=[];let start=null,count=0;
    for(let i=0;i<=minutes;i++){
      const present=i<minutes&&!missed[i];if(present){count++;if(start===null)start=i;}
      else if(start!==null){ranges.push([start,i]);start=null;}
    }
    return Math.abs(count/60-workedHours)<1e-7?ranges:null;
  }
  function nightAllowance(day,rule){
    const sh=number(day.shiftHours)||0,worked=Math.min(sh,number(day.worked)||0),rate=number(rule.night)||0;
    if(rule.nightMode!=='hour'){
      const result=day.shift==='晚'?nightUnits(worked,sh,rule.nightPolicy):{units:0,unknown:false};
      return{...result,amount:result.units*rate,hours:0,scheduledHours:day.shift==='晚'?sh:0,basis:'shift'};
    }
    const start=number(rule.nightWindowStart),end=number(rule.nightWindowEnd);
    if(start===null||end===null||start>=1440||end>=1440)return{units:0,hours:0,amount:0,unknown:true,scheduledHours:0,basis:'hour'};
    const clock=number(day.startMinute)||0,limit=Math.round(sh*60),eligible=new Uint8Array(limit);
    for(let i=0;i<limit;i++){
      const t=(clock+i)%1440;eligible[i]=start===end|| (start<end?t>=start&&t<end:t>=start||t<end)?1:0;
    }
    const scheduledHours=eligible.reduce((a,b)=>a+b,0)/60;
    if(!worked||!scheduledHours)return{units:0,hours:0,amount:0,unknown:false,scheduledHours,basis:'hour'};
    const ranges=day.workRanges;
    if(!Array.isArray(ranges)){
      const hours=scheduledHours*worked/sh;
      return{units:hours,hours,amount:hours*rate,unknown:true,scheduledHours,basis:'hour'};
    }
    const counted=new Uint8Array(limit);
    for(const range of ranges)for(let i=Math.max(0,Math.round(range[0]));i<Math.min(limit,Math.round(range[1]));i++)counted[i]=eligible[i];
    const hours=counted.reduce((a,b)=>a+b,0)/60;
    return{units:hours,hours,amount:hours*rate,unknown:false,scheduledHours,basis:'hour'};
  }
  // A screenshot can establish an observed attendance unit, but cannot prove a
  // company's complete policy. Keep that original observation immutable. Never
  // divide the slip amount by today's editable roster or leave totals.
  function calibrateNight(month,official,baseline){
    const check=slip(official),b=baseline||{};
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||'')||!check.valid||b.version!==1||b.source!=='app-screenshot'||
        !['attendance','prorated','full'].includes(b.policy))return null;
    const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
      const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;};
    if(!validDate(b.periodStart)||!validDate(b.periodEnd)||b.periodStart>b.periodEnd)return null;
    const oldRate=number(b.nightRate),oldPay=number(b.nightPay),shiftHours=number(b.shiftHours),workedDays=number(b.workedDays),workedHours=number(b.workedHours);
    if(!(oldRate>0)||!(oldPay>0)||!(shiftHours>0)||shiftHours>12||!(workedDays>0)||!Number.isInteger(workedDays)||
        workedHours===null||workedHours>workedDays*shiftHours+1e-7)return null;
    const units=oldPay/oldRate,span=(Date.parse(b.periodEnd)-Date.parse(b.periodStart))/86400000+1;
    if(units>workedDays+1e-7||workedDays>span||check.data.nightPay<=0)return null;
    // Known non-night components and company hours must agree. Unknown fields
    // remain unknown and are never filled with zero to validate a policy.
    const pairs={baseSum:check.data.baseSum,otPay:check.data.otTaxFree+check.data.otTaxable,holidayPay:check.data.holidayPay,
      fixedDed:check.data.fixedDed,leaveDed:check.data.leaveDed,weekdayH:check.data.weekdayH,sickH:check.data.sickH};
    if(Object.entries(pairs).some(([key,value])=>value===null||number(b[key])===null||Math.abs(number(b[key])-value)>1e-7))return null;
    const snapshot={version:1,source:'app-screenshot',policy:b.policy,periodStart:b.periodStart,periodEnd:b.periodEnd,
      nightRate:oldRate,nightPay:oldPay,shiftHours,workedDays,workedHours};
    for(const key of Object.keys(pairs))snapshot[key]=number(b[key]);
    return{version:1,source:'payslip-calibrated',sourceMonth:month,sourceNightPay:check.data.nightPay,
      sourceUnits:units,shiftHours,rate:check.data.nightPay/units,policy:b.policy,verified:false,baseline:snapshot};
  }
  function automaticNightCalibration(source,month){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))return null;
    const monthly=source.monthly||{},keys=Object.keys(monthly).filter(k=>/^\d{4}-(0[1-9]|1[0-2])$/.test(k)&&k<=month).sort().reverse();
    for(const key of keys){
      const record=monthly[key]||{},saved=record.nightCalibration;
      if(!saved||saved.source!=='payslip-calibrated'||saved.sourceMonth!==key)continue;
      const result=calibrateNight(key,record.slip,saved.baseline);
      // A later edited statement invalidates the original observation; it must
      // not silently re-fit the original baseline to a different payment.
      if(result&&result.sourceNightPay===saved.sourceNightPay&&result.sourceUnits===saved.sourceUnits)return result;
    }
    return null;
  }
  function salaryAt(source,date){
    const rows=(Array.isArray(source.wageHistory)?source.wageHistory:[])
      .filter(r=>r&&/^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom||''))
      .sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
    const row=rows.filter(r=>r.effectiveFrom<=date).pop();
    // Future explicit changes in the normal salary form take precedence. Historical
    // rows remain immutable; editing today's salary must not rewrite previous pay.
    const out=Object.assign({},source,source.wageBaseline||{});
    // For dates after the last historical statement, a differing current setting
    // is retained without inventing a retrospective effective date.
    const hasDatedChange=rows.some(r=>r.source==='user-change'&&r.effectiveFrom>source.wageHistoryCutoff);
    const live=source.wageHistoryCutoff&&!hasDatedChange&&date>source.wageHistoryCutoff&&row&&row.effectiveFrom<=source.wageHistoryCutoff;
    if(live){for(const k of fixedKeys)if(number(source[k])!==null)out[k]=number(source[k]);}
    else {for(const r of rows)if(r.effectiveFrom<=date)for(const k of fixedKeys)if(number(r[k])!==null)out[k]=number(r[k]);}
    out.baseSum=['base','meal','transport','position'].reduce((v,k)=>v+(number(out[k])||0),0);
    out.fixedDed=['union','welfare','laborIns','healthIns','otherDed'].reduce((v,k)=>v+(number(out[k])||0),0);
    out.effectiveFrom=row?row.effectiveFrom:null;
    return out;
  }
  function attachReference(source,raw){
    const parsed=parseImport(JSON.stringify(raw)),s=migrate(source),details=raw.sourceDetails||{};
    const previous=s.monthly[parsed.month]||{};
    // A user's later saved, complete statement wins over the bundled reference.
    s.monthly[parsed.month]={...previous};
    if(!slip(previous.slip).valid)Object.assign(s.monthly[parsed.month],{slip:parsed.slip,referenceSource:'provided-payslip',inputVersion:3});
    const target=s.monthly[parsed.month];
    const calibration=calibrateNight(parsed.month,target.slip,details.nightBaseline);
    if(calibration&&slip(target.slip).data.nightPay===parsed.slip.nightPay&&!target.nightCalibration)target.nightCalibration=calibration;
    const current={...(details.fixedIncome||{}),...(details.fixedDeduction||{})};
    if(!previous.fixedSalary&&Object.keys(current).length)target.fixedSalary={...current};
    target.bonusSources={...previous.bonusSources};
    for(const key of ['proposal','otherIncome']){
      if(target.bonusSources[key]!=='manual'&&!(number(previous[key])>0)){
        target[key]=slip(target.slip).data[key];target.bonusSources[key]='provided-payslip';
      }
    }
    for(const k of fixedKeys)if(number(current[k])!==null&&(!(number(s[k])>0)||(details.fixedIncomeHistory||[]).some(r=>number(r[k])===number(s[k]))))s[k]=number(current[k]);
    const history=Array.isArray(s.wageHistory)?s.wageHistory.slice():[];
    for(const r of details.fixedIncomeHistory||[]){
      if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom||'')||history.some(h=>h.effectiveFrom===r.effectiveFrom))continue;
      const row={effectiveFrom:r.effectiveFrom,source:'provided-payslip'};
      for(const k of fixedKeys)if(number(r[k])!==null)row[k]=number(r[k]);
      history.push(row);
    }
    if(/^\d{4}-\d{2}-\d{2}$/.test(details.fixedPayEffectiveDate||'')&&!history.some(r=>r.effectiveFrom===details.fixedPayEffectiveDate)){
      history.push({effectiveFrom:details.fixedPayEffectiveDate,...current,source:'provided-payslip'});
    }
    if(!(number(s.night)>0)&&s.nightRateSource!=='configured'&&number(details.nightEstimate&&details.nightEstimate.rate)>0){
      s.night=number(details.nightEstimate.rate);s.nightPolicy='auto';s.nightRateSource='unconfirmed';
    }
    s.wageHistory=history;s.wageHistoryCutoff=[s.wageHistoryCutoff||'',parsed.month+'-25'].sort().pop();s.enabled=number(s.base)>0;
    return s;
  }
  function monthSalary(source,month){
    const result=salaryAt(source,month+'-25'),saved=source.monthly&&source.monthly[month]&&source.monthly[month].fixedSalary;
    if(saved){for(const key of fixedKeys)if(number(saved[key])!==null)result[key]=number(saved[key]);
      result.baseSum=['base','meal','transport','position'].reduce((v,k)=>v+(number(result[k])||0),0);
      result.fixedDed=['union','welfare','laborIns','healthIns','otherDed'].reduce((v,k)=>v+(number(result[k])||0),0);}
    return result;
  }
  function inferNightRule(observations){
    const rows=(observations||[]).filter(r=>r&&r.complete===true&&number(r.amount)!==null&&Array.isArray(r.days));
    if(rows.length<2)return null;
    const matches=[];
    for(const policy of ['attendance','prorated','full']){
      let low=0,high=Infinity;
      for(const r of rows){
        const units=r.days.reduce((v,d)=>v+nightUnits(d.worked,d.shiftHours,policy).units,0);
        if(!units){if(r.amount>0){high=-1;break;}continue;}
        low=Math.max(low,(r.amount-.5)/units);high=Math.min(high,(r.amount+.5)/units);
      }
      if(high>=low&&Number.isFinite(high)){
        const rate=Math.round((low+high)*50)/100;
        if(rate<high&&rows.every(r=>money(r.days.reduce((v,d)=>v+nightUnits(d.worked,d.shiftHours,policy).units,0)*rate)===r.amount))matches.push({policy,rate,sampleCount:rows.length});
      }
    }
    // Several policies can coincide for full shifts. Do not silently pick one.
    return matches.length===1?matches[0]:null;
  }
  function validateNightRule(observations){
    const unique=new Map();
    for(const r of observations||[])if(r&&/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month||''))unique.set(r.month,r);
    const rows=[...unique.values()].filter(r=>r.complete===true).sort((a,b)=>a.month.localeCompare(b.month));
    if(rows.length<3)return null;
    const train=rows.slice(0,-1),holdout=rows[rows.length-1],rule=inferNightRule(train);
    if(!rule)return null;
    const expected=money(holdout.days.reduce((n,d)=>n+nightUnits(d.worked,d.shiftHours,rule.policy).units,0)*rule.rate);
    if(number(holdout.amount)===null||expected!==holdout.amount)return null;
    return{...rule,sampleCount:rows.length,validatedMonth:holdout.month,source:'history-matched'};
  }
  function historyAudit(records){
    const rows=(records||[]).map(r=>{
      const check=slip(r.slip),e=r.estimate;
      if(!check.valid||!e)return{month:r.month,valid:false,pending:false,matched:false,differences:[],hourMismatches:[]};
      const compared=reconcile(e,check.data),s=check.data;
      const pairs={sickH:e.sickPayH,personalH:e.personalPayH,annualH:e.annualH,disasterH:e.disasterH,weekdayH:e.weekdayH,holidayH:e.holidayH};
      const hourMismatches=Object.keys(pairs).filter(k=>s[k]!==null&&number(pairs[k])!==null&&Math.abs(s[k]-pairs[k])>.001);
      const differences=compared.rows.filter(x=>x.delta!==null&&x.delta!==0).map(x=>({key:x.key,delta:x.delta}));
      return{month:r.month,valid:true,pending:!!e.dataPending,matched:compared.matched&&!hourMismatches.length,actual:s.net,estimate:e.net,differences,hourMismatches};
    });
    return{total:rows.length,valid:rows.filter(r=>r.valid).length,matched:rows.filter(r=>r.matched).length,rows};
  }
  function reconcile(est,official){
    const checked=slip(official),s=checked.data;
    const rows=incomeKeys.concat(deductionKeys).map(key=>{
      // Ordinary overtime tax categories require the actual company split; never prorate hours.
      const estimate=key==='otTaxFree'||key==='otTaxable'?null:number(est[key]);
      return{key,estimate,actual:s[key],delta:estimate===null||s[key]===null?null:estimate-s[key],deduction:deductionKeys.includes(key)};
    });
    const ordinary=s.otTaxFree!==null&&s.otTaxable!==null?s.otTaxFree+s.otTaxable:null;
    rows.splice(3,2,{key:'otPay',estimate:est.otPay,actual:ordinary,delta:ordinary===null?null:est.otPay-ordinary,deduction:false});
    const deltas={};for(const k of totalKeys)deltas[k]=s[k]===null?null:est[k]-s[k];
    const hourValues={weekdayH:est.weekdayH,holidayH:est.holidayH,sickH:est.sickPayH,personalH:est.personalPayH,annualH:est.annualH,disasterH:est.disasterH};
    const hourMismatches=Object.keys(hourValues).filter(k=>s[k]!==null&&number(hourValues[k])!==null&&Math.abs(s[k]-hourValues[k])>.001);
    return{...checked,rows,deltas,hourMismatches,matched:checked.valid&&!est.incomplete&&!hourMismatches.length&&rows.every(r=>r.delta===0)&&totalKeys.every(k=>deltas[k]===0)};
  }
  return{number,money,migrate,period,slip,parseImport,dailyOT,nightUnits,roundPay,salaryAt,monthSalary,ruleAt,ruleSnapshot,ruleKeys,attendanceRanges,nightAllowance,calibrateNight,automaticNightCalibration,attachReference,inferNightRule,validateNightRule,historyAudit,fixedKeys,reconcile,incomeKeys,deductionKeys,totalKeys,hourKeys,optionalKeys};
});
