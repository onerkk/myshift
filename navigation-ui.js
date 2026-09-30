/* v320 · Local navigation. History stores view IDs only; drafts stay in memory. */
const MyShiftNavigation=(()=>{
  const tabs=['today','calendar','pay','weather','more'];
  const session=Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  let entries=[],cursor=-1,nextId=0,restoring=false,pendingKey=null,pendingUi=null,navObserver=null,observedNav=null,lastDialogKey='';
  function kind(){
    if(document.getElementById('wx-location-dialog'))return 'location';
    if(wxDetailShow)return 'wx';
    if(tideDetailShow)return 'tide';
    if(S.modal)return 'day';
    if(showUserPrefs)return 'prefs';
    if(S.showH)return 'help';
    if(S.showStats)return 'stats';
    if(S.showSal)return 'salary';
    if(S.showLeavesOv&&isAdmin())return 'leaves';
    if(showAdmin)return 'admin';
    return '';
  }
  function snapshot(){
    return {tab:UI_TAB,kind:kind(),year:S.yr,month:S.mo,calendarView:UI_CAL_VIEW,calendarFilter:UI_CAL_FILTER,
      pay:{y:PAY_VIEW.y,m:PAY_VIEW.m},day:S.modal?{...S.modal}:null,help:!!S.showH,stats:!!S.showStats,statsYear:S.statsYr,
      salary:!!S.showSal,leaves:!!S.showLeavesOv,prefs:!!showUserPrefs,admin:!!showAdmin,
      wx:!!wxDetailShow,wxDay:wxDetailDay,tide:!!tideDetailShow,tideDay:tideDetailDay};
  }
  function view(route){return route.kind?'sheet:'+route.kind:'page:'+route.tab}
  function title(route){
    const zh=lang==='zh',names=zh?{today:'今天',calendar:'班表',pay:'薪資',weather:'天氣',more:'更多',day:'日期明細',wx:'逐時天氣',tide:'潮汐明細',location:'天氣地點',prefs:'個人設定',help:'使用說明',stats:'年度統計',salary:'計薪設定',leaves:'請假總覽',admin:'管理設定'}:
      {today:'Hari ini',calendar:'Jadwal',pay:'Gaji',weather:'Cuaca',more:'Lainnya',day:'Detail tanggal',wx:'Cuaca per jam',tide:'Detail pasut',location:'Lokasi cuaca',prefs:'Pengaturan',help:'Panduan',stats:'Statistik',salary:'Aturan gaji',leaves:'Ringkasan cuti',admin:'Admin'};
    return names[route?.kind||route?.tab]||names.today;
  }
  function base(route){return {...route,tab:'today',kind:'',day:null,help:false,stats:false,salary:false,leaves:false,prefs:false,admin:false,wx:false,tide:false}}
  function state(entry){return {...(history.state&&typeof history.state==='object'?history.state:{}),myshiftNavigation:{session,key:entry.key}}}
  function owner(){return typeof fbUser!=='undefined'&&fbUser?fbUser.uid:''}
  function entry(route){return {key:++nextId,owner:owner(),route,ui:{scroll:0,focus:null,form:null}}}
  function focusDescription(el){
    if(!el||el===document.body)return null;
    if(el.id)return {id:el.id};
    if(el.dataset?.a)return {action:el.dataset.a,data:{...el.dataset}};
    return null;
  }
  function remember(){
    if(cursor<0||restoring||pendingKey)return;
    const current=snapshot(),saved=entries[cursor];if(view(current)!==view(saved.route))return;
    saved.route=current;
    const root=current.kind==='location'?document.getElementById('wx-location-dialog'):document.getElementById('mr');
    saved.ui={scroll:window.scrollY||0,focus:focusDescription(document.activeElement),form:current.kind&&root?{root:current.kind,state:_captureReplaceState(root)}:null,
      details:current.kind?null:Array.from(document.querySelectorAll('#app details')).map(el=>el.open)};
  }
  function clearLocation(){const el=document.getElementById('wx-location-dialog');if(el){_wxSearchVersion++;el.remove()}}
  function apply(saved){
    if(saved.owner!==owner())saved={route:base(snapshot()),ui:{scroll:0,focus:null,form:null}};
    restoring=true;const r=saved.route,oldMonth=S.yr+'-'+S.mo,oldPay=PAY_VIEW.y+'-'+PAY_VIEW.m;
    clearLocation();UI_TAB=r.tab;S.yr=r.year;S.mo=r.month;UI_CAL_VIEW=r.calendarView;UI_CAL_FILTER=r.calendarFilter;
    PAY_VIEW.y=r.pay.y;PAY_VIEW.m=r.pay.m;S.modal=r.day?{...r.day}:null;S.showH=r.help;S.showStats=r.stats;S.statsYr=r.statsYear;
    S.showSal=r.salary;S.showLeavesOv=r.leaves;showUserPrefs=r.prefs;showAdmin=r.admin;wxDetailShow=r.wx;wxDetailDay=r.wxDay;tideDetailShow=r.tide;tideDetailDay=r.tideDay;
    try{localStorage.setItem('myshift_ui_tab',UI_TAB)}catch(e){}
    if(oldMonth!==S.yr+'-'+S.mo||oldPay!==PAY_VIEW.y+'-'+PAY_VIEW.m){loadLeaves();loadAdminEv()}
    if(r.kind==='location')openWxLocation();
    pendingUi=saved.ui;render();restoring=false;
  }
  function sync(){
    if(restoring||pendingKey||typeof S==='undefined'||S.step!=='cal'||!fbAuthReady||_cloudLoading)return;
    if(typeof location!=='undefined'&&/(?:^|[?&])w=1(?:&|$)/.test(location.search))return;
    try{
      const route=snapshot();
      if(cursor<0){
        history.scrollRestoration='manual';
        const root=entry(base(route));entries=[root];cursor=0;history.replaceState(state(root),'');
        if(view(route)!==view(root.route)){const initial=entry(route);entries.push(initial);cursor=1;history.pushState(state(initial),'')}
        else root.route=route;
        return;
      }
      const current=entries[cursor];
      if(view(current.route)===view(route)){current.route=route;return}
      // Closing a sheet consumes its entry instead of adding a second copy of the parent.
      if(current.route.kind&&cursor>0&&view(entries[cursor-1].route)===view(route)){back();return}
      entries=entries.slice(0,cursor+1);const next=entry(route);entries.push(next);cursor++;history.pushState(state(next),'');
      if(!route.kind)pendingUi=next.ui;
    }catch(e){/* Bootstrap may still be initializing classic-script globals. Retry on the next render. */}
  }
  function back(){
    if(pendingKey)return;
    remember();
    if(cursor>0){const target=entries[cursor-1];pendingKey=target.key;cursor--;apply(target);history.back();return}
    const r=base(snapshot());if(UI_TAB==='today'&&!kind())return;const root=entry(r);entries=[root];cursor=0;history.replaceState(state(root),'');apply(root);
  }
  function returnTitle(){return title(cursor>0?entries[cursor-1].route:{tab:'today'})}
  function bar(sheet=false){
    const zh=lang==='zh',label=returnTitle();
    return `<nav class="${sheet?'sheet-returnbar':'page-returnbar'}" aria-label="${zh?'返回導覽':'Navigasi kembali'}"><button type="button" ${sheet?'data-sheet-back':''} data-a="navBack" aria-label="${esc((zh?'返回':'Kembali ke ')+label)}">${uiIcon('chevron',18)}<span>${zh?'返回':'Kembali'}</span></button><span class="return-destination">${esc(label)}</span></nav>`;
  }
  function pageBar(){return UI_TAB!=='today'||cursor>0?bar(false):''}
  function decorate(html){return html.replace(/(<(?:div|section)\b[^>]*class="(?:modal-sheet|wx-detail-sheet)[^"]*"[^>]*>)/,'$1'+bar(true))}
  function restoreFocus(description){
    if(!description)return;
    let el=description.id?document.getElementById(description.id):null;
    if(!el&&description.action)el=Array.from(document.querySelectorAll('[data-a]')).find(node=>Object.entries(description.data).every(([k,v])=>node.dataset[k]===v));
    if(el&&!el.closest('[inert]'))try{el.focus({preventScroll:true})}catch(e){}
  }
  function afterRender(){
    const external=document.getElementById('wx-location-dialog'),dialog=external?.querySelector('.wx-detail-sheet')||document.querySelector('#mr .modal-sheet,#mr .wx-detail-sheet');
    const app=document.getElementById('app'),mr=document.getElementById('mr');if(app)app.inert=!!dialog;if(mr)mr.inert=!!external;
    if(dialog){
      dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
      if(!dialog.hasAttribute('aria-labelledby')&&!dialog.hasAttribute('aria-label'))dialog.setAttribute('aria-label',title(entries[cursor]?.route));
      const h=dialog.querySelector('.sheet-returnbar')?.getBoundingClientRect().height||48;dialog.style.setProperty('--sheet-return-height',h+'px');
    }
    const nav=document.querySelector('.bottom-nav');
    if(nav&&nav!==observedNav){
      navObserver?.disconnect();observedNav=nav;
      const measure=()=>document.documentElement.style.setProperty('--nav-clearance',Math.ceil(nav.getBoundingClientRect().height+44)+'px');measure();
      if(typeof ResizeObserver!=='undefined'){navObserver=new ResizeObserver(measure);navObserver.observe(nav)}
    }
    if(pendingUi){
      const ui=pendingUi;pendingUi=null;
      if(ui.details){const details=document.querySelectorAll('#app details');ui.details.forEach((open,i)=>{if(details[i])details[i].open=open})}
      if(ui.form&&dialog){const root=ui.form.root==='location'?external:mr;_restoreReplaceState(root,ui.form.state)}
      window.scrollTo({top:ui.scroll||0,behavior:'instant'});restoreFocus(ui.focus);
    }else if(dialog&&lastDialogKey!==String(entries[cursor]?.key)&&!dialog.contains(document.activeElement))dialog.querySelector('[data-sheet-back]')?.focus({preventScroll:true});
    lastDialogKey=dialog?String(entries[cursor]?.key):'';
  }
  window.addEventListener('popstate',event=>{
    const marker=event.state?.myshiftNavigation;if(marker?.session!==session)return;
    const index=entries.findIndex(x=>x.key===marker.key);if(index<0)return;
    if(!pendingKey)remember();pendingKey=null;cursor=index;apply(entries[index]);
  });
  document.addEventListener('click',()=>{try{remember()}catch(e){}},true);
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.isComposing)return;
    const root=document.getElementById('wx-location-dialog')?.querySelector('.wx-detail-sheet')||document.querySelector('#mr .modal-sheet,#mr .wx-detail-sheet');if(!root)return;
    if(event.key==='Escape'){event.preventDefault();back();return}
    if(event.key!=='Tab')return;
    const controls=Array.from(root.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')).filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();first.focus()}
  });
  return {sync,beforeChange:remember,back,pageBar,decorate,bar,afterRender};
})();
