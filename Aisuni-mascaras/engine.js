/* Original parametric SVG mask generator. No AI service, assets or network required. */
'use strict';
const MaskEngine=(()=>{
 const palettes=[['#f0efec','#12346b','#e71d2b','#f6f5f2'],['#eee9db','#20201e','#dc6429','#ebe5d9'],['#f2efe4','#194ec7','#e9b526','#f3eee2'],['#e9e9df','#214b43','#b92c37','#eae6dd'],['#eae2d9','#4b205e','#e86481','#eee7e0'],['#eeeeea','#151d23','#2788a3','#e6eceb']];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
 function generate(seed,options={},previous=null){const r=rng(seed),pick=(a,b)=>a+r()*(b-a),v=(options.diversity??90)/100,shapeR=rng(seed+3271),j=()=>shapeR()*2-1;
  let m={seed,locked:false,shape:{w:220+j()*110*v,h:245+j()*105*v,chin:pick(.25,.9),temple:pick(.7,1.13),lobes:Array.from({length:12},()=>j()*.12*v),asym:(options.asymmetry??20)/100},append:{count:Math.floor(pick(0,4.99)),length:pick(50,230),spread:pick(-.6,1.1),curve:pick(-1,1),width:pick(30,100),curl:pick(0,1)},eyes:{width:pick(50,95),height:pick(16,50),tilt:pick(-28,23),gap:pick(.38,.62),iris:pick(0,1),offset:j()*20},nose:{length:pick(40,175),width:pick(18,65),round:pick(0,1),mouth:pick(10,62)},marks:{count:Math.floor(pick(1,5.99)),sweep:pick(.25,1),crest:Math.floor(pick(0,5)),size:pick(18,64)},colors:[...palettes[Math.floor(r()*palettes.length)]],finish:{grain:options.grain??28,paper:options.paper??22,relief:options.relief??65},halo:r()>.65};
  m.shape.skull=pick(0,1);m.append.profile=Math.floor(pick(0,5));m.eyes.profile=Math.floor(pick(0,4));m.nose.profile=Math.floor(pick(0,4));m.marks.profile=Math.floor(pick(0,4));
  {const sr=rng(seed+5738);m.sculpt={depth:45+sr()*45,cheeks:20+sr()*65,brow:20+sr()*65,expression:sr()*100,roughness:48+sr()*32,glaze:8+sr()*23,irregularity:15+sr()*30}};
  if(previous){for(const key of options.locks||[])if(key in m)m[key]=JSON.parse(JSON.stringify(previous[key]));if(options.randomColors===false)m.colors=[...previous.colors]}
  return m;
 }
 function path(points){let d='';for(let i=0;i<points.length;i++){const p0=points[(i-1+points.length)%points.length],p1=points[i],p2=points[(i+1)%points.length],p3=points[(i+2)%points.length];if(!i)d=`M${p1[0]},${p1[1]}`;d+=`C${p1[0]+(p2[0]-p0[0])/6},${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6},${p2[1]-(p3[1]-p1[1])/6} ${p2[0]},${p2[1]}`}return d+'Z'}
 function svg(m,{size=1000,transparent=false,id='mask',texture=true}={}){
 const {shape:s,append:a,eyes:e,nose:n,marks:k,finish:f}=m,[base,ink,accent,bg]=m.colors,w=s.w,h=s.h,R=f.relief/100,uid=id.replace(/[^a-zA-Z0-9_-]/g,''),u=x=>uid+'-'+x,ref=x=>'url(#'+u(x)+')';
 const r=rng(m.seed+97431), rand=(lo,hi)=>lo+r()*(hi-lo), F={skull:s.skull??rand(0,1),append:a.profile??Math.floor(rand(0,5)),eye:e.profile??Math.floor(rand(0,4)),muzzle:n.profile??Math.floor(rand(0,4)),paint:k.profile??Math.floor(rand(0,4))};
 const tint=(hex,factor)=>{const cs=hex.slice(1).match(/../g).map(x=>parseInt(x,16));return '#'+cs.map(c=>Math.round(factor>1?c+(255-c)*(factor-1):c*factor).toString(16).padStart(2,'0')).join('')};
 let defs='';
 const radial=(name,color,cx='36%',cy='27%',edge=.55)=>{defs+=`<radialGradient id="${u(name)}" cx="${cx}" cy="${cy}" r="74%"><stop offset="0" stop-color="${tint(color,1+.25*R)}"/><stop offset=".45" stop-color="${color}"/><stop offset=".75" stop-color="${tint(color,1-(1-edge)*R*.35)}"/><stop offset="1" stop-color="${tint(color,1-(1-edge)*R)}"/></radialGradient>`};
 radial('ceramic',base,'36%','25%',.44);radial('paint',ink,'30%','20%',.35);radial('red',accent,'30%','20%',.53);radial('muzzle',base,'38%','24%',.55);radial('iris',ink,'38%','28%',.15);
 defs+=`<radialGradient id="${u('light')}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff" stop-opacity="${R*.38}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><radialGradient id="${u('dark')}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#161926" stop-opacity="${R*.42}"/><stop offset="1" stop-color="#161926" stop-opacity="0"/></radialGradient><linearGradient id="${u('ridge')}" x1="0" x2="1" y2=".1"><stop offset="0" stop-color="#151822" stop-opacity="${R*.28}"/><stop offset=".3" stop-color="#ffffff" stop-opacity="${R*.38}"/><stop offset=".52" stop-color="#ffffff" stop-opacity="${R*.18}"/><stop offset="1" stop-color="#181822" stop-opacity="${R*.45}"/></linearGradient><linearGradient id="${u('surface')}" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="${R*.22}"/><stop offset=".4" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#111520" stop-opacity="${R*.24}"/></linearGradient>`;
 for(const [name,blur,dx,dy,opacity] of [['shadow',9,4,12,.23],['small',3,2,5,.42]])defs+=`<filter id="${u(name)}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="${blur*R+.01}"/><feOffset dx="${dx*R}" dy="${dy*R}"/><feComponentTransfer><feFuncA type="linear" slope="${opacity*R}"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
 defs+=`<filter id="${u('texture')}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="3" seed="${m.seed%9999}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="${f.grain*.0045}"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="soft-light" result="grain"/><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="${(m.seed+71)%9999}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="${f.paper*.0018}"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="grain" mode="soft-light"/></filter>`;
 const P=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
 const E=(cx,cy,rx,ry,fill,extra='')=>P(`M${cx-rx},${cy} A${rx},${ry} 0 1 0 ${cx+rx},${cy} A${rx},${ry} 0 1 0 ${cx-rx},${cy}Z`,fill,extra);
 // Continuous skull morph: broad foreheads, pinched temples, full cheeks, narrow jaws.
 let pts=[];for(let i=0;i<24;i++){const angle=-Math.PI/2+i*Math.PI/12,yy=Math.sin(angle),xx=Math.cos(angle),j=i/2,li=Math.floor(j)%12,lj=(12-li)%12,noise=(s.lobes[li]*(1+s.asym)+s.lobes[lj]*(1-s.asym))*.5;const jaw=yy>.1?1-(1-s.chin)*Math.pow((yy-.1)/.9,.6+F.skull*1.5):s.temple;const cheek=1+Math.exp(-Math.pow((yy-.26)/.28,2))*(F.skull-.3)*.23;pts.push([xx*w*(1+noise)*jaw*cheek+yy*yy*s.asym*14,yy*h*(1+noise*.65)])}const face=path(pts);defs+=`<clipPath id="${u('face')}">${P(face,'white')}</clipPath>`;
 const top=-h*.7-(a.count?a.length*1.4:0)-30,bottom=h*1.18,ext=Math.max(w*1.25,a.count?w*.85+a.length*.75+a.width:0,m.halo?w+45:0),sc=Math.min(850/(bottom-top),850/(ext*2));
 let art=transparent?'':`<rect width="1000" height="1000" fill="${bg}"/>`;art+=`<g transform="translate(500 ${500-(top+bottom)*sc/2}) scale(${sc})">`;
 if(m.halo)art+=E(0,-h*.15,w+42,h*.95,accent);
 // Apéndices have independent profiles, with real inner rims and recessed color fields.
 for(const side of [-1,1])for(let i=0;i<a.count;i++){
 const kind=(F.append+i)%5,L=a.length*(1-i*.13),bw=a.width*(1-i*.1),x=w*(.64+i*.08),y=-h*(.57-i*.24),lean=a.spread*L*.6+a.curve*L*.25,as=1+side*s.asym*.22;
 let d;
 if(kind===0)d=`M${-bw*.55},35 C${-bw*1.3},${-L*.35} ${lean-bw*.5},${-L} ${lean},${-L*1.15} C${lean+bw*.5},${-L*1.08} ${bw*1.4},${-L*.1} ${bw*.4},40Z`;
 else if(kind===1)d=`M${-bw*.5},30 C${-bw},${-L*.5} ${lean+L*.75},${-L*.6} ${lean+L*.5},${-L*1.2} C${lean+L*1.2},${-L*.7} ${bw*.7},${-L*.24} ${bw*.55},40Z`;
 else if(kind===2)d=`M${-bw*.5},30 C${-L*.5},${-L*.8} ${L*.9+lean},${-L*1.4} ${L*.65+lean},${-L*.45} C${L*.4+lean},${-L*.05} ${-bw*.1},${-L*.2} ${bw*.4},${-L*.55} C${bw*.8},${-L*.12} ${L*.6+lean},${-L*.5} ${L*.32+lean},${-L*.66} C${bw*.2},${-L*.75} ${-bw*.25},${-L*.05} ${bw*.5},35Z`;
 else if(kind===3)d=`M${-bw*.6},35 C${-bw*1.6},${-L*.25} ${lean-bw*.8},${-L} ${lean},${-L} C${lean+bw*1.3},${-L} ${bw*1.6},${-L*.15} ${bw*.5},40Z`;
 else d=`M${-bw*.5},30 Q${-bw},${-L*.35} ${lean+L*.1},${-L} Q${lean+L*.3},${-L*.45} ${lean+L*.55},${-L*.65} Q${lean+L*.43},${-L*.1} ${bw*.5},40Z`;
 art+=`<g transform="scale(${side} 1) translate(${x} ${y}) rotate(${i*(8+a.curl*22)}) scale(1 ${as})" filter="${ref('small')}">${P(d,ref('ceramic'))}`;
 if(kind!==2)art+=`<g transform="translate(0 -8) scale(.73 .89)">${P(d,ref(i%2?'red':'paint'))}${P(d,ref('surface'))}</g>`;
 if(kind===0||kind===3)art+=P(`M0,${-L*.03} Q${bw*.7},${-L*.55} ${lean},${-L*.85} Q${lean-bw*.6},${-L*.4} 0,${-L*.03}Z`,ref('red'));
 art+='</g>';
 }
 art+=`<g filter="${ref('shadow')}">${P(face,ref('ceramic'))}</g><g clip-path="${ref('face')}">`;
 // Soft curved cheek/forehead volumes, painted ornaments remain under the lighting.
 for(const side of [-1,1]){
 art+=`<g transform="scale(${side} 1)">`;
 for(let j=0;j<k.count;j++){const yy=-h*.57+j*h*1.2/Math.max(1,k.count),col=j%2?ref('red'):ref('paint'),inner=w*(.25+.08*(j%2)),outer=w*.94,bend=40*k.sweep;
 if(F.paint===0||F.paint===3)art+=P(`M${inner},${yy+52} C${w*.5},${yy-25} ${outer},${yy+30} ${outer},${yy-78} C${w*.98},${yy-5-bend*.2} ${w*.65},${yy+20} ${inner+18},${yy+23} Q${inner+4},${yy+32} ${inner},${yy+52}Z`,col);
 else if(F.paint===1)art+=P(`M${w*.97},${yy-60} Q${w*.46},${yy-15} ${w*.32},${yy+52} Q${w*.68},${yy+6} ${w*.96},${yy+15}Z`,col);
 else art+=E(w*.76,yy,w*.12,30+k.size*.25,'none',`stroke="${j%2?accent:ink}" stroke-width="${8+k.size*.22}" transform="rotate(-22 ${w*.76} ${yy})"`);
 }
 art+=E(w*.68,h*.25,w*.36,h*.28,ref('light'));art+=E(w*.91,h*.08,w*.28,h*.72,ref('dark'));art+='</g>';
 }
 const cy=-h*.58;
 if(k.crest===0)art+=E(0,cy,k.size*.65,k.size*.65,ref('red'));
 if(k.crest===1)art+=P(`M0,${-h*.93} Q${k.size*1.4},${cy} 0,${-h*.25} Q${-k.size*1.4},${cy} 0,${-h*.93}Z`,ref('paint'))+E(0,-h*.25,k.size*.25,k.size*.25,accent);
 if(k.crest===2)art+=P(`M${-k.size},${cy+30} Q${-k.size*1.7},${cy-50} 0,${cy-80} Q${k.size*1.7},${cy-50} ${k.size},${cy+30} Q0,${cy} ${-k.size},${cy+30}Z`,ref('red'));
 if(k.crest===3)for(let j=0;j<3;j++)art+=E((j-1)*k.size*.8,cy+Math.abs(j-1)*18,k.size*.21,k.size*.42,ref(j%2?'red':'paint'));
 if(k.crest===4)art+=P(`M0,${-h*.9} L${k.size},${cy} 0,${cy+65} ${-k.size},${cy}Z`,ref('paint'));
 art+=E(-w*.14,-h*.55,w*.73,h*.53,ref('light'));
 // Recessed eyes: orbital shading, sculpted raised lids, cavity, colored globe and glint.
 for(const side of [-1,1]){
 const ex=side*w*e.gap,ey=-h*.07+(side===1?e.offset*s.asym:0),ew=Math.min(e.width,w*.43)*(F.eye===3?.84:1),eh=e.height*(F.eye===1?1.23:F.eye===2?.7:1),tilt=side*e.tilt+(F.eye===3?side*12:0);
 const eye=F.eye===1?`M${-ew},0 C${-ew},${-eh*1.35} ${ew},${-eh*1.35} ${ew},0 C${ew},${eh*1.3} ${-ew},${eh*1.3} ${-ew},0Z`:`M${-ew},0 C${-ew*.46},${-eh*1.8} ${ew*.44},${-eh*.85} ${ew},0 C${ew*.36},${eh*1.35} ${-ew*.46},${eh} ${-ew},0Z`;
 defs+=`<clipPath id="${u('eye'+side)}">${P(eye,'white')}</clipPath>`;
 art+=`<g transform="translate(${ex} ${ey}) rotate(${tilt})">`+E(0,6,ew*1.5,eh*2.7,ref('dark'));
 art+=P(eye,ref('ceramic'),`transform="scale(1.3 1.75)" filter="${ref('small')}"`)+P(eye,ref('paint'),`transform="scale(1.15 1.32)"`)+P(eye,tint(base,.83));
 art+=`<g clip-path="${ref('eye'+side)}">`+E(0,eh*.28,ew*.94,eh*1.15,ref('muzzle'));
 if(F.eye!==2)art+=E(side*ew*.08,0,Math.min(ew*.8,eh*(1+e.iris*.6)),eh*1.18,ref('iris'))+E(side*ew*.08,eh*.07,eh*.22,eh*.6,tint(ink,.28))+E(-eh*.25,-eh*.4,eh*.14,eh*.14,'#ffffff','opacity=".85"');
 else art+=E(0,0,ew*.85,eh*.9,ref('iris'));
 art+=E(0,-eh*.8,ew*1.3,eh*1.3,ref('dark'))+'</g>';
 art+=P(`M${-ew*1.17},${-eh*.25} Q0,${-eh*2.65} ${ew*1.16},${-eh*.12} Q0,${-eh*1.6} ${-ew*1.17},${-eh*.25}Z`,ref('ceramic'));
 art+='</g>';
 }
 // Raised bridge, separately modeled muzzle masses and an enamel nose.
 const tip=Math.min(h*.7,h*.12+n.length*.75),nw=n.width,bridge=`M0,${-h*.38} C${nw*.6},${-h*.1} ${nw*.7},${tip-30} ${nw},${tip} Q0,${tip+32} ${-nw},${tip} C${-nw*.7},${tip-30} ${-nw*.6},${-h*.1} 0,${-h*.38}Z`;
 art+=E(nw*.7,tip*.48,nw*1.4,tip*.92+15,ref('dark'))+P(bridge,base)+P(bridge,ref('ridge'));
 const muzzle=F.muzzle;
 if(muzzle===0||muzzle===3){const mx=Math.min(w*.38,nw*(.7+n.round*.8)*(muzzle===3?1.45:1)+20),my=Math.min(h*.81,tip+28);art+=E(0,my+20,mx*1.5,45,ref('dark'));for(const side of [-1,1])art+=E(side*mx*.59,my,mx,Math.min(66,h*.22),ref('muzzle'));art+=P(`M${-nw},${tip-12} C${-nw*1.2},${tip-45} ${nw*1.2},${tip-45} ${nw},${tip-12} Q${nw*.35},${tip+5} 0,${tip+32} Q${-nw*.35},${tip+5} ${-nw},${tip-12}Z`,ref('iris'),`filter="${ref('small')}"`);art+=E(-nw*.53,tip-5,nw*.2,5,tint(ink,.32))+E(nw*.53,tip-5,nw*.2,5,tint(ink,.32));art+=P(`M0,${tip+28}V${my+30} M${-mx*.7},${my+22}Q0,${my+44} ${mx*.7},${my+22}`,'none',`stroke="${tint(base,.5)}" stroke-width="3"`)}
 else if(muzzle===1){const beak=`M0,${-h*.08} Q${nw*1.8},${tip*.5} 0,${tip+65} Q${-nw*1.8},${tip*.5} 0,${-h*.08}Z`;art+=P(beak,ref('paint'),`filter="${ref('small')}"`)+P(`M0,${-h*.08}Q${nw*1.8},${tip*.5} 0,${tip+65}Z`,ref('surface'))+P(`M0,${-h*.06}Q${-nw*.3},${tip*.5} 0,${tip+55}`,'none',`stroke="${tint(ink,1.35)}" stroke-width="2"`)}
 else {art+=E(0,tip,nw*1.3,nw*.7,ref('muzzle'),`filter="${ref('small')}"`);for(const side of [-1,1])art+=E(side*nw*.65,tip+6,nw*.25,nw*.14,ref('paint'));const my=Math.min(h*.87,tip+65);art+=P(`M${-n.mouth},${my}Q0,${my-15} ${n.mouth},${my}Q0,${my+19} ${-n.mouth},${my}Z`,ref('red'))}
 art+=P(face,ref('surface'))+'</g></g>';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000" role="img" aria-label="Máscara generativa ${m.seed}"><title>Aisuni-Máscaras · ${m.seed}</title><defs>${defs}</defs><g${texture&&(f.grain||f.paper)?` filter="${ref('texture')}"`:''}>${art}</g></svg>`;
 }
 function validate(raw){if(!raw||!Number.isInteger(raw.seed))throw Error('Máscara inválida');const base=generate(raw.seed);const limits={shape:{w:[90,350],h:[100,370],chin:[.2,1],temple:[.5,1.3],asym:[0,1]},append:{count:[0,4],length:[20,260],spread:[-.8,1.2],curve:[-1,1],width:[20,110],curl:[0,1]},eyes:{width:[25,105],height:[8,60],tilt:[-40,40],gap:[.3,.65],iris:[0,1],offset:[-30,30]},nose:{length:[20,190],width:[10,80],round:[0,1],mouth:[5,75]},marks:{count:[0,6],sweep:[.1,1.2],crest:[0,4],size:[10,75]},finish:{grain:[0,100],paper:[0,100],relief:[0,100]}};for(const[group,keys]of Object.entries(limits))for(const[key,[a,b]]of Object.entries(keys)){const v=raw[group]?.[key];if(!Number.isFinite(v))throw Error('Parámetro inválido');base[group][key]=clamp(v,a,b)}if(!Array.isArray(raw.shape.lobes)||raw.shape.lobes.length!==12||!raw.shape.lobes.every(Number.isFinite))throw Error('Silueta inválida');base.shape.lobes=raw.shape.lobes.map(n=>clamp(n,-.2,.2));for(const key of ['count','crest'])if(!Number.isInteger(base.marks[key]))throw Error('Ornamento inválido');if(!Number.isInteger(base.append.count))throw Error('Apéndice inválido');if(!Array.isArray(raw.colors)||raw.colors.length!==4||!raw.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c)))throw Error('Color inválido');for(const [group,key,max] of [['shape','skull',1],['append','profile',4],['eyes','profile',3],['nose','profile',3],['marks','profile',3]]){if(raw[group][key]!==undefined){if(!Number.isFinite(raw[group][key])||(key==='profile'&&!Number.isInteger(raw[group][key])))throw Error('Perfil inválido');base[group][key]=clamp(raw[group][key],0,max)}}if(raw.sculpt!==undefined){for(const key of Object.keys(base.sculpt)){if(!Number.isFinite(raw.sculpt[key]))throw Error('Escultura inválida');base.sculpt[key]=clamp(raw.sculpt[key],0,100)}}base.colors=[...raw.colors];base.halo=!!raw.halo;base.locked=!!raw.locked;return base}
 function reference(){const m=generate(2846);Object.assign(m.shape,{w:235,h:250,chin:.62,temple:1,skull:.8,asym:.08,lobes:Array(12).fill(0)});Object.assign(m.append,{count:1,length:255,width:100,spread:.38,curve:.3,profile:0});Object.assign(m.eyes,{width:82,height:45,tilt:-17,gap:.53,iris:.7,profile:0});Object.assign(m.nose,{length:146,width:52,round:.85,profile:0});Object.assign(m.marks,{count:3,sweep:1,crest:1,size:43,profile:0});m.colors=[...palettes[0]];m.finish={grain:24,paper:18,relief:88};m.sculpt={depth:75,cheeks:70,brow:58,expression:35,roughness:62,glaze:23,irregularity:24};m.halo=true;return m}
 return{generate,svg,validate,palettes,reference};
})();
if(typeof module!=='undefined')module.exports=MaskEngine;
