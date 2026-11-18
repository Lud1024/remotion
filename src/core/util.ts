/** Pure deterministic frame mathematics. All motion is a function of an absolute frame. */
export const FPS = 30;
export const clamp = (x:number, lo=0, hi=1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a:number, b:number, t:number) => a+(b-a)*t;
export const smooth = (t:number) => {const v=clamp(t);return v*v*(3-2*v);};
export const pulse = (t:number, start:number, end:number, ease=16) => smooth((t-start)/ease)*(1-smooth((t-end)/ease));
export const mix=(a:number,b:number,k:number)=>a+(b-a)*clamp(k);
export const f=(n:number)=>Number(n.toFixed(3));
/** Deterministic pseudo random in [0,1) from an integer-ish seed. NEVER use Math.random in this project. */
export const hash = (i:number)=>{let x=Math.sin(i*127.1+31.13)*43758.5453123;return x-Math.floor(x);};
export const escapeXml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]||c));
export const text=(x:number,y:number,s:string,size=38,color='#f5f5dc',attrs='')=>`<text x="${x}" y="${y}" font-family="Inter,Arial,sans-serif" font-size="${size}" fill="${color}" ${attrs}>${escapeXml(s)}</text>`;
export const group=(attrs:string,body:string)=>`<g ${attrs}>${body}</g>`;
/** Clamp-aware inverse lerp: 0 at a, 1 at b. */
export const unlerp=(a:number,b:number,x:number)=>clamp((x-a)/(b-a||1));
export const deg2rad=(d:number)=>d*Math.PI/180;
export const rad2deg=(r:number)=>r*180/Math.PI;
export type Vec2={x:number;y:number};
