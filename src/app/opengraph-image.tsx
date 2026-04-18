import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Shift — Employee Scheduler';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: '#faf8f3',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: logo wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#1f1b16',
              color: 'white',
              fontSize: '26px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '-1px',
            }}
          >
            sh<span style={{ color: '#b84a2f' }}>i</span>ft
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#8a8478',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Employee Scheduler
          </div>
        </div>

        {/* Middle: headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: '84px',
              fontWeight: 600,
              color: '#1f1b16',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Build a week&apos;s schedule
          </div>
          <div
            style={{
              fontSize: '84px',
              fontWeight: 600,
              color: '#b84a2f',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            in a minute.
          </div>
        </div>

        {/* Bottom: shift pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { bg: '#2a4f72', label: 'Mon 8–4' },
            { bg: '#5a3e6b', label: 'Tue 11–7' },
            { bg: '#6a3a30', label: 'Wed 7–3' },
            { bg: '#3a6a35', label: 'Thu 9–5' },
            { bg: '#5a5028', label: 'Fri 10–6' },
            { bg: '#2f5866', label: 'Sat 8–2' },
          ].map(({ bg, label }) => (
            <div
              key={label}
              style={{
                background: bg,
                color: 'white',
                fontSize: '20px',
                fontWeight: 500,
                padding: '10px 16px',
                borderRadius: '8px',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
