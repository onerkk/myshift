const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
const http=require('node:http'),path=require('node:path');const base=path.resolve(__dirname,'..');const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.join(base,name);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');res.end(data)})});await new Promise(r=>server.listen(8766,'127.0.0.1',r));server.unref();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({timezoneId:'Asia/Taipei',viewport:{width:393,height:852},deviceScaleFactor:1,serviceWorkers:'block'});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!=='http://127.0.0.1:8766')return r.abort();if(u.pathname.includes('/vendor/firebase/'))return r.fulfill({contentType:'text/javascript',body:`window.firebase=window.firebase||{initializeApp(){},auth:Object.assign(()=>({setPersistence:()=>Promise.resolve(),onAuthStateChanged(cb){setTimeout(()=>cb(null),30)},getRedirectResult:()=>Promise.resolve(null)}),{Auth:{Persistence:{LOCAL:'local'}}}),firestore:Object.assign(()=>({collection:()=>({doc:()=>({get:async()=>({exists:false}),set:async()=>{throw Error('TEST WRITE BLOCKED')}}),where(){return this},get:async()=>({forEach(){},docs:[],empty:true})})}),{FieldValue:{serverTimestamp:()=>0}})};`});return r.continue();});
await page.addInitScript(()=>{localStorage.setItem('sb_c',JSON.stringify({rt:'4on2off',pos:0,unit:'示範單位'}));localStorage.setItem('_appearance','light');localStorage.setItem('_userPrefs',JSON.stringify({visualFx:true}));});
await page.goto('http://127.0.0.1:8766/',{waitUntil:'networkidle'});await page.waitForTimeout(2900);
await page.evaluate(()=>{fbAuthReady=true;S.step='cal';S.pos=0;S.rt='4on2off';S.unit='示範單位';S.instH=true;const now=new Date(),start=new Date(now);start.setMinutes(0,0,0);const hTime=Array.from({length:240},(_,i)=>{const d=new Date(start.getTime()+i*3600000);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:00`});wxData={lat:23.32,lon:120.27,temp:29,code:2,provider:'open-meteo',source:'示範資料',updatedAt:Date.now(),sourceTime:Date.now(),currentCloud:48,currentPrecip:0,place:{display:'臺南市 鹽水區'},days:Array.from({length:7},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);return {date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,code:[2,3,61,2,0,1,3][i],hi:30+i%3,lo:23+i%2}}),hTime,hTemp:hTime.map(()=>29),hPrec:hTime.map(()=>20),hRain:hTime.map(()=>0),hCloud:hTime.map(()=>48),hCode:hTime.map(()=>2),hWind:hTime.map(()=>12),hGust:hTime.map(()=>18),hHum:hTime.map(()=>72)};_syncWeatherFx();render();});await page.waitForTimeout(600);


const audit=()=>{ const rgba=s=>{const a=s.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];return [a[0],a[1],a[2],a[3]??1]},blend=(f,b)=>[0,1,2].map(i=>f[i]*f[3]+b[i]*(1-f[3])).concat(1),lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0),ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 const out=[];
 for(const el of document.querySelectorAll('#app *,#mr *, .modal-sheet *, .prefs-sheet *,body>main *')){
  if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||!el.getClientRects().length||el.closest('svg,[hidden]'))continue;
  if(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(el.textContent.trim()))continue;
  const st=getComputedStyle(el);if(st.visibility==='hidden'||st.display==='none'||el.closest('button:disabled'))continue;
  let backgrounds=[[255,255,255,1]],chain=[],e=el,opacity=1,photo=false;
  while(e){chain.unshift(e);e=e.parentElement}
  for(const n of chain){const ns=getComputedStyle(n);opacity*=Number(ns.opacity);const color=rgba(ns.backgroundColor);backgrounds=backgrounds.map(b=>blend(color,b));if(ns.backgroundImage!=='none'){
   if(ns.backgroundImage.includes('url(')){photo=true;continue}
   let depth=0,start=0,layers=[];for(let i=0;i<ns.backgroundImage.length;i++){const c=ns.backgroundImage[i];if(c==='(')depth++;if(c===')')depth--;if(c===','&&depth===0){layers.push(ns.backgroundImage.slice(start,i));start=i+1}}layers.push(ns.backgroundImage.slice(start));for(const layer of layers.reverse()){const stops=layer.match(/rgba?\([^)]+\)/g)||[];if(stops.length)backgrounds=stops.flatMap(t=>backgrounds.map(b=>blend(rgba(t),b))).slice(0,80)}
  }}
  if(photo||opacity<.9)continue;
  const color=rgba(st.color),min=Math.min(...backgrounds.map(b=>ratio(blend(color,b),b)));if(min<4.5)out.push({tag:el.tagName,cls:el.className,parent:el.parentElement.className,text:el.textContent.trim().slice(0,50),fg:st.color,ratio:+min.toFixed(2),size:st.fontSize});
 }
 return out;
};

await page.evaluate(()=>{fbUser={uid:'qa',email:'qa@example.test',displayName:'示範使用者'};payrollLeaveState.uid='qa';payrollLeaveState.loading=false;payrollLeaveState.error=false;payrollLeaveState.ownHistoryLoaded=true;});
const results=[];fs.mkdirSync('/tmp/qa337',{recursive:true});
for(const width of [320,393,768])for(const theme of ['light','dark'])for(const language of ['zh','id'])for(const view of ['today','calendar','agenda','pay','pay-calculated','weather','more','day-detail','preferences','salary-settings','help','stats','hourly']){
 await page.setViewportSize({width,height:852});
 await page.evaluate(({theme,language,view})=>{
   SAL.enabled=view==='pay-calculated';SAL.base=35000;MyShiftAppearance.set(theme);lang=language;document.documentElement.lang=language==='zh'?'zh-TW':'id';
   showUserPrefs=view==='preferences';S.modal=view==='day-detail'?{y:TY,m:TM,d:TD}:null;S.showSal=view==='salary-settings';S.showH=view==='help';S.showStats=view==='stats';S.statsYr=TY;wxDetailShow=view==='hourly';wxDetailDay=0;
   UI_CAL_VIEW=view==='agenda'?'agenda':'month';UI_TAB=view==='pay-calculated'?'pay':['today','calendar','pay','weather','more'].includes(view)?view:'calendar';render();scrollTo(0,0);
 },{theme,language,view});await page.waitForTimeout(180);
 const findings=await page.evaluate(audit);
 const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,dialogs:document.querySelectorAll('#mr .modal-sheet,#mr .wx-detail-sheet').length}));
 if(['day-detail','preferences','salary-settings','help','stats','hourly'].includes(view))assert(layout.dialogs>0,view+' dialog missing');
 if(layout.scroll>width+1)findings.push({text:'Horizontal overflow',width:layout.scroll});
 results.push({surface:'main',width,theme,language,view,findings});
 if(width===393&&language==='zh')await page.screenshot({path:`/tmp/qa337/${theme}-${view}.png`});
}
await page.goto('http://127.0.0.1:8766/admin/',{waitUntil:'networkidle'});await page.waitForTimeout(300);
await page.evaluate(()=>{SUPER_ADMINS.splice(0,SUPER_ADMINS.length,'qa@example.test');user={uid:'qa',email:'qa@example.test',displayName:'示範管理員'};authReady=true;CFG={units:['研磨股示範班','冷抽二股長單位名稱測試班'],rotations:[{id:'4on2off',name:'四休二（四早接四晚）',nameId:'Empat kerja dua libur',hours:12,cycle:['早','早','早','早','休','休','晚','晚','晚','晚','休','休']}],leaveTypes:[{id:'sick',name:'病假',nameId:'Sakit',color:'#a3613e',step:1}],admins:[{email:'manager@example.test',name:'示範管理員'}],visualFx:{enabled:true},wxAlerts:{...WX_ALERTS_DEFAULTS}};USERS=[{id:'qa-one',displayName:'示範使用者（長姓名測試）',email:'long-example-name@example.test',unit:'研磨股示範班',rt:'4on2off',pos:3}];leavesYM='2026-10';leavesLoading=false;LEAVES_DATA=[];render()});
for(const width of [320,393,768])for(const theme of ['light','dark'])for(const view of ['units','rotations','leaveTypes','leaves','admins','users','user-expanded','appearance','wxAlerts']){
 await page.setViewportSize({width,height:852});await page.evaluate(({theme,view})=>{document.documentElement.dataset.theme=theme;activeTab=view==='user-expanded'?'users':view;expandedUserId=view==='user-expanded'?'qa-one':null;render();scrollTo(0,0)},{theme,view});await page.waitForTimeout(120);
 const findings=await page.evaluate(audit);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)findings.push({text:'Horizontal overflow'});
 results.push({surface:'admin',width,theme,view,findings});if(width===393)await page.screenshot({path:`/tmp/qa337/admin-${theme}-${view}.png`});
}
await page.goto('http://127.0.0.1:8766/update/',{waitUntil:'networkidle'});
for(const width of [320,393,768])for(const theme of ['light','dark']){
 await page.setViewportSize({width,height:852});await page.evaluate(t=>{document.documentElement.dataset.theme=t;document.querySelectorAll('details').forEach(d=>d.open=true)},theme);const findings=await page.evaluate(audit);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))findings.push({text:'Horizontal overflow'});results.push({surface:'update',width,theme,view:'update',findings});if(width===393)await page.screenshot({path:`/tmp/qa337/update-${theme}.png`});
}
fs.writeFileSync('/workspace/scratch/4464d6a5912d/337-ui-audit.json',JSON.stringify({results,errors},null,2));
assert.deepEqual(errors,[]);assert.deepEqual(results.flatMap(r=>r.findings),[], 'Design contrast/overflow regression');await browser.close();console.log('UI audit',results.length,'states',results.reduce((n,r)=>n+r.findings.length,0),'findings',errors);
})().catch(e=>{console.error(e);process.exit(1)});
