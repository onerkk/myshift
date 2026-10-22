/* v346 · Editorial poster: continuous calendar weeks, drawn directly at 3840 px wide. */
'use strict';
const MyShiftShare=(()=>{
  const themes={
    jade:{paper:'#edefe7',paperEnd:'#dfe6db',ink:'#17352c',muted:'#607668',faint:'#8d9d92',line:'#c9d3c6',lineStrong:'#aebcb0',panel:'#f8f9f3',panelEnd:'#eff3ea',gold:'#8f7236',goldLine:'#c4aa66',goldSoft:'#f1e6c4',shadow:'#1a3f3122',highlight:'#ffffffcc',
      heroA:'#2d5b46',heroB:'#0c372a',heroInk:'#f6f1dd',heroMuted:'#c9d9c3',heroGold:'#e6d3a0',weekend:'#a6585f',
      today:['#2f6b52','#164838','#fbf3d9','#d9c98a'],cellLine:'#d6ded3',outside:'#eef0e9',
      shifts:{早:['#e2efe4','#2f6b50','#1f5740'],晚:['#eae5f3','#6b5692','#51407a'],中:['#f9efd8','#9b6f22','#7c581a'],休:['#f1f3ee','#93a397','#5d6f65'],unknown:['#f1f3ee','#93a397','#5d6f65']},
      tones:{holiday:['#f6e3d6','#8c4a37'],'own-leave':['#f3e3b8','#765219'],meeting:['#dfebf4','#2a5774'],health:['#f3dfe6','#86445e'],pay:['#edefd4','#596833'],annual:['#e0edda','#3c6a42'],personal:['#e5ede6','#3f6050'],adjusted:['#dcebe6','#3a685d']}},
    night:{paper:'#0f2019',paperEnd:'#183128',ink:'#eef5e8',muted:'#a9bfae',faint:'#7b9284',line:'#2d483b',lineStrong:'#466555',panel:'#1b3429',panelEnd:'#142a21',gold:'#e3cf98',goldLine:'#c6ab67',goldSoft:'#4a3f24',shadow:'#00000066',highlight:'#dcf0d02a',
      heroA:'#1f4635',heroB:'#081f16',heroInk:'#f7f1dc',heroMuted:'#b9ccb6',heroGold:'#e8d6a3',weekend:'#efb5bb',
      today:['#357a5c','#1b4e3c','#fdf6dd','#e2d194'],cellLine:'#2a4336',outside:'#15271f',
      shifts:{早:['#1d4133','#86d6aa','#c9efd8'],晚:['#342e49','#cdb6ff','#e6d9ff'],中:['#42381e','#f2cd78','#f8e2a6'],休:['#21332a','#8ea697','#c3d2c6'],unknown:['#21332a','#8ea697','#c3d2c6']},
      tones:{holiday:['#64402f','#ffe1cf'],'own-leave':['#5a4a27','#ffe4a8'],meeting:['#294e66','#d3edff'],health:['#623e50','#ffd6e6'],pay:['#444f2c','#e6edbd'],annual:['#365837','#d4f1c7'],personal:['#324c3c','#e4f0e0'],adjusted:['#305546','#c9e9de']}}
  };
  const monthNames={zh:['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],id:['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']};
  const englishMonths=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  let active=null,job=0,imageUrl='',readyFile=null,readyKey='',drawingKey='',busy=false;
  const imageCache=new Map();
  function shiftLabel(shift,language){return (language==='zh'?{早:'早班',晚:'晚班',中:'中班',休:'輪班休假'}:{早:'Pagi',晚:'Malam',中:'Siang',休:'Libur shift'})[shift]||(language==='zh'?'未排班':'Belum ada')}
  function buildModel(y,m){
    if(!Number.isInteger(y)||!Number.isInteger(m)||m<1||m>12||y<1900||y>9999)throw Error('Invalid calendar month');
    const language=lang==='zh'?'zh':'id',zh=language==='zh';
    const cells=experienceMonthDates(y,m).map(date=>{
      const source=calendarDayInfo(date.y,date.m,date.d),parts=[];
      if(source.holiday)parts.push({label:String(source.holiday),short:String(source.holiday),tone:'holiday'});
      for(const e of source.events||[])parts.push({label:String(e.label||e.short||''),short:String(e.short||e.label||''),tone:e.tone||'personal',own:!!e.own,hours:Number(e.hours)||0,id:e.id||''});
      if(source.adjusted)parts.push({label:zh?'已調班':'Shift diubah',short:zh?'已調班':'Diubah',tone:'adjusted'});
      // Copy presenters only: never export raw leave records, UIDs, reasons, or colleague names.
      return{...date,key:source.key,shift:source.shift,today:!!source.today,leaveCount:source.leaveCount===null||source.leaveCount===undefined?null:source.leaveCount,parts};
    });
    const days=cells.filter(day=>day.inMonth);
    const counts={早:0,晚:0,中:0,休:0,unknown:0};days.forEach(day=>counts[Object.hasOwn(counts,day.shift)?day.shift:'unknown']++);
    const rotation=(RN[language]&&RN[language][S.rt])||S.rt||'',unit=S.unit==='__all'?(zh?'全部單位':'Semua unit'):S.unit||'';
    const now=new Date(),stamp=`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    return{y,m,language,zh,days,cells,first:fdw(y,m),rows:cells.length/7,counts,rotation,unit,stamp,weekdays:[...t('wk')],
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
  // ── drawing primitives ─────────────────────────────────────────
  function round(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
  function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g}
  function panel(c,x,y,w,h,r,a,b,p,raised=true){
    c.save();
    if(raised){c.shadowColor=p.shadow;c.shadowBlur=26*(p.renderScale||1);c.shadowOffsetY=8*(p.renderScale||1);c.fillStyle=a;round(c,x,y,w,h,r);c.fill();c.shadowColor='transparent'}
    c.fillStyle=gradient(c,x,y,w,h,a,b);round(c,x,y,w,h,r);c.fill();c.restore();
    c.strokeStyle=p.line;c.lineWidth=1;round(c,x+.5,y+.5,w-1,h-1,r);c.stroke();
    c.save();round(c,x+1,y+1,w-2,h-2,r-1);c.clip();c.strokeStyle=p.highlight;c.lineWidth=1.5;c.beginPath();c.moveTo(x+r,y+1.5);c.lineTo(x+w-r,y+1.5);c.stroke();c.restore();
  }
  function line(c,x,y,w,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x,y+.5);c.lineTo(x+w,y+.5);c.stroke()}
  function vline(c,x,y,h,color){c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(x+.5,y);c.lineTo(x+.5,y+h);c.stroke()}
  function spaced(c,px){try{c.letterSpacing=px+'px'}catch(e){}}
  function glyph(c,type,x,y,size,color){
    c.save();c.translate(x,y);c.scale(size/24,size/24);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.7;c.lineCap='round';c.lineJoin='round';
    c.beginPath();
    if(type==='晚'){c.arc(12,12,7.3,.45,5.1);c.bezierCurveTo(7,8,8,16,18.6,15.2)}
    else if(type==='休'){c.moveTo(4,19);c.lineTo(12,5);c.lineTo(20,19);c.closePath();c.moveTo(12,5);c.lineTo(12,19);c.moveTo(3,20);c.lineTo(21,20)}
    else if(type==='calendar'){c.roundRect(4,5,16,16,3);c.moveTo(8,3);c.lineTo(8,7);c.moveTo(16,3);c.lineTo(16,7);c.moveTo(4,10);c.lineTo(20,10);c.moveTo(8,15);c.lineTo(11,18);c.lineTo(16,13)}
    else if(type==='person'){c.arc(12,8,3.6,0,Math.PI*2);c.moveTo(5,20);c.bezierCurveTo(5,13,19,13,19,20)}
    else if(type==='clock'){c.arc(12,12,8,0,Math.PI*2);c.moveTo(12,7);c.lineTo(12,12);c.lineTo(15.5,14)}
    else{c.arc(12,12,4,0,Math.PI*2);for(let i=0;i<8;i++){const a=i*Math.PI/4;c.moveTo(12+Math.cos(a)*7,12+Math.sin(a)*7);c.lineTo(12+Math.cos(a)*9,12+Math.sin(a)*9)}}
    c.stroke();c.restore();
  }
  // Pill with centred text. Returns the width used.
  function pill(c,x,y,h,text,bg,fg,font,padX=12,stroke=null){
    c.font=font;const w=Math.ceil(c.measureText(text).width)+padX*2;
    if(bg){c.fillStyle=bg;round(c,x,y,w,h,h/2);c.fill()}
    if(stroke){c.strokeStyle=stroke;c.lineWidth=1;round(c,x+.5,y+.5,w-1,h-1,h/2);c.stroke()}
    c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.fillText(text,x+w/2,y+h/2+1);c.textAlign='left';c.textBaseline='alphabetic';return w;
  }
  async function renderCanvas(model,style='jade'){
    if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1800))]);
    const leafSrc=model.m>=9&&model.m<=11?'./images/fx/maple/maple-01.png':model.m>=3&&model.m<=5?'./images/fx/blossom/blossom-01.png':null;
    const textures=await Promise.all([loadImage('./images/fx/cloud/cloud-02.png'),leafSrc?loadImage(leafSrc):Promise.resolve(null)]);
    const outputWidth=3840,W=1440,renderScale=outputWidth/W,p={...(themes[style]||themes.jade),renderScale},night=style==='night',{zh}=model;
    const pad=60,inner=W-pad*2,gap=10,gridPad=22,cellW=(inner-gridPad*2-gap*6)/7,cellH=248;
    const cv=document.createElement('canvas'),c=cv.getContext('2d'),font=getComputedStyle(document.body).fontFamily||'system-ui, sans-serif';
    if(!c)throw Error(zh?'瀏覽器無法繪製圖片':'Browser tidak dapat membuat gambar');
    const context=[model.rotation,model.unit].filter(Boolean).join('  ·  ');
    const heroY=pad,heroH=262,statsY=heroY+heroH+22,statsH=118,calTop=statsY+statsH+22,headH=128,calH=headH+model.rows*(cellH+gap)-gap+64;
    const footerTop=calTop+calH+24;
    const footers=[zh?'節日與輪班休假分開標示，實際出勤依班表。':'Hari libur nasional dan libur shift terpisah. Ikuti jadwal kerja.',zh?'月曆包含本人假別與事項標示；完整明細請至 App 查看。':'Kalender memuat tanda cuti pribadi & agenda. Rincian ada di aplikasi.'];
    c.font='500 20px '+font;const footerLines=footers.flatMap(s=>textLines(c,s,inner-20)),H=footerTop+96+footerLines.length*30+pad;
    if(Math.ceil(H*renderScale)>24000)throw Error(zh?'圖片超出瀏覽器可繪製大小':'Gambar melebihi ukuran yang didukung browser');
    cv.width=outputWidth;cv.height=Math.ceil(H*renderScale);c.scale(renderScale,renderScale);c.textBaseline='alphabetic';c.textAlign='left';
    // ── paper ──
    c.fillStyle=gradient(c,0,0,W,H,p.paper,p.paperEnd);c.fillRect(0,0,W,H);
    const halo=c.createRadialGradient(1180,120,0,1180,120,1100);halo.addColorStop(0,night?'#d9c98214':'#fff9dc80');halo.addColorStop(1,'#fff8d400');c.fillStyle=halo;c.fillRect(0,0,W,H);
    const vignette=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,night?'#00000040':'#1b3a2c12');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    c.fillStyle=night?'#d7e9b705':'#123b260c';for(let i=0;i<1400;i++)c.fillRect((i*137.31)%W,(i*541.73)%H,.8,.8);
    // double hairline frame with corner marks
    c.strokeStyle=p.goldLine+(night?'70':'90');c.lineWidth=1;c.strokeRect(22.5,22.5,W-45,H-45);
    c.strokeStyle=p.goldLine+(night?'30':'45');c.strokeRect(28.5,28.5,W-57,H-57);
    c.strokeStyle=p.goldLine+(night?'b0':'c8');c.lineWidth=1.5;for(const [cx,cy,sx,sy] of [[22,22,1,1],[W-22,22,-1,1],[22,H-22,1,-1],[W-22,H-22,-1,-1]]){c.beginPath();c.moveTo(cx,cy+sy*26);c.lineTo(cx,cy);c.lineTo(cx+sx*26,cy);c.stroke()}
    // ── hero ──
    panel(c,pad,heroY,inner,heroH,30,p.heroA,p.heroB,{...p,line:'#6f8d73',highlight:'#f4f4d548',shadow:'#0a241c66'});
    c.save();round(c,pad+1,heroY+1,inner-2,heroH-2,30);c.clip();
    const glow=c.createRadialGradient(W-pad-180,heroY+40,0,W-pad-180,heroY+40,520);glow.addColorStop(0,'#eadd9d44');glow.addColorStop(1,'#dcc78c00');c.fillStyle=glow;c.fillRect(pad,heroY,inner,heroH);
    c.strokeStyle='#e5ecc316';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.arc(W-pad-110,heroY+20,150+i*78,0,Math.PI*2);c.stroke()}
    if(textures[0]){c.globalAlpha=night?.09:.12;c.drawImage(textures[0],7,78,498,355,W-pad-600,heroY+92,560,250);c.globalAlpha=1}
    c.font='200 230px '+font;spaced(c,-8);c.textAlign='right';const numeral=String(model.m).padStart(2,'0');
    c.lineWidth=1.3;c.strokeStyle='#f2e6b43c';c.strokeText(numeral,W-pad-34,heroY+232);c.fillStyle='#f4ecc80e';c.fillText(numeral,W-pad-34,heroY+232);spaced(c,0);c.textAlign='left';
    // inner gold hairline
    c.strokeStyle=p.goldLine+'66';c.lineWidth=1;round(c,pad+9.5,heroY+9.5,inner-19,heroH-19,23);c.stroke();
    c.restore();
    panel(c,pad+34,heroY+34,56,58,17,'#eef0cc','#aac18d',{...p,line:'#a7bd8e',highlight:'#fffbeec0',shadow:'#061e2452'});glyph(c,'calendar',pad+45,heroY+46,34,'#274b33');
    c.fillStyle=p.heroInk;c.font='700 26px '+font;c.fillText(zh?'我的班表':'Jadwal Saya',pad+106,heroY+62);
    c.fillStyle=p.heroMuted;c.font='500 14px '+font;spaced(c,3.5);c.fillText('MY SHIFT  ·  MONTHLY PLANNER',pad+106,heroY+86);spaced(c,0);
    c.fillStyle=p.heroInk;c.font=(zh?'750 74px ':'700 62px ')+font;const monthText=zh?monthNames.zh[model.m-1]:monthNames.id[model.m-1];c.fillText(monthText,pad+34,heroY+180);
    const mw=c.measureText(monthText).width;c.fillStyle=p.heroGold;c.font='600 22px '+font;spaced(c,5);c.fillText((zh?englishMonths[model.m-1]:'JADWAL BULANAN')+'  '+model.y,pad+34+mw+22,heroY+176);spaced(c,0);
    if(context){c.font='500 19px '+font;const ctxLines=clippedLines(c,context,inner-600,1);pill(c,pad+34,heroY+203,36,ctxLines[0],'#ffffff14',p.heroInk,'500 19px '+font,16,'#e8dcab55')}
    // ── stats strip ──
    panel(c,pad,statsY,inner,statsH,24,p.panel,p.panelEnd,p);
    const colW=inner/5,daysInMonth=model.days.length||1;
    const stats=[...['早','晚','中','休'].map(s=>({key:s,label:shiftLabel(s,model.language),value:model.counts[s],unit:zh?'天':'hari',color:p.shifts[s][1],bar:model.counts[s]/daysInMonth})),
      {key:'own',label:zh?'本人請假':'Cuti saya',value:model.ownHours,unit:'h',color:p.gold,bar:null}];
    stats.forEach((st,i)=>{
      const x=pad+i*colW;if(i)vline(c,x,statsY+26,statsH-52,p.line);
      if(st.key==='own')glyph(c,'clock',x+26,statsY+24,22,st.color);else{c.fillStyle=st.color;c.beginPath();c.arc(x+37,statsY+35,6,0,Math.PI*2);c.fill()}
      c.fillStyle=p.muted;c.font='600 19px '+font;c.fillText(st.label,x+54,statsY+42);
      c.fillStyle=st.color;c.font='750 42px '+font;const v=String(st.value);c.fillText(v,x+28,statsY+90);
      c.fillStyle=p.faint;c.font='500 17px '+font;c.fillText(st.unit,x+28+c.measureText(v).width*42/17+10,statsY+88);
      if(st.bar!==null){const bx=x+28,bw=colW-56;c.fillStyle=p.line;round(c,bx,statsY+100,bw,4,2);c.fill();if(st.bar>0){c.fillStyle=st.color;round(c,bx,statsY+100,Math.max(6,bw*Math.min(1,st.bar)),4,2);c.fill()}}
    });
    // ── calendar ──
    panel(c,pad,calTop,inner,calH,28,p.panel,p.panelEnd,p);
    c.fillStyle=p.ink;c.font='700 27px '+font;c.fillText(zh?'月份班表':'Kalender bulanan',pad+gridPad+6,calTop+46);
    c.font='500 18px '+font;c.fillStyle=p.muted;c.fillText(zh?'日期 · 班別 · 本人事項 · 當日請假人數':'Tanggal · Shift · Agenda · Jumlah cuti',pad+gridPad+6,calTop+74);
    // legend (right)
    let lx=W-pad-gridPad-6;c.font='600 16px '+font;
    for(const s of ['休','中','晚','早']){const label=shiftLabel(s,model.language);const tw=c.measureText(label).width;lx-=tw;c.fillStyle=p.muted;c.fillText(label,lx,calTop+75);lx-=20;c.fillStyle=p.shifts[s][1];round(c,lx,calTop+64,12,12,3);c.fill();lx-=22}
    line(c,pad+gridPad,calTop+92,inner-gridPad*2,p.lineStrong);
    c.font='650 18px '+font;c.textAlign='center';spaced(c,2);model.weekdays.forEach((s,i)=>{c.fillStyle=i===0||i===6?p.weekend:p.muted;c.fillText(s,pad+gridPad+i*(cellW+gap)+cellW/2,calTop+118)});spaced(c,0);c.textAlign='left';
    const gridY=calTop+headH;
    for(let index=0;index<model.rows*7;index++){
      const col=index%7,x=pad+gridPad+col*(cellW+gap),y=gridY+Math.floor(index/7)*(cellH+gap),day=model.cells[index];
      const weekend=col===0||col===6,colors=p.shifts[day.shift]||p.shifts.unknown,today=day.today,inMonth=day.inMonth;
      // cell body
      c.save();
      if(today){c.shadowColor=night?'#00000080':'#15473633';c.shadowBlur=22*renderScale;c.shadowOffsetY=6*renderScale}
      c.fillStyle=today?gradient(c,x,y,0,cellH,p.today[0],p.today[1]):inMonth?gradient(c,x,y,0,cellH,colors[0],colors[0]):p.outside;
      round(c,x,y,cellW,cellH,14);c.fill();c.restore();
      c.strokeStyle=today?p.today[3]:inMonth?p.cellLine:p.line+'99';c.lineWidth=today?2.5:1;round(c,x+.5,y+.5,cellW-1,cellH-1,14);c.stroke();c.lineWidth=1;
      // top accent
      if(inMonth&&!today){c.save();round(c,x+1,y+1,cellW-2,cellH-2,13);c.clip();c.fillStyle=colors[1];c.fillRect(x,y,cellW,4);c.restore()}
      // day number
      const numColor=today?p.today[2]:!inMonth?p.faint:weekend?p.weekend:p.ink;
      c.fillStyle=numColor;c.font=(inMonth?'650 36px ':'600 24px ')+font;c.fillText(inMonth?String(day.d):`${day.m}/${day.d}`,x+14,y+48);
      if(today){pill(c,x+cellW-12-54,y+16,26,zh?'今天':'Kini',p.today[3],'#2d4433','700 15px '+font,0);}
      // shift label
      c.font='650 20px '+font;c.fillStyle=today?p.today[2]:inMonth?colors[2]:p.faint;c.fillText(shiftLabel(day.shift,model.language),x+14,y+80);
      // chips (max 3)
      const parts=day.parts.slice(0,3);let yy=y+94;
      for(const part of parts){
        const tone=p.tones[part.tone]||p.tones.personal;c.font='600 17px '+font;const text=clippedLines(c,part.short,cellW-40,1)[0];
        c.fillStyle=inMonth||today?tone[0]:tone[0]+'99';round(c,x+10,yy,cellW-20,28,8);c.fill();
        c.fillStyle=tone[1];c.beginPath();c.arc(x+22,yy+14,3,0,Math.PI*2);c.fill();
        c.fillStyle=inMonth||today?tone[1]:p.faint;c.fillText(text,x+31,yy+19);yy+=33;
      }
      if(day.parts.length>3){c.font='600 15px '+font;c.fillStyle=today?'#fff0bb':p.gold;c.fillText('+'+(day.parts.length-3)+(zh?' 項':' agenda'),x+14,yy+13)}
      // leave count (only when known & >0, or unknown)
      if(inMonth&&(day.leaveCount===null||day.leaveCount>0)){
        line(c,x+12,y+cellH-36,cellW-24,today?'#d3e5b74a':p.cellLine);
        const known=day.leaveCount!==null,fg=today?p.today[2]:known?p.gold:p.faint;
        glyph(c,'person',x+12,y+cellH-30,18,fg);c.fillStyle=fg;c.font='600 16px '+font;c.fillText(zh?'請假':'Cuti',x+34,y+cellH-14);
        c.textAlign='right';c.font='750 21px '+font;c.fillText(known?String(day.leaveCount):'—',x+cellW-14,y+cellH-13);c.textAlign='left';
      }
    }
    c.font='500 17px '+font;c.fillStyle=p.faint;c.fillText(zh?'淡色日期為前後月，不計入本月統計；未標示請假人數即為 0；— 未取得人數；＋N 明細請至 App 查看。':'Tanggal redup di luar bulan ini; tanpa angka cuti = 0; — belum tersedia; +N lihat di aplikasi.',pad+gridPad+6,calTop+calH-26);
    if(textures[1]){c.save();c.translate(W-pad+2,calTop-2);c.rotate(.5);c.globalAlpha=night?.5:.6;c.drawImage(textures[1],-40,-40,80,80);c.restore();c.save();c.translate(pad+8,calTop+calH+2);c.rotate(-.6);c.globalAlpha=night?.42:.5;c.drawImage(textures[1],-32,-32,64,64);c.restore()}
    // ── footer ──
    line(c,pad,footerTop,inner,p.lineStrong);
    // tone legend
    let fx=pad+2;const legend=[['holiday',zh?'節日':'Hari libur'],['own-leave',zh?'本人假別':'Cuti saya'],['meeting',zh?'班股事項':'Agenda regu'],['pay',zh?'薪資':'Gaji'],['adjusted',zh?'已調班':'Diubah']];
    for(const [tone,label] of legend){const t=p.tones[tone];fx+=pill(c,fx,footerTop+20,26,label,t[0],t[1],'600 15px '+font,12)+10}
    c.fillStyle=p.muted;c.font='500 20px '+font;footerLines.forEach((s,i)=>c.fillText(s,pad+4,footerTop+78+i*30));
    const stampY=footerTop+96+footerLines.length*30;c.font='700 16px '+font;spaced(c,4);c.fillStyle=p.gold;c.fillText('MY SHIFT',pad+4,stampY);spaced(c,0);
    c.textAlign='right';c.fillStyle=p.faint;c.font='500 17px '+font;c.fillText((zh?'匯出 ':'Dibuat ')+model.stamp,W-pad-4,stampY);c.textAlign='left';
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
    return `<div class="modal-bg" data-a="closeShare"><section class="modal-sheet share-sheet" onclick="event.stopPropagation()" aria-labelledby="share-title"><header class="share-title-row"><span class="share-emblem">${studioIcon('calendar',24)}</span><div><h2 id="share-title">${zh?'分享班表':'Bagikan jadwal'}</h2><p>${model?`${model.y} / ${String(model.m).padStart(2,'0')}`:''} · ${zh?'個人月份海報':'Poster bulanan pribadi'}</p></div><button class="share-close" data-a="closeShare" aria-label="${zh?'關閉分享預覽':'Tutup pratinjau'}">×</button></header><div class="share-style-picker" role="group" aria-label="${zh?'圖片風格':'Gaya gambar'}"><button data-a="shareStyle" data-style="jade" aria-pressed="${style==='jade'}"><i class="share-style-swatch jade"></i><span><b>${zh?'晨光翡翠':'Giok pagi'}</b><small>${zh?'柔光・陶瓷立體':'Cahaya lembut'}</small></span></button><button data-a="shareStyle" data-style="night" aria-pressed="${style==='night'}"><i class="share-style-swatch night"></i><span><b>${zh?'暮色金邊':'Giok malam'}</b><small>${zh?'深綠・香檳光澤':'Hijau & emas'}</small></span></button></div><div class="share-preview-head"><span>4K PNG · 3840 px</span><div class="share-preview-tools"><button data-a="shareRefresh" aria-label="${zh?'使用最新資料更新預覽':'Perbarui pratinjau'}">${uiIcon('refresh',14)}</button><button id="share-zoom" data-a="shareZoom" aria-expanded="false">${uiIcon('search',14)}<span>${zh?'放大檢視':'Perbesar'}</span></button></div></div><div class="share-preview-frame" id="share-preview-frame" aria-busy="true"><div class="share-placeholder">${studioIcon('calendar',34)}<span>${zh?'正在製作班表…':'Menyiapkan jadwal…'}</span></div></div><p class="share-content-note">${zh?'包含你的假別與個人事項；同事只顯示匿名請假人數。':'Memuat cuti & agenda pribadi; rekan hanya ditampilkan sebagai jumlah anonim.'}</p><p id="share-status" class="share-status" role="status" aria-live="polite"></p><div class="share-actions"><button data-a="shareSave" disabled>${uiIcon('download',19)}${zh?'儲存圖片':'Simpan gambar'}</button><button class="share-primary" data-a="shareSend" disabled>${uiIcon('share',19)}${zh?'分享圖片':'Bagikan gambar'}</button></div></section></div>`;
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
    if(!img){img=document.createElement('img');img.alt=lang==='zh'?'4K 月份班表，包含班別、請假人數及月曆標示':'Kalender 4K, shift, jumlah cuti dan tanda agenda';img.draggable=false;frame.replaceChildren(img)}
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
