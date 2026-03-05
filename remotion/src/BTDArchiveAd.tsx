import {
  AbsoluteFill,
  Img,
  interpolate,
  Easing,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import React, { useMemo } from "react";

// ─── Design Philosophy ─────────────────────────────────────
// This is a $10K motion piece. Every detail matters.
//
// CONCEPT: A single album cover floats in a dark void, centered, 
// with cinematic depth. Covers cascade through from above, each one
// sliding down and settling into place, then getting pushed away 
// as the next arrives. Like vinyl sleeves being filed through by
// invisible hands.
//
// When a hero cover arrives, the whole scene breathes: the cover
// grows slightly, the ambient glow shifts to match the art, and 
// time itself decelerates.
//
// BTD brand: dark (#0a0a0a), warm grain, cream text, Inter/Barlow,
// B mark top-left, editorial restraint.

// ─── Cover Data ────────────────────────────────────────────
const HERO_COVERS = [
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772573040/btd/archive/billie-eilish-ocean-eyes.png", label: "BILLIE EILISH", year: "2015" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772679787/btd/archive/lorde-love-club.jpg", label: "LORDE", year: "2013" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772573044/btd/archive/halsey-room-93.png", label: "HALSEY", year: "2014" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772575328/btd/archive/doja-cat-so-high.png", label: "DOJA CAT", year: "2014" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772575281/btd/archive/macklemore-unplanned-mixtape.jpg", label: "MACKLEMORE", year: "2012" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772573043/btd/archive/daniel-caesar-birds.png", label: "DANIEL CAESAR", year: "2014" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772572817/btd/archive/lany-walk-away.png", label: "LANY", year: "2014" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772563099/btd/archive/milky-chance-stolen-dance.jpg", label: "MILKY CHANCE", year: "2013" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772576148/btd/archive/dominic-fike.png", label: "DOMINIC FIKE", year: "2018" },
  { url: "https://res.cloudinary.com/dd9nbystx/image/upload/v1772573142/btd/archive/tom-misch-eems-to-slide.png", label: "TOM MISCH", year: "2014" },
];

const BG_COVERS = [
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677722/btd/archive/1799.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677724/btd/archive/1948.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677725/btd/archive/1957.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677726/btd/archive/340ml-sorry-for-the-delay.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677728/btd/archive/360-take-off-sky-is-falling-m-phazes-remix.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677730/btd/archive/a-certain-shade-three-kingdoms.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677733/btd/archive/aaron-nazrul-butterfly-man.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677734/btd/archive/alborosie-escape-from-babylon-to-the-kingdom-of-zion.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677735/btd/archive/alo-man-of-the-world.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677737/btd/archive/aloe-blacc-i-need-a-dollar.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677739/btd/archive/am-neja-theory-hazit-othello-are-am-neja.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677740/btd/archive/amplive-murder-at-the-discotech.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677742/btd/archive/army-of-the-pharoahs-the-unholy-terror.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677743/btd/archive/arrested-development-luxury-throwback-tuesday.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677745/btd/archive/astrological-living-fossils-free-album.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677746/btd/archive/athletic-mic-league-team-player-1.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677748/btd/archive/atmosphere-just-for-show.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677749/btd/archive/atmosphere-the-family-sign.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677750/btd/archive/atmosphere-to-all-my-friends.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677752/btd/archive/atmosphere-to-all-my-friendsblood-makes-blade-holy.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677754/btd/archive/batsauce-summertime-free-album.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677756/btd/archive/bedouin-soundclash-light-the-horizon.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677758/btd/archive/big-boi-lookin-for-ya-ft-andre-3000-sleepy-brown.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677760/btd/archive/big-boi-vs-the-black-keys-the-brothers-of-chico-dusty.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677761/btd/archive/black-grass-oh-jah-ep.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677763/btd/archive/blame-one-endurance.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677764/btd/archive/bliss-n-eso-golden-years.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677765/btd/archive/bliss-n-eso-running-on-air.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677766/btd/archive/blue-foundation-life-of-a-ghost.jpg",
  "https://res.cloudinary.com/dd9nbystx/image/upload/v1772677767/btd/archive/blue-king-brown-worldwize-part-1-north-south.jpg",
];

// ─── Build complete card sequence with timing ──────────────
interface CardEvent {
  url: string;
  isHero: boolean;
  label: string;
  year: string;
  enterFrame: number;
  holdFrames: number;
  exitStyle: "up" | "left" | "right"; // direction it exits
}

function buildCardEvents(): CardEvent[] {
  const events: CardEvent[] = [];
  let f = 0;
  let bgIdx = 0;
  const FAST_DUR = 3; // 3 frames per fast card
  const HERO_HOLD = 24; // 0.8s hold on heroes
  const DECEL_DURS = [4, 6, 9]; // 3 cards decelerating before hero
  const ACCEL_DURS = [8, 5, 3]; // 3 cards accelerating after hero
  const BG_BETWEEN = [7, 10, 8, 12, 8, 10, 7, 11, 9, 10];

  for (let h = 0; h < HERO_COVERS.length; h++) {
    // Fast background cards
    const bgCount = BG_BETWEEN[h] || 8;
    // First, regular speed cards
    const regularCount = Math.max(0, bgCount - 3);
    for (let i = 0; i < regularCount; i++) {
      events.push({
        url: BG_COVERS[bgIdx % BG_COVERS.length],
        isHero: false, label: "", year: "",
        enterFrame: f,
        holdFrames: FAST_DUR,
        exitStyle: i % 2 === 0 ? "left" : "right",
      });
      f += FAST_DUR;
      bgIdx++;
    }
    // Deceleration cards
    for (let d = 0; d < 3; d++) {
      events.push({
        url: BG_COVERS[bgIdx % BG_COVERS.length],
        isHero: false, label: "", year: "",
        enterFrame: f,
        holdFrames: DECEL_DURS[d],
        exitStyle: d % 2 === 0 ? "right" : "left",
      });
      f += DECEL_DURS[d];
      bgIdx++;
    }
    // Hero card
    events.push({
      url: HERO_COVERS[h].url,
      isHero: true,
      label: HERO_COVERS[h].label,
      year: HERO_COVERS[h].year,
      enterFrame: f,
      holdFrames: HERO_HOLD,
      exitStyle: "up",
    });
    f += HERO_HOLD;
    // Acceleration cards
    for (let a = 0; a < 3 && bgIdx < BG_COVERS.length * 3; a++) {
      events.push({
        url: BG_COVERS[bgIdx % BG_COVERS.length],
        isHero: false, label: "", year: "",
        enterFrame: f,
        holdFrames: ACCEL_DURS[a],
        exitStyle: a % 2 === 0 ? "left" : "right",
      });
      f += ACCEL_DURS[a];
      bgIdx++;
    }
  }

  // Final fade-out cards
  for (let i = 0; i < 8; i++) {
    const dur = 3 + i; // progressively slower
    events.push({
      url: BG_COVERS[bgIdx % BG_COVERS.length],
      isHero: false, label: "", year: "",
      enterFrame: f,
      holdFrames: dur,
      exitStyle: i % 2 === 0 ? "left" : "right",
    });
    f += dur;
    bgIdx++;
  }

  return events;
}

// ─── Floating Cover Card ───────────────────────────────────
const CoverCard: React.FC<{
  event: CardEvent;
  frame: number;
  size: number;
}> = ({ event, frame, size }) => {
  const localFrame = frame - event.enterFrame;
  const totalFrames = event.holdFrames;
  const progress = Math.min(1, Math.max(0, localFrame / totalFrames));

  if (localFrame < -6 || localFrame > totalFrames + 12) return null;

  // Enter: slide up from below
  const enterProgress = Math.min(1, Math.max(0, localFrame / 5));
  const enterY = interpolate(enterProgress, [0, 1], [120, 0], {
    easing: Easing.out(Easing.cubic),
  });
  const enterScale = interpolate(enterProgress, [0, 1], [0.92, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const enterOpacity = interpolate(enterProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.quad),
  });

  // Exit: based on style
  const exitStart = totalFrames - 4;
  const exitProgress = Math.max(0, (localFrame - exitStart) / 8);
  let exitX = 0, exitY = 0, exitRotate = 0, exitOpacity = 1;

  if (exitProgress > 0) {
    const ep = Easing.in(Easing.cubic)(Math.min(1, exitProgress));
    exitOpacity = 1 - ep;
    if (event.exitStyle === "left") {
      exitX = -ep * 600;
      exitRotate = -ep * 12;
    } else if (event.exitStyle === "right") {
      exitX = ep * 600;
      exitRotate = ep * 12;
    } else {
      exitY = -ep * 400;
    }
  }

  // Hero: subtle breathing
  let heroScale = 1;
  let heroGlow = 0;
  if (event.isHero && enterProgress >= 1 && exitProgress <= 0) {
    const breathe = Math.sin(((localFrame - 5) / totalFrames) * Math.PI * 2) * 0.008;
    heroScale = 1.03 + breathe;
    heroGlow = 1;
  }

  const finalScale = enterScale * heroScale;
  const finalOpacity = enterOpacity * exitOpacity;
  const finalX = exitX;
  const finalY = enterY + exitY;
  const finalRotate = exitRotate;

  // Card shadow intensity based on position
  const shadowIntensity = interpolate(Math.abs(finalY), [0, 100], [1, 0.3], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        transform: `translate(${finalX}px, ${finalY}px) rotate(${finalRotate}deg) scale(${finalScale})`,
        opacity: finalOpacity,
        zIndex: event.isHero ? 10 : 5,
      }}
    >
      {/* Card with depth */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 6,
          overflow: "hidden",
          position: "relative",
          boxShadow: `
            0 ${4 * shadowIntensity}px ${20 * shadowIntensity}px rgba(0,0,0,${0.4 * shadowIntensity}),
            0 ${12 * shadowIntensity}px ${60 * shadowIntensity}px rgba(0,0,0,${0.3 * shadowIntensity})
          `,
        }}
      >
        <Img
          src={event.url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Subtle edge highlight (light reflection) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Ambient glow behind hero cards */}
      {heroGlow > 0 && (
        <div
          style={{
            position: "absolute",
            inset: -60,
            borderRadius: 40,
            background: "radial-gradient(ellipse, rgba(200,180,150,0.08) 0%, transparent 70%)",
            filter: "blur(30px)",
            opacity: heroGlow,
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
};

// ─── Hero Label ────────────────────────────────────────────
const HeroLabel: React.FC<{
  event: CardEvent;
  frame: number;
  size: number;
}> = ({ event, frame, size }) => {
  if (!event.isHero) return null;

  const localFrame = frame - event.enterFrame;
  const labelDelay = 8; // appears slightly after card settles

  const labelOpacity = interpolate(
    localFrame,
    [labelDelay, labelDelay + 8, event.holdFrames - 6, event.holdFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const labelY = interpolate(
    localFrame,
    [labelDelay, labelDelay + 10],
    [12, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        marginTop: size / 2 + 32,
        transform: `translateX(-50%) translateY(${labelY}px)`,
        opacity: labelOpacity,
        textAlign: "center",
        zIndex: 15,
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 56,
          color: "#ffffff",
          letterSpacing: "0.06em",
          lineHeight: 1,
        }}
      >
        {event.label}
      </div>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 400,
          fontSize: 26,
          color: "#e8dcc8",
          letterSpacing: "0.12em",
          marginTop: 8,
        }}
      >
        Discovered {event.year}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────
export const BTDArchiveAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const SIZE = 580;

  const events = useMemo(() => buildCardEvents(), []);

  // Find active cards (current + neighbors for rendering)
  const activeEvents = events.filter(e => {
    const end = e.enterFrame + e.holdFrames + 12;
    return frame >= e.enterFrame - 6 && frame <= end;
  });

  // Find the current hero (if any) for ambient effects
  const currentHero = events.find(e =>
    e.isHero && frame >= e.enterFrame && frame < e.enterFrame + e.holdFrames
  );

  // End card timing (after all cards)
  const lastEvent = events[events.length - 1];
  const endCardStart = lastEvent ? lastEvent.enterFrame + lastEvent.holdFrames : 800;
  const isEndCard = frame >= endCardStart;

  const endCardOpacity = interpolate(frame, [endCardStart, endCardStart + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Running counter
  const maxPosts = 16000;
  const counterEnd = endCardStart;
  const postCount = Math.floor(interpolate(
    frame, [0, counterEnd], [0, maxPosts],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  ));

  // B mark fade in
  const bMarkOpacity = interpolate(frame, [0, 20], [0, 0.7], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#050505", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700&family=Inter:wght@400;500;600;900&display=swap');`}</style>

      {/* Background: subtle radial gradient that shifts with heroes */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: currentHero
            ? "radial-gradient(ellipse at 50% 45%, rgba(40,35,28,0.6) 0%, #050505 55%)"
            : "radial-gradient(ellipse at 50% 45%, rgba(25,24,22,0.5) 0%, #050505 55%)",
          transition: "background 0.5s",
        }}
      />

      {/* Warm ambient glow behind card area */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          width: SIZE * 1.8,
          height: SIZE * 1.8,
          marginLeft: -(SIZE * 1.8) / 2,
          marginTop: -(SIZE * 1.8) / 2,
          background: "radial-gradient(ellipse, rgba(180,150,100,0.035) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />

      {/* Film grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          pointerEvents: "none",
          zIndex: 50,
        }}
      />

      {/* Render active cover cards */}
      {activeEvents.map((event, i) => (
        <React.Fragment key={`${event.enterFrame}`}>
          <CoverCard event={event} frame={frame} size={SIZE} />
          <HeroLabel event={event} frame={frame} size={SIZE} />
        </React.Fragment>
      ))}

      {/* Surface reflection below card */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: SIZE * 0.9,
          height: 60,
          marginLeft: -(SIZE * 0.9) / 2,
          marginTop: SIZE / 2 + 8,
          background: "radial-gradient(ellipse, rgba(255,255,255,0.02) 0%, transparent 70%)",
          filter: "blur(12px)",
          zIndex: 1,
        }}
      />

      {/* B mark top-left */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 48,
          opacity: bMarkOpacity,
          zIndex: 30,
        }}
      >
        <Img
          src={staticFile("btd-b-mark.png")}
          style={{ width: 64, height: 64, objectFit: "contain" }}
        />
      </div>

      {/* Running post counter bottom */}
      {!isEndCard && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 30,
            opacity: interpolate(frame, [0, 20, endCardStart - 10, endCardStart], [0, 0.35, 0.35, 0], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            }),
          }}
        >
          <span
            style={{
              fontFamily: "'SF Mono', 'Barlow Condensed', monospace",
              fontWeight: 400,
              fontSize: 22,
              color: "#555",
              letterSpacing: "0.25em",
            }}
          >
            {postCount.toLocaleString()} POSTS
          </span>
        </div>
      )}

      {/* Corner date stamp */}
      <div
        style={{
          position: "absolute",
          top: 58,
          right: 48,
          fontFamily: "'SF Mono', monospace",
          fontSize: 11,
          fontWeight: 600,
          color: "#333",
          letterSpacing: 3,
          opacity: bMarkOpacity * 0.5,
          zIndex: 30,
        }}
      >
        2007 - 2026
      </div>

      {/* End Card */}
      {isEndCard && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: endCardOpacity,
            zIndex: 40,
          }}
        >
          <Img
            src={staticFile("btd-b-mark.png")}
            style={{
              width: 100,
              height: 100,
              objectFit: "contain",
              opacity: interpolate(frame, [endCardStart + 5, endCardStart + 20], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
            }}
          />
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 80,
              color: "#ffffff",
              letterSpacing: "0.03em",
              lineHeight: 1,
              marginTop: 28,
              textAlign: "center",
              opacity: interpolate(frame, [endCardStart + 12, endCardStart + 28], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
              transform: `translateY(${interpolate(frame, [endCardStart + 12, endCardStart + 28], [15, 0], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
                easing: Easing.out(Easing.quad),
              })}px)`,
            }}
          >
            THE ARCHIVE
          </div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 400,
              fontSize: 32,
              color: "#e8dcc8",
              letterSpacing: "0.15em",
              marginTop: 12,
              opacity: interpolate(frame, [endCardStart + 20, endCardStart + 36], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
            }}
          >
            16,000+ POSTS
          </div>
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 400,
              fontSize: 36,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.1em",
              marginTop: 40,
              opacity: interpolate(frame, [endCardStart + 28, endCardStart + 44], [0, 1], {
                extrapolateLeft: "clamp", extrapolateRight: "clamp",
              }),
            }}
          >
            beforethedata.com
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
