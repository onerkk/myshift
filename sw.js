const CACHE_NAME = 'myshift-v181';

self.addEventListener('install', event => {
  // 新 SW 等使用者下次開啟 app 才接管，避免操作中被打斷
  // 若需要立即更新，可透過 postMessage('SKIP_WAITING') 主動觸發
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  // app 端寫入最後位置給 SW 用（背景同步抓天氣用）
  if (event.data && event.data.type === 'WX_POS' && event.data.lat && event.data.lon) {
    swPutWxCache('lastPos', { lat: event.data.lat, lon: event.data.lon });
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
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  url.search = '';
  const cacheKey = url.toString();

  event.respondWith(
    fetch(event.request)
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
const FIRESTORE_PROJECT = 'myshift-a67f1';
const NOTIFY_STATE_CACHE = 'wx-notify-state-v1';

const ALERT_DEFS = {
  master: true, typhoon: true, storm: true, heavyRain: true, rain: true,
  strongWind: true, heat: true, cold: true, fog: false, earthquake: true,
  rainProb: 60, heavyRainProb: 80, windThreshold: 50, typhoonWind: 62,
  heatThreshold: 36, coldThreshold: 10,
  cwaWorkerUrl: '', typhoonWorkerUrl: '',
  typhoonAlertDistanceKm: 800, typhoonMinIntensity: 'td', typhoonAlertOnNotice: true,
  earthquakeMinMagnitude: 4.0, earthquakeMinIntensity: 3, earthquakeMaxDistanceKm: 0, earthquakeMaxAgeMinutes: 120,
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
    return Object.assign({}, ALERT_DEFS, out);
  } catch (e) { return null; }
}

async function swFetchWeather(lat, lon) {
  const u = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=precipitation_probability,temperature_2m,weather_code,wind_speed_10m&timezone=auto&forecast_days=2`;
  const resp = await fetch(u);
  if (!resp.ok) throw new Error('wx api ' + resp.status);
  return await resp.json();
}

// SW 端的警報判斷（簡化版，與 app.js evaluateWxAlerts 邏輯一致）
function swEvaluate(wxData, cfg, cwaData) {
  const out = [];
  if (cfg.master === false) return out;

  // ═══ 地震警報（CWA 官方）═══
  if (cfg.earthquake !== false && cwaData && cwaData.earthquakeActive && cwaData.earthquakes && cwaData.earthquakes.length) {
    const minMag = parseFloat(cfg.earthquakeMinMagnitude) || 4.0;
    const minInt = parseFloat(cfg.earthquakeMinIntensity) || 3;
    const maxAge = parseInt(cfg.earthquakeMaxAgeMinutes) || 120;
    const now = Date.now();
    for (const eq of cwaData.earthquakes) {
      if (maxAge > 0 && eq.originTime) {
        const eqTime = new Date(eq.originTime.replace(' ', 'T') + '+08:00').getTime();
        if (isNaN(eqTime)) continue;
        if ((now - eqTime) / 60000 > maxAge) continue;
      }
      if (eq.magnitude < minMag && eq.maxIntensity < minInt) continue;
      const parts = [];
      if (eq.location) parts.push(`震央：${eq.location}`);
      parts.push(`規模 ${eq.magnitude.toFixed(1)}，深度 ${eq.focalDepth.toFixed(1)} km`);
      if (eq.maxIntensityLabel && eq.maxIntensityArea) parts.push(`最大震度 ${eq.maxIntensityLabel} 於 ${eq.maxIntensityArea}`);
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

  if (!wxData) return out;
  const n = new Date();
  const nh = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0') + 'T' + String(n.getHours()).padStart(2, '0');
  const hi = wxData.hourly && wxData.hourly.time ? wxData.hourly.time.findIndex(s => s.startsWith(nh)) : -1;
  const curCode = wxData.current ? wxData.current.weather_code : 0;
  const curTemp = wxData.current ? Math.round(wxData.current.temperature_2m) : 0;
  const hPrec = (wxData.hourly && wxData.hourly.precipitation_probability) || [];
  const hWind = (wxData.hourly && wxData.hourly.wind_speed_10m) || [];
  const curWind = hi >= 0 ? (hWind[hi] || 0) : 0;

  function maxRain(hours) {
    if (hi < 0) return 0;
    let mx = 0;
    for (let k = hi; k < Math.min(hi + hours, hPrec.length); k++) {
      if (hPrec[k] > mx) mx = hPrec[k];
    }
    return mx;
  }
  function maxWind(hours) {
    if (hi < 0) return 0;
    let mx = 0;
    for (let k = hi; k < Math.min(hi + hours, hWind.length); k++) {
      if (hWind[k] > mx) mx = hWind[k];
    }
    return mx;
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
    const w6 = maxWind(6), r6 = maxRain(6);
    const isStorm = (curCode === 95 || curCode === 96 || curCode === 99);
    if ((curWind >= wTh || w6 >= wTh) && (isStorm || r6 >= 80)) {
      out.push({ id: 'typhoon', icon: '🌀', title: '颱風跡象警報', body: `風速最高 ${Math.round(Math.max(curWind, w6))} km/h（推算）`, critical: true });
    }
  }
  if (cfg.storm !== false && (curCode === 95 || curCode === 96 || curCode === 99)) {
    out.push({ id: 'storm', icon: '⛈', title: '雷雨警報', body: '目前有雷雨，避免戶外、遠離高處與電器', critical: true });
  }
  if (cfg.heavyRain !== false && swInDetectionWindow('heavyRain', cfg)) {
    const r = maxRain(6);
    if (r >= (cfg.heavyRainProb || 80)) {
      out.push({ id: 'heavyRain', icon: '🌧', title: '豪雨警報', body: `未來 6 小時最高降雨機率 ${r}%，注意低窪積水`, critical: true });
    }
  }
  if (cfg.rain !== false && swInDetectionWindow('rain', cfg) && !out.some(a => a.id === 'heavyRain' || a.id === 'storm' || a.id === 'typhoon')) {
    const r = maxRain(3);
    if (r >= (cfg.rainProb || 60)) {
      out.push({ id: 'rain', icon: '🌂', title: '降雨提醒', body: `未來 3 小時降雨機率 ${r}%，建議攜帶雨具`, critical: false });
    }
  }
  if (cfg.strongWind !== false && swInDetectionWindow('strongWind', cfg) && !out.some(a => a.id === 'typhoon')) {
    const w3 = maxWind(3);
    const mxW = Math.max(curWind, w3);
    if (mxW >= (cfg.windThreshold || 50)) {
      out.push({ id: 'strongWind', icon: '💨', title: '強風警報', body: `風速 ${Math.round(mxW)} km/h，騎車注意`, critical: false });
    }
  }
  if (cfg.heat !== false && swInDetectionWindow('heat', cfg) && curTemp >= (cfg.heatThreshold || 36)) {
    out.push({ id: 'heat', icon: '🥵', title: '高溫警報', body: `目前 ${curTemp}°C，多補水`, critical: false });
  }
  if (cfg.cold !== false && swInDetectionWindow('cold', cfg) && curTemp <= (cfg.coldThreshold || 10)) {
    out.push({ id: 'cold', icon: '🥶', title: '低溫警報', body: `目前 ${curTemp}°C，注意保暖`, critical: false });
  }
  if (cfg.fog === true && swInDetectionWindow('fog', cfg) && (curCode === 45 || curCode === 48)) {
    out.push({ id: 'fog', icon: '🌫', title: '濃霧提醒', body: '能見度差，行車開大燈', critical: false });
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
    // 取最後一次已知位置
    let pos = await swGetCache('lastPos');
    if (!pos) pos = { lat: 23.32, lon: 120.27 }; // fallback：台南
    // 同步取設定（先 Firestore，失敗用 cache）
    let cfg = await swFetchAlertConfig();
    if (!cfg) cfg = (await swGetCache('wxAlerts')) || Object.assign({}, ALERT_DEFS);
    else await swPutWxCache('wxAlerts', cfg);

    if (cfg.notifyEnabled === false || cfg.master === false) return;

    // 抓天氣（地震不依賴天氣，但其他警報要）
    let wx = null;
    try { wx = await swFetchWeather(pos.lat, pos.lon); } catch (e) {}

    // 抓 CWA 資料（颱風 + 地震）— Worker URL 已寫死
    let cwaData = null;
    const cwaUrl = 'https://cwa-data.onerkk.workers.dev';
    if (cwaUrl) {
      try {
        const resp = await fetch(cwaUrl);
        if (resp.ok) {
          const td = await resp.json();
          if (td && td.ok) cwaData = td;
        }
      } catch (e) {}
    }

    const alerts = swEvaluate(wx, cfg, cwaData);
    if (!alerts.length) return;

    const inQuiet = swInQuietHours(cfg);
    const cooldownMs = (cfg.cooldownHours || 3) * 3600 * 1000;
    const now = Date.now();
    let state = (await swGetCache('notifyState')) || {};

    for (const a of alerts) {
      const notifyKey = ({ typhoon: 'notifyTyphoon', storm: 'notifyStorm', heavyRain: 'notifyHeavyRain', rain: 'notifyRain', strongWind: 'notifyStrongWind', heat: 'notifyHeat', cold: 'notifyCold', fog: 'notifyFog', earthquake: 'notifyEarthquake' })[a.id];
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
