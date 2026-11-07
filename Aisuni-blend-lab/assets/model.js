/* Aisuni Blend Lab · state, validation and deterministic exploration. */
(function(root){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const BLENDS=['normal','multiply','screen','overlay','difference','soft-light'];
  const neutral=()=>({
    brightness:100,contrast:100,saturation:100,blur:0
  });
  const initial=()=>({
    name:'Estudio sin título',width:1600,height:2000,background:'#e8e1d6',transparent:false,global:neutral(),intensity:65,seed:82713,defaultFit:'stretch',randomize:{
      blend:true,order:true,position:true,scale:true,rotation:true
    },layers:[]
  });
  function id(){
    if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
    return Date.now().toString(36)+'-'+Array.from(crypto.getRandomValues(new Uint32Array(4)),v=>v.toString(36)).join('-')
  }
  function layer(id,assetId,name,first=false){
    return {
      id,assetId,name,visible:true,locked:false,blend:'normal',opacity:first?1:.75,x:0,y:0,scale:1,rotation:0,fit:'stretch',crop:{
        x:.5,y:.5,zoom:1
      },filters:neutral()
    }
  }
  function rng(seed){
    let a=seed>>>0;
    return()=>{
      a+=0x6D2B79F5;
      let t=Math.imul(a^(a>>>15),1|a);
      t^=t+Math.imul(t^(t>>>7),61|t);
      return((t^(t>>>14))>>>0)/4294967296
    }
  }
  function range(v,min,max,label){
    if(!Number.isFinite(v)||v<min||v>max)throw Error('Valor inválido: '+label);
    return v
  }
  function filters(v){
    if(!v||typeof v!=='object')throw Error('Ajustes de imagen inválidos.');
    return {
      brightness:range(v.brightness,0,200,'brillo'),contrast:range(v.contrast,0,200,'contraste'),saturation:range(v.saturation,0,200,'saturación'),blur:range(v.blur,0,30,'desenfoque')
    }
  }
  function validate(s){
    if(!s||!Array.isArray(s.layers))throw Error('Proyecto inválido.');
    const b=initial();
    b.name=String(s.name||b.name).slice(0,80);
    b.width=range(s.width,64,8192,'ancho');
    b.height=range(s.height,64,8192,'alto');
    if(!Number.isInteger(b.width)||!Number.isInteger(b.height)||b.width/b.height<.1||b.width/b.height>10)throw Error('Proporción del lienzo inválida.');
    if(!/^#[0-9a-f]{6}$/i.test(s.background))throw Error('Fondo inválido.');
    b.background=s.background;
    b.transparent=!!s.transparent;
    b.global=filters(s.global);
    b.intensity=range(s.intensity,0,100,'intensidad');
    b.seed=range(s.seed,1,2147483647,'semilla');
    if(!Number.isInteger(b.seed))throw Error('Semilla inválida.');
    if(!['contain','cover','stretch'].includes(s.defaultFit))throw Error('Ajuste inválido.');
    b.defaultFit=s.defaultFit;
    for(const k of Object.keys(b.randomize))b.randomize[k]=s.randomize?.[k]!==false;
    const ids=new Set;
    b.layers=s.layers.map(l=>{
      if(!l||typeof l.id!=='string'||!l.id||ids.has(l.id)||typeof l.assetId!=='string'||!l.assetId)throw Error('Capa inválida o duplicada.');
      ids.add(l.id);
      if(!BLENDS.includes(l.blend)||!['contain','cover','stretch'].includes(l.fit))throw Error('Modo de capa inválido.');
      return {
        id:l.id,assetId:l.assetId,name:String(l.name||'Imagen').slice(0,180),visible:!!l.visible,locked:!!l.locked,blend:l.blend,fit:l.fit,opacity:range(l.opacity,0,1,'opacidad'),x:range(l.x,-1,1,'posición X'),y:range(l.y,-1,1,'posición Y'),scale:range(l.scale,.1,4,'escala'),rotation:range(l.rotation,0,360,'giro'),crop:{
          x:range(l.crop?.x,0,1,'recorte X'),y:range(l.crop?.y,0,1,'recorte Y'),zoom:range(l.crop?.zoom,1,5,'acercamiento')
        },filters:filters(l.filters)
      }
    });
    return b
  }
  function remix(state,seed,broad=true){
    const s=clone(state),r=rng(seed),t=s.intensity/100*(broad?1:.25);
    s.seed=seed;
    if(!t)return s;
    const indices=s.layers.map((l,i)=>l.visible&&!l.locked?i:-1).filter(i=>i>=0);
    if(s.randomize.order&&indices.length>1){
      const movable=indices.map(i=>s.layers[i]);
      for(let i=movable.length-1; i>0; i--){
        const j=Math.floor(r()*(i+1));
        [movable[i],movable[j]]=[movable[j],movable[i]]
      }
      indices.forEach((index,i)=>s.layers[index]=movable[i])
    }
    const bottom=s.layers.findIndex(l=>l.visible);
    for(const i of indices){
      const l=s.layers[i];
      if(s.randomize.blend){
        const choices=BLENDS.filter(v=>v!=='normal'&&v!==l.blend);
        l.blend=i===bottom?'normal':choices[Math.floor(r()*choices.length)];
        l.opacity=i===bottom?1:clamp(l.opacity+(r()-.45)*.65*t,.2,.95)
      }
      if(s.randomize.position){
        l.x=clamp(l.x+(r()-.5)*.55*t,-.6,.6);
        l.y=clamp(l.y+(r()-.5)*.55*t,-.6,.6)
      }
      if(s.randomize.scale)l.scale=clamp(l.scale+(r()-.45)*.65*t,.5,2.2);
      if(s.randomize.rotation)l.rotation=((l.rotation+(r()-.5)*100*t)%360+360)%360;
      // Crops and image zoom are manual. Hidden and locked layers remain intact.
    }
    return s
  }
  function dimensions(s,edge){
    if(!edge)return [s.width,s.height];
    const ratio=s.width/s.height;
    return ratio>=1?[edge,Math.max(1,Math.round(edge/ratio))]:[Math.max(1,Math.round(edge*ratio)),edge]
  }
  root.BlendModel={
    id,clone,clamp,BLENDS,neutral,initial,layer,rng,validate,remix,dimensions
  };
})(typeof window!=='undefined'?window:globalThis);
