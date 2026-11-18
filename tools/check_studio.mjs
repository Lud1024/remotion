import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser} from '@remotion/renderer';
const d=JSON.parse(fs.readFileSync('src/creation/alignment.json','utf8'));
const samples=d.scenes.map(s=>Math.min(s.end-2,s.start+80));
const keyWords=d.words.map((w,i)=>({...w,i})).filter(w=>w.emphasis);
const b=await openBrowser('chrome',{logLevel:'error'});
const report=[];
try {
 const errors=[];
 const page=await b.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:()=>{},onLog:()=>{}});
 page.on('error',e=>errors.push(e.message));
 await page.setViewport({width:1600,height:1180,deviceScaleFactor:1});
 await page.evaluateOnNewDocument(()=>{const f=Number(new URL(location.href).searchParams.get('qa')||0);localStorage.setItem('remotion.time-all',JSON.stringify({LaCreacion:f,LaCreacionVertical:f}));});
 fs.mkdirSync('qa/rebuild/studio',{recursive:true});
 async function visit(id,frame,capture=false) {
  await page.goto({url:`http://localhost:3000/${id}?qa=${frame}`,timeout:30000});
  const state=await page.evaluate(async()=>{
   for(let i=0;i<120;i++){
    const root=document.querySelector('[data-creation-frame]');
    if(root){
     await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
     await new Promise(r=>setTimeout(r,100));
     const svg=root.querySelector('[data-world]'),r=root.getBoundingClientRect(),subs=root.querySelector('[data-subtitles]'),s=subs?.getBoundingClientRect();
     const all=[...root.querySelectorAll('svg')];
     return {frame:Number(root.getAttribute('data-creation-frame')),scene:svg?.getAttribute('data-world'),invalid:all.some(s=>/NaN|undefined|Infinity/.test(s.outerHTML)),xmlError:all.some(s=>!!new DOMParser().parseFromString(s.outerHTML,'image/svg+xml').querySelector('parsererror')),subtitle:subs?.textContent??null,highlighted:[...root.querySelectorAll('[data-emphasized="true"]')].map(n=>Number(n.getAttribute('data-word'))),branding:root.textContent.includes('SHALÓM'),ending:!!root.querySelector('[data-ending]'),subtitleHeight:s?s.height/(r.height/Number(svg?.getAttribute('height'))):0,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
    }
    await new Promise(r=>setTimeout(r,80));
   }
   return {error:document.body.innerText.slice(-1000)};
  });
  assert.ok(!state.error,JSON.stringify(state));assert.equal(state.frame,frame);assert.equal(state.invalid,false);assert.equal(state.xmlError,false);assert.deepEqual(errors,[]);
  const scene=d.scenes.find(s=>frame>=s.start&&frame<s.end);assert.equal(state.scene,scene.id);
  const ms=frame/d.fps*1000,caption=d.pages.find(p=>ms>=p.startMs&&ms<p.endMs);
  assert.equal(state.subtitle,caption?.text??null,'Caption text/time mismatch');
  const expected=caption?caption.wordIndices.filter(i=>d.words[i].emphasis&&ms>=d.words[i].startMs):[];
  assert.deepEqual(state.highlighted,expected,'Emphasis must follow spoken words only');
  if(frame<d.markers.close)assert.equal(state.branding,false);
  if(frame>=d.markers.close+24)assert.ok(state.ending&&state.branding,'Final black card must be present');
  assert.ok(state.subtitleHeight<190,'Captions exceed two lines at this size');
  if(capture){const {value}=await page._client().send('Page.captureScreenshot',{format:'png',clip:{...state.rect,scale:1},captureBeyondViewport:true});fs.writeFileSync(`qa/rebuild/studio/${id}-${scene.id}.png`,Buffer.from(value.data,'base64'));}
  report.push({id,frame,scene:scene.id,caption:state.subtitle,highlighted:state.highlighted});
 }
 for(const id of ['LaCreacion','LaCreacionVertical']) {
  for(const frame of samples)await visit(id,frame,true);
  await visit(id,d.durationInFrames-1,true);
  console.log(`STUDIO_QA ${id}: all 14 scenes + ending passed`);
 }
 for(const word of keyWords) {
  // Check both sides of each emphasis boundary in the horizontal composition.
  await visit('LaCreacion',Math.max(0,Math.ceil(word.startMs/1000*d.fps)-1));
  await visit('LaCreacion',Math.ceil(word.startMs/1000*d.fps)+1);
 }
 fs.writeFileSync('qa/rebuild/studio-report.json',JSON.stringify({checked:report.length,errors,frames:report},null,2)+'\n');
 console.log(`STUDIO_QA ${report.length} checks passed, including all 30 emphasis transitions`);
}catch(error){console.log('STUDIO_QA FAILED '+error.stack);process.exitCode=1;}
finally{await b.close({silent:true});}
