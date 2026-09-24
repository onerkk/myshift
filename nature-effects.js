/* v310 foreground atmosphere. Existing photographic assets; time-based motion.
   No weather API, account data, or pay state is written by this module. */
(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
  function classify(code,temp,wind){
    if(code===null||code===undefined||!Number.isFinite(Number(code)))return 'none';
    code=Number(code);
    if([95,96,99].includes(code))return wind>=60?'typhoon':'storm';
    if([65,67,82].includes(code))return wind>=60?'typhoon':'heavy';
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
      for(let i=0;i<9;i++)leaves.push({x:Math.random(),y:Math.random(),z:rand(.2,1),phase:rand(0,6.28),rot:rand(0,6.28),image:i%4});
      for(let i=0;i<170;i++)rain.push({x:Math.random(),y:Math.random(),z:rand(.15,1)});
      for(let i=0;i<24;i++)stars.push({x:Math.random(),y:Math.random()*.55,r:rand(.35,1.1),phase:rand(0,6.28)});
      const dirty=()=>{layoutDirty=true;if(reduced.matches)draw(0)};
      const observer=new MutationObserver(dirty);
      for(const el of document.querySelectorAll('#app,#mr'))observer.observe(el,{childList:true,subtree:true,characterData:true});
      resize();addEventListener('resize',resize,{passive:true});addEventListener('scroll',dirty,{passive:true,capture:true});
      document.addEventListener('transitionend',dirty,{passive:true});document.addEventListener('animationend',dirty,{passive:true});
      if(document.fonts)document.fonts.addEventListener('loadingdone',dirty);
      document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
      setInterval(()=>{syncSound();resume()},15000);resume();
    }
    function resize(){
      if(!canvas)return;w=innerWidth;h=innerHeight;
      const dpr=Math.min(devicePixelRatio||1,level==='subtle'?1.25:1.75);
      for(const cv of [canvas,sky]){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.width=w+'px';cv.style.height=h+'px';cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0)}
      for(const cv of [mask,maskSource]){cv.width=Math.ceil(w);cv.height=Math.ceil(h)}layoutDirty=true;draw(0);
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
      const count=cover?3:1,crops=[[0,176,512,164],[0,66,512,380],[0,176,512,164]],strength=level==='subtle'?.72:level==='rich'?1.18:1;
      for(let i=0;i<count;i++){
        const img=images.cloud[i%2],size=Math.min(470,w*[.86,.63,.87][i]),start=w*[-.24,.74,-.29][i];
        const x=((start+time*(3.5+i*1.2)+size)%(w+size))-size,y=h*[.16,.37,.65][i]+Math.sin(time*.035+i)*7;
        if(img.complete&&img.naturalWidth){
          const crop=crops[i];bg.save();bg.globalAlpha=(cover?(night?.32:.46):.26)*strength;
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
      const count=level==='subtle'?4:level==='rich'?9:7;
      for(let i=0;i<count;i++){
        const p=leaves[i],speed=(8+13*p.z)*(1+Math.min(wind,35)/75);
        p.y+=dt*speed/h;p.phase+=dt*(.55+p.z*.3);p.rot+=dt*.24;
        if(p.y>1.08){p.y=-.08;p.phase=rand(0,6.28)}
        const cx=w*[.13,.84,.46][i%3];
        const x=cx+Math.sin(p.phase)*(27+22*p.z),y=p.y*h;
        const size=(season===0?20:29)+22*p.z,flip=Math.cos(p.phase*.72);
        ctx.save();ctx.translate(x,y);ctx.rotate(p.rot+Math.sin(p.phase)*.35);ctx.scale(Math.sign(flip)*Math.max(.18,Math.abs(flip)),.88+.12*Math.sin(p.phase));
        ctx.shadowColor='rgba(29,43,25,.15)';ctx.shadowBlur=2+3*p.z;ctx.shadowOffsetY=3;
        imageDraw(ctx,images[season===0?'petal':'leaf'][i%(season===0?3:4)],-size/2,-size/2,size,size,(.72+.22*p.z)*vignetteAlpha(x,y));ctx.restore();
      }
    }
    function drawRain(dt,m,dark){
      if(!allowed('weather')||!rainMode())return;
      const heavy=m!=='rain',count=level==='subtle'?48:level==='rich'?160:heavy?130:92;
      const tilt=clamp(wind/70,.045,.4);
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
      if((m==='storm'||m==='typhoon')&&!reduced.matches){
        const period=time%31;
        if(period>.2&&period<.48){glow(bg,w*.85,-25,w*.9,'219,233,246',Math.sin((period-.2)/.28*Math.PI)*.13);if(period<.24&&root.WxSfx)root.WxSfx.triggerThunder()}
      }
    }
    function drawSnow(dt,m){
      if(m!=='snow'||!allowed('weather'))return;
      const count=level==='subtle'?16:32;
      for(let i=0;i<count;i++){const p=rain[i];p.y=(p.y+dt*(10+25*p.z)/h)%1;const x=p.x*w+Math.sin(time*.4+i)*18,y=p.y*h;ctx.fillStyle=`rgba(220,234,240,${.15+.3*vignetteAlpha(x,y)})`;ctx.beginPath();ctx.arc(x,y,.7+p.z*2,0,Math.PI*2);ctx.fill()}
    }
    function drawAnimals(m,hour){
      if(!allowed('animals')||rainMode()||['none','snow','fog','cold'].includes(m))return;
      if(hour>=19||hour<5){
        for(let i=0;i<5;i++){const x=i%2? w-20-Math.sin(time*.23+i)*18:20+Math.sin(time*.21+i)*16,y=h*.4+(Math.sin(time*.13+i)*.25+.2)*h;glow(ctx,x,y,7,'207,233,143',Math.max(0,Math.sin(time*.7+i))*.26)}
      }else{
        const idx=Math.floor(time*9)%6;
        for(let i=0;i<(level==='subtle'?1:2);i++){const x=i?w-20+Math.sin(time*.22)*20:18+Math.sin(time*.3)*22,y=110+(Math.sin(time*.13+i*2)*.5+.5)*(h-300);ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.5+i)*.25);imageDraw(ctx,images.butterfly[(idx+i)%6],-17,-17,34,34,.62);ctx.restore()}
      }
    }
    function draw(dt){
      if(!ctx)return;ctx.clearRect(0,0,w,h);bg.clearRect(0,0,w,h);
      const on=['weather','animals','seasonal'].some(allowed);canvas.style.display=on?'':'none';sky.style.display=on?'':'none';if(!on)return;
      const m=activeMode(),d=new Date(),hour=d.getHours()+d.getMinutes()/60,dark=document.documentElement.dataset.theme==='dark',season=Math.floor((d.getMonth()+10)%12/3);
      document.body.dataset.atmosphere=m;
      drawSky(m,hour,dark);
      if(!reduced.matches){drawLeaves(dt,season,m);drawRain(dt,m,dark);drawSnow(dt,m);drawAnimals(m,hour)}
      // Protect text on both front planes, never entire content cards.
      if(layoutDirty||time-rectTick>.5||rectTick<0)collectQuiet();
      for(const c of [bg,ctx]){c.save();c.globalCompositeOperation='destination-out';c.drawImage(mask,0,0,w,h);c.restore()}
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
    function syncSound(){if(root.WxSfx)root.WxSfx.setMode(activeMode())}
    function update(c,t,p,v){code=c;temp=Number(t)||0;wind=Number(v)||0;mode=classify(c,temp,wind);init();syncSound();resume()}
    function setQuality(value){if(!['subtle','balanced','rich'].includes(value))return;level=value;try{localStorage.setItem('nature_quality',level)}catch(e){}resize();resume()}
    function previewMode(value){if(!['clear','cloud','rain','storm','wind','snow'].includes(value))return;preview=value;previewUntil=performance.now()+8000;syncSound();resume();setTimeout(()=>{if(performance.now()>=previewUntil){preview=null;syncSound();resume()}},8050)}
    return{update,getMode:()=>mode,refresh:resume,setQuality,getQuality:()=>level,preview:previewMode,_forceSilence(){if(root.WxSfx)root.WxSfx._forceSilence()},_debug:()=>({mode,active:activeMode(),frames:frameCount,running:!!raf,quality:level,reduced:reduced.matches,canvasCount:document.querySelectorAll('#wxfx').length,protectedRects:quiet.length})};
  }};
})(window);
