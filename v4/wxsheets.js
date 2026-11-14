/* MyShift v4 — 逐時天氣彈窗、潮汐明細彈窗
   資料與判斷同原 wxDetailHtml／tideDetailHtml；.wx-detail／.wx-detail-sheet 類名保留（導覽模組與捲動鎖定依賴）。
   新增：當日氣溫曲線、上班時段標示、目前這一小時標示、潮位高度條。選地點對話框由原函式建立，樣式在 skin.css。 */
(function(){
'use strict';
const two=n=>String(n).padStart(2,'0');
function onShift(ms){
  const dt=new Date(ms);
  for(let k=-1;k<=0;k++){const b=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()+k),r=getShiftWorkRule(b.getFullYear(),b.getMonth()+1,b.getDate());
    if(r.isWork){const st=b.getTime()+r.startMinute*6e4;if(ms>=st&&ms<st+r.shiftHours*36e5)return true}}
  return false;
}
const tabs=(html,zh)=>`<div class="detail-day-tabs v4-daytabs" role="group" aria-label="${zh?'選擇日期':'Pilih tanggal'}">${html}</div>`;

window.wxDetailHtml=function(){
  if(!wxDetailShow||!wxData)return'';
  const zh=lang==='zh',desc=zh?WXZ:WXD,day=wxData.days[wxDetailDay];if(!day)return'';
  const today=day.date,windowH=Number(wxData._popWindowH)||null,nowKey=_nowHourKey();
  let rows='';const temps=[];let anyShift=false;
  for(let h=0;h<24;h++){
    const k=today+'T'+two(h)+':00',i=wxData.hTime.indexOf(k);if(i<0)continue;
    const tv=wxData.hTemp&&WeatherData.num(wxData.hTemp[i])!==null?Math.round(Number(wxData.hTemp[i])):null;
    const pop=_normalPop(wxData.hPrec&&wxData.hPrec[i]),src=_popSourceAt(wxData,i);
    const popBadge=src==='cwa'?(zh?`官方${windowH?` ${windowH}h`:''}`:`CWA${windowH?` ${windowH}h`:''}`):(src==='open-meteo'||src==='met-no'?(zh?'模式':'Model'):'');
    const wind=wxData.hGust&&WeatherData.num(wxData.hGust[i])!==null?Math.round(Number(wxData.hGust[i])):null;
    const hum=wxData.hHum&&WeatherData.num(wxData.hHum[i])!==null?Math.round(Number(wxData.hHum[i])):null;
    const mmv=wxData.hRain?WeatherData.num(wxData.hRain[i]):null;const code=wxData.hCode?wxData.hCode[i]:0,on=onShift(new Date(k).getTime()),isNow=String(nowKey).slice(0,13)===k.slice(0,13);
    if(tv!==null)temps.push({h,t:tv});if(on)anyShift=true;
    rows+=`<div class="v4-hrow${on?' on':''}${isNow?' now':''}${pop!==null&&pop>=70?' wet2':pop!==null&&pop>=40?' wet':''}" role="row"><span class="h" role="cell">${isNow?(zh?'現在':'Kini'):two(h)+':00'}</span><span class="w" role="cell" title="${esc(desc[code]||'')}">${studioWeatherIcon(code,18)}<b>${tv===null?'--':tv+'°'}</b></span><span class="p wx-pop-cell" role="cell">${pop===null?(mmv!==null?`<em class="mm">${zh?'預估 ':''}${mmv>=10?Math.round(mmv):mmv.toFixed(1)} mm</em>`:'<em>--</em>'):`<i><u style="width:${Math.max(3,pop)}%"></u></i><b class="wx-pop-value">${pop}%</b>${popBadge?`<small class="wx-pop-badge ${src==='cwa'?'official':'model'}">${popBadge}</small>`:''}`}</span><span class="g" role="cell">${wind===null?'--':wind+'<small>km/h</small>'}</span><span class="u" role="cell">${hum===null?'--':hum+'<small>%</small>'}</span></div>`;
  }
  let curve='';
  if(temps.length>=4){
    const W=320,H=74,px=10,mn=Math.min(...temps.map(x=>x.t)),mx=Math.max(...temps.map(x=>x.t)),sp=Math.max(1,mx-mn),X=h=>px+h/23*(W-px*2),Y=t=>14+(mx-t)/sp*(H-34);
    const pts=temps.map(x=>[X(x.h),Y(x.t)]);let path=`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],m=(a[0]+b[0])/2;path+=` C ${m.toFixed(1)} ${a[1].toFixed(1)}, ${m.toFixed(1)} ${b[1].toFixed(1)}, ${b[0].toFixed(1)} ${b[1].toFixed(1)}`}
    const hi=temps.reduce((a,b)=>b.t>a.t?b:a),lo=temps.reduce((a,b)=>b.t<a.t?b:a);
    curve=`<div class="v4-tcurve"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${zh?`當日氣溫 ${mn}–${mx}°C`:`Suhu ${mn}–${mx}°C`}"><defs><linearGradient id="v4tc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".34"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient></defs><path d="${path} L ${pts[pts.length-1][0].toFixed(1)} ${H-14} L ${pts[0][0].toFixed(1)} ${H-14} Z" fill="url(#v4tc)"/><path d="${path}" fill="none" stroke="#ffd27a" stroke-width="2.2" stroke-linecap="round"/><circle cx="${X(hi.h).toFixed(1)}" cy="${Y(hi.t).toFixed(1)}" r="3.4" fill="#ff9c6e"/><text x="${Math.min(W-14,Math.max(14,X(hi.h))).toFixed(1)}" y="${(Y(hi.t)-6).toFixed(1)}" text-anchor="middle" class="hi">${hi.t}°</text><circle cx="${X(lo.h).toFixed(1)}" cy="${Y(lo.t).toFixed(1)}" r="3.4" fill="#8fd3ff"/><text x="${Math.min(W-14,Math.max(14,X(lo.h))).toFixed(1)}" y="${(Y(lo.t)+14).toFixed(1)}" text-anchor="middle" class="lo">${lo.t}°</text>${[0,6,12,18].map(h=>`<text x="${X(h).toFixed(1)}" y="${H-2}" text-anchor="${h===0?'start':'middle'}">${two(h)}</text>`).join('')}</svg></div>`;
  }
  const dayTabs=wxData.days.map((d,i)=>{const dt=new Date(d.date+'T00:00:00');return `<button type="button" class="detail-day-tab${i===wxDetailDay?' active':''}" aria-pressed="${i===wxDetailDay}" aria-label="${esc(d.date)}" onclick="wxDetailDay=${i};render();event.stopPropagation()">${i===0?(zh?'今天':'Hari ini'):t('wk')[dt.getDay()]}<small>${dt.getMonth()+1}/${dt.getDate()}</small></button>`}).join('');
  const hasCwa=Array.isArray(wxData.hPopSource)&&wxData.hPopSource.some((v,i)=>v==='cwa'&&String(wxData.hTime[i]||'').startsWith(today));
  const sourceNote=hasCwa?(zh?`降雨機率採中央氣象署${wxData._cwaScope==='county'?'縣市':'鄉鎮'}預報原始${windowH?windowH+' 小時':'區間'}值；雨量站只顯示實況，不會改寫預報。`:`Rain probability uses original CWA interval values; station observations never overwrite the forecast.`):(zh?`本日 CWA 降雨機率暫無資料，採 ${esc(wxData.source||'Open-Meteo')} 模式；未提供的機率保持空白，不視為 0%。`:`CWA probability unavailable; using ${esc(wxData.source||'Open-Meteo')}. Missing probability stays blank, never 0%.`);
  const place=(wxData.place&&wxData.place.display)||_gpsPlaceText(),updated=_wxTimeLabel(wxData.sourceTime||wxData.updatedAt);
  return `<div class="wx-detail" onclick="closeWxDetail()"><div class="wx-detail-sheet v4-wxsheet" onclick="event.stopPropagation()"><header class="v4-sheet-head"><div><p>${esc(place||'GPS')} · ${zh?'更新':'Diperbarui'} ${esc(updated)}</p><h2 class="wx-detail-title">${zh?'逐時天氣與降雨區間':'Hourly weather & rain intervals'}</h2></div><span class="v4-wxsheet-range">${day.lo}°<i></i>${day.hi}°</span></header>
   ${tabs(dayTabs,zh)}${curve}
   <div class="v4-hgrid" role="table" aria-label="${zh?'逐時預報':'Per jam'}"><div class="v4-hrow head" role="row"><span role="columnheader">${zh?'時間':'Jam'}</span><span role="columnheader">${zh?'天氣':'Cuaca'}</span><span role="columnheader">${zh?'降雨區間':'Hujan'}</span><span role="columnheader">${zh?'陣風':'Gust'}</span><span role="columnheader">${zh?'濕度':'Humid'}</span></div>${rows||`<p class="v4-empty">${zh?'這一天沒有逐時資料。':'Tidak ada data per jam.'}</p>`}</div>
   ${anyShift?`<p class="v4-wxsheet-key"><i></i>${zh?'綠色底＝你的上班時段':'Hijau = jam kerja Anda'}</p>`:''}
   <p class="wx-source-note v4-note">${sourceNote}</p>
   <div class="v4-wxsheet-rain">${rainObsHtml()}</div>
   <button class="modal-done v4-btn primary wide" onclick="closeWxDetail()">${t('done')}</button></div></div>`;
};

window.tideDetailHtml=function(){
  if(!tideDetailShow||!tideData||!tideData.tides)return'';
  const zh=lang==='zh',wk=t('wk'),byDate={};
  tideData.tides.forEach(x=>{if(!byDate[x.date])byDate[x.date]=[];byDate[x.date].push(x)});
  const dates=Object.keys(byDate).sort().slice(0,7),selDate=typeof tideDetailDay==='string'?tideDetailDay:dates[0];
  const items=(byDate[selDate]||[]).slice().sort((a,b)=>a.time.localeCompare(b.time));
  const hs=items.map(x=>Number(x.height)).filter(Number.isFinite),mn=Math.min(...hs,0),mx=Math.max(...hs,1),sp=Math.max(1,mx-mn),now=Date.now();
  const rows=items.map(item=>{const isHi=item.type==='滿潮',h=Number(item.height),past=new Date(item.time).getTime()<now;
    return `<div class="v4-trow ${isHi?'hi':'lo'}${past?' past':''}"><b class="tm">${item.time.slice(11,16)}</b><span class="ty">${isHi?'▲ '+(zh?'滿潮':'Pasang'):'▼ '+(zh?'乾潮':'Surut')}</span><i class="bar"><u style="width:${Number.isFinite(h)?Math.max(6,(h-mn)/sp*100).toFixed(1):6}%"></u></i><b class="ht">${item.height}<small>cm</small></b></div>`}).join('');
  const dayTabs=dates.map((d,i)=>{const dt=new Date(d+'T00:00:00');return `<button type="button" class="detail-day-tab${d===selDate?' active':''}" aria-pressed="${d===selDate}" aria-label="${esc(d)}" onclick="tideDetailDay='${d}';render();event.stopPropagation()">${i===0?(zh?'今天':'Hari ini'):wk[dt.getDay()]}<small>${dt.getMonth()+1}/${dt.getDate()}</small></button>`}).join('');
  return `<div class="wx-detail" onclick="closeTideDetail()"><div class="wx-detail-sheet v4-wxsheet tide" onclick="event.stopPropagation()"><header class="v4-sheet-head"><div><p>${zh?'中央氣象署潮位預報':'Prakiraan CWA'}</p><h2 class="wx-detail-title">${esc(tideData.station)} ${zh?'潮汐詳情':'Detail Pasang Surut'}</h2></div></header>${tabs(dayTabs,zh)}<div class="v4-trows">${rows||`<p class="v4-empty">${zh?'這一天沒有潮汐資料。':'Tidak ada data.'}</p>`}</div><p class="v4-note">${zh?'資料來源：中央氣象署 · 潮位：相對臺灣高程系統(cm)':'Sumber: CWA Taiwan'}</p><button class="modal-done v4-btn primary wide" onclick="closeTideDetail()">${t('done')}</button></div></div>`;
};
if(typeof render==='function')render();
})();
