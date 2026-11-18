import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const d=JSON.parse(fs.readFileSync('src/creation/alignment.json','utf8'));
const settings=JSON.parse(fs.readFileSync('src/creation/sound.json','utf8'));
const ffmpeg='node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe';
const tmp='node_modules/.cache/shalom-whisper/new-voice-32k.wav';
const run=args=>{const r=spawnSync(ffmpeg,args,{encoding:'utf8',maxBuffer:10000000});if(r.status)throw new Error(r.stderr);return r;};
run(['-y','-v','error','-i','public/'+d.file,'-ar','32000','-ac','1','-c:a','pcm_s16le',tmp]);
function wav(file){const b=fs.readFileSync(file);let channels=0,rate=0;for(let p=12;p+8<=b.length;){const id=b.toString('ascii',p,p+4),size=b.readUInt32LE(p+4);if(id==='fmt '){channels=b.readUInt16LE(p+10);rate=b.readUInt32LE(p+12);}if(id==='data')return {b,offset:p+8,size,channels,rate};p+=8+size+(size%2);}throw new Error('No PCM data');}
const voice=wav(tmp),music=wav('public/audio/creation/music.wav'),effects=wav('public/audio/creation/effects.wav');
for(const w of [voice,music,effects])assert.equal(w.rate,32000);
const sr=32000,N=Math.round(d.durationInFrames/d.fps*sr),out=Buffer.alloc(44+N*4);
assert.equal(music.size,N*4);assert.equal(effects.size,N*4);
out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);out.writeUInt32LE(sr,24);out.writeUInt32LE(sr*4,28);out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(N*4,40);
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const sample=(w,i,ch)=>i*w.channels*2+ch*2<w.size?w.b.readInt16LE(w.offset+i*w.channels*2+ch*2)/32768:0;
let peak=0,gain=0,previousFrame=-1;
for(let i=0;i<N;i++){
 const frame=Math.floor(i/sr*d.fps);
 if(frame!==previousFrame){const ms=frame/d.fps*1000,active=d.words.some(w=>ms>=w.startMs-100&&ms<w.endMs+140);gain=(active?settings.musicSpeakingGain:settings.musicGapGain)*smooth((d.durationInFrames-frame)/30);previousFrame=frame;}
 for(let ch=0;ch<2;ch++){
  const value=sample(voice,i,0)*settings.voiceGain+sample(music,i,ch)*gain+sample(effects,i,ch)*settings.effectsGain;
  peak=Math.max(peak,Math.abs(value));out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*4+ch*2);
 }
}
assert.ok(peak<1,'Mix would clip');
const mix='qa/rebuild/mix-review.wav';fs.writeFileSync(mix,out);
const measure=file=>{const r=run(['-hide_banner','-nostats','-i',file,'-af','loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-f','null','-']);return JSON.parse(r.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/)[0]);};
const measured=measure(mix);assert.ok(Number(measured.input_tp)<-0.5,'Need more headroom');
// A phone-like band pass verifies that the sound effects retain measurable midrange energy.
function biquad(kind,cutoff) {
 const w=2*Math.PI*cutoff/sr,c=Math.cos(w),a=Math.sin(w)/(2*Math.SQRT1_2),a0=1+a;
 const b0=(kind==='high'?(1+c)/2:(1-c)/2)/a0,b1=(kind==='high'?-(1+c):1-c)/a0,b2=b0,a1=-2*c/a0,a2=(1-a)/a0;
 let x1=0,x2=0,y1=0,y2=0;
 return x=>{const y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y;};
}
const phoneBuffer=Buffer.from(effects.b),chains=[0,1].map(()=>({high:biquad('high',300),low:biquad('low',4000)}));
let originalEnergy=0,phoneEnergy=0;
for(let i=0;i<N;i++)for(let ch=0;ch<2;ch++){
 const input=sample(effects,i,ch),filtered=chains[ch].low(chains[ch].high(input));
 originalEnergy+=input*input;phoneEnergy+=filtered*filtered;
 phoneBuffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,filtered))*32767),effects.offset+i*4+ch*2);
}
fs.writeFileSync('qa/rebuild/effects-phone-band.wav',phoneBuffer);
const phone=measure('qa/rebuild/effects-phone-band.wav');
const phoneBand={rangeHz:[300,4000],integratedLufs:Number(phone.input_i),truePeakDb:Number(phone.input_tp),retainedEnergyDb:10*Math.log10(phoneEnergy/originalEnergy)};
assert.ok(phoneBand.retainedEnergyDb>-12,'Sound effects depend too much on low bass');
const report={audioSeconds:d.durationSec,videoSeconds:d.durationInFrames/d.fps,samplePeakDb:20*Math.log10(peak),integratedLufs:Number(measured.input_i),truePeakDb:Number(measured.input_tp),effectsGain:settings.effectsGain,effectsIncreaseDb:settings.effectsGainIncreaseDb,mobileBand:phoneBand,narrationTracks:1,note:'Phone-band analysis is a simulation; physical loudspeaker listening is still recommended.'};
fs.writeFileSync('qa/rebuild/audio-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
