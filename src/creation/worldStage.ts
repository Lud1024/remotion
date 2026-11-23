import {lerp,smooth} from '../core/util';
import {sceneCamera} from './artDirection';
import type {Scene} from './world';

/** Shared SVG stage transform. Keeps the character React layers pixel-aligned
 * with the legacy scenic SVG on both horizontal and vertical compositions. */
export function worldStage(frame:number,scene:Scene,width:number,height:number) {
 const vertical=height>width;
 const local=frame-scene.start;
 const unit=Math.min(width,height)/1080;
 const reframe=vertical||scene.id==='eden'?0:smooth((local-(scene.id==='hook'?220:130))/35);
 const centerX=width*(vertical?.5:lerp(.68,.5,reframe));
 const centerY=height*(vertical?.36:.43);
 const camera=sceneCamera(local,scene.end-scene.start,scene.id);
 return {
  x:centerX+camera.x*unit,
  y:centerY+camera.y*unit,
  scale:(vertical?1.05:1)*unit*(1+reframe*.18)*camera.scale,
 };
}
