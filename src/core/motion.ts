import {clamp,hash,lerp} from './util.js';

/**
 * Motion toolkit: easing curves, deterministic smooth noise and event schedules.
 * Everything is a pure function of (frame, seed) so Remotion renders are reproducible
 * across machines and across re-renders. There is no Math.random and no hidden state.
 */
export const easeInOut=(t:number)=>{const v=clamp(t);return v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;};
export const easeOut=(t:number)=>1-Math.pow(1-clamp(t),3);
export const easeIn=(t:number)=>{const v=clamp(t);return v*v*v;};
export const easeOutQuint=(t:number)=>1-Math.pow(1-clamp(t),5);
/** Ease-out with a controlled overshoot (s≈1.2 subtle, 2 pronounced). Ends exactly at 1. */
export const easeOutBack=(t:number,s=1.3)=>{const v=clamp(t)-1;return 1+v*v*((s+1)*v+s);};
/**
 * Step response of a damped spring: starts with zero velocity (no "pop"), overshoots by `os` (fraction of the
 * move, e.g. .08 = 8 %) and settles exactly at 1 when u = 1. This is the curve used for gesture execution.
 */
export const springStep=(u:number,os=.08)=>{
  const x=clamp(u);
  if(os<=.001)return x*x*(3-2*x);
  const l=Math.log(os),z=-l/Math.sqrt(Math.PI*Math.PI+l*l),wn=3.4/z,wd=wn*Math.sqrt(1-z*z),k=z/Math.sqrt(1-z*z);
  const y=(t:number)=>1-Math.exp(-z*wn*t)*(Math.cos(wd*t)+k*Math.sin(wd*t));
  return y(x)+(1-y(1))*(x*x*(3-2*x));
};
export const easeInOutSine=(t:number)=>-(Math.cos(Math.PI*clamp(t))-1)/2;

/** Smooth 1-D value noise in [-1,1]. */
export const noise1=(x:number,seed=0)=>{
  const i=Math.floor(x),fr=x-i,o=seed*131.7;
  const a=hash(i+o),b=hash(i+1+o),u=fr*fr*fr*(fr*(fr*6-15)+10);
  return lerp(a,b,u)*2-1;
};
/** Two-octave noise, still in about [-1,1]. */
export const fbm=(x:number,seed=0)=>.68*noise1(x,seed)+.32*noise1(x*2.37+11,seed+7);

/** Sorted event frames with randomised (deterministic) gaps. Memoised. */
const memo=new Map<string,number[]>();
export function schedule(seed:number,total:number,minGap:number,maxGap:number):number[]{
  const key=`${seed}|${total}|${minGap}|${maxGap}`,hit=memo.get(key);
  if(hit)return hit;
  const out:number[]=[];let t=hash(seed*3.7)*minGap,n=0;
  while(t<total){out.push(t);t+=minGap+hash(seed*7.31+(++n)*1.913)*(maxGap-minGap);}
  memo.set(key,out);return out;
}
/** Index of the last event <= t (or -1). */
export function lastEvent(ev:number[],t:number):number{
  let lo=0,hi=ev.length-1,r=-1;
  while(lo<=hi){const m=(lo+hi)>>1;if(ev[m]<=t){r=m;lo=m+1;}else hi=m-1;}
  return r;
}

const HORIZON=6000; // frames; schedules are generated once for any film up to 200 s

/**
 * Breathing 0..1..0 with irregular period (2.4–3.8 s), an asymmetric inhale/exhale and a
 * per-cycle depth, instead of a fixed sine wave.
 */
export function breath(frame:number):number{
  const ev=schedule(11,HORIZON,72,114),i=lastEvent(ev,frame);
  if(i<0)return 0;
  const a=ev[i],b=ev[i+1]??a+90,u=(frame-a)/(b-a),depth=.75+.4*hash(i+40);
  const inhale=.40;
  const v=u<inhale?easeInOutSine(u/inhale):1-easeInOutSine((u-inhale)/(1-inhale));
  return v*depth;
}

/**
 * Blink amount 0 (open) … 1 (shut). Non-periodic: random gaps 1.8–5.6 s, ~20% double blinks,
 * quick close (3 f) and slower open (6 f).
 */
const blinkMemo=new WeakMap<number[],number[]>();
/** Merge natural blinks with "action" blinks, keeping at least 1.3 s between blinks so it never looks like a tic. */
function blinkEvents(extra:number[]):number[]{
  const hit=blinkMemo.get(extra);if(hit)return hit;
  const all=[...schedule(23,HORIZON,54,168),...extra].sort((a,b)=>a-b),out:number[]=[];
  for(const e of all)if(!out.length||e-out[out.length-1]>=40)out.push(e);
  blinkMemo.set(extra,out);return out;
}
const NO_EXTRA:number[]=[];
export function blink(frame:number,extra:number[]=NO_EXTRA):number{
  const ev=blinkEvents(extra),i=lastEvent(ev,frame);
  const prof=(start:number,k:number)=>{
    const u=frame-start;if(u<0||u>11)return 0;
    const speed=.9+.2*hash(k+5);
    if(u<3)return easeIn(u/(3/speed));
    if(u<4.5)return 1;
    return 1-easeOut((u-4.5)/6.5);
  };
  let v=0;
  for(let j=Math.max(0,i-1);j<=i;j++){
    v=Math.max(v,prof(ev[j],j));
    if(hash(j+90)<.2)v=Math.max(v,prof(ev[j]+11,j+3));    // ~20% double blinks
  }
  return clamp(v);
}

/** Held random offset that jumps (with a 4-frame saccade) every 45–120 frames. */
export function saccade(frame:number,seed:number,amount:number):Vec2Like{
  const ev=schedule(seed,HORIZON,45,120),i=lastEvent(ev,frame);
  const val=(k:number)=>k<0?{x:0,y:0}:{x:(hash(seed+k*2.1)-.5)*2*amount,y:(hash(seed+k*3.3+9)-.5)*2*amount*.6};
  if(i<0)return {x:0,y:0};
  const a=val(i-1),b=val(i),u=easeOut((frame-ev[i])/4);
  return {x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u)};
}
export interface Vec2Like{x:number;y:number}

/** Slow alternating weight shift in [-1,1] with eased transitions. */
export function weightShift(frame:number):number{
  const ev=schedule(37,HORIZON,140,260),i=lastEvent(ev,frame);
  const side=(k:number)=>k<0?0:(k%2?-1:1)*(.55+.45*hash(k+3));
  if(i<0)return 0;
  return lerp(side(i-1),side(i),easeInOut((frame-ev[i])/46));
}

/**
 * Most recent "beat" (speech accent). Returns 0..1 impulse: fast attack (4 f) and slow decay (14 f).
 * Used for hand and head accents that make explanations feel intentional.
 */
export function beat(frame:number,seed=51):number{
  const ev=schedule(seed,HORIZON,24,46),i=lastEvent(ev,frame);
  if(i<0)return 0;
  const u=frame-ev[i],strength=.55+.45*hash(i+seed);
  const attack=easeOut(u/4),decay=1-easeInOut((u-4)/14);
  return strength*(u<4?attack:Math.max(0,decay));
}
