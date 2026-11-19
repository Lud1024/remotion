import {clamp,f,hash,lerp,smooth} from '../core/util';
import data from './alignment.json';
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
function animalLeg(hipX:number,t:number,seed:number,foreground:boolean) {
 const hip=Math.sin(t*.012+seed*1.8)*(foreground?1.8:1.05);
 const knee=Math.sin(t*.015+seed*2.4+1.3)*1.4;
 const fill=foreground?'#ac9173':'#796f67';
 return `<g transform="translate(${hipX} -96) rotate(${f(hip)})" opacity="${foreground?1:.73}">
  <path d="M0 0 Q${foreground?-5:3} 22 0 48" fill="none" stroke="${fill}" stroke-width="${foreground?17:14}" stroke-linecap="round"/>
  <g transform="translate(0 48) rotate(${f(knee)})">
   <path d="M0 0 Q${foreground?3:-3} 25 0 46" fill="none" stroke="${fill}" stroke-width="${foreground?13:11}" stroke-linecap="round"/>
   <path d="M-7 44Q7 42 17 47Q18 52 12 53H-9Z" fill="${foreground?'#5f625b':'#505c58'}"/>
  </g>
  <circle cy="48" r="5" fill="#c8b18f" opacity=".28"/>
 </g>`;
}
function animal(x:number,y:number,size:number,t:number,seed:number) {
 const breathe=Math.sin(t*.019+seed*2)*1.6;
 const weight=Math.sin(t*.008+seed*1.6)*1.1;
 const neck=Math.sin(t*.012+seed*1.3)*1.9;
 const tail=Math.sin(t*.028+seed*2.4)*7;
 const blink=Math.max(0,1-Math.abs(((t+seed*81)%127)-64)/3);
 return `<g data-organic="animal" transform="translate(${f(x)} ${f(y)}) scale(${f(size)})">
  <ellipse cy="8" rx="104" ry="15" fill="#061a21" opacity=".28"/>
  ${animalLeg(-58,t,seed+.5,false)}${animalLeg(42,t+16,seed+1.2,false)}
  <g transform="translate(0 ${f(breathe)}) rotate(${f(weight*.45)})">
   <path d="M-84 -127Q-110 ${f(-147+tail*.3)} ${f(-129+tail)} ${f(-151+tail)}" fill="none" stroke="#998165" stroke-width="6" stroke-linecap="round"/>
   <path d="M-88 -129Q-31 -169 61 -125L74 -91Q25 -56 -72 -90Z" fill="url(#c-animal)" stroke="#897b68" stroke-width="1.8"/>
   <path d="M-77 -125Q-19 -146 53 -119" stroke="#f4dbb5" stroke-width="3.6" fill="none" opacity=".55" stroke-linecap="round"/>
   <path d="M-48 -103Q8 -73 59 -103" stroke="#695f5c" stroke-width="1.8" fill="none" opacity=".28"/>
   <g transform="translate(58 -111) rotate(${f(neck)})">
    <path d="M-8 0Q12 -33 16 -93L39 -89L41 -12L16 18Z" fill="#af9274" stroke="#857361" stroke-width="1.7"/>
    <path d="M15 -89Q43 -108 58 -89L79 -76L70 -63L39 -64L22 -73Z" fill="#cbb08c"/>
    <path d="M30 -93l-9 -24l0 27 M46 -94l9 -24l7 25" fill="#d8c2a0"/>
    <path d="M24 -91Q38 -98 50 -86" stroke="#f3ddba" stroke-width="2" opacity=".75" fill="none"/>
    <ellipse cx="58" cy="-85" rx="4" ry="${f(3.1*(1-blink)+.4)}" fill="#203039"/>
    <path d="M68 -71q6 2 11 0" stroke="#63584e" stroke-width="1.4" fill="none"/>
   </g>
  </g>
  ${animalLeg(-49,t+10,seed+2,true)}${animalLeg(40,t+34,seed+3,true)}
 </g>`;
}
function human(x:number,y:number,size:number,feminine:boolean,t:number) {
 const seed=feminine?7:3;
 const breath=Math.sin(t*.018+seed)*1.6;
 const head=Math.sin(t*.012+seed*1.2)*1.3;
 const shoulderL=Math.sin(t*.013+seed)*2.4;
 const shoulderR=Math.sin(t*.012+seed+1.5)*2.1;
 const dress=feminine?'#e2c79f':'#a3c3ba';
 const sleeve=feminine?'#d3b489':'#83aaa6';
 return `<g data-organic="human" transform="translate(${f(x)} ${f(y)}) scale(${f(size)})">
  <ellipse cy="35" rx="29" ry="6" fill="#091d29" opacity=".22"/>
  <path d="M-14 -23L-16 30 M14 -23L16 30" stroke="#253c4a" stroke-width="15" stroke-linecap="round"/>
  <path d="M-24 29h21 M4 29h21" stroke="#c5ae88" stroke-width="5" stroke-linecap="round"/>
  <g transform="translate(0 ${f(breath)})">
   <path d="M-25 -111Q0 -124 25 -111L${feminine?46:28} -25Q0 -12 ${feminine?-46:-28} -25Z" fill="${dress}"/>
   <path d="M-21 -101Q-37 -75 -40 -42" fill="none" stroke="${sleeve}" stroke-width="12" stroke-linecap="round" transform="rotate(${f(shoulderL)} -21 -101)"/>
   <path d="M21 -101Q38 -75 39 -41" fill="none" stroke="${sleeve}" stroke-width="12" stroke-linecap="round" transform="rotate(${f(shoulderR)} 21 -101)"/>
   <path d="M-18 -110Q0 -120 19 -111" fill="none" stroke="#fff2d2" stroke-width="2.5" opacity=".45"/>
   <g transform="translate(0 -153) rotate(${f(head)})">
    <path d="M-11 23h22l4 20h-30Z" fill="#d8b993"/>
    <ellipse rx="24" ry="29" fill="url(#c-human)" stroke="#987b68" stroke-width=".9"/>
    <path d="M-22 -10Q-18 -39 6 -33Q28 -29 24 4L17 -10Q-7 -1 -22 -10Z" fill="#213749"/>
    <path d="M-13 -1h6 M8 -1h6" stroke="#4b4d50" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M-4 13Q0 16 4 13" stroke="#906d63" stroke-width="1.2" fill="none"/>
    <ellipse cx="-13" cy="9" rx="5" ry="3" fill="#da9f8b" opacity=".16"/>
   </g>
  </g>
 </g>`;
}
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
 } else if(scene.id==='origin') {
  objects=`${waterSurface(130,420,110,t,true)}
   <ellipse cx="${f(Math.sin(t*.009)*80)}" cy="35" rx="240" ry="42" fill="url(#c-halo)"/>
   <path d="M-240 -30Q-40 ${f(-85+Math.sin(t*.02)*12)} 240 -22" fill="none" stroke="#c8dbce" stroke-width="1.5" opacity=".35"/>`;
 } else if(scene.id==='light') {
  const reveal=smooth((frame-data.markers.light)/28);
  objects=`<circle r="${f(6+reveal*570)}" fill="url(#c-flare)"/>
   ${Array.from({length:32},(_,i)=>{const a=i*TAU/32+t*.0008;return `<path d="M${f(Math.cos(a)*20)} ${f(Math.sin(a)*20)}L${f(Math.cos(a)*590)} ${f(Math.sin(a)*590)}" stroke="#ffefc0" stroke-width="${i%3?1:3}" opacity="${f(reveal*(i%3?.08:.18))}"/>`;}).join('')}
   ${reveal>.8?`<path d="M0 -255A255 255 0 0 1 0 255Z" fill="#09182d" opacity="${f(smooth((t-140)/60)*.7)}"/><circle r="255" fill="none" stroke="#ffecc2" stroke-width="1.4" opacity=".6"/>`:''}`;
 } else if(scene.id==='sky') {
  const opening=smooth(t/100);
  objects=`<g opacity=".56">${waterSurface(-55-opening*160,450,105,t*.6)}</g>${waterSurface(100+opening*100,450,120,t)}
   <ellipse rx="390" ry="${f(40+opening*150)}" fill="url(#c-halo)"/>
   ${Array.from({length:5},(_,i)=>`<path d="M${-240+i*120} ${f(-35-opening*65)}q${f(Math.sin(t*.008+i)*12)} 65 0 125" stroke="#c5e5da" stroke-width="${12+i*3}" opacity=".025" fill="none"/>`).join('')}`;
 } else if(scene.id==='land'||scene.id==='plants') {
  const growth=scene.id==='land'?smooth(t/90):1;
  objects=`${waterSurface(185,490,140,t)}
   <path d="M-375 175Q-300 310 0 292Q300 297 370 175L355 216Q280 335 0 330Q-295 335 -363 215Z" fill="url(#c-soil)"/>
   <path d="M-375 175Q-320 ${f(150-growth*130)} -210 ${f(165-growth*210)}Q-45 ${f(140-growth*65)} 64 ${f(160-growth*200)}Q230 ${f(165-growth*120)} 370 175C360 223 180 290 -20 282C-215 289 -354 238 -375 175Z" fill="url(#c-land)"/>
   <path d="M-375 175Q-320 ${f(150-growth*130)} -210 ${f(165-growth*210)}Q-45 ${f(140-growth*65)} 64 ${f(160-growth*200)}Q230 ${f(165-growth*120)} 370 175" fill="none" stroke="#ebdfb9" stroke-width="2" opacity=".6"/>
   <path d="M-350 204Q-245 285 -20 282Q225 288 350 204" fill="none" stroke="#d8d6ad" stroke-width="1.8" opacity=".5"/>
   <path d="M-305 252Q-90 322 220 272M-270 272Q-80 322 155 297" fill="none" stroke="#243f43" stroke-width="1.5" opacity=".25"/>
   ${Array.from({length:18},(_,i)=>`<path d="M${f(-270+hash(i+3)*530)} ${f(130+hash(i+41)*90)}q9 -3 19 0" stroke="#cbd6a3" stroke-width="1.2" fill="none" opacity=".18"/>`).join('')}`;
  if(scene.id==='plants') {
   objects+=Array.from({length:11},(_,i)=>plant(-270+i*54,75+Math.sin(i*2)*45,.55+hash(i)*.65,t+40,i)).join('');
   const treeWord=data.words.find(w=>w.text.startsWith('árboles'));
   const treesAt=treeWord?treeWord.startMs/1000*data.fps:scene.start+180;
   const growth=smooth((frame-treesAt+8)/45);
   if(growth>0)objects+=fruitTree(-180,110,.9,t,growth)+fruitTree(170,130,1.15,t+30,growth);
  }
 } else if(scene.id==='cosmos') {
  const orbit=t*.003;
  objects=`<ellipse rx="390" ry="180" fill="none" stroke="#9eacc8" stroke-width="1" opacity=".35" transform="rotate(-18)"/>
   <ellipse rx="260" ry="260" fill="none" stroke="#b5a889" stroke-width="1" opacity=".25"/>
   <circle cx="-155" cy="-30" r="260" fill="url(#c-flare)" opacity=".75"/>${orb(-155,-30,105,'url(#c-sun)')}
   ${orb(220,80,72,'url(#c-moon)')}
   ${Array.from({length:80},(_,i)=>{const x=hash(i+7)*950-475,y=hash(i+88)*700-350;return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1+hash(i)*2)}" fill="#f0ead1" opacity="${f(.3+Math.sin(t*.025+i)*.2)}"/>`;}).join('')}
   <circle cx="${f(Math.cos(orbit)*390)}" cy="${f(Math.sin(orbit)*180)}" r="6" fill="#f0c578"/>`;
 } else if(scene.id==='life') {
  const birdsNow=frame>=data.markers.birds;
  objects=`<ellipse cy="80" rx="480" ry="280" fill="url(#c-water)" opacity=".65"/>
   ${Array.from({length:birdsNow?6:15},(_,i)=>fish(((hash(i)*900+t*(.9+hash(i+3)))%1000)-500,20+hash(i+50)*250,.4+hash(i+9)*.8,t,i%3?'#8fcec3':'#e4c189')).join('')}
   ${birdsNow?Array.from({length:9},(_,i)=>bird(-330+i*85+Math.sin(t*.01)*30,-140-Math.sin(i*.9)*80,.5+hash(i)*.4,t,i)).join(''):''}
   <path d="M-420 -20Q0 -60 420 -20" stroke="#b0ddd0" stroke-width="2" opacity=".5" fill="none"/>`;
 } else if(scene.id==='animals') {
  objects=`<path d="M-520 270Q-240 85 0 175T530 265V370H-520Z" fill="url(#c-land)"/>
   <path d="M-450 194Q-240 123 -30 187T450 213" fill="none" stroke="#d9c9a2" stroke-width="2" opacity=".38"/>
   <ellipse cx="-160" cy="193" rx="136" ry="20" fill="#0d3035" opacity=".25"/>
   <ellipse cx="170" cy="188" rx="88" ry="12" fill="#0d3035" opacity=".22"/>
   ${animal(-160,185,1.2,t,0)}${animal(170,180,.82,t,1)}${animal(310,205,.55,t,2)}
   ${plant(-350,205,.65,t+300,7)}${plant(390,200,.8,t+300,8)}`;
 } else if(scene.id==='humanity'||scene.id==='stewardship') {
  objects=`<circle cy="-40" r="290" fill="url(#c-halo)" opacity=".8"/>
   <path d="M-440 310Q-200 170 0 190T440 292V370H-440Z" fill="url(#c-land)"/>
   <path d="M-310 219Q0 130 305 220" stroke="#e4d0aa" stroke-width="2" fill="none" opacity=".45"/>
   ${human(-85,190,1.75,false,t)}${human(90,190,1.75,true,t)}
   <ellipse cy="25" rx="340" ry="250" stroke="#dac59b" stroke-width="1" opacity=".22" fill="none" stroke-dasharray="4 9"/>
   ${scene.id==='stewardship'?`${plant(-300,225,.9,t+200,1)}${plant(300,225,1.1,t+200,2)}`:''}`;
 } else if(scene.id==='good') {
  objects=`<circle r="310" fill="url(#c-flare)" opacity=".6"/><ellipse cy="180" rx="390" ry="85" fill="#415e63"/>
   <path d="M-380 170L-210 -10L-80 100L40 -45L170 95L330 30L390 170Z" fill="url(#c-land)"/>
   ${plant(-180,180,.9,t+300,1)}${plant(240,150,.8,t+300,3)}
   ${human(20,135,.65,false,t)}${human(75,135,.65,true,t)}
   ${bird(-30,-160,.7,t,5)}${bird(110,-190,.45,t,6)}`;
 } else if(scene.id==='rest') {
  objects=`<circle cy="-60" r="230" fill="url(#c-halo)" opacity=".6"/>${orb(100,-80,90,'url(#c-moon)')}
   <path d="M-470 170Q-230 -35 0 130T470 155V320H-470Z" fill="#344e61"/><path d="M-470 210Q-190 70 60 190T470 205V340H-470Z" fill="#1c394c"/>
   <path d="M-300 250Q-30 180 280 240" fill="none" stroke="#c4c8bf" stroke-width="1.5" opacity=".3"/>
   ${Array.from({length:24},(_,i)=>`<circle cx="${f(hash(i)*900-450)}" cy="${f(hash(i+100)*400-350)}" r="1.5" fill="#dee5da" opacity=".5"/>`).join('')}`;
 } else {
  const opening=smooth((t-65)/110);
  objects=`<path d="M-260 260V-160Q0 -460 260 -160V260" fill="none" stroke="#a5baa0" stroke-width="9" opacity=".65"/>
   <path d="M-230 260V-150Q0 -420 230 -150V260Z" fill="#0b1c29"/>
   <g opacity="${f(opening)}"><ellipse cy="20" rx="230" ry="250" fill="url(#c-halo)"/>${plant(-110,240,1.1,t+100,3)}${plant(90,250,1.3,t+100,1)}<path d="M0 270Q-20 130 0 -50" fill="none" stroke="#b6b595" stroke-width="30" opacity=".4"/></g>
   <path d="M-280 275H280" stroke="#849f94" stroke-width="2"/>`;
 }
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
