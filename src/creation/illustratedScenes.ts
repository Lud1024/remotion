import {clamp,f,hash,smooth} from '../core/util';

/**
 * Full-bleed illustrated sets. These replace the repeated oval-water diorama.
 * Coordinates are responsive stage units, motion is a pure function of the frame.
 */
const grad=(id:string,stops:string[])=>`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map((color,i)=>`<stop offset="${f(i/(stops.length-1))}" stop-color="${color}"/>`).join('')}</linearGradient>`;
const radial=(id:string,center:string,edge:string)=>`<radialGradient id="${id}" cx=".3" cy=".26" r=".85"><stop offset="0" stop-color="${center}"/><stop offset="1" stop-color="${edge}"/></radialGradient>`;
const gs=String.raw;
function leafCluster(x:number,y:number,r:number,seed:number,t:number) {
 const shades=['#244c3e','#376a4b','#52865d','#67976a','#8cae75'];
 const sway=Math.sin(t*.009+seed*2)*1.3;
 return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(sway)})">
  ${Array.from({length:12},(_,i)=>{
   const a=i*Math.PI*2/12,rr=r*(.48+.43*hash(i+seed*9));
   const px=Math.cos(a)*rr,py=Math.sin(a)*rr*.62;
   return `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(r*(.36+hash(i+seed)*.15))}" ry="${f(r*(.25+hash(i+seed+12)*.12))}" fill="${shades[(i+seed)%shades.length]}" opacity="${f(.88+hash(i+seed+24)*.12)}"/>`;
  }).join('')}
  <path d="M${f(-r*.64)} ${f(-r*.12)}Q0 ${f(-r*.76)} ${f(r*.42)} ${f(-r*.36)}" stroke="#bfce91" stroke-width="1.8" opacity=".28" fill="none"/>
 </g>`;
}
function orchardTree(x:number,y:number,scale:number,t:number,seed:number,fruit=true) {
 const sw=Math.sin(t*.008+seed)*1.5, S=f(scale);
 const points=Array.from({length:9},(_,i)=>({
  x:(hash(seed*17+i*3)-.5)*160,
  y:-165+(hash(seed*41+i*7)-.5)*105,
 }));
 return `<g data-set="orchard-tree" transform="translate(${f(x)} ${f(y)}) scale(${S})">
  <ellipse cy="5" rx="72" ry="13" fill="#0b302e" opacity=".23"/>
  <path d="M-18 8Q-8 -91 -29 -160L-5 -187Q8 -105 21 8Z" fill="url(#set-trunk)"/>
  <path d="M1 -100L-84 -165 M-7 -150L76 -194 M5 -110L73 -138" fill="none" stroke="#685c42" stroke-width="13" stroke-linecap="round"/>
  <g transform="rotate(${f(sw)} 0 -155)">
   ${leafCluster(-61,-193,66,seed,t)}
   ${leafCluster(47,-220,79,seed+3,t)}
   ${leafCluster(0,-254,81,seed+9,t)}
   ${leafCluster(0,-190,75,seed+17,t)}
   ${fruit?points.map((p,i)=>`<g transform="translate(${f(p.x)} ${f(p.y-48)})">
    <path d="M0 -6v-7" stroke="#46573b" stroke-width="1.5"/>
    <circle r="${f(5+hash(seed+i)*3.5)}" fill="${i%3===0?'#e3b45e':i%3===1?'#bf6951':'#dba96d'}"/>
    <path d="M-3 -2Q-2 -5 1 -5" fill="none" stroke="#ffe0a2" stroke-width="1.6" opacity=".6"/>
   </g>`).join(''):''}
  </g>
  <path d="M-9 -72Q-4 -119 -15 -151" stroke="#e2c9a0" stroke-width="2" fill="none" opacity=".5"/>
 </g>`;
}
function herb(x:number,y:number,size:number,t:number,seed:number) {
 const lean=Math.sin(t*.015+seed*1.8)*3;
 return `<g data-organic="plant" transform="translate(${f(x)} ${f(y)}) scale(${f(size)})">
  <path d="M0 0Q${f(lean)} -40 ${f(lean*.6)} -92" stroke="#4d7955" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${Array.from({length:7},(_,i)=>{
   const sy=-13-i*11,s=i%2?-1:1;
   return `<path d="M${f(lean*.3)} ${sy}Q${f(s*16)} ${f(sy-20)} ${f(s*38+lean)} ${f(sy-11)}Q${f(s*19)} ${f(sy+2)} ${f(lean*.3)} ${sy}Z" fill="${i%3===0?'#9bbd86':i%3===1?'#568f72':'#42795e'}" stroke="#bad6a6" stroke-width=".65" opacity=".95"/>`;
  }).join('')}
 </g>`;
}
function fish(x:number,y:number,size:number,t:number,seed:number) {
 const tail=Math.sin(t*.14+seed*2)*12;
 const stroke=seed%3===0?'#e0bc7d':seed%3===1?'#8fd0c7':'#b9d8b7';
 return `<g data-set="fish" transform="translate(${f(x)} ${f(y)}) scale(${f(size)})">
  <path d="M-42 0L-78 ${f(-21+tail)}Q-63 0 -78 ${f(21+tail)}Z" fill="${stroke}" opacity=".88"/>
  <path d="M-50 0Q-13 -34 37 -14Q57 -2 47 7Q5 36 -50 0Z" fill="${stroke}"/>
  <path d="M-28 -6Q2 -23 32 -10" stroke="#f3e7c1" stroke-width="3" fill="none" opacity=".42"/>
  <path d="M-9 -25l12 -21l16 24" fill="${stroke}" opacity=".9"/>
  <path d="M10 0q-8 10 -18 13 M20 -4q-8 9 -15 11" fill="none" stroke="#2c7775" stroke-width="1.5" opacity=".42"/>
  <circle cx="36" cy="-6" r="3.6" fill="#123442"/><circle cx="37" cy="-7" r="1" fill="#fff7db"/>
 </g>`;
}
function bird(x:number,y:number,scale:number,t:number,seed:number) {
 const wing=24+Math.sin(t*.12+seed*1.3)*21;
 return `<g data-set="bird" transform="translate(${f(x)} ${f(y)}) scale(${f(scale)})">
  <path d="M0 8Q-30 ${f(-wing)} -65 ${f(-wing*.6)}Q-35 ${f(15-wing*.3)} -5 16Q-1 22 4 16Q35 ${f(14-wing*.3)} 65 ${f(-wing*.6)}Q30 ${f(-wing)} 0 8Z" fill="#f0ede1"/>
  <path d="M-8 15l8 11l7 -11" fill="#bdc8bb"/><circle r="2" fill="#f6d3a0"/>
 </g>`;
}
function motes(W:number,H:number,t:number) {
 return `<g data-depth="air" opacity=".32">${Array.from({length:21},(_,i)=>{
  const x=hash(i*7+31)*W+Math.sin(t*.006+i)*3, y=hash(i*13+11)*H;
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.6+hash(i+69)*1.7)}" fill="#e9eac5" opacity="${f(.13+.2*hash(i+19))}"/>`;
 }).join('')}</g>`;
}
function mountains(W:number,H:number,color:string,base:number=.65) {
 const y=H*base;
 return `<path d="M0 ${f(y)}L${f(W*.12)} ${f(y-H*.11)}L${f(W*.23)} ${f(y-H*.045)}L${f(W*.39)} ${f(y-H*.19)}L${f(W*.52)} ${f(y-H*.07)}L${f(W*.67)} ${f(y-H*.21)}L${f(W*.82)} ${f(y-H*.055)}L${W} ${f(y-H*.16)}V${H}H0Z" fill="${color}"/>`;
}
function skyAndWater(W:number,H:number,t:number,horizon:number) {
 const h=H*horizon;
 const wind=Math.sin(t*.015)*4;
 return `<g data-set="sea-and-sky">
 <rect width="${W}" height="${H}" fill="url(#set-sky)"/>
 <circle cx="${f(W*.7)}" cy="${f(h*.45)}" r="${f(Math.min(W,H)*.20)}" fill="url(#set-sun)" opacity=".55"/>
 <path d="M0 ${f(h*.57)}Q${f(W*.23)} ${f(h*.55)} ${f(W*.36)} ${f(h*.58)}T${W} ${f(h*.56)}" fill="none" stroke="#d6f0db" stroke-width="5" opacity=".12"/>
 <path d="M0 ${f(h)}Q${f(W*.25)} ${f(h-5+wind*.2)} ${f(W*.5)} ${f(h)}T${W} ${f(h)}V${H}H0Z" fill="url(#set-sea)"/>
 <path d="M0 ${f(h)}Q${f(W*.25)} ${f(h-5+wind*.2)} ${f(W*.5)} ${f(h)}T${W} ${f(h)}" fill="none" stroke="#bdeee6" stroke-width="3.2" opacity=".85"/>
 ${Array.from({length:15},(_,i)=>{
  const y=h+22+i*i*(H-h)/235;
  return `<path d="M${f(-30+i%3*70)} ${f(y)}q${f(W*.26)} ${f(Math.sin(t*.013+i)*4)} ${f(W*.39)} 0t${f(W*.36)} 0" fill="none" stroke="#9cdddd" stroke-width="${f(.75+i*.06)}" opacity="${f(.23-i*.008)}"/>`;
 }).join('')}
 </g>`;
}
function oceanLife(W:number,H:number,t:number,birdsActive:boolean) {
 const horizon=H*(H>W?.395:.44);
 const sea=skyAndWater(W,H,t,H>W?.395:.44);
 const school=Array.from({length:13},(_,i)=>{
  const z=.52+hash(i+7)*.7;
  const x=((hash(i+10)*W+t*(.35+z*.17))%(W+170))-85;
  const y=horizon+(H-horizon)*(.17+hash(i+38)*.67);
  return fish(x,y,z,t,i);
 }).join('');
 const bubbles=Array.from({length:30},(_,i)=>{
  const x=hash(i+91)*W, y=horizon+(H-horizon)*hash(i+193);
  const rise=(t*(.13+hash(i+41)*.22))%(H-horizon);
  const Y=horizon+((y-horizon-rise+(H-horizon))%(H-horizon));
  return `<circle cx="${f(x)}" cy="${f(Y)}" r="${f(1.3+hash(i+18)*3.3)}" fill="none" stroke="#b2ebe0" stroke-width="1.2" opacity=".35"/>`;
 }).join('');
 const birds=birdsActive?Array.from({length:7},(_,i)=>{
  const x=W*(.14+.12*i)+t*(.12+hash(i+8)*.13);
  const y=horizon*(.16+.44*hash(i+24))+Math.sin(t*.013+i)*5;
  return bird(x%W,y,.48+hash(i+17)*.47,t,i);
 }).join(''):'';
 return `<g data-environment="sea-sky">
 ${sea}
 <path d="M${f(W*.1)} ${f(horizon+6)}Q${f(W*.5)} ${f(horizon+23)} ${f(W*.94)} ${f(horizon+4)}" stroke="#f0f4dc" stroke-width="5" opacity=".12" fill="none"/>
 <path d="M0 ${f(horizon)}V${H}H${W}V${f(horizon)}Z" fill="url(#set-water-volume)" opacity=".32"/>
 <path d="M${f(W*.22)} ${f(horizon)}L${f(W*.1)} ${H}H${f(W*.37)}L${f(W*.48)} ${f(horizon)}Z" fill="#d8fff0" opacity=".06"/>
 <path d="M${f(W*.58)} ${f(horizon)}L${f(W*.5)} ${H}H${f(W*.68)}L${f(W*.76)} ${f(horizon)}Z" fill="#d8fff0" opacity=".045"/>
 ${bubbles}
 ${school}
 ${birds}
 <path d="M0 ${f(H*.89)}Q${f(W*.2)} ${f(H*.83)} ${f(W*.43)} ${f(H*.94)}T${W} ${f(H*.89)}V${H}H0Z" fill="#092e38" opacity=".32"/>
 </g>`;
}
function planet(W:number,H:number,t:number) {
 const R=Math.min(W*.31,H*.345), X=W*(H>W?.5:.61),Y=H*(H>W?.46:.51);
 const rotate=Math.sin(t*.004)*4;
 return `<g data-environment="spherical-earth">
  <rect width="${W}" height="${H}" fill="url(#set-void)"/>
  ${Array.from({length:37},(_,i)=>{
   const x=hash(i+11)*W,y=hash(i+51)*H;
   return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.7+hash(i+78)*1.5)}" fill="#d6e4db" opacity="${f(.08+.28*hash(i+24))}"/>`;
  }).join('')}
  <defs><clipPath id="set-planet-clip"><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}"/></clipPath></defs>
  <circle cx="${f(X)}" cy="${f(Y)}" r="${f(R*1.13)}" fill="url(#set-atmosphere)" opacity=".45"/>
  <g clip-path="url(#set-planet-clip)" transform="rotate(${f(rotate)} ${f(X)} ${f(Y)})">
   <circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="url(#set-globe)"/>
   <path d="M${f(X-R*1.1)} ${f(Y-R*.33)}Q${f(X-R*.25)} ${f(Y-R*.78)} ${f(X+R*.4)} ${f(Y-R*.17)}T${f(X+R*1.1)} ${f(Y-R*.47)}" stroke="#8dc9bc" stroke-width="${f(R*.21)}" opacity=".13" fill="none"/>
   <path d="M${f(X-R)} ${f(Y+R*.19)}Q${f(X-R*.3)} ${f(Y-R*.03)} ${f(X+R*.5)} ${f(Y+R*.22)}T${f(X+R)} ${f(Y+R*.08)}" stroke="#cee6ca" stroke-width="${f(R*.16)}" opacity=".12" fill="none"/>
   ${Array.from({length:13},(_,i)=>{
    const h=Y-R*.73+i*R*.12,drift=Math.sin(t*.006+i)*R*.017;
    return `<path d="M${f(X-R*1.2)} ${f(h)}Q${f(X-R*.25+drift)} ${f(h-R*.2)} ${f(X+R*.4+drift)} ${f(h+R*.04)}T${f(X+R*1.3)} ${f(h-R*.02)}" stroke="${i%3?'#d7e6d9':'#b0d7ce'}" stroke-width="${f(1.2+i%3)}" opacity=".22" fill="none"/>`;
   }).join('')}
   <ellipse cx="${f(X+R*.72)}" cy="${f(Y+R*.13)}" rx="${f(R*.91)}" ry="${f(R*1.19)}" fill="#020e1c" opacity=".68"/>
  </g>
  <circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" stroke="#b4d7c7" stroke-width="2.5" opacity=".65" fill="none"/>
  <path d="M${f(X-R*.72)} ${f(Y-R*.69)}A${f(R)} ${f(R)} 0 0 1 ${f(X+R*.2)} ${f(Y-R*.98)}" stroke="#eef1d2" stroke-width="3" fill="none" opacity=".43"/>
 </g>`;
}
function field(W:number,H:number,t:number,plants:boolean,treeReveal:number) {
 const y=H*.61,vert=H>W;
 const hill=`<path d="M0 ${f(y+25)}Q${f(W*.16)} ${f(y-89)} ${f(W*.41)} ${f(y-23)}T${W} ${f(y+12)}V${H}H0Z" fill="url(#set-ground)"/>
  <path d="M0 ${f(y+90)}Q${f(W*.32)} ${f(y+6)} ${f(W*.56)} ${f(y+61)}T${W} ${f(y+63)}V${H}H0Z" fill="#345e4c" opacity=".55"/>`;
 const herbs=plants?Array.from({length:25},(_,i)=>{
  const X=W*(.035+hash(i+21)*.94),Y=y+H*(.06+.27*hash(i+37));
  const delay=i*3.6;
  return `<g transform="translate(${f(X)} ${f(Y)}) scale(${f(.6+hash(i+12)*.4)})">
   <g transform="scale(1 ${f(smooth((t-delay+12)/65))})">${herb(0,0,1,t,i)}</g>
  </g>`;
 }).join(''):'';
 const grove=plants?`<g opacity="${f(treeReveal)}">
 ${orchardTree(W*(vert?.19:.21),y+H*.16,vert?.83:1.12,t,3,true)}
 ${orchardTree(W*(vert?.78:.78),y+H*.21,vert?.89:1.18,t,8,true)}
 </g>`:'';
 const rise=plants?1:smooth(t/95);
 return `<g data-environment="continental-landscape">
  <rect width="${W}" height="${H}" fill="url(#set-sky)"/>
  <circle cx="${f(W*.81)}" cy="${f(H*.21)}" r="${f(H*.17)}" fill="url(#set-sun)" opacity=".72"/>
  ${mountains(W,H,'#759d96',.65)}
  <path d="M0 ${f(y)}Q${f(W*.36)} ${f(y-20)} ${W} ${f(y+20)}" stroke="#e5ebc9" fill="none" opacity=".4"/>
  <g transform="translate(0 ${f((1-rise)*H*.4)})">
   ${hill}
   ${herbs}
   ${grove}
   <path d="M0 ${f(H*.92)}Q${f(W*.39)} ${f(H*.81)} ${f(W*.78)} ${f(H*.94)}T${W} ${f(H*.95)}V${H}H0Z" fill="#193f3f" opacity=".58"/>
  </g>
 </g>`;
}
function paradise(W:number,H:number,t:number) {
 const y=H*.69,vert=H>W;
 const up=smooth(t/90),scale=vert?.85:1.16;
 const path=`<path d="M${f(W*.47)} ${f(H)}Q${f(W*.67)} ${f(H*.83)} ${f(W*.57)} ${f(H*.67)}Q${f(W*.53)} ${f(H*.62)} ${f(W*.65)} ${f(H*.53)}" fill="none" stroke="#78b9b6" stroke-width="${f(vert?42:57)}" opacity=".72"/>
 <path d="M${f(W*.47)} ${f(H)}Q${f(W*.67)} ${f(H*.83)} ${f(W*.57)} ${f(H*.67)}Q${f(W*.53)} ${f(H*.62)} ${f(W*.65)} ${f(H*.53)}" fill="none" stroke="#b8e2cb" stroke-width="4" opacity=".6"/>`;
 const trees=`<g opacity="${f(up)}">
  ${orchardTree(W*.1,H*.76,scale*1.3,t,17,true)}
  ${orchardTree(W*.36,H*.68,scale*.84,t,5,true)}
  ${orchardTree(W*.76,H*.76,scale*1.32,t,11,true)}
  ${orchardTree(W*.96,H*.71,scale*.99,t,27,true)}
  ${orchardTree(W*.61,H*.59,scale*.73,t,39,true)}
 </g>`;
 const flowers=Array.from({length:35},(_,i)=>{
  const X=hash(i+91)*W,Y=y+hash(i+44)*H*.27,rad=3+hash(i+19)*3.5;
  return `<g transform="translate(${f(X)} ${f(Y)})">
   <path d="M0 3v-${f(rad*2.7)}" stroke="#417960" stroke-width="1.8"/>
   ${Array.from({length:5},(_,j)=>`<ellipse cx="${f(Math.cos(j*1.256)*rad)}" cy="${f(-rad*2+Math.sin(j*1.256)*rad)}" rx="${f(rad*.8)}" ry="${f(rad*.65)}" fill="${i%3===0?'#ffe8b9':i%3===1?'#d9b4ad':'#fbdb8c'}"/>`).join('')}
   <circle cy="${f(-rad*2)}" r="${f(rad*.42)}" fill="#d8ad55"/>
  </g>`;
 }).join('');
 return `<g data-environment="eden-orchard">
  <rect width="${W}" height="${H}" fill="url(#set-eden-sky)"/>
  <ellipse cx="${f(W*.62)}" cy="${f(H*.32)}" rx="${f(W*.29)}" ry="${f(H*.32)}" fill="url(#set-sun)" opacity=".48"/>
  ${mountains(W,H,'#709885',.66)}
  <path d="M0 ${f(y-35)}Q${f(W*.37)} ${f(y-85)} ${W} ${f(y-21)}V${H}H0Z" fill="#577e59"/>
  <path d="M0 ${f(y+12)}Q${f(W*.23)} ${f(y-50)} ${f(W*.52)} ${f(y+3)}T${W} ${f(y+17)}V${H}H0Z" fill="url(#set-ground)"/>
  <g opacity=".29">
  ${Array.from({length:7},(_,i)=>`<path d="M${f(W*.64+i*9)} ${f(H*.08)}L${f(W*.3+i*42)} ${H}" stroke="#fff1b3" stroke-width="${f(15+i%3*4)}"/>`).join('')}
  </g>
  ${path}
  ${trees}
  <g opacity="${f(up)}">${flowers}</g>
  <path d="M0 ${f(H*.94)}Q${f(W*.2)} ${f(H*.87)} ${f(W*.44)} ${f(H*.97)}T${W} ${f(H*.94)}V${H}H0Z" fill="#193c32" opacity=".46"/>
 </g>`;
}
export function renderIllustratedScene(sceneId:string,frame:number,start:number,width:number,height:number,birdsActive:boolean,treeReveal:number) {
 const vertical=height>width,W=vertical?760:1200,H=vertical?1200:760,t=Math.max(0,frame-start);
 const defs=`<defs>
 ${grad('set-sky',['#123747','#337c85','#a8c5a8'])}
 ${grad('set-sea',['#267b8b','#145363','#082d43'])}
 ${grad('set-water-volume',['#31697c','#092a42'])}
 ${grad('set-ground',['#a8bb85','#6e9672','#315d50'])}
 ${grad('set-eden-sky',['#244d57','#789f88','#edce95'])}
 ${grad('set-trunk',['#c6a577','#806b4d','#544c3b'])}
 ${radial('set-void','#143c4d','#030b18')}
 ${radial('set-globe','#82bfb6','#062339')}
 ${radial('set-atmosphere','#7fc3c7','#0b2b49')}
 <radialGradient id="set-sun"><stop stop-color="#fff2c8" stop-opacity=".9"/><stop offset="1" stop-color="#fff2c8" stop-opacity="0"/></radialGradient>
 <radialGradient id="set-vignette"><stop offset=".28" stop-color="#081824" stop-opacity="0"/><stop offset="1" stop-color="#071724" stop-opacity=".57"/></radialGradient>
 </defs>`;
 let artwork='';
 if(sceneId==='origin')artwork=planet(W,H,t);
 else if(sceneId==='sky')artwork=`<g data-environment="expanse">${skyAndWater(W,H,t,vertical?.55:.53)}
  <path d="M0 ${f(H*.45)}Q${f(W*.24)} ${f(H*.4)} ${f(W*.53)} ${f(H*.44)}T${W} ${f(H*.41)}" fill="none" stroke="#e7eee2" stroke-width="3" opacity=".22"/>
  ${Array.from({length:8},(_,i)=>`<ellipse cx="${f(W*hash(i+33))}" cy="${f(H*(.16+.28*hash(i+8)))}" rx="${f(32+hash(i+18)*50)}" ry="${f(4+hash(i+90)*9)}" fill="#e4ebd9" opacity=".15"/>`).join('')}
 </g>`;
 else if(sceneId==='life')artwork=oceanLife(W,H,t,birdsActive);
 else if(sceneId==='land'||sceneId==='plants')artwork=field(W,H,t,sceneId==='plants',treeReveal);
 else artwork=paradise(W,H,t);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" data-world="${sceneId}" data-set-v2="true">
 ${defs}
 ${artwork}
 ${motes(W,H,t)}
 <rect width="${W}" height="${H}" fill="url(#set-vignette)" opacity=".45"/>
 </svg>`;
}
