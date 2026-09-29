/* Cloud movement estimate from Open-Meteo hourly cloud layers and pressure-level winds. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CloudForecast = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HOUR = 3600000;
  const LEVELS = [
    { cover: "cloud_cover_low", speed: "wind_speed_850hPa", direction: "wind_direction_850hPa" },
    { cover: "cloud_cover_mid", speed: "wind_speed_700hPa", direction: "wind_direction_700hPa" },
    { cover: "cloud_cover_high", speed: "wind_speed_500hPa", direction: "wind_direction_500hPa" }
  ];
  const FIELDS = ["cloud_cover", ...LEVELS.flatMap(x => [x.cover, x.speed, x.direction])];
  const CLOUD_MAP_COLS = 10, CLOUD_MAP_ROWS = 10, MAX_CLOUD_MAP_POINTS = 100;
  const HIMAWARI_FRAME_MS = 10 * 60000, HIMAWARI_LATENCY_MS = 20 * 60000;

  function finite(value) {
    const n = Number(value);
    return value !== null && value !== undefined && value !== "" && Number.isFinite(n) ? n : null;
  }

  function localTimeToEpoch(value, offsetSeconds) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ""));
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - (finite(offsetSeconds) || 0) * 1000;
  }

  function mercatorY(latitude) {
    const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI / 180;
    return Math.log(Math.tan(Math.PI / 4 + lat / 2));
  }

  function inverseMercatorY(y) {
    return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
  }

  // Build an evenly spaced Web Mercator grid around the visible map. Open-Meteo
  // accepts at most 100 coordinates in one request, so this stays one request.
  function createCloudMapGrid(bounds, columns, rows) {
    if (!bounds) throw new TypeError("Invalid map bounds");
    const north = finite(bounds.north), south = finite(bounds.south);
    const east = finite(bounds.east), west = finite(bounds.west);
    if ([north, south, east, west].some(x => x === null) || north <= south || east <= west) {
      throw new TypeError("Invalid map bounds");
    }
    columns = Math.max(2, Math.min(10, Math.floor(finite(columns) || CLOUD_MAP_COLS)));
    rows = Math.max(2, Math.min(10, Math.floor(finite(rows) || CLOUD_MAP_ROWS)));
    if (columns * rows > MAX_CLOUD_MAP_POINTS) throw new RangeError("Cloud map grid is too large");

    const padLon = Math.max((east - west) * 0.12, 0.06);
    const westEdge = Math.max(-180, west - padLon), eastEdge = Math.min(180, east + padLon);
    const northEdge = Math.min(85, north + Math.max((north - south) * 0.12, 0.06));
    const southEdge = Math.max(-85, south - Math.max((north - south) * 0.12, 0.06));
    const northY = mercatorY(northEdge), southY = mercatorY(southEdge);
    const latitudes = Array.from({ length: rows }, (_, y) => inverseMercatorY(northY + (southY - northY) * y / (rows - 1)));
    const longitudes = Array.from({ length: columns }, (_, x) => westEdge + (eastEdge - westEdge) * x / (columns - 1));
    const points = [];
    latitudes.forEach((lat, row) => longitudes.forEach(lon => points.push({ lat, lon, row, col: points.length % columns })));
    return {
      north: latitudes[0], south: latitudes[latitudes.length - 1],
      west: longitudes[0], east: longitudes[longitudes.length - 1],
      columns, rows, points
    };
  }

  function createCloudMapUrl(grid) {
    if (!grid || !Array.isArray(grid.points) || !grid.points.length || grid.points.length > MAX_CLOUD_MAP_POINTS) {
      throw new TypeError("Invalid cloud map grid");
    }
    const params = new URLSearchParams({
      latitude: grid.points.map(p => Number(p.lat).toFixed(5)).join(","),
      longitude: grid.points.map(p => Number(p.lon).toFixed(5)).join(","),
      current: "cloud_cover", timezone: "auto"
    });
    return "https://api.open-meteo.com/v1/forecast?" + params.toString();
  }

  function nearestGridValue(grid, values, latitude, longitude) {
    const lat = finite(latitude), lon = finite(longitude);
    if (!grid || !Array.isArray(grid.points) || !Array.isArray(values) || lat === null || lon === null) return null;
    let best = null, distance = Infinity;
    grid.points.forEach((point, index) => {
      const value = values[index];
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return;
      const dx = (point.lon - lon) * Math.cos(lat * Math.PI / 180), dy = point.lat - lat;
      const d = dx * dx + dy * dy;
      if (d < distance) { distance = d; best = Number(value); }
    });
    return best;
  }

  function parseCloudMapData(data, grid, position) {
    if (!grid || !Array.isArray(grid.points) || !grid.points.length || grid.points.length > MAX_CLOUD_MAP_POINTS) {
      return { ok: false, reason: "grid" };
    }
    const records = Array.isArray(data) ? data : grid.points.length === 1 ? [data] : null;
    if (!records || records.length !== grid.points.length) return { ok: false, reason: "shape" };
    const values = [], times = [];
    records.forEach(record => {
      const current = record && record.current;
      let cover = finite(current && current.cloud_cover);
      if (cover === null && record && record.hourly && Array.isArray(record.hourly.cloud_cover)) {
        cover = finite(record.hourly.cloud_cover[0]);
      }
      values.push(cover !== null && cover >= 0 && cover <= 100 ? cover : null);
      const time = current && localTimeToEpoch(current.time, record.utc_offset_seconds);
      if (Number.isFinite(time)) times.push(time);
    });
    const valid = values.filter(x => x !== null);
    if (!valid.length) return { ok: false, reason: "cloud_cover" };
    times.sort((a, b) => a - b);
    return {
      ok: true, grid, values,
      cover: Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length),
      time: times.length ? times[Math.floor(times.length / 2)] : null,
      localCover: position ? nearestGridValue(grid, values, position.lat, position.lon) : null,
      validPoints: valid.length
    };
  }

  function interpolateGrid(values, columns, rows, x, y) {
    if (!Array.isArray(values) || values.length !== columns * rows || columns < 2 || rows < 2) return null;
    x = Math.max(0, Math.min(columns - 1, Number(x)));
    y = Math.max(0, Math.min(rows - 1, Number(y)));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(columns - 1, x0 + 1), y1 = Math.min(rows - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    const samples = [
      [values[y0 * columns + x0], (1 - fx) * (1 - fy)],
      [values[y0 * columns + x1], fx * (1 - fy)],
      [values[y1 * columns + x0], (1 - fx) * fy],
      [values[y1 * columns + x1], fx * fy]
    ];
    let total = 0, weight = 0;
    samples.forEach(([value, part]) => {
      if (part > 0 && value !== null && value !== undefined && Number.isFinite(Number(value))) {
        total += Number(value) * part; weight += part;
      }
    });
    return weight ? total / weight : null;
  }

  function himawariFrameTimes(now, attempts) {
    const time = finite(now) || Date.now(), count = Math.max(1, Math.min(8, Math.floor(finite(attempts) || 4)));
    const latest = Math.floor(time / HIMAWARI_FRAME_MS) * HIMAWARI_FRAME_MS - HIMAWARI_LATENCY_MS;
    return Array.from({ length: count }, (_, i) => new Date(latest - i * HIMAWARI_FRAME_MS).toISOString().replace(".000Z", "Z"));
  }

  function himawariTileXY(latitude, longitude, zoom) {
    const lat = finite(latitude), lon = finite(longitude), requestedZoom = finite(zoom);
    const z = Math.max(0, Math.min(6, Math.floor(requestedZoom === null ? 6 : requestedZoom)));
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new TypeError("Invalid coordinates");
    const n = Math.pow(2, z), clamped = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180;
    return {
      z,
      x: Math.max(0, Math.min(n - 1, Math.floor((lon + 180) / 360 * n))),
      y: Math.max(0, Math.min(n - 1, Math.floor((1 - Math.asinh(Math.tan(clamped)) / Math.PI) / 2 * n)))
    };
  }

  function himawariTileUrl(time, tile) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(time || "")) || !tile ||
        !Number.isInteger(tile.z) || tile.z < 0 || tile.z > 6 || !Number.isInteger(tile.x) || !Number.isInteger(tile.y) ||
        tile.x < 0 || tile.y < 0 || tile.x >= 2 ** tile.z || tile.y >= 2 ** tile.z) {
      throw new TypeError("Invalid satellite tile");
    }
    return "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_AHI_Band13_Clean_Infrared/default/" +
      time + "/GoogleMapsCompatible_Level6/" + tile.z + "/" + tile.y + "/" + tile.x + ".png";
  }

  function createUrl(lat, lon) {
    const latitude = finite(lat), longitude = finite(lon);
    if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new TypeError("Invalid coordinates");
    }
    const params = new URLSearchParams({
      latitude: latitude.toFixed(5), longitude: longitude.toFixed(5),
      hourly: FIELDS.join(","), timezone: "auto", forecast_hours: "8", wind_speed_unit: "kmh"
    });
    return "https://api.open-meteo.com/v1/forecast?" + params.toString();
  }

  function readRows(data) {
    const hourly = data && data.hourly;
    if (!hourly || !Array.isArray(hourly.time) || !hourly.time.length) return [];
    const offset = finite(data.utc_offset_seconds) || 0;
    return hourly.time.map((time, i) => {
      const row = { time: localTimeToEpoch(time, offset) };
      for (const field of FIELDS) row[field] = Array.isArray(hourly[field]) ? finite(hourly[field][i]) : null;
      return row;
    }).filter(row => Number.isFinite(row.time)).sort((a, b) => a.time - b.time);
  }

  function interp(a, b, part) {
    if (a === null && b === null) return null;
    if (a === null) return b;
    if (b === null) return a;
    return a + (b - a) * part;
  }

  function interpAngle(a, b, part) {
    if (a === null && b === null) return null;
    if (a === null) return b;
    if (b === null) return a;
    const ar = a * Math.PI / 180, br = b * Math.PI / 180;
    const x = Math.cos(ar) * (1 - part) + Math.cos(br) * part;
    const y = Math.sin(ar) * (1 - part) + Math.sin(br) * part;
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function valueAt(rows, field, target) {
    if (!rows.length || target < rows[0].time || target > rows[rows.length - 1].time) return null;
    let hi = rows.findIndex(row => row.time >= target);
    if (hi < 0) hi = rows.length - 1;
    const right = rows[hi], left = rows[Math.max(0, hi - 1)];
    if (right.time === left.time) return right[field];
    const part = Math.max(0, Math.min(1, (target - left.time) / (right.time - left.time)));
    return field.indexOf("direction") >= 0 ? interpAngle(left[field], right[field], part) : interp(left[field], right[field], part);
  }

  function normalizeBearing(degrees) { return (degrees % 360 + 360) % 360; }

  function bearingBetween(a, b) {
    const p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
    const dl = (b.lon - a.lon) * Math.PI / 180;
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return normalizeBearing(Math.atan2(y, x) * 180 / Math.PI);
  }

  function build(data, options) {
    options = options || {};
    const lat = finite(options.lat), lon = finite(options.lon), now = finite(options.now) || Date.now();
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { ok: false, reason: "position" };
    const rows = readRows(data);
    if (rows.length < 2 || now + 4 * HOUR > rows[rows.length - 1].time + 30 * 60000) return { ok: false, reason: "forecast" };

    let position = { lat, lon };
    const points = [{ ...position, hour: 0, time: now, cloudCover: null, speed: 0, bearing: null, coherence: null }];
    for (let hour = 1; hour <= 4; hour++) {
      const time = now + hour * HOUR;
      const layerData = LEVELS.map(level => ({
        cover: valueAt(rows, level.cover, time),
        speed: valueAt(rows, level.speed, time),
        direction: valueAt(rows, level.direction, time)
      })).filter(layer => layer.speed !== null && layer.direction !== null && layer.speed >= 0 && layer.cover !== null && layer.cover >= 8);
      if (!layerData.length) return { ok: false, reason: "wind" };

      let east = 0, north = 0, weightSum = 0, coverSum = 0, coverWeight = 0, speedSum = 0;
      for (const layer of layerData) {
        // Meteorological direction points FROM; reverse it to project where clouds travel TO.
        const toward = (layer.direction + 180) * Math.PI / 180;
        const weight = Math.max(8, layer.cover);
        east += Math.sin(toward) * layer.speed * weight;
        north += Math.cos(toward) * layer.speed * weight;
        weightSum += weight;
        coverSum += layer.cover * weight;
        coverWeight += weight;
        speedSum += layer.speed * weight;
      }
      const ve = east / weightSum, vn = north / weightSum;
      const speed = Math.hypot(ve, vn);
      const bearing = speed < 1 ? null : normalizeBearing(Math.atan2(ve, vn) * 180 / Math.PI);
      const coherence = speedSum > 0 ? Math.max(0, Math.min(1, speed / (speedSum / weightSum))) : 0;
      const cloudCover = valueAt(rows, "cloud_cover", time) ?? (coverWeight ? coverSum / coverWeight : null);

      if (bearing !== null) {
        // Speeds are requested in km/h; 1 degree latitude is approximately 111.32 km.
        const radians = bearing * Math.PI / 180;
        position = {
          lat: position.lat + (Math.cos(radians) * speed) / 111.32,
          lon: position.lon + (Math.sin(radians) * speed) / (111.32 * Math.max(0.15, Math.cos(position.lat * Math.PI / 180)))
        };
      }
      points.push({ ...position, hour, time, cloudCover, speed, bearing, coherence });
    }

    const endpoint = points[points.length - 1];
    const distanceKm = haversine(points[0], endpoint);
    const bearing = distanceKm < 0.2 ? null : bearingBetween(points[0], endpoint);
    const avgCover = points.slice(1).reduce((sum, p) => sum + (p.cloudCover === null ? 0 : p.cloudCover), 0) / 4;
    const coherence = points.slice(1).reduce((sum, p) => sum + (p.coherence || 0), 0) / 4;
    const confidence = avgCover < 15 ? "sparse" : coherence >= 0.68 ? "good" : coherence >= 0.4 ? "medium" : "low";
    return {
      ok: true, points, distanceKm, bearing,
      avgCover: Math.round(avgCover), confidence,
      meanSpeed: Math.round(points.slice(1).reduce((sum, p) => sum + p.speed, 0) / 4)
    };
  }

  function haversine(a, b) {
    const r = 6371, p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
    const dp = p2 - p1, dl = (b.lon - a.lon) * Math.PI / 180;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  return {
    createUrl, build, readRows, localTimeToEpoch,
    createCloudMapGrid, createCloudMapUrl, parseCloudMapData, nearestGridValue, interpolateGrid,
    himawariFrameTimes, himawariTileXY, himawariTileUrl
  };
});
