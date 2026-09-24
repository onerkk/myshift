/* Real CC0 field recordings and recorded foley only. No oscillator/noise synthesis.
   Asset provenance and edits: audio/nature/ATTRIBUTION.md. */
(function(root){
  'use strict';
  const files={rain:'rain.mp3',wind:'wind.mp3',leaves:'leaves.mp3',birds:'birds.mp3',crickets:'crickets.mp3',thunder:'thunder.mp3',click:'click.mp3'};
  root.NatureAudio={create:function(){
    let context=null,master=null,mode='none',muted=true,unlocked=false,revision=0,lastThunder=-Infinity,lastClick=-Infinity,status='muted',volume=.3;
    const cache=new Map(),loops=new Map(),oneshots=new Set();
    try{muted=localStorage.getItem('sb_sfx')!=='on';const v=Number(localStorage.getItem('nature_volume'));if(localStorage.getItem('nature_volume')!==null&&Number.isFinite(v))volume=Math.max(0,Math.min(1,v))}catch(e){}
    const permitted=()=>typeof root.isFxEnabled!=='function'||root.isFxEnabled('sound');
    const allowed=k=>typeof root.isFxEnabled!=='function'||root.isFxEnabled(k);
    function announce(value){status=value;document.querySelectorAll('.nature-audio-status').forEach(e=>{const zh=document.documentElement.lang!=='id';e.textContent=({muted:zh?'已靜音':'Dimatikan',ready:zh?'真實錄音播放中':'Rekaman asli diputar',waiting:zh?'輕觸開啟聲音':'Ketuk untuk suara',loading:zh?'載入實地錄音…':'Memuat rekaman…',error:zh?'音檔無法載入，可重新開啟聲音重試':'Audio gagal dimuat; aktifkan ulang untuk mencoba',paused:zh?'已暫停':'Dijeda',quiet:zh?'目前情境保持安靜':'Suasana saat ini hening'})[value]||value});}
    function initAudio(){
      if(!permitted())return false;
      if(!context){try{context=new (root.AudioContext||root.webkitAudioContext)();master=context.createGain();master.gain.value=0;master.connect(context.destination)}catch(e){announce('error');return false}}
      unlocked=true;
      if(context.state==='suspended')context.resume().then(()=>refresh()).catch(()=>announce('waiting'));
      return true;
    }
    function load(key){
      if(cache.has(key))return cache.get(key);
      const pending=(async()=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{
        const response=await fetch('./audio/nature/'+files[key],{signal:controller.signal});if(!response.ok)throw Error('audio unavailable');
        return await context.decodeAudioData(await response.arrayBuffer());
      }finally{clearTimeout(timeout)}})();
      cache.set(key,pending);pending.catch(()=>cache.delete(key));return pending;
    }
    function dispose(voice){
      if(voice.timer)clearTimeout(voice.timer);voice.stopped=true;
      for(const node of voice.nodes||[]){try{node.source.stop();node.source.disconnect();node.gain.disconnect()}catch(e){}}if(voice.nodes)voice.nodes.clear();
    }
    function stopAll(){revision++;for(const voice of loops.values())dispose(voice);loops.clear();for(const node of oneshots){try{node.stop()}catch(e){}}oneshots.clear();if(master&&context)master.gain.cancelScheduledValues(context.currentTime);}
    function loop(key,amount){
      const voice={key,amount,nodes:new Set(),stopped:false,timer:0};loops.set(key,voice);announce('loading');
      load(key).then(buffer=>{
        if(voice.stopped||muted||!permitted()||document.hidden||context.state!=='running')return;
        const cross=Math.min(1.8,buffer.duration*.13),duration=buffer.duration;
        function schedule(start){
          if(voice.stopped)return;
          const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.connect(gain);gain.connect(master);
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(amount,start+cross);gain.gain.setValueAtTime(amount,start+duration-cross);gain.gain.linearRampToValueAtTime(0,start+duration);
          const node={source,gain};voice.nodes.add(node);source.onended=()=>{voice.nodes.delete(node);source.disconnect();gain.disconnect()};source.start(start);
          const next=start+duration-cross;
          voice.timer=setTimeout(()=>schedule(Math.max(context.currentTime+.02,next)),Math.max(20,(next-context.currentTime-.15)*1000));
        }
        schedule(context.currentTime+.04);announce('ready');
      }).catch(()=>{if(!voice.stopped){loops.delete(key);announce('error')}});
    }
    function desired(){
      if(mode==='none')return {};
      const weather=true,animal=true,seasonal=true,night=new Date().getHours()<6||new Date().getHours()>=19;
      if(weather&&['rain','heavy','storm','typhoon'].includes(mode))return Object.assign({rain:mode==='rain'?.55:.85},['storm','typhoon'].includes(mode)?{wind:.24}:{});
      if(weather&&['wind','cold','fog','snow'].includes(mode))return {wind:mode==='wind'?.55:.18};
      const out={};if(animal)out[night?'crickets':'birds']=night?.2:.26;
      const month=new Date().getMonth()+1;if(seasonal&&month>=9&&month<=11)out.leaves=.22;
      return out;
    }
    function refresh(){
      if(!context||!unlocked){announce(muted?'muted':'waiting');return}
      if(muted||!permitted()||document.hidden){stopAll();master.gain.value=0;announce(muted||!permitted()?'muted':'paused');return}
      if(context.state!=='running'){announce('waiting');return}
      const wanted=desired();
      for(const [key,voice] of loops)if(!(key in wanted)||voice.amount!==wanted[key]){dispose(voice);loops.delete(key)}
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
    function oneShot(key,amount){
      if(muted||!permitted()||!context||context.state!=='running'||document.hidden)return;
      const ticket=revision;
      load(key).then(buffer=>{if(ticket!==revision||muted||!permitted()||document.hidden)return;const node=context.createBufferSource(),gain=context.createGain();node.buffer=buffer;gain.gain.value=amount;node.connect(gain);gain.connect(master);oneshots.add(node);node.onended=()=>{oneshots.delete(node);node.disconnect();gain.disconnect()};node.start()}).catch(()=>announce('error'));
    }
    function triggerThunder(){const now=performance.now();if(now-lastThunder<25000||!['storm','typhoon'].includes(mode))return;lastThunder=now;oneShot('thunder',.45)}
    function setMode(value){mode=value;refresh()}
    function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));try{localStorage.setItem('nature_volume',String(volume))}catch(e){}refresh()}
    function forceSilence(){stopAll();if(master)master.gain.value=0;announce('paused')}
    document.addEventListener('visibilitychange',refresh);
    document.addEventListener('pointerdown',()=>{if(!muted&&permitted()){initAudio();refresh()}},{passive:true});
    document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&!muted){initAudio();refresh()}});
    document.addEventListener('click',e=>{if(muted||!e.target.closest('button,[role="button"]')||e.target.closest('[data-a="sfx"]'))return;const now=performance.now();if(now-lastClick<90)return;lastClick=now;oneShot('click',.35)},{passive:true});
    return{initAudio,toggle,setMode,isMuted:()=>muted||!permitted(),triggerThunder,refresh,setVolume,getVolume:()=>volume,getStatus:()=>status,
      setSeasonSnd:refresh,stopSeasonSnd:forceSilence,_forceSilence:forceSilence,
      _debug:()=>({mode,muted,unlocked,status,volume,context:context&&context.state,loops:[...loops.keys()],voices:[...loops.values()].reduce((n,v)=>n+v.nodes.size,oneshots.size),cache:[...cache.keys()]})};
  }};
})(window);
