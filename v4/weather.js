/* MyShift v4 — 天氣頁（目前天氣／逐時／降雨／雨量站／多日預報／潮汐／警報）與各頁共用抬頭
   資料與判斷全部沿用原函式（_wxCurrentView、_rainObsMeta、evaluateWxAlerts、tidePhaseInfo、_normalPop…）；動作不變。
   新增：目前時刻的濕度／風速／陣風／雲量、未來 24 小時逐時列（標出你的上班時段）、多日預報溫度區間條。 */
(function(){
'use strict';
const two=n=>String(n).padStart(2,'0');
const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
function onShift(ms){
  const dt=new Date(ms);
  for(let k=-1;k<=0;k++){const b=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()+k),r=getShiftWorkRule(b.getFullYear(),b.getMonth()+1,b.getDate());
    if(r.isWork){const st=b.getTime()+r.startMinute*6e4;if(ms>=st&&ms<st+r.shiftHours*36e5)return true}}
  return false;
}

/* 各頁共用抬頭（薪資／天氣／更多） */
window.uiScreenHeading=function(title,sub,action){
  return `<div class="v4-root v4-pagehead"><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>${action||''}</div>`;
};

window._wxStatusHtml=function(){
  const zh=lang==='zh',d=wxData,stale=_wxStale(),offline=navigator.onLine===false;
  const status=_wxLoading?(zh?'更新中…':'Memperbarui…'):offline?(zh?'離線・顯示上次資料':'Offline · data tersimpan'):_wxErrorCode?(zh?'更新未成功・稍後自動重試':'Pembaruan gagal · dicoba otomatis'):stale?(zh?'資料較舊・等候更新':'Data lama · menunggu pembaruan'):(zh?'開啟時每 5 分鐘更新':'Diperbarui setiap 5 menit saat terbuka');
  const place=d?.place?.display||(d?Number(d.lat).toFixed(3)+', '+Number(d.lon).toFixed(3):'');
  const mode=d?.locationSource==='manual'?(zh?'手選地點':'Lokasi pilihan'):d?.locationSource==='last-known'?(zh?'最後定位':'Lokasi terakhir'):(zh?'定位':'Lokasi');
  return `<div class="v4-wxbar"><button type="button" class="v4-wxplace" onclick="openWxLocation()">${studioIcon('location',16)}<span><small>${esc(mode)}</small><b>${place?esc(place):(zh?'選擇地點':'Pilih tempat')}</b></span><em>${zh?'選擇地點':'Pilih tempat'}</em></button><div class="v4-wxlive${stale||offline||_wxErrorCode?' stale':''}${_wxLoading?' busy':''}" role="status" aria-live="polite"><span><i></i>${status}</span><button type="button" data-a="wxR" ${_wxLoading?'disabled':''}>${uiIcon('refresh',14)} ${zh?'更新':'Perbarui'}</button></div></div>`;
};

function hourlyStripHtml(d){
  if(!d||!Array.isArray(d.hTime))return'';
  const zh=lang==='zh';let start=_wxHourIndex();if(start<0)start=0;
  const items=[];let any=false,lastDate='';
  for(let i=start;i<d.hTime.length&&items.length<24;i++){
    const ms=new Date(d.hTime[i]).getTime();if(!Number.isFinite(ms))continue;
    const temp=num(d.hTemp&&d.hTemp[i]),pop=d.hPrec?_normalPop(d.hPrec[i]):null,code=num(d.hCode&&d.hCode[i]),on=onShift(ms),dt=new Date(ms),dk=dt.getDate();
    if(on)any=true;
    const dayMark=lastDate!==''&&dk!==lastDate?`<span class="day">${dt.getMonth()+1}/${dk}</span>`:'';lastDate=dk;
    items.push(`<div class="v4-hr${on?' on':''}${items.length===0?' now':''}${pop!==null&&pop>=70?' wet2':pop!==null&&pop>=40?' wet':''}" role="listitem" aria-label="${two(dt.getHours())}:00 ${temp!==null?Math.round(temp)+'°C':''} ${pop!==null?(zh?'降雨 ':'Hujan ')+pop+'%':''}${on?(zh?' 上班時段':' jam kerja'):''}"><small>${items.length===0?(zh?'現在':'Kini'):two(dt.getHours())}${dayMark}</small><i>${code!==null?studioWeatherIcon(code,20):'·'}</i><b>${temp!==null?Math.round(temp)+'°':'—'}</b><span class="pop"><u style="height:${pop===null?0:Math.max(4,pop)}%"></u></span><em>${pop===null?'—':pop+'%'}</em></div>`);
  }
  if(items.length<3)return'';
  return `<div class="v4-root v4-slab v4-hourly"><div class="v4-sec-head tight"><div><h2>${zh?'未來 24 小時':'24 jam ke depan'}</h2><p>${zh?'氣溫・天氣・降雨機率':'Suhu · cuaca · peluang hujan'}</p></div>${any?`<span class="v4-key"><i></i>${zh?'你的上班時段':'Jam kerja Anda'}</span>`:''}</div><div class="v4-hrs" role="list">${items.join('')}</div></div>`;
}

window.uiPrecipChartHtml=function(d){
  if(!d||!Array.isArray(d.hTime)||!Array.isArray(d.hPrec))return'';
  const zh=lang==='zh';let start=_wxHourIndex();if(start<0)start=0;const pts=[];
  for(let i=start;i<d.hTime.length&&new Date(d.hTime[i]).getTime()<Date.now()+12*3600000&&pts.length<12;i++){
    const p=_normalPop(d.hPrec[i]);if(p===null)continue;
    pts.push({p,hour:String(d.hTime[i]).slice(11,13),src:_popSourceAt(d,i)});
  }
  if(pts.length<3)return'';
  const W=320,H=104,padX=10,base=78,barW=16,gap=(W-padX*2-barW*pts.length)/Math.max(1,pts.length-1),max=Math.max(...pts.map(x=>x.p));
  const bars=pts.map((x,i)=>{const h=Math.max(2,x.p/100*60),px=padX+i*(barW+gap),y=base-h,hot=x.p>=70?' high':x.p>=40?' mid':'';return `<g class="pb${hot}"><rect class="bg" x="${px.toFixed(1)}" y="${base-60}" width="${barW}" height="60" rx="8"/><rect x="${px.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="${Math.min(8,h/2).toFixed(1)}"/>${x.p===max&&max>0?`<text class="top" x="${(px+barW/2).toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle">${x.p}</text>`:''}<text x="${(px+barW/2).toFixed(1)}" y="98" text-anchor="middle">${i%2===0||i===pts.length-1?x.hour:''}</text></g>`}).join('');
  const source=pts.some(x=>x.src==='cwa')?(zh?'CWA 區間預報':'Interval CWA'):(zh?'模式預報':'Model');
  const values=pts.map(x=>`${x.hour}:00 ${x.p}%`).join('、');
  return `<div class="v4-root v4-slab v4-precip"><div class="v4-sec-head tight"><div><h2>${zh?'未來 12 小時降雨機率':'Hujan 12 jam'}</h2><p><span class="v4-badge">${source}</span></p></div><span class="v4-sec-count">${max}<small>% ${zh?'最高':'maks.'}</small></span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${zh?'降雨機率':'Kemungkinan hujan'}：${values}">${bars}</svg></div>`;
};

window.rainObsHtml=function(){
  const m=_rainObsMeta();if(!m)return'';
  const zh=lang==='zh',ro=m.ro,station=esc(ro.stationName||'雨量站'),town=esc([ro.countyName,ro.townName].filter(Boolean).join('')),dist=m.hasDistance?`${m.distanceKm.toFixed(m.distanceKm<10?1:0)}km`:'',obs=ro.obsTime?`${zh?'觀測':'Obs'} ${esc(_fmtTimeShort(ro.obsTime))}`:'';
  let state='remote',trust=zh?'測站較遠，僅供參考':'Reference only';
  if(m.local){state=m.raining?'raining':'local';trust=zh?(m.raining?'所在地正在下雨':'本地實測'):(m.raining?'Raining locally':'Local observation')}
  else if(m.nearby){state='nearby';trust=zh?'鄰近測站參考':'Nearby reference'}
  else if(!m.fresh){state='stale';trust=zh?`資料約 ${Number.isFinite(m.ageMin)?m.ageMin:'--'} 分鐘前`:'Observation is stale'}
  const values=[[zh?'10 分鐘':'10m',m.r10],[zh?'1 小時':'1h',m.r1],[zh?'3 小時':'3h',m.r3],[zh?'24 小時':'24h',m.r24]];
  return `<div class="v4-root v4-slab v4-rain st-${state}">${`<div class="v4-sec-head"><span class="v4-sec-ic">${studioIcon(state==='raining'?'rain':'location',19)}</span><div><h2>${zh?'即時雨量站':'Live rain station'}</h2><p>${trust}</p></div><span class="v4-badge${m.local?' ok':''}">${m.local?(zh?'本地實測':'Lokal'):(zh?'測站參考':'Ref')}</span></div>`}<div class="v4-rain-place"><b>${station}</b>${town?`<span>${town}</span>`:''}<small>${dist?`${zh?'距離':'Jarak'} ${dist} · `:''}${obs}</small></div><div class="v4-rain-grid">${values.map(([label,value])=>`<div><span>${label}</span><strong>${_rainMm(value)}</strong><small>mm</small></div>`).join('')}</div></div>`;
};

window.rainWarnHtml=function(){
  const zh=lang==='zh',_dbg=(typeof location!=='undefined'&&location.search.indexOf('raindbg=1')>=0);
  if(!wxData||_wxStale()||!wxData.hPrec||S.step!=='cal')return _dbg?_rainDbgBox('wxData/hPrec 未就緒或非月曆頁'):'';
  const sh=gs(TY,TM,TD);if(!sh||sh==='休')return _dbg?_rainDbgBox(`今天班別=${sh||'無'}，不顯示出勤雨具提醒`):'';
  const hrs=SHIFT_HR[sh];if(!hrs)return'';const ds=`${TY}-${two(TM)}-${two(TD)}`;let mx=0,mxSource='none';
  hrs.forEach(h=>{const i=wxData.hTime.indexOf(ds+'T'+two(h)+':00');if(i>=0){const v=_normalPop(wxData.hPrec[i]);if(v!==null&&v>mx){mx=v;mxSource=_popSourceAt(wxData,i)}}});
  if(mx<40)return'';const sn=zh?{早:'早班',中:'中班',晚:'晚班'}[sh]:{早:'Pagi',中:'Siang',晚:'Malam'}[sh],tr=`${two(hrs[0])}:00–${two(hrs[hrs.length-1]+1)}:00`,src=_popSourceLabel(mxSource,zh);
  return `<div class="v4-root v4-slab v4-umbrella${mx>=70?' high':''}"><span class="v4-sec-ic">${studioIcon('rain',20)}</span><div><strong>${zh?`${sn}出門帶雨具`:`${sn}: bawa payung`}</strong><span>${tr} · ${zh?'最高降雨機率':'Kemungkinan hujan'} ${mx}% · ${src}</span></div><b>${mx}<small>%</small></b></div>`;
};

window.wxAlertHtml=function(){
  if(S.step!=='cal')return'';
  const alerts=evaluateWxAlerts();if(!alerts.length)return'';const zh=lang==='zh';
  const items=alerts.map(a=>{
    const level=['danger','warn','info'].includes(a.level)?a.level:'warn';
    const detail=esc(_limitText(String(a.detail||'').replace(/[📍⏰]/g,'').replace(/\s*\|\s*/g,' · '),220));
    const badge=a.official?(a.regional?(zh?'縣市公告':'Regional'):(zh?'官方警特報':'Official')):(a.realtimeObs?(zh?'測站實況':'Observation'):(a.officialForecast?(zh?'官方預報':'Forecast'):(a.modelOnly?(zh?'模式參考':'Model'):'')));
    const more=a.bodyFull?`<details class="v4-alert-more"><summary>${zh?'查看官方說明':'Official detail'}</summary><div>${esc(_limitText(a.bodyFull,220))}</div></details>`:'';
    return `<article class="v4-alert lv-${level}"><div class="v4-alert-ic" aria-hidden="true">${studioAlertVisual(a.id)}</div><div class="v4-alert-copy"><div class="v4-alert-title"><strong>${esc(a.title)}</strong>${badge?`<span class="v4-badge">${badge}</span>`:''}</div><p>${detail}</p>${more}</div></article>`;
  }).join('');
  return `<div class="v4-root v4-slab v4-alerts"><div class="v4-sec-head tight"><span class="v4-sec-ic">${studioIcon('shield',18)}</span><div><h2>${zh?'即時災防與天氣':'Disaster & weather'}</h2></div><span class="v4-sec-count">${alerts.length}</span></div>${items}</div>`;
};

window.wxHtml=function(){
  const zh=lang==='zh';
  if(!wxData)return `<div class="v4-root v4-slab v4-wxempty" aria-busy="${_wxLoading}"><div class="v4-wxempty-ic">${_wxLoading?'<span class="v4-spin"></span>':studioIcon('cloud',30)}</div><strong>${_wxLoading?(zh?'正在取得天氣':'Memuat cuaca'):(zh?'暫時無法取得天氣':'Cuaca belum tersedia')}</strong><p>${_wxLoading?(zh?'正在取得所在地的最新預報。':'Mencari lokasi dan data cuaca gratis.'):_wxErrorText()}</p><div class="v4-wxempty-actions"><button type="button" class="v4-btn primary" data-a="wxR" ${_wxLoading?'disabled':''}>${uiIcon('refresh',16)} ${zh?'重新載入':'Muat ulang'}</button><button type="button" class="v4-btn" onclick="openWxLocation()">${zh?'選擇地點':'Pilih tempat'}</button></div></div>`;
  const d=wxData,now=_wxCurrentView(d),wk=t('wk'),desc=zh?WXZ:WXD,updated=_wxTimeLabel(d.sourceTime||d.updatedAt);
  const idx=now.hourIndex??_wxHourIndex(),at=a=>idx>=0&&a?num(a[idx]):null;
  const hum=at(d.hHum),wind=at(d.hWind),gust=at(d.hGust)??num(d.gust),cloud=num(d.currentCloud)??at(d.hCloud);
  const metrics=[[zh?'濕度':'Lembap',hum,'%'],[zh?'風速':'Angin',wind,'km/h'],[zh?'陣風':'Hembusan',gust,'km/h'],[zh?'雲量':'Awan',cloud,'%']].filter(x=>x[1]!==null);
  const todayKey=_nowHourKey().slice(0,10),lows=d.days.map(f=>num(f.lo)).filter(v=>v!==null),highs=d.days.map(f=>num(f.hi)).filter(v=>v!==null),mn=Math.min(...lows),mx=Math.max(...highs),span=Math.max(1,mx-mn);
  const fc=d.days.map((f,i)=>{const dt=new Date(f.date+'T12:00:00'),dw=dt.getDay(),today=f.date===todayKey,lo=num(f.lo),hi=num(f.hi),ok=lo!==null&&hi!==null;
    return `<button class="v4-fday${today?' today':''}${dw===0||dw===6?' we':''}" aria-label="${f.date} ${esc(desc[f.code]||'')} ${f.lo}–${f.hi}°C" onclick="wxDetailShow=true;wxDetailDay=${i};render();event.stopPropagation()"><span class="d"><b>${today?(zh?'今天':'Hari ini'):(zh?'週':'')+wk[dw]}</b><small>${dt.getMonth()+1}/${dt.getDate()}</small></span><i>${studioWeatherIcon(f.code,22)}</i><em class="t">${esc(desc[f.code]||'')}</em><small class="lo">${f.lo}°</small><span class="bar"><u style="left:${ok?((lo-mn)/span*100).toFixed(1):0}%;width:${ok?Math.max(6,(hi-lo)/span*100).toFixed(1):0}%"></u></span><strong class="hi">${f.hi}°</strong></button>`}).join('');
  const sourceLink=d.provider==='met-no'?'https://www.met.no/en':'https://open-meteo.com/';
  return `<div class="v4-root v4-slab v4-wxnow" aria-busy="${_wxLoading}"><button class="v4-wxnow-main" onclick="showWxDetail()"><span class="v4-wxnow-copy"><small>${_wxStale()?(zh?'上次天氣資料':'Cuaca tersimpan'):(now.stationFresh?(zh?'附近雨量實測＋雲況推估':'Rain observation + cloud estimate'):(zh?'目前模式預報':'Current model forecast'))}</small><strong>${d.temp}<span>°C</span></strong><em>${esc(desc[now.code]||(zh?'天氣狀態待確認':'Condition unconfirmed'))}</em></span><span class="v4-wxnow-ic">${studioWeatherSculpture(now.code)}</span></button>${now.note?`<p class="v4-wxnow-note">${esc(now.note)}</p>`:''}${metrics.length?`<div class="v4-wxmetrics">${metrics.map(([l,v,u])=>`<div><span>${l}</span><b>${Math.round(v)}<small>${u}</small></b></div>`).join('')}</div>`:''}<p class="v4-wxsrc"><b>${esc(now.sourceLabel)}</b><span>${zh?'溫度資料時間':'Temperature data'} ${updated}</span></p>${_wxStatusHtml()}</div>`
   +hourlyStripHtml(d)+uiShiftWeatherHtml()+uiPrecipChartHtml(d)+rainObsHtml()
   +`<div class="v4-root v4-slab v4-forecast"><div class="v4-sec-head tight"><div><h2>${zh?d.days.length+' 日預報':'Prakiraan '+d.days.length+' hari'}</h2><p>${zh?'點選查看逐時':'Ketuk untuk per jam'}</p></div></div><div class="v4-fdays">${fc}</div>${d.dayRangeEstimated?`<p class="v4-note">${zh?'備援高低溫取自可用預報時段；較遠日期未提供的逐時欄位保持空白。':'Suhu min/maks dari jam prakiraan tersedia; jam tanpa data tetap kosong.'}</p>`:''}<p class="v4-note v4-credit"><a href="${sourceLink}" target="_blank" rel="noopener noreferrer">${esc(d.source||'Open-Meteo')}</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · ${zh?'模式預報；降雨機率與實況分開顯示':'Model forecast; rain probability and observations are separate'}</p></div>`
   +`<a class="v4-root v4-slab v4-radar" href="radar2.html"><span class="v4-radar-scope" aria-hidden="true"><i></i></span><span class="v4-radar-copy"><b>${zh?'即時雷達與降雨':'Radar & hujan langsung'}</b><small>${zh?'回波動畫 · 未來 4 小時雲流':'Animasi radar · arah awan 4 jam'}</small></span>${uiIcon('chevron',18)}</a>`
   +tideHtml();
};

window.tideHtml=function(){
  const zh=lang==='zh';
  if(tideErr)return'';if(wxData&&!tideData&&!tideErr)return `<div class="v4-root v4-slab v4-tide loading">${studioIcon('wave',21)}<span>${zh?'潮汐資料載入中':'Memuat pasang surut'}</span></div>`;if(!tideData||!tideData.tides||!tideData.tides.length)return'';
  const wk=t('wk'),phase=tidePhaseInfo(),byDate={};tideData.tides.forEach(x=>{if(!byDate[x.date])byDate[x.date]=[];byDate[x.date].push(x)});
  const dates=Object.keys(byDate).sort().slice(0,7),target=phase&&phase.target,targetTime=target&&target.item.time?target.item.time.slice(11,16):'--:--',targetHeight=target&&Number.isFinite(+target.item.height)?`${target.item.height}cm`:'—',phaseDetail=phase&&target?(phase.key==='high'||phase.key==='low'?(zh?`${phase.targetLabel}時刻附近 · ${targetTime}`:`Sekitar ${phase.targetLabel} · ${targetTime}`):(zh?`距${phase.targetLabel}約 ${phase.duration}`:`Menuju ${phase.targetLabel} ${phase.duration}`)):'',progress=phase&&phase.progress!==null?Math.round(phase.progress*100):50;
  const fc=dates.map((date,i)=>{const dt=new Date(date+'T00:00:00+08:00'),items=byDate[date],hi=items.filter(x=>x.type==='滿潮').sort((a,b)=>b.height-a.height)[0],lo=items.filter(x=>x.type==='乾潮').sort((a,b)=>a.height-b.height)[0];return `<button class="v4-tday${i===0?' today':''}" onclick="showTideDetail('${date}');event.stopPropagation()"><span>${date===_nowHourKey().slice(0,10)?(zh?'今天':'Hari ini'):wk[dt.getDay()]}</span><b class="hi">${hi?hi.time.slice(11,16):'--:--'}<small>${zh?'滿':'P'}</small></b><b class="lo">${lo?lo.time.slice(11,16):'--:--'}<small>${zh?'乾':'S'}</small></b></button>`}).join('');
  return `<div class="v4-root v4-slab v4-tide"><button class="v4-tide-head" aria-expanded="${!tideCollapsed}" onclick="toggleTide();event.stopPropagation()"><span class="v4-sec-ic">${studioIcon('wave',21)}</span><span class="c"><strong>${esc(tideData.station)} ${zh?'潮汐':'Pasut'}</strong><small>${zh?'中央氣象署潮位預報':'Prakiraan CWA'}</small></span><em>${tideCollapsed?(zh?'展開':'Buka'):(zh?'收合':'Tutup')} ${uiIcon('chevron',15)}</em></button><button class="v4-tide-status ${phase?phase.key:''}" onclick="showTideDetail('${dates[0]||''}');event.stopPropagation()"><span class="arrow">${phase&&phase.key==='rising'?'↗':phase&&phase.key==='falling'?'↘':phase&&phase.key==='high'?'▲':'▼'}</span><span class="c"><small>${zh?'目前預報潮況':'Prakiraan saat ini'}</small><strong>${phase?phase.state:(zh?'計算中':'Menghitung')}</strong><em>${phaseDetail}</em></span><span class="n"><strong>${targetHeight}</strong><small>${zh?'下一潮位':'Berikutnya'} ${targetTime}</small></span><i class="p"><b style="width:${progress}%"></b></i></button>${tideCollapsed?'':`${uiTideCurveHtml()}<div class="v4-tdays">${fc}</div><button class="v4-btn wide ghost" onclick="showTideDetail('${dates[0]||''}');event.stopPropagation()">${zh?'查看七日完整潮位':'Lihat detail 7 hari'} ${uiIcon('arrow',14)}</button>`}</div>`;
};

/* 版面編排（v4）：與原 rCal 相同的模組，一個都不少；只調整順序 —— 警報與雨具提醒往前、目前天氣放天氣頁最上面。 */
window.rCal=function(){
  const zh=lang==='zh',opt=f=>typeof f==='function'?f():'';let content='';
  if(UI_TAB==='calendar')content=uiCalendarPageHtml();
  else if(UI_TAB==='pay'){
    const al=getAL(),label=al.total>0?t('alRem'):(zh?'設定年度特休':'Atur cuti tahunan');
    const annual=`<button class="al-bar" data-a="alEdit"><span class="insight-icon leave">${studioIcon('leave',22)}</span><span class="al-bar-copy"><strong>${label}</strong><small>${alYRange(curALY())}</small></span><b>${al.total>0?alRem()+' '+t('hr'):uiIcon('chevron',18)}</b></button>`;
    content=`${uiScreenHeading(zh?'薪資':'Gaji',zh?'工時、加班與每一筆明細':'Jam kerja, lembur dan rincian',`<button class="icon-action" data-a="salOpen" aria-label="${zh?'薪資設定':'Pengaturan gaji'}">${uiIcon('settings',20)}</button>`)}${uiSalaryDashboardHtml(PAY_VIEW.y,PAY_VIEW.m)}${annual}`;
  }else if(UI_TAB==='weather'){
    content=`${uiScreenHeading(zh?'天氣':'Cuaca',zh?'預報、雨量與災防資訊':'Prakiraan, hujan dan peringatan',`<button class="icon-action" data-a="prefs" aria-label="${zh?'天氣與警報設定':'Pengaturan cuaca'}">${uiIcon('settings',20)}</button>`)}${opt(window.wxAlertHtml)}${rainWarnHtml()}${wxHtml()}${uiAtmosphereSceneHtml()}${opt(window.notifyCtaHtml)}`;
  }else if(UI_TAB==='more'){
    content=`${uiScreenHeading(zh?'更多':'Lainnya',zh?'常用工具與個人設定':'Alat dan pengaturan pribadi')}${fbBarHtml()}${uiMoreHtml(S.yr,S.mo)}<p class="app-version">${t('app')} · v355 · v4 preview</p>`;
  }else{
    content=`${uiTodayHeroHtml()}${opt(window.wxAlertHtml)}${rainWarnHtml()}${uiQuickToolsHtml()}${uiDayFocusHtml()}${uiWeekStripHtml()}${uiShiftWeatherHtml()}<div class="today-insights">${uiWeatherPreviewHtml()}${uiPayPreviewHtml(TY,TM)}</div>${uiUpcomingEventsHtml(TY,TM)}${uiAtmosphereSceneHtml()}${opt(window.notifyCtaHtml)}`;
  }
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent),showI=(!!DP||isIOS)&&!S.instH;
  const install=showI?`<div class="v4-root v4-slab v4-install"><img src="${IMG.icon}" alt=""><span><b>${t('instT')}</b><small>${DP?t('instS'):t('instSi')}</small></span>${DP?`<button class="v4-btn primary" data-a="inst">${t('instB')}</button>`:''}<button class="v4-notice-x" data-a="hideI" aria-label="${zh?'關閉安裝提示':'Tutup saran instalasi'}">✕</button></div>`:'';
  return `<div class="app-shell" data-screen="${UI_TAB}">${typeof MyShiftNavigation!=='undefined'?MyShiftNavigation.pageBar():''}${uiHeaderHtml()}<main class="app-main screen-${UI_TAB}" id="main-content">${content}${install}</main>${uiBottomNavHtml()}</div>`;
};
if(typeof render==='function')render();
})();
