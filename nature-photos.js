/* Documentary photographs, not generated art. Remote originals remain attributed.
 * Cached on demand; failure keeps a neutral sky, never silently substitutes AI art. */
(function(root){'use strict';
const base='https://upload.wikimedia.org/wikipedia/commons/';
const assets={
 cirrus:{url:base+'a/af/Cirrus_Clouds1.jpg',file:'Cirrus_Clouds1.jpg',author:'Doggo19292',license:'CC0-1.0'},
 cumulus:{url:base+'6/6e/Cumulus_clouds_-_NOAA.jpg',file:'Cumulus_clouds_-_NOAA.jpg',author:'NOAA / NSSL',license:'Public domain'},
 stratocumulus:{url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Stratocumulus_Cloud_in_Milton%2C_Florida.jpg/1280px-Stratocumulus_Cloud_in_Milton%2C_Florida.jpg',file:'Stratocumulus_Cloud_in_Milton,_Florida.jpg',author:'Jesselikeswx',license:'CC0-1.0'},
 rain:{url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Rain_drops_%28Unsplash%29.jpg/960px-Rain_drops_%28Unsplash%29.jpg',file:'Rain_drops_(Unsplash).jpg',author:'Inge Maria',license:'CC0-1.0'},
 reeds:{url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/Reeds_%2831919808003%29.jpg/1280px-Reeds_%2831919808003%29.jpg',file:'Reeds_(31919808003).jpg',author:'Rob Mitchell',license:'CC0-1.0'},
 grass:{url:base+'thumb/b/be/Spring_grass_with_rain_drops_on_it.jpg/1280px-Spring_grass_with_rain_drops_on_it.jpg',file:'Spring_grass_with_rain_drops_on_it.jpg',author:'Iurie Nistor',license:'CC0-1.0'},
 lotus:{url:base+'2/27/Lotus-a.jpg',file:'Lotus-a.jpg',author:'Tatpong Tulyanon',license:'CC0-1.0'},
 butterfly:{url:base+'5/53/Butterfly_IMG_4491.jpg',file:'Butterfly_IMG_4491.jpg',author:'EditorFX',license:'CC0-1.0'},
 dragonfly:{url:base+'2/25/Dragonfly_%2822086002592%29.jpg',file:'Dragonfly_(22086002592).jpg',author:'Rob Mitchell',license:'CC0-1.0'},
 egret:{url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Little_egret_%28Egretta_garzetta%29.jpg/1280px-Little_egret_%28Egretta_garzetta%29.jpg',file:'Little_egret_(Egretta_garzetta).jpg',author:'Hobbyfotowiki',license:'CC0-1.0'}
};
const entries=new Map();let changed=()=>{};
function image(key){
 if(!assets[key])return null;let e=entries.get(key);if(e)return e.status==='loaded'?e.image:null;
 e={status:'loading',image:null};entries.set(key,e);
 (async()=>{let objectURL=null;try{
  let response,cache=null;try{if(typeof caches!=='undefined')cache=await caches.open('myshift-photos-v338')}catch(_){}
  if(cache)response=await cache.match(assets[key].url);
  if(!response){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);try{response=await fetch(assets[key].url,{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',signal:ctl.signal});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw Error('Photo unavailable');if(cache)try{await cache.put(assets[key].url,response.clone())}catch(_){} }finally{clearTimeout(timer)}}
  const im=new Image();objectURL=URL.createObjectURL(await response.blob());im.src=objectURL;await im.decode();e.image=im;e.status='loaded';
 }catch(_){e.status='unavailable'}finally{if(objectURL)URL.revokeObjectURL(objectURL);changed()}})();return null;
}
function retry(){for(const [key,e] of entries)if(e.status==='unavailable')entries.delete(key);changed()}
root.NaturePhotos={assets,image,retry,onChange(fn){changed=fn},status(){return Object.fromEntries([...entries].map(([k,e])=>[k,e.status]))}};
})(typeof window!=='undefined'?window:globalThis);
