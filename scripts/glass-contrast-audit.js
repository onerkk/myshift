// Injected into the page: worst-case text contrast over an unknown live scene behind glass.
window.__glassAudit=function(backdrops){
  const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
  const colorsIn=s=>(s.match(/rgba?\([^)]+\)/g)||[]).map(parse).filter(Boolean);
  const lum=c=>{const f=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const over=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const out=new Map();
  const els=[...document.querySelectorAll('#app *')].filter(e=>{for(const n of e.childNodes)if(n.nodeType===3&&n.textContent.trim())return true;return false});
  for(const el of els){
    const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    if(el.closest('[aria-hidden="true"],svg,.sr-only,[hidden]'))continue;
    const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.3)continue;
    // ancestors outermost → innermost
    const chain=[];let n=el;while(n&&n!==document.documentElement){chain.unshift(n);n=n.parentElement}
    let worst=99,detail='';
    for(const bd of backdrops){
      let cands=[bd];
      for(const a of chain){
        const s=getComputedStyle(a);if(+s.opacity===0)break;
        const layers=[];const bc=parse(s.backgroundColor);if(bc&&bc.a>0)layers.push([bc]);
        if(s.backgroundImage&&s.backgroundImage!=='none'){
          // split top-level layers; CSS paints the last layer first
          const parts=[];let depth=0,cur='';for(const ch of s.backgroundImage){if(ch==='(')depth++;if(ch===')')depth--;if(ch===','&&depth===0){parts.push(cur);cur=''}else cur+=ch}parts.push(cur);
          for(const part of parts.reverse()){if(/url\(/.test(part))continue;const cols=colorsIn(part);if(!cols.length)continue;const opts=cols.slice();if(/transparent/.test(part)||cols.some(c=>c.a===0))opts.push({r:0,g:0,b:0,a:0});layers.push(opts)}
        }
        for(const opts of layers){const next=[];for(const c of cands)for(const o of opts)next.push(over(o,c));next.sort((x,y)=>lum(x)-lum(y));cands=[next[0],next[next.length-1]]}
        if(a.matches('.atmosphere-view')){cands=[{r:8,g:20,b:32,a:1},{r:150,g:170,b:182,a:1}];const pb=getComputedStyle(a,'::before');if(pb.display!=='none'&&pb.backgroundImage!=='none'){const r0=a.getBoundingClientRect(),er=el.getBoundingClientRect(),t=Math.max(0,Math.min(1,((er.top+er.bottom)/2-r0.top)/r0.height));const stops=[...pb.backgroundImage.matchAll(/rgba?\([^)]+\)\s*([\d.]+)%/g)].map(m=>({c:parse(m[0]),p:+m[1]/100}));if(stops.length){let A=stops[0],B=stops[stops.length-1];for(let i=0;i<stops.length-1;i++)if(t>=stops[i].p&&t<=stops[i+1].p){A=stops[i];B=stops[i+1]}const f=B.p>A.p?(t-A.p)/(B.p-A.p):0;const c={r:A.c.r+(B.c.r-A.c.r)*f,g:A.c.g+(B.c.g-A.c.g)*f,b:A.c.b+(B.c.b-A.c.b)*f,a:A.c.a+(B.c.a-A.c.a)*f};cands=cands.map(x=>over(c,x))}}}
      }
      const tc=parse(cs.color);if(!tc)continue;
      for(const bg of cands){const t=over(tc,bg),k=ratio(t,bg);if(k<worst){worst=k;detail=`bd(${bd.r},${bd.g},${bd.b}) bg(${bg.r|0},${bg.g|0},${bg.b|0}) fg${cs.color}`}}
    }
    const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=600,need=size>=24||size>=18.6&&bold?3:4.5;
    if(worst<need){const key=chain.slice(-3).map(a=>a.tagName.toLowerCase()+([...a.classList].slice(0,2).map(c=>'.'+c).join(''))).join('>');const prev=out.get(key);if(!prev||prev.k>worst)out.set(key,{k:Math.round(worst*100)/100,need,text:el.textContent.trim().slice(0,24),detail})}
  }
  return [...out].map(([k,v])=>({sel:k,...v})).sort((a,b)=>a.k-b.k);
};
