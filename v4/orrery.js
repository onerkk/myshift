/* MyShift v4 — 天球儀 (Orrery)
   真 3D：單一片段著色器做解析式光線追蹤（行星、太陽、月亮為球體，24 小時軌道為傾斜平面上的環）。
   太陽位置 = 時刻；月亮位置與盈虧由朔望月相位推得（受太陽實際打光）；班次是軌道上發光的弧。
   canvas 與 GL context 常駐，render() 重建 DOM 後由 MutationObserver 接回，不重建 context。 */
(function(){
'use strict';
var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var FS=[
'precision highp float;',
'uniform vec2 uRes;uniform float uT,uHour,uNow,uMoon,uSway,uWork;uniform vec3 uShift,uCol;',
'const float PI=3.14159265;const float R=1.4;',
'vec3 U=vec3(1.,0.,0.);vec3 V=vec3(0.,.588,.809);vec3 N=vec3(0.,-.809,.588);',
'float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
'float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
' return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
'  mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
'float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}',
'vec3 onRing(float h){float a=(h-6.)/24.*2.*PI;return R*(-cos(a)*U+sin(a)*V);}',
'float sph(vec3 ro,vec3 rd,vec3 c,float r){vec3 oc=ro-c;float b=dot(oc,rd);float h=b*b-(dot(oc,oc)-r*r);if(h<0.)return -1.;return -b-sqrt(h);}',
'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
'void main(){',
' vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;float asp=uRes.x/uRes.y;uv/=min(1.,asp/1.34);',
' vec3 ro=vec3(0.,.1,5.2);vec3 rd=normalize(vec3(uv*.47,-1.));',
' mat2 sw=rot(uSway*.09);ro.xz=sw*ro.xz;rd.xz=sw*rd.xz;',
' vec3 sunP=onRing(uHour);vec3 moonP=onRing(uHour-uMoon*24.);vec3 L=normalize(sunP);',
' float t[4];vec4 c[4];',
// planet
' t[0]=sph(ro,rd,vec3(0.),.6);c[0]=vec4(0.);',
' if(t[0]>0.){vec3 p=ro+rd*t[0];vec3 n=normalize(p);float df=dot(n,L);float day=smoothstep(-.18,.3,df);',
'  vec3 q=n;q.xz=rot(uT*.05+uHour*.2618)*q.xz;q.xy=rot(.4)*q.xy;',
'  float land=smoothstep(.5,.56,fbm(q*2.3+3.));float cl=smoothstep(.52,.72,fbm(q*3.4+vec3(uT*.02,0.,9.)));',
'  vec3 sea=mix(vec3(.03,.16,.36),vec3(.07,.42,.58),fbm(q*5.));vec3 gr=mix(vec3(.12,.36,.24),vec3(.5,.46,.3),fbm(q*6.+2.));',
'  vec3 dayc=mix(sea,gr,land);dayc=mix(dayc,vec3(.96),cl*.85);',
'  float spec=pow(max(dot(reflect(-L,n),-rd),0.),40.)*(1.-land)*(1.-cl);',
'  dayc=dayc*(.25+1.05*max(df,0.))+spec*vec3(1.,.9,.7)*.7;',
'  float city=land*step(.82,vn(q*38.))*(1.-cl);vec3 night=vec3(.012,.022,.05)+city*vec3(1.,.72,.36)*.9;',
'  vec3 col=mix(night,dayc,day);float fr=pow(1.-max(dot(n,-rd),0.),2.6);',
'  col+=fr*mix(vec3(.3,.6,1.),uCol,.45)*(.18+.9*day);c[0]=vec4(col,1.);}',
// sun
' t[1]=sph(ro,rd,sunP,.135);c[1]=vec4(0.);',
' if(t[1]>0.){vec3 n=normalize(ro+rd*t[1]-sunP);float mu=max(dot(n,-rd),0.);float g=fbm(n*6.+uT*.15);',
'  c[1]=vec4(mix(vec3(1.,.55,.16),vec3(1.,.97,.86),pow(mu,.55))*(.92+.25*g),1.);}',
// moon
' t[2]=sph(ro,rd,moonP,.085);c[2]=vec4(0.);',
' if(t[2]>0.){vec3 n=normalize(ro+rd*t[2]-moonP);float df=max(dot(n,normalize(sunP-moonP)),0.);',
'  float cr=fbm(n*7.+4.);c[2]=vec4(vec3(.8,.83,.9)*(.55+.6*cr)*(.05+1.05*df)+vec3(.02,.03,.05),1.);}',
// ring plane
' t[3]=-1.;c[3]=vec4(0.);float dn=dot(rd,N);',
' if(abs(dn)>1e-4){float tr=-dot(ro,N)/dn;if(tr>0.){vec3 p=ro+rd*tr;float x=dot(p,U),y=dot(p,V);float r=length(vec2(x,y));',
'  float px=tr*.9/uRes.y;float h=mod(atan(y,-x)/(2.*PI)*24.+6.,24.);float dr=abs(r-R);',
'  vec3 col=vec3(0.);float al=0.;',
'  float base=smoothstep(.011+px,.011-px,dr)*.34;col+=vec3(.85,.9,1.)*base;al+=base;',
'  float fh=abs(fract(h+.5)-.5)*(2.*PI*R/24.);float major=step(abs(fract(h/6.+.5)-.5)*6.,.5);',
'  float tl=mix(.05,.11,major);float tk=smoothstep(.009+px,.009-px,fh)*step(R-.035-tl,r)*step(r,R-.035)*mix(.3,.75,major);',
'  col=mix(col,vec3(.9,.94,1.),tk);al=max(al,tk);',
'  if(uWork>.5){float dh=mod(h-uShift.x,24.);float tot=uShift.y+uShift.z;float de=mod(uNow-uShift.x,24.);',
'   float ins=step(dh,tot);float done=step(dh,de)*step(de,tot);float isOt=step(uShift.y,dh);',
'   float band=smoothstep(.05+px,.05-px,dr)*ins;float lum=mix(.42,1.,done);',
'   vec3 sc=mix(uCol,mix(uCol,vec3(1.),.5),isOt);float dash=mix(1.,.55+.45*step(.5,fract(dh*4.)),isOt);',
'   col=mix(col,sc*lum*dash,band);al=max(al,band*.96);',
'   float gl=exp(-dr*16.)*ins*(.12+.3*done);col+=uCol*gl;al=max(al,gl*.8);}',
'  float dnw=length(p-onRing(uNow));float pip=smoothstep(.05+px,.05-px,dnw);float pr=smoothstep(.085+px,.085-px,dnw)-smoothstep(.066+px,.066-px,dnw);',
'  col=mix(col,vec3(1.),pip);al=max(al,pip);col+=vec3(1.)*pr*.8;al=max(al,pr*.8);',
'  if(al>.002){t[3]=tr;c[3]=vec4(col,min(al,1.));}}}',
// front-to-back composite (4 objects, selection sort by t)
' vec3 acc=vec3(0.);float A=0.;',
' for(int k=0;k<4;k++){float best=1e9;int bi=-1;for(int i=0;i<4;i++){if(t[i]>0.&&t[i]<best){best=t[i];bi=i;}}',
'  if(bi<0)break;for(int i=0;i<4;i++){if(i==bi){acc+=(1.-A)*c[i].rgb*(i==3?1.:c[i].a);A+=(1.-A)*c[i].a;t[i]=-1.;}}}',
// glows
' float tc=dot(sunP-ro,rd);float ds=length(ro+rd*tc-sunP);float occ=1.;float tp=sph(ro,rd,vec3(0.),.6);if(tp>0.&&tp<tc)occ=.08;',
' float g=(exp(-ds*4.2)*.5+exp(-ds*13.)*.75)*occ;acc+=vec3(1.,.78,.42)*g;A=min(1.,A+g*.7);',
' float tm=dot(moonP-ro,rd);float dm=length(ro+rd*tm-moonP);float gm=exp(-dm*11.)*.22*(tp>0.&&tp<tm?.1:1.);acc+=vec3(.7,.8,1.)*gm;A=min(1.,A+gm*.6);',
' float t0=dot(-ro,rd);float d0=length(ro+rd*t0);if(d0>.6){float ha=exp(-(d0-.6)*8.)*.34;acc+=mix(vec3(.3,.6,1.),uCol,.5)*ha*(1.-A);A=min(1.,A+ha*.55*(1.-A));}',
' gl_FragColor=vec4(acc,A);}'
].join('\n');

var canvas=document.createElement('canvas');canvas.className='v4-orbit-canvas';canvas.setAttribute('aria-hidden','true');
var gl=null,prog=null,U={},dead=false,slot=null,raf=0,last=0,scrub=0,scrubTarget=0,dragging=false,dragX=0,dragBase=0,relTimer=0,t0=performance.now();
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var COL={'早':[.38,.92,.68],'中':[1.,.74,.36],'晚':[.66,.6,1.],'休':[.56,.74,.9]};
function init(){
  if(gl||dead)return!!gl;
  try{gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:'low-power'});}catch(e){gl=null}
  if(!gl){dead=true;return false}
  function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('orrery shader',gl.getShaderInfoLog(s));return null}return s}
  var v=sh(gl.VERTEX_SHADER,VS),f=sh(gl.FRAGMENT_SHADER,FS);if(!v||!f){dead=true;gl=null;return false}
  prog=gl.createProgram();gl.attachShader(prog,v);gl.attachShader(prog,f);gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){dead=true;gl=null;return false}
  gl.useProgram(prog);var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  ['uRes','uT','uHour','uNow','uMoon','uSway','uWork','uShift','uCol'].forEach(function(n){U[n]=gl.getUniformLocation(prog,n)});
  canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();gl=null;prog=null});
  canvas.addEventListener('webglcontextrestored',function(){init();kick()});
  return true;
}
function moonPhase(d){var syn=29.530588853,ref=Date.UTC(2000,0,6,18,14);var p=((d-ref)/864e5)%syn;if(p<0)p+=syn;return p/syn}
function nowHour(){var d=new Date();return d.getHours()+d.getMinutes()/60+d.getSeconds()/3600}
function size(){
  var r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
}
function draw(ts){
  if(!gl||!slot)return;size();
  var ds=slot.dataset,work=ds.work==='1',col=COL[ds.shift]||COL['休'],now=nowHour();
  scrub+=(scrubTarget-scrub)*(dragging?.5:.12);if(Math.abs(scrubTarget-scrub)<.002)scrub=scrubTarget;
  gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(U.uRes,canvas.width,canvas.height);gl.uniform1f(U.uT,(ts-t0)/1000);
  gl.uniform1f(U.uHour,now+scrub);gl.uniform1f(U.uNow,now);gl.uniform1f(U.uMoon,moonPhase(Date.now()+scrub*36e5));
  gl.uniform1f(U.uSway,reduce?0:Math.sin((ts-t0)/5200));gl.uniform1f(U.uWork,work?1:0);
  gl.uniform3f(U.uShift,(+ds.start||0)/60,(+ds.reg||0)/60,(+ds.ot||0)/60);gl.uniform3f(U.uCol,col[0],col[1],col[2]);
  gl.drawArrays(gl.TRIANGLES,0,3);
  readout(now);
}
function readout(now){
  var el=slot&&slot.querySelector('.v4-orbit-readout');if(!el)return;
  var active=Math.abs(scrub)>.05;el.classList.toggle('on',active);if(!active)return;
  var api=window.MyShiftV4;if(api&&api.scrubText){var txt=api.scrubText(new Date(Date.now()+scrub*36e5));if(el.textContent!==txt)el.textContent=txt}
}
function loop(ts){
  raf=0;if(!slot||!slot.isConnected||document.hidden)return;
  var moving=dragging||scrub!==scrubTarget;
  if(ts-last>=(moving?15:reduce?1000:33)){last=ts;draw(ts)}
  raf=requestAnimationFrame(loop);
}
function kick(){if(!raf&&slot&&slot.isConnected&&!document.hidden)raf=requestAnimationFrame(loop)}
function attach(){
  var s=document.getElementById('v4OrbitSlot');
  if(!s){slot=null;return}
  if(!init()){s.classList.add('no-gl');return}
  if(canvas.parentNode!==s)s.insertBefore(canvas,s.firstChild);
  slot=s;kick();
}
canvas.addEventListener('pointerdown',function(e){dragging=true;dragX=e.clientX;dragBase=scrubTarget;clearTimeout(relTimer);try{canvas.setPointerCapture(e.pointerId)}catch(_){}kick()});
canvas.addEventListener('pointermove',function(e){if(!dragging)return;var w=canvas.getBoundingClientRect().width||1;scrubTarget=Math.max(-24,Math.min(24,dragBase+(e.clientX-dragX)/w*14))});
function release(){if(!dragging)return;dragging=false;clearTimeout(relTimer);relTimer=setTimeout(function(){scrubTarget=0;kick()},2600)}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
document.addEventListener('visibilitychange',kick);
var app=document.getElementById('app');
if(app&&window.MutationObserver)new MutationObserver(attach).observe(app,{childList:true,subtree:true});
window.addEventListener('resize',kick);
window.MyShiftOrrery={attach:attach,setScrub:function(h){scrubTarget=h;scrub=h;kick()},state:function(){return{gl:!!gl,dead:dead,scrub:scrub,attached:!!(slot&&slot.isConnected)}}};
attach();
})();
