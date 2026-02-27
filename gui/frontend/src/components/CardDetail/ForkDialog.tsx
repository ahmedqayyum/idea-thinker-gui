import { useState } from 'react';
import { theme } from '../../theme';

interface Props {
  stageId: string;
  stageLabel: string;
  onConfirm: (provider: string) => void;
  onCancel: () => void;
}

export function ForkDialog({ stageId, stageLabel, onConfirm, onCancel }: Props) {
  const [provider, setProvider] = useState('claude');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: theme.colors.card,
        borderRadius: theme.radii.card,
        padding: 24,
        width: 400,
        boxShadow: theme.shadows.cardHover,
        fontFamily: theme.fonts.body,
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, color: theme.colors.text }}>
          Fork from {stageLabel}
        </h3>
        <p style={{ fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 }}>
          This will create a new research branch starting from the <strong>{stageLabel}</strong> stage.
          All artifacts up to this point will be copied.
        </p>
        <label style={{ fontSize: 13, color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>
          Provider
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          style={{
            width: '100%',
            padding: 8,
            borderRadius: theme.radii.button,
            border: `1px solid ${theme.colors.border}`,
            marginBottom: 20,
            fontFamily: theme.fonts.body,
          }}
        >
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="codex">Codex</option>
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: theme.radii.button,
              border: `1px solid ${theme.colors.border}`,
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(provider)}
            style={{
              padding: '8px 16px',
              borderRadius: theme.radii.button,
              border: 'none',
              background: theme.colors.accent,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
              fontWeight: 500,
            }}
          >
            Fork
          </button>
        </div>
      </div>
    </div>
  );
}
