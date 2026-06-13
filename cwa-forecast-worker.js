/**
 * cwa-forecast — 中央氣象署 鄉鎮天氣預報「降雨機率」代理 worker
 * ─────────────────────────────────────────────────────────────
 * 資料源：F-D0047-093（鄉鎮天氣預報 - 全臺灣各鄉鎮市區預報資料）
 * 回傳：指定鄉鎮的「逐時」降雨機率（由 6 或 12 小時官方分段展開）+ 天氣現象 + 溫度
 *
 * 為什麼要這個 worker（治本，不是打補丁）：
 *   App 原本用 Open-Meteo 的 precipitation_probability，那是 GFS 系集模式
 *   （約 25km 網格）「成員報雨比例 ×100」。台灣夏季對流旺、地形破碎，25km 格內
 *   幾乎總有成員報雨，機率被系統性高估（你截圖 05~18 時 73~100%）。
 *   CWA 鄉鎮預報是針對單一鄉鎮校準的官方機率，與手機內建天氣一致。
 *
 * 部署：
 *   1. Cloudflare Workers 新建一個 worker，貼上本檔全部內容。
 *   2. Settings → Variables and Secrets → 新增環境變數
 *        CWA_KEY = 你的中央氣象署授權碼（格式 CWA-xxxxxxxx，與 cwa-data / cwa-tide 同一把）
 *   3. 部署後取得網址，填回 app.js 的 const CWA_FCST_URL。
 *      （命名建議 cwa-forecast，和你現有 cwa-data、cwa-tide 一致。）
 *
 * 測試（部署後直接用瀏覽器開）：
 *   https://你的worker/?town=鹿港鎮&county=彰化縣&lat=24.05&lon=120.43
 *   https://你的worker/?town=鹿港鎮&debug=1     ← 看解析到的原始 ElementName 與前 12 小時
 *
 * 注意：CWA 鄉鎮預報只到「未來 3 天」。超過範圍的時段 App 端會自動保留 Open-Meteo 值，
 *       不會出現空白。
 */

const CWA_ENDPOINT = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-093';
const UPSTREAM_TTL = 600; // 邊緣快取 10 分鐘，降低對 CWA 的請求頻率與延遲

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const q = url.searchParams;
    const key = q.get('auth') || (env && env.CWA_KEY) || '';
    const town = (q.get('town') || '').trim();
    const lat = parseFloat(q.get('lat'));
    const lon = parseFloat(q.get('lon'));
    const debug = q.get('debug') === '1';

    if (!key) return json({ ok: false, error: 'missing CWA_KEY env' }, 500);
    if (!town && !(isFinite(lat) && isFinite(lon)))
      return json({ ok: false, error: 'need ?town= or ?lat=&lon=' }, 400);

    let records;
    try {
      records = await fetchCwa(key, town);
    } catch (e) {
      return json({ ok: false, error: 'cwa fetch failed: ' + (e && e.message) }, 502);
    }

    const locs = pickLocations(records);
    if (!locs.length) return json({ ok: false, error: 'no Location in CWA response' }, 502);

    const loc = chooseLocation(locs, town, lat, lon);
    if (!loc) return json({ ok: false, error: 'town not found', town }, 404);

    const parsed = parseLocation(loc);

    if (debug) {
      const els = loc.WeatherElement || loc.weatherElement || [];
      return json({
        ok: true, debug: true, town: getName(loc),
        elementNames: els.map(e => e.ElementName || e.elementName),
        popWindowHours: parsed.popWindowHours,
        sampleHours: Object.keys(parsed.hourly).slice(0, 12)
          .reduce((o, k) => ((o[k] = parsed.hourly[k]), o), {}),
      });
    }

    return json({
      ok: true,
      source: 'CWA F-D0047-093',
      town: getName(loc),
      popWindowHours: parsed.popWindowHours,
      hourly: parsed.hourly,
      ts: Date.now(),
    });
  },
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

async function fetchCwa(key, town) {
  const u = new URL(CWA_ENDPOINT);
  u.searchParams.set('Authorization', key);
  u.searchParams.set('format', 'JSON');
  if (town) u.searchParams.set('LocationName', town); // 過濾單一鄉鎮，回應極小
  const resp = await fetch(u.toString(), {
    cf: { cacheTtl: UPSTREAM_TTL, cacheEverything: true },
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  return data && data.records;
}

/* ── 從 records 取出 Location 陣列（相容大小寫 / Locations 巢狀 / 舊版）── */
function pickLocations(records) {
  if (!records) return [];
  const Ls = records.Locations || records.locations; // v1：records.Locations[].Location[]
  if (Array.isArray(Ls)) {
    const out = [];
    for (const grp of Ls) {
      const inner = grp.Location || grp.location;
      if (Array.isArray(inner)) out.push(...inner);
    }
    if (out.length) return out;
  }
  if (Array.isArray(records.location)) return records.location; // 舊格式
  return [];
}

function getName(loc) { return loc.LocationName || loc.locationName || ''; }
function getLat(loc) { return parseFloat(loc.Latitude || loc.latitude); }
function getLon(loc) { return parseFloat(loc.Longitude || loc.longitude); }

/* 選定鄉鎮：先用名稱精準比對；同名（如多個「中山區」）或無名稱 → 取最近經緯度 */
function chooseLocation(locs, town, lat, lon) {
  let cand = town ? locs.filter(l => getName(l) === town) : locs.slice();
  if (!cand.length) cand = locs.slice();
  if (cand.length === 1) return cand[0];
  if (isFinite(lat) && isFinite(lon)) {
    let best = null, bd = Infinity;
    for (const l of cand) {
      const la = getLat(l), lo = getLon(l);
      if (!isFinite(la) || !isFinite(lo)) continue;
      const d = (la - lat) ** 2 + (lo - lon) ** 2;
      if (d < bd) { bd = d; best = l; }
    }
    if (best) return best;
  }
  return cand[0];
}

function parseLocation(loc) {
  const els = loc.WeatherElement || loc.weatherElement || [];
  const nameOf = e => String(e.ElementName || e.elementName || '');
  const byName = pred => els.find(e => pred(nameOf(e)));

  // 降雨機率：取「分段時數最短」的（6 小時優先於 12 小時）
  const popEls = els.filter(e => /降雨機率/.test(nameOf(e)));
  popEls.sort((a, b) => popWindowOf(a) - popWindowOf(b));
  const popEl = popEls[0] || null;
  const wxEl = byName(n => n.indexOf('天氣現象') >= 0);
  const tEl  = byName(n => n === '溫度' || n.indexOf('溫度') === 0);

  const hourly = {};
  const popWindowHours = popEl ? popWindowOf(popEl) : null;

  if (popEl) forEachInterval(popEl, (startKey, hours, vals) => {
    const pop = firstNumber(vals);
    if (pop == null) return;
    for (let h = 0; h < hours; h++) (hourly[addHourKey(startKey, h)] ||= {}).pop = pop;
  });

  if (wxEl) forEachInterval(wxEl, (startKey, hours, vals) => {
    const text = firstText(vals);
    const wmo = wxTextToWmo(text);
    for (let h = 0; h < hours; h++) {
      const o = (hourly[addHourKey(startKey, h)] ||= {});
      if (text) o.wx = text;
      if (wmo != null) o.wmo = wmo;
    }
  });

  if (tEl) forEachPoint(tEl, (key, vals) => {
    const t = firstNumber(vals);
    if (t != null) (hourly[key] ||= {}).t = t;
  });

  return { hourly, popWindowHours };
}

/* 估算降雨機率元素的分段時數 */
function popWindowOf(el) {
  const m = String(el.ElementName || el.elementName || '').match(/(\d+)\s*小時/);
  if (m) return parseInt(m[1], 10);
  const times = el.Time || el.time || [];
  for (const tm of times) {
    const s = tm.StartTime || tm.startTime, e = tm.EndTime || tm.endTime;
    if (s && e) {
      const d = (Date.parse(e) - Date.parse(s)) / 3600000;
      if (d > 0) return Math.round(d);
    }
  }
  return 12;
}

/* 區間型元素（PoP / 天氣現象，StartTime~EndTime） */
function forEachInterval(el, cb) {
  for (const tm of (el.Time || el.time || [])) {
    const s = tm.StartTime || tm.startTime || tm.DataTime || tm.dataTime;
    if (!s) continue;
    const e = tm.EndTime || tm.endTime;
    const hours = e ? Math.max(1, Math.round((Date.parse(e) - Date.parse(s)) / 3600000)) : 1;
    cb(hourKey(s), hours, valuesOf(tm));
  }
}

/* 瞬時型元素（溫度，DataTime） */
function forEachPoint(el, cb) {
  for (const tm of (el.Time || el.time || [])) {
    const s = tm.DataTime || tm.dataTime || tm.StartTime || tm.startTime;
    if (s) cb(hourKey(s), valuesOf(tm));
  }
}

function valuesOf(tm) {
  const ev = tm.ElementValue || tm.elementValue || [];
  return Array.isArray(ev) ? ev : [ev];
}

/* 不依賴鍵名，取第一個數值（容忍 "-"） */
function firstNumber(values) {
  for (const v of values) for (const k in v) {
    const n = parseFloat(v[k]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
/* 取第一個非數字的中文文字（天氣現象） */
function firstText(values) {
  for (const v of values) for (const k in v) {
    const s = String(v[k] || '').trim();
    if (s && !/^-?\d+(\.\d+)?$/.test(s)) return s;
  }
  return '';
}

/* 時間字串 → "YYYY-MM-DDTHH"（保留 +08:00 當地小時，對齊 Open-Meteo timezone=auto） */
function hourKey(iso) {
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})T(\d{2})/);
  return m ? (m[1] + 'T' + m[2]) : String(iso).slice(0, 13);
}
/* 把 "YYYY-MM-DDTHH" 往後加 N 小時（正確處理跨日） */
function addHourKey(startKey, add) {
  if (!add) return startKey;
  const m = startKey.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/);
  if (!m) return startKey;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + add, 0, 0));
  const p = n => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}T${p(dt.getUTCHours())}`;
}

/* CWA 天氣現象文字 → Open-Meteo WMO 代碼（沿用 app.js 既有 WXI/WXZ 對照表） */
function wxTextToWmo(t) {
  t = String(t || '');
  if (!t) return null;
  if (/雷/.test(t)) return 95;                       // 雷雨 / 雷陣雨
  if (/雨/.test(t)) {
    if (/(豪|大雨|大豪|超大豪)/.test(t)) return 65;  // 大雨
    if (/(短暫|陣雨)/.test(t)) return 80;            // 陣雨 / 短暫雨
    return 63;                                        // 一般雨
  }
  if (/雪/.test(t)) return 71;
  if (/(霧|靄)/.test(t)) return 45;
  if (/陰/.test(t)) return 3;                         // 陰
  if (/多雲/.test(t)) return 2;                       // 多雲（含晴時多雲 / 多雲時晴）
  if (/晴/.test(t)) return /雲/.test(t) ? 1 : 0;      // 大致晴 / 晴
  return 3;                                           // 預設多雲（保守，不亂報晴或雨）
}
