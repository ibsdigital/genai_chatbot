import { Show } from 'solid-js';

type MeetingDetailsInlineProps = {
  meetingData: any;
  primaryColor?: string;
  botMessageBackgroundColor?: string;
  botMessageTextColor?: string;
};

// Returns 0 (black) ... 1 (white), uses WCAG luminance
function getLuminance(hex?: string): number {
  if (!hex) return 1;
  let c = hex.replace('#', '');
  if (c.length === 3)
    c = c
      .split('')
      .map((x) => x + x)
      .join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return (0.2126 * r) / 255 + (0.7152 * g) / 255 + (0.0722 * b) / 255;
}

// Utility to blend two hexes (e.g., for background tint)
function blend(bg = '#fff', fg = '#FB8105', alpha = 0.04) {
  function hexToRgb(h: string) {
    let c = h.replace('#', '');
    if (c.length === 3)
      c = c
        .split('')
        .map((x) => x + x)
        .join('');
    return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
  }
  const [r1, g1, b1] = hexToRgb(bg);
  const [r2, g2, b2] = hexToRgb(fg);
  return `rgb(${Math.round(r1 * (1 - alpha) + r2 * alpha)},${Math.round(g1 * (1 - alpha) + g2 * alpha)},${Math.round(
    b1 * (1 - alpha) + b2 * alpha,
  )})`;
}

export const MeetingDetailsInline = (props: MeetingDetailsInlineProps) => {
  // Theme detection based on bubble background
  const bgLum = getLuminance(props.botMessageBackgroundColor);
  const isDark = bgLum < 0.45;

  // Nice backgrounds for each mode
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : blend(props.botMessageBackgroundColor ?? '#f7faff', props.primaryColor ?? '#FB8105', 0.09);
  const cardBorder = isDark ? 'rgba(255,255,255,0.14)' : blend(props.botMessageBackgroundColor ?? '#f7faff', '#000', 0.04);
  const cardShadow = isDark ? 'none' : '0 2px 12px 0 rgba(40,40,80,0.07)';
  const labelColor = isDark ? '#b6cef2' : '#64748B';
  const valueColor = isDark ? '#fff' : '#1A2331';
  const iconBg = (props.primaryColor || '#FB8105') + (isDark ? 'ee' : '18');
  const titleColor = isDark ? '#fff' : props.primaryColor || '#0F172A';
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr ?? '';
    }
  };

  const hasMeetingData = () =>
    props.meetingData &&
    (props.meetingData.client_meeting_date ||
      props.meetingData.client_meeting_time ||
      props.meetingData.client_name ||
      props.meetingData.client_email ||
      props.meetingData.client_meeting_timezone);

  if (!hasMeetingData()) return null;

  return (
    <div
      style={{
        background: cardBg,
        border: `1.2px solid ${cardBorder}`,
        'border-radius': '14px',
        'box-shadow': cardShadow,
        padding: '18px',
        'margin-top': '16px',
        'font-family': 'system-ui, -apple-system, sans-serif',
        color: valueColor,
        transition: 'background 0.25s, border 0.25s',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '10px',
          'margin-bottom': '14px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            'border-radius': '7px',
            background: iconBg,
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'flex-shrink': '0',
          }}
        >
          <svg width="16" height="16" fill={isDark ? '#fff' : props.primaryColor || '#FB8105'} viewBox="0 0 24 24">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
          </svg>
        </div>
        <div>
          <h3
            style={{
              'font-weight': 700,
              'font-size': '15px',
              color: titleColor,
              margin: 0,
              'line-height': 1.2,
              'letter-spacing': '-0.01em',
            }}
          >
            Meeting Details
          </h3>
        </div>
      </div>

      {/* Two Column Grid Layout */}
      <div
        style={{
          display: 'grid',
          'grid-template-columns': '1fr 1fr',
          gap: '8px 20px',
          'font-size': '14px',
        }}
      >
        <Show when={props.meetingData.client_meeting_date}>
          <div>
            <div
              style={{
                'font-size': '11px',
                'font-weight': 600,
                color: labelColor,
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em',
                margin: 0,
                'margin-bottom': '3px',
              }}
            >
              Date
            </div>
            <div
              style={{
                'font-weight': 600,
                color: valueColor,
                margin: 0,
                'line-height': '1.3',
              }}
            >
              {formatDate(props.meetingData.client_meeting_date)}
            </div>
          </div>
        </Show>
        <Show when={props.meetingData.client_meeting_time}>
          <div>
            <div
              style={{
                'font-size': '11px',
                'font-weight': 600,
                color: labelColor,
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em',
                margin: 0,
                'margin-bottom': '3px',
              }}
            >
              Time
            </div>
            <div
              style={{
                'font-weight': 600,
                color: valueColor,
                margin: 0,
                'line-height': '1.3',
              }}
            >
              {props.meetingData.client_meeting_time}
              {props.meetingData.client_meeting_timezone ? ` (${props.meetingData.client_meeting_timezone})` : ''}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
