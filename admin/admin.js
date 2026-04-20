// ═══════════════════════════════════════════════════════════════
// 我的班表 - 管理後台 v1
// ═══════════════════════════════════════════════════════════════

const fbConfig={apiKey:"AIzaSyBKgqmsDIZgqf8nxWTDdTqVS01H0TIOCj4",authDomain:"myshift-a67f1.firebaseapp.com",projectId:"myshift-a67f1",storageBucket:"myshift-a67f1.firebasestorage.app",messagingSenderId:"779297515930",appId:"1:779297515930:web:7f5ba8992c5d5081a9f223"};
firebase.initializeApp(fbConfig);
const fbAuth=firebase.auth(),fbDb=firebase.firestore();
fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

const SUPER_ADMINS=["onerkk@gmail.com","asus0814999@gmail.com"];

let user=null;
let authReady=false;
let activeTab="units";
let CFG={units:[],rotations:[],leaveTypes:[],admins:[],visualFx:{enabled:true}};
let USERS=[];
let expandedUserId=null;
let userSearch="";

// ═══ utility ═══
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function toast(msg,type){const t=$("toast");t.textContent=msg;t.className="toast show "+(type||"");setTimeout(()=>{t.className="toast"},2200)}
function isSuper(){return user&&SUPER_ADMINS.includes(user.email)}
function isAdmin(){if(!user)return false;if(isSuper())return true;return CFG.admins.some(a=>a.email===user.email)}

// ═══ auth ═══
fbAuth.onAuthStateChanged(u=>{
  user=u;authReady=true;
  if(u){
    // 立刻寫入 users 集合，讓 displayName 可見
    fbDb.collection("users").doc(u.uid).set({
      displayName:u.displayName||"",email:u.email||"",photoURL:u.photoURL||"",
      lastLogin:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true}).catch(()=>{});
    loadAll();
  } else {
    render();
  }
});
fbAuth.getRedirectResult().catch(()=>{});

function login(){
  const p=new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(p).catch(e=>{
    if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'){
      fbAuth.signInWithRedirect(p);
    } else {
      toast("登入失敗: "+e.message,"err");
    }
  });
}
function logout(){fbAuth.signOut()}

// ═══ load all data ═══
async function loadAll(){
  render();
  try{
    const doc=await fbDb.collection("config").doc("app").get();
    if(doc.exists){
      const d=doc.data();
      CFG.units=d.units||[];
      CFG.rotations=d.rotations||[];
      CFG.leaveTypes=d.leaveTypes||[];
      CFG.admins=d.admins||[];
      CFG.visualFx=d.visualFx&&typeof d.visualFx.enabled==='boolean'?d.visualFx:{enabled:true};
    }
    if(isAdmin()){
      const snap=await fbDb.collection("users").get();
      USERS=[];
      snap.forEach(s=>USERS.push({id:s.id,...s.data()}));
      USERS.sort((a,b)=>{
        const ta=a.lastLogin&&a.lastLogin.seconds||0;
        const tb=b.lastLogin&&b.lastLogin.seconds||0;
        return tb-ta;
      });
    }
  }catch(e){
    toast("載入失敗: "+e.message,"err");
  }
  render();
}

async function saveCfg(silent){
  try{
    await fbDb.collection("config").doc("app").set({
      units:CFG.units,rotations:CFG.rotations,leaveTypes:CFG.leaveTypes,admins:CFG.admins,
      visualFx:CFG.visualFx||{enabled:true},
      ts:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    if(!silent)toast("已儲存","ok");
  }catch(e){
    toast("儲存失敗: "+e.message,"err");
  }
}

// ═══ render root ═══
function render(){
  const app=$("app");
  if(!authReady){app.innerHTML='<div class="loading">載入中...</div>';return}
  if(!user){app.innerHTML=loginHtml();bind();return}
  if(!isAdmin()){
    app.innerHTML=`<div class="login-box"><h1>⛔ 權限不足</h1><p>您的帳號（${esc(user.email)}）不是管理員</p><button class="btn gray" onclick="logout()">登出</button></div>`;
    return;
  }
  app.innerHTML=headerHtml()+tabsHtml()+tabBodyHtml()+`<div class="footer">MyShift Admin v2</div>`;
  bind();
}

function loginHtml(){
  return `<div class="login-box">
    <h1>⚙️ 班表管理後台</h1>
    <p>請使用授權的 Google 帳號登入</p>
    <button class="btn" onclick="login()">以 Google 登入</button>
  </div>`;
}

function headerHtml(){
  const roleBadge=isSuper()?'<span class="badge su">超級管理員</span>':'<span class="badge ad">管理員</span>';
  return `<div class="hd">
    <div style="flex:1;min-width:0">
      <h1>⚙️ 班表管理後台 ${roleBadge}</h1>
      <div class="u">${esc(user.displayName||user.email)}</div>
    </div>
    <button class="btn gray sm" onclick="logout()">登出</button>
  </div>`;
}

function tabsHtml(){
  const tabs=[
    {id:"units",label:"🏭 單位"},
    {id:"rotations",label:"🔄 輪班規則"},
    {id:"leaveTypes",label:"📋 假別"},
    {id:"admins",label:"👑 管理員"},
    {id:"users",label:"👥 使用者"},
    {id:"appearance",label:"🎨 外觀"}
  ];
  return `<div class="tabs">${tabs.map(t=>`<button class="tab ${activeTab===t.id?'active':''}" onclick="setTab('${t.id}')">${t.label}</button>`).join("")}</div>`;
}

function setTab(t){activeTab=t;expandedUserId=null;userSearch="";render()}

function tabBodyHtml(){
  switch(activeTab){
    case"units":return unitsTabHtml();
    case"rotations":return rotationsTabHtml();
    case"leaveTypes":return leaveTypesTabHtml();
    case"admins":return adminsTabHtml();
    case"users":return usersTabHtml();
    case"appearance":return appearanceTabHtml();
  }
  return"";
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: 單位管理
// ═══════════════════════════════════════════════════════════════
function unitsTabHtml(){
  const list=CFG.units.length
    ?CFG.units.map((u,i)=>`<div class="row">
      <div class="info"><div class="name">${esc(u)}</div></div>
      <button class="btn red sm" onclick="delUnit(${i})">✕</button>
    </div>`).join("")
    :'<div class="empty">尚無單位</div>';
  return `<div class="card">
    <h2>🏭 單位管理（共 ${CFG.units.length} 個）</h2>
    ${list}
    <div class="add-box">
      <label>新增單位</label>
      <div style="display:flex;gap:6px">
        <input id="newUnit" class="inp" placeholder="例：冷抽二股A板">
        <button class="btn green" onclick="addUnit()">新增</button>
      </div>
    </div>
  </div>`;
}
async function addUnit(){
  const el=$("newUnit");
  const v=(el.value||"").trim();
  if(!v)return toast("請輸入單位名稱","err");
  if(CFG.units.includes(v))return toast("此單位已存在","err");
  CFG.units.push(v);
  await saveCfg();
  el.value="";
  render();
}
async function delUnit(i){
  if(!confirm("確定刪除「"+CFG.units[i]+"」？"))return;
  CFG.units.splice(i,1);
  await saveCfg();
  render();
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: 輪班規則
// ═══════════════════════════════════════════════════════════════
const SHIFT_CHAR={'早':'e','中':'m','晚':'n','休':'o'};
function cycleChipsHtml(c){
  return `<div class="cycle-chips">${c.map(s=>`<span class="chip ${SHIFT_CHAR[s]||''}">${s}</span>`).join("")}</div>`;
}
function rotationsTabHtml(){
  const list=CFG.rotations.length
    ?CFG.rotations.map((r,i)=>`<div class="row" style="flex-direction:column;align-items:flex-start">
      <div style="display:flex;width:100%;gap:8px;align-items:center">
        <div class="info">
          <div class="name">${esc(r.name)} <span class="badge">${r.hours||12}h</span></div>
          <div class="sub">ID: ${esc(r.id)} · 印尼文: ${esc(r.nameId||"")} · 週期 ${r.cycle.length} 天</div>
        </div>
        <button class="btn red sm" onclick="delRot(${i})">✕</button>
      </div>
      ${cycleChipsHtml(r.cycle)}
    </div>`).join("")
    :'<div class="empty">尚無輪班規則</div>';
  return `<div class="card">
    <h2>🔄 輪班規則（共 ${CFG.rotations.length} 個）</h2>
    ${list}
    <div class="add-box">
      <label>新增輪班規則</label>
      <div class="grid2" style="margin-bottom:6px">
        <input id="newRotId" class="inp" placeholder="ID(英)：4on2off">
        <input id="newRotHours" class="inp" placeholder="時數" type="number" value="12">
      </div>
      <div class="grid2" style="margin-bottom:6px">
        <input id="newRotName" class="inp" placeholder="中文名：做4休2">
        <input id="newRotNameId" class="inp" placeholder="印尼文：4K 2L">
      </div>
      <label style="margin-top:4px">週期（用逗號分隔，僅限 早 / 中 / 晚 / 休）</label>
      <textarea id="newRotCycle" class="inp" placeholder="早,早,早,早,休,休,晚,晚,晚,晚,休,休"></textarea>
      <button class="btn green" onclick="addRot()" style="margin-top:6px;width:100%">新增規則</button>
    </div>
  </div>`;
}
async function addRot(){
  const id=($("newRotId").value||"").trim();
  const name=($("newRotName").value||"").trim();
  const nameId=($("newRotNameId").value||"").trim()||name;
  const hours=parseInt($("newRotHours").value)||12;
  const cycleRaw=($("newRotCycle").value||"").trim();
  if(!id||!name||!cycleRaw)return toast("ID、中文名、週期必填","err");
  if(CFG.rotations.some(r=>r.id===id))return toast("ID 已存在","err");
  const cycle=cycleRaw.split(/[\s,，、]+/).filter(x=>x).map(x=>x.trim());
  const bad=cycle.filter(s=>!["早","中","晚","休"].includes(s));
  if(bad.length)return toast("不支援的班別: "+bad.join(","),"err");
  if(!cycle.length)return toast("週期不可為空","err");
  CFG.rotations.push({id,name,nameId,hours,cycle});
  await saveCfg();
  ["newRotId","newRotName","newRotNameId","newRotCycle"].forEach(k=>$(k).value="");
  $("newRotHours").value="12";
  render();
}
async function delRot(i){
  if(!confirm("確定刪除「"+CFG.rotations[i].name+"」？"))return;
  CFG.rotations.splice(i,1);
  await saveCfg();
  render();
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: 假別
// ═══════════════════════════════════════════════════════════════
function leaveTypesTabHtml(){
  const list=CFG.leaveTypes.length
    ?CFG.leaveTypes.map((lt,i)=>`<div class="row">
      <div class="color-dot" style="background:${esc(lt.color||'#888')}"></div>
      <div class="info">
        <div class="name">${esc(lt.name)} <span class="badge">${lt.step||1}h</span></div>
        <div class="sub">ID: ${esc(lt.id)} · ${esc(lt.nameId||"")} · 加班扣除: ${lt.otDeduct==null?'(無)':lt.otDeduct+'h'}</div>
      </div>
      <button class="btn red sm" onclick="delLT(${i})">✕</button>
    </div>`).join("")
    :'<div class="empty">尚無假別</div>';
  return `<div class="card">
    <h2>📋 假別管理（共 ${CFG.leaveTypes.length} 個）</h2>
    ${list}
    <div class="add-box">
      <label>新增假別</label>
      <div class="grid2" style="margin-bottom:6px">
        <input id="newLTName" class="inp" placeholder="中文名：特休">
        <input id="newLTNameId" class="inp" placeholder="印尼文：Cuti Tahunan">
      </div>
      <div class="grid3" style="margin-bottom:6px">
        <select id="newLTStep" class="inp">
          <option value="0.5">0.5h</option>
          <option value="1" selected>1h</option>
        </select>
        <input id="newLTOT" class="inp" placeholder="加班扣" type="number" value="8">
        <input id="newLTColor" class="inp" type="color" value="#607d8b" style="padding:2px">
      </div>
      <button class="btn green" onclick="addLT()" style="width:100%">新增假別</button>
    </div>
    <div style="color:#666;font-size:10px;margin-top:10px;line-height:1.5">
      說明：otDeduct 代表每 8 小時該假別會扣除多少加班時數。<br>
      常見值：特休=4、病假=8、事假=12、喪/婚/產假=4、公假=0。
    </div>
  </div>`;
}
async function addLT(){
  const name=($("newLTName").value||"").trim();
  const nameId=($("newLTNameId").value||"").trim()||name;
  const step=parseFloat($("newLTStep").value)||1;
  const otStr=($("newLTOT").value||"").trim();
  const otDeduct=otStr===""?null:parseFloat(otStr);
  const color=$("newLTColor").value||"#607d8b";
  if(!name)return toast("中文名必填","err");
  // 保留中文與英數，其他符號（含 /、空白、.）轉成 _，再去頭尾底線
  const id=(name.toLowerCase().replace(/[\s/\\.#$\[\]]+/g,"_").replace(/^_+|_+$/g,""))||("lt_"+Date.now());
  if(CFG.leaveTypes.some(lt=>lt.id===id))return toast("ID 已存在","err");
  const o={id,name,nameId,step,color};
  if(otDeduct!=null)o.otDeduct=otDeduct;
  CFG.leaveTypes.push(o);
  await saveCfg();
  ["newLTName","newLTNameId"].forEach(k=>$(k).value="");
  $("newLTOT").value="8";
  render();
}
async function delLT(i){
  if(!confirm("確定刪除「"+CFG.leaveTypes[i].name+"」？"))return;
  CFG.leaveTypes.splice(i,1);
  await saveCfg();
  render();
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: 管理員
// ═══════════════════════════════════════════════════════════════
function adminsTabHtml(){
  const superList=SUPER_ADMINS.map(e=>`<div class="row">
    <div class="info"><div class="name">${esc(e)} <span class="badge su">超級管理員</span></div><div class="sub">寫死於程式碼，無法在此刪除</div></div>
  </div>`).join("");
  const normalList=CFG.admins.length
    ?CFG.admins.map((a,i)=>`<div class="row">
      <div class="info">
        <div class="name">${esc(a.email)} <span class="badge ad">管理員</span></div>
        ${a.name?`<div class="sub">${esc(a.name)}</div>`:""}
      </div>
      <button class="btn red sm" onclick="delAdmin(${i})">✕</button>
    </div>`).join("")
    :'<div class="empty">尚無額外管理員</div>';
  return `<div class="card">
    <h2>👑 管理員權限（共 ${SUPER_ADMINS.length+CFG.admins.length} 位）</h2>
    ${superList}${normalList}
    ${isSuper()?`<div class="add-box">
      <label>新增管理員</label>
      <div class="grid2" style="margin-bottom:6px">
        <input id="newAdEmail" class="inp" placeholder="Email" type="email">
        <input id="newAdName" class="inp" placeholder="姓名（選填）">
      </div>
      <button class="btn green" onclick="addAdmin()" style="width:100%">新增</button>
    </div>`:'<div style="color:#888;font-size:11px;margin-top:10px">只有超級管理員可新增/刪除管理員</div>'}
  </div>`;
}
async function addAdmin(){
  if(!isSuper())return toast("權限不足","err");
  const email=($("newAdEmail").value||"").trim().toLowerCase();
  const name=($("newAdName").value||"").trim();
  if(!email||!email.includes("@"))return toast("請輸入有效 email","err");
  if(SUPER_ADMINS.includes(email))return toast("已是超級管理員","err");
  if(CFG.admins.some(a=>a.email===email))return toast("已存在","err");
  CFG.admins.push({email,name});
  await saveCfg();
  ["newAdEmail","newAdName"].forEach(k=>$(k).value="");
  render();
}
async function delAdmin(i){
  if(!isSuper())return toast("權限不足","err");
  if(!confirm("確定移除「"+CFG.admins[i].email+"」的管理員權限？"))return;
  CFG.admins.splice(i,1);
  await saveCfg();
  render();
}

// ═══════════════════════════════════════════════════════════════
// TAB 6: 外觀 / 特效
// ═══════════════════════════════════════════════════════════════
function appearanceTabHtml(){
  const on=CFG.visualFx&&CFG.visualFx.enabled!==false;
  return `<div class="card">
    <h2>🎨 天氣動畫與音效</h2>
    <div style="color:#aaa;font-size:12px;line-height:1.6;margin-bottom:14px">
      一鍵控制全部使用者的前景特效，包含：<br>
      • 天氣動畫（雨、雪、雲、太陽、星星、螢火蟲等）<br>
      • 生態動畫（青蛙、蜻蜓、蝴蝶、荷葉、花瓣等）<br>
      • 環境音效（雨聲、風聲、青蛙、蟲鳴、鳥叫）<br>
      關閉後，所有使用者下次開 app（或重新同步雲端設定後）即停用，可省電與減輕效能負擔。
    </div>
    <div class="row" style="padding:12px">
      <div class="info">
        <div class="name">啟用動畫與音效</div>
        <div class="sub">目前狀態：<span style="color:${on?'#27ae60':'#e74c3c'};font-weight:700">${on?'✅ 已啟用':'⛔ 已停用'}</span></div>
      </div>
      <button class="btn ${on?'red':'green'}" onclick="toggleVisualFx()">
        ${on?'一鍵停用':'一鍵啟用'}
      </button>
    </div>
  </div>`;
}
async function toggleVisualFx(){
  if(!CFG.visualFx) CFG.visualFx={enabled:true};
  const now=CFG.visualFx.enabled!==false;
  const next=!now;
  if(!confirm(next?"確定要啟用所有使用者的動畫與音效？":"確定要停用所有使用者的動畫與音效？\n\n這會影響全部已登入的使用者。"))return;
  CFG.visualFx.enabled=next;
  await saveCfg(true);
  toast(next?"已啟用動畫與音效":"已停用動畫與音效","ok");
  render();
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: 使用者管理
// ═══════════════════════════════════════════════════════════════
function usersTabHtml(){
  const q=userSearch.toLowerCase();
  const filtered=q
    ?USERS.filter(u=>((u.displayName||"")+(u.email||"")+(u.unit||"")).toLowerCase().includes(q))
    :USERS;
  const list=filtered.length
    ?filtered.map(u=>userRowHtml(u)).join("")
    :'<div class="empty">查無使用者</div>';
  return `<div class="card">
    <h2>👥 使用者管理（共 ${USERS.length} 位）</h2>
    <div class="search-box">
      <input class="inp" placeholder="搜尋姓名/email/單位..." value="${esc(userSearch)}" oninput="setUserSearch(this.value)">
    </div>
    ${list}
  </div>`;
}
function setUserSearch(v){userSearch=v;const app=$("app");const c=app.querySelector(".card");if(c){/* 只更新列表 */render()}}

function userRowHtml(u){
  const name=u.displayName||u.email||u.id;
  const unit=u.lockedUnit||u.unit||"（未設定）";
  const rtName=(()=>{
    const id=u.lockedRt||u.rt;
    if(!id)return"（未設定）";
    const r=CFG.rotations.find(x=>x.id===id);
    return r?r.name:id;
  })();
  const isSu=SUPER_ADMINS.includes(u.email);
  const isAd=CFG.admins.some(a=>a.email===u.email);
  const badges=isSu?'<span class="badge su">超管</span>':(isAd?'<span class="badge ad">管理員</span>':'');
  const expanded=expandedUserId===u.id;
  return `<div class="row" style="flex-direction:column;align-items:stretch">
    <div style="display:flex;align-items:center;gap:8px;width:100%">
      <div class="info">
        <div class="name">${esc(name)} ${badges}</div>
        <div class="sub">${esc(u.email||"-")} · ${esc(unit)} · ${esc(rtName)}</div>
      </div>
      <button class="btn sm gray" onclick="toggleUser('${u.id}')">${expanded?'收起':'展開'}</button>
    </div>
    ${expanded?userDetailHtml(u):""}
  </div>`;
}
function toggleUser(id){expandedUserId=(expandedUserId===id?null:id);render()}

function userDetailHtml(u){
  const lockedUnit=u.lockedUnit||"";
  const lockedRt=u.lockedRt||"";
  const unitOpts=['<option value="">（不鎖定）</option>'].concat(CFG.units.map(x=>`<option value="${esc(x)}" ${lockedUnit===x?'selected':''}>${esc(x)}</option>`)).join("");
  const rtOpts=['<option value="">（不鎖定）</option>'].concat(CFG.rotations.map(r=>`<option value="${esc(r.id)}" ${lockedRt===r.id?'selected':''}>${esc(r.name)}</option>`)).join("");
  const lastLogin=u.lastLogin&&u.lastLogin.seconds
    ?new Date(u.lastLogin.seconds*1000).toLocaleString("zh-TW")
    :"從未登入";
  return `<div class="user-detail">
    <div><b>UID:</b> <span style="color:#888;font-size:10px">${esc(u.id)}</span></div>
    <div><b>最後登入:</b> ${esc(lastLogin)}</div>
    <div><b>目前班次位置 (pos):</b> ${u.pos==null?'未設定':u.pos}</div>
    <div><b>目前單位 (unit):</b> ${esc(u.unit||"-")}</div>
    <div><b>目前輪班 (rt):</b> ${esc(u.rt||"-")}</div>
    <div class="sep"></div>
    <div style="font-weight:600;margin-bottom:6px">鎖定設定（鎖定後使用者不可自行更改）</div>
    <div style="margin-bottom:6px">
      <label style="font-size:10px;color:#888">鎖定單位</label>
      <select class="inp" id="lockUnit_${u.id}">${unitOpts}</select>
    </div>
    <div style="margin-bottom:6px">
      <label style="font-size:10px;color:#888">鎖定輪班規則</label>
      <select class="inp" id="lockRt_${u.id}">${rtOpts}</select>
    </div>
    <button class="btn green sm" onclick="saveUserLock('${u.id}')" style="width:100%">儲存鎖定設定</button>
    <div class="sep"></div>
    <div style="display:flex;gap:6px">
      <button class="btn red sm" onclick="resetUserPos('${u.id}')" style="flex:1">重置班次位置</button>
      <button class="btn red sm" onclick="deleteUser('${u.id}')" style="flex:1">刪除此使用者資料</button>
    </div>
  </div>`;
}

async function saveUserLock(id){
  const lu=$("lockUnit_"+id).value;
  const lr=$("lockRt_"+id).value;
  try{
    const payload={lockedUnit:lu,lockedRt:lr};
    if(lu)payload.unit=lu;
    if(lr)payload.rt=lr;
    await fbDb.collection("users").doc(id).set(payload,{merge:true});
    toast("已儲存鎖定設定","ok");
    const snap=await fbDb.collection("users").doc(id).get();
    const idx=USERS.findIndex(x=>x.id===id);
    if(idx>=0&&snap.exists)USERS[idx]={id,...snap.data()};
    render();
  }catch(e){toast("儲存失敗: "+e.message,"err")}
}

async function resetUserPos(id){
  if(!confirm("確定重置此使用者的班次位置？\n重置後使用者下次開啟 App 需重新設定。"))return;
  try{
    await fbDb.collection("users").doc(id).update({
      pos:firebase.firestore.FieldValue.delete(),
      ep:firebase.firestore.FieldValue.delete()
    });
    toast("已重置","ok");
    loadAll();
  }catch(e){toast("重置失敗: "+e.message,"err")}
}

async function deleteUser(id){
  if(!confirm("⚠️ 確定要刪除此使用者的所有資料嗎？\n此動作無法復原！"))return;
  if(!confirm("再次確認：這會永久刪除該使用者的所有 Firestore 資料（班表、請假、備註等）。"))return;
  try{
    await fbDb.collection("users").doc(id).delete();
    toast("已刪除","ok");
    USERS=USERS.filter(x=>x.id!==id);
    expandedUserId=null;
    render();
  }catch(e){toast("刪除失敗: "+e.message,"err")}
}

// ═══ event binding ═══
function bind(){
  // 未來如需額外事件可加在這
}

// ═══ 註冊 service worker (PWA) ═══
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/myshift/admin/sw.js').catch(()=>{});
  });
}

// 初始顯示
render();
