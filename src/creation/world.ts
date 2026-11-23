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
/** Editorial character illustration: clothing drape, hands, hair, facial micro-expressions and weight. */
function human(x:number,y:number,size:number,feminine:boolean,t:number) {
 const seed=feminine?7:3;
 const breath=Math.sin(t*.017+seed)*1.4;
 const weight=Math.sin(t*.006+seed*.7)*1.5;
 const head=Math.sin(t*.012+seed*1.2)*1.3;
 const blink=Math.max(0,1-Math.abs(((t+seed*43)%151)-75)/3);
 const look=Math.sin(t*.009+seed)*1.4;
 const left=Math.sin(t*.012+seed)*2.4;
 const right=Math.sin(t*.011+seed+1.7)*2.1;
 const skin='#d6ae8c',skinDark='#aa7e65';
 const cloth=feminine?'#e5c99d':'#a5c6b9';
 const dark=feminine?'#a98661':'#537f77';
 const glow=feminine?'#f8e6c6':'#d7ece0';
 return `<g data-organic="human" data-detail="portrait" transform="translate(${f(x)} ${f(y)}) scale(${f(size)})">
  <ellipse cy="37" rx="39" ry="8" fill="#091d29" opacity=".23"/>
  <g transform="translate(${f(weight)} 0)">
   <path d="M-16 -31L-17 27M16 -31L16 27" stroke="#314d53" stroke-width="16" stroke-linecap="round"/>
   <path d="M-28 28Q-19 22 -8 27L-7 34L-29 34Z M7 27Q17 22 27 29V34H7Z" fill="#9f8667"/>
   <path d="M-27 33h19M8 33h18" fill="none" stroke="#eed5a9" stroke-width="2" opacity=".65"/>
   <g transform="translate(0 ${f(breath)})">
    <path d="M-20 -126Q-37 -121 -36 -106L-48 -49Q-27 -34 -16 -39L-10 -88Z" fill="${dark}" opacity=".82"/>
    <path d="M19 -125Q37 -120 35 -106L48 -49Q28 -34 16 -39L9 -89Z" fill="${dark}" opacity=".82"/>
    <path d="M-25 -116Q-38 -102 -34 -76L-40 -52Q-35 -46 -29 -51L-20 -74Z" fill="${cloth}" transform="rotate(${f(left)} -25 -116)"/>
    <path d="M25 -116Q39 -102 35 -77L41 -52Q37 -45 30 -50L21 -74Z" fill="${cloth}" transform="rotate(${f(right)} 25 -116)"/>
    <ellipse cx="-36" cy="-48" rx="7" ry="10" fill="${skin}"/>
    <ellipse cx="36" cy="-48" rx="7" ry="10" fill="${skin}"/>
    <path d="M-8 -139Q-26 -131 -28 -111Q-31 -78 -42 -27Q-2 -13 45 -27Q29 -79 28 -115Q22 -133 7 -139Z" fill="${cloth}" stroke="${dark}" stroke-width="1.4"/>
    <path d="M-8 -138Q-23 -119 -15 -78L-10 -31 M11 -137Q26 -119 23 -81L27 -32" stroke="${glow}" stroke-width="2.8" opacity=".42" fill="none"/>
    <path d="M-27 -57Q0 -49 30 -58" stroke="${dark}" stroke-width="5" fill="none" opacity=".58"/>
    <path d="M-28 -53Q0 -46 30 -54" stroke="${glow}" stroke-width="1.3" fill="none" opacity=".65"/>
    ${feminine?`<path d="M-7 -139Q-24 -123 -18 -107L-1 -86Q14 -108 17 -132" fill="#dcb888" opacity=".37"/>
      <path d="M-39 -30Q-6 -16 40 -28" stroke="#fff0cf" stroke-width="3" opacity=".45" fill="none"/>
      <path d="M-32 -99Q-38 -62 -38 -38 M29 -107Q33 -74 35 -39" stroke="#a47f59" stroke-width="1.4" opacity=".5" fill="none"/>`:`<path d="M-16 -135Q0 -119 16 -135" fill="none" stroke="#e9e1cf" stroke-width="5"/>
      <path d="M-32 -35Q-8 -28 35 -36" fill="none" stroke="#6e9f92" stroke-width="1.7" opacity=".55"/>`}
    <g transform="translate(0 -161) rotate(${f(head)})">
     ${feminine?`<path d="M-25 -12Q-37 -48 -15 -58Q18 -73 34 -36L27 26Q15 41 9 41L-19 30Q-32 13 -25 -12Z" fill="#302f38"/>`:''}
     <path d="M-10 22h20l3 25h-26Z" fill="${skin}"/>
     <ellipse cx="-22" cy="0" rx="5" ry="10" fill="${skinDark}"/>
     <ellipse cx="22" cy="0" rx="5" ry="10" fill="${skinDark}"/>
     <path d="M-22 -23Q-23 -39 0 -42Q26 -40 23 -16L23 15Q15 33 0 34Q-17 30 -23 15Z" fill="url(#c-human)" stroke="#af866d" stroke-width="1.2"/>
     <path d="M-20 -22Q-28 -48 -5 -53Q23 -55 29 -28L21 -12Q11 -25 8 -31Q-4 -17 -20 -22Z" fill="#30313a"/>
     ${feminine?`<path d="M-25 -25Q-34 -11 -29 13Q-26 27 -19 31L-18 10Q-23 -6 -18 -19 M22 -23Q32 -10 29 12Q26 30 19 33L21 11" fill="#302f38"/>`:`<path d="M-23 -16Q-13 -21 -7 -28Q6 -22 22 -22" stroke="#45434b" stroke-width="3.2" fill="none"/>`}
     <path d="M-16 -3q6 -4 12 -1M6 -4q5 -3 10 1" stroke="#554b48" stroke-width="1.7" fill="none" opacity=".8"/>
     <g transform="translate(${f(look)} 0)">
      <ellipse cx="-10" cy="2" rx="3.2" ry="${f(2.7*(1-blink)+.15)}" fill="#453b37"/>
      <ellipse cx="10" cy="2" rx="3.2" ry="${f(2.7*(1-blink)+.15)}" fill="#453b37"/>
      <circle cx="-9.3" cy="1.4" r=".8" fill="#fff9e8" opacity=".9"/>
      <circle cx="10.7" cy="1.4" r=".8" fill="#fff9e8" opacity=".9"/>
     </g>
     <path d="M0 2l-3 9q3 2 6 0" stroke="#9d7969" stroke-width="1.15" fill="none" opacity=".75"/>
     <path d="M-7 18Q0 21 7 18" stroke="#a46f67" stroke-width="1.7" fill="none" stroke-linecap="round"/>
     <ellipse cx="-15" cy="13" rx="6.3" ry="3.2" fill="#d99185" opacity=".17"/>
     <ellipse cx="15" cy="13" rx="6.3" ry="3.2" fill="#d99185" opacity=".17"/>
     <path d="M-18 -28Q-2 -44 16 -30" stroke="#79716a" opacity=".3" stroke-width="2" fill="none"/>
    </g>
    <path d="M-19 -118Q-4 -112 13 -119" stroke="${glow}" stroke-width="1.8" opacity=".4" fill="none"/>
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
   ${animal(-170,190,1.2,t,0)}${animal(172,183,.86,t,1)}${animal(342,205,.59,t,2)}
   ${plant(-380,210,.83,t+300,7)}${plant(428,224,.9,t+300,8)}
   ${Array.from({length:11},(_,i)=>{
     const x=-710+hash(i+61)*1440,y=235+hash(i+75)*100;
     return `<path d="M${f(x)} ${f(y)}l-4 -${f(8+hash(i+19)*9)}M${f(x)} ${f(y)}l6 -${f(7+hash(i+10)*11)}" stroke="#bbcf9a" stroke-width="1.3" opacity=".4"/>`;
   }).join('')}`;
 } else if(scene.id==='humanity'||scene.id==='stewardship') {
  const personScale=vertical?1.8:2.3;
  // A continuous valley lets the people inhabit an actual landscape, not a cut-off podium.
  objects=`<circle cy="-55" r="320" fill="url(#c-halo)" opacity=".76"/>
   <path d="M-1700 175Q-1050 123 -480 184Q30 112 500 163T1700 175V1700H-1700Z" fill="url(#c-land)"/>
   <path d="M-1700 254Q-900 165 -370 253Q240 201 790 263T1700 226V1700H-1700Z" fill="#47796c" opacity=".39"/>
   <path d="M-1100 194Q-250 155 600 198T1220 193" stroke="#e6d3aa" stroke-width="2.2" opacity=".26" fill="none"/>
   ${human(-121,192,personScale,false,t)}${human(122,192,personScale,true,t)}
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
   ${human(20,135,.65,false,t)}${human(75,135,.65,true,t)}
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
