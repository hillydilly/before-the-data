import React from 'react';
import {
  useCurrentFrame,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
  staticFile,
} from 'remotion';

// ─── ASSETS ──────────────────────────────────────────────────────────────────
const B_MARK = staticFile('btd-b-mark.png');
const WORDMARK = staticFile('btd-wordmark.png');
const CLOUD = 'https://res.cloudinary.com/dd9nbystx/image/upload';

const HERO_COVERS = [
  {url: `${CLOUD}/btd/archive/billie-eilish-ocean-eyes.jpg`, artist: 'Billie Eilish', year: '2015', track: 'Ocean Eyes'},
  {url: `${CLOUD}/btd/archive/lorde-love-club.jpg`, artist: 'Lorde', year: '2013', track: 'The Love Club'},
  {url: `${CLOUD}/btd/archive/macklemore-unplanned-mixtape.jpg`, artist: 'Macklemore', year: '2012', track: 'The Unplanned Mixtape'},
  {url: `${CLOUD}/btd/archive/daniel-caesar-birds.png`, artist: 'Daniel Caesar', year: '2014', track: 'Birds'},
  {url: `${CLOUD}/btd/archive/halsey-room-93.jpg`, artist: 'Halsey', year: '2014', track: 'Room 93'},
  {url: `${CLOUD}/btd/archive/tom-misch-eems-to-slide.jpg`, artist: 'Tom Misch', year: '2014', track: 'Seems to Slide'},
];

// Confirmed-live Cloudinary filler covers
const FILLER_URLS = [
  `${CLOUD}/btd/archive/lany-walk-away.jpg`,
  `${CLOUD}/btd/archive/milky-chance-stolen-dance.jpg`,
  `${CLOUD}/btd/archive/doja-cat-so-high.jpg`,
  `${CLOUD}/btd/archive/astronomyy-dont-need-u.png`,
  `${CLOUD}/btd/archive/lapsley-monday-ep.jpg`,
  `${CLOUD}/btd/archive/chelsea-cutler-an-introduction.jpg`,
  `${CLOUD}/btd/archive/healy-an-introduction.jpg`,
  `${CLOUD}/btd/archive/neiked-sexual.jpg`,
  `${CLOUD}/btd/archive/aloe-blacc-i-need-a-dollar.jpg`,
  `${CLOUD}/btd/archive/tom-misch-memory.jpg`,
];

const HERO_POSITIONS = [5, 14, 23, 32, 41, 50];
const ALL_COVERS: string[] = [];
{
  let fi = 0;
  for (let i = 0; i < 60; i++) {
    const hi = HERO_POSITIONS.indexOf(i);
    if (hi >= 0) ALL_COVERS.push(HERO_COVERS[hi].url);
    else { ALL_COVERS.push(FILLER_URLS[fi % FILLER_URLS.length]); fi++; }
  }
}

// ─── SCROLL STATE ─────────────────────────────────────────────────────────────
function getScrollState(frame: number) {
  if (frame < 45) return {pos: 0, isHero: false, heroData: null as any, heroAlpha: 0};
  if (frame >= 780) return {pos: 55, isHero: false, heroData: null as any, heroAlpha: 0};

  const t = (frame - 45) / (780 - 45);

  const heroStops = [
    {idx: 5,  startT: 0.08, holdT: 0.055},
    {idx: 14, startT: 0.22, holdT: 0.045},
    {idx: 23, startT: 0.38, holdT: 0.045},
    {idx: 32, startT: 0.54, holdT: 0.040},
    {idx: 41, startT: 0.68, holdT: 0.035},
    {idx: 50, startT: 0.82, holdT: 0.030},
  ];

  for (let i = 0; i < heroStops.length; i++) {
    const h = heroStops[i];
    if (t >= h.startT && t < h.startT + h.holdT) {
      const hp = (t - h.startT) / h.holdT;
      return {
        pos: h.idx,
        isHero: true,
        heroData: HERO_COVERS[i],
        heroAlpha: hp < 0.15 ? hp / 0.15 : hp > 0.82 ? (1 - hp) / 0.18 : 1,
      };
    }
  }

  const segs: [number, number, number, number][] = [
    [0, 0.08, 0, 5], [0.135, 0.22, 5, 14], [0.265, 0.38, 14, 23],
    [0.425, 0.54, 23, 32], [0.58, 0.68, 32, 41], [0.715, 0.82, 41, 50],
    [0.85, 1, 50, 58],
  ];
  for (const [s, e, from, to] of segs) {
    if (t >= s && t <= e) {
      const eased = interpolate(t, [s, e], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });
      return {pos: from + (to - from) * eased, isHero: false, heroData: null, heroAlpha: 0};
    }
  }
  return {pos: 55, isHero: false, heroData: null, heroAlpha: 0};
}

// ─── FILM GRAIN (brand guide mandatory) ──────────────────────────────────────
const GRAIN_SVG = "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

// ─── COVER FLOW ───────────────────────────────────────────────────────────────
function CoverFlow({scrollPos, W, H}: {scrollPos: number; W: number; H: number}) {
  const centerIdx = Math.floor(scrollPos);
  const frac = scrollPos - centerIdx;
  const coverSize = Math.min(W * 0.50, H * 0.58);

  const covers: React.ReactNode[] = [];

  for (let offset = -5; offset <= 5; offset++) {
    const idx = ((centerIdx + offset) % ALL_COVERS.length + ALL_COVERS.length) % ALL_COVERS.length;
    const url = ALL_COVERS[idx];
    const adj = offset - frac;
    const isCenter = Math.abs(adj) < 0.5;

    let x: number, z: number, rotY: number, scale: number, opacity: number;

    if (isCenter) {
      x = adj * coverSize * 0.55;
      z = 100;
      rotY = 0;
      scale = 1;
      opacity = 1;
    } else {
      const sign = adj > 0 ? 1 : -1;
      const dist = Math.abs(adj);
      x = sign * (coverSize * 0.42 + (dist - 0.5) * coverSize * 0.28);
      z = -dist * 18;
      rotY = sign * -72;
      scale = 0.76;
      opacity = Math.max(0.18, 1 - dist * 0.20);
    }

    covers.push(
      <div
        key={`c-${offset}`}
        style={{
          position: 'absolute',
          left: '50%',
          top: '48%',
          width: coverSize * scale,
          height: coverSize * scale,
          marginLeft: -(coverSize * scale) / 2 + x,
          marginTop: -(coverSize * scale) / 2,
          transform: `perspective(800px) rotateY(${rotY}deg) translateZ(${z}px)`,
          transformStyle: 'preserve-3d',
          opacity,
          zIndex: 100 - Math.round(Math.abs(adj) * 10),
        }}
      >
        <Img
          src={url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            borderRadius: 2,
            boxShadow: isCenter
              ? '0 12px 48px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.5)'
              : '0 4px 20px rgba(0,0,0,0.7)',
          }}
        />
        {/* Reflection */}
        {Math.abs(offset) < 3 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            height: coverSize * scale * 0.35,
            overflow: 'hidden',
            transform: 'scaleY(-1)',
            opacity: isCenter ? 0.18 : 0.08,
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
          }}>
            <Img
              src={url}
              style={{width: '100%', height: coverSize * scale, objectFit: 'cover', display: 'block'}}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: W, height: H,
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #0c0c0c 0%, #080808 100%)',
    }}>
      {/* Subtle warm glow */}
      <div style={{
        position: 'absolute',
        top: '35%', left: '50%',
        width: W * 0.8, height: H * 0.5,
        marginLeft: -(W * 0.8) / 2,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(180,140,100,0.04) 0%, transparent 70%)',
      }} />

      {/* Glossy floor line */}
      <div style={{
        position: 'absolute',
        left: '5%', right: '5%',
        top: '72%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)',
        zIndex: 150,
      }} />

      {covers}
    </div>
  );
}

// ─── iPOD SHELL (zoomed in, fills ~85% of frame) ─────────────────────────────
function IpodShell({children, screenOpacity, frame}: {
  children: React.ReactNode; screenOpacity: number; frame: number;
}) {
  // Subtle drift: 1.5 degree rotation over the whole video
  const driftAngle = interpolate(frame, [0, 960], [-0.8, 0.8], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Shift the gradient angle with the drift for dynamic lighting
  const gradAngle = 145 + driftAngle * 3;

  return (
    <AbsoluteFill style={{
      backgroundColor: '#0a0a0a',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Warm vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)',
        zIndex: 0,
      }} />

      {/* Subtle warm ambient light from upper left */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 25% 20%, rgba(180,140,100,0.06) 0%, transparent 60%)',
        zIndex: 0,
      }} />

      {/* BTD B mark — top left */}
      <Img src={B_MARK} style={{
        position: 'absolute',
        top: 48, left: 48,
        width: 60, height: 60,
        opacity: 0.25,
        zIndex: 10,
      }} />

      {/* iPod body — ZOOMED IN to fill frame */}
      <div style={{
        width: 780,
        height: 1280,
        borderRadius: 40,
        background: `linear-gradient(${gradAngle}deg, #5a5a5c 0%, #4e4e50 15%, #444446 35%, #3c3c3e 55%, #343436 75%, #2c2c2e 100%)`,
        position: 'relative' as const,
        transform: `rotate(${driftAngle}deg)`,
        boxShadow: `
          6px 12px 40px rgba(0,0,0,0.6),
          inset 0 1px 0 rgba(255,255,255,0.06),
          inset -1px 0 0 rgba(0,0,0,0.15),
          inset 1px 0 0 rgba(255,255,255,0.03)
        `,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        zIndex: 1,
      }}>
        {/* Left edge catch light */}
        <div style={{
          position: 'absolute' as const,
          top: '2%', bottom: '2%', left: 0, width: 3,
          background: `linear-gradient(180deg, rgba(255,255,255,${0.10 + driftAngle * 0.02}) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.02) 70%, transparent 100%)`,
          borderRadius: '40px 0 0 40px',
        }} />

        {/* Right edge shadow */}
        <div style={{
          position: 'absolute' as const,
          top: '2%', bottom: '2%', right: 0, width: 2,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.2) 70%, transparent)',
          borderRadius: '0 40px 40px 0',
        }} />

        {/* Micro texture (anodized aluminum grain) */}
        <div style={{
          position: 'absolute' as const, inset: 0, borderRadius: 40,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 3px)',
          pointerEvents: 'none' as const,
        }} />

        {/* Screen bezel */}
        <div style={{
          marginTop: 62,
          width: '84%',
          height: '38%',
          borderRadius: 8,
          background: '#0e0e0e',
          padding: '6px',
          boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.03)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '100%', height: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative' as const,
            opacity: screenOpacity,
          }}>
            {children}

            {/* Glass sheen over screen */}
            <div style={{
              position: 'absolute' as const, inset: 0,
              background: `linear-gradient(${155 + driftAngle * 5}deg, rgba(255,255,255,0.06) 0%, transparent 40%)`,
              pointerEvents: 'none' as const,
            }} />
          </div>
        </div>

        {/* Click wheel */}
        <div style={{
          width: 380,
          height: 380,
          borderRadius: '50%',
          marginTop: 72,
          background: `radial-gradient(ellipse at ${38 + driftAngle}% 32%, #4c4c4e 0%, #404042 35%, #363638 65%, #2e2e30 100%)`,
          border: '1.5px solid #222',
          position: 'relative' as const,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.04),
            inset 0 -1px 0 rgba(0,0,0,0.2),
            0 0 0 1px rgba(0,0,0,0.4)
          `,
          flexShrink: 0,
        }}>
          {/* Center button */}
          <div style={{
            position: 'absolute' as const,
            top: '50%', left: '50%',
            width: 136, height: 136,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle at 50% 36%, #2c2c2e 0%, #1e1e20 50%, #141416 100%)',
            border: '1px solid #111',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(0,0,0,0.5)',
          }} />

          {/* MENU */}
          <div style={{
            position: 'absolute' as const,
            top: 26, left: '50%', transform: 'translateX(-50%)',
            color: '#b8b8b8', fontSize: 14,
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 600, letterSpacing: 2.5,
          }}>MENU</div>

          {/* Transport icons */}
          <div style={{
            position: 'absolute' as const,
            left: 30, top: '50%', transform: 'translateY(-50%)',
            color: '#b0b0b0', fontSize: 14, fontFamily: 'Helvetica',
          }}>◀◀</div>
          <div style={{
            position: 'absolute' as const,
            right: 24, top: '50%', transform: 'translateY(-50%)',
            color: '#b0b0b0', fontSize: 14, fontFamily: 'Helvetica',
          }}>▶▶</div>
          <div style={{
            position: 'absolute' as const,
            bottom: 26, left: '50%', transform: 'translateX(-50%)',
            color: '#b0b0b0', fontSize: 14, fontFamily: 'Helvetica',
          }}>▶ ❚❚</div>
        </div>

        {/* Dock connector */}
        <div style={{
          position: 'absolute' as const,
          bottom: 22, left: '50%',
          transform: 'translateX(-50%)',
          width: 90, height: 7, borderRadius: 4,
          background: '#242424',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
        }} />
      </div>

      {/* Film grain overlay (brand guide mandatory) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("${GRAIN_SVG}")`,
        backgroundSize: '200px 200px',
        opacity: 0.04,
        mixBlendMode: 'overlay' as const,
        pointerEvents: 'none' as const,
        zIndex: 100,
      }} />
    </AbsoluteFill>
  );
}

// ─── END CARD (BTD branded) ──────────────────────────────────────────────────
function EndCard({progress}: {progress: number}) {
  const logoAlpha  = Math.min(1, Math.max(0, (progress - 0.10) / 0.25));
  const headAlpha  = Math.min(1, Math.max(0, (progress - 0.25) / 0.25));
  const subAlpha   = Math.min(1, Math.max(0, (progress - 0.50) / 0.25));

  return (
    <AbsoluteFill style={{
      background: '#0a0a0a',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Warm vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, rgba(180,140,100,0.03) 0%, transparent 50%)',
      }} />

      {/* BTD wordmark */}
      <Img src={WORDMARK} style={{
        width: 280,
        opacity: logoAlpha,
        marginBottom: 50,
      }} />

      {/* Headline */}
      <div style={{
        fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
        fontWeight: 700, fontSize: 96,
        color: '#fff', opacity: headAlpha,
        textTransform: 'uppercase' as const, letterSpacing: 6,
      }}>16,000 posts.</div>
      <div style={{
        fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
        fontWeight: 700, fontSize: 96,
        color: '#e8dcc8', opacity: headAlpha,
        marginTop: 6,
        textTransform: 'uppercase' as const, letterSpacing: 6,
      }}>One library.</div>

      {/* Subtitle */}
      <div style={{
        fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
        fontWeight: 400, fontSize: 48,
        color: '#A09E98', opacity: subAlpha,
        marginTop: 50, letterSpacing: 2,
      }}>The archive is back.</div>
      <div style={{
        fontFamily: "'Inter', Helvetica, sans-serif",
        fontSize: 28, color: '#777',
        opacity: subAlpha, marginTop: 20,
      }}>beforethedata.com</div>

      {/* Film grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("${GRAIN_SVG}")`,
        backgroundSize: '200px 200px',
        opacity: 0.04,
        mixBlendMode: 'overlay' as const,
        pointerEvents: 'none' as const,
      }} />
    </AbsoluteFill>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export const BTDArchiveIpod: React.FC = () => {
  const frame = useCurrentFrame();

  const screenOpacity = interpolate(frame, [25, 55], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });

  const {pos, isHero, heroData, heroAlpha} = getScrollState(frame);
  const isEndCard = frame >= 790;
  const endProgress = isEndCard ? (frame - 790) / 170 : 0;
  const endFade = interpolate(frame, [775, 800], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const SCREEN_W = 643;  // 84% of 780 body, minus 12px padding
  const SCREEN_H = 475;  // 38% of 1280 body, minus 12px padding

  if (isEndCard) {
    return <EndCard progress={endProgress} />;
  }

  return (
    <IpodShell screenOpacity={screenOpacity} frame={frame}>
      <div style={{width: '100%', height: '100%', position: 'relative'}}>
        <CoverFlow scrollPos={pos} W={SCREEN_W} H={SCREEN_H} />

        {/* Hero text overlay */}
        {isHero && heroData && heroAlpha > 0 && (
          <div style={{
            position: 'absolute', bottom: 22, left: 0, right: 0,
            textAlign: 'center' as const, opacity: heroAlpha,
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
              fontWeight: 700, fontSize: 22,
              color: '#fff',
              textTransform: 'uppercase' as const, letterSpacing: 3,
              textShadow: '0 2px 10px rgba(0,0,0,0.9)',
            }}>{heroData.artist}</div>
            <div style={{
              fontFamily: "'Inter', Helvetica, sans-serif",
              fontSize: 13, color: '#e8dcc8',
              marginTop: 4,
              textShadow: '0 1px 6px rgba(0,0,0,0.8)',
            }}>{heroData.track}  ·  {heroData.year}</div>
          </div>
        )}

        {/* Fade to end card */}
        {endFade > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#0a0a0a', opacity: endFade,
          }} />
        )}
      </div>
    </IpodShell>
  );
};
