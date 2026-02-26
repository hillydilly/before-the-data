import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Img,
  Audio,
  Video,
  staticFile,
} from 'remotion';

export interface BTDReelProps {
  artistName: string;
  songTitle: string;
  artUrl: string;
  previewUrl?: string;
  counterValue?: string;
  bgColor?: string;
  headerLabel?: string;
  variant?: 'artist-discovery' | 'new-music'; // 'artist-discovery' = red bg, 'new-music' = black bg + grayscale
}

const easeOut = Easing.out(Easing.cubic);
const easeIn  = Easing.in(Easing.cubic);
const easeIO  = Easing.inOut(Easing.cubic);
const clamp   = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

// ─── Typewriter Counter ────────────────────────────────────────────────────
// Reveals characters left-to-right, one per ~2 frames. Matches reference.
// Format: "09 - 31" — two groups, space-dash-space separator
const TypewriterCounter: React.FC<{
  value: string;  // e.g. "02 - 24 - 26"
  frame: number;
  startFrame: number; // frame when first character appears
  style?: React.CSSProperties;
}> = ({ value, frame, startFrame, style }) => {
  const chars = value.split('');
  const framesPerChar = 2; // one character every 2 frames

  return (
    <span style={{ ...style, display: 'inline-flex', alignItems: 'baseline' }}>
      {chars.map((ch, i) => {
        const appearFrame = startFrame + i * framesPerChar;
        const visible = frame >= appearFrame;
        const opacity = visible
          ? interpolate(frame, [appearFrame, appearFrame + 3], [0, 1], { easing: easeOut, ...clamp })
          : 0;
        return (
          <span key={i} style={{
            whiteSpace: 'pre',
            display: 'inline-block',
            opacity,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

export const BTDReel: React.FC<BTDReelProps> = ({
  artistName,
  songTitle,
  artUrl,
  previewUrl,
  counterValue = '02 - 24 - 26',
  bgColor,
  headerLabel,
  variant = 'artist-discovery',
}) => {
  const isNewMusic = variant === 'new-music';
  const resolvedBg = bgColor ?? (isNewMusic ? 'rgb(0,0,0)' : 'rgb(161,0,0)');
  const resolvedHeader = headerLabel ?? (isNewMusic ? 'NEW MUSIC' : 'ARTIST DISCOVERY');
  const compositeDir = isNewMusic ? 'frames/composite-black' : 'frames/composite';
  const frame = useCurrentFrame(); // 0–449
  const { width, height } = useVideoConfig();

  const TEXT_COLOR = 'rgb(166,170,176)';
  const FONT_H = '"Microgramma", "Eurostile Extended", sans-serif';
  const FONT_B = '"FeatureDeck", serif';

  // ─── ARCHITECTURE ─────────────────────────────────────────────────────────
  // The 170 composite PNG frames contain the COMPLETE animation:
  //   f001-f020:  thin line → card opens (expanding rectangle)
  //   f020-f100:  card holds (full rectangle with photo, slight breathing)
  //   f100-f145:  card morphs into B-shape
  //   f145-f165:  B-shape holds
  //   f166-f170:  B shrinks to tiny icon
  //
  // We map our 450 Remotion frames to the 170 composite frames:
  //   Phase 1  (f000-f013):  Title card — red bg + text only, NO composite
  //   Phase 2  (f014-f449):  Composite frames play, mapped to f001-f170
  //     - f014-f060:  comp f001-f035  (line → card opens)
  //     - f061-f280:  comp f035-f110  (card holds — stretched to fill time)
  //     - f281-f380:  comp f110-f155  (morph to B)
  //     - f381-f420:  comp f155-f165  (B holds)
  //     - f421-f449:  comp f165-f170  (B shrinks to tiny)

  const TITLE_END = 14;   // title card ends, composite starts

  // Map Remotion frame → composite PNG index (1-170)
  const getCompIdx = (f: number): number => {
    if (f < TITLE_END) return 1; // not used during title
    // Map f014-f449 → comp 1-170
    const idx = Math.round(interpolate(f, [TITLE_END, 449], [1, 170], clamp));
    return Math.max(1, Math.min(170, idx));
  };

  const compIdx = getCompIdx(frame);
  const padded = String(compIdx).padStart(4, '0');

  // ─── Text visibility ───────────────────────────────────────────────────────
  // During B view (comp frames ~145-165 = Remotion ~f381-f420):
  // Hide ARTIST DISCOVERY and footer, show ONLY counter
  // During tiny logo (comp 166-170 = f421-449): hide ALL text
  const inBHold = frame >= 381 && frame < 421;
  const inTiny  = frame >= 421;
  const inTitle = frame < TITLE_END;

  const headerOp = (() => {
    if (inBHold || inTiny) return 0;
    if (frame >= 370) return interpolate(frame, [370, 381], [1, 0], { easing: easeIn, ...clamp });
    return 1;
  })();

  const footerOp = headerOp;

  const counterOp = (() => {
    if (inTitle || inTiny) return 0;
    if (frame < 30) return interpolate(frame, [TITLE_END, 30], [0, 1], { easing: easeOut, ...clamp });
    return 1;
  })();

  // Counter typewriter starts when card is fully open (~frame 60)
  const counterStartFrame = 60;

  // ─── Text positions ────────────────────────────────────────────────────────
  // Title card: ARTIST DISCOVERY centered-left (~y=476), song below (~y=548)
  // Band state: ARTIST DISCOVERY top-left (y≈38), song bottom band
  const tPhase = interpolate(frame, [TITLE_END, TITLE_END + 10], [0, 1], { easing: easeIO, ...clamp });

  const headLeft = inTitle ? 55 : 55;
  const headTop  = inTitle
    ? 476
    : interpolate(tPhase, [0, 1], [476, 38], { easing: easeIO, ...clamp });
  const headSz = inTitle ? 66 : 48;

  // Bottom band: composite frames include red bands top+bottom
  // Our text sits at bottom of canvas
  const footLeft = inTitle ? 86 : 55;
  const footTop  = inTitle
    ? 548
    : interpolate(tPhase, [0, 1], [548, 1028], { easing: easeIO, ...clamp });
  const footSz = inTitle ? 60 : 42;

  const audioVol = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor: resolvedBg }}>
      <style>{`
        @font-face { font-family:'FeatureDeck'; src:url('${staticFile('fonts/FeatureDeck-Light.otf')}') format('opentype'); font-weight:300; font-style:normal; }
        @font-face { font-family:'FeatureDeck'; src:url('${staticFile('fonts/FeatureDeck-LightItalic.otf')}') format('opentype'); font-weight:300; font-style:italic; }
        @font-face { font-family:'Microgramma'; src:url('${staticFile('fonts/Microgramma.ttf')}') format('truetype'); font-weight:400; }
      `}</style>

      {previewUrl && <Audio src={previewUrl} volume={audioVol} />}

      {/* ── TEXTURE — dark grain looped over red bg via screen blend ─────────── */}
      <Video
        src={staticFile('background/texture.mp4')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          mixBlendMode: 'screen',
          opacity: 0.6,
          zIndex: 1,
        }}
        loop
        muted
      />

      {/* ── COMPOSITE FRAME — drives entire animation after title card ───────── */}
      {/* Composite frames are 1500×1500. Content (card) lives at x=262-1238, y=266-1227 (976×961px).
          Scale so card fits within text bands with ~4% padding.
          Scale=0.8647 → image=1297px, card=844×831px centered in 1080×903px available area.
          Clip to full canvas so overflow (red bg from composite) is hidden. */}
      {/* Scale entire composite frame uniformly — no cropping.
          Centered between text bands: mid = (105+1008)/2 = 556.5
          Frame size 1160px → top = 556 - 1160/2 = -24, left = (1080-1160)/2 = -40 */}
      {!inTitle && (
        <div style={{
          position: 'absolute',
          left: -100,
          top: -84,
          width: 1279,
          height: 1279,
        }}>
          <Img
            src={staticFile(`${compositeDir}/${padded}.png`)}
            style={{
              width: 1279,
              height: 1279,
            }}
          />
        </div>
      )}

      {/* ── ARTIST DISCOVERY — top-left band / title card center-left ────────── */}
      <div style={{
        position: 'absolute',
        left: headLeft,
        top: headTop,
        opacity: headerOp,
        zIndex: 30,
        pointerEvents: 'none',
      }}>
        <span style={{
          color: TEXT_COLOR,
          fontFamily: FONT_H,
          fontSize: headSz,
          letterSpacing: 3,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}>
          {resolvedHeader}
        </span>
      </div>

      {/* ── DATE COUNTER — top-right, visible after title card ───────────────── */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 1080,
        height: 105,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: 55,
        opacity: counterOp,
        zIndex: 35,
        pointerEvents: 'none',
      }}>
        <TypewriterCounter
          value={counterValue}
          frame={frame}
          startFrame={counterStartFrame}
          style={{
            color: TEXT_COLOR,
            fontFamily: FONT_H,
            fontSize: 32,
            letterSpacing: 2,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        />
      </div>

      {/* ── ARTIST - "SONG" — bottom band / title card center-left ──────────── */}
      <div style={{
        position: 'absolute',
        left: footLeft,
        top: footTop,
        opacity: footerOp,
        zIndex: 30,
        pointerEvents: 'none',
      }}>
        <span style={{
          color: TEXT_COLOR,
          fontFamily: FONT_B,
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: footSz,
          letterSpacing: 0.5,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {artistName} - &ldquo;{songTitle}&rdquo;
        </span>
      </div>
    </div>
  );
};
