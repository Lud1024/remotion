import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {serializeSrt} from '@remotion/captions';

const file='audio/ElevenLabs_2026-11-18T19_19_24__s50_sim75_cs15_v4.mp3';
const binary='node_modules/@remotion/compositor-win32-x64-msvc/';
const run=(name,args)=>{const r=spawnSync(binary+name+'.exe',args,{encoding:'utf8',maxBuffer:24000000});if(r.status!==0)throw new Error(r.stderr);return r;};
const durationSec=Number(JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration','-of','json','public/'+file]).stdout).format.duration);
const raw=JSON.parse(fs.readFileSync(fs.existsSync('qa/rebuild/refined.json')?'qa/rebuild/refined.json':'qa/rebuild/transcript.json','utf8')).transcription.filter(w=>w.text.trim());
const script=fs.readFileSync('docs/narration.txt','utf8').trim().split(/\s+/);
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'');
// Global text alignment catches missing/added words; source recognition is never replaced by evenly spaced text.
const m=script.length,n=raw.length;
const matrix=Array.from({length:m+1},()=>new Float64Array(n+1));
for(let i=0;i<=m;i++)matrix[i][0]=i;
for(let j=0;j<=n;j++)matrix[0][j]=j;
for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+(norm(script[i-1])===norm(raw[j-1].text)?0:.8));
const matches=new Map(),differences=[];
let i=m,j=n;
while(i||j){
 const cost=i&&j?(norm(script[i-1])===norm(raw[j-1].text)?0:.8):99;
 if(i&&j&&Math.abs(matrix[i][j]-(matrix[i-1][j-1]+cost))<1e-6){matches.set(i-1,j-1);if(cost)differences.push({scriptIndex:i-1,script:script[i-1],recognized:raw[j-1].text.trim()});i--;j--;}
 else if(i&&Math.abs(matrix[i][j]-(matrix[i-1][j]+1))<1e-6){differences.push({scriptIndex:i-1,script:script[i-1],recognized:null});i--;}
 else{differences.push({scriptIndex:null,script:null,recognized:raw[j-1].text.trim()});j--;}
}
assert.ok(matrix[m][n]/m<.06,'Transcription differs too much from supplied script; review audio before proceeding.');
assert.equal(matches.size,m,'Missing words need manual review.');

const waveform=fs.readFileSync('qa/rebuild/narration.wav');let dataStart=0,length=0,sr=16000;
for(let p=12;p+8<=waveform.length;){const id=waveform.toString('ascii',p,p+4),size=waveform.readUInt32LE(p+4);if(id==='fmt ')sr=waveform.readUInt32LE(p+12);if(id==='data'){dataStart=p+8;length=size;break;}p+=8+size+(size%2);}
assert.ok(length);
const rms=[];
for(let start=0;start<length/2;start+=sr/50){let sum=0,count=0;for(let s=start;s<Math.min(length/2,start+sr/50);s++){const v=waveform.readInt16LE(dataStart+s*2)/32768;sum+=v*v;count++;}rms.push(Math.sqrt(sum/count));}
const activityThreshold=.009;
const silences=[];let quietStart=null;
rms.forEach((v,k)=>{if(v<activityThreshold){quietStart??=k;}else if(quietStart!==null){if(k-quietStart>=8)silences.push({start:quietStart*20,end:k*20});quietStart=null;}});
if(quietStart!==null)silences.push({start:quietStart*20,end:rms.length*20});

const centers=script.map((_,k)=>{
 const word=raw[matches.get(k)];
 const dtw=word.tokens.filter(t=>t.t_dtw>=0&&/[\p{L}]/u.test(t.text)&&!t.text.includes('[_')).map(t=>t.t_dtw*10);
 return dtw.length?(Math.min(...dtw)+Math.max(...dtw))/2:(word.offsets.from+word.offsets.to)/2;
});
// DTW occasionally places a final consonant inside the following deliberate pause.
// Pull only those sentence-ending anchors back to the measured end of speech.
const pauseCorrections=[];
for(let k=0;k<centers.length;k++) {
 const pause=silences.find(s=>centers[k]>=s.start&&centers[k]<s.end);
 if(pause&&/[.!?,:…]$/.test(script[k])&&pause.start-(centers[k-1]??0)>70) {
  const corrected=Math.max((centers[k-1]??0)+30,pause.start-70);
  pauseCorrections.push({wordIndex:k,text:script[k],fromMs:centers[k],toMs:corrected});
  centers[k]=corrected;
 }
}
// DTW is monotone at token level; clamp tiny alignment reversals before refining with measured silence.
for(let k=1;k<centers.length;k++)centers[k]=Math.max(centers[k],centers[k-1]+10);
const firstActivity=rms.findIndex(v=>v>=activityThreshold)*20;
let lastActivity=rms.length-1;while(lastActivity>0&&rms[lastActivity]<activityThreshold)lastActivity--;
const starts=[],ends=[];
for(let k=0;k<script.length;k++){
 let start=k?(centers[k-1]+centers[k])/2:Math.max(0,firstActivity);
 let end=k+1<script.length?(centers[k]+centers[k+1])/2:Math.min(durationSec*1000,(lastActivity+1)*20);
 const before=silences.filter(s=>s.start>=centers[k-1]&&s.end<=centers[k]).at(-1);
 const after=silences.find(s=>s.start>=centers[k]&&s.end<=centers[k+1]);
 if(before)start=before.end;
 if(after)end=after.start;
 starts.push(Math.round(start));ends.push(Math.round(Math.max(start+10,end)));
}
for(let k=0;k<starts.length;k++){if(k)starts[k]=Math.max(starts[k],ends[k-1]);ends[k]=Math.max(starts[k]+10,ends[k]);}
const fps=30,closingSeconds=2,durationInFrames=Math.ceil((durationSec+closingSeconds)*fps);
const words=script.map((text,k)=>{
 const source=raw[matches.get(k)],p=source.tokens.filter(t=>/[\p{L}]/u.test(t.text)).map(t=>t.p);
 return {text,startMs:starts[k],endMs:ends[k],timestampMs:Math.round(centers[k]),confidence:p.reduce((a,b)=>a+b,0)/p.length,emphasis:false};
});
const find=(phrase,from=0)=>{
 const terms=phrase.split(/\s+/).map(norm);
 for(let k=from;k<=words.length-terms.length;k++)if(terms.every((term,l)=>norm(words[k+l].text)===term))return k;
 throw new Error('Phrase not found: '+phrase);
};
const highlight=[['la luz aparece',1],['antes que el sol',0],['antes que el sol',3],['desordenada y vacía',0],['desordenada y vacía',2],['Espíritu de Dios',0],['Sea la luz',2],['hubo luz',1],['llamó cielo',1],['tierra seca',0],['produjera vegetación',1],['cuarto día',0],['sol, la luna y las estrellas',0],['sol, la luna y las estrellas',2],['sol, la luna y las estrellas',5],['las estaciones',1],['seres vivos',1],['las aves',1],['animales terrestres',0],['a su imagen',2],['hombre y mujer',0],['hombre y mujer',2],['la responsabilidad',1],['ejercer dominio',1],['bueno en gran manera',0],['bueno en gran manera',3],['Dios descansó',1],['bendijo y santificó',2],['huerto de Edén',2],['siguiente capítulo',0]];
for(const [phrase,k]of highlight)words[find(phrase)+k].emphasis=true;
const pages=[];let page=[];
for(let k=0;k<words.length;k++){
 page.push(k);const word=words[k],next=words[k+1];
 const punctuation=/[.!?…:]$/.test(word.text),gap=next?next.startMs-word.endMs:1000;
 const chars=page.map(idx=>words[idx].text).join(' ').length;
 if(page.length>=6||chars>=39||punctuation||gap>220||k===words.length-1){pages.push({text:page.map(idx=>words[idx].text).join(' '),startMs:words[page[0]].startMs,endMs:Math.min(next?next.startMs:durationSec*1000,word.endMs+80),timestampMs:null,confidence:null,wordIndices:page});page=[];}
}
const specs=[
 ['hook','LA LUZ\nANTES DEL SOL','Génesis 1','Hay un detalle'],
 ['origin','EN EL\nPRINCIPIO','Génesis 1:1–2','Génesis nos cuenta'],
 ['light','SEA\nLA LUZ','Génesis 1:3–5','Entonces Dios dijo'],
 ['sky','EL CIELO\nSE ABRE','Génesis 1:6–8','Después, en el segundo'],
 ['land','TIERRA\nFIRME','Génesis 1:9–10','En el tercer día'],
 ['plants','LA TIERRA\nFLORECE','Génesis 1:11–13','Pero no terminó allí'],
 ['cosmos','SOL, LUNA\nY ESTRELLAS','Génesis 1:14–19','Y ahora viene algo'],
 ['life','EL AGUA\nCOBRA VIDA','Génesis 1:20–23','En el quinto día'],
 ['animals','CADA UNO\nSEGÚN SU ESPECIE','Génesis 1:24–25','Luego llegó el sexto'],
 ['humanity','A SU\nIMAGEN','Génesis 1:26–27','Y después, Dios creó'],
 ['stewardship','HOMBRE\nY MUJER','Génesis 1:27–30','El texto hace una'],
 ['good','BUENO EN\nGRAN MANERA','Génesis 1:31','Al contemplar todo'],
 ['rest','EL SÉPTIMO\nDÍA','Génesis 2:1–3','Pero la historia de'],
 ['eden','LA HISTORIA\nCONTINÚA','Génesis 2','Así termina el primer']
];
const scenes=specs.map(([id,title,reference,phrase],index)=>({id,title,reference,wordIndex:find(phrase),start:index?Math.floor(words[find(phrase)].startMs/1000*fps):0,end:0}));
scenes.forEach((s,k)=>s.end=scenes[k+1]?.start??durationInFrames);
const marker=phrase=>Math.round(words[find(phrase)].startMs/1000*fps);
const markers={light:marker('Sea la luz')+Math.round((words[find('Sea la luz')+2].endMs-words[find('Sea la luz')].startMs)/1000*fps),birds:marker('las aves'),animals:marker('animales terrestres'),humanity:marker('al ser humano'),verdict:marker('bueno en gran manera'),rest:marker('Dios descansó'),eden:marker('huerto de Edén'),close:Math.ceil(durationSec*fps)};
const percentile=[...rms].sort((a,b)=>a-b)[Math.floor(rms.length*.95)]||1;
const envelope=rms.map(v=>Math.round(Math.max(0,Math.min(1,(v-.006)/percentile))*1000)/1000);
const alignment={file,durationSec,durationInFrames,fps,sha256:createHash('sha256').update(fs.readFileSync('public/'+file)).digest('hex'),words,pages,scenes,markers,envelope,envelopeHz:50,method:'Independent local Whisper base multilingual, short silence-bounded chunks, DTW token timestamps and measured pause refinement. Word timing and mouth phonemes remain estimates.',differences:differences.reverse(),silences,pauseCorrections};
fs.writeFileSync('src/creation/alignment.json',JSON.stringify(alignment,null,2)+'\n');
fs.writeFileSync('docs/subtitulos.srt',serializeSrt({lines:pages.map(page=>[{text:page.text,startMs:page.startMs,endMs:page.endMs,timestampMs:null,confidence:null}])}));
fs.writeFileSync('qa/rebuild/alignment-report.json',JSON.stringify({durationSec,videoSeconds:durationInFrames/fps,scriptWords:m,recognizedWords:n,matchedWords:matches.size,score:matrix[m][n],differences:alignment.differences,highlights:words.filter(w=>w.emphasis).length,pauseCorrections,scenes,markers},null,2)+'\n');
console.log(JSON.stringify({durationSec,videoSeconds:durationInFrames/fps,scriptWords:m,recognizedWords:n,differences:alignment.differences,highlights:words.filter(w=>w.emphasis).length,scenes:scenes.map(s=>({id:s.id,start:s.start/fps,end:s.end/fps}))},null,2));
