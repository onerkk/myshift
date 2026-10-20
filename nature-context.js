/* v338: conservative observation gate. Forecasts never establish observed hazards. */
(function(root){
'use strict';
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const rainCodes=[51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99];
function timestamp(v){if(typeof v==='number')return v;let text=String(v||'');if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(text))text=text.replace(' ','T')+'+08:00';return Date.parse(text)}
function bounded(v,min,max){const n=num(v);return n!==null&&n>=min&&n<=max?n:null}
function weatherCode(text){const t=String(text||'');if(/冰雹/.test(t))return 96;if(/雨夾雪|雨雪/.test(t))return 68;if(/雪|霰/.test(t))return 71;if(/雷/.test(t))return 95;if(/暴雨|豪雨|大雨/.test(t))return 65;if(/毛毛雨|細雨/.test(t))return 51;if(/雨/.test(t))return 61;if(/霧/.test(t))return 45;if(/陰/.test(t))return 3;if(/雲/.test(t))return 2;if(/晴/.test(t))return 0;return null}
function normalizeObservation(raw){
 if(!raw)return null;const known=/^O-A000[13]-001$/.test(raw.sourceDataset||'');if(!known&&raw.kind!=='observation')return null;
 const text=raw.weatherText||raw.weather||'';const derived=weatherCode(text);const code=known&&text?derived:num(raw.code??raw.wmo);
 return {...raw,kind:'observation',time:timestamp(raw.time??raw.obsTime),code,temperature:bounded(raw.temperature,-60,60),windKmh:bounded(raw.windKmh??raw.windSpeedKmh,0,400),windDirection:bounded(raw.windDirection,0,360),humidity:bounded(raw.humidity??raw.relativeHumidity,0,100),cloud:bounded(raw.cloud,0,100)};
}
function fresh(o,now){const t=timestamp(o?.time),d=num(o?.distanceKm);return !!o&&Number.isFinite(t)&&now-t>=-120000&&now-t<=1200000&&d!==null&&d>=0&&d<=10&&o.kind==='observation'}
function season(stamp,lat,lon){
 const d=new Date(stamp+(num(lon)||0)*240000),m=d.getUTCMonth()+1;
 let s=m>=3&&m<=5?0:m>=6&&m<=8?1:m>=9&&m<=11?2:3;if(num(lat)!==null&&lat<0)s=(s+2)%4;
 return ['spring','summer','autumn','winter'][s];
}
function resolve(input={},now=Date.now()){
 const o=normalizeObservation(input.observation),r=input.rainObservation,ok=fresh(o,now),rok=fresh(r,now),c=ok?num(o.code):null;
 const rain10=rok?num(r.rain10):null,temp=ok?num(o.temperature):null,wind=ok?num(o.windKmh):null,cloud=ok?num(o.cloud):null;
 let mode='none',code=null,reason='missing-observation',expiresAt=0;
 if(ok){
  expiresAt=timestamp(o.time)+1200000;code=c;
  if([96,99].includes(c))mode='hail';else if(c===95)mode='storm';else if([68,69,71,73,75,77,85,86].includes(c))mode='snow';else if([45,48].includes(c))mode='fog';else if([65,67,82].includes(c))mode='heavy';else if([51,53].includes(c))mode='drizzle';else if(rainCodes.includes(c))mode='rain';else if(c!==null&&c>=0&&c<=3)mode=c>=2?'cloud':'clear';
  if(['clear','cloud','none'].includes(mode)){if(wind!==null&&wind>=35)mode='wind';else if(temp!==null&&temp<=10)mode='cold';else if(temp!==null&&temp>=34)mode='heat'}
  reason='station-observation';
 }
 // Nearby rain-gauge evidence establishes rain only, never thunder/hail/snow.
 if(rain10!==null&&rain10>=0){
  const rt=timestamp(r.time),ot=ok?timestamp(o.time):-Infinity;
  if(!ok||rt>=ot){
   if(rain10===0&&['drizzle','rain','heavy'].includes(mode)){code=cloud===null?null:cloud>70?3:cloud>30?2:cloud>10?1:0;mode=code===null?'none':code>=2?'cloud':'clear'}
   if(rain10>0&&!['hail','storm','snow'].includes(mode)){mode=rain10>=5?'heavy':rain10<.3?'drizzle':'rain';code=mode==='heavy'?65:mode==='drizzle'?51:61}
   expiresAt=ok?Math.min(expiresAt,rt+1200000):rt+1200000;reason=rain10===0?'measured-dry':'measured-rain';
  }
 }
 const alert=input.typhoon;
 if(['rain','heavy','storm'].includes(mode)&&wind!==null&&wind>=62&&alert?.official===true&&alert.local===true&&now-timestamp(alert.time)>=0&&now-timestamp(alert.time)<=600000&&timestamp(alert.expires)>now){mode='typhoon';expiresAt=Math.min(expiresAt,timestamp(alert.time)+600000,timestamp(alert.expires))}
 return {mode,code,reason,expiresAt,temp,wind,cloud,rain:rain10===null?null:rain10*6,humidity:ok?num(o.humidity):null,windDirection:ok?num(o.windDirection):null,lat:num(input.lat),lon:num(input.lon),season:season(now,input.lat,input.lon),observed:ok||rok,sourceTime:ok?timestamp(o.time):rok?timestamp(r.time):null};
}
function ecology(state,night,stamp=Date.now()){
 const s=state.season||season(stamp,state.lat,state.lon),warm=state.temp!==null&&state.temp>=18&&state.temp<=33,calm=state.wind!==null&&state.wind<18;
 const dry=['clear','cloud'].includes(state.mode),tropical=Math.abs(state.lat||0)<25;
 const plant=s==='summer'&&warm?'lotus':s==='spring'||tropical&&s==='winter'?'grass':'reeds';
 const animals=!night&&dry&&warm&&calm?['butterfly','bird']:[];
 return {plant,animals,season:s,night,wet:['drizzle','rain','heavy','storm','typhoon'].includes(state.mode),cloudType:state.cloud===null?(state.mode==='clear'?'cirrus':state.mode==='cloud'?'stratocumulus':'unknown'):state.cloud<25?'cirrus':state.cloud<75?'cumulus':'stratocumulus',source:'seasonal-illustration'};
}
const api={resolve,season,ecology,fresh,normalizeObservation,weatherCode};root.NatureContext=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
