/** Short, silence-bounded local decoding reduces DTW drift at long pauses. */
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const alignment=JSON.parse(fs.readFileSync('src/creation/alignment.json','utf8'));
const raw=JSON.parse(fs.readFileSync('qa/rebuild/transcript.json','utf8'));
const dir='node_modules/.cache/shalom-whisper/refined';fs.mkdirSync(dir,{recursive:true});
const cuts=[0];
while(cuts.at(-1)+17000<alignment.durationSec*1000) {
 const previous=cuts.at(-1),target=previous+12500;
 const pauses=alignment.silences.filter(s=>s.end-s.start>=220&&s.start>previous+8000&&s.end<previous+17000);
 if(!pauses.length){cuts.push(previous+14000);continue;}
 pauses.sort((a,b)=>Math.abs((a.start+a.end)/2-target)-Math.abs((b.start+b.end)/2-target));
 cuts.push(Math.round((pauses[0].start+pauses[0].end)/2));
}
cuts.push(Math.ceil(alignment.durationSec*1000));
const merged=[];
for(let i=0;i<cuts.length-1;i++) {
 const start=cuts[i],duration=cuts[i+1]-start,base=dir+'/part-'+i;
 const decode=spawnSync('node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe',['-y','-v','error','-ss',String(start/1000),'-i','qa/rebuild/narration.wav','-t',String(duration/1000),'-ac','1','-ar','16000','-c:a','pcm_s16le',base+'.wav'],{encoding:'utf8'});
 if(decode.status)throw new Error(decode.stderr);
 const r=spawnSync('node_modules/.cache/shalom-whisper/bin/Release/whisper-cli.exe',['-m','node_modules/.cache/shalom-whisper/ggml-base.bin','-f',base+'.wav','-l','es','-t','4','-ng','-nfa','-dtw','base','-ojf','-of',base,'-ml','1','-sow'],{encoding:'utf8',maxBuffer:10000000});
 if(r.status)throw new Error(r.stderr);
 const chunk=JSON.parse(fs.readFileSync(base+'.json','utf8'));
 for(const segment of chunk.transcription.filter(s=>s.text.trim())) {
  segment.offsets.from+=start;segment.offsets.to+=start;
  segment.tokens=segment.tokens.map(token=>({...token,t_dtw:token.t_dtw>=0?token.t_dtw+start/10:-1}));
  merged.push(segment);
 }
 console.log(`refined ${i+1}/${cuts.length-1}: ${(start/1000).toFixed(2)}–${(cuts[i+1]/1000).toFixed(2)} s`);
}
fs.writeFileSync('qa/rebuild/refined.json',JSON.stringify({...raw,transcription:merged,chunkBoundaries:cuts},null,2)+'\n');
console.log('refined words '+merged.length);
