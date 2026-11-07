/* Native Canvas filters where supported; deterministic CPU fallback for others. */
(function(root){
  'use strict';
  function identity(f){
    return f.brightness===100&&f.contrast===100&&f.saturation===100&&f.blur===0
  }
  function css(f,scale){
    return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) blur(${(f.blur*scale).toFixed(3)}px)`
  }
  function supported(make){
    try{
      const c=make(2,2),x=c.getContext('2d');
      if(!('filter' in x))return false;
      x.fillStyle='#ffffff';
      x.filter='brightness(0%)';
      x.fillRect(0,0,2,2);
      return x.getImageData(0,0,1,1).data[0]<5
    }catch{
      return false
    }
  }
  // Premultiplied-alpha, separable box blur avoids dark halos at transparent edges.
  function boxBlur(data,w,h,r){
    r=Math.max(1,Math.round(r));
    const temp=new Float32Array(data.length),span=r*2+1;
    for(let y=0; y<h; y++){
      const sums=[0,0,0,0];
      const add=(x,sign)=>{
        if(x<0||x>=w)return;
        const p=(y*w+x)*4,a=data[p+3]/255;
        for(let k=0; k<3; k++)sums[k]+=data[p+k]*a*sign;
        sums[3]+=data[p+3]*sign
      };
      for(let x=-r; x<=r; x++)add(x,1);
      for(let x=0; x<w; x++){
        const p=(y*w+x)*4;
        for(let k=0; k<4; k++)temp[p+k]=sums[k]/span;
        add(x-r,-1);
        add(x+r+1,1)
      }
    }
    for(let x=0; x<w; x++){
      const sums=[0,0,0,0],add=(y,sign)=>{
        if(y<0||y>=h)return;
        const p=(y*w+x)*4;
        for(let k=0; k<4; k++)sums[k]+=temp[p+k]*sign
      };
      for(let y=-r; y<=r; y++)add(y,1);
      for(let y=0; y<h; y++){
        const p=(y*w+x)*4,a=sums[3]/span;
        for(let k=0; k<3; k++)data[p+k]=a>0?sums[k]/span*255/a:0;
        data[p+3]=a;
        add(y-r,-1);
        add(y+r+1,1)
      }
    }
  }
  function pixels(image,f,scale){
    const d=image.data,b=f.brightness/100,c=f.contrast/100,s=f.saturation/100;
    for(let p=0; p<d.length; p+=4){
      let r=Math.min(255,Math.max(0,(Math.min(255,d[p]*b)-127.5)*c+127.5)),g=Math.min(255,Math.max(0,(Math.min(255,d[p+1]*b)-127.5)*c+127.5)),bl=Math.min(255,Math.max(0,(Math.min(255,d[p+2]*b)-127.5)*c+127.5)),lum=.2126*r+.7152*g+.0722*bl;
      d[p]=lum+(r-lum)*s;
      d[p+1]=lum+(g-lum)*s;
      d[p+2]=lum+(bl-lum)*s
    }
    if(f.blur>0)boxBlur(d,image.width,image.height,f.blur*scale*1.4);
    return image
  }
  function draw(ctx,source,f,scale,native){
    ctx.save();
    try{
      if(identity(f)){
        ctx.drawImage(source,0,0);
        return
      }
      if(native){
        ctx.filter=css(f,scale);
        ctx.drawImage(source,0,0)
      }else{
        const x=source.getContext('2d'),image=pixels(x.getImageData(0,0,source.width,source.height),f,scale);
        x.putImageData(image,0,0);
        ctx.drawImage(source,0,0)
      }
    }finally{
      ctx.restore()
    }
  }
  root.BlendFilters={
    identity,css,supported,pixels,draw
  };
})(typeof window!=='undefined'?window:globalThis);
