import React from 'react';
import {Composition} from 'remotion';
import {BTDReel, BTDReelProps} from './BTDReel';
import {BTDReelV2, BTDReelV2Props} from './BTDReelV2';
import {BTDAd2} from './BTDAd2';
import {BTDAd3} from './BTDAd3';
import {BTDReelV3} from './BTDReelV3';
import {BTDReelBiirthplace} from './BTDReelBiirthplace';
import {BTDReelKateSykes} from './BTDReelKateSykes';
import {BTDReelDonKai} from './BTDReelDonKai';
import {BTDReelGirlsweetvoiced} from './BTDReelGirlsweetvoiced';
import {BTDReelAllWeHold} from './BTDReelAllWeHold';
import {BTDReelSungHolly} from './BTDReelSungHolly';
import {WaveformTest} from './WaveformTest';
import {BTDArchiveAd} from './BTDArchiveAd';

const defaultProps: BTDReelProps = {
  artistName: 'SLOE JACK',
  songTitle: 'POUR ME A DRINK',
  artUrl: 'https://i.scdn.co/image/ab6761610000e5eb29215e27380806288de95f92',
  counterValue: '02 - 24 - 26',
  variant: 'artist-discovery',
};

const defaultPropsV2: BTDReelV2Props = {
  artistName: 'GORILLAZ',
  songTitle: 'The Plastic Guru',
  artUrl: 'https://i.scdn.co/image/ab67616d0000b273eeb01b41f48210d032d1b6a4',
  variant: 'new-music',
  previewUrl: '',
  counterValue: '03 - 01 - 26',
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BTDReel"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={BTDReel as any}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1080}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultProps={defaultProps as any}
      />
      <Composition
        id="BTDReelV2"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={BTDReelV2 as any}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultProps={defaultPropsV2 as any}
      />
      <Composition
        id="BTDAd2"
        component={BTDAd2}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDAd3"
        component={BTDAd3}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDReelV3"
        component={BTDReelV3}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDReelBiirthplace"
        component={BTDReelBiirthplace}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDReelKateSykes"
        component={BTDReelKateSykes}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDReelDonKai"
        component={BTDReelDonKai}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDReelGirlsweetvoiced"
        component={BTDReelGirlsweetvoiced}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDReelAllWeHold"
        component={BTDReelAllWeHold}
        durationInFrames={840}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDReelSungHolly"
        component={BTDReelSungHolly}
        durationInFrames={840}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BTDArchiveAd"
        component={BTDArchiveAd}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="WaveformTest"
        component={WaveformTest}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
