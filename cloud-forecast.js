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

  function finite(value) {
    const n = Number(value);
    return value !== null && value !== undefined && value !== "" && Number.isFinite(n) ? n : null;
  }

  function localTimeToEpoch(value, offsetSeconds) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ""));
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - (finite(offsetSeconds) || 0) * 1000;
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

  return { createUrl, build, readRows, localTimeToEpoch };
});
