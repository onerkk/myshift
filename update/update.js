/* MyShift update center: GitHub Git Data API, atomic commit, no token persistence. */
'use strict';
const $=id=>document.getElementById(id);
const siteHome=new URL(document.documentElement?.dataset.siteRoot||'../',location.href);
let plan=null,busy=false,deployed=null,inspection=0;
const MAX_FILE=15*1024*1024,MAX_TOTAL=150*1024*1024;
function status(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';}
function target(){
 const owner=$('owner').value.trim(),repo=$('repo').value.trim(),branch=$('branch').value.trim();
 if(!/^[\w-]+$/.test(owner)||! /^[\w.-]+$/.test(repo))throw Error('請確認 GitHub 帳號及儲存庫名稱。');
 if(!$('token').value.trim())throw Error('請先填入 GitHub 更新授權碼。');
 return {owner,repo,branch};
}
function lock(value){busy=value;for(const id of ['connect','inspect','publish','token','zip','owner','repo','branch','clear','retryDeploy'])$(id).disabled=value;}
function invalidate(){inspection++;plan=null;$('review').hidden=true;$('files').replaceChildren();}
async function api(t,path,options={},timeoutMs=45000){
 const res=await fetch(`https://api.github.com/repos/${encodeURIComponent(t.owner)}/${encodeURIComponent(t.repo)}${path}`,{...options,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+$('token').value.trim(),'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})},cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
 if(!res.ok){let msg='';try{msg=(await res.json()).message||''}catch{}
 throw Error(`GitHub ${res.status}：${res.status===401?'授權碼無效或過期':res.status===403?'權限不足、分支受保護或 API 額度限制':res.status===404?'找不到儲存庫、分支，或授權碼沒有存取權':res.status===409||res.status===422?'版本衝突，請重新檢查更新包':msg||'連線失敗'}`);}
 return res.status===204?null:res.json();
}
const post=(t,path,data)=>api(t,path,{method:'POST',body:JSON.stringify(data)});
async function resolve(t){const repo=await api(t,'');return {...t,branch:t.branch||repo.default_branch};}
async function head(t){return (await api(t,'/git/ref/heads/'+encodeURIComponent(t.branch))).object.sha;}
async function blobHash(bytes){const prefix=new TextEncoder().encode('blob '+bytes.length+'\0'),all=new Uint8Array(prefix.length+bytes.length);all.set(prefix);all.set(bytes,prefix.length);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',all)),x=>x.toString(16).padStart(2,'0')).join('');}
function safePath(path){
 if(!path||path.includes('\\')||path.startsWith('/')||/[\x00-\x1f]/.test(path)||path.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('更新包含有不安全路徑。');
 if(path.split('/').some(x=>x.startsWith('.'))||/^(node_modules|private-import|tests|verification)(\/|$)/.test(path)||/\.(pem|key|p12|zip)$/i.test(path)||/^(DELETE_FILES\.txt|SHA256SUMS\.txt)$/.test(path))return false;
 return true;
}
async function readZip(file){
 if(!file||!file.name.toLowerCase().endsWith('.zip'))throw Error('請選擇 ZIP 更新包。');
 if(file.size>50*1024*1024)throw Error('ZIP 超過 50 MB，請使用變動檔案包。');
 const zip=await JSZip.loadAsync(file,{checkCRC32:false,createFolders:false});
 let entries=Object.values(zip.files).filter(x=>!x.dir&&!x.name.startsWith('__MACOSX/'));
 if(entries.length>2500)throw Error('更新包檔案太多，請使用變動檔案包。');
 // JSZip sanitizes ../; reject the original path rather than trusting the sanitized name.
 for(const e of entries)if(e.unsafeOriginalName&&e.unsafeOriginalName!==e.name)throw Error('更新包含有路徑穿越項目，已拒絕。');
 const names=entries.map(e=>e.name),first=names[0]?.split('/')[0];
 const prefix=first&&names.every(x=>x.startsWith(first+'/'))&&(names.some(x=>x===first+'/index.html')||/^myshift(?:[-_].*)?$/i.test(first))?first+'/':'';
 const files=[];let total=0,skipped=0;
 for(const e of entries){const path=e.name.slice(prefix.length);if(!safePath(path)){skipped++;continue;}
 const size=e._data?.uncompressedSize;
 if(!Number.isFinite(size)||size>MAX_FILE||total+size>MAX_TOTAL)throw Error('更新包解壓縮體積超出限制。');
 total+=size;const bytes=await e.async('uint8array');if(bytes.length!==size)throw Error('ZIP 檔案大小驗證失敗。');
 files.push({path,bytes,sha:await blobHash(bytes)});}
 if(!files.length)throw Error('更新包內沒有可更新的網站檔案。');
 return {files,skipped};
}
function step(id,state){$(id).className=state;}
async function inspect(){
 if(busy)return;invalidate();const seq=inspection;lock(true);$('links').replaceChildren();$('retryDeploy').hidden=true;deployed=null;
 for(const id of ['stepCheck','stepCommit','stepDeploy'])step(id,'');step('stepCheck','active');status('讀取 ZIP 並比對 GitHub 目前版本…');
 try{
 const t=await resolve(target()),pack=await readZip($('zip').files[0]),base=await head(t),commit=await api(t,'/git/commits/'+base),tree=await api(t,'/git/trees/'+commit.tree.sha+'?recursive=1');
 if(tree.truncated)throw Error('儲存庫檔案清單過大，無法安全比對。');
 const old=new Map(tree.tree.map(x=>[x.path,x])),changes=pack.files.filter(f=>old.get(f.path)?.sha!==f.sha);
 for(const f of changes){const previous=old.get(f.path);if(previous&&(previous.type!=='blob'||previous.mode==='120000'))throw Error('更新包路徑與遠端目錄或符號連結衝突：'+f.path);f.mode=previous?.mode||'100644';}
 if(seq!==inspection)return;
 plan={t,base,tree:commit.tree.sha,changes};$('reviewTitle').textContent=`${changes.length} 個檔案需要更新`;
 $('files').replaceChildren(...changes.map(f=>{const li=document.createElement('li');li.textContent=(old.has(f.path)?'修改 ':'新增 ')+f.path;return li;}));
 $('review').hidden=false;$('publish').hidden=!changes.length;step('stepCheck','done');status(changes.length?`檢查完成。保留 ZIP 以外的原有檔案；略過 ${pack.skipped} 個系統／私人資料或說明清單檔案。\n目標：${t.owner}/${t.repo} · ${t.branch}`:'網站已是這份更新包的版本，無需重複提交。');
 }catch(e){status(e.message,true);step('stepCheck','');}finally{lock(false);}
}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
function link(label,url){const u=new URL(url);if(u.protocol!=='https:')return;const a=document.createElement('a');a.textContent=label;a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';$('links').append(a);}
async function publish(){
 if(busy||!plan?.changes.length)return;lock(true);const p=plan;let submitted=false;
 step('stepCommit','active');status('正在上傳變動檔案，請保持頁面開啟…');
 try{
 if(await head(p.t)!==p.base)throw Error('檢查後網站已有其他更新。請重新檢查更新包，避免覆蓋新版本。');
 const tree=[];for(let i=0;i<p.changes.length;i++){const f=p.changes[i];status(`上傳檔案 ${i+1} / ${p.changes.length}：${f.path}`);const blob=await post(p.t,'/git/blobs',{content:base64(f.bytes),encoding:'base64'});tree.push({path:f.path,mode:f.mode,type:'blob',sha:blob.sha});}
 const created=await post(p.t,'/git/trees',{base_tree:p.tree,tree});
 const commit=await post(p.t,'/git/commits',{message:'手機更新班表 '+new Date().toISOString(),tree:created.sha,parents:[p.base]});
 await api(p.t,'/git/refs/heads/'+encodeURIComponent(p.t.branch),{method:'PATCH',body:JSON.stringify({sha:commit.sha,force:false})});
 submitted=true;deployed={t:p.t,sha:commit.sha};rememberDeployment();plan=null;$('publish').hidden=true;step('stepCommit','done');link('查看這次更新紀錄',`https://github.com/${p.t.owner}/${p.t.repo}/commit/${commit.sha}`);
 await checkDeployment();
 }catch(e){status((submitted?'更新已提交；部署確認失敗：':'尚未完成網站更新：')+e.message,true);if(!submitted){invalidate();step('stepCommit','');}else $('retryDeploy').hidden=false;}finally{lock(false);}
}
function transientDeploymentError(e){return /timed out|timeout|network|fetch|abort|signal|GitHub 5\d\d|GitHub 429/i.test(e?.message||'');}
function rememberDeployment(){try{localStorage.setItem('myshift_deploy_receipt',JSON.stringify(deployed))}catch(e){}}
function deploymentDone(message){step('stepDeploy','done');status(message);$('retryDeploy').hidden=true;link('開啟更新後的班表',new URL('?updated='+deployed.sha,siteHome).href);}
async function checkDeployment(){
 if(!deployed)return;const {t,sha}=deployed;step('stepDeploy','active');$('retryDeploy').hidden=true;
 status('更新已提交，等待 GitHub Pages 部署。請保持頁面開啟；查詢逾時會自動重試。');
 const pause=()=>new Promise(r=>setTimeout(r,5000)),started=Date.now();let lastIssue='';
 for(let i=0;i<18&&Date.now()-started<120000;i++){
  // Actions is queried first: Pages builds may be slow or unavailable on Actions deployments.
  try{
   const runs=await api(t,'/actions/runs?head_sha='+sha+'&per_page=20',{},8000),pages=(runs.workflow_runs||[]).filter(r=>/pages/i.test(r.name||r.path||''));
   if(pages.some(r=>r.status==='completed'&&r.conclusion==='success')){deploymentDone('GitHub Pages 已部署成功。請關閉再重新開啟班表，以載入新版。');return;}
   const failed=pages.find(r=>r.status==='completed'&&!['success','cancelled','skipped','neutral'].includes(r.conclusion));
   if(failed){link('查看部署錯誤',failed.html_url);throw Error('Pages 工作流程回報未成功：'+failed.conclusion);}
  }catch(e){if(transientDeploymentError(e)||/GitHub (403|404)/.test(e.message))lastIssue=e.message;else throw e;}
  try{
   const builds=await api(t,'/pages/builds?per_page=10',{},8000),build=Array.isArray(builds)?builds.find(x=>x.commit===sha):null;
   if(build?.status==='built'){deploymentDone('GitHub Pages 已部署成功。請關閉再重新開啟班表，以載入新版。');return;}
   if(build?.status==='errored')throw Error('GitHub Pages 明確回報部署失敗，請查看部署紀錄。');
  }catch(e){if(transientDeploymentError(e)||/GitHub (403|404)/.test(e.message))lastIssue=e.message;else throw e;}
  status(lastIssue?'更新已提交；部署查詢暫時未回應，正在自動重試。\n不必重新上傳 ZIP。':'更新已提交，GitHub Pages 正在排隊或部署。\n完成後會自動顯示結果。');await pause();
 }
 step('stepDeploy','');status('更新已提交，尚未確認部署結果。查詢可能受網路或權限影響，這不代表更新失敗。\n可按「重新檢查部署」，不必重新上傳 ZIP。');$('retryDeploy').hidden=false;link('查看 GitHub Actions',`https://github.com/${t.owner}/${t.repo}/actions`);
}
try{
 const saved=JSON.parse(localStorage.getItem('myshift_deploy_receipt')||'null');
 if(saved?.t&&/^[a-f0-9]{40}$/.test(saved.sha)&&/^[\w-]+$/.test(saved.t.owner)&&/^[\w.-]+$/.test(saved.t.repo)){
  deployed=saved;step('stepCommit','done');status('已保留上次更新紀錄。填入授權碼後，可重新檢查部署，不必再次上傳 ZIP。');$('retryDeploy').hidden=false;link('查看上次更新紀錄',`https://github.com/${saved.t.owner}/${saved.t.repo}/commit/${saved.sha}`);
 }
}catch(e){}

$('inspect').addEventListener('click',inspect);$('publish').addEventListener('click',publish);
$('clear').addEventListener('click',()=>{$('token').value='';invalidate();status('已清除授權碼。');});
for(const id of ['token','owner','repo','branch','zip'])$(id).addEventListener('input',invalidate);
$('connect').addEventListener('click',async()=>{if(busy)return;lock(true);try{const t=await resolve(target());await head(t);status(`連線成功：${t.owner}/${t.repo} · ${t.branch}。實際寫入權限在提交時由 GitHub 驗證。`);}catch(e){status(e.message,true);}finally{lock(false);}});
$('retryDeploy').addEventListener('click',async()=>{if(busy)return;lock(true);try{await checkDeployment();}catch(e){status('更新已提交；'+e.message,true);$('retryDeploy').hidden=false;}finally{lock(false);}});
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});

// Appearance is local only; authorization tokens never enter storage.
const appearanceButton=document.getElementById('appearance');
if(appearanceButton)appearanceButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;try{localStorage.setItem('_appearance',next)}catch(e){}});
