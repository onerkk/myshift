/* radar-nowcast.js · v352
   本機雷達回波外推（0–60 分）。
   原理：取最近 4 張 RainViewer 回波圖，在縮圖上用區塊比對估計回波移動向量（簡化光流／Lagrangian persistence），
   再把最新一張沿向量往前平移，每 10 分鐘一格，共 6 格；隨前置時間拉長逐步降低透明度與銳度表示不確定性。
   這不是氣象模式，只能反映「目前雨區照現在的方向與速度繼續走」，對新生成／消散的對流無能為力。
   RainViewer 公開 API 自 2026/1/1 起不再提供 nowcast 圖層，所以未來格全由本機計算，介面上一律標示「推估」。 */
(function(root){
  'use strict';
  var TILE=256;
  function loadImage(url){
    return new Promise(function(resolve,reject){
      var img=new Image();img.crossOrigin='anonymous';
      img.onload=function(){resolve(img)};img.onerror=function(){reject(new Error('tile '+url))};
      img.src=url;
    });
  }
  // 把一張 frame 的圖磚拼成一張畫布；readable=false 代表 canvas 被跨網域污染（RainViewer 未送 CORS 標頭）
  function composite(host,path,grid,color,smooth,snow){
    var cv=document.createElement('canvas');cv.width=grid.nx*TILE;cv.height=grid.ny*TILE;
    var ctx=cv.getContext('2d',{willReadFrequently:true});
    var jobs=[];
    for(var ty=0;ty<grid.ny;ty++)for(var tx=0;tx<grid.nx;tx++)(function(tx,ty){
      var url=host+path+'/'+TILE+'/'+grid.z+'/'+(grid.x0+tx)+'/'+(grid.y0+ty)+'/'+color+'/'+smooth+'_'+snow+'.png';
      jobs.push(loadImage(url).then(function(img){ctx.drawImage(img,tx*TILE,ty*TILE)}).catch(function(){/* 缺一塊不致命 */}));
    })(tx,ty);
    return Promise.all(jobs).then(function(){
      try{ctx.getImageData(0,0,1,1);}catch(e){throw new Error('cors');}
      return cv;
    });
  }
  // 降採樣成強度格（alpha 代表有回波，顏色越深越強）
  function intensityGrid(cv,scale){
    var w=Math.floor(cv.width/scale),h=Math.floor(cv.height/scale);
    var small=document.createElement('canvas');small.width=w;small.height=h;
    var c=small.getContext('2d',{willReadFrequently:true});c.drawImage(cv,0,0,w,h);
    var d=c.getImageData(0,0,w,h).data,out=new Float32Array(w*h),signal=0;
    for(var i=0,p=0;i<out.length;i++,p+=4){
      var a=d[p+3]/255;if(a<.08){out[i]=0;continue}
      var lum=(d[p]+d[p+1]+d[p+2])/765; // Universal Blue：淺色弱、深色強
      out[i]=a*(0.35+0.65*(1-lum));if(out[i]>.06)signal++;
    }
    return{data:out,w:w,h:h,signalRatio:signal/out.length};
  }
  // 區塊比對：A(前) → B(後) 的位移
  function blockMotion(A,B,block,search){
    var w=A.w,h=A.h,bx=Math.floor(w/block),by=Math.floor(h/block),vx=new Float32Array(bx*by),vy=new Float32Array(bx*by),ok=new Uint8Array(bx*by);
    var gsum=0,gx=0,gy=0;
    for(var j=0;j<by;j++)for(var i=0;i<bx;i++){
      var x0=i*block,y0=j*block,mass=0;
      for(var y=0;y<block;y++)for(var x=0;x<block;x++)mass+=A.data[(y0+y)*w+x0+x];
      if(mass<block*block*.04)continue; // 這塊幾乎沒回波，不估
      var best=Infinity,bdx=0,bdy=0;
      for(var dy=-search;dy<=search;dy++)for(var dx=-search;dx<=search;dx++){
        var sad=0,cnt=0;
        for(var yy=0;yy<block;yy+=2)for(var xx=0;xx<block;xx+=2){
          var sx=x0+xx+dx,sy=y0+yy+dy;if(sx<0||sy<0||sx>=w||sy>=h)continue;
          sad+=Math.abs(A.data[(y0+yy)*w+x0+xx]-B.data[sy*w+sx]);cnt++;
        }
        if(!cnt)continue;sad/=cnt;
        // 偏好小位移，避免雜訊亂跳
        sad+=0.004*Math.sqrt(dx*dx+dy*dy);
        if(sad<best){best=sad;bdx=dx;bdy=dy}
      }
      var k=j*bx+i;vx[k]=bdx;vy[k]=bdy;ok[k]=1;gsum++;gx+=bdx;gy+=bdy;
    }
    var mx=gsum?gx/gsum:0,my=gsum?gy/gsum:0;
    // 沒回波的區塊用全域平均；再做 3×3 平滑
    for(var q=0;q<vx.length;q++)if(!ok[q]){vx[q]=mx;vy[q]=my}
    var sx2=new Float32Array(vx.length),sy2=new Float32Array(vy.length);
    for(var jj=0;jj<by;jj++)for(var ii=0;ii<bx;ii++){
      var s1=0,s2=0,n=0;
      for(var oy=-1;oy<=1;oy++)for(var ox=-1;ox<=1;ox++){var a=ii+ox,b=jj+oy;if(a<0||b<0||a>=bx||b>=by)continue;s1+=vx[b*bx+a];s2+=vy[b*bx+a];n++}
      sx2[jj*bx+ii]=s1/n;sy2[jj*bx+ii]=s2/n;
    }
    return{vx:sx2,vy:sy2,bx:bx,by:by,block:block,coverage:gsum/(bx*by),mean:{x:mx,y:my}};
  }
  function sampleField(f,px,py){ // px,py 在強度格座標
    var i=Math.max(0,Math.min(f.bx-1,Math.floor(px/f.block))),j=Math.max(0,Math.min(f.by-1,Math.floor(py/f.block)));
    return{x:f.vx[j*f.bx+i],y:f.vy[j*f.bx+i]};
  }
  // 半拉格朗日往後取樣：dest(x,y)=src(x−v·k, y−v·k)
  function advect(srcCv,field,scale,k,lead){
    var w=srcCv.width,h=srcCv.height,ws=Math.floor(w/2),hs=Math.floor(h/2);
    var sc=document.createElement('canvas');sc.width=ws;sc.height=hs;var scx=sc.getContext('2d',{willReadFrequently:true});scx.drawImage(srcCv,0,0,ws,hs);
    var src=scx.getImageData(0,0,ws,hs),out=scx.createImageData(ws,hs),S=src.data,O=out.data;
    var fscale=scale/2; // 強度格 → 半解析度畫布的比例
    var fade=Math.max(.45,1-0.07*lead);
    for(var y=0;y<hs;y++)for(var x=0;x<ws;x++){
      var v=sampleField(field,x/fscale,y/fscale);
      var sx=Math.round(x-v.x*fscale*k),sy=Math.round(y-v.y*fscale*k);
      if(sx<0||sy<0||sx>=ws||sy>=hs)continue;
      var si=(sy*ws+sx)*4,oi=(y*ws+x)*4;
      O[oi]=S[si];O[oi+1]=S[si+1];O[oi+2]=S[si+2];O[oi+3]=Math.round(S[si+3]*fade);
    }
    scx.putImageData(out,0,0);
    // 前置時間越長越模糊：縮小再放大
    var blur=Math.min(4,1+lead*0.45),bc=document.createElement('canvas');bc.width=Math.max(8,Math.floor(ws/blur));bc.height=Math.max(8,Math.floor(hs/blur));
    bc.getContext('2d').drawImage(sc,0,0,bc.width,bc.height);
    var fin=document.createElement('canvas');fin.width=ws;fin.height=hs;var fx=fin.getContext('2d');fx.imageSmoothingEnabled=true;fx.drawImage(bc,0,0,ws,hs);
    return fin.toDataURL('image/png');
  }
  /** opts: {host,frames:[{time,path}],grid:{z,x0,y0,nx,ny},color,smooth,snow,steps,latCenter}
      回傳 {frames:[{minutes,dataUrl}], motion:{speedKmh,dirDeg,confidence,coverage}} */
  function run(opts){
    var frames=opts.frames.slice(-4),steps=opts.steps||6,scale=4;
    if(frames.length<2)return Promise.reject(new Error('frames'));
    return Promise.all(frames.map(function(f){return composite(opts.host,f.path,opts.grid,opts.color,opts.smooth,opts.snow)})).then(function(cvs){
      var grids=cvs.map(function(cv){return intensityGrid(cv,scale)});
      var live=grids[grids.length-1];
      if(live.signalRatio<0.002)throw new Error('nosignal');
      // 以較新的配對為重估計
      var acc=null,wsum=0;
      for(var i=1;i<grids.length;i++){
        var m=blockMotion(grids[i-1],grids[i],16,6),wgt=i/(grids.length-1);
        if(!acc){acc=m;for(var q=0;q<acc.vx.length;q++){acc.vx[q]*=wgt;acc.vy[q]*=wgt}wsum=wgt;continue}
        for(var p=0;p<acc.vx.length;p++){acc.vx[p]+=m.vx[p]*wgt;acc.vy[p]+=m.vy[p]*wgt}wsum+=wgt;acc.coverage=Math.max(acc.coverage,m.coverage);
      }
      for(var r=0;r<acc.vx.length;r++){acc.vx[r]/=wsum;acc.vy[r]/=wsum}
      // 平均向量 → 速度與方向（px/10min → km/h）
      var mx=0,my=0;for(var s=0;s<acc.vx.length;s++){mx+=acc.vx[s];my+=acc.vy[s]}mx/=acc.vx.length;my/=acc.vy.length;
      var mPerPx=156543.03*Math.cos((opts.latCenter||23.5)*Math.PI/180)/Math.pow(2,opts.grid.z)*scale;
      var speedKmh=Math.sqrt(mx*mx+my*my)*mPerPx/1000*6;
      var dirDeg=(Math.atan2(mx,-my)*180/Math.PI+360)%360; // 移動方向（往哪去）
      var confidence=acc.coverage>.25&&live.signalRatio>.03?'high':acc.coverage>.08?'mid':'low';
      var liveCv=cvs[cvs.length-1],out=[];
      for(var k=1;k<=steps;k++)out.push({minutes:k*10,dataUrl:advect(liveCv,acc,scale,k,k)});
      return{frames:out,motion:{speedKmh:Math.round(speedKmh),dirDeg:Math.round(dirDeg),confidence:confidence,coverage:acc.coverage,signal:live.signalRatio}};
    });
  }
  // 由地圖範圍算出要抓的圖磚格（固定 z，最多 maxTiles×maxTiles）
  function gridForBounds(bounds,z,maxTiles){
    function t(lat,lon){var n=Math.pow(2,z),x=(lon+180)/360*n,la=lat*Math.PI/180,y=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n;return{x:x,y:y}}
    var a=t(bounds.north,bounds.west),b=t(bounds.south,bounds.east);
    var x0=Math.floor(a.x),y0=Math.floor(a.y),x1=Math.floor(b.x),y1=Math.floor(b.y);
    var nx=Math.min(maxTiles,x1-x0+1),ny=Math.min(maxTiles,y1-y0+1);
    if(x1-x0+1>maxTiles){var cx=Math.floor((a.x+b.x)/2);x0=cx-Math.floor(maxTiles/2)}
    if(y1-y0+1>maxTiles){var cy=Math.floor((a.y+b.y)/2);y0=cy-Math.floor(maxTiles/2)}
    var n=Math.pow(2,z);
    function ll(x,y){var lon=x/n*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI;return[lat,lon]}
    return{z:z,x0:x0,y0:y0,nx:nx,ny:ny,bounds:[ll(x0,y0+ny),ll(x0+nx,y0)]}; // [[south,west],[north,east]]
  }
  root.RadarNowcast={run:run,gridForBounds:gridForBounds};
})(window);
