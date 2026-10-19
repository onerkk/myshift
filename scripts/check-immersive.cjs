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

await page.evaluate(()=>{UI_TAB='more';render()});await page.waitForTimeout(200);
assert.equal(await page.locator('.nature-previews button').count(),14);
await page.locator('.nature-controls [data-a="sfx"]').click();
await page.waitForFunction(()=>!WxSfx.isMuted()&&WxSfx._debug().context==='running');
const modes=await page.evaluate(()=>WxFx.previewModes());
const audioExpected={drizzle:'rain',rain:'rain',heavy:'rain',storm:'rain',typhoon:'wind',hail:'hail',earthquake:'quake',fog:'wind',snow:'wind',cold:'wind',wind:'wind'};
for(const mode of modes){
 await page.locator(`[data-effect="${mode}"]`).click();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>WxFx._debug().active),mode);
 if(audioExpected[mode])await page.waitForFunction(key=>WxSfx._debug().loopVoices[key]>0,audioExpected[mode],{timeout:15000});
 assert.equal(await page.locator('.nature-preview-hud').isVisible(),true);
 if(mode==='earthquake')await page.waitForFunction(()=>WxSfx._debug().loopVoices.rumble>0);
 if(mode==='earthquake')assert.match(await page.locator('.nature-preview-hud').textContent(),/非即時警報/);
 await page.locator('.nature-preview-hud button').click();await page.waitForTimeout(75);
 assert.equal(await page.locator('.nature-preview-hud').isVisible(),false);
 assert.equal(await page.evaluate(()=>WxFx._debug().preview),false);
}
let checks=0;fs.mkdirSync('/tmp/immersive-qa',{recursive:true});
if(!process.env.AUDIO_ONLY)for(const width of [320,393,430,768])for(const theme of ['light','dark'])for(const quality of ['subtle','balanced','rich']){
 await page.setViewportSize({width,height:852});await page.evaluate(({theme,quality})=>{MyShiftAppearance.set(theme);WxFx.setQuality(quality);UI_TAB='today';render()},{theme,quality});await page.waitForTimeout(100);
 for(const mode of modes){
  await page.evaluate(m=>WxFx.preview(m),mode);await page.waitForTimeout(90);
  const state=await page.evaluate(()=>({w:innerWidth,h:innerHeight,s:document.documentElement.scrollWidth,mode:WxFx._debug().active,foreground:(()=>{const e=document.querySelector('#wxfx'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {w:r.width,h:r.height,position:s.position,display:s.display,pointer:s.pointerEvents}})(),background:(()=>{const e=document.querySelector('#nature-sky'),r=e.getBoundingClientRect();return {w:r.width,h:r.height,alpha:e.getContext('2d').getImageData(1,1,1,1).data[3]}})()}));
  assert(state.s<=state.w+1,JSON.stringify({width,theme,quality,mode,overflow:state.s}));assert.equal(state.mode,mode);assert.equal(state.foreground.position,'fixed');assert.equal(state.foreground.display,'block');assert.equal(state.foreground.pointer,'none');assert.equal(state.foreground.w,state.w);assert.equal(state.foreground.h,state.h);assert.equal(state.background.w,state.w);assert.equal(state.background.h,state.h);assert.equal(state.background.alpha,255);
  if(width===393&&quality==='rich'){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`/tmp/immersive-qa/${theme}-${mode}.png`});}
  checks++;
 }
}
await page.evaluate(()=>WxFx.preview('hail'));await page.waitForTimeout(20500);assert.equal(await page.evaluate(()=>WxFx._debug().preview),false);assert.equal(await page.locator('.nature-preview-hud').isVisible(),false);assert.equal(await page.evaluate(()=>WxSfx._debug().mode),await page.evaluate(()=>WxFx.getMode()));
await page.evaluate(()=>{WxFx.preview('earthquake');setUserPref('visualFx',false)});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>WxFx._debug().preview),false);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--quake-x').trim()),'0px');await page.evaluate(()=>setUserPref('visualFx',true));
// New preview replaces the old timer; explicit stop restores live conditions and sound.
await page.evaluate(()=>{WxFx.preview('earthquake');WxFx.preview('hail');WxFx.stopPreview()});assert.equal(await page.evaluate(()=>WxFx._debug().active),await page.evaluate(()=>WxFx.getMode()));
assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--quake-x').trim()),'0px');
await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>WxFx.preview('earthquake'));await page.waitForTimeout(100);assert.equal(await page.locator('#wxfx').evaluate(e=>getComputedStyle(e).display),'none');assert.equal(await page.evaluate(()=>WxFx._debug().reduced),true);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--quake-x').trim()),'0px');
await page.evaluate(()=>{WxFx.stopPreview();WxSfx.toggle()});assert.equal(await page.evaluate(()=>WxSfx.isMuted()),true);assert.equal(await page.evaluate(()=>WxSfx._debug().voices),0);
assert.deepEqual(errors,[]);await browser.close();console.log(`PASS: 14 actual effect buttons + decoded recording playback; ${checks} viewport effects; automatic/explicit stop, rapid switching, reduced motion and mute; zero JS errors`);
})().catch(e=>{console.error(e);process.exit(1)});
