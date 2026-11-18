import {Vec2,clamp,lerp,smooth} from './util.js';
import {ExprName,Expression,EXPR,DEFAULT_EXPR,IDLE,Pose,mixExpr} from './pose.js';
import {Cue,ResolvedCue,poseAt,resolve} from './gestures.js';
import {MouthShape,SHAPES,VisemeTrack,mouthAt} from './lipsync.js';
import {beat,blink,breath,easeInOut,easeOut,fbm,lastEvent,saccade,weightShift} from './motion.js';

/** Everything the SVG rig needs to draw one frame. Pure data, no behaviour. */
export interface RigState{
 atX:number;atY:number;scale:number;
 lSh:number;lEl:number;lWr:number;rSh:number;rEl:number;rWr:number;
 lFing:number[];rFing:number[];lSpread:number;rSpread:number;
 lean:number;shift:number;lift:number;breath:number;shrugL:number;shrugR:number;
 headTilt:number;yaw:number;pitch:number;crest:number;strings:number;
 blink:number;eyeOpen:number;squint:number;gazeX:number;gazeY:number;
 browL:number;browR:number;browTilt:number;blush:number;
 mouth:{open:number;wide:number;smile:number;teeth:number;bite:number;tongue:number;press:number};
 frontArms:boolean;
}
export interface Anchor{x:number;y:number;scale:number}
export interface LookCue{at:number;target:Vec2|null;head?:number}       // null = look at the viewer
export interface SpeechWindow{start:number;end:number;track:VisemeTrack}
export interface CharacterScript{
 cues:Cue[];looks:LookCue[];speech:SpeechWindow[];
 baseExpr:ExprName;exprOverrides?:{at:number;expr:ExprName}[];
 anchor:(frame:number)=>Anchor;
}

/** Shoulder pivots in world space (used to aim pointing arms). */
export const SHOULDER_X=119,SHOULDER_Y=-231,HEAD_Y=-381;
export const shouldersAt=(a:Anchor)=>({
 shoulderL:{x:a.x-SHOULDER_X*a.scale,y:a.y+SHOULDER_Y*a.scale},
 shoulderR:{x:a.x+SHOULDER_X*a.scale,y:a.y+SHOULDER_Y*a.scale},
});

const resolveCache=new WeakMap<CharacterScript,{rc:ResolvedCue[];segs:{at:number;expr:ExprName}[];extra:number[]}>();
function prepare(script:CharacterScript){
 let c=resolveCache.get(script);
 if(c)return c;
 const rc=resolve(script.cues);
 const segs:{at:number;expr:ExprName}[]=[];
 for(const k of rc){
  segs.push({at:k.at+Math.floor(k.timing.prep*.6),expr:k.expr??DEFAULT_EXPR[k.gesture]});
  segs.push({at:k.end-Math.floor(k.timing.rec*.7),expr:script.baseExpr});
 }
 for(const o of script.exprOverrides??[])segs.push(o);
 segs.sort((a,b)=>a.at-b.at);
 // blinks that humans do when they start a gesture or shift their gaze
 const extra=[...rc.map(k=>k.at+k.timing.prep+Math.floor(k.timing.exec*.45)),...script.looks.map(l=>l.at+3)].sort((a,b)=>a-b);
 c={rc,segs,extra};resolveCache.set(script,c);return c;
}

/** Expression = fold over the segments: each one cross-fades (16 f) from whatever the face was doing when it began. */
function exprAt(frame:number,segs:{at:number;expr:ExprName}[],base:ExprName,hi=-2,depth=0):Expression{
 const i=hi===-2?lastEvent(segs.map(s=>s.at),frame):hi;
 if(i<0)return EXPR[base];
 if(depth>3)return EXPR[segs[i].expr];
 const from=exprAt(segs[i].at,segs,base,i-1,depth+1);
 return mixExpr(from,EXPR[segs[i].expr],easeInOut((frame-segs[i].at)/16));
}

function gazeAt(frame:number,looks:LookCue[],eye:Vec2):{gx:number;gy:number;hx:number;hy:number}{
 const toG=(l:LookCue|undefined)=>{
  if(!l||!l.target)return {gx:0,gy:.06,hx:0,hy:0,hw:.3};
  const dx=l.target.x-eye.x,dy=l.target.y-eye.y;
  const gx=clamp(dx/1500,-1,1)*.9,gy=clamp(dy/900,-1,1)*.9;
  const hw=l.head??.4;
  return {gx,gy,hx:clamp(dx/900,-1,1)*hw,hy:clamp(dy/700,-1,1)*hw*.8,hw};
 };
 const i=lastEvent(looks.map(l=>l.at),frame);
 const cur=toG(i<0?undefined:looks[i]),prev=toG(i<=0?undefined:looks[i-1]);
 const eU=i<0?1:easeOut((frame-looks[i].at)/5);          // eyes lead (saccade ≈ 5 f)
 const hU=i<0?1:easeInOut((frame-looks[i].at-3)/24);     // head follows 3 f later, slower
 return {gx:lerp(prev.gx,cur.gx,eU),gy:lerp(prev.gy,cur.gy,eU),hx:lerp(prev.hx,cur.hx,hU),hy:lerp(prev.hy,cur.hy,hU)};
}

/** The complete, deterministic character animation: one pure function of the absolute frame. */
export function animate(frame:number,script:CharacterScript):RigState{
 const {rc,segs,extra}=prepare(script);
 const anchor=script.anchor(frame),ctx=shouldersAt(anchor);
 const P=(df:number):Pose=>poseAt(frame-df,rc,ctx);
 const p0=P(0),p1=P(2),p2=P(4),p3=P(6);

 /* ---- idle layer: breathing, weight shift, micro-sway --------------------------------- */
 const br=breath(frame),ws=weightShift(frame);
 const sway=fbm(frame*.011,2);
 const shift=p0.shift+ws*6.5+sway*1.2;
 const lean=p0.lean+ws*-.5+sway*.35;

 /* ---- face ------------------------------------------------------------------------- */
 const ex=exprAt(frame,segs,script.baseExpr);
 const eye={x:anchor.x,y:anchor.y+HEAD_Y*anchor.scale};
 const g=gazeAt(frame,script.looks,eye);
 const sc=saccade(frame,61,.07);
 const b=blink(frame,extra);
 const sp=script.speech.find(s=>frame>=s.start-4&&frame<=s.end+8);
 const spk=sp?smooth((frame-sp.start+4)/5)*(1-smooth((frame-sp.end)/7)):0;
 const shape:MouthShape=sp?mouthAt(sp.track,(frame-sp.start)/30):SHAPES.X;
 const accent=sp?beat(frame)*spk:0;

 const smileVar=.1*fbm(frame*.013,21);                      // varied smiles
 const smile=clamp(ex.smile+smileVar,-.4,1.1);
 const pressK=1-.28*shape.press*spk;
 const rest={open:ex.mouthOpen,wide:ex.mouthWide,teeth:ex.mouthOpen>.3?1:0,bite:0,tongue:ex.mouthOpen>.5?.4:0,press:0};
 const talk={
  open:clamp(shape.open*(.9+.2*ex.eyeOpen)+.06*accent),
  wide:clamp(shape.wide+ex.mouthWide*.25,-1,1),
  teeth:shape.teeth,bite:shape.bite,tongue:shape.tongue,press:shape.press,
 };
 const mouth={
  open:lerp(rest.open,talk.open,spk),wide:lerp(rest.wide,talk.wide,spk),teeth:lerp(rest.teeth,talk.teeth,spk),
  bite:talk.bite*spk,tongue:lerp(rest.tongue,talk.tongue,spk),press:talk.press*spk,smile:smile*pressK,
 };

 /* ---- head: follows gaze, lags torso, gets micro-motion --------------------------------- */
 const hp=P(3);
 const headTilt=hp.tilt+1.0*fbm(frame*.017,4);
 const yaw=clamp(hp.yaw+g.hx+.05*fbm(frame*.02,8),-.8,.8);
 const pitch=clamp(hp.pitch+g.hy+.03*br+.04*accent,-.7,.7);

 /* ---- secondary motion (crest + hoodie strings drag behind head/torso motion) ------------ */
 let crest=0,strings=0;
 for(let j=0;j<6;j++){
  const a=P(3+j),c=P(4+j),w=Math.pow(.72,j);
  crest+=-(a.tilt+a.lean+a.yaw*3-(c.tilt+c.lean+c.yaw*3))*w*7;
  strings+=-(a.lean-c.lean)*w*6-(a.shift-c.shift)*w*1.2;
 }
 crest=clamp(crest,-10,10);strings=clamp(strings,-14,14);

 /* ---- arms: distal joints follow with delay (overlapping action) --------------------------- */
 const lSh=p0.lSh,rSh=p0.rSh,lEl=p1.lEl,rEl=p1.rEl;
 // the wrist follows the pose with a longer delay, expressed as a LOCAL angle so it never snaps relative to the forearm
 const lWr=p2.lHand-p2.lSh-p2.lEl,rWr=p2.rHand-p2.rSh-p2.rEl;
 const front=(p0.rSh>-60&&p0.rEl>100)||(p0.lSh<60&&p0.lEl<-100);

 return {
  atX:anchor.x,atY:anchor.y,scale:anchor.scale,
  lSh,lEl,lWr,rSh,rEl,rWr,
  lFing:[p3.lF0,p3.lF1,p3.lF2,p3.lF3,p3.lF4],rFing:[p3.rF0,p3.rF1,p3.rF2,p3.rF3,p3.rF4],lSpread:p3.lSp,rSpread:p3.rSp,
  lean,shift,lift:p0.lift,breath:br,shrugL:p0.shrugL+br*1.6,shrugR:p0.shrugR+br*1.6,
  headTilt,yaw,pitch,crest,strings,
  blink:b,eyeOpen:ex.eyeOpen*(1+.025*accent),squint:ex.squint,
  gazeX:clamp(g.gx+sc.x,-1,1),gazeY:clamp(g.gy+sc.y,-1,1),
  browL:ex.browL+.8*fbm(frame*.02,31)+1.6*accent,browR:ex.browR+.8*fbm(frame*.02,32)+1.6*accent,browTilt:ex.browTilt,blush:ex.blush,
  mouth,frontArms:front,
 };
}

/** Utility for tests / the joint demo: a script with only cues, no speech. */
export const simpleScript=(cues:Cue[],anchor:Anchor,looks:LookCue[]=[],baseExpr:ExprName='calm'):CharacterScript=>({
 cues,looks,speech:[],baseExpr,anchor:()=>anchor,
});
export {IDLE};
