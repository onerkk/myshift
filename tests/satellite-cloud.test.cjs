'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('../satellite-cloud.js');
const now=Date.parse('2026-09-29T02:40:00Z');

test('NASA published-time domains handle midnight, gaps, UTC and the latest actual frame',()=>{
  assert.doesNotMatch(S.gibsDomainsUrl(now+882),/\.882/,'WMTS time ranges use whole UTC seconds');
  const xml='<Domains><Domain>2026-09-28T23:00:00Z/2026-09-28T23:50:00Z/PT10M,2026-09-29/2026-09-29T02:10:00Z/PT10M</Domain></Domains>';
  assert.deepEqual(S.parseGibsTimes(xml,now),[Date.parse('2026-09-29T02:10:00Z'),Date.parse('2026-09-29T02:00:00Z')]);
  assert.deepEqual(S.parseGibsTimes('<Domain>2026-09-29T02:10:00Z,2026-09-29T01:50:00Z</Domain>',now),[Date.parse('2026-09-29T02:10:00Z'),Date.parse('2026-09-29T01:50:00Z')]);
  assert.deepEqual(S.parseGibsTimes('<Domain>2026-09-27/2026-09-27T02:00:00Z/PT10M</Domain>',now),[]);
  assert.deepEqual(S.parseGibsTimes('<Domain>2026-02-30T02:00:00Z</Domain>',now),[]);
  assert.deepEqual(S.parseGibsTimes('<Exception>unavailable</Exception>',now),[]);
});

test('JMA metadata excludes forecasts, stale frames, future times, malformed dates and duplicates',()=>{
  const data=['20260929023000','20260929022000','20260929023000','20260929025000','20260928090000','20260230023000'].map(t=>({basetime:t,validtime:t}));
  data.push({basetime:'20260929022000',validtime:'20260929024000'},null,{basetime:20260929023000,validtime:20260929023000});
  assert.deepEqual(S.parseJmaTimes(data,now),[Date.parse('2026-09-29T02:30:00Z'),Date.parse('2026-09-29T02:20:00Z')]);
});

test('verified satellite tile specifications cover Taiwan without unsupported zoom or Japan-only cropping',()=>{
  const g=S.descriptor('gibs',now),j=S.descriptor('jma',now);
  assert.equal(g.maxNativeZoom,6);assert.equal(j.maxNativeZoom,5);
  assert.equal(S.tileUrl(g,S.tileAt(g,23.326,120.273)), 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_AHI_Band13_Clean_Infrared/default/2026-09-29T02:40:00Z/GoogleMapsCompatible_Level6/6/27/53.png');
  assert.equal(S.tileUrl(j,S.tileAt(j,23.326,120.273)), 'https://www.jma.go.jp/bosai/himawari/data/satimg/20260929024000/fd/20260929024000/B13/TBB/5/26/13.jpg');
  assert.throws(()=>S.tileAt(g,100,120),/coordinates/);
  assert.throws(()=>S.descriptor('unknown',now),/source/);
});

test('HTTP-success transparent and no-data white tiles cannot become loaded cloud images; clear dark scenes remain valid',()=>{
  assert.equal(S.hasImageData(new Uint8ClampedArray(32*32*4)),false);
  assert.equal(S.hasImageData(new Uint8ClampedArray(32*32*4).fill(255)),false);
  const dark=Uint8ClampedArray.from({length:32*32*4},(_,i)=>i%4===3?255:18);
  assert.equal(S.hasImageData(dark),true);
  for(let i=0;i<dark.length;i+=4)dark[i]=dark[i+1]=dark[i+2]=200;
  assert.equal(S.hasImageData(dark),true,'uniform clouds are valid observations');
});

test('satellite page preserves radar controls and uses truthful source labels without washing out the imagery',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../radar2.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../radar-ui.css'),'utf8');
  for(const id of ['slider','play','prev','next','cloudToggle','radarToggle','cloudReload','taiwanView'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/衛星未取得・目前為模式雲量/);
  assert.doesNotMatch(html,/模式雲量圖已載入|himawariFrameTimes\(/);
  assert.match(css,/\.leaflet-cloudsat-pane\{[^}]*mix-blend-mode:normal/);
  assert.doesNotMatch(css,/mix-blend-mode:screen/);
});
