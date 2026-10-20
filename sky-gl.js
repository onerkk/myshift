/* v342 stage 1 — procedural WebGL sky.
   Replaces the five static plates, cloud sprites, sun/moon/star sprites of the v341 background.
   The sky is computed per pixel from the real solar elevation/azimuth, cloud cover, wind and
   weather family; clouds are FBM noise lit by the sun so they drift, thicken and darken instead
   of being pasted bitmaps. Rain, snow, botany, animals, glass effects stay in nature-effects.js.
   Fails closed: any WebGL problem sets SkyGL.ok=false and nature-effects falls back to v341 plates.
   No weather data, account or pay state is read or written here. */
(function(root){
  'use strict';
  const VERT='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG=`
precision mediump float;
uniform vec2 uRes;uniform float uTime;uniform vec3 uSun;uniform float uEl;
uniform float uCover;uniform float uWind;uniform float uStorm;uniform float uWet;uniform float uFog;
uniform float uMoonPhase;uniform vec3 uMoon;uniform vec3 uTint;uniform vec2 uTilt;uniform float uOct;uniform float uHeat;uniform float uCold;
float hash(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+19.19);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p,float oct){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);
 for(int i=0;i<5;i++){if(float(i)>=oct)break;v+=a*noise(p);p=m*p+vec2(17.3,9.1);a*=.5;}return v;}
float star(vec3 rd,float t){vec2 q=rd.xz/(rd.y+.25)*42.;vec2 c=floor(q),f=fract(q)-.5;float h=hash(c);
 if(h<.93)return 0.;vec2 o=vec2(hash(c+1.7),hash(c+3.1))-.5;float d=length(f-o*.7);
 float tw=.6+.4*sin(t*(1.+h*3.)+h*40.);return smoothstep(.07,.0,d)*tw*(.2+.8*(h-.93)*14.);}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;
 // Camera facing south; horizon at 28% from the bottom, same framing as v341 plates.
 vec3 rd=normalize(vec3((uv.x-.5)*asp*1.05+uTilt.x*.03,(uv.y-.28)*1.25-uTilt.y*.03,1.));
 float el=uEl;                       // sun elevation, degrees
 float day=smoothstep(-8.,12.,el);   // 0 night -> 1 full day
 float dusk=exp(-pow((el-1.)/7.,2.)); // twilight band around the horizon
 float night=1.-smoothstep(-12.,-3.,el);
 float sunDot=max(dot(rd,uSun),0.);
 float horizon=1.-clamp(rd.y,0.,1.);
 // sky colours
 vec3 zenithDay=vec3(.19,.43,.78),horDay=vec3(.72,.84,.93);
 vec3 zenithNight=vec3(.03,.05,.11),horNight=vec3(.09,.12,.2);
 vec3 zenith=mix(zenithNight,zenithDay,day),hor=mix(horNight,horDay,day);
 vec3 sky=mix(zenith,hor,pow(horizon,1.9));
 // twilight: warm band where the sun sits, violet opposite
 float sunSide=.5+.5*dot(normalize(vec2(rd.x,rd.z)),normalize(vec2(uSun.x,uSun.z)+1e-4));
 vec3 duskCol=mix(vec3(.32,.22,.46),vec3(1.,.55,.28),sunSide);
 sky=mix(sky,duskCol,dusk*pow(horizon,2.2)*.85);
 sky=mix(sky,vec3(1.,.74,.42),dusk*pow(sunDot,18.)*.6);
 // haze & sun glow (Mie)
 sky+=vec3(1.,.95,.85)*pow(sunDot,6.)*.18*day;
 sky+=vec3(1.,.9,.7)*pow(sunDot,120.)*1.4*day;
 // weather darkening of the whole dome
 vec3 overcast=mix(vec3(.46,.52,.58),vec3(.22,.26,.31),uStorm);
 overcast=mix(overcast*.12,overcast,day);
 sky=mix(sky,overcast,smoothstep(.55,1.,uCover)*.6);
 // stars + moon
 float starV=night*(1.-uCover)*(1.-uFog);
 if(starV>0.&&rd.y>0.)sky+=vec3(.9,.95,1.)*star(rd,uTime)*starV;
 float moonDot=dot(rd,uMoon);
 if(uMoon.y>-.05){
  float disc=smoothstep(.99945,.9997,moonDot);
  // phase: lit side faces the sun direction
  vec3 side=normalize(cross(uMoon,vec3(0.,1.,0.)));float ph=uMoonPhase;
  float u=dot(rd-uMoon*moonDot,side)/.028,k=cos(ph*6.2832);
  float lit=ph<.5?smoothstep(k-.18,k+.18,u):smoothstep(-k+.18,-k-.18,u);
  vec3 moonCol=vec3(.93,.95,.98)*(.1+.9*lit);
  sky=mix(sky,moonCol,disc*night*(1.-smoothstep(.5,.95,uCover)));
  sky+=vec3(.6,.7,.9)*pow(max(moonDot,0.),300.)*.5*night*(1.-uCover*.6);
 }
 // clouds: two slabs projected from the camera onto planes at two heights
 float cl=clamp(uCover,0.,1.);
 vec3 col=sky;
 if(rd.y>.005){
  float t=uTime*(.012+uWind*.004);
  vec2 lo=rd.xz/rd.y*1.1+vec2(t*1.6,t*.5)+uTilt*.08;
  vec2 hi=rd.xz/rd.y*2.6+vec2(t*2.3,-t*.3);
  // domain warp gives billowing edges instead of streaks
  vec2 warp=vec2(fbm(lo*.6+vec2(1.,8.),uOct-2.),fbm(lo*.6+vec2(5.,2.),uOct-2.))-.5;
  lo+=warp*.9;
  float n=fbm(lo,uOct);
  float thr=.64-cl*.52;                        // more cover => lower threshold
  float dens=smoothstep(thr,thr+.3,n);
  float thick=smoothstep(thr+.04,thr+.46,n);
  float dHi=fbm(hi+vec2(7.,3.),uOct-1.);
  float cirrus=smoothstep(.62,.9,dHi)*(.25+.4*cl)*(1.-smoothstep(.75,1.,cl));
  // lighting: density gradient toward the sun lights the sun-facing edges
  vec2 sunStep=normalize(uSun.xz+1e-4)*.07*sign(uSun.y+.05);
  float nS=fbm(lo-sunStep,uOct);
  float shade=clamp(.5+(n-nS)*7.,0.,1.);
  vec3 lit=mix(vec3(1.,.98,.95),vec3(1.,.72,.45),dusk)*mix(.3,1.,day);
  vec3 dark=mix(vec3(.58,.63,.7),vec3(.3,.34,.4),uStorm)*mix(.22,1.,day);
  dark=mix(dark,dark*.8,uWet);
  vec3 cloudCol=mix(dark,lit,shade*(1.-uStorm*.45));
  cloudCol*=mix(1.,.72,thick);                                   // thick cores shadow themselves
  cloudCol+=vec3(1.,.9,.75)*pow(sunDot,8.)*.25*day*(1.-thick);   // silver lining near the sun
  float fade=smoothstep(.0,.12,rd.y);                            // thin out at the horizon
  float alpha=clamp(dens*(.7+.3*cl)*fade,0.,1.);
  col=mix(col,cloudCol,alpha);
  col=mix(col,mix(lit,vec3(.75,.8,.9),.5)*mix(.3,1.,day),cirrus*fade*.6);
 } else {
  // ground: distant ridges and a haze layer, lit by the same sky
  float x=rd.x/(rd.z+.3);
  float r1=-.01+.16*(fbm(vec2(x*7.+3.,0.),3.)-.45)+uTilt.y*.01;
  float r2=-.07+.22*(fbm(vec2(x*4.2+9.,2.),3.)-.45);
  vec3 ridgeFar=mix(hor*.75,vec3(.33,.42,.47),.55)*mix(.22,1.,day);
  vec3 ridgeNear=mix(hor*.5,vec3(.19,.28,.25),.6)*mix(.18,1.,day);
  ridgeFar=mix(ridgeFar,ridgeFar*vec3(.6,.62,.66),uCover*.8);ridgeNear=mix(ridgeNear,ridgeNear*vec3(.6,.62,.66),uCover*.8);
  ridgeNear=mix(ridgeNear,ridgeNear*vec3(1.08,1.02,.9),uHeat);ridgeNear=mix(ridgeNear,ridgeNear*vec3(.9,.95,1.08),uCold);
  float g=smoothstep(.0,-.004,rd.y-r1);
  col=mix(sky,ridgeFar,g);
  col=mix(col,ridgeNear,smoothstep(.0,-.004,rd.y-r2));
  col=mix(col,hor*mix(.3,1.,day),smoothstep(-.2,.0,rd.y)*.35);
 }
 // fog, season tint, dither
 vec3 fogCol=mix(vec3(.08,.1,.13),vec3(.82,.85,.88),day);
 col=mix(col,fogCol,uFog*(.55+.45*horizon));
 col=mix(col,col*uTint,.22);
 col+=(hash(gl_FragCoord.xy+uTime)-.5)/255.;
 gl_FragColor=vec4(col,1.);
}`;
  let canvas=null,gl=null,prog=null,U={},w=1,h=1,scale=.66,lost=false,failed=false;
  const TINT={spring:[1.05,.98,1.03],summer:[.97,1.05,1.0],autumn:[1.08,.97,.86],winter:[.9,.96,1.06]};
  function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(e)}return s}
  function setup(){
    gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:true})||canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false});
    if(!gl)throw Error('no webgl');
    prog=gl.createProgram();gl.attachShader(prog,compile(gl.VERTEX_SHADER,VERT));gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    U={};for(const n of ['uRes','uTime','uSun','uEl','uCover','uWind','uStorm','uWet','uFog','uMoonPhase','uMoon','uTint','uTilt','uOct','uHeat','uCold'])U[n]=gl.getUniformLocation(prog,n);
  }
  function init(){
    if(canvas||failed)return api.ok;
    try{
      canvas=document.createElement('canvas');canvas.id='nature-sky-gl';canvas.setAttribute('aria-hidden','true');
      const sky=document.getElementById('nature-sky');if(sky)document.body.insertBefore(canvas,sky);else document.body.appendChild(canvas);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;api.ok=false},false);
      canvas.addEventListener('webglcontextrestored',()=>{try{setup();lost=false;api.ok=true;resize(w,h)}catch(e){fail(e)}},false);
      setup();api.ok=true;
    }catch(e){fail(e)}
    return api.ok;
  }
  function fail(e){failed=true;api.ok=false;try{console.log('sky-gl unavailable, using plates',e&&e.message)}catch(_){}if(canvas&&canvas.parentNode)canvas.parentNode.removeChild(canvas);canvas=null;gl=null}
  function resize(W,H,level){
    w=Math.max(1,W|0);h=Math.max(1,H|0);
    scale=level==='subtle'?.5:level==='balanced'?.62:.75;
    if(!canvas)return;
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    canvas.width=Math.max(2,Math.round(w*scale));canvas.height=Math.max(2,Math.round(h*scale));
    if(gl)gl.viewport(0,0,canvas.width,canvas.height);
  }
  function show(on){if(canvas)canvas.style.display=on?'':'none'}
  // s: {time, elevation, azimuth, hourAngle, moonPhase, cover, wind, mode, season, tilt:{x,y}, level, fog}
  function render(s){
    if(!gl||lost||!api.ok)return false;
    const rad=Math.PI/180,el=s.elevation,az=(s.azimuth==null?180:s.azimuth)*rad;
    // The view is a narrow window facing south; azimuth is compressed so the sun stays in frame like the v341 plates.
    const ce=Math.cos(el*rad);let sx=-Math.sin(az)*ce*.32,sy=Math.sin(el*rad*.85),sz=Math.max(.3,-Math.cos(az)*ce);const sl=Math.hypot(sx,sy,sz)||1;sx/=sl;sy/=sl;sz/=sl;
    const ph=s.moonPhase||0,ha=(s.hourAngle||0)+ph*Math.PI*2,mEl=Math.cos(ha)*.78,mx=-Math.sin(ha)*Math.sqrt(Math.max(0,1-mEl*mEl))*.35,mz=.6;
    const my=mEl*.5,ml=Math.hypot(mx,my,mz)||1;   // moon elevation compressed into the window like the sun
    const m=s.mode||'clear',stormy=['storm','typhoon','hail','heavy'].includes(m)?1:0,wet=['drizzle','rain','heavy','storm','typhoon','hail'].includes(m)?1:0;
    const tint=TINT[s.season]||TINT.spring,oct=s.level==='subtle'?3:s.level==='balanced'?4:5;
    gl.uniform2f(U.uRes,canvas.width,canvas.height);
    gl.uniform1f(U.uTime,s.time||0);
    gl.uniform3f(U.uSun,sx,sy,sz);gl.uniform1f(U.uEl,el);
    gl.uniform1f(U.uCover,Math.max(0,Math.min(1,s.cover||0)));
    gl.uniform1f(U.uWind,Math.max(0,Math.min(6,(s.wind||0)/20)));
    gl.uniform1f(U.uStorm,stormy);gl.uniform1f(U.uWet,wet);
    gl.uniform1f(U.uFog,m==='fog'?.75:Math.max(0,Math.min(.35,s.fog||0)));
    gl.uniform1f(U.uMoonPhase,ph);gl.uniform3f(U.uMoon,mx/ml,my/ml,mz/ml);
    gl.uniform3f(U.uTint,tint[0],tint[1],tint[2]);
    gl.uniform2f(U.uTilt,s.tilt?s.tilt.x:0,s.tilt?s.tilt.y:0);
    gl.uniform1f(U.uOct,oct);gl.uniform1f(U.uHeat,m==='heat'?1:0);gl.uniform1f(U.uCold,m==='cold'||m==='snow'?1:0);
    gl.drawArrays(gl.TRIANGLES,0,3);
    return true;
  }
  const api={ok:false,init,resize,render,show,canvas:()=>canvas,_debug:()=>({ok:api.ok,lost,failed,scale,size:canvas?[canvas.width,canvas.height]:null})};
  root.SkyGL=api;
})(window);
