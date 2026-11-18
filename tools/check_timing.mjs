import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const d=JSON.parse(fs.readFileSync('src/creation/alignment.json','utf8'));
const normalized=s=>s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'');
assert.equal(d.words.length,349);assert.equal(d.scenes.length,14);
assert.equal(createHash('sha256').update(fs.readFileSync('public/'+d.file)).digest('hex'),d.sha256);
assert.equal(d.words.map(w=>normalized(w.text)).join(' '),fs.readFileSync('docs/narration.txt','utf8').trim().split(/\s+/).map(normalized).join(' '));
let cursor=0;
for(const scene of d.scenes){assert.equal(scene.start,cursor);assert.ok(scene.end>scene.start);cursor=scene.end;}
assert.equal(cursor,d.durationInFrames);
for(let i=0;i<d.words.length;i++){
 const w=d.words[i];assert.ok(w.startMs>=0&&w.endMs>w.startMs&&w.endMs<=d.durationSec*1000);
 if(i)assert.ok(w.startMs>=d.words[i-1].endMs);
 assert.ok(w.endMs-w.startMs<1500,'Suspicious word duration: '+w.text);
}
const shown=[];
for(let i=0;i<d.pages.length;i++){
 const p=d.pages[i];assert.ok(p.startMs<p.endMs);assert.ok(p.wordIndices.length<=6);
 if(i)assert.ok(p.startMs>=d.pages[i-1].endMs);
 assert.equal(p.text,p.wordIndices.map(n=>d.words[n].text).join(' '));
 assert.equal(p.startMs,d.words[p.wordIndices[0]].startMs);
 assert.ok(p.endMs-d.words[p.wordIndices.at(-1)].endMs<=81);
 shown.push(...p.wordIndices);
}
assert.deepEqual(shown,d.words.map((_,i)=>i));
const emphasized=d.words.filter(w=>w.emphasis);
assert.equal(emphasized.length,30);assert.ok(emphasized.length/d.words.length<.1);
assert.ok(d.markers.light>d.scenes.find(s=>s.id==='light').start);
assert.ok(d.markers.light<d.scenes.find(s=>s.id==='sky').start);
assert.ok(d.markers.birds>d.scenes.find(s=>s.id==='life').start);
assert.ok(d.markers.humanity>d.scenes.find(s=>s.id==='humanity').start);
assert.ok(d.markers.close<d.durationInFrames);
const narration=fs.readFileSync('src/creation/Creation.tsx','utf8');
assert.ok(!narration.includes('audio/impacto'));
const report={words:349,captionPages:d.pages.length,emphasizedWords:30,scenes:14,audioSeconds:d.durationSec,videoSeconds:d.durationInFrames/d.fps,sourceHashMatches:true,captionOverlaps:0,captionCoverage:'all words, once, in order',recognitionSpellingDifferences:d.differences,pauseRefinements:d.pauseCorrections.length,note:'These checks establish temporal consistency. Word onsets come from automatic DTW alignment, not a human phonetic annotation.'};
fs.writeFileSync('qa/rebuild/timing-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
