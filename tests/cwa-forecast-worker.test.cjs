'use strict';
// Township forecast worker (backend/cwa-forecast-worker.mjs). CWA is mocked: these tests pin the parsing
// and the fallbacks, not the live API.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const load=()=>import(path.join(__dirname,'../backend/cwa-forecast-worker.mjs'));

const town=(name,pop=[['2026-11-14T12:00:00+08:00','2026-11-14T15:00:00+08:00','30'],['2026-11-14T15:00:00+08:00','2026-11-14T18:00:00+08:00','90']])=>({
  LocationName:name,Geocode:'67000020',WeatherElement:[
    {ElementName:'溫度',Time:[{DataTime:'2026-11-14T12:00:00+08:00',ElementValue:[{Temperature:'26'}]},{DataTime:'2026-11-14T13:00:00+08:00',ElementValue:[{Temperature:'27'}]}]},
    {ElementName:'體感溫度',Time:[{DataTime:'2026-11-14T12:00:00+08:00',ElementValue:[{ApparentTemperature:'31'}]}]},
    {ElementName:'3小時降雨機率',Time:pop.map(([StartTime,EndTime,v])=>({StartTime,EndTime,ElementValue:[{ProbabilityOfPrecipitation:v}]}))},
    {ElementName:'天氣現象',Time:[{StartTime:'2026-11-14T12:00:00+08:00',EndTime:'2026-11-14T15:00:00+08:00',ElementValue:[{Weather:'短暫陣雨或雷雨',WeatherCode:'15'}]},
      {StartTime:'2026-11-14T15:00:00+08:00',EndTime:'2026-11-14T18:00:00+08:00',ElementValue:[{Weather:'多雲時晴',WeatherCode:'03'}]}]}
  ]});
const dataset=(county,towns)=>({success:'true',records:{Locations:[{DatasetDescription:'x',LocationsName:county,Location:towns}]}});
function mock(table){
  const calls=[],original=globalThis.fetch;
  globalThis.fetch=async url=>{
    const u=new URL(url),id=u.pathname.split('/').pop(),name=u.searchParams.get('LocationName');calls.push({id,name,auth:u.searchParams.get('Authorization')});
    let data=table[id];if(!data)return new Response('{}',{status:404});
    if(name&&id!=='F-D0047-089'){data=JSON.parse(JSON.stringify(data));data.records.Locations.forEach(g=>g.Location=g.Location.filter(l=>l.LocationName===name))}
    return new Response(JSON.stringify(data),{status:200});
  };
  return{calls,restore(){globalThis.fetch=original}};
}

test('township forecast: probability fills every hour of its 3-hour window in Taiwan time',async()=>{
  const W=await load(),m=mock({'F-D0047-077':dataset('臺南市',[town('鹽水區'),town('新營區')])});
  try{
    const r=await W.forecast({county:'台南市',town:'鹽水區'},'KEY');
    assert.equal(r.ok,true);assert.equal(r.scope,'town');assert.equal(r.county,'臺南市');assert.equal(r.town,'鹽水區');assert.equal(r.source,'CWA F-D0047-077');assert.equal(r.popWindowHours,3);
    assert.deepEqual(['12','13','14'].map(h=>r.hourly['2026-11-14T'+h].pop),[30,30,30]);
    assert.deepEqual(['15','16','17'].map(h=>r.hourly['2026-11-14T'+h].pop),[90,90,90]);
    assert.equal(r.hourly['2026-11-14T18'],undefined);
    assert.equal(r.hourly['2026-11-14T12'].wmo,95);assert.equal(r.hourly['2026-11-14T16'].wmo,2);
    assert.equal(r.hourly['2026-11-14T12'].t,26);assert.equal(r.hourly['2026-11-14T13'].t,27);assert.equal(r.hourly['2026-11-14T14'].t,27);
    assert.equal(m.calls.length,1);assert.equal(m.calls[0].auth,'KEY');assert.ok(!JSON.stringify(r).includes('KEY'));
  }finally{m.restore()}
});

test('missing probability stays null and is never turned into 0',async()=>{
  const W=await load(),m=mock({'F-D0047-077':dataset('臺南市',[town('鹽水區',[['2026-11-14T12:00:00+08:00','2026-11-14T15:00:00+08:00',' '],['2026-11-14T15:00:00+08:00','2026-11-14T18:00:00+08:00','-']])])});
  try{const r=await W.forecast({county:'臺南市',town:'鹽水區'},'KEY');assert.equal(r.ok,true);assert.equal(r.hourly['2026-11-14T12'].pop,null);assert.equal(r.hourly['2026-11-14T12'].wmo,95)}finally{m.restore()}
});

test('a renumbered county dataset is found by its county name and remembered',async()=>{
  const W=await load(),m=mock({'F-D0047-065':dataset('屏東縣',[town('屏東市')]),'F-D0047-033':dataset('高雄市',[town('新興區')])});
  try{
    const r=await W.forecast({county:'高雄市',town:'新興區'},'KEY');
    assert.equal(r.ok,true);assert.equal(r.scope,'town');assert.equal(r.source,'CWA F-D0047-033');
    m.calls.length=0;await W.forecast({county:'高雄市',town:'新興區'},'KEY');assert.equal(m.calls[0].id,'F-D0047-033');
  }finally{m.restore()}
});

test('unknown township falls back to the county forecast chosen by county name, not by nearest coordinates',async()=>{
  const W=await load(),m=mock({'F-D0047-077':dataset('臺南市',[town('新營區')]),'F-D0047-089':dataset('臺灣',[town('嘉義縣'),town('臺南市')])});
  try{
    // Yanshui's coordinates are nearest to Chiayi County; the county name must win.
    const r=await W.forecast({county:'臺南市',town:'不存在區',lat:'23.3256',lon:'120.2735'},'KEY');
    assert.equal(r.ok,true);assert.equal(r.scope,'county');assert.equal(r.town,'臺南市');assert.equal(r.source,'CWA F-D0047-089');
    // Without names the nearest county is used.
    const n=await W.forecast({lat:'22.99',lon:'120.19'},'KEY');assert.equal(n.town,'臺南市');
  }finally{m.restore()}
});

test('errors are reported without leaking the key; older lowercase field names still parse',async()=>{
  const W=await load();
  assert.equal((await W.forecast({county:'臺南市',town:'鹽水區'},'')).ok,false);
  const m=mock({});try{const r=await W.forecast({county:'臺南市',town:'鹽水區',debug:'1'},'SECRET');assert.equal(r.ok,false);assert.ok(Array.isArray(r.debug));assert.ok(!JSON.stringify(r).includes('SECRET'))}finally{m.restore()}
  const old={locationName:'鹽水區',weatherElement:[{elementName:'PoP6h',time:[{startTime:'2026-11-14 12:00:00+08:00',endTime:'2026-11-14 18:00:00+08:00',elementValue:[{value:'40',measures:'百分比'}]}]}]};
  const r=W.hourlyFromLocation(old);assert.equal(r.popWindowHours,6);assert.equal(r.hourly['2026-11-14T17'].pop,40);
  assert.equal(W.tokenOf({CWA_API_KEY:'a'}),'a');assert.equal(W.tokenOf({CWA_TOKEN:'b'}),'b');
  assert.equal(W.tokenOf({CWA_KEY:'old'}),'old');
  for(const [text,code] of [['晴',0],['晴時多雲',2],['多雲',2],['陰',3],['有霧',45],['雨',63],['短暫雨',80],['午後短暫陣雨',80],['大雨',65],['陣雨或雷雨',95]])assert.equal(W.wmoFromText(text),code,text);
});

test('rain-station endpoint keeps the previous response shape and value rules (radar page depends on it)',async()=>{
  const W=await load(),original=globalThis.fetch;
  const st=(name,lat,lon,p10)=>({StationName:name,StationId:'C1'+name,ObsTime:{DateTime:'2026-11-14T16:50:00+08:00'},
    GeoInfo:{CountyName:'臺南市',TownName:'鹽水區',Coordinates:[{CoordinateName:'TWD67',StationLatitude:'0',StationLongitude:'0'},{CoordinateName:'WGS84',StationLatitude:String(lat),StationLongitude:String(lon)}]},
    RainfallElement:{Past10Min:{Precipitation:p10},Past1hr:{Precipitation:'3.5'},Past3hr:{Precipitation:'T'},Past24hr:{Precipitation:'-98'},Now:{Precipitation:'X'}}});
  globalThis.fetch=async url=>{assert.match(String(url),/O-A0002-001/);return new Response(JSON.stringify({records:{Station:[st('遠',25,121.5,'9'),st('鹽水',23.32,120.27,'1.5')]}}),{status:200})};
  try{
    const r=await W.rain({lat:'23.3256',lon:'120.2735'},'KEY');
    assert.equal(r.status,200);assert.equal(r.body.station,'鹽水');assert.equal(r.body.county,'臺南市');assert.ok(r.body.distanceKm<2);assert.equal(r.body.obsTime,'2026-11-14T16:50:00+08:00');
    assert.deepEqual(r.body.rain,{min10:{mm:1.5,note:'ok'},hr1:{mm:3.5,note:'ok'},hr3:{mm:.05,note:'trace'},hr24:{mm:0,note:'dry6h'},today:{mm:null,note:'broken'}});
    assert.equal((await W.rain({lat:'x'},'KEY')).status,400);assert.equal((await W.rain({lat:'1',lon:'2'},'')).status,500);
    // through the fetch handler, with the old env name
    const res=await W.default.fetch(new Request('https://w.example/?rain=1&lat=23.3256&lon=120.2735'),{CWA_KEY:'KEY'});
    assert.equal(res.status,200);assert.equal((await res.json()).station,'鹽水');assert.equal(res.headers.get('access-control-allow-origin'),'*');
  }finally{globalThis.fetch=original}
});

test('the hour before the first township window is filled from the county forecast and marked as such',async()=>{
  const W=await load(),RealDate=Date,fixed=RealDate.parse('2026-11-14T17:10:00+08:00');
  const later=[['2026-11-14T18:00:00+08:00','2026-11-14T21:00:00+08:00','70']];
  const m=mock({'F-D0047-077':dataset('臺南市',[town('鹽水區',later)]),'F-D0047-089':dataset('臺灣',[town('臺南市',[['2026-11-14T15:00:00+08:00','2026-11-14T18:00:00+08:00','90'],['2026-11-14T18:00:00+08:00','2026-11-14T21:00:00+08:00','60']])])});
  globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return fixed}};
  try{
    const r=await W.forecast({county:'臺南市',town:'鹽水區'},'KEY');
    assert.equal(r.scope,'town');assert.equal(r.hourly['2026-11-14T17'].pop,90);assert.equal(r.hourly['2026-11-14T17'].fill,'county');assert.equal(r.countyFilledHours,1);
    assert.equal(r.hourly['2026-11-14T18'].pop,70);assert.equal(r.hourly['2026-11-14T18'].fill,undefined);assert.equal(r.hourly['2026-11-14T16'].pop,null);assert.equal(r.hourly['2026-11-14T16'].fill,undefined);
  }finally{globalThis.Date=RealDate;m.restore()}
});
