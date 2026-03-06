import React from 'react';
import {
  useCurrentFrame,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
  Audio,
  Sequence,
  staticFile,
} from 'remotion';

// ─── ASSETS ──────────────────────────────────────────────────────────────────
const B_MARK = staticFile('btd-b-mark.png');
const WORDMARK = staticFile('btd-wordmark.png');
const CLICK_SFX = staticFile('sfx/ipod-click.mp3');
const CRESCENDO = staticFile('sfx/crescendo-theme.mp3');
const DRIVING_AMBITION = staticFile('sfx/driving-ambition-strings-loop.mp3');
const EPICAL_DRUMS = staticFile('sfx/epical-drums.mp3');
const OPENING_BOOM = staticFile('sfx/opening-boom.mp3');
const GONE_BOOM = staticFile('sfx/gone-boom.mp3');
const TWEET_IMG = staticFile('chad-assets/hillydilly-shutdown-tweet.jpg');

// ─── INTRO TIMING (narrative intro) ──────────────────────────────────────────
// Black screen with text reveals, then tweet screenshot, then cover flow
// "16,000 posts." → "19 years of music discovery." → "Gone." → Tweet → Cover Flow
const INTRO_TOTAL = 570; // 19s total intro before cover flow starts
const HERO_CLIPS = [
  staticFile('sfx/hero-billie-clip.mp3'),
  staticFile('sfx/hero-lorde-clip.mp3'),
  staticFile('sfx/hero-lany-clip.mp3'),
  staticFile('sfx/hero-macklemore-clip.mp3'),
  staticFile('sfx/hero-daniel-caesar-clip.mp3'),
  staticFile('sfx/hero-doja-clip.mp3'),
  staticFile('sfx/hero-dominic-clip.mp3'),
  staticFile('sfx/hero-halsey-clip.mp3'),
  staticFile('sfx/hero-tom-clip.mp3'),
];
const CLOUD = 'https://res.cloudinary.com/dd9nbystx/image/upload';

// Hero covers with metadata (the Greatest Finds)
const HERO_COVERS = [
  {url: `${CLOUD}/btd/archive/billie-eilish-ocean-eyes.png`, artist: 'Billie Eilish', year: '2015', track: 'Ocean Eyes'},
  {url: `${CLOUD}/v1772809629/btd/archive/lorde-love-club-illustration.jpg`, artist: 'Lorde', year: '2013', track: 'The Love Club'},
  {url: `${CLOUD}/btd/archive/lany-walk-away.png`, artist: 'LANY', year: '2014', track: 'Walk Away'},
  {url: `${CLOUD}/btd/archive/macklemore-unplanned-mixtape.jpg`, artist: 'Macklemore', year: '2009', track: 'The Unplanned Mixtape'},
  {url: `${CLOUD}/v1772573043/btd/archive/daniel-caesar-birds.png`, artist: 'Daniel Caesar', year: '2014', track: 'Scream'},
  {url: `${CLOUD}/btd/archive/doja-cat-so-high.png`, artist: 'Doja Cat', year: '2014', track: 'So High'},
  {url: `${CLOUD}/btd/archive/dominic-fike.png`, artist: 'Dominic Fike', year: '2018', track: "Don't Forget About Me"},
  {url: `${CLOUD}/btd/archive/halsey-room-93.png`, artist: 'Halsey', year: '2014', track: 'Room 93'},
  {url: 'https://res.cloudinary.com/dd9nbystx/image/upload/v1772573142/btd/archive/tom-misch-eems-to-slide.png', artist: 'Tom Misch', year: '2014', track: 'Eeems to Slide'},
];

// All filler covers from Cloudinary archive (hi-res + upscaled lo-res)
const ALL_FILLERS_RAW = [
  // Hi-res (300px+)
  `${CLOUD}/btd/archive/astronomyy-dont-need-u.png`,
  `${CLOUD}/btd/archive/astronomyy-things-id-do-for-you.jpg`,
  `${CLOUD}/btd/archive/chelsea-cutler-an-introduction.png`,
  `${CLOUD}/btd/archive/healy-an-introduction.png`,
  `${CLOUD}/btd/archive/kygo-artist.png`,
  `${CLOUD}/btd/archive/kygo-firestone.jpg`,
  `${CLOUD}/btd/archive/lany-ilysb.jpg`,
  `${CLOUD}/btd/archive/lapsley-monday-ep.png`,
  `${CLOUD}/btd/archive/lapsley-station-daktyl-remix.jpg`,
  `${CLOUD}/btd/archive/milky-chance-stolen-dance.jpg`,
  `${CLOUD}/btd/archive/neiked-sexual.jpg`,
  `${CLOUD}/btd/archive/tom-misch-memory.jpg`,
  // Lo-res upscaled via Cloudinary
  `${CLOUD}/w_500,c_fill/btd/archive/1799.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/1948.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/1957.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/340ml-sorry-for-the-delay.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/360-take-off-sky-is-falling-m-phazes-remix.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/a-certain-shade-three-kingdoms.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/aaron-nazrul-butterfly-man.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/alborosie-escape-from-babylon-to-the-kingdom-of-zion.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/alo-man-of-the-world.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/aloe-blacc-i-need-a-dollar.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/am-neja-theory-hazit-othello-are-am-neja.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/amplive-murder-at-the-discotech.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/army-of-the-pharoahs-the-unholy-terror.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/arrested-development-luxury-throwback-tuesday.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/astrological-living-fossils-free-album.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/athletic-mic-league-team-player-1.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/atmosphere-just-for-show.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/atmosphere-the-family-sign.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/atmosphere-to-all-my-friends.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/atmosphere-to-all-my-friendsblood-makes-blade-holy.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/batsauce-summertime-free-album.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/bedouin-soundclash-light-the-horizon.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/big-boi-lookin-for-ya-ft-andre-3000-sleepy-brown.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/big-boi-vs-the-black-keys-the-brothers-of-chico-dusty.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/black-grass-oh-jah-ep.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/blame-one-endurance.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/bliss-n-eso-golden-years.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/bliss-n-eso-running-on-air.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/blue-foundation-life-of-a-ghost.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/blue-king-brown-worldwize-part-1-north-south.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/blue-sky-black-death-noir-2.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/blue-sky-black-death-sleeping-children-are-still-flying.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/bonobo-black-sands.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/braille-weapon-aid.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/broken-bells-the-high-road.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/cas-haley-connection.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/cee-lo-green-bright-lights-bigger-city.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/cee-lo-green-the-lady-killer.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/ceschi-the-one-man-band-broke-up.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/chapter-11-counterfeit-girl.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/cisco-adler-supercalifornialipsticksexymagicdopeshit.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/citizen-cope-old-man-vs-himself.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/citizen-cope-the-rainwater-lp.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/classified-that-aint-classy-single.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/damian-marley-nas-the-promised-land-ft-dennis-brown.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/debaser-peerless.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/dirty-heads-paint-it-black.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/dubblestandart-marijuana-dreams.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/dujeous-spectacular-ft-sharon-jones.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/dyme-def-sextape.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/e-dubble-freestyle-fridays.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/e-dubble-robots-cant-drink-ff-53.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/edward-sharpe-the-magnetic-zeros-up-from-below.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/eligh-grey-crow.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/eligh-miss-busdriver-rachel.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/fences-the-same-tattoos-sabzi-remix.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/fortunate-youth-up-lifted-ep.jpg`,
  `${CLOUD}/w_500,c_fill/btd/archive/foster-the-people-ep.jpg`,
];

// Sloe Jack Backstab — the final cover before end card
const SLOE_JACK_BACKSTAB = `${CLOUD}/SLOE_JACK_-_BACKSTAB_uygezj.jpg`;

// Build the full cover array: heroes at specific positions, fillers cycling between
const HERO_POSITIONS = [5, 14, 22, 30, 38, 46, 54, 62, 70];
const ALL_COVERS: string[] = [];
{
  let fi = 0;
  // 70 fillers + 9 heroes = 79 unique covers + Sloe Jack as the finale
  const totalNeeded = ALL_FILLERS_RAW.length + HERO_COVERS.length;
  for (let i = 0; i < totalNeeded; i++) {
    const hi = HERO_POSITIONS.indexOf(i);
    if (hi >= 0) ALL_COVERS.push(HERO_COVERS[hi].url);
    else { ALL_COVERS.push(ALL_FILLERS_RAW[fi % ALL_FILLERS_RAW.length]); fi++; }
  }
  // Sloe Jack Backstab is the last cover you see
  ALL_COVERS.push(SLOE_JACK_BACKSTAB);
}

// ─── CINEMATIC SCROLL CURVE ──────────────────────────────────────────────────
// Slow start -> hero stops -> accelerate -> blur fast -> hero -> faster -> end
function getScrollState(frame: number) {
  // Intro fade in (frames 0-30): static at pos 0
  if (frame < 30) return {pos: 0, isHero: false, heroData: null as any, heroAlpha: 0, speed: 0};
  // End card transition (frames 770+)
  if (frame >= 770) return {pos: ALL_COVERS.length - 1, isHero: false, heroData: null as any, heroAlpha: 0, speed: 0};

  const t = (frame - 30) / (770 - 30); // 0 to 1 over the scroll duration

  // Define hero stops with hold times (9 heroes, ~2s each)
  const heroStops = [
    {idx: 5,  startT: 0.04, holdT: 0.085, heroI: 0}, // Billie Eilish ~2s
    {idx: 14, startT: 0.15, holdT: 0.080, heroI: 1}, // Lorde ~2s
    {idx: 22, startT: 0.27, holdT: 0.075, heroI: 2}, // LANY ~2s
    {idx: 30, startT: 0.38, holdT: 0.070, heroI: 3}, // Macklemore ~2s
    {idx: 38, startT: 0.49, holdT: 0.065, heroI: 4}, // Daniel Caesar
    {idx: 46, startT: 0.59, holdT: 0.060, heroI: 5}, // Doja Cat
    {idx: 54, startT: 0.69, holdT: 0.055, heroI: 6}, // Dominic Fike
    {idx: 62, startT: 0.78, holdT: 0.050, heroI: 7}, // Halsey
    {idx: 70, startT: 0.87, holdT: 0.045, heroI: 8}, // Tom Misch
  ];

  // Check if we're in a hero hold
  for (const h of heroStops) {
    if (t >= h.startT && t < h.startT + h.holdT) {
      const hp = (t - h.startT) / h.holdT;
      return {
        pos: h.idx,
        isHero: true,
        heroData: HERO_COVERS[h.heroI],
        heroAlpha: hp < 0.12 ? hp / 0.12 : hp > 0.85 ? (1 - hp) / 0.15 : 1,
        speed: 0,
      };
    }
  }

  // Between heroes: accelerating scroll
  const stops = [
    {t: 0, pos: 0},
    {t: 0.04, pos: 5},
    {t: 0.04 + 0.085, pos: 5},   // end Billie
    {t: 0.15, pos: 14},
    {t: 0.15 + 0.080, pos: 14},  // end Lorde
    {t: 0.27, pos: 22},
    {t: 0.27 + 0.075, pos: 22},  // end LANY
    {t: 0.38, pos: 30},
    {t: 0.38 + 0.070, pos: 30},  // end Macklemore
    {t: 0.49, pos: 38},
    {t: 0.49 + 0.065, pos: 38},  // end Daniel Caesar
    {t: 0.59, pos: 46},
    {t: 0.59 + 0.060, pos: 46},  // end Doja Cat
    {t: 0.69, pos: 54},
    {t: 0.69 + 0.055, pos: 54},  // end Dominic Fike
    {t: 0.78, pos: 62},
    {t: 0.78 + 0.050, pos: 62},  // end Halsey
    {t: 0.87, pos: 70},
    {t: 0.87 + 0.045, pos: 70},  // end Tom Misch
    {t: 1.0, pos: ALL_COVERS.length - 1},
  ];

  // Find which segment we're in
  // Acceleration: early segments ease gently, later segments whip through
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const segT = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
      // Progressively snappier easing as t increases (acceleration feel)
      const accel = interpolate(t, [0, 1], [0.3, 0.8], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      // Blend between smooth cubic and sharp ease-in-out based on position
      const smoothEased = interpolate(segT, [0, 1], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });
      const sharpEased = interpolate(segT, [0, 1], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.quad),
      });
      const eased = smoothEased * (1 - accel) + sharpEased * accel;
      const pos = stops[i].pos + (stops[i + 1].pos - stops[i].pos) * eased;

      // Speed estimate (covers per second) for click frequency
      const dt = stops[i + 1].t - stops[i].t;
      const dp = stops[i + 1].pos - stops[i].pos;
      const speed = dt > 0 ? dp / (dt * (770 - 30) / 30) : 0;

      return {pos, isHero: false, heroData: null, heroAlpha: 0, speed};
    }
  }
  return {pos: 95, isHero: false, heroData: null, heroAlpha: 0, speed: 0};
}

const GRAIN_SVG = "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

// ─── COVER FLOW ──────────────────────────────────────────────────────────────
function CoverFlow({scrollPos, W, H}: {scrollPos: number; W: number; H: number}) {
  const centerIdx = Math.floor(scrollPos);
  const frac = scrollPos - centerIdx;
  const coverSize = W * 0.48;

  const covers: React.ReactNode[] = [];

  for (let offset = -6; offset <= 6; offset++) {
    const idx = ((centerIdx + offset) % ALL_COVERS.length + ALL_COVERS.length) % ALL_COVERS.length;
    const url = ALL_COVERS[idx];
    const adj = offset - frac;
    const isCenter = Math.abs(adj) < 0.5;

    let x: number, z: number, rotY: number, scale: number, opacity: number;

    if (isCenter) {
      x = adj * coverSize * 0.55;
      z = 140;
      rotY = 0;
      scale = 1;
      opacity = 1;
    } else {
      const sign = adj > 0 ? 1 : -1;
      const dist = Math.abs(adj);
      x = sign * (coverSize * 0.44 + (dist - 0.5) * coverSize * 0.24);
      z = -dist * 22;
      rotY = sign * -72;
      scale = 0.72;
      opacity = Math.max(0.10, 1 - dist * 0.20);
    }

    covers.push(
      <div
        key={`c-${offset}`}
        style={{
          position: 'absolute',
          left: '50%',
          top: '42%',
          width: coverSize * scale,
          height: coverSize * scale,
          marginLeft: -(coverSize * scale) / 2 + x,
          marginTop: -(coverSize * scale) / 2,
          transform: `perspective(900px) rotateY(${rotY}deg) translateZ(${z}px)`,
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
            borderRadius: 4,
            boxShadow: isCenter
              ? '0 20px 70px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.5)'
              : '0 8px 30px rgba(0,0,0,0.7)',
          }}
        />
        {/* Reflection */}
        {Math.abs(offset) < 4 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            height: coverSize * scale * 0.45,
            overflow: 'hidden',
            transform: 'scaleY(-1)',
            opacity: isCenter ? 0.25 : 0.10,
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
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
    <AbsoluteFill style={{background: '#0a0a0a'}}>
      {/* Warm vignette */}
      <div style={{position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0,0,0,0.65) 100%)',
      }} />

      {/* Warm ambient glow */}
      <div style={{position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 35% 30%, rgba(180,140,100,0.06) 0%, transparent 50%)',
      }} />

      {/* Glossy floor reflection line */}
      <div style={{
        position: 'absolute', left: '5%', right: '5%', top: '65%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.035) 50%, transparent)',
        zIndex: 150,
      }} />

      {covers}
    </AbsoluteFill>
  );
}

// ─── CRESCENDO THEME (builds throughout, ducks during hero clips) ────────────
function CrescendoTheme() {
  const frame = useCurrentFrame();
  // Driving Ambition: frame 0 through end of cover flow
  // Epical Drums: end card outro

  // Single continuous volume curve. Smooth ease through every transition.
  // Intro builds, then gently fades down into cover flow (iPod clicks dominate).
  // End card brings it back up.
  const vol = interpolate(frame,
    [0,    350,  490,  570,  625,  1300, 1350, 1470, 1530],
    [0.10, 0.18, 0.12, 0.12, 0.03, 0.04, 0.15, 0.15, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const baseVol = vol;

  // Sidechain compressor ducking during hero clips
  // Attack: fast (2 frames ~66ms), Release: smooth (8 frames ~266ms)
  const cfFrame = frame - 570;
  const totalCfFrames = 770 - 30;
  const heroWindows = [
    {startT: 0.04, holdT: 0.085},
    {startT: 0.17, holdT: 0.080},
    {startT: 0.29, holdT: 0.075},
    {startT: 0.40, holdT: 0.070},
    {startT: 0.50, holdT: 0.065},
    {startT: 0.60, holdT: 0.060},
    {startT: 0.70, holdT: 0.055},
    {startT: 0.79, holdT: 0.050},
    {startT: 0.87, holdT: 0.045},
  ];
  let duck = 1.0;
  if (cfFrame >= 0) {
    for (const h of heroWindows) {
      const hStart = Math.round(30 + h.startT * totalCfFrames);
      const hEnd = Math.round(30 + (h.startT + h.holdT) * totalCfFrames);
      const attackFrames = 2;  // ~66ms fast attack
      const releaseFrames = 8; // ~266ms smooth release
      const duckLevel = 0.10;  // duck to 10% (heavy sidechain)

      if (cfFrame >= hStart - attackFrames && cfFrame <= hEnd + releaseFrames) {
        if (cfFrame < hStart) {
          // Attack: ramp down quickly
          duck = Math.min(duck, interpolate(cfFrame, [hStart - attackFrames, hStart], [1.0, duckLevel], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          }));
        } else if (cfFrame > hEnd) {
          // Release: ramp back up smoothly
          duck = Math.min(duck, interpolate(cfFrame, [hEnd, hEnd + releaseFrames], [duckLevel, 1.0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          }));
        } else {
          // Held: fully ducked
          duck = duckLevel;
        }
        break;
      }
    }
  }

  return <Audio src={DRIVING_AMBITION} volume={baseVol * duck} />;
}

// ─── HERO MUSIC SNIPPETS ─────────────────────────────────────────────────────
function HeroMusic() {
  const totalFrames = 770 - 30;
  const heroStops = [
    {startT: 0.04, holdT: 0.085, clip: HERO_CLIPS[0], dur: 66},  // Billie ~2.2s
    {startT: 0.17, holdT: 0.080, clip: HERO_CLIPS[1], dur: 66},  // Lorde ~2.2s
    {startT: 0.29, holdT: 0.075, clip: HERO_CLIPS[2], dur: 66},  // LANY ~2.2s
    {startT: 0.40, holdT: 0.070, clip: HERO_CLIPS[3], dur: 66},  // Macklemore ~2.2s
    {startT: 0.50, holdT: 0.065, clip: HERO_CLIPS[4], dur: 66},  // Daniel ~2.2s
    {startT: 0.60, holdT: 0.060, clip: HERO_CLIPS[5], dur: 66},  // Doja Cat ~2.2s
    {startT: 0.70, holdT: 0.055, clip: HERO_CLIPS[6], dur: 66},  // Dominic ~2.2s
    {startT: 0.79, holdT: 0.050, clip: HERO_CLIPS[7], dur: 66},  // Halsey ~2.2s
    {startT: 0.87, holdT: 0.045, clip: HERO_CLIPS[8], dur: 66},  // Tom ~2.2s
  ];

  return (
    <>
      {heroStops.map((h, i) => {
        const startFrame = Math.round(30 + h.startT * totalFrames);
        return (
          <Sequence key={`hero-music-${i}`} from={startFrame} durationInFrames={h.dur}>
            <HeroClipWithFade src={h.clip} dur={h.dur} />
          </Sequence>
        );
      })}
    </>
  );
}

// Hero clip with crossfade envelope
function HeroClipWithFade({src, dur}: {src: string; dur: number}) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 5], [0, 0.7], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [dur - 5, dur], [0.7, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return <Audio src={src} volume={Math.min(fadeIn, fadeOut)} />;
}

// ─── CLICK SOUND LAYER ───────────────────────────────────────────────────────
// Generate click sounds synced to when each new cover scrolls into center
function ClickSounds() {
  const clicks: React.ReactNode[] = [];
  let lastIdx = -1;

  // Sample every frame to find cover transitions
  for (let f = 30; f < 770; f++) {
    const {pos} = getScrollState(f);
    const currentIdx = Math.floor(pos + 0.5);
    if (currentIdx !== lastIdx && lastIdx >= 0) {
      clicks.push(
        <Sequence key={`click-${f}`} from={f} durationInFrames={3}>
          <Audio src={CLICK_SFX} volume={0.7} />
        </Sequence>
      );
    }
    lastIdx = currentIdx;
  }

  return <>{clicks}</>;
}

// ─── END CARD (3 distinct frames, premium animation) ─────────────────────────
function EndCard({progress}: {progress: number}) {
  // progress 0 to 1 over 180 frames (6s)
  // Frame 1 (0.00-0.30): "The archive is back." alone, centered
  // Frame 2 (0.30-0.60): "19 years of music discovery." alone, centered
  // Frame 3 (0.60-1.00): BTD logo + "Live now at beforethedata.com"

  const p = progress;

  // Helper: smooth in/out for each frame
  function frameAlpha(start: number, end: number) {
    const fadeIn = 0.04;
    const fadeOut = 0.04;
    const inA = interpolate(p, [start, start + fadeIn], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    const outA = interpolate(p, [end - fadeOut, end], [1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.in(Easing.cubic),
    });
    return Math.min(inA, outA);
  }

  function slideUp(start: number, dur: number) {
    return interpolate(p, [start, start + dur], [30, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
  }

  const f1Alpha = frameAlpha(0.00, 0.30);
  const f1Y = slideUp(0.00, 0.06);
  const f2Alpha = frameAlpha(0.30, 0.60);
  const f2Y = slideUp(0.30, 0.06);

  // Frame 3: logo and URL don't fade out, they hold
  const f3LogoAlpha = interpolate(p, [0.60, 0.66], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const f3LogoScale = interpolate(p, [0.60, 0.66], [0.88, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  // URL fades in after logo settles, smooth slide up
  const f3UrlAlpha = interpolate(p, [0.72, 0.80], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const f3UrlY = interpolate(p, [0.72, 0.80], [20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Gold line accent for frames 1 and 2
  function goldLine(alpha: number, start: number) {
    const w = interpolate(p, [start, start + 0.08], [0, 180], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    return {width: w, opacity: alpha * 0.5};
  }

  const line1 = goldLine(f1Alpha, 0.00);
  const line2 = goldLine(f2Alpha, 0.30);

  return (
    <AbsoluteFill style={{background: '#111111', justifyContent: 'center', alignItems: 'center'}}>
      {/* Warm radial glow */}
      <div style={{position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, rgba(216,195,170,0.08) 0%, transparent 55%)',
      }} />
      <div style={{position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(200,160,100,0.04) 0%, transparent 40%)',
      }} />
      <div style={{position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* Frame 1: "The archive is back." */}
      {f1Alpha > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) translateY(${f1Y}px)`,
          opacity: f1Alpha,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: line1.width, height: 1, opacity: line1.opacity,
            background: 'linear-gradient(90deg, transparent, rgba(200,170,120,0.7), transparent)',
          }} />
          <div style={{
            fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
            fontWeight: 600, fontSize: 148,
            color: '#fff',
            textTransform: 'uppercase' as const,
            letterSpacing: 10,
          }}>The archive is back</div>
          <div style={{
            width: line1.width * 0.5, height: 1, opacity: line1.opacity * 0.7,
            background: 'linear-gradient(90deg, transparent, rgba(200,170,120,0.5), transparent)',
          }} />
        </div>
      )}

      {/* Frame 2: "19 years of music discovery." */}
      {f2Alpha > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) translateY(${f2Y}px)`,
          opacity: f2Alpha,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: line2.width, height: 1, opacity: line2.opacity,
            background: 'linear-gradient(90deg, transparent, rgba(200,170,120,0.7), transparent)',
          }} />
          <div style={{
            fontFamily: "'Inter', Georgia, serif",
            fontWeight: 300, fontSize: 84,
            color: 'rgba(232,220,200,0.9)',
            letterSpacing: 3,
            fontStyle: 'italic' as const,
          }}>19 years of music discovery</div>
          <div style={{
            width: line2.width * 0.5, height: 1, opacity: line2.opacity * 0.7,
            background: 'linear-gradient(90deg, transparent, rgba(200,170,120,0.5), transparent)',
          }} />
        </div>
      )}

      {/* Frame 3: BTD logo + URL */}
      {f3LogoAlpha > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) scale(${f3LogoScale})`,
          opacity: f3LogoAlpha,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <Img src={WORDMARK} style={{width: 880}} />

          <div style={{
            opacity: f3UrlAlpha,
            transform: `translateY(${f3UrlY}px)`,
            marginTop: 40,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              width: 50, height: 1,
              background: 'rgba(200,170,120,0.35)',
              marginBottom: 20,
            }} />
            <div style={{
              fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
              fontWeight: 400, fontSize: 36,
              color: 'rgba(160,158,152,0.9)',
              letterSpacing: 8,
              textTransform: 'uppercase' as const,
            }}>Live now at</div>
            <div style={{
              fontFamily: "'Inter', Helvetica, sans-serif",
              fontWeight: 500, fontSize: 52,
              color: 'rgba(232,220,200,0.95)',
              letterSpacing: 1,
              marginTop: 8,
            }}>beforethedata.com</div>
          </div>
        </div>
      )}

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
export const BTDArchiveCoverFlow: React.FC = () => {
  const frame = useCurrentFrame();

  // ─── PHASE 1: NARRATIVE INTRO (frames 0-299) ───────────────────────────
  if (frame < INTRO_TOTAL) {
    // Timeline (19s = 570 frames):
    // 0-70:     "16,000+ posts." fade in, hold, fade out (2.3s)
    // 70-140:   "13 years of music discovery." fade in, hold, fade out (2.3s)
    // 140-280:  Stats card (3.9M users, 28.5M pageviews, etc.) (4.7s)
    // 280-370:  "Gone." dramatic red text (3s) — extended, let it breathe
    // 370-460:  Tweet screenshot + "April 23, 2020" date stamp (3s)
    // 460-540:  "But not lost..." bridge (2.7s) — slower fade, breathing room
    // 540-570:  Black transition to cover flow

    function introLineAlpha(f: number, start: number, end: number) {
      const dur = end - start;
      const fadeIn = Math.min(dur * 0.25, 15);
      const fadeOut = Math.min(dur * 0.25, 15);
      const local = f - start;
      if (local < 0 || local > dur) return 0;
      if (local < fadeIn) return local / fadeIn;
      if (local > dur - fadeOut) return (dur - local) / fadeOut;
      return 1;
    }

    function introScale(alpha: number) {
      return interpolate(Math.min(alpha * 3, 1), [0, 1], [0.92, 1]);
    }

    const postsA = introLineAlpha(frame, 0, 70);
    const yearsA = introLineAlpha(frame, 70, 140);
    const statsA = introLineAlpha(frame, 140, 280);
    const goneA  = introLineAlpha(frame, 280, 370);
    const tweetA = introLineAlpha(frame, 370, 460);
    // "But not lost..." — slower fade in (20 frames vs normal 15)
    const bridgeRaw = introLineAlpha(frame, 475, 540); // delayed start for breathing room
    // Subtle pulse effect on bridge text
    const bridgePulse = frame >= 475 && frame <= 540
      ? 1 + 0.03 * Math.sin((frame - 475) * 0.15)
      : 1;
    const bridgeA = bridgeRaw;

    // Stats card: staggered number reveals
    const statsLocal = Math.max(0, frame - 140);
    const stat1A = Math.min(1, statsLocal / 10); // users
    const stat2A = Math.min(1, Math.max(0, (statsLocal - 8)) / 10); // pageviews
    const stat3A = Math.min(1, Math.max(0, (statsLocal - 16)) / 10); // sessions
    const stat4A = Math.min(1, Math.max(0, (statsLocal - 24)) / 10); // avg session

    return (
      <AbsoluteFill style={{background: '#111', justifyContent: 'center', alignItems: 'center'}}>
        {/* Warm vignette */}
        <div style={{position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)',
        }} />
        <div style={{position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 45%, rgba(180,140,100,0.05) 0%, transparent 60%)',
        }} />

        {/* "16,000 posts." */}
        {postsA > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${introScale(postsA)})`,
            fontFamily: "'Inter', Helvetica, sans-serif",
            fontWeight: 900, fontSize: 100,
            color: '#fff', opacity: postsA,
            textTransform: 'uppercase' as const, letterSpacing: 4,
            whiteSpace: 'nowrap' as const,
          }}>16,000+ posts.</div>
        )}

        {/* "19 years of music discovery." */}
        {yearsA > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${introScale(yearsA)})`,
            fontFamily: "'Inter', Helvetica, sans-serif",
            fontWeight: 900, fontSize: 58,
            color: '#e8dcc8', opacity: yearsA,
            letterSpacing: 2,
            whiteSpace: 'nowrap' as const,
            textAlign: 'center' as const,
          }}>13 years of music discovery.</div>
        )}

        {/* Stats card */}
        {statsA > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${introScale(statsA)})`,
            opacity: statsA,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 50,
          }}>
            {/* hillydilly.com label */}
            <div style={{
              fontFamily: "'Inter', Helvetica, sans-serif",
              fontWeight: 400, fontSize: 28,
              color: '#666', letterSpacing: 3,
              textTransform: 'uppercase' as const,
              marginBottom: 10,
            }}>hillydilly.com  ·  2007-2020</div>

            {/* Stats grid */}
            <div style={{display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center'}}>
              <div style={{opacity: stat1A, transform: `translateY(${(1 - stat1A) * 20}px)`, textAlign: 'center' as const}}>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 900, fontSize: 90, color: '#fff', letterSpacing: 2}}>3.9M</div>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 400, fontSize: 26, color: '#888', marginTop: 4}}>unique visitors</div>
              </div>
              <div style={{opacity: stat2A, transform: `translateY(${(1 - stat2A) * 20}px)`, textAlign: 'center' as const}}>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 900, fontSize: 90, color: '#fff', letterSpacing: 2}}>28.5M</div>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 400, fontSize: 26, color: '#888', marginTop: 4}}>pageviews</div>
              </div>
              <div style={{opacity: stat3A, transform: `translateY(${(1 - stat3A) * 20}px)`, textAlign: 'center' as const}}>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 900, fontSize: 90, color: '#fff', letterSpacing: 2}}>7.8M</div>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 400, fontSize: 26, color: '#888', marginTop: 4}}>sessions</div>
              </div>
              <div style={{opacity: stat4A, transform: `translateY(${(1 - stat4A) * 20}px)`, textAlign: 'center' as const}}>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 900, fontSize: 90, color: '#e8dcc8', letterSpacing: 2}}>16:01</div>
                <div style={{fontFamily: "'Inter', Helvetica, sans-serif", fontWeight: 400, fontSize: 26, color: '#888', marginTop: 4}}>avg. session duration</div>
              </div>
            </div>
          </div>
        )}

        {/* "Gone." */}
        {goneA > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${introScale(goneA)})`,
            fontFamily: "'Inter', Helvetica, sans-serif",
            fontWeight: 900, fontSize: 140,
            color: '#ff4444', opacity: goneA,
            textTransform: 'uppercase' as const, letterSpacing: 6,
          }}>Gone.</div>
        )}

        {/* Tweet screenshot + date stamp */}
        {tweetA > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${introScale(tweetA)})`,
            opacity: tweetA,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Img src={TWEET_IMG} style={{
              width: 900,
              borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }} />
            <div style={{
              fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
              fontWeight: 400, fontSize: 24,
              color: 'rgba(160,158,152,0.7)',
              letterSpacing: 4,
              marginTop: 20,
              textTransform: 'uppercase' as const,
            }}>April 23, 2020</div>
          </div>
        )}

        {/* "But not lost..." bridge — slower, breathing, subtle pulse */}
        {bridgeA > 0 && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${bridgePulse * interpolate(Math.min(bridgeA * 2, 1), [0, 1], [0.88, 1])})`,
            fontFamily: "'Inter', Georgia, serif",
            fontWeight: 300, fontSize: 72,
            color: 'rgba(232,220,200,0.9)', opacity: bridgeA,
            fontStyle: 'italic' as const,
            letterSpacing: 3,
          }}>But not lost...</div>
        )}

        {/* Film grain */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("${GRAIN_SVG}")`,
          backgroundSize: '200px 200px',
          opacity: 0.04,
          mixBlendMode: 'overlay' as const,
          pointerEvents: 'none' as const,
          zIndex: 400,
        }} />

        {/* Intro SFX */}
        <Sequence from={0}><Audio src={OPENING_BOOM} volume={0.8} /></Sequence>
        <Sequence from={280}><Audio src={GONE_BOOM} volume={0.9} /></Sequence>
        {/* Sub bass hit on end card "THE ARCHIVE IS BACK" */}
        <Sequence from={INTRO_TOTAL + 780}><Audio src={GONE_BOOM} volume={0.6} /></Sequence>
        {/* Background music starts from frame 0 */}
        <Sequence from={0}><CrescendoTheme /></Sequence>
      </AbsoluteFill>
    );
  }

  // ─── PHASE 2: COVER FLOW (frames 300+) ────────────────────────────────
  const cfFrame = frame - INTRO_TOTAL; // Cover flow frame (0-based)

  // Fade in from intro
  const coverFlowFadeIn = interpolate(cfFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const {pos, isHero, heroData, heroAlpha} = getScrollState(cfFrame);
  const isEndCard = cfFrame >= 780;
  const endProgress = isEndCard ? (cfFrame - 780) / 180 : 0;
  const endFade = interpolate(cfFrame, [760, 790], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  if (isEndCard) {
    return (
      <>
        <EndCard progress={endProgress} />
        <Sequence from={0}><CrescendoTheme /></Sequence>
        <Sequence from={INTRO_TOTAL}><HeroMusic /></Sequence>
        <Sequence from={INTRO_TOTAL}><ClickSounds /></Sequence>
      </>
    );
  }

  return (
    <AbsoluteFill>
      <CoverFlow scrollPos={pos} W={1080} H={1920} />

      {/* BTD B mark - fades in */}
      <Img src={B_MARK} style={{
        position: 'absolute',
        top: 48, left: 48,
        width: 60, height: 60,
        opacity: interpolate(cfFrame, [20, 50], [0, 0.25], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        }),
        zIndex: 200,
      }} />

      {/* Hero text overlay */}
      {isHero && heroData && heroAlpha > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 320, left: 0, right: 0,
          textAlign: 'center' as const,
          opacity: heroAlpha,
          zIndex: 200,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', Helvetica, sans-serif",
            fontWeight: 700, fontSize: 56,
            color: '#fff',
            textTransform: 'uppercase' as const, letterSpacing: 5,
            textShadow: '0 4px 24px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.8)',
          }}>{heroData.artist}</div>
          <div style={{
            fontFamily: "'Inter', Helvetica, sans-serif",
            fontSize: 26, color: '#e8dcc8',
            marginTop: 10,
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          }}>{heroData.track}  ·  {heroData.year}</div>
        </div>
      )}

      {/* Fade in from black intro */}
      {coverFlowFadeIn < 1 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#111', opacity: 1 - coverFlowFadeIn,
          zIndex: 500,
        }} />
      )}

      {/* Fade to end card */}
      {endFade > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#0a0a0a', opacity: endFade,
          zIndex: 300,
        }} />
      )}

      {/* Intro SFX */}
      <Sequence from={0}><Audio src={OPENING_BOOM} volume={0.8} /></Sequence>
      <Sequence from={280}><Audio src={GONE_BOOM} volume={0.9} /></Sequence>

      {/* Audio - background music from frame 0, hero/clicks from cover flow */}
      <Sequence from={0}><CrescendoTheme /></Sequence>
      <Sequence from={INTRO_TOTAL}><HeroMusic /></Sequence>
      <Sequence from={INTRO_TOTAL}><ClickSounds /></Sequence>

      {/* Film grain */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("${GRAIN_SVG}")`,
        backgroundSize: '200px 200px',
        opacity: 0.04,
        mixBlendMode: 'overlay' as const,
        pointerEvents: 'none' as const,
        zIndex: 400,
      }} />
    </AbsoluteFill>
  );
};
