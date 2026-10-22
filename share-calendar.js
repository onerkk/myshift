/* v347 · Editorial poster: continuous calendar weeks, drawn directly at 3840 px wide. */
'use strict';
const MyShiftShare=(()=>{
  const themes={
    jade:{paper:'#edefe7',paperEnd:'#dde5d9',ink:'#17352c',muted:'#5d7367',faint:'#8a9b8f',line:'#c7d1c4',lineStrong:'#abb9ad',panel:'#f8f9f3',panelEnd:'#eef2e9',gold:'#8d7034',goldLine:'#c2a862',shadow:'#1a3f3120',highlight:'#ffffffcc',
      heroA:'#2b5a45',heroB:'#0b3529',heroInk:'#f7f2de',heroMuted:'#c6d7c0',heroGold:'#e6d3a0',heroArt:'#e9d9a3',weekend:'#a4555c',
      today:['#2d6a51','#154636','#fbf3d9','#d9c98a'],outside:'#eceee8',
      shifts:{早:['#d4e9dc','#2f6b50','#1e5540'],晚:['#dfd8ef','#6a5591','#4e3d78'],中:['#f6e7c3','#9a6f22','#775419'],休:['#eaece6','#8e9f93','#5a6c62'],unknown:['#eaece6','#8e9f93','#5a6c62']},
      cat:{holiday:['#b5555c','#883c43'],own:['#a07d2f','#735619'],other:['#4f7064','#3a564b'],adjusted:['#2f6f7c','#255661']}},
    night:{paper:'#0d1e17',paperEnd:'#172f26',ink:'#eef5e8',muted:'#a6bdab',faint:'#7a9183',line:'#2b4538',lineStrong:'#456353',panel:'#1a3328',panelEnd:'#132820',gold:'#e3cf98',goldLine:'#c4a965',shadow:'#00000066',highlight:'#dcf0d024',
      heroA:'#1d4433',heroB:'#071d14',heroInk:'#f7f1dc',heroMuted:'#b6cab3',heroGold:'#e8d6a3',heroArt:'#e6d49c',weekend:'#f0b6bc',
      today:['#357a5c','#1b4e3c','#fdf6dd','#e2d194'],outside:'#13251d',
      shifts:{早:['#1c4434','#8ad8ae','#cdf0dc'],晚:['#352e4e','#cfb8ff','#e8dcff'],中:['#463a1c','#f4cf79','#f9e3a8'],休:['#1f3128','#8ea697','#c3d2c6'],unknown:['#1f3128','#8ea697','#c3d2c6']},
      cat:{holiday:['#f2a8af','#f6c3c8'],own:['#ecd38c','#f4e2b0'],other:['#9ccab3','#c3e3d2'],adjusted:['#8fd2de','#b9e6ee']}}
  };
  const monthNames={zh:['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],id:['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']};
  const englishMonths=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  let active=null,job=0,imageUrl='',readyFile=null,readyKey='',drawingKey='',busy=false;
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
  function category(tone){return tone==='holiday'?'holiday':tone==='own-leave'?'own':tone==='adjusted'?'adjusted':'other'}
  // Procedural seasonal line art (Taiwan lowland ecology) drawn in the hero. Deterministic.
  function seasonArt(c,m,x,y,w,h,color){
    let seed=m*7919;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.strokeStyle=color;c.fillStyle=color;c.lineCap='round';c.lineJoin='round';
    if(m>=9&&m<=11){ // 芒草 silvergrass plumes
      for(let i=0;i<7;i++){const bx=x+w*(.06+i*.14)+rnd()*20,by=y+h+10,hh=h*(.62+rnd()*.36),lean=(rnd()-.5)*90,dir=lean>=0?1:-1;
        const top=[bx+lean,by-hh];c.globalAlpha=.34;c.lineWidth=1.3;c.beginPath();c.moveTo(bx,by);c.quadraticCurveTo(bx+lean*.2,by-hh*.6,top[0],top[1]);c.stroke();
        const n=34;for(let k=0;k<n;k++){const t=.62+k/n*.38,px=bx+lean*(t*t),py=by-hh*t,ang=-Math.PI/2+dir*(.35+rnd()*.5)+(rnd()-.5)*.3,ll=6+(1-Math.abs(t-.82)/.2)*10+rnd()*6;
          c.globalAlpha=.22+rnd()*.3;c.lineWidth=.9;c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+Math.cos(ang)*ll*.5,py+Math.sin(ang)*ll*.5-3,px+Math.cos(ang)*ll+dir*4,py+Math.sin(ang)*ll);c.stroke()}
        c.globalAlpha=.5;for(let k=0;k<6;k++){c.beginPath();c.arc(top[0]+dir*rnd()*18,top[1]+rnd()*20,1,0,Math.PI*2);c.fill()}}
    }else if(m>=3&&m<=5){ // 木棉／油桐 branch with blossoms
      c.globalAlpha=.4;c.lineWidth=2;c.beginPath();c.moveTo(x,y+h*.95);c.bezierCurveTo(x+w*.25,y+h*.75,x+w*.5,y+h*.6,x+w*.95,y+h*.25);c.stroke();
      c.lineWidth=1.3;for(let i=0;i<7;i++){const t=.2+i*.12,px=x+w*t,py=y+h*(.95-t*.72);c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+20,py-30-rnd()*20,px+40+rnd()*30,py-40-rnd()*40);c.stroke()}
      for(let i=0;i<22;i++){const px=x+w*(.15+rnd()*.85),py=y+h*(.05+rnd()*.75),r=4+rnd()*6;c.globalAlpha=.22+rnd()*.3;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;c.beginPath();c.ellipse(px+Math.cos(a)*r*.9,py+Math.sin(a)*r*.9,r*.7,r*.42,a,0,Math.PI*2);c.fill()}c.globalAlpha=.6;c.beginPath();c.arc(px,py,1.6,0,Math.PI*2);c.fill()}
    }else if(m>=6&&m<=8){ // 鳳凰木 fronds + fireflies
      c.lineWidth=1.2;for(let i=0;i<6;i++){const bx=x+w*(.1+i*.16),by=y+h*.1+rnd()*h*.2,len=h*.6+rnd()*h*.3,ang=Math.PI/2+(rnd()-.5)*.6;c.globalAlpha=.38;c.beginPath();c.moveTo(bx,by);c.lineTo(bx+Math.cos(ang)*len,by+Math.sin(ang)*len);c.stroke();
        for(let k=1;k<12;k++){const t=k/12,px=bx+Math.cos(ang)*len*t,py=by+Math.sin(ang)*len*t,ll=16*(1-t*.6);c.globalAlpha=.3;c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(ang-1.1)*ll,py+Math.sin(ang-1.1)*ll);c.moveTo(px,py);c.lineTo(px+Math.cos(ang+1.1)*ll,py+Math.sin(ang+1.1)*ll);c.stroke()}}
      for(let i=0;i<26;i++){const px=x+rnd()*w,py=y+rnd()*h,r=1.2+rnd()*2;const g=c.createRadialGradient(px,py,0,px,py,r*4);g.addColorStop(0,color);g.addColorStop(1,color+'00');c.globalAlpha=.35+rnd()*.4;c.fillStyle=g;c.beginPath();c.arc(px,py,r*4,0,Math.PI*2);c.fill();c.fillStyle=color}
    }else{ // 落羽松 bald-cypress sprays
      c.lineWidth=1.2;for(let i=0;i<6;i++){const bx=x+w*(.08+i*.17)+rnd()*14,by=y+h+6,len=h*(.55+rnd()*.4),lean=(rnd()-.5)*50;c.globalAlpha=.34;c.beginPath();c.moveTo(bx,by);c.quadraticCurveTo(bx+lean*.3,by-len*.5,bx+lean,by-len);c.stroke();
        for(let k=3;k<22;k++){const t=k/22,px=bx+lean*t*t,py=by-len*t,ll=(9+rnd()*5)*(1-t*.55),a=-Math.PI/2;c.globalAlpha=.2+rnd()*.2;c.lineWidth=.9;
          c.beginPath();c.moveTo(px,py);c.lineTo(px+Math.cos(a-1.25)*ll,py+Math.sin(a-1.25)*ll);c.moveTo(px,py);c.lineTo(px+Math.cos(a+1.25)*ll,py+Math.sin(a+1.25)*ll);c.stroke()}}
      c.globalAlpha=.4;for(let i=0;i<18;i++){c.beginPath();c.arc(x+rnd()*w,y+rnd()*h*.6,.9+rnd()*.8,0,Math.PI*2);c.fill()}
    }
    c.restore();
  }
  function donut(c,cx,cy,r,width,segments,track){
    c.save();c.lineCap='butt';c.lineWidth=width;c.strokeStyle=track;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
    const total=segments.reduce((n,s)=>n+s.value,0)||1,gapA=.045;let a=-Math.PI/2;
    for(const s of segments){const span=Math.PI*2*s.value/total;if(span<=0)continue;c.strokeStyle=s.color;c.beginPath();c.arc(cx,cy,r,a+gapA/2,a+span-gapA/2);c.stroke();a+=span}
    c.restore();
  }
  async function renderCanvas(model,style='jade'){
    if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1800))]);
    const outputWidth=3840,W=1440,renderScale=outputWidth/W,p={...(themes[style]||themes.jade),renderScale},night=style==='night',{zh}=model;
    const pad=60,inner=W-pad*2,gap=10,gridPad=22,cellW=(inner-gridPad*2-gap*6)/7,cellH=204;
    const cv=document.createElement('canvas'),c=cv.getContext('2d'),font=getComputedStyle(document.body).fontFamily||'system-ui, sans-serif';
    if(!c)throw Error(zh?'瀏覽器無法繪製圖片':'Browser tidak dapat membuat gambar');
    const context=[model.rotation,model.unit].filter(Boolean).join('  ·  ');
    const heroY=pad,heroH=318,calTop=heroY+heroH+24,headH=118,calH=headH+model.rows*(cellH+gap)-gap+60;
    const footerTop=calTop+calH+22;
    const footers=[zh?'節日與輪班休假分開標示，實際出勤依班表。':'Hari libur nasional dan libur shift terpisah. Ikuti jadwal kerja.',zh?'月曆包含本人假別與事項標示；完整明細請至 App 查看。':'Kalender memuat tanda cuti pribadi & agenda. Rincian ada di aplikasi.'];
    c.font='500 19px '+font;const footerLines=footers.flatMap(s=>textLines(c,s,inner-20)),H=footerTop+92+footerLines.length*28+pad;
    if(Math.ceil(H*renderScale)>24000)throw Error(zh?'圖片超出瀏覽器可繪製大小':'Gambar melebihi ukuran yang didukung browser');
    cv.width=outputWidth;cv.height=Math.ceil(H*renderScale);c.scale(renderScale,renderScale);c.textBaseline='alphabetic';c.textAlign='left';
    // ── paper ──
    c.fillStyle=gradient(c,0,0,W,H,p.paper,p.paperEnd);c.fillRect(0,0,W,H);
    const halo=c.createRadialGradient(1180,120,0,1180,120,1100);halo.addColorStop(0,night?'#d9c98214':'#fff9dc80');halo.addColorStop(1,'#fff8d400');c.fillStyle=halo;c.fillRect(0,0,W,H);
    const vignette=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,night?'#00000040':'#1b3a2c12');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    c.fillStyle=night?'#d7e9b705':'#123b260c';for(let i=0;i<1400;i++)c.fillRect((i*137.31)%W,(i*541.73)%H,.8,.8);
    c.strokeStyle=p.goldLine+(night?'70':'90');c.lineWidth=1;c.strokeRect(22.5,22.5,W-45,H-45);
    c.strokeStyle=p.goldLine+(night?'30':'45');c.strokeRect(28.5,28.5,W-57,H-57);
    c.strokeStyle=p.goldLine+(night?'b0':'c8');c.lineWidth=1.5;for(const [cx,cy,sx,sy] of [[22,22,1,1],[W-22,22,-1,1],[22,H-22,1,-1],[W-22,H-22,-1,-1]]){c.beginPath();c.moveTo(cx,cy+sy*26);c.lineTo(cx,cy);c.lineTo(cx+sx*26,cy);c.stroke()}
    // ── hero ──
    panel(c,pad,heroY,inner,heroH,30,p.heroA,p.heroB,{...p,line:'#6f8d73',highlight:'#f4f4d548',shadow:'#0a241c66'});
    c.save();round(c,pad+1,heroY+1,inner-2,heroH-2,30);c.clip();
    const glow=c.createRadialGradient(W-pad-200,heroY+heroH/2,0,W-pad-200,heroY+heroH/2,420);glow.addColorStop(0,'#eadd9d30');glow.addColorStop(1,'#dcc78c00');c.fillStyle=glow;c.fillRect(pad,heroY,inner,heroH);
    seasonArt(c,model.m,pad+inner*.36,heroY+14,inner*.28,heroH-28,p.heroArt);
    c.strokeStyle=p.goldLine+'66';c.lineWidth=1;round(c,pad+9.5,heroY+9.5,inner-19,heroH-19,23);c.stroke();
    c.restore();
    panel(c,pad+34,heroY+34,56,58,17,'#eef0cc','#aac18d',{...p,line:'#a7bd8e',highlight:'#fffbeec0',shadow:'#061e2452'});glyph(c,'calendar',pad+45,heroY+46,34,'#274b33');
    c.fillStyle=p.heroInk;c.font='700 26px '+font;c.fillText(zh?'我的班表':'Jadwal Saya',pad+106,heroY+62);
    c.fillStyle=p.heroMuted;c.font='500 14px '+font;spaced(c,3.5);c.fillText('MY SHIFT  ·  MONTHLY PLANNER',pad+106,heroY+86);spaced(c,0);
    c.fillStyle=p.heroInk;c.font=(zh?'750 84px ':'700 66px ')+font;const monthText=zh?monthNames.zh[model.m-1]:monthNames.id[model.m-1];c.fillText(monthText,pad+34,heroY+196);
    const mw=c.measureText(monthText).width;c.fillStyle=p.heroGold;c.font='600 22px '+font;spaced(c,5);c.fillText((zh?englishMonths[model.m-1]:'JADWAL BULANAN')+'  '+model.y,pad+34+mw+22,heroY+192);spaced(c,0);
    let cx=pad+34;
    if(context){c.font='500 18px '+font;cx+=pill(c,cx,heroY+222,36,clippedLines(c,context,inner*.34,1)[0],'#ffffff14',p.heroInk,'500 18px '+font,16,'#e8dcab55')+10}
    if(model.ownHours>0)pill(c,cx,heroY+222,36,(zh?'本人請假 ':'Cuti saya ')+model.ownHours+'h',p.heroGold,'#2d4433','650 18px '+font,16);
    // donut + legend (right)
    const dr=96,dcx=W-pad-366,dcy=heroY+heroH/2,shiftKeys=['早','晚','中','休'];
    donut(c,dcx,dcy,dr,20,shiftKeys.map(k=>({value:model.counts[k],color:p.shifts[k][1]})),'#ffffff14');
    c.textAlign='center';c.fillStyle=p.heroInk;c.font='300 58px '+font;c.fillText(String(model.days.length),dcx,dcy+14);c.fillStyle=p.heroMuted;c.font='500 15px '+font;spaced(c,2);c.fillText(zh?'本月天數':'HARI',dcx,dcy+42);spaced(c,0);c.textAlign='left';
    const lx=dcx+dr+40;shiftKeys.forEach((k,i)=>{const ly=dcy-78+i*52,col=p.shifts[k][1];c.fillStyle=col;c.beginPath();c.arc(lx+6,ly+8,6,0,Math.PI*2);c.fill();
      c.textAlign='right';c.font='500 13px '+font;const unit=zh?'天':'hari',uw=c.measureText(unit).width;c.fillStyle=p.heroMuted;c.fillText(unit,W-pad-34,ly+15);
      c.fillStyle=p.heroInk;c.font='650 30px '+font;const cnt=String(model.counts[k]),cw=c.measureText(cnt).width;c.fillText(cnt,W-pad-34-uw-5,ly+16);c.textAlign='left';
      c.fillStyle=p.heroMuted;c.font='500 17px '+font;c.fillText(clippedLines(c,shiftLabel(k,model.language),W-pad-34-uw-5-cw-10-(lx+22),1)[0],lx+22,ly+14);
      if(i<3)line(c,lx,ly+32,W-pad-34-lx,'#ffffff16')});
    // ── calendar ──
    panel(c,pad,calTop,inner,calH,28,p.panel,p.panelEnd,p);
    c.fillStyle=p.ink;c.font='700 26px '+font;c.fillText(zh?'月份班表':'Kalender bulanan',pad+gridPad+6,calTop+44);
    c.font='500 17px '+font;c.fillStyle=p.muted;c.fillText(zh?'日期 · 班別 · 本人事項 · 當日請假人數':'Tanggal · Shift · Agenda · Jumlah cuti',pad+gridPad+6,calTop+70);
    let gx=W-pad-gridPad-6;c.font='600 15px '+font;
    for(const [cat,label] of [['other',zh?'事項':'Agenda'],['own',zh?'本人假別':'Cuti saya'],['holiday',zh?'節日':'Libur']]){const col=p.cat[cat];const tw=c.measureText(label).width;gx-=tw;c.fillStyle=p.muted;c.fillText(label,gx,calTop+46);gx-=14;c.fillStyle=col[0];round(c,gx,calTop+35,4,13,2);c.fill();gx-=26}
    line(c,pad+gridPad,calTop+84,inner-gridPad*2,p.lineStrong);
    c.font='650 17px '+font;c.textAlign='center';spaced(c,2);model.weekdays.forEach((s,i)=>{c.fillStyle=i===0||i===6?p.weekend:p.muted;c.fillText(s,pad+gridPad+i*(cellW+gap)+cellW/2,calTop+108)});spaced(c,0);c.textAlign='left';
    const gridY=calTop+headH;
    for(let index=0;index<model.rows*7;index++){
      const col=index%7,x=pad+gridPad+col*(cellW+gap),y=gridY+Math.floor(index/7)*(cellH+gap),day=model.cells[index];
      const weekend=col===0||col===6,colors=p.shifts[day.shift]||p.shifts.unknown,today=day.today,inMonth=day.inMonth,rest=day.shift==='休';
      c.save();
      if(today){c.shadowColor=night?'#00000080':'#15473633';c.shadowBlur=22*renderScale;c.shadowOffsetY=6*renderScale}
      c.fillStyle=today?gradient(c,x,y,0,cellH,p.today[0],p.today[1]):inMonth?colors[0]:p.outside;
      round(c,x,y,cellW,cellH,14);c.fill();c.restore();
      if(inMonth&&!today&&!rest){c.save();round(c,x,y,cellW,cellH,14);c.clip();const sheen=c.createLinearGradient(x,y,x,y+cellH);sheen.addColorStop(0,night?'#ffffff08':'#ffffff66');sheen.addColorStop(1,'#ffffff00');c.fillStyle=sheen;c.fillRect(x,y,cellW,cellH);c.restore()}
      c.strokeStyle=today?p.today[3]:inMonth?(night?'#ffffff12':'#0000000c'):p.line+'88';c.lineWidth=today?2.5:1;round(c,x+.5,y+.5,cellW-1,cellH-1,14);c.stroke();c.lineWidth=1;
      // day number: light, large
      const numColor=today?p.today[2]:!inMonth?p.faint:weekend?p.weekend:p.ink;
      c.fillStyle=numColor;c.font=(inMonth?'300 50px ':'300 26px ')+font;c.fillText(inMonth?String(day.d):`${day.m}/${day.d}`,x+12,y+54);
      // shift tag (top-right)
      c.font='650 14px '+font;const tag=shiftLabel(day.shift,model.language);
      if(today)pill(c,x+cellW-12-Math.ceil(c.measureText(zh?'今天':'Kini').width)-20,y+14,24,zh?'今天':'Kini',p.today[3],'#2d4433','700 14px '+font,10);
      else if(inMonth&&!rest)pill(c,x+cellW-12-Math.ceil(c.measureText(tag).width)-20,y+14,24,tag,colors[1],night?'#0d1e17':'#ffffff','650 14px '+font,10);
      else pill(c,x+cellW-12-Math.ceil(c.measureText(tag).width)-20,y+14,24,tag,null,inMonth?colors[2]:p.faint,'650 14px '+font,10,inMonth?colors[1]+'99':p.line);
      if(today){c.fillStyle='#e9dfad';c.font='650 14px '+font;c.fillText(tag,x+14,y+78)}
      // agenda lines (max 3): left colour bar + text
      const parts=day.parts.slice(0,3);let yy=today?y+88:y+72;
      for(const part of parts){
        const cat=p.cat[category(part.tone)];c.font='600 16px '+font;const text=clippedLines(c,part.short,cellW-36,1)[0];
        c.fillStyle=today?'#f3e9bf':inMonth?cat[0]:p.faint;round(c,x+13,yy+3,3,18,1.5);c.fill();
        c.fillStyle=today?'#f6efd2':inMonth?cat[1]:p.faint;c.fillText(text,x+24,yy+18);yy+=27;
      }
      if(day.parts.length>3){c.font='600 14px '+font;c.fillStyle=today?'#fff0bb':p.gold;c.fillText('+'+(day.parts.length-3)+(zh?' 項':' agenda'),x+24,yy+14)}
      // leave count (bottom-right): only when >0 or unknown
      if(inMonth&&(day.leaveCount===null||day.leaveCount>0)){
        const known=day.leaveCount!==null,fg=today?p.today[2]:known?p.gold:p.faint;
        c.textAlign='right';c.font='700 19px '+font;const v=known?String(day.leaveCount):'—';c.fillStyle=fg;c.fillText(v,x+cellW-13,y+cellH-13);
        const vw=c.measureText(v).width;c.font='500 13px '+font;c.fillText(zh?'請假':'cuti',x+cellW-13-vw-6,y+cellH-14);const lw=c.measureText(zh?'請假':'cuti').width;c.textAlign='left';
        glyph(c,'person',x+cellW-13-vw-6-lw-20,y+cellH-29,17,fg);
      }
    }
    c.font='500 16px '+font;c.fillStyle=p.faint;c.fillText(zh?'淡色日期為前後月，不計入本月統計；未標示請假人數即為 0；— 未取得人數；＋N 明細請至 App 查看。':'Tanggal redup di luar bulan ini; tanpa angka cuti = 0; — belum tersedia; +N lihat di aplikasi.',pad+gridPad+6,calTop+calH-24);
    // ── footer ──
    line(c,pad,footerTop,inner,p.lineStrong);
    c.fillStyle=p.muted;c.font='500 19px '+font;footerLines.forEach((s,i)=>c.fillText(s,pad+4,footerTop+40+i*28));
    const stampY=footerTop+72+footerLines.length*28;c.font='700 15px '+font;spaced(c,4);c.fillStyle=p.gold;c.fillText('MY SHIFT',pad+4,stampY);spaced(c,0);
    c.textAlign='right';c.fillStyle=p.faint;c.font='500 16px '+font;c.fillText((zh?'匯出 ':'Dibuat ')+model.stamp,W-pad-4,stampY);c.textAlign='left';
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
