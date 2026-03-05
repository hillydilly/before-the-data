import {
  AbsoluteFill, useCurrentFrame, interpolate, Img, Video,
  staticFile, Sequence, spring, useVideoConfig, Audio,
} from 'remotion';
import React from 'react';

// BTD Reel V3 — Take 40: Refined professional version
// 1080x1920, 30fps, 690 frames (~23s)
// UNFOLD-inspired: crop marks, editorial spacing, asymmetric composition

const COLORS = {
  bg: '#D8D4CF',
  bgDark: '#111111',
  text: '#111111',
  textMuted: '#777777',
  textLight: '#A09E98',  // Warmer, more readable light
  cream: '#F5F0E1',
  divider: '#999999',
};

const sp = (frame: number, from: number, fps: number, damping = 12, mass = 0.7) =>
  spring({ frame: frame - from, fps, config: { damping, mass } });

// UNFOLD-style frame markers (persistent on warm bg beats)
const FrameMarkers: React.FC<{ opacity: number }> = ({ opacity }) => {
  const markerStyle: React.CSSProperties = {
    position: 'absolute', fontSize: 11, fontWeight: 600,
    color: COLORS.text, letterSpacing: 3, opacity: 0.25,
    fontFamily: "'SF Mono', monospace",
  };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, opacity, pointerEvents: 'none' }}>
      {/* Corner crop marks — proper L-brackets */}
      {[
        { top: 36, left: 36, d: 'M0 16 L0 0 L16 0' },
        { top: 36, right: 36, d: 'M4 0 L20 0 L20 16' },
        { bottom: 36, left: 36, d: 'M0 4 L0 20 L16 20' },
        { bottom: 36, right: 36, d: 'M4 20 L20 20 L20 4' },
      ].map((pos, i) => (
        <div key={i} style={{ position: 'absolute', top: (pos as any).top, bottom: (pos as any).bottom, left: (pos as any).left, right: (pos as any).right }}>
          <svg width={20} height={20} viewBox="0 0 20 20">
            <path d={pos.d} stroke="#111" strokeWidth={1} fill="none" />
          </svg>
        </div>
      ))}
      {/* Left edge text */}
      <div style={{
        ...markerStyle, left: 14, top: '50%',
        transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center',
      }}>
        BTD — 2026
      </div>
      {/* Right edge text */}
      <div style={{
        ...markerStyle, right: 14, top: '50%',
        transform: 'rotate(90deg) translateX(50%)', transformOrigin: 'right center',
      }}>
        BEFORE THE DATA
      </div>
    </div>
  );
};

export const BTDReelKateSykes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Toggle: true = video clip, false = photo reveal
  // 'video' | 'reveal' | 'parallax'
  const visualMode = 'video' as 'video' | 'reveal' | 'parallax';
  const hasVideo = visualMode === 'video';

  // === POST TYPE — auto-determined by artist tier ===
  // Tier: 1=Fresh Find, 2=Emerging, 3=Developing, 4=Breaking, 5=Established
  const artistTier = 1; // Fresh Find — baby artist
  const artistDescriptor = 'Singer · Songwriter'; // Nashville, TN — Gruntry Western
  const postType = artistTier >= 4 ? 'newmusic' : 'discovery';

  // Copy variants
  const copy = postType === 'discovery' ? {
    hookLines: ['Looking for', 'your next', 'favorite', 'artist?'] as string[],
    hookEmphasis: 2,
    beat2Kicker: 'Introducing',
    beat3Overlay: 'Before The Data presents',
    beat4Header: 'The Numbers',
  } : {
    hookLines: ['Looking for', 'your next', 'favorite', 'song?'] as string[],
    hookEmphasis: 2,
    beat2Kicker: 'Now Playing',
    beat3Overlay: 'Before The Data recommends',
    beat4Header: 'The Track Record',
  };

  // Tier display data
  const tierData = [
    { emoji: '🌱', label: 'FRESH FIND' },
    { emoji: '🔥', label: 'EMERGING' },
    { emoji: '📈', label: 'DEVELOPING' },
    { emoji: '⚡', label: 'BREAKING' },
    { emoji: '🏆', label: 'ESTABLISHED' },
  ][artistTier - 1];

  // BEAT ORDER: Hook → Name → Video+Bio(voice) → SONG(no voice) → Data+CTA(voice) → Outro
  // B1: 0-60, B2: 60-160, B3: 160-325, B4(song): 325-505, B5(data): 505-655, B6(outro): 655-750
  const b1Opacity = interpolate(frame, [0, 8, 48, 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b2Opacity = interpolate(frame, [60, 68, 148, 160], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b3Opacity = interpolate(frame, [160, 168, 316, 322], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b4Opacity = interpolate(frame, [319, 325, 493, 505], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }); // SONG
  const b5Opacity = interpolate(frame, [505, 513, 745, 758], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }); // DATA+CTA
  const b6Opacity = interpolate(frame, [758, 770, 900], [0, 1, 1], { extrapolateRight: 'clamp' }); // OUTRO

  // Background: warm for beats 1,2 → dark starts before video ends (no white flash) → warm for data → dark for outro
  const isDark = (frame >= 160 && frame < 510) || frame >= 753;
  const bgColor = isDark ? COLORS.bgDark : COLORS.bg;

  // Frame markers: visible on warm beats only (1,2,5), hidden on dark + video
  const markerBase = interpolate(frame, [0, 8, 148, 160], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const markerData = interpolate(frame, [510, 520, 745, 755], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const markerOpacity = Math.max(markerBase, markerData);

  // Music player
  const eqBars = Array.from({ length: 16 }, (_, i) =>
    4 + Math.abs(Math.sin((frame - 490) * (0.2 + (i % 5) * 0.04) + i * 0.7)) * 18
  );
  // Progress bar matches song card duration (beat 4: 325-505)
  const progressBar = interpolate(frame, [335, 501], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

      {/* Noise texture (warm beats only) */}
      {!isDark && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-conic-gradient(rgba(0,0,0,0.015) 0% 25%, transparent 0% 50%) 0 0 / 3px 3px',
          zIndex: 1, pointerEvents: 'none',
        }} />
      )}

      {/* UNFOLD frame markers */}
      <FrameMarkers opacity={markerOpacity} />

      {/* === MIXED AUDIO — voice + song with real sidechain ducking (pre-mixed in ffmpeg) === */}
      <Sequence from={0}>
        <Audio src={staticFile('ks-mixed-audio.mp3')}
          volume={(f) => {
            // CTA ends at ~frame 733. Hold full volume, then gentle fade over outro (755-900)
            if (f > 755) return Math.max(0, 1 - (f - 755) / 145);
            return 1;
          }}
        />
      </Sequence>

      {/* Outro: no voiceover — logo + visuals only */}

      {/* === SOUND DESIGN === */}

      {/* Beat 1→2 transition: subtle sub hit as artist name lands */}
      <Sequence from={60}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.35} /></Sequence>

      {/* Beat 2: paper texture on "Introducing" reveal */}
      <Sequence from={66}><Audio src={staticFile('sfx/paper-texture.mp3')} volume={0.20} /></Sequence>

      {/* Beat 2→3 transition: sub hit as video appears (killed deep sweep — wind sound doesn't fit) */}
      <Sequence from={162}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.20} /></Sequence>

      {/* Beat 3→4 transition: bass drone as bg shifts to dark for song */}
      <Sequence from={318}><Audio src={staticFile('sfx/bass-drone.mp3')} volume={0.18} /></Sequence>

      {/* Beat 4: sub hit as album art lands */}
      <Sequence from={333}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.25} /></Sequence>

      {/* Beat 4→5 transition: sub hit as data appears */}
      <Sequence from={505}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.30} /></Sequence>

      {/* Beat 5: digital blips as each stat line appears */}
      {[517, 523, 529, 535, 541, 547].map((f, i) => (
        <Sequence key={`blip-${i}`} from={f}><Audio src={staticFile('sfx/digital-blip.mp3')} volume={0.10} /></Sequence>
      ))}

      {/* Beat 5: rise SFX as trend line draws */}
      <Sequence from={567}><Audio src={staticFile('sfx/rise.mp3')} volume={0.12} /></Sequence>

      {/* ============================================ */}
      {/* BEAT 1: HOOK — text + waveform (0-60)       */}
      {/* ============================================ */}
      <AbsoluteFill style={{ opacity: b1Opacity, zIndex: 10, padding: '0 70px', justifyContent: 'center' }}>
        <div style={{ marginTop: -20 }}>
          {/* Hook text — large, left-aligned, staggered word reveal */}
          {copy.hookLines.map((line, li) => {
            const lineDelay = 4 + li * 7;
            const lineOp = interpolate(frame, [lineDelay, lineDelay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const lineY = interpolate(frame, [lineDelay, lineDelay + 14], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const isBold = li === copy.hookEmphasis;
            return (
              <div key={li} style={{
                fontSize: isBold ? 86 : 66, fontWeight: isBold ? 900 : 500,
                color: COLORS.text, lineHeight: 1.2, textAlign: 'left',
                opacity: lineOp, transform: `translateY(${lineY}px)`,
                fontStyle: isBold ? 'italic' : 'normal',
                marginBottom: 6,
              }}>
                {line}
              </div>
            );
          })}
          {/* Waveform — full width, atmospheric, left-aligned with text */}
          <div style={{
            marginTop: 44,
            opacity: interpolate(frame, [8, 18], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            <svg width={940} height={50} viewBox="0 0 940 50">
              {Array.from({ length: 90 }, (_, i) => {
                const bw = 940 / 90;
                const x = i * bw + 0.5;
                const base = Math.abs(Math.sin(i * 0.38 + 1.7)) * 15 + 3;
                const fast1 = Math.sin(frame * 0.3 + i * 0.45) * 6;
                const fast2 = Math.cos(frame * 0.5 + i * 0.28) * 4;
                const h = Math.max(3, base + fast1 + fast2);
                return (
                  <rect key={i} x={x} y={25 - h} width={bw - 1.5} height={h * 2}
                    rx={1.5} ry={1.5} fill="#1A1A1A" />
                );
              })}
            </svg>
          </div>
        </div>
      </AbsoluteFill>

      {/* ============================================ */}
      {/* BEAT 2: ARTIST NAME — flush left, massive    */}
      {/* ============================================ */}
      <AbsoluteFill style={{ opacity: b2Opacity, zIndex: 10, padding: '0 60px', justifyContent: 'center' }}>
        {/* Artist photo background — low opacity, face visible immediately */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: interpolate(frame, [60, 85], [0, 0.28], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          pointerEvents: 'none',
        }}>
          <Img src={staticFile('kate-sykes-ig-bg.jpg')} style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} />
        </div>
        {/* Country: US — Nashville, TN — location unknown */}
        <div>
          {/* "Introducing" — readable on phone */}
          <div style={{
            fontSize: 28, fontWeight: 500, color: COLORS.textMuted,
            letterSpacing: 10, textTransform: 'uppercase', marginBottom: 16,
            opacity: interpolate(frame, [64, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateX(${interpolate(frame, [64, 85], [-60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}>
            {copy.beat2Kicker}
          </div>
          {/* Artist name — single line for one-word names */}
          <div style={{
            fontSize: 140, fontWeight: 900, color: COLORS.text,
            letterSpacing: -3, lineHeight: 0.88, textTransform: 'uppercase',
            marginLeft: 0,
            opacity: interpolate(frame, [70, 88], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateX(${interpolate(frame, [70, 92], [80, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}>
            KATE SYKES
          </div>
          {/* Location — readable */}
          <div style={{
            fontSize: 24, fontWeight: 500, color: COLORS.textMuted,
            letterSpacing: 6, textTransform: 'uppercase', marginTop: 40,
            opacity: interpolate(frame, [92, 110], [0, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [92, 112], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}>
            {artistDescriptor}
          </div>
        </div>
      </AbsoluteFill>

      {/* ============================================ */}
      {/* BEAT 3: VISUAL — video OR photo reveal       */}
      {/* ============================================ */}
      <Sequence from={160} durationInFrames={150}>
        <AbsoluteFill style={{ opacity: b3Opacity, zIndex: 10 }}>
          {/* === VIDEO VERSION === */}
          {visualMode === 'video' && (
            <div style={{
              position: 'absolute', inset: 0,
              transform: `scale(${interpolate(sp(frame - 160, 5, fps, 14, 0.8), [0, 1], [1.1, 1])})`,
            }}>
              <Video src={staticFile('kate-sykes-clip.mp4')}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
            </div>
          )}

          {/* === PHOTO REVEAL VERSION (Concept B) === */}
          {visualMode === 'reveal' && (
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', inset: -40,
                transform: `scale(${
                  interpolate(frame - 160, [0, 150], [1.12, 1.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  + Math.sin((frame - 160) * 0.08) * 0.008
                })`,
              }}>
                <Img src={staticFile('kate-sykes-pills-hero.jpg')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const barDelay = 5 + i * 3;
                  const barProgress = interpolate(frame - 160, [barDelay, barDelay + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  const barHeight = 1920 / 12;
                  const slideX = interpolate(barProgress, [0, 1], [0, i % 2 === 0 ? -1100 : 1100]);
                  return (
                    <div key={i} style={{
                      width: 1080, height: barHeight,
                      background: COLORS.bg,
                      transform: `translateX(${slideX}px)`,
                    }} />
                  );
                })}
              </div>
              <div style={{
                position: 'absolute', inset: 0,
                filter: `grayscale(${interpolate(frame - 160, [20, 80], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%)`,
                mixBlendMode: 'color',
                background: 'transparent',
                pointerEvents: 'none',
              }} />
            </div>
          )}

          {/* === PARALLAX DEPTH VERSION (Concept C) === */}
          {visualMode === 'parallax' && (() => {
            const localF = frame - 160;
            const bgX = interpolate(localF, [0, 150], [0, -20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const bgY = interpolate(localF, [0, 150], [0, -10], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const fgX = interpolate(localF, [0, 150], [0, 15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const fgY = interpolate(localF, [0, 150], [0, 8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const scaleIn = interpolate(localF, [0, 25], [1.15, 1.05], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const fadeIn = interpolate(localF, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const desat = interpolate(localF, [0, 60], [70, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const grainOp = interpolate(localF, [0, 40], [0.25, 0.08], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: fadeIn }}>
                <div style={{
                  position: 'absolute', inset: -80,
                  transform: `translate(${bgX}px, ${bgY}px) scale(${scaleIn + 0.1})`,
                  filter: 'blur(12px) brightness(0.6)',
                }}>
                  <Img src={staticFile('kate-sykes-pills-hero.jpg')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{
                  position: 'absolute', inset: -30,
                  transform: `translate(${fgX}px, ${fgY}px) scale(${scaleIn})`,
                }}>
                  <Img src={staticFile('kate-sykes-pills-hero.jpg')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  filter: `grayscale(${desat}%)`,
                  mixBlendMode: 'color',
                  background: 'transparent',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: '200px 200px',
                  opacity: grainOp,
                  mixBlendMode: 'overlay',
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(180,140,100,0.08) 0%, rgba(0,0,0,0.05) 100%)',
                  mixBlendMode: 'multiply',
                }} />
              </div>
            );
          })()}

          {/* Vignette (both versions) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 50% 60%, transparent 30%, rgba(0,0,0,0.3) 100%)',
          }} />
          {/* Dark gradient overlay at bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
            background: 'linear-gradient(transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.92) 100%)',
          }} />
          {/* Artist name overlay */}
          <div style={{
            position: 'absolute', bottom: 160, left: 60, right: 60,
            opacity: interpolate(frame - 160, [20, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame - 160, [20, 45], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}>
            <div style={{
              fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.6)',
              letterSpacing: 6, textTransform: 'uppercase', marginBottom: 14,
            }}>
              {copy.beat3Overlay}
            </div>
            <div style={{
              fontSize: 80, fontWeight: 900, color: '#fff',
              letterSpacing: -2, lineHeight: 0.95, textTransform: 'uppercase',
            }}>
              KATE SYKES
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ============================================ */}
      {/* BEAT 5: DATA + CTA (was beat 4, now after song) */}
      {/* ============================================ */}
      <AbsoluteFill style={{ opacity: b5Opacity, zIndex: 10, padding: '0 70px', justifyContent: 'center' }}>
        <div>
          {/* Header */}
          <div style={{
            fontSize: 22, fontWeight: 500, color: COLORS.textMuted,
            letterSpacing: 6, textTransform: 'uppercase', marginBottom: 48,
            opacity: interpolate(frame, [513, 523], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            {copy.beat4Header}
          </div>

          {/* All stats — same size, stacked, equal weight */}
          {[
            { num: '528', label: 'Monthly Listeners', delay: 517 },
            { num: '14K', label: 'Instagram', delay: 523 },
            { num: '4.2K', label: 'TikTok', delay: 529 },
            { num: '5', label: 'Singles', delay: 535 },
          ].map((stat, si) => {
            const op = interpolate(frame, [stat.delay, stat.delay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const x = interpolate(frame, [stat.delay, stat.delay + 14], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={si} style={{
                display: 'flex', alignItems: 'baseline', gap: 28,
                opacity: op, transform: `translateX(${x}px)`, marginBottom: 28,
              }}>
                <span style={{
                  fontSize: 56, fontWeight: 800, color: COLORS.text,
                  minWidth: 220, fontVariantNumeric: 'tabular-nums',
                }}>
                  {stat.num}
                </span>
                <span style={{ fontSize: 22, fontWeight: 500, color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase' }}>
                  {stat.label}
                </span>
              </div>
            );
          })}

          {/* === POST-STATS: Rising trend line + ARTIST TIER BADGE === */}
          {frame >= 565 && (() => {
            const trendStart = 565;
            const drawProgress = interpolate(frame, [trendStart, trendStart + 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const lineWidth = 940;
            const points: [number, number][] = [];
            const numPoints = 40;
            for (let i = 0; i <= numPoints; i++) {
              const t = i / numPoints;
              const x = t * lineWidth;
              const rise = t * t * 120;
              const wobble = Math.sin(t * 12) * 8 + Math.cos(t * 7) * 5;
              const y = 130 - rise - wobble;
              points.push([x, Math.max(8, y)]);
            }
            const visibleCount = Math.floor(drawProgress * points.length);
            const pathD = points.slice(0, visibleCount + 1).map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

            // Tier badge — appears after trend line finishes
            const tierStart = trendStart + 45;
            const tierScale = interpolate(
              sp(frame - tierStart, 5, fps, 10, 0.7),
              [0, 1], [0.6, 1],
            );
            const tierOp = interpolate(frame, [tierStart, tierStart + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            const tierEmoji = tierData.emoji;
            const tierLabel = tierData.label;
            const tierDesc = postType === 'discovery' ? 'Artist Tier Rating' : 'Artist Status';

            return (
              <div style={{ marginTop: 28 }}>
                {/* Trend line */}
                <svg width={lineWidth} height={140} viewBox={`0 0 ${lineWidth} 140`}>
                  <path d={pathD} stroke={COLORS.text} strokeWidth={6} fill="none"
                    opacity={0.06} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={pathD} stroke={COLORS.text} strokeWidth={2.5} fill="none"
                    opacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
                  {visibleCount > 0 && visibleCount < points.length && (
                    <circle cx={points[visibleCount][0]} cy={points[visibleCount][1]}
                      r={5} fill={COLORS.text} opacity={0.7} />
                  )}
                </svg>

                {/* Tier badge */}
                <div style={{
                  marginTop: 20, display: 'flex', alignItems: 'center', gap: 20,
                  opacity: tierOp, transform: `scale(${tierScale})`,
                  transformOrigin: 'left center',
                }}>
                  <span style={{ fontSize: 52 }}>{tierEmoji}</span>
                  <div>
                    <div style={{
                      fontSize: 42, fontWeight: 900, color: COLORS.text,
                      letterSpacing: 4, textTransform: 'uppercase',
                    }}>
                      {tierLabel}
                    </div>
                    <div style={{
                      fontSize: 18, fontWeight: 500, color: COLORS.textMuted,
                      letterSpacing: 3, textTransform: 'uppercase', marginTop: 4,
                    }}>
                      {tierDesc}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>

      {/* ============================================ */}
      {/* BEAT 4: MUSIC — cinematic album reveal (was beat 5, now before data) */}
      {/* ============================================ */}
      <Sequence from={325} durationInFrames={180}>
        <AbsoluteFill style={{
          backgroundColor: COLORS.bgDark,
          opacity: b4Opacity, zIndex: 10,
          overflow: 'hidden',
        }}>
          {(() => {
            const localF = frame - 325;

            // Album art: starts large and centered, scales down and shifts up
            const artScale = interpolate(localF, [0, 30], [1.6, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artY = interpolate(localF, [0, 30], [200, -80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artOp = interpolate(localF, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // Ambient glow behind album art (color-matched)
            const glowOp = interpolate(localF, [15, 35], [0, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // Track info stagger
            const titleOp = interpolate(localF, [25, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const titleY = interpolate(localF, [25, 40], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artistOp = interpolate(localF, [32, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artistY = interpolate(localF, [32, 48], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // EQ bars entrance
            const eqOp = interpolate(localF, [38, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // "NOW PLAYING" kicker
            const kickerOp = interpolate(localF, [18, 30], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // Album art motion style: 'pulse' | 'float' | 'flicker'
            const artMotion = 'pulse' as 'pulse' | 'float' | 'flicker';

            // A: Breathing pulse — art scales subtly like a heartbeat
            const pulseScale = artMotion === 'pulse'
              ? 1 + Math.sin(localF * 0.07) * 0.012
              : 1;

            // B: Soft float — art hovers up and down gently
            const floatY = artMotion === 'float'
              ? Math.sin(localF * 0.06) * 6
              : 0;

            // C: Warm flicker — glow pulses, art stays still
            const flickerGlow = artMotion === 'flicker'
              ? 0.15 + Math.sin(localF * 0.09) * 0.12
              : 0;

            return (
              <>
                {/* Ambient glow — blurred version of album art behind */}
                <div style={{
                  position: 'absolute',
                  top: '15%', left: '10%', right: '10%', bottom: '30%',
                  opacity: artMotion === 'flicker' ? glowOp + flickerGlow : glowOp,
                  filter: 'blur(80px) saturate(1.5)',
                  transform: `scale(${artMotion === 'flicker' ? 1.2 + Math.sin(localF * 0.09) * 0.05 : 1.2})`,
                }}>
                  <Img src={staticFile('kate-sykes-pills-art.jpg')} style={{
                    width: '100%', height: '100%', objectFit: 'cover', borderRadius: 40,
                  }} />
                </div>

                {/* Content stack */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '0 60px',
                }}>
                  {/* "NOW PLAYING" kicker */}
                  <div style={{
                    fontSize: 18, fontWeight: 600, color: COLORS.cream,
                    letterSpacing: 8, textTransform: 'uppercase',
                    marginBottom: 32, opacity: kickerOp,
                  }}>
                    Now Playing
                  </div>

                  {/* Album art — cinematic entrance */}
                  <div style={{
                    width: 540, height: 540, borderRadius: 12, overflow: 'hidden',
                    marginBottom: 40,
                    boxShadow: `0 30px 100px rgba(0,0,0,0.8), 0 0 ${artMotion === 'pulse' ? 60 + Math.sin(localF * 0.07) * 20 : 60}px rgba(200,180,150,0.1)`,
                    opacity: artOp,
                    transform: `translateY(${artY + floatY}px) scale(${artScale * pulseScale})`,
                  }}>
                    <Img src={staticFile('kate-sykes-pills-art.jpg')} style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                    }} />
                    {/* Subtle light sweep across art */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(${105 + localF * 0.3}deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)`,
                    }} />
                  </div>

                  {/* Track title — staggered entrance */}
                  <div style={{
                    fontSize: 44, fontWeight: 900, color: '#fff',
                    letterSpacing: -1, textAlign: 'center',
                    opacity: titleOp, transform: `translateY(${titleY}px)`,
                  }}>
                    Pills
                  </div>

                  {/* Artist name */}
                  <div style={{
                    fontSize: 24, fontWeight: 400, color: '#777',
                    letterSpacing: 4, textTransform: 'uppercase',
                    marginTop: 10, textAlign: 'center',
                    opacity: artistOp, transform: `translateY(${artistY}px)`,
                  }}>
                    KATE SYKES
                  </div>

                  {/* EQ bars — wider, more bars, reactive */}
                  <div style={{
                    display: 'flex', gap: 3, alignItems: 'center', height: 44,
                    marginTop: 36, opacity: eqOp,
                  }}>
                    {eqBars.map((h, i) => (
                      <div key={i} style={{
                        width: 5, height: h * 1.8, borderRadius: 2.5,
                        background: COLORS.cream, opacity: 0.55,
                      }} />
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    width: 540, height: 3, background: 'rgba(255,255,255,0.08)',
                    borderRadius: 2, marginTop: 20, opacity: eqOp,
                  }}>
                    <div style={{
                      width: `${progressBar * 100}%`, height: '100%',
                      background: COLORS.cream, borderRadius: 2, opacity: 0.6,
                    }} />
                  </div>
                </div>
              </>
            );
          })()}
        </AbsoluteFill>
      </Sequence>

      {/* ============================================ */}
      {/* BEAT 6: OUTRO — dark bg, logo, CTA           */}
      {/* ============================================ */}
      <Sequence from={758} durationInFrames={142}>
        <AbsoluteFill style={{
          backgroundColor: COLORS.bgDark,
          opacity: b6Opacity, zIndex: 10,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transform: `scale(${interpolate(sp(frame - 758, 8, fps), [0, 1], [0.85, 1])})`,
          }}>
            {/* Logo — bigger */}
            <Img src={staticFile('btd-logo.png')} style={{
              width: 260, height: 260, marginBottom: 36,
              opacity: interpolate(frame, [766, 780], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }} />
            {/* Wordmark — bigger */}
            <Img src={staticFile('btd-wordmark.png')} style={{
              width: 740, marginBottom: 56,
              opacity: interpolate(frame, [772, 786], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }} />
            {/* CTA — 2x bigger */}
            <div style={{
              background: COLORS.cream, borderRadius: 50, padding: '24px 64px',
              opacity: interpolate(frame, [786, 803], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              transform: `translateY(${interpolate(frame, [786, 806], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
            }}>
              <span style={{
                fontSize: 32, fontWeight: 700, color: COLORS.bgDark,
                letterSpacing: 4, textTransform: 'uppercase',
              }}>
                Follow for daily picks
              </span>
            </div>
            <div style={{
              fontSize: 28, fontWeight: 400, color: '#666',
              letterSpacing: 4, marginTop: 28,
              opacity: interpolate(frame, [798, 818], [0, 0.8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}>
              beforethedata.com
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ============================================ */}
      {/* CAPTIONS — synced to narration timing        */}
      {/* ============================================ */}
      {(() => {
        const captions: Array<{ text: string; start: number; end: number }> = [
          // No captions on Beat 1 (hook text is already on screen)
          // Beat 2: "Meet Kate Sykes. Out of Nashville, Tennessee."
          { text: 'Meet Kate Sykes.', start: 62, end: 95 },
          { text: 'Out of Nashville, Tennessee.', start: 95, end: 150 },
          // Beat 3: "Outlaw country meets grunge. She calls it Gruntry Western. And it hits."
          { text: 'Outlaw country meets grunge.', start: 164, end: 210 },
          { text: 'She calls it', start: 210, end: 245 },
          { text: 'Gruntry Western.', start: 245, end: 280 },
          { text: 'And it hits.', start: 280, end: 313 },
          // Beat 5 (data): "73 monthly listeners. 1800 TikTok followers. Remember this name."
          { text: '528 monthly listeners.', start: 510, end: 548 },
          { text: '14 thousand on Instagram.', start: 548, end: 585 },
          { text: '5 singles out.', start: 585, end: 620 },
          { text: 'Remember this name.', start: 620, end: 660 },
          // CTA: "Go stream Pills right now."
          { text: 'Go stream Pills', start: 668, end: 705 },
          { text: 'right now.', start: 705, end: 740 },
        ];

        const active = captions.find(c => frame >= c.start && frame <= c.end);
        if (!active) return null;

        const fadeIn = interpolate(frame, [active.start, active.start + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const fadeOut = interpolate(frame, [active.end - 4, active.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const captionOpacity = Math.min(fadeIn, fadeOut);
        const isOnDark = isDark;

        return (
          <div style={{
            position: 'absolute',
            top: 1440,
            left: 0, right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 50,
            opacity: captionOpacity,
            padding: '0 40px',
          }}>
            <div style={{
              background: isOnDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              backdropFilter: 'blur(8px)',
              borderRadius: 14,
              padding: '14px 36px',
              width: '100%',
              textAlign: 'center',
            }}>
              <span style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 30,
                fontWeight: 600,
                color: isOnDark ? '#F5F0E1' : '#111111',
                letterSpacing: 0.5,
              }}>
                {active.text}
              </span>
            </div>
          </div>
        );
      })()}

    </AbsoluteFill>
  );
};
