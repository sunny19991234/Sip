const GLASS_PATH = 'M20 4 H180 L152 208 Q150 220 138 220 H62 Q50 220 48 208 Z';
const WAVE_TOP = 4;
const WAVE_BOTTOM = 220;
const USABLE_HEIGHT = WAVE_BOTTOM - WAVE_TOP;

const WAVE_PATH =
  'M-100,10 Q-75,0 -50,10 T0,10 T50,10 T100,10 T150,10 T200,10 T250,10 T300,10 T350,10 T400,10 T450,10 T500,10 V50 H-100 Z';

type WaterGlassProps = {
  percent: number;
  amountMl: number;
  targetMl: number;
};

export default function WaterGlass({ percent, amountMl, targetMl }: WaterGlassProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const waterY = WAVE_BOTTOM - (clamped / 100) * USABLE_HEIGHT;

  return (
    <div className="relative mx-auto w-[220px]">
      <svg viewBox="0 0 200 240" className="h-auto w-full" aria-hidden="true">
        <defs>
          <clipPath id="sip-glass-clip">
            <path d={GLASS_PATH} />
          </clipPath>
        </defs>

        <g clipPath="url(#sip-glass-clip)">
          <rect
            className="sip-water-rect"
            x="0"
            y={waterY}
            width="200"
            height={WAVE_BOTTOM - waterY + 20}
            fill="var(--color-accent)"
          />
          <g style={{ transform: `translateY(${waterY}px)`, transition: 'transform 0.4s ease' }}>
            <g className="sip-wave-layer sip-wave-back">
              <path d={WAVE_PATH} fill="var(--color-accent)" opacity="0.45" transform="translate(0,-7)" />
            </g>
            <g className="sip-wave-layer sip-wave-front">
              <path d={WAVE_PATH} fill="var(--color-accent)" transform="translate(0,-4)" />
            </g>
          </g>
        </g>

        <path d={GLASS_PATH} fill="none" stroke="var(--color-border)" strokeWidth="2" />
        <line x1="34" y1="12" x2="27" y2="206" stroke="white" strokeOpacity="0.12" strokeWidth="7" strokeLinecap="round" />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
        <span className="text-4xl font-bold text-text">{amountMl}</span>
        <span className="text-sm text-text-muted">van {targetMl} ml</span>
        <span className="text-sm text-text-muted">{clamped}%</span>
      </div>
    </div>
  );
}
