import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';

interface CylinderProps {
  artUrl: string;
  size?: number;
}

export const Cylinder: React.FC<CylinderProps> = ({artUrl, size = 580}) => {
  const frame = useCurrentFrame();

  // Spin starts at frame 9 (~0.3s), full 360 every 4s = 120 frames
  const spinStart = 9;
  const rotation = frame < spinStart
    ? 0
    : ((frame - spinStart) / 120) * 360;

  // Fade in the whole cylinder
  const opacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});

  // Scale in slightly
  const scale = interpolate(frame, [0, 25], [0.85, 1], {extrapolateRight: 'clamp'});

  // Cylinder geometry: 4 faces
  const faceCount = 4;
  const faceAngle = 360 / faceCount;
  const radius = (size / 2) / Math.tan(Math.PI / faceCount);

  // Glow pulsing
  const glowPulse = 0.7 + Math.sin(frame / 30 * Math.PI) * 0.3;
  const glowSize = Math.round(30 + glowPulse * 20);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -55%) scale(${scale})`,
        opacity,
        width: size,
        height: size,
        perspective: 1200,
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* Glow behind cylinder */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size * 1.1,
        height: size * 1.1,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at center, rgba(200,0,0,0.8) 0%, rgba(180,0,0,0.3) 50%, transparent 70%)`,
        filter: `blur(${glowSize}px)`,
        pointerEvents: 'none',
      }} />

      {/* Cylinder container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
        }}
      >
        {Array.from({length: faceCount}).map((_, i) => {
          const faceRotation = i * faceAngle;
          // Make the primary face (0) the art, others are darkened versions
          const isFront = i === 0;
          const brightness = isFront ? 1 : 0.4 + (i === 1 || i === 3 ? 0.2 : 0);

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                top: 0,
                left: 0,
                backgroundImage: `url(${artUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `rotateY(${faceRotation}deg) translateZ(${radius}px)`,
                backfaceVisibility: 'visible',
                filter: `brightness(${brightness})`,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {/* Shine overlay on each face */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: isFront
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)'
                  : 'rgba(0,0,0,0.3)',
                borderRadius: 8,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
