/* v321 · A complete, read-only monthly poster and an explicit export preview. */
'use strict';
const MyShiftShare=(()=>{
  const themes={
    jade:{paper:'#ecf0e7',paperEnd:'#dce6db',ink:'#183f35',muted:'#587468',line:'#a7bbaa',panel:'#f6f8f0',panelEnd:'#e7eee3',gold:'#957339',goldSoft:'#f2e5bf',shadow:'#1c483529',highlight:'#ffffffd9',
      shifts:{早:['#e7f3e9','#d1e6d9','#23614b'],晚:['#f1edf8','#e1daee','#655180'],中:['#fff5df','#efe1ba','#846024'],休:['#edf1e9','#dce5db','#52685c'],unknown:['#f1f3ed','#e4e8df','#596c60']},
      tones:{holiday:['#f7e5d9','#8e4d3b'], 'own-leave':['#f4e5bd','#7c5721'],meeting:['#e0edf5','#2c5a76'],health:['#f4e0e7','#894660'],pay:['#eef0d5','#5c6b35'],annual:['#e1eede','#3f6d45'],personal:['#e6eee8','#416252'],adjusted:['#ddece8','#3d6b60']}},
    night:{paper:'#11291f',paperEnd:'#1e3e30',ink:'#edf5e7',muted:'#b5cbbb',line:'#4e6f5c',panel:'#244536',panelEnd:'#1a3528',gold:'#ecd79f',goldSoft:'#554a2d',shadow:'#00000070',highlight:'#e0f5d738',
      shifts:{早:['#2d5640','#213f31','#c3ecd2'],晚:['#47415d','#342e46','#e5d5ff'],中:['#51472e','#39341f','#f8dfa1'],休:['#34463a','#25382b','#d0decf'],unknown:['#35463a','#26392c','#d0dfcf']},
      tones:{holiday:['#684333','#ffe0ce'],'own-leave':['#5b4b28','#ffe3a6'],meeting:['#2b5068','#d2ecff'],health:['#643f52','#ffd4e5'],pay:['#45502d','#e5ecbc'],annual:['#385938','#d2f0c5'],personal:['#334d3d','#e3efdf'],adjusted:['#315547','#c8e8dd']}}
  };
  const monthNames={zh:['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],id:['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']};
  const englishMonths=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  let active=null,job=0,imageUrl='',readyFile=null,readyKey='',drawingKey='',busy=false;
  const imageCache=new Map();
  function shiftLabel(shift,language){return (language==='zh'?{早:'早班',晚:'晚班',中:'中班',休:'輪班休假'}:{早:'Pagi',晚:'Malam',中:'Siang',休:'Libur shift'})[shift]||(language==='zh'?'未排班':'Belum ada')}
  function buildModel(y,m){
    if(!Number.isInteger(y)||!Number.isInteger(m)||m<1||m>12||y<1900||y>9999)throw Error('Invalid calendar month');
    const language=lang==='zh'?'zh':'id',zh=language==='zh',days=[];
    for(let d=1;d<=dim(y,m);d++){
      const source=calendarDayInfo(y,m,d),parts=[];
      if(source.holiday)parts.push({label:String(source.holiday),short:String(source.holiday),tone:'holiday'});
      for(const e of source.events||[])parts.push({label:String(e.label||e.short||''),short:String(e.short||e.label||''),tone:e.tone||'personal',own:!!e.own,hours:Number(e.hours)||0,id:e.id||''});
      if(source.adjusted)parts.push({label:zh?'已調班':'Shift diubah',short:zh?'已調班':'Diubah',tone:'adjusted'});
      // Copy presenters only: never export raw leave records, UIDs, reasons, or colleague names.
      days.push({d,key:source.key,shift:source.shift,today:!!source.today,leaveCount:source.leaveCount===null||source.leaveCount===undefined?null:source.leaveCount,parts});
    }
    const counts={早:0,晚:0,中:0,休:0,unknown:0};days.forEach(day=>counts[Object.hasOwn(counts,day.shift)?day.shift:'unknown']++);
    const rotation=(RN[language]&&RN[language][S.rt])||S.rt||'',unit=S.unit==='__all'?(zh?'全部單位':'Semua unit'):S.unit||'';
    const now=new Date(),stamp=`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    return{y,m,language,zh,days,first:fdw(y,m),rows:Math.ceil((fdw(y,m)+days.length)/7),counts,rotation,unit,stamp,weekdays:[...t('wk')],
      ownHours:Math.round(days.reduce((n,day)=>n+day.parts.filter(e=>e.own&&e.id!=='own-overtime').reduce((s,e)=>s+e.hours,0),0)*100)/100};
  }
  function textLines(c,value,width){
    const result=[];let line='';
    const tokens=String(value).replace(/\s+/g,' ').trim().match(/[A-Za-zÀ-ÿ0-9]+(?:[-'’][A-Za-zÀ-ÿ0-9]+)*|[^A-Za-zÀ-ÿ0-9]/gu)||[];
    for(const token of tokens){
      if(c.measureText(token).width>width){
        for(const char of Array.from(token)){if(line&&c.measureText(line+char).width>width){result.push(line.trim());line=char}else line+=char}
      }else if(line&&c.measureText(line+token).width>width){result.push(line.trim());line=token.trimStart()}else line+=token;
    }
    if(line.trim())result.push(line.trim());return result.length?result:[''];
  }
  function clippedLines(c,value,width,maxLines){
    const lines=textLines(c,value,width);if(lines.length<=maxLines)return lines;
    const out=lines.slice(0,maxLines);let last=out[maxLines-1];while(last&&c.measureText(last+'…').width>width)last=Array.from(last).slice(0,-1).join('');out[maxLines-1]=last+'…';return out;
  }
  function loadImage(src){
    if(imageCache.has(src))return imageCache.get(src);
    const promise=new Promise(resolve=>{const img=new Image();let settled=false;const done=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value)};const timer=setTimeout(()=>done(null),1200);img.onload=()=>done(img);img.onerror=()=>done(null);img.src=src});
    imageCache.set(src,promise);return promise;
  }
  function round(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
  function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g}
  function panel(c,x,y,w,h,r,a,b,p,raised=true){
    c.save();if(raised){c.shadowColor=p.shadow;c.shadowBlur=20;c.shadowOffsetY=9;c.fillStyle=p.line;round(c,x,y+4,w,h,r);c.fill();c.shadowColor='transparent'}c.fillStyle=gradient(c,x,y,w,h,a,b);round(c,x,y,w,h,r);c.fill();c.restore();
    c.strokeStyle=p.line;c.lineWidth=1;round(c,x+.5,y+.5,w-1,h-1,r);c.stroke();
    c.save();round(c,x+1,y+1,w-2,h-2,r);c.clip();c.strokeStyle=p.highlight;c.lineWidth=2;c.beginPath();c.moveTo(x+r,y+2);c.lineTo(x+w-r,y+2);c.stroke();c.restore();
  }
  function line(c,x,y,w,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.stroke()}
  function glyph(c,type,x,y,size,color){
    c.save();c.translate(x,y);c.scale(size/24,size/24);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.65;c.lineCap='round';c.lineJoin='round';
    c.beginPath();
    if(type==='晚'){c.arc(12,12,7.3,.45,5.1);c.bezierCurveTo(7,8,8,16,18.6,15.2)}
    else if(type==='休'){c.moveTo(4,19);c.lineTo(12,5);c.lineTo(20,19);c.closePath();c.moveTo(12,5);c.lineTo(12,19);c.moveTo(3,20);c.lineTo(21,20)}
    else if(type==='calendar'){c.roundRect(4,5,16,16,3);c.moveTo(8,3);c.lineTo(8,7);c.moveTo(16,3);c.lineTo(16,7);c.moveTo(4,10);c.lineTo(20,10);c.moveTo(8,15);c.lineTo(11,18);c.lineTo(16,13)}
    else{c.arc(12,12,4,0,Math.PI*2);for(let i=0;i<8;i++){const a=i*Math.PI/4;c.moveTo(12+Math.cos(a)*7,12+Math.sin(a)*7);c.lineTo(12+Math.cos(a)*9,12+Math.sin(a)*9)}}
    c.stroke();c.restore();
  }
  function chipLayout(c,parts,width,font){
    c.font='600 24px '+font;const rows=[];let row=[],used=0,height=0;
    for(const part of parts){const lines=textLines(c,part.label,width-32),w=Math.min(width,c.measureText(part.label).width+32),h=lines.length*30+18;
      if(row.length&&used+w+10>width){rows.push({items:row,height});row=[];used=0;height=0}
      row.push({part,lines,w,h,x:used});used+=w+10;height=Math.max(height,h);
    }
    if(row.length)rows.push({items:row,height});return rows;
  }
  async function renderCanvas(model,style='jade'){
    if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1800))]);
    const leafSrc=model.m>=9&&model.m<=11?'./images/fx/maple/maple-01.png':model.m>=3&&model.m<=5?'./images/fx/blossom/blossom-01.png':null;
    const textures=await Promise.all([loadImage('./images/fx/cloud/cloud-02.png'),leafSrc?loadImage(leafSrc):Promise.resolve(null)]);
    const p=themes[style]||themes.jade,night=style==='night',{zh}=model,W=1440,pad=52,inner=W-pad*2,gap=12,cellW=(inner-48-gap*6)/7,cellH=292;
    const cv=document.createElement('canvas'),c=cv.getContext('2d'),font=getComputedStyle(document.body).fontFamily||'system-ui, sans-serif';
    if(!c)throw Error(zh?'瀏覽器無法繪製圖片':'Browser tidak dapat membuat gambar');
    c.font='500 25px '+font;const contextLines=textLines(c,[model.rotation,model.unit].filter(Boolean).join(' · '),inner-100);
    const heroH=294+Math.max(0,contextLines.length-1)*32,statsY=pad+heroH+24,calTop=statsY+126,calH=148+model.rows*(cellH+gap)-gap+68;
    const agenda=model.days.filter(day=>day.parts.length).map(day=>({day,rows:chipLayout(c,day.parts,inner-172,font)}));
    const agendaH=agenda.length?100+agenda.reduce((n,entry)=>n+Math.max(84,entry.rows.reduce((s,row)=>s+row.height+10,0)-10)+36,0)+10:0;
    const agendaTop=calTop+calH+26,footerTop=agendaTop+agendaH+(agenda.length?26:0);
    const footers=[zh?'節日與輪班休假分開標示，實際出勤依班表。':'Hari libur nasional dan libur shift terpisah. Ikuti jadwal kerja.',zh?'請假為匿名人數；— 表示尚未取得。含本人假別與個人事項。':'Cuti = jumlah anonim; — = belum tersedia. Memuat cuti dan agenda pribadi.'];
    c.font='500 23px '+font;const footerLines=footers.flatMap(s=>textLines(c,s,inner-40)),H=footerTop+100+footerLines.length*32+pad;
    if(H>24000)throw Error(zh?'本月事項過多，圖片超出瀏覽器可繪製大小':'Terlalu banyak agenda untuk satu gambar');
    cv.width=W;cv.height=H;c.textBaseline='alphabetic';c.fillStyle=gradient(c,0,0,W,H,p.paper,p.paperEnd);c.fillRect(0,0,W,H);
    const halo=c.createRadialGradient(1210,160,0,1210,160,1050);halo.addColorStop(0,night?'#d9c98218':'#fff8d47c');halo.addColorStop(1,'#fff8d400');c.fillStyle=halo;c.fillRect(0,0,W,H);
    // Deterministic paper grain, independent of the animation layer and export timing.
    c.fillStyle=night?'#d7e9b706':'#123b2610';for(let i=0;i<900;i++)c.fillRect((i*137.31)%W,(i*541.73)%H,.8,.8);
    line(c,pad,26,inner,night?'#a0b08046':'#8ca58550');
    panel(c,pad,pad,inner,heroH,36,'#315c47','#113f30',{...p,line:'#769076',highlight:'#f4f4d555',shadow:'#102c2559'});
    c.save();round(c,pad+1,pad+1,inner-2,heroH-2,36);c.clip();
    const glow=c.createRadialGradient(1215,85,0,1215,85,470);glow.addColorStop(0,'#e7da9348');glow.addColorStop(1,'#dcc78c00');c.fillStyle=glow;c.fillRect(pad,pad,inner,heroH);
    c.strokeStyle='#dfe7bc16';for(let i=0;i<4;i++){c.beginPath();c.arc(1290,65,175+i*90,0,Math.PI*2);c.stroke()}
    if(textures[0]){c.globalAlpha=.11;c.drawImage(textures[0],7,78,498,355,920,110,520,230);c.globalAlpha=1}
    c.fillStyle='#f4efd51a';c.font='700 236px '+font;c.textAlign='right';c.fillText(String(model.m).padStart(2,'0'),1333,pad+235);c.restore();
    panel(c,pad+30,pad+31,62,64,18,'#ebedc6','#a8be89',{...p,line:'#a8bd91',highlight:'#fffbeebe',shadow:'#061e2452'});glyph(c,'calendar',pad+43,pad+44,36,'#294d34');
    c.textAlign='left';c.fillStyle='#e9efcf';c.font='650 26px '+font;c.fillText(zh?'我的班表':'Jadwal Saya',pad+110,pad+61);
    c.font='500 17px '+font;c.fillStyle='#c1d4b7';c.fillText('MY SHIFT  /  MONTHLY PLANNER',pad+110,pad+87);
    c.fillStyle='#ece1b4';c.font='600 29px '+font;c.fillText(String(model.y)+'  /  '+(zh?englishMonths[model.m-1]:'JADWAL BULANAN'),pad+33,pad+137);
    c.fillStyle='#fff7e5';c.font=(zh?'750 84px ':'700 70px ')+font;c.fillText(zh?`${model.m} 月`:monthNames.id[model.m-1],pad+29,pad+224);
    c.font='500 25px '+font;c.fillStyle='#d9e5cf';contextLines.forEach((s,i)=>c.fillText(s,pad+33,pad+270+i*32));
    const statW=(inner-3*14)/4;
    for(const [i,shift] of ['早','晚','中','休'].entries()){
      const x=pad+i*(statW+14),colors=p.shifts[shift];panel(c,x,statsY,statW,102,23,p.panel,p.panelEnd,p);glyph(c,shift,x+20,statsY+21,29,colors[2]);
      c.fillStyle=p.muted;c.font='600 24px '+font;c.fillText(shiftLabel(shift,model.language),x+61,statsY+41);
      c.fillStyle=colors[2];c.font='750 40px '+font;c.fillText(String(model.counts[shift]),x+60,statsY+83);c.font='500 20px '+font;c.fillStyle=p.muted;c.fillText(zh?'天':'hari',x+60+c.measureText(String(model.counts[shift])).width+34,statsY+80);
    }
    panel(c,pad,calTop,inner,calH,32,p.panel,p.panelEnd,p);
    c.fillStyle=p.ink;c.font='700 30px '+font;c.fillText(zh?'月份班表':'Kalender bulanan',pad+28,calTop+48);
    c.font='500 22px '+font;c.fillStyle=p.muted;c.fillText(zh?'日期 · 班別 · 當日請假人數':'Tanggal · Shift · Jumlah cuti',pad+28,calTop+80);
    if(model.ownHours>0){c.textAlign='right';c.fillStyle=p.gold;c.font='650 22px '+font;c.fillText(zh?`本人請假 ${model.ownHours}h`:`Cuti saya ${model.ownHours}h`,W-pad-28,calTop+48);c.textAlign='left'}
    line(c,pad+24,calTop+96,inner-48,p.line);
    c.font='650 23px '+font;c.textAlign='center';model.weekdays.forEach((s,i)=>{c.fillStyle=i===0||i===6?(night?'#eab7bc':'#a76164'):p.muted;c.fillText(s,pad+24+i*(cellW+gap)+cellW/2,calTop+128)});c.textAlign='left';
    const gridY=calTop+148;
    for(let index=0;index<model.rows*7;index++){
      const x=pad+24+(index%7)*(cellW+gap),y=gridY+Math.floor(index/7)*(cellH+gap),day=model.days[index-model.first];
      if(!day){c.save();c.strokeStyle=night?'#7a947229':'#94ab852e';c.setLineDash([4,7]);round(c,x,y,cellW,cellH,18);c.stroke();c.restore();continue}
      const colors=p.shifts[day.shift]||p.shifts.unknown;
      const today=day.today;
      panel(c,x,y,cellW,cellH,19,today?'#35735a':colors[0],today?'#144631':colors[1],{...p,line:today?'#d6db9d':p.line,highlight:today?'#faf6c775':p.highlight});
      if(today){c.strokeStyle='#d7df9d';c.lineWidth=3;round(c,x+1,y+1,cellW-2,cellH-2,18);c.stroke();c.lineWidth=1}
      c.fillStyle=today?'#fffae4':colors[2];c.font='750 50px '+font;c.fillText(String(day.d),x+13,y+58);
      if(today){c.fillStyle='#e9dfad';round(c,x+cellW-63,y+14,51,26,8);c.fill();c.font='700 17px '+font;c.textAlign='center';c.fillStyle='#365038';c.fillText(zh?'今天':'Kini',x+cellW-37.5,y+33);c.textAlign='left'}
      else if(index%7===0||index%7===6){c.fillStyle=night?'#e9aeb5':'#b66c75';c.beginPath();c.arc(x+cellW-18,y+25,3.5,0,Math.PI*2);c.fill()}
      c.font='650 25px '+font;c.fillStyle=today?'#e7f2d7':colors[2];c.fillText(shiftLabel(day.shift,model.language),x+13,y+94);
      const parts=day.parts.slice(0,2);let yy=y+113;
      for(const part of parts){
        const tone=p.tones[part.tone]||p.tones.personal;c.font='600 22px '+font;const ls=clippedLines(c,part.short,cellW-26,2),h=ls.length===1?34:58;
        c.fillStyle=tone[0];round(c,x+9,yy,cellW-18,h,8);c.fill();c.fillStyle=tone[1];c.textAlign='center';ls.forEach((s,i)=>c.fillText(s,x+cellW/2,yy+24+i*25));c.textAlign='left';yy+=h+7;
      }
      if(day.parts.length>2){c.font='600 18px '+font;c.fillStyle=today?'#fff0bb':p.gold;c.fillText('+'+(day.parts.length-2)+(zh?' 項':' agenda'),x+13,y+cellH-42)}
      line(c,x+12,y+cellH-33,cellW-24,today?'#d3e5b74f':p.line);
      c.fillStyle=today?'#fff5db':day.leaveCount>0?p.gold:p.ink;c.font='600 21px '+font;
      c.fillText(zh?'請假':'Cuti',x+13,y+cellH-11);c.textAlign='right';c.font='750 25px '+font;c.fillText(day.leaveCount===null?'—':String(day.leaveCount),x+cellW-13,y+cellH-11);c.textAlign='left';
    }
    c.font='500 21px '+font;c.fillStyle=p.muted;c.fillText(zh?'請假數字為當日人數。＋與省略內容完整列於下方；— 尚未取得。':'Cuti = jumlah orang. Rincian lengkap di bawah; — belum tersedia.',pad+28,calTop+calH-28);
    if(agenda.length){
      panel(c,pad,agendaTop,inner,agendaH,32,p.panel,p.panelEnd,p);
      c.fillStyle=p.ink;c.font='700 30px '+font;c.fillText(zh?'本月事項與假別':'Agenda & cuti bulan ini',pad+28,agendaTop+48);
      c.fillStyle=p.muted;c.font='500 22px '+font;c.fillText(zh?'節日、本人請假、調班與標記完整列出':'Hari libur, cuti sendiri, perubahan shift & catatan lengkap',pad+28,agendaTop+80);
      let yy=agendaTop+100;
      for(const entry of agenda){
        const h=Math.max(84,entry.rows.reduce((s,row)=>s+row.height+10,0)-10),{day}=entry;
        if(yy>agendaTop+100)line(c,pad+28,yy-12,inner-56,p.line);
        c.fillStyle=day.today?(night?'#47664a':'#d5e7d8'):(night?'#2c4938':'#e9eee3');round(c,pad+25,yy+1,105,78,16);c.fill();
        c.fillStyle=p.ink;c.font='750 28px '+font;c.textAlign='center';c.fillText(`${model.m}/${day.d}`,pad+77.5,yy+34);c.fillStyle=p.muted;c.font='500 18px '+font;c.fillText(shiftLabel(day.shift,model.language),pad+77.5,yy+62);c.textAlign='left';
        let cy=yy;
        for(const row of entry.rows){for(const item of row.items){const xx=pad+144+item.x,tone=p.tones[item.part.tone]||p.tones.personal;c.fillStyle=tone[0];round(c,xx,cy,item.w,item.h,12);c.fill();c.fillStyle=tone[1];c.font='600 24px '+font;item.lines.forEach((s,i)=>c.fillText(s,xx+16,cy+31+i*30))}cy+=row.height+10}
        yy+=h+36;
      }
    }
    if(textures[1]){c.save();c.translate(W-35,calTop+20);c.rotate(.45);c.globalAlpha=.67;c.drawImage(textures[1],-52,-52,104,104);c.restore();c.save();c.translate(25,agendaTop+115);c.rotate(-.55);c.globalAlpha=.57;c.drawImage(textures[1],-36,-36,72,72);c.restore()}
    line(c,pad,footerTop,inner,p.line);c.fillStyle=p.muted;c.font='500 23px '+font;footerLines.forEach((s,i)=>c.fillText(s,pad+4,footerTop+40+i*32));
    const stampY=footerTop+66+footerLines.length*32;c.font='600 20px '+font;c.fillStyle=p.gold;c.fillText('MY SHIFT',pad+4,stampY);c.textAlign='right';c.fillStyle=p.muted;c.font='500 20px '+font;c.fillText((zh?'匯出 ':'Dibuat ')+model.stamp,W-pad-4,stampY);c.textAlign='left';
    cv.setAttribute('data-share-theme',style);return cv;
  }
  async function canvas(y,m,options={}){return renderCanvas(options.model||buildModel(y,m),options.theme||'jade')}
  function owner(){return typeof fbUser!=='undefined'&&fbUser?fbUser.uid:''}
  function revoke(){if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl='';readyFile=null;readyKey='';drawingKey='';busy=false;job++}
  function open(y,m){
    restore(y,m);
    S.showShare=true;S.shareStyle=document.documentElement.dataset.theme==='dark'?'night':'jade';render();
  }
  function restore(y,m){revoke();active={y,m,owner:owner(),model:buildModel(y,m)}}
  function refresh(){if(!active||active.owner!==owner())return;restore(active.y,active.m);afterRender()}
  function html(){
    const zh=lang==='zh',style=S.shareStyle==='night'?'night':'jade',model=active?.model;
    return `<div class="modal-bg" data-a="closeShare"><section class="modal-sheet share-sheet" onclick="event.stopPropagation()" aria-labelledby="share-title"><header class="share-title-row"><span class="share-emblem">${studioIcon('calendar',24)}</span><div><h2 id="share-title">${zh?'分享班表':'Bagikan jadwal'}</h2><p>${model?`${model.y} / ${String(model.m).padStart(2,'0')}`:''} · ${zh?'個人月份海報':'Poster bulanan pribadi'}</p></div><button class="share-close" data-a="closeShare" aria-label="${zh?'關閉分享預覽':'Tutup pratinjau'}">×</button></header><div class="share-style-picker" role="group" aria-label="${zh?'圖片風格':'Gaya gambar'}"><button data-a="shareStyle" data-style="jade" aria-pressed="${style==='jade'}"><i class="share-style-swatch jade"></i><span><b>${zh?'晨光翡翠':'Giok pagi'}</b><small>${zh?'柔光・陶瓷立體':'Cahaya lembut'}</small></span></button><button data-a="shareStyle" data-style="night" aria-pressed="${style==='night'}"><i class="share-style-swatch night"></i><span><b>${zh?'暮色金邊':'Giok malam'}</b><small>${zh?'深綠・香檳光澤':'Hijau & emas'}</small></span></button></div><div class="share-preview-head"><span>${zh?'完整圖片預覽':'Pratinjau gambar'}</span><div class="share-preview-tools"><button data-a="shareRefresh" aria-label="${zh?'使用最新資料更新預覽':'Perbarui pratinjau'}">${uiIcon('refresh',14)}</button><button id="share-zoom" data-a="shareZoom" aria-expanded="false">${uiIcon('search',14)}<span>${zh?'放大檢視':'Perbesar'}</span></button></div></div><div class="share-preview-frame" id="share-preview-frame" aria-busy="true"><div class="share-placeholder">${studioIcon('calendar',34)}<span>${zh?'正在製作班表…':'Menyiapkan jadwal…'}</span></div></div><p class="share-content-note">${zh?'包含你的假別與個人事項；同事只顯示匿名請假人數。':'Memuat cuti & agenda pribadi; rekan hanya ditampilkan sebagai jumlah anonim.'}</p><p id="share-status" class="share-status" role="status" aria-live="polite"></p><div class="share-actions"><button data-a="shareSave" disabled>${uiIcon('download',19)}${zh?'儲存圖片':'Simpan gambar'}</button><button class="share-primary" data-a="shareSend" disabled>${uiIcon('share',19)}${zh?'分享圖片':'Bagikan gambar'}</button></div></section></div>`;
  }
  function setStatus(message,error=false){const el=document.getElementById('share-status');if(el){el.textContent=message;el.classList.toggle('is-error',error)}}
  function controls(ready){document.querySelectorAll('.share-actions button').forEach(el=>{el.disabled=!ready||busy})}
  async function afterRender(){
    const frame=document.getElementById('share-preview-frame');
    if(!S.showShare||!frame){if(active){revoke();active=null}return}
    if(!active||active.owner!==owner()){revoke();active=null;S.showShare=false;render();return}
    const language=lang==='zh'?'zh':'id';if(active.model.language!==language)active.model=buildModel(active.y,active.m);
    const style=S.shareStyle==='night'?'night':'jade',key=`${active.y}-${active.m}|${style}|${language}|${active.owner}`;
    if(readyKey===key&&readyFile&&imageUrl){mount(frame);controls(true);return}
    if(drawingKey===key)return;
    const token=++job;drawingKey=key;readyFile=null;readyKey='';controls(false);frame.setAttribute('aria-busy','true');
    setStatus(lang==='zh'?'正在製作班表…':'Menyiapkan jadwal…');
    try{
      const cv=await renderCanvas(active.model,style),blob=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));
      if(token!==job||!S.showShare||active?.owner!==owner())return;
      if(!blob)throw Error(lang==='zh'?'無法產生班表圖片':'Gagal membuat gambar');
      if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(blob);
      readyFile=new File([blob],`shift-${active.y}-${String(active.m).padStart(2,'0')}-${style}.png`,{type:'image/png'});readyKey=key;drawingKey='';
      const current=document.getElementById('share-preview-frame');if(current)mount(current);controls(true);setStatus('');
    }catch(error){if(token!==job)return;drawingKey='';const current=document.getElementById('share-preview-frame');if(current){current.setAttribute('aria-busy','false');current.querySelector('.share-placeholder span')?.replaceChildren(document.createTextNode(lang==='zh'?'圖片製作失敗，可重試':'Gambar gagal dibuat. Coba lagi.'))}setStatus((lang==='zh'?'製作失敗：':'Gagal: ')+(error.message||''),true);controls(false)}
  }
  function mount(frame){
    frame.setAttribute('aria-busy','false');frame.dataset.shareStyle=S.shareStyle;let img=frame.querySelector('img');
    if(!img){img=document.createElement('img');img.alt=lang==='zh'?'完整月份班表，包含班別、請假人數及事項清單':'Jadwal lengkap, jumlah cuti dan agenda';img.draggable=false;frame.replaceChildren(img)}
    if(img.src!==imageUrl)img.src=imageUrl;
  }
  function changeStyle(style){if(!['jade','night'].includes(style))return;S.shareStyle=style;busy=false;render()}
  function zoom(){const frame=document.getElementById('share-preview-frame'),button=document.getElementById('share-zoom');if(!frame||!button)return;const on=frame.classList.toggle('is-zoomed');button.setAttribute('aria-expanded',String(on));const span=button.querySelector('span');if(span)span.textContent=lang==='zh'?(on?'適合寬度':'放大檢視'):(on?'Sesuai lebar':'Perbesar')}
  function save(){
    if(!readyFile||!imageUrl||busy||active?.owner!==owner())return;
    const downloadUrl=URL.createObjectURL(readyFile),link=document.createElement('a');link.href=downloadUrl;link.download=readyFile.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(downloadUrl),30000);
    setStatus(lang==='zh'?'已送出下載請求，可在瀏覽器的下載紀錄查看。':'Unduhan dimulai. Periksa daftar unduhan browser.');
  }
  async function send(){
    if(!readyFile||busy||active?.owner!==owner())return;
    const file=readyFile,token=job;let supported=false;
    try{supported=!!(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}))}catch(e){}
    if(!supported){save();return}
    busy=true;controls(false);setStatus('');
    // File is prepared before this click, preserving native share's user activation.
    try{await navigator.share({title:lang==='zh'?'我的班表':'Jadwal Saya',files:[file]});if(token===job)setStatus(lang==='zh'?'已完成系統分享操作。':'Berbagi selesai.')}
    catch(error){if(token===job&&error.name!=='AbortError')setStatus(lang==='zh'?'系統分享未開啟，請改用「儲存圖片」或再次嘗試。':'Berbagi tidak terbuka. Simpan gambar atau coba lagi.',true)}
    finally{if(token===job){busy=false;controls(!!readyFile)}}
  }
  return{buildModel,canvas,renderCanvas,textLines,open,restore,refresh,html,afterRender,changeStyle,zoom,save,send};
})();
