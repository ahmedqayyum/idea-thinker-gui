import ReactMarkdown from 'react-markdown';
import { theme } from '../../theme';
import type { ChatMessage as ChatMsg } from '../../api/types';

interface Props {
  message: ChatMsg;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const contentWithMentions = message.content.replace(
    /@([\w\-.:]+)/g,
    '`@$1`',
  );

  return (
    <div style={{
      padding: '12px 0',
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      {/* Role label */}
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: isUser ? theme.colors.accent : theme.colors.textSecondary,
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: isUser ? theme.colors.accent : '#1A1A1A',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {isUser ? 'U' : 'A'}
        </span>
        {isUser ? 'You' : 'Assistant'}
      </div>

      {/* Content */}
      <div style={{
        fontSize: 14,
        lineHeight: '1.65',
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
        paddingLeft: 24,
      }}
        className="chat-message-content"
      >
        <ReactMarkdown>{contentWithMentions}</ReactMarkdown>
      </div>
    </div>
  );
}
