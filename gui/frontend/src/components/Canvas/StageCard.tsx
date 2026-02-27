import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { theme } from '../../theme';
import { getStatusLabel } from '../../utils/stageConfig';

function StageCardInner({ data }: NodeProps) {
  const d = data as Record<string, any>;
  const status = d.status ?? 'pending';
  const statusColor = d.statusColor ?? theme.colors.statusPending;
  const onExpand = d.onExpand as (() => void) | undefined;
  const onFork = d.onFork as (() => void) | undefined;
  const preview = (d.preview ?? []) as string[];

  return (
    <div style={{
      background: theme.colors.card,
      borderRadius: theme.radii.card,
      boxShadow: theme.shadows.card,
      padding: 20,
      width: 280,
      minHeight: 160,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: theme.fonts.body,
      position: 'relative',
      cursor: 'grab',
      transition: 'box-shadow 200ms, border-color 300ms',
      border: `1px solid ${status === 'in_progress' ? theme.colors.statusRunning : 'transparent'}`,
      animation: 'card-appear 300ms ease-out',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: theme.colors.edge }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        color: statusColor,
        letterSpacing: '0.5px',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: statusColor, display: 'inline-block',
          animation: status === 'in_progress' ? 'pulse 1.5s infinite' : 'none',
        }} />
        {getStatusLabel(status)}
      </div>

      <div style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text }}>
        {d.icon} {d.label}
      </div>

      {d.title && (
        <div style={{
          fontSize: 13, color: theme.colors.textSecondary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {d.title}
        </div>
      )}
      {d.domain && (
        <div style={{
          fontSize: 12, color: theme.colors.textSecondary,
          background: theme.colors.shimmerBase,
          padding: '2px 8px', borderRadius: theme.radii.chip, alignSelf: 'flex-start',
        }}>
          {d.domain}
        </div>
      )}

      {preview.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          marginTop: 4,
          padding: '8px 10px',
          background: theme.colors.shimmerBase + '66',
          borderRadius: theme.radii.button,
        }}>
          {preview.map((line, i) => (
            <div key={i} style={{
              fontSize: 11,
              color: theme.colors.textSecondary,
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
          style={{
            fontSize: 12, padding: '4px 10px', borderRadius: theme.radii.button,
            border: `1px solid ${theme.colors.border}`, background: 'transparent',
            color: theme.colors.textSecondary, cursor: 'pointer', fontFamily: theme.fonts.body,
          }}
        >
          Expand
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onFork?.(); }}
          style={{
            fontSize: 12, padding: '4px 10px', borderRadius: theme.radii.button,
            border: `1px solid ${theme.colors.border}`, background: 'transparent',
            color: theme.colors.textSecondary, cursor: 'pointer', fontFamily: theme.fonts.body,
          }}
        >
          Fork
        </button>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: theme.colors.edge }} />
    </div>
  );
}

export const StageCard = memo(StageCardInner);
