import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Img,
  Video,
  staticFile,
} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const easeOut = Easing.out(Easing.cubic);

// Fade a text block in over 20 frames, with a 20px upward slide; fade out near endFrame
function useTextAnim(startFrame: number, endFrame: number, frame: number) {
  const opacity = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    easing: easeOut,
    ...clamp,
  });
  const fadeOut = interpolate(frame, [endFrame - 10, endFrame], [1, 0], {
    easing: easeOut,
    ...clamp,
  });
  const finalOpacity = frame < endFrame - 10 ? opacity : Math.min(opacity, fadeOut);
  const translateY = interpolate(frame, [startFrame, startFrame + 25], [20, 0], {
    easing: easeOut,
    ...clamp,
  });
  return { opacity: finalOpacity, transform: `translateY(${translateY}px)` };
}

// Single name stagger helper — fades in at `startFrame`
function useNameAnim(startFrame: number, frame: number) {
  const opacity = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    easing: easeOut,
    ...clamp,
  });
  const translateY = interpolate(frame, [startFrame, startFrame + 22], [20, 0], {
    easing: easeOut,
    ...clamp,
  });
  return { opacity, transform: `translateY(${translateY}px)` };
}

// FPS=30, total 450 frames = 15s
// Screen 1: 0-3s   = f0-f90
// Screen 2: 3-7s   = f90-f210   (names stagger in)
// Screen 3: 7-11s  = f210-f330
// Screen 4: 11-13s = f330-f390
// Screen 5: 13-15s = f390-f450

const NAMES = ['Billie.', 'Lorde.', 'Halsey.', 'Daniel Caesar.'];
// Stagger: one name every 25 frames starting at f90
const NAME_START = 90;
const NAME_INTERVAL = 28;

export const BTDAd3: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const s1 = useTextAnim(0, 95, frame);
  // Screen 2: names fade together with the group, hide at f215
  const s2GroupOpacity = interpolate(frame, [205, 215], [1, 0], { easing: easeOut, ...clamp });
  const s3 = useTextAnim(210, 335, frame);
  const s4 = useTextAnim(330, 395, frame);
  const s5 = useTextAnim(390, 455, frame);

  // Name anims — each appears staggered within screen 2 window
  const nameAnims = NAMES.map((_, i) =>
    useNameAnim(NAME_START + i * NAME_INTERVAL, frame)
  );

  // B mark fades in at screen 5
  const bMarkOpacity = interpolate(frame, [390, 415], [0, 1], { easing: easeOut, ...clamp });

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=Inter:wght@400;500&display=swap');
      `}</style>

      {/* Film grain texture overlay */}
      <Video
        src={staticFile('background/texture.mp4')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          mixBlendMode: 'screen',
          opacity: 0.3,
          zIndex: 10,
          pointerEvents: 'none',
        }}
        muted
        loop
      />

      {/* ── SCREEN 1 ── "15 years of music discovery." */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
          zIndex: 20,
          opacity: s1.opacity,
          transform: s1.transform,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: 104,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#ffffff',
            lineHeight: 1.0,
            textAlign: 'center',
          }}
        >
          15 years of
          <br />
          music discovery.
        </span>
      </div>

      {/* ── SCREEN 2 ── Names appear one by one */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
          gap: 12,
          zIndex: 20,
          opacity: s2GroupOpacity,
          pointerEvents: 'none',
        }}
      >
        {NAMES.map((name, i) => (
          <span
            key={name}
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: i === 3 ? 72 : 84, // "Daniel Caesar." is longer, slightly smaller
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#ffffff',
              lineHeight: 1.05,
              textAlign: 'center',
              display: 'block',
              opacity: nameAnims[i].opacity,
              transform: nameAnims[i].transform,
            }}
          >
            {name}
          </span>
        ))}
      </div>

      {/* ── SCREEN 3 ── "We heard them first." */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
          zIndex: 20,
          opacity: s3.opacity,
          transform: s3.transform,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: 120,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#ffffff',
            lineHeight: 1.0,
            textAlign: 'center',
          }}
        >
          We heard
          <br />
          them first.
        </span>
      </div>

      {/* ── SCREEN 4 ── "The archive is back." */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
          zIndex: 20,
          opacity: s4.opacity,
          transform: s4.transform,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: 88,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#ffffff',
            lineHeight: 1.05,
            textAlign: 'center',
          }}
        >
          The archive
          <br />
          is back.
        </span>
      </div>

      {/* ── SCREEN 5 ── "beforethedata.com" */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
          gap: 32,
          zIndex: 20,
          opacity: s5.opacity,
          transform: s5.transform,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            fontSize: 38,
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          beforethedata.com
        </span>
      </div>

      {/* B mark — persistent at screen 5 */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          right: 64,
          opacity: bMarkOpacity,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
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
