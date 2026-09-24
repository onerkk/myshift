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
