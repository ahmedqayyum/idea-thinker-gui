import { useState, useRef, useCallback, useEffect } from 'react';
import { theme } from '../../theme';
import { MentionPopover } from './MentionPopover';
import { useMentions } from '../../hooks/useMentions';
import type { MentionOption } from '../../hooks/useMentions';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionOptions = useMentions();

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    const atMatch = text.match(/@([\w\-.]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = useCallback((opt: MentionOption) => {
    const newValue = value.replace(/@[\w\-.]*$/, `@${opt.id} `);
    setValue(newValue);
    setShowMentions(false);
    textareaRef.current?.focus();
  }, [value]);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      setShowMentions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const el = textareaRef.current;
      if (el && el.selectionStart === el.selectionEnd) {
        const cursor = el.selectionStart;
        const before = value.slice(0, cursor);
        const mentionMatch = before.match(/@[\w\-.]*$/);
        if (mentionMatch && mentionMatch[0].length > 1) {
          // Delete the whole @mention token in one go
          e.preventDefault();
          const start = cursor - mentionMatch[0].length;
          const newValue = before.slice(0, start) + value.slice(cursor);
          setValue(newValue);
          // Restore cursor position after state update
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = start;
              textareaRef.current.selectionEnd = start;
            }
          });
          return;
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasText = value.trim().length > 0;

  return (
    <div style={{
      position: 'relative',
      padding: '12px 14px',
      borderTop: `1px solid ${theme.colors.border}`,
      background: theme.colors.card,
    }}>
      <MentionPopover
        options={mentionOptions}
        query={mentionQuery}
        onSelect={handleMentionSelect}
        visible={showMentions}
      />
      <div style={{
        position: 'relative',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radii.input,
        background: theme.colors.background,
        overflow: 'hidden',
        transition: 'border-color 150ms',
      }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask anything... (use @ to mention files)"
          rows={3}
          style={{
            width: '100%',
            padding: '12px 48px 12px 14px',
            border: 'none',
            fontFamily: theme.fonts.body,
            fontSize: 14,
            lineHeight: '1.5',
            resize: 'none',
            outline: 'none',
            background: 'transparent',
            color: theme.colors.text,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !hasText}
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: hasText ? theme.colors.accent : theme.colors.border,
            color: '#fff',
            cursor: disabled || !hasText ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            transition: 'background 200ms',
          }}
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
