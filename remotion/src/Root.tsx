import React from 'react';
import {Composition} from 'remotion';
import {BTDReel, BTDReelProps} from './BTDReel';

const defaultProps: BTDReelProps = {
  artistName: 'SLOE JACK',
  songTitle: 'POUR ME A DRINK',
  artUrl: 'https://i.scdn.co/image/ab6761610000e5eb29215e27380806288de95f92',
  counterValue: '02 - 24 - 26',
  variant: 'artist-discovery',
  // bgColor and headerLabel intentionally omitted — derived from variant
};

export const RemotionRoot: React.FC = () => {
  return (
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
  );
};
