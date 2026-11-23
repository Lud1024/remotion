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

/** Readable hand silhouette with four suggested fingers and a separate thumb.
 * All fingers remain a single low-cost shape; knuckle accents are vector strokes. */
function OrganicHand({side,frame,seed}:{side:'left'|'right';frame:number;seed:number}) {
 const relax=wave(frame,.013,seed+(side==='left'?1:4))*.7;
 return <g data-part={'hand-'+side} transform={'translate(13 55) rotate('+relax+')'}>
  <path d="M-5 -6C-7 -4 -7 1 -6 5L-5 13Q-5 17 -2 17Q0 17 0 14
   L1 19Q2.8 22 5 20L5.8 15Q8 19 10.4 16L11 11
   Q13 13 15 10Q16.5 7 13 5L9 4L7 -4Q2 -7 -5 -6Z"
   fill="#ddb18f" stroke="#b7886d" strokeWidth=".95" strokeLinejoin="round"/>
  <path d="M-5 1Q-4 8 -3 12M1 9Q2 14 1 18M6 9Q7 12 6 16"
   stroke="#a77862" strokeWidth=".85" strokeLinecap="round" opacity=".55" fill="none"/>
  <path d="M-2 -3Q3 -6 6 -1" stroke="#f4d4b4" strokeWidth="1.7" opacity=".56" strokeLinecap="round" fill="none"/>
  <path d="M8 6Q10 7 11 9" stroke="#c99b7d" strokeWidth="1.1" opacity=".65" fill="none"/>
 </g>;
}

/** Loose fabric flows from the shoulder into a soft elbow and narrow wrist. */
function FabricArm({side,frame,seed,base,shade,light}:{
 side:'left'|'right';frame:number;seed:number;base:string;shade:string;light:string
}) {
 const right=side==='right',sign=right?1:-1;
 const angle=(right?1:-1)*(1.3+wave(frame,.012,seed+(right?2:5))*2);
 return <g data-part={'arms-'+side}
  transform={'translate('+(right?27:-27)+' -120) rotate('+angle+') scale('+sign+' 1)'}>
  <path d="M-3 2C5 -5 15 2 16 13Q18 23 14 33L15 50
   Q15 57 9 57L5 56Q1 51 2 45L4 25Q-2 14 -3 2Z"
   fill={shade} opacity=".55"/>
  <path d="M-4 -2C5 -7 15 -1 18 12C20 23 14 31 15 48
   Q17 56 11 59Q5 61 3 54C0 45 7 34 4 24Q-2 12 -4 -2Z"
   fill={base} stroke={shade} strokeWidth=".9" strokeLinejoin="round"/>
  <path d="M-2 5C9 9 13 18 12 26M8 35Q5 44 10 51"
   fill="none" stroke={light} strokeWidth="2.25" opacity=".5" strokeLinecap="round"/>
  <path d="M7 53Q13 54 15 50" stroke={shade} strokeWidth="1.65" opacity=".67" fill="none"/>
  <OrganicHand side={side} frame={frame} seed={seed}/>
 </g>;
}

/** Small folds and imperfect hems give the garments weight without textures. */
function EditorialTunic({feminine,base,shade,light}:{feminine:boolean;base:string;shade:string;light:string}) {
 return <g data-part="body-and-clothing">
  <path d={feminine?
   'M-17 -135C-27 -135 -34 -124 -33 -110C-32 -81 -34 -61 -45 -26Q-25 -18 -2 -20Q20 -18 44 -28C35 -62 33 -88 32 -110C31 -126 24 -134 13 -135Z':
   'M-18 -135C-28 -133 -34 -121 -33 -106C-32 -78 -34 -53 -38 -28Q-15 -21 9 -24Q25 -24 39 -30C35 -62 31 -85 33 -106C33 -126 24 -135 14 -135Z'}
   fill={base} stroke={shade} strokeWidth="1.1"/>
  <path d="M-29 -116Q-25 -95 -27 -79Q-30 -53 -37 -31Q-27 -33 -22 -31
   C-26 -57 -20 -95 -20 -126Z" fill={shade} opacity=".17"/>
  <path d="M17 -129Q27 -116 29 -92Q29 -59 34 -35
   Q27 -42 23 -40Q19 -73 16 -112Z" fill={light} opacity=".17"/>
  <path d={feminine?'M-17 -130Q-10 -123 0 -121Q9 -123 17 -130':'M-17 -131Q-6 -121 6 -123Q14 -126 17 -131'}
   stroke={light} strokeWidth="2.1" fill="none" strokeLinecap="round" opacity=".72"/>
  <path d="M-18 -129Q-9 -132 -3 -126M9 -126Q13 -132 19 -129" fill="none" stroke={shade} strokeWidth="1" opacity=".47"/>
  <path d="M-23 -115C-19 -91 -20 -69 -19 -43M19 -112C17 -88 23 -68 22 -46"
   stroke={light} strokeWidth="2.3" fill="none" strokeLinecap="round" opacity=".38"/>
  <path d="M-26 -72Q-22 -60 -25 -49M27 -72Q23 -60 29 -49"
   stroke={shade} strokeWidth="1.25" fill="none" opacity=".32"/>
  <path d={feminine?'M-27 -59Q-3 -53 27 -59':'M-25 -60Q0 -54 26 -59'}
   stroke={shade} strokeWidth="3.4" opacity=".41" fill="none"/>
  <path d={feminine?'M-42 -28Q-14 -20 6 -22Q27 -22 42 -29':'M-36 -28Q-7 -23 13 -25L37 -30'}
   stroke={light} strokeWidth="1.65" opacity=".61" fill="none"/>
  <path d="M-30 -34Q-17 -26 -6 -25M8 -25Q22 -25 31 -32" stroke={shade}
   strokeWidth=".9" opacity=".34" fill="none"/>
 </g>;
}

function HumanFigure({kind,x,y,scale,frame,seed=0}:FigureProps&{kind:HumanKind}) {
 const feminine=kind==='eve';
 const color=feminine?'#e5c99d':'#a4c2b2';
 const low=feminine?'#b79a72':'#6e9586';
 const light=feminine?'#f6e4be':'#d4e5d1';
 const breath=wave(frame,.017,seed+3)*1.15;
 const sway=wave(frame,.007,seed+4)*1.2;
 const nod=wave(frame,.010,seed+5)*1.3;
 const stance=wave(frame,.006,seed+2)*.55;
 return <g data-organic="human" data-character-design={kind} transform={'translate('+x+' '+y+') scale('+scale+')'}>
  <g data-part="ground-shadow"><ellipse cy="34" rx="36" ry="8" fill="#102c2d" opacity=".24"/></g>
  <g data-part="weight-shift" transform={'translate('+sway+' 0)'}>
   <g data-part="legs">
    <g data-part="leg-left" transform={'rotate('+stance+' -15 -25)'}>
     <path d="M-22 -30Q-24 -4 -23 21Q-22 29 -15 30L-9 29
      Q-8 9 -10 -27Z" fill="#344f55"/>
     <path d="M-21 -27Q-18 -16 -19 18" stroke="#7e9490" strokeWidth="1.2" opacity=".38" fill="none"/>
     <path d="M-23 25C-31 26 -32 33 -27 35H-6
      Q-3 31 -9 27Q-15 24 -23 25Z" fill="#a18e74" stroke="#796c61" strokeWidth=".75"/>
     <path d="M-25 33H-7" stroke="#efdebb" strokeWidth="1.55" opacity=".63"/>
    </g>
    <g data-part="leg-right" transform={'rotate('+(-stance*.85)+' 15 -26)'}>
     <path d="M7 -28Q7 0 9 23Q11 30 17 30L23 27
      Q23 9 23 -28Z" fill="#2e4850"/>
     <path d="M19 -22Q17 -4 20 17" stroke="#7e9490" strokeWidth="1" opacity=".33" fill="none"/>
     <path d="M16 25Q26 24 30 30Q32 34 28 35H7
      Q5 30 10 27Z" fill="#a18e74" stroke="#796c61" strokeWidth=".75"/>
     <path d="M7 33H29" stroke="#efdebb" strokeWidth="1.55" opacity=".63"/>
    </g>
   </g>
   <g data-part="breathing" transform={'translate(0 '+breath+')'}>
    {feminine&&<g data-part="long-hair-behind-clothes" transform={'translate(0 -162) rotate('+nod+')'}>
     <CharacterHairBack kind="eve" frame={frame} seed={seed}/>
    </g>}
    <FabricArm side="left" frame={frame} seed={seed} base={color} shade={low} light={light}/>
    <FabricArm side="right" frame={frame} seed={seed} base={color} shade={low} light={light}/>
    <EditorialTunic feminine={feminine} base={color} shade={low} light={light}/>
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
