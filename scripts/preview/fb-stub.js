// Offline preview stub for Firebase compat (preview/testing only; never shipped in index.html)
(function(){
  const snap={exists:false,data:()=>({}),get:()=>undefined,forEach(){},docs:[],empty:true,size:0,metadata:{fromCache:false,hasPendingWrites:false}};
  function q(){const o={doc:()=>d(),collection:()=>q(),where:()=>o,orderBy:()=>o,limit:()=>o,get:()=>Promise.resolve(snap),onSnapshot:(a,b)=>{const f=typeof a==='function'?a:b;setTimeout(()=>{try{f(snap)}catch(e){}},0);return()=>{}},add:()=>Promise.resolve({id:'x'})};return o}
  function d(){return{get:()=>Promise.resolve(snap),set:()=>Promise.resolve(),update:()=>Promise.resolve(),delete:()=>Promise.resolve(),collection:()=>q(),onSnapshot:(a,b)=>{const f=typeof a==='function'?a:b;setTimeout(()=>{try{f(snap)}catch(e){}},0);return()=>{}}}}
  const user={uid:'preview-uid',displayName:'歐那',email:'preview@example.com',photoURL:'',getIdToken:()=>Promise.resolve('t')};
  const auth={currentUser:user,setPersistence:()=>Promise.resolve(),onAuthStateChanged(cb){setTimeout(()=>cb(user),0);return()=>{}},signInWithPopup:()=>Promise.resolve({user}),signInWithRedirect:()=>Promise.resolve(),getRedirectResult:()=>Promise.resolve({user:null}),signOut:()=>Promise.resolve()};
  const fs=function(){return fsi};const fsi=Object.assign(q(),{enablePersistence:()=>Promise.resolve(),settings(){},batch:()=>({set(){},update(){},delete(){},commit:()=>Promise.resolve()}),runTransaction:f=>Promise.resolve()});
  fs.FieldValue={serverTimestamp:()=>new Date(),delete:()=>null,arrayUnion:(...a)=>a,arrayRemove:(...a)=>a,increment:n=>n};fs.Timestamp={now:()=>({toDate:()=>new Date(),toMillis:()=>Date.now()}),fromDate:d=>({toDate:()=>d,toMillis:()=>+d})};
  const au=function(){return auth};au.Auth={Persistence:{LOCAL:'local',SESSION:'session',NONE:'none'}};au.GoogleAuthProvider=function(){this.setCustomParameters=()=>{};this.addScope=()=>{}};
  window.firebase={initializeApp(){},auth:au,firestore:fs,apps:[{}]};
})();
