/* Free weather adapters. No keys, paid endpoints, or third-party CORS proxies.
 * Sources/terms: https://open-meteo.com/en/docs | https://open-meteo.com/en/terms
 * https://docs.api.met.no/doc/TermsOfService | https://docs.api.met.no/doc/ForecastJSON
 */
(function(root){
  'use strict';
  const MINUTE=60000;
  const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  function validPosition(p){return !!p&&num(p.lat)!==null&&num(p.lon)!==null&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lon))<=180;}
  function localTime(ms){
    const d=new Date(ms),pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function failure(code,message,status,retryAt){return Object.assign(new Error(message||code),{code,status,retryAt:retryAt||0});}
  // Abort covers the response body too; Promise.race(fetch, timer) alone does not.
  async function json(url,opts={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),opts.timeout||12000);
    try{
      const response=await fetch(url,{cache:opts.cache||'no-store',signal:controller.signal,credentials:'omit'});
      if(!response.ok){
        const retry=response.headers.get('retry-after'),seconds=Number(retry);
        const retryAt=retry?(Number.isFinite(seconds)?Date.now()+seconds*1000:Date.parse(retry)):0;
        throw failure(response.status===429?'rate-limit':'http',`HTTP ${response.status}`,response.status,
          response.status===429?Math.max(Date.now()+15*MINUTE,retryAt||0):retryAt);
      }
      const data=await response.json();
      if(!data||typeof data!=='object'||data.error)throw failure('invalid','Invalid weather response');
      return {data,expires:Date.parse(response.headers.get('expires'))||0};
    }catch(e){
      if(controller.signal.aborted)throw failure('timeout','Weather request timed out');
      if(e.code)throw e;
      throw failure('network','Weather service could not be reached');
    }finally{clearTimeout(timer);}
  }
  function validWeather(d){
    return !!d&&validPosition(d)&&num(d.temp)!==null&&Array.isArray(d.days)&&d.days.length>0&&
      d.days.every(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&num(x.hi)!==null&&num(x.lo)!==null&&x.hi>=x.lo)&&
      Array.isArray(d.hTime)&&d.hTime.length>0&&d.hTime.every(t=>Number.isFinite(Date.parse(t)))&&
      Array.isArray(d.hTemp)&&d.hTemp.length===d.hTime.length&&d.hTemp.some(v=>num(v)!==null);
  }
  function openMeteo(data,pos,now=Date.now()){
    const c=data.current||{},h=data.hourly||{},d=data.daily||{};
    if(num(c.temperature_2m)===null||num(c.weather_code)===null||!Array.isArray(h.time)||!h.time.length||
      !Array.isArray(d.time)||!d.time.length||!Array.isArray(d.temperature_2m_max)||!Array.isArray(d.temperature_2m_min))throw failure('invalid');
    const offset=num(data.utc_offset_seconds)||0;
    const sourceMs=Date.parse(String(c.time)+'Z')-offset*1000;
    if(!Number.isFinite(sourceMs)||now-sourceMs>90*MINUTE||sourceMs-now>30*MINUTE)throw failure('stale','Weather response is out of date');
    const arr=key=>h.time.map((_,i)=>num((h[key]||[])[i]));
    const wx={
      lat:Number(pos.lat),lon:Number(pos.lon),temp:Math.round(c.temperature_2m),code:c.weather_code,
      provider:'open-meteo',source:'Open-Meteo',updatedAt:now,sourceTime:sourceMs,
      currentPrecip:num(c.precipitation),gust:num(c.wind_gusts_10m),
      days:d.time.map((date,i)=>({date,code:(d.weather_code||[])[i],hi:num(d.temperature_2m_max[i])===null?null:Math.round(d.temperature_2m_max[i]),lo:num(d.temperature_2m_min[i])===null?null:Math.round(d.temperature_2m_min[i])})),
      hTime:h.time.map(time=>localTime(Date.parse(time+'Z')-offset*1000)),hPrecModel:arr('precipitation_probability'),
      hRain:arr('precipitation'),hRainOnly:arr('rain'),hShowers:arr('showers'),hTemp:arr('temperature_2m'),
      hCode:arr('weather_code'),hWind:arr('wind_speed_10m'),hGust:arr('wind_gusts_10m'),hHum:arr('relative_humidity_2m')
    };
    // Keep all displayed dates/times in the device timezone, as existing calendar helpers do.
    wx.hPrec=wx.hPrecModel.slice();wx.hPopSource=wx.hPrec.map(v=>v===null?'none':'open-meteo');
    if(!validWeather(wx))throw failure('invalid');
    return wx;
  }
  function metCode(symbol){
    const s=String(symbol||'');
    if(s.includes('thunder'))return 95;
    if(s.includes('snow')||s.includes('sleet'))return s.includes('heavy')?75:s.includes('light')?71:73;
    if(s.includes('rain'))return s.includes('heavy')?65:s.includes('light')?61:63;
    return {clearsky:0,fair:1,partlycloudy:2,cloudy:3,fog:45}[s.replace(/_(day|night|polartwilight)$/,'')]??null;
  }
  function metNorway(data,pos,now=Date.now()){
    const p=data.properties||{},all=p.timeseries;
    if(!Array.isArray(all)||!all.length)throw failure('invalid');
    const issued=Date.parse(p.meta?.updated_at);
    if(!Number.isFinite(issued)||now-issued>24*60*MINUTE||issued-now>30*MINUTE)throw failure('stale');
    const rows=all.filter(r=>Number.isFinite(Date.parse(r.time))&&num(r.data?.instant?.details?.air_temperature)!==null);
    let current=rows.reduce((a,b)=>Math.abs(Date.parse(b.time)-now)<Math.abs(Date.parse(a.time)-now)?b:a,rows[0]);
    if(!current||Math.abs(Date.parse(current.time)-now)>90*MINUTE)throw failure('stale');
    const instant=r=>r.data.instant.details;
    const period=r=>r.data.next_1_hours||r.data.next_6_hours||r.data.next_12_hours||{};
    const code=r=>metCode(period(r).summary?.symbol_code);
    const wind=v=>num(v)===null?null:Math.round(Number(v)*3.6); // MET m/s -> existing UI km/h.
    const future=rows.filter(r=>Date.parse(r.time)>=now-60*MINUTE),byDay={};
    future.forEach(r=>{const key=localTime(Date.parse(r.time)).slice(0,10);(byDay[key]||(byDay[key]=[])).push(r);});
    const days=Object.keys(byDay).sort().slice(0,7).map(date=>{
      const list=byDay[date],temps=list.map(r=>instant(r).air_temperature);
      return {date,code:code(list[Math.floor(list.length/2)]),hi:Math.round(Math.max(...temps)),lo:Math.round(Math.min(...temps))};
    });
    const wx={lat:Number(pos.lat),lon:Number(pos.lon),provider:'met-no',source:'MET Norway',updatedAt:now,
      sourceTime:Date.parse(current.time),modelUpdatedAt:Date.parse(p.meta?.updated_at)||null,
      temp:Math.round(instant(current).air_temperature),code:code(current),currentPrecip:null,gust:wind(instant(current).wind_speed_of_gust),
      days,dayRangeEstimated:true,hTime:future.map(r=>localTime(Date.parse(r.time))),
      hTemp:future.map(r=>instant(r).air_temperature),hCode:future.map(code),
      hPrecModel:future.map(r=>num(r.data.next_1_hours?.details?.probability_of_precipitation)),
      hRain:future.map(r=>num(r.data.next_1_hours?.details?.precipitation_amount)),
      hWind:future.map(r=>wind(instant(r).wind_speed)),hGust:future.map(r=>wind(instant(r).wind_speed_of_gust)),
      hHum:future.map(r=>num(instant(r).relative_humidity))};
    // Six-hour totals and missing probabilities are never presented as hourly observations or 0%.
    wx.hPrec=wx.hPrecModel.slice();wx.hPopSource=wx.hPrec.map(v=>v===null?'none':'met-no');
    if(!validWeather(wx))throw failure('invalid');
    return wx;
  }
  function createClient(){
    const blockedUntil={},lastError={},metCache=new Map();
    async function get(pos){
      if(!validPosition(pos))throw failure('location');
      const lat=Number(pos.lat).toFixed(4),lon=Number(pos.lon).toFixed(4),key=lat+','+lon;
      const timezone=encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Taipei');
      const urls={
        'open-meteo':`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_gusts_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=precipitation_probability,precipitation,temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m&timezone=${timezone}&forecast_days=7`,
        'met-no':`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`
      };
      const errors=[];
      for(const provider of ['open-meteo','met-no']){
        const now=Date.now();
        if((blockedUntil[provider]||0)>now){errors.push(lastError[provider]||failure('network'));continue;}
        try{
          const cached=provider==='met-no'?metCache.get(key):null;
          if(cached&&cached.expires>now)return metNorway(cached.data,pos,now);
          const result=await json(urls[provider],{cache:provider==='met-no'?'default':'no-store'});
          const wx=provider==='met-no'?metNorway(result.data,pos):openMeteo(result.data,pos);
          if(provider==='met-no'){
            const entry={data:result.data,expires:Math.max(Date.now()+10*MINUTE,result.expires)};
            if(metCache.size>=4)metCache.delete(metCache.keys().next().value);
            metCache.set(key,entry);
          }
          return wx;
        }catch(e){
          // Respect quota limits even when the user repeatedly taps reload.
          blockedUntil[provider]=e.retryAt||Date.now()+(e.status===403?30*MINUTE:MINUTE);
          lastError[provider]=e;
          errors.push(e);
        }
      }
      const retryAt=Math.min(...Object.values(blockedUntil).filter(t=>t>Date.now()));
      throw failure(errors.every(e=>e.code==='rate-limit')?'rate-limit':errors[0]?.code||'network','Weather sources unavailable',0,Number.isFinite(retryAt)?retryAt:0);
    }
    function networkRestored(){
      for(const provider of Object.keys(lastError))if(['network','timeout'].includes(lastError[provider].code))blockedUntil[provider]=0;
    }
    return {get,networkRestored};
  }
  const api={json,num,validPosition,validWeather,openMeteo,metNorway,createClient};
  root.WeatherData=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
