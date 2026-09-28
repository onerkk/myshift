'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const CloudForecast=require('../cloud-forecast.js');
const HOUR=3600000;

function model({direction=270,cover=70,offset=0}={}){
  const start=Date.UTC(2026,8,24,0),times=Array.from({length:9},(_,i)=>new Date(start+i*HOUR+offset*1000).toISOString().slice(0,16));
  const hourly={time:times};
  for(const field of ['cloud_cover','cloud_cover_low','cloud_cover_mid','cloud_cover_high'])hourly[field]=times.map(()=>cover);
  for(const field of ['wind_speed_850hPa','wind_speed_700hPa','wind_speed_500hPa'])hourly[field]=times.map(()=>36);
  for(const field of ['wind_direction_850hPa','wind_direction_700hPa','wind_direction_500hPa'])hourly[field]=times.map(()=>direction);
  return {utc_offset_seconds:offset,hourly};
}

test('four-hour cloud path reverses meteorological wind direction and projects map coordinates',()=>{
  const now=Date.UTC(2026,8,24,0),result=CloudForecast.build(model(),{lat:23.334,lon:120.289,now});
  assert.equal(result.ok,true);assert.equal(result.points.length,5);assert.equal(result.points[4].hour,4);
  assert.ok(result.points[4].lon>result.points[0].lon,'wind from west should move east');
  assert.ok(Math.abs(result.bearing-90)<1);assert.equal(result.avgCover,70);assert.equal(result.confidence,'good');
});

test('cloud path follows the opposite bearing and interpolates offset local model time',()=>{
  const now=Date.UTC(2026,8,24,0),result=CloudForecast.build(model({direction:90}),{lat:23.334,lon:120.289,now});
  assert.ok(result.points[4].lon<result.points[0].lon,'wind from east should move west');
  assert.equal(CloudForecast.localTimeToEpoch('2026-09-24T08:00',28800),now);
});

test('sparse cloud fields and missing wind are not presented as a confident route',()=>{
  const now=Date.UTC(2026,8,24,0),sparse=CloudForecast.build(model({cover:0}),{lat:23.334,lon:120.289,now});
  assert.equal(sparse.ok,false);assert.equal(sparse.reason,'wind');
  const noWind=model();delete noWind.hourly.wind_speed_850hPa;delete noWind.hourly.wind_speed_700hPa;delete noWind.hourly.wind_speed_500hPa;
  const unavailable=CloudForecast.build(noWind,{lat:23.334,lon:120.289,now});assert.equal(unavailable.ok,false);assert.equal(unavailable.reason,'wind');
});

test('forecast URL requests four-hour cloud layers and pressure-level winds with Taiwan-resolved time',()=>{
  const url=new URL(CloudForecast.createUrl(23.334,120.289));
  assert.equal(url.searchParams.get('timezone'),'auto');assert.equal(url.searchParams.get('forecast_hours'),'8');
  assert.equal(url.searchParams.get('wind_speed_unit'),'kmh');
  assert.match(url.searchParams.get('hourly'),/cloud_cover_low/);assert.match(url.searchParams.get('hourly'),/wind_direction_700hPa/);
  assert.throws(()=>CloudForecast.createUrl(99,120),/coordinates/i);
});

test('cloud map samples the visible area as an even Mercator grid within one free API batch',()=>{
  const grid=CloudForecast.createCloudMapGrid({north:23.8,south:22.8,east:120.9,west:119.8});
  assert.equal(grid.columns*grid.rows,100);assert.equal(grid.points.length,100);
  assert.ok(grid.points[0].lat>grid.points[90].lat,'first grid row is north of the final row');
  assert.ok(grid.points[0].lon<grid.points[9].lon,'first grid column is west of the final column');
  const url=new URL(CloudForecast.createCloudMapUrl(grid));
  assert.equal(url.searchParams.get('current'),'cloud_cover');
  assert.equal(url.searchParams.get('latitude').split(',').length,100);
  assert.equal(url.searchParams.get('longitude').split(',').length,100);
});

test('cloud map decoder preserves spatial order, cover and model observation time',()=>{
  const now=Date.UTC(2026,8,24,0),grid=CloudForecast.createCloudMapGrid({north:24,south:23,east:121,west:120},2,2);
  const payload=[0,20,60,100].map(cloud_cover=>({utc_offset_seconds:28800,current:{time:'2026-09-24T08:00',cloud_cover}}));
  const result=CloudForecast.parseCloudMapData(payload,grid,{lat:grid.points[2].lat,lon:grid.points[2].lon});
  assert.equal(result.ok,true);assert.deepEqual(result.values,[0,20,60,100]);
  assert.equal(result.cover,45);assert.equal(result.localCover,60);assert.equal(result.time,now);assert.equal(result.validPoints,4);
  assert.equal(CloudForecast.parseCloudMapData(payload.slice(1),grid).reason,'shape');
});

test('cloud map interpolation blends nearby samples and ignores missing cells',()=>{
  assert.equal(CloudForecast.interpolateGrid([0,100,100,100],2,2,.5,.5),75);
  assert.equal(CloudForecast.interpolateGrid([null,40,60,80],2,2,0,0),null);
  assert.equal(CloudForecast.interpolateGrid([null,40,60,80],2,2,.5,.5),60);
});

test('Himawari tile requests use recent ten-minute observation times and Web Mercator coordinates',()=>{
  const now=Date.UTC(2026,8,28,9,41),times=CloudForecast.himawariFrameTimes(now,4);
  assert.deepEqual(times,['2026-09-28T09:20:00Z','2026-09-28T09:10:00Z','2026-09-28T09:00:00Z','2026-09-28T08:50:00Z']);
  const tile=CloudForecast.himawariTileXY(23.326,120.274,7);
  assert.equal(tile.z,7);assert.ok(tile.x>=0&&tile.x<128);assert.ok(tile.y>=0&&tile.y<128);
  assert.match(CloudForecast.himawariTileUrl(times[0],tile),/Himawari_AHI_Band13_Clean_Infrared\/default\/2026-09-28T09:20:00Z\/GoogleMapsCompatible_Level9\/7\//);
  assert.throws(()=>CloudForecast.himawariTileXY(100,120,7),/coordinates/i);
});
