const CACHE_NAME = 'myshift-v220-weather-accuracy';

self.addEventListener('install', event => {
  // 立即接管：避免 PWA 卡在舊 SW + 舊 cache
  self.skipWaiting();
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  // app 端寫入最後位置給 SW 用（背景同步抓天氣用）
  if (event.data && event.data.type === 'WX_POS' && event.data.lat && event.data.lon) {
    swPutWxCache('lastPos', { lat: event.data.lat, lon: event.data.lon, accuracy: event.data.accuracy || null, place: event.data.place || null, ts: event.data.ts || Date.now() });
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
// Periodic Background Sync：定期喚醒 SW 抓天氣並推送警報
// 注意：只有 Android Chrome 桌面/手機支援，iOS 完全不支援
// 觸發頻率由瀏覽器決定（最低 1 小時，視 engagement score）
// ════════════════════════════════════════════════════════════════
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CWA_FORECAST_URL = 'https://cwa-forecast.onerkk.workers.dev';
const FIRESTORE_PROJECT = 'myshift-a67f1';
const NOTIFY_STATE_CACHE = 'wx-notify-state-v1';

const ALERT_DEFS = {
  master: true, typhoon: true, storm: true, heavyRain: true, rain: true,
  strongWind: true, heat: true, cold: true, fog: false, earthquake: true,
  rainProb: 60, heavyRainProb: 80, windAlertMetric: 'gust', windThreshold: 62, windGustThreshold: 62, typhoonWind: 62,
  heatThreshold: 36, coldThreshold: 10,
  cwaWorkerUrl: '', typhoonWorkerUrl: '',
  typhoonAlertDistanceKm: 800, typhoonMinIntensity: 'td', typhoonAlertOnNotice: true,
  earthquakeMinMagnitude: 4.0, earthquakeMinIntensity: 3, earthquakeMaxDistanceKm: 120, earthquakeMaxAgeMinutes: 120,
  notifyEnabled: true,
  notifyTyphoon: true, notifyStorm: true, notifyHeavyRain: true, notifyRain: false,
  notifyStrongWind: true, notifyHeat: false, notifyCold: false, notifyFog: false,
  notifyEarthquake: true,
  cooldownHours: 3, quietStart: 22, quietEnd: 7, quietIgnoreCritical: true,
  timeWindows: { rain: [], heavyRain: [], strongWind: [], heat: [], cold: [], fog: [] }
};

const TYPHOON_INTENSITY_ORDER = { td: 0, mild: 1, moderate: 2, severe: 3 };

// 時段判定（與 app.js isInDetectionWindow 對應）
function swInDetectionWindow(alertId, cfg) {
  if (alertId === 'typhoon' || alertId === 'storm') return true;
  const tw = cfg.timeWindows && cfg.timeWindows[alertId];
  if (!tw || !tw.length) return true;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const w of tw) {
    if (!w || !w.start || !w.end) continue;
    const [sh, sm] = String(w.start).split(':').map(Number);
    const [eh, em] = String(w.end).split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) continue;
    const s = sh * 60 + (sm || 0), e = eh * 60 + (em || 0);
    if (s <= e) {
      if (cur >= s && cur <= e) return true;
    } else {
      if (cur >= s || cur <= e) return true;
    }
  }
  return false;
}

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

// 簡易 Firestore REST 讀取 — 取得 wxAlerts 設定（無需登入 token，僅讀 config/app）
// 注意：這需要 Firestore Rules 允許 config/app 公開讀取（一般 myshift 後台已是公開讀取）
function _fsValue(v) {
  if (v === null || v === undefined) return undefined;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) {
    return (v.arrayValue.values || []).map(_fsValue);
  }
  if (v.mapValue) {
    const out = {};
    const fs = v.mapValue.fields || {};
    for (const k in fs) out[k] = _fsValue(fs[k]);
    return out;
  }
  return undefined;
}
async function swFetchAlertConfig() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/config/app`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const fields = data.fields && data.fields.wxAlerts && data.fields.wxAlerts.mapValue && data.fields.wxAlerts.mapValue.fields;
    if (!fields) return null;
    const out = {};
    for (const k in fields) {
      const v = _fsValue(fields[k]);
      if (v !== undefined) out[k] = v;
    }
    const cfg = Object.assign({}, ALERT_DEFS, out);
    // v199：強風固定使用陣風門檻；legacy windThreshold 只做 alias。
    let gust = parseFloat(cfg.windGustThreshold);
    const legacy = parseFloat(cfg.windThreshold);
    if (Number.isFinite(legacy) && (!Number.isFinite(gust) || legacy !== gust)) gust = legacy;
    if (!Number.isFinite(gust) || gust <= 0) gust = 62;
    cfg.windAlertMetric = 'gust';
    cfg.windGustThreshold = gust;
    cfg.windThreshold = gust;
    return cfg;
  } catch (e) { return null; }
}


async function swFetchWeather(lat, lon) {
  const u = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation,wind_speed_10m,wind_gusts_10m&hourly=precipitation_probability,precipitation,rain,showers,temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m&timezone=auto&forecast_days=2&cell_selection=nearest`;
  const resp = await fetch(u);
  if (!resp.ok) throw new Error('wx api ' + resp.status);
  return await resp.json();
}

async function swFetchCwaForecast(pos) {
  if (!pos || !pos.lat || !pos.lon || !pos.place) return null;
  try {
    const u = new URL(CWA_FORECAST_URL);
    u.searchParams.set('lat', pos.lat); u.searchParams.set('lon', pos.lon);
    if (pos.place.county) u.searchParams.set('county', pos.place.county);
    if (pos.place.town) u.searchParams.set('town', pos.place.town);
    u.searchParams.set('_', String(Date.now()));
    const resp = await Promise.race([fetch(u.toString(), { cache: 'no-store' }), new Promise((_, r) => setTimeout(() => r(new Error('cwa forecast timeout')), 8000))]);
    if (!resp.ok) return null;
    const d = await resp.json();
    return d && d.ok && d.hourly ? d : null;
  } catch (e) { return null; }
}
function swMergeCwaForecast(wx, fc) {
  if (!wx || !wx.hourly || !Array.isArray(wx.hourly.time) || !fc || !fc.hourly) return false;
  const base = (wx.hourly.precipitation_probability || []).slice();
  const src = base.map(() => 'open-meteo'); let hit = 0;
  for (let i = 0; i < wx.hourly.time.length; i++) {
    const c = fc.hourly[String(wx.hourly.time[i]).slice(0, 13)];
    const raw = c && c.pop, p = (raw===null||raw===undefined||raw==='') ? NaN : Number(raw);
    if (Number.isFinite(p) && p >= 0 && p <= 100) { base[i] = Math.round(p); src[i] = 'cwa'; hit++; }
  }
  wx.hourly.precipitation_probability = base;
  wx.hourly.precipitation_probability_source = src;
  wx._popSource = hit ? 'cwa-mixed' : 'open-meteo';
  wx._popWindowH = Number(fc.popWindowHours) || null;
  return hit > 0;
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
  if (s.indexOf('臺') >= 0) out.push(s.replace(/臺/g, '台'));
  if (s.indexOf('台') >= 0) out.push(s.replace(/台/g, '臺'));
  return [...new Set(out.filter(Boolean))];
}
const SW_TW_COUNTY_SET = new Set('基隆市,臺北市,台北市,新北市,桃園市,新竹市,新竹縣,苗栗縣,臺中市,台中市,彰化縣,南投縣,雲林縣,嘉義市,嘉義縣,臺南市,台南市,高雄市,屏東縣,臺東縣,台東縣,花蓮縣,宜蘭縣,澎湖縣,金門縣,連江縣'.split(','));
function swIsBroadArea(s) {
  s = String(s || '').trim();
  return !s || /^(臺灣|台灣|中華民國|Taiwan|Taiwan Province|Republic of China|ROC)$/i.test(s) || /^(全臺|全台|全國|北部|中部|南部|東部|離島)$/.test(s);
}
function swIsValidCounty(s) {
  s = swCleanAreaName(s);
  return !!s && !swIsBroadArea(s) && SW_TW_COUNTY_SET.has(s);
}
function swIsValidTown(s) {
  s = swCleanAreaName(s);
  return !!s && !swIsBroadArea(s) && /[區鄉鎮市]$/.test(s) && !SW_TW_COUNTY_SET.has(s);
}
function swPickCounty() {
  for (const v of arguments) { const c = swCleanAreaName(v); if (swIsValidCounty(c)) return c; }
  return '';
}
function swPickTown() {
  for (const v of arguments) { const t = swCleanAreaName(v); if (swIsValidTown(t)) return t; }
  return '';
}
function swCleanAreaName(s) {
  s = String(s || '').trim();
  if (!s) return '';
  const map = {
    'Taipei City': '臺北市', 'New Taipei City': '新北市', 'Taoyuan City': '桃園市', 'Taichung City': '臺中市', 'Tainan City': '臺南市', 'Kaohsiung City': '高雄市',
    'Keelung City': '基隆市', 'Hsinchu City': '新竹市', 'Chiayi City': '嘉義市', 'Hsinchu County': '新竹縣', 'Miaoli County': '苗栗縣', 'Changhua County': '彰化縣', 'Nantou County': '南投縣', 'Yunlin County': '雲林縣', 'Chiayi County': '嘉義縣', 'Pingtung County': '屏東縣', 'Yilan County': '宜蘭縣', 'Hualien County': '花蓮縣', 'Taitung County': '臺東縣', 'Penghu County': '澎湖縣', 'Kinmen County': '金門縣', 'Lienchiang County': '連江縣',
    'Taiwan': '', 'Taiwan Province': '', 'Republic of China': '', 'ROC': '', '臺灣': '', '台灣': '', '臺灣省': '', '台灣省': ''
  };
  if (map[s] !== undefined) return map[s];
  s = s.replace(/^台灣省/, '').replace(/^臺灣省/, '').replace(/^Taiwan Province/i, '').trim();
  if (swIsBroadArea(s)) return '';
  return s;
}
function swExtractPlace(addr) {
  addr = addr || {};
  const county = swPickCounty(addr.county, addr.city, addr.state_district, addr.state);
  let town = swPickTown(addr.city_district, addr.town, addr.suburb, addr.village, addr.municipality, addr.district, addr.quarter);
  if (town === county) town = '';
  return { county, town };
}
async function swReverseGeocodeGps(pos) {
  if (!pos || !pos.lat || !pos.lon) return null;
  if (pos.place && swPlaceKeys(pos).length) return pos.place;
  if (pos.place && !swPlaceKeys(pos).length) pos.place = null;
  const cached = await swGetCache('lastPlace');
  const d = cached && swDistKm(pos.lat, pos.lon, cached.lat, cached.lon);
  if (cached && cached.county && cached.ts && Date.now() - cached.ts < 30 * 60 * 1000 && d !== null && d < 2) { const tmp={place:cached}; if(swPlaceKeys(tmp).length) return cached; }
  try {
    const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(pos.lat)}&lon=${encodeURIComponent(pos.lon)}&zoom=18&addressdetails=1&accept-language=zh-TW`;
    const resp = await Promise.race([fetch(u, { cache: 'no-store' }), new Promise((_, r) => setTimeout(() => r(new Error('reverse-timeout')), 4500))]);
    if (!resp.ok) return null;
    const data = await resp.json();
    const p = swExtractPlace(data && data.address || {});
    if (!p.county && !p.town) return null;
    const out = { county: p.county || '', town: p.town || '', display: [p.county, p.town].filter(Boolean).join(' '), source: 'gps-reverse', lat: pos.lat, lon: pos.lon, ts: Date.now() };
    await swPutWxCache('lastPlace', out);
    pos.place = out;
    await swPutWxCache('lastPos', pos);
    return out;
  } catch (e) {
    try {
      const u2 = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(pos.lat)}&longitude=${encodeURIComponent(pos.lon)}&localityLanguage=zh`;
      const r2 = await Promise.race([fetch(u2, { cache: 'no-store' }), new Promise((_, r) => setTimeout(() => r(new Error('reverse2-timeout')), 4500))]);
      if (r2.ok) {
        const d2 = await r2.json();
        const admin = d2.localityInfo && d2.localityInfo.administrative || [];
        const pick = admin.find(x => /區|鎮|鄉|District|Township/i.test(x.description || ''));
        const county = swPickCounty(d2.principalSubdivision, d2.city, (admin.find(x => /縣|市|County|City/i.test(x.description || '')) || {}).name);
        const town = swPickTown(d2.locality, pick && pick.name);
        if (county || town) {
          const out = { county: county || '', town: town && town !== county ? town : '', display: [county, town && town !== county ? town : ''].filter(Boolean).join(' '), source: 'gps-reverse-bdc', lat: pos.lat, lon: pos.lon, ts: Date.now() };
          await swPutWxCache('lastPlace', out);
          pos.place = out;
          await swPutWxCache('lastPos', pos);
          return out;
        }
      }
    } catch (e2) {}
    return null;
  }
}
function swPlaceKeys(pos) {
  const p = pos && pos.place;
  if (!p) return [];
  const county = swIsValidCounty(p.county) ? swCleanAreaName(p.county) : '';
  const town = swIsValidTown(p.town) ? swCleanAreaName(p.town) : '';
  if (!county && !town) return [];
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
  const p = pos && pos.place;
  if (!p) return '';
  const county = swIsValidCounty(p.county) ? swCleanAreaName(p.county) : '';
  const town = swIsValidTown(p.town) ? swCleanAreaName(p.town) : '';
  return [county, town].filter(Boolean).join(' ');
}
function swMatchedAreaLabel(a, pos) {
  const place = swPlaceText(pos);
  const keys = swPlaceKeys(pos);
  const areas = Array.isArray(a && a.areas) ? a.areas.filter(Boolean) : [];
  const matched = areas.filter(x => keys.some(k => String(x).indexOf(k) >= 0 || String(k).indexOf(x) >= 0));
  if (place) return place + (matched.length && matched[0] !== place ? '（' + matched.slice(0, 3).join('、') + '）' : '');
  return matched.slice(0, 3).join('、');
}
function swAreaMatchesGps(text, pos) {
  text = String(text || '');
  if (!text) return false;
  const keys = swPlaceKeys(pos);
  if (!keys.length) return false;
  return keys.some(k => k && text.indexOf(k) >= 0);
}
function swParseTs(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  let t = String(v).trim();
  if (!t) return NaN;
  // CWA 未附時區的時間視為臺灣時間，避免不同裝置各自解讀。
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(t)) t = t.replace(' ', 'T') + '+08:00';
  const n = new Date(t).getTime();
  return Number.isFinite(n) ? n : NaN;
}
function swAlertAreaText(a) {
  if (!a) return '';
  const areas = [];
  if (Array.isArray(a.areas)) a.areas.forEach(x => areas.push(typeof x === 'string' ? x : JSON.stringify(x)));
  else if (a.areas) areas.push(String(a.areas));
  return [a.areaDesc, a.area, a.county, a.town, a.locationName, a.matchedCounty, a.matchedTown, a.matchedAreaName, ...areas].filter(Boolean).join('｜');
}
function swPointInPoly(lat, lon, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
    const hit = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}
function swParseCapPolygon(v) {
  if (Array.isArray(v)) {
    if (v.length >= 3 && Array.isArray(v[0])) return v.map(p => [parseFloat(p[0]), parseFloat(p[1])]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    return [];
  }
  return String(v || '').trim().split(/\s+/).map(x => x.split(',').map(Number)).filter(p => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
}
function swGeometryContainsGps(a, pos) {
  if (!a || !pos) return false;
  const lat = parseFloat(pos.lat), lon = parseFloat(pos.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  const vals = [];
  const walk = (v, d) => {
    if (v == null || d > 5) return;
    if (Array.isArray(v)) { v.forEach(x => walk(x, d + 1)); return; }
    if (typeof v === 'object') {
      for (const k in v) { if (/polygon|geometry|coordinate|circle/i.test(k)) vals.push(v[k]); walk(v[k], d + 1); }
    }
  };
  walk(a, 0);
  for (const v of vals) {
    const poly = swParseCapPolygon(v);
    if (poly.length >= 3) {
      // CAP 常用 lat,lon；GeoJSON 常用 lon,lat，兩種都驗證。
      if (swPointInPoly(lat, lon, poly) || swPointInPoly(lat, lon, poly.map(p => [p[1], p[0]]))) return true;
    }
    if (typeof v === 'string') {
      const m = v.trim().match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
      if (m) { const d = swDistKm(lat, lon, parseFloat(m[1]), parseFloat(m[2])); if (d !== null && d <= parseFloat(m[3])) return true; }
    }
  }
  return false;
}
function swOfficialAlertScope(a, pos) {
  if (!a || a.matchedArea === false) return { match: 'none', reason: 'worker-no-match' };
  const p = pos && pos.place || {};
  const county = swIsValidCounty(p.county) ? swCleanAreaName(p.county) : '';
  const town = swIsValidTown(p.town) ? swCleanAreaName(p.town) : '';
  if (!county && !town) return { match: 'none', reason: 'no-place' };
  if (swGeometryContainsGps(a, pos)) return { match: 'local', reason: 'geometry' };
  const text = swAlertAreaText(a);
  const townVars = swTwVariants(town);
  if (town && townVars.some(k => k && text.indexOf(k) >= 0)) return { match: 'local', reason: 'town' };
  // 明確列出其他鄉鎮時，同縣市名稱不能再被誤判成本地警報。
  const listedTowns = (text.match(/[一-鿿]{1,8}[區鄉鎮]/g) || []).map(swCleanAreaName);
  if (town && listedTowns.length && !listedTowns.some(x => swTwVariants(town).includes(x))) return { match: 'none', reason: 'other-towns' };
  const countyMatch = county && swTwVariants(county).some(k => k && text.indexOf(k) >= 0);
  if (countyMatch) return { match: 'regional', reason: 'county-only' };
  return { match: 'none', reason: 'no-area' };
}
function swOfficialAlertMatchesGps(a, pos) {
  return swOfficialAlertScope(a, pos).match === 'local';
}
function swOfficialAlertIsActive(a) {
  if (!a) return false;
  const vt = a.validTime || a.valid || {};
  let start = swParseTs(a.effective || a.onset || a.startTime || vt.startTime);
  let end = swParseTs(a.expires || a.endTime || vt.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    const raw = String(a.contentText || a.description || a.headline || '');
    const m = raw.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/g) || [];
    if (!Number.isFinite(start) && m[0]) start = swParseTs(m[0]);
    if (!Number.isFinite(end) && m[1]) end = swParseTs(m[1]);
  }
  const now = Date.now();
  if (Number.isFinite(start) && start > now + 5 * 60 * 1000) return false;
  if (Number.isFinite(end) && end < now - 2 * 60 * 1000) return false;
  return true;
}

function swTextIncludesAny(text, arr) { return arr.some(k => text.indexOf(k) >= 0); }
function swPickCwaText(v, depth, bag) {
  if (!v || depth > 6 || bag.length > 120) return;
  if (typeof v === 'string') { const t = v.trim(); if (t && t.length < 600) bag.push(t); return; }
  if (Array.isArray(v)) { for (const x of v) swPickCwaText(x, depth + 1, bag); return; }
  if (typeof v === 'object') {
    const prefer = ['title','headline','event','phenomena','significance','description','desc','content','contentText','text','areaDesc','instruction','senderName','effective','expires','area','areas','locationName','county','town'];
    for (const k of prefer) if (v[k] !== undefined) swPickCwaText(v[k], depth + 1, bag);
    let n = 0;
    for (const k in v) { if (n++ > 40) break; if (prefer.includes(k)) continue; swPickCwaText(v[k], depth + 1, bag); }
  }
}
function swEvaluateCwaWeatherWarnings(cwaData, cfg, pos) {
  const out = [];
  if (!cwaData) return out;
  // 背景通知只允許「精確鄉鎮或 CAP 幾何範圍命中」且仍在有效期內的官方警特報。
  // 縣市級但無法確認目前鄉鎮者，前景可標示為區域公告，背景不得推播。
  const raw = (cwaData.officialAlerts || cwaData.weatherWarnings || []).filter(a => swOfficialAlertMatchesGps(a, pos) && swOfficialAlertIsActive(a));
  const detailFromAlert = a => {
    const parts = [];
    const area = swMatchedAreaLabel(a, pos);
    if (area) parts.push('GPS所在地：' + area);
    const desc = String(a.description || a.headline || '').replace(/\s+/g, ' ').trim();
    if (desc) parts.push(desc.length > 120 ? desc.slice(0, 120) + '…' : desc);
    return parts.join('｜') || '中央氣象署官方警特報生效中';
  };
  const idFromText = text => {
    text = String(text || '');
    if (/颱風/.test(text)) return 'typhoon';
    if (/豪雨|大雨|豪大雨|短延時強降雨/.test(text)) return 'heavyRain';
    if (/大雷雨|雷雨|雷擊/.test(text)) return 'storm';
    if (/強風|平均風|陣風/.test(text)) return 'strongWind';
    if (/高溫|橙色燈號|紅色燈號/.test(text)) return 'heat';
    if (/低溫|寒流/.test(text)) return 'cold';
    if (/濃霧|能見度/.test(text)) return 'fog';
    return 'weather';
  };
  const titleMap = { heavyRain: '中央氣象署豪大雨特報', storm: '中央氣象署雷雨特報', strongWind: '中央氣象署強風特報', heat: '中央氣象署高溫資訊', cold: '中央氣象署低溫特報', fog: '中央氣象署濃霧特報', typhoon: '中央氣象署颱風警報' };
  const seen = new Set();
  for (const a of raw) {
    const id = a.id || idFromText((a.event || '') + ' ' + (a.title || '') + ' ' + (a.headline || '') + ' ' + (a.description || ''));
    if (id === 'weather' || cfg[id] === false) continue;
    const key = id + '|' + (a.event || a.title || '') + '|' + (Array.isArray(a.areas) ? a.areas.join(',') : (a.areas || ''));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, icon: ({ heavyRain: '🌧', storm: '⛈', strongWind: '💨', heat: '🥵', cold: '🥶', fog: '🌫', typhoon: '🌀' })[id] || '⚠️', title: titleMap[id] || '中央氣象署天氣警特報', body: detailFromAlert(a), critical: id === 'typhoon' || id === 'storm' || id === 'heavyRain', official: true });
  }
  // 不再掃描整包 JSON 文字猜警報；沒有結構化區域與有效時間就不背景推播。
  return out;
}

// SW 端的警報判斷（簡化版，與 app.js evaluateWxAlerts 邏輯一致）
function swEvaluate(wxData, cfg, cwaData, pos) {
  const out = [];
  if (cfg.master === false) return out;

  // ═══ 地震警報（CWA 官方）═══
  if (cfg.earthquake !== false && cwaData && cwaData.earthquakeActive && cwaData.earthquakes && cwaData.earthquakes.length) {
    const minMag = parseFloat(cfg.earthquakeMinMagnitude) || 4.0;
    const minInt = parseFloat(cfg.earthquakeMinIntensity) || 3;
    const rawMaxDist = parseFloat(cfg.earthquakeMaxDistanceKm);
    const maxDist = Number.isFinite(rawMaxDist) && rawMaxDist > 0 ? rawMaxDist : 120;
    const myLat = pos && pos.lat ? parseFloat(pos.lat) : null;
    const myLon = pos && pos.lon ? parseFloat(pos.lon) : null;
    if (myLat === null || myLon === null || isNaN(myLat) || isNaN(myLon)) {
      // 沒有 GPS 就不推地震，避免全台誤報
    } else {
    const maxAge = parseInt(cfg.earthquakeMaxAgeMinutes) || 120;
    const now = Date.now();
    for (const eq of cwaData.earthquakes) {
      if (maxAge > 0 && eq.originTime) {
        const eqTime = new Date(eq.originTime.replace(' ', 'T') + '+08:00').getTime();
        if (isNaN(eqTime)) continue;
        if ((now - eqTime) / 60000 > maxAge) continue;
      }
      if (eq.magnitude < minMag && eq.maxIntensity < minInt) continue;
      const myDist = swDistKm(myLat, myLon, eq.lat, eq.lon);
      if (myDist === null || myDist > maxDist) continue;
      const parts = [];
      if (eq.location) parts.push(`震央：${eq.location}`);
      parts.push(`規模 ${eq.magnitude.toFixed(1)}，深度 ${eq.focalDepth.toFixed(1)} km`);
      if (eq.maxIntensityLabel && eq.maxIntensityArea) parts.push(`最大震度 ${eq.maxIntensityLabel} 於 ${eq.maxIntensityArea}`);
      parts.push(`距您約 ${Math.round(myDist)} km`);
      if (eq.originTime) parts.push(`發生於 ${eq.originTime.slice(11, 16)}`);
      out.push({
        id: 'earthquake',
        icon: '🌍',
        title: `🌍 地震 M${eq.magnitude.toFixed(1)}`,
        body: parts.join('；'),
        critical: eq.maxIntensity >= 5,
        eqNo: eq.no
      });
      break; // 只推最新一筆
    }
    }
  }

  // 官方警特報已在上方用精確 GPS 鄉鎮/CAP 幾何與有效時間篩選；不得再被另一套模型反向否決。
  const cwaAlerts = swEvaluateCwaWeatherWarnings(cwaData, cfg, pos);

  if (!wxData) {
    for (const a of cwaAlerts) if (!out.some(x => x.id === a.id)) out.push(a);
    return out;
  }
  const n = new Date();
  const nh = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0') + 'T' + String(n.getHours()).padStart(2, '0');
  const hi = wxData.hourly && wxData.hourly.time ? wxData.hourly.time.findIndex(s => s.startsWith(nh)) : -1;
  const curCode = wxData.current ? wxData.current.weather_code : 0;
  const curTemp = wxData.current ? Math.round(wxData.current.temperature_2m) : 0;
  const hPrec = (wxData.hourly && wxData.hourly.precipitation_probability) || [];
  const hPrecSource = (wxData.hourly && wxData.hourly.precipitation_probability_source) || [];
  const hRain = (wxData.hourly && wxData.hourly.precipitation) || [];
  const hWind = (wxData.hourly && wxData.hourly.wind_speed_10m) || [];
  const hGust = (wxData.hourly && (wxData.hourly.wind_gusts_10m || wxData.hourly.wind_speed_10m)) || [];
  const curWind = hi >= 0 ? (hWind[hi] || 0) : 0;
  const curGust = (wxData.current && (wxData.current.wind_gusts_10m || wxData.current.wind_speed_10m)) || (hi >= 0 ? (hGust[hi] || curWind) : curWind);

  function maxRain(hours) {
    if (hi < 0) return { value: 0, source: 'none' };
    let mx = -1, source = 'none';
    for (let k = hi; k < Math.min(hi + hours, hPrec.length); k++) {
      const raw = hPrec[k], v = (raw===null||raw===undefined||raw==='') ? NaN : Number(raw);
      if (Number.isFinite(v) && v > mx) { mx = v; source = hPrecSource[k] || 'open-meteo'; }
    }
    return { value: Math.max(0, mx), source };
  }
  function maxPrecipMm(hours) {
    if (hi < 0) return 0;
    let mx = 0;
    for (let k = hi; k < Math.min(hi + hours, hRain.length); k++) {
      const v = parseFloat(hRain[k]) || 0;
      if (v > mx) mx = v;
    }
    return mx;
  }
  function maxGust(hours) {
    if (hi < 0) return 0;
    let mx = 0;
    const arr = hGust.length ? hGust : hWind;
    for (let k = hi; k < Math.min(hi + hours, arr.length); k++) {
      const v = parseFloat(arr[k]) || 0;
      if (v > mx) mx = v;
    }
    return mx;
  }

  for (const a of cwaAlerts) {
    if (!out.some(x => x.id === a.id)) out.push(a);
  }

  // CWA 颱風優先
  let cwaUsed = false;
  if (cfg.typhoon !== false && cwaData && cwaData.active && cwaData.typhoons && cwaData.typhoons.length) {
    const minIntOrder = TYPHOON_INTENSITY_ORDER[cfg.typhoonMinIntensity || 'td'] || 0;
    const distLim = cfg.typhoonAlertDistanceKm || 800;
    const hasOfficial = cwaData.seaAlert || cwaData.landAlert;
    const matched = cwaData.typhoons.filter(t => {
      const intOk = (TYPHOON_INTENSITY_ORDER[t.intensityId] || 0) >= minIntOrder;
      if (!intOk) return false;
      if (cfg.typhoonAlertOnNotice !== false && hasOfficial) return true;
      return t.distanceKm <= distLim || t.minForecastDistKm <= distLim;
    });
    if (matched.length) {
      matched.sort((a, b) => ((TYPHOON_INTENSITY_ORDER[b.intensityId] || 0) - (TYPHOON_INTENSITY_ORDER[a.intensityId] || 0)) || (a.distanceKm - b.distanceKm));
      const t = matched[0];
      const title = cwaData.landAlert ? `🌀 颱風陸上警報 — ${t.nameZh || t.name}`
        : cwaData.seaAlert ? `🌀 颱風海上警報 — ${t.nameZh || t.name}`
        : `🌀 ${t.intensityShort || t.intensity} ${t.nameZh || t.name}`;
      const parts = [];
      parts.push(`強度：${t.intensity}（${t.maxWindKmh} km/h）`);
      if (t.distanceKm) parts.push(`距${t.nearestPoint || '台灣'} ${t.distanceKm} km`);
      if (t.movingDirection && t.movingSpeedKmh) parts.push(`向${t.movingDirection}移動 ${t.movingSpeedKmh} km/h`);
      out.push({ id: 'typhoon', icon: '🌀', title: title, body: parts.join('；'), critical: true });
      cwaUsed = true;
    }
  }

  // Open-Meteo 推算颱風（僅在 CWA 沒觸發時）
  if (!cwaUsed && cfg.typhoon !== false) {
    const wTh = cfg.typhoonWind || 62;
    const w6 = maxGust(6), r6 = maxRain(6).value;
    const isStorm = (curCode === 95 || curCode === 96 || curCode === 99);
    if ((curGust >= wTh || w6 >= wTh) && (isStorm || r6 >= 80)) {
      out.push({ id: 'typhoon', icon: '🌀', title: '劇烈風雨模型提醒', body: `模型陣風最高 ${Math.round(Math.max(curGust, w6))} km/h；不是中央氣象署颱風警報`, critical: false, modelOnly: true });
    }
  }
  if (cfg.storm !== false && (curCode === 95 || curCode === 96 || curCode === 99)) {
    out.push({ id: 'storm', icon: '⛈', title: '雷雨模型提醒', body: '模型格點顯示雷雨；請以雷達與中央氣象署警特報確認', critical: false, modelOnly: true });
  }
  if (cfg.heavyRain !== false && swInDetectionWindow('heavyRain', cfg) && !out.some(a => a.id === 'heavyRain' || a.id === 'storm' || a.id === 'typhoon')) {
    const r = maxRain(6), mm = maxPrecipMm(6), officialForecast = r.source === 'cwa' && r.value >= (cfg.heavyRainProb || 80);
    if (r.value >= (cfg.heavyRainProb || 80) || mm >= 10) {
      out.push({ id: 'heavyRainModel', icon: '🌧', title: '高降雨機率預報', body: `未來 6 小時最高降雨機率 ${r.value}%${mm ? `，模式預估雨量 ${mm.toFixed(1)} mm/h` : ''}；機率來源：${r.source === 'cwa' ? '中央氣象署鄉鎮預報' : 'Open-Meteo 模式備援'}，非豪雨特報`, critical: false, modelOnly: !officialForecast, officialForecast });
    }
  }
  if (cfg.rain !== false && swInDetectionWindow('rain', cfg) && !out.some(a => a.id === 'heavyRain' || a.id === 'heavyRainModel' || a.id === 'storm' || a.id === 'typhoon')) {
    const r = maxRain(3), isCwa = r.source === 'cwa';
    if (r.value >= (cfg.rainProb || 60)) {
      out.push({ id: 'rain', icon: '🌂', title: '降雨預報提醒', body: `未來 3 小時最高降雨機率 ${r.value}%；來源：${isCwa ? '中央氣象署鄉鎮預報' : 'Open-Meteo 模式備援'}，不是即時雨量觀測`, critical: false, modelOnly: !isCwa, officialForecast: isCwa });
    }
  }
  if (cfg.strongWind !== false && swInDetectionWindow('strongWind', cfg) && !out.some(a => a.id === 'typhoon' || a.id === 'strongWind')) {
    const w3 = maxGust(3);
    const mxW = Math.max(curGust, w3);
    const th = parseFloat(cfg.windGustThreshold || cfg.windThreshold) || 62;
    if (mxW >= th) {
      out.push({ id: 'strongWind', icon: '💨', title: '強風模型提醒', body: `模型最大陣風 ${Math.round(mxW)} km/h；不是官方強風特報`, critical: false, modelOnly: true });
    }
  }
  if (cfg.heat !== false && swInDetectionWindow('heat', cfg) && !out.some(a => a.id === 'heat') && curTemp >= (cfg.heatThreshold || 36)) {
    out.push({ id: 'heat', icon: '🥵', title: '高溫模型提醒', body: `模型目前值 ${curTemp}°C，多補水`, critical: false, modelOnly: true });
  }
  if (cfg.cold !== false && swInDetectionWindow('cold', cfg) && !out.some(a => a.id === 'cold') && curTemp <= (cfg.coldThreshold || 10)) {
    out.push({ id: 'cold', icon: '🥶', title: '低溫模型提醒', body: `模型目前值 ${curTemp}°C，注意保暖`, critical: false, modelOnly: true });
  }
  if (cfg.fog === true && swInDetectionWindow('fog', cfg) && !out.some(a => a.id === 'fog') && (curCode === 45 || curCode === 48)) {
    out.push({ id: 'fog', icon: '🌫', title: '濃霧模型提醒', body: '模型顯示能見度可能偏低；請以現場與官方資訊確認', critical: false, modelOnly: true });
  }
  return out;
}

function swInQuietHours(cfg) {
  const qs = cfg.quietStart, qe = cfg.quietEnd;
  if (qs === undefined || qe === undefined || qs === qe) return false;
  const h = new Date().getHours();
  if (qs < qe) return h >= qs && h < qe;
  return h >= qs || h < qe;
}

async function swBackgroundCheck() {
  try {
    // 取最後一次已知 GPS 位置；沒有 GPS 就不做背景警報，避免固定地點誤報
    let pos = await swGetCache('lastPos');
    if (!pos || !pos.lat || !pos.lon) return;
    if (!pos.place || !swPlaceKeys(pos).length) pos.place = await swReverseGeocodeGps(pos);
    // 同步取設定（先 Firestore，失敗用 cache）
    let cfg = await swFetchAlertConfig();
    if (!cfg) cfg = (await swGetCache('wxAlerts')) || Object.assign({}, ALERT_DEFS);
    else await swPutWxCache('wxAlerts', cfg);

    if (cfg.notifyEnabled === false || cfg.master === false) return;

    // 抓天氣（地震不依賴天氣，但其他警報要）
    let wx = null;
    try { wx = await swFetchWeather(pos.lat, pos.lon); } catch (e) {}
    // 與前景一致：降雨機率優先採 CWA 鄉鎮預報原始值；失敗才保留 Open-Meteo。
    if (wx) {
      try { const fc = await swFetchCwaForecast(pos); if (fc) swMergeCwaForecast(wx, fc); } catch (e) {}
    }

    // 抓 CWA 資料（颱風 + 地震）— Worker URL 已寫死
    let cwaData = null;
    const cwaUrl = 'https://cwa-data.onerkk.workers.dev';
    if (cwaUrl) {
      try {
        const req = new URL(cwaUrl);
        req.searchParams.set('lat', pos.lat);
        req.searchParams.set('lon', pos.lon);
        req.searchParams.set('gps', '1');
        req.searchParams.set('areaMode', 'gps');
        if (pos.place && pos.place.county) req.searchParams.set('county', pos.place.county);
        if (pos.place && pos.place.town) req.searchParams.set('town', pos.place.town);
        req.searchParams.set('_', String(Date.now()));
        const resp = await fetch(req.toString(), { cache: 'no-store' });
        if (resp.ok) {
          const td = await resp.json();
          if (td && td.ok) cwaData = td;
        }
      } catch (e) {}
    }

    const alerts = swEvaluate(wx, cfg, cwaData, pos);
    if (!alerts.length) return;

    const inQuiet = swInQuietHours(cfg);
    const cooldownMs = (cfg.cooldownHours || 3) * 3600 * 1000;
    const now = Date.now();
    let state = (await swGetCache('notifyState')) || {};

    for (const a of alerts) {
      // 模型預報只在 App 內作提醒；背景通知只發官方警特報與地震/颱風官方資料。
      if (a.modelOnly) continue;
      const notifyKey = ({ typhoon: 'notifyTyphoon', storm: 'notifyStorm', heavyRain: 'notifyHeavyRain', rain: 'notifyRain', strongWind: 'notifyStrongWind', heat: 'notifyHeat', cold: 'notifyCold', fog: 'notifyFog', earthquake: 'notifyEarthquake' })[a.id];
      if (!notifyKey) continue;   // 無 notify key（如 heavyRainModel 模型提醒）只顯示橫幅、不推播，與 app.js 一致
      if (cfg[notifyKey] === false) continue;
      if (inQuiet) {
        if (!cfg.quietIgnoreCritical) continue;
        if (!a.critical) continue;
      }
      // 地震去重：用 EarthquakeNo（瞬發事件，不用時間冷卻）
      if (a.id === 'earthquake' && a.eqNo) {
        if (state._eqLastNo === a.eqNo) continue;
        state._eqLastNo = a.eqNo;
      } else {
        const last = state[a.id] || 0;
        if (now - last < cooldownMs) continue;
      }
      try {
        await self.registration.showNotification(a.icon + ' ' + a.title, {
          body: a.body,
          icon: './admin/icon-192.png',
          badge: './admin/icon-192.png',
          tag: 'wx-' + a.id,
          renotify: true,
          requireInteraction: a.critical,
          vibrate: a.critical ? [200, 100, 200, 100, 200] : [200],
          data: { type: 'wx-alert', id: a.id, ts: now }
        });
        if (a.id !== 'earthquake') state[a.id] = now;
      } catch (e) {}
    }
    await swPutWxCache('notifyState', state);
  } catch (e) {
    console.log('swBackgroundCheck err', e);
  }
}

self.addEventListener('periodicsync', event => {
  if (event.tag === 'wx-alert-check') {
    event.waitUntil(swBackgroundCheck());
  }
});

// ════════════════════════════════════════════════════════════════
// Web Push（階段 2 使用，預留接口；現在不會收到 push event）
// 若未來部署 Cloudflare Worker 推播後端，此處會自動接到 push
// ════════════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || '⚠️ 天氣警報';
  const opts = {
    body: data.body || '',
    icon: data.icon || './admin/icon-192.png',
    badge: './admin/icon-192.png',
    tag: data.tag || 'wx-push',
    renotify: true,
    requireInteraction: !!data.critical,
    vibrate: data.critical ? [200, 100, 200, 100, 200] : [200],
    data: data.data || {}
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});
