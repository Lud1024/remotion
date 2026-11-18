import {Vec2,clamp,deg2rad,rad2deg} from './util.js';

/**
 * A Pose is a flat vector of rig parameters (degrees / px / 0..1 curls). A flat record makes blending,
 * mirroring and delta-composition trivial and keeps every transition continuous.
 *
 * Angle convention (SVG, clockwise positive): 0° = arm hanging straight down, ±90° = horizontal,
 * ±180° = straight up. Left = viewer-left. Positive is outward/up for the left arm and negative is
 * outward/up for the right arm.
 * `lHand/rHand` are WORLD angles of the hand (fingers' direction), not local wrist angles: the rig
 * derives the wrist from them so palms/fingers always point where the gesture intends.
 */
export const POSE_KEYS=[
 'lSh','lEl','lHand','rSh','rEl','rHand',
 'lF0','lF1','lF2','lF3','lF4','lSp','rF0','rF1','rF2','rF3','rF4','rSp',
 'lean','tilt','yaw','pitch','shrugL','shrugR','shift','lift'
] as const;
export type PoseKey=typeof POSE_KEYS[number];
export type Pose=Record<PoseKey,number>;

export const IDLE:Pose={
 lSh:17,lEl:-3,lHand:15, rSh:-17,rEl:3,rHand:-15,
 lF0:.2,lF1:.36,lF2:.4,lF3:.44,lF4:.5,lSp:.03, rF0:.2,rF1:.36,rF2:.4,rF3:.44,rF4:.5,rSp:.03,
 lean:0,tilt:0,yaw:0,pitch:0,shrugL:0,shrugR:0,shift:0,lift:0,
};
export const mk=(o:Partial<Pose>):Pose=>({...IDLE,...o});
const fingers=(side:'l'|'r',a:[number,number,number,number,number],sp:number):Partial<Pose>=>({
 [`${side}F0`]:a[0],[`${side}F1`]:a[1],[`${side}F2`]:a[2],[`${side}F3`]:a[3],[`${side}F4`]:a[4],[`${side}Sp`]:sp});
const OPEN:[number,number,number,number,number]=[.05,.03,.02,.03,.06];
const RELAX:[number,number,number,number,number]=[.2,.3,.34,.4,.46];
const POINT:[number,number,number,number,number]=[.55,0,.96,.97,.98];
const CUP:[number,number,number,number,number]=[.15,.22,.25,.28,.32];

/** Mirror a pose left<->right (used so every gesture can be authored once, for the right arm). */
export function mirror(p:Pose):Pose{
 return {
  lSh:-p.rSh,lEl:-p.rEl,lHand:-p.rHand,rSh:-p.lSh,rEl:-p.lEl,rHand:-p.lHand,
  lF0:p.rF0,lF1:p.rF1,lF2:p.rF2,lF3:p.rF3,lF4:p.rF4,lSp:p.rSp,
  rF0:p.lF0,rF1:p.lF1,rF2:p.lF2,rF3:p.lF3,rF4:p.lF4,rSp:p.lSp,
  lean:-p.lean,tilt:-p.tilt,yaw:-p.yaw,pitch:p.pitch,shrugL:p.shrugR,shrugR:p.shrugL,shift:-p.shift,lift:p.lift,
 };
}
export const mix2=(a:Pose,b:Pose,t:number):Pose=>{const o={} as Pose;for(const k of POSE_KEYS)o[k]=a[k]+(b[k]-a[k])*t;return o;};

/** Direction angle (deg) from a shoulder to a target point, in the rig's convention (0 = straight down). */
export const aimAngle=(from:Vec2,to:Vec2)=>rad2deg(Math.atan2(-(to.x-from.x),to.y-from.y));
export const dirOf=(deg:number):Vec2=>({x:-Math.sin(deg2rad(deg)),y:Math.cos(deg2rad(deg))});

/* -------------------------------------------------------------------------------------- */
/* Facial expressions                                                                      */
/* -------------------------------------------------------------------------------------- */
export interface Expression{
 browL:number;browR:number;   // px raised (positive = up)
 browTilt:number;             // inner ends raised (+) = tender/worried, lowered (-) = determined
 eyeOpen:number;squint:number;
 smile:number;                // -0.4..1 mouth-corner lift
 mouthOpen:number;mouthWide:number;
 blush:number;
}
export type ExprName='calm'|'happy'|'wow'|'thoughtful'|'listening'|'joy'|'tender';
export const EXPR:Record<ExprName,Expression>={
 calm:      {browL:1, browR:1, browTilt:0,eyeOpen:1,   squint:0,  smile:.55,mouthOpen:0,  mouthWide:.1,blush:.55},
 happy:     {browL:3, browR:3, browTilt:1,eyeOpen:.98, squint:.35,smile:1,  mouthOpen:.55,mouthWide:.7, blush:.8},
 joy:       {browL:6, browR:6, browTilt:2,eyeOpen:.94, squint:.6, smile:1,  mouthOpen:.8, mouthWide:.9, blush:1},
 wow:       {browL:11,browR:11,browTilt:3,eyeOpen:1.13,squint:0,  smile:.1, mouthOpen:.8, mouthWide:-.85,blush:.5},
 thoughtful:{browL:7, browR:0, browTilt:5,eyeOpen:.9,  squint:.1, smile:.08,mouthOpen:0,  mouthWide:-.2,blush:.45},
 listening: {browL:4, browR:4, browTilt:2,eyeOpen:1.05,squint:0,  smile:.6, mouthOpen:0,  mouthWide:.2, blush:.65},
 tender:    {browL:2, browR:2, browTilt:4,eyeOpen:.96, squint:.2, smile:.75,mouthOpen:0,  mouthWide:.3, blush:.9},
};
export const EXPR_KEYS=Object.keys(EXPR.calm) as (keyof Expression)[];
export const mixExpr=(a:Expression,b:Expression,t:number):Expression=>{
 const o={} as Expression;for(const k of EXPR_KEYS)o[k]=a[k]+(b[k]-a[k])*t;return o;};

/* -------------------------------------------------------------------------------------- */
/* The ten base states                                                                     */
/* -------------------------------------------------------------------------------------- */
export type GestureName='idle'|'greeting'|'talking'|'explaining'|'pointing'|'surprised'|'happy'|'thoughtful'|'celebrating'|'listening';
export const GESTURE_NAMES:GestureName[]=['idle','greeting','talking','explaining','pointing','surprised','happy','thoughtful','celebrating','listening'];

/** Static (target-independent) poses authored for the RIGHT arm; mirrored on demand. */
export const BASE_POSES:Record<Exclude<GestureName,'pointing'>,Pose>={
 idle:IDLE,
 // right arm up beside the head, palm to viewer, open hand; left arm relaxed.
 greeting:mk({rSh:-118,rEl:-30,rHand:-178,...fingers('r',OPEN,.85),lSh:12,lEl:-8,lHand:6,tilt:-4,yaw:.1,lean:-1.5,shrugR:-3}),
 // both hands low and loosely open in front of the hips, ready for beats
 talking:mk({lSh:26,lEl:42,lHand:84,rSh:-26,rEl:-42,rHand:-84,...fingers('l',CUP,.35),...fingers('r',CUP,.35),lean:.8,tilt:1.2}),
 // forearms out in front, palms up/open (presenting)
 explaining:mk({lSh:48,lEl:62,lHand:150,rSh:-52,rEl:-66,rHand:-156,...fingers('l',OPEN,.45),...fingers('r',OPEN,.45),lean:1,tilt:-2,pitch:-.05}),
 // arms out and up, hands by the shoulders, head back slightly
 surprised:mk({lSh:62,lEl:78,lHand:176,rSh:-62,rEl:-78,rHand:-176,...fingers('l',OPEN,.9),...fingers('r',OPEN,.9),shrugL:-6,shrugR:-6,pitch:-.45,lean:-1.5,lift:-6,tilt:1}),
 // open, relaxed arms away from the body, happy sway
 happy:mk({lSh:30,lEl:18,lHand:64,rSh:-30,rEl:-18,rHand:-64,...fingers('l',[.12,.14,.16,.2,.24],.55),...fingers('r',[.12,.14,.16,.2,.24],.55),tilt:2.2,lean:1,shrugL:-2,shrugR:-2}),
 // right hand to the chin/cheek (in front of body), left arm supports the elbow
 thoughtful:mk({rSh:-28,rEl:150,rHand:125,...fingers('r',[.45,.0,.6,.75,.85],.05),lSh:8,lEl:-98,lHand:-90,...fingers('l',RELAX,.1),tilt:-5,lean:-1,pitch:-.12,yaw:-.25}),
 // both arms in a joyful "V", hands open
 celebrating:mk({lSh:152,lEl:12,lHand:178,rSh:-152,rEl:-12,rHand:-178,...fingers('l',OPEN,.95),...fingers('r',OPEN,.95),pitch:-.3,shrugL:-4,shrugR:-4,lean:-1}),
 // attentive: weight forward, hands gently clasped low, head tilted
 listening:mk({lSh:14,lEl:-92,lHand:-78,rSh:-14,rEl:92,rHand:78,...fingers('l',[.35,.5,.55,.6,.65],.04),...fingers('r',[.35,.5,.55,.6,.65],.04),tilt:3.6,lean:1.6,pitch:.1}),
};
export const DEFAULT_EXPR:Record<GestureName,ExprName>={
 idle:'calm',greeting:'happy',talking:'happy',explaining:'happy',pointing:'calm',surprised:'wow',
 happy:'happy',thoughtful:'thoughtful',celebrating:'joy',listening:'listening',
};

/** Pointing pose: the whole arm lines up with the direction toward `target`. */
export function pointingPose(side:'left'|'right',shoulder:Vec2,target:Vec2):Pose{
 const th=clamp(aimAngle(shoulder,target),-175,175);
 const rp=mk({
  rSh:th-6,rEl:10,rHand:th+4,...fingers('r',POINT,.08),
  lSh:20,lEl:-6,lHand:15,tilt:-3,lean:th<0?1.8:-1.8,
 });
 const lp=mk({
  lSh:th+6,lEl:-10,lHand:th-4,...fingers('l',POINT,.08),
  rSh:-20,rEl:6,rHand:-15,tilt:3,lean:th>0?-1.8:1.8,
 });
 return side==='right'?rp:lp;
}
