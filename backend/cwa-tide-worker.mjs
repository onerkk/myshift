/* cwa-tide worker — 潮汐預報（中央氣象署 F-A0021-001）
 *
 * 部署：Cloudflare Workers，名稱 cwa-tide。授權碼沿用環境變數（CWA_KEY／CWA_API_KEY／CWA_TOKEN／API_KEY）。
 *
 * 為什麼要改：舊版把整份資料集（全臺 266 個地點 × 1 個月，約 5.4 MB，壓縮後約 420 KB）原封不動傳給手機，
 * 手機再自己找最近的地點。行動網路慢的時候會超過 10 秒逾時，潮汐就不顯示。
 *
 * 新版：
 *   /?lat=23.32&lon=120.27  → 只回最近的一個地點、昨天到 8 天後的資料（幾 KB）。
 *                              回應外形與氣象署原始格式相同（records.TideForecasts[0].Location…），App 不必改解析。
 *   /                        → 沒帶座標時與舊版相同：整份資料集原樣轉送。
 *   加 &debug=1 會多回傳 debug（不含授權碼）。
 *
 * 參數依據：氣象署開放資料 API 規格 https://opendata.cwa.gov.tw/apidoc/v1
 *   F-A0021-001 支援 LocationId、WeatherElement、Date、timeFrom、timeTo。
 */
const API = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-A0021-001';
const HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': '*' };

export function tokenOf(env) { env = env || {}; return env.CWA_KEY || env.CWA_API_KEY || env.CWA_TOKEN || env.API_KEY || env.Authorization || ''; }
const twDate = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10);       // 臺灣日期 yyyy-MM-dd
const twStamp = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 19);      // 臺灣時間 yyyy-MM-ddThh:mm:ss
const forecastsOf = json => { const r = json && json.records; const f = r && (r.TideForecasts || r.tideForecasts); return Array.isArray(f) ? f : []; };
const locOf = f => (f && (f.Location || f.location)) || null;

async function cwa(token, params, ttl, debug) {
  const url = new URL(API); url.searchParams.set('Authorization', token); url.searchParams.set('format', 'JSON');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json' }, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': ttl, '404': 30, '500-599': 0 } } });
    if (debug) debug.push({ params: Object.keys(params), status: response.status });
    return response.ok ? await response.json() : null;
  } catch (e) { if (debug) debug.push({ params: Object.keys(params), error: String(e && e.message || e).slice(0, 80) }); return null; }
  finally { clearTimeout(timer); }
}

export function nearest(forecasts, lat, lon) {
  let best = null, bestD = Infinity;
  for (const f of forecasts) {
    const loc = locOf(f); if (!loc) continue;
    const la = parseFloat(loc.Latitude), lo = parseFloat(loc.Longitude); if (!isFinite(la) || !isFinite(lo)) continue;
    // 等距近似：經度差乘上緯度餘弦，避免高緯度方向被低估
    const d = (la - lat) ** 2 + ((lo - lon) * Math.cos(lat * Math.PI / 180)) ** 2;
    if (d < bestD) { bestD = d; best = loc; }
  }
  return best;
}

export async function tide(query, token, now = Date.now()) {
  const debug = query.debug ? [] : null, lat = parseFloat(query.lat), lon = parseFloat(query.lon);
  if (!token) return { status: 500, body: { success: 'false', ok: false, error: 'missing CWA_KEY env' } };
  if (!(isFinite(lat) && isFinite(lon))) return { status: 400, body: { success: 'false', ok: false, error: 'need ?lat=&lon=' } };
  const from = twStamp(now - 24 * 3600000), to = twStamp(now + 8 * 24 * 3600000);
  // 1. 地點索引：只要一天、只要潮差欄位（沒有逐筆潮時），用來取得每個地點的編號與座標。一天更新一次即可。
  let index = forecastsOf(await cwa(token, { Date: twDate(now), WeatherElement: 'TideRange' }, 86400, debug));
  let pick = nearest(index, lat, lon), location = null;
  // 2. 只抓那一個地點、未來幾天
  if (pick && pick.LocationId) {
    const one = forecastsOf(await cwa(token, { LocationId: pick.LocationId, timeFrom: from, timeTo: to, sort: 'DateTime' }, 3600, debug));
    location = locOf(one.find(f => { const l = locOf(f); return l && String(l.LocationId) === String(pick.LocationId); }) || one[0]);
  }
  // 3. 索引或單點查詢不如預期時：抓全部地點但只限這幾天，自己挑最近的
  if (!location || !location.TimePeriods) {
    const all = forecastsOf(await cwa(token, { timeFrom: from, timeTo: to, sort: 'DateTime' }, 3600, debug));
    location = nearest(all, lat, lon);
  }
  if (!location) return { status: 502, body: { success: 'false', ok: false, error: 'tide forecast not available', ...(debug ? { debug } : {}) } };
  return { status: 200, body: { success: 'true', ok: true, scope: 'nearest', records: { dataid: 'F-A0021-001', TideForecasts: [{ Location: location }] }, ts: now, ...(debug ? { debug } : {}) } };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS });
    const url = new URL(request.url), q = Object.fromEntries(url.searchParams), token = q.auth || tokenOf(env);
    if (q.lat === undefined && q.lon === undefined) {
      // 舊版行為：整份資料集原樣轉送（舊版 App 仍可使用）
      if (!token) return new Response(JSON.stringify({ success: 'false', error: 'missing CWA_KEY env' }), { status: 500, headers: HEADERS });
      const full = new URL(API); full.searchParams.set('Authorization', token); full.searchParams.set('format', 'JSON');
      const upstream = await fetch(full.toString(), { cf: { cacheEverything: true, cacheTtl: 3600 } });
      return new Response(upstream.body, { status: upstream.status, headers: { ...HEADERS, 'Cache-Control': 'public, max-age=3600' } });
    }
    let r; try { r = await tide(q, token); } catch (e) { r = { status: 502, body: { success: 'false', ok: false, error: 'worker error: ' + String(e && e.message || e).slice(0, 120) } }; }
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...HEADERS, 'Cache-Control': r.status === 200 ? 'public, max-age=1800' : 'no-store' } });
  }
};
