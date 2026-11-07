/* File access remains browser-local. Folder traversal has no layer-count cap. */
(function(root){
  'use strict';
  const supported=f=>f.type.startsWith('image/')||/\.(jpe?g|png|webp|avif|gif|bmp|svg)$/i.test(f.name);
  const image=src=>new Promise((resolve,reject)=>{
    const i=new Image;
    i.onload=()=>resolve(i);
    i.onerror=()=>reject(Error('Formato no compatible o imagen dañada.'));
    i.src=src
  });
  const dataURL=blob=>new Promise((resolve,reject)=>{
    const r=new FileReader;
    r.onload=()=>resolve(r.result);
    r.onerror=()=>reject(Error('No se pudo leer la imagen.'));
    r.readAsDataURL(blob)
  });
  function canvas(w,h){
    const c=document.createElement('canvas');
    c.width=w;
    c.height=h;
    return c
  }
  class Assets{
    constructor(){
      this.items=new Map
    }
    async add(blob,name){
      if(!supported({
        type:blob.type||'',name
      }))throw Error('No es una imagen compatible.');
      if(blob.size>100*1024*1024)throw Error('La imagen supera 100 MB.');
      const url=URL.createObjectURL(blob);
      let img;
      try{
        img=await image(url);
        const w=img.naturalWidth,h=img.naturalHeight;
        if(w*h>80000000)throw Error('La imagen supera 80 megapíxeles.');
        const scale=Math.min(1,2048/Math.max(w,h)),preview=canvas(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));
        preview.getContext('2d').drawImage(img,0,0,preview.width,preview.height);
        const thumb=canvas(88,88),tc=thumb.getContext('2d'),fit=Math.min(88/w,88/h);
        tc.fillStyle='#262b30';
        tc.fillRect(0,0,88,88);
        tc.drawImage(img,(88-w*fit)/2,(88-h*fit)/2,w*fit,h*fit);
        const id='asset-'+root.BlendModel.id(),asset={
          id,name:String(name).slice(0,180),blob,preview,thumb:thumb.toDataURL('image/jpeg',.8),width:w,height:h
        };
        this.items.set(id,asset);
        return asset
      }finally{
        if(img)img.src='';
        URL.revokeObjectURL(url)
      }
    }
    preview(id){
      return this.items.get(id)?.preview
    }
    async original(id){
      const a=this.items.get(id);
      if(!a)throw Error('Falta una imagen del proyecto.');
      if(a.width===a.preview.width&&a.height===a.preview.height)return {
        image:a.preview,release(){
        }
      };
      const src=URL.createObjectURL(a.blob);
      try{
        const i=await image(src);
        return {
          image:i,release(){
            i.src='';
            URL.revokeObjectURL(src)
          }
        }
      }catch(e){
        URL.revokeObjectURL(src);
        throw e
      }
    }
    collect(ids){
      for(const [id,a]of this.items)if(!ids.has(id)){
        a.preview.width=1;
        a.preview.height=1;
        this.items.delete(id)
      }
    }
    estimatedMB(){
      let bytes=0;
      for(const a of this.items.values())bytes+=a.blob.size+a.preview.width*a.preview.height*4;
      return Math.round(bytes/1048576)
    }
    async pack(ids){
      return Promise.all([...new Set(ids)].map(async id=>{
        const a=this.items.get(id);
        return {
          id,name:a.name,data:await dataURL(a.blob)
        }
      }))
    }
    async unpack(items,progress=()=>{
    }){
      if(!Array.isArray(items))throw Error('Imágenes del proyecto inválidas.');
      const map=new Map,added=[];
      try{
        for(let i=0; i<items.length; i++){
          const a=items[i];
          if(typeof a.id!=='string'||map.has(a.id)||typeof a.data!=='string'||!/^data:image\/[a-z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/i.test(a.data))throw Error('Imagen del proyecto inválida.');
          const response=await fetch(a.data),asset=await this.add(await response.blob(),a.name||'Imagen');
          map.set(a.id,asset.id);
          added.push(asset.id);
          progress((i+1)/items.length)
        }
        return map
      }catch(e){
        for(const id of added){
          const a=this.items.get(id);
          a.preview.width=1;
          a.preview.height=1;
          this.items.delete(id)
        }
        throw e
      }
    }
  }
  async function* walk(entry){
    if(entry.isFile){
      const file=await new Promise((r,j)=>entry.file(r,j));
      yield file
    }else if(entry.isDirectory){
      const reader=entry.createReader();
      while(true){
        const list=await new Promise((r,j)=>reader.readEntries(r,j));
        if(!list.length)break;
        for(const child of list)yield* walk(child)
      }
    }
  }
  async function dropped(dt){
    const entries=[...dt.items||[]].map(i=>i.webkitGetAsEntry?.()).filter(Boolean);
    if(entries.length){
      const files=[];
      for(const entry of entries)for await(const f of walk(entry))files.push(f);
      return files
    }
    return [...dt.files]
  }
  function download(blob,name){
    const src=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=src;
    a.download=name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(src),60000)
  }
  root.BlendFiles={
    Assets,supported,dropped,download,image,canvas
  };
})(typeof window!=='undefined'?window:globalThis);
