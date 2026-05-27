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
let CFG={units:[],rotations:[],leaveTypes:[],admins:[],visualFx:{enabled:true},wxAlerts:{}};
const WX_ALERTS_DEFAULTS={
  master:true,
  typhoon:true,storm:true,heavyRain:true,rain:true,strongWind:true,heat:true,cold:true,fog:false,
  earthquake:true,
  rainProb:60,heavyRainProb:80,windThreshold:50,typhoonWind:62,heatThreshold:36,coldThreshold:10,
  cwaWorkerUrl:"",
  typhoonWorkerUrl:"",
  typhoonAlertDistanceKm:800,
  typhoonMinIntensity:'td',
  typhoonAlertOnNotice:true,
  earthquakeMinMagnitude:4.0,
  earthquakeMinIntensity:3,
  earthquakeMaxDistanceKm:0,
  earthquakeMaxAgeMinutes:120,
  notifyEnabled:true,
  notifyTyphoon:true,notifyStorm:true,notifyHeavyRain:true,notifyRain:false,
  notifyStrongWind:true,notifyHeat:false,notifyCold:false,notifyFog:false,
  notifyEarthquake:true,
  cooldownHours:3,quietStart:22,quietEnd:7,quietIgnoreCritical:true,
  timeWindows:{rain:[],heavyRain:[],strongWind:[],heat:[],cold:[],fog:[]}
};
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
      // 深層處理 wxAlerts（timeWindows 是巢狀物件）
      CFG.wxAlerts=JSON.parse(JSON.stringify(WX_ALERTS_DEFAULTS));
      if(d.wxAlerts&&typeof d.wxAlerts==='object'){
        for(const k in d.wxAlerts){
          if(d.wxAlerts[k]===undefined||d.wxAlerts[k]===null) continue;
          if(k==='timeWindows'&&typeof d.wxAlerts[k]==='object'){
            for(const aid in d.wxAlerts.timeWindows){
              if(Array.isArray(d.wxAlerts.timeWindows[aid])) CFG.wxAlerts.timeWindows[aid]=d.wxAlerts.timeWindows[aid];
            }
          }else{
            CFG.wxAlerts[k]=d.wxAlerts[k];
          }
        }
      }
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
      wxAlerts:CFG.wxAlerts||WX_ALERTS_DEFAULTS,
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
    {id:"appearance",label:"🎨 外觀"},
    {id:"wxAlerts",label:"🚨 天氣警報"}
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
    case"wxAlerts":return wxAlertsTabHtml();
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
// TAB: 天氣警報設定
// ═══════════════════════════════════════════════════════════════
const WX_ALERT_DEFS=[
  {id:'earthquake',icon:'🌍',title:'地震警報',desc:'CWA 官方資料；需部署 worker',critical:true,supportWindow:false},
  {id:'typhoon',icon:'🌀',title:'颱風警報',desc:'有 worker → CWA 官方；無 worker → Open-Meteo 推算',thr:[{key:'typhoonWind',label:'推算風速門檻',unit:'km/h',min:40,max:150,step:5}],critical:true,supportWindow:false},
  {id:'storm',icon:'⛈',title:'雷雨警報',desc:'天氣代碼 95/96/99（雷暴）',critical:true,supportWindow:false},
  {id:'heavyRain',icon:'🌧',title:'豪雨警報',desc:'未來 6 小時任一小時降雨機率 ≥ 門檻',thr:[{key:'heavyRainProb',label:'降雨機率',unit:'%',min:50,max:100,step:5}],critical:true,supportWindow:true},
  {id:'rain',icon:'🌂',title:'一般降雨提醒',desc:'未來 3 小時降雨機率 ≥ 門檻（豪雨已觸發時自動跳過）',thr:[{key:'rainProb',label:'降雨機率',unit:'%',min:10,max:100,step:5}],supportWindow:true},
  {id:'strongWind',icon:'💨',title:'強風警報',desc:'當前或未來 3 小時風速 ≥ 門檻',thr:[{key:'windThreshold',label:'風速門檻',unit:'km/h',min:20,max:100,step:5}],supportWindow:true},
  {id:'heat',icon:'🥵',title:'高溫警報',desc:'當前溫度 ≥ 門檻',thr:[{key:'heatThreshold',label:'溫度門檻',unit:'°C',min:28,max:45,step:1}],supportWindow:true},
  {id:'cold',icon:'🥶',title:'低溫警報',desc:'當前溫度 ≤ 門檻',thr:[{key:'coldThreshold',label:'溫度門檻',unit:'°C',min:-5,max:20,step:1}],supportWindow:true},
  {id:'fog',icon:'🌫',title:'濃霧提醒',desc:'天氣代碼 45/48（霧）',supportWindow:true}
];

function _wxNotifyKey(id){return 'notify'+id.charAt(0).toUpperCase()+id.slice(1)}
function _wxA(){if(!CFG.wxAlerts)CFG.wxAlerts=Object.assign({},WX_ALERTS_DEFAULTS);return CFG.wxAlerts}

function _wxSwitchHtml(checked,onclickStr){
  const bg=checked?'#27ae60':'#7a8a99';
  const left=checked?'24px':'3px';
  return `<span onclick="${onclickStr}" style="display:inline-block;position:relative;width:48px;height:26px;background:${bg};border-radius:13px;cursor:pointer;transition:.2s;flex-shrink:0"><span style="position:absolute;width:20px;height:20px;left:${left};top:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.25)"></span></span>`;
}

function wxAlertsTabHtml(){
  const c=_wxA();
  const masterOn=c.master!==false;
  const notifyOn=c.notifyEnabled!==false;
  const tw=c.timeWindows||{};

  // 警報項目
  const alertItems=WX_ALERT_DEFS.map(a=>{
    const itemOn=c[a.id]!==false;
    const notifyKey=_wxNotifyKey(a.id);
    const itemNotifyOn=c[notifyKey]!==false;
    const thrHtml=a.thr?a.thr.map(t=>{
      const val=c[t.key]!==undefined?c[t.key]:WX_ALERTS_DEFAULTS[t.key];
      return `<div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;color:#aaa">${t.label}</span><input type="number" id="wx_${t.key}" value="${val}" min="${t.min}" max="${t.max}" step="${t.step}" onchange="wxSetThr('${t.key}',this.value)" style="width:64px;padding:5px 8px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:12px;text-align:right"><span style="font-size:10px;color:#aaa">${t.unit}</span></div>`;
    }).join(''):'';

    // 時段管理（僅 supportWindow 警報）
    let windowHtml='';
    if(a.supportWindow){
      const windows=Array.isArray(tw[a.id])?tw[a.id]:[];
      // 強制 24 小時制：用兩個 select（小時 0-23 + 分鐘 0-55，5 分鐘一格）
      function _hOpts(sel){let o='';for(let h=0;h<24;h++){const v=String(h).padStart(2,'0');o+=`<option value="${v}"${sel===v?' selected':''}>${v}</option>`}return o}
      function _mOpts(sel){let o='';for(let m=0;m<60;m+=5){const v=String(m).padStart(2,'0');o+=`<option value="${v}"${sel===v?' selected':''}>${v}</option>`}return o}
      const winRows=windows.length?windows.map((w,wi)=>{
        const [sh,sm]=String(w.start||'07:00').split(':');
        const [eh,em]=String(w.end||'08:00').split(':');
        const ssStyle='padding:5px 6px;border:1px solid #3a4a5f;border-radius:3px;background:#0f1925;color:#fff;font-size:13px;font-family:inherit';
        return `<div style="display:flex;gap:3px;align-items:center;background:#1a2533;padding:6px 8px;border-radius:4px;margin:3px 0;flex-wrap:wrap">
          <select onchange="wxUpdWindowPart('${a.id}',${wi},'start','h',this.value)" style="${ssStyle}">${_hOpts(sh)}</select>
          <span style="color:#fff;font-weight:700">:</span>
          <select onchange="wxUpdWindowPart('${a.id}',${wi},'start','m',this.value)" style="${ssStyle}">${_mOpts(sm||'00')}</select>
          <span style="color:#888;margin:0 4px">→</span>
          <select onchange="wxUpdWindowPart('${a.id}',${wi},'end','h',this.value)" style="${ssStyle}">${_hOpts(eh)}</select>
          <span style="color:#fff;font-weight:700">:</span>
          <select onchange="wxUpdWindowPart('${a.id}',${wi},'end','m',this.value)" style="${ssStyle}">${_mOpts(em||'00')}</select>
          <button onclick="wxDelWindow('${a.id}',${wi})" style="background:#5c2c2c;color:#fff;border:none;padding:5px 10px;border-radius:3px;font-size:11px;cursor:pointer;margin-left:auto">✕</button>
        </div>`;
      }).join(''):'<div style="font-size:10px;color:#7a8a99;font-style:italic;padding:4px 0">未設定 = 全天偵測</div>';
      windowHtml=`<div style="margin-top:8px;padding:8px 10px;background:#0d1925;border-radius:6px;border-left:3px solid #3949ab">
        <div style="font-size:10px;color:#aaa;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
          <span>⏰ 偵測時段（24h 制，多時段任一成立就觸發）</span>
          <button onclick="wxAddWindow('${a.id}')" style="background:#3949ab;color:#fff;border:none;padding:4px 12px;border-radius:3px;font-size:11px;font-weight:600;cursor:pointer">+ 新增時段</button>
        </div>
        ${winRows}
      </div>`;
    }

    return `<div class="row" style="flex-direction:column;align-items:stretch;padding:10px 12px">
      <div style="display:flex;align-items:center;gap:10px;width:100%">
        <div style="font-size:22px;width:30px;text-align:center">${a.icon}</div>
        <div class="info" style="flex:1">
          <div class="name">${a.title}</div>
          <div class="sub">${a.desc}</div>
        </div>
        ${_wxSwitchHtml(itemOn,"wxToggle('"+a.id+"')")}
      </div>
      <div style="display:flex;gap:14px;margin-top:8px;padding-left:40px;flex-wrap:wrap;align-items:center">
        ${thrHtml}
        <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
          <span style="font-size:11px;color:${itemNotifyOn?'#27ae60':'#aaa'}">${itemNotifyOn?'🔔':'🔕'} 系統通知</span>
          ${_wxSwitchHtml(itemNotifyOn,"wxToggleNotify('"+a.id+"')")}
        </div>
      </div>
      ${windowHtml}
    </div>`;
  }).join("");

  // 通知行為設定
  const cdHours=c.cooldownHours!==undefined?c.cooldownHours:3;
  const qic=c.quietIgnoreCritical!==false;
  const hourOpts=Array.from({length:24},(_,h)=>`<option value="${h}">${String(h).padStart(2,'0')}:00</option>`).join('');

  // CWA 官方資料設定（颱風 + 地震共用一個 worker）
  const tyUrl=c.cwaWorkerUrl||c.typhoonWorkerUrl||'';
  const tyDist=c.typhoonAlertDistanceKm!==undefined?c.typhoonAlertDistanceKm:800;
  const tyMinInt=c.typhoonMinIntensity||'td';
  const tyOnNotice=c.typhoonAlertOnNotice!==false;
  const intensityOpts=[
    {v:'td',l:'熱帶性低氣壓 (TD)'},
    {v:'mild',l:'輕度颱風 (≥17.2 m/s)'},
    {v:'moderate',l:'中度颱風 (≥32.7 m/s)'},
    {v:'severe',l:'強烈颱風 (≥51 m/s)'}
  ].map(o=>`<option value="${o.v}"${o.v===tyMinInt?' selected':''}>${o.l}</option>`).join('');
  const workerStatus=tyUrl
    ?'<span style="color:#27ae60;font-weight:600">✓ 已設定（使用 CWA 官方資料：颱風 + 地震）</span>'
    :'<span style="color:#e67e22;font-weight:600">⚠ 未設定（颱風用 Open-Meteo 推算；地震無資料）</span>';

  // 地震設定
  const eqMinMag=c.earthquakeMinMagnitude!==undefined?c.earthquakeMinMagnitude:4.0;
  const eqMinInt=c.earthquakeMinIntensity!==undefined?c.earthquakeMinIntensity:3;
  const eqMaxDist=c.earthquakeMaxDistanceKm!==undefined?c.earthquakeMaxDistanceKm:0;
  const eqMaxAge=c.earthquakeMaxAgeMinutes!==undefined?c.earthquakeMaxAgeMinutes:120;

  return `<div class="card">
    <h2>🚨 即時天氣警報</h2>
    <div style="color:#aaa;font-size:12px;line-height:1.6;margin-bottom:14px">
      偵測：颱風、雷雨、豪雨、強風、高/低溫、濃霧。<br>
      此處設定為「全局上限」，用戶端可進一步在自己 app 內關閉。
    </div>

    <div class="row" style="padding:12px;background:linear-gradient(135deg,#0d6b5e,#0a4d44);border-radius:8px;margin-bottom:8px">
      <div class="info">
        <div class="name" style="color:#fff">⚡ 警報系統總開關</div>
        <div class="sub" style="color:rgba(255,255,255,.85)">關閉後所有警報不顯示也不通知</div>
      </div>
      ${_wxSwitchHtml(masterOn,"wxToggleMaster()")}
    </div>
    <div class="row" style="padding:12px;background:linear-gradient(135deg,#283593,#1a237e);border-radius:8px;margin-bottom:14px">
      <div class="info">
        <div class="name" style="color:#fff">🔔 系統通知總開關</div>
        <div class="sub" style="color:rgba(255,255,255,.85)">關閉後不會跳手機通知，但前台仍顯示警報橫幅</div>
      </div>
      ${_wxSwitchHtml(notifyOn,"wxToggleNotifyMaster()")}
    </div>

    <h2 style="margin-top:18px">🌐 CWA 官方資料（颱風 + 地震）</h2>
    <div style="padding:10px;background:#1a2533;border-radius:6px;margin-bottom:12px;font-size:11px;color:#aaa;line-height:1.6">
      目前狀態：<span style="color:#27ae60;font-weight:600">✓ 已寫死於程式碼（cwa-data.onerkk.workers.dev）</span><br>
      Worker URL 直接寫死在 app.js / sw.js 中，後台這個輸入框已失效（保留僅供參考）。<br>
      若要更換 Worker，請直接修改程式碼。
    </div>
    <div class="row" style="padding:10px 12px;flex-direction:column;align-items:stretch;opacity:0.5">
      <div style="font-size:12px;color:#aaa;margin-bottom:6px">Worker URL（已停用）</div>
      <input type="text" id="wx_cwaWorkerUrl" value="https://cwa-data.onerkk.workers.dev" disabled style="width:100%;padding:8px 10px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:12px;font-family:inherit;box-sizing:border-box">
    </div>

    <h2 style="margin-top:18px">🌀 颱風警報參數</h2>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">距台灣警報門檻</div>
        <div class="sub">颱風中心或預測路徑進入此距離內才觸發警報</div>
      </div>
      <input type="number" id="wx_typhoonAlertDistanceKm" value="${tyDist}" min="100" max="2000" step="50" onchange="wxSetThr('typhoonAlertDistanceKm',this.value)" style="width:80px;padding:6px 10px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:13px;text-align:right">
      <span style="font-size:11px;color:#aaa;margin-left:6px">km</span>
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">最低強度門檻</div>
        <div class="sub">低於此強度的熱帶系統不觸發警報</div>
      </div>
      <select id="wx_typhoonMinIntensity" onchange="wxSetStr('typhoonMinIntensity',this.value)" style="padding:6px 8px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:12px">${intensityOpts}</select>
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">官方發布警報時忽略距離</div>
        <div class="sub">CWA 發布海/陸警時一律觸發，不受距離與強度限制</div>
      </div>
      ${_wxSwitchHtml(tyOnNotice,"wxToggleNoticeOverride()")}
    </div>

    <h2 style="margin-top:18px">🌍 地震警報參數</h2>
    <div style="padding:10px;background:#1a2533;border-radius:6px;margin-bottom:12px;font-size:11px;color:#aaa;line-height:1.6">
      規模或震度任一達標即觸發（OR 邏輯）。同一筆地震不會重複推播。<br>
      <strong style="color:#fff">CWA 震度標準</strong>：1-2 微震、3 弱震、4 中震、5弱/5強 強震、6弱/6強 烈震、7 劇震
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">最低規模門檻 (M)</div>
        <div class="sub">里氏規模達此值即觸發</div>
      </div>
      <input type="number" id="wx_earthquakeMinMagnitude" value="${eqMinMag}" min="3" max="9" step="0.1" onchange="wxSetThr('earthquakeMinMagnitude',this.value)" style="width:80px;padding:6px 10px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:13px;text-align:right">
      <span style="font-size:11px;color:#aaa;margin-left:6px">M</span>
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">最低震度門檻</div>
        <div class="sub">任一縣市達此震度即觸發（CWA 推播多用震度 ≥ 3）</div>
      </div>
      <input type="number" id="wx_earthquakeMinIntensity" value="${eqMinInt}" min="1" max="7" step="1" onchange="wxSetThr('earthquakeMinIntensity',this.value)" style="width:80px;padding:6px 10px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:13px;text-align:right">
      <span style="font-size:11px;color:#aaa;margin-left:6px">級</span>
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">距用戶距離限制</div>
        <div class="sub">震央距用戶超過此距離不警報，0 = 不限</div>
      </div>
      <input type="number" id="wx_earthquakeMaxDistanceKm" value="${eqMaxDist}" min="0" max="1000" step="50" onchange="wxSetThr('earthquakeMaxDistanceKm',this.value)" style="width:80px;padding:6px 10px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:13px;text-align:right">
      <span style="font-size:11px;color:#aaa;margin-left:6px">km</span>
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">時效（多久內的地震才警報）</div>
        <div class="sub">超過此分鐘數的地震視為「舊資料」不警報</div>
      </div>
      <input type="number" id="wx_earthquakeMaxAgeMinutes" value="${eqMaxAge}" min="10" max="1440" step="10" onchange="wxSetThr('earthquakeMaxAgeMinutes',this.value)" style="width:80px;padding:6px 10px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:13px;text-align:right">
      <span style="font-size:11px;color:#aaa;margin-left:6px">分鐘</span>
    </div>

    <h2 style="margin-top:18px">⚙️ 警報項目（每項可獨立調整閾值、時段、推播）</h2>
    ${alertItems}

    <h2 style="margin-top:18px">🌙 通知行為</h2>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">同警報冷卻時間</div>
        <div class="sub">同一警報在此時間內不重複通知</div>
      </div>
      <input type="number" id="wx_cd" value="${cdHours}" min="1" max="24" step="1" onchange="wxSetThr('cooldownHours',this.value)" style="width:64px;padding:6px 10px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:13px;text-align:right">
      <span style="font-size:11px;color:#aaa;margin-left:6px">小時</span>
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">靜音時段</div>
        <div class="sub">此時段不發送通知（嚴重警報除外）</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <select id="wx_qs" onchange="wxSetThr('quietStart',this.value)" style="padding:6px 8px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:12px">${hourOpts}</select>
        <span style="color:#aaa">→</span>
        <select id="wx_qe" onchange="wxSetThr('quietEnd',this.value)" style="padding:6px 8px;border:1px solid #4a5a6f;border-radius:4px;background:#2a3a4f;color:#fff;font-size:12px">${hourOpts}</select>
      </div>
    </div>
    <div class="row" style="padding:10px 12px">
      <div class="info">
        <div class="name">嚴重警報忽略靜音</div>
        <div class="sub">颱風 / 雷雨 / 豪雨 在靜音時段也會通知</div>
      </div>
      ${_wxSwitchHtml(qic,"wxToggleQuietCritical()")}
    </div>

    <div style="margin-top:14px;padding:10px;background:#1a2533;border-radius:6px;font-size:11px;color:#aaa;line-height:1.6">
      💡 <strong style="color:#fff">提示</strong>：iOS 用戶必須先把 App「加入主畫面」並從主畫面開啟才能收到通知。<br>
      🆓 <strong style="color:#fff">免費保證</strong>：所有 API 與服務皆免費（Open-Meteo / CWA / Cloudflare Worker 免費額度 / Firestore 既有額度）。
    </div>
    <button class="btn red" onclick="wxResetDefaults()" style="margin-top:14px">恢復預設</button>
  </div>`;
}

// 設定完即時存（debounce）
let _wxSaveTimer=null;
function _wxScheduleSave(){
  if(_wxSaveTimer)clearTimeout(_wxSaveTimer);
  _wxSaveTimer=setTimeout(()=>{_wxSaveTimer=null;saveCfg(true);},400);
}

async function wxToggleMaster(){_wxA().master=!(_wxA().master!==false);await saveCfg(true);render()}
async function wxToggleNotifyMaster(){_wxA().notifyEnabled=!(_wxA().notifyEnabled!==false);await saveCfg(true);render()}
async function wxToggle(id){const c=_wxA();c[id]=!(c[id]!==false);await saveCfg(true);render()}
async function wxToggleNotify(id){const c=_wxA();const k=_wxNotifyKey(id);c[k]=!(c[k]!==false);await saveCfg(true);render()}
async function wxToggleQuietCritical(){_wxA().quietIgnoreCritical=!(_wxA().quietIgnoreCritical!==false);await saveCfg(true);render()}
async function wxToggleNoticeOverride(){_wxA().typhoonAlertOnNotice=!(_wxA().typhoonAlertOnNotice!==false);await saveCfg(true);render()}
function wxSetThr(key,val){
  const c=_wxA();
  const v=parseFloat(val);
  if(!isNaN(v)) c[key]=v;
  _wxScheduleSave();
}
function wxSetStr(key,val){
  _wxA()[key]=String(val||'').trim();
  _wxScheduleSave();
}
// 時段管理
async function wxAddWindow(alertId){
  const c=_wxA();
  if(!c.timeWindows) c.timeWindows={};
  if(!Array.isArray(c.timeWindows[alertId])) c.timeWindows[alertId]=[];
  c.timeWindows[alertId].push({start:'07:00',end:'08:00'});
  await saveCfg(true);
  render();
}
async function wxDelWindow(alertId,idx){
  const c=_wxA();
  if(!c.timeWindows||!Array.isArray(c.timeWindows[alertId])) return;
  c.timeWindows[alertId].splice(idx,1);
  await saveCfg(true);
  render();
}
function wxUpdWindow(alertId,idx,field,val){
  const c=_wxA();
  if(!c.timeWindows||!Array.isArray(c.timeWindows[alertId])) return;
  if(!c.timeWindows[alertId][idx]) return;
  c.timeWindows[alertId][idx][field]=val;
  _wxScheduleSave();
}
// 24h select 版：分別更新「小時」或「分鐘」
function wxUpdWindowPart(alertId,idx,field,part,val){
  const c=_wxA();
  if(!c.timeWindows||!Array.isArray(c.timeWindows[alertId])) return;
  const w=c.timeWindows[alertId][idx];
  if(!w) return;
  const cur=String(w[field]||'00:00');
  const [h,m]=cur.split(':');
  const newVal=part==='h'?(val+':'+(m||'00')):((h||'00')+':'+val);
  w[field]=newVal;
  _wxScheduleSave();
}
async function wxResetDefaults(){
  if(!confirm('確定恢復所有天氣警報設定為預設值？'))return;
  // 深拷貝預設（避免 timeWindows 物件共享）
  CFG.wxAlerts=JSON.parse(JSON.stringify(WX_ALERTS_DEFAULTS));
  await saveCfg();
  render();
}

// 因為 select 預設值需要在 render 後設定，這裡延遲設定
// （bind 函式會在每次 render 後執行）

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
  // 天氣警報 tab：select 元素的預設值要在 DOM 渲染後才能設定
  if(activeTab==='wxAlerts'){
    try{
      const c=CFG.wxAlerts||{};
      const qs=$("wx_qs"),qe=$("wx_qe");
      if(qs) qs.value=c.quietStart!==undefined?c.quietStart:22;
      if(qe) qe.value=c.quietEnd!==undefined?c.quietEnd:7;
    }catch(e){}
  }
}

// ═══ 註冊 service worker (PWA) ═══
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/myshift/admin/sw.js').catch(()=>{});
  });
}

// 初始顯示
render();
