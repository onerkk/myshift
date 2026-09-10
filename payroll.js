/* Payroll v306. Dated wages, validated history and independent daily forecasts. */
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
    s.schemaVersion=7;
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
  function salaryAt(source,date){
    const rows=(Array.isArray(source.wageHistory)?source.wageHistory:[])
      .filter(r=>r&&/^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom||''))
      .sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
    const row=rows.filter(r=>r.effectiveFrom<=date).pop();
    // Future explicit changes in the normal salary form take precedence. Historical
    // rows remain immutable; editing today's salary must not rewrite previous pay.
    const out=Object.assign({},source);
    // For dates after the last historical statement, a differing current setting
    // is retained without inventing a retrospective effective date.
    const hasDatedChange=rows.some(r=>r.source==='user-change'&&r.effectiveFrom>source.wageHistoryCutoff);
    const live=source.wageHistoryCutoff&&!hasDatedChange&&date>source.wageHistoryCutoff&&row&&row.effectiveFrom<=source.wageHistoryCutoff;
    if(row&&!live)for(const k of fixedKeys)if(number(row[k])!==null)out[k]=number(row[k]);
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
    if(!number(previous.proposal))target.proposal=parsed.slip.proposal;
    if(!number(previous.otherIncome))target.otherIncome=parsed.slip.otherIncome;
    const current={...(details.fixedIncome||{}),...(details.fixedDeduction||{})};
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
    s.wageHistory=history;s.wageHistoryCutoff=parsed.month+'-25';s.enabled=number(s.base)>0;s.referenceVersion=306;
    return s;
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
    return{...checked,rows,deltas,matched:checked.valid&&!est.incomplete&&rows.every(r=>r.delta===0)};
  }
  return{number,money,migrate,period,slip,parseImport,dailyOT,nightUnits,roundPay,salaryAt,attachReference,inferNightRule,fixedKeys,reconcile,incomeKeys,deductionKeys,totalKeys,hourKeys,optionalKeys};
});
