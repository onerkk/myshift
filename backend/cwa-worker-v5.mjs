// cwa-data.onerkk.workers.dev — Official CWA proxy for My Shift 我的班表
// Version: 2026-10-20 realtime-v5 (observation integration)
// Runtime: Cloudflare Workers, Module syntax
// Required secret/env var: CWA_API_KEY or CWA_TOKEN
// Optional env vars: DEFAULT_COUNTY=臺南市, DEFAULT_TOWN=鹽水區

const CWA_API_ROOT = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/';

const DATASETS = {
warningByArea: 'W-C0033-001',
warningByEvent: 'W-C0033-002',
typhoonWarning: 'W-C0034-001',
typhoonTrack: 'W-C0034-005',
quakeMajor: 'E-A0015-001',
quakeSmall: 'E-A0016-001',
rainNow: 'O-A0002-001',
weatherNow: 'O-A0003-001'
};

const COUNTY_ALIASES = {
'台北市': '臺北市', '台中市': '臺中市', '台南市': '臺南市', '台東縣': '臺東縣',
'臺北市': '臺北市', '臺中市': '臺中市', '臺南市': '臺南市', '臺東縣': '臺東縣'
};

const TAIWAN_COUNTIES = [
'基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
'臺中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市',
'高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'
];

function corsHeaders(extra = {}) {
return {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET,OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type,Authorization',
// 地點、警報與定位都會變；不快取整份使用者回應。上游 CWA 請求另有短快取。
'Cache-Control': 'no-store, max-age=0',
'Content-Type': 'application/json; charset=utf-8',
...extra
};
}

function jsonResponse(obj, status = 200) {
return new Response(JSON.stringify(obj, null, 2), { status, headers: corsHeaders() });
}

function normalizeTwName(value) {
return String(value ?? '').trim().replace(/台/g, '臺');
}

function cleanString(value) {
if (value === null || value === undefined) return '';
if (typeof value === 'object') return '';
return String(value).trim();
}

function asArray(value) {
if (value === null || value === undefined) return [];
return Array.isArray(value) ? value : [value];
}

function uniq(values) {
return [...new Set(asArray(values).map(v => cleanString(v)).filter(Boolean))];
}

function pick(obj, keys, fallback = '') {
if (!obj || typeof obj !== 'object') return fallback;
for (const key of keys) {
const value = obj[key];
if (value !== undefined && value !== null && cleanString(value) !== '') return value;
}
return fallback;
}

function getPath(obj, path) {
let current = obj;
for (const key of path) {
if (current === null || current === undefined) return undefined;
current = current[key];
}
return current;
}

function firstPath(obj, paths) {
for (const path of paths) {
const value = getPath(obj, path);
if (value !== undefined && value !== null) return value;
}
return undefined;
}

function nowIsoTaiwan() {
return new Date().toISOString();
}

function getToken(env, url) {
return env.CWA_API_KEY || env.CWA_TOKEN || env.Authorization || url.searchParams.get('token') || '';
}

async function fetchCwaJson(datasetId, token, options = {}) {
if (!token) throw new Error('missing CWA_API_KEY secret');
const timeoutMs = Number(options.timeoutMs || 9000);
const cacheTtl = Number(options.cacheTtl || 30);
const url = new URL(CWA_API_ROOT + datasetId);
url.searchParams.set('Authorization', token);
url.searchParams.set('format', 'JSON');

const controller = new AbortController();
const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
try {
const response = await fetch(url.toString(), {
signal: controller.signal,
headers: { Accept: 'application/json,text/plain,*/*' },
cf: {
cacheEverything: true,
cacheTtlByStatus: {
'200-299': cacheTtl,
'404': 5,
'500-599': 0
}
}
});
const text = await response.text();
if (!response.ok) throw new Error(`${datasetId} HTTP ${response.status}: ${text.slice(0, 180)}`);
try {
return JSON.parse(text);
} catch (_) {
// CAP 資料有時仍以 XML 回傳；只交給該資料集的專用解析器，不做全域文字搜尋。
return { _text: text };
}
} finally {
clearTimeout(timer);
}
}

function parseNumber(value) {
if (typeof value === 'number') return Number.isFinite(value) ? value : null;
const text = cleanString(value);
if (!text) return null;
const match = text.match(/[-+]?\d+(?:\.\d+)?/);
if (!match) return null;
const number = Number(match[0]);
return Number.isFinite(number) ? number : null;
}

function parseRain(value) {
if (value && typeof value === 'object' && 'Precipitation' in value) value = value.Precipitation;
const text = cleanString(value).toUpperCase();
if (!text) return null;
if (text === 'T') return 0.01; // trace is positive, not a dry measurement
if (text === '-98') return 0;
if (text === 'X' || text === '-99' || text === '-999') return null;
const number = parseNumber(text);
if (number === null || number < 0) return null;
return Math.round(number * 10) / 10;
}

function parseDateMs(value) {
const text = cleanString(value);
if (!text) return NaN;
let normalized = text;
if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(normalized)) {
normalized = normalized.replace(' ', 'T') + '+08:00';
}
const time = new Date(normalized).getTime();
return Number.isFinite(time) ? time : NaN;
}

function isCurrentWindow(start, end, now = Date.now()) {
const startMs = parseDateMs(start);
const endMs = parseDateMs(end);
// 只顯示已生效警報；到期後保留 2 分鐘容錯。
if (Number.isFinite(startMs) && startMs > now + 60_000) return false;
if (Number.isFinite(endMs) && endMs < now - 120_000) return false;
return true;
}

function toTaiwanLocalString(value) {
const text = cleanString(value);
if (!text) return '';
// CWA 原始時間通常已是 +08:00；前端既有程式會自行補 +08:00，因此回傳不帶時區的臺灣時間。
const direct = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
if (direct && /(?:\+08:?00)?$/.test(text)) {
return `${direct[1]} ${direct[2].length === 5 ? direct[2] + ':00' : direct[2]}`;
}
const time = parseDateMs(text);
if (!Number.isFinite(time)) return text.replace('T', ' ').replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '');
const parts = new Intl.DateTimeFormat('sv-SE', {
timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
}).formatToParts(new Date(time));
const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
}

function normalizeAreaList(values) {
return uniq(values).map(normalizeTwName).filter(Boolean);
}

function parseCountiesFromText(text) {
const source = normalizeTwName(text);
const matches = [];
for (const county of TAIWAN_COUNTIES) {
if (source.includes(county)) matches.push(county);
}
if (/全臺|全台|臺灣全區|全國/.test(source)) matches.push('全臺');
return uniq(matches);
}

function areaMatchesTarget(areas, targetCounty, targetTown) {
const normalized = normalizeAreaList(areas);
const county = normalizeTwName(targetCounty);
const town = normalizeTwName(targetTown);
if (!county && !town) return true;
if (normalized.some(a => a === '全臺' || a === '臺灣')) return true;
if (town && normalized.some(a => a === town || a.includes(town) || town.includes(a))) return true;
return Boolean(county && normalized.some(a => a === county || a.includes(county) || county.includes(a)));
}

function classifyWarning(phenomena, significance = '') {
const text = `${cleanString(phenomena)} ${cleanString(significance)}`;
if (/颱風/.test(text)) return { id: 'typhoon', icon: '🌀', severity: 'danger' };
if (/大雷雨|雷雨|雷擊/.test(text)) return { id: 'storm', icon: '⛈', severity: 'danger' };
if (/豪雨|豪大雨|短延時強降雨/.test(text)) return { id: 'heavyRain', icon: '🌧', severity: 'danger' };
if (/大雨/.test(text)) return { id: 'heavyRain', icon: '🌧', severity: 'warn' };
if (/陸上強風|強風|平均風|陣風/.test(text)) return { id: 'strongWind', icon: '💨', severity: 'warn' };
if (/高溫/.test(text)) return { id: 'heat', icon: '🥵', severity: 'warn' };
if (/低溫|寒流/.test(text)) return { id: 'cold', icon: '🥶', severity: 'warn' };
if (/濃霧|能見度/.test(text)) return { id: 'fog', icon: '🌫', severity: 'info' };
return { id: 'weather', icon: '⚠️', severity: 'info' };
}

function unwrapHazards(container) {
if (!container) return [];
if (Array.isArray(container)) return container.flatMap(unwrapHazards);
if (typeof container !== 'object') return [];
if (container.hazard !== undefined) return unwrapHazards(container.hazard);
if (container.hazards !== undefined && container.info === undefined) return unwrapHazards(container.hazards);
return [container];
}

function makeAlert({ sourceDataset, phenomena, significance, areas, effective, expires, description, issueTime }) {
const event = [cleanString(phenomena), cleanString(significance)].filter(Boolean).join('') || '中央氣象署天氣警特報';
const cls = classifyWarning(phenomena || event, significance);
return {
id: cls.id,
icon: cls.icon,
severity: cls.severity,
sourceDataset,
sourceDatasets: [sourceDataset],
official: true,
event,
title: event,
headline: event,
phenomena: cleanString(phenomena),
significance: cleanString(significance),
areas: normalizeAreaList(areas),
matchedArea: true,
effective: cleanString(effective),
expires: cleanString(expires),
issueTime: cleanString(issueTime),
description: cleanString(description).slice(0, 1600)
};
}

function extractAreaWarnings(raw, targetCounty, targetTown) {
const locations = asArray(firstPath(raw, [
['records', 'location'],
['records', 'Location'],
['records', 'locations', 'location'],
['records', 'locations', 'Location'],
['records', 'dataset', 'location'],
['records', 'dataset', 'Location']
]));

const alerts = [];
const county = normalizeTwName(targetCounty);
const town = normalizeTwName(targetTown);

for (const location of locations) {
if (!location || typeof location !== 'object') continue;
const locationName = normalizeTwName(pick(location, ['locationName', 'LocationName', 'CountyName', 'TownName']));
if (!locationName) continue;
// 001 是「以縣市地區為主」；先精準選中所在地，完全不掃描其他縣市內容。
if (county && locationName !== county && locationName !== town) continue;
if (!county && town && locationName !== town) continue;

const hazards = unwrapHazards(firstPath(location, [
['hazardConditions', 'hazards'],
['HazardConditions', 'Hazards'],
['hazardConditions'],
['HazardConditions']
]));

for (const hazard of hazards) {
const info = firstPath(hazard, [['info'], ['Info']]) || {};
const valid = firstPath(hazard, [['validTime'], ['ValidTime']]) || {};
const phenomena = pick(info, ['phenomena', 'Phenomena', 'event', 'Event']);
const significance = pick(info, ['significance', 'Significance']);
if (!cleanString(phenomena)) continue;
const effective = pick(valid, ['startTime', 'StartTime', 'effective']);
const expires = pick(valid, ['endTime', 'EndTime', 'expires']);
if (!isCurrentWindow(effective, expires)) continue;
alerts.push(makeAlert({
sourceDataset: DATASETS.warningByArea,
phenomena,
significance,
areas: [locationName],
effective,
expires,
description: '',
issueTime: pick(raw, ['sent', 'Sent'])
}));
}
}
return alerts;
}

function getContentText(dataset) {
const contents = asArray(firstPath(dataset, [
['contents', 'content'], ['Contents', 'Content'], ['contents'], ['Contents']
]));
const chinese = contents.find(content => /zh/i.test(cleanString(pick(content, ['contentLanguage', 'ContentLanguage', 'language']))));
const selected = chinese || contents[0] || {};
return cleanString(pick(selected, ['contentText', 'ContentText', 'description', 'Description']));
}

function getAffectedAreas(info) {
const locations = asArray(firstPath(info, [
['affectedAreas', 'location'], ['AffectedAreas', 'Location'],
['affectedAreas'], ['AffectedAreas']
]));
const areas = [];
for (const location of locations) {
if (typeof location === 'string') areas.push(location);
else if (location && typeof location === 'object') {
areas.push(pick(location, ['locationName', 'LocationName', 'areaDesc', 'AreaDesc']));
}
}
return normalizeAreaList(areas);
}

function extractEventWarnings(raw, targetCounty, targetTown) {
const datasets = asArray(firstPath(raw, [
['records', 'dataset'], ['records', 'Dataset'],
['dataset'], ['Dataset']
]));
const alerts = [];

for (const dataset of datasets) {
if (!dataset || typeof dataset !== 'object') continue;
const datasetInfo = firstPath(dataset, [['datasetInfo'], ['DatasetInfo']]) || {};
const valid = firstPath(datasetInfo, [['validTime'], ['ValidTime']]) || {};
const effective = pick(valid, ['startTime', 'StartTime', 'effective']);
const expires = pick(valid, ['endTime', 'EndTime', 'expires']);
const issueTime = pick(datasetInfo, ['issueTime', 'IssueTime', 'update', 'Update']);
if (!isCurrentWindow(effective, expires)) continue;

const hazards = unwrapHazards(firstPath(dataset, [
['hazardConditions', 'hazards'], ['HazardConditions', 'Hazards'],
['hazardConditions'], ['HazardConditions']
]));
const description = getContentText(dataset);
const datasetDescription = pick(datasetInfo, ['datasetDescription', 'DatasetDescription']);

for (const hazard of hazards) {
const info = firstPath(hazard, [['info'], ['Info']]) || {};
const phenomena = pick(info, ['phenomena', 'Phenomena', 'event', 'Event']) || datasetDescription;
const significance = pick(info, ['significance', 'Significance']);
if (!cleanString(phenomena)) continue;
let areas = getAffectedAreas(info);
// 某些版本 affectedAreas 只存在於內容文字；只擷取正式縣市名稱，不讀 metadata。
if (!areas.length) areas = parseCountiesFromText(description);
if (!areaMatchesTarget(areas, targetCounty, targetTown)) continue;

alerts.push(makeAlert({
sourceDataset: DATASETS.warningByEvent,
phenomena,
significance,
areas,
effective,
expires,
description,
issueTime
}));
}
}
return alerts;
}

function mergeWarnings(areaWarnings, eventWarnings) {
const merged = new Map();
// 002 有完整內文，先放；001 用來補漏或補區域。
for (const alert of [...eventWarnings, ...areaWarnings]) {
const key = [alert.id, alert.phenomena, alert.significance, alert.effective, alert.expires].join('|');
const existing = merged.get(key);
if (!existing) {
merged.set(key, { ...alert });
continue;
}
existing.areas = normalizeAreaList([...existing.areas, ...alert.areas]);
existing.sourceDatasets = uniq([...existing.sourceDatasets, ...alert.sourceDatasets]);
if ((alert.description || '').length > (existing.description || '').length) {
existing.description = alert.description;
existing.sourceDataset = alert.sourceDataset;
}
if (!existing.issueTime && alert.issueTime) existing.issueTime = alert.issueTime;
}
const order = { danger: 0, warn: 1, info: 2 };
return [...merged.values()].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
}

function xmlTag(xml, tag) {
const match = String(xml || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function xmlTags(xml, tag) {
const out = [];
const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
let match;
while ((match = regex.exec(String(xml || '')))) out.push(match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim());
return out;
}

function parseTyphoonCap(raw) {
let msgType = '';
let status = '';
let event = '';
let headline = '';
let description = '';
let effective = '';
let expires = '';
let areas = [];
let parameterPairs = [];

if (cleanString(raw?._text)) {
const xml = raw._text;
msgType = xmlTag(xml, 'msgType');
status = xmlTag(xml, 'status');
event = xmlTag(xml, 'event');
headline = xmlTag(xml, 'headline');
description = xmlTag(xml, 'description');
effective = xmlTag(xml, 'effective') || xmlTag(xml, 'onset');
expires = xmlTag(xml, 'expires');
areas = xmlTags(xml, 'areaDesc');
const parameters = xmlTags(xml, 'parameter');
parameterPairs = parameters.map(block => ({
name: xmlTag(block, 'valueName'),
value: xmlTag(block, 'value')
}));
} else {
const alert = firstPath(raw, [['records', 'alert'], ['alert'], ['records']]) || {};
msgType = cleanString(pick(alert, ['msgType', 'MsgType']));
status = cleanString(pick(alert, ['status', 'Status']));
const infos = asArray(firstPath(alert, [['info'], ['Info']]));
const info = infos.find(item => /zh/i.test(cleanString(pick(item, ['language', 'Language'])))) || infos[0] || {};
event = cleanString(pick(info, ['event', 'Event']));
headline = cleanString(pick(info, ['headline', 'Headline']));
description = cleanString(pick(info, ['description', 'Description']));
effective = cleanString(pick(info, ['effective', 'Effective', 'onset', 'Onset']));
expires = cleanString(pick(info, ['expires', 'Expires']));
const areaObjects = asArray(firstPath(info, [['area'], ['Area']]));
areas = areaObjects.map(area => typeof area === 'string' ? area : pick(area, ['areaDesc', 'AreaDesc']));
const params = asArray(firstPath(info, [['parameter'], ['Parameter']]));
parameterPairs = params.map(param => ({
name: cleanString(pick(param, ['valueName', 'ValueName', 'name'])),
value: cleanString(pick(param, ['value', 'Value']))
}));
}

const text = `${event} ${headline} ${description}`;
const cancelled = /cancel/i.test(msgType) || /解除|取消/.test(headline) || /解除警報/.test(description);
const actual = !status || /actual/i.test(status);
const isTyphoon = /颱風|熱帶性低氣壓|熱帶低壓/i.test(text);
const active = Boolean(actual && !cancelled && isTyphoon && isCurrentWindow(effective, expires));

const paramName = parameterPairs.find(pair => /颱風.*名稱|typhoon.*name|name/i.test(pair.name) && pair.value)?.value || '';
const nameMatch = text.match(/(?:第\s*\d+\s*號\s*)?(?:強烈|中度|輕度)?颱風\s*([\u4e00-\u9fffA-Za-z-]{2,16})/);
let nameZh = cleanString(paramName || (nameMatch && nameMatch[1]));
if (/^(警報|消息|動態|資訊|影響)$/.test(nameZh)) nameZh = '';

const normalizedAreas = normalizeAreaList(areas.flatMap(area => {
const counties = parseCountiesFromText(area);
return counties.length ? counties : [area];
}));

return {
active,
seaAlert: active && /海上颱風警報|海上警報/.test(text),
landAlert: active && /陸上颱風警報|陸上警報/.test(text),
affectedAreas: active ? normalizedAreas : [],
typhoons: active ? [{
name: nameZh || 'Tropical Cyclone',
nameZh: nameZh || '颱風',
intensityId: /強烈颱風/.test(text) ? 'severe' : /中度颱風/.test(text) ? 'moderate' : /輕度颱風/.test(text) ? 'mild' : 'td',
intensity: /強烈颱風/.test(text) ? '強烈颱風' : /中度颱風/.test(text) ? '中度颱風' : /輕度颱風/.test(text) ? '輕度颱風' : '熱帶氣旋',
intensityShort: /強烈颱風/.test(text) ? '強颱' : /中度颱風/.test(text) ? '中颱' : /輕度颱風/.test(text) ? '輕颱' : '熱帶氣旋',
maxWindKmh: null,
distanceKm: null,
minForecastDistKm: null,
nearestPoint: '',
approaching: false,
headline: headline || event,
effective,
expires
}] : []
};
}

function intensityNumber(value) {
const text = cleanString(value);
if (!text) return 0;
if (/7/.test(text)) return 7;
if (/6強/.test(text)) return 6.5;
if (/6弱/.test(text)) return 6;
if (/5強/.test(text)) return 5.5;
if (/5弱/.test(text)) return 5;
const number = parseNumber(text);
return number || 0;
}

function extractEarthquakeArray(raw) {
return asArray(firstPath(raw, [
['records', 'Earthquake'], ['records', 'earthquake'],
['records', 'Earthquakes'], ['records', 'earthquakes'],
['Earthquake'], ['earthquake']
])).filter(item => item && typeof item === 'object');
}

function parseEarthquake(event) {
const info = firstPath(event, [['EarthquakeInfo'], ['earthquakeInfo']]) || {};
const epicenter = firstPath(info, [['Epicenter'], ['epicenter']]) || {};
const magnitudeObject = firstPath(info, [['EarthquakeMagnitude'], ['earthquakeMagnitude']]) || {};
const originTime = toTaiwanLocalString(pick(info, ['OriginTime', 'originTime']));
const magnitude = parseNumber(pick(magnitudeObject, ['MagnitudeValue', 'magnitudeValue', 'Magnitude', 'magnitude']));
const focalDepth = parseNumber(pick(info, ['FocalDepth', 'focalDepth']));
const lat = parseNumber(pick(epicenter, ['EpicenterLatitude', 'epicenterLatitude', 'Latitude', 'latitude']));
const lon = parseNumber(pick(epicenter, ['EpicenterLongitude', 'epicenterLongitude', 'Longitude', 'longitude']));
const location = cleanString(pick(epicenter, ['Location', 'location'])) || cleanString(pick(event, ['ReportContent', 'reportContent']));
if (!originTime || magnitude === null || lat === null || lon === null) return null;

const intensityRoot = firstPath(event, [['Intensity'], ['intensity']]) || {};
const shakingAreas = asArray(firstPath(intensityRoot, [['ShakingArea'], ['shakingArea']]));
let maxIntensity = 0;
let maxIntensityLabel = '';
let maxIntensityAreas = [];

for (const area of shakingAreas) {
if (!area || typeof area !== 'object') continue;
const label = cleanString(pick(area, ['AreaIntensity', 'areaIntensity', 'SeismicIntensity', 'seismicIntensity']));
const numeric = intensityNumber(label);
const areaName = cleanString(pick(area, ['AreaDesc', 'areaDesc', 'CountyName', 'countyName']));
if (numeric > maxIntensity) {
maxIntensity = numeric;
maxIntensityLabel = label;
maxIntensityAreas = areaName ? [areaName] : [];
} else if (numeric === maxIntensity && areaName) {
maxIntensityAreas.push(areaName);
}
}

const reportContent = cleanString(pick(event, ['ReportContent', 'reportContent']));
if (!maxIntensity && reportContent) {
const match = reportContent.match(/最大震度\s*([^，。；\s]+)/);
if (match) {
maxIntensityLabel = match[1];
maxIntensity = intensityNumber(match[1]);
}
}

const no = cleanString(pick(event, ['EarthquakeNo', 'earthquakeNo', 'identifier', 'id'])) ||
`${originTime}|${magnitude}|${lat.toFixed(3)}|${lon.toFixed(3)}`;

return {
no,
originTime,
location: location || '臺灣附近',
magnitude,
focalDepth: focalDepth ?? 0,
lat,
lon,
maxIntensity,
maxIntensityLabel: maxIntensityLabel || (maxIntensity ? `${maxIntensity}級` : ''),
maxIntensityArea: uniq(maxIntensityAreas).join('、'),
reportContent,
web: cleanString(pick(event, ['Web', 'web'])),
reportImage: cleanString(pick(event, ['ReportImageURI', 'reportImageURI']))
};
}

function extractEarthquakes(rawMajor, rawSmall) {
const map = new Map();
for (const raw of [rawMajor, rawSmall]) {
for (const event of extractEarthquakeArray(raw)) {
const parsed = parseEarthquake(event);
if (!parsed) continue;
const key = `${parsed.originTime}|${parsed.magnitude}|${parsed.lat.toFixed(3)}|${parsed.lon.toFixed(3)}`;
const previous = map.get(key);
if (!previous || JSON.stringify(parsed).length > JSON.stringify(previous).length) map.set(key, parsed);
}
}
return [...map.values()]
.sort((a, b) => parseDateMs(b.originTime) - parseDateMs(a.originTime))
.slice(0, 10);
}

function getStationArray(raw) {
return asArray(firstPath(raw, [
['records', 'Station'], ['records', 'station'],
['records', 'Stations', 'Station'], ['records', 'stations', 'station'],
['Station'], ['station']
])).filter(item => item && typeof item === 'object');
}

function getStationGeo(station) {
const geo = firstPath(station, [['GeoInfo'], ['geoInfo']]) || {};
const coordinates = asArray(firstPath(geo, [['Coordinates'], ['coordinates']]));
const wgs84 = coordinates.find(item => /WGS84/i.test(cleanString(pick(item, ['CoordinateName', 'coordinateName'])))) || coordinates[0] || {};
return {
countyName: normalizeTwName(pick(geo, ['CountyName', 'countyName', 'County', 'county'])),
townName: normalizeTwName(pick(geo, ['TownName', 'townName', 'Town', 'town'])),
lat: parseNumber(pick(wgs84, ['StationLatitude', 'stationLatitude', 'Latitude', 'latitude'])) ??
parseNumber(pick(geo, ['StationLatitude', 'stationLatitude', 'Latitude', 'latitude'])),
lon: parseNumber(pick(wgs84, ['StationLongitude', 'stationLongitude', 'Longitude', 'longitude'])) ??
parseNumber(pick(geo, ['StationLongitude', 'stationLongitude', 'Longitude', 'longitude']))
};
}

function haversineKm(lat1, lon1, lat2, lon2) {
if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
const radians = degrees => degrees * Math.PI / 180;
const dLat = radians(lat2 - lat1);
const dLon = radians(lon2 - lon1);
const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stationDistance(stationGeo, lat, lon) {
const userLat = parseNumber(lat);
const userLon = parseNumber(lon);
if (userLat === null || userLon === null || stationGeo.lat === null || stationGeo.lon === null) return null;
const distance = haversineKm(userLat, userLon, stationGeo.lat, stationGeo.lon);
return distance === null ? null : Math.round(distance * 10) / 10;
}

function chooseStation(items, lat, lon, targetCounty, targetTown) {
if (!items.length) return null;
const userLat = parseNumber(lat);
const userLon = parseNumber(lon);
const county = normalizeTwName(targetCounty);
const town = normalizeTwName(targetTown);
const hasGps = userLat !== null && userLon !== null;

const scored = items.map(item => {
let score = 100000;
if (hasGps && item.distanceKm !== null) score = item.distanceKm;
else if (town && item.townName && (item.townName === town || item.townName.includes(town) || town.includes(item.townName))) score = 0;
else if (county && item.countyName === county) score = 1000;
return { item, score };
}).sort((a, b) => a.score - b.score);
return scored[0].item;
}

function observationTime(station) {
return cleanString(firstPath(station, [
['ObsTime', 'DateTime'], ['obsTime', 'dateTime'],
['ObsTime'], ['obsTime'], ['DateTime'], ['dateTime']
]));
}

function parseRainStation(station, lat, lon) {
const geo = getStationGeo(station);
const rainfall = firstPath(station, [['RainfallElement'], ['rainfallElement'], ['WeatherElement'], ['weatherElement']]) || {};
const getRain = paths => parseRain(firstPath(rainfall, paths));
const rain10Min = getRain([['Past10Min', 'Precipitation'], ['past10Min', 'precipitation']]);
const rain1h = getRain([['Past1hr', 'Precipitation'], ['Past1Hour', 'Precipitation'], ['past1hr', 'precipitation']]);
const rain3h = getRain([['Past3hr', 'Precipitation'], ['Past3Hour', 'Precipitation'], ['past3hr', 'precipitation']]);
const rain6h = getRain([['Past6hr', 'Precipitation'], ['Past6Hour', 'Precipitation'], ['past6hr', 'precipitation']]);
const rain12h = getRain([['Past12hr', 'Precipitation'], ['Past12Hour', 'Precipitation'], ['past12hr', 'precipitation']]);
const rain24h = getRain([['Past24hr', 'Precipitation'], ['Past24Hour', 'Precipitation'], ['past24hr', 'precipitation']]);
const rainToday = getRain([['Now', 'Precipitation'], ['now', 'precipitation']]);

return {
stationName: cleanString(pick(station, ['StationName', 'stationName'])) || '雨量站',
stationId: cleanString(pick(station, ['StationId', 'StationID', 'stationId'])),
countyName: geo.countyName,
townName: geo.townName,
distanceKm: stationDistance(geo, lat, lon),
precipitation: rain10Min,
rain10Min,
rain1h,
rain3h,
rain6h,
rain12h,
rain24h,
rainToday,
obsTime: observationTime(station),
lat: geo.lat,
lon: geo.lon,
sourceDataset: DATASETS.rainNow,
updateFrequency: '10min'
};
}

function nearestRainStation(raw, lat, lon, targetCounty, targetTown) {
const candidates = getStationArray(raw)
.map(station => parseRainStation(station, lat, lon))
.filter(station => station.lat !== null && station.lon !== null && validObservedStation(station));
return chooseStation(candidates, lat, lon, targetCounty, targetTown);
}

function weatherTextToWmo(text) {
const source = cleanString(text);
if (!source) return null;
if (/冰雹/.test(source)) return 96;
if (/雨夾雪|雨雪/.test(source)) return 68;
if (/雪|霰/.test(source)) return 71;
if (/雷/.test(source)) return 95;
if (/暴雨|豪雨|大雨/.test(source)) return 65;
if (/毛毛雨|細雨/.test(source)) return 51;
if (/雨/.test(source)) return 61;
if (/霧/.test(source)) return 45;
if (/陰/.test(source)) return 3;
if (/雲/.test(source)) return 2;
if (/晴/.test(source)) return 0;
return null;
}
function observedNumber(value, min, max) {
const n = parseNumber(value);
return n !== null && n >= min && n <= max ? n : null;
}
function validObservedStation(station, now = Date.now()) {
const at = parseDateMs(station.obsTime);
return Number.isFinite(at) && now-at >= -120000 && now-at <= 1200000;
}
function parseWeatherStation(station, lat, lon) {
const geo = getStationGeo(station);
const weather = firstPath(station, [['WeatherElement'], ['weatherElement']]) || {};
const temperature = observedNumber(pick(weather, ['AirTemperature', 'airTemperature']), -60, 60);
const humidity = observedNumber(pick(weather, ['RelativeHumidity', 'relativeHumidity']), 0, 100);
const windSpeed = observedNumber(pick(weather, ['WindSpeed', 'windSpeed']), 0, 120);
const windDirection = observedNumber(pick(weather, ['WindDirection', 'windDirection']), 0, 360);
const gustSpeed = observedNumber(firstPath(weather, [['GustInfo','PeakGustSpeed'], ['PeakGustSpeed'], ['WindGust']]), 0, 150);
const weatherText = cleanString(pick(weather, ['Weather', 'weather', 'WeatherDescription', 'weatherDescription']));
const visibility = parseNumber(pick(weather, ['Visibility', 'visibility']));
const precipitation = parseRain(pick(weather, ['Precipitation', 'precipitation']));

return {
kind: 'observation',
time: observationTime(station),
stationName: cleanString(pick(station, ['StationName', 'stationName'])) || '氣象站',
stationId: cleanString(pick(station, ['StationId', 'StationID', 'stationId'])),
countyName: geo.countyName,
townName: geo.townName,
distanceKm: stationDistance(geo, lat, lon),
obsTime: observationTime(station),
lat: geo.lat,
lon: geo.lon,
temperature,
humidity: humidity === null ? null : Math.round(humidity),
relativeHumidity: humidity === null ? null : Math.round(humidity),
windSpeed,
windDirection,
windKmh: windSpeed === null ? null : Math.round(windSpeed * 36) / 10,
windSpeedKmh: windSpeed === null ? null : Math.round(windSpeed * 36) / 10,
peakGustSpeed: gustSpeed,
gustKmh: gustSpeed === null ? null : Math.round(gustSpeed * 36) / 10,
weather: weatherText,
weatherText,
wmo: weatherTextToWmo(weatherText),
code: weatherTextToWmo(weatherText),
codeDerivedFrom: 'observed-weather-text',
cloud: null,
visibility,
precipitation,
sourceDataset: DATASETS.weatherNow,
updateFrequency: '10min'
};
}

function nearestWeatherStation(raw, lat, lon, targetCounty, targetTown) {
const candidates = getStationArray(raw)
.map(station => parseWeatherStation(station, lat, lon))
.filter(station => station.lat !== null && station.lon !== null && validObservedStation(station));
return chooseStation(candidates, lat, lon, targetCounty, targetTown);
}

function recentEarthquakeExists(earthquakes, maxHours = 24) {
const now = Date.now();
return earthquakes.some(event => {
const time = parseDateMs(event.originTime);
return Number.isFinite(time) && now - time >= -60_000 && now - time <= maxHours * 3600_000;
});
}


// ─────────────────────────────────────────────────────────────
// 行政院人事行政總處「天然災害停止上班及上課情形」(DGPA) 代抓與解析
// 頁面為 HTML、無 CORS，由 worker 快取 5 分鐘後轉成 JSON。
// 解析策略：以 <tr> 切列 → 去標籤取純文字 → 第一個縣市名為該列主體 →
// 內容中的「今天／明天」+「停止上班」判定；「XX區…停止上班」視為部分地區。
// ─────────────────────────────────────────────────────────────
const DGPA_URL = 'https://www.dgpa.gov.tw/typh/daily/nds.html';
const TW_COUNTIES = ['臺北市','新北市','桃園市','臺中市','臺南市','高雄市','基隆市','新竹市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣'];
function stripHtml(html) {
return String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
.replace(/[ \t\u3000]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
function taiwanDateKey(offsetDays = 0) {
const now = new Date(Date.now() + 8 * 3600 * 1000 + offsetDays * 86400000);
return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}
// 「下午3時起停止上班」「中午12時起」「上午10時後」→ 小時（24h）；無時間 → null
function parseSuspensionStartHour(text) {
const m = String(text || '').match(/(上午|中午|下午|晚上|凌晨)?\s*(\d{1,2})\s*(?:時|:|：)\s*(\d{2})?\s*分?\s*(?:起|後|以後)?[^。；;]*?停止上班/);
if (!m) return null;
let h = Number(m[2]); const mm = Number(m[3] || 0);
const p = m[1] || '';
if ((p === '下午' || p === '晚上') && h < 12) h += 12;
if (p === '中午' && h < 12) h = 12;
if (p === '凌晨' && h === 12) h = 0;
return h + mm / 60;
}
function classifySuspensionText(text, targetTown) {
const t = String(text || '').replace(/\s+/g, '');
if (!t || /尚未宣布|尚未公布|未發布/.test(t)) return { status: 'unknown', stopWork: false, stopClass: false, partial: false };
const stopWork = /停止上班/.test(t), stopClass = /停止上課/.test(t);
const normal = /照常上班/.test(t);
// 「XX區…停止上班」且另有「照常」→ 部分地區；若鄉鎮名包含使用者鄉鎮則視為適用
let partial = false, townMatched = false;
if (stopWork && normal) {
partial = true;
const towns = (t.match(/[\u4e00-\u9fa5]{1,4}(?:區|鄉|鎮|市)(?=[、，,及與和]|停止|：|:|$)/g) || []).map(normalizeTwName);
townMatched = !!targetTown && towns.some(x => x === normalizeTwName(targetTown) || x.replace(/[區鄉鎮市]$/, '') === String(targetTown).replace(/[區鄉鎮市]$/, ''));
}
const applies = stopWork && (!partial || townMatched);
return { status: applies ? 'stop' : stopWork ? 'partial' : normal ? 'normal' : 'unknown', stopWork: applies, stopClass, partial, townMatched, fromHour: applies ? parseSuspensionStartHour(t) : null };
}
async function fetchWorkSuspension(targetCounty, targetTown) {
const out = { ok: false, source: 'dgpa.gov.tw/typh/daily/nds.html', fetchedAt: nowIsoTaiwan(), county: targetCounty, town: targetTown || null, days: [], raw: [] };
try {
const response = await fetch(DGPA_URL, { headers: { 'User-Agent': 'myshift-cwa-worker/1.0', 'Accept-Language': 'zh-TW' }, cf: { cacheTtl: 300, cacheEverything: true } });
if (!response.ok) { out.error = `dgpa http ${response.status}`; return out; }
const html = await response.text();
const rows = html.split(/<tr[\s>]/i).slice(1).map(r => stripHtml(r)).filter(Boolean);
const county = normalizeTwName(targetCounty);
const todayKey = taiwanDateKey(0), tomorrowKey = taiwanDateKey(1);
const byDate = {};
for (const row of rows) {
const lines = row.split('\n').map(s => s.trim()).filter(Boolean);
const joined = lines.join(' ');
const hit = TW_COUNTIES.find(c => normalizeTwName(joined).includes(c));
if (!hit || hit !== county) continue;
out.raw.push(joined.slice(0, 200));
// 同一列可能同時含今天與明天兩段；以「今天／明天」關鍵字切分
const segs = joined.split(/(?=今天|明天|今日|明日)/).map(s => s.trim()).filter(s => /停止|照常|尚未/.test(s));
for (const seg of segs) {
const isTomorrow = /^(明天|明日)/.test(seg), key = isTomorrow ? tomorrowKey : todayKey;
const c = classifySuspensionText(seg, targetTown);
const prev = byDate[key];
// 多列時保留「停班」優先於「照常」
if (!prev || (c.stopWork && !prev.stopWork)) byDate[key] = { date: key, label: isTomorrow ? '明天' : '今天', text: seg.replace(/^(今天|明天|今日|明日)[:：]?/, '').trim(), ...c };
}
}
out.days = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
out.ok = true;
} catch (error) { out.error = String(error && error.message || error); }
return out;
}

export default {
async fetch(request, env) {
const url = new URL(request.url);
if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
if (url.pathname === '/health') {
return jsonResponse({ ok: true, service: 'cwa-data', version: 'realtime-v6-2026-10-22', ts: nowIsoTaiwan() });
}

const token = getToken(env, url);
const countyInput = url.searchParams.get('county') || env.DEFAULT_COUNTY || '臺南市';
const targetCounty = COUNTY_ALIASES[countyInput] || normalizeTwName(countyInput);
const targetTown = normalizeTwName(url.searchParams.get('town') || env.DEFAULT_TOWN || '鹽水區');
const lat = cleanString(url.searchParams.get('lat'));
const lon = cleanString(url.searchParams.get('lon'));

const result = {
ok: true,
service: 'cwa-data-official',
version: 'realtime-v6-2026-10-22',
source: 'Central Weather Administration Open Data Platform',
officialDatasets: Object.values(DATASETS),
target: { county: targetCounty, town: targetTown, lat: lat || null, lon: lon || null },
fetchedAt: nowIsoTaiwan(),
officialAlertActive: false,
headline: '',
officialAlerts: [],
weatherWarnings: [],
warningAffectedAreas: [],
affectedAreas: [],
active: false,
seaAlert: false,
landAlert: false,
typhoonAffectedAreas: [],
typhoons: [],
earthquakeActive: false,
earthquakes: [],
rainObservation: null,
weatherObservation: null,
workSuspension: null,
errors: []
};

if (!token) {
result.ok = false;
result.errors.push('Missing Cloudflare secret CWA_API_KEY. Set it in Worker Settings → Variables → Secrets.');
return jsonResponse(result, 500);
}

const datasetJobs = [
[DATASETS.warningByArea, 30],
[DATASETS.warningByEvent, 30],
[DATASETS.typhoonWarning, 30],
[DATASETS.typhoonTrack, 60],
[DATASETS.quakeMajor, 30],
[DATASETS.quakeSmall, 30],
[DATASETS.rainNow, 60],
[DATASETS.weatherNow, 60]
];

const suspensionJob = fetchWorkSuspension(targetCounty, targetTown);
const settled = await Promise.allSettled(datasetJobs.map(([datasetId, cacheTtl]) =>
fetchCwaJson(datasetId, token, { cacheTtl }).catch(error => ({ _error: error.message }))
));
result.workSuspension = await suspensionJob;
if (result.workSuspension && result.workSuspension.error) result.errors.push(`dgpa: ${result.workSuspension.error}`);

const values = settled.map((job, index) => {
const datasetId = datasetJobs[index][0];
if (job.status === 'rejected') {
result.errors.push(`${datasetId}: ${job.reason?.message || job.reason}`);
return {};
}
if (job.value?._error) result.errors.push(`${datasetId}: ${job.value._error}`);
return job.value || {};
});

const [warningAreaRaw, warningEventRaw, typhoonWarningRaw, _typhoonTrackRaw, quakeMajorRaw, quakeSmallRaw, rainRaw, weatherRaw] = values;

const areaWarnings = warningAreaRaw?._error ? [] : extractAreaWarnings(warningAreaRaw, targetCounty, targetTown);
const eventWarnings = warningEventRaw?._error ? [] : extractEventWarnings(warningEventRaw, targetCounty, targetTown);
const officialAlerts = mergeWarnings(areaWarnings, eventWarnings);

result.officialAlerts = officialAlerts;
result.weatherWarnings = officialAlerts;
result.officialAlertActive = officialAlerts.length > 0;
result.warningAffectedAreas = normalizeAreaList(officialAlerts.flatMap(alert => alert.areas));
result.headline = officialAlerts
.map(alert => `${alert.icon} ${alert.event}${alert.areas.length ? `（${alert.areas.slice(0, 4).join('、')}）` : ''}`)
.join('；');

const typhoon = typhoonWarningRaw?._error ? {
active: false, seaAlert: false, landAlert: false, affectedAreas: [], typhoons: []
} : parseTyphoonCap(typhoonWarningRaw);
result.active = typhoon.active;
result.seaAlert = typhoon.seaAlert;
result.landAlert = typhoon.landAlert;
result.typhoonAffectedAreas = typhoon.affectedAreas;
result.typhoons = typhoon.typhoons;
result.affectedAreas = normalizeAreaList([...result.warningAffectedAreas, ...result.typhoonAffectedAreas]);

if (!quakeMajorRaw?._error || !quakeSmallRaw?._error) {
result.earthquakes = extractEarthquakes(quakeMajorRaw?._error ? {} : quakeMajorRaw, quakeSmallRaw?._error ? {} : quakeSmallRaw);
result.earthquakeActive = recentEarthquakeExists(result.earthquakes, 24);
}

if (!rainRaw?._error) result.rainObservation = nearestRainStation(rainRaw, lat, lon, targetCounty, targetTown);
if (!weatherRaw?._error) result.weatherObservation = nearestWeatherStation(weatherRaw, lat, lon, targetCounty, targetTown);

return jsonResponse(result);
}
};


