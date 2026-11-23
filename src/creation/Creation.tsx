import React,{useMemo} from 'react';
import {AbsoluteFill,Sequence,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {animate,type CharacterScript} from '../core/animator';
import {renderCharacter} from '../core/CharacterRig';
import {mouthAt,provisionalVisemes} from '../core/lipsync';
import {clamp,smooth} from '../core/util';
import type {Cue} from '../core/gestures';
import type {ExprName} from '../core/pose';
import {STORY,WORDS,PAGES,FPS,TOTAL,sceneAt,wordAt,amplitudeAt} from './timing';
import {renderWorld,THEMES,type Scene} from './world';
import {SceneCastLayer} from './SceneCast';
import SOUND from './sound.json';

export type CreationProps={captions:boolean;withAudio:boolean};
const TYPE='Bahnschrift, "Arial", sans-serif';
const ACCENT='#f4c66f';
const mouthTracks=WORDS.map(w=>provisionalVisemes(w.text,(w.endMs-w.startMs)/1000));

const World:React.FC<{scene:Scene;globalFrame:number}>=({scene,globalFrame})=>{
 const local=useCurrentFrame();
 const {width,height}=useVideoConfig();
 const html=useMemo(()=>renderWorld(local+scene.start,scene,width,height),[local,scene,width,height]);
 const index=STORY.scenes.findIndex(s=>s.id===scene.id);
 const previous=index>0?STORY.scenes[index-1]:null;
 // Overlay a held frame from the preceding scene instead of flashing empty scenery at a cut.
 // No Sequence timing changes: narration and captions retain their original frame alignment.
 const transitionFrames=scene.id==='light'||scene.id==='humanity'?20:16;
 const previousHtml=useMemo(()=>{
  if(!previous||local>=transitionFrames)return null;
  return renderWorld(previous.end-1,previous,width,height);
 },[previous,local,width,height,transitionFrames]);
 const progress=smooth(local/transitionFrames);
 return <>
  <div style={{position:'absolute',inset:0}} dangerouslySetInnerHTML={{__html:html}}/>
  <SceneCastLayer scene={scene} globalFrame={globalFrame}/>
  {previousHtml&&<div data-scene-transition="true" style={{
   position:'absolute',inset:0,pointerEvents:'none',
   opacity:1-progress,
   scale:1+progress*.008,
  }} dangerouslySetInnerHTML={{__html:previousHtml}}/>}
 </>;
};

function actorScript(width:number,height:number):CharacterScript {
 const vertical=height>width;
 const anchor=()=>({x:width*(vertical?.5:.21),y:height*.75,scale:vertical?1.1:.94});
 const gestures:Cue['gesture'][]=['thoughtful','listening','pointing','explaining','pointing','happy','pointing','happy','pointing','talking','explaining','happy','listening','thoughtful'];
 const expressions:ExprName[]=['thoughtful','listening','wow','calm','happy','happy','thoughtful','happy','calm','tender','tender','happy','tender','thoughtful'];
 const cues:Cue[]=STORY.scenes.map((s,i)=>({at:s.start+6,gesture:gestures[i],hold:75,side:i%2?'left':'right',expr:expressions[i],target:{x:width*(vertical?.6:.72),y:height*.36}}));
 const looks=STORY.scenes.flatMap((s,i)=>[{at:s.start,target:null,head:.3},{at:s.start+45,target:i===0||i===13?null:{x:width*.7,y:height*.37},head:.4}]);
 return {anchor,cues,looks,speech:[],baseExpr:'calm'};
}

const Presenter:React.FC=()=>{
 const frame=useCurrentFrame();
 const {width,height}=useVideoConfig();
 const script=useMemo(()=>actorScript(width,height),[width,height]);
 const scene=sceneAt(frame),t=frame-scene.start;
 // The narrator introduces the scene, then yields the frame to the featured artwork.
 // The presenter remains intact throughout the film; only these two beats use shorter coverage.
 const visibleFor=scene.id==='hook'?220:
  scene.id==='humanity'?Math.min(55,scene.end-scene.start):
  scene.id==='eden'?Math.min(110,scene.end-scene.start):
  Math.min(130,scene.end-scene.start);
 if(t>=visibleFor||frame>=STORY.markers.close+15) return null;
 const opacity=(scene.start===0?1:smooth(t/10))*smooth((visibleFor-t)/12);
 const rig=animate(frame,script);
 const index=wordAt(frame),activity=amplitudeAt(frame);
 if(index>=0&&activity>.012) {
  const word=WORDS[index];
  const shape=mouthAt(mouthTracks[index],frame/FPS-word.startMs/1000);
  rig.mouth={...rig.mouth,...shape,open:(.12+shape.open*.8)*Math.sqrt(activity)};
  if(word.emphasis) {
   const beat=Math.sin(Math.PI*clamp((frame/FPS*1000-word.startMs)/(word.endMs-word.startMs)));
   rig.headTilt+=beat*1.4;rig.browL+=beat*1.5;rig.browR+=beat*.7;
  }
 } else rig.mouth={...rig.mouth,open:0,teeth:0,tongue:0};
 const theme=THEMES[scene.id];
 const html=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-presenter="true">${renderCharacter(rig,{key:theme.accent,fill:'#83acbf',strength:scene.id==='light'?.4:.23})}</svg>`;
 return <div style={{position:'absolute',inset:0,opacity,filter:'drop-shadow(0 7px 9px #02091155)'}} dangerouslySetInnerHTML={{__html:html}}/>;
};

const Titles:React.FC=()=>{
 const frame=useCurrentFrame();
 const {width,height}=useVideoConfig();
 const vertical=height>width,scene=sceneAt(frame),t=frame-scene.start;
 const duration=Math.min(scene.id==='hook'?240:135,scene.end-scene.start-12);
 const opacity=smooth(t/12)*smooth((duration-t)/18);
 if(opacity<=0||frame>=STORY.markers.close)return null;
 return <div style={{position:'absolute',left:'8%',right:vertical?'8%':'48%',top:'8%',opacity,translate:`0 ${(1-smooth(t/18))*18}px`,fontFamily:TYPE,color:'#fff5dd'}}>
  <div style={{fontSize:vertical?23:20,fontWeight:600,letterSpacing:5,color:ACCENT,marginBottom:22}}>{scene.reference.toUpperCase()}</div>
  <div style={{fontWeight:800,fontSize:vertical?104:86,lineHeight:1.01,letterSpacing:-2,whiteSpace:'pre-line',textShadow:'0 3px 18px #07132144'}}>{scene.title}</div>
 </div>;
};

const Subtitles:React.FC=()=>{
 const frame=useCurrentFrame(),ms=frame/FPS*1000;
 const {width,height}=useVideoConfig();
 const page=PAGES.find(p=>ms>=p.startMs&&ms<p.endMs);
 if(!page)return null;
 return <div data-subtitles="true" data-page-start={page.startMs} style={{position:'absolute',left:'8%',right:'8%',bottom:height>width?'13.5%':'7%',display:'flex',justifyContent:'center',fontFamily:TYPE,fontSize:height>width?53:44,fontWeight:500,lineHeight:1.2,color:'#fff9ef',textAlign:'center'}}>
  <div style={{maxWidth:height>width?920:1240,padding:'12px 22px',borderRadius:12,background:'rgba(3,12,22,.73)',boxShadow:'0 5px 24px #02091233'}}>
   {page.wordIndices.map((index,i)=>{
    const word=WORDS[index],highlight=word.emphasis&&ms>=word.startMs;
    return <React.Fragment key={index}>{i>0?' ':null}<span data-word={index} data-emphasized={highlight?'true':'false'} style={{color:highlight?ACCENT:'#fff9ef',fontWeight:word.emphasis?800:500,textShadow:highlight?'0 0 15px #c59a3322':'none'}}>{word.text}</span></React.Fragment>;
   })}
  </div>
 </div>;
};

const Finishing:React.FC=()=>{
 const frame=useCurrentFrame();
 const {width,height,fps,durationInFrames}=useVideoConfig();
 const fade=smooth((frame-STORY.markers.close)/Math.round(.5*fps));
 const title=smooth((frame-STORY.markers.close-Math.round(.6*fps))/Math.round(.25*fps));
 const light=smooth((frame-STORY.markers.light)/3)*(1-smooth((frame-STORY.markers.light-3)/18));
 return <>
  <AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,rgba(2,8,16,.18),transparent 28%,transparent 67%,rgba(2,8,16,.45))'}}/>
  <AbsoluteFill style={{pointerEvents:'none',background:'#fff2cc',opacity:light*.46}}/>
  {frame>=STORY.markers.close&&<AbsoluteFill data-ending="true" style={{background:'#000',opacity:fade,alignItems:'center',justifyContent:'center'}}>
   <div style={{opacity:title,fontFamily:'"Arial Black", Arial, sans-serif',fontWeight:900,fontSize:width*(height>width?.14:.1),letterSpacing:width*.004,color:'#fff',lineHeight:1}}>SHALÓM</div>
  </AbsoluteFill>}
 </>;
};

function duckMusic(frame:number) {
 const ms=frame/FPS*1000;
 const active=STORY.words.some(w=>ms>=w.startMs-100&&ms<w.endMs+140);
 return (active?SOUND.musicSpeakingGain:SOUND.musicGapGain)*smooth((TOTAL-frame)/30);
}

const Sound:React.FC=()=> <>
 <Audio name="Marcus · audio original completo" src={staticFile(STORY.file)} durationInFrames={Math.ceil(STORY.durationSec*FPS)} volume={SOUND.voiceGain}/>
 <Audio name="Música original · nueva creación" src={staticFile('audio/creation/music.wav')} durationInFrames={TOTAL} volume={duckMusic}/>
 <Audio name="Efectos · mezcla para teléfono" src={staticFile('audio/creation/effects.wav')} durationInFrames={TOTAL} volume={SOUND.effectsGain}/>
</>;

export const Creation:React.FC<CreationProps>=({captions,withAudio})=>{
 const frame=useCurrentFrame();
 return <AbsoluteFill data-creation-frame={frame} style={{background:'#07101c',overflow:'hidden'}}>
  {STORY.scenes.map(scene=><Sequence key={scene.id} name={scene.title.replace('\n',' ')} from={scene.start} durationInFrames={scene.end-scene.start}><World scene={scene} globalFrame={frame}/></Sequence>)}
  <Presenter/>
  <Titles/>
  <Finishing/>
  {captions&&<Subtitles/>}
  {withAudio&&<Sound/>}
 </AbsoluteFill>;
};
