/* Aisuni · Image Lab 2.3 — deterministic, resolution-independent composition engine. */
(function(root){
'use strict';
const SYSTEMS=[['weave','Trama','Cruces y continuidad'],['mosaic','Mosaico','Módulos y recortes'],['flow','Flujo','Cintas fotográficas'],['radial','Radial','Anillos y sectores'],['isometric','Isométrico','Planos y volúmenes'],['distortion','Distorsión','Una malla compartida'],['truchet','Truchet','Arcos conectados'],['nested','Ventanas','Escalas anidadas'],['adaptive','Fragmentación','Densidades adaptativas'],['bands','Desfase','Bandas deslizantes'],['constellation','Constelación','Núcleos y vacíos'],['interference','Interferencia','Dos tramas angulares']];
const DEFAULTS={system:'weave',secondary:null,seed:71823,aspect:'4:5',density:42,warp:28,mix:65,spacing:0,rotation:0,surprise:65,fragmentation:45,grain:8,blend:'normal',palette:'original',background:'#eee9dc',transparent:false,locks:{}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function dimensions(aspect,longEdge=2048){const parts=aspect.split(':').map(Number);const ratio=parts[0]/parts[1];return ratio>=1?[longEdge,Math.round(longEdge/ratio)]:[Math.round(longEdge*ratio),longEdge]}
function crop(image,aspect,c={x:.5,y:.5,zoom:1}){const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;let w=iw,h=iw/aspect;if(h>ih){h=ih;w=ih*aspect}const z=clamp(c.zoom||1,1,5);w/=z;h/=z;return {x:clamp(c.x??.5,0,1)*(iw-w),y:clamp(c.y??.5,0,1)*(ih-h),w,h}}
function photo(ctx,a,b){const s=crop(a.image,b.w/b.h,a.crop);ctx.drawImage(a.image,s.x,s.y,s.w,s.h,b.x,b.y,b.w,b.h)}
function poly(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath()}
function triangle(ctx,image,source,dest){const [s0,s1,s2]=source,[d0,d1,d2]=dest;const sx1=s1[0]-s0[0],sy1=s1[1]-s0[1],sx2=s2[0]-s0[0],sy2=s2[1]-s0[1],det=sx1*sy2-sx2*sy1;if(Math.abs(det)<.00001)return;
 const dx1=d1[0]-d0[0],dy1=d1[1]-d0[1],dx2=d2[0]-d0[0],dy2=d2[1]-d0[1];const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det,c=(dx2*sx1-dx1*sx2)/det,d=(dy2*sx1-dy1*sx2)/det;
 // Overlap only the raster seam, never add a visible dividing stroke.
 const center=dest.reduce((a,p)=>[a[0]+p[0]/3,a[1]+p[1]/3],[0,0]);
 const transform=ctx.getTransform(),seam=.8/Math.max(.01,Math.hypot(transform.a,transform.b));
 const expanded=dest.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],d=Math.hypot(dx,dy)||1;return [p[0]+dx/d*seam,p[1]+dy/d*seam]});
 ctx.save();poly(ctx,expanded);ctx.clip();ctx.transform(a,b,c,d,d0[0]-a*s0[0]-c*s0[1],d0[1]-b*s0[0]-d*s0[1]);ctx.drawImage(image,0,0);ctx.restore()}
function quad(ctx,a,points){const s=crop(a.image,1,a.crop),corners=[[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]];triangle(ctx,a.image,[corners[0],corners[1],corners[2]],[points[0],points[1],points[2]]);triangle(ctx,a.image,[corners[0],corners[2],corners[3]],[points[0],points[2],points[3]])}
function environment(ctx,assets,s,W,H){const random=rng(s.seed),n=clamp(Math.round(3+s.density/100*5+s.fragmentation/100*9),3,17),gap=s.spacing/100*Math.min(W,H)/n*.22,sur=s.surprise/100,warp=s.warp/100;
 const order=[...assets];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}const index=(i)=>{const k=Math.floor(i),r=rng((s.seed+Math.imul(k+10007,2654435761))>>>0);return r()<s.mix/100?order[Math.floor(r()*order.length)]:order[0]};
 // One smooth coordinate field is shared by neighboring pieces. It bends
 // boundaries continuously instead of rotating unrelated fragments at random.
 const phase=(s.seed%65521)/65521*Math.PI*2,amplitude=Math.min(W,H)*warp*(.025+.32/n)*(.65+sur*.35);
 const map=(x,y)=>{const xx=x/W,yy=y/H,edgeX=Math.sin(Math.PI*clamp(xx,0,1)),edgeY=Math.sin(Math.PI*clamp(yy,0,1));return [x+edgeX*amplitude*(Math.sin(yy*5+phase)+.3*Math.sin(xx*5+yy*3-phase)),y+edgeY*amplitude*(Math.cos(xx*5-phase)+.3*Math.sin(yy*4+xx*2+phase))]};
 const outline=points=>{const result=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/Math.min(W,H)*50));for(let j=0;j<steps;j++){const t=j/steps;result.push(map(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))}}return result};
 const axis=(count,length,salt)=>{const r=rng(s.seed+salt),weights=Array.from({length:count},()=>1+(r()-.5)*(.15+sur*.8+warp*.7)),total=weights.reduce((a,b)=>a+b,0),values=[0];let v=0;for(const w of weights){v+=w/total*length;values.push(v)}values[count]=length;return values};
 const tile=(a,points,b={x:0,y:0,w:W,h:H},local=false)=>{const path=outline(points);let bounds={x:0,y:0,w:W,h:H};if(local){let x=b.x,y=b.y,right=b.x+b.w,bottom=b.y+b.h;for(const p of path){x=Math.min(x,p[0]);y=Math.min(y,p[1]);right=Math.max(right,p[0]);bottom=Math.max(bottom,p[1])}bounds={x,y,w:right-x,h:bottom-y}}ctx.save();poly(ctx,path);ctx.clip();photo(ctx,a,bounds);ctx.restore()};
 return {ctx,assets,s,W,H,random,n,gap,sur,warp,index,tile,map,outline,axis};}
const engines={
 weave(e){const {W,H,n,gap,tile,index,axis}=e,xs=axis(n,W,31),ys=axis(n,H,71);
 for(let r=0;r<n;r++)for(let c=0;c<n;c++){const x=xs[c],y=ys[r],w=xs[c+1]-x,h=ys[r+1]-y;tile(index((c+r)%2?c:r+2),[[x+gap/2,y+gap/2],[x+w-gap/2,y+gap/2],[x+w-gap/2,y+h-gap/2],[x+gap/2,y+h-gap/2]])}},
 mosaic(e){const {W,H,n,gap,random,sur,tile,index,axis}=e,ys=axis(n,H,47);let i=0;
 for(let r=0;r<n;r++){const cols=Math.max(2,n-Math.floor(random()*n*sur*.5)),xs=axis(cols,W,r+201);for(let c=0;c<cols;c++){const x=xs[c],y=ys[r],w=xs[c+1]-x,h=ys[r+1]-y;tile(index(i++),[[x+gap/2,y+gap/2],[x+w-gap/2,y+gap/2],[x+w-gap/2,y+h-gap/2],[x+gap/2,y+h-gap/2]],{x,y,w,h},random()<e.s.fragmentation/220)}}},
 flow(e){const {W,H,n,gap,warp,index,tile,s,axis}=e,ys=axis(n,H,109),phase=s.seed%101,amp=H*warp*.13;
 const boundary=(x,r)=>{const y=ys[r],t=y/H;return y+Math.sin(Math.PI*t)*(Math.sin(x/W*5+phase+t*2)*amp+Math.sin(x/W*9-phase)*amp*.2)};
 for(let r=0;r<n;r++){const pts=[];for(let k=0;k<=70;k++){const x=W*k/70;pts.push([x,boundary(x,r)+gap/2])}for(let k=70;k>=0;k--){const x=W*k/70;pts.push([x,boundary(x,r+1)-gap/2])}tile(index(r),pts)}},
 radial(e){const {W,H,n,gap,warp,index,tile,s,axis}=e,cx=W*(.5+Math.sin(s.seed)*warp*.12),cy=H*(.5+Math.cos(s.seed)*warp*.12),R=Math.hypot(W,H),rings=Math.max(3,Math.round(n*.7)),radii=axis(rings,R,63),phase=s.seed%73;
 const radius=(r,a)=>r*(1+warp*.08*Math.sin(a*3+phase));let count=0;
 for(let k=0;k<rings;k++){const countS=Math.max(3,Math.round(4+n*.4+k*.6)),angles=axis(countS,Math.PI*2,k+19),twist=warp*Math.sin(k*.55+phase)*.45;
 for(let j=0;j<countS;j++){const a=angles[j]+twist,b=angles[j+1]+twist,pts=[];for(let t=0;t<=24;t++){const ang=a+(b-a)*t/24,rad=radius(radii[k+1],ang)-gap/2;pts.push([cx+Math.cos(ang)*rad,cy+Math.sin(ang)*rad])}for(let t=24;t>=0;t--){const ang=a+(b-a)*t/24,rad=radius(radii[k],ang)+(k?gap/2:0);pts.push([cx+Math.cos(ang)*rad,cy+Math.sin(ang)*rad])}tile(index(count++),pts)}}},
 isometric(e){const {ctx,W,H,n,gap,index,map,warp}=e,u=W/(Math.max(3,Math.round(n*.6))*2),v=u*(.46+warp*.15);let i=0;
 function face(asset,p){const cut=crop(asset.image,1,asset.crop),steps=1;const pos=(x,y)=>map(p[0][0]*(1-x)*(1-y)+p[1][0]*x*(1-y)+p[2][0]*x*y+p[3][0]*(1-x)*y,p[0][1]*(1-x)*(1-y)+p[1][1]*x*(1-y)+p[2][1]*x*y+p[3][1]*(1-x)*y);const uv=(x,y)=>[cut.x+x*cut.w,cut.y+y*cut.h];
 for(let r=0;r<steps;r++)for(let c=0;c<steps;c++){const x=c/steps,y=r/steps,X=(c+1)/steps,Y=(r+1)/steps;triangle(ctx,asset.image,[uv(x,y),uv(X,y),uv(X,Y)],[pos(x,y),pos(X,y),pos(X,Y)]);triangle(ctx,asset.image,[uv(x,y),uv(X,Y),uv(x,Y)],[pos(x,y),pos(X,Y),pos(x,Y)])}}
 for(let r=-2;r<H/(v*3)+2;r++)for(let c=-1;c<W/(u*2)+1;c++){const x=c*u*2+(r%2)*u,y=r*v*3;for(const p of [[[x,y-v],[x+u,y],[x,y+v],[x-u,y]],[[x-u,y],[x,y+v],[x,y+v*3],[x-u,y+v*2]],[[x,y+v],[x+u,y],[x+u,y+v*2],[x,y+v*3]]]){const cx=p.reduce((a,v)=>a+v[0]/4,0),cy=p.reduce((a,v)=>a+v[1]/4,0);face(index(i++),p.map(v=>[v[0]+(cx-v[0])*gap/u,v[1]+(cy-v[1])*gap/u]))}}},
 distortion(e){const {ctx,W,H,n,gap,index,map,s}=e,cols=n*2,rows=Math.max(4,Math.round(cols*H/W)),cw=W/cols,ch=H/rows;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=index(Math.floor(c/Math.max(2,10-Math.round(s.fragmentation/13)))+Math.floor(r/5)),src=crop(a.image,W/H,a.crop),uv=(cc,rr)=>[src.x+cc/cols*src.w,src.y+rr/rows*src.h],p=[map(c*cw,r*ch),map((c+1)*cw,r*ch),map((c+1)*cw,(r+1)*ch),map(c*cw,(r+1)*ch)];ctx.save();if(gap){const cx=p.reduce((a,v)=>a+v[0]/4,0),cy=p.reduce((a,v)=>a+v[1]/4,0);poly(ctx,p.map(v=>[v[0]+(cx-v[0])*gap/(cw*2),v[1]+(cy-v[1])*gap/(ch*2)]));ctx.clip()}triangle(ctx,a.image,[uv(c,r),uv(c+1,r),uv(c+1,r+1)],[p[0],p[1],p[2]]);triangle(ctx,a.image,[uv(c,r),uv(c+1,r+1),uv(c,r+1)],[p[0],p[2],p[3]]);ctx.restore()}},
 truchet(e){const {ctx,W,H,n,gap,random,index,sur,warp,outline}=e,u=W/n,width=u*(.13+warp*.16);let i=0;
 for(let y=0;y<H;y+=u)for(let x=0;x<W;x+=u){ctx.save();poly(ctx,outline([[x+gap/2,y+gap/2],[x+u-gap/2,y+gap/2],[x+u-gap/2,y+u-gap/2],[x+gap/2,y+u-gap/2]]));ctx.clip();photo(ctx,index(i),{x:0,y:0,w:W,h:H});const regular=(Math.round(x/u)+Math.round(y/u))%2===0,flip=random()<sur?random()>.5:regular,centers=flip?[[x,y],[x+u,y+u]]:[[x+u,y],[x,y+u]];
 for(let j=0;j<2;j++){ctx.save();const pts=[];for(let t=0;t<=80;t++){const a=t/80*Math.PI*2;pts.push([centers[j][0]+Math.cos(a)*(u*.5+width/2),centers[j][1]+Math.sin(a)*(u*.5+width/2)])}for(let t=80;t>=0;t--){const a=t/80*Math.PI*2;pts.push([centers[j][0]+Math.cos(a)*(u*.5-width/2),centers[j][1]+Math.sin(a)*(u*.5-width/2)])}poly(ctx,outline(pts));ctx.clip('evenodd');photo(ctx,index(i+j+1),{x:0,y:0,w:W,h:H});ctx.restore()}ctx.restore();i++}},
 nested(e){const {W,H,n,gap,index,warp,sur,s,tile}=e,cols=Math.max(1,Math.round(n/6)),rows=Math.max(1,Math.round(cols*H/W)),cw=W/cols,ch=H/rows,layers=n;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)for(let k=0;k<layers;k++){const factor=Math.pow(1-k/(layers+1),1+warp*.5),w=Math.max(1,cw*factor-gap),h=Math.max(1,ch*factor-gap),cx=(c+.5)*cw+Math.sin(k*.35+s.seed)*cw*warp*sur*.13,cy=(r+.5)*ch+Math.cos(k*.3+s.seed)*ch*warp*sur*.13,power=2/(8-warp*5),pts=[];
 for(let j=0;j<96;j++){const a=j/96*Math.PI*2,cos=Math.cos(a),sin=Math.sin(a);pts.push([cx+Math.sign(cos)*Math.pow(Math.abs(cos),power)*w/2,cy+Math.sign(sin)*Math.pow(Math.abs(sin),power)*h/2])}tile(index(k+c+r),pts,{x:cx-w/2,y:cy-h/2,w,h},true)}},
 adaptive(e){const {W,H,gap,random,index,s,tile}=e,maxDepth=2+Math.round(s.fragmentation/35+s.density/20),minSize=17;let count=0;
 function divide(x,y,w,h,depth){const attention=(Math.sin((x+w/2)/W*6+s.seed)+Math.cos((y+h/2)/H*7)+2)/4,split=depth<2||(depth<maxDepth&&random()<.3+attention*.55+s.surprise/500);if(split&&Math.min(w,h)>minSize*2){const t=.5+(random()-.5)*(.2+s.warp/100*.5);if(w>h*(.7+random()*.6)){divide(x,y,w*t,h,depth+1);divide(x+w*t,y,w*(1-t),h,depth+1)}else{divide(x,y,w,h*t,depth+1);divide(x,y+h*t,w,h*(1-t),depth+1)}}else{const d=Math.min(gap/2,w*.4,h*.4);tile(index(count++),[[x+d,y+d],[x+w-d,y+d],[x+w-d,y+h-d],[x+d,y+h-d]],{x,y,w,h},random()<s.fragmentation/220)}}divide(0,0,W,H,0)},
 bands(e){const {W,H,n,gap,index,warp,s,axis,tile}=e,ys=axis(n,H,29),phase=s.seed%83;
 const edge=(x,r)=>ys[r]+Math.sin(Math.PI*ys[r]/H)*Math.sin(x/W*3.4+phase+r*.18)*H*warp*.16;
 for(let r=0;r<n;r++){const pts=[];for(let k=0;k<=60;k++)pts.push([W*k/60,edge(W*k/60,r)+gap/2]);for(let k=60;k>=0;k--)pts.push([W*k/60,edge(W*k/60,r+1)-gap/2]);const shift=Math.sin(r*.8+phase)*W*warp*.18;tile(index(r),pts,{x:shift-W*.35,y:-H*.35,w:W*1.7,h:H*1.7},true)}},
 constellation(e){const {ctx,W,H,n,gap,warp,random,sur,index,s}=e,centers=Array.from({length:2+Math.round(sur*3)},()=>[W*(.15+random()*.7),H*(.15+random()*.7)]),count=n*n;
 for(let i=0;i<count;i++){const center=centers[i%centers.length],a=i*2.399963+random()*.3,r=Math.sqrt(random())*Math.min(W,H)*(.12+sur*.2)*(1+s.spacing/100*.8),x=center[0]+Math.cos(a)*r,y=center[1]+Math.sin(a)*r,size=Math.max(1,Math.min(W,H)/n*(.45+random()*(1.7-s.fragmentation/150))-gap),stretch=1+warp*.8,pts=[];
 ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2+Math.sin(i*.7)*warp*.35);for(let j=0;j<40;j++){const t=j/40*Math.PI*2,rr=1+warp*.18*Math.sin(t*3+i);pts.push([Math.cos(t)*size*.5*rr*stretch,Math.sin(t)*size*.5*rr/stretch])}poly(ctx,pts);ctx.clip();photo(ctx,index(i),{x:-size*.65*stretch,y:-size*.65,w:size*1.3*stretch,h:size*1.3});ctx.restore()}},
 interference(e){const {W,H,n,gap,index,sur,warp,s,tile}=e,u=W/n;let i=0;
 for(let r=-1;r<H/u+1;r++)for(let c=-1;c<n+1;c++){const x=c*u+(r%2)*u*.5,y=r*u,d=u*(.48-sur*.1)*(1-warp*.12),pts=[[x,y-d],[x+d,y],[x,y+d],[x-d,y]];tile(index(i++),pts)}
 const angle=Math.PI/4+warp*.35,cos=Math.cos(angle),sin=Math.sin(angle),extent=Math.hypot(W,H),rotate=(x,y)=>[W/2+x*cos-y*sin,H/2+x*sin+y*cos];
 for(let x=-extent;x<extent;x+=u){const width=Math.max(1,u*(.28+warp*.14)-gap),pts=[];for(let k=0;k<=55;k++){const y=-extent+2*extent*k/55,shift=Math.sin(y/extent*4+s.seed)*u*warp*.5;pts.push(rotate(x+shift,y))}for(let k=55;k>=0;k--){const y=-extent+2*extent*k/55,shift=Math.sin(y/extent*4+s.seed)*u*warp*.5;pts.push(rotate(x+width+shift,y))}tile(index(i++),pts)}}
};

// Pure seeded exploration keeps history, export and project replay identical.
function explore(settings,seed,broad=true){
 const s=validate(settings),next={...s,seed,secondary:null,blend:'normal',locks:{...s.locks}},random=rng(seed),strength=s.surprise/100;
 // Three correlated families per mode: open, flowing and intricate.
 // All keep the selected system; no secondary engine or image overlay.
 const families=[{density:[14,38],warp:[35,72],fragmentation:[12,38]}, {density:[30,62],warp:[55,92],fragmentation:[28,60]}, {density:[58,86],warp:[30,74],fragmentation:[55,85]}];
 const family=families[Math.floor(random()*families.length)],ranges={...family,mix:[35,95],grain:[0,16]},organicBias={flow:12,bands:10,radial:6,truchet:8,nested:10,constellation:12,isometric:-8,distortion:8,mosaic:6,weave:6,adaptive:6,interference:6}[s.system];
 for(const [key,[min,max]]of Object.entries(ranges)){
  if(s.locks[key])continue;
  const target=clamp(min+random()*(max-min)+(key==='warp'?organicBias:0),0,100),amount=broad?.45+strength*.55:strength*.3;
  next[key]=Math.round(clamp(s[key]+(target-s[key])*amount,0,100));
 }
 // Preserve continuous compositions; nonzero spacing may be explored explicitly.
 if(!s.locks.spacing&&s.spacing>0)next.spacing=Math.round(clamp(s.spacing+(random()-.5)*(broad?34:12)*strength,1,100));
 if(!s.locks.rotation){const step=(random()-.5)*(broad?360:60)*strength;next.rotation=Math.round(((s.rotation+step)%360+360)%360)%360;}
 return validate(next);
}
function validate(s){const state={...DEFAULTS,...s,locks:{...(s.locks||{})}};if(!SYSTEMS.some(x=>x[0]===state.system))throw Error('Sistema desconocido');if(state.secondary!==null){state.secondary=null;state.blend='normal';}if(!['1:1','4:5','5:4','4:3','3:4','16:9','9:16','2:1','1:2','3:2','2:3'].includes(state.aspect))throw Error('Proporción inválida');for(const k of ['density','warp','mix','spacing','surprise','fragmentation','grain'])if(typeof state[k]!=='number'||!Number.isFinite(state[k])||state[k]<0||state[k]>100)throw Error('Control inválido: '+k);if(typeof state.rotation!=='number'||!Number.isFinite(state.rotation)||state.rotation<0||state.rotation>360)throw Error('Control inválido: rotation');if(!Number.isSafeInteger(state.seed)||state.seed<1||state.seed>2147483647)throw Error('Semilla inválida');if(!['normal','multiply','screen','soft-light'].includes(state.blend))throw Error('Fusión inválida');if(!['original','warm','cool','mono'].includes(state.palette)||!/^#[a-f\d]{6}$/i.test(state.background))throw Error('Acabado inválido');if(typeof state.transparent!=='boolean')throw Error('Transparencia inválida');return state}
function render(canvas,assets,settings,options={}){const s=validate(settings),ctx=canvas.getContext('2d'),W=1000,H=1000*Number(s.aspect.split(':')[1])/Number(s.aspect.split(':')[0]);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/W,canvas.height/H);if(!options.transparent){ctx.fillStyle=s.background;ctx.fillRect(0,0,W,H)}if(!assets.length){ctx.restore();return}// Rotate the effect around the canvas center. Cover scaling avoids empty
 // corners for continuous modes; the viewport clips the excess at its edges.
 ctx.save();const angle=(s.rotation%360)*Math.PI/180;
 if(angle){const cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle)),cover=Math.max((W*cos+H*sin)/W,(W*sin+H*cos)/H);ctx.translate(W/2,H/2);ctx.rotate(angle);ctx.scale(cover,cover);ctx.translate(-W/2,-H/2);}
 const e=environment(ctx,assets,s,W,H);
 // Continuous modes underpaint with a photograph at zero spacing: antialiased
 // shared edges cannot reveal the light canvas. Constellation keeps its voids.
 if(s.spacing===0&&s.system!=='constellation')photo(ctx,e.index(0),{x:0,y:0,w:W,h:H});
 engines[s.system](e);
 if(s.palette!=='original'){ctx.save();ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=s.palette==='mono'?.55:.18;ctx.fillStyle=s.palette==='warm'?'#df883b':s.palette==='cool'?'#507aaf':'#888888';ctx.fillRect(0,0,W,H);ctx.restore()}
 if(s.blend!=='normal'&&!s.secondary){ctx.save();ctx.globalCompositeOperation=s.blend;ctx.globalAlpha=.18;photo(ctx,assets[0],{x:0,y:0,w:W,h:H});ctx.restore()}
 if(s.grain){const random=rng(s.seed+27899);ctx.save();ctx.globalCompositeOperation='source-atop';for(let i=0;i<16000;i++){ctx.fillStyle=random()>.5?'rgba(255,255,255,'+(s.grain/500)+')':'rgba(0,0,0,'+(s.grain/600)+')';const size=.35+random()*.9;ctx.fillRect(random()*W,random()*H,size,size)}ctx.restore()}ctx.restore();ctx.restore()}
root.AisuniEngine={SYSTEMS,DEFAULTS,rng,dimensions,crop,render,validate,explore};
})(typeof window!=='undefined'?window:globalThis);
