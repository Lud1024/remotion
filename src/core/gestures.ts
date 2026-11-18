import {Vec2,clamp,hash} from './util.js';
import {BASE_POSES,ExprName,GestureName,IDLE,POSE_KEYS,Pose,mirror,pointingPose} from './pose.js';
import {beat,easeInOut,easeOut,springStep,fbm,lastEvent,schedule} from './motion.js';

/**
 * Gesture = four phases: PREPARATION (small anticipation in the opposite direction),
 * EXECUTION (ease-out with a controlled overshoot), HOLD (alive, with beats / drift) and
 * RECOVERY (ease-in-out back to neutral). Overlapping gestures are cross-faded by weight
 * normalisation so there are never jumps between poses.
 */
export interface Timing{prep:number;exec:number;hold:number;rec:number;anticip:number;overshoot:number}
export type Side='left'|'right'|'both';
export const TIMING:Record<GestureName,Timing>={
 idle:       {prep:1, exec:1, hold:1, rec:1, anticip:0,  overshoot:0},
 greeting:   {prep:8, exec:23,hold:52,rec:18,anticip:.08,overshoot:.10},
 talking:    {prep:6, exec:15,hold:60,rec:16,anticip:.04,overshoot:.05},
 explaining: {prep:7, exec:19,hold:64,rec:18,anticip:.06,overshoot:.07},
 pointing:   {prep:7, exec:21,hold:60,rec:17,anticip:.08,overshoot:.09},
 surprised:  {prep:3, exec:14,hold:44,rec:18,anticip:.12,overshoot:.14},
 happy:      {prep:6, exec:15,hold:60,rec:18,anticip:.05,overshoot:.07},
 thoughtful: {prep:9, exec:20,hold:70,rec:22,anticip:.03,overshoot:.04},
 celebrating:{prep:5, exec:16,hold:54,rec:18,anticip:.10,overshoot:.12},
 listening:  {prep:9, exec:20,hold:70,rec:20,anticip:.02,overshoot:.03},
};

export interface Cue{
 at:number;                   // absolute frame where the preparation begins
 gesture:GestureName;
 side?:Side;
 hold?:number;prep?:number;exec?:number;rec?:number;
 target?:Vec2;                // screen-space target for pointing
 expr?:ExprName;              // expression to adopt while this cue is active (otherwise gesture default)
}
export interface ResolvedCue extends Cue{timing:Timing;end:number}
export const total=(t:Timing)=>t.prep+t.exec+t.hold+t.rec;

export function resolve(cues:Cue[]):ResolvedCue[]{
 return cues.map(c=>{
  const b=TIMING[c.gesture];
  const timing:Timing={...b,prep:c.prep??b.prep,exec:c.exec??b.exec,hold:c.hold??b.hold,rec:c.rec??b.rec};
  return {...c,timing,end:c.at+total(timing)};
 }).sort((a,b)=>a.at-b.at);
}

/** Weight of a gesture at `local` frames since its start. Negative = anticipation, >1 = overshoot. */
export function envelope(local:number,t:Timing):number{
 const {prep,exec,hold,rec,anticip,overshoot}=t;
 if(local<0)return 0;
 if(local<prep)return -anticip*easeInOut(local/prep);
 const e=local-prep;
 if(e<exec)return -anticip+(1+anticip)*springStep(e/exec,overshoot);
 const h=e-exec;
 if(h<hold)return 1;
 const r=h-hold;
 if(r<rec)return 1-easeInOut(r/rec);
 return 0;
}

export interface PoseContext{shoulderL:Vec2;shoulderR:Vec2}

const arm=(p:Pose,s:'l'|'r')=>s==='l'?['lSh','lEl','lHand','lF0','lF1','lF2','lF3','lF4','lSp','shrugL'] as const:['rSh','rEl','rHand','rF0','rF1','rF2','rF3','rF4','rSp','shrugR'] as const;

/** A pose authored for the right arm, applied to the requested side(s). */
function forSide(p:Pose,side:Side):Pose{
 if(side==='right')return p;
 const m=mirror(p);
 if(side==='left')return m;
 const o={} as Pose;
 for(const k of POSE_KEYS)o[k]=(p[k]+m[k])/2;                  // torso/head terms: symmetric average
 for(const k of arm(p,'r'))o[k]=p[k];                          // right arm from p
 for(const k of arm(p,'l'))o[k]=m[k];                          // left arm from its mirror
 return o;
}

const defaultSide=(g:GestureName):Side=>g==='greeting'||g==='thoughtful'?'right':'both';

/** Deterministic, per-gesture live motion layered on top of the held pose. Returns deltas (not weights). */
function live(c:ResolvedCue,frame:number,local:number,side:Side):Partial<Pose>{
 const t=c.timing,h=local-t.prep-t.exec,hs=t.hold,tail=clamp((hs-h)/10),head=clamp((h+6)/8);
 const live=Math.min(tail,head);          // fades in after execution and out before recovery
 const b=beat(frame)*live,b2=beat(frame,77)*live;
 switch(c.gesture){
  case 'greeting':{
   const ph=local*.43+fbm(local*.05,3)*.9,sway=Math.sin(ph);
   const amp=live*(1-.35*clamp(h/hs));
   const wave:Partial<Pose>={rHand:-20*sway*amp,rEl:-15*sway*amp,rSh:4*Math.sin(ph+1.2)*amp,rSp:.12*sway*amp,tilt:-1.2*sway*amp};
   if(side==='right')return wave;
   if(side==='left')return mirrorDelta(wave);
   const {tilt:_t,...armsOnly}=wave;void _t;
   return {...armsOnly,...mirrorDelta(armsOnly)};
  }
  case 'talking':
   return {lSh:7*b,lEl:9*b,lHand:12*b,rSh:-6*b2,rEl:-8*b2,rHand:-11*b2,pitch:.18*(b+b2)/2,lift:-1.2*b,lF1:-.1*b,rF1:-.1*b2};
  case 'explaining':
   return {lSh:12*b,lEl:10*b,lHand:15*b,rSh:-12*b2,rEl:-10*b2,rHand:-15*b2,pitch:.2*(b+b2)/2,tilt:1.5*fbm(frame*.02,9)*live,lift:-1.4*b,lSp:.15*b,rSp:.15*b2};
  case 'pointing':
   return side==='left'?{lSh:3*b,lHand:3*b}:{rSh:-3*b,rHand:-3*b};
  case 'celebrating':{
   const ph=h/15,bounce=Math.abs(Math.sin(Math.PI*ph))*live;
   return {lift:-10*bounce,lSh:6*Math.sin(Math.PI*ph*2)*live,rSh:-6*Math.sin(Math.PI*ph*2+1)*live,shrugL:-3*bounce,shrugR:-3*bounce,tilt:3*Math.sin(Math.PI*ph)*live};
  }
  case 'happy':
   return {tilt:2.2*fbm(frame*.025,5)*live,lift:-2*Math.abs(Math.sin(h/9))*live*.8,shift:3*fbm(frame*.018,6)*live};
  case 'surprised':{
   const jump=local-t.prep<8?easeOut((local-t.prep)/3):0,fall=clamp((local-t.prep-3)/10);
   return {lift:-9*jump*(1-easeInOut(fall)),shrugL:-2*(1-fall),shrugR:-2*(1-fall),pitch:-.1*fbm(frame*.03,8)*live};
  }
  case 'thoughtful':
   return {tilt:2*fbm(frame*.02,12)*live,pitch:.08*fbm(frame*.026,14)*live,rF1:-.08*Math.max(0,fbm(frame*.05,15))*live};
  case 'listening':{
   const ev=schedule(88,6000,60,120),i=lastEvent(ev,frame),u=i<0?9:frame-ev[i];
   const nod=u<16?Math.sin(Math.PI*u/16)*(.5+.5*hash(i+4)):0;
   return {pitch:.2*nod*live,tilt:1.5*fbm(frame*.02,16)*live};
  }
  default:return {};
 }
}
const ZERO=Object.fromEntries(POSE_KEYS.map(k=>[k,0])) as Pose;
/** Mirror a sparse delta left<->right (only non-zero keys are kept). */
const mirrorDelta=(d:Partial<Pose>):Partial<Pose>=>{
 const m=mirror({...ZERO,...d}),o:Partial<Pose>={};
 for(const k of POSE_KEYS)if(m[k]!==0)o[k]=m[k];
 return o;
};

/**
 * Evaluate the rig pose at `frame` for a list of cues. `idleLayer` is added by the animator
 * (breathing, weight shift) so poseAt() stays focused on intentional gestures.
 */
export function poseAt(frame:number,cues:ResolvedCue[],ctx:PoseContext):Pose{
 const active:{w:number;p:Pose;l:Partial<Pose>}[]=[];
 for(const c of cues){
  if(frame<c.at||frame>c.end)continue;
  const local=frame-c.at,w=envelope(local,c.timing);
  const side=c.side??defaultSide(c.gesture);
  let base:Pose;
  if(c.gesture==='pointing'){
   const tgt=c.target??{x:ctx.shoulderR.x+500,y:ctx.shoulderR.y};
   const s:Side=side==='both'?(tgt.x>=(ctx.shoulderL.x+ctx.shoulderR.x)/2?'right':'left'):side;
   base=pointingPose(s==='left'?'left':'right',s==='left'?ctx.shoulderL:ctx.shoulderR,tgt);
   active.push({w,p:base,l:live({...c,side:s},frame,local,s)});
   continue;
  }
  base=forSide(BASE_POSES[c.gesture as Exclude<GestureName,'pointing'>],side);
  active.push({w,p:base,l:live(c,frame,local,side)});
 }
 // weights: normalise only the positive, clamped part so overshoot of a single gesture survives
 let sum=0;for(const a of active)sum+=clamp(a.w,0,1);
 const norm=1/Math.max(1,sum);
 const out={...IDLE} as Pose;
 for(const a of active){
  const w=a.w*norm;
  for(const k of POSE_KEYS)out[k]+=(a.p[k]-IDLE[k])*w;
  const lw=clamp(a.w,0,1)*norm;
  for(const k of Object.keys(a.l) as (keyof Pose)[])out[k]+=(a.l[k]??0)*lw;
 }
 return out;
}

/** Which cue is "most active" at a frame (for expression & documentation). */
export function activeCue(frame:number,cues:ResolvedCue[]):ResolvedCue|undefined{
 let best:ResolvedCue|undefined,bw=0.05;
 for(const c of cues){if(frame<c.at||frame>c.end)continue;const w=envelope(frame-c.at,c.timing);if(w>bw){bw=w;best=c;}}
 return best;
}
