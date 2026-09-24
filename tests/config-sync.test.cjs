'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Sync=require('../config-sync.js');
function fixture(timeoutMs=100){
  const listeners=[],states=[],data=[];
  const ref={onSnapshot(options,next,error){const listener={options,next,error,stopped:false};listeners.push(listener);return()=>{listener.stopped=true;};}};
  const sync=Sync.create({ref,timeoutMs,onData:v=>data.push(v),onState:v=>states.push(v)});
  return{sync,listeners,states,data,emit(value,metadata={},index=listeners.length-1){listeners[index].next({exists:value!==null,data:()=>value,metadata});}};
}
test('signed-out page receives the same live list and subsequent backend deletions, including an empty list',async()=>{
  const f=fixture(),first=f.sync.start();
  assert.equal(f.sync.getState().phase,'loading');assert.equal(f.listeners[0].options.includeMetadataChanges,true);
  f.emit({units:['研磨股C班','軋鋼廠']});assert.equal(await first,true);
  f.emit({units:['研磨股C班']});f.emit({units:[]});
  assert.deepEqual(f.data.map(v=>v.units),[['研磨股C班','軋鋼廠'],['研磨股C班'],[]]);
  assert.equal(f.sync.getState().phase,'ready');f.sync.stop();
});
test('cached absence never erases data before the server answers; confirmed missing config clears it',async()=>{
  const f=fixture(),first=f.sync.start();f.emit(null,{fromCache:true});
  assert.deepEqual(f.data,[]);assert.equal(f.sync.getState().phase,'loading');
  f.emit({units:['A']},{fromCache:true});await first;assert.equal(f.sync.getState().phase,'cached');
  f.emit(null,{fromCache:false});assert.deepEqual(f.data.at(-1),{});assert.equal(f.sync.getState().phase,'missing');f.sync.stop();
});
test('permission failure clears stale choices and a post-login restart rejects late callbacks from the old listener',async()=>{
  const f=fixture(),first=f.sync.start();f.emit({units:['A']});await first;
  f.listeners[0].error({code:'permission-denied'});assert.equal(f.sync.getState().hasData,false);assert.deepEqual(f.data.at(-1),{});
  const retry=f.sync.start(true);assert.equal(f.listeners[0].stopped,true);
  f.emit({units:['stale']},{},0);assert.deepEqual(f.data.at(-1),{});
  f.emit({units:['B']});assert.equal(await retry,true);assert.deepEqual(f.data.at(-1).units,['B']);f.sync.stop();
});
test('offline startup has a bounded wait and can recover without a page reload',async()=>{
  const f=fixture(8);assert.equal(await f.sync.start(),false);assert.equal(f.sync.getState().phase,'error');
  f.emit({units:['recovered']});assert.equal(f.sync.getState().phase,'ready');assert.equal(f.sync.getState().hasData,true);f.sync.stop();
});
test('metadata-only updates change freshness without repeatedly applying settings; start is single-flight',async()=>{
  const f=fixture(),first=f.sync.start();assert.equal(f.sync.start(),first);assert.equal(f.listeners.length,1);
  f.emit({units:['A']},{fromCache:true});await first;
  f.emit({units:['A']},{fromCache:false,hasPendingWrites:true});assert.equal(f.sync.getState().phase,'cached');
  f.emit({units:['A']},{fromCache:false});assert.equal(f.sync.getState().phase,'ready');assert.equal(f.data.length,1);f.sync.stop();
});
function app(){
  const s=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  const c={AppConfigSync:Sync,APP_CFG:{units:['old-default'],leaveTypes:[],wxAlerts:{},visualFx:{}},appConfigState:{phase:'ready',hasData:true},S:{unit:'removed',lockedUnit:''},lang:'zh',fbUser:null,saves:0,alerts:[],
    normalizePayrollLeaveTypes(){},normalizeWxAlertConfig(){},rebuildR(){},applyVisualFxSetting(){},render(){},loadLeaves(){},isAdmin:()=>false,
    esc:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])};
  c.getUnits=()=>c.APP_CFG.units;c.sv=()=>c.saves++;c.alert=x=>c.alerts.push(x);vm.createContext(c);
  vm.runInContext(s.slice(s.indexOf('function applyAppConfig('),s.indexOf('// 全域 FX 開關')),c);return c;
}
test('production unit application honours empty backend data without silently moving or saving an employee',()=>{
  const c=app();c.applyAppConfig({units:['研磨股C班','軋鋼廠']});assert.equal(c.S.unit,'removed');assert.equal(c.saves,0);
  assert.match(c.unitConfigStatusHtml(),/已不在後台清單/);assert.equal(c.changeSelectedUnit('old-default'),false);assert.equal(c.saves,0);
  assert.equal(c.changeSelectedUnit('研磨股C班'),true);assert.equal(c.S.unit,'研磨股C班');assert.equal(c.saves,1);
  c.applyAppConfig({units:[]});assert.equal(c.getUnits().length,0);assert.equal(c.unitConfigAvailable(),false);assert.match(c.unitConfigStatusHtml(),/後台尚未設定單位/);
});
test('unit lock and admin-only all-units choice remain enforced during configuration refreshes',()=>{
  const c=app();c.applyAppConfig({units:['A','B']});c.S.unit='A';c.S.lockedUnit='A';
  assert.equal(c.changeSelectedUnit('B'),false);assert.equal(c.S.unit,'A');assert.equal(c.saves,0);
  c.S.lockedUnit='';assert.equal(c.changeSelectedUnit('__all'),false);assert.equal(c.saves,0);
  c.isAdmin=()=>true;assert.equal(c.changeSelectedUnit('__all'),true);assert.equal(c.S.unit,'__all');
});
