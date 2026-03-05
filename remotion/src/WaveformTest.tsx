import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import React from 'react';

// 4 waveform variations to compare
export const WaveformTest: React.FC = () => {
  const frame = useCurrentFrame();

  const variations = [
    {
      label: 'A: Smooth Blob (original take 31 style)',
      render: () => {
        const pts = 70; const w = 400; const mid = 60;
        let d = `M 0 ${mid}`;
        for (let i = 0; i <= pts; i++) {
          const x = (i / pts) * w;
          const base = Math.abs(Math.sin(i * 0.35 + 2.1)) * 35 + Math.sin(i * 0.6 + 0.8) * 12 + 10;
          const breathe = Math.sin(frame * 0.12 + i * 0.15) * 12;
          d += ` Q ${x - 2} ${mid - (base + breathe)} ${x} ${mid - (base + breathe) * 0.95}`;
        }
        d += ` L ${w} ${mid}`;
        for (let i = pts; i >= 0; i--) {
          const x = (i / pts) * w;
          const base = Math.abs(Math.sin(i * 0.35 + 2.1)) * 15 + 5;
          const breathe = Math.sin(frame * 0.12 + i * 0.15) * 5;
          d += ` Q ${x + 2} ${mid + (base + breathe)} ${x} ${mid + (base + breathe) * 0.95}`;
        }
        d += ' Z';
        return d;
      },
    },
    {
      label: 'B: Vertical Bars (classic EQ)',
      render: () => {
        const bars = 40; const w = 400; const mid = 60; const bw = w / bars;
        let d = '';
        for (let i = 0; i < bars; i++) {
          const x = i * bw + 1;
          const base = Math.abs(Math.sin(i * 0.5 + 1.5)) * 35 + 8;
          const pulse = Math.sin(frame * 0.2 + i * 0.3) * 12;
          const h = base + pulse;
          d += `M ${x} ${mid - h} L ${x + bw - 2} ${mid - h} L ${x + bw - 2} ${mid + h * 0.4} L ${x} ${mid + h * 0.4} Z `;
        }
        return d;
      },
    },
    {
      label: 'C: Rounded Bars (Spotify style)',
      render: () => {
        const bars = 50; const w = 400; const mid = 60; const bw = w / bars;
        let d = '';
        for (let i = 0; i < bars; i++) {
          const x = i * bw + 1;
          const base = Math.abs(Math.sin(i * 0.4 + 2.0)) * 38 + 6;
          const pulse = Math.sin(frame * 0.18 + i * 0.35) * 10;
          const h = Math.max(4, base + pulse);
          const r = Math.min(2, (bw - 2) / 2);
          d += `M ${x + r} ${mid - h} Q ${x} ${mid - h} ${x} ${mid - h + r} L ${x} ${mid + h * 0.35 - r} Q ${x} ${mid + h * 0.35} ${x + r} ${mid + h * 0.35} L ${x + bw - 2 - r} ${mid + h * 0.35} Q ${x + bw - 2} ${mid + h * 0.35} ${x + bw - 2} ${mid + h * 0.35 - r} L ${x + bw - 2} ${mid - h + r} Q ${x + bw - 2} ${mid - h} ${x + bw - 2 - r} ${mid - h} Z `;
        }
        return d;
      },
    },
    {
      label: 'D: SoundCloud (filled static shape, playhead sweep)',
      render: () => {
        const pts = 100; const w = 400; const base = 110;
        const playhead = (frame / 90) * w;
        let played = `M 0 ${base}`;
        let unplayed = `M ${Math.min(playhead, w)} ${base}`;
        for (let i = 0; i <= pts; i++) {
          const x = (i / pts) * w;
          const amp = 12 + Math.abs(Math.sin(i * 0.4 + 1.2)) * 55 + Math.sin(i * 0.7) * 18;
          const y = base - amp;
          if (x <= playhead) played += ` L ${x} ${y}`;
          else unplayed += ` L ${x} ${y}`;
        }
        played += ` L ${Math.min(playhead, w)} ${base} Z`;
        unplayed += ` L ${w} ${base} Z`;
        return { played, unplayed };
      },
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#E8E4DF', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 40 }}>
        {variations.map((v, vi) => (
          <div key={vi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 12 }}>{v.label}</div>
            <div style={{ position: 'relative', background: '#F5F0E8', borderRadius: 16, padding: '20px 30px' }}>
              <svg width={400} height={120} viewBox="0 0 400 120">
                {vi === 3 ? (() => {
                  const result = v.render() as { played: string; unplayed: string };
                  return (
                    <>
                      <path d={result.played} fill="#1A1A1A" />
                      <path d={result.unplayed} fill="#1A1A1A" opacity={0.3} />
                    </>
                  );
                })() : (
                  <path d={v.render() as string} fill="#1A1A1A" />
                )}
              </svg>
              {/* Play button */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 48, height: 48, borderRadius: 24,
                background: '#F5F0E1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '14px solid #1A1A1A',
                  borderTop: '9px solid transparent',
                  borderBottom: '9px solid transparent',
                  marginLeft: 3,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
