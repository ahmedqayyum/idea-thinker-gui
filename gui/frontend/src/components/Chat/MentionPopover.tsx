import { theme } from '../../theme';
import type { MentionOption } from '../../hooks/useMentions';

interface Props {
  options: MentionOption[];
  query: string;
  onSelect: (option: MentionOption) => void;
  visible: boolean;
}

export function MentionPopover({ options, query, onSelect, visible }: Props) {
  if (!visible) return null;
  const filtered = options.filter(
    (o) => o.id.toLowerCase().includes(query.toLowerCase()) ||
           o.label.toLowerCase().includes(query.toLowerCase())
  );
  if (filtered.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      marginBottom: 4,
      background: theme.colors.card,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radii.button,
      boxShadow: theme.shadows.cardHover,
      maxHeight: 200,
      overflowY: 'auto',
      zIndex: 100,
      width: 260,
    }}>
      {filtered.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt)}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: theme.fonts.body,
            fontSize: 13,
            color: theme.colors.text,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.shimmerBase)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
