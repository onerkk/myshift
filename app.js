/* ════════════════════════════════════════════════════════════
   農民曆引擎 + UI（歐那）— 純前端精算，已對 sxtwl+cnlunar 逐日驗證 0 誤差
   宜忌神煞資料另存 almanac-yiji.json（2025-2028）首次開農曆時載入並由 SW 快取
   ════════════════════════════════════════════════════════════ */
/* === MyShift 農民曆引擎 almanac.js ===
   純前端計算：農曆/干支(年立春界·月節界·日)/節氣/廿八宿/建除/黃黑道/沖煞/納音/彭祖/胎神/吉神方位
   宜忌神煞另由 almanac-yiji.json 提供(2025-2028 真實通書資料)
   所有演算法已對 sxtwl + cnlunar 標準庫逐日驗證 0 誤差 */
(function(global){
'use strict';
var GAN="甲乙丙丁戊己庚辛壬癸";
var ZHI="子丑寅卯辰巳午未申酉戌亥";
var SX ="鼠牛虎兔龍蛇馬羊猴雞狗豬";
var WX5=["木","木","火","火","土","土","金","金","水","水"]; // 天干五行
var XIU28=["角","亢","氐","房","心","尾","箕","斗","牛","女","虛","危","室","壁","奎","婁","胃","昴","畢","觜","參","井","鬼","柳","星","張","翼","軫"];
var XIU_LUCK={"角":"吉","亢":"凶","氐":"凶","房":"吉","心":"凶","尾":"吉","箕":"吉","斗":"吉","牛":"凶","女":"凶","虛":"凶","危":"凶","室":"吉","壁":"吉","奎":"凶","婁":"吉","胃":"吉","昴":"凶","畢":"吉","觜":"凶","參":"吉","井":"吉","鬼":"凶","柳":"凶","星":"凶","張":"吉","翼":"凶","軫":"吉"};
var JIANCHU=["建","除","滿","平","定","執","破","危","成","收","開","閉"];
var HD2=["青龍","明堂","天刑","朱雀","金匱","天德","白虎","玉堂","天牢","玄武","司命","勾陳"];
var HD_GOOD={"青龍":1,"明堂":1,"金匱":1,"天德":1,"玉堂":1,"司命":1};
var LUNAR=[19416,19168,42352,21717,53856,55632,91476,22176,39632,21970,19168,42422,42192,53840,119381,46400,54944,44450,38320,84343,18800,42160,46261,27216,27968,109396,11104,38256,21234,18800,25958,54432,59984,92821,23248,11104,100067,37600,116951,51536,54432,120998,46416,22176,107956,9680,37584,53938,43344,46423,27808,46416,86869,19872,42416,83315,21168,43432,59728,27296,44710,43856,19296,43748,42352,21088,62051,55632,23383,22176,38608,19925,19152,42192,54484,53840,54616,46400,46752,103846,38320,18864,43380,42160,45690,27216,27968,44870,43872,38256,19189,18800,25776,29859,59984,27480,23232,43872,38613,37600,51552,55636,54432,55888,30034,22176,43959,9680,37584,51893,43344,46240,47780,44368,21977,19360,42416,86390,21168,43312,31060,27296,44368,23378,19296,42726,42208,53856,60005,54576,23200,30371,38608,19195,19152,42192,118966,53840,54560,56645,46496,22224,21938,18864,42359,42160,43600,111189,27936,44448,84835,37744,18936,18800,25776,92326,59984,27296,108228,43744,37600,53987,51552,54615,54432,55888,23893,22176,42704,21972,21200,43448,43344,46240,46758,44368,21920,43940,42416,21168,45683,26928,29495,27296,44368,84821,19296,42352,21732,53600,59752,54560,55968,92838,22224,19168,43476,41680,53584,62034,54560];
var JQ={"2019":["0105","0120","0204","0219","0306","0321","0405","0420","0506","0521","0606","0621","0707","0723","0808","0823","0908","0923","1008","1024","1108","1122","1207","1222"],"2020":["0106","0120","0204","0219","0305","0320","0404","0419","0505","0520","0605","0621","0706","0722","0807","0822","0907","0922","1008","1023","1107","1122","1207","1221"],"2021":["0105","0120","0203","0218","0305","0320","0404","0420","0505","0521","0605","0621","0707","0722","0807","0823","0907","0923","1008","1023","1107","1122","1207","1221"],"2022":["0105","0120","0204","0219","0305","0320","0405","0420","0505","0521","0606","0621","0707","0723","0807","0823","0907","0923","1008","1023","1107","1122","1207","1222"],"2023":["0105","0120","0204","0219","0306","0321","0405","0420","0506","0521","0606","0621","0707","0723","0808","0823","0908","0923","1008","1024","1108","1122","1207","1222"],"2024":["0106","0120","0204","0219","0305","0320","0404","0419","0505","0520","0605","0621","0706","0722","0807","0822","0907","0922","1008","1023","1107","1122","1206","1221"],"2025":["0105","0120","0203","0218","0305","0320","0404","0420","0505","0521","0605","0621","0707","0722","0807","0823","0907","0923","1008","1023","1107","1122","1207","1221"],"2026":["0105","0120","0204","0218","0305","0320","0405","0420","0505","0521","0605","0621","0707","0723","0807","0823","0907","0923","1008","1023","1107","1122","1207","1222"],"2027":["0105","0120","0204","0219","0306","0321","0405","0420","0506","0521","0606","0621","0707","0723","0808","0823","0908","0923","1008","1023","1107","1122","1207","1222"],"2028":["0106","0120","0204","0219","0305","0320","0404","0419","0505","0520","0605","0621","0706","0722","0807","0822","0907","0922","1008","1023","1107","1122","1206","1221"],"2029":["0105","0120","0203","0218","0305","0320","0404","0420","0505","0521","0605","0621","0707","0722","0807","0823","0907","0923","1008","1023","1107","1122","1207","1221"],"2030":["0105","0120","0204","0218","0305","0320","0405","0420","0505","0521","0605","0621","0707","0723","0807","0823","0907","0923","1008","1023","1107","1122","1207","1222"],"2031":["0105","0120","0204","0219","0306","0321","0405","0420","0506","0521","0606","0621","0707","0723","0808","0823","0908","0923","1008","1023","1107","1122","1207","1222"],"2032":["0106","0120","0204","0219","0305","0320","0404","0419","0505","0520","0605","0621","0706","0722","0807","0822","0907","0922","1008","1023","1107","1122","1206","1221"],"2033":["0105","0120","0203","0218","0305","0320","0404","0420","0505","0521","0605","0621","0707","0722","0807","0823","0907","0923","1008","1023","1107","1122","1207","1221"],"2034":["0105","0120","0204","0218","0305","0320","0405","0420","0505","0521","0605","0621","0707","0723","0807","0823","0907","0923","1008","1023","1107","1122","1207","1222"],"2035":["0105","0120","0204","0219","0306","0321","0405","0420","0505","0521","0606","0621","0707","0723","0807","0823","0908","0923","1008","1023","1107","1122","1207","1222"],"2036":["0106","0120","0204","0219","0305","0320","0404","0419","0505","0520","0605","0621","0706","0722","0807","0822","0907","0922","1008","1023","1107","1122","1206","1221"],"2037":["0105","0120","0203","0218","0305","0320","0404","0420","0505","0521","0605","0621","0707","0722","0807","0823","0907","0923","1008","1023","1107","1122","1207","1221"],"2038":["0105","0120","0204","0218","0305","0320","0405","0420","0505","0521","0605","0621","0707","0723","0807","0823","0907","0923","1008","1023","1107","1122","1207","1222"],"2039":["0105","0120","0204","0219","0306","0321","0405","0420","0505","0521","0606","0621","0707","0723","0807","0823","0908","0923","1008","1023","1107","1122","1207","1222"],"2040":["0106","0120","0204","0219","0305","0320","0404","0419","0505","0520","0605","0621","0706","0722","0807","0822","0907","0922","1008","1023","1107","1122","1206","1221"],"2041":["0105","0120","0203","0218","0305","0320","0404","0420","0505","0520","0605","0621","0707","0722","0807","0823","0907","0922","1008","1023","1107","1122","1207","1221"],"2042":["0105","0120","0204","0218","0305","0320","0404","0420","0505","0521","0605","0621","0707","0723","0807","0823","0907","0923","1008","1023","1107","1122","1207","1222"],"2043":["0105","0120","0204","0219","0306","0321","0405","0420","0505","0521","0606","0621","0707","0723","0807","0823","0908","0923","1008","1023","1107","1122","1207","1222"],"2044":["0106","0120","0204","0219","0305","0320","0404","0419","0505","0520","0605","0621","0706","0722","0807","0822","0907","0922","1007","1023","1107","1122","1206","1221"],"2045":["0105","0120","0203","0218","0305","0320","0404","0419","0505","0520","0605","0621","0707","0722","0807","0823","0907","0922","1008","1023","1107","1122","1207","1221"],"2046":["0105","0120","0204","0218","0305","0320","0404","0420","0505","0521","0605","0621","0707","0722","0807","0823","0907","0923","1008","1023","1107","1122","1207","1222"]};
var NAYIN=["海中金","海中金","爐中火","爐中火","大林木","大林木","路旁土","路旁土","劍鋒金","劍鋒金","山頭火","山頭火","澗下水","澗下水","城頭土","城頭土","白蠟金","白蠟金","楊柳木","楊柳木","井泉水","井泉水","屋上土","屋上土","霹靂火","霹靂火","松柏木","松柏木","長流水","長流水","砂中金","砂中金","山下火","山下火","平地木","平地木","壁上土","壁上土","金箔金","金箔金","覆燈火","覆燈火","天河水","天河水","大驛土","大驛土","釵釧金","釵釧金","桑柘木","桑柘木","大溪水","大溪水","砂中土","砂中土","天上火","天上火","石榴木","石榴木","大海水","大海水"];
var FETUS=["碓磨門外東南","碓磨廁外東南","廚灶爐外正南","倉庫門外正南","房床廁外正南","佔門床外正南","佔碓磨外正南","廚灶廁外西南","倉庫爐外西南","房床門外西南","門碓棲外西南","碓磨床外西南","廚灶碓外西南","倉庫廁外西南","房床廁外正南","房床爐外正西","碓磨棲外正西","廚灶床外正西","倉庫碓外西北","房床廁外西北","佔門爐外西北","碓磨門外西北","廚灶棲外西北","倉庫床外西北","房床碓外正北","佔門廁外正北","碓磨爐外正北","廚灶門外正北","倉庫棲外正北","占房床房內北","佔門碓房內北","碓磨門房內北","廚灶爐房內北","倉庫門房內北","房床棲房內中","佔門床房內中","佔碓磨房內南","廚灶廁房內南","倉庫爐房內南","房床門房內南","門雞棲房內東","碓磨床房內東","廚灶碓房內東","倉庫廁房內東","房床爐房內東","佔大門外東北","碓磨棲外東北","廚灶床外東北","倉庫碓外東北","房床廁外東北","佔門爐外東北","碓磨門外正東","廚灶棲外正東","倉庫床外正東","房床碓外正東","佔門廁外正東","碓磨爐外東南","倉庫棲外東南","占房床外東南","佔門碓外東南"];
var PENG_GAN=["甲不開倉 財物耗散","乙不栽植 千株不長","丙不修灶 必見災殃","丁不剃頭 頭必生瘡","戊不受田 田主不祥","己不破券 二比並亡","庚不經絡 織機虛張","辛不合醬 主人不嘗","壬不泱水 更難提防","癸不詞訟 理弱敵強"];
var PENG_ZHI=["子不問卜 自惹禍殃","丑不冠帶 主不還鄉","寅不祭祀 神鬼不嘗","卯不穿井 水泉不香","辰不哭泣 必主重喪","巳不遠行 財物伏藏","午不苫蓋 屋主更張","未不服藥 毒氣入腸","申不安床 鬼祟入房","酉不會客 醉坐顛狂","戌不吃犬 作怪上床","亥不嫁娶 不利新郎"];
var DIRS=[["喜神東北","財神東北","福神正北","陽貴西南","陰貴東北"],["喜神西北","財神東北","福神西南","陽貴西南","陰貴正北"],["喜神西南","財神西南","福神西北","陽貴正西","陰貴西北"],["喜神正南","財神西南","福神東南","陽貴西北","陰貴正西"],["喜神東南","財神正北","福神東北","陽貴東北","陰貴西南"],["喜神東北","財神正北","福神正北","陽貴正北","陰貴西南"],["喜神西北","財神正東","福神西南","陽貴正南","陰貴東北"],["喜神西南","財神正東","福神西北","陽貴東北","陰貴正南"],["喜神正南","財神正南","福神東南","陽貴正東","陰貴東南"],["喜神東南","財神正南","福神東北","陽貴東南","陰貴正東"]];
var JQ_DISPLAY=["小寒","大寒","立春","雨水","驚蟄","春分","清明","穀雨","立夏","小滿","芒種","夏至","小暑","大暑","立秋","處暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"];
var LM_CN=["正","二","三","四","五","六","七","八","九","十","冬","臘"];
var LD_CN=["初一","初二","初三","初四","初五","初六","初七","初八","初九","初十","十一","十二","十三","十四","十五","十六","十七","十八","十九","二十","廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"];
// 節在 display order 的偶數索引 -> 該節起的月支idx (小寒0->丑1, 立春2->寅2 ...大雪22->子0)
var JIE=[[0,1],[2,2],[4,3],[6,4],[8,5],[10,6],[12,7],[14,8],[16,9],[18,10],[20,11],[22,0]];

function jdn(y,m,d){var a=Math.floor((14-m)/12),yy=y+4800-a,mm=m+12*a-3;
  return d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045;}
function mod(n,m){return ((n%m)+m)%m;}

// ---- 農曆 (lunarInfo 標準表, base 1900-01-31) ----
function leapMonth(y){return LUNAR[y-1900]&0xf;}
function leapDays(y){if(!leapMonth(y))return 0;return (LUNAR[y-1900]&0x10000)?30:29;}
function monthDays(y,m){return (LUNAR[y-1900]&(0x10000>>m))?30:29;}
function lYearDays(y){var s=348,i;for(i=0x8000;i>0x8;i>>=1)s+=(LUNAR[y-1900]&i)?1:0;return s+leapDays(y);}
function s2l(y,m,d){
  var offset=Math.round((Date.UTC(y,m-1,d)-Date.UTC(1900,0,31))/86400000);
  var i,temp=0,year,leap,isLeap=false,mo;
  for(i=1900;i<2101&&offset>0;i++){temp=lYearDays(i);offset-=temp;}
  if(offset<0){offset+=temp;i--;}
  year=i; leap=leapMonth(i); isLeap=false;
  for(mo=1;mo<13&&offset>0;mo++){
    if(leap>0&&mo==(leap+1)&&!isLeap){mo--;isLeap=true;temp=leapDays(year);}
    else{temp=monthDays(year,mo);}
    if(isLeap&&mo==(leap+1))isLeap=false;
    offset-=temp;
  }
  if(offset===0&&leap>0&&mo==leap+1){if(isLeap){isLeap=false;}else{isLeap=true;mo--;}}
  if(offset<0){offset+=temp;mo--;}
  var day=offset+1;
  return {year:year,month:mo,day:day,isLeap:isLeap,
          mCn:(isLeap?"閏":"")+LM_CN[mo-1]+"月",
          dCn:LD_CN[day-1],
          monthBig:(monthDays(year,mo)===30)};
}

// ---- 干支 ----
function dayGZ(y,m,d){var i=mod(jdn(y,m,d)+49,60);return {gz:GAN[i%10]+ZHI[i%12],g:i%10,z:i%12};}
function jqYear(y,idx){var s=(JQ[String(y)]||[])[idx];return s?{m:+s.slice(0,2),d:+s.slice(2)}:null;}
function yearGZ(y,m,d){ // 立春界
  var lc=jqYear(y,2); var yy=y;
  if(lc){ if(m<lc.m||(m===lc.m&&d<lc.d)) yy=y-1; }
  var gi=mod(yy-4,10),zi=mod(yy-4,12);
  return {gz:GAN[gi]+ZHI[zi],g:gi,z:zi,solarYear:yy};
}
function monthZhi(y,m,d){
  var target=m*100+d,best=null,arr=JQ[String(y)];
  if(arr){for(var k=0;k<JIE.length;k++){var di=JIE[k][0],s=arr[di];if(!s)continue;
    if(parseInt(s,10)<=target)best=JIE[k][1];}}
  if(best===null)best=0; // 立春前(早一月)屬子月
  return best;
}
function monthGZ(y,m,d){
  var yg=yearGZ(y,m,d).g;                 // 立春界年干
  var zi=monthZhi(y,m,d);                 // 月支idx
  var yin=mod(yg%5*2+2,10);               // 五虎遁:寅月起干
  var off=mod(zi-2,12);                   // 自寅起算
  var gi=mod(yin+off,10);
  return {gz:GAN[gi]+ZHI[zi],g:gi,z:zi};
}

// ---- 廿八宿 / 建除 / 黃黑道 / 沖煞 ----
function xiu(y,m,d){var x=XIU28[mod(jdn(y,m,d)-17,28)];return {name:x,luck:XIU_LUCK[x]||""};}
function jianChu(dz,mz){return JIANCHU[mod(dz-mz,12)];}
function huangDao(dz,mz){var q=mod((mz-2)*2,12);var g=HD2[mod(dz-q,12)];return {god:g,good:!!HD_GOOD[g]};}
var SHA={0:"南",1:"東",2:"北",3:"西"}; // 申子辰南/巳酉丑東/寅午戌北/亥卯未西
function chongSha(dz){
  var chong=SX[mod(dz+6,12)];
  var grp; // 三合局
  if([8,0,4].indexOf(dz)>=0)grp=0;       // 申子辰
  else if([5,9,1].indexOf(dz)>=0)grp=1;  // 巳酉丑
  else if([2,6,10].indexOf(dz)>=0)grp=2; // 寅午戌
  else grp=3;                            // 亥卯未
  return {chongSx:chong, chongZhi:ZHI[mod(dz+6,12)], sha:SHA[grp]};
}

// ---- 節氣 (當日 / 下一個 + 倒數) ----
function jieqiOn(y,m,d){var arr=JQ[String(y)];if(!arr)return null;var s=(""+m).padStart(2,"0")+(""+d).padStart(2,"0");
  for(var i=0;i<24;i++)if(arr[i]===s)return JQ_DISPLAY[i];return null;}
function nextJieqi(y,m,d){
  var today=Date.UTC(y,m-1,d);
  for(var yy=y;yy<=y+1;yy++){var arr=JQ[String(yy)];if(!arr)continue;
    for(var i=0;i<24;i++){var s=arr[i];if(!s)continue;var t=Date.UTC(yy,(+s.slice(0,2))-1,+s.slice(2));
      if(t>today)return {name:JQ_DISPLAY[i],month:+s.slice(0,2),day:+s.slice(2),days:Math.round((t-today)/86400000)};}}
  return null;
}

// ---- 納音 / 彭祖 / 胎神 / 方位 ----
function nayin(gzIdx){return NAYIN[gzIdx];}
function gz60(y,m,d){return mod(jdn(y,m,d)+49,60);}

// ---- 完整組裝 ----
function full(y,m,d){
  var L=s2l(y,m,d);
  var Y=yearGZ(y,m,d), M=monthGZ(y,m,d), D=dayGZ(y,m,d);
  var di=gz60(y,m,d);
  var hd=huangDao(D.z,M.z);
  var cs=chongSha(D.z);
  var xx=xiu(y,m,d);
  var nj=nextJieqi(y,m,d);
  var dow=["日","一","二","三","四","五","六"][new Date(y,m-1,d).getDay()];
  return {
    solar:{y:y,m:m,d:d,dow:dow},
    lunar:L,
    gz:{year:Y.gz,month:M.gz,day:D.gz,solarYear:Y.solarYear},
    zodiac:SX[mod(Y.solarYear-4,12)],          // 生肖(年, 立春界)
    dayWuxing:WX5[D.g],                          // 日干五行
    nayin:{year:nayin(mod(Y.solarYear-4,60)), day:nayin(di)},
    nayinDay:nayin(di),
    jieqiToday:jieqiOn(y,m,d),
    nextJieqi:nj,
    jianchu:jianChu(D.z,M.z),
    huangdao:hd,
    xiu:xx,
    chongsha:cs,
    peng:[PENG_GAN[D.g],PENG_ZHI[D.z]],
    fetus:FETUS[di],
    dirs:DIRS[D.g],                              // [喜神,財神,福神,陽貴,陰貴]
    gz60day:di
  };
}

var API={full:full,s2l:s2l,dayGZ:dayGZ,yearGZ:yearGZ,monthGZ:monthGZ,
  jianChu:jianChu,xiu:xiu,huangDao:huangDao,chongSha:chongSha,
  jieqiOn:jieqiOn,nextJieqi:nextJieqi,gz60:gz60,nayin:nayin,
  _const:{GAN:GAN,ZHI:ZHI,SX:SX}};
global.Almanac=API;
if(typeof module!=="undefined"&&module.exports)module.exports=API;
})(typeof window!=="undefined"?window:(typeof globalThis!=="undefined"?globalThis:this));
/* ===== MyShift 農民曆 UI helpers (歐那) ===== */
(function(){
'use strict';
// 宜忌神煞資料(2025-2028, almanac-yiji.json)：首次開啟農曆時載入一次，之後 Service Worker 已快取 → 離線可用
var YIJI=null, YIJI_STATE="idle"; // idle | loading | ready | error
var RANGE_LO=2025, RANGE_HI=2028; // 宜忌資料涵蓋年份(與 almanac-yiji.json 一致)
function inRange(y){return y>=RANGE_LO&&y<=RANGE_HI;}
function _base(){return location.pathname.replace(/[^/]*$/,"");}
window.loadYiji=function(){
  if(YIJI_STATE==="ready"||YIJI_STATE==="loading")return;
  YIJI_STATE="loading";
  fetch(_base()+"almanac-yiji.json")
    .then(function(r){if(!r.ok)throw new Error("http "+r.status);return r.json();})
    .then(function(j){YIJI=j;YIJI_STATE="ready";if(j&&j.range){var p=(""+j.range).split("-");if(p.length===2){RANGE_LO=+p[0];RANGE_HI=+p[1];}}try{if(typeof render==="function")render();}catch(e){}})
    .catch(function(e){YIJI_STATE="error";try{if(typeof render==="function")render();}catch(e2){}});
};
function yijiFor(y,m,d){
  if(!YIJI||!YIJI.days)return null;
  var rec=YIJI.days[y+"-"+m+"-"+d];
  if(!rec)return null;
  var V=YIJI.vocab, LV=YIJI.level||["從宜不從忌","從宜亦從忌","從忌不從宜","諸事皆忌"];
  return {good:rec[0].map(function(i){return V[i];}),
          bad: rec[1].map(function(i){return V[i];}),
          gGod:rec[2].map(function(i){return V[i];}),
          bGod:rec[3].map(function(i){return V[i];}),
          level:rec[4], levelName:LV[rec[4]]||""};
}

// CSS 一次性注入（index.html 不可改，故由 JS 注入）
function injCSS(){
  if(document.getElementById("alm-css"))return;
  var s=document.createElement("style"); s.id="alm-css";
  s.textContent=
   ".lun-mini{display:block;font-size:9px;line-height:1.05;margin-top:1px;color:#9e6000;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
  +".lun-mini.jq{color:#c62828}"
  +".lun-mini.first{color:#00695c;font-weight:700}"
  +".alm-strip{margin:6px 0;padding:9px 12px;border-radius:10px;background:linear-gradient(135deg,#fff8e1,#fff3e0);border:1px solid #ffd699;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;color:#6d4c00;line-height:1.4;flex-wrap:wrap}"
  +".alm-strip b{color:#bf360c}"
  +".alm-strip .ar{margin-left:auto;color:#bf8a00;font-size:11px;white-space:nowrap}"
  +".alm-box{margin:10px 0 4px;border:1px solid #e8d9b0;border-radius:12px;overflow:hidden;background:#fffdf7}"
  +".alm-hd{background:linear-gradient(135deg,#7a5c00,#a87b00);color:#fff;padding:9px 14px;font-weight:700;font-size:14px;letter-spacing:1px;display:flex;align-items:center;gap:6px}"
  +".alm-bd{padding:10px 14px}"
  +".alm-big{text-align:center;padding:2px 0 9px;border-bottom:1px dashed #e0cda0;margin-bottom:8px}"
  +".alm-big .gd{font-size:12px;color:#8a6a00}"
  +".alm-big .lz{font-size:21px;font-weight:800;color:#5d4000;margin:3px 0;letter-spacing:2px}"
  +".alm-big .dz{font-size:15px;color:#a05a00;font-weight:700}"
  +".alm-row{display:flex;font-size:12.5px;line-height:1.55;padding:3px 0;border-bottom:1px solid #f3ecd8}"
  +".alm-row .k{flex:0 0 52px;color:#9b8550;font-weight:600}"
  +".alm-row .v{flex:1;color:#4a3d20}"
  +".alm-tag{display:inline-block;font-size:10px;padding:0 5px;border-radius:4px;margin-left:5px}"
  +".alm-tag.g{background:#e8f5e9;color:#2e7d32}.alm-tag.b{background:#ffebee;color:#c62828}"
  +".alm-yi,.alm-ji{padding:7px 0;border-bottom:1px solid #f3ecd8}"
  +".alm-lvrow{padding:7px 0 3px;font-size:12px;color:#9b8550;display:flex;align-items:center;gap:6px;flex-wrap:wrap}"
  +".alm-lv{display:inline-block;font-size:11px;font-weight:700;padding:1px 8px;border-radius:5px}"
  +".alm-lv.g{background:#e8f5e9;color:#2e7d32}.alm-lv.n{background:#fff3e0;color:#a86b00}.alm-lv.b{background:#ffebee;color:#c62828}"
  +".alm-fierce{font-size:11px;font-weight:700;color:#fff;background:#c62828;padding:1px 8px;border-radius:5px}"
  +".alm-yi .lab{color:#2e7d32;font-weight:800;font-size:14px;margin-right:6px}"
  +".alm-ji .lab{color:#c62828;font-weight:800;font-size:14px;margin-right:6px}"
  +".alm-words{font-size:12px;color:#4a3d20;line-height:1.85;word-break:break-all}"
  +".alm-god{font-size:11px;line-height:1.7;color:#6b5b30;padding-top:3px}"
  +".alm-god .gl{color:#2e7d32;font-weight:700}.alm-god .bl{color:#c62828;font-weight:700}"
  +".alm-note{font-size:10.5px;color:#9a824f;background:#fbf6e8;border-radius:6px;padding:7px 9px;margin-top:8px;line-height:1.55}"
  +".alm-dirs{display:flex;flex-wrap:wrap;gap:4px 6px;font-size:11px;margin-top:2px}"
  +".alm-dirs span{background:#f3ecd8;border-radius:5px;padding:1px 7px;color:#6d4c00}";
  document.head.appendChild(s);
}

// 日格小字：節氣優先 → 初一顯示月名 → 其餘顯示農曆日
window.lunarCellText=function(y,m,d){
  injCSS();
  var A=window.Almanac; if(!A)return"";
  try{
    var jq=A.jieqiOn(y,m,d);
    if(jq)return '<span class="lun-mini jq">'+jq+'</span>';
    var L=A.s2l(y,m,d);
    if(L.day===1)return '<span class="lun-mini first">'+L.mCn+'</span>';
    return '<span class="lun-mini">'+L.dCn+'</span>';
  }catch(e){return"";}
};

// 今日農民曆橫條（可點 → 開今日完整農民曆）
window.lunarTodayStrip=function(){
  injCSS();
  var A=window.Almanac; if(!A)return"";
  if(YIJI_STATE==="idle")loadYiji();
  try{
    var f=A.full(TY,TM,TD);
    var jq=f.jieqiToday?('<b>'+f.jieqiToday+'</b> · '):'';
    var extra="";
    if(YIJI_STATE==="ready"){var yj=yijiFor(TY,TM,TD); if(yj&&yj.good.length){extra=' · 宜 '+yj.good.slice(0,3).join("、");}}
    else if(YIJI_STATE==="loading"){extra=' · 宜忌載入中…';}
    return '<div class="alm-strip" data-a="almToday">📜 今日 '+jq+'農曆'+f.lunar.mCn+f.lunar.dCn+' · <b>'+f.gz.day+'日</b> · 生肖'+f.zodiac+extra+'<span class="ar">完整 ›</span></div>';
  }catch(e){return"";}
};

// 完整農民曆（day-detail modal 內）
window.lunarModalBlock=function(y,m,d){
  injCSS();
  var A=window.Almanac; if(!A)return"";
  if(YIJI_STATE==="idle")loadYiji();
  try{
  var f=A.full(y,m,d);
  var hd=f.huangdao.good?'<span class="alm-tag g">黃道吉日</span>':'<span class="alm-tag b">黑道凶日</span>';
  var xl=f.xiu.luck==="吉"?'<span class="alm-tag g">吉</span>':(f.xiu.luck==="凶"?'<span class="alm-tag b">凶</span>':'');
  var jqLine;
  if(f.jieqiToday){jqLine='<b style="color:#c62828">'+f.jieqiToday+'</b>（今日交節）';}
  else if(f.nextJieqi){jqLine='下一節氣 <b>'+f.nextJieqi.name+'</b>（'+f.nextJieqi.month+'/'+f.nextJieqi.day+'，還有 '+f.nextJieqi.days+' 天）';}
  else{jqLine='—';}
  var yiji, yj=yijiFor(y,m,d);
  if(yj){
    var lvCls=yj.level===0?'g':(yj.level>=2?'b':'n');
    var lvTag=yj.levelName?'<span class="alm-lv '+lvCls+'">'+yj.levelName+'</span>':'';
    var fierce=(yj.level===3);
    yiji='<div class="alm-lvrow">宜忌等第 '+lvTag+(fierce?'<span class="alm-fierce">凶日・吉事勿用</span>':'')+'</div>'
        +'<div class="alm-yi"><span class="lab">宜</span><span class="alm-words">'+(yj.good.length?yj.good.join("、"):'諸事不宜')+'</span></div>'
        +'<div class="alm-ji"><span class="lab">忌</span><span class="alm-words">'+(yj.bad.length?yj.bad.join("、"):'諸事不忌')+'</span></div>'
        +'<div class="alm-god"><span class="gl">吉神宜趨：</span>'+(yj.gGod.join("、")||"—")+'</div>'
        +'<div class="alm-god"><span class="bl">凶神宜忌：</span>'+(yj.bGod.join("、")||"—")+'</div>';
  } else if(YIJI_STATE==="loading"){
    yiji='<div class="alm-words" style="color:#9a824f;padding:7px 0">宜忌・神煞資料載入中…</div>';
  } else if(YIJI_STATE==="error"){
    yiji='<div class="alm-words" style="color:#c62828;padding:7px 0">宜忌資料載入失敗（離線且尚未快取，連網開啟一次即可）</div>';
  } else if(!inRange(y)){
    yiji='<div class="alm-note">宜忌・吉凶神煞為真實通書資料，目前涵蓋 '+RANGE_LO+'–'+RANGE_HI+' 年；此日超出範圍，故僅顯示上方曆法資訊（干支/節氣/建除/黃黑道/廿八宿/沖煞/納音/彭祖/胎神/方位皆為精算）。</div>';
  } else {
    yiji='<div class="alm-words" style="color:#9a824f;padding:7px 0">宜忌・神煞資料載入中…</div>';
  }
  var dirs=f.dirs.map(function(x){return '<span>'+x+'</span>';}).join("");
  return '<div class="alm-box"><div class="alm-hd">📜 農民曆</div><div class="alm-bd">'
   +'<div class="alm-big"><div class="gd">'+f.solar.y+'年'+f.solar.m+'月'+f.solar.d+'日　星期'+f.solar.dow+'</div>'
   +'<div class="lz">'+f.gz.year+'年　'+f.lunar.mCn+(f.lunar.monthBig?'大':'小')+'　'+f.lunar.dCn+'</div>'
   +'<div class="dz">'+f.gz.day+'日</div></div>'
   +'<div class="alm-row"><div class="k">干支</div><div class="v">年 '+f.gz.year+'　月 '+f.gz.month+'　日 '+f.gz.day+'</div></div>'
   +'<div class="alm-row"><div class="k">生肖</div><div class="v">'+f.zodiac+'　納音 '+f.nayinDay+'（'+f.dayWuxing+'）</div></div>'
   +'<div class="alm-row"><div class="k">節氣</div><div class="v">'+jqLine+'</div></div>'
   +'<div class="alm-row"><div class="k">建除</div><div class="v">'+f.jianchu+'　值神 '+f.huangdao.god+hd+'</div></div>'
   +'<div class="alm-row"><div class="k">廿八宿</div><div class="v">'+f.xiu.name+'宿'+xl+'</div></div>'
   +'<div class="alm-row"><div class="k">沖煞</div><div class="v">沖'+f.chongsha.chongSx+'（'+f.chongsha.chongZhi+'）　煞'+f.chongsha.sha+'</div></div>'
   +yiji
   +'<div class="alm-row" style="border:none;margin-top:6px"><div class="k">彭祖</div><div class="v" style="font-size:11.5px">'+f.peng[0]+'　'+f.peng[1]+'</div></div>'
   +'<div class="alm-row" style="border:none"><div class="k">胎神</div><div class="v">'+f.fetus+'</div></div>'
   +'<div class="alm-row" style="border:none;align-items:flex-start"><div class="k">方位</div><div class="v"><div class="alm-dirs">'+dirs+'</div></div></div>'
   +'</div></div>';
  }catch(e){return'<div class="alm-box"><div class="alm-bd" style="color:#c62828;font-size:12px">農民曆計算錯誤：'+e.message+'</div></div>';}
};
})();

const fbConfig={apiKey:"AIzaSyBKgqmsDIZgqf8nxWTDdTqVS01H0TIOCj4",authDomain:"myshift-a67f1.firebaseapp.com",projectId:"myshift-a67f1",storageBucket:"myshift-a67f1.firebasestorage.app",messagingSenderId:"779297515930",appId:"1:779297515930:web:7f5ba8992c5d5081a9f223"};
firebase.initializeApp(fbConfig);
const fbAuth=firebase.auth(),fbDb=firebase.firestore();
fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
let fbUser=null;
let fbAuthReady=false;

// ═══════════════════════════════════════════════════════════════
// Firestore 寫入佇列 — 序列化所有寫入操作，避免 SDK INTERNAL ASSERTION bug
// 所有對 Firestore 的寫入都應透過 fsEnqueue(fn) 進行
// ═══════════════════════════════════════════════════════════════
const _fsQueue=[];let _fsRunning=false;
function fsEnqueue(fn,label){
  return new Promise((resolve,reject)=>{
    _fsQueue.push({fn,label:label||"",resolve,reject});
    _fsDrain();
  });
}
async function _fsDrain(){
  if(_fsRunning)return;
  _fsRunning=true;
  while(_fsQueue.length){
    const job=_fsQueue.shift();
    try{
      const r=await job.fn();
      job.resolve(r);
    }catch(e){
      console.log("fs err ["+job.label+"]",e);
      // 偵測 Firestore SDK 致命錯誤
      if(/INTERNAL ASSERTION/i.test(e&&e.message||"")){
        _fsQueue.length=0;// 清空佇列
        _fsRunning=false;
        _handleFatalFsError();
        job.reject(e);
        return;
      }
      job.reject(e);
    }
    // 讓出事件迴圈一輪（不固定 sleep，避免累積延遲）
    await Promise.resolve();
  }
  _fsRunning=false;
}
let _fatalShown=false;
function _handleFatalFsError(){
  if(_fatalShown)return;_fatalShown=true;
  setTimeout(()=>{
    if(confirm(lang==="zh"?"雲端連線出現異常，需重新載入頁面才能繼續。現在重新載入？":"Connection error. Reload?")){
      location.reload();
    }
  },100);
}

// ═══════════════════════════════════════════════════════════════
// cloudSave debounce — 短時間多次呼叫只執行最後一次
// ═══════════════════════════════════════════════════════════════
let _cloudSaveTimer=null;
function _scheduleCloudSave(){
  if(_cloudSaveTimer)clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer=setTimeout(()=>{_cloudSaveTimer=null;cloudSave()},800);
}

let _initDone=false;let _cloudLoading=false;
function _doAuthInit(){if(_initDone)return;_initDone=true;_cloudLoading=true;render();loadAppConfig().then(()=>{cloudLoad().then(()=>{_cloudLoading=false;render();loadLeaves();loadAdminEv();syncALYearLeaves();_autoLocateOnLogin()}).catch(()=>{_cloudLoading=false;render();_autoLocateOnLogin()})})}
// 登入後自動定位：權限已授予就重抓最新位置，確保天氣對應實際所在地
function _autoLocateOnLogin(){
  try{
    if(navigator.permissions&&navigator.permissions.query){
      navigator.permissions.query({name:'geolocation'}).then(ps=>{
        // 已授權 → 清掉可能過期的位置快取，強制用當下 GPS 重抓一次
        if(ps.state==='granted'){
          try{localStorage.removeItem('_wxPos')}catch(e){}
          loadWx({force:true});
        }
        // 權限變動時（使用者後來才允許）自動重抓
        ps.onchange=function(){if(this.state==='granted'){try{localStorage.removeItem('_wxPos')}catch(e){}loadWx({force:true})}};
      }).catch(()=>{});
    }
  }catch(e){}
}
function syncALYearLeaves(){
  if(!fbUser)return Promise.resolve();
  return fsEnqueue(async()=>{
    const ay=curALY();
    const start=`${ay}-12-26`,end=`${ay+1}-12-25`;
    const rst=AL_RESET_TS[ay]||0;
    const annualIds=new Set();
    getLeaveTypes().forEach(lt=>{if(lt.id==="annual"||lt.name==="特休"||lt.nameId==="Cuti Tahunan")annualIds.add(lt.id)});
    if(!annualIds.size)annualIds.add("annual");
    const snap=await fbDb.collection("leaves").where("uid","==",fbUser.uid).get();
    let changed=false;
    const found={};
    snap.forEach(doc=>{
      const v=doc.data();
      if(!annualIds.has(v.leaveType)||v.date<start||v.date>end)return;
      const lts=v.ts&&v.ts.seconds?v.ts.seconds*1000:0;
      if(rst&&lts&&lts<rst)return;
      found[v.date]=(found[v.date]||0)+(v.hours||0);
    });
    for(const date in found){if(ALD[date]!==found[date]){ALD[date]=found[date];changed=true}}
    if(changed){sAL();render()}
  },"syncALYear").catch(e=>console.log("syncALYear err",e));
}
fbAuth.onAuthStateChanged(u=>{fbUser=u;fbAuthReady=true;if(u){
  // Immediately save display name for admin panel
  fsEnqueue(()=>fbDb.collection("users").doc(u.uid).set({displayName:u.displayName||"",email:u.email||"",photoURL:u.photoURL||"",lastLogin:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}),"loginTouch").catch(()=>{});
  _doAuthInit()}else{loadAdminEv()}render()});
fbAuth.getRedirectResult().then(r=>{if(r&&r.user){fbUser=r.user;fbAuthReady=true;render();_doAuthInit()}}).catch(()=>{});
setTimeout(()=>{if(!fbAuthReady){fbAuthReady=true;render()}},3000);
let _loading=false;
function cloudSave(force){
  if(!fbUser||(!force&&_loading))return Promise.resolve();
  return fsEnqueue(async()=>{
    const payload={rt:S.rt,pos:S.pos,ep:true,unit:S.unit||"",displayName:fbUser.displayName||"",email:fbUser.email||"",ev:JSON.stringify(EVS),al:JSON.stringify(AL),ald:JSON.stringify(ALD),tyd:JSON.stringify(TYD),otd:JSON.stringify(OTD),notes:JSON.stringify(NOTES),shiftov:JSON.stringify(SHIFT_OV),lang:lang,ts:firebase.firestore.FieldValue.serverTimestamp()};
    if(JSON.stringify(NOTES)==='{}')delete payload.notes;
    if(JSON.stringify(SHIFT_OV)==='{}')delete payload.shiftov;
    await fbDb.collection("users").doc(fbUser.uid).set(payload,{merge:true});
  },"cloudSave");
}
function cloudLoad(){
  if(!fbUser)return Promise.resolve();
  _loading=true;
  return fsEnqueue(async()=>{
    const doc=await fbDb.collection("users").doc(fbUser.uid).get();
    if(!doc.exists)return;
    const d=doc.data();
    if(d.rt&&d.pos!==null&&d.pos!==undefined){
      S.rt=d.rt;S.pos=d.pos;S.step="cal";
      const dd=JSON.stringify({rt:S.rt,pos:S.pos,ep:true,unit:S.unit||""});
      try{localStorage.setItem("sb_c",dd)}catch(e){}
      sCk("sb_c",dd,3650);
    }
    if(d.ev){try{EVS=JSON.parse(typeof d.ev==='string'?d.ev:JSON.stringify(d.ev))}catch(e){}}
    if(d.al){
      try{
        AL=JSON.parse(typeof d.al==='string'?d.al:JSON.stringify(d.al));
        ALD=d.ald?JSON.parse(typeof d.ald==='string'?d.ald:JSON.stringify(d.ald)):{};
      }catch(e){}
    }
    if(d.tyd){
      try{
        TYD=JSON.parse(typeof d.tyd==='string'?d.tyd:JSON.stringify(d.tyd));
        localStorage.setItem("sb_tyd",JSON.stringify(TYD));
      }catch(e){}
    }
    if(d.otd){
      try{
        OTD=JSON.parse(typeof d.otd==='string'?d.otd:JSON.stringify(d.otd))||{};
        localStorage.setItem("sb_otd",JSON.stringify(OTD));
      }catch(e){}
    }
    if(d.notes){
      try{
        const raw=d.notes;
        const _n=typeof raw==='string'?JSON.parse(raw):(typeof raw==='object'?raw:{});
        if(Object.keys(_n).length)NOTES=_n;
      }catch(e){}
    }
    if(d.shiftov){
      try{
        const raw=d.shiftov;
        const _o=typeof raw==='string'?JSON.parse(raw):(typeof raw==='object'?raw:{});
        SHIFT_OV=_o||{};
        localStorage.setItem("sb_shiftov",JSON.stringify(SHIFT_OV));
      }catch(e){}
    }
    if(d.lockedUnit){S.unit=d.lockedUnit;S.lockedUnit=d.lockedUnit}
    else if(d.unit){S.unit=d.unit}
    if(d.lockedRt){
      S.lockedRt=d.lockedRt;
      if(R[d.lockedRt]){
        S.rt=d.lockedRt;
        if(S.pos===null&&d.pos!==null&&d.pos!==undefined)S.pos=d.pos;
        if(S.pos===null)S.pos=0;
        S.step="cal";
      }
    }
    if(d.lang){lang=d.lang;try{localStorage.setItem("sb_l",lang)}catch(e){}sCk("sb_l",lang,3650)}
    // 薪資：從雲端拉回（隱私資料，僅自己可讀）
    try{cloudLoadSal(d)}catch(e){}
    // 只更新本地儲存，不觸發 cloudSave（否則 race condition）
    try{
      localStorage.setItem("sb_ev",JSON.stringify(EVS));
      localStorage.setItem("sb_al2",JSON.stringify(AL));
      localStorage.setItem("sb_ald",JSON.stringify(ALD));
      localStorage.setItem("sb_notes",JSON.stringify(NOTES));
    }catch(e){}
  },"cloudLoad").then(()=>{
    _loading=false;
    render();
  }).catch(e=>{
    _loading=false;
    console.log("cloudLoad err",e);
    render();
  });
}
let fbLoginPending=false;
function fbLogin(){const p=new firebase.auth.GoogleAuthProvider();
  fbLoginPending=true;render();
  fbAuth.signInWithPopup(p).then(r=>{
    fbLoginPending=false;
    if(r&&r.user){fbUser=r.user;fbAuthReady=true;_initDone=false;render();_doAuthInit()}
  }).catch(e=>{
    fbLoginPending=false;render();
    if(e.code==='auth/popup-blocked'){
      fbAuth.signInWithRedirect(p);
    }
  });
}
function fbLogout(){_initDone=false;fbAuth.signOut()}
let leavesCache={};
function loadLeaves(){
  return fsEnqueue(async()=>{
    const y=S.yr||TY,m=S.mo||TM;
    const ym1=y+"-"+String(m).padStart(2,"0");
    const pm=m===1?12:m-1,py=m===1?y-1:y;
    const ym2=py+"-"+String(pm).padStart(2,"0");
    const snap=await fbDb.collection("leaves").where("ym","in",[ym1,ym2]).get();
    const d={};
    snap.forEach(doc=>{
      const v=doc.data();
      if(S.unit&&S.unit!=="__all"&&v.unit&&v.unit!==S.unit)return;
      const k=v.date;
      if(!d[k])d[k]=[];
      d[k].push({docId:doc.id,uid:v.uid,name:v.name,type:v.type,leaveType:v.leaveType||"",hours:+v.hours||0,reason:v.reason||"",ts:v.ts,unit:v.unit||"",startOffset:Number.isFinite(+v.startOffset)?+v.startOffset:null,endOffset:Number.isFinite(+v.endOffset)?+v.endOffset:null,shiftStartMinute:Number.isFinite(+v.shiftStartMinute)?+v.shiftStartMinute:null,shiftHours:Number.isFinite(+v.shiftHours)?+v.shiftHours:null,shiftCode:v.shiftCode||"",schemaVersion:+v.schemaVersion||1});
    });
    leavesCache=d;
    _syncAnnualToALD();
    render();
  },"loadLeaves").catch(e=>{console.log("loadLeaves err",e)});
}
function _syncAnnualToALD(){if(!fbUser)return;const annualIds=new Set();getLeaveTypes().forEach(lt=>{if(lt.id==="annual"||lt.name==="特休"||lt.nameId==="Cuti Tahunan")annualIds.add(lt.id)});if(!annualIds.size)annualIds.add("annual");let changed=false;for(const date in leavesCache){let h=0;leavesCache[date].forEach(l=>{if(l.uid!==fbUser.uid||!annualIds.has(l.leaveType))return;const ay=alYear(+date.slice(0,4),+date.slice(5,7),+date.slice(8,10));const rst=AL_RESET_TS[ay]||0;const lts=l.ts&&l.ts.seconds?l.ts.seconds*1000:0;if(rst&&lts&&lts<rst)return;h+=l.hours||0});if(h>0){if(ALD[date]!==h){ALD[date]=h;changed=true}}}if(changed)sAL()}
function _syncAnnualDateToALD(date){
  if(!date)return;
  let h=0;
  const uid=fbUser&&fbUser.uid;
  (leavesCache[date]||[]).forEach(l=>{if((!uid||l.uid===uid)&&_isAnnualLT(l.leaveType))h+=Math.max(0,+l.hours||0)});
  if(h>0)ALD[date]=Math.round(h*100)/100;else delete ALD[date];
  sAL();
}
function _newLeaveSegmentId(){return"seg_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function addLeave(date,leaveTypeId,hours,reason,detail){
  if(!fbUser)return Promise.resolve();
  reason=(reason||"").toString().slice(0,50);
  detail=detail&&typeof detail==="object"?detail:{};
  const segmentId=detail.segmentId||_newLeaveSegmentId();
  const docId=fbUser.uid+"_"+date+"_"+leaveTypeId+"_"+segmentId;
  const entry={docId,uid:fbUser.uid,name:fbUser.displayName||fbUser.email,type:"leave",leaveType:leaveTypeId,hours:Math.max(0,+hours||0),reason:reason,ts:{seconds:Math.floor(Date.now()/1000)},unit:S.unit||"",startOffset:Number.isFinite(+detail.startOffset)?+detail.startOffset:null,endOffset:Number.isFinite(+detail.endOffset)?+detail.endOffset:null,shiftStartMinute:Number.isFinite(+detail.shiftStartMinute)?+detail.shiftStartMinute:null,shiftHours:Number.isFinite(+detail.shiftHours)?+detail.shiftHours:null,shiftCode:detail.shiftCode||"",schemaVersion:2};
  if(!leavesCache[date])leavesCache[date]=[];
  leavesCache[date].push(entry);
  if(_isAnnualLT(leaveTypeId))_syncAnnualDateToALD(date);
  S.modal=null;
  render();
  return fsEnqueue(async()=>{
    const payload={
      uid:fbUser.uid,name:fbUser.displayName||fbUser.email,date:date,ym:date.slice(0,7),
      type:"leave",leaveType:leaveTypeId,hours:entry.hours,unit:S.unit||"",schemaVersion:2,
      startOffset:entry.startOffset,endOffset:entry.endOffset,shiftStartMinute:entry.shiftStartMinute,
      shiftHours:entry.shiftHours,shiftCode:entry.shiftCode,
      ts:firebase.firestore.FieldValue.serverTimestamp()
    };
    if(reason)payload.reason=reason;
    await fbDb.collection("leaves").doc(docId).set(payload);
  },"addLeave").then(()=>loadLeaves()).catch(e=>{
    if(!/INTERNAL ASSERTION/i.test(e&&e.message||"")){
      if(leavesCache[date]){
        leavesCache[date]=leavesCache[date].filter(l=>l.docId!==docId);
        if(!leavesCache[date].length)delete leavesCache[date];
      }
      if(_isAnnualLT(leaveTypeId))_syncAnnualDateToALD(date);
      render();
      alert((lang==="zh"?"請假失敗: ":"Leave failed: ")+(e&&e.message||""));
    }
  });
}
function _isAnnualLT(id){const lt=getLT(id);return id==="annual"||(lt&&(lt.name==="特休"||lt.nameId==="Cuti Tahunan"))}
function _isSickLT(id){const lt=getLT(id)||{};const txt=String((id||"")+" "+(lt.name||"")+" "+(lt.nameId||"")).toLowerCase();return txt.includes("sick")||txt.includes("病假")||txt.includes("sakit")}
function removeLeave(date,leaveTypeId,docId){
  if(!fbUser)return Promise.resolve();
  let backup=null,backupALD=null,targetId=docId||"";
  if(leavesCache[date]){
    backup=leavesCache[date].slice();
    backupALD=Object.prototype.hasOwnProperty.call(ALD,date)?{[date]:ALD[date]}:{};
    if(targetId){leavesCache[date]=leavesCache[date].filter(l=>l.docId!==targetId)}
    else if(leaveTypeId){
      const target=leavesCache[date].find(l=>l.uid===fbUser.uid&&l.leaveType===leaveTypeId);
      if(target&&target.docId)targetId=target.docId;
      leavesCache[date]=leavesCache[date].filter(l=>l!==target);
    }else leavesCache[date]=leavesCache[date].filter(l=>l.uid!==fbUser.uid);
    if(!leavesCache[date].length)delete leavesCache[date];
    _syncAnnualDateToALD(date);
  }
  render();
  return fsEnqueue(async()=>{
    if(targetId){await fbDb.collection("leaves").doc(targetId).delete()}
    else if(leaveTypeId){
      const legacyId=fbUser.uid+"_"+date+"_"+leaveTypeId;
      await fbDb.collection("leaves").doc(legacyId).delete();
    }else{
      const snap=await fbDb.collection("leaves").where("uid","==",fbUser.uid).where("date","==",date).get();
      const refs=[];snap.forEach(d=>refs.push(d.ref));
      for(const ref of refs){await ref.delete();await new Promise(r=>setTimeout(r,30))}
    }
  },"removeLeave").then(()=>loadLeaves()).catch(e=>{
    if(!/INTERNAL ASSERTION/i.test(e&&e.message||"")){
      if(backup)leavesCache[date]=backup;
      if(backupALD&&Object.keys(backupALD).length)Object.assign(ALD,backupALD);else delete ALD[date];
      sAL();render();
      alert((lang==="zh"?"取消失敗: ":"Remove failed: ")+(e&&e.message||""));
    }
  });
}
function getLeaves(date){return leavesCache[date]||[]}
function myLeave(date){return getLeaves(date).filter(l=>l.uid===(fbUser&&fbUser.uid))}

const ADMIN_EMAILS=["onerkk@gmail.com","asus0814999@gmail.com"];
const ADMIN_EV=["meeting","health"];
function isAdmin(){if(!fbUser)return false;if(ADMIN_EMAILS.includes(fbUser.email))return true;return APP_CFG.admins&&APP_CFG.admins.some(a=>a.email===fbUser.email)}

// ═══ 請假總覽（管理員前台快速查看）═══
let LEAVES_OV_DATA=[];
let leavesOvYM="";
let leavesOvLoading=false;
let leavesOvUnitF="";
let leavesOvTypeF="";
let leavesOvSearch="";
function loadLeavesOvData(ym){
  if(!isAdmin())return;
  leavesOvLoading=true;
  if(S.showLeavesOv)render();
  fbDb.collection("leaves").where("ym","==",ym).get().then(snap=>{
    LEAVES_OV_DATA=[];
    snap.forEach(d=>{
      const v=d.data();
      if(v.uid&&v.uid.startsWith("admin_"))return;
      LEAVES_OV_DATA.push(Object.assign({docId:d.id},v));
    });
    LEAVES_OV_DATA.sort((a,b)=>{
      const c=(a.date||"").localeCompare(b.date||"");
      if(c!==0)return c;
      const ta=a.ts&&a.ts.seconds||0,tb=b.ts&&b.ts.seconds||0;
      return ta-tb;
    });
  }).catch(e=>{
    LEAVES_OV_DATA=[];
    console.log("loadLeavesOvData err",e);
  }).then(()=>{
    leavesOvLoading=false;
    if(S.showLeavesOv)render();
  });
}
function changeLeavesOvMonth(delta){
  const[y,m]=leavesOvYM.split("-").map(Number);
  const d=new Date(y,m-1+delta,1);
  leavesOvYM=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  loadLeavesOvData(leavesOvYM);
}
function setLeavesOvUnitF(v){leavesOvUnitF=v;render()}
function setLeavesOvTypeF(v){leavesOvTypeF=v;render()}
function setLeavesOvSearch(v){
  leavesOvSearch=v;
  const list=document.getElementById("leavesOvListBody");
  if(list)_renderLeavesOvList(list);
}
function _renderLeavesOvList(container){
  const isZh=lang==="zh";
  let filtered=LEAVES_OV_DATA.slice();
  if(leavesOvUnitF)filtered=filtered.filter(l=>(l.unit||"")===leavesOvUnitF);
  if(leavesOvTypeF)filtered=filtered.filter(l=>(l.leaveType||"")===leavesOvTypeF);
  if(leavesOvSearch){
    const q=leavesOvSearch.toLowerCase();
    filtered=filtered.filter(l=>(l.name||"").toLowerCase().includes(q)||(l.reason||"").toLowerCase().includes(q));
  }
  if(!filtered.length){
    container.innerHTML='<div style="text-align:center;padding:24px;color:var(--tx3);font-size:12px">'+(isZh?"本月沒有符合條件的請假紀錄":"Tidak ada cuti bulan ini")+'</div>';
    return;
  }
  const byDate={};
  filtered.forEach(l=>{const d=l.date||"";if(!byDate[d])byDate[d]=[];byDate[d].push(l)});
  const dates=Object.keys(byDate).sort();
  const today=(new Date()).toISOString().slice(0,10);
  const wkZh=["日","一","二","三","四","五","六"];
  const wkId=["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
  const wk=isZh?wkZh:wkId;
  const lts=getLeaveTypes();
  let html="";
  dates.forEach(d=>{
    const dayObj=new Date(d+"T00:00:00");
    const wkS=wk[dayObj.getDay()];
    const isToday=d===today;
    const isFuture=d>today;
    const dateBg=isToday?'#1565c0':(isFuture?'#2e7d32':'#666');
    const totalHrs=byDate[d].reduce((s,l)=>s+(l.hours||0),0),people=new Set(byDate[d].map(l=>l.uid)).size;
    html+='<div style="margin-bottom:14px"><div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:'+dateBg+';border-radius:6px;color:#fff;margin-bottom:6px"><span style="font-size:13px;font-weight:800">'+d.slice(5)+' ('+wkS+')'+(isToday?(isZh?" 今天":" Hari ini"):"")+'</span><span style="font-size:11px;opacity:0.85">'+people+(isZh?" 人 · 共 ":" org · ")+totalHrs+'h</span></div>';
    byDate[d].forEach(l=>{
      const lt=lts.find(x=>x.id===l.leaveType);
      const ltName=lt?(isZh?lt.name:(lt.nameId||lt.name)):(l.leaveType||(isZh?"未知":"?"));
      const color=lt&&lt.color||'#888';
      let timeStr="";
      if(l.ts&&l.ts.seconds){
        const dt=new Date(l.ts.seconds*1000);
        timeStr=(dt.getMonth()+1)+"/"+dt.getDate()+" "+String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0");
      }
      const reasonRow=l.reason?'<div style="margin-top:5px;padding:6px 8px;background:rgba(33,150,243,0.12);border-left:3px solid #2196f3;border-radius:4px;font-size:12px;color:#1565c0">💬 '+esc(l.reason)+'</div>':'';
      html+='<div style="background:rgba(0,0,0,0.04);border-radius:6px;padding:8px 10px;margin-bottom:5px;border-left:4px solid '+esc(color)+'"><div style="display:flex;justify-content:space-between;align-items:start;gap:8px;flex-wrap:wrap"><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;color:var(--tx)">'+esc(l.name||(isZh?"未知":"?"))+' <span style="font-size:11px;font-weight:500;color:var(--tx3)">'+esc(l.unit||(isZh?"無單位":"-"))+'</span></div><div style="font-size:12px;color:var(--tx2);margin-top:2px"><span style="color:'+esc(color)+';font-weight:600">'+esc(ltName)+'</span> · '+(l.hours||0)+'h · 🕒 '+esc(formatLeaveRange(l,d))+(timeStr?' · <span style="color:var(--tx3)">'+(isZh?"提交於 ":"")+timeStr+'</span>':'')+'</div></div></div>'+reasonRow+'</div>';
    });
    html+='</div>';
  });
  container.innerHTML=html;
}
function rLeavesOv(){
  if(!isAdmin())return "";
  const isZh=lang==="zh";
  if(!leavesOvYM){
    const now=new Date();
    leavesOvYM=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
    setTimeout(()=>loadLeavesOvData(leavesOvYM),0);
  }
  const realCount=LEAVES_OV_DATA.length;
  const byType={},byUnit={};
  LEAVES_OV_DATA.forEach(l=>{byType[l.leaveType]=(byType[l.leaveType]||0)+1;byUnit[l.unit||'(無)']=(byUnit[l.unit||'(無)']||0)+1});
  const totalHrs=LEAVES_OV_DATA.reduce((s,l)=>s+(l.hours||0),0);
  const reasonCount=LEAVES_OV_DATA.filter(l=>l.reason).length;
  const units=getUnits();
  const lts=getLeaveTypes();
  const unitOpts='<option value="">'+(isZh?"所有單位":"Semua Unit")+'</option>'+units.map(u=>'<option value="'+esc(u)+'"'+(leavesOvUnitF===u?' selected':'')+'>'+esc(u)+(byUnit[u]?' ('+byUnit[u]+')':'')+'</option>').join("");
  const typeOpts='<option value="">'+(isZh?"所有假別":"Semua Jenis")+'</option>'+lts.map(lt=>'<option value="'+esc(lt.id)+'"'+(leavesOvTypeF===lt.id?' selected':'')+'>'+esc(isZh?lt.name:(lt.nameId||lt.name))+(byType[lt.id]?' ('+byType[lt.id]+')':'')+'</option>').join("");
  const[y,m]=leavesOvYM.split("-");
  const monthLabel=isZh?(y+" 年 "+parseInt(m)+" 月"):(parseInt(m)+"/"+y);
  return '<div class="modal-bg" data-a="closeLeavesOv"><div class="modal-sheet help-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap"><div style="font-size:16px;font-weight:900">📅 '+(isZh?"請假總覽":"Ringkasan Cuti")+'</div><div style="display:flex;align-items:center;gap:4px"><button onclick="changeLeavesOvMonth(-1)" style="width:28px;height:28px;border-radius:6px;background:#eee;border:none;font-size:13px;cursor:pointer">◀</button><span style="font-size:13px;font-weight:700;min-width:90px;text-align:center">'+monthLabel+'</span><button onclick="changeLeavesOvMonth(1)" style="width:28px;height:28px;border-radius:6px;background:#eee;border:none;font-size:13px;cursor:pointer">▶</button><button onclick="loadLeavesOvData(leavesOvYM)" title="'+(isZh?"重新載入":"Reload")+'" style="width:28px;height:28px;border-radius:6px;background:var(--pri);color:#fff;border:none;font-size:12px;cursor:pointer;margin-left:2px">🔄</button></div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px"><div style="background:#1565c0;padding:10px;border-radius:6px;text-align:center;color:#fff"><div style="font-size:20px;font-weight:900">'+realCount+'</div><div style="font-size:10px;opacity:0.9">'+(isZh?"總筆數":"Total")+'</div></div><div style="background:#2e7d32;padding:10px;border-radius:6px;text-align:center;color:#fff"><div style="font-size:20px;font-weight:900">'+totalHrs+'h</div><div style="font-size:10px;opacity:0.9">'+(isZh?"總時數":"Jam")+'</div></div><div style="background:#6a1b9a;padding:10px;border-radius:6px;text-align:center;color:#fff"><div style="font-size:20px;font-weight:900">'+reasonCount+'</div><div style="font-size:10px;opacity:0.9">'+(isZh?"有填原因":"Beralasan")+'</div></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px"><select onchange="setLeavesOvUnitF(this.value)" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:var(--card);color:var(--tx)">'+unitOpts+'</select><select onchange="setLeavesOvTypeF(this.value)" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:var(--card);color:var(--tx)">'+typeOpts+'</select></div>'
    +'<input placeholder="🔍 '+(isZh?"搜尋姓名或原因...":"Cari nama/alasan...")+'" value="'+esc(leavesOvSearch)+'" oninput="setLeavesOvSearch(this.value)" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px;margin-bottom:10px;box-sizing:border-box;background:var(--card);color:var(--tx)">'
    +'<div id="leavesOvListBody">'+(leavesOvLoading?'<div style="text-align:center;padding:24px;color:var(--tx3);font-size:12px">'+(isZh?"載入中...":"Loading...")+'</div>':(LEAVES_OV_DATA.length?'':'<div style="text-align:center;padding:24px;color:var(--tx3);font-size:12px">'+(isZh?"本月尚無請假紀錄":"Belum ada cuti")+'</div>'))+'</div>'
    +'<div style="color:var(--tx3);font-size:10px;margin-top:12px;line-height:1.5;padding:8px;background:rgba(33,150,243,0.08);border-radius:6px;border-left:3px solid #2196f3">🔒 '+(isZh?"此頁面僅管理員可見。員工只能看到當天請假人數（無姓名無原因）。":"Hanya admin yang dapat melihat halaman ini.")+'</div>'
    +'<button class="modal-done" data-a="closeLeavesOv" style="margin-top:12px">'+t("done")+'</button></div></div>';
}

let adminEvCache={};
function loadAdminEv(){
  return fsEnqueue(async()=>{
    const y=S.yr||TY,m=S.mo||TM;
    const snap=await fbDb.collection("adminEvents").where("ym","==",y+"-"+String(m).padStart(2,"0")).get();
    const d={};
    snap.forEach(doc=>{const v=doc.data();const k=v.date;if(!d[k])d[k]=[];d[k].push(v.type)});
    adminEvCache=d;
    render();
  },"loadAdminEv").catch(e=>console.log("loadAdminEv err",e));
}
function setAdminEv(date,type,add){
  if(!isAdmin())return Promise.resolve();
  return fsEnqueue(async()=>{
    const id=type+"_"+date;
    if(add){
      await fbDb.collection("adminEvents").doc(id).set({date:date,ym:date.slice(0,7),type:type,ts:firebase.firestore.FieldValue.serverTimestamp()});
    }else{
      await fbDb.collection("adminEvents").doc(id).delete();
    }
  },"setAdminEv").then(()=>loadAdminEv()).catch(e=>console.log("setAdminEv err",e));
}
function getAdminEv(date){return adminEvCache[date]||[]}
function hasAdminEv(date){return getAdminEv(date).length>0}
const IMG={icon:"./images/icon.png",early:"./images/early.png",night:"./images/night.png",mid:"./images/mid.png",off:"./images/off.png"};

const SI={"早":IMG.early,"晚":IMG.night,"中":IMG.mid,"休":IMG.off};
const SC={"早":"e","晚":"n","中":"m","休":"o"};
const SE={"早":"🌅","晚":"🌙","中":"☀️","休":"🏠"};
const L={
zh:{app:"我的班表",sub:"My Shift",desc:"選擇輪班制度，三步自動排整年",s12:"12小時制",s8:"8小時制",cyc:"天循環",
  today:"今天",reset:"重設",help:"說明",lang:"ID",work:"上班",off:"休假",
  q1:"今天上班還是休假？",q2w:"上什麼班？",q2o:"休完接下來什麼班？",q3w:"#s#第幾天？",q3o:"休假第幾天？",dn:"第#n#天",
  早:"早班",晚:"晚班",中:"中班",休:"休假",workD:"上班",
  reqH:"應上班",totalH:"總工時",otH:"加班",alRem:"特休剩餘",
  rem:"🔔 本月提醒",mark:"標記事項",alarm:"⏰ 設鬧鐘",done:"完成",
  meeting:"班股會議",health:"體檢","class":"上課",biztrip:"公出",pay:"發薪日",annualL:"特休",custom:"自訂備註",typhoon:"颱風假",
  alPick:"使用特休時數",hr:"小時",alSetup:"🌴 特休設定（選填）",alTotal:"總時數",alUsed:"已使用",alSkip:"可跳過",
  instT:"安裝到主畫面",instS:"一鍵安裝",instSi:"Safari→分享→加入主畫面",instB:"安裝",
  aSet:"✅ 鬧鐘：#m#/#d# 07:00\n⚠️ 需保持瀏覽器開啟",aNow:"✅ 已提醒！",aBlock:"通知被封鎖",aNoPerm:"需開啟通知",aNo:"不支援通知",sRem:"班表提醒",
  helpT:"📖 使用說明",
  h:["初始設定|首次使用回答三個問題（上班或休假→班別→第幾天），系統自動排出整年班表。若管理員已在後台鎖定你的輪班規則，只需設定今天是哪一班即可。可隨時點底部「重設」重新設定。","查看班表|左右箭頭切換月份，點「今天」立刻回到本月。每日格子以顏色區分：藍色＝早班、紫色＝晚班、黃色＝中班、灰色＝休假。點擊任一日期可查看詳情、請假或標記事項。今天的日期會以橘色粗框顯示。","請假系統|點擊日期後可新增請假：先選假別，再選正常工時內的開始與結束時間。12 小時早班正常工時為 08:00–16:00、16:00–20:00 為加班；晚班正常工時為 20:00–翌日04:00、04:00–08:00 為加班。加班沒做不用請假，請在「加班出勤」另外記錄實際時數。同單位同事只看到當天請假人數（不知道是誰、不知道原因），管理員可查看完整名單、假別、時數與原因。已請的假可隨時點 ✕ 取消。","標記事項與颱風假|每日可標記：📚上課、🚗公出、💰發薪日、🌴特休、🌀颱風假、📝自訂備註（最多 50 字）。天災假可指定時數，依本期薪資條視為給薪時數，不扣加班與本薪。管理員可額外設定 📋班股會議與 🏥體檢日期，全體使用者可見。","特休管理|在請假彈窗下方輸入年度特休總時數與已使用時數（0.5 小時為單位）。日曆上勾選特休的日期會自動扣除並計算剩餘時數。特休年度為每年 12/26 到隔年 12/25（華新麗華制度）。","統計功能|點擊「統計」按鈕查看年度出勤統計：各班別總天數、每月工時長條圖、加班時數、特休使用率（含剩餘時數）。12 小時制每日另有 4 小時加班；正常工時請假與加班出勤分開記錄。請假只扣正常 8 小時，加班費依每天實際加班時數計算。可按上方箭頭切換年度查看。","薪資預估|月曆下方薪資卡片可設定薪資條完整欄位：職能俸、伙食津貼、交通津貼、崗位津貼、夜點費、勞健保自付、工會、福利金、其他固定扣款。系統自動估算當月實領金額，包含：前 2h 與後段加班費（不同倍率，公司 HR System 1.33340 / 1.66670）、免稅約 46.67h 切點、晚班次數 × 夜點費（可本期總額覆寫）、病假與事假扣款；天災假不扣加班。薪資資料同步至你個人雲端帳號（只有你看得到），換手機登入即可復原。","薪資計算週期|每月薪資計算區間為上月 26 日至當月 25 日。例如 3 月薪水計算的是 2/26 至 3/25 的出勤與加班時數。每月 5 日發放薪資（💰），每月 20 日發放績效獎金（🏆）。遇國定假日或週末自動提前至前一個工作日，日曆上直接標示實際發放日。","7 日天氣預報|自動偵測位置顯示 7 日天氣，點選可看逐時詳情（溫度、降雨機率、陣風、濕度）。資料每小時自動更新，可在個人設定 ⚙️ 點「重新抓取」強制立即更新。降雨機率優先採中央氣象署鄉鎮區間預報，溫度/濕度/風速採 Open-Meteo；即時雨量站只顯示實況，不會改寫預報。","9 種天氣警報|系統自動偵測並顯示警報橫幅，共 9 種：🌍地震、🌀颱風、⛈雷雨、🌧豪大雨/高降雨、🌂一般降雨、💨強風、🥵高溫、🥶低溫、🌫濃霧。地震使用中央氣象署有感地震報告；優先採所在地觀測震度，尚無所在地震度時才以規模＋震源距離保守判斷，且舊報告不補推。颱風與其他警特報以 CWA 官方有效時間、GPS 鄉鎮／CAP 範圍為準。每種警報的觸發門檻可由管理員在後台調整。","下雨提醒|上班日出門時段（早班/中班/晚班各自上班前 1 至 2 小時）若降雨機率 ≥ 40%，會在日曆下方顯示醒目橘色提醒「☔ 出門記得帶雨具」。可在個人設定 ⚙️ 中關閉。","個人設定 ⚙️|點天氣卡片右上 ⚙️ 進入，包含：①目前狀況診斷（即時溫度、降雨、警報數量）②總開關（警報橫幅與手機通知 兩個獨立）③9 種警報個別開關（橫幅與系統通知分開控制）④動畫/音效總開關與分類開關（天氣、動物、季節、音效）⑤通知權限狀態與「測試通知」「重新抓取天氣」按鈕。所有設定即時生效並雲端同步。","手機系統通知|啟用通知權限後，App 開啟時約每 30 秒查一次官方資料；關閉 App 後則由手機的背景同步或伺服器 Web Push 決定，純前端無法保證秒級到達。靜音時段內（管理員可設定，預設 22:00 至 07:00）不通知，保護休息。iOS 必須先「分享 → 加入主畫面」並從主畫面開啟才能啟用通知。","潮汐預報|自動偵測位置，顯示最近海岸測站的 7 日潮汐（滿潮/乾潮時間與潮位高度）。點選任一日可查看當日逐時詳細資料。資料來源為中央氣象署 CWA 開放資料。可點卡片上方箭頭收合節省空間。","季節動畫與環境音效|搭配四季與天氣自動變化：春花蝶舞與青蛙吐舌、夏夜螢火與蟬鳴、秋楓飄落與蜻蜓、冬霜結晶與寒鴉、雨天雨滴水花與雷電閃光、颱風雲卷、晴天陽光暈與鳥鳴、夜晚星空與蟋蟀。可在個人設定 ⚙️ 中關閉以省電。","暗夜模式自動切換|19:00 至 05:00 自動切換為暗色 UI（黑底白字），05:00 至 19:00 自動恢復白天模式，不再使用漸暗遮罩。系統依手機時間自動判斷，無需手動切換。可保護夜間視力、省電、夜班使用不刺眼。","雲端同步|登入 Google 帳號後，班表設定、標記事項、請假紀錄、備註、特休額度、颱風假時數、語言偏好、個人警報設定全部自動同步至雲端 Firestore。更換手機或清除資料後重新登入即可完整恢復，無需備份碼。薪資設定也會同步，但僅限你本人帳號可讀取（Firestore 規則鎖定 uid），其他人與管理員都看不到。","單位與輪班管理|管理員可在後台建立單位（如「研磨股 A 班/B 班/C 班」）與多種輪班規則（如四休二、兩早兩晚循環等），並鎖定使用者的單位和輪班類型。鎖定後使用者無法自行更改，確保全員資料一致。管理員亦可設定假別、發薪日、體檢、會議、警報門檻、靜音時段、視覺特效開關等。","多單位查看|管理員可在頂部選擇「全部單位」一次查看所有單位請假人數，方便整廠人力調度。一般使用者只看到自己所屬單位的資料。","節慶與假日|自動顯示台灣國定假日（含補假、調整放假）與印尼節慶（開齋節、宰牲節、寧靜日、衛塞節等），假日以紅色頂部標線標示。語言隨中文/印尼文切換自動翻譯。同時顯示固定節慶（情人節、母親節、雙 11 等，不影響休假但便於記憶）。","分享班表|點擊「分享」按鈕可產生當月班表 PNG 圖片，包含班別、假日、標記、節日等完整資訊。支援系統分享面板（直接分享到 LINE、WhatsApp 等），或自動下載到相簿，方便傳送給同事或家人。","安裝到桌面|底部安裝按鈕可將 App 加到手機桌面，如同原生 App 全螢幕使用，離線也能查看本月班表。右上角可切換中文（中）/印尼文（ID）。iOS 請用 Safari 開啟後「分享 → 加入主畫面」。Android 用 Chrome 自動跳出安裝提示。","桌面今日捷徑|想不開 App 一眼看今天什麼班？在瀏覽器網址列把 ?w=1 加在網址結尾（例：…/myshift/?w=1），打開後選「加入主畫面」，命名為「今日班別」。從此桌面上會多一個專屬捷徑，點開就是巨型今日班別顯示，完全離線、秒開。"],
  wk:["日","一","二","三","四","五","六"]},
id:{app:"My Shift",sub:"Jadwal Kerja",desc:"Pilih shift, 3 langkah otomatis setahun",s12:"12 jam",s8:"8 jam",cyc:"hari",
  today:"Hari ini",reset:"Reset",help:"Info",lang:"ZH",work:"Kerja",off:"Libur",
  q1:"Hari ini kerja atau libur?",q2w:"Shift apa?",q2o:"Setelah libur shift apa?",q3w:"#s# hari ke?",q3o:"Libur hari ke?",dn:"Hari #n#",
  早:"Pagi",晚:"Malam",中:"Siang",休:"Libur",workD:"Kerja",
  reqH:"Jam Wajib",totalH:"Total",otH:"Lembur",alRem:"Sisa Cuti",
  rem:"🔔 Pengingat",mark:"Tandai",alarm:"⏰ Alarm",done:"Selesai",
  meeting:"Rapat",health:"Kesehatan","class":"Kelas",biztrip:"Dinas",pay:"Gajian",annualL:"Cuti",custom:"Catatan",typhoon:"Libur Topan",
  alPick:"Jam cuti",hr:"jam",alSetup:"🌴 Cuti (opsional)",alTotal:"Total jam",alUsed:"Sudah pakai",alSkip:"Bisa dilewati",
  instT:"Pasang di HP",instS:"Satu klik",instSi:"Safari→Bagikan→Layar Utama",instB:"Pasang",
  aSet:"✅ Alarm: #m#/#d# 07:00",aNow:"✅ Terkirim!",aBlock:"Diblokir",aNoPerm:"Perlu izin",aNo:"Tidak mendukung",sRem:"Pengingat",
  helpT:"📖 Panduan",
  h:["Pengaturan Awal|Pertama kali pakai, jawab 3 pertanyaan (kerja/libur → shift apa → hari ke berapa), jadwal setahun otomatis dibuat. Jika admin sudah mengunci aturan shift Anda, cukup pilih hari ini shift apa. Bisa tekan 'Reset' di bawah untuk atur ulang kapan saja.","Lihat Jadwal|Geser bulan dengan panah kiri/kanan, tekan 'Hari ini' untuk kembali ke bulan ini. Warna kotak: biru = Pagi, ungu = Malam, kuning = Siang, abu-abu = Libur. Tekan tanggal mana saja untuk lihat detail, ajukan cuti, atau tandai acara. Tanggal hari ini ditandai garis oranye tebal.","Sistem Cuti|Tekan tanggal lalu pilih jenis cuti dan waktu mulai/selesai hanya dalam 8 jam kerja normal. Lembur dicatat terpisah dan tidak perlu diajukan sebagai cuti. Bisa isi Alasan Cuti (opsional, maks 50 huruf, hanya admin yang lihat), lalu konfirmasi. Rekan satu unit hanya lihat jumlah orang cuti hari itu (tidak tahu siapa, tidak tahu alasan). Admin bisa lihat nama lengkap, jenis, jam, dan alasan. Cuti bisa dibatalkan kapan saja dengan tekan ✕.","Tanda Acara & Libur Topan|Tandai harian: 📚Kelas, 🚗Dinas, 💰Gajian, 🌴Cuti Tahunan, 🌀Libur Topan, 📝Catatan bebas (maks 50 huruf). Jam libur bencana dapat dicatat; sesuai slip periode ini tidak mengurangi lembur atau gaji pokok. Admin bisa tambah 📋Rapat dan 🏥Cek Kesehatan untuk semua user.","Kelola Cuti Tahunan|Di bawah jendela cuti, isi total jam cuti tahunan dan jam terpakai (per 0.5 jam). Tanggal yang ditandai cuti tahunan otomatis dikurangi dan sisa dihitung. Tahun cuti: 26 Desember tahun ini sampai 25 Desember tahun depan (aturan Walsin Lihwa).","Statistik|Tekan 'Stat' untuk lihat statistik tahunan: jumlah hari per shift, grafik jam per bulan, total lembur, persentase cuti tahunan (dengan sisa jam). Shift 12 jam memiliki 8 jam normal dan 4 jam lembur. Cuti hanya mengurangi jam normal; jam lembur dihitung dari kehadiran lembur harian. Tekan panah di atas untuk ganti tahun.","Estimasi Gaji|Kartu gaji di bawah kalender, atur semua kolom slip gaji: Gaji Pokok, Tunjangan Makan, Transport, Posisi, Tunjangan Malam (per shift malam), BPJS Tenaga Kerja, BPJS Kesehatan, Iuran Serikat, Tunjangan Kesejahteraan, Potongan Lain. Sistem otomatis hitung perkiraan gaji bersih, termasuk: lembur 2 jam awal dan sisanya (tarif berbeda, default 1.34 dan 1.67), batas bebas pajak 46 jam, jumlah shift malam × tunjangan malam (bisa override total per periode), potongan sakit/izin; libur bencana tidak mengurangi lembur. Data hanya di HP, tidak ke cloud (lindungi privasi gaji). Disarankan foto sebagai cadangan.","Periode Perhitungan Gaji|Periode gaji dihitung dari tanggal 26 bulan lalu sampai tanggal 25 bulan ini. Contoh: gaji Maret dihitung dari 26 Februari sampai 25 Maret. Gaji dibayar tanggal 5 setiap bulan (💰), bonus kinerja tanggal 20 (🏆). Jika jatuh di hari libur nasional atau weekend, otomatis dimajukan ke hari kerja sebelumnya. Tanggal pembayaran asli ditampilkan di kalender.","Prakiraan Cuaca 7 Hari|Deteksi lokasi otomatis, tampilkan cuaca 7 hari. Tekan untuk detail per jam (suhu, kemungkinan hujan, kecepatan angin, kelembaban). Data diperbarui otomatis setiap jam. Bisa tekan ⚙️ Pengaturan lalu 'Reload' untuk update segera. Probabilitas hujan mengutamakan prakiraan interval CWA; suhu/kelembapan/angin memakai Open-Meteo. Observasi stasiun hujan tidak mengubah prakiraan.","9 Jenis Peringatan Cuaca|Sistem otomatis deteksi dan tampilkan banner peringatan, total 9 jenis: 🌍Gempa Bumi, 🌀Topan, ⛈Badai Petir, 🌧Hujan Lebat, 🌂Hujan Biasa, 💨Angin Kencang, 🥵Panas Ekstrem, 🥶Dingin Ekstrem, 🌫Kabut Tebal. Gempa pakai data realtime CWA Taiwan dengan ambang magnitudo, intensitas, jarak, dan waktu (salah satu lewat ambang langsung peringatan). Topan utamakan peringatan resmi CWA. Ambang setiap peringatan bisa diatur admin.","Pengingat Bawa Payung|Pada hari kerja, di jam berangkat (1 sampai 2 jam sebelum shift Pagi/Siang/Malam) jika kemungkinan hujan ≥ 40%, banner oranye 'Bawa payung' akan muncul di bawah kalender. Bisa dimatikan di Pengaturan ⚙️.","Pengaturan Pribadi ⚙️|Tekan ikon ⚙️ di pojok kanan atas kartu cuaca untuk masuk: ①Status saat ini (suhu, hujan, jumlah peringatan aktif) ②Saklar utama (Banner Peringatan dan Notifikasi HP — dua saklar terpisah) ③Saklar individu 9 peringatan (Banner dan Notifikasi diatur terpisah) ④Animasi cuaca dan suara on/off ⑤Status izin notifikasi dan tombol 'Test Notifikasi' dan 'Reload cuaca'. Semua pengaturan langsung aktif dan tersinkron ke cloud.","Notifikasi HP|Setelah izin notifikasi diaktifkan, peringatan serius seperti Topan, Hujan Lebat, Angin Kencang, Gempa akan muncul sebagai notifikasi sistem HP (bahkan saat App ditutup). Pada jam tenang (default 22:00 sampai 07:00, bisa diatur admin) tidak ada notifikasi, lindungi istirahat. iOS wajib 'Bagikan → Tambah ke Layar Utama' dan buka dari layar utama dulu, baru bisa aktifkan notifikasi.","Pasang Surut|Deteksi lokasi otomatis, tampilkan pasang surut 7 hari dari stasiun pantai terdekat (waktu pasang/surut dan ketinggian air). Tekan tanggal mana saja untuk detail per jam hari itu. Sumber data: CWA Taiwan open data. Tekan panah di atas kartu untuk lipat dan hemat ruang.","Animasi Musim dan Suara Alam|Berubah otomatis sesuai musim dan cuaca: musim semi (bunga, kupu-kupu, katak), musim panas malam (kunang-kunang, suara jangkrik), musim gugur (daun maple, capung), musim dingin (kristal es, burung gagak), hari hujan (tetesan, kilat petir), topan (awan bergulung), hari cerah (cahaya matahari, kicau burung), malam (langit berbintang, jangkrik). Bisa dimatikan di Pengaturan ⚙️ untuk hemat baterai.","Mode Gelap Otomatis|Pukul 19:00 sampai 05:00 otomatis ganti tampilan gelap (latar hitam, tulisan putih), 18:00 sampai 19:00 masa transisi (warna siang dengan layer gelap perlahan). Sistem otomatis berdasarkan jam HP, tidak perlu ganti manual. Melindungi mata di malam hari, hemat baterai, nyaman untuk shift malam.","Sinkronisasi Cloud|Login akun Google, semua pengaturan jadwal, tanda acara, riwayat cuti, catatan, kuota cuti tahunan, jam Libur Topan, bahasa, dan pengaturan peringatan pribadi otomatis tersimpan ke cloud Firestore. Ganti HP atau hapus data App, cukup login lagi untuk pulih lengkap, tanpa kode cadangan. Pengecualian: Data Gaji hanya di HP, tidak ke cloud (lindungi privasi).","Unit dan Aturan Shift|Admin bisa buat unit (contoh: Grinding Shift A/B/C) dan berbagai aturan shift (4 kerja 2 libur, 2 Pagi 2 Malam, dll) di panel admin, lalu kunci unit dan jenis shift setiap user. Setelah dikunci, user tidak bisa ubah sendiri agar data konsisten. Admin juga bisa atur jenis cuti, tanggal gajian, cek kesehatan, rapat, ambang peringatan, jam tenang, on/off animasi.","Lihat Semua Unit|Admin bisa pilih 'Semua Unit' di atas untuk lihat jumlah cuti semua unit sekaligus, memudahkan pengaturan tenaga kerja seluruh pabrik. User biasa hanya lihat data unitnya sendiri.","Hari Libur dan Perayaan|Otomatis tampilkan hari libur nasional Taiwan (termasuk pengganti, libur sambung) dan perayaan Indonesia (Idul Fitri, Idul Adha, Nyepi, Waisak, dll). Hari libur ditandai garis merah di atas tanggal. Terjemahan otomatis sesuai bahasa 中文/Indonesia. Perayaan tetap (Valentine, Hari Ibu, 11.11, dll) juga ditampilkan untuk diingat (tidak mempengaruhi libur).","Bagikan Jadwal|Tekan 'Share' untuk buat gambar PNG jadwal bulan ini, lengkap dengan shift, hari libur, tanda acara, dan perayaan. Mendukung panel berbagi sistem (langsung ke LINE, WhatsApp, dll) atau otomatis simpan ke galeri foto, mudah dikirim ke teman atau keluarga.","Pasang ke Layar|Tombol pasang di bawah untuk tambah App ke layar utama HP, seperti app asli — layar penuh, bisa offline. Ganti bahasa 中/ID di pojok kanan atas. iOS: buka di Safari → Bagikan → Tambah ke Layar Utama. Android: Chrome akan otomatis muncul tombol pasang.","Pintasan Hari Ini|Mau lihat shift hari ini tanpa buka App? Di browser, tambahkan ?w=1 di akhir URL (contoh: …/myshift/?w=1), lalu pilih 'Tambah ke Layar Utama', beri nama 'Shift Hari Ini'. Akan ada pintasan baru di layar HP — buka langsung tampil shift hari ini ukuran besar, offline, instan."],
  wk:["Min","Sen","Sel","Rab","Kam","Jum","Sab"]}
};
let RN={zh:{"4on2off":"做4休2","2on2off":"做2休2"},id:{"4on2off":"4K 2L","2on2off":"2K 2L"}};
let R={"4on2off":{h:12,c:["早","早","早","早","休","休","晚","晚","晚","晚","休","休"]},"2on2off":{h:12,c:["早","早","休","休","晚","晚","休","休"]}};
function rebuildR(){
  if(!APP_CFG.rotations||!APP_CFG.rotations.length)return;
  R={};RN={zh:{},id:{}};
  APP_CFG.rotations.forEach(rot=>{
    R[rot.id]={h:rot.hours,c:rot.cycle};
    RN.zh[rot.id]=rot.name;
    RN.id[rot.id]=rot.nameId||rot.name;
  });
}
// ════════════ 節慶顯示系統（歐那）2026-07 重構 ════════════
// 為何重構：農曆/節氣節慶原本逐年「手打國曆日期」，會打錯(例:2026端午誤植2025的5/31)、新增年份會再錯、且無交叉驗證。
// 根治：農曆/節氣節慶一律「由本檔農民曆引擎(Almanac, 對sxtwl+cnlunar 0誤差)即時推算」，任何年份都不會錯、不會漏。
//   ├ 引擎算：春節/除夕/小年夜/端午/七夕/中元/中秋/重陽(農曆) ＋ 清明/冬至(節氣) ＋ 母親節(5月2nd日)/父親節西式(6月3rd日)
//   ├ HOL_BASE：純固定國曆日(元旦/情人節/兒童節/勞動節/教師節/國慶/光復/萬聖/雙11/聖誕/台父親節08-08…)
//   ├ HOL_YEAR：只放「補假/政策日」——2026 為行政院人事行政總處公告正式值；2027-2030 依法規預估(待每年6/30前公告次年)
//   └ HOL_ID：印尼專屬節(開齋/宰牲/印尼國慶…)僅在印尼版(lang==='id')顯示
// getHOL 把四來源「同日合併」並以／串接(例:清明節／兒童節(補假)、💕七夕情人節／👔父親節)。薪資/排班放假認定走另一套 isTWOff，與此無關。
const HOL_BASE={"01-01":{zh:"元旦",id:"Tahun Baru"},"02-14":{zh:"💝 西洋情人節",id:"Hari Valentine"},"02-28":{zh:"和平紀念日",id:"Hari Perdamaian TW"},"03-08":{zh:"🌷 婦女節",id:"Hari Perempuan"},"03-14":{zh:"🤍 白色情人節",id:"White Day"},"04-01":{zh:"🤡 愚人節",id:"Hari April Mop"},"04-04":{zh:"兒童節",id:"Hari Anak TW"},"04-22":{zh:"🌏 世界地球日",id:"Hari Bumi"},"05-01":{zh:"勞動節",id:"Hari Buruh"},"08-08":{zh:"👔 父親節",id:"Hari Ayah TW"},"09-28":{zh:"教師節",id:"Hari Guru"},"10-10":{zh:"國慶日",id:"Hari Nasional TW"},"10-25":{zh:"光復節",id:"Hari Retrosesi"},"10-31":{zh:"🎃 萬聖節",id:"Halloween"},"11-11":{zh:"🛒 雙11購物節",id:"11.11 Shopping"},"12-24":{zh:"🎄 平安夜",id:"Malam Natal"},"12-25":{zh:"行憲紀念日／聖誕節",id:"Hari Natal"},"12-31":{zh:"🎆 跨年夜",id:"Malam Tahun Baru"}};
// 印尼專屬節（僅 lang==='id' 顯示，且不進 TW_OFF）
const HOL_ID={"01-27":{zh:"夜行登霄節",id:"Isra Mi'raj"},"01-29":{zh:"春節",id:"Imlek"},"03-28":{zh:"寧靜日",id:"Nyepi"},"03-31":{zh:"開齋節",id:"Idul Fitri"},"04-01":{zh:"開齋節",id:"Idul Fitri"},"04-18":{zh:"耶穌受難日",id:"Jumat Agung"},"05-12":{zh:"衛塞節",id:"Waisak"},"05-29":{zh:"耶穌升天日",id:"Kenaikan Yesus"},"06-07":{zh:"宰牲節",id:"Idul Adha"},"06-27":{zh:"伊斯蘭新年",id:"Tahun Baru Islam"},"08-17":{zh:"🇮🇩 印尼國慶",id:"🇮🇩 Kemerdekaan"},"09-05":{zh:"先知誕辰",id:"Maulid Nabi"}};
// 農曆節慶座標(月-日)→名稱；初一/初二/初三 皆標春節
const FEST_LUNAR={"1-1":{zh:"春節",id:"Imlek"},"1-2":{zh:"春節",id:"Imlek"},"1-3":{zh:"春節",id:"Imlek"},"5-5":{zh:"端午節",id:"Peh Cun"},"7-7":{zh:"💕 七夕情人節",id:"Qixi"},"7-15":{zh:"中元節",id:"Zhongyuan"},"8-15":{zh:"中秋節",id:"Festival Kue Bulan"},"9-9":{zh:"🍂 重陽節",id:"Chongyang"}};
function _nthSun(y,m,n){let c=0;for(let d=1;d<=31;d++){const dt=new Date(y,m-1,d);if(dt.getMonth()!==m-1)break;if(dt.getDay()===0&&++c===n)return d;}return null;}
let _FEST_CACHE={};
// 由農民曆引擎推算某年所有「可算節慶」→ {"MM-DD":{zh,id}}，每年算一次後快取
function buildFest(y){
  if(_FEST_CACHE[y])return _FEST_CACHE[y];
  const map={},A=(typeof Almanac!=="undefined")?Almanac:((typeof window!=="undefined")?window.Almanac:null);
  if(A&&A.s2l){
    let spring=null;
    for(let dt=new Date(y,0,1);dt<=new Date(y,11,31);dt.setDate(dt.getDate()+1)){
      const mm=dt.getMonth()+1,dd=dt.getDate(),L=A.s2l(y,mm,dd);
      if(!L.isLeap){const key=L.month+"-"+L.day;if(FEST_LUNAR[key]){map[hk(mm,dd)]=FEST_LUNAR[key];if(key==="1-1")spring=new Date(y,mm-1,dd);}}
      const jq=A.jieqiOn?A.jieqiOn(y,mm,dd):null;
      if(jq==="清明")map[hk(mm,dd)]={zh:"清明節",id:"Qingming"};
      if(jq==="冬至")map[hk(mm,dd)]={zh:"❄️ 冬至",id:"Dongzhi"};
    }
    if(spring){const cx=new Date(spring);cx.setDate(cx.getDate()-1);map[hk(cx.getMonth()+1,cx.getDate())]={zh:"除夕",id:"Malam Imlek"};
      const xy=new Date(spring);xy.setDate(xy.getDate()-2);map[hk(xy.getMonth()+1,xy.getDate())]={zh:"小年夜",id:"Malam Tahun Baru Imlek"};}
    const ms=_nthSun(y,5,2);if(ms)map[hk(5,ms)]={zh:"🌸 母親節",id:"Hari Ibu"};
    const fs=_nthSun(y,6,3);if(fs)map[hk(6,fs)]={zh:"👨 父親節(西式)",id:"Hari Ayah"};
  }
  _FEST_CACHE[y]=map;return map;
}
// 只放「補假/政策日」。2026=行政院公告正式值；2027-2030=依法規預估(待每年6/30前公告)
const HOL_YEAR={
  2026:{"02-20":{zh:"小年夜(補假)",id:"Libur Pengganti"},"02-27":{zh:"和平紀念日(補假)",id:"Libur Pengganti"},"04-03":{zh:"兒童節(補假)",id:"Libur Pengganti"},"04-06":{zh:"清明節(補假)",id:"Libur Pengganti"},"10-09":{zh:"國慶日(補假)",id:"Libur Pengganti"},"10-26":{zh:"光復節(補假)",id:"Libur Pengganti"}},
  // 2027 預估補假：春節2(週日)後補2/9、228(週日)→3/1、兒童(週日)→4/5(與清明同日合併)、勞動(週六)→4/30、國慶(週日)→10/11、行憲(週六)→12/24
  2027:{"02-09":{zh:"春節(補假)",id:"Libur Pengganti"},"03-01":{zh:"和平紀念日(補假)",id:"Libur Pengganti"},"04-05":{zh:"兒童節(補假)",id:"Libur Pengganti"},"04-30":{zh:"勞動節(補假)",id:"Libur Pengganti"},"10-11":{zh:"國慶日(補假)",id:"Libur Pengganti"},"12-24":{zh:"行憲紀念日(補假)",id:"Libur Pengganti"}},
  // 2028 預估補假：端午(週日)→5/29
  2028:{"05-29":{zh:"端午節(補假)",id:"Libur Pengganti"}},
  // 2029 預估補假：端午(週六)→6/15、中秋(週六)→9/21
  2029:{"06-15":{zh:"端午節(補假)",id:"Libur Pengganti"},"09-21":{zh:"中秋節(補假)",id:"Libur Pengganti"}},
  // 2030 預估補假：春節(逢週末)→2/6、教師節(週六)→9/27
  2030:{"02-06":{zh:"春節(補假)",id:"Libur Pengganti"},"09-27":{zh:"教師節(補假)",id:"Libur Pengganti"}}
};
// 合併四來源(節慶/補假/固定/印尼)；印尼節僅 id 版；同日多節以／串接去重
function getHOL(y,m,d){
  const k=hk(m,d),srcs=[];
  const fest=buildFest(y)[k];            if(fest)srcs.push(fest);
  const pol=HOL_YEAR[y]&&HOL_YEAR[y][k]; if(pol)srcs.push(pol);
  const base=HOL_BASE[k];               if(base)srcs.push(base);
  if(lang==="id"){const idh=HOL_ID[k];  if(idh)srcs.push(idh);}
  if(!srcs.length)return null;
  if(srcs.length===1)return srcs[0];
  const join=f=>{const s=[];srcs.forEach(x=>{if(x[f]&&s.indexOf(x[f])<0)s.push(x[f])});return s.join("／")};
  return {zh:join("zh"),id:join("id")};
}

// Year-specific Taiwan weekday holidays (for isOff & payday calculation)
// ⚠️ 只放「真正放假、影響加班/薪資/排班計算」的日期，不放純節慶（情人節、母親節等）
// 2027-2030 為依法規預估，正式版本須等行政院前一年公告
const TW_OFF_Y={
  2026:new Set(["01-01","02-16","02-17","02-18","02-19","02-20","02-27","04-03","04-06","05-01","06-19","09-25","09-28","10-09","10-26","12-25"]),
  // 2027：小年夜2/4、除夕2/5、春節2/6~2/8、春節補假2/9、228補假3/1、清明兒童4/2~4/5、勞動節補假4/30、勞動5/1、端午6/9、中秋9/15、教師9/28、國慶10/10、國慶補假10/11、光復10/25、行憲補假12/24、行憲12/25
  2027:new Set(["01-01","02-04","02-05","02-06","02-07","02-08","02-09","02-28","03-01","04-02","04-03","04-04","04-05","04-30","05-01","06-09","09-15","09-28","10-10","10-11","10-25","12-24","12-25"]),
  // 2028：元旦補假(前一年12-31)、元旦1/1(週六，前補12/31)、小年夜1/24、除夕1/25、春節1/26~1/28、228(週一)、清明兒童4/4、勞動5/1、端午5/28、端午補假5/29、中秋10/3、教師9/28、國慶10/10、光復10/25、行憲12/25
  2028:new Set(["01-01","01-24","01-25","01-26","01-27","01-28","02-28","04-04","05-01","05-28","05-29","09-28","10-03","10-10","10-25","12-25"]),
  // 2029：元旦、小年夜2/11(週日)、除夕2/12、春節2/13~2/15、228(週三)、清明兒童4/4、勞動5/1、端午6/15補假+6/16、中秋9/21補假+9/22、教師9/28、國慶10/10、光復10/25、行憲12/25
  2029:new Set(["01-01","02-11","02-12","02-13","02-14","02-15","02-28","04-04","05-01","06-15","06-16","09-21","09-22","09-28","10-10","10-25","12-25"]),
  // 2030：元旦、除夕補假2/1(週五)、除夕2/2、春節2/3~2/5、春節補假2/6、228(週四)、清明兒童4/4、勞動5/1、端午6/5、中秋9/12、教師補假9/27+教師9/28、國慶10/10、光復10/25、行憲12/25
  2030:new Set(["01-01","02-01","02-02","02-03","02-04","02-05","02-06","02-28","04-04","05-01","06-05","09-12","09-27","09-28","10-10","10-25","12-25"])
};
const TW_OFF_DEFAULT=new Set(["01-01","02-28","04-04","04-05","05-01","09-25","09-28","10-10","10-25","12-25"]);
function isTWOff(y,m,d){const s=TW_OFF_Y[y]||TW_OFF_DEFAULT;return s.has(hk(m,d))}
function getPayDay(y,m,base){let d=new Date(y,m-1,base);for(let i=0;i<10;i++){const dw=d.getDay();if(dw!==0&&dw!==6&&!isTWOff(d.getFullYear(),d.getMonth()+1,d.getDate()))break;d.setDate(d.getDate()-1)}return d.getDate()}
const EI=["meeting","health","class","biztrip","pay","annualL","custom","typhoon"];
const EE={meeting:"📋",health:"🏥","class":"📚",biztrip:"🚗",pay:"💰",annualL:"🌴",custom:"📝",typhoon:"🌀"};
const NOW=new Date(),TY=NOW.getFullYear(),TM=NOW.getMonth()+1,TD=NOW.getDate(),TR=new Date(TY,TM-1,TD);
const EPOCH=new Date(2024,0,1);
const EPOCH_UTC=Date.UTC(2024,0,1);
function dayOff(y,m,d){return Math.floor((Date.UTC(y,m-1,d)-EPOCH_UTC)/864e5)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function getSeason(){const m=new Date().getMonth()+1;if(m>=3&&m<=5)return'spring';if(m>=6&&m<=8)return'summer';if(m>=9&&m<=11)return'autumn';return'winter'}


let lang="zh";try{lang=localStorage.getItem("sb_l")||gCk("sb_l")||"zh"}catch(e){}
function t(k){return (L[lang]&&L[lang][k])||L.zh[k]||k}
function sf(s){return t(s)}
// ═══ ADMIN CONFIG (loaded from Firestore) ═══
// wxAlerts: 即時天氣警報設定 — 後台可開關每種警報、調整閾值
// 資料源：Open-Meteo 逐時預報 + CWA 官方警特報 worker（颱風/地震/豪大雨等官方優先）
// 注意：Open-Meteo 的降雨機率只作提醒；「豪雨警報」必須來自 CWA 官方警特報或明確雨量資料
let APP_CFG={admins:[],visualFx:{enabled:true},
  wxAlerts:{
    master:true,        // 警報系統總開關（前台橫幅）
    typhoon:true,       // 颱風（CWA 官方優先；無 worker 退回 Open-Meteo 推算跡象）
    storm:true,         // 雷雨
    heavyRain:true,     // CWA 豪大雨官方警特報優先；無官方資料時只顯示高降雨機率提醒
    rain:true,          // 一般降雨警告（未來 3h 任一小時 ≥ rainProb）
    strongWind:true,    // 強風
    heat:true,          // 高溫
    cold:true,          // 低溫
    fog:false,          // 濃霧（預設關閉，避免太頻繁）
    earthquake:true,    // 地震警報（需 CWA worker）
    // 閾值（可在後台調整）
    rainProb:60,
    heavyRainProb:80,
    windAlertMetric:"gust",   // 強風警報固定使用陣風，不再使用平均風速
    windThreshold:62,        // 舊欄位：只保留相容；儲存時會同步為陣風門檻
    windGustThreshold:62,    // 後台實際設定欄位：陣風門檻 km/h
    typhoonWind:62,
    heatThreshold:36,
    coldThreshold:10,
    // ── CWA 統合 worker（颱風 + 地震）──
    cwaWorkerUrl:"",            // 例 https://cwa-data.xxx.workers.dev
    typhoonWorkerUrl:"",        // 舊欄位（向後相容；讀取時若 cwaWorkerUrl 為空則用此）
    typhoonAlertDistanceKm:800,
    typhoonMinIntensity:'td',
    typhoonAlertOnNotice:true,
    // ── 地震警報門檻 ──
    earthquakeMinMagnitude:4.0,   // 規模門檻（M）
    earthquakeMinIntensity:3,     // 震度門檻（級）— 有所在地震度時以所在地震度為準；缺少震度資料才使用規模與距離備援
    earthquakeMaxDistanceKm:120,  // GPS 距用戶距離限制（km），預設 120；不再用全台不限距離
    earthquakeMaxAgeMinutes:120,  // 橫幅可顯示的地震報告最長時效
    earthquakeNotifyMaxAgeMinutes:15, // 手機通知只推送非常近期的地震，避免開 App 後補推舊事件
    officialAlertCacheMaxMinutes:10,   // 無明確失效時間的官方資料，超過此抓取時間即不再當作有效警報
    backgroundPositionMaxAgeMinutes:360, // 背景定位超過 6 小時即停推，避免人在外地仍收到舊地點警報
    foregroundAlertPollSeconds:30,     // App 在前景時的官方警報輪詢頻率
    // ── 系統通知 ──
    notifyEnabled:true,
    notifyTyphoon:true,
    notifyStorm:true,
    notifyHeavyRain:true,
    notifyRain:false,
    notifyStrongWind:true,
    notifyHeat:false,
    notifyCold:false,
    notifyFog:false,
    notifyEarthquake:true,       // 地震系統通知（預設 ON）
    cooldownHours:3,
    quietStart:22,
    quietEnd:7,
    quietIgnoreCritical:true,
    // ── 偵測時段 ──
    timeWindows:{
      rain:[],heavyRain:[],strongWind:[],heat:[],cold:[],fog:[]
    }
  },
  units:["冷抽二股A板","冷抽二股B板","冷抽二股C板","冷抽一股A板","冷抽一股B板","冷抽一股C板","熱處理A板","熱處理B板","品管","其他"],
  rotations:[
    {id:"4on2off",name:"做4休2",nameId:"4K 2L",hours:12,cycle:["早","早","早","早","休","休","晚","晚","晚","晚","休","休"]},
    {id:"2on2off",name:"做2休2",nameId:"2K 2L",hours:12,cycle:["早","早","休","休","晚","晚","休","休"]},
    {id:"5on_mixed",name:"做5休1＋做5休2",nameId:"5K1L+5K2L",hours:8,cycle:["早","早","早","早","早","休","早","早","早","早","早","休","休","中","中","中","中","中","休","中","中","中","中","中","休","休","晚","晚","晚","晚","晚","休","晚","晚","晚","晚","晚","休","休"]}
  ],
  leaveTypes:[
    {id:"annual",name:"特休",nameId:"Cuti Tahunan",step:0.5,color:"#4caf50",otDeduct:4},
    {id:"sick",name:"病假",nameId:"Sakit",step:1,color:"#f44336",otDeduct:4},
    {id:"personal",name:"事假",nameId:"Izin Pribadi",step:1,color:"#ff9800",otDeduct:4},
    {id:"funeral",name:"喪假",nameId:"Duka Cita",step:1,color:"#616161",otDeduct:4},
    {id:"marriage",name:"婚假",nameId:"Nikah",step:1,color:"#e91e63",otDeduct:4},
    {id:"maternity",name:"產假",nameId:"Melahirkan",step:1,color:"#9c27b0",otDeduct:4},
    {id:"official",name:"公假",nameId:"Dinas",step:1,color:"#2196f3"},
    {id:"comp",name:"補休",nameId:"Kompensasi",step:0.5,color:"#009688"}
  ]
};
normalizePayrollLeaveTypes();
const UNITS_DEFAULT=APP_CFG.units.slice();
try{window.APP_CFG=APP_CFG}catch(e){}

// ═══════════════════════════════════════════════════════════════
// 用戶個人設定（存 localStorage，不雲端同步以省流量）
// 分層權限：管理員設定 = 上限；用戶可在上限內進一步關閉
// ═══════════════════════════════════════════════════════════════
const USER_PREFS_DEFAULTS={
  wxMaster:true,
  wxNotify:true,
  wxItems:{
    typhoon:true,storm:true,heavyRain:true,rain:true,
    strongWind:true,heat:true,cold:true,fog:true,earthquake:true
  },
  wxNotifyItems:{
    typhoon:true,storm:true,heavyRain:true,rain:true,
    strongWind:true,heat:true,cold:true,fog:true,earthquake:true
  },
  visualFx:true,
  fxDetail:{
    weather:true,
    animals:true,
    seasonal:true,
    sound:true
  }
};
let USER_PREFS=Object.assign({},USER_PREFS_DEFAULTS,{
  wxItems:Object.assign({},USER_PREFS_DEFAULTS.wxItems),
  wxNotifyItems:Object.assign({},USER_PREFS_DEFAULTS.wxNotifyItems),
  fxDetail:Object.assign({},USER_PREFS_DEFAULTS.fxDetail)
});
try{
  const raw=localStorage.getItem('_userPrefs');
  if(raw){
    const p=JSON.parse(raw);
    if(typeof p==='object'){
      // 淺合併 + items 深合併
      if(typeof p.wxMaster==='boolean')USER_PREFS.wxMaster=p.wxMaster;
      if(typeof p.wxNotify==='boolean')USER_PREFS.wxNotify=p.wxNotify;
      if(typeof p.visualFx==='boolean')USER_PREFS.visualFx=p.visualFx;
      if(p.wxItems&&typeof p.wxItems==='object')Object.assign(USER_PREFS.wxItems,p.wxItems);
      if(p.wxNotifyItems&&typeof p.wxNotifyItems==='object')Object.assign(USER_PREFS.wxNotifyItems,p.wxNotifyItems);
      if(p.fxDetail&&typeof p.fxDetail==='object')Object.assign(USER_PREFS.fxDetail,p.fxDetail);
    }
  }
}catch(e){}
function _alertPrefsForSw(){
  return {wxMaster:USER_PREFS.wxMaster!==false,wxNotify:USER_PREFS.wxNotify!==false,wxNotifyItems:Object.assign({},USER_PREFS.wxNotifyItems||{})};
}
async function syncAlertPrefsToServiceWorker(){
  if(!('serviceWorker' in navigator))return;
  const msg={type:'WX_PREFS',prefs:_alertPrefsForSw()};
  try{
    const reg=await navigator.serviceWorker.ready;
    const sw=reg.active||reg.waiting||reg.installing||navigator.serviceWorker.controller;
    if(sw)sw.postMessage(msg);
  }catch(e){
    try{if(navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage(msg)}catch(e2){}
  }
}
function saveUserPrefs(){
  try{localStorage.setItem('_userPrefs',JSON.stringify(USER_PREFS))}catch(e){}
  try{syncAlertPrefsToServiceWorker()}catch(e){}
}
function setUserPref(key,val){
  if(key.indexOf('.')>=0){
    const [g,k]=key.split('.');
    if(USER_PREFS[g]&&typeof USER_PREFS[g]==='object'){USER_PREFS[g][k]=val}
  }else{USER_PREFS[key]=val}
  saveUserPrefs();
  // 立即應用副作用
  applyVisualFxSetting();
  // 警報相關變更時，重評估通知（若有新警報且原本被自己關掉，可能要立刻推；若關掉了，不會誤推）
  try{checkAndNotifyAlerts()}catch(e){}
  render();
}
function isFxAdminEnabled(){
  return !(APP_CFG&&APP_CFG.visualFx&&APP_CFG.visualFx.enabled===false);
}
function isFxMasterEnabled(){
  return !(USER_PREFS&&USER_PREFS.visualFx===false);
}
function isFxEnabled(kind){
  try{
    if(!isFxAdminEnabled()||!isFxMasterEnabled()) return false;
    const detail=(USER_PREFS&&USER_PREFS.fxDetail)||{};
    if(kind==='weather') return detail.weather!==false;
    if(kind==='animals') return detail.animals!==false;
    if(kind==='seasonal') return detail.seasonal!==false;
    if(kind==='sound') return detail.sound!==false;
    return true;
  }catch(e){return true}
}
function anyVisualFxEnabled(){
  return isFxEnabled('weather')||isFxEnabled('animals')||isFxEnabled('seasonal');
}
try{window.USER_PREFS=USER_PREFS;window.setUserPref=setUserPref;window.isFxEnabled=isFxEnabled;window.anyVisualFxEnabled=anyVisualFxEnabled}catch(e){}

function getUnits(){return APP_CFG.units}
function getLeaveTypes(){return APP_CFG.leaveTypes}
function getLT(id){return APP_CFG.leaveTypes.find(t=>t.id===id)}
// 舊資料相容設定：舊版只有請假時數、沒有起訖時間與實際加班時數時，才用 otDeduct 推定未做加班。
function normalizePayrollLeaveTypes(){
  try{
    const list=APP_CFG.leaveTypes||[];
    for(const lt of list){
      const id=String(lt.id||"").toLowerCase(),nm=String(lt.name||"");
      const v=lt.otDeduct==null?null:Number(lt.otDeduct);
      // 只遷移舊版錯誤預設，不覆蓋管理員已自訂的合理值。
      if((id==="annual"||nm.indexOf("特休")>=0)&&v==null)lt.otDeduct=4;
      if((id==="sick"||nm.indexOf("病假")>=0)&&(v==null||v===8))lt.otDeduct=4;
      if((id==="personal"||nm.indexOf("事假")>=0)&&(v==null||v>4))lt.otDeduct=4;
      if((id==="official"||id==="comp"||nm.indexOf("公假")>=0||nm.indexOf("補休")>=0)&&v==null)lt.otDeduct=0;
    }
  }catch(e){}
}
function normalizeWxAlertConfig(){
  try{
    const wx=APP_CFG.wxAlerts||(APP_CFG.wxAlerts={});
    // v199：強風後台只設定「陣風門檻」。
    // 舊版後台/Firestore 可能仍寫 windThreshold；此欄位現在視為 legacy alias，讀到後同步到 windGustThreshold。
    let gust=parseFloat(wx.windGustThreshold);
    const legacy=parseFloat(wx.windThreshold);
    if(Number.isFinite(legacy)&&(!Number.isFinite(gust)||legacy!==gust)){
      // 兼容舊畫面：若舊 UI 仍改 windThreshold，儲存前也視為改了陣風門檻。
      gust=legacy;
    }
    if(!Number.isFinite(gust)||gust<=0) gust=62; // 預設用 CWA 陣風 8 級約 62 km/h
    wx.windAlertMetric='gust';
    wx.windGustThreshold=gust;
    wx.windThreshold=gust; // legacy mirror，避免舊 SW/舊 UI 讀不到
  }catch(e){}
}
function setWxGustThreshold(v){
  const wx=APP_CFG.wxAlerts||(APP_CFG.wxAlerts={});
  const n=parseFloat(v);
  if(!Number.isFinite(n)||n<=0)return;
  wx.windAlertMetric='gust';
  wx.windGustThreshold=n;
  wx.windThreshold=n; // legacy mirror
  saveAppConfig();
  try{checkAndNotifyAlerts()}catch(e){}
  render();
}
try{window.setWxGustThreshold=setWxGustThreshold}catch(e){}
function applyGustAdminUiCompat(){
  try{
    normalizeWxAlertConfig();
    const root=document.getElementById('app');
    if(!root)return;
    // 若舊版後台 UI 仍寫「風速」，這裡在畫面層改成「陣風」，避免管理員誤會。
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      let t=n.nodeValue||'';
      const o=t;
      t=t.replace(/當前或未來\s*3\s*小時風速/g,'當前或未來 3 小時陣風');
      t=t.replace(/每小時風速/g,'每小時陣風');
      t=t.replace(/風速門檻/g,'陣風門檻');
      t=t.replace(/風速 > 門檻/g,'陣風 > 門檻');
      t=t.replace(/風速 ≥ 門檻/g,'陣風 ≥ 門檻');
      if(t!==o)n.nodeValue=t;
    });
    // 兼容舊後台 input：若仍有強風 km/h 欄位，輸入時同步到 windGustThreshold。
    const inputs=[...root.querySelectorAll('input[type="number"],input[inputmode="numeric"],input[inputmode="decimal"]')];
    inputs.forEach(inp=>{
      const box=inp.closest('div');
      const ctx=(box&&box.innerText||'');
      if(!/強風/.test(ctx)||!/km\/h/.test(ctx))return;
      if(!/(風速門檻|陣風門檻|風速|陣風)/.test(ctx))return;
      if(!inp.dataset.gustCompat){
        inp.dataset.gustCompat='1';
        inp.value=String(APP_CFG.wxAlerts.windGustThreshold||62);
        const sync=function(){
          const v=parseFloat(inp.value);
          if(Number.isFinite(v)&&v>0){
            APP_CFG.wxAlerts.windAlertMetric='gust';
            APP_CFG.wxAlerts.windGustThreshold=v;
            APP_CFG.wxAlerts.windThreshold=v;
          }
        };
        inp.addEventListener('input',sync);
        inp.addEventListener('change',function(){sync();saveAppConfig();});
      }
    });
  }catch(e){}
}
function loadAppConfig(){
  return fsEnqueue(async()=>{
    const doc=await fbDb.collection("config").doc("app").get();
    if(doc.exists){
      const d=doc.data();
      if(d.units&&d.units.length)APP_CFG.units=d.units;
      if(d.leaveTypes&&d.leaveTypes.length)APP_CFG.leaveTypes=d.leaveTypes;
      normalizePayrollLeaveTypes();
      if(d.admins)APP_CFG.admins=d.admins;
      if(d.rotations&&d.rotations.length)APP_CFG.rotations=d.rotations;
      if(d.visualFx&&typeof d.visualFx.enabled==='boolean') APP_CFG.visualFx.enabled=d.visualFx.enabled;
      // wxAlerts: 合併讀取（保留預設值，後台可單獨覆寫部分欄位）
      if(d.wxAlerts&&typeof d.wxAlerts==='object'){
        for(const k in d.wxAlerts){
          if(d.wxAlerts[k]===undefined||d.wxAlerts[k]===null) continue;
          if(k==='timeWindows'&&typeof d.wxAlerts[k]==='object'){
            // 深層合併時段
            APP_CFG.wxAlerts.timeWindows=APP_CFG.wxAlerts.timeWindows||{};
            for(const aid in d.wxAlerts.timeWindows){
              if(Array.isArray(d.wxAlerts.timeWindows[aid])) APP_CFG.wxAlerts.timeWindows[aid]=d.wxAlerts.timeWindows[aid];
            }
          }else{
            APP_CFG.wxAlerts[k]=d.wxAlerts[k];
          }
        }
      }
      normalizeWxAlertConfig();
      rebuildR();
      applyVisualFxSetting();
    }
  },"loadAppConfig").catch(e=>console.log("loadCfg err",e));
}
// 全域 FX 開關：套用設定（影響 canvas 顯示 + 聲音）
// 最終開啟條件 = 管理員允許 AND 用戶啟用
function applyVisualFxSetting(){
  const visualOn=anyVisualFxEnabled();
  const soundOn=isFxEnabled('sound');
  try{
    const cv=document.getElementById('wxfx');
    if(cv) cv.style.display=visualOn?'':'none';
  }catch(e){}
  try{
    if((!visualOn||!soundOn) && window.WxFx && window.WxFx._forceSilence) window.WxFx._forceSilence();
  }catch(e){}
  try{
    if((!visualOn||!soundOn) && window.WxSfx && window.WxSfx._forceSilence) window.WxSfx._forceSilence();
    else if(soundOn && window.WxSfx && window.WxFx && window.WxFx.getMode && window.WxSfx.setMode && !window.WxSfx.isMuted()) window.WxSfx.setMode(window.WxFx.getMode());
  }catch(e){}
  // 切換特效或後台設定後，立刻依目前最新天氣重新判定，不必等下一次 API 更新。
  try{_syncWeatherFx()}catch(e){}
}
function saveAppConfig(){
  if(!isAdmin())return Promise.resolve();
  try{normalizeWxAlertConfig()}catch(e){}
  return fsEnqueue(()=>fbDb.collection("config").doc("app").set({
    units:APP_CFG.units,leaveTypes:APP_CFG.leaveTypes,admins:APP_CFG.admins||[],rotations:APP_CFG.rotations||[],
    visualFx:APP_CFG.visualFx||{enabled:true},
    wxAlerts:APP_CFG.wxAlerts||{master:true},
    ts:firebase.firestore.FieldValue.serverTimestamp()
  },{merge:true}),"saveCfg").catch(e=>console.log("saveCfg err",e));
}
let S={step:"type",rt:"4on2off",pos:null,yr:TY,mo:TM,wT:null,wS:null,wD:null,wN:null,modal:null,showH:false,showStats:false,statsYr:TY,instH:false,unit:"",lockedUnit:"",lockedRt:"",showSal:false,showLeavesOv:false,showLunar:false};

// Product-level information architecture: five stable top-level destinations.
// Kept separate from cloud shift settings so visual navigation never pollutes user data.
let UI_TAB="today";
try{
  const savedTab=localStorage.getItem("myshift_ui_tab");
  if(["today","calendar","pay","weather","more"].includes(savedTab))UI_TAB=savedTab;
}catch(e){}
function setUiTab(tab){
  if(!["today","calendar","pay","weather","more"].includes(tab))tab="today";
  UI_TAB=tab;
  try{localStorage.setItem("myshift_ui_tab",tab)}catch(e){}
  window.scrollTo({top:0,behavior:(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)?"auto":"smooth"});
}

try{if(localStorage.getItem("sb_lunar")==="1")S.showLunar=true;}catch(e){}
let EVS={};try{EVS=JSON.parse(localStorage.getItem("sb_ev"))||JSON.parse(gCk("sb_ev"))||{}}catch(e){}
function sEv(){const d=JSON.stringify(EVS);try{localStorage.setItem("sb_ev",d)}catch(e){}try{sCk("sb_ev",d,3650)}catch(e){}_scheduleCloudSave()}
let AL={};try{AL=JSON.parse(localStorage.getItem("sb_al2"))||JSON.parse(gCk("sb_al2"))||{}}catch(e){}
let ALD={};try{ALD=JSON.parse(localStorage.getItem("sb_ald"))||JSON.parse(gCk("sb_ald"))||{}}catch(e){}
let TYD={};try{TYD=JSON.parse(localStorage.getItem("sb_tyd"))||JSON.parse(gCk("sb_tyd"))||{}}catch(e){}
function sTYD(){const d=JSON.stringify(TYD);try{localStorage.setItem("sb_tyd",d)}catch(e){}try{sCk("sb_tyd",d,3650)}catch(e){}_scheduleCloudSave()}
// 每日實際加班時數。未設定時依排班預設；設定 0 代表當日不加班，並非請假。
let OTD={};try{OTD=JSON.parse(localStorage.getItem("sb_otd"))||JSON.parse(gCk("sb_otd"))||{}}catch(e){OTD={}}
function sOTD(){const d=JSON.stringify(OTD);try{localStorage.setItem("sb_otd",d)}catch(e){}try{sCk("sb_otd",d,3650)}catch(e){}_scheduleCloudSave()}
let AL_RESET_TS={};try{AL_RESET_TS=JSON.parse(localStorage.getItem("sb_al_reset"))||{}}catch(e){}
let NOTES={};try{NOTES=JSON.parse(localStorage.getItem("sb_notes"))||JSON.parse(gCk("sb_notes"))||{}}catch(e){}

// ═══════════════════════════════════════════════════════════════
// 薪資模組（雲端同步 + 本機快取）
// 隱私：薪資存在 users/{自己uid} 的 sal 欄位，Firestore Rules 必須鎖 uid==自己才可讀寫
// ═══════════════════════════════════════════════════════════════
const SAL_DEFAULT={
  base:0,meal:0,transport:0,position:0,night:0,
  // 舊版曾把本期浮動項目存成全域欄位；保留欄位只為相容，實際改用 monthly[YYYY-MM]。
  nightCountOverride:0,proposal:0,
  union:0,welfare:0,laborIns:0,healthIns:0,otherDed:0,
  // 勞退：自願提繳是員工扣款；公司提繳只顯示，不扣實領。基準請填薪資條「月提繳工資/勞退提繳工資」。
  laborPensionWage:0,laborPensionSelfRate:0,laborPensionEmployerRate:6,
  // 華新 HR System 截圖確認：平日加班倍率為 1.33340 / 1.66670；免稅切點約 46.6667h。
  otTier1Rate:1.33340,otTier2Rate:1.66670,otTaxFreeH:46.6666667,
  sickRate:0.5,personalRate:1,
  // 每期浮動欄位：提案獎金、其他加項、夜點總額/次數與加班時數覆寫，避免沿用到下個月。
  monthly:{},
  enabled:false
};
let SAL={};
try{const s=localStorage.getItem("sb_sal");SAL=Object.assign({},SAL_DEFAULT,s?JSON.parse(s):{})}catch(e){SAL=Object.assign({},SAL_DEFAULT)}
function normalizeSal(){
  // 使用者常把「後 2h 合計 2.66」填成「每小時 2.66」。本 App 欄位是每小時倍率；薪資條實際/HR System 顯示為 1.66670。
  if(SAL.otTier1Rate>1.30&&SAL.otTier1Rate<1.36)SAL.otTier1Rate=1.33340;
  if(SAL.otTier2Rate>2.30&&SAL.otTier2Rate<2.90)SAL.otTier2Rate=1.66670;
  if(SAL.otTier2Rate>1.60&&SAL.otTier2Rate<1.75)SAL.otTier2Rate=1.66670;
  if(!SAL.otTaxFreeH||Math.abs(SAL.otTaxFreeH-46)<0.01)SAL.otTaxFreeH=46.6666667;
  if(SAL.laborPensionEmployerRate===undefined)SAL.laborPensionEmployerRate=6;
  if(SAL.laborPensionSelfRate===undefined)SAL.laborPensionSelfRate=0;
  if(SAL.laborPensionWage===undefined)SAL.laborPensionWage=0;
  if(SAL.nightCountOverride===undefined)SAL.nightCountOverride=0;
  if(SAL.personalRate===undefined)SAL.personalRate=1;
  SAL.monthly=(SAL.monthly&&typeof SAL.monthly==='object'&&!Array.isArray(SAL.monthly))?Object.assign({},SAL.monthly):{};
}
normalizeSal();
function salPeriodKey(y,m){return`${y}-${String(m).padStart(2,"0")}`}
function getSalPeriod(y,m){
  const key=salPeriodKey(y,m),src=(SAL.monthly&&SAL.monthly[key])||{};
  const has=k=>Object.prototype.hasOwnProperty.call(src,k);
  return{
    proposal:has("proposal")?(+src.proposal||0):(+SAL.proposal||0),
    otherIncome:+src.otherIncome||0,
    nightCountOverride:has("nightCountOverride")?(+src.nightCountOverride||0):(+SAL.nightCountOverride||0),
    nightTotalOverride:+src.nightTotalOverride||0,
    otHoursOverride:+src.otHoursOverride||0
  };
}
function setSalPeriod(y,m,data){
  if(!SAL.monthly||typeof SAL.monthly!=="object")SAL.monthly={};
  SAL.monthly[salPeriodKey(y,m)]=Object.assign({},data);
  // 完成舊版資料遷移後清空全域浮動值，避免下一期誤沿用。
  SAL.proposal=0;SAL.nightCountOverride=0;
}
function _leaveId(lt){return String((lt&&lt.id)||"").toLowerCase()}
function _leaveName(lt){return String((lt&&lt.name)||"")}
function leaveWageDeductRate(lt){
  const id=_leaveId(lt),nm=_leaveName(lt);
  if(id==="sick"||nm.indexOf("病假")>=0)return Math.max(0,+SAL.sickRate||0);
  if(id==="personal"||nm.indexOf("事假")>=0){const r=Number(SAL.personalRate);return Number.isFinite(r)?Math.max(0,r):1;}
  return 0;
}
function hasPreciseLeaveTime(l){return !!l&&Number.isFinite(+l.startOffset)&&Number.isFinite(+l.endOffset)&&(+l.endOffset)>(+l.startOffset)}
// 班別時間基準：12h 早班 08-20、晚班 20-翌日08；正常工時固定前 8h，後 4h 為加班。
// 8h 輪班沒有班內加班：早 08-16、中 16-24、晚 00-08。
function getShiftWorkRule(y,m,d){
  const shift=gs(y,m,d),r=rot(),shiftHours=r?Math.max(0,+r.h||0):0;
  if(!shift||shift==="休"||!(shiftHours>0))return{isWork:false,shift,shiftHours:0,startMinute:0,regularMinutes:0,overtimeMinutes:0};
  const starts12={"早":480,"中":960,"晚":1200},starts8={"早":480,"中":960,"晚":0};
  const startMinute=(shiftHours>8?starts12:starts8)[shift];
  const regularMinutes=Math.min(8,shiftHours)*60,overtimeMinutes=Math.max(0,shiftHours-8)*60;
  return{isWork:true,shift,shiftHours,startMinute:Number.isFinite(startMinute)?startMinute:0,regularMinutes,overtimeMinutes};
}
function formatShiftOffset(rule,offset){
  const total=(rule.startMinute||0)+Math.max(0,+offset||0),day=Math.floor(total/1440),mm=((total%1440)+1440)%1440;
  const hh=String(Math.floor(mm/60)).padStart(2,"0"),mi=String(mm%60).padStart(2,"0");
  const prefix=day>0?(lang==="zh"?"翌日 ":"Besok "):"";
  return prefix+hh+":"+mi;
}
function formatLeaveRange(l,dateKey){
  if(!hasPreciseLeaveTime(l))return lang==="zh"?"舊資料：未記錄時段":"Data lama: tanpa waktu";
  let rule={startMinute:Number.isFinite(+l.shiftStartMinute)?+l.shiftStartMinute:0};
  if(!Number.isFinite(+l.shiftStartMinute)&&dateKey){const a=dateKey.split("-").map(Number);rule=getShiftWorkRule(a[0],a[1],a[2])}
  return formatShiftOffset(rule,+l.startOffset)+"–"+formatShiftOffset(rule,+l.endOffset);
}
// 同一天的正常工時請假採分鐘聯集，避免多筆/重疊資料重複扣薪。
function summarizeRegularLeaveForDay(leaves,shiftHours,uid){
  const regularMinutes=Math.min(8,Math.max(0,+shiftHours||0))*60;
  const occupied=new Uint8Array(regularMinutes),entries=[];
  const list=(Array.isArray(leaves)?leaves:[]).filter(l=>!uid||l.uid===uid).slice();
  list.sort((a,b)=>{const ta=a.ts&&a.ts.seconds||0,tb=b.ts&&b.ts.seconds||0;return ta-tb});
  for(const l of list){
    let claimed=0;
    if(hasPreciseLeaveTime(l)){
      const st=Math.max(0,Math.min(regularMinutes,Math.round(+l.startOffset))),en=Math.max(st,Math.min(regularMinutes,Math.round(+l.endOffset)));
      for(let i=st;i<en;i++)if(!occupied[i]){occupied[i]=1;claimed++}
    }else{
      let need=Math.min(regularMinutes,Math.round(Math.max(0,+l.hours||0)*60));
      for(let i=0;i<regularMinutes&&need>0;i++)if(!occupied[i]){occupied[i]=1;claimed++;need--}
    }
    if(claimed>0)entries.push({leave:l,hours:claimed/60});
  }
  return{totalHours:occupied.reduce((a,b)=>a+b,0)/60,entries};
}
// 僅供舊資料相容：沒有時段、也沒有每日加班設定時，沿用舊版「請假會推定少做加班」邏輯。
function leaveOtDeductForDay(leaves,dailyOT,shiftHours,uid){
  if(!(dailyOT>0)||!Array.isArray(leaves))return 0;
  let total=0;
  for(const l of leaves){
    if(uid&&l.uid!==uid)continue;
    if(hasPreciseLeaveTime(l))continue;
    const lt=getLT(l.leaveType),cap=lt&&lt.otDeduct!=null?Math.max(0,+lt.otDeduct||0):0;
    if(!(cap>0))continue;
    const hrs=Math.min(Math.max(0,+l.hours||0),Math.max(0,shiftHours||0));
    total+=Math.min(hrs,cap,dailyOT);
  }
  return Math.min(dailyOT,total);
}
function getActualOTForDay(dateKey,dailyOT,shiftHours,uid){
  dailyOT=Math.max(0,+dailyOT||0);
  if(!(dailyOT>0))return 0;
  if(Object.prototype.hasOwnProperty.call(OTD,dateKey))return Math.max(0,Math.min(dailyOT,+OTD[dateKey]||0));
  const legacyDed=leaveOtDeductForDay(getPayrollLeaves(dateKey),dailyOT,shiftHours,uid);
  return Math.max(0,dailyOT-legacyDed);
}
function getPayrollLeaves(dateKey){
  const uid=fbUser&&fbUser.uid;
  const out=uid?(getLeaves(dateKey)||[]).filter(l=>l.uid===uid).map(l=>Object.assign({},l)):[];
  const legacyH=Math.max(0,+ALD[dateKey]||0);
  const hasAnnual=out.some(l=>{const lt=getLT(l.leaveType);return _leaveId(lt)==="annual"||_leaveName(lt).indexOf("特休")>=0});
  if(legacyH>0&&!hasAnnual)out.push({uid:uid||"",leaveType:"annual",hours:legacyH,_legacy:true});
  return out;
}

// ═══ 班別覆寫（調班）═══
// 排班是公式算出來的，調班＝針對特定某天「覆寫」成別的班別，不影響其他天
// 格式：{ "2026-06-15":"晚", "2026-06-20":"休" }，值為 早/中/晚/休
let SHIFT_OV={};
try{SHIFT_OV=JSON.parse(localStorage.getItem("sb_shiftov"))||JSON.parse(gCk("sb_shiftov"))||{}}catch(e){SHIFT_OV={}}
function sShiftOv(){const d=JSON.stringify(SHIFT_OV);try{localStorage.setItem("sb_shiftov",d)}catch(e){}try{sCk("sb_shiftov",d,3650)}catch(e){}_scheduleCloudSave()}
// 設定/清除某天的調班
function setShiftOv(y,m,d,val){
  const k=ek(y,m,d);
  if(val===null||val===undefined||val===""){delete SHIFT_OV[k]}
  else{SHIFT_OV[k]=val}
  sShiftOv();
}
// 本機立即存（離線快取）+ 雲端同步（換機/清資料可復原）
function sSAL(){
  try{localStorage.setItem("sb_sal",JSON.stringify(SAL))}catch(e){}
  // 雲端：只寫到自己的 users 文件 sal 欄位
  if(fbUser){
    fsEnqueue(()=>fbDb.collection("users").doc(fbUser.uid).set({sal:JSON.stringify(SAL)},{merge:true}),"salSave").catch(e=>{console.log("salSave err",e)});
  }
}
// 登入後從雲端拉回薪資（雲端有就用雲端，並更新本機快取）
function cloudLoadSal(d){
  if(!d||!d.sal)return;
  try{
    const cloud=typeof d.sal==='string'?JSON.parse(d.sal):d.sal;
    if(cloud&&typeof cloud==='object'){
      SAL=Object.assign({},SAL_DEFAULT,cloud);
      normalizeSal();
      try{localStorage.setItem("sb_sal",JSON.stringify(SAL))}catch(e){}
    }
  }catch(e){console.log("cloudLoadSal err",e)}
}
function sNotes(){const d=JSON.stringify(NOTES);try{localStorage.setItem("sb_notes",d)}catch(e){}try{sCk("sb_notes",d,3650)}catch(e){}_scheduleCloudSave()}
function alYear(y,m,d){return(m>12||(m===12&&d>=26))?y:y-1}
function curALY(){return alYear(TY,TM,TD)}
function alYRange(ay){return`${ay}/12/26 ~ ${ay+1}/12/25`}
function getAL(){
  const y=curALY();
  if(AL[y]&&AL[y].total)return AL[y];
  // Fallback：若當前年度無資料，但有其他年度資料（可能是舊版本 key 錯存），遷移過來
  const otherKeys=Object.keys(AL).filter(k=>AL[k]&&AL[k].total>0);
  if(otherKeys.length===1){
    // 只有一筆紀錄 → 大機率是要的，遷移
    const src=otherKeys[0];
    AL[y]={total:AL[src].total,used:AL[src].used||0};
    if(src!==String(y))delete AL[src];
    try{localStorage.setItem("sb_al2",JSON.stringify(AL))}catch(e){}
    _scheduleCloudSave();
    return AL[y];
  }
  return AL[y]||{total:0,used:0};
}
function setAL(total,used){const y=curALY();AL[y]={total,used};sAL()}
function sAL(){const a=JSON.stringify(AL),d=JSON.stringify(ALD);try{localStorage.setItem("sb_al2",a);localStorage.setItem("sb_ald",d)}catch(e){}try{sCk("sb_al2",a,3650);sCk("sb_ald",d,3650)}catch(e){}_scheduleCloudSave()}
function alUsed(){const ay=curALY();const start=`${ay}-12-26`,end=`${ay+1}-12-25`;let s=0;for(let k in ALD){if(k>=start&&k<=end)s+=ALD[k]}return s}
function alRem(){const a=getAL();return Math.max(0,(a.total||0)-alUsed())}
let DP=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();DP=e;render()});
function sCk(k,v,d){const e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=k+"="+encodeURIComponent(v)+";expires="+e.toUTCString()+";path=/;SameSite=Lax"}
function gCk(k){const m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}
try{const c=JSON.parse(localStorage.getItem("sb_c"))||JSON.parse(gCk("sb_c"));if(c&&c.rt&&c.pos!==null&&c.pos!==undefined){S.rt=c.rt;S.pos=c.pos;if(c.unit)S.unit=c.unit;S.step="cal"}}catch(e){}
function sv(){const d=JSON.stringify({rt:S.rt,pos:S.pos,ep:true,unit:S.unit||""});try{localStorage.setItem("sb_c",d)}catch(e){}sCk("sb_c",d,3650);_scheduleCloudSave()}
function rot(){return S.rt?R[S.rt]:null}
function cyc(){return rot()?rot().c:[]}
function dim(y,m){return new Date(y,m,0).getDate()}
function fdw(y,m){return new Date(y,m-1,1).getDay()}
function gs(y,m,d){
  // 調班覆寫優先：使用者手動改過的某天，直接回傳覆寫值
  const ov=SHIFT_OV[ek(y,m,d)];
  if(ov)return ov;
  const c=cyc();if(!c.length||S.pos===null)return null;let p=(S.pos+dayOff(y,m,d))%c.length;if(p<0)p+=c.length;return c[p];
}
// 取得某天「公式原本」的班別（不看覆寫），用於調班 UI 顯示原班
function gsOrig(y,m,d){const c=cyc();if(!c.length||S.pos===null)return null;let p=(S.pos+dayOff(y,m,d))%c.length;if(p<0)p+=c.length;return c[p]}
function ek(y,m,d){return`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function hk(m,d){return`${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function gh(y,m,d){const h=getHOL(y,m,d);if(!h)return null;return h[lang]||null}
function en(id){return t(id)}
function calcOT(y,m,wd,sh){
  const dm=dim(y,m);let wdays=0,hwd=0;
  for(let d=1;d<=dm;d++){
    const dw=new Date(y,m-1,d).getDay();
    if(dw>=1&&dw<=5){wdays++;if(isTWOff(y,m,d))hwd++}
  }
  const rH=(wdays-hwd)*8,tH=wd*sh,dailyOT=Math.max(0,sh-8),uid=fbUser&&fbUser.uid;
  let actualOT=0;
  if(dailyOT>0){
    for(let d=1;d<=dm;d++){
      const shift=gs(y,m,d);if(!shift||shift==="休")continue;
      actualOT+=getActualOTForDay(ek(y,m,d),dailyOT,sh,uid);
    }
  }
  const oH=sh===12?actualOT:Math.max(0,tH-rH);
  return{tH,oH:Math.round(oH*10)/10,rH};
}
function calcPayPeriod(y,m){
  const pm=m===1?12:m-1,py=m===1?y-1:y;
  const sd=new Date(py,pm-1,26),ed=new Date(y,m-1,25);
  const r=rot();
  if(!r)return{sd,ed,wd:0,tH:0,oH:0,rH:0,sh:12,leaveH:0,unworkedOT:0,otDeductTotal:0,typhoonH:0,typhoonOtDed:0,rawOH:0};
  const sh=r.h,dailyOT=Math.max(0,sh-8),uid=fbUser&&fbUser.uid;
  let wd=0,leaveH=0,actualOT=0,typhoonH=0;
  for(let dt=new Date(sd);dt<=ed;dt.setDate(dt.getDate()+1)){
    const cy=dt.getFullYear(),cm=dt.getMonth()+1,cd=dt.getDate(),key=ek(cy,cm,cd);
    const shift=gs(cy,cm,cd),isWork=!!(shift&&shift!=="休");
    if(isWork){
      wd++;
      const sum=summarizeRegularLeaveForDay(getPayrollLeaves(key),sh,uid);
      leaveH+=sum.totalHours;
      actualOT+=getActualOTForDay(key,dailyOT,sh,uid);
    }
    const tyHours=Math.max(0,+TYD[key]||0);
    if(tyHours&&isWork)typhoonH+=Math.min(tyHours,sh);
  }
  const tH=wd*sh;
  let wdays=0,hwd=0;
  for(let dt=new Date(sd);dt<=ed;dt.setDate(dt.getDate()+1)){
    const dw=dt.getDay(),cm=dt.getMonth()+1,cd=dt.getDate();
    if(dw>=1&&dw<=5)wdays++;
    if(dw>=1&&dw<=5&&isTWOff(dt.getFullYear(),cm,cd))hwd++;
  }
  const rH=(wdays-hwd)*8;
  const rawOH=sh===12?wd*dailyOT:Math.max(0,wd*sh-rH);
  const oH=sh===12?Math.max(0,Math.round(actualOT*10)/10):rawOH;
  const unworkedOT=Math.max(0,Math.round((rawOH-oH)*10)/10);
  return{sd,ed,wd,tH,oH,rH,sh,leaveH:Math.round(leaveH*100)/100,unworkedOT,otDeductTotal:unworkedOT,typhoonH,typhoonOtDed:0,rawOH};
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
      <div class="pay-stat"><div class="pay-stat-val ot-val">${pp.oH}h</div><div class="pay-stat-lbl">${isZh?"加班":"Lembur"}${pp.unworkedOT?`<br><span style="color:var(--red);font-size:8px">-${pp.unworkedOT}h ${isZh?"未出勤":"tidak dikerjakan"}</span>`:""}${pp.typhoonOtDed?`<br><span style="color:#0288d1;font-size:8px">🌀 -${pp.typhoonOtDed}h ${isZh?"颱風":"topan"}</span>`:""}</div></div>
    </div>
    <div class="pay-dates">
      <div class="pay-date-item"><span class="pay-date-icon">💰</span><span>${pay5}</span></div>
      <div class="pay-date-item"><span class="pay-date-icon">🏆</span><span>${pay20}</span></div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 薪資預估計算（用 SAL 設定 + calcPayPeriod 資料）
// 公式：時薪=(職能俸+伙食+交通+崗位)/240
//       12h 班每天加班 4h：前 2h ×1.33340、後 2h ×1.66670
//       正常工時請假與加班出勤分開；病假依正常工時請假時數扣半薪
//       免稅/應稅加班費依薪資條分項進位後相加
//       夜點費 = 晚班次數 × 每次夜點費（可用薪資條夜點總額反推覆寫）
//       提案獎金為當月浮動應領項目
// ═══════════════════════════════════════════════════════════════
function calcSalaryEst(y,m){
  if(!SAL.enabled||!SAL.base)return null;
  const pp=calcPayPeriod(y,m);
  if(!pp||!rot())return null;
  const period=getSalPeriod(y,m);
  const baseSum=SAL.base+SAL.meal+SAL.transport+SAL.position;
  const hourly=baseSum/240;
  const sh=rot().h,dailyOT=Math.max(0,sh-8),dailyFront=Math.min(2,dailyOT),uid=fbUser&&fbUser.uid;
  let nightCount=0,sickH=0,personalH=0,sickDedRaw=0,personalDedRaw=0,autoFront=0,autoBack=0;
  for(let dt=new Date(pp.sd);dt<=pp.ed;dt.setDate(dt.getDate()+1)){
    const cy=dt.getFullYear(),cm=dt.getMonth()+1,cd=dt.getDate(),key=ek(cy,cm,cd);
    const shift=gs(cy,cm,cd),isWork=!!(shift&&shift!=="休");
    if(isWork){
      const sum=summarizeRegularLeaveForDay(getPayrollLeaves(key),sh,uid);
      for(const e of sum.entries){
        const l=e.leave,hrs=e.hours,lt=getLT(l.leaveType),rate=leaveWageDeductRate(lt),id=_leaveId(lt),nm=_leaveName(lt),amt=hrs*hourly*rate;
        if(id==="sick"||nm.indexOf("病假")>=0){sickH+=hrs;sickDedRaw+=amt}
        else if(id==="personal"||nm.indexOf("事假")>=0){personalH+=hrs;personalDedRaw+=amt}
      }
      const dayOT=getActualOTForDay(key,dailyOT,sh,uid);
      autoFront+=Math.min(dayOT,dailyFront);
      autoBack+=Math.max(0,dayOT-dailyFront);
    }
    if(shift==="晚")nightCount++;
  }
  const autoOtH=autoFront+autoBack;
  let totalFront=autoFront,totalBack=autoBack;
  if(period.otHoursOverride>0){
    // 只有總時數、沒有逐日資料時保留舊版相容拆法；正常情況應由每日加班出勤精確計算。
    totalFront=period.otHoursOverride/2;
    totalBack=period.otHoursOverride-totalFront;
  }
  const otH=totalFront+totalBack;
  const rawOtPay=totalFront*hourly*SAL.otTier1Rate+totalBack*hourly*SAL.otTier2Rate;
  let otTaxFree=0,otTaxable=0;
  const taxFreeH=SAL.otTaxFreeH||46.6666667;
  if(otH>0){
    if(otH>taxFreeH){const ratio=taxFreeH/otH;otTaxFree=Math.ceil(rawOtPay*ratio);otTaxable=Math.ceil(rawOtPay*(1-ratio))}
    else otTaxFree=Math.ceil(rawOtPay);
  }
  const otPay=otTaxFree+otTaxable;
  const nightAutoCount=nightCount;
  if(period.nightCountOverride>0)nightCount=period.nightCountOverride;
  const nightAutoPay=nightCount*SAL.night;
  const nightPay=period.nightTotalOverride>0?period.nightTotalOverride:nightAutoPay;
  const proposal=period.proposal||0,otherIncome=period.otherIncome||0;
  const sickDed=Math.round(sickDedRaw),personalDed=Math.round(personalDedRaw),leaveDed=Math.round(sickDedRaw+personalDedRaw);
  const pensionWage=SAL.laborPensionWage||0,pensionSelfRate=SAL.laborPensionSelfRate||0,pensionEmployerRate=(SAL.laborPensionEmployerRate===undefined?6:SAL.laborPensionEmployerRate)||0;
  const laborPensionSelf=Math.round(pensionWage*pensionSelfRate/100),laborPensionEmployer=Math.round(pensionWage*pensionEmployerRate/100);
  const income=Math.round(baseSum+proposal+otherIncome+otPay+nightPay);
  const fixedDed=SAL.union+SAL.welfare+SAL.laborIns+SAL.healthIns+SAL.otherDed;
  const deduction=fixedDed+leaveDed+laborPensionSelf,net=income-deduction;
  return{hourly,baseSum,proposal,otherIncome,nightCount,sickH,personalH,otH,autoOtH,otPay,rawOtPay,otTaxFree,otTaxable,nightPay,nightAutoPay,sickDed,personalDed,leaveDed,pensionWage,pensionSelfRate,pensionEmployerRate,laborPensionSelf,laborPensionEmployer,income,deduction,fixedDed,net,totalFront,totalBack,nightAutoCount,nightTotalOverridden:period.nightTotalOverride>0,otHoursOverridden:period.otHoursOverride>0,periodKey:salPeriodKey(y,m)};
}
function salaryEstHtml(y,m){
  if(!rot())return"";
  const isZh=lang==="zh";
  // 未設定 → 顯示 CTA
  if(!SAL.enabled||!SAL.base){
    return`<div class="sal-card fi" data-a="salOpen" style="cursor:pointer;background:linear-gradient(135deg,#fff8e1,#fff3e0);border:1.5px solid #ffb300;border-radius:12px;padding:14px;margin:0 0 6px;text-align:center">
      <div style="font-size:13px;font-weight:700;color:#e65100;margin-bottom:4px">💰 ${isZh?"設定薪資 預估每月實領":"Atur gaji untuk estimasi"}</div>
      <div style="font-size:11px;color:#995500">${isZh?"輸入薪資條欄位，自動估算實領金額":"Masukkan slip gaji, hitung otomatis"}</div>
    </div>`;
  }
  const est=calcSalaryEst(y,m);
  if(!est)return"";
  const fmt=n=>"$"+Math.round(n).toLocaleString();
  return`<div class="sal-card fi" style="background:#fff;border:1.5px solid #00897b;border-radius:12px;padding:14px;margin:0 0 6px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;color:#00695c">💰 ${isZh?"薪資預估":"Estimasi Gaji"}</div>
      <button data-a="salOpen" class="card-settings-button" aria-label="${isZh?"薪資設定":"Pengaturan gaji"}">${uiIcon("settings",18)}</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px dashed #e0e0e0">
      <span style="font-size:12px;color:var(--tx2)">${isZh?"應領":"Pendapatan"}</span>
      <span style="font-size:14px;font-weight:600;color:#1b5e20">${fmt(est.income)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px dashed #e0e0e0">
      <span style="font-size:12px;color:var(--tx2)">${isZh?"應扣":"Potongan"}</span>
      <span style="font-size:14px;font-weight:600;color:#b71c1c">${fmt(est.deduction)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:10px 0 4px">
      <span style="font-size:13px;font-weight:700;color:var(--tx)">${isZh?"預估實領":"Estimasi Bersih"}</span>
      <span style="font-size:22px;font-weight:900;color:#00695c;letter-spacing:1px">${fmt(est.net)}</span>
    </div>
    <div style="font-size:10px;color:var(--tx3);text-align:right;margin-top:4px">${isZh?`時薪 $${est.hourly.toFixed(2)} · 加班 ${est.otH}h${est.otHoursOverridden?`(本期覆寫；自動${est.autoOtH}h)`:``} · 晚班 ${est.nightCount} 次${est.nightAutoCount!==est.nightCount?`(自動${est.nightAutoCount})`:``}`:`Per jam $${est.hourly.toFixed(2)}`}</div>
    <details style="margin-top:10px;border-top:1px solid #eee;padding-top:8px">
      <summary style="font-size:11px;color:var(--tx3);cursor:pointer;outline:none">${isZh?"明細拆解 ›":"Detail ›"}</summary>
      <div style="font-size:11px;color:var(--tx2);margin-top:8px;line-height:1.8">
        <div style="color:#00695c;font-weight:700;margin-bottom:2px">${isZh?"應領":"Pendapatan"}</div>
        <div style="display:flex;justify-content:space-between"><span>　${isZh?"職能俸":"Pokok"}</span><span>${fmt(SAL.base)}</span></div>
        ${SAL.meal?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"伙食津貼":"Makan"}</span><span>${fmt(SAL.meal)}</span></div>`:""}
        ${SAL.transport?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"交通津貼":"Transport"}</span><span>${fmt(SAL.transport)}</span></div>`:""}
        ${SAL.position?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"崗位津貼":"Posisi"}</span><span>${fmt(SAL.position)}</span></div>`:""}
        ${est.proposal?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"提案獎金":"Bonus proposal"}</span><span>${fmt(est.proposal)}</span></div>`:""}
        ${est.otherIncome?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"其他加項":"Pendapatan lain"}</span><span>${fmt(est.otherIncome)}</span></div>`:""}
        ${est.otTaxFree>0?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"免稅加班費":"Lembur Bebas Pajak"}</span><span>${fmt(est.otTaxFree)}</span></div>`:""}
        ${est.otTaxable>0?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"應稅加班費":"Lembur Pajak"}</span><span>${fmt(est.otTaxable)}</span></div>`:""}
        ${est.nightPay>0?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"夜點費":"Tunjangan Malam"}${est.nightTotalOverridden?` (${isZh?"本期總額覆寫":"total override"})`:` (${est.nightCount}${isZh?"次":"x"})`}</span><span>${fmt(est.nightPay)}</span></div>`:""}
        <div style="color:#b71c1c;font-weight:700;margin-top:6px;margin-bottom:2px">${isZh?"應扣":"Potongan"}</div>
        ${SAL.union?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"工會會費":"Iuran Serikat"}</span><span>-${fmt(SAL.union)}</span></div>`:""}
        ${SAL.welfare?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"福利金":"Kesejahteraan"}</span><span>-${fmt(SAL.welfare)}</span></div>`:""}
        ${SAL.laborIns?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"勞保自付":"BPJS Tenaga Kerja"}</span><span>-${fmt(SAL.laborIns)}</span></div>`:""}
        ${SAL.healthIns?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"健保自付":"BPJS Kesehatan"}</span><span>-${fmt(SAL.healthIns)}</span></div>`:""}
        ${est.laborPensionSelf?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"勞退自提":"Pensiun sukarela"} (${est.pensionSelfRate}%)</span><span>-${fmt(est.laborPensionSelf)}</span></div>`:""}
        ${SAL.otherDed?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"其他固定扣款":"Potongan Lain"}</span><span>-${fmt(SAL.otherDed)}</span></div>`:""}
        ${est.sickDed>0?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"病假扣薪":"Potongan Sakit"} (${est.sickH}h)</span><span>-${fmt(est.sickDed)}</span></div>`:""}
        ${est.personalDed>0?`<div style="display:flex;justify-content:space-between"><span>　${isZh?"事假扣薪":"Potongan Izin"} (${est.personalH}h)</span><span>-${fmt(est.personalDed)}</span></div>`:""}
        ${est.laborPensionEmployer?`<div style="display:flex;justify-content:space-between;color:#2e7d32;margin-top:6px;border-top:1px dashed rgba(46,125,50,.25);padding-top:5px"><span>　${isZh?"公司勞退提撥(不扣實領)":"Pensiun perusahaan"} (${est.pensionEmployerRate}%)</span><span>+${fmt(est.laborPensionEmployer)}</span></div>`:""}
      </div>
    </details>
    <div style="font-size:9px;color:var(--tx3);text-align:center;margin-top:8px;padding-top:6px;border-top:1px dashed #eee">⚠️ ${isZh?"僅供估算參考，實際以公司薪資條為準":"Estimasi saja, ikuti slip resmi"}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 薪資設定 Modal
// ═══════════════════════════════════════════════════════════════
function rSalary(){
  const isZh=lang==="zh",period=getSalPeriod(S.yr,S.mo),periodLabel=`${S.yr}/${String(S.mo).padStart(2,"0")}`;
  // 欄位 helper:
  // - placeholder 用 "例:XXXX" 前綴,跟「真實填入值」視覺區隔,避免上次「以為填了其實是空的」bug 重演
  // - background 跟 color 改用 CSS 變數,深色模式時自動跟著切換
  const num=(id,label,val,hint,ph)=>`<div style="margin-bottom:10px"><label style="font-size:12px;color:var(--tx2);display:block;margin-bottom:4px">${label}</label><input type="number" id="${id}" value="${val||""}"${ph?` placeholder="${isZh?"例:":"Cth:"}${ph}"`:""} step="0.01" inputmode="decimal" class="sal-in" style="width:100%;padding:10px;border:1px solid var(--tx3);border-radius:8px;font-size:14px;font-weight:600;background:var(--card);color:var(--tx)">${hint?`<div style="font-size:10px;color:var(--tx3);margin-top:3px;line-height:1.4">${hint}</div>`:""}</div>`;
  return`<style>.sal-in::placeholder{color:var(--tx3);opacity:.55;font-weight:400}.sal-in:focus{border-color:#00897b;outline:none;box-shadow:0 0 0 2px rgba(0,137,123,.15)}</style><div class="modal-bg" data-a="salClose"><div class="modal-sheet help-sheet" onclick="event.stopPropagation()" style="max-width:480px"><div class="modal-handle"></div>
    <div class="modal-title">💰 ${isZh?`薪資設定｜${periodLabel}`:`Atur Gaji | ${periodLabel}`}</div>
    <div style="background:${fbUser?'#e8f5e9':'#fff3e0'};border:1px solid ${fbUser?'#81c784':'#ffb74d'};border-radius:8px;padding:10px;margin:10px 0;font-size:11px;color:${fbUser?'#2e7d32':'#e65100'};line-height:1.6">
      ${fbUser?(isZh?"🔒 薪資僅同步至你個人雲端帳號（只有你看得到），換手機或清除資料後登入即可復原。對照薪資條填入即可,未填的欄位視為 0。":"🔒 Gaji disinkron ke akun pribadi Anda (hanya Anda yang lihat). Login untuk pulih setelah ganti HP."):(isZh?"⚠️ 你尚未登入，目前僅存本機，清除瀏覽器資料會遺失。建議先 Google 登入，薪資會同步至你個人雲端（只有你看得到）。對照薪資條填入即可,未填的欄位視為 0。":"⚠️ Belum login — hanya tersimpan di HP. Login Google agar tersimpan di cloud pribadi.")}
    </div>

    <div style="background:rgba(0,150,136,.05);border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:#00695c;margin-bottom:10px">📈 ${isZh?"應領項目":"Pendapatan"}</div>
      ${num("sal_base",isZh?"職能俸(月薪本俸)":"Gaji Pokok",SAL.base,isZh?"必填。對照薪資條上「職能俸」或「本薪」欄位":"Wajib")}
      ${num("sal_meal",isZh?"伙食津貼":"Tunjangan Makan",SAL.meal,null,"3000")}
      ${num("sal_transport",isZh?"交通津貼":"Transport",SAL.transport,null,"1000")}
      ${num("sal_position",isZh?"崗位津貼":"Tunjangan Posisi",SAL.position,null,"500")}
      ${num("sal_night",isZh?"夜點費單價（固定；留空可只填本期總額）":"Tarif malam / shift",SAL.night,isZh?"自動算法＝單價 × 晚班次數。公司若按請假或其他規則調整，請直接填本期夜點總額。":"","489")}
      <div style="font-size:11px;font-weight:800;color:#00695c;margin:12px 0 8px;padding-top:8px;border-top:1px dashed rgba(0,105,92,.25)">🗓️ ${isZh?`${periodLabel} 本期浮動項目`:`Item periode ${periodLabel}`}</div>
      ${num("sal_nightCountOverride",isZh?"本期夜點次數覆寫（0=自動）":"Override jumlah malam (0=auto)",period.nightCountOverride,isZh?"只在本期生效，不會帶到下個月。":"","12")}
      ${num("sal_nightTotalOverride",isZh?"本期夜點費總額覆寫（0=自動）":"Override total tunjangan malam",period.nightTotalOverride,isZh?"本期薪資條為 5,286 時直接填 5286；優先於單價×次數。":"","5286")}
      ${num("sal_proposal",isZh?"本期提案獎金":"Bonus proposal periode ini",period.proposal,isZh?"只在本期生效。":"","500")}
      ${num("sal_otherIncome",isZh?"本期其他加項／其他加項二":"Pendapatan lain periode ini",period.otherIncome,isZh?"本期薪資條「其他加項二」1,075，請填 1075。":"","1075")}
      ${num("sal_otHoursOverride",isZh?"本期加班時數覆寫（0=自動）":"Override jam lembur (0=auto)",period.otHoursOverride,isZh?"正常由每日「加班出勤」紀錄自動計算；只有公司薪資條時數不同才填。2026/06 本期為 68h。":"","68")}
    </div>

    <div style="background:rgba(198,40,40,.04);border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:#b71c1c;margin-bottom:10px">📉 ${isZh?"應扣項目(每月固定)":"Potongan Tetap"}</div>
      ${num("sal_union",isZh?"工會會費":"Iuran Serikat",SAL.union,null,"85")}
      ${num("sal_welfare",isZh?"福利金":"Kesejahteraan",SAL.welfare,null,"173")}
      ${num("sal_laborIns",isZh?"勞保自付":"BPJS TK",SAL.laborIns,null,"1145")}
      ${num("sal_healthIns",isZh?"健保自付":"BPJS Kes",SAL.healthIns,null,"1129")}
      ${num("sal_otherDed",isZh?"其他固定扣款":"Potongan Lain",SAL.otherDed,isZh?"只填薪資條上未列出的固定扣款；勞退請改用下方百分比欄位，不要填在這裡。":"","0")}
    </div>

    <div style="background:rgba(46,125,50,.05);border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:#2e7d32;margin-bottom:10px">🌱 ${isZh?"勞退提繳(固定百分比)":"Pensiun tenaga kerja"}</div>
      ${num("sal_laborPensionWage",isZh?"勞退月提繳工資":"Upah pensiun bulanan",SAL.laborPensionWage,isZh?"填薪資條/勞保局級距的月提繳工資。例：公司提撥 4,368 ÷ 6% = 72,800。":"Isi basis kontribusi pensiun","72800")}
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label style="font-size:11px;color:var(--tx2);display:block;margin-bottom:4px">${isZh?"自提率%（扣實領）":"Rate sendiri %"}</label><input type="number" id="sal_laborPensionSelfRate" value="${SAL.laborPensionSelfRate||0}" step="0.1" inputmode="decimal" class="sal-in" style="width:100%;padding:8px;border:1px solid var(--tx3);border-radius:6px;font-size:13px;background:var(--card);color:var(--tx)"></div>
        <div style="flex:1"><label style="font-size:11px;color:var(--tx2);display:block;margin-bottom:4px">${isZh?"公司提撥率%（不扣）":"Rate perusahaan %"}</label><input type="number" id="sal_laborPensionEmployerRate" value="${SAL.laborPensionEmployerRate===undefined?6:SAL.laborPensionEmployerRate}" step="0.1" inputmode="decimal" class="sal-in" style="width:100%;padding:8px;border:1px solid var(--tx3);border-radius:6px;font-size:13px;background:var(--card);color:var(--tx)"></div>
      </div>
      <div style="font-size:10px;color:var(--tx3);margin-top:6px;line-height:1.5">${isZh?"公司提撥只顯示在明細，不會扣你的實領。若薪資條顯示個人提撥 0，自提率請填 0。":"Kontribusi perusahaan hanya ditampilkan, tidak mengurangi gaji bersih."}</div>
    </div>

    <div style="background:rgba(63,81,181,.04);border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:#283593;margin-bottom:10px">⚙️ ${isZh?"加班費規則(勞基法預設)":"Aturan Lembur"}</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
        <div><label style="font-size:11px;color:var(--tx2);display:block;margin-bottom:4px">${isZh?"前段每小時倍率":"2h Awal / jam"}</label><input type="number" id="sal_otTier1Rate" value="${Number(SAL.otTier1Rate||1.33340).toFixed(5)}" step="0.00001" inputmode="decimal" class="sal-in" style="width:100%;padding:8px;border:1px solid var(--tx3);border-radius:6px;font-size:13px;background:var(--card);color:var(--tx)"></div>
        <div><label style="font-size:11px;color:var(--tx2);display:block;margin-bottom:4px">${isZh?"後段每小時倍率":"Sisa / jam"}</label><input type="number" id="sal_otTier2Rate" value="${Number(SAL.otTier2Rate||1.66670).toFixed(5)}" step="0.00001" inputmode="decimal" class="sal-in" style="width:100%;padding:8px;border:1px solid var(--tx3);border-radius:6px;font-size:13px;background:var(--card);color:var(--tx)"></div>
        <div><label style="font-size:11px;color:var(--tx2);display:block;margin-bottom:4px">${isZh?"免稅時數":"Bebas Pajak h"}</label><input type="number" id="sal_otTaxFreeH" value="${SAL.otTaxFreeH}" step="0.0001" inputmode="decimal" class="sal-in" style="width:100%;padding:8px;border:1px solid var(--tx3);border-radius:6px;font-size:13px;background:var(--card);color:var(--tx)"></div>
        <div><label style="font-size:11px;color:var(--tx2);display:block;margin-bottom:4px">${isZh?"病假扣薪率":"Sakit x"}</label><input type="number" id="sal_sickRate" value="${SAL.sickRate}" step="0.1" inputmode="decimal" class="sal-in" style="width:100%;padding:8px;border:1px solid var(--tx3);border-radius:6px;font-size:13px;background:var(--card);color:var(--tx)"></div>
        <div><label style="font-size:11px;color:var(--tx2);display:block;margin-bottom:4px">${isZh?"事假扣薪率":"Izin x"}</label><input type="number" id="sal_personalRate" value="${SAL.personalRate}" step="0.1" inputmode="decimal" class="sal-in" style="width:100%;padding:8px;border:1px solid var(--tx3);border-radius:6px;font-size:13px;background:var(--card);color:var(--tx)"></div>
      </div>
      <div style="font-size:10px;color:var(--tx3);margin-top:6px;line-height:1.5">${isZh?"薪資條驗證：時薪＝固定應領 38,690 ÷ 240；68h 加班拆成前/後段各 34h，可對上免稅 11,285、應稅 5,159。病假扣薪率 0.5，事假扣薪率 1。":"Rumus diverifikasi dengan slip gaji periode 2026/06."}</div>
    </div>

    <div style="display:flex;gap:10px;margin-top:14px">
      <button data-a="salReset" style="flex:1;background:var(--card);border:1px solid var(--tx3);color:var(--tx2);padding:12px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">${isZh?"清除全部":"Reset"}</button>
      <button data-a="salSave" style="flex:2;background:#00897b;color:#fff;border:none;padding:12px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">${isZh?"💾 儲存並啟用預估":"💾 Simpan"}</button>
    </div>
    <div style="height:20px"></div>
  </div></div>`;
}

setTimeout(()=>{const sp=document.getElementById("splash");if(sp)sp.remove()},2600);

let _renderRAF=null;
let _dashPainted=false; // 首次 dashboard 繪製後設 true；之後重繪移除 fi 入場淡入，避免開機資料分批到達時整片重播淡入(抖動)
let _lastAppHtml=null;
let _lastOverlayHtml=null;
let _lastOverlayKind="";

function render(){
  if(_renderRAF)cancelAnimationFrame(_renderRAF);
  _renderRAF=requestAnimationFrame(_doRender);
}

// 只在內容真的改變時才替換 DOM。背景天氣／雲端資料常會連續呼叫 render()；
// 舊作法每次都重建 modal，造成 slideUp 動畫重播、捲動位置歸零與輸入框閃爍。
function _overlayView(){
  if(wxDetailShow)return{kind:"wx",html:wxDetailHtml()};
  if(tideDetailShow)return{kind:"tide",html:tideDetailHtml()};
  if(S.modal)return{kind:"day",html:rMod()};
  if(typeof showUserPrefs!=="undefined"&&showUserPrefs)return{kind:"prefs",html:userPrefsModalHtml()};
  if(S.showH)return{kind:"help",html:rHelp()};
  if(S.showStats)return{kind:"stats",html:rStats()};
  if(S.showSal)return{kind:"salary",html:rSalary()};
  if(S.showLeavesOv&&isAdmin())return{kind:"leaves",html:rLeavesOv()};
  if(typeof showAdmin!=="undefined"&&showAdmin)return{kind:"admin",html:adminPanelHtml()};
  return{kind:"",html:""};
}
function _captureReplaceState(root){
  const state={scroll:[],fields:[],active:null};
  if(!root)return state;
  root.querySelectorAll(".modal-sheet,.wx-detail-sheet").forEach((el,i)=>state.scroll.push({i,top:el.scrollTop,left:el.scrollLeft}));
  root.querySelectorAll("input[id],select[id],textarea[id]").forEach(el=>{
    state.fields.push({id:el.id,value:el.value,checked:!!el.checked,type:el.type||""});
  });
  const ac=document.activeElement;
  if(ac&&root.contains(ac)&&ac.id){
    state.active={id:ac.id,start:typeof ac.selectionStart==="number"?ac.selectionStart:null,end:typeof ac.selectionEnd==="number"?ac.selectionEnd:null};
  }
  return state;
}
function _restoreReplaceState(root,state){
  if(!root||!state)return;
  const sc=root.querySelectorAll(".modal-sheet,.wx-detail-sheet");
  state.scroll.forEach(x=>{const el=sc[x.i];if(el){el.scrollTop=x.top;el.scrollLeft=x.left}});
  state.fields.forEach(x=>{
    const el=document.getElementById(x.id);if(!el||!root.contains(el))return;
    if(x.type==="checkbox"||x.type==="radio")el.checked=x.checked;
    else if(el.tagName==="SELECT"){
      if(Array.from(el.options).some(o=>o.value===x.value))el.value=x.value;
    }else el.value=x.value;
  });
  if(state.active){
    const el=document.getElementById(state.active.id);
    if(el&&root.contains(el)){
      try{el.focus({preventScroll:true})}catch(e){try{el.focus()}catch(e2){}}
      if(state.active.start!==null&&typeof el.setSelectionRange==="function")try{el.setSelectionRange(state.active.start,state.active.end)}catch(e){}
    }
  }
}
function _withoutEnterAnimation(html){
  if(!html)return html;
  return html.replace('class="modal-bg"','class="modal-bg modal-refresh"')
             .replace('class="wx-detail"','class="wx-detail modal-refresh"');
}
function _setModalLock(on){
  document.documentElement.classList.toggle("modal-open",!!on);
  document.body.classList.toggle("modal-open",!!on);
}
function _bindActions(root){
  (root||document).querySelectorAll("[data-a]").forEach(el=>{el.onclick=handle});
}
function _doRender(){
  _renderRAF=null;
  const a=document.getElementById("app"),mr=document.getElementById("mr");
  // ═══ WIDGET MODE：URL ?w=1 → 只渲染巨型今日顯示 ═══
  // 不等 Firebase，直接從 localStorage 讀本地班別設定渲染
  if(location.search.indexOf("w=1")>=0){
    try{
      const h=rWidget();
      if(h!==_lastAppHtml){a.innerHTML=h;_lastAppHtml=h}
    }catch(err){a.innerHTML=`<div style="padding:30px;color:#c62828;font-size:13px">Widget error: ${esc(err&&err.message||"unknown")}</div>`}
    if(mr&&mr.innerHTML){mr.innerHTML="";_lastOverlayHtml="";_lastOverlayKind=""}
    _setModalLock(false);
    _bindActions(document);
    return;
  }
  if(!fbAuthReady||_cloudLoading){
    const h=`<div style="display:flex;align-items:center;justify-content:center;min-height:60vh;color:var(--tx3);font-size:13px">⏳ ${lang==="zh"?"載入中...":"Loading..."}</div>`;
    if(h!==_lastAppHtml){a.innerHTML=h;_lastAppHtml=h}
    return;
  }
  try{
    const ov=_overlayView();
    const overlayOpen=!!ov.html;

    // modal 開啟期間凍結底層 dashboard。資料仍會更新到記憶體，關閉 modal 後一次套用，
    // 避免半透明遮罩後方的月曆／薪資卡反覆重畫造成可見閃動。
    if(!overlayOpen||!_lastAppHtml||!a.firstElementChild){
      let h=S.step==="type"?rType():S.step==="wiz"?rWiz():rCal();
      if(_dashPainted)h=h.replace(/ fi"/g,'"');
      if(h!==_lastAppHtml){
        a.innerHTML=h;
        _lastAppHtml=h;
        _dashPainted=true;
        _bindActions(a);
      }
    }

    if(ov.html!==_lastOverlayHtml||ov.kind!==_lastOverlayKind){
      const sameKind=!!ov.kind&&ov.kind===_lastOverlayKind;
      const saved=sameKind?_captureReplaceState(mr):null;
      mr.innerHTML=sameKind?_withoutEnterAnimation(ov.html):ov.html;
      _lastOverlayHtml=ov.html;
      _lastOverlayKind=ov.kind;
      _bindActions(mr);
      if(saved)_restoreReplaceState(mr,saved);
    }
    _setModalLock(overlayOpen||!!document.querySelector(".modal-bg,.wx-detail"));

    if(document.getElementById("leaveTypeSel")&&S.modal)try{updateLeaveTimeOptions(ek(S.modal.y,S.modal.m,S.modal.d))}catch(e){}
    // 請假總覽 modal：渲染列表內容（rLeavesOv 只生成空 container，列表內容需在這裡填入）
    if(S.showLeavesOv&&isAdmin()&&!leavesOvLoading){
      const list=document.getElementById("leavesOvListBody");
      if(list&&LEAVES_OV_DATA.length)_renderLeavesOvList(list);
    }
    applyGustAdminUiCompat();
  }catch(err){
    console.log("render err",err);
    a.innerHTML=`<div style="padding:30px;color:#e74c3c;font-size:13px;line-height:1.6">
      <div style="font-size:16px;font-weight:700;margin-bottom:10px">⚠️ ${lang==="zh"?"畫面渲染出錯":"Render error"}</div>
      <div style="background:#fff3e0;padding:10px;border-radius:6px;margin-bottom:12px;word-break:break-all;font-family:monospace;font-size:11px">${esc(err&&err.message||"unknown")}</div>
      <button onclick="location.reload()" style="background:#00897b;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">${lang==="zh"?"重新載入":"Reload"}</button>
    </div>`;
    _lastAppHtml=null;
  }
}

function rType(){
  const unitOpts=getUnits().map(u=>`<option value="${esc(u)}"${S.unit===u?' selected':''}>${esc(u)}</option>`).join('');
  return`<div class="page"><div class="hero fu"><img src="${IMG.icon}"><h1>${t("app")}</h1><p>${t("desc")}</p></div>
  <div class="al-setup fu d1" style="margin-bottom:10px"><h3>🏭 ${lang==="zh"?"選擇單位":"Pilih Unit"}</h3>
    <select id="unitSel" onchange="if(S.lockedUnit){this.value=S.lockedUnit;alert(lang==='zh'?'單位已被管理員鎖定':'Unit dikunci');return}S.unit=this.value;sv();if(fbUser)loadLeaves()" style="width:100%;padding:10px;border:1.5px solid #ddd;border-radius:8px;font-size:14px;font-weight:600;background:#fff">
      <option value="">${lang==="zh"?"-- 請選擇 --":"-- Pilih --"}</option>${unitOpts}
    </select>
  </div>
  ${Object.keys(R).length?Object.entries(R).map(([k,v],i)=>`<button class="rcard fu d${(i%3)+1}" data-a="pick" data-k="${k}"><div class="rcard-icon">${v.c.filter(x=>x!=="休").length>9?"":v.c.filter(x=>x!=="休").length}${v.c.filter(x=>x!=="休").length>9?k.substring(0,3):":"+v.c.filter(x=>x==="休").length}</div><div class="rcard-info"><div class="rcard-name">${RN[lang]&&RN[lang][k]||k}</div><div class="rcard-sub">${v.h}h · ${v.c.length}${t("cyc")}</div></div><div class="rcard-arrow">›</div></button>`).join(""):`<div style="padding:20px;text-align:center;color:var(--tx3);font-size:13px">${lang==="zh"?"⚠️ 尚未設定輪班規則，請管理員到後台設定":"⚠️ Belum ada aturan shift"}</div>`}
  <div class="al-setup fu d3"><h3>${t("alSetup")}</h3><div class="al-setup-hint" style="margin-bottom:8px;font-size:11px;color:var(--green);font-weight:600">${alYRange(curALY())}</div><div class="al-setup-row"><label>${t("alTotal")}</label><input type="number" id="alTI" value="${getAL().total||''}" placeholder="0" min="0" step="0.5"></div><div class="al-setup-hint">${t("alSkip")}</div></div>
  ${!fbUser&&fbAuthReady?`<div style="text-align:center;margin-top:14px"><button onclick="fbLogin()" style="background:#fff;border:1px solid #ddd;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:700;color:var(--tx);cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 1px 4px rgba(0,0,0,.08)"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:20px;height:20px">${lang==="zh"?"Google 登入":"Login Google"}</button></div>`:fbUser?`<div style="text-align:center;margin-top:10px;font-size:11px;color:var(--green);font-weight:600">✅ ${fbUser.displayName||fbUser.email}</div>`:""}<div style="text-align:center;margin-top:14px"><span class="lang-tog" style="display:inline-flex;height:36px;border-color:#ddd"><button class="lt-btn${lang==='zh'?' lt-on':''}" style="font-size:12px;padding:0 14px;color:${lang==='zh'?'var(--pri-d)':'var(--tx3)'}" data-a="lzh">中文</button><button class="lt-btn${lang==='id'?' lt-on':''}" style="font-size:12px;padding:0 14px;color:${lang==='id'?'var(--pri-d)':'var(--tx3)'}" data-a="lid">ID</button></span></div></div>`;
}

function rWiz(){
  const c=cyc();
  // If rotation doesn't exist (deleted/not loaded), go back to type selection
  if(!R[S.rt]||!c.length){S.step="type";return rType()}
  // Merged step: show ALL shift types (early/mid/night/off) on one page
  if(!S.wT){
    const allSh=[...new Set(c)];
    const shiftBtns=allSh.filter(x=>x!=="休").map(s=>`<button class="opt-btn" data-a="wizShift" data-v="${s}"><img class="oi" src="${SI[s]}">${sf(s)}</button>`).join("");
    const offBtn=`<button class="opt-btn" data-a="wizOff"><img class="oi" src="${IMG.off}">${t("off")}</button>`;
    let loginBtn="";if(!fbAuthReady){loginBtn=`<div style="margin-top:12px;text-align:center;color:var(--tx3);font-size:11px">${lang==="zh"?"⏳ 檢查登入狀態...":"⏳ Checking login..."}</div>`}else if(!fbUser){loginBtn=`<div style="margin-top:12px;text-align:center"><button onclick="fbLogin()" style="background:#fff;border:1px solid #ddd;padding:10px 20px;border-radius:8px;font-size:12px;font-weight:600;color:var(--tx);cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:18px;height:18px">${lang==="zh"?"Google 登入恢復設定":"Login Google untuk restore"}</button></div>`}
    return wS(lang==="zh"?"今天上什麼班？":"Shift hari ini?","1/2",`<div class="opts ${allSh.length>=4?'c2':'c2'}">${shiftBtns}${offBtn}</div>${loginBtn}`);
  }
  if(S.wT==="o"&&!S.wN){const sh=[...new Set(c.filter(x=>x!=="休"))];return wS(lang==="zh"?"休假後接什麼班？":"Shift setelah libur?","1/2",`<div class="opts ${sh.length===3?'c3':'c2'}">${sh.map(s=>`<button class="opt-btn" data-a="wn" data-v="${s}"><img class="oi" src="${SI[s]}">→${sf(s)}</button>`).join("")}</div>`);}
  if(S.wT==="w"&&S.wS&&S.wD===null){let mx=0,cr=0;for(let i=0;i<c.length*2;i++){if(c[i%c.length]===S.wS){cr++;mx=Math.max(mx,cr)}else cr=0}return wS(t("q3w").replace("#s#",sf(S.wS)),"2/2",`<div class="opts c3">${Array.from({length:mx},(_,i)=>`<button class="opt-btn" data-a="wwd" data-v="${i+1}">${t("dn").replace("#n#",i+1)}</button>`).join("")}</div>`);}
  if(S.wT==="o"&&S.wN&&S.wD===null){let mx=0;for(let i=0;i<c.length;i++){if(c[i]!=="休")continue;let j=i;while(j<c.length&&c[j]==="休")j++;if(c[j%c.length]===S.wN)mx=Math.max(mx,j-i)}return wS(t("q3o"),"2/2",`<div class="opts ${mx<=4?'c2':'c3'}">${Array.from({length:mx},(_,i)=>`<button class="opt-btn" data-a="wod" data-v="${i+1}">${t("dn").replace("#n#",i+1)}</button>`).join("")}</div>`);}
  return"";
}
function wS(q,step,ct){return`<div class="page"><div class="wiz-top fu"><button class="wiz-back" data-a="wb">←</button><div class="wiz-info"><div class="wiz-step">STEP ${step}</div><div class="wiz-q">${q}</div></div><div class="wiz-badge">${(RN[lang]&&RN[lang][S.rt])||S.rt||""}</div></div><div class="fu d1">${ct}</div></div>`}


// ═══════════════════════════════════════════════════════════════
// FINAL PRODUCT UI — coherent design system + task-based navigation
// ═══════════════════════════════════════════════════════════════
function uiIcon(name,size=22){
  const paths={
    today:'<path d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z"/><path d="m8.5 14 2 2 5-5"/>',
    calendar:'<path d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z"/><path d="M7.5 13h2M12 13h2M16.5 13h.1M7.5 17h2M12 17h2M16.5 17h.1"/>',
    pay:'<path d="M4 7.5h16v11H4z"/><path d="M7 7.5V5.8A1.8 1.8 0 0 1 8.8 4h6.4A1.8 1.8 0 0 1 17 5.8v1.7M4 11.5h16M12 14v2.5M10.5 15.2H12a1 1 0 1 1 0 2h-1.5"/>',
    weather:'<path d="M7.5 18.5h9.2a3.8 3.8 0 0 0 .4-7.6A5.6 5.6 0 0 0 6.4 9.5 4.5 4.5 0 0 0 7.5 18.5Z"/><path d="M8 3.5V2M4.6 4.9 3.5 3.8M14 4.4l1-1M3 9H1.5"/>',
    more:'<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.34.28.56.67.6 1.1v.09h1v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    moon:'<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.15c-.85.43-1.3.91-1.3 1.85M12 17h.01"/>',
    sound:'<path d="M11 5 6.5 8.5H3v7h3.5L11 19V5Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
    language:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 18.5 6L20 12M4 12l1.5 6A7 7 0 0 0 17.9 16"/>',
    logout:'<path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
    radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.5 5.5M12 3v9"/>',
    alert:'<path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.74 3h16.12a2 2 0 0 0 1.74-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    arrow:'<path d="M5 12h14M14 7l5 5-5 5"/>'
  };
  return `<svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.more}</svg>`;
}
function uiShiftClass(s){return s==="早"?"early":s==="晚"?"night":s==="中"?"mid":"off"}
function uiShiftShort(s){return lang==="zh"?({"早":"早班","中":"中班","晚":"晚班","休":"休假"}[s]||s||"未排班"):({"早":"Pagi","中":"Siang","晚":"Malam","休":"Libur"}[s]||s||"Belum dijadwalkan")}
function uiFormatDuration(mins){
  mins=Math.max(0,Math.round(mins));const h=Math.floor(mins/60),m=mins%60;
  if(lang==="zh")return h?`${h}小時${m?m+"分":""}`:`${m}分鐘`;
  return h?`${h}j ${m?m+"m":""}`:`${m}m`;
}
function uiHeaderHtml(){
  const meta=`${(RN[lang]&&RN[lang][S.rt])||S.rt||""}${S.unit&&S.unit!=="__all"?" · "+S.unit:S.unit==="__all"?" · "+(lang==="zh"?"全部單位":"All Units"):""}`;
  return `<header class="app-header"><div class="brand-lockup"><img src="${IMG.icon}" alt="" class="brand-mark"><div class="brand-copy"><strong>${t("app")}</strong><span>${esc(meta)}</span></div></div><div class="header-actions"><button class="icon-button" data-a="sfx" aria-label="${lang==="zh"?"切換提示音":"Toggle sound"}">${uiIcon("sound",20)}<span class="sound-state${WxSfx.isMuted()?" muted":""}"></span></button><button class="icon-button header-language" data-a="lang" aria-label="${lang==="zh"?"切換為印尼文":"Ganti ke Bahasa Mandarin"}"><span>${lang==="zh"?"中":"ID"}</span></button><button class="icon-button" data-a="tabMore" aria-label="${lang==="zh"?"功能與設定":"Tools and settings"}">${uiIcon("settings",20)}</button></div></header>`;
}
function uiBottomNavHtml(){
  const defs=[
    ["today","tabToday","today",lang==="zh"?"今天":"Hari ini"],
    ["calendar","tabCalendar","calendar",lang==="zh"?"班表":"Jadwal"],
    ["pay","tabPay","pay",lang==="zh"?"薪資":"Gaji"],
    ["weather","tabWeather","weather",lang==="zh"?"天氣":"Cuaca"],
    ["more","tabMore","more",lang==="zh"?"更多":"Lainnya"]
  ];
  return `<nav class="bottom-nav" aria-label="${lang==="zh"?"主要導覽":"Main navigation"}">${defs.map(([tab,action,icon,label])=>`<button class="bottom-nav-item${UI_TAB===tab?" active":""}" data-a="${action}" aria-current="${UI_TAB===tab?"page":"false"}"><span class="bottom-nav-icon">${uiIcon(icon,21)}</span><span>${label}</span></button>`).join("")}</nav>`;
}
function uiScreenHeading(title,sub,actionHtml=""){
  return `<div class="screen-heading"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:""}</div>${actionHtml}</div>`;
}
function uiTodayHeroHtml(){
  const s=gs(TY,TM,TD),rule=getShiftWorkRule(TY,TM,TD),WK=t("wk"),dw=new Date(TY,TM-1,TD).getDay();
  const dateLabel=lang==="zh"?`${TM}月${TD}日・星期${WK[dw]}`:`${WK[dw]}, ${TD}/${TM}`;
  let status=lang==="zh"?"今日尚未設定班別":"Belum ada shift",sub="",progress=0;
  if(s==="休"){
    let streak=1;for(let i=1;i<=14;i++){const d=new Date(TY,TM-1,TD+i);if(gs(d.getFullYear(),d.getMonth()+1,d.getDate())==="休")streak++;else break}
    status=lang==="zh"?"今天好好休息":"Hari libur";sub=streak>1?(lang==="zh"?`連續休假 ${streak} 天`:`Libur ${streak} hari`):(lang==="zh"?"下一個班次已排入班表":"Shift berikutnya sudah dijadwalkan");progress=100;
  }else if(rule.isWork){
    const now=new Date(),nowMin=now.getHours()*60+now.getMinutes();let current=nowMin;
    if(rule.startMinute>=1200&&current<720)current+=1440;
    const end=rule.startMinute+rule.shiftHours*60;
    const timeRange=`${formatShiftOffset(rule,0)}–${formatShiftOffset(rule,rule.shiftHours*60)}`;
    if(current<rule.startMinute){status=lang==="zh"?`距離上班 ${uiFormatDuration(rule.startMinute-current)}`:`Mulai dalam ${uiFormatDuration(rule.startMinute-current)}`;progress=0}
    else if(current<end){status=lang==="zh"?`距離下班 ${uiFormatDuration(end-current)}`:`Selesai dalam ${uiFormatDuration(end-current)}`;progress=Math.max(3,Math.min(100,(current-rule.startMinute)/(rule.shiftHours*60)*100))}
    else{status=lang==="zh"?"本班已完成":"Shift selesai";progress=100}
    sub=timeRange;
  }
  let nextOff="";
  if(s&&s!=="休")for(let i=1;i<=30;i++){const d=new Date(TY,TM-1,TD+i);if(gs(d.getFullYear(),d.getMonth()+1,d.getDate())==="休"){nextOff=lang==="zh"?`${i} 天後休假`:`Libur dalam ${i} hari`;break}}
  const todayKey=ek(TY,TM,TD),eventCount=(EVS[todayKey]||[]).length+(getAdminEv(todayKey)||[]).length;
  const leaveCount=new Set(getLeaves(todayKey).map(x=>x.uid).filter(Boolean)).size;
  return `<section class="today-hero shift-${uiShiftClass(s)}"><div class="hero-noise"></div><div class="today-hero-top"><span class="eyebrow">${dateLabel}</span><span class="shift-pill">${uiShiftShort(s)}</span></div><div class="today-hero-main"><div><h1>${status}</h1><p>${sub}</p></div><div class="shift-monogram">${s||"—"}</div></div><div class="shift-progress"><span style="width:${progress.toFixed(1)}%"></span></div><div class="today-hero-meta"><span>${nextOff|| (lang==="zh"?"本月班表已同步":"Jadwal tersinkron")}</span><span>${eventCount?`${eventCount} ${lang==="zh"?"項行程":"agenda"}`:leaveCount?`${leaveCount} ${lang==="zh"?"人請假":"cuti"}`:(lang==="zh"?"今日無待辦":"Tidak ada agenda")}</span></div></section>`;
}
function uiWeekStripHtml(){
  const WK=t("wk");let items="";
  for(let i=0;i<7;i++){
    const dt=new Date(TY,TM-1,TD+i),y=dt.getFullYear(),m=dt.getMonth()+1,d=dt.getDate(),s=gs(y,m,d),key=ek(y,m,d),has=(EVS[key]||[]).length+(getAdminEv(key)||[]).length>0;
    items+=`<button class="week-chip shift-${uiShiftClass(s)}${i===0?" current":""}" data-a="openDate" data-y="${y}" data-m="${m}" data-d="${d}"><span class="week-name">${i===0?(lang==="zh"?"今天":"Hari ini"):WK[dt.getDay()]}</span><strong>${d}</strong><span class="week-shift">${uiShiftShort(s).replace(lang==="zh"?"班":"","")}</span>${has?'<i></i>':''}</button>`;
  }
  return `<section class="week-overview"><div class="section-kicker"><span>${lang==="zh"?"接下來 7 天":"7 hari ke depan"}</span><button data-a="tabCalendar">${lang==="zh"?"查看月曆":"Lihat kalender"} ${uiIcon("arrow",14)}</button></div><div class="week-strip">${items}</div></section>`;
}
function uiWeatherPreviewHtml(){
  if(!wxData)return `<button class="weather-preview is-loading" data-a="tabWeather"><div class="weather-symbol">•••</div><div><strong>${lang==="zh"?"正在取得即時天氣":"Memuat cuaca"}</strong><span>${lang==="zh"?"中央氣象署與即時雨量站":"CWA + stasiun hujan"}</span></div>${uiIcon("chevron",18)}</button>`;
  const d=wxData,code=Number(d.code),glyph=code===0?"☀":code<=3?"◐":code>=95?"ϟ":code>=51?"☂":"☁";
  const desc=(lang==="zh"?WXZ:WXD)[d.code]||"";
  return `<button class="weather-preview" data-a="tabWeather"><div class="weather-symbol">${glyph}</div><div class="weather-preview-copy"><span>${lang==="zh"?"目前天氣":"Cuaca sekarang"}</span><strong>${d.temp}° <small>${esc(desc)}</small></strong></div><div class="weather-preview-source">${lang==="zh"?"官方資料":"Data resmi"}<br>${d.updatedAt?new Date(d.updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):""}</div>${uiIcon("chevron",18)}</button>`;
}
function uiPayPreviewHtml(y,m){
  const est=calcSalaryEst(y,m),pp=calcPayPeriod(y,m);
  if(!pp)return"";
  if(!est)return `<button class="pay-preview" data-a="tabPay"><div class="pay-preview-icon">${uiIcon("pay",22)}</div><div><span>${lang==="zh"?"本期工時":"Jam periode ini"}</span><strong>${pp.tH}h <small>· ${pp.oH}h ${lang==="zh"?"加班":"lembur"}</small></strong></div>${uiIcon("chevron",18)}</button>`;
  return `<button class="pay-preview" data-a="tabPay"><div class="pay-preview-icon">${uiIcon("pay",22)}</div><div><span>${lang==="zh"?"本期預估實領":"Estimasi gaji bersih"}</span><strong>$${Math.round(est.net).toLocaleString()} <small>· ${est.otH}h ${lang==="zh"?"加班":"lembur"}</small></strong></div>${uiIcon("chevron",18)}</button>`;
}
function uiLeaveSummaryHtml(y,m){
  const isZh=lang==="zh";
  if(!fbUser){
    return `<section class="leave-center leave-center-empty"><div class="leave-center-head"><div><span class="section-label">${isZh?"請假中心":"Pusat cuti"}</span><h3>${isZh?"登入後查看個人請假統計":"Login untuk melihat statistik cuti"}</h3></div>${uiIcon("user",22)}</div><p>${isZh?"請假時數、假別分布、特休餘額與即將到來的請假會集中顯示在這裡。":"Jam cuti, jenis cuti, sisa cuti tahunan, dan jadwal cuti akan tampil di sini."}</p></section>`;
  }
  const dm=dim(y,m),entries=[],days=new Set(),byType={};let total=0,next=null;
  for(let d=1;d<=dm;d++){
    const date=ek(y,m,d),mine=myLeave(date);
    mine.forEach(l=>{
      const h=Math.max(0,+l.hours||0),lt=getLT(l.leaveType)||{};
      total+=h;days.add(date);entries.push({date,h,leaveType:l.leaveType,lt});
      const key=l.leaveType||"other";if(!byType[key])byType[key]={h:0,lt};byType[key].h+=h;
      const ts=new Date(date+"T00:00:00+08:00").getTime();
      if(ts>=new Date(TY,TM-1,TD).setHours(0,0,0,0)&&(!next||ts<next.ts))next={ts,date,h,lt,leaveType:l.leaveType};
    });
  }
  const monthLabel=isZh?`${y}年${m}月`:`${m}/${y}`;
  const typeChips=Object.entries(byType).sort((a,b)=>b[1].h-a[1].h).map(([id,v])=>{
    const name=isZh?(v.lt.name||id):(v.lt.nameId||v.lt.name||id);
    const color=v.lt.color||"var(--brand)";
    return `<span class="leave-type-chip" style="--leave-color:${color}"><i></i>${esc(name)} ${Math.round(v.h*10)/10}h</span>`;
  }).join("")||`<span class="leave-none">${isZh?"本月尚無請假紀錄":"Belum ada cuti bulan ini"}</span>`;
  const a=getAL(),annual=a.total>0?`${Math.round(alRem()*10)/10}h`:(isZh?"未設定":"Belum diatur");
  const nextText=next?`${next.date.slice(5).replace('-', '/')} · ${esc(isZh?(next.lt.name||next.leaveType):(next.lt.nameId||next.lt.name||next.leaveType))}`:(isZh?"目前沒有":"Tidak ada");
  return `<section class="leave-center"><div class="leave-center-head"><div><span class="section-label">${isZh?"請假中心":"Pusat cuti"}</span><h3>${monthLabel}</h3></div><button class="leave-calendar-link" data-a="tabCalendar">${isZh?"查看班表":"Lihat jadwal"} ${uiIcon("chevron",15)}</button></div><div class="leave-metrics"><div><strong>${Math.round(total*10)/10}<small>h</small></strong><span>${isZh?"請假時數":"Jam cuti"}</span></div><div><strong>${days.size}</strong><span>${isZh?"請假天數":"Hari cuti"}</span></div><div><strong>${annual}</strong><span>${isZh?"特休餘額":"Sisa tahunan"}</span></div></div><div class="leave-type-list">${typeChips}</div><div class="leave-next"><span>${isZh?"下一筆請假":"Cuti berikutnya"}</span><strong>${nextText}</strong></div>${isAdmin()?`<button class="leave-admin-button" data-a="leavesOv">${uiIcon("calendar",18)}<span><b>${isZh?"單位請假總覽":"Ringkasan cuti unit"}</b><small>${isZh?"查看名單、假別、時數與人力":"Lihat nama, jenis, jam dan tenaga"}</small></span>${uiIcon("chevron",17)}</button>`:""}</section>`;
}
function uiMoreHtml(y,m){
  const isZh=lang==="zh";
  const row=(action,icon,title,sub,trail="")=>`<button class="settings-row" data-a="${action}"><span class="settings-row-icon">${uiIcon(icon,20)}</span><span class="settings-row-copy"><strong>${title}</strong><small>${sub}</small></span>${trail||uiIcon("chevron",18)}</button>`;
  const lunarOn=!!S.showLunar,soundOn=!WxSfx.isMuted();
  return `<section class="quick-controls" aria-label="${isZh?"快速設定":"Pengaturan cepat"}"><div class="quick-control-card language-control"><span class="quick-control-label">${isZh?"顯示語言":"Bahasa"}</span><div class="segmented-language" role="group"><button class="${lang==="zh"?"active":""}" data-a="lzh">中文</button><button class="${lang==="id"?"active":""}" data-a="lid">Indonesia</button></div></div><button class="quick-control-card" data-a="lunar"><span class="quick-control-icon">${uiIcon("moon",20)}</span><span><b>${isZh?"農曆與宜忌":"Kalender lunar"}</b><small>${lunarOn?(isZh?"月曆中顯示":"Ditampilkan"):(isZh?"目前隱藏":"Disembunyikan")}</small></span><span class="status-switch${lunarOn?" on":""}"><i></i></span></button><button class="quick-control-card" data-a="sfx"><span class="quick-control-icon">${uiIcon("sound",20)}</span><span><b>${isZh?"提示音與環境音":"Suara"}</b><small>${soundOn?(isZh?"目前開啟":"Aktif"):(isZh?"目前靜音":"Dimatikan")}</small></span><span class="status-switch${soundOn?" on":""}"><i></i></span></button></section>${uiLeaveSummaryHtml(y,m)}<section class="settings-panel"><div class="settings-group"><div class="settings-group-title">${isZh?"班表工具":"Alat jadwal"}</div>${row("stats","chart",isZh?"年度統計":"Statistik tahunan",isZh?"班別、工時、加班、請假與特休":"Shift, jam, lembur dan cuti")}${row("share","share",isZh?"分享班表":"Bagikan jadwal",isZh?"輸出目前月份的完整班表圖片":"Ekspor gambar kalender bulan ini")}${row("help","help",isZh?"使用說明":"Bantuan",isZh?"查看全部功能、標記與資料來源":"Fitur, tanda dan sumber data")}</div><div class="settings-group"><div class="settings-group-title">${isZh?"天氣與系統":"Cuaca & sistem"}</div>${row("prefs","settings",isZh?"天氣、警報與特效設定":"Cuaca, peringatan & efek",isZh?"通知、定位、警報類型、動畫與音效":"Notifikasi, lokasi, peringatan dan efek")}${row("lang","language",isZh?"快速切換語言":"Ganti bahasa",isZh?"目前為繁體中文，點擊切換 Indonesia":"Saat ini Indonesia, ketuk untuk 中文",`<span class="settings-value">${lang==="zh"?"中文":"ID"}</span>`)}</div>${isAdmin()?`<div class="settings-group"><div class="settings-group-title">${isZh?"管理員":"Admin"}</div>${row("leavesOv","calendar",isZh?"單位請假總覽":"Ringkasan cuti unit",isZh?"查看請假名單、原因、時數與人力":"Nama, alasan, jam dan tenaga")}</div>`:""}<div class="settings-group danger-zone">${row("reset","refresh",isZh?"重新設定輪班":"Atur ulang shift",isZh?"保留帳號，重新選擇班制與今日位置":"Pilih ulang pola shift")}</div></section>`;
}
function rCal(){
  const r=rot(),c=cyc(),y=S.yr,m=S.mo,dm=dim(y,m),fd=fdw(y,m),ic=y===TY&&m===TM;
  const st={};for(let d=1;d<=dm;d++){const s=gs(y,m,d);if(s)st[s]=(st[s]||0)+1}
  const wk=Object.entries(st).filter(([s])=>s!=="休").reduce((a,[,v])=>a+v,0);
  const WK=t("wk");
  let cells="";for(let i=0;i<fd;i++)cells+=`<div></div>`;
  const pd5=getPayDay(y,m,5),pd20=getPayDay(y,m,20);
  for(let d=1;d<=dm;d++){const s=gs(y,m,d),td=ic&&d===TD,hol=gh(y,m,d),ev=EVS[ek(y,m,d)]||[],he=ev.length>0,dayAL=ALD[ek(y,m,d)],aev=hasAdminEv(ek(y,m,d)),dw=new Date(y,m-1,d).getDay(),isOff=(dw===0||dw===6||isTWOff(y,m,d)),isPay=(d===pd5||d===pd20),isAdj=!!SHIFT_OV[ek(y,m,d)];
    cells+=`<div class="day ${SC[s]}${td?' today':''}${he?' has-ev':''}${aev?' admin-ev':''}${isPay?' pay-day':''}" data-a="open" data-d="${d}"><span class="num">${d}</span><span class="sn">${sf(s)}</span>${S.showLunar?lunarCellText(y,m,d):""}${isAdj?'<span style="position:absolute;top:1px;right:2px;font-size:9px;line-height:1" title="已調班">🔄</span>':''}${td?`<span class="td">${lang==="zh"?"今天":"TODAY"}</span>`:''}${d===pd5?'<span class="pay-tag">💰</span>':''}${d===pd20?'<span class="pay-tag">🏆</span>':''}${he?`<div class="evb">${ev.length}</div>`:''}${isOff?'<span class="hol-dot"></span>':''}${dayAL?'<span class="al-dot"></span>':''}${(()=>{const lc=getLeaves(ek(y,m,d)),n=new Set(lc.map(x=>x.uid)).size;return n?`<span class="leave-badge">${n}</span>`:""})()}</div>`}
  const isPast=(dd)=>y<TY||(y===TY&&m<TM)||(y===TY&&m===TM&&dd<TD);
  const mh=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const h=gh(y,m,d);if(h)mh.push(`${m}/${d} ${h}`)}
  let holH=mh.length?`<div class="hol-strip">🎌 ${mh.join("　")}</div>`:"";
  let lvParts=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const lv=getLeaves(ek(y,m,d)),n=new Set(lv.map(x=>x.uid)).size;if(n)lvParts.push(`${m}/${d} ${n}${lang==="zh"?"人請假":" cuti"}`)}
  let adParts=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const ae=getAdminEv(ek(y,m,d));if(ae.length)ae.forEach(t=>adParts.push(`${m}/${d} ${en(t)}`))}
  if(adParts.length)holH+=`<div class="hol-strip" style="background:rgba(198,40,40,.06);border-left-color:var(--red);color:var(--red)">📢 ${adParts.join("　")}</div>`;
  if(lvParts.length)holH+=`<div class="hol-strip" style="background:var(--amber-l);border-left-color:var(--amber);color:#b36b00;display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px">📋 ${lvParts.map(p=>`<span style="white-space:nowrap">${p}</span>`).join("")}</div>`;
  const rems=[];for(let d=1;d<=dm;d++){if(isPast(d))continue;const evs=EVS[ek(y,m,d)];if(evs&&evs.length){const s=gs(y,m,d),dw=new Date(y,m-1,d).getDay();evs.forEach(eid=>rems.push({d,dw,shift:sf(s),eid}))}}
  let remH="";if(rems.length){remH=`<div class="rem-sec"><div class="rem-title">${t("rem")}</div><div class="rem-list">${rems.map(r=>{const nm=r.eid==="custom"&&NOTES[ek(y,m,r.d)]?esc(NOTES[ek(y,m,r.d)]):r.eid==="typhoon"&&TYD[ek(y,m,r.d)]?`${en(r.eid)} ${TYD[ek(y,m,r.d)]}h`:en(r.eid);return`<div class="rem-item" data-a="open" data-d="${r.d}"><div class="rem-date"><div class="d">${r.d}</div><div class="w">${WK[r.dw]}</div></div><div class="rem-info"><div class="rem-name">${nm}</div><div class="rem-shift">${r.shift}</div></div><div style="font-size:16px">${EE[r.eid]||"📌"}</div></div>`}).join("")}</div></div>`}
  let chips=Object.entries(st).map(([s,n])=>`<div class="dash-item"><div class="dash-val ${SC[s]}">${n}</div><div class="dash-lbl">${sf(s)}</div></div>`).join("");
  chips+=`<div class="dash-item"><div class="dash-val w">${wk}</div><div class="dash-lbl">${t("workD")}</div></div>`;
  const hH="";
  const alH=getAL().total>0?`<div class="al-bar fi" data-a="alEdit" style="cursor:pointer"><span class="al-bar-label">🌴 ${t("alRem")} (${alYRange(curALY())})</span><span class="al-bar-val">${alRem()} ${t("hr")}</span></div>`:`<div class="al-bar fi" data-a="alEdit" style="cursor:pointer;background:rgba(76,175,80,.08);color:var(--green);font-weight:600;justify-content:center;text-align:center"><span>🌴 ${lang==="zh"?`點此設定 ${curALY()+1} 年度特休時數`:`Atur cuti tahun ${curALY()+1}`}</span></div>`;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent),showI=(!!DP||isIOS)&&!S.instH;
  let instH="";if(showI){instH=`<div class="install-wrap"><div class="install-card"><img class="install-icon" src="${IMG.icon}"><div class="install-info"><div class="install-title">${t("instT")}</div><div class="install-sub">${DP?t("instS"):t("instSi")}</div></div>${DP?`<button class="install-btn" data-a="inst">${t("instB")}</button>`:''}<button class="install-x" data-a="hideI">✕</button></div></div>`}
  const ml=lang==="zh"?`${y}年${m}月`:`${m}/${y}`;
  let todayBarH="";if(ic){const ts=gs(TY,TM,TD);if(ts){const tImg=SI[ts]||"";const tsName=sf(ts);
    let restInfo="",restDays=0;
    const _isOff=(y2,m2,d2)=>{if(gs(y2,m2,d2)==="休")return true;const ml2=myLeave(ek(y2,m2,d2));let lh=0;ml2.forEach(l=>lh+=l.hours||0);return lh>=8};
    if(!_isOff(TY,TM,TD)){for(let dd=1;dd<=30;dd++){const fd=new Date(TY,TM-1,TD+dd);if(_isOff(fd.getFullYear(),fd.getMonth()+1,fd.getDate())){restDays=dd;restInfo=(lang==="zh"?`${dd}天後休`:`${dd} hari lagi libur`);break}}}
    else{let streak=0;for(let dd=0;dd<=14;dd++){const fd=new Date(TY,TM-1,TD+dd);if(_isOff(fd.getFullYear(),fd.getMonth()+1,fd.getDate()))streak++;else break}if(streak>1)restInfo=(lang==="zh"?"連休 "+streak+" 天":"Libur "+streak+" hari");else restInfo=(lang==="zh"?"今天休假":"Hari ini libur")}
    let apd5=getPayDay(TY,TM,5),apd20=getPayDay(TY,TM,20);
    let payDay5=apd5-TD,payDay20=apd20-TD;
    if(payDay5<0){const nm=TM===12?1:TM+1,ny=TM===12?TY+1:TY;payDay5=getPayDay(ny,nm,5)+dim(TY,TM)-TD}
    if(payDay20<0){const nm=TM===12?1:TM+1,ny=TM===12?TY+1:TY;payDay20=getPayDay(ny,nm,20)+dim(TY,TM)-TD}
    const payInfo=payDay5<=7?(lang==="zh"?`💰 ${payDay5===0?"今天發薪":payDay5+"天後發薪"}`:`💰 ${payDay5===0?"Gaji hari ini":payDay5+" hari lagi gaji"}`):(payDay20<=7?(lang==="zh"?`🏆 ${payDay20===0?"今天績效獎金":payDay20+"天後績效獎金"}`:`🏆 ${payDay20===0?"Bonus hari ini":payDay20+" hari lagi bonus"}`):"");
    todayBarH=`<div class="today-bar fi"><div class="today-bar-main"><div class="today-bar-shift"><img src="${tImg}"><span>${TM}/${TD} ${tsName}</span></div><div class="today-bar-rest">${restInfo}</div></div>${payInfo?`<div class="today-bar-pay">${payInfo}</div>`:""}</div>`}}
  const topMeta=`${(RN[lang]&&RN[lang][S.rt])||S.rt||""}${S.unit&&S.unit!=="__all"?" · "+S.unit:S.unit==="__all"?" · "+(lang==="zh"?"全部單位":"All Units"):""}`;
  const monthHeading=uiScreenHeading(ml,lang==="zh"?"點選日期可查看班別、請假與標記事項":"Ketuk tanggal untuk detail",`<button class="text-action" data-a="today">${lang==="zh"?"回到本月":"Bulan ini"}</button>`);
  const calendarPanel=`${monthHeading}<section class="calendar-shell" aria-label="${ml}"><div class="mnav"><button class="mnav-btn" data-a="prev" aria-label="${lang==="zh"?"上個月":"Previous month"}">‹</button><div class="mnav-title"><span>${ml}</span><small>${lang==="zh"?"輪班月曆":"Shift calendar"}</small></div><button class="mnav-btn" data-a="next" aria-label="${lang==="zh"?"下個月":"Next month"}">›</button></div>${S.showLunar?lunarTodayStrip():""}<div class="wk-row">${WK.map((w,i)=>`<div class="wk-cell${i===0||i===6?" we":""}">${w}</div>`).join("")}</div><div class="cal fi">${cells}</div></section>${holH}${remH}<div class="dash fi">${chips}</div>`;
  let tabContent="";
  if(UI_TAB==="calendar"){
    tabContent=calendarPanel;
  }else if(UI_TAB==="pay"){
    tabContent=`${uiScreenHeading(lang==="zh"?"薪資中心":"Pusat gaji",lang==="zh"?"依公司週期彙整工時、加班與預估實領":"Ringkasan jam kerja dan estimasi gaji",`<button class="icon-action" data-a="salOpen">${uiIcon("settings",18)}</button>`)}${payCardHtml(y,m)}${salaryEstHtml(y,m)}${alH}<div class="dash fi">${chips}</div>`;
  }else if(UI_TAB==="weather"){
    tabContent=`${uiScreenHeading(lang==="zh"?"天氣與災防":"Cuaca & peringatan",lang==="zh"?"官方警特報、即時雨量、預報與潮汐":"Peringatan resmi, hujan, prakiraan, pasang",`<button class="icon-action" data-a="prefs">${uiIcon("settings",18)}</button>`)}${typeof notifyCtaHtml==='function'?notifyCtaHtml():''}${typeof wxAlertHtml==='function'?wxAlertHtml():''}${rainWarnHtml()}${typeof wxHtml==='function'?wxHtml():''}`;
  }else if(UI_TAB==="more"){
    tabContent=`${uiScreenHeading(lang==="zh"?"功能與設定":"Fitur & pengaturan",lang==="zh"?"農曆、語言、請假統計、分享與帳號集中管理":"Kalender lunar, bahasa, cuti, berbagi dan akun")}${uiMoreHtml(y,m)}${fbBarHtml()}`;
  }else{
    tabContent=`${uiTodayHeroHtml()}${typeof notifyCtaHtml==='function'?notifyCtaHtml():''}${typeof wxAlertHtml==='function'?wxAlertHtml():''}${rainWarnHtml()}${uiWeekStripHtml()}${remH}${uiWeatherPreviewHtml()}${uiPayPreviewHtml(y,m)}${todayBarH}`;
  }
  return `<div class="app-shell">${uiHeaderHtml()}<main class="app-main screen-${UI_TAB}">${tabContent}<div class="content-end-space"></div></main>${uiBottomNavHtml()}${instH}</div>`;

}

// ═══════════════════════════════════════════════════════════════
// WIDGET MODE — 用 URL 參數 ?w=1 開啟，顯示巨型今日班別
// 使用方式：把 https://你的網址/?w=1 加入主畫面，當成第二個捷徑
// 完全離線運作，不需登入也能看（只要本地已設定過班別）
// ═══════════════════════════════════════════════════════════════
function rWidget(){
  const s=gs(TY,TM,TD);
  // 顏色對應（與月曆同色系）
  const bg={"早":"#b3e5fc","晚":"#d1c4e9","中":"#ffe0b2","休":"#e0e0e0"};
  const tx={"早":"#01579b","晚":"#311b92","中":"#e65100","休":"#424242"};
  // 若未設定班別 → 引導回主 app
  if(!s){
    return`<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;background:#f5f5f5;text-align:center">
      <div style="font-size:60px;margin-bottom:20px">⚙️</div>
      <div style="font-size:18px;font-weight:700;color:#333;margin-bottom:10px">${lang==="zh"?"尚未設定班別":"Belum atur shift"}</div>
      <div style="font-size:13px;color:#666;margin-bottom:30px;line-height:1.6">${lang==="zh"?"請先到主畫面完成輪班規則設定":"Buka aplikasi utama untuk atur shift dulu"}</div>
      <a href="./" style="background:#00897b;color:#fff;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none">${lang==="zh"?"開啟主畫面":"Buka Aplikasi"}</a>
    </div>`;
  }
  const WK=t("wk"),dw=new Date(TY,TM-1,TD).getDay();
  const dateStr=lang==="zh"?`${TY}年${TM}月${TD}日 週${WK[dw]}`:`${WK[dw]}, ${TD}/${TM}/${TY}`;
  // 明天班別預覽
  const tom=new Date(TY,TM-1,TD+1),ts=gs(tom.getFullYear(),tom.getMonth()+1,tom.getDate());
  const tomLabel=ts?(SE[ts]||"")+sf(ts):"";
  // 距下次休假天數
  let nextOff="";
  if(s!=="休"){
    for(let dd=1;dd<=30;dd++){
      const fd=new Date(TY,TM-1,TD+dd);
      if(gs(fd.getFullYear(),fd.getMonth()+1,fd.getDate())==="休"){
        nextOff=lang==="zh"?`再 ${dd} 天放假`:`${dd} hari lagi libur`;break;
      }
    }
  }else{
    // 今天休假 → 算連續休假還剩幾天
    let streak=1;
    for(let dd=1;dd<=14;dd++){
      const fd=new Date(TY,TM-1,TD+dd);
      if(gs(fd.getFullYear(),fd.getMonth()+1,fd.getDate())==="休")streak++;else break;
    }
    nextOff=streak>1?(lang==="zh"?`連休 ${streak} 天`:`Libur ${streak} hari`):(lang==="zh"?"今天休假":"Hari ini libur");
  }
  // 發薪/獎金倒數
  const pd5=getPayDay(TY,TM,5),pd20=getPayDay(TY,TM,20);
  let payD5=pd5-TD,payD20=pd20-TD;
  if(payD5<0){const nm=TM===12?1:TM+1,ny=TM===12?TY+1:TY;payD5=getPayDay(ny,nm,5)+dim(TY,TM)-TD}
  if(payD20<0){const nm=TM===12?1:TM+1,ny=TM===12?TY+1:TY;payD20=getPayDay(ny,nm,20)+dim(TY,TM)-TD}
  const payTxt=payD5<=7?`💰 ${payD5===0?(lang==="zh"?"今天發薪":"Gajian"):(payD5+(lang==="zh"?" 天後發薪":" hari lagi gaji"))}`:payD20<=7?`🏆 ${payD20===0?(lang==="zh"?"今天績效":"Bonus"):(payD20+(lang==="zh"?" 天後績效":" hari lagi bonus"))}`:"";
  // 節日提醒
  const hol=gh(TY,TM,TD);
  return`<div style="min-height:100vh;display:flex;flex-direction:column;background:${bg[s]||'#f5f5f5'};color:${tx[s]||'#333'};padding:0;position:fixed;inset:0;overflow:auto">
    <div style="text-align:right;padding:12px 16px"><a href="./" style="color:${tx[s]};opacity:.6;font-size:12px;text-decoration:none;background:rgba(255,255,255,.5);padding:6px 12px;border-radius:14px">${lang==="zh"?"完整版 ›":"Full ›"}</a></div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center">
      <div style="font-size:14px;font-weight:600;opacity:.7;margin-bottom:8px">${dateStr}</div>
      ${hol?`<div style="font-size:12px;font-weight:700;color:#c62828;background:rgba(255,255,255,.6);padding:4px 12px;border-radius:12px;margin-bottom:18px">🎌 ${hol}</div>`:'<div style="height:18px"></div>'}
      <div style="font-size:120px;line-height:1;margin-bottom:10px">${SE[s]||""}</div>
      <div style="font-size:64px;font-weight:900;letter-spacing:6px;line-height:1">${sf(s)}</div>
      ${nextOff?`<div style="font-size:15px;font-weight:600;opacity:.75;margin-top:24px">${nextOff}</div>`:""}
      ${tomLabel?`<div style="font-size:13px;opacity:.65;margin-top:6px">${lang==="zh"?"明天":"Besok"}：${tomLabel}</div>`:""}
      ${payTxt?`<div style="font-size:14px;font-weight:700;margin-top:18px;background:rgba(255,255,255,.6);padding:6px 14px;border-radius:14px">${payTxt}</div>`:""}
    </div>
    <div style="text-align:center;padding:16px;font-size:10px;opacity:.4">${lang==="zh"?"我的班表 · 今日顯示":"My Shift · Today"}</div>
  </div>`;
}

function rMod(){
  const{y,m,d}=S.modal,s=gs(y,m,d),hol=gh(y,m,d),ev=EVS[ek(y,m,d)]||[],dw=new Date(y,m-1,d).getDay();
  const WK=t("wk");const bg={"早":"rgba(0,77,86,.08)","晚":"var(--sec-l)","中":"rgba(158,96,0,.06)","休":"var(--green-l)"};
  let holL=hol?`<div style="padding:8px 10px;border-radius:8px;background:var(--red-l);margin-bottom:8px;font-size:11px;color:var(--red);font-weight:600">🎌 ${hol}</div>`:"";
  const evR=(EI.filter(id=>!ADMIN_EV.includes(id))).map(id=>{const a=ev.includes(id);return`<button class="ev-item${a?' on':''}" data-a="tev" data-eid="${id}"><span class="ev-emoji">${EE[id]}</span><span class="ev-name">${en(id)}</span><div class="ev-check">${a?'✓':''}</div></button>`}).join("");
  const ds=lang==="zh"?`${m}月${d}日 週${WK[dw]}`:`${WK[dw]}, ${d}/${m}/${y}`;
  const hasAL=ev.includes("annualL");const dayAL=ALD[ek(y,m,d)]||0;
  let alP="";if(hasAL){let opts="";for(let h=0.5;h<=12;h+=0.5){opts+=`<option value="${h}"${h===dayAL?' selected':''}>${h} ${t("hr")}</option>`}alP=`<div class="al-pick"><label>🌴 ${t("alPick")} (${t("alRem")}: ${alRem()}${t("hr")})</label><select id="alSel" data-a="alh">${opts}</select></div>`}
  const hasCust=ev.includes("custom");const custTxt=NOTES[ek(y,m,d)]||"";
  let custP="";if(hasCust){custP=`<div class="al-pick" style="border-color:var(--pri)"><label>📝 ${lang==="zh"?"備註內容":"Isi catatan"}</label><input type="text" id="custIn" value="${esc(custTxt)}" placeholder="${lang==="zh"?"輸入備註...":"Tulis catatan..."}" maxlength="50" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-top:4px" oninput="NOTES['${ek(y,m,d)}']=this.value;sNotes()"></div>`}
  const hasTy=ev.includes("typhoon");const dayTy=TYD[ek(y,m,d)]||0;
  let tyP="";if(hasTy){let opts="";for(let h=0.5;h<=12;h+=0.5){opts+=`<option value="${h}"${h===dayTy?' selected':''}>${h} ${t("hr")}</option>`}tyP=`<div class="al-pick" style="border-color:#0288d1;background:rgba(2,136,209,.05)"><label style="color:#01579b">🌀 ${lang==="zh"?"颱風假時數":"Jam Libur Topan"}</label><select id="tySel" data-a="tyh" style="margin-top:4px">${opts}</select><div style="font-size:10px;color:var(--tx3);margin-top:4px;line-height:1.4">${lang==="zh"?"依公告自行記錄天災假時數；目前依薪資條規則不扣正常薪資，也不自動扣加班。實際加班仍以上方「加班出勤」為準。":"Sesuai pengumuman: seharian=12h, sore=6h, dll."}</div></div>`}
  return`<div class="modal-bg" data-a="close"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div><div class="modal-title">${ds}</div><div class="modal-date">${y}/${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}</div>
  <div class="modal-shift" style="background:${bg[s]||'var(--pri-l)'}"><img src="${SI[s]}" style="width:28px;height:28px;border-radius:8px"><div class="modal-shift-name">${sf(s)}</div></div>${shiftAdjHtml(y,m,d)}${holL}${(()=>{try{return modalLeaveHtml(y,m,d)}catch(e){return'<div style="color:red;font-size:11px">Leave error: '+e.message+'</div>'}})()}${adminEvModalHtml(y,m,d)}<div class="modal-divider"></div><div class="modal-section">${t("mark")}</div><div class="ev-list">${evR}</div>${alP}${tyP}${custP}${S.showLunar?lunarModalBlock(y,m,d):""}
  <button class="modal-done" data-a="close">${t("done")}</button></div></div>`}

// ═══ 調班 UI ═══
function shiftAdjHtml(y,m,d){
  const isZh=lang==="zh";
  const key=ek(y,m,d);
  const orig=gsOrig(y,m,d);         // 公式原本的班
  const isOv=!!SHIFT_OV[key];        // 是否已調班
  const cur=SHIFT_OV[key]||orig;     // 目前顯示的班
  if(orig===null)return"";           // 還沒設定班表時不顯示
  const opts=[["早",isZh?"早班":"Pagi"],["中",isZh?"中班":"Siang"],["晚",isZh?"晚班":"Malam"],["休",isZh?"休假":"Libur"]];
  const btns=opts.map(([v,label])=>{
    const on=cur===v;
    return`<button onclick="doShiftAdj('${key}','${v}')" style="flex:1;padding:8px 4px;border-radius:6px;border:1.5px solid ${on?'var(--pri)':'#ddd'};background:${on?'var(--pri)':'var(--card)'};color:${on?'#fff':'var(--tx)'};font-size:12px;font-weight:${on?'700':'500'};cursor:pointer">${label}</button>`;
  }).join("");
  const origLabel={"早":isZh?"早班":"Pagi","中":isZh?"中班":"Siang","晚":isZh?"晚班":"Malam","休":isZh?"休假":"Libur"}[orig]||orig;
  return`<div class="al-pick" style="border-color:#f57c00;background:rgba(245,124,0,.05)">
    <label style="color:#e65100">🔄 ${isZh?"調班（特殊狀況改這天班別）":"Ubah Shift Hari Ini"}</label>
    <div style="display:flex;gap:4px;margin-top:6px">${btns}</div>
    ${isOv?`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px"><span style="font-size:10px;color:var(--tx3)">${isZh?"原班表為「"+origLabel+"」":"Asli: "+origLabel}</span><button onclick="doShiftAdj('${key}','')" style="background:var(--tx3);color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:10px;cursor:pointer">${isZh?"↩ 還原原班":"↩ Reset"}</button></div>`:`<div style="font-size:10px;color:var(--tx3);margin-top:6px">${isZh?"點上方按鈕即可把這天改成其他班別，只影響這一天。會自動重算工時與薪資。":"Klik untuk ubah shift hari ini saja."}</div>`}
  </div>`;
}
// 執行調班：覆寫某天班別並重新渲染
function doShiftAdj(key,val){
  const[y,m,d]=key.split("-").map(Number);
  // 若改成的班別 = 公式原本的班，視為還原（不留覆寫，保持資料乾淨）
  const orig=gsOrig(y,m,d);
  if(val&&val===orig){delete SHIFT_OV[key];sShiftOv()}
  else{setShiftOv(y,m,d,val)}
  render();
}

function fbBarHtml(){
  if(!firebase||!fbAuth)return"";
  if(!fbUser)return`<div class="fb-bar fi" style="background:linear-gradient(135deg,#fff3e0,#fbe9e7);border:1.5px solid #ff8f00;border-radius:10px;padding:12px 14px;margin:0 0 6px">
    <div style="font-size:12px;font-weight:700;color:#e65100;margin-bottom:6px">⚠️ ${lang==="zh"?"尚未登入 — 清除快取將遺失所有資料":"Belum login — data hilang jika cache dihapus"}</div>
    <button onclick="fbLogin()" id="loginBtn" style="width:100%;background:#fff;border:1px solid #ddd;padding:10px;border-radius:8px;font-size:13px;font-weight:700;color:var(--tx);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:18px;height:18px">
      ${fbLoginPending?(lang==="zh"?"⏳ 登入中...":"⏳ Logging in..."):(lang==="zh"?"Google 登入保護資料":"Login Google untuk lindungi data")}
    </button>
  </div>`;
  const pic=fbUser.photoURL?`<img class="fb-avatar" src="${fbUser.photoURL}" referrerpolicy="no-referrer">`:"";
  const name=fbUser.displayName||fbUser.email||"";
  return`<div class="fb-bar fi"><div class="fb-user">${pic}<span>${esc(name)}</span></div><button onclick="fbLogout()" style="background:var(--tx3)">${lang==="zh"?"登出":"Logout"}</button></div>${S.unit?"":`<div style="margin:4px 0;padding:8px 10px;background:#fff3e0;border-radius:8px;border:1px solid #ffcc80;font-size:11px;color:#e65100;font-weight:600">⚠️ ${lang==="zh"?"請先選擇單位（重設後可設定）":"Pilih unit terlebih dahulu (reset untuk setting)"}</div>`}`;
}
function modalLeaveHtml(y,m,d){
  const date=ek(y,m,d),leaves=getLeaves(date),myLeaves=leaves.filter(l=>l.uid===(fbUser&&fbUser.uid)),rule=getShiftWorkRule(y,m,d);
  const uniqueCount=a=>new Set((a||[]).map(l=>l.uid).filter(Boolean)).size;
  let html="";
  const realLeaves=leaves.filter(l=>!String(l.uid||"").startsWith("admin_"));
  if(leaves.length){
    const people=uniqueCount(leaves),realPeople=uniqueCount(realLeaves);
    if(isAdmin()&&realLeaves.length){
      html+=`<div class="leave-info">${lang==="zh"?"📋 今日 "+realPeople+" 人請假":"📋 "+realPeople+" orang cuti"}<div class="leave-list">${realLeaves.map(l=>{
        let timeStr="";const lt=getLT(l.leaveType);const ltName=lt?(lang==="zh"?lt.name:lt.nameId):l.leaveType;
        if(l.ts&&l.ts.toDate){const dt=l.ts.toDate();timeStr=` ${String(dt.getMonth()+1)}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`}
        const reasonStr=l.reason?`<br><small style="color:var(--pri);font-weight:600">💬 ${esc(l.reason)}</small>`:"";
        return`<span style="border-left:3px solid ${lt?lt.color:'#999'};padding-left:4px">${esc(l.name)} ${esc(ltName)} ${l.hours}h<br><small style="color:var(--tx2)">🕒 ${esc(formatLeaveRange(l,date))}</small>${l.unit&&l.unit!==S.unit?' ['+esc(l.unit)+']':''}${timeStr?'<br><small style="color:var(--tx3)">'+timeStr+'</small>':''}${reasonStr}</span>`
      }).join("")}</div></div>`;
    }else if(leaves.length)html+=`<div class="leave-info">${lang==="zh"?"📋 今日 "+people+" 人請假":"📋 "+people+" orang cuti"}</div>`;
  }
  if(fbUser&&myLeaves.length){
    html+=`<div style="margin:6px 0"><div style="font-size:11px;font-weight:700;margin-bottom:4px">${lang==="zh"?"我的請假":"Cuti saya"}</div>`;
    myLeaves.forEach(l=>{
      const lt=getLT(l.leaveType),ltName=lt?(lang==="zh"?lt.name:lt.nameId):l.leaveType;
      const reasonRow=l.reason?`<div style="font-size:11px;color:var(--tx2);padding:3px 8px 0;font-style:italic">💬 ${esc(l.reason)}</div>`:"";
      const legacy=!hasPreciseLeaveTime(l)?`<div style="font-size:9px;color:#e65100;padding:0 8px 4px">⚠️ ${lang==="zh"?"舊紀錄沒有起訖時間；薪資暫沿用舊推算。建議取消後重登。":"Data lama tanpa waktu; masukkan ulang untuk akurat."}</div>`:"";
      html+=`<div style="background:var(--card);border-radius:6px;margin-bottom:3px;border-left:3px solid ${lt?lt.color:'#999'};padding-bottom:${l.reason||legacy?'4px':'0'}"><div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;gap:8px"><span style="font-size:12px;font-weight:600">${ltName} ${l.hours}h<br><small style="color:var(--tx2);font-weight:500">🕒 ${esc(formatLeaveRange(l,date))}</small></span><button onclick="removeLeave('${date}','${l.leaveType}','${l.docId||''}')" style="background:var(--red);color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">${lang==="zh"?"取消":"Batal"}</button></div>${reasonRow}${legacy}</div>`;
    });
    html+=`</div>`;
  }
  if(rule.isWork&&rule.overtimeMinutes>0&&fbUser){
    const has=Object.prototype.hasOwnProperty.call(OTD,date),scheduled=rule.overtimeMinutes/60,val=has?String(OTD[date]):"";
    let otOpts=`<option value=""${!has?' selected':''}>${lang==="zh"?"未設定（依排班 "+scheduled+"h）":"Belum diatur (jadwal "+scheduled+"h)"}</option>`;
    for(let h=0;h<=scheduled+1e-9;h+=0.5)otOpts+=`<option value="${h}"${val===String(h)?' selected':''}>${h}h</option>`;
    html+=`<div style="margin:8px 0;padding:10px;background:rgba(255,152,0,.08);border:1.5px solid #ffb74d;border-radius:8px">
      <div style="font-size:12px;font-weight:800;color:#e65100;margin-bottom:5px">⏱️ ${lang==="zh"?"加班出勤（不是請假）":"Kehadiran lembur (bukan cuti)"}</div>
      <div style="font-size:10px;color:var(--tx2);line-height:1.5;margin-bottom:7px">${lang==="zh"?`正常工時 ${formatShiftOffset(rule,0)}–${formatShiftOffset(rule,rule.regularMinutes)}；加班 ${formatShiftOffset(rule,rule.regularMinutes)}–${formatShiftOffset(rule,rule.regularMinutes+rule.overtimeMinutes)}。加班沒做不用請假，只要記錄實際做幾小時。`:`Jam normal ${formatShiftOffset(rule,0)}–${formatShiftOffset(rule,rule.regularMinutes)}; lembur dicatat terpisah.`}</div>
      <div style="display:flex;gap:6px;align-items:center"><select id="actualOtSel" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px">${otOpts}</select><button onclick="saveActualOT('${date}')" style="padding:8px 12px;background:#ef6c00;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700">${lang==="zh"?"儲存":"Simpan"}</button></div>
      <div style="display:flex;gap:5px;margin-top:6px"><button onclick="setActualOTQuick('${date}',0)" style="flex:1;padding:6px;border:1px solid #ffb74d;background:var(--card);border-radius:5px;font-size:10px">${lang==="zh"?"今天不加班 0h":"Tidak lembur 0h"}</button><button onclick="setActualOTQuick('${date}',${scheduled})" style="flex:1;padding:6px;border:1px solid #ffb74d;background:var(--card);border-radius:5px;font-size:10px">${lang==="zh"?"加班做滿 "+scheduled+"h":"Lembur penuh "+scheduled+"h"}</button></div>
    </div>`;
  }
  if(fbUser&&rule.isWork){
    html+=`<div style="margin:8px 0;padding:10px;background:var(--pri-l);border-radius:8px;border:1.5px dashed var(--pri)">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px">${lang==="zh"?"➕ 新增請假（只選正常工時）":"➕ Tambah Cuti (jam normal saja)"}</div>
      <select id="leaveTypeSel" onchange="updateLeaveTimeOptions('${date}')" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:6px">${getLeaveTypes().map(lt=>`<option value="${lt.id}" data-step="${lt.step}">${lang==="zh"?lt.name:lt.nameId}</option>`).join('')}</select>
      <div style="font-size:10px;color:var(--tx2);margin-bottom:5px">${lang==="zh"?`正常工時：${formatShiftOffset(rule,0)}–${formatShiftOffset(rule,rule.regularMinutes)}；後面的加班時段不列入請假。`:`Jam normal: ${formatShiftOffset(rule,0)}–${formatShiftOffset(rule,rule.regularMinutes)}.`}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px"><div><label style="font-size:10px;color:var(--tx2)">${lang==="zh"?"開始":"Mulai"}</label><select id="leaveStartSel" onchange="updateLeaveTimePreview('${date}')" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px"></select></div><div><label style="font-size:10px;color:var(--tx2)">${lang==="zh"?"結束":"Selesai"}</label><select id="leaveEndSel" onchange="updateLeaveTimePreview('${date}')" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px"></select></div></div>
      <div style="display:flex;gap:4px;margin-bottom:6px"><button onclick="setLeavePreset('${date}','full')" style="flex:1;padding:5px;border:1px solid var(--pri);background:var(--card);border-radius:5px;font-size:10px">${lang==="zh"?"全日 8h":"Penuh 8h"}</button><button onclick="setLeavePreset('${date}','first')" style="flex:1;padding:5px;border:1px solid var(--pri);background:var(--card);border-radius:5px;font-size:10px">${lang==="zh"?"前 4h":"4h awal"}</button><button onclick="setLeavePreset('${date}','last')" style="flex:1;padding:5px;border:1px solid var(--pri);background:var(--card);border-radius:5px;font-size:10px">${lang==="zh"?"後 4h":"4h akhir"}</button></div>
      <div id="leaveTimePreview" style="font-size:10px;font-weight:700;color:var(--pri);padding:6px 8px;background:var(--card);border-radius:5px;margin-bottom:6px"></div>
      <input type="text" id="leaveReasonIn" maxlength="50" placeholder="${lang==="zh"?"請假原因（選填，僅管理員可見）":"Alasan cuti (opsional, hanya admin lihat)"}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px;margin-bottom:6px;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-size:10px;color:var(--tx3);flex:1">${lang==="zh"?"🔒 薪資只扣正常工時；加班依上方另外計算":"🔒 Gaji normal dan lembur dihitung terpisah"}</span><button onclick="submitLeave('${date}')" style="padding:8px 18px;background:var(--pri);color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">${lang==="zh"?"確認":"OK"}</button></div>
    </div>`;
  }else if(fbUser&&!rule.isWork)html+=`<div style="margin:8px 0;padding:9px;background:var(--green-l);border-radius:7px;font-size:11px;color:var(--green)">${lang==="zh"?"此日為休假日，沒有正常工時，不建立請假紀錄。":"Hari libur, tidak perlu cuti."}</div>`;
  if(isAdmin()){
    const people=uniqueCount(leaves);
    html+=`<div class="admin-leave-edit"><label>👑 ${lang==="zh"?"管理員：手動設定請假人數":"Admin: Set jumlah cuti"}</label><div style="margin-top:4px;display:flex;align-items:center;gap:4px"><input type="number" id="adminLeaveN" min="0" value="${people}" placeholder="0"><button onclick="adminSetLeave('${date}')" style="background:var(--pri);color:#fff;border:none;padding:5px 12px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer">${lang==="zh"?"確認":"OK"}</button></div></div>`;
  }
  return html;
}
function adminSetLeave(date){
  if(!isAdmin())return Promise.resolve();
  const inp=document.getElementById("adminLeaveN");
  if(!inp)return Promise.resolve();
  const n=parseInt(inp.value)||0;
  const current=getLeaves(date);
  const adminEntries=current.filter(l=>String(l.uid||"").startsWith("admin_"));
  const realCount=new Set(current.filter(l=>!String(l.uid||"").startsWith("admin_")).map(l=>l.uid)).size;
  const need=n-realCount;
  if(need<0){alert(lang==="zh"?"已有 "+realCount+" 人實際請假，無法設低於此數":realCount+" orang sudah cuti, tidak bisa kurang");loadLeaves();return Promise.resolve();}
  return fsEnqueue(async()=>{
    // 先逐筆刪除舊的 admin entries
    for(const e of adminEntries){
      await fbDb.collection("leaves").doc(e.uid+"_"+date).delete();
      await new Promise(r=>setTimeout(r,40));
    }
    // 逐筆寫入新的
    for(let i=0;i<need;i++){
      const id="admin_"+i+"_"+date;
      await fbDb.collection("leaves").doc(id).set({
        uid:"admin_"+i,name:lang==="zh"?"員工":"Staff",date:date,ym:date.slice(0,7),
        type:"leave",leaveType:"admin",hours:0,unit:S.unit||"",
        ts:firebase.firestore.FieldValue.serverTimestamp()
      });
      await new Promise(r=>setTimeout(r,40));
    }
  },"adminSetLeave").then(()=>loadLeaves()).catch(e=>console.log("adminSetLeave err",e));
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
function _tideEventTs(item){
  if(!item||!item.time)return NaN;
  let raw=String(item.time).trim();
  if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(raw))raw=raw.replace(" ","T")+"+08:00";
  const ts=new Date(raw).getTime();return Number.isFinite(ts)?ts:NaN;
}
function tidePhaseInfo(atTs){
  if(!tideData||!Array.isArray(tideData.tides)||!tideData.tides.length)return null;
  const now=Number.isFinite(+atTs)?+atTs:Date.now();
  const evs=tideData.tides.map(x=>({item:x,ts:_tideEventTs(x)})).filter(x=>Number.isFinite(x.ts)).sort((a,b)=>a.ts-b.ts);
  if(!evs.length)return null;
  let prev=null,next=null,nearest=null;
  for(const ev of evs){
    if(ev.ts<=now)prev=ev;
    if(ev.ts>now){next=ev;break}
  }
  for(const ev of evs){if(!nearest||Math.abs(ev.ts-now)<Math.abs(nearest.ts-now))nearest=ev}
  const nearMin=nearest?Math.abs(nearest.ts-now)/60000:Infinity;
  let state="",key="",target=next||nearest;
  if(nearest&&nearMin<=25){
    key=nearest.item.type==="滿潮"?"high":"low";
    state=lang==="zh"?(key==="high"?"滿潮":"乾潮"):(key==="high"?"Pasang puncak":"Surut terendah");target=nearest;
  }else if(next){
    key=next.item.type==="滿潮"?"rising":"falling";
    state=lang==="zh"?(key==="rising"?"漲潮中":"退潮中"):(key==="rising"?"Air naik":"Air surut");
  }else{
    key=prev&&prev.item.type==="滿潮"?"falling":"rising";
    state=lang==="zh"?(key==="rising"?"漲潮中":"退潮中"):(key==="rising"?"Air naik":"Air surut");target=prev;
  }
  let progress=null;
  if(prev&&next&&next.ts>prev.ts)progress=Math.max(0,Math.min(1,(now-prev.ts)/(next.ts-prev.ts)));
  const mins=target?Math.max(0,Math.round(Math.abs(target.ts-now)/60000)):null;
  const duration=mins===null?"":(lang==="zh"?(mins>=60?`${Math.floor(mins/60)}小時${mins%60?mins%60+"分":""}`:`${mins}分鐘`):(mins>=60?`${Math.floor(mins/60)}j ${mins%60?mins%60+"m":""}`:`${mins}m`));
  const targetLabel=target?(lang==="zh"?(target.item.type==="滿潮"?"滿潮":"乾潮"):(target.item.type==="滿潮"?"pasang":"surut")):"";
  return {state,key,prev,next,target,progress,mins,duration,targetLabel};
}
function tideHtml(){
  if(tideErr)return"";
  if(wxData&&!tideData&&!tideErr)return`<div class="tide-card fi"><div class="tide-loading">🌊 ${lang==="zh"?"潮汐載入中...":"Memuat pasang surut..."}</div></div>`;
  if(!tideData||!tideData.tides||!tideData.tides.length)return"";
  const wk=t("wk"),phase=tidePhaseInfo();
  const byDate={};tideData.tides.forEach(t=>{if(!byDate[t.date])byDate[t.date]=[];byDate[t.date].push(t)});
  const dates=Object.keys(byDate).sort().slice(0,7);
  const phaseIcon=phase?(phase.key==="rising"?"↗":phase.key==="falling"?"↘":phase.key==="high"?"▲":"▼"):"≈";
  const target=phase&&phase.target;
  const targetTime=target&&target.item.time?target.item.time.slice(11,16):"--:--";
  const targetHeight=target&&Number.isFinite(+target.item.height)?`${target.item.height}cm`:"";
  const phaseDetail=phase&&target?(phase.key==="high"||phase.key==="low"?(lang==="zh"?`${phase.targetLabel}時刻附近 · ${targetTime} ${targetHeight}`:`Sekitar ${phase.targetLabel} · ${targetTime} ${targetHeight}`):(lang==="zh"?`距${phase.targetLabel}約 ${phase.duration} · ${targetTime} ${targetHeight}`:`Menuju ${phase.targetLabel} ${phase.duration} · ${targetTime} ${targetHeight}`)):"";
  const progress=phase&&phase.progress!==null?Math.round(phase.progress*100):50;
  const header=`<button class="tide-header" onclick="toggleTide();event.stopPropagation()"><span><b>🌊 ${esc(tideData.station)} ${lang==="zh"?"潮汐":"Pasut"}</b><small>${lang==="zh"?"中央氣象署潮位預報":"Prakiraan CWA"}</small></span><span class="tide-expand">${lang==="zh"?(tideCollapsed?"展開":"收合"):(tideCollapsed?"Buka":"Tutup")} ${tideCollapsed?"▾":"▴"}</span></button>`;
  const nowBlock=`<div class="tide-now tide-${phase?phase.key:"unknown"}" onclick="showTideDetail('${dates[0]||""}');event.stopPropagation()"><div class="tide-now-icon">${phaseIcon}</div><div class="tide-now-copy"><span>${lang==="zh"?"目前潮況":"Kondisi saat ini"}</span><strong>${phase?phase.state:(lang==="zh"?"資料計算中":"Menghitung")}</strong><small>${phaseDetail}</small></div><div class="tide-now-height">${targetHeight||"—"}<small>${lang==="zh"?"下一潮位":"Berikutnya"}</small></div><div class="tide-phase-track"><i style="width:${progress}%"></i></div></div>`;
  if(tideCollapsed)return`<div class="tide-card fi">${header}${nowBlock}</div>`;
  const fc=dates.map((date,i)=>{
    const dt=new Date(date+"T00:00:00+08:00"),dw=dt.getDay(),items=byDate[date];
    const hi=items.filter(x=>x.type==="滿潮").sort((a,b)=>b.height-a.height)[0];
    const lo=items.filter(x=>x.type==="乾潮").sort((a,b)=>a.height-b.height)[0];
    return`<button class="tide-day${i===0?' today':''}" onclick="showTideDetail('${date}');event.stopPropagation()"><div class="wx-day-name">${i===0?(lang==="zh"?"今天":"Hari ini"):wk[dw]}</div><div class="tide-extreme tide-high"><span>${lang==="zh"?"滿潮":"Pasang"}</span><b>${hi?hi.time.slice(11,16):"--:--"}</b><small>${hi?hi.height+"cm":"—"}</small></div><div class="tide-extreme tide-low"><span>${lang==="zh"?"乾潮":"Surut"}</span><b>${lo?lo.time.slice(11,16):"--:--"}</b><small>${lo?lo.height+"cm":"—"}</small></div></button>`;
  }).join("");
  return`<div class="tide-card fi">${header}${nowBlock}<div class="tide-fc" aria-label="${lang==="zh"?"七日潮汐":"Pasut tujuh hari"}">${fc}</div><div class="tide-footnote">${lang==="zh"?"點日期查看當日全部滿潮與乾潮":"Ketuk tanggal untuk detail"}</div></div>`;
}
let wxDetailShow=false,wxDetailDay=0,tideDetailShow=false,tideDetailDay=0;
let tideCollapsed=true;try{const v=localStorage.getItem("sb_tideCol");if(v==="0")tideCollapsed=false}catch(e){}
function toggleTide(){tideCollapsed=!tideCollapsed;try{localStorage.setItem("sb_tideCol",tideCollapsed?"1":"0")}catch(e){}render()}
function showWxDetail(){wxDetailShow=true;wxDetailDay=0;render()}
function showTideDetail(d){tideDetailShow=true;tideDetailDay=d||0;render()}
function closeWxDetail(){wxDetailShow=false;render()}
function closeTideDetail(){tideDetailShow=false;render()}

function wxDetailHtml(){
  if(!wxDetailShow||!wxData)return"";
  const isZh=lang==="zh",desc=isZh?WXZ:WXD;
  const day=wxData.days[wxDetailDay];if(!day)return"";
  const today=day.date,windowH=Number(wxData._popWindowH)||null;
  let rows="";
  for(let h=0;h<24;h++){
    const k=today+"T"+String(h).padStart(2,"0")+":00";
    const i=wxData.hTime.indexOf(k);if(i<0)continue;
    const tmp=wxData.hTemp&&Number.isFinite(Number(wxData.hTemp[i]))?Math.round(Number(wxData.hTemp[i])):"--";
    const pop=_normalPop(wxData.hPrec&&wxData.hPrec[i]);
    const src=_popSourceAt(wxData,i);
    const popBadge=src==='cwa'?(isZh?`官方${windowH?` ${windowH}h`:''}`:`CWA${windowH?` ${windowH}h`:''}`):(src==='open-meteo'?(isZh?'模式':'Model'):'');
    const prec=pop===null?'--':`<div class="wx-pop-value">${pop}%</div>${popBadge?`<div class="wx-pop-badge ${src==='cwa'?'official':'model'}">${popBadge}</div>`:''}`;
    const wind=wxData.hGust&&Number.isFinite(Number(wxData.hGust[i]))?Math.round(Number(wxData.hGust[i]))+"km/h":"--";
    const hum=wxData.hHum&&Number.isFinite(Number(wxData.hHum[i]))?Math.round(Number(wxData.hHum[i]))+"%":"--";
    const code=wxData.hCode?wxData.hCode[i]:0;
    rows+=`<div class="cell">${String(h).padStart(2,"0")}:00</div><div class="cell">${WXI[code]||""} ${tmp}°</div><div class="cell wx-pop-cell">${prec}</div><div class="cell">${wind}</div><div class="cell">${hum}</div>`;
  }
  const dayTabs=wxData.days.map((d,i)=>{const dt=new Date(d.date);return`<button onclick="wxDetailDay=${i};render();event.stopPropagation()" style="padding:4px 8px;border:none;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;${i===wxDetailDay?'background:var(--pri);color:#fff':'background:#eee;color:var(--tx2)'}">${i===0?(isZh?'今天':'Hari ini'):t('wk')[dt.getDay()]}</button>`}).join("");
  const hasCwa=Array.isArray(wxData.hPopSource)&&wxData.hPopSource.some((v,i)=>v==='cwa'&&String(wxData.hTime[i]||'').startsWith(today));
  const sourceNote=hasCwa
    ?(isZh?`降雨機率採中央氣象署鄉鎮預報原始${windowH?windowH+' 小時':'區間'}值；雨量站只顯示實況，不會改寫預報。`:`Rain probability uses original CWA interval values; station observations never overwrite the forecast.`)
    :(isZh?'本日 CWA 降雨機率暫無資料，暫用 Open-Meteo 模式備援；不與其他來源取最大值。':'CWA probability unavailable; Open-Meteo is used as a clearly marked fallback.');
  const place=(wxData.place&&wxData.place.display)||_gpsPlaceText();
  const updated=wxData.updatedAt?new Date(wxData.updatedAt).toLocaleString([], {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'--';
  return`<div class="wx-detail" onclick="closeWxDetail()"><div class="wx-detail-sheet" onclick="event.stopPropagation()"><div class="wx-detail-title">${isZh?'⛅ 逐時天氣與降雨區間':'⛅ Hourly weather & rain intervals'}</div>
    <div class="wx-source-panel"><div><b>${isZh?'位置':'Location'}：</b>${esc(place||'GPS')}</div><div><b>${isZh?'資料更新':'Updated'}：</b>${esc(updated)}</div><div class="wx-source-note">${sourceNote}</div></div>
    ${rainObsHtml()}
    <div style="display:flex;gap:4px;overflow-x:auto;margin-bottom:10px">${dayTabs}</div><div class="wx-detail-grid"><div class="hdr">${isZh?'時間':'Jam'}</div><div class="hdr">${isZh?'天氣':'Cuaca'}</div><div class="hdr">${isZh?'降雨區間':'Hujan'}</div><div class="hdr">${isZh?'陣風':'Gust'}</div><div class="hdr">${isZh?'濕度':'Humid'}</div>${rows}</div><button class="modal-done" onclick="closeWxDetail()" style="margin-top:12px">${t('done')}</button></div></div>`;
}

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
    <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:700;color:var(--tx)">🏭 ${isZh?"切換單位":"Ganti Unit"}</label><div style="display:flex;gap:6px;margin-top:6px"><select id="unitChg" style="flex:1;padding:8px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;font-weight:600"><option value="">${isZh?"-- 無 --":"-- None --"}</option>${isAdmin()?`<option value="__all"${S.unit==="__all"?" selected":""}>${isZh?"全部單位":"Semua Unit"}</option>`:""}
${getUnits().map(u=>`<option value="${esc(u)}"${S.unit===u?' selected':''}>${esc(u)}</option>`).join('')}</select><button data-a="chUnit" style="padding:8px 14px;background:var(--pri);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">${isZh?"確認":"OK"}</button></div></div>
    <button class="modal-done" data-a="closeH">${t("done")}</button>
    
    <button class="modal-done" data-a="reset" style="background:var(--red);margin-top:6px">${isZh?"⚠️ 重新設定班表":"⚠️ Reset Jadwal"}</button>
  </div></div></div>`}

function rW(sh,day){const c=cyc();for(let i=0;i<c.length;i++){if(c[i]!==sh)continue;let n=1;for(let j=i-1;j>=0;j--){if(c[j]===sh)n++;else break}if(n===day)return i}return 0}
function rO(nx,day){const c=cyc();for(let i=0;i<c.length;i++){if(c[i]!=="休")continue;let j=i;while(j<c.length&&c[j]==="休")j++;if(c[j%c.length]!==nx)continue;let n=1;for(let k=i-1;k>=0;k--){if(c[k]==="休")n++;else break}if(n===day)return i}return 0}

// ═══ LEAVE HELPERS ═══
function updateLeaveTimeOptions(date){
  const tSel=document.getElementById("leaveTypeSel"),sSel=document.getElementById("leaveStartSel"),eSel=document.getElementById("leaveEndSel");
  if(!tSel||!sSel||!eSel)return;
  const a=String(date||"").split("-").map(Number),rule=getShiftWorkRule(a[0],a[1],a[2]),lt=getLT(tSel.value),stepMin=Math.max(30,Math.round(((lt&&lt.step)||0.5)*60));
  let starts="",ends="";
  for(let off=0;off<rule.regularMinutes;off+=stepMin)starts+=`<option value="${off}">${formatShiftOffset(rule,off)}</option>`;
  for(let off=stepMin;off<=rule.regularMinutes;off+=stepMin)ends+=`<option value="${off}"${off===rule.regularMinutes?' selected':''}>${formatShiftOffset(rule,off)}</option>`;
  sSel.innerHTML=starts;eSel.innerHTML=ends;updateLeaveTimePreview(date);
}
function submitLeave(date){
  const tSel=document.getElementById("leaveTypeSel"),sSel=document.getElementById("leaveStartSel"),eSel=document.getElementById("leaveEndSel"),rIn=document.getElementById("leaveReasonIn"),otSel=document.getElementById("actualOtSel");
  if(!tSel||!sSel||!eSel)return;
  const a=date.split("-").map(Number),rule=getShiftWorkRule(a[0],a[1],a[2]);
  if(!rule.isWork)return alert(lang==="zh"?"休假日沒有正常工時，不需要請假。":"Hari libur tidak perlu cuti.");
  const st=+sSel.value,en=+eSel.value,lt=getLT(tSel.value),stepMin=Math.max(30,Math.round(((lt&&lt.step)||0.5)*60));
  if(!(en>st))return alert(lang==="zh"?"結束時間必須晚於開始時間。":"Waktu selesai harus sesudah mulai.");
  const mins=en-st;
  if(mins%stepMin!==0)return alert(lang==="zh"?"此假別須以 "+(stepMin/60)+" 小時為單位。":"Jenis cuti ini harus kelipatan "+(stepMin/60)+" jam.");
  const mine=myLeave(date);
  const overlap=mine.some(l=>hasPreciseLeaveTime(l)&&Math.max(st,+l.startOffset)<Math.min(en,+l.endOffset));
  if(overlap)return alert(lang==="zh"?"這個請假時段與既有紀錄重疊，請先修改或取消舊紀錄。":"Waktu cuti bertumpuk dengan data lama.");
  const legacyH=mine.filter(l=>!hasPreciseLeaveTime(l)).reduce((n,l)=>n+Math.max(0,+l.hours||0),0);
  if(legacyH>0&&legacyH+mins/60>rule.regularMinutes/60)return alert(lang==="zh"?"舊請假紀錄沒有時段，新增後會超過正常 8 小時。請先取消舊紀錄再重新輸入。":"Data lama tanpa waktu akan melebihi jam normal.");
  if(rule.overtimeMinutes>0&&otSel&&otSel.value==="")return alert(lang==="zh"?"請先選擇並儲存「當日實際加班時數」。加班不是請假，但會影響薪資。":"Pilih jam lembur aktual terlebih dahulu.");
  if(rule.overtimeMinutes>0&&otSel&&otSel.value!==""){OTD[date]=Math.max(0,Math.min(rule.overtimeMinutes/60,+otSel.value||0));sOTD()}
  const reason=rIn?rIn.value.trim():"";
  addLeave(date,tSel.value,mins/60,reason,{startOffset:st,endOffset:en,shiftStartMinute:rule.startMinute,shiftHours:rule.shiftHours,shiftCode:rule.shift});
}
function updateLeaveTimePreview(date){
  const sSel=document.getElementById("leaveStartSel"),eSel=document.getElementById("leaveEndSel"),box=document.getElementById("leaveTimePreview");
  if(!sSel||!eSel||!box)return;
  const a=String(date||"").split("-").map(Number),rule=getShiftWorkRule(a[0],a[1],a[2]),st=+sSel.value,en=+eSel.value,h=Math.max(0,en-st)/60;
  box.textContent=h>0?(lang==="zh"?`本次請假 ${h}h：${formatShiftOffset(rule,st)}–${formatShiftOffset(rule,en)}（只扣正常工時）`:`Cuti ${h}h: ${formatShiftOffset(rule,st)}–${formatShiftOffset(rule,en)}`):(lang==="zh"?"請選擇有效時段":"Pilih waktu yang benar");
}
function setLeavePreset(date,type){
  const sSel=document.getElementById("leaveStartSel"),eSel=document.getElementById("leaveEndSel");if(!sSel||!eSel)return;
  const a=date.split("-").map(Number),rule=getShiftWorkRule(a[0],a[1],a[2]),half=Math.min(240,rule.regularMinutes);
  if(type==="first"){sSel.value="0";eSel.value=String(half)}
  else if(type==="last"){sSel.value=String(Math.max(0,rule.regularMinutes-half));eSel.value=String(rule.regularMinutes)}
  else{sSel.value="0";eSel.value=String(rule.regularMinutes)}
  updateLeaveTimePreview(date);
}
function saveActualOT(date){
  const sel=document.getElementById("actualOtSel");if(!sel)return;
  const a=date.split("-").map(Number),rule=getShiftWorkRule(a[0],a[1],a[2]),max=rule.overtimeMinutes/60;
  if(sel.value==="")delete OTD[date];else OTD[date]=Math.max(0,Math.min(max,+sel.value||0));
  sOTD();render();
}
function setActualOTQuick(date,h){OTD[date]=Math.max(0,+h||0);sOTD();render()}
// 請假彈窗渲染後，由 render() 初始化起訖時間選單。
// ═══ ADMIN PANEL ═══
let showAdmin=false;
function adminPanelHtml(){
  if(!isAdmin()||!showAdmin)return"";
  const isZh=lang==="zh";
  let unitsHtml=APP_CFG.units.map((u,i)=>`<div style="display:flex;align-items:center;gap:6px;margin:3px 0;padding:4px 8px;background:var(--card);border-radius:6px"><span style="flex:1;font-size:12px">${esc(u)}</span><button onclick="adminDelUnit(${i})" style="background:var(--red);color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer">✕</button></div>`).join("");
  let ltHtml=APP_CFG.leaveTypes.map((lt,i)=>`<div style="display:flex;align-items:center;gap:6px;margin:3px 0;padding:4px 8px;background:var(--card);border-radius:6px;border-left:3px solid ${lt.color}"><span style="flex:1;font-size:12px">${esc(isZh?lt.name:lt.nameId)} (${lt.step}h)</span><button onclick="adminDelLT(${i})" style="background:var(--red);color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer">✕</button></div>`).join("");
  return`<div class="modal-bg" onclick="showAdmin=false;render()"><div class="modal-sheet help-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>
    <div class="modal-title">⚙️ ${isZh?"管理員後台":"Admin Panel"}</div>
    <div style="margin:12px 0"><h3 style="font-size:13px;margin-bottom:6px">🏭 ${isZh?"單位管理":"Unit Management"}</h3>${unitsHtml}
      <div style="display:flex;gap:4px;margin-top:6px"><input id="newUnit" placeholder="${isZh?"新增單位名稱":"Nama unit baru"}" style="flex:1;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px"><button onclick="adminAddUnit()" style="background:var(--pri);color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">+</button></div>
    </div>
    <div style="margin:12px 0;padding-top:12px;border-top:1px solid #eee"><h3 style="font-size:13px;margin-bottom:6px">📋 ${isZh?"假別管理":"Leave Type Management"}</h3>${ltHtml}
      <div style="margin-top:8px;padding:8px;background:#f8f8f8;border-radius:8px">
        <div style="display:flex;gap:4px;margin-bottom:4px"><input id="newLTName" placeholder="${isZh?"假別名稱(中)":"Nama cuti"}" style="flex:1;padding:5px;border:1px solid #ddd;border-radius:4px;font-size:11px"><input id="newLTNameId" placeholder="${isZh?"印尼文名":"Nama ID"}" style="flex:1;padding:5px;border:1px solid #ddd;border-radius:4px;font-size:11px"></div>
        <div style="display:flex;gap:4px;align-items:center"><label style="font-size:10px;white-space:nowrap">${isZh?"計算單位":"Step"}:</label><select id="newLTStep" style="padding:5px;border:1px solid #ddd;border-radius:4px;font-size:11px"><option value="0.5">0.5h</option><option value="1" selected>1h</option></select><label style="font-size:10px;white-space:nowrap">${isZh?"顏色":"Color"}:</label><input id="newLTColor" type="color" value="#607d8b" style="width:30px;height:26px;border:none;cursor:pointer"><button onclick="adminAddLT()" style="background:var(--pri);color:#fff;border:none;padding:5px 12px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">+</button></div>
      </div>
    </div>
    <button onclick="showAdmin=false;render()" class="modal-done" style="margin-top:10px">${isZh?"完成":"Done"}</button>
  </div></div>`;
}
function adminAddUnit(){const el=document.getElementById("newUnit");if(!el||!el.value.trim())return;APP_CFG.units.push(el.value.trim());saveAppConfig();render()}
function adminDelUnit(i){APP_CFG.units.splice(i,1);saveAppConfig();render()}
function adminAddLT(){
  const n=document.getElementById("newLTName"),ni=document.getElementById("newLTNameId"),s=document.getElementById("newLTStep"),c=document.getElementById("newLTColor");
  if(!n||!n.value.trim())return;
  const id=n.value.trim().toLowerCase().replace(/[^a-z0-9]/g,"_")||("lt_"+Date.now());
  APP_CFG.leaveTypes.push({id:id,name:n.value.trim(),nameId:ni?ni.value.trim()||n.value.trim():n.value.trim(),step:parseFloat(s?s.value:1),color:c?c.value:"#607d8b"});
  saveAppConfig();render();
}
function adminDelLT(i){APP_CFG.leaveTypes.splice(i,1);saveAppConfig();render()}

// ═══ MONTHLY REGULAR-WORK LEAVE HOURS ═══
function getMonthLeaveHours(y,m){
  let total=0;const dm=new Date(y,m,0).getDate(),uid=fbUser&&fbUser.uid,sh=rot()?rot().h:12;
  for(let d=1;d<=dm;d++)total+=summarizeRegularLeaveForDay(getPayrollLeaves(ek(y,m,d)),sh,uid).totalHours;
  return Math.round(total*100)/100;
}

function handle(e){
  const el=e.currentTarget,a=el.dataset.a;
  try{
  switch(a){
    case "pick":{if(S.lockedRt){alert(lang==="zh"?"輪班規則已被管理員鎖定":"Shift dikunci oleh admin");break}const ti=document.getElementById("alTI"),ui=document.getElementById("alUI");setAL(parseFloat(ti&&ti.value)||0,parseFloat(ui&&ui.value)||0);S.rt=el.dataset.k;S.step="wiz";S.wT=S.wS=S.wN=S.wD=null;break}
    case "wb":if(S.wD!==null)S.wD=null;else if(S.wS){S.wS=null;S.wT=null}else if(S.wN){S.wN=null;S.wT=null}else if(S.wT)S.wT=null;else{S.step="type";S.wT=null;S.wS=null;S.wN=null;S.wD=null}break;
    case "wt":{const ti=document.getElementById("alTI"),ui=document.getElementById("alUI");if(ti||ui)setAL(parseFloat(ti&&ti.value)||0,parseFloat(ui&&ui.value)||0);S.wT=el.dataset.v==="w"?"w":"o";S.wD=null;S.wS=null;S.wN=null;break}
    case "ws":S.wS=el.dataset.v;S.wD=null;break;
    case "wn":S.wN=el.dataset.v;S.wD=null;break;
    case "wizShift":S.wT="w";S.wS=el.dataset.v;S.wD=null;break;
    case "wizOff":{S.wT="o";S.wD=null;const sh=[...new Set(cyc().filter(x=>x!=="休"))];if(sh.length===1){S.wN=sh[0]}break}
    case "wwd":{S.wD=+el.dataset.v;const ci=rW(S.wS,S.wD),c=cyc(),todOff=dayOff(TY,TM,TD);S.pos=((ci-todOff%c.length)+c.length*1000)%c.length;S.step="cal";sv();break;}
    case "wod":{S.wD=+el.dataset.v;const ci=rO(S.wN,S.wD),c=cyc(),todOff=dayOff(TY,TM,TD);S.pos=((ci-todOff%c.length)+c.length*1000)%c.length;S.step="cal";sv();break;}
    case "tabToday":setUiTab("today");break;
    case "tabCalendar":setUiTab("calendar");break;
    case "tabPay":setUiTab("pay");break;
    case "tabWeather":setUiTab("weather");break;
    case "tabMore":setUiTab("more");break;
    case "prefs":openUserPrefs();return;
    case "openDate":S.yr=+el.dataset.y;S.mo=+el.dataset.m;S.modal={y:+el.dataset.y,m:+el.dataset.m,d:+el.dataset.d};loadLeaves();loadAdminEv();break;
    case "prev":if(S.mo===1){S.yr--;S.mo=12}else S.mo--;loadLeaves();loadAdminEv();break;
    case "next":if(S.mo===12){S.yr++;S.mo=1}else S.mo++;loadLeaves();loadAdminEv();break;
    case "today":S.yr=TY;S.mo=TM;loadLeaves();loadAdminEv();break;
    case "chUnit":{if(S.lockedUnit){alert(lang==="zh"?"單位已被管理員鎖定，無法更改":"Unit dikunci oleh admin");break}const sel=document.getElementById("unitChg");if(sel){S.unit=sel.value;sv();loadLeaves();render()}}break;
    case "reset":if(S.lockedRt){S.pos=null;S.step="wiz";S.wT=S.wS=S.wN=S.wD=null;break}S.step="type";S.rt="4on2off";S.pos=null;S.wT=S.wS=S.wN=S.wD=null;try{localStorage.removeItem("sb_c")}catch(e){}sCk("sb_c","",0);if(fbUser){fsEnqueue(()=>fbDb.collection("users").doc(fbUser.uid).update({rt:firebase.firestore.FieldValue.delete(),pos:firebase.firestore.FieldValue.delete(),ep:firebase.firestore.FieldValue.delete()}),"reset").catch(()=>{})}break;
    case "open":S.modal={y:S.yr,m:S.mo,d:+el.dataset.d};break;
    case "close":S.modal=null;break;
    case "lunar":S.showLunar=!S.showLunar;try{localStorage.setItem("sb_lunar",S.showLunar?"1":"0")}catch(e){}if(S.showLunar&&typeof loadYiji==="function")loadYiji();break;
    case "almToday":S.modal={y:TY,m:TM,d:TD};break;
    case "help":S.showH=true;break;
    case "sfx":WxSfx.initAudio();WxSfx.toggle();return;
    case "share":shareCalendar();return;
    case "stats":S.showStats=true;S.statsYr=TY;break;
    case "closeStats":S.showStats=false;break;
    case "leavesOv":{
      if(!isAdmin()){alert(lang==="zh"?"僅管理員可見":"Admin only");break}
      S.showLeavesOv=true;
      if(!leavesOvYM){const now=new Date();leavesOvYM=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");}
      loadLeavesOvData(leavesOvYM);
      break;
    }
    case "closeLeavesOv":S.showLeavesOv=false;break;

    case "salOpen":S.showSal=true;break;
    case "salClose":S.showSal=false;break;
    case "salReset":{
      if(!confirm(lang==="zh"?"確定清除所有薪資設定？此動作無法復原。":"Hapus semua data gaji?"))return;
      SAL=Object.assign({},SAL_DEFAULT);sSAL();S.showSal=false;break;
    }
    case "salSave":{
      const g=id=>{const el=document.getElementById(id);return el?parseFloat(el.value)||0:0};
      SAL.base=g("sal_base");SAL.meal=g("sal_meal");SAL.transport=g("sal_transport");SAL.position=g("sal_position");SAL.night=g("sal_night");
      SAL.union=g("sal_union");SAL.welfare=g("sal_welfare");SAL.laborIns=g("sal_laborIns");SAL.healthIns=g("sal_healthIns");SAL.otherDed=g("sal_otherDed");
      SAL.laborPensionWage=g("sal_laborPensionWage");SAL.laborPensionSelfRate=g("sal_laborPensionSelfRate");SAL.laborPensionEmployerRate=g("sal_laborPensionEmployerRate");
      SAL.otTier1Rate=g("sal_otTier1Rate")||1.33340;SAL.otTier2Rate=g("sal_otTier2Rate")||1.66670;SAL.otTaxFreeH=g("sal_otTaxFreeH")||46.6666667;
      SAL.sickRate=g("sal_sickRate");SAL.personalRate=g("sal_personalRate");
      setSalPeriod(S.yr,S.mo,{
        nightCountOverride:g("sal_nightCountOverride"),nightTotalOverride:g("sal_nightTotalOverride"),
        proposal:g("sal_proposal"),otherIncome:g("sal_otherIncome"),otHoursOverride:g("sal_otHoursOverride")
      });
      normalizeSal();
      if(!SAL.base){alert(lang==="zh"?"職能俸為必填欄位":"Gaji pokok wajib diisi");return}
      SAL.enabled=true;sSAL();S.showSal=false;break;
    }

    case "closeH":S.showH=false;break;
    case "lzh":lang="zh";try{localStorage.setItem("sb_l",lang)}catch(e){}sCk("sb_l",lang,3650);_scheduleCloudSave();break;
    case "lid":lang="id";try{localStorage.setItem("sb_l",lang)}catch(e){}sCk("sb_l",lang,3650);_scheduleCloudSave();break;
    case "lang":lang=lang==="zh"?"id":"zh";try{localStorage.setItem("sb_l",lang)}catch(e){}sCk("sb_l",lang,3650);_scheduleCloudSave();break;
    case "tev":{const{y,m,d}=S.modal;const k=ek(y,m,d),eid=el.dataset.eid;if(!EVS[k])EVS[k]=[];const i=EVS[k].indexOf(eid);if(i>=0){EVS[k].splice(i,1);if(eid==="annualL")delete ALD[k];if(eid==="typhoon"){delete TYD[k];sTYD()}if(eid==="custom"){delete NOTES[k];sNotes()}}else{EVS[k].push(eid);if(eid==="annualL"&&!ALD[k])ALD[k]=4;if(eid==="typhoon"&&!TYD[k]){TYD[k]=12;sTYD()}}if(!EVS[k].length)delete EVS[k];sEv();sAL();break}
    case "alh":{const{y,m,d}=S.modal;const sel=document.getElementById("alSel");if(sel)ALD[ek(y,m,d)]=parseFloat(sel.value);sAL();return}
    case "tyh":{const{y,m,d}=S.modal;const sel=document.getElementById("tySel");if(sel)TYD[ek(y,m,d)]=parseFloat(sel.value);sTYD();return}
    case "inst":if(DP){DP.prompt();DP.userChoice.then(()=>{DP=null;render()})}break;
    case "hideI":S.instH=true;break;
    case "alEdit":{
      const cur=getAL();
      const yRange=alYRange(curALY());
      const isZh=lang==="zh";
      const totalPrompt=isZh?`設定 ${yRange} 特休總時數：\n（重設後剩餘 = 輸入的數字）`:`Total jam cuti ${yRange}:`;
      const tIn=prompt(totalPrompt,cur.total||"");
      if(tIn===null)return;
      const total=parseFloat(tIn);
      if(isNaN(total)||total<0){alert(isZh?"請輸入有效數字":"Masukkan angka valid");return}
      const ay=curALY(),start=`${ay}-12-26`,end=`${ay+1}-12-25`;
      for(const k in ALD){if(k>=start&&k<=end)delete ALD[k]}
      AL_RESET_TS[ay]=Date.now();
      try{localStorage.setItem("sb_al_reset",JSON.stringify(AL_RESET_TS))}catch(e){}
      setAL(total,0);
      return;
    }
    case "wxR":wxErr=false;wxData=null;try{localStorage.removeItem('_wxPos')}catch(e){}render();loadWx({force:true});return;
  }
  render();
  }catch(err){
    console.log("handle err ["+a+"]",err);
    try{render()}catch(e2){}
    alert((lang==="zh"?"操作失敗：":"Error: ")+(err&&err.message||"unknown"));
  }
}
let wxData=null,wxErr=false;
try{render();}catch(e){document.getElementById("app").innerHTML="<div style='padding:20px;color:red;font-size:14px;word-break:break-all'><b>ERROR:</b><br>"+e.message+"</div>";}
// ═══ SWIPE GESTURE ═══
(function(){
  let sx=0,sy=0,swiping=false;
  document.addEventListener("touchstart",e=>{
    try{
      if(S.step!=="cal"||UI_TAB!=="calendar"||S.modal||S.showH||S.showStats||S.showSal||S.showLeavesOv||wxDetailShow||tideDetailShow)return;
      if(!e.touches||!e.touches[0])return;
      sx=e.touches[0].clientX;sy=e.touches[0].clientY;swiping=true;
    }catch(err){swiping=false}
  },{passive:true});
  document.addEventListener("touchend",e=>{
    try{
      if(!swiping)return;swiping=false;
      if(!e.changedTouches||!e.changedTouches[0])return;
      const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
      if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*0.7)return;
      if(dx<0){if(S.mo===12){S.yr++;S.mo=1}else S.mo++;loadLeaves();loadAdminEv();render()}
      else{if(S.mo===1){S.yr--;S.mo=12}else S.mo--;loadLeaves();loadAdminEv();render()}
    }catch(err){swiping=false}
  },{passive:true});
})();







// ═══ WEATHER ═══
const WXI={0:"☀️",1:"🌤",2:"⛅",3:"☁️",45:"🌫",48:"🌫",51:"🌦",53:"🌧",55:"🌧",61:"🌧",63:"🌧️",65:"🌧️",71:"🌨",73:"🌨",75:"❄️",80:"🌦",81:"🌧",82:"⛈",95:"⛈"};
const WXZ={0:"晴天",1:"大致晴",2:"局部多雲",3:"多雲",45:"霧",48:"霧",51:"小雨",53:"中雨",55:"大雨",61:"小雨",63:"中雨",65:"大雨",71:"小雪",73:"中雪",75:"大雪",80:"陣雨",81:"陣雨",82:"暴雨",95:"雷雨"};
const WXD={0:"Cerah",1:"Cerah",2:"Berawan",3:"Mendung",45:"Kabut",48:"Kabut",51:"Gerimis",53:"Hujan",55:"Hujan Lebat",61:"Hujan",63:"Hujan",65:"Hujan Lebat",71:"Salju",80:"Hujan",81:"Hujan",82:"Badai",95:"Petir"};
let tideData=null,tideErr=false;
// ── 定位狀態（給 UI 顯示用）──
let geoState={status:'unknown',code:null,msg:'',source:'',accuracy:null,ts:0}; // status: unknown|locating|ok|fallback|denied
let wxPlace=null; // GPS 反查所在地：{county,town,display,source,lat,lon,ts}
const WX_POS_MAX_AGE_MS=30*60*1000;   // 位置快取最多 30 分鐘；避免人在移動後仍抓舊格點
const WX_PLACE_MAX_AGE_MS=30*60*1000; // 所在地反查快取最多 30 分鐘；與 GPS 位置同壽命
const WX_CACHE_MAX_AGE_MS=20*60*1000;  // 天氣快取最多 20 分鐘；app 開著時會盡量取新資料，舊資料避免誤導
const WX_API_TIMEOUT_MS=12000;
const WX_REVERSE_TIMEOUT_MS=4500;

function _nNum(v){v=parseFloat(v);return Number.isFinite(v)?v:null}
function _geoDistKm(lat1,lon1,lat2,lon2){
  lat1=_nNum(lat1);lon1=_nNum(lon1);lat2=_nNum(lat2);lon2=_nNum(lon2);
  if(lat1===null||lon1===null||lat2===null||lon2===null)return null;
  const R=6371,toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function _twNameVariants(s){
  s=String(s||'').trim();
  if(!s)return[];
  const out=[s];
  if(s.indexOf('臺')>=0)out.push(s.replace(/臺/g,'台'));
  if(s.indexOf('台')>=0)out.push(s.replace(/台/g,'臺'));
  return [...new Set(out.filter(Boolean))];
}
const TW_COUNTY_SET=new Set('基隆市,臺北市,台北市,新北市,桃園市,新竹市,新竹縣,苗栗縣,臺中市,台中市,彰化縣,南投縣,雲林縣,嘉義市,嘉義縣,臺南市,台南市,高雄市,屏東縣,臺東縣,台東縣,花蓮縣,宜蘭縣,澎湖縣,金門縣,連江縣'.split(','));
function _isCountryOrBroadArea(s){
  s=String(s||'').trim();
  return !s||/^(臺灣|台灣|中華民國|Taiwan|Taiwan Province|Republic of China|ROC)$/i.test(s)||/^(全臺|全台|全國|北部|中部|南部|東部|離島)$/.test(s);
}
function _isValidTwCounty(s){
  s=_cleanTwAreaName(s);
  return !!s&&!_isCountryOrBroadArea(s)&&TW_COUNTY_SET.has(s);
}
function _isValidTwTown(s){
  s=_cleanTwAreaName(s);
  return !!s&&!_isCountryOrBroadArea(s)&&/[區鄉鎮市]$/.test(s)&&!TW_COUNTY_SET.has(s);
}
function _pickValidCounty(){
  for(const v of arguments){const c=_cleanTwAreaName(v);if(_isValidTwCounty(c))return c}
  return '';
}
function _pickValidTown(){
  for(const v of arguments){const t=_cleanTwAreaName(v);if(_isValidTwTown(t))return t}
  return '';
}
function _cleanTwAreaName(s){
  s=String(s||'').trim();
  if(!s)return'';
  const map={
    'Taipei City':'臺北市','New Taipei City':'新北市','Taoyuan City':'桃園市','Taichung City':'臺中市','Tainan City':'臺南市','Kaohsiung City':'高雄市',
    'Keelung City':'基隆市','Hsinchu City':'新竹市','Chiayi City':'嘉義市','Hsinchu County':'新竹縣','Miaoli County':'苗栗縣','Changhua County':'彰化縣','Nantou County':'南投縣','Yunlin County':'雲林縣','Chiayi County':'嘉義縣','Pingtung County':'屏東縣','Yilan County':'宜蘭縣','Hualien County':'花蓮縣','Taitung County':'臺東縣','Penghu County':'澎湖縣','Kinmen County':'金門縣','Lienchiang County':'連江縣',
    'Taiwan':'','Taiwan Province':'','Republic of China':'','ROC':'','臺灣':'','台灣':'','臺灣省':'','台灣省':''
  };
  if(map[s]!==undefined)return map[s];
  s=s.replace(/^台灣省/,'').replace(/^臺灣省/,'').replace(/^Taiwan Province/i,'').trim();
  if(_isCountryOrBroadArea(s))return'';
  return s;
}
function _extractGpsPlaceFromAddress(addr){
  addr=addr||{};
  // 嚴格只接受台灣縣市 + 鄉鎮市區；絕不把「臺灣 / 台灣 / 南部 / 全臺」當所在地。
  const county=_pickValidCounty(addr.county,addr.city,addr.state_district,addr.state);
  let town=_pickValidTown(addr.city_district,addr.town,addr.suburb,addr.village,addr.municipality,addr.district,addr.quarter);
  if(town===county)town='';
  return {county,town};
}
async function reverseGeocodeGps(lat,lon,force){
  lat=_nNum(lat);lon=_nNum(lon);
  if(lat===null||lon===null)return null;
  if(!force){
    try{
      const c=JSON.parse(localStorage.getItem('_wxPlace'));
      const d=c&&_geoDistKm(lat,lon,c.lat,c.lon);
      if(c&&c.county&&c.ts&&(Date.now()-c.ts)<WX_PLACE_MAX_AGE_MS&&d!==null&&d<2&&(_isValidTwCounty(c.county)||_isValidTwTown(c.town))){wxPlace=c;return c}
    }catch(e){}
  }
  // 完全以 GPS 經緯度反查目前行政區；反查失敗時不使用鹽水或任何固定地點頂替。
  const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1&accept-language=zh-TW`;
  try{
    const resp=await Promise.race([fetch(url,{cache:'no-store'}),new Promise((_,r)=>setTimeout(()=>r(new Error('reverse-timeout')),WX_REVERSE_TIMEOUT_MS))]);
    if(!resp.ok)throw new Error('reverse '+resp.status);
    const data=await resp.json();
    const a=data&&data.address||{};
    const place=_extractGpsPlaceFromAddress(a);
    if(!place.county&&!place.town)return null;
    const out={county:place.county||'',town:place.town||'',display:[place.county,place.town].filter(Boolean).join(' '),source:'gps-reverse',lat,lon,ts:Date.now()};
    try{localStorage.setItem('_wxPlace',JSON.stringify(out))}catch(e){}
    wxPlace=out;
    return out;
  }catch(e){
    try{
      const u2=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=zh`;
      const r2=await Promise.race([fetch(u2,{cache:'no-store'}),new Promise((_,r)=>setTimeout(()=>r(new Error('reverse2-timeout')),WX_REVERSE_TIMEOUT_MS))]);
      if(r2.ok){
        const d2=await r2.json();
        const admin=d2.localityInfo&&d2.localityInfo.administrative||[];
        const pick=admin.find(x=>/區|鎮|鄉|District|Township/i.test(x.description||''));
        const county=_pickValidCounty(d2.principalSubdivision,d2.city,d2.localityInfo?.administrative?.find(x=>/縣|市|County|City/i.test(x.description||''))?.name);
        const town=_pickValidTown(d2.locality,pick&&pick.name);
        if(county||town){
          const out={county:county||'',town:town&&town!==county?town:'',display:[county,town&&town!==county?town:''].filter(Boolean).join(' '),source:'gps-reverse-bdc',lat,lon,ts:Date.now()};
          try{localStorage.setItem('_wxPlace',JSON.stringify(out))}catch(e2){}
          wxPlace=out;
          return out;
        }
      }
    }catch(e2){}
    wxPlace=null;
    return null;
  }
}
function _currentGpsPlace(){return wxPlace||(wxData&&wxData.place)||null}
function _gpsPlaceKeys(){
  const p=_currentGpsPlace();
  if(!p)return[];
  const county=_isValidTwCounty(p.county)?_cleanTwAreaName(p.county):'';
  const town=_isValidTwTown(p.town)?_cleanTwAreaName(p.town):'';
  if(!county&&!town)return[];
  const keys=[];
  if(county)_twNameVariants(county).forEach(x=>keys.push(x));
  if(town)_twNameVariants(town).forEach(x=>keys.push(x));
  if(county&&town){
    _twNameVariants(county+town).forEach(x=>keys.push(x));
    _twNameVariants(county+' '+town).forEach(x=>keys.push(x));
  }
  return [...new Set(keys.filter(k=>k&&!_isCountryOrBroadArea(k)))];
}
function _gpsPlaceText(){const p=_currentGpsPlace();if(!p)return'';const county=_isValidTwCounty(p.county)?_cleanTwAreaName(p.county):'';const town=_isValidTwTown(p.town)?_cleanTwAreaName(p.town):'';return [county,town].filter(Boolean).join(' ')}

// ── 官方標準定位：Permissions API 查狀態 → getCurrentPosition → 完整錯誤碼處理 ──
// opts.force=true 時：強制高精度、禁止使用系統位置快取（用於「重新抓取」）
// 回傳 {lat,lon,fresh,accuracy} 或 null（失敗）
async function getGeoPosition(opts){
  opts=opts||{};
  const force=!!opts.force;
  if(!('geolocation' in navigator)){geoState={status:'fallback',code:null,msg:'此裝置不支援定位',source:'unsupported',accuracy:null,ts:Date.now()};return null}
  let permState='prompt';
  try{
    if(navigator.permissions&&navigator.permissions.query){
      const ps=await navigator.permissions.query({name:'geolocation'});
      permState=ps.state; // granted | denied | prompt
    }
  }catch(e){}
  if(permState==='denied'){
    geoState={status:'denied',code:1,msg:lang==='zh'?'定位權限被拒絕':'Location denied',source:'permission',accuracy:null,ts:Date.now()};
    return null;
  }
  geoState={status:'locating',code:null,msg:'',source:force?'gps-force':'gps',accuracy:null,ts:Date.now()};
  try{
    const pos=await new Promise((ok,no)=>{
      navigator.geolocation.getCurrentPosition(ok,no,{
        enableHighAccuracy:force||permState==='granted',
        timeout:force?25000:(permState==='granted'?18000:12000),
        maximumAge:force?0:WX_POS_MAX_AGE_MS
      });
    });
    const lat=Number(pos.coords.latitude).toFixed(5);
    const lon=Number(pos.coords.longitude).toFixed(5);
    const accuracy=Number.isFinite(pos.coords.accuracy)?Math.round(pos.coords.accuracy):null;
    geoState={status:'ok',code:null,msg:'',source:force?'gps-force':'gps',accuracy:accuracy,ts:Date.now()};
    return {lat,lon,fresh:true,accuracy};
  }catch(err){
    // 官方錯誤碼：1=PERMISSION_DENIED 2=POSITION_UNAVAILABLE 3=TIMEOUT
    const code=err&&err.code;
    let msg='';
    if(code===1)msg=lang==='zh'?'定位權限被拒絕':'Location denied';
    else if(code===2)msg=lang==='zh'?'目前無法取得位置':'Position unavailable';
    else if(code===3)msg=lang==='zh'?'定位逾時':'Location timeout';
    else msg=lang==='zh'?'定位失敗':'Location failed';
    geoState={status:code===1?'denied':'fallback',code:code,msg:msg,source:'error',accuracy:null,ts:Date.now()};
    return null;
  }
}

function _nowHourKey(){
  const n=new Date();
  return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0")+"T"+String(n.getHours()).padStart(2,"0");
}

function _wxHourIndex(){
  if(!wxData||!wxData.hTime)return -1;
  const nh=_nowHourKey();
  return wxData.hTime.findIndex(t=>String(t).startsWith(nh));
}

// ═══ v205：中央氣象署官方鄉鎮降雨機率覆蓋 ═══
// 治本說明：Open-Meteo 的 precipitation_probability 來自 GFS 系集模式（約 25km 網格），
// 算法是「系集成員中該小時降雨 >0.1mm 的比例 ×100」。台灣夏季對流旺、地形破碎，
// 25km 格內幾乎總有成員報雨 → 機率被系統性高估（截圖的 94~100%）。
// CWA 鄉鎮預報是針對單一鄉鎮校準過的官方機率，與手機內建天氣一致。
// 這裡只把「逐時降雨機率 hPrec / 天氣圖示碼 hCode / 目前圖示 code」換成 CWA；
// 溫度、陣風、濕度仍用 Open-Meteo（這些本來就跟手機差不多）。
// 國外或 GPS 反查不到台灣縣市鄉鎮時，完全不覆蓋，維持 Open-Meteo。
const CWA_FCST_URL='https://cwa-forecast.onerkk.workers.dev'; // CWA 鄉鎮預報 worker（內含你的 CWA 授權碼）

async function _fetchCwaForecast(lat,lon,place,force){
  try{
    const u=new URL(CWA_FCST_URL);
    u.searchParams.set('lat',lat);
    u.searchParams.set('lon',lon);
    if(place&&place.county)u.searchParams.set('county',place.county);
    if(place&&place.town)u.searchParams.set('town',place.town);
    if(force)u.searchParams.set('_',String(Date.now()));
    const resp=await Promise.race([
      fetch(u.toString(),{cache:'no-store'}),
      new Promise((_,r)=>setTimeout(()=>r(new Error('cwa-fcst-timeout')),7000))
    ]);
    if(!resp.ok)return null;
    const d=await resp.json();
    if(d&&d.ok&&d.hourly&&typeof d.hourly==='object')return d;
    return null;
  }catch(e){return null}
}

// ═══ v220：降雨機率資料分層（官方預報與即時觀測完全分離）═══
// 原則：
// 1. hPrec 只代表「預報機率」；台灣地區優先採 CWA 鄉鎮預報原始值。
// 2. CWA 缺值的小時才回退 Open-Meteo；不取兩者最大值，也不以預估雨量強制灌高機率。
// 3. 雨量站只描述「現在附近是否有雨」，不得修改未來 1～2 小時的預報機率。
// 4. hPrecModel / hPopCwa / hPopSource 保留來源，可在 UI 與警報中清楚標示。
function _normalPop(v){
  if(v===null||v===undefined||v==='')return null;
  v=Number(v);
  return Number.isFinite(v)&&v>=0&&v<=100?Math.round(v):null;
}
function _rebuildForecastPop(wx){
  if(!wx||!Array.isArray(wx.hTime)||!wx.hTime.length)return false;
  const n=wx.hTime.length;
  const cwa=Array.isArray(wx.hPopCwa)?wx.hPopCwa:[];
  const model=Array.isArray(wx.hPrecModel)?wx.hPrecModel:(Array.isArray(wx.hPrec)?wx.hPrec:[]);
  const out=new Array(n),src=new Array(n);let cwaHits=0,modelHits=0;
  for(let i=0;i<n;i++){
    const cp=_normalPop(cwa[i]);
    const mp=_normalPop(model[i]);
    if(cp!==null){out[i]=cp;src[i]='cwa';cwaHits++;}
    else if(mp!==null){out[i]=mp;src[i]='open-meteo';modelHits++;}
    else{out[i]=null;src[i]='none';}
  }
  wx.hPrec=out;
  wx.hPopSource=src;
  wx._popSource=cwaHits>0?(modelHits>0?'cwa-mixed':'cwa'):'open-meteo';
  wx._cwaPopHours=cwaHits;
  return cwaHits>0;
}
// 保留舊函式名稱，讓既有呼叫點與除錯工具不失效；實際只做來源選擇，不做任何「即時上修」。
function _recomputeEffectivePop(){return _rebuildForecastPop(wxData)}
function _popSourceAt(wx,i){
  if(wx&&Array.isArray(wx.hPopSource)&&wx.hPopSource[i])return wx.hPopSource[i];
  return wx&&wx._popSource&&String(wx._popSource).startsWith('cwa')?'cwa':'open-meteo';
}
function _popSourceLabel(src,isZh){
  if(src==='cwa')return isZh?'中央氣象署鄉鎮預報':'CWA township forecast';
  if(src==='open-meteo')return isZh?'Open-Meteo 模式備援':'Open-Meteo model fallback';
  return isZh?'無資料':'No data';
}
try{window._recomputeEffectivePop=_recomputeEffectivePop;window._rebuildForecastPop=_rebuildForecastPop}catch(e){}

function _mergeCwaForecast(wx,fc){
  if(!wx||!Array.isArray(wx.hTime)||!fc||!fc.hourly)return false;
  const H=fc.hourly;let hit=0;
  if(!Array.isArray(wx.hPrecModel))wx.hPrecModel=Array.isArray(wx.hPrec)?wx.hPrec.slice():[];
  if(!Array.isArray(wx.hCodeModel))wx.hCodeModel=Array.isArray(wx.hCode)?wx.hCode.slice():[];
  wx.hPopCwa=new Array(wx.hTime.length).fill(null);
  wx.hPopCwaMeta=new Array(wx.hTime.length).fill(null);
  for(let i=0;i<wx.hTime.length;i++){
    const k=String(wx.hTime[i]).slice(0,13);
    const c=H[k];if(!c)continue;
    const pop=_normalPop(c.pop);
    if(pop!==null){
      wx.hPopCwa[i]=pop;hit++;
      wx.hPopCwaMeta[i]={
        start:c.start||c.startTime||c.dataTime||null,
        end:c.end||c.endTime||null,
        windowHours:Number(c.windowHours||fc.popWindowHours)||null
      };
    }
    const wmo=Number(c.wmo);
    if(Number.isFinite(wmo)&&Array.isArray(wx.hCode))wx.hCode[i]=wmo;
  }
  wx._popWindowH=Number(fc.popWindowHours)||null;
  wx._cwaForecastReceivedAt=Date.now();
  wx._cwaForecastUpdatedAt=fc.updatedAt||fc.updateTime||fc.generatedAt||fc.issueTime||null;
  wx._cwaForecastPlace=fc.place||fc.location||null;
  wx._cwaForecastOk=hit>0;
  _rebuildForecastPop(wx);
  if(hit>0){
    // 目前圖示採 CWA 所在區間的官方天氣現象；降雨實況仍由雨量站獨立呈現。
    const hi=_wxHourIndex();
    if(hi>=0&&Array.isArray(wx.hCode)&&Number.isFinite(Number(wx.hCode[hi])))wx.code=Number(wx.hCode[hi]);
  }
  return hit>0;
}

async function _applyCwaPop(wx,lat,lon,place,force){
  // 只在台灣（有縣市或鄉鎮反查結果）才覆蓋；國外或反查失敗 → 維持 Open-Meteo
  const inTW=place&&(place.county||place.town);
  if(!inTW)return false;
  const fc=await _fetchCwaForecast(lat,lon,place,force);
  if(!fc)return false;
  return _mergeCwaForecast(wx,fc);
}
try{window._applyCwaPop=_applyCwaPop}catch(e){}

// 將「預報＋即時雨量站＋官方警特報」同步到前景天氣動畫。
// 原本動畫只在 Open-Meteo 完成時更新；CWA 資料稍後到達後雖會把降雨機率上修並顯示豪雨橫幅，
// 卻沒有重新呼叫 WxFx.update，造成畫面已有 100% / 豪雨特報但動畫仍停在晴天或夜空模式。
function _syncWeatherFx(){
  try{
    const fx=window.WxFx;
    if(!fx||typeof fx.update!=='function')return;
    if(!wxData){fx.update(null,0,0,0);return}

    // 先找目前小時；若 API 小時字串因時區或更新延遲沒有完全對上，改抓距離現在最近的逐時資料。
    let hi=_wxHourIndex();
    if(hi<0&&Array.isArray(wxData.hTime)&&wxData.hTime.length){
      const now=Date.now();let best=-1,bestDiff=Infinity;
      for(let i=0;i<wxData.hTime.length;i++){
        const ts=Date.parse(String(wxData.hTime[i]));
        if(!Number.isFinite(ts))continue;
        const diff=Math.abs(ts-now);
        if(diff<bestDiff){bestDiff=diff;best=i}
      }
      if(best>=0&&bestDiff<=3*60*60*1000)hi=best;
    }

    const rainCodes=[51,53,55,56,61,63,65,66,67,80,81,82,95,96,99];
    let curPrec=0,curWind=0,actualRain=Math.max(0,Number(wxData.currentPrecip)||0);
    let code=Number(wxData.code);
    if(hi>=0){
      curPrec=Number(wxData.hPrec&&wxData.hPrec[hi])||0;
      curWind=Number(wxData.hWind&&wxData.hWind[hi])||0;
      actualRain=Math.max(actualRain,Number(wxData.hRain&&wxData.hRain[hi])||0);
      // current.weather_code 有時比逐時資料晚更新；動畫優先使用目前小時的 hCode。
      const hourlyCode=Number(wxData.hCode&&wxData.hCode[hi]);
      if(Number.isFinite(hourlyCode))code=hourlyCode;
    }
    if(!Number.isFinite(code))code=null;

    // 同時看目前與下一小時，避免 04:59/05:00 邊界剛好抓不到正在發生的降雨。
    let nearPrec=curPrec,nearRain=actualRain;
    if(hi>=0){
      for(let i=hi;i<Math.min(hi+2,(wxData.hTime||[]).length);i++){
        nearPrec=Math.max(nearPrec,Number(wxData.hPrec&&wxData.hPrec[i])||0);
        nearRain=Math.max(nearRain,Number(wxData.hRain&&wxData.hRain[i])||0);
      }
    }

    let obsRain=0;
    try{
      const m=(typeof _rainObsMeta==='function')?_rainObsMeta():null;
      if(m&&m.local){obsRain=Math.max(Number(m.r10)||0,Number(m.r1)||0);}
    }catch(e){}

    const codeSaysRain=rainCodes.includes(code);
    // 「現在下雨」只由目前天氣碼、目前降水量或可信本地雨量站判斷；預報機率不冒充實況。
    const rainNow=codeSaysRain||actualRain>0.05||obsRain>0;
    const rainNear=rainNow||nearRain>0.05||nearPrec>=60;

    // 官方警特報、模型高降雨提醒與即時資料要共同驅動動畫；不能只有警報卡更新，畫面仍停在星空。
    let ids=new Set();
    try{
      if(typeof evaluateWxAlerts==='function')ids=new Set(evaluateWxAlerts().map(a=>a&&a.id).filter(Boolean));
    }catch(e){}
    if(ids.has('storm')&&(rainNear||codeSaysRain)) code=95;
    else if((ids.has('heavyRain')||ids.has('heavyRainModel'))&&rainNear) code=65;
    else if(ids.has('rain')&&rainNear&&!rainCodes.includes(code)) code=61;

    // 即時或目前小時已有降雨證據時，多雲/晴天碼不得把雨特效關掉。
    if(rainNow&&!rainCodes.includes(code)){
      code=(actualRain>=4||obsRain>=4||nearRain>=4||nearPrec>=85)?65:61;
    }
    fx.update(code,Number(wxData.temp)||0,Math.max(curPrec,rainNow?40:0),curWind);
  }catch(e){console.log('sync weather fx err',e)}
}
try{window._syncWeatherFx=_syncWeatherFx}catch(e){}

async function loadWx(arg,retries){
  let force=false;
  if(typeof arg==='number'){retries=arg;}
  else if(typeof arg==='boolean'){force=arg;}
  else if(arg&&typeof arg==='object'){force=!!arg.force;retries=arg.retries||0;}
  retries=retries||0;

  // ── Cache-first，但只接受 60 分鐘內資料；強制重抓時完全跳過快取 ──
  if(retries===0&&!wxData&&!force){
    try{
      const c=JSON.parse(localStorage.getItem('_wxCache'));
      if(c&&c.d&&c.ts&&(Date.now()-c.ts)<WX_CACHE_MAX_AGE_MS){
        wxData=c.d;if(!Array.isArray(wxData.hPrecModel))wxData.hPrecModel=Array.isArray(wxData.hPrec)?wxData.hPrec.slice():[];_rebuildForecastPop(wxData);wxData._cached=true;wxData._cacheAgeMin=Math.round((Date.now()-c.ts)/60000);wxErr=false;render();
        _syncWeatherFx();
      }
    }catch(e){}
  }

  // ── Then try fresh data from API ──
  try{
    let lat,lon,posAccuracy=null,locSource='fallback';
    // 1) 非強制模式下，30 分鐘內有效位置快取可用，降低耗電
    if(!force){
      try{
        const c=JSON.parse(localStorage.getItem('_wxPos'));
        if(c&&c.lat&&c.lon&&c.ts&&(Date.now()-c.ts)<WX_POS_MAX_AGE_MS){
          lat=c.lat;lon=c.lon;posAccuracy=c.accuracy||null;locSource='cache';
          if(geoState.status==='unknown')geoState={status:'ok',code:null,msg:'',source:'cache',accuracy:posAccuracy,ts:c.ts};
        }
      }catch(e){}
    }
    // 2) 無有效快取或使用者按「重新抓取」→ 重新定位
    if(!lat){
      const g=await getGeoPosition({force});
      if(g){
        lat=g.lat;lon=g.lon;posAccuracy=g.accuracy||null;locSource=force?'gps-force':'gps';
        try{localStorage.setItem('_wxPos',JSON.stringify({lat,lon,accuracy:posAccuracy,ts:Date.now()}))}catch(e){}
      }else{
        // 定位失敗 → 只允許使用最後一次 GPS 已知位置；完全沒有 GPS 時不使用固定預設地點。
        try{const c=JSON.parse(localStorage.getItem('_wxPos'));if(c&&c.lat&&c.lon){lat=c.lat;lon=c.lon;posAccuracy=c.accuracy||null;locSource='last-known'}}catch(e){}
        if(!lat){wxErr=true;render();return}
      }
    }
    // GPS → 反查目前縣市/鄉鎮；失敗時不再鎖死任何預設地點
    const canUseGpsPlace=(locSource==='gps'||locSource==='gps-force'||locSource==='cache'||locSource==='last-known');
    wxPlace=canUseGpsPlace?await reverseGeocodeGps(lat,lon,force):null;

    // 把 GPS 位置與反查所在地交給 Service Worker（背景同步抓天氣/警報時要用）
    try{
      if(navigator.serviceWorker&&navigator.serviceWorker.controller){
        navigator.serviceWorker.controller.postMessage({type:'WX_POS',lat:parseFloat(lat),lon:parseFloat(lon),accuracy:posAccuracy,place:wxPlace||null,ts:Date.now()});
      }
    }catch(e){}

    const hourlyVars='precipitation_probability,precipitation,rain,showers,temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m';
    const currentVars='temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,precipitation';
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${currentVars}&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=${hourlyVars}&timezone=auto&forecast_days=7&cell_selection=nearest`;
    const resp=await Promise.race([fetch(url,{cache:'no-store'}),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),WX_API_TIMEOUT_MS))]);
    if(!resp.ok)throw new Error('API '+resp.status);
    const data=await resp.json();
    wxData={
      temp:Math.round(data.current.temperature_2m),code:data.current.weather_code,lat:lat,lon:lon,
      source:'Open-Meteo Forecast API',updatedAt:Date.now(),locationSource:locSource,posAccuracy:posAccuracy,place:wxPlace||null,
      currentPrecip:Number(data.current.precipitation||0),
      gust:Math.round(Number(data.current.wind_gusts_10m||data.current.wind_speed_10m||0)),
      days:data.daily.time.map((t,i)=>({date:t,code:data.daily.weather_code[i],hi:Math.round(data.daily.temperature_2m_max[i]),lo:Math.round(data.daily.temperature_2m_min[i])})),
      hTime:data.hourly.time,
      hPrecModel:(data.hourly.precipitation_probability||[]).slice(), // Open-Meteo 原始模式機率，只作 CWA 缺值時備援
      hPrec:(data.hourly.precipitation_probability||[]).slice(),      // 之後由 _rebuildForecastPop 統一選擇來源
      hPopSource:(data.hourly.time||[]).map(()=> 'open-meteo'),
      hRain:data.hourly.precipitation||[],                 // 模式預估逐時降水量 mm；絕不反推/灌高機率
      hRainOnly:data.hourly.rain||[],
      hShowers:data.hourly.showers||[],
      hTemp:data.hourly.temperature_2m,hCode:data.hourly.weather_code,hWind:data.hourly.wind_speed_10m,hGust:data.hourly.wind_gusts_10m||data.hourly.wind_speed_10m,hHum:data.hourly.relative_humidity_2m
    };
    wxErr=false;delete wxData._cached;delete wxData._cacheAgeMin;_rebuildForecastPop(wxData);
    // 台灣地區優先套用 CWA 鄉鎮預報；缺值才保留 Open-Meteo 備援。
    try{await _applyCwaPop(wxData,lat,lon,wxPlace,force);}catch(e){}
    try{localStorage.setItem('_wxCache',JSON.stringify({ts:Date.now(),d:wxData}))}catch(e){}
    // Tide
    try{
      const tResp=await Promise.race([fetch('https://cwa-tide.onerkk.workers.dev',{cache:'no-store'}),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),10000))]);
      const td=await tResp.json();
      const forecasts=td.records?.TideForecasts||[];
      if(forecasts.length){
        let best=forecasts[0],bD=9999;
        forecasts.forEach(f=>{const lo=f.Location;if(lo){const d=Math.sqrt((lo.Latitude-lat)**2+(lo.Longitude-lon)**2);if(d<bD){bD=d;best=f}}});
        const loc=best.Location;const tides=[];
        (loc.TimePeriods?.Daily||[]).forEach(day=>{(day.Time||[]).forEach(t=>{tides.push({date:day.Date,time:t.DateTime||"",type:t.Tide||"",height:parseInt(t.TideHeights?.AboveTWVD)||0})})});
        if(tides.length){tideData={station:loc.LocationName||"",tides:tides};tideErr=false}
        else{tideData=null;tideErr=true}
      }else{tideData=null;tideErr=true}
    }catch(e){tideData=null;tideErr=true}
  }catch(e){
    if(retries<2){setTimeout(()=>loadWx({force:force,retries:retries+1}),5000);return}
    if(!wxData){wxErr=true}
  }
  render();
  if(wxData){
    _syncWeatherFx();
    try{loadCwaData({force:false})}catch(e){}
    try{checkAndNotifyAlerts()}catch(e){console.log('notify check err',e)}
  }else _syncWeatherFx();
}

// ═══════════════════════════════════════════════════════════════
// CWA 資料載入（颱風 + 地震，透過用戶部署的 Cloudflare Worker 代理）
// 若 worker URL 未設定，typhoonData 與 earthquakeData 保持 null
// ═══════════════════════════════════════════════════════════════
let typhoonData=null,typhoonErr=false;
let earthquakeData=null,earthquakeErr=false;

// CWA Worker URL — 已寫死，永遠使用此 worker
// 若要更換 worker，直接修改下方常數即可
const CWA_WORKER_URL='https://cwa-data.onerkk.workers.dev';

function _getCwaWorkerUrl(){
  // 寫死版本：永遠使用 CWA_WORKER_URL
  // 後台設定的 cwaWorkerUrl / typhoonWorkerUrl 已忽略
  return CWA_WORKER_URL;
}

let _cwaLoadPromise=null;
let _lastCwaFetchAt=0;
function _stampCwaPayload(data,receivedAt){
  if(!data||typeof data!=='object')return data;
  data._clientFetchedAt=Number(receivedAt)||Date.now();
  data._clientSource='cwa-data-worker';
  return data;
}
function _alertCoords(){
  const a=_nNum(wxData&&wxData.lat),b=_nNum(wxData&&wxData.lon);
  if(a!==null&&b!==null)return{lat:a,lon:b};
  try{
    const c=JSON.parse(localStorage.getItem('_wxPos'));
    if(c&&_nNum(c.lat)!==null&&_nNum(c.lon)!==null&&c.ts&&Date.now()-Number(c.ts)<=WX_POS_MAX_AGE_MS)return{lat:Number(c.lat),lon:Number(c.lon)};
  }catch(e){}
  return null;
}
async function loadCwaData(arg){
  const force=!!(arg&&arg.force),url=_getCwaWorkerUrl();
  if(!url)return null;
  const coords=_alertCoords();
  // 無新鮮 GPS 時保留既有資料但不再抓取，避免錯用固定地點或舊位置。
  if(!coords)return typhoonData||earthquakeData||null;
  if(_cwaLoadPromise)return _cwaLoadPromise;
  const now=Date.now();
  if(!force&&_lastCwaFetchAt&&now-_lastCwaFetchAt<15000)return typhoonData||earthquakeData||null;
  const place=_currentGpsPlace(),cwaKey=[String(coords.lat),String(coords.lon),place&&place.county||'',place&&place.town||''].join('|');
  if(!force){
    try{
      const c=JSON.parse(localStorage.getItem('_cwaCache'));
      if(c&&c.key===cwaKey&&c.ts&&(Date.now()-c.ts)<90*1000&&c.d){
        _stampCwaPayload(c.d,c.ts);typhoonData=c.d;earthquakeData=c.d;_syncWeatherFx();render();
      }
    }catch(e){}
  }
  _cwaLoadPromise=(async()=>{
    try{
      const req=new URL(url);
      req.searchParams.set('lat',coords.lat);req.searchParams.set('lon',coords.lon);req.searchParams.set('gps','1');req.searchParams.set('areaMode','gps');
      if(place&&place.county)req.searchParams.set('county',place.county);if(place&&place.town)req.searchParams.set('town',place.town);
      req.searchParams.set('_',String(Date.now()));
      const resp=await Promise.race([fetch(req.toString(),{cache:'no-store'}),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),8000))]);
      if(!resp.ok)throw new Error('cwa api '+resp.status);
      const data=await resp.json();if(!data||!data.ok)throw new Error('cwa payload invalid');
      const fetchedAt=Date.now();_lastCwaFetchAt=fetchedAt;_stampCwaPayload(data,fetchedAt);
      data._gpsQuery={lat:coords.lat,lon:coords.lon,place:place||null,ts:fetchedAt};
      typhoonData=data;earthquakeData=data;typhoonErr=false;earthquakeErr=false;
      try{localStorage.setItem('_cwaCache',JSON.stringify({ts:fetchedAt,key:cwaKey,place:place||null,d:data}))}catch(e){}
      _syncWeatherFx();render();try{checkAndNotifyAlerts()}catch(e){}return data;
    }catch(e){typhoonErr=true;earthquakeErr=true;console.log('loadCwaData err',e);return typhoonData||earthquakeData||null}
    finally{_cwaLoadPromise=null}
  })();
  return _cwaLoadPromise;
}
// 向後相容 — loadTyphoon 仍可呼叫
function loadTyphoon(){return loadCwaData()}
try{window.loadCwaData=loadCwaData;window.loadTyphoon=loadTyphoon}catch(e){}

const SHIFT_HR={"早":[6,7,8],"中":[13,14,15],"晚":[18,19,20]};

// ═══ 即時天氣警報引擎 ═══
// 回傳警報陣列，依嚴重度排序（嚴重在前）
// 每個警報 = {id, level: 'danger'|'warn'|'info', icon, title, detail}
// 時段判定：警報是否在偵測時段內（空陣列 = 全天）
// 颱風、雷雨 不受時段限制（生命安全優先）
function isInDetectionWindow(alertId){
  if(alertId==='typhoon'||alertId==='storm') return true;
  const cfg=APP_CFG.wxAlerts||{};
  const tw=(cfg.timeWindows&&cfg.timeWindows[alertId])||[];
  if(!tw.length) return true;
  const now=new Date();
  const cur=now.getHours()*60+now.getMinutes();
  for(const w of tw){
    if(!w||!w.start||!w.end) continue;
    const [sh,sm]=String(w.start).split(':').map(Number);
    const [eh,em]=String(w.end).split(':').map(Number);
    if(isNaN(sh)||isNaN(eh)) continue;
    const s=sh*60+(sm||0),e=eh*60+(em||0);
    if(s<=e){
      if(cur>=s&&cur<=e) return true;
    }else{
      // 跨午夜（例：22:00-06:00）
      if(cur>=s||cur<=e) return true;
    }
  }
  return false;
}

// 颱風強度等級對應（與 worker 同步）
const TYPHOON_INTENSITY_ORDER={td:0,mild:1,moderate:2,severe:3};

// 評估 CWA 官方颱風警報
function _typhoonAreaMatch(data){
  const areas=Array.isArray(data&&data.affectedAreas)?data.affectedAreas:[];if(!areas.length)return false;
  const text=areas.join('｜'),p=_currentGpsPlace()||{},town=_cleanTwAreaName(p.town),county=_cleanTwAreaName(p.county);
  return (town&&_twNameVariants(town).some(k=>text.includes(k)))||(county&&_twNameVariants(county).some(k=>text.includes(k)));
}
function evaluateTyphoonCWA(cfg,isZh){
  if(!typhoonData||!typhoonData.active||!Array.isArray(typhoonData.typhoons)||!typhoonData.typhoons.length)return null;
  const tys=typhoonData.typhoons,minIntOrder=TYPHOON_INTENSITY_ORDER[cfg.typhoonMinIntensity||'td']||0,distLim=cfg.typhoonAlertDistanceKm||800;
  const land=!!typhoonData.landAlert,sea=!!typhoonData.seaAlert,hasOfficial=land||sea;
  const matched=tys.filter(t=>(TYPHOON_INTENSITY_ORDER[t.intensityId]||0)>=minIntOrder&&(hasOfficial||t.distanceKm<=distLim||t.minForecastDistKm<=distLim));
  if(!matched.length)return null;
  matched.sort((a,b)=>((TYPHOON_INTENSITY_ORDER[b.intensityId]||0)-(TYPHOON_INTENSITY_ORDER[a.intensityId]||0))||((_nNum(a.distanceKm)||99999)-(_nNum(b.distanceKm)||99999)));
  const t=matched[0],distance=Math.min(_nNum(t.distanceKm)??Infinity,_nNum(t.minForecastDistKm)??Infinity);
  const localLand=land&&(typhoonData.matchedArea===true||_typhoonAreaMatch(typhoonData));
  const fetched=_capParseTs(typhoonData._clientFetchedAt),fresh=Number.isFinite(fetched)&&Date.now()-fetched<=(parseInt(cfg.officialAlertCacheMaxMinutes)||10)*60000;
  const notifyEligible=fresh&&hasOfficial&&(localLand||(sea&&distance<=distLim));
  let title;
  if(land)title=isZh?`🌀 颱風陸上警報 — ${t.nameZh||t.name}`:`🌀 Typhoon Land Warning — ${t.name}`;
  else if(sea)title=isZh?`🌀 颱風海上警報 — ${t.nameZh||t.name}`:`🌀 Typhoon Sea Warning — ${t.name}`;
  else title=isZh?`🌀 颱風動態 — ${t.nameZh||t.name}`:`🌀 Typhoon update — ${t.name}`;
  const parts=[];
  if(t.intensity)parts.push(isZh?`強度：${t.intensity}${t.maxWindKmh?`（最大風速 ${t.maxWindKmh} km/h）`:''}`:`Intensity: ${t.intensity}`);
  if(t.distanceKm)parts.push(isZh?`距${t.nearestPoint||'台灣'} ${t.distanceKm} km`:`Distance ${t.distanceKm} km`);
  if(t.movingDirection&&t.movingSpeedKmh)parts.push(isZh?`向${t.movingDirection}移動 ${t.movingSpeedKmh} km/h`:`Moving ${t.movingDirection} ${t.movingSpeedKmh} km/h`);
  if(typhoonData.affectedAreas&&typhoonData.affectedAreas.length)parts.push(isZh?`警戒區：${typhoonData.affectedAreas.slice(0,6).join('、')}`:`Areas: ${typhoonData.affectedAreas.slice(0,6).join(', ')}`);
  if(hasOfficial&&!fresh)parts.push(isZh?'官方資料已超過新鮮度上限；僅顯示不推播':'Official data is stale; display only');
  else if(hasOfficial&&!notifyEligible)parts.push(isZh?'官方警報未精確命中所在地；僅顯示不推播':'Official warning does not precisely match current location; display only');
  if(!hasOfficial)parts.push(isZh?'尚非中央氣象署海上／陸上颱風警報':'Not a CWA sea/land warning');
  const eventKey='typhoon:'+String(t.id||t.typhoonNo||t.name||t.nameZh||'active');
  const revisionKey=[land?'land':sea?'sea':'track',(typhoonData.affectedAreas||[]).join(','),typhoonData.issueTime||typhoonData.sent||''].join('|');
  return {id:'typhoon',level:hasOfficial?'danger':'warn',icon:'🌀',title,detail:parts.join('；'),official:hasOfficial,modelOnly:!hasOfficial,critical:hasOfficial&&notifyEligible,notifyEligible,eventKey,revisionKey};
}

// ═══════════════════════════════════════════════════════════════
// 地震警報判定
// 邏輯：抓最新地震 → 比規模/震度門檻 → 比距離 → 比時間（多久內）
// 去重：用 EarthquakeNo 比對 localStorage，同筆地震不重複推
// ═══════════════════════════════════════════════════════════════
function _eqTs(v){
  if(!v)return NaN;
  let t=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(t))t=t.replace(' ','T')+'+08:00';
  const n=new Date(t).getTime();return Number.isFinite(n)?n:NaN;
}
function _eqIntensityNumber(v){
  if(v===null||v===undefined)return null;
  if(typeof v==='number'&&Number.isFinite(v))return v;
  const s=String(v).trim();
  if(!s)return null;
  const m=s.match(/([0-7])\s*(弱|強)?/);
  if(!m)return null;
  const n=Number(m[1]);
  if(m[2]==='強')return n+0.5;
  return n;
}
function _eqIntensityLabel(v){
  const n=_eqIntensityNumber(v);
  if(n===null)return'';
  const i=Math.floor(n),half=n-i;
  return i>=5?(String(i)+(half>=.5?'強':'弱')):String(i);
}
function _eqLocalIntensity(eq){
  const keys=_gpsPlaceKeys(),place=_currentGpsPlace()||{};
  if(!keys.length||!eq)return null;
  let best=null;
  const nameKeys=['townName','TownName','town','district','locationName','LocationName','areaName','AreaName','countyName','CountyName','county','areaDesc','description','name'];
  const intKeys=['intensity','Intensity','intensityValue','seismicIntensity','shakingIntensity','value','maxIntensity','MaxIntensity'];
  const visit=(v,d)=>{
    if(v==null||d>8)return;
    if(Array.isArray(v)){v.forEach(x=>visit(x,d+1));return}
    if(typeof v!=='object')return;
    const label=nameKeys.map(k=>v[k]).filter(x=>typeof x==='string').join(' ');
    const matchTown=place.town&&_twNameVariants(place.town).some(k=>label.includes(k));
    const matchCounty=place.county&&_twNameVariants(place.county).some(k=>label.includes(k));
    if(matchTown||matchCounty){
      for(const k of intKeys){
        const num=_eqIntensityNumber(v[k]);
        if(num!==null){
          const rank=matchTown?2:1;
          if(!best||rank>best.rank||(rank===best.rank&&num>best.value))best={value:num,label:_eqIntensityLabel(v[k]),area:label.trim(),rank};
        }
      }
    }
    Object.keys(v).forEach(k=>visit(v[k],d+1));
  };
  visit(eq,0);
  return best;
}
function _eqEventKey(eq){
  return String(eq&&eq.no||eq&&eq.earthquakeNo||eq&&eq.identifier||[eq&&eq.originTime,eq&&eq.lat,eq&&eq.lon,eq&&eq.magnitude].join('|'));
}
function evaluateEarthquake(cfg,isZh){
  if(!earthquakeData||!earthquakeData.earthquakeActive||!Array.isArray(earthquakeData.earthquakes)||!earthquakeData.earthquakes.length)return null;
  const minMag=parseFloat(cfg.earthquakeMinMagnitude)||4.0;
  const minInt=parseFloat(cfg.earthquakeMinIntensity)||3;
  const rawMaxDist=parseFloat(cfg.earthquakeMaxDistanceKm);
  const maxDist=(Number.isFinite(rawMaxDist)&&rawMaxDist>0)?rawMaxDist:120;
  const maxAge=parseInt(cfg.earthquakeMaxAgeMinutes)||120;
  const notifyMaxAge=parseInt(cfg.earthquakeNotifyMaxAgeMinutes)||15;
  const coords=_alertCoords(),myLat=_nNum(coords&&coords.lat),myLon=_nNum(coords&&coords.lon);
  if(myLat===null||myLon===null)return null;
  const now=Date.now();
  const eqs=earthquakeData.earthquakes.slice().sort((a,b)=>(_eqTs(b.originTime||b.time||b.reportTime)||0)-(_eqTs(a.originTime||a.time||a.reportTime)||0));
  for(const eq of eqs){
    const eventTime=_eqTs(eq.originTime||eq.time||eq.reportTime);
    const ageMin=Number.isFinite(eventTime)?Math.max(0,(now-eventTime)/60000):Infinity;
    if(maxAge>0&&ageMin>maxAge)continue;
    const mag=_nNum(eq.magnitude);
    const dep=Math.max(0,_nNum(eq.focalDepth)||0);
    const epiDist=_geoDistKm(myLat,myLon,eq.lat,eq.lon);
    if(epiDist===null)continue;
    const hypoDist=Math.sqrt(epiDist*epiDist+dep*dep);
    const localInt=_eqLocalIntensity(eq);
    // 優先採所在地觀測震度；資料尚未提供所在地震度時，才用「規模達標且距離在門檻內」作保守備援。
    const localOk=!!(localInt&&localInt.value>=minInt);
    const fallbackOk=!localInt&&mag!==null&&mag>=minMag&&hypoDist<=maxDist;
    if(!localOk&&!fallbackOk)continue;
    const isEew=eq.isEew===true||/速報|EEW/i.test(String(eq.reportType||eq.type||eq.source||''));
    const placeText=(String(eq.location||'').replace(/^[^（(]*[（(]/,'').replace(/[）)].*$/,'')||eq.maxIntensityArea||'台灣');
    const title=isZh?`🌍 ${isEew?'地震速報':'地震報告'} — M${mag!==null?mag.toFixed(1):'--'} ${placeText}`:`🌍 Earthquake M${mag!==null?mag.toFixed(1):'--'}`;
    const parts=[];
    if(eq.location)parts.push(isZh?`震央：${eq.location}`:`Epicenter: ${eq.location}`);
    parts.push(isZh?`規模 ${mag!==null?mag.toFixed(1):'--'}，深度 ${dep.toFixed(1)} km`:`M${mag!==null?mag.toFixed(1):'--'}, depth ${dep.toFixed(1)} km`);
    if(localInt)parts.push(isZh?`所在地觀測震度 ${localInt.label||localInt.value}`:`Local intensity ${localInt.label||localInt.value}`);
    else if(eq.maxIntensityLabel&&eq.maxIntensityArea)parts.push(isZh?`全臺最大震度 ${eq.maxIntensityLabel} 於 ${eq.maxIntensityArea}`:`Max intensity ${eq.maxIntensityLabel} at ${eq.maxIntensityArea}`);
    parts.push(isZh?`震央距離約 ${Math.round(epiDist)} km`:`Epicentral distance ~${Math.round(epiDist)} km`);
    if(Number.isFinite(eventTime))parts.push(isZh?`發生於 ${new Date(eventTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}（${Math.round(ageMin)} 分鐘前）`:`${Math.round(ageMin)} min ago`);
    const localCritical=localInt?localInt.value>=5:(mag!==null&&mag>=6&&hypoDist<=100);
    return {id:'earthquake',level:localCritical?'danger':'warn',icon:'🌍',title,detail:parts.join('；'),eqNo:_eqEventKey(eq),eventKey:'earthquake:'+_eqEventKey(eq),revisionKey:'event:'+_eqEventKey(eq),critical:localCritical,official:true,notifyEligible:ageMin<=notifyMaxAge};
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════
// CWA 官方天氣警特報解析（相容多種 worker JSON 結構）
// 只要 cwa-data worker 有回傳 W-C0033-* 相關欄位，本函式會優先採用官方警特報；
// Open-Meteo 的降雨機率只降級為「提醒」，不再冒充官方豪雨警報。
// ═══════════════════════════════════════════════════════════════
function _pickCwaText(v,depth,bag){
  if(!v||depth>6||bag.length>120)return;
  if(typeof v==='string'){
    const t=v.trim();
    if(t&&t.length<600)bag.push(t);
    return;
  }
  if(Array.isArray(v)){for(const x of v)_pickCwaText(x,depth+1,bag);return;}
  if(typeof v==='object'){
    const prefer=['title','headline','event','phenomena','significance','description','desc','content','contentText','text','areaDesc','instruction','senderName','effective','expires','area','areas','locationName','county','town'];
    for(const k of prefer){if(v[k]!==undefined)_pickCwaText(v[k],depth+1,bag)}
    // 若 worker 使用未知鍵名，保守掃描少量欄位
    let n=0;
    for(const k in v){if(n++>40)break;if(prefer.includes(k))continue;_pickCwaText(v[k],depth+1,bag)}
  }
}
function _cwaTextIncludesAny(text,arr){return arr.some(k=>text.indexOf(k)>=0)}
function _cwaAreaMatches(text){
  text=String(text||'');
  if(!text)return false;
  const keys=_gpsPlaceKeys();
  if(!keys.length)return false;
  // 只接受 GPS 反查出的目前縣市/鄉鎮；不接受「全臺/南部/台灣」這種大範圍字串當所在地。
  return keys.some(k=>k&&text.indexOf(k)>=0);
}
function _capParseTs(v){
  if(v===null||v===undefined||v==='')return NaN;
  if(typeof v==='number')return v>1e12?v:v*1000;
  let t=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(t))t=t.replace(' ','T')+'+08:00';
  const n=new Date(t).getTime();return Number.isFinite(n)?n:NaN;
}
function _capAreaText(a){
  if(!a)return'';
  const areas=[];
  if(Array.isArray(a.areas))a.areas.forEach(x=>areas.push(typeof x==='string'?x:JSON.stringify(x)));
  else if(a.areas)areas.push(String(a.areas));
  return [a.areaDesc,a.area,a.county,a.town,a.locationName,a.matchedCounty,a.matchedTown,a.matchedAreaName,...areas].filter(Boolean).join('｜');
}
function _capPointInPoly(lat,lon,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const yi=poly[i][0],xi=poly[i][1],yj=poly[j][0],xj=poly[j][1];
    const hit=((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi);
    if(hit)inside=!inside;
  }
  return inside;
}
function _capParsePolygon(v){
  if(Array.isArray(v)){
    if(v.length>=3&&Array.isArray(v[0]))return v.map(p=>[parseFloat(p[0]),parseFloat(p[1])]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
    return[];
  }
  return String(v||'').trim().split(/\s+/).map(x=>x.split(',').map(Number)).filter(p=>p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
}
function _capGeometryContainsGps(a){
  const lat=_nNum(wxData&&wxData.lat),lon=_nNum(wxData&&wxData.lon);if(lat===null||lon===null||!a)return false;
  const vals=[];
  const walk=(v,d)=>{if(v==null||d>5)return;if(Array.isArray(v)){v.forEach(x=>walk(x,d+1));return}if(typeof v==='object'){for(const k in v){if(/polygon|geometry|coordinate|circle/i.test(k))vals.push(v[k]);walk(v[k],d+1)}}};
  walk(a,0);
  for(const v of vals){
    const poly=_capParsePolygon(v);
    if(poly.length>=3&&(_capPointInPoly(lat,lon,poly)||_capPointInPoly(lat,lon,poly.map(p=>[p[1],p[0]]))))return true;
    if(typeof v==='string'){
      const m=v.trim().match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
      if(m){const d=_geoDistKm(lat,lon,parseFloat(m[1]),parseFloat(m[2]));if(d!==null&&d<=parseFloat(m[3]))return true}
    }
  }
  return false;
}
function _officialAlertScope(a){
  if(!a||a.matchedArea===false)return{match:'none',reason:'worker-no-match'};
  const p=_currentGpsPlace()||{},county=_isValidTwCounty(p.county)?_cleanTwAreaName(p.county):'',town=_isValidTwTown(p.town)?_cleanTwAreaName(p.town):'';
  if(!county&&!town)return{match:'none',reason:'no-place'};
  if(_capGeometryContainsGps(a))return{match:'local',reason:'geometry'};
  const text=_capAreaText(a),townVars=_twNameVariants(town);
  if(town&&townVars.some(k=>k&&text.includes(k)))return{match:'local',reason:'town'};
  const listedTowns=(text.match(/[一-鿿]{1,8}[區鄉鎮]/g)||[]).map(_cleanTwAreaName);
  if(town&&listedTowns.length&&!listedTowns.some(x=>townVars.includes(x)))return{match:'none',reason:'other-towns'};
  const countyMatch=county&&_twNameVariants(county).some(k=>k&&text.includes(k));
  if(countyMatch)return{match:'regional',reason:'county-only'};
  return{match:'none',reason:'no-area'};
}
function _officialAlertIsActive(a,cfg){
  if(!a)return false;
  const status=String(a.status||'Actual').toLowerCase(),msg=String(a.msgType||a.messageType||'Alert').toLowerCase();
  if(/test|exercise|draft|system/.test(status)||/cancel|error/.test(msg))return false;
  const vt=a.validTime||a.valid||{};
  let start=_capParseTs(a.effective||a.onset||a.startTime||vt.startTime),end=_capParseTs(a.expires||a.endTime||vt.endTime);
  if(!Number.isFinite(start)||!Number.isFinite(end)){
    const m=String(a.contentText||a.description||a.headline||'').match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/g)||[];
    if(!Number.isFinite(start)&&m[0])start=_capParseTs(m[0]);
    if(!Number.isFinite(end)&&m[1])end=_capParseTs(m[1]);
  }
  const now=Date.now();
  if(Number.isFinite(start)&&start>now+5*60000)return false;
  if(Number.isFinite(end)&&end<now-2*60000)return false;
  // 若完全沒有有效時間，只信任最近抓回來的資料，避免網路失敗後舊警報永久殘留。
  if(!Number.isFinite(start)&&!Number.isFinite(end)){
    const data=typhoonData||earthquakeData,received=_capParseTs(data&&data._clientFetchedAt);
    const maxMin=parseInt(cfg&&cfg.officialAlertCacheMaxMinutes)||10;
    if(!Number.isFinite(received)||now-received>maxMin*60000)return false;
  }
  return true;
}
function _officialAlertMatchesGpsPlace(a){return _officialAlertScope(a).match==='local'}
function _officialAlertIdentity(a,id){
  const explicit=a&&(a.identifier||a.alertId||a.eventId||a.eventCode);if(explicit)return String(explicit);
  const start=String(a&&(a.effective||a.onset||a.startTime)||''),area=_capAreaText(a).slice(0,160),event=String(a&&(a.event||a.title||a.headline)||id||'alert');
  return [event,start,area].join('|');
}
function _officialAlertRevision(a){return String(a&&(a.sent||a.updateTime||a.updatedAt||a.expires||a.endTime||a.effective)||'initial')}
function _limitText(t,n){
  t=String(t||'').replace(/\s+/g,' ').replace(/[｜]{2,}/g,'｜').trim();
  return t.length>n?t.slice(0,n)+'…':t;
}
function _fmtTimeShort(t){
  if(!t)return'';
  try{
    const d=new Date(String(t).replace(' ','T'));
    if(!isNaN(d.getTime()))return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }catch(e){}
  return String(t).slice(0,16);
}
function _alertIdFromText(text){
  text=String(text||'');
  if(/颱風/.test(text))return'typhoon';
  if(/豪雨|大雨|豪大雨|短延時強降雨/.test(text))return'heavyRain';
  if(/大雷雨|雷雨|雷擊/.test(text))return'storm';
  if(/強風|平均風|陣風/.test(text))return'strongWind';
  if(/高溫|橙色燈號|紅色燈號/.test(text))return'heat';
  if(/低溫|寒流/.test(text))return'cold';
  if(/濃霧|能見度/.test(text))return'fog';
  return'weather';
}
function _alertIcon(id){return({typhoon:'🌀',heavyRain:'🌧',storm:'⛈',strongWind:'💨',heat:'🥵',cold:'🥶',fog:'🌫',weather:'⚠️'})[id]||'⚠️'}
function _alertTitle(id,isZh){return({
  heavyRain:isZh?'中央氣象署豪大雨特報':'CWA Rain Advisory',
  storm:isZh?'中央氣象署雷雨特報':'CWA Thunderstorm Advisory',
  strongWind:isZh?'中央氣象署強風特報':'CWA Strong Wind Advisory',
  heat:isZh?'中央氣象署高溫資訊':'CWA Heat Advisory',
  cold:isZh?'中央氣象署低溫特報':'CWA Cold Advisory',
  fog:isZh?'中央氣象署濃霧特報':'CWA Fog Advisory',
  typhoon:isZh?'中央氣象署颱風警報':'CWA Typhoon Warning',
  weather:isZh?'中央氣象署天氣警特報':'CWA Weather Advisory'
})[id]|| (isZh?'中央氣象署天氣警特報':'CWA Weather Advisory')}
function _alertLevel(id,a){
  const text=String((a&&a.event||'')+' '+(a&&a.title||'')+' '+(a&&a.description||''));
  if(id==='typhoon'||id==='storm')return'danger';
  if(id==='heavyRain')return /豪雨|豪大雨|短延時強降雨/.test(text)?'danger':'warn';
  if(id==='strongWind'||id==='heat'||id==='cold')return'warn';
  return'info';
}

// v201：CWA 官方強風特報也必須通過「GPS 本地目前/未來 3 小時最大陣風 >= 後台門檻」。
// 修正 v201 只呼叫但未定義 _strongWindGustGatePass，導致畫面渲染出錯。
function _localMaxGustForGate(hours){
  if(!wxData)return{mx:0,at:null,available:false};
  const now=new Date();
  const nh=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0")+"T"+String(now.getHours()).padStart(2,"0");
  const times=wxData.hTime||[];
  const hi=times.findIndex(s=>String(s).startsWith(nh));
  const arr=(wxData.hGust&&wxData.hGust.length?wxData.hGust:wxData.hWind)||[];
  let mx=Number.isFinite(parseFloat(wxData.gust))?parseFloat(wxData.gust):0;
  let at=null;
  if(hi>=0&&arr.length){
    for(let k=hi;k<Math.min(hi+hours,arr.length);k++){
      const v=parseFloat(arr[k])||0;
      if(v>mx){mx=v;at=times[k]||null}
    }
  }
  return{mx,at,available:!!(arr.length||mx)};
}
function _strongWindGustGatePass(cfg){
  const th=parseFloat((cfg&&cfg.windGustThreshold)||(cfg&&cfg.windThreshold))||62;
  const g=_localMaxGustForGate(3);
  // 沒有本地 GPS 逐時陣風資料時，不讓 CWA 大範圍強風特報繞過門檻。
  if(!g.available)return false;
  return g.mx>=th;
}
function _appendGustGateDetail(detail,cfg,isZh){
  const th=parseFloat((cfg&&cfg.windGustThreshold)||(cfg&&cfg.windThreshold))||62;
  const g=_localMaxGustForGate(3);
  const add=isZh
    ?`本地最大陣風 ${Math.round(g.mx||0)} / ${Math.round(th)} km/h`
    :`Local max gust ${Math.round(g.mx||0)} / ${Math.round(th)} km/h`;
  return (detail?detail+'｜':'')+add;
}
function _areasShort(areas){
  areas=Array.isArray(areas)?areas.filter(Boolean):[];
  return areas.length?areas.slice(0,5).join('、')+(areas.length>5?'等':''):'';
}
function _matchedAreaLabel(a){
  const place=_gpsPlaceText();
  const keys=_gpsPlaceKeys();
  const areas=Array.isArray(a&&a.areas)?a.areas.filter(Boolean):[];
  const matched=areas.filter(x=>keys.some(k=>String(x).indexOf(k)>=0||String(k).indexOf(x)>=0));
  if(place)return place+(matched.length&&matched[0]!==place?'（'+matched.slice(0,3).join('、')+'）':'');
  return matched.slice(0,3).join('、');
}
// ── CWA 警特報原文正規化（治本）──────────────────────────────
// 病根：cwa-data worker 把「語言碼；生效起；生效迄；發布；更新；一、概述：…」
// 全部攤平塞進同一個 description 字串，且未提供 effective/expires 結構化欄位，
// 前端只能整串硬切，砍掉使用者最需要的「何時下雨」那句。
// 本正規化器不論 worker 給乾淨欄位或攤平 blob，都還原出：生效時段 + 乾淨內文。
function _cwaTs(v){if(!v)return NaN;const d=new Date(String(v).trim().replace(' ','T'));const n=d.getTime();return Number.isFinite(n)?n:NaN}
function _cwaDateTokens(s){
  const re=/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?/g;
  const out=[];let m;
  while((m=re.exec(s)))out.push({raw:m[0],idx:m.index,end:re.lastIndex});
  return out;
}
function _cwaSmartTrim(t,n){
  t=String(t||'').replace(/\s+/g,' ').trim();
  if(t.length<=n)return t;
  let cut=t.slice(0,n);
  const p=Math.max(cut.lastIndexOf('。'),cut.lastIndexOf('，'),cut.lastIndexOf('；'),cut.lastIndexOf('！'),cut.lastIndexOf('？'),cut.lastIndexOf('、'));
  if(p>=Math.floor(n*0.5))cut=cut.slice(0,p+1);
  return cut.replace(/[，、；]$/,'')+'…';
}
function _cleanArea(label){
  label=String(label||'').trim();
  const m=label.match(/^(.*?)（(.+?)）\s*$/);
  if(m&&m[1].indexOf(m[2])>=0)return m[1].trim();   // 「臺南市 鹽水區（臺南市）」→「臺南市 鹽水區」
  return label;
}
// 回傳 {validText, body}：validText=生效時段、body=乾淨概述
function _parseCwaNarrative(a,isZh){
  const vt=(a&&(a.validTime||a.valid))||{};
  let startRaw=(a&&(a.effective||a.startTime||a.onset))||vt.startTime||'';
  let endRaw  =(a&&(a.expires ||a.endTime))||vt.endTime||'';
  let raw=String((a&&(a.contentText||a.description||a.headline||a.desc))||'');
  raw=raw.replace(/^\s*[a-z]{2}-[A-Za-z]{2,4}\s*[；;]\s*/,'');   // 剝離開頭語言碼「zh-TW；」
  // 取「緊貼開頭、之間只有分隔符」的連續時間戳當 metadata 前綴（worker 順序：生效起/迄/發布/更新）
  const toks=_cwaDateTokens(raw);
  let cur=0;const lead=[];
  for(const tk of toks){
    if(raw.slice(cur,tk.idx).replace(/[\s；;、｜.]/g,'')!=='')break;
    lead.push(tk);cur=tk.end;
  }
  let bodyStart=0;
  if(lead.length){
    bodyStart=lead[lead.length-1].end;
    if(!startRaw&&lead[0])startRaw=lead[0].raw;
    if(!endRaw&&lead[1])endRaw=lead[1].raw;
  }
  let body=raw.slice(bodyStart).replace(/^\s*[；;、｜]\s*/,'');
  body=body.replace(/^[一二三四五六七八九十]+[、.．]?\s*概述[：:]\s*/,'');     // 去「一、概述：」標號
  const cut=body.search(/[一二三四五六七八九十]+[、.．]?\s*(注意事項|其他)/);    // 砍掉「二、注意事項」後段
  if(cut>0)body=body.slice(0,cut);
  if(startRaw&&endRaw){const s=_cwaTs(startRaw),e=_cwaTs(endRaw);if(Number.isFinite(s)&&Number.isFinite(e)&&e<s){const tmp=startRaw;startRaw=endRaw;endRaw=tmp}}
  const validText=(startRaw||endRaw)?(_fmtTimeShort(startRaw)+(endRaw?'～'+_fmtTimeShort(endRaw):'')):'';
  return {validText,body:_cwaSmartTrim(body,140)};
}
function evaluateCwaWeatherWarnings(cfg,isZh){
  const data=typhoonData||earthquakeData;
  if(!data)return[];
  const all=[...(data.officialAlerts||[]),...(data.weatherWarnings||[]),...(data.capAlerts||[]),...(data.disasterAlerts||[])];
  const raw=all.filter(a=>a&&_officialAlertIsActive(a,cfg)&&_officialAlertScope(a).match!=='none').sort((a,b)=>(_capParseTs(b.sent||b.updateTime||b.effective)||0)-(_capParseTs(a.sent||a.updateTime||a.effective)||0));
  const out=[];
  const seen=new Set();
  if(raw.length){
    raw.forEach(a=>{
      const id=a.id||_alertIdFromText((a.event||'')+' '+(a.title||'')+' '+(a.headline||'')+' '+(a.description||''));
      if(id==='weather')return;
      if(cfg[id]===false)return;
      // 官方警特報已經過所在地與有效時間驗證，不再用數值模式反向否決官方訊息。
      const scope=_officialAlertScope(a);
      const capId=_officialAlertIdentity(a,id);
      const key=id+'|'+capId+'|'+scope.match;
      if(seen.has(key))return;seen.add(key);
      const area=_cleanArea(_matchedAreaLabel(a));
      const np=_parseCwaNarrative(a,isZh);
      let detail='';
      if(area)detail+='📍'+area;
      if(np.validText)detail+=(detail?'｜':'')+(isZh?'⏰生效 ':'Valid ')+np.validText;
      // v210：豪大雨特報的官方長敘述改放摺疊區（bodyFull），預設只留地點/時效（＋後面補上的逐時機率雨量）；
      //        其餘官方警報維持原樣（敘述本身即重點，不摺疊）。
      let bodyFull='';
      if(np.body){
        if(id==='heavyRain')bodyFull=np.body;
        else detail+=(detail?'｜':'')+np.body;
      }
      if(!detail)detail=isZh?'中央氣象署官方警特報生效中':'CWA official alert is active';
      if(id==='strongWind')detail=_appendGustGateDetail(detail,cfg,isZh);
      if(scope.match==='regional')detail+=(detail?'｜':'')+(isZh?'縣市級公告；尚無法確認本鄉鎮，僅顯示不推播':'County-level notice; shown without push');
      const revision=_officialAlertRevision(a);
      const _alt={id,level:_alertLevel(id,a),icon:a.icon||_alertIcon(id),official:true,regional:scope.match==='regional',notifyEligible:scope.match==='local',critical:scope.match==='local'&&(id==='typhoon'||id==='storm'||(id==='heavyRain'&&_alertLevel(id,a)==='danger')),
        eventKey:'official:'+id+':'+capId,revisionKey:revision,title:_alertTitle(id,isZh),detail};
      if(bodyFull)_alt.bodyFull=bodyFull;
      out.push(_alt);
    });
    return out;
  }
  // 舊 worker 或未知結構 fallback：仍可讀文字，但限制長度避免警報卡爆版
  const bag=[];_pickCwaText(data,0,bag);
  if(!bag.length)return[];
  const text=[...new Set(bag)].join('｜');
  if(!_cwaAreaMatches(text))return[];
  function detailFor(kind){
    const place=_cleanArea(_gpsPlaceText());
    const hit=(bag.filter(t=>t.indexOf(kind)>=0||t.indexOf('特報')>=0||t.indexOf('警報')>=0).find(t=>_cwaAreaMatches(t))||'');
    const np=_parseCwaNarrative({description:hit},isZh);
    let d='';
    if(place)d+='📍'+place;
    if(np.validText)d+=(d?'｜':'')+(isZh?'⏰生效 ':'Valid ')+np.validText;
    let body=np.body;if(body)body=body.replace(/(臺灣|台灣|全臺|全台|北部|中部|南部|東部|離島)[；;、｜]*/g,'');
    if(body)d+=(d?'｜':'')+body;
    return d||(isZh?'中央氣象署官方警特報生效中':'CWA official alert is active');
  }
  if(cfg.heavyRain!==false&&_cwaTextIncludesAny(text,['豪雨','大雨','豪大雨','短延時強降雨']))out.push({id:'heavyRain',level:'danger',icon:'🌧',official:true,notifyEligible:false,critical:false,title:_alertTitle('heavyRain',isZh),detail:detailFor('雨')+'｜'+(isZh?'舊格式資料，僅顯示不推播':'Legacy format; no push')});
  if(cfg.storm!==false&&_cwaTextIncludesAny(text,['大雷雨','雷雨','雷擊']))out.push({id:'storm',level:'danger',icon:'⛈',official:true,notifyEligible:false,critical:false,title:_alertTitle('storm',isZh),detail:detailFor('雷')+'｜'+(isZh?'舊格式資料，僅顯示不推播':'Legacy format; no push')});
  if(cfg.strongWind!==false&&_cwaTextIncludesAny(text,['陸上強風','強風','平均風','陣風']))out.push({id:'strongWind',level:'warn',icon:'💨',official:true,notifyEligible:false,title:_alertTitle('strongWind',isZh),detail:_appendGustGateDetail(detailFor('風'),cfg,isZh)+'｜'+(isZh?'舊格式資料，僅顯示不推播':'Legacy format; no push')});
  if(cfg.heat!==false&&_cwaTextIncludesAny(text,['高溫','橙色燈號','紅色燈號']))out.push({id:'heat',level:'warn',icon:'🥵',official:true,notifyEligible:false,title:_alertTitle('heat',isZh),detail:detailFor('高溫')});
  if(cfg.cold!==false&&_cwaTextIncludesAny(text,['低溫','寒流']))out.push({id:'cold',level:'warn',icon:'🥶',official:true,notifyEligible:false,title:_alertTitle('cold',isZh),detail:detailFor('低溫')});
  if(cfg.fog!==false&&_cwaTextIncludesAny(text,['濃霧','能見度']))out.push({id:'fog',level:'info',icon:'🌫',official:true,notifyEligible:false,title:_alertTitle('fog',isZh),detail:detailFor('霧')});
  return out;
}

function _numRain(v){v=parseFloat(v);return Number.isFinite(v)&&v>=0?v:null}
function _rainMm(v){v=_numRain(v);return v===null?'--':v.toFixed(1)}
function _rainObs(){return typhoonData&&typhoonData.rainObservation?typhoonData.rainObservation:null}
function _parseObsTimeMs(v){
  if(!v)return NaN;
  let t=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/.test(t))t=t.replace(' ','T')+'+08:00';
  const n=new Date(t).getTime();return Number.isFinite(n)?n:NaN;
}
function _rainObsMeta(ro){
  ro=ro||_rainObs();if(!ro)return null;
  const obsMs=_parseObsTimeMs(ro.obsTime),ageMin=Number.isFinite(obsMs)?Math.max(0,Math.round((Date.now()-obsMs)/60000)):Infinity;
  const distanceKm=Number(ro.distanceKm),hasDistance=Number.isFinite(distanceKm);
  const local=ageMin<=20&&hasDistance&&distanceKm<=10;
  const nearby=ageMin<=20&&hasDistance&&distanceKm<=20;
  const fresh=ageMin<=20;
  const r10=_numRain(ro.rain10Min!=null?ro.rain10Min:ro.precipitation),r1=_numRain(ro.rain1h),r3=_numRain(ro.rain3h),r24=_numRain(ro.rain24h);
  return {ro,obsMs,ageMin,distanceKm,hasDistance,local,nearby,fresh,r10,r1,r3,r24,raining:local&&((r10!==null&&r10>0)||(r1!==null&&r1>0))};
}
function _rainObservationAlert(cfg,userItems,isZh){
  const m=_rainObsMeta();if(!m||!m.fresh||!m.hasDistance||!m.nearby)return null;
  const station=m.ro.stationName||'雨量站';
  const where=m.local?(isZh?'本地':'local'):(isZh?'鄰近參考':'nearby reference');
  const vals=[];
  if(m.r10!==null)vals.push(`10分鐘 ${_rainMm(m.r10)}mm`);
  if(m.r1!==null)vals.push(`1小時 ${_rainMm(m.r1)}mm`);
  if(m.r3!==null)vals.push(`3小時 ${_rainMm(m.r3)}mm`);
  if(m.r24!==null)vals.push(`24小時 ${_rainMm(m.r24)}mm`);
  const base=`${station} ${m.distanceKm.toFixed(m.distanceKm<10?1:0)}km｜${where}${vals.length?'｜'+vals.join('｜'):''}`;
  // 強降雨門檻可用 20 km 內的新鮮測站作「鄰近風險」提醒；一般正在下雨只接受 10 km 內本地觀測。
  if((m.r3!==null&&m.r3>=100)||(m.r24!==null&&m.r24>=200)){
    if(cfg.heavyRain===false||userItems.heavyRain===false)return null;
    return {id:'heavyRain',level:'danger',icon:'🌧',realtimeObs:true,critical:m.local,notifyEligible:m.local,eventKey:'rainobs:heavy:'+String(m.ro.stationId||m.ro.stationName||''),revisionKey:String(m.ro.obsTime||''),title:m.local?(isZh?'本地雨量達豪雨量級（非特報）':'Local heavy-rain observation (not advisory)'):(isZh?'鄰近雨量達豪雨量級（非特報）':'Nearby heavy-rain observation (not advisory)'),detail:base};
  }
  if((m.r1!==null&&m.r1>=40)||(m.r24!==null&&m.r24>=80)){
    if(cfg.heavyRain===false||userItems.heavyRain===false)return null;
    return {id:'heavyRain',level:'warn',icon:'🌧',realtimeObs:true,notifyEligible:m.local,eventKey:'rainobs:rain:'+String(m.ro.stationId||m.ro.stationName||''),revisionKey:String(m.ro.obsTime||''),title:m.local?(isZh?'本地雨量達大雨量級（非特報）':'Local heavy-rain observation (not advisory)'):(isZh?'鄰近雨量達大雨量級（非特報）':'Nearby rain observation (not advisory)'),detail:base};
  }
  if(m.raining){
    if(cfg.rain===false||userItems.rain===false)return null;
    return {id:'rain',level:'info',icon:'🌂',realtimeObs:true,notifyEligible:false,eventKey:'rainobs:now:'+String(m.ro.stationId||m.ro.stationName||''),revisionKey:String(m.ro.obsTime||''),title:isZh?'本地雨量站正在下雨':'Local rain station reports rain',detail:base};
  }
  return null;
}

function evaluateWxAlerts(){
  const out=[],cfg=APP_CFG.wxAlerts||{};
  if(cfg.master===false)return out;
  const up=USER_PREFS||{};if(up.wxMaster===false)return out;
  const userItems=up.wxItems||{},isZh=lang==="zh";

  // 官方災防資料不依賴 Open-Meteo；即使一般天氣 API 暫時失敗，仍要顯示/判斷。
  if(cfg.typhoon!==false&&userItems.typhoon!==false){const a=evaluateTyphoonCWA(cfg,isZh);if(a)out.push(a)}
  if(cfg.earthquake!==false&&userItems.earthquake!==false){const a=evaluateEarthquake(cfg,isZh);if(a)out.push(a)}
  evaluateCwaWeatherWarnings(cfg,isZh).filter(a=>userItems[a.id]!==false).forEach(a=>{if(a.id==='typhoon'&&out.some(x=>x.id==='typhoon'))return;if(!out.some(x=>x.eventKey&&x.eventKey===a.eventKey))out.push(a)});
  const roAlert=_rainObservationAlert(cfg,userItems,isZh);if(roAlert&&!out.some(x=>x.id===roAlert.id||x.id==='storm'||x.id==='typhoon'))out.push(roAlert);
  if(!wxData)return out;

  // 找出當前小時 index
  const n=new Date();
  const nh=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0")+"T"+String(n.getHours()).padStart(2,"0");
  const hi=wxData.hTime?wxData.hTime.findIndex(s=>s.startsWith(nh)):-1;

  const curCode=wxData.code||0;
  const curTemp=wxData.temp||0;
  const curWind=(hi>=0&&wxData.hWind)?(wxData.hWind[hi]||0):0;
  const curGust=(wxData.gust||((hi>=0&&wxData.hGust)?(wxData.hGust[hi]||0):curWind));
  const curPrec=(hi>=0&&wxData.hPrec)?(wxData.hPrec[hi]||0):0;

  // 計算未來 N 小時降雨機率最大值與時間
  function maxRain(hours){
    if(hi<0||!wxData.hPrec) return {mx:0,at:null,source:'none'};
    let mx=-1,at=null,source='none';
    for(let k=hi;k<Math.min(hi+hours,wxData.hPrec.length);k++){
      const v=_normalPop(wxData.hPrec[k]);
      if(v!==null&&v>mx){mx=v;at=wxData.hTime[k];source=_popSourceAt(wxData,k)}
    }
    return {mx:Math.max(0,mx),at,source};
  }
  // 計算未來 N 小時預估最大降水量（mm/h）
  function maxPrecipMm(hours){
    if(hi<0||!wxData.hRain) return {mx:0,at:null};
    let mx=0,at=null;
    for(let k=hi;k<Math.min(hi+hours,wxData.hRain.length);k++){
      const v=parseFloat(wxData.hRain[k])||0;
      if(v>mx){mx=v;at=wxData.hTime[k]}
    }
    return {mx,at};
  }
  // 計算未來 N 小時最大陣風（強風警報用）
  function maxGust(hours){
    const arr=wxData.hGust||wxData.hWind;
    if(hi<0||!arr) return {mx:0,at:null};
    let mx=0,at=null;
    for(let k=hi;k<Math.min(hi+hours,arr.length);k++){
      const v=parseFloat(arr[k])||0;
      if(v>mx){mx=v;at=wxData.hTime[k]}
    }
    return {mx,at};
  }
  function hourLabel(iso){
    if(!iso) return "";
    const t=iso.slice(11,16);
    const dpart=iso.slice(0,10);
    const today=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
    if(dpart===today) return t;
    const dt=new Date(iso);
    return (isZh?`${dt.getMonth()+1}/${dt.getDate()} `:`${dt.getMonth()+1}/${dt.getDate()} `)+t;
  }

  // 1. 颱風跡象（Open-Meteo 推算）— 僅在「沒有 CWA 官方資料時」才用作備援
  // 若上方 evaluateTyphoonCWA 已加入 typhoon，這裡會跳過
  const cwaHas=out.some(a=>a.id==='typhoon');
  if(!cwaHas && cfg.typhoon!==false && userItems.typhoon!==false){
    const wTh=cfg.typhoonWind||62;
    const isStormCode=(curCode===95||curCode===96||curCode===99);
    const r6=maxRain(6),w6=maxGust(6);
    if((curGust>=wTh||w6.mx>=wTh) && (isStormCode||r6.mx>=80)){
      out.push({
        id:"typhoon",level:"warn",icon:"🌀",modelOnly:true,critical:false,notifyEligible:false,
        title:isZh?"劇烈風雨模型提醒":"Severe weather model notice",
        detail:isZh?`模型陣風最高 ${Math.round(Math.max(curGust,w6.mx))} km/h，伴隨${isStormCode?"雷暴訊號":"高降雨機率"}；這不是中央氣象署颱風警報`
          :`Model gust ${Math.round(Math.max(curGust,w6.mx))} km/h; not an official typhoon warning`
      });
    }
  }
  // 2. 雷雨
  if(cfg.storm!==false && userItems.storm!==false && (curCode===95||curCode===96||curCode===99)){
    out.push({
      id:"storm",level:"warn",icon:"⛈",modelOnly:true,critical:false,notifyEligible:false,
      title:isZh?"雷雨模型提醒":"Thunderstorm model notice",
      detail:isZh?"模式格點顯示雷雨訊號；請以中央氣象署警特報與雷達實況確認":"Model indicates thunderstorm conditions; verify with official warnings"
    });
  }
  // 3. 高降雨機率預報：可採 CWA 官方鄉鎮預報或 Open-Meteo 備援，但都不冒充「豪雨特報」。
  if(cfg.heavyRain!==false && userItems.heavyRain!==false && isInDetectionWindow('heavyRain') && !out.some(a=>a.id==='storm'||a.id==='typhoon')){
    const th=cfg.heavyRainProb||80;
    const r=maxRain(6),rainMm=maxPrecipMm(6),officialForecast=r.source==='cwa'&&r.mx>=th;
    if(r.mx>=th || rainMm.mx>=10){
      const srcLabel=_popSourceLabel(r.source,isZh);
      out.push({
        id:"heavyRainModel",level:"warn",icon:"🌧",modelOnly:!officialForecast,officialForecast:officialForecast,forecastOnly:true,critical:false,
        title:isZh?"高降雨機率預報":"High rain probability forecast",
        detail:isZh?`${hourLabel(r.at||rainMm.at)} 降雨機率 ${r.mx}%${rainMm.mx?`，模式預估雨量 ${rainMm.mx.toFixed(1)} mm/h`:''}｜來源：${srcLabel}；這不是中央氣象署豪雨特報`
          :`${hourLabel(r.at||rainMm.at)} rain probability ${r.mx}%${rainMm.mx?`, model precipitation ${rainMm.mx.toFixed(1)} mm/h`:''} | Source: ${srcLabel}; not a CWA rain advisory`
      });
    }
  }
  // 4. 一般降雨（未來 3h）— 若豪雨（官方或模型高降雨）已觸發則跳過避免重複
  if(cfg.rain!==false && userItems.rain!==false && isInDetectionWindow('rain') && !out.some(a=>a.id==="heavyRain"||a.id==="heavyRainModel"||a.id==="storm"||a.id==="typhoon")){
    const th=cfg.rainProb||60;
    const r=maxRain(3);
    if(r.mx>=th){
      const isCwa=r.source==='cwa',srcLabel=_popSourceLabel(r.source,isZh);
      out.push({
        id:"rain",level:"warn",icon:"🌂",modelOnly:!isCwa,officialForecast:isCwa,forecastOnly:true,
        title:isZh?"降雨預報提醒":"Peringatan Prakiraan Hujan",
        detail:isZh?`${hourLabel(r.at)} 降雨機率 ${r.mx}%，建議攜帶雨具｜${srcLabel}`
          :`Pukul ${hourLabel(r.at)} prob hujan ${r.mx}%, bawa payung | ${srcLabel}`
      });
    }
  }
  // 5. 強風（單獨成立，颱風已含則跳過）
  if(cfg.strongWind!==false && userItems.strongWind!==false && isInDetectionWindow('strongWind') && !out.some(a=>a.id==="typhoon"||a.id==="strongWind")){
    const wTh=parseFloat(cfg.windGustThreshold||cfg.windThreshold)||62;
    const w3=maxGust(3);
    const mxW=Math.max(curGust,w3.mx);
    if(mxW>=wTh){
      out.push({
        id:"strongWind",level:"warn",icon:"💨",modelOnly:true,critical:false,notifyEligible:false,
        title:isZh?"強風模型提醒":"Strong-wind model notice",
        detail:isZh?`模式最大陣風 ${Math.round(mxW)} km/h；非官方強風特報，騎車注意並固定戶外物品`
          :`Model gust ${Math.round(mxW)} km/h; not an official warning`
      });
    }
  }
  // 6. 高溫
  if(cfg.heat!==false && userItems.heat!==false && isInDetectionWindow('heat') && !out.some(a=>a.id==="heat")){
    const th=cfg.heatThreshold||36;
    if(curTemp>=th){
      out.push({
        id:"heat",level:"warn",icon:"🥵",modelOnly:true,critical:false,notifyEligible:false,
        title:isZh?"高溫實況提醒":"Heat observation notice",
        detail:isZh?`目前約 ${curTemp}°C；非官方高溫資訊，多補水並避免長時間曝曬`
          :`Current temperature ${curTemp}°C; not an official warning`
      });
    }
  }
  // 7. 低溫
  if(cfg.cold!==false && userItems.cold!==false && isInDetectionWindow('cold') && !out.some(a=>a.id==="cold")){
    const th=cfg.coldThreshold||10;
    if(curTemp<=th){
      out.push({
        id:"cold",level:"warn",icon:"🥶",modelOnly:true,critical:false,notifyEligible:false,
        title:isZh?"低溫實況提醒":"Cold observation notice",
        detail:isZh?`目前約 ${curTemp}°C；非官方低溫特報，注意保暖`
          :`Current temperature ${curTemp}°C; not an official warning`
      });
    }
  }
  // 8. 濃霧
  if(cfg.fog!==false && userItems.fog!==false && isInDetectionWindow('fog') && !out.some(a=>a.id==="fog") && (curCode===45||curCode===48)){
    out.push({
      id:"fog",level:"info",icon:"🌫",modelOnly:true,critical:false,notifyEligible:false,
      title:isZh?"濃霧模型提醒":"Fog model notice",
      detail:isZh?"模式顯示可能有霧；非官方濃霧特報，請以現場能見度為準":"Model indicates possible fog; verify on site"
    });
  }
  // ★ 官方豪大雨特報補逐時降雨機率%：特報只說「縣市有豪雨」、不給逐時機率；
  //   補上模型未來6小時最高降雨機率讓使用者掌握自己時段雨勢（維持單一橫幅、不另開重複警告）。
  const _hvy=out.find(a=>a.id==='heavyRain'&&a.official);
  if(_hvy&&hi>=0&&_hvy.detail.indexOf('降雨機率')<0&&_hvy.detail.indexOf('rain prob')<0){
    const _r6=maxRain(6),_mm6=maxPrecipMm(6);
    if(_r6.mx>0){
      const _src=_popSourceLabel(_r6.source,isZh);
      _hvy.detail+=(isZh
        ?`｜未來6小時最高降雨機率 ${_r6.mx}%${_r6.at?`（約${hourLabel(_r6.at)}）`:''}${_mm6.mx?`、模式預估雨量 ${_mm6.mx.toFixed(1)} mm/h`:''}（${_src}）`
        :`｜Next 6h max rain prob ${_r6.mx}%${_r6.at?` (~${hourLabel(_r6.at)})`:''}${_mm6.mx?`, model precipitation ${_mm6.mx.toFixed(1)} mm/h`:''} (${_src})`);
    }
  }
  return out;
}

// ═══ 警報橫幅 HTML ═══
(function(){
  if(document.getElementById('_wxAlertCss'))return;
  const s=document.createElement('style');s.id='_wxAlertCss';
  s.textContent='@keyframes wxAlertPulse{0%,100%{transform:scale(1);opacity:.45}50%{transform:scale(1.55);opacity:1}}.wx-alert-pulse .wx-alert-status-dot{animation:wxAlertPulse 1.8s ease-in-out infinite}';
  if(document.head)document.head.appendChild(s);
  else document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(s));
})();
function wxAlertHtml(){
  if(S.step!=="cal") return "";
  const alerts=evaluateWxAlerts();
  if(!alerts.length) return "";
  const isZh=lang==="zh";
  const items=alerts.map(a=>{
    const level=['danger','warn','info'].includes(a.level)?a.level:'warn';
    const detail=esc(_limitText(a.detail||'',220));
    const badge=a.official?(a.regional?(isZh?'縣市公告':'Regional notice'):(isZh?'官方警特報':'Official warning')):(a.realtimeObs?(isZh?'官方測站實況':'Station observation'):(a.officialForecast?(isZh?'官方預報':'Official forecast'):(a.modelOnly?(isZh?'模式／實況':'Model / observation'):'')));
    const moreHtml=a.bodyFull?`<details class="wx-alert-more"><summary>${isZh?'查看官方說明':'Official detail'}</summary><div>${esc(_limitText(a.bodyFull,220))}</div></details>`:'';
    return `<article class="wx-alert wx-alert-${level} ${level==='danger'?'wx-alert-pulse':''}">
      <div class="wx-alert-icon" aria-hidden="true">${a.icon}</div>
      <div class="wx-alert-copy">
        <div class="wx-alert-title-row"><span class="wx-alert-status-dot" aria-hidden="true"></span><strong>${esc(a.title)}</strong>${badge?`<span class="wx-alert-badge">${badge}</span>`:''}</div>
        <div class="wx-alert-detail">${detail}</div>${moreHtml}
      </div>
    </article>`;
  }).join("");
  return `<section class="wx-alert-stack"><div class="wx-alert-head"><div><span class="wx-alert-head-icon">⌁</span><span>${isZh?"即時災防與天氣":"Disaster & weather alerts"}</span></div><span class="wx-alert-count">${alerts.length}</span></div>${items}</section>`;
}

// ═══════════════════════════════════════════════════════════════
// 系統通知（手機推播）引擎
// 開 app 時、回到 app 時、Android 背景同步喚醒 SW 時都會檢查
// 注意：iOS 必須先把 PWA 加到主畫面（Safari 16.4+）才能收到
// ═══════════════════════════════════════════════════════════════
const ALERT_LEVEL_CRITICAL=new Set(["typhoon","storm","earthquake"]);
function isCriticalAlert(a){return !!(a&&(a.critical===true||ALERT_LEVEL_CRITICAL.has(a.id)))}

function notifyKeyForAlert(id){
  return ({typhoon:"notifyTyphoon",storm:"notifyStorm",heavyRain:"notifyHeavyRain",
    rain:"notifyRain",strongWind:"notifyStrongWind",heat:"notifyHeat",cold:"notifyCold",fog:"notifyFog",
    earthquake:"notifyEarthquake"})[id];
}

function isInQuietHours(){
  const cfg=APP_CFG.wxAlerts||{};
  const qs=cfg.quietStart;const qe=cfg.quietEnd;
  if(qs===undefined||qe===undefined||qs===qe) return false;
  const h=new Date().getHours();
  if(qs<qe) return h>=qs&&h<qe;            // 例：8-18
  return h>=qs||h<qe;                        // 例：22-7（跨午夜）
}

function getNotifyState(){
  try{return JSON.parse(localStorage.getItem('_wxNotifyState'))||{}}catch(e){return {}}
}
function setNotifyState(s){
  try{localStorage.setItem('_wxNotifyState',JSON.stringify(s))}catch(e){}
}

// 過濾出「現在應該推送系統通知」的警報
function _notifyEventKey(a){return String(a&&a.eventKey||((a&&a.id)||'alert')+':generic')}
function _notifyRevisionKey(a){return String(a&&a.revisionKey||a&&a.eqNo||a&&a.detail||'')}
function _notifyStateRevision(v){return v&&typeof v==='object'?String(v.revision||''):String(v||'')}
function _pruneNotifyState(st,now){
  st.events=st.events&&typeof st.events==='object'?st.events:{};st.lastByType=st.lastByType&&typeof st.lastByType==='object'?st.lastByType:{};
  const max=45*24*3600*1000;Object.keys(st.events).forEach(k=>{const v=st.events[k];if(v&&typeof v==='object'&&v.ts&&now-v.ts>max)delete st.events[k]});return st;
}
function _notifyHash(v){let h=2166136261;for(const c of String(v||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function filterAlertsForNotify(alerts){
  const cfg=APP_CFG.wxAlerts||{};
  if(cfg.notifyEnabled===false||cfg.master===false)return[];
  const up=USER_PREFS||{};
  if(up.wxNotify===false||up.wxMaster===false)return[];
  const userNotifyItems=up.wxNotifyItems||{},inQuiet=isInQuietHours();
  const cooldownMs=(cfg.cooldownHours||3)*3600*1000,now=Date.now(),st=_pruneNotifyState(getNotifyState(),now);
  const out=[];
  for(const a of alerts){
    if(a.notifyEligible===false)continue;
    if(a.modelOnly&&!a.official&&!a.realtimeObs)continue;
    const key=notifyKeyForAlert(a.id);
    if(!key||cfg[key]===false||userNotifyItems[a.id]===false)continue;
    if(inQuiet&&(!cfg.quietIgnoreCritical||!isCriticalAlert(a)))continue;
    const eventKey=_notifyEventKey(a),revisionKey=_notifyRevisionKey(a);
    if(a.eventKey&&_notifyStateRevision(st.events[eventKey])===revisionKey)continue;
    // 有唯一事件鍵的官方/CAP/地震/雨量事件，依版本去重；一般門檻提醒才套類型冷卻。
    if(!a.eventKey){
      const last=st.lastByType[a.id]||st[a.id]||0;
      if(now-last<cooldownMs)continue;
    }
    out.push(a);
  }
  return out;
}

// 通知權限狀態
function getNotifyPermission(){
  if(typeof Notification==='undefined') return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

// 請求權限（必須在 user gesture 內呼叫）
async function requestNotifyPermission(){
  if(typeof Notification==='undefined'){
    alert(lang==='zh'?'此裝置不支援通知（iOS 請先「加入主畫面」並使用 Safari 16.4+）':'Device not supported');
    return 'unsupported';
  }
  // iOS 提示：必須加到主畫面
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
  if(isIOS&&!standalone){
    alert(lang==='zh'?'iOS 必須先把 App 加入主畫面才能啟用通知：\nSafari → 分享 → 加入主畫面\n然後從主畫面開啟':'iOS: add to home screen first');
    return 'need-install';
  }
  try{
    const p=await Notification.requestPermission();
    if(p==='granted'){
      try{syncAlertPrefsToServiceWorker()}catch(e){}
      // 註冊 periodic background sync（Android Chrome 才有用，iOS 不支援）
      tryRegisterPeriodicSync();
      // 立即檢查一次
      checkAndNotifyAlerts();
    }
    render();
    return p;
  }catch(e){return 'error'}
}

// 嘗試註冊 periodic sync（讓 SW 在背景定期被喚醒）
async function tryRegisterPeriodicSync(){
  if(!('serviceWorker' in navigator)) return;
  try{
    const reg=await navigator.serviceWorker.ready;
    try{syncAlertPrefsToServiceWorker()}catch(e){}
    if('periodicSync' in reg){
      const status=await navigator.permissions.query({name:'periodic-background-sync'});
      if(status.state==='granted'){
        await reg.periodicSync.register('wx-alert-check',{minInterval:3600*1000}); // 1 小時
      }
    }
  }catch(e){console.log('periodicSync register err',e)}
}

// 主檢查函式 — 比對警報、過濾、推送
async function checkAndNotifyAlerts(){
  try{
    if(typeof Notification==='undefined') return;
    if(Notification.permission!=='granted') return;
    if(!wxData&&!earthquakeData&&!typhoonData)return;
    const alerts=evaluateWxAlerts();
    if(!alerts.length) return;
    const toPush=filterAlertsForNotify(alerts);
    if(!toPush.length) return;
    // 取得 SW
    let reg=null;
    if('serviceWorker' in navigator){
      try{reg=await navigator.serviceWorker.ready}catch(e){}
    }
    const now=Date.now(),st=_pruneNotifyState(getNotifyState(),now);
    for(const a of toPush){
      const title=a.icon+' '+a.title;
      const body=a.detail;
      const opts={
        body:body,
        icon:'./admin/icon-192.png',
        badge:'./admin/icon-192.png',
        tag:'wx-'+a.id+(a.eventKey?'-'+_notifyHash(a.eventKey):''),
        renotify:true,
        requireInteraction:isCriticalAlert(a), // 嚴重警報需手動關閉
        data:{type:'wx-alert',id:a.id,eventKey:a.eventKey||'',ts:now},
        vibrate:isCriticalAlert(a)?[200,100,200,100,200]:[200]
      };
      try{
        if(reg&&reg.showNotification){
          await reg.showNotification(title,opts);
        }else{
          new Notification(title,opts);
        }
        const eventKey=_notifyEventKey(a),revisionKey=_notifyRevisionKey(a);
        if(a.eventKey)st.events[eventKey]={revision:revisionKey,ts:now};
        st.lastByType[a.id]=now;
        st[a.id]=now;
        if(a.id==='earthquake'&&a.eqNo)st._eqLastNo=a.eqNo;
      }catch(e){console.log('notify err',e)}
    }
    setNotifyState(st);
  }catch(e){console.log('checkAndNotifyAlerts err',e)}
}

// 在前台顯示「啟用通知」提示卡（若未授權）
function notifyCtaHtml(){
  if(typeof Notification==='undefined') return "";
  if(S.step!=="cal") return "";
  const cfg=APP_CFG.wxAlerts||{};
  if(cfg.master===false||cfg.notifyEnabled===false) return "";
  // 用戶層：自己關掉就不提示
  const up=USER_PREFS||{};
  if(up.wxMaster===false||up.wxNotify===false) return "";
  // 已決定要做（granted/denied）就不再提示
  const p=Notification.permission;
  if(p==='granted') return "";
  // 使用者過去 7 天內手動關掉提示就不再顯示
  let dismissed=0;
  try{dismissed=parseInt(localStorage.getItem('_wxNotifyCtaDismiss'))||0}catch(e){}
  if(dismissed&&(Date.now()-dismissed)<7*24*3600*1000) return "";
  const isZh=lang==='zh';
  const text=p==='denied'
    ? (isZh?'通知已被瀏覽器封鎖，請到系統設定開啟':'Notification blocked, enable in system settings')
    : (isZh?'啟用系統通知：App 開啟時約 30 秒檢查官方資料；App 關閉後即時性由手機背景機制或伺服器推播決定':'Enable notifications; foreground checks official data about every 30 seconds');
  const btn=p==='denied'
    ? ''
    : `<button onclick="requestNotifyPermission();event.stopPropagation()" style="background:#fff;color:#00695c;border:none;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;margin-top:6px">${isZh?'啟用通知':'Enable'}</button>`;
  return `<div onclick="(function(){try{localStorage.setItem('_wxNotifyCtaDismiss',Date.now())}catch(e){};render()})()" style="margin:6px 0;padding:10px 12px;background:linear-gradient(135deg,#00897b,#00695c);color:#fff;border-radius:8px;font-size:11px;line-height:1.5;cursor:pointer">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="flex:1"><div style="font-weight:700;font-size:12px">🔔 ${isZh?'災防警報通知':'Disaster Alerts'}</div><div style="margin-top:2px;opacity:0.92">${text}</div>${btn}</div>
      <div style="font-size:14px;opacity:0.7;flex-shrink:0">✕</div>
    </div></div>`;
}

// ═══════════════════════════════════════════════════════════════
// 用戶個人設定面板（前台 modal）
// 入口：天氣卡右上 ⚙️
// ═══════════════════════════════════════════════════════════════
let showUserPrefs=false;
function openUserPrefs(){showUserPrefs=true;render()}
function closeUserPrefs(){showUserPrefs=false;render()}
try{window.openUserPrefs=openUserPrefs;window.closeUserPrefs=closeUserPrefs}catch(e){}

// 警報項目定義（與後台一致）
// 各警報項目的視覺主題色（同時用於開關 ON 顏色與圖示底色）
const _USR_ALERTS=[
  {id:'earthquake',icon:'🌍',titleZh:'地震警報',titleId:'Gempa Bumi',color:'#c0392b',bgTint:'rgba(192,57,43,0.12)'},
  {id:'typhoon',icon:'🌀',titleZh:'颱風',titleId:'Topan',color:'#8e44ad',bgTint:'rgba(142,68,173,0.12)'},
  {id:'storm',icon:'⛈',titleZh:'雷雨',titleId:'Badai',color:'#e67e22',bgTint:'rgba(230,126,34,0.12)'},
  {id:'heavyRain',icon:'🌧',titleZh:'豪大雨/高降雨',titleId:'Rain Advisory',color:'#2980b9',bgTint:'rgba(41,128,185,0.12)'},
  {id:'rain',icon:'🌂',titleZh:'一般降雨',titleId:'Hujan',color:'#3498db',bgTint:'rgba(52,152,219,0.12)'},
  {id:'strongWind',icon:'💨',titleZh:'強風',titleId:'Angin Kencang',color:'#16a085',bgTint:'rgba(22,160,133,0.12)'},
  {id:'heat',icon:'🥵',titleZh:'高溫',titleId:'Panas',color:'#d35400',bgTint:'rgba(211,84,0,0.12)'},
  {id:'cold',icon:'🥶',titleZh:'低溫',titleId:'Dingin',color:'#1abc9c',bgTint:'rgba(26,188,156,0.12)'},
  {id:'fog',icon:'🌫',titleZh:'濃霧',titleId:'Kabut',color:'#7f8c8d',bgTint:'rgba(127,140,141,0.12)'}
];

// 暗色模式友善的迷你開關 — 可選自訂 ON 顏色
function _miniSwitch(checked,onclickStr,disabled,onColor){
  const dis=disabled?'opacity:0.35;pointer-events:none':'';
  const bg=checked?(onColor||'#00897b'):'var(--tx3)';
  const left=checked?'21px':'3px';
  return `<span onclick="${onclickStr}" style="display:inline-block;position:relative;width:42px;height:24px;background:${bg};border-radius:12px;cursor:pointer;transition:.2s;flex-shrink:0;border:1px solid rgba(0,0,0,0.1);${dis}"><span style="position:absolute;width:18px;height:18px;left:${left};top:2px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.35)"></span></span>`;
}

function userPrefsModalHtml(){
  if(!showUserPrefs) return "";
  const isZh=lang==='zh';
  const up=USER_PREFS;
  const cfg=APP_CFG.wxAlerts||{};
  const adminVisualOn=APP_CFG.visualFx&&APP_CFG.visualFx.enabled!==false;
  const adminWxOn=cfg.master!==false;
  const adminNotifyOn=cfg.notifyEnabled!==false;

  // ── 目前狀況診斷區（暗色模式友善）──
  let statusHtml='';
  if(wxData){
    const curT=wxData.temp;
    const heatTh=cfg.heatThreshold||36;
    const coldTh=cfg.coldThreshold||10;
    const heatDiff=heatTh-curT;
    const coldDiff=curT-coldTh;
    let curPrec=0,curPopSource='none';
    if(wxData.hTime&&wxData.hPrec){
      const n=new Date();
      const nh=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0")+"T"+String(n.getHours()).padStart(2,"0");
      const hi=wxData.hTime.findIndex(s=>s.startsWith(nh));
      if(hi>=0){curPrec=_normalPop(wxData.hPrec[hi])||0;curPopSource=_popSourceAt(wxData,hi)}
    }
    const obsMeta=_rainObsMeta();
    const obsStatus=obsMeta&&obsMeta.local?(isZh?(obsMeta.raining?`本地實測下雨（10分 ${_rainMm(obsMeta.r10)}mm）`:'本地雨量站未測得降雨'):(obsMeta.raining?'Local rain observed':'Local station dry')):(isZh?'無可信本地雨量實測':'No trusted local rain observation');
    const evaluated=(typeof evaluateWxAlerts==='function')?evaluateWxAlerts():[];
    const activeCount=evaluated.length;
    statusHtml=`<div style="padding:12px;background:var(--card);border:1px solid rgba(127,140,141,0.25);border-left:4px solid #3498db;border-radius:8px;margin-bottom:10px;font-size:11px;line-height:1.6;color:var(--tx)">
      <div style="font-weight:700;font-size:12px;margin-bottom:6px;color:var(--tx)">📊 ${isZh?'目前狀況':'Status'}</div>
      <div style="color:var(--tx)">${isZh?'目前溫度':'Temp'}：<strong style="color:#ff6b35;font-size:14px">${curT}°C</strong>　${isZh?'預報降雨機率':'Forecast rain'}：<strong style="color:#3498db;font-size:14px">${curPrec}%</strong></div>
      <div style="margin-top:2px;color:var(--tx3);font-size:9px">${_popSourceLabel(curPopSource,isZh)}｜${obsStatus}</div>
      <div style="margin-top:4px;color:var(--tx2);font-size:10px">${isZh?`🥵 高溫門檻 ${heatTh}°C ${heatDiff>0?'(再 '+heatDiff+'°C 觸發)':'✓ 已達標'}　🥶 低溫門檻 ${coldTh}°C ${coldDiff>0?'(再 '+coldDiff+'°C 觸發)':'✓ 已達標'}`:`Heat ${heatTh}°C, Cold ${coldTh}°C`}</div>
      <div style="margin-top:6px;padding:5px 10px;background:${activeCount>0?'rgba(192,57,43,0.15)':'rgba(39,174,96,0.15)'};border-radius:5px;color:${activeCount>0?'#e74c3c':'#27ae60'};font-weight:700;font-size:11px;display:inline-block">${activeCount>0?(isZh?`🚨 ${activeCount} 個警報觸發中`:`${activeCount} active`):(isZh?'✅ 目前無警報':'No alerts')}</div>
      ${(()=>{
        if(!wxData)return'';
        const st=geoState.status;
        let icon='📍',extra='';
        if(st==='ok'&&(geoState.source==='gps'||geoState.source==='gps-force')){icon='✅';extra=isZh?'（GPS 即時定位'+(geoState.accuracy?'，精度約 '+geoState.accuracy+'m':'')+'）':'(GPS'+(geoState.accuracy?', ~'+geoState.accuracy+'m':'')+')';}
        else if(st==='ok'&&geoState.source==='cache'){icon='📍';extra=isZh?'（使用 30 分鐘內記錄位置）':'(cached <=30m)';}
        else if(st==='denied'){icon='🚫';extra=isZh?'　定位權限被拒，請到手機設定→瀏覽器/APP→允許位置，再按「重新抓取」':' Location denied — enable in settings';}
        else if(st==='fallback'){icon='⚠️';extra='　'+(geoState.msg||'')+(isZh?'，未使用固定地點，請按「重新抓取」重試':'');}
        else if(st==='locating'){icon='🔄';extra=isZh?'定位中...':'Locating...';}
        const placeTxt=_gpsPlaceText();
        const placeLine=placeTxt?`｜${isZh?'所在地':'Area'}：${esc(placeTxt)}`:'';
        return`<div style="margin-top:8px;padding-top:6px;border-top:1px dashed rgba(127,140,141,0.25);color:var(--tx3);font-size:10px">${icon} ${isZh?'目前定位':'Location'}：${wxData.lat}, ${wxData.lon}${placeLine}${extra}</div>`;
      })()}
    </div>`;
  }

  // ── 動作按鈕（重抓 + 測試通知）──
  const permState=getNotifyPermission();
  const btnStyle='border:none;padding:10px 12px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2);transition:transform .15s';
  const testBtnHtml=permState==='granted'?`<div style="display:flex;gap:8px;margin-bottom:14px">
    <button onclick="forceReloadWx()" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform=''" style="flex:1;background:linear-gradient(135deg,#16a085,#0d6b5e);${btnStyle}">🔄 ${isZh?'重新抓取':'Reload'}</button>
    <button onclick="testNotification()" onmousedown="this.style.transform='scale(0.96)'" onmouseup="this.style.transform=''" style="flex:1;background:linear-gradient(135deg,#3949ab,#1a237e);${btnStyle}">🔔 ${isZh?'測試通知':'Test'}</button>
  </div>`:`<button onclick="forceReloadWx()" style="background:linear-gradient(135deg,#16a085,#0d6b5e);${btnStyle};width:100%;margin-bottom:14px">🔄 ${isZh?'立即重新抓天氣':'Reload weather'}</button>`;

  // ── 各警報項目（每項有自己的色彩主題）──
  const alertRows=_USR_ALERTS.map((a,idx)=>{
    const adminItemOn=cfg[a.id]!==false;
    const adminNotifyKey=({typhoon:'notifyTyphoon',storm:'notifyStorm',heavyRain:'notifyHeavyRain',rain:'notifyRain',strongWind:'notifyStrongWind',heat:'notifyHeat',cold:'notifyCold',fog:'notifyFog',earthquake:'notifyEarthquake'})[a.id];
    const adminNotifyItemOn=cfg[adminNotifyKey]!==false;
    const userItemOn=(up.wxItems&&up.wxItems[a.id]!==false);
    const userNotifyOn=(up.wxNotifyItems&&up.wxNotifyItems[a.id]!==false);
    const adminBlocked=!adminItemOn;
    const adminNotifyBlocked=!adminNotifyItemOn;
    const title=isZh?a.titleZh:a.titleId;
    const isLast=idx===_USR_ALERTS.length-1;
    return `<div style="padding:12px;background:${a.bgTint};border-radius:8px;margin-bottom:${isLast?'0':'6px'};border-left:4px solid ${a.color}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:22px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:${a.color};border-radius:50%;flex-shrink:0">${a.icon}</div>
        <div style="flex:1;font-size:14px;font-weight:700;color:var(--tx)">${title}</div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;padding-left:42px">
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;color:${adminBlocked?'var(--tx3)':'var(--tx2)'};font-weight:600">${isZh?'橫幅':'Banner'}</span>${_miniSwitch(userItemOn&&!adminBlocked,"setUserPref('wxItems."+a.id+"',!USER_PREFS.wxItems."+a.id+")",adminBlocked,a.color)}</div>
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;color:${adminNotifyBlocked?'var(--tx3)':'var(--tx2)'};font-weight:600">${isZh?'通知':'Push'}</span>${_miniSwitch(userNotifyOn&&!adminNotifyBlocked,"setUserPref('wxNotifyItems."+a.id+"',!USER_PREFS.wxNotifyItems."+a.id+")",adminNotifyBlocked,a.color)}</div>
      </div>
      ${(adminBlocked||adminNotifyBlocked)?`<div style="padding-left:42px;margin-top:6px;font-size:10px;color:var(--amber);font-weight:600">⚠ ${isZh?'管理員已停用此項':'Admin disabled'}</div>`:''}
    </div>`;
  }).join('');

  // ── 動畫區塊（拆分開關） ──
  const userVisualOn=up.visualFx!==false;
  const visualBlocked=!adminVisualOn;
  const fxDetail=Object.assign({weather:true,animals:true,seasonal:true,sound:true},up.fxDetail||{});
  const fxRows=[
    {key:'weather',icon:'🌦️',color:'#3498db',titleZh:'天氣動畫',titleId:'Animasi cuaca',descZh:'雨、雪、雷電、霧、強風、冷熱效果',descId:'Hujan, salju, petir, kabut, angin, panas/dingin'},
    {key:'animals',icon:'🦋',color:'#e67e22',titleZh:'動物動畫',titleId:'Animasi hewan',descZh:'蝴蝶、蜻蜓、青蛙、螢火蟲',descId:'Kupu-kupu, capung, katak, kunang-kunang'},
    {key:'seasonal',icon:'🍁',color:'#27ae60',titleZh:'季節動畫',titleId:'Animasi musim',descZh:'花瓣、花朵、落葉、霜、雲層',descId:'Kelopak, bunga, daun, embun beku, awan'},
    {key:'sound',icon:'🔊',color:'#8e44ad',titleZh:'環境音效',titleId:'Suara ambience',descZh:'雨聲、風聲、鳥鳴、蟲鳴',descId:'Suara hujan, angin, burung, serangga'}
  ].map(item=>`<div style="padding:10px 12px;background:rgba(255,255,255,0.55);border-radius:8px;display:flex;align-items:center;gap:10px;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">
        <div style="font-size:18px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:${item.color};color:#fff;border-radius:50%;flex-shrink:0">${item.icon}</div>
        <div style="min-width:0;flex:1">
          <div style="font-size:12px;font-weight:700;color:var(--tx)">${isZh?item.titleZh:item.titleId}</div>
          <div style="font-size:10px;color:var(--tx2);margin-top:2px;line-height:1.35">${isZh?item.descZh:item.descId}</div>
        </div>
      </div>
      ${_miniSwitch(fxDetail[item.key]!==false,`setUserPref('fxDetail.${item.key}',!USER_PREFS.fxDetail.${item.key})`,visualBlocked,item.color)}
    </div>`).join('');
  const visualSection=`<div style="padding:12px;background:rgba(155,89,182,0.12);border-radius:8px;border-left:4px solid #9b59b6">
    <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px;flex:1">
        <div style="font-size:22px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#9b59b6;border-radius:50%;flex-shrink:0">🎨</div>
        <div style="flex:1"><div style="font-size:14px;font-weight:700;color:var(--tx)">${isZh?'動畫與音效':'Animasi & Suara'}</div><div style="font-size:10px;color:var(--tx2);margin-top:2px;line-height:1.4">${isZh?'日夜模式直接切換，不再漸暗；下方可分開控制各類效果':'Mode siang/malam langsung ganti; kategori efek dipisah'}</div></div>
      </div>
      ${_miniSwitch(userVisualOn&&!visualBlocked,"setUserPref('visualFx',!USER_PREFS.visualFx)",visualBlocked,'#9b59b6')}
    </div>
    <div style="font-size:10px;color:var(--tx3);margin:0 0 8px 42px">${isZh?(userVisualOn?'總開關已開啟，可再細分控制。':'總開關已關閉，下列分類暫不生效。'):(userVisualOn?'Master aktif, kategori bisa diatur terpisah.':'Master nonaktif, kategori di bawah tidak berjalan.')}</div>
    <div style="display:grid;gap:8px">${fxRows}</div>
    ${visualBlocked?`<div style="margin-top:8px;padding-left:42px;font-size:10px;color:var(--amber);font-weight:600">⚠ ${isZh?'管理員已停用動畫':'Admin disabled'}</div>`:`<div style="margin-top:8px;padding-left:42px;font-size:10px;color:var(--tx3)">${isZh?'可依需求只留天氣、只留動物，或單獨關閉音效。':'Atur cuaca/hewan/suara secara terpisah.'}</div>`}
  </div>`;


  // ── 通知權限狀態 ──
  let permTip='';
  if(permState==='granted'){
    permTip=`<div style="padding:10px 12px;background:rgba(39,174,96,0.15);border:1px solid rgba(39,174,96,0.4);border-radius:8px;font-size:11px;color:#27ae60;margin-bottom:10px;font-weight:600">✅ ${isZh?'系統通知已授權':'Notification allowed'}</div>`;
  }else if(permState==='denied'){
    permTip=`<div style="padding:10px 12px;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.4);border-radius:8px;font-size:11px;color:#e74c3c;margin-bottom:10px;font-weight:600;line-height:1.5">🚫 ${isZh?'通知被瀏覽器封鎖，請到手機系統設定開啟':'Notification blocked'}</div>`;
  }else if(permState==='unsupported'){
    permTip=`<div style="padding:10px 12px;background:rgba(243,156,18,0.15);border:1px solid rgba(243,156,18,0.4);border-radius:8px;font-size:11px;color:#e67e22;margin-bottom:10px;font-weight:600;line-height:1.5">⚠ ${isZh?'此裝置不支援通知':'Device not supported'}</div>`;
  }else{
    permTip=`<div style="padding:10px 12px;background:rgba(52,152,219,0.15);border:1px solid rgba(52,152,219,0.4);border-radius:8px;font-size:11px;color:#3498db;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600;line-height:1.4"><span>🔔 ${isZh?'尚未授權通知':'Tap to enable'}</span><button onclick="requestNotifyPermission()" style="background:#3498db;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">${isZh?'啟用':'Enable'}</button></div>`;
  }

  // ── 總開關（兩個並排）──
  const masterRow=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div style="padding:12px;background:linear-gradient(135deg,#c0392b,#922b21);border-radius:8px;color:#fff;${!adminWxOn?'opacity:0.4':''}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <div style="font-size:18px">🚨</div>
        <div style="font-size:11px;font-weight:700;line-height:1.2">${isZh?'警報橫幅':'Banner'}</div>
      </div>
      <div style="display:flex;justify-content:flex-end">${_miniSwitch(up.wxMaster!==false&&adminWxOn,"setUserPref('wxMaster',!USER_PREFS.wxMaster)",!adminWxOn,'#fff')}</div>
      ${!adminWxOn?`<div style="margin-top:4px;font-size:9px;font-weight:600;opacity:0.9">⚠ ${isZh?'管理員停用':'Admin off'}</div>`:''}
    </div>
    <div style="padding:12px;background:linear-gradient(135deg,#2980b9,#1f5d8a);border-radius:8px;color:#fff;${!adminNotifyOn?'opacity:0.4':''}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <div style="font-size:18px">📱</div>
        <div style="font-size:11px;font-weight:700;line-height:1.2">${isZh?'手機通知':'Push'}</div>
      </div>
      <div style="display:flex;justify-content:flex-end">${_miniSwitch(up.wxNotify!==false&&adminNotifyOn,"setUserPref('wxNotify',!USER_PREFS.wxNotify)",!adminNotifyOn,'#fff')}</div>
      ${!adminNotifyOn?`<div style="margin-top:4px;font-size:9px;font-weight:600;opacity:0.9">⚠ ${isZh?'管理員停用':'Admin off'}</div>`:''}
    </div>
  </div>`;

  // ── 區塊標題樣式 ──
  const sectionTitleStyle='font-size:11px;color:var(--tx2);margin:14px 4px 8px;font-weight:800;letter-spacing:.8px;display:flex;align-items:center;gap:6px';

  return `<div class="modal-bg" onclick="closeUserPrefs()">
    <div class="modal-sheet help-sheet" onclick="event.stopPropagation()" style="max-width:480px">
      <div class="modal-handle"></div>
      <div class="modal-title" style="margin-bottom:14px">⚙️ ${isZh?'個人設定':'Pengaturan'}</div>
      ${permTip}
      ${statusHtml}
      ${testBtnHtml}
      <div style="${sectionTitleStyle}">⚡ ${isZh?'總開關':'MASTER'}</div>
      ${masterRow}
      <div style="${sectionTitleStyle}">🔔 ${isZh?'各警報項目':'EACH ALERT'}</div>
      ${alertRows}
      <div style="${sectionTitleStyle}">🎨 ${isZh?'外觀':'APPEARANCE'}</div>
      ${visualSection}
      <button class="modal-done" onclick="closeUserPrefs()" style="margin-top:18px">${t('done')}</button>
    </div>
  </div>`;
}

// 測試通知（用戶從前台設定面板呼叫）
async function testNotification(){
  if(typeof Notification==='undefined'){alert(lang==='zh'?'此裝置不支援通知':'Not supported');return}
  if(Notification.permission!=='granted'){alert(lang==='zh'?'尚未授權通知':'Permission denied');return}
  try{
    let reg=null;
    if('serviceWorker' in navigator){
      try{reg=await navigator.serviceWorker.ready}catch(e){}
    }
    const title=lang==='zh'?'🔔 測試通知':'🔔 Test';
    const opts={
      body:lang==='zh'?'這是測試通知。如果你看到這個，表示通知系統正常運作。':'Test notification works',
      icon:'./admin/icon-192.png',
      badge:'./admin/icon-192.png',
      tag:'wx-test',
      requireInteraction:false,
      vibrate:[200,100,200]
    };
    if(reg&&reg.showNotification){await reg.showNotification(title,opts)}
    else{new Notification(title,opts)}
  }catch(e){alert((lang==='zh'?'發送失敗：':'Failed: ')+e.message)}
}

// 強制重新抓天氣（用戶從設定面板呼叫）
// 清掉快取後重抓 → 取得最新資料 → 重新評估警報
async function forceReloadWx(){
  try{
    // 清掉位置與天氣快取（重新定位 + 重新抓 API）
    try{localStorage.removeItem('_wxPos')}catch(e){}
    try{localStorage.removeItem('_wxPlace')}catch(e){}
    try{localStorage.removeItem('_wxCache')}catch(e){}
    try{localStorage.removeItem('_typhoonCache')}catch(e){}
    try{localStorage.removeItem('_cwaCache')}catch(e){}
    // 也清警報冷卻狀態，這樣即使在冷卻期內也能立刻推（除了地震去重）
    try{
      const st=JSON.parse(localStorage.getItem('_wxNotifyState'))||{};
      // 保留地震 EarthquakeNo 去重，其他冷卻清零
      const eq=st._eqLastNo;
      localStorage.setItem('_wxNotifyState',JSON.stringify(eq?{_eqLastNo:eq}:{}));
    }catch(e){}
    wxData=null;wxErr=false;
    geoState={status:'locating',code:null,msg:'',source:''};
    typhoonData=null;earthquakeData=null;
    render();
    await loadWx({force:true});
    try{await loadCwaData({force:true})}catch(e){}
    // 依定位結果回報，讓使用者知道有沒有抓到真實位置
    if(geoState.status==='ok'&&(geoState.source==='gps'||geoState.source==='gps-force'))alert(lang==='zh'?'✅ 已高精度定位並抓取最新天氣':'Located & reloaded');
    else if(geoState.status==='denied')alert(lang==='zh'?'⚠️ 定位權限被拒絕\n請到手機「設定→應用程式/瀏覽器→權限→位置」開啟，再試一次':'Location permission denied');
    else if(geoState.status==='fallback')alert((lang==='zh'?'⚠️ 定位失敗：':'Location failed: ')+(geoState.msg||'')+(lang==='zh'?'\n官方所在地警特報不會用鹽水或其他固定地點代替。':''));
    else alert(lang==='zh'?'已重新抓取最新資料':'Reloaded');
  }catch(e){
    alert((lang==='zh'?'重新抓取失敗：':'Reload failed: ')+e.message);
  }
}
try{window.testNotification=testNotification;window.forceReloadWx=forceReloadWx}catch(e){}


function rainObsHtml(){
  const m=_rainObsMeta();if(!m)return'';
  const isZh=lang==='zh',ro=m.ro;
  const station=esc(ro.stationName||'雨量站');
  const town=esc([ro.countyName,ro.townName].filter(Boolean).join(''));
  const dist=m.hasDistance?`${m.distanceKm.toFixed(m.distanceKm<10?1:0)}km`:'';
  const obs=ro.obsTime?`${isZh?'觀測':'Obs'} ${esc(_fmtTimeShort(ro.obsTime))}`:'';
  let trust,icon,bg,bc;
  if(m.local){trust=isZh?'本地實測':'Local observation';icon=m.raining?'🌧':'✅';bg=m.raining?'rgba(41,128,185,0.10)':'rgba(46,125,50,0.08)';bc=m.raining?'#2980b9':'#2e7d32';}
  else if(m.nearby){trust=isZh?'鄰近參考，不判定所在地正在下雨':'Nearby reference only';icon='📍';bg='rgba(245,124,0,0.08)';bc='#f57c00';}
  else if(!m.fresh){trust=isZh?`資料偏舊（約 ${Number.isFinite(m.ageMin)?m.ageMin:'--'} 分鐘）`:'Observation is stale';icon='🕒';bg='rgba(127,140,141,0.08)';bc='#95a5a6';}
  else{trust=isZh?'測站較遠，僅供參考':'Station too far; reference only';icon='📡';bg='rgba(127,140,141,0.08)';bc='#95a5a6';}
  return `<div class="wx-rain-observation" style="background:${bg};border-left-color:${bc}">
    <div class="wx-rain-observation-head"><b>${icon} ${isZh?'即時雨量站':'Live rain station'}</b><span>${esc(trust)}</span></div>
    <div>${station}${town?`（${town}）`:''}${dist?` · ${dist}`:''}${obs?` · ${obs}`:''}</div>
    <div class="wx-rain-values"><span>10m <b>${_rainMm(m.r10)}</b>mm</span><span>1h <b>${_rainMm(m.r1)}</b>mm</span><span>3h <b>${_rainMm(m.r3)}</b>mm</span><span>24h <b>${_rainMm(m.r24)}</b>mm</span></div>
  </div>`;
}
function _rainDbgBox(msg){
  return`<div class="fi" style="margin:4px 0;padding:7px 10px;background:#fff3cd;border-left:3px solid #f0ad4e;border-radius:3px;font-size:10px;font-weight:600;color:#8a6d3b">🐞 ☔偵錯：${msg}</div>`;
}
function rainWarnHtml(){
  const _dbg=(typeof location!=='undefined'&&location.search.indexOf('raindbg=1')>=0);  // 網址加 ?raindbg=1 開偵錯
  if(!wxData||!wxData.hPrec||S.step!=="cal")return _dbg?_rainDbgBox(`wxData/hPrec 未就緒或非月曆頁`):"";
  const sh=gs(TY,TM,TD);if(!sh||sh==="休")return _dbg?_rainDbgBox(`今天(${TY}/${TM}/${TD})班別=「${sh||'無'}」→休假或無班，不顯示`):"";
  const hrs=SHIFT_HR[sh];if(!hrs)return _dbg?_rainDbgBox(`SHIFT_HR 找不到班別鍵「${sh}」`):"";
  const ds=`${TY}-${String(TM).padStart(2,"0")}-${String(TD).padStart(2,"0")}`;
  let mx=0,mxSource='none';const _rows=[];
  hrs.forEach(h=>{const k=ds+"T"+String(h).padStart(2,"0")+":00";const i=wxData.hTime.indexOf(k);if(i>=0){const v=_normalPop(wxData.hPrec[i]);if(v!==null&&v>mx){mx=v;mxSource=_popSourceAt(wxData,i)}_rows.push(`${String(h).padStart(2,"0")}時=${v===null?'--':v}%`)}else{_rows.push(`${String(h).padStart(2,"0")}時=查無此刻`)}});
  if(_dbg)return _rainDbgBox(`今天=${ds}｜班別=${sh}｜出門時段${hrs.join('/')}時｜${_rows.join('，')}｜最大=${mx}%｜門檻40%→${mx>=40?'達標應顯示':'未達標故不顯示'}`);
  if(mx<40)return"";
  const sn=lang==="zh"?{"早":"早班","中":"中班","晚":"晚班"}[sh]:{"早":"Pagi","中":"Siang","晚":"Malam"}[sh];
  const tr=`${String(hrs[0]).padStart(2,"0")}:00-${String(hrs[hrs.length-1]+1).padStart(2,"0")}:00`;
  const srcLabel=_popSourceLabel(mxSource,lang==='zh');
  const tip=lang==="zh"?`🌂 ${sn}出門注意！${tr} 降雨機率 ${mx}%，建議攜帶雨具｜${srcLabel}`:`🌂 ${sn}: hujan ${mx}% (${tr}), bawa payung! | ${srcLabel}`;
  // v211：改用與上方警報橫幅一致的「固定淺底＋深字」配色。
  //   原本用 var(--red-l)/var(--red) 這類會隨暗色模式變暗的主題變數 → 暗色下對比不足看不清；
  //   警報橫幅本來就用寫死淺底深字，這裡對齊它，暗色亮色都清楚、視覺也統一。
  const _hi70=mx>=70;
  const bg=_hi70?"linear-gradient(90deg,#ffebee,#ffcdd2)":"linear-gradient(90deg,#fff8e1,#ffe082)";
  const bc=_hi70?"#c62828":"#f57f17";
  const tc=_hi70?"#b71c1c":"#bf360c";
  return`<div class="rain-warn fi" style="margin:4px 0;padding:8px 12px;background:${bg};border-left:4px solid ${bc};border-radius:6px;font-size:11px;font-weight:700;line-height:1.5;color:${tc}">${tip}</div>`
}
function wxHtml(){
  if(wxErr)return`<div class="wx-card fi"><div class="wx-err" style="text-align:center;padding:12px">🌡️ ${lang==="zh"?"天氣載入失敗":"Gagal muat cuaca"}<br><button data-a="wxR" style="margin-top:8px;padding:6px 16px;background:var(--pri);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">${lang==="zh"?"重新載入":"Muat Ulang"}</button></div></div>`;
  if(!wxData)return`<div class="wx-card fi"><div class="wx-loading">🌡️ ${lang==="zh"?"載入天氣中...":"Memuat cuaca..."}</div></div>`;
  const d=wxData,wk=t("wk"),desc=lang==="zh"?WXZ:WXD;
  const fc=d.days.map((f,i)=>{const dt=new Date(f.date),dw=dt.getDay();
    return`<div class="wx-day${i===0?' today':''}"><div class="wx-day-name">${i===0?(lang==="zh"?"今天":"Hari ini"):wk[dw]}</div><div class="wx-day-icon">${WXI[f.code]||"🌡"}</div><div class="wx-day-hi">${f.hi}°</div><div class="wx-day-lo">${f.lo}°</div></div>`}).join("");
  return`<div class="wx-card fi" style="cursor:pointer;position:relative"><button onclick="openUserPrefs();event.stopPropagation()" class="card-settings-button wx-settings-button" title="${lang==='zh'?'天氣與警報設定':'Pengaturan cuaca'}" aria-label="${lang==='zh'?'天氣與警報設定':'Pengaturan cuaca'}">${uiIcon("settings",18)}</button><div onclick="showWxDetail()"><div class="wx-head"><div class="wx-now"><div class="wx-now-icon">${WXI[d.code]||"🌡"}</div><div><div class="wx-now-temp">${d.temp}°C${d._cached?` <span style="font-size:9px;color:var(--tx3)">(${lang==="zh"?"快取":"cache"}${d._cacheAgeMin?" "+d._cacheAgeMin+"m":""})</span>`:""}</div><div class="wx-now-desc">${desc[d.code]||""}</div></div></div><div class="wx-loc">${lang==="zh"?(_popSourceAt(d,_wxHourIndex())==='cwa'?"雨量實測＋CWA預報 ▸":"雨量實測＋模式備援 ▸"):(_popSourceAt(d,_wxHourIndex())==='cwa'?"Rain obs + CWA forecast ▸":"Rain obs + model fallback ▸")}${d.updatedAt?`<br><span style="font-size:9px;color:var(--tx3)">${lang==="zh"?"預報更新":"Forecast"} ${new Date(d.updatedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>`:""}</div></div>${rainObsHtml()}<div class="wx-fc">${fc}</div></div><a href="radar2.html" style="display:flex;align-items:center;justify-content:center;gap:6px;margin:0 10px 10px;padding:9px 12px;background:linear-gradient(135deg,#0b2942,#123a5a);color:#dff3ff;border:1px solid rgba(95,208,255,.35);border-radius:9px;font-size:12px;font-weight:700;text-decoration:none;letter-spacing:.3px">🛰 ${lang==='zh'?'即時雷達回波圖':'Live radar map'} ▸</a></div>${tideHtml()}`}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
try{
  const _ver='v225-complete-ui';
  if(localStorage.getItem('_myshiftWxVer')!==_ver){
    ['_wxPlace','_cwaCache','_wxCache'].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});
    localStorage.setItem('_myshiftWxVer',_ver);
  }
}catch(e){}
loadWx({force:true});
// 等 loadAppConfig 載入完才知道有沒有 typhoon worker URL
setTimeout(()=>{try{loadTyphoon()}catch(e){}},3000);
setInterval(()=>{if(!document.hidden)loadWx();},900000);
const _officialPollMs=Math.max(15000,(parseInt((APP_CFG.wxAlerts||{}).foregroundAlertPollSeconds)||30)*1000);
setInterval(()=>{if(!document.hidden)try{loadCwaData({force:true})}catch(e){}},_officialPollMs);
setInterval(()=>{if(!document.hidden){try{checkAndNotifyAlerts()}catch(e){}try{if(typeof render==='function')render()}catch(e){}}},60000);
let _lastWxCheck=Date.now();
function _requestImmediateAlertCheck(forceWeather){
  if(document.hidden)return;
  const now=Date.now();
  if(forceWeather||now-_lastWxCheck>600000){_lastWxCheck=now;loadWx()}
  try{loadCwaData({force:true})}catch(e){}
  try{checkAndNotifyAlerts()}catch(e){}
  try{if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage({type:'CHECK_ALERTS_NOW'})}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)_requestImmediateAlertCheck(false)});
window.addEventListener('focus',()=>_requestImmediateAlertCheck(false));
window.addEventListener('pageshow',()=>_requestImmediateAlertCheck(false));
window.addEventListener('online',()=>_requestImmediateAlertCheck(true));
// 啟動時若已授權通知，順便嘗試註冊背景同步
if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
  setTimeout(()=>{try{tryRegisterPeriodicSync()}catch(e){}},2000);
}
loadAdminEv();


// ═══ SHARE CALENDAR ═══
async function shareCalendar(){
  try{
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
  const rn=(RN[lang]&&RN[lang][S.rt])||S.rt||"";cx.fillText(rn,W/2,46);
  
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
  }catch(err){
    console.log("share err",err);
    alert((lang==="zh"?"分享失敗：":"Share failed: ")+(err&&err.message||"unknown"));
  }
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
    const dailyOT=Math.max(0,sh-8),uid=fbUser&&fbUser.uid;let actualOT=0;
    if(dailyOT>0)for(let d=1;d<=dm;d++){const ss=gs(y,mo,d);if(ss&&ss!=="休")actualOT+=getActualOTForDay(ek(y,mo,d),dailyOT,sh,uid)}
    const tH=wd*sh,oH=sh===12?Math.round(actualOT*10)/10:0;
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
  const alRst=AL_RESET_TS[aly]||0;// 若有重置紀錄，只計算重置後的 ALD
  let alUsedCalc=0;
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
  let wxCode=0, wxTemp=0, wxWind=0;
  let lightningTimer=0, lightningAlpha=0;
  let heatPhase=0;
  let ambientHour=-1;
  // ── Real photo FX assets ──
  const FX_IMG={swallowtail:[],purple:[],monarch:[],maple:[],cloud:[],bolt:[],drop:null,
    blossom:[],flower:[],dfly:[],frost_img:[],debris_img:[],frog:[],pleaf:[],lpad:[],
    firefly:[],sun:[]};
  function _preloadFx(){
    const kinds=[
      {key:"swallowtail",dir:"butterfly/",prefix:"swallowtail-",count:6},
      {key:"purple",dir:"butterfly/",prefix:"purple-",count:6},
      {key:"monarch",dir:"butterfly/",prefix:"monarch-",count:6},
      {key:"maple",dir:"maple/",prefix:"maple-",count:4},
      {key:"cloud",dir:"cloud/",prefix:"cloud-",count:3},
      {key:"bolt",dir:"lightning/",prefix:"bolt-",count:4},
      {key:"blossom",dir:"blossom/",prefix:"blossom-",count:6},
      {key:"flower",dir:"flower/",prefix:"flower-",count:4},
      {key:"dfly",dir:"dragonfly/",prefix:"dfly-",count:6},
      {key:"frost_img",dir:"frost/",prefix:"snow-",count:4},
      {key:"debris_img",dir:"debris/",prefix:"leaf-",count:3},
      {key:"frog",dir:"frog/",prefix:"frog-",count:4},
      {key:"pleaf",dir:"pleaf/",prefix:"leaf-",count:3},
      {key:"lpad",dir:"lilypad/",prefix:"pad-",count:1},
      {key:"firefly",dir:"firefly/",prefix:"firefly-",count:4},
      {key:"sun",dir:"sun/",prefix:"sun-",count:3}, // sun-01 正午黃 / sun-02 日出日落橘 / sun-03 深夕陽紅
    ];
    kinds.forEach(k=>{
      for(let i=1;i<=k.count;i++){
        const img=new Image();
        img.src="./images/fx/"+k.dir+k.prefix+String(i).padStart(2,"0")+".png";
        FX_IMG[k.key].push(img);
      }
    });
    // 雨滴只需單張
    const d=new Image();
    d.src="./images/fx/rain/drop.png";
    FX_IMG.drop=d;
  }
  
  function init(){
    if(canvas) return;
    canvas=document.createElement("canvas");
    canvas.id="wxfx";
    canvas.style.cssText="position:fixed;inset:0;z-index:25;pointer-events:none;opacity:0.58";
    document.body.appendChild(canvas);
    ctx=canvas.getContext("2d");
    resize();
    window.addEventListener("resize",resize);
    _preloadFx();
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
    // 深色夜間背景會吃掉半透明雨線；雨天模式提高畫布可見度，其餘模式維持柔和。
    if(canvas)canvas.style.opacity=(mode==="rain"?"0.82":(mode==="heavy"||mode==="storm"||mode==="typhoon")?"0.90":"0.58");
    if(typeof WxSfx!=='undefined') WxSfx.setMode(m);
    document.body.classList.remove("wx-heat","wx-rain","wx-storm","wx-fog","wx-snow","wx-wind","wx-typhoon","wx-cold");
    if(mode==="none") return;
    if(mode==="heat") document.body.classList.add("wx-heat");
    if(mode==="rain"||mode==="heavy") document.body.classList.add("wx-rain");
    if(mode==="storm") document.body.classList.add("wx-storm");
    if(mode==="fog") document.body.classList.add("wx-fog");
    if(mode==="snow") document.body.classList.add("wx-snow");
    if(mode==="wind") document.body.classList.add("wx-wind");
    if(mode==="typhoon") document.body.classList.add("wx-typhoon");
    if(mode==="cold") document.body.classList.add("wx-cold");
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
    } else if(mode==="cold"){
      for(let i=0;i<50;i++) particles.push(mkFrost());
      for(let i=0;i<8;i++) particles.push(mkBreath());
    }
  }
  
  function mkRain(heavy,wind){
    const speed=heavy?14+Math.random()*10:7+Math.random()*6;
    const len=heavy?22+Math.random()*18:12+Math.random()*12;
    const drift=wind?5+Math.random()*6:1+Math.random()*2;
    return{type:"rain",x:Math.random()*_w*1.4-_w*.2, y:Math.random()*_h*-1, speed, len, drift,
      alpha:heavy?0.52+Math.random()*0.28:0.38+Math.random()*0.24,
      width:heavy?2.2+Math.random()*1.1:1.45+Math.random()*0.65};
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
      r:2+Math.random()*3, alpha:0.5+Math.random()*0.35,
      shape:shapes[Math.floor(Math.random()*shapes.length)],
      rot:Math.random()*Math.PI*2, rotSpeed:0.05+Math.random()*0.1,
      size:14+Math.random()*20,imgIdx:Math.floor(Math.random()*3)};
  }

  function mkFrost(){
    // Frost crystals that grow on screen edges
    const side=Math.floor(Math.random()*4); // 0=top,1=right,2=bottom,3=left
    let x,y;
    if(side===0){x=Math.random()*_w;y=Math.random()*60}
    else if(side===1){x=_w-Math.random()*60;y=Math.random()*_h}
    else if(side===2){x=Math.random()*_w;y=_h-Math.random()*60}
    else{x=Math.random()*60;y=Math.random()*_h}
    return{type:"frost",x,y,r:3+Math.random()*8,alpha:0,maxAlpha:0.55+Math.random()*0.25,
      growSpeed:0.001+Math.random()*0.002,rot:Math.random()*Math.PI*2,
      branches:3+Math.floor(Math.random()*4),
      size:28+Math.random()*28,imgIdx:Math.floor(Math.random()*4)};
  }

  function mkBreath(){
    // Breath-like mist puffs rising slowly
    return{type:"breath",x:_w*0.2+Math.random()*_w*0.6, y:_h*0.5+Math.random()*_h*0.4,
      r:15+Math.random()*25, alpha:0, maxAlpha:0.04+Math.random()*0.03,
      speed:-0.15-Math.random()*0.2, drift:Math.random()*0.4-0.2,
      phase:0, growing:true};
  }
  
  function addSplash(x){
    splashes.push({x,y:_h-2,vx:(Math.random()-0.5)*2,vy:-1.5-Math.random()*2,life:1});
  }
  
  // ═══ AMBIENT DAY/NIGHT ═══
  let _sunPhase=Math.random()*Math.PI*2;
  
  // 參數：x, y, r（太陽半徑）, coreR/G/B（光暈色調 RGB）, coreA（太陽本體 alpha）, glowA（光暈強度）, rayA（光芒強度）, rayCount（光芒數量）, sunIdx（0=正午黃/1=晨昏橘/2=深夕陽紅）
  function drawSunDisc(x,y,r,coreR,coreG,coreB,coreA,glowA,rayA,rayCount,sunIdx){
    // 1. 外層光暈（用背景顏色，在太陽後面發光）
    const g2=ctx.createRadialGradient(x,y,r*0.3,x,y,r*2.8);
    g2.addColorStop(0,`rgba(${coreR},${coreG},${coreB},${glowA*0.5})`);
    g2.addColorStop(0.4,`rgba(${coreR},${coreG},${coreB},${glowA*0.2})`);
    g2.addColorStop(1,`rgba(${coreR},${coreG},${coreB},0)`);
    ctx.fillStyle=g2;
    ctx.fillRect(x-r*3,y-r*3,r*6,r*6);
    // 2. 光芒（晨昏時顯著）
    if(rayA>0.01){
      _sunPhase+=0.003;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(_sunPhase*0.3);
      for(let i=0;i<rayCount;i++){
        const angle=(Math.PI*2/rayCount)*i;
        const len=r*(1.8+Math.sin(_sunPhase+i*1.3)*0.6);
        const w=r*0.15;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(angle-w)*len,Math.sin(angle-w)*len);
        ctx.lineTo(Math.cos(angle+w)*len,Math.sin(angle+w)*len);
        ctx.closePath();
        const rg=ctx.createRadialGradient(0,0,r*0.3,0,0,len);
        rg.addColorStop(0,`rgba(${coreR},${coreG},${coreB},${rayA})`);
        rg.addColorStop(1,`rgba(${coreR},${coreG},${coreB},0)`);
        ctx.fillStyle=rg;
        ctx.fill();
      }
      ctx.restore();
    }
    // 3. 太陽本體——用對應時段的真實照片
    const idx=Math.min(Math.max(sunIdx||0,0),(FX_IMG.sun.length-1));
    const sunImg=FX_IMG.sun&&FX_IMG.sun[idx];
    if(sunImg&&sunImg.complete&&sunImg.naturalWidth>0){
      ctx.save();
      ctx.globalAlpha=coreA;
      // 照片本身已經有色調，不再疊色調濾鏡避免過色
      const sz=r*2.8;
      ctx.drawImage(sunImg,x-sz/2,y-sz/2,sz,sz);
      ctx.restore();
    } else {
      // Fallback：原本的漸層圓
      const g1=ctx.createRadialGradient(x,y,0,x,y,r);
      g1.addColorStop(0,`rgba(255,255,230,${coreA})`);
      g1.addColorStop(0.5,`rgba(${coreR},${coreG},${coreB},${coreA*0.7})`);
      g1.addColorStop(1,`rgba(${coreR},${coreG},${coreB},0)`);
      ctx.fillStyle=g1;
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
    }
  }
  
  function drawAmbient(){
    const h=new Date().getHours(),m=new Date().getMinutes();
    const t=h+m/60;
    
    if(t>=19||t<5){
      // Night（19:00 起；19-20 為進入夜間的漸變，20:00 起完整夜色）
      const intensity=(t>=19&&t<20)? Math.min((t-19)/1,1) : 1;
      const grd=ctx.createLinearGradient(0,0,0,_h);
      grd.addColorStop(0,`rgba(5,10,30,${0.65*intensity})`);
      grd.addColorStop(0.5,`rgba(8,15,38,${0.55*intensity})`);
      grd.addColorStop(1,`rgba(12,20,45,${0.45*intensity})`);
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h);
      // 下雨、豪雨、雷雨時不應仍滿天星；霧雨只保留極淡背景，避免誤以為特效仍是夜空模式。
      const starWeatherFactor=(mode==="rain"?0.08:(mode==="fog"?0.18:(mode==="none"||mode==="heat"||mode==="cold")?1:0));
      if(starWeatherFactor>0)stars.forEach(s=>{
        s.tw+=s.sp;
        const a=(0.5+Math.sin(s.tw)*0.4)*intensity*starWeatherFactor;
        ctx.beginPath();
        ctx.fillStyle=`rgba(255,255,240,${a})`;
        ctx.arc(s.x*_w,s.y*_h,s.r,0,Math.PI*2);
        ctx.fill();
      });
    } else if(t>=5&&t<7){
      // Sunrise — sun disc rising with warm sky
      const p=(t-5)/2;
      const grd=ctx.createLinearGradient(0,0,0,_h*0.7);
      grd.addColorStop(0,`rgba(255,120,40,${0.2*p})`);
      grd.addColorStop(0.4,`rgba(255,160,80,${0.15*p})`);
      grd.addColorStop(1,"rgba(255,200,150,0)");
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h*0.7);
      const sunY=_h*0.22-p*_h*0.06;
      drawSunDisc(_w*0.8,sunY,25+p*15, 255,150,50, 0.5*p, 0.4*p, 0.15*p, 10, 1);
      const starA=(1-p)*0.7;
      if(starA>0.05) stars.forEach(s=>{
        s.tw+=s.sp;
        ctx.beginPath();
        ctx.fillStyle=`rgba(255,255,240,${(0.3+Math.sin(s.tw)*0.2)*starA})`;
        ctx.arc(s.x*_w,s.y*_h,s.r*0.7,0,Math.PI*2);
        ctx.fill();
      });
    } else if(t>=7&&t<10){
      // Morning sun（下移避開 header，拉大 alpha 讓可見）
      const p=(t-7)/3;
      drawSunDisc(_w*0.75,_h*0.14,22+p*10, 255,200,80, 0.35, 0.25*p, 0.10*p, 8, 0);
    } else if(t>=10&&t<15){
      // Midday — overhead sun with rays（下移避開 header、加大、提亮）
      const p=Math.min((t-10)/2,1);
      const ep=t>12?Math.max(0,(15-t)/3):p;
      drawSunDisc(_w*0.5,_h*0.12,24+ep*8, 255,230,100, 0.45*ep, 0.30*ep, 0.12*ep, 12, 0);
      if(ep>0.3){
        const fg=ctx.createRadialGradient(_w*0.5,_h*0.12,0,_w*0.5,_h*0.12,_w*0.5);
        fg.addColorStop(0,`rgba(255,255,200,${0.10*ep})`);
        fg.addColorStop(1,"rgba(255,255,200,0)");
        ctx.fillStyle=fg;
        ctx.fillRect(0,0,_w,_h*0.35);
      }
    } else if(t>=15&&t<17){
      // Afternoon — golden sun moving right（下移避開 header）
      const p=(t-15)/2;
      const sunX=_w*(0.6+p*0.2);
      const sunY=_h*(0.12+p*0.03);
      drawSunDisc(sunX,sunY,26+p*10, 255,180,50, 0.4+p*0.1, 0.30*p, 0.12*p, 10, 1);
      const grd=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,_w*0.5);
      grd.addColorStop(0,`rgba(255,190,60,${0.12*p})`);
      grd.addColorStop(1,"rgba(255,200,80,0)");
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h*0.4);
    } else if(t>=17&&t<18){
      // Sunset — large orange-red sun with dramatic rays（下移避開 header）
      const p=t-17;
      const grd=ctx.createLinearGradient(0,0,0,_h*0.5);
      grd.addColorStop(0,`rgba(200,60,20,${0.18+p*0.22})`);
      grd.addColorStop(0.4,`rgba(160,40,80,${0.10+p*0.15})`);
      grd.addColorStop(1,"rgba(80,30,100,0)");
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h*0.5);
      const sunY=_h*(0.15+p*0.08);
      drawSunDisc(_w*0.85,sunY,38-p*10, 230,70,20, 0.5*(1-p*0.4), 0.4*(1-p*0.4), 0.18*(1-p*0.3), 14, 2);
    } else if(t>=18&&t<19){
      // Afterglow — 餘暉快速消退，為 19 點轉夜做準備
      const p=t-18;
      const ag=ctx.createLinearGradient(0,0,0,_h*0.3);
      ag.addColorStop(0,`rgba(180,60,40,${0.12*(1-p)})`);
      ag.addColorStop(1,"rgba(100,40,60,0)");
      ctx.fillStyle=ag;
      ctx.fillRect(0,0,_w,_h*0.3);
      // 淺藍夜幕逐漸覆上
      const grd=ctx.createLinearGradient(0,0,0,_h);
      grd.addColorStop(0,`rgba(20,30,70,${0.06+p*0.12})`);
      grd.addColorStop(0.6,`rgba(15,25,60,${0.03+p*0.09})`);
      grd.addColorStop(1,`rgba(10,20,50,${0.02+p*0.07})`);
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,_w,_h);
      // 星星淡淡出現
      const starA=p*0.4;
      if(starA>0.05) stars.forEach(s=>{
        s.tw+=s.sp;
        ctx.beginPath();
        ctx.fillStyle=`rgba(255,255,240,${(0.3+Math.sin(s.tw)*0.25)*starA})`;
        ctx.arc(s.x*_w,s.y*_h,s.r,0,Math.PI*2);
        ctx.fill();
      });
    }
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
    
    const dropImg=FX_IMG.drop;
    const useImg=dropImg&&dropImg.complete&&dropImg.naturalWidth>0;
    
    particles.forEach(p=>{
      if(p.type!=="rain") return;
      p.y+=p.speed;
      p.x+=p.drift;
      if(p.y>_h){
        if(Math.random()<0.15) addSplash(p.x);
        p.y=-p.len-Math.random()*_h*0.3;
        p.x=Math.random()*_w*1.4-_w*.2;
      }
      if(useImg){
        // 真實雨滴圖：依 p.len (長度) 決定尺寸
        const dw=Math.max(2,p.width*1.5);
        const dh=p.len;
        ctx.save();
        ctx.globalAlpha=p.alpha;
        // 圖片中心對準雨滴頭部，旋轉跟著飄移方向
        const ang=Math.atan2(p.len,p.drift*2.5);
        ctx.translate(p.x,p.y);
        ctx.rotate(Math.PI/2-ang);
        ctx.drawImage(dropImg,-dw/2,0,dw,dh);
        ctx.restore();
      }else{
        // Fallback: 線條雨滴
        ctx.beginPath();
        ctx.strokeStyle=`rgba(180,200,230,${p.alpha})`;
        ctx.lineWidth=p.width;
        ctx.moveTo(p.x,p.y);
        ctx.lineTo(p.x+p.drift*2.5,p.y+p.len);
        ctx.stroke();
      }
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
  
  // 當前閃電圖的位置與狀態（觸發一次後殘留數幀）
  let lightningImg=null,lightningX=0,lightningW=0,lightningH=0;
  function drawLightning(){
    lightningTimer--;
    if(lightningTimer<=0){
      lightningAlpha=0.6+Math.random()*0.3;
      if(typeof WxSfx!=='undefined') WxSfx.triggerThunder();
      lightningTimer=mode==="typhoon"?60+Math.random()*150:100+Math.random()*250;
      // 隨機挑一張閃電圖並設定位置
      const idx=Math.floor(Math.random()*FX_IMG.bolt.length);
      lightningImg=FX_IMG.bolt[idx]||null;
      lightningH=_h*(.6+Math.random()*.3);// 閃電高度約畫面 60-90%
      lightningW=lightningH*0.5;// 閃電圖本身是 512x1024 比例 0.5
      lightningX=_w*0.15+Math.random()*_w*0.7-lightningW/2;
    }
    if(lightningAlpha>0){
      // 先畫背景閃光
      ctx.fillStyle=`rgba(220,230,255,${lightningAlpha*.5})`;
      ctx.fillRect(0,0,_w,_h);
      // 再畫閃電本體
      if(lightningImg&&lightningImg.complete&&lightningImg.naturalWidth>0){
        ctx.save();
        ctx.globalAlpha=Math.min(1,lightningAlpha*1.8);
        ctx.drawImage(lightningImg,lightningX,0,lightningW,lightningH);
        ctx.restore();
      }else{
        // Fallback: 用 path 畫鋸齒
        ctx.save();
        ctx.strokeStyle=`rgba(220,230,255,${lightningAlpha*1.5})`;
        ctx.lineWidth=2.5;
        ctx.beginPath();
        let lx=lightningX+lightningW/2,ly=0;
        ctx.moveTo(lx,ly);
        for(let seg=0;seg<8;seg++){
          lx+=(Math.random()-0.5)*60;
          ly+=lightningH/8;
          ctx.lineTo(lx,ly);
        }
        ctx.stroke();
        ctx.restore();
      }
      lightningAlpha*=0.85;
      if(lightningAlpha<0.02)lightningAlpha=0;
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
      const dimg=FX_IMG.debris_img[d.imgIdx||0];
      const sz=d.size||18;
      if(dimg&&dimg.complete&&dimg.naturalWidth>0){
        ctx.save();
        ctx.translate(d.x,d.y);
        ctx.rotate(d.rot);
        ctx.globalAlpha=d.alpha;
        ctx.drawImage(dimg,-sz/2,-sz/2,sz,sz);
        ctx.restore();
      }else{
        // Fallback: 程序化葉/點/線
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
      }
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
  
  function drawCold(){
    // Icy blue overlay at edges
    const edgeG=ctx.createRadialGradient(_w/2,_h/2,_h*0.3,_w/2,_h/2,_h*0.8);
    edgeG.addColorStop(0,"rgba(180,210,240,0)");
    edgeG.addColorStop(1,"rgba(160,195,230,0.08)");
    ctx.fillStyle=edgeG;
    ctx.fillRect(0,0,_w,_h);

    // Draw frost crystals
    particles.forEach(p=>{
      if(p.type==="frost"){
        if(p.alpha<p.maxAlpha) p.alpha+=p.growSpeed;
        const fimg=FX_IMG.frost_img[p.imgIdx||0];
        const sz=p.size||40;
        if(fimg&&fimg.complete&&fimg.naturalWidth>0){
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha=p.alpha;
          ctx.drawImage(fimg,-sz/2,-sz/2,sz,sz);
          ctx.restore();
        }else{
          // Fallback: 程序化雪花
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.rot);
          ctx.strokeStyle=`rgba(200,225,255,${p.alpha})`;
          ctx.lineWidth=1;
          for(let b=0;b<p.branches;b++){
            const angle=(Math.PI*2/p.branches)*b;
            const len=p.r;
            const ex=Math.cos(angle)*len, ey=Math.sin(angle)*len;
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(ex,ey);
            ctx.stroke();
            const mid=0.6;
            const mx=Math.cos(angle)*len*mid, my=Math.sin(angle)*len*mid;
            ctx.beginPath();
            ctx.moveTo(mx,my);
            ctx.lineTo(mx+Math.cos(angle+0.5)*len*0.3,my+Math.sin(angle+0.5)*len*0.3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(mx,my);
            ctx.lineTo(mx+Math.cos(angle-0.5)*len*0.3,my+Math.sin(angle-0.5)*len*0.3);
            ctx.stroke();
          }
          ctx.fillStyle=`rgba(220,240,255,${p.alpha*0.8})`;
          ctx.beginPath();
          ctx.arc(0,0,1.5,0,Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
      }
      if(p.type==="breath"){
        p.y+=p.speed;
        p.x+=p.drift;
        p.r+=0.03;
        if(p.growing){
          p.alpha+=0.0008;
          if(p.alpha>=p.maxAlpha){p.growing=false}
        }else{
          p.alpha-=0.0005;
        }
        if(p.alpha<=0){
          // Reset breath puff
          p.x=_w*0.2+Math.random()*_w*0.6;
          p.y=_h*0.5+Math.random()*_h*0.4;
          p.r=15+Math.random()*25;
          p.alpha=0;p.growing=true;
          p.drift=Math.random()*0.4-0.2;
        }
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
        g.addColorStop(0,`rgba(210,225,245,${p.alpha})`);
        g.addColorStop(1,"rgba(210,225,245,0)");
        ctx.fillStyle=g;
        ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);
      }
    });

    // Bottom frost gradient
    const bfG=ctx.createLinearGradient(0,_h*0.85,0,_h);
    bfG.addColorStop(0,"rgba(200,220,245,0)");
    bfG.addColorStop(1,"rgba(200,220,245,0.06)");
    ctx.fillStyle=bfG;
    ctx.fillRect(0,_h*0.85,_w,_h*0.15);
  }

  // ═══ MAIN LOOP ═══
  // 視覺引擎與音效引擎統一使用頁面層的設定判定，避免各 IIFE 各自維護造成作用域或邏輯分歧。
  function fxEnabled(kind){
    try{
      if(typeof isFxEnabled==='function') return isFxEnabled(kind);
      if(window&&typeof window.isFxEnabled==='function') return window.isFxEnabled(kind);
    }catch(e){}
    return true;
  }
  function anyVisualEnabled(){
    return fxEnabled('weather')||fxEnabled('animals')||fxEnabled('seasonal');
  }

  function loop(){
    raf=requestAnimationFrame(loop);
    if(!anyVisualEnabled()){
      ctx.clearRect(0,0,_w,_h);
      return;
    }
    ctx.clearRect(0,0,_w,_h);
    if(mode!=="typhoon") canvas.style.transform="";
    
    // Ambient: 太陽/夜色/星星（白天晚上都要畫）
    drawAmbient();
    // Weather overlay
    if(mode==="heat") drawHeat();
    else if(mode==="rain"||mode==="heavy") drawRain();
    else if(mode==="storm") drawStorm();
    else if(mode==="snow") drawSnow();
    else if(mode==="fog") drawFog();
    else if(mode==="wind") drawWind();
    else if(mode==="typhoon") drawTyphoon();
    else if(mode==="cold") drawCold();
    // Seasonal overlay (always runs)
    drawSeason();
  }
  
  function update(code,temp,prec,wind){
    init();
    wxCode=code||0;wxTemp=temp||0;wxWind=wind||0;
    if(!fxEnabled('weather')){setMode("none");return}
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
    // 高降雨機率代表目前小時已有雨勢證據；即使 current code 暫時仍是多雲/霧，也先顯示雨。
    if(prec>=40){setMode(prec>=85?"heavy":"rain");return}
    // Fog
    if(code===45||code===48){setMode("fog");return}
    // Strong wind (no rain)
    if(wind>=35){setMode("wind");return}
    // Precip probability fallback
    if(prec>=40&&code<=3){setMode("rain");return}
    // Heat shimmer
    if((code===0||code===1)&&temp>=32){setMode("heat");return}
    // Cold wave (clear/cloudy but very cold)
    if(code<=3&&temp<=10){setMode("cold");return}
    // No weather effect, but ambient still runs
    setMode("none");
  }
  

  // ═══ SEASONAL EFFECTS (weather-aware) ═══
  let seasonParts=[],curSeason="",curTimeSlot="",seasonTimer=0,burstTimer=0;

  function getTimeSlot(){
    const h=new Date().getHours();
    if(h>=6&&h<10) return 'morning';
    if(h>=10&&h<16) return 'day';
    if(h>=16&&h<19) return 'dusk';
    return 'night';
  }
  // Harsh: suppress ALL seasonal (storm, typhoon, heavy rain, snow)
  function isHarsh(){return mode==='storm'||mode==='typhoon'||mode==='heavy'||mode==='snow'}
  // Moderate: suppress flying creatures but keep falling particles (rain, fog, strong wind)
  function isModerate(){return mode==='rain'||mode==='fog'||mode==='wind'}
  // Any bad: no creatures
  function noCreatures(){return !fxEnabled('animals')||isHarsh()||isModerate()}
  // Should show clouds
  function showClouds(){return fxEnabled('seasonal')&&(mode==='rain'||mode==='heavy'||mode==='storm'||mode==='fog'||mode==='typhoon'||mode==='wind'||wxCode>=3)}

  // ── Particle makers ──
  function mkBlossom(){
    const pinks=[[255,183,197],[255,210,225],[248,187,208],[255,160,185],[252,228,236]];
    const c=pinks[Math.floor(Math.random()*pinks.length)];
    return{type:"blossom",x:Math.random()*_w*1.3-_w*.15,y:-10-Math.random()*_h*.3,
      r:3+Math.random()*5,speed:.3+Math.random()*.8,drift:.2+Math.random()*.6,
      wobble:Math.random()*Math.PI*2,ws:.01+Math.random()*.02,
      rot:Math.random()*Math.PI*2,rs:.008+Math.random()*.025,
      alpha:.55+Math.random()*.3,c,petals:4+Math.floor(Math.random()*2),
      size:14+Math.random()*16,imgIdx:Math.floor(Math.random()*6)}
  }
  function mkFlower(){
    const cols=[[255,200,220],[255,180,200],[240,230,140],[200,220,255],[255,220,180]];
    const c=cols[Math.floor(Math.random()*cols.length)];
    return{type:"flower",x:Math.random()*_w,y:_h-10-Math.random()*40,
      r:4+Math.random()*4,alpha:0,maxA:.7+Math.random()*.2,growing:true,
      life:250+Math.random()*350,c,petals:5+Math.floor(Math.random()*2),
      size:22+Math.random()*18,imgIdx:Math.floor(Math.random()*4)}
  }
  function mkFirefly(){
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    return{type:"ffly",x:Math.random()*_w,y:_h*.15+Math.random()*_h*.7,
      speed:.15+Math.random()*.35,angle:Math.random()*Math.PI*2,
      turn:.008+Math.random()*.025,pulse:Math.random()*Math.PI*2,
      ps:.015+Math.random()*.035,r:2+Math.random()*2.5,
      maxA:isDark?(.75+Math.random()*.25):(.35+Math.random()*.5),
      imgIdx:Math.floor(Math.random()*4),
      size:isDark?(20+Math.random()*14):(14+Math.random()*10)}
  }
  function mkLeaf(){
    const imgIdx=Math.floor(Math.random()*4);// 4 張楓葉隨機挑
    return{type:"leaf",x:Math.random()*_w*1.3-_w*.15,y:-15-Math.random()*_h*.3,
      size:18+Math.random()*24,// 真實照片需要更大尺寸，18-42px
      speed:.5+Math.random()*1,drift:.6+Math.random()*1.2,
      wobble:Math.random()*Math.PI*2,ws:.01+Math.random()*.015,
      rot:Math.random()*Math.PI*2,rs:.012+Math.random()*.035,
      alpha:.75+Math.random()*.2,imgIdx}
  }
  function mkFrostSpark(){
    return{type:"fspark",x:Math.random()*_w,y:Math.random()*_h,
      r:1+Math.random()*1.5,pulse:Math.random()*Math.PI*2,
      ps:.006+Math.random()*.012,maxA:.12+Math.random()*.2}
  }
  function mkMist(){
    return{type:"mist",x:Math.random()*_w*1.5-_w*.25,y:_h*.55+Math.random()*_h*.4,
      w:200+Math.random()*300,h:40+Math.random()*60,
      speed:.08+Math.random()*.15,alpha:.015+Math.random()*.015,
      dir:Math.random()>.5?1:-1}
  }
  function mkCloud(){
    const w=200+Math.random()*240;
    return{type:"cloud",x:-w-Math.random()*200,y:Math.random()*_h*.2,
      w:w,h:w*0.5,// 寬:高 2:1 符合雲照片比例
      speed:.15+Math.random()*.25,alpha:.2+Math.random()*.15,
      imgIdx:Math.floor(Math.random()*3)}
  }
  function mkDragonfly(){
    // state: flying（飛行）/ perched（停棲）/ leaving（離開中）
    return{type:"dfly",x:Math.random()*_w,y:_h*.1+Math.random()*_h*.3,
      speed:1.5+Math.random()*2,angle:Math.random()*Math.PI*2,
      turn:.03+Math.random()*.03,wingPhase:Math.random()*Math.PI*2,
      alpha:.6+Math.random()*.25,r:5+Math.random()*3,
      size:30+Math.random()*20,imgIdx:Math.floor(Math.random()*6),
      state:"flying",
      // 飛行計時器：隨機 600-1500 幀後想找葉子停
      flyTimer:600+Math.floor(Math.random()*900),
      perchTimer:0,perchLeafIdx:-1}
  }
  function mkButterfly(){
    // 三種蝴蝶隨機挑選：鳳蝶(黃黑)、紫斑蝶(深紫)、君主斑蝶(橘黑)
    const kinds=["swallowtail","purple","monarch"];
    const kind=kinds[Math.floor(Math.random()*kinds.length)];
    const size=36+Math.random()*24;
    return{type:"bfly",kind,x:Math.random()*_w,y:_h*.15+Math.random()*_h*.5,
      speed:.5+Math.random()*.8,angle:Math.random()*Math.PI*2,
      turn:.015+Math.random()*.02,
      frame:Math.floor(Math.random()*6),
      frameTimer:0,
      frameInterval:3+Math.floor(Math.random()*2),
      size,alpha:.85+Math.random()*.15,
      state:"flying",
      // 蝴蝶停得比較少，900-2400 幀才想停
      flyTimer:900+Math.floor(Math.random()*1500),
      perchTimer:0,perchLeafIdx:-1}
  }
  // 樹葉（蜻蜓、蝴蝶停棲用）固定位置不移動
  function mkPerchLeaf(){
    return{type:"pleaf",
      x:_w*(.15+Math.random()*.7),
      y:_h*(.65+Math.random()*.23), // 畫面下方，跟荷葉同一區帶
      size:40+Math.random()*20,
      rot:(Math.random()-.5)*.5,
      imgIdx:Math.floor(Math.random()*3),
      alpha:.85+Math.random()*.1,
      // 永久停棲點，不會被移除
      permanent:true}
  }
  // 荷葉（青蛙坐的位置）固定在畫面下半部
  let _lpadIdCounter=0;
  function mkLilypad(){
    return{type:"lpad",
      padId:++_lpadIdCounter, // 獨立 ID，不受 array index 影響
      x:_w*(.1+Math.random()*.8),
      y:_h*(.7+Math.random()*.2), // 底部水面
      size:65+Math.random()*20, // 65-85 適中（太大搶戲、太小青蛙擺不上）
      rot:(Math.random()-.5)*.3,
      alpha:.88+Math.random()*.08,
      permanent:true}
  }
  // 青蛙：坐在荷葉上，偶爾跳、偶爾伸舌頭吃蟲（夜晚螢火蟲/白天蜻蜓）
  function mkFrog(padId){
    return{type:"frog",
      padId,
      x:0,y:0,
      size:45+Math.random()*10,
      imgIdx:0,
      state:"sitting",
      blinkTimer:120+Math.floor(Math.random()*180),
      jumpTimer:400+Math.floor(Math.random()*1200),
      huntTimer:180+Math.floor(Math.random()*240),
      tongueProgress:0,
      tongueFromX:0,tongueFromY:0,tongueToX:0,tongueToY:0,
      preyRef:null,
      jumpProgress:0,jumpFromX:0,jumpFromY:0,jumpToX:0,jumpToY:0,
      facing:1,
      alpha:.95,
      permanent:true}
  }
  // 畫青蛙舌頭（全域座標）
  function drawFrogTongue(p){
    if(p.state!=='catching'&&p.state!=='retracting') return;
    const t=Math.max(0,Math.min(1,p.tongueProgress));
    if(t<=0.01) return;
    const fx=p.tongueFromX,fy=p.tongueFromY;
    const tx=p.tongueToX,ty=p.tongueToY;
    const cx=fx+(tx-fx)*t,cy=fy+(ty-fy)*t;
    ctx.save();
    ctx.strokeStyle='rgba(230,85,120,0.92)';
    ctx.lineWidth=2.2;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(fx,fy);
    ctx.lineTo(cx,cy);
    ctx.stroke();
    ctx.fillStyle='rgba(245,120,150,0.95)';
    ctx.beginPath();
    ctx.arc(cx,cy,2.8,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
    if(p.state==='retracting'&&p.preyRef){
      p.preyRef.x=cx;p.preyRef.y=cy;
    }
  }

  // ── Seeding ──
  function seedSeason(s,ts){
    seasonParts=[];curSeason=s;curTimeSlot=ts;
    const seasonalOn=fxEnabled('seasonal');
    const animalsOn=fxEnabled('animals');
    // Clouds for overcast
    if(showClouds()) for(let i=0;i<4+Math.floor(Math.random()*3);i++) seasonParts.push(mkCloud());
    if(isHarsh()) return; // Storm/typhoon: no seasonal visuals at all
    const noc=noCreatures(); // Rain/fog/wind: no flying creatures

    if(s==='spring'){
      // Blossoms always
      if(seasonalOn) for(let i=0;i<12+Math.floor(Math.random()*8);i++) seasonParts.push(mkBlossom());
      // Flowers at bottom
      if(seasonalOn) for(let i=0;i<5+Math.floor(Math.random()*4);i++) seasonParts.push(mkFlower());
      // 春天白天：2-3 片停棲葉給蝴蝶停
      if(animalsOn&&!noc&&(ts==='morning'||ts==='day'||ts==='dusk')){
        if(seasonalOn) for(let i=0;i<2+Math.floor(Math.random()*2);i++) seasonParts.push(mkPerchLeaf());
        // 白天至少 1 隻蝴蝶，最多 3 隻
        seasonParts.push(mkButterfly());
        if(Math.random()>.4) seasonParts.push(mkButterfly());
        if(Math.random()>.7) seasonParts.push(mkButterfly());
      }
      // 春夜加入荷葉+青蛙（青蛙雨天也要坐著，只有 harsh 天氣才移除）
      if(animalsOn&&ts==='night'&&!isHarsh()){
        if(!noc) for(let i=0;i<4+Math.floor(Math.random()*4);i++) seasonParts.push(mkFirefly());
        // 2 片荷葉 + 1 隻青蛙
        const lilies=[];
        if(seasonalOn){
          for(let i=0;i<2;i++){const lp=mkLilypad();seasonParts.push(lp);lilies.push(lp)}
        }
        if(lilies.length>0) seasonParts.push(mkFrog(lilies[0].padId));
      }
    } else if(s==='summer'){
      if(!noc&&(ts==='day'||ts==='morning')){
        // 2-3 片停棲葉給蜻蜓停
        for(let i=0;i<2+Math.floor(Math.random()*2);i++) seasonParts.push(mkPerchLeaf());
        if(Math.random()>.4) seasonParts.push(mkDragonfly());
        if(Math.random()>.7) seasonParts.push(mkDragonfly());
      } else if(!isHarsh()&&(ts==='night'||ts==='dusk')){
        if(!noc) for(let i=0;i<8+Math.floor(Math.random()*8);i++) seasonParts.push(mkFirefly());
        // 夏夜 2-3 片荷葉 + 1-2 隻青蛙
        const numLily=2+Math.floor(Math.random()*2);
        const lilies=[];
        for(let i=0;i<numLily;i++){const lp=mkLilypad();seasonParts.push(lp);lilies.push(lp)}
        if(lilies.length>0){
          seasonParts.push(mkFrog(lilies[0].padId));
          if(Math.random()>.5&&lilies.length>1){
            seasonParts.push(mkFrog(lilies[1].padId));
          }
        }
      }
    } else if(s==='autumn'){
      if(seasonalOn) for(let i=0;i<8+Math.floor(Math.random()*6);i++) seasonParts.push(mkLeaf());
      if(seasonalOn) for(let i=0;i<2+Math.floor(Math.random()*2);i++) seasonParts.push(mkMist());
    } else if(s==='winter'){
      if(seasonalOn) for(let i=0;i<20+Math.floor(Math.random()*15);i++) seasonParts.push(mkFrostSpark());
      if(seasonalOn) for(let i=0;i<3+Math.floor(Math.random()*2);i++) seasonParts.push(mkMist());
    }
  }

  // ── Drawing ──
  let lastMode="none";
  function drawSeason(){
    const s=getSeason(),ts=getTimeSlot();
    const seasonalOn=fxEnabled('seasonal');
    const animalsOn=fxEnabled('animals');
    seasonTimer++;
    // Force re-seed immediately when weather mode changes
    const modeChanged=(mode!==lastMode);lastMode=mode;
    if(s!==curSeason||ts!==curTimeSlot||modeChanged||seasonTimer>1500){seedSeason(s,ts);seasonTimer=0}
    // Purge creatures immediately during bad weather (in case any survived)
    if(isHarsh()){
      // Harsh 天氣：清除所有生物（含青蛙、荷葉）
      seasonParts=seasonParts.filter(p=>p.type!=='bfly'&&p.type!=='dfly'&&p.type!=='ffly'&&p.type!=='frog'&&p.type!=='lpad'&&p.type!=='pleaf');
    } else if(noCreatures()){
      // Moderate 天氣（雨、霧、風）：只清除飛行生物，青蛙+荷葉保留
      seasonParts=seasonParts.filter(p=>p.type!=='bfly'&&p.type!=='dfly'&&p.type!=='ffly'&&p.type!=='pleaf');
    }
    if(!animalsOn){
      seasonParts=seasonParts.filter(p=>!['bfly','dfly','ffly','frog'].includes(p.type));
    }
    if(!seasonalOn){
      seasonParts=seasonParts.filter(p=>!['cloud','blossom','flower','leaf','fspark','mist','pleaf','lpad'].includes(p.type));
    }

    // Random bursts
    burstTimer--;
    if(burstTimer<=0&&!isHarsh()){
      burstTimer=250+Math.floor(Math.random()*500);
      if(s==='spring'){
        if(seasonalOn) for(let i=0;i<3+Math.floor(Math.random()*5);i++) seasonParts.push(mkBlossom());
        if(animalsOn&&!noCreatures()&&(ts==='day'||ts==='morning')&&Math.random()>.6) seasonParts.push(mkButterfly());
        if(seasonalOn&&Math.random()>.5) seasonParts.push(mkFlower());
      } else if(s==='summer'&&animalsOn&&!noCreatures()&&(ts==='night'||ts==='dusk')){
        for(let i=0;i<2+Math.floor(Math.random()*4);i++) seasonParts.push(mkFirefly());
      } else if(s==='autumn'&&seasonalOn){
        for(let i=0;i<2+Math.floor(Math.random()*5);i++) seasonParts.push(mkLeaf());
      }
    }
    // Cloud bursts for weather
    if(seasonalOn&&showClouds()&&burstTimer%200===0&&seasonParts.filter(p=>p.type==='cloud').length<8){
      seasonParts.push(mkCloud());
    }

    // Season tints (only when calm)
    if(!isHarsh()){
      if(s==='autumn'){
        const g=ctx.createLinearGradient(0,0,0,_h*.4);
        g.addColorStop(0,"rgba(180,100,30,0.025)");g.addColorStop(1,"rgba(180,100,30,0)");
        ctx.fillStyle=g;ctx.fillRect(0,0,_w,_h*.4);
      }
      if(s==='winter'){
        const g=ctx.createRadialGradient(_w/2,_h/2,_h*.3,_w/2,_h/2,_h*.75);
        g.addColorStop(0,"rgba(180,210,240,0)");g.addColorStop(1,"rgba(180,210,240,0.035)");
        ctx.fillStyle=g;ctx.fillRect(0,0,_w,_h);
      }
    }

    // Draw particles（frog 延後畫，避免被 lpad 等蓋住）
    // 排序：飛行生物（蝴蝶/蜻蜓/螢火蟲）移到陣列前端，反向迭代時最後畫 → 在 pleaf/lpad 之上
    const _zOrder={bfly:0,dfly:0,ffly:0,frog:1,lpad:2,pleaf:2};
    seasonParts.sort((a,b)=>(_zOrder[a.type]??9)-(_zOrder[b.type]??9));
    for(let i=seasonParts.length-1;i>=0;i--){
      const p=seasonParts[i];
      if(p.type==='frog') continue; // 青蛙最後統一處理

      if(p.type==='cloud'){
        p.x+=p.speed;
        if(p.x>_w+p.w){p.x=-p.w-Math.random()*100;p.y=Math.random()*_h*.2}
        // 選一張雲的照片 (p.imgIdx 在 mkCloud 時隨機分配)
        const cimg=FX_IMG.cloud[p.imgIdx||0];
        if(cimg&&cimg.complete&&cimg.naturalWidth>0){
          ctx.save();
          ctx.globalAlpha=p.alpha*3;// 雲照片本身是真實的，alpha 設定要更明顯
          ctx.drawImage(cimg,p.x,p.y,p.w,p.h);
          ctx.restore();
        }else{
          // Fallback: 圓圈雲
          ctx.fillStyle=`rgba(160,170,185,${p.alpha})`;
          const cx=p.x+p.w/2,cy=p.y+p.h/2;
          for(let j=0;j<5;j++){
            const ox=(j-2)*p.w*.18,oy=Math.sin(j*1.2)*p.h*.2;
            const rr=p.w*.15+Math.sin(j*2)*p.w*.05;
            ctx.beginPath();ctx.arc(cx+ox,cy+oy,rr,0,Math.PI*2);ctx.fill();
          }
        }
      }
      else if(p.type==='blossom'){
        p.y+=p.speed;p.x+=p.drift;p.wobble+=p.ws;p.rot+=p.rs;
        p.x+=Math.sin(p.wobble)*.7;
        if(p.y>_h+20){seasonParts.splice(i,1);continue}
        const bimg=FX_IMG.blossom[p.imgIdx||0];
        const sz=p.size||20;
        if(bimg&&bimg.complete&&bimg.naturalWidth>0){
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.globalAlpha=p.alpha;
          ctx.drawImage(bimg,-sz/2,-sz/2,sz,sz);
          ctx.restore();
        }else{
          // Fallback: 程序化花瓣
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          for(let j=0;j<p.petals;j++){
            const a=(Math.PI*2/p.petals)*j;
            ctx.beginPath();
            ctx.ellipse(Math.cos(a)*p.r*.4,Math.sin(a)*p.r*.4,p.r,p.r*.5,a,0,Math.PI*2);
            ctx.fillStyle=`rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.alpha})`;
            ctx.fill();
          }
          ctx.beginPath();ctx.arc(0,0,p.r*.25,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,230,180,${p.alpha})`;ctx.fill();
          ctx.restore();
        }
      }
      else if(p.type==='flower'){
        p.life--;
        if(p.growing){p.alpha+=.008;if(p.alpha>=p.maxA)p.growing=false}
        else if(p.life<60){p.alpha-=.008}
        if(p.life<=0||p.alpha<=0){seasonParts.splice(i,1);continue}
        const fimg=FX_IMG.flower[p.imgIdx||0];
        const sz=p.size||28;
        if(fimg&&fimg.complete&&fimg.naturalWidth>0){
          ctx.save();ctx.translate(p.x,p.y);
          ctx.globalAlpha=p.alpha;
          ctx.drawImage(fimg,-sz/2,-sz,sz,sz);
          ctx.restore();
        }else{
          ctx.save();ctx.translate(p.x,p.y);
          for(let j=0;j<p.petals;j++){
            const a=(Math.PI*2/p.petals)*j-Math.PI/2;
            ctx.beginPath();
            ctx.ellipse(Math.cos(a)*p.r*.5,Math.sin(a)*p.r*.5,p.r*.7,p.r*.35,a,0,Math.PI*2);
            ctx.fillStyle=`rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.alpha})`;
            ctx.fill();
          }
          ctx.beginPath();ctx.arc(0,0,p.r*.2,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,220,80,${p.alpha})`;ctx.fill();
          ctx.strokeStyle=`rgba(80,160,60,${p.alpha*.5})`;ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(0,p.r*.5);ctx.lineTo(0,p.r*2);ctx.stroke();
          ctx.restore();
        }
      }
      else if(p.type==='bfly'){
        // 找停棲目標：樹葉
        if(p.state==="flying"){
          p.angle+=p.turn*(Math.sin(p.frame*.7)>0?1:-1);
          p.x+=Math.cos(p.angle)*p.speed;p.y+=Math.sin(p.angle)*p.speed*.6;
          p.flyTimer--;
          if(p.flyTimer<=0){
            // 找最近的樹葉停棲
            const leaves=seasonParts.filter(q=>q.type==='pleaf');
            if(leaves.length>0){
              const leaf=leaves[Math.floor(Math.random()*leaves.length)];
              p.perchLeafIdx=seasonParts.indexOf(leaf);
              p.state="approaching";p.targetX=leaf.x;p.targetY=leaf.y-leaf.size*.35;
            }else{p.flyTimer=600+Math.floor(Math.random()*600)}
          }
          // 超出畫面太遠 → 自然離開（移除）
          if(p.x<-80||p.x>_w+80||p.y<-80||p.y>_h+80){
            seasonParts.splice(i,1);continue;
          }
        } else if(p.state==="approaching"){
          // 平滑接近葉子
          const dx=p.targetX-p.x,dy=p.targetY-p.y;
          const dist=Math.hypot(dx,dy);
          if(dist<3){
            p.state="perched";p.x=p.targetX;p.y=p.targetY;
            p.perchTimer=300+Math.floor(Math.random()*600); // 5-15 秒
            p.angle=-Math.PI/2; // 朝上
          } else {
            p.angle=Math.atan2(dy,dx);
            p.x+=Math.cos(p.angle)*p.speed*1.2;
            p.y+=Math.sin(p.angle)*p.speed*1.2;
          }
        } else if(p.state==="perched"){
          p.perchTimer--;
          if(p.perchTimer<=0){
            p.state="leaving";
            p.angle=-Math.PI/2+(Math.random()-.5)*.6; // 往上飛走
          }
        } else if(p.state==="leaving"){
          p.x+=Math.cos(p.angle)*p.speed;
          p.y+=Math.sin(p.angle)*p.speed;
          if(p.x<-80||p.x>_w+80||p.y<-80||p.y>_h+80){
            seasonParts.splice(i,1);continue;
          }
        }
        // 翅膀幀切換（停棲時減緩）
        p.frameTimer++;
        const fInt=p.state==="perched"?p.frameInterval*4:p.frameInterval;
        if(p.frameTimer>=fInt){p.frameTimer=0;p.frame=(p.frame+1)%6}
        const imgArr=FX_IMG[p.kind]||FX_IMG.swallowtail;
        const img=imgArr[p.frame];
        if(img&&img.complete&&img.naturalWidth){
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.angle+Math.PI/2);
          ctx.globalAlpha=p.alpha;
          const s=p.size;
          ctx.drawImage(img,-s/2,-s/2,s,s);
          ctx.restore();
        }else{
          // Fallback 程序化蝴蝶
          const wing=Math.abs(Math.sin(p.frame*.8))*.7+.3;
          const r=p.size*.15;
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle+Math.PI/2);
          ctx.fillStyle=`rgba(255,200,50,${p.alpha*.7})`;
          ctx.beginPath();ctx.ellipse(-r*.6,0,r*wing,r*.7,-.3,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.ellipse(r*.6,0,r*wing,r*.7,.3,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=`rgba(60,40,30,${p.alpha})`;
          ctx.beginPath();ctx.ellipse(0,0,1.5,r*.4,0,0,Math.PI*2);ctx.fill();
          ctx.restore();
        }
      }
      else if(p.type==='dfly'){
        p.wingPhase=(p.wingPhase||0)+.2;
        if(p.state==="flying"){
          p.angle+=p.turn*(Math.random()>.5?1:-1);
          p.x+=Math.cos(p.angle)*p.speed;p.y+=Math.sin(p.angle)*p.speed*.4;
          p.flyTimer--;
          if(p.flyTimer<=0){
            const leaves=seasonParts.filter(q=>q.type==='pleaf');
            if(leaves.length>0){
              const leaf=leaves[Math.floor(Math.random()*leaves.length)];
              p.perchLeafIdx=seasonParts.indexOf(leaf);
              p.state="approaching";p.targetX=leaf.x;p.targetY=leaf.y-leaf.size*.3;
            }else{p.flyTimer=400+Math.floor(Math.random()*600)}
          }
          if(p.x<-50||p.x>_w+50||p.y<-30||p.y>_h+30){
            seasonParts.splice(i,1);continue;
          }
        } else if(p.state==="approaching"){
          const dx=p.targetX-p.x,dy=p.targetY-p.y;
          const dist=Math.hypot(dx,dy);
          if(dist<4){
            p.state="perched";p.x=p.targetX;p.y=p.targetY;
            p.perchTimer=400+Math.floor(Math.random()*600); // 6-16 秒
            p.angle=0;
          } else {
            p.angle=Math.atan2(dy,dx);
            p.x+=Math.cos(p.angle)*p.speed*1.3;
            p.y+=Math.sin(p.angle)*p.speed*1.3;
          }
        } else if(p.state==="perched"){
          p.perchTimer--;
          if(p.perchTimer<=0){
            p.state="leaving";
            // 往畫面外一個方向離開
            p.angle=Math.random()*Math.PI*2;
          }
        } else if(p.state==="leaving"){
          p.x+=Math.cos(p.angle)*p.speed*1.2;
          p.y+=Math.sin(p.angle)*p.speed*1.2;
          if(p.x<-50||p.x>_w+50||p.y<-30||p.y>_h+30){
            seasonParts.splice(i,1);continue;
          }
        }
        const dimg=FX_IMG.dfly[p.imgIdx||0];
        const sz=p.size||35;
        if(dimg&&dimg.complete&&dimg.naturalWidth>0){
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha=p.state==="perched"?p.alpha:p.alpha;
          // 停棲時翅膀慢慢振動（半透明 tint）；飛行時正常
          ctx.drawImage(dimg,-sz/2,-sz/2,sz,sz);
          ctx.restore();
        }else{
          const wf=Math.abs(Math.sin(p.wingPhase));
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
          ctx.fillStyle=`rgba(40,80,120,${p.alpha})`;
          ctx.beginPath();ctx.ellipse(0,0,p.r*1.2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=`rgba(180,220,255,${p.alpha*.4*wf})`;
          ctx.beginPath();ctx.ellipse(-2,-3,p.r*.8*wf,p.r*.3,-.4,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.ellipse(-2,3,p.r*.8*wf,p.r*.3,.4,0,Math.PI*2);ctx.fill();
          ctx.restore();
        }
      }
      else if(p.type==='pleaf'){
        // 靜態停棲樹葉（給蜻蜓、蝴蝶停）
        const sz=p.size;
        const img=FX_IMG.pleaf&&FX_IMG.pleaf[p.imgIdx||0];
        if(img&&img.complete&&img.naturalWidth>0){
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.globalAlpha=p.alpha;
          ctx.drawImage(img,-sz/2,-sz/2,sz,sz);
          ctx.restore();
        }else{
          // Fallback: 程序化葉片（綠色橢圓帶葉脈）
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.globalAlpha=p.alpha;
          const grad=ctx.createRadialGradient(0,0,sz*.1,0,0,sz*.55);
          grad.addColorStop(0,"rgba(120,180,80,.9)");
          grad.addColorStop(.7,"rgba(80,140,50,.85)");
          grad.addColorStop(1,"rgba(50,100,30,.75)");
          ctx.fillStyle=grad;
          ctx.beginPath();ctx.ellipse(0,0,sz*.5,sz*.3,0,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle="rgba(40,80,20,.5)";ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(-sz*.5,0);ctx.lineTo(sz*.5,0);ctx.stroke();
          ctx.restore();
        }
      }
      else if(p.type==='lpad'){
        // 荷葉（青蛙坐的）
        const sz=p.size;
        const img=FX_IMG.lpad&&FX_IMG.lpad[0];
        if(img&&img.complete&&img.naturalWidth>0){
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.globalAlpha=p.alpha;
          ctx.drawImage(img,-sz/2,-sz/2,sz,sz);
          ctx.restore();
        }else{
          // Fallback: 圓形荷葉
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.globalAlpha=p.alpha;
          const grad=ctx.createRadialGradient(0,0,sz*.1,0,0,sz*.5);
          grad.addColorStop(0,"rgba(150,200,100,.95)");
          grad.addColorStop(.8,"rgba(90,150,60,.9)");
          grad.addColorStop(1,"rgba(60,110,40,.8)");
          ctx.fillStyle=grad;
          ctx.beginPath();ctx.arc(0,0,sz*.5,0,Math.PI*2);ctx.fill();
          // V 形缺口（荷葉特徵）
          ctx.fillStyle="rgba(0,0,0,0)";
          ctx.globalCompositeOperation="destination-out";
          ctx.beginPath();
          ctx.moveTo(0,0);
          ctx.lineTo(sz*.45,-sz*.08);
          ctx.lineTo(sz*.45,sz*.08);
          ctx.closePath();ctx.fill();
          ctx.globalCompositeOperation="source-over";
          ctx.restore();
        }
      }
      else if(p.type==='frog'){
        // 青蛙狀態機：sitting / crouching / jumping
        // 用 padId 找目前歸屬的荷葉（index 會漂移所以不用）
        let lly=null;
        for(let j=0;j<seasonParts.length;j++){
          const q=seasonParts[j];
          if(q.type==='lpad'&&q.padId===p.padId){lly=q;break;}
        }
        if(!lly){
          // 歸屬的荷葉沒了，找任一片荷葉重新歸屬
          const anyLily=seasonParts.find(q=>q.type==='lpad');
          if(!anyLily){seasonParts.splice(i,1);continue;}
          p.padId=anyLily.padId;lly=anyLily;
        }
        if(p.state==="sitting"){
          p.x=lly.x;
          p.y=lly.y-p.size*0.45;
          p.blinkTimer--;
          if(p.blinkTimer<=0){
            p.imgIdx=p.imgIdx===1?0:1;
            p.blinkTimer=p.imgIdx===1?(5+Math.floor(Math.random()*6)):(120+Math.floor(Math.random()*180));
          }
          p.huntTimer--;
          if(p.huntTimer<=0){
            const mouthX=p.x,mouthY=p.y-p.size*0.05;
            const maxR=160;
            let best=null,bestD=maxR*maxR;
            for(let k=0;k<seasonParts.length;k++){
              const q=seasonParts[k];
              if(q.type!=='ffly'&&q.type!=='dfly') continue;
              if(q.type==='dfly'&&q.state!=='flying') continue;
              const dx=q.x-mouthX,dy=q.y-mouthY;
              const d2=dx*dx+dy*dy;
              if(d2<bestD){bestD=d2;best=q;}
            }
            if(best){
              p.preyRef=best;
              p.tongueFromX=mouthX;p.tongueFromY=mouthY;
              p.tongueToX=best.x;p.tongueToY=best.y;
              p.tongueProgress=0;
              p.state="catching";
              p.imgIdx=1;
              p.facing=best.x<p.x?1:-1;
              p.huntTimer=0;
            } else {
              p.huntTimer=120+Math.floor(Math.random()*180);
            }
          }
          if(p.state==="sitting"){
            p.jumpTimer--;
            if(p.jumpTimer<=0){
              const others=seasonParts.filter(q=>q.type==='lpad'&&q.padId!==p.padId);
              if(others.length>0){
                const target=others[Math.floor(Math.random()*others.length)];
                p.jumpFromX=p.x;p.jumpFromY=p.y;
                p.jumpToX=target.x;p.jumpToY=target.y-p.size*0.45;
                p.jumpTargetPadId=target.padId;
                p.jumpProgress=0;p.state="crouching";p.crouchTimer=20;
                p.facing=p.jumpToX<p.jumpFromX?1:-1;
                p.imgIdx=2;
              } else {
                p.jumpTimer=400+Math.floor(Math.random()*1200);
              }
            }
          }
        } else if(p.state==="catching"){
          p.tongueProgress+=0.15;
          if(p.preyRef&&seasonParts.indexOf(p.preyRef)>=0){
            p.tongueToX=p.preyRef.x;p.tongueToY=p.preyRef.y;
          } else {
            p.preyRef=null;p.state="retracting";p.tongueProgress=1;
          }
          if(p.tongueProgress>=1){
            p.tongueProgress=1;
            p.state="retracting";
          }
        } else if(p.state==="retracting"){
          p.tongueProgress-=0.2;
          if(p.tongueProgress<=0){
            p.tongueProgress=0;
            if(p.preyRef){
              const idx=seasonParts.indexOf(p.preyRef);
              if(idx>=0) seasonParts.splice(idx,1);
              p.preyRef=null;
            }
            p.state="sitting";
            p.imgIdx=0;
            p.huntTimer=240+Math.floor(Math.random()*360);
            p.blinkTimer=60+Math.floor(Math.random()*120);
          }
        } else if(p.state==="crouching"){
          p.crouchTimer--;
          if(p.crouchTimer<=0){
            p.state="jumping";p.imgIdx=3;
          }
        } else if(p.state==="jumping"){
          p.jumpProgress+=.025;
          if(p.jumpProgress>=1){
            p.state="sitting";
            p.padId=p.jumpTargetPadId;
            p.imgIdx=0;p.blinkTimer=120+Math.floor(Math.random()*180);
            p.jumpTimer=400+Math.floor(Math.random()*1200);
          } else {
            const tt=p.jumpProgress;
            p.x=p.jumpFromX+(p.jumpToX-p.jumpFromX)*tt;
            const arc=-Math.sin(tt*Math.PI)*80;
            p.y=p.jumpFromY+(p.jumpToY-p.jumpFromY)*tt+arc;
          }
        }
        const sz=p.size;
        const fimg=FX_IMG.frog&&FX_IMG.frog[p.imgIdx||0];
        if(fimg&&fimg.complete&&fimg.naturalWidth>0){
          ctx.save();ctx.translate(p.x,p.y);
          if(p.facing===-1) ctx.scale(-1,1);
          ctx.globalAlpha=p.alpha;
          ctx.drawImage(fimg,-sz/2,-sz/2,sz,sz);
          ctx.restore();
        }else{
          // Fallback: 程序化綠色青蛙
          ctx.save();ctx.translate(p.x,p.y);
          ctx.globalAlpha=p.alpha;
          ctx.fillStyle="#5a8f3a";
          ctx.beginPath();ctx.ellipse(0,2,sz*.35,sz*.28,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#6ba84a";
          ctx.beginPath();ctx.ellipse(0,-sz*.15,sz*.3,sz*.22,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#fff";
          ctx.beginPath();ctx.arc(-sz*.12,-sz*.25,sz*.08,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(sz*.12,-sz*.25,sz*.08,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#000";
          const ey=p.imgIdx===1?sz*.02:0;
          ctx.beginPath();ctx.arc(-sz*.12,-sz*.25+ey,sz*.04,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(sz*.12,-sz*.25+ey,sz*.04,0,Math.PI*2);ctx.fill();
          ctx.restore();
        }
        drawFrogTongue(p);
      }
      else if(p.type==='ffly'){
        p.angle+=p.turn*(Math.sin(p.pulse*.5)>0?1:-1);
        p.x+=Math.cos(p.angle)*p.speed;p.y+=Math.sin(p.angle)*p.speed*.7;
        p.pulse+=p.ps;
        const a=Math.max(0,(Math.sin(p.pulse)*.5+.5))*p.maxA;
        if(p.x<-20)p.x=_w+10;if(p.x>_w+20)p.x=-10;
        if(p.y<_h*.1)p.y=_h*.9;if(p.y>_h*.95)p.y=_h*.2;
        if(a>.01){
          const fimg=FX_IMG.firefly&&FX_IMG.firefly[p.imgIdx||0];
          // 先畫光暈（永遠畫，是螢火蟲的靈魂）
          const glowR=p.r*4;
          const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,glowR);
          g.addColorStop(0,`rgba(200,255,100,${a*0.8})`);
          g.addColorStop(.4,`rgba(180,240,80,${a*0.4})`);
          g.addColorStop(1,"rgba(150,230,50,0)");
          ctx.fillStyle=g;ctx.fillRect(p.x-glowR,p.y-glowR,glowR*2,glowR*2);
          // 再疊上真實螢火蟲照片
          if(fimg&&fimg.complete&&fimg.naturalWidth>0){
            const sz=p.size||16;
            ctx.save();
            ctx.translate(p.x,p.y);
            ctx.rotate(p.angle+Math.PI/2);
            ctx.globalAlpha=Math.min(1,a*1.8); // 螢火蟲本體透明度隨脈衝變化
            ctx.drawImage(fimg,-sz/2,-sz/2,sz,sz);
            ctx.restore();
          } else {
            // fallback：亮點
            ctx.beginPath();ctx.fillStyle=`rgba(220,255,150,${a*1.2})`;
            ctx.arc(p.x,p.y,p.r*.5,0,Math.PI*2);ctx.fill();
          }
        }
      }
      else if(p.type==='leaf'){
        p.y+=p.speed;p.x+=p.drift;p.wobble+=p.ws;p.rot+=p.rs;
        p.x+=Math.sin(p.wobble)*1.1;p.speed+=Math.sin(p.wobble*2)*.015;
        if(p.y>_h+40){seasonParts.splice(i,1);continue}
        const sz=p.size;
        const img=FX_IMG.maple[p.imgIdx||0];
        if(img&&img.complete&&img.naturalWidth>0){
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.globalAlpha=p.alpha;
          ctx.drawImage(img,-sz,-sz,sz*2,sz*2);
          ctx.restore();
        }else{
          // Fallback: 圖片未載入時畫程序化葉形
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
          ctx.beginPath();ctx.moveTo(0,-sz);
          ctx.quadraticCurveTo(sz*.5,-sz*.3,sz*.8,-sz*.6);
          ctx.quadraticCurveTo(sz*.4,0,sz*.6,sz*.4);
          ctx.quadraticCurveTo(sz*.2,sz*.3,0,sz*.8);
          ctx.quadraticCurveTo(-sz*.2,sz*.3,-sz*.6,sz*.4);
          ctx.quadraticCurveTo(-sz*.4,0,-sz*.8,-sz*.6);
          ctx.quadraticCurveTo(-sz*.5,-sz*.3,0,-sz);
          ctx.fillStyle=`rgba(200,75,25,${p.alpha})`;ctx.fill();
          ctx.restore();
        }
      }
      else if(p.type==='fspark'){
        p.pulse+=p.ps;
        const a=Math.max(0,Math.sin(p.pulse))*p.maxA;
        if(a>.01){
          ctx.beginPath();ctx.fillStyle=`rgba(210,230,255,${a})`;
          ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle=`rgba(220,240,255,${a*.4})`;ctx.lineWidth=.5;
          ctx.beginPath();ctx.moveTo(p.x-p.r*2,p.y);ctx.lineTo(p.x+p.r*2,p.y);ctx.stroke();
          ctx.beginPath();ctx.moveTo(p.x,p.y-p.r*2);ctx.lineTo(p.x,p.y+p.r*2);ctx.stroke();
        }
      }
      else if(p.type==='mist'){
        p.x+=p.speed*p.dir;
        if(p.x>_w+p.w)p.x=-p.w;if(p.x<-p.w)p.x=_w;
        const g=ctx.createRadialGradient(p.x+p.w/2,p.y,0,p.x+p.w/2,p.y,p.w/2);
        g.addColorStop(0,`rgba(200,210,225,${p.alpha})`);g.addColorStop(1,"rgba(200,210,225,0)");
        ctx.fillStyle=g;ctx.fillRect(p.x,p.y-p.h,p.w,p.h*2);
      }
    }
    // === 青蛙最後畫（確保在荷葉/其他粒子之上）===
    for(let i=seasonParts.length-1;i>=0;i--){
      const p=seasonParts[i];
      if(p.type!=='frog') continue;
      // 青蛙狀態機：sitting / crouching / jumping
      let lly=null;
      for(let j=0;j<seasonParts.length;j++){
        const q=seasonParts[j];
        if(q.type==='lpad'&&q.padId===p.padId){lly=q;break;}
      }
      if(!lly){
        const anyLily=seasonParts.find(q=>q.type==='lpad');
        if(!anyLily){seasonParts.splice(i,1);continue;}
        p.padId=anyLily.padId;lly=anyLily;
      }
      if(p.state==="sitting"){
        p.x=lly.x;
        p.y=lly.y-p.size*0.45;
        p.blinkTimer--;
        if(p.blinkTimer<=0){
          p.imgIdx=p.imgIdx===1?0:1;
          p.blinkTimer=p.imgIdx===1?(5+Math.floor(Math.random()*6)):(120+Math.floor(Math.random()*180));
        }
        p.huntTimer--;
        if(p.huntTimer<=0){
          const mouthX=p.x,mouthY=p.y-p.size*0.05;
          const maxR=160;
          let best=null,bestD=maxR*maxR;
          for(let k=0;k<seasonParts.length;k++){
            const q=seasonParts[k];
            if(q.type!=='ffly'&&q.type!=='dfly') continue;
            if(q.type==='dfly'&&q.state!=='flying') continue;
            const dx=q.x-mouthX,dy=q.y-mouthY;
            const d2=dx*dx+dy*dy;
            if(d2<bestD){bestD=d2;best=q;}
          }
          if(best){
            p.preyRef=best;
            p.tongueFromX=mouthX;p.tongueFromY=mouthY;
            p.tongueToX=best.x;p.tongueToY=best.y;
            p.tongueProgress=0;
            p.state="catching";
            p.imgIdx=1;
            p.facing=best.x<p.x?1:-1;
            p.huntTimer=0;
          } else {
            p.huntTimer=120+Math.floor(Math.random()*180);
          }
        }
        if(p.state==="sitting"){
          p.jumpTimer--;
          if(p.jumpTimer<=0){
            const others=seasonParts.filter(q=>q.type==='lpad'&&q.padId!==p.padId);
            if(others.length>0){
              const target=others[Math.floor(Math.random()*others.length)];
              p.jumpFromX=p.x;p.jumpFromY=p.y;
              p.jumpToX=target.x;p.jumpToY=target.y-p.size*0.45;
              p.jumpTargetPadId=target.padId;
              p.jumpProgress=0;p.state="crouching";p.crouchTimer=20;
              p.facing=p.jumpToX<p.jumpFromX?1:-1;
              p.imgIdx=2;
            } else {
              p.jumpTimer=400+Math.floor(Math.random()*1200);
            }
          }
        }
      } else if(p.state==="catching"){
        p.tongueProgress+=0.15;
        if(p.preyRef&&seasonParts.indexOf(p.preyRef)>=0){
          p.tongueToX=p.preyRef.x;p.tongueToY=p.preyRef.y;
        } else {
          p.preyRef=null;p.state="retracting";p.tongueProgress=1;
        }
        if(p.tongueProgress>=1){
          p.tongueProgress=1;
          p.state="retracting";
        }
      } else if(p.state==="retracting"){
        p.tongueProgress-=0.2;
        if(p.tongueProgress<=0){
          p.tongueProgress=0;
          if(p.preyRef){
            const idx=seasonParts.indexOf(p.preyRef);
            if(idx>=0) seasonParts.splice(idx,1);
            p.preyRef=null;
          }
          p.state="sitting";
          p.imgIdx=0;
          p.huntTimer=240+Math.floor(Math.random()*360);
          p.blinkTimer=60+Math.floor(Math.random()*120);
        }
      } else if(p.state==="crouching"){
        p.crouchTimer--;
        if(p.crouchTimer<=0){p.state="jumping";p.imgIdx=3;}
      } else if(p.state==="jumping"){
        p.jumpProgress+=.025;
        if(p.jumpProgress>=1){
          p.state="sitting";
          p.padId=p.jumpTargetPadId;
          p.imgIdx=0;p.blinkTimer=120+Math.floor(Math.random()*180);
          p.jumpTimer=400+Math.floor(Math.random()*1200);
        } else {
          const tt=p.jumpProgress;
          p.x=p.jumpFromX+(p.jumpToX-p.jumpFromX)*tt;
          const arc=-Math.sin(tt*Math.PI)*80;
          p.y=p.jumpFromY+(p.jumpToY-p.jumpFromY)*tt+arc;
        }
      }
      const sz=p.size;
      const fimg=FX_IMG.frog&&FX_IMG.frog[p.imgIdx||0];
      if(fimg&&fimg.complete&&fimg.naturalWidth>0){
        ctx.save();ctx.translate(p.x,p.y);
        if(p.facing===-1) ctx.scale(-1,1);
        ctx.globalAlpha=p.alpha;
        ctx.drawImage(fimg,-sz/2,-sz/2,sz,sz);
        ctx.restore();
      }else{
        // Fallback: 程序化綠色青蛙
        ctx.save();ctx.translate(p.x,p.y);
        ctx.globalAlpha=p.alpha;
        ctx.fillStyle="#5a8f3a";
        ctx.beginPath();ctx.ellipse(0,2,sz*.35,sz*.28,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#6ba84a";
        ctx.beginPath();ctx.ellipse(0,-sz*.15,sz*.3,sz*.22,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#fff";
        ctx.beginPath();ctx.arc(-sz*.12,-sz*.25,sz*.08,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(sz*.12,-sz*.25,sz*.08,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#000";
        const ey=p.imgIdx===1?sz*.02:0;
        ctx.beginPath();ctx.arc(-sz*.12,-sz*.25+ey,sz*.04,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(sz*.12,-sz*.25+ey,sz*.04,0,Math.PI*2);ctx.fill();
        ctx.restore();
      }
      drawFrogTongue(p);
    }
    if(seasonParts.length>130) seasonParts.splice(0,seasonParts.length-130);
  }

  function getMode(){return mode}
  function _debug(){
    const stat=[];
    Object.keys(FX_IMG).forEach(key=>{
      const v=FX_IMG[key];
      if(Array.isArray(v)){
        v.forEach((img,i)=>{
          stat.push({
            kind:key,
            idx:i+1,
            src:(img&&img.src||"").replace(location.origin,""),
            loaded:!!(img&&img.complete&&img.naturalWidth>0),
            w:img?img.naturalWidth:0
          });
        });
      }else if(v){
        stat.push({
          kind:key,
          idx:1,
          src:(v.src||"").replace(location.origin,""),
          loaded:!!(v.complete&&v.naturalWidth>0),
          w:v.naturalWidth
        });
      }
    });
    const bflyCount=seasonParts.filter(p=>p.type==='bfly').length;
    const leafCount=seasonParts.filter(p=>p.type==='leaf').length;
    console.table(stat);
    console.log("Season:",curSeason,"TimeSlot:",curTimeSlot,"Mode:",mode,"Butterflies:",bflyCount,"Leaves:",leafCount);
    return{stat,bflyCount,leafCount,season:curSeason,ts:curTimeSlot,mode};
  }
  function _spawnBfly(n){
    n=n||3;
    for(let i=0;i<n;i++) seasonParts.push(mkButterfly());
    return"Spawned "+n+" butterflies. Total: "+seasonParts.filter(p=>p.type==='bfly').length;
  }
  function _spawnLeaf(n){
    n=n||10;
    for(let i=0;i<n;i++) seasonParts.push(mkLeaf());
    return"Spawned "+n+" leaves. Total: "+seasonParts.filter(p=>p.type==='leaf').length;
  }
  // 強制靜音（由全域 FX 開關呼叫）
  function _forceSilence(){
    try{
      if(typeof stopSeasonSnd==='function') stopSeasonSnd();
    }catch(e){}
  }
  return{update,getMode,_debug,_spawnBfly,_spawnLeaf,_forceSilence};
})();
try{window.WxFx=WxFx;_syncWeatherFx()}catch(e){}

// ═══ WEATHER SOUND ENGINE ═══
const WxSfx = (function(){
  let actx=null, masterGain=null;
  let rainNode=null, rainGain=null, rainFilter=null;
  let windNode=null, windGain=null, windFilter=null, windLfo=null, windLfoGain=null;
  let mode="none", muted=true, _initialized=false;
  
  try{muted=localStorage.getItem("sb_sfx")!=="on"}catch(e){}
  
  function initAudio(){
    // 全域 FX 停用，或音效分類停用時，拒絕啟動音訊
    try{
      const adminOff=window.APP_CFG&&window.APP_CFG.visualFx&&window.APP_CFG.visualFx.enabled===false;
      const userOff=window.USER_PREFS&&window.USER_PREFS.visualFx===false;
      const soundOff=window.USER_PREFS&&window.USER_PREFS.fxDetail&&window.USER_PREFS.fxDetail.sound===false;
      if(adminOff||userOff||soundOff) return false;
    }catch(e){}
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
    const now=actx.currentTime;
    const distance=0.15+Math.random()*0.8;
    const intensity=0.45+Math.random()*0.5;
    const tail=0.35+Math.random()*0.6;
    const lightningDelay=0.12+distance*2.2;
    const ts=now+lightningDelay;

    const bus=actx.createGain();bus.gain.value=1.0;bus.connect(masterGain);

    // Crack layer
    (function(){
      const n=actx.createBufferSource();n.buffer=mkNoise(0.8);
      const hp=actx.createBiquadFilter();hp.type="highpass";hp.frequency.value=1800-distance*900;
      const bp=actx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=2500-distance*1000;bp.Q.value=1.2;
      const g=actx.createGain();
      g.gain.setValueAtTime(.0001,ts);g.gain.linearRampToValueAtTime(.35+intensity*.5,ts+.004);g.gain.exponentialRampToValueAtTime(.0001,ts+.09);
      n.connect(hp);hp.connect(bp);bp.connect(g);g.connect(bus);
      n.start(ts);n.stop(ts+.12);
    })();

    // Boom layer
    (function(){
      const o1=actx.createOscillator();o1.type="sawtooth";
      const o2=actx.createOscillator();o2.type="triangle";
      const n=actx.createBufferSource();n.buffer=mkNoise(2.5);
      const nlp=actx.createBiquadFilter();nlp.type="lowpass";nlp.frequency.value=220-distance*100;
      const g1=actx.createGain(),g2=actx.createGain(),gn=actx.createGain(),mix=actx.createGain();
      const bt=ts+.02;
      o1.frequency.setValueAtTime(42+intensity*16-distance*10,bt);
      o2.frequency.setValueAtTime(58+intensity*12-distance*10,bt);
      g1.gain.setValueAtTime(.0001,bt);g1.gain.linearRampToValueAtTime(.16+intensity*.18,bt+.03);g1.gain.exponentialRampToValueAtTime(.0001,bt+1.2);
      g2.gain.setValueAtTime(.0001,bt);g2.gain.linearRampToValueAtTime(.12+intensity*.14,bt+.05);g2.gain.exponentialRampToValueAtTime(.0001,bt+1.4);
      gn.gain.setValueAtTime(.0001,bt);gn.gain.linearRampToValueAtTime(.25+intensity*.3,bt+.02);gn.gain.exponentialRampToValueAtTime(.0001,bt+1.0);
      mix.gain.value=1.0;
      o1.connect(g1);o2.connect(g2);n.connect(nlp);nlp.connect(gn);
      g1.connect(mix);g2.connect(mix);gn.connect(mix);mix.connect(bus);
      o1.start(bt);o2.start(bt+.01);n.start(bt);
      o1.stop(bt+1.25);o2.stop(bt+1.45);n.stop(bt+1.1);
    })();

    // Rumble layer
    (function(){
      const n=actx.createBufferSource();n.buffer=mkNoise(6);
      const lp=actx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=500-distance*220;
      const bp=actx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=90+intensity*40;bp.Q.value=.4;
      const g=actx.createGain();
      const decay=1.8+tail*3.2+distance*1.5;
      const rt=ts+.08;
      g.gain.setValueAtTime(.0001,rt);g.gain.linearRampToValueAtTime(.18+intensity*.25+tail*.1,rt+.08);g.gain.exponentialRampToValueAtTime(.0001,rt+decay);
      n.connect(lp);lp.connect(bp);bp.connect(g);g.connect(bus);
      n.start(rt);n.stop(rt+decay+.2);
    })();

    // Reflection layer (echo taps)
    const taps=[{d:.18,g:.16,c:900},{d:.33,g:.12,c:700},{d:.57,g:.08,c:500},{d:.82,g:.05,c:350}];
    taps.forEach((tap,i)=>{
      const dl=actx.createDelay(2.0);dl.delayTime.value=tap.d+distance*.25+i*.03;
      const f=actx.createBiquadFilter();f.type="lowpass";f.frequency.value=tap.c-distance*180;
      const g=actx.createGain();g.gain.value=tap.g+tail*.03;
      bus.connect(dl);dl.connect(f);f.connect(g);g.connect(masterGain);
    });
  }
  
  function stopAll(){stopRain();stopWind()}
  
  function setMode(m){
    if(m===mode) return;
    mode=m;
    stopAll();
    if(!soundEnabled()) return;
    if(!muted&&!_initialized) initAudio();
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
      case "fog":
        // Very quiet wind for fog
        startWind(false);
        if(windGain)windGain.gain.value=.02;
        if(windFilter){windFilter.frequency.value=120;windFilter.Q.value=.15}
        break;
      case "cold":
        // Soft eerie wind whistle
        startWind(false);
        if(windGain)windGain.gain.value=0.04;
        if(windFilter){windFilter.frequency.value=180;windFilter.Q.value=0.3}
        break;
    }
  }
  
  function toggle(){
    // 全域 FX 停用或音效分類停用時，無法解除靜音
    try{
      const adminOff=window.APP_CFG&&window.APP_CFG.visualFx&&window.APP_CFG.visualFx.enabled===false;
      const userOff=window.USER_PREFS&&window.USER_PREFS.visualFx===false;
      const soundOff=window.USER_PREFS&&window.USER_PREFS.fxDetail&&window.USER_PREFS.fxDetail.sound===false;
      if(adminOff||userOff||soundOff){
        muted=true;
        if(masterGain) masterGain.gain.value=0;
        render();
        return;
      }
    }catch(e){}
    if(!initAudio()) return;
    muted=!muted;
    try{localStorage.setItem("sb_sfx",muted?"off":"on")}catch(e){}
    if(masterGain) masterGain.gain.value=muted?0:1;
    if(!muted&&actx&&actx.state==="suspended") actx.resume();
    // Restart current weather sounds when unmuting
    if(!muted&&mode!=="none"){const cur=mode;mode="none";setMode(cur)}
    // Restart seasonal sounds
    if(!muted){setSeasonSnd(getSeason())}else{stopSeasonSnd()}
    render();
  }
  
  function triggerThunder(){
    if(!soundEnabled()) return;
    if(!_initialized){if(!initAudio())return}
    if(actx&&actx.state==='suspended')actx.resume();
    thunder();
  }
  
  function isMuted(){return muted||!soundEnabled()}
  function _forceSilence(){
    try{
      if(masterGain) masterGain.gain.value=0;
      stopAll();
      stopSeasonSnd();
      if(actx&&actx.state==='running'){try{actx.suspend()}catch(e){}}
    }catch(e){}
  }

  // Auto-start audio on first user gesture if previously enabled
  if(!muted){
    const _autoStart=()=>{
      document.removeEventListener("touchstart",_autoStart);
      document.removeEventListener("click",_autoStart);
      if(!_initialized&&initAudio()){
        if(actx&&actx.state==="suspended")actx.resume();
        if(mode!=="none"){const cur=mode;mode="none";setMode(cur)}
        setSeasonSnd(getSeason());
      }
    };
    document.addEventListener("touchstart",_autoStart,{once:true,passive:true});
    document.addEventListener("click",_autoStart,{once:true});
  }


  // ═══ SEASONAL SOUNDS (weather-aware) ═══
  let seasonSnd="",seasonInterval=null;
  let cicadaNode2=null,cicadaGain2=null,cicadaFilter2=null,cicadaLfo2=null,cicadaLfoG2=null;
  let frogInterval=null;

  function stopSeasonSnd(){
    if(cicadaNode2){try{cicadaNode2.stop()}catch(e){}cicadaNode2=null}
    if(cicadaLfo2){try{cicadaLfo2.stop()}catch(e){}cicadaLfo2=null}
    cicadaGain2=null;cicadaFilter2=null;cicadaLfoG2=null;
    if(seasonInterval){clearTimeout(seasonInterval);seasonInterval=null}
    if(frogInterval){clearTimeout(frogInterval);frogInterval=null}
    seasonSnd="";
  }

  // Bird sounds with variety
  function chirpBird(species){
    if(!actx||muted)return;
    const sp=species||Math.floor(Math.random()*4);
    if(sp===0){
      // Sparrow: rapid short chirps
      const f=3000+Math.random()*1500,n=2+Math.floor(Math.random()*3);
      for(let j=0;j<n;j++){
        const osc=actx.createOscillator();osc.type="sine";
        const g=actx.createGain();const t0=actx.currentTime+j*.07;
        g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.03,t0+.01);
        g.gain.exponentialRampToValueAtTime(.001,t0+.06);
        osc.frequency.setValueAtTime(f+Math.random()*400,t0);
        osc.frequency.linearRampToValueAtTime(f+600,t0+.02);
        osc.frequency.linearRampToValueAtTime(f-100,t0+.05);
        osc.connect(g);g.connect(masterGain);osc.start(t0);osc.stop(t0+.1);
      }
    } else if(sp===1){
      // Warbler: descending melodic trill
      const f=4000+Math.random()*1000;
      for(let j=0;j<4+Math.floor(Math.random()*3);j++){
        const osc=actx.createOscillator();osc.type="sine";
        const g=actx.createGain();const t0=actx.currentTime+j*.1;
        g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.025,t0+.015);
        g.gain.exponentialRampToValueAtTime(.001,t0+.08);
        osc.frequency.setValueAtTime(f-j*200,t0);
        osc.frequency.linearRampToValueAtTime(f-j*200-300,t0+.06);
        osc.connect(g);g.connect(masterGain);osc.start(t0);osc.stop(t0+.12);
      }
    } else if(sp===2){
      // Cuckoo: two notes
      for(let j=0;j<2;j++){
        const osc=actx.createOscillator();osc.type="sine";
        const g=actx.createGain();const t0=actx.currentTime+j*.35;
        g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.04,t0+.02);
        g.gain.exponentialRampToValueAtTime(.001,t0+.25);
        osc.frequency.setValueAtTime(j===0?1200:900,t0);
        osc.connect(g);g.connect(masterGain);osc.start(t0);osc.stop(t0+.3);
      }
    } else {
      // Robin: melodic rising
      const f=2500+Math.random()*800;
      for(let j=0;j<3;j++){
        const osc=actx.createOscillator();osc.type="sine";
        const g=actx.createGain();const t0=actx.currentTime+j*.12;
        g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.03,t0+.015);
        g.gain.exponentialRampToValueAtTime(.001,t0+.1);
        osc.frequency.setValueAtTime(f+j*300,t0);
        osc.frequency.linearRampToValueAtTime(f+j*300+200,t0+.05);
        osc.connect(g);g.connect(masterGain);osc.start(t0);osc.stop(t0+.15);
      }
    }
  }

  function chirpCricket(){
    if(!actx||muted)return;
    const f=4200+Math.random()*800,n=2+Math.floor(Math.random()*4);
    for(let j=0;j<n;j++){
      const osc=actx.createOscillator();osc.type="sine";osc.frequency.value=f+Math.random()*200;
      const g=actx.createGain();const t0=actx.currentTime+j*.06;
      g.gain.setValueAtTime(.02+Math.random()*.01,t0);g.gain.setValueAtTime(0,t0+.025);
      osc.connect(g);g.connect(masterGain);osc.start(t0);osc.stop(t0+.04);
    }
  }

  function croakFrog(){
    if(!actx||muted)return;
    // 連續 2-4 聲「呱」，每聲極短帶脈衝顆粒感
    const calls=2+Math.floor(Math.random()*3);
    const baseF=180+Math.random()*120; // 蛙種基頻 180-300Hz
    let t=actx.currentTime;
    for(let n=0;n<calls;n++){
      const dur=0.08+Math.random()*0.07; // 每聲 80-150ms
      // 主振盪：鋸齒，做共振峰
      const osc=actx.createOscillator();
      osc.type="sawtooth";
      osc.frequency.setValueAtTime(baseF*(0.95+Math.random()*0.1),t);
      osc.frequency.exponentialRampToValueAtTime(baseF*0.75,t+dur);
      // 帶通濾波模擬聲道共振峰
      const flt=actx.createBiquadFilter();
      flt.type="bandpass";
      flt.frequency.value=700+Math.random()*200;
      flt.Q.value=6;
      // 第二個共振峰（高頻「呱」的亮度）
      const flt2=actx.createBiquadFilter();
      flt2.type="bandpass";
      flt2.frequency.value=1600+Math.random()*400;
      flt2.Q.value=4;
      const mix=actx.createGain();mix.gain.value=0.7;
      const mix2=actx.createGain();mix2.gain.value=0.3;
      // 脈衝顆粒感：用 LFO 調變振幅，50-80Hz 讓它聽起來「顆顆顆」
      const lfo=actx.createOscillator();
      lfo.type="square";
      lfo.frequency.value=55+Math.random()*25;
      const lfoG=actx.createGain();
      lfoG.gain.value=0.5;
      // 總包絡
      const env=actx.createGain();
      env.gain.setValueAtTime(0,t);
      env.gain.linearRampToValueAtTime(0.12,t+0.01);
      env.gain.setValueAtTime(0.10,t+dur*0.6);
      env.gain.exponentialRampToValueAtTime(0.001,t+dur);
      // 連接：osc -> flt & flt2 -> mix -> env(受 lfo 調變) -> masterGain
      osc.connect(flt);osc.connect(flt2);
      flt.connect(mix);flt2.connect(mix2);
      mix.connect(env);mix2.connect(env);
      lfo.connect(lfoG);lfoG.connect(env.gain);
      env.connect(masterGain);
      osc.start(t);osc.stop(t+dur+0.02);
      lfo.start(t);lfo.stop(t+dur+0.02);
      // 兩聲之間的間隔（青蛙通常 120-250ms）
      t+=dur+0.12+Math.random()*0.13;
    }
  }

  function startCicada(){
    if(!actx)return;
    const buf=mkNoise(2);
    cicadaNode2=actx.createBufferSource();cicadaNode2.buffer=buf;cicadaNode2.loop=true;
    cicadaFilter2=actx.createBiquadFilter();cicadaFilter2.type="bandpass";
    cicadaFilter2.frequency.value=3500+Math.random()*1500;cicadaFilter2.Q.value=4+Math.random()*3;
    cicadaGain2=actx.createGain();cicadaGain2.gain.value=.04;
    cicadaLfo2=actx.createOscillator();cicadaLfo2.frequency.value=5+Math.random()*7;
    cicadaLfoG2=actx.createGain();cicadaLfoG2.gain.value=.025;
    cicadaLfo2.connect(cicadaLfoG2);cicadaLfoG2.connect(cicadaGain2.gain);cicadaLfo2.start();
    cicadaNode2.connect(cicadaFilter2);cicadaFilter2.connect(cicadaGain2);cicadaGain2.connect(masterGain);
    cicadaNode2.start();
  }

  function hasWeatherWind(){return mode==='wind'||mode==='storm'||mode==='typhoon'||mode==='cold'}
  function hasWeatherRain(){return mode==='rain'||mode==='heavy'||mode==='storm'||mode==='typhoon'||mode==='snow'}
  function wxSuppressSound(){return mode==='rain'||mode==='heavy'||mode==='storm'||mode==='typhoon'||mode==='snow'||mode==='fog'}
  function soundEnabled(){
    try{
      if(typeof isFxEnabled==='function') return isFxEnabled('sound');
      if(window&&typeof window.isFxEnabled==='function') return window.isFxEnabled('sound');
    }catch(e){}
    return true;
  }

  function setSeasonSnd(s){
    const suppress=wxSuppressSound();
    const key=s+'_'+(suppress?'wx':'')+mode+'_'+getTimeSlot();
    if(key===seasonSnd)return;
    stopSeasonSnd();
    if(!soundEnabled()||muted||!_initialized||!actx)return;
    seasonSnd=key;
    if(suppress) return; // Weather sounds dominate

    const ts=getTimeSlot();
    if(s==='spring'){
      if(ts==='morning'||ts==='day'){
        // Random birds every 4-10s, varying species
        const loop=()=>{chirpBird();seasonInterval=setTimeout(loop,4000+Math.random()*6000)};
        seasonInterval=setTimeout(loop,1500+Math.random()*2000);
      } else if(ts==='dusk'){
        // Sparse birds + early crickets
        const loop=()=>{if(Math.random()>.5)chirpBird(2);else chirpCricket();seasonInterval=setTimeout(loop,5000+Math.random()*8000)};
        seasonInterval=setTimeout(loop,2000);
      } else {
        // Night: frogs + crickets
        const cLoop=()=>{chirpCricket();seasonInterval=setTimeout(cLoop,2000+Math.random()*5000)};
        seasonInterval=setTimeout(cLoop,1000);
        const fLoop=()=>{croakFrog();frogInterval=setTimeout(fLoop,3000+Math.random()*8000)};
        frogInterval=setTimeout(fLoop,2000+Math.random()*3000);
      }
    } else if(s==='summer'){
      if(ts==='morning'||ts==='day'){
        startCicada();
        // Occasional bird too
        const loop=()=>{if(Math.random()>.6)chirpBird(Math.floor(Math.random()*4));seasonInterval=setTimeout(loop,8000+Math.random()*12000)};
        seasonInterval=setTimeout(loop,5000);
      } else if(ts==='dusk'){
        // Cicadas fading, crickets starting
        startCicada();if(cicadaGain2)cicadaGain2.gain.value=.02;
        const loop=()=>{chirpCricket();seasonInterval=setTimeout(loop,2500+Math.random()*4000)};
        seasonInterval=setTimeout(loop,1500);
      } else {
        // Night: crickets + frogs, no cicadas
        const cLoop=()=>{chirpCricket();seasonInterval=setTimeout(cLoop,1500+Math.random()*3500)};
        seasonInterval=setTimeout(cLoop,800);
        const fLoop=()=>{croakFrog();frogInterval=setTimeout(fLoop,4000+Math.random()*8000)};
        frogInterval=setTimeout(fLoop,2000);
      }
    } else if(s==='autumn'){
      // Soft wind only if weather isn't already providing wind
      if(!hasWeatherWind()){startWind(false);if(windGain)windGain.gain.value=.02}
      if(ts==='day'||ts==='morning'){
        // Very sparse birds
        const loop=()=>{if(Math.random()>.4)chirpBird(3);seasonInterval=setTimeout(loop,10000+Math.random()*15000)};
        seasonInterval=setTimeout(loop,5000);
      } else {
        // Night: slow crickets
        const loop=()=>{chirpCricket();seasonInterval=setTimeout(loop,3000+Math.random()*7000)};
        seasonInterval=setTimeout(loop,2000);
      }
    } else if(s==='winter'){
      if(!hasWeatherWind()){startWind(false);if(windGain)windGain.gain.value=.03;
      if(windFilter){windFilter.frequency.value=150;windFilter.Q.value=.2}}
    }
  }

  function getTimeSlot(){
    const h=new Date().getHours();
    if(h>=6&&h<10) return 'morning';
    if(h>=10&&h<16) return 'day';
    if(h>=16&&h<19) return 'dusk';
    return 'night';
  }

  // Periodic check for time/weather changes (every 15s for responsiveness)
  setInterval(()=>{
    if(!_initialized||muted)return;
    setSeasonSnd(getSeason());
  },15000);

  return{setMode,toggle,triggerThunder,isMuted,initAudio,setSeasonSnd,stopSeasonSnd,_forceSilence};
})();
try{window.WxSfx=WxSfx}catch(e){}

// ══════════════ AUTO DARK MODE（直接切換，不再漸暗） ══════════════
(function(){
  function applyTheme(){
    const now=new Date();
    const t=now.getHours()+now.getMinutes()/60;
    // 19:00-05:00 → dark mode
    // 05:00-19:00 → light mode
    const darkUI=(t>=19||t<5);
    const cur=document.documentElement.getAttribute('data-theme');
    const want=darkUI?'dark':'';
    if(cur!==want){
      if(want) document.documentElement.setAttribute('data-theme','dark');
      else document.documentElement.removeAttribute('data-theme');
    }
    const mt=document.querySelector('meta[name="theme-color"]');
    if(mt) mt.setAttribute('content',darkUI?'#000000':'#00897b');
    const dim=document.getElementById('_dim');
    if(dim) dim.remove();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',applyTheme);
  }else{
    applyTheme();
  }
  setInterval(applyTheme,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyTheme()});
})();

if('serviceWorker' in navigator){
  let _swRefreshing=false;
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
    reg.update();
    try{syncAlertPrefsToServiceWorker()}catch(e){}
    // 每 5 分鐘檢查一次；新版本會在下次使用者完全關閉 app 後自動生效
    setInterval(()=>reg.update(),300000);
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    try{syncAlertPrefsToServiceWorker()}catch(e){}
    if(_swRefreshing)return;
    _swRefreshing=true;
    location.reload();
  })
}
// Note: 舊版曾寫死 'myshift-v136' 導致每次開 app 都清快取。現在由 SW 自己依 CACHE_NAME 管理。
