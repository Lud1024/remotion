import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('src/creation/alignment.json','utf8'));
const dir='public/audio/creation';fs.mkdirSync(dir,{recursive:true});
const sr=32000,duration=data.durationInFrames/data.fps,N=Math.round(duration*sr);
const score=[new Float32Array(N),new Float32Array(N)],fx=[new Float32Array(N),new Float32Array(N)];
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const hz=m=>440*2**((m-69)/12);
let seed=18112026;const rand=()=>{seed=Math.imul(seed,1664525)+1013904223|0;return (seed>>>0)/4294967296*2-1;};
const chords=[[50,57,60,65],[38,45,57],[46,53,58,62],[43,50,57,62],[46,53,58,65],[48,55,60,64],[50,57,62,66],[43,50,59,62],[45,52,57,60],[48,55,60,64],[46,53,58,65],[50,57,62,66],[50,57,62,69],[47,54,59,62]];
data.scenes.forEach((scene,index)=>{
 const notes=chords[index],from=Math.max(0,scene.start/data.fps-.8),to=Math.min(duration,scene.end/data.fps+1.3);
 for(let i=Math.floor(from*sr);i<to*sr;i++) {
  const t=i/sr,env=ease((t-from)/1.6)*ease((to-t)/2.2),level=scene.id==='origin'?.09:scene.id==='rest'?.1:.145;
  let left=0,right=0;
  for(let n=0;n<notes.length;n++){
   const f=hz(notes[n]),phase=n*.8;
   left+=(Math.sin(t*f*Math.PI*2+phase+.12*Math.sin(t*.7+n))+.12*Math.sin(t*f*Math.PI*4+phase))/notes.length;
   right+=(Math.sin(t*f*Math.PI*2.0005+phase+.11*Math.sin(t*.72+n))+.12*Math.sin(t*f*Math.PI*4.0007+phase))/notes.length;
  }
  // Let the words "Sea la luz" occupy a quiet space, then release the harmony.
  const light=data.markers.light/data.fps;
  const room=1-ease((t-(light-1.3))/.15)*(1-ease((t-(light+.1))/.5))*.9;
  score[0][i]+=left*env*level*room;score[1][i]+=right*env*level*room;
 }
 // Sparse, soft bell arpeggios: an intentional melody, not a constant drone.
 if(!['origin','rest'].includes(scene.id))for(let step=0;step<Math.floor((to-from)/1.2);step++){
  const at=from+1.8+step*1.2,f=hz(notes[step%notes.length]+12),pan=Math.sin(step*1.7)*.5;
  for(let j=0;j<sr*1.6;j++){
   const i=Math.floor(at*sr)+j;if(i>=N||i<0)break;const t=j/sr;
   const value=(Math.sin(2*Math.PI*f*t)+.18*Math.sin(2*Math.PI*f*3*t))*Math.exp(-t*4.2)*ease(t/.014)*.023;
   score[0][i]+=value*(1-pan);score[1][i]+=value*(1+pan);
  }
 }
});
const events=[];
function effect(at,kind,length,gain,pan=0) {
 events.push({at,kind,length,gain,pan});let low=0,high=0;
 for(let j=0;j<length*sr;j++){
  const i=Math.round(at*sr)+j;if(i<0||i>=N)continue;
  const t=j/sr,p=t/length,n=rand();low+=.08*(n-low);high+=.34*(n-high);
  const band=high-low;let v=0;
  if(kind==='air')v=band*Math.sin(Math.PI*p)**2;
  if(kind==='water')v=(band*.8+Math.sin(2*Math.PI*(660*t+320*t*t))*.12)*ease(t/.012)*Math.exp(-t*4);
  if(kind==='bloom')v=(Math.sin(2*Math.PI*330*t)+Math.sin(2*Math.PI*660*t)*.35+Math.sin(2*Math.PI*990*t)*.18)*Math.exp(-t*2)*ease(t/.012);
  if(kind==='light')v=(Math.sin(2*Math.PI*110*t)*.24+Math.sin(2*Math.PI*330*t)*.3+Math.sin(2*Math.PI*660*t)*.18+band*.55)*Math.exp(-t*4)*ease(t/.009);
  if(kind==='stone')v=(Math.sin(2*Math.PI*220*t)*.3+band*.7)*Math.exp(-t*9)*ease(t/.005);
  if(kind==='wing')v=band*Math.sin(Math.PI*p)**3;
  if(kind==='spark')v=(Math.sin(2*Math.PI*1320*t)+Math.sin(2*Math.PI*1760*t)*.3)*Math.exp(-t*5)*ease(t/.012);
  v*=gain;fx[0][i]+=v*Math.sqrt((1-pan)/2);fx[1][i]+=v*Math.sqrt((1+pan)/2);
 }
}
const start=id=>data.scenes.find(s=>s.id===id).start/data.fps;
effect(1,'spark',1.2,.1,.25);
effect(start('origin'), 'air',2.4,.22,-.25);
effect(data.markers.light/data.fps-1.2,'air',1.2,.26);
effect(data.markers.light/data.fps,'light',1.1,.6);
effect(data.markers.light/data.fps+.22,'bloom',2.4,.09,.2);
effect(start('sky')+.5,'water',1.5,.32,-.25);
effect(start('land')+.8,'stone',.8,.4,.1);
effect(start('plants')+2.6,'air',1.1,.22,-.3);
effect(start('plants')+5.2,'bloom',1.3,.08,.3);
effect(start('cosmos')+3,'air',1.1,.24);
for(let i=0;i<3;i++)effect(start('cosmos')+6.2+i*.8,'spark',1.1,.07,i%2?.5:-.5);
effect(start('life')+.8,'water',1.2,.4,-.2);
for(let i=0;i<3;i++)effect(data.markers.birds/data.fps+i*.45,'wing',.32,.34,i%2?.4:-.4);
for(let i=0;i<3;i++)effect(data.markers.animals/data.fps+i*.55,'stone',.22,.19,-.25);
effect(data.markers.humanity/data.fps+.4,'bloom',1.8,.085,.1);
effect(data.markers.verdict/data.fps+.2,'bloom',2.8,.09);
effect(data.markers.rest/data.fps,'air',2.4,.13,-.2);
effect(data.markers.eden/data.fps,'air',1.8,.24,.25);

function write(name,channels,ceiling) {
 let peak=0;for(const channel of channels)for(const v of channel)peak=Math.max(peak,Math.abs(v));
 const g=peak>ceiling?ceiling/peak:1;
 const out=Buffer.alloc(44+N*4);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);out.writeUInt32LE(sr,24);out.writeUInt32LE(sr*4,28);out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(N*4,40);
 for(let i=0;i<N;i++){const fade=ease(i/sr/.03)*ease((duration-i/sr)/.7);for(let ch=0;ch<2;ch++)out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,channels[ch][i]*g*fade))*32767),44+i*4+ch*2);}
 fs.writeFileSync(dir+'/'+name+'.wav',out);console.log(`${name}: ${duration.toFixed(3)}s, stereo, peak ${(20*Math.log10(peak*g)).toFixed(2)}dBFS`);
}
write('music',score,.45);write('effects',fx,.48);
fs.writeFileSync('src/creation/sound.json',JSON.stringify({events,voiceGain:.94,musicSpeakingGain:.24,musicGapGain:.42,effectsGain:.65,previousEffectsGain:.45,effectsGainIncreaseDb:20*Math.log10(.65/.45),mobileDesign:'Events include 330–1760 Hz harmonics and filtered noise so they do not rely on sub bass.'},null,2)+'\n');
