import { theme } from '../../theme';
import { useChatStore } from '../../stores/chatStore';

export function ChatTabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useChatStore();

  return (
    <div style={{
      display: 'flex',
      borderBottom: `1px solid ${theme.colors.border}`,
      background: theme.colors.shimmerBase,
      overflowX: 'auto',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: tab.id === activeTabId ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
            background: 'transparent',
            color: tab.id === activeTabId ? theme.colors.accent : theme.colors.textSecondary,
            fontFamily: theme.fonts.body,
            fontSize: 13,
            fontWeight: tab.id === activeTabId ? 600 : 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {tab.label}
          {tab.id !== 'main' && (
            <span
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
              style={{ fontSize: 11, opacity: 0.5, cursor: 'pointer' }}
            >
              ×
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
