export const theme = {
  colors: {
    background: '#FDF6EC',
    card: '#FFFFFF',
    border: '#E8E0D4',
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    accent: '#4A90D9',
    accentHover: '#3A7BC8',

    statusRunning: '#F5A623',
    statusDone: '#7ED321',
    statusFailed: '#D0021B',
    statusPending: '#9B9B9B',

    edge: '#B8AFA6',
    edgeActive: '#4A90D9',

    shimmerBase: '#DDD5CA',
    shimmerHighlight: '#EBE5DC',
  },
  fonts: {
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  radii: {
    card: '12px',
    button: '8px',
    chip: '20px',
    input: '12px',
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,0.08)',
    cardHover: '0 4px 12px rgba(0,0,0,0.12)',
  },
} as const;

export type Theme = typeof theme;
