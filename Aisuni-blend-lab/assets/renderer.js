/* One compositing pipeline for preview and export, with normalized transforms. */
(function(root){
  'use strict';
  const F=root.BlendFilters;
  function sourceRect(image,aspect,c,fit){
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    let w=iw,h=ih;
    if(fit!=='stretch'){
      h=w/aspect;
      if(fit==='contain'?h<ih:h>ih){
        h=ih;
        w=ih*aspect
      }
    }
    w/=c.zoom;
    h/=c.zoom;
    return {
      x:c.x*(iw-w),y:c.y*(ih-h),w,h
    }
  }
  // In stretch mode, inverse-project all four canvas corners into the layer.
  // The largest normalized extent is the minimum scale that covers the canvas.
  // This is derived at render time so locks, crops and saved parameters stay intact.
  function coverageScale(l,w,h){
    if(l.fit!=='stretch')return l.scale;
    const angle=(l.rotation%360)*Math.PI/180;
    const cos=Math.cos(angle),sin=Math.sin(angle);
    const cx=w*(.5+l.x),cy=h*(.5+l.y);
    // A normalized guard keeps anti-aliased edges outside preview and export alike.
    const guard=(l.rotation%360||l.x||l.y)?Math.max(w,h)*.002:0;
    let minimum=1;
    for(const x of [-guard,w+guard])for(const y of [-guard,h+guard]){
      const dx=x-cx,dy=y-cy;
      minimum=Math.max(minimum,Math.abs(cos*dx+sin*dy)/(w/2),Math.abs(-sin*dx+cos*dy)/(h/2));
    }
    return Math.max(l.scale,minimum);
  }
  function drawLayer(ctx,image,l,w,h){
    const cut=sourceRect(image,w/h,l.crop,l.fit);
    ctx.save();
    ctx.translate(w*(.5+l.x),h*(.5+l.y));
    ctx.rotate((l.rotation%360)*Math.PI/180);
    const scale=coverageScale(l,w,h);
    ctx.scale(scale,scale);
    ctx.drawImage(image,cut.x,cut.y,cut.w,cut.h,-w/2,-h/2,w,h);
    ctx.restore()
  }
  class Renderer{
    constructor(make){
      this.make=make||((w,h)=>{
        const c=document.createElement('canvas');
        c.width=w;
        c.height=h;
        return c
      });
      this.native=F.supported(this.make);
      this.scratch=null
    }
    buffer(w,h){
      if(!this.scratch)this.scratch=this.make(w,h);
      if(this.scratch.width!==w||this.scratch.height!==h){
        this.scratch.width=w;
        this.scratch.height=h
      }
      const x=this.scratch.getContext('2d');
      x.setTransform(1,0,0,1,0,0);
      x.globalCompositeOperation='source-over';
      x.globalAlpha=1;
      x.clearRect(0,0,w,h);
      return this.scratch
    }
    begin(canvas,state,transparent){
      const ctx=canvas.getContext('2d');
      ctx.setTransform(1,0,0,1,0,0);
      ctx.globalAlpha=1;
      ctx.globalCompositeOperation='source-over';
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(!transparent){
        ctx.fillStyle=state.background;
        ctx.fillRect(0,0,canvas.width,canvas.height)
      }
      return ctx
    }
    layer(ctx,image,l,w,h){
      if(!image||!l.visible||l.opacity===0)return;
      ctx.save();
      ctx.globalAlpha=l.opacity;
      ctx.globalCompositeOperation=l.blend==='normal'?'source-over':l.blend;
      try{
        if(F.identity(l.filters))drawLayer(ctx,image,l,w,h);
        else{
          const scratch=this.buffer(w,h);
          drawLayer(scratch.getContext('2d'),image,l,w,h);
          F.draw(ctx,scratch,l.filters,Math.max(w,h)/1000,this.native)
        }
      }finally{
        ctx.restore()
      }
    }
    finish(ctx,canvas,state,transparent){
      if(F.identity(state.global))return;
      const scratch=this.buffer(canvas.width,canvas.height);
      scratch.getContext('2d').drawImage(canvas,0,0);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      F.draw(ctx,scratch,state.global,Math.max(canvas.width,canvas.height)/1000,this.native);
      if(!transparent){
        ctx.save();
        ctx.globalCompositeOperation='destination-over';
        ctx.fillStyle=state.background;
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore()
      }
    }
    render(canvas,state,getImage,transparent=state.transparent){
      const x=this.begin(canvas,state,transparent);
      for(const l of state.layers)if(l.visible)this.layer(x,getImage(l.assetId),l,canvas.width,canvas.height);
      this.finish(x,canvas,state,transparent)
    }
    async export(canvas,state,load,progress=()=>{
    },transparent=state.transparent){
      const x=this.begin(canvas,state,transparent),layers=state.layers.filter(l=>l.visible&&l.opacity>0);
      for(let i=0; i<layers.length; i++){
        const resource=await load(layers[i].assetId);
        try{
          this.layer(x,resource.image,layers[i],canvas.width,canvas.height)
        }finally{
          resource.release?.()
        }
        progress((i+1)/Math.max(1,layers.length));
        await new Promise(r=>setTimeout(r,0))
      }
      this.finish(x,canvas,state,transparent)
    }
    dispose(){
      if(this.scratch){
        this.scratch.width=1;
        this.scratch.height=1;
        this.scratch=null
      }
    }
  }
  root.BlendRenderer={
    Renderer,drawLayer,sourceRect,coverageScale
  };
})(typeof window!=='undefined'?window:globalThis);
