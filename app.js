const fbConfig={apiKey:"AIzaSyBKgqmsDIZgqf8nxWTDdTqVS01H0TIOCj4",authDomain:"myshift-a67f1.firebaseapp.com",projectId:"myshift-a67f1",storageBucket:"myshift-a67f1.firebasestorage.app",messagingSenderId:"779297515930",appId:"1:779297515930:web:7f5ba8992c5d5081a9f223"};
firebase.initializeApp(fbConfig);
const fbAuth=firebase.auth(),fbDb=firebase.firestore();
fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
let fbUser=null;
let fbAuthReady=false;
fbAuth.onAuthStateChanged(u=>{fbUser=u;fbAuthReady=true;if(u){loadLeaves();loadAdminEv();cloudLoad()}else{loadAdminEv();render()}});
fbAuth.getRedirectResult().then(r=>{if(r&&r.user){fbUser=r.user}}).catch(()=>{});
setTimeout(()=>{if(!fbAuthReady){fbAuthReady=true;render()}},3000);
let _loading=false;
async function cloudSave(){if(!fbUser||_loading)return;try{await fbDb.collection("users").doc(fbUser.uid).set({rt:S.rt,pos:S.pos,ep:true,ev:JSON.stringify(EVS),al:JSON.stringify(AL),ald:JSON.stringify(ALD),notes:JSON.stringify(NOTES),lang:lang,ts:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}catch(e){console.log("cloudSave err",e)}}
async function cloudLoad(){if(!fbUser)return;_loading=true;try{const doc=await fbDb.collection("users").doc(fbUser.uid).get();if(doc.exists){const d=doc.data();let needEpSave=false;if(d.rt&&d.pos!==null&&d.pos!==undefined){S.rt=d.rt;S.pos=d.pos;if(!d.ep){const cc=R[S.rt]?R[S.rt].c:[];if(cc.length){const todOff=Math.round((TR-EPOCH)/864e5);S.pos=((S.pos-todOff%cc.length)+cc.length*1000)%cc.length};needEpSave=true};S.step="cal";const dd=JSON.stringify({rt:S.rt,pos:S.pos,ep:true});try{localStorage.setItem("sb_c",dd)}catch(e){}sCk("sb_c",dd,3650)}if(d.ev){try{EVS=JSON.parse(d.ev)}catch(e){}}if(d.al){try{AL=JSON.parse(d.al);ALD=d.ald?JSON.parse(d.ald):{}}catch(e){}}if(d.notes){try{NOTES=JSON.parse(d.notes)}catch(e){}}if(d.lang){lang=d.lang;try{localStorage.setItem("sb_l",lang)}catch(e){}sCk("sb_l",lang,3650)};_loading=false;if(needEpSave)cloudSave();sEv();sAL()}else{_loading=false};render()}catch(e){console.log("cloudLoad err",e);_loading=false;render()}}
let fbLoginPending=false;
function fbLogin(){const p=new firebase.auth.GoogleAuthProvider();
fbLoginPending=true;
fbAuth.signInWithPopup(p).then(()=>{fbLoginPending=false}).catch(e=>{
  fbLoginPending=false;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone;
  if(isIOS&&isStandalone){alert(lang==="zh"?"📱 iOS 桌面版請先用 Safari 開啟 onerkk.github.io 登入 Google，登入後再回到此 App 即可自動同步":"📱 iOS: Buka onerkk.github.io di Safari, login Google, lalu kembali ke App")}
  else{fbAuth.signInWithRedirect(p)}
})}
function fbLogout(){fbAuth.signOut()}
let leavesCache={};
async function loadLeaves(){try{const y=S.yr||TY,m=S.mo||TM;const snap=await fbDb.collection("leaves").where("ym","==",y+"-"+String(m).padStart(2,"0")).get();const d={};snap.forEach(doc=>{const v=doc.data();const k=v.date;if(!d[k])d[k]=[];d[k].push({uid:v.uid,name:v.name,type:v.type})});leavesCache=d;render()}catch(e){console.log("loadLeaves err",e)}}
async function addLeave(date,type){if(!fbUser)return;const id=fbUser.uid+"_"+date;await fbDb.collection("leaves").doc(id).set({uid:fbUser.uid,name:fbUser.displayName||fbUser.email,date:date,ym:date.slice(0,7),type:type,ts:firebase.firestore.FieldValue.serverTimestamp()});loadLeaves()}
async function removeLeave(date){if(!fbUser)return;const id=fbUser.uid+"_"+date;await fbDb.collection("leaves").doc(id).delete();loadLeaves()}
function getLeaves(date){return leavesCache[date]||[]}
function myLeave(date){return getLeaves(date).find(l=>l.uid===(fbUser&&fbUser.uid))}

const ADMIN_EMAILS=["onerkk@gmail.com","asus0814999@gmail.com"];
const ADMIN_EV=["meeting","health"];
function isAdmin(){return fbUser&&ADMIN_EMAILS.includes(fbUser.email)}
let adminEvCache={};
async function loadAdminEv(){try{const y=S.yr||TY,m=S.mo||TM;const snap=await fbDb.collection("adminEvents").where("ym","==",y+"-"+String(m).padStart(2,"0")).get();const d={};snap.forEach(doc=>{const v=doc.data();const k=v.date;if(!d[k])d[k]=[];d[k].push(v.type)});adminEvCache=d;render()}catch(e){console.log("loadAdminEv err",e)}}
async function setAdminEv(date,type,add){if(!isAdmin())return;const id=type+"_"+date;if(add){await fbDb.collection("adminEvents").doc(id).set({date:date,ym:date.slice(0,7),type:type,ts:firebase.firestore.FieldValue.serverTimestamp()})}else{await fbDb.collection("adminEvents").doc(id).delete()}loadAdminEv()}
function getAdminEv(date){return adminEvCache[date]||[]}
function hasAdminEv(date){return getAdminEv(date).length>0}
const IMG={icon:"./images/icon.png",early:"./images/early.png",night:"./images/night.png",mid:"./images/mid.png",off:"./images/off.png"};

const SI={"早":IMG.early,"晚":IMG.night,"中":IMG.mid,"休":IMG.off};
const SC={"早":"e","晚":"n","中":"m","休":"o"};
const L={
zh:{app:"我的班表",sub:"My Shift",desc:"選擇輪班制度，三步自動排整年",s12:"12小時制",s8:"8小時制",cyc:"天循環",
  today:"今天",reset:"重設",help:"說明",lang:"ID",work:"上班",off:"休假",
  q1:"今天上班還是休假？",q2w:"上什麼班？",q2o:"休完接下來什麼班？",q3w:"#s#第幾天？",q3o:"休假第幾天？",dn:"第#n#天",
  早:"早班",晚:"晚班",中:"中班",休:"休假",workD:"上班",
  reqH:"應上班",totalH:"總工時",otH:"加班",alRem:"特休剩餘",
  rem:"🔔 本月提醒",mark:"標記事項",alarm:"⏰ 設鬧鐘",done:"完成",
  meeting:"班股會議",health:"體檢","class":"上課",biztrip:"公出",pay:"發薪日",annualL:"特休",custom:"自訂備註",
  alPick:"使用特休時數",hr:"小時",alSetup:"🌴 特休設定（選填）",alTotal:"總時數",alUsed:"已使用",alSkip:"可跳過",
  instT:"安裝到主畫面",instS:"一鍵安裝",instSi:"Safari→分享→加入主畫面",instB:"安裝",
  aSet:"✅ 鬧鐘：#m#/#d# 07:00\n⚠️ 需保持瀏覽器開啟",aNow:"✅ 已提醒！",aBlock:"通知被封鎖",aNoPerm:"需開啟通知",aNo:"不支援通知",sRem:"班表提醒",
  helpT:"📖 使用說明",
  h:["初始設定|回答三個問題（上班/休假→班別→第幾天），系統自動排整年班表。","查看班表|左右箭頭切換月份，點「今天」回到本月。點擊日期可標記事項。","標記事項|上課、公出、發薪日、特休、自訂備註。管理員可設定班股會議與體檢，全員可見。","特休管理|STEP 1 頁面可設定總時數與已使用時數（0.5小時為單位）。勾選特休後自動計算剩餘。","加班計算|12小時制每天4小時加班。8小時制超出應上班部分為加班。國定假日自動扣除。","天氣與降雨提醒|自動偵測位置顯示7日天氣，點選可看每小時詳情（溫度、降雨、風速、濕度）。上班日出門時段降雨機率≥40%會提醒帶雨具。","潮汐預報|自動偵測位置，顯示最近海岸測站的7日潮汐（滿潮/乾潮時間與潮位）。點選可看當日詳細資料，來源為中央氣象署。","雲端同步|登入 Google 帳號後，所有設定自動同步到雲端。清除資料後重新登入即可恢復，不需備份碼。","請假同步|登入後可標記請假，所有使用者可看到當天幾人請假。管理員可查看姓名並手動調整人數。","節慶顯示|台灣與印尼節慶都會顯示，語言跟隨中/ID切換自動翻譯。","安裝到桌面|底部安裝按鈕可將 App 加到手機桌面。右上角可切換中文/印尼文。iOS 請用 Safari 開啟後「分享→加入主畫面」。"],
  wk:["日","一","二","三","四","五","六"]},
id:{app:"My Shift",sub:"Jadwal Kerja",desc:"Pilih shift, 3 langkah otomatis setahun",s12:"12 jam",s8:"8 jam",cyc:"hari",
  today:"Hari ini",reset:"Reset",help:"Info",lang:"ZH",work:"Kerja",off:"Libur",
  q1:"Hari ini kerja atau libur?",q2w:"Shift apa?",q2o:"Setelah libur shift apa?",q3w:"#s# hari ke?",q3o:"Libur hari ke?",dn:"Hari #n#",
  早:"Pagi",晚:"Malam",中:"Siang",休:"Libur",workD:"Kerja",
  reqH:"Jam Wajib",totalH:"Total",otH:"Lembur",alRem:"Sisa Cuti",
  rem:"🔔 Pengingat",mark:"Tandai",alarm:"⏰ Alarm",done:"Selesai",
  meeting:"Rapat",health:"Kesehatan","class":"Kelas",biztrip:"Dinas",pay:"Gajian",annualL:"Cuti",custom:"Catatan",
  alPick:"Jam cuti",hr:"jam",alSetup:"🌴 Cuti (opsional)",alTotal:"Total jam",alUsed:"Sudah pakai",alSkip:"Bisa dilewati",
  instT:"Pasang di HP",instS:"Satu klik",instSi:"Safari→Bagikan→Layar Utama",instB:"Pasang",
  aSet:"✅ Alarm: #m#/#d# 07:00",aNow:"✅ Terkirim!",aBlock:"Diblokir",aNoPerm:"Perlu izin",aNo:"Tidak mendukung",sRem:"Pengingat",
  helpT:"📖 Panduan",
  h:["Pengaturan Awal|Jawab 3 pertanyaan (kerja/libur → shift → hari ke-berapa), jadwal setahun otomatis dibuat.","Lihat Jadwal|Geser bulan dengan panah kiri/kanan, ketuk 'Hari ini' untuk kembali. Ketuk tanggal untuk menandai.","Tandai Acara|Kelas, Dinas, Gajian, Cuti, Catatan sendiri. Admin bisa set Rapat & Kesehatan untuk semua user.","Kelola Cuti|Atur total jam dan jam terpakai di halaman STEP 1 (per 0.5 jam). Sisa cuti dihitung otomatis.","Lembur|12 jam: 4 jam lembur/hari. 8 jam: kelebihan dari jam wajib. Hari libur nasional otomatis dikurangi.","Cuaca & Peringatan Hujan|Deteksi lokasi otomatis, tampilkan cuaca 7 hari. Ketuk untuk detail per jam (suhu, hujan, angin, kelembaban). Peringatan bawa payung jika hujan ≥40%.","Pasang Surut|Otomatis deteksi lokasi, tampilkan pasang surut 7 hari dari stasiun pantai terdekat. Ketuk untuk detail harian. Sumber: CWA Taiwan.","Sinkronisasi Cloud|Login Google, semua pengaturan otomatis tersimpan di cloud. Setelah hapus data, login lagi untuk restore.","Sinkronisasi Cuti|Setelah login, bisa tandai cuti. Semua user bisa lihat jumlah cuti per hari. Admin bisa lihat nama dan atur jumlah.","Hari Libur|Hari libur Taiwan & Indonesia ditampilkan, terjemahan otomatis sesuai bahasa.","Install ke Layar|Tombol install di bawah. Ganti bahasa 中/ID di kanan atas. iOS: buka di Safari lalu Share → Add to Home Screen."],
  wk:["Min","Sen","Sel","Rab","Kam","Jum","Sab"]}
};
const RN={zh:{"2on2off":"做2休2","4on2off":"做4休2","5on_mixed":"做5休1＋做5休2"},id:{"2on2off":"2K 2L","4on2off":"4K 2L","5on_mixed":"5K1L+5K2L"}};
const R={"2on2off":{h:12,c:["早","早","休","休","晚","晚","休","休"]},"4on2off":{h:12,c:["早","早","早","早","休","休","晚","晚","晚","晚","休","休"]},"5on_mixed":{h:8,c:["早","早","早","早","早","休","早","早","早","早","早","休","休","中","中","中","中","中","休","中","中","中","中","中","休","休","晚","晚","晚","晚","晚","休","晚","晚","晚","晚","晚","休","休"]}};
const HOL={"01-01":{zh:"元旦",id:"Tahun Baru"},"01-27":{zh:"夜行登霄節",id:"Isra Mi'raj"},"01-29":{zh:"春節",id:"Imlek"},"02-17":{zh:"除夕",id:"Malam Imlek"},"02-18":{zh:"春節",id:"Imlek"},"02-28":{zh:"和平紀念日",id:"Hari Perdamaian TW"},"03-28":{zh:"寧靜日",id:"Nyepi"},"03-31":{zh:"開齋節",id:"Idul Fitri"},"04-01":{zh:"開齋節",id:"Idul Fitri"},"04-04":{zh:"兒童節",id:"Hari Anak TW"},"04-05":{zh:"清明節",id:"Qingming"},"04-18":{zh:"耶穌受難日",id:"Jumat Agung"},"05-01":{zh:"勞動節",id:"Hari Buruh"},"05-12":{zh:"衛塞節",id:"Waisak"},"05-29":{zh:"耶穌升天日",id:"Kenaikan Yesus"},"06-01":{zh:"端午節",id:"Peh Cun"},"06-07":{zh:"宰牲節",id:"Idul Adha"},"06-27":{zh:"伊斯蘭新年",id:"Tahun Baru Islam"},"08-17":{zh:"🇮🇩 印尼國慶",id:"🇮🇩 Kemerdekaan"},"09-05":{zh:"先知誕辰",id:"Maulid Nabi"},"09-25":{zh:"中秋節",id:"Festival Kue Bulan"},"10-10":{zh:"國慶日",id:"Hari Nasional TW"},"12-25":{zh:"聖誕節",id:"Natal"}};

const TW_OFF=new Set(["01-01","02-17","02-18","02-28","04-04","04-05","05-01","06-01","09-25","10-10"]);
function getPayDay(y,m,base){let d=new Date(y,m-1,base);for(let i=0;i<10;i++){const dw=d.getDay();if(dw!==0&&dw!==6&&!TW_OFF.has(hk(d.getMonth()+1,d.getDate())))break;d.setDate(d.getDate()-1)}return d.getDate()}
const EI=["meeting","health","class","biztrip","pay","annualL","custom"];
const EE={meeting:"📋",health:"🏥","class":"📚",biztrip:"🚗",pay:"💰",annualL:"🌴",custom:"📝"};
const NOW=new Date(),TY=NOW.getFullYear(),TM=NOW.getMonth()+1,TD=NOW.getDate(),TR=new Date(TY,TM-1,TD);
const EPOCH=new Date(2024,0,1);
let lang="zh";try{lang=localStorage.getItem("sb_l")||gCk("sb_l")||"zh"}catch(e){}
function t(k){return (L[lang]&&L[lang][k])||L.zh[k]||k}
function sf(s){return t(s)}
let S={step:"wiz",rt:"4on2off",pos:null,yr:TY,mo:TM,wT:null,wS:null,wD:null,wN:null,modal:null,showH:false,showStats:false,statsYr:TY,instH:false};
let EVS={};try{EVS=JSON.parse(localStorage.getItem("sb_ev"))||JSON.parse(gCk("sb_ev"))||{}}catch(e){}
function sEv(){const d=JSON.stringify(EVS);try{localStorage.setItem("sb_ev",d)}catch(e){}try{sCk("sb_ev",d,3650)}catch(e){}cloudSave()}
let AL={};try{AL=JSON.parse(localStorage.getItem("sb_al2"))||JSON.parse(gCk("sb_al2"))||{}}catch(e){}
let ALD={};try{ALD=JSON.parse(localStorage.getItem("sb_ald"))||JSON.parse(gCk("sb_ald"))||{}}catch(e){}
let NOTES={};try{NOTES=JSON.parse(localStorage.getItem("sb_notes"))||JSON.parse(gCk("sb_notes"))||{}}catch(e){}
function sNotes(){const d=JSON.stringify(NOTES);try{localStorage.setItem("sb_notes",d)}catch(e){}try{sCk("sb_notes",d,3650)}catch(e){}cloudSave()}
function alYear(y,m,d){return(m>12||(m===12&&d>=26))?y:y-1}
function curALY(){return alYear(TY,TM,TD)}
function alYRange(ay){return`${ay}/12/26 ~ ${ay+1}/12/25`}
function getAL(){const y=curALY();return AL[y]||{total:0,used:0}}
function setAL(total,used){const y=curALY();AL[y]={total,used};sAL()}
function sAL(){const a=JSON.stringify(AL),d=JSON.stringify(ALD);try{localStorage.setItem("sb_al2",a);localStorage.setItem("sb_ald",d)}catch(e){}try{sCk("sb_al2",a,3650);sCk("sb_ald",d,3650)}catch(e){}cloudSave()}
function alUsed(){const ay=curALY();const a=AL[ay]||{};let s=a.used||0;const start=`${ay}-12-26`,end=`${ay+1}-12-25`;for(let k in ALD){if(k>=start&&k<=end)s+=ALD[k]}return s}
function alRem(){const a=getAL();return Math.max(0,(a.total||0)-alUsed())}
let DP=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();DP=e;render()});
function sCk(k,v,d){const e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=k+"="+encodeURIComponent(v)+";expires="+e.toUTCString()+";path=/;SameSite=Lax"}
function gCk(k){const m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}
try{const c=JSON.parse(localStorage.getItem("sb_c"))||JSON.parse(gCk("sb_c"));if(c&&c.rt&&c.pos!==null&&c.pos!==undefined){S.rt=c.rt;S.pos=c.pos;if(!c.ep){const cc=R[S.rt]?R[S.rt].c:[];if(cc.length){const todOff=Math.round((TR-EPOCH)/864e5);S.pos=((S.pos-todOff%cc.length)+cc.length*1000)%cc.length}};S.step="cal";sv()}}catch(e){}
function sv(){const d=JSON.stringify({rt:S.rt,pos:S.pos,ep:true});try{localStorage.setItem("sb_c",d)}catch(e){}sCk("sb_c",d,3650);cloudSave()}
function rot(){return S.rt?R[S.rt]:null}
function cyc(){return rot()?rot().c:[]}
function dim(y,m){return new Date(y,m,0).getDate()}
function fdw(y,m){return new Date(y,m-1,1).getDay()}
function gs(y,m,d){const c=cyc();if(!c.length||S.pos===null)return null;let p=(S.pos+Math.round((new Date(y,m-1,d)-EPOCH)/864e5))%c.length;if(p<0)p+=c.length;return c[p]}
function ek(y,m,d){return`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function hk(m,d){return`${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function gh(m,d){const h=HOL[hk(m,d)];if(!h)return null;return h[lang]||null}
function en(id){return t(id)}
function calcOT(y,m,wd,sh){const dm=dim(y,m);let wdays=0;for(let d=1;d<=dm;d++){const dw=new Date(y,m-1,d).getDay();if(dw>=1&&dw<=5)wdays++}let hwd=0;for(let d=1;d<=dm;d++){const dw=new Date(y,m-1,d).getDay();if(dw>=1&&dw<=5&&HOL[hk(m,d)])hwd++}const rH=(wdays-hwd)*8;const tH=wd*sh;return{tH,oH:sh===12?wd*4:Math.max(0,tH-rH),rH}}
function calcPayPeriod(y,m){
  const pm=m===1?12:m-1,py=m===1?y-1:y;
  const sd=new Date(py,pm-1,26),ed=new Date(y,m-1,25);
  let wd=0,tH=0;
  for(let dt=new Date(sd);dt<=ed;dt.setDate(dt.getDate()+1)){
    const cy=dt.getFullYear(),cm=dt.getMonth()+1,cd=dt.getDate();
    const s=gs(cy,cm,cd);
    if(s&&s!=="休")wd++;
  }
  const r=rot();if(!r)return{sd,ed,wd,tH:0,oH:0,rH:0,sh:12};
  const sh=r.h;tH=wd*sh;
  let wdays=0,hwd=0;
  for(let dt=new Date(sd);dt<=ed;dt.setDate(dt.getDate()+1)){
    const dw=dt.getDay(),cm=dt.getMonth()+1,cd=dt.getDate();
    if(dw>=1&&dw<=5)wdays++;
    if(dw>=1&&dw<=5&&HOL[hk(cm,cd)])hwd++;
  }
  const rH=(wdays-hwd)*8;
  const oH=sh===12?wd*4:Math.max(0,tH-rH);
  return{sd,ed,wd,tH,oH,rH,sh};
}
function payCardHtml(y,m){
  const pp=calcPayPeriod(y,m);
  if(!pp||!rot())return"";
  const isZh=lang==="zh";
  const pm=m===1?12:m-1,py=m===1?y-1:y;
  const pLabel=isZh?`${py}/${pm}/26 ~ ${y}/${m}/25`:`${pm}/26/${py} ~ ${m}/25/${y}`;
  const pay5d=getPayDay(y,m,5),pay20d=getPayDay(y,m,20);
  const pay5=isZh?`${m}/${pay5d} 發薪`:`${m}/${pay5d} Gaji`;
  const pay20=isZh?`${m}/${pay20d} 績效獎金`:`${m}/${pay20d} Bonus`;
  return`<div class="pay-card fi">
    <div class="pay-header"><div class="pay-title">${isZh?"💳 薪資計算":"💳 Perhitungan Gaji"}</div><div class="pay-period">${pLabel}</div></div>
    <div class="pay-grid">
      <div class="pay-stat"><div class="pay-stat-val">${pp.wd}</div><div class="pay-stat-lbl">${isZh?"出勤日":"Hari Kerja"}</div></div>
      <div class="pay-stat"><div class="pay-stat-val">${pp.tH}h</div><div class="pay-stat-lbl">${isZh?"總工時":"Total Jam"}</div></div>
      <div class="pay-stat"><div class="pay-stat-val ot-val">${pp.oH}h</div><div class="pay-stat-lbl">${isZh?"加班":"Lembur"}</div></div>
    </div>
    <div class="pay-dates">
      <div class="pay-date-item"><span class="pay-date-icon">💰</span><span>${pay5}</span></div>
      <div class="pay-date-item"><span class="pay-date-icon">🏆</span><span>${pay20}</span></div>
    </div>
  </div>`;
}
setTimeout(()=>{const sp=document.getElementById("splash");if(sp)sp.remove()},2600);

let _renderRAF=null;
function render(){
  if(_renderRAF)cancelAnimationFrame(_renderRAF);
  _renderRAF=requestAnimationFrame(_doRender);
}
function _doRender(){
  _renderRAF=null;
  const a=document.getElementById("app");
  if(S.step==="type")a.innerHTML=rType();
  else if(S.step==="wiz")a.innerHTML=rWiz();
  else a.innerHTML=rCal();
  document.getElementById("mr").innerHTML=wxDetailShow?wxDetailHtml():tideDetailShow?tideDetailHtml():S.modal?rMod():S.showH?rHelp():S.showStats?rStats():"";
  document.querySelectorAll("[data-a]").forEach(el=>{el.onclick=handle});
}

function rType(){
  return`<div class="page"><div class="hero fu"><img src="${IMG.icon}"><h1>${t("app")}</h1><p>${t("desc")}</p></div>
  ${Object.entries(R).map(([k,v],i)=>`<button class="rcard fu d${i+1}" data-a="pick" data-k="${k}"><div class="rcard-icon">${k==="2on2off"?"2:2":k==="4on2off"?"4:2":"5:1"}</div><div class="rcard-info"><div class="rcard-name">${RN[lang][k]}</div><div class="rcard-sub">${v.h===12?t("s12"):t("s8")} · ${v.c.length}${t("cyc")}</div></div><div class="rcard-arrow">›</div></button>`).join("")}
  <div class="al-setup fu d3"><h3>${t("alSetup")}</h3><div class="al-setup-hint" style="margin-bottom:8px;font-size:11px;color:var(--green);font-weight:600">${alYRange(curALY())}</div><div class="al-setup-row"><label>${t("alTotal")}</label><input type="number" id="alTI" value="${getAL().total||''}" placeholder="0" min="0" step="0.5"></div><div class="al-setup-row"><label>${t("alUsed")}</label><input type="number" id="alUI" value="${getAL().used||''}" placeholder="0" min="0" step="0.5"></div><div class="al-setup-hint">${t("alSkip")}</div></div>
  <div style="text-align:center;margin-top:14px"><span class="lang-tog" style="display:inline-flex;height:36px;border-color:#ddd"><button class="lt-btn${lang==='zh'?' lt-on':''}" style="font-size:12px;padding:0 14px;color:${lang==='zh'?'var(--pri-d)':'var(--tx3)'}" data-a="lzh">中文</button><button class="lt-btn${lang==='id'?' lt-on':''}" style="font-size:12px;padding:0 14px;color:${lang==='id'?'var(--pri-d)':'var(--tx3)'}" data-a="lid">ID</button></span></div></div>`;
}

function rWiz(){
  const c=cyc();
  if(!S.wT){let loginBtn="";if(!fbAuthReady){loginBtn=`<div style="margin-top:18px;text-align:center;color:var(--tx3);font-size:11px">${lang==="zh"?"⏳ 檢查登入狀態...":"⏳ Checking login..."}</div>`}else if(!fbUser){loginBtn=`<div style="margin-top:18px;text-align:center"><button onclick="fbLogin()" style="background:#fff;border:1px solid #ddd;padding:10px 20px;border-radius:8px;font-size:12px;font-weight:600;color:var(--tx);cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:18px;height:18px">${lang==="zh"?"Google 登入恢復設定":"Login Google untuk restore"}</button></div>`}return wS(t("q1"),"1/3",`<div class="opts c2"><button class="opt-btn" data-a="wt" data-v="w"><img class="oi" src="${IMG.early}">${t("work")}</button><button class="opt-btn" data-a="wt" data-v="o"><img class="oi" src="${IMG.off}">${t("off")}</button></div>${loginBtn}<div class="al-setup fu d3" style="margin-top:14px"><h3>${t("alSetup")}</h3><div class="al-setup-hint" style="margin-bottom:8px;font-size:11px;color:var(--green);font-weight:600">${alYRange(curALY())}</div><div class="al-setup-row"><label>${t("alTotal")}</label><input type="number" id="alTI" value="${getAL().total||''}" placeholder="0" min="0" step="0.5"></div><div class="al-setup-row"><label>${t("alUsed")}</label><input type="number" id="alUI" value="${getAL().used||''}" placeholder="0" min="0" step="0.5"></div><div class="al-setup-hint">${t("alSkip")}</div></div>`);}
  if(S.wT==="w"&&!S.wS){const sh=[...new Set(c.filter(x=>x!=="休"))];return wS(t("q2w"),"2/3",`<div class="opts ${sh.length===3?'c3':'c2'}">${sh.map(s=>`<button class="opt-btn" data-a="ws" data-v="${s}"><img class="oi" src="${SI[s]}">${sf(s)}</button>`).join("")}</div>`);}
  if(S.wT==="o"&&!S.wN){const sh=[...new Set(c.filter(x=>x!=="休"))];return wS(t("q2o"),"2/3",`<div class="opts ${sh.length===3?'c3':'c2'}">${sh.map(s=>`<button class="opt-btn" data-a="wn" data-v="${s}"><img class="oi" src="${SI[s]}">→${sf(s)}</button>`).join("")}</div>`);}
  if(S.wT==="w"&&S.wS&&S.wD===null){let mx=0,cr=0;for(let i=0;i<c.length*2;i++){if(c[i%c.length]===S.wS){cr++;mx=Math.max(mx,cr)}else cr=0}return wS(t("q3w").replace("#s#",sf(S.wS)),"3/3",`<div class="opts c3">${Array.from({length:mx},(_,i)=>`<button class="opt-btn" data-a="wwd" data-v="${i+1}">${t("dn").replace("#n#",i+1)}</button>`).join("")}</div>`);}
  if(S.wT==="o"&&S.wN&&S.wD===null){let mx=0;for(let i=0;i<c.length;i++){if(c[i]!=="休")continue;let j=i;while(j<c.length&&c[j]==="休")j++;if(c[j%c.length]===S.wN)mx=Math.max(mx,j-i)}return wS(t("q3o"),"3/3",`<div class="opts ${mx<=4?'c2':'c3'}">${Array.from({length:mx},(_,i)=>`<button class="opt-btn" data-a="wod" data-v="${i+1}">${t("dn").replace("#n#",i+1)}</button>`).join("")}</div>`);}
  return"";
}
function wS(q,step,ct){return`<div class="page"><div class="wiz-top fu"><button class="wiz-back" data-a="wb">←</button><div class="wiz-info"><div class="wiz-step">STEP ${step}</div><div class="wiz-q">${q}</div></div><div class="wiz-badge">${RN[lang][S.rt]}</div></div><div class="fu d1">${ct}</div></div>`}

function rCal(){
  const r=rot(),c=cyc(),y=S.yr,m=S.mo,dm=dim(y,m),fd=fdw(y,m),ic=y===TY&&m===TM;
  const st={};for(let d=1;d<=dm;d++){const s=gs(y,m,d);if(s)st[s]=(st[s]||0)+1}
  const wk=Object.entries(st).filter(([s])=>s!=="休").reduce((a,[,v])=>a+v,0);
  const WK=t("wk");
  let cells="";for(let i=0;i<fd;i++)cells+=`<div></div>`;
  const pd5=getPayDay(y,m,5),pd20=getPayDay(y,m,20);
  for(let d=1;d<=dm;d++){const s=gs(y,m,d),td=ic&&d===TD,hol=gh(m,d),ev=EVS[ek(y,m,d)]||[],he=ev.length>0,dayAL=ALD[ek(y,m,d)],aev=hasAdminEv(ek(y,m,d)),dw=new Date(y,m-1,d).getDay(),isOff=(dw===0||dw===6||TW_OFF.has(hk(m,d))),isPay=(d===pd5||d===pd20);
    cells+=`<div class="day ${SC[s]}${td?' today':''}${he?' has-ev':''}${aev?' admin-ev':''}${isPay?' pay-day':''}" data-a="open" data-d="${d}"><span class="num">${d}</span><span class="sn">${sf(s)}</span>${td?'<span class="td">TODAY</span>':''}${d===pd5?'<span class="pay-tag">💰</span>':''}${d===pd20?'<span class="pay-tag">🏆</span>':''}${he?`<div class="evb">${ev.length}</div>`:''}${isOff?'<span class="hol-dot"></span>':''}${dayAL?'<span class="al-dot"></span>':''}${(()=>{const lc=getLeaves(ek(y,m,d));return lc.length?`<span class="leave-badge">${lc.length}</span>`:""})()}</div>`}
  const isPast=(dd)=>y<TY||(y===TY&&m<TM)||(y===TY&&m===TM&&dd<TD);
  const mh=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const h=gh(m,d);if(h)mh.push(`${m}/${d} ${h}`)}
  let holH=mh.length?`<div class="hol-strip">🎌 ${mh.join("　")}</div>`:"";
  let lvParts=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const lv=getLeaves(ek(y,m,d));if(lv.length)lvParts.push(`${m}/${d} ${lv.length}${lang==="zh"?"人請假":" cuti"}`)}
  let adParts=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const ae=getAdminEv(ek(y,m,d));if(ae.length)ae.forEach(t=>adParts.push(`${m}/${d} ${en(t)}`))}
  if(adParts.length)holH+=`<div class="hol-strip" style="background:rgba(198,40,40,.06);border-left-color:var(--red);color:var(--red)">📢 ${adParts.join("　")}</div>`;
  if(lvParts.length)holH+=`<div class="hol-strip" style="background:var(--amber-l);border-left-color:var(--amber);color:#b36b00">📋 ${lvParts.join("　")}</div>`;
  const rems=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const evs=EVS[ek(y,m,d)];if(evs&&evs.length){const s=gs(y,m,d),dw=new Date(y,m-1,d).getDay();evs.forEach(eid=>rems.push({d,dw,shift:sf(s),eid}))}}
  let remH="";if(rems.length){remH=`<div class="rem-sec"><div class="rem-title">${t("rem")}</div><div class="rem-list">${rems.map(r=>{const nm=r.eid==="custom"&&NOTES[ek(y,m,r.d)]?NOTES[ek(y,m,r.d)]:en(r.eid);return`<div class="rem-item" data-a="open" data-d="${r.d}"><div class="rem-date"><div class="d">${r.d}</div><div class="w">${WK[r.dw]}</div></div><div class="rem-info"><div class="rem-name">${nm}</div><div class="rem-shift">${r.shift}</div></div><div style="font-size:16px">${EE[r.eid]||"📌"}</div></div>`}).join("")}</div></div>`}
  let chips=Object.entries(st).map(([s,n])=>`<div class="dash-item"><div class="dash-val ${SC[s]}">${n}</div><div class="dash-lbl">${sf(s)}</div></div>`).join("");
  chips+=`<div class="dash-item"><div class="dash-val w">${wk}</div><div class="dash-lbl">${t("workD")}</div></div>`;
  const ot=calcOT(y,m,wk,r.h);
  const hH=`<div class="hours-card fi"><div class="hours-row"><span class="hours-label">${t("reqH")}</span><span class="hours-val">${ot.rH}h</span></div><div class="hours-row"><span class="hours-label">${t("totalH")}</span><span class="hours-val">${ot.tH}h</span></div><div class="hours-row"><span class="hours-label">${t("otH")} 🔥</span><span class="hours-val ot">${ot.oH}h</span></div></div>`;
  const alH=getAL().total>0?`<div class="al-bar fi"><span class="al-bar-label">🌴 ${t("alRem")} (${alYRange(curALY())})</span><span class="al-bar-val">${alRem()} ${t("hr")}</span></div>`:"";
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent),showI=(!!DP||isIOS)&&!S.instH;
  let instH="";if(showI){instH=`<div class="install-wrap"><div class="install-card"><img class="install-icon" src="${IMG.icon}"><div class="install-info"><div class="install-title">${t("instT")}</div><div class="install-sub">${DP?t("instS"):t("instSi")}</div></div>${DP?`<button class="install-btn" data-a="inst">${t("instB")}</button>`:''}<button class="install-x" data-a="hideI">✕</button></div></div>`}
  const ml=lang==="zh"?`${y}年${m}月`:`${m}/${y}`;
  let todayBarH="";if(ic){const ts=gs(TY,TM,TD);if(ts){const tImg=SI[ts]||"";const tsName=sf(ts);
    let restInfo="",restDays=0;
    if(ts!=="休"){for(let dd=1;dd<=30;dd++){const fd=new Date(TY,TM-1,TD+dd);if(gs(fd.getFullYear(),fd.getMonth()+1,fd.getDate())==="休"){restDays=dd;restInfo=(lang==="zh"?`${dd}天後休`:`${dd} hari lagi libur`);break}}}
    else{let streak=0;for(let dd=0;dd<=14;dd++){const fd=new Date(TY,TM-1,TD+dd);if(gs(fd.getFullYear(),fd.getMonth()+1,fd.getDate())==="休")streak++;else break}if(streak>1)restInfo=(lang==="zh"?"連休 "+streak+" 天":"Libur "+streak+" hari");else restInfo=(lang==="zh"?"今天休假":"Hari ini libur")}
    let apd5=getPayDay(TY,TM,5),apd20=getPayDay(TY,TM,20);
    let payDay5=apd5-TD,payDay20=apd20-TD;
    if(payDay5<0){const nm=TM===12?1:TM+1,ny=TM===12?TY+1:TY;payDay5=getPayDay(ny,nm,5)+dim(TY,TM)-TD}
    if(payDay20<0){const nm=TM===12?1:TM+1,ny=TM===12?TY+1:TY;payDay20=getPayDay(ny,nm,20)+dim(TY,TM)-TD}
    const payInfo=payDay5<=7?(lang==="zh"?`💰 ${payDay5===0?"今天發薪":payDay5+"天後發薪"}`:`💰 ${payDay5===0?"Gaji hari ini":payDay5+" hari lagi gaji"}`):(payDay20<=7?(lang==="zh"?`🏆 ${payDay20===0?"今天績效獎金":payDay20+"天後績效獎金"}`:`🏆 ${payDay20===0?"Bonus hari ini":payDay20+" hari lagi bonus"}`):"");
    todayBarH=`<div class="today-bar fi"><div class="today-bar-main"><div class="today-bar-shift"><img src="${tImg}"><span>${TM}/${TD} ${tsName}</span></div><div class="today-bar-rest">${restInfo}</div></div>${payInfo?`<div class="today-bar-pay">${payInfo}</div>`:""}</div>`}}
  return`<div class="top"><div class="top-left"><img class="top-logo" src="${IMG.icon}"><div class="top-info"><h1>${t("app")}</h1><span>${RN[lang][S.rt]}</span></div></div><div class="top-actions"><button class="top-btn primary" data-a="today">${t("today")}</button><button class="top-btn" data-a="stats">${lang==="zh"?"統計":"Stat"}</button><button class="top-btn" data-a="share">${lang==="zh"?"分享":"Share"}</button><span class="lang-tog"><button class="lt-btn${lang==='zh'?' lt-on':''}" data-a="lzh">中</button><button class="lt-btn${lang==='id'?' lt-on':''}" data-a="lid">ID</button></span><button class="top-btn" data-a="help">${t("help")}</button></div></div>
  <div class="mnav"><button class="mnav-btn" data-a="prev">◀</button><div class="mnav-title">${ml}</div><button class="mnav-btn" data-a="next">▶</button></div>
  <div class="wk-row">${WK.map((w,i)=>`<div class="wk-cell${i===0||i===6?' we':''}">${w}</div>`).join("")}</div>
  <div class="cal fi">${cells}</div>${holH}${remH}${todayBarH}${rainWarnHtml()}<div class="dash fi">${chips}</div>${payCardHtml(y,m)}${hH}${alH}${fbBarHtml()}${typeof wxHtml==='function'?wxHtml():''}
  <button class="sfx-btn" data-a="sfx">${WxSfx.isMuted()?'🔇':'🔊'}</button>
  <div style="height:${showI?'80':'12'}px"></div>${instH}`;
}

function rMod(){
  const{y,m,d}=S.modal,s=gs(y,m,d),hol=gh(m,d),ev=EVS[ek(y,m,d)]||[],dw=new Date(y,m-1,d).getDay();
  const WK=t("wk");const bg={"早":"rgba(0,77,86,.08)","晚":"var(--sec-l)","中":"rgba(158,96,0,.06)","休":"var(--green-l)"};
  let holL=hol?`<div style="padding:8px 10px;border-radius:8px;background:var(--red-l);margin-bottom:8px;font-size:11px;color:var(--red);font-weight:600">🎌 ${hol}</div>`:"";
  const evR=(EI.filter(id=>!ADMIN_EV.includes(id))).map(id=>{const a=ev.includes(id);return`<button class="ev-item${a?' on':''}" data-a="tev" data-eid="${id}"><span class="ev-emoji">${EE[id]}</span><span class="ev-name">${en(id)}</span><div class="ev-check">${a?'✓':''}</div></button>`}).join("");
  const ds=lang==="zh"?`${m}月${d}日 週${WK[dw]}`:`${WK[dw]}, ${d}/${m}/${y}`;
  const hasAL=ev.includes("annualL");const dayAL=ALD[ek(y,m,d)]||0;
  let alP="";if(hasAL){let opts="";for(let h=0.5;h<=12;h+=0.5){opts+=`<option value="${h}"${h===dayAL?' selected':''}>${h} ${t("hr")}</option>`}alP=`<div class="al-pick"><label>🌴 ${t("alPick")} (${t("alRem")}: ${alRem()}${t("hr")})</label><select id="alSel" data-a="alh">${opts}</select></div>`}
  const hasCust=ev.includes("custom");const custTxt=NOTES[ek(y,m,d)]||"";
  let custP="";if(hasCust){custP=`<div class="al-pick" style="border-color:var(--pri)"><label>📝 ${lang==="zh"?"備註內容":"Isi catatan"}</label><input type="text" id="custIn" value="${custTxt.replace(/"/g,'&quot;')}" placeholder="${lang==="zh"?"輸入備註...":"Tulis catatan..."}" maxlength="50" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px" oninput="NOTES['${ek(y,m,d)}']=this.value;sNotes()"></div>`}
  return`<div class="modal-bg" data-a="close"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div><div class="modal-title">${ds}</div><div class="modal-date">${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}</div>
  <div class="modal-shift" style="background:${bg[s]||'var(--pri-l)'}"><img src="${SI[s]}" style="width:28px;height:28px;border-radius:8px"><div class="modal-shift-name">${sf(s)}</div></div>${holL}${modalLeaveHtml(y,m,d)}${adminEvModalHtml(y,m,d)}<div class="modal-divider"></div><div class="modal-section">${t("mark")}</div><div class="ev-list">${evR}</div>${alP}${custP}
  <button class="modal-done" data-a="close">${t("done")}</button></div></div>`}

function fbBarHtml(){
  if(!firebase||!fbAuth)return"";
  if(!fbUser)return`<div class="fb-bar fi"><span style="color:var(--tx3)">${lang==="zh"?"登入可同步請假資料":"Login untuk sync cuti"}</span><button onclick="fbLogin()">${lang==="zh"?"Google 登入":"Login Google"}</button></div>`;
  const pic=fbUser.photoURL?`<img class="fb-avatar" src="${fbUser.photoURL}" referrerpolicy="no-referrer">`:"";
  const name=fbUser.displayName||fbUser.email||"";
  return`<div class="fb-bar fi"><div class="fb-user">${pic}<span>${name}</span></div><button onclick="fbLogout()" style="background:var(--tx3)">${lang==="zh"?"登出":"Logout"}</button></div>`;
}
function modalLeaveHtml(y,m,d){
  const date=ek(y,m,d),leaves=getLeaves(date),ml=myLeave(date);
  let html="";
  if(leaves.length){
    html+=`<div class="leave-info">${lang==="zh"?"📋 今日 "+leaves.length+" 人請假":"📋 "+leaves.length+" orang cuti"}${isAdmin()?`<div class="leave-list">${leaves.map(l=>`<span>${l.name}</span>`).join("")}</div>`:""}</div>`;
  }
  if(fbUser){
    if(ml){
      html+=`<button class="modal-done" style="background:var(--red);margin-bottom:8px" onclick="removeLeave('${date}')">${lang==="zh"?"取消我的請假":"Batalkan cuti"}</button>`;
    }else{
      html+=`<button class="modal-done" style="background:var(--amber);margin-bottom:8px" onclick="addLeave('${date}','leave')">${lang==="zh"?"📋 我要請假":"📋 Ajukan cuti"}</button>`;
    }
  }
  if(isAdmin()){
    html+=`<div class="admin-leave-edit"><label>👑 ${lang==="zh"?"管理員：手動設定請假人數":"Admin: Set jumlah cuti"}</label><div style="margin-top:4px;display:flex;align-items:center;gap:4px"><input type="number" id="adminLeaveN" min="0" value="${leaves.length}" placeholder="0"><button onclick="adminSetLeave('${date}')" style="background:var(--pri);color:#fff;border:none;padding:5px 12px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer">${lang==="zh"?"確認":"OK"}</button></div></div>`;
  }
  return html;
}
async function adminSetLeave(date){
  if(!isAdmin())return;
  const n=parseInt(document.getElementById("adminLeaveN").value)||0;
  const current=getLeaves(date);
  const adminEntries=current.filter(l=>l.uid.startsWith("admin_"));
  for(const e of adminEntries){await fbDb.collection("leaves").doc(e.uid+"_"+date).delete()}
  const realCount=current.filter(l=>!l.uid.startsWith("admin_")).length;
  const need=n-realCount;
  if(need<0){alert(lang==="zh"?"已有 "+realCount+" 人實際請假，無法設低於此數":realCount+" orang sudah cuti, tidak bisa kurang");loadLeaves();return;}
  for(let i=0;i<need;i++){const id="admin_"+i+"_"+date;await fbDb.collection("leaves").doc(id).set({uid:"admin_"+i,name:lang==="zh"?"員工":"Staff",date:date,ym:date.slice(0,7),type:"leave",ts:firebase.firestore.FieldValue.serverTimestamp()})}
  loadLeaves();
}
function adminEvModalHtml(y,m,d){
  const date=ek(y,m,d),aevs=getAdminEv(date);
  let html="";
  if(aevs.length){
    html+=`<div style="margin:6px 0;padding:7px 10px;background:rgba(198,40,40,.08);border-left:3px solid var(--red);border-radius:3px;font-size:11px;color:var(--red);font-weight:600">${aevs.map(t=>(EE[t]||"📌")+" "+en(t)).join("　")}</div>`;
  }
  if(isAdmin()){
    ADMIN_EV.forEach(type=>{
      const active=aevs.includes(type);
      html+=`<button class="modal-done" style="background:${active?'var(--red)':'var(--tx3)'};margin-bottom:6px;font-size:11px" onclick="${active?`removeAdminEvBtn('${date}','${type}')`:`addAdminEvBtn('${date}','${type}')`}">${EE[type]} ${active?(lang==="zh"?"取消":"Batal"):(lang==="zh"?"設定":"Set")} ${en(type)}</button>`;
    });
  }
  return html;
}
function addAdminEvBtn(date,type){setAdminEv(date,type,true)}
function removeAdminEvBtn(date,type){setAdminEv(date,type,false)}
function tideHtml(){
  if(tideErr)return"";
  if(wxData&&!tideData&&!tideErr)return`<div class="tide-card fi"><div style="font-size:11px;color:var(--tx3);text-align:center;padding:6px">🌊 ${lang==="zh"?"潮汐載入中...":"Memuat pasang surut..."}</div></div>`;
  if(!tideData||!tideData.tides||!tideData.tides.length)return"";
  const wk=t("wk");
  const byDate={};
  tideData.tides.forEach(t=>{if(!byDate[t.date])byDate[t.date]=[];byDate[t.date].push(t)});
  const dates=Object.keys(byDate).sort().slice(0,7);
  const fc=dates.map((date,i)=>{
    const dt=new Date(date),dw=dt.getDay();
    const items=byDate[date];
    const hi=items.filter(x=>x.type==="滿潮").sort((a,b)=>b.height-a.height)[0];
    const lo=items.filter(x=>x.type==="乾潮").sort((a,b)=>a.height-b.height)[0];
    return`<div class="tide-day${i===0?' today':''}" onclick="showTideDetail('${date}');event.stopPropagation()"><div class="wx-day-name">${i===0?(lang==="zh"?"今天":"Hari ini"):wk[dw]}</div><div style="font-size:9px;color:var(--red);font-weight:600">▲${hi?hi.time.slice(11,16):""}</div><div style="font-size:12px;font-weight:700;color:var(--red)">${hi?hi.height+"cm":""}</div><div style="font-size:9px;color:#1565c0;font-weight:600">▼${lo?lo.time.slice(11,16):""}</div><div style="font-size:10px;color:#1565c0">${lo?lo.height+"cm":""}</div></div>`}).join("");
  return`<div class="tide-card fi"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:12px;font-weight:700">🌊 ${tideData.station} ${lang==="zh"?"潮汐預報":"Pasang Surut"}</div><div style="font-size:9px;color:var(--tx3)">▸ ${lang==="zh"?"點選看詳情":"Ketuk detail"}</div></div><div class="tide-fc">${fc}</div></div>`}

let wxDetailShow=false,wxDetailDay=0,tideDetailShow=false,tideDetailDay=0;
function showWxDetail(){wxDetailShow=true;wxDetailDay=0;render()}
function showTideDetail(d){tideDetailShow=true;tideDetailDay=d||0;render()}
function closeWxDetail(){wxDetailShow=false;render()}
function closeTideDetail(){tideDetailShow=false;render()}

function wxDetailHtml(){
  if(!wxDetailShow||!wxData)return"";
  const desc=lang==="zh"?WXZ:WXD;
  let rows="";
  const today=wxData.days[wxDetailDay].date;
  for(let h=0;h<24;h++){
    const k=today+"T"+String(h).padStart(2,"0")+":00";
    const i=wxData.hTime.indexOf(k);if(i<0)continue;
    const tmp=wxData.hTemp?Math.round(wxData.hTemp[i]):"--";
    const prec=wxData.hPrec?wxData.hPrec[i]+"%":"--";
    const wind=wxData.hWind?wxData.hWind[i].toFixed(0)+"km/h":"--";
    const hum=wxData.hHum?wxData.hHum[i]+"%":"--";
    const code=wxData.hCode?wxData.hCode[i]:0;
    rows+=`<div class="cell">${String(h).padStart(2,"0")}:00</div><div class="cell">${WXI[code]||""} ${tmp}°</div><div class="cell">${prec}</div><div class="cell">${wind}</div><div class="cell">${hum}</div>`;
  }
  const dayTabs=wxData.days.map((d,i)=>{const dt=new Date(d.date);return`<button onclick="wxDetailDay=${i};render();event.stopPropagation()" style="padding:4px 8px;border:none;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;${i===wxDetailDay?'background:var(--pri);color:#fff':'background:#eee;color:var(--tx2)'}">${i===0?(lang==="zh"?"今天":"Hari ini"):t("wk")[dt.getDay()]}</button>`}).join("");
  return`<div class="wx-detail" onclick="closeWxDetail()"><div class="wx-detail-sheet" onclick="event.stopPropagation()"><div class="wx-detail-title">${lang==="zh"?"⛅ 每小時天氣":"⛅ Cuaca Per Jam"}</div><div style="display:flex;gap:4px;overflow-x:auto;margin-bottom:10px">${dayTabs}</div><div class="wx-detail-grid"><div class="hdr">${lang==="zh"?"時間":"Jam"}</div><div class="hdr">${lang==="zh"?"天氣":"Cuaca"}</div><div class="hdr">${lang==="zh"?"降雨":"Hujan"}</div><div class="hdr">${lang==="zh"?"風速":"Angin"}</div><div class="hdr">${lang==="zh"?"濕度":"Humid"}</div>${rows}</div><button class="modal-done" onclick="closeWxDetail()" style="margin-top:12px">${t("done")}</button></div></div>`}

function tideDetailHtml(){
  if(!tideDetailShow||!tideData||!tideData.tides)return"";
  const wk=t("wk");
  const byDate={};
  tideData.tides.forEach(t=>{if(!byDate[t.date])byDate[t.date]=[];byDate[t.date].push(t)});
  const dates=Object.keys(byDate).sort().slice(0,7);
  const selDate=typeof tideDetailDay==="string"?tideDetailDay:dates[0];
  const items=(byDate[selDate]||[]).sort((a,b)=>a.time.localeCompare(b.time));
  let rows=items.map(item=>{
    const isHi=item.type==="滿潮";
    return`<div class="cell" style="font-weight:600">${item.time.slice(11,16)}</div><div class="cell" style="color:${isHi?"var(--red)":"#1565c0"};font-weight:700">${isHi?"▲ "+(lang==="zh"?"滿潮":"Pasang"):"▼ "+(lang==="zh"?"乾潮":"Surut")}</div><div class="cell" style="font-size:14px;font-weight:700">${item.height} cm</div>`;
  }).join("");
  const dayTabs=dates.map((d,i)=>{const dt=new Date(d);return`<button onclick="tideDetailDay='${d}';render();event.stopPropagation()" style="padding:4px 8px;border:none;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;${d===selDate?'background:var(--pri);color:#fff':'background:#eee;color:var(--tx2)'}">${i===0?(lang==="zh"?"今天":"Hari ini"):wk[dt.getDay()]}</button>`}).join("");
  return`<div class="wx-detail" onclick="closeTideDetail()"><div class="wx-detail-sheet" onclick="event.stopPropagation()"><div class="wx-detail-title">🌊 ${tideData.station} ${lang==="zh"?"潮汐詳情":"Detail Pasang Surut"}</div><div style="display:flex;gap:4px;overflow-x:auto;margin-bottom:10px">${dayTabs}</div><div style="display:grid;grid-template-columns:70px 1fr 80px;gap:2px;font-size:12px"><div class="hdr">${lang==="zh"?"時間":"Jam"}</div><div class="hdr">${lang==="zh"?"潮汐":"Pasut"}</div><div class="hdr">${lang==="zh"?"潮位(cm)":"Tinggi(cm)"}</div>${rows}</div><div style="margin-top:10px;font-size:9px;color:var(--tx3);text-align:center">${lang==="zh"?"資料來源：中央氣象署 · 潮位：相對臺灣高程系統(cm)":"Sumber: CWA Taiwan"}</div><button class="modal-done" onclick="closeTideDetail()" style="margin-top:8px">${t("done")}</button></div></div>`}

function rHelp(){
  const steps=t("h");
  const isZh=lang==="zh";
  const colorLegend=`<div class="help-section">
    <div class="help-sec-title">${isZh?"📅 班表顏色說明":"📅 Warna Jadwal"}</div>
    <div class="help-colors">
      <div class="help-color-item"><div class="help-swatch" style="background:#d0eff5;border:1px solid #9dd8e6"></div><span>${isZh?"早班":"Pagi"}</span></div>
      <div class="help-color-item"><div class="help-swatch" style="background:#ddd0ec;border:1px solid #c0a9dc"></div><span>${isZh?"晚班":"Malam"}</span></div>
      <div class="help-color-item"><div class="help-swatch" style="background:#ffeecf;border:1px solid #ffd88a"></div><span>${isZh?"中班":"Siang"}</span></div>
      <div class="help-color-item"><div class="help-swatch" style="background:#f5f5f5;border:1px solid #e8e8e8"></div><span>${isZh?"休假":"Libur"}</span></div>
    </div>
  </div>
  <div class="help-section">
    <div class="help-sec-title">${isZh?"🔖 日曆標記說明":"🔖 Tanda Kalender"}</div>
    <div class="help-marks">
      <div class="help-mark-item"><div class="help-mark-demo" style="border:2.5px solid #ff6d00;background:rgba(255,109,0,.07);border-radius:5px;width:32px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">28</div><span>${isZh?"今天":"Hari ini"}</span></div>
      <div class="help-mark-item"><div class="help-mark-demo" style="border-radius:5px;width:32px;height:28px;position:relative;background:#d0eff5;border:1px solid #9dd8e6;overflow:hidden"><div style="position:absolute;top:0;left:0;right:0;height:2.5px;background:#c62828;border-radius:2px 2px 0 0"></div></div><span>${isZh?"國定假日 / 週末":"Libur nasional"}</span></div>
      <div class="help-mark-item"><div class="help-mark-demo" style="border:2px solid #e68a00;border-radius:5px;width:32px;height:28px;display:flex;align-items:center;justify-content:center;position:relative"><div style="position:absolute;top:-3px;right:-3px;min-width:13px;height:13px;border-radius:3px;background:#c62828;color:#fff;font-size:7px;font-weight:800;display:flex;align-items:center;justify-content:center">1</div></div><span>${isZh?"有標記事項":"Ada catatan"}</span></div>
      <div class="help-mark-item"><div class="help-mark-demo" style="border-radius:5px;width:32px;height:28px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;position:relative"><div style="position:absolute;bottom:1px;left:2px;min-width:13px;height:13px;border-radius:3px;background:#e68a00;color:#fff;font-size:7px;font-weight:800;display:flex;align-items:center;justify-content:center">2</div></div><span>${isZh?"請假人數":"Jumlah cuti"}</span></div>
      <div class="help-mark-item"><div class="help-mark-demo" style="border-radius:5px;width:32px;height:28px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;position:relative"><div style="position:absolute;bottom:1px;right:2px;width:5px;height:5px;border-radius:50%;background:#2e7d32"></div></div><span>${isZh?"已排特休":"Pakai cuti"}</span></div>
      <div class="help-mark-item"><div class="help-mark-demo" style="border:2px solid #1565c0;border-radius:5px;width:32px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;position:relative"><span style="font-size:9px">5</span><span style="position:absolute;bottom:0;right:1px;font-size:8px">💰</span></div><span>${isZh?"發薪日（每月5日，遇假日提前）":"Gaji (tgl 5, maju jika libur)"}</span></div>
      <div class="help-mark-item"><div class="help-mark-demo" style="border:2px solid #1565c0;border-radius:5px;width:32px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;position:relative"><span style="font-size:9px">20</span><span style="position:absolute;bottom:0;right:1px;font-size:8px">🏆</span></div><span>${isZh?"績效獎金（每月20日，遇假日提前）":"Bonus (tgl 20, maju jika libur)"}</span></div>
    </div>
  </div>
  <div class="help-section">
    <div class="help-sec-title">${isZh?"💳 薪資計算說明":"💳 Perhitungan Gaji"}</div>
    <div class="help-step" style="background:rgba(21,101,194,.05);border-left:3px solid #1565c0">
      <div class="help-num" style="background:#1565c0">$</div>
      <div class="help-txt">
        <h3>${isZh?"薪資計算週期":"Periode Perhitungan"}</h3>
        <p>${isZh?"每月薪資計算區間為上月 26 日至當月 25 日。例如 3 月薪水計算的是 2/26 ~ 3/25 的出勤與加班時數。":"Periode gaji dihitung dari tanggal 26 bulan lalu sampai tanggal 25 bulan ini."}</p>
      </div>
    </div>
    <div class="help-step" style="background:rgba(21,101,194,.05);border-left:3px solid #1565c0">
      <div class="help-num" style="background:#1565c0">💰</div>
      <div class="help-txt">
        <h3>${isZh?"發薪日與獎金日":"Gaji & Bonus"}</h3>
        <p>${isZh?"每月 5 日發放薪資，每月 20 日發放績效獎金。遇國定假日或週末則提前至前一個工作日。日曆上以 💰 和 🏆 標示實際發放日。":"Gaji tanggal 5, bonus tanggal 20. Jika jatuh di hari libur/weekend, dimajukan ke hari kerja sebelumnya. Ditandai 💰 dan 🏆."}</p>
      </div>
    </div>
  </div>
  <div class="help-section">
    <div class="help-sec-title">${isZh?"📋 功能說明":"📋 Panduan Fitur"}</div>`;
  const stepsHtml=steps.map((s,i)=>{const[title,desc]=s.split("|");return`<div class="help-step"><div class="help-num">${i+1}</div><div class="help-txt"><h3>${title}</h3><p>${desc}</p></div></div>`}).join("");
  return`<div class="modal-bg" data-a="closeH"><div class="modal-sheet help-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div><div class="help-header"><div class="help-header-icon"><img src="${IMG.icon}" style="width:40px;height:40px;border-radius:10px"></div><div><div class="modal-title" style="text-align:left;font-size:18px">${isZh?"我的班表 使用說明":"My Shift Panduan"}</div><div style="font-size:11px;color:var(--tx3);margin-top:2px">${isZh?"華新麗華 輪班管理系統":"Sistem Manajemen Shift"}</div></div></div><div style="height:16px"></div>
  ${colorLegend}${stepsHtml}</div>
  <div style="margin-top:16px;padding-top:14px;border-top:1px solid #eee">
    <button class="modal-done" data-a="closeH">${t("done")}</button>
    <button class="modal-done" data-a="reset" style="background:var(--red);margin-top:6px">${isZh?"⚠️ 重新設定班表":"⚠️ Reset Jadwal"}</button>
  </div></div></div>`}

function rW(sh,day){const c=cyc();for(let i=0;i<c.length;i++){if(c[i]!==sh)continue;let n=1;for(let j=i-1;j>=0;j--){if(c[j]===sh)n++;else break}if(n===day)return i}return 0}
function rO(nx,day){const c=cyc();for(let i=0;i<c.length;i++){if(c[i]!=="休")continue;let j=i;while(j<c.length&&c[j]==="休")j++;if(c[j%c.length]!==nx)continue;let n=1;for(let k=i-1;k>=0;k--){if(c[k]==="休")n++;else break}if(n===day)return i}return 0}

function handle(e){
  const el=e.currentTarget,a=el.dataset.a;
  switch(a){
    case "pick":{const ti=document.getElementById("alTI"),ui=document.getElementById("alUI");setAL(parseFloat(ti&&ti.value)||0,parseFloat(ui&&ui.value)||0);S.rt=el.dataset.k;S.step="wiz";S.wT=S.wS=S.wN=S.wD=null;break}
    case "wb":if(S.wD!==null)S.wD=null;else if(S.wS)S.wS=null;else if(S.wN)S.wN=null;else if(S.wT)S.wT=null;break;
    case "wt":{const ti=document.getElementById("alTI"),ui=document.getElementById("alUI");if(ti||ui)setAL(parseFloat(ti&&ti.value)||0,parseFloat(ui&&ui.value)||0);S.wT=el.dataset.v==="w"?"w":"o";S.wD=null;S.wS=null;S.wN=null;break}
    case "ws":S.wS=el.dataset.v;S.wD=null;break;
    case "wn":S.wN=el.dataset.v;S.wD=null;break;
    case "wwd":{S.wD=+el.dataset.v;const ci=rW(S.wS,S.wD),c=cyc(),todOff=Math.round((TR-EPOCH)/864e5);S.pos=((ci-todOff%c.length)+c.length*1000)%c.length;S.step="cal";sv();break;}
    case "wod":{S.wD=+el.dataset.v;const ci=rO(S.wN,S.wD),c=cyc(),todOff=Math.round((TR-EPOCH)/864e5);S.pos=((ci-todOff%c.length)+c.length*1000)%c.length;S.step="cal";sv();break;}
    case "prev":if(S.mo===1){S.yr--;S.mo=12}else S.mo--;loadLeaves();loadAdminEv();break;
    case "next":if(S.mo===12){S.yr++;S.mo=1}else S.mo++;loadLeaves();loadAdminEv();break;
    case "today":S.yr=TY;S.mo=TM;break;
    case "reset":S.step="wiz";S.rt="4on2off";S.pos=null;S.wT=S.wS=S.wN=S.wD=null;try{localStorage.removeItem("sb_c")}catch(e){}sCk("sb_c","",0);if(fbUser){fbDb.collection("users").doc(fbUser.uid).update({rt:firebase.firestore.FieldValue.delete(),pos:firebase.firestore.FieldValue.delete(),ep:firebase.firestore.FieldValue.delete()}).catch(()=>{})}break;
    case "open":S.modal={y:S.yr,m:S.mo,d:+el.dataset.d};break;
    case "close":S.modal=null;break;
    case "help":S.showH=true;break;
    case "sfx":WxSfx.initAudio();WxSfx.toggle();return;
    case "share":shareCalendar();return;
    case "stats":S.showStats=true;S.statsYr=TY;break;
    case "closeStats":S.showStats=false;break;

    case "closeH":S.showH=false;break;
    case "lzh":lang="zh";try{localStorage.setItem("sb_l",lang)}catch(e){}sCk("sb_l",lang,3650);cloudSave();break;
    case "lid":lang="id";try{localStorage.setItem("sb_l",lang)}catch(e){}sCk("sb_l",lang,3650);cloudSave();break;
    case "lang":lang=lang==="zh"?"id":"zh";try{localStorage.setItem("sb_l",lang)}catch(e){}break;
    case "tev":{const{y,m,d}=S.modal;const k=ek(y,m,d),eid=el.dataset.eid;if(!EVS[k])EVS[k]=[];const i=EVS[k].indexOf(eid);if(i>=0){EVS[k].splice(i,1);if(eid==="annualL")delete ALD[k];if(eid==="custom"){delete NOTES[k];sNotes()}}else{EVS[k].push(eid);if(eid==="annualL"&&!ALD[k])ALD[k]=4}if(!EVS[k].length)delete EVS[k];sEv();sAL();break}
    case "alh":{const{y,m,d}=S.modal;const sel=document.getElementById("alSel");if(sel)ALD[ek(y,m,d)]=parseFloat(sel.value);sAL();return}
    case "inst":if(DP){DP.prompt();DP.userChoice.then(()=>{DP=null;render()})}break;
    case "hideI":S.instH=true;break;
    case "wxR":wxErr=false;wxData=null;render();loadWx();return;
  }
  render();
}
let wxData=null,wxErr=false;
try{render();}catch(e){document.getElementById("app").innerHTML="<div style='padding:20px;color:red;font-size:14px;word-break:break-all'><b>ERROR:</b><br>"+e.message+"</div>";}
// ═══ SWIPE GESTURE ═══
(function(){
  let sx=0,sy=0,swiping=false;
  document.addEventListener("touchstart",e=>{
    if(S.step!=="cal"||S.modal||S.showH||wxDetailShow||tideDetailShow)return;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;swiping=true;
  },{passive:true});
  document.addEventListener("touchend",e=>{
    if(!swiping)return;swiping=false;
    const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*0.7)return;
    if(dx<0){if(S.mo===12){S.yr++;S.mo=1}else S.mo++;loadLeaves();loadAdminEv();render()}
    else{if(S.mo===1){S.yr--;S.mo=12}else S.mo--;loadLeaves();loadAdminEv();render()}
  },{passive:true});
})();







// ═══ WEATHER ═══
const WXI={0:"☀️",1:"🌤",2:"⛅",3:"☁️",45:"🌫",48:"🌫",51:"🌦",53:"🌧",55:"🌧",61:"🌧",63:"🌧️",65:"🌧️",71:"🌨",73:"🌨",75:"❄️",80:"🌦",81:"🌧",82:"⛈",95:"⛈"};
const WXZ={0:"晴天",1:"大致晴",2:"局部多雲",3:"多雲",45:"霧",48:"霧",51:"小雨",53:"中雨",55:"大雨",61:"小雨",63:"中雨",65:"大雨",71:"小雪",73:"中雪",75:"大雪",80:"陣雨",81:"陣雨",82:"暴雨",95:"雷雨"};
const WXD={0:"Cerah",1:"Cerah",2:"Berawan",3:"Mendung",45:"Kabut",48:"Kabut",51:"Gerimis",53:"Hujan",55:"Hujan Lebat",61:"Hujan",63:"Hujan",65:"Hujan Lebat",71:"Salju",80:"Hujan",81:"Hujan",82:"Badai",95:"Petir"};
let tideData=null,tideErr=false;
async function loadWx(){
  try{
    const pos=await new Promise((ok,no)=>{navigator.geolocation.getCurrentPosition(ok,no,{timeout:8000,maximumAge:600000})});
    const lat=pos.coords.latitude.toFixed(2),lon=pos.coords.longitude.toFixed(2);
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=precipitation_probability,temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto&forecast_days=7`;
    const data=await(await fetch(url)).json();
    wxData={temp:Math.round(data.current.temperature_2m),code:data.current.weather_code,lat:lat,lon:lon,
      days:data.daily.time.map((t,i)=>({date:t,code:data.daily.weather_code[i],hi:Math.round(data.daily.temperature_2m_max[i]),lo:Math.round(data.daily.temperature_2m_min[i])})),
      hTime:data.hourly.time,hPrec:data.hourly.precipitation_probability,hTemp:data.hourly.temperature_2m,hCode:data.hourly.weather_code,hWind:data.hourly.wind_speed_10m,hHum:data.hourly.relative_humidity_2m};
    wxErr=false;
    // Tide via Cloudflare Worker proxy → CWA API
    try{
      const tResp=await Promise.race([fetch('https://cwa-tide.onerkk.workers.dev'),new Promise((_,r)=>setTimeout(()=>r("timeout"),10000))]);
      const td=await tResp.json();
      const forecasts=td.records?.TideForecasts||[];
      if(forecasts.length){
        let best=forecasts[0],bD=9999;
        forecasts.forEach(f=>{const lo=f.Location;if(lo){const d=Math.sqrt((lo.Latitude-lat)**2+(lo.Longitude-lon)**2);if(d<bD){bD=d;best=f}}});
        const loc=best.Location;
        const tides=[];
        (loc.TimePeriods?.Daily||[]).forEach(day=>{
          (day.Time||[]).forEach(t=>{
            tides.push({date:day.Date,time:t.DateTime||"",type:t.Tide||"",height:parseInt(t.TideHeights?.AboveTWVD)||0});
          });
        });
        if(tides.length){tideData={station:loc.LocationName||"",tides:tides};tideErr=false}
        else{tideData=null;tideErr=true}
      }else{tideData=null;tideErr=true}
    }catch(e){tideData=null;tideErr=true}
  }catch(e){wxErr=true;wxData=null}
  render();
  if(wxData){
    let curPrec=0,curWind=0;
    if(wxData.hTime){const n=new Date();const nh=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0")+"T"+String(n.getHours()).padStart(2,"0");const hi=wxData.hTime.findIndex(t=>t.startsWith(nh));if(hi>=0){curPrec=wxData.hPrec?wxData.hPrec[hi]||0:0;curWind=wxData.hWind?wxData.hWind[hi]||0:0}}
    WxFx.update(wxData.code,wxData.temp,curPrec,curWind);
  }else WxFx.update(null,0,0,0);
}

const SHIFT_HR={"早":[6,7,8],"中":[13,14,15],"晚":[18,19,20]};
function rainWarnHtml(){
  if(!wxData||!wxData.hPrec||S.step!=="cal")return"";
  const sh=gs(TY,TM,TD);if(!sh||sh==="休")return"";
  const hrs=SHIFT_HR[sh];if(!hrs)return"";
  const ds=`${TY}-${String(TM).padStart(2,"0")}-${String(TD).padStart(2,"0")}`;
  let mx=0;
  hrs.forEach(h=>{const k=ds+"T"+String(h).padStart(2,"0")+":00";const i=wxData.hTime.indexOf(k);if(i>=0&&wxData.hPrec[i]>mx)mx=wxData.hPrec[i]});
  if(mx<40)return"";
  const sn=lang==="zh"?{"早":"早班","中":"中班","晚":"晚班"}[sh]:{"早":"Pagi","中":"Siang","晚":"Malam"}[sh];
  const tr=`${String(hrs[0]).padStart(2,"0")}:00-${String(hrs[hrs.length-1]+1).padStart(2,"0")}:00`;
  const tip=lang==="zh"?`🌂 ${sn}出門注意！${tr} 降雨機率 ${mx}%，建議攜帶雨具`:`🌂 ${sn}: hujan ${mx}% (${tr}), bawa payung!`;
  const bg=mx>=70?"var(--red-l)":"var(--amber-l)",bc=mx>=70?"var(--red)":"var(--amber)",tc=mx>=70?"var(--red)":"#b36b00";
  return`<div class="rain-warn fi" style="margin:4px 0;padding:7px 10px;background:${bg};border-left:3px solid ${bc};border-radius:3px;font-size:10px;font-weight:600;color:${tc}">${tip}</div>`
}
function wxHtml(){
  if(wxErr)return`<div class="wx-card fi"><div class="wx-err">🌡️ <button data-a="wxR">${lang==="zh"?"載入天氣":"Muat Cuaca"}</button></div></div>`;
  if(!wxData)return`<div class="wx-card fi"><div class="wx-loading">🌡️ ${lang==="zh"?"載入天氣中...":"Memuat cuaca..."}</div></div>`;
  const d=wxData,wk=t("wk"),desc=lang==="zh"?WXZ:WXD;
  const fc=d.days.map((f,i)=>{const dt=new Date(f.date),dw=dt.getDay();
    return`<div class="wx-day${i===0?' today':''}"><div class="wx-day-name">${i===0?(lang==="zh"?"今天":"Hari ini"):wk[dw]}</div><div class="wx-day-icon">${WXI[f.code]||"🌡"}</div><div class="wx-day-hi">${f.hi}°</div><div class="wx-day-lo">${f.lo}°</div></div>`}).join("");
  return`<div class="wx-card fi" onclick="showWxDetail()" style="cursor:pointer"><div class="wx-head"><div class="wx-now"><div class="wx-now-icon">${WXI[d.code]||"🌡"}</div><div><div class="wx-now-temp">${d.temp}°C</div><div class="wx-now-desc">${desc[d.code]||""}</div></div></div><div class="wx-loc">${lang==="zh"?"7日天氣預報 ▸":"Prakiraan 7 Hari ▸"}</div></div><div class="wx-fc">${fc}</div></div>${tideHtml()}`}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if(navigator.geolocation)loadWx();else WxFx.update(null,0,0,0);
loadAdminEv();


// ═══ SHARE CALENDAR ═══
async function shareCalendar(){
  const isZh=lang==="zh";
  const y=S.yr,m=S.mo,dm=dim(y,m),fd=fdw(y,m);
  const r=rot(),c=cyc();
  const W=390,cellW=W/7,cellH=44,pad=16;
  const headerH=50,wkH=28;
  const rows=Math.ceil((fd+dm)/7);
  const calH=rows*cellH;
  const footerH=60;
  const H=headerH+wkH+calH+footerH+pad*2;
  
  const cv=document.createElement("canvas");cv.width=W*2;cv.height=H*2;
  const cx=cv.getContext("2d");cx.scale(2,2);
  
  // BG
  cx.fillStyle="#f0f2f5";cx.fillRect(0,0,W,H);
  
  // Header
  cx.fillStyle="#00897b";cx.fillRect(0,0,W,headerH);
  cx.fillStyle="#fff";cx.font="bold 18px 'Noto Sans TC',sans-serif";
  const ml=isZh?`${y}年${m}月`:`${m}/${y}`;
  cx.textAlign="center";cx.fillText(ml,W/2,32);
  cx.font="11px 'Noto Sans TC',sans-serif";cx.fillStyle="rgba(255,255,255,.6)";
  const rn=RN[lang][S.rt];cx.fillText(rn,W/2,46);
  
  // Weekday row
  const wy=headerH;
  cx.fillStyle="#00695c";cx.fillRect(0,wy,W,wkH);
  const WK=t("wk");
  cx.font="bold 10px 'Noto Sans TC',sans-serif";cx.textAlign="center";
  WK.forEach((w,i)=>{cx.fillStyle=(i===0||i===6)?"#ffab91":"rgba(255,255,255,.8)";cx.fillText(w,i*cellW+cellW/2,wy+18)});
  
  // Calendar cells
  const calY=headerH+wkH;
  const shiftBg={"早":"#d0eff5","晚":"#ddd0ec","中":"#ffeecf","休":"#f5f5f5"};
  const shiftTx={"早":"#004d56","晚":"#311b6b","中":"#7a4700","休":"#b0b0b0"};
  
  for(let d=1;d<=dm;d++){
    const col=(fd+d-1)%7,row=Math.floor((fd+d-1)/7);
    const x=col*cellW,yy=calY+row*cellH;
    const s=gs(y,m,d);
    const ic=y===TY&&m===TM&&d===TD;
    
    cx.fillStyle=shiftBg[s]||"#fff";
    cx.fillRect(x+1,yy+1,cellW-2,cellH-2);
    
    if(ic){cx.strokeStyle="#ff6d00";cx.lineWidth=2;cx.strokeRect(x+1,yy+1,cellW-2,cellH-2)}
    
    cx.fillStyle=shiftTx[s]||"#333";cx.font="bold 14px 'Noto Sans TC',sans-serif";
    cx.textAlign="center";cx.fillText(String(d),x+cellW/2,yy+20);
    cx.font="bold 11px 'Noto Sans TC',sans-serif";
    cx.fillText(sf(s),x+cellW/2,yy+36);
  }
  
  // Footer
  const fy=calY+calH+8;
  cx.fillStyle="#fff";cx.fillRect(pad,fy,W-pad*2,footerH-16);
  cx.fillStyle="#1a1a1a";cx.font="bold 11px 'Noto Sans TC',sans-serif";cx.textAlign="left";
  cx.fillText(isZh?"我的班表 · 華新麗華":"My Shift · Walsin Lihwa",pad+8,fy+22);
  cx.fillStyle="#999";cx.font="10px 'Noto Sans TC',sans-serif";
  const now=new Date();cx.fillText(isZh?`產生於 ${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`:`Generated ${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`,pad+8,fy+38);
  
  cv.toBlob(async blob=>{
    if(!blob)return;
    const file=new File([blob],`shift-${y}-${m}.png`,{type:"image/png"});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({title:isZh?"我的班表":"My Shift",files:[file]})}catch(e){}
    }else{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=file.name;a.click();URL.revokeObjectURL(a.href);
    }
  },"image/png");
}

// ═══ ANNUAL STATS ═══
function rStats(){
  const isZh=lang==="zh";
  const y=S.statsYr;
  // Calculate full year stats (calendar year Jan-Dec)
  let monthData=[];
  for(let mo=1;mo<=12;mo++){
    const dm=dim(y,mo);
    let e=0,n=0,m=0,o=0,wd=0;
    for(let d=1;d<=dm;d++){
      const s=gs(y,mo,d);
      if(s==="早"){e++;wd++}else if(s==="晚"){n++;wd++}else if(s==="中"){m++;wd++}else if(s==="休")o++;
    }
    const r=rot();const sh=r?r.h:12;
    const tH=wd*sh,oH=sh===12?wd*4:0;
    monthData.push({mo,e,n,m,o,wd,tH,oH});
  }
  const totals=monthData.reduce((a,md)=>({wd:a.wd+md.wd,tH:a.tH+md.tH,oH:a.oH+md.oH,e:a.e+md.e,n:a.n+md.n,m:a.m+md.m,o:a.o+md.o}),{wd:0,tH:0,oH:0,e:0,n:0,m:0,o:0});
  
  const maxH=Math.max(...monthData.map(d=>d.tH),1);
  const barChart=monthData.map((md,i)=>{
    const pct=Math.round(md.tH/maxH*100);
    const isCur=(i+1===TM&&y===TY);
    return`<div class="stat-bar-col${isCur?' cur':''}"><div class="stat-bar" style="height:${pct}%"><span>${md.tH}</span></div><div class="stat-bar-lbl">${i+1}${isZh?"月":""}</div></div>`}).join("");
  
  // Annual leave — use AL year (y-1)/12/26 ~ y/12/25
  const aly=y-1;
  const alData=AL[aly]||{total:0,used:0};
  let alUsedCalc=alData.used||0;
  const alStart=`${aly}-12-26`,alEnd=`${aly+1}-12-25`;
  for(let k in ALD){if(k>=alStart&&k<=alEnd)alUsedCalc+=ALD[k]}
  const alTotal=alData.total||0;
  const alRemCalc=Math.max(0,alTotal-alUsedCalc);
  const alPct=alTotal>0?Math.round(alUsedCalc/alTotal*100):0;
  const alRange=`${aly}/12/26 ~ ${aly+1}/12/25`;
  
  const yearNav=`<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:8px 0"><button onclick="S.statsYr=${y-1};render()" style="width:28px;height:28px;border-radius:6px;background:#eee;border:none;font-size:13px;cursor:pointer">◀</button><span style="font-size:16px;font-weight:900">${y}${isZh?" 年度統計":" Annual"}</span><button onclick="S.statsYr=${y+1};render()" style="width:28px;height:28px;border-radius:6px;background:#eee;border:none;font-size:13px;cursor:pointer">▶</button></div>`;
  
  return`<div class="modal-bg" data-a="closeStats"><div class="modal-sheet help-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>
  ${yearNav}
  <div class="stat-summary">
    <div class="stat-sum-item"><div class="stat-sum-val">${totals.wd}</div><div class="stat-sum-lbl">${isZh?"出勤日":"Hari Kerja"}</div></div>
    <div class="stat-sum-item"><div class="stat-sum-val">${totals.tH}h</div><div class="stat-sum-lbl">${isZh?"總工時":"Total Jam"}</div></div>
    <div class="stat-sum-item"><div class="stat-sum-val ot-c">${totals.oH}h</div><div class="stat-sum-lbl">${isZh?"加班":"Lembur"}</div></div>
  </div>
  <div class="stat-shifts">
    <div class="stat-shift-item" style="color:#004d56"><span class="stat-shift-dot" style="background:#d0eff5;border:1px solid #9dd8e6"></span>${isZh?"早班":"Pagi"} <b>${totals.e}</b></div>
    <div class="stat-shift-item" style="color:#311b6b"><span class="stat-shift-dot" style="background:#ddd0ec;border:1px solid #c0a9dc"></span>${isZh?"晚班":"Malam"} <b>${totals.n}</b></div>
    ${totals.m?`<div class="stat-shift-item" style="color:#7a4700"><span class="stat-shift-dot" style="background:#ffeecf;border:1px solid #ffd88a"></span>${isZh?"中班":"Siang"} <b>${totals.m}</b></div>`:""}
    <div class="stat-shift-item" style="color:#999"><span class="stat-shift-dot" style="background:#f5f5f5;border:1px solid #e8e8e8"></span>${isZh?"休假":"Libur"} <b>${totals.o}</b></div>
  </div>
  <div style="margin:14px 0 6px;font-size:13px;font-weight:800">${isZh?"📊 每月工時":"📊 Monthly Hours"}</div>
  <div class="stat-chart">${barChart}</div>
  ${alTotal>0?`<div style="margin:14px 0 6px;font-size:13px;font-weight:800">🌴 ${isZh?"特休使用率":"Penggunaan Cuti"} <span style="font-size:10px;font-weight:600;color:var(--tx3)">${alRange}</span></div>
  <div class="stat-al-bar"><div class="stat-al-fill" style="width:${alPct}%"></div></div>
  <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx2);margin-top:4px"><span>${isZh?"已用":"Terpakai"} ${alUsedCalc}h</span><span>${isZh?"剩餘":"Sisa"} ${alRemCalc}h / ${alTotal}h</span></div>`:""}
  <button class="modal-done" data-a="closeStats" style="margin-top:14px">${t("done")}</button></div></div>`}

// ═══ WEATHER EFFECTS ENGINE v2 ═══
const WxFx = (function(){
  let canvas, ctx, raf, particles=[], splashes=[], debris=[], stars=[];
  let mode="none", _w=0, _h=0;
  let lightningTimer=0, lightningAlpha=0;
  let heatPhase=0;
  let ambientHour=-1;
  
  function init(){
    if(canvas) return;
    canvas=document.createElement("canvas");
    canvas.id="wxfx";
    canvas.style.cssText="position:fixed;inset:0;z-index:15;pointer-events:none";
    document.body.appendChild(canvas);
    ctx=canvas.getContext("2d");
    resize();
    window.addEventListener("resize",resize);
    // Generate stars once
    stars=[];
    for(let i=0;i<80;i++) stars.push({x:Math.random(),y:Math.random()*0.6,r:0.5+Math.random()*1.5,tw:Math.random()*Math.PI*2,sp:0.01+Math.random()*0.02});
    // Start ambient loop immediately
    if(!raf) loop();
  }
  
  function resize(){
    const dpr=window.devicePixelRatio||1;
    _w=window.innerWidth;_h=window.innerHeight;
    canvas.width=_w*dpr;canvas.height=_h*dpr;
    canvas.style.width=_w+"px";canvas.style.height=_h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  
  function setMode(m){
    if(m===mode) return;
    mode=m;
    particles=[];splashes=[];debris=[];
    heatPhase=0;lightningTimer=0;lightningAlpha=0;
    if(typeof WxSfx!=='undefined') WxSfx.setMode(m);
    document.body.classList.remove("wx-heat","wx-rain","wx-storm","wx-fog","wx-snow","wx-wind","wx-typhoon");
    if(mode==="none") return;
    if(mode==="heat") document.body.classList.add("wx-heat");
    if(mode==="rain"||mode==="heavy") document.body.classList.add("wx-rain");
    if(mode==="storm") document.body.classList.add("wx-storm");
    if(mode==="fog") document.body.classList.add("wx-fog");
    if(mode==="snow") document.body.classList.add("wx-snow");
    if(mode==="wind") document.body.classList.add("wx-wind");
    if(mode==="typhoon") document.body.classList.add("wx-typhoon");
    seedParticles();
  }
  
  function seedParticles(){
    particles=[];splashes=[];debris=[];
    if(mode==="rain"){
      for(let i=0;i<180;i++) particles.push(mkRain(false));
    } else if(mode==="heavy"){
      for(let i=0;i<350;i++) particles.push(mkRain(true));
    } else if(mode==="storm"){
      for(let i=0;i<450;i++) particles.push(mkRain(true,true));
      lightningTimer=80+Math.random()*120;
    } else if(mode==="snow"){
      for(let i=0;i<70;i++) particles.push(mkSnow());
    } else if(mode==="fog"){
      for(let i=0;i<12;i++) particles.push(mkFog());
    } else if(mode==="wind"){
      for(let i=0;i<30;i++) particles.push(mkWindStreak());
      for(let i=0;i<8;i++) debris.push(mkDebris());
    } else if(mode==="typhoon"){
      for(let i=0;i<500;i++) particles.push(mkRain(true,true));
      for(let i=0;i<50;i++) particles.push(mkWindStreak());
      for(let i=0;i<15;i++) debris.push(mkDebris());
      lightningTimer=40+Math.random()*80;
    }
  }
  
  function mkRain(heavy,wind){
    const speed=heavy?14+Math.random()*10:7+Math.random()*6;
    const len=heavy?22+Math.random()*18:12+Math.random()*12;
    const drift=wind?5+Math.random()*6:1+Math.random()*2;
    return{type:"rain",x:Math.random()*_w*1.4-_w*.2, y:Math.random()*_h*-1, speed, len, drift,
      alpha:heavy?0.35+Math.random()*0.25:0.18+Math.random()*0.18,
      width:heavy?2+Math.random():1.2+Math.random()*0.5};
  }
  
  function mkSnow(){
    return{type:"snow",x:Math.random()*_w, y:Math.random()*_h*-0.5, r:2+Math.random()*4,
      speed:0.6+Math.random()*1.8, drift:Math.random()*1.2-0.6,
      alpha:0.5+Math.random()*0.4, wobble:Math.random()*Math.PI*2};
  }
  
  function mkFog(){
    return{type:"fog",x:Math.random()*_w*1.5-_w*.25, y:_h*0.1+Math.random()*_h*0.8,
      w:300+Math.random()*400, h:60+Math.random()*80,
      speed:0.2+Math.random()*0.4, alpha:0.06+Math.random()*0.06,
      dir:Math.random()>0.5?1:-1};
  }
  
  function mkWindStreak(){
    return{type:"wind",x:-Math.random()*_w*0.3, y:Math.random()*_h,
      speed:8+Math.random()*12, len:40+Math.random()*80,
      alpha:0.06+Math.random()*0.08, width:1+Math.random()};
  }
  
  function mkDebris(){
    const shapes=["leaf","dot","line"];
    return{x:-20-Math.random()*100, y:Math.random()*_h,
      speed:4+Math.random()*8, vy:Math.sin(Math.random()*Math.PI*2)*1.5,
      wobble:Math.random()*Math.PI*2, wobbleSpeed:0.03+Math.random()*0.04,
      r:2+Math.random()*3, alpha:0.3+Math.random()*0.4,
      shape:shapes[Math.floor(Math.random()*shapes.length)],
      rot:Math.random()*Math.PI*2, rotSpeed:0.05+Math.random()*0.1};
  }
  
  function addSplash(x){
    splashes.push({x,y:_h-2,vx:(Math.random()-0.5)*2,vy:-1.5-Math.random()*2,life:1});
  }
  
  // ═══ AMBIENT DAY/NIGHT ═══
  function drawAmbient(){
    const h=new Date().getHours(),m=new Date().getMinutes();
    const t=h+m/60;
    // Night: 21-5 → dark blue + stars
    // Dawn: 5-7 → warm orange-pink
    // Morning: 7-10 → light warm
    // Midday: 10-15 → minimal
    // Afternoon: 15-17 → golden
    // Dusk: 17-19 → orange-purple
    // Evening: 19-21 → blue transition
    
    if(t>=21||t<5){
      // Night
      const intensity=(t>=21)? Math.min((t-21)/1,1) : 1;
      const grd=ctx.createLinearGradient(0,0,0,_h);
      grd.addColorStop(0,`rgba(8,15,40,${0.18*intensity})`);
      grd.addColorStop(0.5,`rgba(12,20,50,${0.12*intensity})`);
      grd.addColorStop(1,`rgba(15,25,55,${0.08*intensity})`);
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h);
      // Stars
      stars.forEach(s=>{
        s.tw+=s.sp;
        const a=(0.3+Math.sin(s.tw)*0.3)*intensity;
        ctx.beginPath();
        ctx.fillStyle=`rgba(255,255,240,${a})`;
        ctx.arc(s.x*_w,s.y*_h,s.r,0,Math.PI*2);
        ctx.fill();
      });
    } else if(t>=5&&t<7){
      // Dawn
      const p=(t-5)/2;
      const grd=ctx.createLinearGradient(0,0,0,_h*0.6);
      grd.addColorStop(0,`rgba(255,140,60,${0.08*p})`);
      grd.addColorStop(0.5,`rgba(255,180,100,${0.05*p})`);
      grd.addColorStop(1,"rgba(255,200,150,0)");
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h*0.6);
      // Fading stars
      const starA=(1-p)*0.5;
      if(starA>0.05) stars.forEach(s=>{
        s.tw+=s.sp;
        ctx.beginPath();
        ctx.fillStyle=`rgba(255,255,240,${(0.2+Math.sin(s.tw)*0.15)*starA})`;
        ctx.arc(s.x*_w,s.y*_h,s.r*0.7,0,Math.PI*2);
        ctx.fill();
      });
    } else if(t>=17&&t<19){
      // Dusk
      const p=(t-17)/2;
      const grd=ctx.createLinearGradient(0,0,0,_h*0.5);
      grd.addColorStop(0,`rgba(200,80,40,${0.06+p*0.08})`);
      grd.addColorStop(0.4,`rgba(160,60,100,${0.04+p*0.05})`);
      grd.addColorStop(1,"rgba(80,40,120,0)");
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h*0.5);
    } else if(t>=19&&t<21){
      // Evening transition
      const p=(t-19)/2;
      const grd=ctx.createLinearGradient(0,0,0,_h);
      grd.addColorStop(0,`rgba(20,30,70,${0.06+p*0.12})`);
      grd.addColorStop(0.6,`rgba(15,25,60,${0.03+p*0.08})`);
      grd.addColorStop(1,`rgba(10,20,50,${0.02+p*0.06})`);
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h);
      // Early stars appearing
      const starA=p*0.6;
      if(starA>0.05) stars.forEach(s=>{
        s.tw+=s.sp;
        ctx.beginPath();
        ctx.fillStyle=`rgba(255,255,240,${(0.2+Math.sin(s.tw)*0.2)*starA})`;
        ctx.arc(s.x*_w,s.y*_h,s.r,0,Math.PI*2);
        ctx.fill();
      });
    } else if(t>=15&&t<17){
      // Afternoon golden
      const p=(t-15)/2;
      const grd=ctx.createRadialGradient(_w*0.8,0,0,_w*0.8,0,_w*0.6);
      grd.addColorStop(0,`rgba(255,200,80,${0.04*p})`);
      grd.addColorStop(1,"rgba(255,200,80,0)");
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h*0.4);
    }
    // Morning 7-10 and midday 10-15: minimal/none — content stays clean
  }
  
  // ═══ WEATHER DRAW FUNCTIONS ═══
  function drawHeat(){
    heatPhase+=0.018;
    for(let i=0;i<8;i++){
      const yBase=_h-(_h*0.12*i);
      const amp=4+Math.sin(heatPhase+i)*3;
      ctx.beginPath();
      ctx.strokeStyle=`rgba(255,140,0,${0.06-i*0.006})`;
      ctx.lineWidth=50+i*12;
      for(let x=0;x<_w;x+=3){
        const y=yBase+Math.sin(x*0.007+heatPhase+i*0.7)*amp-heatPhase*10%_h;
        if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    const grd=ctx.createRadialGradient(_w*0.85,-20,0,_w*0.85,-20,_w*0.55);
    grd.addColorStop(0,`rgba(255,200,50,${0.12+Math.sin(heatPhase*0.5)*0.04})`);
    grd.addColorStop(1,"rgba(255,200,50,0)");
    ctx.fillStyle=grd;
    ctx.fillRect(0,0,_w,_h*0.6);
  }
  
  function drawRain(){
    const topG=ctx.createLinearGradient(0,0,0,_h*0.3);
    topG.addColorStop(0,mode==="heavy"?"rgba(40,50,70,0.15)":"rgba(60,70,90,0.08)");
    topG.addColorStop(1,"rgba(60,70,90,0)");
    ctx.fillStyle=topG;
    ctx.fillRect(0,0,_w,_h*0.3);
    
    particles.forEach(p=>{
      if(p.type!=="rain") return;
      p.y+=p.speed;
      p.x+=p.drift;
      if(p.y>_h){
        if(Math.random()<0.15) addSplash(p.x);
        p.y=-p.len-Math.random()*_h*0.3;
        p.x=Math.random()*_w*1.4-_w*.2;
      }
      ctx.beginPath();
      ctx.strokeStyle=`rgba(180,200,230,${p.alpha})`;
      ctx.lineWidth=p.width;
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+p.drift*2.5,p.y+p.len);
      ctx.stroke();
    });
    drawSplashes();
  }
  
  function drawSplashes(){
    for(let i=splashes.length-1;i>=0;i--){
      const s=splashes[i];
      s.x+=s.vx;s.y+=s.vy;s.vy+=0.15;s.life-=0.06;
      if(s.life<=0){splashes.splice(i,1);continue}
      ctx.beginPath();
      ctx.fillStyle=`rgba(180,200,230,${s.life*0.5})`;
      ctx.arc(s.x,s.y,1.5*s.life,0,Math.PI*2);
      ctx.fill();
    }
  }
  
  function drawStorm(){
    const topG=ctx.createLinearGradient(0,0,0,_h*0.5);
    topG.addColorStop(0,"rgba(20,25,40,0.2)");
    topG.addColorStop(1,"rgba(20,25,40,0)");
    ctx.fillStyle=topG;
    ctx.fillRect(0,0,_w,_h*0.5);
    drawRain();
    drawLightning();
  }
  
  function drawLightning(){
    lightningTimer--;
    if(lightningTimer<=0){
      lightningAlpha=0.4+Math.random()*0.3;
      if(typeof WxSfx!=='undefined') WxSfx.triggerThunder();
      lightningTimer=mode==="typhoon"?60+Math.random()*150:100+Math.random()*250;
      let lx=_w*0.2+Math.random()*_w*0.6,ly=0;
      ctx.beginPath();
      ctx.strokeStyle=`rgba(220,230,255,${lightningAlpha*1.5})`;
      ctx.lineWidth=2.5;
      ctx.moveTo(lx,ly);
      for(let seg=0;seg<8;seg++){
        lx+=(Math.random()-0.5)*60;
        ly+=_h/8;
        ctx.lineTo(lx,ly);
      }
      ctx.stroke();
      ctx.lineWidth=8;
      ctx.strokeStyle=`rgba(180,200,255,${lightningAlpha*0.3})`;
      ctx.stroke();
    }
    if(lightningAlpha>0){
      ctx.fillStyle=`rgba(220,230,255,${lightningAlpha})`;
      ctx.fillRect(0,0,_w,_h);
      lightningAlpha*=0.82;
      if(lightningAlpha<0.005)lightningAlpha=0;
    }
  }
  
  function drawWind(){
    // Wind streaks
    particles.forEach(p=>{
      if(p.type!=="wind") return;
      p.x+=p.speed;
      p.y+=Math.sin(p.x*0.01)*0.5;
      if(p.x>_w+p.len){p.x=-p.len-Math.random()*100;p.y=Math.random()*_h}
      ctx.beginPath();
      ctx.strokeStyle=`rgba(180,200,220,${p.alpha})`;
      ctx.lineWidth=p.width;
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+p.len,p.y+Math.sin(p.x*0.02)*3);
      ctx.stroke();
    });
    drawDebris();
  }
  
  function drawDebris(){
    debris.forEach(d=>{
      d.x+=d.speed;
      d.wobble+=d.wobbleSpeed;
      d.y+=d.vy+Math.sin(d.wobble)*2;
      d.rot+=d.rotSpeed;
      if(d.x>_w+30){d.x=-30-Math.random()*100;d.y=Math.random()*_h}
      if(d.y<-20||d.y>_h+20){d.y=Math.random()*_h;d.x=-30}
      ctx.save();
      ctx.translate(d.x,d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha=d.alpha;
      if(d.shape==="leaf"){
        ctx.beginPath();
        ctx.fillStyle="rgba(80,120,60,0.7)";
        ctx.ellipse(0,0,d.r*1.5,d.r*0.7,0,0,Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle="rgba(60,90,40,0.5)";
        ctx.lineWidth=0.5;
        ctx.moveTo(-d.r,0);ctx.lineTo(d.r,0);
        ctx.stroke();
      } else if(d.shape==="dot"){
        ctx.beginPath();
        ctx.fillStyle="rgba(140,120,90,0.6)";
        ctx.arc(0,0,d.r*0.6,0,Math.PI*2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.strokeStyle="rgba(120,110,80,0.5)";
        ctx.lineWidth=1;
        ctx.moveTo(-d.r,0);ctx.lineTo(d.r,0);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
      ctx.restore();
    });
  }
  
  function drawTyphoon(){
    // Dark heavy overlay
    const topG=ctx.createLinearGradient(0,0,0,_h*0.6);
    topG.addColorStop(0,"rgba(15,15,30,0.3)");
    topG.addColorStop(1,"rgba(15,15,30,0)");
    ctx.fillStyle=topG;
    ctx.fillRect(0,0,_w,_h*0.6);
    
    // Horizontal rain
    particles.forEach(p=>{
      if(p.type!=="rain") return;
      p.y+=p.speed*0.6;
      p.x+=p.drift+8;
      if(p.y>_h||p.x>_w+20){
        if(Math.random()<0.1) addSplash(p.x);
        p.y=Math.random()*_h;
        p.x=-p.len-Math.random()*_w*0.3;
      }
      ctx.beginPath();
      ctx.strokeStyle=`rgba(180,200,230,${p.alpha})`;
      ctx.lineWidth=p.width;
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+p.len*0.7,p.y+p.len*0.3);
      ctx.stroke();
    });
    drawSplashes();
    
    // Wind streaks
    particles.forEach(p=>{
      if(p.type!=="wind") return;
      p.x+=p.speed*1.5;
      p.y+=Math.sin(p.x*0.008)*1.5;
      if(p.x>_w+p.len){p.x=-p.len-Math.random()*200;p.y=Math.random()*_h}
      ctx.beginPath();
      ctx.strokeStyle=`rgba(160,180,210,${p.alpha*1.5})`;
      ctx.lineWidth=p.width*1.5;
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+p.len*1.3,p.y+Math.sin(p.x*0.015)*5);
      ctx.stroke();
    });
    drawDebris();
    drawLightning();
    
    // Screen shake via subtle oscillation
    heatPhase+=0.08;
    const shake=Math.sin(heatPhase)*0.5;
    canvas.style.transform=`translate(${shake}px,${shake*0.3}px)`;
  }
  
  function drawSnow(){
    const topG=ctx.createLinearGradient(0,0,0,_h*0.25);
    topG.addColorStop(0,"rgba(220,230,245,0.08)");
    topG.addColorStop(1,"rgba(220,230,245,0)");
    ctx.fillStyle=topG;
    ctx.fillRect(0,0,_w,_h*0.25);
    particles.forEach(p=>{
      p.y+=p.speed;
      p.wobble+=0.02;
      p.x+=Math.sin(p.wobble)*p.drift+0.15;
      if(p.y>_h+10){p.y=-10;p.x=Math.random()*_w}
      ctx.beginPath();
      ctx.fillStyle=`rgba(255,255,255,${p.alpha})`;
      ctx.shadowColor="rgba(255,255,255,0.5)";
      ctx.shadowBlur=p.r*2;
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    });
    ctx.shadowBlur=0;
  }
  
  function drawFog(){
    particles.forEach(p=>{
      p.x+=p.speed*p.dir;
      if(p.x>_w+p.w)p.x=-p.w;
      if(p.x<-p.w)p.x=_w;
      const grd=ctx.createRadialGradient(p.x+p.w/2,p.y,0,p.x+p.w/2,p.y,p.w/2);
      grd.addColorStop(0,`rgba(200,210,220,${p.alpha})`);
      grd.addColorStop(1,"rgba(200,210,220,0)");
      ctx.fillStyle=grd;
      ctx.fillRect(p.x,p.y-p.h,p.w,p.h*2);
    });
    const gf=ctx.createLinearGradient(0,_h*0.7,0,_h);
    gf.addColorStop(0,"rgba(200,210,220,0)");
    gf.addColorStop(1,"rgba(200,210,220,0.1)");
    ctx.fillStyle=gf;
    ctx.fillRect(0,_h*0.7,_w,_h*0.3);
  }
  
  // ═══ MAIN LOOP ═══
  function loop(){
    raf=requestAnimationFrame(loop);
    ctx.clearRect(0,0,_w,_h);
    if(mode!=="typhoon") canvas.style.transform="";
    
    // Always draw ambient day/night
    drawAmbient();
    
    // Weather overlay
    if(mode==="heat") drawHeat();
    else if(mode==="rain"||mode==="heavy") drawRain();
    else if(mode==="storm") drawStorm();
    else if(mode==="snow") drawSnow();
    else if(mode==="fog") drawFog();
    else if(mode==="wind") drawWind();
    else if(mode==="typhoon") drawTyphoon();
  }
  
  function update(code,temp,prec,wind){
    init();
    if(code===null||code===undefined){setMode("none");return}
    // Typhoon: storm codes + extreme wind
    if((code===95||code===96||code===99)&&wind>=50){setMode("typhoon");return}
    // Storm
    if(code===95||code===96||code===99){setMode("storm");return}
    // Heavy rain
    if([55,65,67,82].includes(code)){setMode("heavy");return}
    // Rain
    if([51,53,56,61,63,66,80,81].includes(code)){setMode("rain");return}
    // Snow / sleet
    if([71,73,75,77,85,86].includes(code)){setMode("snow");return}
    // Fog
    if(code===45||code===48){setMode("fog");return}
    // Strong wind (no rain)
    if(wind>=35){setMode("wind");return}
    // Precip probability fallback
    if(prec>=40&&code<=3){setMode("rain");return}
    // Heat shimmer
    if((code===0||code===1)&&temp>=32){setMode("heat");return}
    // No weather effect, but ambient still runs
    setMode("none");
  }
  
  return{update};
})();

// ═══ WEATHER SOUND ENGINE ═══
const WxSfx = (function(){
  let actx=null, masterGain=null;
  let rainNode=null, rainGain=null, rainFilter=null;
  let windNode=null, windGain=null, windFilter=null, windLfo=null, windLfoGain=null;
  let mode="none", muted=true, _initialized=false;
  
  try{muted=localStorage.getItem("sb_sfx")!=="on"}catch(e){}
  
  function initAudio(){
    if(_initialized) return true;
    try{
      actx=new (window.AudioContext||window.webkitAudioContext)();
      masterGain=actx.createGain();
      masterGain.gain.value=muted?0:1;
      masterGain.connect(actx.destination);
      _initialized=true;
      return true;
    }catch(e){return false}
  }
  
  function mkNoise(duration){
    const sr=actx.sampleRate;
    const buf=actx.createBuffer(1,sr*duration,sr);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    return buf;
  }
  
  function startRain(heavy){
    stopRain();
    if(!actx) return;
    const buf=mkNoise(2);
    rainNode=actx.createBufferSource();
    rainNode.buffer=buf;
    rainNode.loop=true;
    rainFilter=actx.createBiquadFilter();
    rainFilter.type="bandpass";
    rainFilter.frequency.value=heavy?1500:800;
    rainFilter.Q.value=heavy?0.5:0.8;
    rainGain=actx.createGain();
    rainGain.gain.value=heavy?0.18:0.1;
    rainNode.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(masterGain);
    rainNode.start();
  }
  
  function stopRain(){
    if(rainNode){try{rainNode.stop()}catch(e){}rainNode=null}
    rainGain=null;rainFilter=null;
  }
  
  function startWind(intense){
    stopWind();
    if(!actx) return;
    const buf=mkNoise(2);
    windNode=actx.createBufferSource();
    windNode.buffer=buf;
    windNode.loop=true;
    windFilter=actx.createBiquadFilter();
    windFilter.type="bandpass";
    windFilter.frequency.value=intense?400:250;
    windFilter.Q.value=0.4;
    windGain=actx.createGain();
    windGain.gain.value=intense?0.15:0.08;
    // LFO for howling effect
    windLfo=actx.createOscillator();
    windLfo.type="sine";
    windLfo.frequency.value=intense?0.4:0.2;
    windLfoGain=actx.createGain();
    windLfoGain.gain.value=intense?200:100;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);
    windLfo.start();
    windNode.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windNode.start();
  }
  
  function stopWind(){
    if(windNode){try{windNode.stop()}catch(e){}windNode=null}
    if(windLfo){try{windLfo.stop()}catch(e){}windLfo=null}
    windGain=null;windFilter=null;windLfoGain=null;
  }
  
  function thunder(){
    if(!actx||muted) return;
    const osc=actx.createOscillator();
    osc.type="sawtooth";
    osc.frequency.value=40+Math.random()*30;
    const g=actx.createGain();
    g.gain.setValueAtTime(0.25+Math.random()*0.15,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+1.5+Math.random());
    const f=actx.createBiquadFilter();
    f.type="lowpass";
    f.frequency.value=150;
    osc.connect(f);f.connect(g);g.connect(masterGain);
    osc.start();
    osc.stop(actx.currentTime+2);
    // Rumble layer
    const n=actx.createBufferSource();
    n.buffer=mkNoise(2);
    const nf=actx.createBiquadFilter();
    nf.type="lowpass";nf.frequency.value=100;
    const ng=actx.createGain();
    ng.gain.setValueAtTime(0.12,actx.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+2.5);
    n.connect(nf);nf.connect(ng);ng.connect(masterGain);
    n.start();n.stop(actx.currentTime+3);
  }
  
  function stopAll(){stopRain();stopWind()}
  
  function setMode(m){
    if(m===mode) return;
    mode=m;
    stopAll();
    if(!_initialized||!actx) return;
    if(actx.state==="suspended") actx.resume();
    switch(mode){
      case "rain": startRain(false); break;
      case "heavy": startRain(true); break;
      case "storm": startRain(true); startWind(false); break;
      case "wind": startWind(false); break;
      case "typhoon": startRain(true); startWind(true); break;
      case "snow":
        // Very soft ambient
        startRain(false);
        if(rainGain)rainGain.gain.value=0.02;
        if(rainFilter){rainFilter.frequency.value=3000;rainFilter.Q.value=1.5}
        break;
    }
  }
  
  function toggle(){
    if(!initAudio()) return;
    muted=!muted;
    try{localStorage.setItem("sb_sfx",muted?"off":"on")}catch(e){}
    if(masterGain) masterGain.gain.value=muted?0:1;
    if(!muted&&actx&&actx.state==="suspended") actx.resume();
    render();
  }
  
  function triggerThunder(){
    if(!_initialized) return;
    thunder();
  }
  
  function isMuted(){return muted}
  
  return{setMode,toggle,triggerThunder,isMuted,initAudio};
})();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    reg.update();
    reg.addEventListener('updatefound',()=>{
      const nw=reg.installing;
      if(nw)nw.addEventListener('statechange',()=>{
        if(nw.state==='activated')location.reload()
      })
    });
    setInterval(()=>reg.update(),60000);
  }).catch(()=>{});
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!refreshing){refreshing=true;location.reload()}
  })
}
// Force clear all old caches on version change
if('caches' in window){caches.keys().then(names=>{names.forEach(n=>{if(n!=='myshift-v58')caches.delete(n)})})}
