'use strict';
process.env.TZ='Asia/Taipei';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const section=app.slice(app.indexOf('let LEAVES_OV_DATA='),app.indexOf('\nlet adminEvCache='));
const uiIcon=app.slice(app.indexOf('function uiIcon('),app.indexOf('\nfunction uiShiftClass'));
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
function env(){
 const calls=[],queries=[];
 class Clock extends Date{constructor(...a){super(...(a.length?a:['2026-10-12T16:30:00Z']))}}
 const c={Date:Clock,Set,Promise,console:{log(){}},setTimeout,lang:'zh',allowed:true,isAdmin:()=>c.allowed,S:{showLeavesOv:true},render:()=>calls.push('render'),
  esc:escape,ek:(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-'),getUnits:()=>['測試單位'],getLeaveTypes:()=>[{id:'annual',name:'特休',nameId:'Cuti',color:'#111111'}],
  t:k=>k==='done'?'完成':k,isRegularLeave:l=>l.hours>0,leaveRecordLabel:l=>'特休 '+l.hours+'h',formatLeaveRange:()=> '08:00–16:00',document:{getElementById:()=>null},
  fbDb:{collection:()=>({where:(field,op,ym)=>({get(){const d=deferred();queries.push({ym,...d});return d.promise}})})}};
 vm.createContext(c);vm.runInContext(uiIcon+'\n'+section,c);
 const run=s=>vm.runInContext(s,c);run("leavesOvYM='2026-09'");
 return{c,queries,calls,run};
}
function snap(records){return{forEach:f=>records.forEach((r,i)=>f({id:'doc-'+i,data:()=>r}))}}
test('fast month changes ignore stale responses and keep the current loading state',async()=>{
 const e=env(),a=e.c.loadLeavesOvData('2026-09');e.run("leavesOvYM='2026-10'");const b=e.c.loadLeavesOvData('2026-10');
 e.queries[0].resolve(snap([{date:'2026-09-01',hours:8}]));await a;
 assert.equal(e.run('leavesOvLoading'),true);assert.equal(e.run('LEAVES_OV_DATA.length'),0);
 e.queries[1].resolve(snap([{date:'2026-10-18',hours:8},{date:'2026-10-01',hours:8},{uid:'admin_synthetic',date:'2026-10-02'}]));await b;
 assert.equal(e.run('leavesOvLoading'),false);assert.equal(e.run('leavesOvError'),false);
 assert.equal(e.run('LEAVES_OV_DATA.map(l=>l.date).join(",")'),'2026-10-01,2026-10-18');
});
test('failed loading offers a retry, exposes unknown totals, and does not render a false empty month',async()=>{
 const e=env(),p=e.c.loadLeavesOvData('2026-09');e.queries[0].reject(Error('offline'));await p;
 const html=e.c.rLeavesOv();assert.equal(e.run('leavesOvError'),true);
 assert.match(html,/role="alert"/);assert.match(html,/重新載入/);assert.doesNotMatch(html,/本月尚無請假紀錄/);assert.equal((html.match(/<strong>—<\/strong>/g)||[]).length,3);
 const container={innerHTML:'waiting'};e.c._renderLeavesOvList(container);assert.equal(container.innerHTML,'waiting');
});
test('revoked admin access cannot fetch or display leave details',async()=>{
 const e=env();e.c.allowed=false;assert.equal(e.c.rLeavesOv(),'');assert.equal(e.c.loadLeavesOvData('2026-09'),undefined);assert.equal(e.queries.length,0);
 e.c.allowed=true;const p=e.c.loadLeavesOvData('2026-09');e.c.allowed=false;e.queries[0].resolve(snap([{name:'private'}]));await p;assert.equal(e.run('LEAVES_OV_DATA.length'),0);
});
test('month steps cross the year and reset stale loading totals without clearing filters',async()=>{
 const e=env();e.run("leavesOvYM='2026-12';leavesOvUnitF='測試單位';leavesOvSearch='search'");e.c.changeLeavesOvMonth(1);
 assert.equal(e.run('leavesOvYM'),'2027-01');assert.equal(e.queries[0].ym,'2027-01');assert.equal(e.run('leavesOvSearch'),'search');assert.equal(e.run('leavesOvUnitF'),'測試單位');
 assert.match(e.c.rLeavesOv(),/aria-busy="true"/);assert.equal((e.c.rLeavesOv().match(/<strong>—<\/strong>/g)||[]).length,3);
});
test('leave rows use the local day after midnight, retain long text, and escape names and reasons',()=>{
 const e=env();e.run("LEAVES_OV_DATA=[{date:'2026-10-13',uid:'a',name:'<img src=x>',unit:'測試單位',leaveType:'annual',hours:8,reason:'<script>alert(1)</script>'}]");
 const container={innerHTML:''};e.c._renderLeavesOvList(container);assert.match(container.innerHTML,/is-today/);assert.match(container.innerHTML,/&lt;img/);assert.match(container.innerHTML,/&lt;script/);assert.doesNotMatch(container.innerHTML,/<img|<script/);
 e.run("leavesOvSearch='no matches'");e.c._renderLeavesOvList(container);assert.match(container.innerHTML,/沒有符合條件/);assert.doesNotMatch(container.innerHTML,/leave-record-name/);
});
test('admin dashboard also discards late month responses and exposes load failure',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../admin/admin.js'),'utf8'),queries=[];
 const c={leavesRequest:0,leavesError:false,leavesLoading:false,LEAVES_DATA:[],leavesYM:'2026-09',activeTab:'leaves',isAdmin:()=>true,render(){},toast(){},
 fbDb:{collection:()=>({where:()=>({get(){const d=deferred();queries.push(d);return d.promise}})})}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('async function loadLeavesData('),source.indexOf('\nfunction changeLeavesMonth')),c);
 const a=c.loadLeavesData('2026-09');c.leavesYM='2026-10';const b=c.loadLeavesData('2026-10');queries[0].resolve(snap([{date:'2026-09-01'}]));await a;assert.equal(c.leavesLoading,true);assert.equal(c.LEAVES_DATA.length,0);
 queries[1].reject(Error('offline'));await b;assert.equal(c.leavesError,true);assert.equal(c.leavesLoading,false);assert.equal(c.LEAVES_DATA.length,0);
});
test('unit confirmation reads its own dialog field and keeps the unit lock enforced',()=>{
 const calls=[],selected=[],alerts=[],c={S:{lockedUnit:''},lang:'zh',alert:m=>alerts.push(m),render(){},sv(){},
 document:{getElementById:id=>{calls.push(id);return{value:id==='unitHelpChg'?'dialog unit':'background unit'}}},changeSelectedUnit:v=>{selected.push(v);return true}};
 vm.createContext(c);const start=app.indexOf('function handle('),end=app.indexOf('\nlet wxData=',start);vm.runInContext(app.slice(start,end),c);
 c.handle({currentTarget:{dataset:{a:'chUnit',target:'unitHelpChg'}}});assert.equal(calls[0],'unitHelpChg');assert.equal(selected[0],'dialog unit');
 c.S.lockedUnit='locked';c.handle({currentTarget:{dataset:{a:'chUnit',target:'unitHelpChg'}}});assert.equal(selected.length,1);assert.equal(alerts.length,1);
});
test('admin UI updates retire only admin caches and preserve the main app and notification state',async()=>{
 const events={},deleted=[],names=['myshift-v328-ui','myshift-admin-v6-unified-leave','myshift-admin-v328-ui','wx-notify-state-v2','unrelated'];
 const c={self:{addEventListener:(name,fn)=>events[name]=fn,clients:{claim:async()=>{}}},caches:{keys:async()=>names,delete:async name=>deleted.push(name)}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../admin/sw.js'),'utf8'),c);
 let result;events.activate({waitUntil:p=>result=p});await result;assert.deepEqual(deleted,['myshift-admin-v6-unified-leave']);
});
