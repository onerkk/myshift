'use strict';
process.env.TZ='Asia/Taipei';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../share-calendar.js'),'utf8');
function env(language='zh'){
  const c={Date,Math,Object,Array,String,Number,Map,Set,Promise,setTimeout,clearTimeout,lang:language,S:{rt:'four',unit:'測試單位'},fbUser:{uid:'self'},
    RN:{zh:{four:'四休二'},id:{four:'4 kerja 2 libur'}},dim:(y,m)=>new Date(y,m,0).getDate(),fdw:(y,m)=>new Date(y,m-1,1).getDay(),
    t:()=>language==='zh'?['日','一','二','三','四','五','六']:['Min','Sen','Sel','Rab','Kam','Jum','Sab'],
    calendarDayInfo:(y,m,d)=>({d,key:[y,m,d].join('-'),shift:['早','中','晚','休'][d%4],today:d===30,leaveCount:d===1?null:d===2?2:0,holiday:d===5?'完整節日名稱':'',events:[],adjusted:d===10}),
    document:{},window:{addEventListener(){}},getComputedStyle:()=>({fontFamily:'sans-serif'})};
  vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../schedule-experience.js'),'utf8'),c);vm.runInContext(source+'\nthis.share=MyShiftShare;',c);return c;
}
test('poster dates and weekday alignment cover leap years and four, five and six week calendars',()=>{
  const c=env();
  for(const [y,m,days,rows] of [[2026,2,28,4],[2026,9,30,5],[2026,8,31,6],[2028,2,29,5]]){
    const model=c.share.buildModel(y,m);assert.equal(model.days.length,days);assert.equal(model.first,new Date(y,m-1,1).getDay());assert.equal(model.rows,rows);
    assert.equal(Object.values(model.counts).reduce((a,b)=>a+b,0),days);
  }
  assert.throws(()=>c.share.buildModel(2026,13));assert.throws(()=>c.share.buildModel(2026,0));
});
test('poster fills adjacent dates across year boundaries while month totals exclude those dates',()=>{
  const c=env();c.calendarDayInfo=(y,m,d)=>({key:`${y}-${m}-${d}`,shift:m===1?'早':'晚',leaveCount:m===1?0:null,events:[{id:'own-sick',own:true,hours:m===1?1:100,short:'病假',tone:'own-leave'}]});
  const model=c.share.buildModel(2027,1);
  assert.equal(model.cells.length,42);assert.equal(model.days.length,31);assert.equal(model.counts.早,31);assert.equal(model.counts.晚,0);assert.equal(model.ownHours,31);
  assert.equal(model.cells[0].key,'2026-12-27');assert.equal(model.cells[41].key,'2027-2-6');
  assert.equal(model.cells[0].monthOffset,-1);assert.equal(model.cells[41].monthOffset,1);assert.equal(model.cells[0].leaveCount,null);
  assert.ok(model.days.every(day=>day.inMonth&&day.y===2027&&day.m===1));
});
test('calendar model preserves exact holidays, own leave hours and notes without colleague private data',()=>{
  const c=env();c.calendarDayInfo=(y,m,d)=>({key:`${y}-${m}-${d}`,shift:'晚',today:d===30,leaveCount:2,holiday:d===5?'教師節（補假）':'',adjusted:d===6,uid:'COLLEAGUE_UID',reason:'PRIVATE_REASON',events:d===6?[{id:'own-sick',tone:'own-leave',own:true,label:'本人 病假 8h',short:'病假 8h',hours:8},{id:'own-overtime',tone:'own-leave',own:true,label:'本人 未加班 4h',short:'未加班 4h',hours:4},{id:'custom',label:'完整個人備註不可省略',short:'備註',tone:'personal'}]:[]});
  const m=c.share.buildModel(2026,9);assert.equal(m.ownHours,8);assert.equal(m.days[5].parts.length,4);
  assert.equal(m.days[4].parts[0].label,'教師節（補假）');assert.equal(m.days[5].parts[2].label,'完整個人備註不可省略');assert.equal(m.days[5].parts[3].label,'已調班');
  assert.doesNotMatch(JSON.stringify(m),/PRIVATE_REASON|COLLEAGUE_UID/);
});
test('unknown counts never become zero; unknown shifts do not become scheduled work',()=>{
  const c=env();c.calendarDayInfo=()=>({shift:null,leaveCount:null,events:[]});const m=c.share.buildModel(2026,9);
  assert.equal(m.counts.unknown,30);assert.equal(m.counts.早,0);assert.equal(m.days[0].leaveCount,null);
});
test('Indonesian export uses its own unit scope, labels and weekdays',()=>{
  const c=env('id');c.S.unit='__all';const m=c.share.buildModel(2026,9);assert.equal(m.zh,false);assert.equal(m.language,'id');assert.equal(m.unit,'Semua unit');assert.equal(m.weekdays[0],'Min');assert.equal(m.days[9].parts[0].label,'Shift diubah');
});
test('word wrapping preserves whole words when possible and safely breaks overlong strings',()=>{
  const c=env(),context={measureText:s=>({width:Array.from(s).length*10})};
  assert.deepEqual(Array.from(c.share.textLines(context,'Cuti tahunan lengkap',100)),['Cuti','tahunan','lengkap']);
  const original='這是一段完整的長備註ABCDEFGHIJKLMN';assert.equal(c.share.textLines(context,original,50).join(''),original);
  assert.ok(c.share.textLines(context,original,50).every(s=>context.measureText(s).width<=50));
});
