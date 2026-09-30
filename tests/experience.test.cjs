'use strict';
process.env.TZ='Asia/Taipei';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../schedule-experience.js'),'utf8');
function env(){
 let stamp=Date.parse('2026-09-30T06:00:00+08:00');
 class Clock extends Date{constructor(...args){super(...(args.length?args:[stamp]))}static now(){return stamp}}
 const c={Date:Clock,Math,Number,String,Array,Object,Set,Map,lang:'zh',fbUser:{uid:'me'},roster:{},leaves:{},wxData:null,TY:2026,TM:9,TD:30,NOW:new Clock(),TR:new Clock(),S:{step:'cal',yr:2026,mo:9},
  window:{addEventListener(){}},document:{hidden:false,querySelector:()=>null,addEventListener:(type,fn)=>{c.visibility=fn}},setInterval:fn=>{c.clockTick=fn},render:()=>c.renders++,renders:0,loadLeaves:()=>c.loads++,loadAdminEv:()=>c.loads++,loads:0,
  ek:(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-'),
  getLT:id=>({sick:{name:'病假',nameId:'Cuti sakit'},annual:{name:'特休',nameId:'Cuti tahunan'},companyAnnual:{name:'特休',nameId:'Cuti Tahunan'}}[id]),
  leaveHoursDetail:l=>({regularHours:l.hours||0,overtimeHours:l.overtimeHours||0}),_popSourceAt:(d,i)=>d.hPopSource?.[i]||'none'};
 c.gs=(y,m,d)=>c.roster[c.ek(y,m,d)]||'休';c.myLeave=k=>(c.leaves[k]||[]).filter(l=>l.uid===c.fbUser?.uid);
 c.getShiftWorkRule=(y,m,d)=>{const shift=c.gs(y,m,d);return {shift,isWork:shift!=='休',shiftHours:shift==='休'?0:12,startMinute:shift==='晚'?1200:480,regularMinutes:480,overtimeMinutes:240}};
 c.setNow=value=>{stamp=Date.parse(value)};vm.createContext(c);vm.runInContext(source,c);return c;
}
test('an overnight shift belongs to yesterday, even when today is a roster rest day',()=>{
 const c=env();c.roster['2026-09-29']='晚';c.roster['2026-10-01']='早';
 const x=c.experienceShiftTimeline();assert.equal(x.row.key,'2026-09-29');assert.equal(x.previous,true);assert.equal(x.phase,'running');assert.equal(x.remaining,120);assert.equal(x.stage,'overtime');assert.ok(Math.abs(x.progress-100*10/12)<1e-9);assert.equal(x.next.key,'2026-10-01');
 c.setNow('2026-09-30T08:00:00+08:00');assert.equal(c.experienceShiftTimeline().phase,'off');assert.equal(c.experienceShiftTimeline().row,null);
});
test('a night shift later today is not treated as an already finished shift before sunrise',()=>{
 const c=env();c.roster['2026-09-30']='晚';const x=c.experienceShiftTimeline();assert.equal(x.phase,'upcoming');assert.equal(x.remaining,840);assert.equal(x.progress,0);assert.equal(x.previous,false);
});
test('8-hour midnight shifts start on their own date and end at 08:00',()=>{
 const c=env();c.getShiftWorkRule=(y,m,d)=>({shift:'晚',isWork:true,shiftHours:8,startMinute:0,regularMinutes:480,overtimeMinutes:0});
 const x=c.experienceShiftTimeline();assert.equal(x.row.key,'2026-09-30');assert.equal(x.remaining,120);assert.equal(x.stage,'regular');assert.equal(x.progress,75);
});
test('roster rest periods cross months and years without assuming weekends or public holidays are days off',()=>{
 const c=env();c.gs=(y,m,d)=>['2026-12-31','2027-01-01'].includes(c.ek(y,m,d))?'休':'早';
 const x=c.experienceRestRun(2026,12,30);assert.equal(x.start,'2026-12-31');assert.equal(x.end,'2027-01-01');assert.equal(x.count,2);assert.equal(x.offset,1);assert.equal(c.experienceDateRange(x.start,x.end),'12/31 – 2027/1/1');
 c.gs=()=>null;assert.equal(c.experienceRestRun(2026,9,30),null);
});
test('own leave badges aggregate by type and exclude colleagues and their private reasons',()=>{
 const c=env();c.leaves['2026-09-30']=[{uid:'me',leaveType:'sick',hours:2},{uid:'me',leaveType:'sick',hours:4,overtimeHours:2},{uid:'other',leaveType:'annual',hours:8,reason:'PRIVATE'}];
 const x=c.experienceOwnLeaveEvents('2026-09-30');assert.equal(x.length,2);assert.equal(x[0].label,'本人 病假 6h');assert.equal(x[1].label,'本人 未加班 2h');assert.equal(JSON.stringify(x).includes('PRIVATE'),false);
 c.lang='id';assert.equal(c.experienceOwnLeaveEvents('2026-09-30')[0].label,'Saya · Cuti sakit 6h');c.fbUser=null;assert.equal(c.experienceOwnLeaveEvents('2026-09-30').length,0);
});
test('company-defined annual leave aliases retain their annual identity and unknown types remain explicit',()=>{
 const c=env();c.leaves.day=[{uid:'me',leaveType:'companyAnnual',hours:8},{uid:'me',leaveType:'unknownType',hours:1}];
 const x=c.experienceOwnLeaveEvents('day');assert.equal(x[0].annual,true);assert.equal(x[0].short,'特休 8h');assert.equal(x[1].short,'unknownType 1h');
});
test('commute forecasts match the requested hour exactly and preserve missing values as unknown',()=>{
 const c=env();c.wxData={hTime:['2026-09-30T19:00','2026-10-01T08:00'],hTemp:[null,0],hPrec:[null,0],hWind:[null,0],hGust:[null,0],hCode:[null,0],hPopSource:['none','open-meteo']};
 const a=c.experienceWeatherAt(new Date('2026-09-30T19:30:00+08:00'));assert.equal(a.temp,null);assert.equal(a.pop,null);assert.equal(a.wind,null);
 const b=c.experienceWeatherAt(new Date('2026-10-01T08:00:00+08:00'));assert.equal(b.temp,0);assert.equal(b.pop,0);assert.equal(b.source,'open-meteo');
 assert.equal(c.experienceWeatherAt(new Date('2026-10-01T09:00:00+08:00')),null);
});
test('the live date rolls over while the current month follows it and historical browsing stays put',()=>{
 const c=env();c.setNow('2026-09-30T23:59:00+08:00');c.installExperienceClock();c.setNow('2026-10-01T00:00:00+08:00');c.clockTick();assert.equal(c.TD,1);assert.equal(c.TM,10);assert.equal(c.S.mo,10);assert.equal(c.loads,2);
 c.S.yr=2025;c.S.mo=7;c.setNow('2026-11-01T00:00:00+08:00');c.visibility();assert.equal(c.S.mo,7);assert.equal(c.S.yr,2025);assert.equal(c.TM,11);
 const previous=c.renders;c.document.hidden=true;c.setNow('2026-11-01T00:01:00+08:00');c.clockTick();assert.equal(c.renders,previous);
});
test('midnight does not close or reset an unfinished date form',()=>{
 const c=env();c.document.querySelector=()=>({});c.installExperienceClock();c.setNow('2026-10-01T00:00:00+08:00');c.clockTick();assert.equal(c.renders,0);assert.equal(c.TM,10);
});

test('date controls reject invalid calendar dates and navigate across months and years',()=>{
 const c=env();assert.equal(c.experienceChooseDay('2026-02-30'),false);assert.equal(c.experienceChooseDay('2026-2-03'),false);assert.equal(c.experienceChooseDay('2026-12-31'),true);
 c.experienceMoveDay(1);assert.equal(c.S.modal.y,2027);assert.equal(c.S.modal.m,1);assert.equal(c.S.modal.d,1);assert.equal(c.S.mo,1);assert.equal(c.loads,4);
 c.experienceMoveDay(-1);assert.equal(c.S.modal.y,2026);assert.equal(c.S.modal.m,12);assert.equal(c.S.modal.d,31);assert.equal(c.renders,3);
});
