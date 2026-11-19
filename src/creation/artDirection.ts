import {clamp, f, hash, smooth} from '../core/util';
import {fbm} from '../core/motion';

/**
 * Frame-pure direction of photography for the illustrated film.
 * No state, timers or discontinuous looping: every exported frame is reproducible.
 */
const seedOf = (name:string) => [...name].reduce((seed, ch) => seed * 17 + ch.charCodeAt(0), 19) % 1009;

export function sceneCamera(localFrame:number, duration:number, sceneId:string) {
 const p = clamp(localFrame / Math.max(1, duration - 1));
 const seed = seedOf(sceneId);
 const direction = (hash(seed + 3) - .5) * 2;
 const breezeX = fbm(localFrame * .006, seed) - fbm(0, seed);
 const breezeY = fbm(localFrame * .004, seed + 9) - fbm(0, seed + 9);
 return {
  scale: 1 + .035 * smooth(p),
  x: direction * 13 * smooth(p) + breezeX * 2.2,
  y: -7 * smooth(p) + breezeY * 1.6,
 };
}

const LAND_SCENES = new Set(['land','plants','animals','humanity','stewardship','good','rest','eden']);
export type ArtPalette = {top:string;bottom:string;accent:string};

/** Far and middle distance: a continuous landscape rather than a floating oval. */
export function renderDepthBackdrop(sceneId:string, width:number, height:number, frame:number, theme:ArtPalette) {
 const vertical = height > width;
 const horizon = height * (vertical ? .52 : .66);
 if (!LAND_SCENES.has(sceneId)) {
  if (sceneId === 'origin' || sceneId === 'sky' || sceneId === 'life') {
   const y = height * (vertical ? .56 : .68);
   const shift = f(Math.sin(frame * .004) * 4);
   return `<g data-depth="far" opacity=".23">
    <path d="M0 ${f(y)} Q${f(width*.3)} ${f(y-25)} ${f(width*.62)} ${f(y+8)} T${width} ${f(y-5)} V${height} H0 Z" fill="${theme.bottom}" transform="translate(0 ${shift})"/>
    <path d="M0 ${f(y+24)} Q${f(width*.5)} ${f(y-6)} ${width} ${f(y+28)}" stroke="${theme.accent}" stroke-width="2" fill="none" opacity=".4"/>
   </g>`;
  }
  return '';
 }
 const drift = (fbm(frame * .0025, seedOf(sceneId)) - fbm(0, seedOf(sceneId))) * 5;
 const h1 = horizon - height*.065;
 const h2 = horizon + height*.015;
 return `<g data-depth="landscape">
  <g transform="translate(${f(drift*.4)} 0)" opacity=".22">
   <path d="M-60 ${f(h1+55)} C${f(width*.16)} ${f(h1-80)} ${f(width*.28)} ${f(h1-15)} ${f(width*.42)} ${f(h1-60)} S${f(width*.75)} ${f(h1-20)} ${f(width+70)} ${f(h1-75)} V${height} H-60 Z" fill="${theme.accent}"/>
  </g>
  <g transform="translate(${f(drift)} 0)" opacity=".33">
   <path d="M-60 ${f(h2+25)} Q${f(width*.16)} ${f(h2-47)} ${f(width*.35)} ${f(h2+2)} T${f(width*.7)} ${f(h2-14)} T${f(width+60)} ${f(h2+14)} V${height} H-60 Z" fill="${theme.bottom}"/>
   <path d="M-40 ${f(h2+10)} Q${f(width*.45)} ${f(h2-55)} ${f(width+40)} ${f(h2+6)}" fill="none" stroke="${theme.accent}" stroke-width="2" opacity=".32"/>
  </g>
 </g>`;
}

/** Close-up framing elements never cover the scene's captions or its hero subject. */
export function renderForeground(sceneId:string, width:number, height:number, frame:number, theme:ArtPalette) {
 if (!LAND_SCENES.has(sceneId)) return '';
 const p = Math.sin(frame * .007 + seedOf(sceneId)) * 4;
 const y = height * .95;
 return `<g data-depth="near" pointer-events="none" opacity=".24" transform="translate(${f(p)} 0)">
  <path d="M0 ${f(y)} Q${f(width*.12)} ${f(y-21)} ${f(width*.29)} ${f(y+3)} T${f(width*.48)} ${f(y+30)} V${height} H0Z" fill="#061927"/>
  <path d="M${width} ${f(y-9)} Q${f(width*.83)} ${f(y-24)} ${f(width*.69)} ${f(y+10)} T${f(width*.56)} ${f(y+31)} V${height} H${width}Z" fill="#071b28"/>
  <path d="M0 ${f(y)} Q${f(width*.12)} ${f(y-21)} ${f(width*.29)} ${f(y+3)}" stroke="${theme.accent}" stroke-width="2" fill="none" opacity=".18"/>
 </g>`;
}

/** Very subtle motes avoid a sterile digital canvas; stable particle IDs and frame motion. */
export function renderAir(sceneId:string, width:number, height:number, frame:number, theme:ArtPalette) {
 const seed = seedOf(sceneId);
 return `<g data-depth="air" pointer-events="none">${Array.from({length:13},(_,i)=>{
  const x=hash(seed+i*11)*width;
  const y=hash(seed+i*7+51)*height*.76;
  const drift=Math.sin(frame*.003+i*2.1)*3;
  const opacity=.045+.075*(.5+.5*Math.sin(frame*.014+i*1.7));
  return `<circle cx="${f(x+drift)}" cy="${f(y)}" r="${f(.8+hash(seed+i+80)*1.9)}" fill="${theme.accent}" opacity="${f(opacity)}"/>`;
 }).join('')}</g>`;
}
