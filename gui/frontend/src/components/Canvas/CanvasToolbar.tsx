import { theme } from '../../theme';

interface Props {
  onNewResearch: () => void;
}

export function CanvasToolbar({ onNewResearch }: Props) {
  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      zIndex: 10,
      display: 'flex',
      gap: 8,
    }}>
      <button
        onClick={onNewResearch}
        style={{
          padding: '8px 16px',
          borderRadius: theme.radii.button,
          border: `1px solid ${theme.colors.border}`,
          background: theme.colors.card,
          color: theme.colors.text,
          fontFamily: theme.fonts.body,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: theme.shadows.card,
        }}
      >
        + New Research
      </button>
    </div>
  );
}
