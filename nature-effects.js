/* v319 layered atmosphere, physical wind response and seasonal scene.
   Foreground clouds and leaves intentionally pass over content; only text is protected.
    Existing photographic assets; time-based motion.
   No weather API, account data, or pay state is written by this module. */
(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
  function classify(code,temp,wind){
    if(code===null||code===undefined||!Number.isFinite(Number(code)))return 'none';
    code=Number(code);
    if([95,96,99].includes(code))return 'storm';
    if([65,67,82].includes(code))return 'heavy';
    if([51,53,55,56,57,61,63,66,80,81].includes(code))return 'rain';
    if([71,73,75,77,85,86].includes(code))return 'snow';
    if([45,48].includes(code))return 'fog';
    if(wind>=35)return 'wind';
    if(temp>=34)return 'heat';
    if(temp<=10)return 'cold';
    return code>=2?'cloud':'clear';
  }
  root.NatureEffects={classify,create:function(){
    let canvas,sky,ctx,bg,mask,maskCtx,maskSource,maskSourceCtx,w=0,h=0,raf=0,last=0,time=0,frameCount=0,accum=0;
    let code=null,temp=0,wind=0,mode='none',preview=null,previewUntil=0,quiet=[],rectTick=-1,layoutDirty=true;
    let thunderTimer=0;
    let views=[],gust=0,cloudBlend=0,lightning=0,nextLightning=25,seasonPreview=null,previewTimer=0,previewToken=0,interactionWind=0,lastLightUpdate=-1;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),images={},leaves=[],rain=[],stars=[];
    let level='balanced';try{level=localStorage.getItem('nature_quality')||level}catch(e){}
    const allowed=k=>typeof root.isFxEnabled!=='function'||root.isFxEnabled(k);
    const rainMode=()=>['rain','heavy','storm','typhoon'].includes(activeMode());
    const activeMode=()=>preview&&performance.now()<previewUntil?preview:mode;
    function init(){
      if(canvas)return;
      sky=document.createElement('canvas');sky.id='nature-sky';sky.setAttribute('aria-hidden','true');document.body.appendChild(sky);bg=sky.getContext('2d');
      canvas=document.createElement('canvas');canvas.id='wxfx';canvas.setAttribute('aria-hidden','true');document.body.appendChild(canvas);ctx=canvas.getContext('2d');
      mask=document.createElement('canvas');maskCtx=mask.getContext('2d');
      maskSource=document.createElement('canvas');maskSourceCtx=maskSource.getContext('2d');
      for(const [key,dir,prefix,count] of [['leaf','maple','maple',4],['cloud','cloud','cloud',3],['butterfly','butterfly','monarch',6],['petal','blossom','blossom',3]]){
        images[key]=Array.from({length:count},(_,i)=>{const image=new Image();image.onload=()=>{if(reduced.matches)draw(0)};image.src='./images/fx/'+dir+'/'+prefix+'-'+String(i+1).padStart(2,'0')+'.png';return image});
      }
      for(let i=0;i<16;i++)leaves.push({x:Math.random(),y:Math.random(),z:rand(.2,1),vx:rand(3,14),phase:rand(0,6.28),rot:rand(0,6.28),image:i%4});
      for(let i=0;i<170;i++)rain.push({x:Math.random(),y:Math.random(),z:rand(.15,1)});
      for(let i=0;i<24;i++)stars.push({x:Math.random(),y:Math.random()*.55,r:rand(.35,1.1),phase:rand(0,6.28)});
      const dirty=()=>{layoutDirty=true;readViews();if(reduced.matches||!raf)draw(0)};
      const observer=new MutationObserver(dirty);
      for(const el of document.querySelectorAll('#app,#mr'))observer.observe(el,{childList:true,subtree:true,characterData:true});
      resize();addEventListener('resize',resize,{passive:true});addEventListener('scroll',dirty,{passive:true,capture:true});
      document.addEventListener('transitionend',dirty,{passive:true});document.addEventListener('animationend',dirty,{passive:true});
      if(document.fonts)document.fonts.addEventListener('loadingdone',dirty);
      document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(thunderTimer);lightning=0}resume()});reduced.addEventListener('change',resume);
      document.addEventListener('pointermove',e=>{if(e.target.closest('.atmosphere-view')&&e.pointerType==='mouse')interactionWind=3},{passive:true});
      setInterval(()=>{syncSound();resume()},15000);resume();
    }
    function resize(){
      if(!canvas)return;w=innerWidth;h=innerHeight;
      const dpr=Math.min(devicePixelRatio||1,level==='subtle'?1.25:1.75);
      for(const cv of [canvas,sky]){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.width=w+'px';cv.style.height=h+'px';cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0)}
      for(const cv of [mask,maskSource]){cv.width=Math.ceil(w);cv.height=Math.ceil(h)}layoutDirty=true;readViews();draw(0);
    }
    function collectQuiet(){
      quiet=[];maskCtx.clearRect(0,0,w,h);maskSourceCtx.clearRect(0,0,w,h);const solidRects=[];
      const protect=(r,solid=false)=>{
        if(r.width<=0||r.height<=0||r.bottom<=0||r.top>=h||r.right<=0||r.left>=w)return;
        quiet.push(r);if(solid){solidRects.push(r);return}
        // Feather the whole text mask once below: no rectangular holes cut
        // into a passing cloud or leaf, and no blur applied to the UI itself.
        maskSourceCtx.fillStyle='#000';maskSourceCtx.fillRect(r.left-4,r.top-4,r.width+8,r.height+8);
      };
      // Keep navigation and active forms clear. Ordinary card surfaces remain
      // available to clouds and rain, including the centres of large cards.
      const fullSelector='.bottom-nav,.modal-sheet,.wx-detail-sheet,input,select,textarea';
      document.querySelectorAll(fullSelector).forEach(e=>protect(e.getBoundingClientRect(),true));
      document.querySelectorAll('.status-switch,.pref-switch,.header-actions,.brand-mark,.account-avatar').forEach(e=>protect(e.getBoundingClientRect()));
      for(const scope of document.querySelectorAll('#app,#mr')){
        const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{
          acceptNode:node=>!node.textContent.trim()||!node.parentElement||node.parentElement.closest('script,style,svg,[aria-hidden="true"],'+fullSelector)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT
        });
        const range=document.createRange();let node;
        while((node=walker.nextNode())){range.selectNodeContents(node);for(const rect of range.getClientRects())protect(rect)}
      }
      document.querySelectorAll('#app button svg,#app [role="button"] svg,.dial-face svg').forEach(e=>protect(e.getBoundingClientRect()));
      maskCtx.save();maskCtx.filter='blur(7px)';maskCtx.drawImage(maskSource,0,0);maskCtx.restore();
      maskCtx.fillStyle='#000';for(const r of solidRects)maskCtx.fillRect(r.left-4,r.top-4,r.width+8,r.height+8);
      layoutDirty=false;rectTick=time;
    }
    function vignetteAlpha(x,y){return (.68+.32*clamp(Math.abs(x/w-.5)*2,0,1))*(y>h-110?.65:1)}
    function imageDraw(c,img,x,y,width,height,alpha){if(img&&img.complete&&img.naturalWidth){c.globalAlpha=alpha;c.drawImage(img,x,y,width,height);c.globalAlpha=1}}
    function glow(c,x,y,r,rgb,alpha){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.2,`rgba(${rgb},${alpha*.4})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
    function drawSky(m,hour,dark){
      const weather=allowed('weather'),night=hour<5.5||hour>=18.5;
      if(!weather||m==='none')return;
      const wet=rainMode(),cover=m==='cloud'||m==='fog'||wet;
      if(!night&&!wet){
        const solar=clamp((hour-6)/12,0,1),sx=w*(.18+.64*solar),sy=clamp(h*.1,45,82);
        const warm=hour<8||hour>16,alpha=cover?.07:.28;
        glow(bg,sx,sy,Math.max(210,w*.65),warm?'249,181,97':'255,236,173',alpha);
        if(!cover){
          bg.save();bg.translate(sx,sy);bg.rotate(Math.sin(time*.015)*.055);bg.filter='blur(12px)';
          for(let i=0;i<5;i++){
            const angle=.22+i*.52,len=h*.82,g=bg.createLinearGradient(0,0,Math.sin(angle)*len,Math.cos(angle)*len);
            g.addColorStop(0,'rgba(255,231,174,.14)');g.addColorStop(.5,'rgba(255,231,174,.045)');g.addColorStop(1,'rgba(255,231,174,0)');bg.strokeStyle=g;bg.lineWidth=12+i*4;bg.beginPath();bg.moveTo(0,0);bg.lineTo(Math.sin(angle)*len,Math.cos(angle)*len);bg.stroke();
          }bg.restore();
          glow(bg,sx,sy,95,warm?'255,206,139':'255,231,161',.52);
          const sun=bg.createRadialGradient(sx,sy,0,sx,sy,22);sun.addColorStop(0,'rgba(255,255,244,.96)');sun.addColorStop(.44,'rgba(255,248,216,.9)');sun.addColorStop(.67,'rgba(251,215,141,.5)');sun.addColorStop(1,'rgba(255,224,160,0)');bg.fillStyle=sun;bg.fillRect(sx-22,sy-22,44,44);
        }
      }
      if(night&&!cover){
        glow(bg,w*.8,65,180,'174,203,229',.1);
        for(const s of stars){bg.globalAlpha=.2+.18*Math.sin(time*.25+s.phase);bg.fillStyle='#e4f0fa';bg.beginPath();bg.arc(s.x*w,s.y*h,s.r,0,Math.PI*2);bg.fill()}bg.globalAlpha=1;
      }
      // Crop the transparent margins of the real cloud textures. Start in view,
      // not one full image-width outside the viewport on a fresh page load.
      const count=cover?3:2,crops=[[6,186,499,140],[7,78,498,355],[6,78,503,353]],strength=level==='subtle'?.78:level==='rich'?1.23:1;
      for(let i=0;i<count;i++){
        const img=images.cloud[i],size=Math.min(600,w*[1.04,.67,.92][i]),start=w*[-.25,.72,-.38][i];
        const x=((start+time*(2.5+i*.9+gust*.45)+size)%(w+size))-size,y=h*[.13,.34,.62][i]+Math.sin(time*.035+i)*7;
        if(img.complete&&img.naturalWidth){
          const crop=crops[i];bg.save();bg.globalAlpha=(cover?(night?.28:.38):.23)*strength;
          if(i===2){bg.translate(x+size,y);bg.scale(-1,1);bg.filter='blur(.7px)';bg.drawImage(img,...crop,0,0,size,size*crop[3]/crop[2])}
          else bg.drawImage(img,...crop,x,y,size,size*crop[3]/crop[2]);bg.restore();
        }
      }
      if(wet||m==='fog'||m==='cold'){
        glow(bg,-w*.15,h*.32,w*.75,wet?'97,137,153':'206,221,217',wet?.13:.16);
        glow(bg,w*1.15,h*.62,w*.65,'183,207,209',m==='fog'?.2:.08);
      }
    }
    function drawLeaves(dt,season,m){
      if(!allowed('seasonal')||rainMode()||m==='snow'||m==='none')return;
      if(season!==2&&season!==0)return;
      const count=level==='subtle'?5:level==='rich'?12:8;
      for(let i=0;i<count;i++){
        const p=leaves[i],target=6+gust*(1.1+p.z*.7);
        p.vx+=(target-p.vx)*Math.min(1,dt*1.5);p.x+=dt*p.vx/w;p.y+=dt*(7+17*p.z)/h;
        p.phase+=dt*(.6+p.z*.35);p.rot+=dt*(.25+gust*.018)*(i%2?-1:1);
        if(p.y>1.08){p.y=-.08;p.x=Math.random();p.phase=rand(0,6.28)}if(p.x>1.12)p.x=-.12;
        const x=p.x*w+Math.sin(p.phase)*(13+18*p.z),y=p.y*h,size=(season===0?14:20)+(level==='rich'?23:18)*p.z,flip=Math.cos(p.phase*.72);
        ctx.save();ctx.translate(x,y);ctx.rotate(p.rot+Math.sin(p.phase)*.32);ctx.scale(Math.sign(flip)*Math.max(.16,Math.abs(flip)),.85+.15*Math.sin(p.phase));
        ctx.shadowColor='rgba(20,46,31,.16)';ctx.shadowBlur=3+4*p.z;ctx.shadowOffsetY=3+p.z*2;
        imageDraw(ctx,images[season===0?'petal':'leaf'][i%(season===0?3:4)],-size/2,-size/2,size,size,(.7+.24*p.z)*vignetteAlpha(x,y));ctx.restore();
      }
    }
    function drawRain(dt,m,dark){
      if(!allowed('weather')||!rainMode())return;
      const heavy=m!=='rain',count=level==='subtle'?48:level==='rich'?160:heavy?130:92;
      const tilt=clamp(gust/45,.045,.45);
      ctx.lineCap='round';
      for(let i=0;i<count;i++){
        const p=rain[i],speed=(200+p.z*420)*(heavy?1.2:1);
        p.y+=dt*speed/h;p.x+=dt*speed*tilt/w;
        if(p.y>1.03){p.y=-.03;p.x=Math.random()}if(p.x>1.1)p.x=-.1;
        const x=p.x*w,y=p.y*h,len=8+27*p.z,edge=vignetteAlpha(x,y),a=(.25+.4*p.z)*edge;
        // Dark refraction and a bright core remain visible over both porcelain
        // cards and the dark shift/salary instrument panels.
        const tail=ctx.createLinearGradient(x,y,x+len*tilt,y+len);
        tail.addColorStop(0,'rgba(71,107,120,0)');tail.addColorStop(.76,`rgba(71,107,120,${a*(dark?.6:1)})`);tail.addColorStop(1,'rgba(71,107,120,0)');
        ctx.strokeStyle=tail;ctx.lineWidth=.65+p.z*1.1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len*tilt,y+len);ctx.stroke();
        const glint=ctx.createLinearGradient(x,y,x+len*tilt,y+len);glint.addColorStop(0,'rgba(234,245,249,0)');glint.addColorStop(.84,`rgba(234,245,249,${a*.9})`);glint.addColorStop(1,'rgba(234,245,249,0)');
        ctx.strokeStyle=glint;ctx.lineWidth=.35+p.z*.42;ctx.beginPath();ctx.moveTo(x+.4,y);ctx.lineTo(x+len*tilt+.4,y+len);ctx.stroke();
        if(i<9&&p.y>.98){ctx.strokeStyle=`rgba(145,193,208,${.2*edge})`;ctx.beginPath();ctx.ellipse(x,h-20,3+(p.y-.98)*200,1.2,0,0,Math.PI*2);ctx.stroke()}
      }
      // Near-lens beads slide more slowly than the rainfall behind them.
      // Curved highlights and a shaded lower rim give transparent water volume.
      for(let i=0;i<(level==='subtle'?4:8);i++){
        const x=w*[.025,.965,.83,.06,.935,.4,.88,.018][i],y=((95+i*127+time*(.75+i%3*.45))%(h+60))-30,r=1.7+(i%4)*.55;
        ctx.save();ctx.translate(x,y);ctx.rotate(-tilt*.12);
        const bead=ctx.createRadialGradient(-r*.3,-r*.4,r*.1,0,r*.45,r*1.65);
        bead.addColorStop(0,'rgba(244,254,255,.12)');bead.addColorStop(.6,'rgba(144,185,192,.035)');bead.addColorStop(1,'rgba(37,76,91,.38)');
        ctx.fillStyle=bead;ctx.beginPath();ctx.moveTo(0,-r*1.7);ctx.bezierCurveTo(r*.25,-r*.9,r*1.05,-r*.25,r,r*.6);ctx.bezierCurveTo(r*.9,r*1.7,-r,r*1.7,-r,r*.55);ctx.bezierCurveTo(-r,-r*.2,-r*.2,-r*.9,0,-r*1.7);ctx.fill();
        ctx.strokeStyle='rgba(251,255,255,.78)';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-r*.25,-r*.85);ctx.quadraticCurveTo(-r*.8,-r*.05,-r*.6,r*.5);ctx.stroke();
        ctx.strokeStyle='rgba(37,75,89,.24)';ctx.lineWidth=.45;ctx.beginPath();ctx.arc(0,r*.6,r*.78,.25,2.7);ctx.stroke();ctx.restore();
      }
      if(lightning>0)glow(bg,w*.82,-25,w*.9,'219,233,246',lightning*.11);
    }

    function drawSnow(dt,m){
      if(m!=='snow'||!allowed('weather'))return;
      const count=level==='subtle'?16:32;
      for(let i=0;i<count;i++){const p=rain[i];p.y=(p.y+dt*(10+25*p.z)/h)%1;const x=p.x*w+Math.sin(time*.4+i)*18,y=p.y*h;ctx.fillStyle=`rgba(220,234,240,${.15+.3*vignetteAlpha(x,y)})`;ctx.beginPath();ctx.arc(x,y,.7+p.z*2,0,Math.PI*2);ctx.fill()}
    }
    function drawAnimals(m,hour){
      if(!allowed('animals')||rainMode()||['none','snow','fog','cold'].includes(m)||seasonName()==='winter')return;
      if(hour>=19||hour<5){
        if(seasonName()!=='summer')return;
        for(let i=0;i<5;i++){const x=i%2? w-20-Math.sin(time*.23+i)*18:20+Math.sin(time*.21+i)*16,y=h*.4+(Math.sin(time*.13+i)*.25+.2)*h;glow(ctx,x,y,7,'207,233,143',Math.max(0,Math.sin(time*.7+i))*.26)}
      }else{
        const idx=Math.floor(time*9)%6;
        for(let i=0;i<(level==='subtle'?1:2);i++){const x=i?w-20+Math.sin(time*.22)*20:18+Math.sin(time*.3)*22,y=110+(Math.sin(time*.13+i*2)*.5+.5)*(h-300);ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.5+i)*.25);imageDraw(ctx,images.butterfly[(idx+i)%6],-17,-17,34,34,.62);ctx.restore()}
      }
    }
    function draw(dt){
      if(!ctx)return;ctx.clearRect(0,0,w,h);bg.clearRect(0,0,w,h);
      const on=['weather','animals','seasonal'].some(allowed);canvas.style.display=on?'':'none';sky.style.display=on?'':'none';if(!on){for(const v of views){paintScene(v,'none',12,false,seasonName());labelScene(v,'none',seasonName())}return;}
      const m=activeMode(),d=new Date(),hour=d.getHours()+d.getMinutes()/60,dark=document.documentElement.dataset.theme==='dark',name=seasonName(),season={spring:0,summer:1,autumn:2,winter:3}[name];
      const sceneWind=preview&&m==='wind'?Math.max(28,wind):wind;
      interactionWind*=Math.exp(-dt*.6);gust+=(Math.min(42,Math.max(0,sceneWind)/3.6)*(1+.2*Math.sin(time*.31)+.1*Math.sin(time*.93))+interactionWind-gust)*Math.min(1,dt*1.3);
      cloudBlend+=((['cloud','rain','heavy','storm','typhoon','fog','snow'].includes(m)?1:.1)-cloudBlend)*Math.min(1,dt*.45);
      lightning=Math.max(0,lightning-dt*1.6);if(!reduced.matches&&allowed('weather')&&['storm','typhoon'].includes(m)&&time>nextLightning){lightning=1;nextLightning=time+rand(24,48);clearTimeout(thunderTimer);thunderTimer=setTimeout(()=>{if(['storm','typhoon'].includes(activeMode())&&!document.hidden&&allowed('weather')&&root.WxSfx)root.WxSfx.triggerThunder()},800)}
      document.body.dataset.season=name;document.body.dataset.lightPhase=hour<5||hour>=19?'night':hour>16||hour<8?'golden':'day';
      if(time-lastLightUpdate>1||lastLightUpdate<0){lastLightUpdate=time;document.documentElement.style.setProperty('--sun-x',Math.round(clamp((hour-5)/14,0,1)*70+15)+'%')}
      document.body.dataset.atmosphere=m;
      drawSky(m,hour,dark);
      if(!reduced.matches){drawLeaves(dt,season,m);drawRain(dt,m,dark);drawSnow(dt,m);drawAnimals(m,hour)}
      // Protect text on both front planes, never entire content cards.
      if(layoutDirty||time-rectTick>.5||rectTick<0)collectQuiet();
      for(const c of [bg,ctx]){c.save();c.globalCompositeOperation='destination-out';c.drawImage(mask,0,0,w,h);c.restore()}
      for(const v of views){paintScene(v,m,hour,dark,name);labelScene(v,m,name)}
    }
    function tick(now){
      raf=0;if(document.hidden||reduced.matches||!['weather','animals','seasonal'].some(allowed))return;
      const elapsed=last?Math.min((now-last)/1000,.08):0;last=now;accum+=elapsed;
      const rate=level==='subtle'?24:30;
      if(accum>=1/rate){time+=accum;draw(accum);accum=0;frameCount++}
      raf=requestAnimationFrame(tick);
    }
    function resume(){
      if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(!canvas)return;
      draw(0);if(!document.hidden&&!reduced.matches&&['weather','animals','seasonal'].some(allowed))raf=requestAnimationFrame(tick);
      if(root.WxSfx&&root.WxSfx.refresh)root.WxSfx.refresh();
    }
    function syncSound(){if(root.WxSfx){root.WxSfx.setMode(activeMode());if(root.WxSfx.setScene)root.WxSfx.setScene({season:seasonName(),wind,preview:!!preview})}}
    function update(c,t,p,v){code=c;temp=Number(t)||0;wind=Number(v)||0;mode=classify(c,temp,wind);init();syncSound();resume()}
    function setQuality(value){if(!['subtle','balanced','rich'].includes(value))return;level=value;try{localStorage.setItem('nature_quality',level)}catch(e){}resize();resume()}
    function previewMode(value){if(!['clear','cloud','rain','storm','wind','snow'].includes(value))return;preview=value;seasonPreview=null;previewUntil=performance.now()+8000;previewToken++;nextLightning=time+1.7;schedulePreviewEnd(previewToken);syncSound();resume()}
    function seasonName(){const d=new Date(),month=d.getMonth()+1;return seasonPreview&&performance.now()<previewUntil?seasonPreview:month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter'}
    function readViews(){
      views=[];
      document.querySelectorAll('.scene-canvas').forEach(cv=>{
        const r=cv.getBoundingClientRect();if(r.width<1||r.height<1)return;
        const dpr=Math.min(devicePixelRatio||1,level==='subtle'?1.25:1.65),cw=Math.round(r.width*dpr),ch=Math.round(r.height*dpr);
        if(cv.width!==cw||cv.height!==ch){cv.width=cw;cv.height=ch}
        views.push({cv,c:cv.getContext('2d'),w:r.width,h:r.height,dpr,rect:r});
      });
    }
    function cloudTexture(c,index,x,y,size,alpha,soft=0){
      const img=images.cloud[index],crop=[[6,186,499,140],[7,78,498,355],[6,78,503,353]][index];
      if(!img||!img.complete||!img.naturalWidth)return;
      c.save();c.globalAlpha=alpha;if(soft)c.filter='blur('+soft+'px)';
      c.drawImage(img,...crop,x,y,size,size*crop[3]/crop[2]);c.restore();
    }
    function labelScene(v,m,season){
      const parent=v.cv.closest('.atmosphere-view'),zh=document.documentElement.lang!=='id',active=preview&&performance.now()<previewUntil;
      const names={spring:['春季','Musim semi'],summer:['夏季','Musim panas'],autumn:['秋季','Musim gugur'],winter:['冬季','Musim dingin']},modes={clear:['日光','Cerah'],cloud:['雲層','Awan'],rain:['雨幕','Hujan'],heavy:['大雨','Hujan lebat'],storm:['雷雨','Badai'],wind:['風葉','Angin'],snow:['降雪','Salju'],fog:['霧景','Kabut'],cold:['冷空氣','Dingin'],heat:['盛夏暖光','Cahaya hangat'],none:['光景','Suasana']};
      for(const [selector,value] of [['[data-scene-season]',names[season][zh?0:1]+' · '+(zh?'示意預覽':'Pratinjau')],['[data-scene-weather]',seasonPreview?(zh?'四季光景':'Suasana musim'):(modes[m]||modes.none)[zh?0:1]],['[data-scene-temperature]',zh?'查看天氣':'Lihat cuaca']]){
        const el=parent.querySelector(selector);if(!el)continue;const text=active?value:el.dataset.liveText;if(el.textContent!==text)el.textContent=text;
      }
    }
    function paintScene(v,m,hour,dark,season){
      if(v.rect.bottom<0||v.rect.top>h)return;
      const c=v.c,W=v.w,H=v.h; c.setTransform(v.dpr,0,0,v.dpr,0,0);c.clearRect(0,0,W,H);
      const weather=allowed('weather')&&m!=='none',wet=weather&&['rain','heavy','storm','typhoon','snow'].includes(m),night=hour<5||hour>=19,warm=hour>=16&&hour<19||hour>=5&&hour<8;
      const colors=night?['#122536','#25433e','#77938a']:wet?['#617c87','#a3b9bb','#cfdbc8']:m==='none'?['#99b1b3','#ccd9d2','#d9e2d0']:warm?['#b9c6ae','#ecdaa6','#e4e5ca']:season==='winter'?['#9dbbc6','#d8e4e1','#c5d7ce']:['#8cafbe','#d5e6df','#dbe6c8'];
      const g=c.createLinearGradient(0,0,W*.18,H);g.addColorStop(0,colors[0]);g.addColorStop(.65,colors[1]);g.addColorStop(1,colors[2]);c.fillStyle=g;c.fillRect(0,0,W,H);
      if(weather&&!wet&&m!=='fog'){
        if(night){glow(c,W*.74,H*.22,H*.53,'205,224,218',.1);c.fillStyle='#d3ded1';c.beginPath();c.arc(W*.74,H*.22,9,0,Math.PI*2);c.fill();c.fillStyle=colors[0];c.beginPath();c.arc(W*.756,H*.205,8,0,Math.PI*2);c.fill();for(let i=0;i<18;i++){const p=stars[i];c.globalAlpha=.2+.25*Math.sin(time*.2+p.phase);c.fillStyle='#e4f0dd';c.beginPath();c.arc(p.x*W,p.y*H,.45+p.r*.5,0,Math.PI*2);c.fill()}c.globalAlpha=1}
        else{const solar=clamp((hour-5)/14,0,1),sx=W*(.15+.72*solar),sy=H*(.29-Math.sin(solar*Math.PI)*.16);glow(c,sx,sy,H*.7,warm?'255,220,150':'255,243,184',.5*(1-cloudBlend*.65));glow(c,sx,sy,22,'255,249,207',.78*(1-cloudBlend*.75));const sun=c.createRadialGradient(sx,sy,0,sx,sy,11);sun.addColorStop(0,'#ffffeae8');sun.addColorStop(.6,'#fff2c0c9');sun.addColorStop(1,'#fff2c000');c.fillStyle=sun;c.fillRect(sx-11,sy-11,22,22)}
      }
      const count=weather?(cloudBlend>.6?3:2):1;
      for(let i=0;i<count;i++){const size=W*[.7,.49,.75][i],span=W+size,speed=(2+i*.8+gust*.8)*(i===0?1:.6),x=((W*[.45,-.27,.83][i]+time*speed+size)%span)-size,y=H*[.25,.12,.28][i];cloudTexture(c,i,x,y,size,night?.27:wet?.59:.64,i===2?.25:0)}
      // Atmospheric distance: muted layers, then near flexible foliage. No winter snow without a snow code.
      c.save();c.filter='blur(5px)';c.fillStyle=night?'#203e3380':'#71978135';
      for(let i=0;i<2;i++){c.beginPath();c.moveTo(-20,H);c.bezierCurveTo(W*.17,H*(.58+i*.1),W*.57,H*(.9-i*.07),W+30,H*.7);c.lineTo(W+30,H+20);c.closePath();c.fill()}c.restore();
      const shade=season==='autumn'?'95,99,58':season==='winter'?'68,105,94':'45,102,70';
      for(let i=0;i<22;i++){
        const side=i<12?0:1,base=side?W+(i-17)*5:(i-5)*5,height=H*(.3+(i%6)*.043),bend=(Math.sin(time*.42+i*.18)*2+gust*1.5)*(height/H),top=base+(side?-1:1)*(14+i%5*3)+bend;
        c.strokeStyle=`rgba(${shade},${night?.4:.24+(i%3)*.06})`;c.lineWidth=.9+i%3*.3;c.beginPath();c.moveTo(base,H+6);c.quadraticCurveTo(base+bend,H-height*.48,top,H-height);c.stroke();
        for(let j=0;j<3;j++){const x=base+(top-base)*(j+2)/5,y=H-height*(j+2)/5;c.fillStyle=`rgba(${shade},${night?.3:.2+i%3*.07})`;c.beginPath();c.ellipse(x+(j%2?-5:5),y-3,7+height*.01,2,((j%2?1:-1)*.5)+bend*.005,0,Math.PI*2);c.fill()}
      }
      if(allowed('seasonal')&&weather&&!wet&&['autumn','spring'].includes(season)){
        for(let i=0;i<(level==='subtle'?2:4);i++){const p=leaves[i],size=9+11*p.z,x=(p.x*W+Math.sin(p.phase)*18+W)%W,y=p.y*H;c.save();c.translate(x,y);c.rotate(p.rot);c.scale(Math.cos(p.phase*.8)||.1,.8);imageDraw(c,images[season==='spring'?'petal':'leaf'][i%(season==='spring'?3:4)],-size/2,-size/2,size,size,.76);c.restore()}
      }
      if(weather&&wet){
        c.save();c.strokeStyle=night?'#c9e3e270':'#e8f7f69c';c.lineCap='round';const tilt=.05+gust*.017;
        for(let i=0;i<(level==='subtle'?24:65);i++){const p=rain[i],x=p.x*W,y=p.y*H,len=7+13*p.z;c.lineWidth=.45+p.z*.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+len*tilt,y+len);c.stroke()}
        c.restore();
        for(let i=0;i<5;i++){const x=W*[.12,.28,.94,.72,.43][i],y=(time*(1+i*.35)+i*H*.19)%(H+14)-7,r=1.4+i%3*.6;glow(c,x-r*.25,y-r*.4,r*2.1,'241,255,246',.34);c.strokeStyle='#294d517a';c.lineWidth=.6;c.beginPath();c.ellipse(x,y,r,r*1.7,-.09,0,Math.PI*2);c.stroke();c.strokeStyle='#f4ffffb3';c.beginPath();c.arc(x-.15,y-r*.3,r*.65,3.2,4.8);c.stroke()}
      }
      if(allowed('animals')&&weather&&night&&!wet&&season==='summer')for(let i=0;i<6;i++){const x=W*(.15+i*.12)+Math.sin(time*.36+i)*9,y=H*(.4+i%3*.1)+Math.cos(time*.3+i)*5;glow(c,x,y,4,'222,238,146',Math.max(0,Math.sin(time*.8+i))*.5)}
      if(lightning>0){c.fillStyle=`rgba(233,245,252,${lightning*.12})`;c.fillRect(0,0,W,H)}
    }
    function previewSeason(value){
      if(!['spring','summer','autumn','winter'].includes(value))return;
      seasonPreview=value;preview=mode==='none'?'clear':mode;previewUntil=performance.now()+8000;previewToken++;
      schedulePreviewEnd(previewToken);syncSound();resume();
    }
    function schedulePreviewEnd(ticket){
      clearTimeout(previewTimer);previewTimer=setTimeout(()=>{if(ticket!==previewToken)return;preview=null;seasonPreview=null;previewUntil=0;syncSound();resume()},8050);
    }

    return{update,previewSeason,getSeason:seasonName,getMode:()=>mode,refresh:resume,setQuality,getQuality:()=>level,preview:previewMode,_forceSilence(){if(root.WxSfx)root.WxSfx._forceSilence()},_debug:()=>({mode,active:activeMode(),frames:frameCount,running:!!raf,quality:level,reduced:reduced.matches,canvasCount:document.querySelectorAll('#wxfx').length,protectedRects:quiet.length,views:views.length,season:seasonName(),gust,preview:!!preview})};
  }};
})(window);
