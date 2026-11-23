import React from 'react';
import {interpolate,spring,useCurrentFrame,useVideoConfig} from 'remotion';
import type {Scene} from './world';
import {worldStage} from './worldStage';
import {CharacterHead,CharacterHairBack} from './CharacterHeads';

/**
 * Source-editable, layered 2D SVG cast. These are REAL React <g> components,
 * not flattened paths in the string-based world renderer.
 * Every movement depends solely on a frame and a stable seed.
 */
export interface FigureProps {x:number;y:number;scale:number;frame:number;seed?:number}
type HumanKind='adam'|'eve';
const wave=(frame:number,rate:number,seed:number)=>Math.sin(frame*rate+seed);
const rise=(frame:number,phase:number)=>interpolate(frame,[phase,phase+6,phase+11,phase+15],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
const blinking=(frame:number,seed:number)=>{
 const phase=((frame+seed*37)%157+157)%157;
 return rise(phase,68);
};

/** The entire cranial construction now shares one head SVG in CharacterHeads.tsx. */
function PortraitFace({kind,frame,seed}:{kind:HumanKind;frame:number;seed:number}) {
 return <CharacterHead kind={kind} frame={frame} seed={seed}/>;
}

function HumanFigure({kind,x,y,scale,frame,seed=0}:FigureProps&{kind:HumanKind}) {
 const feminine=kind==='eve';
 const color=feminine?'#e5c99d':'#a4c2b2';
 const low=feminine?'#b79a72':'#6e9586';
 const light=feminine?'#f6e4be':'#d4e5d1';
 const breath=wave(frame,.017,seed+3)*1.35;
 const sway=wave(frame,.007,seed+4)*1.4;
 const armL=wave(frame,.012,seed+2)*2.1,armR=wave(frame,.014,seed+6)*2.2;
 const nod=wave(frame,.010,seed+5)*1.3;
 return <g data-organic="human" data-character-design={kind} transform={'translate('+x+' '+y+') scale('+scale+')'}>
  <g data-part="ground-shadow"><ellipse cy="34" rx="36" ry="8" fill="#102c2d" opacity=".26"/></g>
  <g data-part="weight-shift" transform={'translate('+sway+' 0)'}>
   <g data-part="legs">
    <path d="M-16 -27Q-18 0 -16 28" stroke="#395359" strokeWidth="15" strokeLinecap="round" fill="none"/>
    <path d="M15 -27Q16 0 15 28" stroke="#344b52" strokeWidth="15" strokeLinecap="round" fill="none"/>
    <path d="M-25 28Q-13 22 -5 28L-5 34H-28Z M5 28Q17 23 25 29V34H5Z" fill="#a18e74"/>
    <path d="M-25 33H-6M6 33H25" stroke="#f2dfbc" strokeWidth="1.8" opacity=".63"/>
   </g>
   <g data-part="breathing" transform={'translate(0 '+breath+')'}>
    {feminine&&<g data-part="long-hair-behind-clothes" transform={'translate(0 -162) rotate('+nod+')'}>
     <CharacterHairBack kind="eve" frame={frame} seed={seed}/>
    </g>}
    <g data-part="arms-left" transform={'rotate('+armL+' -26 -118)'}>
     <path d="M-27 -116Q-41 -107 -39 -88L-43 -58Q-39 -48 -33 -50L-22 -85Z" fill={color} stroke={low} strokeWidth="1"/>
     <path d="M-38 -82Q-42 -70 -42 -60" fill="none" stroke={light} strokeWidth="2.2" opacity=".55"/>
     <ellipse cx="-40" cy="-51" rx="6.2" ry="9" fill="#dfb391"/>
    </g>
    <g data-part="arms-right" transform={'rotate('+armR+' 27 -118)'}>
     <path d="M27 -116Q43 -106 41 -88L45 -58Q41 -48 35 -50L23 -86Z" fill={color} stroke={low} strokeWidth="1"/>
     <path d="M39 -83Q43 -70 43 -60" stroke={light} strokeWidth="2.1" opacity=".55" fill="none"/>
     <ellipse cx="42" cy="-51" rx="6.2" ry="9" fill="#dfb391"/>
    </g>
    <g data-part="body-and-clothing">
     <path d="M-15 -133Q-31 -127 -31 -102Q-32 -73 -43 -27Q-1 -12 43 -27Q32 -76 30 -102Q29 -127 13 -133Z" fill={color} stroke={low} strokeWidth="1.2"/>
     <path d="M-18 -124Q-31 -86 -26 -54M17 -123Q30 -86 26 -53" stroke={light} strokeWidth="2.8" fill="none" opacity=".52"/>
     <path d="M-27 -55Q0 -49 28 -55" stroke={low} strokeWidth="4.5" fill="none" opacity=".45"/>
     <path d="M-35 -31Q-4 -20 35 -31" stroke={light} strokeWidth="2.3" fill="none" opacity=".5"/>
     {feminine&&<path d="M-31 -102Q-15 -110 0 -100Q15 -110 31 -102" stroke="#fff0d0" strokeWidth="2.3" fill="none" opacity=".5"/>}
    </g>
    <g data-part="head-pivot" transform={'translate(0 -162) rotate('+nod+')'}>
     <PortraitFace kind={kind} frame={frame} seed={seed}/>
    </g>
   </g>
  </g>
 </g>;
}

export const AdamCharacter:React.FC<FigureProps>=props=><HumanFigure kind="adam" {...props}/>;
export const EveCharacter:React.FC<FigureProps>=props=><HumanFigure kind="eve" {...props}/>;

export interface LlamaProps extends FigureProps {juvenile?:boolean}
function JointLeg({front,side,frame,seed}:{front:boolean;side:'left'|'right';frame:number;seed:number}) {
 const x=side==='left'?-56:45;
 const hip=wave(frame,front?.012:.011,seed+(front?3:7))*1.35;
 const knee=wave(frame,.013,seed+(front?7:5))*1.1;
 const shade=front?'#ae9272':'#947c67';
 return <g data-part={front?'front-leg':'rear-leg'} transform={'translate('+x+' -98) rotate('+hip+')'} opacity={front?1:.73}>
  <path d="M-6 0Q-12 23 -2 48" stroke={shade} strokeWidth="15" strokeLinecap="round" fill="none"/>
  <g transform={'translate(-2 48) rotate('+knee+')'}>
   <path d="M0 0Q4 26 1 44" stroke={shade} strokeWidth="12" strokeLinecap="round" fill="none"/>
   <path d="M-7 41Q7 39 18 45Q20 51 13 51H-8Z" fill={front?'#635e58':'#5c5653'}/>
   <path d="M3 47h11" stroke="#ae9d81" strokeWidth="1.4" opacity=".7"/>
  </g>
 </g>;
}

export const LlamaLikeAnimal:React.FC<LlamaProps>=({x,y,scale,frame,seed=0,juvenile=false})=>{
 const breath=wave(frame,.019,seed+8)*1.25;
 const headTilt=wave(frame,.011,seed+2)*1.8;
 const ear=wave(frame,.020,seed+4)*1.9;
 const tail=wave(frame,.023,seed+6)*4;
 const eyeBlink=blinking(frame,seed+4);
 const warm=juvenile?'#d9b58e':'#cfad85';
 const shade=juvenile?'#aa8c72':'#a3896f';
 const light='#f3d3a5';
 return <g data-organic="animal" data-character-design="llama" data-age={juvenile?'juvenile':'adult'} transform={'translate('+x+' '+y+') scale('+scale+')'}>
  <g data-part="ground-shadow"><ellipse cy="10" rx="115" ry="16" fill="#0c302d" opacity=".22"/></g>
  <JointLeg front={false} side="left" frame={frame} seed={seed}/>
  <JointLeg front={false} side="right" frame={frame+18} seed={seed+3}/>
  <g data-part="tail" transform={'rotate('+tail+' -89 -134)'}>
   <path d="M-86 -137Q-107 -156 -121 -145" fill="none" stroke={shade} strokeWidth="8" strokeLinecap="round"/>
   <path d="M-116 -144Q-124 -153 -129 -147" fill="none" stroke={light} strokeWidth="3" strokeLinecap="round"/>
  </g>
  <g data-part="torso-and-chest" transform={'translate(0 '+breath+')'}>
   <path d="M-94 -121Q-88 -158 -48 -161Q17 -166 59 -143Q75 -126 73 -100Q49 -83 19 -81L-61 -88Q-95 -96 -94 -121Z" fill={warm} stroke="#8a7561" strokeWidth="1.6"/>
   <path d="M-84 -126Q-43 -154 5 -149Q40 -149 61 -131" fill="none" stroke={light} strokeWidth="5" strokeLinecap="round" opacity=".65"/>
   <path d="M-53 -94Q7 -78 61 -105Q45 -86 17 -81L-53 -88Z" fill={shade} opacity=".52"/>
   <path d="M44 -131Q66 -136 74 -112Q78 -101 67 -89Q50 -93 39 -114Z" fill="#b79774" opacity=".4"/>
   <g data-part="chest-fur" fill="#e9c79c" opacity=".8">
    <path d="M47 -112Q59 -107 55 -93Q64 -102 67 -91Q73 -101 65 -114Z"/>
    <path d="M-49 -91Q-6 -78 32 -92Q-3 -82 -39 -88Z" opacity=".55"/>
   </g>
  </g>
  <g data-part="neck-pivot" transform={'translate(56 -115) rotate('+headTilt+')'}>
   <g data-part="neck">
    <path d="M-9 2Q9 -26 9 -83Q9 -98 20 -101L39 -98Q35 -56 36 -17Q34 0 17 13Z" fill={shade} stroke="#8d725a" strokeWidth="1.2"/>
    <path d="M14 -91Q17 -50 16 -11" stroke={light} strokeWidth="4" opacity=".53" fill="none"/>
    <path d="M24 -82Q30 -51 29 -15" stroke="#7f6959" strokeWidth="2" opacity=".3" fill="none"/>
   </g>
   <g data-part="head" transform="translate(19 -93)">
    <path d="M-11 -2Q-9 -24 13 -30Q38 -31 46 -8L57 1Q52 10 31 12L14 14Q-8 12 -11 -2Z" fill={warm} stroke="#97795e" strokeWidth="1.25"/>
    <path d="M13 -20Q33 -29 43 -14" stroke={light} strokeWidth="3" fill="none" opacity=".6"/>
    <path data-part="forehead-fur" d="M-2 -14Q5 -27 14 -29Q25 -25 26 -22Q19 -21 16 -16Z" fill="#e8c99d" opacity=".63"/>
    <g data-part="ears" transform={'rotate('+ear+' 13 -20)'}>
     <path d="M9 -21L-1 -56Q14 -52 22 -25Z" fill={shade}/>
     <path d="M13 -28L7 -47Q14 -42 18 -29Z" fill="#e9c79f"/>
     <path d="M29 -25L37 -59Q48 -48 42 -22Z" fill={shade}/>
     <path d="M36 -30L39 -49Q44 -40 39 -28Z" fill="#ebc99e"/>
    </g>
    <g data-part="muzzle">
     <path d="M31 -6Q48 -10 62 3L55 14Q41 18 30 11Z" fill="#e4c29b"/>
     <path d="M48 8Q53 10 58 8" stroke="#876b59" strokeWidth="1.4" fill="none"/>
     <ellipse cx="58" cy="4" rx="2.3" ry="1.7" fill="#80634f"/>
    </g>
    <g data-part="eye">
     <ellipse cx="33" cy="-10" rx="5.1" ry={4.5*(1-eyeBlink)+.3} fill="#423f39"/>
     <circle cx="34" cy="-12" r="1.3" fill="#fff6de"/>
     <path d="M27 -15Q33 -19 39 -14" stroke="#67564d" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </g>
    <path d="M2 -16Q8 -20 17 -19" stroke={light} strokeWidth="2" fill="none" opacity=".55"/>
   </g>
  </g>
  <JointLeg front side="left" frame={frame+8} seed={seed+4}/>
  <JointLeg front side="right" frame={frame+26} seed={seed+7}/>
 </g>;
};
export const AnimalCharacter=LlamaLikeAnimal;

/** Cast only: the original landscape, subtitles, audio and presenter are untouched. */
export const SceneCastLayer:React.FC<{scene:Scene;globalFrame:number}>=({scene,globalFrame})=>{
 const local=useCurrentFrame();
 const {width,height,fps}=useVideoConfig();
 const frame=local+scene.start;
 if(!['animals','humanity','stewardship','good'].includes(scene.id)||globalFrame<scene.start||globalFrame>=scene.end)return null;
 const stage=worldStage(frame,scene,width,height);
 const entrance=spring({fps,frame:Math.max(0,local),config:{damping:200,stiffness:90}});
 const opacity=interpolate(local,[0,12],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const vertical=height>width;
 const personScale=vertical?1.99:2.49;
 return <svg data-character-cast={scene.id} width={width} height={height} viewBox={'0 0 '+width+' '+height} style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'visible',opacity}}>
  <g transform={'translate('+stage.x+' '+stage.y+') scale('+stage.scale+')'}>
   <g transform={'translate(0 '+((1-entrance)*7)+')'}>
    {scene.id==='animals'?<>
     <LlamaLikeAnimal x={-170} y={190} scale={1.2} frame={frame} seed={1}/>
     <LlamaLikeAnimal x={172} y={183} scale={.86} frame={frame} seed={5}/>
     <LlamaLikeAnimal x={342} y={205} scale={.59} frame={frame} seed={10} juvenile/>
    </>:scene.id==='good'?<>
     <AdamCharacter x={20} y={135} scale={.65} frame={frame} seed={3}/>
     <EveCharacter x={75} y={135} scale={.65} frame={frame} seed={7}/>
    </>:<>
     <AdamCharacter x={-121} y={192} scale={personScale} frame={frame} seed={3}/>
     <EveCharacter x={122} y={192} scale={personScale} frame={frame} seed={7}/>
    </>}
   </g>
  </g>
 </svg>;
};
