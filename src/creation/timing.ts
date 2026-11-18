import alignment from './alignment.json';
import type {Caption} from '@remotion/captions';
export const STORY=alignment;
export const WORDS: (Caption&{emphasis:boolean})[]=alignment.words;
export const PAGES=alignment.pages;
export const FPS=alignment.fps;
export const TOTAL=alignment.durationInFrames;
export function sceneAt(frame:number) {
 return alignment.scenes.find(s=>frame>=s.start&&frame<s.end)??alignment.scenes[alignment.scenes.length-1];
}
export function wordAt(frame:number) {
 const ms=frame/FPS*1000;
 return WORDS.findIndex(w=>ms>=w.startMs&&ms<w.endMs);
}
export function amplitudeAt(frame:number) {
 return alignment.envelope[Math.floor(frame/FPS*alignment.envelopeHz)]??0;
}
