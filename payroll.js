/* Payroll v305. Deterministic forecast; recorded payslips never drive the estimate. */
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
    s.schemaVersion=6;
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
  return{number,money,migrate,period,slip,parseImport,dailyOT,nightUnits,roundPay,reconcile,incomeKeys,deductionKeys,totalKeys,hourKeys,optionalKeys};
});
