const CACHE_NAME = 'myshift-v224-ultimate-ui';

self.addEventListener('install', event => {
  // 立即接管：避免 PWA 卡在舊 SW + 舊 cache
  self.skipWaiting();
});

self.addEventListener('message', event => {
  const data = event.data;
  if (data === 'SKIP_WAITING') { self.skipWaiting(); return; }
  // App 端寫入最後位置與個人通知設定；Service Worker 背景檢查必須服從同一套開關。
  if (data && data.type === 'WX_POS' && data.lat && data.lon) {
    event.waitUntil(swPutWxCache('lastPos', {
      lat: Number(data.lat), lon: Number(data.lon), accuracy: data.accuracy || null,
      place: data.place || null, ts: Number(data.ts) || Date.now()
    }));
    return;
  }
  if (data && data.type === 'WX_PREFS') {
    const src = data.prefs || {};
    const prefs = {
      wxMaster: src.wxMaster !== false,
      wxNotify: src.wxNotify !== false,
      wxNotifyItems: (src.wxNotifyItems && typeof src.wxNotifyItems === 'object') ? src.wxNotifyItems : {},
      ts: Date.now()
    };
    event.waitUntil(swPutWxCache('userPrefs', prefs));
    return;
  }
  if (data && data.type === 'CHECK_ALERTS_NOW') {
    event.waitUntil(swBackgroundCheck());
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME && name !== NOTIFY_STATE_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
     .then(() => self.clients.matchAll({ type: 'window' }))
     .then(clients => {
       // 新 SW 接管後，通知所有打開的頁面 reload，讓使用者立刻拿到新版 app.js
       clients.forEach(c => { try { c.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }); } catch (e) {} });
     })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  url.search = '';
  const cacheKey = url.toString();

  // 對 app 核心檔（.js / .html / .css）強制 bypass HTTP cache，避免 GitHub Pages 10 分鐘 cache 鎖住舊版
  const path = url.pathname;
  const isCore = /\.(?:js|html|css)$/i.test(path) || path.endsWith('/') || path.endsWith('/myshift') || path.endsWith('/myshift/');
  const fetchOpts = isCore ? { cache: 'no-store' } : undefined;

  event.respondWith(
    fetch(event.request, fetchOpts)
      .then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(cacheKey, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(cacheKey)
          .then(cached => cached || caches.match(url.origin + url.pathname.replace(/[^\/]*$/, 'index.html')));
      })
  );
});

// ════════════════════════════════════════════════════════════════
// 系統通知：點擊處理 — 開啟（或聚焦）已存在的 app 視窗
// ════════════════════════════════════════════════════════════════
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL('./', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // 若已有 app 開著就聚焦
      for (const c of list) {
        try {
          const u = new URL(c.url);
          if (u.pathname.includes('/myshift') && 'focus' in c) {
            return c.focus();
          }
        } catch (e) {}
      }
      // 否則開新視窗
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })()
  );
});

// ════════════════════════════════════════════════════════════════
// 災防背景檢查：只推「官方有效警特報、所在地地震/雨量實測」
// 模式預報留在 App 畫面，不在背景冒充官方警報。
// Periodic Background Sync 的實際執行時機由瀏覽器決定；前景則由 App 每 30 秒觸發一次。
// ════════════════════════════════════════════════════════════════
const FIRESTORE_PROJECT = 'myshift-a67f1';
const NOTIFY_STATE_CACHE = 'wx-notify-state-v2';
const CWA_DATA_URL = 'https://cwa-data.onerkk.workers.dev';

const ALERT_DEFS = {
  master: true, typhoon: true, storm: true, heavyRain: true, rain: true,
  strongWind: true, heat: true, cold: true, fog: false, earthquake: true,
  earthquakeMinMagnitude: 4.0, earthquakeMinIntensity: 3,
  earthquakeMaxDistanceKm: 120, earthquakeMaxAgeMinutes: 120,
  earthquakeNotifyMaxAgeMinutes: 15,
  officialAlertCacheMaxMinutes: 10,
  backgroundPositionMaxAgeMinutes: 360,
  typhoonAlertDistanceKm: 800,
  notifyEnabled: true,
  notifyTyphoon: true, notifyStorm: true, notifyHeavyRain: true, notifyRain: false,
  notifyStrongWind: true, notifyHeat: false, notifyCold: false, notifyFog: false,
  notifyEarthquake: true,
  cooldownHours: 3, quietStart: 22, quietEnd: 7, quietIgnoreCritical: true
};

async function swPutWxCache(key, data) {
  try {
    const cache = await caches.open(NOTIFY_STATE_CACHE);
    await cache.put(key, new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } }));
  } catch (e) {}
}
async function swGetCache(key) {
  try {
    const cache = await caches.open(NOTIFY_STATE_CACHE);
    const resp = await cache.match(key);
    if (resp) return await resp.json();
  } catch (e) {}
  return null;
}

function _fsValue(v) {
  if (v === null || v === undefined) return undefined;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(_fsValue);
  if (v.mapValue) {
    const out = {}, fs = v.mapValue.fields || {};
    for (const k in fs) out[k] = _fsValue(fs[k]);
    return out;
  }
  return undefined;
}
async function swFetchAlertConfig() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/config/app`;
    const resp = await Promise.race([
      fetch(url, { cache: 'no-store' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('config timeout')), 6000))
    ]);
    if (!resp.ok) return null;
    const data = await resp.json();
    const fields = data.fields && data.fields.wxAlerts && data.fields.wxAlerts.mapValue && data.fields.wxAlerts.mapValue.fields;
    if (!fields) return null;
    const out = {};
    for (const k in fields) {
      const v = _fsValue(fields[k]);
      if (v !== undefined) out[k] = v;
    }
    return Object.assign({}, ALERT_DEFS, out);
  } catch (e) { return null; }
}

function swNum(v) { v = parseFloat(v); return Number.isFinite(v) ? v : null; }
function swDistKm(lat1, lon1, lat2, lon2) {
  lat1 = swNum(lat1); lon1 = swNum(lon1); lat2 = swNum(lat2); lon2 = swNum(lon2);
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function swTwVariants(s) {
  s = String(s || '').trim();
  if (!s) return [];
  const out = [s];
  if (s.includes('臺')) out.push(s.replace(/臺/g, '台'));
  if (s.includes('台')) out.push(s.replace(/台/g, '臺'));
  return [...new Set(out.filter(Boolean))];
}
const SW_TW_COUNTY_SET = new Set('基隆市,臺北市,台北市,新北市,桃園市,新竹市,新竹縣,苗栗縣,臺中市,台中市,彰化縣,南投縣,雲林縣,嘉義市,嘉義縣,臺南市,台南市,高雄市,屏東縣,臺東縣,台東縣,花蓮縣,宜蘭縣,澎湖縣,金門縣,連江縣'.split(','));
function swIsBroadArea(s) {
  s = String(s || '').trim();
  return !s || /^(臺灣|台灣|中華民國|Taiwan|Taiwan Province|Republic of China|ROC)$/i.test(s) || /^(全臺|全台|全國|北部|中部|南部|東部|離島)$/.test(s);
}
function swCleanAreaName(s) {
  s = String(s || '').trim();
  if (!s) return '';
  const map = {
    'Taipei City':'臺北市','New Taipei City':'新北市','Taoyuan City':'桃園市','Taichung City':'臺中市','Tainan City':'臺南市','Kaohsiung City':'高雄市',
    'Keelung City':'基隆市','Hsinchu City':'新竹市','Chiayi City':'嘉義市','Hsinchu County':'新竹縣','Miaoli County':'苗栗縣','Changhua County':'彰化縣','Nantou County':'南投縣','Yunlin County':'雲林縣','Chiayi County':'嘉義縣','Pingtung County':'屏東縣','Yilan County':'宜蘭縣','Hualien County':'花蓮縣','Taitung County':'臺東縣','Penghu County':'澎湖縣','Kinmen County':'金門縣','Lienchiang County':'連江縣',
    'Taiwan':'','Taiwan Province':'','Republic of China':'','ROC':'','臺灣':'','台灣':'','臺灣省':'','台灣省':''
  };
  if (map[s] !== undefined) return map[s];
  s = s.replace(/^台灣省/, '').replace(/^臺灣省/, '').replace(/^Taiwan Province/i, '').trim();
  return swIsBroadArea(s) ? '' : s;
}
function swIsValidCounty(s) { s = swCleanAreaName(s); return !!s && !swIsBroadArea(s) && SW_TW_COUNTY_SET.has(s); }
function swIsValidTown(s) { s = swCleanAreaName(s); return !!s && !swIsBroadArea(s) && /[區鄉鎮市]$/.test(s) && !SW_TW_COUNTY_SET.has(s); }
function swPickCounty() { for (const v of arguments) { const c = swCleanAreaName(v); if (swIsValidCounty(c)) return c; } return ''; }
function swPickTown() { for (const v of arguments) { const t = swCleanAreaName(v); if (swIsValidTown(t)) return t; } return ''; }
function swExtractPlace(addr) {
  addr = addr || {};
  const county = swPickCounty(addr.county, addr.city, addr.state_district, addr.state);
  let town = swPickTown(addr.city_district, addr.town, addr.suburb, addr.village, addr.municipality, addr.district, addr.quarter);
  if (town === county) town = '';
  return { county, town };
}
function swPlaceKeys(pos) {
  const p = pos && pos.place;
  if (!p) return [];
  const county = swIsValidCounty(p.county) ? swCleanAreaName(p.county) : '';
  const town = swIsValidTown(p.town) ? swCleanAreaName(p.town) : '';
  const keys = [];
  if (county) swTwVariants(county).forEach(x => keys.push(x));
  if (town) swTwVariants(town).forEach(x => keys.push(x));
  if (county && town) {
    swTwVariants(county + town).forEach(x => keys.push(x));
    swTwVariants(county + ' ' + town).forEach(x => keys.push(x));
  }
  return [...new Set(keys.filter(k => k && !swIsBroadArea(k)))];
}
function swPlaceText(pos) {
  const p = pos && pos.place || {};
  const county = swIsValidCounty(p.county) ? swCleanAreaName(p.county) : '';
  const town = swIsValidTown(p.town) ? swCleanAreaName(p.town) : '';
  return [county, town].filter(Boolean).join(' ');
}
async function swReverseGeocodeGps(pos) {
  if (!pos || !pos.lat || !pos.lon) return null;
  if (pos.place && swPlaceKeys(pos).length) return pos.place;
  const cached = await swGetCache('lastPlace');
  const d = cached && swDistKm(pos.lat, pos.lon, cached.lat, cached.lon);
  if (cached && cached.ts && Date.now() - cached.ts < 30 * 60 * 1000 && d !== null && d < 2) return cached;
  try {
    const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(pos.lat)}&lon=${encodeURIComponent(pos.lon)}&zoom=18&addressdetails=1&accept-language=zh-TW`;
    const resp = await Promise.race([fetch(u, { cache:'no-store' }), new Promise((_, r) => setTimeout(() => r(new Error('reverse timeout')), 4500))]);
    if (!resp.ok) return null;
    const data = await resp.json(), p = swExtractPlace(data && data.address || {});
    if (!p.county && !p.town) return null;
    const out = { county:p.county || '', town:p.town || '', display:[p.county,p.town].filter(Boolean).join(' '), source:'gps-reverse', lat:pos.lat, lon:pos.lon, ts:Date.now() };
    await swPutWxCache('lastPlace', out); pos.place = out; await swPutWxCache('lastPos', pos);
    return out;
  } catch (e) { return null; }
}

function swParseTs(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  let t = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(t)) t = t.replace(' ', 'T') + '+08:00';
  const n = new Date(t).getTime(); return Number.isFinite(n) ? n : NaN;
}
function swAlertAreaText(a) {
  if (!a) return '';
  const areas = [];
  if (Array.isArray(a.areas)) a.areas.forEach(x => areas.push(typeof x === 'string' ? x : JSON.stringify(x)));
  else if (a.areas) areas.push(String(a.areas));
  return [a.areaDesc,a.area,a.county,a.town,a.locationName,a.matchedCounty,a.matchedTown,a.matchedAreaName,...areas].filter(Boolean).join('｜');
}
function swPointInPoly(lat, lon, poly) {
  let inside = false;
  for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const yi=poly[i][0],xi=poly[i][1],yj=poly[j][0],xj=poly[j][1];
    const hit=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi);
    if(hit)inside=!inside;
  }
  return inside;
}
function swParsePolygon(v) {
  if (Array.isArray(v)) {
    if (v.length>=3 && Array.isArray(v[0])) return v.map(p=>[parseFloat(p[0]),parseFloat(p[1])]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
    return [];
  }
  return String(v||'').trim().split(/\s+/).map(x=>x.split(',').map(Number)).filter(p=>p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
}
function swGeometryContainsGps(a,pos) {
  const lat=swNum(pos&&pos.lat),lon=swNum(pos&&pos.lon); if(lat===null||lon===null||!a)return false;
  const vals=[];
  const walk=(v,d)=>{if(v==null||d>5)return;if(Array.isArray(v)){v.forEach(x=>walk(x,d+1));return}if(typeof v==='object'){for(const k in v){if(/polygon|geometry|coordinate|circle/i.test(k))vals.push(v[k]);walk(v[k],d+1)}}};
  walk(a,0);
  for(const v of vals){
    const poly=swParsePolygon(v);
    if(poly.length>=3&&(swPointInPoly(lat,lon,poly)||swPointInPoly(lat,lon,poly.map(p=>[p[1],p[0]]))))return true;
    if(typeof v==='string'){
      const m=v.trim().match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
      if(m){const d=swDistKm(lat,lon,parseFloat(m[1]),parseFloat(m[2]));if(d!==null&&d<=parseFloat(m[3]))return true}
    }
  }
  return false;
}
function swOfficialAlertScope(a,pos) {
  if(!a||a.matchedArea===false)return{match:'none',reason:'worker-no-match'};
  const p=pos&&pos.place||{},county=swIsValidCounty(p.county)?swCleanAreaName(p.county):'',town=swIsValidTown(p.town)?swCleanAreaName(p.town):'';
  if(!county&&!town)return{match:'none',reason:'no-place'};
  if(swGeometryContainsGps(a,pos))return{match:'local',reason:'geometry'};
  const text=swAlertAreaText(a),townVars=swTwVariants(town);
  if(town&&townVars.some(k=>k&&text.includes(k)))return{match:'local',reason:'town'};
  const listedTowns=(text.match(/[一-鿿]{1,8}[區鄉鎮]/g)||[]).map(swCleanAreaName);
  if(town&&listedTowns.length&&!listedTowns.some(x=>townVars.includes(x)))return{match:'none',reason:'other-towns'};
  const countyMatch=county&&swTwVariants(county).some(k=>k&&text.includes(k));
  return countyMatch?{match:'regional',reason:'county-only'}:{match:'none',reason:'no-area'};
}
function swOfficialAlertIsActive(a,cfg,cwaData) {
  if(!a)return false;
  const status=String(a.status||'Actual').toLowerCase(),msg=String(a.msgType||a.messageType||'Alert').toLowerCase();
  if(/test|exercise|draft|system/.test(status)||/cancel|error/.test(msg))return false;
  const vt=a.validTime||a.valid||{};
  let start=swParseTs(a.effective||a.onset||a.startTime||vt.startTime),end=swParseTs(a.expires||a.endTime||vt.endTime);
  if(!Number.isFinite(start)||!Number.isFinite(end)){
    const m=String(a.contentText||a.description||a.headline||'').match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/g)||[];
    if(!Number.isFinite(start)&&m[0])start=swParseTs(m[0]);
    if(!Number.isFinite(end)&&m[1])end=swParseTs(m[1]);
  }
  const now=Date.now();
  if(Number.isFinite(start)&&start>now+5*60000)return false;
  if(Number.isFinite(end)&&end<now-2*60000)return false;
  if(!Number.isFinite(start)&&!Number.isFinite(end)){
    const received=swParseTs(cwaData&&cwaData._clientFetchedAt),maxMin=parseInt(cfg.officialAlertCacheMaxMinutes,10)||10;
    if(!Number.isFinite(received)||now-received>maxMin*60000)return false;
  }
  return true;
}
function swAlertIdFromText(text) {
  text=String(text||'');
  if(/颱風/.test(text))return'typhoon';
  if(/豪雨|大雨|豪大雨|短延時強降雨/.test(text))return'heavyRain';
  if(/大雷雨|雷雨|雷擊/.test(text))return'storm';
  if(/強風|平均風|陣風/.test(text))return'strongWind';
  if(/高溫|橙色燈號|紅色燈號/.test(text))return'heat';
  if(/低溫|寒流/.test(text))return'cold';
  if(/濃霧|能見度/.test(text))return'fog';
  return'weather';
}
function swAlertIdentity(a,id) {
  const explicit=a&& (a.identifier||a.alertId||a.eventId||a.eventCode);
  if(explicit)return String(explicit);
  const start=String(a&& (a.effective||a.onset||a.startTime)||'');
  const area=swAlertAreaText(a).slice(0,160);
  const event=String(a&& (a.event||a.title||a.headline)||id||'alert');
  return [event,start,area].join('|');
}
function swAlertRevision(a) { return String(a&&(a.sent||a.updateTime||a.updatedAt||a.expires||a.endTime||a.effective)||'initial'); }
function swShortText(v,n=150){v=String(v||'').replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n)+'…':v;}
function swEvaluateCwaWeatherWarnings(cwaData,cfg,pos){
  const out=[]; if(!cwaData)return out;
  const all=[...(cwaData.officialAlerts||[]),...(cwaData.weatherWarnings||[]),...(cwaData.capAlerts||[]),...(cwaData.disasterAlerts||[])];
  const seen=new Set();
  for(const a of all){
    if(!swOfficialAlertIsActive(a,cfg,cwaData))continue;
    const scope=swOfficialAlertScope(a,pos); if(scope.match!=='local')continue; // 背景只推所在地精確命中
    const text=(a.event||'')+' '+(a.title||'')+' '+(a.headline||'')+' '+(a.description||'');
    const id=a.id||swAlertIdFromText(text); if(id==='weather'||cfg[id]===false)continue;
    const identity=swAlertIdentity(a,id),eventKey='official:'+id+':'+identity;
    if(seen.has(eventKey))continue;seen.add(eventKey);
    const area=swPlaceText(pos),desc=swShortText(a.description||a.headline||a.contentText||'',140);
    const titleMap={typhoon:'中央氣象署颱風警報',heavyRain:'中央氣象署豪大雨特報',storm:'中央氣象署雷雨特報',strongWind:'中央氣象署強風特報',heat:'中央氣象署高溫資訊',cold:'中央氣象署低溫特報',fog:'中央氣象署濃霧特報'};
    out.push({
      id,icon:({typhoon:'🌀',heavyRain:'🌧',storm:'⛈',strongWind:'💨',heat:'🥵',cold:'🥶',fog:'🌫'})[id]||'⚠️',
      title:titleMap[id]||'中央氣象署警特報',body:[area?'GPS所在地：'+area:'',desc].filter(Boolean).join('｜')||'中央氣象署官方警特報生效中',
      critical:id==='typhoon'||id==='storm'||id==='heavyRain',official:true,notifyEligible:true,eventKey,revisionKey:swAlertRevision(a)
    });
  }
  return out;
}

function swEqIntensityNumber(v){
  if(v===null||v===undefined)return null;if(typeof v==='number'&&Number.isFinite(v))return v;
  const m=String(v).trim().match(/([0-7])\s*(弱|強)?/);if(!m)return null;
  const n=Number(m[1]);return m[2]==='強'?n+0.5:n;
}
function swEqIntensityLabel(v){const n=swEqIntensityNumber(v);if(n===null)return'';const i=Math.floor(n);return i>=5?String(i)+(n-i>=.5?'強':'弱'):String(i);}
function swEqLocalIntensity(eq,pos){
  const p=pos&&pos.place||{},town=swCleanAreaName(p.town),county=swCleanAreaName(p.county);if(!town&&!county||!eq)return null;
  let best=null;
  const nameKeys=['townName','TownName','town','district','locationName','LocationName','areaName','AreaName','countyName','CountyName','county','areaDesc','description','name'];
  const intKeys=['intensity','Intensity','intensityValue','seismicIntensity','shakingIntensity','value','maxIntensity','MaxIntensity'];
  const visit=(v,d)=>{
    if(v==null||d>8)return;if(Array.isArray(v)){v.forEach(x=>visit(x,d+1));return}if(typeof v!=='object')return;
    const label=nameKeys.map(k=>v[k]).filter(x=>typeof x==='string').join(' ');
    const matchTown=town&&swTwVariants(town).some(k=>label.includes(k)),matchCounty=county&&swTwVariants(county).some(k=>label.includes(k));
    if(matchTown||matchCounty){for(const k of intKeys){const num=swEqIntensityNumber(v[k]);if(num!==null){const rank=matchTown?2:1;if(!best||rank>best.rank||(rank===best.rank&&num>best.value))best={value:num,label:swEqIntensityLabel(v[k]),area:label.trim(),rank};}}}
    for(const k in v)visit(v[k],d+1);
  };
  visit(eq,0);return best;
}
function swEqEventKey(eq){return String(eq&& (eq.no||eq.earthquakeNo||eq.identifier)||[eq&&eq.originTime,eq&&eq.lat,eq&&eq.lon,eq&&eq.magnitude].join('|'));}
function swEvaluateEarthquake(cwaData,cfg,pos){
  if(cfg.earthquake===false||!cwaData||!cwaData.earthquakeActive||!Array.isArray(cwaData.earthquakes))return null;
  const myLat=swNum(pos&&pos.lat),myLon=swNum(pos&&pos.lon);if(myLat===null||myLon===null)return null;
  const minMag=parseFloat(cfg.earthquakeMinMagnitude)||4,minInt=parseFloat(cfg.earthquakeMinIntensity)||3;
  const maxDist=(parseFloat(cfg.earthquakeMaxDistanceKm)>0)?parseFloat(cfg.earthquakeMaxDistanceKm):120;
  const maxAge=parseInt(cfg.earthquakeMaxAgeMinutes,10)||120,notifyAge=parseInt(cfg.earthquakeNotifyMaxAgeMinutes,10)||15,now=Date.now();
  const eqs=cwaData.earthquakes.slice().sort((a,b)=>(swParseTs(b.originTime||b.time||b.reportTime)||0)-(swParseTs(a.originTime||a.time||a.reportTime)||0));
  for(const eq of eqs){
    const eventTime=swParseTs(eq.originTime||eq.time||eq.reportTime),age=Number.isFinite(eventTime)?Math.max(0,(now-eventTime)/60000):Infinity;
    if(maxAge>0&&age>maxAge)continue;
    const mag=swNum(eq.magnitude),dep=Math.max(0,swNum(eq.focalDepth)||0),epi=swDistKm(myLat,myLon,eq.lat,eq.lon);if(epi===null)continue;
    const hypo=Math.sqrt(epi*epi+dep*dep),local=swEqLocalIntensity(eq,pos);
    // 有所在地觀測震度時，只採所在地震度；只有資料尚未提供所在地震度時，才採規模＋震源距離保守備援。
    const localOk=!!(local&&local.value>=minInt),fallbackOk=!local&&mag!==null&&mag>=minMag&&hypo<=maxDist;
    if(!localOk&&!fallbackOk)continue;
    const isEew=eq.isEew===true||/速報|EEW/i.test(String(eq.reportType||eq.type||eq.source||''));
    const parts=[];if(eq.location)parts.push('震央：'+eq.location);parts.push(`規模 ${mag!==null?mag.toFixed(1):'--'}，深度 ${dep.toFixed(1)} km`);
    if(local)parts.push('所在地觀測震度 '+(local.label||local.value));else if(eq.maxIntensityLabel&&eq.maxIntensityArea)parts.push(`全臺最大震度 ${eq.maxIntensityLabel} 於 ${eq.maxIntensityArea}`);
    parts.push(`震央距離約 ${Math.round(epi)} km`);if(Number.isFinite(eventTime))parts.push(`${Math.round(age)} 分鐘前`);
    const key=swEqEventKey(eq),critical=local?local.value>=5:(mag!==null&&mag>=6&&hypo<=100);
    return {id:'earthquake',icon:'🌍',title:`${isEew?'地震速報':'地震報告'} — M${mag!==null?mag.toFixed(1):'--'}`,body:parts.join('；'),critical,official:true,notifyEligible:age<=notifyAge,eventKey:'earthquake:'+key,revisionKey:'event:'+key};
  }
  return null;
}

function swTyphoonAreaMatch(cwaData,pos){
  const areas=Array.isArray(cwaData&&cwaData.affectedAreas)?cwaData.affectedAreas:[];
  if(!areas.length)return false;
  const text=areas.join('｜'),p=pos&&pos.place||{};
  const town=swCleanAreaName(p.town),county=swCleanAreaName(p.county);
  return (town&&swTwVariants(town).some(k=>text.includes(k)))||(county&&swTwVariants(county).some(k=>text.includes(k)));
}
function swEvaluateTyphoon(cwaData,cfg,pos){
  if(cfg.typhoon===false||!cwaData||!cwaData.active||!Array.isArray(cwaData.typhoons)||!cwaData.typhoons.length)return null;
  const ts=cwaData.typhoons.slice().sort((a,b)=>(swNum(a.distanceKm)||99999)-(swNum(b.distanceKm)||99999)),t=ts[0];
  const land=!!cwaData.landAlert,sea=!!cwaData.seaAlert,official=land||sea;
  const dist=Math.min(swNum(t.distanceKm)??Infinity,swNum(t.minForecastDistKm)??Infinity),distLim=parseFloat(cfg.typhoonAlertDistanceKm)||800;
  const localLand=land&&(cwaData.matchedArea===true||swTyphoonAreaMatch(cwaData,pos)),eligible=official&&(localLand||(sea&&dist<=distLim));
  if(!official)return null; // 背景只發正式海上/陸上警報；一般颱風動態留在 App 內。
  const name=t.nameZh||t.name||'颱風',level=land?'land':'sea';
  const parts=[];if(t.intensity)parts.push('強度：'+t.intensity);if(Number.isFinite(swNum(t.maxWindKmh)))parts.push(`最大風速 ${Math.round(t.maxWindKmh)} km/h`);if(Number.isFinite(swNum(t.distanceKm)))parts.push(`距${t.nearestPoint||'台灣'} ${Math.round(t.distanceKm)} km`);if(cwaData.affectedAreas&&cwaData.affectedAreas.length)parts.push('警戒區：'+cwaData.affectedAreas.slice(0,6).join('、'));
  const eventKey='typhoon:'+String(t.id||t.typhoonNo||t.name||name),revisionKey=[level,(cwaData.affectedAreas||[]).join(','),cwaData.issueTime||cwaData.sent||''].join('|');
  return {id:'typhoon',icon:'🌀',title:`颱風${land?'陸上':'海上'}警報 — ${name}`,body:parts.join('；'),critical:true,official:true,notifyEligible:eligible,eventKey,revisionKey};
}

function swRainObsAlert(cwaData,cfg,pos){
  const ro=cwaData&&cwaData.rainObservation;if(!ro)return null;
  const obs=swParseTs(ro.obsTime),age=Number.isFinite(obs)?Math.max(0,(Date.now()-obs)/60000):Infinity,dist=swNum(ro.distanceKm);
  if(age>20||dist===null||dist>10)return null;
  const r1=swNum(ro.rain1h),r3=swNum(ro.rain3h),r24=swNum(ro.rain24h);
  let level='';if((r3!==null&&r3>=100)||(r24!==null&&r24>=200))level='豪雨';else if((r1!==null&&r1>=40)||(r24!==null&&r24>=80))level='大雨';else return null;
  if(cfg.heavyRain===false)return null;
  const vals=[];if(r1!==null)vals.push(`1小時 ${r1.toFixed(1)}mm`);if(r3!==null)vals.push(`3小時 ${r3.toFixed(1)}mm`);if(r24!==null)vals.push(`24小時 ${r24.toFixed(1)}mm`);
  const station=ro.stationName||'雨量站',eventKey='rainobs:'+String(ro.stationId||station)+':'+level;
  return {id:'heavyRain',icon:'🌧',title:`本地雨量達${level}量級（非特報）`,body:`${station} 距離 ${dist.toFixed(dist<10?1:0)}km｜${vals.join('｜')}`,critical:level==='豪雨',realtimeObs:true,notifyEligible:true,eventKey,revisionKey:String(ro.obsTime||'')};
}
function swEvaluate(cwaData,cfg,pos){
  if(cfg.master===false)return[];
  const out=[];
  const eq=swEvaluateEarthquake(cwaData,cfg,pos);if(eq)out.push(eq);
  const ty=swEvaluateTyphoon(cwaData,cfg,pos);if(ty)out.push(ty);
  for(const a of swEvaluateCwaWeatherWarnings(cwaData,cfg,pos))if(!out.some(x=>x.eventKey===a.eventKey))out.push(a);
  const rain=swRainObsAlert(cwaData,cfg,pos);if(rain&&!out.some(x=>x.id==='heavyRain'||x.id==='storm'||x.id==='typhoon'))out.push(rain);
  return out;
}

function swInQuietHours(cfg){
  const qs=cfg.quietStart,qe=cfg.quietEnd;if(qs===undefined||qe===undefined||qs===qe)return false;
  const h=new Date().getHours();return qs<qe?(h>=qs&&h<qe):(h>=qs||h<qe);
}
function swNotifyKey(id){return({typhoon:'notifyTyphoon',storm:'notifyStorm',heavyRain:'notifyHeavyRain',rain:'notifyRain',strongWind:'notifyStrongWind',heat:'notifyHeat',cold:'notifyCold',fog:'notifyFog',earthquake:'notifyEarthquake'})[id];}
function swHash(s){let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36);}
function swStateRevision(v){return v&&typeof v==='object'?String(v.revision||''):String(v||'');}
function swPruneState(state,now){
  state.events=state.events&&typeof state.events==='object'?state.events:{};state.lastByType=state.lastByType&&typeof state.lastByType==='object'?state.lastByType:{};
  const max=45*24*3600*1000;for(const k in state.events){const v=state.events[k];if(v&&typeof v==='object'&&v.ts&&now-v.ts>max)delete state.events[k];}
  return state;
}
async function swFetchCwaData(pos,cfg){
  const now=Date.now();
  try{
    const req=new URL(CWA_DATA_URL);req.searchParams.set('lat',pos.lat);req.searchParams.set('lon',pos.lon);req.searchParams.set('gps','1');req.searchParams.set('areaMode','gps');
    if(pos.place&&pos.place.county)req.searchParams.set('county',pos.place.county);if(pos.place&&pos.place.town)req.searchParams.set('town',pos.place.town);req.searchParams.set('_',String(now));
    const resp=await Promise.race([fetch(req.toString(),{cache:'no-store'}),new Promise((_,r)=>setTimeout(()=>r(new Error('cwa timeout')),8000))]);
    if(!resp.ok)throw new Error('cwa '+resp.status);const d=await resp.json();if(!d||!d.ok)throw new Error('invalid cwa payload');
    d._clientFetchedAt=Date.now();await swPutWxCache('cwaData',{ts:d._clientFetchedAt,data:d});return d;
  }catch(e){
    const cached=await swGetCache('cwaData'),max=(parseInt(cfg.officialAlertCacheMaxMinutes,10)||10)*60000;
    if(cached&&cached.data&&cached.ts&&now-cached.ts<=max){cached.data._clientFetchedAt=cached.ts;return cached.data;}
    return null;
  }
}
let _swCheckPromise=null;
async function swBackgroundCheck(){
  if(_swCheckPromise)return _swCheckPromise;
  _swCheckPromise=(async()=>{
    try{
      let pos=await swGetCache('lastPos');if(!pos||!pos.lat||!pos.lon)return;
      let cfg=await swFetchAlertConfig();if(!cfg)cfg=(await swGetCache('wxAlerts'))||Object.assign({},ALERT_DEFS);else await swPutWxCache('wxAlerts',cfg);
      if(cfg.notifyEnabled===false||cfg.master===false)return;
      const prefs=(await swGetCache('userPrefs'))||{wxMaster:true,wxNotify:true,wxNotifyItems:{}};
      if(prefs.wxMaster===false||prefs.wxNotify===false)return;
      const posMax=(parseInt(cfg.backgroundPositionMaxAgeMinutes,10)||360)*60000;
      if(!pos.ts||Date.now()-Number(pos.ts)>posMax)return; // 位置過舊時寧可不推，避免人在外地仍收到舊地點警報。
      if(!pos.place||!swPlaceKeys(pos).length)pos.place=await swReverseGeocodeGps(pos);
      if(!pos.place||!swPlaceKeys(pos).length)return;
      const cwaData=await swFetchCwaData(pos,cfg);if(!cwaData)return;
      const alerts=swEvaluate(cwaData,cfg,pos);if(!alerts.length)return;
      const state=swPruneState((await swGetCache('notifyState'))||{},Date.now()),now=Date.now(),inQuiet=swInQuietHours(cfg),cooldownMs=(cfg.cooldownHours||3)*3600*1000;
      let changed=false;
      for(const a of alerts){
        if(a.notifyEligible===false)continue;
        const nk=swNotifyKey(a.id);if(!nk||cfg[nk]===false||(prefs.wxNotifyItems||{})[a.id]===false)continue;
        if(inQuiet&&(!cfg.quietIgnoreCritical||!a.critical))continue;
        const eventKey=String(a.eventKey||''),revision=String(a.revisionKey||a.body||'initial');
        if(eventKey&&swStateRevision(state.events[eventKey])===revision)continue;
        if(!eventKey&&now-(state.lastByType[a.id]||0)<cooldownMs)continue;
        try{
          await self.registration.showNotification(a.icon+' '+a.title,{
            body:a.body,icon:'./admin/icon-192.png',badge:'./admin/icon-192.png',
            tag:'wx-'+a.id+(eventKey?'-'+swHash(eventKey):''),renotify:true,requireInteraction:!!a.critical,
            vibrate:a.critical?[200,100,200,100,200]:[200],data:{type:'wx-alert',id:a.id,eventKey,ts:now}
          });
          if(eventKey)state.events[eventKey]={revision,ts:now};else state.lastByType[a.id]=now;
          changed=true;
        }catch(e){}
      }
      if(changed)await swPutWxCache('notifyState',state);
    }catch(e){console.log('swBackgroundCheck err',e)}
  })().finally(()=>{_swCheckPromise=null});
  return _swCheckPromise;
}

self.addEventListener('periodicsync',event=>{if(event.tag==='wx-alert-check')event.waitUntil(swBackgroundCheck());});

// ════════════════════════════════════════════════════════════════
// Web Push（階段 2 使用，預留接口；現在不會收到 push event）
// 若未來部署 Cloudflare Worker 推播後端，此處會自動接到 push
// ════════════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  event.waitUntil((async()=>{
    let data={};try{data=event.data?event.data.json():{}}catch(e){}
    const id=String(data.id||(data.data&&data.data.id)||'weather');
    const prefs=(await swGetCache('userPrefs'))||{wxMaster:true,wxNotify:true,wxNotifyItems:{}};
    const cfg=(await swGetCache('wxAlerts'))||Object.assign({},ALERT_DEFS);
    if(prefs.wxMaster===false||prefs.wxNotify===false||cfg.master===false||cfg.notifyEnabled===false)return;
    const nk=swNotifyKey(id);if(nk&&cfg[nk]===false)return;if((prefs.wxNotifyItems||{})[id]===false)return;
    const critical=!!data.critical;if(swInQuietHours(cfg)&&(!cfg.quietIgnoreCritical||!critical))return;
    const expires=swParseTs(data.expires||(data.data&&data.data.expires));if(Number.isFinite(expires)&&expires<Date.now())return;
    const eventKey=String(data.eventKey||(data.data&&data.data.eventKey)||''),revision=String(data.revisionKey||(data.data&&data.data.revisionKey)||data.sent||'push');
    const state=swPruneState((await swGetCache('notifyState'))||{},Date.now());
    if(eventKey&&swStateRevision(state.events[eventKey])===revision)return;
    const now=Date.now();
    await self.registration.showNotification(data.title||'⚠️ 災防警報',{
      body:data.body||'',icon:data.icon||'./admin/icon-192.png',badge:'./admin/icon-192.png',
      tag:data.tag||('wx-'+id+(eventKey?'-'+swHash(eventKey):'-push')),renotify:true,requireInteraction:critical,
      vibrate:critical?[200,100,200,100,200]:[200],data:Object.assign({},data.data||{},{type:'wx-alert',id,eventKey,ts:now})
    });
    if(eventKey)state.events[eventKey]={revision,ts:now};else state.lastByType[id]=now;
    await swPutWxCache('notifyState',state);
  })());
});
