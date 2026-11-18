import {clamp,lerp} from './util.js';
import {lastEvent} from './motion.js';

/**
 * Viseme system.
 *
 * Alphabet = Rhubarb Lip Sync's 9 mouth shapes (A–H, X), so real phonetic alignment produced by the free,
 * offline Rhubarb tool (or by hand / any forced aligner converted to this format) plugs in unchanged:
 *   A closed (P B M)   B slightly open (K S T, EE)   C open (EH)   D wide open (AA)
 *   E rounded (AO ER)  F puckered (UW OW W)          G teeth-on-lip (F V)   H tongue (L)   X rest
 *
 * HONESTY NOTE: when no aligned file exists the project uses `provisionalVisemes()`, which only
 * ESTIMATES mouth shapes from the written Spanish text, spread evenly over the audio length.
 * It is NOT phonetic alignment and is flagged as `provisional:true` in every data structure.
 */
export type Viseme='A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'X';
export interface VisemeCue{t:number;v:Viseme}          // t in seconds from the start of the voice clip
export interface VisemeTrack{cues:VisemeCue[];provisional:boolean;source:string}
export interface MouthShape{open:number;wide:number;teeth:number;bite:number;tongue:number;press:number}

export const SHAPES:Record<Viseme,MouthShape>={
 X:{open:0,  wide:0,   teeth:0,tongue:0,  bite:0,press:0},
 A:{open:.02,wide:.0,  teeth:0,tongue:0,  bite:0,press:1},
 B:{open:.2, wide:.35, teeth:1,tongue:0,  bite:0,press:0},
 C:{open:.52,wide:.4,  teeth:1,tongue:.15,bite:0,press:0},
 D:{open:.95,wide:.45, teeth:1,tongue:.4, bite:0,press:0},
 E:{open:.55,wide:-.5, teeth:0,tongue:.15,bite:0,press:0},
 F:{open:.28,wide:-.95,teeth:0,tongue:0,  bite:0,press:0},
 G:{open:.18,wide:.35, teeth:1,tongue:0,  bite:1,press:0},
 H:{open:.36,wide:.2,  teeth:1,tongue:1,  bite:0,press:0},
};
const SKEYS=Object.keys(SHAPES.X) as (keyof MouthShape)[];
const blendShape=(a:MouthShape,b:MouthShape,t:number):MouthShape=>{const o={} as MouthShape;for(const k of SKEYS)o[k]=lerp(a[k],b[k],t);return o;};

/**
 * Mouth shape at `sec`. Each cue cross-fades (~110 ms) from the shape the mouth actually had when that cue began,
 * so very short cues (a pause between words) never make the mouth snap: the transition simply retargets.
 */
export function mouthAt(track:VisemeTrack|undefined,sec:number):MouthShape{
 if(!track||!track.cues.length||sec<0)return SHAPES.X;
 const ts=track.cues.map(c=>c.t);
 const rec=(i:number,at:number,depth:number):MouthShape=>{
  if(i<0)return SHAPES.X;
  const target=SHAPES[track.cues[i].v];
  const from=depth>=4?(i>0?SHAPES[track.cues[i-1].v]:SHAPES.X):rec(i-1,ts[i],depth+1);
  const x=Math.min(1,Math.max(0,(at-ts[i])/.11));
  return blendShape(from,target,x*x*(3-2*x));
 };
 return rec(lastEvent(ts,sec),sec,0);
}

/* ----------------------------- provisional text estimate -------------------------------- */
const VOWEL:Record<string,Viseme>={a:'D',e:'C',i:'B',o:'E',u:'F'};
const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
export function provisionalVisemes(textLine:string,durationSec:number):VisemeTrack{
 const src=norm(textLine);
 type Ev={v:Viseme;w:number};
 const ev:Ev[]=[];
 for(const ch of src){
  if(VOWEL[ch])ev.push({v:VOWEL[ch],w:1.15});
  else if('bmp'.includes(ch))ev.push({v:'A',w:.5});
  else if('fv'.includes(ch))ev.push({v:'G',w:.5});
  else if('lrndt'.includes(ch))ev.push({v:'H',w:.5});
  else if('wq'.includes(ch))ev.push({v:'F',w:.45});
  else if(/[a-z]/.test(ch))ev.push({v:'B',w:.5});
  else if(ch===' ')ev.push({v:'X',w:.12});
  else if(',;:'.includes(ch))ev.push({v:'X',w:2.6});
  else if('.!?'.includes(ch))ev.push({v:'X',w:4});
 }
 const sum=ev.reduce((s,e)=>s+e.w,0)||1;
 let t=0;const cues:VisemeCue[]=[];
 for(const e of ev){
  if(!cues.length||cues[cues.length-1].v!==e.v||e.v==='X')cues.push({t:t/sum*durationSec,v:e.v});
  t+=e.w;
 }
 cues.push({t:durationSec,v:'X'});
 return {cues,provisional:true,source:'estimated-from-text (NOT phonetic alignment)'};
}

/* ------------------------------ real alignment import ------------------------------------ */
const VALID=new Set(['A','B','C','D','E','F','G','H','X']);
/**
 * Accepts either Rhubarb's JSON output ({mouthCues:[{start,end,value}]}) or this project's
 * compact format ({cues:[{t,v}],source?}). Returns an ALIGNED (provisional:false) track.
 */
export function parseVisemeJson(obj:any,source='external'):VisemeTrack|null{
 try{
  let cues:VisemeCue[]=[];
  if(Array.isArray(obj?.mouthCues))cues=obj.mouthCues.map((c:any)=>({t:Number(c.start),v:String(c.value).toUpperCase() as Viseme}));
  else if(Array.isArray(obj?.cues))cues=obj.cues.map((c:any)=>({t:Number(c.t),v:String(c.v).toUpperCase() as Viseme}));
  else return null;
  cues=cues.filter(c=>Number.isFinite(c.t)&&VALID.has(c.v)).sort((a,b)=>a.t-b.t);
  if(!cues.length)return null;
  return {cues,provisional:false,source:obj?.source??obj?.metadata?.soundFile??source};
 }catch{return null;}
}
export const clampShape=(m:MouthShape):MouthShape=>({...m,open:clamp(m.open),tongue:clamp(m.tongue)});
