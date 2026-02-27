import { theme } from '../../theme';

export interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onClose }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      borderBottom: `1px solid ${theme.colors.border}`,
      background: theme.colors.card,
      overflowX: 'auto',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: tab.id === activeTabId ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
            background: 'transparent',
            color: tab.id === activeTabId ? theme.colors.text : theme.colors.textSecondary,
            fontFamily: theme.fonts.body,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {tab.label}
          <span
            onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
            style={{ fontSize: 11, opacity: 0.5, cursor: 'pointer' }}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
