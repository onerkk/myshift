/* cwa-forecast worker — 鄉鎮級天氣預報（中央氣象署 F-D0047 系列，逐 3 小時）
 *
 * 部署：Cloudflare Workers，名稱 cwa-forecast（網址 https://cwa-forecast.<帳號>.workers.dev）
 * 授權碼：沿用舊版的環境變數 CWA_KEY（也接受 CWA_API_KEY／CWA_TOKEN／API_KEY，或網址參數 ?auth=）
 *
 * 兩個端點（都與舊版相容）：
 *   1. 預報   /?county=臺南市&town=鹽水區&lat=..&lon=..
 *   2. 雨量站 /?rain=1&lat=..&lon=..   → 最近的自動雨量站實測（雷達頁使用），邏輯與舊版相同
 *
 * 查詢：/?county=臺南市&town=鹽水區&lat=23.32&lon=120.27
 * 回應：{ ok, source, scope:'town'|'county', county, town, popWindowHours, hourly:{ 'YYYY-MM-DDTHH': {pop,wx,wmo,t} }, updatedAt, ts }
 *   - hourly 的鍵一律是臺灣時間；pop 是氣象署原始的區間降雨機率，區間內每個小時填同一個值。
 *   - 找不到該鄉鎮時退回「縣市」預報（F-D0047-089），這時 scope='county'、town 欄位放縣市名（與舊版相容）。
 * 診斷：加上 &debug=1 會多回傳 debug 欄位（試過哪些資料集、欄位名稱），不含授權碼。
 *
 * 資料格式依據：氣象署「精緻化天氣預報－368 鄉鎮預報」說明文件
 * https://www.cwa.gov.tw/Data/data_catalog/1-1-1.pdf
 */
const API = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/';
const COUNTY_DATASET = 'F-D0047-089'; // 全臺各縣市，未來 3 天
// 各縣市「未來 3 天」資料集。這張表只當作第一次嘗試的提示：
// 回應裡的縣市名稱不符時，會自動逐一找出正確的資料集並記住。
const TOWN_DATASET = {
  '宜蘭縣': '001', '桃園市': '005', '新竹縣': '009', '苗栗縣': '013', '彰化縣': '017', '南投縣': '021',
  '雲林縣': '025', '嘉義縣': '029', '屏東縣': '033', '臺東縣': '037', '花蓮縣': '041', '澎湖縣': '045',
  '基隆市': '049', '新竹市': '053', '嘉義市': '057', '臺北市': '061', '高雄市': '065', '新北市': '069',
  '臺中市': '073', '臺南市': '077', '連江縣': '081', '金門縣': '085'
};
const COUNTY_CENTER = {
  '基隆市': [25.1283, 121.7419], '臺北市': [25.0375, 121.5637], '新北市': [25.0120, 121.4657], '桃園市': [24.9937, 121.3010],
  '新竹市': [24.8066, 120.9686], '新竹縣': [24.8270, 121.0129], '苗栗縣': [24.5648, 120.8208], '臺中市': [24.1618, 120.6469],
  '彰化縣': [24.0756, 120.5445], '南投縣': [23.9026, 120.6906], '雲林縣': [23.6993, 120.5263], '嘉義市': [23.4812, 120.4536],
  '嘉義縣': [23.4588, 120.2930], '臺南市': [22.9920, 120.1850], '高雄市': [22.6209, 120.3120], '屏東縣': [22.6830, 120.4880],
  '宜蘭縣': [24.7307, 121.7631], '花蓮縣': [23.9913, 121.6198], '臺東縣': [22.7554, 121.1503], '澎湖縣': [23.5700, 119.5664],
  '金門縣': [24.4368, 118.3186], '連江縣': [26.1579, 119.9517]
};
const learned = new Map(); // 縣市 → 實際驗證過的資料集編號（同一個執行個體內有效）

const clean = s => String(s == null ? '' : s).replace(/台/g, '臺').replace(/\s/g, '');
const pick = (obj, keys) => { if (obj) for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k]; return undefined; };
const list = v => Array.isArray(v) ? v : (v ? [v] : []);

export function tokenOf(env) {
  env = env || {};
  return env.CWA_KEY || env.CWA_API_KEY || env.CWA_TOKEN || env.API_KEY || env.Authorization || '';
}

/* 把一個地點（鄉鎮或縣市）的 WeatherElement 轉成逐時表。新舊欄位名稱都接受。 */
export function hourlyFromLocation(location) {
  const hourly = {}, exactT = new Set(); let popWindowHours = null;
  const slot = key => (hourly[key] || (hourly[key] = { pop: null, wx: '', wmo: null, t: null }));
  const keyOf = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 13);
  for (const el of list(pick(location, ['WeatherElement', 'weatherElement']))) {
    const name = String(pick(el, ['ElementName', 'elementName']) || '');
    const isPop = /降雨機率/.test(name) || /^PoP\d*h?$/i.test(name);
    const isWx = name === '天氣現象' || name === 'Wx';
    const isT = name === '溫度' || name === 'T';
    if (!isPop && !isWx && !isT) continue;
    for (const time of list(pick(el, ['Time', 'time']))) {
      const values = Object.assign({}, ...list(pick(time, ['ElementValue', 'elementValue'])));
      const startText = pick(time, ['StartTime', 'startTime', 'DataTime', 'dataTime']);
      const endText = pick(time, ['EndTime', 'endTime']);
      const start = Date.parse(startText); if (!Number.isFinite(start)) continue;
      let end = Date.parse(endText); if (!Number.isFinite(end) || end <= start) end = start + (isT ? 3600000 : 3 * 3600000);
      const hours = Math.min(24, Math.max(1, Math.round((end - start) / 3600000)));
      if (isPop) {
        const raw = pick(values, ['ProbabilityOfPrecipitation', 'value']);
        const pop = raw === '' || raw === ' ' || raw === '-' || raw == null ? null : Number(raw);
        if (pop === null || !Number.isFinite(pop) || pop < 0 || pop > 100) continue;
        if (popWindowHours === null) popWindowHours = hours;
        for (let h = 0; h < hours; h++) slot(keyOf(start + h * 3600000)).pop = Math.round(pop);
      } else if (isWx) {
        const wx = String(pick(values, ['Weather', 'value']) || '').trim(); if (!wx) continue;
        for (let h = 0; h < hours; h++) { const s = slot(keyOf(start + h * 3600000)); s.wx = wx; s.wmo = wmoFromText(wx); }
      } else {
        const raw = pick(values, ['Temperature', 'value']); const t = raw === '' || raw == null ? null : Number(raw);
        if (t === null || !Number.isFinite(t)) continue;
        // 溫度是時間點資料；往後補到下一筆之前（最多 3 小時），實際有資料的小時不會被補值蓋掉。
        for (let h = 0; h < 3; h++) { const k = keyOf(start + h * 3600000), s = slot(k); if (h === 0) { s.t = Math.round(t); exactT.add(k); } else if (!exactT.has(k)) s.t = Math.round(t); }
      }
    }
  }
  return { hourly, popWindowHours };
}

/* 氣象署天氣現象文字 → WMO 天氣碼（App 的圖示與動畫用） */
export function wmoFromText(wx) {
  // 與舊版 worker 相同的對照，圖示與動畫不會因為換版而改變
  wx = String(wx || ''); if (!wx) return null;
  if (/雷/.test(wx)) return 95;
  if (/雨/.test(wx)) return /(豪|大雨|大豪|超大豪)/.test(wx) ? 65 : /(短暫|陣雨)/.test(wx) ? 80 : 63;
  if (/雪/.test(wx)) return 71;
  if (/(霧|靄)/.test(wx)) return 45;
  if (/陰/.test(wx)) return 3;
  if (/多雲/.test(wx)) return 2;
  if (/晴/.test(wx)) return /雲/.test(wx) ? 1 : 0;
  return 3;
}

function groupsOf(json) {
  const records = (json && json.records) || {};
  return list(pick(records, ['Locations', 'locations']));
}
function locationsOf(group) { return list(pick(group, ['Location', 'location'])); }
const groupName = group => clean(pick(group, ['LocationsName', 'locationsName']));
const locationName = loc => clean(pick(loc, ['LocationName', 'locationName']));

async function cwa(dataset, token, params, debug) {
  const url = new URL(API + dataset);
  url.searchParams.set('Authorization', token); url.searchParams.set('format', 'JSON');
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal, headers: { Accept: 'application/json' },
      cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 600, '404': 30, '500-599': 0 } }
    });
    if (debug) debug.push({ dataset, params: Object.keys(params || {}), status: response.status });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    if (debug) debug.push({ dataset, error: String(e && e.message || e).slice(0, 80) });
    return null;
  } finally { clearTimeout(timer); }
}

/* 取得某縣市某鄉鎮的地點資料；回傳 {location, dataset} 或 null */
async function townLocation(county, town, token, debug) {
  const tryDataset = async id => {
    const dataset = 'F-D0047-' + id;
    // 先用 LocationName 篩選（回應小）；篩不到再抓整個縣市自己找。
    for (const params of [{ LocationName: town }, {}]) {
      const json = await cwa(dataset, token, params, debug); if (!json) continue;
      for (const group of groupsOf(json)) {
        const gname = groupName(group);
        if (gname && gname !== county) return { wrongCounty: true };
        const hit = locationsOf(group).find(loc => locationName(loc) === town);
        if (hit) return { location: hit, dataset };
      }
    }
    return null;
  };
  const hint = learned.get(county) || TOWN_DATASET[county];
  if (hint) {
    const r = await tryDataset(hint);
    if (r && r.location) { learned.set(county, hint); return r; }
    if (!r || !r.wrongCounty) return null; // 資料集對、但沒有這個鄉鎮名稱
  }
  // 提示表不符（氣象署調整過編號）：逐一找出這個縣市的資料集並記住。
  for (const id of Object.values(TOWN_DATASET)) {
    if (id === hint) continue;
    const json = await cwa('F-D0047-' + id, token, { LocationName: town }, debug); if (!json) continue;
    for (const group of groupsOf(json)) {
      if (groupName(group) !== county) continue;
      const hit = locationsOf(group).find(loc => locationName(loc) === town);
      if (hit) { learned.set(county, id); return { location: hit, dataset: 'F-D0047-' + id }; }
    }
  }
  return null;
}

async function countyLocation(county, lat, lon, token, debug) {
  const json = await cwa(COUNTY_DATASET, token, {}, debug); if (!json) return null;
  const all = groupsOf(json).flatMap(locationsOf);
  let hit = county ? all.find(loc => locationName(loc) === county) : null;
  if (!hit && !county && Number.isFinite(lat) && Number.isFinite(lon)) {
    // 沒給縣市名稱時才用座標；以各縣市定位點找最近的。
    let best = Infinity, name = '';
    for (const [n, [la, lo]] of Object.entries(COUNTY_CENTER)) { const d = (la - lat) ** 2 + (lo - lon) ** 2; if (d < best) { best = d; name = n; } }
    hit = all.find(loc => locationName(loc) === name);
  }
  return hit ? { location: hit, dataset: COUNTY_DATASET } : null;
}

export async function forecast(query, token) {
  const debug = query.debug ? [] : null;
  let county = clean(query.county), town = clean(query.town);
  if (!county && COUNTY_CENTER[town]) { county = town; town = ''; }
  const lat = Number(query.lat), lon = Number(query.lon);
  if (!token) return { ok: false, error: 'missing CWA_KEY env' };
  let found = null, scope = 'town';
  if (county && town) found = await townLocation(county, town, token, debug);
  if (!found) { scope = 'county'; found = await countyLocation(county, lat, lon, token, debug); }
  if (!found) return { ok: false, error: 'forecast not found', county: county || null, town: town || null, ...(debug ? { debug } : {}) };
  const { hourly, popWindowHours } = hourlyFromLocation(found.location);
  const name = locationName(found.location);
  // 鄉鎮資料在新一報發布後會從「下一個 3 小時區間」開始，目前這個區間（最多約 1 小時）沒有值。
  // 這段空檔用同一縣市的官方縣市預報補上，並逐時標記 fill:'county'，不讓 App 退回容易高估的模式機率。
  let filled = 0;
  if (scope === 'town') {
    const first = Object.keys(hourly).filter(k => hourly[k].pop !== null).sort()[0];
    const nowKey = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 13);
    if (first && nowKey < first) {
      const c = await countyLocation(county, lat, lon, token, debug);
      if (c) { const ch = hourlyFromLocation(c.location).hourly; for (const k of Object.keys(ch)) if (k >= nowKey && k < first && ch[k].pop !== null) { const own = hourly[k] || {}; hourly[k] = { pop: ch[k].pop, wx: own.wx || ch[k].wx, wmo: own.wmo != null ? own.wmo : ch[k].wmo, t: own.t != null ? own.t : ch[k].t, fill: 'county' }; filled++; } }
    }
  }
  if (!Object.keys(hourly).length) return { ok: false, error: 'forecast has no usable elements', source: 'CWA ' + found.dataset, ...(debug ? { debug, elements: list(pick(found.location, ['WeatherElement', 'weatherElement'])).map(e => pick(e, ['ElementName', 'elementName'])) } : {}) };
  return {
    ok: true, source: 'CWA ' + found.dataset, scope,
    county: scope === 'town' ? county : name,
    town: name, // 縣市預報時這裡是縣市名稱（舊版相容）
    popWindowHours: popWindowHours || 3, hourly, ts: Date.now(), ...(filled ? { countyFilledHours: filled } : {}),
    ...(debug ? { debug, elements: list(pick(found.location, ['WeatherElement', 'weatherElement'])).map(e => pick(e, ['ElementName', 'elementName'])) } : {})
  };
}

/* ── 雨量站端點（?rain=1）：最近的自動雨量站實測。自舊版原樣移植，回應欄位不變。 ── */
const RAIN_DATASET = 'O-A0002-001';
function stationLatLon(station) {
  const geo = pick(station, ['GeoInfo', 'geoInfo']) || {};
  let fallback = null;
  for (const c of list(pick(geo, ['Coordinates', 'coordinates']))) {
    const la = parseFloat(pick(c, ['StationLatitude', 'stationLatitude'])), lo = parseFloat(pick(c, ['StationLongitude', 'stationLongitude']));
    if (!isFinite(la) || !isFinite(lo)) continue;
    if (pick(c, ['CoordinateName', 'coordinateName']) === 'WGS84') return { lat: la, lon: lo };
    fallback = { lat: la, lon: lo };
  }
  return fallback || { lat: NaN, lon: NaN };
}
export function rainValue(element, key) {
  const node = element[key] || element[key.toLowerCase()] || null;
  const raw = node ? (node.Precipitation !== undefined ? node.Precipitation : node.precipitation) : null;
  if (raw == null) return { mm: null, note: 'no-data' };
  const text = String(raw).trim();
  if (text === 'T') return { mm: .05, note: 'trace' };
  if (text === 'X') return { mm: null, note: 'broken' };
  if (text === '-99') return { mm: null, note: 'no-data' };
  if (text === '-98') return { mm: 0, note: 'dry6h' };
  const mm = parseFloat(text);
  return !isFinite(mm) || mm < 0 ? { mm: null, note: 'no-data' } : { mm, note: 'ok' };
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const k = Math.PI / 180, a = (lat2 - lat1) * k, b = (lon2 - lon1) * k;
  const h = Math.sin(a / 2) ** 2 + Math.cos(lat1 * k) * Math.cos(lat2 * k) * Math.sin(b / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
export async function rain(query, token) {
  const lat = parseFloat(query.lat), lon = parseFloat(query.lon);
  if (!token) return { status: 500, body: { ok: false, error: 'missing CWA_KEY env' } };
  if (!(isFinite(lat) && isFinite(lon))) return { status: 400, body: { ok: false, error: 'need ?lat=&lon=' } };
  const url = new URL(API + RAIN_DATASET); url.searchParams.set('Authorization', token); url.searchParams.set('format', 'JSON');
  let stations;
  try {
    const response = await fetch(url.toString(), { cf: { cacheTtl: 120, cacheEverything: true } });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const json = await response.json(), records = json && json.records;
    stations = list(records && pick(records, ['Station', 'station']));
  } catch (e) { return { status: 502, body: { ok: false, error: 'rain fetch failed: ' + String(e && e.message || e).slice(0, 80) } }; }
  if (!stations.length) return { status: 502, body: { ok: false, error: 'no Station in CWA response' } };
  let best = null, bestLL = null, bestD = Infinity;
  for (const st of stations) { const ll = stationLatLon(st); if (!isFinite(ll.lat) || !isFinite(ll.lon)) continue; const d = (ll.lat - lat) ** 2 + (ll.lon - lon) ** 2; if (d < bestD) { bestD = d; best = st; bestLL = ll; } }
  if (!best) return { status: 502, body: { ok: false, error: 'no station with coordinates' } };
  const geo = pick(best, ['GeoInfo', 'geoInfo']) || {}, el = pick(best, ['RainfallElement', 'rainfallElement']) || {}, obs = pick(best, ['ObsTime', 'obsTime']) || {};
  return { status: 200, body: {
    ok: true, station: pick(best, ['StationName', 'stationName']) || '', id: pick(best, ['StationId', 'stationId']) || '',
    county: pick(geo, ['CountyName', 'countyName']) || '', town: pick(geo, ['TownName', 'townName']) || '',
    distanceKm: Math.round(haversineKm(lat, lon, bestLL.lat, bestLL.lon) * 10) / 10,
    obsTime: pick(obs, ['DateTime', 'dateTime']) || null,
    rain: { min10: rainValue(el, 'Past10Min'), hr1: rainValue(el, 'Past1hr'), hr3: rainValue(el, 'Past3hr'), hr24: rainValue(el, 'Past24hr'), today: rainValue(el, 'Now') },
    ts: Date.now()
  } };
}

const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': '*' };
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS });
    if (request.method !== 'GET') return new Response(JSON.stringify({ ok: false, error: 'GET only' }), { status: 405, headers: HEADERS });
    const url = new URL(request.url), q = Object.fromEntries(url.searchParams);
    const token = q.auth || tokenOf(env);
    if (q.rain === '1') {
      let r; try { r = await rain(q, token); } catch (e) { r = { status: 502, body: { ok: false, error: 'worker error: ' + String(e && e.message || e).slice(0, 120) } }; }
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...HEADERS, 'Cache-Control': 'no-store' } });
    }
    let body;
    try { body = await forecast(q, token); }
    catch (e) { body = { ok: false, error: 'worker error: ' + String(e && e.message || e).slice(0, 120) }; }
    return new Response(JSON.stringify(body), { status: 200, headers: { ...HEADERS, 'Cache-Control': body.ok ? 'public, max-age=600' : 'no-store' } });
  }
};
