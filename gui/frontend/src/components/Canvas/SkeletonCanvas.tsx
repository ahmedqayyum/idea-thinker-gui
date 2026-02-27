import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildSkeletonCanvas } from './canvasHelpers';
import { SkeletonStageCard } from './SkeletonStageCard';
import { theme } from '../../theme';
import { useMemo } from 'react';

const nodeTypes = { skeletonCard: SkeletonStageCard };

export function SkeletonCanvas() {
  const { nodes, edges } = useMemo(() => buildSkeletonCanvas(), []);

  return (
    <div style={{ width: '100%', height: '100%', background: theme.colors.background }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
      >
        <Background variant={BackgroundVariant.Dots} color={theme.colors.border} size={1} gap={24} />
      </ReactFlow>
    </div>
  );
}
