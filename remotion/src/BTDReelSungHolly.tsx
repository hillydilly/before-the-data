import {
  AbsoluteFill, useCurrentFrame, interpolate, Img, Video,
  staticFile, Sequence, spring, useVideoConfig, Audio,
} from 'remotion';
import React from 'react';

// BTD Reel — Sung Holly "Simple"
// 1080x1920, 30fps, 840 frames (28s)
// Tier 2: Emerging | @sungholly7 75.7K TikTok | @sungholly17 100K IG | 12,720 Spotify

const COLORS = {
  bg: '#D8D4CF',
  bgDark: '#111111',
  text: '#111111',
  textMuted: '#777777',
  textLight: '#A09E98',
  cream: '#F5F0E1',
  divider: '#999999',
};

const sp = (frame: number, from: number, fps: number, damping = 12, mass = 0.7) =>
  spring({ frame: frame - from, fps, config: { damping, mass } });

const FrameMarkers: React.FC<{ opacity: number }> = ({ opacity }) => {
  const markerStyle: React.CSSProperties = {
    position: 'absolute', fontSize: 11, fontWeight: 600,
    color: COLORS.text, letterSpacing: 3, opacity: 0.25,
    fontFamily: "'SF Mono', monospace",
  };
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, opacity, pointerEvents: 'none' }}>
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
      <div style={{
        ...markerStyle, left: 14, top: '50%',
        transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left center',
      }}>
        BTD — 2026
      </div>
      <div style={{
        ...markerStyle, right: 14, top: '50%',
        transform: 'rotate(90deg) translateX(50%)', transformOrigin: 'right center',
      }}>
        BEFORE THE DATA
      </div>
    </div>
  );
};

export const BTDReelSungHolly: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tier 2: Emerging
  const artistTier = 2;
  const artistDescriptor = 'Singer · Songwriter';
  const postType = 'discovery';

  const copy = {
    hookLines: ['This voice', 'is about', 'to be', 'everywhere.'] as string[],
    hookEmphasis: 3,
    beat2Kicker: 'Introducing',
    beat3Overlay: 'Before The Data presents',
    beat4Header: 'The Numbers',
  };

  const tierData = { emoji: '📈', label: 'EMERGING' };

  // Frame windows
  // B1: 0-60, B2: 60-160, B3: 160-325, B4(song): 325-505, B5(data): 505-655, B6(outro): 655-840
  const b1Opacity = interpolate(frame, [0, 8, 48, 60], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b2Opacity = interpolate(frame, [60, 68, 148, 160], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b3Opacity = interpolate(frame, [160, 168, 316, 322], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b4Opacity = interpolate(frame, [319, 325, 493, 505], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b5Opacity = interpolate(frame, [505, 513, 745, 758], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b6Opacity = interpolate(frame, [758, 770, 840], [0, 1, 1], { extrapolateRight: 'clamp' });

  const isDark = (frame >= 160 && frame < 510) || frame >= 753;
  const bgColor = isDark ? COLORS.bgDark : COLORS.bg;

  const markerBase = interpolate(frame, [0, 8, 148, 160], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const markerData = interpolate(frame, [510, 520, 745, 755], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const markerOpacity = Math.max(markerBase, markerData);

  const eqBars = Array.from({ length: 16 }, (_, i) =>
    4 + Math.abs(Math.sin((frame - 490) * (0.2 + (i % 5) * 0.04) + i * 0.7)) * 18
  );
  const progressBar = interpolate(frame, [335, 501], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

      {/* Noise texture */}
      {!isDark && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-conic-gradient(rgba(0,0,0,0.015) 0% 25%, transparent 0% 50%) 0 0 / 3px 3px',
          zIndex: 1, pointerEvents: 'none',
        }} />
      )}

      <FrameMarkers opacity={markerOpacity} />

      {/* === MIXED AUDIO === */}
      <Sequence from={0}>
        <Audio src={staticFile('sh-mixed-audio.mp3')}
          volume={(f) => {
            if (f > 755) return Math.max(0, 1 - (f - 755) / 85);
            return 1;
          }}
        />
      </Sequence>

      {/* === SFX === */}
      <Sequence from={60}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.35} /></Sequence>
      <Sequence from={66}><Audio src={staticFile('sfx/paper-texture.mp3')} volume={0.20} /></Sequence>
      <Sequence from={162}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.20} /></Sequence>
      <Sequence from={318}><Audio src={staticFile('sfx/bass-drone.mp3')} volume={0.18} /></Sequence>
      <Sequence from={333}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.25} /></Sequence>
      <Sequence from={505}><Audio src={staticFile('sfx/sub-hit.mp3')} volume={0.30} /></Sequence>
      {[517, 523, 529, 535, 541, 547].map((f, i) => (
        <Sequence key={`blip-${i}`} from={f}><Audio src={staticFile('sfx/digital-blip.mp3')} volume={0.10} /></Sequence>
      ))}
      <Sequence from={567}><Audio src={staticFile('sfx/rise.mp3')} volume={0.12} /></Sequence>

      {/* ============================================ */}
      {/* BEAT 1: HOOK                                  */}
      {/* ============================================ */}
      <AbsoluteFill style={{ opacity: b1Opacity, zIndex: 10, padding: '0 70px', justifyContent: 'center' }}>
        <div style={{ marginTop: -20 }}>
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
      {/* BEAT 2: ARTIST NAME                          */}
      {/* ============================================ */}
      <AbsoluteFill style={{ opacity: b2Opacity, zIndex: 10, padding: '0 60px', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0,
          opacity: interpolate(frame, [60, 85], [0, 0.28], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          pointerEvents: 'none',
        }}>
          <Img src={staticFile('sung-holly-ig-bg.jpg')} style={{
            width: '100%', height: '100%', objectFit: 'cover',
          }} />
        </div>
        <div>
          <div style={{
            fontSize: 28, fontWeight: 500, color: COLORS.textMuted,
            letterSpacing: 10, textTransform: 'uppercase', marginBottom: 16,
            opacity: interpolate(frame, [64, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateX(${interpolate(frame, [64, 85], [-60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}>
            {copy.beat2Kicker}
          </div>
          <div style={{
            fontSize: 120, fontWeight: 900, color: COLORS.text,
            letterSpacing: -3, lineHeight: 0.88, textTransform: 'uppercase',
            opacity: interpolate(frame, [70, 88], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateX(${interpolate(frame, [70, 92], [80, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          }}>
            SUNG HOLLY
          </div>
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
      {/* BEAT 3: TIKTOK VIDEO                         */}
      {/* ============================================ */}
      <Sequence from={160} durationInFrames={165}>
        <AbsoluteFill style={{ opacity: b3Opacity, zIndex: 10 }}>
          <div style={{
            position: 'absolute', inset: 0,
            transform: `scale(${interpolate(sp(frame - 160, 5, fps, 14, 0.8), [0, 1], [1.1, 1])})`,
          }}>
            <Video src={staticFile('sung-holly-clip.mp4')}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
          </div>

          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 50% 60%, transparent 30%, rgba(0,0,0,0.3) 100%)',
          }} />
          {/* Dark gradient at bottom */}
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
              SUNG HOLLY
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ============================================ */}
      {/* BEAT 4: SONG CARD                            */}
      {/* ============================================ */}
      <Sequence from={325} durationInFrames={180}>
        <AbsoluteFill style={{
          backgroundColor: COLORS.bgDark,
          opacity: b4Opacity, zIndex: 10,
          overflow: 'hidden',
        }}>
          {(() => {
            const localF = frame - 325;
            const artScale = interpolate(localF, [0, 30], [1.6, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artY = interpolate(localF, [0, 30], [200, -80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artOp = interpolate(localF, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const glowOp = interpolate(localF, [15, 35], [0, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const titleOp = interpolate(localF, [25, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const titleY = interpolate(localF, [25, 40], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artistOp = interpolate(localF, [32, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const artistY = interpolate(localF, [32, 48], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const eqOp = interpolate(localF, [38, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const kickerOp = interpolate(localF, [18, 30], [0, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const pulseScale = 1 + Math.sin(localF * 0.07) * 0.012;

            return (
              <>
                <div style={{
                  position: 'absolute',
                  top: '15%', left: '10%', right: '10%', bottom: '30%',
                  opacity: glowOp,
                  filter: 'blur(80px) saturate(1.5)',
                  transform: 'scale(1.2)',
                }}>
                  <Img src={staticFile('sung-holly-simple-art.jpg')} style={{
                    width: '100%', height: '100%', objectFit: 'cover', borderRadius: 40,
                  }} />
                </div>

                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '0 60px',
                }}>
                  <div style={{
                    fontSize: 18, fontWeight: 600, color: COLORS.cream,
                    letterSpacing: 8, textTransform: 'uppercase',
                    marginBottom: 32, opacity: kickerOp,
                  }}>
                    Now Playing
                  </div>

                  <div style={{
                    width: 540, height: 540, borderRadius: 12, overflow: 'hidden',
                    marginBottom: 40,
                    boxShadow: `0 30px 100px rgba(0,0,0,0.8), 0 0 ${60 + Math.sin(localF * 0.07) * 20}px rgba(200,180,150,0.1)`,
                    opacity: artOp,
                    transform: `translateY(${artY}px) scale(${artScale * pulseScale})`,
                  }}>
                    <Img src={staticFile('sung-holly-simple-art.jpg')} style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                    }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(${105 + localF * 0.3}deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)`,
                    }} />
                  </div>

                  <div style={{
                    fontSize: 44, fontWeight: 900, color: '#fff',
                    letterSpacing: -1, textAlign: 'center',
                    opacity: titleOp, transform: `translateY(${titleY}px)`,
                  }}>
                    Simple
                  </div>

                  <div style={{
                    fontSize: 24, fontWeight: 400, color: '#777',
                    letterSpacing: 4, textTransform: 'uppercase',
                    marginTop: 10, textAlign: 'center',
                    opacity: artistOp, transform: `translateY(${artistY}px)`,
                  }}>
                    SUNG HOLLY
                  </div>

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
      {/* BEAT 5: DATA + CTA                           */}
      {/* ============================================ */}
      <AbsoluteFill style={{ opacity: b5Opacity, zIndex: 10, padding: '0 70px', justifyContent: 'center' }}>
        <div>
          <div style={{
            fontSize: 22, fontWeight: 500, color: COLORS.textMuted,
            letterSpacing: 6, textTransform: 'uppercase', marginBottom: 48,
            opacity: interpolate(frame, [513, 523], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            {copy.beat4Header}
          </div>

          {[
            { num: '12.7K', label: 'Monthly Listeners', delay: 517 },
            { num: '75.7K', label: 'TikTok', delay: 523 },
            { num: '100K', label: 'Instagram', delay: 529 },
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

            const tierStart = trendStart + 45;
            const tierScale = interpolate(
              sp(frame - tierStart, 5, fps, 10, 0.7),
              [0, 1], [0.6, 1],
            );
            const tierOp = interpolate(frame, [tierStart, tierStart + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div style={{ marginTop: 28 }}>
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

                <div style={{
                  marginTop: 20, display: 'flex', alignItems: 'center', gap: 20,
                  opacity: tierOp, transform: `scale(${tierScale})`,
                  transformOrigin: 'left center',
                }}>
                  <span style={{ fontSize: 52 }}>{tierData.emoji}</span>
                  <div>
                    <div style={{
                      fontSize: 42, fontWeight: 900, color: COLORS.text,
                      letterSpacing: 4, textTransform: 'uppercase',
                    }}>
                      {tierData.label}
                    </div>
                    <div style={{
                      fontSize: 18, fontWeight: 500, color: COLORS.textMuted,
                      letterSpacing: 3, textTransform: 'uppercase', marginTop: 4,
                    }}>
                      Artist Tier Rating
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>

      {/* ============================================ */}
      {/* BEAT 6: OUTRO                                */}
      {/* ============================================ */}
      <Sequence from={758} durationInFrames={82}>
        <AbsoluteFill style={{
          backgroundColor: COLORS.bgDark,
          opacity: b6Opacity, zIndex: 10,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transform: `scale(${interpolate(sp(frame - 758, 8, fps), [0, 1], [0.85, 1])})`,
          }}>
            <Img src={staticFile('btd-logo.png')} style={{
              width: 260, height: 260, marginBottom: 36,
              opacity: interpolate(frame, [766, 780], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }} />
            <Img src={staticFile('btd-wordmark.png')} style={{
              width: 740, marginBottom: 56,
              opacity: interpolate(frame, [772, 786], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }} />
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
      {/* CAPTIONS                                     */}
      {/* ============================================ */}
      {(() => {
        // Voice timeline: beat1 starts at frame 65 (2.175s)
        // beat1: 65-124 (1.975s), beat2: 130-259 (4.297s)
        // beat3: 200-383 (6.109s at frame 200 = 6.667s)
        // beat4: 505-685 (6.016s), cta: 691-735 (1.465s)
        const captions: Array<{ text: string; start: number; end: number }> = [
          // Beat 1: "This voice is about to be everywhere."
          { text: 'This voice is about to be everywhere.', start: 67, end: 120 },
          // Beat 2: "Sung Holly. Singer-songwriter. One hundred thousand on Instagram already."
          { text: 'Sung Holly.', start: 132, end: 170 },
          { text: 'Singer-songwriter.', start: 170, end: 210 },
          { text: '100 thousand on Instagram already.', start: 210, end: 258 },
          // Beat 3: "The kind of voice that makes you stop mid-scroll. Soft but it lingers. Sounds like Phoebe Bridgers found a warmer room."
          { text: 'The kind of voice that makes you stop mid-scroll.', start: 202, end: 270 },
          { text: 'Soft but it lingers.', start: 270, end: 310 },
          { text: 'Sounds like Phoebe Bridgers', start: 310, end: 345 },
          { text: 'found a warmer room.', start: 345, end: 382 },
          // Beat 4: "Twelve thousand monthly listeners on Spotify. Seventy-five thousand on TikTok. Simple is her new single."
          { text: '12 thousand monthly listeners on Spotify.', start: 507, end: 565 },
          { text: '75 thousand on TikTok.', start: 565, end: 615 },
          { text: 'Simple is her new single.', start: 615, end: 682 },
          // CTA: "Go stream Simple right now."
          { text: 'Go stream Simple right now.', start: 692, end: 738 },
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
