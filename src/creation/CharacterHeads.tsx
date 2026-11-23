import React from 'react';
import {interpolate} from 'remotion';

/**
 * Art-directed front-facing vector heads for SHALÓM.
 *
 * The face and hair share one anatomical coordinate system:
 * - skull crown: y -46; hair crown: y -63
 * - natural hairline: y -29...-24
 * - brow line: y -12; eyes: y 0; chin: y 35
 * This leaves a modest forehead, and gives both temples a proper overlap.
 *
 * All SVG elements are independently identifiable for secondary animation.
 * No CSS animation, time, randomness, bitmaps or raster filters.
 */
export type CharacterKind='adam'|'eve';
type CharacterHeadProps={kind:CharacterKind;frame:number;seed:number};
const oscillate=(frame:number,rate:number,seed:number)=>Math.sin(frame*rate+seed);
const blinkAt=(frame:number,seed:number)=>{
 const phase=((frame+seed*37)%157+157)%157;
 return interpolate(phase,[67,70,73,76,80],[0,.7,1,.7,0],{
  extrapolateLeft:'clamp',extrapolateRight:'clamp'
 });
};

const HAIR={shadow:'#202b34',base:'#35404a',lit:'#58626a'};
const SKIN={base:'#eac49f',shadow:'#c39476',light:'#f6dfbc',blush:'#d99285'};

export const CharacterHairBack:React.FC<CharacterHeadProps>=({kind,frame,seed})=>{
 const drift=oscillate(frame,.009,seed+3)*1.5;
 if(kind==='adam'){
  return <g data-part="hair-back">
   <path d="M-27 -22C-33 -41 -24 -58 -4 -61C17 -65 32 -49 29 -27L25 -13L20 -21C8 -29 -9 -28 -22 -17Z" fill={HAIR.shadow}/>
   <path d="M-26 -31C-29 -46 -18 -58 -3 -59C12 -62 25 -54 28 -39" stroke={HAIR.base} strokeWidth="4" fill="none" opacity=".75"/>
  </g>;
 }
 return <g data-part="hair-back" transform={'rotate('+drift+' 0 -41)'}>
  {/* The rear curtains are *behind* the shoulders and never paint over the face or dress. */}
  <path d="M-31 -33C-37 -60 -18 -70 4 -67C28 -67 36 -48 35 -24
   C33 6 37 48 37 78Q29 92 18 87L12 20Q-1 12 -12 22
   L-19 86Q-31 93 -38 77C-36 42 -38 5 -31 -33Z" fill={HAIR.shadow}/>
  <path d="M-29 -33C-33 -56 -15 -67 2 -65C-16 -58 -26 -42 -25 -17
   Q-28 38 -29 75Q-23 83 -19 81L-15 15Z" fill={HAIR.base}/>
  <path d="M20 -56Q35 -47 31 -24Q29 31 34 77Q30 83 25 82L20 18Z" fill={HAIR.base}/>
  <path d="M-30 7Q-29 49 -26 69M29 2Q29 48 31 68" stroke={HAIR.lit} opacity=".38" strokeWidth="1.65" fill="none"/>
 </g>;
};

const AdamFringe:React.FC<{frame:number;seed:number}>=({frame,seed})=>{
 const lean=oscillate(frame,.013,seed)*.45;
 return <g data-part="hair-front">
  {/* Crown and hairline are a single coherent closed contour over the skull. */}
  <path d="M-28 -22C-31 -39 -27 -55 -11 -60C6 -68 25 -58 29 -42
   C32 -33 29 -23 27 -19L22 -27C15 -31 9 -29 4 -27
   C-5 -26 -10 -30 -18 -25L-25 -19Z" fill={HAIR.shadow}/>
  <path d="M-26 -30C-27 -47 -15 -59 -1 -60C12 -63 23 -55 27 -43
   Q20 -47 13 -44C3 -45 -2 -37 -9 -36Q-20 -36 -26 -30Z" fill={HAIR.base}/>
  <g data-part="fringe-sweep" transform={'rotate('+lean+' -3 -39)'}>
   <path d="M-26 -31Q-23 -47 -10 -53Q2 -56 8 -51
    C3 -43 -6 -34 -17 -29L-24 -25Z" fill={HAIR.lit} opacity=".68"/>
   <path d="M-9 -49Q4 -56 16 -48Q19 -43 21 -38
    Q12 -40 8 -34Q1 -30 -8 -30Q-1 -38 -9 -49Z" fill={HAIR.base}/>
   <path d="M12 -47Q24 -45 27 -32L24 -22Q21 -31 14 -33Z" fill={HAIR.lit} opacity=".6"/>
  </g>
  <path d="M-24 -27Q-13 -39 -3 -39M2 -44Q12 -49 20 -42" stroke="#909296" strokeWidth="1.3" opacity=".28" fill="none"/>
  <g data-part="temples">
   <path d="M-27 -27Q-30 -20 -27 -11L-23 -9L-22 -23Z" fill={HAIR.shadow}/>
   <path d="M27 -25Q30 -20 26 -11L22 -10L23 -22Z" fill={HAIR.shadow}/>
  </g>
 </g>;
};

const EveFringe:React.FC<{frame:number;seed:number}>=({frame,seed})=>{
 const sway=oscillate(frame,.011,seed+2)*.55;
 return <g data-part="hair-front">
  {/* Soft offset part and a clean forehead arc. No large exposed scalp or V-shaped helmet. */}
  <path d="M-31 -20C-37 -43 -25 -63 -6 -67C13 -72 30 -58 33 -39
   Q36 -27 29 -14L23 -23C19 -27 13 -29 9 -29
   C4 -30 1 -34 -2 -38C-8 -32 -15 -26 -24 -22Z" fill={HAIR.shadow}/>
  <path d="M-29 -26C-32 -48 -18 -62 0 -63Q-14 -55 -18 -43
   Q-22 -32 -29 -26Z" fill={HAIR.base}/>
  <path d="M0 -63C18 -66 30 -52 31 -38Q29 -30 25 -25
   C17 -29 10 -32 7 -35Q3 -41 0 -63Z" fill={HAIR.base}/>
  <g data-part="fringe-sweep" transform={'rotate('+sway+' -7 -40)'}>
   <path d="M-6 -61Q-19 -58 -25 -46Q-29 -38 -26 -28
    C-19 -32 -12 -38 -9 -43Q-7 -50 -6 -61Z" fill={HAIR.lit} opacity=".56"/>
   <path d="M-5 -56Q-7 -44 -15 -37Q-19 -32 -25 -29
    Q-14 -32 -7 -37Q1 -44 2 -50Z" fill={HAIR.base}/>
   <path d="M2 -57Q7 -45 13 -39Q20 -35 26 -29
    Q18 -34 15 -43Q10 -51 2 -57Z" fill={HAIR.lit} opacity=".45"/>
  </g>
  <path d="M-23 -34Q-18 -50 -6 -55M8 -56Q21 -53 27 -39" stroke="#a4a3a1" strokeWidth="1.35" opacity=".24" fill="none"/>
 </g>;
};

function SideLocks({kind,frame,seed}:{kind:CharacterKind;frame:number;seed:number}) {
 const left=oscillate(frame,.011,seed+2)*1.05;
 const right=oscillate(frame,.012,seed+5)*1.15;
 return kind==='eve'?<>
  <g data-part="hair-side-lock-left" transform={'rotate('+left+' -26 -20)'}>
   <path d="M-28 -27Q-35 -12 -33 10Q-34 25 -28 39
    Q-21 46 -19 42Q-26 20 -23 8Q-20 -12 -22 -23Z" fill={HAIR.shadow}/>
   <path d="M-28 -16Q-31 10 -28 29" fill="none" stroke={HAIR.lit} strokeWidth="2" opacity=".43"/>
  </g>
  <g data-part="hair-side-lock-right" transform={'rotate('+right+' 28 -20)'}>
   <path d="M28 -26Q36 -11 33 13Q35 28 28 40
    Q21 45 19 41Q26 19 23 8Q20 -12 22 -23Z" fill={HAIR.shadow}/>
   <path d="M28 -16Q31 10 28 27" fill="none" stroke={HAIR.lit} strokeWidth="2" opacity=".43"/>
  </g>
 </>:<>
  <g data-part="hair-side-lock-left"><path d="M-27 -19Q-29 -13 -26 -7L-22 -8L-23 -20Z" fill={HAIR.base}/></g>
  <g data-part="hair-side-lock-right"><path d="M27 -19Q29 -13 26 -7L22 -8L23 -20Z" fill={HAIR.base}/></g>
 </>;
}

function ExpressiveEye({side,kind,frame,seed}:{side:'left'|'right';kind:CharacterKind;frame:number;seed:number}) {
 const x=side==='left'?-10.7:10.7;
 const blink=blinkAt(frame,seed);
 const glance=oscillate(frame,.007,seed+1)*1.1;
 const eyeScale=Math.max(.08,1-blink);
 const feminine=kind==='eve';
 return <g data-part={side==='left'?'eye-left':'eye-right'} transform={'translate('+x+' 0)'}>
  <g data-part="eyelid" transform={'scale(1 '+eyeScale+')'}>
   <path d="M-7.6 0Q0 -5.4 7.6 0Q0 5.7 -7.6 0Z" fill="#f8eedd" stroke="#bd9075" strokeWidth=".55"/>
   <g data-part="pupils" transform={'translate('+glance+' 0)'}>
    <circle r="3.7" fill="#815f4d"/>
    <circle r="2.65" fill="#24343b"/>
    <circle cx="-1.1" cy="-1.5" r="1.25" fill="#fffaf1"/>
    <circle cx="1.4" cy="1.3" r=".55" fill="#fff7e3" opacity=".75"/>
   </g>
  </g>
  <path d="M-7.6 0Q0 -6.2 7.6 0" stroke="#61514a" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
  {feminine&&<path d="M6 -2L8 -4M-6 -2L-8 -3" stroke="#5d4a46" strokeWidth="1.05" strokeLinecap="round"/>}
  {blink>.74&&<path d="M-7 0Q0 1.6 7 0" stroke="#ad8270" strokeWidth="1.2" fill="none"/>}
 </g>;
}

export const CharacterHead:React.FC<CharacterHeadProps>=({kind,frame,seed})=>{
 const feminine=kind==='eve';
 const look=oscillate(frame,.006,seed+6)*.55;
 const smile=.7+oscillate(frame,.008,seed+3)*.17;
 return <g data-part="head-and-face" data-head-design={kind}>
  {kind==='adam'&&<CharacterHairBack kind={kind} frame={frame} seed={seed}/>}
  <g data-part="neck">
   <path d="M-10 21Q-9 29 -11 41Q0 47 12 41L10 20Z" fill={SKIN.base}/>
   <path d="M-9 26Q-4 35 8 34L12 40Q4 44 -4 42Z" fill={SKIN.shadow} opacity=".28"/>
  </g>
  <g data-part="ears">
   <path d="M-23 -6Q-31 -7 -28 5Q-25 11 -21 7Z" fill={SKIN.shadow}/>
   <path d="M23 -6Q31 -7 28 5Q25 11 21 7Z" fill={SKIN.shadow}/>
   <path d="M-25 -2Q-27 3 -23 5M25 -2Q27 3 23 5" stroke="#9f7565" strokeWidth="1.1" fill="none"/>
  </g>
  <g data-part="head">
   {/* Fully modeled skull, jaw and chin underneath an actual overhanging hairline. */}
   <path d={feminine?
    'M-24 -23C-25 -38 -14 -46 0 -46C16 -46 25 -36 25 -21L24 14C21 24 10 35 0 36C-13 34 -22 25 -24 13Z':
    'M-25 -22C-26 -36 -15 -45 0 -45C16 -45 26 -35 25 -21L25 13Q22 25 13 31L7 35H-7L-14 31Q-23 24 -25 12Z'
   } fill={SKIN.base} stroke="#c49878" strokeWidth=".85"/>
   <path d="M-23 -4Q-24 19 -12 28Q-4 34 3 33Q-13 23 -13 3Z" fill={SKIN.shadow} opacity=".15"/>
   <path d="M14 -35Q25 -23 23 -4" fill="none" stroke={SKIN.light} strokeWidth="2.2" opacity=".5"/>
   <ellipse cx="-16" cy="13" rx="5.9" ry="3.6" fill={SKIN.blush} opacity=".24"/>
   <ellipse cx="16" cy="13" rx="5.9" ry="3.6" fill={SKIN.blush} opacity=".24"/>
  </g>
  <g data-part="eyebrow-left">
   <path d={feminine?'M-17 -11Q-11 -14 -5.5 -11':'M-18 -11Q-11 -15 -5 -11'} stroke="#634a42" strokeWidth={feminine?1.65:2} strokeLinecap="round" fill="none"/>
  </g>
  <g data-part="eyebrow-right">
   <path d={feminine?'M5.5 -11Q11 -14 17 -11':'M5 -11Q12 -15 18 -11'} stroke="#634a42" strokeWidth={feminine?1.65:2} strokeLinecap="round" fill="none"/>
  </g>
  <g data-part="eyes" transform={'translate('+look+' 0)'}>
   <ExpressiveEye side="left" kind={kind} frame={frame} seed={seed}/>
   <ExpressiveEye side="right" kind={kind} frame={frame} seed={seed}/>
  </g>
  <g data-part="nose">
   <path d="M0 4L-2 10Q0 13 3 11" stroke="#ac806a" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
   <path d="M2 4L3 8" stroke={SKIN.light} strokeWidth="1.1" fill="none" opacity=".6"/>
  </g>
  <g data-part="mouth">
   <path d={'M-7.5 19Q0 '+(21.2+smile)+' 7.5 19'} stroke="#9c6e67" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
   <path d="M-3.2 24Q.3 25.2 3.5 24" stroke="#fff1d4" strokeWidth="1.0" fill="none" opacity=".7"/>
  </g>
  {kind==='adam'?<AdamFringe frame={frame} seed={seed}/>:<EveFringe frame={frame} seed={seed}/>}
  <SideLocks kind={kind} frame={frame} seed={seed}/>
 </g>;
};
