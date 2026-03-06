import React, {useMemo, useRef} from 'react';
import {
  useCurrentFrame,
  interpolate,
  Easing,
  AbsoluteFill,
} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';

// ─── COVER URLs ──────────────────────────────────────────────────────────────
const CLOUD = 'https://res.cloudinary.com/dd9nbystx/image/upload';

const HERO_COVERS = [
  {url: `${CLOUD}/btd/archive/billie-eilish-ocean-eyes.jpg`, artist: 'Billie Eilish', year: '2015', track: 'Ocean Eyes'},
  {url: `${CLOUD}/btd/archive/lorde-love-club.jpg`, artist: 'Lorde', year: '2013', track: 'The Love Club'},
  {url: `${CLOUD}/btd/archive/macklemore-unplanned-mixtape.jpg`, artist: 'Macklemore', year: '2012', track: 'The Unplanned Mixtape'},
  {url: `${CLOUD}/btd/archive/daniel-caesar-birds.png`, artist: 'Daniel Caesar', year: '2014', track: 'Birds'},
  {url: `${CLOUD}/btd/archive/halsey-room-93.jpg`, artist: 'Halsey', year: '2014', track: 'Room 93'},
  {url: `${CLOUD}/btd/archive/tom-misch-eems-to-slide.jpg`, artist: 'Tom Misch', year: '2014', track: 'Seems to Slide'},
];

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
  `${CLOUD}/btd/archive/bon-iver-skinny-love.jpg`,
  `${CLOUD}/btd/archive/daughter-youth.jpg`,
  `${CLOUD}/btd/archive/flume-sleepless.jpg`,
  `${CLOUD}/btd/archive/frank-ocean-swim-good.jpg`,
  `${CLOUD}/btd/archive/gotye-somebody-that-i-used-to-know.jpg`,
  `${CLOUD}/btd/archive/grimes-oblivion.jpg`,
  `${CLOUD}/btd/archive/james-blake-limit-to-your-love.jpg`,
  `${CLOUD}/btd/archive/kaytranada-at-all.jpg`,
  `${CLOUD}/btd/archive/little-dragon-twice.jpg`,
  `${CLOUD}/btd/archive/odesza-how-did-i-get-here.jpg`,
  `${CLOUD}/btd/archive/phantogram-when-im-small.jpg`,
  `${CLOUD}/btd/archive/rhye-open.jpg`,
  `${CLOUD}/btd/archive/sam-smith-lay-me-down.jpg`,
  `${CLOUD}/btd/archive/the-weeknd-what-you-need.jpg`,
  `${CLOUD}/btd/archive/tom-misch-memory.jpg`,
  `${CLOUD}/btd/archive/toro-y-moi-so-many-details.jpg`,
  `${CLOUD}/btd/archive/xxyyxx-about-you.jpg`,
];

const HERO_POSITIONS = [5, 14, 23, 32, 41, 50];
const ALL_URLS: string[] = [];
{
  let fi = 0;
  for (let i = 0; i < 60; i++) {
    const hi = HERO_POSITIONS.indexOf(i);
    if (hi >= 0) ALL_URLS.push(HERO_COVERS[hi].url);
    else { ALL_URLS.push(FILLER_URLS[fi % FILLER_URLS.length]); fi++; }
  }
}

// ─── SCROLL STATE ────────────────────────────────────────────────────────────
function getScrollState(frame: number) {
  if (frame < 45) return {pos: 0, isHero: false, heroData: null as any, heroAlpha: 0};
  if (frame >= 780) return {pos: 55, isHero: false, heroData: null as any, heroAlpha: 0};

  const t = (frame - 45) / (780 - 45);

  const heroStops = [
    {idx: 5, startT: 0.08, holdT: 0.05},
    {idx: 14, startT: 0.22, holdT: 0.04},
    {idx: 23, startT: 0.38, holdT: 0.04},
    {idx: 32, startT: 0.54, holdT: 0.035},
    {idx: 41, startT: 0.68, holdT: 0.03},
    {idx: 50, startT: 0.82, holdT: 0.025},
  ];

  for (let i = 0; i < heroStops.length; i++) {
    const h = heroStops[i];
    if (t >= h.startT && t < h.startT + h.holdT) {
      const hp = (t - h.startT) / h.holdT;
      return {
        pos: h.idx,
        isHero: true,
        heroData: HERO_COVERS[i],
        heroAlpha: hp < 0.15 ? hp / 0.15 : hp > 0.85 ? (1 - hp) / 0.15 : 1,
      };
    }
  }

  const segs: [number, number, number, number][] = [
    [0, 0.08, 0, 5], [0.13, 0.22, 5, 14], [0.26, 0.38, 14, 23],
    [0.42, 0.54, 23, 32], [0.575, 0.68, 32, 41], [0.71, 0.82, 41, 50],
    [0.845, 1, 50, 58],
  ];
  for (const [s, e, from, to] of segs) {
    if (t >= s && t <= e) {
      return {
        pos: interpolate(t, [s, e], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        isHero: false, heroData: null, heroAlpha: 0,
      };
    }
  }
  return {pos: 55, isHero: false, heroData: null, heroAlpha: 0};
}

// ─── 3D COVER PLANE ──────────────────────────────────────────────────────────
function CoverPlane({url, position, rotation, scale, opacity}: {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  opacity: number;
}) {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [url]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[scale, scale]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

// ─── REFLECTION ──────────────────────────────────────────────────────────────
function Reflection({url, position, scale, opacity}: {
  url: string;
  position: [number, number, number];
  scale: number;
  opacity: number;
}) {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.y = -0.35;
    tex.offset.y = 1;
    return tex;
  }, [url]);

  return (
    <mesh position={position} rotation={[0, 0, 0]}>
      <planeGeometry args={[scale, scale * 0.35]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity * 0.12}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── SCENE ───────────────────────────────────────────────────────────────────
function CoverFlowScene({scrollPos}: {scrollPos: number}) {
  const centerIdx = Math.floor(scrollPos);
  const frac = scrollPos - centerIdx;
  const coverSize = 2.4;
  const sideAngle = Math.PI * 0.38; // ~68 degrees
  const sideSpread = 1.1;

  const elements: React.ReactNode[] = [];

  for (let offset = -5; offset <= 5; offset++) {
    const idx = ((centerIdx + offset) % ALL_URLS.length + ALL_URLS.length) % ALL_URLS.length;
    const url = ALL_URLS[idx];
    const adjustedOffset = offset - frac;
    const isCenter = Math.abs(adjustedOffset) < 0.5;

    let x: number, z: number, rotY: number, s: number, op: number;

    if (isCenter) {
      x = adjustedOffset * 1.2;
      z = 0.8;
      rotY = 0;
      s = coverSize;
      op = 1;
    } else {
      const sign = adjustedOffset > 0 ? 1 : -1;
      const dist = Math.abs(adjustedOffset);
      x = sign * (1.4 + (dist - 0.5) * sideSpread);
      z = -dist * 0.25;
      rotY = sign * -sideAngle;
      s = coverSize * 0.82;
      op = Math.max(0.2, 1 - dist * 0.16);
    }

    elements.push(
      <CoverPlane
        key={`c${offset}`}
        url={url}
        position={[x, 0.3, z]}
        rotation={[0, rotY, 0]}
        scale={s}
        opacity={op}
      />
    );

    // Reflection
    if (Math.abs(offset) < 3) {
      elements.push(
        <Reflection
          key={`r${offset}`}
          url={url}
          position={[x, -1.05, z - 0.02]}
          scale={s}
          opacity={op}
        />
      );
    }
  }

  return (
    <>
      {/* Warm spotlight from above */}
      <ambientLight intensity={0.3} />
      <spotLight
        position={[0, 6, 4]}
        angle={0.5}
        penumbra={0.9}
        intensity={1.5}
        color="#ffe0b0"
      />
      <pointLight position={[-4, 3, 2]} intensity={0.4} color="#a0b8ff" />
      <pointLight position={[4, 3, 2]} intensity={0.3} color="#ffc090" />

      {/* Dark reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
        <planeGeometry args={[24, 12]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Background plane */}
      <mesh position={[0, 1, -6]}>
        <planeGeometry args={[24, 14]} />
        <meshBasicMaterial color="#040404" />
      </mesh>

      {elements}
    </>
  );
}

// ─── iPOD BODY (HTML) ────────────────────────────────────────────────────────
function IpodShell({children, screenOpacity}: {children: React.ReactNode; screenOpacity: number}) {
  return (
    <AbsoluteFill style={{backgroundColor: '#030303', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{
        width: 920, height: 1420, borderRadius: 50,
        background: 'linear-gradient(180deg, #2a2a2c 0%, #1c1c1e 30%, #141414 100%)',
        border: '2px solid #3a3a3c',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', paddingTop: 45,
        position: 'relative' as const,
        boxShadow: '0 30px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          width: 840, height: 640, borderRadius: 14,
          background: '#000', border: '2px solid #2a2a2c',
          overflow: 'hidden', position: 'relative' as const, opacity: screenOpacity,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
        }}>
          {children}
        </div>
        <div style={{
          width: 350, height: 350, borderRadius: '50%',
          background: 'linear-gradient(180deg, #2e2e30 0%, #222224 100%)',
          border: '1px solid #3a3a3c', marginTop: 65,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: 115, height: 115, borderRadius: '50%',
            background: 'linear-gradient(180deg, #3c3c3e 0%, #2c2c2e 100%)',
            border: '1px solid #4a4a4c',
          }} />
        </div>
        <div style={{position: 'absolute' as const, bottom: 440, left: '50%', transform: 'translateX(-50%)', color: '#5a5a5c', fontSize: 13, fontFamily: 'Helvetica', letterSpacing: 4, fontWeight: 600}}>MENU</div>
      </div>
    </AbsoluteFill>
  );
}

// ─── END CARD ────────────────────────────────────────────────────────────────
function EndCard({progress}: {progress: number}) {
  const ta = Math.min(1, Math.max(0, (progress - 0.15) / 0.25));
  const ua = Math.min(1, Math.max(0, (progress - 0.45) / 0.25));
  return (
    <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', background: '#000'}}>
      <div style={{fontFamily: "'Barlow Condensed', Helvetica", fontWeight: 700, fontSize: 46, color: '#fff', opacity: ta, textTransform: 'uppercase' as const, letterSpacing: 4}}>16,000 posts.</div>
      <div style={{fontFamily: "'Barlow Condensed', Helvetica", fontWeight: 700, fontSize: 46, color: '#d4a030', opacity: ta, marginTop: 10, textTransform: 'uppercase' as const, letterSpacing: 4}}>One library.</div>
      <div style={{fontFamily: "'Inter', Helvetica", fontSize: 22, color: '#b09060', opacity: ua, marginTop: 35}}>The archive is back.</div>
      <div style={{fontFamily: "'Inter', Helvetica", fontSize: 18, color: '#7a6040', opacity: ua, marginTop: 14}}>beforethedata.com</div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export const BTDArchiveIpod3D: React.FC = () => {
  const frame = useCurrentFrame();

  const screenOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
  });

  const {pos, isHero, heroData, heroAlpha} = getScrollState(frame);
  const isEndCard = frame >= 790;
  const endCardProgress = isEndCard ? (frame - 790) / 170 : 0;
  const endFade = interpolate(frame, [775, 800], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <IpodShell screenOpacity={screenOpacity}>
      {!isEndCard && (
        <div style={{width: '100%', height: '100%', position: 'relative'}}>
          <ThreeCanvas
            width={840}
            height={640}
            camera={{position: [0, 1.0, 5.8], fov: 42, near: 0.1, far: 50}}
          >
            <CoverFlowScene scrollPos={pos} />
          </ThreeCanvas>

          {isHero && heroData && heroAlpha > 0 && (
            <div style={{position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center' as const, opacity: heroAlpha}}>
              <div style={{fontFamily: "'Barlow Condensed', Helvetica", fontWeight: 700, fontSize: 30, color: '#fff', textTransform: 'uppercase' as const, letterSpacing: 3, textShadow: '0 2px 10px rgba(0,0,0,0.9)'}}>{heroData.artist}</div>
              <div style={{fontFamily: "'Inter', Helvetica", fontSize: 15, color: '#c8a050', marginTop: 4, textShadow: '0 1px 6px rgba(0,0,0,0.7)'}}>{heroData.track}  ·  {heroData.year}</div>
            </div>
          )}

          {endFade > 0 && <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#000', opacity: endFade}} />}
        </div>
      )}
      {isEndCard && <EndCard progress={endCardProgress} />}
    </IpodShell>
  );
};
