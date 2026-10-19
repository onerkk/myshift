/* v319 layered atmosphere, physical wind response and seasonal scene.
   Weather motion is confined to atmospheric windows; application data stays unobstructed.
    Existing photographic assets; time-based motion.
   No weather API, account data, or pay state is written by this module. */
(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
  function classify(code,temp,wind){
    if(code===null||code===undefined||!Number.isFinite(Number(code)))return 'none';
    code=Number(code);
    if([96,99].includes(code))return 'hail';
    if(code===95)return 'storm';
    if([65,67,82].includes(code))return 'heavy';
    if([51,53].includes(code))return 'drizzle';
    if([55,56,57,61,63,66,80,81].includes(code))return 'rain';
    if([71,73,75,77,85,86].includes(code))return 'snow';
    if([45,48].includes(code))return 'fog';
    if(wind>=35)return 'wind';
    if(temp>=34)return 'heat';
    if(temp<=10)return 'cold';
    return code>=2?'cloud':'clear';
  }
  // Approximate NOAA fractional-year solar position; angles in degrees.
  // Uses the weather location and UTC instant, independent of the UI theme.
  function solarPosition(stamp,lat,lon){
    if(lat===null||lat===undefined||lon===null||lon===undefined||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    const d=new Date(stamp);if(!Number.isFinite(d.getTime()))return null;
    const rad=Math.PI/180,day=(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,0))/86400000;
    const minutes=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60,g=2*Math.PI/365*(day-1+(minutes/60-12)/24);
    const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
    const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
    const solarMinutes=((minutes+eq+4*Number(lon))%1440+1440)%1440,ha=(solarMinutes/4-180)*rad,phi=Number(lat)*rad;
    const elevation=Math.asin(clamp(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(ha),-1,1))/rad;
    return {elevation,solarHour:solarMinutes/60,daylight:elevation>0,twilight:elevation>-6&&elevation<=0};
  }
  function visualState(code,details={}){
    const mode=classify(code,20,0),known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
    const cloud=known(details.cloud)?clamp(Number(details.cloud)/100,0,1):({clear:.1,cloud:code===2?.55:.88,drizzle:.7,rain:.88,heavy:.98,storm:1,fog:.98,snow:.95}[mode]??.35);
    const rain=known(details.rain)?clamp(Number(details.rain),0,100):null;
    const intensity=['drizzle','rain','heavy','storm','hail'].includes(mode)?clamp(rain===null?({drizzle:.16,rain:.32,heavy:.75,storm:.9,hail:.75}[mode]??.32):.12+Math.sqrt(rain/15),.12,1):0;
    return {cloud,intensity,rain,mode};
  }
  root.NatureEffects={classify,solarPosition,visualState,create:function(){
    let canvas,sky,ctx,bg,mask,maskCtx,maskSource,maskSourceCtx,w=0,h=0,raf=0,last=0,time=0,frameCount=0,accum=0;
    let details={},weatherState=visualState(null),solar=null;
    let code=null,temp=0,wind=0,mode='none',preview=null,previewUntil=0,quiet=[],rectTick=-1,layoutDirty=true;
    let thunderTimer=0,hud=null,previewStarted=0,hudTimer=0;
    const previewModes=['clear','cloud','drizzle','rain','heavy','storm','typhoon','hail','snow','wind','fog','heat','cold','earthquake'];
    const labels={clear:['日光','Cerah'],cloud:['雲層','Awan'],drizzle:['細雨','Gerimis'],rain:['降雨','Hujan'],heavy:['豪雨','Hujan lebat'],storm:['雷雨','Badai petir'],typhoon:['颱風','Topan'],hail:['冰雹','Hujan es'],snow:['飄雪','Salju'],wind:['強風','Angin kencang'],fog:['濃霧','Kabut'],heat:['熱浪','Panas'],cold:['寒流','Dingin'],earthquake:['地震情境','Simulasi gempa']};
    let views=[],gust=0,cloudBlend=0,lightning=0,nextLightning=25,seasonPreview=null,previewTimer=0,previewToken=0,interactionWind=0,lastLightUpdate=-1;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),images={},leaves=[],rain=[],stars=[];
    let level='rich';try{level=localStorage.getItem('nature_quality')||level}catch(e){}
    const allowed=k=>typeof root.isFxEnabled!=='function'||root.isFxEnabled(k);
    const rainMode=()=>['drizzle','rain','heavy','storm','typhoon'].includes(activeMode());
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
      for(let i=0;i<420;i++)rain.push({x:Math.random(),y:Math.random(),z:rand(.15,1)});
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
      const fullSelector='.bottom-nav,.modal-sheet,.wx-detail-sheet,.nature-preview-hud,input,select,textarea';
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
      const weather=allowed('weather'),night=solar?solar.elevation< -6:hour<5.5||hour>=18.5;
      if(!weather||m==='none')return;
      const wet=rainMode()||m==='hail',cover=m==='cloud'||m==='fog'||wet;
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
      const count=weatherState.cloud>.65?3:2,crops=[[6,186,499,140],[7,78,498,355],[6,78,503,353]],strength=level==='subtle'?.78:level==='rich'?1.23:1;
      for(let i=0;i<count;i++){
        const img=images.cloud[i],size=Math.min(600,w*[1.04,.67,.92][i]),start=w*[-.25,.72,-.38][i];
        const x=((start+time*(2.5+i*.9+gust*.45)+size)%(w+size))-size,y=h*[.13,.34,.62][i]+Math.sin(time*.035+i)*7;
        if(img.complete&&img.naturalWidth){
          const crop=crops[i];bg.save();bg.globalAlpha=(cover?(night?.28:.38):.23)*strength*(.35+weatherState.cloud*.65);
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
      if(!allowed('seasonal')||rainMode()||['snow','hail','earthquake','none'].includes(m))return;
      if(season!==2&&season!==0&&m!=='wind')return;
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
      const drizzle=m==='drizzle',heavy=!['drizzle','rain'].includes(m),intensity=preview?(m==='drizzle'?.2:m==='typhoon'?1:m==='heavy'?.9:.65):weatherState.intensity,count=Math.round((level==='subtle'?65:level==='rich'?300:180)*Math.max(.15,intensity));
      const tilt=clamp(gust/32,.045,m==='typhoon'?1.65:.85);
      ctx.lineCap='round';
      for(let i=0;i<count;i++){
        const p=rain[i],speed=(drizzle?110+p.z*160:200+p.z*420)*(heavy?1.2:1);
        p.y+=dt*speed/h;p.x+=dt*speed*tilt/w;
        if(p.y>1.03){p.y=-.03;p.x=Math.random()}if(p.x>1.1)p.x=-.1;
        const x=p.x*w,y=p.y*h,len=drizzle?3+8*p.z:8+27*p.z,edge=vignetteAlpha(x,y),a=(.25+.4*p.z)*edge;
        // Dark refraction and a bright core remain visible over both porcelain
        // cards and the dark shift/salary instrument panels.
        const tail=ctx.createLinearGradient(x,y,x+len*tilt,y+len);
        tail.addColorStop(0,'rgba(71,107,120,0)');tail.addColorStop(.76,`rgba(71,107,120,${a*(dark?.6:1)})`);tail.addColorStop(1,'rgba(71,107,120,0)');
        ctx.strokeStyle=tail;ctx.lineWidth=drizzle?.35+p.z*.3:.65+p.z*1.1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len*tilt,y+len);ctx.stroke();
        const glint=ctx.createLinearGradient(x,y,x+len*tilt,y+len);glint.addColorStop(0,'rgba(234,245,249,0)');glint.addColorStop(.84,`rgba(234,245,249,${a*.9})`);glint.addColorStop(1,'rgba(234,245,249,0)');
        ctx.strokeStyle=glint;ctx.lineWidth=.35+p.z*.42;ctx.beginPath();ctx.moveTo(x+.4,y);ctx.lineTo(x+len*tilt+.4,y+len);ctx.stroke();
        if(i<9&&p.y>.98){ctx.strokeStyle=`rgba(145,193,208,${.2*edge})`;ctx.beginPath();ctx.ellipse(x,h-20,3+(p.y-.98)*200,1.2,0,0,Math.PI*2);ctx.stroke()}
      }
      // Near-lens beads slide more slowly than the rainfall behind them.
      // Curved highlights and a shaded lower rim give transparent water volume.
      for(let i=0;i<(drizzle?2:level==='subtle'?4:8);i++){
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
      if(!allowed('animals')||rainMode()||['none','snow','fog','cold','hail','earthquake'].includes(m)||seasonName()==='winter')return;
      if(hour>=19||hour<5){
        if(seasonName()!=='summer')return;
        for(let i=0;i<5;i++){const x=i%2? w-20-Math.sin(time*.23+i)*18:20+Math.sin(time*.21+i)*16,y=h*.4+(Math.sin(time*.13+i)*.25+.2)*h;glow(ctx,x,y,7,'207,233,143',Math.max(0,Math.sin(time*.7+i))*.26)}
      }else{
        const idx=Math.floor(time*9)%6;
        for(let i=0;i<(level==='subtle'?1:2);i++){const x=i?w-20+Math.sin(time*.22)*20:18+Math.sin(time*.3)*22,y=110+(Math.sin(time*.13+i*2)*.5+.5)*(h-300);ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.5+i)*.25);imageDraw(ctx,images.butterfly[(idx+i)%6],-17,-17,34,34,.62);ctx.restore()}
      }
    }
    function updateHud(){
      const active=!!preview&&performance.now()<previewUntil,zh=document.documentElement.lang!=='id';
      if(!hud){hud=document.createElement('aside');hud.className='nature-preview-hud';hud.setAttribute('aria-label',zh?'情境預覽控制':'Kontrol pratinjau');hud.innerHTML='<span></span><button type="button"></button>';hud.querySelector('button').onclick=stopPreview;document.body.appendChild(hud)}
      hud.hidden=!active;if(!active)return;
      const label=(labels[activeMode()]||labels.clear)[zh?0:1],seconds=Math.max(0,Math.ceil((previewUntil-performance.now())/1000));
      const text=zh?`${label} · 情境示意 ${seconds}s${activeMode()==='earthquake'?' · 非即時警報':''}`:`${label} · Simulasi ${seconds}s${activeMode()==='earthquake'?' · Bukan peringatan langsung':''}`;
      if(hud.firstChild.textContent!==text)hud.firstChild.textContent=text;hud.lastChild.textContent=zh?'結束預覽':'Akhiri';
    }
    function drawImmersive(dt,m,dark){
      const enabled=allowed('weather'),moving=!reduced.matches,night=solar?solar.elevation<0:dark;
      document.documentElement.style.setProperty('--quake-x','0px');document.documentElement.style.setProperty('--quake-y','0px');
      if(!enabled||m==='none')return;
      const wet=['drizzle','rain','heavy','storm','typhoon','hail'].includes(m),fog=m==='fog';
      // Near cloud banks drift across the whole screen rather than inside a card.
      const cloudMode=['cloud','fog','heavy','storm','typhoon','hail'].includes(m);
      if(cloudMode){for(let i=0;i<(level==='rich'?4:2);i++){
        const size=Math.max(w*.92,390),speed=m==='typhoon'?26+i*8:3+i*2,x=((time*speed+i*w*.51+size)%(w+size))-size,y=h*(.16+i*.23)+Math.sin(time*.035+i)*16;
        ctx.save();ctx.filter=night?'brightness(.55)':['typhoon','storm','hail'].includes(m)?'brightness(.64) saturate(.35)':'brightness(.9)';cloudTexture(ctx,i%3,x,y,size,fog?.22:wet?.16:.11,1.2);ctx.restore();
      }}
      if(fog){for(let i=0;i<4;i++)glow(ctx,w*(i*.45-.2)+Math.sin(time*.025+i)*w*.14,h*(.18+i*.23),w*.8,night?'130,159,181':'208,223,230',.15)}
      if(m==='heat'){glow(ctx,w*.8,h*.08,w*.85,'255,172,80',.16);if(moving)for(let i=0;i<12;i++){const x=(i*.127*w+time*2)%w,y=h*.15+(Math.sin(time*.4+i)*.5+.5)*h*.6;glow(ctx,x,y,3,'255,216,156',.14)}}
      if(m==='cold'){const edge=ctx.createLinearGradient(0,0,w,0);edge.addColorStop(0,'#c0e4f33b');edge.addColorStop(.13,'#c0e4f300');edge.addColorStop(.87,'#c0e4f300');edge.addColorStop(1,'#c0e4f33b');ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);ctx.strokeStyle=night?'#bbdffb33':'#79a9c344';ctx.lineWidth=.7;for(let side=0;side<2;side++)for(let i=0;i<9;i++){const x=side?w:0,y=70+i*h*.12,dir=side?-1:1,len=18+i%4*6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dir*len,y-12);for(let j=1;j<4;j++){const xx=x+dir*len*j/4,yy=y-12*j/4;ctx.moveTo(xx,yy);ctx.lineTo(xx-dir*4,yy-9);ctx.moveTo(xx,yy);ctx.lineTo(xx+dir*7,yy+3)}ctx.stroke()}}
      if(!moving)return;
      if(['wind','typhoon'].includes(m)){
        const count=level==='rich'?45:26;ctx.lineWidth=.7;for(let i=0;i<count;i++){const z=(i%7+1)/7,x=((time*(85+z*110)+i*73)%(w+180))-100,y=(i*97+Math.sin(time*.4+i)*12)%h;ctx.strokeStyle=`rgba(${night?'191,218,238':'66,103,127'},${.08+z*.09})`;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+30,y-2,x+70,y-8,x+95+z*45,y-5);ctx.stroke()}
        for(let i=0;i<7;i++){const x=((time*(55+i*9)+i*87)%(w+90))-45,y=(i*127+time*(12+i*3))%h;ctx.save();ctx.translate(x,y);ctx.rotate(time*(1+i*.15));ctx.fillStyle=night?'#9ca79b77':'#6a715e88';ctx.beginPath();ctx.ellipse(0,0,3+i%3*2,1.5+i%2,0,0,Math.PI*2);ctx.fill();ctx.restore()}
      }
      if(m==='hail'){
        const count=level==='subtle'?36:level==='rich'?115:72;
        for(let i=0;i<count;i++){const p=rain[i],z=p.z,r=1.6+z*4.7,speed=330+z*570;p.y+=dt*speed/h;p.x+=dt*(55+gust*4)/w;if(p.y>1.12){p.y=-.08;p.x=Math.random()}if(p.x>1.1)p.x=-.1;
          let x=p.x*w,y=p.y*h;const floor=h*(.84+(i%5)*.026);if(y>floor){const t=(y-floor)/(h-floor);y=floor-Math.sin(t*Math.PI)*(12+z*24);x+=t*24}
          ctx.save();ctx.translate(x,y);ctx.rotate(time*.8+i);ctx.strokeStyle=night?'#c5efffdd':'#50788ea6';ctx.lineWidth=.65;const g=ctx.createRadialGradient(-r*.3,-r*.4,.2,0,0,r);g.addColorStop(0,'#fffffffa');g.addColorStop(.4,'#dceff6dd');g.addColorStop(1,'#85b5caaa');ctx.fillStyle=g;ctx.beginPath();for(let j=0;j<7;j++){const a=j*Math.PI*2/7,rr=r*(j%2?.9:1);j?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
        }
      }
      if(m==='earthquake'&&preview){
        const elapsed=(performance.now()-previewStarted)/1000,envelope=Math.min(1,elapsed/1.5)*Math.max(0,1-elapsed/20),amp=(level==='subtle'?1:2.8)*envelope;
        document.documentElement.style.setProperty('--quake-x',(Math.sin(time*31)+Math.sin(time*43)*.35)*amp+'px');document.documentElement.style.setProperty('--quake-y',Math.sin(time*37)*amp*.55+'px');
        for(let i=0;i<36;i++){const z=(i%9+1)/9,x=(i*81+Math.sin(time*.6+i)*18)%w,y=(h-i*29-time*(3+z*11))%h;glow(ctx,x,y,1.5+z*4,night?'170,182,194':'132,118,99',.18*envelope)}
        for(let i=0;i<3;i++){const phase=(time*.25+i/3)%1;ctx.strokeStyle=`rgba(151,130,101,${(1-phase)*.14*envelope})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(w*.5,h*.9,w*.2+phase*w,.8+phase*90,0,0,Math.PI*2);ctx.stroke()}
      }
      if(lightning>0){ctx.fillStyle=`rgba(211,230,255,${lightning*.06})`;ctx.fillRect(0,0,w,h);ctx.strokeStyle=`rgba(220,238,255,${lightning*.55})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(w*.78,-10);ctx.lineTo(w*.7,h*.13);ctx.lineTo(w*.75,h*.12);ctx.lineTo(w*.66,h*.26);ctx.stroke()}
    }
    function draw(dt){
      if(!ctx)return;ctx.clearRect(0,0,w,h);bg.clearRect(0,0,w,h);
      const on=['weather','animals','seasonal'].some(allowed);if(preview&&(!on||!seasonPreview&&!allowed('weather'))){stopPreview();return}canvas.style.display=on?'':'none';sky.style.display=on?'':'none';if(!on){for(const v of views){paintScene(v,'none',12,false,seasonName());labelScene(v,'none',seasonName())}return;}
      const m=activeMode(),d=new Date(),hour=d.getHours()+d.getMinutes()/60,dark=document.documentElement.dataset.theme==='dark',name=seasonName(),season={spring:0,summer:1,autumn:2,winter:3}[name];
      solar=solarPosition(d.getTime(),details.lat,details.lon);
      const sceneWind=preview&&m==='typhoon'?110:preview&&m==='wind'?45:wind;
      interactionWind*=Math.exp(-dt*.6);gust+=(Math.min(52,Math.max(0,sceneWind)/3.6)*(1+.2*Math.sin(time*.31)+.1*Math.sin(time*.93))+interactionWind-gust)*Math.min(1,dt*1.3);
      const targetCloud=preview?(['cloud','drizzle','rain','heavy','storm','typhoon','hail','fog','snow'].includes(m)?.9:.12):weatherState.cloud;
      cloudBlend+=(targetCloud-cloudBlend)*Math.min(1,Math.max(.02,dt*.45));
      lightning=Math.max(0,lightning-dt*1.6);if(!reduced.matches&&allowed('weather')&&['storm','typhoon'].includes(m)&&time>nextLightning){lightning=1;nextLightning=time+rand(24,48);clearTimeout(thunderTimer);thunderTimer=setTimeout(()=>{if(['storm','typhoon'].includes(activeMode())&&!document.hidden&&allowed('weather')&&root.WxSfx)root.WxSfx.triggerThunder()},800)}
      document.body.dataset.season=name;document.body.dataset.lightPhase=solar?(solar.elevation< -6?'night':solar.elevation<12?'golden':'day'):(hour<5||hour>=19?'night':hour>16||hour<8?'golden':'day');
      if(time-lastLightUpdate>1||lastLightUpdate<0){lastLightUpdate=time;document.documentElement.style.setProperty('--sun-x',Math.round(clamp((hour-5)/14,0,1)*70+15)+'%')}
      document.body.dataset.atmosphere=m;
      // Full viewport landscape behind the UI, with independent foreground depth.
      paintScene({c:bg,w,h,dpr:Math.min(devicePixelRatio||1,level==='subtle'?1.25:1.75),rect:{top:0,bottom:h}},m,hour,dark,name);
      drawImmersive(dt,m,dark);
      updateHud();
      if(!reduced.matches){drawLeaves(dt,season,m);drawRain(dt,m,dark);drawSnow(dt,m);drawAnimals(m,hour)}
      // Protect text on both front planes, never entire content cards.
      if(layoutDirty||time-rectTick>.5||rectTick<0)collectQuiet();
      for(const c of [ctx]){c.save();c.globalCompositeOperation='destination-out';c.drawImage(mask,0,0,w,h);c.restore()}
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
    function update(c,t,p,v,extra={}){code=c;details=extra||{};weatherState=visualState(c,details);temp=Number(t)||0;wind=Number(v)||0;mode=extra.typhoon&&['rain','heavy','storm'].includes(classify(c,temp,wind))?'typhoon':classify(c,temp,wind);init();syncSound();resume()}
    function setQuality(value){if(!['subtle','balanced','rich'].includes(value))return;level=value;try{localStorage.setItem('nature_quality',level)}catch(e){}resize();resume()}
    function previewMode(value){if(!previewModes.includes(value)||!allowed('weather'))return;init();preview=value;seasonPreview=null;if(value==='typhoon')gust=Math.max(gust,30);previewStarted=performance.now();previewUntil=performance.now()+20000;previewToken++;nextLightning=time+1.7;schedulePreviewEnd(previewToken);syncSound();resume()}
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
      c.save();c.globalAlpha=alpha;if(soft)c.filter=(c.filter==='none'?'':c.filter+' ')+'blur('+soft+'px)';
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
      const c=v.c,W=v.w,H=v.h;c.setTransform(v.dpr,0,0,v.dpr,0,0);c.clearRect(0,0,W,H);
      const weather=allowed('weather')&&m!=='none',wet=weather&&['drizzle','rain','heavy','storm','typhoon','hail'].includes(m),snow=weather&&m==='snow';
      const sun=solar,night=sun?sun.elevation< -6:hour<5||hour>=19,twilight=sun?sun.elevation>=-6&&sun.elevation<9:hour>=5&&hour<7||hour>=17&&hour<19;
      const cloud=preview?(['cloud','drizzle','rain','heavy','storm','typhoon','hail','fog'].includes(m)?.9:.15):cloudBlend;
      const colors=!weather?['#718692','#a0b5bc','#d7e0dd']:night?wet?['#101f36','#263e53','#526674']:['#0d213d','#28475e','#739098']:wet?['#465f78','#7d97a7','#c0cbcb']:twilight?['#657eaa','#ccada7','#f4d1a0']:['#4c8fb6','#98c8d8','#d6e1cf'];
      const g=c.createLinearGradient(0,0,W*.08,H);g.addColorStop(0,colors[0]);g.addColorStop(.57,colors[1]);g.addColorStop(1,colors[2]);c.fillStyle=g;c.fillRect(0,0,W,H);
      if(weather&&night){
        for(let i=0;i<24;i++){const p=stars[i];c.globalAlpha=(.3+.15*Math.sin(time*.25+p.phase))*(1-cloud);c.fillStyle='#edf5ff';c.beginPath();c.arc(p.x*W,p.y*H,.3+p.r*.45,0,Math.PI*2);c.fill()}c.globalAlpha=1;
        if(!wet&&m!=='fog'){
          const mx=W*.75,my=H*.22,r=H*.043,age=((Date.now()-Date.UTC(2000,0,6,18,14))/86400000%29.530588+29.530588)%29.530588,phase=age/29.530588,lit=(1-Math.cos(phase*Math.PI*2))/2;
          glow(c,mx,my,H*.24,'186,218,243',.13*(1-cloud*.75));c.save();c.globalAlpha=.9*(1-cloud*.6);c.fillStyle='#dfe9e7';c.beginPath();c.arc(mx,my,r,0,Math.PI*2);c.fill();
          c.globalCompositeOperation='source-atop';c.fillStyle=colors[0];c.beginPath();c.ellipse(mx+(phase<.5?-1:1)*r*(.1+lit*2),my,r*(1.08-lit*.22),r*1.02,0,0,Math.PI*2);c.fill();c.restore();
        }
      }else if(weather&&!wet&&m!=='fog'){
        const solarHour=sun?sun.solarHour:hour,progress=clamp((solarHour-6)/12,0,1),sx=W*(.12+.76*progress),sy=H*(.49-Math.sin(progress*Math.PI)*.36),warm=twilight;
        glow(c,sx,sy,H*.8,warm?'255,191,120':'255,240,196',.6*(1-cloud*.68));
        const disk=c.createRadialGradient(sx,sy,0,sx,sy,13);disk.addColorStop(0,'#fffff8');disk.addColorStop(.6,warm?'#ffe2b8':'#fff7dc');disk.addColorStop(1,'#fff4c900');c.save();c.globalAlpha=clamp(1-cloud*.85,.1,1);c.fillStyle=disk;c.fillRect(sx-13,sy-13,26,26);c.restore();
        if(cloud>.28&&cloud<.8){c.save();c.filter='blur(9px)';for(let i=0;i<4;i++){c.fillStyle='rgba(255,240,193,'+(.04*(1-cloud))+')';c.beginPath();c.moveTo(sx-3,sy);c.lineTo(sx+18+i*W*.1,H*.76);c.lineTo(sx+44+i*W*.1,H*.76);c.closePath();c.fill()}c.restore()}
      }
      // Three photographic cloud planes: high cirrus, mid cumulus, near rain deck.
      const layers=weather?(cloud>.7?5:cloud>.35?3:2):1;
      for(let i=0;i<layers;i++){
        const size=W*(i%3===0?1.02:i%3===1?.65:.85),span=W+size,speed=(1.2+i*.4+gust*(.35+i*.1)),x=((W*[.25,-.28,.8,-.45,.6][i]+time*speed+size)%span)-size,y=H*[.12,.25,.02,.4,.32][i];
        const alpha=(night?.23:wet?.6:.42)*(i>2?cloud*.75:.4+cloud*.6);
        // Shadow volume is offset below the bright photographic texture.
        c.save();c.filter='brightness('+(night?.42:wet?.65:.82)+') saturate(.65)';cloudTexture(c,i%3,x+4,y+6,size,alpha*.5,i>2?1.2:.45);c.restore();
        c.save();if(night)c.filter='brightness(.62) sepia(.2)';else if(twilight)c.filter='sepia(.2) saturate(.7)';else if(wet)c.filter=['typhoon','storm'].includes(m)?'brightness(.53) saturate(.4)':'brightness(.75) saturate(.5)';cloudTexture(c,i%3,x,y,size,alpha,i>2?.7:0);c.restore();
      }
      // Distant terrain: atmospheric haze, soft ridges, then a shaded near bank.
      const horizon=H*.74;
      for(let layer=0;layer<4;layer++){
        c.save();c.fillStyle=night?['#294254','#213d4c','#193741','#132f38'][layer]:wet?['#789399','#638488','#547778','#3f6566'][layer]:['#9db7ad','#7f9e96','#648b80','#486e64'][layer];c.globalAlpha=.35+layer*.13;
        c.beginPath();c.moveTo(-20,H);c.lineTo(-20,horizon+layer*H*.037);for(let j=0;j<=8;j++){const x=j*W/7,y=horizon+layer*H*.04+Math.sin(j*.87+layer*.92)*H*(.05+layer*.006);c.lineTo(x,y)}c.lineTo(W+20,H);c.closePath();c.fill();c.restore();
      }
      if(m==='fog'){for(let i=0;i<3;i++)glow(c,W*(i*.55-.05)+Math.sin(time*.03+i)*W*.1,H*(.45+i*.12),W*.6,'215,226,229',night?.08:.24);}
      // Reflective water just above the near bank; highlights respond to wind.
      const water=c.createLinearGradient(0,H*.84,0,H);water.addColorStop(0,night?'#31495799':'#b7c8bd66');water.addColorStop(1,night?'#142e3b':'#557f78');c.fillStyle=water;c.fillRect(0,H*.84,W,H*.16);
      c.save();for(let i=0;i<18;i++){const y=H*(.85+i*.009),x=((i*.137*W+Math.sin(time*.2+i)*9+time*(gust*.2+.4))%(W+50))-25;c.strokeStyle=night?'#b5d5e227':'#eaf0da55';c.lineWidth=.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+12+(i%4)*12,y);c.stroke()}c.restore();
      const leafColor=night?'27,56,63':season==='autumn'?'102,104,68':'40,91,77';
      for(let i=0;i<23;i++){
        const side=i<12?0:1,base=side?W+(i-18)*5:(i-6)*5,height=H*(.19+(i%6)*.034),bend=(Math.sin(time*.42+i*.18)*(1+gust*.12)+gust*.9)*(height/H),top=base+(side?-1:1)*(14+i%5*3)+bend;
        c.strokeStyle='rgba('+leafColor+',.75)';c.lineWidth=.8+i%3*.25;c.beginPath();c.moveTo(base,H+6);c.quadraticCurveTo(base+bend,H-height*.48,top,H-height);c.stroke();
        for(let j=0;j<3;j++){const x=base+(top-base)*(j+2)/5,y=H-height*(j+2)/5;c.fillStyle='rgba('+leafColor+',.65)';c.beginPath();c.ellipse(x+(j%2?-4:4),y-2,6+height*.01,1.9,((j%2?1:-1)*.5)+bend*.006,0,Math.PI*2);c.fill()}
      }
      if(allowed('seasonal')&&weather&&!wet&&!snow&&['autumn','spring'].includes(season))for(let i=0;i<(level==='subtle'?1:3);i++){const p=leaves[i],size=8+10*p.z,x=(p.x*W+Math.sin(p.phase)*18+W)%W,y=p.y*H;c.save();c.translate(x,y);c.rotate(p.rot);c.scale(Math.cos(p.phase*.8)||.1,.8);imageDraw(c,images[season==='spring'?'petal':'leaf'][i%(season==='spring'?3:4)],-size/2,-size/2,size,size,.7);c.restore()}
      if(weather&&wet){
        const strength=preview?.6:weatherState.intensity,count=Math.round((level==='subtle'?35:105)*Math.max(.2,strength)),tilt=.045+gust*.019;
        c.save();c.lineCap='round';for(let i=0;i<count;i++){const p=rain[i],x=p.x*W,y=p.y*H,len=5+19*p.z;c.strokeStyle=night?'rgba(188,215,239,'+(.12+p.z*.25)+')':'rgba(229,245,246,'+(.25+p.z*.35)+')';c.lineWidth=.35+p.z*.7;c.beginPath();c.moveTo(x,y);c.lineTo(x+len*tilt,y+len);c.stroke();}c.restore();
        for(let i=0;i<5;i++){const x=W*[.08,.91,.19,.82,.37][i],y=(time*(1+i*.5)+i*H*.18)%(H+20)-10,r=1.5+i%3*.7;glow(c,x-r*.3,y-r*.4,r*2,'235,251,255',.3);c.strokeStyle='#173c5666';c.lineWidth=.65;c.beginPath();c.ellipse(x,y,r,r*1.8,-tilt*.1,0,Math.PI*2);c.stroke();c.strokeStyle='#edffffab';c.beginPath();c.arc(x-.2,y-r*.3,r*.65,3.1,4.9);c.stroke()}
      }
      if(snow){c.fillStyle='#e6f1ef99';for(let i=0;i<28;i++){const p=rain[i];c.beginPath();c.arc(p.x*W+Math.sin(time*.3+i)*6,p.y*H,1+p.z,0,Math.PI*2);c.fill()}}
      if(allowed('animals')&&weather&&night&&!wet&&season==='summer')for(let i=0;i<5;i++)glow(c,W*(.12+i*.17)+Math.sin(time*.3+i)*6,H*(.6+i%2*.06),3,'222,238,146',Math.max(0,Math.sin(time*.8+i))*.4);
      if(lightning>0){c.fillStyle='rgba(213,233,255,'+lightning*.09+')';c.fillRect(0,0,W,H)}
    }
    function previewSeason(value){
      if(!['spring','summer','autumn','winter'].includes(value))return;
      seasonPreview=value;preview=mode==='none'?'clear':mode;previewStarted=performance.now();previewUntil=performance.now()+20000;previewToken++;
      schedulePreviewEnd(previewToken);syncSound();resume();
    }
    function stopPreview(){clearTimeout(previewTimer);clearInterval(hudTimer);previewToken++;preview=null;seasonPreview=null;previewUntil=0;document.querySelectorAll('.nature-controls .is-preview').forEach(el=>el.classList.remove('is-preview'));document.querySelectorAll('.nature-previews button,.nature-seasons button').forEach(el=>el.setAttribute('aria-pressed','false'));document.querySelectorAll('.nature-preview-state').forEach(el=>el.textContent='');document.documentElement.style.setProperty('--quake-x','0px');document.documentElement.style.setProperty('--quake-y','0px');syncSound();resume();updateHud()}
    function schedulePreviewEnd(ticket){clearInterval(hudTimer);hudTimer=setInterval(updateHud,1000);clearTimeout(previewTimer);previewTimer=setTimeout(()=>{if(ticket===previewToken)stopPreview()},20050)}

    return{update,stopPreview,previewModes:()=>previewModes.slice(),previewSeason,getSeason:seasonName,getMode:()=>mode,refresh:resume,setQuality,getQuality:()=>level,preview:previewMode,_forceSilence(){if(root.WxSfx)root.WxSfx._forceSilence()},_debug:()=>({mode,active:activeMode(),frames:frameCount,running:!!raf,quality:level,cloud:weatherState.cloud,intensity:weatherState.intensity,solar,reduced:reduced.matches,canvasCount:document.querySelectorAll('#wxfx').length,protectedRects:quiet.length,views:views.length,season:seasonName(),gust,preview:!!preview})};
  }};
})(window);
