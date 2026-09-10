'use strict';
// Run: node --test tests/*.test.cjs. Production adapters/loader/SW, with deterministic network failures.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const W=require('../weather-data.js');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const adapterSource=fs.readFileSync(path.join(__dirname,'../weather-data.js'),'utf8');
const swSource=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
const pos={lat:23.32,lon:120.2672,ts:Date.now()};
const hour=()=>Math.floor(Date.now()/3600000)*3600000;
function forecast(){
  const start=hour(),times=Array.from({length:24},(_,i)=>new Date(start+i*3600000).toISOString().slice(0,16));
  return {utc_offset_seconds:0,current:{time:times[0],temperature_2m:28,weather_code:2,wind_gusts_10m:18,precipitation:0},
    daily:{time:[times[0].slice(0,10)],weather_code:[2],temperature_2m_max:[31],temperature_2m_min:[24]},
    hourly:{time:times,temperature_2m:times.map(()=>28),weather_code:times.map(()=>2),precipitation_probability:times.map(()=>40),precipitation:times.map(()=>.1),wind_speed_10m:times.map(()=>10),wind_gusts_10m:times.map(()=>18),relative_humidity_2m:times.map(()=>65)}};
}
function met(){return {properties:{meta:{updated_at:new Date(hour()-3600000).toISOString()},timeseries:Array.from({length:36},(_,i)=>({
  time:new Date(hour()+i*3600000).toISOString(),data:{instant:{details:{air_temperature:28,relative_humidity:60,wind_speed:5}},
    next_6_hours:{summary:{symbol_code:'rain'},details:{precipitation_amount:6}}}}))}}}
function deferred(){let resolve,reject;const promise=new Promise((ok,no)=>{resolve=ok;reject=no});return {promise,resolve,reject}}
function adapterEnv(fetch){const c={Date,Math,Number,console,URL,URLSearchParams,AbortController,Response,setTimeout,clearTimeout,fetch};vm.createContext(c);vm.runInContext(adapterSource,c);return c.WeatherData}
function appEnv(){
  const values=new Map(),renders=[];
  const c={Date,Math,Number,String,Array,Object,Set,Map,Promise,console,URL,URLSearchParams,AbortController,Response,setTimeout,clearTimeout,
    WeatherData:{...W},lang:'zh',wxData:null,wxErr:false,typhoonData:null,earthquakeData:null,window:{},document:{hidden:false,getElementById:()=>null},
    navigator:{onLine:true,geolocation:{},permissions:{query:async()=>({state:'granted'})}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
    render(){renders.push(c.wxData)},loadCwaData(){},checkAndNotifyAlerts(){},studioIcon(){return ''},studioWeatherIcon(){return ''},uiIcon(){return ''},esc:x=>String(x),
    t:()=>['日','一','二','三','四','五','六'],uiPrecipChartHtml:()=>'',rainObsHtml:()=>'',tideHtml:()=>''};
  let calls=0;const pending=deferred();
  c.WeatherData.createClient=()=>({get(){calls++;return pending.promise}});
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('const WXI='),source.indexOf('// ═══════════════════════════════════════════════════════════════\n// CWA 資料載入')),c);
  vm.runInContext(source.slice(source.lastIndexOf('function _wxTimeLabel('),source.lastIndexOf('function uiTideCurveHtml(')),c);
  c.getGeoPosition=async()=>({...pos,ts:Date.now()});
  c._refreshWxExtras=()=>{};
  c.localStorage.setItem('_wxPos',JSON.stringify(pos));
  return {c,values,pending,renders,calls:()=>calls,run:code=>vm.runInContext(code,c)};
}

test('Open-Meteo preserves source time and zero coordinates, but rejects null values',()=>{
  const raw=forecast(),d=W.openMeteo(raw,{lat:0,lon:0});
  assert.equal(d.temp,28);assert.equal(d.sourceTime,hour());assert.equal(d.hPrec[0],40);assert.ok(W.validWeather(d));
  raw.current.temperature_2m=null;assert.throws(()=>W.openMeteo(raw,pos));
  assert.equal(W.validPosition({lat:null,lon:0}),false);
});
test('missing daily values and malformed hourly arrays cannot replace a valid forecast',()=>{
  const a=forecast();a.daily.temperature_2m_max=[];assert.throws(()=>W.openMeteo(a,pos));
  const b=forecast();b.hourly={};assert.throws(()=>W.openMeteo(b,pos));
});
test('an old source response is rejected instead of stamped as current',()=>{
  const a=forecast();a.current.time=new Date(hour()-3*3600000).toISOString().slice(0,16);
  assert.throws(()=>W.openMeteo(a,pos),e=>e.code==='stale');
});
test('Taiwan UTC offset is converted correctly even with a UTC device timezone',()=>{
  const a=forecast();a.utc_offset_seconds=28800;
  a.current.time=new Date(hour()+28800000).toISOString().slice(0,16);
  a.hourly.time=a.hourly.time.map(x=>new Date(Date.parse(x+'Z')+28800000).toISOString().slice(0,16));
  const b=W.openMeteo(a,pos);assert.equal(b.sourceTime,hour());assert.equal(new Date(b.hTime[0]).getTime(),hour());
});
test('MET backup converts m/s and keeps unavailable gust, probability and 6h rain blank',()=>{
  const d=W.metNorway(met(),pos);assert.equal(d.hWind[0],18);assert.equal(d.hGust[0],null);
  assert.equal(d.hPrec[0],null);assert.equal(d.hRain[0],null);assert.equal(d.currentPrecip,null);assert.equal(d.code,63);
  assert.ok(d.dayRangeEstimated);assert.ok(W.validWeather(d));
});
test('timeout aborts a hung JSON response body and releases the request',async()=>{
  let aborted=false;
  const A=adapterEnv(async(url,opts)=>({ok:true,headers:new Headers(),json:()=>new Promise((ok,no)=>opts.signal.addEventListener('abort',()=>{aborted=true;no(new Error('aborted'))}))}));
  await assert.rejects(A.json('https://test.invalid',{timeout:10}),e=>e.code==='timeout');assert.ok(aborted);
});
test('a failed primary source falls back; MET respects expiry and does not invent fields',async()=>{
  const urls=[];const A=adapterEnv(async url=>{urls.push(url);return new Response(JSON.stringify(url.includes('open-meteo')?{}:met()),{status:url.includes('open-meteo')?503:200,headers:{expires:new Date(Date.now()+3600000).toUTCString()}})});
  const client=A.createClient(),d=await client.get(pos);assert.equal(d.provider,'met-no');assert.equal(urls.length,2);
  assert.equal((await client.get(pos)).provider,'met-no');assert.equal(urls.length,2);
});
test('HTTP 429 Retry-After survives repeated manual requests',async()=>{
  let hits=0;const A=adapterEnv(async()=>{hits++;return new Response('{}',{status:429,headers:{'retry-after':'3600'}})});
  const client=A.createClient();await assert.rejects(client.get(pos),e=>e.code==='rate-limit'&&e.retryAt>Date.now()+3500000);
  await assert.rejects(client.get(pos));assert.equal(hits,2);
});
test('simultaneous reload, timer and focus share one primary request',async()=>{
  const e=appEnv();const a=e.c.loadWx(),b=e.c.loadWx({force:true}),c=e.c.loadWx({resume:true});
  assert.equal(a,b);assert.equal(b,c);assert.equal(e.calls(),1);
  e.pending.resolve(W.openMeteo(forecast(),pos));assert.equal(await a,true);assert.equal(e.c.wxData.temp,28);
});
test('primary weather renders without waiting for optional reverse geocoding and tide',async()=>{
  const e=appEnv(),stuck=deferred();let started=false;
  e.c._refreshWxExtras=()=>{started=true;return stuck.promise};
  const done=e.c.loadWx();e.pending.resolve(W.openMeteo(forecast(),pos));assert.equal(await done,true);
  assert.ok(started);assert.ok(e.renders.some(x=>x?.temp===28));
});
test('denied GPS uses last position and manual refresh never deletes it',async()=>{
  const e=appEnv();const old={...pos,ts:Date.now()-3600000};e.c.localStorage.setItem('_wxPos',JSON.stringify(old));
  e.c.getGeoPosition=async()=>null;const p=e.c.loadWx({force:true});await Promise.resolve();
  e.pending.resolve(W.openMeteo(forecast(),pos));assert.equal(await p,true);
  assert.equal(e.c.wxData.locationSource,'last-known');assert.equal(JSON.parse(e.values.get('_wxPos')).ts,old.ts);
});
test('no GPS and no previous location is actionable, not a fabricated default city',async()=>{
  const e=appEnv();e.values.clear();e.c.getGeoPosition=async()=>null;assert.equal(await e.c.loadWx(),false);
  assert.equal(e.calls(),0);assert.match(e.c.wxHtml(),/選擇地點/);assert.match(e.c.wxHtml(),/無法取得位置/);
});
test('offline restores only a validated location-specific cache and labels it offline',async()=>{
  const e=appEnv(),d=W.openMeteo(forecast(),pos);d.updatedAt=Date.now()-3600000;
  e.c.localStorage.setItem('_wxCache',JSON.stringify({schema:302,ts:d.updatedAt,d}));e.c.navigator.onLine=false;
  assert.equal(await e.c.loadWx(),false);assert.equal(e.calls(),0);assert.equal(e.c.wxData.temp,28);assert.match(e.c.wxHtml(),/離線・顯示上次資料/);
});
test('invalid, future and another location caches are never accepted',async()=>{
  for(const mode of ['legacy','future','wrong-location','invalid']){
    const e=appEnv(),d=W.openMeteo(forecast(),pos);const entry={schema:302,ts:Date.now(),d};
    if(mode==='legacy')entry.schema=301;if(mode==='future')entry.ts+=3600000;if(mode==='wrong-location')d.lat=0;if(mode==='invalid')d.days=[];
    e.c.localStorage.setItem('_wxCache',JSON.stringify(entry));e.c.navigator.onLine=false;await e.c.loadWx();assert.equal(e.c.wxData,null,mode);
  }
});
test('a failed refresh retains forecast, source timestamp and location',async()=>{
  const e=appEnv(),d=W.openMeteo(forecast(),pos);d.updatedAt-=3600000;e.c.wxData=d;
  const p=e.c.loadWx({force:true});e.pending.reject(Object.assign(new Error('timeout'),{code:'timeout'}));assert.equal(await p,false);
  assert.equal(e.c.wxData,d);assert.equal(e.c.wxErr,false);assert.match(e.c.wxHtml(),/更新未成功/);
});
test('late result from previous location cannot overwrite the selected place',async()=>{
  const e=appEnv();const p=e.c.loadWx();e.run('_wxRevision++');e.pending.resolve(W.openMeteo(forecast(),pos));
  assert.equal(await p,false);assert.equal(e.c.wxData,null);
});
test('five-minute refresh and return-to-screen check enforce separate request intervals',async()=>{
  const e=appEnv();const first=e.c.loadWx();e.pending.resolve(W.openMeteo(forecast(),pos));await first;
  assert.equal(await e.c.loadWx({resume:true}),false);assert.equal(e.calls(),1);
  e.run('_wxLastAttemptAt=Date.now()-61000');assert.equal(await e.c.loadWx(),false);
  assert.equal(await e.c.loadWx({resume:true}),true);assert.equal(e.calls(),2);
  e.run('_wxLastAttemptAt=Date.now()-301000');assert.equal(await e.c.loadWx(),true);assert.equal(e.calls(),3);
});
test('manual place weather is available without any GPS calls',async()=>{
  const e=appEnv();e.c.getGeoPosition=async()=>{throw Error('GPS should not be used')};e.c.localStorage.setItem('_wxManual',JSON.stringify({...pos,place:{...pos,display:'臺南市 鹽水區'}}));
  const p=e.c.loadWx();e.pending.resolve(W.openMeteo(forecast(),pos));assert.equal(await p,true);assert.equal(e.c.wxData.locationSource,'manual');assert.match(e.c.wxHtml(),/手選地點/);
});
test('CWA missing probability uses provider backup and null weather code is not sunshine',()=>{
  const e=appEnv(),d=W.openMeteo(forecast(),pos);d.code=63;d.hCode=d.hCode.map(()=>63);e.c.wxData=d;
  const key=new Date(hour()+28800000).toISOString().slice(0,13);e.c._mergeCwaForecast(d,{hourly:{[key]:{pop:null,wmo:null}}});
  assert.equal(d.hPrec[0],40);assert.equal(d.hCode[0],63);
});
function swEnv(){
  const events={},puts=[],store=new Map(),c={URL,Response,Promise,Date,Math,console,
    self:{location:{origin:'https://myshift.example'},registration:{scope:'https://myshift.example/app/'},addEventListener:(name,fn)=>events[name]=fn},
    caches:{open:async()=>({put:async(k,v)=>{puts.push(k);store.set(k,v)},match:async k=>store.get(k),delete:async k=>store.delete(k)})}};
  c.fetch=async()=>new Response('ok');vm.createContext(c);vm.runInContext(swSource,c);
  async function request(url,mode='cors',method='GET'){
    let response;const tasks=[];events.fetch({request:{url,method,mode},respondWith:p=>response=p,waitUntil:p=>tasks.push(p)});
    const r=response?await response:undefined;await Promise.all(tasks);return r;
  }
  return {c,events,puts,store,request};
}
test('service worker leaves all weather/geocoding API requests to their clients',async()=>{
  const e=swEnv();for(const host of ['api.open-meteo.com','api.met.no','cwa-data.onerkk.workers.dev','geocoding-api.open-meteo.com']){
    assert.equal(await e.request('https://'+host+'/v1/forecast?latitude=1&longitude=2'),undefined);
  }assert.equal(e.puts.length,0);
});
test('service worker preserves asset versions and never returns HTML for missing JS',async()=>{
  const e=swEnv();await e.request('https://myshift.example/app/app.js?v=302');assert.deepEqual(e.puts,['https://myshift.example/app/app.js?v=302']);
  e.store.set('https://myshift.example/app/index.html',new Response('<html>shell</html>'));e.c.fetch=async()=>{throw Error('offline')};
  assert.equal((await e.request('https://myshift.example/app/weather-data.js?v=302')).type,'error');
  assert.equal(await (await e.request('https://myshift.example/app/deep','navigate')).text(),'<html>shell</html>');
});

test('wrong-county official forecast is rejected and matching township is accepted',()=>{
  const e=appEnv(),place={county:'臺南市',town:'鹽水區'};
  assert.equal(e.c._cwaForecastMatchesPlace({town:'嘉義縣'},place),false);
  assert.equal(e.c._cwaForecastMatchesPlace({town:'臺南市'},place),false);
  assert.equal(e.c._cwaForecastMatchesPlace({county:'嘉義縣',town:'鹽水區'},place),false);
  assert.equal(e.c._cwaForecastMatchesPlace({county:'台南市',town:'鹽水區'},place),true);
});
test('transient network cooldown is not mislabeled as quota exhaustion',async()=>{
  const A=adapterEnv(async()=>{throw new TypeError('offline')}),client=A.createClient();
  await assert.rejects(client.get(pos),e=>e.code==='network');await assert.rejects(client.get(pos),e=>e.code==='network');
});

test('optional tide is selected by distance, filtered by date and sorted without zero-filling missing heights',async()=>{
  const e=appEnv(),wx=W.openMeteo(forecast(),pos);e.c.wxData=wx;
  const makeTime=(offset,height)=>({DateTime:new Date(Date.now()+offset*3600000).toISOString(),Tide:'滿潮',TideHeights:{AboveTWVD:height}});
  e.c.reverseGeocodeGps=async()=>null;e.c._applyCwaPop=async()=>false;
  e.c.WeatherData.json=async()=>({data:{records:{TideForecasts:[{Location:{Latitude:0,Longitude:0,LocationName:'Far',TimePeriods:{Daily:[]}}},{Location:{Latitude:pos.lat,Longitude:pos.lon,LocationName:'Near',TimePeriods:{Daily:[{Date:new Date().toISOString().slice(0,10),Time:[makeTime(3,90),makeTime(1,80),makeTime(2,null),makeTime(-48,70),makeTime(240,70)]}]}}}]}}});
  e.run(source.slice(source.indexOf('async function _refreshWxExtras('),source.indexOf('// ═══════════════════════════════════════════════════════════════\n// CWA 資料載入')));
  await e.c._refreshWxExtras(wx,pos,0);
  const tide=e.run('tideData');assert.equal(tide.station,'Near');assert.equal(tide.tides.length,2);assert.equal(tide.tides[0].height,80);assert.equal(tide.tides[1].height,90);
});
