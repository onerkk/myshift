/* First-use guide. Examples are independent of personal shifts and leave records. */
(function(){
'use strict';
const chapters=[
 {titles:['設定你的輪班','Atur pola shift'],copy:['選好單位和班制，再指定今天上哪個班、輪到第幾天。系統會從這一天排出往後的班表。','Pilih unit dan pola kerja, lalu tentukan shift hari ini dan urutannya dalam siklus. Jadwal berikutnya dihitung dari tanggal itu.'],labels:[['選單位','選班制','對齊今天'],['Unit','Pola kerja','Hari ini']],topics:[0,17]},
 {titles:['從今天開始看','Mulai dari hari ini'],copy:['「今天」顯示當班時段與接下來的休假。底部五個分頁可以直接前往班表、薪資、天氣與更多設定。','Di Hari ini, lihat jam shift dan jadwal libur berikutnya. Gunakan lima tab di bawah untuk membuka jadwal, gaji, cuaca, atau pengaturan lainnya.'],labels:[['今天','當班時段','下次休假'],['Hari ini','Jam shift','Libur berikutnya']],topics:[21,22]},
 {titles:['按住日期，讀當天備註','Tahan tanggal untuk membaca catatan'],copy:['圓點表示當天有事項。按住日期約半秒就能預覽，放開收起。輕點可開啟明細；左右滑動換月。「請假人數」看人力，「每日清單」可篩選會議、體檢或個人事項。','Titik menandai tanggal dengan agenda. Tahan sekitar setengah detik untuk melihat isinya, lalu lepaskan. Ketuk untuk rincian atau geser untuk ganti bulan. Pilih Jumlah cuti untuk melihat jumlah orang, atau Agenda untuk menyaring kegiatan.'],labels:[['早班','班股會議'],['Pagi','Rapat regu']],topics:[1,19]},
 {titles:['在日期明細處理請假與調班','Kelola cuti dan perubahan shift'],copy:['點日期後可調整當班、標記上課或公出，也能寫交接備註。請假時先選假別與起訖時間，核對扣假時數和加班變化，再送出。','Ketuk tanggal untuk mengganti shift, menandai kelas atau tugas dinas, dan menulis catatan serah terima. Untuk cuti, pilih jenis dan waktunya, periksa jam cuti dan lembur, lalu kirim.'],labels:[['選日期','填時段','核對時數'],['Tanggal','Pilih waktu','Periksa jam']],topics:[2,3,4]},
 {titles:['核對這一期的薪資','Periksa gaji periode ini'],copy:['在「薪資」選月份，查看計薪區間、加班、夜點與扣款。展開逐日明細可找到差額來自哪一天；「更多」裡的年度統計可看全年工時與請假。','Pilih bulan di tab Gaji untuk melihat periode, lembur, tunjangan malam, dan potongan. Buka rincian harian untuk menelusuri selisih. Statistik tahunan di menu Lainnya merangkum jam kerja dan cuti.'],labels:[['計薪區間','逐日工時','預估實領'],['Periode','Jam harian','Estimasi bersih']],topics:[6,7,5]},
 {titles:['看上班時段的天氣','Lihat cuaca saat bekerja'],copy:['設定工作地點後，可看逐時與七日預報、降雨、雷達和潮汐。在通知設定中挑選需要的警報，並依手機提示授權通知。','Atur lokasi kerja untuk melihat prakiraan per jam dan tujuh hari, hujan, radar, serta pasang surut. Pilih peringatan yang diperlukan dan izinkan notifikasi di ponsel.'],labels:[['選地點','看預報','設警報'],['Lokasi','Prakiraan','Peringatan']],topics:[8,9,10,12,13]},
 {titles:['調整語言與畫面','Sesuaikan bahasa dan tampilan'],copy:['「更多」可切換中文或印尼文、日夜外觀、農曆、季節動畫與音效。回到「功能導覽」可隨時重看這份教學。','Di Lainnya, pilih bahasa, tampilan terang atau gelap, kalender lunar, animasi musim, dan suara. Buka Panduan fitur kapan saja untuk mengulangi tur ini.'],labels:[['更多','外觀','偏好設定'],['Lainnya','Tampilan','Preferensi']],topics:[11,14,15]},
 {titles:['分享班表與管理帳號','Bagikan jadwal dan kelola akun'],copy:['在「更多」把當月班表存成圖片，或查看帳號與同步狀態。管理員可在單位請假總覽核對人力；一般成員可從班表查看每日請假人數。','Di Lainnya, simpan jadwal bulan ini sebagai gambar atau periksa akun dan sinkronisasi. Admin dapat membuka ringkasan cuti unit. Anggota dapat melihat jumlah orang yang cuti per hari di kalender.'],labels:[['選月份','分享班表','儲存圖片'],['Pilih bulan','Bagikan','Simpan gambar']],topics:[16,18,20]}
];
const seen=new Set();
let dialog=null,index=0,owner=null,returnTo=null,lastLanguage='';
function key(){return fbUser?.uid?'myshift.guide.v1.'+fbUser.uid:null}
function close(remember){
  if(!dialog)return;
  if(remember&&owner){
    seen.add(owner);
    try{localStorage.setItem(owner,'1')}catch{}
  }
  const old=dialog;dialog=null;old.close();old.remove();
  if(returnTo?.isConnected)returnTo.focus({preventScroll:true});
  returnTo=null;
}
function paint(){
  const id=lang==='zh'?0:1,zh=id===0,chapter=chapters[index],labels=chapter.labels[id];
  lastLanguage=lang;
  const chapterIcons=[
    ['user','calendar','today'],['today','calendar','moon'],[],['calendar','user','chart'],
    ['calendar','chart','pay'],['weather','radar','bell'],['more','moon','settings'],['calendar','share','download']
  ];
  const pic=index===2?`<div class="guide-demo hold" aria-hidden="true"><b>11<small>${labels[0]}</small></b><i></i><span>${labels[1]}</span></div>`
    :`<div class="guide-demo route" aria-hidden="true">${labels.map((label,i)=>`<span style="--delay:${i*180}ms"><i>${uiIcon(chapterIcons[index][i],22)}</i>${label}</span>`).join('')}</div>`;
  dialog.innerHTML=`<header><label for="guide-sections">${zh?'功能導覽':'Panduan fitur'}</label><span><button type="button" data-a="${zh?'lid':'lzh'}" lang="${zh?'id':'zh-Hant'}">${zh?'Indonesia':'中文'}</button><button data-guide="close">${zh?'跳過':'Lewati'}</button></span></header>
    <select id="guide-sections" aria-label="${zh?'選擇章節':'Pilih bagian'}">${chapters.map((ch,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1} / ${chapters.length} · ${ch.titles[id]}</option>`).join('')}</select>
    <div class="guide-progress" aria-hidden="true"><i style="width:${(index+1)/chapters.length*100}%"></i></div>
    <article>${pic}<h2 id="guide-title" tabindex="-1">${chapter.titles[id]}</h2><p>${chapter.copy[id]}</p>
    ${chapter.topics.map(n=>{const [title,body]=t('h')[n].split('|');return `<details><summary>${esc(title)}</summary><p>${esc(body)}</p></details>`}).join('')}</article>
    <footer><button data-guide="prev" ${index===0?'disabled':''}>${zh?'上一步':'Kembali'}</button><button data-guide="next">${index===chapters.length-1?(zh?'完成教學':'Selesai'):(zh?'下一步':'Lanjut')} →</button></footer>`;
  _bindActions(dialog);
  dialog.querySelector('#guide-sections').onchange=e=>{index=Number(e.target.value);paint()};
  dialog.querySelector('#guide-title').focus({preventScroll:true});
}
function open(){
  if(dialog)return;
  owner=key();index=0;returnTo=document.activeElement;
  dialog=document.createElement('dialog');dialog.className='v4-guide';dialog.setAttribute('aria-labelledby','guide-title');
  dialog.addEventListener('cancel',e=>{e.preventDefault();close(true)});
  dialog.addEventListener('click',e=>{
    const cmd=e.target.closest('[data-guide]')?.dataset.guide;
    if(cmd==='close'||(cmd==='next'&&index===chapters.length-1)){close(true);return}
    if(cmd==='prev'||cmd==='next'){index+=cmd==='next'?1:-1;paint()}
  });
  document.body.append(dialog);dialog.showModal();paint();
}
window.MyShiftGuide={open,sync(overlayOpen){
  const current=key();
  if(dialog){
    if(current!==owner)close(false);
    else if(lang!==lastLanguage)paint();
    return;
  }
  if(!current||overlayOpen||seen.has(current))return;
  try{if(localStorage.getItem(current)){seen.add(current);return}}catch{}
  open();
}};
if(typeof render==='function')render();
})();
