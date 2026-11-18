import React from 'react';
import {Composition} from 'remotion';
import {Creation} from './creation/Creation';
import {TOTAL} from './creation/timing';
export const RemotionRoot:React.FC=()=> <>
 <Composition id="LaCreacion" component={Creation} durationInFrames={TOTAL} fps={30} width={1920} height={1080} defaultProps={{captions:true,withAudio:true}}/>
 <Composition id="LaCreacionVertical" component={Creation} durationInFrames={TOTAL} fps={30} width={1080} height={1920} defaultProps={{captions:true,withAudio:true}}/>
</>;
