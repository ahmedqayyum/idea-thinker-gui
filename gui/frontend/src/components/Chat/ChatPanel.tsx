import { useRef, useEffect } from 'react';
import { theme } from '../../theme';
import { useChatStore } from '../../stores/chatStore';
import { useChat } from '../../hooks/useChat';
import { ChatTabBar } from './ChatTabBar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

function TypingSkeleton() {
  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${theme.colors.border}` }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.5px', color: theme.colors.textSecondary,
        marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: '50%', background: '#1A1A1A',
          color: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 10, fontWeight: 700,
        }}>A</span>
        Assistant
      </div>
      <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-line" style={{ height: 14, width: '90%' }} />
        <div className="skeleton-line" style={{ height: 14, width: '75%' }} />
        <div className="skeleton-line" style={{ height: 14, width: '60%' }} />
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { tabs, activeTabId, loading } = useChatStore();
  const { sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const messages = activeTab?.messages ?? [];

  const lastIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';
  const showSkeleton = loading && !lastIsAssistant;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, showSkeleton]);

  return (
    <div style={{
      width: 400,
      minWidth: 340,
      maxWidth: 500,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: theme.colors.card,
      borderLeft: `1px solid ${theme.colors.border}`,
      fontFamily: theme.fonts.body,
    }}>
      <ChatTabBar />

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 16px',
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 8,
          }}>
            <span style={{ fontSize: 28, opacity: 0.4 }}>💬</span>
            <span style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: '1.5' }}>
              Ask about your research,<br />use @file to reference workspace files
            </span>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {showSkeleton && <TypingSkeleton />}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
}
