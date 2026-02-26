import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';

const DOT_CONFIG = [
  {x: 80,  y: 200, size: 6,  speed: 0.3, phase: 0},
  {x: 950, y: 350, size: 4,  speed: 0.2, phase: 1.2},
  {x: 150, y: 700, size: 8,  speed: 0.25,phase: 2.4},
  {x: 900, y: 900, size: 5,  speed: 0.35,phase: 0.7},
  {x: 200, y: 1400,size: 7,  speed: 0.2, phase: 1.9},
  {x: 920, y: 1500,size: 4,  speed: 0.3, phase: 3.1},
  {x: 60,  y: 1100,size: 5,  speed: 0.15,phase: 0.4},
  {x: 1000,y: 600, size: 6,  speed: 0.28,phase: 2.1},
  {x: 500, y: 120, size: 3,  speed: 0.22,phase: 1.5},
  {x: 550, y: 1780,size: 5,  speed: 0.18,phase: 2.8},
];

export const Dots: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
      {DOT_CONFIG.map((dot, i) => {
        const t = frame / 30;
        const floatY = Math.sin(t * dot.speed * Math.PI * 2 + dot.phase) * 30;
        const floatX = Math.cos(t * dot.speed * Math.PI * 2 + dot.phase * 0.7) * 15;
        const opacity = interpolate(frame, [0, 15], [0, 0.35], {extrapolateRight: 'clamp'});

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: dot.x + floatX,
              top: dot.y + floatY,
              width: dot.size,
              height: dot.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,' + opacity + ')',
            }}
          />
        );
      })}
    </div>
  );
};
