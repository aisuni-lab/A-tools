(function(){
  'use strict';
  const M=window.BlendModel,F=window.BlendFiles,R=window.BlendRenderer,$=id=>document.getElementById(id),$$=q=>[...document.querySelectorAll(q)],copy=M.clone;
  const assets=new F.Assets,renderer=new R.Renderer,canvas=$('canvas');
  let state=M.initial(),selected=null,scope='layer',history=[],undo=[],redo=[],activeHistory=-1,sequence=1,raf=0,busy=false,cancelled=false,dirty=false,toastTimer=null,cropEdit=null,gesture=null,initialDemo=false;
  const controls=new Map,labels={
    normal:'Normal',multiply:'Multiplicar',screen:'Trama',overlay:'Superponer',difference:'Diferencia','soft-light':'Luz suave'
  };
  const uid=()=>M.id(),seed=()=>crypto.getRandomValues(new Uint32Array(1))[0]%2147483646+1,layer=()=>state.layers.find(l=>l.id===selected),icon=name=>`<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`,pause=()=>new Promise(r=>setTimeout(r,0));
  function toast(message){
    $('toast').textContent=message;
    $('toast').hidden=false;
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>$('toast').hidden=true,4500)
  }
  function snapshot(){
    return {
      state:copy(state),selected
    }
  }
  function mark(){
    dirty=true;
    $('projectNameButton').textContent=state.name+' •'
  }
  function remember(before){
    undo.push(before);
    if(undo.length>30)undo.shift();
    redo=[];
    initialDemo=false;
    activeHistory=-1;
    mark();
    updateUndo()
  }
  function restore(s){
    state=M.validate(s.state);
    selected=state.layers.some(l=>l.id===s.selected)?s.selected:state.layers.at(-1)?.id||null;
    sync();
    requestRender()
  }
  function change(fn,keep=false){
    if(busy)return;
    const before=snapshot();
    fn();
    remember(before);
    sync();
    requestRender();
    if(keep)keepHistory();
    collect()
  }
  function runUndo(forward=false){
    if(busy)return;
    const source=forward?redo:undo,target=forward?undo:redo;
    if(!source.length)return;
    target.push(snapshot());
    restore(source.pop());
    mark();
    activeHistory=-1;
    updateUndo();
    renderHistory();
    collect()
  }
  function updateUndo(){
    $('undo').disabled=!undo.length||busy;
    $('redo').disabled=!redo.length||busy
  }
  function collect(){
    const ids=new Set(state.layers.map(l=>l.assetId));
    for(const snap of [...undo,...redo,...history.map(h=>h.snapshot)])for(const l of snap.state.layers)ids.add(l.assetId);
    assets.collect(ids);
    $('memoryLabel').textContent='≈ '+assets.estimatedMB()+' MB · local'
  }
  function fit(){
    const box=$('viewport'),w=canvas.width,h=canvas.height,z=$('viewZoom').value;
    const factor=z==='fit'?Math.max(.03,Math.min((box.clientWidth-44)/w,(box.clientHeight-24)/h)):Number(z);
    $('artboard').style.width=Math.round(w*factor)+'px';
    $('artboard').style.height=Math.round(h*factor)+'px'
  }
  function render(){
    raf=0;
    try{
      const [w,h]=M.dimensions(state,1000);
      if(canvas.width!==w||canvas.height!==h){
        canvas.width=w;
        canvas.height=h;
        fit()
      }
      renderer.render(canvas,state,id=>assets.preview(id));
      $('emptyCanvas').hidden=!!state.layers.length;
      const l=layer();
      $('canvasCaption').textContent=l?l.name+' · '+labels[l.blend]+' · '+Math.round(l.opacity*100)+'%'+(l.locked?' · BLOQUEADA':' · arrastra para mover'):'Carga imágenes para crear una composición';
    }catch(e){
      console.error(e);
      toast('No se pudo dibujar. Reduce las capas visibles o el desenfoque.')
    }
  }
  function requestRender(){
    if(!raf)raf=requestAnimationFrame(render)
  }
  function thumb(){
    render();
    const c=F.canvas(234,150),x=c.getContext('2d'),f=Math.max(c.width/canvas.width,c.height/canvas.height);
    x.fillStyle='#343b3b';
    x.fillRect(0,0,c.width,c.height);
    x.drawImage(canvas,(c.width-canvas.width*f)/2,(c.height-canvas.height*f)/2,canvas.width*f,canvas.height*f);
    return c.toDataURL('image/jpeg',.78)
  }
  function keepHistory(){
    if(!state.layers.length)return;
    if(history.length>=24){
      const i=history.findIndex(h=>!h.pinned);
      if(i<0){
        toast('Desfija una variación para guardar otra.');
        return
      }
      history.splice(i,1)
    }
    history.push({
      id:sequence++,snapshot:snapshot(),thumbnail:thumb(),pinned:false
    });
    activeHistory=history.length-1;
    renderHistory();
    collect()
  }
  function renderHistory(){
    const host=$('history');
    host.replaceChildren();
    history.forEach((h,i)=>{
      const card=document.createElement('div');
      card.className='history-card'+(i===activeHistory?' active':'');
      const b=document.createElement('button');
      b.className='history-image';
      b.title='Recuperar variación '+h.id;
      const img=document.createElement('img');
      img.src=h.thumbnail;
      img.alt='Variación '+h.id;
      b.append(img);
      b.onclick=()=>{
        if(busy)return;
        const before=snapshot();
        restore(h.snapshot);
        remember(before);
        activeHistory=i;
        renderHistory()
      };
      const pin=document.createElement('button');
      pin.className='pin';
      pin.title=h.pinned?'Desfijar variación':'Fijar variación';
      pin.setAttribute('aria-pressed',h.pinned);
      pin.innerHTML=icon('pin');
      pin.onclick=()=>{
        h.pinned=!h.pinned;
        renderHistory()
      };
      const n=document.createElement('span');
      n.className='history-number';
      n.textContent=String(h.id).padStart(2,'0');
      card.append(b,pin,n);
      host.append(card)
    });
    $('historyCount').textContent=history.length+' / 24'
  }
  function moveLayer(id,direction){
    const i=state.layers.findIndex(l=>l.id===id),j=i+direction;
    if(i<0||j<0||j>=state.layers.length)return;
    if(state.layers[i].locked||state.layers[j].locked){
      toast('Desbloquea las capas para cambiar su orden.');
      return
    }
    change(()=>[state.layers[i],state.layers[j]]=[state.layers[j],state.layers[i]])
  }
  function renderLayers(){
    const host=$('layers');
    host.replaceChildren();
    if(!state.layers.length){
      const empty=document.createElement('p');
      empty.className='empty-list';
      empty.textContent='Añade tus imágenes. Cada archivo se convierte en una capa independiente.';
      host.append(empty)
    }
    [...state.layers].reverse().forEach(l=>{
      const a=assets.items.get(l.assetId),row=document.createElement('div');
      row.className='layer-row'+(selected===l.id?' selected':'')+(!l.visible?' is-hidden':'');
      row.tabIndex=0;
      row.setAttribute('role','listitem');
      row.setAttribute('aria-label',l.name+(l.locked?', bloqueada':''));
      const img=document.createElement('img');
      img.src=a?.thumb||'';
      img.alt='';
      const text=document.createElement('div');
      text.className='layer-text';
      const name=document.createElement('b');
      name.textContent=l.name;
      const meta=document.createElement('small');
      meta.textContent=labels[l.blend]+' · '+Math.round(l.opacity*100)+'%';
      const actions=document.createElement('div');
      actions.className='row-actions';
      const buttons=[['eye',l.visible?'Ocultar capa':'Mostrar capa',()=>change(()=>l.visible=!l.visible),l.visible],['lock',l.locked?'Desbloquear capa':'Bloquear capa',()=>change(()=>l.locked=!l.locked),l.locked],['up','Subir capa',()=>moveLayer(l.id,1),false],['down','Bajar capa',()=>moveLayer(l.id,-1),false],['trash','Eliminar capa',()=>{
        if(l.locked)return toast('Desbloquea la capa para eliminarla.');
        change(()=>{
          state.layers=state.layers.filter(x=>x.id!==l.id);
          if(selected===l.id)selected=state.layers.at(-1)?.id||null
        })
      },false]];
      for(const [ic,title,fn,on]of buttons){
        const b=document.createElement('button');
        b.title=title;
        b.setAttribute('aria-label',title+' · '+l.name);
        if(ic==='eye'||ic==='lock')b.setAttribute('aria-pressed',on);
        b.className=(on?'on ':'')+(ic==='trash'?'delete':'');
        b.innerHTML=icon(ic);
        b.onclick=e=>{
          e.stopPropagation();
          fn()
        };
        actions.append(b)
      }
      text.append(name,meta,actions);
      row.append(img,text);
      row.onclick=()=>{
        if(busy)return;
        selected=l.id;
        sync();
        requestRender()
      };
      row.onkeydown=e=>{
        if((e.key==='Enter'||e.key===' ')&&e.target===row){
          e.preventDefault();
          row.click()
        }
      };
      host.append(row)
    });
    $('layerCount').textContent=state.layers.length+' capa'+(state.layers.length===1?'':'s');
  }
  function makeRange(id,label,parent,min,max,step,get,set,unit='',format=v=>String(v)){
    const row=document.createElement('div');
    row.className='range-row';
    row.innerHTML=`<label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}"><output id="${id}Value"></output>`;
    $(parent).append(row);
    let before=null;
    const syncValue=()=>{
      const value=get();
      $(id).value=value;
      $(id+'Value').textContent=format(value)+unit
    };
    controls.set(id,syncValue);
    $(id).addEventListener('pointerdown',()=>{
      if(!busy)before=snapshot()
    });
    $(id).addEventListener('keydown',()=>{
      if(!busy&&!before)before=snapshot()
    });
    $(id).oninput=()=>{
      if(busy)return;
      if(!before)before=snapshot();
      set(Number($(id).value));
      syncValue();
      mark();
      activeHistory=-1;
      requestRender()
    };
    $(id).onchange=()=>{
      if(before){
        remember(before);
        before=null;
        renderLayers();
        renderHistory();
        collect()
      }
    };
    syncValue()
  }
  function targetFilters(){
    return scope==='global'?state.global:layer()?.filters
  }
  function sync(){
    const l=layer();
    $('selectedName').textContent=l?.name||'Selecciona una capa';
    $('layerFields').disabled=!l||l.locked;
    $('lockedNotice').hidden=!l?.locked;
    $('duplicateLayer').disabled=!l;
    $('layerBlend').value=l?.blend||'normal';
    $('layerFit').value=l?.fit||state.defaultFit;
    $('filterFields').disabled=scope==='layer'&&(!l||l.locked);
    $('filterHint').textContent=scope==='global'?'Afecta a la composición completa, también a las capas bloqueadas.':'Ajustes de la capa seleccionada.';
    $('scopeLayer').classList.toggle('active',scope==='layer');
    $('scopeGlobal').classList.toggle('active',scope==='global');
    $('scopeLayer').setAttribute('aria-pressed',scope==='layer');
    $('scopeGlobal').setAttribute('aria-pressed',scope==='global');
    for(const fn of controls.values())fn();
    $('canvasDimensions').textContent=state.width+' × '+state.height;
    $('defaultFit').value=state.defaultFit;
    $('seed').value=state.seed;
    $$('[data-random]').forEach(x=>x.checked=state.randomize[x.dataset.random]);
    $('projectNameButton').textContent=state.name+(dirty?' •':'');
    for(const id of ['exportButton','saveProject','reblend','explore','keep','keepFooter'])$(id).disabled=!state.layers.length||busy;
    renderLayers();
    renderHistory();
    updateUndo();
    fit()
  }
  function remix(broad=true,chosenSeed=seed()){
    if(busy||!state.layers.length)return;
    if(!state.layers.some(l=>l.visible&&!l.locked))return toast('No hay capas visibles desbloqueadas para remezclar.');
    if(!Object.values(state.randomize).some(Boolean)||state.intensity===0)return toast('Activa una opción de exploración y aumenta la intensidad.');
    change(()=>state=M.remix(state,chosenSeed,broad),true)
  }
  function setBusy(title,text,canCancel=false){
    busy=true;
    cancelled=false;
    $('busyTitle').textContent=title;
    $('busyText').textContent=text;
    $('busyProgress').value=0;
    $('cancelImport').hidden=!canCancel;
    $('busy').hidden=false;
    updateUndo()
  }
  function progress(value,text){
    $('busyProgress').value=Math.round(value*100);
    if(text)$('busyText').textContent=text
  }
  function endBusy(){
    busy=false;
    $('busy').hidden=true;
    sync();
    requestRender();
    collect()
  }
  let inputQueue=Promise.resolve();
  function enqueue(fn){
    inputQueue=inputQueue.then(()=>guarded(fn));
    return inputQueue
  }
  async function guarded(fn){
    try{
      return await fn()
    }catch(e){
      console.error(e);
      toast(e.message||'No se pudo completar la operación.')
    }
  }
  async function importFiles(files,{
    demo=false
  }
  ={
  }){
    if(busy)return;
    const list=[...files].filter(F.supported);
    if(!list.length)return toast('No se encontraron imágenes compatibles.');
    const before=snapshot(),oldDemo=initialDemo;
    let added=0,errors=[];
    setBusy(demo?'Preparando el estudio':'Cargando imágenes','Cada imagen será una capa.',true);
    if(initialDemo&&!demo)state.layers=[];
    try{
      for(let i=0; i<list.length; i++){
        if(cancelled)break;
        const file=list[i];
        progress(i/list.length,(i+1)+' / '+list.length+' · '+file.name);
        await pause();
        try{
          const a=await assets.add(file,file.webkitRelativePath||file.name),l=M.layer(uid(),a.id,a.name,state.layers.length===0);
          l.fit=state.defaultFit;
          state.layers.push(l);
          selected=l.id;
          added++
        }catch(e){
          errors.push(file.name+': '+e.message)
        }
      }
      if(added){
        remember(before);
        keepHistory()
      }else{
        state=before.state;
        selected=before.selected;
        initialDemo=oldDemo
      }
      toast(added+' capa'+(added===1?' añadida':'s añadidas')+(cancelled?' · carga detenida':'')+(errors.length?' · '+errors.length+' archivo(s) omitidos. '+errors[0]:''))
    }finally{
      endBusy()
    }
  }
  async function demo(){
    if(busy)return;
    const before=snapshot();
    setBusy('Preparando el estudio','Ilustraciones demo locales');
    let added=0;
    try{
      for(const d of window.AISUNI_DEMOS){
        const response=await fetch(d.src),blob=await response.blob(),a=await assets.add(blob,d.name+'.svg'),l=M.layer(uid(),a.id,d.name,state.layers.length===0);
        l.fit='stretch';
        l.blend=['normal','screen','multiply','soft-light'][added];
        l.opacity=[1,.58,.76,.7][added];
        state.layers.push(l);
        selected=l.id;
        added++;
        progress(added/4)
      }
      remember(before);
      keepHistory()
    }finally{
      endBusy()
    }
  }
  function openCanvas(){
    const s=state;
    $('documentName').value=s.name;
    $('canvasWidth').value=s.width;
    $('canvasHeight').value=s.height;
    $('backgroundColor').value=s.background;
    $('transparent').checked=s.transparent;
    $('aspectPreset').value='custom';
    $('canvasDialog').showModal()
  }
  function applyCanvas(){
    const draft={
      ...state,name:$('documentName').value.trim()||'Estudio sin título',width:Number($('canvasWidth').value),height:Number($('canvasHeight').value),background:$('backgroundColor').value,transparent:$('transparent').checked
    };
    const valid=M.validate(draft);
    change(()=>state=valid);
    $('canvasDialog').close()
  }
  function openCrop(){
    const l=layer();
    if(!l||l.locked)return;
    cropEdit={
      id:l.id,crop:copy(l.crop)
    };
    $('cropZoom').value=cropEdit.crop.zoom;
    $('cropZoomValue').textContent=cropEdit.crop.zoom.toFixed(2)+'×';
    renderCrop();
    $('cropDialog').showModal()
  }
  function renderCrop(){
    if(!cropEdit)return;
    const l=state.layers.find(l=>l.id===cropEdit.id);
    if(!l)return;
    const c=$('cropCanvas'),[w,h]=M.dimensions(state,420);
    c.width=w;
    c.height=h;
    const x=c.getContext('2d');
    x.clearRect(0,0,w,h);
    R.drawLayer(x,assets.preview(l.assetId),{
      ...l,crop:cropEdit.crop,x:0,y:0,scale:1,rotation:0
    },w,h);
    $('cropZoomValue').textContent=cropEdit.crop.zoom.toFixed(2)+'×'
  }
  function exportInfo(){
    const format=$('exportFormat').value,edge=Number($('exportResolution').value),[w,h]=M.dimensions(state,edge);
    $('qualityRow').hidden=format!=='jpeg';
    $('exportInfo').textContent=w.toLocaleString('es')+' × '+h.toLocaleString('es')+' px · '+(format==='png'&&state.transparent?'fondo transparente':'fondo '+state.background);
    $('exportQualityValue').textContent=$('exportQuality').value+'%'
  }
  const safeName=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)||'Aisuni-Blend';
  async function exportImage(){
    if(busy)return;
    const current=copy(state),format=$('exportFormat').value,[w,h]=M.dimensions(current,Number($('exportResolution').value));
    $('exportDialog').close();
    setBusy('Renderizando la composición',w+' × '+h+' píxeles');
    let output,engine;
    try{
      await pause();
      output=F.canvas(w,h);
      engine=new R.Renderer;
      await engine.export(output,current,id=>assets.original(id),v=>progress(v*.85,'Combinando capas · '+Math.round(v*100)+'%'),format==='png'&&current.transparent);
      progress(.9,'Creando '+format.toUpperCase());
      await pause();
      const blob=await new Promise(r=>output.toBlob(r,'image/'+format,Number($('exportQuality').value)/100));
      if(!blob)throw Error('No se pudo exportar a esta resolución. Prueba 4K o 2K.');
      F.download(blob,safeName(current.name)+'-'+current.seed+'-'+w+'x'+h+(format==='jpeg'?'.jpg':'.png'));
      toast('Composición exportada.')
    }catch(e){
      throw Error(e.message||'No se pudo exportar. Prueba una resolución menor.')
    }finally{
      engine?.dispose();
      if(output){
        output.width=1;
        output.height=1
      }
      endBusy()
    }
  }
  async function saveProject(){
    if(busy)return;
    const current=copy(state);
    setBusy('Guardando proyecto','Incluyendo las imágenes originales…');
    try{
      await pause();
      const packed=await assets.pack(current.layers.map(l=>l.assetId));
      const blob=new Blob([JSON.stringify({
        format:'aisuni-blend-lab',version:1,state:current,assets:packed
      })],{
        type:'application/json'
      });
      F.download(blob,safeName(current.name)+'.blendlab');
      dirty=false;
      toast('Proyecto guardado con sus imágenes.')
    }finally{
      endBusy()
    }
  }
  async function openProject(file){
    if(busy||!file)return;
    if(file.size>512*1024*1024)throw Error('El proyecto supera el límite de lectura de 512 MB. Divide el trabajo en proyectos más pequeños.');
    setBusy('Abriendo proyecto','Leyendo las imágenes…');
    const before=snapshot();
    try{
      const data=JSON.parse(await file.text());
      if(data.format!=='aisuni-blend-lab'||data.version!==1)throw Error('Este archivo no es un proyecto de Blend Lab.');
      const draft=M.validate(data.state);
      if(!Array.isArray(data.assets))throw Error('Faltan las imágenes del proyecto.');
      const ids=new Set(data.assets.map(a=>a.id));
      if(draft.layers.some(l=>!ids.has(l.assetId)))throw Error('El proyecto contiene capas sin imagen.');
      const map=await assets.unpack(data.assets,v=>progress(v));
      draft.layers.forEach(l=>l.assetId=map.get(l.assetId));
      state=draft;
      selected=state.layers.at(-1)?.id||null;
      remember(before);
      dirty=false;
      initialDemo=false;
      keepHistory();
      toast('Proyecto abierto.')
    }finally{
      endBusy()
    }
  }
  function bind(){
    makeRange('opacity','Opacidad','opacityControl',0,100,1,()=>Math.round((layer()?.opacity??1)*100),v=>{
      if(layer()&&!layer().locked)layer().opacity=v/100
    },'%');
    const transform=[['positionX','Posición X','x',-100,100,1,100,'%'],['positionY','Posición Y','y',-100,100,1,100,'%'],['scale','Escala','scale',10,400,1,100,'%'],['rotation','Rotación','rotation',0,360,1,1,'°']];
    for(const [id,label,key,min,max,step,mult,unit]of transform)makeRange(id,label,'transformControls',min,max,step,()=>Math.round((layer()?.[key]??(key==='scale'?1:0))*mult),v=>{
      if(layer()&&!layer().locked)layer()[key]=v/mult
    },unit);
    for(const [key,label,min,max,unit]of [['brightness','Brillo',0,200,'%'],['contrast','Contraste',0,200,'%'],['saturation','Saturación',0,200,'%'],['blur','Desenfoque',0,30,'']])makeRange(key,label,'filterControls',min,max,1,()=>targetFilters()?.[key]??(key==='blur'?0:100),v=>{
      const f=targetFilters();
      if(f&&(scope==='global'||!layer()?.locked))f[key]=v
    },unit);
    makeRange('intensity','Intensidad','intensityControl',0,100,1,()=>state.intensity,v=>state.intensity=v,'%');
    const cropRow=document.createElement('div');
    cropRow.className='range-row';
    cropRow.innerHTML='<label for="cropZoom">Acercamiento</label><input id="cropZoom" type="range" min="1" max="5" step="0.01" value="1"><output id="cropZoomValue">1.00×</output>';
    $('cropControls').append(cropRow);
    $('addImages').onclick=$('emptyUpload').onclick=()=>{
      if(!busy)$('fileInput').click()
    };
    $('addFolder').onclick=()=>{
      if(!busy)$('folderInput').click()
    };
    $('fileInput').onchange=()=>{
      const files=[...$('fileInput').files];
      $('fileInput').value='';
      enqueue(()=>importFiles(files))
    };
    $('folderInput').onchange=()=>{
      const files=[...$('folderInput').files].sort((a,b)=>(a.webkitRelativePath||a.name).localeCompare(b.webkitRelativePath||b.name,undefined,{
        numeric:true
      }));
      $('folderInput').value='';
      enqueue(()=>importFiles(files))
    };
    $('dropzone').onclick=()=>$('addImages').click();
    $('dropzone').onkeydown=e=>{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        $('addImages').click()
      }
    };
    for(const id of ['dropzone','viewport']){
      const host=$(id);
      host.addEventListener('dragover',e=>{
        e.preventDefault();
        host.classList.add('dragover')
      });
      host.addEventListener('dragleave',()=>host.classList.remove('dragover'));
      host.addEventListener('drop',e=>{
        e.preventDefault();
        e.stopPropagation();
        host.classList.remove('dragover');
        if(!busy){
          const promise=F.dropped(e.dataTransfer);
          enqueue(async()=>importFiles(await promise))
        }
      })
    }
    document.addEventListener('dragover',e=>e.preventDefault());
    document.addEventListener('drop',e=>e.preventDefault());
    $('defaultFit').onchange=()=>change(()=>state.defaultFit=$('defaultFit').value);
    $('fitAll').onclick=()=>change(()=>{
      for(const l of state.layers)if(!l.locked)Object.assign(l,{
        fit:state.defaultFit,x:0,y:0,scale:1,rotation:0
      })
    });
    $('clearButton').onclick=()=>{
      if(!state.layers.some(l=>!l.locked))return toast('Todas las capas están bloqueadas.');
      change(()=>{
        state.layers=state.layers.filter(l=>l.locked);
        selected=state.layers.at(-1)?.id||null
      })
    };
    $('demoButton').onclick=()=>guarded(demo);
    $('layerBlend').onchange=()=>{
      if(layer()&&!layer().locked)change(()=>layer().blend=$('layerBlend').value)
    };
    $('layerFit').onchange=()=>{
      if(layer()&&!layer().locked)change(()=>layer().fit=$('layerFit').value)
    };
    $('resetTransform').onclick=()=>{
      if(layer()&&!layer().locked)change(()=>Object.assign(layer(),{
        x:0,y:0,scale:1,rotation:0
      }))
    };
    $('duplicateLayer').onclick=()=>{
      const l=layer();
      if(!l)return;
      change(()=>{
        const c={
          ...copy(l),id:uid(),name:l.name+' · copia',locked:false
        };
        state.layers.splice(state.layers.indexOf(l)+1,0,c);
        selected=c.id
      })
    };
    $('scopeLayer').onclick=()=>{
      scope='layer';
      sync()
    };
    $('scopeGlobal').onclick=()=>{
      scope='global';
      sync()
    };
    $('resetFilters').onclick=()=>change(()=>{
      if(scope==='global')state.global=M.neutral();
      else if(layer()&&!layer().locked)layer().filters=M.neutral()
    });
    $$('[data-random]').forEach(input=>input.onchange=()=>change(()=>state.randomize[input.dataset.random]=input.checked));
    $('reblend').onclick=()=>remix(true);
    $('explore').onclick=()=>remix(false);
    $('applySeed').onclick=()=>{
      const v=Number($('seed').value);
      if(!Number.isInteger(v)||v<1||v>2147483647)return toast('Usa una semilla entre 1 y 2147483647.');
      remix(true,v)
    };
    $('keep').onclick=$('keepFooter').onclick=()=>{
      if(!busy)keepHistory()
    };
    $('undo').onclick=()=>runUndo();
    $('redo').onclick=()=>runUndo(true);
    $('viewZoom').onchange=fit;
    $('canvasSettings').onclick=$('projectNameButton').onclick=openCanvas;
    $('applyCanvas').onclick=()=>guarded(applyCanvas);
    $('aspectPreset').onchange=()=>{
      if($('aspectPreset').value==='custom')return;
      const [a,b]=$('aspectPreset').value.split(':').map(Number),edge=Math.max(Number($('canvasWidth').value)||1600,Number($('canvasHeight').value)||2000);
      if(a>=b){
        $('canvasWidth').value=edge;
        $('canvasHeight').value=Math.round(edge*b/a)
      }else{
        $('canvasWidth').value=Math.round(edge*a/b);
        $('canvasHeight').value=edge
      }
    };
    $('cropButton').onclick=openCrop;
    $('cropZoom').oninput=()=>{
      if(cropEdit){
        cropEdit.crop.zoom=Number($('cropZoom').value);
        renderCrop()
      }
    };
    $('resetCrop').onclick=()=>{
      if(cropEdit){
        cropEdit.crop={
          x:.5,y:.5,zoom:1
        };
        $('cropZoom').value=1;
        renderCrop()
      }
    };
    $('applyCrop').onclick=()=>{
      const l=state.layers.find(l=>l.id===cropEdit?.id);
      if(l&&!l.locked){
        change(()=>l.crop=copy(cropEdit.crop));
        $('cropDialog').close();
        cropEdit=null
      }
    };
    let cropDrag=null;
    $('cropCanvas').onpointerdown=e=>{
      if(!cropEdit)return;
      cropDrag={
        x:e.clientX,y:e.clientY,crop:copy(cropEdit.crop)
      };
      $('cropCanvas').setPointerCapture(e.pointerId)
    };
    $('cropCanvas').onpointermove=e=>{
      if(!cropDrag)return;
      const b=$('cropCanvas').getBoundingClientRect();
      cropEdit.crop.x=M.clamp(cropDrag.crop.x-(e.clientX-cropDrag.x)/b.width,0,1);
      cropEdit.crop.y=M.clamp(cropDrag.crop.y-(e.clientY-cropDrag.y)/b.height,0,1);
      renderCrop()
    };
    $('cropCanvas').onpointerup=$('cropCanvas').onpointercancel=()=>cropDrag=null;
    $('cropCanvas').onkeydown=e=>{
      const d={
        ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]
      }
      [e.key];
      if(d&&cropEdit){
        e.preventDefault();
        cropEdit.crop.x=M.clamp(cropEdit.crop.x+d[0],0,1);
        cropEdit.crop.y=M.clamp(cropEdit.crop.y+d[1],0,1);
        renderCrop()
      }
    };
    canvas.onpointerdown=e=>{
      const l=layer();
      if(!l||l.locked||!l.visible||busy)return;
      gesture={
        before:snapshot(),x:e.clientX,y:e.clientY,lx:l.x,ly:l.y,id:l.id,moved:false
      };
      canvas.setPointerCapture(e.pointerId)
    };
    canvas.onpointermove=e=>{
      if(!gesture)return;
      const l=state.layers.find(l=>l.id===gesture.id),b=canvas.getBoundingClientRect();
      if(!l)return;
      l.x=M.clamp(gesture.lx+(e.clientX-gesture.x)/b.width,-1,1);
      l.y=M.clamp(gesture.ly+(e.clientY-gesture.y)/b.height,-1,1);
      gesture.moved=true;
      controls.get('positionX')();
      controls.get('positionY')();
      requestRender()
    };
    canvas.onpointerup=canvas.onpointercancel=()=>{
      if(gesture?.moved){
        remember(gesture.before);
        renderHistory()
      }
      gesture=null
    };
    canvas.onkeydown=e=>{
      const d={
        ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]
      }
      [e.key],l=layer();
      if(d&&l&&!l.locked){
        e.preventDefault();
        change(()=>{
          l.x=M.clamp(l.x+d[0]*(e.shiftKey?.01:.001),-1,1);
          l.y=M.clamp(l.y+d[1]*(e.shiftKey?.01:.001),-1,1)
        })
      }
    };
    $('exportButton').onclick=()=>{
      exportInfo();
      $('exportDialog').showModal()
    };
    ['exportFormat','exportResolution','exportQuality'].forEach(id=>$(id).oninput=exportInfo);
    $('downloadExport').onclick=()=>guarded(exportImage);
    $('saveProject').onclick=()=>guarded(saveProject);
    $('openProject').onclick=()=>{
      if(!busy)$('projectInput').click()
    };
    $('projectInput').onchange=()=>{
      const file=$('projectInput').files[0];
      $('projectInput').value='';
      guarded(()=>openProject(file))
    };
    $('cancelImport').onclick=()=>cancelled=true;
    $('help').onclick=()=>$('helpDialog').showModal();
    $$('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
    $$('[data-pane]').filter(n=>n.tagName==='BUTTON').forEach(b=>b.onclick=()=>{
      document.body.dataset.pane=b.dataset.pane;
      $$('button[data-pane]').forEach(n=>n.classList.toggle('active',n===b));
      fit()
    });
    document.addEventListener('keydown',e=>{
      if(busy||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||$$('dialog[open]').length)return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
        e.preventDefault();
        runUndo(e.shiftKey)
      }else if(!(e.ctrlKey||e.metaKey||e.altKey)&&e.key.toLowerCase()==='e'){
        e.preventDefault();
        remix(false)
      }else if(e.code==='Space'&&e.target.tagName!=='BUTTON'){
        e.preventDefault();
        remix(true)
      }
    });
    window.addEventListener('beforeunload',e=>{
      if(dirty||busy){
        e.preventDefault();
        e.returnValue=''
      }
    });
    new ResizeObserver(fit).observe($('viewport'));
  }
  async function boot(){
    bind();
    sync();
    await demo();
    undo=[];
    redo=[];
    dirty=false;
    initialDemo=true;
    sync()
  }
  boot().catch(e=>{
    console.error(e);
    endBusy();
    toast('No se pudo iniciar la demo. Puedes cargar tus imágenes.');
  });
})();
