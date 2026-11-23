import {clamp,f,hash,lerp,smooth} from '../core/util';
import data from './alignment.json';
import {renderIllustratedScene} from './illustratedScenes';
import {renderAir,renderDepthBackdrop,renderForeground,sceneCamera} from './artDirection';

export type Scene=typeof data.scenes[number];
const TAU=Math.PI*2;
const polygon=(points:number[][])=>points.map(([x,y])=>`${f(x)},${f(y)}`).join(' ');
const grad=(id:string,colors:string[])=>`<linearGradient id="${id}" x2=".7" y2="1">${colors.map((c,i)=>`<stop offset="${i/(colors.length-1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const radial=(id:string,color:string,opacity=1)=>`<radialGradient id="${id}"><stop stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
const blendColor=(a:string,b:string,k:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-k)+parseInt(b.slice(i,i+2),16)*k).toString(16).padStart(2,'0')).join('');
function wave(y:number,t:number,color:string,amplitude:number,width:number,phase=0) {
 let path=`M-100 ${y}`;
 for(let x=-100;x<=width+100;x+=45)path+=`L${f(x)} ${f(y+Math.sin(x*.006+t*.012+phase)*amplitude+Math.sin(x*.012-t*.007)*amplitude*.3)}`;
 return `<path d="${path}V2400H-100Z" fill="${color}"/>`;
}
function orb(x:number,y:number,r:number,fill:string,lit=true) {
 return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"/>${lit?`<path d="M${f(x-r*.7)} ${f(y-r*.45)}A${r*.85} ${r*.85} 0 0 1 ${f(x+r*.35)} ${f(y-r*.8)}" fill="none" stroke="#fff6d8" stroke-width="${r*.025}" opacity=".6" stroke-linecap="round"/>`:''}`;
}
/** Layered water: transparent depth, a lit meniscus and moving surface reflections. */
function waterSurface(y:number,rx:number,ry:number,t:number,dark=false) {
 const key=`water-${Math.round(y)}-${rx}`;
 return `<defs><clipPath id="${key}"><ellipse cy="${f(y)}" rx="${rx}" ry="${ry}"/></clipPath></defs>
  <ellipse cy="${f(y+12)}" rx="${rx}" ry="${ry}" fill="${dark?'#03101e':'#0b3d52'}"/>
  <ellipse cy="${f(y)}" rx="${rx}" ry="${ry}" fill="url(#c-waterDepth)" opacity="${dark?.62:.95}"/>
  <g clip-path="url(#${key})" opacity="${dark?.38:.65}">
   <ellipse cx="${f(-rx*.18+Math.sin(t*.009)*20)}" cy="${f(y-ry*.2)}" rx="${rx*.65}" ry="${ry*.8}" fill="url(#c-waterReflection)"/>
   ${Array.from({length:15},(_,i)=>{const p=i/14,py=y-ry+p*ry*2,span=rx*Math.sqrt(Math.max(0,1-(p*2-1)**2))*.94;return `<path d="M${f(-span)} ${f(py)}Q${f(-span*.3)} ${f(py+Math.sin(t*.018+i)*5)} ${f(span*.25)} ${f(py-3)}T${f(span)} ${f(py)}" fill="none" stroke="#c6ebe4" stroke-width="${f(.6+p)}" opacity="${f(.12+hash(i)*.2)}"/>`;}).join('')}
  </g>
  <path d="M${-rx} ${f(y)}A${rx} ${ry} 0 0 1 ${rx} ${f(y)}" fill="none" stroke="#a9d4d0" stroke-width="1.3" opacity="${dark?.22:.5}"/>
  <path d="M${-rx} ${f(y+8)}A${rx} ${ry} 0 0 0 ${rx} ${f(y+8)}" fill="none" stroke="#103c50" stroke-width="2" opacity=".65"/>`;
}
function plant(x:number,y:number,scale:number,t:number,seed:number) {
 const growth=smooth((t-seed*9)/65),height=150*growth;
 const wind=Math.sin(t*.012+seed*1.9)*1.3+Math.sin(t*.021+seed*.6)*.45;
 let leaves='';
 for(let i=0;i<6;i++) {
  const side=i%2?1:-1,sy=-height*(.25+i*.12),length=(30+i*3)*growth;
  const lag=Math.sin(t*.017+seed*1.4+i*1.3)*2.4*growth;
  const bend=Math.sin(t*.012+seed+i*.7)*2;
  leaves+=`<g transform="translate(0 ${f(sy)}) rotate(${f(lag)})">
   <path d="M0 0Q${f(side*length*.48)} ${f(-length*.57+bend)} ${f(side*length*1.2)} ${f(-length*.3)}Q${f(side*length*.67)} 8 0 0Z" fill="url(#${i%2?'c-foliage':'c-foliageShade'})"/>
   <path d="M0 0Q${f(side*length*.54)} ${f(-length*.25)} ${f(side*length)} ${f(-length*.28)}" fill="none" stroke="#d9e8b3" stroke-width="1.15" opacity=".53"/>
  </g>`;
 }
 return `<g data-organic="plant" transform="translate(${x} ${y}) scale(${f(scale)})">
  <ellipse cy="5" rx="19" ry="4" fill="#0c2e30" opacity=".2"/>
  <g transform="rotate(${f(wind)})">
   <path d="M0 0Q${f(wind*1.5)} ${f(-height*.5)} 0 ${f(-height)}" stroke="#4f7e5c" stroke-width="5" stroke-linecap="round" fill="none"/>
   <path d="M-1 0Q${f(wind*.8)} ${f(-height*.5)} 0 ${f(-height)}" stroke="#c5d99d" stroke-width="1.2" opacity=".8" fill="none"/>
   ${leaves}
  </g>
 </g>`;
}
function fruitTree(x:number,y:number,size:number,t:number,growth:number) {
 const sway=Math.sin(t*.013+x)*1.7;
 const crown='M-130 -178C-148 -205 -125 -233 -99 -234C-104 -267 -65 -285 -35 -272C-15 -303 30 -295 47 -269C80 -283 114 -258 109 -234C149 -223 151 -181 124 -164C115 -131 72 -127 49 -140C17 -117 -24 -124 -43 -143C-78 -123 -119 -142 -130 -178Z';
 const detail=Array.from({length:24},(_,i)=>{const px=hash(i+14)*200-100,py=-245+hash(i+46)*85;return `<path d="M${f(px)} ${f(py)}q5 -5 11 -2" fill="none" stroke="${i%3?'#cee0aa':'#174c43'}" stroke-width="1.3" opacity=".22"/>`;}).join('');
 const fruits=Array.from({length:7},(_,i)=>`<path d="M${f(Math.sin(i*2.3)*85)} ${f(-184+Math.cos(i*1.8)*35)}v-5" stroke="#6c663f" stroke-width="1.2"/><circle cx="${f(Math.sin(i*2.3)*85)}" cy="${f(-180+Math.cos(i*1.8)*35)}" r="5.5" fill="url(#c-fruit)"/>`).join('');
 return `<g transform="translate(${x} ${y}) scale(${f(size*growth)})"><ellipse cy="6" rx="66" ry="15" fill="url(#c-contact)"/><path d="M-16 0Q-5 -85 -18 -170L-3 -180Q12 -82 20 0Z" fill="url(#c-bark)"/><path d="M1 -100L-58 -162 M-3 -135L52 -187" stroke="#977c57" stroke-width="10" fill="none" stroke-linecap="round"/><g transform="rotate(${f(sway)} 0 -120)"><path d="${crown}" fill="url(#c-foliageShade)"/><path d="${crown}" transform="translate(-7 -8) scale(.93 1)" fill="url(#c-foliage)"/><path d="M-112 -224Q-91 -247 -67 -244M-24 -270Q4 -285 30 -266" stroke="#d0dca0" stroke-width="2.2" opacity=".45" fill="none" stroke-linecap="round"/>${detail}${fruits}</g><path d="M-8 -8Q0 -90 -12 -150" stroke="#e2c995" stroke-width="1.5" fill="none" opacity=".6"/></g>`;
}
function fish(x:number,y:number,size:number,t:number,color:string) {
 const tail=Math.sin(t*.22+x)*10;
 return `<g transform="translate(${f(x)} ${f(y)}) scale(${size})"><path d="M-44 0L-80 ${f(-24+tail)}Q-65 0 -80 ${f(24+tail)}Z" fill="#438f9c"/><path d="M-53 0Q-12 -44 49 -9Q68 0 49 9Q-12 44 -53 0Z" fill="${color}"/><path d="M-30 0Q0 -24 40 -6" fill="none" stroke="#dbede0" stroke-width="2" opacity=".55"/><path d="M-6 -24l20 -16l10 20" fill="#83bdad"/><circle cx="38" cy="-6" r="4.5" fill="#102f42"/><circle cx="39" cy="-7" r="1.2" fill="#fff"/></g>`;
}
function bird(x:number,y:number,size:number,t:number,seed:number) {
 const flap=Math.sin(t*.17+seed),wing=24+flap*25;
 return `<g transform="translate(${f(x)} ${f(y)}) scale(${size})"><path d="M0 2Q-22 ${f(-wing)} -62 ${f(-wing*.8)}Q-34 ${f(10-wing*.25)} -8 12Q0 23 8 12Q34 ${f(10-wing*.25)} 62 ${f(-wing*.8)}Q22 ${f(-wing)} 0 2Z" fill="#e9e6d1"/><path d="M0 3l8 15l-8 -3l-8 3Z" fill="#8ba6a7"/><path d="M0 -2l5 7h-10Z" fill="#e0b46a"/></g>`;
}
/** Jointed limbs move in place: weight shifts, never a treadmill-like foot slide. */
/* Detailed humans and animals now live as editable React SVG groups in SceneCast.tsx. */
export const THEMES:Record<string,{top:string;bottom:string;accent:string}>={
 hook:{top:'#07101e',bottom:'#123244',accent:'#efbe71'},origin:{top:'#030810',bottom:'#102c3c',accent:'#9ac7d5'},
 light:{top:'#14283d',bottom:'#bc9766',accent:'#ffe9b2'},sky:{top:'#0d364c',bottom:'#418d98',accent:'#d0eee5'},
 land:{top:'#194454',bottom:'#588d83',accent:'#e7d0a0'},plants:{top:'#0d333d',bottom:'#477e69',accent:'#bfdb99'},
 cosmos:{top:'#070e25',bottom:'#26375d',accent:'#f3cd81'},life:{top:'#07374a',bottom:'#0e6f80',accent:'#a5e0cb'},
 animals:{top:'#253f45',bottom:'#9b956f',accent:'#e4c798'},humanity:{top:'#263846',bottom:'#9c8171',accent:'#ffe1b6'},
 stewardship:{top:'#1b3c46',bottom:'#739286',accent:'#e5d7ac'},good:{top:'#3d4356',bottom:'#be9773',accent:'#ffe6b7'},
 rest:{top:'#142239',bottom:'#6f7085',accent:'#e0d6c2'},eden:{top:'#081b2c',bottom:'#33594f',accent:'#c1d4a5'}
};

/** New visual system. None of the former seven SVG scenes is used here. */
export function renderWorld(frame:number,scene:Scene,width:number,height:number) {
 const newSets=new Set(['origin','sky','land','plants','life','eden']);
 if(newSets.has(scene.id)) {
  const treeWord=data.words.find(w=>w.text.startsWith('árboles'));
  const treesAt=treeWord?treeWord.startMs/1000*data.fps:scene.start+180;
  return renderIllustratedScene(scene.id,frame,scene.start,width,height,frame>=data.markers.birds,smooth((frame-treesAt+8)/45));
 }
 const vertical=height>width,t=frame-scene.start;
 const theme=THEMES[scene.id],unit=Math.min(width,height)/1080;
 const reframe=vertical||scene.id==='eden'?0:smooth((t-(scene.id==='hook'?220:130))/35);
 const centerX=width*(vertical?.5:lerp(.68,.5,reframe)),centerY=height*(vertical?.36:.43);
 const scale=(vertical?1.05:1)*unit*(1+reframe*.18);
 const shot=Math.floor(t/120); // Metadata only: never use hard cuts to animate the camera.
 const camera=sceneCamera(t,scene.end-scene.start,scene.id);
 const push=camera.scale;
 const cx=centerX+camera.x*unit,cy=centerY+camera.y*unit;
 const previousScene=data.scenes[Math.max(0,data.scenes.findIndex(s=>s.id===scene.id)-1)];
 const previousTheme=THEMES[previousScene.id],transition=smooth(t/12);
 const defs=`<defs>${grad('c-bg',[blendColor(previousTheme.top,theme.top,transition),blendColor(previousTheme.bottom,theme.bottom,transition)])}${radial('c-halo',theme.accent,.24)}${radial('c-flare','#fff2c7',.9)}${grad('c-sun',['#fff9d9','#f7c46e','#ae6e3f'])}${grad('c-moon',['#eef0da','#a3b2c5','#4e607d'])}${grad('c-water',['#7bb8b6','#195b70','#0b354c'])}${grad('c-land',['#b4bf94','#6d9c80','#305d61'])}${grad('c-animal',['#e0c299','#ab8f6e','#675e59'])}${grad('c-human',['#efdab8','#cfad8b','#8c7b6f'])}</defs>`;
 const materialDefs=`<defs>${grad('c-waterDepth',['#729fa6','#275e72','#082d43'])}${radial('c-waterReflection','#b5ddd1',.5)}${grad('c-foliage',['#c2d39b','#6d9d75','#346b57'])}${grad('c-foliageShade',['#6d9c74','#2e6a58','#164b45'])}${grad('c-bark',['#ddc39a','#ac8e65','#6e604e'])}${grad('c-fruit',['#fff0b0','#ddb369','#a97a3d'])}${radial('c-contact','#071e26',.5)}${grad('c-soil',['#a29a72','#6d7860','#354e4d'])}<linearGradient id="c-bottomShade" x2="0" y2="1"><stop offset=".55" stop-color="#071420" stop-opacity="0"/><stop offset="1" stop-color="#071420" stop-opacity=".32"/></linearGradient></defs>`;
 let objects='';
 if(scene.id==='hook') {
  const pulse=.5+.5*Math.sin(t*.025);
  objects=`<circle r="300" fill="none" stroke="#85a5b3" stroke-width="1.2" opacity=".3" stroke-dasharray="2 10"/>
   <ellipse rx="390" ry="150" fill="none" stroke="#d9bb83" stroke-width="2" transform="rotate(-22)" opacity=".5"/>
   <circle cx="-125" cy="-10" r="240" fill="url(#c-flare)" opacity="${f(.65+pulse*.15)}"/>
   <path d="M-125 -92L-113 -22L-43 -10L-113 2L-125 72L-137 2L-207 -10L-137 -22Z" fill="#fff3d5"/>
   <circle cx="180" cy="55" r="95" fill="none" stroke="#e4d6b3" stroke-width="2" stroke-dasharray="6 9" opacity=".55"/>
   <path d="M-4 -10Q78 -87 165 -28" fill="none" stroke="#d9bc7f" stroke-width="2" stroke-dasharray="6 8"/>
   <circle cx="${f(-125+Math.cos(t*.012)*125)}" cy="${f(-10+Math.sin(t*.012)*125)}" r="4" fill="#fff4d4"/>`;
 } else if(scene.id==='light') {
  const reveal=smooth((frame-data.markers.light)/28);
  objects=`<circle r="${f(6+reveal*570)}" fill="url(#c-flare)"/>
   ${Array.from({length:32},(_,i)=>{const a=i*TAU/32+t*.0008;return `<path d="M${f(Math.cos(a)*20)} ${f(Math.sin(a)*20)}L${f(Math.cos(a)*590)} ${f(Math.sin(a)*590)}" stroke="#ffefc0" stroke-width="${i%3?1:3}" opacity="${f(reveal*(i%3?.08:.18))}"/>`;}).join('')}
   ${reveal>.8?`<path d="M0 -255A255 255 0 0 1 0 255Z" fill="#09182d" opacity="${f(smooth((t-140)/60)*.7)}"/><circle r="255" fill="none" stroke="#ffecc2" stroke-width="1.4" opacity=".6"/>`:''}`;
 } else if(scene.id==='cosmos') {
  const orbit=t*.003;
  objects=`<ellipse rx="390" ry="180" fill="none" stroke="#9eacc8" stroke-width="1" opacity=".35" transform="rotate(-18)"/>
   <ellipse rx="260" ry="260" fill="none" stroke="#b5a889" stroke-width="1" opacity=".25"/>
   <circle cx="-155" cy="-30" r="260" fill="url(#c-flare)" opacity=".75"/>${orb(-155,-30,105,'url(#c-sun)')}
   ${orb(220,80,72,'url(#c-moon)')}
   ${Array.from({length:80},(_,i)=>{const x=hash(i+7)*950-475,y=hash(i+88)*700-350;return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1+hash(i)*2)}" fill="#f0ead1" opacity="${f(.3+Math.sin(t*.025+i)*.2)}"/>`;}).join('')}
   <circle cx="${f(Math.cos(orbit)*390)}" cy="${f(Math.sin(orbit)*180)}" r="6" fill="#f0c578"/>`;
 } else if(scene.id==='animals') {
  // Full-bleed meadow: ground now runs past all frame edges, not a rectangular floating patch.
  objects=`<path d="M-1700 181Q-900 100 -400 169Q-150 192 130 168T1700 148V1700H-1700Z" fill="url(#c-land)"/>
   <path d="M-1700 252Q-700 173 -260 214Q250 173 900 251T1700 235V1700H-1700Z" fill="#3d7266" opacity=".37"/>
   <path d="M-1450 201Q-410 145 620 193T1450 204" fill="none" stroke="#d1cba4" stroke-width="2" opacity=".24"/>
   <ellipse cx="-170" cy="203" rx="110" ry="14" fill="#112e2e" opacity=".23"/>
   <ellipse cx="172" cy="203" rx="88" ry="12" fill="#112e2e" opacity=".18"/>
   ${plant(-380,210,.83,t+300,7)}${plant(428,224,.9,t+300,8)}
   ${Array.from({length:11},(_,i)=>{
     const x=-710+hash(i+61)*1440,y=235+hash(i+75)*100;
     return `<path d="M${f(x)} ${f(y)}l-4 -${f(8+hash(i+19)*9)}M${f(x)} ${f(y)}l6 -${f(7+hash(i+10)*11)}" stroke="#bbcf9a" stroke-width="1.3" opacity=".4"/>`;
   }).join('')}`;
 } else if(scene.id==='humanity'||scene.id==='stewardship') {
  // A continuous valley lets the people inhabit an actual landscape, not a cut-off podium.
  objects=`<circle cy="-55" r="320" fill="url(#c-halo)" opacity=".76"/>
   <path d="M-1700 175Q-1050 123 -480 184Q30 112 500 163T1700 175V1700H-1700Z" fill="url(#c-land)"/>
   <path d="M-1700 254Q-900 165 -370 253Q240 201 790 263T1700 226V1700H-1700Z" fill="#47796c" opacity=".39"/>
   <path d="M-1100 194Q-250 155 600 198T1220 193" stroke="#e6d3aa" stroke-width="2.2" opacity=".26" fill="none"/>
   ${scene.id==='stewardship'?`${plant(-520,219,.98,t+200,1)}${plant(520,219,1.04,t+200,2)}`:''}
   ${Array.from({length:9},(_,i)=>{
    const x=-850+hash(i+31)*1800;
    return `<path d="M${f(x)} 285q-6 -13 -8 -18M${f(x)} 285q5 -15 14 -20" stroke="#b9cba1" stroke-width="1.5" opacity=".26" fill="none"/>`;
   }).join('')}`;
 } else if(scene.id==='good') {
  objects=`<circle r="310" fill="url(#c-flare)" opacity=".6"/>
   <path d="M-1550 185L-1060 130L-800 20L-520 182L-310 -8L-102 101L44 -71L190 96L347 17L610 151L950 -12L1550 180V1750H-1550Z" fill="url(#c-land)"/>
   <path d="M-1550 268Q-610 145 190 241T1550 255V1750H-1550Z" fill="#34675c" opacity=".5"/>
   ${plant(-180,180,.9,t+300,1)}${plant(240,150,.8,t+300,3)}
   ${bird(-30,-160,.7,t,5)}${bird(110,-190,.45,t,6)}`;
 } else if(scene.id==='rest') {
  objects=`<circle cy="-60" r="230" fill="url(#c-halo)" opacity=".6"/>${orb(100,-80,90,'url(#c-moon)')}
   <path d="M-470 170Q-230 -35 0 130T470 155V320H-470Z" fill="#344e61"/><path d="M-470 210Q-190 70 60 190T470 205V340H-470Z" fill="#1c394c"/>
   <path d="M-300 250Q-30 180 280 240" fill="none" stroke="#c4c8bf" stroke-width="1.5" opacity=".3"/>
   ${Array.from({length:24},(_,i)=>`<circle cx="${f(hash(i)*900-450)}" cy="${f(hash(i+100)*400-350)}" r="1.5" fill="#dee5da" opacity=".5"/>`).join('')}`;
 } else {objects='';}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-world="${scene.id}" data-shot="${shot}">
 ${defs}${materialDefs}
 <defs><radialGradient id="c-vignette"><stop offset=".3" stop-color="#020b15" stop-opacity="0"/><stop offset="1" stop-color="#020b15" stop-opacity=".55"/></radialGradient></defs>
 <rect width="${width}" height="${height}" fill="url(#c-bg)"/>
 ${renderDepthBackdrop(scene.id,width,height,frame,theme)}
 <ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(width*.58)}" ry="${f(height*.55)}" fill="url(#c-halo)" opacity=".8"/>
 <g opacity="${f(scene.start===0?1:transition)}" transform="translate(${f(cx)} ${f(cy)}) scale(${f(scale*push)}) rotate(${scene.id==='cosmos'?f(Math.sin(t*.001)*3):0})">${objects}</g>
 ${renderAir(scene.id,width,height,frame,theme)}
 ${renderForeground(scene.id,width,height,frame,theme)}
 <rect width="${width}" height="${height}" fill="url(#c-bottomShade)"/>
 <rect width="${width}" height="${height}" fill="url(#c-vignette)" opacity=".42"/>
 </svg>`;
}
