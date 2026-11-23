import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Real execution of the repo's deterministic TypeScript visual functions.
 * This avoids browser/GPU dependencies and catches NaN, broken camera curves and
 * accidental timing changes before an expensive Remotion Studio check.
 */
const cache=new Map();
function load(filename){
 const full=path.resolve(filename);
 if(cache.has(full))return cache.get(full).exports;
 if(full.endsWith('.json'))return JSON.parse(fs.readFileSync(full,'utf8'));
 const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{
  fileName:full,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 const module={exports:{}};
 cache.set(full,module);
 const localRequire=specifier=>{
  assert.ok(specifier.startsWith('.'),'Unexpected external dependency in visual renderer: '+specifier);
  const base=path.resolve(path.dirname(full),specifier);
  const attempts=[base,base+'.ts',base+'.tsx',base+'.json',base.replace(/\.js$/,'.ts')];
  const resolved=attempts.find(candidate=>fs.existsSync(candidate)&&fs.statSync(candidate).isFile());
  assert.ok(resolved,'Missing local source '+specifier+' from '+full);
  return load(resolved);
 };
 new Function('require','module','exports',code)(localRequire,module,module.exports);
 return module.exports;
}
const alignment=JSON.parse(fs.readFileSync('src/creation/alignment.json','utf8'));
const {sceneCamera}=load('src/creation/artDirection.ts');
const {worldStage}=load('src/creation/worldStage.ts');
const castSource=fs.readFileSync('src/creation/SceneCast.tsx','utf8');
const creationSource=fs.readFileSync('src/creation/Creation.tsx','utf8');
for(const name of ['AdamCharacter','EveCharacter','LlamaLikeAnimal','AnimalCharacter','SceneCastLayer'])assert.ok(castSource.includes('export const '+name));
assert.ok(creationSource.includes('<SceneCastLayer scene={scene} globalFrame={globalFrame}/>'), 'Cast must be keyed to the absolute Remotion frame');;
const {renderWorld}=load('src/creation/world.ts');
assert.equal(alignment.scenes.length,14);
assert.equal(alignment.durationInFrames,4250);
const ids=alignment.scenes.map(scene=>scene.id);
let views=0;
for(const scene of alignment.scenes){
 const duration=scene.end-scene.start;
 let previous=sceneCamera(0,duration,scene.id);
 for(let frame=1;frame<duration;frame++){
  const motion=sceneCamera(frame,duration,scene.id);
  assert.ok([motion.x,motion.y,motion.scale].every(Number.isFinite),'Nonfinite camera for '+scene.id);
  assert.ok(Math.abs(motion.x-previous.x)<1.2,'Camera X jump at '+scene.id+':'+frame);
  assert.ok(Math.abs(motion.y-previous.y)<1.2,'Camera Y jump at '+scene.id+':'+frame);
  assert.ok(Math.abs(motion.scale-previous.scale)<.001,'Camera zoom jump at '+scene.id+':'+frame);
  previous=motion;
 }
 for(const [width,height] of [[1920,1080],[1080,1920]]){
  const frames=[scene.start,Math.min(scene.end-1,scene.start+60),Math.floor((scene.start+scene.end)/2),scene.end-1];
  for(const frame of frames){
   const svg=renderWorld(frame,scene,width,height);
   assert.ok(svg.includes('data-world="'+scene.id+'"'));
   assert.ok(svg.includes('data-depth="air"'));
   assert.ok(!/NaN|undefined|Infinity/.test(svg),'Invalid numeric SVG for '+scene.id+':'+frame);
   assert.equal(svg,renderWorld(frame,scene,width,height),'Nondeterministic SVG '+scene.id+':'+frame);
   if(scene.id==='animals')assert.ok(!svg.includes('data-organic="animal"'),'No duplicate legacy animals');
   if(scene.id==='plants')assert.ok(svg.includes('data-organic="plant"'));
   if(['humanity','stewardship','good'].includes(scene.id)){
    assert.ok(!svg.includes('data-organic="human"'),'No duplicate legacy humans');
   }
   const stage=worldStage(frame,scene,width,height);
   assert.ok([stage.x,stage.y,stage.scale].every(Number.isFinite),'Invalid shared character stage');
   if(scene.id==='origin'){
    assert.ok(svg.includes('data-environment="spherical-earth"'),'Origin must be spherical, not a water oval');
    assert.ok(svg.includes('set-planet-clip'));
   }
   if(scene.id==='sky'||scene.id==='life'){
    assert.ok(svg.includes('data-set="sea-and-sky"'),'The sea needs a distinct sky and sea surface');
   }
   if(scene.id==='life'){
    assert.ok(svg.includes('data-environment="sea-sky"'));
    assert.ok(svg.includes('data-set="fish"'));
    if(frame>=alignment.markers.birds)assert.ok(svg.includes('data-set="bird"'));
   }
   if(scene.id==='eden'){
    assert.ok(svg.includes('data-environment="eden-orchard"'));
    assert.ok(svg.includes('data-set="orchard-tree"'));
    assert.ok(!svg.includes('M-260 260V-160'),'Do not restore the empty arch');
   }
   if(['origin','sky','life','land','plants','eden'].includes(scene.id)){
    assert.ok(svg.includes('data-set-v2="true"'),'Full-bleed artwork should replace old oval dioramas');
   }
   views++;
  }
 }
}
assert.deepEqual(ids,[
 'hook','origin','light','sky','land','plants','cosmos','life','animals',
 'humanity','stewardship','good','rest','eden'
]);
console.log('Visual QA passed: '+views+' deterministic frames across 14 scenes and 2 formats; camera continuity checked.');
