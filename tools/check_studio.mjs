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
     const headContours=[...root.querySelectorAll('[data-head-design]')].map(head=>{
      const face=head.querySelector('[data-part="head"]');
      const hair=head.querySelector('[data-part="hair-front"]');
      const hairline=head.querySelector('[data-part="fringe-sweep"]');
      const eye=head.querySelector('[data-part="eye-left"]');
      const forehead=face?.getBBox();
      const fringe=hairline?.getBBox();
      const eyes=eye?.getBBox();
      return {kind:head.getAttribute('data-head-design'),order:face&&hair?!!(face.compareDocumentPosition(hair)&Node.DOCUMENT_POSITION_FOLLOWING):false,
       integrated:!!(forehead&&fringe&&eyes&&fringe.y<forehead.y-7&&fringe.y+fringe.height<eyes.y-2),
       faceRatio:forehead&&forehead.width>0?forehead.height/forehead.width:null,
       hairFront:!!hair,skull:!!face};
     });
     return {headContours,frame:Number(root.getAttribute('data-creation-frame')),scene:svg?.getAttribute('data-world'),cast:[...root.querySelectorAll('[data-character-design]')].map(n=>n.getAttribute('data-character-design')),castLayers:[...root.querySelectorAll('[data-character-cast]')].map(n=>n.getAttribute('data-character-cast')),hair:[...root.querySelectorAll('[data-part="hair-front"]')].length,eyes:[...root.querySelectorAll('[data-part="eye-left"], [data-part="eye-right"]')].length,invalid:all.some(s=>/NaN|undefined|Infinity/.test(s.outerHTML)),xmlError:all.some(s=>!!new DOMParser().parseFromString(s.outerHTML,'image/svg+xml').querySelector('parsererror')),subtitle:subs?.textContent??null,highlighted:[...root.querySelectorAll('[data-emphasized="true"]')].map(n=>Number(n.getAttribute('data-word'))),branding:root.textContent.includes('SHALÓM'),ending:!!root.querySelector('[data-ending]'),subtitleHeight:s?s.height/(r.height/Number(svg?.getAttribute('height'))):0,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
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
  if(scene.id==='animals'){
   assert.deepEqual(state.cast,['llama','llama','llama'],'Three editable SVG animals expected');
   assert.deepEqual(state.castLayers,['animals']);
  }
  if(['humanity','stewardship','good'].includes(scene.id)){
   assert.deepEqual(state.cast,['adam','eve'],'Adam and Eve must retain their order');
   assert.deepEqual(state.castLayers,[scene.id]);
   assert.equal(state.hair,2,'Separate front hair layers expected');
   assert.equal(state.eyes,4,'Each human needs two independent eyes');
   assert.equal(state.headContours.length,2,'Both characters should have anatomical head layers');
   assert.deepEqual(state.headContours.map(h=>h.kind),['adam','eve']);
   assert.ok(state.headContours.every(h=>h.order&&h.integrated&&h.hairFront&&h.skull),
    'Hair must extend over the crown, integrate with the forehead and remain in front of the skull');
   assert.ok(state.headContours.every(h=>typeof h.faceRatio==='number'&&h.faceRatio>1.32&&h.faceRatio<1.58),
    'Face proportion must remain compact without losing its original proportions');
  }
  if(capture){const {value}=await page._client().send('Page.captureScreenshot',{format:'png',clip:{...state.rect,scale:1},captureBeyondViewport:true});fs.writeFileSync(`qa/rebuild/studio/${id}-${scene.id}-${frame}.png`,Buffer.from(value.data,'base64'));}
  report.push({id,frame,scene:scene.id,caption:state.subtitle,highlighted:state.highlighted});
 }
 for(const id of ['LaCreacion','LaCreacionVertical']) {
  for(const frame of samples)await visit(id,frame,true);
  // Explicit narrative moments: the generic sample could miss the birds,
  // mature trees or the garden and previously got overwritten by the ending.
  const detailedFrames=[
   d.markers.birds+22,
   d.words.find(w=>w.text.startsWith('árboles'))?.startMs/1000*d.fps+38,
   d.markers.eden+45,
   d.markers.close-25,
  ].filter(f=>Number.isFinite(f)).map(f=>Math.floor(f));
  for(const frame of detailedFrames)await visit(id,frame,true);
  await visit(id,d.durationInFrames-1,true);
  console.log(`STUDIO_QA ${id}: all 14 scenes + ending and key environmental moments passed`);
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
