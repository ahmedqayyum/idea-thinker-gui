import { useState, useRef, useEffect } from 'react';
import { theme } from '../../theme';

interface Props {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasText = value.trim().length > 0;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 640,
    }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Describe your research idea..."
        rows={3}
        style={{
          width: '100%',
          padding: '16px 52px 16px 16px',
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.input,
          fontFamily: theme.fonts.body,
          fontSize: 15,
          lineHeight: '1.5',
          resize: 'none',
          outline: 'none',
          background: theme.colors.card,
          color: theme.colors.text,
          boxSizing: 'border-box',
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !hasText}
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: hasText ? theme.colors.accent : theme.colors.border,
          color: '#fff',
          cursor: disabled || !hasText ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          opacity: disabled ? 0.5 : 1,
          transition: 'background 200ms, opacity 200ms',
        }}
        aria-label="Send"
      >
        ↑
      </button>
    </div>
  );
}
