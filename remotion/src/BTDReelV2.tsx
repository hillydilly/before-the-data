import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Img,
  Audio,
  staticFile,
} from 'remotion';

export interface BTDReelV2Props {
  artistName: string;
  songTitle: string;
  artUrl: string;
  variant?: 'artist-discovery' | 'new-music';
  previewUrl?: string;
  counterValue?: string;
}

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);

export const BTDReelV2: React.FC<BTDReelV2Props> = ({
  artistName,
  songTitle,
  artUrl,
  previewUrl,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Ken Burns: scale 1.0 -> 1.08 over 450 frames
  const kenBurnsScale = interpolate(frame, [0, 450], [1.0, 1.08], clamp);

  // Artist name: fade in 0-30f, fade out 360-420f
  const artistIn = interpolate(frame, [0, 30], [0, 1], { easing: easeOut, ...clamp });
  const artistOut = interpolate(frame, [360, 420], [1, 0], { easing: easeIn, ...clamp });
  const artistOpacity = frame < 360 ? artistIn : artistOut;

  // Song title: fade in 15-50f, fade out 360-420f
  const songIn = interpolate(frame, [15, 50], [0, 1], { easing: easeOut, ...clamp });
  const songOut = interpolate(frame, [360, 420], [1, 0], { easing: easeIn, ...clamp });
  const songOpacity = frame < 360 ? songIn : songOut;

  // Wordmark: fade in 30-60f, fade out 360-420f
  const wordmarkIn = interpolate(frame, [30, 60], [0, 1], { easing: easeOut, ...clamp });
  const wordmarkOut = interpolate(frame, [360, 420], [1, 0], { easing: easeIn, ...clamp });
  const wordmarkOpacity = frame < 360 ? wordmarkIn : wordmarkOut;

  // B mark: fade in 30-60f, stays forever
  const bMarkOpacity = interpolate(frame, [30, 60], [0, 1], { easing: easeOut, ...clamp });

  // Audio volume: fade in/out
  const audioVol = interpolate(frame, [0, 45, 400, 440], [0, 1, 1, 0], clamp);

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=Inter:ital,wght@0,400;1,400&display=swap');
      `}</style>

      {previewUrl && <Audio src={previewUrl} volume={audioVol} />}

      {/* Full-bleed photo with Ken Burns zoom */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <Img
          src={artUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${kenBurnsScale})`,
            transformOrigin: 'center center',
            display: 'block',
          }}
        />
      </div>

      {/* Dark gradient overlay - bottom */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.15) 52%, rgba(0,0,0,0) 68%)',
        pointerEvents: 'none',
      }} />

      {/* Top gradient for wordmark */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 18%)',
        pointerEvents: 'none',
      }} />

      {/* BEFORE THE DATA wordmark - top left */}
      <div style={{
        position: 'absolute',
        top: 72,
        left: 64,
        opacity: wordmarkOpacity,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          BEFORE THE DATA
        </span>
      </div>

      {/* Artist name - bottom third, large */}
      <div style={{
        position: 'absolute',
        bottom: 260,
        left: 64,
        right: 64,
        opacity: artistOpacity,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: 112,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: '#ffffff',
          lineHeight: 0.95,
          display: 'block',
        }}>
          {artistName}
        </span>
      </div>

      {/* Song title - Inter italic */}
      <div style={{
        position: 'absolute',
        bottom: 188,
        left: 64,
        right: 64,
        opacity: songOpacity,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: '"Inter", sans-serif',
          fontWeight: 400,
          fontStyle: 'italic',
          fontSize: 38,
          letterSpacing: 0.5,
          color: 'rgba(230,225,215,0.9)',
          lineHeight: 1.2,
          display: 'block',
        }}>
          {songTitle}
        </span>
      </div>

      {/* B mark - bottom right */}
      <div style={{
        position: 'absolute',
        bottom: 80,
        right: 64,
        opacity: bMarkOpacity,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <Img
          src={staticFile('frames/b_filled_mask_1080.png')}
          style={{
            width: 60,
            height: 60,
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
          }}
        />
      </div>
    </div>
  );
};
