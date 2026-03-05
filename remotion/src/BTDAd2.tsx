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

// Fade a text block in: opacity 0→1 over 15 frames, with a 20px upward slide
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

// FPS=30, total 450 frames = 15s
// Screen 1: 0-3s   = f0-f90
// Screen 2: 3-6s   = f90-f180
// Screen 3: 6-10s  = f180-f300
// Screen 4: 10-13s = f300-f390
// Screen 5: 13-15s = f390-f450

export const BTDAd2: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Screen visibility windows (with slight overlap for cross-fade feel)
  const s1 = useTextAnim(0, 95, frame);
  const s2 = useTextAnim(90, 185, frame);
  const s3 = useTextAnim(180, 305, frame);
  const s4 = useTextAnim(300, 395, frame);
  const s5 = useTextAnim(390, 455, frame);

  // B mark: fades in with screen 3, stays through end
  const bMarkOpacity = interpolate(frame, [200, 230], [0, 1], { easing: easeOut, ...clamp });

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

      {/* ── SCREEN 1 ── "Some people hear it first." */}
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
            fontSize: 96,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#ffffff',
            lineHeight: 1.0,
            textAlign: 'center',
          }}
        >
          Some people
          <br />
          hear it first.
        </span>
      </div>

      {/* ── SCREEN 2 ── "New music. Every week. Before anyone else." */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
          zIndex: 20,
          opacity: s2.opacity,
          transform: s2.transform,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            fontSize: 48,
            letterSpacing: 0.5,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          New music.
          <br />
          Every week.
          <br />
          Before anyone else.
        </span>
      </div>

      {/* ── SCREEN 3 ── "Heard First." + B mark */}
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
            fontSize: 128,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#ffffff',
            lineHeight: 1.0,
            textAlign: 'center',
          }}
        >
          Heard First.
        </span>
      </div>

      {/* ── SCREEN 4 ── "Free. Or go Pro for more." */}
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
          opacity: s4.opacity,
          transform: s4.transform,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 500,
            fontSize: 44,
            letterSpacing: 0.5,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.3,
            textAlign: 'center',
          }}
        >
          Free. Or go Pro for more.
        </span>
        <div
          style={{
            display: 'flex',
            gap: 48,
            marginTop: 8,
          }}
        >
          {/* Free tier */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1,
              }}
            >
              Free
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                backgroundColor: 'rgba(255,255,255,0.2)',
                margin: '8px auto',
              }}
            />
            <div
              style={{
                fontFamily: '"Inter", sans-serif',
                fontWeight: 400,
                fontSize: 22,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              Weekly picks
            </div>
          </div>
          {/* Divider */}
          <div
            style={{
              width: 1,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignSelf: 'stretch',
            }}
          />
          {/* Pro tier */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              Pro
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                backgroundColor: 'rgba(255,255,255,0.2)',
                margin: '8px auto',
              }}
            />
            <div
              style={{
                fontFamily: '"Inter", sans-serif',
                fontWeight: 400,
                fontSize: 22,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              Full archive
              <br />
              Early access
              <br />
              No limits
            </div>
          </div>
        </div>
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
          gap: 24,
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

      {/* B mark — persistent from screen 3 onward */}
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
