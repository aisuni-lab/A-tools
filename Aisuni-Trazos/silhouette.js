(function(root){
'use strict';
let worker=null,serial=0;const pending=new Map(),masks=new WeakMap();
function stop(){if(worker)worker.terminate();worker=null;for(const job of pending.values()){clearTimeout(job.timer);job.reject(Error('No se pudo iniciar el detector. Verifica que models y vendor esten subidos completos.'));}pending.clear();}
function infer(pixels,onProgress){
 if(!worker){worker=new Worker(new URL('silhouette-worker.js',document.baseURI));worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;if(data.progress){job.progress(data.progress);return;}clearTimeout(job.timer);pending.delete(data.id);if(data.error){stop();job.reject(Error('No se pudo detectar la silueta. Reintenta o verifica los archivos models y vendor. Detalle: '+data.error));}else job.resolve(data.mask);};worker.onerror=stop;}
 return new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(stop,120000);pending.set(id,{resolve,reject,progress:onProgress,timer});worker.postMessage({id,pixels},[pixels.buffer]);});
}
async function mask(image,onProgress){
 if(masks.has(image))return masks.get(image);
 const work=(async()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=320;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,320,320);const rgba=ctx.getImageData(0,0,320,320).data;let transparent=0,solid=0;
  for(let i=3;i<rgba.length;i+=4){if(rgba[i]<20)transparent++;if(rgba[i]>200)solid++;}
  if(transparent>1024&&solid>1024){onProgress('Leyendo silueta de la transparencia…');return Float32Array.from({length:320*320},(_,i)=>rgba[i*4+3]/255);}
  ctx.fillStyle='#fff';ctx.fillRect(0,0,320,320);ctx.drawImage(image,0,0,320,320);
  return infer(ctx.getImageData(0,0,320,320).data,onProgress);
 })();masks.set(image,work);try{return await work;}catch(e){masks.delete(image);throw e;}
}
function contour(values,threshold){
 const polygons=d3.contours().size([320,320]).thresholds([threshold]).smooth(true)(values)[0].coordinates;
 let best=null,bestArea=0;
 for(const polygon of polygons){const ring=polygon[0];let area=0;for(let i=1;i<ring.length;i++)area+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];area=Math.abs(area)/2;if(area>bestArea){bestArea=area;best=ring;}}
 if(!best||bestArea<320*320*.005||bestArea>320*320*.98)throw Error('No se distingue una silueta principal. Ajusta el umbral o prueba una foto con figura y fondo mas separados.');
 return best.slice(0,-1).map(([x,y])=>({x:Math.max(0,Math.min(1,x/320)),y:Math.max(0,Math.min(1,y/320))}));
}
// Ordered sampling keeps Random on the silhouette, never jumping across the subject.
function sample(ring,count,surprise,seed,aspect=1){
 const rand=Trazos.rng(seed),n=ring.length,cumulative=[0];for(let i=0;i<n;i++){const a=ring[i],b=ring[(i+1)%n];cumulative.push(cumulative[i]+Math.hypot((a.x-b.x)*aspect,a.y-b.y));}
 const length=cumulative[n];if(!length)return[];const step=length/count,phase=rand()*step;
 return Array.from({length:count},(_,i)=>{const distance=(i*step+phase+(rand()-.5)*step*.7*surprise+length)%length;let lo=0,hi=n;while(lo+1<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<=distance)lo=mid;else hi=mid;}const a=ring[lo],b=ring[(lo+1)%n],t=(distance-cumulative[lo])/(cumulative[lo+1]-cumulative[lo]||1);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};});
}
// Use local tangents without the old canvas-margin clamp: the contour must follow the subject.
function path(p,w,h,curved,tension){if(!curved)return Trazos.path(p,w,h,false);if(p.length<3)return'';const pts=p.map(q=>({x:q.x*w,y:q.y*h})),f=x=>Number(x.toFixed(3));let d=`M ${f(pts[0].x)} ${f(pts[0].y)}`;
 for(let i=0;i<pts.length;i++){const prev=pts[(i+pts.length-1)%pts.length],a=pts[i],b=pts[(i+1)%pts.length],next=pts[(i+2)%pts.length],t=Math.min(.65,tension)/6;d+=` C ${f(a.x+(b.x-prev.x)*t)} ${f(a.y+(b.y-prev.y)*t)} ${f(b.x-(next.x-a.x)*t)} ${f(b.y-(next.y-a.y)*t)} ${f(b.x)} ${f(b.y)}`;}return d+' Z';}
root.Silhouette={mask,contour,sample,path};
})(globalThis);
