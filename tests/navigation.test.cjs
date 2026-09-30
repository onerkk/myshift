'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../navigation-ui.js'),'utf8');
function env(tab='today',search=''){
  const events={},store=new Map(),root={inert:false},dom=new Map([['app',root],['mr',root]]);
  const c={Date,Math,Array,Object,String,location:{search},lang:'zh',fbAuthReady:true,_cloudLoading:false,
    UI_TAB:tab,UI_CAL_VIEW:'agenda',UI_CAL_FILTER:'mine',S:{step:'cal',yr:2026,mo:9,modal:null,statsYr:2026},PAY_VIEW:{y:2026,m:8},
    showUserPrefs:false,showAdmin:false,wxDetailShow:false,wxDetailDay:0,tideDetailShow:false,tideDetailDay:0,_wxSearchVersion:0,
    document:{body:{},activeElement:null,getElementById:id=>dom.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>{events[name]=fn}},
    window:{scrollY:715,scrollTo(){},addEventListener:(name,fn)=>{events[name]=fn}},
    localStorage:{setItem:(k,v)=>store.set(k,v)},loadLeaves:()=>c.loads++,loadAdminEv:()=>c.loads++,loads:0,
    _captureReplaceState:()=>({fields:[{id:'draft',value:'PRIVATE DRAFT'}]}),_restoreReplaceState(){},
    esc:s=>String(s),uiIcon:()=>'<svg></svg>',isAdmin:()=>true};
  const historyEntries=[];let historyCursor=-1;
  c.history={get state(){return historyEntries[historyCursor]||null},get length(){return historyEntries.length},
    replaceState(state){if(historyCursor<0)historyCursor=0;historyEntries[historyCursor]=state},
    pushState(state){historyEntries.splice(historyCursor+1);historyEntries.push(state);historyCursor++},
    back(){if(historyCursor>0){historyCursor--;events.popstate({state:this.state})}},
    forward(){if(historyCursor<historyEntries.length-1){historyCursor++;events.popstate({state:this.state})}}};
  c.render=()=>c.nav.sync();c.openWxLocation=()=>{dom.set('wx-location-dialog',{remove:()=>dom.delete('wx-location-dialog')});c.render()};
  c.entries=historyEntries;c.store=store;vm.createContext(c);vm.runInContext(source+'\nthis.nav=MyShiftNavigation;',c);c.nav.sync();
  c.goto=next=>{c.nav.beforeChange();c.UI_TAB=next;c.render()};
  return c;
}
test('saved landing pages have a real Today fallback and repeated data renders never add history',()=>{
  const c=env('calendar');assert.equal(c.history.length,2);for(let i=0;i<30;i++)c.nav.sync();assert.equal(c.history.length,2);
  c.nav.back();assert.equal(c.UI_TAB,'today');assert.equal(c.store.get('myshift_ui_tab'),'today');
});
test('back and forward restore the calendar month, agenda filter and salary period independently',()=>{
  const c=env();c.goto('calendar');c.S.yr=2025;c.S.mo=12;c.nav.sync();c.goto('pay');c.PAY_VIEW.y=2027;c.PAY_VIEW.m=1;c.nav.sync();
  c.nav.back();assert.equal(c.UI_TAB,'calendar');assert.equal(c.S.yr,2025);assert.equal(c.S.mo,12);assert.equal(c.UI_CAL_FILTER,'mine');assert.equal(c.PAY_VIEW.m,8);
  c.history.forward();assert.equal(c.UI_TAB,'pay');assert.equal(c.PAY_VIEW.y,2027);assert.equal(c.PAY_VIEW.m,1);
});
test('native back dismisses the open date before leaving the originating page',()=>{
  const c=env('calendar');c.nav.beforeChange();c.S.modal={y:2027,m:1,d:1};c.S.yr=2027;c.S.mo=1;c.render();
  c.history.back();assert.equal(c.S.modal,null);assert.equal(c.UI_TAB,'calendar');assert.equal(c.S.yr,2026);assert.equal(c.S.mo,9);
  assert.equal(c.loads,2);c.history.back();assert.equal(c.UI_TAB,'today');
});
test('sheet close actions consume the existing entry, so back never reopens a just-closed sheet',()=>{
  const c=env();c.goto('pay');c.nav.beforeChange();c.S.showSal=true;c.render();const n=c.history.length;
  c.S.showSal=false;c.render();assert.equal(c.UI_TAB,'pay');assert.equal(c.S.showSal,false);assert.equal(c.history.length,n);
  c.nav.back();assert.equal(c.UI_TAB,'today');assert.equal(c.S.showSal,false);
});
test('moving among dates or hourly tabs replaces view context without creating a history entry each time',()=>{
  const c=env();c.S.modal={y:2026,m:9,d:30};c.render();const n=c.history.length;
  for(let d=1;d<=4;d++){c.S.modal={y:2026,m:10,d};c.S.mo=10;c.render()}assert.equal(c.history.length,n);
  c.nav.back();assert.equal(c.S.modal,null);assert.equal(c.S.mo,9);
});
test('location selection returns to its underlying settings sheet, then to its original main page',()=>{
  const c=env('more');c.showUserPrefs=true;c.render();c.openWxLocation();
  c.nav.back();assert.equal(c.document.getElementById('wx-location-dialog'),null);assert.equal(c.showUserPrefs,true);
  c.nav.back();assert.equal(c.showUserPrefs,false);assert.equal(c.UI_TAB,'more');
});
test('all overlay families support native back without clearing business data',()=>{
  for(const flag of ['showH','showStats','showSal','showLeavesOv']){const c=env('more');c.S[flag]=true;c.S.unit='原本單位';c.render();c.history.back();assert.equal(c.S[flag],false);assert.equal(c.S.unit,'原本單位');assert.equal(c.UI_TAB,'more')}
  for(const flag of ['showUserPrefs','showAdmin','wxDetailShow','tideDetailShow']){const c=env('weather');c[flag]=true;c.render();c.history.back();assert.equal(c[flag],false);assert.equal(c.UI_TAB,'weather')}
});
test('history payload contains IDs only; dates, units, field values and drafts remain private in memory',()=>{
  const c=env('calendar');c.S.unit='PRIVATE UNIT';c.S.modal={y:2026,m:9,d:30};c.render();c.nav.beforeChange();c.showUserPrefs=true;c.S.modal=null;c.render();
  const json=JSON.stringify(c.entries);assert.doesNotMatch(json,/PRIVATE|2026|draft|salary|calendar|unit/);assert.match(json,/myshiftNavigation/);
});
test('return controls describe the previous destination in both languages',()=>{
  const c=env('calendar');c.S.modal={y:2026,m:9,d:30};c.render();assert.match(c.nav.bar(true),/返回班表/);assert.match(c.nav.decorate('<div class="modal-sheet help-sheet">content<\/div>'),/sheet-returnbar/);
  c.lang='id';assert.match(c.nav.bar(true),/Kembali ke Jadwal/);assert.match(c.nav.pageBar(),/page-returnbar/);
});
test('new navigation after back discards stale forward entries, and unrelated browser states stay untouched',()=>{
  const c=env();c.goto('calendar');c.goto('pay');c.history.back();c.goto('weather');assert.equal(c.history.length,3);c.history.forward();assert.equal(c.UI_TAB,'weather');
});
test('widget mode preserves its standalone display and adds no navigation entries',()=>{
  const c=env('calendar','?w=1');assert.equal(c.history.length,0);
});
test('returning to an entry owned by a previous login never restores that account draft or period',()=>{
  const c=env('calendar');c.fbUser={uid:'first'};c.goto('pay');c.PAY_VIEW.m=3;c.nav.sync();c.goto('more');
  c.fbUser={uid:'second'};c.PAY_VIEW.m=9;c.nav.back();assert.equal(c.UI_TAB,'today');assert.equal(c.PAY_VIEW.m,9);assert.equal(c.S.showSal,false);
});
