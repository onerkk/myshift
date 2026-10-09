'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const swSource=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const slice=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,start);return source.slice(a,b);
};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};

function authEnv(){
  const reads=[],writes=[],renders=[],documents=[],config=deferred(),reference=deferred();
  const c={Promise,console:{log(){}},setTimeout,clearTimeout,Date,
    fbUser:null,fbAuthReady:false,_authInitUid:'',_authInitRequest:0,_cloudLoadRequest:0,_cloudLoading:false,_loading:false,
    _fsQueue:[],_fsRunning:false,payrollLeaveRequest:0,leavesCache:{},payrollLeaveState:{},payrollReferenceRequest:0,payrollReferenceState:'idle',
    SAL:{},SAL_DEFAULT:{},S:{step:'type',rt:'4on2off',pos:null,unit:''},R:{'4on2off':{}},
    EVS:{},AL:{},ALD:{},TYD:{},OTD:{},NOTES:{},SHIFT_OV:{},lang:'zh',
    localStorage:{setItem(){},removeItem(){}},sCk(){},cloudLoadSal(){},_handleFatalFsError(){throw Error('fatal')},
    loads:{config:0,leaves:0,events:0,reference:0,locate:0},
    render(){renders.push({loading:c._cloudLoading,pos:c.S.pos})},
    loadAppConfig(){c.loads.config++;return config.promise},
    _autoLocateOnLogin(){c.loads.locate++},
    loadLeaves(){c.loads.leaves++;return Promise.resolve()},
    loadAdminEv(){c.loads.events++;return Promise.resolve()},
    loadPayrollReference(){c.loads.reference++;return reference.promise},
    firebase:{firestore:{FieldValue:{serverTimestamp:()=>0}}},
    fbDb:{collection:name=>({doc:uid=>({
      get(){reads.push({name,uid});const d=deferred();documents.push(d);return d.promise},
      set(payload){writes.push({name,uid,payload});return new Promise(()=>{})}
    })})}
  };
  vm.createContext(c);
  vm.runInContext(slice('function fsEnqueue(', 'let _fatalShown='),c);
  vm.runInContext(slice('function _doAuthInit(', '// 登入後自動定位'),c);
  vm.runInContext(slice('function _acceptAuthUser(', 'fbAuth.onAuthStateChanged'),c);
  vm.runInContext(slice('function cloudSave(', 'let fbLoginPending='),c);
  return{c,reads,writes,renders,documents,config,reference};
}
const user=uid=>({uid,displayName:'Synthetic test',email:'test@example.invalid'});
const snapshot=data=>({exists:!!data,data:()=>data});

test('pending login write, configuration and payroll do not delay the restored roster',async()=>{
  const e=authEnv();
  e.c.fsEnqueue(()=>e.c.fbDb.collection('users').doc('previous').set({lastLogin:0}),'previous-write');
  e.c._acceptAuthUser(user('A'));await flush();
  assert.equal(e.writes.length,1);assert.equal(e.reads.length,1);
  assert.equal(e.c._cloudLoading,true);assert.equal(e.c.loads.locate,1);
  e.documents[0].resolve(snapshot({rt:'4on2off',pos:3,unit:'A'}));await flush();
  assert.equal(e.c._cloudLoading,false);assert.equal(e.c.S.pos,3);
  assert.equal(e.c.loads.leaves,1);assert.equal(e.c.loads.events,1);assert.equal(e.c.loads.reference,1);
  assert.ok(e.renders.some(r=>!r.loading&&r.pos===3));
  // Neither unresolved background promise nor the stalled write was released.
  assert.equal(e.c._fsRunning,true);
});

test('popup, redirect and auth callbacks for the same uid initialize and touch once',async()=>{
  const e=authEnv();e.c._acceptAuthUser(user('A'));e.c._acceptAuthUser(user('A'));e.c._acceptAuthUser(user('A'));await flush();
  assert.equal(e.reads.length,1);assert.equal(e.writes.length,0);assert.equal(e.c.loads.locate,1);
  e.documents[0].resolve(snapshot({rt:'4on2off',pos:2}));await flush();
  e.c._acceptAuthUser(user('A'));await flush();assert.equal(e.reads.length,1);assert.equal(e.c.loads.leaves,1);assert.equal(e.writes.length,1);
});

test('a late document from a previous uid cannot replace the new user or clear its loading state',async()=>{
  const e=authEnv();e.c._acceptAuthUser(user('A'));await flush();
  e.c._acceptAuthUser(user('B'));await flush();assert.equal(e.reads[1].uid,'B');
  e.documents[0].resolve(snapshot({rt:'4on2off',pos:99,unit:'old'}));await flush();
  assert.equal(e.c.S.pos,null);assert.equal(e.c._loading,true);assert.equal(e.c._cloudLoading,true);
  assert.equal(e.c.loads.leaves,0);
  e.documents[1].resolve(snapshot({rt:'4on2off',pos:1,unit:'new'}));await flush();
  assert.equal(e.c.S.pos,1);assert.equal(e.c._cloudLoading,false);assert.equal(e.c.loads.leaves,1);
});

test('sign-out invalidates a pending restore even if the same uid signs in again',async()=>{
  const e=authEnv();e.c._acceptAuthUser(user('A'));await flush();
  e.c._acceptAuthUser(null);e.c._acceptAuthUser(user('A'));await flush();
  e.documents[0].resolve(snapshot({rt:'4on2off',pos:99}));await flush();
  assert.equal(e.c.S.pos,null);assert.equal(e.c._cloudLoading,true);
  e.documents[1].resolve(snapshot({rt:'4on2off',pos:4}));await flush();
  assert.equal(e.c.S.pos,4);assert.equal(e.c._cloudLoading,false);
});

test('failed user read releases the gate and does not leave an unhandled rejection',async()=>{
  const e=authEnv();e.c._acceptAuthUser(user('A'));await flush();
  e.documents[0].reject(Error('offline'));await flush();
  assert.equal(e.c._cloudLoading,false);assert.equal(e.c._loading,false);
});

test('a locked custom rotation survives a user document arriving before public config',async()=>{
  const e=authEnv();e.c._acceptAuthUser(user('A'));await flush();
  e.documents[0].resolve(snapshot({lockedRt:'admin-custom',pos:4}));await flush();
  assert.equal(e.c.S.rt,'admin-custom');assert.equal(e.c.S.lockedRt,'admin-custom');assert.equal(e.c.S.pos,4);
  assert.equal(e.c.S.step,'cal');
});

test('queued roster saves retain their originating uid and data snapshot',async()=>{
  const e=authEnv(),jobs=[],saved=[];
  e.c.fsEnqueue=fn=>{jobs.push(fn);return Promise.resolve()};
  e.c.fbDb={collection:()=>({doc:uid=>({set:async payload=>saved.push({uid,payload})})})};
  e.c.fbUser=user('A');e.c.S.pos=1;e.c.EVS={'2026-10-09':['class']};e.c.cloudSave();
  e.c.fbUser=user('B');e.c.S.pos=6;e.c.EVS={};await jobs[0]();
  assert.equal(saved[0].uid,'A');assert.equal(saved[0].payload.pos,1);
  assert.equal(saved[0].payload.ev,'{"2026-10-09":["class"]}');
});

test('leave and announcement reads run independently while any serialized write is stalled',async()=>{
  const e=authEnv(),leave=deferred(),calls=[];e.c.fbUser=user('A');
  Object.assign(e.c,{S:{yr:2026,mo:10,unit:'A'},TY:2026,TM:10,PAY_VIEW:null,ADMIN_EV:['health','meeting'],adminEvRequest:0,adminEvCache:{},adminEvState:{months:[]},
    experienceMonthDates:()=>[{y:2026,m:10,d:1}],latestClosedSalaryMonth:()=>({y:2026,m:9}),
    ek:(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
    leaveNumber:Number,_syncAnnualToALD(){},
    fbDb:{collection:name=>({where:()=>({get(){calls.push(name);return name==='leaves'?leave.promise:Promise.resolve({forEach:f=>f({data:()=>({date:'2026-10-09',type:'health'})})})}})})}
  });
  vm.runInContext(slice('function loadLeaves(', 'function _syncAnnualToALD('),e.c);
  vm.runInContext(slice('function loadAdminEv(', 'function setAdminEv('),e.c);
  e.c.fsEnqueue(()=>new Promise(()=>{}),'stalled-write');
  const leaves=e.c.loadLeaves(),events=e.c.loadAdminEv();await flush();await events;
  assert.equal(calls.filter(x=>x==='leaves').length,2);assert.equal(calls.filter(x=>x==='adminEvents').length,1);
  assert.equal(e.c.adminEvCache['2026-10-09'][0],'health');assert.equal(e.c.payrollLeaveState.loading,true);
  leave.resolve({forEach(){}});await leaves;assert.equal(e.c.payrollLeaveState.ownHistoryLoaded,true);
});

function worker(){
  const events={},store=new Map(),network=[],writes=[],timers=[],deleted=[],lifecycle=[];
  const cacheName=swSource.match(/const CACHE_NAME = '([^']+)'/)[1];
  const stores=new Map([[cacheName,store]]);
  const c={URL,Response,Promise,Date,Math,console,Uint8Array,crypto:require('node:crypto').webcrypto,
    setTimeout(fn,ms){const timer={fn,ms,cancelled:false};timers.push(timer);return timer},clearTimeout(timer){timer.cancelled=true},
    self:{location:{origin:'https://test.invalid'},registration:{scope:'https://test.invalid/app/'},addEventListener:(k,f)=>events[k]=f,
      skipWaiting:async()=>lifecycle.push('skipWaiting'),clients:{claim:async()=>lifecycle.push('claim'),matchAll:async()=>[]}},
    caches:{keys:async()=>[...stores.keys()],delete:async name=>{deleted.push(name);return stores.delete(name)},open:async name=>{
      if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);
      return{match:async k=>entries.get(k)?.clone(),put:async(k,v)=>{writes.push(k);entries.set(k,v)}};
    }},
    fetch(request){const d=deferred();network.push({request,d});return d.promise}
  };
  vm.createContext(c);vm.runInContext(swSource,c);
  function request(url,mode='cors',method='GET'){
    let response;const tasks=[];
    events.fetch({request:{url,mode,method},respondWith:p=>response=p,waitUntil:p=>tasks.push(p)});
    return{response,tasks};
  }
  function dispatch(type){const tasks=[];events[type]({waitUntil:p=>tasks.push(p)});return Promise.all(tasks)}
  return{c,store,stores,network,writes,timers,request,dispatch,deleted,lifecycle};
}
const origin='https://test.invalid/app/';

test('warm versioned scripts, photographic images and recordings return without a fetch',async()=>{
  for(const asset of ['app.js?v=327-startup','vendor/firebase/10.12.0/firebase-auth-compat.js','immersive-ui.css?v=325-night-auto','images/fx/cloud/cloud-01.png','audio/nature/rain.mp3']){
    const e=worker();e.store.set(origin+asset,new Response('exact original bytes'));
    const r=e.request(origin+asset);assert.equal(await(await r.response).text(),'exact original bytes');
    await Promise.all(r.tasks);assert.equal(e.network.length,0);
  }
});

test('a new asset version fetches fresh code and never uses another version or HTML',async()=>{
  const e=worker();e.store.set(origin+'app.js?v=325-night-auto',new Response('old'));
  e.store.set(origin+'index.html',new Response('<html>shell</html>'));
  const r=e.request(origin+'app.js?v=326-login-fast');await flush();
  assert.equal(e.network.length,1);e.network[0].d.resolve(new Response('new'));assert.equal(await(await r.response).text(),'new');
  await Promise.all(r.tasks);assert.equal(await e.store.get(origin+'app.js?v=326-login-fast').text(),'new');
  assert.equal(await e.store.get(origin+'app.js?v=325-night-auto').text(),'old');
});

test('home navigation uses the installed complete release without a network request or fallback delay',async()=>{
  const e=worker();e.store.set(origin+'index.html',new Response('cached shell'));
  const r=e.request(origin+'?w=1','navigate');await flush();
  assert.equal(await(await r.response).text(),'cached shell');await Promise.all(r.tasks);
  assert.equal(e.network.length,0);assert.equal(e.timers.length,0);
  assert.ok(!e.writes.some(k=>k.includes('?w=')));
});

test('secondary pages still check the network, and a fast response cancels its fallback timer',async()=>{
  const e=worker();e.store.set(origin+'admin.html',new Response('cached'));
  const r=e.request(origin+'admin.html','navigate');await flush();e.network[0].d.resolve(new Response('fresh'));
  assert.equal(await(await r.response).text(),'fresh');await Promise.all(r.tasks);
  assert.equal(e.timers[0].cancelled,true);
});

test('offline navigation and server failures use cache while a missing script remains an error',async()=>{
  for(const result of ['offline','server']){
    const e=worker();e.store.set(origin+'admin.html',new Response('admin'));
    const r=e.request(origin+'admin.html','navigate');await flush();
    if(result==='offline')e.network[0].d.reject(Error('offline'));else e.network[0].d.resolve(new Response('error',{status:503}));
    assert.equal(await(await r.response).text(),'admin');await Promise.all(r.tasks);
  }
  const e=worker();e.store.set(origin+'index.html',new Response('shell'));
  const r=e.request(origin+'missing.js?v=326');await flush();e.network[0].d.reject(Error('offline'));
  assert.equal((await r.response).type,'error');await Promise.all(r.tasks);
});

test('secondary page slow responses use only their own cache and keep the late network write alive',async()=>{
  const e=worker();e.store.set(origin+'index.html',new Response('home'));e.store.set(origin+'admin.html',new Response('cached admin'));
  const r=e.request(origin+'admin.html','navigate');await flush();
  assert.equal(e.timers[0].ms,1500);e.timers[0].fn();assert.equal(await(await r.response).text(),'cached admin');
  e.network[0].d.resolve(new Response('fresh admin'));await Promise.all(r.tasks);
  assert.equal(await e.store.get(origin+'admin.html').text(),'fresh admin');
});

test('missing secondary pages never fall back to the home page',async()=>{
  const e=worker();e.store.set(origin+'index.html',new Response('home'));
  const r=e.request(origin+'admin.html','navigate');await flush();e.network[0].d.reject(Error('offline'));
  assert.equal((await r.response).type,'error');await Promise.all(r.tasks);
});

test('upgrade reuses exact cached effect images and recordings from the previous release',async()=>{
  for(const asset of ['images/fx/cloud/cloud-01.png','audio/nature/rain.mp3']){
    const e=worker();e.stores.set('myshift-v326-login-fast',new Map([[origin+asset,new Response('all original bytes')]]));
    const r=e.request(origin+asset);assert.equal(await(await r.response).text(),'all original bytes');await Promise.all(r.tasks);
    assert.equal(e.network.length,0);assert.equal(await e.store.get(origin+asset).text(),'all original bytes');
  }
});

const shellEntries=()=>JSON.parse(swSource.match(/const CORE_SHELL = (\[[\s\S]*?\]);/)[1]);
test('release integrity includes every stylesheet, effect module and local official login SDK',()=>{
  const assets=shellEntries();assert.equal(assets.length,24);
  for(const asset of assets){
    const bytes=fs.readFileSync(path.join(__dirname,'..',asset.path.split('?')[0]));
    assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.path);
  }
  const refs=[...html.matchAll(/(?:href|src)="\.\/([^"?]+(?:\?v=[^"]+)?)"/g)].map(m=>m[1]);
  assert.ok(refs.every(ref=>assets.some(a=>a.path===ref)));
});

test('a complete upgrade reuses verified styles and activates only after all required downloads finish',async()=>{
  const e=worker(),assets=shellEntries(),old=new Map([[origin+'styles.css?v=325-night-auto',new Response(fs.readFileSync(path.join(__dirname,'../styles.css')))]]);
  e.stores.set('myshift-v326-login-fast',old);const install=e.dispatch('install');
  await new Promise(r=>setImmediate(r));
  for(let n=0;e.network.length<assets.length-1&&n<100;n++)await new Promise(r=>setImmediate(r));
  assert.equal(e.network.length,assets.length-1);assert.deepEqual(e.lifecycle,[]);assert.deepEqual(e.deleted,[]);
  assert.equal(old.size,1);
  const last=e.network.at(-1);
  for(const item of e.network.slice(0,-1))item.d.resolve(new Response(fs.readFileSync(path.join(__dirname,'..',new URL(item.request).pathname.replace('/app/','')))));
  await new Promise(r=>setImmediate(r));assert.deepEqual(e.lifecycle,[]);
  last.d.resolve(new Response(fs.readFileSync(path.join(__dirname,'..',new URL(last.request).pathname.replace('/app/','')))));
  await install;assert.deepEqual(e.lifecycle,['skipWaiting']);assert.equal(e.store.size,25);assert.equal(old.size,1);
});

test('a missing or mismatched release cannot activate or remove the previous working cache',async()=>{
  const e=worker();e.stores.set('myshift-v326-login-fast',new Map([[origin+'index.html',new Response('working')]]));
  const install=e.dispatch('install');const rejected=assert.rejects(install,/Incomplete My Shift release/);
  for(let n=0;e.network.length<shellEntries().length&&n<100;n++)await new Promise(r=>setImmediate(r));
  e.network.forEach(item=>item.d.resolve(new Response('<html>partial deployment</html>')));
  await rejected;assert.deepEqual(e.lifecycle,[]);assert.deepEqual(e.deleted,[]);
  assert.equal(await e.stores.get('myshift-v326-login-fast').get(origin+'index.html').text(),'working');
});

test('activation preserves notification state, unrelated caches and the two recent release caches',async()=>{
  const e=worker();for(const name of ['unrelated','wx-notify-state-v2','myshift-v323','myshift-v325','myshift-v326'])e.stores.set(name,new Map());
  await e.dispatch('activate');assert.deepEqual(e.deleted,['myshift-v323']);assert.deepEqual(e.lifecycle,['claim']);
  for(const name of ['unrelated','wx-notify-state-v2','myshift-v325','myshift-v326'])assert.ok(e.stores.has(name));
});

test('unversioned code refreshes in background and SDK URLs are cached without intercepting APIs',async()=>{
  const e=worker();e.store.set(origin+'cloud-forecast.js',new Response('cached module'));
  const r=e.request(origin+'cloud-forecast.js');assert.equal(await(await r.response).text(),'cached module');
  e.network[0].d.resolve(new Response('refreshed module'));await Promise.all(r.tasks);
  assert.equal(await e.store.get(origin+'cloud-forecast.js').text(),'refreshed module');
  const sdk='https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js';
  e.store.set(sdk,new Response('SDK'));assert.equal(await(await e.request(sdk).response).text(),'SDK');
  const before=e.network.length;
  for(const url of ['https://firestore.googleapis.com/v1/projects/x','https://api.open-meteo.com/v1/forecast?latitude=1','https://www.gstatic.com/unrelated.js'])assert.equal(e.request(url).response,undefined);
  assert.equal(e.request(origin+'app.js','cors','POST').response,undefined);assert.equal(e.network.length,before);
});

function controller(initial){
  const events={},c={navigator:{serviceWorker:{controller:initial,register:async()=>({update(){},}) ,addEventListener:(k,f)=>events[k]=f}},
    syncAlertPrefsToServiceWorker(){},setInterval(){},location:{reload(){c.reloads++}},reloads:0};
  vm.createContext(c);vm.runInContext(slice("if('serviceWorker' in navigator){\n  let _swRefreshing=",'// Note: 舊版曾寫死'),c);
  return{c,events};
}
test('first worker claim does not reload the page; a later version replacement reloads exactly once',()=>{
  const e=controller(null);e.c.navigator.serviceWorker.controller={version:326};e.events.controllerchange();assert.equal(e.c.reloads,0);
  e.c.navigator.serviceWorker.controller={version:327};e.events.controllerchange();e.events.controllerchange();assert.equal(e.c.reloads,1);
});
test('an existing worker replacement still activates the release with one reload',()=>{
  const e=controller({version:325});e.c.navigator.serviceWorker.controller={version:326};e.events.controllerchange();assert.equal(e.c.reloads,1);
});

test('all effect and dependency scripts download in parallel with their original execution order',()=>{
  const scripts=[...html.matchAll(/<script\s+([^>]*src="([^"]+)"[^>]*)>/g)];
  assert.equal(scripts.length,13);scripts.forEach(s=>assert.match(s[1],/\bdefer\b/));
  assert.deepEqual(scripts.map(s=>s[2].split('/').at(-1).split('?')[0]),[
    'firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js','weather-data.js','payroll.js',
    'nature-effects.js','nature-audio.js','config-sync.js','schedule-experience.js','share-calendar.js','navigation-ui.js','app.js','ui-effects.js'
  ]);
  scripts.forEach(s=>assert.ok(html.indexOf(s[0])<html.indexOf('</head>')));
  assert.equal([...html.matchAll(/<link rel="stylesheet"/g)].length,6);
});

test('the full opening lasts 2.6 seconds from first paint without adding stylesheet delay again',()=>{
  for(const [elapsed,expected] of [[0,2600],[1600,1000],[4000,0]]){
    let delay,calls=0;const c={window:{myshiftShellStartedAt:0,addEventListener(){}},document:{getElementById:()=>({remove(){}})},
      performance:{now:()=>100+elapsed,getEntriesByType:()=>[{name:'first-paint',startTime:100}]},Math,setTimeout:(f,ms)=>{calls++;delay=ms;return 1}};
    vm.createContext(c);vm.runInContext(slice('let _openingTimer=', 'let _renderRAF='),c);c.finishOpeningPresentation();assert.equal(delay,expected);
    c.finishOpeningPresentation();assert.equal(calls,1);
  }
});

test('no unstyled application render or splash dismissal occurs before all full styles are loaded',()=>{
  const c={window:{myshiftStylesReady:false},_renderRAF:1};vm.createContext(c);
  vm.runInContext(slice('function _doRender(){','function rType(){'),c);c._doRender();assert.equal(c._renderRAF,null);
  assert.ok(html.indexOf('myshiftShellStartedAt=')<html.indexOf('<link rel="stylesheet"'));
  const links=[...html.matchAll(/<link rel="stylesheet"[^>]+>/g)];
  assert.equal(links.length,6);links.forEach(l=>{assert.match(l[0],/media="print"/);assert.match(l[0],/onload="myshiftStyleLoaded\(this\)"/)});
});
