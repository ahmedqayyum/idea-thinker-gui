import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '../../stores/canvasStore';
import { useAppStore } from '../../stores/appStore';
import { usePipeline } from '../../hooks/usePipeline';
import { StageCard } from './StageCard';
import { StageEdge } from './StageEdge';
import { SkeletonStageCard } from './SkeletonStageCard';
import { SkeletonCanvas } from './SkeletonCanvas';
import { CanvasToolbar } from './CanvasToolbar';
import { theme } from '../../theme';

const nodeTypes = {
  stageCard: StageCard,
  skeletonCard: SkeletonStageCard,
};
const edgeTypes = {
  stageEdge: StageEdge,
};

export function ResearchCanvas() {
  const { activeIdeaId, setView } = useAppStore();
  const { nodes, edges, isSkeletonMode, onNodesChange } = useCanvasStore();

  usePipeline(activeIdeaId);

  if (isSkeletonMode) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <CanvasToolbar onNewResearch={() => setView('landing')} />
        <SkeletonCanvas />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <CanvasToolbar onNewResearch={() => setView('landing')} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color={theme.colors.border} size={1} gap={24} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
