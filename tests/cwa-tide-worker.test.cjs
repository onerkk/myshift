'use strict';
// Tide worker (backend/cwa-tide-worker.mjs). CWA is mocked; parameters follow https://opendata.cwa.gov.tw/apidoc/v1
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const load=()=>import(path.join(__dirname,'../backend/cwa-tide-worker.mjs'));
const now=Date.parse('2026-11-14T17:00:00+08:00');
const place=(id,name,lat,lon,withTimes)=>({Location:{LocationId:id,LocationName:name,Latitude:String(lat),Longitude:String(lon),
  TimePeriods:{Daily:[{Date:'2026-11-14',LunarDate:'2026-10-06',TideRange:'中',...(withTimes?{Time:[{DateTime:'2026-11-14T20:10:00+08:00',Tide:'滿潮',TideHeights:{AboveTWVD:81,AboveLocalMSL:60,AboveChartDatum:140}}]}:{})}]}}});
const places=t=>[place('10015050','花蓮縣吉安鄉',23.9424,121.6125,t),place('10010140','嘉義縣布袋鎮',23.38,120.15,t),place('64000030','高雄市鼓山區',22.62,120.27,t)];
function mock(handler){const calls=[],original=globalThis.fetch;globalThis.fetch=async url=>{const u=new URL(url),p=Object.fromEntries(u.searchParams);calls.push(p);const r=handler(p);return r===null?new Response('{}',{status:500}):new Response(JSON.stringify({success:'true',records:{dataid:'F-A0021-001',TideForecasts:r}}),{status:200})};return{calls,restore(){globalThis.fetch=original}}}

test('returns only the nearest location for the coming days, in the original CWA shape',async()=>{
  const W=await load(),m=mock(p=>p.LocationId?places(true).filter(x=>x.Location.LocationId===p.LocationId):places(false));
  try{
    const r=await W.tide({lat:'23.3256',lon:'120.2735'},'KEY',now);
    assert.equal(r.status,200);const f=r.body.records.TideForecasts;assert.equal(f.length,1);
    assert.equal(f[0].Location.LocationName,'嘉義縣布袋鎮');assert.equal(f[0].Location.TimePeriods.Daily[0].Time[0].TideHeights.AboveTWVD,81);
    // index request: one day, no tide times; detail request: one location, yesterday → +8 days in Taiwan time
    assert.deepEqual([m.calls[0].Date,m.calls[0].WeatherElement],['2026-11-14','TideRange']);
    assert.deepEqual([m.calls[1].LocationId,m.calls[1].timeFrom,m.calls[1].timeTo],['10010140','2026-11-13T17:00:00','2026-11-22T17:00:00']);
    assert.equal(m.calls.length,2);assert.ok(!JSON.stringify(r.body).includes('KEY'));
    assert.equal((await W.tide({lat:'22.63',lon:'120.30'},'KEY',now)).body.records.TideForecasts[0].Location.LocationName,'高雄市鼓山區');
  }finally{m.restore()}
});

test('falls back to the date-limited full list when the index or single-location query is unusable',async()=>{
  const W=await load();
  let m=mock(p=>p.WeatherElement?null:p.LocationId?[]:places(true));
  try{const r=await W.tide({lat:'23.3256',lon:'120.2735',debug:'1'},'KEY',now);assert.equal(r.status,200);assert.equal(r.body.records.TideForecasts[0].Location.LocationName,'嘉義縣布袋鎮');assert.ok(m.calls.at(-1).timeFrom&&!m.calls.at(-1).LocationId);assert.ok(Array.isArray(r.body.debug))}finally{m.restore()}
  m=mock(()=>null);
  try{assert.equal((await W.tide({lat:'23.3',lon:'120.2'},'KEY',now)).status,502)}finally{m.restore()}
  assert.equal((await W.tide({lat:'x',lon:'1'},'KEY',now)).status,400);assert.equal((await W.tide({lat:'1',lon:'2'},'',now)).status,500);
});

test('without coordinates the whole dataset is passed through unchanged (older app versions)',async()=>{
  const W=await load(),original=globalThis.fetch;let asked='';
  globalThis.fetch=async url=>{asked=String(url);return new Response('{"success":"true","records":{"TideForecasts":[]}}',{status:200})};
  try{
    const res=await W.default.fetch(new Request('https://w.example/'),{CWA_KEY:'KEY'});
    assert.equal(res.status,200);assert.equal(await res.text(),'{"success":"true","records":{"TideForecasts":[]}}');assert.ok(!/timeFrom|LocationId/.test(asked));
    assert.equal(res.headers.get('access-control-allow-origin'),'*');
  }finally{globalThis.fetch=original}
});
