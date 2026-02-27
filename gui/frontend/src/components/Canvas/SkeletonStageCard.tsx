import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { theme } from '../../theme';
import '../../styles/shimmer.css';

function SkeletonStageCardInner(_props: NodeProps) {
  return (
    <div style={{
      background: theme.colors.card,
      borderRadius: theme.radii.card,
      boxShadow: theme.shadows.card,
      border: `1px solid ${theme.colors.border}`,
      padding: 20,
      width: 280,
      minHeight: 160,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="skeleton-line" style={{ height: 12, width: '30%' }} />
      <div className="skeleton-line" style={{ height: 18, width: '70%' }} />
      <div className="skeleton-line" style={{ height: 14, width: '50%' }} />
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <div className="skeleton-line" style={{ height: 28, width: 64 }} />
        <div className="skeleton-line" style={{ height: 28, width: 48 }} />
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export const SkeletonStageCard = memo(SkeletonStageCardInner);
