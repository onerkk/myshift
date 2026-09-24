/* One live source for front-end configuration, including signed-out onboarding.
   Read-only: this controller never creates or updates a Firestore document. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AppConfigSync=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function create(options){
    let unsubscribe=null,generation=0,active=false,pending=null,resolveFirst=null,timer=null;
    let data=null,fingerprint=null,state={phase:'idle',hasData:false,errorCode:''};
    const delay=options.timeoutMs===undefined?10000:options.timeoutMs;
    function publish(phase,errorCode=''){
      state={phase,hasData:data!==null,errorCode};
      options.onState({...state});
    }
    function settle(ok){
      if(timer!==null){clearTimeout(timer);timer=null;}
      if(resolveFirst){const finish=resolveFirst;resolveFirst=null;finish(ok);}
    }
    function stop(){
      generation++;active=false;
      if(unsubscribe){unsubscribe();unsubscribe=null;}
      settle(false);
    }
    function fail(error,revision){
      if(revision!==generation)return;
      active=false;
      if(unsubscribe){unsubscribe();unsubscribe=null;}
      const code=String(error&&error.code||'unavailable').replace(/^firestore\//,'');
      if(['permission-denied','unauthenticated'].includes(code)){
        data=null;fingerprint=null;options.onData({});
      }
      publish('error',code);settle(false);
    }
    function start(force=false){
      if(active&&!force)return pending||Promise.resolve(data!==null);
      stop();active=true;
      const revision=generation;
      const first=new Promise(resolve=>{resolveFirst=resolve;});pending=first;
      publish(data?'cached':'loading');
      timer=setTimeout(()=>{
        if(revision!==generation)return;
        publish(data?'cached':'error','unavailable');settle(false);
        // A slow/offline connection may recover: keep this listener alive.
      },delay);
      try{
        const detach=options.ref.onSnapshot({includeMetadataChanges:true},snapshot=>{
          if(revision!==generation||!active)return;
          const cached=!!(snapshot.metadata&&snapshot.metadata.fromCache);
          const uncommitted=!!(snapshot.metadata&&snapshot.metadata.hasPendingWrites);
          if(!snapshot.exists){
            if(cached){publish(data?'cached':'loading');return;}
            data=null;fingerprint=null;options.onData({});publish('missing');settle(true);return;
          }
          try{
            const next=snapshot.data()||{},key=JSON.stringify(next);
            if(key!==fingerprint){options.onData(next);fingerprint=key;}
            data=next;publish(cached||uncommitted?'cached':'ready');settle(true);
          }catch(error){fail({code:'invalid-data'},revision);}
        },error=>fail(error,revision));
        if(revision===generation&&active)unsubscribe=detach;
        else if(typeof detach==='function')detach();
      }catch(error){fail(error,revision);}
      return first;
    }
    return{start,stop,getState:()=>({...state}),isActive:()=>active};
  }
  return{create};
});
