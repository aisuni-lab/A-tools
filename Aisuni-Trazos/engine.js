(function(root){
'use strict';
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function detect(data,w,h,mode){
 const lum=new Float32Array(w*h);for(let i=0;i<lum.length;i++)lum[i]=(.2126*data[i*4]+.7152*data[i*4+1]+.0722*data[i*4+2])*data[i*4+3]/255;
 const points=[];const step=Math.max(3,Math.round(Math.max(w,h)/160));
 for(let y=3;y<h-3;y+=step)for(let x=3;x<w-3;x+=step){let i=y*w+x;
 const gx=lum[i+1]-lum[i-1],gy=lum[i+w]-lum[i-w];let score=Math.hypot(gx,gy);
 if(mode==='contrast'){let sum=0,sq=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const l=lum[i+dy*w+dx];sum+=l;sq+=l*l;}score=Math.sqrt(Math.max(0,sq/25-(sum/25)**2));}
 if(mode==='color'){score=0;for(let c=0;c<3;c++)score+=Math.abs(data[(i+2)*4+c]-data[(i-2)*4+c])+Math.abs(data[(i+w*2)*4+c]-data[(i-w*2)*4+c]);score/=3;}
 if(data[i*4+3]>30&&score>3)points.push({x:x/w,y:y/h,score});
 }
 return points.sort((a,b)=>b.score-a.score).slice(0,12000);
}
function route(candidates,count,surprise,seed,aspect=1){
 if(candidates.length<3)return[];const rand=rng(seed),pool=candidates.map(p=>({...p,rank:p.score*(.35+rand()*(.5+surprise*3))})).sort((a,b)=>b.rank-a.rank),chosen=[];
 const distance=(a,b)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y);let min=.65*Math.sqrt(aspect/count);
 for(let pass=0;pass<5&&chosen.length<count;pass++,min*=.6)for(const p of pool){if(chosen.length>=count)break;if(!chosen.includes(p)&&chosen.every(q=>distance(p,q)>min))chosen.push(p);}
 if(chosen.length<3)return[];
 const remaining=chosen.slice(),out=[remaining.splice(Math.floor(rand()*remaining.length),1)[0]];
 while(remaining.length){const last=out[out.length-1];remaining.sort((a,b)=>distance(last,a)-distance(last,b));const k=Math.min(remaining.length,1+Math.floor(surprise*6));out.push(remaining.splice(Math.floor(rand()*k),1)[0]);}return out;
}
function path(points,w,h,curved,tension=.7){
 if(points.length<3)return'';const p=points.map(a=>({x:a.x*w,y:a.y*h})),f=v=>Number(v.toFixed(3));let d=`M ${f(p[0].x)} ${f(p[0].y)}`;
 const cx=v=>f(Math.max(.041*w,Math.min(.959*w,v))),cy=v=>f(Math.max(Math.min(.2*h,.041*w),Math.min(h-Math.min(.2*h,.041*w),v)));
 for(let i=0;i<p.length;i++){let a=p[i],b=p[(i+1)%p.length];if(!curved)d+=` L ${f(b.x)} ${f(b.y)}`;else{const prev=p[(i+p.length-1)%p.length],next=p[(i+2)%p.length],t=tension/6;d+=` C ${cx(a.x+(b.x-prev.x)*t)} ${cy(a.y+(b.y-prev.y)*t)} ${cx(b.x-(next.x-a.x)*t)} ${cy(b.y-(next.y-a.y)*t)} ${f(b.x)} ${f(b.y)}`;}}return d+' Z';
}
const api={rng,detect,route,path};if(typeof module!=='undefined')module.exports=api;else root.Trazos=api;
})(globalThis);
