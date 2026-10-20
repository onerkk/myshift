/* Real CC0 field recordings and recorded foley only. No oscillator/noise synthesis.
   Asset provenance and edits: audio/nature/ATTRIBUTION.md. */
(function(root){
  'use strict';
  const files={rain:'rain.mp3',wind:'wind.mp3',leaves:'leaves.mp3',birds:'birds.mp3',crickets:'crickets.mp3',thunder:'thunder.mp3',click:'click.mp3',hail:'hail.mp3',iceImpact:'hail-impact.mp3',quake:'quake.mp3',rumble:'rumble.mp3'};
  root.NatureAudio={create:function(){
    let context=null,master=null,buttonBus=null,scene={season:null,wind:0},buttonVolume=.45,mode='none',muted=true,unlocked=false,revision=0,lastThunder=-Infinity,lastClick=-Infinity,status='muted',volume=.3;
    const cache=new Map(),decoded=new Set(),loops=new Map(),oneshots=new Set(),tails=new Set();
    try{muted=localStorage.getItem('sb_sfx')!=='on';const b=localStorage.getItem('nature_button_volume');if(b!==null&&Number.isFinite(Number(b)))buttonVolume=Math.max(0,Math.min(1,Number(b)));const v=Number(localStorage.getItem('nature_volume'));if(localStorage.getItem('nature_volume')!==null&&Number.isFinite(v))volume=Math.max(0,Math.min(1,v))}catch(e){}
    const permitted=()=>typeof root.isFxEnabled!=='function'||root.isFxEnabled('sound');
    const allowed=k=>typeof root.isFxEnabled!=='function'||root.isFxEnabled(k);
    function announce(value){status=value;document.querySelectorAll('.nature-audio-status').forEach(e=>{const zh=document.documentElement.lang!=='id';e.textContent=({muted:zh?'已靜音':'Dimatikan',ready:zh?'錄音素材聲景播放中':'Lanskap rekaman diputar',waiting:zh?'輕觸開啟聲音':'Ketuk untuk suara',loading:zh?'載入實地錄音…':'Memuat rekaman…',error:zh?'音檔無法載入，可重新開啟聲音重試':'Audio gagal dimuat; aktifkan ulang untuk mencoba',paused:zh?'已暫停':'Dijeda',quiet:zh?'目前情境保持安靜':'Suasana saat ini hening'})[value]||value});}
    function initAudio(){
      if(!permitted())return false;
      if(!context){try{context=new (root.AudioContext||root.webkitAudioContext)();master=context.createGain();master.gain.value=0;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-9;limiter.knee.value=18;limiter.ratio.value=6;limiter.attack.value=.006;limiter.release.value=.22;master.connect(limiter);limiter.connect(context.destination);buttonBus=context.createGain();buttonBus.gain.value=buttonVolume;buttonBus.connect(context.destination)}catch(e){announce('error');return false}}
      unlocked=true;load('click').catch(()=>{});
      if(context.state==='suspended')context.resume().then(()=>refresh()).catch(()=>announce('waiting'));
      return true;
    }
    function load(key){
      if(cache.has(key))return cache.get(key);
      const pending=(async()=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{
        const response=await fetch('./audio/nature/'+files[key],{signal:controller.signal});if(!response.ok)throw Error('audio unavailable');
        const buffer=await context.decodeAudioData(await response.arrayBuffer());decoded.add(key);return buffer;
      }finally{clearTimeout(timeout)}})();
      cache.set(key,pending);pending.catch(()=>cache.delete(key));return pending;
    }
    function dispose(voice,fade=false){
      if(fade&&context&&context.state==='running'&&!document.hidden){voice.stopped=true;if(voice.timer)clearTimeout(voice.timer);for(const node of voice.nodes||[]){node.gain.gain.cancelScheduledValues(context.currentTime);node.gain.gain.setTargetAtTime(0,context.currentTime,.12)}const tail={voice,timer:0};tail.timer=setTimeout(()=>{tails.delete(tail);dispose(voice)},600);tails.add(tail);return;}
      if(voice.timer)clearTimeout(voice.timer);voice.stopped=true;
      for(const node of voice.nodes||[]){try{node.source.stop();node.source.disconnect();if(node.filter)node.filter.disconnect();node.gain.disconnect()}catch(e){}}if(voice.nodes)voice.nodes.clear();
    }
    function stopAll(){revision++;for(const tail of tails){clearTimeout(tail.timer);dispose(tail.voice)}tails.clear();for(const voice of loops.values())dispose(voice);loops.clear();for(const node of oneshots){try{node.stop()}catch(e){}}oneshots.clear();if(master&&context)master.gain.cancelScheduledValues(context.currentTime);}
    function loop(key,amount){
      const voice={key,amount,nodes:new Set(),stopped:false,timer:0};loops.set(key,voice);announce('loading');
      load(key).then(buffer=>{
        if(voice.stopped||muted||!permitted()||document.hidden||context.state!=='running')return;
        const cross=Math.min(1.8,buffer.duration*.13),duration=buffer.duration;
        function schedule(start){
          if(voice.stopped)return;
          const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;const filter=context.createBiquadFilter();filter.type=mode==='drizzle'?'highpass':'lowpass';filter.frequency.value=({drizzle:1100,cold:1800,fog:650,snow:1100,typhoon:5200,earthquake:650})[mode]||18000;filter.Q.value=.45;source.connect(filter);filter.connect(gain);gain.connect(master);
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(amount,start+cross);gain.gain.setValueAtTime(amount,start+duration-cross);gain.gain.linearRampToValueAtTime(0,start+duration);
          const node={source,gain,filter};voice.nodes.add(node);source.onended=()=>{voice.nodes.delete(node);source.disconnect();filter.disconnect();gain.disconnect()};source.start(start);
          const next=start+duration-cross;
          voice.timer=setTimeout(()=>schedule(Math.max(context.currentTime+.02,next)),Math.max(20,(next-context.currentTime-.15)*1000));
        }
        schedule(context.currentTime+.04);announce('ready');
      }).catch(()=>{if(!voice.stopped){loops.delete(key);announce('error')}});
    }
    function desired(){
      if(mode==='none')return {};
      const weather=allowed('weather'),animal=allowed('animals')&&scene.animalsEligible!==false,seasonal=allowed('seasonal'),night=typeof scene.night==='boolean'?scene.night:new Date().getHours()<5||new Date().getHours()>=19;
      if(weather&&mode==='earthquake')return {quake:.22,rumble:.4};
      if(weather&&mode==='hail')return {hail:.57,wind:.12};
      if(weather&&mode==='typhoon')return {rain:.6,wind:.6};
      if(weather&&mode==='drizzle')return {rain:.19};
      if(weather&&['rain','heavy','storm'].includes(mode))return Object.assign({rain:mode==='rain'?.45:.68},mode==='storm'?{wind:.25}:mode==='heavy'?{wind:.16}:{});
      if(weather&&['wind','cold','fog','snow'].includes(mode))return {wind:mode==='wind'?.48:mode==='fog'?.06:mode==='snow'?.12:.19};
      const month=new Date().getMonth()+1,season=scene.season||(month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter');
      const out={};if(animal&&(!night||season!=='winter'))out[night?'crickets':'birds']=night?.16:.2;
      if(seasonal&&season==='autumn')out.leaves=.19;
      if(weather&&scene.wind>=18)out.wind=.12;
      return out;
    }
    function refresh(){
      if(!context||!unlocked){announce(muted?'muted':'waiting');return}
      if(muted||!permitted()||document.hidden){stopAll();master.gain.value=0;announce(muted||!permitted()?'muted':'paused');return}
      if(context.state!=='running'){announce('waiting');return}
      const wanted=desired();
      for(const [key,voice] of loops)if(!(key in wanted)||voice.amount!==wanted[key]){dispose(voice,true);loops.delete(key)}
      master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(volume,context.currentTime,.3);
      for(const [key,amount] of Object.entries(wanted))if(!loops.has(key))loop(key,amount);
      if(!Object.keys(wanted).length)announce('quiet');else if([...loops.values()].some(v=>v.nodes.size))announce('ready');
    }
    function toggle(){
      if(!permitted()){muted=true;stopAll();announce('muted');return}
      if(!initAudio())return;muted=!muted;
      try{localStorage.setItem('sb_sfx',muted?'off':'on')}catch(e){}
      refresh();if(typeof root.render==='function')root.render();
    }
    function oneShot(key,amount,pan=0){
      const requested=performance.now();
      if(muted||!permitted()||!context||context.state!=='running'||document.hidden)return;
      const ticket=revision;
      load(key).then(buffer=>{if(ticket!==revision||muted||!permitted()||document.hidden||key==='click'&&performance.now()-requested>200)return;const node=context.createBufferSource(),gain=context.createGain();node.buffer=buffer;gain.gain.value=amount;node.connect(gain);const panner=context.createStereoPanner?context.createStereoPanner():null;if(panner){panner.pan.value=Math.max(-.8,Math.min(.8,pan));gain.connect(panner);panner.connect(key==='click'?buttonBus:master)}else gain.connect(key==='click'?buttonBus:master);if(key==='click')node.playbackRate.value=1+(Math.random()-.5)*.035;oneshots.add(node);node.onended=()=>{oneshots.delete(node);node.disconnect();gain.disconnect();if(panner)panner.disconnect()};node.start()}).catch(()=>announce('error'));
    }
    function triggerThunder(){const now=performance.now();if(now-lastThunder<8000||!['storm','typhoon'].includes(mode))return;lastThunder=now;oneShot('thunder',.45)}
    function triggerIceImpact(pan=0){if(mode==='hail'&&decoded.has('iceImpact'))oneShot('iceImpact',.7,pan)}
    function setMode(value){if(value==='hail'&&context)load('iceImpact').catch(()=>{});if(value!==mode){revision++;lastThunder=-Infinity;for(const node of oneshots){try{node.stop()}catch(e){}}oneshots.clear()}mode=value;refresh()}
    function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));try{localStorage.setItem('nature_volume',String(volume))}catch(e){}refresh()}
    function forceSilence(){stopAll();if(master)master.gain.value=0;announce('paused')}
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAll();if(master)master.gain.value=0;if(context&&context.state==='running')context.suspend().catch(()=>{});announce('paused')}else if(context&&unlocked&&!muted&&permitted()){context.resume().then(refresh).catch(()=>announce('waiting'))}else refresh()});
    document.addEventListener('pointerdown',()=>{if(!muted&&permitted()){initAudio();refresh()}},{passive:true});
    document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&!muted){initAudio();refresh()}});
    document.addEventListener('change',e=>{if(e.target.matches('select,input[type="checkbox"],input[type="radio"]'))oneShot('click',.45)},{passive:true});
    document.addEventListener('click',e=>{if(muted||!e.target.closest('button:not(:disabled),[role="button"],summary')||e.target.closest('[data-a="sfx"]'))return;const now=performance.now();if(now-lastClick<90)return;lastClick=now;oneShot('click',.55)},{passive:true});
    return{initAudio,toggle,setMode,isMuted:()=>muted||!permitted(),triggerThunder,triggerIceImpact,refresh,setVolume,getVolume:()=>volume,getStatus:()=>status,
      setScene(value){scene=Object.assign({},scene,value);refresh()},setButtonVolume(value){buttonVolume=Math.max(0,Math.min(1,Number(value)||0));try{localStorage.setItem('nature_button_volume',String(buttonVolume))}catch(e){}if(buttonBus)buttonBus.gain.setTargetAtTime(buttonVolume,context.currentTime,.05)},getButtonVolume:()=>buttonVolume,setSeasonSnd:refresh,stopSeasonSnd:forceSilence,_forceSilence:forceSilence,
      _debug:()=>({mode,muted,unlocked,status,volume,buttonVolume,scene,context:context&&context.state,loops:[...loops.keys()],voices:[...loops.values()].reduce((n,v)=>n+v.nodes.size,oneshots.size),cache:[...cache.keys()],decoded:[...decoded],loopVoices:Object.fromEntries([...loops].map(([key,v])=>[key,v.nodes.size]))})};
  }};
})(window);
