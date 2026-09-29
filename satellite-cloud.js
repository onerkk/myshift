/* Published Himawari observations, independent of forecast cloud percentages.
 * NASA GIBS WMTS: GoogleMapsCompatible_Level6, 256px, z0..6.
 * JMA full-disk imagery: B13/TBB, 256px, z0..5 (the Japan crop excludes Taiwan).
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SatelliteCloud=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STEP=600000, MAX_AGE=3*3600000;
  const GIBS='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
  const LAYER='Himawari_AHI_Band13_Clean_Infrared', MATRIX='GoogleMapsCompatible_Level6';
  const JMA='https://www.jma.go.jp/bosai/himawari/data/satimg/';
  function iso(time){return new Date(Math.floor(time/1000)*1000).toISOString().replace('.000Z','Z');}
  function validTime(value){
    if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(String(value)))return NaN;
    const time=Date.parse(value.length===10?value+'T00:00:00Z':value);
    return Number.isFinite(time)&&iso(time).startsWith(value.replace(/Z$/,''))?time:NaN;
  }
  function compactTime(value){
    if(typeof value!=='string'||!/^\d{14}$/.test(value))return NaN;
    return validTime(value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(8,10)+':'+value.slice(10,12)+':'+value.slice(12,14)+'Z');
  }
  function recent(times,now){
    return [...new Set(times)].filter(t=>Number.isFinite(t)&&t<=now&&now-t<=MAX_AGE).sort((a,b)=>b-a).slice(0,2);
  }
  function gibsDomainsUrl(now){
    return GIBS+'1.0.0/'+LAYER+'/default/'+MATRIX+'/all/'+iso(now-MAX_AGE)+'--'+iso(now)+'.xml';
  }
  function parseGibsTimes(xml,now){
    const times=[];
    for(const match of String(xml).matchAll(/<(?:\w+:)?Domain(?:\s[^>]*)?>([^<]*)<\/(?:\w+:)?Domain>/g)){
      for(const part of match[1].split(',')){
        const range=part.trim().split('/'),start=validTime(range[0]);
        if(range.length===1){times.push(start);continue;}
        const end=validTime(range[1]);
        if(range[2]!=='PT10M'||!Number.isFinite(start)||!Number.isFinite(end)||end<start)continue;
        const last=end>now?end-Math.ceil((end-now)/STEP)*STEP:end;
        if(last>=start)times.push(last);
        if(last-STEP>=start)times.push(last-STEP);
      }
    }
    return recent(times,now);
  }
  function parseJmaTimes(data,now){
    if(!Array.isArray(data))return [];
    return recent(data.filter(r=>r&&r.basetime===r.validtime).map(r=>compactTime(r.validtime)),now);
  }
  function descriptor(source,time){
    if(!Number.isFinite(time))throw new TypeError('Invalid observation time');
    if(source==='gibs')return {source,time,maxNativeZoom:6,name:'NASA GIBS／Himawari',
      url:GIBS+LAYER+'/default/'+iso(time)+'/'+MATRIX+'/{z}/{y}/{x}.png'};
    if(source==='jma'){
      const stamp=iso(time).replace(/[-:TZ]/g,'');
      return {source,time,maxNativeZoom:5,name:'日本氣象廳／Himawari',
        url:JMA+stamp+'/fd/'+stamp+'/B13/TBB/{z}/{x}/{y}.jpg'};
    }
    throw new TypeError('Unknown satellite source');
  }
  function tileAt(frame,latitude,longitude){
    if(!frame||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new TypeError('Invalid coordinates');
    const z=frame.maxNativeZoom,n=2**z,lat=Math.max(-85,Math.min(85,latitude))*Math.PI/180;
    return {z,x:Math.min(n-1,Math.floor((longitude+180)/360*n)),y:Math.floor((1-Math.asinh(Math.tan(lat))/Math.PI)/2*n)};
  }
  function tileUrl(frame,tile){return frame.url.replace('{z}',tile.z).replace('{x}',tile.x).replace('{y}',tile.y);}
  // Empty WMTS tiles can return HTTP 200: a decoded image alone is not success.
  // Uniform dark images are valid clear/warm scenes; transparent / all-white placeholders are not.
  function hasImageData(pixels){
    if(!pixels||pixels.length<4)return false;
    let visible=0,white=0;
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]<16)continue;
      visible++;
      if(pixels[i]>=250&&pixels[i+1]>=250&&pixels[i+2]>=250)white++;
    }
    return visible>=pixels.length/4*.1&&white/visible<.995;
  }
  function inspectImage(img){
    if(!img||img.naturalWidth<128||img.naturalHeight<128)throw new Error('Empty satellite image');
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,32,32);
    if(!hasImageData(ctx.getImageData(0,0,32,32).data))throw new Error('Missing satellite pixels');
    return true;
  }
  async function publishedFrames(source,now,signal){
    const controller=new AbortController(),stop=()=>controller.abort();
    if(signal){if(signal.aborted)controller.abort();else signal.addEventListener('abort',stop,{once:true});}
    const timeout=setTimeout(stop,12000);
    try{
      const url=source==='gibs'?gibsDomainsUrl(now):JMA+'targetTimes_fd.json';
      const response=await fetch(url,{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('Satellite metadata '+response.status);
      const times=source==='gibs'?parseGibsTimes(await response.text(),now):parseJmaTimes(await response.json(),now);
      return times.map(t=>descriptor(source,t));
    }finally{clearTimeout(timeout);if(signal)signal.removeEventListener('abort',stop);}
  }
  return {STEP,MAX_AGE,gibsDomainsUrl,parseGibsTimes,parseJmaTimes,descriptor,tileAt,tileUrl,hasImageData,inspectImage,publishedFrames};
});
