/* Aisuni-Combinus — independent, deterministic Canvas 2D effect stack. */
'use strict';
const CombinusEffects = (() => {
  const n=(label,min,max,value,step=1)=>({label,min,max,value,step,type:'number'});
  const registry={
    grain:{name:'Grano fino',category:'Textura',description:'Grano neutro sin teñir los colores.',params:{amount:n('Intensidad',0,100,18)}},
    paper:{name:'Papel analógico',category:'Textura',description:'Variación suave de fibra y superficie.',params:{amount:n('Intensidad',0,100,22)}},
    color:{name:'Ajuste de color',category:'Color',description:'Brillo, contraste y saturación del conjunto.',params:{brightness:n('Brillo',-100,100,0),contrast:n('Contraste',-80,100,12),saturation:n('Saturación',0,200,100)}},
    map:{name:'Mapa de color',category:'Color',description:'Traduce las luces y sombras a dos colores.',params:{dark:{label:'Sombras',type:'color',value:'#18234b'},light:{label:'Luces',type:'color',value:'#f4ac78'},gamma:n('Curva',.3,3,1,.05)}},
    wave:{name:'Ondulación',category:'Distorsión',description:'Desplazamiento ondulado horizontal, con bordes repetidos.',geometric:true,params:{amount:n('Amplitud %',0,12,2.5,.1),frequency:n('Ondas',1,20,5),speed:n('Ciclos',0,6,1)}},
    rgb:{name:'Separación RGB',category:'Distorsión',description:'Desplaza los canales de color conservando la silueta alfa.',params:{amount:n('Desfase %',0,5,.6,.1),angle:n('Ángulo',0,360,0)}},
    pixel:{name:'Mosaico',category:'Superficie',description:'Agrupa la composición en bloques de color.',params:{size:n('Tamaño',2,100,12)}},
    motion:{name:'Movimiento global',category:'Movimiento',description:'Órbita, giro y acercamiento cíclicos sobre el collage.',geometric:true,params:{shift:n('Órbita %',0,12,2,.1),rotation:n('Giro °',0,30,3,.5),zoom:n('Acercar %',0,15,3,.5),speed:n('Ciclos',1,4,1)}}
  };
  let serial=0;
  const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
  function create(type){const def=registry[type];if(!def)throw Error('Efecto desconocido');return{id:'fx-'+Date.now().toString(36)+'-'+(++serial),type,enabled:true,locked:false,mix:100,seed:2481,params:Object.fromEntries(Object.entries(def.params).map(([k,v])=>[k,v.value]))}}
  function normalize(list){if(!Array.isArray(list))return[];if(list.length>12)throw Error('El proyecto supera 12 efectos.');return list.map(raw=>{if(!raw||!Object.hasOwn(registry,raw.type))throw Error('El proyecto contiene un efecto desconocido.');const e=create(raw.type);e.enabled=raw.enabled!==false;e.locked=!!raw.locked;e.mix=Number.isFinite(+raw.mix)?cap(+raw.mix,0,100):100;e.seed=Number.isFinite(+raw.seed)?(+raw.seed>>>0):2481;for(const[k,p]of Object.entries(registry[e.type].params)){const v=raw.params?.[k];if(p.type==='color')e.params[k]=/^#[0-9a-f]{6}$/i.test(v)?v:p.value;else e.params[k]=Number.isFinite(+v)?cap(+v,p.min,p.max):p.value}return e})}
  function hash(x,y,seed){let a=Math.imul(x+seed,374761393)^Math.imul(y+17,668265263);a=Math.imul(a^(a>>>13),1274126177);return((a^(a>>>16))>>>0)/4294967295}
  const fields=new Map();
  function paperField(seed){if(fields.has(seed))return fields.get(seed);const size=256,out=new Float32Array(size*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const gx=x/16,gy=y/16,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;let v=(hash(ix,iy,seed)*(1-fx)+hash((ix+1)%16,iy,seed)*fx)*(1-fy)+(hash(ix,(iy+1)%16,seed)*(1-fx)+hash((ix+1)%16,(iy+1)%16,seed)*fx)*fy;out[y*size+x]=(v-.5)*1.6+(hash(x,Math.floor(y/4),seed+31)-.5)*.12}if(fields.size>=16)fields.delete(fields.keys().next().value);fields.set(seed,out);return out}
  const pool=[document.createElement('canvas'),document.createElement('canvas')],small=document.createElement('canvas');
  function target(canvas,w,h){if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const c=canvas.getContext('2d',{willReadFrequently:true});if(!c)throw Error('No hay memoria suficiente para los efectos. Reduce la resolución.');c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.clearRect(0,0,w,h);return c}
  function pixels(input,c,w,h,e){const src=input.getContext('2d',{willReadFrequently:true}),p=e.params,scale=1600/Math.min(w,h),paper=e.type==='paper'?paperField(e.seed):null;
    const hex=v=>[1,3,5].map(k=>parseInt(v.slice(k,k+2),16));const dark=e.type==='map'?hex(p.dark):null,light=e.type==='map'?hex(p.light):null;
    const shift=Math.round((p.amount||0)/100*Math.min(w,h)*Math.cos((p.angle||0)*Math.PI/180)),dy=Math.round((p.amount||0)/100*Math.min(w,h)*Math.sin((p.angle||0)*Math.PI/180));
    for(let y=0;y<h;y+=64){const rows=Math.min(64,h-y),data=src.getImageData(0,y,w,rows),d=data.data;let sample=null,top=0,bottom=0;
      if(e.type==='rgb'){top=Math.max(0,y-Math.abs(dy));bottom=Math.min(h,y+rows+Math.abs(dy));sample=src.getImageData(0,top,w,bottom-top).data}
      for(let yy=0;yy<rows;yy++)for(let x=0;x<w;x++){const i=(yy*w+x)*4;if(!d[i+3])continue;let r=d[i],g=d[i+1],b=d[i+2];
        if(e.type==='grain'||e.type==='paper'){let delta;if(paper){const xx=Math.floor(x*scale)%256,yyy=Math.floor((y+yy)*scale)%256;delta=paper[yyy*256+xx]*p.amount*.16}else delta=(hash(Math.floor(x*scale),Math.floor((y+yy)*scale),e.seed)-.5)*p.amount*.32;r+=delta;g+=delta;b+=delta}
        if(e.type==='color'){const lum=.2126*r+.7152*g+.0722*b,sat=p.saturation/100,contrast=1+p.contrast/100;const f=v=>((lum+(v-lum)*sat)-127.5)*contrast+127.5+p.brightness*1.275;r=f(r);g=f(g);b=f(b)}
        if(e.type==='map'){const t=Math.pow(cap((.2126*r+.7152*g+.0722*b)/255,0,1),p.gamma);r=dark[0]+(light[0]-dark[0])*t;g=dark[1]+(light[1]-dark[1])*t;b=dark[2]+(light[2]-dark[2])*t}
        if(sample){const get=(xx,yyy,ch,base)=>{xx=cap(xx,0,w-1);yyy=cap(yyy,top,bottom-1);const j=((yyy-top)*w+xx)*4;return sample[j+3]?sample[j+ch]:base};r=get(x+shift,y+yy+dy,0,r);b=get(x-shift,y+yy-dy,2,b)}
        d[i]=r;d[i+1]=g;d[i+2]=b;
      }c.putImageData(data,0,y);
    }
  }
  function pass(input,c,w,h,e,time,duration){const p=e.params,phase=2*Math.PI*(time??0)/Math.max(.1,duration);
    if(e.type==='wave'){const step=Math.max(1,Math.floor(h/1000)),amp=p.amount/100*Math.min(w,h);for(let y=0;y<h;y+=step){const rows=Math.min(step,h-y),dx=Math.round(Math.sin(y/h*Math.PI*2*p.frequency+phase*p.speed)*amp);c.drawImage(input,0,y,w,rows,dx,y,w,rows);if(dx>0)c.drawImage(input,w-dx,y,dx,rows,0,y,dx,rows);if(dx<0)c.drawImage(input,0,y,-dx,rows,w+dx,y,-dx,rows)}return}
    if(e.type==='motion'){const t=phase*p.speed,z=1+(1-Math.cos(t))*.5*p.zoom/100;c.save();c.translate(w/2+Math.sin(t)*p.shift/100*w,h/2+(Math.cos(t)-1)*p.shift/200*h);c.rotate(Math.sin(t)*p.rotation*Math.PI/180);c.scale(z,z);c.drawImage(input,-w/2,-h/2);c.restore();return}
    if(e.type==='pixel'){const unit=Math.max(1,p.size*Math.min(w,h)/800);small.width=Math.max(1,Math.round(w/unit));small.height=Math.max(1,Math.round(h/unit));const s=small.getContext('2d');s.drawImage(input,0,0,small.width,small.height);c.imageSmoothingEnabled=false;c.drawImage(small,0,0,w,h);c.imageSmoothingEnabled=true;return}
    pixels(input,c,w,h,e);
  }
  function mix(input,out,w,h,amount){if(amount>=1)return;const src=input.getContext('2d',{willReadFrequently:true});for(let y=0;y<h;y+=64){const rows=Math.min(64,h-y),a=src.getImageData(0,y,w,rows).data,b=out.getImageData(0,y,w,rows),d=b.data;for(let i=0;i<d.length;i+=4){const aa=a[i+3]/255,ba=d[i+3]/255,alpha=aa*(1-amount)+ba*amount;for(let ch=0;ch<3;ch++)d[i+ch]=alpha?(a[i+ch]*aa*(1-amount)+d[i+ch]*ba*amount)/alpha:0;d[i+3]=alpha*255}out.putImageData(b,0,y)}}
  function render(context,w,h,effects,time,duration){let current=context.canvas,index=0;const active=effects.filter(e=>e.enabled&&e.mix>0);for(const e of active){const out=target(pool[index],w,h);pass(current,out,w,h,e,time,duration);mix(current,out,w,h,e.mix/100);current=pool[index];index=1-index}if(active.length){context.clearRect(0,0,w,h);context.drawImage(current,0,0)}return active.length}
  function release(){for(const c of pool)c.width=c.height=1;small.width=small.height=1}
  function randomize(effects,seed){let a=seed>>>0;const random=()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296};return effects.map(e=>{const r={...e,params:{...e.params}};if(e.locked)return r;r.seed=seed;const sets={grain:{amount:[10,45]},paper:{amount:[12,45]},color:{brightness:[-12,12],contrast:[-10,35],saturation:[70,135]},map:{gamma:[.65,1.5]},wave:{amount:[.4,4],frequency:[2,9],speed:[1,3]},rgb:{amount:[.2,1.5],angle:[0,360]},pixel:{size:[4,30]},motion:{shift:[.5,4],rotation:[1,8],zoom:[1,6],speed:[1,2]}};for(const[k,[lo,hi]]of Object.entries(sets[e.type])){const spec=registry[e.type].params[k];r.params[k]=Math.round((lo+random()*(hi-lo))/spec.step)*spec.step}if(e.type==='map'){const palettes=[['#18234b','#f4ac78'],['#1a3329','#e9f394'],['#3b1535','#f3cfe4'],['#151515','#f2efe8']];const p=palettes[Math.floor(random()*palettes.length)];r.params.dark=p[0];r.params.light=p[1]}return r})}
  return{registry,create,normalize,render,release,randomize};
})();
