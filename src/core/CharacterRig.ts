import {clamp,f,lerp} from './util.js';
import type {RigState} from './animator.js';

/**
 * SHALÓM narrator: ceramic faceplate, machined headset, woven navy jacket and articulated gloves.
 * Driven by a fully parametric RigState:
 *  - independent hierarchical arms (shoulder > elbow > wrist > hand with 5 articulated fingers)
 *  - eyelid-clipped eyes, 2 brows, parametric mouth with teeth / tongue / viseme shapes
 *  - head pivots on the neck, subtle yaw/pitch simulated by feature parallax (never a fake 3-D turn)
 *  - no SVG blur filters (all soft shadows are radial gradients) so each frame stays cheap in Chromium.
 * Local coordinates: (0,0) = floor between the feet, negative y is up.
 */
const C='shc';
const id=(name:string)=>`url(#${C}-${name})`;
export type CharacterLighting={key:string;fill:string;strength:number};
const DEFAULT_LIGHT:CharacterLighting={key:'#ffe2af',fill:'#80a9d5',strength:.24};

export const CHARACTER_DEFS=`<defs>
 <linearGradient id="${C}-helmet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5a7fb2"/><stop offset=".17" stop-color="#1f3f73"/><stop offset=".52" stop-color="#0b1c3c"/><stop offset=".84" stop-color="#142a54"/><stop offset="1" stop-color="#050f2c"/></linearGradient>
 <radialGradient id="${C}-helmetSpec" cx=".3" cy=".18" r=".55"><stop stop-color="#9db6e0" stop-opacity=".55"/><stop offset="1" stop-color="#9db6e0" stop-opacity="0"/></radialGradient>
 <radialGradient id="${C}-face" cx=".36" cy=".22" r=".9"><stop stop-color="#fffaf0"/><stop offset=".48" stop-color="#eee3d2"/><stop offset=".79" stop-color="#d6c7b6"/><stop offset="1" stop-color="#8a91a1"/></radialGradient>
 <linearGradient id="${C}-bevel" x1=".08" y1="0" x2=".84" y2="1"><stop stop-color="#e9f2f5"/><stop offset=".3" stop-color="#798fa9"/><stop offset=".65" stop-color="#263750"/><stop offset=".9" stop-color="#a3b4c7"/><stop offset="1" stop-color="#17233d"/></linearGradient>
 <radialGradient id="${C}-faceShade" cx=".5" cy=".42" r=".6"><stop offset=".58" stop-color="#4a5368" stop-opacity="0"/><stop offset="1" stop-color="#33465c" stop-opacity=".3"/></radialGradient>
 <linearGradient id="${C}-lens" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff" stop-opacity=".4"/><stop offset=".28" stop-color="#fff" stop-opacity=".05"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#8cbbdd" stop-opacity=".14"/></linearGradient>
 <pattern id="${C}-weave" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M-1 1l3 3 M1 -1l3 3" stroke="#9bb5d3" stroke-width=".4" opacity=".1"/><path d="M0 3L3 0" stroke="#020a18" stroke-width=".35" opacity=".08"/></pattern>
 <radialGradient id="${C}-eyeWhite" cx=".4" cy=".27" r=".9"><stop stop-color="#fff"/><stop offset=".66" stop-color="#fffaf4"/><stop offset="1" stop-color="#b5b7c7"/></radialGradient>
 <radialGradient id="${C}-iris" cx=".34" cy=".26" r=".75"><stop stop-color="#facb61"/><stop offset=".52" stop-color="#bb6c20"/><stop offset=".84" stop-color="#573016"/><stop offset="1" stop-color="#211624"/></radialGradient>
 <linearGradient id="${C}-hoodie" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4a6aa3"/><stop offset=".23" stop-color="#26437a"/><stop offset=".57" stop-color="#142b55"/><stop offset=".86" stop-color="#0b1b3e"/><stop offset="1" stop-color="#06122e"/></linearGradient>
 <linearGradient id="${C}-sleeve" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5476b0"/><stop offset=".28" stop-color="#2a4579"/><stop offset=".72" stop-color="#12264e"/><stop offset="1" stop-color="#081635"/></linearGradient>
 <linearGradient id="${C}-metal" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#f6f6ed"/><stop offset=".18" stop-color="#bfd0dc"/><stop offset=".35" stop-color="#536d87"/><stop offset=".46" stop-color="#e0e9ed"/><stop offset=".51" stop-color="#869caf"/><stop offset=".76" stop-color="#263951"/><stop offset="1" stop-color="#9eafbd"/></linearGradient>
 <linearGradient id="${C}-glove" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".43" stop-color="#f2ebe1"/><stop offset=".80" stop-color="#c9c7ca"/><stop offset="1" stop-color="#8892a4"/></linearGradient>
 <linearGradient id="${C}-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2a1"/><stop offset=".4" stop-color="#ffd351"/><stop offset=".75" stop-color="#f3a916"/><stop offset="1" stop-color="#a65a09"/></linearGradient>
 <linearGradient id="${C}-mouth" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#301522"/><stop offset=".62" stop-color="#33131c"/><stop offset="1" stop-color="#642e3b"/></linearGradient>
 <linearGradient id="${C}-trouser" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2a4a80"/><stop offset=".55" stop-color="#111f43"/><stop offset="1" stop-color="#09142f"/></linearGradient>
 <linearGradient id="${C}-shoe" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3a5883"/><stop offset=".55" stop-color="#172b50"/><stop offset="1" stop-color="#07132d"/></linearGradient>
 <linearGradient id="${C}-fold" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#a9c2ee" stop-opacity=".0"/><stop offset=".5" stop-color="#a9c2ee" stop-opacity=".34"/><stop offset="1" stop-color="#a9c2ee" stop-opacity="0"/></linearGradient>
 <radialGradient id="${C}-blush"><stop stop-color="#e68d80" stop-opacity=".34"/><stop offset="1" stop-color="#e68d80" stop-opacity="0"/></radialGradient>
 <radialGradient id="${C}-soft"><stop stop-color="#04102a" stop-opacity=".62"/><stop offset=".55" stop-color="#04102a" stop-opacity=".25"/><stop offset="1" stop-color="#04102a" stop-opacity="0"/></radialGradient>
 <radialGradient id="${C}-rim" cx=".85" cy=".3" r=".7"><stop stop-color="#8fd0ff" stop-opacity=".34"/><stop offset="1" stop-color="#8fd0ff" stop-opacity="0"/></radialGradient>
 <clipPath id="${C}-torsoClip"><path d="M-118 -226 Q-143 -205 -133 -131 Q-130 -54 -103 -29 Q-60 -8 0 -11 Q65 -7 105 -29 Q130 -62 134 -133 Q145 -209 116 -228 Q50 -254 -2 -256 Q-65 -253 -118 -226Z"/></clipPath>
</defs>`;

const lightning=(x:number,y:number,scale=1)=>`<path transform="translate(${x} ${y}) scale(${scale})" d="M7 -21 L-12 3 L2 3 L-3 25 L19 -7 L4 -6Z" fill="${id('gold')}" stroke="#edaa25" stroke-width="1.5" stroke-linejoin="round"/>`;
const fastener=(x:number,y:number,r=3)=>`<g transform="translate(${x} ${y})"><circle r="${r+1}" fill="#0b1629"/><circle r="${r}" fill="${id('metal')}"/><path d="M${-r*.46} 0h${r*.92}" stroke="#1b2a40" stroke-width="1"/><path d="M${-r*.5} ${-r*.52}h${r*.7}" stroke="#fff" stroke-width=".6" opacity=".7"/></g>`;

/* ------------------------------------- legs ---------------------------------------- */
const leg=(side:'left'|'right')=>{
 const s=side==='left'?-1:1;
 return `<g transform="translate(${s*58} -13)">
   <path d="M-37 -60 Q-42 -29 -31 6 L-34 25 Q-5 34 32 23 L31 -17 Q45 -47 30 -63Z" fill="${id('trouser')}" stroke="#0c1b3c" stroke-width="5"/>
   <path d="M${s*-30} -50 Q${s*-36} -20 ${s*-27} 6" fill="none" stroke="#6f90c6" stroke-width="5" opacity=".28" stroke-linecap="round"/>
   <path d="M${s===-1?-27:13} -34 H${s===-1?-5:35} v28 Q${s*12} 0 ${s*21} -3" fill="none" stroke="#426294" stroke-width="3" opacity=".7"/>
   <path d="M-34 9 Q-3 17 33 8" stroke="#3b4b70" stroke-width="9" fill="none"/>
   <path d="M-37 16 Q-50 20 -53 45 L-50 57 Q-5 69 44 55 Q54 51 50 40 L35 19 Q0 9 -37 16Z" fill="${id('shoe')}" stroke="#101b36" stroke-width="6"/>
   <path d="M-44 28 Q-30 22 -12 22" fill="none" stroke="#8eaad6" stroke-width="3" opacity=".5" stroke-linecap="round"/>
   <path d="M-50 46 Q0 62 51 43 L51 56 Q3 76 -50 56Z" fill="#f1ede5" stroke="#8796a3" stroke-width="3"/>
   <path d="M-23 27 L12 27 M-23 36 L13 36" fill="none" stroke="#a9bfcd" stroke-width="4" stroke-linecap="round"/>
   <path d="M25 48 L45 44" stroke="#facb57" stroke-width="6" stroke-linecap="round"/>
   <path d="M-47 56 Q0 67 50 54" fill="none" stroke="#7c8ca7" stroke-width="3"/>
   <path d="M-37 58v4 M-22 61v4 M-7 63v4 M9 63v4 M25 61v4 M39 57v4" stroke="#344259" stroke-width="2" opacity=".6"/>
   <path d="M-35 20Q-6 14 28 20L35 39Q3 50 -40 40Z" fill="${id('keyLight')}" opacity=".5"/>
 </g>`;
};

/* ------------------------------------- hands --------------------------------------- */
const FX=[-21,-7,7,21],FL=[33,40,37,29];
/** Palm faces the viewer; 4 fingers + a thumb, each with its own curl (0 extended … 1 folded) and spread. */
function hand(side:'left'|'right',fing:number[],spread:number):string{
 const s=side==='left'?-1:1;
 const xs=side==='left'?FX:FX.map(v=>-v);               // index finger next to the thumb side
 const behind:string[]=[],front:string[]=[],folded:{x:number;c:number;k:number}[]=[];
 for(let i=0;i<4;i++){
  const c=clamp(fing[i+1]),x=xs[i],k=(i-1.5);
  const ang=-Math.sign(x)*(.4+Math.abs(x)/21)*spread*10;       // tips move away from the hand's centre
  if(c<.55){
   const L=FL[i]*(1-.55*c)+4;
   behind.push(`<g transform="translate(${f(x)} 36) rotate(${f(ang)})">
     <rect x="-6.4" y="-4" width="12.8" height="${f(L+8)}" rx="6.4" fill="${id('glove')}" stroke="#24314b" stroke-width="2.8"/>
     <path d="M-5.2 ${f(L*.52)} H5.2" stroke="#8d96a8" stroke-width="1.6" opacity=".75"/>
     <path d="M-3.4 ${f(L+1)} V${f(L*.62)}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
   </g>`);
  }else folded.push({x,c,k});
 }
 // folded fingers are drawn as one fist-like bar (runs of adjacent folded fingers share an outline)
 if(folded.length){
  const x0=Math.min(...folded.map(q=>q.x))-7,x1=Math.max(...folded.map(q=>q.x))+7;
  const h=17+(1-Math.min(...folded.map(q=>q.c)))*10;
  front.push(`<g transform="translate(0 22)"><rect x="${f(x0)}" y="0" width="${f(x1-x0)}" height="${f(h)}" rx="7" fill="${id('glove')}" stroke="#24314b" stroke-width="2.8"/>
   ${folded.slice(1).map((q,j)=>`<path d="M${f((folded[j].x+q.x)/2)} 3 V${f(h-3)}" stroke="#8d96a8" stroke-width="1.8" stroke-linecap="round"/>`).join('')}
   <path d="M${f(x0+5)} ${f(h-5)} H${f(x1-5)}" stroke="#7f8aa0" stroke-width="2" stroke-linecap="round" opacity=".7"/>
   <path d="M${f(x0+5)} 4 H${f(x1-9)}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/></g>`);
 }
 const tc=clamp(fing[0]);
 const tAng=-s*lerp(52,-30,tc);                           // positive moves the tip toward −x
 const tL=lerp(34,22,tc);
 const thumb=`<g transform="translate(${s*25} 20) rotate(${f(tAng)})">
   <rect x="-8" y="-4" width="16" height="${f(tL+8)}" rx="8" fill="${id('glove')}" stroke="#26334e" stroke-width="2.8"/>
   <path d="M-6 ${f(tL*.5)} H6" stroke="#8d96a8" stroke-width="1.6" opacity=".7"/>
   <path d="M${-s*3.5} ${f(tL+2)} V${f(tL*.55)}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
  </g>`;
 return `<g>
  <rect x="-18" y="-7" width="36" height="26" rx="13" fill="${id('metal')}" stroke="#0b1c3c" stroke-width="4"/>
  <rect x="-15" y="0" width="30" height="10" rx="5" fill="#203453"/>
  ${tc<.6?thumb:''}${behind.join('')}
  <path d="M-27 6 Q-19 -3 0 -3 Q20 -4 27 8 L29 33 Q20 45 0 45 Q-23 43 -29 28Z" fill="${id('glove')}" stroke="#1c2e49" stroke-width="4"/>
  <path d="M-17 6 Q0 -1 16 7" fill="none" stroke="#fffaf1" stroke-width="5" opacity=".75" stroke-linecap="round"/>
  <path d="M-18 29 Q0 37 19 28" fill="none" stroke="#c4c5cc" stroke-width="2" opacity=".8"/>
  <path d="M-16 10Q0 4 16 11L17 26Q0 35 -17 25Z" fill="#d0d4d7" stroke="#9ba7b4" stroke-width="1.3"/>
  <path d="M-13 11Q0 7 13 12" stroke="#fff" stroke-width="1.6" fill="none"/>
  <path d="M-6 19h12 M-3 23h6" stroke="#778b9e" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
  <path d="M-17 3H17" stroke="#ecc16d" stroke-width="2" opacity=".7"/>
  <path d="M${-s*20} 11 Q${-s*24} 26 ${-s*18} 38" fill="none" stroke="#6d7690" stroke-width="3" opacity=".22" stroke-linecap="round"/>
  ${tc>=.6?thumb:''}${front.join('')}
 </g>`;
}

/* ------------------------------------- arms ---------------------------------------- */
/** Nested shoulder > upper sleeve > elbow > forearm > wrist > hand. Everything stays attached. */
function arm(side:'left'|'right',sh:number,el:number,wr:number,fing:number[],spread:number,shrug:number):string{
 const s=side==='left'?-1:1;
 return `<g transform="translate(${s*119} ${f(-213+shrug)}) rotate(${f(sh)})">
  <ellipse cx="0" cy="5" rx="34" ry="34" fill="${id('sleeve')}" stroke="#102247" stroke-width="5"/>
  <path d="M-27 2 Q-43 27 -31 73 Q-28 93 -23 102 Q0 115 24 99 Q32 82 32 65 L28 5 Q4 -8 -27 2Z" fill="${id('sleeve')}" stroke="#13264a" stroke-width="5"/>
  <path d="M-21 18 Q-30 53 -21 84" fill="none" stroke="#7596c9" stroke-width="6" opacity=".38" stroke-linecap="round"/>
  <path d="M26 20 Q31 52 24 88" fill="none" stroke="#050d24" stroke-width="9" opacity=".3" stroke-linecap="round"/>
  <path d="M-23 12Q-31 33 -26 58L-13 63L-9 17Z" fill="#526e94" opacity=".22"/>
  <path d="M-21 20L-23 49" stroke="#a5bdcd" stroke-width="1.3" opacity=".4"/>
  <ellipse cx="-8" cy="-4" rx="13" ry="9" fill="#a9c2ee" opacity=".22"/>
  <path d="M-25 93 Q0 104 25 92" stroke="#4b6597" stroke-width="4" opacity=".65" fill="none"/>
  <g transform="translate(0 93) rotate(${f(el)})">
   <ellipse cx="0" cy="0" rx="21" ry="22" fill="${id('metal')}" stroke="#1a2642" stroke-width="6"/>
   <ellipse cx="0" cy="0" rx="10" ry="11" fill="#1c3459"/>
   <circle cx="0" cy="0" r="4.5" fill="#192a40" stroke="#a5b9c7" stroke-width="1.2"/>
   <path d="M-8 -9 Q-1 -15 8 -9" fill="none" stroke="#fff" stroke-width="2.4" opacity=".6" stroke-linecap="round"/>
   <path d="M-24 3 Q-30 40 -24 79 Q0 90 25 79 Q32 38 23 3Z" fill="${id('sleeve')}" stroke="#112344" stroke-width="5"/>
   <path d="M-18 19 Q-25 46 -17 67" fill="none" stroke="#7390ba" stroke-width="5" opacity=".35"/>
   <path d="M19 12 Q26 44 20 70" fill="none" stroke="#050d24" stroke-width="7" opacity=".28" stroke-linecap="round"/>
   <rect x="-25" y="70" width="50" height="24" rx="11" fill="${id('hoodie')}" stroke="#0c1b3b" stroke-width="4"/>
   <path d="M-18 79 H18 M-18 85 H18" stroke="#546995" stroke-width="2.4" opacity=".85"/>
   <path d="M-21 74Q0 82 21 74" stroke="#c3d3e0" stroke-width="1.2" fill="none" opacity=".6"/>
   <g transform="translate(0 97) rotate(${f(wr)}) scale(1.08)">${hand(side,fing,spread)}</g>
  </g>
 </g>`;
}

/* ------------------------------------- torso --------------------------------------- */
const torso=(strings:number)=>`<g>
 <path d="M-86 -239 Q-129 -237 -141 -207 L-132 -178 Q-113 -170 -88 -175 L-65 -221Z" fill="#0b1835" stroke="#0c1b3a" stroke-width="5"/>
 <path d="M86 -239 Q129 -237 141 -207 L132 -178 Q113 -170 88 -175 L65 -221Z" fill="#0b1835" stroke="#0c1b3a" stroke-width="5"/>
 <path d="M-118 -226 Q-143 -205 -133 -131 Q-130 -54 -103 -29 Q-60 -8 0 -11 Q65 -7 105 -29 Q130 -62 134 -133 Q145 -209 116 -228 Q50 -254 -2 -256 Q-65 -253 -118 -226Z" fill="${id('hoodie')}" stroke="#0b1b3c" stroke-width="7"/>
 <path d="M-118 -224 Q-100 -165 -110 -84" fill="none" stroke="#8aa5d8" stroke-width="9" opacity=".25" stroke-linecap="round"/>
 <path d="M116 -226 Q132 -165 106 -78" fill="none" stroke="#090f2a" stroke-width="14" opacity=".5"/>
 <path d="M-60 -160 Q-20 -130 -52 -90" fill="none" stroke="#8aa5d8" stroke-width="12" opacity=".08" stroke-linecap="round"/>
 <path d="M40 -170 Q70 -120 44 -80" fill="none" stroke="#050d24" stroke-width="12" opacity=".14" stroke-linecap="round"/>
 <path d="M-97 -60 Q-85 -75 -65 -72 H66 Q87 -73 96 -58 L88 -18 Q2 -6 -90 -18Z" fill="#1c3765" stroke="#0e2147" stroke-width="6"/>
 <path d="M-88 -59 Q-66 -49 -58 -32 M89 -59 Q66 -49 56 -32" fill="none" stroke="#7088b8" stroke-width="3" opacity=".7"/>
 <path d="M-100 -24 Q-2 -9 102 -24 L103 -10 Q4 2 -103 -10Z" fill="#17274d" stroke="#0e1938" stroke-width="4"/>
 <path d="M-71 -223 Q-59 -251 -15 -255 L17 -255 Q65 -249 76 -223 Q59 -202 33 -207 Q0 -219 -32 -207 Q-57 -203 -71 -223Z" fill="#0e1d3d" stroke="#314a77" stroke-width="7"/>
 <rect x="-6" y="-195" width="12" height="40" rx="5" fill="#122342" stroke="#597099" stroke-width="2"/>
 <rect x="-6" y="-178" width="12" height="16" rx="4" fill="${id('metal')}"/>
 ${[-28,29].map(x=>`<g transform="rotate(${f(strings)} ${x} -220)"><path d="M${x} -222 L${x+1} -150" stroke="#7894bf" stroke-width="6" stroke-linecap="round"/><path d="M${x} -151 L${x+1} -136" stroke="#e2e7dc" stroke-width="7" stroke-linecap="round"/></g>`).join('')}
 <path d="M48 -165Q72 -173 92 -162L89 -124Q70 -113 49 -127Z" fill="#12233c" stroke="#516b85" stroke-width="1.8"/>
 <path d="M51 -163Q72 -169 89 -161" fill="none" stroke="#c6d6dd" stroke-width="1" opacity=".55"/>
 ${lightning(71,-145,.56)}
 <path d="M-72 -210 Q-66 -190 -41 -195" fill="none" stroke="#7892c0" opacity=".22" stroke-width="4"/>
 <g clip-path="url(#${C}-torsoClip)">
  <rect x="-145" y="-255" width="290" height="260" fill="${id('weave')}"/>
  <path d="M-111 -217Q-91 -175 -98 -96 M108 -218Q93 -175 99 -93 M-93 -27Q0 -12 94 -27" stroke="#aec2d8" stroke-width="1.2" stroke-dasharray="2.5 3.5" fill="none" opacity=".28"/>
  <ellipse cx="0" cy="-208" rx="100" ry="30" fill="${id('soft')}" opacity=".7"/>
  <ellipse cx="112" cy="-150" rx="60" ry="130" fill="${id('rim')}" opacity=".55"/>
  <ellipse cx="-80" cy="-190" rx="130" ry="165" fill="${id('keyLight')}" opacity=".35"/>
 </g>
</g>`;

/* -------------------------------------- face --------------------------------------- */
function mouthSvg(m:RigState['mouth']):string{
 const w=lerp(26,46,(m.wide+1)/2)*(1+.04*m.smile)*(1-.08*m.press);
 const lift=m.smile*11-m.press*1.5,cy=-301,cY=cy-lift;
 if(m.open<.07){
  const dip=3+Math.max(0,m.smile)*14*(1-.5*m.press)+Math.min(0,m.smile)*8;
  return `<path d="M${f(-w)} ${f(cY)} Q0 ${f(cY+dip*1.9)} ${f(w)} ${f(cY)}" fill="none" stroke="#653b39" stroke-width="5.2" stroke-linecap="round"/>
   <path d="M${f(-w-1)} ${f(cY-2)} q-3 -2 -5 -6 M${f(w+1)} ${f(cY-2)} q3 -2 5 -6" stroke="#7a4a44" stroke-width="3" fill="none" stroke-linecap="round" opacity="${f(clamp(m.smile))}"/>`;
 }
 const round=m.wide<-.25;
 const topDip=1+Math.max(0,m.smile)*8*(m.wide>-.2?1:.3);
 const depth=m.open*48;
 const T=cy+topDip,B=T+depth;
 // rounded phonemes (O/U/wow) use a soft oval instead of the grin
 const rx=w*(.62+.2*m.open),ry=7+m.open*24,oy=cy-lift*.3+ry*.5;
 const ovalPath=`M${f(-rx)} ${f(oy)} C${f(-rx)} ${f(oy-ry*1.25)} ${f(rx)} ${f(oy-ry*1.25)} ${f(rx)} ${f(oy)} C${f(rx)} ${f(oy+ry*1.35)} ${f(-rx)} ${f(oy+ry*1.35)} ${f(-rx)} ${f(oy)}Z`;
 const interior=round?ovalPath:`M${f(-w)} ${f(cY)} Q${f(-w*.45)} ${f(T)} 0 ${f(T)} Q${f(w*.45)} ${f(T)} ${f(w)} ${f(cY)} C${f(w*.96)} ${f(T+depth*.85)} ${f(w*.4)} ${f(B+1)} 0 ${f(B+1)} C${f(-w*.4)} ${f(B+1)} ${f(-w*.96)} ${f(T+depth*.85)} ${f(-w)} ${f(cY)}Z`;
 const teethH=!round&&m.teeth>.05?(8+10*m.open)*clamp(m.teeth):0;
 const teeth=teethH>0?`<path d="M${f(-w)} ${f(cY-18)} H${f(w)} V${f(T+teethH*.6)} Q0 ${f(T+teethH+2)} ${f(-w)} ${f(T+teethH*.6)}Z" fill="#fff9ef"/>
   <path d="M${f(-w*.7)} ${f(T+teethH*.9)} Q0 ${f(T+teethH*1.3)} ${f(w*.7)} ${f(T+teethH*.9)}" stroke="#e8d9c4" stroke-width="1.5" fill="none" opacity=".6"/>`:'';
 const bite=m.bite>.05?`<path d="M${f(-w*.62)} ${f(T+9)} Q0 ${f(T+17)} ${f(w*.62)} ${f(T+9)}" stroke="#e48f93" stroke-width="7" stroke-linecap="round" fill="none" opacity="${f(m.bite)}"/>`:'';
 const tg=m.tongue>.05&&m.open>.2?`<ellipse cx="${f(w*.05)}" cy="${f(round?oy+ry*.8:B-5)}" rx="${f(w*.5*(.7+.3*m.tongue))}" ry="${f(5+depth*.18)}" fill="#e78d96"/><path d="M${f(-w*.2)} ${f(B-8)} Q0 ${f(B-3)} ${f(w*.2)} ${f(B-8)}" stroke="#c76a77" stroke-width="1.6" fill="none"/>`:'';
 return `<clipPath id="${C}-mouthClip"><path d="${interior}"/></clipPath>
  <path d="${interior}" fill="${id('mouth')}"/>
  <g clip-path="url(#${C}-mouthClip)">${tg}${teeth}${bite}</g>
  <path d="${interior}" fill="none" stroke="#76483e" stroke-width="3.5" stroke-linejoin="round"/>`;
}

function eyeSvg(x:number,s:RigState,idn:string):string{
 const open=clamp(s.eyeOpen*(1-s.blink*.97),.02,1.14),sq=s.squint*.17;
 const ry=38.5*open*(1-sq),rx=33.5*(1+.02*(s.eyeOpen-1)),cyc=-373+(38.5-ry)*.28-s.squint*5;
 const gx=s.gazeX*9,gy=s.gazeY*6;
 const closed=open<.18;
 return `<g transform="translate(${x} 0)">
  <ellipse cx="0" cy="${f(cyc+2)}" rx="${f(rx+2)}" ry="${f(ry+2)}" fill="#6c5a63" opacity=".3"/>
  <clipPath id="${C}-${idn}"><ellipse cx="0" cy="${f(cyc)}" rx="${f(rx)}" ry="${f(ry)}"/></clipPath>
  <g clip-path="url(#${C}-${idn})">
   <ellipse cx="0" cy="-373" rx="${f(rx)}" ry="46" fill="${id('eyeWhite')}"/>
   <g transform="translate(${f(gx)} ${f(-373+gy)})">
    <ellipse cx="0" cy="3" rx="21" ry="29" fill="${id('iris')}" stroke="#483329" stroke-width="2.2"/>
    ${Array.from({length:18},(_,i)=>{const a=i*Math.PI/9;return `<path d="M${f(Math.cos(a)*15)} ${f(3+Math.sin(a)*22)}l${f(Math.cos(a)*4)} ${f(Math.sin(a)*5)}" stroke="${i%2?'#f0c97a':'#583c24'}" stroke-width="1.2" opacity=".5"/>`;}).join('')}
    <ellipse cx="1" cy="4" rx="12.2" ry="20" fill="#101725"/>
    <ellipse cx="-6" cy="-11" rx="6.5" ry="7.5" fill="#fff" opacity=".94"/>
    <circle cx="7" cy="15" r="2.5" fill="#ffecd4" opacity=".75"/>
    <path d="M-15 -5 Q-16 11 -7 20" fill="none" stroke="#ffe29a" opacity=".5" stroke-width="2"/>
   </g>
   <ellipse cx="0" cy="${f(cyc-ry-6)}" rx="${f(rx+4)}" ry="9" fill="#000" opacity="${f(.16*(1-open))}"/>
  </g>
  <ellipse cx="0" cy="${f(cyc)}" rx="${f(rx)}" ry="${f(ry)}" fill="${id('lens')}"/>
  ${closed?`<path d="M${f(-rx+2)} -373 Q0 ${f(-352+s.squint*-6)} ${f(rx-2)} -373" fill="none" stroke="#6b4a49" stroke-width="5" stroke-linecap="round"/>`
  :`<ellipse cx="0" cy="${f(cyc)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="#9b807b" stroke-width="3.2"/>
  ${open<.92?`<path d="M${f(-rx+3)} ${f(cyc-ry*.35)} Q0 ${f(cyc-ry*1.04)} ${f(rx-3)} ${f(cyc-ry*.35)}" fill="none" stroke="#7b5d58" stroke-width="3.4" stroke-linecap="round" opacity=".75"/>`:''}`}
 </g>`;
}

function brow(side:-1|1,raise:number,tilt:number):string{
 // outer end at x=±90, inner end at x=±44; tilt>0 raises the inner end (tender), tilt<0 lowers it (determined)
 const y0=-431-raise,outer=y0+tilt*.55,inner=y0-tilt*.9;
 const ox=side*90,ix=side*44,cx=side*67,cy=y0-12;
 return `<path d="M${ox} ${f(outer+3)} Q${cx} ${f(cy)} ${ix} ${f(inner+3)}" stroke="#273348" stroke-width="8.5" fill="none" stroke-linecap="round"/>
 <path d="M${ox} ${f(outer)} Q${cx} ${f(cy-2)} ${ix} ${f(inner)}" stroke="#64748b" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".4"/>`;
}

function face(s:RigState):string{
 const px=s.yaw*16,py=s.pitch*9;
 const plate='M-122 -373 Q-118 -429 -83 -447 Q-41 -466 0 -463 Q55 -467 94 -441 Q124 -414 125 -369 L121 -319 Q109 -258 37 -241 Q0 -232 -38 -244 Q-112 -264 -122 -337Z';
 return `<path d="${plate}" fill="#111d32" stroke="#091426" stroke-width="12"/>
  <path d="${plate}" fill="${id('face')}" stroke="${id('bevel')}" stroke-width="5"/>
  <path d="${plate}" fill="${id('faceShade')}"/>
  <path d="${plate}" fill="${id('keyLight')}" opacity=".55"/>
  <path d="M-112 -400Q-72 -451 0 -451Q79 -454 113 -397" fill="none" stroke="#465468" stroke-width="5" opacity=".14"/>
  <path d="M-105 -401 Q-88 -441 -41 -448" stroke="#fffefa" stroke-width="10" fill="none" opacity=".55" stroke-linecap="round"/>
  <g transform="translate(${f(px)} ${f(py)})">
   <ellipse cx="-94" cy="-308" rx="29" ry="19" fill="${id('blush')}" opacity="${f(s.blush*.5)}"/><ellipse cx="94" cy="-308" rx="29" ry="19" fill="${id('blush')}" opacity="${f(s.blush*.5)}"/>
   <g transform="translate(${f(s.yaw*5)} ${f(s.pitch*3)})">${eyeSvg(-52,s,'eyeL')}${eyeSvg(52,s,'eyeR')}</g>
   ${brow(-1,s.browL,s.browTilt)}${brow(1,s.browR,s.browTilt)}
   <g transform="translate(${f(s.yaw*5)} -334)"><path d="M-7 -4Q0 -11 7 -4L5 3Q0 7 -5 3Z" fill="${id('face')}" stroke="#a5acb1" stroke-width="1.4"/><path d="M-3 1H3" stroke="#7b929e" stroke-width="1.5" stroke-linecap="round"/><path d="M-4 -4Q0 -7 4 -4" stroke="#fff9e9" stroke-width="1.2" fill="none"/></g>
   <g transform="translate(${f(s.yaw*4)} 0)">${mouthSvg(s.mouth)}</g>
   <path d="M-54 -269 Q0 -246 55 -269" stroke="#fff7ef" stroke-width="3" opacity=".18" fill="none"/>
  </g>
  <path d="M-112 -341v24l8 16 M112 -341v24l-8 16" stroke="#9aa6b0" stroke-width="1.5" fill="none" opacity=".65"/>
  <path d="M-110 -295Q-96 -270 -70 -261 M110 -295Q96 -270 70 -261" stroke="#6d8196" stroke-width="1.3" fill="none" opacity=".5"/>
  <path d="M-103 -291Q-92 -276 -76 -271 M103 -291Q92 -276 76 -271" stroke="#fffaf0" stroke-width="1.2" fill="none" opacity=".65"/>
  ${fastener(-109,-352,2)}${fastener(109,-352,2)}`;
}

function headphones(yaw:number):string{
 const cup=(sd:number)=>{
  // the cup that turns away from the viewer is squeezed more than the one turning toward it
  const squeeze=1-(yaw*sd>0?.22:.1)*Math.abs(yaw),shift=yaw*8;
  return `<g transform="translate(${f(sd*149+shift)} -351) scale(${f(squeeze)} 1)">
   <ellipse cx="0" cy="4" rx="40" ry="54" fill="#080f26" stroke="#263653" stroke-width="7"/>
   <ellipse cx="0" cy="0" rx="35" ry="46" fill="${id('metal')}" stroke="#0c1735" stroke-width="6"/>
   <ellipse cx="0" cy="0" rx="29" ry="39" fill="#0b172b" stroke="${id('gold')}" stroke-width="2.6"/>
   <ellipse cx="0" cy="0" rx="21" ry="29" fill="#1c3054" stroke="#7e542e" stroke-width="2"/>
   ${lightning(-1,0,.55)}
   <ellipse cx="0" cy="0" rx="34" ry="45" fill="${id('keyLight')}" opacity=".6"/>
   <path d="M-12 29h24 M-9 33h18 M-5 37h10" stroke="#7f99ac" stroke-width="1.4" opacity=".6"/>
   ${fastener(-24,-32,2.3)}${fastener(24,32,2.3)}
   <path d="M-23 -26 Q-37 -5 -22 18" fill="none" stroke="#fff3ca" stroke-width="3" opacity=".6"/>
   <ellipse cx="-12" cy="-30" rx="9" ry="5" fill="#fff" opacity=".28"/>
  </g>`;
 };
 return `<path d="M-134 -406 Q-126 -483 0 -484 Q126 -483 134 -406" fill="none" stroke="#0e1934" stroke-width="28" stroke-linecap="round"/>
 <path d="M-130 -405 Q-123 -473 -1 -474 Q121 -472 130 -405" fill="none" stroke="${id('metal')}" stroke-width="13" stroke-linecap="round" opacity=".9"/>
 <path d="M-125 -408 Q-114 -463 0 -465 Q115 -463 125 -408" fill="none" stroke="#18345f" stroke-width="6" opacity=".85"/>
 ${cup(-1)}${cup(1)}`;
}

function head(s:RigState):string{
 return `<g transform="translate(${f(s.yaw*5)} 0)">
  <ellipse cx="0" cy="-354" rx="150" ry="147" fill="${id('helmet')}" stroke="#091732" stroke-width="9"/>
  <ellipse cx="-38" cy="-415" rx="95" ry="70" fill="${id('helmetSpec')}"/>
  <ellipse cx="0" cy="-354" rx="149" ry="146" fill="${id('keyLight')}"/>
  <path d="M-132 -426Q-91 -493 -10 -495 M136 -403Q158 -336 119 -274" stroke="${id('bevel')}" stroke-width="2" fill="none" opacity=".8"/>
  <path d="M-99 -463L-84 -449 M94 -463L82 -450 M-134 -309L-122 -307 M135 -309L122 -307" stroke="#7f94ad" stroke-width="2" fill="none" opacity=".55"/>
  <path d="M-124 -428 Q-97 -483 -24 -490" stroke="#8196bc" stroke-width="12" opacity=".38" fill="none" stroke-linecap="round"/>
  <path d="M-121 -289 Q-62 -213 56 -225 Q109 -236 122 -286" stroke="#060e26" stroke-width="10" opacity=".65" fill="none"/>
  ${face(s)}
  ${headphones(s.yaw)}
  <g transform="rotate(${f(s.crest)} 0 -458)">
   <path d="M-15 -486Q0 -498 15 -486L25 -458Q0 -448 -25 -458Z" fill="#142541" stroke="${id('bevel')}" stroke-width="3.5"/>
   <path d="M-8 -484L8 -484L13 -459Q0 -455 -13 -459Z" fill="${id('gold')}"/>
   <path d="M-7 -482L-2 -483L-5 -465" stroke="#fff7bf" stroke-width="2.4" opacity=".85" fill="none"/>
  </g>
 </g>`;
}

/* ------------------------------------ assembly -------------------------------------- */
/** Render one character group. `atX/atY` is the floor point under the character. */
export function renderCharacter(s:RigState,lighting:CharacterLighting=DEFAULT_LIGHT):string{
 const lift=Math.min(0,s.lift)*1;                     // negative = up
 const air=clamp(-lift/12);
 const scaleY=1+.011*s.breath;
 const arms=`${arm('left',s.lSh,s.lEl,s.lWr,s.lFing,s.lSpread,s.shrugL)}${arm('right',s.rSh,s.rEl,s.rWr,s.rFing,s.rSpread,s.shrugR)}`;
 const headG=`<g transform="rotate(${f(s.headTilt)} 0 -236) translate(0 -246) scale(.92) translate(0 246)">${head(s)}</g>`;
 return `<g transform="translate(${f(s.atX)} ${f(s.atY)}) scale(${f(s.scale)})">
 ${CHARACTER_DEFS}
 <defs><radialGradient id="${C}-keyLight" cx=".17" cy=".12" r="1"><stop stop-color="${lighting.key}" stop-opacity="${f(clamp(lighting.strength))}"/><stop offset=".48" stop-color="${lighting.key}" stop-opacity="0"/><stop offset=".78" stop-color="${lighting.fill}" stop-opacity="0"/><stop offset="1" stop-color="${lighting.fill}" stop-opacity="${f(clamp(lighting.strength)*.8)}"/></radialGradient></defs>
 <ellipse cx="0" cy="58" rx="${f(160*(1-.25*air))}" ry="${f(26*(1-.2*air))}" fill="${id('soft')}" opacity="${f(.85-.3*air)}"/>
 <g transform="translate(0 ${f(lift)})">
  <g transform="translate(0 58) scale(1 1.16) translate(0 -58)">${leg('left')}${leg('right')}</g>
  <g transform="translate(${f(s.shift)} -18) rotate(${f(s.lean)} 0 -70)">
   <rect x="-23" y="-262" width="46" height="49" rx="17" fill="${id('metal')}" stroke="#0c1b3b" stroke-width="6"/>
   <path d="M-17 -250 H17 M-17 -236 H17" stroke="#25324c" stroke-width="5"/>
   <path d="M-16 -258V-224 M16 -258V-224" stroke="#c6d4da" stroke-width="1.2" opacity=".5"/>
   <g transform="translate(0 -70) scale(1 ${f(scaleY)}) translate(0 70)">
    <g transform="translate(0 -230) scale(1 .9) translate(0 230)">${torso(s.strings)}</g>
    ${s.frontArms?headG+arms:arms+headG}
   </g>
  </g>
 </g>
 </g>`;
}
